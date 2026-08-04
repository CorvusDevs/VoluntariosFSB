import { describe, it, expect } from 'vitest'
import {
  recorteDe, centroDe, mover, reencuadrar, limitar, ZOOM_MAXIMO,
} from '../../js/ui/recorte.js'

describe('recorte de la foto', () => {
  it('sin zoom toma el cuadrado mas grande que entra, centrado', () => {
    expect(recorteDe({ ancho: 800, alto: 600 })).toEqual({ x: 100, y: 0, lado: 600 })
    expect(recorteDe({ ancho: 600, alto: 900 })).toEqual({ x: 0, y: 150, lado: 600 })
  })

  it('el zoom achica el lado del recuadro', () => {
    expect(recorteDe({ ancho: 800, alto: 600, zoom: 2 }).lado).toBe(300)
    expect(recorteDe({ ancho: 800, alto: 600, zoom: 3 }).lado).toBe(200)
  })

  it('nunca se sale de la imagen, por mas que se lo empuje', () => {
    // Bordes negros en la planilla, y no se notan hasta el sabado.
    const casos = [
      { centroX: 0, centroY: 0 }, { centroX: 1, centroY: 1 },
      { centroX: -5, centroY: 9 }, { centroX: 0.5, centroY: 0 },
    ]
    casos.forEach((centro) => {
      const r = recorteDe({ ancho: 800, alto: 600, zoom: 2, ...centro })
      expect(r.x).toBeGreaterThanOrEqual(0)
      expect(r.y).toBeGreaterThanOrEqual(0)
      expect(r.x + r.lado).toBeLessThanOrEqual(800)
      expect(r.y + r.lado).toBeLessThanOrEqual(600)
    })
  })

  it('acota el zoom a lo que la imagen aguanta', () => {
    expect(recorteDe({ ancho: 400, alto: 400, zoom: 99 }).lado).toBe(400 / ZOOM_MAXIMO)
    expect(recorteDe({ ancho: 400, alto: 400, zoom: 0.1 }).lado).toBe(400)
    expect(recorteDe({ ancho: 400, alto: 400, zoom: NaN }).lado).toBe(400)
  })

  it('ir al centro y volver no corre la foto', () => {
    // Sin esto, arrastrar de a poco iba acumulando error y la foto se escapaba.
    const estado = { ancho: 800, alto: 600, zoom: 2, centroX: 0.4, centroY: 0.55 }
    const r = recorteDe(estado)
    const vuelta = centroDe(r, 800, 600)
    expect(recorteDe({ ...estado, ...vuelta })).toEqual(r)
  })

  it('arrastrar mueve el recuadro y se frena contra el borde', () => {
    const estado = { ancho: 800, alto: 600, zoom: 2, centroX: 0.5, centroY: 0.5 }
    const centrado = recorteDe(estado)
    const corrido = recorteDe({ ...estado, ...mover(estado, 50, 0) })
    expect(corrido.x).toBe(centrado.x + 50)
    const contraElBorde = recorteDe({ ...estado, ...mover(estado, 99999, 0) })
    expect(contraElBorde.x).toBe(800 - centrado.lado)
  })

  it('al alejar reacomoda el recuadro en vez de dejarlo colgando', () => {
    const pegado = { ancho: 800, alto: 600, zoom: 4, centroX: 0.99, centroY: 0.99 }
    const alejado = { ...pegado, zoom: 1 }
    const centro = reencuadrar(alejado)
    const r = recorteDe({ ...alejado, ...centro })
    expect(r.x + r.lado).toBeLessThanOrEqual(800)
    expect(r.y + r.lado).toBeLessThanOrEqual(600)
  })

  it('limitar aguanta basura sin explotar', () => {
    expect(limitar(5, 0, 10)).toBe(5)
    expect(limitar(-1, 0, 10)).toBe(0)
    expect(limitar(11, 0, 10)).toBe(10)
    expect(limitar(undefined, 0, 10)).toBe(0)
  })
})
