
begin;

-- ============================================================
-- CATÁLOGO DE ASIGNATURAS POR INSTITUCIÓN
-- ============================================================

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  name text not null,
  code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint subjects_name_not_empty
    check (length(trim(name)) > 0),

  constraint subjects_code_not_empty
    check (length(trim(code)) > 0),

  constraint subjects_institution_id_unique
    unique (institution_id, id),

  constraint subjects_name_unique
    unique (institution_id, name),

  constraint subjects_code_unique
    unique (institution_id, code)
);

-- ============================================================
-- ÍNDICE
-- ============================================================

create index subjects_institution_active_idx
  on public.subjects(institution_id)
  where is_active = true;

-- ============================================================
-- ACTUALIZACIÓN AUTOMÁTICA DE updated_at
-- ============================================================

create trigger subjects_set_updated_at
before update on public.subjects
for each row execute function public.set_updated_at();

-- ============================================================
-- SEGURIDAD RLS
-- ============================================================

alter table public.subjects enable row level security;

-- Consulta: Superadministrador y miembros activos.

create policy subjects_select_members
on public.subjects
for select to authenticated
using (
  public.is_platform_admin()
  or public.is_active_institution_member(institution_id)
);

-- Gestión: Superadministrador y administrador institucional.

create policy subjects_manage_admin
on public.subjects
for all to authenticated
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

-- ============================================================
-- PRIVILEGIOS
-- ============================================================

grant select, insert, update
on public.subjects
to authenticated;

commit;
