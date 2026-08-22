import { describe, expect, it, vi } from 'vitest'
import { crearPantallaInicio } from '../../js/ui/pantalla-inicio.js'

const ROSTER = {
  participantes: [{ id: 'p1', nombre: 'Gaia', grupo: 2, activo: true }],
  voluntarios: [{ id: 'v1', nombre: 'Marce', activo: true }],
}

function abrir() {
  document.body.innerHTML = '<div id="raiz"></div>'
  const raiz = document.getElementById('raiz')
  const alIrA = vi.fn()
  crearPantallaInicio(raiz, { roster: ROSTER, alertas: [], tendencia: null, alIrA })
  return { raiz, alIrA }
}

describe('pantalla de inicio', () => {
  it('explica los colores operativos y resume la semana', () => {
    const { raiz } = abrir()
    expect(raiz.textContent).toContain('Guía rápida')
    expect(raiz.textContent).toContain('Resumen de la semana')
    expect(raiz.textContent).toContain('Listo para guardar')
  })

  it('encuentra destinos además de personas', () => {
    const { raiz, alIrA } = abrir()
    const buscar = raiz.querySelector('input[type="search"]')
    buscar.value = 'reporte'
    buscar.dispatchEvent(new Event('input'))
    expect(raiz.textContent).toContain('Ver asistencia mensual')
    raiz.querySelector('.inicio-resultado-destino').click()
    expect(alIrA).toHaveBeenCalledWith('reporte')
  })

  it('da una acción exacta cuando no hay coincidencias', () => {
    const { raiz } = abrir()
    const buscar = raiz.querySelector('input[type="search"]')
    buscar.value = 'inexistente'
    buscar.dispatchEvent(new Event('input'))
    expect(raiz.textContent).toContain('Ver Personas')
  })

  it('muestra Fútbol sin Barreras como módulo del CMS sin texto técnico', () => {
    document.body.innerHTML = '<div id="raiz"></div>'
    const raiz = document.getElementById('raiz')
    crearPantallaInicio(raiz, {
      roster: ROSTER,
      alertas: [],
      tendencia: null,
      alIrA: vi.fn(),
      esModuloCMS: true,
      alVolverCMS: vi.fn(),
    })
    expect(raiz.textContent).toContain('Centro operativo del programa dentro de Aletea.')
    expect(raiz.textContent).not.toContain('[object HTMLHeadingElement]')
  })
})
