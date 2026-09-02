import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { CpanelApi } from './cpanel-api.mjs'
import { asegurarDependenciasPassenger, describirPlan, prepararPaquetes, tokenDesdeKeychain, verificarVivo } from './publicar-cpanel-api.mjs'

const RAIZ = fileURLToPath(new URL('../', import.meta.url))
const CONFIG_LOCAL = join(homedir(), '.config', 'aletea', 'publicacion.json')
const HOST_PREDETERMINADO = 'adriana.servidorlinux11.com'
const USUARIO_PREDETERMINADO = 'aleteaor'
const PUERTO_PREDETERMINADO = 2200
const CLAVE_PREDETERMINADA = join(homedir(), '.ssh', 'aletea_deploy_ed25519')

export function opcionesDesde(argumentos) {
  const opciones = { simular: false, sinConstruir: false, webRoot: '' }
  for (let i = 0; i < argumentos.length; i += 1) {
    const argumento = argumentos[i]
    if (argumento === '--simular') opciones.simular = true
    else if (argumento === '--sin-construir') opciones.sinConstruir = true
    else if (argumento === '--web-root') opciones.webRoot = argumentos[++i] || ''
    else throw new Error(`Opción desconocida: ${argumento}`)
  }
  return opciones
}

async function existe(ruta) {
  try { await stat(ruta); return true } catch { return false }
}

async function leerConfig() {
  try { return JSON.parse(await readFile(CONFIG_LOCAL, 'utf8')) } catch { return {} }
}

function ejecutar(comando, argumentos, opciones = {}) {
  return execFileSync(comando, argumentos, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opciones })
}

