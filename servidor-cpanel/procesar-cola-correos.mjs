import { fileURLToPath } from 'node:url'
import nodemailer from 'nodemailer'
import { crearBaseMariaDb } from './base-mysql.mjs'
import { cargarEntornoAplicacion } from './cargar-entorno.mjs'
import {
  abrirIncidenteOperativo, completarEjecucionSistema, fallarEjecucionSistema,
  iniciarEjecucionSistema, resolverIncidenteOperativo,
} from './registro-operaciones.mjs'

cargarEntornoAplicacion()

export function demoraReintentoMinutos(intentos) {
  return Math.min(24 * 60, 5 * (2 ** Math.max(0, Number(intentos || 1) - 1)))
}

export function configuracionSmtp(entorno = process.env) {
  const puerto = Number(entorno.SMTP_PORT || 465)
  return {
    host: entorno.SMTP_HOST,
    port: puerto,
    secure: String(entorno.SMTP_SECURE ?? puerto === 465).toLowerCase() === 'true',
    auth: { user: entorno.SMTP_USER, pass: entorno.SMTP_PASSWORD },
  }
}

export function limitesEnvio(entorno = process.env) {
  const porCorrida = Math.max(1, Math.min(50, Number(entorno.EMAIL_MAX_PER_RUN || entorno.EMAIL_BATCH_SIZE || 20)))
  const porHora = Math.max(porCorrida, Math.min(300, Number(entorno.EMAIL_MAX_PER_HOUR || 240)))
  return { porCorrida, porHora }
}

function textoError(error) {
  return String(error?.response || error?.message || 'Fallo no identificado').replace(/[\r\n]+/g, ' ').slice(0, 1000)
}

async function registrarOperacionSegura(operacion) {
  try { return await operacion() } catch (error) {
    console.error(`No se pudo registrar el estado operativo: ${textoError(error)}`)
    return null
  }
}

export function identificadorMensaje(correoId, entorno = process.env) {
  const remitente = String(entorno.EMAIL_FROM || '')
  const dominio = (remitente.match(/@([a-z0-9.-]+)/i)?.[1] || 'aletea.org').replace(/[^a-z0-9.-]/gi, '').toLowerCase()
  const id = String(correoId || '').replace(/[^a-z0-9.-]/gi, '').slice(0, 120) || 'correo'
  return `<gestor-${id}@${dominio}>`
}

