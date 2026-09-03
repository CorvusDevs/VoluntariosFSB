import { describe, expect, it } from 'vitest'
import { agruparAsignaciones, ALTO_A4, ANCHO_A4, columnasParaA4, maquetarA4, nombreDeArchivoA4 } from '../../js/imagen/a4.js'
import { maquetar } from '../../js/imagen/maquetar.js'
import { ROSTER, medirFalso } from '../ayudas/datos.js'

const grupo = {
  numero: 1, cancha: 'Cancha 1', titulo: 'Grupo 1', subtitulo: '10 a 17 años', apoyo: ['v3'],
  filas: [
    { participantes: ['p1'], voluntarios: ['v1'] },
    { participantes: ['p2'], voluntarios: ['v2', 'v3'] },
    { participantes: ['p3'], voluntarios: ['v1'] },
    { participantes: ['p4'], voluntarios: [] },
  ],
}
const lista = {
  fecha: '2026-08-29', hora: '11:00', lugar: 'Tres Cruces',
  opcionesImagen: { formato: 'filas', fotos: true, compacto: false },
}

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
    const plano = maquetarA4({
      ...lista, opcionesImagen: { ...lista.opcionesImagen, formato: 'retratos' },
    }, roster, grupo)
    expect(plano.ancho).toBe(ANCHO_A4)
    expect(plano.alto).toBe(ALTO_A4)
    const fotos = plano.ordenes.filter((o) => o.tipo === 'imagen').map((o) => o.clave)
    expect(fotos).toContain('p3.jpg')
    expect(fotos).toContain('v1.jpg')
  })

  it('hereda el formato visual configurado en la lista', () => {
    const enFilas = maquetarA4(lista, ROSTER, grupo)
    const enGrilla = maquetarA4({
      ...lista, opcionesImagen: { ...lista.opcionesImagen, formato: 'grilla' },
    }, ROSTER, grupo)
    expect(enFilas.formato).toBe('filas')
    expect(enGrilla.formato).toBe('grilla')
    expect(enFilas.contenido.ancho).not.toBe(enGrilla.contenido.ancho)
  })

  it('usa el mismo plano que la imagen vertical para esa cancha', () => {
    const configurada = {
      ...lista,
      opcionesImagen: {
        ...lista.opcionesImagen,
        formato: 'retratos',
        esquinaVoluntario: 'superpuesto-abajo-derecha',
        tamanoVoluntario: 'enorme',
        asomoVoluntario: 'alto',
      },
    }
    const a4 = maquetarA4(configurada, ROSTER, grupo, medirFalso)
    const vertical = maquetar({ ...configurada, grupos: [grupo] }, ROSTER, {
      saludo: '', despedida: '', medirTexto: medirFalso,
      ajustesImpresion: a4.ajustesImpresion,
    })
    expect(a4.contenido).toEqual(vertical)
  })

  it('distribuye la cancha en columnas adecuadas para una hoja vertical', () => {
    expect(columnasParaA4(6)).toBe(3)
    expect(columnasParaA4(14)).toBe(4)
    expect(columnasParaA4(19)).toBe(5)
  })

  it('diferencia al voluntariado y limita su solapamiento en papel', () => {
    const plano = maquetarA4({
      ...lista, opcionesImagen: {
        ...lista.opcionesImagen,
        formato: 'retratos',
        esquinaVoluntario: 'superpuesto-abajo-derecha',
        asomoVoluntario: 'alto',
      },
    }, ROSTER, grupo)
    expect(plano.ajustesImpresion.asomoVoluntario).toBe('apenas')
    expect(plano.ajustesImpresion.colorVoluntario).toBe('#662D7D')
    expect(plano.ordenes.some((orden) =>
      orden.tipo === 'rect' && orden.fila === 'p1' && orden.color === '#662D7D')).toBe(true)
  })

  it('hereda la opción de ocultar fotos', () => {
    const sinFotos = maquetarA4({
      ...lista, opcionesImagen: { ...lista.opcionesImagen, fotos: false },
    }, ROSTER, grupo)
    expect(sinFotos.ordenes.filter((o) => o.tipo === 'imagen' && o.clave !== 'logo' && o.clave !== 'icono-pelota'))
      .toHaveLength(0)
  })

  it('genera un nombre específico por cancha', () => {
    expect(nombreDeArchivoA4(lista, grupo)).toBe('futbol-sin-barreras-2026-08-29-cancha-1-a4.png')
  })
})
