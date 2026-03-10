import { useAuthStore } from '../store/auth'

const BASE = ''

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { csrfToken, adminToken } = useAuthStore.getState()
  const headers = new Headers(options.headers as HeadersInit | undefined)

  if (adminToken) {
    headers.set('Authorization', `Bearer ${adminToken}`)
  }
  if (csrfToken && options.method && options.method !== 'GET') {
    headers.set('X-CSRF-Token', csrfToken)
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: 'same-origin',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }

  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    return res.json() as Promise<T>
  }
  return res.text() as unknown as T
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE' })
}
