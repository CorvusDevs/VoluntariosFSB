import { randomUUID } from 'node:crypto'

const textoSeguro = (valor, limite = 1000) => String(valor || '').replace(/[\r\n]+/g, ' ').slice(0, limite)

export async function iniciarEjecucionSistema(conexion, trabajo, metadatos = {}) {
  const id = randomUUID()
  await conexion.query(`INSERT INTO ejecuciones_sistema
    (id, trabajo, estado, detalle, error, metadatos_json) VALUES (?, ?, 'procesando', '', '', ?)`, [id, textoSeguro(trabajo, 191), JSON.stringify(metadatos || {})])
  return id
}

export async function completarEjecucionSistema(conexion, id, resumen = {}, estado = 'completada') {
  const procesados = resumen.procesados === undefined
    ? Number(resumen.enviados || 0) + Number(resumen.reintentados || 0) + Number(resumen.fallidos || 0) + Number(resumen.suprimidos || 0)
    : Number(resumen.procesados || 0)
  await conexion.query(`UPDATE ejecuciones_sistema SET estado = ?, finalizada_en = CURRENT_TIMESTAMP,
    encontrados = ?, procesados = ?, exitos = ?, reintentados = ?, fallidos = ?, suprimidos = ?, detalle = ?, error = '' WHERE id = ?`, [
    estado,
    Number(resumen.encontrados || 0),
    procesados,
    Number(resumen.exitos ?? resumen.enviados ?? 0),
    Number(resumen.reintentados || 0),
    Number(resumen.fallidos || 0),
    Number(resumen.suprimidos || 0),
    textoSeguro(resumen.detalle || resumen.omitido || ''),
    id,
  ])
}

export async function fallarEjecucionSistema(conexion, id, error) {
  await conexion.query("UPDATE ejecuciones_sistema SET estado = 'fallida', finalizada_en = CURRENT_TIMESTAMP, error = ? WHERE id = ?", [textoSeguro(error?.message || error), id])
}

export async function abrirIncidenteOperativo(conexion, incidente) {
  await conexion.query(`INSERT INTO incidentes_operativos_cms
    (id, clave, tipo, severidad, estado, titulo, detalle, fuente)
    VALUES (?, ?, ?, ?, 'abierto', ?, ?, ?)
    ON DUPLICATE KEY UPDATE tipo = VALUES(tipo), severidad = VALUES(severidad), estado = 'abierto',
      titulo = VALUES(titulo), detalle = VALUES(detalle), fuente = VALUES(fuente),
      ocurrencias = ocurrencias + 1, ultimo_en = CURRENT_TIMESTAMP, resuelto_en = NULL, resuelto_por = NULL`, [
    randomUUID(), textoSeguro(incidente.clave, 191), textoSeguro(incidente.tipo, 80), textoSeguro(incidente.severidad || 'advertencia', 30),
    textoSeguro(incidente.titulo, 191), textoSeguro(incidente.detalle, 2000), textoSeguro(incidente.fuente || 'sistema', 80),
  ])
}

export async function resolverIncidenteOperativo(conexion, clave) {
  await conexion.query("UPDATE incidentes_operativos_cms SET estado = 'resuelto', resuelto_en = CURRENT_TIMESTAMP, resuelto_por = 'sistema' WHERE clave = ? AND estado = 'abierto'", [clave])
}
