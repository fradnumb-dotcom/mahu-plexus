# Mahu Plexus — Sistema de Gestión Empresarial

> Conectamos ideas, creamos soluciones

## 🚀 Instalación rápida

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🔧 Variables de entorno

El archivo `.env.local` ya está configurado con las credenciales de Supabase.

Para activar la integración de Izipay, agrega cuando estés listo (Back Office Vendedor → Claves de API REST):
```
IZIPAY_USERNAME=...
IZIPAY_PASSWORD=...
NEXT_PUBLIC_IZIPAY_PUBLIC_KEY=...
```

Para activar el API de consulta de DNI, agrega:
```
DNI_API_TOKEN=tu_token_de_factiliza
```

## 📁 Estructura del proyecto

```
app/
├── admin/          → Panel para crear cuentas de clientes
├── api/
│   ├── create-client/   → Crear cuenta owner + negocio
│   ├── create-seller/   → Crear vendedores
│   ├── izipay/          → Integración de pagos Izipay (FormToken + IPN)
│   ├── delete-seller/   → Eliminar vendedores
│   ├── dni/             → Consulta de DNI/CEE
│   ├── products/        → CRUD de productos
│   ├── sales/           → CRUD de ventas
│   ├── subscription/    → Gestión de suscripciones
│   ├── toggle-seller/   → Activar/desactivar vendedores
│   └── update-seller/   → Actualizar nombre de vendedor
├── components/
│   ├── LoadingScreen.tsx
│   ├── Logo.tsx
│   ├── Sidebar.tsx
│   └── Toast.tsx
├── dashboard/      → Panel principal (solo dueño)
├── lib/
│   ├── supabase.ts
│   └── subscription.ts
├── login/          → Login con efecto Plexus
├── sales/          → Módulo de ventas
├── sellers/        → Gestión de vendedores
├── settings/       → Configuración del negocio
└── subscription/   → Planes y suscripción
```

## 🎨 Identidad visual

- Negro premium: `#0B0B0D`
- Oscuro: `#141418`
- Superficie: `#2B2B30`
- Dorado oficial: `#D4AF37`
- Texto: `#E6E6E6`
- Blanco: `#FFFFFF`

## 💳 Integración Izipay

La arquitectura de pagos vive en `/api/izipay/route.ts` (genera el formToken) y
`/api/izipay/webhook/route.ts` (recibe el IPN y activa la suscripción). El SDK
del formulario se carga bajo demanda desde `components/IzipayCheckout.tsx`.

Para activar cobros reales:
1. Agrega `IZIPAY_USERNAME`, `IZIPAY_PASSWORD` y `NEXT_PUBLIC_IZIPAY_PUBLIC_KEY` en `.env.local` (y en Vercel).
2. En el Back Office Vendedor → Reglas de notificación, configura la URL del IPN:
   `https://TU-DOMINIO/api/izipay/webhook`
3. Prueba con credenciales TEST; al confirmar, cambia a las de PRODUCCIÓN.

## 📋 Planes de suscripción

| Plan          | Duración | Precio    |
|---------------|----------|-----------|
| Prueba gratis | 2 días   | Gratis    |
| Semanal       | 7 días   | S/ 29.90  |
| Mensual       | 30 días  | S/ 89.90  |

## 🗄️ Base de datos (Supabase)

Tablas requeridas:
- `businesses` — negocios con campos de suscripción
- `profiles` — usuarios (owner/seller)
- `products` — inventario
- `sales` — cabecera de ventas
- `sale_items` — líneas de ventas
- `inventory_movements` — historial operativo

---

Mahu Plexus © 2025 · Software empresarial premium
