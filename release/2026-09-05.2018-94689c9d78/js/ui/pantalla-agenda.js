import { agregarIcono, elemento, boton, botonIcono, vaciar } from './componentes.js'
import { crearSelectorFecha } from './selector-fecha.js'
import { agendaDe, eventosDe, agregarEvento, quitarEvento, PLANTILLAS_DE_EVENTO, recordatoriosDe } from '../modelo/agenda.js'
import { tienePermiso } from '../acceso/usuarios.js'
import { hoyISO } from '../util/fechas.js'

const fechaLocal = (fecha) => new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'long' }).format(new Date(`${fecha}T00:00:00`))
const TEXTO_TIPO_EVENTO_CMS = {
  actividad: 'Actividad', reunion: 'Reunión', curso: 'Curso', publicacion: 'Publicación', vencimiento: 'Vencimiento',
  pago: 'Pago', renovacion: 'Renovación', tramite: 'Trámite', certificacion: 'Certificación', asamblea: 'Asamblea',
}
const detalleEventoCms = (evento) => [evento.tipo && evento.tipo !== 'actividad' ? (TEXTO_TIPO_EVENTO_CMS[evento.tipo] ?? evento.tipo) : '', evento.lugar, evento.equipo_nombre, evento.proyecto_titulo, evento.responsable_nombre].filter(Boolean).join(' · ')

