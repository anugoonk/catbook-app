const DEFAULT_API_BASE_URL = '/api/v1';

export class ApiError extends Error {
  constructor(message, { status, payload } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const getApiBaseUrl = () =>
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || DEFAULT_API_BASE_URL;

let csrfToken = '';

export const setCsrfToken = (token) => {
  csrfToken = token || '';
};

const parseResponse = async (response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const apiRequest = async (path, options = {}) => {
  const method = options.method || 'GET';
  const isMutation = ['POST', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(isMutation && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...options.headers,
    },
    ...options,
    body: options.body && typeof options.body !== 'string'
      ? JSON.stringify(options.body)
      : options.body,
  });

  const payload = await parseResponse(response);
  if (payload?.csrfToken) setCsrfToken(payload.csrfToken);

  if (!response.ok) {
    throw new ApiError(payload?.error?.message || payload?.message || 'API request failed', {
      status: response.status,
      payload,
    });
  }

  return payload;
};

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiRequest(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => apiRequest(path, { ...options, method: 'DELETE' }),
};
