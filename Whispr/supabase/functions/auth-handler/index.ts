/**
 * Whispr — auth-handler Edge Function (HARDENED)
 * Handles: register, login, recover (recovery phrase gated password reset)
 *
 * Security:
 *  - CORS locked to ALLOWED_ORIGIN env var
 *  - HttpOnly Secure cookies for tokens (no token in response body)
 *  - Service role ONLY for auth admin ops (createUser, signIn) — not DB user writes beyond alias
 *  - phrase_hash stored for recovery; password reset gated by correct phrase hash
 *  - HMAC request signature enforced when ENFORCE_HMAC=true
 *  - tokens: access 1h, refresh 24h
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  getCorsHeaders,
  handlePreflight,
  corsRejected,
  getAdminClient,
  logSecurity,
  errorResponse,
  jsonResponse,
} from '../_shared/security.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ENFORCE_HMAC = Deno.env.get('ENFORCE_HMAC') === 'true'
const HMAC_SECRET = Deno.env.get('WHISPR_HMAC_SECRET') ?? ''

serve(async (req) => {
  // ── CORS preflight ────────────────────────────────────
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  const cors = getCorsHeaders(req)
  if (!cors) return corsRejected()

  // ── Only POST allowed ─────────────────────────────────
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, cors)
  }

  // ── HMAC signature enforcement ────────────────────────
  if (ENFORCE_HMAC && HMAC_SECRET) {
    const ts = req.headers.get('x-whispr-ts')
    const sig = req.headers.get('x-whispr-sig')
    if (!ts || !sig) {
      logSecurity('WARN', 'Request rejected: missing HMAC signature headers')
      return errorResponse('Missing integrity signature', 401, cors)
    }
    const age = Math.abs(Date.now() - parseInt(ts, 10))
    if (age > 60_000) {
      logSecurity('WARN', 'Request rejected: HMAC timestamp expired')
      return errorResponse('Request timestamp expired', 401, cors)
    }
    // Verify HMAC
    const keyData = new TextEncoder().encode(HMAC_SECRET)
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const expectedMsg = new TextEncoder().encode(ts)
    const sigBytes = Uint8Array.from(atob(sig), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', cryptoKey, sigBytes, expectedMsg)
    if (!valid) {
      logSecurity('WARN', 'Request rejected: invalid HMAC signature')
      return errorResponse('Invalid request signature', 401, cors)
    }
  }

  try {
    const body = await req.json()
    const { action, alias, password, phrase_hash, new_password } = body

    // Input validation
    if (!action) return errorResponse('action is required', 400, cors)
    if (!alias || typeof alias !== 'string' || alias.length < 3) {
      return errorResponse('Invalid alias', 400, cors)
    }

    const supabaseAdmin = getAdminClient()
    const dummyEmail = `${alias.toLowerCase().replace(/[^a-z0-9]/g, '')}@whispr.internal`

    // ── REGISTER ──────────────────────────────────────────
    if (action === 'register') {
      if (!password || password.length < 12) {
        return errorResponse('Password must be at least 12 characters', 400, cors)
      }
      if (!phrase_hash || phrase_hash.length < 32) {
        return errorResponse('Recovery phrase hash is required', 400, cors)
      }

      // Check alias uniqueness in public.users
      const { data: existing } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('alias', alias)
        .maybeSingle()
      if (existing) {
        return errorResponse('Alias already taken', 409, cors)
      }

      // Create auth user
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: dummyEmail,
        password,
        email_confirm: true,
        user_metadata: { alias },
      })
      if (authErr) {
        logSecurity('ERROR', 'Auth user creation failed')
        return errorResponse('Registration failed', 400, cors)
      }

      // Insert into public.users (service role needed for initial insert only)
      const { error: dbErr } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          alias,
          hashed_password: 'managed_by_supabase_auth',
          phrase_hash,
          joined_at: new Date().toISOString(),
        })
      if (dbErr) {
        // Rollback: delete the auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        logSecurity('ERROR', 'Public user insert failed — auth user rolled back')
        return errorResponse('Registration failed', 500, cors)
      }

      // Sign in to get session
      const { data: session, error: signInErr } = await supabaseAdmin.auth.signInWithPassword({
        email: dummyEmail,
        password,
      })
      if (signInErr) return errorResponse('Login after registration failed', 500, cors)

      logSecurity('INFO', 'New user registered successfully')
      return buildAuthCookieResponse(session.session, cors)
    }

    // ── LOGIN ──────────────────────────────────────────────
    if (action === 'login') {
      if (!password) return errorResponse('Password required', 400, cors)

      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email: dummyEmail,
        password,
      })
      if (error) {
        logSecurity('WARN', 'Login attempt failed (bad credentials)')
        return errorResponse('Invalid alias or password', 401, cors)
      }

      logSecurity('INFO', 'User authenticated successfully')
      return buildAuthCookieResponse(data.session, cors)
    }

    // ── RECOVER (password reset via phrase hash) ───────────
    if (action === 'recover') {
      if (!phrase_hash || !new_password) {
        return errorResponse('phrase_hash and new_password required', 400, cors)
      }
      if (new_password.length < 12) {
        return errorResponse('New password must be at least 12 characters', 400, cors)
      }

      // Look up user by alias + phrase_hash match
      const { data: userRow, error: lookupErr } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('alias', alias)
        .eq('phrase_hash', phrase_hash)
        .maybeSingle()

      if (lookupErr || !userRow) {
        logSecurity('WARN', 'Recovery attempt failed — phrase hash mismatch')
        return errorResponse('Recovery phrase does not match', 401, cors)
      }

      // Reset password via admin
      const { error: resetErr } = await supabaseAdmin.auth.admin.updateUserById(userRow.id, {
        password: new_password,
      })
      if (resetErr) {
        logSecurity('ERROR', 'Password reset failed')
        return errorResponse('Password reset failed', 500, cors)
      }

      logSecurity('INFO', 'Password reset via recovery phrase completed')
      return jsonResponse({ success: true, message: 'Password reset successfully.' }, 200, cors)
    }

    return errorResponse('Invalid action', 400, cors)

  } catch (_err) {
    // Do NOT log raw error message — may contain internal DB / auth system details
    logSecurity('ERROR', 'auth-handler: unhandled exception (details redacted)')
    return errorResponse('Internal server error', 500, cors)
  }
})

/**
 * Set tokens ONLY in HttpOnly Secure SameSite=Strict cookies.
 * NEVER return the token in the JSON body.
 */
function buildAuthCookieResponse(session: { access_token: string; refresh_token: string } | null, cors: Record<string, string>): Response {
  if (!session) return errorResponse('Session creation failed', 500, cors)

  const headers = new Headers(cors)
  headers.set('Content-Type', 'application/json')

  // Access token: 1 hour
  headers.append('Set-Cookie',
    `sb_access_token=${session.access_token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`)
  // Refresh token: 24 hours (not 7 days)
  headers.append('Set-Cookie',
    `sb_refresh_token=${session.refresh_token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`)

  // Return NO token or user_id in JSON body
  return new Response(JSON.stringify({ success: true }), { status: 200, headers })
}
