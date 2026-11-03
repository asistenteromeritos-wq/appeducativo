-- Migration: control de asignación del rol administration
-- Fecha: 2026-11-03
-- Requiere la migración 20261103000100_init_tenant_foundation.sql.
-- Aplicar primero en el proyecto Supabase de pruebas. No ejecutar en producción real.
--
-- Reglas:
--   * Administración puede solicitar un nuevo usuario administration.
--   * Solo un superadministrador SaaS puede aprobar/rechazar/revocar.
--   * Administración solo gestiona membresías teacher/guardian.
--   * user_id e institution_id no se pueden modificar por UPDATE autenticado.
--   * Las membresías nunca se eliminan físicamente desde clientes; se suspenden.
--   * El historial de solicitudes y decisiones es de solo lectura para clientes.
--
-- La migración inicial no se modifica.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Tipos y tablas del flujo de autorización
-- ---------------------------------------------------------------------------

CREATE TYPE public.administration_role_request_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

CREATE TYPE public.administration_role_request_action AS ENUM (
  'requested',
  'approved',
  'rejected',
  'revoked'
);

CREATE TABLE public.administration_role_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL
    REFERENCES public.institutions(id) ON DELETE RESTRICT,
  requested_by UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE RESTRICT,
  target_user_id UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  status public.administration_role_request_status NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  membership_id UUID REFERENCES public.memberships(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT administration_role_requests_reason_length
    CHECK (char_length(btrim(reason)) BETWEEN 10 AND 1000),

  CONSTRAINT administration_role_requests_review_note_length
    CHECK (review_note IS NULL OR char_length(review_note) <= 1000),

  CONSTRAINT administration_role_requests_review_state
    CHECK (
      (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
      OR
      (status IN ('approved', 'rejected')
        AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    ),

  CONSTRAINT administration_role_requests_not_self
    CHECK (requested_by <> target_user_id)
);

-- Una solicitud pendiente por institución y usuario objetivo.
CREATE UNIQUE INDEX administration_role_requests_one_pending
  ON public.administration_role_requests (institution_id, target_user_id)
  WHERE status = 'pending';

CREATE INDEX administration_role_requests_institution_status
  ON public.administration_role_requests (institution_id, status, requested_at DESC);

CREATE INDEX administration_role_requests_target
  ON public.administration_role_requests (target_user_id, requested_at DESC);

CREATE TABLE public.administration_role_request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID
    REFERENCES public.administration_role_requests(id) ON DELETE SET NULL,
  institution_id UUID NOT NULL
    REFERENCES public.institutions(id) ON DELETE RESTRICT,
  actor_user_id UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE RESTRICT,
  target_user_id UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE RESTRICT,
  action public.administration_role_request_action NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX administration_role_request_events_institution_created
  ON public.administration_role_request_events (institution_id, created_at DESC);

CREATE INDEX administration_role_request_events_request
  ON public.administration_role_request_events (request_id, created_at DESC);

CREATE TRIGGER set_administration_role_requests_updated_at
  BEFORE UPDATE ON public.administration_role_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.administration_role_requests IS
  'Solicitudes institucionales para asignar el rol administration; solo el superadministrador SaaS puede resolverlas.';

COMMENT ON TABLE public.administration_role_request_events IS
  'Historial append-only de solicitudes, aprobaciones, rechazos y revocaciones del rol administration.';

-- ---------------------------------------------------------------------------
-- 2. RLS: lectura por la institución solicitante y por plataforma
-- ---------------------------------------------------------------------------

ALTER TABLE public.administration_role_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administration_role_request_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY administration_role_requests_select_admin_or_platform
  ON public.administration_role_requests
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_admin()
    OR public.has_institution_role(
      institution_id,
      ARRAY['administration']::public.membership_role[]
    )
  );

CREATE POLICY administration_role_request_events_select_admin_or_platform
  ON public.administration_role_request_events
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_admin()
    OR public.has_institution_role(
      institution_id,
      ARRAY['administration']::public.membership_role[]
    )
  );

-- No se crean políticas INSERT/UPDATE/DELETE para estas tablas:
-- todas las escrituras se realizan por funciones SECURITY DEFINER validadas.

