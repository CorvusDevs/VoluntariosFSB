import { almacen, configurar } from './almacen/indice.js'
import { crearClienteGitHub } from './almacen/github.js'
import { crearPantallaLista } from './ui/pantalla-lista.js'
import { crearPantallaPersonas } from './ui/pantalla-personas.js'
import { crearPantallaVistaPrevia } from './ui/pantalla-vista-previa.js'
import { crearPantallaIngreso } from './ui/pantalla-ingreso.js'
import { crearPantallaIngresoCloudflare } from './ui/pantalla-ingreso-cloudflare.js'
import { crearPantallaAjustes } from './ui/pantalla-ajustes.js'
import { crearPantallaAccesosCloudflare } from './ui/pantalla-accesos-cloudflare.js'
import { crearPantallaRegistroInstitucional } from './ui/pantalla-registro-institucional.js'
import { crearAvisoNovedades, crearPantallaCambios } from './ui/pantalla-cambios.js'
import { crearPantallaAyuda } from './ui/pantalla-ayuda.js'
import { novedadesPendientes } from './ui/novedades.js'
import { crearPantallaRegistro } from './ui/pantalla-registro.js'
import { crearPantallaReporte } from './ui/pantalla-reporte.js'
import { crearPantallaAsistencias } from './ui/pantalla-asistencias.js'
import { crearPantallaAgenda } from './ui/pantalla-agenda.js'
import { crearPantallaInicio } from './ui/pantalla-inicio.js'
import { crearPantallaCMS } from './ui/pantalla-cms.js'
import { crearPantallaPaginaWeb } from './ui/pantalla-pagina-web.js'
import { crearPantallaComunicacionVisual } from './ui/pantalla-comunicacion-visual.js'
import { crearPantallaComunicaciones } from './ui/pantalla-comunicaciones.js'
import { crearPantallaOperaciones } from './ui/pantalla-operaciones.js'
import { crearFranjaAlerta } from './ui/franja-alerta.js'
import { historial, rachasDeFalta, hastaHoy, UMBRAL_ALERTA } from './modelo/asistencia.js'
import { crearLista, sincronizarConRoster, moverAGrupo, duplicarListaParaFecha } from './modelo/lista.js'
import { proximoSabado, hoyISO } from './util/fechas.js'
import { boton, enlaceBoton, vaciar, elemento, icono } from './ui/componentes.js'
import { CONFIG } from './config.js'
import { esAdmin, leerUsuarios } from './acceso/usuarios.js'
import { olvidar, recordar, recuperarRecordado } from './acceso/sesion.js'
import { cerrarSesionCloudflare, ingresarCloudflare, leerSesionCloudflare } from './acceso/cloudflare.js'
import { esEntornoInstitucional } from './acceso/entorno.js'
import { usaRutasRealesGestor } from './rutas-gestor.js'
import { sello, vigilarVersion } from './ui/aviso-version.js'
import { recargarAlCambiarControlador, registrarTrabajador } from './ui/trabajador.js'
import {
  guardarUltimaPantalla, hashParaPantalla, leerUltimaPantalla, olvidarUltimaPantalla, pantallaPermitida, rutaCompartidaDesdeUbicacion, rutaParaPantalla,
} from './ui/ultima-pantalla.js'
import {
  ETIQUETAS_NAVEGACION_CMS, GRUPOS_NAVEGACION_CMS, TITULOS_GRUPOS_NAVEGACION_CMS,
  grupoActivoNavegacion, grupoDebeEstarAbierto, guardarPreferenciaNavegacion, leerPreferenciasNavegacion,
} from './ui/preferencias-navegacion.js'
import { VERSION } from './version.js'
import { llevarVistaAlInicio } from './ui/desplazamiento.js'
import { instalarAyudasContextuales } from './ui/ayudas-contextuales.js'

const RUTA_USUARIOS = 'usuarios.json'

const contenedor = document.getElementById('app')
instalarAyudasContextuales(document)

// Queda a la vista en el arbol y en la consola: preguntar "que version estas
// corriendo" tiene que ser una mirada, no una sesion de depuracion.
document.documentElement.dataset.version = VERSION
console.warn(`Voluntarios FSB, versión ${VERSION}`)

// Sin sesion, sesion queda en null y el almacen se queda en modo local: la
// aplicacion funciona igual en un solo telefono, sin nada de GitHub.
let sesion = null
let deposito = null
let roster = null
let lista = null
let pantalla = 'lista'
let contextoPantalla = {}
let novedadesAlAbrir = []
// La pantalla que se esta mostrando. Algunas tienen trabajo en curso (fotos que
// se decodifican, un lienzo que se repinta) y hay que avisarles que se van.
let vista = null
// Las alertas se calculan una vez por sesion: leer los ultimos sabados en cada
// redibujado seria una llamada a GitHub por cada toque en la pantalla.
let alertas = []
let tendencia = null
let ocultarEstadoGuardado = null
let intentoGuardado = 0
let estadoGuardadoActual = null
let ultimaSincronizacion = null
let limpiarNavegacionMovil = null
let notificacionesPendientes = 0

function pintarContadoresNotificaciones() {
  contenedor.querySelectorAll('[data-contador-notificaciones]').forEach((contador) => {
    contador.textContent = notificacionesPendientes > 99 ? '99+' : String(notificacionesPendientes)
    contador.hidden = notificacionesPendientes < 1
    contador.setAttribute('aria-label', `${notificacionesPendientes} ${notificacionesPendientes === 1 ? 'notificación pendiente' : 'notificaciones pendientes'}`)
  })
}

async function actualizarResumenNotificaciones() {
  if (sesion?.origen !== 'cloudflare') return
  try {
    const respuesta = await fetch('/api/cms/notificaciones/resumen', { headers: { accept: 'application/json' } })
    const resumen = await respuesta.json()
    if (!respuesta.ok) throw new Error(resumen.error || 'No se pudo leer el resumen de notificaciones.')
    notificacionesPendientes = Math.max(0, Number(resumen.pendientes || 0))
    pintarContadoresNotificaciones()
  } catch { /* La navegación sigue disponible aunque falle el contador. */ }
}

