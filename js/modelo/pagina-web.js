import { normalizarEnlaceUsuario } from '../util/enlaces.js'

const MAXIMO_JSON = 220_000
const ESTILOS_TIPOGRAFICOS = new Set(['institucional', 'expresiva'])
const TIPOGRAFIAS_REQUERIDAS = Object.freeze(['portada', 'cifrasTitulo', 'cifrasNumeros', 'participacion', 'actividades', 'formacion', 'actualidad'])
const TIPOGRAFIAS_OPCIONALES = Object.freeze(['areas', 'institucion', 'familias', 'adultosAutistas', 'biblioteca', 'recursos', 'tienda', 'donaciones', 'contacto', 'orientacion', 'redes'])

export const SECCIONES_PAGINA_WEB = Object.freeze([
  { id: 'portada', titulo: 'Portada', ayuda: 'El primer mensaje que recibe una persona al entrar al sitio.', rutas: ['portada', 'proposito'] },
  { id: 'impacto', titulo: 'Cifras', ayuda: 'Números institucionales y comportamiento de su animación.', rutas: ['impacto'] },
  { id: 'areas', titulo: 'Áreas', ayuda: 'Mapa de áreas, orden, visibilidad y enlaces.', rutas: ['mapaAreas', 'areas'] },
  { id: 'institucion', titulo: 'Quiénes somos', ayuda: 'Presentación, historia, misión, visión y equipo de Aletea.', rutas: ['historia', 'paginas.institucion'] },
  { id: 'actividades', titulo: 'Qué hacemos', ayuda: 'Actividades, programas y propuestas institucionales.', rutas: ['paginas.actividades'] },
  { id: 'familias', titulo: 'Familias', ayuda: 'Orientación, comunidad y accesos pensados para familias.', rutas: ['paginas.familias'] },
  { id: 'adultos-autistas', titulo: 'Adultos autistas', ayuda: 'Encuentro, orientación, derechos y oportunidades para la vida adulta.', rutas: ['paginas.adultosAutistas'] },
  { id: 'formacion', titulo: 'Formación', ayuda: 'Cursos, talleres y propuestas para profesionales e instituciones.', rutas: ['paginas.formacion'] },
  { id: 'biblioteca', titulo: 'Biblioteca', ayuda: 'Publicaciones, materiales, entrevistas y sitios de interés.', rutas: ['paginas.biblioteca'] },
  { id: 'recursos', titulo: 'Recursos', ayuda: 'Selección visual de guías, materiales y enlaces recomendados.', rutas: ['paginas.recursos'] },
  { id: 'tienda', titulo: 'Tienda', ayuda: 'Presentación, productos, fotos, disponibilidad y formas de consulta.', rutas: ['tienda', 'paginas.tienda'] },
  { id: 'donaciones', titulo: 'Donaciones', ayuda: 'Texto y opciones de aporte.', rutas: ['paginas.donaciones'] },
  { id: 'contacto', titulo: 'Contacto', ayuda: 'Presentación y motivos de consulta.', rutas: ['paginas.contacto'] },
  { id: 'participacion', titulo: 'Participación', ayuda: 'Invitación y botones para sumarse o colaborar.', rutas: ['participacion'] },
  { id: 'orientacion', titulo: 'Orientación', ayuda: 'Accesos rápidos según lo que necesita cada visitante.', rutas: ['orientacion'] },
  { id: 'actualidad', titulo: 'Actualidad', ayuda: 'Noticias, campañas y proyectos con fecha, imagen y contenido completo.', rutas: ['paginas.actualidad'] },
  { id: 'redes', titulo: 'Redes sociales', ayuda: 'Perfiles, nombres, enlaces, colores y visibilidad.', rutas: ['redes', 'organizacion.redes'] },
  { id: 'general', titulo: 'Datos generales', ayuda: 'Nombre, contacto, menú y datos para buscadores y redes.', rutas: ['organizacion', 'navegacion', 'seo'] },
  { id: 'apariencia', titulo: 'Apariencia del sitio', ayuda: 'Movimiento y elementos visuales con opciones seguras y accesibles.', rutas: ['aparienciaSitio'] },
  { id: 'calidad', titulo: 'Publicación y calidad', ayuda: 'Revisión clara del contenido antes de guardar o publicar en prueba.', rutas: ['editorial', 'seo'] },
  { id: 'privacidad', titulo: 'Aviso de privacidad', ayuda: 'Página pública que explica qué datos se reciben, para qué se usan y cómo ejercer derechos.', rutas: ['paginas.privacidad'] },
  { id: 'operacion', titulo: 'Operación y privacidad', ayuda: 'Métricas, conservación de datos, inventario y pagos con límites seguros.', rutas: ['operacionWeb'] },
])

