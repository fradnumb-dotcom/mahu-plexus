# Checklist final de lanzamiento — Mahu Plexus

## Branding
- [x] Logo MP corregido (M y P legibles, ya no parece NP)
- [x] Favicon MP (.ico, .svg, .png, apple-icon)
- [x] Logo horizontal regenerado
- [x] Animación de entrada MP (una vez por sesión, modo claro y oscuro)

## Autenticación
- [x] Registro con Nombre, Apellidos, Correo, Teléfono, DNI, Contraseña
- [x] Checkboxes obligatorios (Términos + Privacidad)
- [x] Verificación de correo obligatoria
- [x] Enlaces usan NEXT_PUBLIC_APP_URL (no localhost)
- [x] Recuperación de contraseña con redirect correcto
- [x] Validación de duplicados (correo, teléfono, DNI) con mensajes amigables
- [ ] **Configurar SMTP en Supabase** (requerido en producción)
- [ ] **Activar "Confirm email" en Supabase**

## Modo claro / oscuro
- [x] Overrides completos de colores hardcodeados
- [x] Toggle persistente (localStorage)
- [x] Sin textos invisibles ni bajo contraste

## Rendimiento
- [x] Cargas de datos paralelizadas (Promise.all)
- [x] React.memo en componentes puros (CountUp, UsageMeter, PaymentMarks)
- [x] useMemo en cálculos pesados de dashboard y ventas

## Base de datos
- [ ] **Ejecutar migraciones SQL** (phone/dni, complaints, subscription)
- [x] Código resiliente si las columnas no existen (fallback)

## Seguridad
- [x] Middleware con rate limiting + cabeceras de seguridad
- [x] Validación de duplicados
- [x] Service role key solo en backend

## Legal (Culqi)
- [x] Términos y Condiciones
- [x] Política de Privacidad
- [x] Política de Devoluciones
- [x] Libro de Reclamaciones funcional
- [x] Página de Contacto
- [x] Footer legal en todas las páginas

## Deploy
- [ ] Configurar variables de entorno en Vercel
- [ ] NEXT_PUBLIC_APP_URL = dominio de producción
- [ ] Deploy y prueba de flujo completo
