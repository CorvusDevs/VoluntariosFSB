import { hoyISO } from '../util/fechas.js'

export const ESTADOS_CMS = Object.freeze(['pendiente', 'en_marcha', 'esperando_respuesta', 'bloqueada', 'completada', 'cancelada'])
export const PRIORIDADES_CMS = Object.freeze(['baja', 'normal', 'alta', 'urgente'])
export const TIPOS_CMS = Object.freeze(['tarea', 'directriz', 'solicitud', 'seguimiento', 'nota'])
export const ESTADOS_PROYECTO_CMS = Object.freeze(['borrador', 'en_marcha', 'en_pausa', 'cerrado'])
export const ESTADOS_REUNION_CMS = Object.freeze(['planificada', 'realizada', 'cancelada'])
export const ESTADOS_DECISION_CMS = Object.freeze(['vigente', 'a_revisar', 'superada'])
export const TIPOS_DOCUMENTO_CMS = Object.freeze(['enlace', 'guia', 'acta', 'plantilla', 'politica'])
export const SENSIBILIDAD_DOCUMENTO_CMS = Object.freeze(['compartido', 'interno', 'restringido'])
export const ESTADOS_EVENTO_CMS = Object.freeze(['planificado', 'realizado', 'cancelado'])
export const TIPOS_EVENTO_CMS = Object.freeze(['actividad', 'reunion', 'curso', 'publicacion', 'vencimiento', 'pago', 'renovacion', 'tramite', 'certificacion', 'asamblea'])

export function unidadesCompatiblesCms(unidades = [], equipoId = '') {
  const activas = unidades.filter((unidad) => unidad.estado !== 'archivada')
  if (!equipoId) return activas
  return activas.filter((unidad) => unidad.equipo_id === equipoId
    || (unidad.vistas || []).some((vista) => vista.equipo_id === equipoId))
}

export function proyectosCompatiblesCms(proyectos = [], { equipoId = '', unidadId = '' } = {}) {
  const activos = proyectos.filter((proyecto) => proyecto.estado !== 'cerrado')
  if (unidadId) return activos.filter((proyecto) => proyecto.unidad_id === unidadId)
  if (equipoId) return activos.filter((proyecto) => proyecto.equipo_id === equipoId)
  return activos
}

export function fechaISOValida(fecha) {
  if (!fecha) return true
  const texto = String(fecha)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false
  const valor = new Date(`${texto}T00:00:00`)
  return !Number.isNaN(valor.getTime()) && valor.toISOString().slice(0, 10) === texto
}

export function fechaHoraValida(fechaHora) {
  const texto = String(fechaHora ?? '')
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(texto)) return false
  const [fecha, hora] = texto.split('T')
  const [horas, minutos] = hora.split(':').map(Number)
  return fechaISOValida(fecha) && horas >= 0 && horas <= 23 && minutos >= 0 && minutos <= 59
}

export function tareaValida(tarea) {
  return Boolean(
    String(tarea?.titulo ?? '').trim()
    && TIPOS_CMS.includes(tarea?.tipo ?? 'tarea')
    && ESTADOS_CMS.includes(tarea?.estado ?? 'pendiente')
    && PRIORIDADES_CMS.includes(tarea?.prioridad ?? 'normal')
    && fechaISOValida(tarea?.fecha_limite)
    && fechaISOValida(tarea?.fecha_seguimiento)
    && ((tarea?.tipo ?? 'tarea') !== 'solicitud' || tarea?.equipo_id),
  )
}

export function proyectoValido(proyecto) {
  const inicio = proyecto?.fecha_inicio
  const fin = proyecto?.fecha_fin
  const presupuesto = proyecto?.presupuesto
  return Boolean(
    String(proyecto?.titulo ?? '').trim()
    && ESTADOS_PROYECTO_CMS.includes(proyecto?.estado ?? 'en_marcha')
    && PRIORIDADES_CMS.includes(proyecto?.prioridad ?? 'normal')
    && fechaISOValida(inicio)
    && fechaISOValida(fin)
    && (!inicio || !fin || inicio <= fin)
    && (presupuesto === undefined || presupuesto === null || presupuesto === '' || (Number.isFinite(Number(presupuesto)) && Number(presupuesto) >= 0)),
  )
}

export function reunionValida(reunion) {
  return Boolean(
    String(reunion?.titulo ?? '').trim()
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(reunion?.fecha_hora ?? ''))
    && ESTADOS_REUNION_CMS.includes(reunion?.estado ?? 'planificada'),
  )
}

