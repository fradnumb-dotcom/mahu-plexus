# Configuración de verificación de correo — Mahu Plexus

A partir de la v3.3, el registro de nuevos usuarios **requiere verificación de correo**
antes de permitir el acceso. Para que funcione en producción, configura Supabase así:

## 1. Activar confirmación de email en Supabase

Dashboard de Supabase → **Authentication** → **Providers** → **Email**:
- Activar **"Confirm email"** (Confirmar correo).

Dashboard de Supabase → **Authentication** → **URL Configuration**:
- **Site URL**: `https://tu-dominio.com` (o `http://localhost:3000` en desarrollo).
- **Redirect URLs**: agregar `https://tu-dominio.com/login`.

## 2. Configurar SMTP (correo saliente)

Dashboard → **Project Settings** → **Authentication** → **SMTP Settings**:
- Configurar un proveedor SMTP (SendGrid, Resend, Mailgun, Gmail SMTP, etc.).
- Sin SMTP configurado, Supabase usa su servidor de pruebas con límites bajos.

## 3. Plantilla de correo (opcional, recomendado)

Dashboard → **Authentication** → **Email Templates** → **Confirm signup**:
- Personalizar con la marca Mahu Plexus.

## Cómo funciona en el código

- **Registro** (`/register`): llama a `POST /api/create-client` con
  `require_verification: true`. La cuenta se crea SIN confirmar y se envía el
  correo de verificación. Se muestra la pantalla "Verifica tu correo".
- **Login** (`/login`): si el correo no está confirmado, Supabase rechaza el
  acceso y se muestra el mensaje correspondiente. Hay además una segunda
  comprobación (`email_confirmed_at`) que cierra sesión si no está verificado.
- **Admin** (`/admin`): las cuentas creadas por el panel de administración usan
  `require_verification: false` (auto-confirmadas), para que el dueño del sistema
  pueda crear clientes sin fricción.

## Recuperación de contraseña

`/forgot-password` usa `supabase.auth.resetPasswordForEmail()` con `redirectTo`
hacia `/login`. Compatible con producción una vez configurado el SMTP y las
Redirect URLs del paso 1.

## Campos de perfil (phone, dni)

El registro ahora captura **teléfono** y **DNI**. Para guardarlos, agrega estas
columnas a la tabla `profiles` en Supabase (opcional — el sistema funciona sin
ellas gracias a un fallback automático):

```sql
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists dni text;
```

## Reenvío de correo de verificación (v3.7)

Si un usuario no recibió o perdió el correo de confirmación:
- En la pantalla de **Login**, al intentar entrar con un correo no verificado,
  aparece automáticamente el botón **"Reenviar correo de verificación"**.
- Endpoint: `POST /api/resend-verification` con `{ email, redirect_to }`.
- Usa `supabase.auth.resend({ type: "signup" })` y respeta los límites de tasa de Supabase.
- Mensajes amigables para: ya verificado, límite de tasa, error genérico.
