import { describe, expect, it } from 'vitest'
import {
  ALTO_WHATSAPP,
  ANCHO_WHATSAPP,
  MARGEN_WHATSAPP,
  calcularComposicionWhatsApp,
  columnasParaHorizontal,
} from '../../js/imagen/whatsapp.js'

describe('composición para WhatsApp', () => {
  it('produce una imagen horizontal amplia con cabecera y pie compartidos', () => {
    const composicion = calcularComposicionWhatsApp([
      { ancho: 1080, alto: 920, recorteY: 210, altoCuerpo: 638 },
      { ancho: 1080, alto: 980, recorteY: 210, altoCuerpo: 698 },
    ])
    expect(composicion.ancho).toBe(1920)
    expect(composicion.alto).toBe(1240)
    expect(composicion.ancho / composicion.alto).toBeCloseTo(1.55, 2)
    expect(composicion.paneles).toHaveLength(2)
    composicion.paneles.forEach((panel) => {
      expect(panel.x).toBeGreaterThanOrEqual(MARGEN_WHATSAPP)
      expect(panel.y).toBeGreaterThanOrEqual(MARGEN_WHATSAPP)
      expect(panel.x + panel.ancho).toBeLessThanOrEqual(ANCHO_WHATSAPP - MARGEN_WHATSAPP)
      expect(panel.y + panel.alto).toBeLessThanOrEqual(ALTO_WHATSAPP - MARGEN_WHATSAPP)
      expect(panel.y).toBeGreaterThan(MARGEN_WHATSAPP + 132)
      expect(panel.recorteY).toBe(210)
    })
  })

  it('reparte el ancho según las personas y conserva una escala compartida', () => {
    const composicion = calcularComposicionWhatsApp([
      { ancho: 700, alto: 900, peso: 9 },
      { ancho: 1100, alto: 900, peso: 14 },
    ])
    expect(composicion.paneles[1].anchoAsignado).toBeGreaterThan(composicion.paneles[0].anchoAsignado)
    expect(composicion.paneles[0].escala).toBe(composicion.paneles[1].escala)
    expect(composicion.paneles[0].x + composicion.paneles[0].ancho)
      .toBeLessThan(composicion.paneles[1].x)
  })

  it('adapta las columnas a la cantidad de participantes', () => {
    expect(columnasParaHorizontal(9)).toBe(3)
    expect(columnasParaHorizontal(14)).toBe(5)
    expect(columnasParaHorizontal(18)).toBe(6)
  })

  it('marca como poco legible una lista excepcionalmente alta', () => {
    const composicion = calcularComposicionWhatsApp([
      { ancho: 1080, alto: 2400 },
      { ancho: 1080, alto: 2300 },
    ])
    expect(composicion.legible).toBe(false)
  })

  it('rechaza una composición sin grupos', () => {
    expect(() => calcularComposicionWhatsApp([])).toThrow(/al menos un grupo/)
  })
})