function actualizarRuta(destino, contexto = {}, reemplazar = false) {
  const metodo = reemplazar ? 'replaceState' : 'pushState'
  if (usaRutasRealesGestor(location.hostname)) {
    const ruta = rutaParaPantalla(destino, contexto)
    if (!ruta || (`${location.pathname}${location.search}` === ruta && !location.hash)) return
    history[metodo]({ pantalla: destino }, '', ruta)
    return
  }
  const hash = hashParaPantalla(destino, contexto)
  if (!hash || location.hash === hash) return
  history[metodo]({ pantalla: destino }, '', `${location.pathname}${location.search}${hash}`)
}

function abrirPantalla(destino, contexto = {}, opciones = {}) {
  if (!pantallaPermitida(destino, {
    admin: esAdmin(sesion), cloudflare: sesion?.origen === 'cloudflare', permisos: sesion?.permisos, perfilAcceso: sesion?.perfil_acceso, nivelDatosPersonales: sesion?.nivel_datos_personales,
  })) return
  const cambioPantalla = destino !== pantalla
  if (destino === 'ayuda' && pantalla !== 'ayuda' && !contexto.volverPantalla) {
    contexto = { ...contexto, volverPantalla: pantalla, volverContexto: { ...contextoPantalla } }
  }
  pantalla = destino
  contextoPantalla = contexto
  guardarUltimaPantalla(pantalla)
  if (!opciones.desdeHistorial) actualizarRuta(pantalla, contexto)
  dibujar()
  if (cambioPantalla) llevarVistaAlInicio()
}

async function copiarEnlacePantalla(destino, contexto = {}) {
  const url = new URL(location.href)
  if (usaRutasRealesGestor(location.hostname)) {
    const compartida = new URL(rutaParaPantalla(destino, contexto), url.origin)
    url.pathname = compartida.pathname
    url.search = compartida.search
    url.hash = ''
  } else url.hash = hashParaPantalla(destino, contexto)
  await navigator.clipboard.writeText(url.href)
  return url.href
}

function cambiarEstadoGuardado(estado, mensaje, alReintentar = null) {
  estadoGuardadoActual = { estado, mensaje, alReintentar }
  const indicador = contenedor.querySelector('[data-estado-guardado]')
  if (ocultarEstadoGuardado) clearTimeout(ocultarEstadoGuardado)
  if (indicador) pintarEstadoGuardado(indicador)
  if (estado === 'guardado') {
    ocultarEstadoGuardado = setTimeout(() => {
      estadoGuardadoActual = null
      const actual = contenedor.querySelector('[data-estado-guardado]')
      if (actual) actual.hidden = true
    }, 1800)
  }
}

function pintarEstadoGuardado(indicador) {
  const actual = estadoGuardadoActual
  if (!actual) { indicador.hidden = true; return }
  vaciar(indicador)
  indicador.hidden = false
  indicador.dataset.estado = actual.estado
  indicador.appendChild(elemento('span', ['estado-guardado-texto'], actual.mensaje))
  if (actual.alReintentar) {
    const reintentar = boton('Reintentar', actual.alReintentar, ['boton-reintentar'])
    reintentar.dataset.accion = 'reintentar-guardado'
    indicador.appendChild(reintentar)
  }
}

async function guardarListaConEstado(siguiente, descripcion, confirmacion = null) {
  intentoGuardado += 1
  const esteIntento = intentoGuardado
  lista = siguiente
  cambiarEstadoGuardado('guardando', 'Guardando…')
  try {
    await deposito.guardarLista(siguiente, descripcion)
    ultimaSincronizacion = new Date()
    if (esteIntento === intentoGuardado) {
      cambiarEstadoGuardado('guardado', confirmacion ?? 'Guardado')
    }
    return true
  } catch (fallo) {
    if (esteIntento === intentoGuardado) {
      cambiarEstadoGuardado('error', `No se pudo guardar: ${fallo.message}`, () => {
        guardarListaConEstado(siguiente, descripcion, confirmacion)
      })
    }
    return false
  }
}

async function guardarRosterConEstado(siguiente, descripcion) {
  cambiarEstadoGuardado('guardando', 'Guardando cambios de personas…')
  try {
    await deposito.guardarRoster(siguiente, descripcion)
    ultimaSincronizacion = new Date()
    cambiarEstadoGuardado('guardado', 'Cambios guardados')
  } catch (fallo) {
    cambiarEstadoGuardado('error', `No se pudieron guardar los cambios: ${fallo.message}`, () => {
      guardarRosterConEstado(siguiente, descripcion).catch(() => {})
    })
    throw fallo
  }
}

function olvidarVista() {
  if (typeof vista?.destruir === 'function') vista.destruir()
  vista = null
}

// usuarios.json se lee de raw, que es publico y no gasta cuota, y se escribe
// por la API contra el repositorio publico.
const leerArchivoUsuarios = () => leerUsuarios(CONFIG)

// La descripcion viaja hasta el mensaje del commit: es lo unico que despues
// deja saber que paso con los accesos, que es justo lo que mas importa auditar.
async function guardarArchivoUsuarios(archivo, descripcion = 'Cambiar los accesos') {
  const cliente = crearClienteGitHub({
    token: sesion.token, duenio: CONFIG.duenio, repo: CONFIG.repoPublico, rama: CONFIG.rama,
  })
  // El sha se relee justo antes de escribir: guardar personas pasa una vez cada
  // tanto y asi nunca se pisa un cambio hecho desde otro telefono.
  const actual = await cliente.leerTexto(RUTA_USUARIOS)
  await cliente.escribirTexto(
    RUTA_USUARIOS,
    `${JSON.stringify(archivo, null, 2)}\n`,
    actual?.sha ?? null,
    `${descripcion} · ${sesion?.nombre ?? 'sin registrar'}`,
  )
}

