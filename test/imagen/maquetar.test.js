import { describe, it, expect } from 'vitest'
import { maquetar } from '../../js/imagen/maquetar.js'
import { ANCHO, COLORES } from '../../js/imagen/tema.js'
import { ROSTER, LISTA, SALUDO, DESPEDIDA, medirFalso } from '../ayudas/datos.js'

const opciones = { saludo: SALUDO, despedida: DESPEDIDA, medirTexto: medirFalso }

function textos(plano) {
  return plano.ordenes.filter((o) => o.tipo === 'texto').map((o) => o.texto)
}

describe('maquetar', () => {
  it('devuelve el ancho fijo de 1080 y un alto positivo', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    expect(plano.ancho).toBe(ANCHO)
    expect(plano.alto).toBeGreaterThan(0)
  })

  it('escribe el titulo del programa y la fecha en español', () => {
    const t = textos(maquetar(LISTA, ROSTER, opciones))
    expect(t).toContain('Fútbol sin Barreras')
    expect(t.some((x) => x.includes('Sábado 8 de agosto'))).toBe(true)
    expect(t.some((x) => x.includes('11:00'))).toBe(true)
    expect(t.some((x) => x.includes('Tres Cruces'))).toBe(true)
  })

  it('escribe los titulos y las canchas de los dos grupos', () => {
    const t = textos(maquetar(LISTA, ROSTER, opciones))
    expect(t).toContain('Grupo 1 · 5 a 9 años')
    expect(t).toContain('Cancha 1')
    expect(t).toContain('Grupo 2 · 10 a 17 años')
    expect(t).toContain('Cancha 2')
  })

  it('escribe cada participante y su voluntario', () => {
    const t = textos(maquetar(LISTA, ROSTER, opciones))
    expect(t).toContain('Gonzalo')
    expect(t).toContain('Abi')
  })

  it('un participante sin voluntario se dibuja sin separador', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    const fila = plano.ordenes.filter((o) => o.fila === 'p2')
    expect(fila.some((o) => o.tipo === 'texto' && o.texto === 'Sofi')).toBe(true)
    expect(fila.some((o) => o.tipo === 'texto' && o.texto === '-')).toBe(false)
  })

  it('dos voluntarios para un participante se separan con barra', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    const fila = plano.ordenes.filter((o) => o.fila === 'p4')
    const t = fila.filter((o) => o.tipo === 'texto').map((o) => o.texto)
    expect(t).toContain('Cris')
    expect(t).toContain('/')
    expect(t).toContain('Francisco')
  })

  it('usa guion simple como separador, nunca raya', () => {
    const t = textos(maquetar(LISTA, ROSTER, opciones)).join(' ')
    expect(t).toContain('-')
    expect(t).not.toMatch(/(—|–|―)/)
  })

  it('marca al voluntario nuevo con una pastilla', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    const t = textos(plano)
    expect(t).toContain('nuevo')
  })

  it('dibuja la linea de apoyo del grupo 2', () => {
    const t = textos(maquetar(LISTA, ROSTER, opciones))
    expect(t).toContain('Apoyo G2')
    expect(t).toContain('Majo')
  })

  it('incluye saludo y despedida cuando estan activados', () => {
    const t = textos(maquetar(LISTA, ROSTER, opciones)).join(' ')
    expect(t).toContain('Les compartimos las asignaciones')
    expect(t).toContain('Nos vemos mañana')
  })

  it('los omite cuando estan desactivados y la imagen queda mas baja', () => {
    const sin = { ...LISTA, opcionesImagen: { ...LISTA.opcionesImagen, saludo: false, despedida: false } }
    const planoSin = maquetar(sin, ROSTER, opciones)
    const planoCon = maquetar(LISTA, ROSTER, opciones)
    expect(textos(planoSin).join(' ')).not.toContain('Nos vemos mañana')
    expect(planoSin.alto).toBeLessThan(planoCon.alto)
  })

  it('ninguna orden se sale del lienzo', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    plano.ordenes.forEach((o) => {
      expect(o.x ?? 0).toBeGreaterThanOrEqual(0)
      expect((o.x ?? 0) + (o.ancho ?? 0)).toBeLessThanOrEqual(ANCHO)
      expect(o.y ?? 0).toBeGreaterThanOrEqual(0)
      expect((o.y ?? 0) + (o.alto ?? 0)).toBeLessThanOrEqual(plano.alto)
    })
  })

  it('pide la foto solo de quien tiene foto', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    const imagenes = plano.ordenes.filter((o) => o.tipo === 'imagen')
    expect(imagenes.map((o) => o.clave)).toContain('p3.jpg')
    expect(imagenes.map((o) => o.clave)).not.toContain(null)
  })

  it('dibuja iniciales cuando no hay foto', () => {
    const t = textos(maquetar(LISTA, ROSTER, opciones))
    expect(t).toContain('GO')
  })

  it('el circulo de iniciales toma el color de su grupo', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    const circuloDe = (id) => plano.ordenes.find((o) => o.tipo === 'circulo' && o.fila === id)
    expect(circuloDe('p1').color).toBe(COLORES.turquesaTenue)
    expect(circuloDe('p4').color).toBe(COLORES.magentaTenue)
  })

  it('el modo compacto es mas bajo y no pide fotos de personas', () => {
    const comp = { ...LISTA, opcionesImagen: { ...LISTA.opcionesImagen, compacto: true } }
    const planoComp = maquetar(comp, ROSTER, opciones)
    const planoNormal = maquetar(LISTA, ROSTER, opciones)
    expect(planoComp.alto).toBeLessThan(planoNormal.alto)
    const fotos = planoComp.ordenes.filter((o) => o.tipo === 'imagen' && o.clave !== 'logo')
    expect(fotos).toHaveLength(0)
    expect(planoComp.ordenes.some((o) => o.tipo === 'imagen' && o.clave === 'logo')).toBe(true)
  })

  it('informa la relacion de aspecto y si WhatsApp la recortaria', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    expect(plano.relacion).toBeCloseTo(plano.alto / plano.ancho, 5)
    expect(plano.recorteProbable).toBe(plano.relacion > 2.5)
  })

  it('un participante inactivo que no esta en ninguna fila no aparece', () => {
    const t = textos(maquetar(LISTA, ROSTER, opciones))
    expect(t).not.toContain('Ezequiel')
  })

  it('falla con mensaje claro si una fila referencia un id inexistente', () => {
    const rota = structuredClone(LISTA)
    rota.grupos[0].filas.push({ participantes: ['p999'], voluntarios: [] })
    expect(() => maquetar(rota, ROSTER, opciones)).toThrow(/p999/)
  })
})
