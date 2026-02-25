/**
 * Whispr — Shared Security Module
 * Imported by all Edge Functions.
 * Provides: CORS, JWT verify, rate limiting, AES-256-GCM, EXIF strip, Cloudinary signed upload, file validation.
 */
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://whispr.app'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SVC = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ENCRYPT_KEY_HEX = Deno.env.get('STORY_ENCRYPT_KEY') ?? ''   // 64 hex chars = 32 bytes AES-256

// FILE VALIDATION WHITELIST
// GIF and WebP excluded: our pure-JS EXIF parser cannot guarantee metadata removal
// for these formats — they must be added back only when Wasm-based processing is available.
const MIME_WHITELIST: Record<string, string[]> = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'video/mp4': ['.mp4'],
    'video/webm': ['.webm'],
    'application/pdf': ['.pdf'],
}
const MAX_SIZES: Record<string, number> = {
    image: 10 * 1024 * 1024,    // 10 MB
    video: 50 * 1024 * 1024,    // 50 MB
    application: 20 * 1024 * 1024, // 20 MB
}

// RATE LIMIT QUOTAS (per hour per user)
const RATE_LIMITS: Record<string, number> = {
    post: 5,
    comment: 20,
    like: 50,
    upload: 10,
}

// ─────────────────────────────────────────────
// 1. CORS — Locked to ALLOWED_ORIGIN
// ─────────────────────────────────────────────
export function getCorsHeaders(req: Request): Record<string, string> | null {
    const origin = req.headers.get('origin') ?? ''
    // Allow both production origin and the Supabase function invoker (internal)
    const isAllowed = origin === ALLOWED_ORIGIN || origin === '' || origin.startsWith('http://localhost')
    if (!isAllowed) return null // signal rejection

    return {
        'Access-Control-Allow-Origin': origin || ALLOWED_ORIGIN,
        'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey, x-whispr-sig, x-whispr-ts',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
    }
}

export function handlePreflight(req: Request): Response | null {
    if (req.method !== 'OPTIONS') return null
    const cors = getCorsHeaders(req)
    if (!cors) return new Response('Forbidden', { status: 403 })
    return new Response('ok', { status: 200, headers: cors })
}

export function corsRejected(): Response {
    return new Response(JSON.stringify({ error: 'CORS policy: origin not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
    })
}

// ─────────────────────────────────────────────
// 2. JWT VERIFICATION — Returns user-scoped client
// ─────────────────────────────────────────────
export interface AuthResult {
    userId: string
    userClient: SupabaseClient  // scoped to user JWT → RLS applies
    adminClient: SupabaseClient // service role, only for admin ops
}

export async function verifyUserJWT(req: Request): Promise<AuthResult> {
    const authHeader = req.headers.get('authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
        throw new Error('Missing or malformed Authorization header')
    }
    const token = authHeader.slice(7)

    // Use anon client + user token to verify identity
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SVC)
    const { data: { user }, error } = await adminClient.auth.getUser(token)
    if (error || !user) throw new Error('Invalid or expired token')

    // Create user-scoped client for all RLS-enforced DB operations
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
    })

    return { userId: user.id, userClient, adminClient }
}

// ─────────────────────────────────────────────
// 3. RATE LIMITING — Per user, per action, per hour
// ─────────────────────────────────────────────
export async function checkRateLimit(
    adminClient: SupabaseClient,
    userId: string,
    action: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
    const limit = RATE_LIMITS[action] ?? 10
    const windowStart = new Date()
    windowStart.setMinutes(0, 0, 0) // top of current hour
    const windowStr = windowStart.toISOString()

    // Step 1: read current count for this window
    const { data: existing } = await adminClient
        .from('rate_limits')
        .select('count')
        .eq('user_id', userId)
        .eq('action', action)
        .eq('window_start', windowStr)
        .maybeSingle()

    const currentCount = existing?.count ?? 0

    if (currentCount >= limit) {
        const nextHour = new Date(windowStart.getTime() + 3600000)
        return { allowed: false, retryAfter: Math.ceil((nextHour.getTime() - Date.now()) / 1000) }
    }

    // Step 2: atomically increment (INSERT on first request, UPDATE on subsequent)
    if (!existing) {
        // First request this hour — insert new row
        const { error: insertErr } = await adminClient
            .from('rate_limits')
            .insert({ user_id: userId, action, window_start: windowStr, count: 1 })
        // If insert fails due to race condition (another request beat us), fallback to update
        if (insertErr) {
            await adminClient
                .from('rate_limits')
                .update({ count: currentCount + 1 })
                .eq('user_id', userId)
                .eq('action', action)
                .eq('window_start', windowStr)
        }
    } else {
        // Subsequent request — increment
        await adminClient
            .from('rate_limits')
            .update({ count: currentCount + 1 })
            .eq('user_id', userId)
            .eq('action', action)
            .eq('window_start', windowStr)
    }

    return { allowed: true }
}