function navegacion() {
  const caja = elemento('div', ['navegacion-contenedor'])
  const ir = (destino, etiqueta) => {
    if (!pantallaPermitida(destino, { admin: esAdmin(sesion), cloudflare: sesion?.origen === 'cloudflare', permisos: sesion?.permisos, perfilAcceso: sesion?.perfil_acceso, nivelDatosPersonales: sesion?.nivel_datos_personales })) return null
    const href = usaRutasRealesGestor(location.hostname) ? rutaParaPantalla(destino) : hashParaPantalla(destino)
    const b = enlaceBoton(etiqueta, href, () => abrirPantalla(destino))
    b.dataset.pantalla = destino
    if (destino === 'cms-trabajo') {
      const contador = elemento('span', ['navegacion-contador'], notificacionesPendientes > 99 ? '99+' : String(notificacionesPendientes))
      contador.dataset.contadorNotificaciones = ''
      contador.hidden = notificacionesPendientes < 1
      contador.setAttribute('aria-label', `${notificacionesPendientes} ${notificacionesPendientes === 1 ? 'notificación pendiente' : 'notificaciones pendientes'}`)
      b.appendChild(contador)
    }
    if (pantalla === destino) {
      b.classList.add('activa')
      b.setAttribute('aria-current', 'page')
    }
    return b
  }

  if (sesion?.origen === 'cloudflare') {
    caja.classList.add('navegacion-cms-contenedor')
    const escritorio = elemento('aside', ['navegacion-cms', 'navegacion-escritorio'])
    const marca = elemento('a', ['navegacion-cms-marca'])
    marca.href = usaRutasRealesGestor(location.hostname) ? rutaParaPantalla('inicio') : hashParaPantalla('inicio')
    marca.setAttribute('aria-label', 'Ir al centro de control')
    const logo = document.createElement('img')
    logo.src = 'assets/logo-aletea-violeta.png'
    logo.alt = 'Aletea'
    marca.append(logo, elemento('small', [], 'Gestión institucional'))
    marca.addEventListener('click', (evento) => {
      if (evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return
      evento.preventDefault()
      abrirPantalla('inicio')
    })
    escritorio.appendChild(marca)

    const preferenciasNavegacion = leerPreferenciasNavegacion(sesion)
    const destinosGrupo = (clave) => GRUPOS_NAVEGACION_CMS[clave].map((destino) => [destino, ETIQUETAS_NAVEGACION_CMS[destino]])
    const bloque = (clave, titulo, destinos, claseExtra = '') => {
      const controles = destinos.map(([destino, etiqueta]) => ir(destino, etiqueta)).filter(Boolean)
      if (!controles.length) return
      const grupo = elemento('details', ['navegacion-cms-grupo', ...(claseExtra ? [claseExtra] : [])])
      grupo.dataset.grupoNavegacion = clave
      if (grupoActivoNavegacion(pantalla) === clave) grupo.classList.add('navegacion-cms-grupo-activo')
      const resumenGrupo = elemento('summary', ['navegacion-cms-rotulo'], titulo)
      resumenGrupo.setAttribute('aria-label', `${titulo}, mostrar u ocultar opciones`)
      const opciones = elemento('div', ['navegacion-cms-opciones'])
      opciones.append(...controles)
      grupo.append(resumenGrupo, opciones)
      grupo.open = grupoDebeEstarAbierto(clave, pantalla, preferenciasNavegacion)
      grupo.addEventListener('toggle', () => guardarPreferenciaNavegacion(clave, grupo.open, sesion))
      escritorio.appendChild(grupo)
    }
    bloque('trabajo', TITULOS_GRUPOS_NAVEGACION_CMS.trabajo, destinosGrupo('trabajo'))
    bloque('organizacion', TITULOS_GRUPOS_NAVEGACION_CMS.organizacion, destinosGrupo('organizacion'))
    bloque('contenidoPublico', TITULOS_GRUPOS_NAVEGACION_CMS.contenidoPublico, destinosGrupo('contenidoPublico'))
    bloque('comunicacion', TITULOS_GRUPOS_NAVEGACION_CMS.comunicacion, destinosGrupo('comunicacion'))
    bloque('administracion', TITULOS_GRUPOS_NAVEGACION_CMS.administracion, destinosGrupo('administracion'))
    const cuenta = elemento('div', ['navegacion-cms-cuenta'])
    cuenta.append(elemento('span', ['navegacion-cms-usuario'], sesion?.nombre || 'Cuenta Aletea'))
    const salir = boton('Cerrar sesión', cerrarSesion)
    salir.dataset.accion = 'cerrar-sesion'
    cuenta.appendChild(salir)
    escritorio.appendChild(cuenta)

    const movil = elemento('nav', ['navegacion-movil', 'navegacion-cms-movil'])
    movil.setAttribute('aria-label', 'Secciones principales')
    ;[['inicio', 'Hoy'], ['cms-trabajo', 'Tareas'], ['cms-agenda', 'Agenda']].forEach(([destino, etiqueta]) => {
      const control = ir(destino, etiqueta)
      if (control) movil.appendChild(control)
    })
    const mas = document.createElement('details')
    mas.className = 'navegacion-mas'
    const resumen = elemento('summary', ['boton-navegacion'])
    resumen.append(icono('tablero'), document.createTextNode('Más'))
    const secundarios = ['cms-pagina-web', 'cms-comunicacion-visual', 'cms-comunicaciones', 'cms-operaciones', 'cms-areas', 'cms-formularios', 'cms-biblioteca', 'cms-privacidad', 'cms-familias', 'cms-deportes', 'cms-comunicacion', 'cms-capacitaciones', 'cms-finanzas', 'cms-eventos', 'cms-administracion', 'accesos', 'registro-institucional', 'ayuda', 'cambios']
    if (secundarios.includes(pantalla)) resumen.classList.add('activa')
    mas.appendChild(resumen)
    const menu = elemento('div', ['menu-navegacion'])
    const agregarGrupo = (clave, titulo, destinos) => {
      const controles = destinos.map((destino) => ir(destino, ETIQUETAS_NAVEGACION_CMS[destino])).filter(Boolean)
      if (!controles.length) return
      const grupo = elemento('details', ['menu-navegacion-grupo'])
      grupo.dataset.grupoNavegacion = clave
      const resumenGrupo = elemento('summary', ['menu-navegacion-titulo'], titulo)
      resumenGrupo.setAttribute('aria-label', `${titulo}, mostrar u ocultar opciones`)
      const opciones = elemento('div', ['menu-navegacion-opciones'])
      opciones.append(...controles)
      grupo.append(resumenGrupo, opciones)
      grupo.open = grupoDebeEstarAbierto(clave, pantalla, preferenciasNavegacion)
      grupo.addEventListener('toggle', () => guardarPreferenciaNavegacion(clave, grupo.open, sesion))
      menu.appendChild(grupo)
    }
    agregarGrupo('trabajo', TITULOS_GRUPOS_NAVEGACION_CMS.trabajo, GRUPOS_NAVEGACION_CMS.trabajo)
    agregarGrupo('organizacion', TITULOS_GRUPOS_NAVEGACION_CMS.organizacion, GRUPOS_NAVEGACION_CMS.organizacion)
    agregarGrupo('contenidoPublico', TITULOS_GRUPOS_NAVEGACION_CMS.contenidoPublico, GRUPOS_NAVEGACION_CMS.contenidoPublico)
    agregarGrupo('comunicacion', TITULOS_GRUPOS_NAVEGACION_CMS.comunicacion, GRUPOS_NAVEGACION_CMS.comunicacion)
    agregarGrupo('administracion', TITULOS_GRUPOS_NAVEGACION_CMS.administracion, GRUPOS_NAVEGACION_CMS.administracion)
    const salirMovil = boton('Cerrar sesión', cerrarSesion)
    salirMovil.dataset.accion = 'cerrar-sesion-movil'
    menu.appendChild(salirMovil)
    mas.appendChild(menu)
    const cerrarFuera = (evento) => {
      if (mas.open && !mas.contains(evento.target)) mas.open = false
    }
    const cerrarConTecla = (evento) => {
      if (evento.key !== 'Escape' || !mas.open) return
      mas.open = false
      resumen.focus()
    }
    document.addEventListener('pointerdown', cerrarFuera)
    document.addEventListener('keydown', cerrarConTecla)
    limpiarNavegacionMovil = () => {
      document.removeEventListener('pointerdown', cerrarFuera)
      document.removeEventListener('keydown', cerrarConTecla)
    }
    movil.appendChild(mas)
    caja.append(escritorio, movil)
    return caja
  }

  const escritorio = elemento('nav', ['navegacion', 'navegacion-escritorio'])
  escritorio.setAttribute('aria-label', 'Secciones')
  const principales = sesion?.origen === 'cloudflare'
    ? ['inicio', 'operacion']
    : ['inicio', 'lista', 'vista-previa', 'personas']
  escritorio.append(...principales.map((destino) => ir(destino, { inicio: 'Centro de control', operacion: 'Operación FSB', lista: 'Armar lista', 'vista-previa': 'Vista previa', personas: 'Personas' }[destino])).filter(Boolean))
  if (sesion?.origen === 'cloudflare') {
    const areas = document.createElement('details')
    areas.className = 'navegacion-mas navegacion-areas'
    const resumenAreas = elemento('summary', ['boton-navegacion'], 'Áreas')
    const destinosAreas = ['cms-familias', 'cms-deportes', 'cms-comunicacion', 'cms-capacitaciones', 'cms-finanzas', 'cms-eventos', 'cms-administracion']
    if (destinosAreas.includes(pantalla)) resumenAreas.classList.add('activa')
    areas.appendChild(resumenAreas)
    const menuAreas = elemento('div', ['menu-navegacion'])
    const etiquetasAreas = { 'cms-familias': 'Familias', 'cms-deportes': 'Deportes', 'cms-comunicacion': 'Comunicación', 'cms-capacitaciones': 'Capacitaciones', 'cms-finanzas': 'Finanzas', 'cms-eventos': 'Eventos', 'cms-administracion': 'Administración' }
    menuAreas.append(...destinosAreas.map((destino) => ir(destino, etiquetasAreas[destino])).filter(Boolean))
    areas.appendChild(menuAreas)
    escritorio.appendChild(areas)
  }
  // Reporte y asistencias los ven los dos roles: quien coordina ya ve el nombre
  // y la foto de cada chico, asi que la asistencia no agrega exposicion.
  if (sesion?.origen !== 'cloudflare') escritorio.append(...['reporte', 'asistencias', 'agenda'].map((destino) => ir(destino, { reporte: 'Reporte', asistencias: 'Asistencias', agenda: 'Agenda' }[destino])).filter(Boolean))
  // Los ajustes son de la administracion: para el resto no existen ni como
  // boton. El guardia de verdad vive en usuarios.js y en la propia pantalla.
  if (esAdmin(sesion) && sesion?.origen !== 'cloudflare') escritorio.appendChild(ir('registro', 'Registro'))
  if (esAdmin(sesion)) escritorio.appendChild(ir('ajustes', 'Ajustes'))

  if (sesion) {
    // Tambien para quien coordina, que no tiene pantalla de ajustes donde
    // encontrarlo, y en su telefono el token quedaria guardado sin salida.
    const salir = boton('Cerrar sesión', cerrarSesion)
    salir.dataset.accion = 'cerrar-sesion'
    escritorio.appendChild(salir)
  } else if (!sesion) {
    const entrar = boton('Ingresar', mostrarIngreso)
    entrar.dataset.accion = 'ingresar'
    escritorio.appendChild(entrar)
  }

  // En el teléfono las tareas de todos los sábados quedan a un toque del pulgar.
  // Vista previa, reportes y cuenta siguen disponibles en Más, sin gastar dos
  // filas antes de que aparezca la planilla.
  const movil = elemento('nav', ['navegacion-movil'])
  movil.setAttribute('aria-label', 'Secciones principales')
  const principalesMovil = sesion?.origen === 'cloudflare' ? ['inicio', 'operacion'] : ['lista', 'personas', 'asistencias']
  movil.append(...principalesMovil.map((destino) => ir(destino, { inicio: 'Control', operacion: 'Programa', lista: 'Lista', personas: 'Personas', asistencias: 'Asistencia' }[destino])).filter(Boolean))

  const mas = document.createElement('details')
  mas.className = 'navegacion-mas'
  const resumen = elemento('summary', ['boton-navegacion'], 'Más')
  resumen.setAttribute('aria-label', 'Más secciones')
  const destinosSecundarios = sesion?.origen === 'cloudflare'
    ? ['cms-familias', 'cms-deportes', 'cms-comunicacion', 'cms-capacitaciones', 'cms-finanzas', 'cms-eventos', 'cms-administracion', 'ajustes']
    : ['inicio', 'vista-previa', 'reporte', 'agenda', 'registro', 'ajustes']
  if (destinosSecundarios.includes(pantalla)) {
    resumen.classList.add('activa')
    resumen.setAttribute('aria-current', 'page')
  }
  mas.appendChild(resumen)
  const menu = elemento('div', ['menu-navegacion'])
  menu.append(...destinosSecundarios.filter((destino) => !['registro', 'ajustes'].includes(destino)).map((destino) => ir(destino, { inicio: 'Centro de control', 'vista-previa': 'Vista previa', personas: 'Personas', reporte: 'Reporte', asistencias: 'Asistencias', agenda: 'Agenda', 'cms-familias': 'Familias', 'cms-deportes': 'Deportes', 'cms-comunicacion': 'Comunicación', 'cms-capacitaciones': 'Capacitaciones', 'cms-finanzas': 'Finanzas', 'cms-eventos': 'Eventos', 'cms-administracion': 'Administración' }[destino])).filter(Boolean))
  if (esAdmin(sesion) && sesion?.origen !== 'cloudflare') menu.appendChild(ir('registro', 'Registro'))
  if (esAdmin(sesion)) menu.appendChild(ir('ajustes', 'Ajustes'))
  if (sesion) {
    const salir = boton('Cerrar sesión', cerrarSesion)
    salir.dataset.accion = 'cerrar-sesion-movil'
    menu.appendChild(salir)
  } else if (!sesion) {
    const entrar = boton('Ingresar', mostrarIngreso)
    entrar.dataset.accion = 'ingresar-movil'
    menu.appendChild(entrar)
  }
  mas.appendChild(menu)
  movil.appendChild(mas)

  caja.append(escritorio, movil)
  return caja
}

// El deposito guarda las fotos como blobs. El pintor necesita algo que
// drawImage acepte, asi que las convertimos a mapa de bits una sola vez.
async function cargarFoto(clave) {
  const blob = await deposito.leerFoto(clave)
  if (!blob) return null
  return createImageBitmap(blob)
}

// Mira solo los ultimos sabados que hagan falta para decidir una racha. Cada
// sabado es un archivo aparte, y leer el año entero al abrir la aplicacion un
// viernes a la noche se nota.
const SABADOS_A_MIRAR = UMBRAL_ALERTA + 1

async function calcularAlertas() {
  try {
    const guardadas = (await deposito.listarListas()).map((l) => l.fecha)
    // hastaHoy saca la planilla del sabado que viene, que existe desde que se
    // abre la aplicacion y trae a todos presentes. Sin esto la alerta no
    // saltaba nunca: ese "vino" del futuro cortaba cualquier racha.
    const fechas = hastaHoy(guardadas, hoyISO()).slice(-SABADOS_A_MIRAR)
    if (fechas.length < UMBRAL_ALERTA) return []
    const listas = (await Promise.all(fechas.map((f) => deposito.leerLista(f)))).filter(Boolean)
    const meses = [...new Set(fechas.map((f) => f.slice(0, 7)))]
    const archivos = await Promise.all(meses.map((m) => deposito.leerAsistencias(m)))
    const correcciones = archivos.flatMap((a) => a?.correcciones ?? [])
    const guardados = await deposito.leerSeguimientos()
    return rachasDeFalta(historial(listas, roster, correcciones), guardados?.seguimientos ?? [])
  } catch {
    // Un aviso que no se pudo calcular no puede impedir armar la planilla, que
    // es para lo que se abre la aplicacion.
    return []
  }
}

async function calcularTendencia() {
  try {
    const fechas = hastaHoy((await deposito.listarListas()).map((registro) => registro.fecha), hoyISO()).slice(-4)
    if (!fechas.length) return null
    const listas = (await Promise.all(fechas.map((fecha) => deposito.leerLista(fecha)))).filter(Boolean)
    const presentes = listas.reduce((total, jornada) => total + (jornada.grupos ?? []).reduce((cuenta, grupo) => cuenta + (grupo.filas ?? []).reduce((fila, asignacion) => fila + (asignacion.participantes?.length ?? 0), 0), 0), 0)
    const activos = roster.participantes.filter((persona) => persona.activo !== false).length
    if (!activos) return null
    const porcentaje = Math.round((presentes / (activos * listas.length)) * 100)
    return { texto: `Asistencia planificada: ${porcentaje}% en las últimas ${listas.length} jornada${listas.length === 1 ? '' : 's'}` }
  } catch { return null }
}

async function anotarSeguimiento(persona, nota) {
  const guardados = (await deposito.leerSeguimientos())?.seguimientos ?? []
  const seguimientos = [...guardados, {
    persona: persona.id,
    // La fecha de la planilla abierta, no la del reloj: es la que se compara
    // contra los sabados para saber si volvio despues de la nota.
    desde: lista.fecha,
    nota,
    quien: sesion?.nombre ?? 'sin registrar',
    cuando: new Date().toISOString(),
  }]
  try {
    await deposito.guardarSeguimientos({ version: 1, seguimientos },
      `Anotar un seguimiento de ${persona.nombre}`)
  } catch (fallo) {
    // La nota es lo unico que queda escrito de que alguien se ocupo del tema.
    // Perderla en silencio, con la franja apagandose igual, seria lo peor de
    // los dos mundos: sin registro y sin recordatorio.
    window.alert(`No se pudo guardar la nota sobre ${persona.nombre}: ${fallo.message}`)
    return
  }
  alertas = await calcularAlertas()
  dibujar()
}

function dibujar() {
  olvidarVista()
  limpiarNavegacionMovil?.()
  limpiarNavegacionMovil = null
  const avisoActualizacion = contenedor.querySelector(':scope > .aviso-version')
  vaciar(contenedor)
  contenedor.classList.toggle('app-cms', sesion?.origen === 'cloudflare')
  if (avisoActualizacion) contenedor.appendChild(avisoActualizacion)
  contenedor.appendChild(navegacion())
  const estadoGuardado = elemento('div', ['estado-guardado'])
  estadoGuardado.dataset.estadoGuardado = ''
  estadoGuardado.setAttribute('role', 'status')
  estadoGuardado.setAttribute('aria-live', 'polite')
  estadoGuardado.hidden = true
  contenedor.appendChild(estadoGuardado)
  pintarEstadoGuardado(estadoGuardado)
  const cuerpo = elemento('div', ['cuerpo'])
  contenedor.appendChild(cuerpo)
  contenedor.appendChild(sello())

  if (pantalla === 'cms-pagina-web' && sesion?.origen === 'cloudflare') {
    vista = crearPantallaPaginaWeb(cuerpo, { sesion, alIrA: abrirPantalla })
  } else if (pantalla === 'cms-comunicacion-visual' && sesion?.origen === 'cloudflare') {
    vista = crearPantallaComunicacionVisual(cuerpo, { sesion })
  } else if (pantalla === 'cms-comunicaciones' && sesion?.origen === 'cloudflare') {
    vista = crearPantallaComunicaciones(cuerpo, { sesion, alIrA: abrirPantalla })
  } else if (pantalla === 'cms-operaciones' && sesion?.origen === 'cloudflare') {
    vista = crearPantallaOperaciones(cuerpo, { sesion, alIrA: abrirPantalla })
  } else if ((pantalla === 'inicio' || pantalla.startsWith('cms-')) && sesion?.origen === 'cloudflare') {
    vista = crearPantallaCMS(cuerpo, {
      sesion,
      alIrA: abrirPantalla,
      area: pantalla === 'inicio' ? 'control' : pantalla.slice(4),
      contexto: contextoPantalla,
      alCambiarNotificaciones: (cantidad) => {
        notificacionesPendientes = Math.max(0, Number(cantidad || 0))
        pintarContadoresNotificaciones()
      },
    })
  } else if (pantalla === 'inicio' || pantalla === 'operacion') {
    vista = crearPantallaInicio(cuerpo, {
      roster, alertas, tendencia, ultimaSincronizacion, alIrA: abrirPantalla,
      esModuloCMS: pantalla === 'operacion' && sesion?.origen === 'cloudflare',
      alVolverCMS: () => abrirPantalla('inicio'),
    })
  } else if (pantalla === 'lista') {
    vista = crearPantallaLista(cuerpo, {
      lista,
      roster,
      franja: crearFranjaAlerta({
        alertas,
        alSilenciar: anotarSeguimiento,
        alVerElMes: () => abrirPantalla('reporte'),
      }),
      alCambiar: async (siguiente, descripcion, confirmacion) => {
        await guardarListaConEstado(siguiente, descripcion, confirmacion)
      },
      // Las listas se guardan por fecha: cambiar la fecha es abrir otra lista.
      // Si no hay ninguna guardada para ese dia, empezamos una con los mismos
      // datos de siempre (hora, lugar y coordinacion).
      alCambiarFecha: async (nuevaFecha) => {
        if (nuevaFecha === lista.fecha) return
        const guardada = await deposito.leerLista(nuevaFecha)
        lista = guardada ?? crearLista(nuevaFecha, roster, {
          hora: lista.hora,
          lugar: lista.lugar,
          coordinacion: lista.coordinacion,
        })
        dibujar()
      },
      alRecuperarAnterior: async () => {
        const anteriores = (await deposito.listarListas()).map((registro) => registro.fecha)
          .filter((fecha) => fecha < lista.fecha).sort().reverse()
        if (!anteriores.length) {
          window.alert('Todavía no hay una jornada anterior para recuperar.')
          return null
        }
        const anterior = await deposito.leerLista(anteriores[0])
        return anterior ? sincronizarConRoster(duplicarListaParaFecha(anterior, lista.fecha), roster) : null
      },
    })
  } else if (pantalla === 'vista-previa') {
    vista = crearPantallaVistaPrevia(cuerpo, {
      lista,
      roster,
      cargarFoto,
      alCambiar: async (siguiente, descripcion) => {
        await guardarListaConEstado(siguiente, descripcion)
      },
    })
  } else if (pantalla === 'reporte') {
    vista = crearPantallaReporte(cuerpo, {
      roster,
      almacen: deposito,
      // Arranca en el mes de la planilla abierta, que es de lo que se viene
      // hablando: pedir el mes antes de mostrar nada seria un paso de mas.
      mes: lista.fecha.slice(0, 7),
      alIrALista: () => abrirPantalla('lista'),
    })
  } else if (pantalla === 'asistencias') {
    vista = crearPantallaAsistencias(cuerpo, {
      roster,
      almacen: deposito,
      alIrALista: () => abrirPantalla('lista'),
    })
  } else if (pantalla === 'agenda') {
    vista = crearPantallaAgenda(cuerpo, {
      roster,
      almacen: deposito,
      sesion,
      alGuardar: guardarRosterConEstado,
      alCambiar: async (siguiente) => {
        roster = siguiente
        lista = sincronizarConRoster(lista, roster)
        await guardarListaConEstado(lista)
      },
    })
  } else if (pantalla === 'registro' && esAdmin(sesion)) {
    // Se lee del repositorio privado, asi que sin sesion de GitHub no hay nada
    // que mostrar: en modo local los cambios no dejan rastro compartido.
    vista = crearPantallaRegistro(cuerpo, {
      sesion,
      cliente: crearClienteGitHub({
        token: sesion?.token,
        duenio: CONFIG.duenio,
        repo: CONFIG.repoDatos,
        rama: CONFIG.rama,
      }),
      // Los cambios de acceso viven en el otro repositorio: sin este cliente
      // faltaria justo lo mas importante de auditar.
      clientePublico: crearClienteGitHub({
        token: sesion?.token,
        duenio: CONFIG.duenio,
        repo: CONFIG.repoPublico,
        rama: CONFIG.rama,
      }),
    })
  } else if ((pantalla === 'accesos' || pantalla === 'ajustes') && esAdmin(sesion) && sesion?.origen === 'cloudflare') {
    vista = crearPantallaAccesosCloudflare(cuerpo, {
      sesion,
      solicitudInicial: contextoPantalla.resolucionAcceso,
      alCompletarSolicitud: (regreso) => abrirPantalla(regreso || 'inicio'),
    })
  } else if (pantalla === 'registro-institucional' && esAdmin(sesion) && sesion?.origen === 'cloudflare') {
    vista = crearPantallaRegistroInstitucional(cuerpo)
  } else if (pantalla === 'ayuda' && sesion?.origen === 'cloudflare') {
    vista = crearPantallaAyuda(cuerpo, {
      alIrA: abrirPantalla,
      admin: esAdmin(sesion),
      busquedaInicial: contextoPantalla.busqueda,
      alCopiarEnlace: (busqueda) => copiarEnlacePantalla('ayuda', { busqueda }),
      alCopiarTexto: (texto) => navigator.clipboard.writeText(texto),
      alRegistrarBusquedaSinResultados: async (consulta) => {
        const respuesta = await fetch('/api/cms/ayuda/busquedas-sin-resultados', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ consulta, resultados: 0 }),
        })
        if (!respuesta.ok) throw new Error('No se pudo registrar la búsqueda sin resultados.')
      },
      alLeerBusquedasSinResultados: esAdmin(sesion) ? async () => {
        const respuesta = await fetch('/api/cms/ayuda/busquedas-sin-resultados')
        if (!respuesta.ok) return []
        return (await respuesta.json()).busquedas || []
      } : null,
      volverA: contextoPantalla.volverPantalla ? {
        pantalla: contextoPantalla.volverPantalla,
        contexto: contextoPantalla.volverContexto || {},
        alVolver: () => abrirPantalla(contextoPantalla.volverPantalla, contextoPantalla.volverContexto || {}),
      } : null,
    })
  } else if (pantalla === 'cambios' && sesion?.origen === 'cloudflare') {
    vista = crearPantallaCambios(cuerpo)
  } else if (pantalla === 'ajustes' && esAdmin(sesion)) {
    vista = crearPantallaAjustes(cuerpo, {
      sesion,
      leerArchivo: leerArchivoUsuarios,
      guardarArchivo: guardarArchivoUsuarios,
      alCerrarSesion: cerrarSesion,
      // Tras rotar, el token viejo queda revocado: sin rearmar el almacen la
      // siguiente lista que se guarde falla con un 401.
      alCambiarToken: async (token) => {
        configurar({ modo: 'github', token, autor: sesion.nombre })
        deposito = await almacen()
      },
    })
  } else {
    vista = crearPantallaPersonas(cuerpo, {
      roster,
      almacen: deposito,
      sesion,
      modoPruebaGitHub: sesion?.origen === 'github',
      esAdmin: esAdmin(sesion),
      busquedaInicial: contextoPantalla.busqueda,
      personaInicial: contextoPantalla.personaId,
      accionInicial: contextoPantalla.accionPersona,
      alGuardar: guardarRosterConEstado,
      alCambiar: async (siguiente, mudanza) => {
        roster = siguiente
        lista = sincronizarConRoster(lista, roster)
        // Sincronizar deja a cada uno donde esta y solo agrega a los que faltan,
        // a proposito: la coordinacion a veces mueve a alguien por un sabado
        // suelto y eso no se pisa. Cambiar el grupo desde Personas si es una
        // decision explicita, asi que la planilla del dia lo acompaña.
        const mudanzas = Array.isArray(mudanza) ? mudanza : mudanza ? [mudanza] : []
        mudanzas.forEach(({ id, grupo }) => {
          try { lista = moverAGrupo(lista, id, grupo) } catch {}
        })
        await guardarListaConEstado(lista,
          mudanzas.length ? `Actualizar grupos en la planilla del ${lista.fecha}` : undefined)
      },
    })
  }

  if (novedadesAlAbrir.length) {
    crearAvisoNovedades(contenedor, {
      novedades: novedadesAlAbrir,
      alContinuar: () => { novedadesAlAbrir = [] },
      alVerCambios: () => {
        novedadesAlAbrir = []
        abrirPantalla('cambios')
      },
    })
  }
}

