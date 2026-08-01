import { COLORES } from './tema.js'

export function pintar(ctx, plano, imagenes = {}, densidad = 1) {
  ctx.canvas.width = plano.ancho * densidad
  ctx.canvas.height = plano.alto * densidad
  ctx.scale(densidad, densidad)

  ctx.fillStyle = COLORES.fondo
  ctx.fillRect(0, 0, plano.ancho, plano.alto)

  plano.ordenes.forEach((orden) => {
    switch (orden.tipo) {
      case 'rect': return rect(ctx, orden)
      case 'circulo': return circulo(ctx, orden)
      case 'linea': return linea(ctx, orden)
      case 'texto': return texto(ctx, orden)
      case 'imagen': return imagen(ctx, orden, imagenes)
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

function imagen(ctx, o, imagenes) {
  const fuente = imagenes[o.clave]
  if (!fuente) return
  ctx.save()
  try {
    if (o.circular) {
      ctx.beginPath()
      ctx.arc(o.x + o.ancho / 2, o.y + o.alto / 2, o.ancho / 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
    } else if (o.radio) {
      // Foto rectangular con esquinas redondeadas, para la grilla.
      ctx.beginPath()
      ctx.roundRect(o.x, o.y, o.ancho, o.alto, o.radio)
      ctx.closePath()
      ctx.clip()
    }
    // Recorte que cubre: la foto guardada es cuadrada y la celda puede no serlo,
    // asi que en vez de estirarla se toma la porcion centrada que llena el hueco.
    const anchoOrigen = fuente.naturalWidth ?? fuente.width ?? 0
    const altoOrigen = fuente.naturalHeight ?? fuente.height ?? 0
    if (anchoOrigen > 0 && altoOrigen > 0) {
      const escala = Math.max(o.ancho / anchoOrigen, o.alto / altoOrigen)
      const recorteAncho = o.ancho / escala
      const recorteAlto = o.alto / escala
      ctx.drawImage(
        fuente,
        (anchoOrigen - recorteAncho) / 2, (altoOrigen - recorteAlto) / 2,
        recorteAncho, recorteAlto,
        o.x, o.y, o.ancho, o.alto,
      )
    } else {
      ctx.drawImage(fuente, o.x, o.y, o.ancho, o.alto)
    }
  } finally {
    ctx.restore()
  }
}
