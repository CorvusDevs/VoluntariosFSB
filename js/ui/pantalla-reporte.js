import { elemento, boton, vaciar } from './componentes.js'
import { historial, hastaHoy, VINO, FALTO } from '../modelo/asistencia.js'
import { aCSV, descargarCSV } from '../reporte/csv.js'
import { maquetarReporte } from '../imagen/maquetar-reporte.js'
import { pintar } from '../imagen/pintar.js'
import { medidorDesde, esperarFuentes, descargar } from '../imagen/exportar.js'
import { hoyISO } from '../util/fechas.js'

const MARCA = { [VINO]: '✓', [FALTO]: '✗' }
const diaDe = (fecha) => String(Number(fecha.slice(8, 10)))

// Las listas se guardan una por fecha, asi que el mes es un prefijo de la clave:
// no hay indice que consultar ni fecha que parsear.
//
// hastaHoy saca la planilla del sabado que viene: se crea con todos presentes
// porque es un plan, y mostrarla como asistencia diria que fue gente que
// todavia no fue.
const delMes = (fechas, mes) => hastaHoy(fechas.filter((f) => f.startsWith(`${mes}-`)), hoyISO())

export function crearPantallaReporte(raiz, { roster, almacen, mes: mesInicial }) {
  let mes = mesInicial
  let historia = null
  let cargando = true
  let vivo = true

  async function cargar() {
    cargando = true
    dibujar()
    const claves = (await almacen.listarListas()).map((l) => l.fecha)
    const fechas = delMes(claves, mes)
    const listas = (await Promise.all(fechas.map((f) => almacen.leerLista(f)))).filter(Boolean)
    const archivo = await almacen.leerAsistencias(mes)
    if (!vivo) return
    historia = historial(listas, roster, archivo?.correcciones ?? [])
    cargando = false
    dibujar()
  }

  function tabla() {
    const t = document.createElement('table')
    t.className = 'tabla-reporte'
    const cabeza = document.createElement('thead')
    const filaCabeza = document.createElement('tr')
    filaCabeza.appendChild(elemento('th', [], 'Nombre'))
    historia.fechas.forEach((f) => filaCabeza.appendChild(elemento('th', ['dia'], diaDe(f))))
    filaCabeza.appendChild(elemento('th', [], 'Vino'))
    cabeza.appendChild(filaCabeza)
    t.appendChild(cabeza)

    const cuerpo = document.createElement('tbody')
    const seccion = (titulo, filas) => {
      if (filas.length === 0) return
      const encabezado = document.createElement('tr')
      const celda = elemento('th', ['seccion-reporte'], titulo)
      celda.colSpan = historia.fechas.length + 2
      encabezado.appendChild(celda)
      cuerpo.appendChild(encabezado)
      filas.forEach((fila) => {
        const tr = document.createElement('tr')
        tr.dataset.persona = fila.persona.id
        tr.appendChild(elemento('td', ['nombre-reporte'], fila.persona.nombre))
        fila.estados.forEach((estado) => {
          const td = elemento('td', ['casilla'], MARCA[estado] ?? '')
          // El estado va en un atributo y no solo en el simbolo: el CSS pinta de
          // ahi, y las pruebas leen de ahi en vez de comparar caracteres.
          td.dataset.estado = estado
          tr.appendChild(td)
        })
        tr.appendChild(elemento('td', ['resumen-reporte'], `${fila.vino} de ${fila.de}`))
        cuerpo.appendChild(tr)
      })
    }
    seccion('Participantes', historia.participantes)
    seccion('Voluntarios', historia.voluntarios)
    t.appendChild(cuerpo)
    return t
  }

  async function lienzoDelReporte() {
    await esperarFuentes()
    const lienzo = document.createElement('canvas')
    const ctx = lienzo.getContext('2d')
    const plano = maquetarReporte({ historia, mes, medirTexto: medidorDesde(ctx) })
    // Densidad 2 para que el texto no se vea borroso al abrirlo en el telefono.
    const densidad = 2
    lienzo.width = plano.ancho * densidad
    lienzo.height = plano.alto * densidad
    pintar(ctx, plano, {}, densidad)
    return lienzo
  }

  function acciones() {
    const caja = elemento('div', ['acciones-reporte'])
    const png = boton('Descargar PNG', async () => {
      png.disabled = true
      try {
        await descargar(await lienzoDelReporte(), `asistencia-${mes}.png`)
      } finally {
        png.disabled = false
      }
    })
    png.dataset.accion = 'descargar-png'
    const csv = boton('Descargar CSV', () => {
      descargarCSV(aCSV(historia), `asistencia-${mes}.csv`)
    })
    csv.dataset.accion = 'descargar-csv'
    caja.append(png, csv)
    return caja
  }

  function dibujar() {
    vaciar(raiz)
    const seccion = elemento('section', ['seccion'])
    seccion.appendChild(elemento('h2', [], 'Reporte de asistencia'))

    const selector = document.createElement('input')
    selector.type = 'month'
    selector.dataset.campo = 'mes'
    selector.value = mes
    selector.addEventListener('change', () => {
      if (!selector.value) return
      mes = selector.value
      cargar()
    })
    const rotulo = elemento('label', ['campo'])
    rotulo.append(elemento('span', ['campo-rotulo'], 'Mes'), selector)
    seccion.appendChild(rotulo)

    if (cargando) {
      seccion.appendChild(elemento('p', ['ayuda'], 'Leyendo las planillas del mes…'))
    } else if (historia.fechas.length === 0) {
      seccion.appendChild(elemento('p', ['ayuda'], 'No hay planillas guardadas de ese mes.'))
    } else {
      const envoltorio = elemento('div', ['tabla-envoltorio'])
      envoltorio.appendChild(tabla())
      seccion.appendChild(envoltorio)
      const cuantos = historia.fechas.length
      seccion.appendChild(elemento('p', ['ayuda'],
        `${cuantos} ${cuantos === 1 ? 'sábado' : 'sábados'} con planilla. La casilla vacía es "todavía no estaba".`))
      seccion.appendChild(acciones())
    }
    raiz.appendChild(seccion)
  }

  cargar()
  // Cambiar de pantalla mientras se leen cinco archivos dejaba el dibujado
  // apuntando a un contenedor que ya no existe.
  return { destruir: () => { vivo = false } }
}
