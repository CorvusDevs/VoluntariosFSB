const PREFIJO = 'aletea:navegacion-cms:v1'

export const GRUPOS_NAVEGACION_CMS = Object.freeze({
  trabajo: ['inicio', 'cms-trabajo', 'cms-agenda'],
  paginaWeb: ['cms-pagina-web'],
  comunicacionVisual: ['cms-comunicacion-visual'],
  organizacion: ['cms-areas', 'cms-formularios', 'cms-biblioteca'],
  administracion: ['cms-privacidad', 'accesos', 'registro-institucional'],
  equipos: ['cms-familias', 'cms-deportes', 'cms-comunicacion', 'cms-capacitaciones', 'cms-finanzas', 'cms-eventos', 'cms-administracion'],
  sistema: ['ayuda', 'cambios'],
})

export const TITULOS_GRUPOS_NAVEGACION_CMS = Object.freeze({
  trabajo: 'Tareas', paginaWeb: 'Página web', comunicacionVisual: 'Comunicación visual', organizacion: 'Organización', administracion: 'Administración', equipos: 'Equipos', sistema: 'Sistema',
})

export const ETIQUETAS_NAVEGACION_CMS = Object.freeze({
  inicio: 'Centro de control', 'cms-trabajo': 'Mis tareas', 'cms-agenda': 'Agenda',
  'cms-pagina-web': 'Contenido', 'cms-comunicacion-visual': 'Editor de piezas',
  'cms-areas': 'Áreas', 'cms-formularios': 'Formularios', 'cms-biblioteca': 'Biblioteca',
  'cms-privacidad': 'Solicitudes de privacidad', accesos: 'Accesos', 'registro-institucional': 'Registro institucional',
  'cms-familias': 'Familias', 'cms-deportes': 'Deportes', 'cms-comunicacion': 'Comunicación',
  'cms-capacitaciones': 'Capacitaciones', 'cms-finanzas': 'Finanzas', 'cms-eventos': 'Eventos', 'cms-administracion': 'Administración',
  ayuda: 'Ayuda', cambios: 'Cambios',
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
    return Object.fromEntries(Object.keys(GRUPOS_NAVEGACION_CMS).map((grupo) => [grupo, valor[grupo]]).filter(([, estado]) => typeof estado === 'boolean'))
  } catch {
    return {}
  }
}

export function guardarPreferenciaNavegacion(grupo, abierto, sesion = {}, almacen = globalThis.localStorage) {
  if (!(grupo in GRUPOS_NAVEGACION_CMS)) return
  try {
    const preferencias = leerPreferenciasNavegacion(sesion, almacen)
    preferencias[grupo] = Boolean(abierto)
    almacen?.setItem(clavePreferenciasNavegacion(sesion), JSON.stringify(preferencias))
  } catch {}
}

export function grupoActivoNavegacion(pantalla) {
  return Object.entries(GRUPOS_NAVEGACION_CMS).find(([, destinos]) => destinos.includes(pantalla))?.[0] || ''
}

export function grupoDebeEstarAbierto(grupo, pantalla, preferencias = {}) {
  if (grupoActivoNavegacion(pantalla) === grupo) return true
  if (typeof preferencias[grupo] === 'boolean') return preferencias[grupo]
  return grupo === 'trabajo'
}
