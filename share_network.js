const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8080;
const WEB_DIR = path.join(__dirname, 'aira-web');
const zipPath = path.join(__dirname, 'release', 'AIRA-Assistant-Windows-x64.zip');

function getLocalIp() {
  const ifaces = os.networkInterfaces();
  for (const name in ifaces) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.url === '/download' || req.url === '/AIRA-Assistant-Windows-x64.zip') {
    if (!fs.existsSync(zipPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Release zip not found.');
    }
    const stat = fs.statSync(zipPath);
    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename="AIRA-Assistant-Windows-x64.zip"'
    });
    fs.createReadStream(zipPath).pipe(res);
    return;
  }

  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.join(WEB_DIR, reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    // Fallback to index.html
    const indexPath = path.join(WEB_DIR, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(indexPath).pipe(res);
  }
});

const localIp = getLocalIp();
server.listen(PORT, '0.0.0.0', () => {
  console.log('================================================================');
  console.log('  AIRA Direct Chrome Web App Server is LIVE!');
  console.log(`  Local URL:        http://localhost:${PORT}`);
  console.log(`  Network Chrome URL: http://${localIp}:${PORT}`);
  console.log('================================================================');
});
