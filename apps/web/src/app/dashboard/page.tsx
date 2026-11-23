
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import UsersModule from './users-module';
import { supabase } from '../../lib/supabase';
import InstitutionsModule from './institutions-module';
import StudentsModule from './students-module';
import GradesSectionsModule from './grades-sections-module';

type Section = {
  id: string;
  icon: string;
  title: string;
  description: string;
  group: string;
};

type DashboardMetrics = {
  institutions: number | null;
  students: number | null;
  users: number | null;
};

type RecentInstitution = {
  id: string;
  name: string;
  status: 'active' | 'suspended' | 'archived';
  created_at: string;
};

const sections: Section[] = [
  {
    id: 'inicio',
    icon: '⌂',
    title: 'Dashboard',
    description: 'Resumen general de la plataforma',
    group: 'GENERAL',
  },
  {
    id: 'instituciones',
    icon: '🏫',
    title: 'Instituciones',
    description: 'Registrar y administrar colegios',
    group: 'GESTIÓN',
  },
  {
    id: 'alumnos',
    icon: '🎓',
    title: 'Alumnos',
    description: 'Consultar estudiantes de las instituciones',
    group: 'GESTIÓN',
  },
  {
  id: 'grados-secciones',
  icon: '📚',
  title: 'Grados y Secciones',
  description: 'Administrar grados y secciones por institución',
  group: 'GESTIÓN',
  },
  {
    id: 'usuarios',
    icon: '👥',
    title: 'Usuarios',
    description: 'Administrar personal y administradores',
    group: 'GESTIÓN',
  },
  {
    id: 'codigos',
    icon: '🔑',
    title: 'Códigos de afiliación',
    description: 'Crear y controlar códigos de vinculación',
    group: 'GESTIÓN',
  },
  {
    id: 'planes',
    icon: '💳',
    title: 'Planes y suscripciones',
    description: 'Administrar planes y límites de servicio',
    group: 'PLATAFORMA',
  },
  {
    id: 'notificaciones',
    icon: '🔔',
    title: 'Notificaciones',
    description: 'Supervisar las notificaciones enviadas',
    group: 'PLATAFORMA',
  },
  {
    id: 'soporte',
    icon: '🛟',
    title: 'Soporte',
    description: 'Atender solicitudes de los colegios',
    group: 'PLATAFORMA',
  },
  {
    id: 'auditoria',
    icon: '📋',
    title: 'Auditoría',
    description: 'Consultar acciones y actividad del sistema',
    group: 'PLATAFORMA',
  },
  {
    id: 'configuracion',
    icon: '⚙️',
    title: 'Configuración',
    description: 'Administrar ajustes generales',
    group: 'SISTEMA',
  },
];

const groups = ['GENERAL', 'GESTIÓN', 'PLATAFORMA', 'SISTEMA'];

