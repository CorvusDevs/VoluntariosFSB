import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { ingresar, recordar, recuperarRecordado, olvidar } from '../../js/acceso/sesion.js'
import { archivoConUsuario, leerCrudoDeIndexedDB } from './ayuda-sesion.js'

let archivo

beforeEach(async () => {
  indexedDB.deleteDatabase('voluntarios-fsb-sesion')
  archivo = await archivoConUsuario('majo', 'Majo', 'ContrasenaDePrueba01', 'ghp_token')
})

describe('ingresar', () => {
  it('devuelve el token y el nombre con la contrasena correcta', async () => {
    const sesion = await ingresar({ archivo, usuario: 'majo', contrasena: 'ContrasenaDePrueba01' })
    expect(sesion.token).toBe('ghp_token')
    expect(sesion.nombre).toBe('Majo')
  })

  it('acepta el usuario con mayusculas y espacios', async () => {
    const sesion = await ingresar({ archivo, usuario: ' MAJO ', contrasena: 'ContrasenaDePrueba01' })
    expect(sesion.token).toBe('ghp_token')
  })

  it('falla con la contrasena equivocada', async () => {
    await expect(ingresar({ archivo, usuario: 'majo', contrasena: 'otra' })).rejects.toThrow()
  })

  it('da el mismo mensaje si el usuario no existe que si la contrasena esta mal', async () => {
    const a = await ingresar({ archivo, usuario: 'majo', contrasena: 'mal' }).catch((e) => e.message)
    const b = await ingresar({ archivo, usuario: 'nadie', contrasena: 'mal' }).catch((e) => e.message)
    expect(a).toBe(b)
  })
})

describe('recordar y recuperar', () => {
  it('recupera el token guardado', async () => {
    await recordar('ghp_token', 'Majo')
    const recordado = await recuperarRecordado()
    expect(recordado.token).toBe('ghp_token')
    expect(recordado.nombre).toBe('Majo')
  })

  it('devuelve null si no hay nada guardado', async () => {
    expect(await recuperarRecordado()).toBeNull()
  })

  it('olvidar borra el token', async () => {
    await recordar('ghp_token', 'Majo')
    await olvidar()
    expect(await recuperarRecordado()).toBeNull()
  })

  it('guarda el token cifrado, no en claro', async () => {
    await recordar('ghp_token_secreto', 'Majo')
    const crudo = await leerCrudoDeIndexedDB()
    expect(JSON.stringify(crudo)).not.toContain('ghp_token_secreto')
  })

  it('la clave del dispositivo no se puede exportar', async () => {
    await recordar('ghp_token', 'Majo')
    const crudo = await leerCrudoDeIndexedDB()
    expect(crudo.clave.extractable).toBe(false)
    await expect(crypto.subtle.exportKey('raw', crudo.clave)).rejects.toThrow()
  })
})
