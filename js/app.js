import { almacen, configurar } from './almacen/indice.js'
import { crearClienteGitHub } from './almacen/github.js'
import { crearPantallaLista } from './ui/pantalla-lista.js'
import { crearPantallaPersonas } from './ui/pantalla-personas.js'
import { crearPantallaVistaPrevia } from './ui/pantalla-vista-previa.js'
import { crearPantallaIngreso } from './ui/pantalla-ingreso.js'
import { crearPantallaAjustes } from './ui/pantalla-ajustes.js'
import { crearLista, sincronizarConRoster } from './modelo/lista.js'
import { proximoSabado } from './util/fechas.js'
import { boton, vaciar, elemento } from './ui/componentes.js'
import { CONFIG } from './config.js'
import { esAdmin, leerUsuarios } from './acceso/usuarios.js'
import { olvidar, recordar, recuperarRecordado } from './acceso/sesion.js'
import { sello, vigilarVersion } from './ui/aviso-version.js'
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

function olvidarVista() {
  if (typeof vista?.destruir === 'function') vista.destruir()
  vista = null
}

// usuarios.json se lee de raw, que es publico y no gasta cuota, y se escribe
// por la API contra el repositorio publico.
const leerArchivoUsuarios = () => leerUsuarios(CONFIG)

async function guardarArchivoUsuarios(archivo) {
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
    'Actualizar las personas con acceso',
  )
}

function navegacion() {
  const nav = elemento('nav', ['navegacion'])
  const ir = (destino, etiqueta) => {
    const b = boton(etiqueta, () => { pantalla = destino; dibujar() })
    b.dataset.pantalla = destino
    if (pantalla === destino) b.classList.add('activa')
    return b
  }
  nav.append(ir('lista', 'Armar lista'), ir('vista-previa', 'Vista previa'), ir('personas', 'Personas'))
  // Los ajustes son de la administracion: para el resto no existen ni como
  // boton. El guardia de verdad vive en usuarios.js y en la propia pantalla.
  if (esAdmin(sesion)) nav.appendChild(ir('ajustes', 'Ajustes'))

  if (sesion) {
    // Tambien para quien coordina, que no tiene pantalla de ajustes donde
    // encontrarlo, y en su telefono el token quedaria guardado sin salida.
    const salir = boton('Cerrar sesión', cerrarSesion)
    salir.dataset.accion = 'cerrar-sesion'
    nav.appendChild(salir)
  } else {
    const entrar = boton('Ingresar', mostrarIngreso)
    entrar.dataset.accion = 'ingresar'
    nav.appendChild(entrar)
  }
  return nav
}

// El deposito guarda las fotos como blobs. El pintor necesita algo que
// drawImage acepte, asi que las convertimos a mapa de bits una sola vez.
async function cargarFoto(clave) {
  const blob = await deposito.leerFoto(clave)
  if (!blob) return null
  return createImageBitmap(blob)
}

function dibujar() {
  olvidarVista()
  vaciar(contenedor)
  contenedor.appendChild(navegacion())
  const cuerpo = elemento('div', ['cuerpo'])
  contenedor.appendChild(cuerpo)
  contenedor.appendChild(sello())

  if (pantalla === 'lista') {
    vista = crearPantallaLista(cuerpo, {
      lista,
      roster,
      alCambiar: async (siguiente) => {
        lista = siguiente
        await deposito.guardarLista(lista)
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
      alCambiar: async (siguiente) => {
        lista = siguiente
        await deposito.guardarLista(lista)
      },
    })
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
      alCambiar: async (siguiente) => {
        roster = siguiente
        lista = sincronizarConRoster(lista, roster)
        await deposito.guardarLista(lista)
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

async function entrar({ token, nombre, usuario, rol, recordar: recordarme }) {
  if (recordarme) await recordar(token, nombre, { usuario, rol })
  sesion = { token, nombre, usuario, rol }
  configurar({ modo: 'github', token, autor: nombre })
  await abrirAplicacion()
}

async function cerrarSesion() {
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

const recordada = await recuperarRecordado()
if (recordada) await entrar({ ...recordada, recordar: false })
else mostrarIngreso()
