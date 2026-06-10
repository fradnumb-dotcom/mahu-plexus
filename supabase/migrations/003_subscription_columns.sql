-- Mahu Plexus — subscription fields on businesses (idempotent)
alter table public.businesses add column if not exists subscription_status text default 'trial';
alter table public.businesses add column if not exists subscription_plan   text;
alter table public.businesses add column if not exists trial_started_at     timestamptz;
alter table public.businesses add column if not exists trial_ends_at        timestamptz;
alter table public.businesses add column if not exists current_period_end   timestamptz;
alter table public.businesses add column if not exists last_payment_at      timestamptz;
alter table public.businesses add column if not exists last_charge_id       text;
alter table public.businesses add column if not exists phone                text;
alter table public.businesses add column if not exists address              text;
alter table public.businesses add column if not exists receipt_footer       text;
alter table public.businesses add column if not exists logo_url             text;
