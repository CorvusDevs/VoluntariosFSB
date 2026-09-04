import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  access, mkdir, readFile, readdir, rename, rm, stat, writeFile,
} from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ARCHIVO_ACTUAL = fileURLToPath(import.meta.url)
const RAIZ_GESTOR = resolve(dirname(ARCHIVO_ACTUAL), '..')
const HOME_CUENTA = process.env.ALETEA_DEPLOY_HOME || resolve(RAIZ_GESTOR, '..')
const BASE = join(HOME_CUENTA, '.aletea-deploy')
const INBOX = join(BASE, 'inbox')
const PROCESANDO = join(BASE, 'processing')
const ETAPAS = join(BASE, 'staging')
const RESPALDOS = join(BASE, 'backups')
const FALLIDAS = join(BASE, 'failed')
const RECIBOS = join(BASE, 'receipts')

const DESTINOS = Object.freeze({
  'gestor-root': join(HOME_CUENTA, 'gestor.aletea.org'),
  'gestor-dist': join(HOME_CUENTA, 'gestor.aletea.org', 'dist'),
  'pagina-prueba': join(HOME_CUENTA, 'prueba.aletea.org'),
})

function idSeguro(valor) {
  const id = String(valor || '')
  if (!/^[0-9A-Za-z][0-9A-Za-z._-]{2,100}$/.test(id)) throw new Error('El identificador de publicación no es seguro.')
  return id
}

function nombreSeguro(valor, extension = '.zip') {
  const nombre = String(valor || '')
  if (basename(nombre) !== nombre || !nombre.endsWith(extension) || !/^[0-9A-Za-z._-]+$/.test(nombre)) {
    throw new Error('El nombre del paquete no es seguro.')
  }
  return nombre
}

function normalizarEntrada(entrada) {
  const valor = String(entrada || '').replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '')
  if (!valor) return ''
  if (valor.startsWith('/') || valor.includes('\0') || valor.split('/').some((parte) => !parte || parte === '..')) {
    throw new Error(`Ruta insegura dentro del paquete: ${entrada}`)
  }
  if (valor.split('/').some((parte) => parte === '.htaccess' || parte === 'node_modules' || parte === 'migrations' || /^\.env(?:\.|$)/.test(parte))) {
    throw new Error(`Ruta protegida dentro del paquete: ${valor}`)
  }
  return valor
}

function entradaSuperiorSegura(nombre) {
  return /^[0-9A-Za-z_][0-9A-Za-z._-]*$/.test(nombre)
    && !['node_modules', 'migrations', 'tmp', 'logs'].includes(nombre)
    && nombre !== '.htaccess' && !/^\.env(?:\.|$)/.test(nombre)
}

async function existe(ruta) {
  try { await access(ruta); return true } catch { return false }
}

async function sha256(ruta) {
  return createHash('sha256').update(await readFile(ruta)).digest('hex')
}

async function hashArbol(raiz) {
  const hash = createHash('sha256')
  async function recorrer(carpeta, prefijo = '') {
    const entradas = await readdir(carpeta, { withFileTypes: true })
    for (const entrada of entradas.sort((a, b) => a.name.localeCompare(b.name))) {
      const relativa = prefijo ? `${prefijo}/${entrada.name}` : entrada.name
      const absoluta = join(carpeta, entrada.name)
      if (entrada.isDirectory()) await recorrer(absoluta, relativa)
      else if (entrada.isFile()) hash.update(relativa).update('\0').update(await readFile(absoluta)).update('\0')
    }
  }
  await recorrer(raiz)
  return hash.digest('hex')
}

