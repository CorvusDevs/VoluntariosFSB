const DIA_MS = 24 * 60 * 60 * 1000

export function siguienteFechaRecurrente(fecha, frecuencia) {
  const [anio, mes, dia] = String(fecha).split('-').map(Number)
  if (frecuencia === 'semanal') return new Date(Date.UTC(anio, mes - 1, dia) + (7 * DIA_MS)).toISOString().slice(0, 10)
  const siguienteMes = mes === 12 ? 1 : mes + 1
  const siguienteAnio = mes === 12 ? anio + 1 : anio
  const ultimoDiaSiguienteMes = new Date(Date.UTC(siguienteAnio, siguienteMes, 0)).getUTCDate()
  return `${siguienteAnio}-${String(siguienteMes).padStart(2, '0')}-${String(Math.min(dia, ultimoDiaSiguienteMes)).padStart(2, '0')}`
}

function proximaFechaFutura(fecha, frecuencia, hoy) {
  let siguiente = siguienteFechaRecurrente(fecha, frecuencia)
  while (siguiente <= hoy) siguiente = siguienteFechaRecurrente(siguiente, frecuencia)
  return siguiente
}

async function iniciarEjecucion(base, recurrente, periodo) {
  await base.prepare(`INSERT INTO automatizaciones_ejecuciones_cms
    (id, recurrencia_id, periodo, estado, intentos)
    VALUES (?1, ?2, ?3, 'procesando', 1)
    ON CONFLICT(recurrencia_id, periodo) DO UPDATE SET
      estado = 'procesando', intentos = automatizaciones_ejecuciones_cms.intentos + 1,
      error = NULL, actualizado_en = CURRENT_TIMESTAMP`)
    .bind(crypto.randomUUID(), recurrente.id, periodo).run()
}

async function cerrarEjecucion(base, recurrente, periodo, { estado, error = null, tareaId = null }) {
  await base.prepare(`UPDATE automatizaciones_ejecuciones_cms
    SET estado = ?3, error = ?4, tarea_id = ?5, actualizado_en = CURRENT_TIMESTAMP
    WHERE recurrencia_id = ?1 AND periodo = ?2`)
    .bind(recurrente.id, periodo, estado, error, tareaId).run()
}

export async function procesarTareasRecurrentes(base, { hoy = new Date().toISOString().slice(0, 10) } = {}) {
  const resultado = await base.prepare(`SELECT * FROM tareas_recurrentes_cms
    WHERE activo = 1 AND proxima_fecha <= ?1 ORDER BY proxima_fecha ASC LIMIT 50`).bind(hoy).all()
  const recurrentes = resultado.results ?? []
  let generadas = 0
  let fallidas = 0
  for (const recurrente of recurrentes) {
    const periodo = recurrente.proxima_fecha
    try {
      await iniciarEjecucion(base, recurrente, periodo)
      const tarea = {
        id: crypto.randomUUID(), titulo: recurrente.titulo, descripcion: recurrente.descripcion,
        tipo: 'tarea', estado: 'pendiente', prioridad: recurrente.prioridad,
        equipo_id: recurrente.equipo_id, proyecto_id: recurrente.proyecto_id,
        responsable_correo: recurrente.responsable_correo, fecha_limite: periodo,
        creado_por: recurrente.creado_por, recurrencia_id: recurrente.id, generada_para: periodo,
      }
      const insertada = await base.prepare(`INSERT OR IGNORE INTO tareas_cms
        (id, titulo, descripcion, tipo, estado, prioridad, equipo_id, proyecto_id, responsable_correo, fecha_limite, creado_por, recurrencia_id, generada_para)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`)
        .bind(tarea.id, tarea.titulo, tarea.descripcion, tarea.tipo, tarea.estado, tarea.prioridad, tarea.equipo_id, tarea.proyecto_id, tarea.responsable_correo, tarea.fecha_limite, tarea.creado_por, tarea.recurrencia_id, tarea.generada_para).run()
      const fueNueva = Number(insertada.meta?.changes ?? 0) === 1
      const tareaGenerada = fueNueva ? tarea : await base.prepare(`SELECT id FROM tareas_cms
        WHERE recurrencia_id = ?1 AND generada_para = ?2`).bind(recurrente.id, periodo).first()
      if (!tareaGenerada) throw new Error('No pudimos recuperar la tarea recurrente pendiente.')
      if (fueNueva && tarea.responsable_correo) {
        await base.prepare(`INSERT INTO notificaciones_cms (id, usuario_correo, tipo, tarea_id, titulo, detalle)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6)`)
          .bind(crypto.randomUUID(), tarea.responsable_correo, 'asignacion_tarea', tarea.id, 'Nueva tarea recurrente', `${tarea.titulo} - vence el ${periodo}.`).run()
      }
      if (fueNueva) await base.prepare('INSERT INTO actividad (correo, accion, recurso, detalle) VALUES (?1, ?2, ?3, ?4)')
        .bind(recurrente.creado_por, 'generar tarea recurrente automática CMS', `tareas-recurrentes/${recurrente.id}`, `${tarea.titulo} - ${periodo}`).run()
      const proximaFecha = proximaFechaFutura(periodo, recurrente.frecuencia, hoy)
      await base.prepare('UPDATE tareas_recurrentes_cms SET proxima_fecha = ?2, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?1')
        .bind(recurrente.id, proximaFecha).run()
      await cerrarEjecucion(base, recurrente, periodo, { estado: 'completada', tareaId: tareaGenerada.id })
      if (fueNueva) generadas += 1
    } catch (fallo) {
      fallidas += 1
      try { await cerrarEjecucion(base, recurrente, periodo, { estado: 'fallida', error: String(fallo?.message || 'No se pudo ejecutar la rutina.').slice(0, 500) }) } catch { /* Conservamos el siguiente trabajo aunque el registro no esté disponible. */ }
    }
  }
  return { revisadas: recurrentes.length, generadas, fallidas, hoy }
}

export default {
  async fetch() {
    return new Response('No encontrado.', { status: 404 })
  },
  async scheduled(_controlador, env, contexto) {
    contexto.waitUntil(procesarTareasRecurrentes(env.BASE))
  },
}
