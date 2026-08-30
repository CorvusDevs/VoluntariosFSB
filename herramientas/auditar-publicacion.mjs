import { readFile, readdir, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const raiz = new URL('../', import.meta.url)
const dist = new URL('../dist/', import.meta.url)
const errores = []

async function texto(base, ruta) {
  return readFile(new URL(ruta, base), 'utf8')
}

function exigir(condicion, mensaje) {
  if (!condicion) errores.push(mensaje)
}

async function archivos(base, prefijo = '') {
  const resultado = []
  for (const entrada of await readdir(new URL(prefijo || './', base), { withFileTypes: true })) {
    const ruta = `${prefijo}${entrada.name}`
    if (entrada.isDirectory()) resultado.push(...await archivos(base, `${ruta}/`))
    else resultado.push(ruta)
  }
  return resultado
}

async function sha(base, ruta) {
  return createHash('sha256').update(await readFile(new URL(ruta, base))).digest('hex')
}

async function huellaFuentes() {
  const rutas = ['index.html', 'formulario.html', 'actualizar.html', 'sw.js']
  for (const carpeta of ['css/', 'js/']) rutas.push(...await archivos(raiz, carpeta))
  const huella = createHash('sha256')
  for (const ruta of rutas.sort()) {
    const normalizado = (await texto(raiz, ruta))
      .replace(/(VERSION\s*=\s*')[^']*'/g, '$1__BUILD__\'')
      .replace(/(version\s*=\s*')[^']*'/g, '$1__BUILD__\'')
      .replace(/([?&]v=)[^"&]+/g, '$1__BUILD__')
    huella.update(ruta)
    huella.update('\0')
    huella.update(normalizado)
    huella.update('\0')
  }
  return huella.digest('hex').slice(0, 10)
}

const { version } = JSON.parse(await texto(raiz, 'version.json'))
exigir(/^\d{4}-\d{2}-\d{2}\.\d{4}-[a-f0-9]{10}$/.test(version), 'El sello no incluye fecha y huella de contenido.')
exigir(version.endsWith(`-${await huellaFuentes()}`), 'La huella del sello no coincide con las fuentes actuales. Volvé a ejecutar npm run preparar:publicacion.')

const versionJs = (await texto(raiz, 'js/version.js')).match(/VERSION = '([^']+)'/)?.[1]
const versionSw = (await texto(raiz, 'sw.js')).match(/VERSION = '([^']+)'/)?.[1]
const versionRecuperacion = (await texto(raiz, 'actualizar.html')).match(/version = '([^']+)'/)?.[1]
exigir(versionJs === version, 'js/version.js no coincide con version.json.')
exigir(versionSw === version, 'sw.js no coincide con version.json.')
exigir(versionRecuperacion === version, 'actualizar.html no coincide con version.json.')

const lista = await archivos(dist)
const prohibidos = [
  /(^|\/)\.htaccess$/i,
  /(^|\/)\.env(?:\.|$)/i,
  /(^|\/)node_modules\//i,
  /(^|\/)migrations?\//i,
  /(^|\/)servidor-cpanel\//i,
  /(^|\/)(?:stderr|error)\.log$/i,
  /(^|\/)(?:secrets?|credentials?)\b/i,
]
for (const ruta of lista) {
  if (prohibidos.some((patron) => patron.test(ruta))) errores.push(`Archivo prohibido en dist/: ${ruta}`)
}

for (const nombre of ['index.html', 'formulario.html']) {
  const html = await texto(dist, nombre)
  exigir(html.includes(`release/${version}/css/estilos.css`), `${nombre} no usa el CSS del build actual.`)
  exigir(html.includes(`release/${version}/js/`), `${nombre} no usa JavaScript del build actual.`)
}

for (const ruta of ['css/estilos.css', 'js/app.js', 'js/version.js']) {
  const original = await sha(raiz, ruta)
  const publicado = await sha(dist, `release/${version}/${ruta}`)
  exigir(original === publicado, `${ruta} no coincide con su copia inmutable.`)
}

const recuperacion = await texto(dist, 'actualizar.html')
exigir(recuperacion.includes('getRegistrations'), 'La recuperación no busca todos los workers registrados.')
exigir(recuperacion.includes('unregister()'), 'La recuperación no desregistra el worker anterior.')
exigir(recuperacion.includes("startsWith('voluntarios-fsb-')"), 'La recuperación no limita la limpieza a caches propias.')
exigir(recuperacion.includes("searchParams.set('actualizada', version)"), 'La recuperación no abre una navegación sellada.')

const sw = await texto(dist, 'sw.js')
exigir(sw.includes("cache: 'reload'"), 'El worker no evita la cache HTTP al consultar la red.')
exigir(sw.includes('skipWaiting()') && sw.includes('clients.claim()'), 'El worker no toma control inmediatamente.')

try {
  const info = await stat(new URL(`release/${version}/`, dist))
  exigir(info.isDirectory(), 'Falta el directorio inmutable del build.')
} catch {
  errores.push('Falta el directorio inmutable del build.')
}

if (errores.length) {
  console.error(`Auditoría de publicación fallida (${errores.length}):`)
  errores.forEach((error) => console.error(`- ${error}`))
  process.exitCode = 1
} else {
  console.log(`Publicación coherente: ${version}`)
  console.log(`${lista.length} archivos revisados, sin archivos protegidos en dist/.`)
}
