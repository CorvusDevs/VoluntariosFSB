import { COLORES } from './tema.js'
import { maquetar } from './maquetar.js'
import { pintar } from './pintar.js'

export const ANCHO_A4 = 1240
export const ALTO_A4 = 1754

export function columnasParaA4(cantidad) {
  if (cantidad <= 6) return 3
  if (cantidad <= 8) return 4
  if (cantidad <= 15) return 5
  return 6
}

const unicos = (valores) => [...new Set(valores)]
const firma = (fila) => [...(fila.voluntarios ?? [])].sort().join('|')

// Esta lectura de relaciones se conserva como dato auxiliar para validar que
// una hoja representa correctamente asignaciones compartidas. El dibujo no
// inventa otra presentación: usa exactamente el formato elegido para la lista.
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

const medirAproximado = (texto, fuente) => {
  const px = Number(/(\d+(?:\.\d+)?)px/.exec(fuente)?.[1] ?? 16)
  return String(texto).length * px * 0.55
}

// El A4 es un soporte de impresión, no un sexto estilo. Se maqueta una lista
// con una sola cancha y las mismas opciones guardadas para la imagen vertical.
// Después se escala de forma uniforme para entrar en una página A4 sin recortar.
export function maquetarA4(lista, roster, grupo, medirTexto = medirAproximado) {
  const listaDeCancha = { ...lista, grupos: [grupo] }
  const ajustesImpresion = {
    columnasPorFila: columnasParaA4(grupo.filas.length),
    anchoLienzo: ANCHO_A4,
    // "Alto" significa que una mayor parte del medallón queda fuera de la foto:
    // solo el 30 % se superpone. Antes se usaba "apenas" y se cubría el 60 %.
    asomoVoluntario: 'alto',
    // El color del grupo identifica al participante. El violeta diferencia el
    // rol de voluntariado sin sumar otra paleta a la pieza.
    colorVoluntario: COLORES.violeta,
    bandejaVoluntariosMultiples: true,
  }
  const contenido = maquetar(listaDeCancha, roster, {
    saludo: lista.saludo ?? '',
    despedida: lista.despedida ?? '',
    medirTexto,
    ajustesImpresion,
  })
  const escala = Math.min(ANCHO_A4 / contenido.ancho, ALTO_A4 / contenido.alto)
  return {
    ancho: ANCHO_A4,
    alto: ALTO_A4,
    contenido,
    escala,
    x: (ANCHO_A4 - contenido.ancho * escala) / 2,
    y: 0,
    ordenes: contenido.ordenes,
    asignaciones: agruparAsignaciones(grupo.filas),
    grupoNumero: grupo.numero,
    formato: lista.opcionesImagen?.formato,
    ajustesImpresion,
  }
}

export function crearLienzoA4({ lista, roster, grupo, imagenes, crearLienzo, medirTexto }) {
  const fabricar = crearLienzo ?? (() => document.createElement('canvas'))
  const lienzo = fabricar()
  const plano = maquetarA4(lista, roster, grupo, medirTexto)
  lienzo.width = plano.ancho
  lienzo.height = plano.alto
  const contexto = lienzo.getContext('2d')
  contexto.fillStyle = COLORES.fondo
  contexto.fillRect(0, 0, plano.ancho, plano.alto)

  const lienzoContenido = fabricar()
  pintar(lienzoContenido.getContext('2d'), plano.contenido, imagenes, 1)
  contexto.drawImage(
    lienzoContenido,
    plano.x,
    plano.y,
    plano.contenido.ancho * plano.escala,
    plano.contenido.alto * plano.escala,
  )
  return { lienzo, plano }
}

export function nombreDeArchivoA4(lista, grupo) {
  const cancha = String(grupo.cancha ?? `cancha-${grupo.numero}`).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return `futbol-sin-barreras-${lista.fecha}-${cancha}-a4.png`
}
