import { describe, expect, it } from 'vitest'
import { cierreTareaCmsDesde } from '../../functions/api/[[ruta]].js'
import { actividadCmsSinDatosDeEntradas, alianzaCmsDesde, asegurarFormularioPruebaCms, avanceSolicitudPrivacidadCms, cabecerasFormularioPublico, camposFormularioCmsDesde, capacidadTrabajoCmsDesde, cierreReunionCmsDesde, comentarioTareaCmsDesde, comunicadoCmsDesde, compromisoPagoFsbDesde, configuracionFinanzasFsb, conflictoAgendaCms, conflictosAgendaCms, consentimientoFormularioPublicoValido, cuentaFsbDesde, datosTareaSinSeguimientoPersonalAjeno, decisionCmsDesde, derivarEntradaCms, documentoCmsDesde, entradaCmsDesde, equipoCmsDesde, esperaIntentoIngreso, eventoCmsDesde, eventoCmsSinDatosDeEntrada, eventosRecurrentesCmsDesde, fechaActualCms, fechaCmsValida, fechaHoraCmsValida, formularioCmsDesde, formulariosPruebaCms, gastoProyectoCmsDesde, gruposConflictosAgendaCms, hitoProyectoCmsDesde, idCuentaFsbVinculable, movimientoFsbDesde, notificacionCmsSinDatosDeFormulario, perfilAccesoDe, plantillaTareasCmsDesde, puedeAccederFinanzasFsb, puedeGestionarFinanzasFsb, puedeGestionarSolicitudesPrivacidadCms, puedeVerAuditoria, puedeVerDocumentoCms, puedeVerRespuestasCms, puedeVerTareaCms, programaCmsDesde, proyectoCmsDesde, referenciasCmsValidas, reservarEnvioFormularioPublico, respuestaFormularioCmsDesde, reunionCmsDesde, reunionesRecurrentesCmsDesde, responsabilidadCmsDesde, responsableSolicitudDe, revisionSemanalCmsDesde, riesgoProyectoCmsDesde, siguienteFechaRecurrenteCms, solicitudPrivacidadCmsDesde, tareaCmsDesde, tareaCmsSinDatosDeFormulario, tareaCmsSinSeguimientoPersonalAjeno, tareaRecurrenteCmsDesde, unidadOperativaCmsDesde, vigenciaCuentaDesde, vigenciaDatosPersonalesDesde } from '../../functions/api/[[ruta]].js'

