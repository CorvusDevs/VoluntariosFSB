import { describe, it, expect } from 'vitest'
import { pintar, TIPOS } from '../../js/imagen/pintar.js'
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
    ellipse: registrar('ellipse'),
    rect: registrar('rect'),
    scale: registrar('scale'),
    translate: registrar('translate'),
    set fillStyle(v) { llamadas.push({ nombre: 'fillStyle', args: [v] }) },
    set strokeStyle(v) { llamadas.push({ nombre: 'strokeStyle', args: [v] }) },
    get strokeStyle() { return '#000' },
    set lineJoin(v) { llamadas.push({ nombre: 'lineJoin', args: [v] }) },
    set lineCap(v) { llamadas.push({ nombre: 'lineCap', args: [v] }) },
    set font(v) { llamadas.push({ nombre: 'font', args: [v] }) },
    set textAlign(v) { llamadas.push({ nombre: 'textAlign', args: [v] }) },
    set textBaseline(v) { llamadas.push({ nombre: 'textBaseline', args: [v] }) },
    set lineWidth(v) { llamadas.push({ nombre: 'lineWidth', args: [v] }) },
    set globalAlpha(v) { llamadas.push({ nombre: 'globalAlpha', args: [v] }) },
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

  it('puede fundir una foto sin afectar el resto del plano', () => {
    const ctx = contextoFalso()
    pintar(ctx, plano([
      { tipo: 'texto', texto: 'Fútbol sin Barreras', x: 5, y: 6, fuente: '10px X', color: '#000' },
      { tipo: 'imagen', clave: 'f.jpg', x: 0, y: 0, ancho: 10, alto: 10 },
    ]), { 'f.jpg': { width: 10, height: 10 } }, 1, null, { 'f.jpg': 0.4 })
    expect(ctx.llamadas).toContainEqual({ nombre: 'globalAlpha', args: [0.4] })
    expect(ctx.llamadas.some((l) => l.nombre === 'fillText')).toBe(true)
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

  it('una imagen sin esquinas redondeadas igual se recorta, con un clip recto', () => {
    // El recorte lo hace siempre el clip: la imagen se dibuja agrandada para
    // tapar el hueco, asi que sin clip se derramaria sobre lo de al lado.
    const ctx = contextoFalso()
    pintar(ctx, plano([
      { tipo: 'imagen', clave: 'f.jpg', x: 0, y: 0, ancho: 30, alto: 40 },
    ]), { 'f.jpg': {} }, 1)
    expect(ctx.llamadas.some((l) => l.nombre === 'clip')).toBe(true)
    expect(ctx.llamadas.some((l) => l.nombre === 'rect')).toBe(true)
    expect(ctx.llamadas.some((l) => l.nombre === 'drawImage')).toBe(true)
  })

  it('recorta la foto en vez de estirarla cuando las proporciones no coinciden', () => {
    const ctx = contextoFalso()
    // Foto cuadrada de 400 en una celda vertical de 180 por 240.
    pintar(ctx, plano([
      { tipo: 'imagen', clave: 'f.jpg', x: 0, y: 0, ancho: 180, alto: 240, radio: 16 },
    ]), { 'f.jpg': { naturalWidth: 400, naturalHeight: 400 } }, 1)
    const [, x, y, ancho, alto] = ctx.llamadas.find((l) => l.nombre === 'drawImage').args
    // Cubre el hueco sin deformar: la cuadrada crece hasta el alto de la celda
    // y lo que sobra a los costados queda fuera del clip.
    expect(alto).toBeCloseTo(240, 0)
    expect(ancho).toBeCloseTo(240, 0)
    expect(ancho / alto).toBeCloseTo(400 / 400, 5)
    // Y queda centrada en el hueco, no pegada a un costado.
    expect(x + ancho / 2).toBeCloseTo(90, 5)
    expect(y + alto / 2).toBeCloseTo(120, 5)
  })

  it('una foto ya proporcionada llena el hueco justo, sin sobrar', () => {
    const ctx = contextoFalso()
    pintar(ctx, plano([
      { tipo: 'imagen', clave: 'f.jpg', x: 0, y: 0, ancho: 180, alto: 240 },
    ]), { 'f.jpg': { naturalWidth: 300, naturalHeight: 400 } }, 1)
    const [, x, y, ancho, alto] = ctx.llamadas.find((l) => l.nombre === 'drawImage').args
    expect([x, y, ancho, alto]).toEqual([0, 0, 180, 240])
  })

  it('sin dimensiones conocidas cae en el dibujo simple', () => {
    const ctx = contextoFalso()
    pintar(ctx, plano([
      { tipo: 'imagen', clave: 'f.jpg', x: 0, y: 0, ancho: 10, alto: 10 },
    ]), { 'f.jpg': {} }, 1)
    expect(ctx.llamadas.find((l) => l.nombre === 'drawImage').args).toHaveLength(5)
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
    // Sale del propio pintor: escrita a mano, esta lista se quedo atras cuando
    // aparecio un tipo nuevo y la prueba fallaba por el motivo equivocado.
    const tiposManejados = new Set(TIPOS)
    tiposEmitidos.forEach((t) => expect(tiposManejados.has(t)).toBe(true))

    const cantidadTextosEnPlano = planoReal.ordenes.filter((o) => o.tipo === 'texto').length
    const cantidadFillText = ctx.llamadas.filter((l) => l.nombre === 'fillText').length
    expect(cantidadFillText).toBe(cantidadTextosEnPlano)
  })
})

describe('recorte de origen de las fotos', () => {
  it('dibuja sin rectangulo de origen y recorta con clip', () => {
    const ctx = contextoFalso()
    const fuente = { width: 400, height: 400 }
    // Medidas reales del medallon en el tamaño Mediano, que es donde se reporto.
    const plano = { ancho: 200, alto: 200, ordenes: [
      { tipo: 'imagen', clave: 'f', x: 10, y: 20, ancho: 88, alto: 114, radio: 17 },
    ] }
    pintar(ctx, plano, { f: fuente }, 1)
    const dibujo = ctx.llamadas.find((l) => l.nombre === 'drawImage')
    // Cinco argumentos, no nueve: el recorte lo hace el clip. En Safari la forma
    // de nueve no dibujaba nada con el medallon chico.
    expect(dibujo.args).toHaveLength(5)
    const [, x, y, ancho, alto] = dibujo.args
    // La imagen se agranda hasta tapar el hueco y queda centrada en el.
    // Coma flotante: 114 puede salir 113.9999..., asi que se compara con holgura.
    expect(ancho).toBeGreaterThan(87.9)
    expect(alto).toBeGreaterThan(113.9)
    expect(x + ancho / 2).toBeCloseTo(10 + 88 / 2, 5)
    expect(y + alto / 2).toBeCloseTo(20 + 114 / 2, 5)
    // Y se recorta con un clip, siempre.
    expect(ctx.llamadas.some((l) => l.nombre === 'clip')).toBe(true)
  })

  it('recorta con clip tambien cuando la orden no pide esquinas redondeadas', () => {
    const ctx = contextoFalso()
    const plano = { ancho: 200, alto: 200, ordenes: [
      { tipo: 'imagen', clave: 'f', x: 0, y: 0, ancho: 50, alto: 50 },
    ] }
    pintar(ctx, plano, { f: { width: 400, height: 400 } }, 1)
    expect(ctx.llamadas.some((l) => l.nombre === 'clip')).toBe(true)
  })
})
