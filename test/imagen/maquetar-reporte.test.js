import { describe, it, expect } from 'vitest'
import { maquetarReporte } from '../../js/imagen/maquetar-reporte.js'
import { TIPOS } from '../../js/imagen/pintar.js'

// Sensible a la fuente, porque el titulo va en 34px y todo lo demas en 20 o 22:
// un medidor de ancho fijo decia que el titulo entraba cuando en pantalla se
// salia del lienzo.
const anchoDe = (fuente) => Number(String(fuente).match(/(\d+)px/)?.[1] ?? 20) * 0.55
const medir = (texto, fuente) => texto.length * anchoDe(fuente)

const HISTORIA = {
  fechas: ['2026-08-01', '2026-08-08', '2026-08-15'],
  participantes: [
    { persona: { id: 'p1', nombre: 'Gaia', grupo: 1 }, estados: ['vino', 'falto', 'vino'], vino: 2, de: 3 },
    { persona: { id: 'p2', nombre: 'Santiago', grupo: 1 }, estados: ['vino', 'vino', 'vino'], vino: 3, de: 3 },
  ],
  voluntarios: [
    { persona: { id: 'v1', nombre: 'Abi' }, estados: ['no-estaba', 'vino', 'vino'], vino: 2, de: 2 },
  ],
}

const maquetar = () => maquetarReporte({ historia: HISTORIA, mes: '2026-08', medirTexto: medir })
const textosDe = (plano) => plano.ordenes.filter((o) => o.tipo === 'texto').map((o) => o.texto)

