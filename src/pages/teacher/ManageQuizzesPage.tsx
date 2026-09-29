import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  getStoredUser,
} from '../../lib/api';
import '../admin/ManageTeachers.css';
import './ManageQuizzes.css';

type QuestionType = 'true_false' | 'single' | 'multiple';

type Question = {
  key: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  answers: string[];
};

type Quiz = {
  id: number;
  title: string;
  subject: string;
  description: string | null;
  questions: Array<{
    type: QuestionType;
    prompt: string;
    options: string[];
    answers: string[];
  }>;
  question_count?: number;
  created_at: string;
  created_by: number;
  author: string;
};

const PAGE_SIZE = 6;

const TYPE_LABELS: Record<QuestionType, string> = {
  true_false: 'True / False',
  single: 'Single choice',
  multiple: 'Multiple choice',
};

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyQuestion(type: QuestionType = 'single'): Question {
  if (type === 'true_false') {
    return {
      key: newKey(),
      type,
      prompt: '',
      options: ['True', 'False'],
      answers: [],
    };
  }
  return {
    key: newKey(),
    type,
    prompt: '',
    options: ['', '', '', ''],
    answers: [],
  };
}

function questionCount(quiz: Quiz) {
  return quiz.question_count ?? quiz.questions?.length ?? 0;
}

