-- Mantiene el portafolio privado y amplía los formatos admitidos.
-- Migración versionada: 202607120001.
-- Es idempotente: puede ejecutarse aunque el bucket ya exista.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'portafolio-documentos',
  'portafolio-documentos',
  false,
  4194304,
  array['application/pdf', 'text/html', 'image/*']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
