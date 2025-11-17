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
  if (req.method === 'POST' && urlPath === '/__client-logs') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      try {
        const data = JSON.parse(body);
        const logs = Array.isArray(data) ? data : [data];
        const ip = ((req.headers['x-forwarded-for'] || req.socket.remoteAddress || '') + '').split(',')[0].trim();
        function fmtTime(ts) {
          let d;
          if (typeof ts === 'string') {
            const t = Date.parse(ts);
            if (!Number.isNaN(t)) d = new Date(t);
          }
          if (!d) d = new Date();
          const h = String(d.getHours()).padStart(2, '0');
          const m = String(d.getMinutes()).padStart(2, '0');
          const s = String(d.getSeconds()).padStart(2, '0');
          return `${h}:${m}:${s}`;
        }
        function detectDevice(ua) {
          if (!ua || typeof ua !== 'string') return '电脑';
          const s = ua.toLowerCase();
          if (/iphone|ipad|ipod|ios/.test(s)) return 'iOS';
          return '电脑';
        }
        for (const item of logs) {
          const level = item && item.level ? String(item.level).toUpperCase() : 'LOG';
          const msg = item && item.message ? String(item.message) : '';
          const ts = item && item.ts ? String(item.ts) : '';
          const timeStr = fmtTime(ts);
          const device = detectDevice(item && item.ua);
          console.log(`[${timeStr}] ${ip} ${device} ${level} ${msg}`);
          if (item && item.stack) console.log(item.stack);
        }
      } catch (e) {
        console.log('客户端日志解析失败');
      }
      send(res, 204, '', { 'Content-Type': 'text/plain' });
    });
    return;
  }
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
});
