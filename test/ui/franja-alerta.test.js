import { describe, it, expect, beforeEach, vi } from 'vitest'
import { crearFranjaAlerta } from '../../js/ui/franja-alerta.js'

const ALERTAS = [
  { persona: { id: 'p1', nombre: 'Gaia' }, faltas: 3 },
  { persona: { id: 'v1', nombre: 'Abi' }, faltas: 4 },
]

let raiz, alSilenciar, alVerElMes

beforeEach(() => {
  document.body.innerHTML = '<div id="raiz"></div>'
  raiz = document.getElementById('raiz')
  alSilenciar = vi.fn(async () => {})
  alVerElMes = vi.fn()
  vi.spyOn(window, 'prompt').mockReturnValue('Hablé con la mamá')
})

const dibujar = (alertas = ALERTAS) => {
  const franja = crearFranjaAlerta({ alertas, alSilenciar, alVerElMes })
  if (franja) raiz.appendChild(franja)
  return franja
}

describe('franja de alerta', () => {
  it('sin alertas no dibuja nada', () => {
    expect(crearFranjaAlerta({ alertas: [], alSilenciar, alVerElMes })).toBeNull()
  })

  it('nombra a cada persona y cuantas falto', () => {
    dibujar()
    expect(raiz.textContent).toContain('Gaia')
    expect(raiz.textContent).toContain('3 sábados seguidos')
    expect(raiz.textContent).toContain('4 sábados seguidos')
  })

  it('anotar el seguimiento avisa con la nota escrita', async () => {
    dibujar()
    raiz.querySelector('[data-accion="silenciar-p1"]').click()
    await new Promise((r) => setTimeout(r, 0))
    expect(alSilenciar).toHaveBeenCalledWith(ALERTAS[0].persona, 'Hablé con la mamá')
  })

  it('cancelar el cuadro de texto no silencia nada', async () => {
    window.prompt.mockReturnValue(null)
    dibujar()
    raiz.querySelector('[data-accion="silenciar-p1"]').click()
    await new Promise((r) => setTimeout(r, 0))
    expect(alSilenciar).not.toHaveBeenCalled()
  })

  it('una nota vacia tampoco silencia', async () => {
    // Silenciar sin decir por que deja a la siguiente coordinadora sin saber si
    // alguien se ocupo del tema.
    window.prompt.mockReturnValue('   ')
    dibujar()
    raiz.querySelector('[data-accion="silenciar-p1"]').click()
    await new Promise((r) => setTimeout(r, 0))
    expect(alSilenciar).not.toHaveBeenCalled()
  })

  it('ofrece ver el mes', () => {
    dibujar()
    raiz.querySelector('[data-accion="ver-el-mes"]').click()
    expect(alVerElMes).toHaveBeenCalled()
  })

  it('con una sola alerta el titulo va en singular', () => {
    dibujar([ALERTAS[0]])
    expect(raiz.textContent).toContain('Alguien viene faltando')
  })
})

describe('rachas que pueden venir de mas atras', () => {
  it('dice "al menos" cuando la racha ocupa todo lo que se miro', () => {
    // La aplicacion lee los ultimos sabados, no el año. Si la racha llega al
    // borde de esa ventana, el numero exacto no se sabe, y decirlo como si se
    // supiera es afirmar de mas sobre un chico.
    raiz.appendChild(crearFranjaAlerta({
      alertas: [{ persona: { id: 'p1', nombre: 'Gaia' }, faltas: 4, almenos: true }],
      alSilenciar,
      alVerElMes,
    }))
    expect(raiz.textContent).toContain('faltó al menos 4 sábados seguidos')
  })

  it('sin el aviso lo dice exacto', () => {
    raiz.appendChild(crearFranjaAlerta({
      alertas: [{ persona: { id: 'p1', nombre: 'Gaia' }, faltas: 3, almenos: false }],
      alSilenciar,
      alVerElMes,
    }))
    expect(raiz.textContent).toContain('faltó 3 sábados seguidos')
    expect(raiz.textContent).not.toContain('al menos')
  })
})
