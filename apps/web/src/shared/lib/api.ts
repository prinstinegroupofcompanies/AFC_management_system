import { API_BASE } from './env';

const REQUEST_TIMEOUT_MS = 90000;

function networkErrorMessage(): string {
  return 'Unable to reach the server. Check your mobile data or Wi‑Fi connection (Orange, Lonestar, or Wi‑Fi) and try again.';
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('The server is taking too long to respond. Please wait a moment and try again.');
    }
    throw new Error(networkErrorMessage());
  } finally {
    clearTimeout(timeout);
  }
}

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetchWithTimeout(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.getToken()}`;
        const retry = await fetchWithTimeout(`${API_BASE}${endpoint}`, { ...options, headers });
        if (!retry.ok) {
          const err = await retry.json().catch(() => ({ error: 'Request failed' }));
          throw new Error(err.error || 'Request failed');
        }
        return retry.json();
      }
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || 'Request failed');
    }

    if (response.headers.get('content-type')?.includes('application/json')) {
      return response.json();
    }

    return response as unknown as T;
  }

  private async tryRefresh(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const res = await fetchWithTimeout(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      localStorage.setItem('accessToken', data.accessToken);
      return true;
    } catch {
      return false;
    }
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint);
  }

  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
