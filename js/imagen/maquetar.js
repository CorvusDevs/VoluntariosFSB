import {
  ANCHO, COLORES, COLUMNAS, FUENTES, GRILLA, anchoDeCelda, anchoDeCeldaGrilla, anchoParaColumnas, columnasNecesarias, medidas, RETRATOS, ESQUINA_POR_DEFECTO, esDerecha, esAbajo, ajustarTexto, anchoDeCeldaRetratos,
} from './tema.js'
import { formatearFechaLarga } from '../util/fechas.js'
import { FORMATO_POR_DEFECTO } from '../modelo/lista.js'
import { iniciales } from '../util/nombres.js'

const RELACION_RECORTE = 2.5

export function maquetar(lista, roster, opciones = {}) {
  const { saludo = '', despedida = '', medirTexto } = opciones
  if (typeof medirTexto !== 'function') {
    throw new Error('maquetar necesita una funcion medirTexto(texto, fuente)')
  }

  const compacto = Boolean(lista.opcionesImagen?.compacto)
  const conFotos = Boolean(lista.opcionesImagen?.fotos) && medidas(compacto).mostrarFotos
  const base = medidas(compacto)
  const porId = indexar(roster)

  // Tres formatos: apilado, una fila por participante; en columnas, dos por fila;
  // y grilla, con la foto vertical y el nombre debajo, y retratos, con los nombres
  // adentro de la foto. La cabecera, los titulos, los apoyos y las bandas son
  // iguales en todos: lo unico que cambia es el cuerpo del grupo.
  // Una lista guardada antes de que existieran los formatos, o con un valor que
  // no reconocemos, sale en el formato por defecto en lugar de fallar.
  // Los validos salen del despachador y no de una lista escrita a mano, porque
  // esa lista ya se quedo atras una vez y dejo un formato elegible pero muerto.
  const formato = Object.prototype.hasOwnProperty.call(CUERPOS, lista.opcionesImagen?.formato ?? '')
    ? lista.opcionesImagen.formato
    : FORMATO_POR_DEFECTO

  // La grilla ensancha la imagen en vez de estirarla hacia abajo cuando hay mas
  // participantes: se agregan columnas y la celda mantiene su tamaño, asi la cara
  // no se achica dentro del archivo. Los otros dos formatos conservan el ancho fijo.
  const masPobladoDelGrupo = Math.max(1, ...lista.grupos.map((g) => g.filas.length))
  const columnasGrilla = columnasNecesarias(masPobladoDelGrupo)
  const ensancha = formato === 'grilla' || formato === 'retratos'
  const ancho = ensancha ? anchoParaColumnas(columnasGrilla, base.margen) : ANCHO
  const m = {
    ...base, ancho, columnasGrilla, columnasRetratos: columnasGrilla,
    esquinaVoluntario: lista.opcionesImagen?.esquinaVoluntario ?? ESQUINA_POR_DEFECTO,
  }

  const ordenes = []
  let y = 0

  y = bandaSuperior(ordenes, lista, m, y)

  if (lista.opcionesImagen?.saludo && saludo.trim()) {
    y = parrafo(ordenes, saludo, m, y, medirTexto)
  }

  lista.grupos.forEach((grupo, i) => {
    if (i > 0) y += m.espacioEntreGrupos
    y = tituloGrupo(ordenes, grupo, m, y)
    // Aire entre el rotulo del grupo y la primera fila. Va aca y no adentro de
    // cada cuerpo para que los tres formatos respiren igual: el apilado y el de
    // columnas heredaban unos 10 px de tener el contenido centrado en la celda,
    // y la grilla arrancaba pegada al titulo porque la foto empieza justo arriba.
    y += m.espacioBajoTitulo
    y = CUERPOS[formato](ordenes, grupo, porId, m, y, conFotos, medirTexto)
    if (grupo.apoyo?.length) {
      y = lineaApoyo(ordenes, grupo, porId, m, y)
    }
  })

  if (lista.opcionesImagen?.despedida && despedida.trim()) {
    y = parrafo(ordenes, despedida, m, y, medirTexto)
  }

  y += m.margen / 2
  const alto = y + m.altoBandaInferior
  bandaInferior(ordenes, m, y, alto)

  const bordeDerecho = ordenes.reduce((maximo, o) => {
    if (o.tipo === 'rect' && o.x === 0 && o.ancho === m.ancho) return maximo
    if (o.tipo === 'texto') {
      const ancho = medirTexto(o.texto, o.fuente)
      const inicio = o.alineacion === 'right' ? o.x - ancho
        : o.alineacion === 'center' ? o.x - ancho / 2
        : o.x
      return Math.max(maximo, inicio + ancho)
    }
    if (o.tipo === 'rect' || o.tipo === 'imagen') return Math.max(maximo, o.x + o.ancho)
    if (o.tipo === 'circulo') return Math.max(maximo, o.x + o.radio)
    if (o.tipo === 'linea') return Math.max(maximo, Math.max(o.x1, o.x2))
    return maximo
  }, 0)

  const relacion = alto / m.ancho
  return {
    ancho: m.ancho, alto, ordenes, relacion,
    recorteProbable: relacion > RELACION_RECORTE,
    bordeDerecho, desborde: bordeDerecho > m.ancho - m.margen,
  }
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

// Convencion: cada ayudante agrega su propio espacio superior y devuelve el borde inferior ocupado. Quien llama nunca agrega relleno.
function bandaSuperior(ordenes, lista, m, y) {
  const alto = m.altoBandaSuperior
  ordenes.push({ tipo: 'rect', x: 0, y, ancho: m.ancho, alto, color: COLORES.violeta })
  ordenes.push({
    tipo: 'imagen', clave: 'logo', x: m.ancho - m.margen - m.logoAncho, y: y + m.logoY,
    ancho: m.logoAncho, alto: m.logoAlto, circular: false,
  })
  ordenes.push({
    tipo: 'texto', texto: 'Fútbol sin Barreras', x: m.margen, y: y + alto - m.yTituloDesdeAbajo,
    fuente: FUENTES.titulo(m.pxTitular), color: COLORES.blanco, lineaBase: 'top',
  })
  const sub = `${formatearFechaLarga(lista.fecha)} · ${lista.hora} h · ${lista.lugar}`
  ordenes.push({
    tipo: 'texto', texto: sub, x: m.margen, y: y + alto - m.ySubtituloDesdeAbajo,
    fuente: FUENTES.normal(m.pxBanda), color: COLORES.violetaClaro, lineaBase: 'top',
  })
  return y + alto
}

function bandaInferior(ordenes, m, y, alto) {
  ordenes.push({ tipo: 'rect', x: 0, y, ancho: m.ancho, alto: alto - y, color: COLORES.violeta })
  const centro = y + (alto - y) / 2
  ordenes.push({
    tipo: 'texto', texto: 'aletea.org', x: m.margen, y: centro,
    fuente: FUENTES.normal(m.pxBanda), color: COLORES.violetaClaro, lineaBase: 'middle',
  })
  ordenes.push({
    tipo: 'texto', texto: '@futbol_sinbarreras', x: m.ancho - m.margen, y: centro,
    fuente: FUENTES.normal(m.pxBanda), color: COLORES.blanco,
    alineacion: 'right', lineaBase: 'middle',
  })
}

function parrafo(ordenes, texto, m, y, medirTexto) {
  const anchoUtil = m.ancho - m.margen * 2
  const fuente = FUENTES.normal(m.pxParrafo)
  const lineas = quebrar(texto, anchoUtil, fuente, medirTexto)
  const altoLinea = Math.round(m.pxParrafo * 1.6)
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
  const lineas = []
  texto.split('\n').forEach((parrafoSuelto) => {
    const palabras = parrafoSuelto.split(/\s+/).filter(Boolean)
    if (palabras.length === 0) return
    let actual = ''
    palabras.forEach((palabra) => {
      const intento = actual ? `${actual} ${palabra}` : palabra
      if (actual && medirTexto(intento, fuente) > anchoMaximo) {
        lineas.push(...partirLarga(actual, anchoMaximo, fuente, medirTexto))
        actual = palabra
      } else {
        actual = intento
      }
    })
    if (actual) lineas.push(...partirLarga(actual, anchoMaximo, fuente, medirTexto))
  })
  return lineas
}

function partirLarga(linea, anchoMaximo, fuente, medirTexto) {
  if (medirTexto(linea, fuente) <= anchoMaximo) return [linea]
  const partes = []
  let resto = [...linea]
  while (resto.length > 0) {
    let corte = resto.length
    while (corte > 1 && medirTexto(resto.slice(0, corte).join(''), fuente) > anchoMaximo) {
      corte -= 1
    }
    partes.push(resto.slice(0, corte).join(''))
    resto = resto.slice(corte)
  }
  return partes
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
    tipo: 'rect', x: m.margen, y: arriba, ancho: m.ancho - m.margen * 2,
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
      tipo: 'texto', texto: grupo.cancha, x: m.ancho - m.margen - 24, y: centro,
      fuente: FUENTES.normal(m.pxTituloGrupo - 2), color: c.fuerte,
      alineacion: 'right', lineaBase: 'middle',
    })
  }
  return arriba + alto
}

