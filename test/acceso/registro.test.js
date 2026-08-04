import { describe, it, expect } from 'vitest'
import {
  interpretar, porDia, agruparPorDia, mezclar, hora, leerRegistro, RUTA_ACCESOS,
} from '../../js/acceso/registro.js'

const commit = (mensaje, fecha = '2026-08-04T17:26:00Z', sha = 'abc') => ({ sha, mensaje, fecha })

describe('interpretar un commit', () => {
  it('separa que paso de quien lo hizo', () => {
    const e = interpretar(commit('Cambiar la planilla del 2026-08-08 · Claudia Cravea'))
    expect(e.accion).toBe('Cambiar la planilla del 2026-08-08')
    expect(e.quien).toBe('Claudia Cravea')
  })

  it('sin nombre lo dice, en vez de atribuirselo a cualquiera', () => {
    // Los commits viejos y los que escribe alguien por fuera de la aplicacion
    // no traen autor. Inventar uno seria peor que no tener registro.
    const e = interpretar(commit('Actualizar la lista del 2026-08-01'))
    expect(e.quien).toBeNull()
    expect(e.accion).toBe('Actualizar la lista del 2026-08-01')
  })

  it('un nombre con puntos medios adentro no rompe el corte', () => {
    const e = interpretar(commit('Cambiar la planilla del 2026-08-08 · Ana · Maria'))
    expect(e.quien).toBe('Maria')
    expect(e.accion).toBe('Cambiar la planilla del 2026-08-08 · Ana')
  })

  it('se queda con el primer renglon del mensaje', () => {
    const e = interpretar(commit('Cambiar las personas · Ana\n\nCuerpo largo del commit'))
    expect(e.accion).toBe('Cambiar las personas')
    expect(e.quien).toBe('Ana')
  })

  it('aguanta un commit vacio sin explotar', () => {
    expect(interpretar({}).accion).toBe('')
    expect(interpretar(undefined).quien).toBeNull()
  })
})

describe('agrupar por dia', () => {
  it('junta las entradas del mismo dia y pone los dias mas nuevos primero', () => {
    const dias = porDia([
      commit('A · Ana', '2026-08-03T10:00:00Z'),
      commit('B · Ana', '2026-08-04T10:00:00Z'),
      commit('C · Ana', '2026-08-04T11:00:00Z'),
    ])
    expect(dias.map((d) => d.dia)).toEqual(['2026-08-04', '2026-08-03'])
    expect(dias[0].entradas).toHaveLength(2)
    expect(dias[0].titulo).toContain('agosto')
  })

  it('los commits sin fecha quedan aparte y no rompen el orden', () => {
    const dias = porDia([commit('A · Ana', null), commit('B · Ana', '2026-08-04T10:00:00Z')])
    expect(dias.some((d) => d.titulo === 'Sin fecha')).toBe(true)
  })
})

describe('hora', () => {
  it('devuelve vacio en vez de NaN con una fecha invalida', () => {
    expect(hora(null)).toBe('')
    expect(hora('cualquier cosa')).toBe('')
  })

  it('escribe la hora con dos digitos', () => {
    expect(hora('2026-08-04T09:05:00')).toBe('09:05')
  })
})

describe('leerRegistro', () => {
  it('le pide al cliente la cantidad que se le pasa', async () => {
    let pedido = null
    const cliente = { listarCommits: async (o) => { pedido = o; return [commit('A · Ana')] } }
    const dias = await leerRegistro(cliente, { cantidad: 5 })
    expect(pedido.cantidad).toBe(5)
    expect(dias[0].entradas[0].quien).toBe('Ana')
  })
})

describe('mezclar los dos historiales', () => {
  const datos = [commit('Cambiar la planilla del 2026-08-08 · Ana', '2026-08-04T17:26:00Z', 'd1')]
  const accesos = [commit('Dar acceso a Monica como coordinacion · Ana', '2026-08-04T17:40:00Z', 'a1')]

  it('ordena las dos fuentes por fecha, no una despues de la otra', () => {
    const entradas = mezclar([
      { commits: datos, origen: 'datos' },
      { commits: accesos, origen: 'accesos' },
    ])
    expect(entradas.map((e) => e.sha)).toEqual(['a1', 'd1'])
    expect(entradas[0].origen).toBe('accesos')
  })

  it('leerRegistro trae los cambios de acceso, que es lo que mas importa auditar', async () => {
    const dias = await leerRegistro(
      { listarCommits: async () => datos },
      { clientePublico: { listarCommits: async () => accesos } },
    )
    const todas = dias.flatMap((d) => d.entradas)
    expect(todas.some((e) => e.origen === 'accesos' && e.accion.includes('Dar acceso'))).toBe(true)
  })

  it('si el historial de accesos falla, muestra el otro igual', async () => {
    // Media verdad sirve mas que una pantalla en blanco.
    const dias = await leerRegistro(
      { listarCommits: async () => datos },
      { clientePublico: { listarCommits: async () => { throw new Error('403') } } },
    )
    expect(dias.flatMap((d) => d.entradas)).toHaveLength(1)
  })

  it('le pide al repositorio publico solo los commits del archivo de accesos', async () => {
    // Ese repositorio guarda tambien el codigo: sin filtrar, el registro se
    // llenaba de commits de desarrollo en vez de cambios de acceso.
    let pedido = null
    await leerRegistro(
      { listarCommits: async () => datos },
      { clientePublico: { listarCommits: async (o) => { pedido = o; return accesos } } },
    )
    expect(pedido.ruta).toBe(RUTA_ACCESOS)
  })

  it('sin cliente publico se comporta como antes', async () => {
    const dias = await leerRegistro({ listarCommits: async () => datos })
    expect(dias.flatMap((d) => d.entradas)).toHaveLength(1)
  })
})
