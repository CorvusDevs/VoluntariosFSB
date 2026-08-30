import { describe, expect, it, vi } from 'vitest'
import { aplicarMigracionesMariaDb } from '../../servidor-cpanel/migraciones.mjs'

function baseFalsa({ aplicadas = [], columnas = [], indices = [] } = {}) {
  const migracionesAplicadas = new Set(aplicadas)
  const existentes = new Set(columnas.map((columna) => columna.includes(':') ? columna : `entradas_cms:${columna}`))
  const indicesExistentes = new Set(indices)
  const conexion = {
    query: vi.fn(async (sql) => {
      if (sql.includes('ADD COLUMN')) {
        const [, tabla, columna] = sql.match(/ALTER TABLE ([a-z_]+) ADD COLUMN ([a-z_]+)/)
        existentes.add(`${tabla}:${columna}`)
      }
      if (sql.includes('CREATE INDEX')) indicesExistentes.add(sql.match(/CREATE INDEX ([a-z_]+)/)[1])
      return [[], []]
    }),
    execute: vi.fn(async (sql, valores) => {
      if (sql.includes('FROM migraciones_cms')) return [migracionesAplicadas.has(valores[0]) ? [{ ok: 1 }] : [], []]
      if (sql.includes('information_schema.COLUMNS')) return [existentes.has(`${valores.length > 1 ? valores[0] : 'entradas_cms'}:${valores.at(-1)}`) ? [{ ok: 1 }] : [], []]
      if (sql.includes('information_schema.STATISTICS')) return [indicesExistentes.has(valores[1]) ? [{ ok: 1 }] : [], []]
      return [[], []]
    }),
    beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn(),
  }
  return { base: { pool: { getConnection: async () => conexion } }, conexion }
}

describe('migraciones incrementales de MariaDB', () => {
  it('agrega solo la estructura faltante y registra la migración', async () => {
    const { base, conexion } = baseFalsa({ columnas: ['cumplida_en'] })
    await aplicarMigracionesMariaDb(base)
    const alteraciones = conexion.query.mock.calls.map(([sql]) => sql).filter((sql) => sql.includes('ADD COLUMN'))
    expect(alteraciones).toHaveLength(9)
    expect(alteraciones.some((sql) => sql.includes('cumplida_en'))).toBe(false)
    expect(conexion.commit).toHaveBeenCalledTimes(2)
    expect(conexion.execute.mock.calls.some(([sql]) => sql.includes('INSERT INTO migraciones_cms'))).toBe(true)
    const crearHistorial = conexion.query.mock.calls.map(([sql]) => sql).find((sql) => sql.includes('CREATE TABLE IF NOT EXISTS historial_entradas_cms'))
    expect(crearHistorial).toContain('id VARCHAR(191) PRIMARY KEY')
    expect(crearHistorial).toContain('entrada_id VARCHAR(191) NOT NULL')
    expect(crearHistorial).toContain('actor_correo VARCHAR(191) NOT NULL')
    expect(crearHistorial).not.toContain('FOREIGN KEY')
    const crearUnidades = conexion.query.mock.calls.map(([sql]) => sql).find((sql) => sql.includes('CREATE TABLE IF NOT EXISTS unidades_operativas_cms'))
    expect(crearUnidades).toContain('id VARCHAR(191) PRIMARY KEY')
    expect(crearUnidades).toContain('equipo_id VARCHAR(191) NOT NULL')
    expect(crearUnidades).not.toContain('FOREIGN KEY')
    expect(conexion.execute.mock.calls.filter(([sql]) => sql.includes('INSERT IGNORE INTO unidades_operativas_cms'))).toHaveLength(12)
    expect(conexion.release).toHaveBeenCalledOnce()
  })

  it('no repite una migración ya aplicada', async () => {
    const { base, conexion } = baseFalsa({ aplicadas: ['0052_cumplimientos_formularios_cms', '0053_unidades_operativas_cms'] })
    await aplicarMigracionesMariaDb(base)
    expect(conexion.beginTransaction).not.toHaveBeenCalled()
    expect(conexion.query.mock.calls.some(([sql]) => sql.includes('ADD COLUMN'))).toBe(false)
  })

  it('revierte y detiene el inicio si la migración falla', async () => {
    const { base, conexion } = baseFalsa()
    conexion.query.mockImplementationOnce(async () => [[], []]).mockRejectedValueOnce(new Error('falló ALTER'))
    await expect(aplicarMigracionesMariaDb(base)).rejects.toThrow('falló ALTER')
    expect(conexion.rollback).toHaveBeenCalledOnce()
    expect(conexion.release).toHaveBeenCalledOnce()
  })
})
