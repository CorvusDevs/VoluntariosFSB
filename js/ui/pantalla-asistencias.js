import { elemento, vaciar } from './componentes.js'
import { estadoDeSabado, hastaHoy, VINO, FALTO, NO_ESTABA } from '../modelo/asistencia.js'
import { formatearFechaLarga, hoyISO } from '../util/fechas.js'

const mesDe = (fecha) => fecha.slice(0, 7)

// Corregir la asistencia de un sabado que ya paso. La planilla no se toca: ya
// se mando por WhatsApp y reescribirla haria que lo guardado deje de coincidir
// con la imagen que recibio la gente. Lo que se guarda es la diferencia.
export function crearPantallaAsistencias(raiz, { roster, almacen }) {
  let fechas = []
  let fecha = null
  let lista = null
  let derivado = new Map()
  let correcciones = []
  let cargando = true
  let vivo = true

  async function cargarSabados() {
    // Solo sabados que ya pasaron: corregir la asistencia de uno que todavia no
    // llego no quiere decir nada, y verlo en la lista hace dudar de si la
    // planilla del sabado que viene ya cuenta para el reporte.
    const guardadas = (await almacen.listarListas()).map((l) => l.fecha)
    fechas = hastaHoy(guardadas, hoyISO()).reverse()
    if (!vivo) return
    fecha = fechas[0] ?? null
    if (!fecha) {
      cargando = false
      dibujar()
      return
    }
    await cargarSabado()
  }

  async function cargarSabado() {
    cargando = true
    dibujar()
    lista = await almacen.leerLista(fecha)
    const archivo = await almacen.leerAsistencias(mesDe(fecha))
    if (!vivo) return
    // Se calcula una vez por sabado y no una vez por fila: recorrer la planilla
    // entera por cada persona es el mismo trabajo repetido tantas veces como
    // gente haya.
    derivado = estadoDeSabado(lista, roster)
    correcciones = archivo?.correcciones ?? []
    cargando = false
    dibujar()
  }

  function estadoDe(id) {
    const correccion = correcciones.find((c) => c.fecha === fecha && c.persona === id)
    if (correccion) return correccion.vino ? VINO : FALTO
    return derivado.get(id) ?? NO_ESTABA
  }

  async function alternar(persona) {
    const siguiente = estadoDe(persona.id) === VINO ? FALTO : VINO
    const resto = correcciones.filter((c) => !(c.fecha === fecha && c.persona === persona.id))
    // Si la correccion coincide con lo que ya dice la planilla, no es una
    // correccion: se borra en vez de guardar una diferencia que no difiere.
    correcciones = siguiente === derivado.get(persona.id)
      ? resto
      : [...resto, {
        fecha,
        persona: persona.id,
        vino: siguiente === VINO,
        cuando: new Date().toISOString(),
      }]
    dibujar()
    const mes = mesDe(fecha)
    await almacen.guardarAsistencias(mes, { version: 1, mes, correcciones },
      `Corregir la asistencia del ${fecha}`)
  }

  function filaPersona(persona) {
    const estado = estadoDe(persona.id)
    const fila = elemento('button', ['fila-asistencia'])
    fila.type = 'button'
    fila.dataset.persona = persona.id
    fila.dataset.estado = estado
    const marca = estado === VINO ? 'Vino' : estado === FALTO ? 'Faltó' : 'No estaba'
    fila.append(
      elemento('span', ['nombre-asistencia'], persona.nombre),
      elemento('span', ['marca-asistencia'], marca),
    )
    fila.setAttribute('aria-label', `${persona.nombre}: ${marca}. Tocá para cambiarlo.`)
    fila.addEventListener('click', () => alternar(persona))
    return fila
  }

  function dibujar() {
    vaciar(raiz)
    const seccion = elemento('section', ['seccion'])
    seccion.appendChild(elemento('h2', [], 'Asistencia de un sábado'))

    if (fechas.length === 0 && !cargando) {
      seccion.appendChild(elemento('p', ['ayuda'], 'No hay planillas guardadas para corregir.'))
      raiz.appendChild(seccion)
      return
    }

    const selector = document.createElement('select')
    selector.dataset.campo = 'sabado'
    fechas.forEach((f) => {
      const opcion = document.createElement('option')
      opcion.value = f
      opcion.textContent = formatearFechaLarga(f)
      selector.appendChild(opcion)
    })
    selector.value = fecha ?? ''
    selector.addEventListener('change', () => {
      fecha = selector.value
      cargarSabado()
    })
    const rotulo = elemento('label', ['campo'])
    rotulo.append(elemento('span', ['campo-rotulo'], 'Sábado'), selector)
    seccion.appendChild(rotulo)

    if (cargando) {
      seccion.appendChild(elemento('p', ['ayuda'], 'Leyendo la planilla…'))
      raiz.appendChild(seccion)
      return
    }

    seccion.appendChild(elemento('p', ['ayuda'],
      'Sale de la planilla de ese día. Tocá a quien no coincida con lo que pasó.'))
    const bloque = (titulo, gente) => {
      seccion.appendChild(elemento('h3', ['subtitulo-asistencia'], titulo))
      const columna = elemento('div', ['columna-asistencia'])
      gente.forEach((p) => columna.appendChild(filaPersona(p)))
      seccion.appendChild(columna)
    }
    bloque('Participantes', roster.participantes.filter((p) => p.activo !== false))
    bloque('Voluntarios', roster.voluntarios.filter((v) => v.activo !== false))
    raiz.appendChild(seccion)
  }

  cargarSabados()
  return { destruir: () => { vivo = false } }
}