async function huellasHtaccess() {
  const resultado = {}
  async function recorrer(carpeta) {
    if (!(await existe(carpeta))) return
    for (const entrada of (await readdir(carpeta, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entrada.name === 'node_modules' || entrada.name === '.aletea-deploy') continue
      const ruta = join(carpeta, entrada.name)
      if (entrada.isDirectory()) await recorrer(ruta)
      else if (entrada.isFile() && entrada.name === '.htaccess') resultado[ruta] = await sha256(ruta)
    }
  }
  for (const destino of [DESTINOS['gestor-root'], DESTINOS['pagina-prueba']]) await recorrer(destino)
  return resultado
}

async function limitarRespaldos(maximo = 2) {
  const nombres = (await readdir(RESPALDOS, { withFileTypes: true }))
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => entrada.name)
    .sort().reverse()
  for (const nombre of nombres.slice(maximo)) await rm(join(RESPALDOS, nombre), { recursive: true, force: true })
}

function listarZip(ruta) {
  const salida = execFileSync('/usr/bin/unzip', ['-Z1', ruta], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  return [...new Set(salida.split(/\r?\n/).map(normalizarEntrada).filter(Boolean))].sort()
}

function extraerZip(ruta, destino) {
  execFileSync('/usr/bin/unzip', ['-q', ruta, '-d', destino], { stdio: ['ignore', 'pipe', 'pipe'] })
}

async function escribirJsonAtomico(ruta, datos) {
  await mkdir(dirname(ruta), { recursive: true, mode: 0o700 })
  const temporal = `${ruta}.${process.pid}.tmp`
  await writeFile(temporal, `${JSON.stringify(datos, null, 2)}\n`, { mode: 0o600 })
  await rename(temporal, ruta)
}

function validarManifiesto(manifiesto, id) {
  if (manifiesto?.esquema !== 1 || manifiesto.id !== id || !Array.isArray(manifiesto.paquetes)) {
    throw new Error('El manifiesto del paquete no es válido.')
  }
  const claves = manifiesto.paquetes.map((paquete) => paquete.clave).sort()
  if (claves.join(',') !== Object.keys(DESTINOS).sort().join(',')) throw new Error('Faltan capas de publicación.')
  for (const paquete of manifiesto.paquetes) {
    if (paquete.destino !== DESTINOS[paquete.clave]) throw new Error(`Destino no permitido para ${paquete.clave}.`)
    nombreSeguro(paquete.archivo)
    if (!/^[a-f0-9]{64}$/.test(paquete.sha256 || '') || !Number.isSafeInteger(paquete.bytes) || paquete.bytes <= 0) {
      throw new Error(`Huella inválida para ${paquete.clave}.`)
    }
    if (!Array.isArray(paquete.entradas) || !paquete.entradas.length) throw new Error(`No se enumeró ${paquete.clave}.`)
    paquete.entradas.forEach(normalizarEntrada)
    for (const superior of paquete.entradasSuperiores || []) {
      if (!entradaSuperiorSegura(superior)) throw new Error(`Entrada superior protegida: ${superior}`)
    }
  }
}

async function prepararCapas(manifiesto, carpetaPaquete, id) {
  const capas = []
  for (const paquete of manifiesto.paquetes) {
    const archivo = join(carpetaPaquete, paquete.archivo)
    const info = await stat(archivo)
    if (!info.isFile() || info.size !== paquete.bytes || await sha256(archivo) !== paquete.sha256) {
      throw new Error(`El paquete ${paquete.clave} no coincide con el manifiesto.`)
    }
    const entradas = listarZip(archivo)
    if (JSON.stringify(entradas) !== JSON.stringify([...paquete.entradas].sort())) {
      throw new Error(`El listado de ${paquete.clave} fue alterado.`)
    }
    const etapa = join(ETAPAS, id, paquete.clave)
    await mkdir(etapa, { recursive: true, mode: 0o700 })
    extraerZip(archivo, etapa)
    capas.push({ ...paquete, etapa, destino: DESTINOS[paquete.clave], anteriores: [], promovidas: [], activa: false })
  }
  return capas
}

async function promoverCapa(capa, id) {
  const respaldo = join(RESPALDOS, id, capa.clave)
  const fallida = join(FALLIDAS, id, capa.clave)
  await mkdir(respaldo, { recursive: true, mode: 0o700 })
  await mkdir(fallida, { recursive: true, mode: 0o700 })
  await mkdir(capa.destino, { recursive: true })
  const superiores = [...new Set(capa.entradasSuperiores || capa.entradas.map((entrada) => entrada.split('/')[0]))]
  const ordinarias = superiores.filter((nombre) => nombre !== 'release')
  for (const nombre of ordinarias) {
    if (!entradaSuperiorSegura(nombre)) throw new Error(`Entrada superior protegida: ${nombre}`)
    const viva = join(capa.destino, nombre)
    if (await existe(viva)) {
      await rename(viva, join(respaldo, nombre))
      capa.anteriores.push(nombre)
    }
    await rename(join(capa.etapa, nombre), viva)
  }
  const versiones = [...new Set(capa.versionesInmutables || [])]
  if (versiones.length) await mkdir(join(capa.destino, 'release'), { recursive: true })
  for (const version of versiones) {
    idSeguro(version)
    const nueva = join(capa.etapa, 'release', version)
    const viva = join(capa.destino, 'release', version)
    if (await existe(viva)) {
      if (await hashArbol(viva) !== await hashArbol(nueva)) throw new Error(`La versión inmutable ${version} ya existe con otro contenido.`)
      await rm(nueva, { recursive: true, force: true })
    } else {
      await rename(nueva, viva)
      capa.promovidas.push(version)
    }
  }
  capa.activa = true
}

async function revertirCapa(capa, id) {
  if (!capa.activa && !capa.anteriores.length && !capa.promovidas.length) return
  const respaldo = join(RESPALDOS, id, capa.clave)
  const fallida = join(FALLIDAS, id, capa.clave)
  await mkdir(fallida, { recursive: true, mode: 0o700 })
  const superiores = [...new Set(capa.entradasSuperiores || capa.entradas.map((entrada) => entrada.split('/')[0]))]
    .filter((nombre) => nombre !== 'release')
  for (const nombre of superiores) {
    const viva = join(capa.destino, nombre)
    if (await existe(viva)) await rename(viva, join(fallida, nombre))
  }
  for (const version of capa.promovidas) await rm(join(capa.destino, 'release', version), { recursive: true, force: true })
  for (const nombre of capa.anteriores) await rename(join(respaldo, nombre), join(capa.destino, nombre))
  capa.activa = false
}

async function reiniciarPassenger(etiqueta) {
  const carpeta = join(DESTINOS['gestor-root'], 'tmp')
  await mkdir(carpeta, { recursive: true })
  await writeFile(join(carpeta, 'restart.txt'), `Publicación empaquetada ${etiqueta} ${new Date().toISOString()}\n`)
}

async function verificarVersionViva(manifiesto) {
  let ultimo = 'sin respuesta'
  for (let intento = 0; intento < 18; intento += 1) {
    try {
      const [salud, versionGestor, versionPagina] = await Promise.all([
        fetch(`https://gestor.aletea.org/api/health?publicacion=${Date.now()}`, { cache: 'no-store' }),
        fetch(`https://gestor.aletea.org/version.json?publicacion=${Date.now()}`, { cache: 'no-store' }),
        fetch(`https://prueba.aletea.org/version.json?publicacion=${Date.now()}`, { cache: 'no-store' }),
      ])
      const [datosSalud, datosGestor, datosPagina] = await Promise.all([
        salud.json(), versionGestor.json(), versionPagina.json(),
      ])
      ultimo = JSON.stringify({ salud: salud.status, gestor: datosGestor.version, pagina: datosPagina.build || datosPagina.version })
      if (salud.ok && datosSalud.ok && datosGestor.version === manifiesto.version_gestor
        && (datosPagina.build || datosPagina.version) === manifiesto.version_pagina) return
    } catch (error) { ultimo = error.message }
    await new Promise((resolver) => setTimeout(resolver, 5_000))
  }
  throw new Error(`Las versiones vivas no confirmaron la publicación: ${ultimo}`)
}

async function procesarMarcador(rutaMarcador, dependencias = {}) {
  const inicio = Date.now()
  const marcadorInicial = JSON.parse(await readFile(rutaMarcador, 'utf8'))
  const id = idSeguro(marcadorInicial.id)
  const procesando = join(PROCESANDO, `${id}.json`)
  await mkdir(PROCESANDO, { recursive: true, mode: 0o700 })
  await rename(rutaMarcador, procesando)
  const nombrePaquete = nombreSeguro(marcadorInicial.paquete)
  const paquete = join(INBOX, nombrePaquete)
  const recibo = join(RECIBOS, `${id}.json`)
  const carpetaPaquete = join(ETAPAS, id, '_bundle')
  let capas = []
  try {
    const htaccessInicial = await huellasHtaccess()
    if (!/^[a-f0-9]{64}$/.test(marcadorInicial.sha256 || '') || await sha256(paquete) !== marcadorInicial.sha256) {
      throw new Error('La huella del paquete exterior no coincide.')
    }
    await mkdir(carpetaPaquete, { recursive: true, mode: 0o700 })
    extraerZip(paquete, carpetaPaquete)
    const manifiesto = JSON.parse(await readFile(join(carpetaPaquete, 'manifest.json'), 'utf8'))
    validarManifiesto(manifiesto, id)
    capas = await prepararCapas(manifiesto, carpetaPaquete, id)
    for (const capa of capas) await promoverCapa(capa, id)
    if (JSON.stringify(htaccessInicial) !== JSON.stringify(await huellasHtaccess())) {
      throw new Error('La configuración .htaccess cambió durante la activación.')
    }
    await (dependencias.reiniciar || reiniciarPassenger)(id)
    await (dependencias.verificar || verificarVersionViva)(manifiesto)
    await escribirJsonAtomico(join(RESPALDOS, id, 'transaction.json'), {
      esquema: 1, id, version_gestor: manifiesto.version_gestor, version_pagina: manifiesto.version_pagina,
      capas: capas.map(({ clave, destino, entradasSuperiores, entradas, anteriores, promovidas }) => ({
        clave, destino, entradasSuperiores, entradas, anteriores, promovidas,
      })),
    })
    await escribirJsonAtomico(recibo, {
      esquema: 1, id, estado: 'activada', version_gestor: manifiesto.version_gestor,
      version_pagina: manifiesto.version_pagina, duracion_ms: Date.now() - inicio, completada_en: new Date().toISOString(),
    })
    await limitarRespaldos()
  } catch (error) {
    const errores = []
    for (const capa of [...capas].reverse()) {
      try { await revertirCapa(capa, id) } catch (fallo) { errores.push(fallo.message) }
    }
    try { await (dependencias.reiniciar || reiniciarPassenger)(`rollback-${id}`) } catch (fallo) { errores.push(fallo.message) }
    await escribirJsonAtomico(recibo, {
      esquema: 1, id, estado: 'fallida', error: error.message,
      errores_rollback: errores, duracion_ms: Date.now() - inicio, completada_en: new Date().toISOString(),
    })
  } finally {
    await rm(join(ETAPAS, id), { recursive: true, force: true })
    await rm(paquete, { force: true })
    await rm(procesando, { force: true })
  }
}

export async function principal() {
  await Promise.all([INBOX, PROCESANDO, ETAPAS, RESPALDOS, FALLIDAS, RECIBOS]
    .map((ruta) => mkdir(ruta, { recursive: true, mode: 0o700 })))
  const marcadores = (await readdir(INBOX)).filter((nombre) => nombre.endsWith('.ready.json')).sort()
  for (const nombre of marcadores) await procesarMarcador(join(INBOX, nombre))
}

if (process.argv[1] && resolve(process.argv[1]) === ARCHIVO_ACTUAL) {
  principal().catch((error) => {
    console.error(`Procesamiento de publicación detenido: ${error.message}`)
    process.exitCode = 1
  })
}

export const _pruebas = {
  idSeguro, nombreSeguro, normalizarEntrada, entradaSuperiorSegura, validarManifiesto,
  sha256, hashArbol, huellasHtaccess, limitarRespaldos, listarZip, escribirJsonAtomico,
  verificarVersionViva, procesarMarcador, DESTINOS, BASE, INBOX, RECIBOS,
}
