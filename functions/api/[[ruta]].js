const responder = (datos, estado = 200, cabeceras = {}) => new Response(
  datos === null ? null : JSON.stringify(datos),
  { status: estado, headers: { 'content-type': 'application/json; charset=utf-8', ...cabeceras } },
)

const error = (mensaje, estado) => responder({ error: mensaje }, estado)

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

async function sesionDe(contexto) {
  if (!contexto.env.SESSION_SECRET) return null
  const firmada = await leerSesionFirmada(cookies(contexto.request).vfsb_sesion, contexto.env.SESSION_SECRET)
  if (!firmada) return null
  const cuenta = await contexto.env.BASE.prepare(
    'SELECT correo, nombre, rol, permisos, version_sesion FROM usuarios WHERE correo = ?1 AND activo = 1',
  ).bind(firmada.usuario).first()
  return cuenta?.version_sesion === firmada.version ? exponerCuenta(cuenta) : null
}

async function registrar(base, sesion, accion, recurso, detalle = null) {
  await base.prepare(
    'INSERT INTO actividad (correo, accion, recurso, detalle) VALUES (?1, ?2, ?3, ?4)',
  ).bind(sesion.correo, accion, recurso, detalle).run()
}

const esAdmin = (sesion) => sesion.rol === 'admin'
const PERMISOS = ['planilla', 'personas', 'asistencias', 'reportes', 'agenda']

function permisosDe(cuenta) {
  if (cuenta?.rol === 'admin' || !cuenta?.permisos) return PERMISOS
  if (Array.isArray(cuenta.permisos)) return cuenta.permisos.filter((permiso) => PERMISOS.includes(permiso))
  try {
    const permisos = JSON.parse(cuenta.permisos)
    return Array.isArray(permisos) ? permisos.filter((permiso) => PERMISOS.includes(permiso)) : PERMISOS
  } catch { return PERMISOS }
}

function exponerCuenta(cuenta) {
  return { ...cuenta, permisos: permisosDe(cuenta) }
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
  return /^\d{4}-\d{2}-\d{2}$/.test(String(fecha ?? '')) && !Number.isNaN(new Date(`${fecha}T00:00:00`).getTime())
}

