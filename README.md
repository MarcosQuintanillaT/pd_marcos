# Portafolio Docente Digital

Gestor documental del portafolio oficial de un docente BTP, construido con Next.js (App Router), React, Tailwind CSS y Supabase (Auth, PostgreSQL y Storage).

## Funciones principales

- Índice institucional completo de las secciones 1 a 8.
- Roles `docente` y `supervisor`, protegidos por RLS.
- Portafolios separados por año lectivo, con datos de área, jornada e institución.
- Carga directa y segura a Storage de PDF, HTML, imágenes y videos MP4/WebM.
- Nombres descriptivos en Storage: `slug-del-titulo_a1b2c3.ext`.
- Búsqueda global, filtros por estado/parcial y bandeja de pendientes para el supervisor.
- Organización controlada por General/Anual y parciales I-IV en Programación, Planes de clase y Rúbricas.
- Dashboard con avance de cobertura y avance de revisión como métricas separadas.
- Visor integrado, descarga con enlaces firmados de 10 minutos y advertencia para HTML.
- Historial de revisiones, versiones al reemplazar archivos y papelera recuperable.
- Exportación ZIP del año seleccionado con índice CSV.
- Recuperación de contraseña y rutas privadas.
- Diseño responsive y controles accesibles por teclado.

## Requisitos

- Node.js 22 LTS, igual que `.nvmrc` y GitHub Actions.
- Un proyecto Supabase.
- Dos usuarios creados manualmente: docente y supervisor.

## Puesta en marcha local

1. Instala dependencias:

```powershell
npm install
```

2. Copia `.env.example` a `.env.local` y completa las claves públicas:

```powershell
Copy-Item .env.example .env.local
```

3. Para una base nueva, ejecuta `supabase/schema.sql` completo desde **SQL Editor**.

4. Para la base existente anterior a esta mejora, ejecuta únicamente:

```text
supabase/migrations/202607130001_portfolio_v2.sql
```

La migración es repetible: crea años lectivos, códigos estables, trazabilidad, versiones, papelera, índices, políticas RLS y configura el bucket privado.

5. Crea las cuentas desde **Authentication > Users**. El trigger crea el perfil con rol seguro `supervisor`. Promueve únicamente la cuenta docente:

```sql
update public.perfiles
set rol = 'docente'
where email = 'docente@ejemplo.com';
```

6. Inicia la aplicación:

```powershell
npm run dev
```

Abre `http://localhost:3000`.

## Variables de entorno

| Variable | Exposición | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Pública | Requerida |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública, limitada por RLS | Requerida |
| `SUPABASE_SERVICE_ROLE_KEY` | **Solo servidor** | Opcional; mantenimiento y pruebas remotas |
| `NEXT_PUBLIC_DEMO_MODE` | Pública | Solo desarrollo; ausente o `false` en producción |
| `NEXT_PUBLIC_DOCENTE_NOMBRE` | Pública | Respaldo opcional |
| `NEXT_PUBLIC_DOCENTE_AREA` | Pública | Respaldo opcional |
| `NEXT_PUBLIC_DOCENTE_JORNADA` | Pública | Respaldo opcional |

Nunca uses el prefijo `NEXT_PUBLIC_` en la service role. `.env.local` está ignorado por Git.

## Estructura relevante

```text
app/
  api/documentos/                 listado y operaciones documentales
  api/documentos/[id]/acceso/     enlaces firmados bajo demanda
  api/documentos/[id]/historial/  revisiones y versiones
  api/documentos/resumen/         cobertura y revisión
  api/portafolios/                años lectivos
  api/exportar/                    respaldo ZIP del año
  api/health/                      comprobación básica
  (panel)/portafolio/papelera/     restauración y borrado definitivo
components/                        interfaz reutilizable
lib/                               Auth, Storage, validación y utilidades
supabase/migrations/               historial SQL
supabase/schema.sql                instalación completa
```

## Seguridad implementada

