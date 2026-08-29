const responder = (datos, estado = 200, cabeceras = {}) => new Response(
  datos === null ? null : JSON.stringify(datos),
  { status: estado, headers: { 'content-type': 'application/json; charset=utf-8', ...cabeceras } },
)

const error = (mensaje, estado, cabeceras = {}) => responder({ error: mensaje }, estado, cabeceras)

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
    'SELECT correo, nombre, rol, perfil_acceso, permisos, nivel_datos_personales, datos_personales_hasta, version_sesion FROM usuarios WHERE correo = ?1 AND activo = 1',
  ).bind(firmada.usuario).first()
  return cuenta?.version_sesion === firmada.version ? exponerCuenta(cuenta) : null
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
  if (PERFILES_ACCESO.includes(cuenta?.perfil_acceso)) return cuenta.perfil_acceso
  return cuenta?.rol === 'admin' ? 'administracion' : 'coordinacion'
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
  return { ...publica, perfil_acceso: perfilAccesoDe(cuenta), nivel_datos_personales: nivelDatosPersonalesDe(cuenta), permisos: permisosDe(cuenta) }
}

async function claveFotoPerfil(correo) {
  const bytes = new TextEncoder().encode(String(correo).trim().toLowerCase())
  const resumen = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return `usuario-${[...resumen].map((byte) => byte.toString(16).padStart(2, '0')).join('')}.jpg`
}

