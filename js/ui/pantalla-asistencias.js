import { elemento, boton, vaciar } from './componentes.js'
import { estadoDeSabado, hastaHoy, VINO, FALTO, NO_ESTABA } from '../modelo/asistencia.js'
import { formatearFechaLarga, hoyISO } from '../util/fechas.js'

const mesDe = (fecha) => fecha.slice(0, 7)

// Corregir la asistencia de un sabado que ya paso. La planilla no se toca: ya
// se mando por WhatsApp y reescribirla haria que lo guardado deje de coincidir
// con la imagen que recibio la gente. Lo que se guarda es la diferencia.
export function crearPantallaAsistencias(raiz, { roster, almacen, alIrALista = null }) {
  let fechas = []
  let fecha = null
  let lista = null
  let derivado = new Map()
  let correcciones = []
  let cargando = true
  let vivo = true
  let error = null
  // Cada carga se lleva su numero. Si mientras se lee un sabado la coordinadora
  // elige otro, la respuesta que llega tarde ya no es la que corresponde y se
  // descarta: sin esto el selector mostraba un sabado y las filas otro.
  let carga = 0

  async function cargarSabados() {
    // Solo sabados que ya pasaron: corregir la asistencia de uno que todavia no
    // llego no quiere decir nada, y verlo en la lista hace dudar de si la
    // planilla del sabado que viene ya cuenta para el reporte.
    let guardadas
    try {
      guardadas = (await almacen.listarListas()).map((l) => l.fecha)
    } catch (fallo) {
      // Sin esto la pantalla se quedaba en "Leyendo" para siempre.
      if (!vivo) return
      error = `No se pudo leer: ${fallo.message}`
      cargando = false
      dibujar()
      return
    }
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
    carga += 1
    const mia = carga
    cargando = true
    dibujar()
    const pedida = fecha
    try {
      lista = await almacen.leerLista(pedida)
      const archivo = await almacen.leerAsistencias(mesDe(pedida))
      if (!vivo || mia !== carga) return
      // Se calcula una vez por sabado y no una vez por fila: recorrer la
      // planilla entera por cada persona es el mismo trabajo repetido tantas
      // veces como gente haya.
      derivado = estadoDeSabado(lista, roster)
      correcciones = archivo?.correcciones ?? []
      error = null
    } catch (fallo) {
      if (!vivo || mia !== carga) return
      error = `No se pudo leer: ${fallo.message}`
    }
    cargando = false
    dibujar()
  }

  function estadoDe(id) {
    const correccion = correcciones.find((c) => c.fecha === fecha && c.persona === id)
    if (correccion) return correccion.vino ? VINO : FALTO
    return derivado.get(id) ?? NO_ESTABA
  }

  // El toque avanza al estado siguiente y vuelve al principio. El principio es
  // lo que dice la planilla, asi que a quien no figura en ella se la puede
  // devolver a "no estaba": antes el toque alternaba solo entre vino y falto y
  // quien la tocaba por error le dejaba una falta inventada en el reporte, sin
  // forma de deshacerla.
  function proximoEstado(actual, base) {
    const vuelta = base === VINO ? [VINO, FALTO] : base === FALTO ? [FALTO, VINO] : [NO_ESTABA, VINO, FALTO]
    return vuelta[(vuelta.indexOf(actual) + 1) % vuelta.length]
  }

  async function alternar(persona) {
    const base = derivado.get(persona.id) ?? NO_ESTABA
    const siguiente = proximoEstado(estadoDe(persona.id), base)
    const resto = correcciones.filter((c) => !(c.fecha === fecha && c.persona === persona.id))
    // Si la correccion coincide con lo que ya dice la planilla, no es una
    // correccion: se borra en vez de guardar una diferencia que no difiere.
    const previas = correcciones
    correcciones = siguiente === base
      ? resto
      : [...resto, {
        fecha,
        persona: persona.id,
        vino: siguiente === VINO,
        cuando: new Date().toISOString(),
      }]
    dibujar()
    const mes = mesDe(fecha)
    try {
      await almacen.guardarAsistencias(mes, { version: 1, mes, correcciones },
        `Corregir la asistencia del ${fecha}`)
      error = null
    } catch (fallo) {
      // Sin esto la correccion quedaba en pantalla como si se hubiera guardado.
      // Peor que no poder corregir es creer que se corrigio.
      correcciones = previas
      error = `No se pudo guardar: ${fallo.message}`
      dibujar()
    }
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

    if (error && fechas.length === 0) {
      seccion.appendChild(elemento('p', ['error-ajustes'], error))
      raiz.appendChild(seccion)
      return
    }

    if (fechas.length === 0 && !cargando) {
      const vacio = elemento('div', ['estado-vacio'])
      vacio.append(
        elemento('h3', [], 'No hay planillas guardadas para corregir'),
        elemento('p', ['ayuda'], 'Primero armá y guardá la lista de un sábado.'),
      )
      if (alIrALista) {
        const ir = boton('Ir a Armar lista', alIrALista, ['boton-principal'])
        ir.dataset.accion = 'ir-a-lista'
        vacio.appendChild(ir)
      }
      seccion.appendChild(vacio)
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
    if (error) seccion.appendChild(elemento('p', ['error-ajustes'], error))
    const genteActiva = [...roster.participantes, ...roster.voluntarios].filter((persona) => persona.activo !== false)
    const registrados = genteActiva.filter((persona) => [VINO, FALTO].includes(estadoDe(persona.id))).length
    const progreso = elemento('section', ['progreso-asistencia'])
    progreso.append(
      elemento('strong', [], `${registrados} de ${genteActiva.length} con asistencia registrada`),
      elemento('span', [], registrados === genteActiva.length ? 'La jornada está completa.' : 'Tocá una persona para completar o corregir su estado.'),
    )
    const barra = elemento('span', ['progreso-asistencia-barra'])
    barra.style.setProperty('--progreso', `${genteActiva.length ? Math.round((registrados / genteActiva.length) * 100) : 0}%`)
    barra.setAttribute('role', 'progressbar')
    barra.setAttribute('aria-valuemin', '0'); barra.setAttribute('aria-valuemax', String(genteActiva.length)); barra.setAttribute('aria-valuenow', String(registrados))
    progreso.appendChild(barra)
    seccion.appendChild(progreso)
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
