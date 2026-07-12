# Verificación remota de Supabase

Fecha: 2026-07-12

Proyecto verificado: `zywbjmpknzxtvxmabyre`  
Session pooler: `aws-1-us-west-2.pooler.supabase.com:5432`

## Confirmado en la base remota

- `public.documentos` existe con las 10 columnas esperadas.
- `public.perfiles`, `public.es_docente()` y `public.es_supervisor()` existen.
- `on_auth_user_created` crea perfiles y `on_auth_user_updated` sincroniza el rol desde `app_metadata` administrativa; por defecto asigna `supervisor`.
- Las cinco políticas RLS de `documentos` están instaladas.
- `trg_check_supervisor_update` ejecuta `check_supervisor_update_columns`.
- El bucket privado `portafolio-documentos` existe, acepta solo `application/pdf` y limita archivos a 4 MB.
- Las cuatro políticas de `storage.objects` para lectura, subida, reemplazo y eliminación están instaladas.
- La configuración pública de Auth reportó `disable_signup=false`; debe desactivarse en Authentication antes de producción.

## End-to-end real aprobado

Se crearon dos usuarios temporales (`docente` y `supervisor`) y se verificó:

- Login con contraseña para ambos roles.
- Creación automática de perfiles y asignación del rol docente.
- Subida de PDF por docente, registro en `documentos` y URL firmada.
- Nombre de objeto `slug-del-titulo_xxxxxx.pdf`; visor y descarga usan URLs firmadas privadas.
- Lectura, cambio de estado y comentario por supervisor.
- Bloqueo RLS de subida y eliminación para supervisor.
- Bloqueo del trigger al intentar modificar `titulo` como supervisor.
- Lectura por docente del estado/comentario persistidos.
- Enlace real de recuperación redirige a `/reset-password`, permite actualizar la contraseña y volver a iniciar sesión.
- Cierre de ambas sesiones.

El comando reproducible es `npm run test:e2e:production`; también se ejecutó `npm run test:visual` para login, dashboard supervisor, revisión móvil y recuperación.

## Estado final después de la limpieza

- Usuarios de Supabase Auth: `0`.
- Perfiles: `0`.
- Documentos: `0`.

Las cuentas, el registro y los objetos usados para E2E fueron eliminados automáticamente. Las API keys reales están configuradas únicamente en `.env.local`, que permanece ignorado por Git.
