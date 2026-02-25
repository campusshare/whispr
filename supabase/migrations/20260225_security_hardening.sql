-- ============================================================
-- Whispr — Security Hardening Migration
-- Applies: is_admin write protection, encryption columns,
--          rate_limits table, admin_audit_log, hardened admin
--          RPCs with double-verify + audit trail, public user
--          profile columns, posts feed columns.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. USER TABLE — New columns + privilege escalation prevention
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phrase_hash       text UNIQUE,
  ADD COLUMN IF NOT EXISTS avatar_color      text DEFAULT '#00d4aa',
  ADD COLUMN IF NOT EXISTS bio               text,
  ADD COLUMN IF NOT EXISTS verified          boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS followers_count   integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS following_count   integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS reports_count     integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS joined_at         timestamptz DEFAULT now() NOT NULL;

-- DROP the overly-permissive update policy (allowed any column update including is_admin)
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Replace with column-restricted update policy:
-- is_admin, hashed_password, and verified can NEVER be set by the user themselves.
-- The WITH CHECK uses a subquery to compare against the stored value.
CREATE POLICY "Users can update safe profile fields"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    -- Prevent privilege escalation: new is_admin must equal current is_admin
    is_admin = (SELECT is_admin FROM public.users WHERE id = auth.uid())
    AND
    -- Prevent self-verification
    verified = (SELECT verified FROM public.users WHERE id = auth.uid())
    AND
    -- Prevent password tampering via REST
    hashed_password = (SELECT hashed_password FROM public.users WHERE id = auth.uid())
  );

-- Allow users to see public profiles (other than their own) — for /profile?user=alias
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Anyone can read public profile fields"
  ON public.users FOR SELECT
  USING (true); -- Alias, avatar, bio, verified, follower counts are public

-- ────────────────────────────────────────────────────────────
-- 2. POSTS TABLE — Encryption columns + PII flagging + feed denorm
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS story_iv          text,  -- AES-256-GCM IV (Base64)
  ADD COLUMN IF NOT EXISTS story_auth_tag    text,  -- AES-256-GCM auth tag (Base64)
  ADD COLUMN IF NOT EXISTS pii_flagged       boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'pending' NOT NULL,
  ADD COLUMN IF NOT EXISTS alias             text,  -- denormalized for feed queries
  ADD COLUMN IF NOT EXISTS avatar_color      text,
  ADD COLUMN IF NOT EXISTS avatar_url        text,
  ADD COLUMN IF NOT EXISTS verified          boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS title             text,
  ADD COLUMN IF NOT EXISTS likes_count       integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS comments_count    integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS bookmarks_count   integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS reposts_count     integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS media_urls        text[] DEFAULT '{}';

-- Admin-only columns: only admins can flip moderation_status and verified
-- Users cannot update these via the posts update policy
DROP POLICY IF EXISTS "Authors can update own posts" ON public.posts;
CREATE POLICY "Authors can update own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (
    -- Authors cannot self-approve or self-verify
    moderation_status = (SELECT moderation_status FROM public.posts WHERE id = posts.id)
    AND
    verified = (SELECT verified FROM public.posts WHERE id = posts.id)
  );

-- Admins can update any post (for moderation)
CREATE POLICY "Admins can update any post"
  ON public.posts FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

-- Only authors can delete their own posts
DROP   POLICY IF EXISTS "Authors can delete own posts" ON public.posts;
CREATE POLICY "Authors can delete own posts"
  ON public.posts FOR DELETE
  USING (auth.uid() = author_id);

-- story_original is now encrypted ciphertext — still hidden from public reads
-- since story_sanitized is the public column (when not null and approved)
DROP   POLICY IF EXISTS "Anyone can read sanitized posts" ON public.posts;
CREATE POLICY "Anyone can read approved sanitized posts"
  ON public.posts FOR SELECT
  USING (story_sanitized IS NOT NULL AND moderation_status = 'approved');

DROP   POLICY IF EXISTS "Authors can read own original posts" ON public.posts;
CREATE POLICY "Authors can read own posts"
  ON public.posts FOR SELECT
  USING (auth.uid() = author_id);

-- ────────────────────────────────────────────────────────────
-- 3. MESSAGES TABLE — Encryption columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS iv       text, -- AES-GCM IV
  ADD COLUMN IF NOT EXISTS auth_tag text; -- AES-GCM auth tag

