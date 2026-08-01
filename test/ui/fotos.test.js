import { describe, it, expect } from 'vitest'
import { calcularRecorteCuadrado, LADO_FOTO } from '../../js/ui/fotos.js'

describe('calcularRecorteCuadrado', () => {
  it('recorta al centro una imagen apaisada', () => {
    const r = calcularRecorteCuadrado(1000, 500)
    expect(r.lado).toBe(500)
    expect(r.x).toBe(250)
    expect(r.y).toBe(0)
  })

  it('recorta al centro una imagen vertical', () => {
    const r = calcularRecorteCuadrado(500, 1000)
    expect(r.lado).toBe(500)
    expect(r.x).toBe(0)
    expect(r.y).toBe(250)
  })

  it('deja intacta una imagen ya cuadrada', () => {
    expect(calcularRecorteCuadrado(600, 600)).toEqual({ x: 0, y: 0, lado: 600 })
  })

  it('el lado de salida es 400 como fija la especificacion', () => {
    expect(LADO_FOTO).toBe(400)
  })
})
