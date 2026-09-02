// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const esperar = () => new Promise((resolver) => setTimeout(resolver, 0))

describe('formulario público institucional', () => {
  beforeEach(() => {
    vi.resetModules()
    document.body.innerHTML = '<main id="formulario-publico"></main>'
    history.replaceState({}, '', '/formulario.html?id=propuesta-familias')
  })

  it('explica y conserva todos los datos de una propuesta al enviarla', async () => {
    const solicitudes = []
    vi.stubGlobal('fetch', vi.fn(async (url, opciones = {}) => {
      solicitudes.push({ url, opciones })
      if (!opciones.method) return new Response(JSON.stringify({ formulario: { id: 'propuesta-familias', titulo: 'Propuesta para Familias', descripcion: 'Contanos la idea.', tipo: 'propuesta', finalidad: 'Evaluar la propuesta y responderla.', responsable_datos: 'Equipo de Familias', conservacion_meses: 12, requiere_consentimiento: 1, campos_json: JSON.stringify([{ clave: 'modalidad', etiqueta: 'Modalidad preferida', tipo: 'seleccion', requerido: true, opciones: ['Presencial', 'Virtual'] }, { clave: 'barrio', etiqueta: 'Barrio', tipo: 'texto', requerido: true, ayuda: 'Solo si elegís presencial.', opciones: [], mostrar_si: { campo: 'modalidad', valor: 'Presencial' } }]) } }), { status: 200 })
      return new Response(JSON.stringify({ recibida: true }), { status: 201 })
    }))

    await import('../../js/formulario-publico.js')
    await esperar()

    const controles = Object.fromEntries([...document.querySelectorAll('.formulario-publico-campo')].map((campo) => [campo.firstChild.textContent.trim(), campo.querySelector('input, textarea')]))
    expect(controles['Nombre o referencia'].maxLength).toBe(180)
    expect(controles['Contacto para responderte'].autocomplete).toBe('off')
    expect(controles['Mensaje o contexto'].maxLength).toBe(4000)
    controles['Nombre o referencia'].value = 'Taller accesible'
    controles['Contacto para responderte'].value = 'familias@ejemplo.uy'
    controles['Mensaje o contexto'].value = 'Actividad abierta a la comunidad.'
    controles['Objetivo de la propuesta'].value = 'Acercar recursos'
    controles['Pasos o actividades principales'].value = 'Convocar y realizar'
    controles['Recursos necesarios'].value = 'Sala y materiales'
    controles['Personas o roles necesarios'].value = 'Dos facilitadores'
    const modalidad = document.querySelector('[aria-label="Modalidad preferida"]')
    modalidad.value = 'Virtual'
    modalidad.dispatchEvent(new Event('change', { bubbles: true }))
    expect(document.querySelector('[aria-label="Barrio"]').closest('label').hidden).toBe(true)
    expect(document.querySelector('.formulario-publico-privacidad').textContent).toContain('Equipo de Familias')
    document.querySelector('.formulario-publico-consentimiento input').checked = true
    document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()

    const cuerpo = JSON.parse(solicitudes.at(-1).opciones.body)
    expect(cuerpo).toMatchObject({
      nombre: 'Taller accesible', contacto: 'familias@ejemplo.uy', objetivo: 'Acercar recursos',
      pasos: 'Convocar y realizar', recursos: 'Sala y materiales', personas_necesarias: 'Dos facilitadores',
      respuestas: { modalidad: 'Virtual', barrio: '' },
      consentimiento_privacidad: true,
      consentimiento_comunicaciones: false,
    })
    expect(document.querySelector('.formulario-publico-estado').textContent).toContain('Recibimos')
  })

  it('mantiene la suscripción separada, opcional y pendiente de confirmación', async () => {
    let cuerpo
    vi.stubGlobal('fetch', vi.fn(async (_url, opciones = {}) => {
      if (!opciones.method) return new Response(JSON.stringify({ formulario: { id: 'propuesta-familias', titulo: 'Consulta', tipo: 'pedido', requiere_consentimiento: 0, campos_json: '[]' } }))
      cuerpo = JSON.parse(opciones.body)
      return new Response(JSON.stringify({ recibida: true, suscripcion: 'pendiente' }), { status: 201 })
    }))
    await import('../../js/formulario-publico.js')
    await esperar()
    const forma = document.querySelector('form')
    const campos = forma.querySelectorAll('.formulario-publico-campo input')
    campos[0].value = 'Persona de prueba'
    campos[1].value = 'contacto@ejemplo.uy'
    const seccion = forma.querySelector('.formulario-publico-comunicaciones')
    const aceptar = seccion.querySelector('.formulario-publico-consentimiento input')
    expect(aceptar.checked).toBe(false)
    expect(seccion.querySelector('.formulario-publico-comunicaciones-opciones').hidden).toBe(true)
    aceptar.checked = true
    aceptar.dispatchEvent(new Event('change', { bubbles: true }))
    const correo = seccion.querySelector('input[type="email"]')
    correo.value = 'persona@ejemplo.uy'
    forma.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    expect(cuerpo).toMatchObject({ consentimiento_comunicaciones: true, correo_comunicaciones: 'persona@ejemplo.uy', temas_comunicaciones: ['novedades'] })
    expect(forma.querySelector('.formulario-publico-estado').textContent).toContain('confirmar')
  })

  it('permite elegir varias opciones y usa controles específicos para correo y número', async () => {
    let cuerpo
    vi.stubGlobal('fetch', vi.fn(async (_url, opciones = {}) => {
      if (!opciones.method) return new Response(JSON.stringify({ formulario: { id: 'propuesta-familias', titulo: 'Ingreso', tipo: 'inscripcion', requiere_consentimiento: 0, campos_json: JSON.stringify([
        { clave: 'correo_alterno', etiqueta: 'Correo alterno', tipo: 'correo', requerido: true, confirmar_correo: true },
        { clave: 'cantidad', etiqueta: 'Cantidad', tipo: 'numero', requerido: true },
        { clave: 'intereses', etiqueta: 'Intereses', tipo: 'seleccion_multiple', requerido: true, opciones: ['Familias', 'Formación', 'Actividades'] },
      ]) } }))
      cuerpo = JSON.parse(opciones.body)
      return new Response(JSON.stringify({ recibida: true }), { status: 201 })
    }))
    await import('../../js/formulario-publico.js')
    await esperar()
    const forma = document.querySelector('form')
    forma.querySelector('input[autocomplete="name"]').value = 'Ana'
    forma.querySelectorAll('.formulario-publico-campo input')[1].value = '099'
    const correoAlterno = forma.querySelector('[aria-label="Correo alterno"]'); correoAlterno.value = 'ana@example.org'; correoAlterno.dispatchEvent(new Event('input', { bubbles: true }))
    const confirmarCorreo = forma.querySelector('.formulario-publico-confirmacion-correo input'); confirmarCorreo.value = 'otra@example.org'; confirmarCorreo.dispatchEvent(new Event('input', { bubbles: true }))
    const cantidad = forma.querySelector('[aria-label="Cantidad"]'); cantidad.value = '2'; cantidad.dispatchEvent(new Event('input', { bubbles: true }))
    const opciones = [...forma.querySelectorAll('.formulario-publico-opciones-multiples input')]
    opciones[0].checked = true; opciones[0].dispatchEvent(new Event('change', { bubbles: true }))
    opciones[2].checked = true; opciones[2].dispatchEvent(new Event('change', { bubbles: true }))
    forma.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    expect(cuerpo).toBeUndefined()
    confirmarCorreo.value = 'ANA@example.org'; confirmarCorreo.dispatchEvent(new Event('input', { bubbles: true }))
    forma.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    expect(cuerpo.respuestas).toMatchObject({ correo_alterno: 'ana@example.org', cantidad: '2', intereses: ['Familias', 'Actividades'] })
    expect(cuerpo.confirmaciones_correo).toEqual({ correo_alterno: 'ANA@example.org' })
  })

  it('muestra contenido general editable sin copiar el acuerdo de WhatsApp', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url, opciones = {}) => {
      if (!opciones.method) return new Response(JSON.stringify({ formulario: {
        id: 'propuesta-familias', titulo: 'Actividad barrial', tipo: 'inscripcion', requiere_consentimiento: 1, campos_json: '[]',
        configuracion_publica_json: JSON.stringify({
          privacidad_detallada: true,
          privacidad_contenido: { titulo: 'Cuidado de tus datos', uso: 'Usaremos estos datos para reservar tu lugar.', aceptacion: 'Acepto este uso para mi inscripción.' },
          requiere_compromiso: true,
          compromiso_contenido: { titulo: 'Acuerdo de la actividad', introduccion: 'Cuidemos el encuentro.', secciones: [{ titulo: 'Convivencia', puntos: ['Respetar los turnos.'] }], aceptacion: 'Acepto estas pautas.' },
        }),
      } }))
      return new Response(JSON.stringify({ recibida: true }), { status: 201 })
    }))
    await import('../../js/formulario-publico.js')
    await esperar()
    expect(document.querySelector('.formulario-publico-privacidad').textContent).toContain('reservar tu lugar')
    expect(document.querySelector('.formulario-publico-compromiso').textContent).toContain('Respetar los turnos')
    expect(document.querySelector('.formulario-publico-compromiso').textContent).not.toContain('capturas de pantalla')
  })

  it('presenta el ingreso a WhatsApp como un recorrido de confianza y exige ambos acuerdos', async () => {
    const solicitudes = []
    vi.stubGlobal('fetch', vi.fn(async (_url, opciones = {}) => {
      solicitudes.push(opciones)
      if (!opciones.method) return new Response(JSON.stringify({ formulario: {
        id: 'ingreso-whatsapp-familias', titulo: 'Ingreso a los grupos de WhatsApp de Aletea',
        descripcion: 'Completá tus datos y aceptá las pautas para solicitar el ingreso.', tipo: 'inscripcion',
        finalidad: 'Gestionar el ingreso y la participación en los grupos de WhatsApp de familias de Aletea.',
        responsable_datos: 'Aletea Asociación Civil', conservacion_meses: 12, requiere_consentimiento: 1,
        configuracion_publica_json: JSON.stringify({ modelo: 'whatsapp_familias' }), campos_json: '[]',
      } }), { status: 200 })
      return new Response(JSON.stringify({ recibida: true, referencia: 'ALE-260901-0001' }), { status: 201 })
    }))

    await import('../../js/formulario-publico.js')
    await esperar()

    const forma = document.querySelector('form')
    expect(document.querySelector('.formulario-publico-marca img').alt).toBe('Aletea')
    expect(document.querySelector('.formulario-publico-contacto-institucional').textContent).toBe('info@aletea.org')
    expect(forma.querySelectorAll('.formulario-publico-paso')).toHaveLength(4)
    expect(forma.textContent).toContain('Privacidad y uso de datos personales')
    expect(forma.textContent).toContain('Compromiso de confidencialidad y convivencia')
    expect(forma.querySelectorAll('.formulario-publico-compromiso-lista article')).toHaveLength(4)
    expect(forma.textContent).not.toContain('Mensaje o contexto')

    const correo = forma.querySelector('input[aria-label="Correo electrónico"]') || [...forma.querySelectorAll('.formulario-publico-campo')].find((campo) => campo.textContent.includes('Correo electrónico'))?.querySelector('input')
    const confirmacion = [...forma.querySelectorAll('.formulario-publico-campo')].find((campo) => campo.textContent.includes('Confirmá tu correo electrónico')).querySelector('input')
    forma.querySelector('input[autocomplete="name"]').value = 'Ana'
    correo.value = 'ana@example.org'
    confirmacion.value = 'otra@example.org'
    confirmacion.dispatchEvent(new Event('input', { bubbles: true }))
    forma.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    expect(solicitudes).toHaveLength(1)

    confirmacion.value = 'ANA@example.org'
    confirmacion.dispatchEvent(new Event('input', { bubbles: true }))
    forma.querySelector('.formulario-publico-privacidad .formulario-publico-consentimiento input').checked = true
    forma.querySelector('.formulario-publico-compromiso-aceptacion input').checked = true
    forma.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    const cuerpo = JSON.parse(solicitudes.at(-1).body)
    expect(cuerpo).toMatchObject({
      nombre: 'Ana', contacto: 'ana@example.org', contacto_confirmacion: 'ANA@example.org', detalle: '',
      consentimiento_privacidad: true, compromiso_confidencialidad: true, consentimiento_comunicaciones: false,
    })
    expect(forma.querySelector('.formulario-publico-estado').textContent).toContain('equipo de Familias')
  })
})
