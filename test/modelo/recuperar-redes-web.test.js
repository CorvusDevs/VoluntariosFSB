import { describe, expect, it } from 'vitest'
import { recuperarRedesDesdeHistorial } from '../../servidor-cpanel/migraciones.mjs'

describe('recuperación de redes sociales de la página', () => {
  it('recupera una red borrada sin reemplazar enlaces actuales', () => {
    const actual = { organizacion: { redes: [
      { red: 'youtube', etiqueta: 'YouTube', enlace: '', visible: false },
      { red: 'instagram', etiqueta: 'Instagram', enlace: 'https://instagram.com/nuevo', visible: true },
    ] } }
    const historial = [{ organizacion: { redes: [
      { red: 'youtube', etiqueta: 'Canal de YouTube', enlace: 'https://youtube.com/@aletea', visible: true },
      { red: 'instagram', etiqueta: 'Instagram', enlace: 'https://instagram.com/anterior', visible: true },
    ] } }]

    const resultado = recuperarRedesDesdeHistorial(actual, historial)
    expect(resultado.cambios).toBe(1)
    expect(resultado.contenido.organizacion.redes).toEqual([
      { red: 'youtube', etiqueta: 'Canal de YouTube', enlace: 'https://youtube.com/@aletea', visible: true },
      { red: 'instagram', etiqueta: 'Instagram', enlace: 'https://instagram.com/nuevo', visible: true },
    ])
    expect(actual.organizacion.redes[0].enlace).toBe('')
  })

  it('ignora enlaces históricos inseguros o vacíos', () => {
    const actual = { organizacion: { redes: [{ red: 'youtube', etiqueta: 'YouTube', enlace: '', visible: false }] } }
    const historial = [{ organizacion: { redes: [{ red: 'youtube', enlace: 'javascript:alert(1)', visible: true }] } }]
    expect(recuperarRedesDesdeHistorial(actual, historial)).toMatchObject({ cambios: 0, contenido: actual })
  })
})