export function nivelDatosPersonalesDe(cuenta) {
  const nivel = NIVELES_DATOS_PERSONALES.includes(cuenta?.nivel_datos_personales) ? cuenta.nivel_datos_personales : 'ninguno'
  if (nivel === 'ninguno') return nivel
  const vence = String(cuenta?.datos_personales_hasta ?? '')
  return fechaValida(vence) && vence >= fechaActualCms() ? nivel : 'ninguno'
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

function puedeVerTareaCms(alcance, sesion, tarea) {
  if (alcance.global) return true
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

export function combinarProtegidos(actual, solicitado) {
  const proteger = (personas = []) => personas.map((persona) => {
    const anterior = personaEnRoster(actual, persona.id)
    if (!anterior) return persona
    const perfil = { ...(persona.perfil ?? {}) }
    const previo = anterior.perfil ?? {}
    ;['anioNacimiento', 'necesidades'].forEach((clave) => { if (clave in previo) perfil[clave] = previo[clave] })
    return { ...persona, contactoEmergencia: anterior.contactoEmergencia ?? '', privacidad: anterior.privacidad ?? {}, perfil }
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
    SELECT correo, nombre, rol, perfil_acceso, permisos, nivel_datos_personales, datos_personales_hasta, foto_perfil, sal, hash_contrasena, version_sesion
    FROM usuarios WHERE correo = ?1 AND activo = 1
  `).bind(usuario).first()
  const salFicticia = new Uint8Array((await crypto.subtle.digest('SHA-256', CODIFICADOR.encode(`${contexto.env.SESSION_SECRET}:cuenta-inexistente`))).slice(0, 16))
  const derivada = await derivarContrasena(contrasena, cuenta?.sal ? new Uint8Array(cuenta.sal) : salFicticia)
  const correcta = Boolean(cuenta?.hash_contrasena) && iguales(derivada, new Uint8Array(cuenta.hash_contrasena || 32))
  if (!correcta) {
    await registrarFalloIngreso(contexto.env.BASE, clavesIntento)
    return error('Usuario o contraseña incorrectos.', 401)
  }
  await limpiarFallosIngreso(contexto.env.BASE, clavesIntento)
  const expira = Math.floor(Date.now() / 1000) + DURACION_SESION
  const token = await firmarSesion({ usuario: cuenta.correo, version: cuenta.version_sesion, expira }, contexto.env.SESSION_SECRET)
  await contexto.env.BASE.prepare('UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE correo = ?1').bind(cuenta.correo).run()
  await registrar(contexto.env.BASE, cuenta, 'ingresar', 'sesion')
  return responder(exponerCuenta({ usuario: cuenta.correo, correo: cuenta.correo, nombre: cuenta.nombre, rol: cuenta.rol, perfil_acceso: cuenta.perfil_acceso, permisos: cuenta.permisos, nivel_datos_personales: cuenta.nivel_datos_personales, datos_personales_hasta: cuenta.datos_personales_hasta }), 200, {
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
      'SELECT correo, nombre, rol, perfil_acceso, permisos, nivel_datos_personales, datos_personales_hasta, foto_perfil, ultimo_acceso FROM usuarios WHERE activo = 1 ORDER BY nombre COLLATE NOCASE',
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
    const equiposSolicitados = [...new Set(Array.isArray(datos.equipos) ? datos.equipos.map((equipo) => String(equipo || '').trim()).filter(Boolean) : [])]
    if (!usuarioValido(correo) || !nombre || !PERFILES_ACCESO.includes(perfil_acceso)) {
      return error('Completá nombre, usuario y un perfil de acceso válido.', 400)
    }
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
      INSERT INTO usuarios (correo, nombre, rol, perfil_acceso, permisos, nivel_datos_personales, activo, sal, hash_contrasena, version_sesion)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8, 0)
    `).bind(correo, nombre, rol, perfil_acceso, perfil_acceso === 'administracion' ? null : JSON.stringify(PERMISOS_POR_PERFIL[perfil_acceso]), nivelDatos, sal, hash)]
    equiposSolicitados.forEach((equipoId) => consultas.push(env.BASE.prepare(`INSERT INTO responsabilidades_equipo
      (id, equipo_id, usuario_correo, tipo, creado_por) VALUES (?1, ?2, ?3, ?4, ?5)`)
      .bind(crypto.randomUUID(), equipoId, correo, perfil_acceso === 'coordinacion' ? 'coordinacion' : 'integrante', sesion.correo)))
    try { await env.BASE.batch(consultas) } catch { return error('Ese usuario ya existe o no se pudo asignar a los equipos.', 409) }
    await registrar(env.BASE, sesion, 'dar acceso', correo, perfil_acceso)
    return responder(exponerCuenta({ usuario: correo, correo, nombre, rol, perfil_acceso, permisos: PERMISOS_POR_PERFIL[perfil_acceso], nivel_datos_personales: nivelDatos, equipos: equiposSolicitados, contrasena }), 201)
  }
  if (request.method === 'PATCH') {
    let datos
    try { datos = await request.json() } catch { return error('Los permisos no son válidos.', 400) }
    const correo = String(datos.correo || '').trim().toLowerCase()
    const perfil_acceso = String(datos.perfil_acceso || '').trim()
    const nivelDatos = String(datos.nivel_datos_personales || 'ninguno').trim()
    const hasta = String(datos.datos_personales_hasta || '').trim()
    const objetivo = await env.BASE.prepare('SELECT rol, perfil_acceso FROM usuarios WHERE correo = ?1 AND activo = 1').bind(correo).first()
    if (!objetivo) return error('No encontramos ese acceso.', 404)
    if (!PERFILES_ACCESO.includes(perfil_acceso)) return error('Elegí un perfil de acceso válido.', 400)
    if (!NIVELES_DATOS_PERSONALES.includes(nivelDatos)) return error('Elegí un nivel válido para datos personales.', 400)
    if (nivelDatos !== 'ninguno' && (!fechaValida(hasta) || hasta < fechaActualCms())) return error('Indicá hasta cuándo necesita este acceso a datos personales.', 400)
    if (objetivo.rol === 'admin' && perfil_acceso !== 'administracion') return error('No podés bajar desde aquí el último perfil administrativo.', 400)
    if (['coordinacion', 'integrante'].includes(perfil_acceso)) {
      const asignaciones = await env.BASE.prepare('SELECT COUNT(*) AS cantidad FROM responsabilidades_equipo WHERE usuario_correo = ?1 AND activo = 1').bind(correo).first()
      if (!Number(asignaciones?.cantidad || 0)) return error('Asignale al menos un equipo antes de usar este perfil.', 400)
    }
    const rol = perfil_acceso === 'administracion' ? 'admin' : 'coordinacion'
    await env.BASE.prepare('UPDATE usuarios SET rol = ?1, perfil_acceso = ?2, permisos = ?3, nivel_datos_personales = ?4, datos_personales_hasta = ?5, version_sesion = version_sesion + 1 WHERE correo = ?6')
      .bind(rol, perfil_acceso, perfil_acceso === 'administracion' ? null : JSON.stringify(PERMISOS_POR_PERFIL[perfil_acceso]), nivelDatos, nivelDatos === 'ninguno' ? null : hasta, correo).run()
    await registrar(env.BASE, sesion, 'cambiar acceso y datos personales', correo, `${perfil_acceso} · ${nivelDatos}${nivelDatos === 'ninguno' ? '' : ` hasta ${hasta}`}`)
    return responder({ actualizada: true, perfil_acceso, nivel_datos_personales: nivelDatos, datos_personales_hasta: nivelDatos === 'ninguno' ? null : hasta, permisos: PERMISOS_POR_PERFIL[perfil_acceso] })
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
    actividad.detalle, actividad.cuando, COALESCE(usuarios.nombre, actividad.correo) AS actor_nombre
    FROM actividad LEFT JOIN usuarios ON usuarios.correo = actividad.correo
    ORDER BY actividad.cuando DESC, actividad.id DESC LIMIT ?1`).bind(limite).all()
  return responder({ actividad: filas.results })
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
    contenido = combinarProtegidos(guardado, contenido)
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
const VISIBILIDADES_FORMULARIO_CMS = ['interna', 'publica']
const ESTADOS_FORMULARIO_CMS = ['activa', 'cerrada']
const NIVELES_RIESGO_PROYECTO_CMS = ['bajo', 'medio', 'alto', 'critico']
const ESTADOS_RIESGO_PROYECTO_CMS = ['abierto', 'mitigado', 'aceptado']
const FRECUENCIAS_TAREA_RECURRENTE_CMS = ['semanal', 'mensual']
const FRECUENCIAS_EVENTO_RECURRENTE_CMS = ['semanal', 'quincenal', 'mensual']
const FRECUENCIAS_REUNION_EQUIPO_CMS = ['semanal', 'quincenal', 'mensual', 'segun_necesidad']
const CATEGORIAS_EQUIPO_CMS = ['equipo', 'comision_directiva', 'comision_fiscal', 'comision_electoral', 'comision']
const COLOR_EQUIPO = /^#[0-9a-fA-F]{6}$/
const PRIORIDADES_COMUNICADO_CMS = ['normal', 'urgente']
const ESTADOS_COMUNICADO_CMS = ['activo', 'cerrado']

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

export function tareaCmsDesde(datos, actual = {}) {
  const esfuerzoOriginal = datos.esfuerzo_horas ?? actual.esfuerzo_horas ?? null
  const tarea = {
    titulo: textoCms(datos.titulo ?? actual.titulo, 180),
    descripcion: textoCms(datos.descripcion ?? actual.descripcion),
    tipo: datos.tipo ?? actual.tipo ?? 'tarea',
    estado: datos.estado ?? actual.estado ?? 'pendiente',
    prioridad: datos.prioridad ?? actual.prioridad ?? 'normal',
    equipo_id: datos.equipo_id ?? actual.equipo_id ?? null,
    proyecto_id: datos.proyecto_id ?? actual.proyecto_id ?? null,
    objetivo: textoCms(datos.objetivo ?? actual.objetivo), pasos: textoCms(datos.pasos ?? actual.pasos),
    recursos: textoCms(datos.recursos ?? actual.recursos), personas_necesarias: textoCms(datos.personas_necesarias ?? actual.personas_necesarias),
    evento_id: datos.evento_id ?? actual.evento_id ?? null,
    responsable_correo: datos.responsable_correo ?? actual.responsable_correo ?? null,
    solicitante_correo: datos.solicitante_correo ?? actual.solicitante_correo ?? null,
    fecha_limite: datos.fecha_limite ?? actual.fecha_limite ?? null,
    fecha_seguimiento: datos.fecha_seguimiento ?? actual.fecha_seguimiento ?? null,
    esfuerzo_horas: esfuerzoOriginal === '' || esfuerzoOriginal === null ? null : Number(esfuerzoOriginal),
  }
  if (!tarea.titulo) return { error: 'La tarea necesita un título.' }
  if (!TIPOS_CMS.includes(tarea.tipo) || !ESTADOS_CMS.includes(tarea.estado) || !PRIORIDADES_CMS.includes(tarea.prioridad)) {
    return { error: 'El tipo, estado o prioridad no es válido.' }
  }
  if (tarea.tipo === 'solicitud' && !tarea.equipo_id) return { error: 'Elegí el equipo al que se dirige la solicitud.' }
  if (!fechaCmsValida(tarea.fecha_limite) || !fechaCmsValida(tarea.fecha_seguimiento)) return { error: 'Las fechas deben usar el formato AAAA-MM-DD.' }
  if (tarea.esfuerzo_horas !== null && (!Number.isFinite(tarea.esfuerzo_horas) || tarea.esfuerzo_horas <= 0 || tarea.esfuerzo_horas > 168)) return { error: 'El esfuerzo estimado debe estar entre 0,25 y 168 horas.' }
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

export function documentoCmsDesde(datos, actual = {}) {
  const documento = {
    titulo: textoCms(datos.titulo ?? actual.titulo, 180), descripcion: textoCms(datos.descripcion ?? actual.descripcion),
    tipo: textoCms(datos.tipo ?? actual.tipo, 20) || 'enlace', url: textoCms(datos.url ?? actual.url, 2000),
    sensibilidad: textoCms(datos.sensibilidad ?? actual.sensibilidad, 20) || 'interno',
    equipo_id: datos.equipo_id ?? actual.equipo_id ?? null, proyecto_id: datos.proyecto_id ?? actual.proyecto_id ?? null,
  }
  let url
  try { url = new URL(documento.url) } catch { return { error: 'Ingresá un enlace web válido.' } }
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

const TIPOS_CAMPO_FORMULARIO_CMS = ['texto', 'texto_largo', 'seleccion', 'casilla', 'fecha']

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
    if (tipo === 'seleccion' && opciones.length < 2) return { error: `El campo “${etiqueta}” necesita al menos dos opciones.` }
    const condicionCampo = textoCms(fila.mostrar_si?.campo, 80)
    const mostrar_si = condicionCampo ? { campo: condicionCampo, valor: textoCms(fila.mostrar_si?.valor, 180) } : null
    if (mostrar_si && !claves.has(mostrar_si.campo)) return { error: `La condición de “${etiqueta}” debe depender de un campo anterior.` }
    claves.add(clave)
    campos.push({ clave, etiqueta, tipo, requerido: Boolean(fila.requerido), ayuda: textoCms(fila.ayuda, 240), opciones, mostrar_si })
  }
  return { campos }
}

export function formularioCmsDesde(datos, actual = {}) {
  const resultadoCampos = camposFormularioCmsDesde(datos.campos ?? datos.campos_json ?? actual.campos_json ?? [])
  if (resultadoCampos.error) return resultadoCampos
  const formulario = {
    titulo: textoCms(datos.titulo ?? actual.titulo, 180),
    descripcion: textoCms(datos.descripcion ?? actual.descripcion),
    tipo: datos.tipo ?? actual.tipo ?? 'voluntariado',
    visibilidad: datos.visibilidad ?? actual.visibilidad ?? 'interna',
    estado: datos.estado ?? actual.estado ?? 'activa',
    equipo_id: datos.equipo_id ?? actual.equipo_id ?? null,
    equipo_solicitante_id: datos.equipo_solicitante_id ?? actual.equipo_solicitante_id ?? null,
    prioridad: datos.prioridad ?? actual.prioridad ?? 'normal',
    proyecto_id: datos.proyecto_id ?? actual.proyecto_id ?? null,
    campos: resultadoCampos.campos,
    campos_json: JSON.stringify(resultadoCampos.campos),
  }
  if (!formulario.titulo) return { error: 'El formulario necesita un título.' }
  if (!TIPOS_ENTRADA_CMS.includes(formulario.tipo) || !VISIBILIDADES_FORMULARIO_CMS.includes(formulario.visibilidad) || !ESTADOS_FORMULARIO_CMS.includes(formulario.estado) || !PRIORIDADES_CMS.includes(formulario.prioridad)) return { error: 'El tipo, la visibilidad, el estado o la prioridad del formulario no es válido.' }
  if (formulario.tipo === 'pedido' && !formulario.equipo_id) return { error: 'Elegí el equipo al que se dirige el pedido.' }
  if (formulario.tipo === 'pedido' && !formulario.equipo_solicitante_id) return { error: 'Elegí el equipo que realiza el pedido.' }
  if (formulario.tipo === 'propuesta' && !formulario.equipo_id) return { error: 'Elegí el equipo que evaluará la propuesta.' }
  return { formulario }
}

export function respuestaFormularioCmsDesde(datos, formulario) {
  if (textoCms(datos.empresa, 180)) return { error: 'No se pudo enviar la respuesta.' }
  const resultado = entradaCmsDesde({
    tipo: formulario.tipo, nombre: datos.nombre, contacto: datos.contacto,
    detalle: datos.detalle, fecha_propuesta: datos.fecha_propuesta, equipo_id: formulario.equipo_id, equipo_solicitante_id: formulario.equipo_solicitante_id,
    prioridad: formulario.prioridad, proyecto_id: formulario.proyecto_id, objetivo: datos.objetivo, pasos: datos.pasos, recursos: datos.recursos, personas_necesarias: datos.personas_necesarias,
  })
  if (resultado.error) return resultado
  if (!resultado.entrada.contacto) return { error: 'Dejá un medio de contacto para poder responderte.' }
  const resultadoCampos = camposFormularioCmsDesde(formulario.campos ?? formulario.campos_json ?? [])
  if (resultadoCampos.error) return resultadoCampos
  const recibidas = datos.respuestas && typeof datos.respuestas === 'object' && !Array.isArray(datos.respuestas) ? datos.respuestas : {}
  const respuestas = {}
  for (const campo of resultadoCampos.campos) {
    const visible = !campo.mostrar_si || String(respuestas[campo.mostrar_si.campo] ?? '') === campo.mostrar_si.valor
    if (!visible) continue
    const original = recibidas[campo.clave]
    if (campo.tipo === 'casilla') {
      const valor = original === true || original === 'true' || original === '1' || original === 'on'
      if (campo.requerido && !valor) return { error: `Completá “${campo.etiqueta}”.` }
      respuestas[campo.clave] = valor
      continue
    }
    const valor = textoCms(original, campo.tipo === 'texto_largo' ? 4000 : 500)
    if (campo.requerido && !valor) return { error: `Completá “${campo.etiqueta}”.` }
    if (campo.tipo === 'seleccion' && valor && !campo.opciones.includes(valor)) return { error: `La respuesta de “${campo.etiqueta}” no es válida.` }
    if (campo.tipo === 'fecha' && valor && !fechaCmsValida(valor)) return { error: `La fecha de “${campo.etiqueta}” no es válida.` }
    respuestas[campo.clave] = valor
  }
  resultado.entrada.respuestas = respuestas
  resultado.entrada.respuestas_json = JSON.stringify(respuestas)
  return resultado
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
    proyecto_id: datos.proyecto_id ?? actual.proyecto_id ?? null,
    fecha_hora: datos.fecha_hora ?? actual.fecha_hora ?? '',
    lugar: textoCms(datos.lugar ?? actual.lugar, 180),
    estado: datos.estado ?? actual.estado ?? 'planificada',
    preparacion: textoCms(datos.preparacion ?? actual.preparacion),
    minuta: textoCms(datos.minuta ?? actual.minuta),
    resumen: textoCms(datos.resumen ?? actual.resumen),
  }
  if (!reunion.titulo) return { error: 'La reunión necesita un título.' }
  if (!fechaHoraCmsValida(reunion.fecha_hora) || !ESTADOS_REUNION_CMS.includes(reunion.estado)) return { error: 'La fecha, hora o estado de la reunión no es válido.' }
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

export function eventoCmsDesde(datos, actual = {}) {
  const evento = {
    titulo: textoCms(datos.titulo ?? actual.titulo, 180),
    descripcion: textoCms(datos.descripcion ?? actual.descripcion),
    fecha_hora: datos.fecha_hora ?? actual.fecha_hora ?? '',
    fecha_fin: datos.fecha_fin ?? actual.fecha_fin ?? null,
    lugar: textoCms(datos.lugar ?? actual.lugar, 180),
    equipo_id: datos.equipo_id ?? actual.equipo_id ?? null,
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

function siguienteFechaEventoCms(fecha, frecuencia, diaMensual = null) {
  const [anio, mes, dia] = String(fecha).split('-').map(Number)
  if (frecuencia === 'semanal' || frecuencia === 'quincenal') {
    const salto = frecuencia === 'quincenal' ? 14 : 7
    return new Date(Date.UTC(anio, mes - 1, dia + salto)).toISOString().slice(0, 10)
  }
  const siguienteMes = mes === 12 ? 1 : mes + 1
  const siguienteAnio = mes === 12 ? anio + 1 : anio
  const ultimoDia = new Date(Date.UTC(siguienteAnio, siguienteMes, 0)).getUTCDate()
  return `${siguienteAnio}-${String(siguienteMes).padStart(2, '0')}-${String(Math.min(diaMensual ?? dia, ultimoDia)).padStart(2, '0')}`
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
  const hora = resultado.evento.fecha_hora.slice(10)
  const diaMensual = Number(fechaInicial.slice(8, 10))
  const serieId = crypto.randomUUID()
  const eventos = []
  let fecha = fechaInicial
  while (fecha <= repetirHasta && eventos.length < 60) {
    const fechaHora = `${fecha}${hora}`
    eventos.push({ ...resultado.evento, fecha_hora: fechaHora, fecha_fin: sumarMinutosCms(fechaHora, duracion), serie_id: serieId, generada_para: fecha })
    fecha = siguienteFechaEventoCms(fecha, frecuencia, diaMensual)
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
  const serieId = crypto.randomUUID()
  const reuniones = []
  let fecha = fechaInicial
  while (fecha <= repetirHasta && reuniones.length < 60) {
    reuniones.push({ ...resultado.reunion, fecha_hora: `${fecha}${hora}`, serie_id: serieId, generada_para: fecha })
    fecha = siguienteFechaEventoCms(fecha, frecuencia, diaMensual)
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

export function conflictoAgendaCms(primero, segundo) {
  if (!primero || !segundo || primero.id === segundo.id || primero.estado !== 'planificado' || segundo.estado !== 'planificado') return null
  const inicioPrimero = instanteCms(primero.fecha_hora)
  const inicioSegundo = instanteCms(segundo.fecha_hora)
  if (inicioPrimero === null || inicioSegundo === null) return null
  const finPrimero = instanteCms(primero.fecha_fin)
  const finSegundo = instanteCms(segundo.fecha_fin)
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

export function conflictosAgendaCms(eventos) {
  const conflictos = []
  for (let indice = 0; indice < eventos.length; indice += 1) {
    for (let comparado = indice + 1; comparado < eventos.length; comparado += 1) {
      const conflicto = conflictoAgendaCms(eventos[indice], eventos[comparado])
      if (conflicto) conflictos.push(conflicto)
    }
  }
  return conflictos
}

function fechaDePreparacion(fechaHora, diasAntes) {
  const fecha = new Date(`${String(fechaHora).slice(0, 10)}T12:00:00Z`)
  fecha.setUTCDate(fecha.getUTCDate() - diasAntes)
  return fecha.toISOString().slice(0, 10)
}

export async function referenciasCmsValidas(base, { equipo_id, equipo_solicitante_id, proyecto_id, programa_id, responsable_correo, solicitante_correo, evento_id }) {
  const consultas = []
  if (equipo_id) consultas.push(base.prepare('SELECT id FROM equipos WHERE id = ?1 AND activo = 1').bind(equipo_id).first().then((fila) => fila ? null : 'equipo'))
  if (equipo_solicitante_id) consultas.push(base.prepare('SELECT id FROM equipos WHERE id = ?1 AND activo = 1').bind(equipo_solicitante_id).first().then((fila) => fila ? null : 'equipo solicitante'))
  if (proyecto_id) consultas.push(base.prepare("SELECT id FROM proyectos_cms WHERE id = ?1 AND estado != 'cerrado'").bind(proyecto_id).first().then((fila) => fila ? null : 'proyecto'))
  if (programa_id) consultas.push(base.prepare("SELECT id FROM programas_cms WHERE id = ?1 AND estado != 'cerrado'").bind(programa_id).first().then((fila) => fila ? null : 'programa'))
  if (responsable_correo) consultas.push(base.prepare('SELECT correo FROM usuarios WHERE correo = ?1 AND activo = 1').bind(responsable_correo).first().then((fila) => fila ? null : 'responsable'))
  if (solicitante_correo) consultas.push(base.prepare('SELECT correo FROM usuarios WHERE correo = ?1 AND activo = 1').bind(solicitante_correo).first().then((fila) => fila ? null : 'solicitante'))
  if (evento_id) consultas.push(base.prepare("SELECT id FROM eventos_cms WHERE id = ?1 AND estado != 'cancelado'").bind(evento_id).first().then((fila) => fila ? null : 'actividad'))
  const invalida = (await Promise.all(consultas)).find(Boolean)
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
  const filas = await base.prepare(`SELECT p.id, p.titulo FROM tareas_dependencias_cms d
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
  const tarea = {
    id: crypto.randomUUID(), titulo: `${nombreTarea}: ${entradaBase.nombre}`,
    descripcion: formularioId ? 'Creada desde una respuesta de formulario.' : 'Creada desde la bandeja de entradas institucionales.',
    tipo: entradaBase.tipo === 'pedido' ? 'solicitud' : 'seguimiento', estado: 'pendiente',
    prioridad: entradaBase.prioridad, equipo_id: entradaBase.equipo_id,
    proyecto_id: entradaBase.proyecto_id, responsable_correo: responsableCorreo,
    solicitante_correo: entradaBase.tipo === 'pedido' && registrarSolicitante ? creador.correo : null,
  }
  const insertarTarea = base.prepare(`INSERT INTO tareas_cms
    (id, titulo, descripcion, tipo, estado, prioridad, equipo_id, proyecto_id, responsable_correo, solicitante_correo, creado_por)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`)
    .bind(tarea.id, tarea.titulo, tarea.descripcion, tarea.tipo, tarea.estado, tarea.prioridad, tarea.equipo_id, tarea.proyecto_id, tarea.responsable_correo, tarea.solicitante_correo, creador.correo)
  const entrada = { id: crypto.randomUUID(), ...entradaBase, estado: 'derivada', tarea_id: tarea.id, formulario_id: formularioId }
  const insertarEntrada = base.prepare(`INSERT INTO entradas_cms
    (id, tipo, nombre, contacto, detalle, fecha_propuesta, objetivo, pasos, recursos, personas_necesarias, respuestas_json, estado, equipo_id, equipo_solicitante_id, prioridad, proyecto_id, tarea_id, formulario_id, creado_por)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)`)
    .bind(entrada.id, entrada.tipo, entrada.nombre, entrada.contacto, entrada.detalle, entrada.fecha_propuesta, entrada.objetivo, entrada.pasos, entrada.recursos, entrada.personas_necesarias, entrada.respuestas_json || '{}', entrada.estado, entrada.equipo_id, entrada.equipo_solicitante_id, entrada.prioridad, entrada.proyecto_id, entrada.tarea_id, entrada.formulario_id, creador.correo)
  const notificacion = consultaNotificacionAsignacionTareaCms(base, tarea, creador.correo, tarea.tipo === 'solicitud' ? 'solicitud_recibida' : 'asignacion_tarea')
  await base.batch([insertarTarea, insertarEntrada, ...(notificacion ? [notificacion] : [])])
  return { entrada, tarea, asignada_automaticamente: Boolean(responsableCorreo) }
}

async function formularioPublico(contexto, ruta) {
  const { request, env } = contexto
  const id = ruta.split('/').filter(Boolean)[1]
  if (!id) return error('No encontramos ese formulario.', 404)
  const formulario = await env.BASE.prepare(`SELECT id, titulo, descripcion, tipo, equipo_id, equipo_solicitante_id, prioridad, proyecto_id, creado_por, campos_json
    FROM formularios_cms WHERE id = ?1 AND visibilidad = 'publica' AND estado = 'activa'`).bind(id).first()
  if (!formulario) return error('Este formulario no está disponible.', 404)
  if (request.method === 'GET') return responder({ formulario }, 200, { 'X-Robots-Tag': 'noindex, nofollow, noarchive' })
  if (request.method !== 'POST') return error('Método no permitido.', 405)
  let datos; try { datos = await request.json() } catch { return error('Los datos del formulario no son válidos.', 400) }
  const resultado = respuestaFormularioCmsDesde(datos, formulario)
  if (resultado.error) return error(resultado.error, 400)
  const ip = request.headers.get('CF-Connecting-IP') || 'sin-direccion'
  const ventana = String(Math.floor(Date.now() / 600000))
  const clave = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.SESION_SECRETO || 'formulario'}:${ip}`))
  const limite = [...new Uint8Array(clave)].map((valor) => valor.toString(16).padStart(2, '0')).join('')
  if (!await reservarEnvioFormularioPublico(env.BASE, formulario.id, limite, ventana)) {
    return error('Probá nuevamente en unos minutos.', 429)
  }
  const derivada = await derivarEntradaCms(env.BASE, resultado.entrada, { correo: formulario.creado_por }, formulario.id, false)
  await registrar(env.BASE, { correo: formulario.creado_por }, 'recibir formulario público', `formularios/${formulario.id}`, derivada.entrada.nombre)
  return responder({ recibida: true }, 201)
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

async function cms(contexto, sesion, ruta) {
  if (!tienePermiso(sesion, 'cms')) return error('Tu cuenta no puede acceder al CMS institucional.', 403)
  const { request, env } = contexto
  const partes = ruta.split('/').filter(Boolean)
  const recurso = partes[1] ?? 'tablero'
  const id = partes[2] ?? null
  const alcance = await alcanceCmsDe(env.BASE, sesion)

  if (esSoloConsultaCms(sesion) && request.method !== 'GET') {
    return error('El perfil de consulta solo puede leer la agenda y los documentos compartidos.', 403)
  }
  if (alcance.perfil === 'integrante' && request.method !== 'GET'
    && !(recurso === 'notificaciones'
      || recurso === 'alertas-pospuestas'
      || recurso === 'avisos-manuales'
      || recurso === 'capacidad'
      || (recurso === 'tareas' && id && request.method === 'PATCH')
      || (recurso === 'tareas' && id && partes[3] === 'comentarios' && request.method === 'POST'))) {
    return error('El perfil de integrante solo puede actualizar sus propias tareas.', 403)
  }
  if (!alcance.global && ['equipos', 'responsabilidades'].includes(recurso) && request.method !== 'GET') {
    return error('Solo Dirección o Administración puede cambiar la estructura de equipos.', 403)
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
      const tarea = await env.BASE.prepare('SELECT id, titulo, equipo_id, responsable_correo FROM tareas_cms WHERE id = ?1').bind(tareaId).first()
      if (!tarea || !puedeVerTareaCms(alcance, sesion, tarea)) return error('No encontramos esa tarea.', 404)
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

  if (recurso === 'tablero' && request.method === 'GET') {
    const [tareas, proyectos, equipos, responsables, responsabilidades, reuniones, decisiones, documentos, entradas, formularios, alianzas, programas, eventos, plantillas, riesgos, hitos, gastos, eventosParaConflictos, notificaciones, recurrencias, automatizaciones, alertasPospuestas, comunicados, revisionSemanal, capacidad, metricasTareas] = await Promise.all([
      env.BASE.prepare(`
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
        WHERE t.estado NOT IN ('completada', 'cancelada')
        ORDER BY CASE t.prioridad WHEN 'urgente' THEN 0 WHEN 'alta' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
          t.fecha_limite IS NULL, t.fecha_limite, t.actualizado_en DESC LIMIT 60
      `).all(),
      env.BASE.prepare(`SELECT p.*, e.nombre AS equipo_nombre, g.nombre AS programa_nombre, u.nombre AS responsable_nombre,
          (SELECT COUNT(*) FROM proyecto_hitos_cms h WHERE h.proyecto_id = p.id AND h.estado != 'cancelado') AS hitos_total,
          (SELECT COUNT(*) FROM proyecto_hitos_cms h WHERE h.proyecto_id = p.id AND h.estado = 'completado') AS hitos_completados,
          (SELECT COALESCE(SUM(g.monto), 0) FROM proyecto_gastos_cms g WHERE g.proyecto_id = p.id) AS presupuesto_ejecutado
        FROM proyectos_cms p LEFT JOIN equipos e ON e.id = p.equipo_id LEFT JOIN programas_cms g ON g.id = p.programa_id LEFT JOIN usuarios u ON u.correo = p.responsable_correo
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
      env.BASE.prepare(`SELECT d.*, r.titulo AS reunion_titulo, e.nombre AS equipo_nombre, p.titulo AS proyecto_titulo, u.nombre AS responsable_nombre
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
      env.BASE.prepare(`SELECT i.*, e.nombre AS equipo_nombre, es.nombre AS equipo_solicitante_nombre, p.titulo AS proyecto_titulo, t.titulo AS tarea_titulo
        FROM entradas_cms i
        LEFT JOIN equipos e ON e.id = i.equipo_id LEFT JOIN proyectos_cms p ON p.id = i.proyecto_id LEFT JOIN tareas_cms t ON t.id = i.tarea_id
        LEFT JOIN equipos es ON es.id = i.equipo_solicitante_id
        WHERE i.estado != 'cerrada' ORDER BY i.creado_en DESC LIMIT 24`).all(),
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
      env.BASE.prepare(`SELECT id, titulo, fecha_hora, fecha_fin, lugar, equipo_id, responsable_correo, estado
        FROM eventos_cms
        WHERE estado = 'planificado' AND fecha_hora >= datetime('now', '-1 day')
        ORDER BY fecha_hora ASC LIMIT 90`).all(),
      env.BASE.prepare(`SELECT n.*, t.titulo AS tarea_titulo
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
    const eventosVisibles = alcance.global || alcance.perfil === 'consulta'
      ? eventos.results : eventos.results.filter(deEquipo)
    const tareasVisibles = alcance.global ? tareas.results
      : alcance.perfil === 'integrante'
        ? tareas.results.filter((fila) => fila.responsable_correo === sesion.correo)
        : alcance.perfil === 'consulta' ? [] : tareas.results.filter(deEquipo)
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
    const entradasVisibles = puedeVerOperacion ? entradas.results.filter(deEquipo) : []
    const formulariosVisibles = puedeVerOperacion ? formularios.results.filter(deEquipo) : []
    const alianzasVisibles = puedeVerOperacion ? alianzas.results.filter((fila) => alcance.global || deEquipo(fila)) : []
    const programasVisibles = puedeVerOperacion ? programas.results.filter((fila) => alcance.global || deEquipo(fila)) : []
    const plantillasVisibles = puedeVerOperacion ? plantillas.results.filter(deEquipo) : []
    const riesgosVisibles = alcance.global ? riesgos.results : riesgos.results.filter((fila) => proyectoIds.has(fila.proyecto_id))
    const hitosVisibles = alcance.global ? hitos.results : hitos.results.filter((fila) => proyectoIds.has(fila.proyecto_id))
    const gastosVisibles = alcance.global ? gastos.results : gastos.results.filter((fila) => proyectoIds.has(fila.proyecto_id))
    const recurrenciasVisibles = puedeVerOperacion ? recurrencias.results.filter(deEquipo) : []
    const automatizacionesVisibles = puedeVerOperacion ? automatizaciones.results.filter(deEquipo) : []
    const comunicadosVisibles = alcance.perfil === 'consulta' ? [] : comunicados.results.filter((fila) => alcance.global || !fila.equipo_id || deEquipo(fila))
    const eventosParaConflictosVisibles = alcance.global || alcance.perfil === 'consulta'
      ? eventosParaConflictos.results : eventosParaConflictos.results.filter(deEquipo)
    return responder({
      alcance: { perfil: alcance.perfil, equipos: equiposVisibles.map((fila) => fila.id), puede_gestionar: alcance.global || alcance.perfil === 'coordinacion' },
      tareas: tareasVisibles, proyectos: proyectosVisibles, equipos: equiposVisibles, responsables: responsablesVisibles,
      responsabilidades: responsabilidadesVisibles, reuniones: reunionesVisibles, decisiones: decisionesVisibles,
      documentos: documentosVisibles, entradas: entradasVisibles, formularios: formulariosVisibles, alianzas: alianzasVisibles, programas: programasVisibles,
      eventos: eventosVisibles, plantillas: plantillasVisibles, riesgos: riesgosVisibles, hitos: hitosVisibles,
      gastos: gastosVisibles, notificaciones: notificaciones.results, recurrencias: recurrenciasVisibles, automatizaciones: automatizacionesVisibles, alertasPospuestas: alertasPospuestas.results, comunicados: comunicadosVisibles, revisionSemanal, capacidad: capacidadVisible, metricasTareas: metricasTareasVisibles,
      conflictos: conflictosAgendaCms(eventosParaConflictosVisibles).slice(0, 12),
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
      const [dependencias, dependientes, comentarios] = await Promise.all([
        env.BASE.prepare(`SELECT p.id, p.titulo, p.estado, p.fecha_limite, p.equipo_id, p.responsable_correo, u.nombre AS responsable_nombre
          FROM tareas_dependencias_cms d JOIN tareas_cms p ON p.id = d.depende_de_id
          LEFT JOIN usuarios u ON u.correo = p.responsable_correo WHERE d.tarea_id = ?1 ORDER BY p.actualizado_en DESC`).bind(id).all(),
        env.BASE.prepare(`SELECT t.id, t.titulo, t.estado, t.fecha_limite, t.equipo_id, t.responsable_correo, u.nombre AS responsable_nombre
          FROM tareas_dependencias_cms d JOIN tareas_cms t ON t.id = d.tarea_id
          LEFT JOIN usuarios u ON u.correo = t.responsable_correo WHERE d.depende_de_id = ?1 ORDER BY t.actualizado_en DESC`).bind(id).all(),
        env.BASE.prepare(`SELECT c.*, u.nombre AS creador_nombre FROM comentarios_tarea_cms c
          LEFT JOIN usuarios u ON u.correo = c.creado_por WHERE c.tarea_id = ?1 ORDER BY c.creado_en DESC LIMIT 30`).bind(id).all(),
      ])
      return responder({ tarea,
        dependencias: dependencias.results.filter((fila) => puedeVerTareaCms(alcance, sesion, fila)),
        dependientes: dependientes.results.filter((fila) => puedeVerTareaCms(alcance, sesion, fila)),
        comentarios: comentarios.results,
      })
    }
    if (id && partes[3] === 'comentarios' && request.method === 'POST') {
      const existe = await env.BASE.prepare('SELECT titulo, equipo_id, responsable_correo FROM tareas_cms WHERE id = ?1').bind(id).first()
      if (!existe) return error('No encontramos esa tarea.', 404)
      if (!puedeGestionarTareaCms(alcance, sesion, existe)) return error('No podés comentar esta tarea.', 403)
      let datos; try { datos = await request.json() } catch { return error('El comentario no es válido.', 400) }
      const resultado = comentarioTareaCmsDesde(datos); if (resultado.error) return error(resultado.error, 400)
      const comentario = { id: crypto.randomUUID(), tarea_id: id, ...resultado.comentario, creado_por: sesion.correo }
      await env.BASE.prepare('INSERT INTO comentarios_tarea_cms (id, tarea_id, contenido, creado_por) VALUES (?1, ?2, ?3, ?4)')
        .bind(comentario.id, comentario.tarea_id, comentario.contenido, comentario.creado_por).run()
      await registrar(env.BASE, sesion, 'comentar tarea CMS', `tareas/${id}`, existe.titulo)
      return responder({ comentario }, 201)
    }
    if (id && partes[3] === 'dependencias' && request.method === 'POST') {
      const tarea = await env.BASE.prepare('SELECT id, titulo, equipo_id, responsable_correo FROM tareas_cms WHERE id = ?1').bind(id).first()
      if (!tarea) return error('No encontramos esa tarea.', 404)
      if (!puedeGestionarEquipoCms(alcance, tarea.equipo_id)) return error('No podés cambiar las dependencias de esta tarea.', 403)
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
      const tarea = await env.BASE.prepare('SELECT id, equipo_id FROM tareas_cms WHERE id = ?1').bind(id).first()
      if (!tarea) return error('No encontramos esa tarea.', 404)
      if (!puedeGestionarEquipoCms(alcance, tarea.equipo_id)) return error('No podés cambiar las dependencias de esta tarea.', 403)
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
      return responder({ tareas: filas.results.filter((fila) => puedeVerTareaCms(alcance, sesion, fila)) })
    }
    if (request.method === 'POST') {
      let datos
      try { datos = await request.json() } catch { return error('Los datos de la tarea no son válidos.', 400) }
      const resultado = tareaCmsDesde(datos)
      if (resultado.error) return error(resultado.error, 400)
      if (!puedeGestionarEquipoCms(alcance, resultado.tarea.equipo_id)) return error('Elegí un equipo que coordinás para crear la tarea.', 403)
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
      }
      await env.BASE.prepare(`
        INSERT INTO tareas_cms (id, titulo, descripcion, tipo, estado, prioridad, equipo_id, proyecto_id, evento_id, responsable_correo, solicitante_correo, fecha_limite, fecha_seguimiento, esfuerzo_horas, creado_por, completado_en)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, CASE WHEN ?5 = 'completada' THEN CURRENT_TIMESTAMP ELSE NULL END)
      `).bind(tarea.id, tarea.titulo, tarea.descripcion, tarea.tipo, tarea.estado, tarea.prioridad, tarea.equipo_id, tarea.proyecto_id, tarea.evento_id, tarea.responsable_correo, tarea.solicitante_correo, tarea.fecha_limite, tarea.fecha_seguimiento, tarea.esfuerzo_horas, sesion.correo).run()
      await notificarAsignacionTareaCms(env.BASE, tarea, sesion.correo, tarea.tipo === 'solicitud' ? 'solicitud_recibida' : 'asignacion_tarea')
      await registrar(env.BASE, sesion, 'crear tarea CMS', `tareas/${tarea.id}`, tarea.titulo)
      return responder({ tarea, asignada_automaticamente: Boolean(responsableAutomatico) }, 201)
    }
    if (request.method === 'PATCH' && id) {
      const actual = await env.BASE.prepare('SELECT * FROM tareas_cms WHERE id = ?1').bind(id).first()
      if (!actual) return error('No encontramos esa tarea.', 404)
      if (!puedeGestionarTareaCms(alcance, sesion, actual)) return error('No podés modificar esta tarea.', 403)
      let datos
      try { datos = await request.json() } catch { return error('Los cambios de la tarea no son válidos.', 400) }
      if (alcance.perfil === 'integrante' && Object.keys(datos).some((campo) => !['estado', 'fecha_seguimiento'].includes(campo))) {
        return error('Como integrante solo podés actualizar el estado y el seguimiento de tu tarea.', 403)
      }
      const resultado = tareaCmsDesde(datos, actual)
      if (resultado.error) return error(resultado.error, 400)
      if (!puedeGestionarTareaCms(alcance, sesion, resultado.tarea)) return error('No podés mover esta tarea a otro equipo.', 403)
      const tarea = {
        ...resultado.tarea,
        solicitante_correo: resultado.tarea.tipo === 'solicitud'
          ? (actual.solicitante_correo || sesion.correo)
          : resultado.tarea.solicitante_correo,
      }
      if (tarea.estado === 'completada') {
        const pendientes = await dependenciasPendientesDe(env.BASE, id)
        if (pendientes.length) return error(`No podés completar esta tarea hasta cerrar: ${pendientes.map((fila) => fila.titulo).join(', ')}.`, 409)
      }
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, tarea)
      if (referenciaInvalida) return error(referenciaInvalida, 400)
      await env.BASE.prepare(`
        UPDATE tareas_cms SET titulo = ?2, descripcion = ?3, tipo = ?4, estado = ?5, prioridad = ?6,
          equipo_id = ?7, proyecto_id = ?8, evento_id = ?9, responsable_correo = ?10, solicitante_correo = ?11,
          fecha_limite = ?12, fecha_seguimiento = ?13, esfuerzo_horas = ?14, actualizado_en = CURRENT_TIMESTAMP,
          completado_en = CASE WHEN ?5 = 'completada' AND completado_en IS NULL THEN CURRENT_TIMESTAMP WHEN ?5 != 'completada' THEN NULL ELSE completado_en END
        WHERE id = ?1
      `).bind(id, tarea.titulo, tarea.descripcion, tarea.tipo, tarea.estado, tarea.prioridad, tarea.equipo_id, tarea.proyecto_id, tarea.evento_id, tarea.responsable_correo, tarea.solicitante_correo, tarea.fecha_limite, tarea.fecha_seguimiento, tarea.esfuerzo_horas).run()
      if (tarea.responsable_correo && tarea.responsable_correo !== actual.responsable_correo) {
        await notificarAsignacionTareaCms(env.BASE, { id, ...tarea }, sesion.correo, tarea.tipo === 'solicitud' ? 'solicitud_recibida' : 'asignacion_tarea')
      }
      await registrar(env.BASE, sesion, 'modificar tarea CMS', `tareas/${id}`, tarea.titulo)
      return responder({ tarea: { id, ...tarea } })
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
        (id, titulo, objetivo, equipo_id, proyecto_id, fecha_hora, lugar, estado, preparacion, minuta, resumen, creado_por, serie_id, generada_para)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`)
        .bind(reunion.id, reunion.titulo, reunion.objetivo, reunion.equipo_id, reunion.proyecto_id, reunion.fecha_hora, reunion.lugar, reunion.estado, reunion.preparacion, reunion.minuta, reunion.resumen, sesion.correo, reunion.serie_id ?? null, reunion.generada_para ?? null)))
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
      await env.BASE.prepare(`UPDATE reuniones_cms SET titulo = ?2, objetivo = ?3, equipo_id = ?4, proyecto_id = ?5, fecha_hora = ?6,
        lugar = ?7, estado = ?8, preparacion = ?9, minuta = ?10, resumen = ?11, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1`)
        .bind(id, reunion.titulo, reunion.objetivo, reunion.equipo_id, reunion.proyecto_id, reunion.fecha_hora, reunion.lugar, reunion.estado, reunion.preparacion, reunion.minuta, reunion.resumen).run()
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
      const filas = await env.BASE.prepare(`SELECT e.*, q.nombre AS equipo_nombre, p.titulo AS proyecto_titulo, u.nombre AS responsable_nombre
        FROM eventos_cms e
        LEFT JOIN equipos q ON q.id = e.equipo_id
        LEFT JOIN proyectos_cms p ON p.id = e.proyecto_id
        LEFT JOIN usuarios u ON u.correo = e.responsable_correo
        WHERE e.estado = 'planificado' AND e.fecha_hora >= ?1 AND e.fecha_hora < ?2
        ORDER BY e.fecha_hora ASC`).bind(inicio, fin).all()
      const visibles = alcance.global || alcance.perfil === 'consulta'
        ? filas.results : filas.results.filter((fila) => puedeVerEquipoCms(alcance, fila.equipo_id))
      return responder({ eventos: visibles })
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
        (id, titulo, descripcion, fecha_hora, fecha_fin, lugar, equipo_id, proyecto_id, responsable_correo, estado, tipo, creado_por, serie_id, generada_para)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`)
        .bind(evento.id, evento.titulo, evento.descripcion, evento.fecha_hora, evento.fecha_fin, evento.lugar, evento.equipo_id, evento.proyecto_id, evento.responsable_correo, evento.estado, evento.tipo, sesion.correo, evento.serie_id ?? null, evento.generada_para ?? null)))
      await registrar(env.BASE, sesion, recurrente ? 'crear serie de actividades CMS' : 'crear actividad CMS', recurrente ? `eventos/serie/${eventos[0].serie_id}` : `eventos/${eventos[0].id}`, recurrente ? `${eventos[0].titulo}, ${eventos.length} fechas` : eventos[0].titulo)
      return responder(recurrente ? { eventos, cantidad: eventos.length } : { evento: eventos[0] }, 201)
    }
    if (request.method === 'PATCH' && id) {
      const actual = await env.BASE.prepare('SELECT * FROM eventos_cms WHERE id = ?1').bind(id).first()
      if (!actual) return error('No encontramos esa actividad.', 404)
      if (!puedeGestionarEquipoCms(alcance, actual.equipo_id)) return error('No podés modificar esta actividad.', 403)
      let datos
      try { datos = await request.json() } catch { return error('Los cambios de la actividad no son válidos.', 400) }
      const resultado = eventoCmsDesde(datos, actual)
      if (resultado.error) return error(resultado.error, 400)
      if (!puedeGestionarEquipoCms(alcance, resultado.evento.equipo_id)) return error('No podés mover esta actividad a otro equipo.', 403)
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, resultado.evento)
      if (referenciaInvalida) return error(referenciaInvalida, 400)
      const evento = resultado.evento
      await env.BASE.prepare(`UPDATE eventos_cms SET titulo = ?2, descripcion = ?3, fecha_hora = ?4, fecha_fin = ?5, lugar = ?6,
        equipo_id = ?7, proyecto_id = ?8, responsable_correo = ?9, estado = ?10, tipo = ?11, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1`)
        .bind(id, evento.titulo, evento.descripcion, evento.fecha_hora, evento.fecha_fin, evento.lugar, evento.equipo_id, evento.proyecto_id, evento.responsable_correo, evento.estado, evento.tipo).run()
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
        env.BASE.prepare(`SELECT e.*, u.nombre AS responsable_nombre FROM eventos_cms e LEFT JOIN usuarios u ON u.correo = e.responsable_correo
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
      return responder({ proyecto, tareas: tareas.results, eventos: eventos.results, reuniones: reuniones.results, decisiones: decisiones.results, documentos: documentos.results.filter((documento) => puedeVerDocumentoCms(sesion, documento)), riesgos: riesgos.results, hitos: hitos.results, gastos: gastos.results })
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
        (id, titulo, objetivo, programa_id, equipo_id, responsable_correo, estado, prioridad, fecha_inicio, fecha_fin, presupuesto, notas, creado_por)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`)
        .bind(proyecto.id, proyecto.titulo, proyecto.objetivo, proyecto.programa_id, proyecto.equipo_id, proyecto.responsable_correo, proyecto.estado, proyecto.prioridad, proyecto.fecha_inicio, proyecto.fecha_fin, proyecto.presupuesto, proyecto.notas, sesion.correo).run()
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
      await env.BASE.prepare(`UPDATE proyectos_cms SET titulo = ?2, objetivo = ?3, programa_id = ?4, equipo_id = ?5, responsable_correo = ?6,
        estado = ?7, prioridad = ?8, fecha_inicio = ?9, fecha_fin = ?10, presupuesto = ?11, notas = ?12, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1`)
        .bind(id, proyecto.titulo, proyecto.objetivo, proyecto.programa_id, proyecto.equipo_id, proyecto.responsable_correo, proyecto.estado, proyecto.prioridad, proyecto.fecha_inicio, proyecto.fecha_fin, proyecto.presupuesto, proyecto.notas).run()
      await registrar(env.BASE, sesion, 'modificar proyecto CMS', `proyectos/${id}`, proyecto.titulo)
      return responder({ proyecto: { id, ...proyecto } })
    }
  }

  if (recurso === 'documentos') {
    if (request.method === 'GET') {
      const filas = await env.BASE.prepare(`SELECT d.*, e.nombre AS equipo_nombre, p.titulo AS proyecto_titulo FROM documentos_cms d LEFT JOIN equipos e ON e.id = d.equipo_id LEFT JOIN proyectos_cms p ON p.id = d.proyecto_id ORDER BY d.actualizado_en DESC`).all()
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
      await env.BASE.prepare('INSERT INTO documentos_cms (id, titulo, descripcion, tipo, url, sensibilidad, equipo_id, proyecto_id, creado_por) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)').bind(documento.id, documento.titulo, documento.descripcion, documento.tipo, documento.url, documento.sensibilidad, documento.equipo_id, documento.proyecto_id, sesion.correo).run()
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

  if (recurso === 'formularios') {
    if (request.method === 'POST' && !id) {
      let datos; try { datos = await request.json() } catch { return error('Los datos del formulario no son válidos.', 400) }
      const resultado = formularioCmsDesde(datos); if (resultado.error) return error(resultado.error, 400)
      if (!puedeGestionarEquipoCms(alcance, resultado.formulario.equipo_id)) return error('Elegí un equipo que coordinás para crear el formulario.', 403)
      const referenciaInvalida = await referenciasCmsValidas(env.BASE, resultado.formulario); if (referenciaInvalida) return error(referenciaInvalida, 400)
      const formulario = { id: crypto.randomUUID(), ...resultado.formulario }
      await env.BASE.prepare(`INSERT INTO formularios_cms
        (id, titulo, descripcion, tipo, visibilidad, estado, equipo_id, equipo_solicitante_id, prioridad, proyecto_id, campos_json, creado_por)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`)
        .bind(formulario.id, formulario.titulo, formulario.descripcion, formulario.tipo, formulario.visibilidad, formulario.estado, formulario.equipo_id, formulario.equipo_solicitante_id, formulario.prioridad, formulario.proyecto_id, formulario.campos_json, sesion.correo).run()
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
        equipo_id = ?7, equipo_solicitante_id = ?8, prioridad = ?9, proyecto_id = ?10, campos_json = ?11, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1`)
        .bind(id, formulario.titulo, formulario.descripcion, formulario.tipo, formulario.visibilidad, formulario.estado, formulario.equipo_id, formulario.equipo_solicitante_id, formulario.prioridad, formulario.proyecto_id, formulario.campos_json).run()
      await registrar(env.BASE, sesion, 'modificar formulario CMS', `formularios/${id}`, formulario.titulo)
      return responder({ formulario: { id, ...formulario } })
    }
    if (id && partes[3] === 'respuestas' && request.method === 'POST') {
      const formulario = await env.BASE.prepare('SELECT * FROM formularios_cms WHERE id = ?1 AND estado = ?2').bind(id, 'activa').first()
      if (!formulario) return error('Este formulario no está disponible.', 404)
      if (!puedeGestionarEquipoCms(alcance, formulario.equipo_id)) return error('No podés registrar una respuesta para este formulario.', 403)
      let datos; try { datos = await request.json() } catch { return error('La respuesta no es válida.', 400) }
      const resultado = respuestaFormularioCmsDesde(datos, formulario); if (resultado.error) return error(resultado.error, 400)
      const derivada = await derivarEntradaCms(env.BASE, resultado.entrada, sesion, formulario.id)
      await registrar(env.BASE, sesion, 'recibir formulario interno', `formularios/${id}`, derivada.entrada.nombre)
      return responder(derivada, 201)
    }
  }

  if (recurso === 'entradas') {
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
    if (id && request.method === 'PATCH') {
      const actual = await env.BASE.prepare('SELECT * FROM entradas_cms WHERE id = ?1').bind(id).first()
      if (!actual) return error('No encontramos esa entrada.', 404)
      if (!puedeGestionarEquipoCms(alcance, actual.equipo_id)) return error('No podés modificar esta entrada.', 403)
      let datos; try { datos = await request.json() } catch { return error('Los cambios de la entrada no son válidos.', 400) }
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
  if (ruta === 'ingresar' && contexto.request.method === 'POST') return ingresar(contexto)
  if (ruta === 'cerrar' && contexto.request.method === 'POST') return cerrarSesion()
  if (ruta.startsWith('formularios/')) return formularioPublico(contexto, ruta)
  const sesion = await sesionDe(contexto)
  if (!sesion) return error('No tenés una sesión autorizada.', 401)

  if (ruta === 'sesion' && contexto.request.method === 'GET') {
    await contexto.env.BASE.prepare('UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE correo = ?1').bind(sesion.correo).run()
    return responder(sesion)
  }
  if (ruta === 'auditoria' && contexto.request.method === 'GET') return auditoria(contexto, sesion)
  if (ruta === 'usuarios/foto') return fotoPerfilUsuario(contexto, sesion)
  if (ruta === 'usuarios') return usuarios(contexto, sesion)
  if (ruta === 'documento') return documento(contexto, sesion)
  if (ruta === 'listas' && contexto.request.method === 'GET') return listas(contexto, sesion)
  if (ruta === 'foto') return foto(contexto, sesion)
  if (ruta.startsWith('personas/') && ruta.endsWith('/protegida')) {
    return fichaProtegida(contexto, sesion, ruta.split('/')[1])
  }
  if (ruta === 'cms' || ruta.startsWith('cms/')) return cms(contexto, sesion, ruta)
  return error('No se encontró esa operación.', 404)
}