function filaDeAsignacion(ordenes, fila, porId, m, y, conFotos, medirTexto, numeroGrupo) {
  const participantes = fila.participantes.map((id) => buscar(porId, id))
  const voluntarios = fila.voluntarios.map((id) => buscar(porId, id))
  if (participantes.length === 0) {
    throw new Error('Una fila no tiene ningun participante')
  }
  const clave = fila.participantes[0]
  const centro = y + m.altoFila / 2
  let x = m.margen

  if (conFotos) {
    const primero = participantes[0]
    ordenes.push({
      tipo: 'circulo', x: x + m.avatar / 2, y: centro, radio: m.avatar / 2,
      color: colorDeGrupo(numeroGrupo).tenue, fila: clave,
    })
    ordenes.push({
      tipo: 'texto', texto: iniciales(primero.nombre), x: x + m.avatar / 2, y: centro,
      fuente: FUENTES.titulo(Math.round(m.avatar * m.factorIniciales)), color: COLORES.violeta,
      alineacion: 'center', lineaBase: 'middle', fila: clave,
    })
    if (primero.foto) {
      ordenes.push({
        tipo: 'imagen', clave: primero.foto, x, y: centro - m.avatar / 2,
        ancho: m.avatar, alto: m.avatar, circular: true, fila: clave,
      })
    }
    x += m.avatar + 20
  }

  x = escribirNombres(ordenes, participantes, x, centro, m,
    FUENTES.titulo(m.pxNombre), COLORES.texto, clave, medirTexto, true)

  if (voluntarios.length > 0) {
    x = escribirSeparador(ordenes, '-', x, centro, m, clave, medirTexto)
    x = escribirNombres(ordenes, voluntarios, x, centro, m,
      FUENTES.normal(m.pxVoluntario), COLORES.magentaTexto, clave, medirTexto, true)
  }

  const abajo = y + m.altoFila
  ordenes.push({
    tipo: 'linea', x1: m.margen, y1: abajo, x2: m.ancho - m.margen, y2: abajo,
    color: COLORES.linea, fila: clave,
  })
  return abajo
}