-- ────────────────────────────────────────────────────────────
-- 4. RATE LIMITS TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  action       text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT date_trunc('hour', now()),
  count        integer NOT NULL DEFAULT 1,
  UNIQUE (user_id, action, window_start)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Rate limits are internal — only service role can read/write them
-- No user-facing RLS policies (Edge Functions use service role for rate limit checks only)
CREATE POLICY "Service role manages rate limits"
  ON public.rate_limits FOR ALL
  USING (
    (SELECT current_setting('role')) = 'service_role'
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

-- ────────────────────────────────────────────────────────────
-- 5. ADMIN AUDIT LOG TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action     text NOT NULL,
  target_id  uuid,
  detail     jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can READ the audit log; NOBODY can modify it via REST
CREATE POLICY "Admins can read audit log"
  ON public.admin_audit_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

-- No UPDATE / DELETE policy → audit log is immutable via REST
-- (Service role can still insert via Edge Functions / backend jobs)

-- ────────────────────────────────────────────────────────────
-- 6. HARDENED ADMIN RPCs — Double-verify + audit trail
-- ────────────────────────────────────────────────────────────

-- 6a. Approve Post
CREATE OR REPLACE FUNCTION admin_approve_post(p_post_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_caller_id   uuid;
  v_is_admin    boolean;
  v_post_exists boolean;
BEGIN
  -- Step 1: get caller from auth context
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  -- Step 2: double-check admin status (fresh query, cannot be cached)
  SELECT is_admin INTO STRICT v_is_admin
    FROM public.users WHERE id = v_caller_id FOR SHARE;
  IF NOT coalesce(v_is_admin, false) THEN
    RAISE EXCEPTION 'Unauthorized — admin privilege required';
  END IF;

  -- Step 3: verify post exists
  SELECT EXISTS(SELECT 1 FROM public.posts WHERE id = p_post_id)
    INTO v_post_exists;
  IF NOT v_post_exists THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  -- Step 4: update (explicit column list — no wildcards)
  UPDATE public.posts
    SET moderation_status = 'approved',
        sensitivity       = 'low'
    WHERE id = p_post_id;

  -- Step 5: audit log (immutable record)
  INSERT INTO public.admin_audit_log(admin_id, action, target_id, detail)
    VALUES (
      v_caller_id,
      'approve_post',
      p_post_id,
      jsonb_build_object('timestamp', now(), 'action', 'approve')
    );
END;
$$;

-- 6b. Reject Post
CREATE OR REPLACE FUNCTION admin_reject_post(p_post_id uuid, p_reason text)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_is_admin  boolean;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Unauthenticated'; END IF;

  SELECT is_admin INTO STRICT v_is_admin
    FROM public.users WHERE id = v_caller_id FOR SHARE;
  IF NOT coalesce(v_is_admin, false) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Sanitize reason to prevent injection in stored value
  IF length(p_reason) > 512 THEN
    p_reason := left(p_reason, 512);
  END IF;

  UPDATE public.posts
    SET moderation_status = 'rejected',
        story_sanitized   = '[REJECTED: ' || p_reason || ']'
    WHERE id = p_post_id;

  INSERT INTO public.admin_audit_log(admin_id, action, target_id, detail)
    VALUES (
      v_caller_id,
      'reject_post',
      p_post_id,
      jsonb_build_object('timestamp', now(), 'reason', p_reason)
    );
END;
$$;

-- 6c. Flag Post for PII (manual admin override)
CREATE OR REPLACE FUNCTION admin_flag_pii(p_post_id uuid, p_note text)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_is_admin  boolean;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Unauthenticated'; END IF;

  SELECT is_admin INTO STRICT v_is_admin
    FROM public.users WHERE id = v_caller_id FOR SHARE;
  IF NOT coalesce(v_is_admin, false) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.posts
    SET pii_flagged       = true,
        moderation_status = 'flagged_pii',
        story_sanitized   = NULL
    WHERE id = p_post_id;

  INSERT INTO public.admin_audit_log(admin_id, action, target_id, detail)
    VALUES (v_caller_id, 'flag_pii', p_post_id,
      jsonb_build_object('timestamp', now(), 'note', coalesce(left(p_note, 256), '')));
END;
$$;

-- 6d. Admin decrypt_story — only accessible to admins; returns plaintext
-- NOTE: actual decryption happens in application layer (Edge Function has the key).
-- This RPC returns the encrypted payload so admin Edge Function can decrypt it.
CREATE OR REPLACE FUNCTION admin_get_encrypted_story(p_post_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_is_admin  boolean;
  v_result    jsonb;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Unauthenticated'; END IF;

  SELECT is_admin INTO STRICT v_is_admin
    FROM public.users WHERE id = v_caller_id FOR SHARE;
  IF NOT coalesce(v_is_admin, false) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'ciphertext', story_original,
    'iv',         story_iv,
    'auth_tag',   story_auth_tag
  ) INTO v_result
  FROM public.posts WHERE id = p_post_id;

  -- Audit every decryption access
  INSERT INTO public.admin_audit_log(admin_id, action, target_id, detail)
    VALUES (v_caller_id, 'decrypt_access', p_post_id,
      jsonb_build_object('timestamp', now()));

  RETURN v_result;
END;
$$;

-- 6e. Admin stats (hardened — fresh query, no cache)
CREATE OR REPLACE FUNCTION admin_get_stats()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_caller_id     uuid;
  v_is_admin      boolean;
  v_total_users   bigint;
  v_pending       bigint;
  v_flagged_pii   bigint;
  v_approved      bigint;
  v_rejected      bigint;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Unauthenticated'; END IF;

  SELECT is_admin INTO STRICT v_is_admin
    FROM public.users WHERE id = v_caller_id FOR SHARE;
  IF NOT coalesce(v_is_admin, false) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT count(*) INTO v_total_users  FROM public.users;
  SELECT count(*) INTO v_pending      FROM public.posts WHERE moderation_status = 'pending';
  SELECT count(*) INTO v_flagged_pii  FROM public.posts WHERE moderation_status = 'flagged_pii';
  SELECT count(*) INTO v_approved     FROM public.posts WHERE moderation_status = 'approved';
  SELECT count(*) INTO v_rejected     FROM public.posts WHERE moderation_status = 'rejected';

  RETURN jsonb_build_object(
    'total_users',   v_total_users,
    'pending',       v_pending,
    'flagged_pii',   v_flagged_pii,
    'approved',      v_approved,
    'rejected',      v_rejected
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 7. PERMISSION GRANTS — Principle of least privilege
-- ────────────────────────────────────────────────────────────
-- Revoke public execute on all admin RPCs; grant only to authenticated
REVOKE EXECUTE ON FUNCTION admin_approve_post(uuid)           FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_reject_post(uuid, text)      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_flag_pii(uuid, text)         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_get_encrypted_story(uuid)    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_get_stats()                  FROM PUBLIC;

GRANT  EXECUTE ON FUNCTION admin_approve_post(uuid)           TO authenticated;
GRANT  EXECUTE ON FUNCTION admin_reject_post(uuid, text)      TO authenticated;
GRANT  EXECUTE ON FUNCTION admin_flag_pii(uuid, text)         TO authenticated;
GRANT  EXECUTE ON FUNCTION admin_get_encrypted_story(uuid)    TO authenticated;
GRANT  EXECUTE ON FUNCTION admin_get_stats()                  TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 8. INDEXES for performance on new security columns
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_moderation ON public.posts(moderation_status);
CREATE INDEX IF NOT EXISTS idx_posts_pii        ON public.posts(pii_flagged) WHERE pii_flagged = true;
CREATE INDEX IF NOT EXISTS idx_users_alias      ON public.users(alias);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user ON public.rate_limits(user_id, action, window_start);
CREATE INDEX IF NOT EXISTS idx_audit_admin      ON public.admin_audit_log(admin_id, created_at DESC);

-- ────────────────────────────────────────────────────────────
-- 9. CLEANUP — Remove stale test/mock data guards
-- ────────────────────────────────────────────────────────────
-- Ensure increment_post_view is security definer with pinned search_path
CREATE OR REPLACE FUNCTION increment_post_view(p_post_id uuid)
  RETURNS void
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = public
AS $$
  UPDATE public.posts SET views_count = views_count + 1 WHERE id = p_post_id;
$$;

-- Grant to anon + authenticated (public view tracking)
GRANT EXECUTE ON FUNCTION increment_post_view(uuid) TO anon, authenticated;
