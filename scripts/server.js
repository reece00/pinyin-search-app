import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const publicRoot = path.join(root, 'public');
const port = process.env.PORT ? Number(process.env.PORT) : 8080;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function send(res, status, data, headers) {
  res.writeHead(status, headers);
  res.end(data);
}

function safeJoin(base, target) {
  const targetPath = path.join(base, target);
  const resolved = path.resolve(targetPath);
  if (!resolved.startsWith(base)) return null;
  return resolved;
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const filePath = urlPath === '/' ? path.join(publicRoot, 'index.html') : safeJoin(publicRoot, urlPath.slice(1));
  if (!filePath) return send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain' });

  fs.stat(filePath, (err, stat) => {
    if (err) {
      return send(res, 404, 'Not Found', { 'Content-Type': 'text/plain' });
    }
    let finalPath = filePath;
    if (stat.isDirectory()) {
      finalPath = path.join(filePath, 'index.html');
    }
    fs.readFile(finalPath, (readErr, data) => {
      if (readErr) {
        return send(res, 404, 'Not Found', { 'Content-Type': 'text/plain' });
      }
      const ext = path.extname(finalPath).toLowerCase();
      const type = types[ext] || 'application/octet-stream';
      send(res, 200, data, { 'Content-Type': type });
    });
  });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
  
  // 检查 tailwind.css 是否存在
  const tailwindPath = path.join(publicRoot, 'css', 'tailwind.css');
  if (!fs.existsSync(tailwindPath)) {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  tailwind.css 不存在，请先运行 npm run build');
    console.warn('\x1b[36m%s\x1b[0m', '💡 提示：开发模式请运行 npm run dev');
  } else {
    console.log('\x1b[32m%s\x1b[0m', '✓ Tailwind CSS 已加载');
  }
});