REVOKE ALL ON TABLE public.administration_role_requests FROM anon, authenticated;
REVOKE ALL ON TABLE public.administration_role_request_events FROM anon, authenticated;
GRANT SELECT ON TABLE public.administration_role_requests TO authenticated;
GRANT SELECT ON TABLE public.administration_role_request_events TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Endurecer permisos de instituciones por columna
-- ---------------------------------------------------------------------------

-- Administración solo puede editar nombre y zona horaria.
-- slug y status quedan reservados a operaciones de plataforma.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.institutions FROM anon, authenticated;

GRANT SELECT ON TABLE public.institutions TO authenticated;
GRANT INSERT (name, slug, status, timezone)
  ON TABLE public.institutions TO authenticated;
GRANT UPDATE (name, timezone)
  ON TABLE public.institutions TO authenticated;
GRANT DELETE ON TABLE public.institutions TO authenticated;

-- Las políticas RLS ya existentes siguen determinando quién puede ejecutar
-- INSERT/UPDATE/DELETE. La política UPDATE permite a Administración y
-- superadministración, pero los permisos por columna limitan el alcance
-- de una sesión authenticated. Cambios de status/slug deben hacerse desde
-- un backend confiable con privilegios de plataforma.

-- ---------------------------------------------------------------------------
-- 4. Endurecer membresías: no cambiar institución ni usuario en UPDATE
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS memberships_insert_admin_or_platform
  ON public.memberships;
DROP POLICY IF EXISTS memberships_update_admin_or_platform
  ON public.memberships;
DROP POLICY IF EXISTS memberships_delete_admin_or_platform
  ON public.memberships;

-- No se permite borrar físicamente membresías desde clientes.
-- user_id e institution_id tampoco se pueden modificar por UPDATE.
REVOKE ALL ON TABLE public.memberships FROM anon, authenticated;

GRANT SELECT ON TABLE public.memberships TO authenticated;
GRANT INSERT (institution_id, user_id, role, status)
  ON TABLE public.memberships TO authenticated;
GRANT UPDATE (role, status)
  ON TABLE public.memberships TO authenticated;

CREATE POLICY memberships_insert_admin_or_platform
  ON public.memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    role IN (
      'teacher'::public.membership_role,
      'guardian'::public.membership_role
    )
    AND (
      public.is_platform_admin()
      OR public.has_institution_role(
        institution_id,
        ARRAY['administration']::public.membership_role[]
      )
    )
  );

CREATE POLICY memberships_update_admin_or_platform
  ON public.memberships
  FOR UPDATE
  TO authenticated
  USING (
    role IN (
      'teacher'::public.membership_role,
      'guardian'::public.membership_role
    )
    AND (
      public.is_platform_admin()
      OR public.has_institution_role(
        institution_id,
        ARRAY['administration']::public.membership_role[]
      )
    )
  )
  WITH CHECK (
    role IN (
      'teacher'::public.membership_role,
      'guardian'::public.membership_role
    )
    AND (
      public.is_platform_admin()
      OR public.has_institution_role(
        institution_id,
        ARRAY['administration']::public.membership_role[]
      )
    )
  );

-- No se crea política DELETE: las membresías se conservan y se suspenden.

