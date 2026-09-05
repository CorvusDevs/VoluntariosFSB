import { boton, botonIcono, elemento, manejarTecladoDialogo, vaciar } from './componentes.js'
import {
  SECCIONES_PAGINA_WEB, ayudaCampo, asignarEnRuta, clonarContenidoPaginaWeb, contenidoComoBorrador,
  etiquetaCampo, maximoCampo, resumenSeccion, singularDeLista, tipoCampo, validarContenidoPaginaWeb, valorEnRuta,
} from '../modelo/pagina-web.js'
import { optimizarImagenParaWeb, textoPeso } from '../imagen/optimizar-web.js'
import { pasosSincronizacionMetricasWeb } from '../modelo/metricas-web.js'
import { completarMedicionUX, iniciarMedicionUX } from '../modelo/metricas-ux.js'
import { MENSAJE_ENLACE_INVALIDO, normalizarCampoEnlace } from '../util/enlaces.js'

const SITIO_PRUEBA = 'https://prueba.aletea.org'
const ORIGEN_SITIO_PRUEBA = new URL(SITIO_PRUEBA).origin
const SITIO_PRINCIPAL = 'https://aletea.org'
const BORRADOR_LOCAL_CLAVE = 'aletea:pagina-web:borrador-visual:v1'
const HISTORIAL_MAXIMO = 30
const PAGINAS_CON_VISTA_COMPLETA = new Set(['familias', 'actividades', 'formacion', 'recursos', 'tienda', 'actualidad', 'contacto', 'privacidad'])

const CAMPOS_AVANZADOS = new Set([
  'src', 'textoAlternativo', 'enlace', 'imagen', 'accion', 'accionPrincipal', 'accionSecundaria',
  'animacion', 'duracionMs', 'escalonadoMs', 'desplazamientoPx', 'mostrarHilo', 'reproducirUnaVez',
  'edad', 'donde', 'modalidad', 'costo', 'cupos', 'comoParticipar',
])

const MAXIMOS_LISTA = Object.freeze({ navegacion: 5, areas: 8, cifras: 6, redes: 12, propuestas: 30, propuestasFormativas: 30, formularios: 12, recursos: 30, productos: 24, novedades: 30 })
const CATEGORIAS_RECURSOS = Object.freeze(['Guías', 'Derechos', 'Educación', 'Familias', 'Autismo y neurodiversidad', 'Inclusión', 'Legislación', 'Videos', 'Podcasts', 'Materiales de Aletea'])
const ESTADOS_INVENTARIO = Object.freeze(['Disponible', 'Pocas unidades', 'Agotado', 'Por encargo'])
const CONFIGURACION_OPERACION_WEB = Object.freeze({
  analitica: { activa: false, proveedor: 'Cloudflare Web Analytics', retencionDias: 90, revisarCada: 'Mensual', responsable: 'Comunicación', datosPersonales: false },
  privacidad: { avisoEnlace: '/privacidad/', correo: 'info@aletea.org', conservarConsultasMeses: 12, responsable: 'Administración' },
  inventario: { modo: 'Estados manuales', estados: ESTADOS_INVENTARIO, responsable: 'Administración', fecha: '' },
  pagos: { proveedor: 'Mercado Pago', modalidad: 'Enlaces externos', confirmarStockAntesDeCobrar: true, guardarDatosTarjeta: false },
})
const APARIENCIA_POR_DEFECTO = Object.freeze({ movimiento: 'suave', mostrarListon: true, mostrarOrbita: true, mostrarRedAreas: true })
const TIPOGRAFIA_POR_DEFECTO = Object.freeze({
  portada: 'institucional', cifrasTitulo: 'institucional', cifrasNumeros: 'expresiva', participacion: 'expresiva',
  areas: 'institucional', institucion: 'institucional', actividades: 'institucional', familias: 'institucional',
  formacion: 'institucional', biblioteca: 'institucional', recursos: 'institucional', tienda: 'institucional',
  actualidad: 'expresiva', donaciones: 'institucional', contacto: 'institucional', orientacion: 'institucional', redes: 'institucional',
})
const TIPOGRAFIA_POR_SECCION = Object.freeze({
  portada: [{ clave: 'portada', titulo: 'Título principal' }],
  impacto: [{ clave: 'cifrasTitulo', titulo: 'Título de la sección' }, { clave: 'cifrasNumeros', titulo: 'Números destacados' }],
  areas: [{ clave: 'areas', titulo: 'Título del mapa de áreas' }],
  institucion: [{ clave: 'institucion', titulo: 'Título de la página' }],
  participacion: [{ clave: 'participacion', titulo: 'Invitación a participar' }],
  actividades: [{ clave: 'actividades', titulo: 'Título de la página' }],
  familias: [{ clave: 'familias', titulo: 'Título de la página' }],
  formacion: [{ clave: 'formacion', titulo: 'Título de la página' }],
  biblioteca: [{ clave: 'biblioteca', titulo: 'Título de la página' }],
  recursos: [{ clave: 'recursos', titulo: 'Título de la página' }],
  tienda: [{ clave: 'tienda', titulo: 'Título de la página' }],
  actualidad: [{ clave: 'actualidad', titulo: 'Título de la página' }],
  donaciones: [{ clave: 'donaciones', titulo: 'Título de la página' }],
  contacto: [{ clave: 'contacto', titulo: 'Título de la página' }],
  orientacion: [{ clave: 'orientacion', titulo: 'Título de orientación' }],
  redes: [{ clave: 'redes', titulo: 'Invitación a las redes' }],
})

const VISTA_POR_SECCION = Object.freeze({
  portada: { etiqueta: 'portada.etiqueta', titulos: ['portada.tituloAntes', 'portada.tituloDestacado', 'portada.tituloDespues'], texto: 'portada.bajada' },
  impacto: { etiqueta: 'impacto.etiqueta', titulos: ['impacto.titulo'], texto: 'impacto.nota' },
  areas: { etiqueta: 'mapaAreas.etiqueta', titulos: ['mapaAreas.titulo'], texto: 'mapaAreas.texto' },
  institucion: { etiqueta: 'paginas.institucion.etiqueta', titulos: ['paginas.institucion.titulo'], texto: 'paginas.institucion.introduccion' },
  actividades: { etiqueta: 'paginas.actividades.etiqueta', titulos: ['paginas.actividades.titulo'], texto: 'paginas.actividades.introduccion' },
  familias: { etiqueta: 'paginas.familias.etiqueta', titulos: ['paginas.familias.titulo'], texto: 'paginas.familias.introduccion' },
  'adultos-autistas': { etiqueta: 'paginas.adultosAutistas.etiqueta', titulos: ['paginas.adultosAutistas.titulo'], texto: 'paginas.adultosAutistas.introduccion' },
  formacion: { etiqueta: 'paginas.formacion.etiqueta', titulos: ['paginas.formacion.titulo'], texto: 'paginas.formacion.introduccion' },
  biblioteca: { etiqueta: 'paginas.biblioteca.etiqueta', titulos: ['paginas.biblioteca.titulo'], texto: 'paginas.biblioteca.introduccion' },
  recursos: { etiqueta: 'paginas.recursos.etiqueta', titulos: ['paginas.recursos.titulo'], texto: 'paginas.recursos.introduccion' },
  tienda: { etiqueta: 'paginas.tienda.etiqueta', titulos: ['paginas.tienda.titulo'], texto: 'paginas.tienda.introduccion' },
  donaciones: { etiqueta: 'paginas.donaciones.etiqueta', titulos: ['paginas.donaciones.titulo'], texto: 'paginas.donaciones.introduccion' },
  contacto: { etiqueta: 'paginas.contacto.etiqueta', titulos: ['paginas.contacto.titulo'], texto: 'paginas.contacto.introduccion' },
  privacidad: { etiqueta: 'paginas.privacidad.etiqueta', titulos: ['paginas.privacidad.titulo'], texto: 'paginas.privacidad.introduccion' },
  participacion: { etiqueta: 'participacion.etiqueta', titulos: ['participacion.titulo'], texto: 'participacion.texto' },
  orientacion: { etiqueta: 'orientacion.etiqueta', titulos: ['orientacion.titulo'], texto: 'orientacion.texto' },
  actualidad: { etiqueta: 'paginas.actualidad.etiqueta', titulos: ['paginas.actualidad.titulo'], texto: 'paginas.actualidad.introduccion' },
  redes: { etiqueta: 'redes.etiqueta', titulos: ['redes.titulo'], texto: 'redes.texto' },
  general: { etiqueta: 'organizacion.nombre', titulos: ['seo.titulo'], texto: 'seo.descripcion' },
})

const GRUPOS_EDITOR_WEB = Object.freeze([
  { id: 'inicio', titulo: 'Inicio', ayuda: 'Portada y cifras destacadas.', secciones: ['portada', 'impacto'] },
  { id: 'institucion', titulo: 'Institución', ayuda: 'Áreas y presentación de Aletea.', secciones: ['areas', 'institucion'] },
  { id: 'contenido', titulo: 'Páginas y contenido', ayuda: 'Familias, adultos autistas, actividades, formación, recursos, tienda y materiales publicados.', secciones: ['familias', 'adultos-autistas', 'actividades', 'formacion', 'biblioteca', 'recursos', 'tienda', 'actualidad'] },
  { id: 'participacion', titulo: 'Participación', ayuda: 'Orientación, formas de colaborar y perfiles sociales.', secciones: ['orientacion', 'participacion', 'donaciones', 'contacto', 'redes'] },
  { id: 'ajustes', titulo: 'Ajustes', ayuda: 'Apariencia, calidad, aviso público y reglas de operación.', secciones: ['general', 'apariencia', 'calidad', 'privacidad', 'operacion'] },
])

// Este catálogo describe la arquitectura que una persona recorre en el sitio
// público. Varias páginas reutilizan el mismo contenido editorial, por eso se
// mantienen separadas de SECCIONES_PAGINA_WEB, que sigue siendo el contrato de
// datos que guarda la API.
const PAGINAS_EDITOR_WEB = Object.freeze([
  { id: 'inicio', titulo: 'Inicio', ruta: '/', secciones: ['portada', 'orientacion', 'actividades', 'formacion', 'impacto', 'areas', 'institucion', 'participacion', 'redes'] },
  { id: 'agenda', titulo: 'Agenda', ruta: '/agenda/', secciones: ['actividades', 'formacion'] },
  { id: 'actividades', titulo: 'Qué hacemos', ruta: '/actividades/', secciones: ['actividades'] },
  { id: 'futbol', titulo: 'Fútbol sin Barreras', ruta: '/actividades/futbol-sin-barreras/', secciones: ['actividades'] },
  { id: 'plastica', titulo: 'Estimulación y plástica', ruta: '/actividades/estimulacion-motriz-plastica/', secciones: ['actividades'] },
  { id: 'familias', titulo: 'Para familias', ruta: '/familias/', secciones: ['familias'] },
  { id: 'adultos', titulo: 'Adultos autistas', ruta: '/adultos-autistas/', secciones: ['adultos-autistas'] },
  { id: 'formacion', titulo: 'Formación', ruta: '/formacion/', secciones: ['formacion'] },
  { id: 'biblioteca', titulo: 'Biblioteca', ruta: '/biblioteca/', secciones: ['biblioteca', 'recursos'] },
  { id: 'institucion', titulo: 'Quiénes somos', ruta: '/quienes-somos/', secciones: ['institucion', 'areas'] },
  { id: 'elecciones', titulo: 'Elecciones', ruta: '/elecciones/', secciones: ['institucion', 'general', 'calidad'] },
  { id: 'transparencia', titulo: 'Transparencia', ruta: '/transparencia/', secciones: ['institucion', 'general', 'privacidad', 'calidad'] },
  { id: 'voluntariado', titulo: 'Voluntariado', ruta: '/voluntariado/', secciones: ['participacion', 'contacto'] },
  { id: 'preguntas', titulo: 'Preguntas frecuentes', ruta: '/preguntas-frecuentes/', secciones: ['contacto', 'general'] },
  { id: 'contacto', titulo: 'Contacto', ruta: '/contacto/', secciones: ['contacto', 'participacion'] },
  { id: 'donaciones', titulo: 'Donaciones', ruta: '/donaciones/', secciones: ['donaciones'] },
  { id: 'privacidad', titulo: 'Privacidad', ruta: '/privacidad/', secciones: ['privacidad', 'operacion'] },
])

async function pedir(url, opciones = {}) {
  const respuesta = await fetch(url, { headers: { accept: 'application/json', 'content-type': 'application/json', ...(opciones.headers || {}) }, ...opciones })
  const datos = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) {
    const fallo = new Error(datos.error || 'No se pudo completar la operación.')
    fallo.estado = respuesta.status
    throw fallo
  }
  return { datos, respuesta }
}

function abrirEnOtraPestana(url) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

function ejemploParaLista(clave, lista) {
  const ejemplos = {
    navegacion: { etiqueta: 'Nueva sección', enlace: '/', visible: false, orden: lista.length + 1 },
    cifras: { valor: 0, prefijo: '+', etiqueta: 'nueva cifra', detalle: '' },
    areas: { id: 'nueva-area', nombre: 'Nueva área', resumen: '', color: 'violeta', enlace: '/', visible: true, orden: 1 },
    acciones: { etiqueta: 'Nuevo botón', enlace: '/' },
    bloques: { id: 'nuevo-bloque', titulo: 'Nuevo bloque', texto: '' },
    equipo: { grupo: 'Nuevo grupo', integrantes: [] },
    integrantes: 'Nombre y función', elementos: 'Nuevo elemento',
    recursos: { categoria: 'Guías', titulo: 'Nuevo recurso', enlace: '' },
    productos: { id: `producto-${Date.now()}`, nombre: 'Nuevo producto', descripcion: '', precio: '', disponibilidad: 'Por encargo', imagen: { src: '', textoAlternativo: '' }, enlace: '', visible: false, orden: lista.length + 1 },
    novedades: { id: `publicacion-${Date.now()}`, fecha: new Date().toISOString().slice(0, 10), categoria: 'Noticia', titulo: 'Nueva publicación', resumen: '', contenido: '', imagen: { src: '', textoAlternativo: '' }, visible: false, orden: lista.length + 1 },
    propuestasFormativas: { id: `formacion-${Date.now()}`, titulo: 'Nueva propuesta', categoriaFormacion: 'Profesional', proximaEdicion: '', modalidad: 'Virtual', duracion: '', horarios: '', precio: '', estadoInscripcion: 'Próximamente', visible: false, orden: lista.length + 1, accion: { etiqueta: 'Consultar', enlace: '/contacto/?motivo=Formación' } },
    formularios: { id: `formulario-${Date.now()}`, titulo: 'Nuevo formulario', descripcion: '', categoria: 'Familias', responsable: '', enlace: '', accionEtiqueta: 'Completar formulario', visible: false, orden: lista.length + 1 },
    opciones: { monto: '$0', enlace: '' }, motivos: 'Nuevo motivo',
    propuestas: { id: `actividad-${Date.now()}`, titulo: 'Nueva actividad', queEs: '', paraQuien: '', area: '', edad: '', dia: '', cuando: '', donde: '', modalidad: 'Presencial', costo: '', cupos: '', comoParticipar: '', estadoInscripcion: 'Próximamente', vigencia: 'Vigente', visible: false, orden: 1, accion: { etiqueta: 'Consultar', enlace: '/contacto/' } },
  }
  return clonarContenidoPaginaWeb(ejemplos[clave] ?? '')
}

function normalizarOrden(lista) {
  lista.forEach((item, indice) => { if (item && typeof item === 'object' && 'orden' in item) item.orden = indice + 1 })
  return lista
}

function prepararContenidoParaEditar(contenido) {
  const siguiente = clonarContenidoPaginaWeb(contenido)
  siguiente.tipografia = { ...TIPOGRAFIA_POR_DEFECTO, ...(siguiente.tipografia || {}) }
  siguiente.aparienciaSitio = { ...APARIENCIA_POR_DEFECTO, ...(siguiente.aparienciaSitio || {}) }
  if (Array.isArray(siguiente.navegacion)) siguiente.navegacion = siguiente.navegacion.map((item, indice) => ({
    ...item,
    visible: item.visible !== false,
    orden: Number.isInteger(item.orden) ? item.orden : indice + 1,
  }))
  const operacion = siguiente.operacionWeb || {}
  siguiente.operacionWeb = {
    analitica: { ...CONFIGURACION_OPERACION_WEB.analitica, ...(operacion.analitica || {}) },
    privacidad: { ...CONFIGURACION_OPERACION_WEB.privacidad, ...(operacion.privacidad || {}) },
    inventario: { ...CONFIGURACION_OPERACION_WEB.inventario, ...(operacion.inventario || {}), estados: [...ESTADOS_INVENTARIO] },
    pagos: { ...CONFIGURACION_OPERACION_WEB.pagos, ...(operacion.pagos || {}) },
  }
  return siguiente
}

function rotuloEstado(estado) {
  return estado === 'publicado' ? 'Publicado en prueba' : estado === 'borrador' ? 'Borrador guardado' : 'Sin publicar'
}

