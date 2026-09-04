import { maquetar } from './maquetar.js'
import { pintar } from './pintar.js'
import { COLORES, FUENTES, medidas } from './tema.js'
import { formatearFechaLarga } from '../util/fechas.js'

export const ANCHO_WHATSAPP = 1920
export const ALTO_WHATSAPP = 1240
export const MARGEN_WHATSAPP = 30
export const SEPARACION_WHATSAPP = 24
export const ALTO_CABECERA_WHATSAPP = 112
export const ALTO_PIE_WHATSAPP = 44
const AIRE_CABECERA = 12
const AIRE_PIE = 12

export function columnasParaHorizontal(cantidad) {
  if (cantidad <= 10) return 3
  if (cantidad <= 16) return 5
  return 6
}

export function calcularComposicionWhatsApp(planos) {
  if (!Array.isArray(planos) || planos.length === 0) {
    throw new Error('La composición para WhatsApp necesita al menos un grupo')
  }
  const columnas = planos.length
  const anchoDisponible = ANCHO_WHATSAPP - MARGEN_WHATSAPP * 2 - SEPARACION_WHATSAPP * (columnas - 1)
  const pesos = planos.map((plano) => Math.max(1, Number(plano.peso) || 1))
  const pesoTotal = pesos.reduce((total, peso) => total + peso, 0)
  const anchosAsignados = pesos.map((peso) => anchoDisponible * peso / pesoTotal)
  const yPaneles = MARGEN_WHATSAPP + ALTO_CABECERA_WHATSAPP + AIRE_CABECERA
  const altoDisponible = ALTO_WHATSAPP - yPaneles - ALTO_PIE_WHATSAPP - AIRE_PIE - MARGEN_WHATSAPP
  const escalasMaximas = planos.map((plano, indice) => {
    const altoContenido = plano.altoCuerpo ?? plano.alto
    return Math.min(anchosAsignados[indice] / plano.ancho, altoDisponible / altoContenido)
  })
  // Una sola escala evita que una cancha parezca secundaria por tener más
  // personas. El ancho proporcional y la cantidad de columnas hacen que las
  // dos composiciones aprovechen su sector sin cambiar el tamaño de las caras.
  const escalaCompartida = Math.min(...escalasMaximas)
  let cursorX = MARGEN_WHATSAPP
  const paneles = planos.map((plano, indice) => {
    const altoContenido = plano.altoCuerpo ?? plano.alto
    const anchoAsignado = anchosAsignados[indice]
    const escala = escalaCompartida
    const ancho = plano.ancho * escala
    const alto = altoContenido * escala
    const panel = {
      slotX: cursorX,
      x: cursorX + (anchoAsignado - ancho) / 2,
      y: yPaneles + (altoDisponible - alto) / 2,
      ancho,
      alto,
      anchoAsignado,
      escala,
      recorteY: plano.recorteY ?? 0,
      altoContenido,
    }
    cursorX += anchoAsignado + SEPARACION_WHATSAPP
    return panel
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

}

function cabeceraCompartida(ctx, lista, imagenes) {
  rectanguloRedondeado(
    ctx, MARGEN_WHATSAPP, MARGEN_WHATSAPP,
    ANCHO_WHATSAPP - MARGEN_WHATSAPP * 2, ALTO_CABECERA_WHATSAPP, 30, COLORES.violeta,
  )

  const logoColor = imagenes.logoColor
  if (logoColor) {
    // El isotipo institucional ocupa el aire central como marca de agua. Se
    // recorta desde el logo de color para no repetir la palabra Aletea.
    ctx.save()
    ctx.globalAlpha = 0.2
    ctx.drawImage(
      logoColor,
      0, 0, logoColor.width, Math.round(logoColor.height * 0.48),
      930, 44, 330, 86,
    )
    ctx.restore()
  }

  ctx.fillStyle = COLORES.blanco
  ctx.font = FUENTES.titulo(52)
  ctx.textBaseline = 'top'
  ctx.fillText('Fútbol sin Barreras', 76, 50)
  ctx.fillStyle = COLORES.violetaClaro
  ctx.font = FUENTES.normal(25)
  ctx.fillText(`${formatearFechaLarga(lista.fecha)} · ${lista.hora} h · ${lista.lugar}`, 78, 101)

  const logo = imagenes.logo
  if (logo) {
    ctx.drawImage(logo, ANCHO_WHATSAPP - 302, 47, 200, 75)
  } else {
    ctx.fillStyle = COLORES.turquesa
    ctx.font = FUENTES.titulo(31)
    ctx.textAlign = 'right'
    ctx.fillText('Aletea', ANCHO_WHATSAPP - 76, 73)
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
      opcionesImagen: { ...lista.opcionesImagen },
    },
    roster,
    {
      saludo: '', despedida: '', medirTexto,
      ajustesImpresion: {
        columnasPorFila: columnasParaHorizontal(grupo.filas.length),
        colorVoluntario: COLORES.violeta,
        bandejaVoluntariosIntegrada: lista.opcionesImagen?.formato === 'retratos',
      },
    },
  ))
  const cuerpos = planos.map((plano, indice) => ({
    ...plano,
    peso: Math.max(1, grupos[indice].filas.length),
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
    rectanguloRedondeado(
      ctx, panel.slotX, panel.y - 12,
      panel.anchoAsignado, panel.alto + 24, 24, COLORES.blanco,
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
