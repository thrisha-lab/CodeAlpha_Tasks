// Thin fetch wrapper for the REST API.
// Every endpoint answers `{ ok: true, data }` or `{ ok: false, error }`.

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      credentials: 'same-origin',
      ...init,
      headers: {
        ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError(0, 'Network error — is the server running?')
  }

  let body: { ok?: boolean; data?: T; error?: string }
  try {
    body = await res.json()
  } catch {
    throw new ApiError(res.status, `Unexpected server response (${res.status})`)
  }

  if (!res.ok || body.ok !== true) {
    throw new ApiError(res.status, body.error || `Request failed (${res.status})`)
  }
  return body.data as T
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path)
}

export function apiPost<T>(path: string, data?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: data === undefined ? undefined : JSON.stringify(data),
  })
}

export function apiPut<T>(path: string, data?: unknown): Promise<T> {
  return request<T>(path, { method: 'PUT', body: JSON.stringify(data) })
}

export function apiUpload<T>(
  path: string,
  form: FormData,
  onProgress?: (pct: number) => void,
  abortRef?: { current: XMLHttpRequest | null },
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    if (abortRef) abortRef.current = xhr
    xhr.open('POST', path)
    xhr.withCredentials = true
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as { ok?: boolean; data?: T; error?: string }
        if (xhr.status >= 200 && xhr.status < 300 && body.ok === true) {
          resolve(body.data as T)
        } else {
          reject(new ApiError(xhr.status, body.error || `Upload failed (${xhr.status})`))
        }
      } catch {
        reject(new ApiError(xhr.status, `Upload failed (${xhr.status})`))
      }
    }
    xhr.onerror = () => reject(new ApiError(0, 'Upload failed — network error'))
    xhr.send(form)
  })
}
