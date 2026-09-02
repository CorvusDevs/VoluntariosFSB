import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'

const raiz = resolve(new URL('..', import.meta.url).pathname)
const puerto = Number(process.argv[2] || 8765)
const fixtures = new Set([
  '/test/fixtures/cms-overhaul.html',
  '/test/fixtures/formulario-publico.html',
  '/test/fixtures/requisitos-acceso.html',
  '/test/fixtures/novedades-popout.html',
])
const prefijosPublicos = ['/css/', '/js/', '/assets/']
const tipos = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.woff2', 'font/woff2'],
])

const servidor = createServer(async (solicitud, respuesta) => {
  try {
    const ruta = decodeURIComponent(new URL(solicitud.url || '/', 'http://127.0.0.1').pathname)
    const permitida = fixtures.has(ruta) || prefijosPublicos.some((prefijo) => ruta.startsWith(prefijo))
    if (!permitida || ruta.split('/').some((segmento) => segmento.startsWith('.'))) {
      respuesta.writeHead(404, { 'cache-control': 'no-store' }).end('No disponible')
      return
    }
    const archivo = resolve(raiz, `.${ruta}`)
    if (!archivo.startsWith(`${raiz}${sep}`) || !(await stat(archivo)).isFile()) {
      respuesta.writeHead(404, { 'cache-control': 'no-store' }).end('No disponible')
      return
    }
    respuesta.writeHead(200, {
      'content-type': tipos.get(extname(archivo)) || 'application/octet-stream',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    })
    respuesta.end(await readFile(archivo))
  } catch {
    respuesta.writeHead(404, { 'cache-control': 'no-store' }).end('No disponible')
  }
})

servidor.listen(puerto, '127.0.0.1', () => console.log(`Fixtures UI disponibles en http://127.0.0.1:${puerto}`))
