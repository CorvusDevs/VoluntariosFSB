import { describe, expect, it } from 'vitest'
import {
  ALTO_WHATSAPP,
  ANCHO_WHATSAPP,
  MARGEN_WHATSAPP,
  calcularComposicionWhatsApp,
} from '../../js/imagen/whatsapp.js'

describe('composición para WhatsApp', () => {
  it('produce una imagen horizontal 16:9 con ambos grupos completos', () => {
    const composicion = calcularComposicionWhatsApp([
      { ancho: 1080, alto: 920 },
      { ancho: 1080, alto: 980 },
    ])
    expect(composicion.ancho).toBe(1920)
    expect(composicion.alto).toBe(1080)
    expect(composicion.ancho / composicion.alto).toBeCloseTo(16 / 9, 2)
    expect(composicion.paneles).toHaveLength(2)
    composicion.paneles.forEach((panel) => {
      expect(panel.x).toBeGreaterThanOrEqual(MARGEN_WHATSAPP)
      expect(panel.y).toBeGreaterThanOrEqual(MARGEN_WHATSAPP)
      expect(panel.x + panel.ancho).toBeLessThanOrEqual(ANCHO_WHATSAPP - MARGEN_WHATSAPP)
      expect(panel.y + panel.alto).toBeLessThanOrEqual(ALTO_WHATSAPP - MARGEN_WHATSAPP)
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
