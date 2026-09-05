import { COLORES } from './tema.js'
import { VINO, FALTO, agruparPorGrupo } from '../modelo/asistencia.js'

// La tabla del reporte mensual, con el mismo motor de dos etapas que la
// planilla: aca solo se calculan ordenes de dibujo, y pintar.js las ejecuta.
// Esa separacion es lo que garantiza que el PNG descargado sea identico a lo
// que se ve en pantalla, y deja probar la geometria sin navegador.
//
// El reporte se lee de un vistazo en un telefono. Por eso el dibujo se arma con
// bloques ubicables en vez de una sola columna que crece hacia abajo: con los
// voluntarios al costado la imagen queda mas ancha pero mucho mas baja, y no
// hay que seguir con la mirada una columna larguisima.

const MARGEN = 40
const ALTO_TITULO = 92
const ALTO_ENCABEZADO = 44
const ALTO_FILA = 40
const ALTO_SECCION = 52
const ANCHO_COLUMNA = 46
const ANCHO_RESUMEN = 96
const ANCHO_NOMBRE_MINIMO = 220
const SEPARACION_COLUMNAS = 48

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const FUENTE_TITULO = '500 34px Poppins'
const FUENTE_NOMBRE = '400 22px Poppins'
const FUENTE_SECCION = '500 26px Poppins'
const FUENTE_CHICA = '500 20px Poppins'

// Sin new Date(): el mes llega como 'AAAA-MM' y partirlo evita que la zona
// horaria mueva la fecha un dia, que con las fechas ISO pasa en Montevideo.
function mesEnPalabras(mes) {
  const [anio, numero] = mes.split('-')
  return `${MESES[Number(numero) - 1]} de ${anio}`
}

const diaDe = (fecha) => String(Number(fecha.slice(8, 10)))

// Ancho que necesita una columna para sus nombres. Cada columna se mide sola:
// obligar a la de voluntarios a ser tan ancha como la de participantes seria
// regalar espacio justo cuando lo que se busca es que entre todo de un vistazo.
function anchoDeColumna(secciones, fechas, medirTexto) {
  const nombres = secciones.flatMap((s) => s.filas.map((f) => f.persona.nombre))
  const anchoNombre = Math.max(
    ANCHO_NOMBRE_MINIMO,
    ...nombres.map((n) => medirTexto(n, FUENTE_NOMBRE) + 24),
  )
  return { anchoNombre, ancho: anchoNombre + fechas.length * ANCHO_COLUMNA + ANCHO_RESUMEN }
}

