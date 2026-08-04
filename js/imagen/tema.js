export const ANCHO = 1080

export const COLORES = {
  violeta: '#662D7D',
  magenta: '#E9287F',
  turquesa: '#5DCCC6',
  magentaTexto: '#C11E6B',
  turquesaTexto: '#0F6E56',
  violetaTenue: '#F3E9F7',
  magentaTenue: '#FBEAF0',
  turquesaTenue: '#E4F7F5',
  violetaClaro: '#D7B9E4',
  texto: '#2C2C2A',
  textoSuave: '#5F5E5A',
  linea: '#EFEBF1',
  fondo: '#FFFFFF',
  blanco: '#FFFFFF',
}

export const FUENTES = {
  titulo: (px) => `500 ${px}px Poppins, sans-serif`,
  normal: (px) => `400 ${px}px Poppins, sans-serif`,
}

const NORMAL = Object.freeze({
  mostrarFotos: true,
  margen: 56,
  logoY: 68,
  logoAncho: 200,
  logoAlto: 75,
  yTituloDesdeAbajo: 156,
  ySubtituloDesdeAbajo: 76,
  altoBandaSuperior: 210,
  altoBandaInferior: 72,
  altoFila: 76,
  avatar: 58,
  factorIniciales: 0.44,
  altoTituloGrupo: 76,
  espacioBajoTitulo: 20,
  espacioEntreGrupos: 44,
  pxNombre: 34,
  pxVoluntario: 32,
  pxTituloGrupo: 28,
  pxParrafo: 28,
  pxBanda: 24,
  pxTitular: 64,
})

const COMPACTO = Object.freeze({
  ...NORMAL,
  mostrarFotos: false,
  margen: 44,
  logoY: 62,
  logoAncho: 128,
  logoAlto: 48,
  yTituloDesdeAbajo: 128,
  ySubtituloDesdeAbajo: 62,
  altoBandaSuperior: 172,
  altoBandaInferior: 56,
  altoFila: 58,
  avatar: 0,
  altoTituloGrupo: 60,
  espacioBajoTitulo: 14,
  espacioEntreGrupos: 28,
  pxNombre: 30,
  pxVoluntario: 28,
  pxTitular: 52,
})

// Formato de dos columnas: dos participantes por fila, con la foto mucho mas
// grande. La celda es la mitad del ancho util menos la separacion entre columnas.
export const COLUMNAS = Object.freeze({
  separacion: 24,
  avatar: 110,
  espacioAvatar: 16,
  altoCelda: 132,
  pxNombre: 32,
  pxVoluntario: 26,
  factorIniciales: 0.4,
})

// Grilla: cinco por fila, foto vertical con esquinas redondeadas y el nombre
// debajo. Vertical porque es la forma de una cara, y de a cinco porque nueve
// chicos en filas de cinco dan dos filas y no tres, que es lo que decide la
// altura de la imagen.
export const GRILLA = Object.freeze({
  porFila: 5,
  separacion: 16,
  proporcionFoto: 4 / 3,   // alto sobre ancho
  radioFoto: 16,
  espacioBajoFoto: 10,
  pxNombre: 32,
  pxVoluntario: 26,
  espacioBajoNombre: 6,
  margenInferior: 12,
  factorIniciales: 0.3,
  filasObjetivo: 2,
  altoLlave: 12,
  grosorLlave: 2,
  aireLlave: 10,
})

// Medidas del formato "Retratos": la foto ocupa toda la celda y los nombres van
// adentro. Los factores son fracciones del ancho de la celda, no pixeles fijos,
// para que la celda pueda cambiar de tamaño sin desarmar la proporcion.
export const RETRATOS = Object.freeze({
  porFila: 5,
  separacion: 16,
  // La misma proporcion que la foto de la grilla, a proposito. Las fotos se
  // guardan cuadradas (400x400), asi que una celda mas alta que esta obliga al
  // recorte a comerse los costados de la cara: a 1.81 sobrevivian 221 px de los
  // 400, contra 300 px con esta. Los nombres se meten adentro de la foto en vez
  // de sumar alto, que es justamente lo que hace corto a este formato.
  proporcionCelda: 4 / 3,  // alto sobre ancho
  radioFoto: 16,
  filasObjetivo: 2,
  margenInferior: 12,
  // Franja del nombre del participante, al pie de la foto.
  factorNombre: 0.145,
  aireFranja: 0.055,
  // Con el medallon abajo, al nombre le queda menos de la mitad del ancho, asi
  // que el piso tiene que dar mas margen o los nombres largos se pasan de la franja.
  pisoNombre: 0.6,         // no se achica mas alla de esta fraccion
  // Medallon del voluntario. Vertical a proposito: a igual ancho da 3 px mas de
  // nombre que el cuadrado, porque la franja no le come la cara.
  factorMedallon: 0.36,
  proporcionMedallon: 1.28,
  insetMedallon: 0.05,
  pasoMedallon: 1.08,
  radioMedallon: 0.20,
  // El marco blanco solo tiene que despegar el medallon de la foto de abajo. A
  // 0.055 se comia el 21% del medallon y la cara del voluntario quedaba con el
  // 55%; a 0.03 el marco baja al 11% y la cara sube al 64%.
  bordeMedallon: 0.03,
  franjaMedallon: 0.28,
  factorNombreMedallon: 0.62,
  factorInicialesMedallon: 0.34,
})

