import { fileUrl } from './api';

export const NAMIBIA_REGIONS = [
  { id: 'kunene', name: 'Kunene' },
  { id: 'omusati', name: 'Omusati' },
  { id: 'oshana', name: 'Oshana' },
  { id: 'ohangwena', name: 'Ohangwena' },
  { id: 'oshikoto', name: 'Oshikoto' },
  { id: 'kavango-west', name: 'Kavango West' },
  { id: 'kavango-east', name: 'Kavango East' },
  { id: 'zambezi', name: 'Zambezi' },
  { id: 'otjozondjupa', name: 'Otjozondjupa' },
  { id: 'erongo', name: 'Erongo' },
  { id: 'khomas', name: 'Khomas' },
  { id: 'omaheke', name: 'Omaheke' },
  { id: 'hardap', name: 'Hardap' },
  { id: 'karas', name: 'ǁKaras' },
] as const;

export type ExploreCategoryDef = {
  id: string;
  number: number;
  title: string;
};

export const EXPLORE_CATEGORIES: ExploreCategoryDef[] = [
  { id: 'geography', number: 1, title: 'Physical Geography & Natural Landscapes' },
  { id: 'culture', number: 2, title: 'Culture' },
  { id: 'history-sites', number: 3, title: 'Historical Sites' },
  { id: 'events', number: 4, title: 'Events & Festivals' },
  { id: 'gastronomy', number: 5, title: 'Gastronomy' },
  { id: 'safety', number: 6, title: 'Safety & Advisory' },
];

export const MAX_EXPLORE_IMAGES = 6;

/** Keep DB paths portable — store /uploads/... not http://localhost:... */
export function toRelativeMediaUrl(url: string): string {
  const raw = url.trim();
  if (!raw) return '';
  if (raw.startsWith('/uploads/')) return raw;
  try {
    const parsed = new URL(raw);
    if (parsed.pathname.startsWith('/uploads/')) return parsed.pathname;
  } catch {
    // ignore
  }
  return raw;
}

/** Absolute URL for portal <img> previews. */
export function toDisplayMediaUrl(url: string): string {
  const relative = toRelativeMediaUrl(url);
  if (!relative) return '';
  if (/^https?:\/\//i.test(relative)) return relative;
  return fileUrl(relative) || relative;
}

export type ExploreEntry = {
  id: string;
  region_id: string;
  category: string;
  title: string;
  short_description: string;
  full_description: string;
  featured_image: {
    url: string;
    alt: string;
    caption: string;
    credit: string;
  } | null;
  gallery: Array<{ url: string; type: string; alt: string; caption: string }>;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    map_marker: string;
    google_place_id: string;
  } | null;
  tags: string[];
  rating_score: number | null;
  category_data: Record<string, string | boolean>;
  status: 'draft' | 'published';
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type ExploreFormState = {
  id: string;
  region_id: string;
  category: string;
  title: string;
  description: string;
  images: string[];
  latitude: string;
  longitude: string;
  address: string;
  status: 'draft' | 'published';
};

export function emptyExploreForm(): ExploreFormState {
  return {
    id: '',
    region_id: 'khomas',
    category: 'geography',
    title: '',
    description: '',
    images: [],
    latitude: '',
    longitude: '',
    address: '',
    status: 'draft',
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

export function buildExploreId(regionId: string, title: string) {
  const slug = slugify(title) || 'place';
  const stamp = Date.now().toString(36).slice(-5);
  return `nam_${regionId}_${slug}_${stamp}`.slice(0, 80);
}

export function entryToForm(entry: ExploreEntry): ExploreFormState {
  const images = [
    entry.featured_image?.url,
    ...(entry.gallery || []).map((g) => g.url),
  ]
    .filter((url): url is string => Boolean(url))
    .map(toRelativeMediaUrl);

  return {
    id: entry.id,
    region_id: entry.region_id,
    category: entry.category === 'travel' ? 'geography' : entry.category,
    title: entry.title,
    description: entry.full_description || entry.short_description || '',
    images: images.slice(0, MAX_EXPLORE_IMAGES),
    latitude: entry.location ? String(entry.location.latitude) : '',
    longitude: entry.location ? String(entry.location.longitude) : '',
    address: entry.location?.address || '',
    status: entry.status,
  };
}

export function formToPayload(form: ExploreFormState, { isNew }: { isNew: boolean }) {
  const images = form.images
    .map(toRelativeMediaUrl)
    .filter(Boolean)
    .slice(0, MAX_EXPLORE_IMAGES);
  const [featured, ...rest] = images;
  const description = form.description.trim();
  const id = isNew
    ? buildExploreId(form.region_id, form.title)
    : form.id.trim().toLowerCase();

  return {
    id,
    region_id: form.region_id,
    category: form.category,
    title: form.title.trim(),
    short_description: description.slice(0, 280),
    full_description: description,
    featured_image: featured
      ? { url: featured, alt: form.title.trim(), caption: '', credit: '' }
      : null,
    gallery: rest.map((url) => ({ url, type: 'photo', alt: '', caption: '' })),
    location: {
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      address: form.address.trim(),
      map_marker: form.title.trim(),
      google_place_id: '',
    },
    tags: [],
    rating_score: null,
    category_data: {},
    status: form.status,
    sort_order: 0,
  };
}
