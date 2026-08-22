import { boton, elemento, icono, vaciar } from './componentes.js'
import { crearSelectorFecha } from './selector-fecha.js'
import { alertasInstitucionalesCms, clasificarTarea, horizonteInstitucionalCms, metricasOperativasCms, requiereSeguimiento, resumenSemanalCms, resumenTablero } from '../modelo/cms.js'
import { evitarCortesHora, fechaDesdeUTC, hoyISO } from '../util/fechas.js'

const HOY = hoyISO
const NOMBRES_AREA = Object.freeze({ familias: 'Familias', deportes: 'Deportes', comunicacion: 'Comunicación', capacitaciones: 'Capacitaciones', finanzas: 'Finanzas', eventos: 'Eventos', administracion: 'Administración' })

export function enlaceWebDesdeTexto(texto) {
  const coincidencia = String(texto || '').match(/https?:\/\/[^\s<>"']+/i)
  if (!coincidencia) return ''
  const candidato = coincidencia[0].replace(/[\]),.;]+$/, '')
  try {
    const url = new URL(candidato)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : ''
  } catch { return '' }
}

export function asistirPegadoEnlace(input, alResultado = () => {}) {
  if (alResultado) input.addEventListener('enlaceasistido', (evento) => alResultado(evento.detail))
  if (input.dataset.pegadoEnlaceAsistido === 'true') return input.aplicarTextoPegadoEnlace
  const aplicar = (texto) => {
    const enlace = enlaceWebDesdeTexto(texto)
    if (!enlace) {
      input.value = ''
      input.setCustomValidity('Pegá el enlace completo que comienza con https://')
      input.dispatchEvent(new CustomEvent('enlaceasistido', { detail: { enlace: '', valido: false } }))
      input.focus()
      return false
    }
    input.value = enlace
    input.setCustomValidity('')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new CustomEvent('enlaceasistido', { detail: { enlace, valido: true } }))
    return true
  }
  input.dataset.pegadoEnlaceAsistido = 'true'
  input.addEventListener('input', () => input.setCustomValidity(''))
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
    throw new Error(datos.error || 'No se pudieron cargar los datos institucionales.')
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
  if (!fecha) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'short' }).format(new Date(`${fecha}T00:00:00`))
}

