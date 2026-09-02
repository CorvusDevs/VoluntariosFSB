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
    expect(sesion.claveAcceso).toBeTruthy()
  })

  it('acepta el usuario con mayusculas y espacios', async () => {
    const sesion = await ingresar({ archivo, usuario: ' MAJO ', contrasena: 'ContrasenaDePrueba01' })
    expect(sesion.token).toBe('ghp_token')
  })

  it('falla con la contrasena equivocada', async () => {
    await expect(ingresar({ archivo, usuario: 'majo', contrasena: 'otra' })).rejects.toThrow()
  })

  it('mantiene la contraseña cuando cambia solamente la credencial técnica', async () => {
    const primera = await ingresar({ archivo, usuario: 'majo', contrasena: 'ContrasenaDePrueba01' })
    archivo.credencial = await (await import('../../js/acceso/cripto.js')).cifrar('ghp_token_nuevo', primera.claveAcceso)
    const segunda = await ingresar({ archivo, usuario: 'majo', contrasena: 'ContrasenaDePrueba01' })
    expect(segunda.token).toBe('ghp_token_nuevo')
  })

  it('todavía permite ingresar con un archivo legado v1', async () => {
    const { cifrar } = await import('../../js/acceso/cripto.js')
    const legado = { version: 1, usuarios: [{ usuario: 'ana', nombre: 'Ana', rol: 'coordinacion', ...await cifrar('ghp_legado', 'ContrasenaLegada01') }] }
    const sesion = await ingresar({ archivo: legado, usuario: 'ana', contrasena: 'ContrasenaLegada01' })
    expect(sesion.token).toBe('ghp_legado')
    expect(sesion.claveAcceso).toBeNull()
  })

  it('distingue el usuario inexistente de la contrasena equivocada', async () => {
    // Distinguirlos no filtra nada: usuarios.json es publico y lista a todos.
    // Con el mensaje unico, quien tenia la contrasena buena y el usuario mal
    // escrito la reintentaba sin enterarse nunca de cual era el problema.
    const sinUsuario = await ingresar({ archivo, usuario: 'nadie', contrasena: 'X' })
      .catch((e) => e.message)
    const claveMal = await ingresar({ archivo, usuario: 'majo', contrasena: 'otra' })
      .catch((e) => e.message)
    expect(sinUsuario).toMatch(/usuario/i)
    expect(claveMal).toMatch(/contraseña/i)
    expect(sinUsuario).not.toBe(claveMal)
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

  // Sin el rol, al volver a abrir la aplicacion no se sabe si corresponde
  // ofrecer los ajustes, y una administradora los perderia por recordarse.
  it('recuerda tambien el usuario y el rol', async () => {
    await recordar('ghp_token', 'Majo', { usuario: 'majo', rol: 'admin', claveAcceso: 'llave-compartida' })
    const recordado = await recuperarRecordado()
    expect(recordado.usuario).toBe('majo')
    expect(recordado.rol).toBe('admin')
    expect(recordado.claveAcceso).toBe('llave-compartida')
  })

  it('sin rol guardado asume el permiso mas bajo', async () => {
    await recordar('ghp_token', 'Majo')
    expect((await recuperarRecordado()).rol).toBe('coordinacion')
  })
})
