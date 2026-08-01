import { describe, it, expect } from 'vitest'
import { pintar } from '../../js/imagen/pintar.js'
import { maquetar } from '../../js/imagen/maquetar.js'
import { ROSTER, LISTA, SALUDO, DESPEDIDA, medirFalso } from '../ayudas/datos.js'

function contextoFalso() {
  const llamadas = []
  const registrar = (nombre) => (...args) => llamadas.push({ nombre, args })
  return {
    llamadas,
    canvas: { width: 0, height: 0 },
    save: registrar('save'),
    restore: registrar('restore'),
    beginPath: registrar('beginPath'),
    closePath: registrar('closePath'),
    fill: registrar('fill'),
    stroke: registrar('stroke'),
    clip: registrar('clip'),
    arc: registrar('arc'),
    moveTo: registrar('moveTo'),
    lineTo: registrar('lineTo'),
    fillRect: registrar('fillRect'),
    fillText: registrar('fillText'),
    drawImage: registrar('drawImage'),
    roundRect: registrar('roundRect'),
    scale: registrar('scale'),
    set fillStyle(v) { llamadas.push({ nombre: 'fillStyle', args: [v] }) },
    set strokeStyle(v) { llamadas.push({ nombre: 'strokeStyle', args: [v] }) },
    set font(v) { llamadas.push({ nombre: 'font', args: [v] }) },
    set textAlign(v) { llamadas.push({ nombre: 'textAlign', args: [v] }) },
    set textBaseline(v) { llamadas.push({ nombre: 'textBaseline', args: [v] }) },
    set lineWidth(v) { llamadas.push({ nombre: 'lineWidth', args: [v] }) },
  }
}

const plano = (ordenes) => ({ ancho: 100, alto: 50, ordenes })

describe('pintar', () => {
  it('dibuja el fondo blanco antes que nada', () => {
    const ctx = contextoFalso()
    pintar(ctx, plano([]), {}, 1)
    const primerRelleno = ctx.llamadas.findIndex((l) => l.nombre === 'fillRect')
    expect(primerRelleno).toBeGreaterThanOrEqual(0)
    expect(ctx.llamadas[primerRelleno].args).toEqual([0, 0, 100, 50])
  })

  it('respeta el orden de las ordenes', () => {
    const ctx = contextoFalso()
    pintar(ctx, plano([
      { tipo: 'texto', texto: 'primero', x: 0, y: 0, fuente: '10px X', color: '#000' },
      { tipo: 'texto', texto: 'segundo', x: 0, y: 0, fuente: '10px X', color: '#000' },
    ]), {}, 1)
    const textos = ctx.llamadas.filter((l) => l.nombre === 'fillText').map((l) => l.args[0])
    expect(textos).toEqual(['primero', 'segundo'])
  })

  it('aplica alineacion y linea base por defecto', () => {
    const ctx = contextoFalso()
    pintar(ctx, plano([{ tipo: 'texto', texto: 'a', x: 5, y: 6, fuente: '10px X', color: '#000' }]), {}, 1)
    expect(ctx.llamadas).toContainEqual({ nombre: 'textAlign', args: ['left'] })
    expect(ctx.llamadas).toContainEqual({ nombre: 'textBaseline', args: ['alphabetic'] })
  })

  it('escala el lienzo por el factor de densidad', () => {
    const ctx = contextoFalso()
    pintar(ctx, plano([]), {}, 2)
    expect(ctx.canvas.width).toBe(200)
    expect(ctx.canvas.height).toBe(100)
    expect(ctx.llamadas).toContainEqual({ nombre: 'scale', args: [2, 2] })
  })

  it('recorta en circulo las imagenes circulares', () => {
    const ctx = contextoFalso()
    const img = { ancho: 10 }
    pintar(ctx, plano([
      { tipo: 'imagen', clave: 'f.jpg', x: 0, y: 0, ancho: 10, alto: 10, circular: true },
    ]), { 'f.jpg': img }, 1)
    expect(ctx.llamadas.some((l) => l.nombre === 'clip')).toBe(true)
    expect(ctx.llamadas.some((l) => l.nombre === 'drawImage')).toBe(true)
  })

  it('recorta en rectangulo redondeado cuando la orden trae radio', () => {
    const ctx = contextoFalso()
    pintar(ctx, plano([
      { tipo: 'imagen', clave: 'f.jpg', x: 0, y: 0, ancho: 30, alto: 40, radio: 8 },
    ]), { 'f.jpg': {} }, 1)
    const redondeado = ctx.llamadas.find((l) => l.nombre === 'roundRect')
    expect(redondeado).toBeTruthy()
    expect(redondeado.args).toEqual([0, 0, 30, 40, 8])
    expect(ctx.llamadas.some((l) => l.nombre === 'clip')).toBe(true)
    expect(ctx.llamadas.some((l) => l.nombre === 'arc')).toBe(false)
  })

  it('una imagen sin radio ni circular se dibuja sin recorte', () => {
    const ctx = contextoFalso()
    pintar(ctx, plano([
      { tipo: 'imagen', clave: 'f.jpg', x: 0, y: 0, ancho: 30, alto: 40 },
    ]), { 'f.jpg': {} }, 1)
    expect(ctx.llamadas.some((l) => l.nombre === 'clip')).toBe(false)
    expect(ctx.llamadas.some((l) => l.nombre === 'drawImage')).toBe(true)
  })

  it('omite en silencio una imagen que no se pudo cargar', () => {
    const ctx = contextoFalso()
    expect(() => pintar(ctx, plano([
      { tipo: 'imagen', clave: 'falta.jpg', x: 0, y: 0, ancho: 10, alto: 10 },
    ]), {}, 1)).not.toThrow()
    expect(ctx.llamadas.some((l) => l.nombre === 'drawImage')).toBe(false)
  })

  it('falla con mensaje claro ante un tipo de orden desconocido', () => {
    const ctx = contextoFalso()
    expect(() => pintar(ctx, plano([{ tipo: 'holograma' }]), {}, 1)).toThrow(/holograma/)
  })

  it('restaura el contexto aunque drawImage falle', () => {
    const ctx = contextoFalso()
    ctx.drawImage = () => { throw new Error('imagen rota') }
    expect(() => pintar(ctx, plano([
      { tipo: 'imagen', clave: 'f.jpg', x: 0, y: 0, ancho: 10, alto: 10, circular: true },
    ]), { 'f.jpg': {} }, 1)).toThrow('imagen rota')
    expect(ctx.llamadas.some((l) => l.nombre === 'restore')).toBe(true)
  })

  it('pinta un plano real de maquetar sin tirar excepciones, y maneja todos los tipos de orden que emite', () => {
    const opciones = { saludo: SALUDO, despedida: DESPEDIDA, medirTexto: medirFalso }
    const planoReal = maquetar(LISTA, ROSTER, opciones)
    const ctx = contextoFalso()
    const imagenes = { logo: {}, 'p3.jpg': {} }

    expect(() => pintar(ctx, planoReal, imagenes, 1)).not.toThrow()

    const tiposEmitidos = new Set(planoReal.ordenes.map((o) => o.tipo))
    const tiposManejados = new Set(['rect', 'circulo', 'linea', 'texto', 'imagen'])
    tiposEmitidos.forEach((t) => expect(tiposManejados.has(t)).toBe(true))

    const cantidadTextosEnPlano = planoReal.ordenes.filter((o) => o.tipo === 'texto').length
    const cantidadFillText = ctx.llamadas.filter((l) => l.nombre === 'fillText').length
    expect(cantidadFillText).toBe(cantidadTextosEnPlano)
  })
})
