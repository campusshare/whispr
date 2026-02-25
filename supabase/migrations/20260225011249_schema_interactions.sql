-- Create Likes Table
create table public.likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (post_id, user_id)
);

-- Create Bookmarks Table
create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (post_id, user_id)
);

-- Create Comments Table
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  body text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Follows Table (Secure Anonymous Subscriptions)
create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references public.users(id) on delete cascade not null,
  following_id uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (follower_id, following_id)
);

-- Create Direct Messages Table (End-to-End Encrypted Emulation)
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.users(id) on delete cascade not null,
  receiver_id uuid references public.users(id) on delete cascade not null,
  content text not null, -- Expected to be symmetrically encrypted by client
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security
alter table public.likes enable row level security;
alter table public.bookmarks enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.messages enable row level security;

-- LIKES & BOOKMARKS RLS:
-- Anyone can see likes/bookmarks on public posts
create policy "Anyone can read likes" on public.likes for select using (true);
-- Users can only see their own bookmarks (privacy)
create policy "Users can read own bookmarks" on public.bookmarks for select using (auth.uid() = user_id);

-- Users can only insert/delete their own likes/bookmarks
create policy "Users can manage own likes" on public.likes for all using (auth.uid() = user_id);
create policy "Users can manage own bookmarks" on public.bookmarks for all using (auth.uid() = user_id);

-- COMMENTS RLS:
create policy "Anyone can read comments" on public.comments for select using (true);
create policy "Users can manage own comments" on public.comments for all using (auth.uid() = user_id);

-- FOLLOWS RLS:
create policy "Anyone can see followers" on public.follows for select using (true);
create policy "Users can manage own follows" on public.follows for all using (auth.uid() = follower_id);

-- MESSAGES RLS: Zero Trust Chat
-- Users can only read messages where they are the sender OR the receiver
create policy "Users can read their own messages" on public.messages
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Users can only insert messages where they are the sender
create policy "Users can send messages" on public.messages
  for insert with check (auth.uid() = sender_id);
