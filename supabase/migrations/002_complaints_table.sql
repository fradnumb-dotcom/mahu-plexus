-- Mahu Plexus — Libro de Reclamaciones storage (idempotent)
create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  document_number text,
  order_id text,
  complaint_type text default 'reclamo',
  description text not null,
  claim_detail text,
  requested_action text,
  status text default 'pending',
  created_at timestamptz default now()
);

alter table public.complaints enable row level security;

-- Allow anonymous inserts (public complaint book) and owner reads via service role.
drop policy if exists complaints_insert_anon on public.complaints;
create policy complaints_insert_anon on public.complaints
  for insert to anon, authenticated with check (true);
