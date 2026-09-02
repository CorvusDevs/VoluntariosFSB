export const RUTAS_GESTOR = Object.freeze({
  inicio: '/',
  operacion: '/centro-de-control',
  lista: '/planilla',
  'vista-previa': '/planilla/vista-previa',
  personas: '/personas',
  reporte: '/reportes',
  asistencias: '/asistencias',
  agenda: '/planilla/agenda',
  registro: '/registro',
  ajustes: '/ajustes',
  accesos: '/accesos',
  'registro-institucional': '/registro-institucional',
  ayuda: '/ayuda',
  cambios: '/cambios',
  'cms-trabajo': '/tareas',
  'cms-agenda': '/agenda',
  'cms-pagina-web': '/pagina-web',
  'cms-comunicacion-visual': '/comunicacion-visual',
  'cms-comunicaciones': '/comunicaciones',
  'cms-operaciones': '/operaciones',
  'cms-areas': '/areas',
  'cms-formularios': '/formularios',
  'cms-biblioteca': '/biblioteca',
  'cms-privacidad': '/solicitudes-de-privacidad',
  'cms-auditoria': '/auditoria',
  'cms-familias': '/equipos/familias',
  'cms-deportes': '/equipos/deportes',
  'cms-comunicacion': '/equipos/comunicacion',
  'cms-capacitaciones': '/equipos/capacitaciones',
  'cms-finanzas': '/finanzas',
  'cms-eventos': '/equipos/eventos',
  'cms-administracion': '/equipos/administracion',
})

export const PANTALLAS_GESTOR = Object.freeze(Object.keys(RUTAS_GESTOR))

export function usaRutasRealesGestor(hostname = globalThis.location?.hostname ?? '') {
  return hostname === 'gestor.aletea.org'
}

const PANTALLA_POR_RUTA = Object.freeze(Object.fromEntries(
  Object.entries(RUTAS_GESTOR).map(([pantalla, ruta]) => [ruta, pantalla]),
))

const RUTAS_ANTERIORES = Object.freeze({ '/mi-trabajo': 'cms-trabajo' })

const TITULOS = Object.freeze({
  '/': ['Aletea institucional', 'Sistema de Gestión Institucional de Aletea.'],
  '/centro-de-control': ['Centro de control | Aletea', 'Resumen privado de las tareas institucionales de Aletea.'],
  '/planilla': ['Planilla de Fútbol sin Barreras | Aletea', 'Organización privada de la jornada de Fútbol sin Barreras.'],
  '/planilla/vista-previa': ['Vista previa de la planilla | Aletea', 'Vista privada de la organización de Fútbol sin Barreras.'],
  '/personas': ['Personas | Aletea', 'Directorio privado de personas de Aletea.'],
  '/reportes': ['Reportes | Aletea', 'Reportes privados de la gestión institucional de Aletea.'],
  '/asistencias': ['Asistencias | Aletea', 'Seguimiento privado de asistencias de Fútbol sin Barreras.'],
  '/planilla/agenda': ['Agenda de Fútbol sin Barreras | Aletea', 'Agenda privada de actividades de Fútbol sin Barreras.'],
  '/registro': ['Registro | Aletea', 'Acceso privado al registro institucional de Aletea.'],
  '/ajustes': ['Ajustes | Aletea', 'Configuración privada del gestor institucional de Aletea.'],
  '/accesos': ['Accesos | Aletea', 'Administración privada de accesos del gestor de Aletea.'],
  '/registro-institucional': ['Registro institucional | Aletea', 'Registro privado de actividad institucional de Aletea.'],
  '/ayuda': ['Ayuda del gestor | Aletea', 'Guías y respuestas para usar el gestor institucional de Aletea.'],
  '/cambios': ['Cambios del sistema | Aletea', 'Novedades y mejoras del gestor institucional de Aletea.'],
  '/tareas': ['Mis tareas | Aletea', 'Acceso privado a tareas y seguimientos de Aletea.'],
  '/agenda': ['Agenda institucional | Aletea', 'Agenda privada de actividades y reuniones de Aletea.'],
  '/pagina-web': ['Página web | Aletea', 'Edición privada del sitio público de Aletea.'],
  '/comunicacion-visual': ['Comunicación visual | Aletea', 'Editor institucional de piezas de comunicación de Aletea.'],
  '/comunicaciones': ['Comunicaciones | Aletea', 'Gestión privada de contactos, consentimiento y campañas de Aletea.'],
  '/operaciones': ['Centro de operaciones | Aletea', 'Estado privado de integraciones, automatizaciones e incidentes del gestor de Aletea.'],
  '/areas': ['Áreas | Aletea', 'Organización privada de áreas y equipos de Aletea.'],
  '/formularios': ['Formularios | Aletea', 'Gestión privada de formularios institucionales de Aletea.'],
  '/biblioteca': ['Biblioteca | Aletea', 'Biblioteca de materiales y enlaces institucionales de Aletea.'],
  '/solicitudes-de-privacidad': ['Solicitudes de privacidad | Aletea', 'Área privada para gestionar solicitudes de datos de Aletea.'],
  '/auditoria': ['Auditoría | Aletea', 'Registro privado de cambios y actividad del gestor de Aletea.'],
  '/equipos/familias': ['Familias | Aletea', 'Espacio privado del equipo Familias de Aletea.'],
  '/equipos/deportes': ['Deportes | Aletea', 'Espacio privado del equipo Deportes de Aletea.'],
  '/equipos/comunicacion': ['Comunicación | Aletea', 'Espacio privado del equipo Comunicación de Aletea.'],
  '/equipos/capacitaciones': ['Capacitaciones | Aletea', 'Espacio privado del equipo Capacitaciones de Aletea.'],
  '/finanzas': ['Finanzas | Aletea', 'Seguimiento privado de cuotas, pagos y pendientes de Fútbol sin Barreras.'],
  '/equipos/eventos': ['Eventos | Aletea', 'Espacio privado del equipo Eventos de Aletea.'],
  '/equipos/administracion': ['Administración | Aletea', 'Espacio privado del equipo Administración de Aletea.'],
})

