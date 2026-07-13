-- Portafolio Docente Digital v2
-- Migración versionada: 202607130001.
-- Códigos estables, periodos académicos, trazabilidad, versiones y papelera.

do $$ begin
  create type public.estado_portafolio as enum ('Activo', 'Archivado');
exception when duplicate_object then null;
end $$;

create table if not exists public.portafolios (
  id uuid primary key default gen_random_uuid(),
  docente_id uuid not null references auth.users(id) on delete cascade,
  anio_lectivo smallint not null check (anio_lectivo between 2000 and 2100),
  area text not null default 'Informática' check (char_length(area) between 2 and 120),
  jornada text not null default 'Matutina' check (char_length(jornada) between 2 and 80),
  institucion text check (institucion is null or char_length(institucion) <= 180),
  estado public.estado_portafolio not null default 'Activo',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  cerrado_en timestamptz,
  unique (docente_id, anio_lectivo)
);

create unique index if not exists portafolios_un_activo_por_docente_idx
  on public.portafolios(docente_id)
  where estado = 'Activo';

alter table public.documentos
  add column if not exists portafolio_id uuid references public.portafolios(id) on delete restrict,
  add column if not exists seccion_codigo text,
  add column if not exists subseccion_codigo text,
  add column if not exists actualizado_en timestamptz not null default now(),
  add column if not exists eliminado_en timestamptz,
  add column if not exists eliminado_por uuid references auth.users(id) on delete set null,
  add column if not exists mime_type text,
  add column if not exists tamano_bytes bigint check (tamano_bytes is null or tamano_bytes > 0),
  add column if not exists nombre_original text,
  add column if not exists version_actual integer not null default 1 check (version_actual > 0),
  add column if not exists revisado_por uuid references auth.users(id) on delete set null,
  add column if not exists revisado_en timestamptz;

insert into public.portafolios (docente_id, anio_lectivo, area, jornada)
select id, 2026, 'Informática', 'Matutina'
from public.perfiles
where rol = 'docente'
on conflict (docente_id, anio_lectivo) do nothing;

update public.documentos d
set
  seccion_codigo = coalesce(d.seccion_codigo, substring(d.seccion from '^([0-9]+)\.')),
  subseccion_codigo = coalesce(d.subseccion_codigo, substring(d.subseccion from '^([0-9]+(\.[0-9]+){1,2})\.'))
where d.seccion_codigo is null or d.subseccion_codigo is null;

update public.documentos d
set portafolio_id = p.id
from public.portafolios p
where d.portafolio_id is null
  and p.docente_id = d.subido_por
  and p.anio_lectivo = 2026;

update public.documentos
set portafolio_id = (select id from public.portafolios order by anio_lectivo desc, creado_en limit 1)
where portafolio_id is null
  and exists (select 1 from public.portafolios);

create index if not exists documentos_codigos_idx
  on public.documentos(portafolio_id, seccion_codigo, subseccion_codigo)
  where eliminado_en is null;
create index if not exists documentos_busqueda_idx
  on public.documentos(portafolio_id, fecha_subida desc)
  where eliminado_en is null;
create index if not exists documentos_papelera_idx
  on public.documentos(eliminado_en desc)
  where eliminado_en is not null;

