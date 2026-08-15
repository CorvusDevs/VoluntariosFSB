import { describe, expect, it } from 'vitest'
import {
  guardarUltimaPantalla, leerUltimaPantalla, olvidarUltimaPantalla, pantallaPermitida,
} from '../../js/ui/ultima-pantalla.js'

function crearAlmacen() {
  const datos = new Map()
  return {
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => datos.set(clave, valor),
    removeItem: (clave) => datos.delete(clave),
  }
}

describe('ultima pantalla', () => {
  it('vuelve a lista si todavia no hay una pantalla guardada', () => {
    expect(leerUltimaPantalla(crearAlmacen())).toBe('lista')
  })

  it('recuerda una seccion valida durante la sesion del navegador', () => {
    const almacen = crearAlmacen()
    guardarUltimaPantalla('personas', almacen)
    expect(leerUltimaPantalla(almacen)).toBe('personas')
    olvidarUltimaPantalla(almacen)
    expect(leerUltimaPantalla(almacen)).toBe('lista')
  })

  it('no deja restaurar secciones administrativas sin autorizacion', () => {
    expect(pantallaPermitida('ajustes')).toBe(false)
    expect(pantallaPermitida('registro', { admin: true, cloudflare: true })).toBe(false)
    expect(pantallaPermitida('ajustes', { admin: true })).toBe(true)
  })

  it('ignora un valor corrupto o un almacenamiento no disponible', () => {
    const falla = { getItem: () => { throw new Error('sin acceso') } }
    expect(leerUltimaPantalla(falla)).toBe('lista')
  })
})
