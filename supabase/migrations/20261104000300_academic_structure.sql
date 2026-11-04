
-- ============================================================
-- 20261104000300_academic_structure.sql
-- Estructura académica vigente por institución.
-- No conserva historiales de años escolares anteriores.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. GRADOS
-- ------------------------------------------------------------

create table public.grade_levels (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint grade_levels_name_not_empty
    check (length(trim(name)) > 0),

  constraint grade_levels_institution_id_unique
    unique (institution_id, id),

  constraint grade_levels_name_unique
    unique (institution_id, name)
);

-- ------------------------------------------------------------
-- 2. SECCIONES
-- ------------------------------------------------------------

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  grade_level_id uuid not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint sections_name_not_empty
    check (length(trim(name)) > 0),

  constraint sections_institution_id_unique
    unique (institution_id, id),

  constraint sections_grade_reference_unique
    unique (institution_id, id, grade_level_id),

  constraint sections_grade_fk
    foreign key (institution_id, grade_level_id)
    references public.grade_levels(institution_id, id),

  constraint sections_name_unique
    unique (institution_id, grade_level_id, name)
);

-- ------------------------------------------------------------
-- 3. DOCENTES
-- ------------------------------------------------------------

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  employee_code text not null,
  first_names text not null,
  last_names text not null,
  document_number text,
  email text,
  phone text,
  auth_user_id uuid references auth.users(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint teachers_names_not_empty
    check (
      length(trim(first_names)) > 0
      and length(trim(last_names)) > 0
    ),
    
  constraint teachers_employee_code_not_empty
    check (length(trim(employee_code)) > 0),
  constraint teachers_institution_id_unique
    unique (institution_id, id),

  constraint teachers_employee_code_unique
    unique (institution_id, employee_code),

  constraint teachers_user_unique
    unique (institution_id, auth_user_id)
);

-- ------------------------------------------------------------
-- 4. ESTUDIANTES
-- ------------------------------------------------------------

create table public.students (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  enrollment_code text not null,
  first_names text not null,
  last_names text not null,
  document_number text,
  grade_level_id uuid not null,
  section_id uuid not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint students_names_not_empty
    check (
      length(trim(first_names)) > 0
      and length(trim(last_names)) > 0
    ),
    constraint students_enrollment_code_not_empty
  check (length(trim(enrollment_code)) > 0),
  constraint students_institution_id_unique
    unique (institution_id, id),

  constraint students_enrollment_code_unique
    unique (institution_id, enrollment_code),

  constraint students_grade_fk
    foreign key (institution_id, grade_level_id)
    references public.grade_levels(institution_id, id),

  constraint students_section_grade_fk
    foreign key (institution_id, section_id, grade_level_id)
    references public.sections(institution_id, id, grade_level_id)
);

-- ------------------------------------------------------------
-- 5. RELACIÓN ESTUDIANTE - APODERADO
-- El apoderado utiliza su cuenta de autenticación.
-- No duplicamos sus datos personales en otra tabla.
-- ------------------------------------------------------------

create table public.student_guardians (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  student_id uuid not null,
  guardian_user_id uuid not null references auth.users(id) on delete cascade,
  relationship text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),

  constraint student_guardians_student_fk
    foreign key (institution_id, student_id)
    references public.students(institution_id, id)
    on delete cascade,

  constraint student_guardians_unique
    unique (institution_id, student_id, guardian_user_id)
);

-- ------------------------------------------------------------
-- 6. HORARIOS
-- ------------------------------------------------------------

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  section_id uuid not null,
  teacher_id uuid not null,
  subject_name text not null,
  weekday smallint not null,
  start_time time not null,
  end_time time not null,
  classroom text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint schedules_weekday_valid
    check (weekday between 1 and 7),

  constraint schedules_time_valid
    check (end_time > start_time),

  constraint schedules_subject_not_empty
    check (length(trim(subject_name)) > 0),

  constraint schedules_section_fk
    foreign key (institution_id, section_id)
    references public.sections(institution_id, id),

  constraint schedules_teacher_fk
    foreign key (institution_id, teacher_id)
    references public.teachers(institution_id, id)
);

-- ------------------------------------------------------------
-- 7. ÍNDICES
-- ------------------------------------------------------------

create index students_institution_grade_section_idx
  on public.students(institution_id, grade_level_id, section_id)
  where is_active = true;