function contextoDesdeConsulta(pantalla, consulta = '') {
  const parametros = new URLSearchParams(String(consulta || '').replace(/^\?/, ''))
  const contexto = {}
  const busqueda = parametros.get('buscar')?.trim()
  if (busqueda) contexto.busqueda = busqueda.slice(0, 120)
  if (pantalla === 'personas') {
    const personaId = parametros.get('persona')?.trim()
    const accion = parametros.get('accion')?.trim()
    if (personaId) contexto.personaId = personaId.slice(0, 100)
    if (accion === 'archivar') contexto.accionPersona = accion
  }
  if (pantalla === 'cms-trabajo') {
    const tareaId = parametros.get('tarea')?.trim()
    const filtroTrabajo = parametros.get('filtro')?.trim()
    if (tareaId) contexto.tareaId = tareaId.slice(0, 100)
    if (filtroTrabajo) contexto.filtroTrabajo = filtroTrabajo.slice(0, 40)
    const unidadId = parametros.get('unidad')?.trim()
    if (unidadId) contexto.unidadId = unidadId.slice(0, 100)
  }
  if (pantalla === 'ayuda') {
    const volverPantalla = parametros.get('volver')?.trim()
    if (volverPantalla && PANTALLAS_GESTOR.includes(volverPantalla) && volverPantalla !== 'ayuda') {
      contexto.volverPantalla = volverPantalla
      try {
        const volverContexto = JSON.parse(parametros.get('contexto') || '{}')
        if (volverContexto && typeof volverContexto === 'object' && !Array.isArray(volverContexto)) contexto.volverContexto = volverContexto
      } catch { contexto.volverContexto = {} }
    }
  }
  return contexto
}

function consultaDesdeContexto(pantalla, contexto = {}) {
  const parametros = new URLSearchParams()
  if (contexto.busqueda) parametros.set('buscar', String(contexto.busqueda).slice(0, 120))
  if (pantalla === 'personas') {
    if (contexto.personaId) parametros.set('persona', String(contexto.personaId).slice(0, 100))
    if (contexto.accionPersona === 'archivar') parametros.set('accion', 'archivar')
  }
  if (pantalla === 'cms-trabajo') {
    const tareaId = contexto.tareaId || contexto.tarea
    const filtroTrabajo = contexto.filtroTrabajo || contexto.filtro
    if (tareaId) parametros.set('tarea', String(tareaId).slice(0, 100))
    if (filtroTrabajo) parametros.set('filtro', String(filtroTrabajo).slice(0, 40))
    if (contexto.unidadId) parametros.set('unidad', String(contexto.unidadId).slice(0, 100))
  }
  if (pantalla === 'ayuda' && PANTALLAS_GESTOR.includes(contexto.volverPantalla) && contexto.volverPantalla !== 'ayuda') {
    parametros.set('volver', contexto.volverPantalla)
    const permitido = Object.fromEntries(Object.entries(contexto.volverContexto || {}).filter(([clave, valor]) => ['tareaId', 'tarea', 'filtroTrabajo', 'filtro', 'unidadId', 'personaId', 'accionPersona', 'busqueda'].includes(clave) && ['string', 'number', 'boolean'].includes(typeof valor)))
    if (Object.keys(permitido).length) parametros.set('contexto', JSON.stringify(permitido))
  }
  return parametros.toString()
}

export function rutaParaPantalla(pantalla, contexto = {}) {
  const ruta = RUTAS_GESTOR[pantalla]
  if (!ruta) return ''
  const consulta = consultaDesdeContexto(pantalla, contexto)
  return `${ruta}${consulta ? `?${consulta}` : ''}`
}

export function pantallaDesdeRuta(pathname = '', search = '') {
  const ruta = String(pathname || '/').replace(/\/+$/, '') || '/'
  const pantalla = PANTALLA_POR_RUTA[ruta] || RUTAS_ANTERIORES[ruta]
  if (!pantalla || ruta === '/') return null
  return { pantalla, contexto: contextoDesdeConsulta(pantalla, search) }
}

export function metadatosParaRuta(pathname = '/') {
  const ruta = String(pathname || '/').replace(/\/+$/, '') || '/'
  const pantallaAnterior = RUTAS_ANTERIORES[ruta]
  const rutaCanonica = pantallaAnterior ? RUTAS_GESTOR[pantallaAnterior] : ruta
  const contenido = TITULOS[rutaCanonica]
  if (!contenido) return null
  return { ruta: rutaCanonica, titulo: contenido[0], descripcion: contenido[1] }
}
