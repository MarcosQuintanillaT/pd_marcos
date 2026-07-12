-- Migración idempotente para proyectos donde tablas/RLS ya existen.
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
