import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { onRequest } from '../functions/api/[[ruta]].js'
import { crearBaseMariaDb } from './base-mysql.mjs'
import { cabecerasDeArchivo } from './cache-estaticos.mjs'
import { cargarEntornoAplicacion } from './cargar-entorno.mjs'
import { aplicarMigracionesMariaDb } from './migraciones.mjs'
import { esRutaGestor, htmlGestorParaRuta } from './rutas-web.mjs'

cargarEntornoAplicacion()

const raiz = fileURLToPath(new URL('../dist/', import.meta.url))
const base = crearBaseMariaDb()
let versionAplicacion = null
const LIMITE_CUERPO = 2 * 1024 * 1024
const tipos = new Map([
  ['.css', 'text/css; charset=utf-8'], ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'], ['.woff2', 'font/woff2'],
])

async function cuerpoDe(peticion) {
  const partes = []
  let total = 0
  for await (const parte of peticion) {
    total += parte.length
    if (total > LIMITE_CUERPO) {
      const error = new Error('Solicitud demasiado grande')
      error.codigoHttp = 413
      throw error
    }
    partes.push(parte)
  }
  return Buffer.concat(partes)
}

function urlPublica(peticion) {
  const protocolo = String(peticion.headers['x-forwarded-proto'] || 'https').split(',')[0]
  return `${protocolo}://${peticion.headers.host}${peticion.url}`
}

async function servirApi(peticion, respuesta) {
  const cuerpo = ['GET', 'HEAD'].includes(peticion.method) ? undefined : await cuerpoDe(peticion)
  const request = new Request(urlPublica(peticion), { method: peticion.method, headers: peticion.headers, body: cuerpo })
  const resultado = await onRequest({
    request,
    env: {
      BASE: base,
      SESSION_SECRET: process.env.SESSION_SECRET,
      SESION_SECRETO: process.env.SESSION_SECRET,
      ENTORNO: 'produccion',
      STAGING_DEPLOY_WEBHOOK: process.env.STAGING_DEPLOY_WEBHOOK,
      ORIGEN_PUBLICO: process.env.ORIGEN_PUBLICO || 'https://gestor.aletea.org',
      EMAIL_TRANSPORT: process.env.EMAIL_TRANSPORT,
      EMAIL_FROM: process.env.EMAIL_FROM,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASSWORD: process.env.SMTP_PASSWORD,
      EMAIL_JOB_STALE_AFTER_MINUTES: process.env.EMAIL_JOB_STALE_AFTER_MINUTES,
      VERSION_APLICACION: versionAplicacion,
    },
  })
  respuesta.statusCode = resultado.status
  resultado.headers.forEach((valor, nombre) => respuesta.setHeader(nombre, valor))
  respuesta.end(Buffer.from(await resultado.arrayBuffer()))
}

async function servirArchivo(peticion, respuesta) {
  const url = new URL(peticion.url, 'https://gestor.aletea.org')
  const rutaUrl = decodeURIComponent(url.pathname)
  if (esRutaGestor(rutaUrl)) {
    const htmlBase = await readFile(join(raiz, 'index.html'), 'utf8')
    const htmlRuta = htmlGestorParaRuta(htmlBase, urlPublica(peticion), rutaUrl)
    respuesta.setHeader('content-type', 'text/html; charset=utf-8')
    respuesta.setHeader('x-content-type-options', 'nosniff')
    respuesta.setHeader('cache-control', 'no-store, max-age=0')
    respuesta.end(peticion.method === 'HEAD' ? '' : htmlRuta)
    return
  }
  const relativa = rutaUrl === '/' ? 'index.html' : rutaUrl.replace(/^\/+/, '')
  const segura = normalize(relativa).replace(/^(\.\.(\/|\\|$))+/, '')
  let archivo = join(raiz, segura)
  try {
    if ((await stat(archivo)).isDirectory()) archivo = join(archivo, 'index.html')
    const contenido = await readFile(archivo)
    respuesta.setHeader('content-type', tipos.get(extname(archivo).toLowerCase()) || 'application/octet-stream')
    respuesta.setHeader('x-content-type-options', 'nosniff')
    for (const [nombre, valor] of Object.entries(cabecerasDeArchivo(archivo))) respuesta.setHeader(nombre, valor)
    respuesta.end(contenido)
  } catch {
    respuesta.statusCode = 404
    respuesta.end('No encontrado')
  }
}

const servidor = createServer(async (peticion, respuesta) => {
  const idSolicitud = randomUUID()
  respuesta.setHeader('x-request-id', idSolicitud)
  try {
    if (peticion.url.startsWith('/api/')) await servirApi(peticion, respuesta)
    else await servirArchivo(peticion, respuesta)
  } catch (error) {
    console.error(JSON.stringify({
      evento: 'solicitud_fallida',
      idSolicitud,
      metodo: peticion.method,
      ruta: String(peticion.url || '').split('?')[0],
      codigoHttp: error.codigoHttp || 500,
      mensaje: String(error?.message || error).slice(0, 1000),
    }))
    respuesta.statusCode = error.codigoHttp || 500
    respuesta.setHeader('content-type', 'application/json; charset=utf-8')
    if (peticion.url.startsWith('/api/formularios')) respuesta.setHeader('access-control-allow-origin', '*')
    respuesta.setHeader('cache-control', 'no-store, max-age=0')
    respuesta.end(JSON.stringify({
      error: error.codigoHttp === 413 ? 'El archivo supera el límite permitido.' : 'No se pudo completar la operación.',
      referencia: idSolicitud,
    }))
  }
})

async function iniciarServidor() {
  try {
    const version = JSON.parse(await readFile(join(raiz, 'version.json'), 'utf8'))
    versionAplicacion = version.build || version.version || null
  } catch {
    versionAplicacion = null
  }
  await aplicarMigracionesMariaDb(base)
  servidor.listen(process.env.PORT || 3000)
}

iniciarServidor().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
