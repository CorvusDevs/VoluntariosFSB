import { describe, expect, it } from 'vitest'
import { normalizarLoteMetricasWeb, pasosSincronizacionMetricasWeb } from '../../js/modelo/metricas-web.js'

const loteSeguro = () => ({
  version: 1,
  proveedor: 'cloudflare-web-analytics',
  generadoEn: '2026-08-24T22:30:00Z',
  diarias: [{ fecha: '2026-08-24', visitas: 120, paginasVistas: 210, acciones: 18 }],
  paginas: [{ fecha: '2026-08-24', ruta: '/familias/', vistas: 72 }],
  acciones: [{ fecha: '2026-08-24', accion: 'contacto:abrir', cantidad: 18 }],
})

describe('contrato de métricas web agregadas', () => {
  it('acepta solamente el resumen diario que necesita el gestor', () => {
    expect(normalizarLoteMetricasWeb(loteSeguro())).toEqual(loteSeguro())
  })

  it.each(['ip', 'correo', 'usuario', 'sesion', 'consulta'])('rechaza el campo personal o innecesario %s', (campo) => {
    const lote = loteSeguro()
    lote.diarias[0][campo] = 'dato'
    expect(() => normalizarLoteMetricasWeb(lote)).toThrow(`campo no permitido: ${campo}`)
  })

  it('rechaza consultas, fragmentos, duplicados y conteos inválidos', () => {
    const rutaConConsulta = loteSeguro()
    rutaConConsulta.paginas[0].ruta = '/familias/?nombre=Ana'
    expect(() => normalizarLoteMetricasWeb(rutaConConsulta)).toThrow('ruta pública segura')

    const duplicado = loteSeguro()
    duplicado.acciones.push({ ...duplicado.acciones[0] })
    expect(() => normalizarLoteMetricasWeb(duplicado)).toThrow('filas duplicadas')

    const negativo = loteSeguro()
    negativo.diarias[0].visitas = -1
    expect(() => normalizarLoteMetricasWeb(negativo)).toThrow('entero agregado válido')
  })

  it('explica el avance sin presentar la conexión externa como terminada', () => {
    expect(pasosSincronizacionMetricasWeb({ aprobada: false, hayDatos: false }).map((paso) => paso.estado)).toEqual([
      'completo', 'completo', 'completo', 'pendiente', 'pendiente',
    ])
    expect(pasosSincronizacionMetricasWeb({ aprobada: true, hayDatos: true }).at(-1).estado).toBe('completo')
  })
})
