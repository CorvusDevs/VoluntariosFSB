import { beforeEach, describe, expect, it } from 'vitest'
import { crearPantallaCambios } from '../../js/ui/pantalla-cambios.js'
import { CLAVE_NOVEDADES_VISTAS, compararVersiones, marcarNovedadesVistas, novedadesPendientes, VERSION_NOVEDADES } from '../../js/ui/novedades.js'

describe('cambios del sistema', () => {
  beforeEach(() => { document.body.innerHTML = '<div id="raiz"></div>' })

  it('muestra el historial de versiones, sus tres clases de cambios y su autor', () => {
    const raiz = document.getElementById('raiz')
    crearPantallaCambios(raiz)
    expect(raiz.textContent).toContain('Versión 1.2.0')
    expect(raiz.textContent).toContain('Versión 1.1.0')
    expect(raiz.textContent).toContain('Versión 0.3.0')
    expect(raiz.textContent).toContain('Actualizaciones')
    expect(raiz.textContent).toContain('Adiciones')
    expect(raiz.textContent).toContain('Arreglos')
    expect(raiz.textContent).toContain('Alejandro Estol')
  })

  it('usa fechas y commits reales, y no inventa uno para la version en preparacion', () => {
    const raiz = document.getElementById('raiz')
    crearPantallaCambios(raiz)
    expect(raiz.textContent).toContain('16 de agosto de 2026 · Commit 4b701d4')
    expect(raiz.textContent).toContain('En preparación, pendiente de commit')
  })

  it('muestra las novedades pendientes y las marca al confirmar', () => {
    const datos = new Map([[CLAVE_NOVEDADES_VISTAS, '1.0.0']])
    const almacen = { getItem: (clave) => datos.get(clave) ?? null, setItem: (clave, valor) => datos.set(clave, valor) }
    const pendientes = novedadesPendientes(almacen)
    expect(pendientes.map((entrada) => entrada.version)).toEqual(['1.2.0', '1.1.0'])
    const raiz = document.getElementById('raiz')
    crearPantallaCambios(raiz, { novedades: pendientes })
    expect(raiz.textContent).toContain('Estas son las mejoras')
    marcarNovedadesVistas(almacen)
    expect(datos.get(CLAVE_NOVEDADES_VISTAS)).toBe(VERSION_NOVEDADES)
    expect(novedadesPendientes(almacen)).toEqual([])
  })

  it('recuerda el aviso al pulsar Entendido', () => {
    const datos = new Map()
    const almacen = { getItem: (clave) => datos.get(clave) ?? null, setItem: (clave, valor) => datos.set(clave, valor) }
    const raiz = document.getElementById('raiz')
    crearPantallaCambios(raiz, { novedades: novedadesPendientes(almacen), almacenNovedades: almacen })
    raiz.querySelector('.novedades-version button').click()
    expect(datos.get(CLAVE_NOVEDADES_VISTAS)).toBe(VERSION_NOVEDADES)
    expect(raiz.querySelector('.novedades-version')).toBeNull()
  })

  it('muestra solo la version actual en la primera visita', () => {
    const almacen = { getItem: () => null, setItem: () => {} }
    expect(novedadesPendientes(almacen).map((entrada) => entrada.version)).toEqual([VERSION_NOVEDADES])
  })

  it('compara versiones numéricas por componentes', () => {
    expect(compararVersiones('1.10.0', '1.9.0')).toBe(1)
    expect(compararVersiones('1.0', '1.0.0')).toBe(0)
  })
})