// Grilla: cinco por fila, foto vertical redondeada y el nombre debajo. La celda
// mide lo mismo en todo el grupo, calculada a partir del nombre que mas renglones
// necesita, para que las fotos queden alineadas y no escalonadas.
const firmaDeVoluntarios = (fila) => (fila.voluntarios ?? []).join('|')

// Los que comparten voluntario quedan contiguos, para poder nombrarlo una sola
// vez entre ellos en lugar de repetirlo debajo de cada uno.
export function agruparPorVoluntario(filas) {
  const pendientes = [...filas]
  const salida = []
  while (pendientes.length > 0) {
    const actual = pendientes.shift()
    salida.push(actual)
    const firma = firmaDeVoluntarios(actual)
    if (!firma) continue
    const arrastradas = []
    for (let i = 0; i < pendientes.length; i += 1) {
      if (firmaDeVoluntarios(pendientes[i]) === firma) arrastradas.push(i)
    }
    arrastradas.reverse().forEach((i) => salida.push(...pendientes.splice(i, 1)))
  }
  return salida
}

// Tramos de celdas contiguas con el mismo voluntario que caen en la misma fila
// visual. Se corta en el borde de la fila: una llave no puede saltar de renglon.
function tramosCompartidos(celdas, columnas) {
  const tramos = []
  let inicio = 0
  while (inicio < celdas.length) {
    const firma = firmaDeVoluntarios(celdas[inicio].fila)
    let fin = inicio
    while (
      firma
      && fin + 1 < celdas.length
      && firmaDeVoluntarios(celdas[fin + 1].fila) === firma
      && Math.floor((fin + 1) / columnas) === Math.floor(inicio / columnas)
    ) fin += 1
    tramos.push({ inicio, fin, compartido: Boolean(firma) && fin > inicio })
    inicio = fin + 1
  }
  return tramos
}

