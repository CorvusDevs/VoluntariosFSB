import { describe, it, expect, beforeEach, vi } from 'vitest'
import { crearPantallaAsistencias } from '../../js/ui/pantalla-asistencias.js'

const ROSTER = {
  version: 1,
  participantes: [
    { id: 'p1', nombre: 'Gaia', grupo: 1, activo: true },
    { id: 'p9', nombre: 'Quien se fue', grupo: 1, activo: false },
  ],
  voluntarios: [{ id: 'v1', nombre: 'Abi', activo: true }],
}

const LISTA = {
  fecha: '2026-08-08',
  ausentes: [],
  grupos: [
    { numero: 1, filas: [{ participantes: ['p1'], voluntarios: ['v1'] }], apoyo: [] },
    { numero: 2, filas: [], apoyo: [] },
  ],
}

let raiz, deposito, guardado

beforeEach(() => {
  document.body.innerHTML = '<div id="raiz"></div>'
  raiz = document.getElementById('raiz')
  guardado = []
  deposito = {
    listarListas: vi.fn(async () => [{ fecha: '2026-08-08' }, { fecha: '2026-08-01' }]),
    leerLista: vi.fn(async () => LISTA),
    leerAsistencias: vi.fn(async () => null),
    guardarAsistencias: vi.fn(async (mes, datos, descripcion) => {
      guardado.push({ mes, datos, descripcion })
    }),
  }
})

const esperar = () => new Promise((r) => setTimeout(r, 0))
const abrir = async () => {
  const vista = crearPantallaAsistencias(raiz, { roster: ROSTER, almacen: deposito })
  await esperar()
  await esperar()
  return vista
}

describe('pantalla de asistencias', () => {
  it('ofrece los sabados que tienen planilla, del mas nuevo al mas viejo', async () => {
    await abrir()
    const opciones = [...raiz.querySelectorAll('[data-campo="sabado"] option')].map((o) => o.value)
    expect(opciones).toEqual(['2026-08-08', '2026-08-01'])
  })

  it('no ofrece el sabado que todavia no llego', async () => {
    // Corregir la asistencia de un sabado que no paso no quiere decir nada, y
    // verlo en la lista hace dudar de si esa planilla ya cuenta para el reporte.
    const futuro = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    deposito.listarListas = vi.fn(async () => [{ fecha: futuro }, { fecha: '2026-08-08' }])
    await abrir()
    const opciones = [...raiz.querySelectorAll('[data-campo="sabado"] option')].map((o) => o.value)
    expect(opciones).toEqual(['2026-08-08'])
  })

  it('muestra a cada uno con su estado derivado', async () => {
    await abrir()
    expect(raiz.querySelector('[data-persona="p1"]').dataset.estado).toBe('vino')
  })

  it('no lista a quien esta dado de baja', async () => {
    await abrir()
    expect(raiz.querySelector('[data-persona="p9"]')).toBeNull()
  })

  it('tocar a alguien lo corrige y lo guarda', async () => {
    await abrir()
    raiz.querySelector('[data-persona="p1"]').click()
    await esperar()
    expect(guardado.at(-1).mes).toBe('2026-08')
    expect(guardado.at(-1).datos.correcciones).toEqual([
      expect.objectContaining({ fecha: '2026-08-08', persona: 'p1', vino: false }),
    ])
  })

  it('la correccion se ve en pantalla enseguida', async () => {
    await abrir()
    raiz.querySelector('[data-persona="p1"]').click()
    await esperar()
    expect(raiz.querySelector('[data-persona="p1"]').dataset.estado).toBe('falto')
  })

  it('la descripcion dice que sabado se corrigio', async () => {
    await abrir()
    raiz.querySelector('[data-persona="p1"]').click()
    await esperar()
    expect(guardado.at(-1).descripcion).toContain('2026-08-08')
  })

  it('tocar dos veces borra la correccion en vez de acumular dos', async () => {
    // Volver al estado que ya dice la planilla no es una correccion: guardar una
    // diferencia que no difiere ensucia el archivo y el registro.
    await abrir()
    raiz.querySelector('[data-persona="p1"]').click()
    await esperar()
    raiz.querySelector('[data-persona="p1"]').click()
    await esperar()
    expect(guardado.at(-1).datos.correcciones).toEqual([])
  })

  it('arranca de las correcciones ya guardadas', async () => {
    deposito.leerAsistencias = vi.fn(async () => ({
      version: 1, mes: '2026-08', correcciones: [{ fecha: '2026-08-08', persona: 'p1', vino: false }],
    }))
    await abrir()
    expect(raiz.querySelector('[data-persona="p1"]').dataset.estado).toBe('falto')
  })

  it('sin planillas guardadas lo dice', async () => {
    deposito.listarListas = vi.fn(async () => [])
    await abrir()
    expect(raiz.textContent).toContain('No hay planillas')
  })
})
