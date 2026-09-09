import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../next.config.js';

const directory = fileURLToPath(new URL('../out/', import.meta.url));
const port = Number(process.env.PORT) || 4173;
const basePath = config.basePath || '';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

if (!existsSync(resolve(directory, 'index.html'))) {
  console.error('No static build found. Run npm run build first.');
  process.exit(1);
}

// Serve the export under its real deployment path, including fonts and audio samples.
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://127.0.0.1:${port}`).pathname);
    if (pathname === '/' && basePath) {
      response.writeHead(302, { Location: `${basePath}/` }).end();
      return;
    }
    if (basePath && !pathname.startsWith(`${basePath}/`)) throw new Error('Not found');
    let file = resolve(directory, `.${pathname.slice(basePath.length)}`);
    if (file !== directory.slice(0, -1) && !file.startsWith(directory))
      throw new Error('Not found');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    if (!file.startsWith(resolve(directory) + sep)) throw new Error('Not found');
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Preview: http://127.0.0.1:${port}${basePath}/`);
});