const ETIQUETAS = Object.freeze({
  etiqueta: 'Etiqueta breve', titulo: 'Título', descripcion: 'Descripción', introduccion: 'Introducción', texto: 'Texto', resumen: 'Resumen', detalle: 'Detalle',
  tituloAntes: 'Primera parte del título', tituloDestacado: 'Parte destacada', tituloDespues: 'Cierre del título', bajada: 'Texto de presentación',
  src: 'Imagen', textoAlternativo: 'Descripción de la imagen', focoX: 'Encuadre horizontal', focoY: 'Encuadre vertical', imagen: 'Imagen', accion: 'Botón', accionPrincipal: 'Botón principal', accionSecundaria: 'Botón secundario',
  notaTitulo: 'Título de la nota', notaTexto: 'Texto de la nota', antes: 'Primera palabra', destacado: 'Palabra destacada', despues: 'Última palabra',
  nota: 'Nota aclaratoria', duracionMs: 'Duración de la animación', escalonadoMs: 'Demora entre cifras', desplazamientoPx: 'Desplazamiento', mostrarHilo: 'Mostrar línea animada', reproducirUnaVez: 'Reproducir una sola vez',
  cifras: 'Cifras', valor: 'Número', prefijo: 'Prefijo', sufijo: 'Sufijo', centroTexto: 'Texto central', areas: 'Áreas', id: 'Identificador interno', nombre: 'Nombre', color: 'Color', enlace: 'Enlace', visible: 'Visible', orden: 'Orden',
  acciones: 'Botones', bloques: 'Bloques de contenido', elementos: 'Elementos', equipo: 'Equipo', grupo: 'Grupo', integrantes: 'Integrantes', recursos: 'Recursos', productos: 'Productos', novedades: 'Publicaciones', propuestasFormativas: 'Próximas propuestas', formularios: 'Formularios públicos', categoria: 'Categoría', responsable: 'Equipo responsable', categoriaFormacion: 'Tipo de formación', fecha: 'Fecha', contenido: 'Contenido completo', opciones: 'Opciones', monto: 'Monto', precio: 'Precio', disponibilidad: 'Disponibilidad', motivos: 'Motivos', propuestas: 'Actividades', accionEtiqueta: 'Texto del botón',
  queEs: 'Qué es', paraQuien: 'Para quién', area: 'Área', edad: 'Edad', dia: 'Día', cuando: 'Cuándo', donde: 'Dónde', modalidad: 'Modalidad', duracion: 'Duración', horarios: 'Horarios', proximaEdicion: 'Próxima edición', costo: 'Costo', cupos: 'Cupos', comoParticipar: 'Cómo participar', estadoInscripcion: 'Inscripción', vigencia: 'Vigencia',
  correo: 'Correo', whatsapp: 'WhatsApp', instagram: 'Instagram', redes: 'Redes sociales', red: 'Red', navegacion: 'Menú', organizacion: 'Organización', seo: 'Buscadores y redes', portada: 'Portada', proposito: 'Propósito', impacto: 'Cifras', mapaAreas: 'Mapa de áreas', historia: 'Historia', participacion: 'Participación', orientacion: 'Orientación', actualidad: 'Actualidad', tienda: 'Tienda', paginas: 'Páginas', animacion: 'Animación',
  operacionWeb: 'Operación y privacidad', analitica: 'Métricas', privacidad: 'Privacidad', inventario: 'Inventario', pagos: 'Pagos', activa: 'Activar métricas', proveedor: 'Proveedor', retencionDias: 'Conservar detalle', revisarCada: 'Revisión', conservarConsultasMeses: 'Conservar consultas', confirmarStockAntesDeCobrar: 'Confirmar disponibilidad antes de cobrar', modo: 'Método', estados: 'Estados disponibles', avisoEnlace: 'Enlace al aviso de privacidad',
})

