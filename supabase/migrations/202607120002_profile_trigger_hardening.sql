-- Perfil automático seguro para altas creadas desde Supabase Auth/Admin API.
-- Migración versionada: 202607120002.
-- El rol privilegiado solo se acepta desde raw_app_meta_data, que no puede
-- modificar un usuario final. El valor por defecto deliberadamente es supervisor.

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
drop function if exists public.crear_perfil_usuario();

-- Completa perfiles si el trigger se instaló después de crear cuentas.
insert into public.perfiles (id, email, nombre, rol)
select
  id,
  coalesce(email, ''),
  coalesce(
    nullif(raw_user_meta_data ->> 'nombre', ''),
    nullif(raw_app_meta_data ->> 'nombre', ''),
    email,
    'Usuario'
  ),
  case lower(coalesce(raw_app_meta_data ->> 'rol', ''))
    when 'docente' then 'docente'::public.rol_usuario
    when 'supervisor' then 'supervisor'::public.rol_usuario
    else 'supervisor'::public.rol_usuario
  end
from auth.users
on conflict (id) do nothing;
