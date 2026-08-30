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
    })
    expect(document.querySelector('.formulario-publico-estado').textContent).toContain('Recibimos')
  })
})