const AYUDAS = Object.freeze({
  id: 'Se usa para el enlace interno. Escribilo en minúsculas, sin espacios.',
  textoAlternativo: 'Contá brevemente qué muestra la imagen para personas que no pueden verla.',
  focoX: 'Define qué zona horizontal permanece visible en distintos tamaños.',
  focoY: 'Define qué zona vertical permanece visible en distintos tamaños.',
  src: 'Usá una imagen ya cargada en el sitio. La dirección comienza con /assets/images/.',
  enlace: 'Puede ser una dirección completa o una ruta del sitio, por ejemplo /contacto/.',
  formularios: 'Creá primero el formulario en Formularios. Después copiá su enlace público en esta tarjeta.',
  responsable: 'Nombre público del equipo que recibe y da seguimiento. No escribas nombres de personas.',
  area: 'Elegí el área institucional a la que pertenece esta actividad.',
  dia: 'Día habitual o fecha breve que las personas podrán usar para filtrar.',
  duracionMs: 'Tiempo en milisegundos que tardan los números en llegar al valor final.',
  escalonadoMs: 'Espera en milisegundos antes de iniciar la siguiente cifra.',
  desplazamientoPx: 'Movimiento vertical suave al aparecer, en píxeles.',
  seo: 'Esta información aparece al compartir el enlace y en buscadores.',
  retencionDias: 'Aletea conservará resultados detallados solo durante este período.',
  conservarConsultasMeses: 'Las consultas sin seguimiento se eliminarán al finalizar este período.',
  confirmarStockAntesDeCobrar: 'Evita cobrar un producto cuya disponibilidad todavía no fue confirmada.',
})

const PLURALES = Object.freeze({
  cifras: 'cifra', areas: 'área', acciones: 'botón', redes: 'red social', navegacion: 'enlace', bloques: 'bloque', equipo: 'grupo', integrantes: 'integrante', elementos: 'elemento', recursos: 'recurso', productos: 'producto', novedades: 'publicación', propuestasFormativas: 'propuesta', formularios: 'formulario', opciones: 'opción', motivos: 'motivo', propuestas: 'actividad',
})

export function clonarContenidoPaginaWeb(contenido) {
  return JSON.parse(JSON.stringify(contenido ?? {}))
}

export function valorEnRuta(objeto, ruta) {
  return String(ruta).split('.').reduce((valor, clave) => valor?.[clave], objeto)
}

export function asignarEnRuta(objeto, ruta, valor) {
  const partes = String(ruta).split('.')
  const ultima = partes.pop()
  const destino = partes.reduce((actual, clave) => (actual[clave] ??= {}), objeto)
  destino[ultima] = valor
  return objeto
}

export function etiquetaCampo(clave) {
  return ETIQUETAS[clave] || String(clave).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letra) => letra.toUpperCase())
}

export function ayudaCampo(clave) {
  return AYUDAS[clave] || ''
}

export function singularDeLista(clave) {
  return PLURALES[clave] || 'elemento'
}

export function tipoCampo(clave, valor) {
  if (typeof valor === 'boolean') return 'checkbox'
  if (typeof valor === 'number') return 'number'
  if (clave === 'fecha') return 'date'
  if (clave === 'correo') return 'email'
  if (clave === 'enlace' || clave.endsWith('Enlace') || clave === 'instagram' || clave === 'src') return 'url'
  if (['texto', 'descripcion', 'introduccion', 'resumen', 'detalle', 'bajada', 'notaTexto', 'queEs', 'comoParticipar', 'contenido'].includes(clave)) return 'textarea'
  return 'text'
}

export function maximoCampo(clave) {
  if (clave === 'titulo') return 90
  if (clave === 'descripcion') return 420
  if (clave === 'introduccion' || clave === 'texto' || clave === 'resumen' || clave === 'detalle' || clave === 'bajada') return 600
  if (clave === 'etiqueta') return 45
  if (clave === 'textoAlternativo') return 180
  if (clave === 'contenido') return 4000
  if (clave === 'enlace' || clave.endsWith('Enlace') || clave === 'instagram' || clave === 'src') return 500
  return 180
}

function esEnlaceValido(valor) {
  if (!valor) return true
  if (valor.startsWith('/')) return !valor.startsWith('//')
  try {
    const url = new URL(valor)
    return ['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol)
  } catch { return false }
}

function esFechaIsoValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const [anio, mes, dia] = valor.split('-').map(Number)
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia
}

