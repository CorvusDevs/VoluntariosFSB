import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cifrarRespaldo, escribirManifiesto, verificarRespaldo } from '../../herramientas/respaldo-d1-comun.mjs'

describe('respaldo y recuperación de D1', () => {
  it('crea un manifiesto y restaura una copia íntegra en SQLite temporal', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'aletea-respaldo-prueba-'))
    const carpeta = join(raiz, 'copia'); mkdirSync(carpeta)
    const sql = join(carpeta, 'aletea-d1.sql')
    writeFileSync(sql, 'PRAGMA foreign_keys=ON; CREATE TABLE equipos(id TEXT PRIMARY KEY); CREATE TABLE tareas(id TEXT PRIMARY KEY, equipo_id TEXT REFERENCES equipos(id)); INSERT INTO equipos VALUES(\'familias\'); INSERT INTO tareas VALUES(\'t1\',\'familias\');\n')
    const cifrado = `${sql}.enc`
    cifrarRespaldo(sql, cifrado, 'frase-secreta-de-prueba-segura')
    const { manifiesto } = escribirManifiesto(cifrado, { creado_en: '2026-08-19T12:00:00.000Z', origen: 'prueba', cifrado: 'aes-256-gcm-scrypt' })
    expect(manifiesto.sha256).toHaveLength(64)
    expect(verificarRespaldo(carpeta, { frase: 'frase-secreta-de-prueba-segura' })).toMatchObject({ integridad: 'ok', referenciasInvalidas: 0, tablas: 2 })
    expect(() => verificarRespaldo(carpeta, { frase: 'otra-frase-totalmente-incorrecta' })).toThrow(/descifrar/)
  })

  it('rechaza una copia modificada después de generar el manifiesto', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'aletea-respaldo-alterado-'))
    const sql = join(raiz, 'aletea-d1.sql'); writeFileSync(sql, 'CREATE TABLE prueba(id TEXT);\n')
    escribirManifiesto(sql); writeFileSync(sql, `${readFileSync(sql, 'utf8')}-- alterado\n`)
    expect(() => verificarRespaldo(raiz)).toThrow(/suma de verificación/)
  })
})
