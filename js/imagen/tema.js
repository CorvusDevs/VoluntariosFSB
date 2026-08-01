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
})

export function anchoDeCeldaGrilla(margen) {
  const total = ANCHO - margen * 2 - GRILLA.separacion * (GRILLA.porFila - 1)
  return Math.floor(total / GRILLA.porFila)
}

export function anchoDeCelda(margen) {
  return Math.floor((ANCHO - margen * 2 - COLUMNAS.separacion) / 2)
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