export function maquetarReporte({
  historia, mes, medirTexto, titulos = {}, columnas = true,
}) {
  // Los participantes van repartidos por grupo, con el rotulo que les puso la
  // coordinacion: los titulos se editan desde Armar lista y el reporte no puede
  // inventar "Grupo 1".
  const izquierda = agruparPorGrupo(historia.participantes)
    .map((b) => ({
      titulo: titulos[b.numero] ?? `Grupo ${b.numero ?? '?'}`,
      color: COLORES.violeta,
      filas: b.filas,
    }))
  const derecha = historia.voluntarios.length > 0
    ? [{ titulo: 'Voluntarios', color: COLORES.magentaTexto, filas: historia.voluntarios }]
    : []

  const enDosColumnas = columnas && derecha.length > 0
  const medidaIzq = anchoDeColumna(izquierda, historia.fechas, medirTexto)
  const medidaDer = anchoDeColumna(derecha, historia.fechas, medirTexto)

  const titulo = `Asistencia de ${mesEnPalabras(mes)}`
  const anchoCuerpo = enDosColumnas
    ? medidaIzq.ancho + SEPARACION_COLUMNAS + medidaDer.ancho
    : Math.max(medidaIzq.ancho, derecha.length > 0 ? medidaDer.ancho : 0)
  // El titulo tambien manda sobre el ancho. Con pocos sabados la tabla es
  // angosta y el titulo se salia por la derecha: fillText no recorta, dibuja
  // fuera del lienzo y ahi se pierde.
  const ancho = Math.max(
    MARGEN * 2 + anchoCuerpo,
    MARGEN * 2 + medirTexto(titulo, FUENTE_TITULO),
  )

  const ordenes = []
  ordenes.push({ tipo: 'rect', x: 0, y: 0, ancho, alto: ALTO_TITULO, color: COLORES.violeta })
  ordenes.push({ tipo: 'texto', texto: titulo, x: MARGEN, y: 58,
    fuente: FUENTE_TITULO, color: '#FFFFFF' })

  // Dibuja una columna entera en (x, arriba) y devuelve donde termina. Devolver
  // el alto es lo que deja apilarlas o ponerlas al lado sin duplicar el dibujo.
  function dibujarColumna(secciones, x, arriba, medida) {
    if (secciones.length === 0) return arriba
    const columnaX = (i) => x + medida.anchoNombre + i * ANCHO_COLUMNA
    const resumenX = x + medida.anchoNombre + historia.fechas.length * ANCHO_COLUMNA
    let y = arriba

    // El encabezado lleva solo el numero del dia: el mes ya esta en el titulo, y
    // repetirlo cinco veces obliga a girar el telefono para leerlo.
    historia.fechas.forEach((fecha, i) => {
      ordenes.push({ tipo: 'texto', texto: diaDe(fecha),
        x: columnaX(i) + ANCHO_COLUMNA / 2, y: y + 26,
        fuente: FUENTE_CHICA, color: COLORES.textoSuave, alineacion: 'center' })
    })
    ordenes.push({ tipo: 'texto', texto: 'Vino', x: resumenX + 8, y: y + 26,
      fuente: FUENTE_CHICA, color: COLORES.textoSuave })
    y += ALTO_ENCABEZADO

    // El color viaja en la seccion. Antes se deducia comparando el arreglo con
    // el de voluntarios, asi que mover un bloque de columna le cambiaba el color
    // sin que nadie lo pidiera.
    secciones.forEach((seccion) => {
      ordenes.push({ tipo: 'texto', texto: seccion.titulo, x, y: y + 32,
        fuente: FUENTE_SECCION, color: seccion.color })
      y += ALTO_SECCION

      seccion.filas.forEach((fila, indice) => {
        // La banda alterna es lo unico que sostiene la vista a lo largo de cinco
        // columnas: sin ella se salta de fila al leer hacia la derecha.
        if (indice % 2 === 1) {
          ordenes.push({ tipo: 'rect', x: x - 8, y, ancho: medida.ancho + 16,
            alto: ALTO_FILA, color: COLORES.violetaTenue, radio: 8 })
        }
        ordenes.push({ tipo: 'texto', texto: fila.persona.nombre, x, y: y + 27,
          fuente: FUENTE_NOMBRE, color: COLORES.texto })
        fila.estados.forEach((estado, i) => {
          // La casilla vacia significa "todavia no estaba". Un guion o un cero
          // se leerian como una falta.
          if (estado !== VINO && estado !== FALTO) return
          ordenes.push({ tipo: 'texto', texto: estado === VINO ? '✓' : '✗',
            x: columnaX(i) + ANCHO_COLUMNA / 2, y: y + 27, fuente: '500 22px Poppins',
            color: estado === VINO ? COLORES.turquesaTexto : COLORES.magentaTexto,
            alineacion: 'center' })
        })
        ordenes.push({ tipo: 'texto', texto: `${fila.vino} de ${fila.de}`,
          x: resumenX + 8, y: y + 27, fuente: '400 20px Poppins', color: COLORES.textoSuave })
        y += ALTO_FILA
      })
      y += 16
    })
    return y
  }

  const arriba = ALTO_TITULO + 20
  const finIzq = dibujarColumna(izquierda, MARGEN, arriba, medidaIzq)
  const xDerecha = enDosColumnas ? MARGEN + medidaIzq.ancho + SEPARACION_COLUMNAS : MARGEN
  const finDer = dibujarColumna(derecha, xDerecha, enDosColumnas ? arriba : finIzq, medidaDer)
  let y = Math.max(finIzq, finDer)

  const cuantos = historia.fechas.length
  ordenes.push({ tipo: 'texto',
    texto: cuantos === 0
      ? 'No hay planillas guardadas de este mes'
      : `${cuantos} ${cuantos === 1 ? 'sábado' : 'sábados'} con planilla`,
    x: MARGEN, y: y + 24, fuente: '400 18px Poppins', color: COLORES.textoSuave })
  y += MARGEN + 24

  return { ancho, alto: y, ordenes }
}
