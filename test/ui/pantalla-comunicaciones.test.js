// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { crearPantallaComunicaciones } from '../../js/ui/pantalla-comunicaciones.js'

const esperar = () => new Promise((resolver) => setTimeout(resolver, 0))

describe('pantalla de comunicaciones', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="raiz"></div>'
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      contactos: [{ id: 'c1', nombre: 'Persona', correo: 'persona@ejemplo.uy', estado: 'activo', temas: ['familias'], consentimiento_fuente: 'formulario:familias' }],
      campanas: [{ id: 'm1', titulo: 'Agenda', asunto: 'Próximas actividades', contenido_texto: 'Mensaje de prueba', temas_json: '["actividades"]', estado: 'revision', creado_por: 'direccion@aletea.org' }],
      cola: [{ estado: 'pendiente', cantidad: 1 }], eventos: [], transporte: { smtp_configurado: false, lista_para_enviar: false, controles_pendientes: [] },
    }), { status: 200 })))
  })

  it('explica la privacidad, muestra estados y funciona sin desplazamiento horizontal propio', async () => {
    crearPantallaComunicaciones(document.getElementById('raiz'))
    await esperar()
    expect(document.querySelector('.cms-comunicaciones-privacidad').textContent).toContain('Solo se envía')
    expect(document.querySelector('.cms-comunicaciones-contacto').textContent).toContain('persona@ejemplo.uy')
    expect(document.querySelector('.cms-comunicaciones-transporte').textContent).toContain('todavía no configurado')
    const campanas = [...document.querySelectorAll('.cms-comunicaciones-pestanas button')].find((control) => control.textContent.includes('Campañas'))
    campanas.click()
    expect(document.querySelector('.cms-comunicaciones-tarjeta').textContent).toContain('En revisión')
    expect(document.querySelector('.cms-comunicaciones-contenido')).not.toBeNull()
  })

  it('usa formularios visibles para bajas en lugar de prompts del navegador', async () => {
    const prompt = vi.spyOn(window, 'prompt')
    crearPantallaComunicaciones(document.getElementById('raiz'))
    await esperar()
    const baja = [...document.querySelectorAll('summary')].find((control) => control.textContent.includes('Registrar baja'))
    expect(baja).toBeTruthy()
    baja.click()
    expect(document.querySelector('.cms-comunicaciones-accion-formulario textarea')).not.toBeNull()
    expect(prompt).not.toHaveBeenCalled()
    prompt.mockRestore()
  })
})
