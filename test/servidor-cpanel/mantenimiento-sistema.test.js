import { describe, expect, it, vi } from 'vitest'
import { ejecutarMantenimientoSistema, politicaMantenimiento } from '../../servidor-cpanel/mantenimiento-sistema.mjs'

describe('mantenimiento periódico del gestor', () => {
  it('limita valores configurables y conserva valores seguros por defecto', () => {
    expect(politicaMantenimiento({})).toEqual({
      limitesFormulariosDias: 2, contenidoCorreoDias: 90, eventosCorreoDias: 365, ejecucionesDias: 180, incidentesResueltosDias: 365,
    })
    expect(politicaMantenimiento({ RETENCION_CONTENIDO_CORREO_DIAS: '99999' }).contenidoCorreoDias).toBe(3650)
  })

  it('depura por categorías, deja un recibo operativo y libera el candado', async () => {
    const query = vi.fn(async (sql) => {
      if (sql.includes('GET_LOCK')) return [[{ adquirido: 1 }], []]
      if (/^(DELETE|UPDATE)/.test(sql.trim())) return [{ affectedRows: 2 }, []]
      return [{ affectedRows: 1 }, []]
    })
    const conexion = { query, release: vi.fn() }
    const pool = { getConnection: vi.fn(async () => conexion), end: vi.fn(async () => {}) }
    const resumen = await ejecutarMantenimientoSistema({
      entorno: { DB_HOST: 'db', DB_NAME: 'gestor', DB_USER: 'gestor', DB_PASSWORD: 'privada' },
      crearBase: () => ({ pool }),
    })
    expect(resumen.procesados).toBe(12)
    expect(resumen.detalle).toContain('contenido de correos: 2')
    expect(query.mock.calls.some(([sql]) => sql.includes("contenido_texto = '[contenido depurado por retención]'"))).toBe(true)
    expect(query.mock.calls.some(([sql]) => sql.includes('RELEASE_LOCK'))).toBe(true)
    expect(conexion.release).toHaveBeenCalledOnce()
    expect(pool.end).toHaveBeenCalledOnce()
  })
})
