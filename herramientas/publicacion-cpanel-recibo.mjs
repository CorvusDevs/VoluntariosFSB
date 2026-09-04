import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('../', import.meta.url))
const DIRECTORIO_ARTEFACTOS = join(RAIZ, '.aletea-publicacion')
const DESTINOS = Object.freeze({
  'gestor-root': '/home/aleteaor/gestor.aletea.org',
  'gestor-dist': '/home/aleteaor/gestor.aletea.org/dist',
  'pagina-prueba': '/home/aleteaor/prueba.aletea.org',
})

export async function sha256(ruta) {
  return createHash('sha256').update(await readFile(ruta)).digest('hex')
}

export function patronLiteralUnzip(entrada) {
  return entrada.replaceAll('[', '[[]').replaceAll('*', '[*]').replaceAll('?', '[?]')
}

export function sha256ContenidoZip(ruta, ejecutar = execFileSync) {
  const hash = createHash('sha256')
  const salida = ejecutar('unzip', ['-Z1', ruta], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const archivos = [...new Set(String(salida).split(/\r?\n/)
    .filter((entrada) => entrada && !entrada.endsWith('/'))
    .map(normalizarEntradaZip).filter(Boolean))].sort()
  for (const entrada of archivos) {
    hash.update(entrada).update('\0')
    hash.update(ejecutar('unzip', ['-p', ruta, patronLiteralUnzip(entrada)], { encoding: null, stdio: ['ignore', 'pipe', 'pipe'] }))
    hash.update('\0')
  }
  return hash.digest('hex')
}

export function selloSeguro(sello) {
  const valor = String(sello || '')
  if (!/^[0-9A-Za-z][0-9A-Za-z._-]{2,100}$/.test(valor)) throw new Error('El sello de publicación no es seguro.')
  return valor
}

export function normalizarEntradaZip(entrada) {
  const valor = String(entrada || '').replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '')
  if (!valor) return ''
  if (valor.startsWith('/') || valor.includes('\0') || valor.includes(',') || valor.split('/').some((parte) => parte === '..' || parte === '')) {
    throw new Error(`El paquete contiene una ruta insegura: ${entrada}`)
  }
  if (valor.split('/').some((parte) => parte === '.htaccess' || parte === 'node_modules' || parte === 'migrations' || /^\.env(?:\.|$)/.test(parte))) {
    throw new Error(`El paquete contiene una ruta prohibida: ${valor}`)
  }
  return valor
}