-- ---------------------------------------------------------------------------
-- 5. Solicitar un nuevo usuario con rol administration
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.request_administration_role(
  p_institution_id UUID,
  p_target_user_id UUID,
  p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor UUID := auth.uid();
  v_request_id UUID;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesión autenticada.'
      USING ERRCODE = '28000';
  END IF;

  IF NOT public.has_institution_role(
    p_institution_id,
    ARRAY['administration']::public.membership_role[]
  ) THEN
    RAISE EXCEPTION 'No tienes permisos para solicitar administradores en esta institución.'
      USING ERRCODE = '42501';
  END IF;

  IF p_target_user_id IS NULL OR p_target_user_id = v_actor THEN
    RAISE EXCEPTION 'El usuario objetivo debe ser otra cuenta válida.';
  END IF;

  IF char_length(btrim(coalesce(p_reason, ''))) NOT BETWEEN 10 AND 1000 THEN
    RAISE EXCEPTION 'La justificación debe contener entre 10 y 1000 caracteres.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.institutions AS i
    WHERE i.id = p_institution_id
      AND i.status = 'active'::public.institution_status
  ) THEN
    RAISE EXCEPTION 'La institución no existe o no está activa.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.users AS u WHERE u.id = p_target_user_id
  ) THEN
    RAISE EXCEPTION 'La cuenta indicada no existe.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.memberships AS m
    WHERE m.institution_id = p_institution_id
      AND m.user_id = p_target_user_id
      AND m.role = 'administration'::public.membership_role
      AND m.status = 'active'::public.membership_status
  ) THEN
    RAISE EXCEPTION 'El usuario ya tiene el rol Administración activo en esta institución.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.memberships AS m
    WHERE m.institution_id = p_institution_id
      AND m.user_id = p_target_user_id
      AND m.role <> 'administration'::public.membership_role
  ) THEN
    RAISE EXCEPTION 'El usuario ya tiene otra membresía en esta institución. No se cambiará su rol automáticamente.';
  END IF;

  BEGIN
    INSERT INTO public.administration_role_requests (
      institution_id,
      requested_by,
      target_user_id,
      reason
    )
    VALUES (
      p_institution_id,
      v_actor,
      p_target_user_id,
      btrim(p_reason)
    )
    RETURNING id INTO v_request_id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Ya existe una solicitud pendiente para este usuario en esta institución.'
        USING ERRCODE = '23505';
  END;

  INSERT INTO public.administration_role_request_events (
    request_id,
    institution_id,
    actor_user_id,
    target_user_id,
    action,
    details
  )
  VALUES (
    v_request_id,
    p_institution_id,
    v_actor,
    p_target_user_id,
    'requested'::public.administration_role_request_action,
    jsonb_build_object('reason', btrim(p_reason))
  );

  RETURN v_request_id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 6. Resolver solicitud: solo superadministrador SaaS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.resolve_administration_role_request(
  p_request_id UUID,
  p_decision TEXT,
  p_review_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor UUID := auth.uid();
  v_request public.administration_role_requests%ROWTYPE;
  v_membership_id UUID;
  v_decision public.administration_role_request_status;
BEGIN
  IF v_actor IS NULL OR NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Solo el superadministrador SaaS puede resolver solicitudes.'
      USING ERRCODE = '42501';
  END IF;

  IF p_decision IS NULL OR p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'La decisión debe ser approved o rejected.';
  END IF;

  IF p_review_note IS NOT NULL AND char_length(p_review_note) > 1000 THEN
    RAISE EXCEPTION 'La nota de revisión no puede superar 1000 caracteres.';
  END IF;

  v_decision := p_decision::public.administration_role_request_status;

  SELECT *
  INTO v_request
  FROM public.administration_role_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La solicitud no existe.';
  END IF;

  IF v_request.status <> 'pending'::public.administration_role_request_status THEN
    RAISE EXCEPTION 'La solicitud ya fue resuelta.';
  END IF;

  IF v_decision = 'approved'::public.administration_role_request_status THEN
    -- Serializa aprobaciones y revocaciones dentro de la misma institución.
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(v_request.institution_id::text, 0)
    );

    IF NOT EXISTS (
      SELECT 1
      FROM public.institutions AS i
      WHERE i.id = v_request.institution_id
        AND i.status = 'active'::public.institution_status
    ) THEN
      RAISE EXCEPTION 'La institución no existe o no está activa.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.memberships AS m
      WHERE m.institution_id = v_request.institution_id
        AND m.user_id = v_request.target_user_id
        AND m.role <> 'administration'::public.membership_role
    ) THEN
      RAISE EXCEPTION 'El usuario ya tiene otra membresía en esta institución. No se cambiará su rol automáticamente.';
    END IF;

    INSERT INTO public.memberships (
      institution_id,
      user_id,
      role,
      status
    )
    VALUES (
      v_request.institution_id,
      v_request.target_user_id,
      'administration'::public.membership_role,
      'active'::public.membership_status
    )
    ON CONFLICT (institution_id, user_id)
    DO UPDATE SET
      role = EXCLUDED.role,
      status = EXCLUDED.status
    RETURNING id INTO v_membership_id;
  END IF;

  UPDATE public.administration_role_requests
  SET
    status = v_decision,
    reviewed_by = v_actor,
    reviewed_at = now(),
    review_note = nullif(btrim(coalesce(p_review_note, '')), ''),
    membership_id = v_membership_id
  WHERE id = p_request_id;

  INSERT INTO public.administration_role_request_events (
    request_id,
    institution_id,
    actor_user_id,
    target_user_id,
    action,
    details
  )
  VALUES (
    v_request.id,
    v_request.institution_id,
    v_actor,
    v_request.target_user_id,
    p_decision::public.administration_role_request_action,
    jsonb_build_object(
      'review_note',
      nullif(btrim(coalesce(p_review_note, '')), '')
    )
  );

  RETURN v_request.id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 7. Revocar rol administration: solo plataforma; proteger último administrador
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.revoke_administration_role(
  p_institution_id UUID,
  p_target_user_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor UUID := auth.uid();
  v_request_id UUID;
  v_active_admin_count BIGINT;
BEGIN
  IF v_actor IS NULL OR NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Solo el superadministrador SaaS puede revocar este rol.'
      USING ERRCODE = '42501';
  END IF;

  IF char_length(btrim(coalesce(p_reason, ''))) NOT BETWEEN 10 AND 1000 THEN
    RAISE EXCEPTION 'La justificación debe contener entre 10 y 1000 caracteres.';
  END IF;

  IF p_institution_id IS NULL OR p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'La institución y el usuario objetivo son obligatorios.';
  END IF;

  -- Evita que dos operaciones simultáneas dejen la institución sin administración.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_institution_id::text, 0)
  );

  SELECT count(*)
  INTO v_active_admin_count
  FROM public.memberships AS m
  WHERE m.institution_id = p_institution_id
    AND m.role = 'administration'::public.membership_role
    AND m.status = 'active'::public.membership_status;

  IF NOT EXISTS (
    SELECT 1
    FROM public.memberships AS m
    WHERE m.institution_id = p_institution_id
      AND m.user_id = p_target_user_id
      AND m.role = 'administration'::public.membership_role
      AND m.status = 'active'::public.membership_status
  ) THEN
    RAISE EXCEPTION 'No se encontró una membresía activa con rol Administración para suspender.';
  END IF;

  IF v_active_admin_count <= 1 THEN
    RAISE EXCEPTION 'No se puede suspender al último usuario activo con rol Administración.';
  END IF;

  SELECT r.id
  INTO v_request_id
  FROM public.administration_role_requests AS r
  WHERE r.institution_id = p_institution_id
    AND r.target_user_id = p_target_user_id
    AND r.status = 'approved'::public.administration_role_request_status
  ORDER BY r.reviewed_at DESC
  LIMIT 1;

  -- Suspensión lógica: se conserva la fila y todas sus relaciones.
  UPDATE public.memberships
  SET status = 'suspended'::public.membership_status
  WHERE institution_id = p_institution_id
    AND user_id = p_target_user_id
    AND role = 'administration'::public.membership_role
    AND status = 'active'::public.membership_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se pudo suspender la membresía de Administración.';
  END IF;

  INSERT INTO public.administration_role_request_events (
    request_id,
    institution_id,
    actor_user_id,
    target_user_id,
    action,
    details
  )
  VALUES (
    v_request_id,
    p_institution_id,
    v_actor,
    p_target_user_id,
    'revoked'::public.administration_role_request_action,
    jsonb_build_object('reason', btrim(p_reason))
  );

  RETURN TRUE;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 8. Privilegios de funciones
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.request_administration_role(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_administration_role_request(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_administration_role(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.request_administration_role(UUID, UUID, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_administration_role_request(UUID, TEXT, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_administration_role(UUID, UUID, TEXT)
  TO authenticated;

COMMIT;

-- ---------------------------------------------------------------------------
-- 9. Verificación posterior (ejecutar después de aplicar la migración)
-- ---------------------------------------------------------------------------
-- SELECT table_name
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN (
--     'administration_role_requests',
--     'administration_role_request_events'
--   )
-- ORDER BY table_name;
--
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'memberships',
--     'administration_role_requests',
--     'administration_role_request_events'
--   )
-- ORDER BY tablename, policyname;
--
-- SELECT routine_name, security_type
-- FROM information_schema.routines
-- WHERE specific_schema = 'public'
--   AND routine_name IN (
--     'request_administration_role',
--     'resolve_administration_role_request',
--     'revoke_administration_role'
--   )
-- ORDER BY routine_name;
