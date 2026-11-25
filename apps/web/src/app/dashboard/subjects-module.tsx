
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../../lib/supabase';

type Institution = {
  id: string;
  name: string;
};

type Subject = {
  id: string;
  institution_id: string;
  name: string;
  code: string;
  is_active: boolean;
};

export default function SubjectsModule() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [institutionId, setInstitutionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [institutionResult, subjectResult] = await Promise.all([
        supabase
          .from('institutions')
          .select('id,name')
          .order('name'),

        supabase
          .from('subjects')
          .select('id,institution_id,name,code,is_active')
          .order('name'),
      ]);

      if (institutionResult.error) throw institutionResult.error;
      if (subjectResult.error) throw subjectResult.error;

      const institutionRows =
        (institutionResult.data ?? []) as Institution[];

      setInstitutions(institutionRows);
      setSubjects((subjectResult.data ?? []) as Subject[]);

      setInstitutionId(current => {
        if (current && institutionRows.some(item => item.id === current)) {
          return current;
        }

        return institutionRows[0]?.id ?? '';
      });
    } catch (err) {
      console.error('Error cargando asignaturas:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las asignaturas.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const institutionSubjects = useMemo(
    () => subjects.filter(item => item.institution_id === institutionId),
    [subjects, institutionId]
  );

  const activeCount = institutionSubjects.filter(
    item => item.is_active
  ).length;

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setName('');
    setCode('');
  }

  function openNewForm() {
    setEditingId(null);
    setName('');
    setCode('');
    setError('');
    setMessage('');
    setShowForm(true);
  }

  function openEditForm(subject: Subject) {
    setEditingId(subject.id);
    setName(subject.name);
    setCode(subject.code);
    setError('');
    setMessage('');
    setShowForm(true);
  }

  async function saveSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    const cleanName = name.trim();
    const cleanCode = code.trim();

    if (!institutionId) {
      setError('Selecciona una institución.');
      return;
    }

    if (!cleanName || !cleanCode) {
      setError('Completa el nombre y el código de la asignatura.');
      return;
    }

    setSaving(true);

    try {
      const values = {
        institution_id: institutionId,
        name: cleanName,
        code: cleanCode,
      };

      const result = editingId
        ? await supabase
            .from('subjects')
            .update(values)
            .eq('id', editingId)
            .eq('institution_id', institutionId)
        : await supabase
            .from('subjects')
            .insert(values);

      if (result.error) throw result.error;

      const wasEditing = Boolean(editingId);

      resetForm();

      setMessage(
        wasEditing
          ? 'Asignatura actualizada correctamente.'
          : 'Asignatura registrada correctamente.'
      );

      await loadData();
    } catch (err) {
      console.error('Error guardando asignatura:', err);

      const messageError =
        err instanceof Error ? err.message : '';

      if (messageError.includes('subjects_institution_id_name_key')) {
        setError('Ya existe una asignatura con ese nombre en esta institución.');
      } else if (messageError.includes('subjects_institution_id_code_key')) {
        setError('Ya existe una asignatura con ese código en esta institución.');
      } else {
        setError(messageError || 'No se pudo guardar la asignatura.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(subject: Subject) {
    const confirmed = window.confirm(
      `¿Deseas ${subject.is_active ? 'desactivar' : 'activar'} la asignatura "${subject.name}"?`
    );

    if (!confirmed) return;

    setUpdatingId(subject.id);
    setError('');
    setMessage('');

    try {
      const { error: updateError } = await supabase
        .from('subjects')
        .update({ is_active: !subject.is_active })
        .eq('id', subject.id)
        .eq('institution_id', institutionId);

      if (updateError) throw updateError;

      setMessage(
        `Asignatura ${subject.is_active ? 'desactivada' : 'activada'} correctamente.`
      );

      await loadData();
    } catch (err) {
      console.error('Error cambiando estado:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cambiar el estado de la asignatura.'
      );
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <section className="students-module">
        <div className="students-empty">Cargando asignaturas...</div>
      </section>
    );
  }

  return (
    <section className="students-module">
      <div className="students-header">
        <div>
          <span className="welcome-label">GESTIÓN ACADÉMICA</span>
          <h2>Asignaturas</h2>
          <p>Administra el catálogo de asignaturas de cada institución.</p>
        </div>

        <button
          type="button"
          className="primary-button"
          disabled={!institutionId}
          onClick={openNewForm}
        >
          + Nueva asignatura
        </button>
      </div>

      {error && (
        <div className="students-alert students-alert-error">{error}</div>
      )}

      {message && (
        <div className="students-alert students-alert-success">{message}</div>
      )}

      <div className="students-toolbar">
        <div className="students-filter">
          <label htmlFor="subjects-institution">
            Institución educativa
          </label>

          <select
            id="subjects-institution"
            value={institutionId}
            onChange={event => {
              setInstitutionId(event.target.value);
              setMessage('');
              setError('');
            }}
          >
            <option value="">Seleccionar institución</option>
            {institutions.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!institutionId ? (
        <div className="students-empty">
          No hay instituciones disponibles. Registra primero una institución.
        </div>
      ) : (
        <>
          <div className="students-stats">
            <div className="students-stat-card">
              <span>Total de asignaturas</span>
              <strong>{institutionSubjects.length}</strong>
            </div>

            <div className="students-stat-card">
              <span>Asignaturas activas</span>
              <strong>{activeCount}</strong>
            </div>

            <div className="students-stat-card">
              <span>Asignaturas inactivas</span>
              <strong>{institutionSubjects.length - activeCount}</strong>
            </div>
          </div>

          <div className="students-panel">
            <div className="students-panel-heading">
              <div>
                <h3>Catálogo de asignaturas</h3>
                <p>
                  Asignaturas registradas para la institución seleccionada.
                </p>
              </div>
            </div>

            {institutionSubjects.length === 0 ? (
              <div className="students-empty">
                Todavía no hay asignaturas registradas.
              </div>
            ) : (
              <div className="students-table-wrap">
                <table className="students-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Asignatura</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {institutionSubjects.map(subject => (
                      <tr key={subject.id}>
                        <td><strong>{subject.code}</strong></td>
                        <td>{subject.name}</td>

                        <td>
                          <span
                            className={`students-status ${
                              subject.is_active ? 'active' : 'inactive'
                            }`}
                          >
                            {subject.is_active ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>

                        <td>
                          <div className="students-actions">
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => openEditForm(subject)}
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              className="secondary-button"
                              disabled={updatingId === subject.id}
                              onClick={() => void toggleStatus(subject)}
                            >
                              {updatingId === subject.id
                                ? 'Actualizando...'
                                : subject.is_active
                                  ? 'Desactivar'
                                  : 'Activar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showForm && (
        <div className="students-modal-overlay">
          <div className="students-modal students-modal-modern">
            <div className="students-modal-header">
              <div>
                <span className="students-form-eyebrow">
                  GESTIÓN ACADÉMICA
                </span>

                <h3>
                  {editingId ? 'Editar asignatura' : 'Registrar asignatura'}
                </h3>

                <p>
                  Completa los datos de la asignatura.
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={resetForm}
              >
                ×
              </button>
            </div>

            <form onSubmit={saveSubject}>
              <div className="students-form-section">
                <div className="students-form-section-title">
                  <span className="students-form-number">01</span>

                  <div>
                    <h4>Datos de la asignatura</h4>
                    <p>El nombre y el código son obligatorios.</p>
                  </div>
                </div>

                <div className="students-form-grid">
                  <div className="students-form-group students-form-full">
                    <label htmlFor="subject-name">
                      Nombre de la asignatura
                    </label>

                    <input
                      id="subject-name"
                      type="text"
                      value={name}
                      onChange={event => setName(event.target.value)}
                      placeholder="Ej. Matemática"
                      maxLength={100}
                      required
                    />
                  </div>

                  <div className="students-form-group students-form-full">
                    <label htmlFor="subject-code">
                      Código de la asignatura
                    </label>

                    <input
                      id="subject-code"
                      type="text"
                      value={code}
                      onChange={event => setCode(event.target.value)}
                      placeholder="Ej. MAT-01"
                      maxLength={50}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="students-modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Guardando...'
                    : editingId
                      ? 'Guardar cambios'
                      : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
