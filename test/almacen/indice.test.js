import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import 'fake-indexeddb/auto'

const FUNCIONES = [
  'borrarFoto', 'guardarFoto', 'guardarLista', 'guardarRoster',
  'leerFoto', 'leerLista', 'leerRoster', 'listarListas',
].sort()

// El selector guarda el modo y la instancia en variables de modulo, asi que
// cada prueba arranca con el modulo recien cargado para no heredar estado.
let indice

beforeEach(async () => {
  indexedDB.deleteDatabase('voluntarios-fsb')
  vi.resetModules()
  indice = await import('../../js/almacen/indice.js')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('modo', () => {
  it('arranca en local, sin configurar nada', () => {
    expect(indice.modoActual()).toBe('local')
  })

  it('configurar lo pasa a github', () => {
    indice.configurar({ modo: 'github', token: 'x' })
    expect(indice.modoActual()).toBe('github')
  })
})

describe('construccion del almacen', () => {
  it('en local expone las ocho funciones', async () => {
    expect(Object.keys(await indice.almacen()).sort()).toEqual(FUNCIONES)
  })

  it('en github expone exactamente las mismas ocho', async () => {
    indice.configurar({ modo: 'github', token: 'x' })
    expect(Object.keys(await indice.almacen()).sort()).toEqual(FUNCIONES)
  })

  // Construir el almacen remoto no pide nada: recien la primera lectura verifica
  // el acceso. Esta prueba es la que distingue de verdad un respaldo del otro,
  // porque el local jamas tocaria la red.
  it('en github la primera lectura va a la API y no a IndexedDB', async () => {
    const visitadas = []
    vi.stubGlobal('fetch', (url) => {
      visitadas.push(String(url))
      return Promise.reject(new Error('red cortada a proposito'))
    })
    indice.configurar({ modo: 'github', token: 'x' })
    const almacen = await indice.almacen()
    expect(visitadas).toHaveLength(0)
    await expect(almacen.leerRoster()).rejects.toThrow(/red cortada/)
    expect(visitadas[0]).toContain('api.github.com')
  })

  it('en local no toca la red en ningun momento', async () => {
    const visitadas = []
    vi.stubGlobal('fetch', (url) => {
      visitadas.push(String(url))
      return Promise.reject(new Error('red cortada a proposito'))
    })
    const almacen = await indice.almacen()
    await almacen.leerRoster()
    expect(visitadas).toEqual([])
  })
})

describe('instancia guardada', () => {
  it('dos llamadas seguidas devuelven la misma instancia', async () => {
    expect(await indice.almacen()).toBe(await indice.almacen())
  })

  it('configurar descarta la instancia, para no seguir hablandole al respaldo viejo', async () => {
    const antes = await indice.almacen()
    indice.configurar({ modo: 'github', token: 'x' })
    expect(await indice.almacen()).not.toBe(antes)
  })

  it('configurar descarta la instancia aunque el modo no cambie', async () => {
    const antes = await indice.almacen()
    indice.configurar({ autor: 'Majo' })
    expect(await indice.almacen()).not.toBe(antes)
  })

  it('reiniciarAlmacen obliga a construir de nuevo', async () => {
    const antes = await indice.almacen()
    indice.reiniciarAlmacen()
    expect(await indice.almacen()).not.toBe(antes)
  })
})
