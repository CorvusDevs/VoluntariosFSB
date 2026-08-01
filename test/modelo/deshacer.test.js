import { describe, it, expect } from 'vitest'
import { crearPila } from '../../js/modelo/deshacer.js'

describe('crearPila', () => {
  it('empieza con el estado inicial y sin poder deshacer', () => {
    const pila = crearPila({ n: 0 })
    expect(pila.actual()).toEqual({ n: 0 })
    expect(pila.sePuedeDeshacer()).toBe(false)
  })

  it('registra un estado nuevo y permite volver', () => {
    const pila = crearPila({ n: 0 })
    pila.registrar({ n: 1 })
    expect(pila.actual()).toEqual({ n: 1 })
    expect(pila.sePuedeDeshacer()).toBe(true)
    expect(pila.deshacer()).toEqual({ n: 0 })
    expect(pila.actual()).toEqual({ n: 0 })
  })

  it('rehacer vuelve adelante', () => {
    const pila = crearPila({ n: 0 })
    pila.registrar({ n: 1 })
    pila.deshacer()
    expect(pila.sePuedeRehacer()).toBe(true)
    expect(pila.rehacer()).toEqual({ n: 1 })
  })

  it('registrar despues de deshacer descarta el futuro', () => {
    const pila = crearPila({ n: 0 })
    pila.registrar({ n: 1 })
    pila.deshacer()
    pila.registrar({ n: 9 })
    expect(pila.sePuedeRehacer()).toBe(false)
    expect(pila.actual()).toEqual({ n: 9 })
  })

  it('deshacer sin historia devuelve el estado actual', () => {
    const pila = crearPila({ n: 0 })
    expect(pila.deshacer()).toEqual({ n: 0 })
  })

  it('recorta la historia al limite dado', () => {
    const pila = crearPila({ n: 0 }, 3)
    for (let i = 1; i <= 10; i += 1) pila.registrar({ n: i })
    let veces = 0
    while (pila.sePuedeDeshacer()) { pila.deshacer(); veces += 1 }
    expect(veces).toBe(3)
  })
})
