-- Add is_admin flag to users
alter table public.users add column if not exists is_admin boolean default false not null;

-- Admin RPC Definitions

create or replace function admin_approve_post(p_post_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  is_admin boolean;
begin
  select u.is_admin into is_admin from public.users u where id = auth.uid();
  if not coalesce(is_admin, false) then
    raise exception 'Unauthorized';
  end if;

  update public.posts set sensitivity = 'low' where id = p_post_id;
end;
$$;

create or replace function admin_reject_post(p_post_id uuid, p_reason text)
returns void
language plpgsql
security definer
as $$
declare
  is_admin boolean;
begin
  select u.is_admin into is_admin from public.users u where id = auth.uid();
  if not coalesce(is_admin, false) then
    raise exception 'Unauthorized';
  end if;

  update public.posts set story_sanitized = '[REJECTED: ' || p_reason || ']' where id = p_post_id;
end;
$$;

create or replace function admin_get_stats()
returns jsonb
language plpgsql
security definer
as $$
declare
  is_admin boolean;
  total_users int;
  pending_reports int;
  flagged_comments int;
begin
  select u.is_admin into is_admin from public.users u where id = auth.uid();
  if not coalesce(is_admin, false) then
    raise exception 'Unauthorized';
  end if;

  select count(*) into total_users from public.users;
  select count(*) into pending_reports from public.posts where sensitivity = 'high';
  select count(*) into flagged_comments from public.comments where body ilike '%flagged%';

  return jsonb_build_object(
    'users', total_users,
    'pending', pending_reports,
    'flagged', flagged_comments
  );
end;
$$;

-- Allow RPC wrapper for views count update (from patch_feed_interactions.py)
create or replace function increment_post_view(p_post_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.posts set views_count = views_count + 1 where id = p_post_id;
$$;
