import { agregarIcono, elemento, boton, botonIcono, vaciar } from './componentes.js'
import { agendaDe, eventosDe, agregarEvento, quitarEvento, PLANTILLAS_DE_EVENTO, recordatoriosDe } from '../modelo/agenda.js'

const fechaLocal = (fecha) => new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'long' }).format(new Date(`${fecha}T00:00:00`))

export function crearPantallaAgenda(raiz, { roster, almacen, alCambiar }) {
  let actual = roster
  let mes = new Date(); mes.setDate(1)
  let error = ''
  async function guardar(siguiente, descripcion) {
    await almacen.guardarRoster(siguiente, descripcion)
    actual = siguiente
    await alCambiar(actual)
  }
  function dibujar() {
    vaciar(raiz)
    const seccion = elemento('section', ['agenda'])
    seccion.append(elemento('h2', [], 'Agenda y alertas'), elemento('p', ['ayuda'], 'Cumpleaños próximos y eventos de coordinación en un solo lugar.'))
    const controles = elemento('div', ['agenda-controles'])
    const atras = botonIcono('atras', 'Mes anterior', () => { mes.setMonth(mes.getMonth() - 1); dibujar() })
    const adelante = botonIcono('adelante', 'Mes siguiente', () => { mes.setMonth(mes.getMonth() + 1); dibujar() })
    const titulo = elemento('strong', ['agenda-mes'], new Intl.DateTimeFormat('es-UY', { month: 'long', year: 'numeric' }).format(mes))
    controles.append(atras, titulo, adelante); seccion.appendChild(controles)
    const eventos = eventosDe(actual, new Date(mes.getFullYear(), mes.getMonth(), 1))
    const dias = elemento('div', ['agenda-dias'])
    ;['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].forEach((dia) => dias.appendChild(elemento('span', ['agenda-dia-semana'], dia)))
    const primero = (mes.getDay() + 6) % 7
    for (let i = 0; i < primero; i += 1) dias.appendChild(elemento('span', ['agenda-dia', 'vacio']))
    const fin = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
    for (let dia = 1; dia <= fin; dia += 1) {
      const fecha = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
      const celda = elemento('div', ['agenda-dia']); celda.appendChild(elemento('span', ['agenda-numero'], String(dia)))
      eventos.filter((evento) => evento.fecha === fecha).slice(0, 2).forEach((evento) => celda.appendChild(elemento('span', ['agenda-marca', evento.tipo === 'cumpleanos' ? 'cumpleanos' : evento.tipo === 'efemeride' ? 'efemeride' : 'evento'], evento.tipo === 'cumpleanos' ? `Cumple ${evento.persona.nombre}` : evento.titulo)))
      dias.appendChild(celda)
    }
    seccion.appendChild(dias)
    const recordatorios = recordatoriosDe(actual)
    if (recordatorios.length) {
      const aviso = elemento('section', ['agenda-recordatorios'])
      aviso.appendChild(elemento('h3', [], 'Para preparar'))
      recordatorios.forEach((evento) => aviso.appendChild(elemento('p', [], `${evento.faltan === 0 ? 'Hoy' : `En ${evento.faltan} días`}: ${evento.titulo}`)))
      seccion.appendChild(aviso)
    }
    const proximos = elemento('section', ['agenda-proximos']); proximos.appendChild(elemento('h3', [], 'Próximas alertas'))
    eventos.filter((evento) => evento.fecha >= new Date().toISOString().slice(0, 10)).slice(0, 8).forEach((evento) => {
      const fila = elemento('div', ['agenda-evento'])
      fila.append(elemento('strong', [], fechaLocal(evento.fecha)), elemento('span', [], evento.tipo === 'cumpleanos' ? `Cumpleaños de ${evento.persona.nombre}, ${evento.rol}` : evento.titulo))
      if (evento.detalle) fila.appendChild(elemento('span', ['agenda-detalle'], evento.detalle))
      if (evento.tipo === 'manual') fila.appendChild(boton('Quitar', async () => { try { await guardar(quitarEvento(actual, evento.id), `Quitar evento: ${evento.titulo}`); error = ''; dibujar() } catch (fallo) { error = fallo.message; dibujar() } }))
      proximos.appendChild(fila)
    })
    if (!proximos.querySelector('.agenda-evento')) proximos.appendChild(elemento('p', ['ayuda'], 'Todavía no hay cumpleaños con fecha completa ni eventos próximos.'))
    seccion.appendChild(proximos)
    const form = elemento('form', ['agenda-formulario']); form.appendChild(elemento('h3', [], 'Agregar evento'))
    const fecha = document.createElement('input'); fecha.type = 'date'; fecha.required = true; fecha.value = new Date().toISOString().slice(0, 10)
    const plantilla = document.createElement('select'); plantilla.setAttribute('aria-label', 'Usar una plantilla de evento')
    plantilla.appendChild(new Option('Elegir plantilla opcional', ''))
    PLANTILLAS_DE_EVENTO.forEach((modelo, indice) => plantilla.appendChild(new Option(modelo.titulo, String(indice))))
    const tituloEvento = document.createElement('input'); tituloEvento.type = 'text'; tituloEvento.placeholder = 'Ej: reunión de coordinación'; tituloEvento.required = true
    const detalle = document.createElement('input'); detalle.type = 'text'; detalle.placeholder = 'Detalle opcional'
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
    form.append(fecha, plantilla, tituloEvento, detalle, recordatorio, enviar); form.addEventListener('submit', async (evento) => { evento.preventDefault(); try { await guardar(agregarEvento(actual, { fecha: fecha.value, titulo: tituloEvento.value, detalle: detalle.value, recordatorio: recordatorio.value }), `Agregar evento: ${tituloEvento.value}`); error = ''; dibujar() } catch (fallo) { error = fallo.message; dibujar() } })
    if (error) form.appendChild(elemento('p', ['error-ajustes'], error)); seccion.appendChild(form); raiz.appendChild(seccion)
  }
  dibujar()
}
