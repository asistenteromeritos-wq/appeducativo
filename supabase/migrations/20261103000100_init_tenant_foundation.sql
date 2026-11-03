-- 20261103000100_init_tenant_foundation.sql
-- Base multi-institución para Aplicativo Móvil Escolar SaaS.
-- Ejecutar primero en DEV. No usar datos reales de estudiantes en este entorno.

begin;

-- 1. Tipos controlados
create type public.institution_status as enum ('active', 'suspended', 'archived');
create type public.membership_role as enum ('administration', 'teacher', 'guardian');
create type public.membership_status as enum ('active', 'invited', 'suspended');

-- 2. Instituciones (tenant)
create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status public.institution_status not null default 'active',
  timezone text not null default 'America/Lima',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Perfil de usuario: el identificador proviene de Supabase Auth.
create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Membresía y rol dentro de cada institución.
-- Un usuario puede pertenecer a más de un colegio.
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  role public.membership_role not null,
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, user_id)
);

create index memberships_user_status_idx
  on public.memberships (user_id, status);

create index memberships_institution_role_idx
  on public.memberships (institution_id, role, status);

-- 5. Superadministradores de la plataforma: separados de los roles del colegio.
create table public.platform_admins (
  user_id uuid primary key references public.user_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 6. updated_at consistente
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger institutions_set_updated_at
before update on public.institutions
for each row execute function public.set_updated_at();

create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

create trigger memberships_set_updated_at
before update on public.memberships
for each row execute function public.set_updated_at();

-- 7. Crear perfil cuando se registra un usuario en Supabase Auth.
-- No se crea membresía automáticamente: la vinculación con un colegio
-- debe realizarse mediante un flujo autorizado.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (user_id, full_name, phone)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name',
                         new.raw_user_meta_data ->> 'name')), ''),
    nullif(trim(new.phone), '')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- 8. Funciones auxiliares para RLS.
-- SECURITY DEFINER evita recursión al consultar memberships desde sus propias políticas.
-- search_path vacío y nombres cualificados reducen riesgo de sustitución de objetos.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_active_institution_member(p_institution_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.institution_id = p_institution_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create or replace function public.has_institution_role(
  p_institution_id uuid,
  p_roles public.membership_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.institution_id = p_institution_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = any (p_roles)
  );
$$;

create or replace function public.can_view_user_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_id = (select auth.uid())
    or public.is_platform_admin()
    or exists (
      select 1
      from public.memberships actor
      join public.memberships target
        on target.institution_id = actor.institution_id
      where actor.user_id = (select auth.uid())
        and actor.status = 'active'
        and actor.role = 'administration'
        and target.user_id = p_user_id
        and target.status = 'active'
    );
$$;

-- 9. Activar RLS
alter table public.institutions enable row level security;
alter table public.user_profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.platform_admins enable row level security;

-- 10. Políticas: instituciones
create policy institutions_select_member_or_platform
on public.institutions
for select
to authenticated
using (
  public.is_platform_admin()
  or public.is_active_institution_member(id)
);

create policy institutions_insert_platform_only
on public.institutions
for insert
to authenticated
with check (public.is_platform_admin());

create policy institutions_update_platform_or_admin
on public.institutions
for update
to authenticated
using (
  public.is_platform_admin()
  or public.has_institution_role(id, array['administration']::public.membership_role[])
)
with check (
  public.is_platform_admin()
  or public.has_institution_role(id, array['administration']::public.membership_role[])
);

create policy institutions_delete_platform_only
on public.institutions
for delete
to authenticated
using (public.is_platform_admin());

-- 11. Políticas: perfiles
create policy user_profiles_select_authorized
on public.user_profiles
for select
to authenticated
using (public.can_view_user_profile(user_id));

create policy user_profiles_update_self
on public.user_profiles
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- 12. Políticas: membresías
create policy memberships_select_self_admin_or_platform
on public.memberships
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_platform_admin()
  or public.has_institution_role(
    institution_id,
    array['administration']::public.membership_role[]
  )
);

create policy memberships_insert_admin_or_platform
on public.memberships
for insert
to authenticated
with check (
  public.is_platform_admin()
  or public.has_institution_role(
    institution_id,
    array['administration']::public.membership_role[]
  )
);

create policy memberships_update_admin_or_platform
on public.memberships
for update
to authenticated
using (
  public.is_platform_admin()
  or public.has_institution_role(
    institution_id,
    array['administration']::public.membership_role[]
  )
)
with check (
  public.is_platform_admin()
  or public.has_institution_role(
    institution_id,
    array['administration']::public.membership_role[]
  )
);

create policy memberships_delete_admin_or_platform
on public.memberships
for delete
to authenticated
using (
  public.is_platform_admin()
  or public.has_institution_role(
    institution_id,
    array['administration']::public.membership_role[]
  )
);

-- 13. Los registros de superadministrador no son legibles ni modificables
-- directamente por clientes autenticados. Se gestionan desde un proceso seguro.
create policy platform_admins_select_self
on public.platform_admins
for select
to authenticated
using (user_id = (select auth.uid()));

-- 14. Privilegios mínimos para el cliente autenticado.
grant usage on type
  public.institution_status,
  public.membership_role,
  public.membership_status
to authenticated;

grant select, insert, update, delete on
  public.institutions,
  public.memberships
to authenticated;

grant select, update on public.user_profiles to authenticated;
grant select on public.platform_admins to authenticated;

-- Funciones invocadas por políticas.
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_active_institution_member(uuid) to authenticated;
grant execute on function public.has_institution_role(uuid, public.membership_role[]) to authenticated;
grant execute on function public.can_view_user_profile(uuid) to authenticated;

commit;

-- NOTAS OPERATIVAS:
-- 1. El primer usuario superadministrador debe insertarse mediante SQL Editor
--    o un proceso administrativo confiable, nunca desde la app pública.
-- 2. No habilitar acceso anónimo a estas tablas.
-- 3. La creación de una institución y su primer usuario Administración debe
--    hacerse en una operación backend protegida.
-- 4. La tabla platform_admins no tiene políticas de escritura para clientes.
-- 5. Antes de producción, agregar pruebas automatizadas de aislamiento RLS
--    con dos instituciones y usuarios de roles diferentes.