describe('validación del CMS en Cloudflare', () => {
  it('mantiene visible para quien la creó una tarea ya completada aunque no pertenezca a su equipo', () => {
    const alcance = { global: false, perfil: 'coordinacion', equipos: new Set(['familias']) }
    const tarea = { creado_por: 'claudia@aletea.org', responsable_correo: 'ale@aletea.org', equipo_id: null, estado: 'completada' }
    expect(puedeVerTareaCms(alcance, { correo: 'claudia@aletea.org' }, tarea)).toBe(true)
    expect(puedeVerTareaCms(alcance, { correo: 'otra@aletea.org' }, tarea)).toBe(false)
  })

  it('prepara un cierre con nota, resuelve el aviso propio y notifica a quien asignó', () => {
    expect(cierreTareaCmsDesde(
      { estado: 'completada', comentario_cierre: 'Se entregó el informe final.' },
      { creado_por: 'coordinacion@aletea.org' },
      'responsable@aletea.org',
    )).toEqual({
      comentario: 'Se entregó el informe final.',
      resolver_aviso: true,
      notificar_a: 'coordinacion@aletea.org',
    })
    expect(cierreTareaCmsDesde({ estado: 'completada', comentario_cierre: '   ' }, { creado_por: 'responsable@aletea.org' }, 'responsable@aletea.org'))
      .toEqual({ comentario: '', resolver_aviso: true, notificar_a: null })
    expect(cierreTareaCmsDesde({ estado: 'pendiente', comentario_cierre: 'No debe guardarse' }, { creado_por: 'coordinacion@aletea.org' }, 'responsable@aletea.org'))
      .toEqual({ comentario: '', resolver_aviso: false, notificar_a: null })
  })

  it('protege las cuentas corrientes con acceso sensible vigente y pertenencia a Finanzas', () => {
    const cuenta = { perfil_acceso: 'coordinacion', nivel_datos_personales: 'sensible', datos_personales_hasta: '2999-12-31' }
    expect(puedeAccederFinanzasFsb(cuenta, { global: false, equipos: new Set(['finanzas']) }, 'finanzas')).toBe(true)
    expect(puedeGestionarFinanzasFsb(cuenta, { global: false, equipos: new Set(['finanzas']) }, 'finanzas')).toBe(true)
    expect(puedeAccederFinanzasFsb({ ...cuenta, nivel_datos_personales: 'operativo' }, { global: true, equipos: new Set() }, 'finanzas')).toBe(false)
    expect(puedeAccederFinanzasFsb(cuenta, { global: false, equipos: new Set(['deportes']) }, 'finanzas')).toBe(false)
    expect(puedeGestionarFinanzasFsb({ ...cuenta, perfil_acceso: 'integrante' }, { global: false, equipos: new Set(['finanzas']) }, 'finanzas')).toBe(false)
  })

  it('distingue una vigencia temporal de una concesión indefinida explícita', () => {
    expect(vigenciaDatosPersonalesDesde({ nivel: 'sensible', vigencia: 'indefinida' })).toEqual({ vigencia: 'indefinida', hastaGuardado: null, sinVencimiento: 1 })
    expect(vigenciaDatosPersonalesDesde({ nivel: 'sensible', vigencia: 'temporal', hasta: '2999-12-31' })).toEqual({ vigencia: 'temporal', hastaGuardado: '2999-12-31', sinVencimiento: 0 })
    expect(vigenciaDatosPersonalesDesde({ nivel: 'sensible' }).error).toContain('Elegí si')
    expect(vigenciaDatosPersonalesDesde({ nivel: 'sensible', vigencia: 'temporal', hasta: '2000-01-01' }).error).toContain('fecha válida')
    expect(vigenciaDatosPersonalesDesde({ nivel: 'ninguno', vigencia: 'indefinida' })).toEqual({ vigencia: 'ninguna', hastaGuardado: null, sinVencimiento: 0 })
  })

  it('valida la duración de una cuenta antes de crearla', () => {
    expect(vigenciaCuentaDesde({ vigencia: 'indefinida' })).toEqual({ vigencia: 'indefinida', hastaGuardado: null })
    expect(vigenciaCuentaDesde({ vigencia: 'temporal', hasta: '2999-12-31' })).toEqual({ vigencia: 'temporal', hastaGuardado: '2999-12-31' })
    expect(vigenciaCuentaDesde({ vigencia: 'temporal', hasta: '2000-01-01' }).error).toContain('fecha válida')
  })

  it('valida cuentas y firma cargos y pagos antes de guardarlos', () => {
    expect(cuentaFsbDesde({ nombre: 'Camila Pérez', grupo: '1', condicion: 'beca', beca_porcentaje: '50' }).cuenta)
      .toMatchObject({ nombre: 'Camila Pérez', grupo: 1, condicion: 'beca', beca_porcentaje: 50 })
    expect(cuentaFsbDesde({ nombre: 'Camila', grupo: '3' }).error).toContain('grupo')
    expect(movimientoFsbDesde({ cuenta_id: 'c1', tipo: 'cargo', concepto: 'Cuota agosto', periodo: '2026-08', fecha: '2026-08-01', vencimiento: '2026-08-10', importe: '2500' }).movimiento.importe_centavos).toBe(250000)
    expect(movimientoFsbDesde({ cuenta_id: 'c1', tipo: 'pago', concepto: 'Pago recibido', periodo: '2026-08', fecha: '2026-08-15', importe: '1000', medio_pago: 'transferencia' }).movimiento.importe_centavos).toBe(-100000)
    expect(movimientoFsbDesde({ cuenta_id: 'c1', tipo: 'pago', concepto: 'Pago recibido', periodo: '2026-08', fecha: '2026-08-15', importe: '1000' }).error).toContain('recibió')
    expect(movimientoFsbDesde({ cuenta_id: 'c1', tipo: 'pago', concepto: 'Pago', fecha: '2026-02-30', importe: '1000' }).error).toContain('fecha')
    expect(cuentaFsbDesde({ grupo: '2', condicion: 'baja', activa: false }, { nombre: 'Camila Pérez', grupo: 1, condicion: 'regular', beca_porcentaje: 0, activa: 1 }).cuenta)
      .toMatchObject({ nombre: 'Camila Pérez', grupo: 2, condicion: 'baja', activa: 0 })
  })

  it('detecta los pasos pendientes de la configuración financiera', () => {
    const configuracion = configuracionFinanzasFsb({ participantes: [{ id: 'p1', nombre: 'Ana', activo: true }, { id: 'p2', nombre: 'Luz', activo: true }] }, [
      { id: 'c1', persona_id: 'p1', nombre: 'Ana', grupo: null, condicion: 'beca', beca_porcentaje: 0, activa: 1 },
    ], [], '2026-08-26')
    expect(configuracion.participantes_sin_cuenta).toEqual([{ id: 'p2', nombre: 'Luz' }])
    expect(configuracion.participantes_sin_grupo).toHaveLength(1)
    expect(configuracion.becas_sin_porcentaje).toHaveLength(1)
    expect(configuracion.mes_actual_generado).toBe(false)
  })

  it('reutiliza una única cuenta heredada por nombre y grupo sin crear duplicados', () => {
    const persona = { id: 'p1', nombre: 'María Pérez', grupo: 1 }
    expect(idCuentaFsbVinculable(persona, [{ id: 'c1', persona_id: null, nombre: 'Maria Perez', grupo: 1 }])).toBe('c1')
    expect(idCuentaFsbVinculable(persona, [
      { id: 'c1', persona_id: null, nombre: 'María Pérez', grupo: 1 },
      { id: 'c2', persona_id: null, nombre: 'Maria Perez', grupo: 1 },
    ])).toBeNull()
    expect(idCuentaFsbVinculable(persona, [{ id: 'c1', persona_id: null, nombre: 'María Pérez', grupo: 2 }])).toBeNull()
  })

  it('valida compromisos sin convertirlos en cargos', () => {
    expect(compromisoPagoFsbDesde({ cuenta_id: 'c1', importe: '2500', fecha_acuerdo: '2026-08-20', fecha_prevista: '2026-08-30', nota: 'Transferencia' }).compromiso)
      .toMatchObject({ cuenta_id: 'c1', importe_centavos: 250000, fecha_prevista: '2026-08-30' })
    expect(compromisoPagoFsbDesde({ cuenta_id: 'c1', importe: '', fecha_acuerdo: '2026-08-20', fecha_prevista: '2026-08-30' }).compromiso.importe_centavos).toBeNull()
    expect(compromisoPagoFsbDesde({ cuenta_id: 'c1', fecha_acuerdo: '2026-08-30', fecha_prevista: '2026-08-20' }).error).toContain('posterior')
  })

  it('aplica una espera progresiva sin bloquear prematuramente direcciones compartidas', () => {
    expect(esperaIntentoIngreso(4, 'usuario')).toBe(0)
    expect(esperaIntentoIngreso(5, 'usuario')).toBe(60)
    expect(esperaIntentoIngreso(7, 'usuario')).toBe(900)
    expect(esperaIntentoIngreso(19, 'direccion')).toBe(0)
    expect(esperaIntentoIngreso(20, 'direccion')).toBe(60)
    expect(esperaIntentoIngreso(100, 'usuario')).toBe(3600)
  })
  it('calcula el día institucional en Uruguay aunque UTC ya haya cambiado', () => {
    expect(fechaActualCms(new Date('2026-08-20T01:30:00Z'))).toBe('2026-08-19')
  })

  it('solo acepta un lunes real como inicio de la revisión semanal', () => {
    expect(revisionSemanalCmsDesde({ semana_inicio: '2026-08-17', nota: 'Seguimiento al día' }).revision)
      .toMatchObject({ semana_inicio: '2026-08-17', nota: 'Seguimiento al día' })
    expect(revisionSemanalCmsDesde({ semana_inicio: '2026-02-30' }).error).toContain('fecha')
    expect(revisionSemanalCmsDesde({ semana_inicio: '2026-08-18' }).error).toContain('lunes')
  })

  it('rechaza una fecha inexistente antes de escribir en D1', () => {
    expect(fechaCmsValida('2026-02-29')).toBe(false)
    expect(fechaCmsValida('2028-02-29')).toBe(true)
    expect(tareaCmsDesde({ titulo: 'Revisar presupuesto', fecha_limite: '2026-02-29' }).error).toContain('fechas')
  })

  it('valida comunicados internos con vencimiento opcional', () => {
    expect(comunicadoCmsDesde({ titulo: 'Cambio de horario', detalle: 'La actividad comienza a las 10.', prioridad: 'urgente', equipo_id: 'familias', vence_el: '2026-09-04' }).comunicado)
      .toMatchObject({ titulo: 'Cambio de horario', prioridad: 'urgente', equipo_id: 'familias' })
    expect(comunicadoCmsDesde({ titulo: 'Cambio', prioridad: 'inmediata' }).error).toContain('prioridad')
    expect(comunicadoCmsDesde({ titulo: 'Cambio', vence_el: '2026-02-30' }).error).toContain('fecha')
  })

  it('conserva los valores existentes al actualizar una tarea parcialmente', () => {
    const resultado = tareaCmsDesde({ estado: 'bloqueada' }, {
      titulo: 'Coordinar transporte', tipo: 'tarea', estado: 'pendiente', prioridad: 'normal', fecha_limite: '2026-09-10',
    })
    expect(resultado.tarea).toMatchObject({ titulo: 'Coordinar transporte', estado: 'bloqueada', fecha_limite: '2026-09-10', evento_id: null })
  })

  it('mantiene el seguimiento personal dentro de la tarea y exige un motivo válido', () => {
    expect(tareaCmsDesde({ titulo: 'Hablar con Claudia', seguimiento_personal: true, motivo_seguimiento: 'hablar_con_alguien' }).tarea)
      .toMatchObject({ seguimiento_personal: 1, motivo_seguimiento: 'hablar_con_alguien' })
    expect(tareaCmsDesde({ titulo: 'Revisar', seguimiento_personal: true, motivo_seguimiento: 'otro' }).error).toContain('motivo')
    expect(tareaCmsDesde({ titulo: 'Revisar', seguimiento_personal: false, motivo_seguimiento: 'no_olvidar' }).tarea)
      .toMatchObject({ seguimiento_personal: 0, motivo_seguimiento: '', seguimiento_personal_por: null })
  })

  it('no entrega el seguimiento personal a otra cuenta', () => {
    const tarea = { id: 't1', seguimiento_personal: 1, motivo_seguimiento: 'no_olvidar', seguimiento_personal_por: 'ale@aletea.org' }
    expect(tareaCmsSinSeguimientoPersonalAjeno(tarea, 'ale@aletea.org')).toEqual(tarea)
    expect(tareaCmsSinSeguimientoPersonalAjeno(tarea, 'claudia@aletea.org')).toMatchObject({ seguimiento_personal: 0, motivo_seguimiento: '', seguimiento_personal_por: null })
    expect(datosTareaSinSeguimientoPersonalAjeno({ titulo: 'Cambio', seguimiento_personal: false, motivo_seguimiento: '' }, tarea, 'claudia@aletea.org'))
      .toEqual({ titulo: 'Cambio' })
  })

  it('valida el cierre guiado con acuerdos y tareas opcionales', () => {
    const cierre = cierreReunionCmsDesde({ minuta: 'Participaron Dirección y Familias.', resumen: 'Se acordó confirmar el salón.', proxima_revision: '2026-09-01', acuerdos: [{ titulo: 'Confirmar salón', motivo: 'Evitar conflicto de agenda', responsable_correo: 'claudia@aletea.org', crear_tarea: true, fecha_limite: '2026-08-30' }] })
    expect(cierre.cierre.acuerdos[0]).toMatchObject({ titulo: 'Confirmar salón', crear_tarea: true, fecha_limite: '2026-08-30' })
    expect(cierreReunionCmsDesde({ minuta: '', resumen: '' }).error).toContain('minuta')
    expect(cierreReunionCmsDesde({ minuta: 'Texto', resumen: 'Texto', acuerdos: [{ titulo: 'Acuerdo', fecha_limite: '2026-02-30' }] }).error).toContain('fecha')
  })

  it('valida esfuerzo y disponibilidad sin inventar horas faltantes', () => {
    expect(tareaCmsDesde({ titulo: 'Preparar jornada', esfuerzo_horas: '2.5' }).tarea.esfuerzo_horas).toBe(2.5)
    expect(tareaCmsDesde({ titulo: 'Preparar jornada', esfuerzo_horas: '' }).tarea.esfuerzo_horas).toBeNull()
    expect(tareaCmsDesde({ titulo: 'Preparar jornada', esfuerzo_horas: '200' }).error).toContain('esfuerzo')
    expect(capacidadTrabajoCmsDesde({ usuario_correo: 'Claudia@Aletea.org', horas_semanales: '8', nota: 'Dos tardes' }).capacidad)
      .toMatchObject({ usuario_correo: 'claudia@aletea.org', horas_semanales: 8, nota: 'Dos tardes' })
    expect(capacidadTrabajoCmsDesde({ usuario_correo: 'claudia@aletea.org', horas_semanales: '81' }).error).toContain('80')
  })

  it('rechaza un proyecto con fechas invertidas o presupuesto negativo', () => {
    expect(proyectoCmsDesde({ titulo: 'Escuela de familias', fecha_inicio: '2026-10-01', fecha_fin: '2026-08-01' }).error).toContain('cierre')
    expect(proyectoCmsDesde({ titulo: 'Escuela de familias', presupuesto: -5 }).error).toContain('presupuesto')
  })

  it('genera una serie semanal conservando hora y duración', () => {
    const resultado = eventosRecurrentesCmsDesde({
      titulo: 'Diplomatura segundo año',
      fecha_hora: '2026-08-19T18:00',
      fecha_fin: '2026-08-19T20:00',
      frecuencia_evento: 'semanal',
      repetir_hasta: '2026-09-02',
    })
    expect(resultado.eventos.map((evento) => evento.fecha_hora)).toEqual([
      '2026-08-19T18:00',
      '2026-08-26T18:00',
      '2026-09-02T18:00',
    ])
    expect(resultado.eventos.map((evento) => evento.fecha_fin)).toEqual([
      '2026-08-19T20:00',
      '2026-08-26T20:00',
      '2026-09-02T20:00',
    ])
    expect(new Set(resultado.eventos.map((evento) => evento.serie_id))).toHaveLength(1)
  })

  it('limita las series recurrentes a un año y ajusta correctamente los meses cortos', () => {
    const mensual = eventosRecurrentesCmsDesde({
      titulo: 'Cierre mensual', fecha_hora: '2026-01-31T17:00', frecuencia_evento: 'mensual', repetir_hasta: '2026-03-31',
    })
    expect(mensual.eventos.map((evento) => evento.fecha_hora)).toEqual(['2026-01-31T17:00', '2026-02-28T17:00', '2026-03-31T17:00'])
    expect(eventosRecurrentesCmsDesde({ titulo: 'Serie extensa', fecha_hora: '2026-01-01T10:00', frecuencia_evento: 'mensual', repetir_hasta: '2027-02-01' }).error).toContain('un año')
  })

  it('registra una alianza institucional sin aceptar tipos o estados arbitrarios', () => {
    expect(alianzaCmsDesde({ nombre: 'Red de organizaciones locales', tipo: 'red', estado: 'activa', equipo_id: 'familias', contacto_institucional: 'contacto@red.uy' }).alianza)
      .toMatchObject({ nombre: 'Red de organizaciones locales', tipo: 'red', estado: 'activa', equipo_id: 'familias', contacto_institucional: 'contacto@red.uy' })
    expect(alianzaCmsDesde({ nombre: 'Red', tipo: 'contacto' }).error).toContain('tipo')
    expect(alianzaCmsDesde({ nombre: 'Red', estado: 'eliminada' }).error).toContain('estado')
  })

  it('valida programas institucionales antes de crear o actualizar', () => {
    expect(programaCmsDesde({ nombre: 'Familias y comunidad', estado: 'activo', equipo_id: 'familias' }).programa)
      .toMatchObject({ nombre: 'Familias y comunidad', estado: 'activo', equipo_id: 'familias' })
    expect(programaCmsDesde({ nombre: 'Familias', estado: 'archivado' }).error).toContain('estado')
  })

  it('valida un riesgo con responsable y fecha de revisión', () => {
    expect(riesgoProyectoCmsDesde({ titulo: 'Confirmación del local', nivel: 'alto', responsable_correo: 'marce@aletea.org', fecha_revision: '2026-09-04' }).riesgo)
      .toMatchObject({ titulo: 'Confirmación del local', nivel: 'alto', estado: 'abierto', fecha_revision: '2026-09-04' })
    expect(riesgoProyectoCmsDesde({ titulo: 'Confirmación del local', nivel: 'inmediato' }).error).toContain('nivel')
    expect(riesgoProyectoCmsDesde({ titulo: 'Confirmación del local', fecha_revision: '2026-02-30' }).error).toContain('fecha')
  })

  it('valida hitos y gastos antes de registrarlos en un proyecto', () => {
    expect(hitoProyectoCmsDesde({ titulo: 'Confirmar equipos', fecha_objetivo: '2026-09-04', estado: 'en_marcha' }).hito)
      .toMatchObject({ titulo: 'Confirmar equipos', fecha_objetivo: '2026-09-04', estado: 'en_marcha' })
    expect(hitoProyectoCmsDesde({ titulo: 'Confirmar equipos', estado: 'otro' }).error).toContain('estado')
    expect(gastoProyectoCmsDesde({ concepto: 'Traslado', monto: '1250', fecha: '2026-09-04' }).gasto)
      .toMatchObject({ concepto: 'Traslado', monto: 1250, fecha: '2026-09-04' })
    expect(gastoProyectoCmsDesde({ concepto: 'Traslado', monto: '', fecha: '2026-09-04' }).error).toContain('monto')
    expect(gastoProyectoCmsDesde({ concepto: 'Traslado', monto: '-1', fecha: '2026-09-04' }).error).toContain('monto')
    expect(gastoProyectoCmsDesde({ concepto: 'Traslado', monto: '1250' }).error).toContain('fecha')
  })

  it('valida una responsabilidad de equipo antes de escribir en D1', () => {
    expect(responsabilidadCmsDesde({ equipo_id: 'familias', usuario_correo: 'marce@aletea.org', tipo: 'coordinacion' }).responsabilidad)
      .toMatchObject({ equipo_id: 'familias', usuario_correo: 'marce@aletea.org', tipo: 'coordinacion' })
    expect(responsabilidadCmsDesde({ equipo_id: 'familias', usuario_correo: 'marce@aletea.org', tipo: 'otro' }).error).toContain('tipo')
  })

  it('mantiene el mapa operativo de cada equipo y rechaza frecuencias inválidas', () => {
    expect(equipoCmsDesde({ nombre: 'Familias', categoria: 'comision_directiva', color: '#0b806f', frecuencia_reunion: 'quincenal', informa_a: 'Dirección', decisiones_permitidas: 'Definir dinámica', debe_escalar: 'Cambios de presupuesto' }).equipo)
      .toMatchObject({ nombre: 'Familias', categoria: 'comision_directiva', frecuencia_reunion: 'quincenal', informa_a: 'Dirección' })
    expect(equipoCmsDesde({ frecuencia_reunion: 'diaria' }, { nombre: 'Familias', color: '#0b806f' }).error).toContain('frecuencia')
    expect(equipoCmsDesde({ categoria: 'otra' }, { nombre: 'Familias', color: '#0b806f' }).error).toContain('categoría')
  })

  it('normaliza y valida unidades operativas sin confundirlas con equipos', () => {
    expect(unidadOperativaCmsDesde({ clave: 'DAEA 1º', nombre: 'DAEA 1º', sigla: 'DAEA 1º', tipo: 'formacion', equipo_id: 'capacitaciones', color: '#19bf43', orden: 10 }).unidad)
      .toMatchObject({ clave: 'daea_1', nombre: 'DAEA 1º', tipo: 'formacion', equipo_id: 'capacitaciones' })
    expect(unidadOperativaCmsDesde({ clave: 'fsb', nombre: 'Fútbol sin Barreras', tipo: 'equipo', equipo_id: 'deportes' }).error).toContain('tipo')
    expect(unidadOperativaCmsDesde({ clave: 'gaf', nombre: '', equipo_id: 'familias' }).error).toContain('nombre')
  })

  it('conserva la unidad operativa en cada contenido vinculado', () => {
    expect(documentoCmsDesde({ titulo: 'Guía FSB', url: 'https://aletea.org/guia', tipo: 'guia', sensibilidad: 'interno', equipo_id: 'deportes', unidad_id: 'unidad-fsb' }).documento.unidad_id).toBe('unidad-fsb')
    expect(formularioCmsDesde({ titulo: 'Inscripción FSB', tipo: 'inscripcion', equipo_id: 'deportes', unidad_id: 'unidad-fsb' }).formulario.unidad_id).toBe('unidad-fsb')
    expect(reunionCmsDesde({ titulo: 'Coordinación FSB', fecha_hora: '2026-09-03T18:00', equipo_id: 'deportes', unidad_id: 'unidad-fsb' }).reunion.unidad_id).toBe('unidad-fsb')
    expect(eventoCmsDesde({ titulo: 'Entrenamiento FSB', fecha_hora: '2026-09-05T11:00', equipo_id: 'deportes', unidad_id: 'unidad-fsb' }).evento.unidad_id).toBe('unidad-fsb')
  })

  it('exige objetivo y destino para una propuesta institucional', () => {
    expect(entradaCmsDesde({ tipo: 'propuesta', nombre: 'Taller accesible' }).error).toContain('propuesta')
    expect(entradaCmsDesde({
      tipo: 'propuesta',
      nombre: 'Taller accesible',
      objetivo: 'Acercar recursos',
      pasos: 'Convocar y realizar el taller',
      recursos: 'Sala accesible y materiales',
      personas_necesarias: 'Dos facilitadores',
      equipo_id: 'familias',
    }).entrada).toMatchObject({
      objetivo: 'Acercar recursos',
      pasos: 'Convocar y realizar el taller',
      recursos: 'Sala accesible y materiales',
      personas_necesarias: 'Dos facilitadores',
      equipo_id: 'familias',
    })
  })

  it('valida la fecha de una reunión y el estado de una decisión', () => {
    expect(fechaHoraCmsValida('2026-08-21T18:30')).toBe(true)
    expect(reunionCmsDesde({ titulo: 'Coordinación semanal', fecha_hora: '2026-08-21T18:30' }).reunion.titulo).toBe('Coordinación semanal')
    expect(reunionCmsDesde({ titulo: 'Coordinación semanal', fecha_hora: '2026-08-21' }).error).toContain('fecha')
    expect(decisionCmsDesde({ titulo: 'Priorizar accesibilidad', estado: 'vigente' }).decision.titulo).toBe('Priorizar accesibilidad')
    expect(decisionCmsDesde({ titulo: 'Priorizar accesibilidad', estado: 'otro' }).error).toContain('estado')
  })

  it('genera reuniones recurrentes sin compartir minutas entre fechas', () => {
    const resultado = reunionesRecurrentesCmsDesde({
      titulo: 'Comisión Directiva', fecha_hora: '2026-08-31T18:30', frecuencia_reunion: 'mensual', repetir_hasta: '2026-10-31', preparacion: 'Revisar el orden del día',
    })
    expect(resultado.reuniones.map((reunion) => reunion.fecha_hora)).toEqual(['2026-08-31T18:30', '2026-09-30T18:30', '2026-10-31T18:30'])
    expect(resultado.reuniones.every((reunion) => reunion.minuta === '' && reunion.resumen === '')).toBe(true)
    expect(new Set(resultado.reuniones.map((reunion) => reunion.serie_id))).toHaveLength(1)
  })

  it('mantiene el segundo jueves al repetir una reunión por posición mensual', () => {
    const resultado = reunionesRecurrentesCmsDesde({
      titulo: 'Consejo Asesor', fecha_hora: '2026-09-10T19:00', frecuencia_reunion: 'mensual_ordinal', repetir_hasta: '2026-12-31',
    })
    expect(resultado.reuniones.map((reunion) => reunion.fecha_hora)).toEqual([
      '2026-09-10T19:00', '2026-10-08T19:00', '2026-11-12T19:00', '2026-12-10T19:00',
    ])
  })

  it('exige un equipo para una solicitud entre equipos', () => {
    expect(tareaCmsDesde({ titulo: 'Pedir apoyo', tipo: 'solicitud' }).error).toContain('equipo')
    expect(tareaCmsDesde({ titulo: 'Pedir apoyo', tipo: 'solicitud', equipo_id: 'familias' }).tarea)
      .toMatchObject({ titulo: 'Pedir apoyo', tipo: 'solicitud', equipo_id: 'familias' })
  })

  it('rechaza referencias inactivas antes de que D1 devuelva un error interno', async () => {
    const base = {
      prepare: () => ({ bind: () => ({ first: async () => null }) }),
    }
    await expect(referenciasCmsValidas(base, { equipo_solicitante_id: 'equipo-eliminado' })).resolves.toContain('equipo solicitante')
    await expect(referenciasCmsValidas(base, { solicitante_correo: 'cuenta-inactiva@aletea.uy' })).resolves.toContain('solicitante')
  })

  it('asigna una solicitud al rol operativo más cercano del equipo', () => {
    const responsabilidades = [
      { equipo_id: 'familias', usuario_correo: 'integrante@aletea.org', tipo: 'integrante', activo: 1 },
      { equipo_id: 'familias', usuario_correo: 'referente@aletea.org', tipo: 'referente', activo: 1 },
      { equipo_id: 'familias', usuario_correo: 'coordinacion@aletea.org', tipo: 'coordinacion', activo: 1 },
      { equipo_id: 'deportes', usuario_correo: 'otra@aletea.org', tipo: 'coordinacion', activo: 1 },
    ]
    expect(responsableSolicitudDe(responsabilidades, 'familias')).toBe('coordinacion@aletea.org')
    expect(responsableSolicitudDe(responsabilidades.filter((fila) => fila.tipo !== 'coordinacion'), 'familias')).toBe('referente@aletea.org')
    expect(responsableSolicitudDe([], 'familias')).toBeNull()
  })

  it('usa la misma ruta operativa para cualquier formulario con equipo', () => {
    const responsabilidades = [
      { equipo_id: 'capacitaciones', usuario_correo: 'referente@aletea.org', tipo: 'referente', activo: 1 },
      { equipo_id: 'capacitaciones', usuario_correo: 'integrante@aletea.org', tipo: 'integrante', activo: 1 },
    ]
    expect(responsableSolicitudDe(responsabilidades, 'capacitaciones')).toBe('referente@aletea.org')
  })

  it('guarda tarea, entrada y notificación como una sola operación atómica', async () => {
    const lotes = []
    const base = {
      prepare(sql) {
        const consulta = sql.replace(/\s+/g, ' ').trim()
        return {
          bind(...valores) {
            if (consulta.includes('FROM responsabilidades_equipo')) {
              return { all: async () => ({ results: [{ equipo_id: 'familias', usuario_correo: 'referente@aletea.org', tipo: 'referente', activo: 1 }] }) }
            }
            return { consulta, valores }
          },
        }
      },
      async batch(consultas) {
        lotes.push(consultas)
        return consultas.map(() => ({ success: true }))
      },
    }

    const resultado = await derivarEntradaCms(base, {
      tipo: 'pedido', nombre: 'Apoyo para una jornada', contacto: '', detalle: '', fecha_propuesta: null,
      objetivo: '', pasos: '', recursos: '', personas_necesarias: '', prioridad: 'normal',
      equipo_id: 'familias', equipo_solicitante_id: 'eventos', proyecto_id: null,
    }, { correo: 'coordinacion@aletea.org' })

    expect(resultado.asignada_automaticamente).toBe(true)
    expect(lotes).toHaveLength(1)
    expect(lotes[0]).toHaveLength(3)
    expect(lotes[0].map((consulta) => consulta.consulta)).toEqual([
      expect.stringContaining('INSERT INTO tareas_cms'),
      expect.stringContaining('INSERT INTO entradas_cms'),
      expect.stringContaining('INSERT INTO notificaciones_cms'),
    ])
  })

  it('acepta enlaces documentales seguros y rechaza direcciones inválidas', () => {
    expect(documentoCmsDesde({ titulo: 'Guía', url: 'https://drive.google.com/guia', tipo: 'guia', sensibilidad: 'interno' }).documento).toMatchObject({ titulo: 'Guía', tipo: 'guia' })
    expect(documentoCmsDesde({ titulo: 'Sitio', url: 'prueba.aletea.org', tipo: 'enlace', sensibilidad: 'interno' }).documento.url).toBe('https://prueba.aletea.org/')
    expect(documentoCmsDesde({ titulo: 'Guía', url: 'archivo-local', tipo: 'guia' }).error).toContain('enlace')
  })

  it('mantiene los documentos restringidos fuera de cuentas que no son administración', () => {
    expect(puedeVerDocumentoCms({ rol: 'coordinacion' }, { sensibilidad: 'restringido' })).toBe(false)
    expect(puedeVerDocumentoCms({ rol: 'admin' }, { sensibilidad: 'restringido' })).toBe(true)
    expect(puedeVerDocumentoCms({ rol: 'coordinacion' }, { sensibilidad: 'interno' })).toBe(true)
  })

  it('oculta las referencias de formularios cuando el acceso personal falta o venció', () => {
    const vigente = { nivel_datos_personales: 'operativo', datos_personales_hasta: '2099-12-31' }
    const indefinido = { nivel_datos_personales: 'operativo', datos_personales_sin_vencimiento: 1 }
    const antiguoSinFecha = { nivel_datos_personales: 'operativo', datos_personales_hasta: null }
    const vencido = { nivel_datos_personales: 'operativo', datos_personales_hasta: '2000-01-01' }
    expect(puedeVerRespuestasCms(vigente)).toBe(true)
    expect(puedeVerRespuestasCms(indefinido)).toBe(true)
    expect(puedeVerRespuestasCms(antiguoSinFecha)).toBe(false)
    expect(puedeVerRespuestasCms(vencido)).toBe(false)
    const tarea = { titulo: 'Revisar voluntariado: Camila Pérez', descripcion: 'Creada desde una respuesta de formulario.', solicitante_nombre: 'Camila Pérez' }
    expect(tareaCmsSinDatosDeFormulario(tarea)).toMatchObject({ titulo: 'Respuesta de formulario recibida', solicitante_nombre: null })
    const tareaEntrada = { titulo: 'Atender pedido: Camila Pérez', descripcion: 'Creada desde la bandeja de entradas institucionales.' }
    expect(tareaCmsSinDatosDeFormulario(tareaEntrada)).toMatchObject({ titulo: 'Entrada institucional recibida' })
    const notificacion = { titulo: 'Nueva tarea asignada', detalle: 'Camila Pérez quiere colaborar', tarea_titulo: tarea.titulo, tarea_descripcion: tarea.descripcion }
    expect(notificacionCmsSinDatosDeFormulario(notificacion)).toMatchObject({ titulo: 'Respuesta de formulario asignada', tarea_titulo: 'Respuesta de formulario recibida' })
    expect(actividadCmsSinDatosDeEntradas({ accion: 'recibir formulario interno', recurso: 'formularios/f1', detalle: 'Camila Pérez' }))
      .toMatchObject({ detalle: 'Detalle protegido por acceso a datos personales.' })
    expect(actividadCmsSinDatosDeEntradas({ accion: 'completar tarea CMS', recurso: 'tareas/t1', detalle: 'Revisar voluntariado: Camila Pérez', tarea_descripcion: tarea.descripcion }))
      .toEqual({ accion: 'completar tarea CMS', recurso: 'tareas/t1', detalle: 'Detalle protegido por acceso a datos personales.' })
    expect(actividadCmsSinDatosDeEntradas({ accion: 'crear formulario CMS', recurso: 'formularios/f1', detalle: 'Inscripción' }))
      .toMatchObject({ detalle: 'Inscripción' })
    expect(actividadCmsSinDatosDeEntradas({ accion: 'modificar actividad CMS', recurso: 'eventos/e1', detalle: 'Entrevista con Camila Pérez', entrada_evento_id: 'i1' }))
      .toEqual({ accion: 'modificar actividad CMS', recurso: 'eventos/e1', detalle: 'Detalle protegido por acceso a datos personales.' })
    expect(actividadCmsSinDatosDeEntradas({ accion: 'registrar solicitud de privacidad', recurso: 'solicitudes-privacidad/sp1', detalle: 'Solicitud de copia' }))
      .toMatchObject({ detalle: 'Detalle protegido por acceso a datos personales.' })
    expect(eventoCmsSinDatosDeEntrada({ id: 'e1', titulo: 'Entrevista con Camila Pérez', descripcion: 'Seguimiento personal', entrada_id: 'i1' }))
      .toEqual({ id: 'e1', titulo: 'Actividad vinculada a una entrada', descripcion: 'El contenido requiere acceso vigente a datos personales.' })
  })

  it('distingue los perfiles institucionales y reserva documentos según su alcance', () => {
    expect(perfilAccesoDe({ rol: 'admin' })).toBe('administracion')
    expect(perfilAccesoDe({ rol: 'coordinacion', perfil_acceso: 'direccion' })).toBe('direccion')
    expect(perfilAccesoDe({ rol: 'coordinacion', perfil_acceso: 'consulta' })).toBe('consulta')
    expect(puedeVerDocumentoCms({ perfil_acceso: 'consulta' }, { sensibilidad: 'compartido' })).toBe(true)
    expect(puedeVerDocumentoCms({ perfil_acceso: 'consulta' }, { sensibilidad: 'interno' })).toBe(false)
    expect(puedeVerDocumentoCms({ perfil_acceso: 'integrante' }, { sensibilidad: 'interno' })).toBe(false)
    expect(puedeVerDocumentoCms({ perfil_acceso: 'direccion' }, { sensibilidad: 'restringido' })).toBe(false)
    expect(puedeVerDocumentoCms({ perfil_acceso: 'direccion' }, { sensibilidad: 'interno' })).toBe(true)
  })

  it('reserva el registro institucional para Administración', () => {
    expect(puedeVerAuditoria({ rol: 'admin', perfil_acceso: 'administracion' })).toBe(true)
    expect(puedeVerAuditoria({ rol: 'coordinacion', perfil_acceso: 'direccion' })).toBe(false)
    expect(puedeVerAuditoria({ rol: 'coordinacion', perfil_acceso: 'coordinacion' })).toBe(false)
  })

  it('reserva las solicitudes de privacidad para Administración con acceso sensible vigente', () => {
    const vigente = { rol: 'admin', perfil_acceso: 'administracion', nivel_datos_personales: 'sensible', datos_personales_hasta: '2999-12-31' }
    expect(puedeGestionarSolicitudesPrivacidadCms(vigente)).toBe(true)
    expect(puedeGestionarSolicitudesPrivacidadCms({ ...vigente, datos_personales_hasta: null, datos_personales_sin_vencimiento: 1 })).toBe(true)
    expect(puedeGestionarSolicitudesPrivacidadCms({ ...vigente, nivel_datos_personales: 'operativo' })).toBe(false)
    expect(puedeGestionarSolicitudesPrivacidadCms({ ...vigente, rol: 'coordinacion' })).toBe(false)
  })

  it('obliga a verificar identidad y registrar constancia sin ejecutar borrados', () => {
    expect(solicitudPrivacidadCmsDesde({ tipo: 'eliminacion', solicitante_nombre: 'Camila Pérez', contacto: 'camila@example.com', canal: 'correo', alcance: 'Respuestas de formularios' }).solicitud)
      .toMatchObject({ tipo: 'eliminacion', solicitante_nombre: 'Camila Pérez' })
    expect(solicitudPrivacidadCmsDesde({ tipo: 'copia', solicitante_nombre: '', contacto: '099', alcance: '' }).error).toContain('Completá')
    const recibida = { tipo: 'eliminacion', estado: 'recibida' }
    expect(avanceSolicitudPrivacidadCms(recibida, 'iniciar_revision').error).toContain('estado actual')
    expect(avanceSolicitudPrivacidadCms(recibida, 'verificar_identidad', 'Confirmada por correo institucional')).toMatchObject({ estado: 'identidad_verificada' })
    expect(avanceSolicitudPrivacidadCms({ tipo: 'eliminacion', estado: 'en_revision' }, 'preparar_resultado')).toMatchObject({ estado: 'lista_para_decision' })
    expect(avanceSolicitudPrivacidadCms({ tipo: 'eliminacion', estado: 'lista_para_decision' }, 'cerrar', '').error).toContain('constancia')
    expect(avanceSolicitudPrivacidadCms({ tipo: 'eliminacion', estado: 'lista_para_decision' }, 'cerrar', 'Decisión revisada y comunicada por Administración')).toMatchObject({ estado: 'cerrada' })
  })

  it('deriva entradas institucionales y exige equipo para pedidos', () => {
    expect(entradaCmsDesde({ tipo: 'voluntariado', nombre: 'Camila' }).entrada).toMatchObject({ tipo: 'voluntariado', nombre: 'Camila', estado: 'nueva' })
    expect(entradaCmsDesde({ tipo: 'pedido', nombre: 'Apoyo en jornada' }).error).toContain('equipo')
    expect(entradaCmsDesde({ tipo: 'pedido', nombre: 'Apoyo en jornada', equipo_id: 'familias' }).error).toContain('realiza')
    expect(entradaCmsDesde({ tipo: 'pedido', nombre: 'Apoyo en jornada', equipo_id: 'familias', equipo_solicitante_id: 'eventos', prioridad: 'urgente' }).entrada).toMatchObject({ tipo: 'pedido', equipo_id: 'familias', equipo_solicitante_id: 'eventos', prioridad: 'urgente' })
  })

  it('exige fecha, medio y motivo para cumplir o reabrir una respuesta', async () => {
    const modulo = await import('../../functions/api/[[ruta]].js')
    expect(modulo.cumplimientoEntradaCmsDesde({ fecha: '2026-08-29', medio: 'contacto', motivo: 'Se respondió y quedó resuelto.' }).cumplimiento).toMatchObject({ medio: 'contacto' })
    expect(modulo.cumplimientoEntradaCmsDesde({ fecha: '', medio: 'contacto', motivo: 'Se respondió y quedó resuelto.' }).error).toContain('fecha')
    expect(modulo.cumplimientoEntradaCmsDesde({ fecha: '2026-08-29', medio: 'correo', motivo: 'Se respondió y quedó resuelto.' }).error).toContain('cómo')
    expect(modulo.cumplimientoEntradaCmsDesde({ fecha: '2026-08-29', medio: 'contacto', motivo: 'Listo' }).error).toContain('por qué')
    expect(modulo.reaperturaEntradaCmsDesde({ motivo: 'La persona volvió a consultar.' }).motivo).toContain('volvió')
    expect(modulo.reaperturaEntradaCmsDesde({ motivo: 'Otra vez' }).error).toContain('por qué')
  })

  it('valida formularios públicos sin aceptar respuestas automáticas o trampas', () => {
    const formulario = formularioCmsDesde({ titulo: 'Sumate como voluntario', tipo: 'voluntariado', visibilidad: 'publica' }).formulario
    expect(formulario).toMatchObject({ visibilidad: 'publica', estado: 'activa', responsable_datos: 'Aletea', conservacion_meses: 12, requiere_consentimiento: true })
    expect(consentimientoFormularioPublicoValido({}, formulario)).toBe(false)
    expect(consentimientoFormularioPublicoValido({ consentimiento_privacidad: true }, formulario)).toBe(true)
    expect(formularioCmsDesde({ titulo: 'Público incompleto', tipo: 'voluntariado', visibilidad: 'publica', finalidad: '' }).error).toContain('finalidad')
    expect(formularioCmsDesde({ titulo: 'Plazo inválido', tipo: 'voluntariado', conservacion_meses: 18 }).error).toContain('plazo')
    expect(respuestaFormularioCmsDesde({ nombre: 'Camila', contacto: 'camila@example.com', detalle: 'Puedo colaborar.' }, formulario).entrada).toMatchObject({ nombre: 'Camila', tipo: 'voluntariado' })
    const actividad = formularioCmsDesde({ titulo: 'Propuesta de actividad', tipo: 'actividad', visibilidad: 'publica' }).formulario
    expect(respuestaFormularioCmsDesde({ nombre: 'Taller de juego', contacto: 'taller@example.com', fecha_propuesta: '2026-09-04T17:30' }, actividad).entrada.fecha_propuesta).toBe('2026-09-04T17:30')
    expect(respuestaFormularioCmsDesde({ nombre: 'Taller de juego', contacto: 'taller@example.com', fecha_propuesta: '2026-02-30T17:30' }, actividad).error).toContain('fecha')
    expect(respuestaFormularioCmsDesde({ nombre: 'Bot', contacto: 'bot@example.com', empresa: 'Spam' }, formulario).error).toContain('enviar')
    expect(formularioCmsDesde({ titulo: 'Pedido', tipo: 'pedido', visibilidad: 'interna' }).error).toContain('equipo')
    expect(formularioCmsDesde({ titulo: 'Pedido', tipo: 'pedido', visibilidad: 'interna', equipo_id: 'familias', equipo_solicitante_id: 'eventos', prioridad: 'alta' }).formulario).toMatchObject({ equipo_id: 'familias', equipo_solicitante_id: 'eventos', prioridad: 'alta' })
    expect(formularioCmsDesde({ titulo: 'Alta', tipo: 'inscripcion', destino_respuesta: 'alta_persona' }).formulario.destino_respuesta).toBe('alta_persona')
    expect(formularioCmsDesde({ titulo: 'Alta', tipo: 'inscripcion', destino_respuesta: 'crear_perfil' }).error).toContain('destino')
  })

  it('prepara cinco formularios reales de prueba con equipos y preguntas trazables', () => {
    const formularios = formulariosPruebaCms({ familias: 'ef', deportes: 'ed', capacitaciones: 'ec', administracion: 'ea' })
    expect(formularios).toHaveLength(5)
    expect(new Set(formularios.map((formulario) => formulario.id)).size).toBe(5)
    expect(formularios.every((formulario) => formulario.visibilidad === 'publica' && formulario.requiere_consentimiento)).toBe(true)
    formularios.forEach((formulario) => expect(formularioCmsDesde(formulario).error).toBeUndefined())
  })

  it('prepara automáticamente un formulario público de prueba sin relajar permisos administrativos', async () => {
    const inserciones = []
    const base = {
      prepare(sql) {
        if (sql.includes('FROM equipos')) return { all: async () => ({ results: [
          { id: 'ef', clave: 'familias' }, { id: 'ed', clave: 'deportes' },
          { id: 'ec', clave: 'capacitaciones' }, { id: 'ea', clave: 'administracion' },
        ] }) }
        if (sql.includes('FROM usuarios')) return { all: async () => ({ results: [
          { correo: 'persona@aletea.org', perfil_acceso: 'integrante' },
          { correo: 'administracion@aletea.org', perfil_acceso: 'administracion' },
        ] }) }
        return { bind: (...valores) => ({
          run: async () => { inserciones.push({ sql, valores }); return { success: true } },
          first: async () => null,
        }) }
      },
    }
    expect(await asegurarFormularioPruebaCms(base, 'prueba-orientacion-familias')).toBe(true)
    expect(inserciones).toHaveLength(2)
    expect(inserciones[0].sql).toContain('UPDATE formularios_cms SET')
    expect(inserciones[0].valores).toContain('publica')
    expect(inserciones[0].valores).toContain('activa')
    expect(inserciones[1].sql).toContain('INSERT INTO formularios_cms')
    expect(inserciones[1].valores).toContain('administracion@aletea.org')
    expect(await asegurarFormularioPruebaCms(base, 'formulario-arbitrario')).toBe(false)
    expect(inserciones).toHaveLength(2)
  })

  it('autoriza formularios cruzados solo desde la página de prueba', () => {
    const permitidas = cabecerasFormularioPublico(new Request('https://gestor.aletea.org/api/formularios/prueba', { headers: { origin: 'https://prueba.aletea.org' } }))
    expect(permitidas['access-control-allow-origin']).toBe('https://prueba.aletea.org')
    expect(permitidas['access-control-allow-methods']).toContain('POST')
    expect(cabecerasFormularioPublico(new Request('https://gestor.aletea.org/api/formularios/prueba', { headers: { origin: 'https://sitio-ajeno.example' } }))).toEqual({})
  })

  it('valida preguntas configurables, opciones, requisitos y condiciones', () => {
    const campos = [
      { clave: 'modalidad', etiqueta: 'Modalidad preferida', tipo: 'seleccion', requerido: true, opciones: ['Presencial', 'Virtual'] },
      { clave: 'barrio', etiqueta: 'Barrio', tipo: 'texto', requerido: true, mostrar_si: { campo: 'modalidad', valor: 'Presencial' } },
      { clave: 'acepta', etiqueta: 'Acepto el contacto', tipo: 'casilla', requerido: true },
    ]
    expect(camposFormularioCmsDesde(campos).campos).toHaveLength(3)
    const formulario = formularioCmsDesde({ titulo: 'Preferencias', tipo: 'voluntariado', visibilidad: 'publica', campos }).formulario
    expect(JSON.parse(formulario.campos_json)).toHaveLength(3)
    expect(respuestaFormularioCmsDesde({ nombre: 'Ana', contacto: '099', respuestas: { modalidad: 'Presencial', acepta: true } }, formulario).error).toContain('Barrio')
    const respuesta = respuestaFormularioCmsDesde({ nombre: 'Ana', contacto: '099', respuestas: { modalidad: 'Virtual', barrio: 'No debe guardarse', acepta: true } }, formulario).entrada
    expect(JSON.parse(respuesta.respuestas_json)).toEqual({ modalidad: 'Virtual', acepta: true })
    expect(respuestaFormularioCmsDesde({ nombre: 'Ana', contacto: '099', respuestas: { modalidad: 'Teléfono', acepta: true } }, formulario).error).toContain('no es válida')
    expect(camposFormularioCmsDesde([{ etiqueta: 'Única', tipo: 'seleccion', opciones: ['Una'] }]).error).toContain('dos opciones')
  })

  it('mantiene los formularios públicos separados de los perfiles internos', () => {
    const formulario = formularioCmsDesde({ titulo: 'Actividad abierta', tipo: 'actividad', visibilidad: 'publica' }).formulario
    const resultado = respuestaFormularioCmsDesde({ nombre: 'Martín', contacto: 'martin@example.com', detalle: 'Me interesa participar.' }, formulario)
    expect(resultado.entrada).toMatchObject({ tipo: 'actividad', nombre: 'Martín', contacto: 'martin@example.com' })
    expect(resultado.entrada).not.toHaveProperty('persona_id')
  })

  it('solo acepta comentarios con contenido para la trazabilidad de tareas', () => {
    expect(comentarioTareaCmsDesde({ contenido: 'Confirmamos el salón para el jueves.' }).comentario.contenido).toContain('Confirmamos')
    expect(comentarioTareaCmsDesde({ contenido: '   ' }).error).toContain('vacío')
  })

  it('valida y avanza tareas recurrentes sin perder el día al cambiar de mes', () => {
    expect(tareaRecurrenteCmsDesde({ titulo: 'Revisar agenda', frecuencia: 'semanal', proxima_fecha: '2026-08-22' }).tarea)
      .toMatchObject({ titulo: 'Revisar agenda', frecuencia: 'semanal' })
    expect(tareaRecurrenteCmsDesde({ titulo: 'Revisar agenda', frecuencia: 'diaria', proxima_fecha: '2026-08-22' }).error).toContain('frecuencia')
    expect(tareaRecurrenteCmsDesde({ titulo: 'Revisar agenda', frecuencia: 'semanal' }).error).toContain('próxima fecha')
    expect(siguienteFechaRecurrenteCms('2026-08-22', 'semanal')).toBe('2026-08-29')
    expect(siguienteFechaRecurrenteCms('2026-01-31', 'mensual')).toBe('2026-02-28')
  })

  it('valida actividades y no acepta finales anteriores al inicio', () => {
    expect(eventoCmsDesde({ titulo: 'Taller de juego', fecha_hora: '2026-09-04T17:30', fecha_fin: '2026-09-04T19:00' }).evento)
      .toMatchObject({ titulo: 'Taller de juego', estado: 'planificado' })
    expect(eventoCmsDesde({ titulo: 'Renovar seguro', tipo: 'renovacion', fecha_hora: '2026-09-04T17:30' }).evento.tipo).toBe('renovacion')
    expect(eventoCmsDesde({ titulo: 'Taller de juego', fecha_hora: '2026-09-04T17:30', fecha_fin: '2026-09-04T16:00' }).error).toContain('finalización')
    expect(eventoCmsDesde({ titulo: 'Taller de juego', fecha_hora: '2026-02-30T17:30' }).error).toContain('fecha')
    expect(eventoCmsDesde({ titulo: 'Taller de juego', tipo: 'otro', fecha_hora: '2026-09-04T17:30' }).error).toContain('tipo')
  })

  it('valida una checklist operativa antes de crear tareas', () => {
    expect(plantillaTareasCmsDesde({ titulo: 'Preparar jornada', tareas: [{ titulo: 'Confirmar local', dias_antes: 14, prioridad: 'alta' }] }).plantilla.tareas).toHaveLength(1)
    expect(plantillaTareasCmsDesde({ titulo: 'Preparar jornada', tareas: [{ titulo: 'Evaluar jornada', dias_antes: -1 }] }).plantilla.tareas[0].dias_antes).toBe(-1)
    expect(plantillaTareasCmsDesde({ titulo: 'Preparar jornada', tareas: [{ titulo: 'Confirmar local', dias_antes: -366 }] }).error).toContain('365 días')
  })

  it('detecta solo los cruces de actividades que comparten un recurso', () => {
    const familias = { id: 'ev1', titulo: 'Jornada de familias', estado: 'planificado', fecha_hora: '2026-09-04T17:30', fecha_fin: '2026-09-04T19:30', lugar: 'Sede Aletea', equipo_id: 'familias', responsable_correo: 'claudia@aletea.org' }
    const deporte = { id: 'ev2', titulo: 'Entrenamiento', estado: 'planificado', fecha_hora: '2026-09-04T18:30', fecha_fin: '2026-09-04T20:00', lugar: 'Sede Aletea', equipo_id: 'deportes', responsable_correo: 'juan@aletea.org' }
    const independiente = { id: 'ev3', titulo: 'Taller externo', estado: 'planificado', fecha_hora: '2026-09-04T18:30', fecha_fin: '2026-09-04T20:00', lugar: 'Centro barrial', equipo_id: 'capacitaciones', responsable_correo: 'marce@aletea.org' }
    expect(conflictoAgendaCms(familias, deporte)).toMatchObject({ evento_a_titulo: 'Jornada de familias', evento_b_titulo: 'Entrenamiento', motivos: ['Mismo lugar'] })
    expect(conflictoAgendaCms(familias, independiente)).toBeNull()
    expect(conflictosAgendaCms([familias, deporte, independiente])).toHaveLength(1)
  })

  it('agrupa en un solo aviso todas las actividades que coinciden en el mismo horario', () => {
    const base = { estado: 'planificado', fecha_hora: '2026-09-10T19:00', fecha_fin: '2026-09-10T20:00', responsable_correo: 'claudia@aletea.org' }
    const grupos = gruposConflictosAgendaCms([
      { ...base, id: 'ev1', titulo: 'Consejo asesor' },
      { ...base, id: 'ev2', titulo: 'Clase segundo año' },
      { ...base, id: 'ev3', titulo: 'Reunión de coordinación' },
    ])
    expect(grupos).toHaveLength(1)
    expect(grupos[0]).toMatchObject({ cantidad: 3, motivos: ['Mismo responsable'] })
    expect(grupos[0].eventos.map((evento) => evento.titulo)).toEqual(['Clase segundo año', 'Consejo asesor', 'Reunión de coordinación'])
  })

  it('no repite actividades cuando los conflictos forman una cadena horaria', () => {
    const base = { estado: 'planificado', responsable_correo: 'claudia@aletea.org' }
    const grupos = gruposConflictosAgendaCms([
      { ...base, id: 'ev1', titulo: 'Primera actividad', fecha_hora: '2026-09-10T17:00', fecha_fin: '2026-09-10T19:00' },
      { ...base, id: 'ev2', titulo: 'Segunda actividad', fecha_hora: '2026-09-10T18:00', fecha_fin: '2026-09-10T20:00' },
      { ...base, id: 'ev3', titulo: 'Tercera actividad', fecha_hora: '2026-09-10T19:30', fecha_fin: '2026-09-10T21:00' },
    ])
    expect(grupos).toHaveLength(1)
    expect(grupos[0]).toMatchObject({ cantidad: 3, motivos: ['Mismo responsable'] })
    expect(grupos[0].eventos.map((evento) => evento.id)).toEqual(['ev1', 'ev2', 'ev3'])
  })

  it('no compara una serie recurrente consigo misma y conserva cruces entre series distintas', () => {
    const base = { estado: 'planificado', fecha_hora: '2026-09-10T19:00', fecha_fin: '2026-09-10T20:00', responsable_correo: 'claudia@aletea.org', generada_para: '2026-09-10' }
    const grupos = gruposConflictosAgendaCms([
      { ...base, id: 'clase-1', serie_id: 'serie-clase', titulo: 'Clase segundo año' },
      { ...base, id: 'clase-2', serie_id: 'serie-clase', titulo: 'Clase segundo año' },
      { ...base, id: 'consejo-1', serie_id: 'serie-consejo', titulo: 'Consejo asesor' },
      { ...base, id: 'consejo-2', serie_id: 'serie-consejo', titulo: 'Consejo asesor' },
    ])
    expect(conflictoAgendaCms(
      { ...base, id: 'a', serie_id: 'serie-clase', titulo: 'Clase segundo año' },
      { ...base, id: 'b', serie_id: 'serie-clase', titulo: 'Clase segundo año' },
    )).toBeNull()
    expect(grupos).toHaveLength(1)
    expect(grupos[0]).toMatchObject({ cantidad: 2, motivos: ['Mismo responsable'] })
    expect(grupos[0].eventos).toEqual([
      expect.objectContaining({ titulo: 'Clase segundo año', serie_id: 'serie-clase', registros_agrupados: 2 }),
      expect.objectContaining({ titulo: 'Consejo asesor', serie_id: 'serie-consejo', registros_agrupados: 2 }),
    ])
  })

  it('agrupa la misma ocurrencia por su fecha efectiva aunque conserve una fecha interna antigua', () => {
    const base = { estado: 'planificado', fecha_hora: '2026-11-12T19:00', fecha_fin: '2026-11-12T20:00', responsable_correo: 'claudia@aletea.org', serie_id: 'serie-consejo', titulo: 'Consejo asesor' }
    const grupos = gruposConflictosAgendaCms([
      { ...base, id: 'consejo-1', generada_para: '2026-11-10' },
      { ...base, id: 'consejo-2', generada_para: '2026-11-12' },
      { ...base, id: 'clase', serie_id: 'serie-clase', generada_para: '2026-11-12', titulo: 'Clase segundo año' },
    ])
    expect(grupos).toHaveLength(1)
    expect(grupos[0]).toMatchObject({ cantidad: 2 })
    expect(grupos[0].eventos).toEqual([
      expect.objectContaining({ titulo: 'Clase segundo año' }),
      expect.objectContaining({ titulo: 'Consejo asesor', registros_agrupados: 2 }),
    ])
  })

  it('ignora una finalización histórica imposible en una serie recurrente', () => {
    const consejo = { id: 'consejo', titulo: 'Consejo asesor', estado: 'planificado', fecha_hora: '2026-11-10T19:00', fecha_fin: '2027-03-02T00:00', responsable_correo: 'claudia@aletea.org', serie_id: 'serie-consejo' }
    const clases = ['11', '18', '25'].map((dia) => ({ id: `clase-${dia}`, titulo: 'Clase segundo año', estado: 'planificado', fecha_hora: `2026-11-${dia}T19:00`, fecha_fin: `2026-11-${dia}T21:00`, responsable_correo: 'claudia@aletea.org', serie_id: 'serie-clase' }))
    expect(conflictoAgendaCms(consejo, clases[0])).toBeNull()
    expect(gruposConflictosAgendaCms([consejo, ...clases])).toEqual([])
  })

  it('rechaza una actividad recurrente cuya finalización invade otras fechas', () => {
    expect(eventosRecurrentesCmsDesde({ titulo: 'Consejo asesor', fecha_hora: '2026-11-12T19:00', fecha_fin: '2027-03-02T00:00', frecuencia_evento: 'mensual_ordinal', repetir_hasta: '2027-03-31' }).error)
      .toContain('24 horas')
  })

  it('mantiene el aviso para dos actividades independientes realmente duplicadas', () => {
    const base = { estado: 'planificado', fecha_hora: '2026-09-10T19:00', responsable_correo: 'claudia@aletea.org', titulo: 'Clase segundo año' }
    const grupos = gruposConflictosAgendaCms([{ ...base, id: 'manual-1' }, { ...base, id: 'manual-2' }])
    expect(grupos).toHaveLength(1)
    expect(grupos[0]).toMatchObject({ cantidad: 2 })
  })
})

describe('límite de formularios públicos', () => {
  it('acepta cuatro envíos y rechaza desde el quinto sin depender del motor SQL', async () => {
    let cantidad = 0
    const base = {
      prepare(sql) {
        return {
          bind() {
            return {
              async run() {
                if (sql.includes('INSERT INTO limites_formularios_publicos_cms')) {
                  cantidad = cantidad === 0 ? 1 : Math.min(5, cantidad + 1)
                }
                return { success: true, meta: { changes: 1 } }
              },
              async first() { return { cantidad } },
            }
          },
        }
      },
    }
    const resultados = []
    for (let intento = 0; intento < 6; intento += 1) {
      resultados.push(await reservarEnvioFormularioPublico(base, 'formulario', 'clave', 'ventana'))
    }
    expect(resultados).toEqual([true, true, true, true, false, false])
    expect(cantidad).toBe(5)
  })
})
