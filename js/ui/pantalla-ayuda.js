import { boton, elemento } from './componentes.js'

export const PREGUNTAS_AYUDA = Object.freeze([
  { categoria: 'Asistencia', fuente: 'Versión 1.2', pregunta: '¿Qué pasa con una persona archivada en el reporte mensual?', respuesta: 'Una persona archivada no aparece en un mes donde no tuvo actividad. Si tuvo una asistencia, una falta registrada o una corrección durante el período elegido, el reporte conserva esa fila para no perder el historial.' },
  { categoria: 'Equipos', fuente: 'Audio 1', pregunta: '¿Dónde creo un equipo nuevo?', respuesta: 'Entrá a Áreas y usá Nuevo equipo. Después podés asignar integrantes desde el propio equipo o desde Accesos.', destino: 'cms-areas', accion: 'Abrir Áreas' },
  { categoria: 'Equipos', fuente: 'Audio 1', pregunta: '¿Cómo agrego personas a un equipo?', respuesta: 'Desde Accesos, abrí la persona, desplegá Equipos asignados y elegí los equipos y funciones. También podés entrar a la pantalla del equipo y usar Gestionar integrantes para agregar, cambiar la función o quitar una persona.', destino: 'accesos', accion: 'Abrir Accesos', soloAdmin: true },
  { categoria: 'Equipos', fuente: 'Audio 1', pregunta: '¿Cómo cambio la función de una persona en el equipo?', respuesta: 'Abrí Gestionar integrantes dentro del equipo o Equipos asignados dentro de Accesos. Elegí Coordinación, Referente, Sustitución o Integrante y guardá el cambio.', destino: 'cms-areas', accion: 'Ver equipos', soloAdmin: true },
  { categoria: 'Equipos', fuente: 'Audio 1', pregunta: '¿Una persona puede integrar más de un equipo?', respuesta: 'Sí. En Accesos podés asignar la misma persona a varios equipos y darle una función distinta en cada uno.', destino: 'accesos', accion: 'Abrir Accesos', soloAdmin: true },
  { categoria: 'Proyectos y tareas', fuente: 'Audio 1', pregunta: '¿Cómo creo un proyecto dentro de Familias u otro equipo?', respuesta: 'Entrá al equipo correspondiente, buscá Proyectos y elegí Nuevo proyecto. El equipo queda preseleccionado cuando iniciás la acción desde su pantalla.', destino: 'cms-familias', accion: 'Abrir Familias' },
  { categoria: 'Proyectos y tareas', fuente: 'Audio 1', pregunta: '¿Qué diferencia hay entre proyecto, actividad y tarea?', respuesta: 'Un proyecto organiza un objetivo amplio. Una actividad representa un encuentro o evento con fecha. Una tarea es una acción concreta que una persona debe completar. Las actividades y tareas pueden quedar vinculadas al proyecto.' },
  { categoria: 'Proyectos y tareas', fuente: 'Audio 1', pregunta: '¿Cómo agrego tareas o actividades a un proyecto?', respuesta: 'Usá Nueva tarea o Nueva actividad y seleccioná el proyecto relacionado. Podés indicar responsable, equipo, prioridad, fecha y contexto.', destino: 'cms-trabajo', accion: 'Abrir Mi trabajo' },
  { categoria: 'Proyectos y tareas', fuente: 'Versión 1.2', pregunta: '¿Cómo agendo una actividad recurrente?', respuesta: 'En Agenda elegí Nueva actividad, completá la primera fecha y seleccioná Cada semana, Cada 2 semanas o Cada mes. Indicá hasta qué día debe repetirse. El gestor crea la serie completa, hasta un año, y después podés editar cada actividad por separado.', destino: 'cms-agenda', accion: 'Abrir Agenda' },
  { categoria: 'Proyectos y tareas', fuente: 'Versión 1.2', pregunta: '¿Cómo agendo una reunión recurrente?', respuesta: 'En Preparar reunión elegí Cada semana, Cada 2 semanas o Cada mes y una fecha final. El gestor crea cada reunión de la serie. La preparación, la minuta y las decisiones se registran de forma independiente en cada fecha.', destino: 'cms-agenda', accion: 'Abrir Agenda' },
  { categoria: 'Proyectos y tareas', fuente: 'Versión 1.2', pregunta: '¿Cuándo uso una tarea recurrente en lugar de una actividad recurrente?', respuesta: 'Usá una tarea recurrente para una acción de trabajo que vuelve a vencer, como revisar un informe. Usá una actividad recurrente para algo que ocupa una fecha en la agenda, como un curso. Usá una reunión recurrente cuando además necesitás preparación, minuta y decisiones por encuentro.' },
  { categoria: 'Proyectos y tareas', fuente: 'Versión 1.2', pregunta: '¿Qué significa esfuerzo estimado?', respuesta: 'Es la cantidad aproximada de horas de trabajo activo que requiere una tarea. No es el tiempo que falta hasta la fecha límite. Sirve para comparar la carga asignada con la disponibilidad semanal de las personas.' },
  { categoria: 'Proyectos y tareas', fuente: 'Versión 1.2', pregunta: '¿Qué es el programa de un proyecto?', respuesta: 'Un programa es una línea de trabajo estable que agrupa varios proyectos relacionados bajo un objetivo común. Por ejemplo, un programa de apoyo a familias puede reunir talleres, campañas y encuentros. Si el proyecto es independiente, podés elegir Sin programa.' },
  { categoria: 'Proyectos y tareas', fuente: 'Audio 1', pregunta: '¿Dónde veo todo lo relacionado con un proyecto?', respuesta: 'Abrí el proyecto desde la pantalla de su equipo. Allí se reúnen tareas, actividades, documentos, hitos, riesgos y seguimiento.' },
  { categoria: 'Accesos', fuente: 'Audio 2', pregunta: '¿Puedo dar acceso a coordinadores e integrantes?', respuesta: 'Sí. Una persona administradora puede crear el acceso, elegir el perfil y asignar uno o más equipos. Coordinación e Integrante necesitan al menos un equipo asignado.', destino: 'accesos', accion: 'Abrir Accesos', soloAdmin: true },
  { categoria: 'Accesos', fuente: 'Audio 2', pregunta: '¿Qué puede hacer cada perfil de acceso?', respuesta: 'Administración gestiona toda la institución y los accesos. Coordinación organiza el trabajo de sus equipos. Integrante consulta y actualiza el trabajo que le corresponde. Consulta tiene acceso limitado de lectura.' },
  { categoria: 'Accesos', fuente: 'Audio 2', pregunta: '¿Puedo asignarle una tarea a otra persona?', respuesta: 'Sí. En Nueva tarea elegí Responsable. La persona verá la asignación en su bandeja de trabajo y en sus notificaciones internas.', destino: 'cms-trabajo', accion: 'Crear una tarea' },
  { categoria: 'Notificaciones', fuente: 'Audio 2', pregunta: '¿Dónde veo las notificaciones de tareas?', respuesta: 'Las notificaciones aparecen dentro del gestor institucional. La persona debe ingresar para revisar nuevas asignaciones y seguimientos.', destino: 'cms-trabajo', accion: 'Abrir Mi trabajo' },
  { categoria: 'Notificaciones', fuente: 'Audio 2', pregunta: '¿El teléfono avisa automáticamente cuando me asignan una tarea?', respuesta: 'No por el momento. El sistema todavía no envía avisos automáticos al teléfono ni por correo. La bandeja interna es la fuente actual de notificaciones.' },
  { categoria: 'Notificaciones', fuente: 'Audio 2', pregunta: '¿Cómo sé si una notificación ya fue revisada?', respuesta: 'Las notificaciones internas distinguen las nuevas de las leídas. Al abrir la acción relacionada, el sistema te lleva al elemento correspondiente.' },
  { categoria: 'Notificaciones', fuente: 'Audio 3', pregunta: '¿Cómo reemplazamos los avisos cotidianos de WhatsApp?', respuesta: 'Cada persona revisa Mi trabajo y el contador de avisos al ingresar. Las asignaciones nuevas aparecen destacadas y abren la tarea exacta. WhatsApp queda como respaldo manual, no como canal obligatorio.', destino: 'cms-trabajo', accion: 'Abrir Mi trabajo' },
  { categoria: 'Notificaciones', fuente: 'Audio 3', pregunta: '¿Cómo preparo un aviso manual para una tarea?', respuesta: 'En la tarjeta de una tarea asignada usá Copiar aviso. El gestor prepara un mensaje breve con el nombre de la tarea y su enlace directo. Después elegís dónde pegarlo. Copiar no significa que el mensaje haya sido enviado o leído.', destino: 'cms-trabajo', accion: 'Abrir Mi trabajo' },
  { categoria: 'Notificaciones', fuente: 'Audio 3', pregunta: '¿Puedo copiar un resumen para todo un equipo?', respuesta: 'Sí. Entrá a la pantalla del equipo y usá Copiar resumen del equipo. El texto incluye la cantidad de tareas abiertas y hasta cinco títulos, sin copiar descripciones ni datos sensibles.', destino: 'cms-areas', accion: 'Ver equipos' },
  { categoria: 'Uso del sistema', fuente: 'Audio 3', pregunta: '¿Cómo sé quién todavía no está usando el gestor?', respuesta: 'Administración puede abrir Accesos. El resumen muestra quién nunca ingresó y quién lleva siete días o más sin entrar, para ofrecer acompañamiento sin depender de mensajes masivos.', destino: 'accesos', accion: 'Abrir Accesos', soloAdmin: true },
  { categoria: 'Materiales y enlaces', fuente: 'Audio 2', pregunta: '¿Puedo compartir un enlace de Canva en una tarea?', respuesta: 'Sí. Pegá el enlace en Descripción de la tarea junto con una explicación clara, por ejemplo Certificados del taller. El enlace queda guardado con el contexto de la tarea.', destino: 'cms-trabajo', accion: 'Crear o revisar una tarea' },
  { categoria: 'Materiales y enlaces', fuente: 'Versión 1.2', pregunta: '¿Cómo agrego un enlace de Google Drive o Canva a la Biblioteca?', respuesta: 'Abrí Biblioteca y elegí Agregar documento. En Enlace del recurso podés usar Pegar enlace o presionar Ctrl+V. El gestor reconoce la dirección aunque lo copiado incluya un título. Antes de guardar, comprobá en Drive o Canva que las personas destinatarias tengan permiso para abrir el material.', destino: 'cms-biblioteca', accion: 'Abrir Biblioteca' },
  { categoria: 'Materiales y enlaces', fuente: 'Audio 2', pregunta: '¿Dónde guardo documentos generales de un proyecto?', respuesta: 'Usá Biblioteca para registrar un documento o enlace y asociarlo al equipo o proyecto. Elegí la sensibilidad correcta antes de guardarlo.', destino: 'cms-biblioteca', accion: 'Abrir Biblioteca' },
  { categoria: 'Materiales y enlaces', fuente: 'Audio 2', pregunta: '¿Puedo subir un archivo directamente?', respuesta: 'Todavía no. La versión actual registra enlaces a materiales externos y documentos. Los archivos adjuntos requieren reglas de tamaño, privacidad, almacenamiento y respaldo antes de habilitarse.' },
  { categoria: 'Uso del sistema', fuente: 'Ambos audios', pregunta: '¿Qué hago si no encuentro una función?', respuesta: 'Buscá aquí una palabra relacionada con lo que querés hacer. Si la respuesta no existe o no coincide con la pantalla, registrá la duda para ampliar esta guía antes de modificar el sistema.' },
  { categoria: 'Uso del sistema', fuente: 'Ambos audios', pregunta: '¿Cómo sé qué cambió en una versión nueva?', respuesta: 'El gestor abre Cambios del sistema una vez cuando detecta una versión que todavía no viste. También podés abrir Cambios manualmente desde el final del panel lateral.' },
])

