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

Para activar la integración de Culqi, agrega cuando estés listo:
```
CULQI_PUBLIC_KEY=pk_live_...
CULQI_SECRET_KEY=sk_live_...
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
│   ├── culqi/           → Integración de pagos Culqi
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

## 💳 Integración Culqi

La arquitectura de pagos está lista en `/api/culqi/route.ts`.

Para activar cobros reales:
1. Agrega `CULQI_SECRET_KEY` en `.env.local`
2. Instala Culqi.js en el frontend: `npm install culqi-js`
3. Conecta el formulario de tarjeta en `/subscription/page.tsx`

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
