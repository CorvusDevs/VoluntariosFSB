const PREFIJO = 'aletea:navegacion-cms:v1'

export const GRUPOS_NAVEGACION_CMS = Object.freeze({
  trabajo: ['inicio', 'cms-trabajo', 'cms-agenda'],
  organizacion: ['cms-areas', 'cms-formularios', 'cms-biblioteca', 'cms-familias', 'cms-deportes', 'cms-comunicacion', 'cms-capacitaciones', 'cms-finanzas', 'cms-eventos', 'cms-administracion'],
  contenidoPublico: ['cms-pagina-web', 'cms-comunicacion-visual'],
  comunicacion: ['cms-comunicaciones'],
  administracion: ['cms-operaciones', 'cms-privacidad', 'accesos', 'registro-institucional', 'ayuda', 'cambios'],
})

export const TITULOS_GRUPOS_NAVEGACION_CMS = Object.freeze({
  trabajo: 'Trabajo', organizacion: 'Organización', contenidoPublico: 'Contenido público', comunicacion: 'Comunicación', administracion: 'Administración',
})

export const ETIQUETAS_NAVEGACION_CMS = Object.freeze({
  inicio: 'Centro de control', 'cms-trabajo': 'Mis tareas', 'cms-agenda': 'Agenda',
  'cms-pagina-web': 'Página web', 'cms-comunicacion-visual': 'Editor de piezas',
  'cms-comunicaciones': 'Comunicaciones',
  'cms-areas': 'Áreas', 'cms-formularios': 'Formularios', 'cms-biblioteca': 'Biblioteca',
  'cms-privacidad': 'Solicitudes de privacidad', accesos: 'Accesos', 'registro-institucional': 'Registro institucional',
  'cms-familias': 'Familias', 'cms-deportes': 'Deportes', 'cms-comunicacion': 'Comunicación',
  'cms-capacitaciones': 'Capacitaciones', 'cms-finanzas': 'Finanzas', 'cms-eventos': 'Eventos', 'cms-administracion': 'Administración',
  'cms-operaciones': 'Operaciones', ayuda: 'Ayuda', cambios: 'Cambios',
})

function identidadCuenta(sesion = {}) {
  return String(sesion.correo || sesion.usuario || sesion.nombre || 'cuenta')
    .trim().toLocaleLowerCase('es-UY').replace(/[^a-z0-9@._-]+/g, '-').slice(0, 120) || 'cuenta'
}

export function clavePreferenciasNavegacion(sesion = {}) {
  return `${PREFIJO}:${identidadCuenta(sesion)}`
}

export function leerPreferenciasNavegacion(sesion = {}, almacen = globalThis.localStorage) {
  try {
    const valor = JSON.parse(almacen?.getItem(clavePreferenciasNavegacion(sesion)) || '{}')
    if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return {}
    const favorito = typeof valor.favorito === 'string' && valor.favorito in GRUPOS_NAVEGACION_CMS ? valor.favorito : ''
    return favorito ? { favorito } : {}
  } catch {
    return {}
  }
}

export function guardarPreferenciaNavegacion(grupo, abierto, sesion = {}, almacen = globalThis.localStorage) {
  if (!(grupo in GRUPOS_NAVEGACION_CMS)) return
  try {
    const preferencias = leerPreferenciasNavegacion(sesion, almacen)
    if (abierto) preferencias.favorito = grupo
    else if (preferencias.favorito === grupo) delete preferencias.favorito
    almacen?.setItem(clavePreferenciasNavegacion(sesion), JSON.stringify(preferencias))
  } catch {}
}

export function grupoActivoNavegacion(pantalla) {
  return Object.entries(GRUPOS_NAVEGACION_CMS).find(([, destinos]) => destinos.includes(pantalla))?.[0] || ''
}

export function grupoDebeEstarAbierto(grupo, pantalla, preferencias = {}) {
  if (grupoActivoNavegacion(pantalla) === grupo) return true
  return preferencias.favorito === grupo
}