describe('maquetarReporte', () => {
  it('devuelve alto y ordenes', () => {
    const plano = maquetar()
    expect(plano.alto).toBeGreaterThan(0)
    expect(plano.ordenes.length).toBeGreaterThan(0)
  })

  it('solo emite tipos que el pintor sabe ejecutar', () => {
    // Derivado de TIPOS, no de una lista escrita a mano: una lista copiada se
    // desactualiza en silencio y la prueba deja de proteger nada.
    new Set(maquetar().ordenes.map((o) => o.tipo)).forEach((t) => expect(TIPOS).toContain(t))
  })

  it('titula con el mes en palabras', () => {
    expect(textosDe(maquetar())).toContain('Asistencia de agosto de 2026')
  })

  it('escribe el nombre de cada persona', () => {
    const textos = textosDe(maquetar())
    expect(textos).toContain('Gaia')
    expect(textos).toContain('Abi')
  })

  it('titula el bloque de cada grupo y el de voluntarios', () => {
    // Los participantes ya no van bajo un unico "Participantes": van repartidos
    // por grupo, que es como se juega el sabado.
    const textos = textosDe(maquetarReporte({
      historia: HISTORIA, mes: '2026-08', medirTexto: medir, titulos: { 1: 'Grupo 1' },
    }))
    expect(textos).toContain('Grupo 1')
    expect(textos).toContain('Voluntarios')
    expect(textos).not.toContain('Participantes')
  })

  it('encabeza cada columna con el dia del mes', () => {
    const textos = textosDe(maquetar())
    expect(textos).toContain('1')
    expect(textos).toContain('8')
    expect(textos).toContain('15')
  })

  it('resume cuantos vino de cuantos', () => {
    expect(textosDe(maquetar())).toContain('2 de 3')
  })

  it('deja la casilla del que no estaba sin marca', () => {
    // Tres personas por tres sabados son nueve casillas, menos la de Abi el 1.
    const marcas = maquetar().ordenes.filter((o) => o.tipo === 'texto' && ['✓', '✗'].includes(o.texto))
    expect(marcas).toHaveLength(8)
  })

  it('el ancho crece con la cantidad de sabados', () => {
    // Con tres sabados y menos manda el ancho del titulo, asi que la comparacion
    // se hace donde la tabla ya es lo mas ancho: cinco columnas contra diez.
    const conSabados = (cuantos) => maquetarReporte({
      historia: {
        fechas: Array.from({ length: cuantos }, (_, i) => `2026-08-${String(i + 1).padStart(2, '0')}`),
        participantes: [{ persona: { id: 'p1', nombre: 'Gaia' },
          estados: Array(cuantos).fill('vino'), vino: cuantos, de: cuantos }],
        voluntarios: [],
      },
      mes: '2026-08',
      medirTexto: medir,
    })
    expect(conSabados(5).ancho).toBeLessThan(conSabados(10).ancho)
  })

  it('el nombre largo ensancha la imagen en vez de desbordarla', () => {
    const largo = maquetarReporte({
      historia: {
        ...HISTORIA,
        participantes: [{ ...HISTORIA.participantes[0],
          persona: { id: 'p1', nombre: 'Maria de los Angeles Rodriguez' } }],
      },
      mes: '2026-08',
      medirTexto: medir,
    })
    expect(largo.ancho).toBeGreaterThan(maquetar().ancho)
  })

  it('la imagen es al menos tan ancha como su titulo', () => {
    // Con pocos sabados el ancho lo fijaban las columnas, y el titulo se salia
    // por la derecha: fillText no recorta, simplemente dibuja fuera del lienzo.
    // Verificado en el navegador: "Asistencia de agosto de 2026" cortado en 488.
    const corto = maquetarReporte({
      historia: { fechas: [], participantes: [], voluntarios: [] },
      mes: '2026-09',
      medirTexto: medir,
    })
    const titulo = corto.ordenes.find((o) => o.tipo === 'texto' && o.texto.startsWith('Asistencia'))
    expect(titulo.x + medir(titulo.texto, titulo.fuente)).toBeLessThanOrEqual(corto.ancho)
  })

  it('no dibuja nada fuera del lienzo', () => {
    const plano = maquetar()
    plano.ordenes.filter((o) => o.tipo === 'rect').forEach((o) => {
      expect(o.x).toBeGreaterThanOrEqual(0)
      expect(o.x + o.ancho).toBeLessThanOrEqual(plano.ancho + 0.5)
    })
  })

  it('un mes sin nadie no rompe', () => {
    const vacio = maquetarReporte({
      historia: { fechas: [], participantes: [], voluntarios: [] },
      mes: '2026-01',
      medirTexto: medir,
    })
    expect(vacio.alto).toBeGreaterThan(0)
    expect(textosDe(vacio)).toContain('Asistencia de enero de 2026')
  })
})

const HISTORIA_DOS_GRUPOS = {
  fechas: ['2026-08-01', '2026-08-08'],
  participantes: [
    { persona: { id: 'p1', nombre: 'Gaia', grupo: 1 }, estados: ['vino', 'vino'], vino: 2, de: 2 },
    { persona: { id: 'p3', nombre: 'Nikita', grupo: 2 }, estados: ['vino', 'falto'], vino: 1, de: 2 },
    { persona: { id: 'p2', nombre: 'Santiago', grupo: 1 }, estados: ['vino', 'vino'], vino: 2, de: 2 },
  ],
  voluntarios: [
    { persona: { id: 'v1', nombre: 'Abi' }, estados: ['vino', 'vino'], vino: 2, de: 2 },
  ],
}

const TITULOS = { 1: 'Grupo 1', 2: 'Grupo 2' }
const conGrupos = (opciones = {}) => maquetarReporte({
  historia: HISTORIA_DOS_GRUPOS, mes: '2026-08', medirTexto: medir, titulos: TITULOS, ...opciones,
})

