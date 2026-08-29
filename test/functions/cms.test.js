import { describe, expect, it } from 'vitest'
import { alianzaCmsDesde, camposFormularioCmsDesde, capacidadTrabajoCmsDesde, comentarioTareaCmsDesde, comunicadoCmsDesde, conflictoAgendaCms, conflictosAgendaCms, decisionCmsDesde, derivarEntradaCms, documentoCmsDesde, entradaCmsDesde, equipoCmsDesde, esperaIntentoIngreso, eventoCmsDesde, eventosRecurrentesCmsDesde, fechaActualCms, fechaCmsValida, fechaHoraCmsValida, formularioCmsDesde, gastoProyectoCmsDesde, hitoProyectoCmsDesde, perfilAccesoDe, plantillaTareasCmsDesde, puedeVerAuditoria, puedeVerDocumentoCms, programaCmsDesde, proyectoCmsDesde, referenciasCmsValidas, reservarEnvioFormularioPublico, respuestaFormularioCmsDesde, reunionCmsDesde, reunionesRecurrentesCmsDesde, responsabilidadCmsDesde, responsableSolicitudDe, revisionSemanalCmsDesde, riesgoProyectoCmsDesde, siguienteFechaRecurrenteCms, tareaCmsDesde, tareaRecurrenteCmsDesde } from '../../functions/api/[[ruta]].js'

describe('validación del CMS en Cloudflare', () => {
  it('acepta cuatro envíos públicos y rechaza desde el quinto', async () => {
    let cantidad = 0
    const base = {
      prepare(sql) {
        return { bind() { return {
          async run() {
            if (sql.includes('INSERT INTO limites_formularios_publicos_cms')) cantidad = cantidad === 0 ? 1 : Math.min(5, cantidad + 1)
            return { success: true, meta: { changes: 1 } }
          },
          async first() { return { cantidad } },
        } } }
      },
    }
    const resultados = []
    for (let intento = 0; intento < 6; intento += 1) {
      resultados.push(await reservarEnvioFormularioPublico(base, 'formulario', 'clave', 'ventana'))
    }
    expect(resultados).toEqual([true, true, true, true, false, false])
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
    expect(documentoCmsDesde({ titulo: 'Guía', url: 'archivo-local', tipo: 'guia' }).error).toContain('enlace')
  })

  it('mantiene los documentos restringidos fuera de cuentas que no son administración', () => {
    expect(puedeVerDocumentoCms({ rol: 'coordinacion' }, { sensibilidad: 'restringido' })).toBe(false)
    expect(puedeVerDocumentoCms({ rol: 'admin' }, { sensibilidad: 'restringido' })).toBe(true)
    expect(puedeVerDocumentoCms({ rol: 'coordinacion' }, { sensibilidad: 'interno' })).toBe(true)
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

  it('deriva entradas institucionales y exige equipo para pedidos', () => {
    expect(entradaCmsDesde({ tipo: 'voluntariado', nombre: 'Camila' }).entrada).toMatchObject({ tipo: 'voluntariado', nombre: 'Camila', estado: 'nueva' })
    expect(entradaCmsDesde({ tipo: 'pedido', nombre: 'Apoyo en jornada' }).error).toContain('equipo')
    expect(entradaCmsDesde({ tipo: 'pedido', nombre: 'Apoyo en jornada', equipo_id: 'familias' }).error).toContain('realiza')
    expect(entradaCmsDesde({ tipo: 'pedido', nombre: 'Apoyo en jornada', equipo_id: 'familias', equipo_solicitante_id: 'eventos', prioridad: 'urgente' }).entrada).toMatchObject({ tipo: 'pedido', equipo_id: 'familias', equipo_solicitante_id: 'eventos', prioridad: 'urgente' })
  })

  it('valida formularios públicos sin aceptar respuestas automáticas o trampas', () => {
    const formulario = formularioCmsDesde({ titulo: 'Sumate como voluntario', tipo: 'voluntariado', visibilidad: 'publica' }).formulario
    expect(formulario).toMatchObject({ visibilidad: 'publica', estado: 'activa' })
    expect(respuestaFormularioCmsDesde({ nombre: 'Camila', contacto: 'camila@example.com', detalle: 'Puedo colaborar.' }, formulario).entrada).toMatchObject({ nombre: 'Camila', tipo: 'voluntariado' })
    const actividad = formularioCmsDesde({ titulo: 'Propuesta de actividad', tipo: 'actividad', visibilidad: 'publica' }).formulario
    expect(respuestaFormularioCmsDesde({ nombre: 'Taller de juego', contacto: 'taller@example.com', fecha_propuesta: '2026-09-04T17:30' }, actividad).entrada.fecha_propuesta).toBe('2026-09-04T17:30')
    expect(respuestaFormularioCmsDesde({ nombre: 'Taller de juego', contacto: 'taller@example.com', fecha_propuesta: '2026-02-30T17:30' }, actividad).error).toContain('fecha')
    expect(respuestaFormularioCmsDesde({ nombre: 'Bot', contacto: 'bot@example.com', empresa: 'Spam' }, formulario).error).toContain('enviar')
    expect(formularioCmsDesde({ titulo: 'Pedido', tipo: 'pedido', visibilidad: 'interna' }).error).toContain('equipo')
    expect(formularioCmsDesde({ titulo: 'Pedido', tipo: 'pedido', visibilidad: 'interna', equipo_id: 'familias', equipo_solicitante_id: 'eventos', prioridad: 'alta' }).formulario).toMatchObject({ equipo_id: 'familias', equipo_solicitante_id: 'eventos', prioridad: 'alta' })
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
})