function dibujarVoluntarios(ordenes, celdas, columnas, ancho, fuente, medirTexto) {
  tramosCompartidos(celdas, columnas).forEach((tramo) => {
    const primera = celdas[tramo.inicio]
    const clave = primera.fila.participantes[0]

    if (!tramo.compartido) {
      primera.lineasVoluntario.forEach((linea, n) => {
        ordenes.push({
          tipo: 'texto', texto: linea, x: primera.x + ancho / 2,
          y: primera.yVoluntario + n * GRILLA.pxVoluntario + GRILLA.pxVoluntario / 2,
          fuente, color: COLORES.magentaTexto,
          alineacion: 'center', lineaBase: 'middle', fila: clave,
        })
      })
      return
    }

    const abarcadas = celdas.slice(tramo.inicio, tramo.fin + 1)
    const izquierda = primera.x + ancho / 2
    const derecha = celdas[tramo.fin].x + ancho / 2
    // La llave se apoya en la mas baja de las celdas que abarca, para que ninguna
    // le quede por debajo cuando los nombres no ocupan lo mismo.
    const yLinea = Math.max(...abarcadas.map((c) => c.yVoluntario)) + GRILLA.aireLlave
    const texto = primera.lineasVoluntario.join(' ')
    const hueco = medirTexto(texto, fuente) / 2 + 12
    const medio = (izquierda + derecha) / 2

    const trazo = (x1, y1, x2, y2) => ordenes.push({
      tipo: 'linea', x1, y1, x2, y2,
      color: COLORES.magentaTexto, grosor: GRILLA.grosorLlave, fila: clave,
    })
    // Ganchos en L que suben hacia cada celda, y la linea partida al medio para
    // dejarle lugar al nombre.
    trazo(izquierda, yLinea - GRILLA.altoLlave, izquierda, yLinea)
    trazo(derecha, yLinea - GRILLA.altoLlave, derecha, yLinea)
    trazo(izquierda, yLinea, medio - hueco, yLinea)
    trazo(medio + hueco, yLinea, derecha, yLinea)

    ordenes.push({
      tipo: 'texto', texto, x: medio, y: yLinea,
      fuente, color: COLORES.magentaTexto,
      alineacion: 'center', lineaBase: 'middle', fila: clave,
    })
  })
}

