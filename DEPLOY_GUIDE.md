# Guía de Deploy — Mahu Plexus (Vercel)

## 1. Requisitos previos
- Cuenta en [Vercel](https://vercel.com)
- Proyecto Supabase configurado
- Cuenta Izipay (para pagos reales)

## 2. Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (anon) | `sb_publishable_...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (SECRETA) | `sb_secret_...` |
| `NEXT_PUBLIC_APP_URL` | **URL de producción** (sin slash final) | `https://mahuplexus.vercel.app` |
| `IZIPAY_USERNAME` | Usuario/shopId (API REST) | `12345678` |
| `IZIPAY_PASSWORD` | Clave de API REST (SECRETA) | `prodpassword_...` |
| `NEXT_PUBLIC_IZIPAY_PUBLIC_KEY` | Clave pública del SDK | `12345678:publickey_...` |
| `DNI_API_TOKEN` | Token Factiliza (DNI/RUC) | `eyJ...` |

> **CRÍTICO:** `NEXT_PUBLIC_APP_URL` debe ser tu dominio real de producción.
> Sin esta variable, los enlaces de verificación de correo apuntarían a localhost.

## 3. Configuración de Supabase

### 3.1 Ejecutar migraciones (SQL Editor)
Ejecuta en orden los archivos de `supabase/migrations/`:
1. `001_add_profile_phone_dni.sql` — columnas phone/dni + índices únicos
2. `002_complaints_table.sql` — Libro de Reclamaciones
3. `003_subscription_columns.sql` — campos de suscripción

### 3.2 Authentication → URL Configuration
- **Site URL**: `https://tu-dominio.vercel.app`
- **Redirect URLs**: agregar `https://tu-dominio.vercel.app/login`

### 3.3 Authentication → Providers → Email
- Activar **Confirm email**

### 3.4 SMTP (Project Settings → Auth → SMTP)
- Configurar proveedor (SendGrid, Resend, etc.) para envío de correos en producción.

## 4. Deploy

```bash
# Opción A: desde GitHub
# 1. Sube el proyecto a un repo de GitHub
# 2. En Vercel: New Project → Import repo → Deploy

# Opción B: Vercel CLI
npm i -g vercel
vercel --prod
```

Vercel detecta Next.js automáticamente. No requiere configuración de build especial.

## 5. Post-deploy
- Verifica que `NEXT_PUBLIC_APP_URL` apunte al dominio final.
- Prueba el registro → debe llegar correo con enlace al dominio correcto.
- Prueba login, recuperación de contraseña.
- Configura las credenciales de PRODUCCIÓN de Izipay y la URL del IPN (`/api/izipay/webhook`) en el Back Office Vendedor cuando estés listo para cobros reales.
