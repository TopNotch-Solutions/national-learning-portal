import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, getStoredUser } from '../../lib/api';
import '../admin/ManageTeachers.css';

type Counts = {
  contents: number;
  quizzes: number;
  pastPapers: number;
  memos: number;
};

export default function TeacherDashboard() {
  const year = new Date().getFullYear();
  const user = getStoredUser();
  const [counts, setCounts] = useState<Counts>({
    contents: 0,
    quizzes: 0,
    pastPapers: 0,
    memos: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<unknown[]>('/api/teacher/contents').catch(() => []),
      apiGet<unknown[]>('/api/teacher/quizzes').catch(() => []),
      apiGet<unknown[]>('/api/teacher/past-papers').catch(() => []),
      apiGet<unknown[]>('/api/teacher/memos').catch(() => []),
    ])
      .then(([contents, quizzes, pastPapers, memos]) => {
        setCounts({
          contents: contents.length,
          quizzes: quizzes.length,
          pastPapers: pastPapers.length,
          memos: memos.length,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const examTotal = counts.pastPapers + counts.memos;

  return (
    <div className="td-page">
      <header className="td-header">
        <div>
          <div className="td-title-row">
            <h1>Teacher Dashboard</h1>
            <span className="td-cycle">{year} Academic Cycle</span>
          </div>
          <p className="td-lede">
            Publish learning materials for your
            {user?.subject ? ` ${user.subject}` : ''} students — content, quizzes, past papers, and
            memos.
          </p>
        </div>
        <div className="td-header-actions">
          <Link className="td-btn ghost" to="/teacher/content/new">
            + Add content
          </Link>
          <Link className="td-btn primary" to="/teacher/quizzes">
            Manage quizzes
          </Link>
        </div>
      </header>

      <section className="td-stats" aria-label="Teaching materials overview">
        <article className="td-stat">
          <div className="td-stat-icon">CT</div>
          <div>
            <p className="td-stat-label">Content</p>
            <p className="td-stat-value">{loading ? '—' : String(counts.contents)}</p>
            <p className="td-stat-hint">Lessons & resources</p>
          </div>
        </article>
        <article className="td-stat">
          <div className="td-stat-icon">QZ</div>
          <div>
            <p className="td-stat-label">Quizzes</p>
            <p className="td-stat-value">{loading ? '—' : String(counts.quizzes)}</p>
            <p className="td-stat-hint">Assessments published</p>
          </div>
        </article>
        <article className="td-stat">
          <div className="td-stat-icon">EX</div>
          <div>
            <p className="td-stat-label">Exams & memos</p>
            <p className="td-stat-value">{loading ? '—' : String(examTotal)}</p>
            <p className="td-stat-hint">
              {loading
                ? '…'
                : `${counts.pastPapers} papers · ${counts.memos} memos`}
            </p>
          </div>
        </article>
        <article className="td-stat">
          <div className="td-stat-icon">SB</div>
          <div>
            <p className="td-stat-label">Your subject</p>
            <p className="td-stat-value td-stat-value-text">
              {user?.subject || 'Not set'}
            </p>
            <p className="td-stat-hint">Registered teaching subject</p>
          </div>
        </article>
      </section>

      <div className="td-dash-grid td-dash-grid-3">
        <Link className="td-dash-card" to="/teacher/content/new">
          <p className="td-chip-label">Lessons</p>
          <h2>Add content</h2>
          <p>Create lessons, notes, and subject learning material.</p>
          <span className="td-dash-meta">
            {loading ? '…' : `${counts.contents} item${counts.contents === 1 ? '' : 's'}`}
          </span>
        </Link>
        <Link className="td-dash-card" to="/teacher/quizzes">
          <p className="td-chip-label">Assessment</p>
          <h2>Manage quizzes</h2>
          <p>Build true/false, single-choice, and multiple-choice quizzes.</p>
          <span className="td-dash-meta">
            {loading ? '…' : `${counts.quizzes} quiz${counts.quizzes === 1 ? '' : 'zes'}`}
          </span>
        </Link>
        <Link className="td-dash-card" to="/teacher/exams">
          <p className="td-chip-label">Exams</p>
          <h2>Past papers & memos</h2>
          <p>Share exam papers and marking memoranda together.</p>
          <span className="td-dash-meta">
            {loading
              ? '…'
              : `${counts.pastPapers} paper${counts.pastPapers === 1 ? '' : 's'} · ${counts.memos} memo${counts.memos === 1 ? '' : 's'}`}
          </span>
        </Link>
      </div>
    </div>
  );
}
