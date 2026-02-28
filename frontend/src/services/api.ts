// ─── Typed API client ─────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

// ── Token management ──────────────────────────────────────────────────────────

const TOKEN_KEY = 'macc_auth_token';

export function getAuthToken(): string | null {
  // Prefer env-injected dev token (set at build time / .env.local)
  const envToken = import.meta.env.VITE_DEV_TOKEN as string | undefined;
  if (envToken) return envToken;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
    public readonly code?: string,
  ) {
    super(detail);
    this.name = 'ApiClientError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, body, headers: extraHeaders, ...rest } = options;

  // Build URL with query params
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string>),
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url.toString(), {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    let code: string | undefined;
    try {
      const errorBody = (await response.json()) as { detail?: string; code?: string };
      detail = errorBody.detail ?? detail;
      code = errorBody.code;
    } catch {
      // ignore JSON parse failure
    }
    throw new ApiClientError(response.status, detail, code);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

// ── HTTP method helpers ───────────────────────────────────────────────────────

export const api = {
  get<T>(path: string, params?: RequestOptions['params']): Promise<T> {
    return request<T>(path, { method: 'GET', params });
  },

  post<T>(path: string, body?: unknown, params?: RequestOptions['params']): Promise<T> {
    return request<T>(path, { method: 'POST', body, params });
  },

  put<T>(path: string, body?: unknown, params?: RequestOptions['params']): Promise<T> {
    return request<T>(path, { method: 'PUT', body, params });
  },

  patch<T>(path: string, body?: unknown, params?: RequestOptions['params']): Promise<T> {
    return request<T>(path, { method: 'PATCH', body, params });
  },

  delete<T = void>(path: string, params?: RequestOptions['params']): Promise<T> {
    return request<T>(path, { method: 'DELETE', params });
  },
};

// ── Health ────────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  version: string;
  db: string;
}

export function fetchHealth(): Promise<HealthResponse> {
  return api.get<HealthResponse>('/health');
}
