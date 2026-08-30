import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ayudaParaAccion, DEMORA_AYUDA_MOUSE_MS, DEMORA_AYUDA_TECLADO_MS,
  instalarAyudasContextuales, prepararAyudaContextual, prepararAyudasContextuales,
} from '../../js/ui/ayudas-contextuales.js'

describe('ayudas contextuales', () => {
  afterEach(() => { vi.useRealTimers(); document.body.innerHTML = '' })

  it('explica acciones comunes con texto útil', () => {
    expect(ayudaParaAccion('Guardar cambios')).toBe('Guardar cambios y conserva el resultado.')
    expect(ayudaParaAccion('Descargar PNG')).toBe('Descargar PNG en tu dispositivo.')
    expect(ayudaParaAccion('Centro de control')).toBe('Abre la sección Centro de control.')
    expect(ayudaParaAccion('Entrar')).toBe('Valida tus datos y abre el gestor.')
    expect(ayudaParaAccion('Crear')).toBe('Crear en esta sección.')
  })

  it('reserva la ayuda automática para controles sin texto visible', () => {
    document.body.innerHTML = '<button>Guardar cambios</button><a class="boton" href="/cambios">Ver cambios</a><button aria-label="Abrir opciones"><svg></svg></button>'
    prepararAyudasContextuales(document)
    expect(document.querySelector('button').dataset.ayuda).toBeUndefined()
    expect(document.querySelector('a').dataset.ayuda).toBeUndefined()
    const icono = document.querySelector('button[aria-label]')
    expect(icono.dataset.ayuda).toBe('Abrir opciones.')
    expect(icono.getAttribute('aria-description')).toBe('Abrir opciones.')
  })

  it('respeta una explicación específica del contexto', () => {
    const control = document.createElement('button')
    control.textContent = 'Resolver'
    prepararAyudaContextual(control, 'Abre Accesos en la persona correcta.')
    expect(control.dataset.ayuda).toBe('Abre Accesos en la persona correcta.')
  })

  it('incorpora ayuda explícita a controles futuros y espera antes de mostrarla con teclado', async () => {
    vi.useFakeTimers()
    const desinstalar = instalarAyudasContextuales(document)
    const control = document.createElement('button')
    control.textContent = 'Publicar en prueba'
    control.dataset.ayuda = 'Publica el borrador actual en el sitio de prueba.'
    document.body.appendChild(control)
    await Promise.resolve()
    expect(control.dataset.ayuda).toBe('Publica el borrador actual en el sitio de prueba.')

    control.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    const globo = document.querySelector('[role="tooltip"]')
    expect(globo.hidden).toBe(true)
    vi.advanceTimersByTime(DEMORA_AYUDA_TECLADO_MS - 1)
    expect(globo.hidden).toBe(true)
    vi.advanceTimersByTime(1)
    expect(globo.hidden).toBe(false)
    expect(globo.textContent).toBe('Publica el borrador actual en el sitio de prueba.')
    desinstalar()
  })

  it('cancela una ayuda si el puntero sale antes de 650 ms', () => {
    vi.useFakeTimers()
    const control = document.createElement('button')
    control.setAttribute('aria-label', 'Editar')
    document.body.appendChild(control)
    const desinstalar = instalarAyudasContextuales(document)
    control.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    vi.advanceTimersByTime(DEMORA_AYUDA_MOUSE_MS - 1)
    expect(document.querySelector('[role="tooltip"]').hidden).toBe(true)
    control.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
    vi.advanceTimersByTime(1)
    expect(document.querySelector('[role="tooltip"]').hidden).toBe(true)
    desinstalar()
  })
})
