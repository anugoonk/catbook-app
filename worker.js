const BACKEND = 'https://catbook-app.onrender.com';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy /api/* and /uploads/* → Render backend
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
      const backendUrl = BACKEND + url.pathname + url.search;
      const proxyReq = new Request(backendUrl, {
        method: request.method,
        headers: request.headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'follow',
      });
      return fetch(proxyReq);
    }

    // Everything else → static assets (SPA)
    return env.ASSETS.fetch(request);
  },
};