export function validarContenidoPaginaWeb(contenido) {
  const errores = []
  if (!contenido || typeof contenido !== 'object' || Array.isArray(contenido)) return ['El contenido de la página no es válido.']
  if (contenido.versionContrato !== 1) errores.push('La versión del contenido debe ser 1.')
  if (contenido.demostracion !== undefined) {
    const demostracion = contenido.demostracion
    if (!demostracion || typeof demostracion !== 'object' || Array.isArray(demostracion)) errores.push('La configuración de demostración no es válida.')
    else if (typeof demostracion.activa !== 'boolean' || !String(demostracion.titulo || '').trim() || !String(demostracion.aviso || '').trim()) errores.push('Completá el estado, título y aviso de la demostración.')
  }
  if (contenido.tipografia !== undefined) {
    if (!contenido.tipografia || typeof contenido.tipografia !== 'object' || Array.isArray(contenido.tipografia)) errores.push('La configuración tipográfica no es válida.')
    else TIPOGRAFIAS_REQUERIDAS.forEach((clave) => {
      if (!ESTILOS_TIPOGRAFICOS.has(contenido.tipografia[clave])) errores.push(`Elegí un estilo tipográfico válido para ${clave}.`)
    })
    TIPOGRAFIAS_OPCIONALES.forEach((clave) => {
      if (contenido.tipografia?.[clave] !== undefined && !ESTILOS_TIPOGRAFICOS.has(contenido.tipografia[clave])) errores.push(`Elegí un estilo tipográfico válido para ${clave}.`)
    })
  }
  if (contenido.aparienciaSitio !== undefined) {
    const apariencia = contenido.aparienciaSitio
    if (!apariencia || typeof apariencia !== 'object' || Array.isArray(apariencia)) errores.push('La configuración de apariencia no es válida.')
    else {
      if (!['sin_movimiento', 'suave', 'normal'].includes(apariencia.movimiento)) errores.push('Elegí un nivel de movimiento válido.')
      ;['mostrarListon', 'mostrarOrbita', 'mostrarRedAreas'].forEach((clave) => {
        if (typeof apariencia[clave] !== 'boolean') errores.push(`Indicá si debe mostrarse ${etiquetaCampo(clave).toLowerCase()}.`)
      })
    }
  }
  const requeridos = ['editorial', 'seo', 'organizacion', 'navegacion', 'portada', 'proposito', 'impacto', 'mapaAreas', 'areas', 'historia', 'participacion', 'orientacion', 'actualidad', 'tienda', 'redes', 'paginas']
  requeridos.forEach((clave) => { if (contenido[clave] === undefined || contenido[clave] === null) errores.push(`Falta la sección ${etiquetaCampo(clave)}.`) })
  const navegacionEsperada = ['Aletea', 'Qué hacemos', 'Para familias', 'Recursos', 'Participá']
  if (!Array.isArray(contenido.navegacion) || contenido.navegacion.length !== navegacionEsperada.length) errores.push('El menú debe tener los 5 grupos institucionales acordados.')
  if (Array.isArray(contenido.navegacion)) contenido.navegacion.forEach((item, indice) => {
    if (!item?.etiqueta || String(item.etiqueta).length > 32) errores.push(`Usá hasta 32 caracteres en la sección ${indice + 1} del menú.`)
    if (!item?.enlace || !esEnlaceValido(item.enlace)) errores.push(`El enlace de la sección ${indice + 1} del menú no es válido.`)
    if (item?.visible !== undefined && typeof item.visible !== 'boolean') errores.push(`Indicá si la sección ${indice + 1} del menú debe mostrarse.`)
    if (item?.orden !== undefined && (!Number.isInteger(item.orden) || item.orden < 1)) errores.push(`La posición de la sección ${indice + 1} del menú no es válida.`)
  })
  if (Array.isArray(contenido.navegacion) && contenido.navegacion.some((item) => item.visible === false)) errores.push('Los 5 grupos del menú deben estar visibles.')
  if (Array.isArray(contenido.navegacion) && contenido.navegacion.map((item) => item.etiqueta).join('|') !== navegacionEsperada.join('|')) errores.push('Usá Aletea, Qué hacemos, Para familias, Recursos y Participá en ese orden.')
  if (!Array.isArray(contenido.areas) || contenido.areas.length > 8) errores.push('La página puede tener hasta 8 áreas.')
  if (!Array.isArray(contenido.impacto?.cifras) || contenido.impacto.cifras.length > 6) errores.push('La página puede tener hasta 6 cifras.')
  if (!Array.isArray(contenido.organizacion?.redes) || contenido.organizacion.redes.length > 12) errores.push('La página puede mostrar hasta 12 redes sociales.')
  const propuestas = contenido.paginas?.actividades?.propuestas
  if (propuestas !== undefined && (!Array.isArray(propuestas) || propuestas.length > 30)) errores.push('La página puede tener hasta 30 actividades.')
  if (Array.isArray(propuestas)) propuestas.forEach((propuesta, indice) => {
    if (!propuesta || typeof propuesta !== 'object') return errores.push(`La actividad ${indice + 1} no es válida.`)
    if (propuesta.vigencia !== undefined && !['Vigente', 'Histórica'].includes(propuesta.vigencia)) errores.push(`Elegí si la actividad ${indice + 1} está vigente o es histórica.`)
    if (propuesta.visible && (!propuesta.titulo || !propuesta.queEs || !propuesta.paraQuien || !propuesta.cuando)) errores.push(`Completá título, qué es, para quién y cuándo en la actividad ${indice + 1} antes de mostrarla.`)
    if (propuesta.visible && ((propuesta.area !== undefined && !String(propuesta.area).trim()) || (propuesta.dia !== undefined && !String(propuesta.dia).trim()))) errores.push(`Completá área y día en la actividad ${indice + 1} antes de mostrarla.`)
    if (propuesta.visible && propuesta.vigencia !== 'Histórica' && (!propuesta.accion?.etiqueta || !propuesta.accion?.enlace || !esEnlaceValido(propuesta.accion.enlace))) errores.push(`Completá el botón de la actividad ${indice + 1} con un enlace válido.`)
  })
  ;['familias', 'adultosAutistas', 'formacion', 'privacidad'].forEach((nombre) => {
    const pagina = contenido.paginas?.[nombre]
    if (pagina === undefined) return
    if (!pagina || typeof pagina !== 'object' || Array.isArray(pagina)) return errores.push(`La página ${etiquetaCampo(nombre)} no es válida.`)
    if (typeof pagina.visible !== 'boolean') errores.push(`Indicá si la página ${etiquetaCampo(nombre)} debe mostrarse.`)
    if (pagina.visible && (!pagina.etiqueta || !pagina.titulo || !pagina.introduccion)) errores.push(`Completá identificación, título e introducción de ${etiquetaCampo(nombre)} antes de mostrarla.`)
    if (pagina.visible && (!Array.isArray(pagina.bloques) || !pagina.bloques.length)) errores.push(`Agregá al menos un bloque a ${etiquetaCampo(nombre)} antes de mostrarla.`)
    if (pagina.visible && (!Array.isArray(pagina.acciones) || !pagina.acciones.length)) errores.push(`Agregá al menos un botón a ${etiquetaCampo(nombre)} antes de mostrarla.`)
  })
  const paginaFormacion = contenido.paginas?.formacion
  if (paginaFormacion && paginaFormacion.propuestasFormativas !== undefined) {
    const propuestasFormativas = Array.isArray(paginaFormacion.propuestasFormativas) ? paginaFormacion.propuestasFormativas : null
    if (!propuestasFormativas || propuestasFormativas.length > 30) errores.push('Formación puede tener hasta 30 propuestas.')
    const visibles = propuestasFormativas?.filter((propuesta) => propuesta?.visible) || []
    if (paginaFormacion.visible && !visibles.length) errores.push('Mostrá al menos una propuesta completa antes de activar la página Formación.')
    propuestasFormativas?.forEach((propuesta, indice) => {
      if (!propuesta || typeof propuesta !== 'object' || Array.isArray(propuesta)) return errores.push(`La propuesta formativa ${indice + 1} no es válida.`)
      if (typeof propuesta.visible !== 'boolean') errores.push(`Indicá si la propuesta formativa ${indice + 1} debe mostrarse.`)
      if (!Number.isInteger(propuesta.orden) || propuesta.orden < 1) errores.push(`Indicá la posición de la propuesta formativa ${indice + 1}.`)
      if (!propuesta.visible) return
      const categoriaValida = ['Profesional', 'Instituciones', 'Taller abierto'].includes(propuesta.categoriaFormacion)
      const modalidadValida = ['Presencial', 'Virtual', 'Híbrida'].includes(propuesta.modalidad)
      const inscripcionValida = ['Abierta', 'Cerrada', 'Próximamente'].includes(propuesta.estadoInscripcion)
      if (!propuesta.titulo || !categoriaValida || !propuesta.proximaEdicion || !modalidadValida || !propuesta.duracion || !propuesta.horarios || !propuesta.precio || !inscripcionValida) errores.push(`Completá los datos de la propuesta formativa ${indice + 1} antes de mostrarla.`)
      if (!propuesta.accion?.etiqueta || !propuesta.accion?.enlace || !esEnlaceValido(propuesta.accion.enlace)) errores.push(`Completá el botón de la propuesta formativa ${indice + 1} con un enlace válido.`)
    })
  }
  const paginaRecursos = contenido.paginas?.recursos
  if (paginaRecursos !== undefined) {
    if (!paginaRecursos || typeof paginaRecursos !== 'object' || Array.isArray(paginaRecursos)) errores.push('La página Recursos no es válida.')
    else {
      if (typeof paginaRecursos.visible !== 'boolean') errores.push('Indicá si la página Recursos debe mostrarse.')
      if (paginaRecursos.visible && (!paginaRecursos.etiqueta || !paginaRecursos.titulo || !paginaRecursos.introduccion || !paginaRecursos.imagen?.src || !paginaRecursos.imagen?.textoAlternativo)) errores.push('Completá textos e imagen de Recursos antes de mostrarla.')
      if (paginaRecursos.visible && (!Array.isArray(paginaRecursos.recursos) || !paginaRecursos.recursos.length)) errores.push('Agregá al menos un recurso antes de mostrar la página Recursos.')
      if (paginaRecursos.visible) paginaRecursos.recursos?.forEach((recurso, indice) => {
        if (!recurso?.titulo || !recurso?.categoria || !recurso?.enlace || !esEnlaceValido(recurso.enlace)) errores.push(`Completá título, categoría y enlace del recurso ${indice + 1}.`)
      })
    }
  }
  const paginaTienda = contenido.paginas?.tienda
  if (paginaTienda !== undefined) {
    if (!paginaTienda || typeof paginaTienda !== 'object' || Array.isArray(paginaTienda)) errores.push('La página Tienda no es válida.')
    else {
      if (typeof paginaTienda.visible !== 'boolean') errores.push('Indicá si la página Tienda debe mostrarse.')
      if (paginaTienda.visible && (!paginaTienda.etiqueta || !paginaTienda.titulo || !paginaTienda.introduccion || !paginaTienda.imagen?.src || !paginaTienda.imagen?.textoAlternativo)) errores.push('Completá textos e imagen de Tienda antes de mostrarla.')
      const productosVisibles = Array.isArray(paginaTienda.productos) ? paginaTienda.productos.filter((producto) => producto?.visible) : []
      if (paginaTienda.visible && !productosVisibles.length) errores.push('Mostrá al menos un producto completo antes de activar la página Tienda.')
      productosVisibles.forEach((producto, indice) => {
        if (!producto.nombre || !producto.descripcion || !producto.imagen?.src || !producto.imagen?.textoAlternativo || !producto.enlace || !esEnlaceValido(producto.enlace)) errores.push(`Completá nombre, descripción, foto y enlace del producto visible ${indice + 1}.`)
        if (!['Disponible', 'Pocas unidades', 'Agotado', 'Por encargo'].includes(producto.disponibilidad)) errores.push(`Elegí una disponibilidad válida para el producto visible ${indice + 1}.`)
      })
    }
  }
  const paginaActualidad = contenido.paginas?.actualidad
  if (paginaActualidad !== undefined) {
    if (!paginaActualidad || typeof paginaActualidad !== 'object' || Array.isArray(paginaActualidad)) errores.push('La página Actualidad no es válida.')
    else {
      if (typeof paginaActualidad.visible !== 'boolean') errores.push('Indicá si la página Actualidad debe mostrarse.')
      if (!Array.isArray(paginaActualidad.novedades) || paginaActualidad.novedades.length > 30) errores.push('Actualidad puede tener hasta 30 publicaciones.')
      const novedades = Array.isArray(paginaActualidad.novedades) ? paginaActualidad.novedades : []
      novedades.forEach((novedad, indice) => {
        if (!novedad || typeof novedad !== 'object' || Array.isArray(novedad)) return errores.push(`La publicación ${indice + 1} no tiene un formato válido.`)
        if (typeof novedad.visible !== 'boolean') errores.push(`Indicá si la publicación ${indice + 1} debe mostrarse.`)
        if (!Number.isInteger(novedad.orden) || novedad.orden < 1) errores.push(`Indicá la posición de la publicación ${indice + 1}.`)
      })
      const visibles = novedades.filter((novedad) => novedad?.visible)
      if (paginaActualidad.visible && (!paginaActualidad.etiqueta || !paginaActualidad.titulo || !paginaActualidad.introduccion)) errores.push('Completá identificación, título e introducción de Actualidad antes de mostrarla.')
      if (paginaActualidad.visible && !visibles.length) errores.push('Mostrá al menos una publicación completa antes de activar la página Actualidad.')
      visibles.forEach((novedad, indice) => {
        const fechaValida = esFechaIsoValida(novedad.fecha)
        if (!novedad.titulo || !novedad.categoria || !novedad.resumen || !novedad.contenido || !fechaValida || !novedad.imagen?.src || !novedad.imagen?.textoAlternativo) errores.push(`Completá fecha, categoría, textos e imagen de la publicación ${indice + 1}.`)
      })
    }
  }
  const formularios = contenido.paginas?.contacto?.formularios
  if (formularios !== undefined && (!Array.isArray(formularios) || formularios.length > 12)) errores.push('Contacto puede tener hasta 12 formularios públicos.')
  if (Array.isArray(formularios)) formularios.forEach((formulario, indice) => {
    if (!formulario || typeof formulario !== 'object' || Array.isArray(formulario)) return errores.push(`El formulario público ${indice + 1} no es válido.`)
    if (typeof formulario.visible !== 'boolean') errores.push(`Indicá si el formulario público ${indice + 1} debe mostrarse.`)
    if (!Number.isInteger(formulario.orden) || formulario.orden < 1) errores.push(`Indicá la posición del formulario público ${indice + 1}.`)
    if (!formulario.visible) return
    const categoriaValida = ['Familias', 'Actividades', 'Formación', 'Voluntariado', 'Donaciones', 'Tienda', 'Institucional'].includes(formulario.categoria)
    const ejemploInerte = contenido.demostracion?.activa === true && formulario.esEjemplo === true && formulario.enlace === ''
    const enlaceValido = ejemploInerte || /^https:\/\/gestor\.aletea\.org\/formulario\.html\?id=[a-zA-Z0-9_-]+$/.test(formulario.enlace || '')
    const responsableValido = formulario.responsable === undefined || String(formulario.responsable).trim().length > 0
    if (!formulario.titulo || !formulario.descripcion || !formulario.accionEtiqueta || !categoriaValida || !enlaceValido || !responsableValido) errores.push(`Completá los datos, el equipo responsable y usá el enlace público del gestor en el formulario ${indice + 1} antes de mostrarlo.`)
  })
  const operacion = contenido.operacionWeb
  if (operacion !== undefined) {
    if (!operacion || typeof operacion !== 'object' || Array.isArray(operacion)) errores.push('La configuración de operación y privacidad no es válida.')
    else {
      const analitica = operacion.analitica || {}
      const privacidad = operacion.privacidad || {}
      const inventario = operacion.inventario || {}
      const pagos = operacion.pagos || {}
      if (typeof analitica.activa !== 'boolean') errores.push('Indicá si las métricas están activas.')
      if (analitica.proveedor !== 'Cloudflare Web Analytics') errores.push('La configuración inicial admite solamente Cloudflare Web Analytics.')
      if (![30, 90, 180].includes(Number(analitica.retencionDias))) errores.push('Elegí una conservación de métricas válida.')
      if (!['Mensual', 'Trimestral'].includes(analitica.revisarCada)) errores.push('Elegí una frecuencia válida para revisar las métricas.')
      if (analitica.datosPersonales !== false) errores.push('Las métricas no pueden recibir datos personales ni información de formularios.')
      if (analitica.activa && (!privacidad.avisoEnlace || !esEnlaceValido(privacidad.avisoEnlace))) errores.push('Publicá un enlace válido al aviso de privacidad antes de activar las métricas.')
      if (![6, 12].includes(Number(privacidad.conservarConsultasMeses))) errores.push('Elegí una conservación válida para las consultas sin seguimiento.')
      if (inventario.modo !== 'Estados manuales') errores.push('El inventario inicial debe usar estados manuales.')
      const estadosEsperados = ['Disponible', 'Pocas unidades', 'Agotado', 'Por encargo']
      if (!Array.isArray(inventario.estados) || estadosEsperados.some((estado) => !inventario.estados.includes(estado))) errores.push('El inventario debe conservar los cuatro estados acordados.')
      if (pagos.proveedor !== 'Mercado Pago' || pagos.modalidad !== 'Enlaces externos') errores.push('Los pagos iniciales deben usar enlaces externos de Mercado Pago.')
      if (pagos.guardarDatosTarjeta !== false) errores.push('Aletea no puede guardar datos de tarjetas en el gestor.')
      if (pagos.confirmarStockAntesDeCobrar !== true) errores.push('La tienda debe confirmar disponibilidad antes de cobrar.')
    }
  }
  if (!contenido.seo?.titulo || String(contenido.seo.titulo).length > 65) errores.push('El título para buscadores debe tener entre 1 y 65 caracteres.')
  if (!contenido.seo?.descripcion || String(contenido.seo.descripcion).length > 160) errores.push('La descripción para buscadores debe tener entre 1 y 160 caracteres.')

  const recorrer = (valor, ruta = '') => {
    if (Array.isArray(valor)) {
      if (valor.length > 30) errores.push(`${ruta || 'Una lista'} tiene demasiados elementos.`)
      valor.forEach((item, indice) => recorrer(item, `${ruta}[${indice + 1}]`))
      return
    }
    if (!valor || typeof valor !== 'object') return
    Object.entries(valor).forEach(([clave, item]) => {
      const siguiente = ruta ? `${ruta}.${clave}` : clave
      if (typeof item === 'string' && item.length > maximoCampo(clave)) errores.push(`${etiquetaCampo(clave)} supera el máximo permitido.`)
      if ((['enlace', 'instagram', 'src'].includes(clave) || clave.endsWith('Enlace')) && typeof item === 'string' && !esEnlaceValido(item)) errores.push(`${etiquetaCampo(clave)} no contiene un enlace válido.`)
      recorrer(item, siguiente)
    })
  }
  recorrer(contenido)
  try { if (JSON.stringify(contenido).length > MAXIMO_JSON) errores.push('El contenido completo es demasiado grande.') } catch { errores.push('El contenido no se puede guardar.') }
  return [...new Set(errores)]
}

