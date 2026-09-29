import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost, getStoredUser } from '../../lib/api';
import '../admin/ManageTeachers.css';
import './TeacherForms.css';

type ContentItem = {
  id: number;
  title: string;
  subject: string;
  description: string | null;
  created_at: string;
  author: string;
};

export default function AddContentPage() {
  const year = new Date().getFullYear();
  const user = getStoredUser();
  const [profileSubject, setProfileSubject] = useState(user?.subject?.trim() || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [body, setBody] = useState('');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadItems() {
    setLoading(true);
    try {
      const me = await apiGet<{
        user: { subject?: string | null; grade?: string | null };
      }>('/api/auth/me');
      if (me.user && user) {
        localStorage.setItem(
          'edu_user',
          JSON.stringify({
            ...user,
            subject: me.user.subject ?? null,
            grade: me.user.grade ?? null,
          })
        );
        setProfileSubject(me.user.subject?.trim() || '');
      }
      const rows = await apiGet<ContentItem[]>('/api/teacher/contents');
      setItems(rows);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!profileSubject) {
      setError('Your profile has no registered subject. Ask an admin to set it first.');
      return;
    }

    setSubmitting(true);
    try {
      await apiPost(
        '/api/teacher/contents',
        { title, description, body },
        true
      );
      setSuccess('Content published.');
      setTitle('');
      setDescription('');
      setBody('');
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save content');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="td-page">
      <header className="td-header">
        <div>
          <div className="td-title-row">
            <h1>Add Content</h1>
            <span className="td-cycle">{year} Academic Cycle</span>
          </div>
          <p className="td-lede">
            Publish a new lesson or learning resource for your registered subject.
          </p>
        </div>
        <div className="td-header-actions">
          <Link className="td-btn ghost" to="/teacher">
            Back to dashboard
          </Link>
        </div>
      </header>

      <section className="td-stats" aria-label="Content statistics">
        <article className="td-stat">
          <div className="td-stat-icon">CT</div>
          <div>
            <p className="td-stat-label">Published content</p>
            <p className="td-stat-value">{loading ? '—' : String(items.length)}</p>
            <p className="td-stat-hint">Lessons & resources</p>
          </div>
        </article>
        <article className="td-stat">
          <div className="td-stat-icon">SB</div>
          <div>
            <p className="td-stat-label">Your subject</p>
            <p className="td-stat-value td-stat-value-text">
              {profileSubject || 'Not set'}
            </p>
            <p className="td-stat-hint">Applied automatically</p>
          </div>
        </article>
      </section>

      <div className="teacher-form-layout">
        <section className="td-table-card teacher-form-card">
          <div className="teacher-form-card-head">
            <p className="td-chip-label">New lesson</p>
            <h2>Publish content</h2>
          </div>

          <form className="portal-form" onSubmit={handleSubmit}>
            {error && <p className="portal-message error">{error}</p>}
            {success && <p className="portal-message success">{success}</p>}

            <div className="field">
              <label htmlFor="title">Title</label>
              <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div className="field">
              <label htmlFor="description">Short description</label>
              <input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional summary for students"
              />
            </div>

            <div className="field">
              <label htmlFor="body">Content</label>
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows={10}
                placeholder="Write the lesson content here…"
              />
            </div>

            <div className="actions">
              <button className="td-btn primary" type="submit" disabled={submitting}>
                {submitting ? 'Publishing…' : 'Publish content'}
              </button>
            </div>
          </form>
        </section>

        <section className="td-table-card">
          <div className="teacher-form-card-head">
            <p className="td-chip-label">Library</p>
            <h2>Recent content</h2>
          </div>
          {loading && <p className="td-empty">Loading…</p>}
          {!loading && items.length === 0 && (
            <p className="td-empty">No content published yet.</p>
          )}
          {!loading && items.length > 0 && (
            <ul className="teacher-recent-list">
              {items.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <div>
                    <p className="td-person-name">{item.title}</p>
                    <p className="td-person-id">{item.description || 'No description'}</p>
                  </div>
                  <span className="td-pill subject">{item.subject}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
