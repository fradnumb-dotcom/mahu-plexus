-- Mahu Plexus — campos opcionales para Izipay (recurrencia y cancelación).
-- 100% aditiva e idempotente: NO modifica ni elimina columnas/datos existentes.
-- Ejecútala para habilitar suscripciones recurrentes y registro de cancelación.
-- El sistema sigue funcionando aunque no se aplique (degradación segura en el código).
alter table public.businesses add column if not exists izipay_subscription_id text;
alter table public.businesses add column if not exists subscription_canceled_at timestamptz;
