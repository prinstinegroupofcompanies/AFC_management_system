const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '';

export const API_URL = apiUrl;
export const API_BASE = apiUrl ? `${apiUrl}/api` : '/api';
export const SOCKET_URL = apiUrl || (typeof window !== 'undefined' ? window.location.origin : '');

export function resolveApiAssetUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = apiUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
