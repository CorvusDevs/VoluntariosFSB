import { COLORES, FUENTES } from './tema.js'
import { formatearFechaLarga } from '../util/fechas.js'
import { iniciales, abreviarApellido } from '../util/nombres.js'
import { pintar } from './pintar.js'

export const ANCHO_A4 = 1240
export const ALTO_A4 = 1754
const MARGEN = 48
const ALTO_CABECERA = 154
const ALTO_PIE = 76
const SEPARACION = 22

const unicos = (valores) => [...new Set(valores)]
const firma = (fila) => [...(fila.voluntarios ?? [])].sort().join('|')

// Una tarjeta representa la relación completa. Las filas con el mismo conjunto
// de voluntarios se reúnen para que un acompañante compartido no parezca dos
// asignaciones independientes. Las filas sin acompañante permanecen separadas.
export function agruparAsignaciones(filas = []) {
  const grupos = []
  const porFirma = new Map()
  filas.forEach((fila) => {
    const clave = firma(fila)
    const existente = clave ? porFirma.get(clave) : null
    if (existente) {
      existente.participantes = unicos([...existente.participantes, ...(fila.participantes ?? [])])
      return
    }
    const asignacion = {
      participantes: unicos(fila.participantes ?? []),
      voluntarios: unicos(fila.voluntarios ?? []),
    }
    grupos.push(asignacion)
    if (clave) porFirma.set(clave, asignacion)
  })
  return grupos
}

function porId(roster) {
  return new Map([...(roster.participantes ?? []), ...(roster.voluntarios ?? [])].map((p) => [p.id, p]))
}

function colorGrupo(numero) {
  return numero === 1
    ? { fuerte: COLORES.turquesaTexto, tenue: COLORES.turquesaTenue }
    : { fuerte: COLORES.magentaTexto, tenue: COLORES.magentaTenue }
}

function fotoCircular(ordenes, persona, x, y, lado, fondo, fila) {
  ordenes.push({ tipo: 'circulo', x: x + lado / 2, y: y + lado / 2, radio: lado / 2, color: fondo, fila })
  ordenes.push({
    tipo: 'texto', texto: iniciales(persona.nombre), x: x + lado / 2, y: y + lado / 2,
    fuente: FUENTES.titulo(Math.round(lado * 0.28)), color: COLORES.violeta,
    alineacion: 'center', lineaBase: 'middle', fila,
  })
  if (persona.foto) ordenes.push({ tipo: 'imagen', clave: persona.foto, x, y, ancho: lado, alto: lado, circular: true, fila })
}

function personasEnTarjeta(ordenes, personas, x, y, ancho, alto, opciones) {
  const visibles = personas.slice(0, 3)
  const lado = Math.min(82, Math.max(58, alto - 52))
  const paso = Math.min(lado * 0.72, (ancho - lado) / Math.max(1, visibles.length - 1))
  visibles.forEach((persona, indice) => fotoCircular(
    ordenes, persona, x + indice * paso, y, lado, opciones.fondo, opciones.fila,
  ))
  const nombres = personas.map((p) => abreviarApellido(p.nombre)).join(' / ') || opciones.vacio
  ordenes.push({
    tipo: 'texto', texto: nombres, x, y: y + lado + 12,
    fuente: FUENTES.titulo(personas.length > 2 ? 17 : 20), color: opciones.color,
    lineaBase: 'top', fila: opciones.fila,
  })
  if (personas.length > 3) ordenes.push({
    tipo: 'texto', texto: `+${personas.length - 3}`, x: x + 2.25 * paso + lado / 2, y: y + lado / 2,
    fuente: FUENTES.titulo(18), color: COLORES.blanco, alineacion: 'center', lineaBase: 'middle', fila: opciones.fila,
  })
}