export const ESQUINAS = Object.freeze(['arriba-derecha', 'arriba-izquierda', 'abajo-derecha', 'abajo-izquierda'])
export const ESQUINA_POR_DEFECTO = 'abajo-derecha'

export function esDerecha(esquina) { return esquina === 'arriba-derecha' || esquina === 'abajo-derecha' }
export function esAbajo(esquina) { return esquina === 'abajo-derecha' || esquina === 'abajo-izquierda' }

// Baja el tamaño de letra hasta que el texto entre en el ancho dado. Devuelve el
// tamaño con el que quedo, que puede ser el minimo aunque todavia no entre: quien
// llama decide que hacer en ese caso.
export function ajustarTexto(texto, ancho, px, minimo, fuenteDe, medirTexto) {
  let actual = Math.round(px)
  const piso = Math.max(1, Math.round(minimo))
  while (actual > piso && medirTexto(texto, fuenteDe(actual)) > ancho) actual -= 1
  return actual
}

export function anchoDeCeldaGrilla(margen, columnas = GRILLA.porFila, ancho = ANCHO) {
  const total = ancho - margen * 2 - GRILLA.separacion * (columnas - 1)
  return Math.floor(total / columnas)
}

// Cuantas columnas hacen falta para que el grupo mas numeroso entre en las filas
// que buscamos. Nunca menos que el minimo, para que una lista chica no quede con
// las fotos desparramadas a lo ancho.
export function columnasNecesarias(maxPorGrupo) {
  return Math.max(GRILLA.porFila, Math.ceil(maxPorGrupo / GRILLA.filasObjetivo))
}

// Retratos usa la misma celda y la misma separacion que la grilla, asi que
// ensancha igual. Se expone aparte para que un cambio en uno no arrastre al otro.
export function anchoDeCeldaRetratos(margen, columnas = RETRATOS.porFila, ancho = ANCHO) {
  const total = ancho - margen * 2 - RETRATOS.separacion * (columnas - 1)
  return Math.floor(total / columnas)
}

// Ancho de imagen que hace falta para esa cantidad de columnas, manteniendo la
// celda del mismo tamaño. Asi la foto no se achica: lo que crece es la planilla.
export function anchoParaColumnas(columnas, margen) {
  const celda = anchoDeCeldaGrilla(margen)
  return margen * 2 + columnas * celda + (columnas - 1) * GRILLA.separacion
}

export function anchoDeCelda(margen, ancho = ANCHO) {
  return Math.floor((ancho - margen * 2 - COLUMNAS.separacion) / 2)
}

export function medidas(compacto) {
  return compacto ? COMPACTO : NORMAL
}

function aLineal(canal) {
  const c = canal / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function luminancia(hex) {
  const limpio = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(limpio)) {
    throw new Error(`Color inválido: ${hex}. Se espera #RRGGBB.`)
  }
  const r = parseInt(limpio.slice(0, 2), 16)
  const g = parseInt(limpio.slice(2, 4), 16)
  const b = parseInt(limpio.slice(4, 6), 16)
  return 0.2126 * aLineal(r) + 0.7152 * aLineal(g) + 0.0722 * aLineal(b)
}

export function contraste(colorA, colorB) {
  const a = luminancia(colorA)
  const b = luminancia(colorB)
  const claro = Math.max(a, b)
  const oscuro = Math.min(a, b)
  return (claro + 0.05) / (oscuro + 0.05)
}
