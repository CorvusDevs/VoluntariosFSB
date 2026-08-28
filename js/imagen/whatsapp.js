import { maquetar } from './maquetar.js'
import { pintar } from './pintar.js'
import { COLORES } from './tema.js'

export const ANCHO_WHATSAPP = 1920
export const ALTO_WHATSAPP = 1080
export const MARGEN_WHATSAPP = 48
export const SEPARACION_WHATSAPP = 32

export function calcularComposicionWhatsApp(planos) {
  if (!Array.isArray(planos) || planos.length === 0) {
    throw new Error('La composición para WhatsApp necesita al menos un grupo')
  }
  const columnas = planos.length
  const anchoDisponible = ANCHO_WHATSAPP - MARGEN_WHATSAPP * 2 - SEPARACION_WHATSAPP * (columnas - 1)
  const anchoColumna = anchoDisponible / columnas
  const altoDisponible = ALTO_WHATSAPP - MARGEN_WHATSAPP * 2

  const paneles = planos.map((plano, indice) => {
    const escala = Math.min(anchoColumna / plano.ancho, altoDisponible / plano.alto)
    const ancho = plano.ancho * escala
    const alto = plano.alto * escala
    const inicioColumna = MARGEN_WHATSAPP + indice * (anchoColumna + SEPARACION_WHATSAPP)
    return {
      x: inicioColumna + (anchoColumna - ancho) / 2,
      y: MARGEN_WHATSAPP,
      ancho,
      alto,
      escala,
    }
  })

  return {
    ancho: ANCHO_WHATSAPP,
    alto: ALTO_WHATSAPP,
    paneles,
    legible: paneles.every((panel) => panel.escala >= 0.55),
  }
}

export function crearLienzoWhatsApp({ lista, roster, imagenes, medirTexto, crearLienzo }) {
  const nuevoLienzo = crearLienzo ?? (() => document.createElement('canvas'))
  const grupos = lista.grupos.filter((grupo) => grupo.filas.length || grupo.apoyo?.length)
  const planos = grupos.map((grupo) => maquetar(
    { ...lista, grupos: [grupo] },
    roster,
    { saludo: '', despedida: '', medirTexto },
  ))
  const composicion = calcularComposicionWhatsApp(planos)
  const lienzo = nuevoLienzo()
  const ctx = lienzo.getContext('2d')
  lienzo.width = composicion.ancho
  lienzo.height = composicion.alto

  ctx.fillStyle = COLORES.violetaTenue
  ctx.fillRect(0, 0, lienzo.width, lienzo.height)

  planos.forEach((plano, indice) => {
    const fuente = nuevoLienzo()
    pintar(fuente.getContext('2d'), plano, imagenes, 1)
    const panel = composicion.paneles[indice]
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(panel.x, panel.y, panel.ancho, panel.alto, 28)
    ctx.clip()
    ctx.drawImage(fuente, panel.x, panel.y, panel.ancho, panel.alto)
    ctx.restore()
  })

  return { lienzo, composicion }
}
