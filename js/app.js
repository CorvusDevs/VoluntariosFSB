import { almacen, configurar } from './almacen/indice.js'
import { crearClienteGitHub } from './almacen/github.js'
import { crearPantallaLista } from './ui/pantalla-lista.js'
import { crearPantallaPersonas } from './ui/pantalla-personas.js'
import { crearPantallaVistaPrevia } from './ui/pantalla-vista-previa.js'
import { crearPantallaIngreso } from './ui/pantalla-ingreso.js'
import { crearPantallaIngresoCloudflare } from './ui/pantalla-ingreso-cloudflare.js'
import { crearPantallaAjustes } from './ui/pantalla-ajustes.js'
import { crearPantallaAccesosCloudflare } from './ui/pantalla-accesos-cloudflare.js'
import { crearPantallaRegistro } from './ui/pantalla-registro.js'
import { crearPantallaReporte } from './ui/pantalla-reporte.js'
import { crearPantallaAsistencias } from './ui/pantalla-asistencias.js'
import { crearFranjaAlerta } from './ui/franja-alerta.js'
import { historial, rachasDeFalta, hastaHoy, UMBRAL_ALERTA } from './modelo/asistencia.js'
import { crearLista, sincronizarConRoster, moverAGrupo } from './modelo/lista.js'
import { proximoSabado, hoyISO } from './util/fechas.js'
import { boton, vaciar, elemento } from './ui/componentes.js'
import { CONFIG } from './config.js'
import { esAdmin, leerUsuarios } from './acceso/usuarios.js'
import { olvidar, recordar, recuperarRecordado } from './acceso/sesion.js'
import { cerrarSesionCloudflare, ingresarCloudflare, leerSesionCloudflare } from './acceso/cloudflare.js'
import { sello, vigilarVersion } from './ui/aviso-version.js'
import { registrarTrabajador } from './ui/trabajador.js'
import { VERSION } from './version.js'

const RUTA_USUARIOS = 'usuarios.json'

const contenedor = document.getElementById('app')

// Queda a la vista en el arbol y en la consola: preguntar "que version estas
// corriendo" tiene que ser una mirada, no una sesion de depuracion.
document.documentElement.dataset.version = VERSION
console.info(`Voluntarios FSB, versión ${VERSION}`)

// Sin sesion, sesion queda en null y el almacen se queda en modo local: la
// aplicacion funciona igual en un solo telefono, sin nada de GitHub.
let sesion = null
let deposito = null
let roster = null
let lista = null
let pantalla = 'lista'
// La pantalla que se esta mostrando. Algunas tienen trabajo en curso (fotos que
// se decodifican, un lienzo que se repinta) y hay que avisarles que se van.
let vista = null
// Las alertas se calculan una vez por sesion: leer los ultimos sabados en cada
// redibujado seria una llamada a GitHub por cada toque en la pantalla.
let alertas = []
let ocultarEstadoGuardado = null
let intentoGuardado = 0

function cambiarEstadoGuardado(estado, mensaje, alReintentar = null) {
  const indicador = contenedor.querySelector('[data-estado-guardado]')
  if (!indicador) return
  if (ocultarEstadoGuardado) clearTimeout(ocultarEstadoGuardado)
  vaciar(indicador)
  indicador.hidden = false
  indicador.dataset.estado = estado
  indicador.appendChild(elemento('span', ['estado-guardado-texto'], mensaje))
  if (alReintentar) {
    const reintentar = boton('Reintentar', alReintentar, ['boton-reintentar'])
    reintentar.dataset.accion = 'reintentar-guardado'
    indicador.appendChild(reintentar)
  }
  if (estado === 'guardado') {
    ocultarEstadoGuardado = setTimeout(() => { indicador.hidden = true }, 1800)
  }
}

