import { describe, it, expect, beforeEach, vi } from 'vitest'
import { crearPantallaReporte } from '../../js/ui/pantalla-reporte.js'

const ROSTER = {
  version: 1,
  participantes: [
    { id: 'p1', nombre: 'Gaia', grupo: 1, activo: true },
    { id: 'prueba1', nombre: 'Prueba 1', grupo: 1, activo: false },
  ],
  voluntarios: [
    { id: 'v1', nombre: 'Abi', activo: true },
    { id: 'isa', nombre: 'Isa', activo: false },
  ],
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
    // Nombre, dos sabados, y el resumen. Por tabla: con los voluntarios al
    // costado hay dos, y cada una lleva su propio encabezado de dias.
    expect(raiz.querySelector('table').querySelectorAll('thead th')).toHaveLength(4)
  })

  it('dibuja una fila por persona', async () => {
    await abrir()
    expect(raiz.querySelectorAll('tbody tr[data-persona]')).toHaveLength(2)
    expect(raiz.querySelector('tr[data-persona="prueba1"]')).toBeNull()
    expect(raiz.querySelector('tr[data-persona="isa"]')).toBeNull()
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

  it('desde un mes vacio permite volver a armar la lista', async () => {
    deposito.listarListas = vi.fn(async () => [])
    const alIrALista = vi.fn()
    crearPantallaReporte(raiz, {
      roster: ROSTER, almacen: deposito, mes: '2026-01', alIrALista,
    })
    await esperar()
    raiz.querySelector('[data-accion="ir-a-lista"]').click()
    expect(alIrALista).toHaveBeenCalledOnce()
  })

  it('no cuenta la planilla del sabado que todavia no llego', async () => {
    // Una planilla nueva trae a todos presentes porque es un plan. Mostrarla en
    // el reporte diria que fue gente que todavia no fue, y en la alerta ese
    // "vino" del futuro cortaba cualquier racha de faltas.
    const futuro = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    const mes = futuro.slice(0, 7)
    deposito.listarListas = vi.fn(async () => [{ fecha: futuro }])
    await abrir(mes)
    expect(deposito.leerLista).not.toHaveBeenCalled()
    expect(raiz.textContent).toContain('No hay planillas')
  })

  it('ofrece las dos descargas', async () => {
    await abrir()
    expect(raiz.querySelector('[data-accion="descargar-png"]')).not.toBeNull()
    expect(raiz.querySelector('[data-accion="descargar-csv"]')).not.toBeNull()
  })

  it('permite elegir el mes y exige dos confirmaciones antes de eliminarlo', async () => {
    deposito.listarListas = vi.fn(async () => [{ fecha: '2026-07-25' }, { fecha: '2026-08-01' }])
    deposito.borrarMes = vi.fn(async () => {})
    await abrir()
    const selector = raiz.querySelector('[data-campo="mes-a-eliminar"]')
    expect([...selector.options].map((opcion) => opcion.value)).toEqual(['2026-08', '2026-07'])
    selector.value = '2026-07'
    selector.dispatchEvent(new Event('change'))
    raiz.querySelector('[data-accion="eliminar-mes"]').click()
    await esperar()
    expect(raiz.querySelector('[data-paso="1"]')).not.toBeNull()
    expect(deposito.borrarMes).not.toHaveBeenCalled()
    raiz.querySelector('[data-accion="continuar-eliminacion"]').click()
    raiz.querySelector('[data-accion="confirmar-eliminacion-definitiva"]').click()
    await esperar()
    expect(deposito.borrarMes).toHaveBeenCalledWith('2026-07')
  })

  it('permite elegir un día y exige dos confirmaciones antes de eliminarlo', async () => {
    deposito.borrarDia = vi.fn(async () => {})
    await abrir()
    const selector = raiz.querySelector('[data-campo="dia-a-eliminar"]')
    selector.value = '2026-08-01'
    selector.dispatchEvent(new Event('change'))
    raiz.querySelector('[data-accion="eliminar-dia"]').click()
    expect(raiz.querySelector('[data-paso="1"]')).not.toBeNull()
    raiz.querySelector('[data-accion="continuar-eliminacion"]').click()
    raiz.querySelector('[data-accion="confirmar-eliminacion-definitiva"]').click()
    await esperar()
    expect(deposito.borrarDia).toHaveBeenCalledWith('2026-08-01')
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

describe('cambiar de mes rapido', () => {
  it('gana el ultimo mes elegido, no el que termine ultimo de leer', async () => {
    await abrir()
    // Julio tarda mas que agosto. Sin control de carrera su respuesta pisaba la
    // tabla del mes que la coordinadora tiene elegido.
    const julio = {
      fecha: '2026-07-04',
      ausentes: ['p1'],
      grupos: [{ numero: 1, filas: [], apoyo: ['v1'] }, { numero: 2, filas: [], apoyo: [] }],
    }
    deposito.listarListas = vi.fn(async () => [{ fecha: '2026-07-04' }, { fecha: '2026-08-01' }])
    deposito.leerLista = vi.fn((f) => new Promise((r) => {
      setTimeout(() => r(f === '2026-07-04' ? julio : LISTAS['2026-08-01']), f.startsWith('2026-07') ? 60 : 0)
    }))
    const elegir = (m) => {
      const s = raiz.querySelector('[data-campo="mes"]')
      s.value = m
      s.dispatchEvent(new Event('change'))
    }
    elegir('2026-07')
    // La espera es la parte que importa: en la vida real pasan segundos entre un
    // clic y el otro, asi que la carga de julio ya paso su primer await cuando
    // se elige agosto. Sin ella la carrera se tapa sola y la prueba no prueba nada.
    await new Promise((r) => setTimeout(r, 20))
    elegir('2026-08')
    await new Promise((r) => setTimeout(r, 200))
    expect(raiz.querySelector('[data-campo="mes"]').value).toBe('2026-08')
    expect([...raiz.querySelector('table').querySelectorAll('thead th.dia')]
      .map((t) => t.textContent)).toEqual(['1'])
  })
})

describe('cuando la lectura falla', () => {
  it('lo dice en vez de quedarse en "Leyendo" para siempre', async () => {
    // En modo GitHub esto es una caida de red o un token vencido. Sin el aviso
    // la pantalla queda congelada y no hay forma de saber que paso.
    deposito.listarListas = vi.fn(async () => { throw new Error('sin conexión') })
    await abrir()
    await esperar()
    expect(raiz.textContent).not.toContain('Leyendo')
    expect(raiz.textContent).toContain('No se pudo leer')
  })
})

describe('grupos y voluntarios al costado', () => {
  const conGrupos = () => {
    deposito.leerLista = vi.fn(async (fecha) => ({
      ...LISTAS[fecha],
      grupos: [
        { numero: 1, titulo: 'Los grandes', filas: LISTAS[fecha].grupos[0].filas, apoyo: LISTAS[fecha].grupos[0].apoyo },
        { numero: 2, titulo: 'Los chicos', filas: [{ participantes: ['p2'], voluntarios: [] }], apoyo: [] },
      ],
    }))
  }

  beforeEach(() => {
    ROSTER.participantes = [
      { id: 'p1', nombre: 'Gaia', grupo: 1, activo: true },
      { id: 'p2', nombre: 'Nikita', grupo: 2, activo: true },
    ]
  })

  it('la opcion viene activada', async () => {
    await abrir()
    expect(raiz.querySelector('[data-campo="al-costado"]').checked).toBe(true)
  })

  it('activada, dibuja dos tablas: participantes y voluntarios', async () => {
    await abrir()
    expect(raiz.querySelectorAll('table')).toHaveLength(2)
  })

  it('desactivada, vuelve a una sola tabla apilada', async () => {
    await abrir()
    const casilla = raiz.querySelector('[data-campo="al-costado"]')
    casilla.checked = false
    casilla.dispatchEvent(new Event('change'))
    expect(raiz.querySelectorAll('table')).toHaveLength(1)
  })

  it('titula cada grupo con el rotulo de la planilla', async () => {
    conGrupos()
    await abrir()
    expect(raiz.textContent).toContain('Los grandes')
    expect(raiz.textContent).toContain('Los chicos')
  })

  it('sin rotulo guardado cae en el numero de grupo', async () => {
    await abrir()
    expect(raiz.textContent).toContain('Grupo 1')
    expect(raiz.textContent).toContain('Grupo 2')
  })

  it('cada participante queda en la seccion de su grupo', async () => {
    await abrir()
    const secciones = [...raiz.querySelectorAll('tbody tr')].map((tr) => tr.textContent)
    const iUno = secciones.findIndex((t) => t.includes('Grupo 1'))
    const iDos = secciones.findIndex((t) => t.includes('Grupo 2'))
    const iGaia = secciones.findIndex((t) => t.includes('Gaia'))
    const iNikita = secciones.findIndex((t) => t.includes('Nikita'))
    expect(iGaia).toBeGreaterThan(iUno)
    expect(iGaia).toBeLessThan(iDos)
    expect(iNikita).toBeGreaterThan(iDos)
  })
})