export function decisionValida(decision) {
  return Boolean(
    String(decision?.titulo ?? '').trim()
    && ESTADOS_DECISION_CMS.includes(decision?.estado ?? 'vigente'),
  )
}

export function documentoValido(documento) {
  try {
    const url = new URL(String(documento?.url ?? ''))
    return Boolean(String(documento?.titulo ?? '').trim() && ['https:', 'http:'].includes(url.protocol)
      && TIPOS_DOCUMENTO_CMS.includes(documento?.tipo ?? 'enlace')
      && SENSIBILIDAD_DOCUMENTO_CMS.includes(documento?.sensibilidad ?? 'interno'))
  } catch { return false }
}

export function eventoValido(evento) {
  return Boolean(
    String(evento?.titulo ?? '').trim()
    && fechaHoraValida(evento?.fecha_hora)
    && ESTADOS_EVENTO_CMS.includes(evento?.estado ?? 'planificado')
    && TIPOS_EVENTO_CMS.includes(evento?.tipo ?? 'actividad'),
  )
}

export function clasificarTarea(tarea, hoy = hoyISO()) {
  if (tarea.estado === 'completada' || tarea.estado === 'cancelada') return 'cerrada'
  if (tarea.estado === 'bloqueada') return 'bloqueada'
  if (tarea.estado === 'esperando_respuesta') return 'esperando_respuesta'
  if (tarea.fecha_limite && tarea.fecha_limite < hoy) return 'atrasada'
  if (tarea.fecha_limite && tarea.fecha_limite <= sumarDias(hoy, 7)) return 'proxima'
  return 'en_marcha'
}

export function requiereSeguimiento(tarea, hoy = hoyISO()) {
  return Boolean(
    tarea?.fecha_seguimiento
    && tarea.fecha_seguimiento <= hoy
    && tarea.estado !== 'completada'
    && tarea.estado !== 'cancelada',
  )
}

export function esperaProlongada(tarea, hoy = hoyISO()) {
  if (tarea?.estado !== 'esperando_respuesta') return false
  if (tarea.fecha_seguimiento) return tarea.fecha_seguimiento < hoy
  const actualizado = String(tarea.actualizado_en ?? '').slice(0, 10)
  return Boolean(actualizado && actualizado <= sumarDias(hoy, -7))
}

function sumarDias(fecha, dias) {
  const resultado = new Date(`${fecha}T00:00:00`)
  resultado.setDate(resultado.getDate() + dias)
  return resultado.toISOString().slice(0, 10)
}

export function resumenTablero(tareas, hoy = hoyISO()) {
  return (tareas ?? []).reduce((resumen, tarea) => {
    resumen.total += 1
    resumen[clasificarTarea(tarea, hoy)] += 1
    if (!tarea.responsable_correo && tarea.estado !== 'completada' && tarea.estado !== 'cancelada') resumen.sinResponsable += 1
    if (requiereSeguimiento(tarea, hoy)) resumen.seguimiento += 1
    return resumen
  }, {
    total: 0, atrasada: 0, proxima: 0, bloqueada: 0, esperando_respuesta: 0, en_marcha: 0, cerrada: 0, sinResponsable: 0, seguimiento: 0,
  })
}

function sumarDiasSemana(fecha, dias) {
  const resultado = new Date(`${fecha}T00:00:00`)
  resultado.setDate(resultado.getDate() + dias)
  return resultado.toISOString().slice(0, 10)
}

export function resumenSemanalCms({ tareas = [], eventos = [], decisiones = [], entradas = [] }, hoy = hoyISO()) {
  const hasta = sumarDiasSemana(hoy, 7)
  const abierta = (tarea) => !['completada', 'cancelada'].includes(tarea.estado)
  return {
    desde: hoy,
    hasta,
    atrasadas: tareas.filter((tarea) => abierta(tarea) && tarea.fecha_limite && tarea.fecha_limite < hoy),
    proximas: tareas.filter((tarea) => abierta(tarea) && tarea.fecha_limite && tarea.fecha_limite >= hoy && tarea.fecha_limite <= hasta),
    actividades: eventos.filter((evento) => evento.estado === 'planificado' && evento.fecha_hora?.slice(0, 10) >= hoy && evento.fecha_hora.slice(0, 10) <= hasta),
    decisiones: decisiones.filter((decision) => decision.estado !== 'superada'),
    entradas: entradas.filter((entrada) => entrada.estado !== 'cerrada'),
  }
}

