import { elemento, boton, vaciar } from './componentes.js'
import { eventosDe, recordatoriosDe } from '../modelo/agenda.js'
import { perfilesIncompletos, posiblesDuplicados } from '../modelo/roster.js'
import { coincide } from '../util/nombres.js'

const fechaLocal = (fecha) => new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'long' }).format(new Date(`${fecha}T00:00:00`))

export function crearPantallaInicio(raiz, { roster, alertas = [], tendencia = null, alIrA }) {
  function dibujarResultados(caja, texto) {
    caja.replaceChildren()
    const consulta = texto.trim()
    if (!consulta) return
    const personas = [...roster.participantes, ...roster.voluntarios]
      .filter((persona) => persona.activo !== false && coincide(persona.nombre, consulta)).slice(0, 6)
    if (!personas.length) {
      caja.appendChild(elemento('p', ['ayuda'], 'No encontramos personas con ese nombre.'))
      return
    }
    personas.forEach((persona) => {
      const tipo = persona.id.startsWith('v_') ? 'Voluntario' : `Grupo ${persona.grupo}`
      const resultado = boton(`${persona.nombre} · ${tipo}`, () => alIrA('personas', { busqueda: persona.nombre }))
      resultado.classList.add('inicio-resultado')
      caja.appendChild(resultado)
    })
  }

  vaciar(raiz)
  const seccion = elemento('section', ['inicio'])
  seccion.append(elemento('h2', [], 'Hoy en Fútbol sin Barreras'), elemento('p', ['ayuda'], 'Accesos y alertas para preparar la próxima jornada.'))
  const participantes = roster.participantes.filter((persona) => persona.activo !== false).length
  const voluntarios = roster.voluntarios.filter((persona) => persona.activo !== false).length
  const resumen = elemento('div', ['inicio-resumen'])
  resumen.append(
    elemento('div', ['inicio-dato'], `${participantes} participantes`),
    elemento('div', ['inicio-dato'], `${voluntarios} voluntarios`),
    elemento('div', ['inicio-dato', ...(alertas.length ? ['con-alerta'] : [])], `${alertas.length} alertas de asistencia`),
  )
  seccion.appendChild(resumen)

  const buscar = document.createElement('input')
  buscar.type = 'search'; buscar.className = 'inicio-buscar'; buscar.placeholder = 'Buscar persona, grupo o voluntario'; buscar.setAttribute('aria-label', 'Buscar persona en toda la organización')
  const resultados = elemento('div', ['inicio-resultados'])
  buscar.addEventListener('input', () => dibujarResultados(resultados, buscar.value))
  seccion.append(buscar, resultados)

  const acciones = elemento('div', ['inicio-acciones'])
  acciones.append(
    boton('Armar lista', () => alIrA('lista'), ['boton-principal']),
    boton('Tomar asistencia', () => alIrA('asistencias')),
    boton('Ver Agenda', () => alIrA('agenda')),
    boton('Personas', () => alIrA('personas')),
  )
  seccion.appendChild(acciones)

  const trabajo = elemento('section', ['inicio-trabajo'])
  trabajo.appendChild(elemento('h3', [], 'Atención de coordinación'))
  const incompletos = perfilesIncompletos(roster)
  const duplicados = posiblesDuplicados(roster)
  const recordatorios = recordatoriosDe(roster)
  const fila = (texto, accion) => trabajo.appendChild(boton(texto, accion, ['inicio-tarea']))
  if (incompletos.length) fila(`${incompletos.length} perfiles con datos básicos pendientes`, () => alIrA('personas'))
  if (duplicados.length) fila(`${duplicados.length} posible${duplicados.length === 1 ? '' : 's'} duplicado${duplicados.length === 1 ? '' : 's'} para revisar`, () => alIrA('personas'))
  recordatorios.forEach((evento) => fila(`${evento.faltan === 0 ? 'Hoy' : `En ${evento.faltan} días`}: ${evento.titulo}`, () => alIrA('agenda')))
  if (!incompletos.length && !duplicados.length && !recordatorios.length) trabajo.appendChild(elemento('p', ['ayuda'], 'No hay tareas administrativas pendientes.'))
  seccion.appendChild(trabajo)

  const estado = elemento('section', ['inicio-estado'])
  const enLinea = typeof navigator === 'undefined' || navigator.onLine !== false
  estado.append(elemento('strong', [], enLinea ? 'Conexión disponible' : 'Sin conexión'), elemento('span', [], enLinea ? 'Los cambios se guardan de forma segura al confirmar.' : 'Revisá la conexión antes de guardar cambios.'))
  if (tendencia?.texto) estado.appendChild(elemento('span', ['inicio-tendencia'], tendencia.texto))
  seccion.appendChild(estado)

  const proximos = elemento('section', ['inicio-proximos'])
  proximos.appendChild(elemento('h3', [], 'Próximas fechas'))
  eventosDe(roster).filter((evento) => evento.fecha >= new Date().toISOString().slice(0, 10)).slice(0, 5).forEach((evento) => {
    proximos.appendChild(elemento('p', ['inicio-fecha'], `${fechaLocal(evento.fecha)} · ${evento.tipo === 'cumpleanos' ? `Cumpleaños de ${evento.persona.nombre}` : evento.titulo}`))
  })
  seccion.appendChild(proximos)
  raiz.appendChild(seccion)
}
