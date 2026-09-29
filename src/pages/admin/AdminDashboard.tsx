import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, type StaffMember } from '../../lib/api';
import './ManageTeachers.css';

export default function AdminDashboard() {
  const year = new Date().getFullYear();
  const [admins, setAdmins] = useState<StaffMember[]>([]);
  const [teachers, setTeachers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiGet<StaffMember[]>('/api/admin/staff?role=admin'),
      apiGet<StaffMember[]>('/api/admin/staff?role=teacher'),
    ])
      .then(([adminRows, teacherRows]) => {
        setAdmins(adminRows);
        setTeachers(teacherRows);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  const subjects = new Set(teachers.map((person) => person.subject).filter(Boolean)).size;
  const grades = new Set(teachers.map((person) => person.grade).filter(Boolean)).size;

  return (
    <div className="td-page">
      <header className="td-header">
        <div>
          <div className="td-title-row">
            <h1>Admin Dashboard</h1>
            <span className="td-cycle">{year} Academic Cycle</span>
          </div>
          <p className="td-lede">
            Track portal staffing at a glance, then manage admins and teachers.
          </p>
        </div>
        <div className="td-header-actions">
          <Link className="td-btn ghost" to="/admin/admins">
            Manage Admins
          </Link>
          <Link className="td-btn primary" to="/admin/teachers">
            Manage Teachers
          </Link>
        </div>
      </header>

      {error && <p className="portal-message error">{error}</p>}

      <section className="td-stats" aria-label="Staffing statistics">
        <article className="td-stat">
          <div className="td-stat-icon">AD</div>
          <div>
            <p className="td-stat-label">Admins</p>
            <p className="td-stat-value">{loading ? '—' : String(admins.length)}</p>
            <p className="td-stat-hint">Portal administrators</p>
          </div>
        </article>
        <article className="td-stat">
          <div className="td-stat-icon">TC</div>
          <div>
            <p className="td-stat-label">Teachers</p>
            <p className="td-stat-value">{loading ? '—' : String(teachers.length)}</p>
            <p className="td-stat-hint">Teaching accounts</p>
          </div>
        </article>
        <article className="td-stat">
          <div className="td-stat-icon">SB</div>
          <div>
            <p className="td-stat-label">Subjects covered</p>
            <p className="td-stat-value">{loading ? '—' : String(subjects)}</p>
            <p className="td-stat-hint">Unique teacher subjects</p>
          </div>
        </article>
        <article className="td-stat">
          <div className="td-stat-icon">GR</div>
          <div>
            <p className="td-stat-label">Grades covered</p>
            <p className="td-stat-value">{loading ? '—' : String(grades)}</p>
            <p className="td-stat-hint">Unique teacher grades</p>
          </div>
        </article>
      </section>

      <div className="td-dash-grid">
        <Link className="td-dash-card" to="/admin/admins">
          <p className="td-chip-label">Directory</p>
          <h2>Manage admins</h2>
          <p>Add, update, or remove administrator accounts.</p>
          <span className="td-dash-meta">
            {loading ? '…' : `${admins.length} admin${admins.length === 1 ? '' : 's'}`}
          </span>
        </Link>
        <Link className="td-dash-card" to="/admin/teachers">
          <p className="td-chip-label">Directory</p>
          <h2>Manage teachers</h2>
          <p>Maintain teacher accounts with grade and subject details.</p>
          <span className="td-dash-meta">
            {loading ? '…' : `${teachers.length} teacher${teachers.length === 1 ? '' : 's'}`}
          </span>
        </Link>
      </div>
    </div>
  );
}