function fechaMetrica(valor) {
  if (!valor) return null
  const fecha = new Date(String(valor).includes('T') ? valor : `${String(valor).replace(' ', 'T')}Z`)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

export function metricasOperativasCms(tareas = [], hoy = hoyISO()) {
  const abiertas = tareas.filter((tarea) => !['completada', 'cancelada'].includes(tarea.estado))
  const conVencimiento = abiertas.filter((tarea) => tarea.fecha_limite)
  const atrasadas = conVencimiento.filter((tarea) => tarea.fecha_limite < hoy)
  const bloqueadas = abiertas.filter((tarea) => tarea.estado === 'bloqueada')
  const seguimientosVencidos = abiertas.filter((tarea) => tarea.fecha_seguimiento && tarea.fecha_seguimiento <= hoy)
  const asignaciones = tareas.map((tarea) => {
    const inicio = fechaMetrica(tarea.creado_en); const fin = fechaMetrica(tarea.asignado_en)
    return inicio && fin && fin >= inicio ? (fin - inicio) / 3600000 : null
  }).filter((valor) => valor !== null)
  const cierres = tareas.map((tarea) => {
    const inicio = fechaMetrica(tarea.creado_en); const fin = fechaMetrica(tarea.completado_en)
    return inicio && fin && fin >= inicio ? (fin - inicio) / 3600000 : null
  }).filter((valor) => valor !== null)
  const promedio = (valores) => valores.length ? Math.round((valores.reduce((total, valor) => total + valor, 0) / valores.length) * 10) / 10 : null
  return {
    abiertas: abiertas.length,
    atrasadas: atrasadas.length,
    porcentajeAtrasadas: conVencimiento.length ? Math.round((atrasadas.length / conVencimiento.length) * 100) : 0,
    bloqueadas: bloqueadas.length,
    seguimientosVencidos: seguimientosVencidos.length,
    horasPromedioAsignacion: promedio(asignaciones),
    horasPromedioCierre: promedio(cierres),
    muestrasAsignacion: asignaciones.length,
    muestrasCierre: cierres.length,
  }
}

export function horizonteInstitucionalCms({ tareas = [], eventos = [] }, hoy = hoyISO()) {
  const abierta = (tarea) => !['completada', 'cancelada'].includes(tarea.estado)
  return [7, 15, 30, 90].map((dias) => {
    const hasta = sumarDiasSemana(hoy, dias)
    const actividades = eventos.filter((evento) => evento.estado === 'planificado' && evento.fecha_hora?.slice(0, 10) >= hoy && evento.fecha_hora.slice(0, 10) <= hasta)
    const vencimientos = tareas.filter((tarea) => abierta(tarea) && tarea.fecha_limite && tarea.fecha_limite >= hoy && tarea.fecha_limite <= hasta)
    return { dias, hasta, actividades, vencimientos }
  })
}

export function alertaComisionDirectivaCms({ equipos = [], reuniones = [] }, hoy = hoyISO()) {
  if (!equipos.some((equipo) => equipo.categoria === 'comision_directiva')) return null
  const mes = hoy.slice(0, 7)
  const hayReunion = reuniones.some((reunion) => reunion.equipo_categoria === 'comision_directiva'
    && reunion.estado !== 'cancelada' && String(reunion.fecha_hora || '').slice(0, 7) === mes)
  return hayReunion ? null : {
    prioridad: 1, destino: 'reuniones', titulo: 'Falta una reunión de Comisión Directiva este mes',
    detalle: 'La referencia institucional pide una reunión mensual. Agendala para mantener el seguimiento y las decisiones al día.',
  }
}

export function alertasInstitucionalesCms({ tareas = [], riesgos = [], conflictos = [], equipos = [], reuniones = [], decisiones = [], proyectos = [], eventos = [] }, hoy = hoyISO()) {
  const enSieteDias = sumarDiasSemana(hoy, 7)
  const tiposConPreparacion = ['actividad', 'reunion', 'curso', 'publicacion', 'asamblea']
  const tiposDeVencimiento = ['vencimiento', 'pago', 'renovacion', 'tramite', 'certificacion']
  const actividadProximaSinTareas = eventos.filter((evento) => evento.estado === 'planificado'
    && tiposConPreparacion.includes(evento.tipo ?? 'actividad')
    && evento.fecha_hora?.slice(0, 10) >= hoy && evento.fecha_hora.slice(0, 10) <= enSieteDias
    && !tareas.some((tarea) => tarea.evento_id === evento.id && !['completada', 'cancelada'].includes(tarea.estado)))
  const vencimientoProximoSinTareas = eventos.filter((evento) => evento.estado === 'planificado'
    && tiposDeVencimiento.includes(evento.tipo)
    && evento.fecha_hora?.slice(0, 10) >= hoy && evento.fecha_hora.slice(0, 10) <= enSieteDias
    && !tareas.some((tarea) => tarea.evento_id === evento.id && !['completada', 'cancelada'].includes(tarea.estado)))
  const alertas = [
    alertaComisionDirectivaCms({ equipos, reuniones }, hoy),
    ...decisiones.filter((decision) => decision.estado === 'a_revisar').map((decision) => ({
      prioridad: 1, destino: 'reuniones', titulo: `Decisión a revisar: ${decision.titulo}`, detalle: decision.reunion_titulo || 'Revisala en la próxima reunión correspondiente.',
    })),
    ...proyectos.filter((proyecto) => !['cerrado', 'cancelado'].includes(proyecto.estado) && !proyecto.responsable_correo).map((proyecto) => ({
      prioridad: 1, destino: 'estructura', titulo: `Proyecto sin responsable: ${proyecto.titulo}`, detalle: proyecto.equipo_nombre || 'Asigná una persona responsable para mantener el seguimiento.',
    })),
    ...actividadProximaSinTareas.map((evento) => ({
      prioridad: 1, destino: 'eventos', titulo: `Actividad próxima sin tareas: ${evento.titulo}`, detalle: `Es el ${evento.fecha_hora.slice(0, 10)}. Creá al menos una tarea de preparación.`,
    })),
    ...vencimientoProximoSinTareas.map((evento) => ({
      prioridad: ['pago', 'renovacion'].includes(evento.tipo) ? 1 : 2, destino: 'eventos', titulo: `Vencimiento próximo sin tarea: ${evento.titulo}`, detalle: `Es el ${evento.fecha_hora.slice(0, 10)}. Asigná una tarea de seguimiento.`,
    })),
    ...riesgos.filter((riesgo) => riesgo.estado !== 'mitigado' && ['critico', 'alto'].includes(riesgo.nivel)).map((riesgo) => ({
      prioridad: riesgo.nivel === 'critico' ? 0 : 1, destino: 'riesgos', titulo: `Riesgo ${riesgo.nivel}: ${riesgo.titulo}`, detalle: riesgo.proyecto_titulo || 'Proyecto sin identificar',
    })),
    ...conflictos.map((conflicto) => ({
      prioridad: 1, destino: 'agenda', titulo: 'Conflicto de agenda', detalle: `${conflicto.evento_a_titulo} y ${conflicto.evento_b_titulo}`,
    })),
    ...tareas.filter((tarea) => clasificarTarea(tarea, hoy) === 'atrasada').map((tarea) => ({
      prioridad: 2, destino: 'trabajo', titulo: `Tarea atrasada: ${tarea.titulo}`, detalle: tarea.equipo_nombre || tarea.proyecto_titulo || 'Sin contexto',
    })),
    ...tareas.filter((tarea) => clasificarTarea(tarea, hoy) === 'bloqueada').map((tarea) => ({
      prioridad: 2, destino: 'trabajo', titulo: `Tarea bloqueada: ${tarea.titulo}`, detalle: tarea.equipo_nombre || tarea.proyecto_titulo || 'Sin contexto',
    })),
    ...tareas.filter((tarea) => !['completada', 'cancelada'].includes(tarea.estado) && !tarea.responsable_correo).map((tarea) => ({
      prioridad: 2, destino: 'trabajo', titulo: `Tarea sin responsable: ${tarea.titulo}`, detalle: tarea.equipo_nombre || tarea.proyecto_titulo || 'Asigná una persona para que el seguimiento tenga dueño.',
    })),
    ...tareas.filter((tarea) => esperaProlongada(tarea, hoy)).map((tarea) => ({
      prioridad: 2, destino: 'trabajo', titulo: `Espera prolongada: ${tarea.titulo}`, detalle: tarea.fecha_seguimiento ? `Seguimiento vencido el ${tarea.fecha_seguimiento}.` : 'Esperando respuesta hace más de una semana.',
    })),
  ].filter(Boolean)
  return alertas
    .sort((primera, segunda) => primera.prioridad - segunda.prioridad || primera.titulo.localeCompare(segunda.titulo, 'es'))
    .slice(0, 6)
    .map((alerta) => ({ ...alerta, clave: `${alerta.destino}:${alerta.titulo}` }))
}
