import { describe, expect, it } from 'vitest'
import { procesarTareasRecurrentes, siguienteFechaRecurrente } from '../../workers/automatizacion-interna.js'

function baseDe(recurrentes) {
  const tareas = []
  const actividad = []
  const notificaciones = []
  const ejecuciones = []
  return {
    tareas, actividad, notificaciones, ejecuciones, recurrentes,
    prepare(sql) {
      return {
        bind(...valores) {
          return {
            async all() {
              return { results: recurrentes.filter((fila) => fila.activo && fila.proxima_fecha <= valores[0]) }
            },
            async first() {
              if (sql.includes('SELECT id FROM tareas_cms')) return tareas.find((fila) => fila.recurrencia_id === valores[0] && fila.generada_para === valores[1]) || null
              throw new Error(`Consulta no esperada: ${sql}`)
            },
            async run() {
              if (sql.includes('INSERT INTO automatizaciones_ejecuciones_cms')) {
                const existente = ejecuciones.find((fila) => fila.recurrencia_id === valores[1] && fila.periodo === valores[2])
                if (existente) {
                  existente.estado = 'procesando'; existente.intentos += 1; existente.error = null
                } else ejecuciones.push({ recurrencia_id: valores[1], periodo: valores[2], estado: 'procesando', intentos: 1, error: null, tarea_id: null })
                return { meta: { changes: 1 } }
              }
              if (sql.includes('UPDATE automatizaciones_ejecuciones_cms')) {
                const ejecucion = ejecuciones.find((fila) => fila.recurrencia_id === valores[0] && fila.periodo === valores[1])
                if (ejecucion) Object.assign(ejecucion, { estado: valores[2], error: valores[3], tarea_id: valores[4] })
                return { meta: { changes: ejecucion ? 1 : 0 } }
              }
              if (sql.includes('INSERT OR IGNORE INTO tareas_cms')) {
                const existente = tareas.some((fila) => fila.recurrencia_id === valores[11] && fila.generada_para === valores[12])
                if (existente) return { meta: { changes: 0 } }
                tareas.push({ id: valores[0], titulo: valores[1], fecha_limite: valores[9], creado_por: valores[10], recurrencia_id: valores[11], generada_para: valores[12] })
                return { meta: { changes: 1 } }
              }
              if (sql.startsWith('UPDATE tareas_recurrentes_cms')) {
                recurrentes.find((fila) => fila.id === valores[0]).proxima_fecha = valores[1]
                return { meta: { changes: 1 } }
              }
              if (sql.includes('INSERT INTO notificaciones_cms')) {
                notificaciones.push({ usuario_correo: valores[1], tarea_id: valores[3] })
                return { meta: { changes: 1 } }
              }
              if (sql.includes('INSERT INTO actividad')) {
                actividad.push({ correo: valores[0], accion: valores[1], detalle: valores[3] })
                return { meta: { changes: 1 } }
              }
              throw new Error(`Consulta no esperada: ${sql}`)
            },
          }
        },
      }
    },
  }
}

describe('automatización interna', () => {
  it('conserva el día al avanzar una rutina mensual', () => {
    expect(siguienteFechaRecurrente('2026-01-31', 'mensual')).toBe('2026-02-28')
    expect(siguienteFechaRecurrente('2026-12-31', 'mensual')).toBe('2027-01-31')
    expect(siguienteFechaRecurrente('2026-08-22', 'semanal')).toBe('2026-08-29')
  })

  it('crea una sola tarea trazable y salta períodos ya vencidos', async () => {
    const base = baseDe([{ id: 'r1', titulo: 'Revisar agenda', descripcion: 'Verificar la semana.', prioridad: 'alta', frecuencia: 'semanal', proxima_fecha: '2026-08-03', equipo_id: 'e1', proyecto_id: null, responsable_correo: 'ana@aletea.org', creado_por: 'claudia@aletea.org', activo: 1 }])
    await expect(procesarTareasRecurrentes(base, { hoy: '2026-08-17' })).resolves.toMatchObject({ revisadas: 1, generadas: 1, fallidas: 0 })
    expect(base.tareas).toHaveLength(1)
    expect(base.tareas[0]).toMatchObject({ recurrencia_id: 'r1', generada_para: '2026-08-03', fecha_limite: '2026-08-03' })
    expect(base.recurrentes[0].proxima_fecha).toBe('2026-08-24')
    expect(base.notificaciones).toHaveLength(1)
    expect(base.actividad[0].accion).toContain('automática')
    expect(base.ejecuciones).toEqual([expect.objectContaining({ recurrencia_id: 'r1', periodo: '2026-08-03', estado: 'completada', intentos: 1 })])
    await expect(procesarTareasRecurrentes(base, { hoy: '2026-08-17' })).resolves.toMatchObject({ revisadas: 0, generadas: 0 })
  })

  it('conserva la fecha pendiente y deja un reintento visible si falla una rutina', async () => {
    const base = baseDe([{ id: 'r1', titulo: 'Revisar agenda', descripcion: '', prioridad: 'alta', frecuencia: 'semanal', proxima_fecha: '2026-08-17', equipo_id: 'e1', proyecto_id: null, responsable_correo: 'ana@aletea.org', creado_por: 'claudia@aletea.org', activo: 1 }])
    let debeFallar = true
    const prepararOriginal = base.prepare.bind(base)
    base.prepare = (sql) => {
      const consulta = prepararOriginal(sql)
      if (!sql.includes('INSERT INTO notificaciones_cms')) return consulta
      return { bind: (...valores) => ({ run: async () => {
        if (debeFallar) throw new Error(`No se pudo avisar a ${valores[1]}.`)
        base.notificaciones.push({ usuario_correo: valores[1], tarea_id: valores[3] })
        return { meta: { changes: 1 } }
      } }) }
    }

    await expect(procesarTareasRecurrentes(base, { hoy: '2026-08-17' })).resolves.toMatchObject({ revisadas: 1, generadas: 0, fallidas: 1 })
    expect(base.recurrentes[0].proxima_fecha).toBe('2026-08-17')
    expect(base.ejecuciones).toEqual([expect.objectContaining({ estado: 'fallida', intentos: 1, error: expect.stringContaining('No se pudo avisar') })])

    debeFallar = false
    await expect(procesarTareasRecurrentes(base, { hoy: '2026-08-17' })).resolves.toMatchObject({ revisadas: 1, generadas: 0, fallidas: 0 })
    expect(base.recurrentes[0].proxima_fecha).toBe('2026-08-24')
    expect(base.ejecuciones).toEqual([expect.objectContaining({ estado: 'completada', intentos: 2, tarea_id: base.tareas[0].id })])
  })
})
