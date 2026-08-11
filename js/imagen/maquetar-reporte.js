import { COLORES } from './tema.js'
import { VINO, FALTO } from '../modelo/asistencia.js'

// La tabla del reporte mensual, con el mismo motor de dos etapas que la
// planilla: aca solo se calculan ordenes de dibujo, y pintar.js las ejecuta.
// Esa separacion es lo que garantiza que el PNG descargado sea identico a lo
// que se ve en pantalla, y deja probar la geometria sin navegador.

const MARGEN = 40
const ALTO_TITULO = 92
const ALTO_ENCABEZADO = 44
const ALTO_FILA = 40
const ALTO_SECCION = 52
const ANCHO_COLUMNA = 46
const ANCHO_RESUMEN = 96
const ANCHO_NOMBRE_MINIMO = 220

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// Sin new Date(): el mes llega como 'AAAA-MM' y partirlo evita que la zona
// horaria mueva la fecha un dia, que con las fechas ISO pasa en Montevideo.
function mesEnPalabras(mes) {
  const [anio, numero] = mes.split('-')
  return `${MESES[Number(numero) - 1]} de ${anio}`
}

const diaDe = (fecha) => String(Number(fecha.slice(8, 10)))

const FUENTE_TITULO = '500 34px Poppins'

export function maquetarReporte({ historia, mes, medirTexto }) {
  const fuenteNombre = '400 22px Poppins'
  const anchoNombre = Math.max(
    ANCHO_NOMBRE_MINIMO,
    ...[...historia.participantes, ...historia.voluntarios]
      .map((f) => medirTexto(f.persona.nombre, fuenteNombre) + 24),
  )
  const titulo = `Asistencia de ${mesEnPalabras(mes)}`
  // El titulo tambien manda sobre el ancho. Con pocos sabados la tabla es
  // angosta y el titulo se salia por la derecha: fillText no recorta, dibuja
  // fuera del lienzo y ahi se pierde. Visto en el navegador con dos sabados.
  const ancho = Math.max(
    MARGEN * 2 + anchoNombre + historia.fechas.length * ANCHO_COLUMNA + ANCHO_RESUMEN,
    MARGEN * 2 + medirTexto(titulo, FUENTE_TITULO),
  )
  const ordenes = []
  let y = 0

  ordenes.push({ tipo: 'rect', x: 0, y: 0, ancho, alto: ALTO_TITULO, color: COLORES.violeta })
  ordenes.push({ tipo: 'texto', texto: titulo,
    x: MARGEN, y: 58, fuente: FUENTE_TITULO, color: '#FFFFFF' })
  y = ALTO_TITULO + 20

  const columnaX = (i) => MARGEN + anchoNombre + i * ANCHO_COLUMNA
  const resumenX = MARGEN + anchoNombre + historia.fechas.length * ANCHO_COLUMNA

  // El encabezado de columnas lleva solo el numero del dia: el mes ya esta en el
  // titulo, y repetirlo cinco veces obliga a girar el telefono para leerlo.
  historia.fechas.forEach((fecha, i) => {
    ordenes.push({ tipo: 'texto', texto: diaDe(fecha),
      x: columnaX(i) + ANCHO_COLUMNA / 2, y: y + 26,
      fuente: '500 20px Poppins', color: COLORES.textoSuave, alineacion: 'center' })
  })
  if (historia.fechas.length > 0) {
    ordenes.push({ tipo: 'texto', texto: 'Vino', x: resumenX + 8, y: y + 26,
      fuente: '500 20px Poppins', color: COLORES.textoSuave })
  }
  y += ALTO_ENCABEZADO

  const seccion = (titulo, filas, color) => {
    if (filas.length === 0) return
    ordenes.push({ tipo: 'texto', texto: titulo, x: MARGEN, y: y + 32,
      fuente: '500 26px Poppins', color })
    y += ALTO_SECCION

    filas.forEach((fila, indice) => {
      // La banda alterna es lo unico que sostiene la vista a lo largo de cinco
      // columnas: sin ella se salta de fila al leer hacia la derecha.
      if (indice % 2 === 1) {
        ordenes.push({ tipo: 'rect', x: MARGEN - 8, y, ancho: ancho - (MARGEN - 8) * 2,
          alto: ALTO_FILA, color: COLORES.violetaTenue, radio: 8 })
      }
      ordenes.push({ tipo: 'texto', texto: fila.persona.nombre, x: MARGEN, y: y + 27,
        fuente: fuenteNombre, color: COLORES.texto })
      fila.estados.forEach((estado, i) => {
        // La casilla vacia significa "todavia no estaba". Un guion o un cero se
        // leerian como una falta.
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
  }

  seccion('Participantes', historia.participantes, COLORES.violeta)
  seccion('Voluntarios', historia.voluntarios, COLORES.magentaTexto)

  const cuantos = historia.fechas.length
  ordenes.push({ tipo: 'texto',
    texto: cuantos === 0
      ? 'No hay planillas guardadas de este mes'
      : `${cuantos} ${cuantos === 1 ? 'sábado' : 'sábados'} con planilla`,
    x: MARGEN, y: y + 24, fuente: '400 18px Poppins', color: COLORES.textoSuave })
  y += MARGEN + 24

  return { ancho, alto: y, ordenes }
}