function cuerpoEnGrilla(ordenes, grupo, porId, m, y, conFotos, medirTexto) {
  const columnas = m.columnasGrilla ?? GRILLA.porFila
  const ancho = anchoDeCeldaGrilla(m.margen)
  const altoFoto = Math.round(ancho * GRILLA.proporcionFoto)
  const fuenteNombre = FUENTES.titulo(GRILLA.pxNombre)
  const fuenteVoluntario = FUENTES.normal(GRILLA.pxVoluntario)

  const celdas = agruparPorVoluntario(grupo.filas).map((fila) => {
    const participantes = fila.participantes.map((id) => buscar(porId, id))
    if (participantes.length === 0) throw new Error('Una fila no tiene ningun participante')
    const voluntarios = fila.voluntarios.map((id) => buscar(porId, id))
    const nombre = participantes.map((p) => p.nombre).join(' / ')
    const acompanan = voluntarios.map((v) => v.nombre + (v.nuevo ? ' (nuevo)' : '')).join(' / ')
    return {
      fila,
      participantes,
      lineasNombre: quebrar(nombre, ancho, fuenteNombre, medirTexto),
      lineasVoluntario: acompanan ? quebrar(acompanan, ancho, fuenteVoluntario, medirTexto) : [],
    }
  })

  const maxNombre = Math.max(1, ...celdas.map((c) => c.lineasNombre.length))
  const maxVoluntario = Math.max(0, ...celdas.map((c) => c.lineasVoluntario.length))
  const altoTexto = maxNombre * GRILLA.pxNombre
    + (maxVoluntario > 0 ? GRILLA.espacioBajoNombre + maxVoluntario * GRILLA.pxVoluntario : 0)
  const altoCelda = (conFotos ? altoFoto + GRILLA.espacioBajoFoto : 0)
    + altoTexto + GRILLA.margenInferior

  let cursor = y
  celdas.forEach((celda, i) => {
    const columna = i % columnas
    const x = m.margen + columna * (ancho + GRILLA.separacion)
    const arriba = cursor
    const clave = celda.fila.participantes[0]
    let textoY = arriba

    if (conFotos) {
      const primero = celda.participantes[0]
      ordenes.push({
        tipo: 'rect', x, y: arriba, ancho, alto: altoFoto,
        color: colorDeGrupo(grupo.numero).tenue, radio: GRILLA.radioFoto, fila: clave,
      })
      ordenes.push({
        tipo: 'texto', texto: iniciales(primero.nombre), x: x + ancho / 2, y: arriba + altoFoto / 2,
        fuente: FUENTES.titulo(Math.round(ancho * GRILLA.factorIniciales)), color: COLORES.violeta,
        alineacion: 'center', lineaBase: 'middle', fila: clave,
      })
      if (primero.foto) {
        ordenes.push({
          tipo: 'imagen', clave: primero.foto, x, y: arriba, ancho, alto: altoFoto,
          radio: GRILLA.radioFoto, fila: clave,
        })
      }
      textoY = arriba + altoFoto + GRILLA.espacioBajoFoto
    }

    celda.lineasNombre.forEach((linea, n) => {
      ordenes.push({
        tipo: 'texto', texto: linea, x: x + ancho / 2, y: textoY + n * GRILLA.pxNombre + GRILLA.pxNombre / 2,
        fuente: fuenteNombre, color: COLORES.texto,
        alineacion: 'center', lineaBase: 'middle', fila: clave,
      })
    })
    // Pegado al nombre real de esta celda, no al alto uniforme del grupo: si se
    // usara maxNombre, un nombre de un renglon dejaba al voluntario flotando muy
    // abajo, como si no fuera con el. Se anota y se dibuja al final, cuando ya
    // se sabe que celdas comparten voluntario.
    celda.x = x
    celda.yVoluntario = textoY + celda.lineasNombre.length * GRILLA.pxNombre
      + GRILLA.espacioBajoNombre

    if (columna === columnas - 1 || i === celdas.length - 1) cursor += altoCelda
  })

  dibujarVoluntarios(ordenes, celdas, columnas, ancho, fuenteVoluntario, medirTexto)
  return cursor
}

