import { describe, expect, it, vi } from 'vitest'
import { optimizarImagenParaWeb, textoPeso } from '../../js/imagen/optimizar-web.js'

describe('optimización de fotos para la página', () => {
  it('limita el lado mayor a 1920 y conserva la proporción', async () => {
    const bitmap = { width: 3000, height: 2000, close: vi.fn() }
    const lienzo = { getContext: () => ({ drawImage: vi.fn() }), toBlob: (cb) => cb(new Blob(['webp'], { type: 'image/webp' })) }
    const resultado = await optimizarImagenParaWeb({ type: 'image/jpeg', name: 'encuentro.jpg', size: 1_000_000 }, { createImageBitmap: async () => bitmap, crearLienzo: () => lienzo })
    expect(resultado).toMatchObject({ ancho: 1920, alto: 1280, nombre: 'encuentro.webp' })
    expect(resultado.bytesOriginales).toBe(1_000_000)
    expect(resultado.ahorroPorcentaje).toBeGreaterThan(99)
    expect(resultado.calidad).toBeGreaterThanOrEqual(0.68)
    expect(bitmap.close).toHaveBeenCalled()
  })
  it('explica el peso sin lenguaje técnico', () => expect(textoPeso(507328)).toBe('507 KB'))

  it('acepta un objetivo más pequeño y reduce dimensiones cuando bajar calidad no alcanza', async () => {
    const bitmap = { width: 2400, height: 1600, close: vi.fn() }
    let intento = 0
    const crearLienzo = vi.fn((ancho, alto) => ({
      getContext: () => ({ drawImage: vi.fn() }),
      toBlob: (cb) => {
        intento += 1
        const bytes = intento < 7 ? 600_000 : 440_000
        cb(new Blob([new Uint8Array(bytes)], { type: 'image/webp' }))
      },
    }))
    const resultado = await optimizarImagenParaWeb(
      { type: 'image/jpeg', name: 'perfil.jpg' },
      { createImageBitmap: async () => bitmap, crearLienzo },
      { ladoMaximo: 1200, pesoObjetivo: 450_000, calidadMinima: 0.66, intentosMaximos: 12 },
    )
    expect(resultado.blob.size).toBeLessThanOrEqual(450_000)
    expect(resultado.ancho).toBeLessThanOrEqual(1200)
    expect(crearLienzo).toHaveBeenCalled()
    expect(bitmap.close).toHaveBeenCalled()
  })
})