function mostrarFalla(mensaje) {
  olvidarVista()
  vaciar(contenedor)
  const caja = elemento('section', ['ingreso'])
  caja.append(
    elemento('h1', ['titulo-ingreso'], 'No se pudo abrir'),
    elemento('p', ['error-ingreso'], mensaje),
    boton('Volver al ingreso', cerrarSesion),
  )
  contenedor.appendChild(caja)
}

async function abrirAplicacion() {
  try {
    deposito = await almacen()
    roster = await deposito.leerRoster()
    const sabado = proximoSabado()
    lista = (await deposito.leerLista(sabado)) ?? crearLista(sabado, roster)
    const inicioPorDefecto = sesion?.origen === 'cloudflare' && pantallaPermitida('inicio', {
      admin: esAdmin(sesion), cloudflare: true, permisos: sesion?.permisos, perfilAcceso: sesion?.perfil_acceso, nivelDatosPersonales: sesion?.nivel_datos_personales,
    }) ? 'inicio' : 'lista'
    const rutaCompartida = rutaCompartidaDesdeUbicacion(location)
    const restaurada = rutaCompartida?.pantalla || leerUltimaPantalla(globalThis.sessionStorage, inicioPorDefecto)
    pantalla = pantallaPermitida(restaurada, {
      admin: esAdmin(sesion), cloudflare: sesion?.origen === 'cloudflare', permisos: sesion?.permisos, perfilAcceso: sesion?.perfil_acceso, nivelDatosPersonales: sesion?.nivel_datos_personales,
    }) ? restaurada : inicioPorDefecto
    contextoPantalla = rutaCompartida?.pantalla === pantalla ? rutaCompartida.contexto : {}
    await actualizarResumenNotificaciones()
    novedadesAlAbrir = sesion?.origen === 'cloudflare' && !rutaCompartida ? novedadesPendientes() : []
    actualizarRuta(pantalla, contextoPantalla, true)
    dibujar()
    // Despues de dibujar y sin await en el camino critico: la planilla tiene que
    // aparecer ya, y el aviso se suma cuando este listo.
    Promise.all([calcularAlertas(), calcularTendencia()]).then(([nuevas, nuevaTendencia]) => {
      alertas = nuevas
      tendencia = nuevaTendencia
      if (pantalla === 'lista' || pantalla === 'inicio') dibujar()
    })
  } catch (fallo) {
    // Un token vencido o un repositorio mal escrito no pueden dejar la
    // pantalla en blanco un viernes a la noche.
    mostrarFalla(fallo.message)
  }
}

