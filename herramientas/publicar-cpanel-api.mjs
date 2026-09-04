import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFile, mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { CpanelApi } from './cpanel-api.mjs'
import { entradasSuperiores, entradasZip, guardarRecibo, planDesdeRecibo, sha256, sha256ContenidoZip, versionesInmutables } from './publicacion-cpanel-recibo.mjs'
import { publicarTransaccional, rutaRelativaCuenta } from './publicacion-cpanel-transaccion.mjs'

const RAIZ = fileURLToPath(new URL('../', import.meta.url))
const CONFIG_LOCAL = join(homedir(), '.config', 'aletea', 'publicacion.json')
const SERVICIO_KEYCHAIN = 'aletea-cpanel-deploy'
const ULTIMO_RECIBO = join(RAIZ, '.aletea-publicacion', 'ultimo-recibo.txt')

export function opcionesDesde(argumentos) {
  const opciones = { simular: false, sinConstruir: false, webRoot: '', recibo: '', forzarTodo: false, filtroAceptacion: '' }
  for (let i = 0; i < argumentos.length; i += 1) {
    const argumento = argumentos[i]
    if (argumento === '--simular') opciones.simular = true
    else if (argumento === '--sin-construir') opciones.sinConstruir = true
    else if (argumento === '--web-root') opciones.webRoot = argumentos[++i] || ''
    else if (argumento === '--recibo') opciones.recibo = argumentos[++i] || ''
    else if (argumento === '--forzar-todo') opciones.forzarTodo = true
    else if (argumento === '--filtro-aceptacion') opciones.filtroAceptacion = argumentos[++i] || ''
    else throw new Error(`Opción desconocida: ${argumento}`)
  }
  if (opciones.filtroAceptacion && (opciones.filtroAceptacion.length < 3 || opciones.filtroAceptacion.length > 120 || opciones.filtroAceptacion.startsWith('-'))) {
    throw new Error('--filtro-aceptacion debe describir una prueba concreta entre 3 y 120 caracteres.')
  }
  if (opciones.forzarTodo && opciones.filtroAceptacion) throw new Error('--forzar-todo no se puede combinar con una validación enfocada.')
  if (opciones.recibo && opciones.filtroAceptacion) throw new Error('--recibo ya identifica pruebas ejecutadas y no acepta otro filtro.')
  return opciones
}
export { rutaRelativaCuenta }

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

export function hostCpanel(config = {}, entorno = process.env) {
  return entorno.CPANEL_HOST || config.cpanelHost || config.host || 'cpanel.aletea.org'
}

