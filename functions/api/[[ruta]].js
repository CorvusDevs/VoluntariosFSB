import { clonarContenidoPaginaWeb, contenidoComoBorrador, validarContenidoPaginaWeb } from '../../js/modelo/pagina-web.js'
import { importeCentavosFsb, prepararCuotasFsb, prepararRecargosFsb, resumenFinanzasFsb, signoMovimientoFsb } from '../../js/modelo/finanzas-fsb.js'
import { bytesImagenConLimite, LIMITE_IMAGEN_REMOTA, urlDescargaGoogleDrive } from '../../js/imagen/cargar-remota.js'
import { MENSAJE_ENLACE_INVALIDO, normalizarEnlaceUsuario } from '../../js/util/enlaces.js'
import {
  CAPACIDAD_CREAR_TAREAS, perfilAccesoInstitucional, permisoCrearTareasEfectivo, puedeGestionarPaginaWeb, puedeUsarComunicacionVisual, puedeVerMetricasPaginaWeb,
} from '../../js/acceso/permisos-funciones.js'
import {
  campanaComunicacionDesde, solicitudComunicacionDesde, temasComunicacionValidos,
} from '../../js/modelo/comunicaciones.js'
import {
  controlOperativoDesde, controlesOperativosConEstado, estadoTrabajoCorreo, resumenOperativo,
} from '../../js/modelo/operaciones.js'
import {
  campoBaseRequerido, campoBaseVisible, configuracionPublicaFormulario, configuracionPublicaJson, correoFormularioValido,
} from '../../js/modelo/formularios.js'

const responder = (datos, estado = 200, cabeceras = {}) => new Response(
  datos === null ? null : JSON.stringify(datos),
  { status: estado, headers: { 'content-type': 'application/json; charset=utf-8', ...cabeceras } },
)

const error = (mensaje, estado, cabeceras = {}) => responder({ error: mensaje }, estado, cabeceras)
const responderHtml = (contenido, estado = 200) => new Response(contenido, {
  status: estado,
  headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow, noarchive' },
})

const ORIGENES_FORMULARIOS_PUBLICOS = new Set([
  'https://prueba.aletea.org',
  'http://127.0.0.1:4321',
  'http://127.0.0.1:8778',
  'http://localhost:4321',
])

export function cabecerasFormularioPublico(request) {
  const origen = request.headers.get('origin') || ''
  if (!ORIGENES_FORMULARIOS_PUBLICOS.has(origen)) return {}
  return {
    'access-control-allow-origin': origen,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  }
}

const CODIFICADOR = new TextEncoder()
const DURACION_SESION = 60 * 60 * 24 * 7
const ITERACIONES_CONTRASENA = 100000

function base64url(datos) {
  const bytes = datos instanceof Uint8Array ? datos : new Uint8Array(datos)
  let binario = ''
  bytes.forEach((byte) => { binario += String.fromCharCode(byte) })
  return btoa(binario).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function desdeBase64url(texto) {
  const base64 = texto.replaceAll('-', '+').replaceAll('_', '/') + '==='.slice((texto.length + 3) % 4)
  return Uint8Array.from(atob(base64), (caracter) => caracter.charCodeAt(0))
}

function cookies(peticion) {
  return Object.fromEntries(String(peticion.headers.get('cookie') || '')
    .split(';').map((parte) => parte.trim().split(/=(.*)/s)).filter(([clave]) => clave))
}

async function claveHmac(secreto) {
  return crypto.subtle.importKey('raw', CODIFICADOR.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

async function firmarSesion(datos, secreto) {
  const cuerpo = base64url(CODIFICADOR.encode(JSON.stringify(datos)))
  const firma = base64url(await crypto.subtle.sign('HMAC', await claveHmac(secreto), CODIFICADOR.encode(cuerpo)))
  return `${cuerpo}.${firma}`
}

async function leerSesionFirmada(valor, secreto) {
  const [cuerpo, firma, extra] = String(valor || '').split('.')
  if (!cuerpo || !firma || extra) return null
  try {
    const valida = await crypto.subtle.verify('HMAC', await claveHmac(secreto), desdeBase64url(firma), CODIFICADOR.encode(cuerpo))
    if (!valida) return null
    const datos = JSON.parse(new TextDecoder().decode(desdeBase64url(cuerpo)))
    if (!datos?.usuario || !Number.isInteger(datos.version) || datos.expira <= Math.floor(Date.now() / 1000)) return null
    return datos
  } catch { return null }
}

function cookieSesion(valor, maxAge = DURACION_SESION) {
  return `vfsb_sesion=${valor}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`
}

export function bytesFoto(datos) {
  // El ArrayBuffer que entrega D1 queda vacío si se pasa directo al Response de
  // Pages. Copiarlo a un Uint8Array propio conserva los bytes hasta que la
  // respuesta termina de enviarse.
  if (datos instanceof ArrayBuffer) return new Uint8Array(datos).slice()
  if (ArrayBuffer.isView(datos)) return new Uint8Array(datos.buffer, datos.byteOffset, datos.byteLength).slice()
  return Uint8Array.from(datos)
}

function aleatorio(longitud) {
  const bytes = crypto.getRandomValues(new Uint8Array(longitud))
  return base64url(bytes).slice(0, longitud)
}

async function derivarContrasena(contrasena, sal) {
  const material = await crypto.subtle.importKey('raw', CODIFICADOR.encode(contrasena), 'PBKDF2', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({
    name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: ITERACIONES_CONTRASENA,
  }, material, 256))
}

function iguales(a, b) {
  if (!a || !b || a.length !== b.length) return false
  let diferencia = 0
  for (let indice = 0; indice < a.length; indice += 1) diferencia |= a[indice] ^ b[indice]
  return diferencia === 0
}

async function resumenHex(texto) {
  const datos = await crypto.subtle.digest('SHA-256', CODIFICADOR.encode(texto))
  return [...new Uint8Array(datos)].map((valor) => valor.toString(16).padStart(2, '0')).join('')
}

export function esperaIntentoIngreso(intentos, tipo = 'usuario') {
  const umbral = tipo === 'direccion' ? 20 : 5
  if (intentos < umbral) return 0
  const nivel = intentos - umbral
  return Math.min(3600, [60, 300, 900, 1800, 3600][Math.min(nivel, 4)])
}

async function clavesIntentoIngreso(contexto, usuario) {
  const direccion = contexto.request.headers.get('CF-Connecting-IP') || contexto.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'sin-direccion'
  const secreto = contexto.env.SESSION_SECRET
  return {
    usuario: await resumenHex(`${secreto}:usuario:${usuario}`),
    direccion: await resumenHex(`${secreto}:direccion:${direccion}`),
  }
}

async function bloqueoIngreso(base, claves) {
  const filas = await Promise.all(Object.values(claves).map((clave) => base.prepare('SELECT bloqueado_hasta FROM intentos_ingreso_cms WHERE clave = ?1').bind(clave).first()))
  const ahora = Date.now()
  const bloqueos = filas.map((fila) => fila?.bloqueado_hasta ? new Date(`${fila.bloqueado_hasta.replace(' ', 'T')}Z`).getTime() : 0).filter((valor) => valor > ahora)
  return bloqueos.length ? Math.max(1, Math.ceil((Math.max(...bloqueos) - ahora) / 1000)) : 0
}

async function registrarFalloIngreso(base, claves) {
  const ahora = new Date()
  const consultas = []
  for (const [tipo, clave] of Object.entries(claves)) {
    const actual = await base.prepare('SELECT intentos, ventana_inicio FROM intentos_ingreso_cms WHERE clave = ?1').bind(clave).first()
    const inicio = actual?.ventana_inicio ? new Date(`${actual.ventana_inicio.replace(' ', 'T')}Z`) : null
    const dentroDeVentana = inicio && ahora - inicio < 15 * 60 * 1000
    const intentos = dentroDeVentana ? Number(actual.intentos || 0) + 1 : 1
    const espera = esperaIntentoIngreso(intentos, tipo)
    const bloqueadoHasta = espera ? new Date(ahora.getTime() + espera * 1000).toISOString().replace('T', ' ').slice(0, 19) : null
    consultas.push(base.prepare(`INSERT INTO intentos_ingreso_cms (clave, tipo, intentos, ventana_inicio, bloqueado_hasta)
      VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP, ?4)
      ON CONFLICT(clave) DO UPDATE SET tipo = excluded.tipo, intentos = excluded.intentos,
        ventana_inicio = CASE WHEN ?5 = 1 THEN intentos_ingreso_cms.ventana_inicio ELSE CURRENT_TIMESTAMP END,
        bloqueado_hasta = excluded.bloqueado_hasta, actualizado_en = CURRENT_TIMESTAMP`)
      .bind(clave, tipo, intentos, bloqueadoHasta, dentroDeVentana ? 1 : 0))
  }
  await base.batch(consultas)
}

async function limpiarFallosIngreso(base, claves) {
  await base.batch(Object.values(claves).map((clave) => base.prepare('DELETE FROM intentos_ingreso_cms WHERE clave = ?1').bind(clave)))
}

async function sesionDe(contexto) {
  if (!contexto.env.SESSION_SECRET) return null
  const firmada = await leerSesionFirmada(cookies(contexto.request).vfsb_sesion, contexto.env.SESSION_SECRET)
  if (!firmada) return null
  const cuenta = await contexto.env.BASE.prepare(
    'SELECT correo, nombre, rol, perfil_acceso, permisos, nivel_datos_personales, datos_personales_hasta, datos_personales_sin_vencimiento, acceso_hasta, version_sesion FROM usuarios WHERE correo = ?1 AND activo = 1',
  ).bind(firmada.usuario).first()
  return cuenta?.version_sesion === firmada.version && cuentaVigente(cuenta) ? exponerCuenta(cuenta) : null
}

async function registrar(base, sesion, accion, recurso, detalle = null) {
  await base.prepare(
    'INSERT INTO actividad (correo, accion, recurso, detalle) VALUES (?1, ?2, ?3, ?4)',
  ).bind(sesion.correo, accion, recurso, detalle).run()
}

const esAdmin = (sesion) => sesion.rol === 'admin'
const PERMISOS = ['planilla', 'personas', 'asistencias', 'reportes', 'agenda', 'cms']
const PERMISOS_LEGADOS = ['planilla', 'personas', 'asistencias', 'reportes', 'agenda']
const PERFILES_ACCESO = ['administracion', 'direccion', 'coordinacion', 'integrante', 'consulta']
const NIVELES_DATOS_PERSONALES = ['ninguno', 'operativo', 'sensible']
const PERMISOS_POR_PERFIL = {
  administracion: PERMISOS,
  direccion: ['planilla', 'asistencias', 'reportes', 'agenda', 'cms'],
  coordinacion: ['agenda', 'cms'],
  integrante: ['agenda', 'cms'],
  consulta: ['agenda', 'cms'],
}

export function perfilAccesoDe(cuenta) {
  return perfilAccesoInstitucional(cuenta)
}

export const puedeVerAuditoria = (sesion) => esAdmin(sesion)

function esVisionGlobalCms(sesion) {
  return ['administracion', 'direccion'].includes(perfilAccesoDe(sesion))
}

function esSoloConsultaCms(sesion) {
  return perfilAccesoDe(sesion) === 'consulta'
}

function permisosDe(cuenta) {
  const perfil = perfilAccesoDe(cuenta)
  if (cuenta?.perfil_acceso) return PERMISOS_POR_PERFIL[perfil]
  if (cuenta?.rol === 'admin') return PERMISOS
  // El CMS se suma después de las cuentas existentes. Mantener sus permisos
  // históricos no debe concederles acceso a información institucional nueva.
  if (!cuenta?.permisos) return PERMISOS_LEGADOS
  if (Array.isArray(cuenta.permisos)) return cuenta.permisos.filter((permiso) => PERMISOS.includes(permiso))
  try {
    const permisos = JSON.parse(cuenta.permisos)
    return Array.isArray(permisos) ? permisos.filter((permiso) => PERMISOS.includes(permiso)) : PERMISOS_LEGADOS
  } catch { return PERMISOS_LEGADOS }
}

function exponerCuenta(cuenta) {
  const { sal, hash_contrasena, version_sesion, activo, ...publica } = cuenta
  const nivelDatos = nivelDatosPersonalesDe(cuenta)
  const vigenciaDatos = nivelDatos === 'ninguno' ? 'ninguna' : cuenta?.datos_personales_sin_vencimiento ? 'indefinida' : 'temporal'
  return { ...publica, perfil_acceso: perfilAccesoDe(cuenta), nivel_datos_personales: nivelDatos, vigencia_datos_personales: vigenciaDatos, vigencia_acceso: cuenta?.acceso_hasta ? 'temporal' : 'indefinida', permisos: permisosDe(cuenta) }
}

function cuentaVigente(cuenta = {}) {
  const hasta = String(cuenta.acceso_hasta || '').trim()
  return !hasta || (fechaValida(hasta) && hasta >= fechaActualCms())
}

export function vigenciaCuentaDesde({ vigencia = 'indefinida', hasta = '' } = {}) {
  const modo = String(vigencia || '').trim()
  if (!['temporal', 'indefinida'].includes(modo)) return { error: 'Elegí si la cuenta vence o queda sin vencimiento.' }
  if (modo === 'temporal' && (!fechaValida(hasta) || hasta < fechaActualCms())) return { error: 'Indicá una fecha válida para la cuenta temporal.' }
  return { vigencia: modo, hastaGuardado: modo === 'temporal' ? hasta : null }
}

async function claveFotoPerfil(correo) {
  const bytes = new TextEncoder().encode(String(correo).trim().toLowerCase())
  const resumen = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return `usuario-${[...resumen].map((byte) => byte.toString(16).padStart(2, '0')).join('')}.jpg`
}

export function nivelDatosPersonalesDe(cuenta) {
  const nivel = NIVELES_DATOS_PERSONALES.includes(cuenta?.nivel_datos_personales) ? cuenta.nivel_datos_personales : 'ninguno'
  if (nivel === 'ninguno') return nivel
  if (Number(cuenta?.datos_personales_sin_vencimiento) === 1) return nivel
  const vence = String(cuenta?.datos_personales_hasta ?? '')
  return fechaValida(vence) && vence >= fechaActualCms() ? nivel : 'ninguno'
}

export function vigenciaDatosPersonalesDesde({ nivel = 'ninguno', vigencia = '', hasta = '' } = {}) {
  if (nivel === 'ninguno') return { vigencia: 'ninguna', hastaGuardado: null, sinVencimiento: 0 }
  const modo = String(vigencia || (hasta ? 'temporal' : '')).trim()
  if (!['temporal', 'indefinida'].includes(modo)) return { error: 'Elegí si el acceso vence o queda sin vencimiento.' }
  if (modo === 'temporal' && (!fechaValida(hasta) || hasta < fechaActualCms())) return { error: 'Indicá una fecha válida para el acceso temporal.' }
  return {
    vigencia: modo,
    hastaGuardado: modo === 'temporal' ? hasta : null,
    sinVencimiento: modo === 'indefinida' ? 1 : 0,
  }
}

export function puedeVerRespuestasCms(cuenta) {
  return nivelDatosPersonalesDe(cuenta) !== 'ninguno'
}

export function puedeGestionarSolicitudesPrivacidadCms(cuenta) {
  return esAdmin(cuenta) && nivelDatosPersonalesDe(cuenta) === 'sensible'
}

export function puedeAccederFinanzasFsb(cuenta, alcance = {}, equipoId = null) {
  if (nivelDatosPersonalesDe(cuenta) !== 'sensible') return false
  return Boolean(alcance.global || (equipoId && alcance.equipos?.has?.(equipoId)))
}

export function puedeGestionarFinanzasFsb(cuenta, alcance = {}, equipoId = null) {
  return puedeAccederFinanzasFsb(cuenta, alcance, equipoId)
    && ['administracion', 'direccion', 'coordinacion'].includes(perfilAccesoDe(cuenta))
}

const DESCRIPCION_TAREA_FORMULARIO = 'Creada desde una respuesta de formulario.'
const DESCRIPCION_TAREA_ENTRADA = 'Creada desde la bandeja de entradas institucionales.'

function esTareaDerivadaDeEntradaCms(tarea) {
  return [DESCRIPCION_TAREA_FORMULARIO, DESCRIPCION_TAREA_ENTRADA].includes(tarea?.descripcion ?? tarea?.tarea_descripcion)
}

export function tareaCmsSinDatosDeFormulario(tarea) {
  if (!esTareaDerivadaDeEntradaCms(tarea)) return tarea
  return {
    ...tarea,
    titulo: tarea?.descripcion === DESCRIPCION_TAREA_FORMULARIO ? 'Respuesta de formulario recibida' : 'Entrada institucional recibida',
    descripcion: 'El contenido requiere acceso vigente a datos personales.',
    solicitante_nombre: null,
    evento_titulo: tarea?.evento_titulo ? 'Actividad vinculada a una entrada' : tarea?.evento_titulo,
  }
}

export function tareaCmsSinSeguimientoPersonalAjeno(tarea, correoSesion) {
  if (!tarea?.seguimiento_personal_por || tarea.seguimiento_personal_por === correoSesion) return tarea
  return { ...tarea, seguimiento_personal: 0, motivo_seguimiento: '', seguimiento_personal_por: null }
}

export function datosTareaSinSeguimientoPersonalAjeno(datos, tareaActual, correoSesion) {
  if (!tareaActual?.seguimiento_personal_por || tareaActual.seguimiento_personal_por === correoSesion) return datos
  return Object.fromEntries(Object.entries(datos || {}).filter(([campo]) => !['seguimiento_personal', 'motivo_seguimiento', 'seguimiento_personal_por'].includes(campo)))
}

function tareaCmsVisiblePara(tarea, sesion, accesoRespuestas = puedeVerRespuestasCms(sesion)) {
  const protegida = accesoRespuestas ? tarea : tareaCmsSinDatosDeFormulario(tarea)
  return tareaCmsSinSeguimientoPersonalAjeno(protegida, sesion?.correo)
}

export function eventoCmsSinDatosDeEntrada(evento) {
  const { entrada_id, ...publico } = evento || {}
  if (!entrada_id) return publico
  return {
    ...publico,
    titulo: 'Actividad vinculada a una entrada',
    descripcion: 'El contenido requiere acceso vigente a datos personales.',
  }
}

export function notificacionCmsSinDatosDeFormulario(notificacion) {
  if (!esTareaDerivadaDeEntradaCms(notificacion)) return notificacion
  return {
    ...notificacion,
    titulo: notificacion?.tarea_descripcion === DESCRIPCION_TAREA_FORMULARIO ? 'Respuesta de formulario asignada' : 'Entrada institucional asignada',
    detalle: 'Abrí la tarea cuando tengas acceso vigente a datos personales.',
    tarea_titulo: notificacion?.tarea_descripcion === DESCRIPCION_TAREA_FORMULARIO ? 'Respuesta de formulario recibida' : 'Entrada institucional recibida',
  }
}

export function actividadCmsSinDatosDeEntradas(fila) {
  const { tarea_descripcion, entrada_evento_id, ...publica } = fila || {}
  const recurso = String(fila?.recurso || '')
  const accion = String(fila?.accion || '')
  const vinculada = recurso.startsWith('entradas/')
    || recurso.startsWith('solicitudes-privacidad/')
    || accion.startsWith('recibir formulario')
    || Boolean(entrada_evento_id)
    || esTareaDerivadaDeEntradaCms(fila)
  return vinculada ? { ...publica, detalle: 'Detalle protegido por acceso a datos personales.' } : publica
}

async function alcanceCmsDe(base, sesion) {
  const perfil = perfilAccesoDe(sesion)
  if (esVisionGlobalCms(sesion)) return { perfil, global: true, equipos: new Set() }
  const filas = await base.prepare(
    'SELECT equipo_id FROM responsabilidades_equipo WHERE usuario_correo = ?1 AND activo = 1',
  ).bind(sesion.correo).all()
  return { perfil, global: false, equipos: new Set(filas.results.map((fila) => fila.equipo_id)) }
}

function puedeVerEquipoCms(alcance, equipoId, { sinEquipo = false } = {}) {
  return alcance.global || (sinEquipo && !equipoId) || Boolean(equipoId && alcance.equipos.has(equipoId))
}

function puedeGestionarEquipoCms(alcance, equipoId) {
  return alcance.global || (alcance.perfil === 'coordinacion' && puedeVerEquipoCms(alcance, equipoId))
}

function puedeGestionarTareaCms(alcance, sesion, tarea) {
  if (puedeGestionarEquipoCms(alcance, tarea?.equipo_id)) return true
  return alcance.perfil === 'integrante' && tarea?.responsable_correo === sesion.correo
}

async function politicasCrearTareasCms(base) {
  const filas = await base.prepare(`SELECT capacidad, alcance_tipo, alcance_id, efecto
    FROM permisos_capacidades_cms WHERE capacidad = ?1`).bind(CAPACIDAD_CREAR_TAREAS).all()
  return filas.results || []
}

function puedeCrearTareaCms(alcance, sesion, equipoId, politicas) {
  return (equipoId ? puedeVerEquipoCms(alcance, equipoId) : alcance.global)
    && permisoCrearTareasEfectivo(sesion, equipoId, politicas).permitido
}

function capacidadesCrearTareasCms(alcance, sesion, equipos, politicas) {
  const permitidos = equipos.filter((equipo) => puedeCrearTareaCms(alcance, sesion, equipo.id, politicas)).map((equipo) => equipo.id)
  const permisoSinEquipo = puedeCrearTareaCms(alcance, sesion, null, politicas)
  return {
    global: Boolean(alcance.global && permisoSinEquipo),
    equipos: permitidos,
    puede_crear: Boolean(permisoSinEquipo || permitidos.length),
    predeterminado: perfilAccesoDe(sesion) === 'administracion' ? 'permitir' : 'bloquear',
  }
}

export function puedeVerTareaCms(alcance, sesion, tarea) {
  if (alcance.global) return true
  if (tarea?.creado_por === sesion.correo) return true
  if (alcance.perfil === 'integrante') return tarea?.responsable_correo === sesion.correo
  if (alcance.perfil === 'consulta') return false
  return puedeVerEquipoCms(alcance, tarea?.equipo_id)
}

export function tienePermiso(sesion, requisitos) {
  const necesarios = Array.isArray(requisitos) ? requisitos : [requisitos]
  return necesarios.some((permiso) => permisosDe(sesion).includes(permiso))
}

function permisosParaDocumento(ruta) {
  if (ruta === 'roster.json') return ['personas', 'agenda']
  if (/^listas\//.test(ruta)) return ['planilla']
  if (/^asistencias\//.test(ruta) || ruta === 'seguimientos.json') return ['asistencias']
  return []
}

const RUTA_PAGINA_WEB_BORRADOR = 'pagina-web/borrador.json'
const RUTA_PAGINA_WEB_PUBLICADA = 'pagina-web/publicada.json'
const MAXIMO_MEDIO_WEB = 850 * 1024

function moverFechaWeb(fecha, dias) {
  const valor = new Date(`${fecha}T00:00:00Z`)
  valor.setUTCDate(valor.getUTCDate() + dias)
  return valor.toISOString().slice(0, 10)
}

function limitesMetricasWeb(dias, hoy) {
  return {
    inicioActual: moverFechaWeb(hoy, -(dias - 1)),
    inicioAnterior: moverFechaWeb(hoy, -(dias * 2 - 1)),
    finAnterior: moverFechaWeb(hoy, -dias),
  }
}

function numeroAgregado(valor) {
  const numero = Number(valor || 0)
  return Number.isFinite(numero) && numero >= 0 ? Math.round(numero) : 0
}

function variacionAgregada(actual, anterior) {
  if (!anterior) return null
  return Math.round(((actual - anterior) / anterior) * 100)
}

export function resumenMetricasWebDesde(diarias = [], paginas = [], acciones = [], dias = 30, hoy = fechaActualCms()) {
  const periodoDias = [7, 30, 90].includes(Number(dias)) ? Number(dias) : 30
  const limites = limitesMetricasWeb(periodoDias, hoy)
  const actuales = diarias.filter((fila) => fila.fecha >= limites.inicioActual && fila.fecha <= hoy)
  const anteriores = diarias.filter((fila) => fila.fecha >= limites.inicioAnterior && fila.fecha <= limites.finAnterior)
  const sumar = (filas, clave) => filas.reduce((total, fila) => total + numeroAgregado(fila[clave]), 0)
  const resumen = {
    visitas: sumar(actuales, 'visitas'),
    paginasVistas: sumar(actuales, 'paginas_vistas'),
    acciones: sumar(actuales, 'acciones'),
  }
  const previo = {
    visitas: sumar(anteriores, 'visitas'),
    paginasVistas: sumar(anteriores, 'paginas_vistas'),
    acciones: sumar(anteriores, 'acciones'),
  }
  const rutas = paginas
    .filter((fila) => /^\/(?!\/)[^?#]{0,159}$/.test(String(fila.ruta || '')))
    .map((fila) => ({ ruta: fila.ruta, vistas: numeroAgregado(fila.vistas) }))
    .sort((a, b) => b.vistas - a.vistas).slice(0, 5)
  const eventos = acciones
    .filter((fila) => /^[a-z0-9][a-z0-9:_-]{0,79}$/.test(String(fila.accion || '')))
    .map((fila) => ({ accion: fila.accion, cantidad: numeroAgregado(fila.cantidad) }))
    .sort((a, b) => b.cantidad - a.cantidad).slice(0, 5)
  return {
    estado: actuales.length ? 'con_datos' : 'sin_datos',
    periodoDias,
    desde: limites.inicioActual,
    hasta: hoy,
    actualizadoEn: actuales.map((fila) => fila.actualizado_en).filter(Boolean).sort().at(-1) || null,
    resumen,
    variacion: {
      visitas: variacionAgregada(resumen.visitas, previo.visitas),
      paginasVistas: variacionAgregada(resumen.paginasVistas, previo.paginasVistas),
      acciones: variacionAgregada(resumen.acciones, previo.acciones),
    },
    serie: actuales.map((fila) => ({ fecha: fila.fecha, visitas: numeroAgregado(fila.visitas) })),
    paginas: rutas,
    acciones: eventos,
    privacidad: { agregadas: true, identificadoresPersonales: false, datosFormularios: false },
  }
}

async function metricasPaginaWebCms(contexto) {
  if (contexto.request.method !== 'GET') return error('Método no permitido.', 405)
  const solicitados = Number(new URL(contexto.request.url).searchParams.get('dias') || 30)
  const dias = [7, 30, 90].includes(solicitados) ? solicitados : 30
  const hoy = fechaActualCms()
  const limites = limitesMetricasWeb(dias, hoy)
  const [diarias, paginas, acciones] = await Promise.all([
    contexto.env.BASE.prepare(`SELECT fecha, visitas, paginas_vistas, acciones, actualizado_en
      FROM metricas_web_diarias WHERE fecha >= ?1 AND fecha <= ?2 ORDER BY fecha`).bind(limites.inicioAnterior, hoy).all(),
    contexto.env.BASE.prepare(`SELECT ruta, SUM(vistas) AS vistas FROM metricas_web_paginas_diarias
      WHERE fecha >= ?1 AND fecha <= ?2 GROUP BY ruta ORDER BY vistas DESC LIMIT 5`).bind(limites.inicioActual, hoy).all(),
    contexto.env.BASE.prepare(`SELECT accion, SUM(cantidad) AS cantidad FROM metricas_web_acciones_diarias
      WHERE fecha >= ?1 AND fecha <= ?2 GROUP BY accion ORDER BY cantidad DESC LIMIT 5`).bind(limites.inicioActual, hoy).all(),
  ])
  return responder(resumenMetricasWebDesde(diarias.results || [], paginas.results || [], acciones.results || [], dias, hoy))
}

async function medioPaginaWebPublico(contexto, id) {
  if (contexto.request.method === 'OPTIONS') return responder(null, 204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS' })
  if (contexto.request.method !== 'GET' || !/^[a-f0-9-]{36}$/.test(id || '')) return error('No encontramos esa imagen.', 404)
  const medio = await contexto.env.BASE.prepare('SELECT datos, tipo, bytes FROM medios_pagina_web WHERE id = ?1').bind(id).first()
  if (!medio) return error('No encontramos esa imagen.', 404)
  return new Response(bytesFoto(medio.datos), { headers: {
    'content-type': medio.tipo, 'content-length': String(medio.bytes), 'cache-control': 'public, max-age=31536000, immutable',
    'access-control-allow-origin': '*', 'x-content-type-options': 'nosniff',
  } })
}

async function mediosPaginaWebCms(contexto, sesion) {
  const { request, env } = contexto
  const puedeEditar = ['administracion', 'direccion', 'coordinacion'].includes(perfilAccesoDe(sesion))
  if (request.method === 'GET') {
    const filas = await env.BASE.prepare('SELECT id, nombre, tipo, ancho, alto, bytes, texto_alternativo, creado_en FROM medios_pagina_web ORDER BY creado_en DESC LIMIT 80').all()
    const origen = new URL(request.url).origin
    return responder({ medios: (filas.results || []).map((medio) => ({ ...medio, url: `${origen}/api/pagina-web/medios/${medio.id}` })) })
  }
  if (request.method !== 'POST') return error('Método no permitido.', 405)
  if (!puedeEditar) return error('Tu perfil puede revisar las imágenes, pero no cargarlas.', 403)
  const tipo = String(request.headers.get('content-type') || '').split(';')[0]
  if (!['image/webp', 'image/jpeg', 'image/png'].includes(tipo)) return error('Usá una imagen WebP, JPG o PNG.', 400)
  const datos = await request.arrayBuffer()
  if (!datos.byteLength) return error('La imagen está vacía.', 400)
  if (datos.byteLength > MAXIMO_MEDIO_WEB) return error('La imagen supera el máximo de 850 KB.', 413)
  const ancho = Number(request.headers.get('x-image-width') || 0)
  const alto = Number(request.headers.get('x-image-height') || 0)
  if (!Number.isInteger(ancho) || !Number.isInteger(alto) || ancho < 1 || alto < 1 || ancho > 4000 || alto > 4000) return error('Las dimensiones de la imagen no son válidas.', 400)
  const nombre = decodeURIComponent(String(request.headers.get('x-file-name') || 'imagen-web')).slice(0, 180)
  const textoAlternativo = decodeURIComponent(String(request.headers.get('x-alt-text') || '')).slice(0, 180)
  const id = crypto.randomUUID()
  const url = `${new URL(request.url).origin}/api/pagina-web/medios/${id}`
  await env.BASE.prepare(`INSERT INTO medios_pagina_web
    (id, nombre, tipo, ancho, alto, bytes, datos, texto_alternativo, creado_por)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`)
    .bind(id, nombre, tipo, ancho, alto, datos.byteLength, datos, textoAlternativo, sesion.correo).run()
  await registrar(env.BASE, sesion, 'cargar imagen para página web', `pagina-web/medios/${id}`, nombre)
  return responder({ medio: { id, nombre, tipo, ancho, alto, bytes: datos.byteLength, texto_alternativo: textoAlternativo, url } }, 201)
}

async function leerDocumentoPaginaWeb(base, ruta) {
  const fila = await base.prepare('SELECT contenido, revision, actualizado_por, actualizado_en FROM documentos WHERE ruta = ?1').bind(ruta).first()
  if (!fila) return null
  try { return { ...fila, contenido: JSON.parse(fila.contenido) } } catch { return null }
}

function sentenciaGuardarPaginaWeb(base, ruta, contenido, revision, correo) {
  return base.prepare(`INSERT INTO documentos (ruta, contenido, revision, actualizado_por, actualizado_en)
    VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)
    ON CONFLICT(ruta) DO UPDATE SET contenido = excluded.contenido, revision = excluded.revision,
      actualizado_por = excluded.actualizado_por, actualizado_en = CURRENT_TIMESTAMP`)
    .bind(ruta, JSON.stringify(contenido), revision, correo)
}

async function paginaWebPublica(contexto) {
  if (contexto.request.method === 'OPTIONS') return responder(null, 204, {
    'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS',
  })
  if (contexto.request.method !== 'GET') return error('Método no permitido.', 405)
  const publicada = await leerDocumentoPaginaWeb(contexto.env.BASE, RUTA_PAGINA_WEB_PUBLICADA)
  if (!publicada || publicada.contenido?.editorial?.estado !== 'publicado') return error('La página todavía no tiene una versión publicada.', 404, { 'access-control-allow-origin': '*' })
  return responder(publicada.contenido, 200, {
    'access-control-allow-origin': '*', 'cache-control': 'no-store, max-age=0', etag: `"${publicada.revision}"`,
  })
}

async function paginaWebCms(contexto, sesion, accion) {
  const { request, env } = contexto
  if (!puedeGestionarPaginaWeb(sesion)) return error('Tu perfil no puede abrir la gestión de la página web.', 403)
  const perfil = perfilAccesoDe(sesion)
  const puedeEditar = ['administracion', 'direccion', 'coordinacion'].includes(perfil)
  const puedePublicar = ['administracion', 'direccion'].includes(perfil)
  if (accion === 'medios') return mediosPaginaWebCms(contexto, sesion)
  if (accion === 'metricas') {
    if (!puedeVerMetricasPaginaWeb(sesion)) return error('Tu perfil no puede consultar las métricas de la página web.', 403)
    return metricasPaginaWebCms(contexto)
  }
  if (accion === 'formularios' && request.method === 'GET') {
    const filas = await env.BASE.prepare(`SELECT f.id, f.titulo, f.descripcion, f.tipo, f.finalidad, f.responsable_datos,
        f.conservacion_meses, f.requiere_consentimiento, e.nombre AS equipo_nombre
      FROM formularios_cms f LEFT JOIN equipos e ON e.id = f.equipo_id AND e.activo = 1
      WHERE f.visibilidad = 'publica' AND f.estado = 'activa'
      ORDER BY f.titulo COLLATE NOCASE, f.id`).all()
    const formularios = (filas.results || []).map((formulario) => ({
      id: formulario.id,
      titulo: formulario.titulo,
      descripcion: formulario.descripcion,
      tipo: formulario.tipo,
      equipo: formulario.equipo_nombre || '',
      finalidad: formulario.finalidad,
      responsableDatos: formulario.responsable_datos,
      conservacionMeses: Number(formulario.conservacion_meses || 12),
      requiereConsentimiento: Boolean(formulario.requiere_consentimiento),
      enlace: `https://gestor.aletea.org/formulario.html?id=${encodeURIComponent(formulario.id)}`,
    }))
    return responder({ formularios })
  }
  if (!accion && request.method === 'GET') {
    const [borrador, publicada, historial] = await Promise.all([
      leerDocumentoPaginaWeb(env.BASE, RUTA_PAGINA_WEB_BORRADOR),
      leerDocumentoPaginaWeb(env.BASE, RUTA_PAGINA_WEB_PUBLICADA),
      env.BASE.prepare("SELECT ruta, revision, actualizado_por, actualizado_en FROM documentos WHERE ruta LIKE 'pagina-web/historial/%.json' ORDER BY ruta DESC LIMIT 10").all(),
    ])
    return responder({
      borrador: borrador?.contenido || null, publicado: publicada?.contenido || null,
      revisionBorrador: Number(borrador?.revision || 0), revisionPublicada: Number(publicada?.revision || 0),
      historial: historial.results || [], permisos: { editar: puedeEditar, publicar: puedePublicar },
      destinos: { actual: 'https://prueba.aletea.org', principal: 'https://aletea.org', principalProtegido: true },
    })
  }
  if (accion === 'borrador' && request.method === 'PUT') {
    if (!puedeEditar) return error('Tu perfil puede revisar la página, pero no modificarla.', 403)
    let contenido
    try { contenido = await request.json() } catch { return error('El contenido de la página no es válido.', 400) }
    contenido = contenidoComoBorrador(contenido)
    const errores = validarContenidoPaginaWeb(contenido)
    if (errores.length) return error(errores[0], 400)
    const actual = await leerDocumentoPaginaWeb(env.BASE, RUTA_PAGINA_WEB_BORRADOR)
    const esperada = request.headers.get('if-match')?.replaceAll('"', '') ?? null
    if (String(actual?.revision || 0) !== String(esperada ?? 0)) return error('Otra persona modificó este borrador. Recargá antes de guardar.', 409)
    const revision = Number(actual?.revision || 0) + 1
    await sentenciaGuardarPaginaWeb(env.BASE, RUTA_PAGINA_WEB_BORRADOR, contenido, revision, sesion.correo).run()
    await registrar(env.BASE, sesion, actual ? 'modificar borrador web' : 'crear borrador web', RUTA_PAGINA_WEB_BORRADOR, `revisión ${revision}`)
    return responder({ revision, borrador: contenido }, 200, { etag: `"${revision}"` })
  }
  if (accion === 'publicar' && request.method === 'POST') {
    if (!puedePublicar) return error('Solo Dirección o Administración puede publicar la página.', 403)
    let datos
    try { datos = await request.json() } catch { return error('La solicitud de publicación no es válida.', 400) }
    const [borrador, publicadaActual] = await Promise.all([
      leerDocumentoPaginaWeb(env.BASE, RUTA_PAGINA_WEB_BORRADOR), leerDocumentoPaginaWeb(env.BASE, RUTA_PAGINA_WEB_PUBLICADA),
    ])
    if (!borrador) return error('Primero guardá un borrador.', 409)
    if (Number(datos.revisionBorrador) !== Number(borrador.revision)) return error('El borrador cambió antes de publicarse. Recargá y revisalo.', 409)
    const errores = validarContenidoPaginaWeb(borrador.contenido)
    if (errores.length) return error(errores[0], 400)
    const revisionEditorial = Number(publicadaActual?.contenido?.editorial?.revision || 0) + 1
    const publicada = clonarContenidoPaginaWeb(borrador.contenido)
    publicada.editorial = { estado: 'publicado', revision: revisionEditorial, actualizadoEn: new Date().toISOString() }
    const revisionPublicada = Number(publicadaActual?.revision || 0) + 1
    const revisionBorrador = Number(borrador.revision) + 1
    const rutaHistorial = `pagina-web/historial/${String(revisionEditorial).padStart(6, '0')}.json`
    await env.BASE.batch([
      sentenciaGuardarPaginaWeb(env.BASE, RUTA_PAGINA_WEB_PUBLICADA, publicada, revisionPublicada, sesion.correo),
      sentenciaGuardarPaginaWeb(env.BASE, RUTA_PAGINA_WEB_BORRADOR, publicada, revisionBorrador, sesion.correo),
      sentenciaGuardarPaginaWeb(env.BASE, rutaHistorial, publicada, revisionEditorial, sesion.correo),
    ])
    let despliegue = { estado: 'pendiente_configuracion' }
    if (env.STAGING_DEPLOY_WEBHOOK) {
      try {
        const respuestaDespliegue = await (env.FETCH_EXTERNO || fetch)(env.STAGING_DEPLOY_WEBHOOK, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ revision: revisionEditorial, origen: 'gestor.aletea.org' }),
        })
        despliegue = respuestaDespliegue.ok ? { estado: 'iniciado' } : { estado: 'fallo', detalle: `respuesta ${respuestaDespliegue.status}` }
      } catch { despliegue = { estado: 'fallo', detalle: 'no se pudo iniciar la publicación' } }
    }
    await registrar(env.BASE, sesion, 'publicar página web de prueba', RUTA_PAGINA_WEB_PUBLICADA, `versión ${revisionEditorial}, despliegue ${despliegue.estado}`)
    return responder({ publicado: publicada, revisionPublicada, revisionBorrador, despliegue })
  }
  return error('No se encontró esa operación de la página web.', 404)
}

async function imagenRemotaCms(contexto, sesion) {
  if (contexto.request.method !== 'POST') return error('Método no permitido.', 405)
  if (!puedeUsarComunicacionVisual(sesion)) return error('No tenés permiso para usar el editor de piezas.', 403)
  let datos
  try { datos = await contexto.request.json() } catch { return error('El enlace de la imagen no es válido.', 400) }
  const destino = urlDescargaGoogleDrive(datos?.url)
  if (!destino) return error('Usá un enlace público válido de un archivo de Google Drive.', 400)
  let respuesta
  try { respuesta = await (contexto.env.FETCH_EXTERNO || fetch)(destino, { redirect: 'follow' }) } catch {
    return error('No pudimos comunicarnos con Google Drive.', 502)
  }
  if (!respuesta.ok) return error('Google Drive no permitió abrir la imagen. Confirmá que sea pública.', 422)
  const tipo = String(respuesta.headers.get('content-type') || '').split(';')[0].toLowerCase()
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(tipo)) return error('El enlace de Drive no devuelve una imagen JPG, PNG o WebP. Confirmá que el archivo sea público.', 422)
  const longitud = Number(respuesta.headers.get('content-length') || 0)
  if (longitud > LIMITE_IMAGEN_REMOTA) return error('La imagen supera el máximo de 8 MB.', 413)
  let bytes
  try { bytes = await bytesImagenConLimite(respuesta, LIMITE_IMAGEN_REMOTA) } catch { return error('La imagen supera el máximo de 8 MB.', 413) }
  return new Response(bytes, { status: 200, headers: {
    'content-type': tipo, 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff',
  } })
}

function fechaValida(fecha) {
  const texto = String(fecha ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false
  const fechaLocal = new Date(`${texto}T00:00:00`)
  return !Number.isNaN(fechaLocal.getTime()) && fechaLocal.toISOString().slice(0, 10) === texto
}

export function fechaActualCms(instante = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(instante)
  const valor = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]))
  return `${valor.year}-${valor.month}-${valor.day}`
}

export function instanteUtcSql(instante = new Date()) {
  return instante.toISOString().replace('T', ' ').slice(0, 19)
}

function personaPublica(persona) {
  const { id, nombre, grupo, nuevo, activo } = persona ?? {}
  return { id, nombre, ...(grupo ? { grupo } : {}), nuevo: Boolean(nuevo), activo: activo !== false }
}

function privacidadDe(persona) {
  const privacidad = persona?.privacidad ?? {}
  return {
    perfilInterno: privacidad.perfilInterno === true,
    fotoInterna: privacidad.fotoInterna === true,
    fotoPublica: privacidad.fotoPublica === true,
    contacto: privacidad.contacto === true,
    datosSensibles: privacidad.datosSensibles === true,
    revisadoEl: String(privacidad.revisadoEl ?? ''),
    autorizadoPor: String(privacidad.autorizadoPor ?? ''),
    documentadoEl: String(privacidad.documentadoEl ?? ''),
  }
}

function perfilOperativo(persona) {
  const perfil = persona?.perfil ?? {}
  return { desde: String(perfil.desde ?? ''), leGusta: String(perfil.leGusta ?? ''), noLeGusta: String(perfil.noLeGusta ?? ''), apoyosOperativos: String(perfil.apoyosOperativos ?? '') }
}

function personaOperativa(persona, sesion) {
  const base = personaPublica(persona)
  const privacidad = privacidadDe(persona)
  const nivel = nivelDatosPersonalesDe(sesion)
  return {
    ...base,
    ...(esAdmin(sesion) && persona?.finanzas ? { finanzas: persona.finanzas } : {}),
    foto: nivel === 'ninguno' || !privacidad.fotoInterna ? null : persona?.foto ?? null,
    perfil: nivel === 'ninguno' || !privacidad.perfilInterno ? {} : perfilOperativo(persona),
    privacidad: {
      perfilInterno: privacidad.perfilInterno,
      fotoInterna: privacidad.fotoInterna,
      fotoPublica: privacidad.fotoPublica,
      contacto: privacidad.contacto,
      datosSensibles: privacidad.datosSensibles,
      revisadoEl: privacidad.revisadoEl,
    },
  }
}

function claveNombreFsb(valor) {
  return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es')
}

export function idCuentaFsbVinculable(persona, cuentas = []) {
  const nombre = claveNombreFsb(persona?.nombre)
  const grupo = Number(persona?.grupo || 0)
  if (!nombre) return null
  const candidatas = cuentas.filter((cuenta) => !cuenta.persona_id
    && claveNombreFsb(cuenta.nombre) === nombre
    && (!grupo || !Number(cuenta.grupo) || Number(cuenta.grupo) === grupo))
  return candidatas.length === 1 ? candidatas[0].id : null
}

async function sincronizarCuentasFsbConRoster(base, roster, sesion) {
  const existentes = await base.prepare('SELECT id, persona_id, nombre, grupo FROM cuentas_fsb').all()
  const cuentas = existentes.results || []
  const porPersona = new Map(cuentas.filter((cuenta) => cuenta.persona_id).map((cuenta) => [cuenta.persona_id, cuenta]))
  const vinculadasEnEstaOperacion = new Set()
  const operaciones = []
  for (const persona of roster?.participantes ?? []) {
    const tipo = ['regular', 'beca', 'voluntariado', 'baja'].includes(persona.finanzas?.tipoCuota)
      ? persona.finanzas.tipoCuota
      : 'regular'
    const condicion = persona.activo === false ? 'baja' : tipo
    const beca = condicion === 'beca' ? Number(persona.finanzas?.becaPorcentaje || 0) : 0
    const activa = condicion === 'baja' ? 0 : 1
    const existente = porPersona.get(persona.id)
    const idHeredado = existente ? null : idCuentaFsbVinculable(persona, cuentas.filter((cuenta) => !vinculadasEnEstaOperacion.has(cuenta.id)))
    if (idHeredado) vinculadasEnEstaOperacion.add(idHeredado)
    if (existente) {
      operaciones.push(base.prepare(`UPDATE cuentas_fsb SET nombre = ?1, grupo = ?2, condicion = ?3,
        beca_porcentaje = ?4, activa = ?5, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?6`)
        .bind(persona.nombre, persona.grupo ?? null, condicion, beca, activa, existente.id))
    } else if (idHeredado) {
      operaciones.push(base.prepare(`UPDATE cuentas_fsb SET persona_id = ?1, nombre = ?2, grupo = ?3, condicion = ?4,
        beca_porcentaje = ?5, activa = ?6, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?7`)
        .bind(persona.id, persona.nombre, persona.grupo ?? null, condicion, beca, activa, idHeredado))
    } else {
      operaciones.push(base.prepare(`INSERT INTO cuentas_fsb
        (id, persona_id, nombre, grupo, condicion, beca_porcentaje, observaciones, activa, creado_por)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, '', ?7, ?8)`)
        .bind(crypto.randomUUID(), persona.id, persona.nombre, persona.grupo ?? null, condicion, beca, activa, sesion.correo))
    }
  }
  if (operaciones.length) await base.batch(operaciones)
}

export function cumpleanosParaAgenda(roster, hoy = new Date(), dias = 45) {
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const personas = [
    ...(roster?.participantes ?? []).map((persona) => ({ persona, rol: 'participante' })),
    ...(roster?.voluntarios ?? []).map((persona) => ({ persona, rol: 'voluntario' })),
  ]
  return personas
    .filter(({ persona }) => persona.activo !== false && fechaValida(persona.perfil?.anioNacimiento))
    .map(({ persona, rol }) => {
      const nacimiento = new Date(`${persona.perfil.anioNacimiento}T00:00:00`)
      const fecha = new Date(inicio.getFullYear(), nacimiento.getMonth(), nacimiento.getDate())
      if (fecha < inicio) fecha.setFullYear(fecha.getFullYear() + 1)
      return { tipo: 'cumpleanos', id: `cumple-${persona.id}-${fecha.getFullYear()}`, fecha: fecha.toISOString().slice(0, 10), persona: personaPublica(persona), rol }
    })
    .filter((evento) => (new Date(`${evento.fecha}T00:00:00`) - inicio) / 86400000 <= dias)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.persona.nombre.localeCompare(b.persona.nombre, 'es'))
}

export function rosterParaSesion(roster, sesion, hoy = new Date()) {
  if (tienePermiso(sesion, 'personas')) {
    return { ...roster,
      participantes: (roster?.participantes ?? []).map((persona) => personaOperativa(persona, sesion)),
      voluntarios: (roster?.voluntarios ?? []).map((persona) => personaOperativa(persona, sesion)),
    }
  }
  return {
    ...roster,
    participantes: (roster?.participantes ?? []).map(personaPublica),
    voluntarios: (roster?.voluntarios ?? []).map(personaPublica),
    // La agenda se puede recorrer mes a mes. Mandamos un ciclo anual de avisos,
    // nunca las fechas de nacimiento ni el resto del perfil.
    cumpleanosAgenda: cumpleanosParaAgenda(roster, hoy, 400),
  }
}

function personaEnRoster(roster, id) {
  return [...(roster?.participantes ?? []), ...(roster?.voluntarios ?? [])].find((persona) => persona.id === id) ?? null
}

function datosProtegidosDe(persona) {
  const perfil = persona?.perfil ?? {}
  const privacidad = privacidadDe(persona)
  return { contactoEmergencia: String(persona?.contactoEmergencia ?? ''), anioNacimiento: String(perfil.anioNacimiento ?? ''), necesidades: String(perfil.necesidades ?? ''), autorizadoPor: privacidad.autorizadoPor, documentadoEl: privacidad.documentadoEl, revisadoEl: privacidad.revisadoEl, privacidad }
}

export function combinarProtegidos(actual, solicitado, { permitirFinanzas = false } = {}) {
  const proteger = (personas = []) => personas.map((persona) => {
    const anterior = personaEnRoster(actual, persona.id)
    if (!anterior) return persona
    const perfil = { ...(persona.perfil ?? {}) }
    const previo = anterior.perfil ?? {}
    ;['anioNacimiento', 'necesidades'].forEach((clave) => { if (clave in previo) perfil[clave] = previo[clave] })
    return { ...persona, finanzas: permitirFinanzas ? (persona.finanzas ?? anterior.finanzas) : anterior.finanzas, contactoEmergencia: anterior.contactoEmergencia ?? '', privacidad: anterior.privacidad ?? {}, perfil }
  })
  return { ...solicitado, participantes: proteger(solicitado?.participantes), voluntarios: proteger(solicitado?.voluntarios) }
}

export function preservarRosterParaAgenda(actual, solicitado) {
  const agenda = solicitado?.agenda
  return {
    ...actual,
    agenda: agenda && typeof agenda === 'object' && !Array.isArray(agenda) ? agenda : actual?.agenda,
  }
}

function usuarioValido(usuario) {
  return /^[a-z0-9][a-z0-9._@-]{2,63}$/i.test(usuario)
}

async function ingresar(contexto) {
  if (!contexto.env.SESSION_SECRET) return error('La aplicación todavía no está lista para ingresar.', 503)
  // Evita que una configuración incompleta de Pages termine en un 1101 sin
  // explicación para quien intenta entrar.
  if (!contexto.env.BASE) return error('El acceso institucional todavía está configurándose. Probá nuevamente en unos minutos.', 503)
  let datos
  try { datos = await contexto.request.json() } catch { return error('No se pudo ingresar.', 400) }
  const usuario = String(datos.usuario || '').trim().toLowerCase()
  const contrasena = String(datos.contrasena || '')
  if (!usuario || !contrasena) return error('Usuario o contraseña incorrectos.', 401)
  const clavesIntento = await clavesIntentoIngreso(contexto, usuario)
  const esperaActual = await bloqueoIngreso(contexto.env.BASE, clavesIntento)
  if (esperaActual) return error(`Demasiados intentos. Probá nuevamente en ${esperaActual} segundos.`, 429, { 'retry-after': String(esperaActual) })
  const cuenta = await contexto.env.BASE.prepare(`
    SELECT correo, nombre, rol, perfil_acceso, permisos, nivel_datos_personales, datos_personales_hasta, datos_personales_sin_vencimiento, acceso_hasta, foto_perfil, sal, hash_contrasena, version_sesion
    FROM usuarios WHERE correo = ?1 AND activo = 1
  `).bind(usuario).first()
  const salFicticia = new Uint8Array((await crypto.subtle.digest('SHA-256', CODIFICADOR.encode(`${contexto.env.SESSION_SECRET}:cuenta-inexistente`))).slice(0, 16))
  const derivada = await derivarContrasena(contrasena, cuenta?.sal ? new Uint8Array(cuenta.sal) : salFicticia)
  const correcta = Boolean(cuenta?.hash_contrasena) && cuentaVigente(cuenta) && iguales(derivada, new Uint8Array(cuenta.hash_contrasena || 32))
  if (!correcta) {
    await registrarFalloIngreso(contexto.env.BASE, clavesIntento)
    return error('Usuario o contraseña incorrectos.', 401)
  }
  await limpiarFallosIngreso(contexto.env.BASE, clavesIntento)
  const expira = Math.floor(Date.now() / 1000) + DURACION_SESION
  const token = await firmarSesion({ usuario: cuenta.correo, version: cuenta.version_sesion, expira }, contexto.env.SESSION_SECRET)
  await contexto.env.BASE.prepare('UPDATE usuarios SET ultimo_acceso = ?2 WHERE correo = ?1').bind(cuenta.correo, instanteUtcSql()).run()
  await registrar(contexto.env.BASE, cuenta, 'ingresar', 'sesion')
  return responder(exponerCuenta({ usuario: cuenta.correo, correo: cuenta.correo, nombre: cuenta.nombre, rol: cuenta.rol, perfil_acceso: cuenta.perfil_acceso, permisos: cuenta.permisos, nivel_datos_personales: cuenta.nivel_datos_personales, datos_personales_hasta: cuenta.datos_personales_hasta, datos_personales_sin_vencimiento: cuenta.datos_personales_sin_vencimiento, acceso_hasta: cuenta.acceso_hasta }), 200, {
    'set-cookie': cookieSesion(token),
  })
}

function cerrarSesion() {
  return responder({ cerrada: true }, 200, { 'set-cookie': cookieSesion('', 0) })
}

async function usuarios(contexto, sesion) {
  if (!esAdmin(sesion)) return error('Solo la administración puede cambiar accesos.', 403)
  const { request, env } = contexto
  if (request.method === 'GET') {
    const filas = await env.BASE.prepare(
      'SELECT correo, nombre, rol, perfil_acceso, permisos, nivel_datos_personales, datos_personales_hasta, datos_personales_sin_vencimiento, acceso_hasta, foto_perfil, ultimo_acceso FROM usuarios WHERE activo = 1 ORDER BY nombre COLLATE NOCASE',
    ).all()
    return responder({ usuarios: filas.results.map(exponerCuenta) })
  }
  if (request.method === 'POST') {
    let datos
    try { datos = await request.json() } catch { return error('Los datos de acceso no son válidos.', 400) }
    const correo = String(datos.usuario || '').trim().toLowerCase()
    const nombre = String(datos.nombre || '').trim()
    const perfil_acceso = String(datos.perfil_acceso || datos.rol || '').trim()
    const rol = perfil_acceso === 'administracion' ? 'admin' : 'coordinacion'
    const nivelDatos = 'ninguno'
    const decisionVigencia = vigenciaCuentaDesde({ vigencia: datos.vigencia_acceso, hasta: String(datos.acceso_hasta || '').trim() })
    const equiposSolicitados = [...new Set(Array.isArray(datos.equipos) ? datos.equipos.map((equipo) => String(equipo || '').trim()).filter(Boolean) : [])]
    if (!usuarioValido(correo) || !nombre || !PERFILES_ACCESO.includes(perfil_acceso)) {
      return error('Completá nombre, usuario y un perfil de acceso válido.', 400)
    }
    if (decisionVigencia.error) return error(decisionVigencia.error, 400)
    const necesitaEquipo = ['coordinacion', 'integrante'].includes(perfil_acceso)
    if (necesitaEquipo && !equiposSolicitados.length) return error('Asigná al menos un equipo a esta cuenta.', 400)
    if (!necesitaEquipo && equiposSolicitados.length) return error('Este perfil no necesita equipos asignados.', 400)
    if (equiposSolicitados.length) {
      const encontrados = await env.BASE.prepare(`SELECT id FROM equipos WHERE activo = 1 AND id IN (${equiposSolicitados.map((_, indice) => `?${indice + 1}`).join(', ')})`).bind(...equiposSolicitados).all()
      if (encontrados.results.length !== equiposSolicitados.length) return error('Uno de los equipos elegidos ya no está disponible.', 400)
    }
    const contrasena = aleatorio(24)
    const sal = crypto.getRandomValues(new Uint8Array(16))
    const hash = await derivarContrasena(contrasena, sal)
    const consultas = [env.BASE.prepare(`
      INSERT INTO usuarios (correo, nombre, rol, perfil_acceso, permisos, nivel_datos_personales, acceso_hasta, activo, sal, hash_contrasena, version_sesion)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?9, 0)
    `).bind(correo, nombre, rol, perfil_acceso, perfil_acceso === 'administracion' ? null : JSON.stringify(PERMISOS_POR_PERFIL[perfil_acceso]), nivelDatos, decisionVigencia.hastaGuardado, sal, hash)]
    equiposSolicitados.forEach((equipoId) => consultas.push(env.BASE.prepare(`INSERT INTO responsabilidades_equipo
      (id, equipo_id, usuario_correo, tipo, creado_por) VALUES (?1, ?2, ?3, ?4, ?5)`)
      .bind(crypto.randomUUID(), equipoId, correo, perfil_acceso === 'coordinacion' ? 'coordinacion' : 'integrante', sesion.correo)))
    try { await env.BASE.batch(consultas) } catch { return error('Ese usuario ya existe o no se pudo asignar a los equipos.', 409) }
    await registrar(env.BASE, sesion, 'dar acceso', correo, perfil_acceso)
    return responder(exponerCuenta({ usuario: correo, correo, nombre, rol, perfil_acceso, permisos: PERMISOS_POR_PERFIL[perfil_acceso], nivel_datos_personales: nivelDatos, acceso_hasta: decisionVigencia.hastaGuardado, equipos: equiposSolicitados, contrasena }), 201)
  }
  if (request.method === 'PATCH') {
    let datos
    try { datos = await request.json() } catch { return error('Los permisos no son válidos.', 400) }
    const correo = String(datos.correo || '').trim().toLowerCase()
    const perfil_acceso = String(datos.perfil_acceso || '').trim()
    const nivelDatos = String(datos.nivel_datos_personales || 'ninguno').trim()
    const hasta = String(datos.datos_personales_hasta || '').trim()
    const decisionVigencia = vigenciaDatosPersonalesDesde({ nivel: nivelDatos, vigencia: datos.vigencia_datos_personales, hasta })
    const objetivo = await env.BASE.prepare('SELECT rol, perfil_acceso, version_sesion FROM usuarios WHERE correo = ?1 AND activo = 1').bind(correo).first()
    if (!objetivo) return error('No encontramos ese acceso.', 404)
    if (!PERFILES_ACCESO.includes(perfil_acceso)) return error('Elegí un perfil de acceso válido.', 400)
    if (!NIVELES_DATOS_PERSONALES.includes(nivelDatos)) return error('Elegí un nivel válido para datos personales.', 400)
    if (decisionVigencia.error) return error(decisionVigencia.error, 400)
    if (objetivo.rol === 'admin' && perfil_acceso !== 'administracion') return error('No podés bajar desde aquí el último perfil administrativo.', 400)
    if (['coordinacion', 'integrante'].includes(perfil_acceso)) {
      const asignaciones = await env.BASE.prepare('SELECT COUNT(*) AS cantidad FROM responsabilidades_equipo WHERE usuario_correo = ?1 AND activo = 1').bind(correo).first()
      if (!Number(asignaciones?.cantidad || 0)) return error('Asignale al menos un equipo antes de usar este perfil.', 400)
    }
    const rol = perfil_acceso === 'administracion' ? 'admin' : 'coordinacion'
    const { vigencia: vigenciaDatos, hastaGuardado, sinVencimiento } = decisionVigencia
    await env.BASE.prepare('UPDATE usuarios SET rol = ?1, perfil_acceso = ?2, permisos = ?3, nivel_datos_personales = ?4, datos_personales_hasta = ?5, datos_personales_sin_vencimiento = ?6, version_sesion = version_sesion + 1 WHERE correo = ?7')
      .bind(rol, perfil_acceso, perfil_acceso === 'administracion' ? null : JSON.stringify(PERMISOS_POR_PERFIL[perfil_acceso]), nivelDatos, hastaGuardado, sinVencimiento, correo).run()
    const detalleVigencia = nivelDatos === 'ninguno' ? '' : vigenciaDatos === 'indefinida' ? ' sin vencimiento' : ` hasta ${hasta}`
    await registrar(env.BASE, sesion, 'cambiar acceso y datos personales', correo, `${perfil_acceso} · ${nivelDatos}${detalleVigencia}`)
    const cuerpo = { actualizada: true, perfil_acceso, nivel_datos_personales: nivelDatos, vigencia_datos_personales: vigenciaDatos, datos_personales_hasta: hastaGuardado, permisos: PERMISOS_POR_PERFIL[perfil_acceso] }
    if (correo === sesion.correo) {
      const expira = Math.floor(Date.now() / 1000) + DURACION_SESION
      const token = await firmarSesion({ usuario: correo, version: Number(objetivo.version_sesion || 0) + 1, expira }, env.SESSION_SECRET)
      return responder(cuerpo, 200, { 'set-cookie': cookieSesion(token) })
    }
    return responder(cuerpo)
  }
  if (request.method === 'DELETE') {
    const correo = String(new URL(request.url).searchParams.get('correo') || '').trim().toLowerCase()
    if (!correo || correo === sesion.correo) return error('No podés quitar tu propio acceso.', 400)
    const admins = await env.BASE.prepare(
      "SELECT COUNT(*) AS cantidad FROM usuarios WHERE activo = 1 AND rol = 'admin'",
    ).first()
    const objetivo = await env.BASE.prepare('SELECT rol FROM usuarios WHERE correo = ?1 AND activo = 1').bind(correo).first()
    if (!objetivo) return error('No encontramos ese acceso.', 404)
    if (objetivo.rol === 'admin' && admins.cantidad <= 1) return error('Tiene que quedar al menos una administradora.', 400)
    await env.BASE.prepare('UPDATE usuarios SET activo = 0, version_sesion = version_sesion + 1 WHERE correo = ?1').bind(correo).run()
    await registrar(env.BASE, sesion, 'quitar acceso', correo)
    return responder({ quitado: true })
  }
  return error('Método no permitido.', 405)
}

async function fotoPerfilUsuario(contexto, sesion) {
  if (!esAdmin(sesion)) return error('Solo la administración puede gestionar fotos de perfil.', 403)
  const { request, env } = contexto
  const correo = String(new URL(request.url).searchParams.get('correo') || '').trim().toLowerCase()
  if (!usuarioValido(correo)) return error('Elegí una cuenta válida.', 400)
  const usuario = await env.BASE.prepare('SELECT correo, nombre, foto_perfil FROM usuarios WHERE correo = ?1 AND activo = 1').bind(correo).first()
  if (!usuario) return error('No encontramos ese acceso.', 404)
  const clave = usuario.foto_perfil || await claveFotoPerfil(correo)

  if (request.method === 'GET') {
    if (!usuario.foto_perfil) return error('Esta cuenta todavía no tiene foto de perfil.', 404)
    const guardada = await env.BASE.prepare('SELECT datos, tipo, revision FROM fotos WHERE clave = ?1').bind(clave).first()
    if (!guardada) return error('No se encontró la foto de perfil.', 404)
    return new Response(bytesFoto(guardada.datos), { headers: { 'content-type': guardada.tipo, etag: `"${guardada.revision}"`, 'cache-control': 'private, max-age=300' } })
  }
  if (request.method === 'PUT') {
    const datos = await request.arrayBuffer()
    const tipo = request.headers.get('content-type') || 'image/jpeg'
    if (!/^image\/(jpeg|png|webp)$/.test(tipo)) return error('Usá una imagen JPG, PNG o WebP.', 400)
    if (!datos.byteLength) return error('La foto está vacía.', 400)
    if (datos.byteLength > 500 * 1024) return error('La foto supera el máximo de 500 KB.', 413)
    const actual = await env.BASE.prepare('SELECT revision FROM fotos WHERE clave = ?1').bind(clave).first()
    const revision = (actual?.revision ?? 0) + 1
    await env.BASE.batch([
      env.BASE.prepare(`INSERT INTO fotos (clave, datos, tipo, revision, actualizado_por, actualizado_en)
        VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP)
        ON CONFLICT(clave) DO UPDATE SET datos = excluded.datos, tipo = excluded.tipo, revision = excluded.revision,
          actualizado_por = excluded.actualizado_por, actualizado_en = CURRENT_TIMESTAMP`).bind(clave, datos, tipo, revision, sesion.correo),
      env.BASE.prepare('UPDATE usuarios SET foto_perfil = ?1 WHERE correo = ?2').bind(clave, correo),
    ])
    await registrar(env.BASE, sesion, 'guardar foto de perfil', `usuarios/${correo}`, usuario.nombre)
    return responder({ guardada: true, foto_perfil: clave, revision })
  }
  if (request.method === 'DELETE') {
    await env.BASE.batch([
      env.BASE.prepare('DELETE FROM fotos WHERE clave = ?1').bind(clave),
      env.BASE.prepare('UPDATE usuarios SET foto_perfil = NULL WHERE correo = ?1').bind(correo),
    ])
    await registrar(env.BASE, sesion, 'quitar foto de perfil', `usuarios/${correo}`, usuario.nombre)
    return responder({ borrada: true })
  }
  return error('Método no permitido.', 405)
}

async function auditoria(contexto, sesion) {
  if (!puedeVerAuditoria(sesion)) return error('Solo la administración puede ver el registro institucional.', 403)
  const limiteSolicitado = Number(new URL(contexto.request.url).searchParams.get('limite') || 50)
  const limite = Number.isInteger(limiteSolicitado) ? Math.min(Math.max(limiteSolicitado, 10), 100) : 50
  const filas = await contexto.env.BASE.prepare(`SELECT actividad.id, actividad.correo, actividad.accion, actividad.recurso,
    actividad.detalle, actividad.cuando, COALESCE(usuarios.nombre, actividad.correo) AS actor_nombre,
    tareas_cms.descripcion AS tarea_descripcion, entradas_evento.id AS entrada_evento_id
    FROM actividad LEFT JOIN usuarios ON usuarios.correo = actividad.correo
    LEFT JOIN tareas_cms ON actividad.recurso = 'tareas/' || tareas_cms.id
    LEFT JOIN entradas_cms entradas_evento ON actividad.recurso = 'eventos/' || entradas_evento.evento_id
    ORDER BY actividad.cuando DESC, actividad.id DESC LIMIT ?1`).bind(limite).all()
  const actividad = puedeVerRespuestasCms(sesion)
    ? filas.results.map(({ tarea_descripcion, entrada_evento_id, ...fila }) => fila)
    : filas.results.map(actividadCmsSinDatosDeEntradas)
  return responder({ actividad })
}

function rutaDocumento(url) {
  return String(new URL(url).searchParams.get('ruta') || '').trim()
}

function rutaPermitida(ruta) {
  return ruta === 'roster.json'
    || ruta === 'seguimientos.json'
    || /^listas\/\d{4}-\d{2}-\d{2}\.json$/.test(ruta)
    || /^asistencias\/\d{4}-\d{2}\.json$/.test(ruta)
}

async function documento(contexto, sesion) {
  const { request, env } = contexto
  const ruta = rutaDocumento(request.url)
  if (!rutaPermitida(ruta)) return error('La ruta de datos no es válida.', 400)
  if (request.method !== 'GET' && !tienePermiso(sesion, permisosParaDocumento(ruta))) {
    return error('Tu cuenta no puede modificar estos datos.', 403)
  }

  if (request.method === 'GET') {
    const fila = await env.BASE.prepare(
      'SELECT contenido, revision, actualizado_por, actualizado_en FROM documentos WHERE ruta = ?1',
    ).bind(ruta).first()
    if (!fila) return error('No se encontró el documento.', 404)
    const contenido = JSON.parse(fila.contenido)
    return responder(ruta === 'roster.json' ? rosterParaSesion(contenido, sesion) : contenido, 200, { etag: `"${fila.revision}"` })
  }

  if (request.method === 'DELETE') {
    const esperada = request.headers.get('if-match')?.replaceAll('"', '') ?? null
    const actual = await env.BASE.prepare('SELECT revision FROM documentos WHERE ruta = ?1').bind(ruta).first()
    if (actual && esperada && String(actual.revision) !== esperada) return error('Otra coordinadora modificó estos datos. Recargá antes de borrar.', 409)
    await env.BASE.prepare('DELETE FROM documentos WHERE ruta = ?1').bind(ruta).run()
    await registrar(env.BASE, sesion, 'borrar', ruta)
    return responder({ borrada: true })
  }
  if (request.method !== 'PUT') return error('Método no permitido.', 405)
  let contenido
  try {
    contenido = await request.json()
  } catch {
    return error('El documento no contiene JSON válido.', 400)
  }

  const esperada = request.headers.get('if-match')?.replaceAll('"', '') ?? null
  const actual = await env.BASE.prepare('SELECT revision FROM documentos WHERE ruta = ?1').bind(ruta).first()
  if (actual && String(actual.revision) !== esperada) {
    return error('Otra coordinadora modificó estos datos. Recargá antes de guardar.', 409)
  }
  if (!actual && esperada && esperada !== '0') {
    return error('Los datos cambiaron antes de poder guardarlos. Recargá.', 409)
  }

  if (ruta === 'roster.json' && !tienePermiso(sesion, 'personas')) {
    const guardado = actual
      ? JSON.parse((await env.BASE.prepare('SELECT contenido FROM documentos WHERE ruta = ?1').bind(ruta).first()).contenido)
      : { version: 1, participantes: [], voluntarios: [] }
    contenido = preservarRosterParaAgenda(guardado, contenido)
  }
  if (ruta === 'roster.json' && tienePermiso(sesion, 'personas') && actual) {
    const guardado = JSON.parse((await env.BASE.prepare('SELECT contenido FROM documentos WHERE ruta = ?1').bind(ruta).first()).contenido)
    contenido = combinarProtegidos(guardado, contenido, { permitirFinanzas: esAdmin(sesion) })
  }

  const revision = (actual?.revision ?? 0) + 1
  await env.BASE.prepare(`
    INSERT INTO documentos (ruta, contenido, revision, actualizado_por, actualizado_en)
    VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)
    ON CONFLICT(ruta) DO UPDATE SET
      contenido = excluded.contenido,
      revision = excluded.revision,
      actualizado_por = excluded.actualizado_por,
      actualizado_en = CURRENT_TIMESTAMP
  `).bind(ruta, JSON.stringify(contenido), revision, sesion.correo).run()
  if (ruta === 'roster.json' && esAdmin(sesion)) await sincronizarCuentasFsbConRoster(env.BASE, contenido, sesion)
  await registrar(env.BASE, sesion, actual ? 'modificar' : 'crear', ruta)
  return responder({ revision }, 200, { etag: `"${revision}"` })
}

async function listas(contexto, sesion) {
  if (!tienePermiso(sesion, ['planilla', 'asistencias', 'reportes'])) {
    return error('Tu cuenta no puede ver las planillas.', 403)
  }
  const filas = await contexto.env.BASE.prepare(`
    SELECT ruta, revision FROM documentos
    WHERE ruta LIKE 'listas/%.json'
    ORDER BY ruta DESC
  `).all()
  return responder(filas.results.map((fila) => ({
    fecha: fila.ruta.slice('listas/'.length, -'.json'.length),
    revision: fila.revision,
  })))
}

async function foto(contexto, sesion) {
  const { request, env } = contexto
  const clave = String(new URL(request.url).searchParams.get('clave') || '').trim()
  if (!/^[a-zA-Z0-9_.-]+$/.test(clave)) return error('La clave de la foto no es válida.', 400)
  if (!tienePermiso(sesion, 'personas')) {
    return error(request.method === 'GET'
      ? 'Tu cuenta no puede ver fotos de perfiles.'
      : 'Tu cuenta no puede modificar fotos.', 403)
  }

  const documentoRoster = await env.BASE.prepare('SELECT contenido FROM documentos WHERE ruta = ?1').bind('roster.json').first()
  const roster = documentoRoster ? JSON.parse(documentoRoster.contenido) : { participantes: [], voluntarios: [] }
  const persona = personaEnRoster(roster, clave.replace(/\.[^.]+$/, ''))
  if (!persona || !privacidadDe(persona).fotoInterna) return error('Esta foto no tiene autorización interna vigente.', 403)
  if (request.method !== 'PUT' && persona.foto !== clave) return error('Esta foto no pertenece a una ficha autorizada.', 403)
  if (nivelDatosPersonalesDe(sesion) === 'ninguno') return error('Tu cuenta no tiene acceso vigente a fotos internas.', 403)
  if (request.method !== 'GET' && nivelDatosPersonalesDe(sesion) !== 'sensible') return error('Solo el rol de ficha protegida puede modificar fotos.', 403)

  if (request.method === 'GET') {
    const guardada = await env.BASE.prepare(
      'SELECT datos, tipo, revision FROM fotos WHERE clave = ?1',
    ).bind(clave).first()
    if (!guardada) return error('No se encontró la foto.', 404)
    await registrar(env.BASE, sesion, 'abrir foto interna', `fotos/${clave}`, persona.nombre)
    return new Response(bytesFoto(guardada.datos), {
      headers: { 'content-type': guardada.tipo, etag: `"${guardada.revision}"` },
    })
  }
  if (request.method === 'PUT') {
    const datos = await request.arrayBuffer()
    if (!datos.byteLength) return error('La foto está vacía.', 400)
    if (datos.byteLength > 500 * 1024) return error('La foto supera el máximo de 500 KB.', 413)
    const actual = await env.BASE.prepare('SELECT revision FROM fotos WHERE clave = ?1').bind(clave).first()
    const revision = (actual?.revision ?? 0) + 1
    await env.BASE.prepare(`
      INSERT INTO fotos (clave, datos, tipo, revision, actualizado_por, actualizado_en)
      VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP)
      ON CONFLICT(clave) DO UPDATE SET
        datos = excluded.datos,
        tipo = excluded.tipo,
        revision = excluded.revision,
        actualizado_por = excluded.actualizado_por,
        actualizado_en = CURRENT_TIMESTAMP
    `).bind(clave, datos, request.headers.get('content-type') || 'image/jpeg', revision, sesion.correo).run()
    await registrar(env.BASE, sesion, 'guardar foto', `fotos/${clave}`)
    return responder({ guardada: true, revision }, 200, { etag: `"${revision}"` })
  }
  if (request.method === 'DELETE') {
    await env.BASE.prepare('DELETE FROM fotos WHERE clave = ?1').bind(clave).run()
    await registrar(env.BASE, sesion, 'borrar foto', `fotos/${clave}`)
    return responder({ borrada: true })
  }
  return error('Método no permitido.', 405)
}

async function fichaProtegida(contexto, sesion, id) {
  if (nivelDatosPersonalesDe(sesion) !== 'sensible') return error('Tu cuenta no tiene acceso vigente a fichas protegidas.', 403)
  const { request, env } = contexto
  const documentoRoster = await env.BASE.prepare('SELECT contenido, revision FROM documentos WHERE ruta = ?1').bind('roster.json').first()
  if (!documentoRoster) return error('No se encontró el registro de personas.', 404)
  const roster = JSON.parse(documentoRoster.contenido)
  const persona = personaEnRoster(roster, id)
  if (!persona) return error('No encontramos a esa persona.', 404)
  if (request.method === 'GET') {
    await registrar(env.BASE, sesion, 'abrir ficha protegida', `personas/${id}`, persona.nombre)
    return responder({ id: persona.id, nombre: persona.nombre, ...datosProtegidosDe(persona) })
  }
  if (request.method !== 'PATCH') return error('Método no permitido.', 405)
  let datos
  try { datos = await request.json() } catch { return error('La ficha protegida no es válida.', 400) }
  const privacidad = privacidadDe({ privacidad: datos.privacidad })
  const autorizadoPor = String(datos.autorizadoPor ?? '').trim()
  const documentadoEl = String(datos.documentadoEl ?? '').trim()
  const contactoEmergencia = String(datos.contactoEmergencia ?? '').trim()
  const anioNacimiento = String(datos.anioNacimiento ?? '').trim()
  const necesidades = String(datos.necesidades ?? '').trim()
  const hayConsentimiento = privacidad.perfilInterno || privacidad.fotoInterna || privacidad.fotoPublica || privacidad.contacto || privacidad.datosSensibles
  if (hayConsentimiento && (!autorizadoPor || !fechaValida(documentadoEl))) return error('Indicá quién autorizó y cuándo se documentó cada consentimiento.', 400)
  if (privacidad.fotoPublica && !privacidad.fotoInterna) return error('La autorización pública requiere también la autorización interna de la foto.', 400)
  if (contactoEmergencia && !privacidad.contacto) return error('No podés guardar un contacto de emergencia sin consentimiento.', 400)
  if (necesidades && !privacidad.datosSensibles) return error('No podés guardar necesidades sensibles sin consentimiento.', 400)
  if (anioNacimiento && !fechaValida(anioNacimiento)) return error('La fecha de nacimiento no es válida.', 400)
  const actualizar = (personas = []) => personas.map((actual) => actual.id !== id ? actual : {
    ...actual,
    contactoEmergencia: privacidad.contacto ? contactoEmergencia : '',
    privacidad: { ...privacidad, autorizadoPor, documentadoEl },
    perfil: { ...(actual.perfil ?? {}), anioNacimiento: privacidad.perfilInterno ? anioNacimiento : '', necesidades: privacidad.datosSensibles ? necesidades : '' },
  })
  const siguiente = { ...roster, participantes: actualizar(roster.participantes), voluntarios: actualizar(roster.voluntarios) }
  const revision = Number(documentoRoster.revision) + 1
  await env.BASE.prepare('UPDATE documentos SET contenido = ?1, revision = ?2, actualizado_por = ?3, actualizado_en = CURRENT_TIMESTAMP WHERE ruta = ?4')
    .bind(JSON.stringify(siguiente), revision, sesion.correo, 'roster.json').run()
  const actualizada = personaEnRoster(siguiente, id)
  await registrar(env.BASE, sesion, 'guardar ficha protegida', `personas/${id}`, actualizada.nombre)
  return responder({ guardada: true, revision, persona: personaOperativa(actualizada, sesion) })
}

const TIPOS_CMS = ['tarea', 'directriz', 'solicitud', 'seguimiento', 'nota']
const ESTADOS_CMS = ['pendiente', 'en_marcha', 'esperando_respuesta', 'bloqueada', 'completada', 'cancelada']
const PRIORIDADES_CMS = ['baja', 'normal', 'alta', 'urgente']
const ESTADOS_PROYECTO_CMS = ['borrador', 'en_marcha', 'en_pausa', 'cerrado']
const TIPOS_RESPONSABILIDAD_CMS = ['coordinacion', 'integrante', 'referente', 'sustitucion']
const ESTADOS_REUNION_CMS = ['planificada', 'realizada', 'cancelada']
const ESTADOS_DECISION_CMS = ['vigente', 'a_revisar', 'superada']
const ESTADOS_EVENTO_CMS = ['planificado', 'realizado', 'cancelado']
const TIPOS_EVENTO_CMS = ['actividad', 'reunion', 'curso', 'publicacion', 'vencimiento', 'pago', 'renovacion', 'tramite', 'certificacion', 'asamblea']
const TIPOS_ENTRADA_CMS = ['voluntariado', 'inscripcion', 'actividad', 'evento', 'pedido', 'propuesta']
const ESTADOS_ENTRADA_CMS = ['nueva', 'derivada', 'cerrada']
const MEDIOS_CUMPLIMIENTO_ENTRADA_CMS = ['contacto', 'tarea', 'actividad', 'alta', 'archivo', 'otro']
const VISIBILIDADES_FORMULARIO_CMS = ['interna', 'publica']
const ESTADOS_FORMULARIO_CMS = ['activa', 'cerrada']
const DESTINOS_RESPUESTA_CMS = ['tarea', 'solicitud', 'actividad', 'alta_persona', 'contacto', 'archivo']
const MOTIVOS_SEGUIMIENTO_PERSONAL_CMS = ['', 'no_olvidar', 'esperando_respuesta', 'hablar_con_alguien', 'revisar_en_reunion', 'requiere_decision']
const NIVELES_RIESGO_PROYECTO_CMS = ['bajo', 'medio', 'alto', 'critico']
const ESTADOS_RIESGO_PROYECTO_CMS = ['abierto', 'mitigado', 'aceptado']
const FRECUENCIAS_TAREA_RECURRENTE_CMS = ['semanal', 'mensual']
const FRECUENCIAS_EVENTO_RECURRENTE_CMS = ['semanal', 'quincenal', 'mensual', 'mensual_ordinal']
const FRECUENCIAS_REUNION_EQUIPO_CMS = ['semanal', 'quincenal', 'mensual', 'segun_necesidad']
const CATEGORIAS_EQUIPO_CMS = ['equipo', 'comision_directiva', 'comision_fiscal', 'comision_electoral', 'comision']
const TIPOS_UNIDAD_CMS = ['programa', 'formacion', 'canal', 'proceso']
const ESTADOS_UNIDAD_CMS = ['borrador', 'activa', 'en_pausa', 'archivada']
const COLOR_EQUIPO = /^#[0-9a-fA-F]{6}$/
const PRIORIDADES_COMUNICADO_CMS = ['normal', 'urgente']
const ESTADOS_COMUNICADO_CMS = ['activo', 'cerrado']
const TIPOS_SOLICITUD_PRIVACIDAD_CMS = ['copia', 'eliminacion']
const CANALES_SOLICITUD_PRIVACIDAD_CMS = ['correo', 'telefono', 'presencial', 'formulario', 'otro']
const ESTADOS_SOLICITUD_PRIVACIDAD_CMS = ['recibida', 'identidad_verificada', 'en_revision', 'lista_para_entrega', 'lista_para_decision', 'cerrada', 'rechazada']
const CONDICIONES_CUENTA_FSB = ['regular', 'beca', 'voluntariado', 'baja']
const TIPOS_MOVIMIENTO_FSB = ['cargo', 'pago', 'recargo', 'ajuste_cargo', 'ajuste_credito', 'saldo_inicial']

export function responsableSolicitudDe(responsabilidades, equipoId) {
  const orden = { coordinacion: 0, referente: 1, sustitucion: 2, integrante: 3 }
  return [...(responsabilidades ?? [])]
    .filter((fila) => fila?.equipo_id === equipoId && fila?.activo !== 0 && orden[fila?.tipo] !== undefined)
    .sort((primera, segunda) => (orden[primera.tipo] - orden[segunda.tipo]) || String(primera.usuario_correo).localeCompare(String(segunda.usuario_correo), 'es'))
    .at(0)?.usuario_correo ?? null
}

function textoCms(valor, limite = 4000) {
  return String(valor ?? '').trim().slice(0, limite)
}

export function fechaCmsValida(fecha) {
  if (!fecha) return true
  const texto = String(fecha)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false
  const fechaLocal = new Date(`${texto}T00:00:00`)
  return !Number.isNaN(fechaLocal.getTime()) && fechaLocal.toISOString().slice(0, 10) === texto
}

export function solicitudPrivacidadCmsDesde(datos, actual = {}) {
  const solicitud = {
    tipo: datos.tipo ?? actual.tipo ?? 'copia',
    solicitante_nombre: textoCms(datos.solicitante_nombre ?? actual.solicitante_nombre, 180),
    contacto: textoCms(datos.contacto ?? actual.contacto, 240),
    canal: datos.canal ?? actual.canal ?? 'correo',
    alcance: textoCms(datos.alcance ?? actual.alcance, 1200),
    responsable_correo: textoCms(datos.responsable_correo ?? actual.responsable_correo, 180).toLowerCase() || null,
    fecha_objetivo: datos.fecha_objetivo ?? actual.fecha_objetivo ?? null,
  }
  if (!TIPOS_SOLICITUD_PRIVACIDAD_CMS.includes(solicitud.tipo)) return { error: 'Elegí si la solicitud pide una copia o una eliminación.' }
  if (!solicitud.solicitante_nombre || !solicitud.contacto || !solicitud.alcance) return { error: 'Completá la persona, el contacto y qué información solicita.' }
  if (!CANALES_SOLICITUD_PRIVACIDAD_CMS.includes(solicitud.canal)) return { error: 'Elegí un canal de recepción válido.' }
  if (!fechaCmsValida(solicitud.fecha_objetivo)) return { error: 'La fecha objetivo debe usar el formato AAAA-MM-DD.' }
  return { solicitud }
}

export function avanceSolicitudPrivacidadCms(actual, accion, nota = '') {
  if (!actual || !ESTADOS_SOLICITUD_PRIVACIDAD_CMS.includes(actual.estado)) return { error: 'La solicitud no tiene un estado válido.' }
  const textoNota = textoCms(nota, 2000)
  const esperada = {
    verificar_identidad: ['recibida'],
    iniciar_revision: ['identidad_verificada'],
    preparar_resultado: ['en_revision'],
    cerrar: actual.tipo === 'copia' ? ['lista_para_entrega'] : ['lista_para_decision'],
    rechazar: ['recibida', 'identidad_verificada', 'en_revision', 'lista_para_entrega', 'lista_para_decision'],
  }[accion]
  if (!esperada?.includes(actual.estado)) return { error: 'Ese paso no corresponde al estado actual de la solicitud.' }
  if (['verificar_identidad', 'cerrar', 'rechazar'].includes(accion) && textoNota.length < 10) {
    return { error: accion === 'verificar_identidad' ? 'Explicá brevemente cómo se verificó la identidad.' : 'Agregá una constancia clara antes de cerrar la solicitud.' }
  }
  const estado = {
    verificar_identidad: 'identidad_verificada',
    iniciar_revision: 'en_revision',
    preparar_resultado: actual.tipo === 'copia' ? 'lista_para_entrega' : 'lista_para_decision',
    cerrar: 'cerrada',
    rechazar: 'rechazada',
  }[accion]
  return { estado, nota: textoNota }
}

export function tareaCmsDesde(datos, actual = {}) {
  const esfuerzoOriginal = datos.esfuerzo_horas ?? actual.esfuerzo_horas ?? null
  const tarea = {
    titulo: textoCms(datos.titulo ?? actual.titulo, 180),
    descripcion: textoCms(datos.descripcion ?? actual.descripcion),
    tipo: datos.tipo ?? actual.tipo ?? 'tarea',
    estado: datos.estado ?? actual.estado ?? 'pendiente',
    prioridad: datos.prioridad ?? actual.prioridad ?? 'normal',
    equipo_id: datos.equipo_id ?? actual.equipo_id ?? null,
    unidad_id: datos.unidad_id ?? actual.unidad_id ?? null,
    proyecto_id: datos.proyecto_id ?? actual.proyecto_id ?? null,
    objetivo: textoCms(datos.objetivo ?? actual.objetivo), pasos: textoCms(datos.pasos ?? actual.pasos),
    recursos: textoCms(datos.recursos ?? actual.recursos), personas_necesarias: textoCms(datos.personas_necesarias ?? actual.personas_necesarias),
    evento_id: datos.evento_id ?? actual.evento_id ?? null,
    responsable_correo: datos.responsable_correo ?? actual.responsable_correo ?? null,
    solicitante_correo: datos.solicitante_correo ?? actual.solicitante_correo ?? null,
    fecha_limite: datos.fecha_limite ?? actual.fecha_limite ?? null,
    fecha_seguimiento: datos.fecha_seguimiento ?? actual.fecha_seguimiento ?? null,
    esfuerzo_horas: esfuerzoOriginal === '' || esfuerzoOriginal === null ? null : Number(esfuerzoOriginal),
    seguimiento_personal: datos.seguimiento_personal === undefined ? Number(actual.seguimiento_personal || 0) : (datos.seguimiento_personal ? 1 : 0),
    motivo_seguimiento: textoCms(datos.motivo_seguimiento ?? actual.motivo_seguimiento, 40),
    seguimiento_personal_por: datos.seguimiento_personal_por ?? actual.seguimiento_personal_por ?? null,
  }
  if (!tarea.titulo) return { error: 'La tarea necesita un título.' }
  if (!TIPOS_CMS.includes(tarea.tipo) || !ESTADOS_CMS.includes(tarea.estado) || !PRIORIDADES_CMS.includes(tarea.prioridad)) {
    return { error: 'El tipo, estado o prioridad no es válido.' }
  }
  if (tarea.tipo === 'solicitud' && !tarea.equipo_id) return { error: 'Elegí el equipo al que se dirige la solicitud.' }
  if (!fechaCmsValida(tarea.fecha_limite) || !fechaCmsValida(tarea.fecha_seguimiento)) return { error: 'Las fechas deben usar el formato AAAA-MM-DD.' }
  if (tarea.esfuerzo_horas !== null && (!Number.isFinite(tarea.esfuerzo_horas) || tarea.esfuerzo_horas <= 0 || tarea.esfuerzo_horas > 168)) return { error: 'El esfuerzo estimado debe estar entre 0,25 y 168 horas.' }
  if (!MOTIVOS_SEGUIMIENTO_PERSONAL_CMS.includes(tarea.motivo_seguimiento)) return { error: 'Elegí un motivo de seguimiento personal válido.' }
  if (!tarea.seguimiento_personal) { tarea.motivo_seguimiento = ''; tarea.seguimiento_personal_por = null }
  return { tarea }
}

export function capacidadTrabajoCmsDesde(datos) {
  const horas = datos.horas_semanales === '' || datos.horas_semanales === null || datos.horas_semanales === undefined
    ? NaN : Number(datos.horas_semanales)
  const capacidad = {
    usuario_correo: textoCms(datos.usuario_correo, 180).toLowerCase(),
    horas_semanales: horas,
    nota: textoCms(datos.nota, 400),
  }
  if (!capacidad.usuario_correo) return { error: 'Elegí una persona para registrar su disponibilidad.' }
  if (!Number.isFinite(horas) || horas < 0 || horas > 80) return { error: 'La disponibilidad semanal debe estar entre 0 y 80 horas.' }
  return { capacidad }
}

export function comunicadoCmsDesde(datos, actual = {}) {
  const comunicado = {
    titulo: textoCms(datos.titulo ?? actual.titulo, 180),
    detalle: textoCms(datos.detalle ?? actual.detalle),
    prioridad: datos.prioridad ?? actual.prioridad ?? 'normal',
    equipo_id: datos.equipo_id ?? actual.equipo_id ?? null,
    estado: datos.estado ?? actual.estado ?? 'activo',
    vence_el: datos.vence_el ?? actual.vence_el ?? null,
  }
  if (!comunicado.titulo) return { error: 'El comunicado necesita un título.' }
  if (!PRIORIDADES_COMUNICADO_CMS.includes(comunicado.prioridad) || !ESTADOS_COMUNICADO_CMS.includes(comunicado.estado)) return { error: 'La prioridad o el estado del comunicado no es válido.' }
  if (!fechaCmsValida(comunicado.vence_el)) return { error: 'La fecha de vigencia debe usar el formato AAAA-MM-DD.' }
  return { comunicado }
}

export function equipoCmsDesde(datos, actual = {}) {
  const equipo = {
    nombre: textoCms(datos.nombre ?? actual.nombre, 90),
    categoria: datos.categoria ?? actual.categoria ?? 'equipo',
    descripcion: textoCms(datos.descripcion ?? actual.descripcion, 400),
    color: textoCms(datos.color ?? actual.color, 7) || '#6d3087',
    decisiones_permitidas: textoCms(datos.decisiones_permitidas ?? actual.decisiones_permitidas, 400),
    debe_escalar: textoCms(datos.debe_escalar ?? actual.debe_escalar, 400),
    informa_a: textoCms(datos.informa_a ?? actual.informa_a, 240),
    frecuencia_reunion: datos.frecuencia_reunion ?? actual.frecuencia_reunion ?? 'segun_necesidad',
  }
  if (!equipo.nombre || !COLOR_EQUIPO.test(equipo.color)) return { error: 'Completá el nombre y un color válido.' }
  if (!CATEGORIAS_EQUIPO_CMS.includes(equipo.categoria)) return { error: 'Elegí una categoría institucional válida.' }
  if (!FRECUENCIAS_REUNION_EQUIPO_CMS.includes(equipo.frecuencia_reunion)) return { error: 'Elegí una frecuencia de reunión válida.' }
  return { equipo }
}

export function comentarioTareaCmsDesde(datos) {
  const contenido = textoCms(datos.contenido)
  if (!contenido) return { error: 'El comentario no puede quedar vacío.' }
  return { comentario: { contenido } }
}

export function cierreTareaCmsDesde(datos = {}, actual = {}, actorCorreo = '') {
  const estado = textoCms(datos.estado, 40)
  const comentario = estado === 'completada' ? textoCms(datos.comentario_cierre, 2000) : ''
  return {
    comentario,
    resolver_aviso: ['completada', 'cancelada'].includes(estado),
    notificar_a: estado === 'completada' && actual.creado_por && actual.creado_por !== actorCorreo ? actual.creado_por : null,
  }
}

export function tareaRecurrenteCmsDesde(datos) {
  const tarea = {
    titulo: textoCms(datos.titulo, 180), descripcion: textoCms(datos.descripcion), prioridad: datos.prioridad ?? 'normal',
    frecuencia: datos.frecuencia ?? 'semanal', proxima_fecha: datos.proxima_fecha ?? '',
    equipo_id: datos.equipo_id ?? null, proyecto_id: datos.proyecto_id ?? null, responsable_correo: datos.responsable_correo ?? null,
  }
  if (!tarea.titulo) return { error: 'La tarea recurrente necesita un título.' }
  if (!PRIORIDADES_CMS.includes(tarea.prioridad) || !FRECUENCIAS_TAREA_RECURRENTE_CMS.includes(tarea.frecuencia) || !tarea.proxima_fecha || !fechaCmsValida(tarea.proxima_fecha)) return { error: 'Completá una frecuencia, prioridad y próxima fecha válidas.' }
  return { tarea }
}

export function siguienteFechaRecurrenteCms(fecha, frecuencia) {
  const [anio, mes, dia] = String(fecha).split('-').map(Number)
  if (frecuencia === 'semanal') {
    const base = new Date(Date.UTC(anio, mes - 1, dia + 7))
    return base.toISOString().slice(0, 10)
  }
  if (frecuencia === 'mensual') {
    const siguienteMes = mes === 12 ? 1 : mes + 1
    const siguienteAnio = mes === 12 ? anio + 1 : anio
    const ultimoDia = new Date(Date.UTC(siguienteAnio, siguienteMes, 0)).getUTCDate()
    return `${siguienteAnio}-${String(siguienteMes).padStart(2, '0')}-${String(Math.min(dia, ultimoDia)).padStart(2, '0')}`
  }
  return fecha
}

export function proyectoCmsDesde(datos, actual = {}) {
  const presupuestoOriginal = datos.presupuesto ?? actual.presupuesto ?? null
  const proyecto = {
    titulo: textoCms(datos.titulo ?? actual.titulo, 180),
    objetivo: textoCms(datos.objetivo ?? actual.objetivo),
    programa_id: datos.programa_id ?? actual.programa_id ?? null,
    equipo_id: datos.equipo_id ?? actual.equipo_id ?? null,
    unidad_id: datos.unidad_id ?? actual.unidad_id ?? null,
    responsable_correo: datos.responsable_correo ?? actual.responsable_correo ?? null,
    estado: datos.estado ?? actual.estado ?? 'en_marcha',
    prioridad: datos.prioridad ?? actual.prioridad ?? 'normal',
    fecha_inicio: datos.fecha_inicio ?? actual.fecha_inicio ?? null,
    fecha_fin: datos.fecha_fin ?? actual.fecha_fin ?? null,
    presupuesto: presupuestoOriginal === '' || presupuestoOriginal === null ? null : Number(presupuestoOriginal),
    notas: textoCms(datos.notas ?? actual.notas),
  }
  if (!proyecto.titulo) return { error: 'El proyecto necesita un nombre.' }
  if (!ESTADOS_PROYECTO_CMS.includes(proyecto.estado) || !PRIORIDADES_CMS.includes(proyecto.prioridad)) return { error: 'El estado o la prioridad del proyecto no es válido.' }
  if (!fechaCmsValida(proyecto.fecha_inicio) || !fechaCmsValida(proyecto.fecha_fin)) return { error: 'Las fechas deben usar el formato AAAA-MM-DD.' }
  if (proyecto.fecha_inicio && proyecto.fecha_fin && proyecto.fecha_fin < proyecto.fecha_inicio) return { error: 'La fecha de cierre no puede ser anterior al inicio.' }
  if (proyecto.presupuesto !== null && (!Number.isFinite(proyecto.presupuesto) || proyecto.presupuesto < 0)) return { error: 'El presupuesto debe ser un número positivo.' }
  return { proyecto }
}

export function alianzaCmsDesde(datos, actual = {}) {
  const alianza = {
    nombre: textoCms(datos.nombre ?? actual.nombre, 180),
    tipo: textoCms(datos.tipo ?? actual.tipo, 30) || 'aliado',
    descripcion: textoCms(datos.descripcion ?? actual.descripcion),
    contacto_institucional: textoCms(datos.contacto_institucional ?? actual.contacto_institucional, 240),
    estado: textoCms(datos.estado ?? actual.estado, 30) || 'activa',
    equipo_id: datos.equipo_id ?? actual.equipo_id ?? null,
    proyecto_id: datos.proyecto_id ?? actual.proyecto_id ?? null,
  }
  if (!alianza.nombre) return { error: 'La alianza necesita un nombre.' }
  if (!['aliado', 'patrocinador', 'institucion', 'proveedor', 'red'].includes(alianza.tipo)
    || !['activa', 'en_pausa', 'finalizada'].includes(alianza.estado)) return { error: 'El tipo o estado de la alianza no es válido.' }
  return { alianza }
}

export function programaCmsDesde(datos, actual = {}) {
  const programa = {
    nombre: textoCms(datos.nombre ?? actual.nombre, 180),
    descripcion: textoCms(datos.descripcion ?? actual.descripcion),
    estado: textoCms(datos.estado ?? actual.estado, 30) || 'activo',
    equipo_id: datos.equipo_id ?? actual.equipo_id ?? null,
  }
  if (!programa.nombre) return { error: 'El programa necesita un nombre.' }
  if (!['borrador', 'activo', 'en_pausa', 'cerrado'].includes(programa.estado)) return { error: 'El estado del programa no es válido.' }
  return { programa }
}

export function unidadOperativaCmsDesde(datos, actual = {}) {
  const clave = textoCms(datos.clave ?? actual.clave, 80).toLocaleLowerCase('es')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  const unidad = {
    clave,
    nombre: textoCms(datos.nombre ?? actual.nombre, 180),
    sigla: textoCms(datos.sigla ?? actual.sigla, 30),
    descripcion: textoCms(datos.descripcion ?? actual.descripcion),
    tipo: textoCms(datos.tipo ?? actual.tipo, 30) || 'programa',
    equipo_id: datos.equipo_id ?? actual.equipo_id ?? null,
    unidad_padre_id: datos.unidad_padre_id ?? actual.unidad_padre_id ?? null,
    color: textoCms(datos.color ?? actual.color, 7) || '#6d3087',
    orden: Number(datos.orden ?? actual.orden ?? 0),
    estado: textoCms(datos.estado ?? actual.estado, 30) || 'activa',
  }
  if (!unidad.clave || !unidad.nombre || !unidad.equipo_id) return { error: 'Completá la clave, el nombre y el área responsable.' }
  if (!TIPOS_UNIDAD_CMS.includes(unidad.tipo) || !ESTADOS_UNIDAD_CMS.includes(unidad.estado)) return { error: 'El tipo o estado de la unidad no es válido.' }
  if (!COLOR_EQUIPO.test(unidad.color)) return { error: 'Elegí un color válido para la unidad.' }
  if (!Number.isInteger(unidad.orden) || unidad.orden < 0 || unidad.orden > 9999) return { error: 'El orden debe ser un número entero entre 0 y 9999.' }
  return { unidad }
}

export function riesgoProyectoCmsDesde(datos, actual = {}) {
  const riesgo = {
    titulo: textoCms(datos.titulo ?? actual.titulo, 180),
    descripcion: textoCms(datos.descripcion ?? actual.descripcion),
    nivel: datos.nivel ?? actual.nivel ?? 'medio',
    estado: datos.estado ?? actual.estado ?? 'abierto',
    responsable_correo: datos.responsable_correo ?? actual.responsable_correo ?? null,
    fecha_revision: datos.fecha_revision ?? actual.fecha_revision ?? null,
  }
  if (!riesgo.titulo) return { error: 'El riesgo necesita un título.' }
  if (!NIVELES_RIESGO_PROYECTO_CMS.includes(riesgo.nivel) || !ESTADOS_RIESGO_PROYECTO_CMS.includes(riesgo.estado)) return { error: 'El nivel o estado del riesgo no es válido.' }
  if (!fechaCmsValida(riesgo.fecha_revision)) return { error: 'La fecha de revisión debe usar el formato AAAA-MM-DD.' }
  return { riesgo }
}

export function hitoProyectoCmsDesde(datos, actual = {}) {
  const hito = {
    titulo: textoCms(datos.titulo ?? actual.titulo, 180),
    descripcion: textoCms(datos.descripcion ?? actual.descripcion),
    fecha_objetivo: datos.fecha_objetivo ?? actual.fecha_objetivo ?? null,
    estado: datos.estado ?? actual.estado ?? 'pendiente',
    responsable_correo: datos.responsable_correo ?? actual.responsable_correo ?? null,
  }
  if (!hito.titulo) return { error: 'El hito necesita un título.' }
  if (!['pendiente', 'en_marcha', 'completado', 'cancelado'].includes(hito.estado)) return { error: 'El estado del hito no es válido.' }
  if (!fechaCmsValida(hito.fecha_objetivo)) return { error: 'La fecha objetivo debe usar el formato AAAA-MM-DD.' }
  return { hito }
}

export function gastoProyectoCmsDesde(datos) {
  const montoOriginal = datos.monto
  const gasto = {
    concepto: textoCms(datos.concepto, 180),
    monto: Number(montoOriginal),
    fecha: datos.fecha ?? null,
    notas: textoCms(datos.notas),
  }
  if (!gasto.concepto) return { error: 'El gasto necesita un concepto.' }
  if (montoOriginal === '' || montoOriginal === null || montoOriginal === undefined || !Number.isFinite(gasto.monto) || gasto.monto < 0) return { error: 'Ingresá un monto válido mayor o igual a cero.' }
  if (!gasto.fecha || !fechaCmsValida(gasto.fecha)) return { error: 'La fecha del gasto debe usar el formato AAAA-MM-DD.' }
  return { gasto }
}

export function cuentaFsbDesde(datos, actual = {}) {
  const grupoCrudo = datos.grupo ?? actual.grupo ?? null
  const becaCruda = datos.beca_porcentaje ?? actual.beca_porcentaje ?? 0
  const cuenta = {
    persona_id: textoCms(datos.persona_id ?? actual.persona_id, 100) || null,
    nombre: textoCms(datos.nombre ?? actual.nombre, 180),
    grupo: grupoCrudo === '' || grupoCrudo === null ? null : Number(grupoCrudo),
    condicion: textoCms(datos.condicion ?? actual.condicion ?? 'regular', 30),
    beca_porcentaje: Number(becaCruda),
    observaciones: textoCms(datos.observaciones ?? actual.observaciones, 1200),
    activa: datos.activa === undefined ? Number(actual.activa ?? 1) : (datos.activa === false ? 0 : 1),
  }
  if (!cuenta.nombre) return { error: 'Ingresá el nombre de la persona o familia.' }
  if (cuenta.grupo !== null && ![1, 2].includes(cuenta.grupo)) return { error: 'Elegí el grupo 1 o 2.' }
  if (!CONDICIONES_CUENTA_FSB.includes(cuenta.condicion)) return { error: 'La condición de la cuenta no es válida.' }
  if (!Number.isFinite(cuenta.beca_porcentaje) || cuenta.beca_porcentaje < 0 || cuenta.beca_porcentaje > 100) return { error: 'La beca debe estar entre 0% y 100%.' }
  if (cuenta.condicion !== 'beca') cuenta.beca_porcentaje = 0
  return { cuenta }
}

export function movimientoFsbDesde(datos) {
  const tipo = textoCms(datos.tipo, 30)
  const montoCentavos = importeCentavosFsb(datos.importe ?? datos.monto)
  const movimiento = {
    cuenta_id: textoCms(datos.cuenta_id, 100),
    tipo,
    concepto: textoCms(datos.concepto, 180),
    periodo: textoCms(datos.periodo, 7) || null,
    fecha: textoCms(datos.fecha, 10),
    vencimiento: textoCms(datos.vencimiento, 10) || null,
    importe_centavos: montoCentavos === null ? null : montoCentavos * signoMovimientoFsb(tipo),
    medio_pago: textoCms(datos.medio_pago, 80),
    comprobante: textoCms(datos.comprobante, 180),
    notas: textoCms(datos.notas, 1200),
    clave_operacion: textoCms(datos.clave_operacion, 160) || null,
  }
  if (!movimiento.cuenta_id) return { error: 'Elegí una cuenta.' }
  if (!TIPOS_MOVIMIENTO_FSB.includes(tipo) || !signoMovimientoFsb(tipo)) return { error: 'El tipo de movimiento no es válido.' }
  if (!movimiento.concepto) return { error: 'Ingresá el concepto del movimiento.' }
  if (!fechaCmsValida(movimiento.fecha) || (movimiento.vencimiento && !fechaCmsValida(movimiento.vencimiento))) return { error: 'Ingresá fechas válidas.' }
  if (movimiento.periodo && !/^\d{4}-(0[1-9]|1[0-2])$/.test(movimiento.periodo)) return { error: 'El período debe indicar año y mes.' }
  if (!montoCentavos || montoCentavos > 100000000) return { error: 'Ingresá un importe mayor a cero y menor a $1.000.000.' }
  if (movimiento.tipo === 'pago' && !movimiento.medio_pago) return { error: 'Elegí cómo se recibió el pago.' }
  return { movimiento }
}

export function configuracionFinanzasFsb(roster = {}, cuentas = [], movimientos = [], hoy = fechaActualCms()) {
  const vinculadas = new Set(cuentas.map((cuenta) => cuenta.persona_id).filter(Boolean))
  const participantes = (roster.participantes || []).filter((persona) => persona.activo !== false)
  return {
    participantes_sin_cuenta: participantes.filter((persona) => !vinculadas.has(persona.id)).map((persona) => ({ id: persona.id, nombre: persona.nombre })),
    participantes_sin_grupo: cuentas.filter((cuenta) => cuenta.activa !== 0 && ![1, 2].includes(Number(cuenta.grupo))).map((cuenta) => ({ id: cuenta.id, nombre: cuenta.nombre })),
    becas_sin_porcentaje: cuentas.filter((cuenta) => cuenta.activa !== 0 && cuenta.condicion === 'beca' && !Number(cuenta.beca_porcentaje)).map((cuenta) => ({ id: cuenta.id, nombre: cuenta.nombre })),
    mes_actual_generado: movimientos.some((movimiento) => String(movimiento.clave_operacion || '').startsWith(`cuota:${hoy.slice(0, 7)}:`) && !movimiento.anulado_en),
  }
}

export function compromisoPagoFsbDesde(datos) {
  const importeCrudo = datos.importe ?? datos.monto ?? ''
  const importeCentavos = String(importeCrudo).trim() ? importeCentavosFsb(importeCrudo) : null
  const compromiso = {
    cuenta_id: textoCms(datos.cuenta_id, 100),
    importe_centavos: importeCentavos,
    fecha_acuerdo: textoCms(datos.fecha_acuerdo, 10),
    fecha_prevista: textoCms(datos.fecha_prevista, 10),
    nota: textoCms(datos.nota, 600),
  }
  if (!compromiso.cuenta_id) return { error: 'Elegí una cuenta.' }
  if (!fechaCmsValida(compromiso.fecha_acuerdo) || !fechaCmsValida(compromiso.fecha_prevista) || compromiso.fecha_prevista < compromiso.fecha_acuerdo) return { error: 'La fecha prevista debe ser igual o posterior a la fecha del acuerdo.' }
  if (importeCentavos !== null && (!importeCentavos || importeCentavos > 100000000)) return { error: 'Ingresá un importe válido menor a $1.000.000 o dejalo vacío.' }
  return { compromiso }
}

export function documentoCmsDesde(datos, actual = {}) {
  const documento = {
    titulo: textoCms(datos.titulo ?? actual.titulo, 180), descripcion: textoCms(datos.descripcion ?? actual.descripcion),
    tipo: textoCms(datos.tipo ?? actual.tipo, 20) || 'enlace', url: textoCms(datos.url ?? actual.url, 2000),
    sensibilidad: textoCms(datos.sensibilidad ?? actual.sensibilidad, 20) || 'interno',
    equipo_id: datos.equipo_id ?? actual.equipo_id ?? null, unidad_id: datos.unidad_id ?? actual.unidad_id ?? null,
    proyecto_id: datos.proyecto_id ?? actual.proyecto_id ?? null,
  }
  documento.url = normalizarEnlaceUsuario(documento.url)
  let url
  try { url = new URL(documento.url) } catch { return { error: MENSAJE_ENLACE_INVALIDO } }
  if (!documento.titulo || !['enlace', 'guia', 'acta', 'plantilla', 'politica'].includes(documento.tipo) || !['compartido', 'interno', 'restringido'].includes(documento.sensibilidad) || !['https:', 'http:'].includes(url.protocol)) return { error: 'Completá título, tipo, visibilidad y un enlace web válido.' }
  return { documento }
}

export function puedeVerDocumentoCms(sesion, documento) {
  const perfil = perfilAccesoDe(sesion)
  if (perfil === 'administracion') return true
  if (perfil === 'direccion') return documento?.sensibilidad !== 'restringido'
  if (perfil === 'consulta' || perfil === 'integrante') return documento?.sensibilidad === 'compartido'
  return documento?.sensibilidad !== 'restringido'
}

export function entradaCmsDesde(datos, actual = {}) {
  const entrada = {
    tipo: datos.tipo ?? actual.tipo ?? 'voluntariado',
    nombre: textoCms(datos.nombre ?? actual.nombre, 180),
    contacto: textoCms(datos.contacto ?? actual.contacto, 180),
    detalle: textoCms(datos.detalle ?? actual.detalle),
    objetivo: textoCms(datos.objetivo ?? actual.objetivo),
    pasos: textoCms(datos.pasos ?? actual.pasos),
    recursos: textoCms(datos.recursos ?? actual.recursos),
    personas_necesarias: textoCms(datos.personas_necesarias ?? actual.personas_necesarias),
    fecha_propuesta: datos.fecha_propuesta ?? actual.fecha_propuesta ?? null,
    estado: datos.estado ?? actual.estado ?? 'nueva',
    equipo_id: datos.equipo_id ?? actual.equipo_id ?? null,
    equipo_solicitante_id: datos.equipo_solicitante_id ?? actual.equipo_solicitante_id ?? null,
    prioridad: datos.prioridad ?? actual.prioridad ?? 'normal',
    proyecto_id: datos.proyecto_id ?? actual.proyecto_id ?? null,
  }
  if (!TIPOS_ENTRADA_CMS.includes(entrada.tipo) || !ESTADOS_ENTRADA_CMS.includes(entrada.estado) || !PRIORIDADES_CMS.includes(entrada.prioridad)) return { error: 'El tipo, estado o prioridad de la entrada no es válido.' }
  if (!entrada.nombre) return { error: 'La entrada necesita un nombre o referencia.' }
  if (entrada.fecha_propuesta && !fechaHoraCmsValida(entrada.fecha_propuesta)) return { error: 'La fecha propuesta no es válida.' }
  if (entrada.fecha_propuesta && !['actividad', 'evento'].includes(entrada.tipo)) return { error: 'Solo una actividad o un evento puede proponer una fecha.' }
  if (entrada.tipo === 'pedido' && !entrada.equipo_id) return { error: 'Elegí el equipo al que se dirige el pedido.' }
  if (entrada.tipo === 'pedido' && !entrada.equipo_solicitante_id) return { error: 'Elegí el equipo que realiza el pedido.' }
  if (entrada.tipo === 'propuesta' && (!entrada.equipo_id || !entrada.objetivo)) return { error: 'Una propuesta necesita objetivo y equipo destinatario.' }
  return { entrada }
}

export function cumplimientoEntradaCmsDesde(datos = {}) {
  const cumplimiento = {
    fecha: textoCms(datos.fecha, 10),
    medio: textoCms(datos.medio, 30),
    motivo: textoCms(datos.motivo, 1000),
  }
  if (!cumplimiento.fecha || !fechaCmsValida(cumplimiento.fecha)) return { error: 'Elegí la fecha en que se resolvió la respuesta.' }
  if (!MEDIOS_CUMPLIMIENTO_ENTRADA_CMS.includes(cumplimiento.medio)) return { error: 'Elegí cómo se resolvió la respuesta.' }
  if (cumplimiento.motivo.length < 10) return { error: 'Explicá brevemente por qué la respuesta quedó cumplida.' }
  return { cumplimiento }
}

export function reaperturaEntradaCmsDesde(datos = {}) {
  const motivo = textoCms(datos.motivo, 1000)
  if (motivo.length < 10) return { error: 'Explicá brevemente por qué se reabre la respuesta.' }
  return { motivo }
}

const TIPOS_CAMPO_FORMULARIO_CMS = ['texto', 'correo', 'numero', 'texto_largo', 'seleccion', 'seleccion_multiple', 'casilla', 'fecha']

export function camposFormularioCmsDesde(valor) {
  let filas = valor ?? []
  if (typeof filas === 'string') {
    try { filas = JSON.parse(filas || '[]') } catch { return { error: 'La configuración de campos no es válida.' } }
  }
  if (!Array.isArray(filas) || filas.length > 20) return { error: 'Un formulario puede tener hasta 20 campos configurables.' }
  const campos = []
  const claves = new Set()
  for (let indice = 0; indice < filas.length; indice += 1) {
    const fila = filas[indice] || {}
    const etiqueta = textoCms(fila.etiqueta, 120)
    const tipo = textoCms(fila.tipo, 30) || 'texto'
    const claveBase = textoCms(fila.clave, 80).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `campo_${indice + 1}`
    let clave = claveBase
    let sufijo = 2
    while (claves.has(clave)) { clave = `${claveBase}_${sufijo}`; sufijo += 1 }
    if (!etiqueta || !TIPOS_CAMPO_FORMULARIO_CMS.includes(tipo)) return { error: 'Cada campo necesita un título y un tipo válido.' }
    const opciones = Array.isArray(fila.opciones) ? fila.opciones.map((opcion) => textoCms(opcion, 100)).filter(Boolean).slice(0, 20) : []
    if (['seleccion', 'seleccion_multiple'].includes(tipo) && opciones.length < 2) return { error: `El campo “${etiqueta}” necesita al menos dos opciones.` }
    const condicionCampo = textoCms(fila.mostrar_si?.campo, 80)
    const mostrar_si = condicionCampo ? { campo: condicionCampo, valor: textoCms(fila.mostrar_si?.valor, 180) } : null
    if (mostrar_si && !claves.has(mostrar_si.campo)) return { error: `La condición de “${etiqueta}” debe depender de un campo anterior.` }
    claves.add(clave)
    campos.push({ clave, etiqueta, tipo, requerido: Boolean(fila.requerido), confirmar_correo: tipo === 'correo' && Boolean(fila.confirmar_correo), ayuda: textoCms(fila.ayuda, 240), opciones, mostrar_si })
  }
  return { campos }
}

export function formularioCmsDesde(datos, actual = {}) {
  const resultadoCampos = camposFormularioCmsDesde(datos.campos ?? datos.campos_json ?? actual.campos_json ?? [])
  if (resultadoCampos.error) return resultadoCampos
  const configuracionPublica = configuracionPublicaFormulario(datos.configuracion_publica ?? datos.configuracion_publica_json ?? actual.configuracion_publica_json ?? {})
  const formulario = {
    titulo: textoCms(datos.titulo ?? actual.titulo, 180),
    descripcion: textoCms(datos.descripcion ?? actual.descripcion),
    tipo: datos.tipo ?? actual.tipo ?? 'voluntariado',
    visibilidad: datos.visibilidad ?? actual.visibilidad ?? 'interna',
    estado: datos.estado ?? actual.estado ?? 'activa',
    equipo_id: datos.equipo_id ?? actual.equipo_id ?? null,
    unidad_id: datos.unidad_id ?? actual.unidad_id ?? null,
    equipo_solicitante_id: datos.equipo_solicitante_id ?? actual.equipo_solicitante_id ?? null,
    prioridad: datos.prioridad ?? actual.prioridad ?? 'normal',
    proyecto_id: datos.proyecto_id ?? actual.proyecto_id ?? null,
    finalidad: textoCms(datos.finalidad ?? actual.finalidad ?? 'Responder la consulta y realizar su seguimiento.', 500),
    responsable_datos: textoCms(datos.responsable_datos ?? actual.responsable_datos ?? 'Aletea', 180),
    conservacion_meses: Number(datos.conservacion_meses ?? actual.conservacion_meses ?? 12),
    requiere_consentimiento: Boolean(datos.requiere_consentimiento ?? actual.requiere_consentimiento ?? true),
    destino_respuesta: datos.destino_respuesta ?? actual.destino_respuesta ?? 'tarea',
    configuracion_publica: configuracionPublica,
    configuracion_publica_json: configuracionPublicaJson(configuracionPublica),
    campos: resultadoCampos.campos,
    campos_json: JSON.stringify(resultadoCampos.campos),
  }
  if (!formulario.titulo) return { error: 'El formulario necesita un título.' }
  if (!TIPOS_ENTRADA_CMS.includes(formulario.tipo) || !VISIBILIDADES_FORMULARIO_CMS.includes(formulario.visibilidad) || !ESTADOS_FORMULARIO_CMS.includes(formulario.estado) || !PRIORIDADES_CMS.includes(formulario.prioridad)) return { error: 'El tipo, la visibilidad, el estado o la prioridad del formulario no es válido.' }
  if (formulario.tipo === 'pedido' && !formulario.equipo_id) return { error: 'Elegí el equipo al que se dirige el pedido.' }
  if (formulario.tipo === 'pedido' && !formulario.equipo_solicitante_id) return { error: 'Elegí el equipo que realiza el pedido.' }
  if (formulario.tipo === 'propuesta' && !formulario.equipo_id) return { error: 'Elegí el equipo que evaluará la propuesta.' }
  if (![6, 12, 24].includes(formulario.conservacion_meses)) return { error: 'Elegí un plazo de conservación válido.' }
  if (!DESTINOS_RESPUESTA_CMS.includes(formulario.destino_respuesta)) return { error: 'Elegí un destino válido para las respuestas.' }
  if (formulario.visibilidad === 'publica' && (!formulario.finalidad || !formulario.responsable_datos)) return { error: 'Completá la finalidad y el responsable de los datos antes de publicar el formulario.' }
  return { formulario }
}

export function formulariosPruebaCms(equipos = {}) {
  const base = {
    visibilidad: 'publica', estado: 'activa', prioridad: 'normal', proyecto_id: null,
    conservacion_meses: 6, requiere_consentimiento: true, destino_respuesta: 'tarea',
  }
  const pedido = (equipo) => ({ tipo: 'pedido', equipo_id: equipo, equipo_solicitante_id: equipo, destino_respuesta: 'solicitud' })
  return [
    {
      id: 'prueba-orientacion-familias', ...base, ...pedido(equipos.familias),
      titulo: '[Prueba] Orientación para familias',
      descripcion: 'Recorrido real de prueba para verificar la recepción, derivación y seguimiento de una consulta familiar.',
      finalidad: 'Probar el circuito de orientación familiar con datos ficticios.', responsable_datos: 'Equipo de Familias',
      campos: [
        { clave: 'necesidad', etiqueta: '¿Qué necesitás en este momento?', tipo: 'seleccion', requerido: true, opciones: ['Orientación inicial', 'Encontrar una actividad', 'Conocer grupos de familias', 'Consultar por derechos o recursos', 'Otra necesidad'] },
        { clave: 'departamento', etiqueta: 'Departamento', tipo: 'seleccion', requerido: true, opciones: ['Montevideo', 'Canelones', 'Maldonado', 'Colonia', 'Otro departamento'] },
        { clave: 'contexto', etiqueta: 'Contanos brevemente el contexto', tipo: 'texto_largo', requerido: true, ayuda: 'Usá únicamente información ficticia.' },
      ],
    },
    {
      id: 'prueba-participar-actividad', ...base, tipo: 'actividad', equipo_id: equipos.deportes, equipo_solicitante_id: null,
      titulo: '[Prueba] Participar en una actividad',
      descripcion: 'Preinscripción real de prueba que queda pendiente de revisión antes de crear una actividad.',
      finalidad: 'Probar el circuito de preinscripción con datos ficticios.', responsable_datos: 'Equipo de Deportes', destino_respuesta: 'actividad',
      campos: [
        { clave: 'actividad', etiqueta: 'Actividad de interés', tipo: 'seleccion', requerido: true, opciones: ['Fútbol sin Barreras, grupo inicial', 'Encuentro virtual para familias', 'Taller de comunicación accesible', 'Movimiento y juego en comunidad'] },
        { clave: 'consulta', etiqueta: '¿Qué querés hacer?', tipo: 'seleccion', requerido: true, opciones: ['Preinscribirme', 'Sumarme a la lista de espera'] },
        { clave: 'edad', etiqueta: 'Rango de edad de quien participaría', tipo: 'seleccion', requerido: true, opciones: ['Hasta 6 años', 'De 7 a 12 años', 'De 13 a 17 años', '18 años o más'] },
        { clave: 'apoyos', etiqueta: '¿Hay algún apoyo que debamos prever?', tipo: 'texto_largo', requerido: false, ayuda: 'Usá una situación inventada.' },
      ],
    },
    {
      id: 'prueba-consulta-formacion', ...base, ...pedido(equipos.capacitaciones),
      titulo: '[Prueba] Consultar por formación',
      descripcion: 'Consulta real de prueba para verificar su llegada al equipo de Capacitaciones.',
      finalidad: 'Probar el circuito de consultas de formación con datos ficticios.', responsable_datos: 'Equipo de Capacitaciones',
      campos: [
        { clave: 'perfil', etiqueta: 'Consultás como', tipo: 'seleccion', requerido: true, opciones: ['Persona', 'Familia', 'Institución'] },
        { clave: 'tema', etiqueta: 'Tema de interés', tipo: 'seleccion', requerido: true, opciones: ['Introducción a la neurodiversidad', 'Prácticas inclusivas para equipos', 'Herramientas para acompañantes', 'Otra necesidad de formación'] },
        { clave: 'modalidad', etiqueta: 'Modalidad preferida', tipo: 'seleccion', requerido: true, opciones: ['Presencial', 'Virtual', 'Híbrida', 'Sin preferencia'] },
      ],
    },
    {
      id: 'prueba-voluntariado', ...base, tipo: 'voluntariado', equipo_id: equipos.administracion, equipo_solicitante_id: null,
      titulo: '[Prueba] Sumarte como voluntario',
      descripcion: 'Primer contacto real de prueba para verificar la bandeja y la tarea de seguimiento.',
      finalidad: 'Probar el circuito de voluntariado con datos ficticios.', responsable_datos: 'Administración',
      campos: [
        { clave: 'interes', etiqueta: '¿Dónde te gustaría colaborar?', tipo: 'seleccion', requerido: true, opciones: ['Actividades con familias', 'Deporte y recreación', 'Comunicación', 'Apoyo en eventos', 'Todavía no lo sé'] },
        { clave: 'disponibilidad', etiqueta: 'Disponibilidad aproximada', tipo: 'seleccion', requerido: true, opciones: ['Una vez por semana', 'Una vez por mes', 'Actividades puntuales', 'A coordinar'] },
        { clave: 'motivacion', etiqueta: '¿Qué te gustaría aportar o aprender?', tipo: 'texto_largo', requerido: true },
      ],
    },
    {
      id: 'prueba-consulta-tienda', ...base, ...pedido(equipos.administracion),
      titulo: '[Prueba] Consultar por un producto',
      descripcion: 'Consulta real de prueba sobre disponibilidad, reserva o reposición, sin procesar pagos.',
      finalidad: 'Probar el circuito de consultas de tienda con datos ficticios.', responsable_datos: 'Administración',
      campos: [
        { clave: 'producto', etiqueta: 'Producto', tipo: 'seleccion', requerido: true, opciones: ['Remera Aletea', 'Bolsa de tela Aletea', 'Cuaderno de apoyos visuales'] },
        { clave: 'consulta', etiqueta: '¿Qué querés hacer?', tipo: 'seleccion', requerido: true, opciones: ['Consultar disponibilidad', 'Reservar', 'Recibir aviso de reposición'] },
        { clave: 'detalle', etiqueta: 'Talle, cantidad u otra aclaración', tipo: 'texto_largo', requerido: false },
      ],
    },
  ]
}

export async function asegurarFormularioPruebaCms(base, id) {
  const idsPrueba = new Set(['prueba-orientacion-familias', 'prueba-participar-actividad', 'prueba-consulta-formacion', 'prueba-voluntariado', 'prueba-consulta-tienda'])
  if (!idsPrueba.has(id)) return false
  const [filasEquipos, filasUsuarios] = await Promise.all([
    base.prepare("SELECT id, clave FROM equipos WHERE activo = 1 AND clave IN ('familias', 'deportes', 'capacitaciones', 'administracion')").all(),
    base.prepare('SELECT correo, perfil_acceso FROM usuarios WHERE activo = 1 ORDER BY creado_en').all(),
  ])
  const equipos = Object.fromEntries((filasEquipos.results || []).map((equipo) => [equipo.clave, equipo.id]))
  const usuarios = filasUsuarios.results || []
  const creador = usuarios.find((usuario) => usuario.perfil_acceso === 'administracion') || usuarios[0]
  if (['familias', 'deportes', 'capacitaciones', 'administracion'].some((clave) => !equipos[clave]) || !creador?.correo) return false
  const plantilla = formulariosPruebaCms(equipos).find((formulario) => formulario.id === id)
  if (!plantilla) return false
  const resultado = formularioCmsDesde(plantilla)
  if (resultado.error) return false
  const formulario = resultado.formulario
  await base.prepare(`UPDATE formularios_cms SET
    titulo = ?2, descripcion = ?3, tipo = ?4, visibilidad = ?5, estado = ?6, equipo_id = ?7, equipo_solicitante_id = ?8,
    prioridad = ?9, proyecto_id = ?10, campos_json = ?11, finalidad = ?12, responsable_datos = ?13, conservacion_meses = ?14,
    requiere_consentimiento = ?15, destino_respuesta = ?16, configuracion_publica_json = ?17, actualizado_en = CURRENT_TIMESTAMP
    WHERE id = ?1`)
    .bind(plantilla.id, formulario.titulo, formulario.descripcion, formulario.tipo, formulario.visibilidad, formulario.estado,
      formulario.equipo_id, formulario.equipo_solicitante_id, formulario.prioridad, formulario.proyecto_id, formulario.campos_json,
      formulario.finalidad, formulario.responsable_datos, formulario.conservacion_meses, formulario.requiere_consentimiento ? 1 : 0,
      formulario.destino_respuesta, formulario.configuracion_publica_json).run()
  const existente = await base.prepare('SELECT id FROM formularios_cms WHERE id = ?1').bind(plantilla.id).first()
  if (existente) return true
  await base.prepare(`INSERT INTO formularios_cms
    (id, titulo, descripcion, tipo, visibilidad, estado, equipo_id, equipo_solicitante_id, prioridad, proyecto_id, campos_json,
      finalidad, responsable_datos, conservacion_meses, requiere_consentimiento, destino_respuesta, configuracion_publica_json, creado_por)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)`)
    .bind(plantilla.id, formulario.titulo, formulario.descripcion, formulario.tipo, formulario.visibilidad, formulario.estado,
      formulario.equipo_id, formulario.equipo_solicitante_id, formulario.prioridad, formulario.proyecto_id, formulario.campos_json,
      formulario.finalidad, formulario.responsable_datos, formulario.conservacion_meses, formulario.requiere_consentimiento ? 1 : 0,
      formulario.destino_respuesta, formulario.configuracion_publica_json, creador.correo).run()
  return true
}

export function respuestaFormularioCmsDesde(datos, formulario) {
  if (textoCms(datos.empresa, 180)) return { error: 'No se pudo enviar la respuesta.' }
  const configuracion = configuracionPublicaFormulario(formulario?.configuracion_publica_json ?? formulario?.configuracion_publica ?? {})
  const nombreRecibido = campoBaseVisible(configuracion.nombre) ? textoCms(datos.nombre, 180) : ''
  const contactoRecibido = campoBaseVisible(configuracion.contacto) ? textoCms(datos.contacto, 180) : ''
  const detalleRecibido = campoBaseVisible(configuracion.detalle) ? textoCms(datos.detalle, 4000) : ''
  if (campoBaseRequerido(configuracion.nombre) && !nombreRecibido) return { error: 'Completá tu nombre o referencia.' }
  if (campoBaseRequerido(configuracion.contacto) && !contactoRecibido) return { error: 'Dejá un medio de contacto para poder responderte.' }
  if (configuracion.contacto_tipo === 'correo' && contactoRecibido && !correoFormularioValido(contactoRecibido)) return { error: 'Ingresá un correo electrónico válido.' }
  if (configuracion.confirmar_contacto && contactoRecibido.toLocaleLowerCase('es') !== textoCms(datos.contacto_confirmacion, 180).toLocaleLowerCase('es')) return { error: 'Los correos electrónicos no coinciden.' }
  if (campoBaseRequerido(configuracion.detalle) && !detalleRecibido) return { error: 'Completá el mensaje o contexto.' }
  const resultado = entradaCmsDesde({
    tipo: formulario.tipo, nombre: nombreRecibido || 'Respuesta sin nombre', contacto: contactoRecibido,
    detalle: detalleRecibido, fecha_propuesta: datos.fecha_propuesta, equipo_id: formulario.equipo_id, equipo_solicitante_id: formulario.equipo_solicitante_id,
    prioridad: formulario.prioridad, proyecto_id: formulario.proyecto_id, objetivo: datos.objetivo, pasos: datos.pasos, recursos: datos.recursos, personas_necesarias: datos.personas_necesarias,
  })
  if (resultado.error) return resultado
  const resultadoCampos = camposFormularioCmsDesde(formulario.campos ?? formulario.campos_json ?? [])
  if (resultadoCampos.error) return resultadoCampos
  const recibidas = datos.respuestas && typeof datos.respuestas === 'object' && !Array.isArray(datos.respuestas) ? datos.respuestas : {}
  const confirmacionesCorreo = datos.confirmaciones_correo && typeof datos.confirmaciones_correo === 'object' && !Array.isArray(datos.confirmaciones_correo) ? datos.confirmaciones_correo : {}
  const respuestas = {}
  for (const campo of resultadoCampos.campos) {
    const anterior = respuestas[campo.mostrar_si?.campo]
    const visible = !campo.mostrar_si || (Array.isArray(anterior) ? anterior.includes(campo.mostrar_si.valor) : String(anterior ?? '') === campo.mostrar_si.valor)
    if (!visible) continue
    const original = recibidas[campo.clave]
    if (campo.tipo === 'casilla') {
      const valor = original === true || original === 'true' || original === '1' || original === 'on'
      if (campo.requerido && !valor) return { error: `Completá “${campo.etiqueta}”.` }
      respuestas[campo.clave] = valor
      continue
    }
    if (campo.tipo === 'seleccion_multiple') {
      const valores = Array.isArray(original) ? original.map((valor) => textoCms(valor, 100)).filter(Boolean) : []
      if (campo.requerido && !valores.length) return { error: `Completá “${campo.etiqueta}”.` }
      if (valores.some((valor) => !campo.opciones.includes(valor))) return { error: `La respuesta de “${campo.etiqueta}” no es válida.` }
      respuestas[campo.clave] = [...new Set(valores)].slice(0, campo.opciones.length)
      continue
    }
    const valor = textoCms(original, campo.tipo === 'texto_largo' ? 4000 : 500)
    if (campo.requerido && !valor) return { error: `Completá “${campo.etiqueta}”.` }
    if (campo.tipo === 'seleccion' && valor && !campo.opciones.includes(valor)) return { error: `La respuesta de “${campo.etiqueta}” no es válida.` }
    if (campo.tipo === 'fecha' && valor && !fechaCmsValida(valor)) return { error: `La fecha de “${campo.etiqueta}” no es válida.` }
    if (campo.tipo === 'correo' && valor && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) return { error: `El correo de “${campo.etiqueta}” no es válido.` }
    if (campo.tipo === 'correo' && campo.confirmar_correo && valor.toLocaleLowerCase('es') !== textoCms(confirmacionesCorreo[campo.clave], 500).toLocaleLowerCase('es')) return { error: `Los correos de “${campo.etiqueta}” no coinciden.` }
    if (campo.tipo === 'numero' && valor && !/^-?\d+(?:[.,]\d+)?$/.test(valor)) return { error: `El número de “${campo.etiqueta}” no es válido.` }
    respuestas[campo.clave] = valor
  }
  resultado.entrada.respuestas = respuestas
  resultado.entrada.respuestas_json = JSON.stringify(respuestas)
  resultado.entrada.destino_respuesta = formulario.destino_respuesta || 'tarea'
  return resultado
}

export function consentimientoFormularioPublicoValido(datos, formulario) {
  return !Boolean(formulario?.requiere_consentimiento) || datos?.consentimiento_privacidad === true
}

export function compromisoFormularioPublicoValido(datos, formulario) {
  const configuracion = configuracionPublicaFormulario(formulario?.configuracion_publica_json ?? formulario?.configuracion_publica ?? {})
  return !configuracion.requiere_compromiso || datos?.compromiso_confidencialidad === true
}

export function auditoriaAcuerdosFormularioDesde(datos, formulario, fecha = instanteUtcSql()) {
  if (!consentimientoFormularioPublicoValido(datos, formulario)) return { error: 'Confirmá que la persona leyó cómo se usarán sus datos.' }
  if (!compromisoFormularioPublicoValido(datos, formulario)) return { error: 'Confirmá que la persona aceptó el acuerdo requerido.' }
  const configuracion = configuracionPublicaFormulario(formulario?.configuracion_publica_json ?? formulario?.configuracion_publica ?? {})
  return {
    respuestas: {
      _consentimiento_privacidad: Boolean(formulario?.requiere_consentimiento) ? 'Aceptado' : 'No requerido',
      _consentimiento_privacidad_version: Boolean(formulario?.requiere_consentimiento) ? configuracion.privacidad_version : '',
      _consentimiento_privacidad_fecha: Boolean(formulario?.requiere_consentimiento) ? fecha : '',
      _compromiso_confidencialidad: configuracion.requiere_compromiso ? 'Aceptado' : 'No requerido',
      _compromiso_confidencialidad_version: configuracion.requiere_compromiso ? configuracion.compromiso_version : '',
      _compromiso_confidencialidad_fecha: configuracion.requiere_compromiso ? fecha : '',
    },
  }
}

export function responsabilidadCmsDesde(datos) {
  const responsabilidad = {
    equipo_id: textoCms(datos.equipo_id, 100),
    usuario_correo: textoCms(datos.usuario_correo, 120).toLowerCase(),
    tipo: textoCms(datos.tipo, 40),
    puede_decidir: textoCms(datos.puede_decidir, 400),
    debe_escalar: textoCms(datos.debe_escalar, 400),
  }
  if (!responsabilidad.equipo_id || !responsabilidad.usuario_correo) return { error: 'Elegí un equipo y una persona responsable.' }
  if (!TIPOS_RESPONSABILIDAD_CMS.includes(responsabilidad.tipo)) return { error: 'El tipo de responsabilidad no es válido.' }
  return { responsabilidad }
}

export function fechaHoraCmsValida(fecha) {
  const texto = String(fecha ?? '')
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(texto)) return false
  const [fechaISO, hora] = texto.split('T')
  const [horas, minutos] = hora.split(':').map(Number)
  return fechaCmsValida(fechaISO) && horas >= 0 && horas <= 23 && minutos >= 0 && minutos <= 59
}

export function revisionSemanalCmsDesde(datos) {
  const revision = {
    semana_inicio: textoCms(datos.semana_inicio, 10),
    nota: textoCms(datos.nota, 1200),
  }
  if (!fechaCmsValida(revision.semana_inicio)) return { error: 'La fecha de la revisión no es válida.' }
  const dia = new Date(`${revision.semana_inicio}T12:00:00Z`).getUTCDay()
  if (dia !== 1) return { error: 'La revisión semanal debe comenzar un lunes.' }
  return { revision }
}

export function reunionCmsDesde(datos, actual = {}) {
  const reunion = {
    titulo: textoCms(datos.titulo ?? actual.titulo, 180),
    objetivo: textoCms(datos.objetivo ?? actual.objetivo),
    equipo_id: datos.equipo_id ?? actual.equipo_id ?? null,
    unidad_id: datos.unidad_id ?? actual.unidad_id ?? null,
    proyecto_id: datos.proyecto_id ?? actual.proyecto_id ?? null,
    fecha_hora: datos.fecha_hora ?? actual.fecha_hora ?? '',
    lugar: textoCms(datos.lugar ?? actual.lugar, 180),
    estado: datos.estado ?? actual.estado ?? 'planificada',
    preparacion: textoCms(datos.preparacion ?? actual.preparacion),
    proxima_revision: textoCms(datos.proxima_revision ?? actual.proxima_revision, 10) || null,
    minuta: textoCms(datos.minuta ?? actual.minuta),
    resumen: textoCms(datos.resumen ?? actual.resumen),
  }
  if (!reunion.titulo) return { error: 'La reunión necesita un título.' }
  if (!fechaHoraCmsValida(reunion.fecha_hora) || !ESTADOS_REUNION_CMS.includes(reunion.estado)) return { error: 'La fecha, hora o estado de la reunión no es válido.' }
  if (reunion.proxima_revision && !fechaCmsValida(reunion.proxima_revision)) return { error: 'La fecha de seguimiento debe ser válida.' }
  return { reunion }
}

export function decisionCmsDesde(datos, actual = {}) {
  const decision = {
    titulo: textoCms(datos.titulo ?? actual.titulo, 180),
    motivo: textoCms(datos.motivo ?? actual.motivo),
    responsable_correo: datos.responsable_correo ?? actual.responsable_correo ?? null,
    estado: datos.estado ?? actual.estado ?? 'vigente',
  }
  if (!decision.titulo) return { error: 'La decisión necesita un título.' }
  if (!ESTADOS_DECISION_CMS.includes(decision.estado)) return { error: 'El estado de la decisión no es válido.' }
  return { decision }
}

export function cierreReunionCmsDesde(datos) {
  const cierre = {
    minuta: textoCms(datos.minuta),
    resumen: textoCms(datos.resumen, 1200),
    proxima_revision: textoCms(datos.proxima_revision, 10) || null,
    acuerdos: Array.isArray(datos.acuerdos) ? datos.acuerdos.slice(0, 20) : [],
  }
  if (!cierre.minuta || !cierre.resumen) return { error: 'Completá la minuta y el resumen antes de cerrar la reunión.' }
  if (cierre.proxima_revision && !fechaCmsValida(cierre.proxima_revision)) return { error: 'La próxima revisión debe tener una fecha válida.' }
  const acuerdos = []
  for (const fila of cierre.acuerdos) {
    const decision = decisionCmsDesde(fila)
    if (decision.error) return decision
    const fecha_limite = textoCms(fila.fecha_limite, 10) || null
    if (fecha_limite && !fechaCmsValida(fecha_limite)) return { error: `La fecha de “${decision.decision.titulo}” no es válida.` }
    acuerdos.push({ ...decision.decision, crear_tarea: Boolean(fila.crear_tarea), fecha_limite })
  }
  return { cierre: { ...cierre, acuerdos } }
}

export function eventoCmsDesde(datos, actual = {}) {
  const evento = {
    titulo: textoCms(datos.titulo ?? actual.titulo, 180),
    descripcion: textoCms(datos.descripcion ?? actual.descripcion),
    fecha_hora: datos.fecha_hora ?? actual.fecha_hora ?? '',
    fecha_fin: datos.fecha_fin ?? actual.fecha_fin ?? null,
    lugar: textoCms(datos.lugar ?? actual.lugar, 180),
    equipo_id: datos.equipo_id ?? actual.equipo_id ?? null,
    unidad_id: datos.unidad_id ?? actual.unidad_id ?? null,
    proyecto_id: datos.proyecto_id ?? actual.proyecto_id ?? null,
    responsable_correo: datos.responsable_correo ?? actual.responsable_correo ?? null,
    estado: datos.estado ?? actual.estado ?? 'planificado',
    tipo: datos.tipo ?? actual.tipo ?? 'actividad',
  }
  if (!evento.titulo) return { error: 'La actividad necesita un título.' }
  if (!fechaHoraCmsValida(evento.fecha_hora) || (evento.fecha_fin && !fechaHoraCmsValida(evento.fecha_fin))) return { error: 'Ingresá una fecha y hora válidas.' }
  if (evento.fecha_fin && evento.fecha_fin < evento.fecha_hora) return { error: 'La finalización no puede ser anterior al inicio.' }
  if (!ESTADOS_EVENTO_CMS.includes(evento.estado) || !TIPOS_EVENTO_CMS.includes(evento.tipo)) return { error: 'El tipo o el estado de la actividad no es válido.' }
  return { evento }
}

function siguienteFechaEventoCms(fecha, frecuencia, reglaMensual = {}) {
  const [anio, mes, dia] = String(fecha).split('-').map(Number)
  if (frecuencia === 'semanal' || frecuencia === 'quincenal') {
    const salto = frecuencia === 'quincenal' ? 14 : 7
    return new Date(Date.UTC(anio, mes - 1, dia + salto)).toISOString().slice(0, 10)
  }
  const siguienteMes = mes === 12 ? 1 : mes + 1
  const siguienteAnio = mes === 12 ? anio + 1 : anio
  const ultimoDia = new Date(Date.UTC(siguienteAnio, siguienteMes, 0)).getUTCDate()
  let diaSiguiente = Math.min(reglaMensual.dia ?? dia, ultimoDia)
  if (frecuencia === 'mensual_ordinal') {
    const primerDiaSemana = new Date(Date.UTC(siguienteAnio, siguienteMes - 1, 1)).getUTCDay()
    diaSiguiente = 1 + ((reglaMensual.diaSemana - primerDiaSemana + 7) % 7) + ((reglaMensual.ordinal - 1) * 7)
    if (diaSiguiente > ultimoDia) diaSiguiente -= 7
  }
  return `${siguienteAnio}-${String(siguienteMes).padStart(2, '0')}-${String(diaSiguiente).padStart(2, '0')}`
}

function minutosEntreFechasCms(inicio, fin) {
  if (!fin) return null
  return (Date.parse(`${fin}:00Z`) - Date.parse(`${inicio}:00Z`)) / 60000
}

function sumarMinutosCms(fechaHora, minutos) {
  if (minutos === null) return null
  return new Date(Date.parse(`${fechaHora}:00Z`) + (minutos * 60000)).toISOString().slice(0, 16)
}

export function eventosRecurrentesCmsDesde(datos) {
  const resultado = eventoCmsDesde(datos)
  if (resultado.error) return resultado
  const frecuencia = datos.frecuencia_evento ?? ''
  const repetirHasta = datos.repetir_hasta ?? ''
  if (!FRECUENCIAS_EVENTO_RECURRENTE_CMS.includes(frecuencia) || !fechaCmsValida(repetirHasta)) return { error: 'Elegí una frecuencia y una fecha final válidas.' }
  const fechaInicial = resultado.evento.fecha_hora.slice(0, 10)
  if (repetirHasta < fechaInicial) return { error: 'La repetición no puede terminar antes de la primera actividad.' }
  const dias = (Date.parse(`${repetirHasta}T00:00:00Z`) - Date.parse(`${fechaInicial}T00:00:00Z`)) / 86400000
  if (dias > 370) return { error: 'Podés planificar hasta un año por vez.' }
  const duracion = minutosEntreFechasCms(resultado.evento.fecha_hora, resultado.evento.fecha_fin)
  if (duracion !== null && duracion > 1440) return { error: 'En una actividad recurrente, la finalización debe ocurrir dentro de las 24 horas siguientes. La fecha hasta la que se repite se elige por separado.' }
  const hora = resultado.evento.fecha_hora.slice(10)
  const diaMensual = Number(fechaInicial.slice(8, 10))
  const reglaMensual = { dia: diaMensual, diaSemana: new Date(`${fechaInicial}T00:00:00Z`).getUTCDay(), ordinal: Math.ceil(diaMensual / 7) }
  const serieId = crypto.randomUUID()
  const eventos = []
  let fecha = fechaInicial
  while (fecha <= repetirHasta && eventos.length < 60) {
    const fechaHora = `${fecha}${hora}`
    eventos.push({ ...resultado.evento, fecha_hora: fechaHora, fecha_fin: sumarMinutosCms(fechaHora, duracion), serie_id: serieId, generada_para: fecha })
    fecha = siguienteFechaEventoCms(fecha, frecuencia, reglaMensual)
  }
  return { eventos, frecuencia, repetir_hasta: repetirHasta }
}

export function reunionesRecurrentesCmsDesde(datos) {
  const resultado = reunionCmsDesde(datos)
  if (resultado.error) return resultado
  const frecuencia = datos.frecuencia_reunion ?? ''
  const repetirHasta = datos.repetir_hasta ?? ''
  if (!FRECUENCIAS_EVENTO_RECURRENTE_CMS.includes(frecuencia) || !fechaCmsValida(repetirHasta)) return { error: 'Elegí una frecuencia y una fecha final válidas.' }
  const fechaInicial = resultado.reunion.fecha_hora.slice(0, 10)
  if (repetirHasta < fechaInicial) return { error: 'La repetición no puede terminar antes de la primera reunión.' }
  const dias = (Date.parse(`${repetirHasta}T00:00:00Z`) - Date.parse(`${fechaInicial}T00:00:00Z`)) / 86400000
  if (dias > 370) return { error: 'Podés planificar hasta un año por vez.' }
  const hora = resultado.reunion.fecha_hora.slice(10)
  const diaMensual = Number(fechaInicial.slice(8, 10))
  const reglaMensual = { dia: diaMensual, diaSemana: new Date(`${fechaInicial}T00:00:00Z`).getUTCDay(), ordinal: Math.ceil(diaMensual / 7) }
  const serieId = crypto.randomUUID()
  const reuniones = []
  let fecha = fechaInicial
  while (fecha <= repetirHasta && reuniones.length < 60) {
    reuniones.push({ ...resultado.reunion, fecha_hora: `${fecha}${hora}`, serie_id: serieId, generada_para: fecha })
    fecha = siguienteFechaEventoCms(fecha, frecuencia, reglaMensual)
  }
  return { reuniones, frecuencia, repetir_hasta: repetirHasta }
}

export function plantillaTareasCmsDesde(datos) {
  const tareas = Array.isArray(datos.tareas) ? datos.tareas.map((item, orden) => ({
    titulo: textoCms(item?.titulo, 180),
    descripcion: textoCms(item?.descripcion),
    prioridad: item?.prioridad ?? 'normal',
    dias_antes: Number(item?.dias_antes ?? 0),
    orden,
  })) : []
  const plantilla = {
    titulo: textoCms(datos.titulo, 180),
    descripcion: textoCms(datos.descripcion),
    equipo_id: datos.equipo_id ?? null,
    tareas,
  }
  if (!plantilla.titulo || tareas.length < 1 || tareas.length > 12) return { error: 'La checklist necesita un nombre y entre 1 y 12 tareas.' }
  if (tareas.some((item) => !item.titulo || !PRIORIDADES_CMS.includes(item.prioridad) || !Number.isInteger(item.dias_antes) || item.dias_antes < -365 || item.dias_antes > 365)) return { error: 'Cada tarea necesita título, prioridad y entre 365 días antes y 365 días después de la actividad.' }
  return { plantilla }
}

function instanteCms(fechaHora) {
  const instante = Date.parse(String(fechaHora || ''))
  return Number.isFinite(instante) ? instante : null
}

function finAgendaCms(evento) {
  const inicio = instanteCms(evento?.fecha_hora)
  const fin = instanteCms(evento?.fecha_fin)
  if (inicio === null || fin === null) return null
  if (evento?.serie_id && fin - inicio > 86400000) return null
  return fin
}

export function conflictoAgendaCms(primero, segundo) {
  if (!primero || !segundo || primero.id === segundo.id || primero.estado !== 'planificado' || segundo.estado !== 'planificado') return null
  if (primero.serie_id && segundo.serie_id && primero.serie_id === segundo.serie_id) return null
  const inicioPrimero = instanteCms(primero.fecha_hora)
  const inicioSegundo = instanteCms(segundo.fecha_hora)
  if (inicioPrimero === null || inicioSegundo === null) return null
  const finPrimero = finAgendaCms(primero)
  const finSegundo = finAgendaCms(segundo)
  const seSuperponen = inicioPrimero === inicioSegundo
    || (finPrimero !== null && inicioSegundo >= inicioPrimero && inicioSegundo < finPrimero)
    || (finSegundo !== null && inicioPrimero >= inicioSegundo && inicioPrimero < finSegundo)
  if (!seSuperponen) return null
  const mismoLugar = String(primero.lugar || '').trim() && String(primero.lugar || '').trim().toLocaleLowerCase('es-UY') === String(segundo.lugar || '').trim().toLocaleLowerCase('es-UY')
  const mismoResponsable = primero.responsable_correo && primero.responsable_correo === segundo.responsable_correo
  const mismoEquipo = primero.equipo_id && primero.equipo_id === segundo.equipo_id
  const motivos = [mismoLugar ? 'Mismo lugar' : '', mismoResponsable ? 'Mismo responsable' : '', mismoEquipo ? 'Mismo equipo' : ''].filter(Boolean)
  if (!motivos.length) return null
  return {
    evento_a_id: primero.id,
    evento_a_titulo: primero.titulo,
    evento_a_fecha_hora: primero.fecha_hora,
    evento_b_id: segundo.id,
    evento_b_titulo: segundo.titulo,
    evento_b_fecha_hora: segundo.fecha_hora,
    motivos,
  }
}

function ocurrenciasAgendaCmsUnicas(eventos) {
  const unicas = new Map()
  for (const evento of eventos) {
    const fechaSerie = String(evento.fecha_hora || '').slice(0, 10) || evento.generada_para
    const clave = evento.serie_id ? `serie:${evento.serie_id}:${fechaSerie}` : `evento:${evento.id}`
    const existente = unicas.get(clave)
    if (existente) {
      existente.registros_agrupados += 1
      continue
    }
    unicas.set(clave, { ...evento, registros_agrupados: 1 })
  }
  return [...unicas.values()]
}

export function conflictosAgendaCms(eventos) {
  const ocurrencias = ocurrenciasAgendaCmsUnicas(eventos)
  const conflictos = []
  for (let indice = 0; indice < ocurrencias.length; indice += 1) {
    for (let comparado = indice + 1; comparado < ocurrencias.length; comparado += 1) {
      const conflicto = conflictoAgendaCms(ocurrencias[indice], ocurrencias[comparado])
      if (conflicto) conflictos.push(conflicto)
    }
  }
  return conflictos
}

export function gruposConflictosAgendaCms(eventos) {
  const ocurrencias = ocurrenciasAgendaCmsUnicas(eventos)
  const conflictos = conflictosAgendaCms(ocurrencias)
  const eventosPorId = new Map(ocurrencias.map((evento) => [evento.id, evento]))
  const conexiones = new Map()
  for (const conflicto of conflictos) {
    if (!conexiones.has(conflicto.evento_a_id)) conexiones.set(conflicto.evento_a_id, new Set())
    if (!conexiones.has(conflicto.evento_b_id)) conexiones.set(conflicto.evento_b_id, new Set())
    conexiones.get(conflicto.evento_a_id).add(conflicto.evento_b_id)
    conexiones.get(conflicto.evento_b_id).add(conflicto.evento_a_id)
  }
  const visitados = new Set()
  const grupos = []
  for (const inicio of conexiones.keys()) {
    if (visitados.has(inicio)) continue
    const pendientes = [inicio]
    const ids = new Set()
    while (pendientes.length) {
      const id = pendientes.pop()
      if (visitados.has(id)) continue
      visitados.add(id)
      ids.add(id)
      for (const vecino of conexiones.get(id) || []) if (!visitados.has(vecino)) pendientes.push(vecino)
    }
    const componentes = [...ids].map((id) => eventosPorId.get(id)).filter(Boolean)
      .sort((a, b) => String(a.fecha_hora).localeCompare(String(b.fecha_hora)) || String(a.titulo).localeCompare(String(b.titulo), 'es'))
    const motivos = new Set(conflictos.filter((conflicto) => ids.has(conflicto.evento_a_id) && ids.has(conflicto.evento_b_id)).flatMap((conflicto) => conflicto.motivos))
    grupos.push({
      fecha_hora: componentes[0]?.fecha_hora || '',
      eventos: componentes.map((evento) => ({ id: evento.id, titulo: evento.titulo, serie_id: evento.serie_id || null, registros_agrupados: evento.registros_agrupados || 1 })),
      motivos: [...motivos],
      cantidad: componentes.length,
    })
  }
  return grupos.sort((a, b) => String(a.fecha_hora).localeCompare(String(b.fecha_hora)))
}

function fechaDePreparacion(fechaHora, diasAntes) {
  const fecha = new Date(`${String(fechaHora).slice(0, 10)}T12:00:00Z`)
  fecha.setUTCDate(fecha.getUTCDate() - diasAntes)
  return fecha.toISOString().slice(0, 10)
}

export async function referenciasCmsValidas(base, { equipo_id, equipo_solicitante_id, unidad_id, proyecto_id, programa_id, responsable_correo, solicitante_correo, evento_id }) {
  const consultas = []
  if (equipo_id) consultas.push(base.prepare('SELECT id FROM equipos WHERE id = ?1 AND activo = 1').bind(equipo_id).first().then((fila) => fila ? null : 'equipo'))
  if (equipo_solicitante_id) consultas.push(base.prepare('SELECT id FROM equipos WHERE id = ?1 AND activo = 1').bind(equipo_solicitante_id).first().then((fila) => fila ? null : 'equipo solicitante'))
  if (unidad_id) consultas.push((equipo_id
    ? base.prepare(`SELECT u.id FROM unidades_operativas_cms u WHERE u.id = ?1 AND u.estado != 'archivada'
        AND (u.equipo_id = ?2 OR EXISTS (SELECT 1 FROM unidades_vistas_equipo_cms v WHERE v.unidad_id = u.id AND v.equipo_id = ?2))`).bind(unidad_id, equipo_id)
    : base.prepare("SELECT id FROM unidades_operativas_cms WHERE id = ?1 AND estado != 'archivada'").bind(unidad_id))
    .first().then((fila) => fila ? null : 'unidad'))
  if (proyecto_id) {
    const consultaProyecto = unidad_id
      ? base.prepare("SELECT id FROM proyectos_cms WHERE id = ?1 AND unidad_id = ?2 AND estado != 'cerrado'").bind(proyecto_id, unidad_id)
      : equipo_id
        ? base.prepare("SELECT id FROM proyectos_cms WHERE id = ?1 AND equipo_id = ?2 AND estado != 'cerrado'").bind(proyecto_id, equipo_id)
        : base.prepare("SELECT id FROM proyectos_cms WHERE id = ?1 AND estado != 'cerrado'").bind(proyecto_id)
    consultas.push(consultaProyecto.first().then((fila) => fila ? null : 'proyecto-contexto'))
  }
  if (programa_id) consultas.push(base.prepare("SELECT id FROM programas_cms WHERE id = ?1 AND estado != 'cerrado'").bind(programa_id).first().then((fila) => fila ? null : 'programa'))
  if (responsable_correo) consultas.push(base.prepare('SELECT correo FROM usuarios WHERE correo = ?1 AND activo = 1').bind(responsable_correo).first().then((fila) => fila ? null : 'responsable'))
  if (solicitante_correo) consultas.push(base.prepare('SELECT correo FROM usuarios WHERE correo = ?1 AND activo = 1').bind(solicitante_correo).first().then((fila) => fila ? null : 'solicitante'))
  if (evento_id) consultas.push(base.prepare("SELECT id FROM eventos_cms WHERE id = ?1 AND estado != 'cancelado'").bind(evento_id).first().then((fila) => fila ? null : 'actividad'))
  const invalida = (await Promise.all(consultas)).find(Boolean)
  if (invalida === 'proyecto-contexto') return 'El proyecto seleccionado no pertenece al equipo o a la unidad elegidos.'
  return invalida ? `El ${invalida} seleccionado ya no está disponible.` : null
}

async function responsableAutomaticoDeSolicitud(base, equipoId) {
  if (!equipoId) return null
  const filas = await base.prepare(`SELECT r.equipo_id, r.usuario_correo, r.tipo, r.activo
    FROM responsabilidades_equipo r
    JOIN usuarios u ON u.correo = r.usuario_correo
    WHERE r.equipo_id = ?1 AND r.activo = 1 AND u.activo = 1
      AND r.tipo IN ('coordinacion', 'referente', 'sustitucion', 'integrante')`).bind(equipoId).all()
  return responsableSolicitudDe(filas.results, equipoId)
}

async function dependenciasPendientesDe(base, tareaId) {
  const filas = await base.prepare(`SELECT p.id, p.titulo, p.descripcion FROM tareas_dependencias_cms d
    JOIN tareas_cms p ON p.id = d.depende_de_id
    WHERE d.tarea_id = ?1 AND p.estado NOT IN ('completada', 'cancelada')
    ORDER BY p.actualizado_en DESC`).bind(tareaId).all()
  return filas.results
}

async function creariaCicloDeDependencia(base, tareaId, dependeDeId) {
  const fila = await base.prepare(`WITH RECURSIVE cadena(id) AS (
    SELECT depende_de_id FROM tareas_dependencias_cms WHERE tarea_id = ?1
    UNION
    SELECT d.depende_de_id FROM tareas_dependencias_cms d JOIN cadena c ON d.tarea_id = c.id
  ) SELECT id FROM cadena WHERE id = ?2 LIMIT 1`).bind(dependeDeId, tareaId).first()
  return Boolean(fila)
}

function consultaNotificacionAsignacionTareaCms(base, tarea, creadorCorreo, tipo = 'asignacion_tarea') {
  if (!tarea.responsable_correo || tarea.responsable_correo === creadorCorreo || ['completada', 'cancelada'].includes(tarea.estado)) return
  const titulo = tipo === 'solicitud_recibida' ? 'Nueva solicitud para tu equipo' : 'Nueva tarea asignada'
  const detalle = tarea.fecha_limite ? `${tarea.titulo} - vence el ${tarea.fecha_limite}.` : tarea.titulo
  return base.prepare(`INSERT INTO notificaciones_cms
    (id, usuario_correo, tipo, tarea_id, titulo, detalle)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6)
    ON CONFLICT(usuario_correo, tipo, tarea_id) DO UPDATE SET
      titulo = excluded.titulo, detalle = excluded.detalle, leida_en = NULL, actualizado_en = CURRENT_TIMESTAMP`)
    .bind(crypto.randomUUID(), tarea.responsable_correo, tipo, tarea.id, titulo, detalle)
}

async function notificarAsignacionTareaCms(base, tarea, creadorCorreo, tipo = 'asignacion_tarea') {
  const consulta = consultaNotificacionAsignacionTareaCms(base, tarea, creadorCorreo, tipo)
  if (consulta) await consulta.run()
}

export async function derivarEntradaCms(base, entradaBase, creador, formularioId = null, registrarSolicitante = true) {
  // Toda entrada con equipo sigue la misma ruta operativa: la recibe quien
  // coordina o refiere ese equipo. Así un formulario no queda como una nota
  // sin dueño, aunque nunca crea perfiles personales automáticamente.
  const responsableCorreo = entradaBase.equipo_id
    ? await responsableAutomaticoDeSolicitud(base, entradaBase.equipo_id)
    : null
  const nombreTarea = {
    voluntariado: 'Revisar voluntariado', inscripcion: 'Revisar inscripción', actividad: 'Revisar propuesta de actividad', evento: 'Revisar propuesta de evento', pedido: 'Atender pedido', propuesta: 'Evaluar propuesta',
  }[entradaBase.tipo]
  const destino = entradaBase.destino_respuesta || 'tarea'
  const requiereRevision = ['actividad', 'alta_persona', 'contacto'].includes(destino)
  const tarea = {
    id: crypto.randomUUID(), titulo: formularioId ? `${nombreTarea}: respuesta recibida` : `${nombreTarea}: ${entradaBase.nombre}`,
    descripcion: formularioId ? DESCRIPCION_TAREA_FORMULARIO : DESCRIPCION_TAREA_ENTRADA,
    tipo: destino === 'solicitud' || entradaBase.tipo === 'pedido' ? 'solicitud' : 'seguimiento', estado: 'pendiente',
    prioridad: entradaBase.prioridad, equipo_id: entradaBase.equipo_id,
    proyecto_id: entradaBase.proyecto_id, responsable_correo: responsableCorreo,
    solicitante_correo: entradaBase.tipo === 'pedido' && registrarSolicitante ? creador.correo : null,
  }
  if (destino === 'actividad') tarea.titulo = `Revisar antes de agendar: ${entradaBase.nombre}`
  if (destino === 'alta_persona') tarea.titulo = `Revisar posible alta: ${entradaBase.nombre}`
  if (destino === 'contacto') tarea.titulo = `Revisar contacto: ${entradaBase.nombre}`
  const insertarTarea = destino === 'archivo' ? null : base.prepare(`INSERT INTO tareas_cms
    (id, titulo, descripcion, tipo, estado, prioridad, equipo_id, proyecto_id, responsable_correo, solicitante_correo, creado_por)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`)
    .bind(tarea.id, tarea.titulo, tarea.descripcion, tarea.tipo, tarea.estado, tarea.prioridad, tarea.equipo_id, tarea.proyecto_id, tarea.responsable_correo, tarea.solicitante_correo, creador.correo)
  const entrada = { id: crypto.randomUUID(), ...entradaBase, estado: destino === 'archivo' ? 'nueva' : 'derivada', tarea_id: destino === 'archivo' ? null : tarea.id, formulario_id: formularioId, destino_respuesta: destino, revision_requerida: requiereRevision ? 1 : 0 }
  const insertarEntrada = base.prepare(`INSERT INTO entradas_cms
    (id, tipo, nombre, contacto, detalle, fecha_propuesta, objetivo, pasos, recursos, personas_necesarias, respuestas_json, estado, equipo_id, equipo_solicitante_id, prioridad, proyecto_id, tarea_id, formulario_id, creado_por, destino_respuesta, revision_requerida)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)`)
    .bind(entrada.id, entrada.tipo, entrada.nombre, entrada.contacto, entrada.detalle, entrada.fecha_propuesta, entrada.objetivo, entrada.pasos, entrada.recursos, entrada.personas_necesarias, entrada.respuestas_json || '{}', entrada.estado, entrada.equipo_id, entrada.equipo_solicitante_id, entrada.prioridad, entrada.proyecto_id, entrada.tarea_id, entrada.formulario_id, creador.correo, entrada.destino_respuesta, entrada.revision_requerida)
  const notificacion = insertarTarea ? consultaNotificacionAsignacionTareaCms(base, tarea, creador.correo, tarea.tipo === 'solicitud' ? 'solicitud_recibida' : 'asignacion_tarea') : null
  await base.batch([...(insertarTarea ? [insertarTarea] : []), insertarEntrada, ...(notificacion ? [notificacion] : [])])
  return { entrada, tarea: insertarTarea ? tarea : null, asignada_automaticamente: Boolean(insertarTarea && responsableCorreo) }
}

function tokenComunicacion(longitud = 32) {
  const bytes = new Uint8Array(longitud)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function hashTokenComunicacion(token) {
  const resumen = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))
  return [...resumen].map((valor) => valor.toString(16).padStart(2, '0')).join('')
}

function origenPublicoComunicacion(request, env = {}) {
  const configurado = String(env.ORIGEN_PUBLICO || '').trim().replace(/\/$/, '')
  return configurado || new URL(request.url).origin
}

function escaparHtmlComunicacion(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (caracter) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caracter])
}

function paginaComunicacion({ titulo, mensaje, contenido = '' }) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>${escaparHtmlComunicacion(titulo)} | Aletea</title><style>body{margin:0;background:#f8f5fa;color:#312d33;font-family:system-ui,-apple-system,sans-serif}.caja{box-sizing:border-box;width:min(42rem,calc(100% - 2rem));margin:8vh auto;background:#fff;border:1px solid #e7dfea;border-radius:1.5rem;padding:clamp(1.5rem,5vw,3rem);box-shadow:0 1rem 3rem #54216618}.marca{color:#0b7563;font-size:.82rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h1{color:#632776;font-size:clamp(2rem,8vw,3.5rem);line-height:1;margin:.6rem 0 1.25rem}p{font-size:1.08rem;line-height:1.55}.boton{display:inline-flex;margin-top:1rem;border:0;border-radius:999px;background:#632776;color:#fff;padding:.9rem 1.35rem;font:inherit;font-weight:750;cursor:pointer}</style></head><body><main class="caja"><div class="marca">Aletea</div><h1>${escaparHtmlComunicacion(titulo)}</h1><p>${escaparHtmlComunicacion(mensaje)}</p>${contenido}</main></body></html>`
}

export async function registrarSolicitudComunicacion(base, solicitud, { nombre = '', formularioId = null, entradaId = null, fuente = 'formulario_publico', origen = '' } = {}) {
  if (!solicitud) return null
  const suprimida = await base.prepare('SELECT correo FROM supresiones_comunicacion WHERE correo = ?1').bind(solicitud.correo).first()
  if (suprimida) return { estado: 'suprimida' }
  const contacto = await base.prepare('SELECT * FROM contactos_comunicacion WHERE correo = ?1').bind(solicitud.correo).first()
  if (contacto && ['baja', 'rebotado', 'bloqueado'].includes(contacto.estado)) return { estado: 'suprimida' }
  const ahora = instanteUtcSql()
  const contactoId = contacto?.id || crypto.randomUUID()
  const tokenBaja = contacto?.token_baja || tokenComunicacion()
  const yaActivo = contacto?.estado === 'activo'
  if (!contacto) {
    await base.prepare(`INSERT INTO contactos_comunicacion
      (id, correo, nombre, idioma, estado, fuente_ultima, token_baja)
      VALUES (?1, ?2, ?3, 'es', 'pendiente', ?4, ?5)`)
      .bind(contactoId, solicitud.correo, textoCms(nombre, 191), textoCms(fuente, 191), tokenBaja).run()
  } else {
    await base.prepare(`UPDATE contactos_comunicacion SET
      nombre = CASE WHEN ?2 <> '' THEN ?2 ELSE nombre END,
      fuente_ultima = ?3, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1`)
      .bind(contactoId, textoCms(nombre, 191), textoCms(fuente, 191)).run()
  }
  const tokenConfirmacion = tokenComunicacion()
  const tokenHash = await hashTokenComunicacion(tokenConfirmacion)
  const consentimientoId = crypto.randomUUID()
  if (!yaActivo) {
    await base.prepare(`UPDATE consentimientos_comunicacion SET estado = 'vencido'
      WHERE contacto_id = ?1 AND estado = 'pendiente'`).bind(contactoId).run()
  }
  await base.prepare(`INSERT INTO consentimientos_comunicacion
    (id, contacto_id, finalidad, estado, fuente, formulario_id, entrada_id, texto_version, texto_consentimiento, token_hash, solicitado_en, confirmado_en)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`)
    .bind(consentimientoId, contactoId, solicitud.finalidad, yaActivo ? 'aceptado' : 'pendiente', textoCms(fuente, 191), formularioId, entradaId, solicitud.texto_version, solicitud.texto_consentimiento, tokenHash, ahora, yaActivo ? ahora : null).run()
  for (const tema of temasComunicacionValidos(solicitud.temas)) {
    await base.prepare(`INSERT INTO preferencias_comunicacion (contacto_id, tema, habilitada)
      VALUES (?1, ?2, 1) ON CONFLICT(contacto_id, tema)
      DO UPDATE SET habilitada = 1, actualizado_en = CURRENT_TIMESTAMP`).bind(contactoId, tema).run()
  }
  if (yaActivo) return { estado: 'activo' }
  const confirmar = `${origen}/api/comunicaciones/confirmar?token=${encodeURIComponent(tokenConfirmacion)}`
  const baja = `${origen}/api/comunicaciones/baja?token=${encodeURIComponent(tokenBaja)}`
  const asunto = 'Confirmá que querés recibir novedades de Aletea'
  const contenidoTexto = `Recibimos una solicitud para enviarte novedades y actividades de Aletea.\n\nConfirmá tu suscripción: ${confirmar}\n\nSi no hiciste esta solicitud, ignorá este mensaje.\n\nPodés darte de baja en cualquier momento: ${baja}`
  const contenidoHtml = `<p>Recibimos una solicitud para enviarte novedades y actividades de Aletea.</p><p><a href="${escaparHtmlComunicacion(confirmar)}">Confirmar suscripción</a></p><p>Si no hiciste esta solicitud, ignorá este mensaje.</p><p><a href="${escaparHtmlComunicacion(baja)}">Darme de baja</a></p>`
  await base.prepare(`INSERT INTO cola_correos
    (id, tipo, contacto_id, destinatario, asunto, contenido_texto, contenido_html, estado, clave_idempotencia)
    VALUES (?1, 'confirmacion', ?2, ?3, ?4, ?5, ?6, 'pendiente', ?7)
    ON CONFLICT(clave_idempotencia) DO UPDATE SET clave_idempotencia = excluded.clave_idempotencia`)
    .bind(crypto.randomUUID(), contactoId, solicitud.correo, asunto, contenidoTexto, contenidoHtml, `confirmacion:${consentimientoId}`).run()
  return { estado: 'pendiente' }
}

async function comunicacionPublica(contexto, ruta) {
  const { request, env } = contexto
  const url = new URL(request.url)
  let token = String(url.searchParams.get('token') || '')
  if (ruta === 'comunicaciones/baja' && request.method === 'POST') {
    const formulario = await request.formData().catch(() => null)
    token = String(formulario?.get('token') || token)
  }
  if (!/^[A-Za-z0-9_-]{20,120}$/.test(token)) return responderHtml(paginaComunicacion({ titulo: 'Enlace no válido', mensaje: 'El enlace está incompleto o ya no es válido.' }), 400)
  if (ruta === 'comunicaciones/confirmar' && request.method === 'GET') {
    const tokenHash = await hashTokenComunicacion(token)
    const consentimiento = await env.BASE.prepare(`SELECT c.id, c.contacto_id, c.estado, c.solicitado_en, p.correo
      FROM consentimientos_comunicacion c JOIN contactos_comunicacion p ON p.id = c.contacto_id
      WHERE c.token_hash = ?1`).bind(tokenHash).first()
    if (!consentimiento || consentimiento.estado !== 'pendiente') {
      return responderHtml(paginaComunicacion({ titulo: 'Enlace ya utilizado', mensaje: 'Esta confirmación ya fue utilizada o dejó de estar disponible.' }), 410)
    }
    const solicitado = new Date(String(consentimiento.solicitado_en).replace(' ', 'T') + 'Z').getTime()
    if (!Number.isFinite(solicitado) || Date.now() - solicitado > 7 * 86400000) {
      await env.BASE.prepare("UPDATE consentimientos_comunicacion SET estado = 'vencido' WHERE id = ?1").bind(consentimiento.id).run()
      return responderHtml(paginaComunicacion({ titulo: 'El enlace venció', mensaje: 'Por seguridad, las confirmaciones duran siete días. Completá nuevamente un formulario para solicitar otra.' }), 410)
    }
    const suprimida = await env.BASE.prepare('SELECT correo FROM supresiones_comunicacion WHERE correo = ?1').bind(consentimiento.correo).first()
    if (suprimida) return responderHtml(paginaComunicacion({ titulo: 'Suscripción bloqueada', mensaje: 'Este correo figura en la lista de bajas y no será reactivado automáticamente.' }), 409)
    const ahora = instanteUtcSql()
    await env.BASE.batch([
      env.BASE.prepare("UPDATE consentimientos_comunicacion SET estado = 'aceptado', confirmado_en = ?2 WHERE id = ?1").bind(consentimiento.id, ahora),
      env.BASE.prepare("UPDATE contactos_comunicacion SET estado = 'activo', confirmado_en = ?2, baja_en = NULL, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1").bind(consentimiento.contacto_id, ahora),
    ])
    return responderHtml(paginaComunicacion({ titulo: 'Suscripción confirmada', mensaje: 'Listo. A partir de ahora recibirás solamente las novedades que elegiste.' }))
  }
  if (ruta === 'comunicaciones/baja' && request.method === 'GET') {
    const contenido = `<form method="post"><input type="hidden" name="token" value="${escaparHtmlComunicacion(token)}"><button class="boton" type="submit">Confirmar baja</button></form>`
    return responderHtml(paginaComunicacion({ titulo: 'Dejar de recibir correos', mensaje: 'Confirmá la baja. No volveremos a activar este correo desde otro formulario sin una nueva decisión tuya.', contenido }))
  }
  if (ruta === 'comunicaciones/baja' && request.method === 'POST') {
    const contacto = await env.BASE.prepare('SELECT id, correo, estado FROM contactos_comunicacion WHERE token_baja = ?1').bind(token).first()
    if (!contacto) return responderHtml(paginaComunicacion({ titulo: 'Enlace no válido', mensaje: 'No encontramos una suscripción asociada a este enlace.' }), 404)
    const ahora = instanteUtcSql()
    await env.BASE.batch([
      env.BASE.prepare("UPDATE contactos_comunicacion SET estado = 'baja', baja_en = ?2, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1").bind(contacto.id, ahora),
      env.BASE.prepare(`INSERT INTO supresiones_comunicacion (correo, motivo, origen) VALUES (?1, 'Baja solicitada por la persona', 'enlace')
        ON CONFLICT(correo) DO UPDATE SET motivo = excluded.motivo, origen = excluded.origen, creado_en = CURRENT_TIMESTAMP`).bind(contacto.correo),
      env.BASE.prepare('UPDATE preferencias_comunicacion SET habilitada = 0, actualizado_en = CURRENT_TIMESTAMP WHERE contacto_id = ?1').bind(contacto.id),
      env.BASE.prepare("UPDATE consentimientos_comunicacion SET estado = 'revocado', revocado_en = ?2 WHERE contacto_id = ?1 AND estado IN ('pendiente', 'aceptado')").bind(contacto.id, ahora),
      env.BASE.prepare("UPDATE cola_correos SET estado = 'suprimido', actualizado_en = CURRENT_TIMESTAMP WHERE contacto_id = ?1 AND estado IN ('pendiente', 'procesando')").bind(contacto.id),
    ])
    return responderHtml(paginaComunicacion({ titulo: 'Baja confirmada', mensaje: 'Listo. Este correo quedó bloqueado para futuros envíos de novedades.' }))
  }
  return error('Método no permitido.', 405)
}

async function formularioPublico(contexto, ruta) {
  const { request, env } = contexto
  const cabeceras = cabecerasFormularioPublico(request)
  if (request.method === 'OPTIONS') return responder(null, 204, cabeceras)
  const id = ruta.split('/').filter(Boolean)[1]
  if (!id) return error('No encontramos ese formulario.', 404, cabeceras)
  let formulario = await env.BASE.prepare(`SELECT id, titulo, descripcion, tipo, equipo_id, equipo_solicitante_id, prioridad, proyecto_id, creado_por, campos_json, destino_respuesta,
      finalidad, responsable_datos, conservacion_meses, requiere_consentimiento, configuracion_publica_json
    FROM formularios_cms WHERE id = ?1 AND visibilidad = 'publica' AND estado = 'activa'`).bind(id).first()
  if (!formulario && await asegurarFormularioPruebaCms(env.BASE, id)) {
    formulario = await env.BASE.prepare(`SELECT id, titulo, descripcion, tipo, equipo_id, equipo_solicitante_id, prioridad, proyecto_id, creado_por, campos_json, destino_respuesta,
        finalidad, responsable_datos, conservacion_meses, requiere_consentimiento, configuracion_publica_json
      FROM formularios_cms WHERE id = ?1 AND visibilidad = 'publica' AND estado = 'activa'`).bind(id).first()
  }
  if (!formulario) return error('Este formulario no está disponible.', 404, cabeceras)
  if (request.method === 'GET') return responder({ formulario }, 200, { ...cabeceras, 'X-Robots-Tag': 'noindex, nofollow, noarchive' })
  if (request.method !== 'POST') return error('Método no permitido.', 405, cabeceras)
  let datos; try { datos = await request.json() } catch { return error('Los datos del formulario no son válidos.', 400, cabeceras) }
  if (!consentimientoFormularioPublicoValido(datos, formulario)) return error('Confirmá que leíste cómo se usarán tus datos.', 400, cabeceras)
  if (!compromisoFormularioPublicoValido(datos, formulario)) return error('Aceptá el compromiso de confidencialidad y convivencia para continuar.', 400, cabeceras)
  const resultadoSuscripcion = solicitudComunicacionDesde(datos)
  if (resultadoSuscripcion.error) return error(resultadoSuscripcion.error, 400, cabeceras)
  const resultado = respuestaFormularioCmsDesde(datos, formulario)
  if (resultado.error) return error(resultado.error, 400, cabeceras)
  const fechaConsentimiento = instanteUtcSql()
  const auditoriaAcuerdos = auditoriaAcuerdosFormularioDesde(datos, formulario, fechaConsentimiento)
  resultado.entrada.respuestas = {
    ...(resultado.entrada.respuestas || {}),
    ...auditoriaAcuerdos.respuestas,
    _consentimiento_comunicaciones: resultadoSuscripcion.solicitud ? 'Solicitado, pendiente de confirmación' : 'No solicitado',
  }
  resultado.entrada.respuestas_json = JSON.stringify(resultado.entrada.respuestas)
  const ip = request.headers.get('CF-Connecting-IP') || 'sin-direccion'
  const ventana = String(Math.floor(Date.now() / 600000))
  const clave = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.SESION_SECRETO || 'formulario'}:${ip}`))
  const limite = [...new Uint8Array(clave)].map((valor) => valor.toString(16).padStart(2, '0')).join('')
  // D1 y MariaDB aceptan este UPSERT sin una clausula WHERE propia de SQLite.
  // El contador queda clavado en 5: los primeros cuatro intentos avanzan y el
  // quinto marca el limite sin crecer indefinidamente durante la ventana.
  if (!await reservarEnvioFormularioPublico(env.BASE, formulario.id, limite, ventana)) {
    return error('Probá nuevamente en unos minutos.', 429, cabeceras)
  }
  const derivada = await derivarEntradaCms(env.BASE, resultado.entrada, { correo: formulario.creado_por }, formulario.id, false)
  let suscripcion = null
  let advertenciaSuscripcion = ''
  try {
    suscripcion = await registrarSolicitudComunicacion(env.BASE, resultadoSuscripcion.solicitud, {
      nombre: resultado.entrada.nombre,
      formularioId: formulario.id,
      entradaId: derivada.entrada.id,
      fuente: `formulario:${formulario.id}`,
      origen: origenPublicoComunicacion(request, env),
    })
  } catch (falloSuscripcion) {
    advertenciaSuscripcion = 'Recibimos tu respuesta, pero no pudimos iniciar la suscripción a novedades. No necesitás volver a enviar el formulario.'
    try {
      await env.BASE.prepare(`INSERT INTO incidentes_operativos_cms
        (id, clave, tipo, severidad, estado, titulo, detalle, fuente)
        VALUES (?1, 'comunicaciones:alta', 'correo', 'advertencia', 'abierto', 'Falló un alta de comunicaciones', ?2, 'formulario_publico')
        ON CONFLICT(clave) DO UPDATE SET estado = 'abierto', detalle = excluded.detalle,
          ocurrencias = ocurrencias + 1, ultimo_en = CURRENT_TIMESTAMP, resuelto_en = NULL, resuelto_por = NULL`)
        .bind(crypto.randomUUID(), `Código técnico: ${textoCms(falloSuscripcion?.code || falloSuscripcion?.name || 'ERROR', 80)}`).run()
    } catch {}
  }
  await registrar(env.BASE, { correo: formulario.creado_por }, 'recibir formulario público', `formularios/${formulario.id}`, 'Respuesta recibida')
  return responder({
    recibida: true,
    referencia: derivada.entrada.id,
    suscripcion: suscripcion?.estado || (advertenciaSuscripcion ? 'no_disponible' : null),
    advertencia: advertenciaSuscripcion || null,
  }, 201, cabeceras)
}

export async function reservarEnvioFormularioPublico(base, formularioId, clave, ventana) {
  await base.prepare(`INSERT INTO limites_formularios_publicos_cms (formulario_id, clave, ventana, cantidad)
    VALUES (?1, ?2, ?3, 1) ON CONFLICT(formulario_id, clave, ventana)
    DO UPDATE SET cantidad = CASE WHEN cantidad < 5 THEN cantidad + 1 ELSE cantidad END,
      actualizado_en = CURRENT_TIMESTAMP`)
    .bind(formularioId, clave, ventana).run()
  const uso = await base.prepare(`SELECT cantidad FROM limites_formularios_publicos_cms
    WHERE formulario_id = ?1 AND clave = ?2 AND ventana = ?3`)
    .bind(formularioId, clave, ventana).first()
  return Number(uso?.cantidad || 0) <= 4
}

async function finanzasFsbCms(contexto, sesion, partes, alcance) {
  const { request, env } = contexto
  const equipo = await env.BASE.prepare("SELECT id FROM equipos WHERE clave = 'finanzas' AND activo = 1").first()
  if (!equipo) return error('El equipo de Finanzas todavía no está configurado.', 503)
  if (!puedeAccederFinanzasFsb(sesion, alcance, equipo.id)) {
    const fichaProtegida = nivelDatosPersonalesDe(sesion) === 'sensible'
    const equipoFinanzas = Boolean(alcance.global || alcance.equipos?.has?.(equipo.id))
    const mensaje = !fichaProtegida
      ? 'Necesitás acceso a ficha protegida. Administración puede habilitarlo hasta una fecha o sin vencimiento.'
      : 'Tu acceso a ficha protegida está vigente, pero también necesitás pertenecer al equipo de Finanzas.'
    return responder({
      error: mensaje,
      acceso: {
        puede_ver: false,
        puede_gestionar: false,
        requisitos: [
          {
            id: 'datos-personales:sensible', tipo: 'datos_personales', titulo: 'Datos personales completos',
            descripcion: 'Habilita información protegida completa. Cada consulta y cada cambio quedan registrados.',
            cumplido: fichaProtegida, resolver: { tipo: 'datos_personales', nivel: 'sensible', usuario: 'yo' },
          },
          {
            id: 'equipo:finanzas', tipo: 'equipo', titulo: 'Pertenencia al equipo Finanzas',
            descripcion: 'La persona debe estar asignada al equipo Finanzas.',
            cumplido: equipoFinanzas, resolver: { tipo: 'equipo', equipo_id: equipo.id, equipo_clave: 'finanzas', usuario: 'yo' },
          },
        ],
      },
    }, 403, { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive' })
  }
  const puedeGestionar = puedeGestionarFinanzasFsb(sesion, alcance, equipo.id)
  const subrecurso = partes[2] ?? ''
  if (request.method === 'GET' && !subrecurso) {
    const [cuentas, movimientos, compromisos, documentoRoster] = await Promise.all([
      env.BASE.prepare(`SELECT id, persona_id, nombre, grupo, condicion, beca_porcentaje, observaciones, activa, creado_en, actualizado_en
        FROM cuentas_fsb ORDER BY activa DESC, nombre COLLATE NOCASE`).all(),
      env.BASE.prepare(`SELECT id, cuenta_id, tipo, concepto, periodo, fecha, vencimiento, importe_centavos, medio_pago,
          comprobante, notas, clave_operacion, creado_en, anulado_en, anulado_por, motivo_anulacion
        FROM movimientos_fsb ORDER BY fecha DESC, creado_en DESC LIMIT 5000`).all(),
      env.BASE.prepare(`SELECT id, cuenta_id, importe_centavos, fecha_acuerdo, fecha_prevista, estado, nota, creado_en,
          cerrado_en, cerrado_por, motivo_cierre FROM compromisos_pago_fsb ORDER BY fecha_prevista DESC, creado_en DESC LIMIT 2000`).all(),
      env.BASE.prepare("SELECT contenido FROM documentos WHERE ruta = 'roster.json'").first(),
    ])
    let movimientosActuales = movimientos.results
    let recargosAplicados = 0
    if (puedeGestionar) {
      const recargos = prepararRecargosFsb(cuentas.results, movimientosActuales, fechaActualCms())
      if (recargos.length) {
        try {
          await env.BASE.batch(recargos.map((movimiento) => env.BASE.prepare(`INSERT INTO movimientos_fsb
            (id, cuenta_id, tipo, concepto, periodo, fecha, vencimiento, importe_centavos, medio_pago, comprobante, notas, clave_operacion, creado_por)
            VALUES (?1, ?2, 'recargo', ?3, ?4, ?5, NULL, ?6, '', '', '', ?7, ?8)`)
            .bind(crypto.randomUUID(), movimiento.cuenta_id, movimiento.concepto, movimiento.periodo, movimiento.fecha,
              movimiento.importe_centavos, movimiento.clave_operacion, 'automatizacion')))
          recargosAplicados = recargos.length
          await registrar(env.BASE, sesion, 'aplicar recargos FSB', 'recargos-fsb', `${recargosAplicados} recargos automáticos aplicados`)
        } catch {
          recargosAplicados = 0
        }
        const actualizados = await env.BASE.prepare(`SELECT id, cuenta_id, tipo, concepto, periodo, fecha, vencimiento, importe_centavos, medio_pago,
          comprobante, notas, clave_operacion, creado_en, anulado_en, anulado_por, motivo_anulacion
          FROM movimientos_fsb ORDER BY fecha DESC, creado_en DESC LIMIT 5000`).all()
        movimientosActuales = actualizados.results
      }
    }
    const roster = documentoRoster?.contenido ? JSON.parse(documentoRoster.contenido) : { participantes: [] }
    return responder({
      acceso: { puede_ver: true, puede_gestionar: puedeGestionar, privacidad: 'sensible' },
      configuracion: configuracionFinanzasFsb(roster, cuentas.results, movimientosActuales),
      recargos_aplicados: recargosAplicados,
      ...resumenFinanzasFsb(cuentas.results, movimientosActuales, fechaActualCms(), compromisos.results),
    }, 200, { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive' })
  }
  if (!puedeGestionar) return error('Tu acceso permite consultar Finanzas, pero no registrar cambios.', 403)
  if (!['POST', 'PATCH'].includes(request.method)) return error('Método no permitido.', 405)
  let datos
  try { datos = await request.json() } catch { return error('Los datos financieros no son válidos.', 400) }

  if (request.method === 'PATCH' && subrecurso === 'cuentas' && partes[3]) {
    const actual = await env.BASE.prepare(`SELECT id, persona_id, nombre, grupo, condicion, beca_porcentaje, observaciones, activa
      FROM cuentas_fsb WHERE id = ?1`).bind(partes[3]).first()
    if (!actual) return error('No encontramos la cuenta que querés editar.', 404)
    if (actual.persona_id) return error('Este tipo de cuota se administra desde el perfil de la persona.', 409)
    const resultado = cuentaFsbDesde(datos, actual)
    if (resultado.error) return error(resultado.error, 400)
    const cuenta = { id: actual.id, ...resultado.cuenta }
    await env.BASE.prepare(`UPDATE cuentas_fsb SET persona_id = ?1, nombre = ?2, grupo = ?3, condicion = ?4,
      beca_porcentaje = ?5, observaciones = ?6, activa = ?7, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?8`)
      .bind(cuenta.persona_id, cuenta.nombre, cuenta.grupo, cuenta.condicion, cuenta.beca_porcentaje, cuenta.observaciones, cuenta.activa, cuenta.id).run()
    await registrar(env.BASE, sesion, 'editar cuenta FSB', `cuentas-fsb/${cuenta.id}`, 'Cuenta financiera actualizada')
    return responder({ cuenta }, 200, { 'Cache-Control': 'no-store' })
  }

  if (request.method !== 'POST') return error('Método no permitido.', 405)

  if (subrecurso === 'recordatorios') {
    const cuentaId = textoCms(datos.cuenta_id, 100)
    const cuenta = cuentaId ? await env.BASE.prepare('SELECT id FROM cuentas_fsb WHERE id = ?1 AND activa = 1').bind(cuentaId).first() : null
    if (!cuenta) return error('No encontramos una cuenta activa para preparar el recordatorio.', 404)
    await registrar(env.BASE, sesion, 'preparar recordatorio manual FSB', `cuentas-fsb/${cuentaId}`, 'Recordatorio manual preparado')
    return responder({ registrado: true }, 200, { 'Cache-Control': 'no-store' })
  }

  if (subrecurso === 'compromisos' && partes[3] && partes[4] === 'cerrar') {
    const estado = textoCms(datos.estado, 20)
    const motivo = textoCms(datos.motivo, 300)
    if (!['cumplido', 'cancelado'].includes(estado)) return error('Elegí si el compromiso se cumplió o se canceló.', 400)
    if (estado === 'cancelado' && motivo.length < 5) return error('Explicá brevemente por qué se cancela el compromiso.', 400)
    const cerrado = await env.BASE.prepare(`UPDATE compromisos_pago_fsb SET estado = ?1, cerrado_por = ?2, cerrado_en = CURRENT_TIMESTAMP, motivo_cierre = ?3
      WHERE id = ?4 AND estado = 'vigente'`).bind(estado, sesion.correo, motivo, partes[3]).run()
    if (!Number(cerrado.meta?.changes || 0)) return error('El compromiso no existe o ya estaba cerrado.', 404)
    await registrar(env.BASE, sesion, 'cerrar compromiso de pago FSB', `compromisos-pago-fsb/${partes[3]}`, estado)
    return responder({ cerrado: true, estado }, 200, { 'Cache-Control': 'no-store' })
  }

  if (subrecurso === 'compromisos') {
    const resultado = compromisoPagoFsbDesde(datos)
    if (resultado.error) return error(resultado.error, 400)
    const cuenta = await env.BASE.prepare('SELECT id FROM cuentas_fsb WHERE id = ?1 AND activa = 1').bind(resultado.compromiso.cuenta_id).first()
    if (!cuenta) return error('No encontramos una cuenta activa para registrar el compromiso.', 404)
    const vigente = await env.BASE.prepare("SELECT id FROM compromisos_pago_fsb WHERE cuenta_id = ?1 AND estado = 'vigente' LIMIT 1").bind(resultado.compromiso.cuenta_id).first()
    if (vigente) return error('Esta cuenta ya tiene un compromiso vigente. Cerralo antes de registrar otro.', 409)
    const compromiso = { id: crypto.randomUUID(), ...resultado.compromiso, estado: 'vigente', creado_por: sesion.correo }
    await env.BASE.prepare(`INSERT INTO compromisos_pago_fsb
      (id, cuenta_id, importe_centavos, fecha_acuerdo, fecha_prevista, estado, nota, creado_por)
      VALUES (?1, ?2, ?3, ?4, ?5, 'vigente', ?6, ?7)`)
      .bind(compromiso.id, compromiso.cuenta_id, compromiso.importe_centavos, compromiso.fecha_acuerdo, compromiso.fecha_prevista, compromiso.nota, compromiso.creado_por).run()
    await registrar(env.BASE, sesion, 'crear compromiso de pago FSB', `compromisos-pago-fsb/${compromiso.id}`, 'Compromiso registrado')
    return responder({ compromiso }, 201, { 'Cache-Control': 'no-store' })
  }

  if (subrecurso === 'movimientos' && partes[3] && partes[4] === 'anular') {
    const motivo = textoCms(datos.motivo, 300)
    if (motivo.length < 5) return error('Explicá brevemente por qué se anula el movimiento.', 400)
    const anulada = await env.BASE.prepare(`UPDATE movimientos_fsb SET anulado_en = CURRENT_TIMESTAMP, anulado_por = ?1, motivo_anulacion = ?2
      WHERE id = ?3 AND anulado_en IS NULL`).bind(sesion.correo, motivo, partes[3]).run()
    if (!Number(anulada.meta?.changes || 0)) return error('El movimiento no existe o ya estaba anulado.', 404)
    await registrar(env.BASE, sesion, 'anular movimiento FSB', `movimientos-fsb/${partes[3]}`, 'Movimiento anulado con motivo registrado')
    return responder({ anulada: true }, 200, { 'Cache-Control': 'no-store' })
  }

  if (subrecurso === 'cuotas') {
    const [cuentas, movimientos] = await Promise.all([
      env.BASE.prepare(`SELECT id, nombre, grupo, condicion, beca_porcentaje, activa FROM cuentas_fsb WHERE activa = 1 ORDER BY nombre COLLATE NOCASE`).all(),
      env.BASE.prepare('SELECT clave_operacion, anulado_en FROM movimientos_fsb WHERE clave_operacion IS NOT NULL').all(),
    ])
    const plan = prepararCuotasFsb(cuentas.results, movimientos.results, datos)
    if (plan.error) return error(plan.error, 400)
    if (!plan.cuotas.length) return error('No hay cuentas con cuota regular o beca asignadas a los grupos 1 o 2.', 409)
    if (!plan.nuevas.length) return error('Las cuotas de ese mes ya están generadas para todas las cuentas facturables.', 409)
    try {
      await env.BASE.batch(plan.nuevas.map((cuota) => env.BASE.prepare(`INSERT INTO movimientos_fsb
        (id, cuenta_id, tipo, concepto, periodo, fecha, vencimiento, importe_centavos, medio_pago, comprobante, notas, clave_operacion, creado_por)
        VALUES (?1, ?2, 'cargo', ?3, ?4, ?5, ?6, ?7, '', '', '', ?8, ?9)`)
        .bind(crypto.randomUUID(), cuota.cuenta_id, cuota.concepto, cuota.periodo, cuota.fecha, cuota.vencimiento, cuota.importe_centavos, cuota.clave_operacion, sesion.correo)))
    } catch { return error('Las cuotas cambiaron mientras trabajabas. Actualizá la pantalla antes de intentarlo otra vez.', 409) }
    await registrar(env.BASE, sesion, 'generar cuotas FSB', 'cuotas-fsb', `${plan.nuevas.length} cuotas generadas para ${datos.periodo}`)
    return responder({ generadas: plan.nuevas.length, omitidas: plan.cuotas.length - plan.nuevas.length, total_centavos: plan.total_centavos }, 201, { 'Cache-Control': 'no-store' })
  }

  if (subrecurso === 'cuentas') {
    const resultado = cuentaFsbDesde(datos)
    if (resultado.error) return error(resultado.error, 400)
    const cuenta = { id: crypto.randomUUID(), ...resultado.cuenta, creado_por: sesion.correo }
    await env.BASE.prepare(`INSERT INTO cuentas_fsb
      (id, persona_id, nombre, grupo, condicion, beca_porcentaje, observaciones, activa, creado_por)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`)
      .bind(cuenta.id, cuenta.persona_id, cuenta.nombre, cuenta.grupo, cuenta.condicion, cuenta.beca_porcentaje, cuenta.observaciones, cuenta.activa, cuenta.creado_por).run()
    await registrar(env.BASE, sesion, 'crear cuenta FSB', `cuentas-fsb/${cuenta.id}`, 'Cuenta financiera creada')
    return responder({ cuenta }, 201, { 'Cache-Control': 'no-store' })
  }

  if (subrecurso === 'movimientos') {
    const resultado = movimientoFsbDesde(datos)
    if (resultado.error) return error(resultado.error, 400)
    const cuenta = await env.BASE.prepare('SELECT id FROM cuentas_fsb WHERE id = ?1 AND activa = 1').bind(resultado.movimiento.cuenta_id).first()
    if (!cuenta) return error('No encontramos una cuenta activa para registrar el movimiento.', 404)
    if (resultado.movimiento.tipo === 'pago' && datos.permitir_duplicado !== true) {
      const duplicado = await env.BASE.prepare(`SELECT id FROM movimientos_fsb
        WHERE cuenta_id = ?1 AND tipo = 'pago' AND importe_centavos = ?2 AND fecha = ?3 AND anulado_en IS NULL LIMIT 1`)
        .bind(resultado.movimiento.cuenta_id, resultado.movimiento.importe_centavos, resultado.movimiento.fecha).first()
      if (duplicado) return responder({ error: 'Parece un pago duplicado.', duplicado: { movimiento_id: duplicado.id } }, 409, { 'Cache-Control': 'no-store' })
    }
    const movimiento = { id: crypto.randomUUID(), ...resultado.movimiento, creado_por: sesion.correo }
    await env.BASE.prepare(`INSERT INTO movimientos_fsb
      (id, cuenta_id, tipo, concepto, periodo, fecha, vencimiento, importe_centavos, medio_pago, comprobante, notas, clave_operacion, creado_por)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`)
      .bind(movimiento.id, movimiento.cuenta_id, movimiento.tipo, movimiento.concepto, movimiento.periodo, movimiento.fecha,
        movimiento.vencimiento, movimiento.importe_centavos, movimiento.medio_pago, movimiento.comprobante, movimiento.notas,
        movimiento.clave_operacion, movimiento.creado_por).run()
    await registrar(env.BASE, sesion, 'registrar movimiento FSB', `movimientos-fsb/${movimiento.id}`, movimiento.tipo)
    const saldo = await env.BASE.prepare('SELECT COALESCE(SUM(importe_centavos), 0) AS saldo_centavos FROM movimientos_fsb WHERE cuenta_id = ?1 AND anulado_en IS NULL')
      .bind(movimiento.cuenta_id).first()
    return responder({ movimiento, saldo_centavos: Number(saldo?.saldo_centavos || 0) }, 201, { 'Cache-Control': 'no-store' })
  }
  return error('No encontramos esa operación financiera.', 404)
}

function puedeGestionarComunicacionesCms(sesion) {
  return ['administracion', 'direccion'].includes(perfilAccesoDe(sesion)) && nivelDatosPersonalesDe(sesion) !== 'ninguno'
}

const CONTROLES_CORREO_REQUERIDOS = Object.freeze([
  'correo_cuenta_remitente', 'correo_dmarc', 'correo_limites_proveedor', 'correo_prueba_externa', 'correo_baja_verificada',
])

export function preparacionCorreoCms(controles = [], env = {}) {
  const confirmados = new Set((controles || []).filter((control) => control.estado === 'confirmado').map((control) => control.clave))
  const pendientes = CONTROLES_CORREO_REQUERIDOS.filter((clave) => !confirmados.has(clave))
  const smtpConfigurado = env.EMAIL_TRANSPORT === 'smtp' && Boolean(env.EMAIL_FROM && env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD)
  return { lista: smtpConfigurado && pendientes.length === 0, smtp_configurado: smtpConfigurado, controles_pendientes: pendientes }
}

function htmlCampanaDesdeTexto(texto, enlaceBaja) {
  const parrafos = String(texto || '').split(/\n{2,}/).map((parrafo) => `<p>${escaparHtmlComunicacion(parrafo).replace(/\n/g, '<br>')}</p>`).join('')
  return `${parrafos}<p><a href="${escaparHtmlComunicacion(enlaceBaja)}">Dejar de recibir estos correos</a></p>`
}

async function comunicacionesCms(contexto, sesion, ruta) {
  const { request, env } = contexto
  if (!puedeGestionarComunicacionesCms(sesion)) return error('Necesitás un perfil de Dirección o Administración y acceso vigente a datos personales.', 403)
  const partes = ruta.split('/').filter(Boolean)
  const recurso = partes[2] || ''
  const id = partes[3] || ''
  const accion = partes[4] || ''
  if (!recurso && request.method === 'GET') {
    const url = new URL(request.url)
    const buscarContactos = textoCms(url.searchParams.get('contactos_buscar'), 120).toLocaleLowerCase('es-UY')
    const paginaContactos = Math.max(1, Math.min(100000, Number.parseInt(url.searchParams.get('contactos_pagina') || '1', 10) || 1))
    const limiteContactos = 100
    const desplazamientoContactos = (paginaContactos - 1) * limiteContactos
    const patronContactos = `%${buscarContactos}%`
    const filtroContactos = "WHERE (?1 = '' OR LOWER(c.nombre) LIKE ?2 OR LOWER(c.correo) LIKE ?2)"
    const [contactos, totalContactos, campanas, cola, eventos, controlesCorreo] = await Promise.all([
      env.BASE.prepare(`SELECT c.id, c.correo, c.nombre, c.estado, c.fuente_ultima, c.confirmado_en, c.baja_en, c.creado_en, c.actualizado_en,
        (SELECT GROUP_CONCAT(p.tema) FROM preferencias_comunicacion p WHERE p.contacto_id = c.id AND p.habilitada = 1) AS temas,
        (SELECT x.estado FROM consentimientos_comunicacion x WHERE x.contacto_id = c.id ORDER BY x.solicitado_en DESC LIMIT 1) AS consentimiento_estado,
        (SELECT x.fuente FROM consentimientos_comunicacion x WHERE x.contacto_id = c.id ORDER BY x.solicitado_en DESC LIMIT 1) AS consentimiento_fuente,
        (SELECT x.texto_version FROM consentimientos_comunicacion x WHERE x.contacto_id = c.id ORDER BY x.solicitado_en DESC LIMIT 1) AS consentimiento_version
        FROM contactos_comunicacion c ${filtroContactos} ORDER BY c.actualizado_en DESC LIMIT ?3 OFFSET ?4`)
        .bind(buscarContactos, patronContactos, limiteContactos, desplazamientoContactos).all(),
      env.BASE.prepare(`SELECT COUNT(*) AS total FROM contactos_comunicacion c ${filtroContactos}`)
        .bind(buscarContactos, patronContactos).first(),
      env.BASE.prepare(`SELECT id, titulo, asunto, contenido_texto, temas_json, estado, programada_para, creado_por, aprobado_por, aprobado_en, enviado_en, creado_en, actualizado_en
        FROM campanas_comunicacion ORDER BY actualizado_en DESC LIMIT 200`).all(),
      env.BASE.prepare(`SELECT estado, COUNT(*) AS cantidad FROM cola_correos GROUP BY estado`).all(),
      env.BASE.prepare(`SELECT e.id, e.correo_id, e.proveedor, e.tipo, e.detalle, e.ocurrido_en, c.destinatario, c.asunto
        FROM eventos_correo e LEFT JOIN cola_correos c ON c.id = e.correo_id ORDER BY e.ocurrido_en DESC LIMIT 100`).all(),
      env.BASE.prepare("SELECT clave, estado FROM controles_operativos_cms WHERE categoria = 'correo'").all(),
    ])
    const preparacion = preparacionCorreoCms(controlesCorreo.results, env)
    return responder({
      acceso: { puede_gestionar: true, privacidad: 'operativa' },
      contactos: contactos.results.map((contacto) => ({ ...contacto, temas: String(contacto.temas || '').split(',').filter(Boolean) })),
      paginacion_contactos: {
        pagina: paginaContactos,
        por_pagina: limiteContactos,
        total: Number(totalContactos?.total || 0),
        paginas: Math.max(1, Math.ceil(Number(totalContactos?.total || 0) / limiteContactos)),
        busqueda: buscarContactos,
      },
      campanas: campanas.results,
      cola: cola.results,
      eventos: eventos.results,
      transporte: {
        modo: env.EMAIL_TRANSPORT === 'smtp' ? 'smtp' : 'sin_configurar',
        remitente_configurado: Boolean(env.EMAIL_FROM),
        smtp_configurado: preparacion.smtp_configurado,
        lista_para_enviar: preparacion.lista,
        controles_pendientes: preparacion.controles_pendientes,
      },
    }, 200, { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive' })
  }
  if (recurso === 'contactos' && id && accion === 'baja' && request.method === 'POST') {
    const contacto = await env.BASE.prepare('SELECT id, correo FROM contactos_comunicacion WHERE id = ?1').bind(id).first()
    if (!contacto) return error('No encontramos ese contacto.', 404)
    let datos; try { datos = await request.json() } catch { datos = {} }
    const motivo = textoCms(datos.motivo, 300)
    if (motivo.length < 5) return error('Explicá brevemente por qué se registra la baja.', 400)
    const ahora = instanteUtcSql()
    await env.BASE.batch([
      env.BASE.prepare("UPDATE contactos_comunicacion SET estado = 'baja', baja_en = ?2, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1").bind(id, ahora),
      env.BASE.prepare(`INSERT INTO supresiones_comunicacion (correo, motivo, origen) VALUES (?1, ?2, 'gestor')
        ON CONFLICT(correo) DO UPDATE SET motivo = excluded.motivo, origen = excluded.origen, creado_en = CURRENT_TIMESTAMP`).bind(contacto.correo, motivo),
      env.BASE.prepare('UPDATE preferencias_comunicacion SET habilitada = 0, actualizado_en = CURRENT_TIMESTAMP WHERE contacto_id = ?1').bind(id),
      env.BASE.prepare("UPDATE consentimientos_comunicacion SET estado = 'revocado', revocado_en = ?2 WHERE contacto_id = ?1 AND estado IN ('pendiente', 'aceptado')").bind(id, ahora),
      env.BASE.prepare("UPDATE cola_correos SET estado = 'suprimido', actualizado_en = CURRENT_TIMESTAMP WHERE contacto_id = ?1 AND estado IN ('pendiente', 'procesando')").bind(id),
    ])
    await registrar(env.BASE, sesion, 'registrar baja de comunicaciones', `contactos-comunicacion/${id}`, motivo)
    return responder({ baja: true })
  }
  if (recurso === 'contactos' && id && request.method === 'PATCH') {
    const contacto = await env.BASE.prepare('SELECT id, estado FROM contactos_comunicacion WHERE id = ?1').bind(id).first()
    if (!contacto) return error('No encontramos ese contacto.', 404)
    if (contacto.estado !== 'activo') return error('Solo se pueden ajustar temas de un contacto confirmado y activo.', 409)
    let datos; try { datos = await request.json() } catch { return error('Las preferencias no son válidas.', 400) }
    const temas = temasComunicacionValidos(datos.temas, [])
    await env.BASE.prepare('UPDATE preferencias_comunicacion SET habilitada = 0, actualizado_en = CURRENT_TIMESTAMP WHERE contacto_id = ?1').bind(id).run()
    for (const tema of temas) {
      await env.BASE.prepare(`INSERT INTO preferencias_comunicacion (contacto_id, tema, habilitada) VALUES (?1, ?2, 1)
        ON CONFLICT(contacto_id, tema) DO UPDATE SET habilitada = 1, actualizado_en = CURRENT_TIMESTAMP`).bind(id, tema).run()
    }
    await registrar(env.BASE, sesion, 'editar preferencias de comunicaciones', `contactos-comunicacion/${id}`, temas.join(', ') || 'Sin temas')
    return responder({ temas })
  }
  if (recurso === 'campanas' && request.method === 'POST' && !id) {
    let datos; try { datos = await request.json() } catch { return error('La campaña no es válida.', 400) }
    const resultado = campanaComunicacionDesde(datos)
    if (resultado.error) return error(resultado.error, 400)
    const campana = { id: crypto.randomUUID(), ...resultado.campana, estado: 'borrador', creado_por: sesion.correo }
    await env.BASE.prepare(`INSERT INTO campanas_comunicacion
      (id, titulo, asunto, contenido_texto, contenido_html, temas_json, estado, creado_por)
      VALUES (?1, ?2, ?3, ?4, '', ?5, 'borrador', ?6)`)
      .bind(campana.id, campana.titulo, campana.asunto, campana.contenido_texto, campana.temas_json, sesion.correo).run()
    await registrar(env.BASE, sesion, 'crear campaña', `campanas-comunicacion/${campana.id}`, campana.titulo)
    return responder({ campana }, 201)
  }
  if (recurso === 'campanas' && id && request.method === 'PATCH' && !accion) {
    const actual = await env.BASE.prepare('SELECT * FROM campanas_comunicacion WHERE id = ?1').bind(id).first()
    if (!actual) return error('No encontramos esa campaña.', 404)
    if (!['borrador', 'revision'].includes(actual.estado)) return error('Solo se puede editar una campaña en borrador o revisión.', 409)
    let datos; try { datos = await request.json() } catch { return error('La campaña no es válida.', 400) }
    const resultado = campanaComunicacionDesde(datos, actual)
    if (resultado.error) return error(resultado.error, 400)
    await env.BASE.prepare(`UPDATE campanas_comunicacion SET titulo = ?2, asunto = ?3, contenido_texto = ?4,
      contenido_html = '', temas_json = ?5, estado = 'borrador', aprobado_por = NULL, aprobado_en = NULL, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1`)
      .bind(id, resultado.campana.titulo, resultado.campana.asunto, resultado.campana.contenido_texto, resultado.campana.temas_json).run()
    await registrar(env.BASE, sesion, 'editar campaña', `campanas-comunicacion/${id}`, resultado.campana.titulo)
    return responder({ campana: { id, ...resultado.campana, estado: 'borrador' } })
  }
  if (recurso === 'campanas' && id && accion && request.method === 'POST') {
    const campana = await env.BASE.prepare('SELECT * FROM campanas_comunicacion WHERE id = ?1').bind(id).first()
    if (!campana) return error('No encontramos esa campaña.', 404)
    if (accion === 'solicitar-revision') {
      if (campana.estado !== 'borrador') return error('La campaña debe estar en borrador para solicitar revisión.', 409)
      await env.BASE.prepare("UPDATE campanas_comunicacion SET estado = 'revision', actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1").bind(id).run()
      await registrar(env.BASE, sesion, 'solicitar revisión de campaña', `campanas-comunicacion/${id}`, campana.titulo)
      return responder({ estado: 'revision' })
    }
    if (accion === 'aprobar') {
      if (campana.estado !== 'revision') return error('La campaña debe estar en revisión para aprobarla.', 409)
      if (campana.creado_por === sesion.correo) return error('Otra persona de Dirección o Administración debe aprobar esta campaña.', 409)
      const ahora = instanteUtcSql()
      await env.BASE.prepare("UPDATE campanas_comunicacion SET estado = 'aprobada', aprobado_por = ?2, aprobado_en = ?3, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1").bind(id, sesion.correo, ahora).run()
      await registrar(env.BASE, sesion, 'aprobar campaña', `campanas-comunicacion/${id}`, campana.titulo)
      return responder({ estado: 'aprobada' })
    }
    if (accion === 'cancelar') {
      if (['enviada', 'cancelada'].includes(campana.estado)) return error('La campaña ya no se puede cancelar.', 409)
      await env.BASE.batch([
        env.BASE.prepare("UPDATE campanas_comunicacion SET estado = 'cancelada', actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1").bind(id),
        env.BASE.prepare("UPDATE cola_correos SET estado = 'suprimido', actualizado_en = CURRENT_TIMESTAMP WHERE campana_id = ?1 AND estado IN ('pendiente', 'procesando')").bind(id),
      ])
      await registrar(env.BASE, sesion, 'cancelar campaña', `campanas-comunicacion/${id}`, campana.titulo)
      return responder({ estado: 'cancelada' })
    }
    if (accion === 'programar') {
      if (campana.estado !== 'aprobada') return error('La campaña debe estar aprobada antes de programarla.', 409)
      const controlesCorreo = await env.BASE.prepare("SELECT clave, estado FROM controles_operativos_cms WHERE categoria = 'correo'").all()
      const preparacion = preparacionCorreoCms(controlesCorreo.results, env)
      if (!preparacion.lista) return error('Antes de programar envíos, completá la configuración y los controles de correo en Operaciones.', 409)
      let datos; try { datos = await request.json() } catch { datos = {} }
      const solicitada = textoCms(datos.programada_para, 40)
      const fecha = solicitada ? new Date(solicitada) : new Date()
      if (Number.isNaN(fecha.getTime()) || fecha.getTime() < Date.now() - 60000) return error('Elegí una fecha futura válida.', 400)
      const programadaPara = instanteUtcSql(fecha)
      const temas = temasComunicacionValidos(JSON.parse(campana.temas_json || '[]'), [])
      if (!temas.length) return error('La campaña no tiene una audiencia válida.', 409)
      const marcadores = temas.map((_, indice) => `?${indice + 1}`).join(', ')
      const destinatarios = await env.BASE.prepare(`SELECT DISTINCT c.id, c.correo, c.token_baja
        FROM contactos_comunicacion c JOIN preferencias_comunicacion p ON p.contacto_id = c.id
        LEFT JOIN supresiones_comunicacion s ON s.correo = c.correo
        WHERE c.estado = 'activo' AND p.habilitada = 1 AND p.tema IN (${marcadores}) AND s.correo IS NULL`).bind(...temas).all()
      if (!destinatarios.results.length) return error('No hay contactos confirmados para los temas elegidos. La campaña sigue aprobada y no se creó ningún envío.', 409)
      const origen = origenPublicoComunicacion(request, env)
      const consultas = destinatarios.results.map((contacto) => {
        const enlaceBaja = `${origen}/api/comunicaciones/baja?token=${encodeURIComponent(contacto.token_baja)}`
        const texto = `${campana.contenido_texto}\n\nDejar de recibir estos correos: ${enlaceBaja}`
        const html = htmlCampanaDesdeTexto(campana.contenido_texto, enlaceBaja)
        return env.BASE.prepare(`INSERT INTO cola_correos
          (id, tipo, contacto_id, campana_id, destinatario, asunto, contenido_texto, contenido_html, estado, clave_idempotencia, proximo_intento)
          VALUES (?1, 'campana', ?2, ?3, ?4, ?5, ?6, ?7, 'pendiente', ?8, ?9)
          ON CONFLICT(clave_idempotencia) DO UPDATE SET clave_idempotencia = excluded.clave_idempotencia`)
          .bind(crypto.randomUUID(), contacto.id, id, contacto.correo, campana.asunto, texto, html, `campana:${id}:${contacto.id}`, programadaPara)
      })
      await env.BASE.batch([
        env.BASE.prepare("UPDATE campanas_comunicacion SET estado = 'programada', programada_para = ?2, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1").bind(id, programadaPara),
        ...consultas,
      ])
      await registrar(env.BASE, sesion, 'programar campaña', `campanas-comunicacion/${id}`, `${destinatarios.results.length} destinatarios`)
      return responder({ estado: 'programada', destinatarios: destinatarios.results.length, programada_para: programadaPara })
    }
  }
  return error('No se encontró esa operación de comunicaciones.', 404)
}

export function puedeVerOperacionesCms(sesion) {
  return ['administracion', 'direccion'].includes(perfilAccesoDe(sesion))
}

function correoOperativoVisible(correo, puedeVerDatos) {
  if (puedeVerDatos) return correo
  const [usuario = '', dominio = ''] = String(correo || '').split('@')
  return `${usuario.slice(0, 1) || '*'}***${dominio ? `@${dominio}` : ''}`
}

async function operacionesCms(contexto, sesion, ruta) {
  const { request, env } = contexto
  if (!tienePermiso(sesion, 'cms') || !puedeVerOperacionesCms(sesion)) return error('Solo Dirección o Administración puede abrir el centro de operaciones.', 403)
  const partes = ruta.split('/').filter(Boolean)
  const recurso = partes[2] || ''
  const id = partes[3] || ''
  const accion = partes[4] || ''

  if (!recurso && request.method === 'GET') {
    const puedeVerDatos = puedeVerRespuestasCms(sesion)
    const [ejecuciones, ultimaEjecucion, incidentes, controlesGuardados, cola, correosFallidos, indicadores, paginaPublicada] = await Promise.all([
      env.BASE.prepare(`SELECT id, trabajo, estado, iniciada_en, finalizada_en, encontrados, procesados, exitos,
        reintentados, fallidos, suprimidos, detalle, error FROM ejecuciones_sistema ORDER BY iniciada_en DESC LIMIT 50`).all(),
      env.BASE.prepare("SELECT id, trabajo, estado, iniciada_en, finalizada_en, encontrados, procesados, exitos, reintentados, fallidos, suprimidos, detalle, error FROM ejecuciones_sistema WHERE trabajo = 'cola_correos' ORDER BY iniciada_en DESC LIMIT 1").first(),
      env.BASE.prepare("SELECT id, clave, tipo, severidad, estado, titulo, detalle, fuente, ocurrencias, detectado_en, ultimo_en, resuelto_en, resuelto_por FROM incidentes_operativos_cms ORDER BY CASE estado WHEN 'abierto' THEN 0 ELSE 1 END, ultimo_en DESC LIMIT 100").all(),
      env.BASE.prepare('SELECT clave, categoria, estado, detalle, evidencia, actualizado_por, actualizado_en FROM controles_operativos_cms ORDER BY categoria, clave').all(),
      env.BASE.prepare('SELECT estado, COUNT(*) AS cantidad FROM cola_correos GROUP BY estado').all(),
      puedeVerDatos
        ? env.BASE.prepare("SELECT id, tipo, destinatario, asunto, intentos, ultimo_error, actualizado_en FROM cola_correos WHERE estado = 'fallido' ORDER BY actualizado_en DESC LIMIT 50").all()
        : Promise.resolve({ results: [] }),
      env.BASE.prepare(`SELECT
        (SELECT COUNT(*) FROM formularios_cms WHERE estado = 'activa') AS formularios_activos,
        (SELECT COUNT(*) FROM entradas_cms WHERE estado != 'cerrada') AS entradas_abiertas,
        (SELECT COUNT(*) FROM contactos_comunicacion WHERE estado = 'activo') AS contactos_activos,
        (SELECT COUNT(*) FROM contactos_comunicacion WHERE estado = 'pendiente') AS contactos_pendientes,
        (SELECT COUNT(*) FROM solicitudes_privacidad_cms WHERE estado NOT IN ('cerrada', 'rechazada')) AS privacidad_pendiente`).first(),
      env.BASE.prepare("SELECT revision, actualizado_en FROM documentos WHERE ruta = 'pagina-web/publicada.json'").first(),
    ])
    const controles = controlesOperativosConEstado(controlesGuardados.results)
    const colaResultados = cola.results || []
    const pendientes = colaResultados.filter((fila) => ['pendiente', 'procesando'].includes(fila.estado)).reduce((total, fila) => total + Number(fila.cantidad || 0), 0)
    const smtpConfigurado = env.EMAIL_TRANSPORT === 'smtp' && Boolean(env.EMAIL_FROM && env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD)
    const trabajoCorreo = estadoTrabajoCorreo({
      smtpConfigurado,
      ultimaEjecucion,
      pendientes,
      minutosParaAlerta: Math.max(5, Number(env.EMAIL_JOB_STALE_AFTER_MINUTES || 15)),
    })
    const controlPorClave = Object.fromEntries(controles.map((control) => [control.clave, control]))
    const estadoDeControl = (clave) => controlPorClave[clave]?.estado === 'confirmado' ? 'saludable' : controlPorClave[clave]?.estado === 'bloqueado' ? 'critico' : 'pendiente'
    const integraciones = [
      { clave: 'base', nombre: 'Base institucional', estado: 'saludable', detalle: 'MariaDB respondió y las consultas operativas están disponibles.' },
      { clave: 'formularios', nombre: 'Formularios y seguimiento', estado: Number(indicadores?.formularios_activos || 0) > 0 ? 'saludable' : 'pendiente', detalle: `${Number(indicadores?.formularios_activos || 0)} formularios activos y ${Number(indicadores?.entradas_abiertas || 0)} respuestas abiertas.` },
      { clave: 'pagina_web', nombre: 'Página pública', estado: paginaPublicada ? 'saludable' : 'pendiente', detalle: paginaPublicada ? `Publicación institucional disponible, revisión ${paginaPublicada.revision}.` : 'Todavía no hay una publicación institucional registrada.' },
      { clave: 'correo', nombre: 'Correo y campañas', ...trabajoCorreo },
      { clave: 'dominio', nombre: 'Reputación del dominio', estado: estadoDeControl('correo_dmarc'), detalle: controlPorClave.correo_dmarc?.evidencia || 'Falta registrar la verificación de DMARC.' },
      { clave: 'privacidad', nombre: 'Privacidad', estado: Number(indicadores?.privacidad_pendiente || 0) > 0 ? 'advertencia' : 'saludable', detalle: `${Number(indicadores?.privacidad_pendiente || 0)} solicitudes requieren seguimiento.` },
      { clave: 'publicacion', nombre: 'Publicación automática', estado: estadoDeControl('publicacion_sftp'), detalle: controlPorClave.publicacion_sftp?.evidencia || 'Falta registrar una publicación automática verificada.' },
    ]
    const datos = {
      acceso: { puede_administrar: esAdmin(sesion), puede_ver_datos: puedeVerDatos },
      version: env.VERSION_APLICACION || null,
      indicadores: {
        formularios_activos: Number(indicadores?.formularios_activos || 0), entradas_abiertas: Number(indicadores?.entradas_abiertas || 0),
        contactos_activos: Number(indicadores?.contactos_activos || 0), contactos_pendientes: Number(indicadores?.contactos_pendientes || 0),
        privacidad_pendiente: Number(indicadores?.privacidad_pendiente || 0),
      },
      integraciones, controles, cola: colaResultados,
      correosFallidos: (correosFallidos.results || []).map((fila) => ({ ...fila, destinatario: correoOperativoVisible(fila.destinatario, puedeVerDatos) })),
      ejecuciones: ejecuciones.results || [], incidentes: incidentes.results || [],
    }
    datos.resumen = resumenOperativo(datos)
    return responder(datos, 200, { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive' })
  }

  if (!esAdmin(sesion)) return error('Solo Administración puede ejecutar acciones de recuperación o confirmar controles.', 403)
  if (recurso === 'controles' && id && request.method === 'PATCH') {
    let datos
    try { datos = await request.json() } catch { return error('El estado del control no es válido.', 400) }
    const resultado = controlOperativoDesde(datos, id)
    if (resultado.error) return error(resultado.error, 400)
    const control = resultado.control
    await env.BASE.prepare(`INSERT INTO controles_operativos_cms
      (clave, categoria, estado, detalle, evidencia, actualizado_por)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6)
      ON CONFLICT(clave) DO UPDATE SET categoria = excluded.categoria, estado = excluded.estado,
        detalle = excluded.detalle, evidencia = excluded.evidencia, actualizado_por = excluded.actualizado_por,
        actualizado_en = CURRENT_TIMESTAMP`)
      .bind(control.clave, control.categoria, control.estado, control.detalle, control.evidencia, sesion.correo).run()
    await registrar(env.BASE, sesion, 'actualizar control operativo', `operaciones/controles/${id}`, `${control.estado}: ${control.evidencia || control.detalle}`)
    return responder({ control: { ...control, actualizado_por: sesion.correo } })
  }
  if (recurso === 'correos' && id && accion === 'reintentar' && request.method === 'POST') {
    const correo = await env.BASE.prepare('SELECT id, asunto, estado FROM cola_correos WHERE id = ?1').bind(id).first()
    if (!correo) return error('No encontramos ese correo.', 404)
    if (correo.estado !== 'fallido') return error('Solo se puede reintentar un correo fallido.', 409)
    await env.BASE.prepare("UPDATE cola_correos SET estado = 'pendiente', intentos = 0, proximo_intento = CURRENT_TIMESTAMP, ultimo_error = '', actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1").bind(id).run()
    await registrar(env.BASE, sesion, 'reintentar correo fallido', `operaciones/correos/${id}`, correo.asunto)
    return responder({ reintentado: true })
  }
  if (recurso === 'incidentes' && id && accion === 'resolver' && request.method === 'POST') {
    const incidente = await env.BASE.prepare('SELECT id, titulo, estado FROM incidentes_operativos_cms WHERE id = ?1').bind(id).first()
    if (!incidente) return error('No encontramos ese incidente.', 404)
    if (incidente.estado !== 'abierto') return error('El incidente ya no está abierto.', 409)
    await env.BASE.prepare("UPDATE incidentes_operativos_cms SET estado = 'resuelto', resuelto_en = CURRENT_TIMESTAMP, resuelto_por = ?2 WHERE id = ?1").bind(id, sesion.correo).run()
    await registrar(env.BASE, sesion, 'resolver incidente operativo', `operaciones/incidentes/${id}`, incidente.titulo)
    return responder({ resuelto: true })
  }
  return error('No se encontró esa operación del centro de operaciones.', 404)
}

async function cms(contexto, sesion, ruta) {
  if (!tienePermiso(sesion, 'cms')) return error('Tu cuenta no puede acceder al CMS institucional.', 403)
  const { request, env } = contexto
  const partes = ruta.split('/').filter(Boolean)
  const recurso = partes[1] ?? 'tablero'
  const id = partes[2] ?? null
  const alcance = await alcanceCmsDe(env.BASE, sesion)

  if (recurso === 'pagina-web') return paginaWebCms(contexto, sesion, id)
  if (recurso === 'finanzas-fsb') return finanzasFsbCms(contexto, sesion, partes, alcance)

  const intentaCrearTareaDirecta = recurso === 'tareas' && !id && request.method === 'POST'
  if (esSoloConsultaCms(sesion) && request.method !== 'GET' && !intentaCrearTareaDirecta) {
    return error('El perfil de consulta solo puede leer la agenda y los documentos compartidos.', 403)
  }
  if (alcance.perfil === 'integrante' && request.method !== 'GET'
    && !(recurso === 'notificaciones'
      || recurso === 'alertas-pospuestas'
      || recurso === 'avisos-manuales'
      || recurso === 'capacidad'
      || (recurso === 'tareas' && id && request.method === 'PATCH')
      || (recurso === 'tareas' && !id && request.method === 'POST')
      || (recurso === 'tareas' && id && partes[3] === 'comentarios' && request.method === 'POST'))) {
    return error('El perfil de integrante solo puede actualizar sus propias tareas.', 403)
  }
  if (!alcance.global && ['equipos', 'responsabilidades', 'unidades'].includes(recurso) && request.method !== 'GET') {
    return error('Solo Dirección o Administración puede cambiar la estructura institucional.', 403)
  }

  if (recurso === 'permisos-tareas') {
    if (!esAdmin(sesion)) return error('Solo Administración puede cambiar quién crea tareas.', 403)
    if (request.method === 'GET') {
      const politicas = await env.BASE.prepare(`SELECT capacidad, alcance_tipo, alcance_id, efecto, creado_por, actualizado_en
        FROM permisos_capacidades_cms WHERE capacidad = ?1
        ORDER BY alcance_tipo, alcance_id COLLATE NOCASE`).bind(CAPACIDAD_CREAR_TAREAS).all()
      return responder({ capacidad: CAPACIDAD_CREAR_TAREAS, politicas: politicas.results || [], predeterminados: { administracion: 'permitir', direccion: 'bloquear', coordinacion: 'bloquear', integrante: 'bloquear', consulta: 'bloquear' } })
    }
    if (request.method === 'PUT') {
      let datos
      try { datos = await request.json() } catch { return error('La regla de creación de tareas no es válida.', 400) }
      const alcanceTipo = textoCms(datos.alcance_tipo, 30)
      const alcanceId = textoCms(datos.alcance_id, 191).toLowerCase()
      const efecto = textoCms(datos.efecto, 30)
      if (!['perfil', 'equipo', 'usuario'].includes(alcanceTipo) || !alcanceId || !['permitir', 'bloquear', 'heredar'].includes(efecto)) {
        return error('Elegí un grupo o una persona y una regla válida.', 400)
      }
      if (alcanceTipo === 'perfil' && !PERFILES_ACCESO.includes(alcanceId)) return error('El perfil elegido no es válido.', 400)
      if (alcanceTipo === 'equipo') {
        const equipo = await env.BASE.prepare('SELECT id FROM equipos WHERE id = ?1 AND activo = 1').bind(alcanceId).first()
        if (!equipo) return error('El equipo elegido ya no está disponible.', 400)
      }
      if (alcanceTipo === 'usuario') {
        const cuenta = await env.BASE.prepare('SELECT correo FROM usuarios WHERE correo = ?1 AND activo = 1').bind(alcanceId).first()
        if (!cuenta) return error('La persona elegida ya no tiene un acceso activo.', 400)
      }
      if (efecto === 'heredar') {
        await env.BASE.prepare('DELETE FROM permisos_capacidades_cms WHERE capacidad = ?1 AND alcance_tipo = ?2 AND alcance_id = ?3')
          .bind(CAPACIDAD_CREAR_TAREAS, alcanceTipo, alcanceId).run()
      } else {
        await env.BASE.prepare(`INSERT INTO permisos_capacidades_cms
          (id, capacidad, alcance_tipo, alcance_id, efecto, creado_por)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6)
          ON CONFLICT(capacidad, alcance_tipo, alcance_id) DO UPDATE SET
            efecto = excluded.efecto, creado_por = excluded.creado_por, actualizado_en = CURRENT_TIMESTAMP`)
          .bind(crypto.randomUUID(), CAPACIDAD_CREAR_TAREAS, alcanceTipo, alcanceId, efecto, sesion.correo).run()
      }
      await registrar(env.BASE, sesion, 'cambiar permiso para crear tareas', `permisos-tareas/${alcanceTipo}/${alcanceId}`, efecto)
      return responder({ guardada: true, capacidad: CAPACIDAD_CREAR_TAREAS, alcance_tipo: alcanceTipo, alcance_id: alcanceId, efecto })
    }
    return error('Método no permitido.', 405)
  }

  if (recurso === 'notificaciones' && id === 'resumen' && request.method === 'GET') {
    const resumen = await env.BASE.prepare(`SELECT COUNT(*) AS pendientes, MAX(creado_en) AS ultima
      FROM notificaciones_cms WHERE usuario_correo = ?1 AND leida_en IS NULL`).bind(sesion.correo).first()
    return responder({ pendientes: Number(resumen?.pendientes || 0), ultima: resumen?.ultima || null })
  }

  if (recurso === 'avisos-manuales' && request.method === 'POST') {
    let datos
    try { datos = await request.json() } catch { return error('El aviso manual no es válido.', 400) }
    const tareaId = textoCms(datos.tarea_id, 100)
    const equipoId = textoCms(datos.equipo_id, 100)
    if (tareaId) {
      const tarea = await env.BASE.prepare('SELECT id, titulo, descripcion, equipo_id, responsable_correo FROM tareas_cms WHERE id = ?1').bind(tareaId).first()
      if (!tarea || !puedeVerTareaCms(alcance, sesion, tarea)) return error('No encontramos esa tarea.', 404)
      if (esTareaDerivadaDeEntradaCms(tarea) && !puedeVerRespuestasCms(sesion)) return error('Necesitás acceso vigente a datos personales para preparar este aviso.', 403)
      await registrar(env.BASE, sesion, 'copiar aviso manual de tarea', `tareas/${tarea.id}`, tarea.titulo)
      return responder({ registrado: true })
    }
    if (equipoId) {
      const equipo = await env.BASE.prepare('SELECT id, nombre FROM equipos WHERE id = ?1 AND activo = 1').bind(equipoId).first()
      if (!equipo || !puedeVerEquipoCms(alcance, equipo.id)) return error('No encontramos ese equipo.', 404)
      await registrar(env.BASE, sesion, 'copiar resumen manual de equipo', `equipos/${equipo.id}`, equipo.nombre)
      return responder({ registrado: true })
    }
    return error('Elegí una tarea o un equipo para preparar el aviso.', 400)
  }

  if (recurso === 'solicitudes-privacidad') {
    if (!esAdmin(sesion)) return error('Solo Administración puede gestionar solicitudes de privacidad.', 403)
    if (!puedeGestionarSolicitudesPrivacidadCms(sesion)) return error('Necesitás acceso sensible vigente para abrir solicitudes de privacidad.', 403)
    if (request.method === 'GET' && !id) {
      const filas = await env.BASE.prepare(`SELECT s.*, u.nombre AS responsable_nombre
        FROM solicitudes_privacidad_cms s
        LEFT JOIN usuarios u ON u.correo = s.responsable_correo
        ORDER BY s.estado IN ('cerrada', 'rechazada'), s.actualizado_en DESC LIMIT 100`).all()
      return responder({ solicitudes: filas.results })
    }
    if (request.method === 'POST' && !id) {
      let datos
      try { datos = await request.json() } catch { return error('Los datos de la solicitud no son válidos.', 400) }
      const resultado = solicitudPrivacidadCmsDesde(datos)
      if (resultado.error) return error(resultado.error, 400)
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, { responsable_correo: resultado.solicitud.responsable_correo })
      if (referenciaInvalida) return error(referenciaInvalida, 400)
      const solicitud = { id: crypto.randomUUID(), ...resultado.solicitud, estado: 'recibida', creado_por: sesion.correo }
      await env.BASE.prepare(`INSERT INTO solicitudes_privacidad_cms
        (id, tipo, solicitante_nombre, contacto, canal, alcance, estado, responsable_correo, fecha_objetivo, creado_por)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`)
        .bind(solicitud.id, solicitud.tipo, solicitud.solicitante_nombre, solicitud.contacto, solicitud.canal, solicitud.alcance, solicitud.estado, solicitud.responsable_correo, solicitud.fecha_objetivo, solicitud.creado_por).run()
      await registrar(env.BASE, sesion, 'registrar solicitud de privacidad', `solicitudes-privacidad/${solicitud.id}`, solicitud.tipo === 'copia' ? 'Solicitud de copia' : 'Solicitud de eliminación')
      return responder({ solicitud }, 201)
    }
    if (request.method === 'PATCH' && id) {
      const actual = await env.BASE.prepare('SELECT * FROM solicitudes_privacidad_cms WHERE id = ?1').bind(id).first()
      if (!actual) return error('No encontramos esa solicitud de privacidad.', 404)
      let datos
      try { datos = await request.json() } catch { return error('El avance de la solicitud no es válido.', 400) }
      const avance = avanceSolicitudPrivacidadCms(actual, datos.accion, datos.nota)
      if (avance.error) return error(avance.error, 400)
      const ahora = instanteUtcSql()
      const verificadaEn = datos.accion === 'verificar_identidad' ? ahora : actual.identidad_verificada_en
      const verificadaPor = datos.accion === 'verificar_identidad' ? sesion.correo : actual.identidad_verificada_por
      const cerradaEn = ['cerrar', 'rechazar'].includes(datos.accion) ? ahora : actual.cerrada_en
      const notaRevision = avance.nota || actual.nota_revision || ''
      const constancia = ['cerrar', 'rechazar'].includes(datos.accion) ? avance.nota : actual.constancia || ''
      await env.BASE.prepare(`UPDATE solicitudes_privacidad_cms SET estado = ?2, nota_revision = ?3, constancia = ?4,
        identidad_verificada_en = ?5, identidad_verificada_por = ?6, cerrada_en = ?7, actualizado_en = CURRENT_TIMESTAMP
        WHERE id = ?1`).bind(id, avance.estado, notaRevision, constancia, verificadaEn, verificadaPor, cerradaEn).run()
      await registrar(env.BASE, sesion, 'avanzar solicitud de privacidad', `solicitudes-privacidad/${id}`, avance.estado)
      return responder({ solicitud: { ...actual, estado: avance.estado, nota_revision: notaRevision, constancia, identidad_verificada_en: verificadaEn, identidad_verificada_por: verificadaPor, cerrada_en: cerradaEn } })
    }
    return error('Método no permitido.', 405)
  }

  if (recurso === 'tablero' && request.method === 'GET') {
    const [tareas, proyectos, equipos, responsables, responsabilidades, reuniones, decisiones, documentos, entradas, formularios, alianzas, programas, eventos, plantillas, riesgos, hitos, gastos, eventosParaConflictos, notificaciones, recurrencias, automatizaciones, alertasPospuestas, comunicados, revisionSemanal, capacidad, metricasTareas, politicasTareas] = await Promise.all([
      env.BASE.prepare(`
        SELECT t.*, e.nombre AS equipo_nombre, e.color AS equipo_color, o.nombre AS unidad_nombre, o.sigla AS unidad_sigla, p.titulo AS proyecto_titulo, a.titulo AS evento_titulo,
          u.nombre AS responsable_nombre, s.nombre AS solicitante_nombre,
          (SELECT COUNT(*) FROM comentarios_tarea_cms c WHERE c.tarea_id = t.id) AS comentarios_total,
          (SELECT COUNT(*) FROM tareas_dependencias_cms d JOIN tareas_cms previa ON previa.id = d.depende_de_id
            WHERE d.tarea_id = t.id AND previa.estado NOT IN ('completada', 'cancelada')) AS dependencias_pendientes
        FROM tareas_cms t
        LEFT JOIN equipos e ON e.id = t.equipo_id
        LEFT JOIN unidades_operativas_cms o ON o.id = t.unidad_id
        LEFT JOIN proyectos_cms p ON p.id = t.proyecto_id
        LEFT JOIN eventos_cms a ON a.id = t.evento_id
        LEFT JOIN usuarios u ON u.correo = t.responsable_correo
        LEFT JOIN usuarios s ON s.correo = t.solicitante_correo
        ORDER BY CASE WHEN t.estado IN ('completada', 'cancelada') THEN 1 ELSE 0 END,
          CASE t.prioridad WHEN 'urgente' THEN 0 WHEN 'alta' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
          CASE WHEN t.estado IN ('completada', 'cancelada') THEN COALESCE(t.completado_en, t.actualizado_en) END DESC,
          CASE WHEN t.estado NOT IN ('completada', 'cancelada') THEN t.fecha_limite IS NULL END,
          CASE WHEN t.estado NOT IN ('completada', 'cancelada') THEN t.fecha_limite END,
          t.actualizado_en DESC LIMIT 200
      `).all(),
      env.BASE.prepare(`SELECT p.*, e.nombre AS equipo_nombre, o.nombre AS unidad_nombre, o.sigla AS unidad_sigla, g.nombre AS programa_nombre, u.nombre AS responsable_nombre,
          (SELECT COUNT(*) FROM proyecto_hitos_cms h WHERE h.proyecto_id = p.id AND h.estado != 'cancelado') AS hitos_total,
          (SELECT COUNT(*) FROM proyecto_hitos_cms h WHERE h.proyecto_id = p.id AND h.estado = 'completado') AS hitos_completados,
          (SELECT COALESCE(SUM(g.monto), 0) FROM proyecto_gastos_cms g WHERE g.proyecto_id = p.id) AS presupuesto_ejecutado
        FROM proyectos_cms p LEFT JOIN equipos e ON e.id = p.equipo_id LEFT JOIN unidades_operativas_cms o ON o.id = p.unidad_id LEFT JOIN programas_cms g ON g.id = p.programa_id LEFT JOIN usuarios u ON u.correo = p.responsable_correo
        WHERE p.estado IN ('borrador', 'en_marcha', 'en_pausa') ORDER BY p.fecha_fin IS NULL, p.fecha_fin, p.actualizado_en DESC`).all(),
      env.BASE.prepare(`SELECT id, clave, nombre, categoria, descripcion, color, decisiones_permitidas, debe_escalar, informa_a, frecuencia_reunion
        FROM equipos WHERE activo = 1 ORDER BY nombre COLLATE NOCASE`).all(),
      env.BASE.prepare('SELECT correo, nombre, rol FROM usuarios WHERE activo = 1 ORDER BY nombre COLLATE NOCASE').all(),
      env.BASE.prepare(`SELECT r.*, u.nombre AS usuario_nombre FROM responsabilidades_equipo r
        JOIN usuarios u ON u.correo = r.usuario_correo
        WHERE r.activo = 1 ORDER BY r.equipo_id, CASE r.tipo WHEN 'coordinacion' THEN 0 WHEN 'referente' THEN 1 WHEN 'sustitucion' THEN 2 ELSE 3 END, u.nombre COLLATE NOCASE`).all(),
      env.BASE.prepare(`SELECT r.*, e.nombre AS equipo_nombre, e.categoria AS equipo_categoria, p.titulo AS proyecto_titulo
        FROM reuniones_cms r
        LEFT JOIN equipos e ON e.id = r.equipo_id
        LEFT JOIN proyectos_cms p ON p.id = r.proyecto_id
        WHERE r.estado != 'cancelada'
        ORDER BY r.fecha_hora ASC LIMIT 12`).all(),
      env.BASE.prepare(`SELECT d.*, r.titulo AS reunion_titulo, r.equipo_id, r.proyecto_id, e.nombre AS equipo_nombre, p.titulo AS proyecto_titulo, u.nombre AS responsable_nombre
        FROM decisiones_cms d
        JOIN reuniones_cms r ON r.id = d.reunion_id
        LEFT JOIN equipos e ON e.id = r.equipo_id
        LEFT JOIN proyectos_cms p ON p.id = r.proyecto_id
        LEFT JOIN usuarios u ON u.correo = d.responsable_correo
        WHERE d.estado != 'superada'
        ORDER BY d.actualizado_en DESC LIMIT 12`).all(),
      env.BASE.prepare(`SELECT d.*, e.nombre AS equipo_nombre, p.titulo AS proyecto_titulo, u.nombre AS creador_nombre FROM documentos_cms d
        LEFT JOIN equipos e ON e.id = d.equipo_id LEFT JOIN proyectos_cms p ON p.id = d.proyecto_id LEFT JOIN usuarios u ON u.correo = d.creado_por
        ORDER BY d.actualizado_en DESC LIMIT 12`).all(),
      env.BASE.prepare(`SELECT i.*, e.nombre AS equipo_nombre, es.nombre AS equipo_solicitante_nombre, p.titulo AS proyecto_titulo, t.titulo AS tarea_titulo,
          f.titulo AS formulario_titulo, u.nombre AS cumplida_por_nombre
        FROM entradas_cms i
        LEFT JOIN equipos e ON e.id = i.equipo_id LEFT JOIN proyectos_cms p ON p.id = i.proyecto_id LEFT JOIN tareas_cms t ON t.id = i.tarea_id
        LEFT JOIN equipos es ON es.id = i.equipo_solicitante_id
        LEFT JOIN formularios_cms f ON f.id = i.formulario_id
        LEFT JOIN usuarios u ON u.correo = i.cumplida_por
        ORDER BY CASE WHEN i.estado = 'cerrada' THEN 1 ELSE 0 END, COALESCE(i.cumplida_en, i.creado_en) DESC LIMIT 120`).all(),
      env.BASE.prepare(`SELECT f.*, e.nombre AS equipo_nombre, p.titulo AS proyecto_titulo,
          (SELECT COUNT(*) FROM entradas_cms i WHERE i.formulario_id = f.id) AS respuestas_total
        FROM formularios_cms f
        LEFT JOIN equipos e ON e.id = f.equipo_id LEFT JOIN proyectos_cms p ON p.id = f.proyecto_id
        ORDER BY f.actualizado_en DESC LIMIT 24`).all(),
      env.BASE.prepare(`SELECT a.*, e.nombre AS equipo_nombre, p.titulo AS proyecto_titulo, u.nombre AS creador_nombre
        FROM alianzas_cms a
        LEFT JOIN equipos e ON e.id = a.equipo_id
        LEFT JOIN proyectos_cms p ON p.id = a.proyecto_id
        LEFT JOIN usuarios u ON u.correo = a.creado_por
        ORDER BY CASE a.estado WHEN 'activa' THEN 0 WHEN 'en_pausa' THEN 1 ELSE 2 END, a.nombre COLLATE NOCASE LIMIT 48`).all(),
      env.BASE.prepare(`SELECT p.*, e.nombre AS equipo_nombre, u.nombre AS creador_nombre
        FROM programas_cms p
        LEFT JOIN equipos e ON e.id = p.equipo_id
        LEFT JOIN usuarios u ON u.correo = p.creado_por
        ORDER BY CASE p.estado WHEN 'activo' THEN 0 WHEN 'en_pausa' THEN 1 WHEN 'borrador' THEN 2 ELSE 3 END, p.nombre COLLATE NOCASE LIMIT 48`).all(),
      env.BASE.prepare(`SELECT e.*, q.nombre AS equipo_nombre, p.titulo AS proyecto_titulo, u.nombre AS responsable_nombre,
          (SELECT i.id FROM entradas_cms i WHERE i.evento_id = e.id LIMIT 1) AS entrada_id,
          (SELECT COUNT(*) FROM tareas_cms t WHERE t.evento_id = e.id AND t.estado != 'cancelada') AS tareas_total,
          (SELECT COUNT(*) FROM tareas_cms t WHERE t.evento_id = e.id AND t.estado = 'completada') AS tareas_completadas,
          (SELECT COUNT(*) FROM tareas_cms t WHERE t.evento_id = e.id AND t.estado NOT IN ('completada', 'cancelada')) AS tareas_pendientes
        FROM eventos_cms e
        LEFT JOIN equipos q ON q.id = e.equipo_id
        LEFT JOIN proyectos_cms p ON p.id = e.proyecto_id
        LEFT JOIN usuarios u ON u.correo = e.responsable_correo
        WHERE e.estado != 'cancelado' AND e.fecha_hora >= datetime('now', '-1 day')
        ORDER BY e.fecha_hora ASC LIMIT 12`).all(),
      env.BASE.prepare(`SELECT p.*, e.nombre AS equipo_nombre, COUNT(i.id) AS cantidad_tareas
        FROM plantillas_tareas_cms p
        LEFT JOIN equipos e ON e.id = p.equipo_id
        LEFT JOIN plantilla_tareas_items_cms i ON i.plantilla_id = p.id
        GROUP BY p.id
        ORDER BY p.actualizado_en DESC LIMIT 12`).all(),
      env.BASE.prepare(`SELECT r.*, p.titulo AS proyecto_titulo, u.nombre AS responsable_nombre
        FROM proyecto_riesgos_cms r
        JOIN proyectos_cms p ON p.id = r.proyecto_id
        LEFT JOIN usuarios u ON u.correo = r.responsable_correo
        WHERE r.estado != 'mitigado'
        ORDER BY CASE r.nivel WHEN 'critico' THEN 0 WHEN 'alto' THEN 1 WHEN 'medio' THEN 2 ELSE 3 END,
          r.fecha_revision IS NULL, r.fecha_revision, r.actualizado_en DESC LIMIT 24`).all(),
      env.BASE.prepare(`SELECT h.*, p.titulo AS proyecto_titulo, u.nombre AS responsable_nombre
        FROM proyecto_hitos_cms h JOIN proyectos_cms p ON p.id = h.proyecto_id
        LEFT JOIN usuarios u ON u.correo = h.responsable_correo
        WHERE h.estado != 'cancelado'
        ORDER BY h.fecha_objetivo IS NULL, h.fecha_objetivo, h.actualizado_en DESC LIMIT 36`).all(),
      env.BASE.prepare(`SELECT g.*, p.titulo AS proyecto_titulo
        FROM proyecto_gastos_cms g JOIN proyectos_cms p ON p.id = g.proyecto_id
        ORDER BY g.fecha DESC, g.creado_en DESC LIMIT 60`).all(),
      env.BASE.prepare(`SELECT e.id, e.titulo, e.fecha_hora, e.fecha_fin, e.lugar, e.equipo_id, e.responsable_correo, e.estado, e.serie_id, e.generada_para,
          (SELECT i.id FROM entradas_cms i WHERE i.evento_id = e.id LIMIT 1) AS entrada_id
        FROM eventos_cms e
        WHERE e.estado = 'planificado' AND e.fecha_hora >= datetime('now', '-1 day')
        ORDER BY fecha_hora ASC LIMIT 90`).all(),
      env.BASE.prepare(`SELECT n.*, t.titulo AS tarea_titulo, t.descripcion AS tarea_descripcion
        FROM notificaciones_cms n
        LEFT JOIN tareas_cms t ON t.id = n.tarea_id
        WHERE n.usuario_correo = ?1
        ORDER BY n.leida_en IS NOT NULL, n.creado_en DESC LIMIT 16`).bind(sesion.correo).all(),
      env.BASE.prepare(`SELECT r.*, e.nombre AS equipo_nombre, p.titulo AS proyecto_titulo, u.nombre AS responsable_nombre
        FROM tareas_recurrentes_cms r
        LEFT JOIN equipos e ON e.id = r.equipo_id LEFT JOIN proyectos_cms p ON p.id = r.proyecto_id LEFT JOIN usuarios u ON u.correo = r.responsable_correo
        WHERE r.activo = 1 ORDER BY r.proxima_fecha ASC LIMIT 24`).all(),
      env.BASE.prepare(`SELECT x.*, r.equipo_id, r.titulo AS recurrencia_titulo, e.nombre AS equipo_nombre
        FROM automatizaciones_ejecuciones_cms x
        JOIN tareas_recurrentes_cms r ON r.id = x.recurrencia_id
        LEFT JOIN equipos e ON e.id = r.equipo_id
        WHERE x.estado = 'fallida'
        ORDER BY x.actualizado_en DESC LIMIT 24`).all(),
      env.BASE.prepare(`SELECT clave, postergada_hasta
        FROM alertas_pospuestas_cms
        WHERE usuario_correo = ?1 AND postergada_hasta >= date('now')
        ORDER BY postergada_hasta ASC LIMIT 24`).bind(sesion.correo).all(),
      env.BASE.prepare(`SELECT c.*, e.nombre AS equipo_nombre, u.nombre AS creador_nombre
        FROM comunicados_cms c
        LEFT JOIN equipos e ON e.id = c.equipo_id
        LEFT JOIN usuarios u ON u.correo = c.creado_por
        WHERE c.estado = 'activo' AND (c.vence_el IS NULL OR c.vence_el >= date('now'))
        ORDER BY CASE c.prioridad WHEN 'urgente' THEN 0 ELSE 1 END, c.creado_en DESC LIMIT 24`).all(),
      env.BASE.prepare(`SELECT r.*, u.nombre AS revisado_por_nombre FROM revisiones_semanales_cms r
        LEFT JOIN usuarios u ON u.correo = r.revisado_por WHERE r.semana_inicio = date('now')`).first(),
      env.BASE.prepare(`SELECT u.correo AS usuario_correo, u.nombre AS usuario_nombre,
          c.horas_semanales, c.nota, c.actualizado_en,
          COUNT(t.id) AS tareas_abiertas,
          COALESCE(SUM(CASE WHEN t.esfuerzo_horas IS NOT NULL THEN t.esfuerzo_horas ELSE 0 END), 0) AS horas_asignadas,
          COALESCE(SUM(CASE WHEN t.id IS NOT NULL AND t.esfuerzo_horas IS NULL THEN 1 ELSE 0 END), 0) AS tareas_sin_estimacion
        FROM usuarios u
        LEFT JOIN capacidad_trabajo_cms c ON c.usuario_correo = u.correo
        LEFT JOIN tareas_cms t ON t.responsable_correo = u.correo AND t.estado NOT IN ('completada', 'cancelada')
        WHERE u.activo = 1
        GROUP BY u.correo, u.nombre, c.horas_semanales, c.nota, c.actualizado_en
        ORDER BY u.nombre COLLATE NOCASE`).all(),
      env.BASE.prepare(`SELECT id, estado, equipo_id, responsable_correo, fecha_limite, fecha_seguimiento, creado_en, asignado_en, completado_en
        FROM tareas_cms
        WHERE creado_en >= datetime('now', '-180 days') OR estado NOT IN ('completada', 'cancelada')
        ORDER BY creado_en DESC LIMIT 240`).all(),
      env.BASE.prepare(`SELECT capacidad, alcance_tipo, alcance_id, efecto
        FROM permisos_capacidades_cms WHERE capacidad = ?1`).bind(CAPACIDAD_CREAR_TAREAS).all(),
    ])
    const [unidades, vistasUnidades] = await Promise.all([
      env.BASE.prepare(`SELECT u.*, e.nombre AS equipo_nombre, p.nombre AS unidad_padre_nombre
        FROM unidades_operativas_cms u
        JOIN equipos e ON e.id = u.equipo_id
        LEFT JOIN unidades_operativas_cms p ON p.id = u.unidad_padre_id
        WHERE u.estado != 'archivada'
        ORDER BY e.nombre COLLATE NOCASE, u.orden, u.nombre COLLATE NOCASE`).all(),
      env.BASE.prepare(`SELECT v.unidad_id, v.equipo_id, v.enfoque, e.nombre AS equipo_nombre
        FROM unidades_vistas_equipo_cms v JOIN equipos e ON e.id = v.equipo_id
        ORDER BY v.unidad_id, v.enfoque`).all(),
    ])
    const deEquipo = (fila) => puedeVerEquipoCms(alcance, fila?.equipo_id)
    const equiposVisibles = alcance.global ? equipos.results : equipos.results.filter(deEquipo)
    const responsabilidadesVisibles = alcance.global ? responsabilidades.results : responsabilidades.results.filter(deEquipo)
    const correosVisibles = new Set(responsabilidadesVisibles.map((fila) => fila.usuario_correo))
    const responsablesVisibles = alcance.global ? responsables.results : responsables.results.filter((fila) => correosVisibles.has(fila.correo))
    const correosCapacidadVisibles = new Set([...responsablesVisibles.map((fila) => fila.correo), sesion.correo])
    const capacidadVisible = alcance.global ? capacidad.results : capacidad.results.filter((fila) => correosCapacidadVisibles.has(fila.usuario_correo))
    const documentosVisibles = documentos.results.filter((documento) => puedeVerDocumentoCms(sesion, documento)
      && (alcance.global || documento.sensibilidad === 'compartido' || deEquipo(documento)))
    const eventosPorAlcance = alcance.global || alcance.perfil === 'consulta'
      ? eventos.results : eventos.results.filter(deEquipo)
    const tareasPorAlcance = alcance.global ? tareas.results
      : alcance.perfil === 'integrante'
        ? tareas.results.filter((fila) => fila.responsable_correo === sesion.correo)
        : alcance.perfil === 'consulta' ? [] : tareas.results.filter(deEquipo)
    const accesoRespuestas = puedeVerRespuestasCms(sesion)
    const eventosVisibles = accesoRespuestas
      ? eventosPorAlcance.map(({ entrada_id, ...evento }) => evento)
      : eventosPorAlcance.map(eventoCmsSinDatosDeEntrada)
    const tareasVisibles = tareasPorAlcance.map((tarea) => tareaCmsVisiblePara(tarea, sesion, accesoRespuestas))
    const metricasTareasVisibles = alcance.global ? metricasTareas.results
      : alcance.perfil === 'integrante'
        ? metricasTareas.results.filter((fila) => fila.responsable_correo === sesion.correo)
        : alcance.perfil === 'consulta' ? [] : metricasTareas.results.filter(deEquipo)
    const proyectosVisibles = alcance.global ? proyectos.results
      : alcance.perfil === 'coordinacion' ? proyectos.results.filter(deEquipo) : []
    const proyectoIds = new Set(proyectosVisibles.map((fila) => fila.id))
    const reunionesVisibles = alcance.global ? reuniones.results : reuniones.results.filter(deEquipo)
    const decisionesVisibles = alcance.global ? decisiones.results : decisiones.results.filter(deEquipo)
    const puedeVerOperacion = alcance.global || alcance.perfil === 'coordinacion'
    const entradasVisibles = puedeVerOperacion && accesoRespuestas ? entradas.results.filter(deEquipo) : []
    const formulariosVisibles = puedeVerOperacion ? formularios.results.filter(deEquipo) : []
    const alianzasVisibles = puedeVerOperacion ? alianzas.results.filter((fila) => alcance.global || deEquipo(fila)) : []
    const programasVisibles = puedeVerOperacion ? programas.results.filter((fila) => alcance.global || deEquipo(fila)) : []
    const vistasPorUnidad = new Map()
    for (const vista of vistasUnidades.results || []) {
      if (!vistasPorUnidad.has(vista.unidad_id)) vistasPorUnidad.set(vista.unidad_id, [])
      vistasPorUnidad.get(vista.unidad_id).push(vista)
    }
    const unidadesVisibles = puedeVerOperacion ? (unidades.results || []).filter((unidad) => alcance.global
      || deEquipo(unidad)
      || (vistasPorUnidad.get(unidad.id) || []).some((vista) => puedeVerEquipoCms(alcance, vista.equipo_id)))
      .map((unidad) => ({ ...unidad, vistas: vistasPorUnidad.get(unidad.id) || [] })) : []
    const plantillasVisibles = puedeVerOperacion ? plantillas.results.filter(deEquipo) : []
    const riesgosVisibles = alcance.global ? riesgos.results : riesgos.results.filter((fila) => proyectoIds.has(fila.proyecto_id))
    const hitosVisibles = alcance.global ? hitos.results : hitos.results.filter((fila) => proyectoIds.has(fila.proyecto_id))
    const gastosVisibles = alcance.global ? gastos.results : gastos.results.filter((fila) => proyectoIds.has(fila.proyecto_id))
    const recurrenciasVisibles = puedeVerOperacion ? recurrencias.results.filter(deEquipo) : []
    const automatizacionesVisibles = puedeVerOperacion ? automatizaciones.results.filter(deEquipo) : []
    const comunicadosVisibles = alcance.perfil === 'consulta' ? [] : comunicados.results.filter((fila) => alcance.global || !fila.equipo_id || deEquipo(fila))
    const eventosParaConflictosPorAlcance = alcance.global || alcance.perfil === 'consulta'
      ? eventosParaConflictos.results : eventosParaConflictos.results.filter(deEquipo)
    const eventosParaConflictosVisibles = accesoRespuestas
      ? eventosParaConflictosPorAlcance.map(({ entrada_id, ...evento }) => evento)
      : eventosParaConflictosPorAlcance.map(eventoCmsSinDatosDeEntrada)
    const notificacionesVisibles = accesoRespuestas ? notificaciones.results : notificaciones.results.map(notificacionCmsSinDatosDeFormulario)
    return responder({
      alcance: { perfil: alcance.perfil, global: alcance.global, equipos: equiposVisibles.map((fila) => fila.id), puede_gestionar: alcance.global || alcance.perfil === 'coordinacion', capacidades: { crear_tareas: capacidadesCrearTareasCms(alcance, sesion, equiposVisibles, politicasTareas.results || []) }, nivel_datos_personales: nivelDatosPersonalesDe(sesion), puede_ver_respuestas: accesoRespuestas },
      tareas: tareasVisibles, proyectos: proyectosVisibles, equipos: equiposVisibles, responsables: responsablesVisibles,
      responsabilidades: responsabilidadesVisibles, reuniones: reunionesVisibles, decisiones: decisionesVisibles,
      documentos: documentosVisibles, entradas: entradasVisibles, formularios: formulariosVisibles, alianzas: alianzasVisibles, programas: programasVisibles, unidades: unidadesVisibles,
      eventos: eventosVisibles, plantillas: plantillasVisibles, riesgos: riesgosVisibles, hitos: hitosVisibles,
      gastos: gastosVisibles, notificaciones: notificacionesVisibles, recurrencias: recurrenciasVisibles, automatizaciones: automatizacionesVisibles, alertasPospuestas: alertasPospuestas.results, comunicados: comunicadosVisibles, revisionSemanal, capacidad: capacidadVisible, metricasTareas: metricasTareasVisibles,
      conflictos: gruposConflictosAgendaCms(eventosParaConflictosVisibles).slice(0, 8),
    })
  }

  if (recurso === 'capacidad' && request.method === 'POST') {
    let datos
    try { datos = await request.json() } catch { return error('Los datos de disponibilidad no son válidos.', 400) }
    const resultado = capacidadTrabajoCmsDesde({ ...datos, usuario_correo: datos.usuario_correo || sesion.correo })
    if (resultado.error) return error(resultado.error, 400)
    const capacidad = resultado.capacidad
    if (capacidad.usuario_correo !== sesion.correo && alcance.perfil !== 'administracion') {
      return error('Solo Administración puede ajustar la disponibilidad de otra persona.', 403)
    }
    const cuenta = await env.BASE.prepare('SELECT correo FROM usuarios WHERE correo = ?1 AND activo = 1').bind(capacidad.usuario_correo).first()
    if (!cuenta) return error('La persona elegida ya no tiene un acceso activo.', 400)
    await env.BASE.prepare(`INSERT INTO capacidad_trabajo_cms
      (usuario_correo, horas_semanales, nota, actualizado_por)
      VALUES (?1, ?2, ?3, ?4)
      ON CONFLICT(usuario_correo) DO UPDATE SET
        horas_semanales = excluded.horas_semanales, nota = excluded.nota,
        actualizado_por = excluded.actualizado_por, actualizado_en = CURRENT_TIMESTAMP`)
      .bind(capacidad.usuario_correo, capacidad.horas_semanales, capacidad.nota, sesion.correo).run()
    await registrar(env.BASE, sesion, 'actualizar capacidad CMS', `usuarios/${capacidad.usuario_correo}`, `${capacidad.horas_semanales} horas semanales`)
    return responder({ capacidad })
  }

  if (recurso === 'revisiones-semanales' && request.method === 'POST') {
    if (!alcance.global) return error('Solo Dirección o Administración puede registrar la revisión semanal.', 403)
    let datos; try { datos = await request.json() } catch { return error('Los datos de la revisión no son válidos.', 400) }
    const resultado = revisionSemanalCmsDesde(datos); if (resultado.error) return error(resultado.error, 400)
    const revision = { id: crypto.randomUUID(), ...resultado.revision, revisado_por: sesion.correo }
    await env.BASE.prepare(`INSERT INTO revisiones_semanales_cms (id, semana_inicio, nota, revisado_por)
      VALUES (?1, ?2, ?3, ?4)
      ON CONFLICT(semana_inicio) DO UPDATE SET nota = excluded.nota, revisado_por = excluded.revisado_por, revisado_en = CURRENT_TIMESTAMP`)
      .bind(revision.id, revision.semana_inicio, revision.nota, revision.revisado_por).run()
    await registrar(env.BASE, sesion, 'registrar revisión semanal CMS', `revisiones-semanales/${revision.semana_inicio}`, revision.nota || 'Sin nota')
    return responder({ revision })
  }

  if (recurso === 'comunicados') {
    if (request.method === 'POST' && !id) {
      let datos; try { datos = await request.json() } catch { return error('Los datos del comunicado no son válidos.', 400) }
      const resultado = comunicadoCmsDesde(datos); if (resultado.error) return error(resultado.error, 400)
      if (!resultado.comunicado.equipo_id && !alcance.global) return error('Solo Dirección o Administración puede publicar un comunicado para toda la organización.', 403)
      if (resultado.comunicado.equipo_id && !puedeGestionarEquipoCms(alcance, resultado.comunicado.equipo_id)) return error('Elegí un equipo que coordinás para publicar el comunicado.', 403)
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, resultado.comunicado); if (referenciaInvalida) return error(referenciaInvalida, 400)
      const comunicado = { id: crypto.randomUUID(), ...resultado.comunicado }
      await env.BASE.prepare(`INSERT INTO comunicados_cms (id, titulo, detalle, prioridad, equipo_id, estado, vence_el, creado_por)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`)
        .bind(comunicado.id, comunicado.titulo, comunicado.detalle, comunicado.prioridad, comunicado.equipo_id, comunicado.estado, comunicado.vence_el, sesion.correo).run()
      await registrar(env.BASE, sesion, 'publicar comunicado CMS', `comunicados/${comunicado.id}`, comunicado.titulo)
      return responder({ comunicado }, 201)
    }
    if (id && request.method === 'PATCH') {
      const actual = await env.BASE.prepare('SELECT * FROM comunicados_cms WHERE id = ?1').bind(id).first()
      if (!actual) return error('No encontramos ese comunicado.', 404)
      if (!actual.equipo_id && !alcance.global) return error('Solo Dirección o Administración puede cerrar un comunicado institucional.', 403)
      if (actual.equipo_id && !puedeGestionarEquipoCms(alcance, actual.equipo_id)) return error('No podés cerrar este comunicado.', 403)
      await env.BASE.prepare("UPDATE comunicados_cms SET estado = 'cerrado', actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1").bind(id).run()
      await registrar(env.BASE, sesion, 'cerrar comunicado CMS', `comunicados/${id}`, actual.titulo)
      return responder({ cerrado: true })
    }
  }

  if (recurso === 'tareas-recurrentes') {
    if (request.method === 'POST' && !id) {
      let datos; try { datos = await request.json() } catch { return error('Los datos de la tarea recurrente no son válidos.', 400) }
      const resultado = tareaRecurrenteCmsDesde(datos); if (resultado.error) return error(resultado.error, 400)
      if (!puedeGestionarEquipoCms(alcance, resultado.tarea.equipo_id)) return error('Elegí un equipo que coordinás para crear la tarea recurrente.', 403)
      const politicas = await politicasCrearTareasCms(env.BASE)
      if (!puedeCrearTareaCms(alcance, sesion, resultado.tarea.equipo_id, politicas)) return error('No tenés permiso para crear tareas en ese equipo.', 403)
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, resultado.tarea); if (referenciaInvalida) return error(referenciaInvalida, 400)
      const recurrente = { id: crypto.randomUUID(), ...resultado.tarea }
      await env.BASE.prepare(`INSERT INTO tareas_recurrentes_cms
        (id, titulo, descripcion, prioridad, frecuencia, proxima_fecha, equipo_id, proyecto_id, responsable_correo, creado_por)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`)
        .bind(recurrente.id, recurrente.titulo, recurrente.descripcion, recurrente.prioridad, recurrente.frecuencia, recurrente.proxima_fecha, recurrente.equipo_id, recurrente.proyecto_id, recurrente.responsable_correo, sesion.correo).run()
      await registrar(env.BASE, sesion, 'crear tarea recurrente CMS', `tareas-recurrentes/${recurrente.id}`, recurrente.titulo)
      return responder({ recurrente }, 201)
    }
    if (id && partes[3] === 'generar' && request.method === 'POST') {
      const recurrente = await env.BASE.prepare('SELECT * FROM tareas_recurrentes_cms WHERE id = ?1 AND activo = 1').bind(id).first()
      if (!recurrente) return error('No encontramos esa tarea recurrente activa.', 404)
      if (!puedeGestionarEquipoCms(alcance, recurrente.equipo_id)) return error('No podés generar esta tarea recurrente.', 403)
      const politicas = await politicasCrearTareasCms(env.BASE)
      if (!puedeCrearTareaCms(alcance, sesion, recurrente.equipo_id, politicas)) return error('No tenés permiso para generar tareas en ese equipo.', 403)
      const tarea = { id: crypto.randomUUID(), titulo: recurrente.titulo, descripcion: recurrente.descripcion, tipo: 'tarea', estado: 'pendiente', prioridad: recurrente.prioridad, equipo_id: recurrente.equipo_id, proyecto_id: recurrente.proyecto_id, responsable_correo: recurrente.responsable_correo, fecha_limite: recurrente.proxima_fecha, recurrencia_id: recurrente.id, generada_para: recurrente.proxima_fecha }
      const insercion = await env.BASE.prepare(`INSERT OR IGNORE INTO tareas_cms
        (id, titulo, descripcion, tipo, estado, prioridad, equipo_id, proyecto_id, responsable_correo, fecha_limite, creado_por, recurrencia_id, generada_para)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`)
        .bind(tarea.id, tarea.titulo, tarea.descripcion, tarea.tipo, tarea.estado, tarea.prioridad, tarea.equipo_id, tarea.proyecto_id, tarea.responsable_correo, tarea.fecha_limite, sesion.correo, tarea.recurrencia_id, tarea.generada_para).run()
      const fueNueva = Number(insercion.meta?.changes ?? 0) === 1
      const tareaExistente = fueNueva ? tarea : await env.BASE.prepare(`SELECT id FROM tareas_cms
        WHERE recurrencia_id = ?1 AND generada_para = ?2`).bind(recurrente.id, recurrente.proxima_fecha).first()
      if (!tareaExistente) return error('No pudimos recuperar la tarea recurrente pendiente.', 409)
      const proximaFecha = siguienteFechaRecurrenteCms(recurrente.proxima_fecha, recurrente.frecuencia)
      await env.BASE.prepare('UPDATE tareas_recurrentes_cms SET proxima_fecha = ?2, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1').bind(id, proximaFecha).run()
      if (fueNueva) await notificarAsignacionTareaCms(env.BASE, tarea, sesion.correo)
      await env.BASE.prepare(`INSERT INTO automatizaciones_ejecuciones_cms
        (id, recurrencia_id, periodo, estado, tarea_id)
        VALUES (?1, ?2, ?3, 'completada', ?4)
        ON CONFLICT(recurrencia_id, periodo) DO UPDATE SET
          estado = 'completada', error = NULL, tarea_id = excluded.tarea_id, actualizado_en = CURRENT_TIMESTAMP`)
        .bind(crypto.randomUUID(), recurrente.id, recurrente.proxima_fecha, tareaExistente.id).run()
      await registrar(env.BASE, sesion, fueNueva ? 'generar tarea recurrente CMS' : 'recuperar tarea recurrente CMS', `tareas-recurrentes/${id}`, tarea.titulo)
      return responder({ tarea: tareaExistente, proxima_fecha: proximaFecha, recuperada: !fueNueva }, fueNueva ? 201 : 200)
    }
  }

  if (recurso === 'equipos') {
    if (request.method === 'GET') {
      const filas = await env.BASE.prepare('SELECT * FROM equipos WHERE activo = 1 ORDER BY nombre COLLATE NOCASE').all()
      return responder({ equipos: alcance.global ? filas.results : filas.results.filter((fila) => puedeVerEquipoCms(alcance, fila.id)) })
    }
    if (request.method === 'POST') {
      let datos
      try { datos = await request.json() } catch { return error('Los datos del equipo no son válidos.', 400) }
      const resultado = equipoCmsDesde(datos)
      if (resultado.error) return error(resultado.error, 400)
      const equipo = { id: crypto.randomUUID(), ...resultado.equipo }
      try {
        await env.BASE.prepare(`INSERT INTO equipos
          (id, nombre, categoria, descripcion, color, decisiones_permitidas, debe_escalar, informa_a, frecuencia_reunion, creado_por)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`)
          .bind(equipo.id, equipo.nombre, equipo.categoria, equipo.descripcion, equipo.color, equipo.decisiones_permitidas, equipo.debe_escalar, equipo.informa_a, equipo.frecuencia_reunion, sesion.correo).run()
      } catch { return error('Ya existe un equipo con ese nombre.', 409) }
      await registrar(env.BASE, sesion, 'crear equipo CMS', `equipos/${equipo.id}`, equipo.nombre)
      return responder({ equipo }, 201)
    }
    if (id && request.method === 'PATCH') {
      const actual = await env.BASE.prepare('SELECT * FROM equipos WHERE id = ?1 AND activo = 1').bind(id).first()
      if (!actual) return error('No encontramos ese equipo.', 404)
      let datos
      try { datos = await request.json() } catch { return error('Los datos del equipo no son válidos.', 400) }
      const resultado = equipoCmsDesde(datos, actual)
      if (resultado.error) return error(resultado.error, 400)
      const equipo = { id, ...resultado.equipo }
      try {
        await env.BASE.prepare(`UPDATE equipos SET nombre = ?2, categoria = ?3, descripcion = ?4, color = ?5,
          decisiones_permitidas = ?6, debe_escalar = ?7, informa_a = ?8, frecuencia_reunion = ?9,
          actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1`)
          .bind(equipo.id, equipo.nombre, equipo.categoria, equipo.descripcion, equipo.color, equipo.decisiones_permitidas, equipo.debe_escalar, equipo.informa_a, equipo.frecuencia_reunion).run()
      } catch { return error('Ya existe un equipo con ese nombre.', 409) }
      await registrar(env.BASE, sesion, 'actualizar mapa operativo CMS', `equipos/${equipo.id}`, equipo.nombre)
      return responder({ equipo })
    }
  }

  if (recurso === 'tareas') {
    if (id && partes[3] === 'contexto' && request.method === 'GET') {
      const tarea = await env.BASE.prepare(`SELECT t.*, e.nombre AS equipo_nombre, p.titulo AS proyecto_titulo, u.nombre AS responsable_nombre
        FROM tareas_cms t LEFT JOIN equipos e ON e.id = t.equipo_id LEFT JOIN proyectos_cms p ON p.id = t.proyecto_id
        LEFT JOIN usuarios u ON u.correo = t.responsable_correo WHERE t.id = ?1`).bind(id).first()
      if (!tarea) return error('No encontramos esa tarea.', 404)
      if (!puedeVerTareaCms(alcance, sesion, tarea)) return error('No tenés acceso a esta tarea.', 403)
      const contenidoProtegido = !puedeVerRespuestasCms(sesion) && esTareaDerivadaDeEntradaCms(tarea)
      const [dependencias, dependientes, comentarios] = await Promise.all([
        env.BASE.prepare(`SELECT p.id, p.titulo, p.descripcion, p.estado, p.fecha_limite, p.equipo_id, p.responsable_correo, u.nombre AS responsable_nombre
          FROM tareas_dependencias_cms d JOIN tareas_cms p ON p.id = d.depende_de_id
          LEFT JOIN usuarios u ON u.correo = p.responsable_correo WHERE d.tarea_id = ?1 ORDER BY p.actualizado_en DESC`).bind(id).all(),
        env.BASE.prepare(`SELECT t.id, t.titulo, t.descripcion, t.estado, t.fecha_limite, t.equipo_id, t.responsable_correo, u.nombre AS responsable_nombre
          FROM tareas_dependencias_cms d JOIN tareas_cms t ON t.id = d.tarea_id
          LEFT JOIN usuarios u ON u.correo = t.responsable_correo WHERE d.depende_de_id = ?1 ORDER BY t.actualizado_en DESC`).bind(id).all(),
        env.BASE.prepare(`SELECT c.*, u.nombre AS creador_nombre FROM comentarios_tarea_cms c
          LEFT JOIN usuarios u ON u.correo = c.creado_por WHERE c.tarea_id = ?1 ORDER BY c.creado_en DESC LIMIT 30`).bind(id).all(),
      ])
      const proteger = (filas) => filas.map((fila) => tareaCmsVisiblePara(fila, sesion))
      return responder({ tarea: tareaCmsVisiblePara(tarea, sesion),
        dependencias: proteger(dependencias.results.filter((fila) => puedeVerTareaCms(alcance, sesion, fila))),
        dependientes: proteger(dependientes.results.filter((fila) => puedeVerTareaCms(alcance, sesion, fila))),
        comentarios: contenidoProtegido ? [] : comentarios.results,
        contenido_protegido: contenidoProtegido,
      })
    }
    if (id && partes[3] === 'comentarios' && request.method === 'POST') {
      const existe = await env.BASE.prepare('SELECT titulo, descripcion, equipo_id, responsable_correo FROM tareas_cms WHERE id = ?1').bind(id).first()
      if (!existe) return error('No encontramos esa tarea.', 404)
      if (!puedeGestionarTareaCms(alcance, sesion, existe)) return error('No podés comentar esta tarea.', 403)
      if (esTareaDerivadaDeEntradaCms(existe) && !puedeVerRespuestasCms(sesion)) return error('Necesitás acceso vigente a datos personales para comentar esta tarea.', 403)
      let datos; try { datos = await request.json() } catch { return error('El comentario no es válido.', 400) }
      const resultado = comentarioTareaCmsDesde(datos); if (resultado.error) return error(resultado.error, 400)
      const comentario = { id: crypto.randomUUID(), tarea_id: id, ...resultado.comentario, creado_por: sesion.correo }
      await env.BASE.prepare('INSERT INTO comentarios_tarea_cms (id, tarea_id, contenido, creado_por) VALUES (?1, ?2, ?3, ?4)')
        .bind(comentario.id, comentario.tarea_id, comentario.contenido, comentario.creado_por).run()
      await registrar(env.BASE, sesion, 'comentar tarea CMS', `tareas/${id}`, existe.titulo)
      return responder({ comentario }, 201)
    }
    if (id && partes[3] === 'dependencias' && request.method === 'POST') {
      const tarea = await env.BASE.prepare('SELECT id, titulo, descripcion, equipo_id, responsable_correo FROM tareas_cms WHERE id = ?1').bind(id).first()
      if (!tarea) return error('No encontramos esa tarea.', 404)
      if (!puedeGestionarEquipoCms(alcance, tarea.equipo_id)) return error('No podés cambiar las dependencias de esta tarea.', 403)
      if (esTareaDerivadaDeEntradaCms(tarea) && !puedeVerRespuestasCms(sesion)) return error('Necesitás acceso vigente a datos personales para cambiar esta tarea.', 403)
      let datos; try { datos = await request.json() } catch { return error('La dependencia no es válida.', 400) }
      const dependeDeId = textoCms(datos.depende_de_id, 100)
      if (!dependeDeId || dependeDeId === id) return error('Elegí otra tarea como dependencia.', 400)
      const previa = await env.BASE.prepare('SELECT id, equipo_id FROM tareas_cms WHERE id = ?1').bind(dependeDeId).first()
      if (!previa) return error('No encontramos la tarea previa elegida.', 404)
      if (!puedeGestionarEquipoCms(alcance, previa.equipo_id)) return error('No podés vincular una tarea de otro equipo.', 403)
      if (await creariaCicloDeDependencia(env.BASE, id, dependeDeId)) return error('Esa dependencia crearía un ciclo entre tareas.', 400)
      try {
        await env.BASE.prepare('INSERT INTO tareas_dependencias_cms (tarea_id, depende_de_id, creado_por) VALUES (?1, ?2, ?3)')
          .bind(id, dependeDeId, sesion.correo).run()
      } catch { return error('Esa dependencia ya está registrada.', 409) }
      await registrar(env.BASE, sesion, 'agregar dependencia CMS', `tareas/${id}`, tarea.titulo)
      return responder({ creada: true }, 201)
    }
    if (id && partes[3] === 'dependencias' && partes[4] && request.method === 'DELETE') {
      const tarea = await env.BASE.prepare('SELECT id, descripcion, equipo_id FROM tareas_cms WHERE id = ?1').bind(id).first()
      if (!tarea) return error('No encontramos esa tarea.', 404)
      if (!puedeGestionarEquipoCms(alcance, tarea.equipo_id)) return error('No podés cambiar las dependencias de esta tarea.', 403)
      if (esTareaDerivadaDeEntradaCms(tarea) && !puedeVerRespuestasCms(sesion)) return error('Necesitás acceso vigente a datos personales para cambiar esta tarea.', 403)
      const eliminada = await env.BASE.prepare('DELETE FROM tareas_dependencias_cms WHERE tarea_id = ?1 AND depende_de_id = ?2').bind(id, partes[4]).run()
      if (!Number(eliminada.meta?.changes || 0)) return error('No encontramos esa dependencia.', 404)
      await registrar(env.BASE, sesion, 'quitar dependencia CMS', `tareas/${id}`, partes[4])
      return responder({ eliminada: true })
    }
    if (request.method === 'GET') {
      const filas = await env.BASE.prepare(`
        SELECT t.*, e.nombre AS equipo_nombre, e.color AS equipo_color, p.titulo AS proyecto_titulo, a.titulo AS evento_titulo,
          u.nombre AS responsable_nombre, s.nombre AS solicitante_nombre,
          (SELECT COUNT(*) FROM comentarios_tarea_cms c WHERE c.tarea_id = t.id) AS comentarios_total,
          (SELECT COUNT(*) FROM tareas_dependencias_cms d JOIN tareas_cms previa ON previa.id = d.depende_de_id
            WHERE d.tarea_id = t.id AND previa.estado NOT IN ('completada', 'cancelada')) AS dependencias_pendientes
        FROM tareas_cms t
        LEFT JOIN equipos e ON e.id = t.equipo_id
        LEFT JOIN proyectos_cms p ON p.id = t.proyecto_id
        LEFT JOIN eventos_cms a ON a.id = t.evento_id
        LEFT JOIN usuarios u ON u.correo = t.responsable_correo
        LEFT JOIN usuarios s ON s.correo = t.solicitante_correo
        ORDER BY t.estado IN ('completada', 'cancelada'), t.fecha_limite IS NULL, t.fecha_limite, t.actualizado_en DESC
      `).all()
      const visibles = filas.results.filter((fila) => puedeVerTareaCms(alcance, sesion, fila))
      return responder({ tareas: visibles.map((tarea) => tareaCmsVisiblePara(tarea, sesion)) })
    }
    if (request.method === 'POST') {
      let datos
      try { datos = await request.json() } catch { return error('Los datos de la tarea no son válidos.', 400) }
      const resultado = tareaCmsDesde(datos)
      if (resultado.error) return error(resultado.error, 400)
      const esSolicitud = resultado.tarea.tipo === 'solicitud'
      if (esSolicitud) {
        if (!puedeVerEquipoCms(alcance, resultado.tarea.equipo_id)) return error('Elegí un equipo al que pertenezcas para enviar la solicitud.', 403)
      } else {
        const politicas = await politicasCrearTareasCms(env.BASE)
        if (!puedeCrearTareaCms(alcance, sesion, resultado.tarea.equipo_id, politicas)) return error('No tenés permiso para crear tareas en ese equipo. Podés enviar una solicitud para que la revise.', 403)
      }
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, resultado.tarea)
      if (referenciaInvalida) return error(referenciaInvalida, 400)
      const responsableAutomatico = resultado.tarea.tipo === 'solicitud' && !resultado.tarea.responsable_correo
        ? await responsableAutomaticoDeSolicitud(env.BASE, resultado.tarea.equipo_id)
        : null
      const tarea = {
        id: crypto.randomUUID(),
        ...resultado.tarea,
        responsable_correo: resultado.tarea.responsable_correo || responsableAutomatico,
        solicitante_correo: resultado.tarea.tipo === 'solicitud' ? sesion.correo : resultado.tarea.solicitante_correo,
        seguimiento_personal_por: resultado.tarea.seguimiento_personal ? sesion.correo : null,
      }
      await env.BASE.prepare(`
        INSERT INTO tareas_cms (id, titulo, descripcion, tipo, estado, prioridad, equipo_id, unidad_id, proyecto_id, evento_id, responsable_correo, solicitante_correo, fecha_limite, fecha_seguimiento, esfuerzo_horas, seguimiento_personal, motivo_seguimiento, seguimiento_personal_por, creado_por, completado_en)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, CASE WHEN ?5 = 'completada' THEN CURRENT_TIMESTAMP ELSE NULL END)
      `).bind(tarea.id, tarea.titulo, tarea.descripcion, tarea.tipo, tarea.estado, tarea.prioridad, tarea.equipo_id, tarea.unidad_id, tarea.proyecto_id, tarea.evento_id, tarea.responsable_correo, tarea.solicitante_correo, tarea.fecha_limite, tarea.fecha_seguimiento, tarea.esfuerzo_horas, tarea.seguimiento_personal, tarea.motivo_seguimiento, tarea.seguimiento_personal_por, sesion.correo).run()
      await notificarAsignacionTareaCms(env.BASE, tarea, sesion.correo, tarea.tipo === 'solicitud' ? 'solicitud_recibida' : 'asignacion_tarea')
      await registrar(env.BASE, sesion, 'crear tarea CMS', `tareas/${tarea.id}`, tarea.titulo)
      return responder({ tarea, asignada_automaticamente: Boolean(responsableAutomatico) }, 201)
    }
    if (request.method === 'PATCH' && id) {
      const actual = await env.BASE.prepare('SELECT * FROM tareas_cms WHERE id = ?1').bind(id).first()
      if (!actual) return error('No encontramos esa tarea.', 404)
      if (!puedeGestionarTareaCms(alcance, sesion, actual)) return error('No podés modificar esta tarea.', 403)
      if (esTareaDerivadaDeEntradaCms(actual) && !puedeVerRespuestasCms(sesion)) return error('Necesitás acceso vigente a datos personales para modificar esta tarea.', 403)
      let datos
      try { datos = await request.json() } catch { return error('Los cambios de la tarea no son válidos.', 400) }
      const comentarioCierrePedido = datos.comentario_cierre
      const operacionCierreId = textoCms(datos.operacion_cierre_id, 191)
      delete datos.comentario_cierre
      delete datos.operacion_cierre_id
      if (operacionCierreId && !/^[a-zA-Z0-9:_-]{8,191}$/.test(operacionCierreId)) return error('La referencia del cierre no es válida.', 400)
      if (alcance.perfil === 'integrante' && Object.keys(datos).some((campo) => !['estado', 'fecha_seguimiento'].includes(campo))) {
        return error('Como integrante solo podés actualizar el estado y el seguimiento de tu tarea.', 403)
      }
      const datosPermitidos = datosTareaSinSeguimientoPersonalAjeno(datos, actual, sesion.correo)
      const resultado = tareaCmsDesde(datosPermitidos, actual)
      if (resultado.error) return error(resultado.error, 400)
      if (!puedeGestionarTareaCms(alcance, sesion, resultado.tarea)) return error('No podés mover esta tarea a otro equipo.', 403)
      const tarea = {
        ...resultado.tarea,
        solicitante_correo: resultado.tarea.tipo === 'solicitud'
          ? (actual.solicitante_correo || sesion.correo)
          : resultado.tarea.solicitante_correo,
        seguimiento_personal_por: resultado.tarea.seguimiento_personal
          ? (actual.seguimiento_personal_por || sesion.correo)
          : null,
      }
      const cierre = cierreTareaCmsDesde({ estado: tarea.estado, comentario_cierre: comentarioCierrePedido }, actual, sesion.correo)
      if (tarea.estado === 'completada') {
        const pendientes = await dependenciasPendientesDe(env.BASE, id)
        const pendientesVisibles = puedeVerRespuestasCms(sesion) ? pendientes : pendientes.map(tareaCmsSinDatosDeFormulario)
        if (pendientesVisibles.length) return error(`No podés completar esta tarea hasta cerrar: ${pendientesVisibles.map((fila) => fila.titulo).join(', ')}.`, 409)
      }
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, tarea)
      if (referenciaInvalida) return error(referenciaInvalida, 400)
      const consultasActualizacion = [env.BASE.prepare(`
        UPDATE tareas_cms SET titulo = ?2, descripcion = ?3, tipo = ?4, estado = ?5, prioridad = ?6,
          equipo_id = ?7, unidad_id = ?8, proyecto_id = ?9, evento_id = ?10, responsable_correo = ?11, solicitante_correo = ?12,
          fecha_limite = ?13, fecha_seguimiento = ?14, esfuerzo_horas = ?15, actualizado_en = CURRENT_TIMESTAMP,
          seguimiento_personal = ?16, motivo_seguimiento = ?17, seguimiento_personal_por = ?18,
          completado_en = CASE WHEN ?5 = 'completada' AND completado_en IS NULL THEN CURRENT_TIMESTAMP WHEN ?5 != 'completada' THEN NULL ELSE completado_en END
        WHERE id = ?1
      `).bind(id, tarea.titulo, tarea.descripcion, tarea.tipo, tarea.estado, tarea.prioridad, tarea.equipo_id, tarea.unidad_id, tarea.proyecto_id, tarea.evento_id, tarea.responsable_correo, tarea.solicitante_correo, tarea.fecha_limite, tarea.fecha_seguimiento, tarea.esfuerzo_horas, tarea.seguimiento_personal, tarea.motivo_seguimiento, tarea.seguimiento_personal_por)]
      if (cierre.comentario) {
        consultasActualizacion.push(env.BASE.prepare('INSERT OR IGNORE INTO comentarios_tarea_cms (id, tarea_id, contenido, creado_por) VALUES (?1, ?2, ?3, ?4)')
          .bind(operacionCierreId || crypto.randomUUID(), id, cierre.comentario, sesion.correo))
      }
      if (cierre.resolver_aviso) {
        consultasActualizacion.push(env.BASE.prepare(`UPDATE notificaciones_cms
          SET leida_en = COALESCE(leida_en, CURRENT_TIMESTAMP), actualizado_en = CURRENT_TIMESTAMP
          WHERE tarea_id = ?1 AND usuario_correo = ?2 AND leida_en IS NULL`)
          .bind(id, sesion.correo))
      }
      if (cierre.notificar_a) {
        const detalleCierre = cierre.comentario ? `${tarea.titulo}: ${cierre.comentario}` : tarea.titulo
        consultasActualizacion.push(env.BASE.prepare(`INSERT INTO notificaciones_cms
          (id, usuario_correo, tipo, tarea_id, titulo, detalle)
          VALUES (?1, ?2, 'asignacion_tarea', ?3, 'Tarea completada', ?4)
          ON CONFLICT(usuario_correo, tipo, tarea_id) DO UPDATE SET
            titulo = excluded.titulo, detalle = excluded.detalle, leida_en = NULL, actualizado_en = CURRENT_TIMESTAMP`)
          .bind(crypto.randomUUID(), cierre.notificar_a, id, detalleCierre))
      }
      await env.BASE.batch(consultasActualizacion)
      if (tarea.responsable_correo && tarea.responsable_correo !== actual.responsable_correo) {
        await notificarAsignacionTareaCms(env.BASE, { id, ...tarea }, sesion.correo, tarea.tipo === 'solicitud' ? 'solicitud_recibida' : 'asignacion_tarea')
      }
      await registrar(env.BASE, sesion, 'modificar tarea CMS', `tareas/${id}`, tarea.titulo)
      return responder({ tarea: tareaCmsVisiblePara({ id, ...tarea }, sesion), operacion_cierre_id: operacionCierreId || null })
    }
  }

  if (recurso === 'notificaciones' && id && request.method === 'PATCH') {
    const notificacion = await env.BASE.prepare('SELECT id FROM notificaciones_cms WHERE id = ?1 AND usuario_correo = ?2').bind(id, sesion.correo).first()
    if (!notificacion) return error('No encontramos esa notificación.', 404)
    await env.BASE.prepare('UPDATE notificaciones_cms SET leida_en = CURRENT_TIMESTAMP, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1').bind(id).run()
    return responder({ leida: true })
  }

  if (recurso === 'alertas-pospuestas' && request.method === 'POST') {
    let datos; try { datos = await request.json() } catch { return error('Los datos de la alerta no son válidos.', 400) }
    const clave = textoCms(datos.clave, 240)
    const hasta = textoCms(datos.postergada_hasta, 10)
    if (!clave || !fechaCmsValida(hasta) || hasta < fechaActualCms()) return error('Elegí una fecha futura para postergar la alerta.', 400)
    await env.BASE.prepare(`INSERT INTO alertas_pospuestas_cms (id, usuario_correo, clave, postergada_hasta)
      VALUES (?1, ?2, ?3, ?4)
      ON CONFLICT(usuario_correo, clave) DO UPDATE SET postergada_hasta = excluded.postergada_hasta, actualizado_en = CURRENT_TIMESTAMP`)
      .bind(crypto.randomUUID(), sesion.correo, clave, hasta).run()
    return responder({ clave, postergada_hasta: hasta })
  }

  if (recurso === 'alertas-pospuestas' && request.method === 'DELETE') {
    let datos; try { datos = await request.json() } catch { return error('Los datos de la alerta no son válidos.', 400) }
    const clave = textoCms(datos.clave, 240)
    if (!clave) return error('No encontramos la alerta a reactivar.', 400)
    await env.BASE.prepare('DELETE FROM alertas_pospuestas_cms WHERE usuario_correo = ?1 AND clave = ?2').bind(sesion.correo, clave).run()
    return responder({ reactivada: true })
  }

  if (recurso === 'responsabilidades' && request.method === 'GET') {
    const filas = await env.BASE.prepare(`SELECT r.*, e.nombre AS equipo_nombre, u.nombre AS usuario_nombre
      FROM responsabilidades_equipo r JOIN equipos e ON e.id = r.equipo_id
      JOIN usuarios u ON u.correo = r.usuario_correo
      WHERE r.activo = 1 AND e.activo = 1 AND u.activo = 1
      ORDER BY e.nombre COLLATE NOCASE, u.nombre COLLATE NOCASE`).all()
    return responder({ responsabilidades: alcance.global ? filas.results : filas.results.filter((fila) => puedeVerEquipoCms(alcance, fila.equipo_id)) })
  }

  if (recurso === 'responsabilidades' && id && request.method === 'DELETE') {
    const actual = await env.BASE.prepare('SELECT * FROM responsabilidades_equipo WHERE id = ?1 AND activo = 1').bind(id).first()
    if (!actual) return error('No encontramos esa asignación.', 404)
    if (!alcance.global) return error('Solo Dirección o Administración puede cambiar asignaciones de equipo.', 403)
    const cuenta = await env.BASE.prepare('SELECT perfil_acceso FROM usuarios WHERE correo = ?1 AND activo = 1').bind(actual.usuario_correo).first()
    if (['coordinacion', 'integrante'].includes(perfilAccesoDe(cuenta))) {
      const asignaciones = await env.BASE.prepare('SELECT COUNT(*) AS cantidad FROM responsabilidades_equipo WHERE usuario_correo = ?1 AND activo = 1').bind(actual.usuario_correo).first()
      if (Number(asignaciones?.cantidad || 0) <= 1) return error('Antes de quitar este equipo, asignale otro a esta cuenta.', 400)
    }
    await env.BASE.prepare('UPDATE responsabilidades_equipo SET activo = 0, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1').bind(id).run()
    await registrar(env.BASE, sesion, 'quitar responsabilidad CMS', `equipos/${actual.equipo_id}`, actual.usuario_correo)
    return responder({ quitada: true })
  }

  if (recurso === 'responsabilidades' && request.method === 'POST') {
    let datos
    try { datos = await request.json() } catch { return error('Los datos de la responsabilidad no son válidos.', 400) }
    const resultado = responsabilidadCmsDesde(datos)
    if (resultado.error) return error(resultado.error, 400)
    const referenciaInvalida = await referenciasCmsValidas(env.BASE, {
      equipo_id: resultado.responsabilidad.equipo_id,
      responsable_correo: resultado.responsabilidad.usuario_correo,
    })
    if (referenciaInvalida) return error(referenciaInvalida, 400)
    const responsabilidad = { id: crypto.randomUUID(), ...resultado.responsabilidad }
    try {
      await env.BASE.prepare(`INSERT INTO responsabilidades_equipo
        (id, equipo_id, usuario_correo, tipo, puede_decidir, debe_escalar, creado_por)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        ON CONFLICT(equipo_id, usuario_correo, tipo) DO UPDATE SET
          activo = 1,
          puede_decidir = excluded.puede_decidir,
          debe_escalar = excluded.debe_escalar,
          creado_por = excluded.creado_por,
          actualizado_en = CURRENT_TIMESTAMP`)
        .bind(responsabilidad.id, responsabilidad.equipo_id, responsabilidad.usuario_correo, responsabilidad.tipo, responsabilidad.puede_decidir, responsabilidad.debe_escalar, sesion.correo).run()
    } catch { return error('No pudimos guardar esa función en el equipo.', 500) }
    await registrar(env.BASE, sesion, 'asignar responsabilidad CMS', `equipos/${responsabilidad.equipo_id}`, `${responsabilidad.tipo}: ${responsabilidad.usuario_correo}`)
    return responder({ responsabilidad }, 201)
  }

  if (recurso === 'reuniones') {
    if (id && partes[3] === 'cierre' && request.method === 'POST') {
      const reunion = await env.BASE.prepare('SELECT * FROM reuniones_cms WHERE id = ?1').bind(id).first()
      if (!reunion) return error('No encontramos esa reunión.', 404)
      if (!puedeGestionarEquipoCms(alcance, reunion.equipo_id)) return error('No podés cerrar esta reunión.', 403)
      if (reunion.cerrada_en) return error('Esta reunión ya fue cerrada. Podés registrar nuevas decisiones desde su tarjeta.', 409)
      if (reunion.estado === 'cancelada') return error('Una reunión cancelada no se puede cerrar.', 409)
      let datos
      try { datos = await request.json() } catch { return error('Los datos del cierre no son válidos.', 400) }
      const resultado = cierreReunionCmsDesde(datos)
      if (resultado.error) return error(resultado.error, 400)
      const cierre = resultado.cierre
      if (cierre.acuerdos.some((acuerdo) => acuerdo.crear_tarea)) {
        const politicas = await politicasCrearTareasCms(env.BASE)
        if (!puedeCrearTareaCms(alcance, sesion, reunion.equipo_id, politicas)) return error('Podés cerrar la reunión, pero no crear tareas desde sus acuerdos. Desmarcá Crear tarea o pedí el permiso a Administración.', 403)
      }
      const consultas = [env.BASE.prepare(`UPDATE reuniones_cms SET estado = 'realizada', minuta = ?2, resumen = ?3,
        proxima_revision = ?4, cerrada_en = CURRENT_TIMESTAMP, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1`)
        .bind(id, cierre.minuta, cierre.resumen, cierre.proxima_revision)]
      const decisiones = []
      for (const acuerdo of cierre.acuerdos) {
        const referenciaInvalida = await referenciasCmsValidas(env.BASE, { responsable_correo: acuerdo.responsable_correo })
        if (referenciaInvalida) return error(referenciaInvalida, 400)
        const decision = { id: crypto.randomUUID(), reunion_id: id, ...acuerdo, tarea_id: null }
        if (acuerdo.crear_tarea) {
          decision.tarea_id = crypto.randomUUID()
          const tareaDeDecision = {
            id: decision.tarea_id,
            titulo: acuerdo.titulo,
            descripcion: acuerdo.motivo,
            tipo: 'tarea',
            equipo_id: reunion.equipo_id,
            proyecto_id: reunion.proyecto_id,
            responsable_correo: acuerdo.responsable_correo,
          }
          consultas.push(env.BASE.prepare(`INSERT INTO tareas_cms
            (id, titulo, descripcion, tipo, estado, prioridad, equipo_id, proyecto_id, responsable_correo, fecha_limite, creado_por)
            VALUES (?1, ?2, ?3, 'tarea', 'pendiente', 'normal', ?4, ?5, ?6, ?7, ?8)`)
            .bind(decision.tarea_id, acuerdo.titulo, acuerdo.motivo, reunion.equipo_id, reunion.proyecto_id, acuerdo.responsable_correo, acuerdo.fecha_limite, sesion.correo))
          const notificacion = consultaNotificacionAsignacionTareaCms(env.BASE, tareaDeDecision, sesion.correo)
          if (notificacion) consultas.push(notificacion)
        }
        consultas.push(env.BASE.prepare(`INSERT INTO decisiones_cms
          (id, reunion_id, titulo, motivo, responsable_correo, estado, tarea_id, creado_por)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`)
          .bind(decision.id, id, acuerdo.titulo, acuerdo.motivo, acuerdo.responsable_correo, acuerdo.estado, decision.tarea_id, sesion.correo))
        decisiones.push(decision)
      }
      await env.BASE.batch(consultas)
      await registrar(env.BASE, sesion, 'cerrar reunión CMS', `reuniones/${id}`, `${reunion.titulo}: ${decisiones.length} acuerdos`)
      return responder({ reunion: { ...reunion, estado: 'realizada', minuta: cierre.minuta, resumen: cierre.resumen, proxima_revision: cierre.proxima_revision }, decisiones })
    }
    if (id && partes[3] === 'decisiones' && request.method === 'POST') {
      const reunion = await env.BASE.prepare('SELECT id, equipo_id FROM reuniones_cms WHERE id = ?1').bind(id).first()
      if (!reunion) return error('No encontramos esa reunión.', 404)
      if (!puedeGestionarEquipoCms(alcance, reunion.equipo_id)) return error('No podés registrar decisiones para esta reunión.', 403)
      let datos
      try { datos = await request.json() } catch { return error('Los datos de la decisión no son válidos.', 400) }
      const resultado = decisionCmsDesde(datos)
      if (resultado.error) return error(resultado.error, 400)
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, { responsable_correo: resultado.decision.responsable_correo })
      if (referenciaInvalida) return error(referenciaInvalida, 400)
      const decision = { id: crypto.randomUUID(), reunion_id: id, ...resultado.decision }
      await env.BASE.prepare(`INSERT INTO decisiones_cms (id, reunion_id, titulo, motivo, responsable_correo, estado, creado_por)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`)
        .bind(decision.id, decision.reunion_id, decision.titulo, decision.motivo, decision.responsable_correo, decision.estado, sesion.correo).run()
      await registrar(env.BASE, sesion, 'registrar decisión CMS', `reuniones/${id}`, decision.titulo)
      return responder({ decision }, 201)
    }
    if (request.method === 'POST') {
      let datos
      try { datos = await request.json() } catch { return error('Los datos de la reunión no son válidos.', 400) }
      const recurrente = Boolean(datos.frecuencia_reunion)
      const resultado = recurrente ? reunionesRecurrentesCmsDesde(datos) : reunionCmsDesde(datos)
      if (resultado.error) return error(resultado.error, 400)
      const reunionBase = recurrente ? resultado.reuniones[0] : resultado.reunion
      if (!puedeGestionarEquipoCms(alcance, reunionBase.equipo_id)) return error('Elegí un equipo que coordinás para crear la reunión.', 403)
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, reunionBase)
      if (referenciaInvalida) return error(referenciaInvalida, 400)
      const reuniones = (recurrente ? resultado.reuniones : [resultado.reunion]).map((reunion) => ({ id: crypto.randomUUID(), ...reunion }))
      await env.BASE.batch(reuniones.map((reunion) => env.BASE.prepare(`INSERT INTO reuniones_cms
        (id, titulo, objetivo, equipo_id, unidad_id, proyecto_id, fecha_hora, lugar, estado, preparacion, proxima_revision, minuta, resumen, creado_por, serie_id, generada_para)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)`)
        .bind(reunion.id, reunion.titulo, reunion.objetivo, reunion.equipo_id, reunion.unidad_id, reunion.proyecto_id, reunion.fecha_hora, reunion.lugar, reunion.estado, reunion.preparacion, reunion.proxima_revision, reunion.minuta, reunion.resumen, sesion.correo, reunion.serie_id ?? null, reunion.generada_para ?? null)))
      await registrar(env.BASE, sesion, recurrente ? 'crear serie de reuniones CMS' : 'crear reunión CMS', recurrente ? `reuniones/serie/${reuniones[0].serie_id}` : `reuniones/${reuniones[0].id}`, recurrente ? `${reuniones[0].titulo}, ${reuniones.length} fechas` : reuniones[0].titulo)
      return responder(recurrente ? { reuniones, cantidad: reuniones.length } : { reunion: reuniones[0] }, 201)
    }
    if (request.method === 'PATCH' && id) {
      const actual = await env.BASE.prepare('SELECT * FROM reuniones_cms WHERE id = ?1').bind(id).first()
      if (!actual) return error('No encontramos esa reunión.', 404)
      if (!puedeGestionarEquipoCms(alcance, actual.equipo_id)) return error('No podés modificar esta reunión.', 403)
      let datos
      try { datos = await request.json() } catch { return error('Los cambios de la reunión no son válidos.', 400) }
      const resultado = reunionCmsDesde(datos, actual)
      if (resultado.error) return error(resultado.error, 400)
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, resultado.reunion)
      if (referenciaInvalida) return error(referenciaInvalida, 400)
      const reunion = resultado.reunion
      if (!puedeGestionarEquipoCms(alcance, reunion.equipo_id)) return error('No podés mover esta reunión a otro equipo.', 403)
      await env.BASE.prepare(`UPDATE reuniones_cms SET titulo = ?2, objetivo = ?3, equipo_id = ?4, unidad_id = ?5, proyecto_id = ?6, fecha_hora = ?7,
        lugar = ?8, estado = ?9, preparacion = ?10, proxima_revision = ?11, minuta = ?12, resumen = ?13, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1`)
        .bind(id, reunion.titulo, reunion.objetivo, reunion.equipo_id, reunion.unidad_id, reunion.proyecto_id, reunion.fecha_hora, reunion.lugar, reunion.estado, reunion.preparacion, reunion.proxima_revision, reunion.minuta, reunion.resumen).run()
      await registrar(env.BASE, sesion, 'modificar reunión CMS', `reuniones/${id}`, reunion.titulo)
      return responder({ reunion: { id, ...reunion } })
    }
  }

  if (recurso === 'eventos') {
    if (request.method === 'GET') {
      const mes = new URL(request.url).searchParams.get('mes')
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes ?? '')) return error('Indicá un mes válido para consultar actividades.', 400)
      const [anio, numeroMes] = mes.split('-').map(Number)
      const inicio = `${mes}-01T00:00`
      const fin = new Date(Date.UTC(anio, numeroMes, 1)).toISOString().slice(0, 16)
      const filas = await env.BASE.prepare(`SELECT e.*, q.nombre AS equipo_nombre, p.titulo AS proyecto_titulo, u.nombre AS responsable_nombre, o.nombre AS unidad_nombre, o.sigla AS unidad_sigla,
          (SELECT i.id FROM entradas_cms i WHERE i.evento_id = e.id LIMIT 1) AS entrada_id
        FROM eventos_cms e
        LEFT JOIN equipos q ON q.id = e.equipo_id
        LEFT JOIN proyectos_cms p ON p.id = e.proyecto_id
        LEFT JOIN usuarios u ON u.correo = e.responsable_correo
        LEFT JOIN unidades_operativas_cms o ON o.id = e.unidad_id
        WHERE e.estado = 'planificado' AND e.fecha_hora >= ?1 AND e.fecha_hora < ?2
        ORDER BY e.fecha_hora ASC`).bind(inicio, fin).all()
      const visibles = alcance.global || alcance.perfil === 'consulta'
        ? filas.results : filas.results.filter((fila) => puedeVerEquipoCms(alcance, fila.equipo_id))
      const eventos = puedeVerRespuestasCms(sesion)
        ? visibles.map(({ entrada_id, ...evento }) => evento)
        : visibles.map(eventoCmsSinDatosDeEntrada)
      return responder({ eventos })
    }
    if (request.method === 'POST') {
      let datos
      try { datos = await request.json() } catch { return error('Los datos de la actividad no son válidos.', 400) }
      const recurrente = Boolean(datos.frecuencia_evento)
      const resultado = recurrente ? eventosRecurrentesCmsDesde(datos) : eventoCmsDesde(datos)
      if (resultado.error) return error(resultado.error, 400)
      const eventoBase = recurrente ? resultado.eventos[0] : resultado.evento
      if (!puedeGestionarEquipoCms(alcance, eventoBase.equipo_id)) return error('Elegí un equipo que coordinás para crear la actividad.', 403)
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, eventoBase)
      if (referenciaInvalida) return error(referenciaInvalida, 400)
      const eventos = (recurrente ? resultado.eventos : [resultado.evento]).map((evento) => ({ id: crypto.randomUUID(), ...evento }))
      await env.BASE.batch(eventos.map((evento) => env.BASE.prepare(`INSERT INTO eventos_cms
        (id, titulo, descripcion, fecha_hora, fecha_fin, lugar, equipo_id, unidad_id, proyecto_id, responsable_correo, estado, tipo, creado_por, serie_id, generada_para)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)`)
        .bind(evento.id, evento.titulo, evento.descripcion, evento.fecha_hora, evento.fecha_fin, evento.lugar, evento.equipo_id, evento.unidad_id, evento.proyecto_id, evento.responsable_correo, evento.estado, evento.tipo, sesion.correo, evento.serie_id ?? null, evento.generada_para ?? null)))
      await registrar(env.BASE, sesion, recurrente ? 'crear serie de actividades CMS' : 'crear actividad CMS', recurrente ? `eventos/serie/${eventos[0].serie_id}` : `eventos/${eventos[0].id}`, recurrente ? `${eventos[0].titulo}, ${eventos.length} fechas` : eventos[0].titulo)
      return responder(recurrente ? { eventos, cantidad: eventos.length } : { evento: eventos[0] }, 201)
    }
    if (request.method === 'PATCH' && id) {
      const actual = await env.BASE.prepare(`SELECT e.*,
        (SELECT i.id FROM entradas_cms i WHERE i.evento_id = e.id LIMIT 1) AS entrada_id
        FROM eventos_cms e WHERE e.id = ?1`).bind(id).first()
      if (!actual) return error('No encontramos esa actividad.', 404)
      if (!puedeGestionarEquipoCms(alcance, actual.equipo_id)) return error('No podés modificar esta actividad.', 403)
      if (actual.entrada_id && !puedeVerRespuestasCms(sesion)) return error('Necesitás acceso vigente a datos personales para modificar esta actividad.', 403)
      let datos
      try { datos = await request.json() } catch { return error('Los cambios de la actividad no son válidos.', 400) }
      const resultado = eventoCmsDesde(datos, actual)
      if (resultado.error) return error(resultado.error, 400)
      if (!puedeGestionarEquipoCms(alcance, resultado.evento.equipo_id)) return error('No podés mover esta actividad a otro equipo.', 403)
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, resultado.evento)
      if (referenciaInvalida) return error(referenciaInvalida, 400)
      const evento = resultado.evento
      await env.BASE.prepare(`UPDATE eventos_cms SET titulo = ?2, descripcion = ?3, fecha_hora = ?4, fecha_fin = ?5, lugar = ?6,
        equipo_id = ?7, unidad_id = ?8, proyecto_id = ?9, responsable_correo = ?10, estado = ?11, tipo = ?12, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1`)
        .bind(id, evento.titulo, evento.descripcion, evento.fecha_hora, evento.fecha_fin, evento.lugar, evento.equipo_id, evento.unidad_id, evento.proyecto_id, evento.responsable_correo, evento.estado, evento.tipo).run()
      await registrar(env.BASE, sesion, 'modificar actividad CMS', `eventos/${id}`, evento.titulo)
      return responder({ evento: { id, ...evento } })
    }
  }

  if (recurso === 'plantillas-tareas') {
    if (request.method === 'POST' && id && partes[3] === 'aplicar') {
      let datos
      try { datos = await request.json() } catch { return error('Elegí una actividad para aplicar la checklist.', 400) }
      const eventoId = textoCms(datos.evento_id, 100)
      const [plantilla, evento, aplicacion] = await Promise.all([
        env.BASE.prepare('SELECT * FROM plantillas_tareas_cms WHERE id = ?1').bind(id).first(),
        env.BASE.prepare("SELECT * FROM eventos_cms WHERE id = ?1 AND estado = 'planificado'").bind(eventoId).first(),
        env.BASE.prepare('SELECT id FROM aplicaciones_plantilla_tareas_cms WHERE plantilla_id = ?1 AND evento_id = ?2').bind(id, eventoId).first(),
      ])
      if (!plantilla) return error('No encontramos esa checklist.', 404)
      if (!evento) return error('La actividad ya no está disponible para preparar.', 404)
      if (!puedeGestionarEquipoCms(alcance, plantilla.equipo_id || evento.equipo_id) || !puedeGestionarEquipoCms(alcance, evento.equipo_id)) return error('No podés aplicar esta checklist en ese equipo.', 403)
      const politicas = await politicasCrearTareasCms(env.BASE)
      if (!puedeCrearTareaCms(alcance, sesion, plantilla.equipo_id || evento.equipo_id, politicas)) return error('No tenés permiso para crear las tareas de esta checklist.', 403)
      if (aplicacion) return error('Esta checklist ya fue aplicada a esa actividad.', 409)
      const items = await env.BASE.prepare('SELECT * FROM plantilla_tareas_items_cms WHERE plantilla_id = ?1 ORDER BY orden, titulo').bind(id).all()
      if (!items.results.length) return error('Esta checklist no tiene tareas para aplicar.', 400)
      const aplicacionId = crypto.randomUUID()
      const consultas = [env.BASE.prepare('INSERT INTO aplicaciones_plantilla_tareas_cms (id, plantilla_id, evento_id, aplicado_por) VALUES (?1, ?2, ?3, ?4)').bind(aplicacionId, id, eventoId, sesion.correo)]
      items.results.forEach((item) => {
        consultas.push(env.BASE.prepare(`INSERT INTO tareas_cms
          (id, titulo, descripcion, tipo, estado, prioridad, equipo_id, proyecto_id, evento_id, responsable_correo, fecha_limite, creado_por)
          VALUES (?1, ?2, ?3, 'tarea', 'pendiente', ?4, ?5, ?6, ?7, ?8, ?9, ?10)`)
          .bind(crypto.randomUUID(), item.titulo, item.descripcion, item.prioridad, plantilla.equipo_id || evento.equipo_id, evento.proyecto_id, evento.id, evento.responsable_correo, fechaDePreparacion(evento.fecha_hora, item.dias_antes), sesion.correo))
      })
      await env.BASE.batch(consultas)
      await registrar(env.BASE, sesion, 'aplicar checklist CMS', `plantillas-tareas/${id}/actividades/${eventoId}`, plantilla.titulo)
      return responder({ aplicacion: { id: aplicacionId, plantilla_id: id, evento_id: eventoId, cantidad_tareas: items.results.length } }, 201)
    }
    if (request.method === 'POST' && !id) {
      let datos
      try { datos = await request.json() } catch { return error('Los datos de la checklist no son válidos.', 400) }
      const resultado = plantillaTareasCmsDesde(datos)
      if (resultado.error) return error(resultado.error, 400)
      if (!puedeGestionarEquipoCms(alcance, resultado.plantilla.equipo_id)) return error('Elegí un equipo que coordinás para crear la checklist.', 403)
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, { equipo_id: resultado.plantilla.equipo_id })
      if (referenciaInvalida) return error(referenciaInvalida, 400)
      const plantilla = { id: crypto.randomUUID(), ...resultado.plantilla }
      const consultas = [env.BASE.prepare('INSERT INTO plantillas_tareas_cms (id, titulo, descripcion, equipo_id, creado_por) VALUES (?1, ?2, ?3, ?4, ?5)').bind(plantilla.id, plantilla.titulo, plantilla.descripcion, plantilla.equipo_id, sesion.correo)]
      plantilla.tareas.forEach((item) => consultas.push(env.BASE.prepare('INSERT INTO plantilla_tareas_items_cms (id, plantilla_id, titulo, descripcion, prioridad, dias_antes, orden) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)').bind(crypto.randomUUID(), plantilla.id, item.titulo, item.descripcion, item.prioridad, item.dias_antes, item.orden)))
      try { await env.BASE.batch(consultas) } catch { return error('Ya existe una checklist con ese nombre.', 409) }
      await registrar(env.BASE, sesion, 'crear checklist CMS', `plantillas-tareas/${plantilla.id}`, plantilla.titulo)
      return responder({ plantilla: { id: plantilla.id, titulo: plantilla.titulo, cantidad_tareas: plantilla.tareas.length } }, 201)
    }
  }

  if (recurso === 'decisiones' && id) {
    if (partes[3] === 'tarea' && request.method === 'POST') {
      const decision = await env.BASE.prepare(`SELECT d.*, r.equipo_id, r.proyecto_id FROM decisiones_cms d
        JOIN reuniones_cms r ON r.id = d.reunion_id WHERE d.id = ?1`).bind(id).first()
      if (!decision) return error('No encontramos esa decisión.', 404)
      if (!puedeGestionarEquipoCms(alcance, decision.equipo_id)) return error('No podés crear tareas desde esta decisión.', 403)
      const politicas = await politicasCrearTareasCms(env.BASE)
      if (!puedeCrearTareaCms(alcance, sesion, decision.equipo_id, politicas)) return error('No tenés permiso para crear tareas desde esta decisión.', 403)
      if (decision.tarea_id) return error('Esta decisión ya tiene una tarea vinculada.', 409)
      const tarea = { id: crypto.randomUUID(), titulo: decision.titulo, descripcion: decision.motivo, tipo: 'tarea', estado: 'pendiente', prioridad: 'normal', equipo_id: decision.equipo_id, proyecto_id: decision.proyecto_id, responsable_correo: decision.responsable_correo }
      const insertarTarea = env.BASE.prepare(`INSERT INTO tareas_cms
        (id, titulo, descripcion, tipo, estado, prioridad, equipo_id, proyecto_id, responsable_correo, creado_por)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`)
        .bind(tarea.id, tarea.titulo, tarea.descripcion, tarea.tipo, tarea.estado, tarea.prioridad, tarea.equipo_id, tarea.proyecto_id, tarea.responsable_correo, sesion.correo)
      const vincularDecision = env.BASE.prepare('UPDATE decisiones_cms SET tarea_id = ?2, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1').bind(id, tarea.id)
      await env.BASE.batch([insertarTarea, vincularDecision])
      await registrar(env.BASE, sesion, 'crear tarea desde decisión CMS', `decisiones/${id}`, tarea.titulo)
      return responder({ tarea }, 201)
    }
  }

  if (recurso === 'riesgos' && id && request.method === 'PATCH') {
    const actual = await env.BASE.prepare(`SELECT r.*, p.equipo_id FROM proyecto_riesgos_cms r
      JOIN proyectos_cms p ON p.id = r.proyecto_id WHERE r.id = ?1`).bind(id).first()
    if (!actual) return error('No encontramos ese riesgo.', 404)
    if (!puedeGestionarEquipoCms(alcance, actual.equipo_id)) return error('No podés modificar este riesgo.', 403)
    let datos
    try { datos = await request.json() } catch { return error('Los cambios del riesgo no son válidos.', 400) }
    const resultado = riesgoProyectoCmsDesde(datos, actual)
    if (resultado.error) return error(resultado.error, 400)
    const referenciaInvalida = await referenciasCmsValidas(env.BASE, { responsable_correo: resultado.riesgo.responsable_correo })
    if (referenciaInvalida) return error(referenciaInvalida, 400)
    const riesgo = resultado.riesgo
    await env.BASE.prepare(`UPDATE proyecto_riesgos_cms SET titulo = ?2, descripcion = ?3, nivel = ?4, estado = ?5,
      responsable_correo = ?6, fecha_revision = ?7, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1`)
      .bind(id, riesgo.titulo, riesgo.descripcion, riesgo.nivel, riesgo.estado, riesgo.responsable_correo, riesgo.fecha_revision).run()
    await registrar(env.BASE, sesion, 'modificar riesgo de proyecto CMS', `riesgos/${id}`, riesgo.titulo)
    return responder({ riesgo: { id, proyecto_id: actual.proyecto_id, ...riesgo } })
  }

  if (recurso === 'hitos' && id && request.method === 'PATCH') {
    const actual = await env.BASE.prepare(`SELECT h.*, p.equipo_id FROM proyecto_hitos_cms h
      JOIN proyectos_cms p ON p.id = h.proyecto_id WHERE h.id = ?1`).bind(id).first()
    if (!actual) return error('No encontramos ese hito.', 404)
    if (!puedeGestionarEquipoCms(alcance, actual.equipo_id)) return error('No podés modificar este hito.', 403)
    let datos
    try { datos = await request.json() } catch { return error('Los cambios del hito no son válidos.', 400) }
    const resultado = hitoProyectoCmsDesde(datos, actual)
    if (resultado.error) return error(resultado.error, 400)
    const referenciaInvalida = await referenciasCmsValidas(env.BASE, { responsable_correo: resultado.hito.responsable_correo })
    if (referenciaInvalida) return error(referenciaInvalida, 400)
    const hito = resultado.hito
    await env.BASE.prepare(`UPDATE proyecto_hitos_cms SET titulo = ?2, descripcion = ?3, fecha_objetivo = ?4, estado = ?5,
      responsable_correo = ?6, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1`)
      .bind(id, hito.titulo, hito.descripcion, hito.fecha_objetivo, hito.estado, hito.responsable_correo).run()
    await registrar(env.BASE, sesion, 'modificar hito de proyecto CMS', `hitos/${id}`, hito.titulo)
    return responder({ hito: { id, proyecto_id: actual.proyecto_id, ...hito } })
  }

  if (recurso === 'proyectos') {
    if (id && partes[3] === 'contexto' && request.method === 'GET') {
      const proyecto = await env.BASE.prepare(`SELECT p.*, e.nombre AS equipo_nombre, u.nombre AS responsable_nombre,
        (SELECT COALESCE(SUM(g.monto), 0) FROM proyecto_gastos_cms g WHERE g.proyecto_id = p.id) AS presupuesto_ejecutado
        FROM proyectos_cms p LEFT JOIN equipos e ON e.id = p.equipo_id LEFT JOIN usuarios u ON u.correo = p.responsable_correo
        WHERE p.id = ?1`).bind(id).first()
      if (!proyecto) return error('No encontramos ese proyecto.', 404)
      if (!alcance.global && (alcance.perfil !== 'coordinacion' || !puedeVerEquipoCms(alcance, proyecto.equipo_id))) {
        return error('No tenés acceso a este proyecto.', 403)
      }
      const [tareas, eventos, reuniones, decisiones, documentos, riesgos, hitos, gastos] = await Promise.all([
        env.BASE.prepare(`SELECT t.*, u.nombre AS responsable_nombre FROM tareas_cms t LEFT JOIN usuarios u ON u.correo = t.responsable_correo
          WHERE t.proyecto_id = ?1 ORDER BY t.estado IN ('completada', 'cancelada'), t.fecha_limite IS NULL, t.fecha_limite, t.actualizado_en DESC`).bind(id).all(),
        env.BASE.prepare(`SELECT e.*, u.nombre AS responsable_nombre,
          (SELECT i.id FROM entradas_cms i WHERE i.evento_id = e.id LIMIT 1) AS entrada_id
          FROM eventos_cms e LEFT JOIN usuarios u ON u.correo = e.responsable_correo
          WHERE e.proyecto_id = ?1 ORDER BY e.fecha_hora DESC`).bind(id).all(),
        env.BASE.prepare(`SELECT r.*, u.nombre AS creador_nombre FROM reuniones_cms r LEFT JOIN usuarios u ON u.correo = r.creado_por
          WHERE r.proyecto_id = ?1 ORDER BY r.fecha_hora DESC`).bind(id).all(),
        env.BASE.prepare(`SELECT d.*, r.titulo AS reunion_titulo, u.nombre AS responsable_nombre FROM decisiones_cms d
          JOIN reuniones_cms r ON r.id = d.reunion_id LEFT JOIN usuarios u ON u.correo = d.responsable_correo
          WHERE r.proyecto_id = ?1 ORDER BY d.actualizado_en DESC`).bind(id).all(),
        env.BASE.prepare('SELECT * FROM documentos_cms WHERE proyecto_id = ?1 ORDER BY actualizado_en DESC').bind(id).all(),
        env.BASE.prepare(`SELECT r.*, u.nombre AS responsable_nombre FROM proyecto_riesgos_cms r LEFT JOIN usuarios u ON u.correo = r.responsable_correo
          WHERE r.proyecto_id = ?1 ORDER BY r.estado = 'mitigado', r.fecha_revision IS NULL, r.fecha_revision, r.actualizado_en DESC`).bind(id).all(),
        env.BASE.prepare(`SELECT h.*, u.nombre AS responsable_nombre FROM proyecto_hitos_cms h LEFT JOIN usuarios u ON u.correo = h.responsable_correo
          WHERE h.proyecto_id = ?1 ORDER BY h.estado = 'cancelado', h.fecha_objetivo IS NULL, h.fecha_objetivo, h.actualizado_en DESC`).bind(id).all(),
        env.BASE.prepare('SELECT * FROM proyecto_gastos_cms WHERE proyecto_id = ?1 ORDER BY fecha DESC, creado_en DESC').bind(id).all(),
      ])
      const accesoRespuestas = puedeVerRespuestasCms(sesion)
      const tareasVisibles = tareas.results.map((tarea) => tareaCmsVisiblePara(tarea, sesion, accesoRespuestas))
      const eventosVisibles = accesoRespuestas
        ? eventos.results.map(({ entrada_id, ...evento }) => evento)
        : eventos.results.map(eventoCmsSinDatosDeEntrada)
      return responder({ proyecto, tareas: tareasVisibles, eventos: eventosVisibles, reuniones: reuniones.results, decisiones: decisiones.results, documentos: documentos.results.filter((documento) => puedeVerDocumentoCms(sesion, documento)), riesgos: riesgos.results, hitos: hitos.results, gastos: gastos.results })
    }
    if (id && partes[3] === 'hitos' && request.method === 'POST') {
      const proyecto = await env.BASE.prepare("SELECT id, equipo_id FROM proyectos_cms WHERE id = ?1 AND estado != 'cerrado'").bind(id).first()
      if (!proyecto) return error('El proyecto seleccionado ya no está disponible para registrar hitos.', 404)
      if (!puedeGestionarEquipoCms(alcance, proyecto.equipo_id)) return error('No podés registrar hitos en este proyecto.', 403)
      let datos
      try { datos = await request.json() } catch { return error('Los datos del hito no son válidos.', 400) }
      const resultado = hitoProyectoCmsDesde(datos)
      if (resultado.error) return error(resultado.error, 400)
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, { responsable_correo: resultado.hito.responsable_correo })
      if (referenciaInvalida) return error(referenciaInvalida, 400)
      const hito = { id: crypto.randomUUID(), proyecto_id: id, ...resultado.hito }
      await env.BASE.prepare(`INSERT INTO proyecto_hitos_cms
        (id, proyecto_id, titulo, descripcion, fecha_objetivo, estado, responsable_correo, creado_por)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`)
        .bind(hito.id, hito.proyecto_id, hito.titulo, hito.descripcion, hito.fecha_objetivo, hito.estado, hito.responsable_correo, sesion.correo).run()
      await registrar(env.BASE, sesion, 'registrar hito de proyecto CMS', `proyectos/${id}/hitos/${hito.id}`, hito.titulo)
      return responder({ hito }, 201)
    }
    if (id && partes[3] === 'gastos' && request.method === 'POST') {
      const proyecto = await env.BASE.prepare("SELECT id, equipo_id FROM proyectos_cms WHERE id = ?1 AND estado != 'cerrado'").bind(id).first()
      if (!proyecto) return error('El proyecto seleccionado ya no está disponible para registrar gastos.', 404)
      if (!puedeGestionarEquipoCms(alcance, proyecto.equipo_id)) return error('No podés registrar gastos en este proyecto.', 403)
      let datos
      try { datos = await request.json() } catch { return error('Los datos del gasto no son válidos.', 400) }
      const resultado = gastoProyectoCmsDesde(datos)
      if (resultado.error) return error(resultado.error, 400)
      const gasto = { id: crypto.randomUUID(), proyecto_id: id, ...resultado.gasto }
      await env.BASE.prepare(`INSERT INTO proyecto_gastos_cms (id, proyecto_id, concepto, monto, fecha, notas, creado_por)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`)
        .bind(gasto.id, gasto.proyecto_id, gasto.concepto, gasto.monto, gasto.fecha, gasto.notas, sesion.correo).run()
      await registrar(env.BASE, sesion, 'registrar gasto de proyecto CMS', `proyectos/${id}/gastos/${gasto.id}`, gasto.concepto)
      return responder({ gasto }, 201)
    }
    if (id && partes[3] === 'riesgos' && request.method === 'POST') {
      const proyecto = await env.BASE.prepare("SELECT id, equipo_id FROM proyectos_cms WHERE id = ?1 AND estado != 'cerrado'").bind(id).first()
      if (!proyecto) return error('El proyecto seleccionado ya no está disponible para registrar riesgos.', 404)
      if (!puedeGestionarEquipoCms(alcance, proyecto.equipo_id)) return error('No podés registrar riesgos en este proyecto.', 403)
      let datos
      try { datos = await request.json() } catch { return error('Los datos del riesgo no son válidos.', 400) }
      const resultado = riesgoProyectoCmsDesde(datos)
      if (resultado.error) return error(resultado.error, 400)
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, { responsable_correo: resultado.riesgo.responsable_correo })
      if (referenciaInvalida) return error(referenciaInvalida, 400)
      const riesgo = { id: crypto.randomUUID(), proyecto_id: id, ...resultado.riesgo }
      await env.BASE.prepare(`INSERT INTO proyecto_riesgos_cms
        (id, proyecto_id, titulo, descripcion, nivel, estado, responsable_correo, fecha_revision, creado_por)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`)
        .bind(riesgo.id, riesgo.proyecto_id, riesgo.titulo, riesgo.descripcion, riesgo.nivel, riesgo.estado, riesgo.responsable_correo, riesgo.fecha_revision, sesion.correo).run()
      await registrar(env.BASE, sesion, 'registrar riesgo de proyecto CMS', `proyectos/${id}/riesgos/${riesgo.id}`, riesgo.titulo)
      return responder({ riesgo }, 201)
    }
    if (request.method === 'GET') {
      const filas = await env.BASE.prepare(`SELECT p.*, e.nombre AS equipo_nombre, g.nombre AS programa_nombre, u.nombre AS responsable_nombre
        FROM proyectos_cms p LEFT JOIN equipos e ON e.id = p.equipo_id LEFT JOIN programas_cms g ON g.id = p.programa_id LEFT JOIN usuarios u ON u.correo = p.responsable_correo
        ORDER BY p.estado = 'cerrado', p.fecha_fin IS NULL, p.fecha_fin, p.actualizado_en DESC`).all()
      return responder({ proyectos: alcance.global ? filas.results : alcance.perfil === 'coordinacion'
        ? filas.results.filter((fila) => puedeVerEquipoCms(alcance, fila.equipo_id)) : [] })
    }
    if (request.method === 'POST') {
      let datos
      try { datos = await request.json() } catch { return error('Los datos del proyecto no son válidos.', 400) }
      const resultado = proyectoCmsDesde(datos)
      if (resultado.error) return error(resultado.error, 400)
      if (!puedeGestionarEquipoCms(alcance, resultado.proyecto.equipo_id)) return error('Elegí un equipo que coordinás para crear el proyecto.', 403)
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, resultado.proyecto)
      if (referenciaInvalida) return error(referenciaInvalida, 400)
      const proyecto = { id: crypto.randomUUID(), ...resultado.proyecto }
      await env.BASE.prepare(`INSERT INTO proyectos_cms
        (id, titulo, objetivo, programa_id, equipo_id, unidad_id, responsable_correo, estado, prioridad, fecha_inicio, fecha_fin, presupuesto, notas, creado_por)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`)
        .bind(proyecto.id, proyecto.titulo, proyecto.objetivo, proyecto.programa_id, proyecto.equipo_id, proyecto.unidad_id, proyecto.responsable_correo, proyecto.estado, proyecto.prioridad, proyecto.fecha_inicio, proyecto.fecha_fin, proyecto.presupuesto, proyecto.notas, sesion.correo).run()
      await registrar(env.BASE, sesion, 'crear proyecto CMS', `proyectos/${proyecto.id}`, proyecto.titulo)
      return responder({ proyecto }, 201)
    }
    if (request.method === 'PATCH' && id) {
      const actual = await env.BASE.prepare('SELECT * FROM proyectos_cms WHERE id = ?1').bind(id).first()
      if (!actual) return error('No encontramos ese proyecto.', 404)
      if (!puedeGestionarEquipoCms(alcance, actual.equipo_id)) return error('No podés modificar este proyecto.', 403)
      let datos
      try { datos = await request.json() } catch { return error('Los cambios del proyecto no son válidos.', 400) }
      const resultado = proyectoCmsDesde(datos, actual)
      if (resultado.error) return error(resultado.error, 400)
      const proyecto = resultado.proyecto
      if (!puedeGestionarEquipoCms(alcance, proyecto.equipo_id)) return error('No podés mover este proyecto a otro equipo.', 403)
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, proyecto)
      if (referenciaInvalida) return error(referenciaInvalida, 400)
      await env.BASE.prepare(`UPDATE proyectos_cms SET titulo = ?2, objetivo = ?3, programa_id = ?4, equipo_id = ?5, unidad_id = ?6, responsable_correo = ?7,
        estado = ?8, prioridad = ?9, fecha_inicio = ?10, fecha_fin = ?11, presupuesto = ?12, notas = ?13, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1`)
        .bind(id, proyecto.titulo, proyecto.objetivo, proyecto.programa_id, proyecto.equipo_id, proyecto.unidad_id, proyecto.responsable_correo, proyecto.estado, proyecto.prioridad, proyecto.fecha_inicio, proyecto.fecha_fin, proyecto.presupuesto, proyecto.notas).run()
      await registrar(env.BASE, sesion, 'modificar proyecto CMS', `proyectos/${id}`, proyecto.titulo)
      return responder({ proyecto: { id, ...proyecto } })
    }
  }

  if (recurso === 'documentos') {
    if (request.method === 'GET') {
      const filas = await env.BASE.prepare(`SELECT d.*, e.nombre AS equipo_nombre, p.titulo AS proyecto_titulo, o.nombre AS unidad_nombre, o.sigla AS unidad_sigla FROM documentos_cms d LEFT JOIN equipos e ON e.id = d.equipo_id LEFT JOIN proyectos_cms p ON p.id = d.proyecto_id LEFT JOIN unidades_operativas_cms o ON o.id = d.unidad_id ORDER BY d.actualizado_en DESC`).all()
      return responder({ documentos: filas.results.filter((documento) => puedeVerDocumentoCms(sesion, documento)
        && (alcance.global || documento.sensibilidad === 'compartido' || puedeVerEquipoCms(alcance, documento.equipo_id))) })
    }
    if (request.method === 'POST') {
      let datos; try { datos = await request.json() } catch { return error('Los datos del documento no son válidos.', 400) }
      const resultado = documentoCmsDesde(datos); if (resultado.error) return error(resultado.error, 400)
      if (!puedeGestionarEquipoCms(alcance, resultado.documento.equipo_id)) return error('Elegí un equipo que coordinás para agregar el documento.', 403)
      if (resultado.documento.sensibilidad === 'restringido' && !esAdmin(sesion)) return error('Solo la administración puede marcar un documento como restringido.', 403)
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, resultado.documento); if (referenciaInvalida) return error(referenciaInvalida, 400)
      const documento = { id: crypto.randomUUID(), ...resultado.documento }
      await env.BASE.prepare('INSERT INTO documentos_cms (id, titulo, descripcion, tipo, url, sensibilidad, equipo_id, unidad_id, proyecto_id, creado_por) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)').bind(documento.id, documento.titulo, documento.descripcion, documento.tipo, documento.url, documento.sensibilidad, documento.equipo_id, documento.unidad_id, documento.proyecto_id, sesion.correo).run()
      await registrar(env.BASE, sesion, 'agregar documento CMS', `documentos/${documento.id}`, documento.titulo)
      return responder({ documento }, 201)
    }
  }

  if (recurso === 'alianzas') {
    if (request.method === 'POST' && !id) {
      let datos; try { datos = await request.json() } catch { return error('Los datos de la alianza no son válidos.', 400) }
      const resultado = alianzaCmsDesde(datos); if (resultado.error) return error(resultado.error, 400)
      if (!puedeGestionarEquipoCms(alcance, resultado.alianza.equipo_id)) return error('Elegí un equipo que coordinás para registrar la alianza.', 403)
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, resultado.alianza); if (referenciaInvalida) return error(referenciaInvalida, 400)
      const alianza = { id: crypto.randomUUID(), ...resultado.alianza }
      await env.BASE.prepare(`INSERT INTO alianzas_cms
        (id, nombre, tipo, descripcion, contacto_institucional, estado, equipo_id, proyecto_id, creado_por)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`)
        .bind(alianza.id, alianza.nombre, alianza.tipo, alianza.descripcion, alianza.contacto_institucional, alianza.estado, alianza.equipo_id, alianza.proyecto_id, sesion.correo).run()
      await registrar(env.BASE, sesion, 'registrar alianza CMS', `alianzas/${alianza.id}`, alianza.nombre)
      return responder({ alianza }, 201)
    }
    if (request.method === 'PATCH' && id) {
      const actual = await env.BASE.prepare('SELECT * FROM alianzas_cms WHERE id = ?1').bind(id).first()
      if (!actual) return error('No encontramos esa alianza.', 404)
      if (!puedeGestionarEquipoCms(alcance, actual.equipo_id)) return error('No podés modificar esta alianza.', 403)
      let datos; try { datos = await request.json() } catch { return error('Los cambios de la alianza no son válidos.', 400) }
      const resultado = alianzaCmsDesde(datos, actual); if (resultado.error) return error(resultado.error, 400)
      if (!puedeGestionarEquipoCms(alcance, resultado.alianza.equipo_id)) return error('No podés mover esta alianza a otro equipo.', 403)
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, resultado.alianza); if (referenciaInvalida) return error(referenciaInvalida, 400)
      const alianza = resultado.alianza
      await env.BASE.prepare(`UPDATE alianzas_cms SET nombre = ?2, tipo = ?3, descripcion = ?4, contacto_institucional = ?5, estado = ?6,
        equipo_id = ?7, proyecto_id = ?8, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1`)
        .bind(id, alianza.nombre, alianza.tipo, alianza.descripcion, alianza.contacto_institucional, alianza.estado, alianza.equipo_id, alianza.proyecto_id).run()
      await registrar(env.BASE, sesion, 'modificar alianza CMS', `alianzas/${id}`, alianza.nombre)
      return responder({ alianza: { id, ...alianza } })
    }
  }

  if (recurso === 'programas') {
    if (request.method === 'POST' && !id) {
      let datos; try { datos = await request.json() } catch { return error('Los datos del programa no son válidos.', 400) }
      const resultado = programaCmsDesde(datos); if (resultado.error) return error(resultado.error, 400)
      if (!puedeGestionarEquipoCms(alcance, resultado.programa.equipo_id)) return error('Elegí un equipo que coordinás para registrar el programa.', 403)
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, resultado.programa); if (referenciaInvalida) return error(referenciaInvalida, 400)
      const programa = { id: crypto.randomUUID(), ...resultado.programa }
      await env.BASE.prepare(`INSERT INTO programas_cms (id, nombre, descripcion, estado, equipo_id, creado_por)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)`).bind(programa.id, programa.nombre, programa.descripcion, programa.estado, programa.equipo_id, sesion.correo).run()
      await registrar(env.BASE, sesion, 'registrar programa CMS', `programas/${programa.id}`, programa.nombre)
      return responder({ programa }, 201)
    }
    if (request.method === 'PATCH' && id) {
      const actual = await env.BASE.prepare('SELECT * FROM programas_cms WHERE id = ?1').bind(id).first()
      if (!actual) return error('No encontramos ese programa.', 404)
      if (!puedeGestionarEquipoCms(alcance, actual.equipo_id)) return error('No podés modificar este programa.', 403)
      let datos; try { datos = await request.json() } catch { return error('Los cambios del programa no son válidos.', 400) }
      const resultado = programaCmsDesde(datos, actual); if (resultado.error) return error(resultado.error, 400)
      if (!puedeGestionarEquipoCms(alcance, resultado.programa.equipo_id)) return error('No podés mover este programa a otro equipo.', 403)
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, resultado.programa); if (referenciaInvalida) return error(referenciaInvalida, 400)
      const programa = resultado.programa
      await env.BASE.prepare(`UPDATE programas_cms SET nombre = ?2, descripcion = ?3, estado = ?4, equipo_id = ?5,
        actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1`).bind(id, programa.nombre, programa.descripcion, programa.estado, programa.equipo_id).run()
      await registrar(env.BASE, sesion, 'modificar programa CMS', `programas/${id}`, programa.nombre)
      return responder({ programa: { id, ...programa } })
    }
  }

  if (recurso === 'unidades') {
    if (request.method === 'GET' && !id) {
      const filas = await env.BASE.prepare(`SELECT u.*, e.nombre AS equipo_nombre, p.nombre AS unidad_padre_nombre
        FROM unidades_operativas_cms u JOIN equipos e ON e.id = u.equipo_id
        LEFT JOIN unidades_operativas_cms p ON p.id = u.unidad_padre_id
        WHERE u.estado != 'archivada' ORDER BY e.nombre COLLATE NOCASE, u.orden, u.nombre COLLATE NOCASE`).all()
      return responder({ unidades: alcance.global ? filas.results : filas.results.filter((fila) => puedeVerEquipoCms(alcance, fila.equipo_id)) })
    }
    if (request.method === 'PUT' && id && partes[3] === 'vistas') {
      const unidad = await env.BASE.prepare("SELECT id, equipo_id FROM unidades_operativas_cms WHERE id = ?1 AND estado != 'archivada'").bind(id).first()
      if (!unidad) return error('No encontramos esa unidad.', 404)
      let datos; try { datos = await request.json() } catch { return error('Las vistas compartidas no son válidas.', 400) }
      if (!Array.isArray(datos.vistas)) return error('Enviá una lista de vistas compartidas.', 400)
      const enfoques = new Set(['operativo', 'financiero', 'comunicacion'])
      const vistas = []
      const claves = new Set()
      for (const fila of datos.vistas) {
        const equipoId = textoCms(fila?.equipo_id, 100)
        const enfoque = textoCms(fila?.enfoque, 30)
        if (!equipoId || !enfoques.has(enfoque)) return error('Cada vista necesita un área y un enfoque válidos.', 400)
        if (equipoId === unidad.equipo_id) return error('El área responsable ya muestra la unidad y no necesita una vista compartida.', 400)
        const clave = `${equipoId}:${enfoque}`
        if (claves.has(clave)) return error('La misma vista compartida está repetida.', 400)
        claves.add(clave); vistas.push({ equipo_id: equipoId, enfoque })
      }
      if (vistas.length) {
        const equipos = await env.BASE.prepare(`SELECT id FROM equipos WHERE activo = 1 AND id IN (${vistas.map((_, indice) => `?${indice + 1}`).join(', ')})`)
          .bind(...vistas.map((vista) => vista.equipo_id)).all()
        if ((equipos.results || []).length !== new Set(vistas.map((vista) => vista.equipo_id)).size) return error('Una de las áreas compartidas ya no está disponible.', 400)
      }
      await env.BASE.batch([
        env.BASE.prepare('DELETE FROM unidades_vistas_equipo_cms WHERE unidad_id = ?1').bind(id),
        ...vistas.map((vista) => env.BASE.prepare('INSERT INTO unidades_vistas_equipo_cms (unidad_id, equipo_id, enfoque) VALUES (?1, ?2, ?3)').bind(id, vista.equipo_id, vista.enfoque)),
      ])
      await registrar(env.BASE, sesion, 'configurar vistas de unidad CMS', `unidades/${id}/vistas`, `${vistas.length} vistas`)
      return responder({ vistas })
    }
    if (request.method === 'POST' && !id) {
      let datos; try { datos = await request.json() } catch { return error('Los datos de la unidad no son válidos.', 400) }
      const resultado = unidadOperativaCmsDesde(datos); if (resultado.error) return error(resultado.error, 400)
      const unidad = { id: crypto.randomUUID(), ...resultado.unidad }
      const equipo = await env.BASE.prepare('SELECT id FROM equipos WHERE id = ?1 AND activo = 1').bind(unidad.equipo_id).first()
      if (!equipo) return error('El área responsable ya no está disponible.', 400)
      if (unidad.unidad_padre_id) {
        const padre = await env.BASE.prepare("SELECT id, equipo_id FROM unidades_operativas_cms WHERE id = ?1 AND estado != 'archivada'").bind(unidad.unidad_padre_id).first()
        if (!padre || padre.equipo_id !== unidad.equipo_id) return error('La unidad superior debe pertenecer a la misma área.', 400)
      }
      try {
        await env.BASE.prepare(`INSERT INTO unidades_operativas_cms
          (id, clave, nombre, sigla, descripcion, tipo, equipo_id, unidad_padre_id, color, orden, estado, creado_por)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`)
          .bind(unidad.id, unidad.clave, unidad.nombre, unidad.sigla, unidad.descripcion, unidad.tipo, unidad.equipo_id, unidad.unidad_padre_id, unidad.color, unidad.orden, unidad.estado, sesion.correo).run()
      } catch { return error('Ya existe una unidad con esa clave.', 409) }
      await registrar(env.BASE, sesion, 'crear unidad operativa CMS', `unidades/${unidad.id}`, unidad.nombre)
      return responder({ unidad }, 201)
    }
    if (request.method === 'PATCH' && id) {
      const actual = await env.BASE.prepare('SELECT * FROM unidades_operativas_cms WHERE id = ?1').bind(id).first()
      if (!actual) return error('No encontramos esa unidad.', 404)
      let datos; try { datos = await request.json() } catch { return error('Los cambios de la unidad no son válidos.', 400) }
      const resultado = unidadOperativaCmsDesde(datos, actual); if (resultado.error) return error(resultado.error, 400)
      const unidad = resultado.unidad
      if (unidad.unidad_padre_id === id) return error('Una unidad no puede depender de sí misma.', 400)
      const equipo = await env.BASE.prepare('SELECT id FROM equipos WHERE id = ?1 AND activo = 1').bind(unidad.equipo_id).first()
      if (!equipo) return error('El área responsable ya no está disponible.', 400)
      if (unidad.unidad_padre_id) {
        const padre = await env.BASE.prepare("SELECT id, equipo_id FROM unidades_operativas_cms WHERE id = ?1 AND estado != 'archivada'").bind(unidad.unidad_padre_id).first()
        if (!padre || padre.equipo_id !== unidad.equipo_id) return error('La unidad superior debe pertenecer a la misma área.', 400)
      }
      try {
        await env.BASE.prepare(`UPDATE unidades_operativas_cms SET clave = ?2, nombre = ?3, sigla = ?4, descripcion = ?5,
          tipo = ?6, equipo_id = ?7, unidad_padre_id = ?8, color = ?9, orden = ?10, estado = ?11,
          actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1`)
          .bind(id, unidad.clave, unidad.nombre, unidad.sigla, unidad.descripcion, unidad.tipo, unidad.equipo_id, unidad.unidad_padre_id, unidad.color, unidad.orden, unidad.estado).run()
      } catch { return error('Ya existe una unidad con esa clave.', 409) }
      await registrar(env.BASE, sesion, 'modificar unidad operativa CMS', `unidades/${id}`, unidad.nombre)
      return responder({ unidad: { id, ...unidad } })
    }
  }

  if (recurso === 'formularios') {
    if (request.method === 'POST' && id === 'ejemplos') {
      if (!alcance.global) return error('Solo Dirección o Administración puede preparar los formularios de prueba.', 403)
      const filasEquipos = await env.BASE.prepare("SELECT id, clave FROM equipos WHERE activo = 1 AND clave IN ('familias', 'deportes', 'capacitaciones', 'administracion')").all()
      const equipos = Object.fromEntries((filasEquipos.results || []).map((equipo) => [equipo.clave, equipo.id]))
      const faltantes = ['familias', 'deportes', 'capacitaciones', 'administracion'].filter((clave) => !equipos[clave])
      if (faltantes.length) return error(`Faltan equipos institucionales para preparar las pruebas: ${faltantes.join(', ')}.`, 409)
      const plantillas = formulariosPruebaCms(equipos)
      const existentes = await env.BASE.prepare(`SELECT id FROM formularios_cms WHERE id IN (${plantillas.map((_, indice) => `?${indice + 1}`).join(', ')})`).bind(...plantillas.map((formulario) => formulario.id)).all()
      const idsExistentes = new Set((existentes.results || []).map((formulario) => formulario.id))
      const nuevos = plantillas.filter((formulario) => !idsExistentes.has(formulario.id)).map((plantilla) => {
        const resultado = formularioCmsDesde(plantilla)
        if (resultado.error) throw new Error(resultado.error)
        const formulario = resultado.formulario
        return env.BASE.prepare(`INSERT INTO formularios_cms
          (id, titulo, descripcion, tipo, visibilidad, estado, equipo_id, equipo_solicitante_id, prioridad, proyecto_id, campos_json,
            finalidad, responsable_datos, conservacion_meses, requiere_consentimiento, destino_respuesta, creado_por)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)`)
          .bind(plantilla.id, formulario.titulo, formulario.descripcion, formulario.tipo, formulario.visibilidad, formulario.estado,
            formulario.equipo_id, formulario.equipo_solicitante_id, formulario.prioridad, formulario.proyecto_id, formulario.campos_json,
            formulario.finalidad, formulario.responsable_datos, formulario.conservacion_meses, formulario.requiere_consentimiento ? 1 : 0,
            formulario.destino_respuesta, sesion.correo)
      })
      if (nuevos.length) await env.BASE.batch(nuevos)
      await registrar(env.BASE, sesion, 'preparar formularios de prueba', 'formularios/ejemplos', `${nuevos.length} creados`)
      return responder({ creados: nuevos.length, disponibles: plantillas.length })
    }
    if (request.method === 'POST' && !id) {
      let datos; try { datos = await request.json() } catch { return error('Los datos del formulario no son válidos.', 400) }
      const resultado = formularioCmsDesde(datos); if (resultado.error) return error(resultado.error, 400)
      if (!puedeGestionarEquipoCms(alcance, resultado.formulario.equipo_id)) return error('Elegí un equipo que coordinás para crear el formulario.', 403)
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, resultado.formulario); if (referenciaInvalida) return error(referenciaInvalida, 400)
      const formulario = { id: crypto.randomUUID(), ...resultado.formulario }
      await env.BASE.prepare(`INSERT INTO formularios_cms
        (id, titulo, descripcion, tipo, visibilidad, estado, equipo_id, unidad_id, equipo_solicitante_id, prioridad, proyecto_id, campos_json,
          finalidad, responsable_datos, conservacion_meses, requiere_consentimiento, destino_respuesta, configuracion_publica_json, creado_por)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)`)
        .bind(formulario.id, formulario.titulo, formulario.descripcion, formulario.tipo, formulario.visibilidad, formulario.estado, formulario.equipo_id, formulario.unidad_id, formulario.equipo_solicitante_id, formulario.prioridad, formulario.proyecto_id, formulario.campos_json, formulario.finalidad, formulario.responsable_datos, formulario.conservacion_meses, formulario.requiere_consentimiento ? 1 : 0, formulario.destino_respuesta, formulario.configuracion_publica_json, sesion.correo).run()
      await registrar(env.BASE, sesion, 'crear formulario CMS', `formularios/${formulario.id}`, formulario.titulo)
      return responder({ formulario }, 201)
    }
    if (id && request.method === 'PATCH') {
      const actual = await env.BASE.prepare('SELECT * FROM formularios_cms WHERE id = ?1').bind(id).first()
      if (!actual) return error('No encontramos ese formulario.', 404)
      if (!puedeGestionarEquipoCms(alcance, actual.equipo_id)) return error('No podés modificar este formulario.', 403)
      let datos; try { datos = await request.json() } catch { return error('Los cambios del formulario no son válidos.', 400) }
      const resultado = formularioCmsDesde(datos, actual); if (resultado.error) return error(resultado.error, 400)
      if (!puedeGestionarEquipoCms(alcance, resultado.formulario.equipo_id)) return error('No podés mover este formulario a otro equipo.', 403)
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, resultado.formulario); if (referenciaInvalida) return error(referenciaInvalida, 400)
      const formulario = resultado.formulario
      await env.BASE.prepare(`UPDATE formularios_cms SET titulo = ?2, descripcion = ?3, tipo = ?4, visibilidad = ?5, estado = ?6,
        equipo_id = ?7, unidad_id = ?8, equipo_solicitante_id = ?9, prioridad = ?10, proyecto_id = ?11, campos_json = ?12,
        finalidad = ?13, responsable_datos = ?14, conservacion_meses = ?15, requiere_consentimiento = ?16,
        destino_respuesta = ?17, configuracion_publica_json = ?18, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1`)
        .bind(id, formulario.titulo, formulario.descripcion, formulario.tipo, formulario.visibilidad, formulario.estado, formulario.equipo_id, formulario.unidad_id, formulario.equipo_solicitante_id, formulario.prioridad, formulario.proyecto_id, formulario.campos_json, formulario.finalidad, formulario.responsable_datos, formulario.conservacion_meses, formulario.requiere_consentimiento ? 1 : 0, formulario.destino_respuesta, formulario.configuracion_publica_json).run()
      await registrar(env.BASE, sesion, 'modificar formulario CMS', `formularios/${id}`, formulario.titulo)
      return responder({ formulario: { id, ...formulario } })
    }
    if (id && partes[3] === 'respuestas' && request.method === 'POST') {
      if (!puedeVerRespuestasCms(sesion)) return error('Necesitás acceso vigente a datos personales para registrar una respuesta.', 403)
      const formulario = await env.BASE.prepare('SELECT * FROM formularios_cms WHERE id = ?1 AND estado = ?2').bind(id, 'activa').first()
      if (!formulario) return error('Este formulario no está disponible.', 404)
      if (!puedeGestionarEquipoCms(alcance, formulario.equipo_id)) return error('No podés registrar una respuesta para este formulario.', 403)
      let datos; try { datos = await request.json() } catch { return error('La respuesta no es válida.', 400) }
      const auditoriaAcuerdos = auditoriaAcuerdosFormularioDesde(datos, formulario)
      if (auditoriaAcuerdos.error) return error(auditoriaAcuerdos.error, 400)
      const resultado = respuestaFormularioCmsDesde(datos, formulario); if (resultado.error) return error(resultado.error, 400)
      resultado.entrada.respuestas = { ...(resultado.entrada.respuestas || {}), ...auditoriaAcuerdos.respuestas }
      resultado.entrada.respuestas_json = JSON.stringify(resultado.entrada.respuestas)
      const derivada = await derivarEntradaCms(env.BASE, resultado.entrada, sesion, formulario.id)
      await registrar(env.BASE, sesion, 'recibir formulario interno', `formularios/${id}`, 'Respuesta recibida')
      return responder(derivada, 201)
    }
  }

  if (recurso === 'entradas') {
    if (request.method !== 'GET' && !puedeVerRespuestasCms(sesion)) return error('Necesitás acceso vigente a datos personales para gestionar entradas.', 403)
    if (request.method === 'POST') {
      let datos; try { datos = await request.json() } catch { return error('Los datos de la entrada no son válidos.', 400) }
      const resultado = entradaCmsDesde(datos); if (resultado.error) return error(resultado.error, 400)
      if (!puedeGestionarEquipoCms(alcance, resultado.entrada.equipo_id)) return error('Elegí un equipo que coordinás para registrar la entrada.', 403)
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, resultado.entrada); if (referenciaInvalida) return error(referenciaInvalida, 400)
      const derivada = await derivarEntradaCms(env.BASE, resultado.entrada, sesion)
      await registrar(env.BASE, sesion, 'derivar entrada CMS', `entradas/${derivada.entrada.id}`, derivada.entrada.nombre)
      return responder(derivada, 201)
    }
    if (id && partes[3] === 'agendar' && request.method === 'POST') {
      const entrada = await env.BASE.prepare('SELECT * FROM entradas_cms WHERE id = ?1').bind(id).first()
      if (!entrada) return error('No encontramos esa entrada.', 404)
      if (!puedeGestionarEquipoCms(alcance, entrada.equipo_id)) return error('No podés convertir esta entrada en una fecha de agenda.', 403)
      if (!['actividad', 'evento'].includes(entrada.tipo) || !entrada.fecha_propuesta) return error('Esta entrada no incluye una fecha propuesta para agendar.', 400)
      if (entrada.evento_id) return error('Esta entrada ya fue preparada en la agenda.', 409)
      const evento = {
        id: crypto.randomUUID(), titulo: `${entrada.tipo === 'evento' ? 'Evento' : 'Actividad'} propuesta: ${entrada.nombre}`,
        descripcion: entrada.detalle, fecha_hora: entrada.fecha_propuesta, fecha_fin: null, lugar: '', equipo_id: entrada.equipo_id,
        proyecto_id: entrada.proyecto_id, responsable_correo: null, estado: 'planificado', tipo: 'actividad',
      }
      const insertarEvento = env.BASE.prepare(`INSERT INTO eventos_cms
        (id, titulo, descripcion, fecha_hora, fecha_fin, lugar, equipo_id, proyecto_id, responsable_correo, estado, tipo, creado_por)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`)
        .bind(evento.id, evento.titulo, evento.descripcion, evento.fecha_hora, evento.fecha_fin, evento.lugar, evento.equipo_id, evento.proyecto_id, evento.responsable_correo, evento.estado, evento.tipo, sesion.correo)
      const vincularEntrada = env.BASE.prepare('UPDATE entradas_cms SET evento_id = ?2, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1').bind(id, evento.id)
      const consultas = [insertarEvento, vincularEntrada]
      if (entrada.tarea_id) consultas.push(env.BASE.prepare('UPDATE tareas_cms SET evento_id = ?2, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1').bind(entrada.tarea_id, evento.id))
      await env.BASE.batch(consultas)
      await registrar(env.BASE, sesion, 'preparar entrada en agenda CMS', `entradas/${id}`, evento.titulo)
      return responder({ evento }, 201)
    }
    if (id && partes[3] === 'cumplir' && request.method === 'POST') {
      const actual = await env.BASE.prepare('SELECT * FROM entradas_cms WHERE id = ?1').bind(id).first()
      if (!actual) return error('No encontramos esa respuesta.', 404)
      if (!puedeGestionarEquipoCms(alcance, actual.equipo_id)) return error('No podés completar esta respuesta.', 403)
      if (actual.estado === 'cerrada') return error('Esta respuesta ya figura como cumplida.', 409)
      let datos; try { datos = await request.json() } catch { return error('Los datos del cumplimiento no son válidos.', 400) }
      const resultado = cumplimientoEntradaCmsDesde(datos); if (resultado.error) return error(resultado.error, 400)
      const cumplimiento = resultado.cumplimiento
      await env.BASE.batch([
        env.BASE.prepare(`UPDATE entradas_cms SET estado = 'cerrada', cumplida_en = ?2, cumplida_por = ?3,
          cumplida_medio = ?4, cumplida_motivo = ?5, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1`)
          .bind(id, cumplimiento.fecha, sesion.correo, cumplimiento.medio, cumplimiento.motivo),
        env.BASE.prepare(`INSERT INTO historial_entradas_cms (id, entrada_id, accion, fecha, medio, motivo, actor_correo)
          VALUES (?1, ?2, 'cumplida', ?3, ?4, ?5, ?6)`)
          .bind(crypto.randomUUID(), id, cumplimiento.fecha, cumplimiento.medio, cumplimiento.motivo, sesion.correo),
      ])
      await registrar(env.BASE, sesion, 'cumplir respuesta de formulario', `entradas/${id}`, `${cumplimiento.medio}: ${cumplimiento.motivo}`)
      return responder({ entrada: { ...actual, estado: 'cerrada', cumplida_en: cumplimiento.fecha, cumplida_por: sesion.correo, cumplida_medio: cumplimiento.medio, cumplida_motivo: cumplimiento.motivo } })
    }
    if (id && partes[3] === 'reabrir' && request.method === 'POST') {
      const actual = await env.BASE.prepare('SELECT * FROM entradas_cms WHERE id = ?1').bind(id).first()
      if (!actual) return error('No encontramos esa respuesta.', 404)
      if (!puedeGestionarEquipoCms(alcance, actual.equipo_id)) return error('No podés reabrir esta respuesta.', 403)
      if (actual.estado !== 'cerrada') return error('Esta respuesta ya está abierta.', 409)
      let datos; try { datos = await request.json() } catch { return error('Los datos de reapertura no son válidos.', 400) }
      const resultado = reaperturaEntradaCmsDesde(datos); if (resultado.error) return error(resultado.error, 400)
      const fecha = fechaActualCms()
      await env.BASE.batch([
        env.BASE.prepare(`UPDATE entradas_cms SET estado = 'derivada', actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1`).bind(id),
        env.BASE.prepare(`INSERT INTO historial_entradas_cms (id, entrada_id, accion, fecha, medio, motivo, actor_correo)
          VALUES (?1, ?2, 'reabierta', ?3, '', ?4, ?5)`)
          .bind(crypto.randomUUID(), id, fecha, resultado.motivo, sesion.correo),
      ])
      await registrar(env.BASE, sesion, 'reabrir respuesta de formulario', `entradas/${id}`, resultado.motivo)
      return responder({ entrada: { ...actual, estado: 'derivada' } })
    }
    if (id && request.method === 'PATCH') {
      const actual = await env.BASE.prepare('SELECT * FROM entradas_cms WHERE id = ?1').bind(id).first()
      if (!actual) return error('No encontramos esa entrada.', 404)
      if (!puedeGestionarEquipoCms(alcance, actual.equipo_id)) return error('No podés modificar esta entrada.', 403)
      let datos; try { datos = await request.json() } catch { return error('Los cambios de la entrada no son válidos.', 400) }
      if (datos.estado === 'cerrada') return error('Registrá fecha, resultado y motivo mediante la acción de cumplimiento.', 400)
      if (actual.estado === 'cerrada') return error('Reabrí la respuesta antes de modificarla.', 409)
      const resultado = entradaCmsDesde(datos, actual); if (resultado.error) return error(resultado.error, 400)
      await env.BASE.prepare('UPDATE entradas_cms SET estado = ?2, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1').bind(id, resultado.entrada.estado).run()
      await registrar(env.BASE, sesion, 'modificar entrada CMS', `entradas/${id}`, actual.nombre)
      return responder({ entrada: { ...actual, estado: resultado.entrada.estado } })
    }
  }

  return error('No se encontró esa operación del CMS.', 404)
}

export async function onRequest(contexto) {
  const ruta = new URL(contexto.request.url).pathname.replace(/^\/api\/?/, '')
  if (ruta === 'health' && contexto.request.method === 'GET') {
    try {
      await contexto.env.BASE.prepare('SELECT 1 AS ok').first()
      return responder({ ok: true, servicio: 'gestor-aletea', version: contexto.env.VERSION_APLICACION || null }, 200, { 'cache-control': 'no-store' })
    } catch {
      return responder({ ok: false, servicio: 'gestor-aletea', version: contexto.env.VERSION_APLICACION || null }, 503, { 'cache-control': 'no-store' })
    }
  }
  if (ruta === 'ingresar' && contexto.request.method === 'POST') return ingresar(contexto)
  if (ruta === 'cerrar' && contexto.request.method === 'POST') return cerrarSesion()
  if (ruta.startsWith('formularios/')) return formularioPublico(contexto, ruta)
  if (ruta === 'comunicaciones/confirmar' || ruta === 'comunicaciones/baja') return comunicacionPublica(contexto, ruta)
  if (ruta === 'pagina-web/publicada') return paginaWebPublica(contexto)
  if (ruta.startsWith('pagina-web/medios/')) return medioPaginaWebPublico(contexto, ruta.split('/')[2])
  const sesion = await sesionDe(contexto)
  if (!sesion) return error('No tenés una sesión autorizada.', 401)

  if (ruta === 'sesion' && contexto.request.method === 'GET') {
    await contexto.env.BASE.prepare('UPDATE usuarios SET ultimo_acceso = ?2 WHERE correo = ?1').bind(sesion.correo, instanteUtcSql()).run()
    return responder(sesion)
  }
  if (ruta === 'auditoria' && contexto.request.method === 'GET') return auditoria(contexto, sesion)
  if (ruta === 'usuarios/foto') return fotoPerfilUsuario(contexto, sesion)
  if (ruta === 'usuarios') return usuarios(contexto, sesion)
  if (ruta === 'documento') return documento(contexto, sesion)
  if (ruta === 'listas' && contexto.request.method === 'GET') return listas(contexto, sesion)
  if (ruta === 'foto') return foto(contexto, sesion)
  if (ruta === 'cms/imagen-remota') return imagenRemotaCms(contexto, sesion)
  if (ruta === 'cms/comunicaciones' || ruta.startsWith('cms/comunicaciones/')) return comunicacionesCms(contexto, sesion, ruta)
  if (ruta === 'cms/operaciones' || ruta.startsWith('cms/operaciones/')) return operacionesCms(contexto, sesion, ruta)
  if (ruta.startsWith('personas/') && ruta.endsWith('/protegida')) {
    return fichaProtegida(contexto, sesion, ruta.split('/')[1])
  }
  if (ruta === 'cms' || ruta.startsWith('cms/')) return cms(contexto, sesion, ruta)
  return error('No se encontró esa operación.', 404)
}
