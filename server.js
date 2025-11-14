const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname);
const port = 8080;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ttf': 'font/ttf',
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
  const filePath = urlPath === '/' ? path.join(root, 'index.html') : safeJoin(root, urlPath.slice(1));
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
