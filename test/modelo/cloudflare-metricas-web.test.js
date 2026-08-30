import { describe, expect, it } from 'vitest'
import { CONSULTA_METRICAS_WEB_CLOUDFLARE, loteMetricasWebDesdeCloudflare } from '../../js/modelo/cloudflare-metricas-web.js'

const respuesta = {
  data: {
    viewer: {
      accounts: [{
        diarias: [
          { count: 34, sum: { visits: 21 }, dimensions: { date: '2026-08-23' } },
          { count: 48, sum: { visits: 30 }, dimensions: { date: '2026-08-24' } },
        ],
        paginas: [
          { count: 25, dimensions: { date: '2026-08-24', requestPath: '/' } },
          { count: 14, dimensions: { date: '2026-08-24', requestPath: '/familias/' } },
        ],
      }],
    },
  },
}

describe('adaptador de Cloudflare Web Analytics', () => {
  it('usa el conjunto y los campos confirmados mediante introspección', () => {
    expect(CONSULTA_METRICAS_WEB_CLOUDFLARE).toContain('rumPageloadEventsAdaptiveGroups')
    expect(CONSULTA_METRICAS_WEB_CLOUDFLARE).toContain('sum { visits }')
    expect(CONSULTA_METRICAS_WEB_CLOUDFLARE).toContain('dimensions { date requestPath }')
    expect(CONSULTA_METRICAS_WEB_CLOUDFLARE).not.toMatch(/email|userAgent|clientIP|queryString/i)
  })

  it('convierte la respuesta real en el contrato agregado del gestor', () => {
    expect(loteMetricasWebDesdeCloudflare(respuesta, '2026-08-24T23:00:00Z')).toEqual({
      version: 1,
      proveedor: 'cloudflare-web-analytics',
      generadoEn: '2026-08-24T23:00:00Z',
      diarias: [
        { fecha: '2026-08-23', visitas: 21, paginasVistas: 34, acciones: 0 },
        { fecha: '2026-08-24', visitas: 30, paginasVistas: 48, acciones: 0 },
      ],
      paginas: [
        { fecha: '2026-08-24', ruta: '/', vistas: 25 },
        { fecha: '2026-08-24', ruta: '/familias/', vistas: 14 },
      ],
      acciones: [],
    })
  })

  it('rechaza errores, cuentas ambiguas y rutas con consultas', () => {
    expect(() => loteMetricasWebDesdeCloudflare({ errors: [{ message: 'fallo' }] })).toThrow('devolvió errores')
    expect(() => loteMetricasWebDesdeCloudflare({ data: { viewer: { accounts: [] } } })).toThrow('cuenta esperada')
    const insegura = structuredClone(respuesta)
    insegura.data.viewer.accounts[0].paginas[0].dimensions.requestPath = '/?correo=persona@ejemplo.org'
    expect(() => loteMetricasWebDesdeCloudflare(insegura)).toThrow('ruta pública segura')
  })
})
