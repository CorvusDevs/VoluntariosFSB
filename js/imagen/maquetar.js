import { ANCHO, COLORES, FUENTES, medidas } from './tema.js'
import { formatearFechaLarga } from '../util/fechas.js'
import { iniciales } from '../util/nombres.js'

const RELACION_RECORTE = 2.5

export function maquetar(lista, roster, opciones = {}) {
  const { saludo = '', despedida = '', medirTexto } = opciones
  if (typeof medirTexto !== 'function') {
    throw new Error('maquetar necesita una funcion medirTexto(texto, fuente)')
  }

  const compacto = Boolean(lista.opcionesImagen?.compacto)
  const conFotos = Boolean(lista.opcionesImagen?.fotos) && medidas(compacto).mostrarFotos
  const m = medidas(compacto)
  const porId = indexar(roster)

  const ordenes = []
  let y = 0

  y = bandaSuperior(ordenes, lista, m, y)

  if (lista.opcionesImagen?.saludo && saludo) {
    y = parrafo(ordenes, saludo, m, y, medirTexto)
  }

  lista.grupos.forEach((grupo, i) => {
    if (i > 0) y += m.espacioEntreGrupos
    y = tituloGrupo(ordenes, grupo, m, y)
    grupo.filas.forEach((fila) => {
      y = filaDeAsignacion(ordenes, fila, porId, m, y, conFotos, medirTexto)
    })
    if (grupo.apoyo?.length) {
      y = lineaApoyo(ordenes, grupo, porId, m, y)
    }
  })

  if (lista.opcionesImagen?.despedida && despedida) {
    y += m.margen / 2
    y = parrafo(ordenes, despedida, m, y, medirTexto)
  }

  y += m.margen / 2
  const alto = y + m.altoBandaInferior
  bandaInferior(ordenes, m, y, alto)

  const relacion = alto / ANCHO
  return { ancho: ANCHO, alto, ordenes, relacion, recorteProbable: relacion > RELACION_RECORTE }
}

function indexar(roster) {
  const mapa = new Map()
  roster.participantes.forEach((p) => mapa.set(p.id, p))
  roster.voluntarios.forEach((v) => mapa.set(v.id, v))
  return mapa
}

function buscar(porId, id) {
  const persona = porId.get(id)
  if (!persona) throw new Error(`La lista referencia a una persona inexistente: ${id}`)
  return persona
}

function bandaSuperior(ordenes, lista, m, y) {
  const alto = m.altoBandaSuperior
  ordenes.push({ tipo: 'rect', x: 0, y, ancho: ANCHO, alto, color: COLORES.violeta })
  ordenes.push({
    tipo: 'imagen', clave: 'logo', x: m.margen, y: y + 28,
    ancho: 200, alto: 75, circular: false,
  })
  ordenes.push({
    tipo: 'texto', texto: 'Fútbol sin Barreras', x: m.margen, y: y + alto - 74,
    fuente: FUENTES.titulo(m.pxTitular), color: COLORES.blanco, lineaBase: 'top',
  })
  const sub = `${formatearFechaLarga(lista.fecha)} · ${lista.hora} h · ${lista.lugar}`
  ordenes.push({
    tipo: 'texto', texto: sub, x: m.margen, y: y + alto - 34,
    fuente: FUENTES.normal(m.pxBanda), color: COLORES.violetaClaro, lineaBase: 'top',
  })
  return y + alto
}

function bandaInferior(ordenes, m, y, alto) {
  ordenes.push({ tipo: 'rect', x: 0, y, ancho: ANCHO, alto: alto - y, color: COLORES.violeta })
  const centro = y + (alto - y) / 2
  ordenes.push({
    tipo: 'texto', texto: 'aletea.org', x: m.margen, y: centro,
    fuente: FUENTES.normal(m.pxBanda), color: COLORES.violetaClaro, lineaBase: 'middle',
  })
  ordenes.push({
    tipo: 'texto', texto: '@futbol_sinbarreras', x: ANCHO - m.margen, y: centro,
    fuente: FUENTES.normal(m.pxBanda), color: COLORES.blanco,
    alineacion: 'right', lineaBase: 'middle',
  })
}

function parrafo(ordenes, texto, m, y, medirTexto) {
  const anchoUtil = ANCHO - m.margen * 2
  const fuente = FUENTES.normal(m.pxParrafo)
  const lineas = quebrar(texto, anchoUtil, fuente, medirTexto)
  const altoLinea = Math.round(m.pxParrafo * 1.45)
  let cursor = y + m.margen / 2
  lineas.forEach((linea) => {
    ordenes.push({
      tipo: 'texto', texto: linea, x: m.margen, y: cursor,
      fuente, color: COLORES.textoSuave, lineaBase: 'top',
    })
    cursor += altoLinea
  })
  return cursor
}

function quebrar(texto, anchoMaximo, fuente, medirTexto) {
  const palabras = texto.split(/\s+/).filter(Boolean)
  const lineas = []
  let actual = ''
  palabras.forEach((palabra) => {
    const intento = actual ? `${actual} ${palabra}` : palabra
    if (actual && medirTexto(intento, fuente) > anchoMaximo) {
      lineas.push(actual)
      actual = palabra
    } else {
      actual = intento
    }
  })
  if (actual) lineas.push(actual)
  return lineas
}

function colorDeGrupo(numero) {
  return numero === 1
    ? { fuerte: COLORES.turquesaTexto, tenue: COLORES.turquesaTenue }
    : { fuerte: COLORES.magentaTexto, tenue: COLORES.magentaTenue }
}

