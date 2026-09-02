import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { crearPantallaRegistroInstitucional } from '../../js/ui/pantalla-registro-institucional.js'

const esperar = () => new Promise((resolver) => setTimeout(resolver, 0))

describe('registro institucional Cloudflare', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="raiz"></div>'
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ actividad: [
      { actor_nombre: 'Administración', accion: 'dar acceso', recurso: 'nueva@aletea.org', detalle: 'coordinacion', cuando: '2026-08-18 01:00:00' },
      { actor_nombre: 'Coordinación', accion: 'crear tarea CMS', recurso: 'tareas/t1', detalle: 'Preparar jornada', cuando: '2026-08-17 18:00:00' },
    ] })))
  })

  afterEach(() => vi.restoreAllMocks())

  it('separa los cambios de accesos y permite filtrarlos', async () => {
    const raiz = document.getElementById('raiz')
    crearPantallaRegistroInstitucional(raiz)
    await esperar(); await esperar()
    expect(raiz.textContent).toContain('Registro institucional')
    expect(raiz.textContent).toContain('crear tarea CMS')
    const filtro = raiz.querySelector('select')
    filtro.value = 'accesos'; filtro.dispatchEvent(new Event('change'))
    expect(raiz.textContent).toContain('dar acceso')
    expect(raiz.textContent).not.toContain('crear tarea CMS')
  })

  it('pagina historiales extensos y anuncia el rango visible', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ actividad: Array.from({ length: 45 }, (_, indice) => ({
      actor_nombre: 'Administración', accion: `cambio ${indice + 1}`, recurso: `r/${indice + 1}`, detalle: 'Detalle', cuando: '2026-08-18 01:00:00',
    })) })))
    const raiz = document.getElementById('raiz')
    crearPantallaRegistroInstitucional(raiz)
    await esperar(); await esperar()
    expect(raiz.querySelectorAll('.registro-institucional-evento')).toHaveLength(20)
    expect(raiz.querySelector('[role="status"]').textContent).toContain('1 a 20 de 45')
    expect(raiz.textContent).toContain('Página 1 de 3')
    ;[...raiz.querySelectorAll('button')].find((control) => control.textContent === 'Siguiente').click()
    expect(raiz.textContent).toContain('Página 2 de 3')
    expect(raiz.querySelector('[role="status"]').textContent).toContain('21 a 40 de 45')
  })
})
