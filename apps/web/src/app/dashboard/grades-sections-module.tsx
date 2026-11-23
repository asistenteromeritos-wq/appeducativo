
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../../lib/supabase';

type Institution = {
  id: string;
  name: string;
};

type Grade = {
  id: string;
  institution_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

type Section = {
  id: string;
  institution_id: string;
  grade_level_id: string;
  name: string;
  is_active: boolean;
};

type FormType = 'grade' | 'section';

export default function GradesSectionsModule() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  const [institutionId, setInstitutionId] = useState('');
  const [selectedGradeId, setSelectedGradeId] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<FormType>('grade');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('1');
  const [formGradeId, setFormGradeId] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [
        institutionResult,
        gradeResult,
        sectionResult,
      ] = await Promise.all([
        supabase
          .from('institutions')
          .select('id,name')
          .order('name'),

        supabase
          .from('grade_levels')
          .select('id,institution_id,name,sort_order,is_active')
          .order('sort_order'),

        supabase
          .from('sections')
          .select('id,institution_id,grade_level_id,name,is_active')
          .order('name'),
      ]);

      if (institutionResult.error) throw institutionResult.error;
      if (gradeResult.error) throw gradeResult.error;
      if (sectionResult.error) throw sectionResult.error;

      const institutionRows = (institutionResult.data ?? []) as Institution[];
      const gradeRows = (gradeResult.data ?? []) as Grade[];
      const sectionRows = (sectionResult.data ?? []) as Section[];

      setInstitutions(institutionRows);
      setGrades(gradeRows);
      setSections(sectionRows);

      setInstitutionId(current => {
        if (current && institutionRows.some(item => item.id === current)) {
          return current;
        }
        return institutionRows[0]?.id ?? '';
      });
    } catch (err) {
      console.error('Error cargando grados y secciones:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los grados y secciones.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const institutionGrades = useMemo(
    () =>
      grades.filter(item => item.institution_id === institutionId),
    [grades, institutionId]
  );

  const activeGrades = useMemo(
    () => institutionGrades.filter(item => item.is_active),
    [institutionGrades]
  );

  const institutionSections = useMemo(
    () =>
      sections.filter(
        item =>
          item.institution_id === institutionId &&
          (!selectedGradeId || item.grade_level_id === selectedGradeId)
      ),
    [sections, institutionId, selectedGradeId]
  );

  const activeGradeCount = institutionGrades.filter(
    item => item.is_active
  ).length;

  const activeSectionCount = sections.filter(
    item => item.institution_id === institutionId && item.is_active
  ).length;

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setName('');
    setSortOrder('1');
    setFormGradeId('');
  }

  function openNewForm(type: FormType) {
    setFormType(type);
    setEditingId(null);
    setName('');
    setSortOrder(String(institutionGrades.length + 1));
    setFormGradeId(selectedGradeId || activeGrades[0]?.id || '');
    setError('');
    setMessage('');
    setShowForm(true);
  }

  function openEditGrade(grade: Grade) {
    setFormType('grade');
    setEditingId(grade.id);
    setName(grade.name);
    setSortOrder(String(grade.sort_order));
    setFormGradeId('');
    setError('');
    setMessage('');
    setShowForm(true);
  }

  function openEditSection(section: Section) {
    setFormType('section');
    setEditingId(section.id);
    setName(section.name);
    setSortOrder('1');
    setFormGradeId(section.grade_level_id);
    setError('');
    setMessage('');
    setShowForm(true);
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    const cleanName = name.trim();

    if (!institutionId) {
      setError('Selecciona una institución.');
      return;
    }

    if (!cleanName) {
      setError('Escribe el nombre del registro.');
      return;
    }

    if (formType === 'section' && !formGradeId) {
      setError('Selecciona el grado al que pertenece la sección.');
      return;
    }

    const numericOrder = Number(sortOrder);

    if (
      formType === 'grade' &&
      (!Number.isInteger(numericOrder) || numericOrder < 1)
    ) {
      setError('El orden debe ser un número entero mayor que cero.');
      return;
    }

    setSaving(true);

    try {
      if (formType === 'grade') {
        const values = {
          institution_id: institutionId,
          name: cleanName,
          sort_order: numericOrder,
        };

        const result = editingId
          ? await supabase
              .from('grade_levels')
              .update(values)
              .eq('id', editingId)
              .eq('institution_id', institutionId)
          : await supabase
              .from('grade_levels')
              .insert(values);

        if (result.error) throw result.error;
      } else {
        const values = {
          institution_id: institutionId,
          grade_level_id: formGradeId,
          name: cleanName,
        };

        const result = editingId
          ? await supabase
              .from('sections')
              .update(values)
              .eq('id', editingId)
              .eq('institution_id', institutionId)
          : await supabase
              .from('sections')
              .insert(values);

        if (result.error) throw result.error;
      }

      resetForm();
      setMessage(
        editingId
          ? 'Registro actualizado correctamente.'
          : 'Registro creado correctamente.'
      );

      await loadData();
    } catch (err) {
      console.error('Error guardando registro:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el registro.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(
    type: FormType,
    id: string,
    currentStatus: boolean
  ) {
    const label = type === 'grade' ? 'grado' : 'sección';

    const confirmed = window.confirm(
      `¿Deseas ${currentStatus ? 'desactivar' : 'activar'} este ${label}?`
    );

    if (!confirmed) return;

    setUpdatingId(id);
    setError('');
    setMessage('');

    try {
      const result =
        type === 'grade'
          ? await supabase
              .from('grade_levels')
              .update({ is_active: !currentStatus })
              .eq('id', id)
              .eq('institution_id', institutionId)
          : await supabase
              .from('sections')
              .update({ is_active: !currentStatus })
              .eq('id', id)
              .eq('institution_id', institutionId);

      if (result.error) throw result.error;

      setMessage(
        `${label.charAt(0).toUpperCase() + label.slice(1)} ${
          currentStatus ? 'desactivado' : 'activado'
        } correctamente.`
      );

      await loadData();
    } catch (err) {
      console.error('Error cambiando estado:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cambiar el estado.'
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const selectedGrade = institutionGrades.find(
    item => item.id === selectedGradeId
  );

  if (loading) {
    return (
      <section className="students-module">
        <div className="students-empty">Cargando grados y secciones...</div>
      </section>
    );
  }

  return (
    <section className="students-module">
      <div className="students-header">
        <div>
          <span className="welcome-label">ESTRUCTURA ACADÉMICA</span>
          <h2>Grados y Secciones</h2>
          <p>Organiza los grados y las secciones de cada institución.</p>
        </div>

        <button
          type="button"
          className="primary-button"
          disabled={!institutionId}
          onClick={() => openNewForm('grade')}
        >
          + Nuevo grado
        </button>
      </div>

      {error && <div className="students-alert students-alert-error">{error}</div>}
      {message && <div className="students-alert students-alert-success">{message}</div>}

      <div className="students-toolbar">
        <div className="students-filter">
          <label htmlFor="academic-institution">Institución educativa</label>
          <select
            id="academic-institution"
            value={institutionId}
            onChange={event => {
              setInstitutionId(event.target.value);
              setSelectedGradeId('');
              setMessage('');
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
              <span>Total de grados</span>
              <strong>{institutionGrades.length}</strong>
            </div>
            <div className="students-stat-card">
              <span>Grados activos</span>
              <strong>{activeGradeCount}</strong>
            </div>
            <div className="students-stat-card">
              <span>Secciones activas</span>
              <strong>{activeSectionCount}</strong>
            </div>
          </div>

          <div className="students-layout">
            <div className="students-panel">
              <div className="students-panel-heading">
                <div>
                  <h3>Grados académicos</h3>
                  <p>Selecciona un grado para administrar sus secciones.</p>
                </div>
              </div>

              {institutionGrades.length === 0 ? (
                <div className="students-empty">
                  Todavía no hay grados registrados.
                </div>
              ) : (
                <div className="students-table-wrap">
                  <table className="students-table">
                    <thead>
                      <tr>
                        <th>Orden</th>
                        <th>Grado</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {institutionGrades.map(grade => (
                        <tr
                          key={grade.id}
                          className={
                            selectedGradeId === grade.id
                              ? 'academic-row-selected'
                              : ''
                          }
                        >
                          <td>{grade.sort_order}</td>
                          <td>
                            <button
                              type="button"
                              className="academic-grade-select"
                              onClick={() => setSelectedGradeId(
                                selectedGradeId === grade.id ? '' : grade.id
                              )}
                            >
                              {grade.name}
                            </button>
                          </td>
                          <td>
                            <span className={`students-status ${grade.is_active ? 'active' : 'inactive'}`}>
                              {grade.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td>
                            <div className="students-actions">
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => openEditGrade(grade)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="secondary-button"
                                disabled={updatingId === grade.id}
                                onClick={() => void toggleStatus('grade', grade.id, grade.is_active)}
                              >
                                {grade.is_active ? 'Desactivar' : 'Activar'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button
                type="button"
                className="secondary-button academic-add-button"
                onClick={() => openNewForm('grade')}
              >
                + Agregar otro grado
              </button>
            </div>

            <div className="students-panel">
              <div className="students-panel-heading">
                <div>
                  <h3>
                    {selectedGrade ? `Secciones de ${selectedGrade.name}` : 'Secciones'}
                  </h3>
                  <p>
                    {selectedGrade
                      ? 'Administra las secciones de este grado.'
                      : 'Selecciona un grado para filtrar sus secciones.'}
                  </p>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  disabled={!selectedGrade || !selectedGrade.is_active}
                  onClick={() => {
                    console.log('Clic en Nueva sección');
                    console.log('Grado seleccionado:', selectedGrade);
                    console.log('Grados activos:', activeGrades);
                    openNewForm('section');
                    }}
                >
                  + Nueva sección
                </button>
              </div>

              {!selectedGradeId ? (
                <div className="students-empty">
                  Selecciona un grado de la lista para ver sus secciones.
                </div>
              ) : institutionSections.length === 0 ? (
                <div className="students-empty">
                  Este grado todavía no tiene secciones.
                </div>
              ) : (
                <div className="students-table-wrap">
                  <table className="students-table">
                    <thead>
                      <tr>
                        <th>Sección</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {institutionSections.map(section => (
                        <tr key={section.id}>
                          <td>{section.name}</td>
                          <td>
                            <span className={`students-status ${section.is_active ? 'active' : 'inactive'}`}>
                              {section.is_active ? 'Activa' : 'Inactiva'}
                            </span>
                          </td>
                          <td>
                            <div className="students-actions">
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => openEditSection(section)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="secondary-button"
                                disabled={updatingId === section.id}
                                onClick={() => void toggleStatus('section', section.id, section.is_active)}
                              >
                                {section.is_active ? 'Desactivar' : 'Activar'}
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
          </div>
        </>
      )}

      {showForm && (
        <div className="students-modal-overlay">
          <div className="students-modal students-modal-modern">
            <div className="students-modal-header">
              <div>
                <span className="students-form-eyebrow">ESTRUCTURA ACADÉMICA</span>
                <h3>
                  {editingId ? 'Editar' : 'Registrar'}{' '}
                  {formType === 'grade' ? 'grado' : 'sección'}
                </h3>
                <p>
                  {formType === 'grade'
                    ? 'Define el nombre y orden del grado.'
                    : 'Registra una sección dentro del grado seleccionado.'}
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

            <form onSubmit={saveRecord}>
              <div className="students-form-section">
                <div className="students-form-section-title">
                  <span className="students-form-number">01</span>
                  <div>
                    <h4>Datos académicos</h4>
                    <p>Completa la información correspondiente.</p>
                  </div>
                </div>

                <div className="students-form-grid">
                  {formType === 'section' && (
                    <div className="students-form-group students-form-full">
                      <label htmlFor="academic-grade">Grado académico</label>
                      <select
                        id="academic-grade"
                        value={formGradeId}
                        onChange={event => setFormGradeId(event.target.value)}
                        required
                      >
                        <option value="">Seleccionar grado</option>
                        {activeGrades.map(grade => (
                          <option key={grade.id} value={grade.id}>
                            {grade.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="students-form-group students-form-full">
                    <label htmlFor="academic-name">
                      {formType === 'grade' ? 'Nombre del grado' : 'Nombre de la sección'}
                    </label>
                    <input
                      id="academic-name"
                      type="text"
                      value={name}
                      onChange={event => setName(event.target.value)}
                      placeholder={
                        formType === 'grade'
                          ? 'Ej. Primero de secundaria'
                          : 'Ej. A'
                      }
                      maxLength={100}
                      required
                    />
                  </div>

                  {formType === 'grade' && (
                    <div className="students-form-group">
                      <label htmlFor="academic-order">Orden de presentación</label>
                      <input
                        id="academic-order"
                        type="number"
                        min="1"
                        step="1"
                        value={sortOrder}
                        onChange={event => setSortOrder(event.target.value)}
                        required
                      />
                    </div>
                  )}
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
                  {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
