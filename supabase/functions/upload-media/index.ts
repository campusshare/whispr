/**
 * Whispr — upload-media Edge Function (HARDENED)
 *
 * Security:
 *  - CORS locked to ALLOWED_ORIGIN
 *  - JWT required; user-scoped Supabase client for media DB insert (RLS applies)
 *  - Service role NOT used for media record insertion
 *  - Real EXIF/metadata stripping before upload (JPEG + PNG)
 *  - File MIME + extension validation with size enforcement
 *  - Signed Cloudinary upload (SHA-1, 60s expiry window)
 *  - Rate limit: 10 uploads per hour per user
 *  - No file names, user IDs, or file content in logs
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  getCorsHeaders,
  handlePreflight,
  corsRejected,
  verifyUserJWT,
  checkRateLimit,
  rateLimitResponse,
  validateFile,
  stripImageMetadata,
  cloudinarySignedUpload,
  logSecurity,
  errorResponse,
  jsonResponse,
} from '../_shared/security.ts'

const ALLOWED_MEDIA_TYPES = ['image', 'video', 'document']

serve(async (req) => {
  // ── CORS preflight ─────────────────────────────────────
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  const cors = getCorsHeaders(req)
  if (!cors) return corsRejected()

  if (req.method !== 'POST') return errorResponse('Method not allowed', 405, cors)

  try {
    // ── Authentication (JWT required) ──────────────────────
    const { userId, userClient, adminClient } = await verifyUserJWT(req)

    // ── Rate limiting: 10 uploads/hour ─────────────────────
    const rl = await checkRateLimit(adminClient, userId, 'upload')
    if (!rl.allowed) return rateLimitResponse(rl.retryAfter!, cors)

    // ── Parse multipart form data ──────────────────────────
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const postId = formData.get('post_id') as string | null

    if (!file || !postId) {
      return errorResponse('file and post_id are required', 400, cors)
    }

    // ── Validate post_id is a valid UUID ───────────────────
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId)) {
      return errorResponse('Invalid post_id format', 400, cors)
    }

    // ── Verify the requesting user owns this post ──────────
    const { data: postRow, error: postErr } = await userClient
      .from('posts')
      .select('id, author_id')
      .eq('id', postId)
      .eq('author_id', userId)
      .maybeSingle()

    if (postErr || !postRow) {
      logSecurity('WARN', 'Upload rejected — post not owned by requesting user')
      return errorResponse('Post not found or access denied', 403, cors)
    }

    // ── FILE VALIDATION (MIME + extension + size) ──────────
    const validation = validateFile(file)
    if (!validation.valid) {
      logSecurity('WARN', `File validation failed: ${validation.error}`)
      return errorResponse(validation.error!, 400, cors)
    }
    logSecurity('INFO', 'File validation passed')

    // ── EXIF / METADATA STRIPPING ─────────────────────────
    const mime = file.type.toLowerCase()
    const isImage = mime.startsWith('image/')
    let fileBuffer: Uint8Array

    if (isImage) {
      // Real EXIF strip: parses JPEG/PNG markers and removes metadata segments
      fileBuffer = await stripImageMetadata(file)
      // logSecurity called inside stripImageMetadata: "[SECURITY] Metadata removed successfully."
    } else {
      fileBuffer = new Uint8Array(await file.arrayBuffer())
      logSecurity('INFO', 'Non-image file — EXIF processing skipped')
    }

    // ── SIGNED CLOUDINARY UPLOAD ───────────────────────────
    const publicId = `whispr/${userId.slice(0, 8)}/${crypto.randomUUID()}`
    const { public_id: cloudinaryId } = await cloudinarySignedUpload(fileBuffer, mime, publicId)

    // ── Determine media_type for DB ────────────────────────
    let mediaType = 'image'
    if (mime.startsWith('video/')) mediaType = 'video'
    else if (mime === 'application/pdf') mediaType = 'document'

    // ── DB insert via USER-SCOPED client (RLS applies) ─────
    // RLS policy "Authors can insert media" checks posts.author_id = auth.uid()
    const { error: dbErr } = await userClient
      .from('media')
      .insert({
        post_id: postId,
        cloudinary_id: cloudinaryId,
        media_type: mediaType,
      })

    if (dbErr) {
      logSecurity('ERROR', 'Media record insert failed after upload')
      // Best-effort: delete the Cloudinary asset to prevent orphans
      // (Cloudinary deletion would require another signed request — log for manual cleanup)
      logSecurity('WARN', `Cloudinary orphan may exist — manual cleanup required`)
      return errorResponse('Failed to save media record', 500, cors)
    }

    logSecurity('INFO', 'Media uploaded, stripped, signed, and recorded successfully')

    return jsonResponse({
      success: true,
      cloudinary_id: cloudinaryId,
      media_type: mediaType,
      message: 'Media securely processed, metadata stripped, and uploaded.',
    }, 201, cors)

  } catch (err) {
    const msg = (err as Error).message ?? ''
    if (msg.includes('token') || msg.includes('Unauthorized') || msg.includes('Authorization')) {
      return errorResponse('Unauthorized', 401, cors)
    }
    logSecurity('ERROR', 'upload-media exception')
    return errorResponse('Internal server error', 500, cors)
  }
})
