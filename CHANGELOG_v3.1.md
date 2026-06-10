# Mahu Plexus v3.1 — Registro de cambios

## Branding e identidad visual
- **Favicon profesional MP** generado en `.ico` (múltiples resoluciones 16–256px),
  `.svg` vectorial y `.png` (32px + apple-icon 180px). Monograma M+P dorado sobre negro.
- Metadata de iconos completa en `layout.tsx` (favicon, icon, apple-icon, svg).

## Animación de logo (dashboard)
- Nuevo componente `LogoIntro.tsx`: animación elegante de las siglas MP que se
  auto-dibujan (stroke-dasharray) al entrar al dashboard. Se muestra una sola vez
  por sesión (`sessionStorage`). Duración ~2.4s, optimizada con CSS puro (sin JS pesado).
- Animaciones movidas a `globals.css` (sin dependencia de styled-jsx).

## KPIs animados (dashboard)
- Nuevo componente `CountUp.tsx`: contador numérico animado con
  `requestAnimationFrame` + easing cúbico (60fps). Aplicado a los 4 KPIs principales.

## Marcas de pago oficiales
- Nuevo componente `PaymentMarks.tsx`: marcas Visa, Mastercard, American Express y
  Yape renderizadas como SVG inline limpios (sin assets externos ni problemas de licencia).
- Integradas en la página de suscripción (sección Culqi).

## Modo claro / oscuro
- Cobertura ampliada de light mode en `globals.css`: overrides completos para todos
  los colores hardcodeados (`#0B0B0D`, `#141418`, `#2B2B30`, `#E6E6E6`, `#D4AF37`)
  con sus variantes de opacidad. Sin textos ilegibles ni contrastes incorrectos.
- Transiciones suaves (280ms) al cambiar de tema.
- Persistencia con `localStorage` (ya existente) + script anti-flash en `layout.tsx`.

## Seguridad
- Nuevo `middleware.ts`:
  - Rate limiting en memoria para rutas `/api/` (120 req/min por IP).
  - Cabeceras de seguridad en todas las respuestas (X-Frame-Options,
    X-Content-Type-Options, Referrer-Policy, Permissions-Policy).
  - No interfiere con el flujo de auth client-side existente (no rompe login).

## Restricciones reales por plan (ya implementadas en v3, verificadas)
- `api/products/route.ts` valida límite de productos por plan en backend (403 si excede).
- Trial: 500 · Diario: 1000 · Semanal: 5000 · Mensual: ilimitado.
- Cuentas expiradas/suspendidas bloqueadas en backend.

## Notificaciones
- Sistema Toast verificado: sin emojis, símbolos tipográficos corporativos
  (✦ ↻ ✎ ✕ ↓ ✓ ◈), animaciones suaves, auto-cierre, barra de progreso.

## NO modificado (estabilidad preservada)
- Lógica de autenticación Supabase (login, register, recuperación).
- APIs de ventas, inventario, vendedores, DNI, RUC, Culqi, suscripciones.
- Tablas y relaciones de Supabase.
- Consulta DNI/RUC.
- Flujo de email: se mantiene `email_confirm: true` (auto-confirmado) para no
  bloquear el acceso de usuarios existentes ni el auto-login del registro.

### Recomendación para verificación de email obligatoria (opcional, futuro)
Para activar verificación de correo sin romper el sistema actual:
1. En Supabase Dashboard → Authentication → Providers → Email: activar "Confirm email".
2. Cambiar `email_confirm: true` → `false` en `api/create-client/route.ts`.
3. Usar `supabase.auth.signUp()` con `emailRedirectTo` en el registro en lugar del
   endpoint admin, y mostrar pantalla "Revisa tu correo".
Se deja documentado pero NO aplicado para priorizar estabilidad.
