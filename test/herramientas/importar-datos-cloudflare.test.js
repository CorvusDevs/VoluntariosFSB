import { describe, expect, it } from 'vitest'
import { claveFoto, rutaDocumentoValida } from '../../herramientas/importar-datos-cloudflare.mjs'

describe('importador Cloudflare', () => {
  it('solo reconoce documentos operativos que la API puede servir', () => {
    expect(rutaDocumentoValida('roster.json')).toBe(true)
    expect(rutaDocumentoValida('listas/2026-08-15.json')).toBe(true)
    expect(rutaDocumentoValida('usuarios.json')).toBe(false)
    expect(rutaDocumentoValida('../secreto.json')).toBe(false)
  })

  it('solo reconoce fotos con una clave segura', () => {
    expect(claveFoto('fotos/p_01.jpg')).toBe('p_01.jpg')
    expect(claveFoto('fotos/../token.txt')).toBeNull()
    expect(claveFoto('otra-carpeta/p_01.jpg')).toBeNull()
  })
})
