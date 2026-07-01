import http from 'http';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const PORT = 5173;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.otf': 'font/otf',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = parsedUrl.pathname;
  let filePath;

  // Web Worker path rewrites
  if (pathname.endsWith('quick.worker-CyRZCJML.js')) {
    filePath = path.join(process.cwd(), 'dist', 'assets', 'quick.worker-CyRZCJML.js');
  } else if (pathname.endsWith('blob-loader.worker-Dk3X5ub-.js')) {
    filePath = path.join(process.cwd(), 'dist', 'assets', 'blob-loader.worker-Dk3X5ub-.js');
  } else {
    filePath = path.join(process.cwd(), 'dist', pathname);
  }

  // Directory -> index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    if (!pathname.endsWith('/')) {
      res.statusCode = 301;
      res.setHeader('Location', pathname + '/' + parsedUrl.search);
      res.end();
      return;
    }
    filePath = path.join(filePath, 'index.html');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    // Cache-Control headers
    if (['.woff2', '.woff', '.otf', '.webp', '.jpg', '.png'].includes(ext)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    let stream = fs.createReadStream(filePath);
    
    // Gzip/Deflate compression for text-based files to maximize speed
    if (['text/html', 'text/css', 'text/javascript', 'application/json', 'application/manifest+json'].some(type => contentType.startsWith(type))) {
      const acceptEncoding = req.headers['accept-encoding'] || '';
      if (acceptEncoding.includes('gzip')) {
        res.setHeader('Content-Encoding', 'gzip');
        stream = stream.pipe(zlib.createGzip());
      } else if (acceptEncoding.includes('deflate')) {
        res.setHeader('Content-Encoding', 'deflate');
        stream = stream.pipe(zlib.createDeflate());
      }
    }

    stream.on('error', (err) => {
      console.error('File stream error:', err.message);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });

    stream.pipe(res);
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('404 Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Highly optimized static server running at http://localhost:${PORT}/`);
});
