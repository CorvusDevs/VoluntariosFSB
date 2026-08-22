import { beforeEach, describe, expect, it, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { crearPantallaAyuda, filtrarPreguntas, PREGUNTAS_AYUDA } from '../../js/ui/pantalla-ayuda.js'

beforeEach(() => {
  const dom = new JSDOM('<div id="raiz"></div>')
  globalThis.document = dom.window.document
})

describe('ayuda del gestor institucional', () => {
  it('conserva trazabilidad explícita a las dos transcripciones', () => {
    const fuentes = new Set(PREGUNTAS_AYUDA.map((item) => item.fuente))
    expect(fuentes).toContain('Audio 1')
    expect(fuentes).toContain('Audio 2')
  })
  it('encuentra respuestas sin depender de tildes', () => {
    expect(filtrarPreguntas('notificacion').map((item) => item.pregunta)).toContain('¿Dónde veo las notificaciones de tareas?')
    expect(filtrarPreguntas('Canva')).toHaveLength(2)
    expect(filtrarPreguntas('Pegar enlace').map((item) => item.pregunta)).toContain('¿Cómo agrego un enlace de Google Drive o Canva a la Biblioteca?')
    expect(filtrarPreguntas('recurrente').map((item) => item.pregunta)).toContain('¿Cómo agendo una actividad recurrente?')
    expect(filtrarPreguntas('reunión recurrente').map((item) => item.pregunta)).toContain('¿Cómo agendo una reunión recurrente?')
    expect(filtrarPreguntas('tarea recurrente').map((item) => item.pregunta)).toContain('¿Cuándo uso una tarea recurrente en lugar de una actividad recurrente?')
    expect(filtrarPreguntas('esfuerzo estimado').map((item) => item.pregunta)).toContain('¿Qué significa esfuerzo estimado?')
    expect(filtrarPreguntas('programa').map((item) => item.pregunta)).toContain('¿Qué es el programa de un proyecto?')
    expect(filtrarPreguntas('persona archivada').map((item) => item.pregunta)).toContain('¿Qué pasa con una persona archivada en el reporte mensual?')
  })

  it('muestra respuestas y navega a la pantalla indicada', () => {
    const alIrA = vi.fn()
    const raiz = document.getElementById('raiz')
    crearPantallaAyuda(raiz, { alIrA, admin: true })
    expect(raiz.querySelectorAll('.ayuda-pregunta').length).toBeGreaterThan(15)
    const control = [...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('Abrir Familias'))
    control.click()
    expect(alIrA).toHaveBeenCalledWith('cms-familias')
  })

  it('organiza las respuestas en secciones y permite filtrar una categoria', () => {
    const raiz = document.getElementById('raiz')
    crearPantallaAyuda(raiz, { admin: true })
    expect([...raiz.querySelectorAll('.ayuda-seccion-titulo')].map((titulo) => titulo.textContent)).toContain('Equipos')
    const filtro = [...raiz.querySelectorAll('.ayuda-categoria-filtro')].find((control) => control.textContent.includes('Notificaciones'))
    filtro.click()
    expect(raiz.querySelectorAll('.ayuda-pregunta')).toHaveLength(6)
    expect(raiz.textContent).toContain('¿El teléfono avisa automáticamente')
    expect(raiz.textContent).toContain('¿Cómo reemplazamos los avisos cotidianos de WhatsApp?')
  })

  it('oculta las instrucciones administrativas a cuentas sin ese perfil', () => {
    const raiz = document.getElementById('raiz')
    crearPantallaAyuda(raiz)
    expect(raiz.textContent).not.toContain('Abrir Accesos')
    expect(raiz.textContent).toContain('¿El teléfono avisa automáticamente')
  })

  it('abre una búsqueda compartida y permite copiar su enlace', async () => {
    const alCopiarEnlace = vi.fn(async () => {})
    const raiz = document.getElementById('raiz')
    crearPantallaAyuda(raiz, { busquedaInicial: 'Canva', alCopiarEnlace })
    expect(raiz.querySelector('[aria-label="Buscar en la ayuda"]').value).toBe('Canva')
    expect(raiz.querySelectorAll('.ayuda-pregunta')).toHaveLength(2)
    ;[...raiz.querySelectorAll('button')].find((control) => control.textContent === 'Copiar enlace').click()
    await Promise.resolve()
    expect(alCopiarEnlace).toHaveBeenCalledWith('Canva')
    expect(raiz.textContent).toContain('Enlace a esta búsqueda copiado')
  })
})
