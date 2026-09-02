import { fileURLToPath } from 'node:url'
import { crearBaseMariaDb } from './base-mysql.mjs'
import { cargarEntornoAplicacion } from './cargar-entorno.mjs'
import {
  completarEjecucionSistema, fallarEjecucionSistema, iniciarEjecucionSistema,
} from './registro-operaciones.mjs'

cargarEntornoAplicacion()

const dias = (valor, defecto, maximo = 3650) => Math.max(1, Math.min(maximo, Number(valor || defecto)))

export function politicaMantenimiento(entorno = process.env) {
  return {
    limitesFormulariosDias: dias(entorno.RETENCION_LIMITES_FORMULARIOS_DIAS, 2, 30),
    contenidoCorreoDias: dias(entorno.RETENCION_CONTENIDO_CORREO_DIAS, 90),
    eventosCorreoDias: dias(entorno.RETENCION_EVENTOS_CORREO_DIAS, 365),
    ejecucionesDias: dias(entorno.RETENCION_EJECUCIONES_DIAS, 180),
    incidentesResueltosDias: dias(entorno.RETENCION_INCIDENTES_DIAS, 365),
  }
}

export async function ejecutarMantenimientoSistema({ entorno = process.env, crearBase = crearBaseMariaDb } = {}) {
  const requeridas = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']
  const faltantes = requeridas.filter((nombre) => !entorno[nombre])
  if (faltantes.length) throw new Error(`Faltan variables privadas: ${faltantes.join(', ')}`)
  const politica = politicaMantenimiento(entorno)
  const base = crearBase(entorno)
  const conexion = await base.pool.getConnection()
  let bloqueo = false
  let ejecucionId = null
  const resumen = { encontrados: 0, procesados: 0, exitos: 0, detalle: '' }
  try {
    const [[candado]] = await conexion.query("SELECT GET_LOCK('gestor_aletea_mantenimiento', 0) AS adquirido")
    bloqueo = Number(candado?.adquirido || 0) === 1
    ejecucionId = await iniciarEjecucionSistema(conexion, 'mantenimiento', politica)
    if (!bloqueo) {
      resumen.detalle = 'otra_ejecucion_activa'
      await completarEjecucionSistema(conexion, ejecucionId, resumen, 'omitida')
      ejecucionId = null
      return resumen
    }
    const operaciones = [
      ['límites de formularios', `DELETE FROM limites_formularios_publicos_cms WHERE actualizado_en < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${politica.limitesFormulariosDias} DAY)`],
      ['consentimientos vencidos', "UPDATE consentimientos_comunicacion SET estado = 'vencido' WHERE estado = 'pendiente' AND solicitado_en < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 7 DAY)"],
      ['contenido de correos', `UPDATE cola_correos SET contenido_texto = '[contenido depurado por retención]', contenido_html = '', actualizado_en = actualizado_en WHERE estado IN ('enviado', 'suprimido') AND actualizado_en < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${politica.contenidoCorreoDias} DAY) AND contenido_texto != '[contenido depurado por retención]'`],
      ['eventos de correo', `DELETE FROM eventos_correo WHERE ocurrido_en < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${politica.eventosCorreoDias} DAY)`],
      ['ejecuciones antiguas', `DELETE FROM ejecuciones_sistema WHERE finalizada_en IS NOT NULL AND finalizada_en < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${politica.ejecucionesDias} DAY)`],
      ['incidentes resueltos', `DELETE FROM incidentes_operativos_cms WHERE estado != 'abierto' AND resuelto_en < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${politica.incidentesResueltosDias} DAY)`],
    ]
    const resultados = []
    for (const [nombre, sql] of operaciones) {
      const [resultado] = await conexion.query(sql)
      const cantidad = Number(resultado.affectedRows || 0)
      resumen.procesados += cantidad
      resumen.exitos += cantidad
      resultados.push(`${nombre}: ${cantidad}`)
    }
    resumen.encontrados = resumen.procesados
    resumen.detalle = resultados.join(', ')
    return resumen
  } catch (error) {
    if (ejecucionId) await fallarEjecucionSistema(conexion, ejecucionId, error).catch(() => {})
    ejecucionId = null
    throw error
  } finally {
    if (ejecucionId) await completarEjecucionSistema(conexion, ejecucionId, resumen).catch(() => {})
    if (bloqueo) await conexion.query("SELECT RELEASE_LOCK('gestor_aletea_mantenimiento')").catch(() => {})
    conexion.release()
    await base.pool.end()
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  ejecutarMantenimientoSistema().then((resumen) => {
    if (process.env.CRON_VERBOSE === 'true') console.log(`Mantenimiento completo: ${resumen.procesados} registros depurados.`)
  }).catch((error) => {
    console.error(`No se pudo completar el mantenimiento: ${String(error?.message || error).replace(/[\r\n]+/g, ' ').slice(0, 1000)}`)
    process.exitCode = 1
  })
}
