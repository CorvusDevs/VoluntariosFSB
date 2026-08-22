import { beforeEach, describe, expect, it, vi } from 'vitest'
import { crearPantallaIngresoCloudflare } from '../../js/ui/pantalla-ingreso-cloudflare.js'

let raiz

beforeEach(() => {
  document.body.innerHTML = '<div id="raiz"></div>'
  raiz = document.getElementById('raiz')
})

describe('ingreso institucional de Cloudflare', () => {
  it('identifica Aletea institucional y envía el usuario y la contraseña', async () => {
    const alEntrar = vi.fn(async () => {})
    crearPantallaIngresoCloudflare(raiz, { alEntrar })

    expect(raiz.querySelector('h1').textContent).toBe('Aletea institucional')
    expect(raiz.querySelector('.ingreso-marca img').getAttribute('src')).toBe('assets/logo-aletea-violeta.png')
    expect(raiz.textContent).toContain('usuario de acceso')
    expect(raiz.textContent).not.toContain('correo')
    expect(raiz.textContent).not.toContain('Token de GitHub')
    expect(raiz.textContent).toContain('Cambios del sistema')
    expect(raiz.textContent).toContain('Sistema de Gestión Institucional desarrollado por CorvusDevs')

    raiz.querySelector('[data-campo="usuario"]').value = 'soyelale@icloud.com'
    raiz.querySelector('[data-campo="contrasena"]').value = 'prueba-segura'
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    expect(alEntrar).toHaveBeenCalledWith({ usuario: 'soyelale@icloud.com', contrasena: 'prueba-segura' })
  })
})
