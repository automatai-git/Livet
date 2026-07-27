-- Book cloud library.
-- Run this in the Supabase SQL editor. Non-destructive: uses IF NOT EXISTS,
-- safe to re-run.

create table if not exists public.book_cloud_books (
  id         text not null,                       -- client-generated id
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  author     text not null default '',
  status     text not null default 'read' check (status in ('read', 'wishlist')),
  themes     jsonb not null default '[]'::jsonb,  -- ordered theme ids; [0] is its cloud
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists book_cloud_books_user_idx
  on public.book_cloud_books (user_id);

alter table public.book_cloud_books enable row level security;

drop policy if exists "users own book cloud books" on public.book_cloud_books;
create policy "users own book cloud books" on public.book_cloud_books
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);