export function maquetarA4(lista, roster, grupo) {
  const indice = porId(roster)
  const asignaciones = agruparAsignaciones(grupo.filas)
  const columnas = asignaciones.length > 6 ? 2 : 1
  const filas = Math.max(1, Math.ceil(asignaciones.length / columnas))
  const arriba = MARGEN + ALTO_CABECERA + 28
  const abajo = ALTO_A4 - MARGEN - ALTO_PIE - 28
  const anchoTarjeta = (ANCHO_A4 - MARGEN * 2 - SEPARACION * (columnas - 1)) / columnas
  const altoTarjeta = Math.min(224, (abajo - arriba - SEPARACION * (filas - 1)) / filas)
  const colores = colorGrupo(grupo.numero)
  const ordenes = []

  ordenes.push({ tipo: 'rect', x: 0, y: 0, ancho: ANCHO_A4, alto: ALTO_A4, color: '#F8F5F9' })
  ordenes.push({ tipo: 'rect', x: MARGEN, y: MARGEN, ancho: ANCHO_A4 - MARGEN * 2, alto: ALTO_CABECERA, color: COLORES.violeta, radio: 30 })
  ordenes.push({ tipo: 'texto', texto: 'Fútbol sin Barreras', x: MARGEN + 34, y: MARGEN + 40, fuente: FUENTES.titulo(43), color: COLORES.blanco, lineaBase: 'top' })
  ordenes.push({ tipo: 'texto', texto: `${grupo.cancha ?? `Cancha ${grupo.numero}`} · ${grupo.titulo}${grupo.subtitulo ? ` · ${grupo.subtitulo}` : ''}`, x: MARGEN + 34, y: MARGEN + 94, fuente: FUENTES.normal(23), color: COLORES.violetaClaro, lineaBase: 'top' })
  ordenes.push({ tipo: 'imagen', clave: 'logo', x: ANCHO_A4 - MARGEN - 194, y: MARGEN + 22, ancho: 160, alto: 60 })
  ordenes.push({ tipo: 'texto', texto: `${formatearFechaLarga(lista.fecha)} · ${lista.hora} h · ${lista.lugar}`, x: ANCHO_A4 - MARGEN - 34, y: MARGEN + 105, fuente: FUENTES.normal(21), color: COLORES.blanco, alineacion: 'right', lineaBase: 'top' })

  asignaciones.forEach((asignacion, posicion) => {
    const columna = posicion % columnas
    const renglon = Math.floor(posicion / columnas)
    const x = MARGEN + columna * (anchoTarjeta + SEPARACION)
    const y = arriba + renglon * (altoTarjeta + SEPARACION)
    const clave = asignacion.participantes[0] ?? `asignacion-${posicion}`
    const participantes = asignacion.participantes.map((id) => indice.get(id)).filter(Boolean)
    const voluntarios = asignacion.voluntarios.map((id) => indice.get(id)).filter(Boolean)
    ordenes.push({ tipo: 'rect', x, y, ancho: anchoTarjeta, alto: altoTarjeta, color: COLORES.blanco, radio: 22, fila: clave })
    ordenes.push({ tipo: 'rect', x, y, ancho: 8, alto: altoTarjeta, color: colores.fuerte, radio: [22, 0, 0, 22], fila: clave })
    const mitad = (anchoTarjeta - 58) / 2
    personasEnTarjeta(ordenes, participantes, x + 24, y + 24, mitad, altoTarjeta - 38, {
      fondo: colores.tenue, color: colores.fuerte, fila: clave, vacio: 'Sin participante',
    })
    ordenes.push({ tipo: 'linea', x1: x + anchoTarjeta / 2, y1: y + 25, x2: x + anchoTarjeta / 2, y2: y + altoTarjeta - 25, color: COLORES.linea, grosor: 2, fila: clave })
    personasEnTarjeta(ordenes, voluntarios, x + anchoTarjeta / 2 + 24, y + 24, mitad, altoTarjeta - 38, {
      fondo: COLORES.violetaTenue, color: COLORES.violeta, fila: clave, vacio: 'Sin acompañante',
    })
  })

  const apoyos = (grupo.apoyo ?? []).map((id) => indice.get(id)).filter(Boolean)
  const pieY = ALTO_A4 - MARGEN - ALTO_PIE
  ordenes.push({ tipo: 'rect', x: MARGEN, y: pieY, ancho: ANCHO_A4 - MARGEN * 2, alto: ALTO_PIE, color: COLORES.violeta, radio: 26 })
  ordenes.push({ tipo: 'texto', texto: apoyos.length ? `Apoyo de cancha: ${apoyos.map((p) => abreviarApellido(p.nombre)).join(' / ')}` : 'Sin apoyo de cancha asignado', x: MARGEN + 28, y: pieY + ALTO_PIE / 2, fuente: FUENTES.titulo(21), color: COLORES.blanco, lineaBase: 'middle' })
  ordenes.push({ tipo: 'texto', texto: 'Una hoja por cancha', x: ANCHO_A4 - MARGEN - 28, y: pieY + ALTO_PIE / 2, fuente: FUENTES.normal(19), color: COLORES.violetaClaro, alineacion: 'right', lineaBase: 'middle' })

  return { ancho: ANCHO_A4, alto: ALTO_A4, ordenes, asignaciones, grupoNumero: grupo.numero }
}

export function crearLienzoA4({ lista, roster, grupo, imagenes, crearLienzo, medirTexto }) {
  const lienzo = (crearLienzo ?? (() => document.createElement('canvas')))()
  const plano = maquetarA4(lista, roster, grupo, medirTexto)
  // El tamaño pertenece también al elemento visible. En las pruebas y en
  // algunos adaptadores el contexto puede envolver otro canvas.
  lienzo.width = plano.ancho
  lienzo.height = plano.alto
  pintar(lienzo.getContext('2d'), plano, imagenes, 1)
  return { lienzo, plano }
}

export function nombreDeArchivoA4(lista, grupo) {
  const cancha = String(grupo.cancha ?? `cancha-${grupo.numero}`).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return `futbol-sin-barreras-${lista.fecha}-${cancha}-a4.png`
}
