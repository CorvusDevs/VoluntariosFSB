import { maquetar } from './maquetar.js'
import { pintar } from './pintar.js'
import { COLORES, FUENTES, medidas } from './tema.js'
import { formatearFechaLarga } from '../util/fechas.js'

export const ANCHO_WHATSAPP = 1920
export const ALTO_WHATSAPP = 1240
export const MARGEN_WHATSAPP = 30
export const SEPARACION_WHATSAPP = 16
export const ALTO_CABECERA_WHATSAPP = 132
export const ALTO_PIE_WHATSAPP = 52
const AIRE_CABECERA = 14
const AIRE_PIE = 14

export function calcularComposicionWhatsApp(planos) {
  if (!Array.isArray(planos) || planos.length === 0) {
    throw new Error('La composición para WhatsApp necesita al menos un grupo')
  }
  const columnas = planos.length
  const anchoDisponible = ANCHO_WHATSAPP - MARGEN_WHATSAPP * 2 - SEPARACION_WHATSAPP * (columnas - 1)
  const anchoColumna = anchoDisponible / columnas
  const yPaneles = MARGEN_WHATSAPP + ALTO_CABECERA_WHATSAPP + AIRE_CABECERA
  const altoDisponible = ALTO_WHATSAPP - yPaneles - ALTO_PIE_WHATSAPP - AIRE_PIE - MARGEN_WHATSAPP

  const paneles = planos.map((plano, indice) => {
    const altoContenido = plano.altoCuerpo ?? plano.alto
    const escala = Math.min(anchoColumna / plano.ancho, altoDisponible / altoContenido)
    const ancho = plano.ancho * escala
    const alto = altoContenido * escala
    const inicioColumna = MARGEN_WHATSAPP + indice * (anchoColumna + SEPARACION_WHATSAPP)
    return {
      x: inicioColumna + (anchoColumna - ancho) / 2,
      y: yPaneles + (altoDisponible - alto) / 2,
      ancho,
      alto,
      escala,
      recorteY: plano.recorteY ?? 0,
      altoContenido,
    }
  })

  return {
    ancho: ANCHO_WHATSAPP,
    alto: ALTO_WHATSAPP,
    paneles,
    legible: paneles.every((panel) => panel.escala >= 0.55),
  }
}

function rectanguloRedondeado(ctx, x, y, ancho, alto, radio, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(x, y, ancho, alto, radio)
  ctx.fill()
}

function fondoDeMarca(ctx) {
  ctx.fillStyle = '#F7F0F9'
  ctx.fillRect(0, 0, ANCHO_WHATSAPP, ALTO_WHATSAPP)

  ctx.save()
  ctx.globalAlpha = 0.1
  ctx.lineWidth = 46
  ctx.strokeStyle = COLORES.turquesa
  ctx.beginPath()
  ctx.ellipse(690, 710, 430, 230, -0.08, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = COLORES.magenta
  ctx.beginPath()
  ctx.ellipse(1230, 710, 430, 230, 0.08, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function cabeceraCompartida(ctx, lista, imagenes) {
  rectanguloRedondeado(
    ctx, MARGEN_WHATSAPP, MARGEN_WHATSAPP,
    ANCHO_WHATSAPP - MARGEN_WHATSAPP * 2, ALTO_CABECERA_WHATSAPP, 30, COLORES.violeta,
  )
  ctx.fillStyle = COLORES.blanco
  ctx.font = FUENTES.titulo(55)
  ctx.textBaseline = 'top'
  ctx.fillText('Fútbol sin Barreras', 76, 60)
  ctx.fillStyle = COLORES.violetaClaro
  ctx.font = FUENTES.normal(25)
  ctx.fillText(`${formatearFechaLarga(lista.fecha)} · ${lista.hora} h · ${lista.lugar}`, 78, 112)

  const logo = imagenes.logo
  if (logo) {
    ctx.drawImage(logo, ANCHO_WHATSAPP - 322, 57, 220, 82)
  } else {
    ctx.fillStyle = COLORES.turquesa
    ctx.font = FUENTES.titulo(31)
    ctx.textAlign = 'right'
    ctx.fillText('Aletea', ANCHO_WHATSAPP - 76, 85)
    ctx.textAlign = 'left'
  }
}

function pieCompartido(ctx) {
  const y = ALTO_WHATSAPP - MARGEN_WHATSAPP - ALTO_PIE_WHATSAPP
  rectanguloRedondeado(
    ctx, MARGEN_WHATSAPP, y,
    ANCHO_WHATSAPP - MARGEN_WHATSAPP * 2, ALTO_PIE_WHATSAPP, 24, COLORES.violeta,
  )
  ctx.fillStyle = COLORES.violetaClaro
  ctx.font = FUENTES.normal(24)
  ctx.textBaseline = 'middle'
  ctx.fillText('aletea.org', 76, y + ALTO_PIE_WHATSAPP / 2)
  ctx.textAlign = 'right'
  ctx.fillText('@futbol_sinbarreras', ANCHO_WHATSAPP - 76, y + ALTO_PIE_WHATSAPP / 2)
  ctx.textAlign = 'left'
}

export function crearLienzoWhatsApp({ lista, roster, imagenes, medirTexto, crearLienzo }) {
  const nuevoLienzo = crearLienzo ?? (() => document.createElement('canvas'))
  const grupos = lista.grupos.filter((grupo) => grupo.filas.length || grupo.apoyo?.length)
  const geometria = medidas(Boolean(lista.opcionesImagen?.compacto))
  const planos = grupos.map((grupo) => maquetar(
    {
      ...lista,
      grupos: [grupo],
      opcionesImagen: { ...lista.opcionesImagen, columnasPorFila: 4 },
    },
    roster,
    { saludo: '', despedida: '', medirTexto },
  ))
  const cuerpos = planos.map((plano) => ({
    ...plano,
    recorteY: geometria.altoBandaSuperior,
    altoCuerpo: plano.alto - geometria.altoBandaSuperior - geometria.altoBandaInferior,
  }))
  const composicion = calcularComposicionWhatsApp(cuerpos)
  const lienzo = nuevoLienzo()
  const ctx = lienzo.getContext('2d')
  lienzo.width = composicion.ancho
  lienzo.height = composicion.alto

  fondoDeMarca(ctx)
  cabeceraCompartida(ctx, lista, imagenes)
  pieCompartido(ctx)

  planos.forEach((plano, indice) => {
    const fuente = nuevoLienzo()
    pintar(fuente.getContext('2d'), plano, imagenes, 1)
    const panel = composicion.paneles[indice]
    ctx.save()
    const aire = 12
    rectanguloRedondeado(
      ctx, panel.x - aire, panel.y - aire,
      panel.ancho + aire * 2, panel.alto + aire * 2, 24, COLORES.blanco,
    )
    ctx.beginPath()
    ctx.roundRect(panel.x, panel.y, panel.ancho, panel.alto, 20)
    ctx.clip()
    ctx.drawImage(
      fuente,
      0, panel.recorteY, plano.ancho, panel.altoContenido,
      panel.x, panel.y, panel.ancho, panel.alto,
    )
    ctx.restore()
  })

  return { lienzo, composicion }
}