export async function procesarColaCorreos({ entorno = process.env, crearTransporte = nodemailer.createTransport, crearBase = crearBaseMariaDb } = {}) {
  const requeridas = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'EMAIL_FROM']
  const faltantes = requeridas.filter((nombre) => !entorno[nombre])
  if (entorno.EMAIL_TRANSPORT !== 'smtp') throw new Error('EMAIL_TRANSPORT debe ser smtp para procesar la cola.')
  if (faltantes.length) throw new Error(`Faltan variables privadas: ${faltantes.join(', ')}`)
  const limites = limitesEnvio(entorno)
  const base = crearBase(entorno)
  const conexion = await base.pool.getConnection()
  let bloqueo = false
  let ejecucionId = null
  let falloEjecucion = null
  const resumen = { encontrados: 0, enviados: 0, reintentados: 0, fallidos: 0, suprimidos: 0 }
  try {
    const [[candado]] = await conexion.query("SELECT GET_LOCK('gestor_aletea_cola_correos', 0) AS adquirido")
    bloqueo = Number(candado?.adquirido || 0) === 1
    ejecucionId = await registrarOperacionSegura(() => iniciarEjecucionSistema(conexion, 'cola_correos', { limite_por_corrida: limites.porCorrida, limite_por_hora: limites.porHora }))
    if (!bloqueo) {
      resumen.omitido = 'otra_ejecucion_activa'
      if (ejecucionId) await registrarOperacionSegura(() => completarEjecucionSistema(conexion, ejecucionId, resumen, 'omitida'))
      ejecucionId = null
      return resumen
    }
    const [conteoHorario] = await conexion.query("SELECT COUNT(*) AS enviados FROM cola_correos WHERE estado = 'enviado' AND actualizado_en >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 HOUR)")
    const enviadosUltimaHora = Number(conteoHorario?.[0]?.enviados || 0)
    const disponiblesEstaHora = Math.max(0, limites.porHora - enviadosUltimaHora)
    const limite = Math.min(limites.porCorrida, disponiblesEstaHora)
    resumen.enviados_ultima_hora = enviadosUltimaHora
    resumen.limite_por_hora = limites.porHora
    if (!limite) {
      resumen.omitido = 'limite_horario'
      return resumen
    }
    await conexion.query(`UPDATE cola_correos SET estado = 'pendiente', proximo_intento = CURRENT_TIMESTAMP,
      ultimo_error = 'Ejecución anterior interrumpida. Reanudado con el mismo Message-ID.', actualizado_en = CURRENT_TIMESTAMP
      WHERE estado = 'procesando' AND actualizado_en < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 30 MINUTE)`)
    await conexion.query("UPDATE consentimientos_comunicacion SET estado = 'vencido' WHERE estado = 'pendiente' AND solicitado_en < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 7 DAY)")
    await conexion.query(`UPDATE cola_correos q JOIN consentimientos_comunicacion c
      ON q.clave_idempotencia = CONCAT('confirmacion:', c.id)
      SET q.estado = 'suprimido', q.actualizado_en = CURRENT_TIMESTAMP
      WHERE q.estado = 'pendiente' AND c.estado = 'vencido'`)
    const [correos] = await conexion.query(`SELECT id, tipo, contacto_id, campana_id, destinatario, asunto, contenido_texto, contenido_html, intentos
      FROM cola_correos
      WHERE estado = 'pendiente' AND proximo_intento <= CURRENT_TIMESTAMP
      ORDER BY proximo_intento, creado_en LIMIT ?`, [limite])
    resumen.encontrados = correos.length
    if (!correos.length) return resumen
    const transporte = crearTransporte(configuracionSmtp(entorno))
    for (const correo of correos) {
      const [[suprimida]] = await conexion.query('SELECT correo FROM supresiones_comunicacion WHERE correo = ? LIMIT 1', [correo.destinatario])
      let contactoInactivo = false
      if (correo.tipo === 'campana' && correo.contacto_id) {
        const [[contacto]] = await conexion.query('SELECT estado FROM contactos_comunicacion WHERE id = ? LIMIT 1', [correo.contacto_id])
        contactoInactivo = contacto?.estado !== 'activo'
      }
      if (suprimida || contactoInactivo) {
        await conexion.query("UPDATE cola_correos SET estado = 'suprimido', actualizado_en = CURRENT_TIMESTAMP WHERE id = ? AND estado = 'pendiente'", [correo.id])
        resumen.suprimidos += 1
        continue
      }
      const [tomada] = await conexion.query("UPDATE cola_correos SET estado = 'procesando', intentos = intentos + 1, actualizado_en = CURRENT_TIMESTAMP WHERE id = ? AND estado = 'pendiente'", [correo.id])
      if (!Number(tomada.affectedRows || 0)) continue
      const intento = Number(correo.intentos || 0) + 1
      try {
        const resultado = await transporte.sendMail({
          from: entorno.EMAIL_FROM,
          replyTo: entorno.EMAIL_REPLY_TO || undefined,
          to: correo.destinatario,
          subject: correo.asunto,
          text: correo.contenido_texto,
          html: correo.contenido_html || undefined,
          messageId: identificadorMensaje(correo.id, entorno),
        })
        await conexion.beginTransaction()
        await conexion.query("UPDATE cola_correos SET estado = 'enviado', proveedor_id = ?, ultimo_error = '', actualizado_en = CURRENT_TIMESTAMP WHERE id = ?", [String(resultado.messageId || '').slice(0, 191), correo.id])
        await conexion.query("INSERT INTO eventos_correo (id, correo_id, proveedor, tipo, detalle) VALUES (UUID(), ?, 'hosting_smtp', 'enviado', 'Aceptado por el servidor SMTP')", [correo.id])
        await conexion.commit()
        resumen.enviados += 1
      } catch (error) {
        await conexion.rollback().catch(() => {})
        const definitivo = intento >= 5
        const demora = demoraReintentoMinutos(intento)
        await conexion.beginTransaction()
        await conexion.query(`UPDATE cola_correos SET estado = ?, ultimo_error = ?,
          proximo_intento = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? MINUTE), actualizado_en = CURRENT_TIMESTAMP WHERE id = ?`,
        [definitivo ? 'fallido' : 'pendiente', textoError(error), demora, correo.id])
        await conexion.query("INSERT INTO eventos_correo (id, correo_id, proveedor, tipo, detalle) VALUES (UUID(), ?, 'hosting_smtp', ?, ?)", [correo.id, definitivo ? 'fallido' : 'reintento', textoError(error)])
        await conexion.commit()
        if (definitivo) resumen.fallidos += 1
        else resumen.reintentados += 1
      }
    }
    await conexion.query(`UPDATE campanas_comunicacion SET estado = 'enviada', enviado_en = CURRENT_TIMESTAMP, actualizado_en = CURRENT_TIMESTAMP
      WHERE estado = 'programada'
      AND EXISTS (SELECT 1 FROM cola_correos q WHERE q.campana_id = campanas_comunicacion.id AND q.estado = 'enviado')
      AND NOT EXISTS (SELECT 1 FROM cola_correos q WHERE q.campana_id = campanas_comunicacion.id AND q.estado IN ('pendiente', 'procesando', 'fallido'))`)
    return resumen
  } catch (error) {
    falloEjecucion = error
    if (ejecucionId) await registrarOperacionSegura(() => fallarEjecucionSistema(conexion, ejecucionId, error))
    await registrarOperacionSegura(() => abrirIncidenteOperativo(conexion, {
      clave: 'cola_correos_ejecucion', tipo: 'trabajo_fallido', severidad: 'critica',
      titulo: 'No se pudo procesar la cola de correo', detalle: textoError(error), fuente: 'cola_correos',
    }))
    throw error
  } finally {
    if (ejecucionId && !falloEjecucion) {
      await registrarOperacionSegura(() => completarEjecucionSistema(conexion, ejecucionId, resumen))
      if (resumen.fallidos > 0) {
        await registrarOperacionSegura(() => abrirIncidenteOperativo(conexion, {
          clave: 'cola_correos_fallidos', tipo: 'entrega_fallida', severidad: 'advertencia',
          titulo: 'Hay correos que agotaron sus reintentos', detalle: `${resumen.fallidos} correo${resumen.fallidos === 1 ? '' : 's'} requiere${resumen.fallidos === 1 ? '' : 'n'} revisión.`, fuente: 'cola_correos',
        }))
      } else await registrarOperacionSegura(() => resolverIncidenteOperativo(conexion, 'cola_correos_fallidos'))
      await registrarOperacionSegura(() => resolverIncidenteOperativo(conexion, 'cola_correos_ejecucion'))
    }
    if (bloqueo) await conexion.query("SELECT RELEASE_LOCK('gestor_aletea_cola_correos')").catch(() => {})
    conexion.release()
    await base.pool.end()
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  procesarColaCorreos().then((resumen) => {
    if (process.env.CRON_VERBOSE === 'true') console.log(`Cola procesada: ${resumen.enviados} enviados, ${resumen.reintentados} reintentos, ${resumen.fallidos} fallidos, ${resumen.suprimidos} suprimidos.`)
  }).catch((error) => {
    console.error(`No se pudo procesar la cola: ${textoError(error)}`)
    process.exitCode = 1
  })
}