function mostrarIngreso() {
  olvidarVista()
  vista = crearPantallaIngreso(contenedor, {
    leerArchivo: leerArchivoUsuarios,
    alEntrar: entrar,
    alSeguirSinIngresar: abrirAplicacion,
  })
}

function mostrarIngresoCloudflare() {
  olvidarVista()
  vista = crearPantallaIngresoCloudflare(contenedor, { alEntrar: entrarCloudflare })
}

async function entrar({ token, claveAcceso = null, nombre, usuario, rol, recordar: recordarme }) {
  if (recordarme) await recordar(token, nombre, { usuario, rol, claveAcceso })
  sesion = { token, claveAcceso, nombre, usuario, rol, origen: 'github' }
  configurar({ modo: 'github', token, autor: nombre })
  await abrirAplicacion()
}

async function entrarCloudflare({ usuario, contrasena }) {
  const acceso = await ingresarCloudflare({ usuario, contrasena })
  sesion = { ...acceso, usuario: acceso.usuario, origen: 'cloudflare' }
  configurar({ modo: 'cloudflare', autor: acceso.nombre })
  await abrirAplicacion()
}

async function cerrarSesion() {
  olvidarUltimaPantalla()
  // Pages nunca debe caer al ingreso legado de GitHub. En particular, si la
  // comprobacion de sesion fallo antes de poblar `sesion`, el boton de
  // recuperacion sigue llevando al acceso institucional.
  if (sesion?.origen === 'cloudflare' || esEntornoInstitucional(location.hostname)) {
    // Cerrar en el servidor es un intento de mejor esfuerzo: si esa llamada
    // tambien falla, igual hay que permitir que la persona vuelva a ingresar.
    try { await cerrarSesionCloudflare() } catch {}
    sesion = null
    configurar({ modo: 'local', token: null, autor: null })
    deposito = null
    mostrarIngresoCloudflare()
    return
  }
  await olvidar()
  sesion = null
  // Explicito, no por omision: configurar mezcla con lo anterior y sin esto el
  // token seguiria ahi para la proxima pantalla que pida el almacen.
  configurar({ modo: 'local', token: null, autor: null })
  deposito = null
  mostrarIngreso()
}

