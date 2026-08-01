import { describe, it, expect } from 'vitest'
import { COLORES, ANCHO, medidas, contraste } from '../../js/imagen/tema.js'

describe('contraste', () => {
  it('calcula los extremos conocidos', () => {
    expect(contraste('#000000', '#FFFFFF')).toBeCloseTo(21, 1)
    expect(contraste('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 2)
  })

  it('es simetrico', () => {
    expect(contraste('#662D7D', '#FFFFFF')).toBeCloseTo(contraste('#FFFFFF', '#662D7D'), 5)
  })
})

describe('paleta', () => {
  const paresDeTexto = [
    ['texto sobre fondo', COLORES.texto, COLORES.fondo],
    ['texto suave sobre fondo', COLORES.textoSuave, COLORES.fondo],
    ['violeta sobre fondo', COLORES.violeta, COLORES.fondo],
    ['magenta de texto sobre fondo', COLORES.magentaTexto, COLORES.fondo],
    ['turquesa de texto sobre fondo', COLORES.turquesaTexto, COLORES.fondo],
    ['blanco sobre violeta', COLORES.blanco, COLORES.violeta],
    ['turquesa de texto sobre turquesa tenue', COLORES.turquesaTexto, COLORES.turquesaTenue],
    ['magenta de texto sobre magenta tenue', COLORES.magentaTexto, COLORES.magentaTenue],
    ['violeta sobre violeta tenue', COLORES.violeta, COLORES.violetaTenue],
  ]

  paresDeTexto.forEach(([nombre, frente, fondo]) => {
    it(`${nombre} cumple AA`, () => {
      expect(contraste(frente, fondo)).toBeGreaterThanOrEqual(4.5)
    })
  })

  it('conserva los colores oficiales del logotipo sin alterar', () => {
    expect(COLORES.violeta).toBe('#662D7D')
    expect(COLORES.magenta).toBe('#E9287F')
    expect(COLORES.turquesa).toBe('#5DCCC6')
  })
})

describe('medidas', () => {
  it('el ancho de salida es 1080', () => {
    expect(ANCHO).toBe(1080)
  })

  it('el modo compacto tiene filas mas bajas que el normal', () => {
    expect(medidas(true).altoFila).toBeLessThan(medidas(false).altoFila)
  })

  it('el modo compacto no dibuja fotos', () => {
    expect(medidas(true).mostrarFotos).toBe(false)
  })
})