- El CRUD usa la sesión real del usuario; no elude RLS.
- El supervisor solo puede modificar `estado` y `comentario_supervisor`; el trigger rechaza cambios de metadatos o archivo.
- El bucket `portafolio-documentos` es privado.
- El servidor entrega URLs firmadas solo al solicitarlas y con expiración de 600 segundos.
- Las cargas se preparan en el servidor, van directamente a Storage y se confirman validando extensión, MIME, tamaño y firma binaria.
- Formatos aceptados: PDF, HTML, PNG, JPG/JPEG, WebP, GIF, AVIF, BMP, TIFF, ICO, MP4 y WebM. SVG y ejecutables se rechazan.
- Límite: 20 MB para documentos/imágenes y 50 MB para video.
- HTML se muestra aislado y exige confirmación antes de descargar.
- Eliminación normal mueve a papelera; el borrado físico solo ocurre al eliminar definitivamente.
- Las respuestas privadas usan `Cache-Control: private, no-store`.
- Se aplican CSP, HSTS en producción, anti-iframe, `nosniff`, política de referidos y permisos restringidos.
- No existe registro público en la interfaz. Mantén **Allow new users to sign up** desactivado en Supabase.

## Despliegue en Vercel

1. Sube los cambios a GitHub e importa el repositorio en Vercel.
2. En **Settings > Environment Variables**, agrega las dos variables públicas de Supabase. Agrega la service role solo si una tarea de servidor realmente la necesita.
3. No agregues `ALLOW_REMOTE_TESTS` ni credenciales de pruebas en Vercel.
4. En Supabase configura:
   - Site URL: `https://pd-marcos.vercel.app`
   - Redirect URL: `https://pd-marcos.vercel.app/auth/callback`
   - Redirect URL: `https://pd-marcos.vercel.app/reset-password`
   - Desarrollo: `http://localhost:3000/reset-password`
5. Confirma que el bucket sea privado y el registro público continúe desactivado.
6. Despliega después de ejecutar `npm run quality`.

## Flujo de uso

- El docente crea o selecciona el año lectivo, abre una subsección y sube la evidencia.
- Al reemplazar un archivo, la versión anterior queda registrada en el historial.
- El supervisor usa la búsqueda o la bandeja de pendientes, visualiza el archivo y guarda estado/comentario.
- El dashboard identifica la siguiente subsección sin evidencia.
- La papelera permite restaurar o eliminar definitivamente.
- **Exportar ZIP** genera un respaldo del año seleccionado.

## Calidad y pruebas

```powershell
npm run test:unit
npm run typecheck
npm run lint
npm run build
npm run quality
```

`npm run quality` ejecuta todo el control local. `.github/workflows/quality.yml` repite el mismo control en cada push y pull request a `main`.

Las pruebas remotas crean datos temporales y están bloqueadas por defecto. Úsalas únicamente en un proyecto de staging:

```dotenv
ALLOW_REMOTE_TESTS=true
REMOTE_TEST_TARGET=staging
REMOTE_TEST_PROJECT_REFS=referencia-exacta-del-proyecto-staging
```

- `npm run test:e2e:production`: roles, RLS, Storage y recuperación.
- `npm run test:visual`: capturas responsive.

Contra producción se exige además `REMOTE_TEST_TARGET=production` y `ALLOW_PRODUCTION_REMOTE_TESTS=true`. No guardes esas autorizaciones en Vercel ni en archivos versionados.

## Checklist antes de entregar

- [ ] Docente: subir un PDF, una imagen, un HTML y, si aplica, un video.
- [ ] Confirmar registro en `public.documentos` y objeto privado en Storage.
- [ ] Supervisor: visualizar, descargar, revisar y comentar.
- [ ] Verificar que un cambio directo de `titulo` como supervisor sea rechazado.
- [ ] Reemplazar un archivo y comprobar la versión anterior en Historial.
- [ ] Mover a papelera, restaurar y probar borrado definitivo con un archivo de prueba.
- [ ] Probar recuperación de contraseña de principio a fin.
- [ ] Cerrar sesión y confirmar la redirección de `/portafolio` a `/login`.
- [ ] Probar a 390 × 844 px, tablet y escritorio.
- [ ] Descargar el ZIP del año y abrir el índice CSV.
- [ ] Ejecutar `npm run quality`.

## Operación y respaldos

- Guarda claves y contraseñas en un gestor, nunca en archivos de texto del proyecto.
- Exporta periódicamente PostgreSQL y conserva una copia de Storage.
- Restaura una copia en staging al menos una vez para comprobar el respaldo.
- Revisa que Signup público siga desactivado y el bucket continúe privado.