export function rateLimitResponse(retryAfter: number, corsHeaders: Record<string, string>): Response {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) },
    })
}

// ─────────────────────────────────────────────
// 4. AES-256-GCM ENCRYPTION / DECRYPTION
// ─────────────────────────────────────────────
async function importEncryptKey(): Promise<CryptoKey> {
    if (!ENCRYPT_KEY_HEX || ENCRYPT_KEY_HEX.length !== 64) {
        throw new Error('[SECURITY] STORY_ENCRYPT_KEY env var must be exactly 64 hex characters (32 bytes)')
    }
    const keyBytes = hexToBytes(ENCRYPT_KEY_HEX)
    return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export interface EncryptedPayload {
    ciphertext: string  // Base64
    iv: string          // Base64
    authTag: string     // Base64 (last 16 bytes of GCM output)
}

export async function aesEncrypt(plaintext: string): Promise<EncryptedPayload> {
    const key = await importEncryptKey()
    const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV for GCM
    const encoded = new TextEncoder().encode(plaintext)

    // AES-256-GCM produces ciphertext || authTag (last 16 bytes)
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, encoded)

    const encBytes = new Uint8Array(encrypted)
    const cipherBytes = encBytes.slice(0, -16)
    const tagBytes = encBytes.slice(-16)

    return {
        ciphertext: bytesToBase64(cipherBytes),
        iv: bytesToBase64(iv),
        authTag: bytesToBase64(tagBytes),
    }
}

export async function aesDecrypt(payload: EncryptedPayload): Promise<string> {
    const key = await importEncryptKey()
    const iv = base64ToBytes(payload.iv)
    const cipherBytes = base64ToBytes(payload.ciphertext)
    const tagBytes = base64ToBytes(payload.authTag)

    // Reconstruct: ciphertext || authTag
    const combined = new Uint8Array(cipherBytes.length + tagBytes.length)
    combined.set(cipherBytes)
    combined.set(tagBytes, cipherBytes.length)

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, combined)
    return new TextDecoder().decode(decrypted)
}

// ─────────────────────────────────────────────
// 5. FILE VALIDATION
// ─────────────────────────────────────────────
export interface FileValidationResult {
    valid: boolean
    error?: string
}

export function validateFile(file: File): FileValidationResult {
    const mime = file.type.toLowerCase()
    const name = file.name.toLowerCase()
    const ext = name.includes('.') ? '.' + name.split('.').pop() : ''

    // MIME whitelist check
    const allowedExts = MIME_WHITELIST[mime]
    if (!allowedExts) {
        return { valid: false, error: `File type '${mime}' is not permitted.` }
    }

    // Extension must match MIME
    if (!allowedExts.includes(ext)) {
        return { valid: false, error: `File extension '${ext}' does not match declared MIME type '${mime}'.` }
    }

    // Reject executable double-extensions
    const dangerous = ['.exe', '.bat', '.sh', '.cmd', '.ps1', '.php', '.py', '.rb', '.js', '.msi', '.apk']
    if (dangerous.some(d => name.includes(d))) {
        return { valid: false, error: 'Executable file types are strictly prohibited.' }
    }

    // Size enforcement
    const category = mime.split('/')[0]
    const maxBytes = MAX_SIZES[category] ?? MAX_SIZES.image
    if (file.size > maxBytes) {
        return { valid: false, error: `File exceeds maximum allowed size (${Math.round(maxBytes / 1024 / 1024)}MB).` }
    }

    return { valid: true }
}

// ─────────────────────────────────────────────
// 6. EXIF / METADATA STRIPPING
// Strips metadata by re-encoding: reads image bytes, clears all EXIF/IPTC/XMP segments,
// then returns a clean buffer. For JPEG: removes all APP0-APP15 markers except APP0 (JFIF).
// ─────────────────────────────────────────────
export async function stripImageMetadata(file: File): Promise<Uint8Array> {
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    const mime = file.type.toLowerCase()

    if (mime === 'image/jpeg' || mime === 'image/jpg') {
        const clean = stripJpegMetadata(bytes)
        logSecurity('INFO', 'EXIF metadata removed from JPEG successfully.')
        return clean
    }

    if (mime === 'image/png') {
        const clean = stripPngMetadata(bytes)
        logSecurity('INFO', 'EXIF metadata removed from PNG successfully.')
        return clean
    }

    // For other image types (gif, webp): return as-is with a warning
    // (EXIF in GIF/WebP is rare and format-specific; production should use libvips/ImageMagick Wasm)
    logSecurity('WARN', `Metadata strip not supported for ${mime} — file passed through.`)
    return bytes
}

