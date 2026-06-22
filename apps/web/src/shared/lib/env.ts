const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '';

export const API_URL = apiUrl;
export const API_BASE = apiUrl ? `${apiUrl}/api` : '/api';
export const SOCKET_URL = apiUrl || (typeof window !== 'undefined' ? window.location.origin : '');
export const IS_PRODUCTION = import.meta.env.PROD;
export const IS_API_CONFIGURED = Boolean(apiUrl);

export function resolveApiAssetUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = apiUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function wakeApiServer(): Promise<void> {
  if (!apiUrl) return;
  try {
    await fetch(`${apiUrl}/api/health`, { method: 'GET', cache: 'no-store' });
  } catch {
    // Render cold start — login request will retry
  }
}
