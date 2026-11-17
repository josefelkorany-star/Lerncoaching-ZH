import http from 'node:http';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// Local preview wrapper only. Never rewrites or injects into the original HTML.
const base = new URL('../', import.meta.url);
const routes = new Map([
  ['/', [new URL('START.html', import.meta.url), 'text/html; charset=utf-8']],
  ['/coach.html', [new URL('original/coach.html', base), 'text/html; charset=utf-8']],
  ['/logo.png', [new URL('../logo.png', base), 'image/png']],
  ['/pruefbericht', [new URL('review/ERGEBNIS.md', base), 'text/plain; charset=utf-8']],
]);

export function previewServer() {
  return http.createServer(async (request, response) => {
    const headers = {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      // Google Fonts stays as supplied; live backend connections are unavailable.
      'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    };
    if (!/^127\.0\.0\.1(?::\d+)?$/.test(request.headers.host || '')) {
      response.writeHead(403, headers).end('Local preview only'); return;
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, {...headers, Allow:'GET, HEAD'}).end(); return;
    }
    let pathname;
    try { pathname = new URL(request.url, 'http://127.0.0.1').pathname; }
    catch { response.writeHead(400, headers).end(); return; }
    const route = routes.get(pathname);
    if (!route) { response.writeHead(404, headers).end('Not found'); return; }
    try {
      const bytes = await fs.readFile(route[0]);
      response.writeHead(200, {...headers, 'Content-Type':route[1], 'Content-Length':bytes.length});
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch { response.writeHead(500, headers).end('Preview file unavailable'); }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const portIndex = process.argv.indexOf('--port');
  const port = Number(portIndex === -1 ? 4192 : process.argv[portIndex + 1]);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid preview port');
  const server = previewServer();
  server.on('error', error => { console.error(error.code); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Private Originalvorschau: http://127.0.0.1:${port}/`));
}
