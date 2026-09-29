const API_BASE = import.meta.env.VITE_API_URL;

export type PortalUser = {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  grade?: string | null;
  subject?: string | null;
};

export type StaffRole = 'admin' | 'teacher';

export type StaffMember = {
  id: number;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  role: StaffRole;
  grade: string | null;
  subject: string | null;
  created_at?: string;
};

function getToken() {
  return localStorage.getItem('edu_token');
}

export function getStoredUser(): PortalUser | null {
  const raw = localStorage.getItem('edu_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PortalUser;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: PortalUser) {
  localStorage.setItem('edu_token', token);
  localStorage.setItem('edu_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('edu_token');
  localStorage.removeItem('edu_user');
}

export function homePathForRole(role: PortalUser['role']) {
  if (role === 'admin') return '/admin';
  if (role === 'teacher') return '/teacher';
  return '/login';
}

async function parseResponse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

function authHeaders(auth: boolean, withJson = false): Record<string, string> {
  const headers: Record<string, string> = {};
  if (withJson) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function apiPost<T>(path: string, body: unknown, auth = false): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(auth, true),
    body: JSON.stringify(body),
  });

  return parseResponse<T>(res);
}

export async function apiPut<T>(path: string, body: unknown, auth = true): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: authHeaders(auth, true),
    body: JSON.stringify(body),
  });

  return parseResponse<T>(res);
}

export async function apiDelete<T>(path: string, auth = true): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: authHeaders(auth),
  });

  return parseResponse<T>(res);
}

export async function apiUpload<T>(path: string, formData: FormData, auth = true): Promise<T> {
  const headers: Record<string, string> = {};
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  return parseResponse<T>(res);
}

export async function apiGet<T>(path: string, auth = true): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: authHeaders(auth),
  });
  return parseResponse<T>(res);
}

export function fileUrl(pathOrUrl: string | null | undefined) {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${API_BASE}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

export { API_BASE };