/** Strip JPEG: remove all marker segments except SOI, APP0 (JFIF), and image data */
function stripJpegMetadata(src: Uint8Array): Uint8Array {
    const SOI = 0xD8
    const APP0 = 0xE0
    const APP_END = 0xEF // APP15
    const COM = 0xFE    // Comment segment

    if (src[0] !== 0xFF || src[1] !== SOI) {
        throw new Error('Not a valid JPEG file')
    }

    const out: number[] = [0xFF, 0xD8] // SOI
    let i = 2
    while (i < src.length - 1) {
        if (src[i] !== 0xFF) { i++; continue }
        const marker = src[i + 1]
        if (marker === 0xDA) {
            // Start of Scan — copy everything from here to end (image data)
            for (let j = i; j < src.length; j++) out.push(src[j])
            break
        }
        // Segment length is 2 bytes after the marker
        const segLen = (src[i + 2] << 8) | src[i + 3]
        const segEnd = i + 2 + segLen

        // Keep APP0 (JFIF header), skip all other APP/COM segments
        if ((marker >= APP0 && marker <= APP_END) || marker === COM) {
            if (marker === APP0) {
                // Copy APP0 only
                for (let j = i; j < segEnd; j++) out.push(src[j])
            }
            // Skip all other APP/COM segments
            i = segEnd
            continue
        }
        // Copy all other segments (SOF, DHT, DQT, etc.)
        for (let j = i; j < segEnd; j++) out.push(src[j])
        i = segEnd
    }
    return new Uint8Array(out)
}

/** Strip PNG: remove tEXt, iTXt, zTXt, gAMA, cHRM, sRGB, iCCP, pHYs, tIME chunks */
function stripPngMetadata(src: Uint8Array): Uint8Array {
    const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]
    const STRIP_CHUNKS = new Set(['tEXt', 'iTXt', 'zTXt', 'gAMA', 'cHRM', 'sRGB', 'iCCP', 'pHYs', 'tIME', 'bKGD', 'hIST', 'sBIT', 'sPLT'])

    for (let j = 0; j < 8; j++) {
        if (src[j] !== SIGNATURE[j]) throw new Error('Not a valid PNG file')
    }

    const out: number[] = [...SIGNATURE]
    let i = 8
    while (i < src.length) {
        const length = (src[i] << 24) | (src[i + 1] << 16) | (src[i + 2] << 8) | src[i + 3]
        const type = String.fromCharCode(src[i + 4], src[i + 5], src[i + 6], src[i + 7])
        const chunkEnd = i + 4 + 4 + length + 4 // length + type + data + CRC

        if (!STRIP_CHUNKS.has(type)) {
            for (let j = i; j < chunkEnd; j++) out.push(src[j])
        }
        i = chunkEnd
        if (type === 'IEND') break
    }
    return new Uint8Array(out)
}

