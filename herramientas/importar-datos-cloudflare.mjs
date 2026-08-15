#!/usr/bin/env node
// Importador de un solo sentido: GitHub privado -> SQL temporal para D1.
// Nunca escribe en GitHub, nunca guarda el token y no deja datos en el repo.
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const DUENIO = 'CorvusDevs'
const REPOSITORIO = 'VoluntariosFSB-datos'
const ARCHIVOS_POR_LOTE = 20

export function rutaDocumentoValida(ruta) {
  return ruta === 'roster.json'
    || ruta === 'seguimientos.json'
    || /^listas\/\d{4}-\d{2}-\d{2}\.json$/.test(ruta)
    || /^asistencias\/\d{4}-\d{2}\.json$/.test(ruta)
}

export function claveFoto(ruta) {
  const coincidencia = /^fotos\/([a-zA-Z0-9_.-]+)$/.exec(ruta)
  return coincidencia?.[1] ?? null
}

const literal = (texto) => `'${String(texto).replaceAll("'", "''")}'`
const blob = (datos) => `X'${Buffer.from(datos).toString('hex')}'`

async function pedirJson(url, token) {
  const respuesta = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
    },
  })
  if (!respuesta.ok) throw new Error(`GitHub respondió ${respuesta.status} al leer datos privados.`)
  return respuesta.json()
}

async function leerArbol(token) {
  const arbol = await pedirJson(
    `https://api.github.com/repos/${DUENIO}/${REPOSITORIO}/git/trees/main?recursive=1`, token,
  )
  if (arbol.truncated) throw new Error('El árbol de datos privados es demasiado grande para importar de forma segura.')
  return arbol.tree.filter((entrada) => entrada.type === 'blob')
}

async function leerBlob(sha, token) {
  const datos = await pedirJson(
    `https://api.github.com/repos/${DUENIO}/${REPOSITORIO}/git/blobs/${sha}`, token,
  )
  if (datos.encoding !== 'base64' || typeof datos.content !== 'string') {
    throw new Error('GitHub devolvió un archivo privado en un formato inesperado.')
  }
  return Buffer.from(datos.content.replace(/\s/g, ''), 'base64')
}

function sqlDocumento(ruta, contenido) {
  return `INSERT INTO documentos (ruta, contenido, revision, actualizado_por, actualizado_en)
SELECT ${literal(ruta)}, ${literal(contenido)}, 1, 'migracion', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM documentos WHERE ruta = ${literal(ruta)});`
}

function sqlFoto(clave, datos, tipo) {
  return `INSERT INTO fotos (clave, datos, tipo, revision, actualizado_por, actualizado_en)
SELECT ${literal(clave)}, ${blob(datos)}, ${literal(tipo)}, 1, 'migracion', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM fotos WHERE clave = ${literal(clave)});`
}

function tipoFoto(ruta) {
  if (/\.png$/i.test(ruta)) return 'image/png'
  if (/\.webp$/i.test(ruta)) return 'image/webp'
  return 'image/jpeg'
}

function argumentos(argumentos) {
  const salida = { seco: false, destino: null }
  for (let indice = 0; indice < argumentos.length; indice += 1) {
    if (argumentos[indice] === '--dry-run') salida.seco = true
    else if (argumentos[indice] === '--out') salida.destino = argumentos[++indice]
    else throw new Error(`Argumento desconocido: ${argumentos[indice]}`)
  }
  if (!salida.destino) throw new Error('Usá --out /ruta/temporal para no dejar datos privados en el repositorio.')
  return salida
}

export async function prepararImportacion({ token, destino }) {
  const entradas = await leerArbol(token)
  const elegidas = entradas.filter((entrada) => rutaDocumentoValida(entrada.path) || claveFoto(entrada.path))
  const documentos = []
  const fotos = []
  for (const entrada of elegidas) {
    const datos = await leerBlob(entrada.sha, token)
    const hash = crypto.createHash('sha256').update(datos).digest('hex')
    if (rutaDocumentoValida(entrada.path)) {
      try { JSON.parse(datos.toString('utf8')) } catch { throw new Error(`${entrada.path} no contiene JSON válido.`) }
      documentos.push({ ruta: entrada.path, contenido: datos.toString('utf8'), bytes: datos.length, sha256: hash })
      continue
    }
    const clave = claveFoto(entrada.path)
    if (datos.length > 500 * 1024) throw new Error(`${entrada.path} supera el límite de 500 KB para fotos.`)
    fotos.push({ clave, ruta: entrada.path, datos, bytes: datos.length, sha256: hash, tipo: tipoFoto(entrada.path) })
  }
  const resumen = {
    origen: `${DUENIO}/${REPOSITORIO}@main`,
    documentos: documentos.map(({ ruta, bytes, sha256 }) => ({ ruta, bytes, sha256 })),
    fotos: fotos.map(({ clave, ruta, bytes, sha256, tipo }) => ({ clave, ruta, bytes, sha256, tipo })),
  }
  resumen.totales = {
    documentos: documentos.length,
    fotos: fotos.length,
    bytes: documentos.reduce((total, item) => total + item.bytes, 0) + fotos.reduce((total, item) => total + item.bytes, 0),
  }
  await fs.mkdir(destino, { recursive: true, mode: 0o700 })
  await fs.writeFile(path.join(destino, 'resumen.json'), `${JSON.stringify(resumen, null, 2)}\n`, { mode: 0o600 })
  const sentencias = [
    ...documentos.map((item) => sqlDocumento(item.ruta, item.contenido)),
    ...fotos.map((item) => sqlFoto(item.clave, item.datos, item.tipo)),
  ]
  for (let inicio = 0; inicio < sentencias.length; inicio += ARCHIVOS_POR_LOTE) {
    const lote = sentencias.slice(inicio, inicio + ARCHIVOS_POR_LOTE)
    await fs.writeFile(path.join(destino, `lote-${String(inicio / ARCHIVOS_POR_LOTE + 1).padStart(3, '0')}.sql`),
      `BEGIN;\n${lote.join('\n')}\nCOMMIT;\n`, { mode: 0o600 })
  }
  return resumen
}

async function principal() {
  const { seco, destino } = argumentos(process.argv.slice(2))
  const token = process.env.VFSB_GITHUB_TOKEN
  if (!token) throw new Error('Falta VFSB_GITHUB_TOKEN. No pegues el token en comandos ni archivos.')
  const resumen = await prepararImportacion({ token, destino })
  console.log(JSON.stringify({ ...resumen.totales, destino, seco }, null, 2))
  if (!seco) console.log('SQL temporal preparado. Revisá resumen.json antes de ejecutar cada lote con Wrangler D1.')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  principal().catch((fallo) => { console.error(fallo.message); process.exitCode = 1 })
}
