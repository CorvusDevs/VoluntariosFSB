const CLAVE = 'voluntarios-fsb:ultima-pantalla'

export const PANTALLAS = Object.freeze([
  'inicio', 'operacion', 'lista', 'vista-previa', 'personas', 'reporte', 'asistencias', 'agenda', 'registro', 'ajustes', 'accesos', 'registro-institucional', 'ayuda', 'cambios',
  'cms-trabajo', 'cms-agenda', 'cms-areas', 'cms-formularios', 'cms-biblioteca', 'cms-auditoria',
  'cms-familias', 'cms-deportes', 'cms-comunicacion', 'cms-capacitaciones', 'cms-finanzas', 'cms-eventos', 'cms-administracion',
])

export function rutaCompartidaDesdeHash(hash = '') {
  const valor = String(hash || '').replace(/^#/, '')
  if (!valor) return null
  const [pantalla, consulta = ''] = valor.split('?')
  if (!PANTALLAS.includes(pantalla)) return null
  const parametros = new URLSearchParams(consulta)
  const contexto = {}
  const busqueda = parametros.get('buscar')?.trim()
  if (busqueda) contexto.busqueda = busqueda.slice(0, 120)
  if (pantalla === 'cms-trabajo') {
    const tareaId = parametros.get('tarea')?.trim()
    const filtroTrabajo = parametros.get('filtro')?.trim()
    if (tareaId) contexto.tareaId = tareaId.slice(0, 100)
    if (filtroTrabajo) contexto.filtroTrabajo = filtroTrabajo.slice(0, 40)
  }
  return { pantalla, contexto }
}

export function hashParaPantalla(pantalla, contexto = {}) {
  if (!PANTALLAS.includes(pantalla)) return ''
  const parametros = new URLSearchParams()
  if (contexto.busqueda) parametros.set('buscar', String(contexto.busqueda).slice(0, 120))
  if (pantalla === 'cms-trabajo') {
    if (contexto.tareaId) parametros.set('tarea', String(contexto.tareaId).slice(0, 100))
    if (contexto.filtroTrabajo) parametros.set('filtro', String(contexto.filtroTrabajo).slice(0, 40))
  }
  const consulta = parametros.toString()
  return `#${pantalla}${consulta ? `?${consulta}` : ''}`
}

export function pantallaPermitida(pantalla, { admin = false, cloudflare = false, permisos = null } = {}) {
  if (!PANTALLAS.includes(pantalla)) return false
  if (pantalla === 'registro') return admin && !cloudflare
  if (['ayuda', 'cambios'].includes(pantalla)) return cloudflare
  if (['accesos', 'registro-institucional'].includes(pantalla)) return admin && cloudflare
  if (pantalla === 'ajustes') return admin
  if (pantalla === 'operacion' && !cloudflare) return false
  if (pantalla.startsWith('cms-') && !cloudflare) return false
  // En Cloudflare, Inicio es el CMS. Mantiene el permiso explícito para no
  // exponer la gestión institucional a cuentas históricas sin migrar.
  if (pantalla === 'inicio' && cloudflare && Array.isArray(permisos) && !permisos.includes('cms')) return false
  if (pantalla.startsWith('cms-') && Array.isArray(permisos) && !permisos.includes('cms')) return false
  const permiso = { lista: 'planilla', 'vista-previa': 'planilla', personas: 'personas', reporte: 'reportes', asistencias: 'asistencias', agenda: 'agenda' }[pantalla]
  if (permiso && Array.isArray(permisos) && !permisos.includes(permiso)) return false
  return true
}

export function leerUltimaPantalla(almacen = globalThis.sessionStorage, porDefecto = 'lista') {
  try {
    const pantalla = almacen?.getItem(CLAVE)
    if (pantalla === 'cms') return 'inicio'
    return PANTALLAS.includes(pantalla) ? pantalla : porDefecto
  } catch {
    return porDefecto
  }
}

export function guardarUltimaPantalla(pantalla, almacen = globalThis.sessionStorage) {
  if (!PANTALLAS.includes(pantalla)) return
  try {
    almacen?.setItem(CLAVE, pantalla)
  } catch {}
}

export function olvidarUltimaPantalla(almacen = globalThis.sessionStorage) {
  try {
    almacen?.removeItem(CLAVE)
  } catch {}
}