export function entradasZip(ruta, ejecutar = execFileSync) {
  const salida = ejecutar('unzip', ['-Z1', ruta], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  return [...new Set(String(salida).split(/\r?\n/).map(normalizarEntradaZip).filter(Boolean))].sort()
}

export function entradasSuperiores(entradas) {
  return [...new Set(entradas.map((entrada) => entrada.split('/')[0]))].sort()
}

export function versionesInmutables(entradas) {
  return [...new Set(entradas.flatMap((entrada) => {
    const partes = entrada.split('/')
    return partes[0] === 'release' && partes[1] ? [partes[1]] : []
  }))].sort()
}

function rutaDentro(base, candidata) {
  const absoluta = resolve(candidata)
  const prefijo = `${resolve(base)}/`
  if (!absoluta.startsWith(prefijo)) throw new Error('El recibo referencia un artefacto fuera de su carpeta.')
  return absoluta
}

async function describirPaquete(paquete, carpeta) {
  const nombre = `${paquete.clave}.zip`
  const destino = join(carpeta, nombre)
  await copyFile(paquete.local, destino)
  const entradas = entradasZip(destino)
  if (!entradas.length) throw new Error(`El paquete ${paquete.clave} está vacío.`)
  return {
    clave: paquete.clave,
    destino: paquete.remoto,
    archivo: nombre,
    bytes: (await stat(destino)).size,
    sha256: await sha256(destino),
    contenido_sha256: sha256ContenidoZip(destino),
    entradas,
    entradasSuperiores: entradasSuperiores(entradas),
    versionesInmutables: versionesInmutables(entradas),
  }
}

export async function guardarRecibo(plan, {
  directorio = DIRECTORIO_ARTEFACTOS,
  packageLockSha256 = '',
  fuentePaginaSha256 = '',
  fuenteGestorSha256 = '',
  validacion = { modo: 'completa' },
} = {}) {
  const versionGestor = selloSeguro(plan.versionGestor)
  const versionPagina = plan.versionPagina?.build || plan.versionPagina?.version
  const carpeta = join(directorio, versionGestor)
  await mkdir(carpeta, { recursive: true, mode: 0o700 })
  const paquetes = []
  for (const paquete of plan.paquetes) paquetes.push(await describirPaquete(paquete, carpeta))
  const recibo = {
    esquema: 3,
    creado_en: new Date().toISOString(),
    validado: true,
    version_gestor: versionGestor,
    version_pagina: selloSeguro(versionPagina),
    package_lock_sha256: packageLockSha256,
    fuente_pagina_sha256: fuentePaginaSha256,
    fuente_gestor_sha256: fuenteGestorSha256,
    validacion,
    paquetes,
  }
  const ruta = join(carpeta, 'recibo.json')
  await writeFile(ruta, `${JSON.stringify(recibo, null, 2)}\n`, { mode: 0o600 })
  await mkdir(directorio, { recursive: true, mode: 0o700 })
  await writeFile(join(directorio, 'ultimo-recibo.txt'), `${ruta}\n`, { mode: 0o600 })
  return { ruta, recibo, plan: await planDesdeRecibo(ruta) }
}

function validarFormaRecibo(recibo) {
  if (![1, 2, 3].includes(recibo?.esquema) || recibo.validado !== true) throw new Error('El recibo no corresponde a una preparación validada.')
  selloSeguro(recibo.version_gestor)
  selloSeguro(recibo.version_pagina)
  if (!/^[a-f0-9]{64}$/.test(recibo.package_lock_sha256 || '')) throw new Error('El recibo no contiene una huella válida de package-lock.json.')
  if (recibo.esquema >= 3 && !/^[a-f0-9]{64}$/.test(recibo.fuente_gestor_sha256 || '')) throw new Error('El recibo no contiene una huella válida de las fuentes del gestor.')
  if (recibo.esquema >= 3 && !['completa', 'web-enfocada'].includes(recibo.validacion?.modo)) throw new Error('El recibo no identifica una validación admitida.')
  if (recibo.esquema >= 3 && recibo.validacion?.modo === 'web-enfocada' && !/^.{3,120}$/.test(recibo.validacion.filtro_aceptacion || '')) {
    throw new Error('El recibo no identifica la prueba de aceptación enfocada.')
  }
  if (!Array.isArray(recibo.paquetes) || recibo.paquetes.length !== 3) throw new Error('El recibo debe contener las tres capas de publicación.')
  const claves = recibo.paquetes.map((paquete) => paquete.clave).sort()
  if (claves.join(',') !== Object.keys(DESTINOS).sort().join(',')) throw new Error('El recibo no contiene las capas esperadas.')
  for (const paquete of recibo.paquetes) {
    if (paquete.destino !== DESTINOS[paquete.clave]) throw new Error(`El destino de ${paquete.clave} no coincide con el contrato.`)
    if (basename(paquete.archivo) !== paquete.archivo || !paquete.archivo.endsWith('.zip')) throw new Error(`El artefacto de ${paquete.clave} no es seguro.`)
    if (!/^[a-f0-9]{64}$/.test(paquete.sha256) || !Number.isSafeInteger(paquete.bytes) || paquete.bytes <= 0) throw new Error(`La huella de ${paquete.clave} no es válida.`)
    if (recibo.esquema >= 2 && !/^[a-f0-9]{64}$/.test(paquete.contenido_sha256 || '')) throw new Error(`La huella de contenido de ${paquete.clave} no es válida.`)
    if (!Array.isArray(paquete.entradas) || !paquete.entradas.length) throw new Error(`El recibo no enumera ${paquete.clave}.`)
  }
}

export async function planDesdeRecibo(rutaRecibo) {
  const ruta = resolve(rutaRecibo)
  const recibo = JSON.parse(await readFile(ruta, 'utf8'))
  validarFormaRecibo(recibo)
  const carpeta = dirname(ruta)
  const paquetes = []
  for (const registrado of recibo.paquetes) {
    const local = rutaDentro(carpeta, join(carpeta, registrado.archivo))
    const estado = await stat(local)
    if (!estado.isFile() || estado.size !== registrado.bytes) throw new Error(`Cambió el tamaño del artefacto ${registrado.clave}.`)
    if (await sha256(local) !== registrado.sha256) throw new Error(`Cambió el SHA-256 del artefacto ${registrado.clave}.`)
    const entradas = entradasZip(local)
    if (JSON.stringify(entradas) !== JSON.stringify(registrado.entradas)) throw new Error(`Cambió el contenido interno de ${registrado.clave}.`)
    paquetes.push({
      clave: registrado.clave,
      local,
      remoto: registrado.destino,
      bytes: registrado.bytes,
      sha256: registrado.sha256,
      contenidoSha256: registrado.contenido_sha256 || sha256ContenidoZip(local),
      entradas,
      entradasSuperiores: entradasSuperiores(entradas),
      versionesInmutables: versionesInmutables(entradas),
    })
  }
  return {
    versionGestor: recibo.version_gestor,
    versionPagina: { build: recibo.version_pagina },
    packageLockSha256: recibo.package_lock_sha256,
    fuentePaginaSha256: recibo.fuente_pagina_sha256 || '',
    fuenteGestorSha256: recibo.fuente_gestor_sha256 || '',
    validacion: recibo.validacion || { modo: 'completa' },
    paquetes,
    recibo: ruta,
  }
}

export const _pruebas = { DESTINOS, DIRECTORIO_ARTEFACTOS, rutaDentro, validarFormaRecibo }
