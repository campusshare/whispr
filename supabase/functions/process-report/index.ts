/**
 * Whispr — process-report Edge Function (HARDENED)
 *
 * Security:
 *  - CORS locked to ALLOWED_ORIGIN
 *  - JWT required; user-scoped Supabase client used for DB writes (RLS applies)
 *  - Service role NOT used for post insertion
 *  - story_original encrypted with AES-256-GCM before storage
 *  - Real PII detection: auto-flags, blocks publication if PII present
 *  - Rate limit: 5 posts per hour per user
 *  - No sensitive data in logs or error responses
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  getCorsHeaders,
  handlePreflight,
  corsRejected,
  verifyUserJWT,
  checkRateLimit,
  rateLimitResponse,
  aesEncrypt,
  scanAndSanitizePii,
  logSecurity,
  errorResponse,
  jsonResponse,
} from '../_shared/security.ts'

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

    // ── Rate limiting: 5 posts/hour ────────────────────────
    const rl = await checkRateLimit(adminClient, userId, 'post')
    if (!rl.allowed) return rateLimitResponse(rl.retryAfter!, cors)

    // ── Parse & validate body ──────────────────────────────
    const body = await req.json()
    const { story_original, category, location, incident_date, sensitivity, title, alias } = body

    if (!story_original || typeof story_original !== 'string' || story_original.trim().length < 20) {
      return errorResponse('Story content too short or missing', 400, cors)
    }
    if (!category) return errorResponse('Category is required', 400, cors)
    if (!alias) return errorResponse('Alias is required', 400, cors)

    // ── PII DETECTION (real pattern-based) ─────────────────
    const piiResult = scanAndSanitizePii(story_original)
    if (piiResult.hasPii) {
      logSecurity('WARN', `PII detected in submission — categories: ${piiResult.categories.join(', ')}`)
    }

    // ── AES-256-GCM encrypt story_original ────────────────
    const encryptedStory = await aesEncrypt(story_original)
    logSecurity('INFO', 'Story encrypted with AES-256-GCM')

    // ── If PII detected: do NOT set story_sanitized → post stays draft/not-public
    // ── If clean: set sanitized to PII-scrubbed version
    const storySanitized = piiResult.hasPii ? null : piiResult.sanitized
    const moderationStatus = piiResult.hasPii ? 'flagged_pii' : 'pending'

    // Mock embedding (replace with real OpenAI embedding in production)
    const mockEmbedding = Array(1536).fill(0).map(() => Math.random() - 0.5)

    // ── DB insert via USER-SCOPED client (RLS applies) ─────
    // RLS policy "Authors can insert own posts" enforces author_id = auth.uid()
    const { data: postRow, error: dbErr } = await userClient
      .from('posts')
      .insert({
        author_id: userId,
        alias,
        title: title || null,
        category: category.slice(0, 64),
        location: location ? location.slice(0, 256) : null,
        incident_date: incident_date || null,
        story_original: encryptedStory.ciphertext,
        story_iv: encryptedStory.iv,
        story_auth_tag: encryptedStory.authTag,
        story_sanitized: storySanitized,
        embedding: mockEmbedding,
        sensitivity: sensitivity || 'medium',
        pii_flagged: piiResult.hasPii,
        moderation_status: moderationStatus,
      })
      .select('id')
      .single()

    if (dbErr) {
      logSecurity('ERROR', 'Post insert failed')
      return errorResponse('Failed to submit report', 500, cors)
    }

    logSecurity('INFO', 'Report submitted and encrypted successfully')

    // ── Response: never return sanitized text or story content ──
    return jsonResponse({
      success: true,
      post_id: postRow.id,
      pii_flagged: piiResult.hasPii,
      status: moderationStatus,
      message: piiResult.hasPii
        ? 'Report submitted for manual review (PII detected — will not be published automatically).'
        : 'Report submitted and pending moderation.',
    }, 201, cors)

  } catch (err) {
    const msg = (err as Error).message ?? 'Unknown error'
    if (msg.includes('token') || msg.includes('Unauthorized')) {
      return errorResponse('Unauthorized', 401, cors)
    }
    logSecurity('ERROR', 'process-report exception')
    return errorResponse('Internal server error', 500, cors)
  }
})
