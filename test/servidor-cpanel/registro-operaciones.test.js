import { describe, expect, it, vi } from 'vitest'
import { abrirIncidenteOperativo, completarEjecucionSistema, fallarEjecucionSistema, iniciarEjecucionSistema, resolverIncidenteOperativo } from '../../servidor-cpanel/registro-operaciones.mjs'

describe('registro operativo de trabajos', () => {
  it('registra inicio y fin con un identificador reutilizable', async () => {
    const conexion = { query: vi.fn(async () => [[], []]) }
    const id = await iniciarEjecucionSistema(conexion, 'cola_correos', { limite: 20 })
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(conexion.query.mock.calls[0][0]).toContain('detalle, error, metadatos_json')
    expect(conexion.query.mock.calls[0][1][2]).toBe('{"limite":20}')
    await completarEjecucionSistema(conexion, id, { encontrados: 3, enviados: 2, reintentados: 1 })
    expect(conexion.query.mock.calls[1][1].at(-1)).toBe(id)
  })

  it('registra fallos e incidentes sin guardar saltos de línea en errores', async () => {
    const conexion = { query: vi.fn(async () => [[], []]) }
    await fallarEjecucionSistema(conexion, 'ejecucion-1', new Error('SMTP\nprivado'))
    expect(conexion.query.mock.calls[0][1][0]).toBe('SMTP privado')
    await abrirIncidenteOperativo(conexion, { clave: 'correo:cola', tipo: 'correo', severidad: 'critica', titulo: 'Cola detenida', detalle: 'No pudo enviar', fuente: 'cron' })
    expect(conexion.query.mock.calls[1][0]).toContain('ON DUPLICATE KEY UPDATE')
    await resolverIncidenteOperativo(conexion, 'correo:cola')
    expect(conexion.query.mock.calls[2][1]).toEqual(['correo:cola'])
  })
})
