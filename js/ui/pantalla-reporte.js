import { elemento, boton, vaciar } from './componentes.js'
import { historial, hastaHoy, agruparPorGrupo, VINO, FALTO } from '../modelo/asistencia.js'
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

export function crearPantallaReporte(raiz, { roster, almacen, mes: mesInicial, alIrALista = null }) {
  let mes = mesInicial
  let historia = null
  let cargando = true
  let vivo = true
  let carga = 0
  let error = null
  // Los rotulos de grupo salen de la ultima planilla del mes: se editan desde
  // Armar lista, asi que escribir "Grupo 1" a mano haria que el reporte y la
  // planilla se contradigan.
  let titulos = {}
  let mesesDisponibles = []
  let mesAEliminar = mesInicial
  // Voluntarios al costado en vez de abajo. Viene activado porque el reporte se
  // lee de un vistazo en un telefono, y apilarlo todo obliga a seguir con la
  // mirada una columna larguisima.
  let alCostado = true

  // Cada carga se lleva su numero y su mes. Si mientras se leen las planillas la
  // coordinadora elige otro mes, la respuesta que llega tarde ya no corresponde
  // y se descarta: sin esto el selector decia agosto y la tabla mostraba julio.
  async function cargar() {
    carga += 1
    const mia = carga
    const pedido = mes
    cargando = true
    error = null
    dibujar()
    try {
      const claves = (await almacen.listarListas()).map((l) => l.fecha)
      mesesDisponibles = [...new Set(claves.map((fecha) => fecha.slice(0, 7)))].sort().reverse()
      if (!mesesDisponibles.includes(mesAEliminar)) mesAEliminar = pedido
      const fechas = delMes(claves, pedido)
      const listas = (await Promise.all(fechas.map((f) => almacen.leerLista(f)))).filter(Boolean)
      const archivo = await almacen.leerAsistencias(pedido)
      if (!vivo || mia !== carga) return
      historia = historial(listas, roster, archivo?.correcciones ?? [])
      titulos = Object.fromEntries((listas.at(-1)?.grupos ?? [])
        .filter((g) => g.titulo)
        .map((g) => [g.numero, g.titulo]))
    } catch (fallo) {
      // Red caida o token vencido. Sin esto la pantalla se quedaba en "Leyendo"
      // para siempre y no habia forma de saber que habia pasado.
      if (!vivo || mia !== carga) return
      error = `No se pudo leer: ${fallo.message}`
    }
    cargando = false
    dibujar()
  }

  // Los participantes van repartidos por grupo, que es como se juega el sabado.
  const seccionesDeParticipantes = () => agruparPorGrupo(historia.participantes)
    .map((b) => ({ titulo: titulos[b.numero] ?? `Grupo ${b.numero ?? '?'}`, filas: b.filas }))

  const seccionesDeVoluntarios = () => (historia.voluntarios.length === 0
    ? []
    : [{ titulo: 'Voluntarios', filas: historia.voluntarios }])

  // Una tabla por columna. Con los voluntarios al costado son dos tablas
  // hermanas y no una sola con todo apilado: asi cada una lleva su encabezado de
  // dias y en el telefono, cuando no entran, se acomodan una debajo de la otra.
  function tabla(secciones) {
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
    secciones.forEach(({ titulo, filas }) => {
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
    })
    t.appendChild(cuerpo)
    return t
  }

  function tablas() {
    const caja = elemento('div', ['tablas-reporte'])
    const voluntarios = seccionesDeVoluntarios()
    if (alCostado && voluntarios.length > 0) {
      caja.appendChild(tabla(seccionesDeParticipantes()))
      caja.appendChild(tabla(voluntarios))
    } else {
      caja.appendChild(tabla([...seccionesDeParticipantes(), ...voluntarios]))
    }
    return caja
  }

  async function lienzoDelReporte() {
    await esperarFuentes()
    const lienzo = document.createElement('canvas')
    const ctx = lienzo.getContext('2d')
    const plano = maquetarReporte({
      historia, mes, medirTexto: medidorDesde(ctx), titulos, columnas: alCostado,
    })
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
      descargarCSV(aCSV(historia, titulos), `asistencia-${mes}.csv`)
    })
    csv.dataset.accion = 'descargar-csv'
    const selectorBorrado = document.createElement('select')
    selectorBorrado.dataset.campo = 'mes-a-eliminar'
    mesesDisponibles.forEach((mesDisponible) => {
      const opcion = document.createElement('option')
      opcion.value = mesDisponible
      opcion.textContent = mesDisponible
      selectorBorrado.appendChild(opcion)
    })
    selectorBorrado.value = mesAEliminar
    selectorBorrado.addEventListener('change', () => { mesAEliminar = selectorBorrado.value })
    const rotuloBorrado = elemento('label', ['eliminar-mes-control'])
    rotuloBorrado.append(elemento('span', [], 'Mes a eliminar'), selectorBorrado)

    const borrar = boton('Eliminar mes', async () => {
      if (!mesAEliminar) return
      if (!window.confirm(`Se eliminarán todas las planillas y correcciones de asistencia de ${mesAEliminar}. Esta acción no se puede deshacer.`)) return
      borrar.disabled = true
      selectorBorrado.disabled = true
      try {
        await almacen.borrarMes(mesAEliminar)
        historia = null
        await cargar()
      } catch (fallo) {
        error = `No se pudo eliminar el mes: ${fallo.message}`
        dibujar()
      } finally {
        borrar.disabled = false
        selectorBorrado.disabled = false
      }
    }, ['boton-peligro'])
    borrar.dataset.accion = 'eliminar-mes'
    caja.append(png, csv, rotuloBorrado, borrar)
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
    } else if (error) {
      seccion.appendChild(elemento('p', ['error-ajustes'], error))
    } else if (historia.fechas.length === 0) {
      const vacio = elemento('div', ['estado-vacio'])
      vacio.append(
        elemento('h3', [], 'No hay planillas guardadas de este mes'),
        elemento('p', ['ayuda'], 'Cuando armes una lista, la asistencia va a aparecer acá.'),
      )
      if (alIrALista) {
        const ir = boton('Ir a Armar lista', alIrALista, ['boton-principal'])
        ir.dataset.accion = 'ir-a-lista'
        vacio.appendChild(ir)
      }
      seccion.appendChild(vacio)
    } else {
      const casilla = document.createElement('input')
      casilla.type = 'checkbox'
      casilla.dataset.campo = 'al-costado'
      casilla.checked = alCostado
      casilla.addEventListener('change', () => { alCostado = casilla.checked; dibujar() })
      const opcion = elemento('label', ['opcion'])
      opcion.append(casilla, document.createTextNode(' Voluntarios al costado'))
      seccion.appendChild(opcion)

      const envoltorio = elemento('div', ['tabla-envoltorio'])
      envoltorio.appendChild(tablas())
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
