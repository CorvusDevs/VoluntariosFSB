import { describe, it, expect } from 'vitest'
import { maquetarReporte } from '../../js/imagen/maquetar-reporte.js'
import { TIPOS } from '../../js/imagen/pintar.js'

const medir = (texto) => texto.length * 8

const HISTORIA = {
  fechas: ['2026-08-01', '2026-08-08', '2026-08-15'],
  participantes: [
    { persona: { id: 'p1', nombre: 'Gaia' }, estados: ['vino', 'falto', 'vino'], vino: 2, de: 3 },
    { persona: { id: 'p2', nombre: 'Santiago' }, estados: ['vino', 'vino', 'vino'], vino: 3, de: 3 },
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

  it('separa participantes de voluntarios con dos titulos', () => {
    const textos = textosDe(maquetar())
    expect(textos).toContain('Participantes')
    expect(textos).toContain('Voluntarios')
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
    const corta = maquetarReporte({
      historia: {
        ...HISTORIA,
        fechas: ['2026-08-01'],
        participantes: HISTORIA.participantes.map((f) => ({ ...f, estados: ['vino'] })),
        voluntarios: HISTORIA.voluntarios.map((f) => ({ ...f, estados: ['vino'] })),
      },
      mes: '2026-08',
      medirTexto: medir,
    })
    expect(corta.ancho).toBeLessThan(maquetar().ancho)
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
