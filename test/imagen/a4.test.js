import { describe, expect, it } from 'vitest'
import { agruparAsignaciones, ALTO_A4, ANCHO_A4, maquetarA4, nombreDeArchivoA4 } from '../../js/imagen/a4.js'
import { ROSTER } from '../ayudas/datos.js'

const grupo = {
  numero: 1, cancha: 'Cancha 1', titulo: 'Grupo 1', subtitulo: '10 a 17 años', apoyo: ['v3'],
  filas: [
    { participantes: ['p1'], voluntarios: ['v1'] },
    { participantes: ['p2'], voluntarios: ['v2', 'v3'] },
    { participantes: ['p3'], voluntarios: ['v1'] },
    { participantes: ['p4'], voluntarios: [] },
  ],
}
const lista = { fecha: '2026-08-29', hora: '11:00', lugar: 'Tres Cruces' }

describe('hoja A4 por cancha', () => {
  it('reúne participantes que comparten exactamente los mismos voluntarios', () => {
    const asignaciones = agruparAsignaciones(grupo.filas)
    expect(asignaciones).toHaveLength(3)
    expect(asignaciones[0]).toEqual({ participantes: ['p1', 'p3'], voluntarios: ['v1'] })
  })

  it('conserva varios voluntarios para un participante', () => {
    const asignacion = agruparAsignaciones(grupo.filas).find((a) => a.participantes.includes('p2'))
    expect(asignacion.voluntarios).toEqual(['v2', 'v3'])
  })

  it('no fusiona entre sí las filas sin acompañante', () => {
    const sinAcompanante = agruparAsignaciones([
      { participantes: ['p1'], voluntarios: [] },
      { participantes: ['p2'], voluntarios: [] },
    ])
    expect(sinAcompanante).toHaveLength(2)
  })

  it('produce una hoja A4 fija con fotos de ambos roles', () => {
    const roster = structuredClone(ROSTER)
    roster.voluntarios.find((v) => v.id === 'v1').foto = 'v1.jpg'
    const plano = maquetarA4(lista, roster, grupo)
    expect(plano.ancho).toBe(ANCHO_A4)
    expect(plano.alto).toBe(ALTO_A4)
    const fotos = plano.ordenes.filter((o) => o.tipo === 'imagen').map((o) => o.clave)
    expect(fotos).toContain('p3.jpg')
    expect(fotos).toContain('v1.jpg')
  })

  it('genera un nombre específico por cancha', () => {
    expect(nombreDeArchivoA4(lista, grupo)).toBe('futbol-sin-barreras-2026-08-29-cancha-1-a4.png')
  })
})
