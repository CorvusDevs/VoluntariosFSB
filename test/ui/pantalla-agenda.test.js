import { beforeEach, describe, expect, it, vi } from 'vitest'
import { crearPantallaAgenda } from '../../js/ui/pantalla-agenda.js'

const ROSTER = {
  version: 1,
  participantes: [{ id: 'p1', nombre: 'Gaia', activo: true, perfil: { anioNacimiento: '2018-08-20' } }],
  voluntarios: [],
  agenda: { version: 1, eventos: [] },
}

let raiz, almacen, alCambiar
const esperar = () => new Promise((resolver) => setTimeout(resolver, 0))

beforeEach(() => {
  document.body.innerHTML = '<div id="raiz"></div>'
  raiz = document.getElementById('raiz')
  almacen = { guardarRoster: vi.fn(async () => {}) }
  alCambiar = vi.fn(async () => {})
})

describe('Agenda', () => {
  it('usa íconos SVG accesibles para navegar entre meses', () => {
    crearPantallaAgenda(raiz, { roster: ROSTER, almacen, alCambiar })
    expect(raiz.querySelector('[aria-label="Mes anterior"] svg')).not.toBeNull()
    expect(raiz.querySelector('[aria-label="Mes siguiente"] svg')).not.toBeNull()
  })

  it('muestra por defecto las fechas especiales y permite ocultarlas', () => {
    crearPantallaAgenda(raiz, { roster: ROSTER, almacen, alCambiar })
    const opcion = raiz.querySelector('.agenda-opcion-especiales input')
    expect(opcion).not.toBeNull()
    expect(opcion.checked).toBe(true)
    expect(raiz.querySelectorAll('.agenda-marca.efemeride').length).toBeGreaterThan(0)
    opcion.click()
    expect(raiz.querySelector('.agenda-opcion-especiales input').checked).toBe(false)
    expect(raiz.querySelectorAll('.agenda-marca.efemeride')).toHaveLength(0)
  })

  it('aplica una plantilla y conserva su recordatorio al guardar', async () => {
    crearPantallaAgenda(raiz, { roster: ROSTER, almacen, alCambiar })
    const plantilla = raiz.querySelector('[aria-label="Usar una plantilla de evento"]')
    plantilla.value = '0'
    plantilla.dispatchEvent(new Event('change'))
    expect(raiz.querySelector('input[placeholder="Ej: reunión de coordinación"]').value).toBe('Reunión de coordinación')
    expect(raiz.querySelector('[aria-label="Anticipación del recordatorio"]').value).toBe('7')
    raiz.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    expect(almacen.guardarRoster).toHaveBeenCalledWith(expect.objectContaining({
      agenda: expect.objectContaining({ eventos: [expect.objectContaining({ recordatorio: 7 })] }),
    }), 'Agregar evento: Reunión de coordinación')
    expect(alCambiar).toHaveBeenCalled()
  })

  it('muestra las actividades institucionales en agenda solo para cuentas con permiso CMS', async () => {
    const hoy = new Date()
    const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}T15:00`
    const cargarEventosCMS = vi.fn(async () => ({ eventos: [{
      id: 'ev1', titulo: 'Taller de convivencia', tipo: 'renovacion', fecha_hora: fecha, lugar: 'Tres Cruces', equipo_nombre: 'Programa FSB', proyecto_titulo: '', responsable_nombre: 'Lucía',
    }] }))
    crearPantallaAgenda(raiz, { roster: ROSTER, almacen, alCambiar, sesion: { rol: 'admin' }, cargarEventosCMS })
    await esperar()
    expect(cargarEventosCMS).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}$/))
    expect(raiz.textContent).toContain('Actividades CMS')
    expect(raiz.textContent).toContain('Taller de convivencia')
    expect(raiz.textContent).toContain('Renovación · Tres Cruces · Programa FSB · Lucía')
  })

  it('carga los meses necesarios para una lectura trimestral', async () => {
    const cargarEventosCMS = vi.fn(async () => ({ eventos: [] }))
    crearPantallaAgenda(raiz, { roster: ROSTER, almacen, alCambiar, sesion: { rol: 'admin' }, cargarEventosCMS })
    await esperar()
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent.includes('3 meses')).click()
    await esperar()
    expect(raiz.textContent).toContain('Próximos 3 meses')
    expect(new Set(cargarEventosCMS.mock.calls.map(([clave]) => clave)).size).toBeGreaterThanOrEqual(3)
  })

  it('guarda un evento manual y permite quitarlo con el cambio persistido', async () => {
    const hoy = new Date().toISOString().slice(0, 10)
    crearPantallaAgenda(raiz, { roster: ROSTER, almacen, alCambiar })
    const formulario = raiz.querySelector('form')
    formulario.querySelector('[data-perfil="agenda-evento-fecha"]').value = hoy
    formulario.querySelector('input[placeholder="Ej: reunión de coordinación"]').value = 'Preparar jornada'
    formulario.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await esperar()
    expect(almacen.guardarRoster).toHaveBeenCalledWith(expect.objectContaining({
      agenda: expect.objectContaining({ eventos: [expect.objectContaining({ titulo: 'Preparar jornada', fecha: hoy })] }),
    }), 'Agregar evento: Preparar jornada')
    ;[...raiz.querySelectorAll('button')].find((boton) => boton.textContent === 'Quitar').click()
    await esperar()
    expect(almacen.guardarRoster).toHaveBeenLastCalledWith(expect.objectContaining({
      agenda: expect.objectContaining({ eventos: [] }),
    }), 'Quitar evento: Preparar jornada')
  })
})