// El medallon del voluntario: repite la receta de la celda grande, foto arriba y
// franja del color del grupo abajo con el nombre. Asi las dos piezas se leen como
// lo mismo, una grande y una chica.
function medallonDeVoluntario(ordenes, voluntario, x, y, ancho, alto, color, clave, medirTexto) {
  const borde = Math.max(2, Math.round(ancho * RETRATOS.bordeMedallon))
  const radio = Math.round(ancho * RETRATOS.radioMedallon)
  // El marco blanco despega el medallon de la foto de abajo aunque las dos sean
  // claras, que es lo unico que las separa cuando no hay sombra.
  ordenes.push({ tipo: 'rect', x, y, ancho, alto, color: COLORES.blanco, radio, fila: clave })

  const ix = x + borde, iy = y + borde
  const iAncho = ancho - borde * 2, iAlto = alto - borde * 2
  const radioInterno = Math.max(1, radio - Math.round(borde * 0.5))
  const franja = Math.round(iAlto * RETRATOS.franjaMedallon)

  if (voluntario.foto) {
    ordenes.push({ tipo: 'imagen', clave: voluntario.foto, x: ix, y: iy,
      ancho: iAncho, alto: iAlto, radio: radioInterno, fila: clave })
  } else {
    ordenes.push({ tipo: 'rect', x: ix, y: iy, ancho: iAncho, alto: iAlto,
      color: COLORES.violetaTenue, radio: radioInterno, fila: clave })
    ordenes.push({ tipo: 'texto', texto: iniciales(voluntario.nombre),
      x: ix + iAncho / 2, y: iy + (iAlto - franja) / 2,
      fuente: FUENTES.titulo(Math.round(iAncho * RETRATOS.factorInicialesMedallon)),
      color: COLORES.violeta, alineacion: 'center', lineaBase: 'middle', fila: clave })
  }

  ordenes.push({ tipo: 'rect', x: ix, y: iy + iAlto - franja, ancho: iAncho, alto: franja,
    color, fila: clave })
  const nombre = voluntario.nombre + (voluntario.nuevo ? ' (nuevo)' : '')
  const px = ajustarTexto(nombre, iAncho - borde * 2,
    Math.round(franja * RETRATOS.factorNombreMedallon), 7, FUENTES.normal, medirTexto)
  ordenes.push({ tipo: 'texto', texto: nombre, x: ix + iAncho / 2, y: iy + iAlto - franja / 2,
    fuente: FUENTES.normal(px), color: COLORES.blanco,
    alineacion: 'center', lineaBase: 'middle', fila: clave })
}