function escaparSftp(ruta) {
  if (ruta.includes('\n') || ruta.includes('\r')) throw new Error('Una ruta contiene saltos de línea.')
  return `"${ruta.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
}

async function archivosDe(raiz) {
  const resultado = []
  async function recorrer(carpeta) {
    const entradas = await readdir(carpeta, { withFileTypes: true })
    for (const entrada of entradas) {
      const absoluta = join(carpeta, entrada.name)
      if (entrada.isDirectory()) await recorrer(absoluta)
      else if (entrada.isFile()) resultado.push(relative(raiz, absoluta).split(sep).join('/'))
    }
  }
  await recorrer(raiz)
  return resultado.sort()
}

async function directoriosDe(archivos) {
  const resultado = new Set()
  for (const archivo of archivos) {
    let carpeta = dirname(archivo).split(sep).join('/')
    while (carpeta !== '.' && carpeta !== '/') {
      resultado.add(carpeta)
      carpeta = dirname(carpeta).split(sep).join('/')
    }
  }
  return [...resultado].sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))
}

export function argumentosSftp({ host, usuario, puerto, clave, batch }) {
  return [
    '-P', String(puerto), '-i', clave,
    '-oBatchMode=yes', '-oIdentitiesOnly=yes', '-oStrictHostKeyChecking=yes',
    '-oConnectTimeout=15', '-b', batch, `${usuario}@${host}`,
  ]
}

async function ejecutarBatch(conexion, comandos, etapa, nombre) {
  const batch = join(etapa, `${nombre}.sftp`)
  await writeFile(batch, `${comandos.join('\n')}\n`, { mode: 0o600 })
  try {
    return ejecutar('sftp', argumentosSftp({ ...conexion, batch }))
  } catch (error) {
    const detalle = error.stderr?.trim() || error.stdout?.trim() || error.message
    throw new Error(`Falló la etapa SFTP ${nombre}: ${detalle}`)
  }
}

async function expandirPaquetes(plan, etapa) {
  const capas = []
  for (const paquete of plan.paquetes) {
    const carpeta = join(etapa, 'capas', paquete.clave)
    await mkdir(carpeta, { recursive: true })
    ejecutar('unzip', ['-q', paquete.local, '-d', carpeta])
    const archivos = await archivosDe(carpeta)
    if (!archivos.length) throw new Error(`El paquete ${paquete.clave} está vacío.`)
    capas.push({ ...paquete, carpeta, archivos })
  }
  return capas
}

async function descargarRespaldos(conexion, capas, etapa) {
  const comandos = []
  for (const capa of capas) {
    capa.respaldo = join(etapa, 'respaldo', capa.clave)
    await mkdir(capa.respaldo, { recursive: true })
    for (const archivo of capa.archivos) {
      if (!requiereRespaldo(archivo)) continue
      const local = join(capa.respaldo, archivo)
      await mkdir(dirname(local), { recursive: true })
      comandos.push(`-get ${escaparSftp(`${capa.remoto}/${archivo}`)} ${escaparSftp(local)}`)
    }
  }
  await ejecutarBatch(conexion, comandos, etapa, 'respaldar')
}

function requiereRespaldo(archivo) {
  return !archivo.startsWith('release/')
}

async function cambiaronDependencias(capas) {
  const gestor = capas.find((capa) => capa.clave === 'gestor-root')
  if (!gestor) return false
  const nueva = join(gestor.carpeta, 'package-lock.json')
  const anterior = join(gestor.respaldo, 'package-lock.json')
  if (!(await existe(anterior))) return true
  return !(await readFile(nueva)).equals(await readFile(anterior))
}

async function dependenciasProduccion(capas) {
  const gestor = capas.find((capa) => capa.clave === 'gestor-root')
  if (!gestor) return []
  const lock = JSON.parse(await readFile(join(gestor.carpeta, 'package-lock.json'), 'utf8'))
  const declaradas = lock.packages?.['']?.dependencies || {}
  return Object.keys(declaradas).sort().map((nombre) => {
    const version = lock.packages?.[`node_modules/${nombre}`]?.version
    if (!version) throw new Error(`package-lock.json no fija la versión de ${nombre}.`)
    return { nombre, version }
  })
}

async function descargarManifiestosDependencias(conexion, capas, etapa) {
  const dependencias = await dependenciasProduccion(capas)
  const carpeta = join(etapa, 'dependencias-instaladas')
  const comandos = []
  for (const dependencia of dependencias) {
    const local = join(carpeta, dependencia.nombre, 'package.json')
    await mkdir(dirname(local), { recursive: true })
    comandos.push(`-get ${escaparSftp(`/home/aleteaor/gestor.aletea.org/node_modules/${dependencia.nombre}/package.json`)} ${escaparSftp(local)}`)
  }
  if (comandos.length) await ejecutarBatch(conexion, comandos, etapa, 'comprobar-dependencias')
  return { carpeta, dependencias }
}

async function dependenciasInstaladas({ carpeta, dependencias }) {
  for (const dependencia of dependencias) {
    try {
      const manifiesto = JSON.parse(await readFile(join(carpeta, dependencia.nombre, 'package.json'), 'utf8'))
      if (manifiesto.version !== dependencia.version) return false
    } catch {
      return false
    }
  }
  return true
}

async function comandosPublicacion(capas, marca) {
  const comandos = []
  for (const capa of capas) {
    for (const carpeta of await directoriosDe(capa.archivos)) comandos.push(`-mkdir ${escaparSftp(`${capa.remoto}/${carpeta}`)}`)
    for (const archivo of capa.archivos) {
      const remoto = `${capa.remoto}/${archivo}`
      const temporal = `${remoto}.aletea-${marca}.tmp`
      comandos.push(`put ${escaparSftp(join(capa.carpeta, archivo))} ${escaparSftp(temporal)}`)
      comandos.push(`-rm ${escaparSftp(remoto)}`)
      comandos.push(`rename ${escaparSftp(temporal)} ${escaparSftp(remoto)}`)
    }
  }
  return comandos
}

async function comandosRestauracion(capas, marca) {
  const comandos = []
  for (const capa of [...capas].reverse()) {
    for (const archivo of capa.archivos) {
      const remoto = `${capa.remoto}/${archivo}`
      const respaldo = join(capa.respaldo, archivo)
      if (await existe(respaldo)) {
        const temporal = `${remoto}.restaurar-${marca}.tmp`
        comandos.push(`put ${escaparSftp(respaldo)} ${escaparSftp(temporal)}`)
        comandos.push(`-rm ${escaparSftp(remoto)}`)
        comandos.push(`rename ${escaparSftp(temporal)} ${escaparSftp(remoto)}`)
      } else comandos.push(`-rm ${escaparSftp(remoto)}`)
    }
  }
  return comandos
}

async function reiniciar(conexion, etapa, version, etiqueta) {
  const local = join(etapa, `restart-${etiqueta}.txt`)
  await writeFile(local, `Publicación SFTP ${version} ${new Date().toISOString()}\n`)
  await ejecutarBatch(conexion, [
    '-mkdir "/home/aleteaor/gestor.aletea.org/tmp"',
    `put ${escaparSftp(local)} "/home/aleteaor/gestor.aletea.org/tmp/restart.txt"`,
  ], etapa, `reiniciar-${etiqueta}`)
}

export async function principal(argumentos = process.argv.slice(2)) {
  const opciones = opcionesDesde(argumentos)
  const config = await leerConfig()
  const webRootConfigurado = opciones.webRoot || process.env.ALETEA_WEB_ROOT || config.webRoot
  if (!webRootConfigurado) throw new Error('Configurá --web-root o ALETEA_WEB_ROOT con la carpeta de la página.')
  const webRoot = resolve(webRootConfigurado)
  if (!(await existe(join(webRoot, 'package.json')))) throw new Error('La carpeta configurada para la página no contiene package.json.')
  const conexion = {
    host: process.env.ALETEA_SSH_HOST || config.sshHost || HOST_PREDETERMINADO,
    usuario: process.env.ALETEA_SSH_USER || config.sshUser || USUARIO_PREDETERMINADO,
    puerto: Number(process.env.ALETEA_SSH_PORT || config.sshPort || PUERTO_PREDETERMINADO),
    clave: resolve(process.env.ALETEA_SSH_KEY || config.sshKey || CLAVE_PREDETERMINADA),
  }
  if (!(await existe(conexion.clave))) throw new Error(`No se encontró la clave SSH: ${conexion.clave}`)
  const etapa = await mkdtemp(join(tmpdir(), 'aletea-publicacion-sftp-'))
  let capas = []
  try {
    const plan = await prepararPaquetes({ ...opciones, webRoot, etapa })
    console.table(await describirPlan(plan))
    console.log(`Gestor: ${plan.versionGestor}`)
    console.log(`Página: ${plan.versionPagina.build || plan.versionPagina.version}`)
    if (opciones.simular) {
      console.log('Simulación completa. No se modificó cPanel.')
      return
    }
    capas = await expandirPaquetes(plan, etapa)
    await descargarRespaldos(conexion, capas, etapa)
    const lockCambio = await cambiaronDependencias(capas)
    const estadoDependencias = lockCambio ? await descargarManifiestosDependencias(conexion, capas, etapa) : null
    const instalarDependencias = lockCambio && !(await dependenciasInstaladas(estadoDependencias))
    if (lockCambio && !instalarDependencias) console.log('Dependencias de producción ya instaladas; no se requiere Application Manager.')
    const api = instalarDependencias ? new CpanelApi({
      host: process.env.CPANEL_HOST || config.cpanelHost || config.host || 'cpanel.aletea.org',
      usuario: process.env.CPANEL_USER || config.usuario || 'aleteaor',
      token: tokenDesdeKeychain(process.env.CPANEL_USER || config.usuario || 'aleteaor'),
    }) : null
    const marca = Date.now()
    try {
      await ejecutarBatch(conexion, await comandosPublicacion(capas, marca), etapa, 'publicar')
      if (api) {
        await asegurarDependenciasPassenger(api)
        console.log('Dependencias npm confirmadas por Application Manager.')
      }
      await reiniciar(conexion, etapa, plan.versionGestor, 'publicar')
      await verificarVivo(plan, webRoot)
    } catch (error) {
      console.error(`La verificación falló. Restaurando la versión anterior: ${error.message}`)
      await ejecutarBatch(conexion, await comandosRestauracion(capas, marca), etapa, 'restaurar')
      await reiniciar(conexion, etapa, 'anterior', 'restaurar')
      throw new Error('La publicación no quedó activa y se restauraron los archivos anteriores.')
    }
    console.log('Publicación confirmada: respaldo, transferencia, Passenger, migraciones, hashes y rutas vivas.')
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

export const _pruebas = {
  archivosDe, directoriosDe, escaparSftp, comandosPublicacion, cambiaronDependencias,
  dependenciasProduccion, dependenciasInstaladas, requiereRespaldo,
}