describe('participantes separados por grupo', () => {
  it('titula cada grupo con el nombre que le puso la coordinacion', () => {
    // Los rotulos se editan desde Armar lista, asi que el reporte no puede
    // escribir "Grupo 1" a mano.
    const textos = textosDe(conGrupos({ titulos: { 1: 'Los grandes', 2: 'Los chicos' } }))
    expect(textos).toContain('Los grandes')
    expect(textos).toContain('Los chicos')
    expect(textos).not.toContain('Participantes')
  })

  it('cada uno queda bajo su grupo', () => {
    const textos = textosDe(conGrupos())
    expect(textos.indexOf('Gaia')).toBeGreaterThan(textos.indexOf('Grupo 1'))
    expect(textos.indexOf('Nikita')).toBeGreaterThan(textos.indexOf('Grupo 2'))
    expect(textos.indexOf('Santiago')).toBeLessThan(textos.indexOf('Grupo 2'))
  })

  it('un grupo sin nadie no deja un titulo suelto', () => {
    const soloUno = maquetarReporte({
      historia: { ...HISTORIA_DOS_GRUPOS, participantes: [HISTORIA_DOS_GRUPOS.participantes[0]] },
      mes: '2026-08', medirTexto: medir, titulos: TITULOS,
    })
    expect(textosDe(soloUno)).not.toContain('Grupo 2')
  })
})

describe('voluntarios al costado', () => {
  it('por defecto la imagen es mas ancha y mas baja', () => {
    // El reporte se lee de un vistazo en el telefono: apilar todo hacia abajo
    // obliga a seguir con la mirada una columna larguisima.
    const alCostado = conGrupos()
    const apilado = conGrupos({ columnas: false })
    expect(alCostado.alto).toBeLessThan(apilado.alto)
    expect(alCostado.ancho).toBeGreaterThan(apilado.ancho)
  })

  it('los voluntarios arrancan a la derecha de los participantes', () => {
    const plano = conGrupos()
    const xDe = (t) => plano.ordenes.find((o) => o.tipo === 'texto' && o.texto === t).x
    expect(xDe('Abi')).toBeGreaterThan(xDe('Gaia'))
  })

  it('apilado, los voluntarios quedan debajo', () => {
    const plano = conGrupos({ columnas: false })
    const orden = (t) => plano.ordenes.find((o) => o.tipo === 'texto' && o.texto === t)
    expect(orden('Abi').y).toBeGreaterThan(orden('Gaia').y)
    expect(orden('Abi').x).toBe(orden('Gaia').x)
  })

  it('nada se dibuja fuera del lienzo con las dos columnas', () => {
    const plano = conGrupos()
    plano.ordenes.filter((o) => o.tipo === 'rect').forEach((o) => {
      expect(o.x + o.ancho).toBeLessThanOrEqual(plano.ancho + 0.5)
    })
    plano.ordenes.filter((o) => o.tipo === 'texto').forEach((o) => {
      expect(o.y).toBeLessThanOrEqual(plano.alto)
    })
  })

  it('sin voluntarios no deja una columna vacia a la derecha', () => {
    const plano = maquetarReporte({
      historia: { ...HISTORIA_DOS_GRUPOS, voluntarios: [] },
      mes: '2026-08', medirTexto: medir, titulos: TITULOS,
    })
    const sinColumnas = maquetarReporte({
      historia: { ...HISTORIA_DOS_GRUPOS, voluntarios: [] },
      mes: '2026-08', medirTexto: medir, titulos: TITULOS, columnas: false,
    })
    expect(plano.ancho).toBe(sinColumnas.ancho)
  })
})

describe('color de los titulos', () => {
  it('los voluntarios se distinguen de los grupos, esten donde esten', () => {
    // El color viajaba deducido de en que arreglo estaba la seccion, asi que
    // apilar en vez de poner al costado se lo cambiaba sin motivo.
    const colorDe = (plano, texto) => plano.ordenes
      .find((o) => o.tipo === 'texto' && o.texto === texto).color
    const alCostado = conGrupos()
    const apilado = conGrupos({ columnas: false })
    expect(colorDe(alCostado, 'Voluntarios')).toBe(colorDe(apilado, 'Voluntarios'))
    expect(colorDe(alCostado, 'Voluntarios')).not.toBe(colorDe(alCostado, 'Grupo 1'))
  })
})
