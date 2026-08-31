import { boton, enlaceBoton, elemento, icono, vaciar } from './componentes.js'
import { crearSelectorFecha } from './selector-fecha.js'
import { alertasInstitucionalesCms, clasificarTarea, horizonteInstitucionalCms, metricasOperativasCms, requiereSeguimiento, resumenSemanalCms, resumenTablero } from '../modelo/cms.js'
import { cierreMensualFsb, dineroFsb, estadoCuentaMensualFsb, exportarFinanzasFsb, importeCentavosFsb, prepararCuotasFsb, recargoFsb, textoRecordatorioFsb } from '../modelo/finanzas-fsb.js'
import { rutaParaPantalla, usaRutasRealesGestor } from '../rutas-gestor.js'
import { evitarCortesHora, fechaDesdeLocal, fechaDesdeUTC, hoyISO, valorFechaHoraLocal, valorFechaLocal } from '../util/fechas.js'
import { requisitoDatosPersonales, requisitoEquipo, requisitoPerfil } from '../acceso/requisitos-acceso.js'
import { crearPanelRequisitosAcceso } from './panel-requisitos-acceso.js'
import { MENSAJE_ENLACE_INVALIDO, normalizarCampoEnlace, normalizarEnlaceUsuario } from '../util/enlaces.js'

const HOY = hoyISO
const NOMBRES_AREA = Object.freeze({ familias: 'Familias', deportes: 'Deportes y Recreación', comunicacion: 'Comunicación', capacitaciones: 'Capacitaciones', finanzas: 'Finanzas', eventos: 'Eventos', administracion: 'Administración' })

export function enlaceWebDesdeTexto(texto) {
  return normalizarEnlaceUsuario(texto)
}

export function agregarRecursoADescripcion(descripcion, nombre, enlace) {
  const destino = enlaceWebDesdeTexto(enlace)
  if (!destino) throw new TypeError(MENSAJE_ENLACE_INVALIDO)
  const texto = String(descripcion || '').trim()
  if (texto.includes(destino)) return texto
  const etiqueta = String(nombre || '').trim() || 'Material'
  return [texto, `${etiqueta}: ${destino}`].filter(Boolean).join('\n')
}

export function asistirPegadoEnlace(input, alResultado = () => {}) {
  if (alResultado) input.addEventListener('enlaceasistido', (evento) => alResultado(evento.detail))
  if (input.dataset.pegadoEnlaceAsistido === 'true') return input.aplicarTextoPegadoEnlace
  const aplicar = (texto) => {
    const enlace = enlaceWebDesdeTexto(texto)
    if (!enlace) {
      input.value = String(texto || '').trim()
      input.setCustomValidity(MENSAJE_ENLACE_INVALIDO)
      input.setAttribute('aria-invalid', 'true')
      input.dispatchEvent(new CustomEvent('enlaceasistido', { detail: { enlace: '', valido: false } }))
      input.focus()
      return false
    }
    input.value = enlace
    input.setCustomValidity('')
    input.removeAttribute('aria-invalid')
    input.setSelectionRange?.(0, 0)
    input.scrollLeft = 0
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new CustomEvent('enlaceasistido', { detail: { enlace, valido: true } }))
    return true
  }
  input.dataset.pegadoEnlaceAsistido = 'true'
  input.addEventListener('input', () => { input.setCustomValidity(''); input.removeAttribute('aria-invalid') })
  input.addEventListener('blur', () => {
    if (!input.value.trim()) return
    const enlace = normalizarCampoEnlace(input)
    if (enlace) { input.setSelectionRange?.(0, 0); input.scrollLeft = 0 }
    input.dispatchEvent(new CustomEvent('enlaceasistido', { detail: { enlace, valido: Boolean(enlace) } }))
  })
  input.addEventListener('paste', (evento) => {
    const texto = evento.clipboardData?.getData('text/plain') || ''
    if (!texto) return
    evento.preventDefault()
    aplicar(texto)
  })
  input.aplicarTextoPegadoEnlace = aplicar
  return aplicar
}

export function equipoFundacionalCms(equipos, area) {
  const clave = String(area || '').toLocaleLowerCase('es')
  const nombre = NOMBRES_AREA[clave]
  return equipos.find((equipo) => equipo.clave === clave)
    || equipos.find((equipo) => equipo.nombre?.toLocaleLowerCase('es') === nombre?.toLocaleLowerCase('es'))
    || null
}

function contenidoConEnlaces(texto, clase = '') {
  const contenedor = elemento('span', clase ? [clase] : [])
  const partes = String(texto || '').split(/(https?:\/\/[^\s]+)/g)
  partes.forEach((parte) => {
    if (!/^https?:\/\//.test(parte)) {
      contenedor.appendChild(document.createTextNode(parte))
      return
    }
    const destino = parte.replace(/[),.;]+$/, '')
    const cierre = parte.slice(destino.length)
    const enlace = document.createElement('a')
    enlace.href = destino
    enlace.target = '_blank'
    enlace.rel = 'noreferrer'
    enlace.textContent = 'Abrir material'
    contenedor.appendChild(enlace)
    if (cierre) contenedor.appendChild(document.createTextNode(cierre))
  })
  return contenedor
}

function fechaEnDias(dias) {
  const fecha = new Date(`${HOY()}T00:00:00`)
  fecha.setDate(fecha.getDate() + dias)
  const parte = (valor) => String(valor).padStart(2, '0')
  return `${fecha.getFullYear()}-${parte(fecha.getMonth() + 1)}-${parte(fecha.getDate())}`
}

async function pedir(url, opciones = {}) {
  const respuesta = await fetch(url, {
    ...opciones,
    headers: { 'content-type': 'application/json', ...(opciones.headers ?? {}) },
  })
  const datos = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) {
    const indicador = document.querySelector('[data-estado-guardado]')
    if (indicador) {
      indicador.hidden = false
      indicador.dataset.estado = 'error'
      indicador.textContent = datos.error || 'No se pudo guardar. Revisá la conexión e intentá nuevamente.'
    }
    const fallo = new Error(datos.error || 'No se pudieron cargar los datos institucionales.')
    fallo.detalle = datos
    throw fallo
  }
  if (opciones.method && opciones.method !== 'GET') {
    const indicador = document.querySelector('[data-estado-guardado]')
    if (indicador) {
      indicador.hidden = false
      indicador.dataset.estado = 'guardado'
      indicador.textContent = 'Guardado en Cloudflare'
      clearTimeout(indicador._temporizadorCms)
      indicador._temporizadorCms = setTimeout(() => { indicador.hidden = true }, 2600)
    }
  }
  return datos
}

function fechaHumana(fecha) {
  const valor = valorFechaLocal(fecha)
  if (!valor) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'short' }).format(new Date(`${valor}T00:00:00`))
}

function fechaHoraHumana(fecha) {
  if (!fecha) return 'Sin fecha'
  return evitarCortesHora(new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Montevideo' })
    .format(fechaDesdeUTC(fecha)))
}

function fechaHoraProgramadaHumana(fecha) {
  if (!fecha) return 'Sin fecha'
  return evitarCortesHora(new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    .format(fechaDesdeLocal(fecha)))
}

function fechaHoraAuditoria(fecha) {
  if (!fecha) return 'Sin fecha'
  return evitarCortesHora(new Intl.DateTimeFormat('es-UY', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Montevideo',
  }).format(fechaDesdeUTC(fecha)))
}

function selectorCms(opciones, etiqueta) {
  const select = document.createElement('select')
  select.setAttribute('aria-label', etiqueta)
  opciones.forEach(([valor, texto]) => {
    const opcion = document.createElement('option')
    opcion.value = valor; opcion.textContent = texto
    select.appendChild(opcion)
  })
  return select
}

const TEXTO_ESTADO = {
  atrasada: 'Atrasada', proxima: 'Próxima', bloqueada: 'Bloqueada', esperando_respuesta: 'Esperando respuesta', en_marcha: 'En marcha', cerrada: 'Cerrada',
}

const OPCIONES_ESTADO_TAREA = [
  ['pendiente', 'Pendiente'], ['en_marcha', 'En marcha'], ['esperando_respuesta', 'Esperando respuesta'], ['bloqueada', 'Bloqueada'], ['completada', 'Completada'], ['cancelada', 'Cancelada'],
]

const TEXTO_RESPONSABILIDAD = {
  coordinacion: 'Coordinación', integrante: 'Integrante', referente: 'Referente', sustitucion: 'Sustitución',
}

const TEXTO_ESTADO_REUNION = {
  planificada: 'Planificada', realizada: 'Realizada', cancelada: 'Cancelada',
}

const TEXTO_ESTADO_PROYECTO = {
  borrador: 'Borrador', en_marcha: 'En marcha', en_pausa: 'En pausa', cerrado: 'Cerrado',
}

const TEXTO_TIPO_UNIDAD = {
  programa: 'Programa', formacion: 'Formación', canal: 'Canal de comunicación', proceso: 'Proceso administrativo',
}

const TEXTO_ESTADO_UNIDAD = {
  activa: 'Activa', borrador: 'Borrador', en_pausa: 'En pausa', archivada: 'Archivada',
}

const CATEGORIAS_EQUIPO = [
  ['equipo', 'Equipo'],
  ['comision_directiva', 'Comisión Directiva'],
  ['comision_fiscal', 'Comisión Fiscal'],
  ['comision_electoral', 'Comisión Electoral'],
  ['comision', 'Otra comisión'],
]

const TEXTO_CATEGORIA_EQUIPO = Object.fromEntries(CATEGORIAS_EQUIPO)
const TIPOS_EVENTO = [
  ['actividad', 'Actividad'], ['reunion', 'Reunión'], ['curso', 'Curso'], ['publicacion', 'Publicación'],
  ['vencimiento', 'Vencimiento'], ['pago', 'Pago'], ['renovacion', 'Renovación'], ['tramite', 'Trámite'],
  ['certificacion', 'Certificación'], ['asamblea', 'Asamblea'],
]
const TEXTO_TIPO_EVENTO = Object.fromEntries(TIPOS_EVENTO)

const VISTAS_TRABAJO = {
  mias: { titulo: 'Mis pendientes', descripcion: 'Tareas, solicitudes y seguimientos que te corresponden.' },
  asignadas: { titulo: 'Asignadas por mí', descripcion: 'Tareas que creaste para otra persona y cuyo avance necesitás seguir.' },
  atrasadas: { titulo: 'Tareas atrasadas', descripcion: 'Revisá lo que venció y definí el próximo paso.' },
  proximas: { titulo: 'Tareas próximas', descripcion: 'Lo que necesita atención durante los próximos siete días.' },
  bloqueadas: { titulo: 'Tareas bloqueadas', descripcion: 'Asuntos que necesitan destrabar una decisión, recurso o respuesta.' },
  seguimiento: { titulo: 'Seguimientos pendientes', descripcion: 'Tareas cuya fecha de seguimiento ya llegó.' },
  'sin-responsable': { titulo: 'Tareas sin responsable', descripcion: 'Asigná una persona o equipo para que cada asunto tenga seguimiento.' },
  espera: { titulo: 'Esperando respuesta', descripcion: 'Tareas que dependen de una respuesta externa o interna.' },
  todas: { titulo: 'Todas las tareas abiertas', descripcion: 'Tareas, solicitudes y seguimientos que siguen en curso.' },
  cerradas: { titulo: 'Historial de tareas', descripcion: 'Tareas completadas o canceladas, con su fecha y el contexto del cierre.' },
}

export function textoAvisoManualTarea(tarea, enlace) {
  const nombre = String(tarea?.responsable_nombre || '').trim().split(/\s+/)[0]
  const saludo = nombre ? `Hola ${nombre}, t` : 'T'
  return `${saludo}enés una nueva tarea en Aletea: ${tarea?.titulo || 'Tarea pendiente'}. Abrir: ${enlace}`
}

export function textoResumenManualEquipo(equipo, tareas, enlace) {
  const abiertas = (tareas || []).filter((tarea) => !['completada', 'cancelada'].includes(tarea.estado))
  const muestra = abiertas.slice(0, 5).map((tarea) => tarea.titulo).join('; ')
  return `Aletea: ${equipo?.nombre || 'el equipo'} tiene ${abiertas.length} ${abiertas.length === 1 ? 'tarea abierta' : 'tareas abiertas'}${muestra ? `: ${muestra}` : ''}. Revisar: ${enlace}`
}

export function crearPantallaCMS(raiz, { sesion, alIrA, area = 'control', contexto = {}, alCambiarNotificaciones = () => {} }) {
  const enlaceA = (destino, etiqueta, clases = [], contextoDestino = {}) => enlaceBoton(
    etiqueta,
    rutaParaPantalla(destino, contextoDestino) || `#${destino}`,
    () => Object.keys(contextoDestino).length ? alIrA(destino, contextoDestino) : alIrA(destino),
    clases,
  )
  // El servidor reemplaza este valor al cargar. Mientras tanto no inferimos un
  // perfil restrictivo de una respuesta aún ausente, porque la autorización
  // efectiva siempre está en la API y la pantalla también se usa con fixtures.
  let datos = { alcance: { perfil: 'coordinacion', equipos: [], puede_gestionar: true }, tareas: [], metricasTareas: [], proyectos: [], equipos: [], responsables: [], responsabilidades: [], reuniones: [], decisiones: [], documentos: [], entradas: [], formularios: [], alianzas: [], programas: [], unidades: [], eventos: [], plantillas: [], riesgos: [], hitos: [], gastos: [], notificaciones: [], recurrencias: [], automatizaciones: [], alertasPospuestas: [], comunicados: [], conflictos: [], capacidad: [], solicitudesPrivacidad: [], finanzasFsb: null, revisionSemanal: null }
  let cargando = true
  let error = ''
  let formularioAbierto = null
  let tareaParaCompletar = null
  const claveSeccionesMoviles = `aletea:cms:secciones:${area}`
  let seccionesMovilesAbiertas = new Set()
  try {
    seccionesMovilesAbiertas = new Set(JSON.parse(window.sessionStorage.getItem(claveSeccionesMoviles) || '[]'))
  } catch { /* El estado de lectura es prescindible si el navegador lo bloquea. */ }

  function guardarSeccionesMoviles() {
    try { window.sessionStorage.setItem(claveSeccionesMoviles, JSON.stringify([...seccionesMovilesAbiertas])) } catch { /* Sin almacenamiento, la vista sigue siendo operativa. */ }
  }
  let equipoDeResponsabilidad = null
  let equipoAbiertoId = null
  let reunionDeDecision = null
  let reunionAEditar = null
  let reunionDeCierre = null
  let proyectoAEditar = null
  let unidadAEditar = null
  let unidadAbiertaId = contexto.unidadId || null
  let unidadTrabajoId = contexto.unidadId || null
  let pestanaUnidad = 'resumen'
  let proyectoDeRiesgo = null
  let proyectoDeSeguimiento = null
  let contextoProyecto = null
  let eventoAEditar = null
  let tareaAEditar = null
  let contextoTarea = null
  let tareaInicial = contexto.tareaId || null
  let actividadPreseleccionada = null
  let proyectoPreseleccionado = contexto.proyectoId || null
  let confirmacion = null
  let tipoNuevaTarea = 'tarea'
  let capturaOrientada = null
  let filtroTrabajo = contexto.filtroTrabajo || 'mias'
  let busquedaTrabajo = ''
  let busquedaGlobal = ''
  let vistaAgenda = 'mes'
  let filtroFormularios = 'todos'
  let busquedaFormularios = ''
  let vistaFormularios = 'formularios'
  let busquedaEntradas = ''
  let filtroEstadoEntradas = 'todas'
  let ordenEntradas = 'recientes'
  let entradaParaCumplir = null
  let entradaParaReabrir = null
  const puedeVerRespuestas = () => datos.alcance?.puede_ver_respuestas !== false
  let modeloRecurrente = null
  let guardando = false
  let filtroDocumentos = { texto: '', tipo: '', sensibilidad: '' }
  let mostrarResumenSemanal = false
  const claveRadarInstitucional = `aletea:radar-institucional:v1:${sesion?.usuario || sesion?.correo || 'cuenta'}`
  let radarInstitucionalAbierto = true
  try { radarInstitucionalAbierto = window.localStorage.getItem(claveRadarInstitucional) !== 'cerrado' } catch { /* El radar permanece abierto si no hay almacenamiento. */ }
  let formularioAEditar = null
  let formularioParaDuplicar = null
  let alianzaAEditar = null
  let programaAEditar = null
  let formularioParaRespuesta = null
  let equipoAEditar = null
  let usuarioCapacidad = null
  let solicitudPrivacidadActiva = null
  let formularioFinanzasFsb = null
  const clavePreferenciasFinanzasFsb = `aletea:finanzas-fsb:v1:${sesion?.usuario || sesion?.correo || 'cuenta'}`
  let preferenciasFinanzasFsb = { filtro: 'pendientes', grupo: 'todos', orden: 'prioridad', densidad: 'comoda' }
  try { preferenciasFinanzasFsb = { ...preferenciasFinanzasFsb, ...JSON.parse(window.localStorage.getItem(clavePreferenciasFinanzasFsb) || '{}') } } catch { /* Las preferencias son opcionales. */ }
  let filtroFinanzasFsb = preferenciasFinanzasFsb.filtro
  let busquedaFinanzasFsb = ''
  let cuentaFinanzasFsbAbierta = null
  let periodoEstadoFinanzasFsb = HOY().slice(0, 7)
  let actividadInstitucional = []
  let cargandoActividadInstitucional = false
  let errorActividadInstitucional = ''
  const claveGuiaInicial = `aletea:adopcion:v1:${sesion?.usuario || sesion?.correo || 'cuenta'}`
  let mostrarGuiaInicial = false
  let actualizandoEnSegundoPlano = false
  let destruida = false
  try { mostrarGuiaInicial = !window.localStorage.getItem(claveGuiaInicial) } catch { mostrarGuiaInicial = false }

  function guardarPreferenciasFinanzasFsb(cambios = {}) {
    preferenciasFinanzasFsb = { ...preferenciasFinanzasFsb, ...cambios }
    filtroFinanzasFsb = preferenciasFinanzasFsb.filtro
    try { window.localStorage.setItem(clavePreferenciasFinanzasFsb, JSON.stringify(preferenciasFinanzasFsb)) } catch { /* La pantalla sigue funcionando sin persistencia. */ }
  }

  function enlaceCompartido(destino, parametros = {}) {
    const url = new URL(window.location.href)
    if (usaRutasRealesGestor(url.hostname)) return new URL(rutaParaPantalla(destino, parametros), url.origin).href
    const consulta = new URLSearchParams(parametros)
    const textoConsulta = consulta.toString()
    url.hash = `${destino}${textoConsulta ? `?${textoConsulta}` : ''}`
    return url.href
  }

  async function copiarAvisoTarea(tarea) {
    const texto = textoAvisoManualTarea(tarea, enlaceCompartido('cms-trabajo', { tarea: tarea.id }))
    await navigator.clipboard.writeText(texto)
    try { await pedir('/api/cms/avisos-manuales', { method: 'POST', body: JSON.stringify({ tarea_id: tarea.id }) }) } catch { /* El texto ya está copiado. */ }
    confirmacion = { titulo: 'Aviso copiado', detalle: 'El mensaje está listo para pegar manualmente. El sistema no lo marcó como enviado ni leído.', acciones: [] }
    dibujar()
  }

  async function copiarResumenEquipo(equipo, tareas) {
    const texto = textoResumenManualEquipo(equipo, tareas, enlaceCompartido('cms-trabajo', { filtro: 'todas' }))
    await navigator.clipboard.writeText(texto)
    try { await pedir('/api/cms/avisos-manuales', { method: 'POST', body: JSON.stringify({ equipo_id: equipo.id }) }) } catch { /* El texto ya está copiado. */ }
    confirmacion = { titulo: 'Resumen del equipo copiado', detalle: 'Podés pegarlo en el canal que prefieras. El gestor solo registra que se preparó, no que se envió.', acciones: [] }
    dibujar()
  }

  function irA(destino, contextoDestino = {}) {
    alIrA(destino, contextoDestino)
  }

  function esVistaMovil() {
    return typeof window !== 'undefined' && window.matchMedia?.('(max-width: 899px)').matches
  }

  function panelPlegableMovil(titulo, descripcion, panel, abierto = false) {
    if (!esVistaMovil()) return panel
    const bloque = document.createElement('details')
    bloque.className = 'cms-seccion-movil'
    const clave = `${area}:${titulo}`
    bloque.open = abierto || seccionesMovilesAbiertas.has(clave)
    const resumen = elemento('summary', ['cms-seccion-movil-resumen'])
    const texto = elemento('span', [])
    texto.append(elemento('strong', [], titulo), elemento('small', [], descripcion))
    resumen.append(texto, icono('adelante'))
    bloque.append(resumen, panel)
    bloque.addEventListener('toggle', () => {
      if (bloque.open) seccionesMovilesAbiertas.add(clave)
      else seccionesMovilesAbiertas.delete(clave)
      guardarSeccionesMoviles()
    })
    return bloque
  }

  function agruparPaneles(...paneles) {
    const grupo = elemento('div', ['cms-paneles-agrupados'])
    grupo.append(...paneles)
    return grupo
  }

  function panelesSecundariosMovil(titulo, descripcion, ...paneles) {
    if (!esVistaMovil()) return paneles
    return [panelPlegableMovil(titulo, descripcion, agruparPaneles(...paneles))]
  }

  function conservarFormularioTrasFallo() {
    if (!error || !formularioAbierto) return false
    const forma = raiz.querySelector('form')
    if (!forma) return false
    guardando = false
    forma.querySelectorAll('button:disabled').forEach((control) => { control.disabled = false })
    let aviso = forma.querySelector('.cms-error-operacion')
    if (!aviso) {
      aviso = elemento('p', ['error-ajustes', 'cms-error-operacion'])
      aviso.setAttribute('role', 'alert')
      const acciones = forma.querySelector('.cms-captura-acciones')
      if (acciones) acciones.before(aviso)
      else forma.appendChild(aviso)
    }
    aviso.textContent = error
    error = ''
    return true
  }

  function destinoDeAlerta(alerta) {
    if (alerta.destino === 'riesgos') return { pantalla: 'cms-finanzas', etiqueta: 'Ver riesgos' }
    if (alerta.destino === 'agenda') return { pantalla: 'cms-agenda', etiqueta: 'Ver conflicto' }
    if (alerta.destino === 'reuniones') return { pantalla: 'cms-administracion', etiqueta: 'Ver reuniones' }
    if (alerta.destino === 'estructura') return { pantalla: 'cms-administracion', etiqueta: 'Ver estructura' }
    if (alerta.destino === 'eventos') return { pantalla: 'cms-agenda', etiqueta: 'Ver actividades' }
    const titulo = alerta.titulo.toLocaleLowerCase('es')
    if (titulo.startsWith('tarea bloqueada:')) return { pantalla: 'cms-trabajo', etiqueta: 'Ver tarea', contexto: { filtroTrabajo: 'bloqueadas' } }
    if (titulo.startsWith('tarea sin responsable:')) return { pantalla: 'cms-trabajo', etiqueta: 'Ver tarea', contexto: { filtroTrabajo: 'sin-responsable' } }
    if (titulo.startsWith('espera prolongada:')) return { pantalla: 'cms-trabajo', etiqueta: 'Ver tarea', contexto: { filtroTrabajo: 'espera' } }
    return { pantalla: 'cms-trabajo', etiqueta: 'Ver tarea', contexto: { filtroTrabajo: 'atrasadas' } }
  }

  function etiquetaPerfil() {
    return ({ administracion: 'Administración', direccion: 'Dirección', coordinacion: 'Coordinación', integrante: 'Integrante', consulta: 'Consulta' })[datos.alcance?.perfil] || 'Consulta'
  }

  function panelOrientacion() {
    const panel = elemento('section', ['cms-orientacion'])
    const esDireccion = ['direccion', 'administracion'].includes(datos.alcance?.perfil)
    const titulo = esDireccion ? 'Mirada institucional' : datos.alcance?.perfil === 'integrante' ? 'Tu próxima contribución' : 'Coordinación de esta semana'
    const texto = esDireccion
      ? 'Priorizá decisiones, riesgos y tareas sin responsable. Las áreas conservan sus tareas propias, pero esta vista muestra lo que puede afectar al conjunto.'
      : datos.alcance?.perfil === 'integrante'
        ? 'Empezá por tus tareas y la agenda. La información institucional restringida se mantiene fuera de esta vista.'
        : 'Ordená lo que vence, lo que espera una respuesta y lo que necesita una decisión antes del próximo encuentro.'
    panel.append(
      elemento('span', ['cms-panel-etiqueta'], `Vista para ${etiquetaPerfil()}`),
      elemento('h3', [], titulo),
      elemento('p', [], texto),
      boton('Cómo usar este panel', () => document.querySelector('.cms-ayuda-contextual')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), ['cms-orientacion-accion']),
    )
    return panel
  }

  function panelAyudaContextual() {
    const panel = elemento('section', ['cms-ayuda-contextual'])
    const pasos = elemento('ol', ['cms-ayuda-pasos'])
    ;[
      ['1', 'Decidir', 'Registrá acuerdos de reunión y definí responsable y próxima fecha.'],
      ['2', 'Hacer', 'Convertí el acuerdo en tarea dentro del equipo que lo va a ejecutar.'],
      ['3', 'Seguir', 'Usá agenda, alertas y el radar para revisar lo próximo antes de que venza.'],
    ].forEach(([numero, titulo, detalle]) => {
      const paso = elemento('li', [])
      paso.append(elemento('strong', [], `${numero}. ${titulo}`), elemento('span', [], detalle))
      pasos.appendChild(paso)
    })
    panel.append(elemento('h3', [], 'Cómo se organizan las tareas'), elemento('p', ['ayuda'], 'Un mismo recorrido para toda Aletea: información, decisión, tarea, responsable, fecha y seguimiento.'), pasos)
    return panel
  }

  async function cargar({ silencioso = false } = {}) {
    if (destruida || (silencioso && actualizandoEnSegundoPlano)) return
    if (silencioso) actualizandoEnSegundoPlano = true
    else { cargando = true; error = ''; dibujar() }
    try {
      datos = { ...datos, ...(await pedir('/api/cms/tablero')) }
      if (area === 'privacidad' && datos.alcance?.perfil === 'administracion' && datos.alcance?.nivel_datos_personales === 'sensible') {
        const respuestaPrivacidad = await pedir('/api/cms/solicitudes-privacidad')
        datos.solicitudesPrivacidad = respuestaPrivacidad.solicitudes || []
      } else if (area === 'privacidad') datos.solicitudesPrivacidad = []
      if (area === 'finanzas') {
        try { datos.finanzasFsb = await pedir('/api/cms/finanzas-fsb') }
        catch (fallo) { datos.finanzasFsb = { acceso: { puede_ver: false, puede_gestionar: false, ...(fallo.detalle?.acceso || {}) }, error: fallo.message, cuentas: [] } }
      }
      alCambiarNotificaciones(datos.notificaciones.filter((fila) => !fila.leida_en).length)
      if (tareaInicial) {
        const idInicial = tareaInicial
        tareaInicial = null
        contextoTarea = await pedir(`/api/cms/tareas/${idInicial}/contexto`)
        formularioAbierto = 'contexto-tarea'
      }
      if (datos.alcance?.perfil === 'administracion') await cargarActividadInstitucional()
      else actividadInstitucional = []
    } catch (fallo) {
      if (!silencioso) error = fallo.message
    } finally {
      cargando = false; guardando = false; actualizandoEnSegundoPlano = false
      if (!destruida) dibujar()
    }
  }

  async function recargarFinanzasFsb() {
    try {
      datos.finanzasFsb = await pedir('/api/cms/finanzas-fsb')
      error = ''
    } catch (fallo) {
      datos.finanzasFsb = { acceso: { puede_ver: false, puede_gestionar: false, ...(fallo.detalle?.acceso || {}) }, error: fallo.message, cuentas: [] }
    }
  }

  async function cargarActividadInstitucional() {
    cargandoActividadInstitucional = true
    errorActividadInstitucional = ''
    try {
      const respuesta = await pedir('/api/auditoria?limite=50')
      actividadInstitucional = Array.isArray(respuesta.actividad) ? respuesta.actividad : []
    } catch (fallo) {
      actividadInstitucional = []
      errorActividadInstitucional = fallo.message
    } finally {
      cargandoActividadInstitucional = false
    }
  }

  async function abrirSeguimientoProyecto(proyectoId) {
    proyectoDeSeguimiento = proyectoId
    contextoProyecto = null
    formularioAbierto = null
    dibujar()
    try { contextoProyecto = await pedir(`/api/cms/proyectos/${proyectoId}/contexto`) } catch (fallo) { error = fallo.message } finally { dibujar() }
  }

  async function abrirContextoTarea(tareaId) {
    contextoTarea = null
    formularioAbierto = 'contexto-tarea'
    dibujar()
    try { contextoTarea = await pedir(`/api/cms/tareas/${tareaId}/contexto`) } catch (fallo) { error = fallo.message } finally { dibujar() }
  }

  function panelConfirmacion() {
    if (!confirmacion) return document.createDocumentFragment()
    const panel = elemento('section', ['cms-confirmacion'])
    panel.setAttribute('role', 'status')
    const texto = elemento('div', [])
    texto.append(elemento('strong', [], confirmacion.titulo), elemento('p', [], confirmacion.detalle))
    const acciones = elemento('div', ['cms-confirmacion-acciones'])
    ;(confirmacion.acciones || []).forEach((accion) => acciones.appendChild(boton(accion.etiqueta, accion.alPulsar, accion.principal ? ['boton-principal'] : [])))
    acciones.appendChild(boton('Cerrar aviso', () => { confirmacion = null; dibujar() }))
    panel.append(texto, acciones)
    return panel
  }

  function formularioTarea(tarea = null) {
    const esIntegrante = datos.alcance?.perfil === 'integrante'
    const forma = document.createElement('form')
    forma.className = 'cms-captura'
    forma.appendChild(elemento('h3', [], tarea ? `Editar tarea: ${tarea.titulo}` : 'Nueva tarea'))
    const titulo = document.createElement('input')
    titulo.required = true; titulo.maxLength = 180; titulo.placeholder = 'Ej. Confirmar sala para el grupo de familias'
    titulo.setAttribute('aria-label', tarea ? 'Título de la tarea' : 'Nueva tarea'); titulo.value = tarea?.titulo || capturaOrientada?.texto || ''
    const descripcion = areaCms('Explicá qué hay que hacer, dónde está el material, a quién enviarlo y cuál es el resultado esperado.', 'Descripción de la tarea')
    descripcion.value = tarea?.descripcion || ''
    const guiaEntrega = elemento('section', ['cms-recursos-tarea'])
    const encabezadoRecursos = elemento('div', ['cms-recursos-tarea-encabezado'])
    encabezadoRecursos.append(
      elemento('h4', [], 'Instrucciones y materiales'),
      elemento('p', ['ayuda'], 'Todo lo que escribas o agregues acá queda dentro de la tarea. La persona responsable lo verá al abrir su enlace.'),
    )
    guiaEntrega.appendChild(encabezadoRecursos)
    const nombreRecurso = inputCms('Ej. Certificados en Canva', 'Nombre del material')
    const enlaceRecurso = inputCms('https://...', 'Enlace de Canva, Drive u otro material', 'url')
    const estadoRecurso = elemento('p', ['cms-recurso-tarea-estado'])
    estadoRecurso.setAttribute('role', 'status')
    const agregarRecurso = boton('Agregar enlace a la tarea', () => {
      try {
        descripcion.value = agregarRecursoADescripcion(descripcion.value, nombreRecurso.value, enlaceRecurso.value)
        nombreRecurso.value = ''; enlaceRecurso.value = ''; enlaceRecurso.setCustomValidity('')
        estadoRecurso.textContent = 'Enlace agregado. Quedará visible y se podrá abrir desde la tarea.'
      } catch (fallo) {
        enlaceRecurso.setCustomValidity(fallo.message)
        enlaceRecurso.reportValidity()
        enlaceRecurso.setAttribute('aria-invalid', 'true')
        estadoRecurso.textContent = fallo.message
        estadoRecurso.setAttribute('role', 'alert')
      }
    })
    const usarGuia = boton('Usar guía de entrega', () => {
      if (descripcion.value.trim()) return
      descripcion.value = 'Objetivo:\n\nPasos:\n1. \n\nMateriales:\n\nCorreo de entrega:\n\nResultado esperado:'
      descripcion.focus()
    })
    const camposRecurso = elemento('div', ['cms-recursos-tarea-campos'])
    camposRecurso.append(campoCms('Nombre del material', nombreRecurso), campoCms('Enlace', enlaceRecurso))
    const accionesRecurso = elemento('div', ['cms-recursos-tarea-acciones'])
    accionesRecurso.append(agregarRecurso, usarGuia)
    guiaEntrega.append(camposRecurso, accionesRecurso, estadoRecurso)
    const detalles = elemento('div', ['cms-captura-detalles'])
    const tipo = document.createElement('select')
    tipo.setAttribute('aria-label', 'Tipo')
    const tipos = [['tarea', 'Tarea'], ['directriz', 'Directriz'], ['solicitud', 'Solicitud'], ['seguimiento', 'Seguimiento'], ['nota', 'Nota']]
    tipos.forEach(([valor, texto]) => {
      const opcion = document.createElement('option'); opcion.value = valor; opcion.textContent = texto; tipo.appendChild(opcion)
    })
    tipo.value = tarea?.tipo || tipoNuevaTarea
    const prioridad = document.createElement('select')
    const prioridades = [['normal', 'Prioridad normal'], ['alta', 'Prioridad alta'], ['urgente', 'Urgente'], ['baja', 'Prioridad baja']]
    prioridades.forEach(([valor, texto]) => {
      const opcion = document.createElement('option'); opcion.value = valor; opcion.textContent = texto; prioridad.appendChild(opcion)
    })
    const fecha = inputCms('', 'Fecha límite', 'date'); if (!tarea) fecha.min = HOY(); fecha.value = tarea?.fecha_limite || ''
    const fechaSeguimiento = inputCms('', 'Próximo seguimiento', 'date'); fechaSeguimiento.value = tarea?.fecha_seguimiento || ''
    const esfuerzo = inputCms('Ej. 2', 'Esfuerzo estimado en horas', 'number'); esfuerzo.min = '0.25'; esfuerzo.max = '168'; esfuerzo.step = '0.25'; esfuerzo.value = tarea?.esfuerzo_horas ?? ''
    const equipo = selectorCms([['', 'Sin equipo'], ...datos.equipos.map((fila) => [fila.id, fila.nombre])], 'Equipo')
    const unidad = selectorCms([['', 'Sin unidad'], ...datos.unidades.map((fila) => [fila.id, `${fila.sigla ? `${fila.sigla}: ` : ''}${fila.nombre}`])], 'Programa o espacio de trabajo')
    const proyecto = selectorCms([['', 'Sin proyecto'], ...datos.proyectos.map((fila) => [fila.id, fila.titulo])], 'Proyecto')
    const actividad = selectorCms([['', 'Sin actividad relacionada'], ...datos.eventos.filter((fila) => fila.estado === 'planificado').map((fila) => [fila.id, `${fechaHoraProgramadaHumana(fila.fecha_hora)}: ${fila.titulo}`])], 'Actividad relacionada')
    const responsable = selectorCms([['', 'Sin responsable'], ...datos.responsables.map((fila) => [fila.correo, fila.nombre || fila.correo])], 'Responsable')
    const estado = selectorCms(OPCIONES_ESTADO_TAREA, 'Estado de la tarea')
    const equipoContextual = equipoFundacionalCms(datos.equipos, area)
    proyecto.value = tarea?.proyecto_id || proyectoPreseleccionado || ''
    const proyectoContextual = datos.proyectos.find((fila) => fila.id === proyecto.value)
    equipo.value = tarea?.equipo_id || capturaOrientada?.equipo_id || proyectoContextual?.equipo_id || equipoContextual?.id || ''; unidad.value = tarea?.unidad_id || capturaOrientada?.unidad_id || proyectoContextual?.unidad_id || ''; actividad.value = tarea?.evento_id || actividadPreseleccionada || ''; responsable.value = tarea?.responsable_correo || capturaOrientada?.responsable_correo || proyectoContextual?.responsable_correo || ''; prioridad.value = tarea?.prioridad || 'normal'; estado.value = tarea?.estado || 'pendiente'
    const aplicarContextoActividad = () => {
      if (tarea) return
      const evento = datos.eventos.find((fila) => fila.id === actividad.value)
      if (!evento) return
      if (!equipo.value) equipo.value = evento.equipo_id || ''
      if (!proyecto.value) proyecto.value = evento.proyecto_id || ''
      if (!responsable.value) responsable.value = evento.responsable_correo || ''
      if (!fecha.value) fecha.value = String(evento.fecha_hora || '').slice(0, 10)
    }
    actividad.addEventListener('change', aplicarContextoActividad)
    aplicarContextoActividad()
    detalles.append(
      campoCms('Tipo', tipo), campoCms('Estado', estado), campoCms('Prioridad', prioridad), campoCms('Fecha límite', fecha), campoCms('Próximo seguimiento', fechaSeguimiento),
      campoCms('Equipo', equipo), campoCms('Programa o espacio', unidad), campoCms('Proyecto', proyecto), campoCms('Actividad relacionada', actividad), campoCms('Responsable', responsable),
    )
    const datosAdicionales = elemento('details', ['cms-datos-adicionales'])
    datosAdicionales.open = tarea?.esfuerzo_horas !== null && tarea?.esfuerzo_horas !== undefined && tarea?.esfuerzo_horas !== ''
    const seguimientoPersonalCaja = elemento('label', ['cms-configurador-requerido'])
    const seguimientoPersonal = document.createElement('input'); seguimientoPersonal.type = 'checkbox'; seguimientoPersonal.checked = Boolean(tarea?.seguimiento_personal)
    seguimientoPersonalCaja.append(seguimientoPersonal, document.createTextNode(' Seguir personalmente'))
    const motivoSeguimiento = selectorCms([
      ['', 'Elegir motivo'], ['no_olvidar', 'No quiero olvidarlo'], ['esperando_respuesta', 'Estoy esperando una respuesta'],
      ['hablar_con_alguien', 'Tengo que hablar con alguien'], ['revisar_en_reunion', 'Revisar en una reunión'], ['requiere_decision', 'Requiere una decisión'],
    ], 'Motivo del seguimiento personal'); motivoSeguimiento.value = tarea?.motivo_seguimiento || ''; motivoSeguimiento.hidden = !seguimientoPersonal.checked
    seguimientoPersonal.addEventListener('change', () => { motivoSeguimiento.hidden = !seguimientoPersonal.checked; motivoSeguimiento.required = seguimientoPersonal.checked })
    datosAdicionales.open = datosAdicionales.open || seguimientoPersonal.checked
    datosAdicionales.append(
      elemento('summary', ['cms-datos-adicionales-titulo'], 'Datos adicionales'),
      elemento('div', ['cms-datos-adicionales-contenido'], campoCms('Esfuerzo estimado', esfuerzo, 'Horas de trabajo activo que probablemente requiere la tarea. No es el tiempo hasta la fecha límite.'), seguimientoPersonalCaja, motivoSeguimiento,
        elemento('p', ['ayuda'], 'El seguimiento personal aparece únicamente en tu resumen institucional. No crea otra tarea ni cambia la persona responsable.')),
    )
    const ayudaActividad = elemento('p', ['ayuda'], 'Al elegir una actividad, se propone su equipo, proyecto, responsable y fecha. Podés modificarlos si la tarea necesita otro contexto.')
    const ayudaSolicitud = elemento('p', ['ayuda'], 'La solicitud queda asignada al equipo elegido y registra quién la creó. Si no elegís responsable, se asigna primero a Coordinación, Referente o Sustitución del equipo. Si no hay esos roles, se asigna a un integrante activo. Después se sigue como una tarea normal.')
    const actualizarSolicitud = () => {
      const esSolicitud = tipo.value === 'solicitud'
      equipo.required = esSolicitud
      ayudaSolicitud.hidden = !esSolicitud
    }
    tipo.addEventListener('change', actualizarSolicitud)
    actualizarSolicitud()
    if (esIntegrante) {
      ;[titulo, descripcion, nombreRecurso, enlaceRecurso, agregarRecurso, usarGuia, tipo, prioridad, esfuerzo, fecha, equipo, unidad, proyecto, actividad, responsable].forEach((control) => { control.disabled = true })
    }
    const acciones = elemento('div', ['cms-captura-acciones'])
    const cancelar = boton('Cancelar', () => { formularioAbierto = null; tareaAEditar = null; actividadPreseleccionada = null; capturaOrientada = null; tipoNuevaTarea = 'tarea'; dibujar() })
    const guardar = boton(tarea ? 'Guardar tarea' : 'Agregar', async () => {
      if (!forma.reportValidity() || guardando) return
      if (enlaceRecurso.value.trim()) {
        try { descripcion.value = agregarRecursoADescripcion(descripcion.value, nombreRecurso.value, enlaceRecurso.value) } catch (fallo) {
          enlaceRecurso.setCustomValidity(fallo.message); enlaceRecurso.reportValidity(); return
        }
      }
      guardando = true; guardar.disabled = true
      try {
        const cuerpo = esIntegrante
          ? { estado: estado.value, fecha_seguimiento: fechaSeguimiento.value || null }
          : { titulo: titulo.value, descripcion: descripcion.value, tipo: tipo.value, estado: estado.value, prioridad: prioridad.value, esfuerzo_horas: esfuerzo.value, fecha_limite: fecha.value || null, fecha_seguimiento: fechaSeguimiento.value || null, equipo_id: equipo.value || null, unidad_id: unidad.value || null, proyecto_id: proyecto.value || null, evento_id: actividad.value || null, responsable_correo: responsable.value || null, seguimiento_personal: seguimientoPersonal.checked, motivo_seguimiento: seguimientoPersonal.checked ? motivoSeguimiento.value : '' }
        const respuesta = await pedir(tarea ? `/api/cms/tareas/${tarea.id}` : '/api/cms/tareas', { method: tarea ? 'PATCH' : 'POST', body: JSON.stringify(cuerpo) })
        formularioAbierto = null; tareaAEditar = null; actividadPreseleccionada = null; capturaOrientada = null; tipoNuevaTarea = 'tarea'
        await cargar()
        if (!tarea) confirmacion = {
          titulo: 'Tarea creada',
          detalle: responsable.value ? `Quedó asignada a ${datos.responsables.find((fila) => fila.correo === responsable.value)?.nombre || responsable.value}. La persona la verá en su bandeja interna.` : 'Quedó registrada en la bandeja interna. Podés asignarle una persona desde la tarea.',
          acciones: [{ etiqueta: 'Abrir tarea', principal: true, alPulsar: () => abrirContextoTarea(respuesta.tarea.id) }],
        }
        proyectoPreseleccionado = null
        dibujar()
      } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
    }, ['boton-principal'])
    guardar.type = 'submit'
    acciones.append(cancelar, guardar)
    forma.append(titulo, descripcion, guiaEntrega, detalles, datosAdicionales, ayudaActividad, ayudaSolicitud, acciones)
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); guardar.click() })
    return forma
  }

  function formularioTareaRecurrente() {
    const forma = document.createElement('form')
    forma.className = 'cms-captura cms-captura-recurrente'
    forma.appendChild(elemento('h3', [], 'Nueva tarea recurrente'))
    const titulo = document.createElement('input')
    titulo.required = true; titulo.maxLength = 180; titulo.placeholder = 'Ej. Revisar agenda y avisos de la semana'; titulo.value = modeloRecurrente?.titulo || ''
    titulo.setAttribute('aria-label', 'Título de tarea recurrente')
    const descripcion = areaCms('Contexto o criterio de cierre', 'Descripción de tarea recurrente'); descripcion.value = modeloRecurrente?.descripcion || ''
    const frecuencia = selectorCms([['semanal', 'Semanal'], ['mensual', 'Mensual']], 'Frecuencia de tarea recurrente')
    frecuencia.value = modeloRecurrente?.frecuencia || 'semanal'
    const prioridad = selectorCms([['normal', 'Prioridad normal'], ['alta', 'Prioridad alta'], ['urgente', 'Urgente'], ['baja', 'Prioridad baja']], 'Prioridad de tarea recurrente'); prioridad.value = modeloRecurrente?.prioridad || 'normal'
    const fecha = inputCms('', 'Próxima fecha de tarea recurrente', 'date'); fecha.required = true; fecha.value = HOY()
    const equipo = selectorCms([['', 'Sin equipo'], ...datos.equipos.map((fila) => [fila.id, fila.nombre])], 'Equipo de tarea recurrente')
    const proyecto = selectorCms([['', 'Sin proyecto'], ...datos.proyectos.map((fila) => [fila.id, fila.titulo])], 'Proyecto de tarea recurrente')
    const responsable = selectorCms([['', 'Sin responsable'], ...datos.responsables.map((fila) => [fila.correo, fila.nombre || fila.correo])], 'Responsable de tarea recurrente')
    const detalles = elemento('div', ['cms-captura-detalles'])
    detalles.append(campoCms('Frecuencia', frecuencia), campoCms('Prioridad', prioridad), campoCms('Próxima fecha', fecha), campoCms('Equipo', equipo), campoCms('Proyecto', proyecto), campoCms('Responsable', responsable))
    const acciones = elemento('div', ['cms-captura-acciones'])
    const cancelar = boton('Cancelar', () => { formularioAbierto = null; modeloRecurrente = null; dibujar() })
    const guardar = boton('Crear tarea recurrente', async () => {
      if (!forma.reportValidity() || guardando) return
      guardando = true; guardar.disabled = true
      try {
        await pedir('/api/cms/tareas-recurrentes', { method: 'POST', body: JSON.stringify({ titulo: titulo.value, descripcion: descripcion.value, frecuencia: frecuencia.value, prioridad: prioridad.value, proxima_fecha: fecha.value, equipo_id: equipo.value || null, proyecto_id: proyecto.value || null, responsable_correo: responsable.value || null }) })
        formularioAbierto = null; modeloRecurrente = null; await cargar()
      } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
    }, ['boton-principal'])
    guardar.type = 'submit'; acciones.append(cancelar, guardar)
    forma.append(titulo, descripcion, detalles, elemento('p', ['ayuda'], 'La automatización interna crea la tarea cuando llegue su fecha. Si necesitás adelantarla, podés generarla desde la rutina.'), acciones)
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); guardar.click() })
    return forma
  }

  function filaTarea(tarea) {
    const estado = clasificarTarea(tarea)
    const fila = elemento('article', ['cms-tarea', `cms-tarea-${estado}`])
    const encabezado = elemento('div', ['cms-tarea-encabezado'])
    encabezado.append(
      elemento('strong', [], tarea.titulo),
      elemento('span', ['cms-estado'], TEXTO_ESTADO[estado]),
    )
    const meta = [
      tarea.proyecto_titulo,
      tarea.evento_titulo ? `Actividad: ${tarea.evento_titulo}` : '',
      tarea.equipo_nombre,
      tarea.responsable_nombre ?? (tarea.responsable_correo ? tarea.responsable_correo : 'Sin responsable'),
      tarea.tipo === 'solicitud' ? `Solicita ${tarea.solicitante_nombre ?? tarea.solicitante_correo ?? 'equipo'}` : '',
      tarea.esfuerzo_horas ? `${Number(tarea.esfuerzo_horas).toLocaleString('es-UY')} h estimadas` : '',
      fechaHumana(tarea.fecha_limite),
      tarea.fecha_seguimiento ? `Seguimiento ${fechaHumana(tarea.fecha_seguimiento)}` : '',
      tarea.completado_en ? `Completada ${fechaHoraHumana(tarea.completado_en)}` : '',
      ['completada', 'cancelada'].includes(tarea.estado) && Number(tarea.comentarios_total || 0) ? `${tarea.comentarios_total} comentario${Number(tarea.comentarios_total) === 1 ? '' : 's'} de seguimiento` : '',
      Number(tarea.dependencias_pendientes || 0) ? `${tarea.dependencias_pendientes} dependencia${Number(tarea.dependencias_pendientes) === 1 ? '' : 's'} pendiente${Number(tarea.dependencias_pendientes) === 1 ? '' : 's'}` : '',
    ].filter(Boolean).join(' · ')
    const acciones = elemento('div', ['cms-tarea-acciones'])
    if (!['completada', 'cancelada'].includes(tarea.estado) && (datos.alcance?.puede_gestionar || datos.alcance?.perfil === 'integrante')) {
      acciones.appendChild(boton('Completar tarea', () => { tareaParaCompletar = tarea.id; formularioAbierto = 'completar-tarea'; dibujar() }))
    }
    if (['completada', 'cancelada'].includes(tarea.estado) && datos.alcance?.puede_gestionar) {
      acciones.appendChild(boton('Reabrir tarea', async () => {
        if (guardando) return
        guardando = true
        try {
          await pedir(`/api/cms/tareas/${tarea.id}`, { method: 'PATCH', body: JSON.stringify({ estado: 'pendiente' }) })
          confirmacion = { titulo: 'Tarea reabierta', detalle: 'Volvió a la bandeja de trabajo. El cierre anterior y sus comentarios siguen disponibles en el historial.', acciones: [] }
          await cargar()
        } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
      }))
    }
    if (datos.alcance?.puede_gestionar || datos.alcance?.perfil === 'integrante') acciones.appendChild(boton('Editar tarea', () => { tareaAEditar = tarea.id; formularioAbierto = 'editar-tarea'; dibujar() }))
    acciones.appendChild(boton('Abrir tarea', () => abrirContextoTarea(tarea.id)))
    if (datos.alcance?.puede_gestionar && tarea.responsable_correo) acciones.appendChild(boton('Copiar aviso', async () => {
      try { await copiarAvisoTarea(tarea) } catch { error = 'No se pudo copiar el aviso. Revisá el permiso del navegador.'; dibujar() }
    }))
    fila.append(
      encabezado,
      requiereSeguimiento(tarea, HOY()) ? elemento('span', ['cms-alerta-seguimiento'], 'Seguimiento pendiente') : document.createDocumentFragment(),
      elemento('span', ['cms-tarea-meta'], meta), tarea.descripcion ? contenidoConEnlaces(tarea.descripcion, 'cms-tarea-descripcion') : document.createDocumentFragment(), acciones,
    )
    return fila
  }

  function formularioCompletarTarea() {
    const tarea = datos.tareas.find((fila) => fila.id === tareaParaCompletar)
    if (!tarea) return null
    const forma = elemento('form', ['cms-formulario', 'cms-formulario-completar'])
    const comentario = areaCms('Qué se hizo, qué resultado quedó o qué debería saber quien asignó la tarea.', 'Comentario de cierre opcional')
    const acciones = elemento('div', ['cms-formulario-acciones'])
    const cancelar = boton('Cancelar', () => { formularioAbierto = null; tareaParaCompletar = null; dibujar() })
    cancelar.type = 'button'
    const completar = boton('Completar tarea', async () => {
      if (guardando) return
      guardando = true
      try {
        await pedir(`/api/cms/tareas/${tarea.id}`, { method: 'PATCH', body: JSON.stringify({ estado: 'completada', comentario_cierre: comentario.value }) })
        formularioAbierto = null; tareaParaCompletar = null
        await cargar()
      } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
    }, ['boton-principal'])
    completar.type = 'submit'
    acciones.append(cancelar, completar)
    forma.append(
      elemento('span', ['cms-panel-etiqueta'], 'CIERRE DE TAREA'),
      elemento('h3', [], `Completar: ${tarea.titulo}`),
      elemento('p', ['ayuda'], 'El comentario es opcional. Si agregás contexto, quedará en la conversación con tu nombre y la fecha.'),
      campoCms('Comentario de cierre', comentario),
      acciones,
    )
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); completar.click() })
    return forma
  }

  function panelDirectrices() {
    const directrices = datos.tareas.filter((tarea) => tarea.tipo === 'directriz' && !['completada', 'cancelada'].includes(tarea.estado))
    const seccion = elemento('section', ['cms-directrices'])
    const encabezado = elemento('div', ['cms-seccion-encabezado'])
    const texto = elemento('div', [])
    texto.append(
      elemento('h3', [], 'Directrices vigentes'),
      elemento('p', ['ayuda'], 'Decisiones de Dirección que siguen activas. Quedan a la vista hasta que se completen o cancelen.'),
    )
    encabezado.appendChild(texto)
    if (datos.alcance?.puede_gestionar) encabezado.appendChild(boton('Nueva directriz', () => { tipoNuevaTarea = 'directriz'; formularioAbierto = 'tarea'; dibujar() }, ['boton-principal']))
    const lista = elemento('div', ['cms-directrices-lista'])
    if (directrices.length) lista.append(...directrices.map(filaTarea))
    else lista.appendChild(elemento('p', ['ayuda'], 'No hay directrices institucionales vigentes.'))
    seccion.append(encabezado, lista)
    return seccion
  }

  function panelContextoTarea() {
    if (!contextoTarea) {
      const cargandoContexto = elemento('section', ['cms-captura'])
      cargandoContexto.appendChild(elemento('p', ['ayuda'], 'Cargando el seguimiento de la tarea...'))
      return cargandoContexto
    }
    const { tarea, dependencias = [], dependientes = [], comentarios = [] } = contextoTarea
    const seccion = elemento('section', ['cms-captura', 'cms-contexto-tarea'])
    const encabezado = elemento('div', ['cms-seccion-encabezado'])
    const textoEncabezado = elemento('div', [])
    textoEncabezado.append(elemento('h3', [], tarea.titulo), elemento('p', ['ayuda'], 'Dependencias, conversación y próximos pasos de una sola tarea.'))
    const accionesEncabezado = elemento('div', ['cms-reunion-acciones'])
    if (tarea.responsable_correo) accionesEncabezado.appendChild(boton('Copiar aviso', async () => {
      try { await copiarAvisoTarea(tarea) } catch { error = 'No se pudo copiar el aviso. Revisá el permiso del navegador.'; dibujar() }
    }))
    accionesEncabezado.appendChild(boton('Cerrar', () => { formularioAbierto = null; contextoTarea = null; dibujar() }))
    encabezado.append(textoEncabezado, accionesEncabezado)
    if (contextoTarea.contenido_protegido) {
      const aviso = crearPanelRequisitosAcceso({
        requisitos: [requisitoDatosPersonales('ninguno', 'operativo')],
        titulo: 'Contenido protegido',
        descripcion: 'Esta tarea nació de una entrada institucional. El acceso se habilita por separado para proteger a las personas.',
        seccion: 'el seguimiento de la tarea', regreso: 'cms-trabajo', sesion: { ...sesion, perfil_acceso: sesion?.perfil_acceso || datos.alcance?.perfil }, alIrA,
      })
      seccion.append(encabezado, aviso)
      return seccion
    }
    const bloquePrincipal = elemento('section', ['cms-tarea-contexto-principal'])
    bloquePrincipal.append(
      elemento('h4', [], 'Qué hay que hacer'),
      tarea.descripcion
        ? contenidoConEnlaces(tarea.descripcion, 'cms-tarea-contexto-descripcion')
        : elemento('p', ['ayuda'], 'Esta tarea todavía no tiene instrucciones. Editala para agregar pasos, materiales, correo de entrega y resultado esperado.'),
    )
    const contextoMeta = [
      tarea.responsable_nombre || tarea.responsable_correo ? `Responsable: ${tarea.responsable_nombre || tarea.responsable_correo}` : 'Sin responsable',
      tarea.fecha_limite ? `Fecha límite: ${fechaHumana(tarea.fecha_limite)}` : 'Sin fecha límite',
      tarea.proyecto_titulo ? `Proyecto: ${tarea.proyecto_titulo}` : '',
      tarea.evento_titulo ? `Actividad: ${tarea.evento_titulo}` : '',
    ].filter(Boolean)
    bloquePrincipal.appendChild(elemento('p', ['cms-tarea-contexto-meta'], contextoMeta.join(' · ')))
    const bloqueDependencias = elemento('section', ['cms-seguimiento-lista'])
    bloqueDependencias.appendChild(elemento('h4', [], 'Espera a'))
    if (dependencias.length) dependencias.forEach((previa) => {
      const fila = elemento('article', ['cms-seguimiento-item'])
      const acciones = elemento('div', ['cms-reunion-acciones'])
      acciones.appendChild(boton('Quitar dependencia', async () => {
        if (guardando) return; guardando = true
        try { await pedir(`/api/cms/tareas/${tarea.id}/dependencias/${previa.id}`, { method: 'DELETE' }); await abrirContextoTarea(tarea.id); await cargar() } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
      }))
      fila.append(elemento('strong', [], previa.titulo), elemento('span', ['cms-proyecto-meta'], `${previa.estado} · ${previa.responsable_nombre || 'Sin responsable'}`), acciones); bloqueDependencias.appendChild(fila)
    })
    else bloqueDependencias.appendChild(elemento('p', ['ayuda'], 'Esta tarea no espera otra tarea.'))
    const candidatas = datos.tareas.filter((fila) => fila.id !== tarea.id && !['completada', 'cancelada'].includes(fila.estado) && !dependencias.some((previa) => previa.id === fila.id))
    const selector = selectorCms([['', 'Agregar una tarea previa'], ...candidatas.map((fila) => [fila.id, fila.titulo])], 'Agregar dependencia')
    bloqueDependencias.append(selector, boton('Agregar dependencia', async () => {
      if (!selector.value || guardando) return
      guardando = true
      try { await pedir(`/api/cms/tareas/${tarea.id}/dependencias`, { method: 'POST', body: JSON.stringify({ depende_de_id: selector.value }) }); await abrirContextoTarea(tarea.id); await cargar() } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
    }))
    const bloqueDependientes = elemento('section', ['cms-seguimiento-lista'])
    bloqueDependientes.appendChild(elemento('h4', [], 'Desbloquea'))
    if (dependientes.length) dependientes.forEach((fila) => {
      const item = elemento('article', ['cms-seguimiento-item'])
      item.append(elemento('strong', [], fila.titulo), elemento('span', ['cms-proyecto-meta'], `${fila.estado} · ${fila.responsable_nombre || 'Sin responsable'}`))
      bloqueDependientes.appendChild(item)
    })
    else bloqueDependientes.appendChild(elemento('p', ['ayuda'], 'No hay tareas que dependan de esta.'))
    const bloqueComentarios = elemento('section', ['cms-seguimiento-lista'])
    bloqueComentarios.appendChild(elemento('h4', [], 'Conversación'))
    const comentario = areaCms('Dejá una actualización, acuerdo o bloqueo.', 'Nuevo comentario')
    bloqueComentarios.append(comentario, boton('Agregar comentario', async () => {
      if (!comentario.value.trim() || guardando) return
      guardando = true
      try { await pedir(`/api/cms/tareas/${tarea.id}/comentarios`, { method: 'POST', body: JSON.stringify({ contenido: comentario.value }) }); await abrirContextoTarea(tarea.id); await cargar() } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
    }))
    if (comentarios.length) comentarios.forEach((fila) => {
      const item = elemento('article', ['cms-seguimiento-item'])
      item.append(elemento('strong', [], fila.creador_nombre || fila.creado_por), elemento('span', ['cms-proyecto-meta'], fechaHoraHumana(fila.creado_en)), elemento('span', ['cms-proyecto-notas'], fila.contenido))
      bloqueComentarios.appendChild(item)
    })
    else bloqueComentarios.appendChild(elemento('p', ['ayuda'], 'Todavía no hay actualizaciones escritas.'))
    seccion.append(encabezado, bloquePrincipal, bloqueDependencias, bloqueDependientes, bloqueComentarios)
    return seccion
  }

  function inputCms(placeholder, etiqueta, tipo = 'text') {
    if (tipo === 'date' || tipo === 'datetime-local') {
      const esFechaHora = tipo === 'datetime-local'
      const selector = crearSelectorFecha({ clave: `cms-${etiqueta.toLocaleLowerCase('es').replaceAll(/[^a-z0-9]+/g, '-')}`, rotulo: etiqueta, mostrarRotulo: !esFechaHora })
      const limites = { minimo: '', maximo: '' }
      const control = esFechaHora ? elemento('label', ['cms-campo', 'cms-fecha-hora-campo']) : selector.campo
      const fechaHora = esFechaHora ? elemento('div', ['cms-fecha-hora']) : null
      const hora = esFechaHora ? document.createElement('input') : null
      if (hora) {
        hora.type = 'time'
        hora.setAttribute('aria-label', `Hora de ${etiqueta}`)
        fechaHora.append(selector.campo, hora)
        control.append(elemento('span', [], etiqueta), fechaHora)
      }
      Object.defineProperties(control, {
        value: {
          get: () => tipo === 'datetime-local'
            ? (selector.entrada.value ? `${selector.entrada.value}T${hora.value || '00:00'}` : '')
            : selector.entrada.value,
          set: (valor) => {
            if (tipo !== 'datetime-local') { selector.fijarValor(valor); return }
            const [fecha = '', tiempo = ''] = valorFechaHoraLocal(valor).split('T')
            selector.fijarValor(fecha)
            hora.value = tiempo.slice(0, 5)
          },
        },
        required: { get: () => selector.entrada.required, set: (valor) => { selector.entrada.required = Boolean(valor); if (hora) hora.required = Boolean(valor) } },
        min: { get: () => limites.minimo, set: (valor) => { limites.minimo = valor; selector.fijarLimites(limites) } },
        max: { get: () => limites.maximo, set: (valor) => { limites.maximo = valor; selector.fijarLimites(limites) } },
        disabled: { get: () => selector.disparador.disabled, set: (valor) => { selector.establecerActivo(!valor); if (hora) hora.disabled = Boolean(valor) } },
      })
      control.dataset.selectorCms = esFechaHora ? 'fecha-hora' : 'fecha'
      return control
    }
    const input = document.createElement('input')
    input.type = tipo; input.placeholder = placeholder; input.setAttribute('aria-label', etiqueta)
    if (tipo === 'url') { input.inputMode = 'url'; asistirPegadoEnlace(input) }
    return input
  }

  function areaCms(placeholder, etiqueta) {
    const area = document.createElement('textarea')
    area.placeholder = placeholder; area.rows = 4; area.maxLength = 4000; area.setAttribute('aria-label', etiqueta)
    return area
  }

  function campoCms(etiqueta, control, ayuda = '') {
    const campo = elemento('label', ['cms-campo'])
    campo.append(elemento('span', [], etiqueta), control)
    if (ayuda) campo.append(elemento('small', ['cms-ayuda-campo'], ayuda))
    return campo
  }

  function iconoDeCampo(etiqueta) {
    const texto = etiqueta.toLocaleLowerCase('es')
    if (texto.includes('fecha') || texto.includes('inicio') || texto.includes('final')) return 'agenda'
    if (texto.includes('equipo') || texto.includes('responsable') || texto.includes('persona')) return 'personas'
    if (texto.includes('proyecto') || texto.includes('actividad') || texto.includes('tipo')) return 'tablero'
    if (texto.includes('presupuesto') || texto.includes('monto') || texto.includes('gasto')) return 'reporte'
    if (texto.includes('prioridad') || texto.includes('estado')) return 'verificar'
    if (texto.includes('lugar')) return 'casa'
    return 'planilla'
  }

  function agregarIconoARotulo(rotulo, etiqueta) {
    if (!rotulo || rotulo.dataset.iconoCampo) return
    rotulo.dataset.iconoCampo = 'true'
    rotulo.classList.add('cms-rotulo-con-icono')
    rotulo.insertBefore(icono(iconoDeCampo(etiqueta)), rotulo.firstChild)
  }

  function identificarCamposCaptura(panel) {
    panel.querySelectorAll('.cms-campo > span, .selector-fecha > .campo-rotulo').forEach((rotulo) => {
      agregarIconoARotulo(rotulo, rotulo.textContent.trim())
    })
    panel.querySelectorAll('input:not(.selector-fecha-entrada), select, textarea').forEach((control) => {
      if (control.closest('.cms-campo, .selector-fecha')) return
      const etiqueta = control.getAttribute('aria-label') || control.placeholder
      if (!etiqueta || control.dataset.campoIdentificado) return
      control.dataset.campoIdentificado = 'true'
      const grupo = elemento('label', ['cms-campo', 'cms-campo-con-icono'])
      const rotulo = elemento('span', [], etiqueta)
      agregarIconoARotulo(rotulo, etiqueta)
      control.replaceWith(grupo)
      grupo.append(rotulo, control)
      const sincronizarVisibilidad = () => { grupo.hidden = control.hidden }
      new MutationObserver(sincronizarVisibilidad).observe(control, { attributes: true, attributeFilter: ['hidden'] })
      sincronizarVisibilidad()
    })
  }

  function accionesFormulario(alGuardar, etiqueta) {
    const acciones = elemento('div', ['cms-captura-acciones'])
    acciones.append(
      boton('Cancelar', () => { formularioAbierto = null; equipoDeResponsabilidad = null; equipoAEditar = null; reunionDeDecision = null; reunionAEditar = null; proyectoAEditar = null; eventoAEditar = null; tareaAEditar = null; alianzaAEditar = null; programaAEditar = null; capturaOrientada = null; tipoNuevaTarea = 'tarea'; dibujar() }),
      boton(etiqueta, alGuardar, ['boton-principal']),
    )
    return acciones
  }

  function formularioEquipo(equipo = null) {
    const forma = document.createElement('form')
    forma.className = 'cms-captura cms-captura-equipo'
    const nombre = inputCms('Ej. Familias y comunidad', 'Nombre del equipo')
    nombre.required = true; nombre.maxLength = 90; nombre.value = equipo?.nombre || ''
    const categoria = selectorCms(CATEGORIAS_EQUIPO, 'Categoría institucional')
    categoria.value = equipo?.categoria || 'equipo'
    const descripcion = inputCms('Propósito breve del equipo', 'Propósito del equipo')
    descripcion.maxLength = 400; descripcion.value = equipo?.descripcion || ''
    const color = selectorCms([['#6d3087', 'Violeta'], ['#0b806f', 'Turquesa'], ['#c91870', 'Magenta'], ['#3d82c6', 'Azul'], ['#b35f14', 'Ámbar']], 'Color del equipo')
    color.value = equipo?.color || '#6d3087'
    const decisiones = areaCms('Qué puede resolver el equipo sin escalar', 'Decisiones permitidas del equipo'); decisiones.rows = 3; decisiones.value = equipo?.decisiones_permitidas || ''
    const escalar = areaCms('Qué debe consultar o escalar a Dirección', 'Situaciones a escalar del equipo'); escalar.rows = 3; escalar.value = equipo?.debe_escalar || ''
    const informaA = inputCms('Ej. Dirección ejecutiva', 'A quién informa el equipo'); informaA.maxLength = 240; informaA.value = equipo?.informa_a || ''
    const frecuencia = selectorCms([['semanal', 'Semanal'], ['quincenal', 'Quincenal'], ['mensual', 'Mensual'], ['segun_necesidad', 'Según necesidad']], 'Frecuencia de reunión del equipo')
    frecuencia.value = equipo?.frecuencia_reunion || 'segun_necesidad'
    const operacion = elemento('div', ['cms-captura-detalles'])
    operacion.append(campoCms('Categoría institucional', categoria), campoCms('Informa a', informaA), campoCms('Frecuencia de reunión', frecuencia))
    forma.append(elemento('h3', [], equipo ? `Mapa operativo: ${equipo.nombre}` : 'Nuevo equipo o comisión'), nombre, descripcion, color, decisiones, escalar, operacion, accionesFormulario(() => {
      if (!forma.reportValidity() || guardando) return
      guardando = true
      pedir(equipo ? `/api/cms/equipos/${equipo.id}` : '/api/cms/equipos', { method: equipo ? 'PATCH' : 'POST', body: JSON.stringify({ nombre: nombre.value, categoria: categoria.value, descripcion: descripcion.value, color: color.value, decisiones_permitidas: decisiones.value, debe_escalar: escalar.value, informa_a: informaA.value, frecuencia_reunion: frecuencia.value }) })
        .then(() => { formularioAbierto = null; equipoAEditar = null; return cargar() })
        .catch((fallo) => { error = fallo.message; guardando = false; dibujar() })
    }, equipo ? 'Guardar mapa operativo' : 'Crear equipo'))
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); forma.querySelector('.boton-principal').click() })
    return forma
  }

  function formularioProyecto(proyecto = null) {
    const forma = document.createElement('form')
    forma.className = 'cms-captura cms-captura-proyecto'
    const titulo = inputCms('Ej. Escuela de familias 2026', 'Nombre del proyecto'); titulo.required = true; titulo.maxLength = 180; titulo.value = proyecto?.titulo || capturaOrientada?.texto || ''
    const objetivo = inputCms('Qué busca lograr este proyecto', 'Objetivo del proyecto')
    objetivo.maxLength = 400; objetivo.value = proyecto?.objetivo || ''
    const detalles = elemento('div', ['cms-captura-detalles'])
    const programa = selectorCms([['', 'Sin programa'], ...datos.programas.map((fila) => [fila.id, fila.nombre])], 'Programa del proyecto')
    const equipo = selectorCms([['', 'Sin equipo'], ...datos.equipos.map((fila) => [fila.id, fila.nombre])], 'Equipo del proyecto')
    const unidad = selectorCms([['', 'Sin unidad operativa'], ...datos.unidades.map((fila) => [fila.id, `${fila.sigla ? `${fila.sigla}: ` : ''}${fila.nombre}`])], 'Programa o espacio de trabajo')
    const responsable = selectorCms([['', 'Sin responsable'], ...datos.responsables.map((fila) => [fila.correo, fila.nombre || fila.correo])], 'Responsable del proyecto')
    const prioridad = selectorCms([['normal', 'Prioridad normal'], ['alta', 'Prioridad alta'], ['urgente', 'Urgente'], ['baja', 'Prioridad baja']], 'Prioridad del proyecto')
    const estado = selectorCms([['borrador', 'Borrador'], ['en_marcha', 'En marcha'], ['en_pausa', 'En pausa'], ['cerrado', 'Cerrado']], 'Estado del proyecto')
    const fechaInicio = inputCms('', 'Fecha de inicio', 'date')
    const fechaFin = inputCms('', 'Fecha objetivo', 'date')
    const presupuesto = inputCms('Presupuesto estimado en UYU', 'Presupuesto del proyecto', 'number'); presupuesto.min = '0'; presupuesto.step = '1'
    const notas = areaCms('Riesgos, dependencias o próximos hitos', 'Notas del proyecto')
    const equipoContextual = equipoFundacionalCms(datos.equipos, area)
    programa.value = proyecto?.programa_id || ''; equipo.value = proyecto?.equipo_id || capturaOrientada?.equipo_id || equipoContextual?.id || ''; unidad.value = proyecto?.unidad_id || ''; responsable.value = proyecto?.responsable_correo || capturaOrientada?.responsable_correo || ''; prioridad.value = proyecto?.prioridad || 'normal'; estado.value = proyecto?.estado || 'en_marcha'; fechaInicio.value = valorFechaLocal(proyecto?.fecha_inicio); fechaFin.value = valorFechaLocal(proyecto?.fecha_fin); presupuesto.value = proyecto?.presupuesto ?? ''; notas.value = proyecto?.notas || ''
    detalles.append(campoCms('Programa anterior', programa, 'Se conserva para los proyectos existentes durante la migración.'), campoCms('Programa o espacio', unidad, 'La unidad estable donde vive el proyecto.'), equipo, responsable, estado, prioridad, fechaInicio, fechaFin, presupuesto)
    forma.append(elemento('h3', [], proyecto ? `Editar proyecto: ${proyecto.titulo}` : 'Nuevo proyecto'), titulo, objetivo, detalles, elemento('label', ['cms-etiqueta-campo'], 'Notas y próximos hitos'), notas, accionesFormulario(() => {
      if (!forma.reportValidity() || guardando) return
      guardando = true
      const cuerpo = { titulo: titulo.value, objetivo: objetivo.value, programa_id: programa.value || null, equipo_id: equipo.value || null, unidad_id: unidad.value || null, responsable_correo: responsable.value || null, estado: estado.value, prioridad: prioridad.value, fecha_inicio: fechaInicio.value || null, fecha_fin: fechaFin.value || null, presupuesto: presupuesto.value, notas: notas.value }
      pedir(proyecto ? `/api/cms/proyectos/${proyecto.id}` : '/api/cms/proyectos', { method: proyecto ? 'PATCH' : 'POST', body: JSON.stringify(cuerpo) })
        .then(async (respuesta) => {
          formularioAbierto = null; proyectoAEditar = null
          await cargar()
          if (!proyecto) confirmacion = {
            titulo: 'Proyecto creado',
            detalle: `${titulo.value} quedó en ${datos.equipos.find((fila) => fila.id === equipo.value)?.nombre || 'la estructura institucional'}. Ahora podés agregar la primera tarea o material.`,
            acciones: [
              { etiqueta: 'Agregar primera tarea', principal: true, alPulsar: () => { proyectoPreseleccionado = respuesta.proyecto.id; formularioAbierto = 'tarea'; confirmacion = null; dibujar() } },
              { etiqueta: 'Agregar recurso', alPulsar: () => { proyectoPreseleccionado = respuesta.proyecto.id; formularioAbierto = 'documento'; confirmacion = null; dibujar() } },
            ],
          }
          dibujar()
        })
        .catch((fallo) => { error = fallo.message; guardando = false; dibujar() })
    }, proyecto ? 'Guardar proyecto' : 'Crear proyecto'))
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); forma.querySelector('.boton-principal').click() })
    return forma
  }

  function formularioRiesgoProyecto() {
    const proyecto = datos.proyectos.find((fila) => fila.id === proyectoDeRiesgo)
    if (!proyecto) return null
    const forma = document.createElement('form')
    forma.className = 'cms-captura cms-captura-riesgo'
    const titulo = inputCms('Ej. Falta de confirmación del espacio', 'Riesgo del proyecto')
    titulo.required = true; titulo.maxLength = 180
    const descripcion = areaCms('Impacto, señal a observar y cómo reducirlo', 'Plan de mitigación')
    const nivel = selectorCms([['medio', 'Nivel medio'], ['alto', 'Nivel alto'], ['critico', 'Nivel crítico'], ['bajo', 'Nivel bajo']], 'Nivel del riesgo')
    const responsable = selectorCms([['', 'Sin responsable'], ...datos.responsables.map((fila) => [fila.correo, fila.nombre || fila.correo])], 'Responsable del riesgo')
    const fechaRevision = inputCms('', 'Próxima revisión del riesgo', 'date')
    const detalles = elemento('div', ['cms-captura-detalles'])
    detalles.append(nivel, responsable, fechaRevision)
    forma.append(
      elemento('h3', [], `Nuevo riesgo: ${proyecto.titulo}`),
      elemento('p', ['ayuda'], 'Registrá el riesgo y una fecha para volver a revisarlo. La mitigación queda visible para el equipo.'),
      titulo, detalles, elemento('label', ['cms-etiqueta-campo'], 'Impacto y mitigación'), descripcion,
      accionesFormulario(() => {
        if (!forma.reportValidity() || guardando) return
        guardando = true
        pedir(`/api/cms/proyectos/${proyecto.id}/riesgos`, { method: 'POST', body: JSON.stringify({ titulo: titulo.value, descripcion: descripcion.value, nivel: nivel.value, responsable_correo: responsable.value || null, fecha_revision: fechaRevision.value || null }) })
          .then(() => { formularioAbierto = null; return cargar() })
          .catch((fallo) => { error = fallo.message; guardando = false; dibujar() })
      }, 'Registrar riesgo'),
    )
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); forma.querySelector('.boton-principal').click() })
    return forma
  }

  function formularioHitoProyecto() {
    const proyecto = datos.proyectos.find((fila) => fila.id === proyectoDeSeguimiento)
    if (!proyecto) return null
    const forma = document.createElement('form')
    forma.className = 'cms-captura cms-captura-proyecto'
    const titulo = inputCms('Ej. Confirmar equipos de trabajo', 'Hito del proyecto'); titulo.required = true; titulo.maxLength = 180
    const descripcion = areaCms('Resultado esperado y dependencia principal', 'Descripción del hito')
    const fecha = inputCms('', 'Fecha objetivo del hito', 'date')
    const responsable = selectorCms([['', 'Sin responsable'], ...datos.responsables.map((fila) => [fila.correo, fila.nombre || fila.correo])], 'Responsable del hito')
    const estado = selectorCms([['pendiente', 'Pendiente'], ['en_marcha', 'En marcha'], ['completado', 'Completado'], ['cancelado', 'Cancelado']], 'Estado del hito')
    const detalles = elemento('div', ['cms-captura-detalles']); detalles.append(fecha, responsable, estado)
    forma.append(elemento('h3', [], `Nuevo hito: ${proyecto.titulo}`), titulo, detalles, elemento('label', ['cms-etiqueta-campo'], 'Resultado y dependencia'), descripcion, accionesFormulario(() => {
      if (!forma.reportValidity() || guardando) return
      guardando = true
      pedir(`/api/cms/proyectos/${proyecto.id}/hitos`, { method: 'POST', body: JSON.stringify({ titulo: titulo.value, descripcion: descripcion.value, fecha_objetivo: fecha.value || null, responsable_correo: responsable.value || null, estado: estado.value }) })
        .then(() => { formularioAbierto = null; return cargar() })
        .catch((fallo) => { error = fallo.message; guardando = false; dibujar() })
    }, 'Registrar hito'))
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); forma.querySelector('.boton-principal').click() })
    return forma
  }

  function formularioGastoProyecto() {
    const proyecto = datos.proyectos.find((fila) => fila.id === proyectoDeSeguimiento)
    if (!proyecto) return null
    const forma = document.createElement('form')
    forma.className = 'cms-captura cms-captura-proyecto'
    const concepto = inputCms('Ej. Traslado para la jornada', 'Concepto del gasto'); concepto.required = true; concepto.maxLength = 180
    const monto = inputCms('Monto en UYU', 'Monto del gasto', 'number'); monto.required = true; monto.min = '0'; monto.step = '1'
    const fecha = inputCms('', 'Fecha del gasto', 'date'); fecha.required = true; fecha.value = HOY()
    const notas = areaCms('Comprobante, proveedor o aclaración', 'Notas del gasto')
    const detalles = elemento('div', ['cms-captura-detalles']); detalles.append(monto, fecha)
    forma.append(elemento('h3', [], `Registrar gasto: ${proyecto.titulo}`), concepto, detalles, elemento('label', ['cms-etiqueta-campo'], 'Referencia'), notas, accionesFormulario(() => {
      if (!forma.reportValidity() || guardando) return
      guardando = true
      pedir(`/api/cms/proyectos/${proyecto.id}/gastos`, { method: 'POST', body: JSON.stringify({ concepto: concepto.value, monto: monto.value, fecha: fecha.value, notas: notas.value }) })
        .then(() => { formularioAbierto = null; return cargar() })
        .catch((fallo) => { error = fallo.message; guardando = false; dibujar() })
    }, 'Registrar gasto'))
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); forma.querySelector('.boton-principal').click() })
    return forma
  }

  function formularioDocumento() {
    const forma = document.createElement('form'); forma.className = 'cms-captura'
    const titulo = inputCms('Ej. Diseño de la jornada en Canva', 'Título del recurso'); titulo.required = true; titulo.maxLength = 180
    const url = inputCms('https://canva.com/... o https://drive.google.com/...', 'Enlace del recurso', 'url'); url.required = true; url.maxLength = 2000
    const estadoEnlace = elemento('span', ['cms-enlace-estado'])
    estadoEnlace.setAttribute('aria-live', 'polite')
    const aplicarTextoCopiado = asistirPegadoEnlace(url, ({ enlace, valido }) => {
      estadoEnlace.textContent = valido
        ? (enlace.includes('docs.google.com') || enlace.includes('drive.google.com') ? 'Enlace completo de Google listo para guardar.' : 'Enlace completo listo para guardar.')
        : `${MENSAJE_ENLACE_INVALIDO} Podés pegarlo con o sin https.`
      estadoEnlace.classList.toggle('cms-enlace-estado-error', !valido)
      estadoEnlace.setAttribute('role', valido ? 'status' : 'alert')
    })
    url.addEventListener('input', () => { if (!url.value) estadoEnlace.textContent = '' })
    const pegarEnlace = boton('Pegar enlace', async () => {
      url.focus()
      if (!navigator.clipboard?.readText) {
        estadoEnlace.textContent = 'Presioná Ctrl+V para pegar el enlace en el campo.'
        return
      }
      try {
        const texto = await navigator.clipboard.readText()
        aplicarTextoCopiado(texto)
      } catch {
        estadoEnlace.textContent = 'El navegador no permitió leer el portapapeles. Presioná Ctrl+V en el campo.'
      }
    })
    pegarEnlace.classList.add('cms-pegar-enlace')
    const ingresoEnlace = elemento('div', ['cms-enlace-ingreso'])
    ingresoEnlace.append(url, pegarEnlace, estadoEnlace)
    const descripcion = areaCms('Qué contiene y cuándo usarlo', 'Descripción del recurso')
    const tipo = selectorCms([['enlace', 'Enlace'], ['guia', 'Guía'], ['acta', 'Acta'], ['plantilla', 'Plantilla'], ['politica', 'Política']], 'Tipo de documento')
    const sensibilidad = selectorCms([['compartido', 'Compartido'], ['interno', 'Uso interno'], ['restringido', 'Restringido']], 'Visibilidad del documento')
    const equipo = selectorCms([['', 'Sin equipo'], ...datos.equipos.map((fila) => [fila.id, fila.nombre])], 'Equipo del documento')
    const unidad = selectorCms([['', 'Sin programa o espacio'], ...datos.unidades.map((fila) => [fila.id, `${fila.sigla ? `${fila.sigla}: ` : ''}${fila.nombre}`])], 'Programa o espacio del documento')
    const proyecto = selectorCms([['', 'Sin proyecto'], ...datos.proyectos.map((fila) => [fila.id, fila.titulo])], 'Proyecto del documento')
    proyecto.value = proyectoPreseleccionado || ''
    const proyectoContextual = datos.proyectos.find((fila) => fila.id === proyecto.value)
    equipo.value = proyectoContextual?.equipo_id || ''
    unidad.value = proyectoContextual?.unidad_id || ''
    const detalles = elemento('div', ['cms-captura-detalles']); detalles.append(tipo, sensibilidad, equipo, unidad, proyecto)
    forma.append(elemento('h3', [], 'Agregar recurso o documento'), elemento('p', ['ayuda'], 'Pegá un enlace de Canva, Drive u otra herramienta. El recurso quedará disponible dentro del proyecto y la biblioteca.'), titulo, ingresoEnlace, detalles, elemento('label', ['cms-etiqueta-campo'], 'Descripción'), descripcion, accionesFormulario(() => {
      normalizarCampoEnlace(url)
      if (!forma.reportValidity() || guardando) return; guardando = true
      pedir('/api/cms/documentos', { method: 'POST', body: JSON.stringify({ titulo: titulo.value, url: url.value, descripcion: descripcion.value, tipo: tipo.value, sensibilidad: sensibilidad.value, equipo_id: equipo.value || null, unidad_id: unidad.value || null, proyecto_id: proyecto.value || null }) })
        .then(async (respuesta) => {
          formularioAbierto = null; proyectoPreseleccionado = null
          await cargar()
          confirmacion = { titulo: 'Recurso guardado', detalle: `${respuesta.documento.titulo} ya está disponible desde el proyecto y la biblioteca.`, acciones: [] }
          dibujar()
        }).catch((fallo) => { error = fallo.message; guardando = false; dibujar() })
    }, 'Guardar recurso'))
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); forma.querySelector('.boton-principal').click() }); return forma
  }

  function formularioAlianza(alianza = null) {
    const forma = document.createElement('form'); forma.className = 'cms-captura'
    const nombre = inputCms('Ej. Organización aliada para actividades', 'Nombre de la alianza'); nombre.required = true; nombre.maxLength = 180; nombre.value = alianza?.nombre || ''
    const descripcion = areaCms('Propósito, aporte o forma de colaboración institucional', 'Descripción de la alianza'); descripcion.value = alianza?.descripcion || ''
    const contacto = inputCms('Web, correo general o canal institucional', 'Canal institucional de contacto'); contacto.maxLength = 240; contacto.value = alianza?.contacto_institucional || ''
    const tipo = selectorCms([['aliado', 'Aliado'], ['patrocinador', 'Patrocinador'], ['institucion', 'Institución'], ['proveedor', 'Proveedor'], ['red', 'Red']], 'Tipo de alianza')
    const estado = selectorCms([['activa', 'Activa'], ['en_pausa', 'En pausa'], ['finalizada', 'Finalizada']], 'Estado de la alianza')
    const equipo = selectorCms([['', 'Sin equipo'], ...datos.equipos.map((fila) => [fila.id, fila.nombre])], 'Equipo de la alianza')
    const proyecto = selectorCms([['', 'Sin proyecto'], ...datos.proyectos.map((fila) => [fila.id, fila.titulo])], 'Proyecto de la alianza')
    tipo.value = alianza?.tipo || 'aliado'; estado.value = alianza?.estado || 'activa'; equipo.value = alianza?.equipo_id || ''; proyecto.value = alianza?.proyecto_id || ''
    const detalles = elemento('div', ['cms-captura-detalles']); detalles.append(tipo, estado, equipo, proyecto)
    forma.append(
      elemento('h3', [], alianza ? `Editar alianza: ${alianza.nombre}` : 'Nueva alianza institucional'),
      elemento('p', ['ayuda'], 'Podés registrar la web, un correo general o un canal institucional. Evitá datos personales sensibles.'),
      nombre, contacto, detalles, elemento('label', ['cms-etiqueta-campo'], 'Propósito o colaboración'), descripcion,
      accionesFormulario(() => {
        if (!forma.reportValidity() || guardando) return
        guardando = true
        const cuerpo = { nombre: nombre.value, tipo: tipo.value, estado: estado.value, descripcion: descripcion.value, contacto_institucional: contacto.value, equipo_id: equipo.value || null, proyecto_id: proyecto.value || null }
        pedir(alianza ? `/api/cms/alianzas/${alianza.id}` : '/api/cms/alianzas', { method: alianza ? 'PATCH' : 'POST', body: JSON.stringify(cuerpo) })
          .then(() => { formularioAbierto = null; alianzaAEditar = null; return cargar() })
          .catch((fallo) => { error = fallo.message; guardando = false; dibujar() })
      }, alianza ? 'Guardar alianza' : 'Registrar alianza'),
    )
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); forma.querySelector('.boton-principal').click() })
    return forma
  }

  function formularioEntrada() {
    const forma = document.createElement('form'); forma.className = 'cms-captura'
    const tipo = selectorCms([['voluntariado', 'Voluntariado'], ['inscripcion', 'Inscripción'], ['actividad', 'Actividad'], ['evento', 'Evento'], ['pedido', 'Pedido entre equipos']], 'Tipo de entrada')
    const nombre = inputCms('Nombre de la persona o referencia', 'Nombre o referencia de la entrada'); nombre.required = true; nombre.maxLength = 180
    const contacto = inputCms('Correo, teléfono o canal de contacto', 'Contacto de la entrada'); contacto.maxLength = 180
    const detalle = areaCms('Qué necesita, propone o solicita', 'Detalle de la entrada')
    detalle.value = capturaOrientada?.texto || ''
    const fechaPropuesta = inputCms('', 'Fecha propuesta de actividad o evento', 'datetime-local')
    const fechaPropuestaCampo = fechaPropuesta
    const equipo = selectorCms([['', 'Sin equipo'], ...datos.equipos.map((fila) => [fila.id, fila.nombre])], 'Equipo de la entrada')
    const equipoSolicitante = selectorCms([['', 'Sin equipo solicitante'], ...datos.equipos.map((fila) => [fila.id, fila.nombre])], 'Equipo que realiza el pedido')
    const prioridad = selectorCms([['baja', 'Prioridad baja'], ['normal', 'Prioridad normal'], ['alta', 'Prioridad alta'], ['urgente', 'Prioridad urgente']], 'Prioridad del pedido'); prioridad.value = 'normal'
    const proyecto = selectorCms([['', 'Sin proyecto'], ...datos.proyectos.map((fila) => [fila.id, fila.titulo])], 'Proyecto de la entrada')
    equipo.value = capturaOrientada?.equipo_id || ''
    const ayuda = elemento('p', ['ayuda'], 'La entrada crea una tarea trazable para el equipo. No cargues datos de salud, documentos personales ni otra información sensible en este resumen.')
    const revisarPedido = () => { const esPedido = tipo.value === 'pedido'; const proponeFecha = ['actividad', 'evento'].includes(tipo.value); equipo.required = esPedido; equipoSolicitante.required = esPedido; equipoSolicitante.hidden = !esPedido; prioridad.hidden = !esPedido; fechaPropuestaCampo.hidden = !proponeFecha; ayuda.textContent = esPedido ? 'Indicá qué equipo solicita, cuál recibe y con qué prioridad. El pedido se asigna automáticamente según las responsabilidades del equipo destinatario. No cargues datos sensibles.' : proponeFecha ? 'La fecha es una propuesta. La coordinación decide si la prepara en la agenda después de revisarla.' : 'La entrada crea una tarea trazable para el equipo. No cargues datos de salud, documentos personales ni otra información sensible en este resumen.' }
    tipo.addEventListener('change', revisarPedido); revisarPedido()
    const detalles = elemento('div', ['cms-captura-detalles']); detalles.append(fechaPropuestaCampo, equipo, equipoSolicitante, prioridad, proyecto)
    forma.append(elemento('h3', [], 'Registrar entrada'), tipo, nombre, contacto, elemento('label', ['cms-etiqueta-campo'], 'Detalle'), detalle, detalles, ayuda, accionesFormulario(() => {
      if (!forma.reportValidity() || guardando) return
      guardando = true
      pedir('/api/cms/entradas', { method: 'POST', body: JSON.stringify({ tipo: tipo.value, nombre: nombre.value, contacto: contacto.value, detalle: detalle.value, fecha_propuesta: fechaPropuesta.value || null, equipo_id: equipo.value || null, equipo_solicitante_id: equipoSolicitante.value || null, prioridad: prioridad.value, proyecto_id: proyecto.value || null }) })
        .then(() => { formularioAbierto = null; return cargar() }).catch((fallo) => { error = fallo.message; guardando = false; dibujar() })
    }, 'Derivar entrada'))
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); forma.querySelector('.boton-principal').click() })
    return forma
  }

  function panelCapturaRapida() {
    const seccion = elemento('section', ['cms-captura', 'cms-captura-rapida'])
    const opciones = elemento('div', ['cms-captura-rapida-opciones'])
    const abrir = (destino, sugerida = false) => {
      actividadPreseleccionada = null
      if (!sugerida) capturaOrientada = null
      if (destino === 'tarea') tipoNuevaTarea = 'tarea'
      if (destino === 'directriz') tipoNuevaTarea = 'directriz'
      if (destino === 'nota') tipoNuevaTarea = 'nota'
      if (destino === 'solicitud') tipoNuevaTarea = 'solicitud'
      formularioAbierto = ['directriz', 'nota'].includes(destino) ? 'tarea' : destino
      dibujar()
    }
    opciones.append(
      boton('Nueva tarea', () => abrir('tarea'), ['boton-principal']),
      boton('Nueva directriz', () => abrir('directriz')),
      boton('Nota para ordenar', () => abrir('nota')),
      boton('Pedido a un equipo', () => abrir('entrada')),
      boton('Actividad o evento', () => abrir('evento')),
      boton('Proyecto', () => abrir('proyecto')),
      boton('Entrada para revisar', () => abrir('entrada')),
      boton('Preparar reunión', () => abrir('reunion')),
    )
    const consulta = inputCms('Ej. necesitamos organizar una actividad de Familias', '¿Qué necesitás registrar?')
    const sugerencia = elemento('div', ['cms-captura-sugerencia'])
    const sugerir = () => {
      const texto = consulta.value.toLocaleLowerCase('es')
      if (texto.length < 3) { sugerencia.replaceChildren(elemento('p', ['ayuda'], 'Escribí una idea y te propondremos dónde registrarla.')); return }
      let destino = 'tarea'; let etiqueta = 'Crear tarea'; let razon = 'Tiene un próximo paso que necesita seguimiento.'
      if (/reuni|acuerdo|decid/.test(texto)) { destino = 'reunion'; etiqueta = 'Preparar reunión'; razon = 'Las decisiones deben conservar el contexto del encuentro.' }
      else if (/evento|actividad|curso|taller|fecha/.test(texto)) { destino = 'evento'; etiqueta = 'Preparar actividad'; razon = 'Tiene una fecha o una actividad institucional asociada.' }
      else if (/proyecto|programa|objetivo/.test(texto)) { destino = 'proyecto'; etiqueta = 'Crear proyecto'; razon = 'Describe un resultado amplio con varias acciones.' }
      else if (/pedir|solicitar|necesito que|otro equipo/.test(texto)) { destino = 'entrada'; etiqueta = 'Enviar pedido a un equipo'; razon = 'Necesita derivación y una respuesta de otra área.' }
      else if (/orden|recordar|idea|nota/.test(texto)) { destino = 'nota'; etiqueta = 'Guardar nota para ordenar'; razon = 'Todavía no parece requerir una ejecución definida.' }
      const equipo = datos.equipos.find((fila) => texto.includes(String(fila.nombre || '').toLocaleLowerCase('es')))
      const responsable = equipo && datos.responsabilidades.find((fila) => fila.equipo_id === equipo.id && ['coordinacion', 'referente'].includes(fila.tipo))
      sugerencia.replaceChildren(elemento('strong', [], equipo ? `Sugerencia: ${etiqueta} en ${equipo.nombre}` : `Sugerencia: ${etiqueta}`), elemento('p', ['ayuda'], responsable ? `${razon} La referencia inicial sería ${responsable.usuario_nombre || responsable.usuario_correo}.` : razon), boton(etiqueta, () => { capturaOrientada = { texto: consulta.value.trim().slice(0, 180), equipo_id: equipo?.id || null, responsable_correo: responsable?.usuario_correo || null }; abrir(destino, true) }, ['boton-principal']))
    }
    consulta.addEventListener('input', sugerir); sugerir()
    seccion.append(
      elemento('h3', [], 'Captura rápida'),
      elemento('p', ['ayuda'], 'Contanos qué necesitás. La sugerencia usa los equipos y responsabilidades actuales, pero vos confirmás siempre el destino antes de guardar.'),
      consulta,
      sugerencia,
      opciones,
      elemento('div', ['cms-captura-acciones'], boton('Cerrar', () => { formularioAbierto = null; dibujar() })),
    )
    return seccion
  }

  function formularioEvento(evento = null) {
    const forma = document.createElement('form'); forma.className = 'cms-captura cms-captura-evento'
    const titulo = inputCms('Ej. Taller de convivencia y juego', 'Título de la actividad'); titulo.required = true; titulo.maxLength = 180; titulo.value = evento?.titulo || capturaOrientada?.texto || ''
    const tipo = selectorCms(TIPOS_EVENTO, 'Tipo de fecha institucional'); tipo.value = evento?.tipo || 'actividad'
    const descripcion = areaCms('Objetivo, público o materiales a preparar', 'Descripción')
    const inicio = inputCms('', 'Inicio de la actividad', 'datetime-local'); inicio.required = true; inicio.value = evento?.fecha_hora || ''
    const fin = inputCms('', 'Finalización de esta actividad', 'datetime-local')
    const lugar = inputCms('Ej. Sede de Aletea', 'Lugar de la actividad'); lugar.maxLength = 180; lugar.value = evento?.lugar || ''
    const equipo = selectorCms([['', 'Sin equipo'], ...datos.equipos.map((fila) => [fila.id, fila.nombre])], 'Equipo de la actividad')
    const unidad = selectorCms([['', 'Sin programa o espacio'], ...datos.unidades.map((fila) => [fila.id, `${fila.sigla ? `${fila.sigla}: ` : ''}${fila.nombre}`])], 'Programa o espacio de la actividad')
    const proyecto = selectorCms([['', 'Sin proyecto'], ...datos.proyectos.map((fila) => [fila.id, fila.titulo])], 'Proyecto de la actividad')
    const responsable = selectorCms([['', 'Sin responsable'], ...datos.responsables.map((fila) => [fila.correo, fila.nombre || fila.correo])], 'Responsable de la actividad')
    const estado = selectorCms([['planificado', 'Planificado'], ['realizado', 'Realizado'], ['cancelado', 'Cancelado']], 'Estado de la actividad')
    const frecuencia = selectorCms([['', 'No se repite'], ['semanal', 'Cada semana'], ['quincenal', 'Cada 2 semanas'], ['mensual', 'El mismo día de cada mes'], ['mensual_ordinal', 'La misma semana y día, por ejemplo segundo jueves']], 'Repetición de la actividad')
    const repetirHasta = inputCms('', 'Repetir actividad hasta', 'date')
    let fechaSugerida = ''
    const revisarRecurrencia = () => {
      const activa = !evento && Boolean(frecuencia.value)
      repetirHasta.hidden = !activa
      repetirHasta.required = activa
      if (activa) {
        const anio = inicio.value.slice(0, 4) || String(new Date().getFullYear())
        const nuevaSugerencia = `${anio}-12-31`
        if (!repetirHasta.value || repetirHasta.value === fechaSugerida) repetirHasta.value = nuevaSugerencia
        fechaSugerida = nuevaSugerencia
      }
    }
    frecuencia.addEventListener('change', revisarRecurrencia)
    inicio.addEventListener('input', revisarRecurrencia)
    revisarRecurrencia()
    proyecto.value = evento?.proyecto_id || proyectoPreseleccionado || ''
    const proyectoContextual = datos.proyectos.find((fila) => fila.id === proyecto.value)
    descripcion.value = evento?.descripcion || ''; fin.value = evento?.fecha_fin || ''; equipo.value = evento?.equipo_id || capturaOrientada?.equipo_id || proyectoContextual?.equipo_id || ''; unidad.value = evento?.unidad_id || proyectoContextual?.unidad_id || ''; responsable.value = evento?.responsable_correo || capturaOrientada?.responsable_correo || proyectoContextual?.responsable_correo || ''; estado.value = evento?.estado || 'planificado'
    const detalles = elemento('div', ['cms-captura-detalles']); detalles.append(tipo, inicio, fin, lugar, equipo, unidad, proyecto, responsable, estado)
    if (!evento) detalles.append(campoCms('Repetición', frecuencia, 'Crea todas las fechas de la serie en una sola acción. Después podés editar cada actividad por separado.'), repetirHasta)
    forma.append(elemento('h3', [], evento ? `Editar actividad: ${evento.titulo}` : 'Nueva actividad o evento'), elemento('p', ['ayuda'], 'Agendá actividades, reuniones, cursos, publicaciones, vencimientos, pagos, renovaciones, trámites, certificaciones o asambleas.'), titulo, detalles, elemento('p', ['ayuda'], 'La finalización indica cuánto dura cada encuentro. Si se repite, la fecha final de la serie se elige en Repetición.'), elemento('label', ['cms-etiqueta-campo'], 'Descripción'), descripcion, accionesFormulario(() => {
      if (!forma.reportValidity() || guardando) return; guardando = true
      pedir(evento ? `/api/cms/eventos/${evento.id}` : '/api/cms/eventos', { method: evento ? 'PATCH' : 'POST', body: JSON.stringify({ titulo: titulo.value, tipo: tipo.value, descripcion: descripcion.value, fecha_hora: inicio.value, fecha_fin: fin.value || null, lugar: lugar.value, equipo_id: equipo.value || null, unidad_id: unidad.value || null, proyecto_id: proyecto.value || null, responsable_correo: responsable.value || null, estado: estado.value, frecuencia_evento: frecuencia.value || null, repetir_hasta: repetirHasta.value || null }) })
        .then(() => { formularioAbierto = null; eventoAEditar = null; proyectoPreseleccionado = null; return cargar() }).catch((fallo) => { error = fallo.message; guardando = false; dibujar() })
    }, evento ? 'Guardar actividad' : 'Agendar actividad'))
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); forma.querySelector('.boton-principal').click() }); return forma
  }

  function formularioChecklist() {
    const forma = document.createElement('form'); forma.className = 'cms-captura cms-captura-checklist'
    const titulo = inputCms('Ej. Preparar jornada de familias', 'Nombre de la checklist'); titulo.required = true; titulo.maxLength = 180
    const descripcion = inputCms('Cuándo conviene usarla', 'Descripción de la checklist'); descripcion.maxLength = 400
    const equipo = selectorCms([['', 'Usar el equipo de la actividad'], ...datos.equipos.map((fila) => [fila.id, fila.nombre])], 'Equipo de la checklist')
    const tareas = elemento('div', ['cms-checklist-items'])
    const agregarFila = (valores = {}) => {
      const fila = elemento('div', ['cms-checklist-item'])
      const tarea = inputCms('Ej. Confirmar disponibilidad del espacio', 'Tarea de la checklist'); tarea.required = true; tarea.maxLength = 180; tarea.value = valores.titulo || ''
      const dias = inputCms('', 'Días antes o después de la actividad', 'number'); dias.min = '-365'; dias.max = '365'; dias.step = '1'; dias.value = valores.dias_antes ?? 0
      const prioridad = selectorCms([['normal', 'Prioridad normal'], ['alta', 'Prioridad alta'], ['urgente', 'Urgente'], ['baja', 'Prioridad baja']], 'Prioridad de la tarea de checklist'); prioridad.value = valores.prioridad || 'normal'
      fila.append(campoCms('Tarea', tarea), campoCms('Días antes, negativo después', dias), campoCms('Prioridad', prioridad))
      tareas.appendChild(fila)
    }
    agregarFila({ dias_antes: 14, prioridad: 'alta' }); agregarFila({ dias_antes: 7 }); agregarFila({ dias_antes: 0 })
    const agregar = boton('Agregar tarea', () => agregarFila())
    const usarModelo = boton('Usar modelo de actividad', () => {
      vaciar(tareas)
      ;[
        { titulo: 'Definir objetivo, responsables y presupuesto', dias_antes: 14, prioridad: 'alta' },
        { titulo: 'Confirmar lugar, convocatoria y recursos', dias_antes: 7, prioridad: 'alta' },
        { titulo: 'Revisar materiales, accesibilidad y asistencia', dias_antes: 1, prioridad: 'alta' },
        { titulo: 'Coordinar la jornada y registrar incidencias', dias_antes: 0, prioridad: 'normal' },
        { titulo: 'Cerrar evaluación, fotos, comunicación y rendición', dias_antes: -1, prioridad: 'normal' },
      ].forEach(agregarFila)
      if (!titulo.value) titulo.value = 'Preparación y cierre de actividad'
      if (!descripcion.value) descripcion.value = 'Modelo editable para preparar, realizar y cerrar una actividad institucional.'
    })
    forma.append(elemento('h3', [], 'Nueva checklist reutilizable'), elemento('p', ['ayuda'], 'Las tareas se crean al aplicar la checklist a una actividad. Usá días positivos antes de la actividad y negativos para el seguimiento posterior.'), titulo, descripcion, campoCms('Equipo por defecto', equipo), usarModelo, tareas, agregar, accionesFormulario(() => {
      if (!forma.reportValidity() || guardando) return
      const filas = [...tareas.querySelectorAll('.cms-checklist-item')]
      const cuerpo = {
        titulo: titulo.value, descripcion: descripcion.value, equipo_id: equipo.value || null,
        tareas: filas.map((fila) => ({ titulo: fila.querySelector('[aria-label="Tarea de la checklist"]').value, dias_antes: Number(fila.querySelector('[aria-label="Días antes o después de la actividad"]').value), prioridad: fila.querySelector('[aria-label="Prioridad de la tarea de checklist"]').value })),
      }
      guardando = true
      pedir('/api/cms/plantillas-tareas', { method: 'POST', body: JSON.stringify(cuerpo) })
        .then(() => { formularioAbierto = null; return cargar() }).catch((fallo) => { error = fallo.message; guardando = false; dibujar() })
    }, 'Guardar checklist'))
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); forma.querySelector('.boton-principal').click() }); return forma
  }

  function formularioResponsabilidad() {
    const equipo = datos.equipos.find((fila) => fila.id === equipoDeResponsabilidad)
    if (!equipo) return null
    const panel = elemento('section', ['cms-captura', 'cms-captura-responsabilidad'])
    const asignadas = datos.responsabilidades.filter((fila) => fila.equipo_id === equipo.id)
    panel.append(
      elemento('h3', [], `Integrantes de ${equipo.nombre}`),
      elemento('p', ['ayuda'], 'Agregá personas, cambiá su función o quitalas del equipo. Los cambios también aparecen en Accesos.'),
    )
    const lista = elemento('div', ['cms-integrantes-equipo'])
    if (!asignadas.length) lista.appendChild(elemento('p', ['ayuda'], 'Este equipo todavía no tiene integrantes asignados.'))
    asignadas.forEach((asignacion) => {
      const fila = elemento('div', ['cms-integrante-equipo'])
      const identidad = elemento('div', ['cms-integrante-identidad'])
      identidad.append(
        elemento('strong', [], asignacion.usuario_nombre || asignacion.usuario_correo),
        elemento('span', ['cms-equipo-meta'], asignacion.usuario_correo),
      )
      const tipoActual = selectorCms([
        ['coordinacion', 'Coordinación'], ['referente', 'Referente'], ['integrante', 'Integrante'], ['sustitucion', 'Sustitución'],
      ], `Función de ${asignacion.usuario_nombre || asignacion.usuario_correo} en ${equipo.nombre}`)
      tipoActual.value = asignacion.tipo
      const guardarFuncion = boton('Guardar función', async () => {
        if (guardando || tipoActual.value === asignacion.tipo) return
        guardando = true
        try {
          await pedir('/api/cms/responsabilidades', { method: 'POST', body: JSON.stringify({
            equipo_id: equipo.id, usuario_correo: asignacion.usuario_correo, tipo: tipoActual.value,
            puede_decidir: asignacion.puede_decidir || '', debe_escalar: asignacion.debe_escalar || '',
          }) })
          await pedir(`/api/cms/responsabilidades/${encodeURIComponent(asignacion.id)}`, { method: 'DELETE' })
          await cargar()
        } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
      }, ['boton', 'boton-secundario'])
      const quitar = boton('Quitar del equipo', async () => {
        if (guardando) return
        guardando = true
        try {
          await pedir(`/api/cms/responsabilidades/${encodeURIComponent(asignacion.id)}`, { method: 'DELETE' })
          await cargar()
        } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
      }, ['boton', 'boton-secundario'])
      const acciones = elemento('div', ['cms-integrante-acciones'])
      acciones.append(tipoActual, guardarFuncion, quitar)
      fila.append(identidad, acciones)
      lista.appendChild(fila)
    })
    panel.appendChild(lista)
    const correosAsignados = new Set(asignadas.map((fila) => fila.usuario_correo))
    const disponibles = datos.responsables.filter((fila) => !correosAsignados.has(fila.correo))
    if (disponibles.length) {
      const forma = document.createElement('form')
      forma.className = 'cms-agregar-integrante'
      const persona = selectorCms([['', 'Elegí una persona'], ...disponibles.map((fila) => [fila.correo, fila.nombre || fila.correo])], `Persona para agregar a ${equipo.nombre}`)
      persona.required = true
      const tipo = selectorCms([
        ['integrante', 'Integrante'], ['coordinacion', 'Coordinación'], ['referente', 'Referente'], ['sustitucion', 'Sustitución'],
      ], `Función nueva en ${equipo.nombre}`)
      const agregar = boton('Agregar persona', async () => {
        if (!forma.reportValidity() || guardando) return
        guardando = true
        try {
          await pedir('/api/cms/responsabilidades', { method: 'POST', body: JSON.stringify({ equipo_id: equipo.id, usuario_correo: persona.value, tipo: tipo.value }) })
          await cargar()
        } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
      }, ['boton', 'boton-principal'])
      agregar.type = 'submit'
      forma.append(elemento('h4', [], 'Agregar una persona'), persona, tipo, agregar)
      forma.addEventListener('submit', (evento) => { evento.preventDefault(); agregar.click() })
      panel.appendChild(forma)
    } else {
      panel.appendChild(elemento('p', ['ayuda'], 'Todas las cuentas activas ya están en este equipo.'))
    }
    panel.appendChild(boton('Cerrar', () => { formularioAbierto = null; equipoDeResponsabilidad = null; dibujar() }, ['boton', 'boton-secundario']))
    return panel
  }

  function formularioReunion() {
    const forma = document.createElement('form')
    forma.className = 'cms-captura cms-captura-reunion'
    const titulo = inputCms('Ej. Coordinación semanal', 'Título de la reunión')
    titulo.required = true; titulo.maxLength = 180; titulo.value = capturaOrientada?.texto || ''
    const objetivo = inputCms('Qué necesitan resolver o alinear', 'Objetivo de la reunión')
    objetivo.maxLength = 400
    const fechaHora = inputCms('', 'Fecha y hora de la reunión', 'datetime-local')
    fechaHora.required = true
    const lugar = inputCms('Presencial, videollamada o lugar', 'Lugar de la reunión')
    lugar.maxLength = 180
    const equipo = selectorCms([['', 'Sin equipo'], ...datos.equipos.map((fila) => [fila.id, fila.nombre])], 'Equipo de la reunión')
    equipo.value = capturaOrientada?.equipo_id || ''
    const unidad = selectorCms([['', 'Sin programa o espacio'], ...datos.unidades.map((fila) => [fila.id, `${fila.sigla ? `${fila.sigla}: ` : ''}${fila.nombre}`])], 'Programa o espacio de la reunión')
    const proyecto = selectorCms([['', 'Sin proyecto'], ...datos.proyectos.map((fila) => [fila.id, fila.titulo])], 'Proyecto de la reunión')
    const preparacion = areaCms('Temas, datos o materiales a preparar', 'Preparación de la reunión')
    const frecuencia = selectorCms([['', 'No se repite'], ['semanal', 'Cada semana'], ['quincenal', 'Cada 2 semanas'], ['mensual', 'El mismo día de cada mes'], ['mensual_ordinal', 'La misma semana y día, por ejemplo segundo jueves']], 'Repetición de la reunión')
    const repetirHasta = inputCms('', 'Repetir reunión hasta', 'date')
    let fechaSugerida = ''
    const revisarRecurrencia = () => {
      const activa = Boolean(frecuencia.value)
      repetirHasta.hidden = !activa
      repetirHasta.required = activa
      if (activa) {
        const anio = fechaHora.value.slice(0, 4) || String(new Date().getFullYear())
        const nuevaSugerencia = `${anio}-12-31`
        if (!repetirHasta.value || repetirHasta.value === fechaSugerida) repetirHasta.value = nuevaSugerencia
        fechaSugerida = nuevaSugerencia
      }
    }
    frecuencia.addEventListener('change', revisarRecurrencia)
    fechaHora.addEventListener('input', revisarRecurrencia)
    revisarRecurrencia()
    const detalles = elemento('div', ['cms-captura-detalles'])
    detalles.append(fechaHora, lugar, equipo, unidad, proyecto, campoCms('Repetición', frecuencia, 'Crea todas las reuniones de la serie. La minuta y las decisiones se registran por separado en cada fecha.'), repetirHasta)
    forma.append(
      elemento('h3', [], 'Nueva reunión'),
      titulo,
      objetivo,
      detalles,
      preparacion,
      accionesFormulario(() => {
        if (!forma.reportValidity() || guardando) return
        guardando = true
        pedir('/api/cms/reuniones', { method: 'POST', body: JSON.stringify({ titulo: titulo.value, objetivo: objetivo.value, fecha_hora: fechaHora.value, lugar: lugar.value, equipo_id: equipo.value || null, unidad_id: unidad.value || null, proyecto_id: proyecto.value || null, preparacion: preparacion.value, frecuencia_reunion: frecuencia.value || null, repetir_hasta: repetirHasta.value || null }) })
          .then(() => { formularioAbierto = null; return cargar() })
          .catch((fallo) => { error = fallo.message; guardando = false; dibujar() })
      }, 'Agendar reunión'),
    )
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); forma.querySelector('.boton-principal').click() })
    return forma
  }

  function formularioEdicionReunion() {
    const reunion = datos.reuniones.find((fila) => fila.id === reunionAEditar)
    if (!reunion) return null
    const forma = document.createElement('form')
    forma.className = 'cms-captura cms-captura-reunion'
    const titulo = inputCms('', 'Título de la reunión'); titulo.required = true; titulo.maxLength = 180; titulo.value = reunion.titulo || ''
    const objetivo = inputCms('', 'Objetivo de la reunión'); objetivo.maxLength = 400; objetivo.value = reunion.objetivo || ''
    const fechaHora = inputCms('', 'Fecha y hora de la reunión', 'datetime-local'); fechaHora.required = true; fechaHora.value = reunion.fecha_hora || ''
    const lugar = inputCms('', 'Lugar de la reunión'); lugar.maxLength = 180; lugar.value = reunion.lugar || ''
    const equipo = selectorCms([['', 'Sin equipo'], ...datos.equipos.map((fila) => [fila.id, fila.nombre])], 'Equipo de la reunión'); equipo.value = reunion.equipo_id || ''
    const unidad = selectorCms([['', 'Sin programa o espacio'], ...datos.unidades.map((fila) => [fila.id, `${fila.sigla ? `${fila.sigla}: ` : ''}${fila.nombre}`])], 'Programa o espacio de la reunión'); unidad.value = reunion.unidad_id || ''
    const proyecto = selectorCms([['', 'Sin proyecto'], ...datos.proyectos.map((fila) => [fila.id, fila.titulo])], 'Proyecto de la reunión'); proyecto.value = reunion.proyecto_id || ''
    const estado = selectorCms(Object.entries(TEXTO_ESTADO_REUNION), 'Estado de la reunión'); estado.value = reunion.estado || 'planificada'
    const preparacion = areaCms('Temas, datos o materiales a preparar', 'Preparación de la reunión'); preparacion.value = reunion.preparacion || ''
    const minuta = areaCms('Qué pasó, quién estuvo y qué se acordó', 'Minuta de la reunión'); minuta.value = reunion.minuta || ''
    const resumen = areaCms('Resumen para encontrar esta reunión más adelante', 'Resumen de la reunión'); resumen.value = reunion.resumen || ''
    const detalles = elemento('div', ['cms-captura-detalles'])
    detalles.append(fechaHora, lugar, equipo, unidad, proyecto, estado)
    forma.append(
      elemento('h3', [], `Editar reunión: ${reunion.titulo}`),
      elemento('p', ['ayuda'], 'Dejá la preparación antes del encuentro y, al terminar, registrá la minuta, el resumen y los acuerdos.'),
      titulo,
      objetivo,
      detalles,
      elemento('label', ['cms-etiqueta-campo'], 'Preparación'), preparacion,
      elemento('label', ['cms-etiqueta-campo'], 'Minuta'), minuta,
      elemento('label', ['cms-etiqueta-campo'], 'Resumen'), resumen,
      accionesFormulario(() => {
        if (!forma.reportValidity() || guardando) return
        guardando = true
        pedir(`/api/cms/reuniones/${reunion.id}`, { method: 'PATCH', body: JSON.stringify({ titulo: titulo.value, objetivo: objetivo.value, fecha_hora: fechaHora.value, lugar: lugar.value, equipo_id: equipo.value || null, unidad_id: unidad.value || null, proyecto_id: proyecto.value || null, estado: estado.value, preparacion: preparacion.value, minuta: minuta.value, resumen: resumen.value }) })
          .then(() => { formularioAbierto = null; reunionAEditar = null; return cargar() })
          .catch((fallo) => { error = fallo.message; guardando = false; dibujar() })
      }, 'Guardar reunión'),
    )
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); forma.querySelector('.boton-principal').click() })
    return forma
  }

  function formularioDecision() {
    const reunion = datos.reuniones.find((fila) => fila.id === reunionDeDecision)
    if (!reunion) return null
    const forma = document.createElement('form')
    forma.className = 'cms-captura cms-captura-decision'
    const titulo = inputCms('Ej. Priorizar apoyo de transporte', 'Decisión')
    titulo.required = true; titulo.maxLength = 180
    const motivo = inputCms('Motivo o contexto de la decisión', 'Motivo de la decisión')
    motivo.maxLength = 4000
    const responsable = selectorCms([['', 'Sin responsable'], ...datos.responsables.map((fila) => [fila.correo, fila.nombre || fila.correo])], 'Responsable de la decisión')
    const estado = selectorCms([['vigente', 'Vigente'], ['a_revisar', 'A revisar'], ['superada', 'Superada']], 'Estado de la decisión')
    const detalles = elemento('div', ['cms-captura-detalles'])
    detalles.append(responsable, estado)
    forma.append(
      elemento('h3', [], `Registrar decisión: ${reunion.titulo}`),
      elemento('p', ['ayuda'], 'Después podés convertir este acuerdo en una tarea con el equipo y proyecto de la reunión.'),
      titulo,
      motivo,
      detalles,
      accionesFormulario(() => {
        if (!forma.reportValidity() || guardando) return
        guardando = true
        pedir(`/api/cms/reuniones/${reunion.id}/decisiones`, { method: 'POST', body: JSON.stringify({ titulo: titulo.value, motivo: motivo.value, responsable_correo: responsable.value || null, estado: estado.value }) })
          .then(() => { formularioAbierto = null; reunionDeDecision = null; return cargar() })
          .catch((fallo) => { error = fallo.message; guardando = false; dibujar() })
      }, 'Registrar decisión'),
    )
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); forma.querySelector('.boton-principal').click() })
    return forma
  }

  function formularioCierreReunion() {
    const reunion = datos.reuniones.find((fila) => fila.id === reunionDeCierre)
    if (!reunion) return null
    const forma = document.createElement('form'); forma.className = 'cms-captura cms-captura-reunion'
    const minuta = areaCms('Qué ocurrió, quién participó y qué temas se trataron', 'Minuta de la reunión'); minuta.required = true; minuta.value = reunion.minuta || ''
    const resumen = areaCms('Conclusión breve para encontrar y comprender este encuentro', 'Resumen de la reunión'); resumen.required = true; resumen.value = reunion.resumen || ''
    const proximaRevision = inputCms('', 'Próxima fecha de revisión', 'date')
    const lista = elemento('div', ['cms-checklist-items'])
    const acuerdos = []
    const actualizarEstadoAcuerdos = () => {
      const vacio = lista.querySelector('.cms-acuerdos-vacio')
      if (acuerdos.length) vacio?.remove()
      else if (!vacio) lista.appendChild(elemento('p', ['ayuda', 'cms-acuerdos-vacio'], 'No hay acuerdos para registrar. Podés cerrar la reunión solo con su minuta y resumen.'))
    }
    const agregarAcuerdo = () => {
      const acuerdo = {}; acuerdos.push(acuerdo)
      const fila = elemento('fieldset', ['cms-checklist-item'])
      const titulo = inputCms('Decisión o acuerdo', 'Título del acuerdo'); titulo.required = true
      const motivo = areaCms('Por qué se tomó y qué contexto debe conservarse', 'Motivo del acuerdo')
      const responsable = selectorCms([['', 'Sin responsable'], ...datos.responsables.map((persona) => [persona.correo, persona.nombre || persona.correo])], 'Responsable del acuerdo')
      const fecha = inputCms('', 'Fecha límite de la tarea', 'date')
      const crearCaja = elemento('label', ['cms-configurador-requerido']); const crear = document.createElement('input'); crear.type = 'checkbox'; crear.checked = true
      crearCaja.append(crear, document.createTextNode(' Crear una tarea para ejecutar este acuerdo'))
      const quitar = boton('Quitar acuerdo', () => { acuerdos.splice(acuerdos.indexOf(acuerdo), 1); fila.remove(); actualizarEstadoAcuerdos() })
      Object.assign(acuerdo, { titulo, motivo, responsable, fecha, crear })
      fila.append(titulo, motivo, responsable, fecha, crearCaja, quitar); lista.appendChild(fila); actualizarEstadoAcuerdos()
    }
    actualizarEstadoAcuerdos()
    const agregar = boton('Agregar un acuerdo', agregarAcuerdo)
    const acciones = elemento('div', ['cms-captura-acciones'])
    const cancelar = boton('Cancelar', () => { formularioAbierto = null; reunionDeCierre = null; dibujar() })
    const guardar = boton('Cerrar reunión y guardar acuerdos', async () => {
      if (guardando || !forma.reportValidity()) return
      guardando = true; guardar.disabled = true
      const cuerpo = { minuta: minuta.value, resumen: resumen.value, proxima_revision: proximaRevision.value || null, acuerdos: acuerdos.map((fila) => ({ titulo: fila.titulo.value, motivo: fila.motivo.value, responsable_correo: fila.responsable.value || null, estado: 'vigente', crear_tarea: fila.crear.checked, fecha_limite: fila.fecha.value || null })) }
      try { await pedir(`/api/cms/reuniones/${reunion.id}/cierre`, { method: 'POST', body: JSON.stringify(cuerpo) }); formularioAbierto = null; reunionDeCierre = null; await cargar() } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
    }, ['boton-principal']); guardar.type = 'submit'
    acciones.append(cancelar, guardar)
    forma.append(elemento('h3', [], `Cerrar reunión: ${reunion.titulo}`), elemento('p', ['ayuda'], 'Registrá la memoria del encuentro. Cada acuerdo queda como decisión y, si corresponde, también como tarea con responsable y fecha.'), minuta, resumen, campoCms('Próxima revisión', proximaRevision), elemento('h4', [], 'Acuerdos y decisiones'), lista, agregar, acciones)
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); guardar.click() })
    return forma
  }

  function panelEstructura() {
    const estructura = elemento('section', ['cms-estructura'])
    const encabezado = elemento('div', ['cms-seccion-encabezado'])
    const texto = elemento('div', [])
    texto.append(elemento('h3', [], 'Equipos, comisiones y proyectos'), elemento('p', ['ayuda'], 'Definí qué unidad impulsa cada línea de trabajo. Las comisiones comparten el mismo mapa de responsabilidades, sin duplicar personas ni permisos.'))
    const acciones = elemento('div', ['cms-seccion-acciones'])
    acciones.append(
      boton('Nuevo equipo', () => { formularioAbierto = formularioAbierto === 'equipo' ? null : 'equipo'; dibujar() }),
      boton('Nuevo proyecto', () => { formularioAbierto = formularioAbierto === 'proyecto' ? null : 'proyecto'; dibujar() }),
    )
    encabezado.append(texto, acciones)
    const lista = elemento('div', ['cms-estructura-lista'])
    if (datos.proyectos.length) {
      datos.proyectos.slice(0, 6).forEach((proyecto) => {
        const tarjeta = elemento('article', ['cms-proyecto'])
        const accionesProyecto = elemento('div', ['cms-proyecto-acciones'])
        accionesProyecto.appendChild(boton('Editar proyecto', () => { proyectoAEditar = proyecto.id; formularioAbierto = 'editar-proyecto'; dibujar() }))
        accionesProyecto.appendChild(boton('Gestionar riesgos', () => { proyectoDeRiesgo = proyecto.id; formularioAbierto = null; dibujar() }))
        accionesProyecto.appendChild(boton('Ver seguimiento', () => abrirSeguimientoProyecto(proyecto.id)))
        const riesgosAbiertos = datos.riesgos.filter((riesgo) => riesgo.proyecto_id === proyecto.id && riesgo.estado !== 'mitigado')
        const seguimiento = [
          TEXTO_ESTADO_PROYECTO[proyecto.estado] || 'En marcha',
          proyecto.fecha_inicio ? `Inicio ${fechaHumana(proyecto.fecha_inicio)}` : '',
          proyecto.fecha_fin ? `Meta ${fechaHumana(proyecto.fecha_fin)}` : 'Sin fecha objetivo',
          proyecto.presupuesto !== null && proyecto.presupuesto !== undefined ? `$${new Intl.NumberFormat('es-UY').format(proyecto.presupuesto)} UYU` : '',
          proyecto.presupuesto !== null && proyecto.presupuesto !== undefined ? `Ejecutado $${new Intl.NumberFormat('es-UY').format(proyecto.presupuesto_ejecutado || 0)} UYU` : '',
        ].filter(Boolean).join(' · ')
        tarjeta.append(
          elemento('strong', [], proyecto.titulo),
          elemento('span', ['cms-proyecto-meta'], `${proyecto.equipo_nombre || 'Sin equipo'} · ${proyecto.responsable_nombre || 'Sin responsable'}`),
          elemento('span', ['cms-proyecto-fecha'], seguimiento),
          elemento('span', ['cms-proyecto-riesgos', riesgosAbiertos.some((riesgo) => ['alto', 'critico'].includes(riesgo.nivel)) ? 'cms-proyecto-riesgos-atencion' : ''], `${riesgosAbiertos.length} ${riesgosAbiertos.length === 1 ? 'riesgo abierto' : 'riesgos abiertos'}`),
          elemento('span', ['cms-proyecto-hitos'], `${proyecto.hitos_completados || 0} de ${proyecto.hitos_total || 0} hitos completados`),
          proyecto.notas ? elemento('span', ['cms-proyecto-notas'], proyecto.notas) : document.createDocumentFragment(),
          accionesProyecto,
        )
        lista.appendChild(tarjeta)
      })
    } else lista.appendChild(elemento('p', ['ayuda'], 'Todavía no hay proyectos. Creá el primero para ordenar las próximas tareas.'))
    const equipos = elemento('div', ['cms-equipos-lista'])
    datos.equipos.forEach((equipo) => {
      const tarjeta = elemento('article', ['cms-equipo'])
      const roles = datos.responsabilidades.filter((fila) => fila.equipo_id === equipo.id)
      const rutinas = datos.recurrencias.filter((fila) => fila.equipo_id === equipo.id)
      const encabezadoEquipo = elemento('div', ['cms-equipo-encabezado'])
      encabezadoEquipo.append(
        elemento('strong', [], equipo.nombre),
        boton('Abrir rama', () => { equipoAbiertoId = equipo.id; formularioAbierto = 'ver-equipo'; dibujar() }),
      )
      if (datos.alcance?.global) {
        encabezadoEquipo.append(
          boton('Configurar equipo', () => { equipoAEditar = equipo.id; formularioAbierto = 'equipo'; dibujar() }),
          boton('Gestionar integrantes', () => { equipoDeResponsabilidad = equipo.id; formularioAbierto = 'responsabilidad'; dibujar() }),
        )
      }
      const detalle = roles.length
        ? roles.map((rol) => `${TEXTO_RESPONSABILIDAD[rol.tipo]}: ${rol.usuario_nombre || rol.usuario_correo}`).join(' · ')
        : 'Sin responsabilidades asignadas'
      const operativo = [
        equipo.frecuencia_reunion ? `Reunión ${equipo.frecuencia_reunion === 'segun_necesidad' ? 'según necesidad' : equipo.frecuencia_reunion}` : '',
        equipo.informa_a ? `Informa a ${equipo.informa_a}` : '',
      ].filter(Boolean).join(' · ')
      tarjeta.append(
        encabezadoEquipo,
        elemento('span', ['cms-equipo-meta'], TEXTO_CATEGORIA_EQUIPO[equipo.categoria] || 'Equipo'),
        equipo.descripcion ? elemento('span', ['cms-equipo-proposito'], equipo.descripcion) : document.createDocumentFragment(),
        elemento('span', ['cms-equipo-meta'], detalle),
        operativo ? elemento('span', ['cms-equipo-meta'], operativo) : document.createDocumentFragment(),
        equipo.decisiones_permitidas ? elemento('span', ['cms-equipo-operacion'], `Puede decidir: ${equipo.decisiones_permitidas}`) : document.createDocumentFragment(),
        equipo.debe_escalar ? elemento('span', ['cms-equipo-operacion'], `Escala: ${equipo.debe_escalar}`) : document.createDocumentFragment(),
        rutinas.length ? elemento('span', ['cms-equipo-rutinas'], `Rutinas: ${rutinas.map((rutina) => rutina.titulo).join(' · ')}`) : document.createDocumentFragment(),
      )
      equipos.appendChild(tarjeta)
    })
    estructura.append(encabezado, lista, elemento('h4', ['cms-equipos-titulo'], 'Responsabilidades de unidades institucionales'), equipos)
    return estructura
  }

  function panelEquipoAbierto() {
    const equipo = datos.equipos.find((fila) => fila.id === equipoAbiertoId)
    if (!equipo) return null
    const abiertas = datos.tareas.filter((fila) => fila.equipo_id === equipo.id && !['completada', 'cancelada'].includes(fila.estado))
    const proyectos = datos.proyectos.filter((fila) => fila.equipo_id === equipo.id)
    const unidades = datos.unidades.filter((fila) => fila.equipo_id === equipo.id || (fila.vistas || []).some((vista) => vista.equipo_id === equipo.id))
    const responsables = datos.responsabilidades.filter((fila) => fila.equipo_id === equipo.id && fila.activo !== false)
    const reuniones = datos.reuniones.filter((fila) => fila.equipo_id === equipo.id)
    const panel = elemento('section', ['cms-captura', 'cms-captura-rama'])
    panel.style.setProperty('--rama-color', equipo.color || '#6d3087')
    panel.append(
      elemento('span', ['cms-panel-etiqueta'], TEXTO_CATEGORIA_EQUIPO[equipo.categoria] || (equipo.clave === 'interinstitucional' ? 'Articulación transversal' : 'Rama institucional')),
      elemento('h3', [], equipo.nombre),
      elemento('p', ['ayuda'], equipo.proposito || equipo.descripcion || 'Espacio de coordinación y seguimiento institucional.'),
    )
    const resumen = elemento('div', ['cms-rama-resumen'])
    ;[[abiertas.length, 'tareas abiertas'], [proyectos.length, 'proyectos'], [unidades.length, 'espacios'], [reuniones.length, 'reuniones']].forEach(([cantidad, etiqueta]) => {
      resumen.append(elemento('span', [], elemento('strong', [], String(cantidad)), document.createTextNode(etiqueta)))
    })
    panel.appendChild(resumen)
    const columnas = elemento('div', ['cms-rama-columnas'])
    const personas = elemento('div', ['cms-rama-lista'])
    personas.appendChild(elemento('h4', [], 'Responsabilidades'))
    if (responsables.length) responsables.forEach((fila) => personas.append(elemento('p', [], elemento('strong', [], fila.usuario_nombre || fila.usuario_correo), document.createTextNode(` · ${TEXTO_RESPONSABILIDAD[fila.tipo] || fila.tipo}`))))
    else personas.appendChild(elemento('p', ['ayuda'], 'Todavía no hay responsables asignados.'))
    const actividad = elemento('div', ['cms-rama-lista'])
    actividad.appendChild(elemento('h4', [], 'Actividad abierta'))
    if (abiertas.length) abiertas.slice(0, 5).forEach((tarea) => actividad.appendChild(boton(tarea.titulo, () => abrirContextoTarea(tarea.id))))
    else actividad.appendChild(elemento('p', ['ayuda'], 'No hay tareas abiertas en esta rama.'))
    columnas.append(personas, actividad)
    panel.appendChild(columnas)
    if (unidades.length) {
      const espacios = elemento('div', ['cms-rama-espacios'])
      espacios.appendChild(elemento('h4', [], 'Programas y espacios vinculados'))
      unidades.forEach((unidad) => {
        const abrir = boton(unidad.sigla ? `${unidad.sigla}: ${unidad.nombre}` : unidad.nombre, () => abrirUnidad(unidad))
        abrir.setAttribute('aria-label', `Abrir ${unidad.nombre}`)
        espacios.appendChild(abrir)
      })
      panel.appendChild(espacios)
    }
    const acciones = elemento('div', ['cms-captura-acciones'])
    acciones.appendChild(boton('Cerrar', () => { formularioAbierto = null; equipoAbiertoId = null; dibujar() }))
    if (datos.alcance?.puede_gestionar) acciones.appendChild(boton('Crear tarea en esta rama', () => { capturaOrientada = { equipo_id: equipo.id }; formularioAbierto = 'tarea'; dibujar() }, ['boton-principal']))
    if (datos.alcance?.global) acciones.appendChild(boton('Configurar rama', () => { equipoAEditar = equipo.id; formularioAbierto = 'equipo'; dibujar() }))
    panel.appendChild(acciones)
    return panel
  }

  function panelRiesgosProyecto() {
    const proyecto = datos.proyectos.find((fila) => fila.id === proyectoDeRiesgo)
    if (!proyecto) return document.createDocumentFragment()
    const seccion = elemento('section', ['cms-riesgos-proyecto'])
    const encabezado = elemento('div', ['cms-seccion-encabezado'])
    const texto = elemento('div', [])
    texto.append(
      elemento('h3', [], `Riesgos: ${proyecto.titulo}`),
      elemento('p', ['ayuda'], 'Priorizá los riesgos que pueden frenar el proyecto y mantené una fecha de revisión.'),
    )
    encabezado.append(texto, boton('Agregar riesgo', () => { formularioAbierto = 'riesgo'; dibujar() }))
    const lista = elemento('div', ['cms-riesgos-lista'])
    const riesgos = datos.riesgos.filter((riesgo) => riesgo.proyecto_id === proyecto.id)
    if (!riesgos.length) lista.appendChild(elemento('p', ['ayuda'], 'No hay riesgos abiertos para este proyecto.'))
    riesgos.forEach((riesgo) => {
      const tarjeta = elemento('article', ['cms-riesgo', `cms-riesgo-${riesgo.nivel}`])
      const superior = elemento('div', ['cms-riesgo-encabezado'])
      superior.append(elemento('strong', [], riesgo.titulo), elemento('span', ['cms-estado'], `${riesgo.nivel} · ${riesgo.estado}`))
      const meta = [riesgo.responsable_nombre || riesgo.responsable_correo || 'Sin responsable', riesgo.fecha_revision ? `Revisar ${fechaHumana(riesgo.fecha_revision)}` : 'Sin fecha de revisión'].join(' · ')
      const acciones = elemento('div', ['cms-riesgo-acciones'])
      if (riesgo.estado === 'abierto') acciones.appendChild(boton('Marcar mitigado', async () => {
        if (guardando) return
        guardando = true
        try { await pedir(`/api/cms/riesgos/${riesgo.id}`, { method: 'PATCH', body: JSON.stringify({ estado: 'mitigado' }) }); await cargar() } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
      }))
      tarjeta.append(superior, elemento('span', ['cms-riesgo-meta'], meta), riesgo.descripcion ? elemento('span', ['cms-proyecto-notas'], riesgo.descripcion) : document.createDocumentFragment(), acciones)
      lista.appendChild(tarjeta)
    })
    seccion.append(encabezado, lista)
    return seccion
  }

  function panelSeguimientoProyecto() {
    const proyecto = datos.proyectos.find((fila) => fila.id === proyectoDeSeguimiento)
    if (!proyecto) return document.createDocumentFragment()
    const contexto = contextoProyecto?.proyecto?.id === proyecto.id ? contextoProyecto : datos
    const seccion = elemento('section', ['cms-seguimiento-proyecto'])
    const encabezado = elemento('div', ['cms-seccion-encabezado'])
    const texto = elemento('div', [])
    const presupuesto = Number(proyecto.presupuesto || 0)
    const ejecutado = Number(proyecto.presupuesto_ejecutado || 0)
    const saldo = Math.max(0, presupuesto - ejecutado)
    texto.append(
      elemento('h3', [], `Seguimiento: ${proyecto.titulo}`),
      elemento('p', ['ayuda'], presupuesto ? `Presupuesto $${new Intl.NumberFormat('es-UY').format(presupuesto)} UYU, ejecutado $${new Intl.NumberFormat('es-UY').format(ejecutado)} UYU, disponible $${new Intl.NumberFormat('es-UY').format(saldo)} UYU.` : `Ejecutado $${new Intl.NumberFormat('es-UY').format(ejecutado)} UYU. Agregá presupuesto al proyecto para ver el disponible.`),
    )
    const acciones = elemento('div', ['cms-seccion-acciones'])
    acciones.append(boton('Agregar hito', () => { formularioAbierto = 'hito'; dibujar() }), boton('Registrar gasto', () => { formularioAbierto = 'gasto'; dibujar() }), boton('Cerrar seguimiento', () => { proyectoDeSeguimiento = null; contextoProyecto = null; formularioAbierto = null; dibujar() }))
    encabezado.append(texto, acciones)
    const hitos = (contexto.hitos || []).filter((hito) => hito.proyecto_id === proyecto.id)
    const gastos = (contexto.gastos || []).filter((gasto) => gasto.proyecto_id === proyecto.id)
    const columnas = elemento('div', ['cms-seguimiento-columnas'])
    const columnaHitos = elemento('div', ['cms-seguimiento-lista'])
    columnaHitos.appendChild(elemento('h4', [], 'Hitos'))
    if (hitos.length) hitos.forEach((hito) => {
      const tarjeta = elemento('article', ['cms-seguimiento-item'])
      tarjeta.append(elemento('strong', [], hito.titulo), elemento('span', [], [hito.estado.replace('_', ' '), hito.fecha_objetivo ? fechaHumana(hito.fecha_objetivo) : 'Sin fecha', hito.responsable_nombre || 'Sin responsable'].join(' · ')), hito.descripcion ? elemento('small', [], hito.descripcion) : document.createDocumentFragment())
      columnaHitos.appendChild(tarjeta)
    })
    else {
      columnaHitos.appendChild(elemento('p', ['ayuda'], 'Todavía no hay hitos. Agregá el próximo resultado verificable.'))
      columnaHitos.appendChild(boton('Agregar primer hito', () => { formularioAbierto = 'hito'; dibujar() }))
    }
    const columnaGastos = elemento('div', ['cms-seguimiento-lista'])
    columnaGastos.appendChild(elemento('h4', [], 'Gastos registrados'))
    if (gastos.length) gastos.forEach((gasto) => {
      const tarjeta = elemento('article', ['cms-seguimiento-item'])
      tarjeta.append(elemento('strong', [], gasto.concepto), elemento('span', [], `$${new Intl.NumberFormat('es-UY').format(gasto.monto)} UYU · ${fechaHumana(gasto.fecha)}`), gasto.notas ? elemento('small', [], gasto.notas) : document.createDocumentFragment())
      columnaGastos.appendChild(tarjeta)
    })
    else columnaGastos.appendChild(elemento('p', ['ayuda'], 'Todavía no hay gastos registrados.'))
    columnas.append(columnaHitos, columnaGastos)
    const vinculos = elemento('div', ['cms-seguimiento-vinculos'])
    const tarjetaVinculo = (titulo, detalle, extra = '') => {
      const tarjeta = elemento('article', ['cms-seguimiento-item'])
      tarjeta.append(elemento('strong', [], titulo), elemento('span', [], detalle), extra ? elemento('small', [], extra) : document.createDocumentFragment())
      return tarjeta
    }
    const agregarVinculo = (titulo, filas, crear, accionVacia = null) => {
      const bloque = elemento('section', ['cms-seguimiento-lista'])
      bloque.appendChild(elemento('h4', [], titulo))
      if (filas.length) filas.forEach((fila) => bloque.appendChild(crear(fila)))
      else {
        bloque.appendChild(elemento('p', ['ayuda'], 'Todavía no hay elementos vinculados.'))
        if (accionVacia) bloque.appendChild(boton(accionVacia.etiqueta, accionVacia.alPulsar))
      }
      vinculos.appendChild(bloque)
    }
    agregarVinculo('Tareas', (contexto.tareas || []).filter((tarea) => tarea.proyecto_id === proyecto.id), (tarea) => tarjetaVinculo(tarea.titulo, [tarea.estado.replace('_', ' '), tarea.fecha_limite ? fechaHumana(tarea.fecha_limite) : 'Sin fecha', tarea.responsable_nombre || 'Sin responsable'].join(' · '), tarea.descripcion), { etiqueta: 'Agregar primera tarea', alPulsar: () => { proyectoPreseleccionado = proyecto.id; formularioAbierto = 'tarea'; dibujar() } })
    agregarVinculo('Actividades', (contexto.eventos || []).filter((evento) => evento.proyecto_id === proyecto.id), (evento) => tarjetaVinculo(evento.titulo, [evento.estado, fechaHoraProgramadaHumana(evento.fecha_hora), evento.lugar].filter(Boolean).join(' · '), evento.descripcion), { etiqueta: 'Agregar actividad', alPulsar: () => { proyectoPreseleccionado = proyecto.id; formularioAbierto = 'evento'; dibujar() } })
    agregarVinculo('Decisiones', contexto.decisiones || [], (decision) => tarjetaVinculo(decision.titulo, [decision.estado, decision.reunion_titulo || 'Sin reunión', decision.responsable_nombre || 'Sin responsable'].join(' · '), decision.motivo))
    agregarVinculo('Recursos y documentos', (contexto.documentos || []).filter((documento) => documento.proyecto_id === proyecto.id), (documento) => {
      const tarjeta = tarjetaVinculo(documento.titulo, [documento.tipo, documento.sensibilidad].join(' · '), documento.descripcion)
      if (documento.url) {
        const enlace = document.createElement('a'); enlace.href = documento.url; enlace.target = '_blank'; enlace.rel = 'noreferrer'; enlace.textContent = 'Abrir recurso'; enlace.className = 'cms-recurso-enlace'; tarjeta.appendChild(enlace)
      }
      return tarjeta
    }, { etiqueta: 'Agregar recurso', alPulsar: () => { proyectoPreseleccionado = proyecto.id; formularioAbierto = 'documento'; dibujar() } })
    seccion.append(encabezado, columnas, vinculos)
    return seccion
  }

  function formularioPrograma(programa = null) {
    const forma = document.createElement('form'); forma.className = 'cms-captura'
    const nombre = inputCms('Ej. Familias y comunidad', 'Nombre del programa'); nombre.required = true; nombre.maxLength = 180; nombre.value = programa?.nombre || ''
    const descripcion = areaCms('Propósito, población o propuesta del programa', 'Descripción del programa'); descripcion.value = programa?.descripcion || ''
    const estado = selectorCms([['activo', 'Activo'], ['borrador', 'Borrador'], ['en_pausa', 'En pausa'], ['cerrado', 'Cerrado']], 'Estado del programa')
    const equipo = selectorCms([['', 'Sin equipo'], ...datos.equipos.map((fila) => [fila.id, fila.nombre])], 'Equipo del programa')
    estado.value = programa?.estado || 'activo'; equipo.value = programa?.equipo_id || ''
    const detalles = elemento('div', ['cms-captura-detalles']); detalles.append(estado, equipo)
    forma.append(elemento('h3', [], programa ? `Editar programa: ${programa.nombre}` : 'Nuevo programa'), nombre, detalles, elemento('label', ['cms-etiqueta-campo'], 'Propósito'), descripcion, accionesFormulario(() => {
      if (!forma.reportValidity() || guardando) return
      guardando = true
      const cuerpo = { nombre: nombre.value, descripcion: descripcion.value, estado: estado.value, equipo_id: equipo.value || null }
      pedir(programa ? `/api/cms/programas/${programa.id}` : '/api/cms/programas', { method: programa ? 'PATCH' : 'POST', body: JSON.stringify(cuerpo) })
        .then(() => { formularioAbierto = null; programaAEditar = null; return cargar() })
        .catch((fallo) => { error = fallo.message; guardando = false; dibujar() })
    }, programa ? 'Guardar programa' : 'Crear programa'))
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); forma.querySelector('.boton-principal').click() })
    return forma
  }

  function panelProgramas() {
    const programas = elemento('section', ['cms-programas'])
    const encabezado = elemento('div', ['cms-seccion-encabezado'])
    const descripcion = elemento('div', [])
    descripcion.append(
      elemento('h3', [], 'Programas'),
      elemento('p', ['ayuda'], 'Los espacios de trabajo donde se organiza la actividad de Aletea, más allá de un programa puntual.'),
    )
    encabezado.append(descripcion, boton('Nuevo programa', () => { formularioAbierto = formularioAbierto === 'programa' ? null : 'programa'; programaAEditar = null; dibujar() }))
    const fsb = elemento('article', ['cms-programa']); const textoFsb = elemento('div', [])
    textoFsb.append(elemento('p', ['cms-programa-sobrelinea'], 'Programa operativo'), elemento('strong', [], 'Fútbol sin Barreras'), elemento('span', [], 'Planillas, personas, asistencias, agenda y reportes del programa.'))
    fsb.append(textoFsb, enlaceA('operacion', 'Abrir Fútbol sin Barreras')); programas.append(encabezado, fsb)
    if (datos.programas.length) datos.programas.forEach((programa) => {
      const tarjeta = elemento('article', ['cms-programa']); const texto = elemento('div', [])
      texto.append(elemento('p', ['cms-programa-sobrelinea'], programa.estado.replace('_', ' ')), elemento('strong', [], programa.nombre), elemento('span', [], [programa.descripcion, programa.equipo_nombre].filter(Boolean).join(' · ') || 'Sin descripción aún.'))
      const acciones = elemento('div', ['cms-reunion-acciones'])
      if (datos.alcance?.puede_gestionar) acciones.appendChild(boton('Editar programa', () => { programaAEditar = programa.id; formularioAbierto = 'editar-programa'; dibujar() }))
      tarjeta.append(texto, acciones); programas.appendChild(tarjeta)
    })
    return programas
  }

  function formularioUnidad(unidad = null) {
    const forma = document.createElement('form'); forma.className = 'cms-captura cms-captura-unidad'
    const nombre = inputCms('Ej. Grupo Apoyo Familias', 'Nombre de la unidad'); nombre.required = true; nombre.maxLength = 180; nombre.value = unidad?.nombre || ''
    const sigla = inputCms('Ej. GAF', 'Sigla'); sigla.maxLength = 30; sigla.value = unidad?.sigla || ''
    const clave = inputCms('Ej. gaf', 'Clave interna'); clave.required = true; clave.maxLength = 80; clave.value = unidad?.clave || ''
    const descripcion = areaCms('Explicá qué hace esta unidad y a quién acompaña.', 'Descripción de la unidad'); descripcion.value = unidad?.descripcion || ''
    const tipo = selectorCms([['programa', 'Programa'], ['formacion', 'Formación'], ['canal', 'Canal de comunicación'], ['proceso', 'Proceso administrativo']], 'Tipo de unidad')
    const estado = selectorCms([['activa', 'Activa'], ['borrador', 'Borrador'], ['en_pausa', 'En pausa'], ['archivada', 'Archivada']], 'Estado de la unidad')
    const equipo = selectorCms(datos.equipos.filter((fila) => fila.categoria === 'equipo' || !fila.categoria).map((fila) => [fila.id, fila.nombre]), 'Área responsable')
    const padre = selectorCms([['', 'Sin unidad superior'], ...datos.unidades.filter((fila) => fila.id !== unidad?.id).map((fila) => [fila.id, `${fila.sigla ? `${fila.sigla}: ` : ''}${fila.nombre}`])], 'Unidad superior')
    const color = inputCms('#6d3087', 'Color de la unidad'); color.type = 'color'; color.value = unidad?.color || '#6d3087'
    const orden = inputCms('0', 'Orden dentro del área'); orden.type = 'number'; orden.min = '0'; orden.max = '9999'; orden.value = String(unidad?.orden ?? 0)
    const vistas = elemento('fieldset', ['cms-vistas-unidad'])
    vistas.append(elemento('legend', [], 'Aparece también en'), elemento('p', ['ayuda'], 'Agregá solamente las áreas que necesitan trabajar con esta unidad. La información y el historial siguen siendo únicos.'))
    const selectoresVistas = new Map()
    const opcionesVista = [['', 'No mostrar'], ['operativo', 'Vista operativa'], ['financiero', 'Vista financiera'], ['comunicacion', 'Vista de comunicación']]
    const reconstruirVistas = () => {
      vistas.querySelectorAll('.cms-vista-unidad-fila').forEach((fila) => fila.remove())
      selectoresVistas.clear()
      const disponibles = datos.equipos.filter((fila) => (fila.categoria === 'equipo' || !fila.categoria) && fila.id !== equipo.value)
      const elegidas = new Map((unidad?.vistas || []).map((vista) => [vista.equipo_id, vista.enfoque]))
      const agregarFila = (fila, enfoque = 'operativo') => {
        if (!fila || selectoresVistas.has(fila.id)) return
        const selector = selectorCms(opcionesVista, `Vista compartida en ${fila.nombre}`)
        selector.value = enfoque
        const quitar = boton('Quitar', () => { contenedor.remove(); selectoresVistas.delete(fila.id); actualizarAgregar() }, ['cms-vista-unidad-quitar'])
        quitar.setAttribute('aria-label', `Quitar vista compartida en ${fila.nombre}`)
        const contenedor = elemento('div', ['cms-vista-unidad-fila'])
        contenedor.append(elemento('strong', [], fila.nombre), selector, quitar)
        vistas.insertBefore(contenedor, agregar)
        selectoresVistas.set(fila.id, selector)
      }
      const agregar = elemento('div', ['cms-vista-unidad-agregar'])
      const areaNueva = selectorCms([], 'Área para compartir la unidad')
      const controlAgregar = boton('Agregar otra área', () => {
        const fila = disponibles.find((candidata) => candidata.id === areaNueva.value)
        agregarFila(fila)
        actualizarAgregar()
      })
      const actualizarAgregar = () => {
        const restantes = disponibles.filter((fila) => !selectoresVistas.has(fila.id))
        areaNueva.replaceChildren(...restantes.map((fila) => {
          const opcion = document.createElement('option'); opcion.value = fila.id; opcion.textContent = fila.nombre; return opcion
        }))
        agregar.hidden = !restantes.length
      }
      agregar.append(areaNueva, controlAgregar)
      vistas.appendChild(agregar)
      disponibles.filter((fila) => elegidas.has(fila.id)).forEach((fila) => agregarFila(fila, elegidas.get(fila.id)))
      actualizarAgregar()
    }
    tipo.value = unidad?.tipo || 'programa'; estado.value = unidad?.estado || 'activa'; equipo.value = unidad?.equipo_id || ''; padre.value = unidad?.unidad_padre_id || ''; reconstruirVistas(); equipo.addEventListener('change', reconstruirVistas)
    const detalles = elemento('div', ['cms-captura-detalles']); detalles.append(tipo, estado, equipo, padre, campoCms('Color', color), campoCms('Orden', orden))
    forma.append(elemento('h3', [], unidad ? `Editar unidad: ${unidad.nombre}` : 'Nueva unidad operativa'), elemento('p', ['ayuda'], 'Una unidad reúne tareas, documentos, formularios y proyectos sin convertirse en un equipo nuevo.'), campoCms('Nombre', nombre), campoCms('Sigla', sigla), campoCms('Clave interna', clave, 'Se normaliza automáticamente y no debe repetirse.'), detalles, campoCms('Descripción', descripcion), vistas, accionesFormulario(() => {
      if (!forma.reportValidity() || guardando) return
      guardando = true
      const cuerpo = { nombre: nombre.value, sigla: sigla.value, clave: clave.value, descripcion: descripcion.value, tipo: tipo.value, estado: estado.value, equipo_id: equipo.value, unidad_padre_id: padre.value || null, color: color.value, orden: Number(orden.value) }
      const vistasElegidas = [...selectoresVistas.entries()].filter(([, selector]) => selector.value).map(([equipo_id, selector]) => ({ equipo_id, enfoque: selector.value }))
      pedir(unidad ? `/api/cms/unidades/${unidad.id}` : '/api/cms/unidades', { method: unidad ? 'PATCH' : 'POST', body: JSON.stringify(cuerpo) })
        .then((respuesta) => pedir(`/api/cms/unidades/${unidad?.id || respuesta.unidad.id}/vistas`, { method: 'PUT', body: JSON.stringify({ vistas: vistasElegidas }) }))
        .then(() => { formularioAbierto = null; unidadAEditar = null; return cargar() })
        .catch((fallo) => { error = fallo.message; guardando = false; dibujar() })
    }, unidad ? 'Guardar unidad' : 'Crear unidad'))
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); forma.querySelector('.boton-principal').click() })
    return forma
  }

  function unidadesDeArea(claveArea) {
    const equipo = equipoFundacionalCms(datos.equipos, claveArea)
    if (!equipo) return []
    return datos.unidades.filter((unidad) => unidad.equipo_id === equipo.id || (unidad.vistas || []).some((vista) => vista.equipo_id === equipo.id))
  }

  function abrirUnidad(unidad) {
    if (['fsb', 'futbol_sin_barreras'].includes(String(unidad.clave || '').toLocaleLowerCase('es'))) {
      alIrA('operacion')
      return
    }
    unidadAbiertaId = unidad.id
    pestanaUnidad = 'resumen'
    formularioAbierto = 'ver-unidad'
    dibujar()
  }

  function panelUnidadAbierta() {
    const unidad = datos.unidades.find((fila) => fila.id === unidadAbiertaId)
    if (!unidad) return null
    const panel = elemento('section', ['cms-captura', 'cms-captura-unidad-resumen', 'cms-captura-resumen-compacto'])
    const tareas = datos.tareas.filter((fila) => fila.unidad_id === unidad.id && !['completada', 'cancelada'].includes(fila.estado))
    const proyectos = datos.proyectos.filter((fila) => fila.unidad_id === unidad.id)
    const eventos = datos.eventos.filter((fila) => fila.unidad_id === unidad.id)
    const formularios = datos.formularios.filter((fila) => fila.unidad_id === unidad.id)
    const documentos = datos.documentos.filter((fila) => fila.unidad_id === unidad.id)
    const equipo = datos.equipos.find((fila) => fila.id === unidad.equipo_id)
    const unidadPadre = datos.unidades.find((fila) => fila.id === unidad.unidad_padre_id)
    const cerrar = () => { formularioAbierto = null; unidadAbiertaId = null; pestanaUnidad = 'resumen'; dibujar() }
    panel.style.setProperty('--unidad-color', unidad.color || '#6d3087')
    const encabezado = elemento('header', ['cms-unidad-resumen-encabezado'])
    const identidad = elemento('div', ['cms-unidad-resumen-identidad'])
    const tituloIdentidad = elemento('div', [])
    tituloIdentidad.append(
      elemento('span', ['cms-panel-etiqueta'], equipo ? `Dentro de ${equipo.nombre}` : 'Unidad operativa'),
      elemento('h3', [], unidad.nombre),
    )
    identidad.append(
      elemento('span', ['cms-unidad-resumen-sigla'], unidad.sigla || 'Unidad'),
      tituloIdentidad,
    )
    const cerrarArriba = boton('Cerrar', cerrar, ['cms-unidad-cerrar'])
    cerrarArriba.setAttribute('aria-label', `Cerrar ficha de ${unidad.nombre}`)
    encabezado.append(identidad, cerrarArriba)
    const contexto = elemento('div', ['cms-unidad-resumen-contexto'])
    contexto.append(
      elemento('span', [], TEXTO_TIPO_UNIDAD[unidad.tipo] || 'Unidad'),
      elemento('span', [], TEXTO_ESTADO_UNIDAD[unidad.estado] || 'Estado sin definir'),
    )
    if (unidadPadre) contexto.appendChild(elemento('span', [], `Depende de ${unidadPadre.sigla || unidadPadre.nombre}`))
    const vistas = (unidad.vistas || []).map((vista) => datos.equipos.find((fila) => fila.id === vista.equipo_id)?.nombre).filter(Boolean)
    if (vistas.length) contexto.appendChild(elemento('span', [], `También visible en ${vistas.join(', ')}`))
    panel.append(encabezado, contexto, elemento('p', ['cms-unidad-resumen-descripcion'], unidad.descripcion || 'Espacio de trabajo institucional para coordinar tareas, proyectos y recursos.'))
    const resumen = elemento('div', ['cms-unidad-resumen-datos'])
    ;[[tareas.length, 'Tareas abiertas'], [proyectos.length, 'Proyectos'], [eventos.length, 'Actividades'], [formularios.length, 'Formularios'], [documentos.length, 'Documentos']].forEach(([cantidad, etiqueta]) => {
      const dato = elemento('span', [])
      dato.append(elemento('strong', [], String(cantidad)), elemento('small', [], etiqueta))
      resumen.appendChild(dato)
    })
    panel.appendChild(resumen)
    const cerradas = datos.tareas.filter((fila) => fila.unidad_id === unidad.id && ['completada', 'cancelada'].includes(fila.estado))
    const personas = datos.responsabilidades.filter((fila) => fila.equipo_id === unidad.equipo_id && fila.activo !== false)
    const pestanas = [
      ['resumen', 'Resumen'], ['tareas', `Tareas (${tareas.length})`], ['proyectos', `Proyectos (${proyectos.length})`],
      ['personas', `Personas (${personas.length})`], ['formularios', `Formularios (${formularios.length})`],
      ['documentos', `Documentos (${documentos.length})`], ['historial', `Historial (${cerradas.length})`],
    ]
    const navegacionPestanas = elemento('div', ['cms-unidad-pestanas'])
    navegacionPestanas.setAttribute('role', 'tablist')
    navegacionPestanas.setAttribute('aria-label', `Secciones de ${unidad.nombre}`)
    pestanas.forEach(([clave, etiqueta]) => {
      const control = boton(etiqueta, () => { pestanaUnidad = clave; dibujar() }, ['cms-unidad-pestana'])
      control.setAttribute('role', 'tab')
      control.setAttribute('aria-selected', String(pestanaUnidad === clave))
      control.setAttribute('aria-controls', 'cms-unidad-contenido')
      if (pestanaUnidad === clave) control.classList.add('activa')
      navegacionPestanas.appendChild(control)
    })
    panel.appendChild(navegacionPestanas)
    const contenido = elemento('section', ['cms-unidad-contenido'])
    contenido.id = 'cms-unidad-contenido'
    contenido.setAttribute('role', 'tabpanel')
    const listaSimple = (titulo, filas, obtenerTitulo, obtenerDetalle, accionVacio) => {
      contenido.appendChild(elemento('h4', [], titulo))
      const lista = elemento('div', ['cms-unidad-resumen-lista'])
      if (filas.length) filas.forEach((item) => {
        const fila = elemento('article', ['cms-unidad-elemento'])
        fila.append(elemento('strong', [], obtenerTitulo(item)))
        const detalle = obtenerDetalle(item)
        if (detalle) fila.appendChild(elemento('span', [], detalle))
        lista.appendChild(fila)
      })
      else {
        const vacio = elemento('div', ['cms-unidad-resumen-vacio'])
        vacio.append(elemento('strong', [], 'Todo listo para empezar'), elemento('p', [], 'Este espacio se completará a medida que el equipo registre su trabajo.'))
        if (accionVacio) vacio.appendChild(accionVacio)
        lista.appendChild(vacio)
      }
      contenido.appendChild(lista)
    }
    if (pestanaUnidad === 'resumen') {
      const recientes = [...tareas.map((fila) => ['Tarea', fila.titulo]), ...proyectos.map((fila) => ['Proyecto', fila.titulo]), ...eventos.map((fila) => ['Actividad', fila.titulo])].slice(0, 6)
      listaSimple('Actividad reciente', recientes, (fila) => fila[1], (fila) => fila[0], datos.alcance?.puede_gestionar ? boton('Crear primera tarea', () => { capturaOrientada = { equipo_id: unidad.equipo_id, unidad_id: unidad.id }; formularioAbierto = 'tarea'; dibujar() }) : null)
    } else if (pestanaUnidad === 'tareas') {
      listaSimple('Tareas abiertas', tareas, (fila) => fila.titulo, (fila) => [TEXTO_ESTADO[clasificarTarea(fila)], fila.responsable_nombre || fila.responsable_correo || 'Sin responsable'].join(' · '), datos.alcance?.puede_gestionar ? boton('Crear tarea aquí', () => { capturaOrientada = { equipo_id: unidad.equipo_id, unidad_id: unidad.id }; formularioAbierto = 'tarea'; dibujar() }) : null)
    } else if (pestanaUnidad === 'proyectos') {
      listaSimple('Proyectos', proyectos, (fila) => fila.titulo, (fila) => TEXTO_ESTADO_PROYECTO[fila.estado] || fila.estado || 'Sin estado')
    } else if (pestanaUnidad === 'personas') {
      listaSimple('Personas responsables del área', personas, (fila) => fila.usuario_nombre || fila.nombre || fila.usuario_correo || fila.correo, (fila) => TEXTO_RESPONSABILIDAD[fila.tipo] || fila.tipo || 'Integrante')
      contenido.appendChild(elemento('p', ['ayuda'], 'Se muestran las responsabilidades visibles del área de origen. Los datos personales protegidos no se exponen en esta ficha.'))
    } else if (pestanaUnidad === 'formularios') {
      listaSimple('Formularios', formularios, (fila) => fila.titulo, (fila) => `${fila.visibilidad === 'publica' ? 'Público' : 'Interno'} · ${fila.estado === 'activa' ? 'Activo' : 'Cerrado'}`)
    } else if (pestanaUnidad === 'documentos') {
      listaSimple('Documentos y recursos', documentos, (fila) => fila.titulo, (fila) => [fila.tipo, fila.sensibilidad].filter(Boolean).join(' · '))
    } else {
      listaSimple('Tareas cerradas', cerradas, (fila) => fila.titulo, (fila) => [fila.estado === 'completada' ? 'Completada' : 'Cancelada', fila.completado_en ? fechaHoraHumana(fila.completado_en) : ''].filter(Boolean).join(' · '))
    }
    panel.appendChild(contenido)
    const acciones = elemento('div', ['cms-captura-acciones'])
    acciones.appendChild(enlaceA('cms-trabajo', 'Ver trabajo de la unidad', [], { filtroTrabajo: 'todas', unidadId: unidad.id }))
    if (datos.alcance?.global || datos.alcance?.perfil === 'administracion') acciones.appendChild(boton('Editar unidad', () => { unidadAEditar = unidad.id; formularioAbierto = 'editar-unidad'; dibujar() }))
    if (datos.alcance?.puede_gestionar) acciones.appendChild(boton('Crear tarea aquí', () => { capturaOrientada = { equipo_id: unidad.equipo_id, unidad_id: unidad.id }; formularioAbierto = 'tarea'; dibujar() }, ['boton-principal']))
    panel.appendChild(acciones)
    return panel
  }

  function panelUnidadesArea(claveArea = '') {
    const unidades = claveArea ? unidadesDeArea(claveArea) : datos.unidades
    const panel = elemento('section', ['cms-unidades'])
    const encabezado = elemento('div', ['cms-seccion-encabezado'])
    const texto = elemento('div', [])
    texto.append(elemento('span', ['cms-panel-etiqueta'], claveArea ? 'Dentro del área' : 'Estructura operativa'), elemento('h3', [], claveArea ? 'Programas y espacios de trabajo' : 'Unidades operativas'), elemento('p', ['ayuda'], claveArea ? 'Entrá por la actividad que querés gestionar.' : 'Cada unidad tiene un único origen y puede aparecer en otras áreas con una vista específica.'))
    encabezado.appendChild(texto)
    if (datos.alcance?.global || datos.alcance?.perfil === 'administracion') encabezado.appendChild(boton('Nueva unidad', () => { unidadAEditar = null; formularioAbierto = 'unidad'; dibujar() }))
    const grilla = elemento('div', ['cms-unidades-grilla'])
    if (!unidades.length) grilla.appendChild(elemento('p', ['ayuda'], 'Todavía no hay unidades configuradas para esta área.'))
    unidades.forEach((unidad) => {
      const tarjeta = elemento('article', ['cms-unidad'])
      tarjeta.style.setProperty('--unidad-color', unidad.color || '#6d3087')
      const nombre = elemento('div', ['cms-unidad-nombre'])
      if (unidad.sigla) nombre.appendChild(elemento('span', ['cms-unidad-sigla'], unidad.sigla))
      nombre.appendChild(elemento('strong', [], unidad.nombre))
      const vista = claveArea && unidad.equipo_id !== equipoFundacionalCms(datos.equipos, claveArea)?.id
        ? (unidad.vistas || []).find((fila) => fila.equipo_id === equipoFundacionalCms(datos.equipos, claveArea)?.id) : null
      const meta = [unidad.unidad_padre_nombre, vista ? ({ financiero: 'Vista financiera', comunicacion: 'Vista de comunicación' }[vista.enfoque] || 'Vista compartida') : '', unidad.estado === 'en_pausa' ? 'En pausa' : ''].filter(Boolean)
      tarjeta.append(nombre, elemento('p', [], unidad.descripcion || 'Sin descripción.'), elemento('small', [], meta.join(' · ') || ({ formacion: 'Formación', canal: 'Canal', proceso: 'Proceso', programa: 'Programa' }[unidad.tipo] || 'Unidad')))
      const acciones = elemento('div', ['cms-unidad-acciones'])
      const abrir = boton(vista ? `Abrir ${meta[0] || 'vista'}` : 'Abrir espacio', () => abrirUnidad(unidad), ['boton-principal'])
      abrir.setAttribute('aria-label', `Abrir ${unidad.nombre}`)
      acciones.appendChild(abrir)
      if ((datos.alcance?.global || datos.alcance?.perfil === 'administracion') && !vista) {
        const editar = boton('Editar', () => { unidadAEditar = unidad.id; formularioAbierto = 'editar-unidad'; dibujar() })
        editar.setAttribute('aria-label', `Editar ${unidad.nombre}`)
        acciones.appendChild(editar)
      }
      tarjeta.appendChild(acciones)
      grilla.appendChild(tarjeta)
    })
    panel.append(encabezado, grilla)
    if (!claveArea && (datos.alcance?.global || datos.alcance?.perfil === 'administracion')) panel.appendChild(panelClasificacionUnidades())
    return panel
  }

  function panelClasificacionUnidades() {
    const panel = elemento('section', ['cms-clasificacion-unidades'])
    const tipos = [
      ['Proyecto', datos.proyectos, (fila) => { proyectoAEditar = fila.id; formularioAbierto = 'editar-proyecto'; dibujar() }],
      ['Tarea', datos.tareas, (fila) => { tareaAEditar = fila.id; formularioAbierto = 'editar-tarea'; dibujar() }],
      ['Actividad', datos.eventos, (fila) => { eventoAEditar = fila.id; formularioAbierto = 'editar-evento'; dibujar() }],
      ['Reunión', datos.reuniones, (fila) => { reunionAEditar = fila.id; formularioAbierto = 'editar-reunion'; dibujar() }],
      ['Formulario', datos.formularios, (fila) => { formularioAEditar = fila.id; formularioAbierto = 'editar-formulario'; dibujar() }],
    ]
    const pendientes = tipos.flatMap(([tipo, filas, editar]) => (filas || []).filter((fila) => fila.equipo_id && !fila.unidad_id).map((fila) => ({ tipo, fila, editar })))
    panel.append(elemento('h4', [], 'Pendientes de clasificar'), elemento('p', ['ayuda'], pendientes.length
      ? 'Estos registros ya tienen un área, pero todavía no un programa o espacio. Revisalos de a uno para no cambiar datos históricos por suposición.'
      : 'Todos los registros visibles que pertenecen a un área ya tienen un programa o espacio.'))
    if (pendientes.length) {
      const controles = elemento('div', ['cms-clasificacion-controles'])
      const buscar = document.createElement('input')
      buscar.type = 'search'; buscar.placeholder = 'Buscar pendiente'; buscar.setAttribute('aria-label', 'Buscar pendientes de clasificar')
      const filtroTipo = selectorCms([['', 'Todos los tipos'], ...tipos.map(([tipo]) => [tipo, tipo])], 'Filtrar por tipo')
      const areas = [...new Map(pendientes.map(({ fila }) => [fila.equipo_id, fila.equipo_nombre || 'Área asignada'])).entries()]
      const filtroArea = selectorCms([['', 'Todas las áreas'], ...areas], 'Filtrar por área')
      controles.append(buscar, filtroTipo, filtroArea)
      const lista = elemento('div', ['cms-clasificacion-unidades-lista'])
      const contador = elemento('p', ['cms-clasificacion-contador'])
      const verMas = boton('Ver todos', () => { limite = Infinity; pintar() })
      let limite = 12
      const pintar = () => {
        const consulta = buscar.value.trim().toLocaleLowerCase('es')
        const visibles = pendientes.filter(({ tipo, fila }) => (!filtroTipo.value || filtroTipo.value === tipo)
          && (!filtroArea.value || filtroArea.value === String(fila.equipo_id))
          && (!consulta || `${fila.titulo || fila.nombre || ''} ${fila.equipo_nombre || ''}`.toLocaleLowerCase('es').includes(consulta)))
        lista.replaceChildren()
        visibles.slice(0, limite).forEach(({ tipo, fila, editar }) => {
        const tarjeta = elemento('article', ['cms-clasificacion-unidad'])
        const asignar = boton('Clasificar', () => editar(fila), ['boton-principal'])
        asignar.setAttribute('aria-label', `Clasificar ${fila.titulo || fila.nombre || 'registro sin título'}`)
        tarjeta.append(elemento('span', ['cms-panel-etiqueta'], tipo), elemento('strong', [], fila.titulo || fila.nombre || 'Sin título'), elemento('small', [], fila.equipo_nombre || 'Área asignada'), asignar)
        lista.appendChild(tarjeta)
        })
        contador.textContent = visibles.length === pendientes.length
          ? `${pendientes.length} ${pendientes.length === 1 ? 'registro pendiente' : 'registros pendientes'}`
          : `${visibles.length} de ${pendientes.length} pendientes`
        verMas.hidden = visibles.length <= limite
        verMas.textContent = `Ver los ${visibles.length} resultados`
        if (!visibles.length) lista.appendChild(elemento('p', ['ayuda'], 'No hay pendientes con esos filtros.'))
      }
      ;[buscar, filtroTipo, filtroArea].forEach((control) => control.addEventListener('input', () => { limite = 12; pintar() }))
      pintar()
      panel.append(controles, contador, lista, verMas)
    }
    return panel
  }

  function panelFlujoProyectos({ equipoId = '', tituloPanel = 'Flujo de proyectos', ayudaPanel = 'Cada proyecto reúne propósito, hitos, riesgos, presupuesto, tareas, actividades, decisiones y documentos en un mismo recorrido.' } = {}) {
    const proyectosVisibles = equipoId ? datos.proyectos.filter((fila) => fila.equipo_id === equipoId) : datos.proyectos
    const seccion = elemento('section', ['cms-flujo-proyectos'])
    const encabezado = elemento('div', ['cms-seccion-encabezado'])
    const texto = elemento('div', [])
    texto.append(
      elemento('h3', [], tituloPanel),
      elemento('p', ['ayuda'], ayudaPanel),
    )
    encabezado.append(texto, boton('Nuevo proyecto', () => { formularioAbierto = 'proyecto'; proyectoAEditar = null; dibujar() }))
    const flujo = elemento('div', ['cms-flujo-etapas'])
    const etapas = [
      ['Definir', proyectosVisibles.filter((fila) => ['borrador', 'planificado'].includes(fila.estado)).length, 'Propósito, equipo y responsable'],
      ['Ejecutar', proyectosVisibles.filter((fila) => ['en_marcha', 'activo'].includes(fila.estado)).length, 'Hitos, tareas y actividades'],
      ['Revisar', proyectosVisibles.filter((fila) => datos.riesgos.some((riesgo) => riesgo.proyecto_id === fila.id && riesgo.estado !== 'mitigado')).length, 'Riesgos y decisiones abiertas'],
      ['Cerrar', proyectosVisibles.filter((fila) => ['finalizado', 'cerrado'].includes(fila.estado)).length, 'Resultados y memoria'],
    ]
    etapas.forEach(([titulo, cantidad, detalle]) => {
      const etapa = elemento('article', ['cms-flujo-etapa'])
      etapa.append(elemento('strong', [], String(cantidad)), elemento('span', [], titulo), elemento('small', [], detalle))
      flujo.appendChild(etapa)
    })
    const lista = elemento('div', ['cms-flujo-proyectos-lista'])
    if (proyectosVisibles.length) proyectosVisibles.slice(0, equipoId ? proyectosVisibles.length : 6).forEach((proyecto) => {
      const hitos = Number(proyecto.hitos_total || 0)
      const completados = Number(proyecto.hitos_completados || 0)
      const porcentaje = hitos ? Math.round((completados / hitos) * 100) : 0
      const fila = elemento('article', ['cms-flujo-proyecto'])
      const barra = elemento('span', ['cms-flujo-avance'])
      barra.style.setProperty('--avance-proyecto', `${Math.min(100, porcentaje)}%`)
      const accionesProyecto = elemento('div', ['cms-flujo-proyecto-acciones'])
      accionesProyecto.append(
        boton('Editar proyecto', () => { proyectoAEditar = proyecto.id; formularioAbierto = 'editar-proyecto'; dibujar() }),
        boton('Abrir seguimiento', () => abrirSeguimientoProyecto(proyecto.id)),
      )
      fila.append(
        elemento('strong', [], proyecto.titulo),
        elemento('span', [], [proyecto.equipo_nombre || 'Sin equipo', TEXTO_ESTADO_PROYECTO[proyecto.estado] || proyecto.estado || 'En definición'].filter(Boolean).join(' · ')),
        barra,
        elemento('small', [], hitos ? `${completados} de ${hitos} hitos, ${porcentaje}%` : 'Agregá hitos para medir el avance'),
        accionesProyecto,
      )
      lista.appendChild(fila)
    })
    else lista.appendChild(elemento('p', ['ayuda'], 'Todavía no hay proyectos. Creá uno cuando una línea de trabajo requiera objetivos, responsables, fechas y seguimiento propio.'))
    seccion.append(encabezado, flujo, lista)
    return seccion
  }

  function panelEmbudoFormularios() {
    const seccion = elemento('section', ['cms-embudo-formularios'])
    const pendientes = datos.entradas.filter((entrada) => !['derivada', 'cerrada'].includes(entrada.estado)).length
    const derivadas = datos.entradas.filter((entrada) => entrada.estado === 'derivada').length
    const cerradas = datos.entradas.filter((entrada) => entrada.estado === 'cerrada').length
    const encabezado = elemento('div', ['cms-seccion-encabezado'])
    const texto = elemento('div', [])
    texto.append(elemento('h3', [], 'Embudo de formularios'), elemento('p', ['ayuda'], 'Las respuestas no quedan aisladas: entran, se derivan a un equipo y se cierran con trazabilidad.'))
    encabezado.append(texto, boton('Abrir entradas', () => document.querySelector('.cms-entradas')?.scrollIntoView({ behavior: 'smooth', block: 'start' })))
    const pasos = elemento('div', ['cms-embudo-pasos'])
    ;[['Recibidas', datos.entradas.length], ['Para revisar', pendientes], ['Derivadas', derivadas], ['Cerradas', cerradas]].forEach(([etiqueta, cantidad]) => {
      const paso = elemento('article', ['cms-embudo-paso'])
      paso.append(elemento('strong', [], String(cantidad)), elemento('span', [], etiqueta))
      pasos.appendChild(paso)
    })
    seccion.append(encabezado, pasos)
    return seccion
  }

  function panelNavegacionFormularios() {
    const navegacion = elemento('nav', ['cms-navegacion-formularios'])
    navegacion.setAttribute('aria-label', 'Vistas de Formularios')
    const opciones = [
      ['formularios', 'Formularios', datos.formularios.length],
      ['pendientes', 'Respuestas pendientes', datos.entradas.filter((entrada) => entrada.estado !== 'cerrada').length],
      ['historial', 'Historial cumplido', datos.entradas.filter((entrada) => entrada.estado === 'cerrada').length],
    ]
    opciones.forEach(([valor, etiqueta, cantidad]) => {
      const control = boton(`${etiqueta} (${cantidad})`, () => { vistaFormularios = valor; filtroEstadoEntradas = 'todas'; formularioAbierto = null; dibujar() }, ['cms-navegacion-formularios-boton'])
      control.setAttribute('aria-pressed', String(vistaFormularios === valor))
      navegacion.appendChild(control)
    })
    return navegacion
  }

  function panelAlianzas() {
    const seccion = elemento('section', ['cms-estructura'])
    const encabezado = elemento('div', ['cms-seccion-encabezado']); const texto = elemento('div', [])
    texto.append(elemento('h3', [], 'Alianzas institucionales'), elemento('p', ['ayuda'], 'Relaciones de trabajo en red, con un canal institucional opcional, vinculadas a equipos o proyectos.'))
    encabezado.append(texto, boton('Nueva alianza', () => { formularioAbierto = formularioAbierto === 'alianza' ? null : 'alianza'; alianzaAEditar = null; dibujar() }))
    const lista = elemento('div', ['cms-estructura-lista'])
    if (datos.alianzas.length) datos.alianzas.forEach((alianza) => {
      const tarjeta = elemento('article', ['cms-proyecto'])
      const acciones = elemento('div', ['cms-reunion-acciones'])
      if (datos.alcance?.puede_gestionar) acciones.appendChild(boton('Editar alianza', () => { alianzaAEditar = alianza.id; formularioAbierto = 'editar-alianza'; dibujar() }))
      tarjeta.append(elemento('strong', [], alianza.nombre), elemento('span', ['cms-proyecto-meta'], [alianza.tipo, alianza.estado.replace('_', ' '), alianza.equipo_nombre || alianza.proyecto_titulo || 'Institucional'].filter(Boolean).join(' · ')), alianza.descripcion ? elemento('span', ['cms-proyecto-notas'], alianza.descripcion) : document.createDocumentFragment(), alianza.contacto_institucional ? elemento('span', ['cms-proyecto-notas'], alianza.contacto_institucional) : document.createDocumentFragment(), acciones)
      lista.appendChild(tarjeta)
    })
    else lista.appendChild(elemento('p', ['ayuda'], 'Todavía no hay alianzas registradas. Agregá una colaboración institucional cuando tenga un propósito, equipo o proyecto claro.'))
    seccion.append(encabezado, lista); return seccion
  }

  function panelDocumentos() {
    const seccion = elemento('section', ['cms-estructura'])
    const encabezado = elemento('div', ['cms-seccion-encabezado']); const texto = elemento('div', [])
    texto.append(elemento('h3', [], 'Documentos'), elemento('p', ['ayuda'], 'Centralizá enlaces de Drive y otros recursos sin duplicar archivos sensibles.'))
    encabezado.append(texto, boton('Agregar documento', () => { formularioAbierto = formularioAbierto === 'documento' ? null : 'documento'; dibujar() }))
    const filtros = elemento('div', ['cms-documentos-filtros'])
    const buscar = inputCms('Buscar por título, descripción, equipo o proyecto', 'Buscar documentos')
    buscar.value = filtroDocumentos.texto
    buscar.addEventListener('input', () => { filtroDocumentos.texto = buscar.value; dibujar() })
    const tipo = selectorCms([['', 'Todos los tipos'], ['enlace', 'Enlaces'], ['guia', 'Guías'], ['acta', 'Actas'], ['plantilla', 'Plantillas'], ['politica', 'Políticas']], 'Filtrar documentos por tipo')
    tipo.value = filtroDocumentos.tipo
    tipo.addEventListener('change', () => { filtroDocumentos.tipo = tipo.value; dibujar() })
    const sensibilidad = selectorCms([['', 'Toda la visibilidad'], ['compartido', 'Compartidos'], ['interno', 'Uso interno'], ['restringido', 'Restringidos']], 'Filtrar documentos por visibilidad')
    sensibilidad.value = filtroDocumentos.sensibilidad
    sensibilidad.addEventListener('change', () => { filtroDocumentos.sensibilidad = sensibilidad.value; dibujar() })
    filtros.append(buscar, tipo, sensibilidad)
    const textoBusqueda = filtroDocumentos.texto.trim().toLocaleLowerCase('es')
    const documentos = datos.documentos.filter((documento) => {
      const contenido = [documento.titulo, documento.descripcion, documento.equipo_nombre, documento.proyecto_titulo].filter(Boolean).join(' ').toLocaleLowerCase('es')
      return (!textoBusqueda || contenido.includes(textoBusqueda))
        && (!filtroDocumentos.tipo || documento.tipo === filtroDocumentos.tipo)
        && (!filtroDocumentos.sensibilidad || documento.sensibilidad === filtroDocumentos.sensibilidad)
    })
    const lista = elemento('div', ['cms-estructura-lista'])
    if (documentos.length) documentos.forEach((documento) => {
      const tarjeta = elemento('article', ['cms-proyecto']); const vinculo = document.createElement('a'); vinculo.href = documento.url; vinculo.target = '_blank'; vinculo.rel = 'noreferrer'; vinculo.textContent = documento.titulo
      tarjeta.append(vinculo, elemento('span', ['cms-proyecto-meta'], [documento.tipo, documento.sensibilidad, documento.equipo_nombre || documento.proyecto_titulo].filter(Boolean).join(' · ')), documento.descripcion ? elemento('span', ['cms-proyecto-notas'], documento.descripcion) : document.createDocumentFragment()); lista.appendChild(tarjeta)
    })
    else lista.appendChild(elemento('p', ['ayuda'], datos.documentos.length ? 'No hay documentos que coincidan con estos filtros.' : 'Todavía no hay documentos. Agregá enlaces de Drive, guías o plantillas de trabajo.'))
    seccion.append(encabezado, filtros, lista); return seccion
  }

  const ETIQUETAS_ESTADO_PRIVACIDAD = {
    recibida: 'Recibida', identidad_verificada: 'Identidad verificada', en_revision: 'En revisión',
    lista_para_entrega: 'Copia preparada', lista_para_decision: 'Decisión preparada', cerrada: 'Cerrada', rechazada: 'Rechazada',
  }

  function formularioSolicitudPrivacidad() {
    const forma = document.createElement('form'); forma.className = 'cms-captura cms-privacidad-formulario'
    const tipo = selectorCms([['copia', 'Solicita una copia'], ['eliminacion', 'Solicita una eliminación']], 'Tipo de solicitud de privacidad')
    const nombre = inputCms('Nombre de la persona solicitante', 'Persona solicitante'); nombre.required = true; nombre.maxLength = 180
    const contacto = inputCms('Correo, teléfono o canal para responder', 'Contacto de la persona'); contacto.required = true; contacto.maxLength = 240
    const canal = selectorCms([['correo', 'Correo'], ['telefono', 'Teléfono'], ['presencial', 'Presencial'], ['formulario', 'Formulario'], ['otro', 'Otro']], 'Canal de recepción')
    const alcance = areaCms('Qué información pide y dónde podría estar. No copies documentos de identidad.', 'Información solicitada'); alcance.required = true
    const responsable = selectorCms([['', 'Responsable por asignar'], ...datos.responsables.map((fila) => [fila.correo, fila.nombre])], 'Responsable de la solicitud')
    const fecha = inputCms('', 'Fecha objetivo', 'date')
    const detalles = elemento('div', ['cms-captura-detalles']); detalles.append(canal, responsable, fecha)
    forma.append(
      elemento('h3', [], 'Registrar solicitud de privacidad'),
      elemento('p', ['ayuda'], 'Guardá solo la referencia necesaria para ubicar la información. La verificación de identidad se documenta en el paso siguiente.'),
      tipo, nombre, contacto, elemento('label', ['cms-etiqueta-campo'], 'Qué información solicita'), alcance, detalles,
      accionesFormulario(() => {
        if (!forma.reportValidity() || guardando) return
        guardando = true
        pedir('/api/cms/solicitudes-privacidad', { method: 'POST', body: JSON.stringify({
          tipo: tipo.value, solicitante_nombre: nombre.value, contacto: contacto.value, canal: canal.value,
          alcance: alcance.value, responsable_correo: responsable.value || null, fecha_objetivo: fecha.value || null,
        }) }).then(() => { formularioAbierto = null; return cargar() }).catch((fallo) => { error = fallo.message; guardando = false; dibujar() })
      }, 'Registrar solicitud'),
    )
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); forma.querySelector('.boton-principal').click() })
    return forma
  }

  function proximaAccionPrivacidad(solicitud) {
    return {
      recibida: ['verificar_identidad', 'Verificar identidad'],
      identidad_verificada: ['iniciar_revision', 'Iniciar revisión'],
      en_revision: ['preparar_resultado', solicitud.tipo === 'copia' ? 'Marcar copia preparada' : 'Preparar decisión'],
      lista_para_entrega: ['cerrar', 'Registrar entrega y cerrar'],
      lista_para_decision: ['cerrar', 'Registrar decisión y cerrar'],
    }[solicitud.estado] || null
  }

  function formularioAvancePrivacidad() {
    const solicitud = datos.solicitudesPrivacidad.find((fila) => fila.id === solicitudPrivacidadActiva)
    if (!solicitud) return document.createDocumentFragment()
    const forma = document.createElement('form'); forma.className = 'cms-captura cms-privacidad-formulario'
    const siguiente = proximaAccionPrivacidad(solicitud)
    const nota = areaCms(solicitud.estado === 'recibida' ? 'Ej. Se confirmó por el canal institucional ya registrado.' : 'Anotá únicamente la decisión, entrega o revisión necesaria.', 'Nota o constancia de la solicitud')
    if (['recibida', 'lista_para_entrega', 'lista_para_decision'].includes(solicitud.estado)) nota.required = true
    const ejecutar = (accion) => {
      if (!nota.value.trim() && ['verificar_identidad', 'cerrar', 'rechazar'].includes(accion)) {
        nota.setCustomValidity('Agregá una nota o constancia para continuar.')
        nota.reportValidity()
        nota.setCustomValidity('')
        return
      }
      if (guardando) return
      guardando = true
      pedir(`/api/cms/solicitudes-privacidad/${solicitud.id}`, { method: 'PATCH', body: JSON.stringify({ accion, nota: nota.value }) })
        .then(() => { formularioAbierto = null; solicitudPrivacidadActiva = null; return cargar() })
        .catch((fallo) => { error = fallo.message; guardando = false; dibujar() })
    }
    const acciones = elemento('div', ['cms-captura-acciones'])
    if (siguiente) acciones.appendChild(boton(siguiente[1], () => ejecutar(siguiente[0]), ['boton-principal']))
    if (!['cerrada', 'rechazada'].includes(solicitud.estado)) acciones.appendChild(boton('Registrar rechazo', () => ejecutar('rechazar')))
    acciones.appendChild(boton('Cancelar', () => { formularioAbierto = null; solicitudPrivacidadActiva = null; dibujar() }))
    forma.append(
      elemento('h3', [], `${solicitud.tipo === 'copia' ? 'Copia' : 'Eliminación'} solicitada por ${solicitud.solicitante_nombre}`),
      elemento('p', ['ayuda'], `Estado actual: ${ETIQUETAS_ESTADO_PRIVACIDAD[solicitud.estado]}. El gestor registra el proceso, pero no exporta ni elimina información automáticamente.`),
      elemento('label', ['cms-etiqueta-campo'], solicitud.estado === 'recibida' ? 'Cómo se verificó la identidad' : 'Nota de revisión o constancia'), nota,
      acciones,
    )
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); if (siguiente) ejecutar(siguiente[0]) })
    return forma
  }

  function panelSolicitudesPrivacidad() {
    const seccion = elemento('section', ['cms-privacidad'])
    const accesoSensible = datos.alcance?.perfil === 'administracion' && datos.alcance?.nivel_datos_personales === 'sensible'
    const encabezado = elemento('div', ['cms-seccion-encabezado']); const texto = elemento('div', [])
    texto.append(elemento('h3', [], 'Solicitudes de privacidad'), elemento('p', ['ayuda'], 'Un recorrido verificable para responder pedidos de copia o eliminación sin ejecutar acciones irreversibles desde esta pantalla.'))
    encabezado.appendChild(texto)
    if (accesoSensible) encabezado.appendChild(boton('Registrar solicitud', () => { solicitudPrivacidadActiva = null; formularioAbierto = 'solicitud-privacidad'; dibujar() }, ['boton-principal']))
    seccion.appendChild(encabezado)
    if (!accesoSensible) {
      const aviso = crearPanelRequisitosAcceso({
        requisitos: [
          requisitoDatosPersonales(datos.alcance?.nivel_datos_personales, 'sensible'),
          requisitoPerfil(datos.alcance?.perfil, 'administracion'),
        ],
        titulo: 'Acceso sensible requerido',
        descripcion: 'Para gestionar solicitudes de privacidad tienen que cumplirse ambos requisitos.',
        seccion: 'Solicitudes de privacidad', regreso: 'cms-privacidad', sesion: { ...sesion, perfil_acceso: sesion?.perfil_acceso || datos.alcance?.perfil }, alIrA,
      })
      seccion.appendChild(aviso)
      return seccion
    }
    const resumen = elemento('div', ['cms-privacidad-resumen'])
    const abiertas = datos.solicitudesPrivacidad.filter((fila) => !['cerrada', 'rechazada'].includes(fila.estado)).length
    ;[['Abiertas', abiertas], ['Esperan identidad', datos.solicitudesPrivacidad.filter((fila) => fila.estado === 'recibida').length], ['En revisión', datos.solicitudesPrivacidad.filter((fila) => ['identidad_verificada', 'en_revision'].includes(fila.estado)).length]].forEach(([etiqueta, cantidad]) => {
      const item = elemento('article', ['cms-privacidad-resumen-item']); item.append(elemento('strong', [], String(cantidad)), elemento('span', [], etiqueta)); resumen.appendChild(item)
    })
    const lista = elemento('div', ['cms-privacidad-lista'])
    datos.solicitudesPrivacidad.forEach((solicitud) => {
      const tarjeta = elemento('article', ['cms-privacidad-tarjeta', `estado-${solicitud.estado}`])
      const superior = elemento('div', ['cms-privacidad-superior'])
      const identidad = elemento('div', [])
      identidad.append(elemento('span', ['cms-panel-etiqueta'], solicitud.tipo === 'copia' ? 'Solicitud de copia' : 'Solicitud de eliminación'), elemento('strong', [], solicitud.solicitante_nombre), elemento('span', ['cms-proyecto-meta'], [solicitud.contacto, solicitud.responsable_nombre || 'Sin responsable', solicitud.fecha_objetivo ? `Objetivo ${fechaHumana(solicitud.fecha_objetivo)}` : 'Sin fecha objetivo'].join(' · ')))
      superior.append(identidad, elemento('span', ['cms-privacidad-estado'], ETIQUETAS_ESTADO_PRIVACIDAD[solicitud.estado] || solicitud.estado))
      const pasos = elemento('div', ['cms-privacidad-pasos'])
      const indice = { recibida: 0, identidad_verificada: 1, en_revision: 2, lista_para_entrega: 3, lista_para_decision: 3, cerrada: 4, rechazada: 4 }[solicitud.estado] ?? 0
      ;['Recibida', 'Identidad', 'Revisión', solicitud.tipo === 'copia' ? 'Entrega' : 'Decisión'].forEach((etiqueta, paso) => pasos.appendChild(elemento('span', ['cms-privacidad-paso', ...(paso < indice ? ['completo'] : paso === indice ? ['actual'] : [])], etiqueta)))
      const acciones = elemento('div', ['cms-reunion-acciones'])
      if (proximaAccionPrivacidad(solicitud)) acciones.appendChild(boton('Continuar', () => { solicitudPrivacidadActiva = solicitud.id; formularioAbierto = 'avance-privacidad'; dibujar() }))
      tarjeta.append(superior, elemento('p', ['cms-proyecto-notas'], solicitud.alcance), pasos, solicitud.constancia ? elemento('p', ['cms-privacidad-constancia'], `Constancia: ${solicitud.constancia}`) : document.createDocumentFragment(), acciones)
      lista.appendChild(tarjeta)
    })
    if (!datos.solicitudesPrivacidad.length) lista.appendChild(elemento('p', ['ayuda'], 'Todavía no hay solicitudes registradas.'))
    seccion.append(resumen, lista, elemento('p', ['cms-privacidad-limite'], 'Importante: cerrar una solicitud solo registra la constancia escrita. Cualquier exportación o eliminación real debe revisarse y ejecutarse mediante un procedimiento autorizado.'))
    return seccion
  }

  function panelEntradas() {
    const seccion = elemento('section', ['cms-entradas'])
    const encabezado = elemento('div', ['cms-seccion-encabezado']); const texto = elemento('div', [])
    const esHistorial = vistaFormularios === 'historial'
    texto.append(elemento('h3', [], esHistorial ? 'Historial de cumplimientos' : 'Respuestas por resolver'), elemento('p', ['ayuda'], esHistorial ? 'Consultá qué se resolvió, cuándo, cómo y por qué. Una respuesta puede reabrirse si requiere seguimiento.' : 'Revisá cada respuesta, seguí la tarea asociada y registrá un cumplimiento explicable al terminar.'))
    encabezado.appendChild(texto)
    if (puedeVerRespuestas()) encabezado.appendChild(boton('Registrar entrada', () => { formularioAbierto = formularioAbierto === 'entrada' ? null : 'entrada'; dibujar() }))
    const controles = elemento('div', ['cms-controles-entradas'])
    const buscar = inputCms('Buscar por persona, formulario, equipo o contenido', 'Buscar respuestas')
    buscar.value = busquedaEntradas
    buscar.addEventListener('input', () => {
      const posicion = buscar.selectionStart
      busquedaEntradas = buscar.value
      dibujar()
      requestAnimationFrame(() => {
        const reemplazo = raiz.querySelector('input[aria-label="Buscar respuestas"]')
        reemplazo?.focus()
        reemplazo?.setSelectionRange(posicion, posicion)
      })
    })
    const estado = selectorCms(esHistorial
      ? [['todas', 'Todos los resultados'], ['contacto', 'Contacto realizado'], ['tarea', 'Tarea completada'], ['actividad', 'Actividad realizada'], ['alta', 'Alta o registro completado'], ['archivo', 'Archivadas'], ['otro', 'Otros resultados']]
      : [['todas', 'Todas las pendientes'], ['recibida', 'Recién recibidas'], ['derivada', 'Con seguimiento iniciado'], ['sin_tarea', 'Sin tarea asociada']], 'Filtrar respuestas')
    estado.value = filtroEstadoEntradas
    estado.addEventListener('change', () => { filtroEstadoEntradas = estado.value; dibujar() })
    const orden = selectorCms([['recientes', 'Más recientes primero'], ['antiguas', 'Más antiguas primero'], ['nombre', 'Orden alfabético']], 'Ordenar respuestas')
    orden.value = ordenEntradas
    orden.addEventListener('change', () => { ordenEntradas = orden.value; dibujar() })
    controles.append(buscar, estado, orden)
    const lista = elemento('div', ['cms-entradas-lista'])
    if (!puedeVerRespuestas()) {
      const avisoAcceso = crearPanelRequisitosAcceso({
        requisitos: [requisitoDatosPersonales(datos.alcance?.nivel_datos_personales, 'operativo')],
        titulo: 'Respuestas protegidas',
        descripcion: 'Podés ver los formularios y sus cantidades. Para abrir respuestas necesitás acceso vigente a datos personales básicos.',
        seccion: 'Bandeja de entradas', regreso: `cms-${area}`, sesion: { ...sesion, perfil_acceso: sesion?.perfil_acceso || datos.alcance?.perfil }, alIrA,
      })
      lista.appendChild(avisoAcceso)
      seccion.append(encabezado, lista)
      return seccion
    }
    const consulta = busquedaEntradas.trim().toLocaleLowerCase('es')
    const entradasVisibles = datos.entradas
      .filter((entrada) => esHistorial ? entrada.estado === 'cerrada' : entrada.estado !== 'cerrada')
      .filter((entrada) => {
        if (filtroEstadoEntradas === 'todas') return true
        if (esHistorial) return entrada.cumplida_medio === filtroEstadoEntradas
        if (filtroEstadoEntradas === 'sin_tarea') return !entrada.tarea_id && !entrada.tarea_titulo
        return entrada.estado === filtroEstadoEntradas
      })
      .filter((entrada) => !consulta || [entrada.nombre, entrada.formulario_titulo, entrada.tipo, entrada.equipo_nombre, entrada.proyecto_titulo, entrada.detalle, entrada.contacto].filter(Boolean).join(' ').toLocaleLowerCase('es').includes(consulta))
      .sort((a, b) => {
        if (ordenEntradas === 'nombre') return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es')
        const izquierda = String(a.cumplida_en || a.creado_en || '')
        const derecha = String(b.cumplida_en || b.creado_en || '')
        return ordenEntradas === 'antiguas' ? izquierda.localeCompare(derecha) : derecha.localeCompare(izquierda)
      })
    if (entradasVisibles.length) entradasVisibles.forEach((entrada) => {
      const tarjeta = elemento('article', ['cms-entrada'])
      const acciones = elemento('div', ['cms-entrada-acciones'])
      if (['actividad', 'evento'].includes(entrada.tipo) && entrada.fecha_propuesta && !entrada.evento_id) acciones.appendChild(boton('Preparar en agenda', async () => {
        if (guardando) return
        guardando = true
        try { await pedir(`/api/cms/entradas/${entrada.id}/agendar`, { method: 'POST' }); await cargar() } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
      }, ['boton-principal']))
      if (entrada.estado !== 'cerrada') acciones.appendChild(boton('Registrar cumplimiento', () => { entradaParaCumplir = entrada.id; formularioAbierto = 'cumplir-entrada'; dibujar() }, ['boton-principal']))
      else acciones.appendChild(boton('Reabrir respuesta', () => { entradaParaReabrir = entrada.id; formularioAbierto = 'reabrir-entrada'; dibujar() }))
      let respuestas = {}
      try { respuestas = JSON.parse(entrada.respuestas_json || '{}') } catch { /* Una respuesta histórica puede no tener campos configurables. */ }
      const resumenRespuestas = Object.entries(respuestas).filter(([, valor]) => valor !== '' && valor !== false).map(([clave, valor]) => elemento('span', ['cms-entrada-respuesta'], `${clave === '_consentimiento_privacidad' ? 'Consentimiento de privacidad' : clave.replaceAll('_', ' ')}: ${valor === true ? 'Sí' : valor}`))
      const cumplimiento = entrada.estado === 'cerrada' ? elemento('div', ['cms-cumplimiento-resumen']) : document.createDocumentFragment()
      if (entrada.estado === 'cerrada') cumplimiento.append(
        elemento('strong', [], `Cumplida el ${fechaHumana(entrada.cumplida_en)}`),
        elemento('span', [], `Cómo: ${ETIQUETAS_MEDIO_CUMPLIMIENTO[entrada.cumplida_medio] || entrada.cumplida_medio || 'No registrado'}`),
        elemento('span', [], `Por qué: ${entrada.cumplida_motivo || 'Sin motivo histórico'}`),
        elemento('small', [], `Registró: ${entrada.cumplida_por_nombre || entrada.cumplida_por || 'Sin registro'}`),
      )
      const proximaAccion = entrada.estado === 'cerrada' ? '' : entrada.tarea_titulo ? `Próximo paso: continuar “${entrada.tarea_titulo}”` : entrada.evento_id ? 'Próximo paso: revisar la actividad preparada' : 'Próximo paso: asignar seguimiento o registrar el resultado'
      tarjeta.append(elemento('strong', [], entrada.nombre), elemento('span', ['cms-proyecto-meta'], [entrada.formulario_titulo || entrada.tipo, entrada.equipo_solicitante_nombre && `De ${entrada.equipo_solicitante_nombre}`, entrada.equipo_nombre || entrada.proyecto_titulo, entrada.tipo === 'pedido' && `Prioridad ${entrada.prioridad}`, entrada.creado_en && `Recibida ${fechaHoraHumana(entrada.creado_en)}`].filter(Boolean).join(' · ')), proximaAccion ? elemento('span', ['cms-entrada-proxima'], proximaAccion) : document.createDocumentFragment(), entrada.fecha_propuesta ? elemento('span', ['cms-entrada-tarea'], `Fecha propuesta: ${fechaHoraProgramadaHumana(entrada.fecha_propuesta)}`) : document.createDocumentFragment(), entrada.detalle ? elemento('span', ['cms-proyecto-notas'], entrada.detalle) : document.createDocumentFragment(), ...resumenRespuestas, entrada.tarea_titulo ? elemento('span', ['cms-entrada-tarea'], `Tarea: ${entrada.tarea_titulo}`) : document.createDocumentFragment(), cumplimiento, acciones)
      lista.appendChild(tarjeta)
    })
    else {
      const hayEntradasEnVista = datos.entradas.some((entrada) => esHistorial ? entrada.estado === 'cerrada' : entrada.estado !== 'cerrada')
      lista.appendChild(elemento('p', ['ayuda'], hayEntradasEnVista ? 'No hay respuestas que coincidan con la búsqueda o el filtro.' : esHistorial ? 'Todavía no hay respuestas cumplidas.' : 'No hay respuestas pendientes. Las nuevas respuestas aparecerán acá.'))
    }
    seccion.append(encabezado, controles, lista); return seccion
  }

  const ETIQUETAS_MEDIO_CUMPLIMIENTO = { contacto: 'Contacto realizado', tarea: 'Tarea completada', actividad: 'Actividad realizada', alta: 'Alta o registro completado', archivo: 'Archivada sin otra acción', otro: 'Otro resultado' }

  function formularioCumplirEntrada() {
    const entrada = datos.entradas.find((fila) => fila.id === entradaParaCumplir)
    if (!entrada) return document.createDocumentFragment()
    const forma = document.createElement('form'); forma.className = 'cms-captura cms-cumplimiento-formulario'
    forma.append(elemento('span', ['cms-panel-etiqueta'], 'Cierre verificable'), elemento('h3', [], `Registrar cumplimiento: ${entrada.nombre}`), elemento('p', ['ayuda'], 'Este registro quedará en el historial. Indicá el resultado real, no solo que la respuesta fue revisada.'))
    const fecha = inputCms('', 'Fecha de cumplimiento'); fecha.type = 'date'; fecha.required = true; fecha.value = HOY(); fecha.max = HOY()
    const medio = selectorCms(Object.entries(ETIQUETAS_MEDIO_CUMPLIMIENTO), 'Cómo se resolvió'); medio.required = true
    const motivo = areaCms('Ej. Se respondió por correo, se confirmó la inscripción y no quedan acciones pendientes.', 'Por qué quedó cumplido'); motivo.required = true; motivo.minLength = 10
    const acciones = elemento('div', ['cms-captura-acciones'])
    acciones.append(
      boton('Cancelar', () => { formularioAbierto = null; entradaParaCumplir = null; dibujar() }),
      boton('Guardar cumplimiento', async () => {
        if (guardando || !forma.reportValidity()) return
        guardando = true
        try { await pedir(`/api/cms/entradas/${entrada.id}/cumplir`, { method: 'POST', body: JSON.stringify({ fecha: fecha.value, medio: medio.value, motivo: motivo.value }) }); formularioAbierto = null; entradaParaCumplir = null; vistaFormularios = 'historial'; await cargar() } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
      }, ['boton-principal']),
    )
    forma.append(campoCms('Fecha de cumplimiento', fecha, 'Puede ser anterior a hoy si el registro se completa después.'), campoCms('Cómo se resolvió', medio), campoCms('Motivo o resultado', motivo), acciones)
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); acciones.lastElementChild.click() })
    return forma
  }

  function formularioReabrirEntrada() {
    const entrada = datos.entradas.find((fila) => fila.id === entradaParaReabrir)
    if (!entrada) return document.createDocumentFragment()
    const forma = document.createElement('form'); forma.className = 'cms-captura cms-cumplimiento-formulario'
    forma.append(elemento('h3', [], `Reabrir respuesta: ${entrada.nombre}`), elemento('p', ['ayuda'], 'La respuesta volverá a Pendientes. El cumplimiento anterior se conserva en el historial de auditoría.'))
    const motivo = areaCms('Ej. La persona volvió a contactar y necesita una nueva coordinación.', 'Motivo de reapertura'); motivo.required = true; motivo.minLength = 10
    const acciones = elemento('div', ['cms-captura-acciones'])
    acciones.append(boton('Cancelar', () => { formularioAbierto = null; entradaParaReabrir = null; dibujar() }), boton('Reabrir respuesta', async () => {
      if (guardando || !forma.reportValidity()) return
      guardando = true
      try { await pedir(`/api/cms/entradas/${entrada.id}/reabrir`, { method: 'POST', body: JSON.stringify({ motivo: motivo.value }) }); formularioAbierto = null; entradaParaReabrir = null; vistaFormularios = 'pendientes'; await cargar() } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
    }, ['boton-principal']))
    forma.append(campoCms('Por qué se reabre', motivo), acciones)
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); acciones.lastElementChild.click() })
    return forma
  }

  function formularioFormulario(formulario = null, duplicando = false) {
    const esEdicion = Boolean(formulario && !duplicando)
    const claveBorrador = `aletea:cms:borrador-formulario:v1:${sesion?.usuario || sesion?.correo || 'cuenta'}`
    let borrador = null
    if (!esEdicion && !duplicando) {
      try { borrador = JSON.parse(window.localStorage.getItem(claveBorrador) || 'null') } catch { borrador = null }
    }
    const forma = document.createElement('form'); forma.className = 'cms-captura'
    forma.append(elemento('span', ['cms-panel-etiqueta'], esEdicion ? 'Editar flujo' : duplicando ? 'Duplicar y adaptar' : 'Creación guiada'), elemento('h3', [], esEdicion ? `Editar formulario: ${formulario.titulo}` : duplicando ? `Duplicar formulario: ${formulario.titulo}` : 'Nuevo formulario'), elemento('p', ['ayuda'], duplicando ? 'Revisá el título, el destino y las preguntas. La copia se crea como un formulario independiente y no modifica el original.' : 'Definí el propósito, el recorrido de la respuesta y las preguntas. La configuración avanzada queda agrupada para evitar errores.'))
    const titulo = inputCms('Ej. Inscripción a Fútbol sin Barreras', 'Título del formulario'); titulo.required = true; titulo.maxLength = 180; titulo.value = borrador?.titulo ?? (duplicando ? `Copia de ${formulario?.titulo || ''}` : formulario?.titulo || '')
    const descripcion = areaCms('Explicá brevemente para qué sirve este formulario.', 'Descripción'); descripcion.value = borrador?.descripcion ?? formulario?.descripcion ?? ''
    const tipo = selectorCms([['voluntariado', 'Voluntariado'], ['inscripcion', 'Inscripción'], ['actividad', 'Propuesta de actividad'], ['evento', 'Propuesta de evento'], ['pedido', 'Pedido a un equipo'], ['propuesta', 'Propuesta institucional']], 'Tipo de formulario'); tipo.value = borrador?.tipo || formulario?.tipo || 'voluntariado'
    const visibilidad = selectorCms([['interna', 'Solo interna'], ['publica', 'Pública, con enlace para compartir']], 'Visibilidad del formulario'); visibilidad.value = borrador?.visibilidad || formulario?.visibilidad || 'interna'
    const estado = selectorCms([['activa', 'Activa'], ['cerrada', 'Cerrada']], 'Estado del formulario'); estado.value = borrador?.estado || formulario?.estado || 'activa'
    const equipo = selectorCms([['', 'Sin equipo'], ...datos.equipos.map((fila) => [fila.id, fila.nombre])], 'Equipo destinatario'); equipo.value = borrador?.equipo_id || formulario?.equipo_id || ''
    const unidad = selectorCms([['', 'Sin programa o espacio'], ...datos.unidades.map((fila) => [fila.id, `${fila.sigla ? `${fila.sigla}: ` : ''}${fila.nombre}`])], 'Programa o espacio relacionado'); unidad.value = borrador?.unidad_id || formulario?.unidad_id || ''
    const equipoSolicitante = selectorCms([['', 'Sin equipo solicitante'], ...datos.equipos.map((fila) => [fila.id, fila.nombre])], 'Equipo solicitante'); equipoSolicitante.value = borrador?.equipo_solicitante_id || formulario?.equipo_solicitante_id || ''
    const prioridad = selectorCms([['baja', 'Prioridad baja'], ['normal', 'Prioridad normal'], ['alta', 'Prioridad alta'], ['urgente', 'Prioridad urgente']], 'Prioridad del pedido'); prioridad.value = borrador?.prioridad || formulario?.prioridad || 'normal'
    const proyecto = selectorCms([['', 'Sin proyecto'], ...datos.proyectos.map((fila) => [fila.id, fila.titulo])], 'Proyecto'); proyecto.value = borrador?.proyecto_id || formulario?.proyecto_id || ''
    const destinoRespuesta = selectorCms([
      ['tarea', 'Crear tarea de seguimiento'], ['solicitud', 'Crear solicitud para el equipo'], ['actividad', 'Preparar actividad para revisar'],
      ['alta_persona', 'Preparar alta de persona'], ['contacto', 'Preparar contacto institucional'], ['archivo', 'Archivar sin crear tarea'],
    ], 'Qué hacer con cada respuesta'); destinoRespuesta.value = borrador?.destino_respuesta || formulario?.destino_respuesta || 'tarea'
    const inicioRapido = elemento('section', ['cms-formulario-inicio-rapido'])
    inicioRapido.append(elemento('h4', [], 'Empezar con un modelo'), elemento('p', ['ayuda'], 'Podés cambiar cualquier opción después.'))
    ;[
      ['Consulta', 'pedido', 'solicitud', 'Consulta o solicitud', 'Contanos qué necesitás para que el equipo adecuado pueda responderte.'],
      ['Inscripción', 'inscripcion', 'alta_persona', 'Inscripción', 'Registrá los datos necesarios para participar y recibir seguimiento.'],
      ['Voluntariado', 'voluntariado', 'tarea', 'Sumate como voluntario', 'Contanos cómo te gustaría colaborar con Aletea.'],
      ['Actividad', 'actividad', 'actividad', 'Participar en una actividad', 'Reservá tu lugar y compartí la información necesaria para coordinar.'],
    ].forEach(([etiqueta, tipoValor, destinoValor, tituloValor, descripcionValor]) => inicioRapido.appendChild(boton(etiqueta, () => {
      tipo.value = tipoValor; destinoRespuesta.value = destinoValor
      if (!titulo.value) titulo.value = tituloValor
      if (!descripcion.value) descripcion.value = descripcionValor
      tipo.dispatchEvent(new Event('change', { bubbles: true })); titulo.dispatchEvent(new Event('input', { bubbles: true })); titulo.focus()
    }, ['cms-formulario-modelo'])))
    const privacidad = elemento('details', ['cms-datos-adicionales', 'cms-privacidad-formulario'])
    privacidad.appendChild(elemento('summary', [], 'Uso de datos y privacidad'))
    const finalidad = areaCms('Ej. Responder esta consulta y derivarla al equipo correspondiente.', 'Finalidad de los datos'); finalidad.value = borrador?.finalidad || formulario?.finalidad || 'Responder la consulta y realizar su seguimiento.'; finalidad.maxLength = 500
    const responsableDatos = inputCms('Ej. Aletea, equipo de Familias', 'Responsable de los datos'); responsableDatos.value = borrador?.responsable_datos || formulario?.responsable_datos || 'Aletea'; responsableDatos.maxLength = 180
    const conservacion = selectorCms([[6, '6 meses'], [12, '12 meses, recomendado'], [24, '24 meses']], 'Plazo de conservación'); conservacion.value = String(borrador?.conservacion_meses || formulario?.conservacion_meses || 12)
    const consentimientoCaja = elemento('label', ['cms-configurador-requerido'])
    const consentimiento = document.createElement('input'); consentimiento.type = 'checkbox'; consentimiento.checked = borrador?.requiere_consentimiento ?? (formulario?.requiere_consentimiento === undefined ? true : Boolean(formulario.requiere_consentimiento))
    consentimientoCaja.append(consentimiento, document.createTextNode(' Pedir confirmación antes de enviar'))
    privacidad.append(
      elemento('p', ['ayuda'], 'Este resumen se muestra antes del botón de envío. La política completa se edita en Página web > Privacidad.'),
      finalidad, responsableDatos, conservacion, consentimientoCaja,
    )
    let campos = []
    try { campos = Array.isArray(borrador?.campos) ? borrador.campos : JSON.parse(formulario?.campos_json || '[]') } catch { campos = [] }
    const configurador = elemento('section', ['cms-configurador-campos'])
    const listaCampos = elemento('div', ['cms-configurador-lista'])
    const normalizarClave = (texto, indice) => texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `campo_${indice + 1}`
    const dibujarCampos = () => {
      listaCampos.replaceChildren()
      campos.forEach((campo, indice) => {
        const fila = elemento('article', ['cms-configurador-campo'])
        const etiqueta = inputCms('Ej. Preferencia de horario', `Título del campo ${indice + 1}`); etiqueta.value = campo.etiqueta || ''; etiqueta.required = true
        const tipoCampo = selectorCms([['texto', 'Texto breve'], ['texto_largo', 'Texto largo'], ['seleccion', 'Lista de opciones'], ['casilla', 'Casilla de confirmación'], ['fecha', 'Fecha']], `Tipo del campo ${indice + 1}`); tipoCampo.value = campo.tipo || 'texto'
        const ayuda = inputCms('Ayuda opcional para responder', `Ayuda del campo ${indice + 1}`); ayuda.value = campo.ayuda || ''
        const opciones = inputCms('Opción 1, Opción 2', `Opciones del campo ${indice + 1}`); opciones.value = (campo.opciones || []).join(', ')
        const requeridoCaja = elemento('label', ['cms-configurador-requerido']); const requerido = document.createElement('input'); requerido.type = 'checkbox'; requerido.checked = Boolean(campo.requerido); requeridoCaja.append(requerido, document.createTextNode(' Respuesta obligatoria'))
        const condicion = selectorCms([['', 'Siempre visible'], ...campos.slice(0, indice).map((anterior, anteriorIndice) => [anterior.clave || normalizarClave(anterior.etiqueta || '', anteriorIndice), `Mostrar según: ${anterior.etiqueta || `Campo ${anteriorIndice + 1}`}`])], `Condición del campo ${indice + 1}`); condicion.value = campo.mostrar_si?.campo || ''
        const valorCondicion = inputCms('Valor que muestra este campo', `Valor de condición del campo ${indice + 1}`); valorCondicion.value = campo.mostrar_si?.valor || ''; valorCondicion.hidden = !condicion.value
        const sincronizar = () => {
          campo.etiqueta = etiqueta.value; campo.clave = normalizarClave(etiqueta.value, indice); campo.tipo = tipoCampo.value; campo.ayuda = ayuda.value
          campo.opciones = opciones.value.split(',').map((valor) => valor.trim()).filter(Boolean); campo.requerido = requerido.checked
          campo.mostrar_si = condicion.value ? { campo: condicion.value, valor: valorCondicion.value } : null
          opciones.hidden = tipoCampo.value !== 'seleccion'; valorCondicion.hidden = !condicion.value
        }
        ;[etiqueta, tipoCampo, ayuda, opciones, requerido, condicion, valorCondicion].forEach((control) => control.addEventListener('input', sincronizar))
        tipoCampo.addEventListener('change', sincronizar); condicion.addEventListener('change', sincronizar); sincronizar()
        const quitar = boton('Quitar campo', () => { campos.splice(indice, 1); dibujarCampos(); guardarBorrador() })
        fila.append(elemento('strong', [], `Campo ${indice + 1}`), etiqueta, tipoCampo, opciones, ayuda, requeridoCaja, condicion, valorCondicion, quitar)
        listaCampos.appendChild(fila)
      })
      if (!campos.length) listaCampos.appendChild(elemento('p', ['ayuda'], 'Todavía no agregaste preguntas propias. Nombre, contacto y mensaje se incluyen siempre.'))
    }
    const agregarCampo = boton('Agregar pregunta', () => { if (campos.length >= 20) return; campos.push({ clave: `campo_${campos.length + 1}`, etiqueta: '', tipo: 'texto', requerido: false, ayuda: '', opciones: [], mostrar_si: null }); dibujarCampos(); guardarBorrador() })
    configurador.append(elemento('h4', [], 'Preguntas configurables'), elemento('p', ['ayuda'], 'Agregá hasta 20 preguntas. Una pregunta condicional puede depender de una respuesta anterior.'), listaCampos, agregarCampo)
    dibujarCampos()
    const aviso = elemento('p', ['ayuda'], 'Un formulario público solo pide nombre, contacto y mensaje. Si elegís un equipo, la tarea se asigna automáticamente a su coordinación o referente. Las respuestas nunca crean perfiles de personas automáticamente.')
    const revisarPedido = () => { const esPedido = tipo.value === 'pedido'; const esPropuesta = tipo.value === 'propuesta'; equipo.required = esPedido || esPropuesta; equipoSolicitante.required = esPedido; equipoSolicitante.hidden = !esPedido; prioridad.hidden = !esPedido; aviso.textContent = esPropuesta ? 'Una propuesta pide objetivo, pasos, recursos y personas necesarias. Se deriva automáticamente al equipo elegido para su evaluación.' : esPedido ? 'Un pedido necesita equipo solicitante, equipo destinatario y prioridad. Cada respuesta se asigna automáticamente a la coordinación o referente del equipo destinatario.' : 'Un formulario público solo pide nombre, contacto y mensaje. Si elegís un equipo, la tarea se asigna automáticamente a su coordinación o referente. Las respuestas nunca crean perfiles de personas automáticamente.' }
    tipo.addEventListener('change', revisarPedido); revisarPedido()
    const revisarVisibilidad = () => {
      const esPublico = visibilidad.value === 'publica'
      finalidad.required = esPublico; responsableDatos.required = esPublico
      if (esPublico && !esEdicion) privacidad.open = true
    }
    visibilidad.addEventListener('change', revisarVisibilidad); revisarVisibilidad()
    const vistaPrevia = elemento('section', ['cms-formulario-vista-previa'])
    vistaPrevia.setAttribute('aria-live', 'polite')
    const actualizarVistaPrevia = () => {
      const equipoNombre = datos.equipos.find((fila) => fila.id === equipo.value)?.nombre || 'Sin equipo asignado'
      const destinoNombre = destinoRespuesta.selectedOptions[0]?.textContent || 'Sin recorrido definido'
      vistaPrevia.replaceChildren(
        elemento('span', ['cms-panel-etiqueta'], 'VISTA PREVIA ANTES DE PUBLICAR'),
        elemento('h4', [], titulo.value.trim() || 'Título del formulario'),
        elemento('p', [], descripcion.value.trim() || 'La descripción ayudará a entender para qué sirve y qué ocurrirá después.'),
      )
      const resumenVista = elemento('div', ['cms-formulario-vista-previa-meta'])
      ;[
        visibilidad.value === 'publica' ? 'Enlace público' : 'Uso interno',
        `${campos.length + 3} preguntas`,
        `Destino: ${equipoNombre}`,
        destinoNombre,
      ].forEach((texto) => resumenVista.appendChild(elemento('span', [], texto)))
      vistaPrevia.appendChild(resumenVista)
    }
    const datosDelBorrador = () => ({
      titulo: titulo.value, descripcion: descripcion.value, tipo: tipo.value, visibilidad: visibilidad.value, estado: estado.value,
      equipo_id: equipo.value, unidad_id: unidad.value, equipo_solicitante_id: equipoSolicitante.value, prioridad: prioridad.value,
      proyecto_id: proyecto.value, destino_respuesta: destinoRespuesta.value, finalidad: finalidad.value,
      responsable_datos: responsableDatos.value, conservacion_meses: Number(conservacion.value),
      requiere_consentimiento: consentimiento.checked, campos,
    })
    const guardarBorrador = () => {
      actualizarVistaPrevia()
      if (esEdicion || duplicando) return
      try { window.localStorage.setItem(claveBorrador, JSON.stringify(datosDelBorrador())) } catch { /* El formulario sigue operativo si el almacenamiento local está bloqueado. */ }
    }
    actualizarVistaPrevia()
    const acciones = elemento('div', ['cms-captura-acciones'])
    const cancelar = boton('Cancelar', () => { formularioAbierto = null; formularioAEditar = null; formularioParaDuplicar = null; dibujar() })
    const guardar = boton(esEdicion ? 'Guardar formulario' : duplicando ? 'Crear copia' : 'Crear formulario', async () => {
      if (guardando || !forma.reportValidity()) return
      guardando = true
      const datosFormulario = { titulo: titulo.value, descripcion: descripcion.value, tipo: tipo.value, visibilidad: visibilidad.value, estado: estado.value, equipo_id: equipo.value || null, unidad_id: unidad.value || null, equipo_solicitante_id: equipoSolicitante.value || null, prioridad: prioridad.value, proyecto_id: proyecto.value || null, finalidad: finalidad.value, responsable_datos: responsableDatos.value, conservacion_meses: Number(conservacion.value), requiere_consentimiento: consentimiento.checked, destino_respuesta: destinoRespuesta.value, campos }
      try {
        await pedir(esEdicion ? `/api/cms/formularios/${formulario.id}` : '/api/cms/formularios', { method: esEdicion ? 'PATCH' : 'POST', body: JSON.stringify(datosFormulario) })
        if (!esEdicion && !duplicando) { try { window.localStorage.removeItem(claveBorrador) } catch {} }
        formularioAbierto = null; formularioAEditar = null; formularioParaDuplicar = null; await cargar()
      } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
    }, ['boton-principal'])
    if (borrador && !esEdicion && !duplicando) {
      const estadoBorrador = elemento('span', ['cms-borrador-estado'], 'Borrador recuperado de este dispositivo')
      estadoBorrador.setAttribute('role', 'status')
      acciones.appendChild(estadoBorrador)
      acciones.appendChild(boton('Descartar borrador', () => {
        try { window.localStorage.removeItem(claveBorrador) } catch {}
        formularioAbierto = null
        dibujar()
      }))
    }
    acciones.append(cancelar, guardar)
    const proposito = elemento('fieldset', ['cms-formulario-paso']); proposito.append(elemento('legend', [], '1. Propósito y acceso'), inicioRapido, campoCms('Título', titulo), campoCms('Descripción breve', descripcion), campoCms('Tipo de formulario', tipo), campoCms('Quién puede responder', visibilidad), campoCms('Estado', estado))
    const recorrido = elemento('fieldset', ['cms-formulario-paso']); recorrido.append(elemento('legend', [], '2. Recorrido de cada respuesta'), campoCms('Equipo que la recibe', equipo), campoCms('Programa o espacio relacionado, opcional', unidad), equipoSolicitante, prioridad, campoCms('Proyecto relacionado, opcional', proyecto), campoCms('Al recibir una respuesta', destinoRespuesta, 'Las altas de personas, contactos y actividades quedan siempre como borradores para revisar. Nunca modifican fichas sensibles automáticamente.'))
    const preguntas = elemento('fieldset', ['cms-formulario-paso']); preguntas.append(elemento('legend', [], '3. Preguntas y revisión'), configurador, privacidad, aviso, vistaPrevia)
    forma.append(proposito, recorrido, preguntas, acciones)
    forma.addEventListener('input', guardarBorrador)
    forma.addEventListener('change', guardarBorrador)
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); guardar.click() })
    return forma
  }

  function formularioRespuestaFormulario(formulario) {
    const forma = document.createElement('form'); forma.className = 'cms-captura'
    forma.appendChild(elemento('h3', [], `Registrar respuesta: ${formulario.titulo}`))
    const nombre = inputCms('Nombre o referencia', 'Nombre'); nombre.required = true; nombre.maxLength = 180
    const contacto = inputCms('Correo, teléfono o quien responde', 'Contacto'); contacto.required = true; contacto.maxLength = 180
    const detalle = areaCms('Mensaje o contexto para quien hará el seguimiento', 'Mensaje')
    const objetivo = areaCms('Qué busca lograr la propuesta', 'Objetivo de la propuesta'); objetivo.required = formulario.tipo === 'propuesta'
    const pasos = areaCms('Pasos o actividades principales', 'Pasos de la propuesta')
    const recursos = areaCms('Recursos necesarios', 'Recursos de la propuesta')
    const personas = areaCms('Personas o roles necesarios', 'Personas necesarias para la propuesta')
    let campos = []
    try { campos = JSON.parse(formulario.campos_json || '[]') } catch { campos = [] }
    const respuestas = {}
    const camposPersonalizados = campos.map((campo) => {
      const contenedor = elemento('label', ['cms-campo-personalizado'])
      contenedor.appendChild(elemento('span', [], `${campo.etiqueta}${campo.requerido ? ' *' : ''}`))
      let control
      if (campo.tipo === 'texto_largo') control = areaCms(campo.ayuda || 'Escribí la respuesta', campo.etiqueta)
      else if (campo.tipo === 'seleccion') control = selectorCms([['', 'Elegir'], ...(campo.opciones || []).map((opcion) => [opcion, opcion])], campo.etiqueta)
      else { control = document.createElement('input'); control.type = campo.tipo === 'casilla' ? 'checkbox' : campo.tipo === 'fecha' ? 'date' : 'text'; control.setAttribute('aria-label', campo.etiqueta) }
      control.required = Boolean(campo.requerido); contenedor.appendChild(control)
      const actualizarVisibilidad = () => { contenedor.hidden = Boolean(campo.mostrar_si) && String(respuestas[campo.mostrar_si.campo] ?? '') !== campo.mostrar_si.valor; if (contenedor.hidden) control.required = false; else control.required = Boolean(campo.requerido) }
      const guardarRespuesta = () => { respuestas[campo.clave] = control.type === 'checkbox' ? control.checked : control.value; camposPersonalizados.forEach((fila) => fila.actualizarVisibilidad()) }
      control.addEventListener('input', guardarRespuesta); control.addEventListener('change', guardarRespuesta)
      return { contenedor, actualizarVisibilidad, guardarRespuesta }
    })
    camposPersonalizados.forEach((fila) => fila.actualizarVisibilidad())
    const acciones = elemento('div', ['cms-captura-acciones'])
    const cancelar = boton('Cancelar', () => { formularioAbierto = null; formularioParaRespuesta = null; dibujar() })
    const guardar = boton('Derivar respuesta', async () => {
      if (guardando || !forma.reportValidity()) return
      guardando = true
      try { await pedir(`/api/cms/formularios/${formulario.id}/respuestas`, { method: 'POST', body: JSON.stringify({ nombre: nombre.value, contacto: contacto.value, detalle: detalle.value, objetivo: objetivo.value, pasos: pasos.value, recursos: recursos.value, personas_necesarias: personas.value, respuestas, empresa: '' }) }); formularioAbierto = null; formularioParaRespuesta = null; await cargar() } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
    }, ['boton-principal'])
    acciones.append(cancelar, guardar)
    forma.append(nombre, contacto, detalle, formulario.tipo === 'propuesta' ? objetivo : document.createDocumentFragment(), formulario.tipo === 'propuesta' ? pasos : document.createDocumentFragment(), formulario.tipo === 'propuesta' ? recursos : document.createDocumentFragment(), formulario.tipo === 'propuesta' ? personas : document.createDocumentFragment(), ...camposPersonalizados.map((fila) => fila.contenedor), elemento('p', ['ayuda'], 'La respuesta quedará en la bandeja y tendrá una tarea de seguimiento.'), acciones)
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); guardar.click() })
    return forma
  }

  function panelFormularios() {
    const seccion = elemento('section', ['cms-formularios'])
    const encabezado = elemento('div', ['cms-seccion-encabezado']); const texto = elemento('div', [])
    texto.append(elemento('h3', [], 'Formularios'), elemento('p', ['ayuda'], 'Creá flujos internos o enlaces públicos. Cada respuesta deja una entrada y una tarea trazable.'))
    const accionesEncabezado = elemento('div', ['cms-reunion-acciones'])
    const idsPrueba = ['prueba-orientacion-familias', 'prueba-participar-actividad', 'prueba-consulta-formacion', 'prueba-voluntariado', 'prueba-consulta-tienda']
    const faltanPruebas = idsPrueba.some((id) => !datos.formularios.some((formulario) => formulario.id === id))
    if (datos.alcance?.global && faltanPruebas) accionesEncabezado.appendChild(boton('Preparar pruebas de la página', async () => {
      if (guardando) return
      guardando = true
      try { await pedir('/api/cms/formularios/ejemplos', { method: 'POST' }); await cargar() } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
    }))
    accionesEncabezado.appendChild(boton('Nuevo formulario', () => { formularioAbierto = 'formulario'; formularioAEditar = null; dibujar() }))
    encabezado.append(texto, accionesEncabezado)
    const herramientas = elemento('div', ['cms-herramientas-formularios'])
    const buscar = inputCms('Buscar por título, propósito, tipo o equipo', 'Buscar formularios')
    buscar.value = busquedaFormularios
    buscar.addEventListener('input', () => {
      const posicion = buscar.selectionStart
      busquedaFormularios = buscar.value
      dibujar()
      requestAnimationFrame(() => {
        const reemplazo = raiz.querySelector('input[aria-label="Buscar formularios"]')
        reemplazo?.focus()
        reemplazo?.setSelectionRange(posicion, posicion)
      })
    })
    const filtros = elemento('div', ['cms-vistas-guardadas'])
    const opcionesFiltro = [['todos', 'Todos'], ['publicos', 'Públicos'], ['internos', 'Internos'], ['activos', 'Activos'], ['cerrados', 'Cerrados']]
    opcionesFiltro.forEach(([valor, etiqueta]) => {
      const control = boton(etiqueta, () => { filtroFormularios = valor; dibujar() }, ['cms-filtro'])
      control.setAttribute('aria-pressed', String(filtroFormularios === valor))
      if (filtroFormularios === valor) control.classList.add('activa')
      filtros.appendChild(control)
    })
    herramientas.append(buscar, filtros)
    const consulta = busquedaFormularios.trim().toLocaleLowerCase('es')
    const formularios = datos.formularios.filter((formulario) => {
      if (filtroFormularios === 'publicos') return formulario.visibilidad === 'publica'
      if (filtroFormularios === 'internos') return formulario.visibilidad !== 'publica'
      if (filtroFormularios === 'activos') return formulario.estado === 'activa'
      if (filtroFormularios === 'cerrados') return formulario.estado !== 'activa'
      return true
    }).filter((formulario) => !consulta || [formulario.titulo, formulario.descripcion, formulario.tipo, formulario.equipo_nombre, formulario.proyecto_titulo].filter(Boolean).join(' ').toLocaleLowerCase('es').includes(consulta))
    const resumen = elemento('div', ['cms-resumen-formularios'])
    resumen.append(
      elemento('span', [], `${datos.formularios.filter((fila) => fila.estado === 'activa').length} activos`),
      elemento('span', [], `${datos.formularios.filter((fila) => fila.visibilidad === 'publica').length} públicos`),
      elemento('span', [], `${datos.formularios.reduce((total, fila) => total + Number(fila.respuestas_total || 0), 0)} respuestas`),
    )
    const lista = elemento('div', ['cms-formularios-lista'])
    if (formularios.length) formularios.forEach((formulario) => {
      const tarjeta = elemento('article', ['cms-formulario'])
      const acciones = elemento('div', ['cms-reunion-acciones'])
      if (puedeVerRespuestas()) acciones.appendChild(boton('Registrar respuesta', () => { formularioParaRespuesta = formulario.id; formularioAbierto = 'respuesta-formulario'; dibujar() }))
      acciones.appendChild(boton('Editar', () => { formularioAEditar = formulario.id; formularioAbierto = 'editar-formulario'; dibujar() }))
      acciones.appendChild(boton('Duplicar', () => { formularioParaDuplicar = formulario.id; formularioAbierto = 'duplicar-formulario'; dibujar() }))
      if (formulario.visibilidad === 'publica' && formulario.estado === 'activa') {
        const url = new URL('formulario.html', window.location.href); url.searchParams.set('id', formulario.id)
        acciones.append(
          boton('Abrir formulario público', () => { window.open(url.href, '_blank', 'noopener') }),
          boton('Copiar enlace', async () => {
            try { await navigator.clipboard.writeText(url.href); acciones.appendChild(elemento('span', ['cms-enlace-copiado'], 'Enlace copiado')) } catch { error = 'No se pudo copiar el enlace. Abrilo desde el navegador y copialo manualmente.'; dibujar() }
          }),
        )
      }
      let cantidadCampos = 0
      try { cantidadCampos = JSON.parse(formulario.campos_json || '[]').length } catch { cantidadCampos = 0 }
      tarjeta.append(elemento('strong', [], formulario.titulo), elemento('span', ['cms-proyecto-meta'], [formulario.tipo, formulario.visibilidad === 'publica' ? 'Público' : 'Interno', formulario.estado === 'activa' ? 'Activo' : 'Cerrado', `${cantidadCampos} preguntas propias`, `${formulario.respuestas_total || 0} respuestas`].join(' · ')), formulario.descripcion ? elemento('span', ['cms-proyecto-notas'], formulario.descripcion) : document.createDocumentFragment(), acciones)
      lista.appendChild(tarjeta)
    })
    else lista.appendChild(elemento('p', ['ayuda'], datos.formularios.length ? 'No hay formularios que coincidan con esta búsqueda o filtro.' : 'Todavía no hay formularios. Creá uno interno para ordenar una solicitud recurrente o hacelo público cuando quieras compartirlo.'))
    seccion.append(encabezado, resumen, herramientas, lista); return seccion
  }

  function panelResumenSemanal() {
    const resumen = resumenSemanalCms(datos, HOY())
    const seccion = elemento('section', ['cms-resumen-semanal'])
    const encabezado = elemento('div', ['cms-seccion-encabezado']); const texto = elemento('div', [])
    texto.append(elemento('h3', [], 'Resumen semanal'), elemento('p', ['ayuda'], `Borrador revisable del ${fechaHumana(resumen.desde)} al ${fechaHumana(resumen.hasta)}. Se actualiza con los datos reales del gestor institucional.`))
    encabezado.append(texto, boton(mostrarResumenSemanal ? 'Ocultar resumen' : 'Ver resumen', () => { mostrarResumenSemanal = !mostrarResumenSemanal; dibujar() }))
    seccion.appendChild(encabezado)
    if (mostrarResumenSemanal) {
      const lista = elemento('div', ['cms-resumen-semanal-lista'])
      const bloque = (titulo, filas, textoFila, vacio) => {
        const grupo = elemento('article', ['cms-resumen-semanal-bloque'])
        grupo.appendChild(elemento('h4', [], titulo))
        if (filas.length) grupo.append(...filas.slice(0, 6).map((fila) => elemento('p', [], textoFila(fila))))
        else grupo.appendChild(elemento('p', ['ayuda'], vacio))
        return grupo
      }
      lista.append(
        bloque('Requiere atención', [...resumen.atrasadas, ...datos.tareas.filter((tarea) => ['bloqueada', 'esperando_respuesta'].includes(tarea.estado))], (tarea) => tarea.titulo, 'No hay situaciones críticas.'),
        bloque('Tareas atrasadas', resumen.atrasadas, (tarea) => tarea.titulo, 'No hay tareas atrasadas.'),
        bloque('Próximos vencimientos', resumen.proximas, (tarea) => `${tarea.titulo}${tarea.fecha_limite ? `, ${fechaHumana(tarea.fecha_limite)}` : ''}`, 'No hay vencimientos esta semana.'),
        bloque('Actividades previstas', resumen.actividades, (evento) => `${evento.titulo}, ${fechaHoraProgramadaHumana(evento.fecha_hora)}`, 'No hay actividades previstas.'),
        bloque('Entradas para revisar', resumen.entradas, (entrada) => `${entrada.nombre}, ${entrada.tipo}`, 'No hay entradas pendientes.'),
        bloque('Decisiones vigentes', datos.decisiones.filter((decision) => decision.estado !== 'superada'), (decision) => decision.titulo, 'No hay decisiones abiertas.'),
        bloque('Seguimientos personales', datos.tareas.filter((tarea) => tarea.seguimiento_personal && tarea.seguimiento_personal_por === sesion?.correo), (tarea) => `${tarea.titulo}${tarea.motivo_seguimiento ? `, ${tarea.motivo_seguimiento.replaceAll('_', ' ')}` : ''}`, 'No marcaste tareas para seguir personalmente.'),
      )
      seccion.appendChild(lista)
      if (['direccion', 'administracion'].includes(datos.alcance?.perfil)) {
        const nota = areaCms('Qué se resolvió, qué queda en seguimiento o qué se llevará a la próxima reunión', 'Nota de revisión semanal')
        nota.value = datos.revisionSemanal?.nota || ''
        const guardar = boton(datos.revisionSemanal ? 'Actualizar revisión semanal' : 'Registrar revisión semanal', async () => {
          if (guardando) return
          guardando = true; guardar.disabled = true
          try { await pedir('/api/cms/revisiones-semanales', { method: 'POST', body: JSON.stringify({ semana_inicio: resumen.desde, nota: nota.value }) }); await cargar() } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
        }, ['boton-principal'])
        const revision = elemento('div', ['cms-revision-semanal'])
        revision.append(elemento('h4', [], 'Constancia de revisión'), datos.revisionSemanal ? elemento('p', ['ayuda'], `Registrada por ${datos.revisionSemanal.revisado_por_nombre || datos.revisionSemanal.revisado_por}.`) : elemento('p', ['ayuda'], 'Todavía no hay constancia para este resumen.'), nota, guardar)
        seccion.appendChild(revision)
      }
    }
    return seccion
  }

  function panelMetricasOperativas() {
    const metricas = metricasOperativasCms(datos.metricasTareas?.length ? datos.metricasTareas : datos.tareas, HOY())
    const seccion = elemento('section', ['cms-metricas-operativas'])
    const encabezado = elemento('div', ['cms-seccion-encabezado'])
    const texto = elemento('div', [])
    texto.append(elemento('h3', [], 'Métricas operativas'), elemento('p', ['ayuda'], 'Una lectura de los últimos 180 días y de las tareas abiertas que podés ver. Las muestras se informan para evitar conclusiones engañosas.'))
    encabezado.appendChild(texto)
    const horas = (valor) => valor === null ? 'Sin datos' : valor < 24 ? `${valor} h` : `${Math.round((valor / 24) * 10) / 10} días`
    const tarjetas = elemento('div', ['cms-metricas-lista'])
    ;[
      ['Asignación', horas(metricas.horasPromedioAsignacion), metricas.muestrasAsignacion ? `${metricas.muestrasAsignacion} tareas con registro` : 'Todavía no hay asignaciones medibles'],
      ['Cierre', horas(metricas.horasPromedioCierre), metricas.muestrasCierre ? `${metricas.muestrasCierre} tareas cerradas` : 'Todavía no hay cierres medibles'],
      ['Atrasos', `${metricas.atrasadas} · ${metricas.porcentajeAtrasadas}%`, `${metricas.abiertas} tareas abiertas`],
      ['Bloqueos', String(metricas.bloqueadas), 'Tareas que necesitan destrabarse'],
      ['Seguimientos', String(metricas.seguimientosVencidos), 'Fechas de seguimiento vencidas'],
    ].forEach(([titulo, valor, detalle]) => {
      const tarjeta = elemento('article', ['cms-metrica'])
      tarjeta.append(elemento('span', [], titulo), elemento('strong', [], valor), elemento('small', [], detalle))
      tarjetas.appendChild(tarjeta)
    })
    seccion.append(encabezado, tarjetas)
    return seccion
  }

  function panelAlertasInstitucionales() {
    const alertas = alertasInstitucionalesCms(datos, HOY())
    const pospuestas = (datos.alertasPospuestas || []).filter((fila) => fila.postergada_hasta >= HOY())
    const clavesPospuestas = new Set(pospuestas.map((fila) => fila.clave))
    const alertasVisibles = alertas.filter((alerta) => !clavesPospuestas.has(alerta.clave))
    const seccion = elemento('section', ['cms-alertas-institucionales'])
    seccion.append(elemento('h3', [], 'Alertas institucionales'), elemento('p', ['ayuda'], 'Solo se muestran las situaciones que requieren una acción concreta.'))
    const reactivar = async (clave) => {
      if (guardando) return
      guardando = true
      try { await pedir('/api/cms/alertas-pospuestas', { method: 'DELETE', body: JSON.stringify({ clave }) }); await cargar() } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
    }
    if (pospuestas.length) {
      const pendientes = elemento('div', ['cms-alertas-pospuestas'])
      pendientes.appendChild(elemento('p', ['ayuda'], `${pospuestas.length} ${pospuestas.length === 1 ? 'alerta está postergada para vos' : 'alertas están postergadas para vos'}. El resto de los equipos las sigue viendo.`))
      pospuestas.forEach((fila) => {
        const titulo = fila.clave.split(':').slice(1).join(':') || 'Alerta institucional'
        const filaPospuesta = elemento('div', ['cms-alerta-pospuesta'])
        filaPospuesta.append(elemento('span', [], `${titulo}, hasta ${fechaHumana(fila.postergada_hasta)}`), boton('Reactivar', () => reactivar(fila.clave)))
        pendientes.appendChild(filaPospuesta)
      })
      seccion.appendChild(pendientes)
    }
    if (!alertasVisibles.length) {
      seccion.appendChild(elemento('p', ['ayuda'], 'No hay riesgos altos, conflictos, tareas sin responsable ni seguimientos que requieran intervención.'))
      return seccion
    }
    const lista = elemento('div', ['cms-alertas-lista'])
    alertasVisibles.forEach((alerta) => {
      const tarjeta = elemento('article', ['cms-alerta-institucional', `cms-alerta-prioridad-${alerta.prioridad}`])
      const destino = destinoDeAlerta(alerta)
      const acciones = elemento('div', ['cms-alerta-acciones'])
      acciones.append(
        enlaceA(destino.pantalla, destino.etiqueta, [], destino.contexto),
        boton('Postergar 7 días', async () => {
          if (guardando) return
          guardando = true
          try { await pedir('/api/cms/alertas-pospuestas', { method: 'POST', body: JSON.stringify({ clave: alerta.clave, postergada_hasta: fechaEnDias(7) }) }); await cargar() } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
        }),
      )
      tarjeta.append(elemento('strong', [], alerta.titulo), elemento('span', [], alerta.detalle), acciones)
      lista.appendChild(tarjeta)
    })
    seccion.appendChild(lista)
    return seccion
  }

  function panelNotificaciones() {
    const seccion = elemento('section', ['cms-notificaciones'])
    seccion.id = 'notificaciones-tareas'
    seccion.tabIndex = -1
    const pendientes = datos.notificaciones.filter((fila) => !fila.leida_en)
    seccion.append(
      elemento('h3', [], 'Notificaciones'),
      elemento('p', ['ayuda'], pendientes.length ? `${pendientes.length} ${pendientes.length === 1 ? 'notificación requiere' : 'notificaciones requieren'} tu atención. Solo aparecen dentro del gestor institucional.` : 'No hay notificaciones nuevas. Se mantienen dentro del gestor institucional.'),
    )
    if (!datos.notificaciones.length) return seccion
    const lista = elemento('div', ['cms-notificaciones-lista'])
    datos.notificaciones.slice(0, 8).forEach((notificacion) => {
      const item = elemento('article', ['cms-notificacion', notificacion.leida_en ? 'cms-notificacion-leida' : ''])
      const acciones = elemento('div', ['cms-reunion-acciones'])
      if (notificacion.tarea_id) acciones.appendChild(boton('Abrir tarea', async () => {
        if (!notificacion.leida_en) {
          try {
            await pedir(`/api/cms/notificaciones/${notificacion.id}`, { method: 'PATCH' })
            notificacion.leida_en = new Date().toISOString()
            alCambiarNotificaciones(datos.notificaciones.filter((fila) => !fila.leida_en).length)
          } catch { /* Abrir la tarea sigue siendo prioritario. */ }
        }
        if (area === 'trabajo') await abrirContextoTarea(notificacion.tarea_id)
        else alIrA('cms-trabajo', { tareaId: notificacion.tarea_id })
      }, ['boton-principal']))
      if (!notificacion.leida_en) acciones.appendChild(boton('Marcar como leída', async () => {
        if (guardando) return
        guardando = true
        try { await pedir(`/api/cms/notificaciones/${notificacion.id}`, { method: 'PATCH' }); await cargar() } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
      }))
      item.append(elemento('strong', [], notificacion.titulo), elemento('span', ['cms-proyecto-meta'], notificacion.detalle || notificacion.tarea_titulo || ''), acciones)
      lista.appendChild(item)
    })
    seccion.appendChild(lista)
    return seccion
  }

  function panelRegistroInstitucional() {
    if (datos.alcance?.perfil !== 'administracion') return document.createDocumentFragment()
    const seccion = elemento('section', ['cms-registro-institucional'])
    const encabezado = elemento('div', ['cms-seccion-encabezado'])
    const texto = elemento('div', [])
    texto.append(
      elemento('h3', [], 'Registro institucional'),
      elemento('p', ['ayuda'], 'Últimos accesos y cambios del sistema. Solo Administración puede consultarlos.'),
    )
    encabezado.append(texto, boton('Actualizar registro', async () => {
      await cargarActividadInstitucional()
      dibujar()
    }))
    seccion.appendChild(encabezado)
    if (cargandoActividadInstitucional) {
      seccion.appendChild(elemento('p', ['ayuda'], 'Cargando el registro institucional...'))
      return seccion
    }
    if (errorActividadInstitucional) {
      seccion.append(elemento('p', ['error-ajustes'], `No se pudo cargar el registro: ${errorActividadInstitucional}`))
      return seccion
    }
    if (!actividadInstitucional.length) {
      seccion.appendChild(elemento('p', ['ayuda'], 'Todavía no hay accesos ni cambios registrados.'))
      return seccion
    }
    const lista = elemento('ol', ['cms-registro-lista'])
    actividadInstitucional.forEach((actividad) => {
      const fila = elemento('li', ['cms-registro-fila'])
      fila.append(
        elemento('strong', [], actividad.accion || 'Cambio institucional'),
        elemento('span', [], actividad.detalle || actividad.recurso || 'Sin detalle adicional'),
        elemento('small', [], `${actividad.actor_nombre || actividad.correo || 'Cuenta institucional'} - ${fechaHoraAuditoria(actividad.cuando)}`),
      )
      lista.appendChild(fila)
    })
    seccion.appendChild(lista)
    return seccion
  }

  function formularioComunicado() {
    const forma = document.createElement('form'); forma.className = 'cms-captura cms-captura-comunicado'
    const titulo = inputCms('Ej. Cambio de horario para el sábado', 'Título del comunicado'); titulo.required = true; titulo.maxLength = 180
    const detalle = areaCms('Contexto, acción esperada o enlace de referencia', 'Detalle'); detalle.rows = 4
    const prioridad = selectorCms([['normal', 'Información'], ['urgente', 'Urgente']], 'Prioridad')
    const equipo = selectorCms([['', 'Toda la organización'], ...datos.equipos.map((fila) => [fila.id, fila.nombre])], 'Alcance del comunicado')
    const vence = inputCms('', 'Vigente hasta', 'date')
    if (!datos.alcance?.global) { equipo.value = datos.alcance?.equipos?.[0] || ''; equipo.required = true }
    const acciones = accionesFormulario(async () => {
      if (!forma.reportValidity() || guardando) return
      guardando = true
      try {
        await pedir('/api/cms/comunicados', { method: 'POST', body: JSON.stringify({ titulo: titulo.value, detalle: detalle.value, prioridad: prioridad.value, equipo_id: equipo.value || null, vence_el: vence.value || null }) })
        formularioAbierto = null; await cargar()
      } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
    }, 'Publicar comunicado')
    forma.append(elemento('h3', [], 'Nuevo comunicado interno'), titulo, detalle, elemento('p', ['ayuda'], 'Los comunicados se ven dentro del gestor institucional. Podés dirigirlos a un equipo o, desde Dirección o Administración, a toda la organización.'), elemento('div', ['cms-captura-detalles'], prioridad, equipo, vence), acciones)
    return forma
  }

  function panelComunicados() {
    const seccion = elemento('section', ['cms-comunicados'])
    const encabezado = elemento('div', ['cms-seccion-encabezado'])
    const texto = elemento('div', [])
    texto.append(elemento('h3', [], 'Comunicados internos'), elemento('p', ['ayuda'], 'Avisos para coordinación diaria y situaciones urgentes. Se mantienen en el gestor institucional junto al contexto de trabajo.'))
    encabezado.append(texto, datos.alcance?.puede_gestionar ? boton('Nuevo comunicado', () => { formularioAbierto = formularioAbierto === 'comunicado' ? null : 'comunicado'; dibujar() }) : document.createDocumentFragment())
    seccion.appendChild(encabezado)
    if (!datos.comunicados.length) { seccion.appendChild(elemento('p', ['ayuda'], 'No hay comunicados vigentes.')); return seccion }
    const lista = elemento('div', ['cms-comunicados-lista'])
    datos.comunicados.forEach((comunicado) => {
      const tarjeta = elemento('article', ['cms-comunicado', comunicado.prioridad === 'urgente' ? 'cms-comunicado-urgente' : ''])
      const acciones = elemento('div', ['cms-reunion-acciones'])
      if (datos.alcance?.puede_gestionar && (datos.alcance?.global || comunicado.equipo_id && datos.alcance.equipos.includes(comunicado.equipo_id))) acciones.appendChild(boton('Cerrar comunicado', async () => {
        if (guardando) return
        guardando = true
        try { await pedir(`/api/cms/comunicados/${comunicado.id}`, { method: 'PATCH' }); await cargar() } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
      }))
      tarjeta.append(elemento('strong', [], comunicado.titulo), elemento('span', ['cms-proyecto-meta'], [comunicado.prioridad === 'urgente' ? 'Urgente' : 'Información', comunicado.equipo_nombre || 'Toda la organización', comunicado.vence_el ? `Vigente hasta ${fechaHumana(comunicado.vence_el)}` : 'Sin vencimiento'].join(' · ')), comunicado.detalle ? elemento('span', ['cms-proyecto-notas'], comunicado.detalle) : document.createDocumentFragment(), acciones)
      lista.appendChild(tarjeta)
    })
    seccion.appendChild(lista)
    return seccion
  }

  function panelEventos() {
    const seccion = elemento('section', ['cms-eventos'])
    const encabezado = elemento('div', ['cms-seccion-encabezado']); const texto = elemento('div', [])
    texto.append(elemento('h3', [], 'Agenda institucional'), elemento('p', ['ayuda'], 'Actividades, reuniones, publicaciones y vencimientos. Las minutas se gestionan aparte.'))
    encabezado.append(texto, boton('Nueva actividad', () => { formularioAbierto = formularioAbierto === 'evento' ? null : 'evento'; dibujar() }))
    const vistas = elemento('div', ['cms-vistas-guardadas', 'cms-agenda-vistas'])
    ;[['mes', 'Mes'], ['semana', 'Semana'], ['proximos30', 'Próximos 30 días'], ['lista', 'Lista']].forEach(([valor, etiqueta]) => {
      const control = boton(etiqueta, () => { vistaAgenda = valor; dibujar() }, ['cms-filtro'])
      control.setAttribute('aria-pressed', String(vistaAgenda === valor))
      if (vistaAgenda === valor) control.classList.add('activa')
      vistas.appendChild(control)
    })
    const lista = elemento('div', ['cms-eventos-lista'])
    const hoy = new Date(`${HOY()}T12:00:00`)
    const inicioSemana = new Date(hoy); inicioSemana.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7))
    const finSemana = new Date(inicioSemana); finSemana.setDate(inicioSemana.getDate() + 6); finSemana.setHours(23, 59, 59, 999)
    const hasta30 = new Date(hoy); hasta30.setDate(hoy.getDate() + 30); hasta30.setHours(23, 59, 59, 999)
    const eventosVisibles = datos.eventos.filter((evento) => {
      const fecha = fechaDesdeLocal(evento.fecha_hora)
      if (vistaAgenda === 'semana') return fecha >= inicioSemana && fecha <= finSemana
      if (vistaAgenda === 'mes') return fecha.getFullYear() === hoy.getFullYear() && fecha.getMonth() === hoy.getMonth()
      if (vistaAgenda === 'proximos30') return fecha >= hoy && fecha <= hasta30
      return true
    }).sort((a, b) => String(a.fecha_hora).localeCompare(String(b.fecha_hora)))
    if (vistaAgenda === 'mes') {
      const calendario = elemento('div', ['cms-calendario-mes'])
      const tituloMes = new Intl.DateTimeFormat('es-UY', { month: 'long', year: 'numeric' }).format(hoy)
      calendario.appendChild(elemento('h4', [], tituloMes.charAt(0).toUpperCase() + tituloMes.slice(1)))
      const grilla = elemento('div', ['cms-calendario-grilla'])
      ;['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach((dia) => grilla.appendChild(elemento('span', ['cms-calendario-dia-semana'], dia)))
      const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      const desplazamiento = (primero.getDay() + 6) % 7
      for (let i = 0; i < desplazamiento; i += 1) grilla.appendChild(elemento('span', ['cms-calendario-vacio'], ''))
      const totalDias = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()
      for (let dia = 1; dia <= totalDias; dia += 1) {
        const celda = elemento('article', ['cms-calendario-dia', dia === hoy.getDate() ? 'cms-calendario-hoy' : ''])
        celda.appendChild(elemento('strong', [], String(dia)))
        eventosVisibles.filter((evento) => fechaDesdeLocal(evento.fecha_hora).getDate() === dia).slice(0, 3).forEach((evento) => celda.appendChild(elemento('span', ['cms-calendario-evento'], evento.titulo)))
        grilla.appendChild(celda)
      }
      calendario.appendChild(grilla)
      lista.appendChild(calendario)
    }
    if (eventosVisibles.length) eventosVisibles.forEach((evento) => {
      const tarjeta = elemento('article', ['cms-evento'])
      const superior = elemento('div', ['cms-reunion-encabezado'])
      superior.append(elemento('strong', [], evento.titulo), elemento('span', ['cms-estado'], evento.estado === 'realizado' ? 'Realizado' : 'Planificado'))
      const contexto = [TEXTO_TIPO_EVENTO[evento.tipo || 'actividad'], fechaHoraProgramadaHumana(evento.fecha_hora), evento.fecha_fin ? `hasta ${fechaHoraProgramadaHumana(evento.fecha_fin)}` : '', evento.lugar, evento.equipo_nombre, evento.proyecto_titulo, evento.responsable_nombre || evento.responsable_correo].filter(Boolean).join(' · ')
      const total = Number(evento.tareas_total || 0)
      const completadas = Number(evento.tareas_completadas || 0)
      const pendientes = Number(evento.tareas_pendientes || 0)
      const preparacion = total
        ? pendientes
          ? `Preparación: ${completadas} de ${total} completadas · ${pendientes} pendientes`
          : `Preparación completa: ${completadas} tareas`
        : 'Sin tareas de preparación'
      const acciones = elemento('div', ['cms-reunion-acciones'])
      acciones.appendChild(boton('Agregar tarea', () => { actividadPreseleccionada = evento.id; tipoNuevaTarea = 'tarea'; formularioAbierto = 'tarea'; dibujar() }))
      acciones.appendChild(boton('Editar actividad', () => { eventoAEditar = evento.id; formularioAbierto = 'editar-evento'; dibujar() }))
      tarjeta.append(superior, elemento('span', ['cms-reunion-meta'], contexto), elemento('span', ['cms-evento-preparacion', pendientes ? 'cms-evento-preparacion-pendiente' : ''], preparacion), evento.descripcion ? elemento('span', ['cms-reunion-objetivo'], evento.descripcion) : document.createDocumentFragment(), acciones)
      lista.appendChild(tarjeta)
    })
    else lista.appendChild(elemento('p', ['ayuda'], datos.eventos.length ? 'No hay actividades en este período. Probá otra vista.' : 'Todavía no hay actividades próximas. Agendá la primera para darle contexto al trabajo del equipo.'))
    seccion.append(encabezado, vistas, lista); return seccion
  }

  function panelContextoProtegidoDePersonas() {
    const panel = elemento('section', ['cms-contexto-personas-protegido'])
    const puedeAbrirFicha = datos.alcance?.nivel_datos_personales === 'sensible' || datos.alcance?.perfil === 'administracion'
    panel.append(
      elemento('span', ['cms-panel-etiqueta'], 'Personas y privacidad'),
      elemento('h3', [], puedeAbrirFicha ? 'Contexto protegido habilitado' : 'Contexto protegido por permisos'),
      elemento('p', [], puedeAbrirFicha
        ? 'Podés consultar fichas protegidas cuando sea necesario para una jornada. Cada apertura y cambio queda registrado.'
        : 'Las fotos, contactos y necesidades sensibles se consultan solamente desde la ficha protegida por quienes tienen autorización vigente.'),
      enlaceA('operacion', 'Abrir operación y personas', ['cms-contexto-personas-accion']),
    )
    return panel
  }

  function panelConflictosAgenda() {
    if (!datos.conflictos.length) return document.createDocumentFragment()
    const seccion = elemento('section', ['cms-conflictos'])
    seccion.append(elemento('h3', [], 'Conflictos de agenda'), elemento('p', ['ayuda'], 'Comparamos actividades distintas. Las fechas de una misma serie recurrente no se marcan entre sí. Revisá primero los cruces de lugar o responsable.'))
    const lista = elemento('div', ['cms-conflictos-lista'])
    const claveCoordinados = `aletea:agenda:cruces-coordinados:v1:${sesion?.correo || sesion?.usuario || 'cuenta'}`
    let coordinados = []
    try { coordinados = JSON.parse(window.localStorage.getItem(claveCoordinados) || '[]') } catch { coordinados = [] }
    const claveConflicto = (conflicto) => {
      const ids = Array.isArray(conflicto.eventos) ? conflicto.eventos.map((evento) => evento.id) : [conflicto.evento_a_id, conflicto.evento_b_id]
      return `${conflicto.fecha_hora || conflicto.evento_a_fecha_hora}:${ids.filter(Boolean).sort().join(',')}`
    }
    const pintar = (mostrarCoordinados = false) => {
      lista.replaceChildren()
      const visibles = datos.conflictos.filter((conflicto) => mostrarCoordinados || !coordinados.includes(claveConflicto(conflicto)))
      visibles.forEach((conflicto) => {
        const tarjeta = elemento('article', ['cms-conflicto'])
      const titulos = Array.isArray(conflicto.eventos) ? conflicto.eventos.map((evento) => evento.titulo) : [conflicto.evento_a_titulo, conflicto.evento_b_titulo].filter(Boolean)
      const fechaHora = conflicto.fecha_hora || conflicto.evento_a_fecha_hora
      const prioridad = conflicto.motivos.includes('Mismo lugar') ? 'Revisar primero' : conflicto.motivos.includes('Mismo responsable') ? 'Prioridad alta' : 'Revisión de equipo'
      const identidades = new Map()
      ;(conflicto.eventos || []).forEach((evento) => {
        const titulo = String(evento.titulo || '').trim().toLocaleLowerCase('es-UY')
        if (!identidades.has(titulo)) identidades.set(titulo, new Set())
        identidades.get(titulo).add(evento.serie_id || `independiente:${evento.id}`)
      })
      const repetidos = [...identidades.values()].some((series) => series.size > 1)
      tarjeta.append(
        elemento('span', ['cms-conflicto-prioridad'], prioridad),
        elemento('strong', [], `${titulos.length} actividades distintas coinciden`),
        elemento('span', ['cms-conflicto-titulos'], titulos.join(' · ')),
        elemento('span', ['cms-conflicto-meta'], `${fechaHoraProgramadaHumana(fechaHora)} · ${conflicto.motivos.join(', ')}`),
      )
        if (repetidos) tarjeta.appendChild(elemento('span', ['cms-conflicto-duplicado'], 'Posible actividad duplicada'))
        const acciones = elemento('div', ['cms-conflicto-acciones'])
        acciones.append(enlaceA('cms-agenda', 'Revisar en agenda'), boton('Es intencional', () => {
          coordinados = [...new Set([...coordinados, claveConflicto(conflicto)])].slice(-40)
          try { window.localStorage.setItem(claveCoordinados, JSON.stringify(coordinados)) } catch {}
          pintar()
        }))
        tarjeta.appendChild(acciones)
        lista.appendChild(tarjeta)
      })
      if (!visibles.length) lista.appendChild(elemento('p', ['cms-conflictos-resueltos'], 'Todos los cruces visibles ya fueron coordinados.'))
    }
    pintar()
    seccion.append(lista, enlaceA('cms-agenda', 'Ver agenda'))
    if (coordinados.length) seccion.appendChild(boton('Mostrar cruces coordinados', () => pintar(true), ['cms-conflictos-mostrar']))
    return seccion
  }

  function panelSeguimientoPersonal() {
    const correo = sesion?.correo
    if (!correo) return document.createDocumentFragment()
    const propias = datos.tareas.filter((tarea) => tarea.responsable_correo === correo)
    const solicitudes = datos.tareas.filter((tarea) => tarea.tipo === 'solicitud' && tarea.solicitante_correo === correo)
    const seccion = elemento('section', ['cms-seguimiento-personal'])
    seccion.append(
      elemento('h3', [], 'Tu seguimiento'),
      elemento('p', ['ayuda'], 'Tus responsabilidades y las solicitudes que iniciaste, ordenadas para resolver lo próximo primero.'),
      elemento('p', ['cms-seguimiento-resumen'], `${propias.length} ${propias.length === 1 ? 'tarea' : 'tareas'} a tu cargo · ${solicitudes.length} ${solicitudes.length === 1 ? 'solicitud activa' : 'solicitudes activas'}`),
    )
    const lista = elemento('div', ['cms-seguimiento-lista'])
    if (propias.length) lista.append(...propias.slice(0, 6).map(filaTarea))
    else lista.appendChild(elemento('p', ['ayuda'], 'No tenés tareas activas a tu cargo. Podés seguir las prioridades generales arriba.'))
    seccion.appendChild(lista)
    return seccion
  }

  function panelHorizonteInstitucional() {
    const seccion = elemento('section', ['cms-horizonte'])
    seccion.append(elemento('h3', [], 'Horizonte institucional'), elemento('p', ['ayuda'], 'Una lectura rápida de las actividades y vencimientos que llegan en los próximos 7, 15, 30 y 90 días.'))
    const lista = elemento('div', ['cms-horizonte-lista'])
    horizonteInstitucionalCms({ tareas: datos.tareas, eventos: datos.eventos }, HOY()).forEach((tramo) => {
      const tarjeta = elemento('article', ['cms-horizonte-tramo'])
      tarjeta.append(
        elemento('strong', [], `${tramo.dias} días`),
        elemento('span', [], `${tramo.actividades.length} ${tramo.actividades.length === 1 ? 'actividad' : 'actividades'}`),
        elemento('span', [], `${tramo.vencimientos.length} ${tramo.vencimientos.length === 1 ? 'vencimiento' : 'vencimientos'}`),
        elemento('small', [], `Hasta ${fechaHumana(tramo.hasta)}`),
      )
      lista.appendChild(tarjeta)
    })
    seccion.appendChild(lista)
    return seccion
  }

  function panelChecklists() {
    const seccion = elemento('section', ['cms-estructura'])
    const encabezado = elemento('div', ['cms-seccion-encabezado']); const texto = elemento('div', [])
    texto.append(elemento('h3', [], 'Checklists reutilizables'), elemento('p', ['ayuda'], 'Convertí una preparación repetida en tareas con fechas calculadas desde la actividad.'))
    encabezado.append(texto, boton('Nueva checklist', () => { formularioAbierto = formularioAbierto === 'checklist' ? null : 'checklist'; dibujar() }))
    const lista = elemento('div', ['cms-estructura-lista'])
    if (datos.plantillas.length) datos.plantillas.forEach((plantilla) => {
      const tarjeta = elemento('article', ['cms-proyecto'])
      const actividad = selectorCms([['', 'Elegí una actividad'], ...datos.eventos.filter((evento) => evento.estado === 'planificado').map((evento) => [evento.id, `${fechaHoraProgramadaHumana(evento.fecha_hora)}: ${evento.titulo}`])], `Actividad para ${plantilla.titulo}`)
      const aplicar = boton('Aplicar checklist', async () => {
        if (!actividad.value || guardando) { actividad.focus(); return }
        guardando = true; aplicar.disabled = true
        try { await pedir(`/api/cms/plantillas-tareas/${plantilla.id}/aplicar`, { method: 'POST', body: JSON.stringify({ evento_id: actividad.value }) }); await cargar() } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
      }, ['boton-principal'])
      tarjeta.append(elemento('strong', [], plantilla.titulo), elemento('span', ['cms-proyecto-meta'], `${plantilla.cantidad_tareas} tareas · ${plantilla.equipo_nombre || 'Equipo de la actividad'}`), plantilla.descripcion ? elemento('span', ['cms-proyecto-notas'], plantilla.descripcion) : document.createDocumentFragment(), actividad, aplicar)
      lista.appendChild(tarjeta)
    })
    else lista.appendChild(elemento('p', ['ayuda'], 'Todavía no hay checklists. Creá una para no reconstruir la preparación de cada actividad.'))
    seccion.append(encabezado, lista); return seccion
  }

  function panelTareasRecurrentes() {
    const seccion = elemento('section', ['cms-estructura', 'cms-recurrentes'])
    const encabezado = elemento('div', ['cms-seccion-encabezado']); const texto = elemento('div', [])
    texto.append(elemento('h3', [], 'Tareas recurrentes'), elemento('p', ['ayuda'], 'Las rutinas se convierten automáticamente en tareas al llegar su fecha, con equipo y responsable.'))
    encabezado.append(texto, boton('Nueva tarea recurrente', () => { modeloRecurrente = null; formularioAbierto = formularioAbierto === 'tarea-recurrente' ? null : 'tarea-recurrente'; dibujar() }))
    const sugerencias = elemento('div', ['cms-modelos-recurrentes'])
    sugerencias.appendChild(elemento('p', ['ayuda'], 'Modelos sugeridos por el plan institucional. Siempre revisá equipo, responsable y próxima fecha antes de crear la rutina.'))
    const modelos = [
      { titulo: 'Revisión semanal de coordinación', descripcion: 'Revisar pendientes, responsables, fechas próximas, decisiones y esperas del equipo.', frecuencia: 'semanal', prioridad: 'alta' },
      { titulo: 'Planificar publicaciones del mes', descripcion: 'Definir contenidos, responsables, fechas y materiales de comunicación para el mes.', frecuencia: 'mensual', prioridad: 'normal' },
      { titulo: 'Seguimiento de pagos y vencimientos', descripcion: 'Revisar pagos pendientes, vencimientos y documentación necesaria.', frecuencia: 'mensual', prioridad: 'alta' },
      { titulo: 'Renovaciones y trámites institucionales', descripcion: 'Verificar renovaciones, certificaciones y trámites con fecha próxima.', frecuencia: 'mensual', prioridad: 'alta' },
    ]
    const accionesModelos = elemento('div', ['cms-proyecto-acciones'])
    modelos.forEach((modelo) => accionesModelos.appendChild(boton(modelo.titulo, () => { modeloRecurrente = modelo; formularioAbierto = 'tarea-recurrente'; dibujar() })))
    sugerencias.appendChild(accionesModelos)
    const lista = elemento('div', ['cms-estructura-lista'])
    if (datos.recurrencias.length) datos.recurrencias.forEach((recurrente) => {
      const tarjeta = elemento('article', ['cms-proyecto', 'cms-tarea-recurrente'])
      const acciones = elemento('div', ['cms-proyecto-acciones'])
      const fallo = (datos.automatizaciones || []).find((ejecucion) => ejecucion.recurrencia_id === recurrente.id && ejecucion.estado === 'fallida')
      acciones.appendChild(boton(fallo ? 'Reintentar ahora' : 'Generar ahora', async () => {
        if (guardando) return
        guardando = true
        try { await pedir(`/api/cms/tareas-recurrentes/${recurrente.id}/generar`, { method: 'POST' }); await cargar() } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
      }, ['boton-principal']))
      tarjeta.append(
        elemento('strong', [], recurrente.titulo),
        elemento('span', ['cms-proyecto-meta'], `${recurrente.frecuencia === 'mensual' ? 'Mensual' : 'Semanal'} · ${recurrente.equipo_nombre || 'Sin equipo'} · ${recurrente.responsable_nombre || 'Sin responsable'}`),
        elemento('span', ['cms-proyecto-fecha'], `Próxima tarea: ${fechaHumana(recurrente.proxima_fecha)}`),
        fallo ? elemento('p', ['cms-alerta-automatizacion'], `El último intento no pudo completarse${fallo.actualizado_en ? ` el ${fechaHoraHumana(fallo.actualizado_en)}` : ''}. La fecha se conserva para que puedas reintentarlo.`) : document.createDocumentFragment(),
        recurrente.descripcion ? elemento('span', ['cms-proyecto-notas'], recurrente.descripcion) : document.createDocumentFragment(), acciones,
      )
      lista.appendChild(tarjeta)
    })
    else lista.appendChild(elemento('p', ['ayuda'], 'Todavía no hay tareas recurrentes. Creá una para las rutinas que no deberían depender de la memoria.'))
    seccion.append(encabezado, sugerencias, lista); return seccion
  }

  function panelReuniones() {
    const seccion = elemento('section', ['cms-reuniones'])
    const encabezado = elemento('div', ['cms-seccion-encabezado'])
    const texto = elemento('div', [])
    texto.append(
      elemento('h3', [], 'Reuniones y decisiones'),
      elemento('p', ['ayuda'], 'Prepará encuentros, dejá una minuta y convertí los acuerdos en tareas visibles.'),
    )
    encabezado.append(texto, boton('Nueva reunión', () => { formularioAbierto = formularioAbierto === 'reunion' ? null : 'reunion'; dibujar() }))
    const reuniones = elemento('div', ['cms-reuniones-lista'])
    if (datos.reuniones.length) {
      datos.reuniones.forEach((reunion) => {
        const tarjeta = elemento('article', ['cms-reunion'])
        const superior = elemento('div', ['cms-reunion-encabezado'])
        superior.append(
          elemento('strong', [], reunion.titulo),
          elemento('span', ['cms-estado'], TEXTO_ESTADO_REUNION[reunion.estado] || reunion.estado),
        )
        const contexto = [fechaHoraProgramadaHumana(reunion.fecha_hora), reunion.equipo_nombre, reunion.proyecto_titulo, reunion.lugar].filter(Boolean).join(' · ')
        const acciones = elemento('div', ['cms-reunion-acciones'])
        acciones.append(
          boton('Editar reunión', () => { reunionAEditar = reunion.id; formularioAbierto = 'editar-reunion'; dibujar() }),
          reunion.estado !== 'realizada'
            ? boton('Cerrar reunión', () => { reunionDeCierre = reunion.id; formularioAbierto = 'cierre-reunion'; dibujar() })
            : boton('Registrar otra decisión', () => { reunionDeDecision = reunion.id; formularioAbierto = 'decision'; dibujar() }),
        )
        tarjeta.append(superior, elemento('span', ['cms-reunion-meta'], contexto), reunion.objetivo ? elemento('span', ['cms-reunion-objetivo'], reunion.objetivo) : document.createDocumentFragment(), acciones)
        reuniones.appendChild(tarjeta)
      })
    } else reuniones.appendChild(elemento('p', ['ayuda'], 'Todavía no hay reuniones registradas. Agendá la primera cuando necesiten decidir algo en conjunto.'))
    const decisiones = elemento('div', ['cms-decisiones-lista'])
    if (datos.decisiones.length) {
      decisiones.appendChild(elemento('h4', [], 'Acuerdos vigentes'))
      datos.decisiones.forEach((decision) => {
        const tarjeta = elemento('article', ['cms-decision'])
        const acciones = elemento('div', ['cms-reunion-acciones'])
        if (!decision.tarea_id) {
          acciones.appendChild(boton('Crear tarea', async () => {
            if (guardando) return
            guardando = true
            try { await pedir(`/api/cms/decisiones/${decision.id}/tarea`, { method: 'POST' }); await cargar() } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
          }))
        } else acciones.appendChild(elemento('span', ['cms-decision-vinculada'], 'Tarea vinculada'))
        tarjeta.append(
          elemento('strong', [], decision.titulo),
          elemento('span', ['cms-reunion-meta'], [decision.reunion_titulo, decision.responsable_nombre ?? decision.responsable_correo].filter(Boolean).join(' · ')),
          decision.motivo ? elemento('span', ['cms-reunion-objetivo'], decision.motivo) : document.createDocumentFragment(),
          acciones,
        )
        decisiones.appendChild(tarjeta)
      })
    }
    seccion.append(encabezado, reuniones, decisiones)
    return seccion
  }

  function panelCentroDecisiones() {
    const seccion = elemento('section', ['cms-centro-decisiones'])
    const vigentes = datos.decisiones.filter((decision) => !['cerrada', 'archivada'].includes(decision.estado))
    const sinTarea = vigentes.filter((decision) => !decision.tarea_id)
    const proximas = datos.reuniones.filter((reunion) => ['planificada', 'preparacion'].includes(reunion.estado)).sort((a, b) => String(a.fecha_hora).localeCompare(String(b.fecha_hora)))
    const encabezado = elemento('div', ['cms-seccion-encabezado'])
    const texto = elemento('div', [])
    texto.append(elemento('h3', [], 'Centro de decisiones'), elemento('p', ['ayuda'], 'De cada encuentro debería salir un acuerdo, un responsable y un próximo paso visible.'))
    encabezado.append(texto, boton('Nueva reunión', () => { formularioAbierto = 'reunion'; dibujar() }))
    const resumen = elemento('div', ['cms-decisiones-resumen'])
    ;[
      ['Decisiones vigentes', vigentes.length],
      ['Sin tarea vinculada', sinTarea.length],
      ['Próximas reuniones', proximas.length],
    ].forEach(([etiqueta, cantidad]) => {
      const item = elemento('article', [])
      item.append(elemento('strong', [], String(cantidad)), elemento('span', [], etiqueta))
      resumen.appendChild(item)
    })
    const lista = elemento('div', ['cms-decisiones-proximas'])
    if (sinTarea.length) sinTarea.slice(0, 4).forEach((decision) => {
      const fila = elemento('article', ['cms-decision-pendiente'])
      fila.append(elemento('strong', [], decision.titulo), elemento('span', [], [decision.reunion_titulo, decision.responsable_nombre || decision.responsable_correo || 'Sin responsable'].filter(Boolean).join(' · ')), boton('Ver reuniones', () => document.querySelector('.cms-reuniones')?.scrollIntoView({ behavior: 'smooth', block: 'start' })))
      lista.appendChild(fila)
    })
    else lista.appendChild(elemento('p', ['ayuda'], vigentes.length ? 'Todas las decisiones vigentes ya tienen una tarea o un seguimiento vinculado.' : 'No hay decisiones pendientes. Registralas al cerrar cada reunión para no perder los acuerdos.'))
    seccion.append(encabezado, resumen, lista)
    return seccion
  }

  function ajustarAccionesPorPerfil(seccion) {
    if (datos.alcance?.puede_gestionar) return
    const integrante = datos.alcance?.perfil === 'integrante'
    seccion.querySelectorAll('button').forEach((control) => {
      const etiqueta = control.textContent.trim()
      const tareaPropia = integrante && ['Completar tarea', 'Editar tarea'].includes(etiqueta)
      if (!tareaPropia && /^(Nueva|Nuevo|Agregar|Editar|Guardar|Registrar|Solicitar|Crear tarea|Aplicar|Configurar|Asignar|Cerrar seguimiento)/.test(etiqueta)) {
        control.hidden = true
      }
    })
  }

  function tarjetaSector({ id, etiqueta, titulo, resumen }) {
    const area = elemento('article', ['cms-area', `cms-area-${id}`])
    const cabecera = elemento('div', ['cms-area-cabecera'])
    const identidad = elemento('span', ['cms-area-identidad'])
    identidad.append(
      elemento('span', ['cms-area-etiqueta'], etiqueta),
      elemento('strong', [], titulo),
    )
    cabecera.append(
      identidad,
      elemento('span', ['cms-area-resumen'], resumen),
      enlaceA(`cms-${id}`, `Abrir ${titulo}`, ['cms-area-indicador']),
    )
    area.append(cabecera)
    return area
  }

  const nombresArea = NOMBRES_AREA
  const nombresPagina = { trabajo: 'Mis tareas', agenda: 'Agenda institucional', areas: 'Áreas de Aletea', formularios: 'Formularios y entradas', biblioteca: 'Biblioteca institucional', privacidad: 'Solicitudes de privacidad', auditoria: 'Gestión completa', ...nombresArea }
  const claveNavegacionReciente = `aletea:cms:recientes:v1:${sesion?.usuario || sesion?.correo || 'cuenta'}`
  const destinoPorArea = { control: 'inicio', trabajo: 'cms-trabajo', agenda: 'cms-agenda', areas: 'cms-areas', formularios: 'cms-formularios', biblioteca: 'cms-biblioteca', privacidad: 'cms-privacidad', auditoria: 'cms-auditoria' }
  const etiquetaDestino = (destino) => {
    if (destino === 'inicio') return 'Centro de control'
    const clave = destino.replace(/^cms-/, '')
    return nombresPagina[clave] || 'Sección del gestor'
  }
  let navegacionReciente = []
  try { navegacionReciente = JSON.parse(window.localStorage.getItem(claveNavegacionReciente) || '[]') } catch { navegacionReciente = [] }
  const destinoActual = destinoPorArea[area] || `cms-${area}`
  navegacionReciente = [destinoActual, ...navegacionReciente.filter((destino) => destino !== destinoActual)].slice(0, 5)
  try { window.localStorage.setItem(claveNavegacionReciente, JSON.stringify(navegacionReciente)) } catch { /* La navegación sigue disponible sin historial local. */ }

  function migasPagina() {
    const migas = elemento('nav', ['cms-migas'])
    migas.setAttribute('aria-label', 'Ubicación')
    const inicio = enlaceA('inicio', 'Centro de control')
    if (area === 'control') {
      inicio.setAttribute('aria-current', 'page')
      migas.appendChild(inicio)
      return migas
    }
    migas.append(inicio, elemento('span', [], '/'))
    if (nombresArea[area]) {
      migas.append(enlaceA('cms-areas', 'Áreas'), elemento('span', [], '/'))
    }
    const actual = elemento('span', ['cms-miga-actual'], nombresPagina[area] || 'Aletea')
    actual.setAttribute('aria-current', 'page')
    migas.appendChild(actual)
    return migas
  }

  function panelBusquedaGlobal() {
    const panel = elemento('section', ['cms-busqueda-global'])
    const buscar = document.createElement('input')
    buscar.type = 'search'
    buscar.placeholder = esVistaMovil() ? 'Buscar en Aletea' : 'Buscar personas, tareas, unidades, proyectos, formularios o documentos'
    buscar.setAttribute('aria-label', 'Buscar en Aletea')
    buscar.value = busquedaGlobal
    const resultados = elemento('div', ['cms-busqueda-resultados'])
    const recientesVisibles = () => navegacionReciente.filter((destino) => destino !== destinoActual).slice(0, 3)
    let mostrarRecientes = false
    const abrirRecientes = boton('Recientes', () => {
      mostrarRecientes = !mostrarRecientes
      abrirRecientes.setAttribute('aria-expanded', String(mostrarRecientes))
      pintarResultados()
    }, ['cms-busqueda-recientes-control'])
    abrirRecientes.setAttribute('aria-expanded', 'false')
    abrirRecientes.setAttribute('aria-controls', 'cms-resultados-busqueda')
    resultados.id = 'cms-resultados-busqueda'
    const pintarResultados = () => {
      resultados.replaceChildren()
      const consulta = buscar.value.trim().toLocaleLowerCase('es')
      busquedaGlobal = buscar.value
      if (consulta.length < 2) {
        const recientes = recientesVisibles()
        if (mostrarRecientes && recientes.length) {
          const encabezadoRecientes = elemento('div', ['cms-busqueda-recientes-encabezado'])
          const limpiar = boton('Limpiar', () => {
            navegacionReciente = []
            try { window.localStorage.removeItem(claveNavegacionReciente) } catch {}
            pintarResultados()
          })
          encabezadoRecientes.append(elemento('strong', [], 'Visitado recientemente'), limpiar)
          resultados.appendChild(encabezadoRecientes)
          recientes.forEach((destino) => resultados.appendChild(boton(etiquetaDestino(destino), () => irA(destino), ['cms-busqueda-resultado', 'cms-busqueda-reciente'])))
        }
        return
      }
      const colecciones = [
        ['Tarea', datos.tareas, (fila) => fila.titulo, (fila) => irA('cms-trabajo', { tareaId: fila.id, filtroTrabajo: ['completada', 'cancelada'].includes(fila.estado) ? 'cerradas' : (fila.responsable_correo ? 'todas' : 'sin-responsable') }), (fila) => [fila.equipo_nombre, fila.responsable_nombre || fila.responsable_correo].filter(Boolean).join(' · ')],
        ['Unidad', datos.unidades, (fila) => `${fila.sigla ? `${fila.sigla}: ` : ''}${fila.nombre}`, (fila) => { unidadAbiertaId = fila.id; pestanaUnidad = 'resumen'; formularioAbierto = 'ver-unidad'; dibujar() }, (fila) => datos.equipos.find((equipo) => equipo.id === fila.equipo_id)?.nombre || TEXTO_TIPO_UNIDAD[fila.tipo] || 'Unidad'],
        ['Persona', datos.responsables, (fila) => fila.nombre || fila.correo, () => irA(datos.alcance?.perfil === 'administracion' ? 'accesos' : 'cms-areas'), (fila) => datos.responsabilidades.filter((responsabilidad) => (responsabilidad.usuario_correo || responsabilidad.correo) === fila.correo).map((responsabilidad) => TEXTO_RESPONSABILIDAD[responsabilidad.tipo] || responsabilidad.tipo).filter(Boolean).join(', ') || 'Persona visible en tu alcance'],
        ['Proyecto', datos.proyectos, (fila) => fila.titulo, () => irA('cms-biblioteca'), (fila) => [fila.equipo_nombre, TEXTO_ESTADO_PROYECTO[fila.estado] || fila.estado].filter(Boolean).join(' · ')],
        ['Evento', datos.eventos, (fila) => fila.titulo, () => irA('cms-agenda'), (fila) => [fechaHoraProgramadaHumana(fila.fecha_hora), fila.equipo_nombre].filter(Boolean).join(' · ')],
        ['Formulario', datos.formularios, (fila) => fila.titulo, () => irA('cms-formularios'), (fila) => `${fila.visibilidad === 'publica' ? 'Público' : 'Interno'} · ${fila.estado === 'activa' ? 'Activo' : 'Cerrado'}`],
        ['Documento', datos.documentos, (fila) => fila.titulo, () => irA('cms-biblioteca'), (fila) => [fila.tipo, fila.sensibilidad].filter(Boolean).join(' · ')],
      ]
      const coincidencias = colecciones.flatMap(([tipo, filas, nombre, accion, detalle]) => filas
        .filter((fila) => `${nombre(fila)} ${fila.descripcion || ''}`.toLocaleLowerCase('es').includes(consulta))
        .map((fila) => ({ tipo, nombre: nombre(fila), accion: () => accion(fila), detalle: detalle(fila) }))).slice(0, 8)
      if (!coincidencias.length) resultados.appendChild(elemento('p', ['ayuda'], 'No encontramos coincidencias. Probá con otra palabra.'))
      else coincidencias.forEach((resultado) => {
        const resultadoBoton = boton('', resultado.accion, ['cms-busqueda-resultado'])
        resultadoBoton.append(elemento('strong', [], `${resultado.tipo}: ${resultado.nombre}`), resultado.detalle ? elemento('span', [], resultado.detalle) : document.createDocumentFragment())
        resultados.appendChild(resultadoBoton)
      })
    }
    buscar.addEventListener('input', pintarResultados)
    buscar.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape') {
        buscar.value = ''
        mostrarRecientes = false
        abrirRecientes.setAttribute('aria-expanded', 'false')
        pintarResultados()
        buscar.blur()
      }
    })
    panel.addEventListener('focusout', () => setTimeout(() => {
      if (!panel.contains(document.activeElement) && buscar.value.trim().length < 2) {
        mostrarRecientes = false
        abrirRecientes.setAttribute('aria-expanded', 'false')
        pintarResultados()
      }
    }))
    pintarResultados()
    panel.append(buscar, abrirRecientes, elemento('span', ['cms-atajo'], '⌘ K'), resultados)
    return panel
  }

  function panelContinuarTrabajo() {
    const panel = elemento('section', ['cms-continuar'])
    const destinos = navegacionReciente.filter((destino) => destino !== 'inicio').slice(0, 3)
    panel.append(
      elemento('span', ['cms-panel-etiqueta'], 'Acceso rápido'),
      elemento('h3', [], 'Continuar donde quedaste'),
      elemento('p', ['ayuda'], destinos.length ? 'Volvé a tus secciones recientes sin recorrer el menú.' : 'Cuando visites tareas, áreas o formularios, aparecerán aquí para retomarlos.'),
    )
    const acciones = elemento('div', ['cms-continuar-acciones'])
    if (destinos.length) destinos.forEach((destino) => acciones.appendChild(boton(etiquetaDestino(destino), () => irA(destino))))
    else acciones.appendChild(enlaceA('cms-trabajo', 'Abrir Mis tareas', ['boton-principal']))
    panel.appendChild(acciones)
    return panel
  }

  function panelDecisionesPendientes() {
    const panel = elemento('section', ['cms-panel-mando', 'cms-decisiones-pendientes'])
    const encabezado = elemento('div', ['cms-panel-mando-encabezado'])
    encabezado.append(elemento('span', ['cms-panel-icono'], '01'), elemento('div', [], null))
    encabezado.lastChild.append(elemento('span', ['cms-panel-etiqueta'], 'Decidir'), elemento('h3', [], 'Decisiones pendientes'))
    panel.appendChild(encabezado)
    const vigentes = datos.decisiones.filter((fila) => !['cerrada', 'archivada'].includes(fila.estado)).slice(0, 4)
    if (!vigentes.length) panel.appendChild(elemento('p', ['ayuda'], 'No hay decisiones pendientes registradas.'))
    else vigentes.forEach((decision) => {
      const fila = elemento('article', ['cms-mando-fila'])
      fila.append(elemento('strong', [], decision.titulo), elemento('span', [], [decision.reunion_titulo, decision.responsable_nombre].filter(Boolean).join(' · ') || 'Requiere seguimiento'))
      panel.appendChild(fila)
    })
    panel.appendChild(enlaceA('cms-agenda', 'Abrir decisiones y reuniones'))
    return panel
  }

  function panelProximoEvento() {
    const panel = elemento('section', ['cms-panel-mando', 'cms-proximo-evento'])
    const proximos = datos.eventos.filter((fila) => fila.estado === 'planificado' && String(fila.fecha_hora || '').slice(0, 10) >= HOY()).sort((a, b) => String(a.fecha_hora).localeCompare(String(b.fecha_hora)))
    panel.append(elemento('span', ['cms-panel-etiqueta'], 'Próximo en agenda'), elemento('h3', [], proximos[0]?.titulo || 'Sin actividades próximas'))
    if (proximos[0]) panel.append(elemento('p', [], [fechaHoraProgramadaHumana(proximos[0].fecha_hora), proximos[0].lugar, proximos[0].equipo_nombre].filter(Boolean).join(' · ')))
    else panel.append(elemento('p', ['ayuda'], 'Agendá el próximo encuentro, vencimiento o actividad institucional.'))
    panel.appendChild(boton(proximos[0] ? 'Ver Agenda' : 'Nueva actividad', () => {
      if (!proximos[0] && datos.alcance?.puede_gestionar) { formularioAbierto = 'evento'; dibujar() }
      else alIrA('cms-agenda')
    }))
    return panel
  }

  function panelHoyMovil() {
    const panel = elemento('section', ['cms-hoy-movil'])
    const clavesPospuestas = new Set((datos.alertasPospuestas || [])
      .filter((fila) => fila.postergada_hasta >= HOY())
      .map((fila) => fila.clave))
    const alertas = alertasInstitucionalesCms(datos, HOY())
      .filter((alerta) => !clavesPospuestas.has(alerta.clave))
      .slice(0, 2)
    panel.append(
      elemento('span', ['cms-panel-etiqueta'], 'Inicio'),
      elemento('h3', [], 'Hoy en Aletea'),
      elemento('p', ['ayuda'], alertas.length
        ? `${alertas.length === 1 ? 'Hay una alerta que requiere' : `Hay ${alertas.length} alertas que requieren`} una acción concreta.`
        : 'No hay alertas institucionales urgentes para resolver hoy.'),
    )
    if (alertas.length) {
      const lista = elemento('div', ['cms-hoy-alertas'])
      alertas.forEach((alerta) => {
        const destino = destinoDeAlerta(alerta)
        const fila = elemento('article', ['cms-hoy-alerta'])
        fila.append(
          elemento('strong', [], alerta.titulo),
          elemento('span', [], alerta.detalle),
          enlaceA(destino.pantalla, 'Resolver', [], destino.contexto),
        )
        lista.appendChild(fila)
      })
      panel.appendChild(lista)
    }
    panel.appendChild(enlaceA('cms-trabajo', 'Ver Mis tareas', ['boton-principal']))
    return panel
  }

  function panelTrabajoPersonal({ completo = false, compacto = false } = {}) {
    const panel = elemento('section', ['cms-trabajo', 'cms-trabajo-personal'])
    const correo = sesion?.usuario || sesion?.correo || ''
    const propiasAbiertas = datos.tareas.filter((tarea) => tarea.responsable_correo === correo && !['completada', 'cancelada'].includes(tarea.estado))
    const avisosPendientes = datos.notificaciones.filter((fila) => !fila.leida_en).length
    const urgentesPropias = propiasAbiertas.filter((tarea) => ['atrasada', 'bloqueada'].includes(clasificarTarea(tarea, HOY()))).length
    const filtros = elemento('div', ['cms-vistas-guardadas'])
    const opciones = compacto
      ? [['mias', 'Para mí'], ['bloqueadas', 'Bloqueadas'], ['seguimiento', 'Seguimiento']]
      : [['mias', 'Mis pendientes'], ['asignadas', 'Asignadas por mí'], ['atrasadas', 'Vencidas'], ['proximas', 'Próximas'], ['bloqueadas', 'Bloqueadas'], ['seguimiento', 'Seguimientos'], ['sin-responsable', 'Sin responsable'], ['espera', 'Esperando respuesta'], ['todas', 'Todo abierto'], ['cerradas', 'Historial']]
    opciones.forEach(([valor, etiqueta]) => {
      const control = boton(etiqueta, () => { filtroTrabajo = valor; dibujar() }, ['cms-filtro'])
      control.setAttribute('aria-pressed', String(filtroTrabajo === valor))
      if (filtroTrabajo === valor) control.classList.add('activa')
      filtros.appendChild(control)
    })
    const buscar = document.createElement('input')
    buscar.type = 'search'; buscar.placeholder = 'Filtrar tareas'; buscar.setAttribute('aria-label', 'Filtrar tareas'); buscar.value = busquedaTrabajo
    buscar.addEventListener('change', () => { busquedaTrabajo = buscar.value; dibujar() })
    const resumenPersonal = elemento('div', ['cms-resumen-personal'])
    ;[[propiasAbiertas.length, 'tareas abiertas', false], [avisosPendientes, 'notificaciones nuevas', true], [urgentesPropias, 'requieren atención', false]].forEach(([cantidad, etiqueta, esNotificacion]) => {
      const dato = elemento(esNotificacion ? 'button' : 'span', ['cms-resumen-personal-dato', ...(esNotificacion ? ['cms-resumen-personal-accion'] : [])])
      if (esNotificacion) {
        dato.type = 'button'
        dato.setAttribute('aria-label', `${cantidad} ${cantidad === 1 ? 'notificación nueva' : 'notificaciones nuevas'}. Ir a notificaciones.`)
        dato.addEventListener('click', () => {
          const destino = raiz.querySelector('#notificaciones-tareas')
          destino?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          destino?.focus({ preventScroll: true })
        })
      }
      dato.append(elemento('strong', [], String(cantidad)), document.createTextNode(etiqueta))
      resumenPersonal.appendChild(dato)
    })
    panel.append(elemento('h3', [], completo ? 'Bandeja de tareas' : 'Para mí'), resumenPersonal, filtros)
    const unidadTrabajo = unidadTrabajoId ? datos.unidades.find((fila) => fila.id === unidadTrabajoId) : null
    if (unidadTrabajo) {
      const contextoUnidad = elemento('div', ['cms-filtro-unidad'])
      contextoUnidad.append(elemento('span', [], `Mostrando: ${unidadTrabajo.nombre}`), boton('Quitar filtro', () => { unidadTrabajoId = null; dibujar() }))
      panel.appendChild(contextoUnidad)
    }
    if (!compacto) panel.appendChild(elemento('p', ['cms-filtro-explicacion'], `${VISTAS_TRABAJO[filtroTrabajo]?.descripcion || 'Los filtros ordenan las tareas sin moverlas ni borrarlas.'} Podés cambiar de filtro en cualquier momento.`))
    if (!compacto) panel.appendChild(buscar)
    let tareas = datos.tareas.filter((tarea) => filtroTrabajo === 'cerradas'
      ? ['completada', 'cancelada'].includes(tarea.estado)
      : !['completada', 'cancelada'].includes(tarea.estado))
    if (unidadTrabajoId) tareas = tareas.filter((tarea) => tarea.unidad_id === unidadTrabajoId)
    if (nombresArea[area]) tareas = tareas.filter((tarea) => tarea.equipo_nombre?.toLocaleLowerCase('es') === nombresArea[area].toLocaleLowerCase('es'))
    if (filtroTrabajo === 'mias' && correo) tareas = tareas.filter((tarea) => tarea.responsable_correo === correo)
    else if (filtroTrabajo === 'asignadas' && correo) tareas = tareas.filter((tarea) => tarea.creado_por === correo)
    else if (filtroTrabajo === 'atrasadas') tareas = tareas.filter((tarea) => clasificarTarea(tarea, HOY()) === 'atrasada')
    else if (filtroTrabajo === 'proximas') tareas = tareas.filter((tarea) => clasificarTarea(tarea, HOY()) === 'proxima')
    else if (filtroTrabajo === 'bloqueadas') tareas = tareas.filter((tarea) => clasificarTarea(tarea, HOY()) === 'bloqueada')
    else if (filtroTrabajo === 'seguimiento') tareas = tareas.filter((tarea) => requiereSeguimiento(tarea, HOY()))
    else if (filtroTrabajo === 'sin-responsable') tareas = tareas.filter((tarea) => !tarea.responsable_correo)
    else if (filtroTrabajo === 'espera') tareas = tareas.filter((tarea) => tarea.estado === 'esperando_respuesta')
    if (busquedaTrabajo.trim()) tareas = tareas.filter((tarea) => `${tarea.titulo} ${tarea.descripcion || ''}`.toLocaleLowerCase('es').includes(busquedaTrabajo.trim().toLocaleLowerCase('es')))
    if (!tareas.length && filtroTrabajo === 'mias' && !correo) tareas = datos.tareas.filter((tarea) => requiereSeguimiento(tarea, HOY())).slice(0, completo ? 30 : 5)
    if (!tareas.length) {
      const vacio = elemento('div', ['cms-estado-vacio'])
      const mensajes = {
        mias: 'No tenés tareas activas asignadas. Podés revisar las prioridades institucionales o crear una solicitud para un equipo.',
        asignadas: 'No hay tareas creadas por vos con este estado. Cuando asignes una, podrás seguirla desde este filtro.',
        atrasadas: 'No hay tareas vencidas. El seguimiento está al día para este filtro.',
        proximas: 'No hay tareas próximas en los próximos siete días.',
        bloqueadas: 'No hay tareas bloqueadas. No hay impedimentos pendientes de resolución.',
        seguimiento: 'No hay seguimientos pendientes para hoy.',
        'sin-responsable': 'No hay tareas sin responsable. Cada asunto abierto tiene una persona o equipo que lo sigue.',
        espera: 'No hay tareas esperando respuesta en este momento.',
        todas: 'No hay tareas abiertas con este criterio. Podés registrar una tarea para empezar.',
        cerradas: 'Todavía no hay tareas completadas o canceladas visibles para esta cuenta.',
      }
      const mensaje = mensajes[filtroTrabajo] || mensajes.todas
      vacio.append(elemento('p', ['ayuda'], mensaje))
      if (datos.alcance?.puede_gestionar) vacio.appendChild(boton('Crear tarea', () => { tipoNuevaTarea = 'tarea'; formularioAbierto = 'tarea'; dibujar() }))
      panel.appendChild(vacio)
    }
    else panel.append(...tareas.slice(0, completo ? 40 : compacto ? 3 : 6).map(filaTarea))
    const equipoActual = nombresArea[area] ? equipoFundacionalCms(datos.equipos, area) : null
    if (equipoActual && datos.alcance?.puede_gestionar) {
      const tareasEquipo = datos.tareas.filter((tarea) => tarea.equipo_id === equipoActual.id)
      panel.appendChild(boton('Copiar resumen del equipo', async () => {
        try { await copiarResumenEquipo(equipoActual, tareasEquipo) } catch { error = 'No se pudo copiar el resumen. Revisá el permiso del navegador.'; dibujar() }
      }))
    }
    if (!completo) panel.appendChild(enlaceA('cms-trabajo', 'Abrir Mis tareas'))
    return panel
  }

  function formularioCapacidadTrabajo() {
    const correoSesion = sesion?.usuario || sesion?.correo || ''
    const puedeEditarOtras = datos.alcance?.perfil === 'administracion'
    const correoInicial = usuarioCapacidad || correoSesion || datos.capacidad[0]?.usuario_correo || ''
    const existente = datos.capacidad.find((fila) => fila.usuario_correo === correoInicial)
    const forma = document.createElement('form')
    forma.className = 'cms-captura cms-captura-capacidad'
    forma.appendChild(elemento('h3', [], 'Disponibilidad semanal'))
    const persona = selectorCms(datos.capacidad.map((fila) => [fila.usuario_correo, fila.usuario_nombre || fila.usuario_correo]), 'Persona')
    persona.value = correoInicial
    persona.disabled = !puedeEditarOtras
    const horas = inputCms('Ej. 8', 'Horas disponibles por semana', 'number')
    horas.required = true; horas.min = '0'; horas.max = '80'; horas.step = '0.5'; horas.value = existente?.horas_semanales ?? ''
    const nota = inputCms('Ej. Disponible martes y jueves de tarde', 'Contexto de disponibilidad')
    nota.maxLength = 400; nota.value = existente?.nota || ''
    persona.addEventListener('change', () => {
      const fila = datos.capacidad.find((item) => item.usuario_correo === persona.value)
      horas.value = fila?.horas_semanales ?? ''
      nota.value = fila?.nota || ''
    })
    const acciones = elemento('div', ['cms-captura-acciones'])
    const cancelar = boton('Cancelar', () => { formularioAbierto = null; usuarioCapacidad = null; dibujar() })
    const guardar = boton('Guardar disponibilidad', async () => {
      if (guardando || !forma.reportValidity()) return
      guardando = true; guardar.disabled = true
      try {
        await pedir('/api/cms/capacidad', { method: 'POST', body: JSON.stringify({ usuario_correo: persona.value, horas_semanales: horas.value, nota: nota.value }) })
        formularioAbierto = null; usuarioCapacidad = null; await cargar()
      } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
    }, ['boton-principal'])
    guardar.type = 'submit'
    acciones.append(cancelar, guardar)
    forma.append(campoCms('Persona', persona), campoCms('Horas disponibles por semana', horas), campoCms('Contexto de disponibilidad', nota), elemento('p', ['ayuda'], 'La carga suma únicamente tareas con esfuerzo estimado. Las tareas sin estimación se muestran aparte para evitar una lectura engañosa.'), acciones)
    forma.addEventListener('submit', (evento) => { evento.preventDefault(); guardar.click() })
    return forma
  }

  function panelCapacidadTrabajo() {
    const panel = elemento('section', ['cms-capacidad'])
    const encabezado = elemento('div', ['cms-seccion-encabezado'])
    const texto = elemento('div', [])
    texto.append(elemento('h3', [], 'Capacidad y carga'), elemento('p', ['ayuda'], 'Disponibilidad semanal, carga estimada y tareas que todavía necesitan una estimación.'))
    const correoSesion = sesion?.usuario || sesion?.correo || ''
    if (correoSesion || datos.alcance?.perfil === 'administracion') encabezado.append(texto, boton('Configurar disponibilidad', () => { usuarioCapacidad = correoSesion || datos.capacidad[0]?.usuario_correo || null; formularioAbierto = 'capacidad'; dibujar() }))
    else encabezado.appendChild(texto)
    const lista = elemento('div', ['cms-capacidad-lista'])
    if (!datos.capacidad.length) lista.appendChild(elemento('p', ['ayuda'], 'No hay personas visibles para calcular capacidad en esta sección.'))
    else datos.capacidad.forEach((fila) => {
      const disponible = fila.horas_semanales === null || fila.horas_semanales === undefined ? null : Number(fila.horas_semanales)
      const asignadas = Number(fila.horas_asignadas || 0)
      const sinEstimar = Number(fila.tareas_sin_estimacion || 0)
      const porcentaje = disponible && disponible > 0 ? Math.round((asignadas / disponible) * 100) : null
      const sobrecargada = disponible !== null && (disponible === 0 ? asignadas > 0 : asignadas > disponible)
      const tarjeta = elemento('article', ['cms-capacidad-tarjeta', sobrecargada ? 'cms-capacidad-sobrecarga' : ''])
      const titulo = elemento('div', ['cms-capacidad-titulo'])
      titulo.append(elemento('strong', [], fila.usuario_nombre || fila.usuario_correo), elemento('span', ['cms-estado'], sobrecargada ? 'Revisar carga' : porcentaje === null ? 'Falta disponibilidad' : porcentaje >= 80 ? 'Carga alta' : 'Con margen'))
      const resumen = elemento('div', ['cms-capacidad-resumen'])
      resumen.append(
        elemento('span', [], disponible === null ? 'Sin horas declaradas' : `${disponible.toLocaleString('es-UY')} h disponibles`),
        elemento('span', [], `${asignadas.toLocaleString('es-UY')} h asignadas`),
        elemento('span', [], `${fila.tareas_abiertas || 0} tareas abiertas`),
        elemento('span', [], sinEstimar ? `${sinEstimar} sin estimar` : 'Todas estimadas'),
      )
      if (porcentaje !== null) {
        const barra = elemento('div', ['cms-capacidad-barra'])
        barra.setAttribute('role', 'progressbar'); barra.setAttribute('aria-label', `Carga estimada de ${fila.usuario_nombre || fila.usuario_correo}`); barra.setAttribute('aria-valuemin', '0'); barra.setAttribute('aria-valuemax', '100'); barra.setAttribute('aria-valuenow', String(Math.min(porcentaje, 100)))
        const avance = elemento('span', [], ''); avance.style.width = `${Math.min(porcentaje, 100)}%`; barra.appendChild(avance); tarjeta.append(titulo, resumen, barra)
      } else tarjeta.append(titulo, resumen)
      if (fila.nota) tarjeta.appendChild(elemento('p', ['ayuda'], fila.nota))
      if (datos.alcance?.perfil === 'administracion' || fila.usuario_correo === correoSesion) tarjeta.appendChild(boton('Editar disponibilidad', () => { usuarioCapacidad = fila.usuario_correo; formularioAbierto = 'capacidad'; dibujar() }))
      lista.appendChild(tarjeta)
    })
    panel.append(encabezado, lista)
    return panel
  }

  function panelMapaVivo() {
    const panel = elemento('section', ['cms-mapa-vivo'])
    const encabezado = elemento('div', ['cms-seccion-encabezado'])
    const texto = elemento('div', [])
    texto.append(elemento('span', ['cms-panel-etiqueta'], 'Mapa vivo'), elemento('h3', [], 'Así se mueve Aletea hoy'), elemento('p', ['ayuda'], 'Los equipos enfocan el trabajo. Dirección conserva la mirada transversal.'))
    encabezado.append(texto, enlaceA('cms-areas', 'Ver todas las áreas'))
    const mapa = elemento('div', ['cms-mapa'])
    const gobierno = boton('', () => {
      if (!comision) return
      equipoAbiertoId = comision.id; formularioAbierto = 'ver-equipo'; dibujar()
    }, ['cms-mapa-gobierno'])
    const comision = datos.equipos.find((equipo) => equipo.clave === 'comision_directiva' || equipo.categoria === 'comision_directiva')
    gobierno.disabled = !comision
    gobierno.setAttribute('aria-label', comision ? 'Abrir Comisión Directiva' : 'Comisión Directiva pendiente de configurar')
    gobierno.append(elemento('span', ['cms-panel-etiqueta'], 'Gobierno institucional'), elemento('strong', [], 'Comisión Directiva'), elemento('small', [], comision ? 'Define, aprueba y supervisa' : 'Pendiente de configurar'))
    const centro = elemento('article', ['cms-mapa-centro'])
    centro.append(elemento('span', ['cms-mapa-conector'], 'Coordina y ejecuta'), elemento('strong', [], 'Dirección'), elemento('span', [], `${datos.decisiones.length} decisiones · ${datos.proyectos.length} proyectos`))
    const areas = elemento('div', ['cms-mapa-areas'])
    areas.setAttribute('aria-label', 'Áreas institucionales y sus unidades')
    mapa.append(gobierno, centro, areas)
    const sectores = [
      ['familias', 'Familias'], ['deportes', 'Deportes y Recreación'], ['comunicacion', 'Comunicación'], ['capacitaciones', 'Capacitaciones'],
      ['finanzas', 'Finanzas'], ['eventos', 'Eventos'], ['administracion', 'Administración'],
    ]
    const clavesFundacionales = new Set(sectores.map(([id]) => id))
    sectores.forEach(([id, nombre]) => {
      const equipo = equipoFundacionalCms(datos.equipos, id)
      if (!equipo) return
      const pendientes = datos.tareas.filter((tarea) => tarea.equipo_id === equipo?.id && !['completada', 'cancelada'].includes(tarea.estado)).length
      const responsables = datos.responsabilidades.filter((fila) => fila.equipo_id === equipo?.id && fila.activo !== false)
      const unidades = unidadesDeArea(id)
      const grupo = elemento('section', ['cms-mapa-area', `cms-mapa-area-${id}`])
      const nodo = enlaceA(`cms-${id}`, nombre, ['cms-mapa-nodo', `cms-mapa-${id}`])
      nodo.append(
        elemento('small', [], `${unidades.length} ${unidades.length === 1 ? 'espacio' : 'espacios'} · ${pendientes} abiertas`),
        elemento('small', ['cms-mapa-responsable'], responsables.length ? `${responsables.length} responsable${responsables.length === 1 ? '' : 's'}` : 'Sin responsable asignado'),
      )
      grupo.appendChild(nodo)
      const listaUnidades = elemento('div', ['cms-mapa-subunidades'])
      if (unidades.length) unidades.forEach((unidad) => {
        const unidadBoton = boton(unidad.sigla || unidad.nombre, () => abrirUnidad(unidad), ['cms-mapa-subunidad'])
        unidadBoton.style.setProperty('--unidad-color', unidad.color || equipo.color || '#6d3087')
        unidadBoton.setAttribute('aria-label', `Abrir ${unidad.nombre}, unidad de ${nombre}`)
        unidadBoton.title = unidad.nombre
        if (unidad.equipo_id !== equipo.id) unidadBoton.appendChild(elemento('small', [], 'Vista compartida'))
        listaUnidades.appendChild(unidadBoton)
      })
      else listaUnidades.appendChild(elemento('span', ['cms-mapa-sin-unidades'], 'Sin unidades configuradas'))
      grupo.appendChild(listaUnidades)
      areas.appendChild(grupo)
    })
    const ramasTransversales = datos.equipos.filter((equipo) => equipo.id !== comision?.id && !clavesFundacionales.has(equipo.clave))
    if (ramasTransversales.length) {
      const transversales = elemento('section', ['cms-mapa-transversales'])
      const titulo = elemento('div', ['cms-mapa-transversales-titulo'])
      titulo.append(elemento('span', ['cms-panel-etiqueta'], 'Articulación y control'), elemento('strong', [], 'Ramas transversales'))
      transversales.appendChild(titulo)
      ramasTransversales.forEach((equipo) => {
        const abiertas = datos.tareas.filter((tarea) => tarea.equipo_id === equipo.id && !['completada', 'cancelada'].includes(tarea.estado)).length
        const responsables = datos.responsabilidades.filter((fila) => fila.equipo_id === equipo.id && fila.activo !== false).length
        const nodo = boton(equipo.nombre, () => { equipoAbiertoId = equipo.id; formularioAbierto = 'ver-equipo'; dibujar() }, ['cms-mapa-rama'])
        nodo.append(elemento('small', [], `${abiertas} abiertas · ${responsables} responsables`))
        nodo.setAttribute('aria-label', `Abrir ${equipo.nombre}`)
        transversales.appendChild(nodo)
      })
      mapa.appendChild(transversales)
    }
    panel.append(encabezado, mapa)
    return panel
  }

  function etiquetaEstadoFsb(estado) {
    return { vencido: 'Vencido', pendiente: 'Pendiente', al_dia: 'Al día', a_favor: 'A favor' }[estado] || 'Sin movimientos'
  }

  function etiquetaMovimientoFsb(tipo) {
    return { cargo: 'Cargo', pago: 'Pago', recargo: 'Recargo', ajuste_cargo: 'Ajuste de deuda', ajuste_credito: 'Crédito', saldo_inicial: 'Saldo inicial' }[tipo] || 'Movimiento'
  }

  function etiquetaCondicionFsb(cuenta) {
    if (cuenta.condicion === 'beca') return `Beca ${cuenta.beca_porcentaje}%`
    return { regular: 'Cuota completa', voluntariado: 'Sin cuota por voluntariado', baja: 'Participante inactivo' }[cuenta.condicion] || 'Tipo de cuota sin definir'
  }

  function descargarFinanzasFsb() {
    const contenido = exportarFinanzasFsb(datos.finanzasFsb?.cuentas || [], periodoEstadoFinanzasFsb)
    const enlace = document.createElement('a')
    enlace.href = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }))
    enlace.download = `finanzas-fsb-${periodoEstadoFinanzasFsb}.csv`
    enlace.click()
    setTimeout(() => URL.revokeObjectURL(enlace.href), 0)
  }

  function renderFormularioFinanzasFsb() {
    if (!formularioFinanzasFsb) return document.createDocumentFragment()
    const tipoFormulario = formularioFinanzasFsb.tipo
    const esCuenta = ['cuenta', 'editar_cuenta'].includes(tipoFormulario)
    const tituloFormulario = { cuenta: 'Nuevo participante en Finanzas', editar_cuenta: 'Editar datos de cuota', cuotas: 'Preparar cuotas del mes', anular: 'Corregir pago o movimiento', compromiso: 'Nuevo compromiso de pago', cerrar_compromiso: 'Cerrar compromiso', recordatorio: 'Preparar recordatorio' }[tipoFormulario] || 'Registrar pago o cargo'
    const formulario = elemento('form', ['cms-finanzas-formulario'])
    const titulo = elemento('div', ['cms-finanzas-formulario-titulo'])
    titulo.append(elemento('div', [], elemento('span', ['cms-panel-etiqueta'], tituloFormulario)), boton('Cerrar', () => { formularioFinanzasFsb = null; dibujar() }))
    formulario.appendChild(titulo)

    if (tipoFormulario === 'anular') {
      formulario.append(elemento('p', ['ayuda'], `${formularioFinanzasFsb.concepto}: ${dineroFsb(Math.abs(formularioFinanzasFsb.importe_centavos))}. El movimiento seguirá visible en el historial y dejará de afectar el saldo.`))
      const motivo = areaCms('Ejemplo: pago duplicado o importe incorrecto.', 'Motivo de la corrección')
      motivo.required = true; motivo.minLength = 5
      formulario.append(campoCms('Motivo', motivo, 'Quedará registrado para la auditoría.'))
      const anular = boton(formularioFinanzasFsb.es_pago ? 'Deshacer pago' : 'Anular movimiento', async () => {
        if (motivo.value.trim().length < 5 || guardando) { motivo.reportValidity(); return }
        guardando = true; anular.disabled = true
        try {
          await pedir(`/api/cms/finanzas-fsb/movimientos/${formularioFinanzasFsb.movimiento_id}/anular`, { method: 'POST', body: JSON.stringify({ motivo: motivo.value }) })
          formularioFinanzasFsb = null; await recargarFinanzasFsb(); dibujar()
        } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
      }, ['boton-peligro'])
      formulario.appendChild(anular)
      return formulario
    }

    if (tipoFormulario === 'compromiso') {
      const fechaAcuerdo = inputCms('', 'Fecha del acuerdo', 'date'); fechaAcuerdo.value = HOY(); fechaAcuerdo.required = true
      const fechaPrevista = inputCms('', 'Fecha prevista de pago', 'date'); fechaPrevista.value = HOY(); fechaPrevista.required = true
      const importe = inputCms('Opcional', 'Importe acordado', 'number'); importe.min = '0.01'; importe.step = '0.01'
      const nota = areaCms('Ejemplo: abonará en dos partes o confirmará por transferencia.', 'Nota del compromiso')
      const campos = elemento('div', ['cms-finanzas-campos'])
      campos.append(campoCms('Participante', elemento('strong', ['cms-finanzas-cuenta-formulario'], formularioFinanzasFsb.nombre)), campoCms('Fecha del acuerdo', fechaAcuerdo), campoCms('Fecha prevista', fechaPrevista), campoCms('Importe acordado', importe, 'Es opcional y no modifica el saldo.'), campoCms('Nota interna', nota, 'Solo la ve el equipo autorizado de Finanzas.'))
      formulario.append(elemento('p', ['ayuda'], 'El compromiso registra un acuerdo de seguimiento. No crea un cargo ni registra un pago.'), campos)
      const guardar = boton('Guardar compromiso', async () => {
        if (!fechaAcuerdo.value || !fechaPrevista.value || guardando) { fechaPrevista.reportValidity(); return }
        guardando = true; guardar.disabled = true
        try {
          await pedir('/api/cms/finanzas-fsb/compromisos', { method: 'POST', body: JSON.stringify({ cuenta_id: formularioFinanzasFsb.cuenta_id, importe: importe.value, fecha_acuerdo: fechaAcuerdo.value, fecha_prevista: fechaPrevista.value, nota: nota.value }) })
          formularioFinanzasFsb = null; await recargarFinanzasFsb(); dibujar()
        } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
      }, ['boton-principal'])
      formulario.appendChild(guardar)
      return formulario
    }

    if (tipoFormulario === 'cerrar_compromiso') {
      const motivo = areaCms('Detalle opcional al marcarlo cumplido. Obligatorio si se cancela.', 'Motivo del cierre')
      formulario.append(elemento('p', ['ayuda'], `${formularioFinanzasFsb.nombre}: compromiso previsto para ${fechaHumana(formularioFinanzasFsb.fecha_prevista)}. Marcarlo cumplido no registra un pago automáticamente.`), campoCms('Nota de cierre', motivo))
      const acciones = elemento('div', ['cms-finanzas-formulario-acciones'])
      const cerrar = async (estado, botonAccion) => {
        if ((estado === 'cancelado' && motivo.value.trim().length < 5) || guardando) { motivo.required = estado === 'cancelado'; motivo.minLength = 5; motivo.reportValidity(); return }
        guardando = true; botonAccion.disabled = true
        try {
          await pedir(`/api/cms/finanzas-fsb/compromisos/${formularioFinanzasFsb.compromiso_id}/cerrar`, { method: 'POST', body: JSON.stringify({ estado, motivo: motivo.value }) })
          formularioFinanzasFsb = null; await recargarFinanzasFsb(); dibujar()
        } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
      }
      const cumplido = boton('Marcar cumplido', () => cerrar('cumplido', cumplido), ['boton-principal'])
      const cancelar = boton('Cancelar compromiso', () => cerrar('cancelado', cancelar), ['boton-peligro'])
      acciones.append(cumplido, cancelar); formulario.appendChild(acciones)
      return formulario
    }

    if (tipoFormulario === 'recordatorio') {
      const cuentaRecordatorio = (datos.finanzasFsb?.cuentas || []).find((cuenta) => cuenta.id === formularioFinanzasFsb.cuenta_id)
      const incluirImporte = document.createElement('input'); incluirImporte.type = 'checkbox'; incluirImporte.setAttribute('aria-label', 'Incluir importe pendiente')
      const texto = areaCms('', 'Texto del recordatorio'); texto.rows = 5
      const actualizar = () => { texto.value = textoRecordatorioFsb(cuentaRecordatorio, { incluirImporte: incluirImporte.checked }) }
      incluirImporte.addEventListener('change', actualizar); actualizar()
      const opcionImporte = elemento('label', ['cms-finanzas-opcion-recordatorio'])
      opcionImporte.append(incluirImporte, elemento('span', [], 'Incluir el importe pendiente'))
      formulario.append(
        elemento('p', ['ayuda'], 'El gestor solo prepara el texto. Vos decidís dónde pegarlo y a quién enviarlo.'),
        opcionImporte,
        campoCms('Vista previa editable', texto, 'Revisá el mensaje antes de copiarlo.'),
      )
      const copiar = boton('Copiar recordatorio', async () => {
        if (!texto.value.trim() || guardando) return
        guardando = true; copiar.disabled = true
        try {
          await pedir('/api/cms/finanzas-fsb/recordatorios', { method: 'POST', body: JSON.stringify({ cuenta_id: formularioFinanzasFsb.cuenta_id }) })
          await navigator.clipboard.writeText(texto.value.trim())
          formularioFinanzasFsb = null; dibujar()
        } catch (fallo) { error = fallo.message || 'No se pudo copiar el recordatorio.'; guardando = false; dibujar() }
      }, ['boton-principal'])
      formulario.appendChild(copiar)
      return formulario
    }

    if (tipoFormulario === 'cuotas') {
      const borrador = formularioFinanzasFsb.borrador || {}
      let pasoCuotas = borrador.paso || 1
      const pasos = elemento('p', ['cms-finanzas-pasos'], pasoCuotas === 2 ? 'Paso 2 de 3: revisá quiénes pagan, quiénes no y el importe final.' : 'Paso 1 de 3: definí el mes y el importe base.')
      const periodo = inputCms('', 'Mes de las cuotas', 'month'); periodo.value = borrador.periodo || HOY().slice(0, 7)
      const concepto = inputCms('Cuota mensual', 'Concepto'); concepto.value = borrador.concepto || 'Cuota mensual'
      const grupo1 = inputCms('0', 'Importe del Grupo 1', 'number'); grupo1.min = '0.01'; grupo1.step = '0.01'; grupo1.value = borrador.grupo_1 || ''
      const grupo2 = inputCms('0', 'Importe del Grupo 2', 'number'); grupo2.min = '0.01'; grupo2.step = '0.01'; grupo2.value = borrador.grupo_2 || ''
      const importeDiferente = document.createElement('input'); importeDiferente.type = 'checkbox'; importeDiferente.setAttribute('aria-label', 'Usar otro importe para el Grupo 2')
      importeDiferente.checked = Boolean(borrador.importe_diferente)
      const fecha = inputCms('', 'Fecha de emisión', 'date'); fecha.value = borrador.fecha || HOY()
      const vencimiento = inputCms('', 'Vencimiento', 'date'); vencimiento.value = borrador.vencimiento || HOY()
      const campos = elemento('div', ['cms-finanzas-campos'])
      const campoGrupo1 = campoCms('Importe base', grupo1, 'Se usa para ambos grupos antes de aplicar becas.')
      const campoGrupo2 = campoCms('Importe del Grupo 2', grupo2, 'Solo si el Grupo 2 tiene una cuota base diferente.')
      campoGrupo2.hidden = !importeDiferente.checked
      const opcionImporteDiferente = elemento('label', ['cms-finanzas-opcion-recordatorio'])
      opcionImporteDiferente.append(importeDiferente, elemento('span', [], 'Usar otro importe para el Grupo 2'))
      campos.append(campoCms('Mes', periodo), campoCms('Concepto', concepto), campoGrupo1, campoGrupo2, campoCms('Fecha de emisión', fecha), campoCms('Vencimiento', vencimiento), opcionImporteDiferente)
      const vistaPrevia = elemento('div', ['cms-finanzas-cuotas-previa'])
      vistaPrevia.hidden = true
      const movimientos = (datos.finanzasFsb?.cuentas || []).flatMap((cuenta) => cuenta.movimientos || [])
      let plan = { error: 'Ingresá los importes para ver el resultado.', nuevas: [], cuotas: [], total_centavos: 0 }
      const generar = boton('Confirmar y generar cuotas', async () => {
        if (plan.error || !plan.nuevas.length || guardando) return
        guardando = true; generar.disabled = true
        try {
          await pedir('/api/cms/finanzas-fsb/cuotas', { method: 'POST', body: JSON.stringify({ periodo: periodo.value, concepto: concepto.value, grupo_1: grupo1.value, grupo_2: grupo2.value, fecha: fecha.value, vencimiento: vencimiento.value }) })
          formularioFinanzasFsb = null; await recargarFinanzasFsb(); dibujar()
        } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
      }, ['boton-principal'])
      generar.hidden = true
      const volver = boton('Volver a los importes', () => {
        pasoCuotas = 1; pasos.textContent = 'Paso 1 de 3: definí el mes y el importe base.'; campos.hidden = false; vistaPrevia.hidden = true; continuar.hidden = false; volver.hidden = true; generar.hidden = true
      })
      volver.hidden = true
      const continuar = boton('Revisar participantes e importes', () => {
        actualizarPrevia()
        if (plan.error) { vistaPrevia.hidden = false; return }
        pasoCuotas = 2; pasos.textContent = 'Paso 2 de 3: revisá quiénes pagan, quiénes no y el importe final.'; campos.hidden = true; vistaPrevia.hidden = false; continuar.hidden = true; volver.hidden = false; generar.hidden = false
      }, ['boton-principal'])
      const actualizarPrevia = () => {
        if (!importeDiferente.checked) grupo2.value = grupo1.value
        plan = prepararCuotasFsb(datos.finanzasFsb?.cuentas || [], movimientos, { periodo: periodo.value, concepto: concepto.value, grupo_1: grupo1.value, grupo_2: grupo2.value, fecha: fecha.value, vencimiento: vencimiento.value })
        vaciar(vistaPrevia)
        if (plan.error) vistaPrevia.appendChild(elemento('p', ['ayuda'], plan.error))
        else {
          const encabezado = elemento('div', ['cms-finanzas-cuotas-total'])
          const becas = plan.nuevas.filter((cuota) => cuota.beca_porcentaje > 0).length
          encabezado.append(elemento('strong', [], `${plan.nuevas.length} cuotas, ${becas} con beca, ${(plan.exclusiones || []).length} sin cuota`), elemento('span', [], dineroFsb(plan.total_centavos)))
          vistaPrevia.appendChild(encabezado)
          if (!plan.cuotas.length) {
            const cuentasActivas = (datos.finanzasFsb?.cuentas || []).filter((cuenta) => cuenta.activa !== 0)
            const voluntariado = cuentasActivas.filter((cuenta) => cuenta.condicion === 'voluntariado').length
            const sinGrupo = cuentasActivas.filter((cuenta) => ![1, 2].includes(Number(cuenta.grupo))).length
            const razones = [
              voluntariado ? `${voluntariado} ${voluntariado === 1 ? 'participante está configurado' : 'participantes están configurados'} como Voluntariado` : '',
              sinGrupo ? `${sinGrupo} ${sinGrupo === 1 ? 'participante no tiene' : 'participantes no tienen'} Grupo 1 o 2` : '',
            ].filter(Boolean)
            vistaPrevia.append(
              elemento('strong', [], 'No hay participantes con cuota para generar.'),
              elemento('p', ['ayuda'], razones.length ? `${razones.join(' y ')}. Los participantes con cuota completa o beca de los grupos 1 y 2 sí generan cuota.` : 'Configurá un participante activo con cuota completa o beca y asignalo al Grupo 1 o 2.'),
              boton('Revisar participantes', () => { formularioFinanzasFsb = null; filtroFinanzasFsb = 'todas'; dibujar() }),
            )
          }
          plan.cuotas.slice(0, 8).forEach((cuota) => {
            const fila = elemento('div', ['cms-finanzas-cuota-previa', ...(cuota.ya_generada ? ['ya-generada'] : [])])
            const regla = cuota.beca_porcentaje
              ? `${dineroFsb(cuota.importe_base_centavos)} - ${cuota.beca_porcentaje}% = ${dineroFsb(cuota.importe_centavos)}`
              : `${dineroFsb(cuota.importe_base_centavos)}, sin descuento`
            const detalleCuota = elemento('span', [], `${cuota.nombre}${cuota.beca_porcentaje ? `, beca ${cuota.beca_porcentaje}%` : ''}`)
            detalleCuota.appendChild(elemento('small', ['ayuda'], regla))
            fila.append(detalleCuota, elemento('strong', [], cuota.ya_generada ? 'Ya generada' : dineroFsb(cuota.importe_centavos)))
            vistaPrevia.appendChild(fila)
          })
          if (plan.cuotas.length > 8) vistaPrevia.appendChild(elemento('small', ['ayuda'], `Y ${plan.cuotas.length - 8} participantes más.`))
          if (plan.exclusiones?.length) {
            const excluidas = elemento('section', ['cms-finanzas-exclusiones'])
            excluidas.appendChild(elemento('strong', [], 'No generan cuota este mes'))
            plan.exclusiones.slice(0, 8).forEach((exclusion) => {
              const fila = elemento('div', ['cms-finanzas-exclusion'])
              const accion = exclusion.persona_id
                ? enlaceA('personas', 'Corregir en Personas')
                : boton('Corregir tipo de cuota', () => {
                  formularioFinanzasFsb = { tipo: 'editar_cuenta', cuenta_id: exclusion.cuenta_id, retorno: 'cuotas', borrador: { paso: 2, periodo: periodo.value, concepto: concepto.value, grupo_1: grupo1.value, grupo_2: grupo2.value, importe_diferente: importeDiferente.checked, fecha: fecha.value, vencimiento: vencimiento.value } }
                  dibujar()
                })
              fila.append(elemento('span', [], `${exclusion.nombre}: ${exclusion.razon}`), accion)
              excluidas.appendChild(fila)
            })
            vistaPrevia.appendChild(excluidas)
          }
        }
        generar.disabled = Boolean(plan.error || !plan.nuevas.length || guardando)
      }
      importeDiferente.addEventListener('change', () => {
        campoGrupo2.hidden = !importeDiferente.checked
        if (!importeDiferente.checked) grupo2.value = grupo1.value
        actualizarPrevia()
      })
      ;[periodo, concepto, grupo1, grupo2, fecha, vencimiento].forEach((control) => control.addEventListener('input', actualizarPrevia))
      const accionesCuotas = elemento('div', ['cms-finanzas-formulario-acciones']); accionesCuotas.append(volver, continuar, generar)
      formulario.append(pasos, campos, vistaPrevia, accionesCuotas); actualizarPrevia()
      if (pasoCuotas === 2) continuar.click()
      return formulario
    }

    if (esCuenta) {
      const nombre = inputCms('Nombre y apellido', 'Nombre de la persona')
      const grupo = selectorCms([['', 'Sin grupo'], ['1', 'Grupo 1'], ['2', 'Grupo 2']], 'Grupo')
      const condicion = selectorCms([['regular', 'Cuota completa'], ['beca', 'Cuota con beca'], ['voluntariado', 'Sin cuota por voluntariado'], ['baja', 'Participante inactivo']], 'Tipo de cuota')
      const beca = inputCms('0', 'Porcentaje de beca', 'number'); beca.min = '0'; beca.max = '100'; beca.value = '0'
      const observaciones = areaCms('Información necesaria para Finanzas.', 'Observaciones')
      const cuentaActual = tipoFormulario === 'editar_cuenta' ? (datos.finanzasFsb?.cuentas || []).find((cuenta) => cuenta.id === formularioFinanzasFsb.cuenta_id) : null
      if (cuentaActual) {
        nombre.value = cuentaActual.nombre || ''
        grupo.value = cuentaActual.grupo || ''
        condicion.value = cuentaActual.condicion || 'regular'
        beca.value = String(cuentaActual.beca_porcentaje || 0)
        observaciones.value = cuentaActual.observaciones || ''
      }
      const campos = elemento('div', ['cms-finanzas-campos'])
      campos.append(campoCms('Nombre', nombre), campoCms('Grupo', grupo), campoCms('Condición', condicion), campoCms('Beca', beca, 'De 0 a 100 por ciento.'), campoCms('Observaciones', observaciones))
      formulario.appendChild(campos)
      const guardar = boton(tipoFormulario === 'editar_cuenta' ? 'Guardar cambios' : 'Crear participante', async () => {
        if (!nombre.value.trim() || guardando) { nombre.reportValidity(); return }
        guardando = true; guardar.disabled = true
        try {
          const esEdicion = tipoFormulario === 'editar_cuenta'
          const retorno = formularioFinanzasFsb.retorno
          const borrador = formularioFinanzasFsb.borrador
          await pedir(esEdicion ? `/api/cms/finanzas-fsb/cuentas/${formularioFinanzasFsb.cuenta_id}` : '/api/cms/finanzas-fsb/cuentas', { method: esEdicion ? 'PATCH' : 'POST', body: JSON.stringify({ nombre: nombre.value, grupo: grupo.value || null, condicion: condicion.value, beca_porcentaje: beca.value, observaciones: observaciones.value, activa: condicion.value !== 'baja' }) })
          await recargarFinanzasFsb()
          guardando = false
          formularioFinanzasFsb = retorno === 'cuotas' ? { tipo: 'cuotas', borrador } : null
          dibujar()
        } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
      }, ['boton-principal'])
      formulario.appendChild(guardar)
      return formulario
    }

    const cuentas = datos.finanzasFsb?.cuentas || []
    const cuenta = selectorCms(cuentas.map((fila) => [fila.id, `${fila.nombre}${fila.grupo ? `, Grupo ${fila.grupo}` : ''}`]), 'Participante')
    cuenta.value = formularioFinanzasFsb.cuenta_id || cuentas[0]?.id || ''
    const accion = selectorCms([
      ['pago', 'Pago de cuota u otro'], ['pago_equipo', 'Pago de equipo'], ['cuota', 'Cuota individual'], ['inscripcion', 'Inscripción'], ['equipamiento', 'Equipamiento'],
      ['recargo', 'Recargo del 10%'], ['otro_cargo', 'Otro cargo'], ['ajuste_credito', 'Crédito o corrección a favor'], ['ajuste_cargo', 'Corrección de deuda'],
    ], 'Qué querés registrar')
    accion.value = formularioFinanzasFsb.movimiento === 'cargo' ? 'otro_cargo' : (formularioFinanzasFsb.movimiento || 'pago')
    const conceptos = { pago: 'Pago recibido', pago_equipo: 'Pago de equipo', cuota: 'Cuota mensual', inscripcion: 'Inscripción', equipamiento: 'Equipamiento', recargo: 'Recargo 10%', otro_cargo: '', ajuste_credito: 'Crédito a favor', ajuste_cargo: 'Corrección de deuda' }
    const tipos = { pago: 'pago', pago_equipo: 'pago', cuota: 'cargo', inscripcion: 'cargo', equipamiento: 'cargo', recargo: 'recargo', otro_cargo: 'cargo', ajuste_credito: 'ajuste_credito', ajuste_cargo: 'ajuste_cargo' }
    const concepto = inputCms('Ejemplo: pelota o equipo de verano', 'Concepto'); concepto.value = conceptos[accion.value]
    const importe = inputCms('0', 'Importe en pesos', 'number'); importe.min = '0.01'; importe.step = '0.01'
    const baseRecargo = inputCms('0', 'Importe base del recargo', 'number'); baseRecargo.min = '0.01'; baseRecargo.step = '0.01'
    const fecha = inputCms('', 'Fecha', 'date'); fecha.value = HOY(); fecha.required = true
    const periodo = inputCms('2026-08', 'Período'); periodo.value = HOY().slice(0, 7); periodo.pattern = '\\d{4}-\\d{2}'
    const vencimiento = inputCms('', 'Vencimiento', 'date')
    const medio = selectorCms([['', 'Elegí una opción'], ['efectivo', 'Efectivo'], ['transferencia', 'Transferencia'], ['mercado_pago', 'Mercado Pago'], ['otro', 'Otro']], 'Medio de pago')
    const comprobante = inputCms('Número o referencia', 'Comprobante')
    const notas = areaCms('Detalle opcional para Finanzas.', 'Notas')
    const campos = elemento('div', ['cms-finanzas-campos'])
    const campoConcepto = campoCms('Concepto', concepto)
    const campoPeriodo = campoCms('Período', periodo, 'Formato AAAA-MM.')
    const campoVencimiento = campoCms('Vencimiento', vencimiento)
    const campoMedio = campoCms('Medio de pago', medio)
    const campoComprobante = campoCms('Comprobante', comprobante)
    const campoBaseRecargo = campoCms('Importe original', baseRecargo, 'El gestor calcula automáticamente el 10 por ciento.')
    campos.append(campoCms('Participante', cuenta), campoCms('Acción', accion), campoConcepto, campoBaseRecargo, campoCms('Importe', importe, 'Ingresá el monto en pesos uruguayos.'), campoCms('Fecha', fecha), campoPeriodo, campoVencimiento, campoMedio, campoComprobante, campoCms('Notas', notas))
    const actualizarCampos = () => {
      const esPago = ['pago', 'pago_equipo', 'ajuste_credito'].includes(accion.value)
      const esRecargo = accion.value === 'recargo'
      campoVencimiento.hidden = esPago; campoMedio.hidden = !esPago; campoComprobante.hidden = !esPago
      campoConcepto.hidden = ['pago', 'pago_equipo'].includes(accion.value); campoPeriodo.hidden = ['pago', 'pago_equipo'].includes(accion.value)
      campoBaseRecargo.hidden = !esRecargo
      importe.readOnly = esRecargo
      if (conceptos[accion.value]) concepto.value = conceptos[accion.value]
      if (esRecargo) importe.value = recargoFsb(baseRecargo.value) ? String(recargoFsb(baseRecargo.value) / 100) : ''
    }
    accion.addEventListener('change', actualizarCampos); baseRecargo.addEventListener('input', actualizarCampos); actualizarCampos()
    formulario.appendChild(campos)
    let permitirDuplicado = false
    const guardar = boton(tipos[accion.value] === 'pago' ? 'Registrar pago' : 'Guardar movimiento', async () => {
      if (guardando) return
      const faltante = !cuenta.value ? 'Elegí un participante.' : !concepto.value.trim() ? 'Ingresá un concepto.' : !importe.value ? 'Ingresá un importe mayor a cero.' : !fecha.value ? 'Elegí la fecha del movimiento.' : tipos[accion.value] === 'pago' && !medio.value ? 'Elegí cómo se recibió el pago.' : !/^\d{4}-\d{2}$/.test(periodo.value) ? 'El período debe usar el formato AAAA-MM.' : ''
      if (faltante) { estadoMovimiento.textContent = faltante; estadoMovimiento.dataset.estado = 'error'; return }
      guardando = true; guardar.disabled = true
      try {
        const respuesta = await pedir('/api/cms/finanzas-fsb/movimientos', { method: 'POST', body: JSON.stringify({ cuenta_id: cuenta.value, tipo: tipos[accion.value], concepto: concepto.value, importe: importe.value, fecha: fecha.value, periodo: periodo.value, vencimiento: vencimiento.value || null, medio_pago: medio.value, comprobante: comprobante.value, notas: notas.value, permitir_duplicado: permitirDuplicado }) })
        const cuentaGuardada = cuentas.find((fila) => fila.id === cuenta.value)
        const esPago = tipos[accion.value] === 'pago'
        confirmacion = {
          titulo: esPago ? 'Pago registrado' : 'Movimiento guardado',
          detalle: esPago
            ? `Pago de ${dineroFsb(importeCentavosFsb(importe.value))} registrado para ${cuentaGuardada?.nombre || 'el participante'}. Nuevo saldo: ${dineroFsb(respuesta.saldo_centavos)}.`
            : `${concepto.value} por ${dineroFsb(importeCentavosFsb(importe.value))} quedó registrado para ${cuentaGuardada?.nombre || 'el participante'}.`,
          acciones: esPago ? [
            { etiqueta: 'Ver pago', alPulsar: () => { cuentaFinanzasFsbAbierta = cuenta.value; confirmacion = null; dibujar() } },
            { etiqueta: 'Corregir pago', alPulsar: () => { formularioFinanzasFsb = { tipo: 'anular', movimiento_id: respuesta.movimiento.id, concepto: respuesta.movimiento.concepto, importe_centavos: respuesta.movimiento.importe_centavos, es_pago: true }; confirmacion = null; dibujar() } },
            { etiqueta: 'Registrar otro', principal: true, alPulsar: () => { formularioFinanzasFsb = { tipo: 'movimiento', movimiento: 'pago' }; confirmacion = null; dibujar() } },
          ] : [],
        }
        formularioFinanzasFsb = null; await recargarFinanzasFsb(); dibujar()
      } catch (fallo) {
        if (fallo.detalle?.duplicado) {
          permitirDuplicado = true
          estadoMovimiento.textContent = 'Ya existe un pago con el mismo participante, importe y fecha. Revisalo o registralo de todos modos.'
          guardar.textContent = 'Registrar de todos modos'
        } else estadoMovimiento.textContent = fallo.message || 'No se pudo guardar el movimiento.'
        estadoMovimiento.dataset.estado = 'error'; guardando = false; guardar.disabled = false
      }
    }, ['boton-principal'])
    accion.addEventListener('change', () => { guardar.textContent = tipos[accion.value] === 'pago' ? 'Registrar pago' : 'Guardar movimiento' })
    const estadoMovimiento = elemento('p', ['estado-guardado', 'cms-finanzas-estado-movimiento'], 'Completá participante, importe, fecha y medio de pago.')
    estadoMovimiento.setAttribute('role', 'status')
    estadoMovimiento.dataset.estado = 'pendiente'
    formulario.append(estadoMovimiento, guardar)
    return formulario
  }

  function panelFinanzasFsb() {
    const finanzas = datos.finanzasFsb
    const panel = elemento('section', ['cms-finanzas-fsb'])
    const cabecera = elemento('div', ['cms-finanzas-cabecera'])
    const texto = elemento('div', [])
    texto.append(elemento('span', ['cms-panel-etiqueta'], 'Fútbol sin Barreras'), elemento('h3', [], 'Participantes y saldos'), elemento('p', ['ayuda'], 'Revisá lo pendiente, registrá cobros y cerrá cada mes sin depender de una planilla.'))
    cabecera.appendChild(texto)
    if (!finanzas?.acceso?.puede_ver) {
      panel.classList.add('cms-finanzas-bloqueado')
      const requisitosRecibidos = finanzas?.acceso?.requisitos
      const requisitos = Array.isArray(requisitosRecibidos) ? requisitosRecibidos : [
        requisitoDatosPersonales(
          requisitosRecibidos?.ficha_protegida ? 'sensible' : datos.alcance?.nivel_datos_personales,
          'sensible',
        ),
        requisitoEquipo({ clave: 'finanzas', nombre: 'Finanzas', cumplido: Boolean(requisitosRecibidos?.equipo_finanzas) }),
      ]
      const acceso = crearPanelRequisitosAcceso({
        requisitos,
        titulo: 'Para proteger los datos de pago necesitás completar estos accesos',
        descripcion: finanzas?.error || 'Cada requisito se revisa y confirma por separado.',
        seccion: 'Finanzas', regreso: 'cms-finanzas', sesion: { ...sesion, perfil_acceso: sesion?.perfil_acceso || datos.alcance?.perfil }, alIrA: irA,
      })
      panel.append(cabecera, acceso)
      return panel
    }
    const estadoAcceso = elemento('div', ['cms-finanzas-acceso'])
    estadoAcceso.append(elemento('strong', [], finanzas.acceso.puede_gestionar ? 'Acceso de gestión' : 'Acceso de consulta'), elemento('span', [], finanzas.acceso.puede_gestionar ? 'Podés consultar saldos y registrar movimientos.' : 'Podés consultar saldos, pero no modificarlos.'))
    cabecera.appendChild(estadoAcceso)
    let barraOperacion = null
    if (finanzas.acceso.puede_gestionar) {
      barraOperacion = elemento('section', ['cms-finanzas-operacion'])
      const textoOperacion = elemento('div', [])
      textoOperacion.append(
        elemento('strong', [], 'Acciones de cobranza'),
        elemento('span', [], 'Las cuotas comunes pendientes reciben un único recargo del 10% desde el día 16. Las cuotas con beca no reciben recargo.'),
      )
      const accionesOperacion = elemento('div', ['cms-finanzas-acciones'])
      accionesOperacion.append(
        boton('Registrar pago', () => { formularioFinanzasFsb = { tipo: 'movimiento', movimiento: 'pago' }; dibujar() }, ['boton-principal']),
        boton('Generar cuotas', () => { formularioFinanzasFsb = { tipo: 'cuotas' }; dibujar() }),
        boton('Vincular manualmente', () => { formularioFinanzasFsb = { tipo: 'cuenta' }; dibujar() }),
        boton('Exportar mes', descargarFinanzasFsb),
      )
      barraOperacion.append(textoOperacion, accionesOperacion)
    }
    let asistenteConfiguracion = null
    if (finanzas.acceso.puede_gestionar && finanzas.configuracion) {
      const configuracion = finanzas.configuracion
      const pendientes = [
        [configuracion.participantes_sin_cuenta?.length || 0, 'participante todavía no está vinculado con Finanzas', 'participantes todavía no están vinculados con Finanzas'],
        [configuracion.participantes_sin_grupo?.length || 0, 'participante necesita un grupo', 'participantes necesitan un grupo'],
        [configuracion.becas_sin_porcentaje?.length || 0, 'beca necesita un porcentaje', 'becas necesitan un porcentaje'],
        [configuracion.mes_actual_generado ? 0 : 1, 'mes actual todavía no tiene cuotas generadas'],
      ].filter(([cantidad]) => cantidad > 0)
      asistenteConfiguracion = elemento('section', ['cms-finanzas-configuracion'])
      asistenteConfiguracion.append(
        elemento('span', ['cms-panel-etiqueta'], pendientes.length ? 'Configuración pendiente' : 'Configuración completa'),
        elemento('strong', [], pendientes.length ? 'Dejá Finanzas pronta antes de cobrar' : 'Finanzas está pronta para este mes'),
      )
      if (pendientes.length) {
        const listaConfiguracion = elemento('ul', [])
        pendientes.forEach(([cantidad, singular, plural = singular]) => listaConfiguracion.appendChild(elemento('li', [], `${cantidad} ${cantidad === 1 ? singular : plural}`)))
        const accionesConfiguracion = elemento('div', ['cms-finanzas-acciones'])
        if (configuracion.participantes_sin_cuenta?.length || configuracion.participantes_sin_grupo?.length || configuracion.becas_sin_porcentaje?.length) accionesConfiguracion.appendChild(enlaceA('personas', 'Corregir en Personas'))
        if (!configuracion.mes_actual_generado) accionesConfiguracion.appendChild(boton('Preparar cuotas del mes', () => { formularioFinanzasFsb = { tipo: 'cuotas' }; dibujar() }, ['boton-principal']))
        asistenteConfiguracion.append(listaConfiguracion, accionesConfiguracion)
      } else asistenteConfiguracion.appendChild(elemento('p', ['ayuda'], 'Las personas están vinculadas y las cuotas del mes ya fueron generadas.'))
    }
    if (preferenciasFinanzasFsb.densidad === 'compacta') panel.classList.add('vista-compacta')

    const cierreMes = cierreMensualFsb(finanzas.cuentas || [], periodoEstadoFinanzasFsb)
    const cierre = elemento('section', ['cms-finanzas-cierre'])
    const cabeceraCierre = elemento('div', ['cms-finanzas-cierre-cabecera'])
    const textoCierre = elemento('div', [])
    textoCierre.append(elemento('span', ['cms-panel-etiqueta'], 'Estado del mes'), elemento('strong', [], 'Cobranza de Fútbol sin Barreras'), elemento('p', ['ayuda'], 'Los pagos usan su fecha real. Los acuerdos de pago no cuentan como dinero recibido.'))
    const selectorCierre = inputCms('', 'Mes del cierre', 'month'); selectorCierre.value = periodoEstadoFinanzasFsb
    selectorCierre.addEventListener('change', () => { periodoEstadoFinanzasFsb = selectorCierre.value || HOY().slice(0, 7); dibujar() })
    cabeceraCierre.append(textoCierre, campoCms('Mes', selectorCierre))
    const cifrasCierre = elemento('div', ['cms-finanzas-cierre-cifras'])
    ;[
      ['Por cobrar', dineroFsb(cierreMes.por_cobrar_centavos), 'Saldo anterior más cargos del mes'],
      ['Cobrado', dineroFsb(cierreMes.pagos_centavos), `${cierreMes.cuentas_con_pago} ${cierreMes.cuentas_con_pago === 1 ? 'participante pagó' : 'participantes pagaron'}`],
      ['Pendiente', dineroFsb(cierreMes.pendiente_centavos), `${cierreMes.cuentas_pendientes} ${cierreMes.cuentas_pendientes === 1 ? 'participante requiere' : 'participantes requieren'} seguimiento`],
    ].forEach(([rotulo, valor, detalle]) => {
      const cifra = elemento('div', ['cms-finanzas-cierre-cifra'])
      cifra.append(elemento('span', [], rotulo), elemento('strong', [], valor), elemento('small', [], detalle))
      cifrasCierre.appendChild(cifra)
    })
    const avance = document.createElement('progress')
    avance.className = 'cms-finanzas-cierre-avance'
    avance.max = 100; avance.value = cierreMes.tasa_cobro ?? 0
    avance.setAttribute('aria-label', cierreMes.tasa_cobro === null ? 'Sin base para calcular la tasa de cobro' : `${cierreMes.tasa_cobro}% cobrado`)
    const lecturaAvance = elemento('div', ['cms-finanzas-cierre-lectura'])
    lecturaAvance.append(elemento('span', [], 'Inicio del mes'), avance, elemento('span', [], cierreMes.tasa_cobro === null ? 'Sin movimientos' : `${cierreMes.tasa_cobro}% cobrado`))
    const lecturaPendientes = boton(cierreMes.cuentas_pendientes ? `Ver ${cierreMes.cuentas_pendientes} ${cierreMes.cuentas_pendientes === 1 ? 'pendiente' : 'pendientes'}` : 'Sin pendientes', () => { guardarPreferenciasFinanzasFsb({ filtro: 'pendientes' }); dibujar() }, ['cms-finanzas-ver-pendientes'])
    lecturaPendientes.disabled = !cierreMes.cuentas_pendientes
    cierre.append(cabeceraCierre, cifrasCierre, lecturaAvance, lecturaPendientes)

    const herramientas = elemento('div', ['cms-finanzas-herramientas'])
    const buscar = inputCms('Nombre, grupo o tipo de cuota', 'Buscar participantes'); buscar.value = busquedaFinanzasFsb
    const grupo = selectorCms([['todos', 'Todos los grupos'], ['1', 'Grupo 1'], ['2', 'Grupo 2'], ['sin_grupo', 'Sin grupo']], 'Filtrar por grupo')
    grupo.value = preferenciasFinanzasFsb.grupo
    grupo.addEventListener('change', () => { guardarPreferenciasFinanzasFsb({ grupo: grupo.value }); dibujar() })
    const orden = selectorCms([['prioridad', 'Prioridad de cobro'], ['saldo', 'Mayor saldo'], ['nombre', 'Nombre A a Z'], ['ultimo_pago', 'Pago más reciente']], 'Ordenar participantes')
    orden.value = preferenciasFinanzasFsb.orden
    orden.addEventListener('change', () => { guardarPreferenciasFinanzasFsb({ orden: orden.value }); dibujar() })
    const densidad = boton(preferenciasFinanzasFsb.densidad === 'compacta' ? 'Vista cómoda' : 'Vista compacta', () => {
      guardarPreferenciasFinanzasFsb({ densidad: preferenciasFinanzasFsb.densidad === 'compacta' ? 'comoda' : 'compacta' }); dibujar()
    }, ['cms-finanzas-densidad'])
    const filtrosEstado = elemento('div', ['cms-finanzas-filtros-estado'])
    const cantidades = {
      todas: finanzas.cuentas?.length || 0,
      pendientes: (finanzas.cuentas || []).filter((cuenta) => cuenta.saldo_centavos > 0).length,
      vencidas: (finanzas.cuentas || []).filter((cuenta) => cuenta.estado_pago === 'vencido').length,
      al_dia: (finanzas.cuentas || []).filter((cuenta) => cuenta.estado_pago === 'al_dia').length,
      a_favor: (finanzas.cuentas || []).filter((cuenta) => cuenta.estado_pago === 'a_favor').length,
    }
    ;[['pendientes', 'Con saldo'], ['vencidas', 'Vencidas'], ['al_dia', 'Al día'], ['a_favor', 'A favor'], ['todas', 'Todas']].forEach(([valor, etiqueta]) => {
      const opcion = boton(`${etiqueta} ${cantidades[valor]}`, () => { guardarPreferenciasFinanzasFsb({ filtro: valor }); dibujar() }, ['cms-finanzas-filtro-estado'])
      opcion.setAttribute('aria-pressed', String(filtroFinanzasFsb === valor))
      filtrosEstado.appendChild(opcion)
    })
    const controles = elemento('div', ['cms-finanzas-controles'])
    controles.append(campoCms('Buscar', buscar), campoCms('Grupo', grupo), campoCms('Ordenar', orden), densidad)
    herramientas.append(filtrosEstado, controles)

    const termino = busquedaFinanzasFsb.trim().toLocaleLowerCase('es')
    const coincideCuenta = (cuenta, busqueda = termino) => {
      const textoCuenta = [cuenta.nombre, cuenta.grupo ? `grupo ${cuenta.grupo}` : 'sin grupo', etiquetaCondicionFsb(cuenta)].join(' ').toLocaleLowerCase('es')
      const coincideTexto = !busqueda || textoCuenta.includes(busqueda)
      const coincideGrupo = preferenciasFinanzasFsb.grupo === 'todos' || (preferenciasFinanzasFsb.grupo === 'sin_grupo' ? !cuenta.grupo : String(cuenta.grupo) === preferenciasFinanzasFsb.grupo)
      const coincideEstado = filtroFinanzasFsb === 'todas' || (filtroFinanzasFsb === 'pendientes' ? cuenta.saldo_centavos > 0 : filtroFinanzasFsb === 'vencidas' ? cuenta.estado_pago === 'vencido' : cuenta.estado_pago === filtroFinanzasFsb)
      return coincideTexto && coincideGrupo && coincideEstado
    }
    const ordenarCuentas = (a, b) => {
      if (preferenciasFinanzasFsb.orden === 'saldo') return b.saldo_centavos - a.saldo_centavos
      if (preferenciasFinanzasFsb.orden === 'nombre') return String(a.nombre).localeCompare(String(b.nombre), 'es')
      if (preferenciasFinanzasFsb.orden === 'ultimo_pago') return String(b.ultimo_pago_fecha || '').localeCompare(String(a.ultimo_pago_fecha || ''))
      const prioridadEstado = { vencido: 0, pendiente: 1, a_favor: 2, al_dia: 3 }
      return (prioridadEstado[a.estado_pago] - prioridadEstado[b.estado_pago]) || b.saldo_centavos - a.saldo_centavos
    }
    const cuentas = (finanzas.cuentas || []).filter((cuenta) => coincideCuenta(cuenta)).sort(ordenarCuentas)
    const lista = elemento('div', ['cms-finanzas-lista'])
    const resultado = elemento('div', ['cms-finanzas-resultado'], `${cuentas.length} ${cuentas.length === 1 ? 'participante visible' : 'participantes visibles'}`)
    if (!cuentas.length) {
      const vacio = elemento('div', ['cms-finanzas-vacio'])
      vacio.append(elemento('strong', [], finanzas.cuentas?.length ? 'No encontramos participantes con estos filtros.' : 'Todavía no hay participantes.'), elemento('span', [], finanzas.cuentas?.length ? 'Probá otra búsqueda o volvé a mostrar todos.' : 'Configurá el primero desde Personas para comenzar.'))
      if (finanzas.cuentas?.length) vacio.appendChild(boton('Limpiar filtros', () => { busquedaFinanzasFsb = ''; guardarPreferenciasFinanzasFsb({ filtro: 'todas', grupo: 'todos' }); dibujar() }))
      lista.appendChild(vacio)
    }
    cuentas.forEach((cuenta) => {
      const fila = elemento('article', ['cms-finanzas-fila', `estado-${cuenta.estado_pago}`])
      const identidad = elemento('div', ['cms-finanzas-identidad'])
      identidad.append(elemento('strong', [], cuenta.nombre), elemento('span', ['cms-proyecto-meta'], [cuenta.grupo ? `Grupo ${cuenta.grupo}` : 'Sin grupo', etiquetaCondicionFsb(cuenta)].join(' · ')))
      const estado = elemento('span', ['cms-finanzas-estado'], etiquetaEstadoFsb(cuenta.estado_pago))
      const saldo = elemento('div', ['cms-finanzas-saldo'])
      saldo.append(elemento('span', [], cuenta.saldo_centavos < 0 ? 'Saldo a favor' : 'Saldo'), elemento('strong', [], dineroFsb(Math.abs(cuenta.saldo_centavos))))
      const detalle = elemento('div', ['cms-finanzas-detalle'])
      detalle.appendChild(elemento('span', [], cuenta.ultimo_pago_fecha ? `Último pago: ${fechaHumana(cuenta.ultimo_pago_fecha)}, ${dineroFsb(cuenta.ultimo_pago_centavos)}` : 'Todavía no hay pagos registrados'))
      if (cuenta.vencido_centavos > 0) detalle.appendChild(elemento('strong', [], `${dineroFsb(cuenta.vencido_centavos)} vencidos`))
      if (cuenta.compromiso_activo) detalle.appendChild(elemento('span', ['cms-finanzas-compromiso-resumen', `estado-${cuenta.compromiso_activo.estado_calculado}`], `${cuenta.compromiso_activo.estado_calculado === 'vencido' ? 'Compromiso vencido' : 'Compromiso'}: ${fechaHumana(cuenta.compromiso_activo.fecha_prevista)}`))
      fila.append(identidad, estado, saldo, detalle)
      const acciones = elemento('div', ['cms-finanzas-fila-acciones'])
      const estaAbierta = cuentaFinanzasFsbAbierta === cuenta.id
      acciones.appendChild(boton(estaAbierta ? 'Cerrar detalle' : 'Ver detalle', () => { cuentaFinanzasFsbAbierta = estaAbierta ? null : cuenta.id; dibujar() }))
      if (finanzas.acceso.puede_gestionar) {
        acciones.appendChild(boton('Registrar pago', () => { formularioFinanzasFsb = { tipo: 'movimiento', movimiento: 'pago', cuenta_id: cuenta.id }; dibujar() }, ['boton-principal']))
      }
      fila.appendChild(acciones)
      if (estaAbierta) {
        const historial = elemento('div', ['cms-finanzas-historial'])
        const cabeceraHistorial = elemento('div', ['cms-finanzas-historial-cabecera'])
        cabeceraHistorial.appendChild(elemento('strong', [], 'Estado de cuenta'))
        if (finanzas.acceso.puede_gestionar) {
          const accionesHistorial = elemento('div', ['cms-finanzas-historial-acciones'])
          accionesHistorial.append(
            cuenta.persona_id
              ? enlaceA('personas', 'Archivar participante', [], { busqueda: cuenta.nombre, personaId: cuenta.persona_id, accionPersona: 'archivar' })
              : boton('Editar tipo de cuota', () => { formularioFinanzasFsb = { tipo: 'editar_cuenta', cuenta_id: cuenta.id }; dibujar() }),
            boton('Agregar cargo', () => { formularioFinanzasFsb = { tipo: 'movimiento', movimiento: 'cargo', cuenta_id: cuenta.id }; dibujar() }),
            boton('Registrar pago de equipo', () => { formularioFinanzasFsb = { tipo: 'movimiento', movimiento: 'pago_equipo', cuenta_id: cuenta.id }; dibujar() }),
          )
          if (cuenta.persona_id) accionesHistorial.appendChild(elemento('small', ['ayuda'], 'Conserva su historial y evita nuevas cuotas.'))
          if (!cuenta.compromiso_activo) accionesHistorial.appendChild(boton('Acordar pago', () => { formularioFinanzasFsb = { tipo: 'compromiso', cuenta_id: cuenta.id, nombre: cuenta.nombre }; dibujar() }))
          if (cuenta.saldo_centavos > 0) accionesHistorial.appendChild(boton('Preparar recordatorio', () => { formularioFinanzasFsb = { tipo: 'recordatorio', cuenta_id: cuenta.id }; dibujar() }))
          cabeceraHistorial.appendChild(accionesHistorial)
        }
        historial.append(cabeceraHistorial, cuenta.observaciones ? elemento('p', ['ayuda'], cuenta.observaciones) : document.createDocumentFragment())

        const estadoMes = estadoCuentaMensualFsb(cuenta, periodoEstadoFinanzasFsb)
        const resumenMes = elemento('section', ['cms-finanzas-estado-mensual'])
        const cabeceraMes = elemento('div', ['cms-finanzas-estado-mensual-cabecera'])
        const selectorMes = inputCms('', 'Mes del estado de cuenta', 'month'); selectorMes.value = periodoEstadoFinanzasFsb
        selectorMes.addEventListener('change', () => { periodoEstadoFinanzasFsb = selectorMes.value || HOY().slice(0, 7); dibujar() })
        cabeceraMes.append(elemento('strong', [], 'Resumen mensual'), campoCms('Mes', selectorMes))
        const cifrasMes = elemento('div', ['cms-finanzas-estado-mensual-cifras'])
        ;[['Saldo anterior', estadoMes.saldo_inicial_centavos], ['Cargos', estadoMes.cargos_centavos], ['Pagos', estadoMes.pagos_centavos], ['Saldo al cierre', estadoMes.saldo_final_centavos]].forEach(([rotulo, valor]) => {
          const cifra = elemento('div', [])
          cifra.append(elemento('span', [], rotulo), elemento('strong', [], dineroFsb(Math.abs(valor))), valor < 0 ? elemento('small', [], 'A favor') : document.createDocumentFragment())
          cifrasMes.appendChild(cifra)
        })
        resumenMes.append(cabeceraMes, cifrasMes)
        historial.appendChild(resumenMes)

        if (cuenta.compromisos?.length) {
          const compromisos = elemento('section', ['cms-finanzas-compromisos'])
          compromisos.appendChild(elemento('strong', [], 'Compromisos de pago'))
          cuenta.compromisos.forEach((compromiso) => {
            const compromisoFila = elemento('div', ['cms-finanzas-compromiso', `estado-${compromiso.estado_calculado}`])
            const textoCompromiso = elemento('div', [])
            textoCompromiso.append(
              elemento('strong', [], compromiso.estado_calculado === 'vencido' ? 'Compromiso vencido' : compromiso.estado_calculado === 'cumplido' ? 'Compromiso cumplido' : compromiso.estado_calculado === 'cancelado' ? 'Compromiso cancelado' : 'Compromiso vigente'),
              elemento('span', [], [`Previsto para ${fechaHumana(compromiso.fecha_prevista)}`, compromiso.importe_centavos ? dineroFsb(compromiso.importe_centavos) : '', compromiso.nota || ''].filter(Boolean).join(' · ')),
            )
            compromisoFila.appendChild(textoCompromiso)
            if (['vigente', 'vencido'].includes(compromiso.estado_calculado) && finanzas.acceso.puede_gestionar) compromisoFila.appendChild(boton('Cerrar compromiso', () => { formularioFinanzasFsb = { tipo: 'cerrar_compromiso', compromiso_id: compromiso.id, nombre: cuenta.nombre, fecha_prevista: compromiso.fecha_prevista }; dibujar() }))
            compromisos.appendChild(compromisoFila)
          })
          historial.appendChild(compromisos)
        }

        historial.appendChild(elemento('strong', ['cms-finanzas-movimientos-titulo'], 'Movimientos'))
        if (!cuenta.movimientos?.length) historial.appendChild(elemento('p', ['cms-finanzas-vacio'], 'Todavía no hay movimientos en esta cuenta.'))
        ;(cuenta.movimientos || []).forEach((movimiento) => {
          const movimientoFila = elemento('div', ['cms-finanzas-movimiento', ...(movimiento.anulado_en ? ['anulado'] : [])])
          const concepto = elemento('div', ['cms-finanzas-movimiento-concepto'])
          concepto.append(elemento('strong', [], movimiento.concepto), elemento('span', ['cms-proyecto-meta'], [etiquetaMovimientoFsb(movimiento.tipo), fechaHumana(movimiento.fecha), movimiento.periodo || '', movimiento.vencimiento ? `Vence ${fechaHumana(movimiento.vencimiento)}` : '', movimiento.medio_pago || ''].filter(Boolean).join(' · ')))
          const valor = elemento('strong', ['cms-finanzas-movimiento-importe'], `${Number(movimiento.importe_centavos) < 0 ? '-' : '+'} ${dineroFsb(Math.abs(movimiento.importe_centavos))}`)
          movimientoFila.append(concepto, valor)
          if (movimiento.anulado_en) movimientoFila.appendChild(elemento('span', ['cms-finanzas-movimiento-anulado'], `Anulado: ${movimiento.motivo_anulacion || 'sin detalle'}`))
          else if (finanzas.acceso.puede_gestionar) movimientoFila.appendChild(boton(movimiento.tipo === 'pago' ? 'Corregir pago' : 'Anular', () => { formularioFinanzasFsb = { tipo: 'anular', movimiento_id: movimiento.id, concepto: movimiento.concepto, importe_centavos: movimiento.importe_centavos, es_pago: movimiento.tipo === 'pago' }; dibujar() }, ['boton-peligro']))
          historial.appendChild(movimientoFila)
        })
        fila.appendChild(historial)
      }
      lista.appendChild(fila)
    })
    buscar.addEventListener('input', () => {
      busquedaFinanzasFsb = buscar.value
      const busqueda = busquedaFinanzasFsb.trim().toLocaleLowerCase('es')
      let visibles = 0
      lista.querySelectorAll('.cms-finanzas-fila').forEach((fila) => {
        const cuenta = (finanzas.cuentas || []).find((candidata) => candidata.id === fila.dataset.cuentaId)
        const mostrar = cuenta ? coincideCuenta(cuenta, busqueda) : false
        fila.hidden = !mostrar
        if (mostrar) visibles += 1
      })
      resultado.textContent = `${visibles} ${visibles === 1 ? 'participante visible' : 'participantes visibles'}`
    })
    lista.querySelectorAll('.cms-finanzas-fila').forEach((fila, indice) => { fila.dataset.cuentaId = cuentas[indice]?.id || '' })
    panel.append(cabecera)
    if (barraOperacion) panel.appendChild(barraOperacion)
    if (asistenteConfiguracion) panel.appendChild(asistenteConfiguracion)
    panel.appendChild(cierre)
    panel.append(renderFormularioFinanzasFsb(), herramientas, resultado, lista)
    return panel
  }

  function encabezadoArea() {
    if (!nombresArea[area]) return null
    const equipo = equipoFundacionalCms(datos.equipos, area)
    const responsables = datos.responsabilidades.filter((fila) => fila.equipo_id === equipo?.id && fila.activo !== false)
    const proximo = datos.eventos.filter((fila) => fila.equipo_id === equipo?.id && fila.estado === 'planificado').sort((a, b) => String(a.fecha_hora).localeCompare(String(b.fecha_hora)))[0]
    const abiertas = datos.tareas.filter((fila) => fila.equipo_id === equipo?.id && !['completada', 'cancelada'].includes(fila.estado)).length
    const ficha = elemento('section', ['cms-ficha-area', `cms-ficha-area-${area}`])
    ficha.append(
      elemento('span', ['cms-panel-etiqueta'], equipo?.categoria ? (TEXTO_CATEGORIA_EQUIPO[equipo.categoria] || 'Equipo de trabajo') : 'Equipo de trabajo'),
      elemento('h3', [], nombresArea[area]),
      elemento('p', [], equipo?.proposito || 'Espacio de coordinación, seguimiento y memoria institucional.'),
    )
    const datosArea = elemento('div', ['cms-ficha-area-datos'])
    datosArea.append(
      elemento('span', [], `Responsables: ${responsables.map((fila) => fila.nombre || fila.correo || fila.usuario_nombre || fila.usuario_correo).filter(Boolean).join(', ') || 'por asignar'}`),
      elemento('span', [], `${abiertas} tareas abiertas`),
      elemento('span', [], proximo ? `Próximo hito: ${fechaHoraProgramadaHumana(proximo.fecha_hora)}` : 'Sin próximo hito'),
    )
    ficha.appendChild(datosArea)
    if (datos.alcance?.puede_gestionar && equipo) {
      const acciones = elemento('div', ['cms-ficha-area-acciones'])
      acciones.append(
        boton('Nueva tarea', () => { tipoNuevaTarea = 'tarea'; formularioAbierto = 'tarea'; dibujar() }),
        boton('Nuevo proyecto', () => { proyectoAEditar = null; formularioAbierto = 'proyecto'; dibujar() }),
      )
      if (datos.alcance?.global) acciones.appendChild(boton('Gestionar integrantes', () => { equipoDeResponsabilidad = equipo.id; formularioAbierto = 'responsabilidad'; dibujar() }))
      ficha.appendChild(acciones)
    }
    return ficha
  }

  function dibujar() {
    if (conservarFormularioTrasFallo()) return
    vaciar(raiz)
    const seccion = elemento('section', ['cms'])
    if (formularioAbierto) seccion.classList.add('cms-con-panel')
    seccion.appendChild(migasPagina())
    const encabezado = elemento('header', ['cms-encabezado'])
    const titulo = elemento('div', [])
    const vistaTrabajo = area === 'trabajo' ? VISTAS_TRABAJO[filtroTrabajo] : null
    const tituloArea = vistaTrabajo?.titulo || nombresPagina[area]
    const descripcionPagina = {
      trabajo: 'Tareas, solicitudes y seguimientos que necesitan una próxima acción.',
      agenda: 'Actividades, reuniones, vencimientos y decisiones en un solo lugar.',
      areas: 'Equipos, comisiones y responsabilidades conectados por una misma operación.',
      formularios: 'Entradas públicas o internas, su revisión y las tareas que generan.',
      biblioteca: 'Documentos, programas, alianzas y proyectos con contexto institucional.',
      privacidad: 'Pedidos de copia o eliminación con identidad verificada, revisión y constancia.',
      auditoria: 'Superficie completa para administración y control técnico.',
    }
    titulo.append(
      elemento('p', ['cms-sobrelinea'], nombresArea[area] ? 'Gestión institucional · Equipo de trabajo' : 'Gestión institucional'),
      elemento('h2', [], tituloArea ?? 'Aletea'),
      elemento('p', ['ayuda'], nombresArea[area] ? `Espacio de trabajo de ${tituloArea.toLowerCase()}.` : (vistaTrabajo?.descripcion || descripcionPagina[area] || 'Lo importante para decidir, hacer y seguir esta semana.')),
    )
    encabezado.appendChild(titulo)
    const firma = document.createElement('img')
    firma.className = 'cms-firma-aletea'
    firma.src = 'assets/logo-aletea.png'
    firma.alt = 'Aletea'
    encabezado.appendChild(firma)
    if (!formularioAbierto && datos.alcance?.puede_gestionar && !['privacidad', 'areas'].includes(area)) {
      const acciones = elemento('div', ['cms-encabezado-acciones'])
      acciones.append(
        boton('Solicitar a un equipo', () => { actividadPreseleccionada = null; tipoNuevaTarea = 'solicitud'; formularioAbierto = 'tarea'; dibujar() }),
        boton('Crear', () => { formularioAbierto = 'captura-rapida'; dibujar() }, ['boton-principal']),
      )
      encabezado.appendChild(acciones)
    }
    seccion.appendChild(encabezado)
    seccion.appendChild(panelBusquedaGlobal())
    seccion.appendChild(panelConfirmacion())
    if (formularioAbierto === 'captura-rapida') seccion.appendChild(panelCapturaRapida())
    if (formularioAbierto === 'capacidad') seccion.appendChild(formularioCapacidadTrabajo())
    if (formularioAbierto === 'tarea') seccion.appendChild(formularioTarea())
    if (formularioAbierto === 'editar-tarea') {
      const tarea = datos.tareas.find((fila) => fila.id === tareaAEditar)
      if (tarea) seccion.appendChild(formularioTarea(tarea))
      else { formularioAbierto = null; tareaAEditar = null }
    }
    if (formularioAbierto === 'contexto-tarea') seccion.appendChild(panelContextoTarea())
    if (formularioAbierto === 'ver-equipo') {
      const panelEquipo = panelEquipoAbierto()
      if (panelEquipo) seccion.appendChild(panelEquipo)
      else { formularioAbierto = null; equipoAbiertoId = null }
    }
    if (formularioAbierto === 'equipo') seccion.appendChild(formularioEquipo(datos.equipos.find((fila) => fila.id === equipoAEditar) || null))
    if (formularioAbierto === 'proyecto') seccion.appendChild(formularioProyecto())
    if (formularioAbierto === 'programa') seccion.appendChild(formularioPrograma())
    if (formularioAbierto === 'editar-programa') {
      const programa = datos.programas.find((fila) => fila.id === programaAEditar)
      if (programa) seccion.appendChild(formularioPrograma(programa))
      else { formularioAbierto = null; programaAEditar = null }
    }
    if (formularioAbierto === 'unidad') seccion.appendChild(formularioUnidad())
    if (formularioAbierto === 'ver-unidad') {
      const panelUnidad = panelUnidadAbierta()
      if (panelUnidad) seccion.appendChild(panelUnidad)
      else { formularioAbierto = null; unidadAbiertaId = null }
    }
    if (formularioAbierto === 'editar-unidad') {
      const unidad = datos.unidades.find((fila) => fila.id === unidadAEditar)
      if (unidad) seccion.appendChild(formularioUnidad(unidad))
      else { formularioAbierto = null; unidadAEditar = null }
    }
    if (formularioAbierto === 'riesgo') {
      const forma = formularioRiesgoProyecto()
      if (forma) seccion.appendChild(forma)
      else { formularioAbierto = null; proyectoDeRiesgo = null }
    }
    if (formularioAbierto === 'hito') {
      const forma = formularioHitoProyecto()
      if (forma) seccion.appendChild(forma)
      else { formularioAbierto = null; proyectoDeSeguimiento = null }
    }
    if (formularioAbierto === 'gasto') {
      const forma = formularioGastoProyecto()
      if (forma) seccion.appendChild(forma)
      else { formularioAbierto = null; proyectoDeSeguimiento = null }
    }
    if (formularioAbierto === 'documento') seccion.appendChild(formularioDocumento())
    if (formularioAbierto === 'alianza') seccion.appendChild(formularioAlianza())
    if (formularioAbierto === 'editar-alianza') {
      const alianza = datos.alianzas.find((fila) => fila.id === alianzaAEditar)
      if (alianza) seccion.appendChild(formularioAlianza(alianza))
      else { formularioAbierto = null; alianzaAEditar = null }
    }
    if (formularioAbierto === 'entrada') seccion.appendChild(formularioEntrada())
    if (formularioAbierto === 'solicitud-privacidad') seccion.appendChild(formularioSolicitudPrivacidad())
    if (formularioAbierto === 'avance-privacidad') seccion.appendChild(formularioAvancePrivacidad())
    if (formularioAbierto === 'comunicado') seccion.appendChild(formularioComunicado())
    if (formularioAbierto === 'formulario') seccion.appendChild(formularioFormulario())
    if (formularioAbierto === 'editar-formulario') {
      const formulario = datos.formularios.find((fila) => fila.id === formularioAEditar)
      if (formulario) seccion.appendChild(formularioFormulario(formulario))
      else { formularioAbierto = null; formularioAEditar = null }
    }
    if (formularioAbierto === 'duplicar-formulario') {
      const formulario = datos.formularios.find((fila) => fila.id === formularioParaDuplicar)
      if (formulario) seccion.appendChild(formularioFormulario(formulario, true))
      else { formularioAbierto = null; formularioParaDuplicar = null }
    }
    if (formularioAbierto === 'respuesta-formulario') {
      const formulario = datos.formularios.find((fila) => fila.id === formularioParaRespuesta)
      if (formulario) seccion.appendChild(formularioRespuestaFormulario(formulario))
      else { formularioAbierto = null; formularioParaRespuesta = null }
    }
    if (formularioAbierto === 'cumplir-entrada') seccion.appendChild(formularioCumplirEntrada())
    if (formularioAbierto === 'reabrir-entrada') seccion.appendChild(formularioReabrirEntrada())
    if (formularioAbierto === 'checklist') seccion.appendChild(formularioChecklist())
    if (formularioAbierto === 'tarea-recurrente') seccion.appendChild(formularioTareaRecurrente())
    if (formularioAbierto === 'evento') seccion.appendChild(formularioEvento())
    if (formularioAbierto === 'editar-evento') {
      const evento = datos.eventos.find((fila) => fila.id === eventoAEditar)
      if (evento) seccion.appendChild(formularioEvento(evento))
      else { formularioAbierto = null; eventoAEditar = null }
    }
    if (formularioAbierto === 'editar-proyecto') {
      const proyecto = datos.proyectos.find((fila) => fila.id === proyectoAEditar)
      if (proyecto) seccion.appendChild(formularioProyecto(proyecto))
      else { formularioAbierto = null; proyectoAEditar = null }
    }
    if (formularioAbierto === 'responsabilidad') {
      const forma = formularioResponsabilidad()
      if (forma) seccion.appendChild(forma)
      else { formularioAbierto = null; equipoDeResponsabilidad = null }
    }
    if (formularioAbierto === 'reunion') seccion.appendChild(formularioReunion())
    if (formularioAbierto === 'editar-reunion') {
      const forma = formularioEdicionReunion()
      if (forma) seccion.appendChild(forma)
      else { formularioAbierto = null; reunionAEditar = null }
    }
    if (formularioAbierto === 'decision') {
      const forma = formularioDecision()
      if (forma) seccion.appendChild(forma)
      else { formularioAbierto = null; reunionDeDecision = null }
    }
    if (formularioAbierto === 'cierre-reunion') {
      const forma = formularioCierreReunion()
      if (forma) seccion.appendChild(forma)
      else { formularioAbierto = null; reunionDeCierre = null }
    }
    if (formularioAbierto === 'completar-tarea') {
      const forma = formularioCompletarTarea()
      if (forma) seccion.appendChild(forma)
      else { formularioAbierto = null; tareaParaCompletar = null }
    }
    if (cargando) {
      const carga = elemento('section', ['cms-carga'], null)
      carga.setAttribute('aria-label', 'Cargando el tablero institucional')
      carga.setAttribute('aria-busy', 'true')
      carga.append(
        elemento('span', ['cms-carga-linea'], ''),
        elemento('span', ['cms-carga-linea', 'cms-carga-linea-corta'], ''),
        elemento('div', ['cms-carga-tarjetas'], elemento('span', [], ''), elemento('span', [], ''), elemento('span', [], '')),
      )
      seccion.appendChild(carga)
      raiz.appendChild(seccion)
      return
    }
    if (error) {
      seccion.append(elemento('p', ['error-ajustes'], error), boton('Reintentar', cargar))
      raiz.appendChild(seccion)
      return
    }
    if (mostrarGuiaInicial) {
      const guia = elemento('section', ['cms-guia-inicial'])
      const textoGuia = elemento('div', [])
      textoGuia.append(
        elemento('span', ['sobrelinea'], 'PRIMEROS PASOS'),
        elemento('h3', [], 'Tus tareas y avisos viven acá'),
        elemento('p', [], 'Entrá a Mis tareas para revisar asignaciones. El contador muestra notificaciones nuevas y cada notificación abre la tarea exacta. El sistema no envía mensajes automáticos por WhatsApp.'),
      )
      const accionesGuia = elemento('div', ['cms-guia-inicial-acciones'])
      const cerrarGuia = () => {
        mostrarGuiaInicial = false
        try { window.localStorage.setItem(claveGuiaInicial, 'vista') } catch {}
        dibujar()
      }
      accionesGuia.append(
        enlaceBoton('Abrir Mis tareas', rutaParaPantalla('cms-trabajo'), () => { cerrarGuia(); alIrA('cms-trabajo') }, ['boton-principal']),
        enlaceBoton('Ver Ayuda', rutaParaPantalla('ayuda', { busqueda: 'notificaciones' }), () => { cerrarGuia(); alIrA('ayuda', { busqueda: 'notificaciones' }) }),
        boton('Entendido', cerrarGuia),
      )
      guia.append(textoGuia, accionesGuia)
      seccion.appendChild(guia)
    }
    const resumen = resumenTablero(datos.tareas, HOY())
    const indicadores = elemento('div', ['cms-indicadores'])
    ;[
      ['Atrasadas', resumen.atrasada, 'atrasada', 'atrasadas'], ['Próximas', resumen.proxima, 'proxima', 'proximas'], ['Bloqueadas', resumen.bloqueada, 'bloqueada', 'bloqueadas'], ['Seguimientos', resumen.seguimiento, 'seguimiento', 'seguimiento'], ['Sin responsable', resumen.sinResponsable, 'sin-responsable', 'sin-responsable'],
    ].forEach(([etiqueta, cantidad, clase, filtro]) => {
      const tarjeta = enlaceA('cms-trabajo', '', ['cms-indicador', `cms-indicador-${clase}`], { filtroTrabajo: filtro })
      tarjeta.setAttribute('aria-label', `${cantidad} ${etiqueta.toLowerCase()}. Abrir Mis tareas.`)
      tarjeta.append(elemento('strong', [], String(cantidad)), elemento('span', [], etiqueta), elemento('small', [], 'Abrir'))
      indicadores.appendChild(tarjeta)
    })
    if (['control', 'trabajo'].includes(area)) seccion.appendChild(indicadores)

    const trabajo = elemento('section', ['cms-trabajo'])
    trabajo.appendChild(elemento('h3', [], 'Prioridades de hoy'))
    const prioritarias = datos.tareas.filter((tarea) => requiereSeguimiento(tarea, HOY()) || ['atrasada', 'bloqueada', 'esperando_respuesta', 'proxima'].includes(clasificarTarea(tarea, HOY())))
    if (prioritarias.length) trabajo.append(...prioritarias.slice(0, 12).map(filaTarea))
    else trabajo.append(elemento('p', ['ayuda'], 'No hay tareas atrasadas, bloqueadas ni próximas a vencer.'))

    const briefing = elemento('section', ['cms-briefing'])
    const briefingTexto = elemento('div', ['cms-briefing-texto'])
    briefingTexto.append(
      elemento('span', ['cms-briefing-etiqueta'], 'Mesa de coordinación'),
      elemento('h3', [], prioritarias.length ? `${prioritarias.length} asuntos requieren una decisión o seguimiento` : 'La coordinación está al día'),
      elemento('p', [], prioritarias.length ? 'Empezá por lo bloqueado, lo vencido y lo que necesita una respuesta esta semana.' : 'No hay alertas urgentes. Podés avanzar en planificación y seguimiento institucional.'),
    )
    const briefingAccion = enlaceA('cms-agenda', 'Ver agenda')
    briefing.append(briefingTexto, briefingAccion)
    if (area === 'control') seccion.appendChild(briefing)

    const principal = elemento('div', ['cms-control-principal'])
    if (area === 'control') {
      if (esVistaMovil()) principal.append(panelHoyMovil(), panelContinuarTrabajo(), panelTrabajoPersonal({ compacto: true }), panelProximoEvento(), panelPlegableMovil('Métricas operativas', 'Asignación, cierres, atrasos y seguimientos.', panelMetricasOperativas()))
      else principal.append(
        panelOrientacion(),
        panelContinuarTrabajo(),
        panelTrabajoPersonal(),
        panelDecisionesPendientes(),
        panelProximoEvento(),
        panelMetricasOperativas(),
        panelMapaVivo(),
        panelComunicados(),
        panelAyudaContextual(),
      )
    } else if (area === 'trabajo') principal.append(
      panelTrabajoPersonal({ completo: true }),
      panelNotificaciones(),
      panelPlegableMovil('Capacidad', 'Disponibilidad y carga estimada por persona.', panelCapacidadTrabajo()),
      panelPlegableMovil('Directrices', 'Acuerdos vigentes que orientan el trabajo.', panelDirectrices()),
      panelPlegableMovil('Seguimiento personal', 'Próximos pasos y tareas a revisar.', panelSeguimientoPersonal()),
    )
    else if (area === 'agenda') principal.append(
      panelEventos(),
      panelPlegableMovil('Decisiones', 'Acuerdos y definiciones vinculadas a reuniones.', panelCentroDecisiones()),
      panelPlegableMovil('Conflictos de agenda', 'Cruces que requieren una decisión.', panelConflictosAgenda()),
      panelPlegableMovil('Reuniones', 'Próximos encuentros y preparación.', panelReuniones()),
      panelPlegableMovil('Checklists', 'Modelos reutilizables para actividades.', panelChecklists()),
      panelPlegableMovil('Rutinas', 'Tareas recurrentes y sus próximas ejecuciones.', panelTareasRecurrentes()),
    )
    else if (area === 'areas') principal.append(
      panelMapaVivo(),
      panelUnidadesArea(),
      panelPlegableMovil('Capacidad', 'Disponibilidad y carga estimada por persona.', panelCapacidadTrabajo()),
      panelPlegableMovil('Estructura institucional', 'Roles, equipos y responsables.', panelEstructura()),
      panelPlegableMovil('Proyectos', 'Avance y próximos hitos.', panelFlujoProyectos()),
      ...panelesSecundariosMovil('Programas y alianzas', 'Iniciativas y vínculos institucionales.', panelProgramas(), panelAlianzas()),
    )
    else if (area === 'formularios') principal.append(
      panelEmbudoFormularios(),
      panelNavegacionFormularios(),
      ...(vistaFormularios === 'formularios' ? [panelFormularios()] : [panelEntradas()]),
    )
    else if (area === 'biblioteca') principal.append(
      panelFlujoProyectos(),
      panelPlegableMovil('Documentos', 'Material institucional disponible.', panelDocumentos()),
      ...panelesSecundariosMovil('Programas y alianzas', 'Iniciativas y vínculos institucionales.', panelProgramas(), panelAlianzas()),
      ...panelesSecundariosMovil('Seguimiento y riesgos', 'Hitos, presupuesto y riesgos de proyectos.', panelSeguimientoProyecto(), panelRiesgosProyecto()),
    )
    else if (area === 'privacidad') principal.append(panelSolicitudesPrivacidad())
    else if (area === 'auditoria') principal.append(
      trabajo, panelCapacidadTrabajo(), panelMetricasOperativas(), panelSeguimientoPersonal(), panelDirectrices(), panelResumenSemanal(),
      panelAlertasInstitucionales(), panelHorizonteInstitucional(), panelNotificaciones(),
      panelEventos(), panelCentroDecisiones(), panelConflictosAgenda(), panelChecklists(), panelTareasRecurrentes(), panelReuniones(),
      panelEmbudoFormularios(), panelEntradas(), panelFormularios(), panelComunicados(), panelFlujoProyectos(), panelUnidadesArea(), panelProgramas(), panelAlianzas(),
      panelEstructura(), panelRiesgosProyecto(), panelSeguimientoProyecto(), panelDocumentos(),
      tarjetaSector({ id: 'familias', etiqueta: 'Equipo', titulo: 'Familias', resumen: 'Entradas y acompañamiento' }),
      tarjetaSector({ id: 'deportes', etiqueta: 'Equipo', titulo: 'Deportes', resumen: 'Programas deportivos' }),
      tarjetaSector({ id: 'comunicacion', etiqueta: 'Equipo', titulo: 'Comunicación', resumen: 'Comunicados y campañas' }),
      tarjetaSector({ id: 'capacitaciones', etiqueta: 'Equipo', titulo: 'Capacitaciones', resumen: 'Cursos y formación' }),
      tarjetaSector({ id: 'finanzas', etiqueta: 'Equipo', titulo: 'Finanzas', resumen: 'Presupuesto y seguimiento' }),
      tarjetaSector({ id: 'eventos', etiqueta: 'Equipo', titulo: 'Eventos', resumen: 'Actividades y preparación' }),
      tarjetaSector({ id: 'administracion', etiqueta: 'Equipo', titulo: 'Administración', resumen: 'Estructura institucional' }),
    )
    else if (area === 'familias') principal.append(
      encabezadoArea(), panelUnidadesArea('familias'), panelTrabajoPersonal({ completo: true }),
      panelFlujoProyectos({
        equipoId: equipoFundacionalCms(datos.equipos, 'familias')?.id || '',
        tituloPanel: 'Proyectos de Familias',
        ayudaPanel: 'Encontrá, editá y seguí desde acá todos los proyectos creados para el equipo de Familias.',
      }),
      ...panelesSecundariosMovil('Personas y resguardos', 'Información protegida y permisos del equipo.', panelContextoProtegidoDePersonas()),
      ...panelesSecundariosMovil('Formularios y entradas', 'Solicitudes, respuestas y tareas por revisar.', panelEmbudoFormularios(), panelEntradas(), panelFormularios()),
      ...panelesSecundariosMovil('Programas y alianzas', 'Iniciativas y vínculos del equipo.', panelProgramas(), panelAlianzas()),
    )
    else if (area === 'deportes') {
      principal.append(
        encabezadoArea(), panelUnidadesArea('deportes'), panelTrabajoPersonal({ completo: true }),
        ...panelesSecundariosMovil('Personas y proyectos', 'Información protegida y planificación del equipo.', panelContextoProtegidoDePersonas(), panelFlujoProyectos()),
        ...panelesSecundariosMovil('Programas y alianzas', 'Iniciativas y vínculos del equipo.', panelProgramas(), panelAlianzas()),
      )
    } else if (area === 'comunicacion') principal.append(
      encabezadoArea(), panelUnidadesArea('comunicacion'), panelTrabajoPersonal({ completo: true }),
      ...panelesSecundariosMovil('Entradas y comunicados', 'Solicitudes, anuncios y comunicaciones del equipo.', panelEmbudoFormularios(), panelComunicados()),
      ...panelesSecundariosMovil('Formularios y alianzas', 'Canales de respuesta y vínculos institucionales.', panelFormularios(), panelAlianzas()),
    )
    else if (area === 'capacitaciones') principal.append(
      encabezadoArea(), panelUnidadesArea('capacitaciones'), panelTrabajoPersonal({ completo: true }),
      ...panelesSecundariosMovil('Programas y formularios', 'Oferta formativa y respuestas recibidas.', panelProgramas(), panelFormularios()),
      ...panelesSecundariosMovil('Preparación y reuniones', 'Checklists y próximos encuentros.', panelChecklists(), panelReuniones()),
    )
    else if (area === 'finanzas') principal.append(
      encabezadoArea(), panelUnidadesArea('finanzas'), panelFinanzasFsb(), panelTrabajoPersonal({ completo: true }),
      ...panelesSecundariosMovil('Seguimiento financiero', 'Riesgos, avances y documentación de proyectos.', panelRiesgosProyecto(), panelSeguimientoProyecto(), panelDocumentos()),
    )
    else if (area === 'eventos') principal.append(
      encabezadoArea(), panelUnidadesArea('eventos'), panelTrabajoPersonal({ completo: true }),
      ...panelesSecundariosMovil('Agenda y decisiones', 'Eventos, acuerdos y conflictos por resolver.', panelEventos(), panelCentroDecisiones(), panelConflictosAgenda()),
      ...panelesSecundariosMovil('Preparación y rutinas', 'Checklists, tareas recurrentes y reuniones.', panelChecklists(), panelTareasRecurrentes(), panelReuniones()),
    )
    else principal.append(
      encabezadoArea(), panelUnidadesArea('administracion'), panelTrabajoPersonal({ completo: true }),
      ...panelesSecundariosMovil('Dirección y estructura', 'Directrices, resumen semanal y estructura institucional.', panelDirectrices(), panelResumenSemanal(), panelCentroDecisiones(), panelEstructura()),
      ...panelesSecundariosMovil('Proyectos y registro', 'Avance, documentación y trazabilidad institucional.', panelFlujoProyectos(), panelDocumentos(), panelRegistroInstitucional()),
    )

    const radar = elemento('details', ['cms-radar'])
    radar.open = radarInstitucionalAbierto
    const tituloRadar = elemento('summary', ['cms-radar-titulo'])
    tituloRadar.append(elemento('span', [], 'Radar institucional'), elemento('span', ['cms-radar-estado'], radarInstitucionalAbierto ? 'Ocultar' : 'Mostrar'))
    radar.append(
      tituloRadar,
      panelAlertasInstitucionales(),
      panelHorizonteInstitucional(),
      ...(area === 'trabajo' ? [] : [panelNotificaciones()]),
    )
    radar.addEventListener('toggle', () => {
      radarInstitucionalAbierto = radar.open
      const estado = radar.querySelector('.cms-radar-estado')
      if (estado) estado.textContent = radar.open ? 'Ocultar' : 'Mostrar'
      const centroRadar = radar.closest('.cms-centro-control')
      if (centroRadar) centroRadar.classList.toggle('cms-centro-radar-cerrado', !radar.open)
      try { window.localStorage.setItem(claveRadarInstitucional, radar.open ? 'abierto' : 'cerrado') } catch { /* La interacción sigue funcionando sin persistencia. */ }
    })
    const conRadar = ['control', 'trabajo', 'agenda', 'auditoria'].includes(area) && !esVistaMovil()
    const centro = elemento('div', ['cms-centro-control', `cms-centro-${area}`, ...(conRadar ? [] : ['cms-centro-sin-radar']), ...(conRadar && !radarInstitucionalAbierto ? ['cms-centro-radar-cerrado'] : []), ...(area === 'control' ? [] : ['cms-centro-area'])])
    centro.appendChild(principal)
    if (conRadar) centro.appendChild(radar)
    seccion.appendChild(centro)

    const contexto = elemento('section', ['cms-contexto'])
    contexto.append(
      elemento('h3', [], 'Organización'),
      elemento('p', [], `${datos.equipos.length} equipos activos · ${datos.proyectos.length} proyectos en curso`),
      elemento('p', ['ayuda'], `Perfil: ${({ administracion: 'Administración', direccion: 'Dirección', coordinacion: 'Coordinación', integrante: 'Integrante', consulta: 'Consulta' })[datos.alcance?.perfil] ?? 'Consulta'}`),
      elemento('p', ['ayuda'], sesion?.nombre ? `Sesión de ${sesion.nombre}` : ''),
    )
    seccion.appendChild(panelPlegableMovil('Organización', 'Equipos y proyectos activos de Aletea.', contexto))
    if (!formularioAbierto && datos.alcance?.puede_gestionar && esVistaMovil() && ['control', 'trabajo', 'agenda'].includes(area)) {
      const crearRapido = boton('Crear', () => { formularioAbierto = 'captura-rapida'; dibujar() }, ['cms-accion-rapida-movil', 'boton-principal'])
      crearRapido.setAttribute('aria-label', 'Crear una tarea, actividad, proyecto o solicitud')
      seccion.appendChild(crearRapido)
    }
    const panelActivo = seccion.querySelector(':scope > .cms-captura')
    if (panelActivo) {
      const accionesPanel = panelActivo.querySelector(':scope > .cms-captura-acciones')
      if (accionesPanel) {
        const contenidoPanel = elemento('div', ['cms-captura-contenido'])
        ;[...panelActivo.children].filter((hijo) => hijo !== accionesPanel).forEach((hijo) => contenidoPanel.appendChild(hijo))
        panelActivo.insertBefore(contenidoPanel, accionesPanel)
        panelActivo.classList.add('cms-captura-con-acciones-fijas')
        const formularioEditable = panelActivo.matches('form') || Boolean(panelActivo.querySelector('form'))
        if (formularioEditable) {
          const estadoCambios = elemento('span', ['cms-cambios-pendientes'], 'Sin cambios pendientes')
          estadoCambios.setAttribute('role', 'status')
          accionesPanel.prepend(estadoCambios)
          const marcarCambios = () => {
            panelActivo.dataset.cambiosSinGuardar = 'true'
            estadoCambios.textContent = 'Cambios sin guardar'
            estadoCambios.classList.add('activo')
          }
          panelActivo.addEventListener('input', marcarCambios)
          panelActivo.addEventListener('change', marcarCambios)
          panelActivo.addEventListener('click', (evento) => {
            const control = evento.target.closest('button')
            if (!control || panelActivo.dataset.cambiosSinGuardar !== 'true' || !/^(Cancelar|Cerrar|Volver)$/i.test(control.textContent.trim())) return
            let confirmaSalida = true
            try { confirmaSalida = window.confirm('Hay cambios sin guardar. ¿Querés salir igualmente?') } catch { /* El entorno de pruebas no implementa diálogos nativos. */ }
            if (!confirmaSalida) {
              evento.preventDefault()
              evento.stopImmediatePropagation()
            }
          }, true)
        }
      }
      identificarCamposCaptura(panelActivo)
      const tituloPanel = panelActivo.querySelector('h3')
      panelActivo.setAttribute('role', 'dialog')
      panelActivo.setAttribute('aria-modal', 'true')
      if (tituloPanel) {
        const idTitulo = `cms-panel-${formularioAbierto}`
        tituloPanel.id = idTitulo
        panelActivo.setAttribute('aria-labelledby', idTitulo)
      }
    }
    ajustarAccionesPorPerfil(seccion)
    raiz.appendChild(seccion)
    raiz.onkeydown = (evento) => {
      if ((evento.metaKey || evento.ctrlKey) && evento.key.toLocaleLowerCase('es') === 'k') {
        evento.preventDefault()
        raiz.querySelector('.cms-busqueda-global input')?.focus()
      }
      if (evento.key === 'Escape' && formularioAbierto) {
        const panelConCambios = raiz.querySelector('.cms-captura[data-cambios-sin-guardar="true"]')
        if (panelConCambios) {
          let confirmaSalida = true
          try { confirmaSalida = window.confirm('Hay cambios sin guardar. ¿Querés cerrar igualmente?') } catch { /* El entorno de pruebas no implementa diálogos nativos. */ }
          if (!confirmaSalida) return
        }
        formularioAbierto = null
        dibujar()
      }
    }
  }

  dibujar()
  cargar()
  const refrescarAlVolver = () => {
    if (document.visibilityState === 'visible' && !formularioAbierto && !guardando) cargar({ silencioso: true })
  }
  document.addEventListener('visibilitychange', refrescarAlVolver)
  window.addEventListener('focus', refrescarAlVolver)
  return {
    redibujar: dibujar,
    destruir() {
      destruida = true
      document.removeEventListener('visibilitychange', refrescarAlVolver)
      window.removeEventListener('focus', refrescarAlVolver)
    },
  }
}
