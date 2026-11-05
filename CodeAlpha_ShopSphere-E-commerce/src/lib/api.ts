// Lightweight fetch wrapper used by TanStack Query hooks on the client.
// All requests use relative URLs (required by the sandbox gateway).

import type { ApiError } from "@/types";

export class HttpError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    credentials: "include",
    ...options,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message =
      (body && typeof body === "object" && "error" in body
        ? String((body as ApiError).error)
        : null) ?? `Request failed (${res.status})`;
    throw new HttpError(message, res.status, body ?? undefined);
  }

  // Some endpoints return no content.
  return (body ?? ({} as T)) as T;
}

export const api = {
  get: <T>(url: string) => request<T>(url, { method: "GET" }),
  post: <T>(url: string, data?: unknown) =>
    request<T>(url, {
      method: "POST",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  put: <T>(url: string, data?: unknown) =>
    request<T>(url, {
      method: "PUT",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  del: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};

export function buildProductsQuery(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}
