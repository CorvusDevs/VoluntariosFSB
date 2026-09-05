export const CONTROLES_OPERATIVOS = Object.freeze([
  { clave: 'correo_cuenta_remitente', categoria: 'correo', titulo: 'Cuenta remitente dedicada', descripcion: 'Usa una cuenta institucional separada de las cuentas personales.' },
  { clave: 'correo_dmarc', categoria: 'correo', titulo: 'DMARC publicado', descripcion: 'El dominio publica una política DMARC y permite revisar sus reportes.' },
  { clave: 'correo_limites_proveedor', categoria: 'correo', titulo: 'Límites del hosting confirmados', descripcion: 'Quedaron registrados los límites horarios y diarios antes de enviar campañas.' },
  { clave: 'correo_prueba_externa', categoria: 'correo', titulo: 'Entrega externa probada', descripcion: 'Una prueba controlada llegó a Gmail y Outlook con SPF, DKIM y DMARC correctos.' },
  { clave: 'correo_baja_verificada', categoria: 'correo', titulo: 'Baja verificada', descripcion: 'El enlace de baja impide cualquier envío posterior al contacto.' },
  { clave: 'publicacion_sftp', categoria: 'publicacion', titulo: 'Publicación transaccional preparada', descripcion: 'Recibo inmutable, capas sin cambios, respaldo privado, rollback, protección recursiva de .htaccess, Passenger y verificación viva funcionan en una sola operación; SFTP queda disponible como recuperación.' },
])

const ESTADOS_VALIDOS = new Set(['pendiente', 'confirmado', 'bloqueado'])

export function controlesOperativosConEstado(filas = []) {
  const porClave = new Map((filas || []).map((fila) => [fila.clave, fila]))
  return CONTROLES_OPERATIVOS.map((control) => {
    const guardado = porClave.get(control.clave) || {}
    return {
      ...control,
      estado: ESTADOS_VALIDOS.has(guardado.estado) ? guardado.estado : 'pendiente',
      detalle: String(guardado.detalle || ''),
      evidencia: String(guardado.evidencia || ''),
      actualizado_por: guardado.actualizado_por || null,
      actualizado_en: guardado.actualizado_en || null,
    }
  })
}

export function controlOperativoDesde(datos = {}, clave = '') {
  const control = CONTROLES_OPERATIVOS.find((fila) => fila.clave === clave)
  if (!control) return { error: 'El control operativo no existe.' }
  const estado = String(datos.estado || '').trim()
  if (!ESTADOS_VALIDOS.has(estado)) return { error: 'Elegí un estado válido para el control.' }
  const detalle = String(datos.detalle || '').trim().slice(0, 1000)
  const evidencia = String(datos.evidencia || '').trim().slice(0, 2000)
  if (estado === 'confirmado' && evidencia.length < 5) return { error: 'Agregá una evidencia breve antes de confirmar el control.' }
  if (estado === 'bloqueado' && detalle.length < 5) return { error: 'Explicá qué impide completar este control.' }
  return { control: { ...control, estado, detalle, evidencia } }
}

export function estadoTrabajoCorreo({ smtpConfigurado = false, ultimaEjecucion = null, pendientes = 0, ahora = Date.now(), minutosParaAlerta = 15 } = {}) {
  if (!smtpConfigurado) return { estado: 'pendiente', titulo: 'Correo sin configurar', detalle: 'Las campañas se pueden preparar, pero la cola no enviará.' }
  if (!ultimaEjecucion) return { estado: pendientes > 0 ? 'critico' : 'pendiente', titulo: 'Procesador sin ejecuciones', detalle: pendientes > 0 ? 'Hay correos esperando y todavía no existe una ejecución registrada.' : 'El cron todavía no dejó una ejecución verificable.' }
  if (ultimaEjecucion.estado === 'fallida') return { estado: 'critico', titulo: 'Última ejecución fallida', detalle: ultimaEjecucion.error || 'Revisá el incidente y la configuración privada.' }
  const fecha = String(ultimaEjecucion.finalizada_en || ultimaEjecucion.iniciada_en || '').replace(' ', 'T')
  const instante = new Date(fecha).getTime()
  const minutos = Number.isFinite(instante) ? Math.max(0, Math.floor((Number(ahora) - instante) / 60000)) : Infinity
  if (minutos > minutosParaAlerta) return { estado: pendientes > 0 ? 'critico' : 'advertencia', titulo: 'Procesador sin actividad reciente', detalle: `La última ejecución registrada fue hace ${Number.isFinite(minutos) ? minutos : 'varios'} minutos.` }
  return { estado: 'saludable', titulo: 'Procesador al día', detalle: `Última ejecución hace ${minutos} minuto${minutos === 1 ? '' : 's'}.` }
}

export function resumenOperativo({ integraciones = [], incidentes = [], controles = [], cola = [] } = {}) {
  const pendientesCola = (cola || []).filter((fila) => ['pendiente', 'procesando'].includes(fila.estado)).reduce((total, fila) => total + Number(fila.cantidad || 0), 0)
  const fallidosCola = (cola || []).filter((fila) => fila.estado === 'fallido').reduce((total, fila) => total + Number(fila.cantidad || 0), 0)
  const incidentesAbiertos = (incidentes || []).filter((fila) => fila.estado === 'abierto').length
  const controlesPendientes = (controles || []).filter((fila) => fila.estado !== 'confirmado').length
  const integracionesConAtencion = (integraciones || []).filter((fila) => ['advertencia', 'critico', 'pendiente'].includes(fila.estado)).length
  return { pendientesCola, fallidosCola, incidentesAbiertos, controlesPendientes, integracionesConAtencion }
}
