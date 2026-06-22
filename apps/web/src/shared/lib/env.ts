const PRODUCTION_API_DEFAULT = 'https://afc-management-api.onrender.com';
const WAKE_TIMEOUT_MS = 8000;

declare global {
  interface Window {
    __AGBMS_API_URL__?: string;
  }
}

function resolveApiUrl(): string {
  const fromVite = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  const fromRuntime =
    typeof window !== 'undefined' ? window.__AGBMS_API_URL__?.trim() : '';
  const fallback = import.meta.env.PROD ? PRODUCTION_API_DEFAULT : '';

  return (fromVite || fromRuntime || fallback).replace(/\/$/, '');
}

const apiUrl = resolveApiUrl();

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

export type ApiHealthStatus = 'ok' | 'slow' | 'unreachable';

export async function checkApiHealth(): Promise<ApiHealthStatus> {
  if (!apiUrl) return 'unreachable';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WAKE_TIMEOUT_MS);
  const started = Date.now();

  try {
    const response = await fetch(`${apiUrl}/api/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return 'unreachable';
    return Date.now() - started > 5000 ? 'slow' : 'ok';
  } catch {
    return 'unreachable';
  } finally {
    clearTimeout(timeout);
  }
}
