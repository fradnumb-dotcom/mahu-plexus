# Migración completa de pagos: Culqi → Izipay

Migración integral del sistema de suscripciones y pagos de **Culqi** a **Izipay**
(modelo FormToken / micuentaweb), manteniendo intacto el resto de la aplicación.

## Resumen de cambios

### Archivos nuevos
- `app/lib/izipay.ts` — constantes (precios, días, rrule) y helpers de la API REST de Izipay. Solo backend.
- `app/lib/authz.ts` — autorización server-side: deriva identidad y `business_id` de la sesión Supabase.
- `app/api/izipay/route.ts` — `POST` genera el formToken (autenticado); `GET` devuelve el estado (autenticado).
- `app/api/izipay/webhook/route.ts` — IPN: firma HMAC, anti-replay, verificación de monto, recurrencia.
- `app/api/izipay/cancel/route.ts` — cancelación de la renovación (autenticada).
- `app/components/IzipayCheckout.tsx` — formulario embebido; SDK cargado bajo demanda.
- `supabase/migrations/004_izipay_recurring.sql` — columnas opcionales (aditivas e idempotentes).

### Archivos modificados
- `app/subscription/page.tsx` — flujo Izipay, botón de cancelar, estado "Cancelada", rediseño sobrio.
- `app/lib/subscription.ts` — nuevo estado `canceled` (acceso hasta fin de período). Cambio aditivo.
- `app/landing/page.tsx`, `app/login/page.tsx`, `app/terms/page.tsx`, `app/privacy/page.tsx`, `app/settings/page.tsx` — textos Culqi → Izipay (sin lógica).
- `.env.example`, `README.md`, `DEPLOY_GUIDE.md`, `LAUNCH_CHECKLIST.md`, `CHANGELOG_v3.1.md` — variables y documentación.

### Eliminado
- `app/api/culqi/route.ts` (única lógica específica de Culqi). 0 referencias activas a Culqi en el código.

### NO modificado (intacto)
Autenticación (`register`, `forgot-password`, `lib/supabase.ts`), `middleware.ts`, dashboard, ventas,
inventario (`products`), vendedores, `api/subscription`, `Sidebar`, `ExpiredWall`, `next.config.ts`,
`layout.tsx`, Git/remote/ramas, configuración de Vercel, y la migración `003`. `package.json` sin
dependencias nuevas.

## Variables de entorno (reemplazan a CULQI_*)
| Variable | Tipo | Origen (Back Office Vendedor → Claves de API REST) |
|---|---|---|
| `IZIPAY_USERNAME` | privado | Usuario / shopId |
| `IZIPAY_PASSWORD` | privado | Clave de API REST (también firma el IPN) |
| `NEXT_PUBLIC_IZIPAY_PUBLIC_KEY` | público (SDK) | Clave pública |
| `IZIPAY_HMAC_KEY` | privado (opcional) | HMAC-SHA256, para validar retorno del navegador |
| `IZIPAY_API_BASE` | opcional | por defecto `https://api.micuentaweb.pe` |

Usa credenciales TEST en desarrollo y PRODUCCIÓN en producción. Si faltan, las rutas responden 503 (sin valores ficticios).

## Pasos para desplegar
1. Extrae este proyecto sobre tu carpeta actual (o úsalo como tu repo; ya no contiene Culqi).
   - Si lo superpones a tu carpeta, ejecuta una vez: `git rm app/api/culqi/route.ts`
2. Configura las variables Izipay en `.env.local` y en Vercel → Environment Variables.
3. (Opcional, para recurrencia/cancelación con registro) aplica la migración `004_izipay_recurring.sql`.
   Es aditiva e idempotente; el sistema funciona sin ella (degradación segura).
4. En el Back Office Vendedor → Reglas de notificación → URL de notificación:
   `https://TU-DOMINIO/api/izipay/webhook`
5. Despliega:
   ```
   npm install
   npm run build
   git add .
   git commit -m "feat: migración completa de pagos Culqi -> Izipay"
   git push
   ```

## Seguridad implementada
- Identidad y `business_id` derivados de la sesión Supabase (Bearer token); el cliente no los envía.
- Precios solo en backend; el cliente envía solo el id del plan (anti-manipulación de montos).
- IPN: validación de firma HMAC-SHA256 (timing-safe), verificación de monto, y protección anti-replay (ignora cargos repetidos).
- Sin credenciales hardcodeadas; todo vía variables de entorno. Solo la clave pública llega al navegador.
- Manejo de errores sin filtrar secretos ni stack traces al cliente.

## Nota sobre recurrencia automática
El cobro es por período (diario/semanal/mensual) con renovación que extiende el período de forma
acumulativa, y cancelación que conserva el acceso hasta el vencimiento. La base para recurrencia
automática nativa de Izipay (tokenización `REGISTER_PAY` + `CreateSubscription` + manejo de eventos
recurrentes en el IPN) está implementada y gateada de forma segura; requiere credenciales reales para
validar el cobro automático de extremo a extremo.

## Recomendación de seguridad
Rota las claves que venían en el `.env.local` original (Supabase service role, token DNI), ya que quedaron expuestas al compartir el ZIP.
