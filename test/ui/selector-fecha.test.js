import { afterEach, describe, expect, it } from 'vitest'
import { crearSelectorFecha } from '../../js/ui/selector-fecha.js'

afterEach(() => { document.body.replaceChildren() })

describe('selector de fecha', () => {
  it('abre un calendario propio, permite elegir una fecha y respeta los límites', () => {
    const selector = crearSelectorFecha({
      clave: 'prueba-fecha',
      rotulo: 'Fecha de prueba',
      min: '2026-08-10',
      max: '2026-08-20',
    })
    document.body.appendChild(selector.campo)

    selector.disparador.click()
    const panel = document.querySelector('.selector-fecha-panel')
    expect(panel.hidden).toBe(false)
    expect(panel.parentElement).toBe(document.body)
    expect(panel.querySelector('.selector-fecha-anio').value).toBe('2026')
    expect([...panel.querySelectorAll('.selector-fecha-dia')].find((control) => control.textContent === '9').disabled).toBe(true)

    ;[...panel.querySelectorAll('.selector-fecha-dia')].find((control) => control.textContent === '15').click()
    expect(selector.entrada.value).toBe('2026-08-15')
    expect(panel.hidden).toBe(true)
    expect(panel.parentElement).toBe(selector.campo)
    expect(selector.disparador.textContent).toContain('15 de agosto de 2026')
  })
})
