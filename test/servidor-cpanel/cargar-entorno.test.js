import { describe, expect, it, vi } from 'vitest'
import { cargarEntornoPrivadoSiFalta, interpretarEntorno } from '../../servidor-cpanel/cargar-entorno.mjs'

describe('entorno privado de respaldo para cPanel', () => {
  it('interpreta variables sin evaluar codigo ni comentarios', () => {
    expect(interpretarEntorno(`
      # configuracion privada
      DB_HOST=localhost
      DB_NAME="gestor"
      nombre_invalido=no
      SESSION_SECRET='secreto seguro'
    `)).toEqual({ DB_HOST: 'localhost', DB_NAME: 'gestor', SESSION_SECRET: 'secreto seguro' })
  })

  it('prefiere las variables que Passenger ya entrego', () => {
    const entorno = { DB_HOST: 'h', DB_NAME: 'n', DB_USER: 'u', DB_PASSWORD: 'p' }
    const leer = vi.fn()
    expect(cargarEntornoPrivadoSiFalta({ entorno, leer })).toEqual({ origen: 'entorno', cargadas: [] })
    expect(leer).not.toHaveBeenCalled()
  })

  it('completa solo variables ausentes desde el archivo privado', () => {
    const entorno = { DB_HOST: 'oficial' }
    const leer = vi.fn().mockReturnValue('DB_HOST=respaldo\nDB_NAME=gestor\nDB_USER=usuario\nDB_PASSWORD=clave\n')
    const resultado = cargarEntornoPrivadoSiFalta({ entorno, ruta: '/privado', leer })
    expect(entorno).toEqual({ DB_HOST: 'oficial', DB_NAME: 'gestor', DB_USER: 'usuario', DB_PASSWORD: 'clave' })
    expect(resultado).toEqual({ origen: 'archivo-privado', cargadas: ['DB_NAME', 'DB_USER', 'DB_PASSWORD'] })
  })
})