function tituloGrupo(ordenes, grupo, m, y) {
  const c = colorDeGrupo(grupo.numero)
  const alto = m.altoTituloGrupo
  const arriba = y + m.margen / 2
  ordenes.push({
    tipo: 'rect', x: m.margen, y: arriba, ancho: ANCHO - m.margen * 2,
    alto, color: c.tenue, radio: 16,
  })
  const centro = arriba + alto / 2
  const titulo = grupo.subtitulo ? `${grupo.titulo} · ${grupo.subtitulo}` : grupo.titulo
  ordenes.push({
    tipo: 'texto', texto: titulo, x: m.margen + 24, y: centro,
    fuente: FUENTES.titulo(m.pxTituloGrupo), color: c.fuerte, lineaBase: 'middle',
  })
  if (grupo.cancha) {
    ordenes.push({
      tipo: 'texto', texto: grupo.cancha, x: ANCHO - m.margen - 24, y: centro,
      fuente: FUENTES.normal(m.pxTituloGrupo - 2), color: c.fuerte,
      alineacion: 'right', lineaBase: 'middle',
    })
  }
  return arriba + alto
}

function filaDeAsignacion(ordenes, fila, porId, m, y, conFotos, medirTexto) {
  const participantes = fila.participantes.map((id) => buscar(porId, id))
  const voluntarios = fila.voluntarios.map((id) => buscar(porId, id))
  const clave = fila.participantes[0]
  const centro = y + m.altoFila / 2
  let x = m.margen

  if (conFotos) {
    const primero = participantes[0]
    if (primero.foto) {
      ordenes.push({
        tipo: 'imagen', clave: primero.foto, x, y: centro - m.avatar / 2,
        ancho: m.avatar, alto: m.avatar, circular: true, fila: clave,
      })
    } else {
      ordenes.push({
        tipo: 'circulo', x: x + m.avatar / 2, y: centro, radio: m.avatar / 2,
        color: colorDeGrupo(1).tenue, fila: clave,
      })
      ordenes.push({
        tipo: 'texto', texto: iniciales(primero.nombre), x: x + m.avatar / 2, y: centro,
        fuente: FUENTES.titulo(Math.round(m.avatar * 0.36)), color: COLORES.violeta,
        alineacion: 'center', lineaBase: 'middle', fila: clave,
      })
    }
    x += m.avatar + 20
  }

  x = escribirNombres(ordenes, participantes, x, centro, m,
    FUENTES.titulo(m.pxNombre), COLORES.texto, clave, medirTexto)

  if (voluntarios.length > 0) {
    x = escribirSeparador(ordenes, '-', x, centro, m, clave, medirTexto)
    x = escribirNombres(ordenes, voluntarios, x, centro, m,
      FUENTES.normal(m.pxVoluntario), COLORES.magentaTexto, clave, medirTexto, true)
  }

  const abajo = y + m.altoFila
  ordenes.push({
    tipo: 'linea', x1: m.margen, y1: abajo, x2: ANCHO - m.margen, y2: abajo,
    color: COLORES.linea, fila: clave,
  })
  return abajo
}

function escribirNombres(ordenes, gente, x, centro, m, fuente, color, clave, medirTexto, conPastilla = false) {
  gente.forEach((persona, i) => {
    if (i > 0) x = escribirSeparador(ordenes, '/', x, centro, m, clave, medirTexto)
    ordenes.push({
      tipo: 'texto', texto: persona.nombre, x, y: centro,
      fuente, color, lineaBase: 'middle', fila: clave,
    })
    x += medirTexto(persona.nombre, fuente) + 10
    if (conPastilla && persona.nuevo) {
      const fuentePastilla = FUENTES.normal(Math.round(m.pxVoluntario * 0.62))
      const anchoTexto = medirTexto('nuevo', fuentePastilla)
      const anchoPastilla = anchoTexto + 24
      const altoPastilla = Math.round(m.pxVoluntario * 0.95)
      ordenes.push({
        tipo: 'rect', x, y: centro - altoPastilla / 2, ancho: anchoPastilla,
        alto: altoPastilla, color: COLORES.violetaTenue, radio: altoPastilla / 2, fila: clave,
      })
      ordenes.push({
        tipo: 'texto', texto: 'nuevo', x: x + anchoPastilla / 2, y: centro,
        fuente: fuentePastilla, color: COLORES.violeta,
        alineacion: 'center', lineaBase: 'middle', fila: clave,
      })
      x += anchoPastilla + 10
    }
  })
  return x
}

function escribirSeparador(ordenes, simbolo, x, centro, m, clave, medirTexto) {
  const fuente = FUENTES.normal(m.pxVoluntario)
  ordenes.push({
    tipo: 'texto', texto: simbolo, x, y: centro,
    fuente, color: COLORES.textoSuave, lineaBase: 'middle', fila: clave,
  })
  return x + medirTexto(simbolo, fuente) + 10
}

function lineaApoyo(ordenes, grupo, porId, m, y) {
  const alto = Math.round(m.altoFila * 0.7)
  const arriba = y + 16
  ordenes.push({
    tipo: 'rect', x: m.margen, y: arriba, ancho: ANCHO - m.margen * 2,
    alto, color: COLORES.violetaTenue, radio: 14,
  })
  const centro = arriba + alto / 2
  ordenes.push({
    tipo: 'texto', texto: `Apoyo G${grupo.numero}`, x: m.margen + 20, y: centro,
    fuente: FUENTES.titulo(Math.round(m.pxVoluntario * 0.85)),
    color: COLORES.violeta, lineaBase: 'middle',
  })
  const nombres = grupo.apoyo.map((id) => buscar(porId, id).nombre).join(' / ')
  ordenes.push({
    tipo: 'texto', texto: nombres, x: m.margen + 200, y: centro,
    fuente: FUENTES.normal(m.pxVoluntario), color: COLORES.texto, lineaBase: 'middle',
  })
  return arriba + alto
}
