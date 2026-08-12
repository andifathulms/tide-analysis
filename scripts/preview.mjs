/**
 * Serve ./out under the production basePath, so the site is verified exactly as
 * GitHub Pages will serve it (PRD §12) before anything is pushed.
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'

const BASE_PATH = process.env.BASE_PATH ?? '/tide-analysis'
const PORT = Number(process.env.PORT ?? 4321)
const ROOT = join(process.cwd(), 'out')

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

async function resolve(pathname) {
  const candidates = [pathname, `${pathname}.html`, join(pathname, 'index.html')]
  for (const candidate of candidates) {
    try {
      const info = await stat(candidate)
      if (info.isFile()) return candidate
    } catch {
      // try the next candidate
    }
  }
  return null
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost')
  let pathname = decodeURIComponent(url.pathname)

  if (BASE_PATH !== '' && !pathname.startsWith(BASE_PATH)) {
    response.writeHead(302, { Location: `${BASE_PATH}${pathname}` })
    response.end()
    return
  }
  pathname = pathname.slice(BASE_PATH.length) || '/'

  const file = await resolve(join(ROOT, pathname))
  if (file === null) {
    response.writeHead(404, { 'Content-Type': 'text/plain' })
    response.end('404')
    return
  }
  const body = await readFile(file)
  response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' })
  response.end(body)
}).listen(PORT, () => {
  console.log(`out/ served at http://localhost:${PORT}${BASE_PATH}/`)
})
