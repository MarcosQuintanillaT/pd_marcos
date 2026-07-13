# Portafolio Docente Digital

Gestor documental para el portafolio oficial de un docente BTP. Está construido con Next.js (App Router), React, Tailwind CSS y Supabase (Auth, PostgreSQL y Storage).

## Qué incluye

- Índice institucional completo de las secciones 1 a 8.
- Dos roles: `docente` y `supervisor`.
- Carga, reemplazo, visualización, descarga y eliminación de PDF, imágenes y HTML.
- Revisión con estados `Pendiente`, `Revisado` y `Aprobado` y comentario del supervisor.
- Filtros por parcial donde corresponde.
- API routes de Next.js con sesión Supabase, RLS, validación de tipo MIME y tamaño.
- SQL reproducible con tablas, funciones, RLS, permisos por columna y políticas de Storage.
- Recuperación de contraseña con enlace temporal de Supabase Auth.
- Modo demostración opcional y desactivado por defecto en producción.

## Puesta en marcha local

1. Instala Node.js 20 o superior.
2. Ejecuta `npm install`.
3. Copia `.env.example` a `.env.local` y completa las claves.
4. En Supabase, abre **SQL Editor**, pega el contenido de `supabase/schema.sql` y ejecútalo una sola vez.
5. En **Authentication > Users**, crea las cuentas del docente y supervisor. El disparador `on_auth_user_created` crea el perfil automáticamente con rol seguro `supervisor`. Solo promueve la cuenta docente:

```sql
update public.perfiles
set rol = 'docente'
where email = 'docente@ejemplo.com';

```

Si creas usuarios mediante Admin API, puedes enviar `app_metadata.rol` con `docente` o `supervisor`; el trigger acepta únicamente esa metadata administrativa. Nunca confía en `user_metadata.rol`.

6. Inicia la app con `npm run dev` y abre `http://localhost:3000`.

Sin las claves de Supabase, la aplicación muestra el login bloqueado y no inventa datos. Para una demostración local explícita agrega `NEXT_PUBLIC_DEMO_MODE=true`. El código la ignora cuando `NODE_ENV=production`, incluso si alguien configura la variable por error.

## Estructura principal

```text
app/
  api/documentos/              API de listado y carga
  api/documentos/[id]/         edición, revisión y eliminación
  (panel)/portafolio/           dashboard y secciones dinámicas
  reset-password/              cambio de contraseña desde enlace de recuperación
components/                     interfaz reutilizable
lib/portfolio.ts                índice oficial y rutas de Storage
lib/supabase/                   clientes público, servidor y administrativo
supabase/schema.sql             esquema, RLS y Storage
```

## Seguridad

- La clave `SUPABASE_SERVICE_ROLE_KEY` es server-only, opcional y queda reservada para mantenimiento; nunca lleva el prefijo `NEXT_PUBLIC_` ni se usa en el navegador.
- Las API routes ejecutan CRUD y Storage con la sesión del usuario, por lo que no eluden RLS.
- RLS decide qué filas puede operar cada rol y `trg_check_supervisor_update` limita las columnas del supervisor.
- `on_auth_user_created` crea perfiles y `on_auth_user_updated` sincroniza metadata administrativa; el rol privilegiado solo se acepta desde `app_metadata` y el valor por defecto es `supervisor`.
- El bucket es privado; las API generan enlaces firmados de corta duración para visualizar o descargar.
- Los enlaces del visor y descarga vencen a los 600 segundos y cada objeto conserva su extensión: `slug-del-titulo_a1b2c3.ext`.
- El límite es 4 MB por archivo para mantener las cargas compatibles con Vercel Functions. Las imágenes y los PDF escaneados deben optimizarse si exceden ese tamaño.
- No existe formulario ni llamada pública a `signUp`; desactiva además **Allow new users to sign up / Enable email signups** en Supabase.

## Despliegue en Vercel Hobby

1. Sube el repositorio a GitHub/GitLab/Bitbucket e impórtalo en Vercel.
2. Vercel detectará Next.js. Conserva `npm run build` como comando de compilación.
3. Agrega las variables de la tabla siguiente en **Project Settings > Environment Variables** para Production (y Preview si lo usarás).
4. En Supabase, establece el dominio como Site URL y agrega estas rutas en **Authentication > URL Configuration > Redirect URLs**:
   - `https://TU-DOMINIO.vercel.app/auth/callback`
   - `https://TU-DOMINIO.vercel.app/reset-password`
   - Para desarrollo: `http://localhost:3000/reset-password`
5. En **Authentication > Sign In / Providers > Email**, desactiva **Allow new users to sign up / Enable email signups**. Las cuentas se crean solo desde **Authentication > Users**.
6. Despliega. Cada cambio de variables requiere un nuevo deployment.

| Variable | Alcance | Producción |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Pública | Requerida |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública y protegida por RLS | Requerida |
| `NEXT_PUBLIC_DOCENTE_NOMBRE` | Pública | Requerida para personalización |
| `NEXT_PUBLIC_DOCENTE_AREA` | Pública | Requerida para personalización |
| `NEXT_PUBLIC_DOCENTE_JORNADA` | Pública | Requerida para personalización |
| `SUPABASE_SERVICE_ROLE_KEY` | **Solo servidor** | Opcional; no se usa en el CRUD normal |
| `NEXT_PUBLIC_DEMO_MODE` | Pública | Ausente o `false`; producción la ignora |

## Uso

- El docente entra, abre una subsección y usa **Subir nuevo archivo**. Puede cargar PDF, imágenes o HTML, además de reemplazar o eliminar documentos.
- El supervisor abre el mismo índice, visualiza o descarga el archivo y guarda el estado/comentario.
- Para documentos segmentados, selecciona el parcial antes de subir o filtrar.
- En el login, **¿Olvidaste tu contraseña?** envía un enlace a `/reset-password`; el mensaje no revela si el correo existe.

## Verificación end-to-end de entrega

1. Docente real: inicia sesión, abre una subsección y prueba al menos un PDF, una imagen y un HTML; confirma los objetos privados `slug-del-titulo_xxxxxx.ext` en Storage y sus registros en `public.documentos`.
2. Supervisor real: inicia sesión, confirma que puede previsualizar los formatos compatibles y descargarlos mediante enlaces firmados.
3. Supervisor: cambia `estado` y `comentario_supervisor`; confirma ambos en SQL Editor. Con su token intenta actualizar `titulo` o `archivo_url` directamente y verifica el error `42501` del trigger.
4. Cierra sesión con ambos roles y visita `/portafolio`: debe redirigir a `/login`.
5. Desde el login solicita recuperación, abre el correo, entra a `/reset-password`, guarda una contraseña nueva y confirma que la sesión anterior queda cerrada.
6. Confirma en `https://TU-PROYECTO.supabase.co/auth/v1/settings` que `disable_signup` sea `true`.
7. Prueba login, menú, visor, descarga y revisión a 390 × 844 px.
8. Antes de desplegar ejecuta `npm run typecheck`, `npm run lint` y `npm run build`.

Pruebas automatizadas disponibles:

- `npm run test:e2e:production`: crea dos usuarios y un PDF temporales, valida roles/RLS/triggers/Storage/recuperación y limpia todo en `finally`.
- `npm run test:visual`: genera capturas móviles y de escritorio en `artifacts/production-smoke/` y limpia sus datos temporales.
