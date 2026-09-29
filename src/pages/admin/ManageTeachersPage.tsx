import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  getStoredUser,
  type StaffMember,
} from '../../lib/api';
import './ManageTeachers.css';

const GRADES = Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);

const SUBJECTS = [
  'English First Language',
  'English Second Language',
  'Afrikaans First Language',
  'Afrikaans Second Language',
  'Oshikwanyama First Language',
  'Oshindonga First Language',
  'Otjiherero First Language',
  'Khoekhoegowab First Language',
  'Rukwangali First Language',
  'Rumanyo First Language',
  'Silozi First Language',
  'Thimbukushu First Language',
  'Setswana First Language',
  'German First Language',
  'German Foreign Language',
  'French Foreign Language',
  'Portuguese Foreign Language',
  'Mathematics',
  'Elementary Mathematics',
  'Natural Science and Health Education',
  'Life Science',
  'Physical Science',
  'Biology',
  'Chemistry',
  'Physics',
  'Social Studies',
  'Geography',
  'History',
  'Development Studies',
  'Agricultural Science',
  'Accounting',
  'Business Studies',
  'Economics',
  'Entrepreneurship',
  'Office Practice',
  'Computer Studies',
  'Information and Communication',
  'Design and Technology',
  'Technical Drawing',
  'Technical Studies',
  'Building Studies',
  'Woodwork',
  'Metalwork and Welding',
  'Motor Mechanics',
  'Home Economics',
  'Fashion and Fabrics',
  'Hospitality',
  'Arts',
  'Art and Design',
  'Visual Art',
  'Integrated Performing Arts',
  'Life Skills',
  'Religious and Moral Education',
  'Physical Education',
  'Environmental Studies',
];

const GRADE_PHASES = [
  { id: 'all', label: 'All Grades' },
  { id: '1-3', label: 'Grades 1–3 (Junior Primary)', grades: [1, 2, 3] },
  { id: '4-7', label: 'Grades 4–7 (Senior Primary)', grades: [4, 5, 6, 7] },
  { id: '8-9', label: 'Grades 8–9 (Junior Secondary)', grades: [8, 9] },
  { id: '10-12', label: 'Grades 10–12 (Senior Secondary / NSSCO)', grades: [10, 11, 12] },
] as const;

const SUBJECT_CHIPS = [
  'All Subjects',
  'Oshikwanyama First Language',
  'Oshindonga First Language',
  'English Second Language',
  'Mathematics',
  'Physical Science',
  'Life Science',
  'Accounting',
  'Agricultural Science',
  'Computer Studies',
  'Geography',
  'History',
];

const PAGE_SIZE = 6;

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  grade: string;
  subject: string;
};

const emptyForm: FormState = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  grade: '',
  subject: '',
};

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || '?';
}

function employeeId(id: number) {
  return `EMP-${String(id).padStart(4, '0')}`;
}

function gradeNumber(grade: string | null) {
  if (!grade) return null;
  const match = grade.match(/(\d{1,2})/);
  return match ? Number(match[1]) : null;
}