create table if not exists public.documento_revisiones (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references public.documentos(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete restrict,
  rol_actor public.rol_usuario not null,
  estado_anterior public.estado_documento not null,
  estado_nuevo public.estado_documento not null,
  comentario_anterior text,
  comentario_nuevo text,
  creado_en timestamptz not null default now()
);

create index if not exists documento_revisiones_documento_idx
  on public.documento_revisiones(documento_id, creado_en desc);

create table if not exists public.documento_versiones (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references public.documentos(id) on delete cascade,
  numero_version integer not null check (numero_version > 0),
  archivo_url text not null,
  titulo text not null,
  mime_type text,
  tamano_bytes bigint,
  nombre_original text,
  creado_por uuid not null references auth.users(id) on delete restrict,
  creado_en timestamptz not null default now(),
  unique (documento_id, numero_version)
);

create index if not exists documento_versiones_documento_idx
  on public.documento_versiones(documento_id, numero_version desc);

create or replace function public.registrar_revision_documento()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_rol public.rol_usuario;
begin
  if new.estado is distinct from old.estado
     or new.comentario_supervisor is distinct from old.comentario_supervisor then
    select rol into actor_rol from public.perfiles where id = actor;
    if actor is not null and actor_rol is not null then
      insert into public.documento_revisiones (
        documento_id, actor_id, rol_actor, estado_anterior, estado_nuevo,
        comentario_anterior, comentario_nuevo
      ) values (
        old.id, actor, actor_rol, old.estado, new.estado,
        old.comentario_supervisor, new.comentario_supervisor
      );
      new.revisado_por := actor;
      new.revisado_en := now();
    end if;
  end if;
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists trg_registrar_revision_documento on public.documentos;
create trigger trg_registrar_revision_documento
  before update on public.documentos
  for each row execute function public.registrar_revision_documento();

create or replace function public.registrar_version_documento()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  actor uuid := coalesce((select auth.uid()), old.subido_por);
begin
  if new.archivo_url is distinct from old.archivo_url then
    insert into public.documento_versiones (
      documento_id, numero_version, archivo_url, titulo, mime_type,
      tamano_bytes, nombre_original, creado_por, creado_en
    ) values (
      old.id, old.version_actual, old.archivo_url, old.titulo, old.mime_type,
      old.tamano_bytes, old.nombre_original, actor, old.actualizado_en
    ) on conflict (documento_id, numero_version) do nothing;
    new.version_actual := old.version_actual + 1;
    new.actualizado_en := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_registrar_version_documento on public.documentos;
create trigger trg_registrar_version_documento
  before update of archivo_url on public.documentos
  for each row execute function public.registrar_version_documento();

create or replace function public.actualizar_portafolio_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  if new.estado = 'Archivado' and old.estado is distinct from new.estado then
    new.cerrado_en := coalesce(new.cerrado_en, now());
  elsif new.estado = 'Activo' then
    new.cerrado_en := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_actualizar_portafolio_timestamp on public.portafolios;
create trigger trg_actualizar_portafolio_timestamp
  before update on public.portafolios
  for each row execute function public.actualizar_portafolio_timestamp();

-- El supervisor continúa limitado a estado y comentario. Las columnas nuevas
-- quedan protegidas por el mismo control de nivel de columna.
create or replace function public.check_supervisor_update_columns()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if (select public.es_supervisor()) then
    if new.id is distinct from old.id
      or new.titulo is distinct from old.titulo
      or new.archivo_url is distinct from old.archivo_url
      or new.seccion is distinct from old.seccion
      or new.subseccion is distinct from old.subseccion
      or new.seccion_codigo is distinct from old.seccion_codigo
      or new.subseccion_codigo is distinct from old.subseccion_codigo
      or new.portafolio_id is distinct from old.portafolio_id
      or new.parcial is distinct from old.parcial
      or new.subido_por is distinct from old.subido_por
      or new.fecha_subida is distinct from old.fecha_subida
      or new.actualizado_en is distinct from old.actualizado_en
      or new.eliminado_en is distinct from old.eliminado_en
      or new.eliminado_por is distinct from old.eliminado_por
      or new.mime_type is distinct from old.mime_type
      or new.tamano_bytes is distinct from old.tamano_bytes
      or new.nombre_original is distinct from old.nombre_original
      or new.version_actual is distinct from old.version_actual
      or new.revisado_por is distinct from old.revisado_por
      or new.revisado_en is distinct from old.revisado_en then
      raise exception 'El supervisor solo puede modificar estado y comentario_supervisor'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

alter table public.portafolios enable row level security;
alter table public.documento_revisiones enable row level security;
alter table public.documento_versiones enable row level security;

drop policy if exists "portafolios visibles a usuarios autenticados" on public.portafolios;
create policy "portafolios visibles a usuarios autenticados"
  on public.portafolios for select to authenticated using (true);

drop policy if exists "docente crea portafolios propios" on public.portafolios;
create policy "docente crea portafolios propios"
  on public.portafolios for insert to authenticated
  with check (public.es_docente() and docente_id = (select auth.uid()));

drop policy if exists "docente actualiza portafolios propios" on public.portafolios;
create policy "docente actualiza portafolios propios"
  on public.portafolios for update to authenticated
  using (public.es_docente() and docente_id = (select auth.uid()))
  with check (public.es_docente() and docente_id = (select auth.uid()));

drop policy if exists "revisiones visibles a usuarios autenticados" on public.documento_revisiones;
create policy "revisiones visibles a usuarios autenticados"
  on public.documento_revisiones for select to authenticated using (true);

drop policy if exists "versiones visibles a usuarios autenticados" on public.documento_versiones;
create policy "versiones visibles a usuarios autenticados"
  on public.documento_versiones for select to authenticated using (true);

drop policy if exists "documentos visibles a usuarios autenticados" on public.documentos;
create policy "documentos visibles a usuarios autenticados"
  on public.documentos for select to authenticated
  using (eliminado_en is null or public.es_docente());

revoke all on table public.portafolios from anon;
revoke all on table public.documento_revisiones from anon, authenticated;
revoke all on table public.documento_versiones from anon, authenticated;
grant select, insert, update on table public.portafolios to authenticated;
grant select on table public.documento_revisiones to authenticated;
grant select on table public.documento_versiones to authenticated;

-- La carga directa a Storage evita el límite multipart de Vercel y permite
-- videos cortos. El servidor confirma firma, tipo y tamaño antes de registrar.
update storage.buckets
set public = false,
    file_size_limit = 52428800,
    allowed_mime_types = array[
      'application/pdf', 'text/html',
      'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif',
      'image/bmp', 'image/tiff', 'image/vnd.microsoft.icon',
      'video/mp4', 'video/webm'
    ]
where id = 'portafolio-documentos';
