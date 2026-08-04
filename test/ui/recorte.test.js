import { describe, it, expect } from 'vitest'
import {
  recorteDe, centroDe, mover, reencuadrar, limitar, arrastreEnImagen, ZOOM_MAXIMO,
  girarCentro, espejarCentro, cuartosDeVuelta, tamanoGirado,
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

  it('el recuadro va HACIA donde va el dedo, no al reves', () => {
    // En pantalla la foto se dibuja quieta y lo que se mueve es el recuadro, asi
    // que tiene que seguir al puntero. Restado al reves iba para el lado
    // contrario, que es lo que se sentia al arrastrar.
    expect(arrastreEnImagen({ x: 0, y: 0 }, { x: 10, y: 4 }, 1)).toEqual({ dx: 10, dy: 4 })
    expect(arrastreEnImagen({ x: 10, y: 10 }, { x: 0, y: 0 }, 1)).toEqual({ dx: -10, dy: -10 })
  })

  it('de punta a punta: dedo a la derecha, recuadro a la derecha', () => {
    const estado = { ancho: 2400, alto: 1600, zoom: 2, centroX: 0.5, centroY: 0.5 }
    const escala = 260 / 2400
    const { dx, dy } = arrastreEnImagen({ x: 100, y: 50 }, { x: 150, y: 50 }, escala)
    const despues = recorteDe({ ...estado, ...mover(estado, dx, dy) })
    expect(despues.x).toBeGreaterThan(recorteDe(estado).x)
    expect(despues.y).toBe(recorteDe(estado).y)
  })

  it('pasa el arrastre a pixeles de la imagen, asi el zoom no cambia la sensibilidad', () => {
    // La foto se dibuja achicada en el editor: mover 10 px en pantalla tiene que
    // mover mas de 10 px en una foto grande, o arrastrarla se hace eterno.
    expect(arrastreEnImagen({ x: 0, y: 0 }, { x: 10, y: 0 }, 0.1).dx).toBe(100)
    expect(arrastreEnImagen({ x: 0, y: 0 }, { x: 10, y: 0 }, 0).dx).toBe(0)
  })

  it('limitar aguanta basura sin explotar', () => {
    expect(limitar(5, 0, 10)).toBe(5)
    expect(limitar(-1, 0, 10)).toBe(0)
    expect(limitar(11, 0, 10)).toBe(10)
    expect(limitar(undefined, 0, 10)).toBe(0)
  })
})

describe('girar y espejar', () => {
  it('un cuarto de vuelta lleva el encuadre con la imagen', () => {
    // Volver al centro obligaria a reencuadrar despues de cada giro, que es el
    // trabajo que el editor vino a evitar.
    expect(girarCentro({ centroX: 0.2, centroY: 0.9 })).toEqual({ centroX: 0.09999999999999998, centroY: 0.2 })
    // Cuatro giros devuelven el encuadre a donde estaba.
    let c = { centroX: 0.3, centroY: 0.8 }
    for (let i = 0; i < 4; i += 1) c = girarCentro(c)
    expect(c.centroX).toBeCloseTo(0.3)
    expect(c.centroY).toBeCloseTo(0.8)
  })

  it('espejar da vuelta solo el eje horizontal', () => {
    expect(espejarCentro({ centroX: 0.25, centroY: 0.6 })).toEqual({ centroX: 0.75, centroY: 0.6 })
    const ida = espejarCentro({ centroX: 0.25, centroY: 0.6 })
    expect(espejarCentro(ida)).toEqual({ centroX: 0.25, centroY: 0.6 })
  })

  it('los cuartos de vuelta quedan entre 0 y 3 aunque lleguen raros', () => {
    expect(cuartosDeVuelta(0)).toBe(0)
    expect(cuartosDeVuelta(90)).toBe(1)
    expect(cuartosDeVuelta(360)).toBe(0)
    expect(cuartosDeVuelta(450)).toBe(1)
    expect(cuartosDeVuelta(-90)).toBe(3)
  })

  it('al girar de costado se dan vuelta el ancho y el alto', () => {
    expect(tamanoGirado({ ancho: 800, alto: 600 }, 0)).toEqual({ ancho: 800, alto: 600 })
    expect(tamanoGirado({ ancho: 800, alto: 600 }, 90)).toEqual({ ancho: 600, alto: 800 })
    expect(tamanoGirado({ ancho: 800, alto: 600 }, 180)).toEqual({ ancho: 800, alto: 600 })
    expect(tamanoGirado({ ancho: 800, alto: 600 }, 270)).toEqual({ ancho: 600, alto: 800 })
  })
})
