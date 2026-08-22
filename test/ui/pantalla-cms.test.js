import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { asistirPegadoEnlace, crearPantallaCMS as crearPantallaCMSReal, enlaceWebDesdeTexto, equipoFundacionalCms, textoAvisoManualTarea, textoResumenManualEquipo } from '../../js/ui/pantalla-cms.js'

// La auditoría conserva una superficie completa para probar todos los flujos.
// La aplicación real abre esos mismos flujos desde la vista de cada equipo.
const crearPantallaCMS = (raiz, opciones = {}) => crearPantallaCMSReal(raiz, { ...opciones, area: opciones.area ?? 'auditoria' })

const esperar = () => new Promise((resolver) => setTimeout(resolver, 0))

let raiz
let alIrA
let perfilCms
let automatizacionesCms
let alertasPospuestasCms
let alcanceGlobalCms
let tareaBloqueadaCms
let vistaMovilCms

beforeEach(() => {
  document.body.innerHTML = '<div id="raiz"></div>'
  window.sessionStorage.clear()
  raiz = document.getElementById('raiz')
  alIrA = vi.fn()
  perfilCms = 'coordinacion'
  automatizacionesCms = []
  alertasPospuestasCms = []
  alcanceGlobalCms = false
  tareaBloqueadaCms = false
  vistaMovilCms = false
  window.matchMedia = vi.fn(() => ({ matches: vistaMovilCms, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  const almacenamientoLocal = new Map()
  Object.defineProperty(window, 'localStorage', { configurable: true, value: {
    getItem: vi.fn((clave) => almacenamientoLocal.get(clave) ?? null),
    setItem: vi.fn((clave, valor) => almacenamientoLocal.set(clave, String(valor))),
    removeItem: vi.fn((clave) => almacenamientoLocal.delete(clave)),
    clear: vi.fn(() => almacenamientoLocal.clear()),
  } })
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn(async () => {}) } })
  globalThis.fetch = vi.fn(async (url) => {
    if (url === '/api/cms/proyectos/p1/contexto') return new Response(JSON.stringify({
      proyecto: { id: 'p1', titulo: 'Fútbol sin Barreras' },
      tareas: [{ id: 'tp1', proyecto_id: 'p1', titulo: 'Coordinar transporte', estado: 'pendiente', fecha_limite: '2026-08-22', responsable_nombre: 'Claudia', descripcion: 'Confirmar el traslado.' }],
      eventos: [{ id: 'ep1', proyecto_id: 'p1', titulo: 'Jornada abierta', estado: 'planificado', fecha_hora: '2026-08-24T15:00', lugar: 'Sede Aletea', descripcion: 'Actividad de cierre.' }],
      reuniones: [],
      decisiones: [{ id: 'dp1', titulo: 'Priorizar accesibilidad', estado: 'vigente', reunion_titulo: 'Coordinación semanal', responsable_nombre: 'Claudia', motivo: 'Acordado con el equipo.' }],
      documentos: [{ id: 'doc1', proyecto_id: 'p1', titulo: 'Guía de jornada', tipo: 'guia', sensibilidad: 'interno', descripcion: 'Material para coordinar.' }],
      riesgos: [], hitos: [{ id: 'h1', proyecto_id: 'p1', titulo: 'Confirmar equipos', descripcion: 'Equipos de trabajo definidos.', fecha_objetivo: '2026-08-20', estado: 'en_marcha', responsable_nombre: 'Claudia' }], gastos: [{ id: 'g1', proyecto_id: 'p1', concepto: 'Traslado', monto: 2250, fecha: '2026-08-15', notas: 'Jornada inaugural.' }],
    }), { status: 200 })
    if (url === '/api/cms/tablero') return new Response(JSON.stringify({
      alcance: { perfil: perfilCms, equipos: [], puede_gestionar: true, global: alcanceGlobalCms },
      tareas: [{ id: 't1', titulo: 'Confirmar la sala', descripcion: 'Llamar antes del jueves.', estado: 'pendiente', prioridad: 'alta', esfuerzo_horas: 2, fecha_limite: '2026-08-18', fecha_seguimiento: '2026-08-15', equipo_id: 'e1', evento_id: 'ev1', equipo_nombre: 'Familias', responsable_nombre: 'Claudia', responsable_correo: 'claudia@aletea.org', solicitante_correo: 'claudia@aletea.org' }, { id: 'td1', titulo: 'Priorizar accesibilidad en actividades', descripcion: 'Aplicar ajustes razonables en toda actividad nueva.', tipo: 'directriz', estado: 'pendiente', prioridad: 'alta', equipo_nombre: 'Dirección', responsable_nombre: 'Claudia', responsable_correo: 'claudia@aletea.org' }, ...(tareaBloqueadaCms ? [{ id: 'tb1', titulo: 'Confirmar accesibilidad de la jornada', descripcion: 'Esperando confirmación del lugar.', estado: 'bloqueada', prioridad: 'alta', equipo_id: 'e1', equipo_nombre: 'Familias', responsable_nombre: 'Claudia', responsable_correo: 'claudia@aletea.org' }] : [])],
      proyectos: [{ id: 'p1', titulo: 'Fútbol sin Barreras', estado: 'en_marcha', prioridad: 'alta', fecha_inicio: '2026-08-01', fecha_fin: '2026-10-01', presupuesto: 15000, presupuesto_ejecutado: 2250, hitos_total: 2, hitos_completados: 1, notas: 'Confirmar transporte.', equipo_id: 'e1', responsable_correo: 'claudia@aletea.org', equipo_nombre: 'Familias', responsable_nombre: 'Claudia' }],
      equipos: [{ id: 'e1', nombre: 'Familias' }, { id: 'e2', nombre: 'Eventos', categoria: 'comision_directiva' }],
      responsables: [{ correo: 'claudia@aletea.org', nombre: 'Claudia' }, { correo: 'marce@aletea.org', nombre: 'Marce' }],
      responsabilidades: [{ id: 're1', equipo_id: 'e1', usuario_correo: 'claudia@aletea.org', usuario_nombre: 'Claudia', tipo: 'coordinacion' }],
      reuniones: [{ id: 'r1', titulo: 'Coordinación semanal', fecha_hora: '2026-08-21T18:30', estado: 'planificada', equipo_id: 'e1', equipo_nombre: 'Familias', preparacion: 'Revisar necesidades' }],
      decisiones: [{ id: 'd1', titulo: 'Priorizar accesibilidad', reunion_titulo: 'Coordinación semanal', responsable_nombre: 'Claudia' }],
      documentos: [
        { id: 'doc1', titulo: 'Guía de familias', descripcion: 'Material de bienvenida para las familias.', tipo: 'guia', sensibilidad: 'interno', equipo_nombre: 'Familias', url: 'https://drive.google.com/guia' },
        { id: 'doc2', titulo: 'Plantilla de minuta', descripcion: 'Modelo para las reuniones.', tipo: 'plantilla', sensibilidad: 'compartido', proyecto_titulo: 'Fútbol sin Barreras', url: 'https://drive.google.com/minuta' },
      ],
      entradas: [{ id: 'en1', tipo: 'voluntariado', nombre: 'Camila Pérez', detalle: 'Quiere colaborar los sábados.', estado: 'derivada', equipo_id: 'e1', equipo_nombre: 'Familias', tarea_id: 't1', tarea_titulo: 'Revisar voluntariado: Camila Pérez' }, { id: 'en2', tipo: 'actividad', nombre: 'Taller de juego', detalle: 'Propuesta para familias.', fecha_propuesta: '2026-09-04T17:30', estado: 'derivada', equipo_id: 'e1', equipo_nombre: 'Familias', tarea_id: 't1', tarea_titulo: 'Revisar propuesta de actividad: Taller de juego' }],
      formularios: [{ id: 'f1', titulo: 'Sumate como voluntario', descripcion: 'Para personas interesadas en colaborar.', tipo: 'voluntariado', visibilidad: 'publica', estado: 'activa', respuestas_total: 2 }],
      alianzas: [{ id: 'a1', nombre: 'Red comunitaria', tipo: 'red', estado: 'activa', descripcion: 'Coordinación de propuestas territoriales.', equipo_id: 'e1', equipo_nombre: 'Familias' }],
      programas: [{ id: 'pr1', nombre: 'Familias y comunidad', estado: 'activo', descripcion: 'Espacios para familias del interior.', equipo_id: 'e1', equipo_nombre: 'Familias' }],
      eventos: [{ id: 'ev1', titulo: 'Taller de juego', fecha_hora: '2026-08-24T15:00', estado: 'planificado', equipo_id: 'e1', equipo_nombre: 'Familias', responsable_correo: 'claudia@aletea.org', tareas_total: 3, tareas_completadas: 1, tareas_pendientes: 2 }],
      plantillas: [{ id: 'pl1', titulo: 'Preparar jornada', descripcion: 'Pasos habituales.', cantidad_tareas: 3, equipo_nombre: 'Familias' }],
      riesgos: [{ id: 'rg1', proyecto_id: 'p1', proyecto_titulo: 'Fútbol sin Barreras', titulo: 'Confirmación del local', descripcion: 'Confirmar la sala con una semana de anticipación.', nivel: 'alto', estado: 'abierto', responsable_correo: 'claudia@aletea.org', responsable_nombre: 'Claudia', fecha_revision: '2026-08-20' }],
      hitos: [{ id: 'h1', proyecto_id: 'p1', titulo: 'Confirmar equipos', descripcion: 'Equipos de trabajo definidos.', fecha_objetivo: '2026-08-20', estado: 'en_marcha', responsable_nombre: 'Claudia' }],
      gastos: [{ id: 'g1', proyecto_id: 'p1', concepto: 'Traslado', monto: 2250, fecha: '2026-08-15', notas: 'Jornada inaugural.' }],
      notificaciones: [{ id: 'n1', tipo: 'asignacion_tarea', titulo: 'Nueva tarea asignada', detalle: 'Confirmar la sala', tarea_id: 't1', leida_en: null }],
      comunicados: [{ id: 'c1', titulo: 'Cambio de horario', detalle: 'El taller comienza a las 10.', prioridad: 'urgente', equipo_id: 'e1', equipo_nombre: 'Familias', vence_el: '2026-08-24' }],
      recurrencias: [{ id: 'tr1', titulo: 'Revisar agenda semanal', descripcion: 'Confirmar actividades y avisos.', frecuencia: 'semanal', prioridad: 'normal', proxima_fecha: '2026-08-22', equipo_id: 'e1', equipo_nombre: 'Familias', responsable_correo: 'claudia@aletea.org', responsable_nombre: 'Claudia' }],
      automatizaciones: automatizacionesCms,
      alertasPospuestas: alertasPospuestasCms,
      capacidad: [{ usuario_correo: 'claudia@aletea.org', usuario_nombre: 'Claudia', horas_semanales: 8, horas_asignadas: 10, tareas_abiertas: 3, tareas_sin_estimacion: 1, nota: 'Disponible martes y jueves.' }],
      conflictos: [{ evento_a_id: 'ev1', evento_a_titulo: 'Taller de juego', evento_a_fecha_hora: '2026-08-24T15:00', evento_b_id: 'ev2', evento_b_titulo: 'Reunión de familias', evento_b_fecha_hora: '2026-08-24T15:30', motivos: ['Mismo lugar'] }],
    }), { status: 200 })
    if (url === '/api/auditoria?limite=50') return new Response(JSON.stringify({ actividad: [
      { id: 1, accion: 'crear tarea CMS', detalle: 'Confirmar accesibilidad', recurso: 'tareas/t1', actor_nombre: 'Claudia', cuando: '2026-08-16T14:30:00Z' },
    ] }), { status: 200 })
    if (url === '/api/cms/proyectos') return new Response(JSON.stringify({ proyecto: { id: 'p2', titulo: 'Escuela de familias', equipo_id: 'e1' } }), { status: 201 })
    if (url === '/api/cms/documentos') return new Response(JSON.stringify({ documento: { id: 'doc3', titulo: 'Guía de familias', url: 'https://drive.google.com/guia' } }), { status: 201 })
    return new Response(JSON.stringify({ tarea: { id: 't2' } }), { status: 201 })
  })
})