function topSubjects(staff: StaffMember[]) {
  const counts = new Map<string, number>();
  for (const person of staff) {
    if (!person.subject) continue;
    counts.set(person.subject, (counts.get(person.subject) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function shortSubject(subject: string) {
  return subject
    .replace(' First Language', '')
    .replace(' Second Language', ' 2nd Lang.')
    .replace(' Foreign Language', '');
}

export default function ManageTeachersPage() {
  const currentUser = getStoredUser();
  const year = new Date().getFullYear();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<(typeof GRADE_PHASES)[number]['id']>('all');
  const [subjectChip, setSubjectChip] = useState('All Subjects');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function loadStaff() {
    setLoading(true);
    setError(null);
    try {
      const rows = await apiGet<StaffMember[]>('/api/admin/staff?role=teacher');
      setStaff(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teachers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStaff();
  }, []);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
    setError(null);
    setSuccess(null);
  }

  function openEdit(person: StaffMember) {
    setEditingId(person.id);
    setForm({
      first_name: person.first_name,
      last_name: person.last_name,
      email: person.email,
      password: '',
      grade: person.grade || '',
      subject: person.subject || '',
    });
    setFormOpen(true);
    setError(null);
    setSuccess(null);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      role: 'teacher' as const,
      password: form.password || undefined,
      grade: form.grade,
      subject: form.subject,
    };

    try {
      if (editingId) {
        await apiPut(`/api/admin/staff/${editingId}`, payload);
        setSuccess('Teacher updated.');
      } else {
        if (!form.password) throw new Error('Temporary password is required');
        await apiPost('/api/admin/staff', { ...payload, password: form.password }, true);
        setSuccess('Teacher created.');
      }
      closeForm();
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save teacher');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(person: StaffMember) {
    if (currentUser?.id === person.id) {
      setError('You cannot delete your own account');
      return;
    }
    const confirmed = window.confirm(
      `Delete ${person.first_name} ${person.last_name}? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await apiDelete(`/api/admin/staff/${person.id}`);
      setSuccess('Teacher deleted.');
      if (editingId === person.id) closeForm();
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete teacher');
    }
  }

  const rankedSubjects = useMemo(() => topSubjects(staff), [staff]);
  const subjectsCovered = useMemo(
    () => new Set(staff.map((person) => person.subject).filter(Boolean)).size,
    [staff]
  );
  const gradesCovered = useMemo(
    () => new Set(staff.map((person) => person.grade).filter(Boolean)).size,
    [staff]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selectedPhase = GRADE_PHASES.find((item) => item.id === phase);

    return staff.filter((person) => {
      const num = gradeNumber(person.grade);
      if (selectedPhase && selectedPhase.id !== 'all' && 'grades' in selectedPhase) {
        if (!num || !selectedPhase.grades.some((g) => g === num)) return false;
      }

      if (subjectChip !== 'All Subjects' && person.subject !== subjectChip) {
        return false;
      }

      if (!q) return true;
      return [
        person.first_name,
        person.last_name,
        person.email,
        person.grade,
        person.subject,
        employeeId(person.id),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [staff, query, phase, subjectChip]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const showingFrom = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(currentPage * PAGE_SIZE, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [query, phase, subjectChip]);

  function exportCsv() {
    const header = ['Employee ID', 'First name', 'Last name', 'Email', 'Role', 'Grade', 'Subject'];
    const rows = filtered.map((person) => [
      employeeId(person.id),
      person.first_name,
      person.last_name,
      person.email,
      person.role,
      person.grade || '',
      person.subject || '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `teachers-registry-${year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function resetFilters() {
    setQuery('');
    setPhase('all');
    setSubjectChip('All Subjects');
    setPage(1);
  }

  const top = rankedSubjects[0];
  const second = rankedSubjects[1];

  return (
    <div className="td-page">
      <header className="td-header">
        <div>
          <div className="td-title-row">
            <h1>Teaching Staff Directory</h1>
            <span className="td-cycle">{year} Academic Cycle</span>
          </div>
          <p className="td-lede">
            Manage teacher profiles, grade assignments (Grades 1–12), and NSSCO/NSSCAS Namibian
            curriculum subjects.
          </p>
        </div>
        <div className="td-header-actions">
          <button className="td-btn ghost" type="button" onClick={exportCsv}>
            Export Registry
          </button>
          <button className="td-btn primary" type="button" onClick={openCreate}>
            + Add Teacher
          </button>
        </div>
      </header>

      {(error || success) && (
        <p className={`portal-message ${error ? 'error' : 'success'}`}>{error || success}</p>
      )}

      <section className="td-stats" aria-label="Teacher statistics">
        <article className="td-stat">
          <div className="td-stat-icon">ID</div>
          <div>
            <p className="td-stat-label">Total Teachers</p>
            <p className="td-stat-value">
              {loading ? '—' : staff.length} <span>Certified</span>
            </p>
            <p className="td-stat-hint">Portal registry · Active teaching staff</p>
          </div>
        </article>
        <article className="td-stat">
          <div className="td-stat-icon">SB</div>
          <div>
            <p className="td-stat-label">Subjects Covered</p>
            <p className="td-stat-value">
              {loading ? '—' : subjectsCovered} <span>Curriculum Subjects</span>
            </p>
            <p className="td-stat-hint">Primary & NSSCO coverage</p>
          </div>
        </article>
        <article className="td-stat">
          <div className="td-stat-icon">GR</div>
          <div>
            <p className="td-stat-label">Grades Covered</p>
            <p className="td-stat-value">{loading ? '—' : `Grades 1–12`}</p>
            <p className="td-stat-hint">
              {loading ? '…' : `${gradesCovered} unique grade assignments`}
            </p>
          </div>
        </article>
        <article className="td-stat">
          <div className="td-stat-icon">TP</div>
          <div>
            <p className="td-stat-label">Top Subject Allocation</p>
            <p className="td-stat-value">
              {loading || !top ? '—' : shortSubject(top[0])}{' '}
              <span>{top ? `${top[1]} Teachers` : ''}</span>
            </p>
            <p className="td-stat-hint">
              {second ? `${shortSubject(second[0])} (${second[1]})` : 'No secondary subject yet'}
            </p>
          </div>
        </article>
      </section>

      <section className="td-filters">
        <div className="td-filter-row">
          <label className="td-search">
            <span className="sr-only">Search teachers</span>
            <input
              type="search"
              placeholder="Search by name, employee ID, email, or subject…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button className="td-btn ghost" type="button" onClick={resetFilters}>
            Reset
          </button>
        </div>

        <div className="td-chip-block">
          <p className="td-chip-label">Education Phases & Grades</p>
          <div className="td-chips">
            {GRADE_PHASES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={phase === item.id ? 'td-chip active' : 'td-chip'}
                onClick={() => setPhase(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="td-chip-block">
          <p className="td-chip-label">Namibian Curriculum Subjects</p>
          <div className="td-chips">
            {SUBJECT_CHIPS.map((subject) => (
              <button
                key={subject}
                type="button"
                className={subjectChip === subject ? 'td-chip active' : 'td-chip'}
                onClick={() => setSubjectChip(subject)}
              >
                {subject === 'All Subjects' ? subject : shortSubject(subject)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="td-table-card">
        <div className="td-table-wrap">
          <table className="td-table">
            <thead>
              <tr>
                <th>Teacher Name & ID</th>
                <th>Email & Contact</th>
                <th>Role / Designation</th>
                <th>Grade(s) Assigned</th>
                <th>Namibian Subject(s)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="td-empty">
                    Loading teachers…
                  </td>
                </tr>
              )}
              {!loading && pageRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="td-empty">
                    No teachers match the current filters.
                  </td>
                </tr>
              )}
              {!loading &&
                pageRows.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <div className="td-person">
                        <div className="td-avatar" aria-hidden="true">
                          {initials(person.first_name, person.last_name)}
                        </div>
                        <div>
                          <p className="td-person-name">
                            {person.first_name} {person.last_name}
                          </p>
                          <p className="td-person-id">{employeeId(person.id)}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <a className="td-email" href={`mailto:${person.email}`}>
                        {person.email}
                      </a>
                    </td>
                    <td>
                      <span className="td-pill role">Teacher</span>
                    </td>
                    <td>
                      {person.grade ? (
                        <span className="td-pill grade">{person.grade}</span>
                      ) : (
                        <span className="td-muted">—</span>
                      )}
                    </td>
                    <td>
                      {person.subject ? (
                        <span className="td-pill subject">{person.subject}</span>
                      ) : (
                        <span className="td-muted">—</span>
                      )}
                    </td>
                    <td>
                      <span className="td-status">
                        <span className="td-status-dot" />
                        Active
                      </span>
                    </td>
                    <td>
                      <div className="td-actions">
                        <button
                          type="button"
                          className="td-icon-btn"
                          aria-label={`Edit ${person.first_name}`}
                          onClick={() => openEdit(person)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="td-icon-btn danger"
                          aria-label={`Delete ${person.first_name}`}
                          onClick={() => void handleDelete(person)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <footer className="td-pagination">
          <p>
            Showing {showingFrom} to {showingTo} of {filtered.length} certified educators
          </p>
          <div className="td-pages">
            <button
              type="button"
              className="td-page-btn"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1)
              .filter((pageNumber) => {
                if (totalPages <= 7) return true;
                return (
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  Math.abs(pageNumber - currentPage) <= 1
                );
              })
              .map((pageNumber, index, arr) => {
                const prev = arr[index - 1];
                const showEllipsis = prev && pageNumber - prev > 1;
                return (
                  <span key={pageNumber} className="td-page-group">
                    {showEllipsis && <span className="td-ellipsis">…</span>}
                    <button
                      type="button"
                      className={pageNumber === currentPage ? 'td-page-btn active' : 'td-page-btn'}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  </span>
                );
              })}
            <button
              type="button"
              className="td-page-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              ›
            </button>
          </div>
        </footer>
      </section>

      {formOpen && (
        <div className="td-modal-backdrop" role="presentation" onClick={closeForm}>
          <div
            className="td-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="td-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="td-modal-head">
              <div>
                <p className="td-chip-label">{editingId ? 'Edit record' : 'New registration'}</p>
                <h2 id="td-modal-title">{editingId ? 'Update teacher' : 'Add teacher'}</h2>
              </div>
              <button type="button" className="td-btn ghost" onClick={closeForm}>
                Close
              </button>
            </div>

            <form className="portal-form" onSubmit={handleSubmit}>
              {error && <p className="portal-message error">{error}</p>}

              <div className="portal-form-grid">
                <div className="field">
                  <label htmlFor="first_name">First name</label>
                  <input
                    id="first_name"
                    value={form.first_name}
                    onChange={(e) => updateField('first_name', e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="last_name">Last name</label>
                  <input
                    id="last_name"
                    value={form.last_name}
                    onChange={(e) => updateField('last_name', e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="role">Role</label>
                  <input id="role" value="Teacher" readOnly />
                </div>
                <div className="field">
                  <label htmlFor="grade">Grade</label>
                  <select
                    id="grade"
                    value={form.grade}
                    onChange={(e) => updateField('grade', e.target.value)}
                    required
                  >
                    <option value="">Select grade</option>
                    {GRADES.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="subject">Subject</label>
                  <select
                    id="subject"
                    value={form.subject}
                    onChange={(e) => updateField('subject', e.target.value)}
                    required
                  >
                    <option value="">Select subject</option>
                    {SUBJECTS.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field portal-form-span">
                  <label htmlFor="password">
                    {editingId ? 'New password (optional)' : 'Temporary password'}
                  </label>
                  <input
                    id="password"
                    type="password"
                    minLength={editingId ? undefined : 8}
                    value={form.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    required={!editingId}
                    placeholder={editingId ? 'Leave blank to keep current password' : undefined}
                  />
                </div>
              </div>

              <div className="actions">
                <button className="td-btn primary" type="submit" disabled={submitting}>
                  {submitting ? 'Saving…' : editingId ? 'Update teacher' : 'Add teacher'}
                </button>
                <button className="td-btn ghost" type="button" onClick={closeForm}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
