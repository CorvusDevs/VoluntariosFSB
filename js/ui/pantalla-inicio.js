import { elemento, boton, vaciar } from './componentes.js'
import { eventosDe, recordatoriosDe } from '../modelo/agenda.js'
import { perfilesIncompletos, posiblesDuplicados } from '../modelo/roster.js'
import { coincide } from '../util/nombres.js'
import { evitarCortesHora, hoyISO } from '../util/fechas.js'

const fechaLocal = (fecha) => new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'long' }).format(new Date(`${fecha}T00:00:00`))

export function crearPantallaInicio(raiz, { roster, alertas = [], tendencia = null, ultimaSincronizacion = null, alIrA, esModuloCMS = false, alVolverCMS = null }) {
  function dibujarResultados(caja, texto) {
    caja.replaceChildren()
    const consulta = texto.trim()
    if (!consulta) return
    const destinos = [
      ['Armar lista', 'lista', 'Preparar la jornada'],
      ['Tomar asistencia', 'asistencias', 'Corregir asistencias'],
      ['Agenda', 'agenda', 'Fechas y alertas'],
      ['Personas', 'personas', 'Perfiles y fotos'],
      ['Reporte', 'reporte', 'Ver asistencia mensual'],
      ['Vista previa', 'vista-previa', 'Revisar o descargar la planilla'],
    ].filter(([etiqueta, , detalle]) => coincide(`${etiqueta} ${detalle}`, consulta))
    destinos.forEach(([etiqueta, destino, detalle]) => {
      const resultado = boton(`${etiqueta}: ${detalle}`, () => alIrA(destino))
      resultado.classList.add('inicio-resultado', 'inicio-resultado-destino')
      caja.appendChild(resultado)
    })
    const personas = [...roster.participantes, ...roster.voluntarios]
      .filter((persona) => persona.activo !== false && coincide(persona.nombre, consulta)).slice(0, 6)
    if (!personas.length && !destinos.length) {
      const vacio = elemento('div', ['estado-vacio', 'inicio-vacio'])
      vacio.append(
        elemento('p', [], 'No encontramos una persona, sección ni fecha con ese nombre.'),
        boton('Ver Personas', () => alIrA('personas')),
      )
      caja.appendChild(vacio)
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
  const encabezado = elemento('div', ['inicio-encabezado'])
  const textoEncabezado = elemento('div', [])
  textoEncabezado.append(
    elemento('h2', [], esModuloCMS ? 'Fútbol sin Barreras' : 'Hoy en Fútbol sin Barreras'),
    elemento('p', ['ayuda'], esModuloCMS ? 'Centro operativo del programa dentro de Aletea.' : 'Accesos y alertas para preparar la próxima jornada.'),
  )
  encabezado.append(textoEncabezado)
  if (esModuloCMS && alVolverCMS) encabezado.appendChild(boton('Volver a Aletea', alVolverCMS))
  seccion.appendChild(encabezado)
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
  buscar.type = 'search'; buscar.className = 'inicio-buscar'; buscar.placeholder = 'Buscar persona, sección o próxima fecha'; buscar.setAttribute('aria-label', 'Buscar en toda la organización')
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

  const leyenda = elemento('section', ['inicio-leyenda'])
  leyenda.append(
    elemento('strong', [], 'Guía rápida'),
    elemento('span', ['leyenda-grupo', 'grupo-1'], 'Grupo 1'),
    elemento('span', ['leyenda-grupo', 'grupo-2'], 'Grupo 2'),
    elemento('span', ['leyenda-voluntario'], 'Voluntariado'),
    elemento('span', ['leyenda-alerta'], 'Alerta o fecha importante'),
  )
  seccion.appendChild(leyenda)

  const trabajo = elemento('section', ['inicio-trabajo'])
  trabajo.appendChild(elemento('h3', [], 'Atención de coordinación'))
  const incompletos = perfilesIncompletos(roster)
  const duplicados = posiblesDuplicados(roster)
  const recordatorios = recordatoriosDe(roster)
  const fila = (texto, accion, clases = []) => trabajo.appendChild(boton(texto, accion, ['inicio-tarea', ...clases]))
  if (incompletos.length) {
    trabajo.appendChild(elemento('p', ['inicio-pendientes-resumen'], `${incompletos.length} perfiles con datos básicos pendientes`))
    incompletos.slice(0, 3).forEach((persona) => {
      fila(`Completar perfil: ${persona.nombre}`, () => alIrA('personas', { busqueda: persona.nombre }), ['inicio-tarea-prioritaria'])
    })
    if (incompletos.length > 3) fila(`Ver los ${incompletos.length} perfiles pendientes`, () => alIrA('personas'))
  }
  if (duplicados.length) fila(`${duplicados.length} posible${duplicados.length === 1 ? '' : 's'} duplicado${duplicados.length === 1 ? '' : 's'} para revisar`, () => alIrA('personas'))
  recordatorios.forEach((evento) => fila(`${evento.faltan === 0 ? 'Hoy' : `En ${evento.faltan} días`}: ${evento.titulo}`, () => alIrA('agenda')))
  if (!incompletos.length && !duplicados.length && !recordatorios.length) trabajo.appendChild(elemento('p', ['ayuda'], 'No hay tareas administrativas pendientes.'))
  seccion.appendChild(trabajo)

  const estado = elemento('section', ['inicio-estado'])
  const enLinea = typeof navigator === 'undefined' || navigator.onLine !== false
  const horaSincronizacion = ultimaSincronizacion
    ? evitarCortesHora(new Intl.DateTimeFormat('es-UY', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Montevideo' }).format(ultimaSincronizacion))
    : 'Aún no se guardaron cambios en esta sesión.'
  estado.append(
    elemento('strong', [], enLinea ? 'Listo para guardar' : 'Sin conexión'),
    elemento('span', [], enLinea ? 'Los cambios confirman su estado arriba de la pantalla.' : 'Los cambios no se guardarán hasta recuperar la conexión.'),
    elemento('span', ['inicio-sincronizacion'], ultimaSincronizacion ? `Última sincronización: ${horaSincronizacion}` : horaSincronizacion),
  )
  const resumenSemanal = elemento('section', ['inicio-semanal'])
  resumenSemanal.appendChild(elemento('h3', [], 'Resumen de la semana'))
  resumenSemanal.appendChild(elemento('p', [], tendencia?.texto ?? 'Todavía no hay jornadas registradas para calcular asistencia.'))
  resumenSemanal.appendChild(elemento('p', [], alertas.length ? `${alertas.length} alerta${alertas.length === 1 ? '' : 's'} a revisar antes de la próxima jornada.` : 'No hay alertas de asistencia pendientes.'))
  estado.appendChild(resumenSemanal)
  seccion.appendChild(estado)

  const proximos = elemento('section', ['inicio-proximos'])
  proximos.appendChild(elemento('h3', [], 'Próximas fechas'))
  eventosDe(roster).filter((evento) => evento.fecha >= hoyISO()).slice(0, 5).forEach((evento) => {
    proximos.appendChild(elemento('p', ['inicio-fecha'], `${fechaLocal(evento.fecha)} · ${evento.tipo === 'cumpleanos' ? `Cumpleaños de ${evento.persona.nombre}` : evento.titulo}`))
  })
  seccion.appendChild(proximos)
  raiz.appendChild(seccion)
}
