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
  ordenes.push({ tipo: 'texto', texto: 'Fútbol sin Barreras', x: MARGEN, y: 76, fuente: FUENTES.normal(28), color: COLORES.blanco })
  ordenes.push({ tipo: 'texto', texto: 'Perfil personal · Uso interno', x: MARGEN, y: 130, fuente: FUENTES.titulo(42), color: COLORES.blanco })
  y = 258
  if (persona.foto) ordenes.push({ tipo: 'imagen', clave: persona.foto, x: MARGEN, y, ancho: 220, alto: 220, radio: 28 })
  else { ordenes.push({ tipo: 'rect', x: MARGEN, y, ancho: 220, alto: 220, color: color.tenue, radio: 28 }); ordenes.push({ tipo: 'texto', texto: persona.nombre.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase(), x: MARGEN + 110, y: y + 125, fuente: FUENTES.titulo(72), color: color.fuerte, alineacion: 'center' }) }
  ordenes.push({ tipo: 'texto', texto: persona.nombre, x: 320, y: y + 68, fuente: FUENTES.titulo(54), color: COLORES.texto })
  const etiqueta = persona.grupo ? `Grupo ${persona.grupo}` : 'Voluntariado'
  ordenes.push({ tipo: 'rect', x: 320, y: y + 94, ancho: 170, alto: 42, color: color.tenue, radio: 21 })
  ordenes.push({ tipo: 'texto', texto: etiqueta, x: 405, y: y + 122, fuente: FUENTES.titulo(22), color: color.fuerte, alineacion: 'center' })
  const datos = [edad === null ? null : `${edad} años`, perfil.desde ? `En la organización desde ${fechaPerfil(perfil.desde)}` : null].filter(Boolean).join(' · ')
  if (datos) ordenes.push({ tipo: 'texto', texto: datos, x: 320, y: y + 178, fuente: FUENTES.normal(27), color: COLORES.textoSuave })
  y += 280
  const bloques = [['Le gusta', perfil.leGusta], ['Prefiere evitar', perfil.noLeGusta], ['Necesidades y apoyos', perfil.necesidades]]
  bloques.forEach(([titulo, contenido]) => {
    if (!contenido?.trim()) return
    const cuerpo = lineas(contenido, ANCHO - MARGEN * 2 - 48, FUENTES.normal(28), medirTexto)
    const alto = 74 + cuerpo.length * 40
    ordenes.push({ tipo: 'rect', x: MARGEN, y, ancho: ANCHO - MARGEN * 2, alto, color: titulo === 'Necesidades y apoyos' ? color.tenue : '#FAF8FB', radio: 18 })
    ordenes.push({ tipo: 'texto', texto: titulo, x: MARGEN + 24, y: y + 38, fuente: FUENTES.titulo(25), color: titulo === 'Necesidades y apoyos' ? color.fuerte : COLORES.violeta })
    cuerpo.forEach((linea, indice) => ordenes.push({ tipo: 'texto', texto: linea, x: MARGEN + 24, y: y + 82 + indice * 40, fuente: FUENTES.normal(28), color: COLORES.texto }))
    y += alto + 22
  })
  y += 28
  ordenes.push({ tipo: 'texto', texto: 'Información de coordinación. No compartir sin autorización.', x: MARGEN, y, fuente: FUENTES.normal(20), color: COLORES.textoSuave })
  return { ancho: ANCHO, alto: y + 56, ordenes }
}
