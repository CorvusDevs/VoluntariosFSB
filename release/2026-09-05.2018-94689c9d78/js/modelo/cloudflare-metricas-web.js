import { normalizarLoteMetricasWeb } from './metricas-web.js'

export const CONSULTA_METRICAS_WEB_CLOUDFLARE = `
query MetricasWebAletea($accountTag: string!, $desde: Date!, $hasta: Date!, $hosts: [string!]) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      diarias: rumPageloadEventsAdaptiveGroups(
        limit: 1000
        filter: { date_geq: $desde, date_leq: $hasta, requestHost_in: $hosts }
      ) {
        count
        sum { visits }
        dimensions { date }
      }
      paginas: rumPageloadEventsAdaptiveGroups(
        limit: 5000
        filter: { date_geq: $desde, date_leq: $hasta, requestHost_in: $hosts }
      ) {
        count
        dimensions { date requestPath }
      }
    }
  }
}`

function cuentaDesdeRespuesta(respuesta) {
  if (respuesta?.errors?.length) throw new TypeError('Cloudflare devolvió errores al consultar las métricas.')
  const cuentas = respuesta?.data?.viewer?.accounts
  if (!Array.isArray(cuentas) || cuentas.length !== 1) throw new TypeError('Cloudflare no devolvió la cuenta esperada.')
  return cuentas[0]
}

export function loteMetricasWebDesdeCloudflare(respuesta, generadoEn = new Date().toISOString()) {
  const cuenta = cuentaDesdeRespuesta(respuesta)
  const diarias = (cuenta.diarias || []).map((fila) => ({
    fecha: fila?.dimensions?.date,
    visitas: fila?.sum?.visits,
    paginasVistas: fila?.count,
    acciones: 0,
  }))
  const paginas = (cuenta.paginas || []).map((fila) => ({
    fecha: fila?.dimensions?.date,
    ruta: fila?.dimensions?.requestPath,
    vistas: fila?.count,
  }))
  return normalizarLoteMetricasWeb({
    version: 1,
    proveedor: 'cloudflare-web-analytics',
    generadoEn,
    diarias,
    paginas,
    acciones: [],
  })
}