export function crearPantallaAgenda(raiz, { roster, almacen, alCambiar, alGuardar = null, sesion = null, cargarEventosCMS = null }) {
  let actual = roster
  let mes = new Date(); mes.setDate(1)
  let error = ''
  let filtro = 'todos'
  let vista = 'mes'
  let mostrarFechasEspeciales = true
  const eventosCmsPorMes = new Map()
  let errorCms = ''
  const puedeVerEventosCms = Boolean(sesion) && tienePermiso(sesion, 'cms')
  const claveMes = () => `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}`
  const claveDeFecha = (fecha) => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
  const clavesEntre = (desde, hasta) => {
    const cursor = new Date(desde.getFullYear(), desde.getMonth(), 1)
    const limite = new Date(hasta.getFullYear(), hasta.getMonth(), 1)
    const claves = []
    while (cursor <= limite) { claves.push(claveDeFecha(cursor)); cursor.setMonth(cursor.getMonth() + 1) }
    return claves
  }
  const cargarInstitucionales = async (clave = claveMes()) => {
    if (!puedeVerEventosCms || eventosCmsPorMes.has(clave)) return
    try {
      const respuesta = cargarEventosCMS
        ? await cargarEventosCMS(clave)
        : await fetch(`/api/cms/eventos?mes=${clave}`).then(async (resultado) => {
          if (!resultado.ok) throw new Error('No se pudieron cargar las actividades institucionales.')
          return resultado.json()
        })
      eventosCmsPorMes.set(clave, respuesta.eventos ?? [])
      errorCms = ''
    } catch (fallo) {
      errorCms = fallo.message || 'No se pudieron cargar las actividades institucionales.'
      eventosCmsPorMes.set(clave, [])
    }
    dibujar()
  }
  const limitesDeVista = () => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    if (vista === 'hoy') return [hoy, hoy]
    if (vista === 'semana') { const hasta = new Date(hoy); hasta.setDate(hasta.getDate() + 6); return [hoy, hasta] }
    if (vista === 'trimestre') return [hoy, new Date(hoy.getFullYear(), hoy.getMonth() + 3, 0)]
    return [new Date(mes.getFullYear(), mes.getMonth(), 1), new Date(mes.getFullYear(), mes.getMonth() + 1, 0)]
  }
  const cargarVista = async () => {
    const [desde, hasta] = limitesDeVista()
    await Promise.all(clavesEntre(desde, hasta).map((clave) => cargarInstitucionales(clave)))
  }
  async function guardar(siguiente, descripcion) {
    if (alGuardar) await alGuardar(siguiente, descripcion)
    else await almacen.guardarRoster(siguiente, descripcion)
    actual = siguiente
    await alCambiar(actual)
  }
  function dibujar() {
    vaciar(raiz)
    const seccion = elemento('section', ['agenda'])
    seccion.append(elemento('h2', [], 'Agenda y alertas'), elemento('p', ['ayuda'], 'Cumpleaños próximos y eventos de coordinación en un solo lugar.'))
    const controles = elemento('div', ['agenda-controles'])
    const cambiarMes = (direccion) => { mes.setMonth(mes.getMonth() + direccion); dibujar(); cargarVista() }
    const atras = botonIcono('atras', 'Mes anterior', () => cambiarMes(-1))
    const adelante = botonIcono('adelante', 'Mes siguiente', () => cambiarMes(1))
    const titulo = elemento('strong', ['agenda-mes'], new Intl.DateTimeFormat('es-UY', { month: 'long', year: 'numeric' }).format(mes))
    controles.append(atras, titulo, adelante); seccion.appendChild(controles)
    const vistas = elemento('div', ['agenda-filtros'])
    ;[['hoy', 'Hoy'], ['semana', 'Semana'], ['mes', 'Mes'], ['trimestre', '3 meses']].forEach(([valor, texto]) => {
      const control = boton(texto, () => { vista = valor; if (vista !== 'mes') { mes = new Date(); mes.setDate(1) } dibujar(); cargarVista() })
      control.classList.add('agenda-filtro'); control.classList.toggle('activo', vista === valor); control.setAttribute('aria-pressed', String(vista === valor)); vistas.appendChild(control)
    })
    seccion.appendChild(vistas)
    const propios = eventosDe(actual, new Date(mes.getFullYear(), mes.getMonth(), 1))
    const institucionales = (eventosCmsPorMes.get(claveMes()) ?? []).map((evento) => ({
      id: `cms-${evento.id}`,
      tipo: 'institucional',
      fecha: evento.fecha_hora.slice(0, 10),
      titulo: evento.titulo,
      detalle: detalleEventoCms(evento),
    }))
    const eventos = [...propios, ...institucionales].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.titulo.localeCompare(b.titulo))
    const visibles = eventos.filter((evento) => (mostrarFechasEspeciales || evento.tipo !== 'efemeride') && (filtro === 'todos' || evento.tipo === filtro))
    const filtros = elemento('div', ['agenda-filtros'])
    ;[['todos', 'Todo'], ['cumpleanos', 'Cumpleaños'], ['efemeride', 'Fechas especiales'], ['manual', 'Eventos propios'], ...(puedeVerEventosCms ? [['institucional', 'Actividades CMS']] : [])].forEach(([valor, texto]) => {
      const control = boton(texto, () => { filtro = valor; dibujar() })
      control.classList.add('agenda-filtro')
      control.classList.toggle('activo', filtro === valor)
      control.setAttribute('aria-pressed', String(filtro === valor))
      filtros.appendChild(control)
    })
    seccion.appendChild(filtros)
    const opcionFechasEspeciales = elemento('label', ['agenda-opcion-especiales'])
    const interruptorFechasEspeciales = document.createElement('input')
    interruptorFechasEspeciales.type = 'checkbox'
    interruptorFechasEspeciales.checked = mostrarFechasEspeciales
    interruptorFechasEspeciales.addEventListener('change', () => {
      mostrarFechasEspeciales = interruptorFechasEspeciales.checked
      if (!mostrarFechasEspeciales && filtro === 'efemeride') filtro = 'todos'
      dibujar()
    })
    opcionFechasEspeciales.append(interruptorFechasEspeciales, elemento('span', [], 'Mostrar días especiales de Uruguay e internacionales'))
    seccion.appendChild(opcionFechasEspeciales)
    const leyenda = elemento('div', ['agenda-leyenda'])
    leyenda.append(elemento('span', ['agenda-leyenda-item', 'cumpleanos'], 'Cumpleaños'), elemento('span', ['agenda-leyenda-item', 'efemeride'], 'Fecha especial'), elemento('span', ['agenda-leyenda-item', 'evento'], 'Evento propio'))
    if (puedeVerEventosCms) leyenda.appendChild(elemento('span', ['agenda-leyenda-item', 'institucional'], 'Actividad CMS'))
    seccion.appendChild(leyenda)
    const dias = elemento('div', ['agenda-dias'])
    ;['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].forEach((dia) => dias.appendChild(elemento('span', ['agenda-dia-semana'], dia)))
    const primero = (mes.getDay() + 6) % 7
    for (let i = 0; i < primero; i += 1) dias.appendChild(elemento('span', ['agenda-dia', 'vacio']))
    const fin = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
    for (let dia = 1; dia <= fin; dia += 1) {
      const fecha = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
      const celda = elemento('div', ['agenda-dia']); celda.appendChild(elemento('span', ['agenda-numero'], String(dia)))
      visibles.filter((evento) => evento.fecha === fecha).slice(0, 2).forEach((evento) => celda.appendChild(elemento('span', ['agenda-marca', evento.tipo === 'cumpleanos' ? 'cumpleanos' : evento.tipo === 'efemeride' ? 'efemeride' : evento.tipo === 'institucional' ? 'institucional' : 'evento'], evento.tipo === 'cumpleanos' ? `Cumple ${evento.persona.nombre}` : evento.titulo)))
      dias.appendChild(celda)
    }
    seccion.appendChild(dias)
    if (vista !== 'mes') {
      const [desde, hasta] = limitesDeVista()
      const fechaDesde = desde.toISOString().slice(0, 10)
      const fechaHasta = hasta.toISOString().slice(0, 10)
      const eventosRango = clavesEntre(desde, hasta).flatMap((clave) => {
        const [anio, numeroMes] = clave.split('-').map(Number)
        const propiosRango = eventosDe(actual, new Date(anio, numeroMes - 1, 1))
        const institucionalesRango = (eventosCmsPorMes.get(clave) ?? []).map((evento) => ({ id: `cms-${evento.id}`, tipo: 'institucional', fecha: evento.fecha_hora.slice(0, 10), titulo: evento.titulo, detalle: detalleEventoCms(evento) }))
        return [...propiosRango, ...institucionalesRango]
      }).filter((evento) => (mostrarFechasEspeciales || evento.tipo !== 'efemeride') && (filtro === 'todos' || evento.tipo === filtro))
      const delRango = eventosRango.filter((evento) => evento.fecha >= fechaDesde && evento.fecha <= fechaHasta).sort((primero, segundo) => primero.fecha.localeCompare(segundo.fecha) || primero.titulo.localeCompare(segundo.titulo))
      const rango = elemento('section', ['agenda-proximos'])
      rango.appendChild(elemento('h3', [], vista === 'hoy' ? 'Agenda de hoy' : vista === 'semana' ? 'Agenda de esta semana' : 'Próximos 3 meses'))
      if (delRango.length) delRango.forEach((evento) => rango.appendChild(elemento('p', [], `${fechaLocal(evento.fecha)}: ${evento.tipo === 'cumpleanos' ? `Cumpleaños de ${evento.persona.nombre}` : evento.titulo}`)))
      else rango.appendChild(elemento('p', ['ayuda'], vista === 'hoy' ? 'No hay actividades para hoy.' : vista === 'semana' ? 'No hay actividades durante los próximos siete días.' : 'No hay actividades durante los próximos tres meses.'))
      seccion.appendChild(rango)
    }
    const recordatorios = recordatoriosDe(actual)
    if (recordatorios.length) {
      const aviso = elemento('section', ['agenda-recordatorios'])
      aviso.appendChild(elemento('h3', [], 'Para preparar'))
      recordatorios.forEach((evento) => aviso.appendChild(elemento('p', [], `${evento.faltan === 0 ? 'Hoy' : `En ${evento.faltan} días`}: ${evento.titulo}`)))
      seccion.appendChild(aviso)
    }
    const proximos = elemento('section', ['agenda-proximos']); proximos.appendChild(elemento('h3', [], 'Próximas alertas'))
    visibles.filter((evento) => evento.fecha >= hoyISO()).slice(0, 8).forEach((evento) => {
      const fila = elemento('div', ['agenda-evento'])
      fila.append(elemento('strong', [], fechaLocal(evento.fecha)), elemento('span', [], evento.tipo === 'cumpleanos' ? `Cumpleaños de ${evento.persona.nombre}, ${evento.rol}` : evento.titulo))
      if (evento.detalle) fila.appendChild(elemento('span', ['agenda-detalle'], evento.detalle))
      if (evento.tipo === 'manual') fila.appendChild(boton('Quitar', async () => { try { await guardar(quitarEvento(actual, evento.id), `Quitar evento: ${evento.titulo}`); error = ''; dibujar() } catch (fallo) { error = fallo.message; dibujar() } }))
      proximos.appendChild(fila)
    })
    if (!proximos.querySelector('.agenda-evento')) proximos.appendChild(elemento('p', ['ayuda'], 'Todavía no hay cumpleaños con fecha completa ni eventos próximos.'))
    seccion.appendChild(proximos)
    if (errorCms) seccion.appendChild(elemento('p', ['ayuda'], `Las actividades del CMS no se pudieron actualizar: ${errorCms}`))
    const form = elemento('form', ['agenda-formulario']); form.appendChild(elemento('h3', [], 'Agregar evento'))
    const selectorFecha = crearSelectorFecha({ clave: 'agenda-evento-fecha', rotulo: 'Fecha del evento', valor: hoyISO(), requerido: true })
    const fecha = selectorFecha.entrada
    const plantilla = document.createElement('select'); plantilla.setAttribute('aria-label', 'Usar una plantilla de evento')
    plantilla.appendChild(new Option('Elegir plantilla opcional', ''))
    PLANTILLAS_DE_EVENTO.forEach((modelo, indice) => plantilla.appendChild(new Option(modelo.titulo, String(indice))))
    const tituloEvento = document.createElement('input'); tituloEvento.type = 'text'; tituloEvento.placeholder = 'Ej: reunión de coordinación'; tituloEvento.required = true; tituloEvento.setAttribute('aria-label', 'Título del evento')
    const detalle = document.createElement('input'); detalle.type = 'text'; detalle.placeholder = 'Detalle opcional'; detalle.setAttribute('aria-label', 'Detalle del evento')
    const recordatorio = document.createElement('select'); recordatorio.setAttribute('aria-label', 'Anticipación del recordatorio')
    ;[[0, 'Sin recordatorio'], [3, 'Recordar 3 días antes'], [7, 'Recordar 7 días antes'], [14, 'Recordar 14 días antes']].forEach(([valor, texto]) => recordatorio.appendChild(new Option(texto, String(valor))))
    plantilla.addEventListener('change', () => {
      const modelo = PLANTILLAS_DE_EVENTO[Number(plantilla.value)]
      if (!modelo) return
      tituloEvento.value = modelo.titulo
      detalle.value = modelo.detalle
      recordatorio.value = String(modelo.recordatorio)
    })
    const enviar = document.createElement('button'); enviar.type = 'submit'; enviar.className = 'boton boton-principal'; enviar.textContent = 'Agregar a la agenda'; agregarIcono(enviar, 'sumar')
    const campoRotulado = (rotulo, control) => {
      const campo = elemento('label', ['agenda-campo'])
      campo.append(elemento('span', [], rotulo), control)
      return campo
    }
    form.append(
      selectorFecha.campo,
      campoRotulado('Plantilla opcional', plantilla),
      campoRotulado('Título del evento', tituloEvento),
      campoRotulado('Detalle', detalle),
      campoRotulado('Recordatorio', recordatorio),
      enviar,
    ); form.addEventListener('submit', async (evento) => { evento.preventDefault(); if (!fecha.value) { selectorFecha.disparador.focus(); return } try { await guardar(agregarEvento(actual, { fecha: fecha.value, titulo: tituloEvento.value, detalle: detalle.value, recordatorio: recordatorio.value }), `Agregar evento: ${tituloEvento.value}`); error = ''; dibujar() } catch (fallo) { error = fallo.message; dibujar() } })
    if (error) form.appendChild(elemento('p', ['error-ajustes'], error)); seccion.appendChild(form); raiz.appendChild(seccion)
  }
  dibujar()
  cargarVista()
}
