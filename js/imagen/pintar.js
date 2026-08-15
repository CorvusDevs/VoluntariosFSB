import { COLORES } from './tema.js'

// Los tipos de orden que este pintor sabe dibujar. Se exporta para que la prueba
// no tenga que repetirlos: la lista escrita a mano ya se quedo atras una vez.
export const TIPOS = Object.freeze(['rect', 'circulo', 'linea', 'texto', 'imagen', 'icono'])

// `recorte` pinta solo ese pedazo del plano, con el lienzo ya del tamaño justo.
// Existe para los bosquejos: antes pintaban la planilla entera en un lienzo
// aparte y despues copiaban un pedazo con drawImage. Ese rebote entre lienzos
// era el unico paso sin verificar entre "el plano esta bien", que se probo, y
// "el bosquejo se ve mal". Pintar derecho lo saca del medio y ademas evita
// construir un lienzo grande por cada opcion.
export function pintar(ctx, plano, imagenes = {}, densidad = 1, recorte = null, opacidadesImagenes = {}) {
  const marco = recorte ?? { x: 0, y: 0, ancho: plano.ancho, alto: plano.alto }
  ctx.canvas.width = Math.round(marco.ancho * densidad)
  ctx.canvas.height = Math.round(marco.alto * densidad)
  ctx.scale(densidad, densidad)
  ctx.translate(-marco.x, -marco.y)

  ctx.fillStyle = COLORES.fondo
  ctx.fillRect(marco.x, marco.y, marco.ancho, marco.alto)

  plano.ordenes.forEach((orden) => {
    switch (orden.tipo) {
      case 'rect': return rect(ctx, orden)
      case 'circulo': return circulo(ctx, orden)
      case 'linea': return linea(ctx, orden)
      case 'texto': return texto(ctx, orden)
      case 'imagen': return imagen(ctx, orden, imagenes, opacidadesImagenes[orden.clave])
      case 'icono': return icono(ctx, orden)
      default: throw new Error(`Orden de dibujo desconocida: ${orden.tipo}`)
    }
  })
}

function rect(ctx, o) {
  ctx.fillStyle = o.color
  if (o.radio) {
    ctx.beginPath()
    ctx.roundRect(o.x, o.y, o.ancho, o.alto, o.radio)
    ctx.fill()
  } else {
    ctx.fillRect(o.x, o.y, o.ancho, o.alto)
  }
}

function circulo(ctx, o) {
  ctx.fillStyle = o.color
  ctx.beginPath()
  ctx.arc(o.x, o.y, o.radio, 0, Math.PI * 2)
  ctx.fill()
}

function linea(ctx, o) {
  ctx.strokeStyle = o.color
  ctx.lineWidth = o.grosor ?? 1
  ctx.beginPath()
  ctx.moveTo(o.x1, o.y1)
  ctx.lineTo(o.x2, o.y2)
  ctx.stroke()
}

function texto(ctx, o) {
  ctx.font = o.fuente
  ctx.fillStyle = o.color
  ctx.textAlign = o.alineacion ?? 'left'
  ctx.textBaseline = o.lineaBase ?? 'alphabetic'
  ctx.fillText(o.texto, o.x, o.y)
}

// Los iconos van dibujados y no como archivo: son dos, viven en la banda de
// abajo y traerlos como imagen sumaria dos descargas y un estado de carga a algo
// que se resuelve con cuatro trazos.
const ICONOS = {
  // Un globo: circulo, ecuador y dos meridianos.
  globo(ctx, x, y, lado) {
    const r = lado / 2
    const cx = x + r
    const cy = y + r
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.moveTo(cx - r, cy)
    ctx.lineTo(cx + r, cy)
    ctx.moveTo(cx, cy - r)
    // Los meridianos son elipses vistas de canto: dan la vuelta al globo.
    ctx.ellipse(cx, cy, r * 0.45, r, 0, -Math.PI / 2, Math.PI * 1.5)
    ctx.moveTo(cx, cy - r)
    ctx.ellipse(cx, cy, r * 0.9, r, 0, -Math.PI / 2, Math.PI * 1.5)
    ctx.stroke()
  },
  // Camara de Instagram: marco redondeado, lente y punto del flash.
  instagram(ctx, x, y, lado) {
    const r = lado * 0.28
    ctx.beginPath()
    ctx.roundRect(x, y, lado, lado, r)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x + lado / 2, y + lado / 2, lado * 0.24, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x + lado * 0.76, y + lado * 0.24, Math.max(1, lado * 0.055), 0, Math.PI * 2)
    ctx.fillStyle = ctx.strokeStyle
    ctx.fill()
  },
}

function icono(ctx, o) {
  const dibujar = ICONOS[o.nombre]
  if (!dibujar) return
  ctx.save()
  ctx.strokeStyle = o.color
  ctx.lineWidth = o.grosor ?? Math.max(1, o.lado * 0.075)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  dibujar(ctx, o.x, o.y, o.lado)
  ctx.restore()
}

function imagen(ctx, o, imagenes, opacidad = 1) {
  const fuente = imagenes[o.clave]
  if (!fuente || opacidad <= 0) return
  ctx.save()
  try {
    ctx.globalAlpha = Math.min(1, opacidad)
    // El recorte lo hace SIEMPRE un clip, y la imagen se dibuja entera y
    // agrandada hasta tapar el hueco. Antes se recortaba con el rectangulo de
    // origen de drawImage, su forma de nueve argumentos: en Safari esa forma no
    // dibujaba nada con el medallon chico, aunque el mismo codigo funcionara con
    // el grande y en otros navegadores. Esta version usa la de cinco argumentos,
    // que es otro camino adentro del motor, y ademas es mas simple: una sola
    // cuenta de escala en vez de cuatro coordenadas de origen.
    ctx.beginPath()
    if (o.circular) {
      ctx.arc(o.x + o.ancho / 2, o.y + o.alto / 2, o.ancho / 2, 0, Math.PI * 2)
    } else if (o.radio) {
      ctx.roundRect(o.x, o.y, o.ancho, o.alto, o.radio)
    } else {
      ctx.rect(o.x, o.y, o.ancho, o.alto)
    }
    ctx.closePath()
    ctx.clip()

    const anchoOrigen = fuente.naturalWidth ?? fuente.width ?? 0
    const altoOrigen = fuente.naturalHeight ?? fuente.height ?? 0
    if (anchoOrigen > 0 && altoOrigen > 0) {
      // Cubrir sin deformar: la foto guardada es cuadrada y el hueco puede no
      // serlo, asi que se agranda hasta taparlo y lo que sobra queda fuera del clip.
      const escala = Math.max(o.ancho / anchoOrigen, o.alto / altoOrigen)
      const ancho = anchoOrigen * escala
      const alto = altoOrigen * escala
      ctx.drawImage(fuente, o.x - (ancho - o.ancho) / 2, o.y - (alto - o.alto) / 2, ancho, alto)
    } else {
      ctx.drawImage(fuente, o.x, o.y, o.ancho, o.alto)
    }
  } finally {
    ctx.restore()
  }
}
