import { describe, it, expect, beforeEach, vi } from 'vitest'
import { crearPantallaReporte } from '../../js/ui/pantalla-reporte.js'

const ROSTER = {
  version: 1,
  participantes: [{ id: 'p1', nombre: 'Gaia', grupo: 1, activo: true }],
  voluntarios: [{ id: 'v1', nombre: 'Abi', activo: true }],
}

const LISTAS = {
  '2026-08-01': {
    fecha: '2026-08-01',
    ausentes: [],
    grupos: [
      { numero: 1, filas: [{ participantes: ['p1'], voluntarios: ['v1'] }], apoyo: [] },
      { numero: 2, filas: [], apoyo: [] },
    ],
  },
  '2026-08-08': {
    fecha: '2026-08-08',
    ausentes: ['p1'],
    grupos: [
      { numero: 1, filas: [], apoyo: ['v1'] },
      { numero: 2, filas: [], apoyo: [] },
    ],
  },
}

let raiz, deposito

beforeEach(() => {
  document.body.innerHTML = '<div id="raiz"></div>'
  raiz = document.getElementById('raiz')
  deposito = {
    listarListas: vi.fn(async () => Object.keys(LISTAS).map((fecha) => ({ fecha }))),
    leerLista: vi.fn(async (fecha) => LISTAS[fecha] ?? null),
    leerAsistencias: vi.fn(async () => null),
  }
})

const esperar = () => new Promise((r) => setTimeout(r, 0))
const abrir = (mes = '2026-08') => {
  const vista = crearPantallaReporte(raiz, { roster: ROSTER, almacen: deposito, mes })
  return esperar().then(() => vista)
}

describe('pantalla de reporte', () => {
  it('arranca en el mes que se le pasa', async () => {
    await abrir()
    expect(raiz.querySelector('[data-campo="mes"]').value).toBe('2026-08')
  })

  it('dibuja una columna por sabado con planilla', async () => {
    await abrir()
    // Nombre, dos sabados, y el resumen.
    expect(raiz.querySelectorAll('thead th')).toHaveLength(4)
  })

  it('dibuja una fila por persona', async () => {
    await abrir()
    expect(raiz.querySelectorAll('tbody tr[data-persona]')).toHaveLength(2)
  })

  it('marca presente y ausente', async () => {
    await abrir()
    const celdas = raiz.querySelectorAll('tr[data-persona="p1"] td[data-estado]')
    expect(celdas[0].dataset.estado).toBe('vino')
    expect(celdas[1].dataset.estado).toBe('falto')
  })

  it('deja sin marca el sabado en que la persona no estaba', async () => {
    await abrir()
    const celdas = raiz.querySelectorAll('tr[data-persona="v1"] td[data-estado]')
    expect(celdas[0].dataset.estado).toBe('vino')
  })

  it('solo lee las planillas del mes elegido', async () => {
    deposito.listarListas = vi.fn(async () => [{ fecha: '2026-07-25' }, { fecha: '2026-08-01' }])
    await abrir()
    expect(deposito.leerLista).toHaveBeenCalledTimes(1)
    expect(deposito.leerLista).toHaveBeenCalledWith('2026-08-01')
  })

  it('un mes sin planillas lo dice en vez de mostrar una tabla vacia', async () => {
    deposito.listarListas = vi.fn(async () => [])
    await abrir('2026-01')
    expect(raiz.textContent).toContain('No hay planillas')
    expect(raiz.querySelector('table')).toBeNull()
  })

  it('ofrece las dos descargas', async () => {
    await abrir()
    expect(raiz.querySelector('[data-accion="descargar-png"]')).not.toBeNull()
    expect(raiz.querySelector('[data-accion="descargar-csv"]')).not.toBeNull()
  })

  it('cambiar de mes vuelve a leer', async () => {
    await abrir()
    const selector = raiz.querySelector('[data-campo="mes"]')
    selector.value = '2026-07'
    selector.dispatchEvent(new Event('change'))
    await esperar()
    expect(deposito.leerAsistencias).toHaveBeenCalledWith('2026-07')
  })

  it('irse de la pantalla mientras carga no la dibuja despues', async () => {
    // Leer cinco archivos tarda, y volver a Armar lista en el medio dejaba el
    // dibujado apuntando a un contenedor que ya no existe.
    let soltar
    deposito.listarListas = vi.fn(() => new Promise((r) => { soltar = r }))
    const vista = crearPantallaReporte(raiz, { roster: ROSTER, almacen: deposito, mes: '2026-08' })
    vista.destruir()
    soltar([])
    await esperar()
    expect(raiz.textContent).not.toContain('No hay planillas')
  })
})
