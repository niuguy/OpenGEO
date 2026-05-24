// Lightweight helpers for testing Next.js App Router route handlers without
// spinning up a server. Route handlers take a Request + a context with async
// `params`, so the helpers exist to keep the test sites terse.

export function jsonRequest(method: string, body?: unknown): Request {
  return new Request("http://localhost/test", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? null : JSON.stringify(body)
  });
}

export function routeContext<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}
