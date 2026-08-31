import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { CpanelApi } from './cpanel-api.mjs'

const RAIZ = fileURLToPath(new URL('../', import.meta.url))
const CONFIG_LOCAL = join(homedir(), '.config', 'aletea', 'publicacion.json')
const SERVICIO_KEYCHAIN = 'aletea-cpanel-deploy'

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

export function rutaRelativaCuenta(ruta, usuario) {
  const prefijo = `/home/${usuario}/`
  if (!ruta.startsWith(prefijo)) throw new Error(`La ruta remota debe estar dentro de ${prefijo}`)
  return ruta.slice(prefijo.length)
}

async function existe(ruta) {
  try { return (await stat(ruta)).isFile() || (await stat(ruta)).isDirectory() } catch { return false }
}

async function leerConfig() {
  try { return JSON.parse(await readFile(CONFIG_LOCAL, 'utf8')) } catch { return {} }
}

function ejecutar(comando, argumentos, opciones = {}) {
  execFileSync(comando, argumentos, { stdio: 'inherit', ...opciones })
}

export function puertoPruebasPublicacion(pid = process.pid, configurado = process.env.PLAYWRIGHT_PORT) {
  return String(configurado || (44000 + (Number(pid) % 10000)))
}

function tokenDesdeKeychain(usuario) {
  if (process.env.CPANEL_API_TOKEN) return process.env.CPANEL_API_TOKEN.trim()
  try {
    return execFileSync('security', ['find-generic-password', '-w', '-a', usuario, '-s', SERVICIO_KEYCHAIN], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    throw new Error(`No hay token configurado. Guardalo una sola vez en Keychain con el servicio ${SERVICIO_KEYCHAIN}.`)
  }
}

async function sha256(ruta) {
  return createHash('sha256').update(await readFile(ruta)).digest('hex')
}

function comprimirDirectorio(origen, salida) {
  ejecutar('zip', ['-qr', salida, '.'], { cwd: origen })
}

export async function prepararPaquetes({ sinConstruir, webRoot, etapa }) {
  const gestorRoot = join(etapa, 'gestor-root.zip')
  const gestorDist = join(etapa, 'gestor-dist.zip')
  const pagina = join(etapa, 'pagina-prueba.zip')
  const entorno = { ...process.env, SALIDA_CPANEL: gestorRoot }

  ejecutar('bash', ['herramientas/preparar-cpanel.sh', ...(sinConstruir ? ['--sin-construir'] : [])], { cwd: RAIZ, env: entorno })
  comprimirDirectorio(join(RAIZ, 'dist'), gestorDist)

  if (!sinConstruir) {
    ejecutar('npm', ['run', 'release:staging'], { cwd: webRoot, env: { ...process.env, PLAYWRIGHT_PORT: puertoPruebasPublicacion() } })
  }
  if (!(await existe(join(webRoot, 'dist', 'version.json')))) throw new Error('La página de prueba no tiene dist/version.json.')
  comprimirDirectorio(join(webRoot, 'dist'), pagina)

  const versionGestor = JSON.parse(await readFile(join(RAIZ, 'dist', 'version.json'), 'utf8')).version
  const versionPagina = JSON.parse(await readFile(join(webRoot, 'dist', 'version.json'), 'utf8'))
  return {
    versionGestor,
    versionPagina,
    paquetes: [
      { clave: 'gestor-root', local: gestorRoot, remoto: '/home/aleteaor/gestor.aletea.org' },
      { clave: 'gestor-dist', local: gestorDist, remoto: '/home/aleteaor/gestor.aletea.org/dist' },
      { clave: 'pagina-prueba', local: pagina, remoto: '/home/aleteaor/prueba.aletea.org' },
    ],
  }
}

export async function describirPlan(plan) {
  return Promise.all(plan.paquetes.map(async (paquete) => ({
    clave: paquete.clave,
    destino: paquete.remoto,
    bytes: (await stat(paquete.local)).size,
    sha256: await sha256(paquete.local),
  })))
}

async function subirPaquetes(api, plan, usuario) {
  const marca = Date.now()
  for (const paquete of plan.paquetes) {
    paquete.nombreRemoto = `.publicacion-${paquete.clave}-${marca}.zip`
    await api.subirArchivo(paquete.local, paquete.remoto, paquete.nombreRemoto)
    console.log(`Subido: ${paquete.clave}`)
  }
  for (const paquete of plan.paquetes) {
    const absoluta = `${paquete.remoto}/${paquete.nombreRemoto}`
    await api.api2('Fileman', 'fileop', {
      op: 'extract', sourcefiles: rutaRelativaCuenta(absoluta, usuario), doubledecode: 1,
    })
    console.log(`Extraído: ${paquete.clave}`)
  }
}

async function reiniciarPassenger(api, version) {
  await api.uapi('Fileman', 'save_file_content', {
    dir: '/home/aleteaor/gestor.aletea.org/tmp',
    file: 'restart.txt',
    content: `Publicación API ${version} ${new Date().toISOString()}\n`,
    from_charset: 'utf-8',
    to_charset: 'utf-8',
  })
}

async function obtener(url, opciones = {}) {
  const respuesta = await fetch(`${url}${url.includes('?') ? '&' : '?'}publicacion=${Date.now()}`, {
    cache: 'no-store', redirect: 'follow', signal: AbortSignal.timeout(30_000), ...opciones,
  })
  return { respuesta, cuerpo: Buffer.from(await respuesta.arrayBuffer()) }
}

async function esperarGestor(version) {
  let ultimo = ''
  for (let intento = 0; intento < 18; intento += 1) {
    try {
      const { respuesta, cuerpo } = await obtener('https://gestor.aletea.org/api/health')
      ultimo = cuerpo.toString('utf8')
      if (respuesta.ok && respuesta.headers.get('cache-control')?.includes('no-store') && JSON.parse(ultimo).ok) {
        const versionViva = await obtener('https://gestor.aletea.org/version.json')
        if (JSON.parse(versionViva.cuerpo.toString('utf8')).version === version) return
      }
    } catch (error) { ultimo = error.message }
    await new Promise((resolver) => setTimeout(resolver, 5_000))
  }
  throw new Error(`Passenger no confirmó la versión ${version}. Última respuesta: ${ultimo}`)
}

async function verificarArchivo(local, url) {
  const { respuesta, cuerpo } = await obtener(url)
  if (!respuesta.ok) throw new Error(`${url} respondió ${respuesta.status}.`)
  const remoto = createHash('sha256').update(cuerpo).digest('hex')
  const esperado = await sha256(local)
  if (remoto !== esperado) throw new Error(`El hash vivo no coincide: ${url}`)
}

export async function verificarVivo(plan, webRoot) {
  await esperarGestor(plan.versionGestor)
  for (const relativa of ['version.json', 'sw.js', 'js/version.js', 'css/estilos.css']) {
    await verificarArchivo(join(RAIZ, 'dist', relativa), `https://gestor.aletea.org/${relativa}`)
  }
  for (let vuelta = 0; vuelta < 2; vuelta += 1) {
    for (const ruta of ['/', '/tareas', '/formularios']) {
      const { respuesta, cuerpo } = await obtener(`https://gestor.aletea.org${ruta}`)
      if (!respuesta.ok || !cuerpo.toString('utf8').includes(plan.versionGestor)) throw new Error(`Falló la ruta viva ${ruta}.`)
    }
  }
  await verificarArchivo(join(webRoot, 'dist', 'version.json'), 'https://prueba.aletea.org/version.json')
  const selloPagina = plan.versionPagina.build || plan.versionPagina.version
  for (let vuelta = 0; vuelta < 2; vuelta += 1) {
    const { respuesta, cuerpo } = await obtener('https://prueba.aletea.org/')
    if (!respuesta.ok || !cuerpo.toString('utf8').includes(selloPagina)) throw new Error('La página de prueba no muestra el sello esperado.')
  }
  for (const ruta of ['/.env', '/migrations/0054_vigencia_cuentas.sql', '/servidor-cpanel/app.mjs']) {
    const { respuesta } = await obtener(`https://gestor.aletea.org${ruta}`)
    if (![403, 404].includes(respuesta.status)) throw new Error(`La ruta protegida ${ruta} respondió ${respuesta.status}.`)
  }
}

async function limpiarPaquetes(api, plan, usuario) {
  for (const paquete of plan.paquetes) {
    const absoluta = `${paquete.remoto}/${paquete.nombreRemoto}`
    try {
      await api.api2('Fileman', 'fileop', {
        op: 'trash', sourcefiles: rutaRelativaCuenta(absoluta, usuario), doubledecode: 1,
      })
    } catch (error) { console.warn(`No se pudo retirar ${paquete.nombreRemoto}: ${error.message}`) }
  }
}

export async function principal(argumentos = process.argv.slice(2)) {
  const opciones = opcionesDesde(argumentos)
  const config = await leerConfig()
  const webRootConfigurado = opciones.webRoot || process.env.ALETEA_WEB_ROOT || config.webRoot
  if (!webRootConfigurado) throw new Error('Configurá --web-root o ALETEA_WEB_ROOT con la carpeta de la página.')
  const webRoot = resolve(webRootConfigurado)
  if (!(await existe(join(webRoot, 'package.json')))) throw new Error('La carpeta configurada para la página no contiene package.json.')
  const etapa = await mkdtemp(join(tmpdir(), 'aletea-publicacion-'))
  try {
    const plan = await prepararPaquetes({ ...opciones, webRoot, etapa })
    console.table(await describirPlan(plan))
    console.log(`Gestor: ${plan.versionGestor}`)
    console.log(`Página: ${plan.versionPagina.build || plan.versionPagina.version}`)
    if (opciones.simular) {
      console.log('Simulación completa. No se modificó cPanel.')
      return
    }
    const host = process.env.CPANEL_HOST || config.host || 'cpanel.aletea.org'
    const usuario = process.env.CPANEL_USER || config.usuario || 'aleteaor'
    const api = new CpanelApi({ host, usuario, token: tokenDesdeKeychain(usuario) })
    await subirPaquetes(api, plan, usuario)
    await reiniciarPassenger(api, plan.versionGestor)
    await verificarVivo(plan, webRoot)
    await limpiarPaquetes(api, plan, usuario)
    console.log('Publicación confirmada: archivos, Passenger, migraciones, hashes y rutas vivas.')
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

export const _pruebas = { prepararPaquetes, sha256, verificarArchivo, SERVICIO_KEYCHAIN, CONFIG_LOCAL }
