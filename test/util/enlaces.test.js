import { describe, expect, it } from 'vitest'
import { MENSAJE_ENLACE_INVALIDO, normalizarCampoEnlace, normalizarEnlaceUsuario } from '../../js/util/enlaces.js'

describe('enlaces escritos por personas', () => {
  it('completa https en dominios simples y conserva rutas y parámetros', () => {
    expect(normalizarEnlaceUsuario('prueba.aletea.org')).toBe('https://prueba.aletea.org/')
    expect(normalizarEnlaceUsuario('canva.com/diseno?id=3')).toBe('https://canva.com/diseno?id=3')
    expect(normalizarEnlaceUsuario('Documento: drive.google.com/file/d/abc/view.')).toBe('https://drive.google.com/file/d/abc/view')
    expect(normalizarEnlaceUsuario('https://docs.google.com/spreadsheets/d/1euOvZjE1Sd4CgNvmZckarDWPWmadLRKfrrf30b--gOs?usp=drive_fs')).toBe('https://docs.google.com/spreadsheets/d/1euOvZjE1Sd4CgNvmZckarDWPWmadLRKfrrf30b--gOs?usp=drive_fs')
  })

  it('conserva enlaces explícitos y permite rutas internas solo cuando corresponde', () => {
    expect(normalizarEnlaceUsuario('http://ejemplo.org/recurso')).toBe('http://ejemplo.org/recurso')
    expect(normalizarEnlaceUsuario('/contacto/', { permitirRutaInterna: true })).toBe('/contacto/')
    expect(normalizarEnlaceUsuario('mailto:info@aletea.org', { permitirContacto: true })).toBe('mailto:info@aletea.org')
  })

  it('rechaza protocolos peligrosos y deja un mensaje que explica cómo corregir', () => {
    expect(normalizarEnlaceUsuario('javascript:alert(1)')).toBe('')
    const entrada = {
      value: 'javascript:alert(1)', mensaje: '', atributos: {},
      setCustomValidity(mensaje) { this.mensaje = mensaje },
      setAttribute(nombre, valor) { this.atributos[nombre] = valor },
      removeAttribute(nombre) { delete this.atributos[nombre] },
    }
    expect(normalizarCampoEnlace(entrada)).toBe('')
    expect(entrada.mensaje).toBe(MENSAJE_ENLACE_INVALIDO)
    expect(entrada.atributos['aria-invalid']).toBe('true')
  })
})