export default function DashboardPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [checking, setChecking] = useState(true);
  const [activeSection, setActiveSection] = useState('inicio');
  const [loggingOut, setLoggingOut] = useState(false);

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    institutions: null,
    students: null,
    users: null,
  });

  const [recentInstitutions, setRecentInstitutions] = useState<RecentInstitution[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState('');

  const loadDashboardData = useCallback(async () => {
    setLoadingDashboard(true);
    setDashboardError('');

    try {
      const [
        institutionsResult,
        studentsResult,
        usersResult,
        recentResult,
      ] = await Promise.all([
        supabase
          .from('institutions')
          .select('id', { count: 'exact', head: true }),

        supabase
          .from('students')
          .select('id', { count: 'exact', head: true }),

        supabase
          .from('user_profiles')
          .select('user_id', { count: 'exact', head: true }),

        supabase
          .from('institutions')
          .select('id, name, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const errors = [
        institutionsResult.error,
        studentsResult.error,
        usersResult.error,
        recentResult.error,
      ].filter(Boolean);

      if (errors.length > 0) {
        throw new Error(errors.map(error => error?.message).join(' | '));
      }

      setMetrics({
        institutions: institutionsResult.count ?? 0,
        students: studentsResult.count ?? 0,
        users: usersResult.count ?? 0,
      });

      setRecentInstitutions(
        (recentResult.data ?? []) as RecentInstitution[]
      );
    } catch (error) {
      console.error('Error al cargar el dashboard:', error);
      setDashboardError(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los datos del dashboard.'
      );
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function verifySession() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        router.replace('/login');
        return;
      }

      const { data: isAdmin, error: roleError } =
        await supabase.rpc('is_platform_admin');

      if (roleError || !isAdmin) {
        await supabase.auth.signOut();
        router.replace('/login');
        return;
      }

      if (active) {
        setEmail(data.user.email ?? '');
        setChecking(false);
      }
    }

    void verifySession();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!checking) {
      void loadDashboardData();
    }
  }, [checking, loadDashboardData]);

  async function logout() {
    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error al cerrar sesión:', error);
      setLoggingOut(false);
      return;
    }

    router.replace('/login');
  }

  function navigateTo(sectionId: string) {
    setActiveSection(sectionId);
  }

  function formatNumber(value: number | null) {
    if (value === null) return '—';
    return new Intl.NumberFormat('es-PE').format(value);
  }

  function getStatusLabel(status: RecentInstitution['status']) {
    const labels = {
      active: 'Activa',
      suspended: 'Suspendida',
      archived: 'Archivada',
    };

    return labels[status];
  }

  if (checking) {
    return (
      <main className="dashboard-loading">
        <div className="loading-content">
          <div className="loading-spinner" />
          <h2>School App</h2>
          <p>Verificando acceso seguro...</p>
        </div>
      </main>
    );
  }

  const selectedSection =
    sections.find(section => section.id === activeSection) ?? sections[0];

  const dashboardMetrics = [
    {
      title: 'Instituciones',
      value: formatNumber(metrics.institutions),
      detail: 'Colegios registrados',
      icon: '🏫',
      color: 'blue',
    },
    {
      title: 'Alumnos',
      value: formatNumber(metrics.students),
      detail: 'Estudiantes registrados',
      icon: '🎓',
      color: 'purple',
    },
    {
      title: 'Usuarios',
      value: formatNumber(metrics.users),
      detail: 'Perfiles registrados',
      icon: '👥',
      color: 'green',
    },
    {
      title: 'Notificaciones',
      value: '—',
      detail: 'Pendiente de implementar',
      icon: '🔔',
      color: 'orange',
    },
  ];

  return (
    <main className="dashboard">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">S</div>
          <div className="sidebar-brand-text">
            <strong>School App</strong>
            <small>Plataforma SaaS</small>
          </div>
        </div>

        <div className="sidebar-scroll">
          {groups.map(group => {
            const groupSections = sections.filter(
              section => section.group === group
            );

            return (
              <div className="sidebar-group" key={group}>
                <div className="sidebar-label">{group}</div>

                <nav className="sidebar-nav">
                  {groupSections.map(section => (
                    <button
                      key={section.id}
                      type="button"
                      className={`sidebar-link ${
                        activeSection === section.id ? 'active' : ''
                      }`}
                      onClick={() => navigateTo(section.id)}
                    >
                      <span className="sidebar-icon">{section.icon}</span>
                      <span>{section.title}</span>

                      {activeSection === section.id && (
                        <span className="sidebar-active-indicator" />
                      )}
                    </button>
                  ))}
                </nav>
              </div>
            );
          })}
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="sidebar-avatar">SA</div>
            <div className="sidebar-user-info">
              <strong>Superadministrador</strong>
              <small>Acceso global</small>
            </div>
          </div>
        </div>
      </aside>

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div className="header-heading">
            <span className="header-eyebrow">PANEL DE CONTROL</span>
            <h1>{selectedSection.title}</h1>
            <p>{selectedSection.description}</p>
          </div>

          <div className="dashboard-account">
            <div className="account-info">
              <span className="account-status" />
              <span className="account-email">{email}</span>
            </div>

            <button
              type="button"
              className="logout-button"
              onClick={logout}
              disabled={loggingOut}
            >
              {loggingOut ? 'Saliendo...' : 'Cerrar sesión'}
            </button>
          </div>
        </header>

        <div className="dashboard-main">
          {activeSection === 'inicio' ? (
            <>
              <section className="welcome-panel">
                <div>
                  <span className="welcome-label">
                    CENTRO DE ADMINISTRACIÓN
                  </span>
                  <h2>Bienvenido a School App</h2>
                  <p>
                    Desde aquí puedes supervisar y administrar
                    toda la plataforma educativa.
                  </p>
                </div>

                <div className="welcome-illustration">🏫</div>
              </section>

              <section className="dashboard-section">
                <div className="section-heading">
                  <div>
                    <h3>Resumen de la plataforma</h3>
                    <p>Indicadores generales del sistema.</p>
                  </div>

                  <button
                    type="button"
                    className="dashboard-refresh"
                    onClick={() => void loadDashboardData()}
                    disabled={loadingDashboard}
                  >
                    {loadingDashboard ? 'Actualizando...' : '↻ Actualizar'}
                  </button>
                </div>

                {dashboardError && (
                  <div className="dashboard-error">
                    <span>No se pudieron cargar algunos datos.</span>
                    <small>{dashboardError}</small>
                  </div>
                )}

                <div className="dashboard-metrics">
                  {dashboardMetrics.map(metric => (
                    <article className="metric-card" key={metric.title}>
                      <div className={`metric-icon ${metric.color}`}>
                        {metric.icon}
                      </div>

                      <div className="metric-information">
                        <span>{metric.title}</span>
                        <strong>{loadingDashboard && metric.value === '—' ? '...' : metric.value}</strong>
                        <small>{metric.detail}</small>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="dashboard-section">
                <div className="section-heading">
                  <div>
                    <h3>Instituciones recientes</h3>
                    <p>Últimos colegios incorporados a la plataforma.</p>
                  </div>

                  <button
                    type="button"
                    className="text-action"
                    onClick={() => navigateTo('instituciones')}
                  >
                    Ver todas →
                  </button>
                </div>

                <div className="recent-institutions">
                  {loadingDashboard ? (
                    <div className="recent-empty">Cargando instituciones...</div>
                  ) : recentInstitutions.length === 0 ? (
                    <div className="recent-empty">
                      Todavía no hay instituciones registradas.
                    </div>
                  ) : (
                    recentInstitutions.map(institution => (
                      <div className="recent-institution-row" key={institution.id}>
                        <div className="recent-institution-avatar">
                          {institution.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="recent-institution-info">
                          <strong>{institution.name}</strong>
                          <small>
                            Registrada el{' '}
                            {new Date(institution.created_at).toLocaleDateString('es-PE')}
                          </small>
                        </div>

                        <span className={`institution-status status-${institution.status}`}>
                          <i />
                          {getStatusLabel(institution.status)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="dashboard-section">
                <div className="section-heading">
                  <div>
                    <h3>Accesos rápidos</h3>
                    <p>Ingresa directamente a los módulos principales.</p>
                  </div>
                </div>

                <div className="dashboard-grid">
                  {sections
                    .filter(section => section.id !== 'inicio')
                    .map(section => (
                      <button
                        type="button"
                        className="dashboard-card"
                        key={section.id}
                        onClick={() => navigateTo(section.id)}
                      >
                        <span className="dashboard-card-icon">
                          {section.icon}
                        </span>
                        <span className="dashboard-card-title">
                          {section.title}
                        </span>
                        <span className="dashboard-card-description">
                          {section.description}
                        </span>
                        <span className="card-action">Abrir módulo →</span>
                      </button>
                    ))}
                </div>
              </section>
            </>
            ) : activeSection === 'instituciones' ? (
              <InstitutionsModule />
            ) : activeSection === 'alumnos' ? (
              <StudentsModule />
            ) : activeSection === 'grados-secciones' ? (
            <GradesSectionsModule />
            ) : activeSection === 'usuarios' ? (
              <UsersModule />
            ) : (
            <section className="module-placeholder">
                <div className="placeholder-icon">{selectedSection.icon}</div>
                <span className="welcome-label">MÓDULO DE ADMINISTRACIÓN</span>
                <h2>{selectedSection.title}</h2>
                <p>{selectedSection.description}</p>

                <div className="placeholder-notice">
                <strong>En preparación</strong>
                <span>
                    Este módulo se implementará en la siguiente etapa.
                    Su estructura ya está incorporada en la navegación.
                </span>
                </div>
            </section>
            )}
        </div>

        <footer className="dashboard-footer">
          <span>© {new Date().getFullYear()} School App</span>
          <span>Panel de administración SaaS</span>
        </footer>
      </section>
    </main>
  );
}
