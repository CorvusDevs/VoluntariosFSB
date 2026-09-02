import { describe, expect, it } from 'vitest'
import { alertaComisionDirectivaCms, alertasInstitucionalesCms, clasificarTarea, decisionValida, esperaProlongada, eventoValido, horizonteInstitucionalCms, metricasOperativasCms, proyectosCompatiblesCms, proyectoValido, reunionValida, requiereSeguimiento, resumenSemanalCms, resumenTablero, tareaValida, unidadesCompatiblesCms } from '../../js/modelo/cms.js'

describe('núcleo CMS', () => {
  it('limita unidades y proyectos al contexto elegido', () => {
    const unidades = [
      { id: 'gaf', equipo_id: 'familias', estado: 'activa', vistas: [] },
      { id: 'fsb', equipo_id: 'deportes', estado: 'activa', vistas: [{ equipo_id: 'finanzas' }] },
      { id: 'vieja', equipo_id: 'familias', estado: 'archivada', vistas: [] },
    ]
    expect(unidadesCompatiblesCms(unidades, 'familias').map((fila) => fila.id)).toEqual(['gaf'])
    expect(unidadesCompatiblesCms(unidades, 'finanzas').map((fila) => fila.id)).toEqual(['fsb'])
    const proyectos = [
      { id: 'p-gaf', equipo_id: 'familias', unidad_id: 'gaf', estado: 'en_marcha' },
      { id: 'p-gwp', equipo_id: 'familias', unidad_id: 'gwp', estado: 'en_marcha' },
      { id: 'p-cerrado', equipo_id: 'familias', unidad_id: 'gaf', estado: 'cerrado' },
      { id: 'p-admin', equipo_id: 'administracion', unidad_id: 'gestoria', estado: 'en_marcha' },
    ]
    expect(proyectosCompatiblesCms(proyectos, { equipoId: 'familias' }).map((fila) => fila.id)).toEqual(['p-gaf', 'p-gwp'])
    expect(proyectosCompatiblesCms(proyectos, { equipoId: 'familias', unidadId: 'gaf' }).map((fila) => fila.id)).toEqual(['p-gaf'])
  })

  it('clasifica atrasos, espera y cierres sin depender de la interfaz', () => {
    expect(clasificarTarea({ estado: 'pendiente', fecha_limite: '2026-08-01' }, '2026-08-16')).toBe('atrasada')
    expect(clasificarTarea({ estado: 'esperando_respuesta' }, '2026-08-16')).toBe('esperando_respuesta')
    expect(clasificarTarea({ estado: 'completada' }, '2026-08-16')).toBe('cerrada')
  })

  it('resume prioridades reales del tablero', () => {
    expect(resumenTablero([
      { estado: 'pendiente', fecha_limite: '2026-08-01' },
      { estado: 'bloqueada', responsable_correo: 'equipo@aletea.org' },
      { estado: 'pendiente', fecha_seguimiento: '2026-08-16' },
    ], '2026-08-16')).toMatchObject({ total: 3, atrasada: 1, bloqueada: 1, sinResponsable: 2 })
  })

  it('marca seguimientos vencidos sin alertar tareas cerradas', () => {
    expect(requiereSeguimiento({ estado: 'en_marcha', fecha_seguimiento: '2026-08-16' }, '2026-08-16')).toBe(true)
    expect(requiereSeguimiento({ estado: 'completada', fecha_seguimiento: '2026-08-01' }, '2026-08-16')).toBe(false)
    expect(resumenTablero([{ estado: 'pendiente', fecha_seguimiento: '2026-08-15' }], '2026-08-16').seguimiento).toBe(1)
  })

  it('calcula métricas operativas con muestras y denominadores explícitos', () => {
    const metricas = metricasOperativasCms([
      { estado: 'pendiente', fecha_limite: '2026-08-14', fecha_seguimiento: '2026-08-15', creado_en: '2026-08-10 10:00:00', asignado_en: '2026-08-10 14:00:00' },
      { estado: 'bloqueada', fecha_limite: '2026-08-20', creado_en: '2026-08-11 10:00:00', asignado_en: '2026-08-11 12:00:00' },
      { estado: 'completada', creado_en: '2026-08-01 10:00:00', asignado_en: '2026-08-01 12:00:00', completado_en: '2026-08-03 10:00:00' },
    ], '2026-08-16')
    expect(metricas).toMatchObject({ abiertas: 2, atrasadas: 1, porcentajeAtrasadas: 50, bloqueadas: 1, seguimientosVencidos: 1, horasPromedioAsignacion: 2.7, horasPromedioCierre: 48, muestrasAsignacion: 3, muestrasCierre: 1 })
  })

  it('no acepta valores de estado o fecha inválidos', () => {
    expect(tareaValida({ titulo: 'Preparar reunión', estado: 'pendiente', prioridad: 'alta', fecha_limite: '2026-08-20' })).toBe(true)
    expect(tareaValida({ titulo: 'Preparar reunión', estado: 'perdida' })).toBe(false)
    expect(tareaValida({ titulo: 'Preparar reunión', fecha_limite: 'mañana' })).toBe(false)
    expect(tareaValida({ titulo: 'Pedir apoyo', tipo: 'solicitud' })).toBe(false)
    expect(tareaValida({ titulo: 'Pedir apoyo', tipo: 'solicitud', equipo_id: 'familias' })).toBe(true)
  })

  it('valida las fechas y el presupuesto de un proyecto', () => {
    expect(proyectoValido({ titulo: 'Escuela de familias', fecha_inicio: '2026-08-01', fecha_fin: '2026-10-01', presupuesto: 2500 })).toBe(true)
    expect(proyectoValido({ titulo: 'Escuela de familias', fecha_inicio: '2026-10-01', fecha_fin: '2026-08-01' })).toBe(false)
    expect(proyectoValido({ titulo: 'Escuela de familias', presupuesto: -1 })).toBe(false)
  })

  it('valida reuniones y decisiones trazables', () => {
    expect(reunionValida({ titulo: 'Coordinación semanal', fecha_hora: '2026-08-21T18:30' })).toBe(true)
    expect(reunionValida({ titulo: 'Coordinación semanal', fecha_hora: '2026-08-21' })).toBe(false)
    expect(decisionValida({ titulo: 'Priorizar accesibilidad', estado: 'vigente' })).toBe(true)
    expect(decisionValida({ titulo: '', estado: 'vigente' })).toBe(false)
  })

  it('valida actividades internas con fecha y estado', () => {
    expect(eventoValido({ titulo: 'Taller de juego', fecha_hora: '2026-09-04T17:30' })).toBe(true)
    expect(eventoValido({ titulo: 'Taller de juego', fecha_hora: '2026-09-04' })).toBe(false)
    expect(eventoValido({ titulo: 'Taller de juego', fecha_hora: '2026-02-30T17:30' })).toBe(false)
  })

  it('reúne solo la información abierta dentro de la semana revisable', () => {
    const resumen = resumenSemanalCms({
      tareas: [{ titulo: 'Atrasada', estado: 'pendiente', fecha_limite: '2026-08-14' }, { titulo: 'Esta semana', estado: 'pendiente', fecha_limite: '2026-08-20' }, { titulo: 'Lejana', estado: 'pendiente', fecha_limite: '2026-08-30' }],
      eventos: [{ titulo: 'Taller', estado: 'planificado', fecha_hora: '2026-08-21T15:00' }, { titulo: 'Pasado', estado: 'planificado', fecha_hora: '2026-08-10T15:00' }],
      decisiones: [{ titulo: 'Vigente', estado: 'vigente' }, { titulo: 'Superada', estado: 'superada' }],
      entradas: [{ nombre: 'Camila', tipo: 'voluntariado', estado: 'derivada' }, { nombre: 'Cerrada', tipo: 'evento', estado: 'cerrada' }],
    }, '2026-08-15')
    expect(resumen.atrasadas.map((fila) => fila.titulo)).toEqual(['Atrasada'])
    expect(resumen.proximas.map((fila) => fila.titulo)).toEqual(['Esta semana'])
    expect(resumen.actividades.map((fila) => fila.titulo)).toEqual(['Taller'])
    expect(resumen.decisiones.map((fila) => fila.titulo)).toEqual(['Vigente'])
    expect(resumen.entradas.map((fila) => fila.nombre)).toEqual(['Camila'])
  })

  it('resume el horizonte de dirección sin contar tareas cerradas', () => {
    const horizonte = horizonteInstitucionalCms({
      tareas: [{ titulo: 'Esta semana', estado: 'pendiente', fecha_limite: '2026-08-20' }, { titulo: 'Cerrada', estado: 'completada', fecha_limite: '2026-08-17' }],
      eventos: [{ titulo: 'Taller', estado: 'planificado', fecha_hora: '2026-08-21T15:00' }, { titulo: 'Lejano', estado: 'planificado', fecha_hora: '2026-10-01T15:00' }],
    }, '2026-08-15')
    expect(horizonte[0]).toMatchObject({ dias: 7, actividades: [{ titulo: 'Taller' }], vencimientos: [{ titulo: 'Esta semana' }] })
    expect(horizonte[3]).toMatchObject({ dias: 90, actividades: [{ titulo: 'Taller' }, { titulo: 'Lejano' }] })
  })

  it('limita las alertas a acciones institucionales prioritarias', () => {
    const alertas = alertasInstitucionalesCms({
      tareas: [{ titulo: 'Resolver sede', estado: 'pendiente', fecha_limite: '2026-08-14', responsable_correo: 'equipo@aletea.org' }, { titulo: 'Esperar respuesta', estado: 'bloqueada', responsable_correo: 'equipo@aletea.org' }],
      riesgos: [{ titulo: 'Sin transporte', nivel: 'critico', estado: 'abierto', proyecto_titulo: 'Jornada' }],
      conflictos: [{ evento_a_titulo: 'Taller', evento_b_titulo: 'Reunión' }],
    }, '2026-08-15')
    expect(alertas.map((alerta) => alerta.titulo)).toEqual(['Riesgo critico: Sin transporte', 'Conflicto de agenda', 'Tarea atrasada: Resolver sede', 'Tarea bloqueada: Esperar respuesta'])
    expect(alertas[0].clave).toBe('riesgos:Riesgo critico: Sin transporte')
  })

  it('detecta esperas vencidas y trabajo sin una persona responsable', () => {
    expect(esperaProlongada({ estado: 'esperando_respuesta', fecha_seguimiento: '2026-08-14' }, '2026-08-15')).toBe(true)
    expect(esperaProlongada({ estado: 'esperando_respuesta', actualizado_en: '2026-08-07 18:00:00' }, '2026-08-15')).toBe(true)
    expect(esperaProlongada({ estado: 'esperando_respuesta', actualizado_en: '2026-08-10 18:00:00' }, '2026-08-15')).toBe(false)
    const alertas = alertasInstitucionalesCms({ tareas: [
      { titulo: 'Confirmar apoyo', estado: 'pendiente', equipo_nombre: 'Familias' },
      { titulo: 'Respuesta de proveedor', estado: 'esperando_respuesta', responsable_correo: 'claudia@aletea.org', fecha_seguimiento: '2026-08-14' },
    ] }, '2026-08-15')
    expect(alertas.map((alerta) => alerta.titulo)).toContain('Tarea sin responsable: Confirmar apoyo')
    expect(alertas.map((alerta) => alerta.titulo)).toContain('Espera prolongada: Respuesta de proveedor')
  })

  it('alerta las decisiones a revisar, proyectos sin responsable y actividades próximas sin preparación', () => {
    const alertas = alertasInstitucionalesCms({
      decisiones: [{ titulo: 'Definir sede', estado: 'a_revisar', reunion_titulo: 'Dirección' }],
      proyectos: [{ titulo: 'Escuela de familias', estado: 'en_marcha', equipo_nombre: 'Familias' }],
      eventos: [{ id: 'ev1', titulo: 'Taller abierto', estado: 'planificado', fecha_hora: '2026-08-20T15:00' }],
      tareas: [],
    }, '2026-08-15')
    expect(alertas.map((alerta) => alerta.titulo)).toContain('Decisión a revisar: Definir sede')
    expect(alertas.map((alerta) => alerta.titulo)).toContain('Proyecto sin responsable: Escuela de familias')
    expect(alertas.map((alerta) => alerta.titulo)).toContain('Actividad próxima sin tareas: Taller abierto')
  })

  it('alerta vencimientos próximos sin tarea asignada', () => {
    const alertas = alertasInstitucionalesCms({
      eventos: [{ id: 'pago1', titulo: 'Renovar seguro', tipo: 'renovacion', estado: 'planificado', fecha_hora: '2026-08-20T10:00' }],
      tareas: [],
    }, '2026-08-15')
    expect(alertas.map((alerta) => alerta.titulo)).toContain('Vencimiento próximo sin tarea: Renovar seguro')
  })

  it('controla la reunión mensual solo si existe Comisión Directiva', () => {
    const equipos = [{ id: 'cd', categoria: 'comision_directiva' }]
    expect(alertaComisionDirectivaCms({ equipos, reuniones: [] }, '2026-08-17')?.titulo).toContain('Comisión Directiva')
    expect(alertaComisionDirectivaCms({ equipos, reuniones: [{ equipo_categoria: 'comision_directiva', estado: 'planificada', fecha_hora: '2026-08-28T19:00' }] }, '2026-08-17')).toBeNull()
    expect(alertaComisionDirectivaCms({ equipos: [], reuniones: [] }, '2026-08-17')).toBeNull()
  })
})
