import { almacen } from './almacen/indice.js'
import { crearPantallaLista } from './ui/pantalla-lista.js'
import { crearPantallaPersonas } from './ui/pantalla-personas.js'
import { crearPantallaVistaPrevia } from './ui/pantalla-vista-previa.js'
import { crearLista, sincronizarConRoster } from './modelo/lista.js'
import { proximoSabado } from './util/fechas.js'
import { boton, vaciar, elemento } from './ui/componentes.js'

const SALUDO = 'Buenas tardes, esperamos que estén todos bien. Les compartimos las asignaciones para mañana:'
const DESPEDIDA = 'Nos vemos mañana. Gracias a todos.'

const contenedor = document.getElementById('app')
const deposito = await almacen()

let roster = await deposito.leerRoster()
const sabado = proximoSabado()
let lista = (await deposito.leerLista(sabado)) ?? crearLista(sabado, roster)
let pantalla = 'lista'
// La pantalla que se esta mostrando. Algunas tienen trabajo en curso (fotos que
// se decodifican, un lienzo que se repinta) y hay que avisarles que se van.
let vista = null

function navegacion() {
  const nav = elemento('nav', ['navegacion'])
  const ir = (destino, etiqueta) => {
    const b = boton(etiqueta, () => { pantalla = destino; dibujar() })
    b.dataset.pantalla = destino
    if (pantalla === destino) b.classList.add('activa')
    return b
  }
  nav.append(ir('lista', 'Armar lista'), ir('vista-previa', 'Vista previa'), ir('personas', 'Personas'))
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
  if (typeof vista?.destruir === 'function') vista.destruir()
  vista = null
  vaciar(contenedor)
  contenedor.appendChild(navegacion())
  const cuerpo = elemento('div', ['cuerpo'])
  contenedor.appendChild(cuerpo)

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
      saludo: SALUDO,
      despedida: DESPEDIDA,
      cargarFoto,
      alCambiar: async (siguiente) => {
        lista = siguiente
        await deposito.guardarLista(lista)
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

dibujar()