export function crearPantallaPaginaWeb(raiz, { sesion, alIrA = null }) {
  iniciarMedicionUX('publicar_pagina')
  const perfil = sesion?.perfil_acceso || (sesion?.rol === 'admin' ? 'administracion' : 'coordinacion')
  const puedeEditar = ['administracion', 'direccion', 'coordinacion'].includes(perfil)
  const puedePublicar = ['administracion', 'direccion'].includes(perfil)
  let contenido = null
  let publicado = null
  let revisionBorrador = 0
  let seccionActiva = 'portada'
  let cargando = true
  let guardando = false
  let sucio = false
  let error = ''
  let aviso = ''
  let dispositivoVista = 'escritorio'
  let inspectorActivo = 'contenido'
  let rutaSeleccionada = ''
  let busquedaSeccion = ''
  let historial = []
  let indiceHistorial = -1
  let animacionCifrasFrame = 0
  let grupoEditorActivo = 'inicio'
  let paginaEditorActiva = 'inicio'
  let modoEnfocado = false
  let mapaAbierto = false
  let filtroSecciones = 'todas'
  let anchoInspector = 360
  let zoomVista = 100
  let ultimaRecuperacionEn = ''
  let medios = []
  let mediosCargados = false
  let cargandoMedios = false
  let formulariosDisponibles = []
  let metricasWeb = null
  let metricasWebDias = 30
  let cargandoMetricasWeb = false
  let errorMetricasWeb = ''
  const listasAbiertas = new Map()
  const confirmarSalida = (evento) => {
    if (!sucio) return
    evento.preventDefault()
    evento.returnValue = ''
  }
  const atajosEditor = (evento) => {
    if ((evento.metaKey || evento.ctrlKey) && evento.key.toLocaleLowerCase('es') === 'k') {
      evento.preventDefault()
      const buscador = raiz.querySelector('[data-pagina-web-buscador]')
      buscador?.focus()
      buscador?.select()
    }
    if (evento.key === 'Escape' && modoEnfocado) {
      modoEnfocado = false
      dibujar()
    }
  }
  const mensajeLienzoReal = (evento) => {
    const iframe = raiz.querySelector('[data-pagina-web-lienzo-real]')
    if (!iframe || evento.source !== iframe.contentWindow || evento.origin !== new URL(iframe.src).origin || evento.data?.tipo !== 'aletea:editor:seleccionar') return
    const ruta = String(evento.data.ruta || '')
    if (!ruta) return
    const seccion = SECCIONES_PAGINA_WEB.find((item) => item.rutas.some((base) => ruta === base || ruta.startsWith(`${base}.`)))
    if (seccion) abrirSeccion(seccion.id, { ruta, enfocar: true })
  }
  window.addEventListener('beforeunload', confirmarSalida)
  window.addEventListener('keydown', atajosEditor)
  window.addEventListener('message', mensajeLienzoReal)

  function guardarRecuperacionLocal() {
    try {
      ultimaRecuperacionEn = new Date().toISOString()
      localStorage.setItem(BORRADOR_LOCAL_CLAVE, JSON.stringify({ contenido, actualizadoEn: ultimaRecuperacionEn }))
    } catch {}
  }

  function cantidadSeccionesModificadas() {
    if (!publicado || !contenido) return revisionBorrador ? 0 : SECCIONES_PAGINA_WEB.length
    return SECCIONES_PAGINA_WEB.filter((seccion) => seccion.rutas.some((ruta) => JSON.stringify(valorEnRuta(contenido, ruta)) !== JSON.stringify(valorEnRuta(publicado, ruta)))).length
  }

  function textoRecuperacion() {
    if (!ultimaRecuperacionEn) return 'Recuperación local lista'
    return `Recuperación local ${new Date(ultimaRecuperacionEn).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}`
  }

  function registrarHistorial() {
    if (!contenido) return
    const instantanea = JSON.stringify(contenido)
    if (historial[indiceHistorial] === instantanea) return
    historial = historial.slice(0, indiceHistorial + 1)
    historial.push(instantanea)
    if (historial.length > HISTORIAL_MAXIMO) historial.shift()
    indiceHistorial = historial.length - 1
    guardarRecuperacionLocal()
  }

  function moverHistorial(direccion) {
    const siguiente = indiceHistorial + direccion
    if (siguiente < 0 || siguiente >= historial.length) return
    indiceHistorial = siguiente
    contenido = prepararContenidoParaEditar(JSON.parse(historial[indiceHistorial]))
    sucio = true
    aviso = direccion < 0 ? 'Cambio deshecho. Podés rehacerlo.' : 'Cambio rehecho.'
    dibujar()
  }

  function actualizarControlesHistorial() {
    const deshacer = raiz.querySelector('[data-pagina-web-deshacer]')
    const rehacer = raiz.querySelector('[data-pagina-web-rehacer]')
    if (deshacer) deshacer.disabled = indiceHistorial <= 0
    if (rehacer) rehacer.disabled = indiceHistorial >= historial.length - 1
  }

  function abrirSeccion(seccionId, { ruta = '', enfocar = false } = {}) {
    const grupoDestino = GRUPOS_EDITOR_WEB.find((grupo) => grupo.secciones.includes(seccionId))
    if (grupoDestino) grupoEditorActivo = grupoDestino.id
    seccionActiva = seccionId
    busquedaSeccion = ''
    inspectorActivo = 'contenido'
    rutaSeleccionada = ruta
    dibujar()
    if (seccionId === 'operacion' && !metricasWeb && !cargandoMetricasWeb) cargarMetricasWeb()
    if (enfocar) requestAnimationFrame(() => {
      const control = ruta
        ? [...raiz.querySelectorAll('[data-pagina-web-ruta]')].find((item) => item.dataset.paginaWebRuta === ruta)
        : raiz.querySelector('[data-pagina-web-editor] input, [data-pagina-web-editor] textarea, [data-pagina-web-editor] select, [data-pagina-web-editor] button')
      control?.focus()
      control?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    })
  }

  function paginaEditorActual() {
    return PAGINAS_EDITOR_WEB.find((pagina) => pagina.id === paginaEditorActiva) || null
  }

  function abrirPaginaEditor(paginaId) {
    const pagina = PAGINAS_EDITOR_WEB.find((item) => item.id === paginaId)
    if (!pagina) return
    paginaEditorActiva = pagina.id
    const siguiente = pagina.secciones.includes(seccionActiva) ? seccionActiva : pagina.secciones[0]
    abrirSeccion(siguiente)
  }

  function cambiarDispositivoVista(dispositivo) {
    dispositivoVista = dispositivo
    const marco = raiz.querySelector('[data-pagina-web-preview]')
    marco?.classList.toggle('pagina-web-preview-movil', dispositivo === 'telefono')
    marco?.classList.toggle('pagina-web-preview-tablet', dispositivo === 'tablet')
    raiz.querySelectorAll('[data-pagina-web-dispositivo]').forEach((control) => {
      const activo = control.dataset.paginaWebDispositivo === dispositivo
      control.classList.toggle('activa', activo)
      control.setAttribute('aria-pressed', String(activo))
    })
  }

  function buscarRuta(contenedor, base, predicado, profundidad = 0) {
    if (!contenedor || typeof contenedor !== 'object' || profundidad > 5) return ''
    if (predicado(contenedor)) return base
    for (const [clave, valor] of Object.entries(contenedor)) {
      if (!valor || typeof valor !== 'object') continue
      const ruta = buscarRuta(valor, base ? `${base}.${clave}` : clave, predicado, profundidad + 1)
      if (ruta) return ruta
    }
    return ''
  }

  function rutaImagenDeSeccion(seccion) {
    for (const ruta of seccion.rutas) {
      const encontrada = buscarRuta(valorEnRuta(contenido, ruta), ruta, (valor) => 'src' in valor && 'textoAlternativo' in valor)
      if (encontrada) return encontrada
    }
    return ''
  }

  function rutaVisibilidadDeSeccion(seccion) {
    for (const ruta of seccion.rutas) {
      const valor = valorEnRuta(contenido, ruta)
      if (valor && typeof valor === 'object' && typeof valor.visible === 'boolean') return `${ruta}.visible`
    }
    return ''
  }

  function rutasAccionDeSeccion(seccion) {
    const rutas = []
    const visitar = (valor, base, profundidad = 0) => {
      if (!valor || typeof valor !== 'object' || profundidad > 4 || rutas.length >= 3) return
      if (!Array.isArray(valor) && typeof valor.etiqueta === 'string' && typeof valor.enlace === 'string') rutas.push(base)
      Object.entries(valor).forEach(([clave, siguiente]) => {
        if (siguiente && typeof siguiente === 'object') visitar(siguiente, base ? `${base}.${clave}` : clave, profundidad + 1)
      })
    }
    seccion.rutas.forEach((ruta) => visitar(valorEnRuta(contenido, ruta), ruta))
    return [...new Set(rutas)]
  }

  function rutaColeccionDeSeccion(seccion) {
    const preferidas = ['propuestas', 'propuestasFormativas', 'productos', 'novedades', 'recursos', 'formularios', 'areas', 'cifras', 'navegacion']
    const candidatas = []
    const visitar = (valor, base, profundidad = 0) => {
      if (profundidad > 4) return
      if (Array.isArray(valor) && valor.length && valor.some((item) => item && typeof item === 'object')) {
        candidatas.push({ ruta: base, clave: base.split('.').at(-1) })
        return
      }
      if (!valor || typeof valor !== 'object') return
      Object.entries(valor).forEach(([clave, siguiente]) => visitar(siguiente, base ? `${base}.${clave}` : clave, profundidad + 1))
    }
    seccion.rutas.forEach((ruta) => visitar(valorEnRuta(contenido, ruta), ruta))
    candidatas.sort((a, b) => preferidas.indexOf(a.clave) - preferidas.indexOf(b.clave))
    return candidatas.find((item) => preferidas.includes(item.clave))?.ruta || candidatas[0]?.ruta || ''
  }

  function estiloTipografico(clave) {
    return contenido?.tipografia?.[clave] === 'expresiva' ? 'expresiva' : 'institucional'
  }

  function claveTipograficaDeSeccion(seccionId) {
    return TIPOGRAFIA_POR_SECCION[seccionId]?.[0]?.clave || null
  }

  function estadoVisualSeccion(seccion) {
    const valores = seccion.rutas.map((ruta) => valorEnRuta(contenido, ruta)).filter((valor) => valor !== undefined)
    const oculta = valores.some((valor) => valor && typeof valor === 'object' && valor.visible === false)
    const incompleta = valores.length === 0 || valores.every((valor) => {
      if (Array.isArray(valor)) return valor.length === 0
      if (valor && typeof valor === 'object') return !Object.values(valor).some((item) => typeof item === 'string' ? item.trim() : Boolean(item))
      return !String(valor || '').trim()
    })
    const modificada = publicado && seccion.rutas.some((ruta) => JSON.stringify(valorEnRuta(contenido, ruta)) !== JSON.stringify(valorEnRuta(publicado, ruta)))
    return modificada ? 'modificada' : incompleta ? 'incompleta' : oculta ? 'oculta' : 'lista'
  }

  function editorTipografia(seccionId) {
    const opcionesSeccion = TIPOGRAFIA_POR_SECCION[seccionId]
    if (!opcionesSeccion?.length) return null
    const bloque = elemento('section', ['pagina-web-tipografia'])
    bloque.append(
      elemento('div', ['pagina-web-tipografia-cabecera'], 'Estilo del texto'),
      elemento('p', ['ayuda'], 'Elegí visualmente. Poppins mantiene el tono institucional y League Gothic aporta impacto en mensajes breves.'),
    )
    opcionesSeccion.forEach(({ clave, titulo }) => {
      const grupo = elemento('fieldset', ['pagina-web-tipografia-grupo'])
      grupo.appendChild(elemento('legend', [], titulo))
      const opciones = elemento('div', ['pagina-web-tipografia-opciones'])
      ;[
        { valor: 'institucional', nombre: 'Institucional', muestra: 'Aletea acompaña', ayuda: 'Poppins, clara y serena' },
        { valor: 'expresiva', nombre: 'Con impacto', muestra: 'ALETEA ACOMPAÑA', ayuda: 'League Gothic, para destacar' },
      ].forEach((opcion) => {
        const control = document.createElement('button')
        control.type = 'button'
        control.className = `pagina-web-tipografia-opcion ${opcion.valor === 'expresiva' ? 'pagina-web-tipografia-opcion-expresiva' : ''}`
        control.classList.toggle('activa', estiloTipografico(clave) === opcion.valor)
        control.setAttribute('aria-pressed', String(estiloTipografico(clave) === opcion.valor))
        control.setAttribute('aria-label', `${titulo}: ${opcion.nombre}`)
        control.disabled = !puedeEditar
        control.append(
          elemento('span', ['pagina-web-tipografia-muestra'], opcion.muestra),
          elemento('strong', [], opcion.nombre),
          elemento('small', [], opcion.ayuda),
        )
        control.addEventListener('click', () => {
          contenido.tipografia[clave] = opcion.valor
          marcarCambio(false)
          dibujarEditor()
          dibujarVistaPrevia()
        })
        opciones.appendChild(control)
      })
      grupo.appendChild(opciones)
      bloque.appendChild(grupo)
    })
    return bloque
  }

  function urlImagenPrevia(src) {
    if (!src) return ''
    if (!src.startsWith('/')) return src
    const esLocal = ['127.0.0.1', 'localhost'].includes(window.location.hostname)
    return `${esLocal ? 'http://127.0.0.1:4321' : SITIO_PRUEBA}${src}`
  }

  function aplicarEncuadre(elementoImagen, imagen) {
    const focoX = Math.min(100, Math.max(0, Number(imagen?.focoX ?? 50)))
    const focoY = Math.min(100, Math.max(0, Number(imagen?.focoY ?? 50)))
    elementoImagen.style.objectPosition = `${focoX}% ${focoY}%`
  }

  function crearAccionesVistaCompleta(acciones = []) {
    const grupo = elemento('div', ['pagina-web-vista-completa-acciones'])
    acciones.filter((accion) => accion?.etiqueta).forEach((accion, indice) => {
      const control = elemento('span', ['pagina-web-vista-completa-accion'], accion.etiqueta)
      if (indice === 0) control.classList.add('principal')
      grupo.appendChild(control)
    })
    return grupo
  }

  function crearContenidoVistaCompleta(pagina, seccionId) {
    const fragmento = document.createDocumentFragment()
    if (pagina.imagen?.src) {
      const imagen = document.createElement('img')
      imagen.className = 'pagina-web-vista-completa-imagen'
      imagen.src = urlImagenPrevia(pagina.imagen.src)
      imagen.alt = pagina.imagen.textoAlternativo || ''
      aplicarEncuadre(imagen, pagina.imagen)
      fragmento.appendChild(imagen)
    }

    const cuadricula = elemento('div', ['pagina-web-vista-completa-grid'])
    if (seccionId === 'actualidad') {
      cuadricula.classList.add('pagina-web-vista-completa-grid-novedades')
      ;(pagina.novedades || []).forEach((novedad) => {
        const tarjeta = elemento('article', ['pagina-web-vista-completa-tarjeta', 'pagina-web-vista-completa-novedad'])
        if (novedad.imagen?.src) {
          const imagen = document.createElement('img')
          imagen.src = urlImagenPrevia(novedad.imagen.src)
          imagen.alt = novedad.imagen.textoAlternativo || ''
          aplicarEncuadre(imagen, novedad.imagen)
          tarjeta.appendChild(imagen)
        }
        const fecha = novedad.fecha && !Number.isNaN(Date.parse(`${novedad.fecha}T12:00:00Z`))
          ? new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${novedad.fecha}T12:00:00Z`))
          : 'Fecha pendiente'
        tarjeta.append(
          elemento('span', ['pagina-web-vista-completa-categoria'], `${fecha} · ${novedad.categoria || 'Sin categoría'}${novedad.visible ? '' : ' · Oculta'}`),
          elemento('h3', [], novedad.titulo || 'Publicación sin título'),
          elemento('p', ['pagina-web-vista-completa-resumen'], novedad.resumen || 'Resumen pendiente.'),
          elemento('p', ['pagina-web-vista-completa-texto'], novedad.contenido || 'Contenido pendiente.'),
        )
        cuadricula.appendChild(tarjeta)
      })
      if (!pagina.novedades?.length) cuadricula.appendChild(elemento('p', ['pagina-web-vista-completa-vacio'], 'Todavía no hay publicaciones. Agregá la primera y revisala acá antes de mostrar Actualidad.'))
    } else if (seccionId === 'actividades') {
      cuadricula.classList.add('pagina-web-vista-completa-actividades')
      const propuestas = pagina.propuestas || []
      const agregarGrupo = (titulo, items, historico = false) => {
        if (!items.length) return
        const grupo = elemento('section', ['pagina-web-vista-completa-grupo-actividades', historico ? 'historicas' : 'vigentes'])
        grupo.appendChild(elemento('h3', [], titulo))
        const tarjetas = elemento('div', ['pagina-web-vista-completa-grid'])
        items.forEach((propuesta) => {
          const tarjeta = elemento('article', ['pagina-web-vista-completa-tarjeta', historico ? 'historica' : 'vigente'])
          tarjeta.append(
            elemento('span', ['pagina-web-vista-completa-categoria'], historico ? 'Actividad histórica' : `${propuesta.estadoInscripcion || 'Estado pendiente'}${propuesta.visible ? '' : ' · Oculta'}`),
            elemento('h3', [], propuesta.titulo || 'Actividad sin título'),
            elemento('p', [], propuesta.queEs || 'Descripción pendiente.'),
          )
          const datos = document.createElement('dl')
          datos.className = 'pagina-web-vista-completa-datos'
          ;[['Área', propuesta.area], ['Para quién', propuesta.paraQuien], ['Edad', propuesta.edad], ['Día', propuesta.dia], ['Cuándo', propuesta.cuando], ['Dónde', propuesta.donde], ['Modalidad', propuesta.modalidad]].filter(([, valor]) => valor).forEach(([rotulo, valor]) => {
            const fila = document.createElement('div')
            fila.append(elemento('dt', [], rotulo), elemento('dd', [], valor))
            datos.appendChild(fila)
          })
          tarjeta.appendChild(datos)
          if (!historico) tarjeta.appendChild(elemento('span', ['pagina-web-vista-completa-enlace'], propuesta.accion?.etiqueta || 'Inscripción pendiente'))
          tarjetas.appendChild(tarjeta)
        })
        grupo.appendChild(tarjetas)
        cuadricula.appendChild(grupo)
      }
      agregarGrupo('Actividades vigentes', propuestas.filter((propuesta) => propuesta.vigencia !== 'Histórica'))
      agregarGrupo('Archivo histórico', propuestas.filter((propuesta) => propuesta.vigencia === 'Histórica'), true)
      if (!propuestas.length) cuadricula.appendChild(elemento('p', ['pagina-web-vista-completa-vacio'], 'Todavía no hay actividades cargadas. Agregá la primera y revisala acá antes de mostrarla.'))
    } else if (seccionId === 'formacion') {
      cuadricula.classList.add('pagina-web-vista-completa-grid-formacion')
      ;(pagina.propuestasFormativas || []).forEach((propuesta) => {
        const tarjeta = elemento('article', ['pagina-web-vista-completa-tarjeta', 'pagina-web-vista-completa-formacion'])
        tarjeta.append(
          elemento('span', ['pagina-web-vista-completa-categoria'], `${propuesta.estadoInscripcion || 'Estado pendiente'} · ${propuesta.categoriaFormacion || 'Tipo pendiente'}${propuesta.visible ? '' : ' · Oculta'}`),
          elemento('h3', [], propuesta.titulo || 'Propuesta sin título'),
        )
        const datos = document.createElement('dl')
        datos.className = 'pagina-web-vista-completa-datos'
        ;[['Próxima edición', propuesta.proximaEdicion], ['Modalidad', propuesta.modalidad], ['Duración', propuesta.duracion], ['Horarios', propuesta.horarios], ['Precio', propuesta.precio]].forEach(([titulo, valor]) => {
          const fila = document.createElement('div')
          fila.append(elemento('dt', [], titulo), elemento('dd', [], valor || 'Pendiente'))
          datos.appendChild(fila)
        })
        tarjeta.appendChild(datos)
        cuadricula.appendChild(tarjeta)
      })
      ;(pagina.bloques || []).forEach((bloque) => {
        const tarjeta = elemento('article', ['pagina-web-vista-completa-tarjeta', 'pagina-web-vista-completa-linea'])
        tarjeta.append(elemento('span', ['pagina-web-vista-completa-categoria'], 'Línea formativa'), elemento('h3', [], bloque.titulo || 'Bloque sin título'), elemento('p', [], bloque.texto || 'Sin descripción.'))
        cuadricula.appendChild(tarjeta)
      })
      if (!pagina.propuestasFormativas?.length) cuadricula.prepend(elemento('p', ['pagina-web-vista-completa-vacio'], 'Todavía no hay propuestas cargadas. Agregá la primera y revisala acá antes de mostrar Formación.'))
    } else if (seccionId === 'contacto') {
      ;(pagina.formularios || []).forEach((formulario) => {
        const tarjeta = elemento('article', ['pagina-web-vista-completa-tarjeta'])
        tarjeta.append(
          elemento('span', ['pagina-web-vista-completa-categoria'], `${formulario.categoria || 'Sin categoría'}${formulario.visible ? '' : ' · Oculto'}`),
          elemento('h3', [], formulario.titulo || 'Formulario sin título'),
          elemento('p', [], formulario.descripcion || 'Descripción pendiente.'),
          elemento('p', ['pagina-web-vista-completa-responsable'], formulario.responsable ? `Seguimiento: ${formulario.responsable}` : 'Equipo responsable pendiente.'),
          elemento('span', ['pagina-web-vista-completa-enlace'], formulario.accionEtiqueta || 'Completar formulario'),
        )
        cuadricula.appendChild(tarjeta)
      })
      if (!pagina.formularios?.length) cuadricula.appendChild(elemento('p', ['pagina-web-vista-completa-vacio'], 'Todavía no hay formularios vinculados. Crealos en Formularios y agregalos acá cuando estén prontos.'))
    } else if (seccionId === 'recursos') {
      ;(pagina.recursos || []).forEach((recurso) => {
        const enlaceDegradado = /brincar\.org\.ar/i.test(recurso.enlace || '')
        const tarjeta = elemento('article', ['pagina-web-vista-completa-tarjeta', ...(enlaceDegradado ? ['pagina-web-enlace-degradado'] : [])])
        tarjeta.append(
          elemento('span', ['pagina-web-vista-completa-categoria'], recurso.categoria || 'Recurso'),
          elemento('h3', [], recurso.titulo || 'Recurso sin título'),
          elemento('p', [], recurso.descripcion || 'Sin descripción.'),
          elemento('span', ['pagina-web-vista-completa-enlace'], enlaceDegradado ? 'Disponibilidad variable, revisar antes de publicar' : recurso.enlace ? 'Abrir recurso' : 'Falta agregar el enlace'),
        )
        cuadricula.appendChild(tarjeta)
      })
    } else if (seccionId === 'tienda') {
      ;(pagina.productos || []).forEach((producto) => {
        const tarjeta = elemento('article', ['pagina-web-vista-completa-tarjeta', 'pagina-web-vista-completa-producto'])
        if (producto.imagen?.src) {
          const imagen = document.createElement('img')
          imagen.src = urlImagenPrevia(producto.imagen.src)
          imagen.alt = producto.imagen.textoAlternativo || ''
          aplicarEncuadre(imagen, producto.imagen)
          tarjeta.appendChild(imagen)
        }
        const estado = elemento('span', ['pagina-web-vista-completa-categoria'], producto.visible ? (producto.disponibilidad || 'Disponible') : 'Producto oculto')
        tarjeta.append(estado, elemento('h3', [], producto.nombre || 'Producto sin nombre'), elemento('p', [], producto.descripcion || 'Sin descripción.'))
        if (producto.precio) tarjeta.appendChild(elemento('strong', ['pagina-web-vista-completa-precio'], producto.precio))
        cuadricula.appendChild(tarjeta)
      })
      if (!pagina.productos?.length) cuadricula.appendChild(elemento('p', ['pagina-web-vista-completa-vacio'], 'Todavía no hay productos cargados. Esta página seguirá oculta hasta que agregues y revises al menos uno.'))
    } else {
      ;(pagina.bloques || []).forEach((bloque) => {
        const tarjeta = elemento('article', ['pagina-web-vista-completa-tarjeta'])
        tarjeta.append(elemento('h3', [], bloque.titulo || 'Bloque sin título'), elemento('p', [], bloque.texto || 'Sin descripción.'))
        if (Array.isArray(bloque.elementos) && bloque.elementos.length) {
          const lista = document.createElement('ul')
          bloque.elementos.forEach((item) => lista.appendChild(elemento('li', [], item)))
          tarjeta.appendChild(lista)
        }
        cuadricula.appendChild(tarjeta)
      })
    }
    fragmento.appendChild(cuadricula)
    fragmento.appendChild(crearAccionesVistaCompleta(pagina.acciones))
    return fragmento
  }

  function abrirVistaCompleta(activador) {
    if (!PAGINAS_CON_VISTA_COMPLETA.has(seccionActiva)) return
    const pagina = contenido?.paginas?.[seccionActiva]
    if (!pagina) return
    const focoAnterior = activador instanceof HTMLElement ? activador : document.activeElement
    const pantallaEditor = raiz.querySelector('.pagina-web')
    const seccion = SECCIONES_PAGINA_WEB.find((item) => item.id === seccionActiva)
    const superposicion = elemento('section', ['pagina-web-vista-completa'])
    superposicion.dataset.paginaWebVistaCompleta = ''
    superposicion.setAttribute('role', 'dialog')
    superposicion.setAttribute('aria-modal', 'true')
    superposicion.setAttribute('aria-label', `Vista previa completa de ${seccion.titulo}`)
    superposicion.tabIndex = -1

    const barra = elemento('header', ['pagina-web-vista-completa-barra'])
    const identidad = elemento('div')
    identidad.append(elemento('span', ['pagina-web-vista-completa-privada'], 'Vista privada'), elemento('strong', [], seccion.titulo), elemento('small', [], 'Usa el borrador actual. No guarda ni publica cambios.'))
    const controles = elemento('div', ['pagina-web-vista-completa-controles'])
    const cuerpo = elemento('div', ['pagina-web-vista-completa-cuerpo'])
    const cambiarModo = (movil) => {
      cuerpo.classList.toggle('movil', movil)
      escritorio.classList.toggle('activa', !movil)
      telefono.classList.toggle('activa', movil)
      escritorio.setAttribute('aria-pressed', String(!movil))
      telefono.setAttribute('aria-pressed', String(movil))
    }
    const escritorio = boton('Escritorio', () => cambiarModo(false))
    const telefono = boton('Teléfono', () => cambiarModo(true))
    const cerrarVista = () => {
      superposicion.remove()
      if (pantallaEditor) pantallaEditor.removeAttribute('inert')
      if (focoAnterior instanceof HTMLElement) focoAnterior.focus()
    }
    const cerrar = boton('Cerrar', cerrarVista)
    cerrar.setAttribute('aria-label', 'Cerrar vista previa completa')
    controles.append(escritorio, telefono, cerrar)
    barra.append(identidad, controles)

    const sitio = elemento('article', ['pagina-web-vista-completa-sitio'])
    const cabecera = elemento('header', ['pagina-web-vista-completa-cabecera'])
    const logo = document.createElement('img')
    logo.src = 'assets/logo-aletea-violeta.png'
    logo.alt = 'Aletea'
    const menu = elemento('nav', ['pagina-web-vista-completa-menu'])
    contenido.navegacion.filter((item) => item.visible !== false).forEach((item) => menu.appendChild(elemento('span', [], item.etiqueta)))
    cabecera.append(logo, menu)
    const avisoPrivado = elemento('div', ['pagina-web-vista-completa-aviso'], pagina.visible
      ? 'Estás revisando el borrador actual. Esta vista no publica cambios.'
      : `${seccion.titulo} sigue oculta en la web. Solo vos podés ver este borrador desde el gestor.`)
    const heroe = elemento('section', ['pagina-web-vista-completa-heroe'])
    const tituloHeroe = elemento('h1', [], pagina.titulo || 'Título pendiente')
    if (estiloTipografico(claveTipograficaDeSeccion(seccionActiva)) === 'expresiva') tituloHeroe.classList.add('tipografia-expresiva')
    heroe.append(elemento('span', ['pagina-web-vista-completa-etiqueta'], pagina.etiqueta || seccion.titulo), tituloHeroe, elemento('p', [], pagina.introduccion || 'Introducción pendiente.'))
    const contenidoPagina = elemento('section', ['pagina-web-vista-completa-seccion'])
    contenidoPagina.appendChild(crearContenidoVistaCompleta(pagina, seccionActiva))
    const pie = elemento('footer', ['pagina-web-vista-completa-pie'])
    pie.append(elemento('strong', [], contenido.organizacion?.nombre || 'Aletea'), elemento('span', [], 'Inclusión, comunidad y oportunidades'))
    sitio.append(cabecera, avisoPrivado, heroe, contenidoPagina, pie)
    cuerpo.appendChild(sitio)
    superposicion.append(barra, cuerpo)
    superposicion.addEventListener('click', (evento) => { if (evento.target === superposicion) cerrarVista() })
    superposicion.addEventListener('keydown', (evento) => manejarTecladoDialogo(evento, superposicion, cerrarVista))
    if (pantallaEditor) pantallaEditor.setAttribute('inert', '')
    raiz.appendChild(superposicion)
    cambiarModo(false)
    superposicion.focus()
  }

  async function cargarMedios() {
    if (mediosCargados || cargandoMedios) return
    cargandoMedios = true
    try {
      const { datos } = await pedir('/api/cms/pagina-web/medios')
      medios = Array.isArray(datos.medios) ? datos.medios : []
      mediosCargados = true
    } catch { mediosCargados = true }
    finally { cargandoMedios = false; dibujarEditor() }
  }

  async function cargarMetricasWeb(dias = metricasWebDias) {
    if (cargandoMetricasWeb) return
    metricasWebDias = dias
    cargandoMetricasWeb = true
    errorMetricasWeb = ''
    dibujarEditor()
    try {
      const { datos } = await pedir(`/api/cms/pagina-web/metricas?dias=${dias}`)
      metricasWeb = datos
    } catch (fallo) {
      errorMetricasWeb = fallo.message
    } finally {
      cargandoMetricasWeb = false
      dibujarEditor()
    }
  }

  function marcarCambio(actualizarVista = true) {
    sucio = true
    aviso = ''
    registrarHistorial()
    dibujarEstadoAcciones()
    actualizarControlesHistorial()
    if (actualizarVista) dibujarVistaPrevia()
  }

  function controlEscalar(clave, valor, alCambiar, ruta) {
    const tipo = tipoCampo(clave, valor)
    const esCategoriaRecurso = clave === 'categoria' && /^paginas\.(recursos|biblioteca)\.recursos\.\d+\.categoria$/.test(ruta)
    const etiqueta = elemento('label', ['pagina-web-campo'])
    const rotulo = elemento('span', ['pagina-web-campo-rotulo'], etiquetaCampo(clave))
    let control
    if (clave === 'color') {
      control = document.createElement('select')
      ;['marca', 'institucional', 'turquesa', 'amarillo', 'magenta', 'violeta', 'azul'].forEach((color) => {
        const opcion = document.createElement('option'); opcion.value = color; opcion.textContent = color.charAt(0).toUpperCase() + color.slice(1); control.appendChild(opcion)
      })
    } else if (clave === 'area' && ruta.includes('.propuestas.')) {
      control = document.createElement('select')
      const nombres = (contenido?.areas || []).filter((area) => area?.visible !== false && area?.nombre).map((area) => area.nombre)
      if (valor && !nombres.includes(valor)) nombres.push(valor)
      const vacia = document.createElement('option'); vacia.value = ''; vacia.textContent = 'Elegir área'; control.appendChild(vacia)
      nombres.forEach((nombre) => { const opcion = document.createElement('option'); opcion.value = nombre; opcion.textContent = nombre; control.appendChild(opcion) })
    } else if (clave === 'disponibilidad' && ruta.includes('.productos.')) {
      control = document.createElement('select')
      ESTADOS_INVENTARIO.forEach((estado) => { const opcion = document.createElement('option'); opcion.value = estado; opcion.textContent = estado; control.appendChild(opcion) })
    } else if (esCategoriaRecurso) {
      control = document.createElement('select')
      const opciones = [...CATEGORIAS_RECURSOS]
      if (valor && !opciones.includes(valor)) opciones.push(valor)
      opciones.forEach((opcion) => { const item = document.createElement('option'); item.value = opcion; item.textContent = opcion; control.appendChild(item) })
    } else if (clave === 'estadoInscripcion' || clave === 'vigencia' || clave === 'modalidad' || clave === 'categoriaFormacion' || (clave === 'categoria' && ruta.includes('.formularios.'))) {
      control = document.createElement('select')
      const opciones = clave === 'estadoInscripcion' ? ['Abierta', 'Cerrada', 'Próximamente']
        : clave === 'vigencia' ? ['Vigente', 'Histórica']
          : clave === 'categoriaFormacion' ? ['Profesional', 'Instituciones', 'Taller abierto']
            : clave === 'categoria' ? ['Familias', 'Actividades', 'Formación', 'Voluntariado', 'Donaciones', 'Tienda', 'Institucional']
              : ['Presencial', 'Virtual', 'Híbrida']
      opciones.forEach((opcion) => { const item = document.createElement('option'); item.value = opcion; item.textContent = opcion; control.appendChild(item) })
    } else if (tipo === 'textarea') {
      control = document.createElement('textarea')
      control.rows = 4
    } else {
      control = document.createElement('input')
      control.type = tipo === 'url' ? 'text' : tipo
    }
    control.value = tipo === 'checkbox' ? '' : String(valor ?? '')
    if (tipo === 'checkbox') control.checked = Boolean(valor)
    if (tipo === 'number') control.step = clave.endsWith('Ms') || clave.endsWith('Px') || clave === 'valor' || clave === 'orden' ? '1' : 'any'
    if (typeof valor === 'string') control.maxLength = maximoCampo(clave)
    control.disabled = !puedeEditar
    control.setAttribute('aria-label', `${etiquetaCampo(clave)} de ${ruta}`)
    control.dataset.paginaWebRuta = ruta
    if (tipo === 'url') {
      control.inputMode = 'url'
      control.addEventListener('blur', () => {
        if (!control.value.trim()) return
        const normalizado = normalizarCampoEnlace(control, { permitirRutaInterna: true, permitirContacto: true })
        if (!normalizado) {
          control.title = MENSAJE_ENLACE_INVALIDO
          control.reportValidity()
          return
        }
        control.title = ''
        if (normalizado !== valor) { alCambiar(normalizado); marcarCambio() }
      })
      control.addEventListener('input', () => control.setCustomValidity(''))
    }
    if (control.tagName === 'INPUT' && (clave === 'enlace' || clave.endsWith('Enlace'))) {
      const listaId = `destinos-${ruta.replace(/[^a-z0-9]+/gi, '-')}`
      const destinos = document.createElement('datalist')
      destinos.id = listaId
      const internos = [
        ['/', 'Inicio'], ['/institucion/', 'Institución'], ['/que-hacemos/', 'Qué hacemos'], ['/familias/', 'Familias'],
        ['/formacion/', 'Formación'], ['/biblioteca/', 'Biblioteca'], ['/recursos/', 'Recursos'], ['/tienda/', 'Tienda'],
        ['/actualidad/', 'Actualidad'], ['/contacto/', 'Contacto'], ['/privacidad/', 'Privacidad'],
      ]
      ;[...internos, ...formulariosDisponibles.map((formulario) => [formulario.enlace, `Formulario: ${formulario.titulo}`])].forEach(([destino, nombre]) => {
        const opcion = document.createElement('option'); opcion.value = destino; opcion.label = nombre; destinos.appendChild(opcion)
      })
      control.setAttribute('list', listaId)
      etiqueta.appendChild(destinos)
    }
    control.addEventListener('input', (evento) => {
      const siguiente = tipo === 'checkbox' ? control.checked : tipo === 'number' ? Number(control.value || 0) : control.value
      if (alCambiar(siguiente) === false) {
        if (tipo === 'checkbox') control.checked = Boolean(valor)
        else control.value = String(valor ?? '')
        control.dataset.paginaWebCambioRechazado = 'true'
        evento.stopPropagation()
        return
      }
      marcarCambio()
    })
    etiqueta.prepend(rotulo)
    etiqueta.appendChild(control)
    if (tipo === 'url' && /brincar\.org\.ar/i.test(String(valor || ''))) {
      const advertencia = elemento('small', ['pagina-web-enlace-degradado-aviso'], 'Enlace degradado: la última comprobación no pudo confirmar una carga estable. Revisalo antes de publicar.')
      advertencia.setAttribute('role', 'status')
      etiqueta.appendChild(advertencia)
    }
    const ayuda = esCategoriaRecurso ? 'Elegí una categoría común para que las personas puedan filtrar este recurso.' : ayudaCampo(clave)
    if (ayuda) etiqueta.appendChild(elemento('small', ['pagina-web-campo-ayuda'], ayuda))
    return etiqueta
  }

  function editorValor(clave, valor, alCambiar, ruta) {
    if (Array.isArray(valor)) return editorLista(clave, valor, alCambiar, ruta)
    if (valor && typeof valor === 'object') {
      if ('src' in valor && 'textoAlternativo' in valor) return editorImagen(valor, alCambiar, ruta)
      const grupo = elemento('fieldset', ['pagina-web-grupo'])
      grupo.appendChild(elemento('legend', [], etiquetaCampo(clave)))
      const entradas = Object.entries(valor).filter(([subclave]) => !['id', 'orden'].includes(subclave))
      const imagenPrincipal = (subclave) => subclave === 'imagen' && ruta.includes('.novedades.')
      const basicos = entradas.filter(([subclave]) => !CAMPOS_AVANZADOS.has(subclave) || imagenPrincipal(subclave))
      const avanzados = entradas.filter(([subclave]) => CAMPOS_AVANZADOS.has(subclave) && !imagenPrincipal(subclave))
      const crearCampos = (items) => {
        const campos = elemento('div', ['pagina-web-campos'])
        items.forEach(([subclave, subvalor]) => campos.appendChild(editorValor(subclave, subvalor, (siguiente) => { valor[subclave] = siguiente; alCambiar(valor) }, `${ruta}.${subclave}`)))
        return campos
      }
      if (basicos.length) grupo.appendChild(crearCampos(basicos))
      if (avanzados.length) {
        const detalles = elemento('details', ['pagina-web-avanzado'])
        detalles.append(elemento('summary', [], `Más opciones de ${etiquetaCampo(clave).toLowerCase()}`), crearCampos(avanzados))
        grupo.appendChild(detalles)
      }
      return grupo
    }
    return controlEscalar(clave, valor, alCambiar, ruta)
  }

  function editorImagen(imagen, alCambiar, ruta) {
    cargarMedios()
    const grupo = elemento('fieldset', ['pagina-web-grupo', 'pagina-web-imagen-editor'])
    grupo.appendChild(elemento('legend', [], 'Fotografía'))
    const vista = document.createElement('img')
    vista.src = imagen.src || ''
    vista.alt = imagen.textoAlternativo || ''
    aplicarEncuadre(vista, imagen)
    const marcoEncuadre = elemento('div', ['pagina-web-imagen-encuadre'])
    const puntoFocal = elemento('span', ['pagina-web-imagen-foco'])
    const actualizarEncuadre = () => {
      aplicarEncuadre(vista, imagen)
      puntoFocal.style.left = `${Math.min(100, Math.max(0, Number(imagen.focoX ?? 50)))}%`
      puntoFocal.style.top = `${Math.min(100, Math.max(0, Number(imagen.focoY ?? 50)))}%`
    }
    actualizarEncuadre()
    marcoEncuadre.append(vista, puntoFocal)
    const estadoImagen = elemento('small', ['pagina-web-campo-ayuda'], imagen.src ? 'Imagen actual de esta sección.' : 'Todavía no hay una imagen elegida.')
    const archivo = document.createElement('input')
    archivo.type = 'file'; archivo.accept = 'image/jpeg,image/png,image/webp'; archivo.hidden = true; archivo.disabled = !puedeEditar
    const elegir = boton('Elegir y optimizar foto', () => archivo.click())
    elegir.disabled = !puedeEditar
    archivo.addEventListener('change', async () => {
      const original = archivo.files?.[0]
      if (!original) return
      elegir.disabled = true; elegir.textContent = 'Preparando foto...'
      try {
        const preparada = await optimizarImagenParaWeb(original)
        const ahorro = preparada.ahorroPorcentaje === null ? '' : ` · ${preparada.ahorroPorcentaje}% menos peso`
        estadoImagen.textContent = `Original ${textoPeso(original.size)} · WebP ${textoPeso(preparada.blob.size)} · ${preparada.ancho} × ${preparada.alto} px${ahorro}. El original permanece en este dispositivo.`
        const respuesta = await fetch('/api/cms/pagina-web/medios', { method: 'POST', headers: {
          'content-type': preparada.tipo, 'x-file-name': encodeURIComponent(preparada.nombre),
          'x-image-width': String(preparada.ancho), 'x-image-height': String(preparada.alto),
          'x-alt-text': encodeURIComponent(imagen.textoAlternativo || ''),
        }, body: preparada.blob })
        const datos = await respuesta.json().catch(() => ({}))
        if (!respuesta.ok) throw new Error(datos.error || 'No se pudo guardar la imagen.')
        imagen.src = datos.medio.url; alCambiar(imagen); vista.src = imagen.src
        medios = [datos.medio, ...medios.filter((medio) => medio.id !== datos.medio.id)]
        mediosCargados = true; marcarCambio(); dibujarEditor()
      } catch (fallo) { estadoImagen.textContent = fallo.message || 'No se pudo preparar la imagen.' }
      finally { elegir.disabled = !puedeEditar; elegir.textContent = 'Elegir y optimizar foto'; archivo.value = '' }
    })
    const controles = elemento('div', ['pagina-web-imagen-controles'])
    controles.append(elegir, archivo, estadoImagen)
    const encuadre = elemento('div', ['pagina-web-encuadre-controles'])
    const controlFoco = (clave, texto) => {
      const etiqueta = elemento('label')
      const salida = elemento('output', [], `${Number(imagen[clave] ?? 50)}%`)
      const cabecera = elemento('span'); cabecera.append(elemento('strong', [], texto), salida)
      const control = document.createElement('input')
      control.type = 'range'; control.min = '0'; control.max = '100'; control.step = '1'; control.value = String(imagen[clave] ?? 50)
      control.disabled = !puedeEditar; control.setAttribute('aria-label', `${texto} de ${ruta}`)
      control.addEventListener('input', () => {
        imagen[clave] = Number(control.value); salida.value = `${control.value}%`; actualizarEncuadre(); alCambiar(imagen); marcarCambio(false)
      })
      etiqueta.append(cabecera, control)
      return etiqueta
    }
    encuadre.append(elemento('strong', [], 'Punto focal'), elemento('small', [], 'Mové el centro visible sin recortar ni perder el archivo optimizado.'), controlFoco('focoX', 'Horizontal'), controlFoco('focoY', 'Vertical'))
    grupo.append(marcoEncuadre, controles, encuadre,
      controlEscalar('textoAlternativo', imagen.textoAlternativo, (siguiente) => { imagen.textoAlternativo = siguiente; vista.alt = siguiente; alCambiar(imagen) }, `${ruta}.textoAlternativo`))
    const biblioteca = elemento('details', ['pagina-web-biblioteca-medios'])
    const resumenBiblioteca = mediosCargados ? `${medios.length} ${medios.length === 1 ? 'imagen disponible' : 'imágenes disponibles'}` : 'Cargando imágenes...'
    biblioteca.appendChild(elemento('summary', [], `Usar una imagen ya cargada · ${resumenBiblioteca}`))
    const cuadricula = elemento('div', ['pagina-web-medios-grid'])
    medios.forEach((medio) => {
      const tarjeta = document.createElement('button')
      tarjeta.type = 'button'; tarjeta.className = 'pagina-web-medio'; tarjeta.disabled = !puedeEditar
      if (imagen.src === medio.url) tarjeta.classList.add('seleccionado')
      const miniatura = document.createElement('img'); miniatura.src = medio.url; miniatura.alt = medio.texto_alternativo || ''
      tarjeta.append(miniatura, elemento('strong', [], medio.nombre), elemento('small', [], `${medio.ancho} × ${medio.alto} · ${textoPeso(medio.bytes)}`))
      tarjeta.addEventListener('click', () => {
        imagen.src = medio.url
        if (!imagen.textoAlternativo && medio.texto_alternativo) imagen.textoAlternativo = medio.texto_alternativo
        alCambiar(imagen); marcarCambio(); dibujarEditor()
      })
      cuadricula.appendChild(tarjeta)
    })
    if (mediosCargados && !medios.length) cuadricula.appendChild(elemento('p', ['pagina-web-vacio'], 'Todavía no hay imágenes guardadas. Cargá la primera desde el botón de arriba.'))
    biblioteca.appendChild(cuadricula)
    grupo.appendChild(biblioteca)
    const detalles = elemento('details', ['pagina-web-avanzado'])
    detalles.append(elemento('summary', [], 'Usar una imagen por enlace'), controlEscalar('src', imagen.src, (siguiente) => { imagen.src = siguiente; vista.src = siguiente; alCambiar(imagen) }, `${ruta}.src`))
    grupo.appendChild(detalles)
    return grupo
  }

  function selectorFormularioPublico(clave, item, lista, alCambiar, ruta, indice) {
    const tarjetaFormulario = clave === 'formularios'
    const enlaceActual = tarjetaFormulario ? item.enlace : item.accion?.enlace
    const rotulo = tarjetaFormulario ? 'Formulario del gestor' : 'Formulario de inscripción'
    const etiquetaSelector = elemento('div', ['pagina-web-campo', 'pagina-web-formulario-selector'])
    etiquetaSelector.appendChild(elemento('span', ['pagina-web-campo-rotulo'], rotulo))
    const selector = document.createElement('select')
    selector.disabled = !puedeEditar || !formulariosDisponibles.length
    selector.setAttribute('aria-label', `${rotulo} de ${ruta}.${indice}`)
    const opcionInicial = document.createElement('option')
    opcionInicial.value = ''
    opcionInicial.textContent = formulariosDisponibles.length ? 'Elegir formulario activo' : 'No hay formularios disponibles'
    selector.appendChild(opcionInicial)
    const tiposRecomendados = clave === 'propuestas'
      ? new Set(['actividad', 'evento', 'inscripcion', 'propuesta'])
      : clave === 'propuestasFormativas'
        ? new Set(['inscripcion', 'evento', 'actividad'])
        : null
    const agregarOpciones = (destino, formularios) => formularios.forEach((formulario) => {
      const opcion = document.createElement('option')
      opcion.value = formulario.enlace
      opcion.textContent = formulario.titulo
      destino.appendChild(opcion)
    })
    if (tiposRecomendados && formulariosDisponibles.length) {
      const recomendados = formulariosDisponibles.filter((formulario) => tiposRecomendados.has(formulario.tipo))
      const otros = formulariosDisponibles.filter((formulario) => !tiposRecomendados.has(formulario.tipo))
      if (recomendados.length) {
        const grupoRecomendados = document.createElement('optgroup')
        grupoRecomendados.label = 'Recomendados para esta sección'
        agregarOpciones(grupoRecomendados, recomendados)
        selector.appendChild(grupoRecomendados)
      }
      if (otros.length) {
        const grupoOtros = document.createElement('optgroup')
        grupoOtros.label = 'Otros formularios públicos'
        agregarOpciones(grupoOtros, otros)
        selector.appendChild(grupoOtros)
      }
    } else agregarOpciones(selector, formulariosDisponibles)
    const formularioActivo = formulariosDisponibles.find((formulario) => formulario.enlace === enlaceActual)
    selector.value = formularioActivo ? enlaceActual : ''
    selector.addEventListener('change', () => {
      const elegido = formulariosDisponibles.find((formulario) => formulario.enlace === selector.value)
      if (!elegido) return
      if (tarjetaFormulario) {
        const tituloPendiente = !item.titulo || item.titulo === 'Nuevo formulario'
        item.enlace = elegido.enlace
        if (tituloPendiente) item.titulo = elegido.titulo
        if (!item.descripcion) item.descripcion = elegido.descripcion || ''
        const categorias = { voluntariado: 'Voluntariado', inscripcion: 'Actividades', actividad: 'Actividades', evento: 'Actividades', pedido: 'Institucional', propuesta: 'Institucional' }
        item.categoria = categorias[elegido.tipo] || item.categoria
        item.responsable = elegido.equipo || item.responsable || ''
      } else {
        item.accion ??= { etiqueta: 'Inscribirme', enlace: '' }
        item.accion.enlace = elegido.enlace
        if (!item.accion.etiqueta) item.accion.etiqueta = 'Inscribirme'
      }
      alCambiar(lista); marcarCambio(); dibujarEditor()
    })
    const eraFormularioDelGestor = /^https:\/\/gestor\.aletea\.org\/formulario\.html\?id=/.test(enlaceActual || '')
    const ayuda = enlaceActual && !selector.value && eraFormularioDelGestor
      ? 'Este enlace pertenece a un formulario que ya no está público y activo. Elegí otro antes de mantener visible la tarjeta.'
      : tarjetaFormulario
        ? 'Solo aparecen formularios públicos y activos.'
        : 'Mostramos primero los formularios recomendados, pero podés elegir cualquier formulario público activo. El texto del botón se personaliza por separado.'
    etiquetaSelector.append(selector, elemento('small', ['pagina-web-campo-ayuda'], ayuda))
    if (formularioActivo) {
      const estado = elemento('div', ['pagina-web-formulario-estado', 'activo'])
      const resumen = elemento('span', ['pagina-web-formulario-insignia'], 'Activo y público')
      const revisar = boton('Revisar formulario', () => abrirEnOtraPestana(formularioActivo.enlace))
      revisar.setAttribute('aria-label', `Revisar ${formularioActivo.titulo}`)
      estado.append(resumen, revisar)
      if (formularioActivo.finalidad) estado.appendChild(elemento('small', ['pagina-web-campo-ayuda'], `${formularioActivo.finalidad} Responsable: ${formularioActivo.responsableDatos || 'Aletea'}. Conservación: ${formularioActivo.conservacionMeses || 12} meses.`))
      etiquetaSelector.appendChild(estado)
    } else if (enlaceActual && eraFormularioDelGestor) {
      const estado = elemento('div', ['pagina-web-formulario-estado', 'retirado'])
      estado.appendChild(elemento('span', ['pagina-web-formulario-insignia'], 'Ya no está disponible'))
      etiquetaSelector.appendChild(estado)
    }
    return etiquetaSelector
  }

  function pendientesParaMostrar(clave, item) {
    const textoListo = (valor, pendiente = '') => typeof valor === 'string' && valor.trim() && valor.trim() !== pendiente
    const enlace = clave === 'formularios' ? item.enlace : item.accion?.enlace
    const formularioActivo = formulariosDisponibles.some((formulario) => formulario.enlace === enlace)
    const pendientes = []
    const exigir = (cumple, nombre) => { if (!cumple) pendientes.push(nombre) }
    if (clave === 'formularios') {
      exigir(textoListo(item.titulo, 'Nuevo formulario'), 'título')
      exigir(textoListo(item.descripcion), 'descripción')
      exigir(textoListo(item.responsable), 'equipo responsable')
      exigir(textoListo(item.accionEtiqueta), 'texto del botón')
    } else if (clave === 'propuestasFormativas') {
      exigir(textoListo(item.titulo, 'Nueva propuesta'), 'título')
      exigir(textoListo(item.proximaEdicion), 'próxima edición')
      exigir(textoListo(item.duracion), 'duración')
      exigir(textoListo(item.horarios), 'horarios')
      exigir(textoListo(item.precio), 'precio')
      exigir(textoListo(item.accion?.etiqueta), 'texto del botón')
    } else {
      exigir(textoListo(item.titulo, 'Nueva actividad'), 'título')
      exigir(textoListo(item.queEs), 'qué es')
      exigir(textoListo(item.paraQuien), 'para quién')
      if ('area' in item) exigir(textoListo(item.area), 'área')
      if ('dia' in item) exigir(textoListo(item.dia), 'día')
      exigir(textoListo(item.cuando), 'cuándo')
      if (item.vigencia !== 'Histórica') exigir(textoListo(item.accion?.etiqueta), 'texto del botón')
    }
    if (clave !== 'propuestas' || item.vigencia !== 'Histórica') exigir(formularioActivo, 'formulario público activo')
    return pendientes
  }

  function estadoPreparacion(clave, item, estadoResumen, vigenciaResumen) {
    const panel = elemento('div', ['pagina-web-preparacion'])
    panel.setAttribute('aria-live', 'polite')
    const actualizarResumen = (pendientes) => {
      if (!estadoResumen) return
      const estado = item.visible ? 'Visible' : pendientes.length ? 'Incompleta' : 'Lista'
      estadoResumen.textContent = estado
      estadoResumen.className = `pagina-web-lista-item-estado ${estado.toLowerCase()}`
      if (vigenciaResumen) {
        const vigencia = item.vigencia === 'Histórica' ? 'Histórica' : 'Vigente'
        vigenciaResumen.textContent = vigencia
        vigenciaResumen.className = `pagina-web-lista-item-vigencia ${vigencia === 'Histórica' ? 'historica' : 'vigente'}`
      }
    }
    const actualizar = () => {
      const pendientes = pendientesParaMostrar(clave, item)
      panel.replaceChildren()
      panel.classList.remove('bloqueada')
      panel.classList.toggle('lista', pendientes.length === 0)
      actualizarResumen(pendientes)
      if (!pendientes.length) {
        panel.append(elemento('strong', [], 'Lista para mostrar'), elemento('small', [], 'Los datos esenciales y el formulario están prontos.'))
        return
      }
      panel.append(
        elemento('strong', [], `${pendientes.length === 1 ? 'Falta 1 dato' : `Faltan ${pendientes.length} datos`}`),
        elemento('small', [], pendientes.join(' · ')),
      )
    }
    const mostrarBloqueo = () => {
      const pendientes = pendientesParaMostrar(clave, item)
      panel.replaceChildren(
        elemento('strong', [], 'Completá la tarjeta antes de mostrarla'),
        elemento('small', [], `Todavía falta: ${pendientes.join(' · ')}`),
      )
      panel.classList.remove('lista')
      panel.classList.add('bloqueada')
      actualizarResumen(pendientes)
    }
    actualizar()
    return { panel, actualizar, mostrarBloqueo }
  }

  function editorLista(clave, lista, alCambiar, ruta) {
    if (clave === 'redes') return editorRedes(lista, alCambiar, ruta)
    const grupo = elemento('fieldset', ['pagina-web-grupo', 'pagina-web-lista'])
    const leyenda = elemento('legend', [], etiquetaCampo(clave))
    if (clave === 'formularios') {
      const ayuda = elemento('div', ['pagina-web-formularios-ayuda'])
      const textoAyuda = elemento('div')
      textoAyuda.appendChild(elemento('p', ['ayuda'], formulariosDisponibles.length
        ? 'Elegí un formulario público activo. El enlace se completa solo y después podés personalizar el texto de la tarjeta.'
        : 'Todavía no hay formularios públicos activos. Creá o activá uno en Formularios para poder elegirlo acá.'))
      const pasos = elemento('ol', ['pagina-web-formularios-pasos'])
      ;['Crear y ordenar preguntas', 'Asignar equipo y privacidad', 'Activar el formulario', 'Vincular y mostrar en la web'].forEach((paso) => pasos.appendChild(elemento('li', [], paso)))
      textoAyuda.appendChild(pasos)
      ayuda.appendChild(textoAyuda)
      const abrirFormularios = boton('Ir a Formularios', () => {
        if (alIrA) alIrA('cms-formularios')
        else window.location.hash = 'cms-formularios'
      })
      ayuda.appendChild(abrirFormularios)
      grupo.appendChild(ayuda)
    }
    const cabecera = elemento('div', ['pagina-web-lista-cabecera'])
    const plurales = { botón: 'botones', área: 'áreas', opción: 'opciones', sección: 'secciones', publicación: 'publicaciones', propuesta: 'propuestas' }
    const singular = singularDeLista(clave)
    cabecera.append(elemento('span', [], `${lista.length} ${lista.length === 1 ? singular : plurales[singular] || `${singular}s`}`))
    const claveListaAbierta = `${seccionActiva}:${ruta}`
    if (puedeEditar && clave !== 'navegacion' && lista.length < (MAXIMOS_LISTA[clave] || 30)) cabecera.appendChild(boton(`Agregar ${singularDeLista(clave)}`, () => {
      lista.push(ejemploParaLista(clave, lista))
      listasAbiertas.set(claveListaAbierta, lista.length - 1)
      alCambiar(normalizarOrden(lista)); marcarCambio(); dibujarEditor()
    }))
    grupo.append(leyenda, cabecera)
    const items = elemento('div', ['pagina-web-lista-items'])
    lista.forEach((item, indice) => {
      const tarjeta = elemento('details', ['pagina-web-lista-item'])
      tarjeta.open = listasAbiertas.get(claveListaAbierta) === indice
      tarjeta.addEventListener('toggle', () => {
        if (tarjeta.open) {
          listasAbiertas.set(claveListaAbierta, indice)
          ;[...items.querySelectorAll(':scope > .pagina-web-lista-item[open]')].forEach((otra) => {
            if (otra !== tarjeta) otra.open = false
          })
        } else if (listasAbiertas.get(claveListaAbierta) === indice) listasAbiertas.delete(claveListaAbierta)
      })
      const titulo = typeof item === 'string' ? item || `${etiquetaCampo(clave)} ${indice + 1}` : item?.titulo || item?.nombre || item?.grupo || item?.etiqueta || `${singularDeLista(clave)} ${indice + 1}`
      const barra = elemento('summary', ['pagina-web-lista-item-cabecera'])
      const identificacion = elemento('span', ['pagina-web-lista-item-titulo'])
      const usaPreparacion = ['formularios', 'propuestas', 'propuestasFormativas'].includes(clave) && item && typeof item === 'object'
      const estadoResumen = usaPreparacion ? elemento('span', ['pagina-web-lista-item-estado']) : null
      const vigenciaResumen = clave === 'propuestas' && item && typeof item === 'object' ? elemento('span', ['pagina-web-lista-item-vigencia']) : null
      identificacion.append(elemento('span', ['pagina-web-lista-item-numero'], String(indice + 1).padStart(2, '0')), elemento('strong', [], titulo))
      if (vigenciaResumen) identificacion.appendChild(vigenciaResumen)
      if (estadoResumen) identificacion.appendChild(estadoResumen)
      identificacion.appendChild(elemento('span', ['pagina-web-lista-item-editar'], 'Editar'))
      barra.appendChild(identificacion)
      if (puedeEditar) {
        const acciones = elemento('div', ['pagina-web-lista-item-acciones'])
        const duplicar = botonIcono('copiar', `Duplicar ${titulo}`, () => {
          const copia = clonarContenidoPaginaWeb(item)
          if (copia && typeof copia === 'object') {
            if ('id' in copia) copia.id = `${String(copia.id || singularDeLista(clave)).replace(/-copia-\d+$/, '')}-copia-${Date.now()}`
            if ('titulo' in copia) copia.titulo = `${copia.titulo || titulo}, copia`
            if ('nombre' in copia) copia.nombre = `${copia.nombre || titulo}, copia`
            if ('visible' in copia) copia.visible = false
          }
          lista.splice(indice + 1, 0, copia)
          listasAbiertas.set(claveListaAbierta, indice + 1)
          alCambiar(normalizarOrden(lista)); marcarCambio(); dibujarEditor()
        })
        const subir = botonIcono('atras', `Subir ${titulo}`, () => { if (indice > 0) { [lista[indice - 1], lista[indice]] = [lista[indice], lista[indice - 1]]; alCambiar(normalizarOrden(lista)); marcarCambio(); dibujarEditor() } })
        subir.disabled = indice === 0
        const bajar = botonIcono('adelante', `Bajar ${titulo}`, () => { if (indice < lista.length - 1) { [lista[indice + 1], lista[indice]] = [lista[indice], lista[indice + 1]]; alCambiar(normalizarOrden(lista)); marcarCambio(); dibujarEditor() } })
        bajar.disabled = indice === lista.length - 1
        const quitar = botonIcono('eliminar', `Quitar ${titulo}`, () => { lista.splice(indice, 1); alCambiar(normalizarOrden(lista)); marcarCambio(); dibujarEditor() })
        if (clave === 'navegacion') acciones.append(subir, bajar)
        else acciones.append(duplicar, subir, bajar, quitar)
        barra.appendChild(acciones)
      }
      tarjeta.appendChild(barra)
      const cuerpo = elemento('div', ['pagina-web-lista-item-cuerpo'])
      if (item && typeof item === 'object') {
        const preparacion = usaPreparacion ? estadoPreparacion(clave, item, estadoResumen, vigenciaResumen) : null
        if (['formularios', 'propuestas', 'propuestasFormativas'].includes(clave)) cuerpo.appendChild(selectorFormularioPublico(clave, item, lista, alCambiar, ruta, indice))
        const entradas = Object.entries(item).filter(([subclave]) => !['id', 'orden'].includes(subclave))
        const campoPrincipal = (subclave) => (subclave === 'imagen' && ruta.includes('.novedades')) || (subclave === 'modalidad' && ruta.includes('.propuestasFormativas'))
        const basicos = entradas.filter(([subclave]) => !CAMPOS_AVANZADOS.has(subclave) || campoPrincipal(subclave))
        const avanzados = entradas.filter(([subclave]) => CAMPOS_AVANZADOS.has(subclave) && !campoPrincipal(subclave))
        const campos = elemento('div', ['pagina-web-campos'])
        basicos.forEach(([subclave, subvalor]) => campos.appendChild(editorValor(subclave, subvalor, (siguiente) => {
          if (subclave === 'visible' && preparacion && siguiente && pendientesParaMostrar(clave, item).length) {
            preparacion.mostrarBloqueo()
            return false
          }
          item[subclave] = siguiente
          alCambiar(lista)
          return true
        }, `${ruta}.${indice}.${subclave}`)))
        cuerpo.appendChild(campos)
        if (avanzados.length) {
          const detalles = elemento('details', ['pagina-web-avanzado'])
          const camposAvanzados = elemento('div', ['pagina-web-campos'])
          avanzados.forEach(([subclave, subvalor]) => camposAvanzados.appendChild(editorValor(subclave, subvalor, (siguiente) => { item[subclave] = siguiente; alCambiar(lista) }, `${ruta}.${indice}.${subclave}`)))
          detalles.append(elemento('summary', [], 'Más opciones'), camposAvanzados)
          cuerpo.appendChild(detalles)
        }
        if (preparacion) {
          cuerpo.appendChild(preparacion.panel)
          cuerpo.addEventListener('input', preparacion.actualizar)
          cuerpo.addEventListener('change', (evento) => {
            if (evento.target?.dataset?.paginaWebCambioRechazado === 'true') {
              delete evento.target.dataset.paginaWebCambioRechazado
              return
            }
            preparacion.actualizar()
          })
        }
      } else cuerpo.appendChild(controlEscalar(singularDeLista(clave), item, (siguiente) => { lista[indice] = siguiente; alCambiar(lista) }, `${ruta}.${indice}`))
      tarjeta.appendChild(cuerpo)
      items.appendChild(tarjeta)
    })
    if (!lista.length) items.appendChild(elemento('p', ['pagina-web-vacio'], `Todavía no hay ${etiquetaCampo(clave).toLowerCase()}.`))
    grupo.appendChild(items)
    return grupo
  }

  function editorRedes(lista, alCambiar, ruta) {
    const grupo = elemento('fieldset', ['pagina-web-grupo', 'pagina-web-redes-editor'])
    grupo.appendChild(elemento('legend', [], 'Perfiles sociales'))
    grupo.appendChild(elemento('p', ['ayuda'], 'Activá solo las redes que Aletea usa. El enlace y el nombre aparecen al activarlas.'))
    const filas = elemento('div', ['pagina-web-redes-filas'])
    lista.forEach((red, indice) => {
      const fila = elemento('article', ['pagina-web-red-fila'])
      if (red.visible) fila.classList.add('activa')
      const cabecera = elemento('div', ['pagina-web-red-cabecera'])
      const identidad = elemento('span', ['pagina-web-red-identidad'])
      const icono = elemento('span', ['pagina-web-red-icono'])
      icono.style.setProperty('--red-icono', `url(/assets/iconos-redes/${red.red}.svg)`)
      identidad.append(icono, elemento('strong', [], red.etiqueta || red.red))
      const interruptor = document.createElement('input')
      interruptor.type = 'checkbox'; interruptor.checked = Boolean(red.visible); interruptor.disabled = !puedeEditar
      interruptor.setAttribute('aria-label', `Mostrar ${red.etiqueta || red.red}`)
      interruptor.addEventListener('change', () => { red.visible = interruptor.checked; alCambiar(lista); marcarCambio(); dibujarEditor() })
      cabecera.append(identidad, interruptor); fila.appendChild(cabecera)
      if (red.visible) {
        const campos = elemento('div', ['pagina-web-red-campos'])
        campos.append(
          controlEscalar('etiqueta', red.etiqueta, (valor) => { red.etiqueta = valor; alCambiar(lista) }, `${ruta}.${indice}.etiqueta`),
          controlEscalar('enlace', red.enlace, (valor) => { red.enlace = valor; alCambiar(lista) }, `${ruta}.${indice}.enlace`),
          controlEscalar('color', red.color, (valor) => { red.color = valor; alCambiar(lista) }, `${ruta}.${indice}.color`),
        )
        fila.appendChild(campos)
      }
      filas.appendChild(fila)
    })
    grupo.appendChild(filas)
    return grupo
  }

  function selectorOperacion(etiqueta, valor, opciones, alCambiar, ruta) {
    const campo = elemento('label', ['pagina-web-campo'])
    campo.appendChild(elemento('span', ['pagina-web-campo-rotulo'], etiqueta))
    const selector = document.createElement('select')
    selector.disabled = !puedeEditar
    selector.dataset.paginaWebRuta = ruta
    selector.setAttribute('aria-label', `${etiqueta} de ${ruta}`)
    opciones.forEach(([valorOpcion, texto]) => {
      const opcion = document.createElement('option')
      opcion.value = String(valorOpcion); opcion.textContent = texto
      selector.appendChild(opcion)
    })
    selector.value = String(valor)
    selector.addEventListener('change', () => {
      const siguiente = typeof valor === 'number' ? Number(selector.value) : selector.value
      alCambiar(siguiente); marcarCambio()
    })
    campo.appendChild(selector)
    return campo
  }

  function tarjetaPolitica(titulo, descripcion, clase = '') {
    const tarjeta = elemento('article', ['pagina-web-politica', ...(clase ? [clase] : [])])
    tarjeta.append(elemento('strong', [], titulo), elemento('p', [], descripcion))
    return tarjeta
  }

  function bloqueOperacion(titulo, resumen, contenido, abierto = false) {
    const bloque = elemento('details', ['pagina-web-operacion-bloque'])
    bloque.open = abierto
    const cabecera = document.createElement('summary')
    cabecera.append(elemento('strong', [], titulo), elemento('small', [], resumen))
    bloque.append(cabecera, contenido)
    return bloque
  }

  function textoVariacionMetrica(valor) {
    if (valor === null || valor === undefined) return 'Sin comparación suficiente'
    if (!valor) return 'Sin cambios frente al período anterior'
    return `${valor > 0 ? '+' : ''}${valor}% frente al período anterior`
  }

  function etiquetaAccionMetrica(accion) {
    return String(accion || '').replaceAll(/[:_-]+/g, ' ').replace(/^./, (letra) => letra.toUpperCase())
  }

  function recomendacionMetrica(datos) {
    const visitas = Number(datos?.resumen?.visitas || 0)
    const acciones = Number(datos?.resumen?.acciones || 0)
    const paginaPrincipal = datos?.paginas?.[0]?.ruta
    if (visitas && acciones / visitas < 0.05) return 'Hay visitas, pero pocas acciones públicas. Revisá si los botones principales son claros y están visibles en teléfono.'
    if (datos?.variacion?.visitas !== null && datos.variacion.visitas < -15) return 'Las visitas bajaron frente al período anterior. Revisá el calendario de publicaciones y los enlaces compartidos.'
    if (paginaPrincipal) return `${paginaPrincipal} concentra más consultas. Mantené allí la información principal y un próximo paso fácil de encontrar.`
    return 'Esperá un período completo antes de tomar decisiones. Las variaciones de pocos días pueden ser engañosas.'
  }

  function resumenVisualMetricasWeb() {
    const panel = elemento('section', ['pagina-web-metricas'])
    panel.setAttribute('aria-label', 'Resumen de métricas agregadas')
    const cabecera = elemento('div', ['pagina-web-metricas-cabecera'])
    const titulo = elemento('div')
    titulo.append(elemento('strong', [], 'Alcance de la página'), elemento('small', [], 'Solo resultados agrupados, nunca personas ni respuestas de formularios.'))
    if (metricasWeb?.muestra) titulo.appendChild(elemento('span', ['pagina-web-metricas-muestra'], 'Datos de muestra local'))
    const periodos = elemento('div', ['pagina-web-metricas-periodos'])
    ;[[7, '7 días'], [30, '30 días'], [90, '90 días']].forEach(([dias, rotulo]) => {
      const control = boton(rotulo, () => cargarMetricasWeb(dias))
      if (dias === metricasWebDias) control.classList.add('activa')
      control.disabled = cargandoMetricasWeb
      periodos.appendChild(control)
    })
    cabecera.append(titulo, periodos)
    panel.appendChild(cabecera)

    if (cargandoMetricasWeb) {
      panel.appendChild(elemento('p', ['pagina-web-metricas-estado'], 'Cargando el resumen agregado...'))
      return panel
    }
    if (errorMetricasWeb) {
      const estado = elemento('div', ['pagina-web-metricas-estado', 'error'])
      estado.append(elemento('p', [], errorMetricasWeb), boton('Reintentar', () => cargarMetricasWeb()))
      panel.appendChild(estado)
      return panel
    }
    if (!metricasWeb || metricasWeb.estado !== 'con_datos') {
      const estado = elemento('div', ['pagina-web-metricas-vacio'])
      estado.append(
        elemento('strong', [], 'Todavía no hay mediciones reales'),
        elemento('p', [], contenido.operacionWeb.analitica.activa
          ? 'La configuración figura activa, pero aún no llegaron resultados agregados al gestor.'
          : 'Las métricas continúan apagadas. Este espacio se completará cuando Aletea apruebe la activación.'),
        elemento('small', [], 'No se muestran cifras de ejemplo para evitar confundirlas con resultados reales.'),
      )
      panel.appendChild(estado)
      return panel
    }

    const formato = new Intl.NumberFormat('es-UY')
    const tarjetas = elemento('div', ['pagina-web-metricas-tarjetas'])
    ;[
      ['Visitas', metricasWeb.resumen.visitas, metricasWeb.variacion.visitas],
      ['Páginas vistas', metricasWeb.resumen.paginasVistas, metricasWeb.variacion.paginasVistas],
      ['Acciones públicas', metricasWeb.resumen.acciones, metricasWeb.variacion.acciones],
    ].forEach(([rotulo, valor, variacion]) => {
      const tarjeta = elemento('article', ['pagina-web-metrica'])
      tarjeta.append(elemento('span', [], rotulo), elemento('strong', [], formato.format(valor)), elemento('small', [], textoVariacionMetrica(variacion)))
      tarjetas.appendChild(tarjeta)
    })
    panel.appendChild(tarjetas)

    const detalles = elemento('div', ['pagina-web-metricas-detalles'])
    const lista = (tituloLista, filas, clave, valor, transformar = (dato) => dato) => {
      const bloque = elemento('section')
      bloque.appendChild(elemento('strong', [], tituloLista))
      const contenidoLista = elemento('ol')
      if (!filas.length) contenidoLista.appendChild(elemento('li', [], 'Sin datos suficientes'))
      filas.forEach((fila) => {
        const item = document.createElement('li')
        item.append(elemento('span', [], transformar(fila[clave])), elemento('b', [], formato.format(fila[valor])))
        contenidoLista.appendChild(item)
      })
      bloque.appendChild(contenidoLista)
      return bloque
    }
    detalles.append(
      lista('Páginas más consultadas', metricasWeb.paginas || [], 'ruta', 'vistas'),
      lista('Acciones más usadas', metricasWeb.acciones || [], 'accion', 'cantidad', etiquetaAccionMetrica),
    )
    const recomendacion = elemento('article', ['pagina-web-metricas-recomendacion'])
    recomendacion.append(elemento('strong', [], 'Próximo paso sugerido'), elemento('p', [], recomendacionMetrica(metricasWeb)))
    panel.append(detalles, recomendacion, elemento('small', ['pagina-web-operacion-nota'], `Período: ${metricasWeb.desde} a ${metricasWeb.hasta}. Resultados agregados sin identificadores personales.`))
    return panel
  }

  function estadoSincronizacionMetricasWeb() {
    const panel = elemento('section', ['pagina-web-sincronizacion'])
    panel.append(
      elemento('strong', [], 'Preparación de la conexión'),
      elemento('p', [], 'El gestor muestra qué está listo y qué requiere una decisión. No solicita claves ni activa servicios desde esta pantalla.'),
    )
    const lista = elemento('ol')
    pasosSincronizacionMetricasWeb({
      aprobada: contenido.operacionWeb.analitica.activa,
      hayDatos: metricasWeb?.estado === 'con_datos' && !metricasWeb?.muestra,
    }).forEach((paso) => {
      const item = elemento('li', [`estado-${paso.estado}`])
      item.append(
        elemento('span', ['pagina-web-sincronizacion-marca'], paso.estado === 'completo' ? 'Listo' : 'Pendiente'),
        elemento('span', [], paso.etiqueta),
      )
      lista.appendChild(item)
    })
    panel.appendChild(lista)
    return panel
  }

  function editorOperacionWeb() {
    const operacion = contenido.operacionWeb
    const fragmento = document.createDocumentFragment()
    const resumen = elemento('section', ['pagina-web-operacion-resumen'])
    resumen.append(
      elemento('span', ['pagina-web-operacion-insignia'], 'Configuración segura'),
      elemento('h3', [], 'La web queda preparada, no activada'),
      elemento('p', [], 'Estos ajustes guardan decisiones operativas. No encienden métricas, no procesan pagos y no publican cambios por sí solos.'),
    )
    fragmento.appendChild(resumen)

    const analitica = elemento('fieldset', ['pagina-web-grupo', 'pagina-web-operacion-tarjeta'])
    analitica.setAttribute('aria-label', 'Métricas anónimas')
    analitica.appendChild(tarjetaPolitica('Sin perfiles personales', 'Cloudflare aportará visitas y páginas agrupadas. Las acciones públicas requieren una etapa separada. Nunca respuestas de formularios.'))
    analitica.appendChild(estadoSincronizacionMetricasWeb())
    analitica.appendChild(resumenVisualMetricasWeb())
    const camposAnalitica = elemento('div', ['pagina-web-campos'])
    camposAnalitica.append(
      controlEscalar('activa', operacion.analitica.activa, (valor) => { operacion.analitica.activa = valor }, 'operacionWeb.analitica.activa'),
      selectorOperacion('Conservar detalle', operacion.analitica.retencionDias, [[30, '30 días'], [90, '90 días, recomendado'], [180, '180 días']], (valor) => { operacion.analitica.retencionDias = valor }, 'operacionWeb.analitica.retencionDias'),
      selectorOperacion('Revisar resultados', operacion.analitica.revisarCada, [['Mensual', 'Mensualmente'], ['Trimestral', 'Cada tres meses']], (valor) => { operacion.analitica.revisarCada = valor }, 'operacionWeb.analitica.revisarCada'),
      controlEscalar('responsable', operacion.analitica.responsable, (valor) => { operacion.analitica.responsable = valor }, 'operacionWeb.analitica.responsable'),
    )
    analitica.appendChild(camposAnalitica)
    analitica.appendChild(elemento('small', ['pagina-web-operacion-nota'], `Proveedor previsto: ${operacion.analitica.proveedor}. La activación se hará en una etapa posterior.`))

    const privacidad = elemento('fieldset', ['pagina-web-grupo', 'pagina-web-operacion-tarjeta'])
    privacidad.setAttribute('aria-label', 'Privacidad y conservación')
    privacidad.appendChild(tarjetaPolitica('Pedir solamente lo necesario', 'Contacto, actividades, voluntariado y donaciones tendrán finalidades separadas. Los datos delicados no llegan a la analítica.'))
    const camposPrivacidad = elemento('div', ['pagina-web-campos'])
    camposPrivacidad.append(
      controlEscalar('avisoEnlace', operacion.privacidad.avisoEnlace, (valor) => { operacion.privacidad.avisoEnlace = valor }, 'operacionWeb.privacidad.avisoEnlace'),
      controlEscalar('correo', operacion.privacidad.correo, (valor) => { operacion.privacidad.correo = valor }, 'operacionWeb.privacidad.correo'),
      selectorOperacion('Eliminar consultas sin seguimiento', operacion.privacidad.conservarConsultasMeses, [[6, 'Después de 6 meses'], [12, 'Después de 12 meses, recomendado']], (valor) => { operacion.privacidad.conservarConsultasMeses = valor }, 'operacionWeb.privacidad.conservarConsultasMeses'),
      controlEscalar('responsable', operacion.privacidad.responsable, (valor) => { operacion.privacidad.responsable = valor }, 'operacionWeb.privacidad.responsable'),
    )
    privacidad.appendChild(camposPrivacidad)

    const inventario = elemento('fieldset', ['pagina-web-grupo', 'pagina-web-operacion-tarjeta'])
    inventario.setAttribute('aria-label', 'Inventario sencillo')
    const estados = elemento('div', ['pagina-web-operacion-estados'])
    operacion.inventario.estados.forEach((estado) => estados.appendChild(elemento('span', [], estado)))
    inventario.append(tarjetaPolitica('Estados manuales', 'No exige cantidades exactas. Una persona responsable confirma y actualiza la disponibilidad.'), estados)
    const camposInventario = elemento('div', ['pagina-web-campos'])
    camposInventario.append(
      controlEscalar('responsable', operacion.inventario.responsable, (valor) => { operacion.inventario.responsable = valor }, 'operacionWeb.inventario.responsable'),
      controlEscalar('fecha', operacion.inventario.fecha, (valor) => { operacion.inventario.fecha = valor }, 'operacionWeb.inventario.fecha'),
    )
    inventario.appendChild(camposInventario)

    const pagos = elemento('fieldset', ['pagina-web-grupo', 'pagina-web-operacion-tarjeta'])
    pagos.setAttribute('aria-label', 'Pagos externos')
    pagos.append(
      tarjetaPolitica('Mercado Pago, mediante enlaces externos', 'Donaciones y compras se cobran fuera del gestor. Aletea registra solamente referencia, concepto, importe, fecha y estado.', 'protegida'),
      tarjetaPolitica('Datos de tarjetas bloqueados', 'El gestor no recibe ni guarda números de tarjeta, códigos de seguridad ni credenciales privadas.', 'protegida'),
      controlEscalar('confirmarStockAntesDeCobrar', operacion.pagos.confirmarStockAntesDeCobrar, (valor) => { operacion.pagos.confirmarStockAntesDeCobrar = valor }, 'operacionWeb.pagos.confirmarStockAntesDeCobrar'),
    )

    fragmento.append(
      bloqueOperacion('Métricas anónimas', operacion.analitica.activa ? 'Activadas, revisá el aviso de privacidad' : 'Apagadas durante la preparación', analitica, true),
      bloqueOperacion('Privacidad y conservación', 'Aviso, contacto y eliminación de consultas', privacidad),
      bloqueOperacion('Inventario sencillo', 'Cuatro estados manuales y una persona responsable', inventario),
      bloqueOperacion('Pagos externos', 'Mercado Pago sin datos de tarjetas en el gestor', pagos),
    )
    return fragmento
  }

  function editorAparienciaSitio() {
    const apariencia = contenido.aparienciaSitio
    const fragmento = document.createDocumentFragment()
    const resumen = elemento('section', ['pagina-web-operacion-resumen'])
    resumen.append(
      elemento('span', ['pagina-web-operacion-insignia'], 'Opciones seguras'),
      elemento('h3', [], 'Personalizá la experiencia, no la geometría'),
      elemento('p', [], 'Elegí el ritmo y los recursos visuales. El sitio siempre respeta la preferencia del dispositivo de reducir movimiento.'),
    )
    const tarjeta = elemento('fieldset', ['pagina-web-grupo', 'pagina-web-operacion-tarjeta'])
    tarjeta.append(
      selectorOperacion('Movimiento', apariencia.movimiento, [['sin_movimiento', 'Sin movimiento'], ['suave', 'Suave, recomendado'], ['normal', 'Normal']], (valor) => { apariencia.movimiento = valor }, 'aparienciaSitio.movimiento'),
      controlEscalar('mostrarListon', apariencia.mostrarListon, (valor) => { apariencia.mostrarListon = valor }, 'aparienciaSitio.mostrarListon'),
      controlEscalar('mostrarOrbita', apariencia.mostrarOrbita, (valor) => { apariencia.mostrarOrbita = valor }, 'aparienciaSitio.mostrarOrbita'),
      controlEscalar('mostrarRedAreas', apariencia.mostrarRedAreas, (valor) => { apariencia.mostrarRedAreas = valor }, 'aparienciaSitio.mostrarRedAreas'),
      elemento('small', ['pagina-web-operacion-nota'], 'Al desactivar un recurso visual, los enlaces y las tarjetas siguen disponibles como contenido accesible.'),
    )
    fragmento.append(resumen, tarjeta)
    return fragmento
  }

  function destinoDeProblema(texto) {
    const normalizado = texto.toLocaleLowerCase('es')
    const reglas = [
      [/portada/, 'portada'], [/cifra|impacto/, 'impacto'], [/área|area/, 'areas'], [/institución|institucion/, 'institucion'],
      [/actividad/, 'actividades'], [/formación|formacion|propuesta formativa/, 'formacion'], [/biblioteca/, 'biblioteca'],
      [/recurso/, 'recursos'], [/tienda|producto/, 'tienda'], [/actualidad|publicación|publicacion/, 'actualidad'],
      [/familia/, 'familias'], [/donación|donacion/, 'donaciones'], [/formulario|contacto/, 'contacto'],
      [/privacidad/, 'privacidad'], [/métrica|metrica|inventario|pago/, 'operacion'], [/seo|buscador|organización|organizacion/, 'general'],
    ]
    const seccion = reglas.find(([patron]) => patron.test(normalizado))?.[1] || 'portada'
    const datosSeccion = SECCIONES_PAGINA_WEB.find((item) => item.id === seccion)
    let ruta = ''
    if (/imagen|foto/.test(normalizado) && datosSeccion) ruta = rutaImagenDeSeccion(datosSeccion)
    if (!ruta && /visible|mostrarse|activar/.test(normalizado) && datosSeccion) ruta = rutaVisibilidadDeSeccion(datosSeccion)
    return { seccion, ruta }
  }

  function editorCalidadPublicacion() {
    const errores = validarContenidoPaginaWeb(contenido)
    const listo = errores.length === 0 && !sucio
    const fragmento = document.createDocumentFragment()
    const resumen = elemento('section', ['pagina-web-operacion-resumen', listo ? 'estado-listo' : 'estado-revision'])
    resumen.append(
      elemento('span', ['pagina-web-operacion-insignia'], listo ? 'Aprobado automáticamente' : 'Requiere revisión'),
      elemento('h3', [], listo ? 'El borrador guardado supera los controles automáticos' : errores.length ? `${errores.length} punto${errores.length === 1 ? '' : 's'} por corregir` : 'Guardá los cambios antes de publicar'),
      elemento('p', [], listo ? 'La demostración supera la barrera técnica en escritorio y teléfonos de 390 y 320 píxeles. Los ejemplos continúan identificados.' : 'Esta pantalla reúne el próximo paso sin afirmar una aprobación que todavía no ocurrió.'),
    )
    const lista = elemento('ul', ['pagina-web-calidad-lista'])
    const items = errores.length ? errores.slice(0, 8) : ['Contenido obligatorio completo', 'Enlaces y límites verificados', 'Metadatos para buscadores incluidos']
    items.forEach((texto) => {
      const fila = elemento('li', [errores.length ? 'estado-pendiente' : 'estado-completo'])
      if (errores.length) {
        const control = boton(texto, () => {
          const destino = destinoDeProblema(texto)
          abrirSeccion(destino.seccion, { ruta: destino.ruta, enfocar: true })
        })
        control.setAttribute('aria-label', `Corregir: ${texto}`)
        fila.appendChild(control)
      } else fila.textContent = texto
      lista.appendChild(fila)
    })
    const acciones = elemento('div', ['pagina-web-calidad-acciones'])
    const prueba = elemento('a', ['boton', 'boton-secundario'], 'Abrir sitio de prueba')
    prueba.href = SITIO_PRUEBA; prueba.target = '_blank'; prueba.rel = 'noopener noreferrer'
    const guia = elemento('a', ['boton', 'boton-secundario'], 'Abrir guía de validación')
    guia.href = `${SITIO_PRUEBA}/validacion-corto-plazo/`; guia.target = '_blank'; guia.rel = 'noopener noreferrer'
    acciones.append(prueba, guia)
    fragmento.append(resumen, lista, acciones, elemento('small', ['pagina-web-operacion-nota'], `Revisión ${contenido.editorial?.revision || 0}. Última actualización: ${contenido.editorial?.actualizadoEn ? new Date(contenido.editorial.actualizadoEn).toLocaleString('es-UY') : 'sin registrar'}.`))
    return fragmento
  }

  function editorSeleccionContextual() {
    if (!rutaSeleccionada) return null
    const valor = valorEnRuta(contenido, rutaSeleccionada)
    if (valor === undefined) return null
    const contenedor = elemento('section', ['pagina-web-inspector-contextual'])
    const cabecera = elemento('div', ['pagina-web-inspector-contextual-cabecera'])
    const identidad = elemento('div')
    identidad.append(elemento('span', [], 'Elemento seleccionado'), elemento('strong', [], etiquetaCampo(rutaSeleccionada.split('.').at(-1))))
    const cerrar = boton('Ver toda la sección', () => { rutaSeleccionada = ''; dibujarEditor() })
    cabecera.append(identidad, cerrar)
    const control = editorValor(rutaSeleccionada.split('.').at(-1), valor, (siguiente) => asignarEnRuta(contenido, rutaSeleccionada, siguiente), rutaSeleccionada)
    contenedor.append(cabecera, elemento('small', [], 'Los cambios se reflejan inmediatamente en la maqueta.'), control)
    return contenedor
  }

  function activarContextoSinPerderFoco(ruta) {
    const editor = raiz.querySelector('[data-pagina-web-editor]')
    const campo = [...raiz.querySelectorAll('[data-pagina-web-ruta]')].find((item) => item.dataset.paginaWebRuta === ruta)
    if (!editor || !campo) return
    editor.classList.add('pagina-web-editor-contextual')
    editor.querySelectorAll(':scope > .pagina-web-grupo').forEach((grupo) => grupo.classList.remove('pagina-web-grupo-seleccionado'))
    let grupo = campo.closest('.pagina-web-grupo')
    while (grupo?.parentElement && grupo.parentElement !== editor) {
      const superior = grupo.parentElement.closest('.pagina-web-grupo')
      if (!superior) break
      grupo = superior
    }
    grupo?.classList.add('pagina-web-grupo-seleccionado')
    campo.closest('.pagina-web-campo')?.classList.add('pagina-web-campo-enfocado')
  }

  function dibujarEditor() {
    const editor = raiz.querySelector('[data-pagina-web-editor]')
    if (!editor || !contenido) return
    vaciar(editor)
    const seccion = SECCIONES_PAGINA_WEB.find((item) => item.id === seccionActiva)
    const cabeceraInspector = elemento('div', ['pagina-web-editor-cabecera'])
    const identidadInspector = elemento('div')
    const grupo = GRUPOS_EDITOR_WEB.find((item) => item.secciones.includes(seccionActiva))
    const rutaActual = rutaSeleccionada ? etiquetaCampo(rutaSeleccionada.split('.').at(-1)) : 'Toda la sección'
    const migas = elemento('nav', ['pagina-web-migas'], `${grupo?.titulo || 'Página web'} / ${seccion.titulo} / ${rutaActual}`)
    migas.setAttribute('aria-label', 'Ubicación actual en el editor')
    identidadInspector.append(elemento('p', ['pagina-web-editor-sobrelinea'], 'Editando ahora'), elemento('h2', [], seccion.titulo), migas, elemento('p', ['ayuda'], seccion.ayuda))
    const ancho = elemento('label', ['pagina-web-inspector-ancho'])
    const anchoTexto = elemento('span', [], `Panel ${anchoInspector}px`)
    const anchoControl = document.createElement('input')
    anchoControl.type = 'range'; anchoControl.min = '340'; anchoControl.max = '560'; anchoControl.step = '20'; anchoControl.value = String(anchoInspector)
    anchoControl.disabled = !puedeEditar
    anchoControl.setAttribute('aria-label', 'Ancho del panel de edición')
    anchoControl.addEventListener('input', () => {
      anchoInspector = Number(anchoControl.value); anchoTexto.textContent = `Panel ${anchoInspector}px`
      raiz.querySelector('.pagina-web-trabajo')?.style.setProperty('--pagina-web-inspector-ancho', `${anchoInspector}px`)
    })
    ancho.append(anchoTexto, anchoControl)
    cabeceraInspector.append(identidadInspector, ancho)
    editor.appendChild(cabeceraInspector)
    const pestañas = elemento('div', ['pagina-web-inspector-pestanas'])
    ;[
      ['contenido', 'Contenido'], ['diseno', 'Diseño'], ['avanzado', 'Avanzado'],
    ].forEach(([id, texto]) => {
      const control = boton(texto, () => { inspectorActivo = id; dibujarEditor() })
      control.classList.toggle('activa', inspectorActivo === id)
      control.setAttribute('aria-pressed', String(inspectorActivo === id))
      pestañas.appendChild(control)
    })
    editor.appendChild(pestañas)
    if (inspectorActivo === 'contenido') {
      const contextual = editorSeleccionContextual()
      if (contextual) { editor.appendChild(contextual); return }
    }
    const tipografia = editorTipografia(seccionActiva)
    if (inspectorActivo === 'diseno') {
      if (tipografia) editor.appendChild(tipografia)
      else editor.appendChild(elemento('div', ['pagina-web-inspector-vacio'], 'Esta sección usa el estilo institucional del sitio. Sus opciones visuales se mantienen consistentes automáticamente.'))
      if (seccionActiva !== 'impacto' && seccionActiva !== 'apariencia') return
    }
    if (seccionActiva === 'operacion') {
      editor.appendChild(editorOperacionWeb())
      return
    }
    if (seccionActiva === 'apariencia') {
      editor.appendChild(editorAparienciaSitio())
      return
    }
    if (seccionActiva === 'calidad') {
      editor.appendChild(editorCalidadPublicacion())
      return
    }
    seccion.rutas.forEach((ruta) => {
      const clave = ruta.split('.').at(-1)
      const valor = valorEnRuta(contenido, ruta)
      if (valor !== undefined) editor.appendChild(editorValor(clave, valor, (siguiente) => asignarEnRuta(contenido, ruta, siguiente), ruta))
    })
    if (inspectorActivo === 'avanzado') editor.querySelectorAll('.pagina-web-avanzado').forEach((detalle) => { detalle.open = true })
  }

  function dibujarVistaPrevia() {
    const marco = raiz.querySelector('[data-pagina-web-preview]')
    if (!marco || !contenido) return
    const paginaReal = paginaEditorActual()
    const lienzoRealActivo = Boolean(paginaReal) && (
      window.location.hostname === 'gestor.aletea.org'
      || new URLSearchParams(window.location.search).get('lienzo') === 'real'
    )
    if (lienzoRealActivo) {
      marco.classList.add('pagina-web-preview-real')
      marco.classList.toggle('pagina-web-preview-movil', dispositivoVista === 'telefono')
      marco.classList.toggle('pagina-web-preview-tablet', dispositivoVista === 'tablet')
      let iframe = marco.querySelector('[data-pagina-web-lienzo-real]')
      const rutaEsperada = paginaReal.ruta
      const origenLienzo = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
        ? 'http://127.0.0.1:4322'
        : ORIGEN_SITIO_PRUEBA
      if (!iframe || iframe.dataset.paginaWebRuta !== rutaEsperada) {
        vaciar(marco)
        iframe = document.createElement('iframe')
        iframe.dataset.paginaWebLienzoReal = ''
        iframe.dataset.paginaWebRuta = rutaEsperada
        iframe.title = `Editar ${paginaReal.titulo} como se verá en el sitio público`
        iframe.src = `${origenLienzo}${rutaEsperada}?editor=gestor`
        iframe.setAttribute('loading', 'eager')
        marco.appendChild(iframe)
      }
      const sincronizar = () => iframe.contentWindow?.postMessage({
        tipo: 'aletea:editor:contenido',
        contenido,
        publicado: publicado || contenido,
      }, origenLienzo)
      iframe.addEventListener('load', sincronizar, { once: true })
      sincronizar()
      return
    }
    marco.classList.remove('pagina-web-preview-real')
    vaciar(marco)
    marco.classList.toggle('pagina-web-preview-movil', dispositivoVista === 'telefono')
    marco.classList.toggle('pagina-web-preview-tablet', dispositivoVista === 'tablet')
    const resumen = resumenSeccion(contenido, seccionActiva)
    const configuracion = VISTA_POR_SECCION[seccionActiva]
    const crearEditable = (ruta, clase, alternativa) => {
      const clave = ruta.split('.').at(-1)
      const multilinea = ['texto', 'descripcion', 'introduccion', 'resumen', 'detalle', 'bajada', 'notaTexto'].includes(clave)
      const control = elemento(multilinea ? 'div' : 'span', ['pagina-web-preview-editable', clase], String(valorEnRuta(contenido, ruta) || alternativa || 'Agregar texto'))
      control.setAttribute('aria-label', `Editar ${etiquetaCampo(ruta.split('.').at(-1))} en la maqueta`)
      control.dataset.paginaWebRutaVisual = ruta
      if (puedeEditar) {
        control.setAttribute('contenteditable', 'plaintext-only')
        control.setAttribute('role', 'textbox')
        control.setAttribute('aria-multiline', multilinea ? 'true' : 'false')
        control.setAttribute('spellcheck', 'true')
        control.tabIndex = 0
        const seleccionar = () => {
          if (rutaSeleccionada === ruta && inspectorActivo === 'contenido') return
          rutaSeleccionada = ruta
          inspectorActivo = 'contenido'
          activarContextoSinPerderFoco(ruta)
        }
        control.addEventListener('focus', seleccionar)
        control.addEventListener('click', seleccionar)
        control.addEventListener('keydown', (evento) => {
          if (!multilinea && evento.key === 'Enter') { evento.preventDefault(); control.blur() }
        })
        control.addEventListener('input', () => {
          let siguiente = control.textContent || ''
          if (!multilinea) siguiente = siguiente.replaceAll('\n', ' ')
          const maximo = maximoCampo(clave)
          if (siguiente.length > maximo) {
            siguiente = siguiente.slice(0, maximo)
            control.textContent = siguiente
          }
          asignarEnRuta(contenido, ruta, siguiente)
          const campo = [...raiz.querySelectorAll('[data-pagina-web-ruta]')].find((item) => item.dataset.paginaWebRuta === ruta)
          if (campo && 'value' in campo) campo.value = siguiente
          marcarCambio(false)
        })
      }
      return control
    }
    const sincronizarInspector = (ruta, valor) => {
      const campo = [...raiz.querySelectorAll('[data-pagina-web-ruta]')].find((item) => item.dataset.paginaWebRuta === ruta)
      if (!campo) return
      if (campo.type === 'checkbox') campo.checked = Boolean(valor)
      else if ('value' in campo) campo.value = String(valor)
    }
    const reproducirCifras = (seccion) => {
      const contadores = [...seccion.querySelectorAll('[data-pagina-web-contador]')]
      if (!contadores.length) return
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(animacionCifrasFrame)
      const duracion = Number(contenido.impacto.animacion.duracionMs || 1900)
      const escalonado = Number(contenido.impacto.animacion.escalonadoMs || 0)
      const mostrarFinales = () => contadores.forEach((contador) => { contador.value = Number(contador.dataset.valor || 0).toLocaleString('es-UY') })
      if (typeof requestAnimationFrame !== 'function' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        mostrarFinales()
        return
      }
      seccion.classList.remove('pagina-web-impacto-activo')
      contadores.forEach((contador) => { contador.value = '0' })
      void seccion.offsetWidth
      seccion.classList.add('pagina-web-impacto-activo')
      const inicio = performance.now()
      const animar = (ahora) => {
        const transcurrido = ahora - inicio
        contadores.forEach((contador, indice) => {
          const progreso = Math.min(Math.max((transcurrido - indice * escalonado) / duracion, 0), 1)
          const suavizado = 1 - Math.pow(1 - progreso, 4)
          contador.value = Math.round(Number(contador.dataset.valor || 0) * suavizado).toLocaleString('es-UY')
        })
        if (transcurrido < duracion + (contadores.length - 1) * escalonado) animacionCifrasFrame = requestAnimationFrame(animar)
        else mostrarFinales()
      }
      animacionCifrasFrame = requestAnimationFrame(animar)
    }
    const crearControlCifras = ({ ruta, texto, minimo, maximo, paso, formato }) => {
      const valor = Number(valorEnRuta(contenido, ruta))
      const etiqueta = elemento('label', ['pagina-web-impacto-control'])
      const cabecera = elemento('span')
      const salida = elemento('output', [], formato(valor))
      cabecera.append(elemento('strong', [], texto), salida)
      const control = document.createElement('input')
      control.type = 'range'
      control.min = String(minimo)
      control.max = String(maximo)
      control.step = String(paso)
      control.value = String(valor)
      control.disabled = !puedeEditar
      control.setAttribute('aria-label', texto)
      control.addEventListener('input', () => {
        const siguiente = Number(control.value)
        asignarEnRuta(contenido, ruta, siguiente)
        sincronizarInspector(ruta, siguiente)
        salida.value = formato(siguiente)
        const seccion = marco.querySelector('.pagina-web-impacto')
        if (seccion) {
          seccion.style.setProperty('--impacto-duracion', `${contenido.impacto.animacion.duracionMs}ms`)
          seccion.style.setProperty('--impacto-desplazamiento', `${contenido.impacto.animacion.desplazamientoPx}px`)
          ;[...seccion.querySelectorAll('.pagina-web-impacto-cifra')].forEach((tarjetaCifra, indice) => tarjetaCifra.style.setProperty('--cifra-espera', `${indice * contenido.impacto.animacion.escalonadoMs}ms`))
          reproducirCifras(seccion)
        }
        marcarCambio(false)
      })
      etiqueta.append(cabecera, control)
      return etiqueta
    }
    const crearVistaCifras = () => {
      const seccion = elemento('section', ['pagina-web-impacto'])
      seccion.style.setProperty('--impacto-duracion', `${contenido.impacto.animacion.duracionMs}ms`)
      seccion.style.setProperty('--impacto-desplazamiento', `${contenido.impacto.animacion.desplazamientoPx}px`)
      const cabecera = elemento('div', ['pagina-web-impacto-cabecera'])
      cabecera.append(
        crearEditable('impacto.etiqueta', 'pagina-web-preview-etiqueta', 'Aletea en cifras'),
        crearEditable('impacto.titulo', 'pagina-web-impacto-titulo', 'Una red que sigue creciendo.'),
      )
      if (estiloTipografico('cifrasTitulo') === 'expresiva') cabecera.querySelector('.pagina-web-impacto-titulo')?.classList.add('tipografia-expresiva')
      const cuadricula = elemento('div', ['pagina-web-impacto-grid'])
      const hilo = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      hilo.classList.add('pagina-web-impacto-hilo', 'pagina-web-impacto-hilo-escritorio')
      hilo.setAttribute('viewBox', '0 0 1000 60')
      hilo.setAttribute('preserveAspectRatio', 'none')
      hilo.setAttribute('aria-hidden', 'true')
      hilo.innerHTML = '<path pathLength="1" d="M20 30 C220 6 325 54 500 30 S790 10 980 30"></path><circle cx="20" cy="30" r="7"></circle><circle cx="500" cy="30" r="7"></circle><circle cx="980" cy="30" r="7"></circle>'
      hilo.hidden = !contenido.impacto.animacion.mostrarHilo
      const hiloMovil = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      hiloMovil.classList.add('pagina-web-impacto-hilo', 'pagina-web-impacto-hilo-movil')
      hiloMovil.setAttribute('viewBox', '0 0 40 900')
      hiloMovil.setAttribute('preserveAspectRatio', 'none')
      hiloMovil.setAttribute('aria-hidden', 'true')
      hiloMovil.innerHTML = '<path pathLength="1" d="M20 8 C2 210 38 340 20 450 S4 720 20 892"></path><circle cx="20" cy="8" r="5"></circle><circle cx="20" cy="450" r="5"></circle><circle cx="20" cy="892" r="5"></circle>'
      hiloMovil.hidden = !contenido.impacto.animacion.mostrarHilo
      cuadricula.append(hilo, hiloMovil)
      contenido.impacto.cifras.forEach((cifra, indice) => {
        const tarjetaCifra = elemento('article', ['pagina-web-impacto-cifra'])
        tarjetaCifra.style.setProperty('--cifra-espera', `${indice * contenido.impacto.animacion.escalonadoMs}ms`)
        const numero = elemento('div', ['pagina-web-impacto-numero'])
        if (estiloTipografico('cifrasNumeros') === 'expresiva') numero.classList.add('tipografia-expresiva')
        if (cifra.prefijo) numero.appendChild(crearEditable(`impacto.cifras.${indice}.prefijo`, 'pagina-web-impacto-prefijo', '+'))
        const entrada = document.createElement('input')
        entrada.type = 'text'
        entrada.inputMode = 'numeric'
        entrada.value = Number(cifra.valor).toLocaleString('es-UY')
        entrada.dataset.valor = String(cifra.valor)
        entrada.dataset.paginaWebContador = ''
        entrada.disabled = !puedeEditar
        entrada.setAttribute('aria-label', `Editar número de ${cifra.etiqueta} en la maqueta`)
        entrada.addEventListener('focus', () => {
          if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(animacionCifrasFrame)
          entrada.value = String(cifra.valor)
          entrada.select()
        })
        entrada.addEventListener('input', () => {
          const siguiente = Math.min(999999, Math.max(0, Number(entrada.value.replace(/\D/g, '') || 0)))
          cifra.valor = siguiente
          entrada.dataset.valor = String(siguiente)
          sincronizarInspector(`impacto.cifras.${indice}.valor`, siguiente)
          marcarCambio(false)
        })
        entrada.addEventListener('blur', () => { entrada.value = Number(cifra.valor).toLocaleString('es-UY') })
        numero.appendChild(entrada)
        tarjetaCifra.append(
          numero,
          crearEditable(`impacto.cifras.${indice}.etiqueta`, 'pagina-web-impacto-etiqueta-cifra', 'Nueva cifra'),
          crearEditable(`impacto.cifras.${indice}.detalle`, 'pagina-web-impacto-detalle', 'Agregar detalle'),
        )
        cuadricula.appendChild(tarjetaCifra)
      })
      const controles = elemento('div', ['pagina-web-impacto-controles'])
      controles.append(
        elemento('div', ['pagina-web-impacto-controles-cabecera'], 'Probá la animación'),
        crearControlCifras({ ruta: 'impacto.animacion.duracionMs', texto: 'Duración', minimo: 800, maximo: 3000, paso: 100, formato: (valor) => `${(valor / 1000).toLocaleString('es-UY', { maximumFractionDigits: 2 })} s` }),
        crearControlCifras({ ruta: 'impacto.animacion.escalonadoMs', texto: 'Espera entre cifras', minimo: 0, maximo: 400, paso: 20, formato: (valor) => `${(valor / 1000).toLocaleString('es-UY', { maximumFractionDigits: 2 })} s` }),
        crearControlCifras({ ruta: 'impacto.animacion.desplazamientoPx', texto: 'Movimiento', minimo: 0, maximo: 20, paso: 1, formato: (valor) => `${valor} px` }),
      )
      const interruptores = elemento('div', ['pagina-web-impacto-interruptores'])
      ;[
        ['impacto.animacion.mostrarHilo', 'Mostrar hilo'],
        ['impacto.animacion.reproducirUnaVez', 'Reproducir una vez'],
      ].forEach(([ruta, texto]) => {
        const etiqueta = elemento('label')
        const control = document.createElement('input')
        control.type = 'checkbox'
        control.checked = Boolean(valorEnRuta(contenido, ruta))
        control.disabled = !puedeEditar
        control.setAttribute('aria-label', texto)
        control.addEventListener('input', () => {
          asignarEnRuta(contenido, ruta, control.checked)
          sincronizarInspector(ruta, control.checked)
          if (ruta.endsWith('mostrarHilo')) [hilo, hiloMovil].forEach((trazo) => { trazo.hidden = !control.checked })
          marcarCambio(false)
        })
        etiqueta.append(control, elemento('span', [], texto))
        interruptores.appendChild(etiqueta)
      })
      const repetir = boton('Reproducir', () => reproducirCifras(seccion))
      repetir.classList.add('pagina-web-impacto-reproducir')
      controles.append(interruptores, repetir)
      seccion.append(cabecera, cuadricula, crearEditable('impacto.nota', 'pagina-web-impacto-nota', 'Agregar fuente de las cifras'), controles)
      if (typeof IntersectionObserver === 'function') requestAnimationFrame(() => reproducirCifras(seccion))
      return seccion
    }
    const tarjeta = elemento('div', ['pagina-web-preview-pagina'])
    const marca = elemento('div', ['pagina-web-preview-marca'])
    marca.append(elemento('span', [], 'Aletea'), elemento('span', [], 'Sitio institucional'))
    const lienzo = elemento('div', ['pagina-web-preview-contenido'])
    const seccionActual = SECCIONES_PAGINA_WEB.find((item) => item.id === seccionActiva)
    const rutaImagen = seccionActual ? rutaImagenDeSeccion(seccionActual) : ''
    if (rutaImagen) {
      const datosImagen = valorEnRuta(contenido, rutaImagen)
      const imagenVisual = document.createElement('button')
      imagenVisual.type = 'button'; imagenVisual.className = 'pagina-web-preview-imagen-directa'; imagenVisual.disabled = !puedeEditar
      const miniatura = document.createElement('img'); miniatura.src = urlImagenPrevia(datosImagen.src); miniatura.alt = datosImagen.textoAlternativo || ''
      aplicarEncuadre(miniatura, datosImagen)
      imagenVisual.append(miniatura, elemento('span', [], 'Editar foto y encuadre'))
      imagenVisual.addEventListener('click', () => { rutaSeleccionada = rutaImagen; inspectorActivo = 'contenido'; dibujarEditor() })
      lienzo.appendChild(imagenVisual)
    }
    if (seccionActiva === 'impacto') {
      lienzo.classList.add('pagina-web-preview-contenido-impacto')
      lienzo.appendChild(crearVistaCifras())
    } else if (configuracion) {
      lienzo.appendChild(crearEditable(configuracion.etiqueta, 'pagina-web-preview-etiqueta', 'Etiqueta breve'))
      const titulo = elemento('h3')
      if (estiloTipografico(claveTipograficaDeSeccion(seccionActiva)) === 'expresiva') titulo.classList.add('tipografia-expresiva')
      configuracion.titulos.forEach((ruta) => titulo.appendChild(crearEditable(ruta, ruta.includes('Destacado') ? 'pagina-web-preview-destacado' : 'pagina-web-preview-titulo', resumen.titulo)))
      lienzo.append(titulo, crearEditable(configuracion.texto, 'pagina-web-preview-texto', resumen.texto))
    } else lienzo.append(elemento('h3', [], resumen.titulo), elemento('p', [], resumen.texto))
    if (seccionActual) {
      const rutaColeccion = rutaColeccionDeSeccion(seccionActual)
      const coleccion = rutaColeccion ? valorEnRuta(contenido, rutaColeccion) : null
      if (Array.isArray(coleccion) && coleccion.length) {
        const tira = elemento('div', ['pagina-web-preview-coleccion'])
        coleccion.slice(0, 6).forEach((item, indice) => {
          const tituloItem = item.titulo || item.nombre || item.etiqueta || `Elemento ${indice + 1}`
          const tarjetaItem = elemento('article', ['pagina-web-preview-coleccion-item'])
          const abrir = boton(tituloItem, () => { rutaSeleccionada = `${rutaColeccion}.${indice}`; inspectorActivo = 'contenido'; dibujarEditor() })
          abrir.classList.add('pagina-web-preview-coleccion-titulo')
          const accionesItem = elemento('div', ['pagina-web-preview-coleccion-acciones'])
          if (typeof item.visible === 'boolean') {
            const visible = boton(item.visible ? 'Ocultar' : 'Mostrar', () => { item.visible = !item.visible; marcarCambio(); dibujar() })
            visible.setAttribute('aria-label', `${item.visible ? 'Ocultar' : 'Mostrar'} ${tituloItem}`)
            accionesItem.appendChild(visible)
          }
          const subir = boton('Subir', () => {
            if (indice < 1) return
            ;[coleccion[indice - 1], coleccion[indice]] = [coleccion[indice], coleccion[indice - 1]]
            normalizarOrden(coleccion); marcarCambio(); dibujar()
          })
          subir.disabled = indice === 0; subir.setAttribute('aria-label', `Subir ${tituloItem}`)
          const bajar = boton('Bajar', () => {
            if (indice >= coleccion.length - 1) return
            ;[coleccion[indice + 1], coleccion[indice]] = [coleccion[indice], coleccion[indice + 1]]
            normalizarOrden(coleccion); marcarCambio(); dibujar()
          })
          bajar.disabled = indice === coleccion.length - 1; bajar.setAttribute('aria-label', `Bajar ${tituloItem}`)
          accionesItem.append(subir, bajar)
          tarjetaItem.append(abrir, accionesItem)
          tira.appendChild(tarjetaItem)
        })
        if (coleccion.length > 6) tira.appendChild(elemento('small', [], `${coleccion.length - 6} elementos más se editan desde el inspector.`))
        lienzo.appendChild(tira)
      }
      const accionesVisuales = rutasAccionDeSeccion(seccionActual)
      const rutaVisible = rutaVisibilidadDeSeccion(seccionActual)
      if (accionesVisuales.length || rutaVisible) {
        const barraDirecta = elemento('div', ['pagina-web-preview-acciones-directas'])
        accionesVisuales.forEach((rutaAccion, indice) => {
          const accion = valorEnRuta(contenido, rutaAccion)
          const control = boton(accion.etiqueta || 'Editar botón', () => { rutaSeleccionada = rutaAccion; inspectorActivo = 'contenido'; dibujarEditor() })
          if (indice > 0) control.classList.add('boton-secundario')
          barraDirecta.appendChild(control)
        })
        if (rutaVisible) {
          const visible = Boolean(valorEnRuta(contenido, rutaVisible))
          const control = boton(visible ? 'Ocultar sección' : 'Mostrar sección', () => {
            asignarEnRuta(contenido, rutaVisible, !visible); rutaSeleccionada = rutaVisible; marcarCambio(); dibujar()
          })
          control.classList.add('pagina-web-preview-visibilidad')
          barraDirecta.appendChild(control)
        }
        lienzo.appendChild(barraDirecta)
      }
    }
    const pie = elemento('div', ['pagina-web-preview-pie'])
    pie.append(elemento('span', [], `${resumen.cantidad} bloques de contenido`), elemento('span', [], puedeEditar ? 'Hacé clic en un texto y escribí directamente' : 'Vista de solo lectura'))
    tarjeta.append(marca, lienzo, pie)
    tarjeta.style.zoom = String(zoomVista / 100)
    marco.appendChild(tarjeta)
  }

  function dibujarEstadoAcciones() {
    const estado = raiz.querySelector('[data-pagina-web-estado]')
    const estadoTexto = raiz.querySelector('[data-pagina-web-estado-texto]')
    const guardar = raiz.querySelector('[data-pagina-web-guardar]')
    const publicar = raiz.querySelector('[data-pagina-web-publicar]')
    if (estado && estadoTexto) {
      const estadoBase = revisionBorrador ? rotuloEstado(contenido?.editorial?.estado) : 'Contenido inicial, guardalo como borrador'
      estadoTexto.textContent = guardando ? 'Guardando cambios...' : error || aviso || (sucio ? 'Hay cambios sin guardar' : estadoBase)
      estado.dataset.tipo = error ? 'error' : aviso ? 'exito' : sucio ? 'pendiente' : 'normal'
    }
    if (guardar) guardar.disabled = !puedeEditar || guardando || !sucio
    if (publicar) publicar.disabled = !puedePublicar || guardando || sucio || !revisionBorrador
    const detalle = raiz.querySelector('[data-pagina-web-estado-detalle]')
    if (detalle) {
      const cantidad = cantidadSeccionesModificadas()
      detalle.textContent = sucio
        ? `${cantidad || 1} ${cantidad === 1 ? 'sección modificada' : 'secciones modificadas'} sin guardar`
        : `${textoRecuperacion()} · ${historial.length} ${historial.length === 1 ? 'estado' : 'estados'} en el historial`
    }
  }

  async function guardarBorrador() {
    error = ''; aviso = ''
    const siguiente = contenidoComoBorrador(contenido)
    const errores = validarContenidoPaginaWeb(siguiente)
    if (errores.length) { error = errores[0]; dibujarEstadoAcciones(); return }
    guardando = true; dibujarEstadoAcciones()
    try {
      const { datos, respuesta } = await pedir('/api/cms/pagina-web/borrador', { method: 'PUT', headers: { 'if-match': `"${revisionBorrador}"` }, body: JSON.stringify(siguiente) })
      contenido = siguiente
      revisionBorrador = Number(datos.revision || respuesta.headers.get('etag')?.replaceAll('"', '') || revisionBorrador)
      sucio = false
      try { localStorage.removeItem(BORRADOR_LOCAL_CLAVE) } catch {}
      aviso = 'Borrador guardado. Todavía no cambió el sitio de prueba.'
    } catch (fallo) { error = fallo.message }
    guardando = false; dibujarEstadoAcciones(); dibujarEditor(); dibujarVistaPrevia()
  }

  async function publicarEnPrueba() {
    if (!puedePublicar || sucio || !revisionBorrador) return
    const seccionesModificadas = publicado
      ? SECCIONES_PAGINA_WEB.filter((seccion) => seccion.rutas.some((ruta) => JSON.stringify(valorEnRuta(contenido, ruta)) !== JSON.stringify(valorEnRuta(publicado, ruta))))
      : SECCIONES_PAGINA_WEB
    const pendientes = validarContenidoPaginaWeb(contenidoComoBorrador(contenido))
    if (pendientes.length) { error = `Antes de publicar: ${pendientes[0]}`; dibujarEstadoAcciones(); return }
    const nombres = seccionesModificadas.slice(0, 6).map((seccion) => seccion.titulo).join(', ')
    const adicionales = Math.max(0, seccionesModificadas.length - 6)
    const resumen = seccionesModificadas.length
      ? `Se publicarán cambios en ${nombres}${adicionales ? ` y ${adicionales} secciones más` : ''}.`
      : 'No se detectaron diferencias con la versión publicada.'
    if (!window.confirm(`${resumen}\n\nDestino: prueba.aletea.org. El sitio principal aletea.org no cambiará.`)) return
    error = ''; aviso = ''; guardando = true; dibujarEstadoAcciones()
    try {
      const { datos } = await pedir('/api/cms/pagina-web/publicar', { method: 'POST', body: JSON.stringify({ revisionBorrador }) })
      publicado = datos.publicado
      contenido = clonarContenidoPaginaWeb(datos.publicado)
      try { localStorage.removeItem(BORRADOR_LOCAL_CLAVE) } catch {}
      revisionBorrador = Number(datos.revisionBorrador || revisionBorrador)
      aviso = datos.despliegue?.estado === 'iniciado'
        ? `Versión ${contenido.editorial.revision}: publicación iniciada. El gestor comprobará la revisión visible antes de darla por terminada.`
        : datos.despliegue?.estado === 'fallo'
          ? `Versión ${contenido.editorial.revision} guardada, pero no se pudo iniciar la actualización del sitio. Podés reintentar sin perder cambios.`
          : `Versión ${contenido.editorial.revision} guardada. Falta configurar la publicación automática para que aparezca en el sitio de prueba.`
      completarMedicionUX('publicar_pagina')
    } catch (fallo) { error = fallo.message }
    guardando = false; dibujarEstadoAcciones(); dibujarEditor(); dibujarVistaPrevia()
  }

  function dibujar() {
    vaciar(raiz)
    const pantalla = elemento('main', ['pagina-web'])
    pantalla.classList.toggle('pagina-web-enfocada', modoEnfocado)
    const cabecera = elemento('header', ['cms-encabezado', 'pagina-web-encabezado'])
    const texto = elemento('div')
    texto.append(elemento('p', ['cms-sobrelinea'], 'Contenido público'), elemento('h1', [], 'Página web'), elemento('p', ['ayuda'], 'Editá el sitio de prueba con palabras simples y publicalo cuando esté listo.'))
    const acciones = elemento('div', ['cms-encabezado-acciones'])
    const verSitio = boton('Ver sitio de prueba', () => abrirEnOtraPestana(SITIO_PRUEBA))
    const enfocar = boton(modoEnfocado ? 'Salir del modo enfocado' : 'Modo enfocado', () => { modoEnfocado = !modoEnfocado; dibujar() })
    enfocar.dataset.paginaWebEnfocar = ''
    const guardar = boton('Guardar borrador', guardarBorrador); guardar.dataset.paginaWebGuardar = ''
    const publicar = boton('Publicar en prueba', publicarEnPrueba); publicar.dataset.paginaWebPublicar = ''
    acciones.append(verSitio, enfocar, guardar, publicar)
    cabecera.append(texto, acciones)

    const transicion = elemento('section', ['pagina-web-transicion'])
    const prueba = elemento('article', ['pagina-web-destino', 'pagina-web-destino-activo'])
    prueba.append(elemento('span', ['pagina-web-destino-paso'], 'Ahora'), elemento('strong', [], 'prueba.aletea.org'), elemento('small', [], 'Destino de publicación y revisión.'))
    const principal = elemento('article', ['pagina-web-destino'])
    principal.append(elemento('span', ['pagina-web-destino-paso'], 'Después de aprobar'), elemento('strong', [], 'aletea.org'), elemento('small', [], 'Protegido. No cambia desde esta pantalla.'))
    transicion.append(prueba, elemento('span', ['pagina-web-flecha'], '→'), principal)

    if (cargando) {
      pantalla.append(cabecera, transicion, elemento('p', ['pagina-web-cargando'], 'Cargando el contenido de la página...'))
      raiz.appendChild(pantalla)
      return
    }
    if (!contenido) {
      pantalla.append(cabecera, transicion, elemento('div', ['mensaje-error'], error || 'No se pudo cargar el contenido.'))
      raiz.appendChild(pantalla)
      return
    }

    const estado = elemento('div', ['pagina-web-estado'])
    estado.dataset.paginaWebEstado = ''
    estado.setAttribute('role', 'status')
    estado.setAttribute('aria-live', 'polite')
    const estadoTexto = elemento('span', [], rotuloEstado(contenido.editorial?.estado))
    estadoTexto.dataset.paginaWebEstadoTexto = ''
    const estadoDetalle = elemento('small', ['pagina-web-estado-detalle'], textoRecuperacion())
    estadoDetalle.dataset.paginaWebEstadoDetalle = ''
    estado.append(estadoTexto, estadoDetalle)
    const navegacionEditor = elemento('section', ['pagina-web-navegacion-editor'])
    navegacionEditor.setAttribute('aria-label', 'Organización del contenido de la página web')
    const cabeceraNavegacion = elemento('div', ['pagina-web-navegacion-cabecera'])
    const identidadNavegacion = elemento('div')
    identidadNavegacion.append(elemento('span', ['pagina-web-navegacion-sobrelinea'], 'Sitio público'), elemento('strong', [], 'Páginas y secciones'))
    cabeceraNavegacion.append(
      identidadNavegacion,
      elemento('small', [], `${PAGINAS_EDITOR_WEB.length} páginas`),
    )
    const paginas = elemento('nav', ['pagina-web-paginas'])
    paginas.setAttribute('aria-label', 'Páginas del sitio público')
    const consultaPaginas = busquedaSeccion.trim().toLocaleLowerCase('es')
    PAGINAS_EDITOR_WEB.filter((pagina) => !consultaPaginas || `${pagina.titulo} ${pagina.ruta}`.toLocaleLowerCase('es').includes(consultaPaginas)).forEach((pagina) => {
      const control = boton('', () => abrirPaginaEditor(pagina.id))
      control.dataset.paginaWebPagina = pagina.id
      control.append(elemento('span', [], pagina.titulo), elemento('small', [], pagina.ruta))
      if (pagina.id === paginaEditorActiva) { control.classList.add('activa'); control.setAttribute('aria-current', 'page') }
      paginas.appendChild(control)
    })
    const grupos = elemento('nav', ['pagina-web-grupos'])
    grupos.setAttribute('aria-label', 'Filtrar por tipo de contenido')
    GRUPOS_EDITOR_WEB.forEach((grupo) => {
      const control = boton(grupo.titulo, () => {
        paginaEditorActiva = ''
        grupoEditorActivo = grupo.id
        if (!grupo.secciones.includes(seccionActiva)) seccionActiva = grupo.secciones[0]
        rutaSeleccionada = ''
        dibujar()
      })
      if (!paginaEditorActiva && grupo.id === grupoEditorActivo) { control.classList.add('activa'); control.setAttribute('aria-current', 'true') }
      grupos.appendChild(control)
    })
    const buscarSeccion = document.createElement('input')
    buscarSeccion.type = 'search'
    buscarSeccion.className = 'pagina-web-buscar-seccion'
    buscarSeccion.placeholder = 'Buscar una sección'
    buscarSeccion.value = busquedaSeccion
    buscarSeccion.disabled = !puedeEditar
    buscarSeccion.dataset.paginaWebBuscador = ''
    buscarSeccion.setAttribute('aria-label', 'Buscar una sección de la página')
    buscarSeccion.setAttribute('aria-keyshortcuts', 'Meta+K Control+K')
    buscarSeccion.addEventListener('input', () => { busquedaSeccion = buscarSeccion.value; dibujar() })
    const paginaActual = paginaEditorActual()
    const grupoActual = GRUPOS_EDITOR_WEB.find((grupo) => grupo.id === grupoEditorActivo) || GRUPOS_EDITOR_WEB[0]
    const contextoGrupo = elemento('div', ['pagina-web-grupo-contexto'])
    contextoGrupo.append(
      elemento('strong', [], paginaActual?.titulo || grupoActual.titulo),
      elemento('span', [], paginaActual ? `${paginaActual.ruta} · elegí una sección para editarla` : grupoActual.ayuda),
    )
    const herramientasMapa = elemento('div', ['pagina-web-mapa-herramientas'])
    const alternarMapa = boton(mapaAbierto ? 'Ocultar mapa' : 'Mostrar mapa', () => { mapaAbierto = !mapaAbierto; dibujar() })
    alternarMapa.setAttribute('aria-expanded', String(mapaAbierto))
    const filtro = document.createElement('select')
    filtro.className = 'pagina-web-filtro-secciones'
    filtro.setAttribute('aria-label', 'Filtrar secciones por estado')
    ;[['todas', 'Todas'], ['modificada', 'Modificadas'], ['incompleta', 'Incompletas'], ['oculta', 'Ocultas'], ['lista', 'Listas']].forEach(([valor, texto]) => {
      const opcion = document.createElement('option'); opcion.value = valor; opcion.textContent = texto; filtro.appendChild(opcion)
    })
    filtro.value = filtroSecciones
    filtro.addEventListener('change', () => { filtroSecciones = filtro.value; dibujar() })
    herramientasMapa.append(alternarMapa, filtro, elemento('small', [], '⌘K para buscar'))
    const selector = elemento('nav', ['pagina-web-secciones'])
    selector.setAttribute('aria-label', 'Secciones de la página web')
    const consulta = busquedaSeccion.trim().toLocaleLowerCase('es')
    const seccionesVisibles = SECCIONES_PAGINA_WEB.filter((seccion) => {
      const coincideTexto = consulta
        ? `${seccion.titulo} ${seccion.ayuda}`.toLocaleLowerCase('es').includes(consulta)
        : (paginaActual?.secciones || grupoActual.secciones).includes(seccion.id)
      return coincideTexto && (filtroSecciones === 'todas' || estadoVisualSeccion(seccion) === filtroSecciones)
    })
    seccionesVisibles.forEach((seccion) => {
      const control = boton(seccion.titulo, () => {
        abrirSeccion(seccion.id)
      })
      const estadoSeccion = estadoVisualSeccion(seccion)
      control.dataset.estado = estadoSeccion
      control.title = `${seccion.titulo}: ${estadoSeccion}`
      if (seccion.id === seccionActiva) { control.classList.add('activa'); control.setAttribute('aria-current', 'page') }
      selector.appendChild(control)
    })
    const mapa = elemento('div', ['pagina-web-mapa'])
    mapa.hidden = !mapaAbierto
    mapa.setAttribute('aria-label', 'Mapa visual de las secciones de la página')
    if (mapaAbierto) {
      const trazo = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      trazo.setAttribute('viewBox', '0 0 1000 260'); trazo.setAttribute('preserveAspectRatio', 'none'); trazo.setAttribute('aria-hidden', 'true')
      trazo.innerHTML = '<defs><linearGradient id="pagina-web-infinito-color" x1="0" x2="1"><stop offset="0" stop-color="#55c9c4"/><stop offset=".48" stop-color="#6b2e83"/><stop offset="1" stop-color="#ed1e79"/></linearGradient></defs><path d="M70 130 C180 12 355 12 500 130 C645 248 820 248 930 130 C820 12 645 12 500 130 C355 248 180 248 70 130"></path>'
      mapa.appendChild(trazo)
      SECCIONES_PAGINA_WEB.forEach((seccion, indice) => {
        const angulo = (Math.PI * 2 * indice) / SECCIONES_PAGINA_WEB.length
        const seno = Math.sin(angulo); const coseno = Math.cos(angulo); const divisor = 1 + seno * seno
        const x = 50 + (42 * coseno) / divisor
        const y = 50 + (37 * seno * coseno) / divisor
        const nodo = document.createElement('button')
        nodo.type = 'button'; nodo.className = 'pagina-web-mapa-nodo'; nodo.style.left = `${x}%`; nodo.style.top = `${y}%`
        nodo.dataset.estado = estadoVisualSeccion(seccion); nodo.dataset.grupo = GRUPOS_EDITOR_WEB.find((grupo) => grupo.secciones.includes(seccion.id))?.id || 'inicio'
        nodo.setAttribute('aria-label', `${seccion.titulo}: ${nodo.dataset.estado}`); nodo.title = seccion.titulo
        if (seccion.id === seccionActiva) { nodo.classList.add('activo'); nodo.setAttribute('aria-current', 'page') }
        nodo.append(elemento('span', ['pagina-web-mapa-punto']), elemento('strong', [], seccion.titulo))
        nodo.addEventListener('click', () => abrirSeccion(seccion.id))
        mapa.appendChild(nodo)
      })
    }
    navegacionEditor.append(cabeceraNavegacion, buscarSeccion, paginas, contextoGrupo, selector, grupos, herramientasMapa, mapa)
    const trabajo = elemento('div', ['pagina-web-trabajo'])
    trabajo.style.setProperty('--pagina-web-inspector-ancho', `${anchoInspector}px`)
    const editor = elemento('section', ['pagina-web-editor']); editor.dataset.paginaWebEditor = ''
    const vista = elemento('aside', ['pagina-web-vista'])
    const vistaCabecera = elemento('div', ['pagina-web-vista-cabecera'])
    const vistaTitulo = elemento('div', ['pagina-web-vista-titulo'])
    const paginaVista = paginaEditorActual()
    vistaTitulo.append(
      elemento('strong', [], paginaVista ? paginaVista.titulo : 'Editá sobre la maqueta'),
      elemento('small', [], paginaVista ? `${paginaVista.ruta} · ${SECCIONES_PAGINA_WEB.find((item) => item.id === seccionActiva)?.titulo || ''}` : 'Hacé clic sobre un texto y escribí.'),
    )
    if (paginaVista) vistaTitulo.appendChild(elemento('span', ['pagina-web-vista-instruccion'], 'Hacé clic sobre un texto y escribí.'))
    vistaCabecera.append(vistaTitulo)
    const modos = elemento('div', ['pagina-web-vista-modos'])
    ;[['escritorio', 'Escritorio'], ['tablet', 'Tablet'], ['telefono', 'Teléfono']].forEach(([id, textoModo]) => {
      const control = boton(textoModo, () => cambiarDispositivoVista(id))
      control.dataset.paginaWebDispositivo = id
      control.classList.toggle('activa', dispositivoVista === id)
      control.setAttribute('aria-pressed', String(dispositivoVista === id))
      modos.appendChild(control)
    })
    if (PAGINAS_CON_VISTA_COMPLETA.has(seccionActiva)) {
      const completa = boton('Vista completa', (evento) => abrirVistaCompleta(evento.currentTarget))
      completa.dataset.paginaWebAbrirVistaCompleta = ''
      modos.appendChild(completa)
    }
    if (paginaVista) {
      const publicada = elemento('a', ['boton', 'boton-secundario', 'pagina-web-vista-publicada'], 'Ver resultado publicado')
      publicada.href = `${SITIO_PRUEBA}${paginaVista.ruta}`; publicada.target = '_blank'; publicada.rel = 'noopener noreferrer'
      modos.appendChild(publicada)
    }
    vistaCabecera.appendChild(modos)
    const zoom = elemento('label', ['pagina-web-vista-zoom'])
    const zoomTexto = elemento('span', [], `Zoom ${zoomVista}%`)
    const zoomControl = document.createElement('input')
    zoomControl.type = 'range'; zoomControl.min = '70'; zoomControl.max = '120'; zoomControl.step = '10'; zoomControl.value = String(zoomVista)
    zoomControl.disabled = !puedeEditar
    zoomControl.setAttribute('aria-label', 'Zoom de la maqueta')
    zoomControl.addEventListener('input', () => {
      zoomVista = Number(zoomControl.value); zoomTexto.textContent = `Zoom ${zoomVista}%`
      const pagina = raiz.querySelector('.pagina-web-preview-pagina'); if (pagina) pagina.style.zoom = String(zoomVista / 100)
    })
    zoom.append(zoomTexto, zoomControl)
    vistaCabecera.appendChild(zoom)
    if (puedeEditar) {
      const historialControles = elemento('div', ['pagina-web-historial-controles'])
      const deshacer = boton('Deshacer', () => moverHistorial(-1)); deshacer.disabled = indiceHistorial <= 0; deshacer.dataset.paginaWebDeshacer = ''
      const rehacer = boton('Rehacer', () => moverHistorial(1)); rehacer.disabled = indiceHistorial >= historial.length - 1; rehacer.dataset.paginaWebRehacer = ''
      historialControles.append(deshacer, rehacer)
      vistaCabecera.appendChild(historialControles)
    }
    const marco = elemento('div', ['pagina-web-preview']); marco.dataset.paginaWebPreview = ''
    vista.append(vistaCabecera, marco)
    trabajo.append(navegacionEditor, vista, editor)
    if (!puedeEditar) pantalla.appendChild(elemento('p', ['pagina-web-solo-lectura'], 'Tu perfil puede revisar el contenido, pero no modificarlo.'))
    pantalla.append(cabecera, transicion, estado, trabajo)
    raiz.appendChild(pantalla)
    dibujarEditor(); dibujarVistaPrevia(); dibujarEstadoAcciones()
  }

  async function cargar() {
    try {
      const [inicial, guardado, disponibles] = await Promise.all([
        pedir('/assets/pagina-publica-v1.json').then(({ datos }) => datos),
        pedir('/api/cms/pagina-web').then(({ datos }) => datos),
        pedir('/api/cms/pagina-web/formularios').then(({ datos }) => datos.formularios || []).catch(() => []),
      ])
      formulariosDisponibles = Array.isArray(disponibles) ? disponibles : []
      publicado = guardado.publicado || null
      let recuperacionLocal = null
      if (!guardado.borrador) {
        try { recuperacionLocal = JSON.parse(localStorage.getItem(BORRADOR_LOCAL_CLAVE) || 'null')?.contenido || null } catch {}
      }
      contenido = prepararContenidoParaEditar(recuperacionLocal || (guardado.borrador || guardado.publicado
        ? guardado.borrador || guardado.publicado
        : contenidoComoBorrador(inicial)))
      if (recuperacionLocal) { sucio = true; aviso = 'Recuperamos cambios locales que todavía no se habían guardado.' }
      try { ultimaRecuperacionEn = JSON.parse(localStorage.getItem(BORRADOR_LOCAL_CLAVE) || 'null')?.actualizadoEn || '' } catch {}
      revisionBorrador = Number(guardado.revisionBorrador || 0)
      historial = [JSON.stringify(contenido)]
      indiceHistorial = 0
    } catch (fallo) { error = fallo.message }
    cargando = false
    dibujar()
  }

  dibujar()
  cargar()
  return {
    destruir() {
      window.removeEventListener('beforeunload', confirmarSalida)
      window.removeEventListener('keydown', atajosEditor)
      window.removeEventListener('message', mensajeLienzoReal)
    },
  }
}
