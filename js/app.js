import { almacen } from './almacen/indice.js'
import { crearPantallaLista } from './ui/pantalla-lista.js'
import { crearPantallaPersonas } from './ui/pantalla-personas.js'
import { crearLista, sincronizarConRoster } from './modelo/lista.js'
import { proximoSabado } from './util/fechas.js'
import { boton, vaciar, elemento } from './ui/componentes.js'

const contenedor = document.getElementById('app')
const deposito = await almacen()

let roster = await deposito.leerRoster()
const sabado = proximoSabado()
let lista = (await deposito.leerLista(sabado)) ?? crearLista(sabado, roster)
let pantalla = 'lista'

function navegacion() {
  const nav = elemento('nav', ['navegacion'])
  const ir = (destino, etiqueta) => {
    const b = boton(etiqueta, () => { pantalla = destino; dibujar() })
    b.dataset.pantalla = destino
    if (pantalla === destino) b.classList.add('activa')
    return b
  }
  nav.append(ir('lista', 'Armar lista'), ir('personas', 'Personas'))
  return nav
}

function dibujar() {
  vaciar(contenedor)
  contenedor.appendChild(navegacion())
  const cuerpo = elemento('div', ['cuerpo'])
  contenedor.appendChild(cuerpo)

  if (pantalla === 'lista') {
    crearPantallaLista(cuerpo, {
      lista,
      roster,
      alCambiar: async (siguiente) => {
        lista = siguiente
        await deposito.guardarLista(lista)
      },
    })
  } else {
    crearPantallaPersonas(cuerpo, {
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