function cuerpoEnRetratos(ordenes, grupo, porId, m, y, conFotos, medirTexto) {
  const columnas = m.columnasRetratos ?? RETRATOS.porFila
  const ancho = anchoDeCeldaRetratos(m.margen)
  const alto = Math.round(ancho * RETRATOS.proporcionCelda)
  const altoCelda = alto + RETRATOS.margenInferior
  const color = colorDeGrupo(grupo.numero).fuerte
  const esquina = m.esquinaVoluntario ?? ESQUINA_POR_DEFECTO
  const derecha = esDerecha(esquina)
  const abajo = esAbajo(esquina)

  const pxBase = Math.round(ancho * RETRATOS.factorNombre)
  const aire = Math.round(ancho * RETRATOS.aireFranja)
  const altoFranja = aire * 2 + pxBase
  const anchoMed = Math.round(ancho * RETRATOS.factorMedallon)
  const altoMed = Math.round(anchoMed * RETRATOS.proporcionMedallon)
  const inset = Math.round(ancho * RETRATOS.insetMedallon)
  const paso = Math.round(altoMed * RETRATOS.pasoMedallon)

  let cursor = y
  grupo.filas.forEach((fila, i) => {
    const columna = i % columnas
    const x = m.margen + columna * (ancho + RETRATOS.separacion)
    const arriba = cursor
    const clave = fila.participantes[0]
    const participantes = fila.participantes.map((id) => buscar(porId, id))
    if (participantes.length === 0) throw new Error('Una fila no tiene ningun participante')
    const voluntarios = fila.voluntarios.map((id) => buscar(porId, id))

    const primero = participantes[0]
    ordenes.push({ tipo: 'rect', x, y: arriba, ancho, alto,
      color: colorDeGrupo(grupo.numero).tenue, radio: RETRATOS.radioFoto, fila: clave })
    if (conFotos && primero.foto) {
      ordenes.push({ tipo: 'imagen', clave: primero.foto, x, y: arriba, ancho, alto,
        radio: RETRATOS.radioFoto, fila: clave })
    } else {
      ordenes.push({ tipo: 'texto', texto: iniciales(primero.nombre),
        x: x + ancho / 2, y: arriba + (alto - altoFranja) / 2,
        fuente: FUENTES.titulo(Math.round(ancho * GRILLA.factorIniciales)),
        color: COLORES.violeta, alineacion: 'center', lineaBase: 'middle', fila: clave })
    }

    // Con el medallon abajo, el nombre se corre al lado libre para dejarle el
    // hueco. Es la unica diferencia real entre elegir una esquina de arriba y una
    // de abajo, y le quita al nombre casi la mitad del ancho.
    const hueco = abajo ? anchoMed + inset * 2 : 0
    const anchoNombre = ancho - hueco - inset * 2
    const centro = abajo
      ? (derecha ? x + inset + anchoNombre / 2 : x + ancho - inset - anchoNombre / 2)
      : x + ancho / 2

    ordenes.push({ tipo: 'rect', x, y: arriba + alto - altoFranja, ancho, alto: altoFranja,
      color, fila: clave })
    // Si ni achicado entra, se muestra solo el primer nombre: un renglon de mas
    // empujaria la franja hacia la cara del chico, que es lo unico que no queremos tapar.
    let nombre = participantes.map((p) => p.nombre).join(' / ')
    let px = ajustarTexto(nombre, anchoNombre, pxBase, Math.round(pxBase * RETRATOS.pisoNombre),
      FUENTES.titulo, medirTexto)
    if (medirTexto(nombre, FUENTES.titulo(px)) > anchoNombre) {
      nombre = nombre.split(' ')[0]
      px = ajustarTexto(nombre, anchoNombre, pxBase, Math.round(pxBase * RETRATOS.pisoNombre),
        FUENTES.titulo, medirTexto)
    }
    ordenes.push({ tipo: 'texto', texto: nombre, x: centro, y: arriba + alto - altoFranja / 2,
      fuente: FUENTES.titulo(px), color: COLORES.blanco,
      alineacion: 'center', lineaBase: 'middle', fila: clave })

    voluntarios.forEach((voluntario, n) => {
      const mx = derecha ? x + ancho - inset - anchoMed : x + inset
      // Abajo se ancla al borde inferior de la celda, no al centro de la franja:
      // anclado a la franja el medallon sobresalia por debajo de la celda y se
      // superponia con la fila siguiente de la grilla.
      const base = abajo
        ? arriba + alto - inset - altoMed
        : arriba + inset
      const my = abajo ? base - paso * n : base + paso * n
      medallonDeVoluntario(ordenes, voluntario, mx, my, anchoMed, altoMed, color, clave, medirTexto)
    })

    if (columna === columnas - 1 || i === grupo.filas.length - 1) cursor += altoCelda
  })
  return cursor
}

function cuerpoApilado(ordenes, grupo, porId, m, y, conFotos, medirTexto) {
  let cursor = y
  grupo.filas.forEach((fila) => {
    cursor = filaDeAsignacion(ordenes, fila, porId, m, cursor, conFotos, medirTexto, grupo.numero)
  })
  return cursor
}