// Arriba de todo y sobre cualquier pantalla, tambien la de ingreso: el aviso
// tiene que verse aunque nadie haya entrado todavia.
vigilarVersion(contenedor)

// Con el trabajador registrado, cada recarga trae el codigo publicado en vez de
// lo que haya quedado en la cache del navegador. No se espera su resultado: si
// tarda o falla, la aplicacion arranca igual.
recargarAlCambiarControlador()
registrarTrabajador({ ruta: `sw.js?v=${VERSION}` })

const recordada = await recuperarRecordado()
const esCMSInstitucional = esEntornoInstitucional(location.hostname)
if (esCMSInstitucional) {
  try {
    const acceso = await leerSesionCloudflare()
    if (acceso) {
      sesion = { ...acceso, usuario: acceso.usuario ?? acceso.correo, origen: 'cloudflare' }
      configurar({ modo: 'cloudflare', autor: acceso.nombre })
      await abrirAplicacion()
    } else mostrarIngresoCloudflare()
  } catch (fallo) {
    mostrarFalla(fallo.message)
  }
} else if (recordada) await entrar({ ...recordada, recordar: false })
else mostrarIngreso()

window.addEventListener('popstate', () => {
  if (!sesion) return
  const ruta = rutaCompartidaDesdeUbicacion(location)
  if (!ruta || ruta.pantalla === pantalla) return
  abrirPantalla(ruta.pantalla, ruta.contexto, { desdeHistorial: true })
})
