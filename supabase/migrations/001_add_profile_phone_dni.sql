-- Mahu Plexus — add phone & dni to profiles (idempotent, safe for existing data)
-- Run this in the Supabase SQL Editor.

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists dni   text;

-- Optional uniqueness for duplicate prevention at DB level.
-- These are partial unique indexes so existing NULLs don't conflict.
create unique index if not exists profiles_phone_unique
  on public.profiles (phone) where phone is not null;

create unique index if not exists profiles_dni_unique
  on public.profiles (dni) where dni is not null;

-- Note: existing rows keep NULL phone/dni and are unaffected.
