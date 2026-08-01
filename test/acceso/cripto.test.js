import { describe, it, expect } from 'vitest'
import { cifrar, descifrar, generarContrasena, ITERACIONES } from '../../js/acceso/cripto.js'

describe('generarContrasena', () => {
  it('devuelve 16 caracteres por defecto', () => {
    expect(generarContrasena()).toHaveLength(16)
  })

  it('respeta la longitud pedida', () => {
    expect(generarContrasena(24)).toHaveLength(24)
  })

  it('no repite entre llamadas', () => {
    const muestras = new Set(Array.from({ length: 200 }, () => generarContrasena()))
    expect(muestras.size).toBe(200)
  })

  it('evita caracteres que se confunden al dictarlos', () => {
    const juntas = Array.from({ length: 200 }, () => generarContrasena()).join('')
    expect(juntas).not.toMatch(/[0OIl1]/)
  })

  it('usa mas de un tipo de caracter', () => {
    const muestra = Array.from({ length: 50 }, () => generarContrasena()).join('')
    expect(muestra).toMatch(/[a-z]/)
    expect(muestra).toMatch(/[A-Z]/)
    expect(muestra).toMatch(/[2-9]/)
  })
})

describe('cifrar y descifrar', () => {
  it('recupera el texto original', async () => {
    const registro = await cifrar('ghp_tokenDePrueba', 'ContrasenaLarga123')
    expect(await descifrar(registro, 'ContrasenaLarga123')).toBe('ghp_tokenDePrueba')
  })

  it('falla con la contrasena equivocada', async () => {
    const registro = await cifrar('secreto', 'correcta')
    await expect(descifrar(registro, 'incorrecta')).rejects.toThrow()
  })

  it('conserva acentos y eñes', async () => {
    const registro = await cifrar('Julián Begoña ñ á é í ó ú', 'clave')
    expect(await descifrar(registro, 'clave')).toBe('Julián Begoña ñ á é í ó ú')
  })

  it('dos cifrados del mismo texto son distintos', async () => {
    const a = await cifrar('mismo', 'clave')
    const b = await cifrar('mismo', 'clave')
    expect(a.cifrado.datos).not.toBe(b.cifrado.datos)
    expect(a.kdf.sal).not.toBe(b.kdf.sal)
    expect(a.cifrado.iv).not.toBe(b.cifrado.iv)
  })

  it('el registro declara el algoritmo y las iteraciones', async () => {
    const registro = await cifrar('x', 'clave')
    expect(registro.kdf.algoritmo).toBe('PBKDF2-SHA256')
    expect(registro.kdf.iteraciones).toBe(ITERACIONES)
    expect(registro.cifrado.algoritmo).toBe('AES-GCM')
  })

  it('usa al menos 600000 iteraciones', () => {
    expect(ITERACIONES).toBeGreaterThanOrEqual(600000)
  })

  it('el registro sobrevive a un viaje por JSON', async () => {
    const registro = await cifrar('token', 'clave')
    const ida = JSON.parse(JSON.stringify(registro))
    expect(await descifrar(ida, 'clave')).toBe('token')
  })

  it('un texto alterado no se descifra', async () => {
    const registro = await cifrar('token', 'clave')
    const roto = JSON.parse(JSON.stringify(registro))
    const bytes = atob(roto.cifrado.datos).split('')
    bytes[0] = String.fromCharCode(bytes[0].charCodeAt(0) ^ 1)
    roto.cifrado.datos = btoa(bytes.join(''))
    await expect(descifrar(roto, 'clave')).rejects.toThrow()
  })

  it('rechaza un registro con demasiadas iteraciones', async () => {
    const registro = await cifrar('token', 'clave')
    registro.kdf.iteraciones = 500000000
    await expect(descifrar(registro, 'clave')).rejects.toThrow(/iteraciones/)
  })

  it('rechaza un registro con menos iteraciones de las exigidas', async () => {
    const registro = await cifrar('token', 'clave')
    registro.kdf.iteraciones = 1000
    await expect(descifrar(registro, 'clave')).rejects.toThrow(/iteraciones/)
  })

  it('rechaza un registro con un algoritmo desconocido', async () => {
    const registro = await cifrar('token', 'clave')
    registro.kdf.algoritmo = 'MD5'
    await expect(descifrar(registro, 'clave')).rejects.toThrow(/algoritmo/)
  })
})
