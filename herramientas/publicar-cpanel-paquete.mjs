import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { planDesdeRecibo } from './publicacion-cpanel-recibo.mjs'
import { argumentosSftp } from './publicar-cpanel-sftp.mjs'
import { verificarVivo } from './publicar-cpanel-api.mjs'

const RAIZ = fileURLToPath(new URL('../', import.meta.url))
const CONFIG_LOCAL = join(homedir(), '.config', 'aletea', 'publicacion.json')
const BASE_REMOTA = '/home/aleteaor/.aletea-deploy'

export function opcionesDesde(argumentos) {
  const opciones = { recibo: '', webRoot: '', simular: false, timeoutSegundos: 180 }
  for (let i = 0; i < argumentos.length; i += 1) {
    const argumento = argumentos[i]
    if (argumento === '--recibo') opciones.recibo = argumentos[++i] || ''
    else if (argumento === '--web-root') opciones.webRoot = argumentos[++i] || ''
    else if (argumento === '--simular') opciones.simular = true
    else if (argumento === '--timeout-segundos') opciones.timeoutSegundos = Number(argumentos[++i])
    else throw new Error(`Opción desconocida: ${argumento}`)
  }
  if (!opciones.recibo) throw new Error('La publicación empaquetada requiere --recibo validado.')
  if (!Number.isFinite(opciones.timeoutSegundos) || opciones.timeoutSegundos < 30 || opciones.timeoutSegundos > 900) {
    throw new Error('--timeout-segundos debe estar entre 30 y 900.')
  }
  return opciones
}

async function leerConfig() {
  try { return JSON.parse(await readFile(CONFIG_LOCAL, 'utf8')) } catch { return {} }
}

async function sha256(ruta) {
  return createHash('sha256').update(await readFile(ruta)).digest('hex')
}

