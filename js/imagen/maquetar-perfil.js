import { COLORES, FUENTES } from './tema.js'
import { edadDesdeAnio, fechaPerfil, perfilDe } from '../modelo/perfil.js'

const ANCHO = 1080
const MARGEN = 64

const colorDeGrupo = (persona) => persona.grupo === 1
  ? { fuerte: COLORES.turquesaTexto, tenue: COLORES.turquesaTenue }
  : persona.grupo === 2 ? { fuerte: COLORES.magentaTexto, tenue: COLORES.magentaTenue }
    : { fuerte: COLORES.violeta, tenue: COLORES.violetaTenue }

function lineas(texto, ancho, fuente, medirTexto) {
  if (!texto) return []
  const resultado = []; let actual = ''
  texto.trim().split(/\s+/).forEach((palabra) => {
    const intento = actual ? `${actual} ${palabra}` : palabra
    if (actual && medirTexto(intento, fuente) > ancho) { resultado.push(actual); actual = palabra } else actual = intento
  })
  if (actual) resultado.push(actual)
  return resultado
}

export function maquetarPerfil(persona, { medirTexto, anioActual = new Date().getFullYear() } = {}) {
  if (typeof medirTexto !== 'function') throw new Error('maquetarPerfil necesita medirTexto')
  const perfil = perfilDe(persona); const color = colorDeGrupo(persona); const ordenes = []
  const edad = edadDesdeAnio(perfil.anioNacimiento, anioActual)
  let y = 0
  ordenes.push({ tipo: 'rect', x: 0, y: 0, ancho: ANCHO, alto: 210, color: COLORES.violeta })
  // Mantiene la misma marca, escala y esquina que la cabecera de la planilla.
  ordenes.push({ tipo: 'imagen', clave: 'logo', x: ANCHO - MARGEN - 200, y: 68, ancho: 200, alto: 75, circular: false })
  const fuentePrograma = FUENTES.normal(28)
  const programa = 'Fútbol sin Barreras'
  ordenes.push({ tipo: 'texto', texto: programa, x: MARGEN, y: 76, fuente: fuentePrograma, color: COLORES.blanco })
  ordenes.push({ tipo: 'icono', nombre: 'pelota', x: MARGEN + medirTexto(programa, fuentePrograma) + 14, y: 49, lado: 30, color: COLORES.blanco })
  ordenes.push({ tipo: 'texto', texto: 'Perfil personal · Uso interno', x: MARGEN, y: 130, fuente: FUENTES.titulo(42), color: COLORES.blanco })
  ordenes.push({ tipo: 'rect', x: 0, y: 210, ancho: ANCHO, alto: 12, color: color.fuerte })
  y = 258
  ordenes.push({ tipo: 'rect', x: MARGEN - 8, y: y - 8, ancho: 236, alto: 236, color: color.fuerte, radio: 34 })
  if (persona.foto) ordenes.push({ tipo: 'imagen', clave: persona.foto, x: MARGEN, y, ancho: 220, alto: 220, radio: 28 })
  else { ordenes.push({ tipo: 'rect', x: MARGEN, y, ancho: 220, alto: 220, color: color.tenue, radio: 28 }); ordenes.push({ tipo: 'texto', texto: persona.nombre.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase(), x: MARGEN + 110, y: y + 125, fuente: FUENTES.titulo(72), color: color.fuerte, alineacion: 'center' }) }
  ordenes.push({ tipo: 'texto', texto: persona.nombre, x: 320, y: y + 68, fuente: FUENTES.titulo(54), color: COLORES.texto })
  const etiqueta = persona.grupo ? `Grupo ${persona.grupo}` : 'Voluntariado'
  ordenes.push({ tipo: 'rect', x: 320, y: y + 94, ancho: 170, alto: 42, color: color.tenue, radio: 21 })
  ordenes.push({ tipo: 'texto', texto: etiqueta, x: 405, y: y + 122, fuente: FUENTES.titulo(22), color: color.fuerte, alineacion: 'center' })
  let xMeta = 320
  const agregarMeta = (texto) => { const fuente = FUENTES.normal(22); const ancho = medirTexto(texto, fuente) + 34; ordenes.push({ tipo: 'rect', x: xMeta, y: y + 158, ancho, alto: 38, color: COLORES.violetaTenue, radio: 19 }); ordenes.push({ tipo: 'texto', texto, x: xMeta + 17, y: y + 183, fuente, color: COLORES.violeta, lineaBase: 'middle' }); xMeta += ancho + 12 }
  if (edad !== null) agregarMeta(`${edad} años`)
  if (perfil.desde) agregarMeta(`Desde ${perfil.desde.slice(0, 4)}`)
  y += 280
  const bloques = [['Le gusta', perfil.leGusta], ['Prefiere evitar', perfil.noLeGusta], ['Necesidades y apoyos', perfil.necesidades]]
  bloques.forEach(([titulo, contenido]) => {
    if (!contenido?.trim()) return
    const cuerpo = lineas(contenido, ANCHO - MARGEN * 2 - 48, FUENTES.normal(28), medirTexto)
    const alto = 74 + cuerpo.length * 40
    const acento = titulo === 'Le gusta' ? COLORES.turquesaTexto : titulo === 'Necesidades y apoyos' ? COLORES.magentaTexto : COLORES.violeta
    const fondo = titulo === 'Le gusta' ? COLORES.turquesaTenue : titulo === 'Necesidades y apoyos' ? COLORES.magentaTenue : '#FAF8FB'
    ordenes.push({ tipo: 'rect', x: MARGEN, y, ancho: ANCHO - MARGEN * 2, alto, color: fondo, radio: 18 })
    ordenes.push({ tipo: 'rect', x: MARGEN, y, ancho: 9, alto, color: acento, radio: [18, 0, 0, 18] })
    ordenes.push({ tipo: 'texto', texto: titulo, x: MARGEN + 28, y: y + 38, fuente: FUENTES.titulo(25), color: acento })
    cuerpo.forEach((linea, indice) => ordenes.push({ tipo: 'texto', texto: linea, x: MARGEN + 28, y: y + 82 + indice * 40, fuente: FUENTES.normal(28), color: COLORES.texto }))
    y += alto + 22
  })
  y += 28
  ordenes.push({ tipo: 'icono', nombre: 'candado', x: MARGEN, y: y - 18, lado: 24, color: COLORES.textoSuave })
  ordenes.push({ tipo: 'texto', texto: 'Información de coordinación. No compartir sin autorización.', x: MARGEN + 34, y, fuente: FUENTES.normal(20), color: COLORES.textoSuave })
  return { ancho: ANCHO, alto: y + 56, ordenes }
}
