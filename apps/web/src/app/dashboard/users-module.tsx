
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Membership = {
  id: string;
  institution_id: string;
  user_id: string;
  role: 'administration' | 'teacher' | 'guardian';
  status: 'active' | 'invited' | 'suspended';
  created_at: string;
  full_name: string;
  phone: string;
  institution_name: string;
};

type Institution = {
  id: string;
  name: string;
};

type RoleFilter = 'all' | 'administration' | 'teacher' | 'guardian';
type StatusFilter = 'all' | 'active' | 'invited' | 'suspended';

export default function UsersModule() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    institution_id: '',
    role: 'teacher',
  });
    const createUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setCreating(true);
    setError('');
    setMessage('');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Tu sesión ha expirado. Inicia sesión nuevamente.');
      }

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'No se pudo crear el usuario.');
      }

      setMessage('Usuario creado correctamente.');
      setNewUser({
        full_name: '',
        email: '',
        phone: '',
        password: '',
        institution_id: '',
        role: 'teacher',
      });

      setShowCreateForm(false);
      await loadUsers();

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al crear el usuario.'
      );
    } finally {
      setCreating(false);
    }
  };
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [membershipResult, profileResult, institutionResult] =
        await Promise.all([
          supabase
            .from('memberships')
            .select('id,institution_id,user_id,role,status,created_at')
            .order('created_at', { ascending: false }),

          supabase
            .from('user_profiles')
            .select('user_id,full_name,phone'),

          supabase
            .from('institutions')
            .select('id,name')
            .order('name', { ascending: true }),
        ]);

      if (membershipResult.error) throw membershipResult.error;
      if (profileResult.error) throw profileResult.error;
      if (institutionResult.error) throw institutionResult.error;

      const profiles = profileResult.data ?? [];
      const institutionRows = institutionResult.data ?? [];

      const profileMap = new Map(
        profiles.map((profile) => [profile.user_id, profile])
      );

      const institutionMap = new Map(
        institutionRows.map((institution) => [
          institution.id,
          institution.name,
        ])
      );

      const rows: Membership[] = (membershipResult.data ?? []).map(
        (membership) => {
          const profile = profileMap.get(membership.user_id);

          return {
            ...membership,
            full_name: profile?.full_name || 'Usuario sin nombre',
            phone: profile?.phone || '',
            institution_name:
              institutionMap.get(membership.institution_id) ||
              'Institución no encontrada',
          };
        }
      );

      setMemberships(rows);
      setInstitutions(institutionRows);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los usuarios.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const stats = useMemo(() => ({
    total: memberships.length,
    active: memberships.filter((item) => item.status === 'active').length,
    invited: memberships.filter((item) => item.status === 'invited').length,
    suspended: memberships.filter((item) => item.status === 'suspended').length,
  }), [memberships]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return memberships.filter((user) => {
      const matchesSearch =
        !term ||
        user.full_name.toLowerCase().includes(term) ||
        user.phone.toLowerCase().includes(term) ||
        user.user_id.toLowerCase().includes(term) ||
        user.institution_name.toLowerCase().includes(term);

      const matchesRole =
        roleFilter === 'all' || user.role === roleFilter;

      const matchesStatus =
        statusFilter === 'all' || user.status === statusFilter;

      const matchesInstitution =
        institutionFilter === 'all' ||
        user.institution_id === institutionFilter;

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus &&
        matchesInstitution
      );
    });
  }, [
    memberships,
    search,
    roleFilter,
    statusFilter,
    institutionFilter,
  ]);

  const changeStatus = async (user: Membership) => {
    const nextStatus =
      user.status === 'active' ? 'suspended' : 'active';

    const actionText =
      nextStatus === 'suspended' ? 'suspender' : 'activar';

    const confirmed = window.confirm(
      `¿Estás seguro de ${actionText} esta membresía de ${user.full_name}?`
    );

    if (!confirmed) return;

    setUpdatingId(user.id);
    setError('');
    setMessage('');

    try {
      const { data, error: updateError } = await supabase
        .from('memberships')
        .update({ status: nextStatus })
        .eq('id', user.id)
        .select('id')
        .maybeSingle();

      if (updateError) throw updateError;

      if (!data) {
        throw new Error(
          'No se pudo actualizar la membresía. Verifica los permisos y el estado actual.'
        );
      }

      setMemberships((current) =>
        current.map((item) =>
          item.id === user.id
            ? { ...item, status: nextStatus }
            : item
        )
      );

      setMessage(
        nextStatus === 'active'
          ? 'Membresía activada correctamente.'
          : 'Membresía suspendida correctamente.'
      );
    } catch (err) {
      console.error('Error actualizando membresía:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar la membresía.'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const roleLabel = (role: Membership['role']) => {
    const labels = {
      administration: 'Administración',
      teacher: 'Docente',
      guardian: 'Apoderado',
    };

    return labels[role];
  };

  const statusLabel = (status: Membership['status']) => {
    const labels = {
      active: 'Activo',
      invited: 'Invitado',
      suspended: 'Suspendido',
    };

    return labels[status];
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  return (
    <section className="users-module">
      <div className="users-header">
        <div>
          <span className="users-eyebrow">GESTIÓN DE PLATAFORMA</span>
          <h1>Usuarios y membresías</h1>
          <p>
            Consulta y administra los accesos de los usuarios
            pertenecientes a las instituciones.
          </p>
        </div>
        <button
            className="users-create-button"
            onClick={() => setShowCreateForm(true)}
          >
            + Crear usuario
        </button>
        <button
        
          className="users-refresh"
          onClick={loadUsers}
          disabled={loading}
        >
          ↻ Actualizar
        </button>

      </div>

  {showCreateForm && (
    <div className="users-modal-overlay">
      <div className="users-modal">
        <div className="users-modal-header">
          <div>
            <h2>Crear nuevo usuario</h2>
            <p>Registra una cuenta y asígnala a una institución.</p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateForm(false)}
            className="users-modal-close"
          >
            ×
          </button>
        </div>

        <form onSubmit={createUser}>
          <label>Nombres y apellidos *</label>
          <input
            required
            value={newUser.full_name}
            onChange={(e) =>
              setNewUser({ ...newUser, full_name: e.target.value })
            }
            placeholder="Nombre completo"
          />

          <label>Correo electrónico *</label>
          <input
            required
            type="email"
            value={newUser.email}
            onChange={(e) =>
              setNewUser({ ...newUser, email: e.target.value })
            }
            placeholder="usuario@correo.com"
          />

          <label>Teléfono</label>
          <input
            type="tel"
            value={newUser.phone}
            onChange={(e) =>
              setNewUser({ ...newUser, phone: e.target.value })
            }
            placeholder="Número de teléfono"
          />

          <label>Contraseña temporal *</label>
          <input
            required
            type="password"
            minLength={8}
            value={newUser.password}
            onChange={(e) =>
              setNewUser({ ...newUser, password: e.target.value })
            }
            placeholder="Mínimo 8 caracteres"
          />

          <label>Institución *</label>
          <select
            value={newUser.institution_id}
            onChange={(e) =>
              setNewUser({
                ...newUser,
                institution_id: e.target.value,
              })
            }
            required
          >
            <option value="">Seleccionar institución</option>

            {institutions.map((institution) => (
              <option key={institution.id} value={institution.id}>
                {institution.name}
              </option>
            ))}
          </select>

          <label>Rol del usuario *</label>
          <select
            value={newUser.role}
            onChange={(e) =>
              setNewUser({ ...newUser, role: e.target.value })
            }
          >
            <option value="administration">Administración</option>
            <option value="teacher">Docente</option>
            <option value="guardian">Apoderado</option>
          </select>

          <div className="users-modal-actions">
            <button
              type="button"
              className="users-cancel-button"
              onClick={() => setShowCreateForm(false)}
              disabled={creating}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="users-create-button"
              disabled={creating}
            >
              {creating ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )}

      <div className="users-stats">
        <article className="users-stat-card">
          <span>Total de membresías</span>
          <strong>{stats.total}</strong>
        </article>

        <article className="users-stat-card">
          <span>Activas</span>
          <strong>{stats.active}</strong>
        </article>

        <article className="users-stat-card">
          <span>Invitadas</span>
          <strong>{stats.invited}</strong>
        </article>

        <article className="users-stat-card">
          <span>Suspendidas</span>
          <strong>{stats.suspended}</strong>
        </article>
      </div>

      <div className="users-toolbar">
        <input
          type="search"
          placeholder="Buscar por nombre, teléfono, ID o institución..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          value={institutionFilter}
          onChange={(event) => setInstitutionFilter(event.target.value)}
        >
          <option value="all">Todas las instituciones</option>
          {institutions.map((institution) => (
            <option key={institution.id} value={institution.id}>
              {institution.name}
            </option>
          ))}
        </select>

        <select
          value={roleFilter}
          onChange={(event) =>
            setRoleFilter(event.target.value as RoleFilter)
          }
        >
          <option value="all">Todos los roles</option>
          <option value="administration">Administración</option>
          <option value="teacher">Docentes</option>
          <option value="guardian">Apoderados</option>
        </select>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as StatusFilter)
          }
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="invited">Invitados</option>
          <option value="suspended">Suspendidos</option>
        </select>
      </div>

      {error && (
        <div className="users-alert users-alert-error">
          {error}
        </div>
      )}

      {message && (
        <div className="users-alert users-alert-success">
          {message}
        </div>
      )}

      <div className="users-table-container">
        <div className="users-table-heading">
          <div>
            <h2>Listado de usuarios</h2>
            <span>{filteredUsers.length} resultados</span>
          </div>
        </div>

        {loading ? (
          <div className="users-empty">Cargando usuarios...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="users-empty">
            No se encontraron usuarios con esos filtros.
          </div>
        ) : (
          <div className="users-table-scroll">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Institución</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Registro</th>
                  <th>Acción</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="users-person">
                        <div className="users-avatar">
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <strong>{user.full_name}</strong>
                          <small>
                            {user.phone || user.user_id}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>{user.institution_name}</td>

                    <td>
                      <span className="users-role">
                        {roleLabel(user.role)}
                      </span>
                    </td>

                    <td>
                      <span className={`users-status status-${user.status}`}>
                        {statusLabel(user.status)}
                      </span>
                    </td>

                    <td>{formatDate(user.created_at)}</td>

                    <td>
                      {user.status === 'invited' ? (
                        <span className="users-no-action">
                          Pendiente
                        </span>
                      ) : (
                        <button
                          className={
                            user.status === 'active'
                              ? 'users-action suspend'
                              : 'users-action activate'
                          }
                          onClick={() => changeStatus(user)}
                          disabled={updatingId === user.id}
                        >
                          {updatingId === user.id
                            ? 'Procesando...'
                            : user.status === 'active'
                              ? 'Suspender'
                              : 'Activar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
