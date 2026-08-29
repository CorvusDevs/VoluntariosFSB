import { describe, expect, it } from 'vitest'
import {
  ALTO_WHATSAPP,
  ANCHO_WHATSAPP,
  MARGEN_WHATSAPP,
  calcularComposicionWhatsApp,
} from '../../js/imagen/whatsapp.js'

describe('composición para WhatsApp', () => {
  it('produce una imagen horizontal 16:10 con cabecera y pie compartidos', () => {
    const composicion = calcularComposicionWhatsApp([
      { ancho: 1080, alto: 920, recorteY: 210, altoCuerpo: 638 },
      { ancho: 1080, alto: 980, recorteY: 210, altoCuerpo: 698 },
    ])
    expect(composicion.ancho).toBe(1920)
    expect(composicion.alto).toBe(1200)
    expect(composicion.ancho / composicion.alto).toBeCloseTo(16 / 10, 2)
    expect(composicion.paneles).toHaveLength(2)
    composicion.paneles.forEach((panel) => {
      expect(panel.x).toBeGreaterThanOrEqual(MARGEN_WHATSAPP)
      expect(panel.y).toBeGreaterThanOrEqual(MARGEN_WHATSAPP)
      expect(panel.x + panel.ancho).toBeLessThanOrEqual(ANCHO_WHATSAPP - MARGEN_WHATSAPP)
      expect(panel.y + panel.alto).toBeLessThanOrEqual(ALTO_WHATSAPP - MARGEN_WHATSAPP)
      expect(panel.y).toBeGreaterThan(MARGEN_WHATSAPP + 156)
      expect(panel.recorteY).toBe(210)
    })
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
