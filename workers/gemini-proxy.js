export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/' || path === '/health') {
      return new Response('Gemini Proxy OK');
    }

    const base = 'https://generativelanguage.googleapis.com';
    let targetUrl = base + path;
    if (targetUrl.includes('?')) {
      targetUrl = targetUrl + '&key=' + env.GEMINI_API_KEY;
    } else {
      targetUrl = targetUrl + '?key=' + env.GEMINI_API_KEY;
    }

    try {
      const resp = await fetch(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method === 'GET' || request.method === 'HEAD'
          ? null
          : await request.text(),
      });

      const headers = new Headers(resp.headers);
      headers.set('Access-Control-Allow-Origin', '*');

      return new Response(resp.body, {
        status: resp.status,
        headers: headers,
      });
    } catch (e) {
      return new Response('Error: ' + e.message, { status: 502 });
    }
  },
};