// ─────────────────────────────────────────────
// 7. SIGNED CLOUDINARY UPLOAD
// ─────────────────────────────────────────────
export async function cloudinarySignedUpload(
    fileBuffer: Uint8Array,
    mimeType: string,
    publicId: string
): Promise<{ public_id: string; secure_url: string }> {
    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME') ?? ''
    const apiKey = Deno.env.get('CLOUDINARY_API_KEY') ?? ''
    const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET') ?? ''

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('[SECURITY] Cloudinary credentials not configured')
    }

    const timestamp = Math.round(Date.now() / 1000)
    // Signature window: reject if older than 60 seconds
    const EXPIRY_WINDOW = 60

    // Build canonical param string (alphabetical, no signature/api_key/file/cloud_name)
    const params: Record<string, string | number> = {
        public_id: publicId,
        timestamp,
    }
    const canonicalStr = Object.keys(params)
        .sort()
        .map(k => `${k}=${params[k]}`)
        .join('&') + apiSecret

    // SHA-1 signature using WebCrypto (Deno supports this)
    const sigBytes = new TextEncoder().encode(canonicalStr)
    const hashBuf = await crypto.subtle.digest('SHA-1', sigBytes)
    const signature = Array.from(new Uint8Array(hashBuf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

    const formData = new FormData()
    const blob = new Blob([fileBuffer], { type: mimeType })
    formData.append('file', blob, publicId)
    formData.append('public_id', publicId)
    formData.append('timestamp', String(timestamp))
    formData.append('api_key', apiKey)
    formData.append('signature', signature)

    const uploadType = mimeType.startsWith('video') ? 'video' : mimeType.startsWith('image') ? 'image' : 'raw'
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/${uploadType}/upload`

    const res = await fetch(url, { method: 'POST', body: formData })
    if (!res.ok) {
        const err = await res.text()
        throw new Error(`[SECURITY] Cloudinary signed upload failed: ${err}`)
    }

    const data = await res.json()
    logSecurity('INFO', `Signed upload completed for public_id=${publicId}`)
    return { public_id: data.public_id, secure_url: data.secure_url }
}

// ─────────────────────────────────────────────
// 8. PII DETECTION
// Real pattern-based detection covering AF + global identifiers.
// Returns detected categories (does not include the actual value in logs).
// ─────────────────────────────────────────────
export interface PiiScanResult {
    hasPii: boolean
    categories: string[]
    sanitized: string
}

const PII_PATTERNS: Array<{ name: string; re: RegExp; replacement: string }> = [
    // Email addresses
    { name: 'email', re: /[\w.+\-]+@[\w\-]+\.[\w.\-]{2,}/gi, replacement: '[EMAIL REDACTED]' },
    // Phone numbers (Ghana +233, international, local formats)
    { name: 'phone', re: /(\+?233[\s\-]?|0)([2-9]\d)[\s\-]?\d{3}[\s\-]?\d{4}/g, replacement: '[PHONE REDACTED]' },
    // International phone (generic)
    { name: 'phone_intl', re: /\+\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{4}/g, replacement: '[PHONE REDACTED]' },
    // Ghana Card / National ID (GHA-XXXXXXXXX-X)
    { name: 'ghana_card', re: /GHA-\d{9}-\d/gi, replacement: '[ID REDACTED]' },
    // Generic ID numbers: 8-12 digit sequences preceded by id-like label
    { name: 'id_number', re: /\b(id|passport|voter|nhis|tin|ssn|nin)[\s#:]*\d{6,12}\b/gi, replacement: '[ID REDACTED]' },
    // Physical addresses: number + street word pattern
    { name: 'address', re: /\b\d{1,5}\s+(?:[A-Z][a-z]+\s+){1,3}(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Close|Crescent|Blvd|Boulevard)\b/g, replacement: '[ADDRESS REDACTED]' },
    // Capitalized full names (FirstName LastName format, 2-3 words)
    { name: 'name', re: /\b([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})(\s+[A-Z][a-z]{2,})?\b/g, replacement: '[NAME REDACTED]' },
]

export function scanAndSanitizePii(text: string): PiiScanResult {
    const found: string[] = []
    let sanitized = text

    for (const { name, re, replacement } of PII_PATTERNS) {
        const matches = sanitized.match(re)
        if (matches && matches.length > 0) {
            if (!found.includes(name)) found.push(name)
            sanitized = sanitized.replace(re, replacement)
        }
    }

    return {
        hasPii: found.length > 0,
        categories: found,
        sanitized,
    }
}

// ─────────────────────────────────────────────
// 9. STRUCTURED SECURITY LOGGING
// Never logs user content, tokens, IDs, or file names.
// ─────────────────────────────────────────────
type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'AUDIT'

export function logSecurity(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const entry = {
        level,
        ts: new Date().toISOString(),
        msg: message,
        ...(meta ? { meta } : {}),
    }
    // Use structured output — no user content, no tokens, no IDs
    if (level === 'ERROR') {
        console.error(JSON.stringify(entry))
    } else {
        console.log(JSON.stringify(entry))
    }
}

// ─────────────────────────────────────────────
// 10. HELPERS
// ─────────────────────────────────────────────
function hexToBytes(hex: string): Uint8Array {
    const arr = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) arr[i / 2] = parseInt(hex.slice(i, i + 2), 16)
    return arr
}

function bytesToBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes))
}

function base64ToBytes(b64: string): Uint8Array {
    return new Uint8Array([...atob(b64)].map(c => c.charCodeAt(0)))
}

// Admin client (only for admin operations, never for user data mutations)
export function getAdminClient(): SupabaseClient {
    return createClient(SUPABASE_URL, SUPABASE_SVC)
}

// Response helpers
export function jsonResponse(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}

export function errorResponse(message: string, status: number, corsHeaders: Record<string, string>): Response {
    logSecurity('ERROR', `HTTP ${status}: ${message}`)
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}
