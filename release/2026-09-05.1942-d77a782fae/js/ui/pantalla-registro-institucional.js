import { boton, elemento, vaciar } from './componentes.js'
import { evitarCortesHora, fechaDesdeUTC } from '../util/fechas.js'

const fechaLocal = (fecha) => evitarCortesHora(new Intl.DateTimeFormat('es-UY', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Montevideo' }).format(fechaDesdeUTC(fecha)))

async function pedirRegistro() {
  const respuesta = await fetch('/api/auditoria?limite=100')
  const datos = await respuesta.json()
  if (!respuesta.ok) throw new Error(datos.error || 'No se pudo actualizar el registro institucional.')
  return datos.actividad || []
}

export function crearPantallaRegistroInstitucional(raiz) {
  let actividad = []
  let buscando = ''
  let alcance = 'todo'
  let cargando = true
  let error = ''
  let pagina = 1
  const POR_PAGINA = 20

  async function cargar() {
    cargando = true
    error = ''
    dibujar()
    try { actividad = await pedirRegistro() } catch (fallo) { error = fallo.message } finally { cargando = false; dibujar() }
  }

  function dibujar() {
    vaciar(raiz)
    const seccion = elemento('section', ['registro-institucional-pantalla'])
    seccion.append(
      elemento('h1', [], 'Registro institucional'),
      elemento('p', ['ayuda-ajustes'], 'Trazabilidad de cambios de accesos, equipos, actividades y documentos. Solo Administración puede consultarlo.'),
    )
    const controles = elemento('div', ['registro-institucional-controles'])
    const buscar = document.createElement('input')
    buscar.type = 'search'; buscar.placeholder = 'Buscar por persona, acción o detalle'; buscar.value = buscando
    buscar.setAttribute('aria-label', 'Buscar en el registro institucional')
    buscar.addEventListener('input', () => { buscando = buscar.value; pagina = 1; dibujar() })
    const filtro = document.createElement('select')
    ;[['todo', 'Todos los cambios'], ['accesos', 'Solo accesos'], ['cms', 'Gestión institucional']].forEach(([valor, texto]) => filtro.appendChild(new Option(texto, valor)))
    filtro.value = alcance
    filtro.setAttribute('aria-label', 'Tipo de cambio del registro institucional')
    filtro.addEventListener('change', () => { alcance = filtro.value; pagina = 1; dibujar() })
    const actualizar = boton(cargando ? 'Actualizando...' : 'Actualizar', cargar)
    actualizar.disabled = cargando
    controles.append(buscar, filtro, actualizar)
    seccion.appendChild(controles)
    if (error) seccion.appendChild(elemento('p', ['error-ajustes'], error))
    if (cargando) {
      seccion.appendChild(elemento('p', ['ayuda-ajustes'], 'Actualizando el registro institucional...'))
      raiz.appendChild(seccion)
      return
    }
    const hoy = Date.now() - 24 * 60 * 60 * 1000
    const recientes = actividad.filter((evento) => new Date(`${evento.cuando}Z`).getTime() >= hoy).length
    const accesos = actividad.filter((evento) => /acceso|sesion|foto de perfil/i.test(`${evento.accion} ${evento.recurso}`)).length
    const resumen = elemento('div', ['resumen-registro'])
    ;[[actividad.length, 'cambios disponibles'], [recientes, 'en las últimas 24 horas'], [accesos, 'relacionados con accesos']].forEach(([cantidad, etiqueta]) => {
      const item = elemento('div', ['resumen-registro-item'])
      item.append(elemento('strong', [], String(cantidad)), elemento('span', [], etiqueta))
      resumen.appendChild(item)
    })
    seccion.appendChild(resumen)
    const termino = buscando.toLocaleLowerCase('es').trim()
    const visibles = actividad.filter((evento) => {
      const esAcceso = /acceso|sesion|foto de perfil/i.test(`${evento.accion} ${evento.recurso}`)
      if (alcance === 'accesos' && !esAcceso) return false
      if (alcance === 'cms' && esAcceso) return false
      return !termino || `${evento.actor_nombre} ${evento.accion} ${evento.detalle} ${evento.recurso}`.toLocaleLowerCase('es').includes(termino)
    })
    const totalPaginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA))
    pagina = Math.min(pagina, totalPaginas)
    const inicio = (pagina - 1) * POR_PAGINA
    const paginaVisible = visibles.slice(inicio, inicio + POR_PAGINA)
    const estadoResultados = elemento('p', ['registro-institucional-resultados'], visibles.length
      ? `Mostrando ${inicio + 1} a ${Math.min(inicio + POR_PAGINA, visibles.length)} de ${visibles.length} cambios`
      : 'No hay resultados')
    estadoResultados.setAttribute('role', 'status')
    estadoResultados.setAttribute('aria-live', 'polite')
    seccion.appendChild(estadoResultados)
    const lista = elemento('div', ['registro-institucional-lista', 'registro-institucional-lista-completa'])
    if (!visibles.length) lista.appendChild(elemento('p', ['ayuda-ajustes'], termino || alcance !== 'todo' ? 'No hay cambios que coincidan con este filtro.' : 'Todavía no hay cambios registrados.'))
    paginaVisible.forEach((evento) => {
      const fila = elemento('article', ['registro-institucional-evento'])
      if (/acceso|sesion|foto de perfil/i.test(`${evento.accion} ${evento.recurso}`)) fila.classList.add('registro-de-accesos')
      const cabecera = elemento('div', ['registro-institucional-evento-cabecera'])
      cabecera.append(elemento('strong', [], evento.accion), elemento('time', [], fechaLocal(evento.cuando)))
      fila.append(cabecera, elemento('span', [], evento.actor_nombre || evento.correo || 'Sin identificar'))
      if (evento.detalle || evento.recurso) fila.appendChild(elemento('p', ['ayuda-ajustes'], evento.detalle || evento.recurso))
      lista.appendChild(fila)
    })
    seccion.appendChild(lista)
    if (totalPaginas > 1) {
      const paginacion = elemento('nav', ['registro-institucional-paginacion'])
      paginacion.setAttribute('aria-label', 'Páginas del registro institucional')
      const anterior = boton('Anterior', () => { pagina = Math.max(1, pagina - 1); dibujar() })
      const siguiente = boton('Siguiente', () => { pagina = Math.min(totalPaginas, pagina + 1); dibujar() })
      anterior.disabled = pagina === 1
      siguiente.disabled = pagina === totalPaginas
      paginacion.append(anterior, elemento('span', [], `Página ${pagina} de ${totalPaginas}`), siguiente)
      seccion.appendChild(paginacion)
    }
    raiz.appendChild(seccion)
  }

  dibujar()
  cargar()
  return { redibujar: dibujar, recargar: cargar }
}
