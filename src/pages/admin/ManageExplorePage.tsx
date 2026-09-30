import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  apiUpload,
} from '../../lib/api';
import {
  EXPLORE_CATEGORIES,
  MAX_EXPLORE_IMAGES,
  NAMIBIA_REGIONS,
  emptyExploreForm,
  entryToForm,
  formToPayload,
  toDisplayMediaUrl,
  toRelativeMediaUrl,
  type ExploreEntry,
  type ExploreFormState,
} from '../../lib/explore';
import './ManageExplore.css';

type EditorTab = 'basics' | 'media' | 'location';

const TABS: { id: EditorTab; label: string }[] = [
  { id: 'basics', label: 'Basics' },
  { id: 'media', label: 'Media' },
  { id: 'location', label: 'Location' },
];

export default function ManageExplorePage() {
  const [entries, setEntries] = useState<ExploreEntry[]>([]);
  const [form, setForm] = useState<ExploreFormState>(emptyExploreForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<EditorTab>('basics');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [syncVersion, setSyncVersion] = useState<number | null>(null);

  const publishedCount = useMemo(
    () => entries.filter((e) => e.status === 'published').length,
    [entries]
  );
  const draftCount = useMemo(
    () => entries.filter((e) => e.status === 'draft').length,
    [entries]
  );

  async function loadEntries() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterRegion) params.set('region_id', filterRegion);
      if (filterCategory) params.set('category', filterCategory);
      if (filterStatus) params.set('status', filterStatus);
      const qs = params.toString();
      const [rows, meta] = await Promise.all([
        apiGet<ExploreEntry[]>(`/api/explore/admin/entries${qs ? `?${qs}` : ''}`),
        apiGet<{ version: number }>('/api/explore/meta', false),
      ]);
      setEntries(rows);
      setSyncVersion(meta.version);
    } catch (err) {
      setEntries([]);
      setError(err instanceof Error ? err.message : 'Failed to load explore entries');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEntries();
  }, [filterRegion, filterCategory, filterStatus]);

  useEffect(() => {
    if (!editorOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeEditor();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [editorOpen]);

  function closeEditor() {
    setEditorOpen(false);
    setEditingId(null);
    setForm(emptyExploreForm());
    setEditorTab('basics');
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyExploreForm());
    setEditorTab('basics');
    setError(null);
    setSuccess(null);
    setEditorOpen(true);
  }

  function startEdit(entry: ExploreEntry) {
    setEditingId(entry.id);
    setForm(entryToForm(entry));
    setEditorTab('basics');
    setError(null);
    setSuccess(null);
    setEditorOpen(true);
  }

  function updateField<K extends keyof ExploreFormState>(key: K, value: ExploreFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files?.length) return;
    const remaining = MAX_EXPLORE_IMAGES - form.images.length;
    if (remaining <= 0) {
      setError(`You can upload up to ${MAX_EXPLORE_IMAGES} images.`);
      return;
    }

    const selected = Array.from(files).slice(0, remaining);
    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        const data = new FormData();
        data.append('file', file);
        const result = await apiUpload<{ url: string }>('/api/explore/admin/upload-image', data);
        uploaded.push(toRelativeMediaUrl(result.url));
      }
      setForm((prev) => ({
        ...prev,
        images: [...prev.images, ...uploaded].filter(Boolean).slice(0, MAX_EXPLORE_IMAGES),
      }));
      setSuccess(
        selected.length === 1
          ? 'Image uploaded.'
          : `${selected.length} images uploaded.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploading(false);
    }
  }

  function removeImage(index: number) {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.images.length) {
      setEditorTab('media');
      setError('Add at least one image (up to 6).');
      return;
    }

    setSubmitting(true);
    try {
      const payload = formToPayload(form, { isNew: !editingId });
      if (editingId) {
        await apiPut(`/api/explore/admin/entries/${editingId}`, payload);
        setSuccess(
          payload.status === 'published'
            ? 'Entry updated and available to the app.'
            : 'Draft updated.'
        );
      } else {
        await apiPost('/api/explore/admin/entries', payload, true);
        setSuccess(
          payload.status === 'published'
            ? 'Entry published to the app.'
            : 'Draft created. Publish when ready.'
        );
      }
      closeEditor();
      await loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save entry');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(`Delete explore entry "${id}"?`)) return;
    setError(null);
    try {
      await apiDelete(`/api/explore/admin/entries/${id}`);
      if (editingId === id) closeEditor();
      setSuccess('Entry deleted.');
      await loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete entry');
    }
  }

  function regionName(id: string) {
    return NAMIBIA_REGIONS.find((r) => r.id === id)?.name || id;
  }

  function categoryTitle(id: string) {
    return EXPLORE_CATEGORIES.find((c) => c.id === id)?.title || id;
  }

  return (
    <div className="ex-studio">
      <header className="ex-hero">
        <div className="ex-hero-copy">
          <p className="ex-kicker">Namibia explorer</p>
          <h1>Explore content</h1>
          <p className="ex-lede">
            Curate places for every explore topic with the same simple fields. Publish to push live
            into the mobile app.
          </p>
        </div>
        <div className="ex-hero-actions">
          <button type="button" className="ex-btn ghost" onClick={() => void loadEntries()}>
            Refresh
          </button>
          <button type="button" className="ex-btn primary" onClick={openCreate}>
            New place
          </button>
        </div>
      </header>

      <div className="ex-stats">
        <div className="ex-stat">
          <span className="ex-stat-value">{entries.length}</span>
          <span className="ex-stat-label">In view</span>
        </div>
        <div className="ex-stat">
          <span className="ex-stat-value">{publishedCount}</span>
          <span className="ex-stat-label">Published</span>
        </div>
        <div className="ex-stat">
          <span className="ex-stat-value">{draftCount}</span>
          <span className="ex-stat-label">Drafts</span>
        </div>
        <div className="ex-stat accent">
          <span className="ex-stat-value">{syncVersion ?? '—'}</span>
          <span className="ex-stat-label">App sync version</span>
        </div>
      </div>

      {(error || success) && (
        <div className={`ex-toast ${error ? 'error' : 'ok'}`} role="status">
          {error || success}
          <button
            type="button"
            onClick={() => {
              setError(null);
              setSuccess(null);
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="ex-toolbar">
        <div className="ex-filters">
          <label>
            <span>Region</span>
            <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}>
              <option value="">All regions</option>
              {NAMIBIA_REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Category</span>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">All categories</option>
              {EXPLORE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Status</span>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="ex-empty">
          <div className="ex-spinner" />
          <p>Loading catalogue…</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="ex-empty">
          <h2>No places yet</h2>
          <p>Create your first regional explore entry and publish it to the app.</p>
          <button type="button" className="ex-btn primary" onClick={openCreate}>
            New place
          </button>
        </div>
      ) : (
        <div className="ex-grid-cards">
          {entries.map((entry) => {
            const thumb = entry.featured_image?.url
              ? toDisplayMediaUrl(entry.featured_image.url)
              : '';
            return (
              <article key={entry.id} className="ex-card">
                <div
                  className="ex-card-media"
                  style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
                >
                  {!thumb ? <span className="ex-card-placeholder">No image</span> : null}
                  <span className={`ex-pill ${entry.status}`}>{entry.status}</span>
                </div>
                <div className="ex-card-body">
                  <p className="ex-card-meta">
                    {regionName(entry.region_id)} · {categoryTitle(entry.category)}
                  </p>
                  <h3>{entry.title}</h3>
                  <p className="ex-card-desc">
                    {entry.short_description || entry.full_description || 'No description yet.'}
                  </p>
                  <div className="ex-card-foot">
                    <code>{entry.id}</code>
                    <div className="ex-card-actions">
                      <button
                        type="button"
                        className="ex-btn ghost sm"
                        onClick={() => startEdit(entry)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="ex-btn ghost sm danger"
                        onClick={() => void handleDelete(entry.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editorOpen ? (
        <div
          className="ex-drawer-root"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ex-drawer-title"
        >
          <button
            type="button"
            className="ex-drawer-scrim"
            aria-label="Close editor"
            onClick={closeEditor}
          />
          <aside className="ex-drawer" role="document">
            <header className="ex-drawer-head">
              <div>
                <p className="ex-kicker">{editingId ? 'Edit place' : 'New place'}</p>
                <h2 id="ex-drawer-title">{form.title.trim() || 'Untitled place'}</h2>
              </div>
              <button type="button" className="ex-icon-btn" onClick={closeEditor} aria-label="Close">
                ✕
              </button>
            </header>

            <div className="ex-tabs" role="tablist">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={editorTab === tab.id}
                  className={editorTab === tab.id ? 'active' : ''}
                  onClick={() => setEditorTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form className="ex-drawer-form" onSubmit={handleSubmit}>
              {editorTab === 'basics' ? (
                <div className="ex-panel">
                  <div className="ex-field-grid">
                    <label className="ex-field">
                      <span>Region</span>
                      <select
                        value={form.region_id}
                        onChange={(e) => updateField('region_id', e.target.value)}
                        required
                      >
                        {NAMIBIA_REGIONS.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="ex-field">
                      <span>Category</span>
                      <select
                        value={form.category}
                        onChange={(e) => updateField('category', e.target.value)}
                        required
                      >
                        {EXPLORE_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.number}. {c.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="ex-field span-2">
                      <span>Title</span>
                      <input
                        value={form.title}
                        onChange={(e) => updateField('title', e.target.value)}
                        required
                      />
                    </label>
                    <label className="ex-field span-2">
                      <span>Description</span>
                      <textarea
                        rows={7}
                        value={form.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        required
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {editorTab === 'media' ? (
                <div className="ex-panel">
                  <p className="ex-panel-note">
                    Upload up to {MAX_EXPLORE_IMAGES} images. The first image is used as the featured
                    photo.
                  </p>
                  <label className="ex-upload-box">
                    <span>{uploading ? 'Uploading…' : 'Choose images to upload'}</span>
                    <small>
                      {form.images.length}/{MAX_EXPLORE_IMAGES} used · JPEG, PNG, WebP, GIF
                    </small>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      disabled={uploading || form.images.length >= MAX_EXPLORE_IMAGES}
                      onChange={(e) => {
                        void handleImageUpload(e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>

                  {form.images.length > 0 ? (
                    <div className="ex-image-grid">
                      {form.images.map((url, index) => (
                        <div key={`${url}-${index}`} className="ex-image-tile">
                          <img src={toDisplayMediaUrl(url)} alt={`Upload ${index + 1}`} />
                          {index === 0 ? <span className="ex-image-badge">Featured</span> : null}
                          <button
                            type="button"
                            className="ex-image-remove"
                            onClick={() => removeImage(index)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="ex-muted-note">No images yet. Add at least one before publishing.</p>
                  )}
                </div>
              ) : null}

              {editorTab === 'location' ? (
                <div className="ex-panel">
                  <div className="ex-field-grid">
                    <label className="ex-field">
                      <span>Latitude</span>
                      <input
                        value={form.latitude}
                        onChange={(e) => updateField('latitude', e.target.value)}
                        required
                        placeholder="-22.57"
                      />
                    </label>
                    <label className="ex-field">
                      <span>Longitude</span>
                      <input
                        value={form.longitude}
                        onChange={(e) => updateField('longitude', e.target.value)}
                        required
                        placeholder="17.083"
                      />
                    </label>
                    <label className="ex-field span-2">
                      <span>Address</span>
                      <input
                        value={form.address}
                        onChange={(e) => updateField('address', e.target.value)}
                        required
                        placeholder="Street, town, or landmark"
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              <footer className="ex-drawer-foot">
                <label className="ex-status-toggle">
                  <input
                    type="checkbox"
                    checked={form.status === 'published'}
                    onChange={(e) =>
                      updateField('status', e.target.checked ? 'published' : 'draft')
                    }
                  />
                  Publish to app
                </label>
                <div className="ex-drawer-foot-actions">
                  <button type="button" className="ex-btn ghost" onClick={closeEditor}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ex-btn primary"
                    disabled={submitting || uploading}
                  >
                    {submitting
                      ? 'Saving…'
                      : form.status === 'published'
                        ? editingId
                          ? 'Save & keep live'
                          : 'Publish to app'
                        : editingId
                          ? 'Save draft'
                          : 'Create draft'}
                  </button>
                </div>
              </footer>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
