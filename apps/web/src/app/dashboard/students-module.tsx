
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Institution = {
  id: string;
  name: string;
};

type Grade = {
  id: string;
  institution_id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
};

type Section = {
  id: string;
  institution_id: string;
  grade_level_id: string;
  name: string;
  is_active: boolean;
};

type Student = {
  id: string;
  institution_id: string;
  enrollment_code: string;
  first_names: string;
  last_names: string;
  document_number: string | null;
  grade_level_id: string;
  section_id: string;
  is_active: boolean;
  created_at: string;
  institution_name: string;
  grade_name: string;
  section_name: string;
};

type StudentForm = {
  institution_id: string;
  enrollment_code: string;
  first_names: string;
  last_names: string;
  document_number: string;
  grade_level_id: string;
  section_id: string;
};

type StatusFilter = 'all' | 'active' | 'inactive';

const emptyForm: StudentForm = {
  institution_id: '',
  enrollment_code: '',
  first_names: '',
  last_names: '',
  document_number: '',
  grade_level_id: '',
  section_id: '',
};

export default function StudentsModule() {
  const [students, setStudents] = useState<Student[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');

  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StudentForm>(emptyForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [
        institutionResult,
        gradeResult,
        sectionResult,
        studentResult,
      ] = await Promise.all([
        supabase
          .from('institutions')
          .select('id,name')
          .order('name'),

        supabase
          .from('grade_levels')
          .select('id,institution_id,name,is_active,sort_order')
          .order('sort_order'),

        supabase
          .from('sections')
          .select('id,institution_id,grade_level_id,name,is_active')
          .order('name'),

        supabase
          .from('students')
          .select(
            'id,institution_id,enrollment_code,first_names,last_names,document_number,grade_level_id,section_id,is_active,created_at'
          )
          .order('last_names'),
      ]);

      if (institutionResult.error) throw institutionResult.error;
      if (gradeResult.error) throw gradeResult.error;
      if (sectionResult.error) throw sectionResult.error;
      if (studentResult.error) throw studentResult.error;

      const institutionRows = (institutionResult.data ?? []) as Institution[];
      const gradeRows = (gradeResult.data ?? []) as Grade[];
      const sectionRows = (sectionResult.data ?? []) as Section[];
      const studentRows = (studentResult.data ?? []) as Omit<
        Student,
        'institution_name' | 'grade_name' | 'section_name'
      >[];

      const institutionMap = new Map(
        institutionRows.map((item) => [item.id, item.name])
      );

      const gradeMap = new Map(
        gradeRows.map((item) => [item.id, item.name])
      );

      const sectionMap = new Map(
        sectionRows.map((item) => [item.id, item.name])
      );

      const mappedStudents: Student[] = studentRows.map((student) => ({
        ...student,
        institution_name:
          institutionMap.get(student.institution_id) || 'Sin institución',
        grade_name:
          gradeMap.get(student.grade_level_id) || 'Sin grado',
        section_name:
          sectionMap.get(student.section_id) || 'Sin sección',
      }));

      setInstitutions(institutionRows);
      setGrades(gradeRows);
      setSections(sectionRows);
      setStudents(mappedStudents);
    } catch (err) {
      console.error('Error cargando alumnos:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los alumnos.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const availableGrades = useMemo(
    () =>
      grades.filter(
        (grade) =>
          grade.is_active &&
          grade.institution_id === form.institution_id
      ),
    [grades, form.institution_id]
  );

  const availableSections = useMemo(
    () =>
      sections.filter(
        (section) =>
          section.is_active &&
          section.institution_id === form.institution_id &&
          section.grade_level_id === form.grade_level_id
      ),
    [sections, form.institution_id, form.grade_level_id]
  );

  const filteredGrades = useMemo(
    () =>
      grades.filter(
        (grade) =>
          grade.is_active &&
          (institutionFilter === 'all' ||
            grade.institution_id === institutionFilter)
      ),
    [grades, institutionFilter]
  );

  const filteredSections = useMemo(
    () =>
      sections.filter(
        (section) =>
          section.is_active &&
          (institutionFilter === 'all' ||
            section.institution_id === institutionFilter) &&
          (gradeFilter === 'all' ||
            section.grade_level_id === gradeFilter)
      ),
    [sections, institutionFilter, gradeFilter]
  );

  const stats = useMemo(
    () => ({
      total: students.length,
      active: students.filter((item) => item.is_active).length,
      inactive: students.filter((item) => !item.is_active).length,
    }),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();

    return students.filter((student) => {
      const fullName =
        `${student.first_names} ${student.last_names}`.toLowerCase();

      const matchesSearch =
        !term ||
        fullName.includes(term) ||
        student.enrollment_code.toLowerCase().includes(term) ||
        (student.document_number || '').toLowerCase().includes(term);

      const matchesInstitution =
        institutionFilter === 'all' ||
        student.institution_id === institutionFilter;

      const matchesGrade =
        gradeFilter === 'all' ||
        student.grade_level_id === gradeFilter;

      const matchesSection =
        sectionFilter === 'all' ||
        student.section_id === sectionFilter;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && student.is_active) ||
        (statusFilter === 'inactive' && !student.is_active);

      return (
        matchesSearch &&
        matchesInstitution &&
        matchesGrade &&
        matchesSection &&
        matchesStatus
      );
    });
  }, [
    students,
    search,
    institutionFilter,
    gradeFilter,
    sectionFilter,
    statusFilter,
  ]);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setMessage('');
    setShowForm(true);
  };

  const openEditForm = (student: Student) => {
    setEditingId(student.id);
    setForm({
      institution_id: student.institution_id,
      enrollment_code: student.enrollment_code,
      first_names: student.first_names,
      last_names: student.last_names,
      document_number: student.document_number || '',
      grade_level_id: student.grade_level_id,
      section_id: student.section_id,
    });
    setError('');
    setMessage('');
    setShowForm(true);
  };

  const saveStudent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (!form.institution_id || !form.grade_level_id || !form.section_id) {
        throw new Error('Selecciona institución, grado y sección.');
      }

      const validGrade = grades.some(
        (grade) =>
          grade.id === form.grade_level_id &&
          grade.institution_id === form.institution_id &&
          grade.is_active
      );

      const validSection = sections.some(
        (section) =>
          section.id === form.section_id &&
          section.institution_id === form.institution_id &&
          section.grade_level_id === form.grade_level_id &&
          section.is_active
      );

      if (!validGrade || !validSection) {
        throw new Error('El grado o sección seleccionados no son válidos.');
      }

      const payload = {
        institution_id: form.institution_id,
        enrollment_code: form.enrollment_code.trim(),
        first_names: form.first_names.trim(),
        last_names: form.last_names.trim(),
        document_number: form.document_number.trim() || null,
        grade_level_id: form.grade_level_id,
        section_id: form.section_id,
      };

      if (editingId) {
        const { data, error: updateError } = await supabase
          .from('students')
          .update(payload)
          .eq('id', editingId)
          .select('id')
          .maybeSingle();

        if (updateError) throw updateError;
        if (!data) {
          throw new Error('No se pudo actualizar el alumno. Verifica los permisos.');
        }

        setMessage('Alumno actualizado correctamente.');
      } else {
        const { error: insertError } = await supabase
          .from('students')
          .insert({
            ...payload,
            is_active: true,
          });

        if (insertError) {
          if (insertError.code === '23505') {
            throw new Error(
              'Ya existe un alumno con ese código de matrícula en esta institución.'
            );
          }
          throw insertError;
        }

        setMessage('Alumno registrado correctamente.');
      }

      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      await loadData();
    } catch (err) {
      console.error('Error guardando alumno:', err);
      setError(
        err instanceof Error ? err.message : 'No se pudo guardar el alumno.'
      );
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (student: Student) => {
    const nextStatus = !student.is_active;
    const action = nextStatus ? 'activar' : 'desactivar';

    if (
      !window.confirm(
        `¿Estás seguro de ${action} a ${student.first_names} ${student.last_names}?`
      )
    ) {
      return;
    }

    setUpdatingId(student.id);
    setError('');
    setMessage('');

    try {
      const { data, error: updateError } = await supabase
        .from('students')
        .update({ is_active: nextStatus })
        .eq('id', student.id)
        .select('id')
        .maybeSingle();

      if (updateError) throw updateError;

      if (!data) {
        throw new Error('No se pudo cambiar el estado del alumno.');
      }

      setStudents((current) =>
        current.map((item) =>
          item.id === student.id
            ? { ...item, is_active: nextStatus }
            : item
        )
      );

      setMessage(
        nextStatus
          ? 'Alumno activado correctamente.'
          : 'Alumno desactivado correctamente.'
      );
    } catch (err) {
      console.error('Error cambiando estado:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cambiar el estado del alumno.'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section className="students-module">
      <div className="students-header">
        <div>
          <span className="students-eyebrow">GESTIÓN DE PLATAFORMA</span>
          <h1>Alumnos</h1>
          <p>
            Registra, consulta y administra los estudiantes de las instituciones.
          </p>
        </div>

        <div className="students-header-actions">
          <button
            className="students-refresh"
            onClick={loadData}
            disabled={loading}
          >
            ↻ Actualizar
          </button>

          <button
            className="students-create-button"
            onClick={openCreateForm}
          >
            + Registrar alumno
          </button>
        </div>
      </div>

      
    {showForm && (
        <div className="students-modal-overlay">
            <div className="students-modal students-modal-modern">
            <div className="students-modal-header">
                <div>
                <span className="students-form-eyebrow">
                    GESTIÓN DE ESTUDIANTES
                </span>
                <h2>
                    {editingId ? 'Editar alumno' : 'Registrar alumno'}
                </h2>
                <p>Completa la información del estudiante.</p>
                </div>

                <button
                type="button"
                className="students-modal-close"
                onClick={() => setShowForm(false)}
                disabled={saving}
                aria-label="Cerrar formulario"
                >
                ×
                </button>
            </div>

            <form onSubmit={saveStudent} className="students-form">
                <div className="students-form-section">
                <div className="students-form-section-title">
                    <span className="students-form-number">01</span>
                    <div>
                    <h3>Datos personales</h3>
                    <p>Información de identificación del estudiante.</p>
                    </div>
                </div>

                <div className="students-form-grid">
                    <div className="students-form-group students-form-full">
                    <label>Institución *</label>
                    <select
                        required
                        value={form.institution_id}
                        onChange={(event) =>
                        setForm({
                            ...form,
                            institution_id: event.target.value,
                            grade_level_id: '',
                            section_id: '',
                        })
                        }
                    >
                        <option value="">Seleccionar institución</option>
                        {institutions.map((institution) => (
                        <option key={institution.id} value={institution.id}>
                            {institution.name}
                        </option>
                        ))}
                    </select>
                    </div>

                    <div className="students-form-group">
                    <label>Nombres *</label>
                    <input
                        required
                        value={form.first_names}
                        onChange={(event) =>
                        setForm({ ...form, first_names: event.target.value })
                        }
                        placeholder="Nombres del alumno"
                    />
                    </div>

                    <div className="students-form-group">
                    <label>Apellidos *</label>
                    <input
                        required
                        value={form.last_names}
                        onChange={(event) =>
                        setForm({ ...form, last_names: event.target.value })
                        }
                        placeholder="Apellidos del alumno"
                    />
                    </div>

                    <div className="students-form-group">
                    <label>Código de matrícula *</label>
                    <input
                        required
                        value={form.enrollment_code}
                        onChange={(event) =>
                        setForm({ ...form, enrollment_code: event.target.value })
                        }
                        placeholder="Ej. 2026001"
                    />
                    </div>

                    <div className="students-form-group">
                    <label>Número de documento</label>
                    <input
                        value={form.document_number}
                        onChange={(event) =>
                        setForm({ ...form, document_number: event.target.value })
                        }
                        placeholder="DNI u otro documento"
                    />
                    </div>
                </div>
                </div>

                <div className="students-form-section">
                <div className="students-form-section-title">
                    <span className="students-form-number">02</span>
                    <div>
                    <h3>Datos académicos</h3>
                    <p>Selecciona el grado y la sección correspondiente.</p>
                    </div>
                </div>

                <div className="students-form-grid">
                    <div className="students-form-group">
                    <label>Grado *</label>
                    <select
                        required
                        value={form.grade_level_id}
                        disabled={!form.institution_id}
                        onChange={(event) =>
                        setForm({
                            ...form,
                            grade_level_id: event.target.value,
                            section_id: '',
                        })
                        }
                    >
                        <option value="">Seleccionar grado</option>
                        {availableGrades.map((grade) => (
                        <option key={grade.id} value={grade.id}>
                            {grade.name}
                        </option>
                        ))}
                    </select>
                    {!form.institution_id && (
                        <small>Primero selecciona una institución.</small>
                    )}
                    </div>

                    <div className="students-form-group">
                    <label>Sección *</label>
                    <select
                        required
                        value={form.section_id}
                        disabled={!form.grade_level_id}
                        onChange={(event) =>
                        setForm({ ...form, section_id: event.target.value })
                        }
                    >
                        <option value="">Seleccionar sección</option>
                        {availableSections.map((section) => (
                        <option key={section.id} value={section.id}>
                            {section.name}
                        </option>
                        ))}
                    </select>
                    {!form.grade_level_id && (
                        <small>Primero selecciona un grado.</small>
                    )}
                    </div>
                </div>
                </div>

                <div className="students-modal-actions">
                <button
                    type="button"
                    className="students-cancel-button"
                    onClick={() => setShowForm(false)}
                    disabled={saving}
                >
                    Cancelar
                </button>

                <button
                    type="submit"
                    className="students-save"
                    disabled={saving}
                >
                    {saving
                    ? 'Guardando...'
                    : editingId
                        ? 'Guardar cambios'
                        : 'Registrar alumno'}
                </button>
                </div>
            </form>
            </div>
        </div>
        )}


      <div className="students-stats">
        <article className="students-stat-card">
          <span>Total de alumnos</span>
          <strong>{stats.total}</strong>
        </article>

        <article className="students-stat-card">
          <span>Activos</span>
          <strong>{stats.active}</strong>
        </article>

        <article className="students-stat-card">
          <span>Inactivos</span>
          <strong>{stats.inactive}</strong>
        </article>
      </div>

      <div className="students-toolbar">
        <input
          type="search"
          placeholder="Buscar por nombre, matrícula o documento..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          value={institutionFilter}
          onChange={(event) => {
            setInstitutionFilter(event.target.value);
            setGradeFilter('all');
            setSectionFilter('all');
          }}
        >
          <option value="all">Todas las instituciones</option>
          {institutions.map((institution) => (
            <option key={institution.id} value={institution.id}>
              {institution.name}
            </option>
          ))}
        </select>

        <select
          value={gradeFilter}
          onChange={(event) => {
            setGradeFilter(event.target.value);
            setSectionFilter('all');
          }}
        >
          <option value="all">Todos los grados</option>
          {filteredGrades.map((grade) => (
            <option key={grade.id} value={grade.id}>
              {grade.name}
            </option>
          ))}
        </select>

        <select
          value={sectionFilter}
          onChange={(event) => setSectionFilter(event.target.value)}
        >
          <option value="all">Todas las secciones</option>
          {filteredSections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as StatusFilter)
          }
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      {error && (
        <div className="students-alert students-alert-error">{error}</div>
      )}

      {message && (
        <div className="students-alert students-alert-success">{message}</div>
      )}

      <div className="students-table-container">
        <div className="students-table-heading">
          <div>
            <h2>Listado de alumnos</h2>
            <span>{filteredStudents.length} resultados</span>
          </div>
        </div>

        {loading ? (
          <div className="students-empty">Cargando alumnos...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="students-empty">
            No se encontraron alumnos con esos filtros.
          </div>
        ) : (
          <div className="students-table-scroll">
            <table className="students-table">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Matrícula</th>
                  <th>Institución</th>
                  <th>Grado y sección</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="students-person">
                        <div className="students-avatar">
                          {student.first_names.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong>
                            {student.last_names}, {student.first_names}
                          </strong>
                          <small>
                            {student.document_number || 'Sin documento'}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>{student.enrollment_code}</td>
                    <td>{student.institution_name}</td>
                    <td>
                      {student.grade_name} - {student.section_name}
                    </td>

                    <td>
                      <span
                        className={`students-status ${
                          student.is_active ? 'status-active' : 'status-inactive'
                        }`}
                      >
                        {student.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>

                    <td>
                      <div className="students-actions">
                        <button
                          className="students-edit-button"
                          onClick={() => openEditForm(student)}
                        >
                          Editar
                        </button>

                        <button
                          className={
                            student.is_active
                              ? 'students-action deactivate'
                              : 'students-action activate'
                          }
                          onClick={() => changeStatus(student)}
                          disabled={updatingId === student.id}
                        >
                          {updatingId === student.id
                            ? 'Procesando...'
                            : student.is_active
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
    </section>
  );
}
