-- Papelera segura: retención de 30 días, purga reintentable y acceso por rol.
begin;

alter table public.documentos
  add column if not exists eliminado_en timestamptz default null,
  add column if not exists eliminado_por uuid references auth.users(id) on delete set null,
  add column if not exists purga_iniciada_en timestamptz default null,
  add column if not exists purga_error text default null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'documentos_purga_requiere_papelera'
      and conrelid = 'public.documentos'::regclass
  ) then
    alter table public.documentos
      add constraint documentos_purga_requiere_papelera
      check (purga_iniciada_en is null or eliminado_en is not null);
  end if;
end;
$$;

create index if not exists documentos_papelera_idx
  on public.documentos(eliminado_en desc)
  where eliminado_en is not null;

create index if not exists documentos_purga_pendiente_idx
  on public.documentos(purga_iniciada_en)
  where purga_iniciada_en is not null;

drop policy if exists "documentos visibles a usuarios autenticados"
  on public.documentos;
create policy "documentos visibles a usuarios autenticados"
  on public.documentos for select to authenticated
  using (
    (select public.es_docente())
    or ((select public.es_supervisor()) and eliminado_en is null)
  );

drop policy if exists "docente inserta documentos" on public.documentos;
create policy "docente inserta documentos"
  on public.documentos for insert to authenticated
  with check (
    (select public.es_docente())
    and subido_por = (select auth.uid())
    and eliminado_en is null
    and eliminado_por is null
    and purga_iniciada_en is null
    and purga_error is null
  );

drop policy if exists "supervisor revisa documentos" on public.documentos;
create policy "supervisor revisa documentos"
  on public.documentos for update to authenticated
  using ((select public.es_supervisor()) and eliminado_en is null)
  with check ((select public.es_supervisor()) and eliminado_en is null);

drop policy if exists "docente elimina documentos" on public.documentos;
create policy "docente elimina documentos"
  on public.documentos for delete to authenticated
  using ((select public.es_docente()) and eliminado_en is not null);

create or replace function public.check_supervisor_update_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select public.es_supervisor()) then
    if (to_jsonb(new) - array['estado', 'comentario_supervisor']::text[])
       is distinct from
       (to_jsonb(old) - array['estado', 'comentario_supervisor']::text[]) then
      raise exception 'El supervisor solo puede modificar estado y comentario_supervisor'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_supervisor_update on public.documentos;
create trigger trg_check_supervisor_update
  before update on public.documentos
  for each row execute function public.check_supervisor_update_columns();

revoke all on function public.check_supervisor_update_columns() from public, anon, authenticated;

create or replace function public.normalizar_papelera_documento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.eliminado_en is null and new.eliminado_en is not null then
    new.eliminado_en := now();
    new.eliminado_por := (select auth.uid());
    new.purga_iniciada_en := null;
    new.purga_error := null;
  elsif old.eliminado_en is not null and new.eliminado_en is null then
    if old.purga_iniciada_en is not null then
      raise exception 'No se puede restaurar un documento cuya purga está en proceso'
        using errcode = '55000';
    end if;
    new.eliminado_por := null;
    new.purga_error := null;
  elsif old.eliminado_en is not null then
    new.eliminado_en := old.eliminado_en;
    new.eliminado_por := old.eliminado_por;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_normalizar_papelera_documento on public.documentos;
create trigger trg_normalizar_papelera_documento
  before update on public.documentos
  for each row execute function public.normalizar_papelera_documento();

revoke all on function public.normalizar_papelera_documento() from public, anon, authenticated;

create or replace function public.puede_ver_documento(p_documento_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select public.es_docente())
    or (
      (select public.es_supervisor())
      and exists (
        select 1 from public.documentos d
        where d.id = p_documento_id
          and d.eliminado_en is null
      )
    );
$$;

revoke all on function public.puede_ver_documento(uuid) from public, anon;
grant execute on function public.puede_ver_documento(uuid) to authenticated;

drop policy if exists "revisiones visibles a usuarios autenticados"
  on public.documento_revisiones;
create policy "revisiones visibles a usuarios autenticados"
  on public.documento_revisiones for select to authenticated
  using (public.puede_ver_documento(documento_id));

drop policy if exists "versiones visibles a usuarios autenticados"
  on public.documento_versiones;
create policy "versiones visibles a usuarios autenticados"
  on public.documento_versiones for select to authenticated
  using (public.puede_ver_documento(documento_id));

create or replace function public.puede_leer_archivo_portafolio(p_ruta text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select public.es_docente())
    or (
      (select public.es_supervisor())
      and (
        exists (
          select 1 from public.documentos d
          where d.archivo_url = p_ruta
            and d.eliminado_en is null
        )
        or exists (
          select 1
          from public.documento_versiones v
          join public.documentos d on d.id = v.documento_id
          where v.archivo_url = p_ruta
            and d.eliminado_en is null
        )
      )
    );
$$;

revoke all on function public.puede_leer_archivo_portafolio(text) from public, anon;
grant execute on function public.puede_leer_archivo_portafolio(text) to authenticated;

drop policy if exists "usuarios autenticados leen pdf" on storage.objects;
drop policy if exists "usuarios leen archivos autorizados" on storage.objects;
create policy "usuarios leen archivos autorizados"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'portafolio-documentos'
    and public.puede_leer_archivo_portafolio(name)
  );

commit;
