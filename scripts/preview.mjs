// Serves the static export in out/ over HTTP.
//
// A production build writes absolute asset paths (/_next/...), so opening
// out/index.html directly as a file:// URL makes the browser look for those
// files at the filesystem root. Nothing loads, no JavaScript runs, and the
// page renders as dead HTML with unclickable buttons. Serving over HTTP is
// what the export actually expects.
//
// Deliberately dependency-free: it uses only Node built-ins, so it works
// offline and adds nothing to the install.

import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join, normalize, extname } from 'node:path'

const ROOT = new URL('../out/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const PORT = Number(process.env.PORT) || 3000

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
}

async function resolveFile(urlPath) {
  // Strip the query string and refuse to escape the output directory.
  const clean = decodeURIComponent(urlPath.split('?')[0])
  const candidate = normalize(join(ROOT, clean))
  if (!candidate.startsWith(normalize(ROOT))) return null

  const candidates = [candidate, `${candidate}.html`, join(candidate, 'index.html')]
  for (const path of candidates) {
    try {
      const info = await stat(path)
      if (info.isFile()) return path
    } catch {
      // Try the next candidate.
    }
  }
  return null
}

const server = createServer(async (req, res) => {
  const path = (await resolveFile(req.url)) ?? (await resolveFile('/404.html'))

  if (!path) {
    res.writeHead(404, { 'content-type': 'text/plain' })
    res.end('Not found. Run `npm run build` first.')
    return
  }

  res.writeHead(200, {
    'content-type': MIME[extname(path).toLowerCase()] ?? 'application/octet-stream',
    'cache-control': 'no-cache',
  })
  createReadStream(path).pipe(res)
})

try {
  await stat(ROOT)
} catch {
  console.error('No out/ directory found. Run `npm run build` first.')
  process.exit(1)
}

server.listen(PORT, () => {
  console.log(`\n  LeakLens production build -> http://localhost:${PORT}\n`)
  console.log('  Press Ctrl+C to stop.\n')
})