function personaPublica(persona) {
  const { id, nombre, grupo, nuevo, foto, activo } = persona ?? {}
  return { id, nombre, ...(grupo ? { grupo } : {}), nuevo: Boolean(nuevo), foto: foto ?? null, activo: activo !== false }
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
  if (tienePermiso(sesion, 'personas')) return roster
  return {
    ...roster,
    participantes: (roster?.participantes ?? []).map(personaPublica),
    voluntarios: (roster?.voluntarios ?? []).map(personaPublica),
    // La agenda se puede recorrer mes a mes. Mandamos un ciclo anual de avisos,
    // nunca las fechas de nacimiento ni el resto del perfil.
    cumpleanosAgenda: cumpleanosParaAgenda(roster, hoy, 400),
  }
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
  let datos
  try { datos = await contexto.request.json() } catch { return error('No se pudo ingresar.', 400) }
  const usuario = String(datos.usuario || '').trim().toLowerCase()
  const contrasena = String(datos.contrasena || '')
  if (!usuario || !contrasena) return error('Usuario o contraseña incorrectos.', 401)
  const cuenta = await contexto.env.BASE.prepare(`
    SELECT correo, nombre, rol, permisos, sal, hash_contrasena, version_sesion
    FROM usuarios WHERE correo = ?1 AND activo = 1
  `).bind(usuario).first()
  const correcta = cuenta?.sal && cuenta?.hash_contrasena
    && iguales(await derivarContrasena(contrasena, new Uint8Array(cuenta.sal)), new Uint8Array(cuenta.hash_contrasena))
  if (!correcta) return error('Usuario o contraseña incorrectos.', 401)
  const expira = Math.floor(Date.now() / 1000) + DURACION_SESION
  const token = await firmarSesion({ usuario: cuenta.correo, version: cuenta.version_sesion, expira }, contexto.env.SESSION_SECRET)
  await registrar(contexto.env.BASE, cuenta, 'ingresar', 'sesion')
  return responder(exponerCuenta({ usuario: cuenta.correo, correo: cuenta.correo, nombre: cuenta.nombre, rol: cuenta.rol, permisos: cuenta.permisos }), 200, {
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
      'SELECT correo, nombre, rol, permisos FROM usuarios WHERE activo = 1 ORDER BY nombre COLLATE NOCASE',
    ).all()
    return responder({ usuarios: filas.results.map(exponerCuenta) })
  }
  if (request.method === 'POST') {
    let datos
    try { datos = await request.json() } catch { return error('Los datos de acceso no son válidos.', 400) }
    const correo = String(datos.usuario || '').trim().toLowerCase()
    const nombre = String(datos.nombre || '').trim()
    const rol = datos.rol
    const permisos = Array.isArray(datos.permisos) ? datos.permisos.filter((permiso) => PERMISOS.includes(permiso)) : PERMISOS
    if (!usuarioValido(correo) || !nombre || !['admin', 'coordinacion'].includes(rol)) {
      return error('Completá nombre, usuario y un rol válido.', 400)
    }
    const contrasena = aleatorio(24)
    const sal = crypto.getRandomValues(new Uint8Array(16))
    const hash = await derivarContrasena(contrasena, sal)
    const creada = await env.BASE.prepare(`
      INSERT INTO usuarios (correo, nombre, rol, permisos, activo, sal, hash_contrasena, version_sesion)
      VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6, 0)
    `).bind(correo, nombre, rol, rol === 'admin' ? null : JSON.stringify(permisos), sal, hash).run().catch(() => null)
    if (!creada) return error('Ese usuario ya existe.', 409)
    await registrar(env.BASE, sesion, 'dar acceso', correo, rol)
    return responder({ usuario: correo, correo, nombre, rol, permisos: rol === 'admin' ? PERMISOS : permisos, contrasena }, 201)
  }
  if (request.method === 'PATCH') {
    let datos
    try { datos = await request.json() } catch { return error('Los permisos no son válidos.', 400) }
    const correo = String(datos.correo || '').trim().toLowerCase()
    const permisos = Array.isArray(datos.permisos) ? datos.permisos.filter((permiso) => PERMISOS.includes(permiso)) : null
    const objetivo = await env.BASE.prepare('SELECT rol FROM usuarios WHERE correo = ?1 AND activo = 1').bind(correo).first()
    if (!objetivo) return error('No encontramos ese acceso.', 404)
    if (objetivo.rol === 'admin' || !permisos) return error('Solo se ajustan permisos de coordinación.', 400)
    await env.BASE.prepare('UPDATE usuarios SET permisos = ?1 WHERE correo = ?2').bind(JSON.stringify(permisos), correo).run()
    await registrar(env.BASE, sesion, 'cambiar permisos', correo, permisos.join(','))
    return responder({ actualizada: true, permisos })
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
  if (request.method !== 'GET' && !tienePermiso(sesion, 'personas')) {
    return error('Tu cuenta no puede modificar fotos.', 403)
  }

  if (request.method === 'GET') {
    const guardada = await env.BASE.prepare(
      'SELECT datos, tipo, revision FROM fotos WHERE clave = ?1',
    ).bind(clave).first()
    if (!guardada) return error('No se encontró la foto.', 404)
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

export async function onRequest(contexto) {
  const ruta = new URL(contexto.request.url).pathname.replace(/^\/api\/?/, '')
  if (ruta === 'ingresar' && contexto.request.method === 'POST') return ingresar(contexto)
  if (ruta === 'cerrar' && contexto.request.method === 'POST') return cerrarSesion()
  const sesion = await sesionDe(contexto)
  if (!sesion) return error('No tenés una sesión autorizada.', 401)

  if (ruta === 'sesion' && contexto.request.method === 'GET') return responder(sesion)
  if (ruta === 'usuarios') return usuarios(contexto, sesion)
  if (ruta === 'documento') return documento(contexto, sesion)
  if (ruta === 'listas' && contexto.request.method === 'GET') return listas(contexto, sesion)
  if (ruta === 'foto') return foto(contexto, sesion)
  return error('No se encontró esa operación.', 404)
}
