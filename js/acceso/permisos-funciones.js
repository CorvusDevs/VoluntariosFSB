const PERFILES = Object.freeze(['administracion', 'direccion', 'coordinacion', 'integrante', 'consulta'])
const EDITORES_CONTENIDO_PUBLICO = new Set(['administracion', 'direccion', 'coordinacion'])
const FIRMANTES_INSTITUCIONALES = new Set(['administracion', 'direccion'])

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
