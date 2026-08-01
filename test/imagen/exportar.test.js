import { describe, it, expect } from 'vitest'
import { nombreDeArchivo, medidorDesde } from '../../js/imagen/exportar.js'
import { maquetar } from '../../js/imagen/maquetar.js'
import { ROSTER, LISTA, SALUDO, DESPEDIDA } from '../ayudas/datos.js'

describe('nombreDeArchivo', () => {
  it('usa la fecha de la lista', () => {
    expect(nombreDeArchivo({ fecha: '2026-08-08' })).toBe('futbol-sin-barreras-2026-08-08.png')
  })

  it('agrega el sufijo del grupo cuando se exporta por separado', () => {
    expect(nombreDeArchivo({ fecha: '2026-08-08' }, 2)).toBe('futbol-sin-barreras-2026-08-08-grupo-2.png')
  })
})

describe('medidorDesde', () => {
  it('devuelve una funcion que mide con el contexto dado', () => {
    const ctx = { measureText: (t) => ({ width: t.length * 7 }) }
    const medir = medidorDesde(ctx)
    expect(medir('abcd', '20px Poppins')).toBe(28)
  })

  it('fija la fuente en el contexto antes de medir', () => {
    const fuentes = []
    const ctx = {
      set font(v) { fuentes.push(v) },
      measureText: () => ({ width: 1 }),
    }
    medidorDesde(ctx)('x', '30px Poppins')
    expect(fuentes).toContain('30px Poppins')
  })

  it('el medidor real alimenta la maquetacion sin romperla', () => {
    const ctx = { font: '', measureText: (t) => ({ width: t.length * 12 }) }
    const plano = maquetar(LISTA, ROSTER, {
      saludo: SALUDO, despedida: DESPEDIDA, medirTexto: medidorDesde(ctx),
    })
    expect(plano.alto).toBeGreaterThan(0)
    expect(plano.ordenes.length).toBeGreaterThan(0)
  })
})