create index students_name_idx
  on public.students(institution_id, last_names, first_names);

create index teachers_institution_active_idx
  on public.teachers(institution_id)
  where is_active = true;

create index student_guardians_guardian_idx
  on public.student_guardians(guardian_user_id);

create index schedules_section_weekday_idx
  on public.schedules(institution_id, section_id, weekday)
  where is_active = true;

create index schedules_teacher_idx
  on public.schedules(institution_id, teacher_id)
  where is_active = true;

-- ------------------------------------------------------------
-- 8. ACTUALIZACIÓN AUTOMÁTICA DE updated_at
-- Reutiliza la función existente.
-- ------------------------------------------------------------

create trigger grade_levels_set_updated_at
before update on public.grade_levels
for each row execute function public.set_updated_at();

create trigger sections_set_updated_at
before update on public.sections
for each row execute function public.set_updated_at();

create trigger teachers_set_updated_at
before update on public.teachers
for each row execute function public.set_updated_at();

create trigger students_set_updated_at
before update on public.students
for each row execute function public.set_updated_at();

create trigger schedules_set_updated_at
before update on public.schedules
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 9. ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table public.grade_levels enable row level security;
alter table public.sections enable row level security;
alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.student_guardians enable row level security;
alter table public.schedules enable row level security;

-- GRADOS Y SECCIONES

create policy grade_levels_select_members
on public.grade_levels
for select to authenticated
using (
  public.is_platform_admin()
  or public.is_active_institution_member(institution_id)
);

create policy grade_levels_manage_admin
on public.grade_levels
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

create policy sections_select_members
on public.sections
for select to authenticated
using (
  public.is_platform_admin()
  or public.is_active_institution_member(institution_id)
);

create policy sections_manage_admin
on public.sections
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

-- DOCENTES

create policy teachers_select_authorized
on public.teachers
for select to authenticated
using (
  public.is_platform_admin()
  or public.has_institution_role(
    institution_id,
    array['administration']::public.membership_role[]
  )
or (
  auth_user_id = (select auth.uid())
  and public.has_institution_role(
    institution_id,
    array['teacher']::public.membership_role[]
    )
  )
);

create policy teachers_manage_admin
on public.teachers
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

-- ESTUDIANTES

create policy students_select_authorized
on public.students
for select to authenticated
using (
  public.is_platform_admin()
  or public.has_institution_role(
    institution_id,
    array['administration']::public.membership_role[]
  )
  or exists (
    select 1
    from public.student_guardians sg
    where sg.institution_id = students.institution_id
      and sg.student_id = students.id
      and sg.guardian_user_id = (select auth.uid())
  )
);

create policy students_manage_admin
on public.students
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

-- APODERADOS

create policy student_guardians_select_authorized
on public.student_guardians
for select to authenticated
using (
  public.is_platform_admin()
  or public.has_institution_role(
    institution_id,
    array['administration']::public.membership_role[]
  )
  or (
    guardian_user_id = (select auth.uid())
    and public.has_institution_role(
      institution_id,
      array['guardian']::public.membership_role[]
    )
  )
);

create policy student_guardians_manage_admin
on public.student_guardians
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

-- HORARIOS

create policy schedules_select_authorized
on public.schedules
for select to authenticated
using (
  public.is_platform_admin()
  or public.has_institution_role(
    institution_id,
    array['administration']::public.membership_role[]
  )
  or exists (
    select 1
    from public.teachers t
    where t.institution_id = schedules.institution_id
      and t.id = schedules.teacher_id
      and t.auth_user_id = (select auth.uid())
      and t.is_active = true
  )
  or exists (
    select 1
    from public.students s
    join public.student_guardians sg
      on sg.institution_id = s.institution_id
      and sg.student_id = s.id
    where s.institution_id = schedules.institution_id
      and s.section_id = schedules.section_id
      and s.is_active = true
      and sg.guardian_user_id = (select auth.uid())
  )
);

create policy schedules_manage_admin
on public.schedules
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

-- ------------------------------------------------------------
-- 10. PRIVILEGIOS
-- Las políticas RLS determinan qué filas puede operar cada rol.
-- ------------------------------------------------------------

grant select, insert, update on
  public.grade_levels,
  public.sections,
  public.teachers,
  public.students,
  public.schedules
to authenticated;

grant select, insert, delete on
  public.student_guardians
to authenticated;

commit;
