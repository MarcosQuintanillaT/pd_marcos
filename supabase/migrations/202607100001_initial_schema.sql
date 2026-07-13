-- Portafolio Docente Digital
-- Migración base versionada: 202607100001.
-- Ejecutar una vez desde Supabase > SQL Editor.

create extension if not exists pgcrypto;

do $$ begin
  create type public.rol_usuario as enum ('docente', 'supervisor');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.estado_documento as enum ('Pendiente', 'Revisado', 'Aprobado');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.parcial_academico as enum ('I', 'II', 'III', 'IV');
exception when duplicate_object then null;
end $$;

create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nombre text,
  rol public.rol_usuario not null default 'supervisor',
  creado_en timestamptz not null default now()
);

create table if not exists public.documentos (
  id uuid primary key default gen_random_uuid(),
  seccion text not null check (char_length(seccion) between 3 and 120),
  subseccion text not null check (char_length(subseccion) between 3 and 220),
  parcial public.parcial_academico,
  titulo text not null check (char_length(titulo) between 1 and 160),
  -- Guarda la ruta dentro del bucket privado, no una URL pública permanente.
  archivo_url text not null unique,
  estado public.estado_documento not null default 'Pendiente',
  subido_por uuid not null references auth.users(id) on delete restrict,
  fecha_subida timestamptz not null default now(),
  comentario_supervisor text check (comentario_supervisor is null or char_length(comentario_supervisor) <= 2000)
);

create index if not exists documentos_seccion_idx on public.documentos(seccion, subseccion);
create index if not exists documentos_parcial_idx on public.documentos(parcial) where parcial is not null;
create index if not exists documentos_estado_idx on public.documentos(estado);
create index if not exists documentos_fecha_idx on public.documentos(fecha_subida desc);

-- Cada alta de Supabase Auth obtiene un perfil. El rol solo puede venir de
-- app_metadata (controlada por service_role/administrador), nunca de metadata
-- editable por el propio usuario. Sin rol confiable se aplica supervisor.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.perfiles as profile (id, email, nombre, rol)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'nombre', ''),
      nullif(new.raw_app_meta_data ->> 'nombre', ''),
      new.email,
      'Usuario'
    ),
    case lower(coalesce(new.raw_app_meta_data ->> 'rol', ''))
      when 'docente' then 'docente'::public.rol_usuario
      when 'supervisor' then 'supervisor'::public.rol_usuario
      else 'supervisor'::public.rol_usuario
    end
  )
  on conflict (id) do update set
    email = excluded.email,
    nombre = excluded.nombre,
    rol = case lower(coalesce(new.raw_app_meta_data ->> 'rol', ''))
      when 'docente' then 'docente'::public.rol_usuario
      when 'supervisor' then 'supervisor'::public.rol_usuario
      else profile.rol
    end;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email, raw_user_meta_data, raw_app_meta_data on auth.users
  for each row
  when (
    old.email is distinct from new.email
    or old.raw_user_meta_data is distinct from new.raw_user_meta_data
    or old.raw_app_meta_data is distinct from new.raw_app_meta_data
  )
  execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Crea perfiles faltantes si el SQL se instala después de crear usuarios.
insert into public.perfiles (id, email, nombre, rol)
select id, coalesce(email, ''), nullif(raw_user_meta_data ->> 'nombre', ''), 'supervisor'
from auth.users
on conflict (id) do nothing;

create or replace function public.es_docente()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and rol = 'docente'
  );
$$;

create or replace function public.es_supervisor()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and rol = 'supervisor'
  );
$$;

revoke all on function public.es_docente() from public;
revoke all on function public.es_supervisor() from public;
grant execute on function public.es_docente() to authenticated;
grant execute on function public.es_supervisor() to authenticated;

alter table public.perfiles enable row level security;
alter table public.documentos enable row level security;

drop policy if exists "perfil propio visible" on public.perfiles;
create policy "perfil propio visible"
  on public.perfiles for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "documentos visibles a usuarios autenticados" on public.documentos;
create policy "documentos visibles a usuarios autenticados"
  on public.documentos for select to authenticated
  using (true);

drop policy if exists "docente inserta documentos" on public.documentos;
create policy "docente inserta documentos"
  on public.documentos for insert to authenticated
  with check (public.es_docente() and subido_por = (select auth.uid()));

drop policy if exists "docente actualiza documentos" on public.documentos;
create policy "docente actualiza documentos"
  on public.documentos for update to authenticated
  using (public.es_docente())
  with check (public.es_docente());

drop policy if exists "supervisor revisa documentos" on public.documentos;
create policy "supervisor revisa documentos"
  on public.documentos for update to authenticated
  using (public.es_supervisor())
  with check (public.es_supervisor());

drop policy if exists "docente elimina documentos" on public.documentos;
create policy "docente elimina documentos"
  on public.documentos for delete to authenticated
  using (public.es_docente());

-- RLS decide qué filas puede actualizar el supervisor. Este trigger decide
-- qué columnas: únicamente estado y comentario_supervisor. Es necesario porque
-- una política RLS no distingue columnas dentro de la misma fila.
drop trigger if exists limitar_columnas_supervisor on public.documentos;
drop trigger if exists trg_check_supervisor_update on public.documentos;
drop function if exists public.proteger_actualizacion_supervisor();

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
      or new.parcial is distinct from old.parcial
      or new.subido_por is distinct from old.subido_por
      or new.fecha_subida is distinct from old.fecha_subida then
      raise exception 'El supervisor solo puede modificar estado y comentario_supervisor'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_check_supervisor_update
  before update on public.documentos
  for each row execute function public.check_supervisor_update_columns();

revoke all on table public.perfiles from anon;
revoke all on table public.documentos from anon;
grant select on table public.perfiles to authenticated;
grant select, insert, update, delete on table public.documentos to authenticated;

-- Bucket privado, máximo 4 MB para PDF, HTML e imágenes. El margen evita exceder
-- el límite de payload de 4.5 MB de Vercel Functions al usar multipart.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
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

drop policy if exists "usuarios autenticados leen pdf" on storage.objects;
create policy "usuarios autenticados leen pdf"
  on storage.objects for select to authenticated
  using (bucket_id = 'portafolio-documentos');

drop policy if exists "docente sube pdf" on storage.objects;
create policy "docente sube pdf"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'portafolio-documentos' and public.es_docente());

drop policy if exists "docente reemplaza pdf" on storage.objects;
create policy "docente reemplaza pdf"
  on storage.objects for update to authenticated
  using (bucket_id = 'portafolio-documentos' and public.es_docente())
  with check (bucket_id = 'portafolio-documentos' and public.es_docente());

drop policy if exists "docente elimina pdf" on storage.objects;
create policy "docente elimina pdf"
  on storage.objects for delete to authenticated
  using (bucket_id = 'portafolio-documentos' and public.es_docente());
