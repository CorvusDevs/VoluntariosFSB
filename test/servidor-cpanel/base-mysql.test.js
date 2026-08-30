import { describe, expect, it } from 'vitest'
import { _pruebas } from '../../servidor-cpanel/base-mysql.mjs'

describe('compatibilidad de consultas D1 con MariaDB', () => {
  it('convierte parámetros numerados, incluso cuando se repiten', () => {
    const resultado = _pruebas.consultaMariaDb('UPDATE tabla SET valor = ?2 WHERE id = ?1 OR padre = ?1', ['a', 'b'])
    expect(resultado).toEqual({ consulta: 'UPDATE tabla SET valor = ? WHERE id = ? OR padre = ?', parametros: ['b', 'a', 'a'] })
  })

  it('convierte inserciones idempotentes y ordenamiento SQLite', () => {
    const sql = _pruebas.sqlMariaDb('INSERT OR IGNORE INTO tabla (id) VALUES (?1); SELECT * FROM tabla ORDER BY nombre COLLATE NOCASE')
    expect(sql).toContain('INSERT IGNORE INTO tabla')
    expect(sql).not.toContain('NOCASE')
  })

  it('convierte upsert y fechas relativas', () => {
    const sql = _pruebas.sqlMariaDb(`INSERT INTO tabla (id, valor) VALUES (?1, ?2)
      ON CONFLICT(id) DO UPDATE SET valor = excluded.valor, actualizado = CURRENT_TIMESTAMP;
      SELECT * FROM tabla WHERE fecha >= datetime('now', '-180 days') AND dia >= date('now')`)
    expect(sql).toContain('ON DUPLICATE KEY UPDATE valor = VALUES(valor)')
    expect(sql).toContain('CURRENT_TIMESTAMP - INTERVAL 180 DAY')
    expect(sql).toContain('dia >= CURRENT_DATE')
  })

  it('mantiene válido en MariaDB el límite atómico de formularios públicos', () => {
    const sql = _pruebas.sqlMariaDb(`INSERT INTO limites_formularios_publicos_cms
      (formulario_id, clave, ventana, cantidad) VALUES (?1, ?2, ?3, 1)
      ON CONFLICT(formulario_id, clave, ventana) DO UPDATE SET
      cantidad = CASE WHEN cantidad < 5 THEN cantidad + 1 ELSE cantidad END,
      actualizado_en = CURRENT_TIMESTAMP`)
    expect(sql).toContain('ON DUPLICATE KEY UPDATE')
    expect(sql).toContain('CASE WHEN cantidad < 5 THEN cantidad + 1 ELSE cantidad END')
    expect(sql).not.toMatch(/UPDATE SET[\s\S]*WHERE cantidad/)
  })

  it('preserva los valores binarios para contraseñas y fotos', async () => {
    const llamadas = []
    const pool = { execute: async (sql, valores) => { llamadas.push({ sql, valores }); return [[{ datos: Buffer.from([1, 2, 3]) }], []] } }
    const { BaseMariaDb } = await import('../../servidor-cpanel/base-mysql.mjs')
    const fila = await new BaseMariaDb(pool).prepare('SELECT datos FROM fotos WHERE clave = ?1').bind('foto').first()
    expect([...fila.datos]).toEqual([1, 2, 3])
    expect(llamadas[0].valores).toEqual(['foto'])
  })
})