export function tokenDesdeKeychain(usuario) {
  if (process.env.CPANEL_API_TOKEN) return process.env.CPANEL_API_TOKEN.trim()
  try {
    return execFileSync('security', ['find-generic-password', '-w', '-a', usuario, '-s', SERVICIO_KEYCHAIN], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    throw new Error(`No hay token configurado. Guardalo una sola vez en Keychain con el servicio ${SERVICIO_KEYCHAIN}.`)
  }
}

function comprimirDirectorio(origen, salida, excluidas = []) {
  const argumentos = ['-qr', salida, '.']
  if (excluidas.length) argumentos.push('-x', ...excluidas)
  ejecutar('zip', argumentos, { cwd: origen })
}

export async function huellaFuentesPagina(webRoot) {
  const ignoradas = new Set(['.git', '.astro', 'dist', 'node_modules', 'reports', 'test-results'])
  const archivos = []
  async function recorrer(carpeta, prefijo = '') {
    for (const entrada of await readdir(carpeta, { withFileTypes: true })) {
      if (entrada.isDirectory() && ignoradas.has(entrada.name)) continue
      const relativa = prefijo ? `${prefijo}/${entrada.name}` : entrada.name
      const absoluta = join(carpeta, entrada.name)
      if (entrada.isDirectory()) await recorrer(absoluta, relativa)
      else if (entrada.isFile()) archivos.push({ absoluta, relativa })
    }
  }
  await recorrer(webRoot)
  const hash = createHash('sha256')
  for (const archivo of archivos.sort((a, b) => a.relativa.localeCompare(b.relativa))) {
    hash.update(archivo.relativa).update('\0').update(await readFile(archivo.absoluta)).update('\0')
  }
  return hash.digest('hex')
}

function normalizarSelloGenerado(relativa, contenido) {
  if (['version.json', 'js/version.js'].includes(relativa)) return Buffer.from('__SELLO_GENERADO__')
  if (!['sw.js', 'index.html', 'formulario.html', 'actualizar.html'].includes(relativa)) return contenido
  const texto = contenido.toString('utf8')
    .replace(/(VERSION\s*=\s*')[^']*'/g, '$1__BUILD__\'')
    .replace(/(version\s*=\s*')[^']*'/g, '$1__BUILD__\'')
    .replace(/([?&]v=)[^"&]+/g, '$1__BUILD__')
  return Buffer.from(texto)
}

export async function huellaFuentesGestor(raiz = RAIZ) {
  const entradasProduccion = [
    'assets', 'css', 'js',
    'index.html', 'formulario.html', 'actualizar.html', 'sw.js', 'version.json',
    'app.js', 'package.json', 'package-lock.json',
    'functions/api/[[ruta]].js',
    'servidor-cpanel/app.mjs', 'servidor-cpanel/base-mysql.mjs', 'servidor-cpanel/cache-estaticos.mjs',
    'servidor-cpanel/cargar-entorno.mjs', 'servidor-cpanel/migraciones.mjs', 'servidor-cpanel/rutas-web.mjs',
    'servidor-cpanel/procesar-cola-correos.mjs', 'servidor-cpanel/registro-operaciones.mjs',
    'servidor-cpanel/mantenimiento-sistema.mjs', 'servidor-cpanel/procesar-publicacion.mjs',
    'servidor-cpanel/ejecutar-trabajo.sh',
    'herramientas/sellar.sh', 'herramientas/preparar-cloudflare.mjs', 'herramientas/preparar-cpanel.sh',
    'herramientas/auditar-publicacion.mjs', 'herramientas/publicar-cpanel-api.mjs',
    'herramientas/publicacion-cpanel-recibo.mjs',
  ]
  const archivos = []
  async function recorrer(carpeta, prefijo = '') {
    for (const entrada of await readdir(carpeta, { withFileTypes: true })) {
      if (entrada.name === '.DS_Store') continue
      const relativa = prefijo ? `${prefijo}/${entrada.name}` : entrada.name
      const absoluta = join(carpeta, entrada.name)
      if (entrada.isDirectory()) await recorrer(absoluta, relativa)
      else if (entrada.isFile()) archivos.push({ absoluta, relativa })
    }
  }
  for (const entrada of entradasProduccion) {
    const absoluta = join(raiz, entrada)
    if (!(await existe(absoluta))) continue
    if ((await stat(absoluta)).isDirectory()) await recorrer(absoluta, entrada)
    else archivos.push({ absoluta, relativa: entrada })
  }
  const hash = createHash('sha256')
  for (const archivo of archivos.sort((a, b) => a.relativa.localeCompare(b.relativa))) {
    hash.update(archivo.relativa).update('\0').update(normalizarSelloGenerado(archivo.relativa, await readFile(archivo.absoluta))).update('\0')
  }
  return hash.digest('hex')
}

export function huellaPaginaConContenido(fuentePaginaSha256, contenidoPublicado) {
  return createHash('sha256')
    .update(fuentePaginaSha256)
    .update('\0')
    .update(contenidoPublicado)
    .digest('hex')
}

async function huellaPublicacionPagina(webRoot) {
  const fuentePaginaSha256 = await huellaFuentesPagina(webRoot)
  const url = process.env.CMS_PUBLIC_CONTENT_URL_OVERRIDE || 'https://gestor.aletea.org/api/pagina-web/publicada'
  const { respuesta, cuerpo } = await obtener(url)
  if (!respuesta.ok) throw new Error(`No se pudo verificar el contenido público del CMS: ${respuesta.status}.`)
  return huellaPaginaConContenido(fuentePaginaSha256, cuerpo)
}

async function paginaValidadaAnterior(fuentePaginaSha256) {
  try {
    const ruta = (await readFile(ULTIMO_RECIBO, 'utf8')).trim()
    const plan = await planDesdeRecibo(ruta)
    if (!fuentePaginaSha256 || plan.fuentePaginaSha256 !== fuentePaginaSha256) return null
    const paquete = plan.paquetes.find((item) => item.clave === 'pagina-prueba')
    return paquete ? { paquete, versionPagina: plan.versionPagina } : null
  } catch { return null }
}

async function gestorValidadoAnterior(fuenteGestorSha256) {
  try {
    const ruta = (await readFile(ULTIMO_RECIBO, 'utf8')).trim()
    const plan = await planDesdeRecibo(ruta)
    if (!fuenteGestorSha256 || plan.fuenteGestorSha256 !== fuenteGestorSha256) return null
    const gestorRoot = plan.paquetes.find((item) => item.clave === 'gestor-root')
    const gestorDist = plan.paquetes.find((item) => item.clave === 'gestor-dist')
    return gestorRoot && gestorDist ? { paquetes: [gestorRoot, gestorDist], versionGestor: plan.versionGestor } : null
  } catch { return null }
}

export function comandosValidacionWeb(filtroAceptacion = '') {
  if (!filtroAceptacion) return [
    ['npm', ['run', 'release:staging']],
  ]
  return [
    ['npm', ['test']],
    ['npm', ['run', 'test:acceptance', '--', '--grep', filtroAceptacion]],
    ['npm', ['run', 'build:staging']],
  ]
}

export async function prepararPaquetes({ sinConstruir, webRoot, etapa, paginaReutilizada = null, gestorReutilizado = null, filtroAceptacion = '' }) {
  const gestorRoot = join(etapa, 'gestor-root.zip')
  const gestorDist = join(etapa, 'gestor-dist.zip')
  const pagina = join(etapa, 'pagina-prueba.zip')
  const entorno = { ...process.env, SALIDA_CPANEL: gestorRoot }

  if (gestorReutilizado) {
    await copyFile(gestorReutilizado.paquetes.find((item) => item.clave === 'gestor-root').local, gestorRoot)
    await copyFile(gestorReutilizado.paquetes.find((item) => item.clave === 'gestor-dist').local, gestorDist)
  } else {
    if (!sinConstruir) ejecutar('npm', ['test'], { cwd: RAIZ })
    ejecutar('bash', ['herramientas/preparar-cpanel.sh', ...(sinConstruir ? ['--sin-construir'] : [])], { cwd: RAIZ, env: entorno })
    comprimirDirectorio(join(RAIZ, 'dist'), gestorDist)
  }

  if (!sinConstruir && !paginaReutilizada) {
    for (const [comando, argumentos] of comandosValidacionWeb(filtroAceptacion)) {
      ejecutar(comando, argumentos, { cwd: webRoot, env: { ...process.env, PLAYWRIGHT_PORT: puertoPruebasPublicacion() } })
    }
  }
  if (paginaReutilizada) await copyFile(paginaReutilizada.paquete.local, pagina)
  else {
    if (!(await existe(join(webRoot, 'dist', 'version.json')))) throw new Error('La página de prueba no tiene dist/version.json.')
    comprimirDirectorio(join(webRoot, 'dist'), pagina, ['.htaccess'])
  }

  const versionGestor = gestorReutilizado?.versionGestor || JSON.parse(await readFile(join(RAIZ, 'dist', 'version.json'), 'utf8')).version
  const versionPagina = paginaReutilizada?.versionPagina || JSON.parse(await readFile(join(webRoot, 'dist', 'version.json'), 'utf8'))
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
    bytes: paquete.bytes || (await stat(paquete.local)).size,
    sha256: paquete.sha256 || await sha256(paquete.local),
    archivos: paquete.entradas?.length || entradasZip(paquete.local).length,
  })))
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

