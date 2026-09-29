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

const PAGE_SIZE = 6;

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
};

const emptyForm: FormState = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
};

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || '?';
}

function employeeId(id: number) {
  return `ADM-${String(id).padStart(4, '0')}`;
}

function isThisMonth(value?: string) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

export default function ManageAdminsPage() {
  const currentUser = getStoredUser();
  const year = new Date().getFullYear();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [query, setQuery] = useState('');
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
      const rows = await apiGet<StaffMember[]>('/api/admin/staff?role=admin');
      setStaff(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admins');
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
      role: 'admin' as const,
      password: form.password || undefined,
      grade: null,
      subject: null,
    };

    try {
      if (editingId) {
        await apiPut(`/api/admin/staff/${editingId}`, payload);
        setSuccess('Admin updated.');
      } else {
        if (!form.password) throw new Error('Temporary password is required');
        await apiPost('/api/admin/staff', { ...payload, password: form.password }, true);
        setSuccess('Admin created.');
      }
      closeForm();
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save admin');
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
      setSuccess('Admin deleted.');
      if (editingId === person.id) closeForm();
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete admin');
    }
  }

  const addedThisMonth = useMemo(
    () => staff.filter((person) => isThisMonth(person.created_at)).length,
    [staff]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((person) =>
      [person.first_name, person.last_name, person.email, employeeId(person.id)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [staff, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const showingFrom = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(currentPage * PAGE_SIZE, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [query]);

  function exportCsv() {
    const header = ['Admin ID', 'First name', 'Last name', 'Email', 'Role'];
    const rows = filtered.map((person) => [
      employeeId(person.id),
      person.first_name,
      person.last_name,
      person.email,
      person.role,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admins-registry-${year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="td-page">
      <header className="td-header">
        <div>
          <div className="td-title-row">
            <h1>Admin Staff Directory</h1>
            <span className="td-cycle">{year} Academic Cycle</span>
          </div>
          <p className="td-lede">
            Manage administrator profiles with first name, last name, email, and role access.
          </p>
        </div>
        <div className="td-header-actions">
          <button className="td-btn ghost" type="button" onClick={exportCsv}>
            Export Registry
          </button>
          <button className="td-btn primary" type="button" onClick={openCreate}>
            + Add Admin
          </button>
        </div>
      </header>

      {(error || success) && (
        <p className={`portal-message ${error ? 'error' : 'success'}`}>{error || success}</p>
      )}

      <section className="td-stats" aria-label="Admin statistics">
        <article className="td-stat">
          <div className="td-stat-icon">AD</div>
          <div>
            <p className="td-stat-label">Total Admins</p>
            <p className="td-stat-value">
              {loading ? '—' : staff.length} <span>Active</span>
            </p>
            <p className="td-stat-hint">Portal administrators</p>
          </div>
        </article>
        <article className="td-stat">
          <div className="td-stat-icon">NM</div>
          <div>
            <p className="td-stat-label">Added this month</p>
            <p className="td-stat-value">{loading ? '—' : addedThisMonth}</p>
            <p className="td-stat-hint">New this calendar month</p>
          </div>
        </article>
        <article className="td-stat">
          <div className="td-stat-icon">YOU</div>
          <div>
            <p className="td-stat-label">Your account</p>
            <p className="td-stat-value">{currentUser ? '1' : '0'}</p>
            <p className="td-stat-hint">{currentUser?.email || 'Signed-in admin'}</p>
          </div>
        </article>
        <article className="td-stat">
          <div className="td-stat-icon">OT</div>
          <div>
            <p className="td-stat-label">Other admins</p>
            <p className="td-stat-value">
              {loading ? '—' : Math.max(staff.length - (currentUser ? 1 : 0), 0)}
            </p>
            <p className="td-stat-hint">Excluding you</p>
          </div>
        </article>
      </section>

      <section className="td-filters">
        <div className="td-filter-row">
          <label className="td-search">
            <span className="sr-only">Search admins</span>
            <input
              type="search"
              placeholder="Search by name, admin ID, or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button
            className="td-btn ghost"
            type="button"
            onClick={() => {
              setQuery('');
              setPage(1);
            }}
          >
            Reset
          </button>
        </div>
      </section>

      <section className="td-table-card">
        <div className="td-table-wrap">
          <table className="td-table">
            <thead>
              <tr>
                <th>Admin Name & ID</th>
                <th>Email & Contact</th>
                <th>Role / Designation</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="td-empty">
                    Loading admins…
                  </td>
                </tr>
              )}
              {!loading && pageRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="td-empty">
                    No admins match the current search.
                  </td>
                </tr>
              )}
              {!loading &&
                pageRows.map((person) => {
                  const isYou = currentUser?.id === person.id;
                  return (
                    <tr key={person.id}>
                      <td>
                        <div className="td-person">
                          <div className="td-avatar" aria-hidden="true">
                            {initials(person.first_name, person.last_name)}
                          </div>
                          <div>
                            <p className="td-person-name">
                              {person.first_name} {person.last_name}
                              {isYou ? ' · You' : ''}
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
                        <span className="td-pill role">Admin</span>
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
                            disabled={isYou}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <footer className="td-pagination">
          <p>
            Showing {showingFrom} to {showingTo} of {filtered.length} administrators
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
            aria-labelledby="ad-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="td-modal-head">
              <div>
                <p className="td-chip-label">{editingId ? 'Edit record' : 'New registration'}</p>
                <h2 id="ad-modal-title">{editingId ? 'Update admin' : 'Add admin'}</h2>
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
                  <input id="role" value="Admin" readOnly />
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
                  {submitting ? 'Saving…' : editingId ? 'Update admin' : 'Add admin'}
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
