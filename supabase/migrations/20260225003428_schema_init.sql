-- Enable pgvector extension for AI embeddings
create extension if not exists vector;

-- Create Users Table (Secure Anonymous Model)
create table public.users (
  id uuid primary key default gen_random_uuid(),
  alias text unique not null check (char_length(alias) >= 3),
  hashed_password text not null,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Posts Table
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.users(id) on delete cascade not null,
  category text not null,
  location text,
  incident_date timestamp with time zone,
  story_original text not null, -- Encrypted or hidden by RLS
  story_sanitized text,         -- Publicly readable
  embedding vector(1536),       -- For LLM/semantic search
  sensitivity text default 'normal',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  views_count integer default 0,
  repost_count integer default 0
);

-- Create Media Table (No direct URLs, only Cloudinary IDs)
create table public.media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  cloudinary_id text not null,
  media_type text not null check (media_type in ('image', 'video', 'audio', 'document')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security
alter table public.users enable row level security;
alter table public.posts enable row level security;
alter table public.media enable row level security;

-- Users RLS: Users can only see and modify their own base profile
create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Posts RLS:
-- 1. Anyone can read sanitized posts
create policy "Anyone can read sanitized posts"
  on public.posts for select
  using (story_sanitized is not null);

-- 2. Authors can read their own original posts
create policy "Authors can read own original posts"
  on public.posts for select
  using (auth.uid() = author_id);

-- 3. Authors can insert/update their own posts
create policy "Authors can insert own posts"
  on public.posts for insert
  with check (auth.uid() = author_id);

create policy "Authors can update own posts"
  on public.posts for update
  using (auth.uid() = author_id);

-- Media RLS:
-- 1. Anyone can read media attached to public (sanitized) posts
create policy "Anyone can read media of public posts"
  on public.media for select
  using (
    exists (
      select 1 from public.posts
      where posts.id = media.post_id and posts.story_sanitized is not null
    )
  );

-- 2. Authors can insert media for their own posts
create policy "Authors can insert media"
  on public.media for insert
  with check (
    exists (
      select 1 from public.posts
      where posts.id = media.post_id and posts.author_id = auth.uid()
    )
  );

-- Function to handle views increment safely (RPC)
create or replace function increment_post_view(post_id uuid)
returns void as $$
begin
  update public.posts
  set views_count = views_count + 1
  where id = post_id;
end;
$$ language plpgsql security definer;