export function contenidoComoBorrador(contenido) {
  const siguiente = clonarContenidoPaginaWeb(contenido)
  const recorrer = (valor) => {
    if (!valor || typeof valor !== 'object') return
    Object.entries(valor).forEach(([clave, item]) => {
      if ((['enlace', 'instagram', 'src'].includes(clave) || clave.endsWith('Enlace')) && typeof item === 'string' && item) {
        const normalizado = normalizarEnlaceUsuario(item, { permitirRutaInterna: true, permitirContacto: true })
        if (normalizado) valor[clave] = normalizado
      } else recorrer(item)
    })
  }
  recorrer(siguiente)
  siguiente.editorial = { ...(siguiente.editorial || {}), estado: 'borrador', actualizadoEn: new Date().toISOString() }
  return siguiente
}

export function resumenSeccion(contenido, seccionId) {
  const seccion = SECCIONES_PAGINA_WEB.find((item) => item.id === seccionId) || SECCIONES_PAGINA_WEB[0]
  const valores = seccion.rutas.map((ruta) => valorEnRuta(contenido, ruta)).filter(Boolean)
  const portada = contenido?.portada
  const tituloPortada = [portada?.tituloAntes, portada?.tituloDestacado, portada?.tituloDespues].filter(Boolean).join(' ')
  const titulo = seccionId === 'portada' && tituloPortada
    ? tituloPortada
    : valores.find((valor) => valor?.titulo)?.titulo || valores.find((valor) => valor?.nombre)?.nombre || seccion.titulo
  const texto = valores.find((valor) => valor?.introduccion)?.introduccion || valores.find((valor) => valor?.bajada)?.bajada || valores.find((valor) => valor?.texto)?.texto || seccion.ayuda
  const cantidad = valores.reduce((total, valor) => {
    if (Array.isArray(valor)) return total + valor.length
    if (!valor || typeof valor !== 'object') return total + 1
    const listasDeContenido = ['bloques', 'propuestas', 'propuestasFormativas', 'recursos', 'productos', 'novedades', 'formularios']
    const listaPrincipal = listasDeContenido.map((clave) => valor[clave]).find((lista) => Array.isArray(lista))
    return total + (listaPrincipal ? listaPrincipal.length : 1)
  }, 0)
  return { titulo, texto, cantidad }
}