export async function asegurarDependenciasPassenger(api) {
  await api.uapi('PassengerApps', 'ensure_deps', {
    type: 'npm',
    app_path: 'gestor.aletea.org',
  })
}

async function obtener(url, opciones = {}, dependencias = {}) {
  const fetchImpl = dependencias.fetchImpl || fetch
  const esperar = dependencias.esperar || ((ms) => new Promise((resolver) => setTimeout(resolver, ms)))
  const intentos = dependencias.intentos || 3
  const timeoutMs = dependencias.timeoutMs || 45_000
  const pausaMs = dependencias.pausaMs ?? 1_500
  let ultimoError
  for (let intento = 1; intento <= intentos; intento += 1) {
    try {
      const separador = url.includes('?') ? '&' : '?'
      const respuesta = await fetchImpl(`${url}${separador}publicacion=${Date.now()}-${intento}`, {
        cache: 'no-store', redirect: 'follow', signal: AbortSignal.timeout(timeoutMs), ...opciones,
      })
      const cuerpo = Buffer.from(await respuesta.arrayBuffer())
      if (respuesta.status !== 429 && respuesta.status < 500) return { respuesta, cuerpo }
      ultimoError = new Error(`${url} respondió temporalmente ${respuesta.status}.`)
    } catch (error) {
      ultimoError = error
    }
    if (intento < intentos) await esperar(pausaMs * intento)
  }
  throw ultimoError
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
  await Promise.all(['version.json', 'sw.js', 'js/version.js', 'css/estilos.css'].map((relativa) =>
    verificarArchivo(join(RAIZ, 'dist', relativa), `https://gestor.aletea.org/${relativa}`)))
  for (let vuelta = 0; vuelta < 2; vuelta += 1) {
    await Promise.all(['/', '/tareas', '/formularios'].map(async (ruta) => {
      const { respuesta, cuerpo } = await obtener(`https://gestor.aletea.org${ruta}`)
      if (!respuesta.ok || !cuerpo.toString('utf8').includes(plan.versionGestor)) throw new Error(`Falló la ruta viva ${ruta}.`)
    }))
  }
  await verificarArchivo(join(webRoot, 'dist', 'version.json'), 'https://prueba.aletea.org/version.json')
  const selloPagina = plan.versionPagina.build || plan.versionPagina.version
  const rondasPagina = []
  for (let vuelta = 0; vuelta < 2; vuelta += 1) rondasPagina.push(obtener('https://prueba.aletea.org/'))
  for (const { respuesta, cuerpo } of await Promise.all(rondasPagina)) {
    if (!respuesta.ok || !cuerpo.toString('utf8').includes(selloPagina)) throw new Error('La página de prueba no muestra el sello esperado.')
  }
  await Promise.all(['/.env', '/migrations/0054_vigencia_cuentas.sql', '/servidor-cpanel/app.mjs'].map(async (ruta) => {
    const { respuesta } = await obtener(`https://gestor.aletea.org${ruta}`)
    if (![403, 404].includes(respuesta.status)) throw new Error(`La ruta protegida ${ruta} respondió ${respuesta.status}.`)
  }))
}

