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
  espacioEntreGrupos: 28,
  pxNombre: 30,
  pxVoluntario: 28,
  pxTitular: 52,
})

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
    throw new Error(`Color invalido: ${hex}. Se espera #RRGGBB.`)
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