function cuerpoEnColumnas(ordenes, grupo, porId, m, y, conFotos, medirTexto) {
  const ancho = anchoDeCelda(m.margen, m.ancho)
  let cursor = y
  grupo.filas.forEach((fila, i) => {
    const izquierda = i % 2 === 0
    const x = izquierda ? m.margen : m.margen + ancho + COLUMNAS.separacion
    if (izquierda) cursor += 0
    celdaDeAsignacion(ordenes, fila, porId, m, x, cursor, ancho, conFotos, medirTexto, grupo.numero)
    if (!izquierda || i === grupo.filas.length - 1) cursor += COLUMNAS.altoCelda
  })
  return cursor
}

const CUERPOS = {
  filas: cuerpoApilado,
  columnas: cuerpoEnColumnas,
  grilla: cuerpoEnGrilla,
  retratos: cuerpoEnRetratos,
}

function celdaDeAsignacion(ordenes, fila, porId, m, x, y, ancho, conFotos, medirTexto, numeroGrupo) {
  const participantes = fila.participantes.map((id) => buscar(porId, id))
  if (participantes.length === 0) throw new Error('Una fila no tiene ningun participante')
  const voluntarios = fila.voluntarios.map((id) => buscar(porId, id))
  const clave = fila.participantes[0]
  const centro = y + COLUMNAS.altoCelda / 2
  let textoX = x

  if (conFotos) {
    const primero = participantes[0]
    const arriba = centro - COLUMNAS.avatar / 2
    ordenes.push({
      tipo: 'circulo', x: x + COLUMNAS.avatar / 2, y: centro, radio: COLUMNAS.avatar / 2,
      color: colorDeGrupo(numeroGrupo).tenue, fila: clave,
    })
    ordenes.push({
      tipo: 'texto', texto: iniciales(primero.nombre), x: x + COLUMNAS.avatar / 2, y: centro,
      fuente: FUENTES.titulo(Math.round(COLUMNAS.avatar * COLUMNAS.factorIniciales)),
      color: COLORES.violeta, alineacion: 'center', lineaBase: 'middle', fila: clave,
    })
    if (primero.foto) {
      ordenes.push({
        tipo: 'imagen', clave: primero.foto, x, y: arriba,
        ancho: COLUMNAS.avatar, alto: COLUMNAS.avatar, circular: true, fila: clave,
      })
    }
    textoX = x + COLUMNAS.avatar + COLUMNAS.espacioAvatar
  }

  // Con la foto grande el renglon no entra al lado, asi que el nombre va arriba
  // y quien lo acompaña justo debajo. Se sigue leyendo de a pares.
  const hayVoluntarios = voluntarios.length > 0
  const yNombre = hayVoluntarios ? centro - 16 : centro
  ordenes.push({
    tipo: 'texto', texto: participantes.map((p) => p.nombre).join(' / '),
    x: textoX, y: yNombre,
    fuente: FUENTES.titulo(COLUMNAS.pxNombre), color: COLORES.texto,
    lineaBase: 'middle', fila: clave,
  })
  if (hayVoluntarios) {
    const nombres = voluntarios.map((v) => v.nombre + (v.nuevo ? ' (nuevo)' : '')).join(' / ')
    ordenes.push({
      tipo: 'texto', texto: nombres, x: textoX, y: centro + 20,
      fuente: FUENTES.normal(COLUMNAS.pxVoluntario), color: COLORES.magentaTexto,
      lineaBase: 'middle', fila: clave,
    })
  }

  ordenes.push({
    tipo: 'linea', x1: x, y1: y + COLUMNAS.altoCelda, x2: x + ancho, y2: y + COLUMNAS.altoCelda,
    color: COLORES.linea, fila: clave,
  })
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
    tipo: 'rect', x: m.margen, y: arriba, ancho: m.ancho - m.margen * 2,
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