function normalizar(texto) {
  return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function filtrarPreguntas(consulta, guia = PREGUNTAS_AYUDA) {
  const termino = normalizar(consulta).trim()
  if (!termino) return [...guia]
  return guia.filter((item) => normalizar(`${item.categoria} ${item.pregunta} ${item.respuesta}`).includes(termino))
}

export function crearPantallaAyuda(raiz, { alIrA = () => {}, admin = false, busquedaInicial = '', alCopiarEnlace = null } = {}) {
  let categoriaActiva = 'Todas'
  const pantalla = elemento('main', ['pantalla-ayuda'])
  const cabecera = elemento('header', ['ayuda-cabecera'])
  cabecera.append(elemento('span', ['sobrelinea'], 'GUÍA DEL SISTEMA'), elemento('h1', [], 'Ayuda y preguntas frecuentes'), elemento('p', ['ayuda'], 'Respuestas rápidas para usar equipos, proyectos, tareas, accesos, notificaciones y materiales.'))
  const buscar = document.createElement('input')
  buscar.type = 'search'
  buscar.className = 'ayuda-buscador'
  buscar.placeholder = 'Buscar, por ejemplo: equipo, proyecto, Canva o notificación'
  buscar.setAttribute('aria-label', 'Buscar en la ayuda')
  buscar.value = busquedaInicial
  const estadoCopia = elemento('span', ['ayuda-copia-estado'])
  estadoCopia.setAttribute('aria-live', 'polite')
  if (alCopiarEnlace) {
    const copiar = boton('Copiar enlace', async () => {
      try {
        await alCopiarEnlace(buscar.value.trim())
        estadoCopia.textContent = buscar.value.trim() ? 'Enlace a esta búsqueda copiado.' : 'Enlace a Ayuda copiado.'
      } catch {
        estadoCopia.textContent = 'No se pudo copiar. Revisá el permiso del navegador.'
      }
    })
    cabecera.append(copiar, estadoCopia)
  }
  const resumen = elemento('p', ['ayuda-resultados'])
  resumen.setAttribute('aria-live', 'polite')
  const lista = elemento('section', ['ayuda-lista'])
  const categorias = elemento('nav', ['ayuda-categorias'])
  categorias.setAttribute('aria-label', 'Categorías de ayuda')
  const dibujar = () => {
    lista.replaceChildren()
    categorias.replaceChildren()
    const permitidas = filtrarPreguntas(buscar.value).filter((item) => !item.soloAdmin || admin)
    const nombresCategorias = ['Todas', ...new Set(permitidas.map((item) => item.categoria))]
    if (!nombresCategorias.includes(categoriaActiva)) categoriaActiva = 'Todas'
    nombresCategorias.forEach((nombre) => {
      const control = boton(nombre, () => { categoriaActiva = nombre; dibujar() }, ['ayuda-categoria-filtro'])
      control.setAttribute('aria-pressed', String(categoriaActiva === nombre))
      categorias.appendChild(control)
    })
    const visibles = permitidas.filter((item) => categoriaActiva === 'Todas' || item.categoria === categoriaActiva)
    resumen.textContent = `${visibles.length} ${visibles.length === 1 ? 'respuesta encontrada' : 'respuestas encontradas'}`
    if (!visibles.length) {
      lista.appendChild(elemento('div', ['ayuda-vacia'], 'No encontramos una respuesta. Probá otra palabra o registrá la pregunta para ampliar esta guía.'))
      return
    }
    let categoriaAnterior = ''
    visibles.forEach((item) => {
      if (categoriaActiva === 'Todas' && categoriaAnterior !== item.categoria) {
        lista.appendChild(elemento('h2', ['ayuda-seccion-titulo'], item.categoria))
        categoriaAnterior = item.categoria
      }
      const detalle = elemento('details', ['ayuda-pregunta'])
      detalle.dataset.fuente = item.fuente
      const contenido = elemento('div', ['ayuda-respuesta'])
      contenido.append(elemento('span', ['ayuda-categoria'], item.categoria), elemento('p', [], item.respuesta))
      if (item.destino) contenido.appendChild(boton(item.accion, () => alIrA(item.destino)))
      detalle.append(elemento('summary', [], item.pregunta), contenido)
      lista.appendChild(detalle)
    })
  }
  buscar.addEventListener('input', dibujar)
  pantalla.append(cabecera, buscar, categorias, resumen, lista)
  dibujar()
  raiz.appendChild(pantalla)
  return pantalla
}