async function completarMetadatosPlan(plan) {
  plan.packageLockSha256 ||= await sha256(join(RAIZ, 'package-lock.json'))
  for (const paquete of plan.paquetes) {
    paquete.bytes ||= (await stat(paquete.local)).size
    paquete.sha256 ||= await sha256(paquete.local)
    paquete.contenidoSha256 ||= sha256ContenidoZip(paquete.local)
    paquete.entradas ||= entradasZip(paquete.local)
    paquete.entradasSuperiores ||= entradasSuperiores(paquete.entradas)
    paquete.versionesInmutables ||= versionesInmutables(paquete.entradas)
  }
  return plan
}

async function comprobarSalidasLocales(plan, webRoot) {
  ejecutar('npm', ['run', 'auditar:publicacion'], { cwd: RAIZ })
  const gestor = JSON.parse(await readFile(join(RAIZ, 'dist', 'version.json'), 'utf8')).version
  const pagina = JSON.parse(await readFile(join(webRoot, 'dist', 'version.json'), 'utf8'))
  if (gestor !== plan.versionGestor) throw new Error('El recibo no coincide con el build local del gestor.')
  if ((pagina.build || pagina.version) !== (plan.versionPagina.build || plan.versionPagina.version)) {
    throw new Error('El recibo no coincide con el build local de la página de prueba.')
  }
}

