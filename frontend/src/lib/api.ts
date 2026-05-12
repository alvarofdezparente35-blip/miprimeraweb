// ── API communication with CSRF ──────────────────────────────────────

let _csrfToken = '';
let _csrfPromise: Promise<string> | null = null;

export async function getCsrfToken(): Promise<string> {
  if (_csrfToken) return _csrfToken;

  if (!_csrfPromise) {
    _csrfPromise = (async () => {
      try {
        const res = await fetch('/api/csrf-token', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          _csrfToken = data.csrfToken;
          return _csrfToken;
        }
      } catch { /* server might not be running */ }
      return '';
    })();
  }

  return _csrfPromise;
}

export async function apiPost(path: string, body: unknown) {
  const token = await getCsrfToken();
  return fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'X-CSRF-Token': token } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });
}