async function guardarListaConEstado(siguiente, descripcion, confirmacion = null) {
  intentoGuardado += 1
  const esteIntento = intentoGuardado
  lista = siguiente
  cambiarEstadoGuardado('guardando', 'Guardando…')
  try {
    await deposito.guardarLista(siguiente, descripcion)
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
    const b = boton(etiqueta, () => { pantalla = destino; dibujar() })
    b.dataset.pantalla = destino
    if (pantalla === destino) {
      b.classList.add('activa')
      b.setAttribute('aria-current', 'page')
    }
    return b
  }

  const escritorio = elemento('nav', ['navegacion', 'navegacion-escritorio'])
  escritorio.setAttribute('aria-label', 'Secciones')
  escritorio.append(ir('lista', 'Armar lista'), ir('vista-previa', 'Vista previa'), ir('personas', 'Personas'))
  // Reporte y asistencias los ven los dos roles: quien coordina ya ve el nombre
  // y la foto de cada chico, asi que la asistencia no agrega exposicion.
  escritorio.append(ir('reporte', 'Reporte'), ir('asistencias', 'Asistencias'))
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
  movil.append(ir('lista', 'Lista'), ir('personas', 'Personas'), ir('asistencias', 'Asistencia'))

  const mas = document.createElement('details')
  mas.className = 'navegacion-mas'
  const resumen = elemento('summary', ['boton-navegacion'], 'Más')
  resumen.setAttribute('aria-label', 'Más secciones')
  const destinosSecundarios = ['vista-previa', 'reporte', 'registro', 'ajustes']
  if (destinosSecundarios.includes(pantalla)) {
    resumen.classList.add('activa')
    resumen.setAttribute('aria-current', 'page')
  }
  mas.appendChild(resumen)
  const menu = elemento('div', ['menu-navegacion'])
  menu.append(ir('vista-previa', 'Vista previa'), ir('reporte', 'Reporte'))
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
  vaciar(contenedor)
  contenedor.appendChild(navegacion())
  const estadoGuardado = elemento('div', ['estado-guardado'])
  estadoGuardado.dataset.estadoGuardado = ''
  estadoGuardado.setAttribute('role', 'status')
  estadoGuardado.setAttribute('aria-live', 'polite')
  estadoGuardado.hidden = true
  contenedor.appendChild(estadoGuardado)
  const cuerpo = elemento('div', ['cuerpo'])
  contenedor.appendChild(cuerpo)
  contenedor.appendChild(sello())

  if (pantalla === 'lista') {
    vista = crearPantallaLista(cuerpo, {
      lista,
      roster,
      franja: crearFranjaAlerta({
        alertas,
        alSilenciar: anotarSeguimiento,
        alVerElMes: () => { pantalla = 'reporte'; dibujar() },
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
      alIrALista: () => { pantalla = 'lista'; dibujar() },
    })
  } else if (pantalla === 'asistencias') {
    vista = crearPantallaAsistencias(cuerpo, {
      roster,
      almacen: deposito,
      alIrALista: () => { pantalla = 'lista'; dibujar() },
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
  } else if (pantalla === 'ajustes' && esAdmin(sesion) && sesion?.origen === 'cloudflare') {
    vista = crearPantallaAccesosCloudflare(cuerpo, { sesion })
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
      esAdmin: esAdmin(sesion),
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
    pantalla = 'lista'
    dibujar()
    // Despues de dibujar y sin await en el camino critico: la planilla tiene que
    // aparecer ya, y el aviso se suma cuando este listo.
    calcularAlertas().then((nuevas) => {
      if (nuevas.length === 0) return
      alertas = nuevas
      if (pantalla === 'lista') dibujar()
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

async function entrar({ token, nombre, usuario, rol, recordar: recordarme }) {
  if (recordarme) await recordar(token, nombre, { usuario, rol })
  sesion = { token, nombre, usuario, rol }
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
  if (sesion?.origen === 'cloudflare') {
    await cerrarSesionCloudflare()
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
registrarTrabajador()

const recordada = await recuperarRecordado()
const esCloudflare = location.hostname.endsWith('.pages.dev')
if (esCloudflare) {
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
