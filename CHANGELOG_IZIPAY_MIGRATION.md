# CHANGELOG — Migración de pagos Culqi → Izipay (producción)

## Pagos
- Eliminada por completo la lógica de Culqi (`app/api/culqi/route.ts`). 0 referencias activas a Culqi en el código.
- Sin dependencias ni SDK de Culqi (no había paquete npm; el placeholder se retiró).
- Integración Izipay (modelo FormToken / micuentaweb):
  - `app/api/izipay/route.ts` — `POST` genera el formToken (autenticado por sesión); `GET` estado (autenticado).
  - `app/api/izipay/webhook/route.ts` — IPN: firma HMAC-SHA256 (timing-safe), verificación de monto, anti-replay, soporte de eventos recurrentes, extensión de período acumulativa.
  - `app/api/izipay/cancel/route.ts` — cancelación (autenticada); conserva acceso hasta fin de período.
  - `app/lib/izipay.ts` — precios/planes/rrule y helpers de la API REST (solo backend).
  - `app/lib/authz.ts` — autorización server-side (identidad y negocio desde la sesión).
  - `app/components/IzipayCheckout.tsx` — checkout embebido; SDK bajo demanda.
- Suscripciones, renovaciones, cancelaciones, webhook/IPN y activación automática del plan: operativos.

## Corrección del checkout (KR / Krypton)
- Resuelto "No se puede llamar a KR.renderElements si un formulario ya está renderizado":
  - `removeForms()` SIEMPRE antes de `setFormConfig()`/`renderElements()`.
  - `useEffect` con deps estables `[formToken, publicKey]`; callbacks vía `ref` (sin dobles render).
  - `onSubmit`/`onError` registrados una sola vez por carga de página (sin listeners apilados).
  - Invalidación por run-id → seguro con React Strict Mode (doble montaje) y remounts de App Router.
  - Cleanup que desmonta el formulario (sin fugas de memoria). Abrir/cerrar infinitas veces sin error.

## Estado de suscripción
- Nuevo estado `canceled` en `app/lib/subscription.ts` (acceso válido hasta el vencimiento; auto-expira luego). Cambio aditivo.

## Supabase
- Nueva migración aditiva e idempotente `004_izipay_recurring.sql` (`izipay_subscription_id`, `subscription_canceled_at`). No modifica datos ni columnas existentes; el sistema funciona sin ella (degradación segura).
- Revisión: migraciones idempotentes; `complaints` con RLS (inserción pública, lectura por service role); índices únicos parciales en `profiles`. Sin cambios a RLS/policies existentes (compatibilidad con producción).

## Seguridad
- Identidad y `business_id` derivados de la sesión Supabase (Bearer token); el cliente no los envía (sin IDOR).
- Precios solo en backend; verificación de monto en el IPN (anti-manipulación).
- 0 credenciales hardcodeadas; service role solo en backend; ningún secreto bajo `NEXT_PUBLIC`.
- Manejo de errores sin filtrar secretos ni stack traces.
- `npm audit`: 2 vulnerabilidades *moderate* (PostCSS transitivo dentro de Next.js). El único "fix" disponible es `npm audit fix --force`, que **degrada Next a 9.x** (rompería el proyecto), por lo que NO se aplica. Es una herramienta de build sin vector explotable en runtime.

## Textos / documentación
- Referencias Culqi → Izipay en landing, login, terms, privacy, settings.
- Actualizados README, DEPLOY_GUIDE, LAUNCH_CHECKLIST, CHANGELOG_v3.1 y MIGRATION_IZIPAY.

## Verificaciones
- `npm install` OK · `npm run build` OK (Compiled successfully) · `npm run start` OK (Ready, /landing 200) · 0 errores de TypeScript.
