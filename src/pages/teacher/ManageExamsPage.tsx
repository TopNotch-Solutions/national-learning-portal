import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiUpload, fileUrl, getStoredUser } from '../../lib/api';
import '../admin/ManageTeachers.css';
import './TeacherForms.css';

type PastPaper = {
  id: number;
  title: string;
  subject: string;
  year: number;
  description: string | null;
  file_url: string | null;
  created_at: string;
  author: string;
};

type Memo = {
  id: number;
  title: string;
  subject: string;
  year: number;
  description: string | null;
  file_url: string | null;
  past_paper_id: number | null;
  past_paper_title?: string | null;
  created_at: string;
  author: string;
};

type Tab = 'paper' | 'memo';
type ModalType = 'paper' | 'memo' | null;

const DOC_ACCEPT =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export default function ManageExamsPage() {
  const academicYear = new Date().getFullYear();
  const user = getStoredUser();
  const [tab, setTab] = useState<Tab>('paper');
  const [modal, setModal] = useState<ModalType>(null);
  const [profileSubject, setProfileSubject] = useState(user?.subject?.trim() || '');
  const [papers, setPapers] = useState<PastPaper[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [paperTitle, setPaperTitle] = useState('');
  const [paperYear, setPaperYear] = useState(String(academicYear));
  const [paperFile, setPaperFile] = useState<File | null>(null);

  const [memoPastPaperId, setMemoPastPaperId] = useState('');
  const [memoFile, setMemoFile] = useState<File | null>(null);

  async function loadData() {
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

      const [paperRows, memoRows] = await Promise.all([
        apiGet<PastPaper[]>('/api/teacher/past-papers'),
        apiGet<Memo[]>('/api/teacher/memos'),
      ]);
      setPapers(paperRows);
      setMemos(memoRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exam materials');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const linkedMemoCount = useMemo(
    () => memos.filter((memo) => memo.past_paper_id != null).length,
    [memos]
  );

  function paperTitleById(id: number | null, fallback?: string | null) {
    if (!id) return 'Missing paper link';
    return fallback || papers.find((paper) => paper.id === id)?.title || `Paper #${id}`;
  }

  function resetPaperForm() {
    setPaperTitle('');
    setPaperYear(String(new Date().getFullYear()));
    setPaperFile(null);
  }

  function resetMemoForm() {
    setMemoPastPaperId('');
    setMemoFile(null);
  }

  function openModal(type: 'paper' | 'memo') {
    if (!profileSubject) {
      setError('Your profile has no registered subject. Ask an admin to set it first.');
      return;
    }
    if (type === 'memo' && papers.length === 0) {
      setError('Add a past paper first. A memo can only be linked to an existing past paper.');
      return;
    }
    setError(null);
    setSuccess(null);
    if (type === 'paper') resetPaperForm();
    else resetMemoForm();
    setModal(type);
    setTab(type);
  }

  function closeModal() {
    setModal(null);
    resetPaperForm();
    resetMemoForm();
  }

  async function handlePaperSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!paperFile) {
      setError('Upload a PDF or Word document for the past paper.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', paperTitle.trim());
      formData.append('year', paperYear);
      formData.append('file', paperFile);
      await apiUpload('/api/teacher/past-papers', formData);
      setSuccess('Past paper added.');
      closeModal();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save past paper');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMemoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!memoPastPaperId) {
      setError('Select a past paper. A memo must be linked to a past paper.');
      return;
    }
    if (!memoFile) {
      setError('Upload a PDF or Word document for the memo.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('past_paper_id', memoPastPaperId);
      formData.append('file', memoFile);
      await apiUpload('/api/teacher/memos', formData);
      setSuccess('Memo added.');
      closeModal();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save memo');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="td-page">
      <header className="td-header">
        <div>
          <div className="td-title-row">
            <h1>Past Papers & Memos</h1>
            <span className="td-cycle">{academicYear} Academic Cycle</span>
          </div>
          <p className="td-lede">
            Upload exam papers and marking memos as PDF or Word files for your registered subject.
          </p>
        </div>
        <div className="td-header-actions">
          <button className="td-btn ghost" type="button" onClick={() => openModal('paper')}>
            + Add past paper
          </button>
          <button className="td-btn primary" type="button" onClick={() => openModal('memo')}>
            + Add memo
          </button>
        </div>
      </header>

      {(error || success) && !modal && (
        <p className={`portal-message ${error ? 'error' : 'success'}`}>{error || success}</p>
      )}

      <section className="td-stats" aria-label="Exam materials statistics">
        <article className="td-stat">
          <div className="td-stat-icon">PP</div>
          <div>
            <p className="td-stat-label">Past papers</p>
            <p className="td-stat-value">{loading ? '—' : String(papers.length)}</p>
            <p className="td-stat-hint">Exam papers shared</p>
          </div>
        </article>
        <article className="td-stat">
          <div className="td-stat-icon">MM</div>
          <div>
            <p className="td-stat-label">Memos</p>
            <p className="td-stat-value">{loading ? '—' : String(memos.length)}</p>
            <p className="td-stat-hint">Marking guides</p>
          </div>
        </article>
        <article className="td-stat">
          <div className="td-stat-icon">LK</div>
          <div>
            <p className="td-stat-label">Linked memos</p>
            <p className="td-stat-value">{loading ? '—' : String(linkedMemoCount)}</p>
            <p className="td-stat-hint">Tied to a past paper</p>
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

      <section className="td-filters">
        <div className="td-filter-row exam-filter-row">
          <div className="td-chip-block">
            <p className="td-chip-label">Material type</p>
            <div className="td-chips">
              <button
                type="button"
                className={tab === 'paper' ? 'td-chip active' : 'td-chip'}
                onClick={() => setTab('paper')}
              >
                Past papers
              </button>
              <button
                type="button"
                className={tab === 'memo' ? 'td-chip active' : 'td-chip'}
                onClick={() => setTab('memo')}
              >
                Memos
              </button>
            </div>
          </div>
          <Link className="td-btn ghost" to="/teacher">
            Back to dashboard
          </Link>
        </div>
      </section>

      <section className="td-table-card teacher-form-card">
        <div className="teacher-form-card-head exam-list-head">
          <div>
            <p className="td-chip-label">{tab === 'paper' ? 'Archive' : 'Marking guides'}</p>
            <h2>{tab === 'paper' ? 'Past papers' : 'Memos'}</h2>
          </div>
          <button className="td-btn primary" type="button" onClick={() => openModal(tab)}>
            {tab === 'paper' ? '+ Add past paper' : '+ Add memo'}
          </button>
        </div>

        {loading && <p className="td-empty">Loading…</p>}
        {!loading && tab === 'paper' && papers.length === 0 && (
          <p className="td-empty">No past papers added yet.</p>
        )}
        {!loading && tab === 'memo' && memos.length === 0 && (
          <p className="td-empty">No memos added yet.</p>
        )}

        {!loading && tab === 'paper' && papers.length > 0 && (
          <div className="td-table-wrap">
            <table className="td-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Year</th>
                  <th>Subject</th>
                  <th>File</th>
                </tr>
              </thead>
              <tbody>
                {papers.map((paper) => {
                  const href = fileUrl(paper.file_url);
                  return (
                    <tr key={paper.id}>
                      <td>
                        <p className="td-person-name">{paper.title}</p>
                      </td>
                      <td>{paper.year}</td>
                      <td>
                        <span className="td-pill subject">{paper.subject}</span>
                      </td>
                      <td>
                        {href ? (
                          <a className="td-email" href={href} target="_blank" rel="noreferrer">
                            Download
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && tab === 'memo' && memos.length > 0 && (
          <div className="td-table-wrap">
            <table className="td-table">
              <thead>
                <tr>
                  <th>Past paper</th>
                  <th>Year</th>
                  <th>Subject</th>
                  <th>Memo file</th>
                </tr>
              </thead>
              <tbody>
                {memos.map((memo) => {
                  const href = fileUrl(memo.file_url);
                  return (
                    <tr key={memo.id}>
                      <td>
                        <p className="td-person-name">
                          {paperTitleById(memo.past_paper_id, memo.past_paper_title)}
                        </p>
                      </td>
                      <td>{memo.year}</td>
                      <td>
                        <span className="td-pill subject">{memo.subject}</span>
                      </td>
                      <td>
                        {href ? (
                          <a className="td-email" href={href} target="_blank" rel="noreferrer">
                            Download
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modal === 'paper' && (
        <div className="td-modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="td-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="paper-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="td-modal-head">
              <div>
                <p className="td-chip-label">New paper</p>
                <h2 id="paper-modal-title">Add past paper</h2>
              </div>
              <button type="button" className="td-btn ghost" onClick={closeModal}>
                Close
              </button>
            </div>

            <form className="portal-form" onSubmit={handlePaperSubmit}>
              {error && <p className="portal-message error">{error}</p>}

              <div className="field">
                <label htmlFor="paper-title">Title</label>
                <input
                  id="paper-title"
                  value={paperTitle}
                  onChange={(e) => setPaperTitle(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="paper-year">Year</label>
                <input
                  id="paper-year"
                  type="number"
                  min={1990}
                  max={2100}
                  value={paperYear}
                  onChange={(e) => setPaperYear(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="paper-file">File (PDF or Word)</label>
                <input
                  id="paper-file"
                  type="file"
                  accept={DOC_ACCEPT}
                  required
                  onChange={(e) => setPaperFile(e.target.files?.[0] || null)}
                />
                {paperFile && <p className="quiz-field-hint">{paperFile.name}</p>}
              </div>
              <div className="actions">
                <button className="td-btn primary" type="submit" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save past paper'}
                </button>
                <button className="td-btn ghost" type="button" onClick={closeModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'memo' && (
        <div className="td-modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="td-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="memo-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="td-modal-head">
              <div>
                <p className="td-chip-label">New memo</p>
                <h2 id="memo-modal-title">Add memo</h2>
              </div>
              <button type="button" className="td-btn ghost" onClick={closeModal}>
                Close
              </button>
            </div>

            <form className="portal-form" onSubmit={handleMemoSubmit}>
              {error && <p className="portal-message error">{error}</p>}

              <div className="field">
                <label htmlFor="memo-paper">Past paper</label>
                <select
                  id="memo-paper"
                  value={memoPastPaperId}
                  onChange={(e) => setMemoPastPaperId(e.target.value)}
                  required
                >
                  <option value="">Select a past paper</option>
                  {papers.map((paper) => (
                    <option key={paper.id} value={paper.id}>
                      {paper.year} — {paper.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="memo-file">File (PDF or Word)</label>
                <input
                  id="memo-file"
                  type="file"
                  accept={DOC_ACCEPT}
                  required
                  onChange={(e) => setMemoFile(e.target.files?.[0] || null)}
                />
                {memoFile && <p className="quiz-field-hint">{memoFile.name}</p>}
              </div>
              <div className="actions">
                <button className="td-btn primary" type="submit" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save memo'}
                </button>
                <button className="td-btn ghost" type="button" onClick={closeModal}>
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