afterEach(() => vi.restoreAllMocks())

describe('tablero institucional', () => {
  it('extrae enlaces web desde el texto que copian Drive y otras herramientas', () => {
    expect(enlaceWebDesdeTexto('Registro MEC\nhttps://drive.google.com/file/d/abc/view?usp=sharing')).toBe('https://drive.google.com/file/d/abc/view?usp=sharing')
    expect(enlaceWebDesdeTexto('Abrir (https://canva.com/design/abc).')).toBe('https://canva.com/design/abc')
    expect(enlaceWebDesdeTexto('Registro MEC')).toBe('')
  })

  it('protege cualquier campo URL nuevo con normalización de pegado', () => {
    const entrada = document.createElement('input')
    entrada.type = 'url'
    asistirPegadoEnlace(entrada)
    const pegado = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(pegado, 'clipboardData', { value: { getData: () => 'Documento compartido: https://docs.google.com/document/d/abc/view.' } })
    entrada.dispatchEvent(pegado)
    expect(entrada.dataset.pegadoEnlaceAsistido).toBe('true')
    expect(entrada.value).toBe('https://docs.google.com/document/d/abc/view')
  })

  it('vincula un equipo fundacional por su clave estable aunque cambie el nombre visible', () => {
    const equipo = { id: 'existente', clave: 'familias', nombre: 'Dpto. Familias' }
    expect(equipoFundacionalCms([equipo], 'familias')).toBe(equipo)
    expect(equipoFundacionalCms([equipo], 'deportes')).toBeNull()
  })

  it('prepara avisos manuales breves sin copiar descripciones sensibles', () => {
    const tarea = { titulo: 'Confirmar la sala', descripcion: 'Dato sensible que no debe copiarse', responsable_nombre: 'Claudia Pérez', estado: 'pendiente' }
    expect(textoAvisoManualTarea(tarea, 'https://aletea.pages.dev/#cms-trabajo?tarea=t1')).toBe('Hola Claudia, tenés una nueva tarea en Aletea: Confirmar la sala. Abrir: https://aletea.pages.dev/#cms-trabajo?tarea=t1')
    expect(textoResumenManualEquipo({ nombre: 'Familias' }, [tarea], 'https://aletea.pages.dev/#cms-trabajo')).toContain('Familias tiene 1 tarea abierta: Confirmar la sala')
    expect(textoResumenManualEquipo({ nombre: 'Familias' }, [tarea], 'https://aletea.pages.dev/#cms-trabajo')).not.toContain('Dato sensible')
  })

  it('orienta a una persona nueva sin ocultar el trabajo disponible', async () => {
    window.localStorage.removeItem('aletea:adopcion:v1:persona-nueva@aletea.org')
    crearPantallaCMSReal(raiz, { sesion: { nombre: 'Persona nueva', correo: 'persona-nueva@aletea.org' }, alIrA, area: 'trabajo' })
    await esperar(); await esperar()
    expect(raiz.textContent).toContain('Tu trabajo y tus avisos viven acá')
    expect(raiz.textContent).toContain('no envía mensajes automáticos por WhatsApp')
    expect(raiz.textContent).toContain('Confirmar la sala')
    ;[...raiz.querySelectorAll('button')].find((control) => control.textContent === 'Entendido').click()
    expect(window.localStorage.getItem('aletea:adopcion:v1:persona-nueva@aletea.org')).toBe('vista')
  })

  it('copia un aviso de tarea y registra solamente la preparación manual', async () => {
    crearPantallaCMSReal(raiz, { sesion: { nombre: 'Claudia', correo: 'claudia@aletea.org' }, alIrA, area: 'trabajo' })
    await esperar(); await esperar()
    const tarea = [...raiz.querySelectorAll('.cms-tarea')].find((fila) => fila.textContent.includes('Confirmar la sala'))
    ;[...tarea.querySelectorAll('button')].find((control) => control.textContent === 'Copiar aviso').click()
    await esperar()
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('Confirmar la sala'))
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/cms/avisos-manuales', expect.objectContaining({ method: 'POST', body: JSON.stringify({ tarea_id: 't1' }) }))
    expect(raiz.textContent).toContain('Aviso copiado')
    expect(raiz.textContent).toContain('no lo marcó como enviado ni leído')
  })

  it('copia un resumen del equipo sin incluir descripciones', async () => {
    crearPantallaCMSReal(raiz, { sesion: { nombre: 'Ale', correo: 'ale@aletea.org' }, alIrA, area: 'familias' })
    await esperar(); await esperar()
    ;[...raiz.querySelectorAll('button')].find((control) => control.textContent === 'Copiar resumen del equipo').click()
    await esperar()
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('Familias tiene'))
    expect(navigator.clipboard.writeText).not.toHaveBeenCalledWith(expect.stringContaining('Llamar antes del jueves'))
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/cms/avisos-manuales', expect.objectContaining({ method: 'POST', body: JSON.stringify({ equipo_id: 'e1' }) }))
  })
  it('muestra carga semanal, explica estimaciones faltantes y permite actualizar la disponibilidad', async () => {
    crearPantallaCMSReal(raiz, { sesion: { nombre: 'Claudia', correo: 'claudia@aletea.org' }, alIrA, area: 'trabajo' })
    await esperar(); await esperar()
    expect(raiz.textContent).toContain('Capacidad de trabajo')
    expect(raiz.textContent).toContain('10 h asignadas')
    expect(raiz.textContent).toContain('1 sin estimar')
    expect(raiz.textContent).toContain('Revisar carga')
    ;[...raiz.querySelectorAll('button')].find((control) => control.textContent.includes('Editar disponibilidad')).click()
    const horas = raiz.querySelector('[aria-label="Horas disponibles por semana"]')
    horas.value = '12'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar(); await esperar()
    const llamada = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/capacidad')
    expect(JSON.parse(llamada[1].body)).toMatchObject({ usuario_correo: 'claudia@aletea.org', horas_semanales: '12' })
  })

  it('muestra una salida clara y permite reintentar cuando no carga el tablero', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ error: 'El tablero no está disponible.' }), { status: 503 }))
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    expect(raiz.querySelector('[aria-busy="true"]')).not.toBeNull()
    await esperar(); await esperar()
    expect(raiz.textContent).toContain('El tablero no está disponible')
    expect([...raiz.querySelectorAll('button')].some((boton) => boton.textContent.includes('Reintentar'))).toBe(true)
  })

  it('muestra la prioridad, el responsable y el contexto institucional', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale', correo: 'claudia@aletea.org' }, alIrA })
    await esperar()
    expect(raiz.textContent).toContain('Aletea')
    expect(raiz.textContent).toContain('Confirmar la sala')
    expect(raiz.textContent).toContain('Claudia')
    expect(raiz.textContent).toContain('Seguimiento pendiente')
    expect(raiz.textContent).toContain('2 equipos activos')
    expect(raiz.textContent).toContain('Tu seguimiento')
    expect(raiz.textContent).toContain('Horizonte institucional')
    expect(raiz.textContent).toContain('7 días')
    expect(raiz.textContent).toContain('2 tareas a tu cargo')
    expect(raiz.querySelector('.cms-radar')).not.toBeNull()
  })

  it('presenta los siete equipos como destinos en el centro de mando', async () => {
    crearPantallaCMSReal(raiz, { sesion: { nombre: 'Ale' }, alIrA, area: 'control' })
    await esperar()
    expect([...raiz.querySelectorAll('.cms-mapa-nodo')].map((fila) => fila.textContent)).toEqual(expect.arrayContaining([
      expect.stringContaining('Familias'), expect.stringContaining('Deportes'), expect.stringContaining('Comunicación'),
      expect.stringContaining('Capacitaciones'), expect.stringContaining('Finanzas'), expect.stringContaining('Eventos'),
      expect.stringContaining('Administración'),
    ]))
    expect(raiz.querySelector('details.cms-area')).toBeNull()
  })

  it('convierte el inicio móvil en una vista breve de hoy y conserva las acciones prioritarias', async () => {
    vistaMovilCms = true
    crearPantallaCMSReal(raiz, { sesion: { nombre: 'Ale', correo: 'claudia@aletea.org' }, alIrA, area: 'control' })
    await esperar()
    expect(raiz.querySelector('.cms-hoy-movil')).not.toBeNull()
    expect(raiz.querySelector('.cms-radar')).toBeNull()
    expect(raiz.textContent).not.toContain('Así se mueve Aletea hoy')
    raiz.querySelector('.cms-hoy-alerta button').click()
    expect(alIrA).toHaveBeenCalledWith('cms-agenda', {})
  })

  it('ofrece una creación rápida persistente en móvil sin duplicar las acciones del encabezado', async () => {
    vistaMovilCms = true
    crearPantallaCMSReal(raiz, { sesion: { nombre: 'Ale', correo: 'claudia@aletea.org' }, alIrA, area: 'control' })
    await esperar()
    const crear = raiz.querySelector('.cms-accion-rapida-movil')
    expect(crear).not.toBeNull()
    expect(crear.getAttribute('aria-label')).toContain('Crear una tarea')
    crear.click()
    expect(raiz.querySelector('.cms-captura-rapida')).not.toBeNull()
    expect(raiz.querySelector('.cms-accion-rapida-movil')).toBeNull()
  })

  it('mantiene la búsqueda institucional disponible en móvil', async () => {
    vistaMovilCms = true
    crearPantallaCMSReal(raiz, { sesion: { nombre: 'Ale', correo: 'claudia@aletea.org' }, alIrA, area: 'control' })
    await esperar()
    const buscar = raiz.querySelector('input[aria-label="Buscar en Aletea"]')
    buscar.value = 'taller'
    buscar.dispatchEvent(new Event('input', { bubbles: true }))
    expect(raiz.querySelector('.cms-busqueda-resultados').textContent).toContain('Evento: Taller de juego')
  })

  it('pliega las secciones secundarias de Agenda en móvil', async () => {
    vistaMovilCms = true
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA, area: 'agenda' })
    await esperar()
    expect(raiz.querySelector('.cms-eventos')).not.toBeNull()
    expect([...raiz.querySelectorAll('details.cms-seccion-movil')].map((bloque) => bloque.querySelector('strong')?.textContent)).toEqual(expect.arrayContaining(['Decisiones', 'Reuniones', 'Rutinas']))
  })

  it('recuerda las secciones móviles abiertas durante la sesión', async () => {
    vistaMovilCms = true
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA, area: 'agenda' })
    await esperar()
    const decisiones = [...raiz.querySelectorAll('details.cms-seccion-movil')]
      .find((bloque) => bloque.querySelector('strong')?.textContent === 'Decisiones')
    decisiones.open = true
    decisiones.dispatchEvent(new Event('toggle'))

    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA, area: 'agenda' })
    await esperar()
    const restaurada = [...raiz.querySelectorAll('details.cms-seccion-movil')]
      .find((bloque) => bloque.querySelector('strong')?.textContent === 'Decisiones')
    expect(restaurada.open).toBe(true)
  })

  it('pliega el contenido secundario de los equipos en móvil sin alterar el escritorio', async () => {
    vistaMovilCms = true
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA, area: 'familias' })
    await esperar()
    expect([...raiz.querySelectorAll('details.cms-seccion-movil')].map((bloque) => bloque.querySelector('strong')?.textContent)).toEqual(expect.arrayContaining(['Personas y resguardos', 'Formularios y entradas', 'Programas y alianzas']))

    vistaMovilCms = false
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA, area: 'familias' })
    await esperar()
    expect(raiz.querySelector('details.cms-seccion-movil')).toBeNull()
    expect(raiz.querySelector('.cms-programas')).not.toBeNull()
    expect([...raiz.querySelectorAll('.cms-estructura h3')].some((titulo) => titulo.textContent === 'Alianzas institucionales')).toBe(true)
  })

  it('no muestra alertas postergadas en el resumen móvil', async () => {
    vistaMovilCms = true
    alertasPospuestasCms = [{ clave: 'riesgos:Riesgo alto: Confirmación del local', postergada_hasta: '2099-08-24' }]
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA, area: 'control' })
    await esperar()
    expect(raiz.querySelector('.cms-hoy-movil').textContent).not.toContain('Riesgo alto: Confirmación del local')
  })

  it('muestra el registro institucional solo a Administración', async () => {
    perfilCms = 'administracion'
    crearPantallaCMSReal(raiz, { sesion: { nombre: 'Ale' }, alIrA, area: 'administracion' })
    await esperar()
    expect(raiz.textContent).toContain('Registro institucional')
    expect(raiz.textContent).toContain('Confirmar accesibilidad')
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/auditoria?limite=50', expect.any(Object))
  })

  it('no consulta ni muestra el registro institucional para Coordinación', async () => {
    crearPantallaCMSReal(raiz, { sesion: { nombre: 'Ale' }, alIrA, area: 'administracion' })
    await esperar()
    expect(raiz.textContent).not.toContain('Registro institucional')
    expect(globalThis.fetch.mock.calls.some(([url]) => url === '/api/auditoria?limite=50')).toBe(false)
  })

  it('muestra y permite reintentar una rutina fallida sin exponer el error técnico', async () => {
    automatizacionesCms = [{ id: 'auto1', recurrencia_id: 'tr1', estado: 'fallida', actualizado_en: '2026-08-17T14:30:00Z' }]
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA, area: 'agenda' })
    await esperar()
    expect(raiz.textContent).toContain('El último intento no pudo completarse')
    const reintentar = [...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Reintentar ahora'))
    expect(reintentar).toBeTruthy()
    reintentar.click(); await esperar(); await esperar()
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/cms/tareas-recurrentes/tr1/generar', expect.objectContaining({ method: 'POST' }))
  })

  it('abre cada equipo en su propio espacio sin desplegarlo en el centro', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA, area: 'eventos' })
    await esperar()
    expect(raiz.querySelector('.cms-area')).toBeNull()
    expect(raiz.textContent).toContain('Espacio de trabajo de eventos.')
    expect(raiz.textContent).toContain('Conflictos de agenda')
  })

  it('muestra las rutinas recurrentes dentro del mapa de su equipo', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    expect(raiz.textContent).toContain('Rutinas: Revisar agenda semanal')
  })

  it('ofrece modelos de automatización revisables antes de crear una rutina', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    expect(raiz.textContent).toContain('Revisión semanal de coordinación')
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Planificar publicaciones del mes')).click()
    expect(raiz.querySelector('input[aria-label="Título de tarea recurrente"]').value).toBe('Planificar publicaciones del mes')
    expect(raiz.querySelector('select[aria-label="Frecuencia de tarea recurrente"]').value).toBe('mensual')
  })

  it('mantiene las directrices vigentes visibles y permite iniciar una nueva', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale', correo: 'claudia@aletea.org' }, alIrA })
    await esperar()
    expect(raiz.textContent).toContain('Directrices vigentes')
    expect(raiz.textContent).toContain('Priorizar accesibilidad en actividades')
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Nueva directriz')).click()
    expect(raiz.querySelector('select[aria-label="Tipo"]').value).toBe('directriz')
  })

  it('ofrece una captura rápida que lleva cada cosa al módulo correspondiente', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Crear')).click()
    expect(raiz.textContent).toContain('Captura rápida')
    expect(raiz.textContent).toContain('Actividad o evento')
    expect(raiz.textContent).toContain('Preparar reunión')
    expect([...raiz.querySelectorAll('.cms-captura-acciones button')].map((boton) => boton.textContent.trim())).toEqual(['Cerrar'])
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Nota para ordenar')).click()
    expect(raiz.querySelector('select[aria-label="Tipo"]').value).toBe('nota')
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Cancelar')).click()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Crear')).click()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Actividad o evento')).click()
    expect(raiz.textContent).toContain('Nueva actividad o evento')
  })

  it('muestra avisos internos y permite marcarlos como leídos', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale', correo: 'claudia@aletea.org' }, alIrA })
    await esperar()
    expect(raiz.textContent).toContain('Novedades')
    expect(raiz.textContent).toContain('Nueva tarea asignada')
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Marcar como leída')).click()
    await esperar()
    const [, opciones] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/notificaciones/n1')
    expect(opciones.method).toBe('PATCH')
  })

  it('abre una notificación en el contexto exacto de su tarea', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale', correo: 'claudia@aletea.org' }, alIrA })
    await esperar()
    raiz.querySelector('.cms-notificacion button').click()
    await esperar()
    expect(alIrA).toHaveBeenCalledWith('cms-trabajo', { tareaId: 't1' })
  })

  it('muestra comunicados internos y permite iniciar uno nuevo', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale', correo: 'claudia@aletea.org' }, alIrA })
    await esperar()
    expect(raiz.textContent).toContain('Comunicados internos')
    expect(raiz.textContent).toContain('Cambio de horario')
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Nuevo comunicado')).click()
    expect(raiz.textContent).toContain('Nuevo comunicado interno')
    expect(raiz.textContent).not.toContain('[object HTMLSelectElement]')
    expect(raiz.querySelector('.cms-captura-comunicado select')).not.toBeNull()
  })

  it('no publica un comunicado sin título', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale', correo: 'claudia@aletea.org' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Nuevo comunicado')).click()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Publicar comunicado')).click()
    await esperar()
    expect(globalThis.fetch.mock.calls.some(([url]) => url === '/api/cms/comunicados')).toBe(false)
  })

  it('muestra un borrador semanal revisable sin crear datos nuevos', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale', correo: 'claudia@aletea.org' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Ver resumen')).click()
    expect(raiz.textContent).toContain('Borrador revisable')
    expect(raiz.textContent).toContain('Tareas atrasadas')
    expect(raiz.textContent).toContain('Entradas para revisar')
    expect(globalThis.fetch.mock.calls.filter(([url]) => url === '/api/cms/tablero')).toHaveLength(1)
  })

  it('prioriza alertas institucionales con acceso a su contexto', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale', correo: 'claudia@aletea.org' }, alIrA })
    await esperar()
    expect(raiz.textContent).toContain('Alertas institucionales')
    expect(raiz.textContent).toContain('Riesgo alto: Confirmación del local')
    expect(raiz.textContent).toContain('Conflicto de agenda')
    expect([...raiz.querySelectorAll('button')].some((boton) => boton.textContent.includes('Ver riesgos'))).toBe(true)
  })

  it('lleva cada alerta a su sección y conserva el filtro de trabajo pertinente', async () => {
    tareaBloqueadaCms = true
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale', correo: 'claudia@aletea.org' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Ver riesgos')).click()
    expect(alIrA).toHaveBeenCalledWith('cms-finanzas', {})

    const alertaBloqueada = [...raiz.querySelectorAll('.cms-alerta-institucional')]
      .find((tarjeta) => tarjeta.textContent.includes('Tarea bloqueada'))
    alertaBloqueada.querySelector('button').click()
    expect(alIrA).toHaveBeenCalledWith('cms-trabajo', { filtroTrabajo: 'bloqueadas' })
  })

  it('postergar una alerta solo la oculta para la cuenta actual y permite reactivarla', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale', correo: 'claudia@aletea.org' }, alIrA })
    await esperar()
    const postergar = [...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Postergar 7 días'))
    expect(postergar).toBeTruthy()
    postergar.click(); await esperar(); await esperar()
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/cms/alertas-pospuestas', expect.objectContaining({ method: 'POST' }))

    alertasPospuestasCms = [{ clave: 'riesgos:Riesgo alto: Confirmación del local', postergada_hasta: '2099-08-24' }]
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale', correo: 'claudia@aletea.org' }, alIrA })
    await esperar()
    expect(raiz.textContent).toContain('alerta está postergada para vos')
    const reactivar = [...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Reactivar'))
    expect(reactivar).toBeTruthy()
    reactivar.click(); await esperar(); await esperar()
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/cms/alertas-pospuestas', expect.objectContaining({ method: 'DELETE' }))
  })

  it('crea una tarea desde la captura rápida', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Crear')).click()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Nueva tarea')).click()
    const datosAdicionales = raiz.querySelector('details.cms-datos-adicionales')
    expect(datosAdicionales.open).toBe(false)
    expect(datosAdicionales.querySelector('input[aria-label="Esfuerzo estimado en horas"]')).not.toBeNull()
    const titulo = raiz.querySelector('input[aria-label="Nueva tarea"]')
    titulo.value = 'Preparar material para el taller'
    raiz.querySelector('select[aria-label="Actividad relacionada"]').value = 'ev1'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/cms/tareas', expect.objectContaining({ method: 'POST' }))
    const [, opciones] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/tareas')
    expect(JSON.parse(opciones.body)).toMatchObject({ titulo: 'Preparar material para el taller', prioridad: 'normal', evento_id: 'ev1' })
  })

  it('abre los datos adicionales al editar una tarea con esfuerzo estimado', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    const tarea = [...raiz.querySelectorAll('.cms-tarea')].find((fila) => fila.textContent.includes('Confirmar la sala'))
    ;[...tarea.querySelectorAll('button')].find((boton) => boton.textContent.includes('Editar tarea')).click()
    const datosAdicionales = raiz.querySelector('details.cms-datos-adicionales')
    expect(datosAdicionales.open).toBe(true)
    expect(datosAdicionales.querySelector('input[aria-label="Esfuerzo estimado en horas"]').value).toBe('2')
  })

  it('permite crear un formulario con visibilidad elegida por quien lo configura', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Nuevo formulario')).click()
    raiz.querySelector('input[aria-label="Título del formulario"]').value = 'Inscripción a jornada'
    raiz.querySelector('select[aria-label="Visibilidad del formulario"]').value = 'publica'
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Crear formulario')).click()
    await esperar()
    const [, opciones] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/formularios')
    expect(JSON.parse(opciones.body)).toMatchObject({ titulo: 'Inscripción a jornada', visibilidad: 'publica', tipo: 'voluntariado' })
  })

  it('exige el equipo destinatario al crear un formulario de propuesta', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Nuevo formulario')).click()
    raiz.querySelector('input[aria-label="Título del formulario"]').value = 'Propuestas para el encuentro'
    const tipo = raiz.querySelector('select[aria-label="Tipo de formulario"]')
    tipo.value = 'propuesta'; tipo.dispatchEvent(new Event('change'))
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Crear formulario')).click()
    await esperar()
    expect(globalThis.fetch.mock.calls.some(([url]) => url === '/api/cms/formularios')).toBe(false)
  })

  it('ofrece abrir y copiar el enlace de un formulario público activo', async () => {
    const abrir = vi.spyOn(window, 'open').mockImplementation(() => null)
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    const acciones = [...raiz.querySelectorAll('button')]
    expect(acciones.some((boton) => boton.textContent.includes('Abrir formulario público'))).toBe(true)
    expect(acciones.some((boton) => boton.textContent.includes('Copiar enlace'))).toBe(true)
    acciones.find((boton) => boton.textContent.includes('Abrir formulario público')).click()
    expect(abrir).toHaveBeenCalledWith(expect.stringContaining('formulario.html?id=f1'), '_blank', 'noopener')
  })

  it('resume y filtra formularios por visibilidad y estado', async () => {
    crearPantallaCMSReal(raiz, { sesion: { nombre: 'Ale' }, alIrA, area: 'formularios' })
    await esperar()
    expect(raiz.querySelector('.cms-resumen-formularios').textContent).toContain('2 respuestas')
    const publicos = [...raiz.querySelectorAll('button')].find((control) => control.textContent.includes('Públicos'))
    publicos.click()
    expect([...raiz.querySelectorAll('button')].find((control) => control.textContent.includes('Públicos')).getAttribute('aria-pressed')).toBe('true')
    expect(raiz.textContent).toContain('Sumate como voluntario')
  })

  it('muestra y registra alianzas institucionales sin pedir contactos personales', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    expect(raiz.textContent).toContain('Alianzas institucionales')
    expect(raiz.textContent).toContain('Red comunitaria')
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Nueva alianza')).click()
    expect(raiz.textContent).toContain('canal institucional')
    raiz.querySelector('input[aria-label="Nombre de la alianza"]').value = 'Espacio cultural barrial'
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Registrar alianza')).click()
    await esperar()
    const [, opciones] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/alianzas')
    expect(JSON.parse(opciones.body)).toMatchObject({ nombre: 'Espacio cultural barrial', tipo: 'aliado', estado: 'activa' })
  })

  it('permite registrar programas institucionales además de Fútbol sin Barreras', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    expect(raiz.textContent).toContain('Familias y comunidad')
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Nuevo programa')).click()
    raiz.querySelector('input[aria-label="Nombre del programa"]').value = 'Capacitaciones'
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Crear programa')).click()
    await esperar()
    const [, opciones] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/programas')
    expect(JSON.parse(opciones.body)).toMatchObject({ nombre: 'Capacitaciones', estado: 'activo' })
  })

  it('permite crear una comisión sin crear otro modelo de responsabilidades', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Nuevo equipo')).click()
    expect(raiz.textContent).toContain('Nuevo equipo o comisión')
    raiz.querySelector('input[aria-label="Nombre del equipo"]').value = 'Comisión Fiscal'
    raiz.querySelector('select[aria-label="Categoría institucional"]').value = 'comision_fiscal'
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Crear equipo')).click()
    await esperar()
    const [, opciones] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/equipos')
    expect(JSON.parse(opciones.body)).toMatchObject({ nombre: 'Comisión Fiscal', categoria: 'comision_fiscal' })
  })

  it('muestra la preparación de una actividad y crea una tarea ya vinculada', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    expect(raiz.textContent).toContain('Preparación: 1 de 3 completadas')
    expect(raiz.textContent).toContain('2 pendientes')
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Agregar tarea')).click()
    expect(raiz.querySelector('select[aria-label="Actividad relacionada"]').value).toBe('ev1')
    expect(raiz.querySelector('select[aria-label="Equipo"]').value).toBe('e1')
    expect(raiz.querySelector('select[aria-label="Responsable"]').value).toBe('claudia@aletea.org')
    expect(raiz.querySelector('input[aria-label="Fecha límite"]').value).toBe('2026-08-24')
    raiz.querySelector('input[aria-label="Nueva tarea"]').value = 'Preparar materiales'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    const [, opciones] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/tareas')
    expect(JSON.parse(opciones.body)).toMatchObject({ titulo: 'Preparar materiales', evento_id: 'ev1' })
  })

  it('advierte conflictos de agenda y abre la agenda institucional', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    expect(raiz.textContent).toContain('Conflictos de agenda')
    expect(raiz.textContent).toContain('Taller de juego y Reunión de familias')
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Ver agenda')).click()
    expect(alIrA).toHaveBeenCalledWith('agenda')
  })

  it('crea y aplica una checklist reutilizable a una actividad', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    expect(raiz.textContent).toContain('Checklists reutilizables')
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Nueva checklist')).click()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Usar modelo de actividad')).click()
    expect(raiz.querySelectorAll('input[aria-label="Tarea de la checklist"]')).toHaveLength(5)
    expect(raiz.querySelector('input[aria-label="Días antes o después de la actividad"]').min).toBe('-365')
    raiz.querySelector('input[aria-label="Nombre de la checklist"]').value = 'Preparar taller'
    const tareas = raiz.querySelectorAll('input[aria-label="Tarea de la checklist"]')
    tareas.forEach((tarea, indice) => { tarea.value = `Paso ${indice + 1}` })
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    const [, opcionesCrear] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/plantillas-tareas')
    expect(JSON.parse(opcionesCrear.body).tareas).toHaveLength(5)

    raiz.querySelector('[aria-label="Actividad para Preparar jornada"]').value = 'ev1'
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Aplicar checklist')).click()
    await esperar()
    const [, opcionesAplicar] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/plantillas-tareas/pl1/aplicar')
    expect(JSON.parse(opcionesAplicar.body)).toEqual({ evento_id: 'ev1' })
  })

  it('crea y genera una tarea recurrente con su próximo vencimiento', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    expect(raiz.textContent).toContain('Tareas recurrentes')
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Nueva tarea recurrente')).click()
    raiz.querySelector('input[aria-label="Título de tarea recurrente"]').value = 'Revisar agenda mensual'
    raiz.querySelector('select[aria-label="Frecuencia de tarea recurrente"]').value = 'mensual'
    raiz.querySelector('input[aria-label="Próxima fecha de tarea recurrente"]').value = '2026-08-31'
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Crear tarea recurrente')).click()
    await esperar()
    const [, opcionesCrear] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/tareas-recurrentes')
    expect(JSON.parse(opcionesCrear.body)).toMatchObject({ titulo: 'Revisar agenda mensual', frecuencia: 'mensual', proxima_fecha: '2026-08-31' })

    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Generar ahora')).click()
    await esperar()
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/cms/tareas-recurrentes/tr1/generar', expect.objectContaining({ method: 'POST' }))
  })

  it('crea una solicitud para un equipo y la identifica como tal', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Solicitar a un equipo')).click()
    expect(raiz.textContent).toContain('registra quién la creó')
    expect(raiz.textContent).toContain('se asigna primero a Coordinación')
    raiz.querySelector('input[aria-label="Nueva tarea"]').value = 'Confirmar transporte'
    raiz.querySelector('select[aria-label="Equipo"]').value = 'e1'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    const [, opciones] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/tareas')
    expect(JSON.parse(opciones.body)).toMatchObject({ titulo: 'Confirmar transporte', tipo: 'solicitud', equipo_id: 'e1' })
  })

  it('deriva una entrada a una tarea trazable para el equipo', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    expect(raiz.textContent).toContain('Bandeja de entradas')
    expect(raiz.textContent).toContain('Camila Pérez')
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Registrar entrada')).click()
    raiz.querySelector('input[aria-label="Nombre o referencia de la entrada"]').value = 'Lucía García'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    const [, opciones] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/entradas')
    expect(JSON.parse(opciones.body)).toMatchObject({ tipo: 'voluntariado', nombre: 'Lucía García', equipo_id: null, prioridad: 'normal' })
  })

  it('no deriva una entrada sin nombre ni un pedido sin sus dos equipos', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Registrar entrada')).click()
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    expect(globalThis.fetch.mock.calls.some(([url]) => url === '/api/cms/entradas')).toBe(false)

    raiz.querySelector('input[aria-label="Nombre o referencia de la entrada"]').value = 'Apoyo para una jornada'
    const tipo = raiz.querySelector('select[aria-label="Tipo de entrada"]')
    tipo.value = 'pedido'; tipo.dispatchEvent(new Event('change'))
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    expect(globalThis.fetch.mock.calls.some(([url]) => url === '/api/cms/entradas')).toBe(false)
  })

  it('conserva los datos del formulario y permite reintentar cuando falla un guardado', async () => {
    const respuestaBase = globalThis.fetch
    globalThis.fetch = vi.fn(async (url, opciones) => {
      if (url === '/api/cms/entradas') return new Response(JSON.stringify({ error: 'No se pudo registrar la entrada.' }), { status: 503 })
      return respuestaBase(url, opciones)
    })
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Registrar entrada')).click()
    const nombre = raiz.querySelector('input[aria-label="Nombre o referencia de la entrada"]')
    nombre.value = 'Lucía García'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar(); await esperar()
    expect(raiz.querySelector('input[aria-label="Nombre o referencia de la entrada"]').value).toBe('Lucía García')
    expect(raiz.querySelector('[role="alert"]').textContent).toContain('No se pudo registrar la entrada')
    expect(raiz.querySelector('.cms-captura-acciones .boton-principal').disabled).toBe(false)
  })

  it('permite preparar en agenda una fecha propuesta después de revisarla', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    expect(raiz.textContent).toContain('Fecha propuesta:')
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Preparar en agenda')).click()
    await esperar()
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/cms/entradas/en2/agendar', expect.objectContaining({ method: 'POST' }))
  })

  it('conserva ambos equipos y la prioridad de un pedido', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Registrar entrada')).click()
    await esperar()
    const tipo = raiz.querySelector('select[aria-label="Tipo de entrada"]')
    tipo.value = 'pedido'; tipo.dispatchEvent(new Event('change'))
    raiz.querySelector('input[aria-label="Nombre o referencia de la entrada"]').value = 'Apoyo para una jornada'
    raiz.querySelector('select[aria-label="Equipo de la entrada"]').value = 'e1'
    raiz.querySelector('select[aria-label="Equipo que realiza el pedido"]').value = 'e2'
    raiz.querySelector('select[aria-label="Prioridad del pedido"]').value = 'alta'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    const [, opciones] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/entradas')
    expect(JSON.parse(opciones.body)).toMatchObject({ tipo: 'pedido', equipo_id: 'e1', equipo_solicitante_id: 'e2', prioridad: 'alta' })
  })

  it('edita y completa una tarea vinculada a una actividad', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('.cms-tarea')].find((fila) => fila.textContent.includes('Confirmar la sala')).querySelectorAll('button')[1].click()
    expect(raiz.querySelector('input[aria-label="Título de la tarea"]').value).toBe('Confirmar la sala')
    expect(raiz.querySelector('textarea[aria-label="Descripción de la tarea"]').value).toBe('Llamar antes del jueves.')
    expect(raiz.textContent).toContain('Actividad relacionada')
    expect(raiz.querySelector('input[aria-label="Próximo seguimiento"]').value).toBe('2026-08-15')
    raiz.querySelector('select[aria-label="Estado de la tarea"]').value = 'bloqueada'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    const [, opcionesEdicion] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/tareas/t1')
    expect(opcionesEdicion.method).toBe('PATCH')
    expect(JSON.parse(opcionesEdicion.body)).toMatchObject({ estado: 'bloqueada', evento_id: 'ev1', fecha_seguimiento: '2026-08-15', descripcion: 'Llamar antes del jueves.' })

    ;[...raiz.querySelectorAll('.cms-tarea')].find((fila) => fila.textContent.includes('Confirmar la sala')).querySelector('button').click()
    await esperar()
    const llamadas = globalThis.fetch.mock.calls.filter(([url]) => url === '/api/cms/tareas/t1')
    expect(JSON.parse(llamadas.at(-1)[1].body)).toEqual({ estado: 'completada' })
  })

  it('crea un proyecto con equipo y responsable elegibles', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Nuevo proyecto')).click()
    raiz.querySelector('input[aria-label="Nombre del proyecto"]').value = 'Escuela de familias'
    raiz.querySelector('select[aria-label="Equipo del proyecto"]').value = 'e1'
    raiz.querySelector('select[aria-label="Responsable del proyecto"]').value = 'claudia@aletea.org'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    const [, opciones] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/proyectos')
    expect(JSON.parse(opciones.body)).toMatchObject({ titulo: 'Escuela de familias', equipo_id: 'e1', responsable_correo: 'claudia@aletea.org' })
    await esperar()
    expect(raiz.textContent).toContain('Proyecto creado')
    expect([...raiz.querySelectorAll('button')].some((boton) => boton.textContent.includes('Agregar primera tarea'))).toBe(true)
  })

  it('propone el equipo al crear tareas y proyectos desde su pantalla', async () => {
    crearPantallaCMSReal(raiz, { sesion: { nombre: 'Ale' }, alIrA, area: 'familias' })
    await esperar()
    const acciones = raiz.querySelector('.cms-ficha-area-acciones')
    ;[...acciones.querySelectorAll('button')].find((control) => control.textContent.includes('Nueva tarea')).click()
    expect(raiz.querySelector('select[aria-label="Equipo"]').value).toBe('e1')
    ;[...raiz.querySelectorAll('button')].find((control) => control.textContent === 'Cancelar').click()
    ;[...raiz.querySelectorAll('.cms-ficha-area-acciones button')].find((control) => control.textContent.includes('Nuevo proyecto')).click()
    expect(raiz.querySelector('select[aria-label="Equipo del proyecto"]').value).toBe('e1')
  })

  it('conserva los enlaces de materiales al editar una tarea', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('.cms-tarea')].find((fila) => fila.textContent.includes('Confirmar la sala')).querySelectorAll('button')[1].click()
    raiz.querySelector('textarea[aria-label="Descripción de la tarea"]').value = 'Material https://canva.com/diseno'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    const llamada = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/tareas/t1')
    expect(JSON.parse(llamada[1].body).descripcion).toContain('https://canva.com/diseno')
  })

  it('muestra hitos y presupuesto ejecutado, y permite registrar ambos', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    expect(raiz.textContent).toContain('1 de 2 hitos completados')
    expect(raiz.textContent).toContain('Ejecutado $2.250 UYU')
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Ver seguimiento')).click()
    expect(raiz.textContent).toContain('Confirmar equipos')
    expect(raiz.textContent).toContain('disponible $12.750 UYU')
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Agregar hito')).click()
    raiz.querySelector('input[aria-label="Hito del proyecto"]').value = 'Cerrar evaluación'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    const [, opcionesHito] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/proyectos/p1/hitos')
    expect(JSON.parse(opcionesHito.body)).toMatchObject({ titulo: 'Cerrar evaluación', estado: 'pendiente' })
  })

  it('carga el contexto completo del proyecto en un solo seguimiento', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Ver seguimiento')).click()
    await esperar()
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/cms/proyectos/p1/contexto', expect.any(Object))
    expect(raiz.textContent).toContain('Coordinar transporte')
    expect(raiz.textContent).toContain('Jornada abierta')
    expect(raiz.textContent).toContain('Priorizar accesibilidad')
    expect(raiz.textContent).toContain('Guía de jornada')
  })

  it('agrega un documento con enlace y contexto institucional', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar(); ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Agregar documento')).click()
    raiz.querySelector('input[aria-label="Título del recurso"]').value = 'Guía de familias'
    raiz.querySelector('input[aria-label="Enlace del recurso"]').value = 'https://drive.google.com/guia'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await esperar()
    const [, opciones] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/documentos')
    expect(JSON.parse(opciones.body)).toMatchObject({ titulo: 'Guía de familias', url: 'https://drive.google.com/guia', tipo: 'enlace' })
  })

  it('acepta texto copiado desde Google Drive y confirma el enlace reconocido', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar(); ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Agregar documento')).click()
    const entrada = raiz.querySelector('input[aria-label="Enlace del recurso"]')
    const pegado = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(pegado, 'clipboardData', { value: { getData: () => 'Registro MEC\nhttps://drive.google.com/file/d/abc/view?usp=sharing' } })
    entrada.dispatchEvent(pegado)
    expect(pegado.defaultPrevented).toBe(true)
    expect(entrada.value).toBe('https://drive.google.com/file/d/abc/view?usp=sharing')
    expect(entrada.dataset.pegadoEnlaceAsistido).toBe('true')
    expect(raiz.textContent).toContain('Enlace de Google Drive reconocido.')
  })

  it('ofrece pegar el enlace y explica la alternativa si el navegador bloquea el portapapeles', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { readText: vi.fn(async () => { throw new Error('sin permiso') }), writeText: vi.fn(async () => {}) } })
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar(); ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Agregar documento')).click()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent === 'Pegar enlace').click()
    await esperar()
    expect(raiz.textContent).toContain('Presioná Ctrl+V en el campo.')
  })

  it('busca y filtra el centro documental sin volver a cargar el tablero', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    const buscar = raiz.querySelector('input[aria-label="Buscar documentos"]')
    buscar.value = 'minuta'
    buscar.dispatchEvent(new Event('input', { bubbles: true }))
    expect(raiz.textContent).toContain('Plantilla de minuta')
    expect(raiz.textContent).not.toContain('Guía de familias')

    raiz.querySelector('select[aria-label="Filtrar documentos por tipo"]').value = 'acta'
    raiz.querySelector('select[aria-label="Filtrar documentos por tipo"]').dispatchEvent(new Event('change', { bubbles: true }))
    expect(raiz.textContent).toContain('No hay documentos que coincidan con estos filtros.')
    expect(globalThis.fetch.mock.calls.filter(([url]) => url === '/api/cms/tablero')).toHaveLength(1)
  })

  it('agenda una actividad institucional con contexto opcional', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar(); ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Nueva actividad')).click()
    raiz.querySelector('input[aria-label="Título de la actividad"]').value = 'Jornada de familias'
    raiz.querySelector('[data-selector-cms="fecha-hora"]').value = '2026-09-04T17:30'
    raiz.querySelector('select[aria-label="Equipo de la actividad"]').value = 'e1'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await esperar()
    const [, opciones] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/eventos')
    expect(JSON.parse(opciones.body)).toMatchObject({ titulo: 'Jornada de familias', fecha_hora: '2026-09-04T17:30', equipo_id: 'e1', frecuencia_evento: null, repetir_hasta: null })
  })

  it('permite agendar una serie completa de actividades desde un solo formulario', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar(); ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Nueva actividad')).click()
    raiz.querySelector('input[aria-label="Título de la actividad"]').value = 'Reunión de coordinación'
    raiz.querySelector('[data-selector-cms="fecha-hora"]').value = '2026-09-04T17:30'
    const frecuencia = raiz.querySelector('select[aria-label="Repetición de la actividad"]')
    frecuencia.value = 'quincenal'
    frecuencia.dispatchEvent(new Event('change', { bubbles: true }))
    const hasta = [...raiz.querySelectorAll('[data-selector-cms="fecha"]')].find((control) => control.closest('.selector-fecha')?.textContent.includes('Repetir actividad hasta'))
    hasta.value = '2026-12-31'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await esperar()
    const [, opciones] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/eventos')
    expect(JSON.parse(opciones.body)).toMatchObject({ frecuencia_evento: 'quincenal', repetir_hasta: '2026-12-31' })
  })

  it('cambia la agenda entre mes, semana y lista sin recargar datos', async () => {
    crearPantallaCMSReal(raiz, { sesion: { nombre: 'Ale' }, alIrA, area: 'agenda' })
    await esperar()
    expect(raiz.querySelector('.cms-calendario-mes')).not.toBeNull()
    ;[...raiz.querySelectorAll('button')].find((control) => control.textContent === 'Lista').click()
    expect(raiz.querySelector('.cms-calendario-mes')).toBeNull()
    expect(raiz.textContent).toContain('Taller de juego')
    expect(globalThis.fetch.mock.calls.filter(([url]) => url === '/api/cms/tablero')).toHaveLength(1)
  })

  it('muestra los próximos 30 días como horizonte operativo sin volver a pedir el tablero', async () => {
    crearPantallaCMSReal(raiz, { sesion: { nombre: 'Ale' }, alIrA, area: 'agenda' })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((control) => control.textContent === 'Próximos 30 días').click()
    expect(raiz.querySelector('.cms-calendario-mes')).toBeNull()
    expect(raiz.textContent).toContain('Taller de juego')
    expect(globalThis.fetch.mock.calls.filter(([url]) => url === '/api/cms/tablero')).toHaveLength(1)
  })

  it('orienta el perfil, lleva los indicadores al filtro correspondiente y da ayuda contextual', async () => {
    crearPantallaCMSReal(raiz, { sesion: { nombre: 'Ale' }, alIrA, area: 'control' })
    await esperar()
    expect(raiz.textContent).toContain('Coordinación de esta semana')
    expect(raiz.textContent).toContain('Cómo usar este panel')
    const indicador = [...raiz.querySelectorAll('.cms-indicador')].find((control) => control.textContent.includes('Atrasadas'))
    indicador.click()
    expect(alIrA).toHaveBeenCalledWith('cms-trabajo', { filtroTrabajo: 'atrasadas' })
  })

  it('busca en la institución y conserva el contexto al abrir un resultado', async () => {
    crearPantallaCMSReal(raiz, { sesion: { nombre: 'Ale' }, alIrA, area: 'control' })
    await esperar()
    const buscar = raiz.querySelector('input[aria-label="Buscar en Aletea"]')
    buscar.value = 'sala'
    buscar.dispatchEvent(new Event('input', { bubbles: true }))
    const resultado = raiz.querySelector('.cms-busqueda-resultado')
    expect(resultado.textContent).toContain('Tarea: Confirmar la sala')
    resultado.click()
    expect(alIrA).toHaveBeenCalledWith('cms-trabajo', { filtroTrabajo: 'todas' })
  })

  it('expone el flujo de proyecto, el embudo de formularios y el acceso protegido a personas por área', async () => {
    crearPantallaCMSReal(raiz, { sesion: { nombre: 'Ale' }, alIrA, area: 'familias' })
    await esperar()
    expect(raiz.textContent).toContain('Contexto protegido por permisos')
    expect(raiz.textContent).toContain('Embudo de formularios')
    ;[...raiz.querySelectorAll('button')].find((control) => control.textContent.includes('Abrir operación y personas')).click()
    expect(alIrA).toHaveBeenCalledWith('operacion', {})

    crearPantallaCMSReal(raiz, { sesion: { nombre: 'Ale' }, alIrA, area: 'biblioteca' })
    await esperar()
    expect(raiz.textContent).toContain('Flujo de proyectos')
    expect(raiz.textContent).toContain('1 de 2 hitos, 50%')
  })

  it('lleva el foco a la búsqueda global con el atajo de teclado', async () => {
    crearPantallaCMSReal(raiz, { sesion: { nombre: 'Ale' }, alIrA, area: 'control' })
    await esperar()
    raiz.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
    expect(document.activeElement).toBe(raiz.querySelector('.cms-busqueda-global input'))
  })

  it('mantiene las acciones fuera del contenido desplazable de un formulario largo', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA, area: 'formularios' })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((control) => control.textContent.includes('Nuevo formulario')).click()
    const panel = raiz.querySelector('[role="dialog"]')
    expect(panel.classList.contains('cms-captura-con-acciones-fijas')).toBe(true)
    expect(panel.querySelector(':scope > .cms-captura-contenido')).not.toBeNull()
    expect(panel.querySelector(':scope > .cms-captura-acciones')).not.toBeNull()
    expect(panel.querySelector('.cms-captura-contenido > .cms-captura-acciones')).toBeNull()
  })

  it('permite cerrar una actividad sin eliminar su historial', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar(); ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Editar actividad')).click()
    raiz.querySelector('select[aria-label="Estado de la actividad"]').value = 'realizado'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await esperar()
    const [, opciones] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/eventos/ev1')
    expect(opciones.method).toBe('PATCH')
    expect(JSON.parse(opciones.body)).toMatchObject({ estado: 'realizado', titulo: 'Taller de juego' })
  })

  it('edita el seguimiento completo de un proyecto', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Editar proyecto')).click()
    raiz.querySelector('select[aria-label="Estado del proyecto"]').value = 'en_pausa'
    raiz.querySelector('input[aria-label="Fecha de inicio"]').value = '2026-08-05'
    raiz.querySelector('input[aria-label="Fecha objetivo"]').value = '2026-11-01'
    raiz.querySelector('input[aria-label="Presupuesto del proyecto"]').value = '25000'
    raiz.querySelector('textarea[aria-label="Notas del proyecto"]').value = 'Esperar confirmación del local.'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    const [, opciones] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/proyectos/p1')
    expect(opciones.method).toBe('PATCH')
    expect(JSON.parse(opciones.body)).toMatchObject({ estado: 'en_pausa', fecha_inicio: '2026-08-05', fecha_fin: '2026-11-01', presupuesto: '25000', notas: 'Esperar confirmación del local.' })
  })

  it('registra y mitiga riesgos dentro del proyecto', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    expect(raiz.textContent).toContain('1 riesgo abierto')
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Gestionar riesgos')).click()
    expect(raiz.textContent).toContain('Riesgos: Fútbol sin Barreras')
    expect(raiz.textContent).toContain('Confirmación del local')
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Agregar riesgo')).click()
    raiz.querySelector('input[aria-label="Riesgo del proyecto"]').value = 'Demora de transporte'
    raiz.querySelector('select[aria-label="Nivel del riesgo"]').value = 'alto'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    const [, opcionesCrear] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/proyectos/p1/riesgos')
    expect(JSON.parse(opcionesCrear.body)).toMatchObject({ titulo: 'Demora de transporte', nivel: 'alto' })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Marcar mitigado')).click()
    await esperar()
    const [, opcionesMitigar] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/riesgos/rg1')
    expect(JSON.parse(opcionesMitigar.body)).toEqual({ estado: 'mitigado' })
  })

  it('abre Fútbol sin Barreras como programa del CMS', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Abrir Fútbol sin Barreras')).click()
    expect(alIrA).toHaveBeenCalledWith('operacion')
  })

  it('presenta el encabezado de Programas sin texto técnico', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    expect(raiz.textContent).toContain('Programas')
    expect(raiz.textContent).not.toContain('[object HTMLHeadingElement]')
  })

  it('agrega una persona a un equipo desde el tablero', async () => {
    alcanceGlobalCms = true
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Gestionar integrantes')).click()
    raiz.querySelector('select[aria-label="Persona para agregar a Familias"]').value = 'marce@aletea.org'
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent === 'Agregar persona').click()
    await esperar()
    const [, opciones] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/responsabilidades')
    expect(JSON.parse(opciones.body)).toMatchObject({ equipo_id: 'e1', usuario_correo: 'marce@aletea.org', tipo: 'integrante' })
  })

  it('cambia la función y permite quitar una persona desde su equipo', async () => {
    alcanceGlobalCms = true
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Gestionar integrantes')).click()
    const funcion = raiz.querySelector('select[aria-label="Función de Claudia en Familias"]')
    funcion.value = 'referente'
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent === 'Guardar función').click()
    await esperar()
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/cms/responsabilidades', expect.objectContaining({ method: 'POST' }))
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/cms/responsabilidades/re1', expect.objectContaining({ method: 'DELETE' }))

    globalThis.fetch.mockClear()
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Gestionar integrantes')).click()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent === 'Quitar del equipo').click()
    await esperar()
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/cms/responsabilidades/re1', expect.objectContaining({ method: 'DELETE' }))
  })

  it('oculta los controles de estructura cuando el perfil no puede usarlos', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    expect(raiz.textContent).toContain('Responsabilidades de unidades institucionales')
    expect([...raiz.querySelectorAll('button')].some((boton) => boton.textContent.includes('Gestionar integrantes'))).toBe(false)
    expect([...raiz.querySelectorAll('button')].some((boton) => boton.textContent.includes('Configurar equipo'))).toBe(false)
  })

  it('explica que un formulario con equipo asigna la tarea derivada', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Nuevo formulario')).click()
    expect(raiz.textContent).toContain('se asigna automáticamente a su coordinación o referente')
  })

  it('agenda una reunión y convierte una decisión en tarea', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Nueva reunión')).click()
    raiz.querySelector('input[aria-label="Título de la reunión"]').value = 'Reunión de familias'
    raiz.querySelector('[data-selector-cms="fecha-hora"]').value = '2026-08-24T18:30'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    expect(globalThis.fetch.mock.calls.some(([url]) => url === '/api/cms/reuniones')).toBe(true)
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Crear tarea')).click()
    await esperar()
    expect(globalThis.fetch.mock.calls.some(([url]) => url === '/api/cms/decisiones/d1/tarea')).toBe(true)
  })

  it('agenda una serie de reuniones y conserva una minuta independiente por fecha', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Nueva reunión')).click()
    raiz.querySelector('input[aria-label="Título de la reunión"]').value = 'Comisión Directiva'
    raiz.querySelector('[data-selector-cms="fecha-hora"]').value = '2026-08-31T18:30'
    const frecuencia = raiz.querySelector('select[aria-label="Repetición de la reunión"]')
    frecuencia.value = 'mensual'
    frecuencia.dispatchEvent(new Event('change', { bubbles: true }))
    const hasta = [...raiz.querySelectorAll('[data-selector-cms="fecha"]')].find((control) => control.closest('.selector-fecha')?.textContent.includes('Repetir reunión hasta'))
    hasta.value = '2026-12-31'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    const [, opciones] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/reuniones')
    expect(JSON.parse(opciones.body)).toMatchObject({ frecuencia_reunion: 'mensual', repetir_hasta: '2026-12-31' })
  })

  it('guarda la preparación, la minuta y el cierre de una reunión', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Editar reunión')).click()
    raiz.querySelector('textarea[aria-label="Minuta de la reunión"]').value = 'Se acordó confirmar la sala antes del viernes.'
    raiz.querySelector('textarea[aria-label="Resumen de la reunión"]').value = 'Acuerdo de sala'
    raiz.querySelector('select[aria-label="Estado de la reunión"]').value = 'realizada'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    const [, opciones] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/reuniones/r1')
    expect(opciones.method).toBe('PATCH')
    expect(JSON.parse(opciones.body)).toMatchObject({ estado: 'realizada', minuta: 'Se acordó confirmar la sala antes del viernes.', resumen: 'Acuerdo de sala' })
  })

  it('guarda comentarios y dependencias desde el contexto de una tarea', async () => {
    const respuestaBase = globalThis.fetch
    globalThis.fetch = vi.fn(async (url, opciones) => {
      if (url === '/api/cms/tareas/t1/contexto') return new Response(JSON.stringify({
        tarea: { id: 't1', titulo: 'Confirmar la sala' }, dependencias: [], dependientes: [], comentarios: [],
      }), { status: 200 })
      return respuestaBase(url, opciones)
    })
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Abrir tarea')).click()
    await esperar(); await esperar()
    raiz.querySelector('select[aria-label="Agregar dependencia"]').value = 'td1'
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent === 'Agregar dependencia').click()
    await esperar()
    const [, dependencia] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/tareas/t1/dependencias')
    expect(JSON.parse(dependencia.body)).toEqual({ depende_de_id: 'td1' })

    raiz.querySelector('textarea[aria-label="Nuevo comentario"]').value = 'La sala quedó reservada.'
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent === 'Agregar comentario').click()
    await esperar()
    const [, comentario] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/tareas/t1/comentarios')
    expect(JSON.parse(comentario.body)).toEqual({ contenido: 'La sala quedó reservada.' })
  })

  it('permite quitar una dependencia sin tocar otras tareas', async () => {
    const respuestaBase = globalThis.fetch
    globalThis.fetch = vi.fn(async (url, opciones) => {
      if (url === '/api/cms/tareas/t1/contexto') return new Response(JSON.stringify({
        tarea: { id: 't1', titulo: 'Confirmar la sala' },
        dependencias: [{ id: 'td1', titulo: 'Priorizar accesibilidad en actividades', estado: 'pendiente', responsable_nombre: 'Claudia' }],
        dependientes: [], comentarios: [],
      }), { status: 200 })
      return respuestaBase(url, opciones)
    })
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Abrir tarea')).click()
    await esperar(); await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent === 'Quitar dependencia').click()
    await esperar()
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/cms/tareas/t1/dependencias/td1', expect.objectContaining({ method: 'DELETE' }))
  })

  it('edita programas y alianzas conservando su equipo y estado', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent === 'Editar programa').click()
    raiz.querySelector('input[aria-label="Nombre del programa"]').value = 'Familias y comunidad ampliado'
    raiz.querySelector('select[aria-label="Estado del programa"]').value = 'en_pausa'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    const [, programa] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/programas/pr1')
    expect(JSON.parse(programa.body)).toMatchObject({ nombre: 'Familias y comunidad ampliado', estado: 'en_pausa', equipo_id: 'e1' })

    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent === 'Editar alianza').click()
    raiz.querySelector('input[aria-label="Canal institucional de contacto"]').value = 'https://red.example.org'
    raiz.querySelector('select[aria-label="Estado de la alianza"]').value = 'en_pausa'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    const [, alianza] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/alianzas/a1')
    expect(JSON.parse(alianza.body)).toMatchObject({ estado: 'en_pausa', contacto_institucional: 'https://red.example.org', equipo_id: 'e1' })
  })

  it('deriva una respuesta de formulario y cierra entradas y comunicados', async () => {
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent === 'Registrar respuesta').click()
    raiz.querySelector('input[aria-label="Nombre"]').value = 'Andrea Pérez'
    raiz.querySelector('input[aria-label="Contacto"]').value = 'andrea@example.org'
    raiz.querySelector('textarea[aria-label="Mensaje"]').value = 'Quiero colaborar en la jornada.'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    const [, respuesta] = globalThis.fetch.mock.calls.find(([url]) => url === '/api/cms/formularios/f1/respuestas')
    expect(JSON.parse(respuesta.body)).toMatchObject({ nombre: 'Andrea Pérez', contacto: 'andrea@example.org', detalle: 'Quiero colaborar en la jornada.' })

    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent === 'Cerrar entrada').click()
    await esperar()
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/cms/entradas/en1', expect.objectContaining({ method: 'PATCH' }))

    alcanceGlobalCms = true
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent === 'Cerrar comunicado').click()
    await esperar()
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/cms/comunicados/c1', expect.objectContaining({ method: 'PATCH' }))
  })

  it('exige el objetivo antes de derivar una propuesta institucional', async () => {
    const respuestaBase = globalThis.fetch
    globalThis.fetch = vi.fn(async (url, opciones) => {
      if (url === '/api/cms/tablero') {
        const respuesta = await respuestaBase(url, opciones)
        const tablero = await respuesta.json()
        tablero.formularios = [{ id: 'fp1', titulo: 'Propuestas institucionales', tipo: 'propuesta', visibilidad: 'interna', estado: 'activa', respuestas_total: 0 }]
        return new Response(JSON.stringify(tablero), { status: 200 })
      }
      return respuestaBase(url, opciones)
    })
    crearPantallaCMS(raiz, { sesion: { nombre: 'Ale' }, alIrA })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent === 'Registrar respuesta').click()
    raiz.querySelector('input[aria-label="Nombre"]').value = 'Andrea Pérez'
    raiz.querySelector('input[aria-label="Contacto"]').value = 'andrea@example.org'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    expect(globalThis.fetch.mock.calls.some(([url]) => url === '/api/cms/formularios/fp1/respuestas')).toBe(false)
  })

  it('lleva los accesos rápidos a Mi trabajo, decisiones y los equipos correspondientes', async () => {
    crearPantallaCMSReal(raiz, { sesion: { nombre: 'Ale' }, alIrA, area: 'control' })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Abrir Mi trabajo')).click()
    expect(alIrA).toHaveBeenCalledWith('cms-trabajo')
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Abrir decisiones y reuniones')).click()
    expect(alIrA).toHaveBeenCalledWith('cms-agenda')
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.startsWith('Familias')).click()
    expect(alIrA).toHaveBeenCalledWith('cms-familias')
  })
})
