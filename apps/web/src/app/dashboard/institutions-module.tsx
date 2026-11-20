
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../../lib/supabase';

type Institution = {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'archived';
  timezone: string;
};

type StatusFilter = 'all' | 'active' | 'suspended' | 'archived';

export default function InstitutionsModule() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadInstitutions = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('institutions')
        .select('id, name, slug, status, timezone')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInstitutions((data ?? []) as Institution[]);
    } catch (err) {
      console.error('Error al cargar instituciones:', err);
      setError('No se pudieron cargar las instituciones. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInstitutions();
  }, [loadInstitutions]);

  const stats = useMemo(() => ({
    total: institutions.length,
    active: institutions.filter(item => item.status === 'active').length,
    suspended: institutions.filter(item => item.status === 'suspended').length,
    archived: institutions.filter(item => item.status === 'archived').length,
  }), [institutions]);

  const filteredInstitutions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return institutions.filter(institution => {
      const matchesSearch =
        !term ||
        institution.name.toLowerCase().includes(term) ||
        institution.slug.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === 'all' || institution.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [institutions, search, statusFilter]);

  function updateName(value: string) {
    setName(value);

    if (!editingId) {
      const generatedSlug = value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      setSlug(generatedSlug);
    }
  }

  function resetForm() {
    setEditingId(null);
    setName('');
    setSlug('');
  }

  function startEditing(institution: Institution) {
    setEditingId(institution.id);
    setName(institution.name);
    setSlug(institution.slug);
    setError('');
    setMessage('');
  }

  function cancelEditing() {
    resetForm();
    setError('');
    setMessage('');
  }

  async function saveInstitution(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setMessage('');

    const cleanName = name.trim();
    const cleanSlug = slug.trim().toLowerCase();

    if (!cleanName || !cleanSlug) {
      setError('Completa el nombre y el identificador.');
      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug)) {
      setError('El identificador solo debe contener letras minúsculas, números y guiones.');
      return;
    }

    setSaving(true);

    try {
      const values = {
        name: cleanName,
        slug: cleanSlug,
      };

      const result = editingId
        ? await supabase
            .from('institutions')
            .update(values)
            .eq('id', editingId)
        : await supabase
            .from('institutions')
            .insert({
              ...values,
              status: 'active',
              timezone: 'America/Lima',
            });

      if (result.error) throw result.error;

      setMessage(
        editingId
          ? 'Institución actualizada correctamente.'
          : 'Institución registrada correctamente.'
      );

      resetForm();
      await loadInstitutions();
    } catch (err: unknown) {
      console.error('Error al guardar institución:', err);

      const errorMessage =
        err instanceof Error ? err.message : 'Ocurrió un error inesperado.';

      setError(
        errorMessage.toLowerCase().includes('duplicate')
          ? 'Este identificador ya está registrado. Utiliza otro.'
          : `No se pudo guardar la institución: ${errorMessage}`
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleInstitutionStatus(institution: Institution) {
    const nextStatus =
      institution.status === 'active' ? 'suspended' : 'active';

    const action = nextStatus === 'suspended' ? 'suspender' : 'reactivar';

    const confirmed = window.confirm(
      `¿Estás seguro de que deseas ${action} a "${institution.name}"?`
    );

    if (!confirmed) return;

    setUpdatingStatusId(institution.id);
    setError('');
    setMessage('');

    try {
      const { data, error } = await supabase
        .from('institutions')
        .update({ status: nextStatus })
        .eq('id', institution.id)
        .select('id')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error('No se encontró la institución o no tienes permisos para modificarla.');
      }

      setMessage(
        nextStatus === 'suspended'
          ? 'Institución suspendida correctamente.'
          : 'Institución reactivada correctamente.'
      );

      await loadInstitutions();
    } catch (err: unknown) {
      console.error('Error al cambiar estado:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cambiar el estado de la institución.'
      );
    } finally {
      setUpdatingStatusId(null);
    }
  }

  function getStatusLabel(status: Institution['status']) {
    const labels = {
      active: 'Activa',
      suspended: 'Suspendida',
      archived: 'Archivada',
    };

    return labels[status];
  }

  return (
    <section className="institutions-module">

      <div className="institutions-heading">
        <div>
          <span className="institutions-eyebrow">ADMINISTRACIÓN DE PLATAFORMA</span>
          <h2>Instituciones</h2>
          <p>Registra, consulta y administra los colegios afiliados a la plataforma.</p>
        </div>

        <button
          type="button"
          className="institutions-refresh"
          onClick={() => void loadInstitutions()}
          disabled={loading}
        >
          <span>↻</span> {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      <div className="institution-stats">
        <article className="institution-stat">
          <div className="institution-stat-icon stat-total">▦</div>
          <div>
            <span>Total de instituciones</span>
            <strong>{stats.total}</strong>
          </div>
        </article>

        <article className="institution-stat">
          <div className="institution-stat-icon stat-active">✓</div>
          <div>
            <span>Instituciones activas</span>
            <strong>{stats.active}</strong>
          </div>
        </article>

        <article className="institution-stat">
          <div className="institution-stat-icon stat-suspended">Ⅱ</div>
          <div>
            <span>Instituciones suspendidas</span>
            <strong>{stats.suspended}</strong>
          </div>
        </article>

        <article className="institution-stat">
          <div className="institution-stat-icon stat-archived">▤</div>
          <div>
            <span>Instituciones archivadas</span>
            <strong>{stats.archived}</strong>
          </div>
        </article>
      </div>

      {error && (
        <div className="institution-alert institution-alert-error">
          <span>!</span>
          <p>{error}</p>
          <button type="button" onClick={() => setError('')}>×</button>
        </div>
      )}

      {message && (
        <div className="institution-alert institution-alert-success">
          <span>✓</span>
          <p>{message}</p>
          <button type="button" onClick={() => setMessage('')}>×</button>
        </div>
      )}

      <div className="institution-content">

        <form className="institution-form" onSubmit={saveInstitution}>
          <div className="institution-form-heading">
            <div className="institution-form-icon">＋</div>
            <div>
              <h3>{editingId ? 'Editar institución' : 'Nueva institución'}</h3>
              <p>
                {editingId
                  ? 'Modifica los datos del colegio seleccionado.'
                  : 'Incorpora un nuevo colegio a la plataforma.'}
              </p>
            </div>
          </div>

          <div className="institution-field">
            <label htmlFor="institution-name">Nombre del colegio</label>
            <input
              id="institution-name"
              value={name}
              onChange={e => updateName(e.target.value)}
              placeholder="Ej. I.E. Los Próceres"
              maxLength={150}
              required
            />
          </div>

          <div className="institution-field">
            <label htmlFor="institution-slug">Identificador único</label>
            <input
              id="institution-slug"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="ie-los-proceres"
              maxLength={100}
              required
            />
            <small>Se utiliza como identificador interno de la institución.</small>
          </div>

          <div className="institution-form-actions">
            <button type="submit" className="institution-submit" disabled={saving}>
              {saving
                ? 'Guardando...'
                : editingId
                  ? 'Guardar cambios'
                  : 'Registrar institución'}
            </button>

            {editingId && (
              <button
                type="button"
                className="institution-cancel"
                onClick={cancelEditing}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="institutions-list">
          <div className="institutions-list-heading">
            <div>
              <h3>Colegios registrados</h3>
              <p>Listado general de instituciones de la plataforma.</p>
            </div>
            <span className="institution-count">
              {filteredInstitutions.length} resultados
            </span>
          </div>

          <div className="institution-toolbar">
            <div className="institution-search">
              <span>⌕</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o identificador..."
                aria-label="Buscar instituciones"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as StatusFilter)}
              aria-label="Filtrar por estado"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="suspended">Suspendidas</option>
              <option value="archived">Archivadas</option>
            </select>
          </div>

          {loading ? (
            <div className="institution-empty">
              <div className="institution-loader" />
              <p>Cargando instituciones...</p>
            </div>
          ) : filteredInstitutions.length === 0 ? (
            <div className="institution-empty">
              <div className="institution-empty-icon">▦</div>
              <strong>No se encontraron instituciones</strong>
              <p>
                {search || statusFilter !== 'all'
                  ? 'Prueba cambiando los filtros de búsqueda.'
                  : 'Registra el primer colegio para comenzar.'}
              </p>
            </div>
          ) : (
            <div className="institutions-table-wrapper">
              <table className="institutions-table">
                <thead>
                  <tr>
                    <th>INSTITUCIÓN</th>
                    <th>IDENTIFICADOR</th>
                    <th>ESTADO</th>
                    <th className="institution-actions-column">ACCIONES</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredInstitutions.map(institution => (
                    <tr key={institution.id}>
                      <td>
                        <div className="institution-name-cell">
                          <div className="institution-avatar">
                            {institution.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong>{institution.name}</strong>
                            <small>{institution.timezone}</small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <code className="institution-slug">{institution.slug}</code>
                      </td>

                      <td>
                        <span className={`institution-status status-${institution.status}`}>
                          <i />
                          {getStatusLabel(institution.status)}
                        </span>
                      </td>

                      <td>
                        <div className="institution-row-actions">
                          <button
                            type="button"
                            className="institution-edit"
                            onClick={() => startEditing(institution)}
                          >
                            Editar
                          </button>

                          {institution.status !== 'archived' && (
                            <button
                              type="button"
                              className={
                                institution.status === 'active'
                                  ? 'institution-suspend'
                                  : 'institution-reactivate'
                              }
                              disabled={updatingStatusId === institution.id}
                              onClick={() => void toggleInstitutionStatus(institution)}
                            >
                              {updatingStatusId === institution.id
                                ? 'Procesando...'
                                : institution.status === 'active'
                                  ? 'Suspender'
                                  : 'Reactivar'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
