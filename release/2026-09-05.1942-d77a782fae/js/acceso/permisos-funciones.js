const PERFILES = Object.freeze(['administracion', 'direccion', 'coordinacion', 'integrante', 'consulta'])
const EDITORES_CONTENIDO_PUBLICO = new Set(['administracion', 'direccion', 'coordinacion'])
const FIRMANTES_INSTITUCIONALES = new Set(['administracion', 'direccion'])
export const CAPACIDAD_CREAR_TAREAS = 'crear_tareas'

export function perfilAccesoInstitucional(cuenta = {}) {
  if (PERFILES.includes(cuenta?.perfil_acceso)) return cuenta.perfil_acceso
  return cuenta?.rol === 'admin' ? 'administracion' : 'coordinacion'
}

export function puedeGestionarPaginaWeb(cuenta = {}) {
  return EDITORES_CONTENIDO_PUBLICO.has(perfilAccesoInstitucional(cuenta))
}

export function puedeUsarComunicacionVisual(cuenta = {}) {
  return EDITORES_CONTENIDO_PUBLICO.has(perfilAccesoInstitucional(cuenta))
}

export function puedeCrearCartaMembretada(cuenta = {}) {
  return FIRMANTES_INSTITUCIONALES.has(perfilAccesoInstitucional(cuenta))
}

export function puedeVerMetricasPaginaWeb(cuenta = {}) {
  return EDITORES_CONTENIDO_PUBLICO.has(perfilAccesoInstitucional(cuenta))
}

export function puedeGestionarComunicaciones(cuenta = {}) {
  return FIRMANTES_INSTITUCIONALES.has(perfilAccesoInstitucional(cuenta))
}

export function puedeVerOperaciones(cuenta = {}) {
  return FIRMANTES_INSTITUCIONALES.has(perfilAccesoInstitucional(cuenta))
}

export function permisoCrearTareasEfectivo(cuenta = {}, equipoId = null, politicas = []) {
  const perfil = perfilAccesoInstitucional(cuenta)
  const correo = String(cuenta?.correo || cuenta?.usuario || '').trim().toLowerCase()
  const candidatas = [
    ['usuario', correo, 'Excepción individual'],
    ['equipo', String(equipoId || ''), 'Regla del equipo'],
    ['perfil', perfil, 'Regla del perfil'],
  ]
  for (const [alcanceTipo, alcanceId, fuente] of candidatas) {
    if (!alcanceId) continue
    const politica = politicas.find((fila) => fila.capacidad === CAPACIDAD_CREAR_TAREAS
      && fila.alcance_tipo === alcanceTipo && String(fila.alcance_id).toLowerCase() === alcanceId.toLowerCase())
    if (politica) return { permitido: politica.efecto === 'permitir', efecto: politica.efecto, fuente, alcance_tipo: alcanceTipo, alcance_id: alcanceId }
  }
  return {
    permitido: perfil === 'administracion',
    efecto: perfil === 'administracion' ? 'permitir' : 'bloquear',
    fuente: perfil === 'administracion' ? 'Predeterminado de Administración' : 'Predeterminado institucional',
    alcance_tipo: 'predeterminado', alcance_id: perfil,
  }
}