export default function ManageQuizzesPage() {
  const currentUser = getStoredUser();
  const registeredSubject = currentUser?.subject?.trim() || '';
  const year = new Date().getFullYear();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | QuestionType>('all');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion()]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [profileSubject, setProfileSubject] = useState(registeredSubject);

  async function loadQuizzes() {
    setLoading(true);
    setError(null);
    try {
      const me = await apiGet<{
        user: {
          id: number;
          name: string;
          email: string;
          role: 'admin' | 'teacher' | 'student';
          grade?: string | null;
          subject?: string | null;
        };
      }>('/api/auth/me');
      if (me.user && currentUser) {
        const nextUser = {
          ...currentUser,
          subject: me.user.subject ?? null,
          grade: me.user.grade ?? null,
        };
        localStorage.setItem('edu_user', JSON.stringify(nextUser));
        setProfileSubject(me.user.subject?.trim() || '');
      }
      const rows = await apiGet<Quiz[]>('/api/teacher/quizzes');
      setQuizzes(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQuizzes();
  }, []);

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setQuestions([emptyQuestion()]);
  }

  function openCreate() {
    if (!profileSubject) {
      setError('Your profile has no registered subject. Ask an admin to set it first.');
      return;
    }
    resetForm();
    setFormOpen(true);
    setError(null);
    setSuccess(null);
  }

  function openEdit(quiz: Quiz) {
    setEditingId(quiz.id);
    setTitle(quiz.title);
    setDescription(quiz.description || '');
    setQuestions(
      (quiz.questions || []).map((question) => ({
        key: newKey(),
        type: question.type || 'single',
        prompt: question.prompt || '',
        options:
          question.type === 'true_false'
            ? ['True', 'False']
            : question.options?.length
              ? question.options
              : ['', ''],
        answers: question.answers || [],
      }))
    );
    setFormOpen(true);
    setError(null);
    setSuccess(null);
  }

  function closeForm() {
    setFormOpen(false);
    resetForm();
  }

  function setQuestionType(index: number, type: QuestionType) {
    setQuestions((current) =>
      current.map((question, i) => {
        if (i !== index) return question;
        if (type === 'true_false') {
          return {
            ...question,
            type,
            options: ['True', 'False'],
            answers: [],
          };
        }

        const leavingTrueFalse = question.type === 'true_false';
        const options = leavingTrueFalse
          ? ['', '', '', '']
          : question.options.length >= 2
            ? question.options
            : ['', '', '', ''];

        return {
          ...question,
          type,
          options,
          answers: leavingTrueFalse
            ? []
            : type === 'single'
              ? question.answers.slice(0, 1)
              : question.answers,
        };
      })
    );
  }

  function updateQuestion(index: number, patch: Partial<Question>) {
    setQuestions((current) =>
      current.map((question, i) => (i === index ? { ...question, ...patch } : question))
    );
  }

  function updateOption(questionIndex: number, optionIndex: number, value: string) {
    setQuestions((current) =>
      current.map((question, i) => {
        if (i !== questionIndex) return question;
        const options = [...question.options];
        const previous = options[optionIndex];
        options[optionIndex] = value;
        const answers = question.answers.map((answer) => (answer === previous ? value : answer));
        return { ...question, options, answers };
      })
    );
  }

  function addOption(questionIndex: number) {
    setQuestions((current) =>
      current.map((question, i) =>
        i === questionIndex ? { ...question, options: [...question.options, ''] } : question
      )
    );
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    setQuestions((current) =>
      current.map((question, i) => {
        if (i !== questionIndex) return question;
        if (question.options.length <= 2) return question;
        const removed = question.options[optionIndex];
        return {
          ...question,
          options: question.options.filter((_, idx) => idx !== optionIndex),
          answers: question.answers.filter((answer) => answer !== removed),
        };
      })
    );
  }

  function toggleAnswer(questionIndex: number, option: string, exclusive: boolean) {
    setQuestions((current) =>
      current.map((question, i) => {
        if (i !== questionIndex) return question;
        if (exclusive) {
          return { ...question, answers: [option] };
        }
        const exists = question.answers.includes(option);
        return {
          ...question,
          answers: exists
            ? question.answers.filter((answer) => answer !== option)
            : [...question.answers, option],
        };
      })
    );
  }

  function removeQuestion(index: number) {
    setQuestions((current) => (current.length === 1 ? current : current.filter((_, i) => i !== index)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const payloadQuestions = questions.map((question) => ({
      type: question.type,
      prompt: question.prompt.trim(),
      options:
        question.type === 'true_false'
          ? ['True', 'False']
          : question.options.map((option) => option.trim()).filter(Boolean),
      answers: question.answers.map((answer) => answer.trim()).filter(Boolean),
    }));

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        questions: payloadQuestions,
      };

      if (editingId) {
        await apiPut(`/api/teacher/quizzes/${editingId}`, payload);
        setSuccess('Quiz updated.');
      } else {
        await apiPost('/api/teacher/quizzes', payload, true);
        setSuccess('Quiz created.');
      }
      closeForm();
      await loadQuizzes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save quiz');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(quiz: Quiz) {
    if (currentUser?.role !== 'admin' && currentUser?.id !== quiz.created_by) {
      setError('You can only delete your own quizzes');
      return;
    }
    const confirmed = window.confirm(`Delete “${quiz.title}”? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await apiDelete(`/api/teacher/quizzes/${quiz.id}`);
      setSuccess('Quiz deleted.');
      if (editingId === quiz.id) closeForm();
      await loadQuizzes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete quiz');
    }
  }

  const stats = useMemo(() => {
    const mine = quizzes.filter((quiz) => quiz.created_by === currentUser?.id).length;
    const withTf = quizzes.filter((quiz) =>
      quiz.questions?.some((question) => question.type === 'true_false')
    ).length;
    const withMulti = quizzes.filter((quiz) =>
      quiz.questions?.some((question) => question.type === 'multiple')
    ).length;
    return [
      { label: 'Total quizzes', value: String(quizzes.length), hint: 'Published assessments' },
      { label: 'Your quizzes', value: String(mine), hint: 'Created by you' },
      { label: 'True / False', value: String(withTf), hint: 'Quizzes using T/F' },
      { label: 'Multi-select', value: String(withMulti), hint: 'Quizzes using multi choice' },
    ];
  }, [quizzes, currentUser]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return quizzes.filter((quiz) => {
      if (typeFilter !== 'all') {
        const hasType = quiz.questions?.some((question) => question.type === typeFilter);
        if (!hasType) return false;
      }
      if (!q) return true;
      return [quiz.title, quiz.subject, quiz.description, quiz.author]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [quizzes, query, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const showingFrom = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(currentPage * PAGE_SIZE, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [query, typeFilter]);

  return (
    <div className="td-page">
      <header className="td-header">
        <div>
          <div className="td-title-row">
            <h1>Quiz Builder</h1>
            <span className="td-cycle">{year} Academic Cycle</span>
          </div>
          <p className="td-lede">
            Create and manage quizzes with true/false, single-choice, and multiple-choice
            questions.
          </p>
        </div>
        <div className="td-header-actions">
          <button className="td-btn primary" type="button" onClick={openCreate}>
            + Add Quiz
          </button>
        </div>
      </header>

      {(error || success) && (
        <p className={`portal-message ${error ? 'error' : 'success'}`}>{error || success}</p>
      )}

      <section className="td-stats" aria-label="Quiz statistics">
        {stats.map((stat) => (
          <article key={stat.label} className="td-stat">
            <div className="td-stat-icon">{stat.label.slice(0, 2).toUpperCase()}</div>
            <div>
              <p className="td-stat-label">{stat.label}</p>
              <p className="td-stat-value">{loading ? '—' : stat.value}</p>
              <p className="td-stat-hint">{stat.hint}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="td-filters">
        <div className="td-filter-row">
          <label className="td-search">
            <span className="sr-only">Search quizzes</span>
            <input
              type="search"
              placeholder="Search by title, subject, or author…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button
            className="td-btn ghost"
            type="button"
            onClick={() => {
              setQuery('');
              setTypeFilter('all');
            }}
          >
            Reset
          </button>
        </div>
        <div className="td-chip-block">
          <p className="td-chip-label">Question types</p>
          <div className="td-chips">
            {(
              [
                ['all', 'All types'],
                ['true_false', 'True / False'],
                ['single', 'Single choice'],
                ['multiple', 'Multiple choice'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={typeFilter === value ? 'td-chip active' : 'td-chip'}
                onClick={() => setTypeFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="td-table-card">
        <div className="td-table-wrap">
          <table className="td-table quiz-table">
            <thead>
              <tr>
                <th>Quiz</th>
                <th>Subject</th>
                <th>Questions</th>
                <th>Types used</th>
                <th>Author</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="td-empty">
                    Loading quizzes…
                  </td>
                </tr>
              )}
              {!loading && pageRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="td-empty">
                    No quizzes match the current filters.
                  </td>
                </tr>
              )}
              {!loading &&
                pageRows.map((quiz) => {
                  const types = [...new Set((quiz.questions || []).map((q) => q.type))];
                  const canEdit =
                    currentUser?.role === 'admin' || currentUser?.id === quiz.created_by;
                  return (
                    <tr key={quiz.id}>
                      <td>
                        <p className="td-person-name">{quiz.title}</p>
                        <p className="td-person-id">
                          {quiz.description || 'No description'}
                        </p>
                      </td>
                      <td>
                        <span className="td-pill subject">{quiz.subject}</span>
                      </td>
                      <td>{questionCount(quiz)}</td>
                      <td>
                        <div className="quiz-type-row">
                          {types.length === 0 && <span className="td-muted">—</span>}
                          {types.map((type) => (
                            <span key={type} className={`quiz-type-pill ${type}`}>
                              {TYPE_LABELS[type]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{quiz.author}</td>
                      <td>
                        <div className="td-actions">
                          <button
                            type="button"
                            className="td-icon-btn"
                            disabled={!canEdit}
                            onClick={() => openEdit(quiz)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="td-icon-btn danger"
                            disabled={!canEdit}
                            onClick={() => void handleDelete(quiz)}
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
            Showing {showingFrom} to {showingTo} of {filtered.length} quizzes
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
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={pageNumber === currentPage ? 'td-page-btn active' : 'td-page-btn'}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
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
            className="td-modal quiz-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quiz-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="td-modal-head">
              <div>
                <p className="td-chip-label">{editingId ? 'Edit quiz' : 'New quiz'}</p>
                <h2 id="quiz-modal-title">{editingId ? 'Update quiz' : 'Add quiz'}</h2>
              </div>
              <button type="button" className="td-btn ghost" onClick={closeForm}>
                Close
              </button>
            </div>

            <form className="portal-form" onSubmit={handleSubmit}>
              {error && <p className="portal-message error">{error}</p>}

              <div className="portal-form-grid">
                <div className="field portal-form-span">
                  <label htmlFor="quiz-title">Quiz title</label>
                  <input
                    id="quiz-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="field portal-form-span">
                  <label htmlFor="quiz-description">Description</label>
                  <input
                    id="quiz-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional short summary"
                  />
                </div>
              </div>

              <div className="quiz-builder">
                {questions.map((question, index) => (
                  <article className="quiz-card" key={question.key}>
                    <div className="quiz-card-head">
                      <h3>Question {index + 1}</h3>
                      <button
                        type="button"
                        className="td-icon-btn danger"
                        onClick={() => removeQuestion(index)}
                        disabled={questions.length === 1}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="field">
                      <label>Question type</label>
                      <div className="quiz-type-picker">
                        {(Object.keys(TYPE_LABELS) as QuestionType[]).map((type) => (
                          <button
                            key={type}
                            type="button"
                            className={
                              question.type === type ? 'quiz-type-btn active' : 'quiz-type-btn'
                            }
                            onClick={() => setQuestionType(index, type)}
                          >
                            {TYPE_LABELS[type]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="field">
                      <label htmlFor={`prompt-${question.key}`}>Prompt</label>
                      <input
                        id={`prompt-${question.key}`}
                        value={question.prompt}
                        onChange={(e) => updateQuestion(index, { prompt: e.target.value })}
                        required
                      />
                    </div>

                    <div className="quiz-options-list">
                      <p className="td-chip-label">
                        {question.type === 'multiple'
                          ? 'Options · select all correct answers'
                          : 'Options · select the correct answer'}
                      </p>
                      {question.options.map((option, optionIndex) => {
                        const checked = question.answers.includes(option) && option.trim() !== '';
                        const inputType = question.type === 'multiple' ? 'checkbox' : 'radio';
                        return (
                          <div className="quiz-option-row" key={`${question.key}-${optionIndex}`}>
                            <label className="quiz-correct">
                              <input
                                type={inputType}
                                name={`answer-${question.key}`}
                                checked={checked}
                                disabled={!option.trim()}
                                onChange={() =>
                                  toggleAnswer(
                                    index,
                                    option,
                                    question.type !== 'multiple'
                                  )
                                }
                              />
                              <span>Correct</span>
                            </label>
                            <input
                              value={option}
                              onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                              placeholder={
                                question.type === 'true_false'
                                  ? option
                                  : `Option ${optionIndex + 1}`
                              }
                              readOnly={question.type === 'true_false'}
                              required={question.type !== 'true_false'}
                            />
                            {question.type !== 'true_false' && (
                              <button
                                type="button"
                                className="td-icon-btn danger"
                                onClick={() => removeOption(index, optionIndex)}
                                disabled={question.options.length <= 2}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {question.type !== 'true_false' && (
                        <button
                          type="button"
                          className="td-btn ghost"
                          onClick={() => addOption(index)}
                        >
                          + Add option
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              <div className="actions">
                <button
                  type="button"
                  className="td-btn ghost"
                  onClick={() => setQuestions((current) => [...current, emptyQuestion()])}
                >
                  + Add question
                </button>
                <button className="td-btn primary" type="submit" disabled={submitting}>
                  {submitting ? 'Saving…' : editingId ? 'Update quiz' : 'Save quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
