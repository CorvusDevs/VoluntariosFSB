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

describe('corregir a quien no figuraba en la planilla', () => {
  const rosterConAusente = {
    version: 1,
    participantes: [{ id: 'pX', nombre: 'Recien anotada', grupo: 1, activo: true }],
    voluntarios: [],
  }

  const abrirCon = async () => {
    const vista = crearPantallaAsistencias(raiz, { roster: rosterConAusente, almacen: deposito })
    await esperar()
    await esperar()
    return vista
  }

  it('arranca en "no estaba" si la planilla no la menciona', async () => {
    await abrirCon()
    expect(raiz.querySelector('[data-persona="pX"]').dataset.estado).toBe('no-estaba')
  })

  it('se puede volver a "no estaba" despues de tocarla dos veces', async () => {
    // Antes el toque alternaba solo entre vino y falto: quien tocaba por error a
    // alguien que no estaba en la planilla no tenia forma de deshacerlo, y le
    // quedaba una falta inventada en el reporte.
    await abrirCon()
    const toque = async () => {
      raiz.querySelector('[data-persona="pX"]').click()
      await esperar()
    }
    await toque()
    expect(raiz.querySelector('[data-persona="pX"]').dataset.estado).toBe('vino')
    await toque()
    expect(raiz.querySelector('[data-persona="pX"]').dataset.estado).toBe('falto')
    await toque()
    expect(raiz.querySelector('[data-persona="pX"]').dataset.estado).toBe('no-estaba')
    expect(guardado.at(-1).datos.correcciones).toEqual([])
  })
})

describe('cuando el guardado falla', () => {
  it('no deja la correccion en pantalla como si se hubiera guardado', async () => {
    // Peor que no poder corregir es creer que se corrigio: el reporte del mes
    // saldria distinto de lo que quedo en pantalla.
    deposito.guardarAsistencias = vi.fn(async () => { throw new Error('sin conexión') })
    await abrir()
    const antes = raiz.querySelector('[data-persona="p1"]').dataset.estado
    raiz.querySelector('[data-persona="p1"]').click()
    await esperar()
    expect(raiz.querySelector('[data-persona="p1"]').dataset.estado).toBe(antes)
    expect(raiz.textContent).toContain('No se pudo guardar')
  })
})

describe('cambiar de sabado rapido', () => {
  it('gana el ultimo que se eligio, no el que termine ultimo de leer', async () => {
    await abrir()
    // El 01 tarda mas que el 08: sin control de carrera, su respuesta pisaba la
    // del sabado que la coordinadora tiene elegido en pantalla.
    // El 01 tarda mas y en el 01 p1 no fue; en el 08 si. Lo que hay que mirar es
    // el estado dibujado, no el selector: el selector se dibuja de la fecha
    // elegida y sale bien igual, tapando que los datos son del otro sabado.
    const vacia = { fecha: '2026-08-01', ausentes: ['p1'], grupos: [{ numero: 1, filas: [], apoyo: [] }] }
    const demoras = { '2026-08-01': 60, '2026-08-08': 0 }
    deposito.leerLista = vi.fn((f) => new Promise((r) => {
      setTimeout(() => r(f === '2026-08-01' ? vacia : LISTA), demoras[f])
    }))
    const elegir = (f) => {
      const s = raiz.querySelector('[data-campo="sabado"]')
      s.value = f
      s.dispatchEvent(new Event('change'))
    }
    elegir('2026-08-01')
    elegir('2026-08-08')
    await new Promise((r) => setTimeout(r, 150))
    expect(raiz.querySelector('[data-campo="sabado"]').value).toBe('2026-08-08')
    expect(raiz.querySelector('[data-persona="p1"]').dataset.estado).toBe('vino')
  })
})

describe('cuando la lectura falla', () => {
  it('lo dice en vez de quedarse en "Leyendo" para siempre', async () => {
    deposito.listarListas = vi.fn(async () => { throw new Error('sin conexión') })
    await abrir()
    await esperar()
    expect(raiz.textContent).not.toContain('Leyendo')
    expect(raiz.textContent).toContain('No se pudo leer')
  })
})