function escaparSftp(ruta) {
  if (ruta.includes('\n') || ruta.includes('\r')) throw new Error('Una ruta contiene saltos de línea.')
  return `"${ruta.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
}

async function ejecutarBatch(conexion, comandos, etapa, nombre, tolerarFallo = false) {
  const batch = join(etapa, `${nombre}.sftp`)
  await writeFile(batch, `${comandos.join('\n')}\n`, { mode: 0o600 })
  try {
    execFileSync('sftp', argumentosSftp({ ...conexion, batch }), { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    return true
  } catch (error) {
    if (tolerarFallo) return false
    const detalle = error.stderr?.trim() || error.stdout?.trim() || error.message
    throw new Error(`Falló la etapa SFTP ${nombre}: ${detalle}`)
  }
}

export async function prepararBundle(plan, etapa) {
  const id = plan.versionGestor
  const carpeta = join(etapa, id)
  await mkdir(carpeta, { recursive: true, mode: 0o700 })
  const paquetes = []
  for (const paquete of plan.paquetes) {
    const archivo = basename(paquete.local)
    await copyFile(paquete.local, join(carpeta, archivo))
    paquetes.push({
      clave: paquete.clave,
      destino: paquete.remoto,
      archivo,
      bytes: paquete.bytes,
      sha256: paquete.sha256,
      entradas: paquete.entradas,
      entradasSuperiores: paquete.entradasSuperiores,
      versionesInmutables: paquete.versionesInmutables,
    })
  }
  const manifiesto = {
    esquema: 1, id, creado_en: new Date().toISOString(),
    version_gestor: plan.versionGestor,
    version_pagina: plan.versionPagina.build || plan.versionPagina.version,
    package_lock_sha256: plan.packageLockSha256,
    validacion: plan.validacion || { modo: 'completa' },
    paquetes,
  }
  await writeFile(join(carpeta, 'manifest.json'), `${JSON.stringify(manifiesto, null, 2)}\n`, { mode: 0o600 })
  const bundle = join(etapa, `${id}.zip`)
  execFileSync('zip', ['-qr', bundle, '.'], { cwd: carpeta, stdio: ['ignore', 'pipe', 'pipe'] })
  return { id, bundle, bytes: (await stat(bundle)).size, sha256: await sha256(bundle), manifiesto }
}

async function subirSolicitud(conexion, preparado, etapa) {
  const paqueteFinal = `${BASE_REMOTA}/inbox/${preparado.id}.zip`
  const paqueteTemporal = `${paqueteFinal}.tmp`
  const marcadorFinal = `${BASE_REMOTA}/inbox/${preparado.id}.ready.json`
  const marcadorTemporal = `${marcadorFinal}.tmp`
  const marcadorLocal = join(etapa, `${preparado.id}.ready.json`)
  await writeFile(marcadorLocal, `${JSON.stringify({
    esquema: 1, id: preparado.id, paquete: basename(paqueteFinal), sha256: preparado.sha256,
  }, null, 2)}\n`, { mode: 0o600 })
  await ejecutarBatch(conexion, [
    `-mkdir ${escaparSftp(BASE_REMOTA)}`,
    `-mkdir ${escaparSftp(`${BASE_REMOTA}/inbox`)}`,
    `-mkdir ${escaparSftp(`${BASE_REMOTA}/receipts`)}`,
    `put ${escaparSftp(preparado.bundle)} ${escaparSftp(paqueteTemporal)}`,
    `rename ${escaparSftp(paqueteTemporal)} ${escaparSftp(paqueteFinal)}`,
    `put ${escaparSftp(marcadorLocal)} ${escaparSftp(marcadorTemporal)}`,
    `rename ${escaparSftp(marcadorTemporal)} ${escaparSftp(marcadorFinal)}`,
  ], etapa, 'subir-paquete')
}

async function comprobarDependencias(conexion, plan, etapa) {
  const local = join(etapa, 'package-lock-remoto.json')
  const disponible = await ejecutarBatch(conexion, [
    `get ${escaparSftp('/home/aleteaor/gestor.aletea.org/package-lock.json')} ${escaparSftp(local)}`,
  ], etapa, 'comprobar-package-lock', true)
  if (!disponible) throw new Error('No se pudo comprobar el package-lock.json activo.')
  if (await sha256(local) !== plan.packageLockSha256) {
    throw new Error('Cambió package-lock.json. Usá el flujo de recuperación SFTP para instalar dependencias antes de volver al paquete rápido.')
  }
}

async function esperarRecibo(conexion, id, etapa, timeoutSegundos) {
  const remoto = `${BASE_REMOTA}/receipts/${id}.json`
  const local = join(etapa, `${id}.receipt.json`)
  const limite = Date.now() + timeoutSegundos * 1000
  let intento = 0
  while (Date.now() < limite) {
    intento += 1
    await rm(local, { force: true })
    await ejecutarBatch(conexion, [`-get ${escaparSftp(remoto)} ${escaparSftp(local)}`], etapa, `recibo-${intento}`, true)
    try { return JSON.parse(await readFile(local, 'utf8')) } catch {}
    await new Promise((resolver) => setTimeout(resolver, 5_000))
  }
  throw new Error(`cPanel no produjo un recibo en ${timeoutSegundos} segundos.`)
}

export async function principal(argumentos = process.argv.slice(2)) {
  const opciones = opcionesDesde(argumentos)
  const config = await leerConfig()
  const webRootConfigurado = opciones.webRoot || process.env.ALETEA_WEB_ROOT || config.webRoot
  if (!webRootConfigurado) throw new Error('Configurá --web-root o ALETEA_WEB_ROOT con la carpeta de la página.')
  const webRoot = resolve(webRootConfigurado)
  const plan = await planDesdeRecibo(resolve(opciones.recibo))
  const conexion = {
    host: process.env.ALETEA_SSH_HOST || config.sshHost || 'adriana.servidorlinux11.com',
    usuario: process.env.ALETEA_SSH_USER || config.sshUser || 'aleteaor',
    puerto: Number(process.env.ALETEA_SSH_PORT || config.sshPort || 2200),
    clave: resolve(process.env.ALETEA_SSH_KEY || config.sshKey || join(homedir(), '.ssh', 'aletea_deploy_ed25519')),
  }
  const etapa = await mkdtemp(join(tmpdir(), 'aletea-paquete-'))
  try {
    const preparado = await prepararBundle(plan, etapa)
    console.log(`Paquete único: ${preparado.bytes} bytes, ${plan.paquetes.length} capas, versión ${preparado.id}.`)
    if (opciones.simular) {
      console.log('Simulación completa. No se modificó cPanel.')
      return
    }
    const inicio = Date.now()
    await comprobarDependencias(conexion, plan, etapa)
    await subirSolicitud(conexion, preparado, etapa)
    const recibo = await esperarRecibo(conexion, preparado.id, etapa, opciones.timeoutSegundos)
    if (recibo.estado !== 'activada') throw new Error(`El servidor rechazó la publicación: ${recibo.error || 'error desconocido'}`)
    await verificarVivo(plan, webRoot)
    console.log(`Publicación empaquetada confirmada en ${((Date.now() - inicio) / 1000).toFixed(1)} s.`)
    console.log(`Servidor: ${(Number(recibo.duracion_ms || 0) / 1000).toFixed(1)} s. Gestor ${recibo.version_gestor}, página ${recibo.version_pagina}.`)
  } finally {
    await rm(etapa, { recursive: true, force: true })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((error) => {
    console.error(`Publicación detenida: ${error.message}`)
    process.exitCode = 1
  })
}

export const _pruebas = { escaparSftp, prepararBundle, comprobarDependencias, sha256, BASE_REMOTA }
