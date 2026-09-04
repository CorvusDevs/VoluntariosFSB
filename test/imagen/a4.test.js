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
    expect(enFilas.contenido.ordenes).not.toEqual(enGrilla.contenido.ordenes)
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
    expect(columnasParaA4(8)).toBe(4)
    expect(columnasParaA4(14)).toBe(5)
    expect(columnasParaA4(15)).toBe(6)
    expect(columnasParaA4(19)).toBe(6)
  })

  it('diferencia al voluntariado dentro de bandejas compartidas', () => {
    const plano = maquetarA4({
      ...lista, opcionesImagen: {
        ...lista.opcionesImagen,
        formato: 'retratos',
        esquinaVoluntario: 'superpuesto-abajo-derecha',
        asomoVoluntario: 'alto',
      },
    }, ROSTER, grupo)
    expect(plano.ajustesImpresion.asomoVoluntario).toBe('alto')
    expect(plano.ajustesImpresion.colorVoluntario).toBe('#662D7D')
    expect(plano.ajustesImpresion.bandejaVoluntariosCompartida).toBe(true)
    expect(plano.ordenes.some((orden) =>
      orden.tipo === 'rect' && String(orden.fila).startsWith('referentes-')
      && orden.color === '#662D7D')).toBe(true)
  })

  it('ubica varios voluntarios en una bandeja sin cubrir la foto participante', () => {
    const roster = structuredClone(ROSTER)
    roster.participantes.find((p) => p.id === 'p2').foto = 'p2.jpg'
    roster.voluntarios.find((v) => v.id === 'v2').foto = 'v2.jpg'
    roster.voluntarios.find((v) => v.id === 'v3').foto = 'v3.jpg'
    const plano = maquetarA4({
      ...lista, opcionesImagen: {
        ...lista.opcionesImagen,
        formato: 'retratos',
        esquinaVoluntario: 'superpuesto-abajo-derecha',
      },
    }, roster, grupo, medirFalso)
    const participante = plano.ordenes.find((o) => o.tipo === 'imagen' && o.clave === 'p2.jpg')
    const voluntarios = plano.ordenes.filter((o) =>
      o.tipo === 'imagen' && ['v2.jpg', 'v3.jpg'].includes(o.clave))
    expect(voluntarios).toHaveLength(2)
    expect(voluntarios.every((o) => o.y >= participante.y + participante.alto)).toBe(true)
    expect(plano.contenido.ancho).toBe(ANCHO_A4)
    expect(plano.x).toBeGreaterThanOrEqual(0)
  })

  it('también separa de la foto al voluntario único y aprovecha el alto para su retrato', () => {
    const roster = structuredClone(ROSTER)
    roster.participantes.find((p) => p.id === 'p1').foto = 'p1.jpg'
    roster.voluntarios.find((v) => v.id === 'v1').foto = 'v1.jpg'
    const plano = maquetarA4({
      ...lista, opcionesImagen: {
        ...lista.opcionesImagen,
        formato: 'retratos',
        esquinaVoluntario: 'superpuesto-abajo-derecha',
      },
    }, roster, grupo, medirFalso)
    const participante = plano.ordenes.find((o) => o.tipo === 'imagen' && o.clave === 'p1.jpg')
    const voluntario = plano.ordenes.find((o) => o.tipo === 'imagen' && o.clave === 'v1.jpg')
    expect(voluntario.y).toBeGreaterThanOrEqual(participante.y + participante.alto)
    expect(voluntario.alto).toBeGreaterThan(voluntario.ancho * 1.25)
    expect(plano.ordenes.some((o) => o.tipo === 'texto' && o.fila === 'p1'
      && /^Acompaña/.test(o.texto))).toBe(false)
  })

  it('conserva una bandeja vacía para quien no tiene acompañante', () => {
    const plano = maquetarA4({
      ...lista, opcionesImagen: { ...lista.opcionesImagen, formato: 'retratos' },
    }, ROSTER, grupo, medirFalso)
    expect(plano.ordenes.some((o) => o.fila === 'p4'
      && o.tipo === 'texto' && /^Acompaña/.test(o.texto))).toBe(false)
    expect(plano.ordenes.some((o) => o.fila === 'p4'
      && o.tipo === 'texto' && /sin acompañante/i.test(o.texto))).toBe(false)
    expect(plano.ordenes.some((o) => String(o.fila).includes('sin-referente')
      && o.tipo === 'rect' && o.color === '#F3E9F7')).toBe(true)
  })

  it('usa la misma proporción de retrato con uno o dos acompañantes', () => {
    const roster = structuredClone(ROSTER)
    roster.voluntarios.find((v) => v.id === 'v1').foto = 'v1.jpg'
    roster.voluntarios.find((v) => v.id === 'v2').foto = 'v2.jpg'
    roster.voluntarios.find((v) => v.id === 'v3').foto = 'v3.jpg'
    const plano = maquetarA4({
      ...lista, opcionesImagen: { ...lista.opcionesImagen, formato: 'retratos' },
    }, roster, grupo, medirFalso)
    const uno = plano.ordenes.find((o) => o.tipo === 'imagen' && o.clave === 'v1.jpg')
    const dos = plano.ordenes.find((o) => o.tipo === 'imagen' && o.clave === 'v2.jpg')
    expect(uno.ancho).toBe(dos.ancho)
    expect(uno.alto).toBe(dos.alto)
  })

  it('acorta con elipsis un nombre que no cabe en el retrato', () => {
    const roster = structuredClone(ROSTER)
    roster.voluntarios.find((v) => v.id === 'v1').nombre = 'NombreExtraordinariamenteExtensoQueNoPuedeEntrarCompleto'
    const plano = maquetarA4({
      ...lista, opcionesImagen: { ...lista.opcionesImagen, formato: 'retratos' },
    }, roster, grupo, medirFalso)
    const etiqueta = plano.ordenes.find((o) => o.tipo === 'texto'
      && String(o.fila).startsWith('referentes-') && o.texto.endsWith('…'))
    expect(etiqueta).toBeTruthy()
  })

  it('aprovecha al menos el 95 por ciento del ancho A4 con catorce participantes', () => {
    const participantes = Array.from({ length: 14 }, (_, i) => ({
      id: `px${i}`, nombre: `Persona ${i}`, grupo: 1, foto: `px${i}.jpg`, activo: true, notas: '',
    }))
    const filas = Array.from({ length: 14 }, (_, i) => ({
      participantes: [`px${i}`],
      voluntarios: i % 3 === 0 ? ['v2', 'v3'] : ['v1'],
    }))
    const roster = { ...ROSTER, participantes }
    const plano = maquetarA4({
      ...lista, opcionesImagen: {
        ...lista.opcionesImagen,
        formato: 'retratos',
        esquinaVoluntario: 'superpuesto-abajo-derecha',
      },
    }, roster, { ...grupo, filas }, medirFalso)
    expect(plano.ajustesImpresion.columnasPorFila).toBeGreaterThanOrEqual(5)
    expect(plano.contenido.ancho).toBe(ANCHO_A4)
    expect(plano.contenido.ancho * plano.escala).toBeGreaterThanOrEqual(ANCHO_A4 * 0.95)
    expect(plano.x).toBeLessThanOrEqual(ANCHO_A4 * 0.025)
  })

  it('alinea simétricamente las bandas de cancha y apoyo con la grilla', () => {
    const participantes = Array.from({ length: 14 }, (_, i) => ({
      id: `px${i}`, nombre: `Persona ${i}`, grupo: 1, foto: `px${i}.jpg`, activo: true, notas: '',
    }))
    const filas = Array.from({ length: 14 }, (_, i) => ({
      participantes: [`px${i}`],
      voluntarios: ['v1'],
    }))
    const roster = { ...ROSTER, participantes }
    const plano = maquetarA4({
      ...lista, opcionesImagen: {
        ...lista.opcionesImagen,
        formato: 'retratos',
        esquinaVoluntario: 'superpuesto-abajo-derecha',
      },
    }, roster, { ...grupo, filas }, medirFalso)
    const bandas = plano.ordenes.filter((o) => o.tipo === 'rect'
      && o.x === 56 && o.ancho === ANCHO_A4 - 112)
    expect(bandas.length).toBeGreaterThanOrEqual(2)
    const fotos = plano.ordenes.filter((o) => o.tipo === 'imagen' && /^px\d/.test(o.clave))
    expect(Math.min(...fotos.map((o) => o.x))).toBe(56)
    expect(Math.abs(Math.max(...fotos.map((o) => o.x + o.ancho)) - (ANCHO_A4 - 56))).toBeLessThanOrEqual(4)
  })

  it('ancla el pie abajo y ocupa todo el alto A4 con un grupo pequeño', () => {
    const participantes = Array.from({ length: 7 }, (_, i) => ({
      id: `pe${i}`, nombre: `Persona ${i}`, grupo: 1, foto: `pe${i}.jpg`, activo: true, notas: '',
    }))
    const filas = participantes.map((p) => ({ participantes: [p.id], voluntarios: [] }))
    const plano = maquetarA4({
      ...lista, opcionesImagen: { ...lista.opcionesImagen, formato: 'retratos' },
    }, { ...ROSTER, participantes }, { ...grupo, filas, apoyo: [] }, medirFalso)
    const pie = plano.ordenes.filter((o) => o.tipo === 'rect' && o.x === 0
      && o.ancho === ANCHO_A4 && o.color === '#662D7D').at(-1)
    expect(plano.alto).toBe(ALTO_A4)
    expect((pie.y + pie.alto) * plano.escala).toBeCloseTo(ALTO_A4, 5)
  })

  it('centra como bloque la última fila incompleta', () => {
    const participantes = Array.from({ length: 7 }, (_, i) => ({
      id: `pc${i}`, nombre: `Persona ${i}`, grupo: 1, foto: `pc${i}.jpg`, activo: true, notas: '',
    }))
    const filas = participantes.map((p) => ({ participantes: [p.id], voluntarios: [] }))
    const plano = maquetarA4({
      ...lista, opcionesImagen: { ...lista.opcionesImagen, formato: 'retratos' },
    }, { ...ROSTER, participantes }, { ...grupo, filas, apoyo: [] }, medirFalso)
    const fotos = plano.ordenes.filter((o) => o.tipo === 'imagen' && /^pc\d/.test(o.clave))
    const ultimoY = Math.max(...fotos.map((o) => o.y))
    const ultima = fotos.filter((o) => o.y === ultimoY).sort((a, b) => a.x - b.x)
    const margenIzquierdo = ultima[0].x
    const margenDerecho = ANCHO_A4 - (ultima.at(-1).x + ultima.at(-1).ancho)
    expect(ultima).toHaveLength(3)
    expect(Math.abs(margenIzquierdo - margenDerecho)).toBeLessThanOrEqual(1)
    expect(ultima[1].x - (ultima[0].x + ultima[0].ancho)).toBeLessThan(40)
  })

  it('comparte un referente y lo centra entre sus participantes', () => {
    const roster = structuredClone(ROSTER)
    roster.participantes.find((p) => p.id === 'p1').foto = 'p1.jpg'
    roster.participantes.find((p) => p.id === 'p2').foto = 'p2.jpg'
    roster.voluntarios.find((v) => v.id === 'v1').foto = 'v1.jpg'
    const filas = [
      { participantes: ['p1'], voluntarios: ['v1'] },
      { participantes: ['p2'], voluntarios: ['v1'] },
    ]
    const plano = maquetarA4({
      ...lista, opcionesImagen: { ...lista.opcionesImagen, formato: 'retratos' },
    }, roster, { ...grupo, filas, apoyo: [] }, medirFalso)
    const participantes = plano.ordenes.filter((o) => o.tipo === 'imagen' && ['p1.jpg', 'p2.jpg'].includes(o.clave))
    const referentes = plano.ordenes.filter((o) => o.tipo === 'imagen' && o.clave === 'v1.jpg')
    const centroParticipantes = (Math.min(...participantes.map((o) => o.x))
      + Math.max(...participantes.map((o) => o.x + o.ancho))) / 2
    const centroReferente = referentes[0].x + referentes[0].ancho / 2
    expect(referentes).toHaveLength(1)
    expect(Math.abs(centroParticipantes - centroReferente)).toBeLessThanOrEqual(1)
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