function fechaHoraHumana(fecha) {
  if (!fecha) return 'Sin fecha'
  return evitarCortesHora(new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Montevideo' })
    .format(fechaDesdeUTC(fecha)))
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
  atrasadas: { titulo: 'Tareas atrasadas', descripcion: 'Revisá lo que venció y definí el próximo paso.' },
  proximas: { titulo: 'Tareas próximas', descripcion: 'Lo que necesita atención durante los próximos siete días.' },
  bloqueadas: { titulo: 'Tareas bloqueadas', descripcion: 'Asuntos que necesitan destrabar una decisión, recurso o respuesta.' },
  seguimiento: { titulo: 'Seguimientos pendientes', descripcion: 'Tareas cuya fecha de seguimiento ya llegó.' },
  'sin-responsable': { titulo: 'Tareas sin responsable', descripcion: 'Asigná una persona o equipo para que cada asunto tenga seguimiento.' },
  espera: { titulo: 'Esperando respuesta', descripcion: 'Tareas que dependen de una respuesta externa o interna.' },
  todas: { titulo: 'Todo el trabajo abierto', descripcion: 'Tareas, solicitudes y seguimientos que siguen en curso.' },
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
  // El servidor reemplaza este valor al cargar. Mientras tanto no inferimos un
  // perfil restrictivo de una respuesta aún ausente, porque la autorización
  // efectiva siempre está en la API y la pantalla también se usa con fixtures.
  let datos = { alcance: { perfil: 'coordinacion', equipos: [], puede_gestionar: true }, tareas: [], metricasTareas: [], proyectos: [], equipos: [], responsables: [], responsabilidades: [], reuniones: [], decisiones: [], documentos: [], entradas: [], formularios: [], alianzas: [], programas: [], eventos: [], plantillas: [], riesgos: [], hitos: [], gastos: [], notificaciones: [], recurrencias: [], automatizaciones: [], alertasPospuestas: [], comunicados: [], conflictos: [], capacidad: [], revisionSemanal: null }
  let cargando = true
  let error = ''
  let formularioAbierto = null
  const claveSeccionesMoviles = `aletea:cms:secciones:${area}`
  let seccionesMovilesAbiertas = new Set()
  try {
    seccionesMovilesAbiertas = new Set(JSON.parse(window.sessionStorage.getItem(claveSeccionesMoviles) || '[]'))
  } catch { /* El estado de lectura es prescindible si el navegador lo bloquea. */ }

  function guardarSeccionesMoviles() {
    try { window.sessionStorage.setItem(claveSeccionesMoviles, JSON.stringify([...seccionesMovilesAbiertas])) } catch { /* Sin almacenamiento, la vista sigue siendo operativa. */ }
  }
  let equipoDeResponsabilidad = null
  let reunionDeDecision = null
  let reunionAEditar = null
  let proyectoAEditar = null
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
  let filtroTrabajo = contexto.filtroTrabajo || 'mias'
  let busquedaTrabajo = ''
  let busquedaGlobal = ''
  let vistaAgenda = 'mes'
  let filtroFormularios = 'todos'
  let modeloRecurrente = null
  let guardando = false
  let filtroDocumentos = { texto: '', tipo: '', sensibilidad: '' }
  let mostrarResumenSemanal = false
  let formularioAEditar = null
  let alianzaAEditar = null
  let programaAEditar = null
  let formularioParaRespuesta = null
  let equipoAEditar = null
  let usuarioCapacidad = null
  let actividadInstitucional = []
  let cargandoActividadInstitucional = false
  let errorActividadInstitucional = ''
  const claveGuiaInicial = `aletea:adopcion:v1:${sesion?.usuario || sesion?.correo || 'cuenta'}`
  let mostrarGuiaInicial = false
  try { mostrarGuiaInicial = !window.localStorage.getItem(claveGuiaInicial) } catch { mostrarGuiaInicial = false }

  function enlaceCompartido(destino, parametros = {}) {
    const url = new URL(window.location.href)
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
      ? 'Priorizá decisiones, riesgos y tareas sin responsable. Las áreas conservan su trabajo propio, pero esta vista muestra lo que puede afectar al conjunto.'
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
    panel.append(elemento('h3', [], 'Cómo se organiza el trabajo'), elemento('p', ['ayuda'], 'Un mismo recorrido para toda Aletea: información, decisión, tarea, responsable, fecha y seguimiento.'), pasos)
    return panel
  }

  async function cargar() {
    cargando = true; error = ''; dibujar()
    try {
      datos = { ...datos, ...(await pedir('/api/cms/tablero')) }
      alCambiarNotificaciones(datos.notificaciones.filter((fila) => !fila.leida_en).length)
      if (tareaInicial) {
        const idInicial = tareaInicial
        tareaInicial = null
        contextoTarea = await pedir(`/api/cms/tareas/${idInicial}/contexto`)
        formularioAbierto = 'contexto-tarea'
      }
      if (datos.alcance?.perfil === 'administracion') await cargarActividadInstitucional()
      else actividadInstitucional = []
    } catch (fallo) { error = fallo.message } finally { cargando = false; guardando = false; dibujar() }
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
    titulo.setAttribute('aria-label', tarea ? 'Título de la tarea' : 'Nueva tarea'); titulo.value = tarea?.titulo || ''
    const descripcion = areaCms('Contexto, materiales o siguiente paso', 'Descripción de la tarea')
    descripcion.value = tarea?.descripcion || ''
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
    const proyecto = selectorCms([['', 'Sin proyecto'], ...datos.proyectos.map((fila) => [fila.id, fila.titulo])], 'Proyecto')
    const actividad = selectorCms([['', 'Sin actividad relacionada'], ...datos.eventos.filter((fila) => fila.estado === 'planificado').map((fila) => [fila.id, `${fechaHoraHumana(fila.fecha_hora)}: ${fila.titulo}`])], 'Actividad relacionada')
    const responsable = selectorCms([['', 'Sin responsable'], ...datos.responsables.map((fila) => [fila.correo, fila.nombre || fila.correo])], 'Responsable')
    const estado = selectorCms(OPCIONES_ESTADO_TAREA, 'Estado de la tarea')
    const equipoContextual = equipoFundacionalCms(datos.equipos, area)
    proyecto.value = tarea?.proyecto_id || proyectoPreseleccionado || ''
    const proyectoContextual = datos.proyectos.find((fila) => fila.id === proyecto.value)
    equipo.value = tarea?.equipo_id || proyectoContextual?.equipo_id || equipoContextual?.id || ''; actividad.value = tarea?.evento_id || actividadPreseleccionada || ''; responsable.value = tarea?.responsable_correo || proyectoContextual?.responsable_correo || ''; prioridad.value = tarea?.prioridad || 'normal'; estado.value = tarea?.estado || 'pendiente'
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
      campoCms('Equipo', equipo), campoCms('Proyecto', proyecto), campoCms('Actividad relacionada', actividad), campoCms('Responsable', responsable),
    )
    const datosAdicionales = elemento('details', ['cms-datos-adicionales'])
    datosAdicionales.open = tarea?.esfuerzo_horas !== null && tarea?.esfuerzo_horas !== undefined && tarea?.esfuerzo_horas !== ''
    datosAdicionales.append(
      elemento('summary', ['cms-datos-adicionales-titulo'], 'Datos adicionales'),
      elemento('div', ['cms-datos-adicionales-contenido'], campoCms('Esfuerzo estimado', esfuerzo, 'Horas de trabajo activo que probablemente requiere la tarea. No es el tiempo hasta la fecha límite.')),
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
      ;[titulo, descripcion, tipo, prioridad, esfuerzo, fecha, equipo, proyecto, actividad, responsable].forEach((control) => { control.disabled = true })
    }
    const acciones = elemento('div', ['cms-captura-acciones'])
    const cancelar = boton('Cancelar', () => { formularioAbierto = null; tareaAEditar = null; actividadPreseleccionada = null; tipoNuevaTarea = 'tarea'; dibujar() })
    const guardar = boton(tarea ? 'Guardar tarea' : 'Agregar', async () => {
      if (!forma.reportValidity() || guardando) return
      guardando = true; guardar.disabled = true
      try {
        const cuerpo = esIntegrante
          ? { estado: estado.value, fecha_seguimiento: fechaSeguimiento.value || null }
          : { titulo: titulo.value, descripcion: descripcion.value, tipo: tipo.value, estado: estado.value, prioridad: prioridad.value, esfuerzo_horas: esfuerzo.value, fecha_limite: fecha.value || null, fecha_seguimiento: fechaSeguimiento.value || null, equipo_id: equipo.value || null, proyecto_id: proyecto.value || null, evento_id: actividad.value || null, responsable_correo: responsable.value || null }
        const respuesta = await pedir(tarea ? `/api/cms/tareas/${tarea.id}` : '/api/cms/tareas', { method: tarea ? 'PATCH' : 'POST', body: JSON.stringify(cuerpo) })
        formularioAbierto = null; tareaAEditar = null; actividadPreseleccionada = null; tipoNuevaTarea = 'tarea'
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
    forma.append(titulo, descripcion, detalles, datosAdicionales, ayudaActividad, ayudaSolicitud, acciones)
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
      Number(tarea.dependencias_pendientes || 0) ? `${tarea.dependencias_pendientes} dependencia${Number(tarea.dependencias_pendientes) === 1 ? '' : 's'} pendiente${Number(tarea.dependencias_pendientes) === 1 ? '' : 's'}` : '',
    ].filter(Boolean).join(' · ')
    const acciones = elemento('div', ['cms-tarea-acciones'])
    if (!['completada', 'cancelada'].includes(tarea.estado) && (datos.alcance?.puede_gestionar || datos.alcance?.perfil === 'integrante')) {
      acciones.appendChild(boton('Completar tarea', async () => {
        if (guardando) return
        guardando = true
        try { await pedir(`/api/cms/tareas/${tarea.id}`, { method: 'PATCH', body: JSON.stringify({ estado: 'completada' }) }); await cargar() } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
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
    encabezado.append(textoEncabezado, boton('Cerrar', () => { formularioAbierto = null; contextoTarea = null; dibujar() }))
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
    seccion.append(encabezado, bloqueDependencias, bloqueDependientes, bloqueComentarios)
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
            const [fecha = '', tiempo = ''] = String(valor || '').split('T')
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
    if (tipo === 'url') asistirPegadoEnlace(input)
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
      boton('Cancelar', () => { formularioAbierto = null; equipoDeResponsabilidad = null; equipoAEditar = null; reunionDeDecision = null; reunionAEditar = null; proyectoAEditar = null; eventoAEditar = null; tareaAEditar = null; alianzaAEditar = null; programaAEditar = null; tipoNuevaTarea = 'tarea'; dibujar() }),
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
    const titulo = inputCms('Ej. Escuela de familias 2026', 'Nombre del proyecto'); titulo.required = true; titulo.maxLength = 180; titulo.value = proyecto?.titulo || ''
    const objetivo = inputCms('Qué busca lograr este proyecto', 'Objetivo del proyecto')
    objetivo.maxLength = 400; objetivo.value = proyecto?.objetivo || ''
    const detalles = elemento('div', ['cms-captura-detalles'])
    const programa = selectorCms([['', 'Sin programa'], ...datos.programas.map((fila) => [fila.id, fila.nombre])], 'Programa del proyecto')
    const equipo = selectorCms([['', 'Sin equipo'], ...datos.equipos.map((fila) => [fila.id, fila.nombre])], 'Equipo del proyecto')
    const responsable = selectorCms([['', 'Sin responsable'], ...datos.responsables.map((fila) => [fila.correo, fila.nombre || fila.correo])], 'Responsable del proyecto')
    const prioridad = selectorCms([['normal', 'Prioridad normal'], ['alta', 'Prioridad alta'], ['urgente', 'Urgente'], ['baja', 'Prioridad baja']], 'Prioridad del proyecto')
    const estado = selectorCms([['borrador', 'Borrador'], ['en_marcha', 'En marcha'], ['en_pausa', 'En pausa'], ['cerrado', 'Cerrado']], 'Estado del proyecto')
    const fechaInicio = inputCms('', 'Fecha de inicio', 'date')
    const fechaFin = inputCms('', 'Fecha objetivo', 'date')
    const presupuesto = inputCms('Presupuesto estimado en UYU', 'Presupuesto del proyecto', 'number'); presupuesto.min = '0'; presupuesto.step = '1'
    const notas = areaCms('Riesgos, dependencias o próximos hitos', 'Notas del proyecto')
    const equipoContextual = equipoFundacionalCms(datos.equipos, area)
    programa.value = proyecto?.programa_id || ''; equipo.value = proyecto?.equipo_id || equipoContextual?.id || ''; responsable.value = proyecto?.responsable_correo || ''; prioridad.value = proyecto?.prioridad || 'normal'; estado.value = proyecto?.estado || 'en_marcha'; fechaInicio.value = proyecto?.fecha_inicio || ''; fechaFin.value = proyecto?.fecha_fin || ''; presupuesto.value = proyecto?.presupuesto ?? ''; notas.value = proyecto?.notas || ''
    detalles.append(campoCms('Programa del proyecto', programa, 'Una línea de trabajo estable que agrupa proyectos relacionados. Elegí Sin programa si el proyecto es independiente.'), equipo, responsable, estado, prioridad, fechaInicio, fechaFin, presupuesto)
    forma.append(elemento('h3', [], proyecto ? `Editar proyecto: ${proyecto.titulo}` : 'Nuevo proyecto'), titulo, objetivo, detalles, elemento('label', ['cms-etiqueta-campo'], 'Notas y próximos hitos'), notas, accionesFormulario(() => {
      if (!forma.reportValidity() || guardando) return
      guardando = true
      const cuerpo = { titulo: titulo.value, objetivo: objetivo.value, programa_id: programa.value || null, equipo_id: equipo.value || null, responsable_correo: responsable.value || null, estado: estado.value, prioridad: prioridad.value, fecha_inicio: fechaInicio.value || null, fecha_fin: fechaFin.value || null, presupuesto: presupuesto.value, notas: notas.value }
      pedir(proyecto ? `/api/cms/proyectos/${proyecto.id}` : '/api/cms/proyectos', { method: proyecto ? 'PATCH' : 'POST', body: JSON.stringify(cuerpo) })
        .then(async (respuesta) => {
          formularioAbierto = null; proyectoAEditar = null
          await cargar()
          if (!proyecto) confirmacion = {
            titulo: 'Proyecto creado',
            detalle: `${titulo.value} quedó en ${datos.equipos.find((fila) => fila.id === equipo.value)?.nombre || 'la estructura institucional'}. Ahora podés agregar el primer trabajo o material.`,
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
        ? (enlace.includes('drive.google.com') ? 'Enlace de Google Drive reconocido.' : 'Enlace reconocido.')
        : 'No encontramos un enlace válido. Copialo nuevamente desde Google Drive.'
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
    const proyecto = selectorCms([['', 'Sin proyecto'], ...datos.proyectos.map((fila) => [fila.id, fila.titulo])], 'Proyecto del documento')
    proyecto.value = proyectoPreseleccionado || ''
    const proyectoContextual = datos.proyectos.find((fila) => fila.id === proyecto.value)
    equipo.value = proyectoContextual?.equipo_id || ''
    const detalles = elemento('div', ['cms-captura-detalles']); detalles.append(tipo, sensibilidad, equipo, proyecto)
    forma.append(elemento('h3', [], 'Agregar recurso o documento'), elemento('p', ['ayuda'], 'Pegá un enlace de Canva, Drive u otra herramienta. El recurso quedará disponible dentro del proyecto y la biblioteca.'), titulo, ingresoEnlace, detalles, elemento('label', ['cms-etiqueta-campo'], 'Descripción'), descripcion, accionesFormulario(() => {
      if (!forma.reportValidity() || guardando) return; guardando = true
      pedir('/api/cms/documentos', { method: 'POST', body: JSON.stringify({ titulo: titulo.value, url: url.value, descripcion: descripcion.value, tipo: tipo.value, sensibilidad: sensibilidad.value, equipo_id: equipo.value || null, proyecto_id: proyecto.value || null }) })
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
    const fechaPropuesta = inputCms('', 'Fecha propuesta de actividad o evento', 'datetime-local')
    const fechaPropuestaCampo = fechaPropuesta
    const equipo = selectorCms([['', 'Sin equipo'], ...datos.equipos.map((fila) => [fila.id, fila.nombre])], 'Equipo de la entrada')
    const equipoSolicitante = selectorCms([['', 'Sin equipo solicitante'], ...datos.equipos.map((fila) => [fila.id, fila.nombre])], 'Equipo que realiza el pedido')
    const prioridad = selectorCms([['baja', 'Prioridad baja'], ['normal', 'Prioridad normal'], ['alta', 'Prioridad alta'], ['urgente', 'Prioridad urgente']], 'Prioridad del pedido'); prioridad.value = 'normal'
    const proyecto = selectorCms([['', 'Sin proyecto'], ...datos.proyectos.map((fila) => [fila.id, fila.titulo])], 'Proyecto de la entrada')
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
    const abrir = (destino) => {
      actividadPreseleccionada = null
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
    seccion.append(
      elemento('h3', [], 'Captura rápida'),
      elemento('p', ['ayuda'], 'Elegí el destino antes de escribir: así una idea, pedido o acuerdo nace en el módulo que puede seguirlo. Las decisiones se registran desde una reunión para conservar su contexto.'),
      opciones,
      elemento('div', ['cms-captura-acciones'], boton('Cerrar', () => { formularioAbierto = null; dibujar() })),
    )
    return seccion
  }

  function formularioEvento(evento = null) {
    const forma = document.createElement('form'); forma.className = 'cms-captura cms-captura-evento'
    const titulo = inputCms('Ej. Taller de convivencia y juego', 'Título de la actividad'); titulo.required = true; titulo.maxLength = 180; titulo.value = evento?.titulo || ''
    const tipo = selectorCms(TIPOS_EVENTO, 'Tipo de fecha institucional'); tipo.value = evento?.tipo || 'actividad'
    const descripcion = areaCms('Objetivo, público o materiales a preparar', 'Descripción')
    const inicio = inputCms('', 'Inicio de la actividad', 'datetime-local'); inicio.required = true; inicio.value = evento?.fecha_hora || ''
    const fin = inputCms('', 'Finalización de la actividad', 'datetime-local')
    const lugar = inputCms('Ej. Sede de Aletea', 'Lugar de la actividad'); lugar.maxLength = 180; lugar.value = evento?.lugar || ''
    const equipo = selectorCms([['', 'Sin equipo'], ...datos.equipos.map((fila) => [fila.id, fila.nombre])], 'Equipo de la actividad')
    const proyecto = selectorCms([['', 'Sin proyecto'], ...datos.proyectos.map((fila) => [fila.id, fila.titulo])], 'Proyecto de la actividad')
    const responsable = selectorCms([['', 'Sin responsable'], ...datos.responsables.map((fila) => [fila.correo, fila.nombre || fila.correo])], 'Responsable de la actividad')
    const estado = selectorCms([['planificado', 'Planificado'], ['realizado', 'Realizado'], ['cancelado', 'Cancelado']], 'Estado de la actividad')
    const frecuencia = selectorCms([['', 'No se repite'], ['semanal', 'Cada semana'], ['quincenal', 'Cada 2 semanas'], ['mensual', 'Cada mes']], 'Repetición de la actividad')
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
    descripcion.value = evento?.descripcion || ''; fin.value = evento?.fecha_fin || ''; equipo.value = evento?.equipo_id || proyectoContextual?.equipo_id || ''; responsable.value = evento?.responsable_correo || proyectoContextual?.responsable_correo || ''; estado.value = evento?.estado || 'planificado'
    const detalles = elemento('div', ['cms-captura-detalles']); detalles.append(tipo, inicio, fin, lugar, equipo, proyecto, responsable, estado)
    if (!evento) detalles.append(campoCms('Repetición', frecuencia, 'Crea todas las fechas de la serie en una sola acción. Después podés editar cada actividad por separado.'), repetirHasta)
    forma.append(elemento('h3', [], evento ? `Editar actividad: ${evento.titulo}` : 'Nueva actividad o evento'), elemento('p', ['ayuda'], 'Agendá actividades, reuniones, cursos, publicaciones, vencimientos, pagos, renovaciones, trámites, certificaciones o asambleas.'), titulo, detalles, elemento('p', ['ayuda'], 'Agregá una finalización cuando corresponda para detectar cruces de agenda.'), elemento('label', ['cms-etiqueta-campo'], 'Descripción'), descripcion, accionesFormulario(() => {
      if (!forma.reportValidity() || guardando) return; guardando = true
      pedir(evento ? `/api/cms/eventos/${evento.id}` : '/api/cms/eventos', { method: evento ? 'PATCH' : 'POST', body: JSON.stringify({ titulo: titulo.value, tipo: tipo.value, descripcion: descripcion.value, fecha_hora: inicio.value, fecha_fin: fin.value || null, lugar: lugar.value, equipo_id: equipo.value || null, proyecto_id: proyecto.value || null, responsable_correo: responsable.value || null, estado: estado.value, frecuencia_evento: frecuencia.value || null, repetir_hasta: repetirHasta.value || null }) })
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
    titulo.required = true; titulo.maxLength = 180
    const objetivo = inputCms('Qué necesitan resolver o alinear', 'Objetivo de la reunión')
    objetivo.maxLength = 400
    const fechaHora = inputCms('', 'Fecha y hora de la reunión', 'datetime-local')
    fechaHora.required = true
    const lugar = inputCms('Presencial, videollamada o lugar', 'Lugar de la reunión')
    lugar.maxLength = 180
    const equipo = selectorCms([['', 'Sin equipo'], ...datos.equipos.map((fila) => [fila.id, fila.nombre])], 'Equipo de la reunión')
    const proyecto = selectorCms([['', 'Sin proyecto'], ...datos.proyectos.map((fila) => [fila.id, fila.titulo])], 'Proyecto de la reunión')
    const preparacion = areaCms('Temas, datos o materiales a preparar', 'Preparación de la reunión')
    const frecuencia = selectorCms([['', 'No se repite'], ['semanal', 'Cada semana'], ['quincenal', 'Cada 2 semanas'], ['mensual', 'Cada mes']], 'Repetición de la reunión')
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
    detalles.append(fechaHora, lugar, equipo, proyecto, campoCms('Repetición', frecuencia, 'Crea todas las reuniones de la serie. La minuta y las decisiones se registran por separado en cada fecha.'), repetirHasta)
    forma.append(
      elemento('h3', [], 'Nueva reunión'),
      titulo,
      objetivo,
      detalles,
      preparacion,
      accionesFormulario(() => {
        if (!forma.reportValidity() || guardando) return
        guardando = true
        pedir('/api/cms/reuniones', { method: 'POST', body: JSON.stringify({ titulo: titulo.value, objetivo: objetivo.value, fecha_hora: fechaHora.value, lugar: lugar.value, equipo_id: equipo.value || null, proyecto_id: proyecto.value || null, preparacion: preparacion.value, frecuencia_reunion: frecuencia.value || null, repetir_hasta: repetirHasta.value || null }) })
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
    const proyecto = selectorCms([['', 'Sin proyecto'], ...datos.proyectos.map((fila) => [fila.id, fila.titulo])], 'Proyecto de la reunión'); proyecto.value = reunion.proyecto_id || ''
    const estado = selectorCms(Object.entries(TEXTO_ESTADO_REUNION), 'Estado de la reunión'); estado.value = reunion.estado || 'planificada'
    const preparacion = areaCms('Temas, datos o materiales a preparar', 'Preparación de la reunión'); preparacion.value = reunion.preparacion || ''
    const minuta = areaCms('Qué pasó, quién estuvo y qué se acordó', 'Minuta de la reunión'); minuta.value = reunion.minuta || ''
    const resumen = areaCms('Resumen para encontrar esta reunión más adelante', 'Resumen de la reunión'); resumen.value = reunion.resumen || ''
    const detalles = elemento('div', ['cms-captura-detalles'])
    detalles.append(fechaHora, lugar, equipo, proyecto, estado)
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
        pedir(`/api/cms/reuniones/${reunion.id}`, { method: 'PATCH', body: JSON.stringify({ titulo: titulo.value, objetivo: objetivo.value, fecha_hora: fechaHora.value, lugar: lugar.value, equipo_id: equipo.value || null, proyecto_id: proyecto.value || null, estado: estado.value, preparacion: preparacion.value, minuta: minuta.value, resumen: resumen.value }) })
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
      encabezadoEquipo.appendChild(elemento('strong', [], equipo.nombre))
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
    agregarVinculo('Actividades', (contexto.eventos || []).filter((evento) => evento.proyecto_id === proyecto.id), (evento) => tarjetaVinculo(evento.titulo, [evento.estado, fechaHoraHumana(evento.fecha_hora), evento.lugar].filter(Boolean).join(' · '), evento.descripcion), { etiqueta: 'Agregar actividad', alPulsar: () => { proyectoPreseleccionado = proyecto.id; formularioAbierto = 'evento'; dibujar() } })
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
    fsb.append(textoFsb, boton('Abrir Fútbol sin Barreras', () => alIrA('operacion'))); programas.append(encabezado, fsb)
    if (datos.programas.length) datos.programas.forEach((programa) => {
      const tarjeta = elemento('article', ['cms-programa']); const texto = elemento('div', [])
      texto.append(elemento('p', ['cms-programa-sobrelinea'], programa.estado.replace('_', ' ')), elemento('strong', [], programa.nombre), elemento('span', [], [programa.descripcion, programa.equipo_nombre].filter(Boolean).join(' · ') || 'Sin descripción aún.'))
      const acciones = elemento('div', ['cms-reunion-acciones'])
      if (datos.alcance?.puede_gestionar) acciones.appendChild(boton('Editar programa', () => { programaAEditar = programa.id; formularioAbierto = 'editar-programa'; dibujar() }))
      tarjeta.append(texto, acciones); programas.appendChild(tarjeta)
    })
    return programas
  }

  function panelFlujoProyectos() {
    const seccion = elemento('section', ['cms-flujo-proyectos'])
    const encabezado = elemento('div', ['cms-seccion-encabezado'])
    const texto = elemento('div', [])
    texto.append(
      elemento('h3', [], 'Flujo de proyectos'),
      elemento('p', ['ayuda'], 'Cada proyecto reúne propósito, hitos, riesgos, presupuesto, tareas, actividades, decisiones y documentos en un mismo recorrido.'),
    )
    encabezado.append(texto, boton('Nuevo proyecto', () => { formularioAbierto = 'proyecto'; proyectoAEditar = null; dibujar() }))
    const flujo = elemento('div', ['cms-flujo-etapas'])
    const etapas = [
      ['Definir', datos.proyectos.filter((fila) => ['borrador', 'planificado'].includes(fila.estado)).length, 'Propósito, equipo y responsable'],
      ['Ejecutar', datos.proyectos.filter((fila) => ['en_marcha', 'activo'].includes(fila.estado)).length, 'Hitos, tareas y actividades'],
      ['Revisar', datos.proyectos.filter((fila) => datos.riesgos.some((riesgo) => riesgo.proyecto_id === fila.id && riesgo.estado !== 'mitigado')).length, 'Riesgos y decisiones abiertas'],
      ['Cerrar', datos.proyectos.filter((fila) => ['finalizado', 'cerrado'].includes(fila.estado)).length, 'Resultados y memoria'],
    ]
    etapas.forEach(([titulo, cantidad, detalle]) => {
      const etapa = elemento('article', ['cms-flujo-etapa'])
      etapa.append(elemento('strong', [], String(cantidad)), elemento('span', [], titulo), elemento('small', [], detalle))
      flujo.appendChild(etapa)
    })
    const lista = elemento('div', ['cms-flujo-proyectos-lista'])
    if (datos.proyectos.length) datos.proyectos.slice(0, 6).forEach((proyecto) => {
      const hitos = Number(proyecto.hitos_total || 0)
      const completados = Number(proyecto.hitos_completados || 0)
      const porcentaje = hitos ? Math.round((completados / hitos) * 100) : 0
      const fila = elemento('article', ['cms-flujo-proyecto'])
      const barra = elemento('span', ['cms-flujo-avance'])
      barra.style.setProperty('--avance-proyecto', `${Math.min(100, porcentaje)}%`)
      fila.append(
        elemento('strong', [], proyecto.titulo),
        elemento('span', [], [proyecto.equipo_nombre || 'Sin equipo', TEXTO_ESTADO_PROYECTO[proyecto.estado] || proyecto.estado || 'En definición'].filter(Boolean).join(' · ')),
        barra,
        elemento('small', [], hitos ? `${completados} de ${hitos} hitos, ${porcentaje}%` : 'Agregá hitos para medir el avance'),
        boton('Abrir seguimiento', () => abrirSeguimientoProyecto(proyecto.id)),
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

  function panelEntradas() {
    const seccion = elemento('section', ['cms-entradas'])
    const encabezado = elemento('div', ['cms-seccion-encabezado']); const texto = elemento('div', [])
    texto.append(elemento('h3', [], 'Bandeja de entradas'), elemento('p', ['ayuda'], 'Voluntariados, inscripciones, propuestas y pedidos quedan derivados a una tarea para no perder seguimiento.'))
    encabezado.append(texto, boton('Registrar entrada', () => { formularioAbierto = formularioAbierto === 'entrada' ? null : 'entrada'; dibujar() }))
    const lista = elemento('div', ['cms-entradas-lista'])
    if (datos.entradas.length) datos.entradas.forEach((entrada) => {
      const tarjeta = elemento('article', ['cms-entrada'])
      const acciones = elemento('div', ['cms-entrada-acciones'])
      if (['actividad', 'evento'].includes(entrada.tipo) && entrada.fecha_propuesta && !entrada.evento_id) acciones.appendChild(boton('Preparar en agenda', async () => {
        if (guardando) return
        guardando = true
        try { await pedir(`/api/cms/entradas/${entrada.id}/agendar`, { method: 'POST' }); await cargar() } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
      }, ['boton-principal']))
      if (entrada.estado !== 'cerrada') acciones.appendChild(boton('Cerrar entrada', async () => {
        if (guardando) return
        guardando = true
        try { await pedir(`/api/cms/entradas/${entrada.id}`, { method: 'PATCH', body: JSON.stringify({ estado: 'cerrada' }) }); await cargar() } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
      }))
      let respuestas = {}
      try { respuestas = JSON.parse(entrada.respuestas_json || '{}') } catch { /* Una respuesta histórica puede no tener campos configurables. */ }
      const resumenRespuestas = Object.entries(respuestas).filter(([, valor]) => valor !== '' && valor !== false).map(([clave, valor]) => elemento('span', ['cms-entrada-respuesta'], `${clave.replaceAll('_', ' ')}: ${valor === true ? 'Sí' : valor}`))
      tarjeta.append(elemento('strong', [], entrada.nombre), elemento('span', ['cms-proyecto-meta'], [entrada.tipo, entrada.estado, entrada.equipo_solicitante_nombre && `De ${entrada.equipo_solicitante_nombre}`, entrada.equipo_nombre || entrada.proyecto_titulo, entrada.tipo === 'pedido' && `Prioridad ${entrada.prioridad}`].filter(Boolean).join(' · ')), entrada.fecha_propuesta ? elemento('span', ['cms-entrada-tarea'], `Fecha propuesta: ${fechaHoraHumana(entrada.fecha_propuesta)}`) : document.createDocumentFragment(), entrada.detalle ? elemento('span', ['cms-proyecto-notas'], entrada.detalle) : document.createDocumentFragment(), ...resumenRespuestas, entrada.tarea_titulo ? elemento('span', ['cms-entrada-tarea'], `Tarea: ${entrada.tarea_titulo}`) : document.createDocumentFragment(), acciones)
      lista.appendChild(tarjeta)
    })
    else lista.appendChild(elemento('p', ['ayuda'], 'Todavía no hay entradas para revisar. Registrá la primera o conectá este flujo a un formulario público más adelante.'))
    seccion.append(encabezado, lista); return seccion
  }

  function formularioFormulario(formulario = null) {
    const forma = document.createElement('form'); forma.className = 'cms-captura'
    forma.appendChild(elemento('h3', [], formulario ? `Editar formulario: ${formulario.titulo}` : 'Nuevo formulario'))
    const titulo = inputCms('Ej. Inscripción a Fútbol sin Barreras', 'Título del formulario'); titulo.required = true; titulo.maxLength = 180; titulo.value = formulario?.titulo || ''
    const descripcion = areaCms('Explicá brevemente para qué sirve este formulario.', 'Descripción'); descripcion.value = formulario?.descripcion || ''
    const tipo = selectorCms([['voluntariado', 'Voluntariado'], ['inscripcion', 'Inscripción'], ['actividad', 'Propuesta de actividad'], ['evento', 'Propuesta de evento'], ['pedido', 'Pedido a un equipo'], ['propuesta', 'Propuesta institucional']], 'Tipo de formulario'); tipo.value = formulario?.tipo || 'voluntariado'
    const visibilidad = selectorCms([['interna', 'Solo interna'], ['publica', 'Pública, con enlace para compartir']], 'Visibilidad del formulario'); visibilidad.value = formulario?.visibilidad || 'interna'
    const estado = selectorCms([['activa', 'Activa'], ['cerrada', 'Cerrada']], 'Estado del formulario'); estado.value = formulario?.estado || 'activa'
    const equipo = selectorCms([['', 'Sin equipo'], ...datos.equipos.map((fila) => [fila.id, fila.nombre])], 'Equipo destinatario'); equipo.value = formulario?.equipo_id || ''
    const equipoSolicitante = selectorCms([['', 'Sin equipo solicitante'], ...datos.equipos.map((fila) => [fila.id, fila.nombre])], 'Equipo solicitante'); equipoSolicitante.value = formulario?.equipo_solicitante_id || ''
    const prioridad = selectorCms([['baja', 'Prioridad baja'], ['normal', 'Prioridad normal'], ['alta', 'Prioridad alta'], ['urgente', 'Prioridad urgente']], 'Prioridad del pedido'); prioridad.value = formulario?.prioridad || 'normal'
    const proyecto = selectorCms([['', 'Sin proyecto'], ...datos.proyectos.map((fila) => [fila.id, fila.titulo])], 'Proyecto'); proyecto.value = formulario?.proyecto_id || ''
    let campos = []
    try { campos = JSON.parse(formulario?.campos_json || '[]') } catch { campos = [] }
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
        const quitar = boton('Quitar campo', () => { campos.splice(indice, 1); dibujarCampos() })
        fila.append(elemento('strong', [], `Campo ${indice + 1}`), etiqueta, tipoCampo, opciones, ayuda, requeridoCaja, condicion, valorCondicion, quitar)
        listaCampos.appendChild(fila)
      })
      if (!campos.length) listaCampos.appendChild(elemento('p', ['ayuda'], 'Todavía no agregaste preguntas propias. Nombre, contacto y mensaje se incluyen siempre.'))
    }
    const agregarCampo = boton('Agregar pregunta', () => { if (campos.length >= 20) return; campos.push({ clave: `campo_${campos.length + 1}`, etiqueta: '', tipo: 'texto', requerido: false, ayuda: '', opciones: [], mostrar_si: null }); dibujarCampos() })
    configurador.append(elemento('h4', [], 'Preguntas configurables'), elemento('p', ['ayuda'], 'Agregá hasta 20 preguntas. Una pregunta condicional puede depender de una respuesta anterior.'), listaCampos, agregarCampo)
    dibujarCampos()
    const aviso = elemento('p', ['ayuda'], 'Un formulario público solo pide nombre, contacto y mensaje. Si elegís un equipo, la tarea se asigna automáticamente a su coordinación o referente. Las respuestas nunca crean perfiles de personas automáticamente.')
    const revisarPedido = () => { const esPedido = tipo.value === 'pedido'; const esPropuesta = tipo.value === 'propuesta'; equipo.required = esPedido || esPropuesta; equipoSolicitante.required = esPedido; equipoSolicitante.hidden = !esPedido; prioridad.hidden = !esPedido; aviso.textContent = esPropuesta ? 'Una propuesta pide objetivo, pasos, recursos y personas necesarias. Se deriva automáticamente al equipo elegido para su evaluación.' : esPedido ? 'Un pedido necesita equipo solicitante, equipo destinatario y prioridad. Cada respuesta se asigna automáticamente a la coordinación o referente del equipo destinatario.' : 'Un formulario público solo pide nombre, contacto y mensaje. Si elegís un equipo, la tarea se asigna automáticamente a su coordinación o referente. Las respuestas nunca crean perfiles de personas automáticamente.' }
    tipo.addEventListener('change', revisarPedido); revisarPedido()
    const acciones = elemento('div', ['cms-captura-acciones'])
    const cancelar = boton('Cancelar', () => { formularioAbierto = null; formularioAEditar = null; dibujar() })
    const guardar = boton(formulario ? 'Guardar formulario' : 'Crear formulario', async () => {
      if (guardando || !forma.reportValidity()) return
      guardando = true
      const datosFormulario = { titulo: titulo.value, descripcion: descripcion.value, tipo: tipo.value, visibilidad: visibilidad.value, estado: estado.value, equipo_id: equipo.value || null, equipo_solicitante_id: equipoSolicitante.value || null, prioridad: prioridad.value, proyecto_id: proyecto.value || null, campos }
      try { await pedir(formulario ? `/api/cms/formularios/${formulario.id}` : '/api/cms/formularios', { method: formulario ? 'PATCH' : 'POST', body: JSON.stringify(datosFormulario) }); formularioAbierto = null; formularioAEditar = null; await cargar() } catch (fallo) { error = fallo.message; guardando = false; dibujar() }
    }, ['boton-principal'])
    acciones.append(cancelar, guardar)
    forma.append(titulo, descripcion, tipo, visibilidad, estado, equipo, equipoSolicitante, prioridad, proyecto, configurador, aviso, acciones)
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
    encabezado.append(texto, boton('Nuevo formulario', () => { formularioAbierto = 'formulario'; formularioAEditar = null; dibujar() }))
    const filtros = elemento('div', ['cms-vistas-guardadas'])
    const opcionesFiltro = [['todos', 'Todos'], ['publicos', 'Públicos'], ['internos', 'Internos'], ['activos', 'Activos'], ['cerrados', 'Cerrados']]
    opcionesFiltro.forEach(([valor, etiqueta]) => {
      const control = boton(etiqueta, () => { filtroFormularios = valor; dibujar() }, ['cms-filtro'])
      control.setAttribute('aria-pressed', String(filtroFormularios === valor))
      if (filtroFormularios === valor) control.classList.add('activa')
      filtros.appendChild(control)
    })
    const formularios = datos.formularios.filter((formulario) => {
      if (filtroFormularios === 'publicos') return formulario.visibilidad === 'publica'
      if (filtroFormularios === 'internos') return formulario.visibilidad !== 'publica'
      if (filtroFormularios === 'activos') return formulario.estado === 'activa'
      if (filtroFormularios === 'cerrados') return formulario.estado !== 'activa'
      return true
    })
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
      acciones.append(boton('Registrar respuesta', () => { formularioParaRespuesta = formulario.id; formularioAbierto = 'respuesta-formulario'; dibujar() }), boton('Editar', () => { formularioAEditar = formulario.id; formularioAbierto = 'editar-formulario'; dibujar() }))
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
    else lista.appendChild(elemento('p', ['ayuda'], datos.formularios.length ? 'No hay formularios en esta vista.' : 'Todavía no hay formularios. Creá uno interno para ordenar una solicitud recurrente o hacelo público cuando quieras compartirlo.'))
    seccion.append(encabezado, resumen, filtros, lista); return seccion
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
        bloque('Tareas atrasadas', resumen.atrasadas, (tarea) => tarea.titulo, 'No hay tareas atrasadas.'),
        bloque('Próximos vencimientos', resumen.proximas, (tarea) => `${tarea.titulo}${tarea.fecha_limite ? `, ${fechaHumana(tarea.fecha_limite)}` : ''}`, 'No hay vencimientos esta semana.'),
        bloque('Actividades previstas', resumen.actividades, (evento) => `${evento.titulo}, ${fechaHoraHumana(evento.fecha_hora)}`, 'No hay actividades previstas.'),
        bloque('Entradas para revisar', resumen.entradas, (entrada) => `${entrada.nombre}, ${entrada.tipo}`, 'No hay entradas pendientes.'),
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
    texto.append(elemento('h3', [], 'Métricas operativas'), elemento('p', ['ayuda'], 'Una lectura de los últimos 180 días y del trabajo abierto que podés ver. Las muestras se informan para evitar conclusiones engañosas.'))
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
        boton(destino.etiqueta, () => irA(destino.pantalla, destino.contexto)),
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
    const pendientes = datos.notificaciones.filter((fila) => !fila.leida_en)
    seccion.append(
      elemento('h3', [], 'Novedades'),
      elemento('p', ['ayuda'], pendientes.length ? `${pendientes.length} ${pendientes.length === 1 ? 'aviso requiere' : 'avisos requieren'} tu atención. Solo aparecen dentro del gestor institucional.` : 'No hay avisos nuevos. Las notificaciones se mantienen dentro del gestor institucional.'),
    )
    if (!datos.notificaciones.length) return seccion
    const lista = elemento('div', ['cms-notificaciones-lista'])
    datos.notificaciones.slice(0, 8).forEach((notificacion) => {
      const item = elemento('article', ['cms-notificacion', notificacion.leida_en ? 'cms-notificacion-leida' : ''])
      const acciones = elemento('div', ['cms-reunion-acciones'])
      if (notificacion.tarea_id) acciones.appendChild(boton('Abrir tarea', async () => {
        if (!notificacion.leida_en) {
          try { await pedir(`/api/cms/notificaciones/${notificacion.id}`, { method: 'PATCH' }) } catch { /* Abrir la tarea sigue siendo prioritario. */ }
        }
        alIrA('cms-trabajo', { tareaId: notificacion.tarea_id })
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
      const fecha = new Date(evento.fecha_hora)
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
        eventosVisibles.filter((evento) => new Date(evento.fecha_hora).getDate() === dia).slice(0, 3).forEach((evento) => celda.appendChild(elemento('span', ['cms-calendario-evento'], evento.titulo)))
        grilla.appendChild(celda)
      }
      calendario.appendChild(grilla)
      lista.appendChild(calendario)
    }
    if (eventosVisibles.length) eventosVisibles.forEach((evento) => {
      const tarjeta = elemento('article', ['cms-evento'])
      const superior = elemento('div', ['cms-reunion-encabezado'])
      superior.append(elemento('strong', [], evento.titulo), elemento('span', ['cms-estado'], evento.estado === 'realizado' ? 'Realizado' : 'Planificado'))
      const contexto = [TEXTO_TIPO_EVENTO[evento.tipo || 'actividad'], fechaHoraHumana(evento.fecha_hora), evento.fecha_fin ? `hasta ${fechaHoraHumana(evento.fecha_fin)}` : '', evento.lugar, evento.equipo_nombre, evento.proyecto_titulo, evento.responsable_nombre || evento.responsable_correo].filter(Boolean).join(' · ')
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
      boton('Abrir operación y personas', () => irA('operacion'), ['cms-contexto-personas-accion']),
    )
    return panel
  }

  function panelConflictosAgenda() {
    if (!datos.conflictos.length) return document.createDocumentFragment()
    const seccion = elemento('section', ['cms-conflictos'])
    seccion.append(elemento('h3', [], 'Conflictos de agenda'), elemento('p', ['ayuda'], 'Estas actividades se superponen y comparten lugar, responsable o equipo. Revisalas antes de confirmar la coordinación.'))
    const lista = elemento('div', ['cms-conflictos-lista'])
    datos.conflictos.forEach((conflicto) => {
      const tarjeta = elemento('article', ['cms-conflicto'])
      tarjeta.append(
        elemento('strong', [], `${conflicto.evento_a_titulo} y ${conflicto.evento_b_titulo}`),
        elemento('span', ['cms-conflicto-meta'], `${fechaHoraHumana(conflicto.evento_a_fecha_hora)} · ${conflicto.motivos.join(', ')}`),
      )
      lista.appendChild(tarjeta)
    })
    seccion.append(lista, boton('Ver agenda', () => alIrA('agenda')))
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
      const actividad = selectorCms([['', 'Elegí una actividad'], ...datos.eventos.filter((evento) => evento.estado === 'planificado').map((evento) => [evento.id, `${fechaHoraHumana(evento.fecha_hora)}: ${evento.titulo}`])], `Actividad para ${plantilla.titulo}`)
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
      elemento('p', ['ayuda'], 'Prepará encuentros, dejá una minuta y convertí los acuerdos en trabajo visible.'),
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
        const contexto = [fechaHoraHumana(reunion.fecha_hora), reunion.equipo_nombre, reunion.proyecto_titulo, reunion.lugar].filter(Boolean).join(' · ')
        const acciones = elemento('div', ['cms-reunion-acciones'])
        acciones.append(
          boton('Editar reunión', () => { reunionAEditar = reunion.id; formularioAbierto = 'editar-reunion'; dibujar() }),
          boton('Registrar decisión', () => { reunionDeDecision = reunion.id; formularioAbierto = 'decision'; dibujar() }),
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
      boton(`Abrir ${titulo}`, () => alIrA(`cms-${id}`), ['cms-area-indicador']),
    )
    area.append(cabecera)
    return area
  }

  const nombresArea = NOMBRES_AREA
  const nombresPagina = { trabajo: 'Mi trabajo', agenda: 'Agenda institucional', areas: 'Áreas de Aletea', formularios: 'Formularios y entradas', biblioteca: 'Biblioteca institucional', auditoria: 'Gestión completa', ...nombresArea }

  function migasPagina() {
    const migas = elemento('nav', ['cms-migas'])
    migas.setAttribute('aria-label', 'Ubicación')
    const inicio = boton('Centro de control', () => alIrA('inicio'))
    if (area === 'control') {
      inicio.setAttribute('aria-current', 'page')
      migas.appendChild(inicio)
      return migas
    }
    migas.append(inicio, elemento('span', [], '/'))
    if (nombresArea[area]) {
      migas.append(boton('Áreas', () => alIrA('cms-areas')), elemento('span', [], '/'))
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
    buscar.placeholder = 'Buscar tareas, proyectos, eventos, formularios o documentos'
    buscar.setAttribute('aria-label', 'Buscar en Aletea')
    buscar.value = busquedaGlobal
    const resultados = elemento('div', ['cms-busqueda-resultados'])
    const pintarResultados = () => {
      resultados.replaceChildren()
      const consulta = buscar.value.trim().toLocaleLowerCase('es')
      busquedaGlobal = buscar.value
      if (consulta.length < 2) return
      const colecciones = [
        ['Tarea', datos.tareas, (fila) => fila.titulo, (fila) => irA('cms-trabajo', { filtroTrabajo: fila.responsable_correo ? 'todas' : 'sin-responsable' }), (fila) => [fila.equipo_nombre, fila.responsable_nombre || fila.responsable_correo].filter(Boolean).join(' · ')],
        ['Proyecto', datos.proyectos, (fila) => fila.titulo, () => irA('cms-biblioteca'), (fila) => [fila.equipo_nombre, TEXTO_ESTADO_PROYECTO[fila.estado] || fila.estado].filter(Boolean).join(' · ')],
        ['Evento', datos.eventos, (fila) => fila.titulo, () => irA('cms-agenda'), (fila) => [fechaHoraHumana(fila.fecha_hora), fila.equipo_nombre].filter(Boolean).join(' · ')],
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
      if (evento.key === 'Escape') { buscar.value = ''; pintarResultados(); buscar.blur() }
    })
    panel.append(buscar, elemento('span', ['cms-atajo'], '⌘ K'), resultados)
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
    panel.appendChild(boton('Abrir decisiones y reuniones', () => alIrA('cms-agenda')))
    return panel
  }

  function panelProximoEvento() {
    const panel = elemento('section', ['cms-panel-mando', 'cms-proximo-evento'])
    const proximos = datos.eventos.filter((fila) => fila.estado === 'planificado' && String(fila.fecha_hora || '').slice(0, 10) >= HOY()).sort((a, b) => String(a.fecha_hora).localeCompare(String(b.fecha_hora)))
    panel.append(elemento('span', ['cms-panel-etiqueta'], 'Próximo en agenda'), elemento('h3', [], proximos[0]?.titulo || 'Sin actividades próximas'))
    if (proximos[0]) panel.append(elemento('p', [], [fechaHoraHumana(proximos[0].fecha_hora), proximos[0].lugar, proximos[0].equipo_nombre].filter(Boolean).join(' · ')))
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
          boton('Resolver', () => irA(destino.pantalla, destino.contexto)),
        )
        lista.appendChild(fila)
      })
      panel.appendChild(lista)
    }
    panel.appendChild(boton('Ver Mi trabajo', () => irA('cms-trabajo'), ['boton-principal']))
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
      : [['mias', 'Mis pendientes'], ['atrasadas', 'Vencidas'], ['proximas', 'Próximas'], ['bloqueadas', 'Bloqueadas'], ['seguimiento', 'Seguimientos'], ['sin-responsable', 'Sin responsable'], ['espera', 'Esperando respuesta'], ['todas', 'Todo abierto']]
    opciones.forEach(([valor, etiqueta]) => {
      const control = boton(etiqueta, () => { filtroTrabajo = valor; dibujar() }, ['cms-filtro'])
      control.setAttribute('aria-pressed', String(filtroTrabajo === valor))
      if (filtroTrabajo === valor) control.classList.add('activa')
      filtros.appendChild(control)
    })
    const buscar = document.createElement('input')
    buscar.type = 'search'; buscar.placeholder = 'Filtrar trabajo'; buscar.setAttribute('aria-label', 'Filtrar trabajo'); buscar.value = busquedaTrabajo
    buscar.addEventListener('change', () => { busquedaTrabajo = buscar.value; dibujar() })
    const resumenPersonal = elemento('div', ['cms-resumen-personal'])
    ;[[propiasAbiertas.length, 'tareas abiertas'], [avisosPendientes, 'avisos nuevos'], [urgentesPropias, 'requieren atención']].forEach(([cantidad, etiqueta]) => {
      const dato = elemento('span', ['cms-resumen-personal-dato'])
      dato.append(elemento('strong', [], String(cantidad)), document.createTextNode(etiqueta))
      resumenPersonal.appendChild(dato)
    })
    panel.append(elemento('h3', [], completo ? 'Bandeja de trabajo' : 'Para mí'), resumenPersonal, filtros)
    if (!compacto) panel.appendChild(buscar)
    let tareas = datos.tareas.filter((tarea) => !['completada', 'cancelada'].includes(tarea.estado))
    if (nombresArea[area]) tareas = tareas.filter((tarea) => tarea.equipo_nombre?.toLocaleLowerCase('es') === nombresArea[area].toLocaleLowerCase('es'))
    if (filtroTrabajo === 'mias' && correo) tareas = tareas.filter((tarea) => tarea.responsable_correo === correo)
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
        atrasadas: 'No hay tareas vencidas. El seguimiento está al día para este filtro.',
        proximas: 'No hay tareas próximas en los próximos siete días.',
        bloqueadas: 'No hay tareas bloqueadas. No hay impedimentos pendientes de resolución.',
        seguimiento: 'No hay seguimientos pendientes para hoy.',
        'sin-responsable': 'No hay tareas sin responsable. Cada asunto abierto tiene una persona o equipo que lo sigue.',
        espera: 'No hay tareas esperando respuesta en este momento.',
        todas: 'No hay trabajo abierto con este criterio. Podés registrar una tarea para empezar.',
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
    if (!completo) panel.appendChild(boton('Abrir Mi trabajo', () => alIrA('cms-trabajo')))
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
    texto.append(elemento('h3', [], 'Capacidad de trabajo'), elemento('p', ['ayuda'], 'Disponibilidad semanal, carga estimada y tareas que todavía necesitan una estimación.'))
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
    encabezado.append(texto, boton('Ver todas las áreas', () => alIrA('cms-areas')))
    const mapa = elemento('div', ['cms-mapa'])
    const centro = elemento('article', ['cms-mapa-centro'])
    centro.append(elemento('strong', [], 'Dirección'), elemento('span', [], `${datos.decisiones.length} decisiones · ${datos.proyectos.length} proyectos`))
    mapa.appendChild(centro)
    const sectores = [
      ['familias', 'Familias'], ['deportes', 'Deportes'], ['comunicacion', 'Comunicación'], ['capacitaciones', 'Capacitaciones'],
      ['finanzas', 'Finanzas'], ['eventos', 'Eventos'], ['administracion', 'Administración'],
    ]
    sectores.forEach(([id, nombre]) => {
      const pendientes = datos.tareas.filter((tarea) => tarea.equipo_nombre?.toLocaleLowerCase('es').includes(nombre.toLocaleLowerCase('es')) && !['completada', 'cancelada'].includes(tarea.estado)).length
      const equipo = equipoFundacionalCms(datos.equipos, id)
      const responsables = datos.responsabilidades.filter((fila) => fila.equipo_id === equipo?.id && fila.activo !== false)
      const nodo = boton(nombre, () => alIrA(`cms-${id}`), ['cms-mapa-nodo', `cms-mapa-${id}`])
      nodo.append(
        elemento('small', [], pendientes ? `${pendientes} abiertas` : 'Sin alertas'),
        elemento('small', ['cms-mapa-responsable'], responsables.length ? `${responsables.length} responsable${responsables.length === 1 ? '' : 's'}` : 'Sin responsable asignado'),
      )
      mapa.appendChild(nodo)
    })
    panel.append(encabezado, mapa)
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
      elemento('span', [], `Responsables: ${responsables.map((fila) => fila.nombre || fila.correo).join(', ') || 'por asignar'}`),
      elemento('span', [], `${abiertas} tareas abiertas`),
      elemento('span', [], proximo ? `Próximo hito: ${fechaHoraHumana(proximo.fecha_hora)}` : 'Sin próximo hito'),
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
      formularios: 'Entradas públicas o internas, su revisión y el trabajo que generan.',
      biblioteca: 'Documentos, programas, alianzas y proyectos con contexto institucional.',
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
    if (!formularioAbierto && datos.alcance?.puede_gestionar) {
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
    if (formularioAbierto === 'equipo') seccion.appendChild(formularioEquipo(datos.equipos.find((fila) => fila.id === equipoAEditar) || null))
    if (formularioAbierto === 'proyecto') seccion.appendChild(formularioProyecto())
    if (formularioAbierto === 'programa') seccion.appendChild(formularioPrograma())
    if (formularioAbierto === 'editar-programa') {
      const programa = datos.programas.find((fila) => fila.id === programaAEditar)
      if (programa) seccion.appendChild(formularioPrograma(programa))
      else { formularioAbierto = null; programaAEditar = null }
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
    if (formularioAbierto === 'comunicado') seccion.appendChild(formularioComunicado())
    if (formularioAbierto === 'formulario') seccion.appendChild(formularioFormulario())
    if (formularioAbierto === 'editar-formulario') {
      const formulario = datos.formularios.find((fila) => fila.id === formularioAEditar)
      if (formulario) seccion.appendChild(formularioFormulario(formulario))
      else { formularioAbierto = null; formularioAEditar = null }
    }
    if (formularioAbierto === 'respuesta-formulario') {
      const formulario = datos.formularios.find((fila) => fila.id === formularioParaRespuesta)
      if (formulario) seccion.appendChild(formularioRespuestaFormulario(formulario))
      else { formularioAbierto = null; formularioParaRespuesta = null }
    }
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
        elemento('h3', [], 'Tu trabajo y tus avisos viven acá'),
        elemento('p', [], 'Entrá a Mi trabajo para revisar asignaciones. El contador muestra avisos nuevos y cada aviso abre la tarea exacta. El sistema no envía mensajes automáticos por WhatsApp.'),
      )
      const accionesGuia = elemento('div', ['cms-guia-inicial-acciones'])
      const cerrarGuia = () => {
        mostrarGuiaInicial = false
        try { window.localStorage.setItem(claveGuiaInicial, 'vista') } catch {}
        dibujar()
      }
      accionesGuia.append(
        boton('Abrir Mi trabajo', () => { cerrarGuia(); alIrA('cms-trabajo') }, ['boton-principal']),
        boton('Ver Ayuda', () => { cerrarGuia(); alIrA('ayuda', { busqueda: 'notificaciones' }) }),
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
      const tarjeta = boton('', () => irA('cms-trabajo', { filtroTrabajo: filtro }), ['cms-indicador', `cms-indicador-${clase}`])
      tarjeta.setAttribute('aria-label', `${cantidad} ${etiqueta.toLowerCase()}. Abrir Mi trabajo.`)
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
    const briefingAccion = boton('Ver agenda', () => alIrA('cms-agenda'))
    briefing.append(briefingTexto, briefingAccion)
    if (area === 'control') seccion.appendChild(briefing)

    const principal = elemento('div', ['cms-control-principal'])
    if (area === 'control') {
      if (esVistaMovil()) principal.append(panelHoyMovil(), panelTrabajoPersonal({ compacto: true }), panelProximoEvento(), panelPlegableMovil('Métricas operativas', 'Asignación, cierres, atrasos y seguimientos.', panelMetricasOperativas()))
      else principal.append(
        panelOrientacion(),
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
      panelPlegableMovil('Capacidad', 'Disponibilidad y carga estimada por persona.', panelCapacidadTrabajo()),
      panelPlegableMovil('Estructura institucional', 'Roles, equipos y responsables.', panelEstructura()),
      panelPlegableMovil('Proyectos', 'Avance y próximos hitos.', panelFlujoProyectos()),
      ...panelesSecundariosMovil('Programas y alianzas', 'Iniciativas y vínculos institucionales.', panelProgramas(), panelAlianzas()),
    )
    else if (area === 'formularios') principal.append(
      panelEmbudoFormularios(),
      panelPlegableMovil('Formularios', 'Configuración y respuestas recibidas.', panelFormularios()),
      panelPlegableMovil('Entradas', 'Solicitudes y propuestas por revisar.', panelEntradas()),
    )
    else if (area === 'biblioteca') principal.append(
      panelFlujoProyectos(),
      panelPlegableMovil('Documentos', 'Material institucional disponible.', panelDocumentos()),
      ...panelesSecundariosMovil('Programas y alianzas', 'Iniciativas y vínculos institucionales.', panelProgramas(), panelAlianzas()),
      ...panelesSecundariosMovil('Seguimiento y riesgos', 'Hitos, presupuesto y riesgos de proyectos.', panelSeguimientoProyecto(), panelRiesgosProyecto()),
    )
    else if (area === 'auditoria') principal.append(
      trabajo, panelCapacidadTrabajo(), panelMetricasOperativas(), panelSeguimientoPersonal(), panelDirectrices(), panelResumenSemanal(),
      panelAlertasInstitucionales(), panelHorizonteInstitucional(), panelNotificaciones(),
      panelEventos(), panelCentroDecisiones(), panelConflictosAgenda(), panelChecklists(), panelTareasRecurrentes(), panelReuniones(),
      panelEmbudoFormularios(), panelEntradas(), panelFormularios(), panelComunicados(), panelFlujoProyectos(), panelProgramas(), panelAlianzas(),
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
      encabezadoArea(), panelTrabajoPersonal({ completo: true }),
      ...panelesSecundariosMovil('Personas y resguardos', 'Información protegida y permisos del equipo.', panelContextoProtegidoDePersonas()),
      ...panelesSecundariosMovil('Formularios y entradas', 'Solicitudes, respuestas y tareas por revisar.', panelEmbudoFormularios(), panelEntradas(), panelFormularios()),
      ...panelesSecundariosMovil('Programas y alianzas', 'Iniciativas y vínculos del equipo.', panelProgramas(), panelAlianzas()),
    )
    else if (area === 'deportes') {
      const deporte = elemento('section', ['cms-contexto', 'cms-modulo-deporte'])
      deporte.append(elemento('h3', [], 'Operación Fútbol sin Barreras'), elemento('p', [], 'La planificación de jornadas, personas, asistencia y reportes vive en su propio módulo operativo.'), boton('Abrir Fútbol sin Barreras', () => alIrA('operacion'), ['boton-principal']))
      principal.append(
        encabezadoArea(), panelTrabajoPersonal({ completo: true }), deporte,
        ...panelesSecundariosMovil('Personas y proyectos', 'Información protegida y planificación del equipo.', panelContextoProtegidoDePersonas(), panelFlujoProyectos()),
        ...panelesSecundariosMovil('Programas y alianzas', 'Iniciativas y vínculos del equipo.', panelProgramas(), panelAlianzas()),
      )
    } else if (area === 'comunicacion') principal.append(
      encabezadoArea(), panelTrabajoPersonal({ completo: true }),
      ...panelesSecundariosMovil('Entradas y comunicados', 'Solicitudes, anuncios y comunicaciones del equipo.', panelEmbudoFormularios(), panelComunicados()),
      ...panelesSecundariosMovil('Formularios y alianzas', 'Canales de respuesta y vínculos institucionales.', panelFormularios(), panelAlianzas()),
    )
    else if (area === 'capacitaciones') principal.append(
      encabezadoArea(), panelTrabajoPersonal({ completo: true }),
      ...panelesSecundariosMovil('Programas y formularios', 'Oferta formativa y respuestas recibidas.', panelProgramas(), panelFormularios()),
      ...panelesSecundariosMovil('Preparación y reuniones', 'Checklists y próximos encuentros.', panelChecklists(), panelReuniones()),
    )
    else if (area === 'finanzas') principal.append(
      encabezadoArea(), panelTrabajoPersonal({ completo: true }),
      ...panelesSecundariosMovil('Seguimiento financiero', 'Riesgos, avances y documentación de proyectos.', panelRiesgosProyecto(), panelSeguimientoProyecto(), panelDocumentos()),
    )
    else if (area === 'eventos') principal.append(
      encabezadoArea(), panelTrabajoPersonal({ completo: true }),
      ...panelesSecundariosMovil('Agenda y decisiones', 'Eventos, acuerdos y conflictos por resolver.', panelEventos(), panelCentroDecisiones(), panelConflictosAgenda()),
      ...panelesSecundariosMovil('Preparación y rutinas', 'Checklists, tareas recurrentes y reuniones.', panelChecklists(), panelTareasRecurrentes(), panelReuniones()),
    )
    else principal.append(
      encabezadoArea(), panelTrabajoPersonal({ completo: true }),
      ...panelesSecundariosMovil('Dirección y estructura', 'Directrices, resumen semanal y estructura institucional.', panelDirectrices(), panelResumenSemanal(), panelCentroDecisiones(), panelEstructura()),
      ...panelesSecundariosMovil('Proyectos y registro', 'Avance, documentación y trazabilidad institucional.', panelFlujoProyectos(), panelDocumentos(), panelRegistroInstitucional()),
    )

    const radar = elemento('aside', ['cms-radar'])
    radar.append(
      elemento('div', ['cms-radar-titulo'], 'Radar institucional'),
      panelAlertasInstitucionales(),
      panelHorizonteInstitucional(),
      panelNotificaciones(),
    )
    const conRadar = ['control', 'trabajo', 'agenda', 'auditoria'].includes(area) && !esVistaMovil()
    const centro = elemento('div', ['cms-centro-control', ...(conRadar ? [] : ['cms-centro-sin-radar']), ...(area === 'control' ? [] : ['cms-centro-area'])])
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
    if (!formularioAbierto && datos.alcance?.puede_gestionar && esVistaMovil()) {
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
        formularioAbierto = null
        dibujar()
      }
    }
  }

  dibujar()
  cargar()
  return { redibujar: dibujar }
}
