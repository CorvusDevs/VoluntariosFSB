import { describe, expect, it, vi } from 'vitest'
import {
  advertenciasComunicacion, crearDisenoComunicacion, datosComunicacionActivos, normalizarDisenoComunicacion,
  pintarComunicacionVisual, svgDesdeLienzo, textoPublicacionComunicacion,
} from '../../js/imagen/comunicacion-visual.js'

function contexto() {
  const canvas = { width: 0, height: 0, toDataURL: () => 'data:image/png;base64,AAA' }
  const fuentes = []
  const rellenos = []
  const ctx = {
    fuentes, rellenos,
    set font(valor) { this._font = valor; fuentes.push(valor) },
    get font() { return this._font },
    set fillStyle(valor) { this._fillStyle = valor },
    get fillStyle() { return this._fillStyle },
    canvas, setTransform: vi.fn(), fillRect: vi.fn(function (...rectangulo) { rellenos.push({ color: this.fillStyle, rectangulo }) }), fillText: vi.fn(), drawImage: vi.fn(),
    beginPath: vi.fn(), roundRect: vi.fn(), fill: vi.fn(), stroke: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(),
    save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), rotate: vi.fn(),
    measureText: (texto) => ({ width: String(texto).length * 17 }),
  }
  return ctx
}

describe('motor de Comunicación visual', () => {
  it('crea una pieza institucional segura y limita ajustes extremos', () => {
    const pieza = normalizarDisenoComunicacion({ diseno: { formato: 'inventado', paleta: 'inventada', fuente: 'inventada', escalaTitulo: 9, giroEtiqueta: -80 } })
    expect(pieza.diseno.formato).toBe('vertical')
    expect(pieza.diseno.paleta).toBe('institucional')
    expect(pieza.diseno.fuente).toBe('leagueGothic')
    expect(pieza.diseno.escalaTitulo).toBe(2)
    expect(pieza.diseno.giroEtiqueta).toBe(-20)
  })

  it('crea un carrusel editable y un texto sugerido para publicarlo', () => {
    const pieza = crearDisenoComunicacion('carrusel')
    expect(pieza.diapositivas).toHaveLength(3)
    expect(datosComunicacionActivos(pieza).titulo).toContain('APOYOS')
    expect(textoPublicacionComunicacion(pieza)).toContain('@aleteauy')
    expect(advertenciasComunicacion(pieza)).toEqual([])
  })

  it('crea una carta A4 con campos institucionales y tipografía de lectura', () => {
    const carta = crearDisenoComunicacion('carta')
    expect(carta.diseno.formato).toBe('a4')
    expect(carta.diseno.fuente).toBe('poppins')
    expect(carta.datos.lugarFecha).toMatch(/^Montevideo, /)
    expect(textoPublicacionComunicacion(carta)).toContain('De nuestra mayor consideración:')
    expect(advertenciasComunicacion(carta)).toEqual([])
  })

  it('pinta una carta A4 y expone sus zonas editables', () => {
    const ctx = contexto()
    const resultado = pintarComunicacionVisual(ctx, crearDisenoComunicacion('carta'))
    expect(ctx.canvas.width).toBe(1240)
    expect(ctx.canvas.height).toBe(1754)
    expect(resultado.zonas.map((zona) => zona.campo)).toEqual(expect.arrayContaining(['lugarFecha', 'descripcion', 'firmante', 'correo']))
    expect(ctx.fillText).toHaveBeenCalledWith('Claudia Cravea', 785, expect.any(Number))
  })

  it.each(['institucional', 'turquesa', 'magenta'])('mantiene blanca la hoja de carta con la paleta %s', (paleta) => {
    const ctx = contexto()
    const carta = crearDisenoComunicacion('carta')
    carta.diseno.paleta = paleta
    pintarComunicacionVisual(ctx, carta)
    expect(ctx.rellenos[0]).toEqual({ color: '#FFFFFF', rectangulo: [0, 0, 1240, 1754] })
  })

  it('mantiene el formato A4 y Poppins aunque un borrador de carta pida otro estilo', () => {
    const carta = normalizarDisenoComunicacion({ plantilla: 'carta', diseno: { formato: 'historia', fuente: 'leagueGothic', escalaTexto: 9 } })
    expect(carta.diseno.formato).toBe('a4')
    expect(carta.diseno.fuente).toBe('poppins')
    expect(carta.diseno.escalaTexto).toBe(1.3)
  })

  it('combina League Gothic en titulares con Poppins en textos de lectura', () => {
    const ctx = contexto()
    pintarComunicacionVisual(ctx, { ...crearDisenoComunicacion('campana'), diseno: { ...crearDisenoComunicacion('campana').diseno, fuente: 'leagueGothic' } })
    expect(ctx.fuentes.some((fuente) => fuente.includes('League Gothic'))).toBe(true)
    expect(ctx.fuentes.some((fuente) => fuente.includes('Poppins'))).toBe(true)
  })

  it('pinta el tamaño final y devuelve zonas editables de la composición', () => {
    const ctx = contexto()
    const resultado = pintarComunicacionVisual(ctx, crearDisenoComunicacion('apoyo'))
    expect(ctx.canvas.width).toBe(1080)
    expect(ctx.canvas.height).toBe(1350)
    expect(resultado.zonas.map((zona) => zona.campo)).toContain('titulo')
    expect(ctx.fillText).toHaveBeenCalledWith('GRUPOS DE APOYO', 0, 0)
  })

  it('permite duplicar el tamaño de un título breve sin invadir otras zonas', () => {
    const ctx = contexto()
    const pieza = crearDisenoComunicacion('apoyo')
    pieza.datos.titulo = 'APOYO'
    pieza.diseno.escalaTitulo = 2
    pintarComunicacionVisual(ctx, pieza)
    expect(ctx.fuentes.some((fuente) => fuente.includes("226px 'League Gothic'"))).toBe(true)
  })

  it('conserva las proporciones del logo oficial en todas las composiciones', () => {
    const logo = { naturalWidth: 2048, naturalHeight: 764 }
    ;['apoyo', 'carrusel', 'mensaje'].forEach((plantilla) => {
      const ctx = contexto()
      pintarComunicacionVisual(ctx, crearDisenoComunicacion(plantilla), logo)
      const llamadaLogo = ctx.drawImage.mock.calls.find(([imagen]) => imagen === logo)
      expect(llamadaLogo).toBeTruthy()
      const [, , , ancho, alto] = llamadaLogo
      expect(ancho / alto).toBeCloseTo(2048 / 764, 5)
    })
  })

  it('genera un SVG descargable con la imagen en su tamaño real', () => {
    const ctx = contexto()
    pintarComunicacionVisual(ctx, crearDisenoComunicacion())
    const svg = svgDesdeLienzo(ctx.canvas)
    expect(svg).toContain('width="1080"')
    expect(svg).toContain('data:image/png;base64,AAA')
  })
})
