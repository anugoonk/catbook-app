import busboy from 'busboy';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, stat, unlink } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';

export const UPLOAD_DIR = join(process.cwd(), 'server', 'uploads');
const MAX_FILE_SIZE   = 5 * 1024 * 1024;
const ALLOWED_TYPES   = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);
const ALLOWED_EXTS    = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const MIME_MAP        = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };

await mkdir(UPLOAD_DIR, { recursive: true });

export const parseUpload = (request) => new Promise((resolve, reject) => {
  const ct = request.headers['content-type'] || '';
  if (!ct.includes('multipart/form-data')) {
    return reject({ status: 400, message: 'Content-Type must be multipart/form-data' });
  }

  let bb;
  try {
    bb = busboy({ headers: request.headers, limits: { fileSize: MAX_FILE_SIZE, files: 1 } });
  } catch {
    return reject({ status: 400, message: 'Invalid multipart request' });
  }

  let savedFile = null;
  let uploadError = null;
  let pending = 0;

  bb.on('file', (fieldname, fileStream, info) => {
    const { filename = '', mimeType = '' } = info;

    if (!ALLOWED_TYPES.has(mimeType)) {
      // Pipe to null sink so busboy can drain and emit 'finish'
      const sink = new Writable({ write(chunk, enc, cb) { cb(); } });
      fileStream.pipe(sink);
      uploadError = { status: 415, message: 'Only image files (JPEG, PNG, GIF, WebP) are allowed' };
      return;
    }

    const rawExt  = extname(filename).toLowerCase();
    const ext     = ALLOWED_EXTS.has(rawExt) ? rawExt : '.jpg';
    const safeName = `${randomUUID()}${ext}`;
    const filePath = join(UPLOAD_DIR, safeName);
    const ws = createWriteStream(filePath);
    let limitExceeded = false;
    pending++;

    fileStream.on('limit', () => { limitExceeded = true; });
    fileStream.pipe(ws);

    ws.on('finish', () => {
      pending--;
      if (limitExceeded) {
        unlink(filePath).catch(() => {});
        uploadError = { status: 413, message: 'File too large. Maximum size is 5 MB' };
      } else {
        savedFile = { filename: safeName, filePath, mimeType };
      }
    });
    ws.on('error', () => {
      pending--;
      uploadError = { status: 500, message: 'Failed to save file' };
    });
  });

  bb.on('finish', () => {
    const check = () => {
      if (pending > 0) { setTimeout(check, 10); return; }
      if (uploadError)  return reject(uploadError);
      if (!savedFile)   return reject({ status: 400, message: 'No file provided' });
      resolve(savedFile);
    };
    check();
  });

  bb.on('error', () => reject({ status: 400, message: 'Invalid multipart request' }));
  request.pipe(bb);
});

export const serveUpload = async (rawFilename, response) => {
  const filename = basename(rawFilename).replace(/[^a-zA-Z0-9._-]/g, '');
  const filePath = join(UPLOAD_DIR, filename);

  try {
    const s = await stat(filePath);
    if (!s.isFile()) throw new Error('not-a-file');
    const data = await readFile(filePath);
    const contentType = MIME_MAP[extname(filePath).toLowerCase()] || 'application/octet-stream';
    response.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': data.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    response.end(data);
  } catch {
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'File not found' } }));
  }
};