async function planPreparado(opciones, webRoot, etapa) {
  if (opciones.recibo) {
    const plan = await planDesdeRecibo(resolve(opciones.recibo))
    await comprobarSalidasLocales(plan, webRoot)
    return { plan, rutaRecibo: plan.recibo, reutilizado: true }
  }
  if (opciones.sinConstruir) throw new Error('--sin-construir requiere --recibo para publicar exactamente un artefacto ya validado.')
  const fuenteGestorSha256 = await huellaFuentesGestor()
  const gestorReutilizado = opciones.forzarTodo ? null : await gestorValidadoAnterior(fuenteGestorSha256)
  const fuentePaginaSha256 = await huellaPublicacionPagina(webRoot)
  const paginaReutilizada = opciones.forzarTodo ? null : await paginaValidadaAnterior(fuentePaginaSha256)
  const filtroAceptacion = opciones.filtroAceptacion && gestorReutilizado && !paginaReutilizada ? opciones.filtroAceptacion : ''
  if (opciones.filtroAceptacion && !filtroAceptacion && !paginaReutilizada) {
    console.log('La huella del gestor cambió o falta un recibo compatible: se escaló automáticamente a validación completa.')
  }
  const planCrudo = await prepararPaquetes({
    sinConstruir: false, webRoot, etapa, paginaReutilizada, gestorReutilizado, filtroAceptacion,
  })
  const packageLockSha256 = await sha256(join(RAIZ, 'package-lock.json'))
  const validacion = { modo: filtroAceptacion ? 'web-enfocada' : 'completa' }
  if (filtroAceptacion) validacion.filtro_aceptacion = filtroAceptacion
  const guardado = await guardarRecibo(planCrudo, { packageLockSha256, fuentePaginaSha256, fuenteGestorSha256, validacion })
  if (paginaReutilizada) console.log('Página sin cambios: se reutilizó el último artefacto validado y se omitieron sus pruebas y construcción.')
  if (gestorReutilizado) console.log('Gestor sin cambios: se reutilizaron sus artefactos validados y se omitieron sus pruebas y construcción.')
  if (filtroAceptacion) console.log(`Validación web enfocada: pruebas unitarias, aceptación «${filtroAceptacion}» y construcción completa.`)
  return { plan: await completarMetadatosPlan(guardado.plan), rutaRecibo: guardado.ruta, reutilizado: false }
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
    const { plan, rutaRecibo, reutilizado } = await planPreparado(opciones, webRoot, etapa)
    console.table(await describirPlan(plan))
    console.log(`Gestor: ${plan.versionGestor}`)
    console.log(`Página: ${plan.versionPagina.build || plan.versionPagina.version}`)
    console.log(`Recibo inmutable: ${rutaRecibo}`)
    if (opciones.simular) {
      console.log(`Simulación completa. ${reutilizado ? 'Se reutilizó' : 'Se creó'} el recibo validado y no se modificó cPanel.`)
      return
    }
    const host = hostCpanel(config)
    const usuario = process.env.CPANEL_USER || config.usuario || 'aleteaor'
    const api = new CpanelApi({ host, usuario, token: tokenDesdeKeychain(usuario) })
    const resultado = await publicarTransaccional({
      api, plan, usuario, forzarTodo: opciones.forzarTodo,
      verificarVivo: (planActual) => verificarVivo(planActual, webRoot),
      asegurarDependencias: asegurarDependenciasPassenger,
      reiniciar: reiniciarPassenger,
    })
    console.log(`Publicación transaccional confirmada en ${(resultado.duracionMs / 1000).toFixed(1)} s.`)
    console.log(`Capas publicadas: ${resultado.publicadas.join(', ') || 'ninguna'}. Capas sin cambios: ${resultado.omitidas.join(', ') || 'ninguna'}.`)
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
  prepararPaquetes, verificarArchivo, obtener, completarMetadatosPlan, comprobarSalidasLocales, planPreparado,
  huellaFuentesPagina, huellaFuentesGestor, huellaPublicacionPagina, paginaValidadaAnterior, gestorValidadoAnterior,
  comandosValidacionWeb, SERVICIO_KEYCHAIN, CONFIG_LOCAL, ULTIMO_RECIBO,
}
