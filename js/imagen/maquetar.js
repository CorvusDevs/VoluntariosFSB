import {
  ANCHO, COLORES, COLUMNAS, FUENTES, GRILLA, anchoDeCelda, anchoDeCeldaGrilla, anchoParaColumnas, columnasNecesarias, medidas, RETRATOS, ESQUINA_POR_DEFECTO, esDerecha, esAbajo, ajustarTexto, anchoDeCeldaRetratos, medidasRetratos, TAMANO_POR_DEFECTO, ASOMO_POR_DEFECTO, esSuperpuesto,
} from './tema.js'
import { formatearFechaLarga } from '../util/fechas.js'
import { FORMATO_POR_DEFECTO } from '../modelo/lista.js'
import { iniciales, abreviarApellido, crearAbreviador } from '../util/nombres.js'

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
  // Los apellidos se abrevian contra el resto de su propia lista: chicos con
  // chicos y voluntarios con voluntarios. Asi dos Francisco P. distintos salen
  // como Francisco Pl. y Francisco Pe. en vez de quedar iguales en la planilla.
  const abreviar = {
    participante: crearAbreviador(roster.participantes.map((p) => p.nombre)),
    voluntario: crearAbreviador(roster.voluntarios.map((v) => v.nombre)),
  }

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
  const esquinaVoluntario = lista.opcionesImagen?.esquinaVoluntario ?? ESQUINA_POR_DEFECTO
  const tamanoVoluntario = lista.opcionesImagen?.tamanoVoluntario ?? TAMANO_POR_DEFECTO
  const asomoVoluntario = lista.opcionesImagen?.asomoVoluntario ?? ASOMO_POR_DEFECTO
  // Retratos con el medallon superpuesto separa mas las columnas para que dos
  // medallones no se pisen, asi que su ancho no es el mismo que el de la grilla.
  // El formato con el voluntario debajo no tiene medallon que sobresalga, asi que
  // sus columnas no necesitan separarse de mas: se le pasa una esquina de las de
  // adentro para que la geometria salga con la separacion normal.
  const retratos = medidasRetratos({
    margen: base.margen, columnas: columnasGrilla,
    esquina: formato === 'retratos-nombre' ? ESQUINA_POR_DEFECTO : esquinaVoluntario,
    tamano: tamanoVoluntario, asomo: asomoVoluntario,
  })
  let ancho = ANCHO
  if (formato === 'grilla') ancho = anchoParaColumnas(columnasGrilla, base.margen)
  else if (formato === 'retratos' || formato === 'retratos-nombre') ancho = retratos.anchoImagen
  const m = {
    ...base, ancho, columnasGrilla, columnasRetratos: columnasGrilla,
    esquinaVoluntario, tamanoVoluntario, asomoVoluntario, retratos, abreviar,
  }

  const ordenes = []
  let y = 0

  y = bandaSuperior(ordenes, lista, m, y, medirTexto)

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
  bandaInferior(ordenes, m, y, alto, medirTexto)

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
    if (o.tipo === 'icono') return Math.max(maximo, o.x + o.lado)
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
function bandaSuperior(ordenes, lista, m, y, medirTexto) {
  const alto = m.altoBandaSuperior
  const titulo = 'Fútbol sin Barreras'
  const fuenteTitulo = FUENTES.titulo(m.pxTitular)
  ordenes.push({ tipo: 'rect', x: 0, y, ancho: m.ancho, alto, color: COLORES.violeta })
  ordenes.push({
    tipo: 'imagen', clave: 'logo', x: m.ancho - m.margen - m.logoAncho, y: y + m.logoY,
    ancho: m.logoAncho, alto: m.logoAlto, circular: false,
  })
  ordenes.push({
    tipo: 'texto', texto: titulo, x: m.margen, y: y + alto - m.yTituloDesdeAbajo,
    fuente: fuenteTitulo, color: COLORES.blanco, lineaBase: 'top',
  })
  const ladoPelota = Math.round(m.pxTitular * 0.54)
  ordenes.push({ tipo: 'imagen', clave: 'icono-pelota', x: m.margen + medirTexto(titulo, fuenteTitulo) + 18, y: y + alto - m.yTituloDesdeAbajo + 12, ancho: ladoPelota, alto: ladoPelota })
  const sub = `${formatearFechaLarga(lista.fecha)} · ${lista.hora} h · ${lista.lugar}`
  ordenes.push({
    tipo: 'texto', texto: sub, x: m.margen, y: y + alto - m.ySubtituloDesdeAbajo,
    fuente: FUENTES.normal(m.pxBanda), color: COLORES.violetaClaro, lineaBase: 'top',
  })
  return y + alto
}

function bandaInferior(ordenes, m, y, alto, medirTexto) {
  ordenes.push({ tipo: 'rect', x: 0, y, ancho: m.ancho, alto: alto - y, color: COLORES.violeta })
  const centro = y + (alto - y) / 2
  const fuente = FUENTES.normal(m.pxBanda)
  // El icono acompaña al texto y no lo pisa: mismo alto que la letra y un
  // respiro proporcional, asi la banda aguanta el modo compacto sin retoques.
  const lado = Math.round(m.pxBanda * 0.95)
  const aire = Math.round(m.pxBanda * 0.45)
  const arriba = Math.round(centro - lado / 2)

  ordenes.push({
    tipo: 'icono', nombre: 'globo', x: m.margen, y: arriba, lado, color: COLORES.violetaClaro,
  })
  ordenes.push({
    tipo: 'texto', texto: 'aletea.org', x: m.margen + lado + aire, y: centro,
    fuente, color: COLORES.violetaClaro, lineaBase: 'middle',
  })

  const handle = '@futbol_sinbarreras'
  const derecha = m.ancho - m.margen
  ordenes.push({
    tipo: 'texto', texto: handle, x: derecha, y: centro,
    fuente, color: COLORES.blanco, alineacion: 'right', lineaBase: 'middle',
  })
  ordenes.push({
    tipo: 'icono', nombre: 'instagram',
    x: derecha - medirTexto(handle, fuente) - aire - lado, y: arriba,
    lado, color: COLORES.blanco,
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
    const lado = Math.round(m.pxVoluntario * 0.92)
    ordenes.push({ tipo: 'imagen', clave: 'icono-voluntario', x, y: centro - lado / 2, ancho: lado, alto: lado, fila: clave })
    x += lado + 10
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
        const lado = n === 0 ? Math.round(GRILLA.pxVoluntario) : 0
        const aire = lado ? 8 : 0
        const centroEtiqueta = primera.x + ancho / 2
        if (lado) ordenes.push({ tipo: 'imagen', clave: 'icono-voluntario', x: centroEtiqueta - medirTexto(linea, fuente) / 2 - lado - aire, y: primera.yVoluntario + n * GRILLA.pxVoluntario - (lado - GRILLA.pxVoluntario) / 2, ancho: lado, alto: lado, fila: clave })
        ordenes.push({
          tipo: 'texto', texto: linea, x: centroEtiqueta,
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
    const lado = Math.round(GRILLA.pxVoluntario)
    const aire = 8
    const anchoTexto = medirTexto(texto, fuente)
    const hueco = anchoTexto / 2 + lado + aire + 12
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

    ordenes.push({ tipo: 'imagen', clave: 'icono-voluntario', x: medio - anchoTexto / 2 - lado - aire, y: yLinea - lado / 2, ancho: lado, alto: lado, fila: clave })

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
function medallonDeVoluntario(ordenes, voluntario, x, y, ancho, alto, color, clave, medirTexto, corto = abreviarApellido) {
  const borde = Math.max(2, Math.round(ancho * RETRATOS.bordeMedallon))
  const radio = Math.round(ancho * RETRATOS.radioMedallon)
  // El marco blanco despega el medallon de la foto de abajo aunque las dos sean
  // claras, que es lo unico que las separa cuando no hay sombra.
  ordenes.push({ tipo: 'rect', x, y, ancho, alto, color: COLORES.blanco, radio, fila: clave })

  const ix = x + borde, iy = y + borde
  const iAncho = ancho - borde * 2, iAlto = alto - borde * 2
  const radioInterno = Math.max(1, radio - Math.round(borde * 0.5))
  const franja = Math.round(iAlto * RETRATOS.franjaMedallon)

  // Las iniciales van SIEMPRE, y la foto encima si la hay. Antes eran excluyentes,
  // y cuando la foto no llegaba a dibujarse el medallon quedaba en blanco, sin
  // decir de quien era. Con las iniciales debajo, lo peor que puede pasar es que
  // se vean las iniciales, que es exactamente lo que se muestra cuando no hay foto.
  ordenes.push({ tipo: 'rect', x: ix, y: iy, ancho: iAncho, alto: iAlto,
    color: COLORES.violetaTenue, radio: radioInterno, fila: clave })
  ordenes.push({ tipo: 'texto', texto: iniciales(voluntario.nombre),
    x: ix + iAncho / 2, y: iy + (iAlto - franja) / 2,
    fuente: FUENTES.titulo(Math.round(iAncho * RETRATOS.factorInicialesMedallon)),
    color: COLORES.violeta, alineacion: 'center', lineaBase: 'middle', fila: clave })
  if (voluntario.foto) {
    ordenes.push({ tipo: 'imagen', clave: voluntario.foto, x: ix, y: iy,
      ancho: iAncho, alto: iAlto, radio: radioInterno, fila: clave })
  }

  ordenes.push({ tipo: 'rect', x: ix, y: iy + iAlto - franja, ancho: iAncho, alto: franja,
    color, radio: [0, 0, radioInterno, radioInterno], fila: clave })
  const nombre = corto(voluntario.nombre) + (voluntario.nuevo ? ' (nuevo)' : '')
  // Aire propio: con el borde del marco como unico margen, el nombre quedaba
  // tocando los dos costados del medallon.
  const pad = Math.round(iAncho * RETRATOS.padNombreMedallon)
  const px = ajustarTexto(nombre, iAncho - pad * 2,
    Math.round(franja * RETRATOS.factorNombreMedallon), 7, FUENTES.normal, medirTexto)
  ordenes.push({ tipo: 'texto', texto: nombre, x: ix + iAncho / 2, y: iy + iAlto - franja / 2,
    fuente: FUENTES.normal(px), color: COLORES.blanco,
    alineacion: 'center', lineaBase: 'middle', fila: clave })
}

function cuerpoEnRetratos(ordenes, grupo, porId, m, y, conFotos, medirTexto) {
  const columnas = m.columnasRetratos ?? RETRATOS.porFila
  const esquina = m.esquinaVoluntario ?? ESQUINA_POR_DEFECTO
  const medidas = m.retratos ?? medidasRetratos({
    margen: m.margen, columnas, esquina,
    tamano: m.tamanoVoluntario, asomo: m.asomoVoluntario,
  })
  const { celda: ancho, alto, altoCelda, anchoMed, altoMed, asoma, asomaLado, separacion, superpuesto } = medidas
  const color = colorDeGrupo(grupo.numero).fuerte
  const derecha = esDerecha(esquina)
  const abajo = esAbajo(esquina)

  const pxBase = Math.round(ancho * RETRATOS.factorNombre)
  const aire = Math.round(ancho * RETRATOS.aireFranja)
  const altoFranja = aire * 2 + pxBase
  const inset = Math.round(ancho * RETRATOS.insetMedallon)
  const paso = Math.round(altoMed * RETRATOS.pasoMedallon)

  // El sobresalido se reserva por renglon y solo donde de verdad hay medallones.
  // Reservarlo siempre dejaba 76 px muertos en cada renglon: en una planilla de
  // 18 chicos con un solo acompañante eran 304 px, el 16% del alto de la imagen.
  const renglonDe = (i) => Math.floor(i / columnas)
  const conMedallon = grupo.filas.reduce((acc, fila, i) => {
    const r = renglonDe(i)
    acc[r] = acc[r] || fila.voluntarios.length > 0
    return acc
  }, [])
  const asomaEn = (i) => (superpuesto && conMedallon[renglonDe(i)] ? asoma : 0)

  let cursor = y
  grupo.filas.forEach((fila, i) => {
    const columna = i % columnas
    const x = m.margen + columna * (ancho + separacion)
    const asomaFila = asomaEn(i)
    // Superpuesto arriba, la celda baja para dejarle lugar al medallon que asoma por
    // encima. Superpuesto abajo, lo que asoma cae por debajo y la celda no se mueve.
    const arriba = cursor + (superpuesto && !abajo ? asomaFila : 0)
    const clave = fila.participantes[0]
    const participantes = fila.participantes.map((id) => buscar(porId, id))
    if (participantes.length === 0) throw new Error('Una fila no tiene ningun participante')
    const voluntarios = fila.voluntarios.map((id) => buscar(porId, id))

    // El hueco solo existe si esta fila tiene a alguien acompañando y el medallon
    // va abajo. Reservarlo siempre dejaba a los chicos sin voluntario con el
    // nombre corrido contra el borde, sin nada que lo justificara.
    const hueco = abajo && voluntarios.length > 0
      ? (superpuesto ? anchoMed - asomaLado + inset : anchoMed + inset * 2)
      : 0
    dibujarRetrato(ordenes, {
      x, arriba, ancho, alto, altoFranja, color, clave, participantes,
      grupo, conFotos, medirTexto, hueco, derecha,
      corto: m.abreviar?.participante ?? abreviarApellido,
    })

    voluntarios.forEach((voluntario, n) => {
      // Superpuesto: pegado al borde de la celda y corrido hacia afuera, arrancando
      // por encima del techo. Apoyado: adentro, separado del borde por el inset.
      const mx = superpuesto
        ? (derecha ? x + ancho - anchoMed + asomaLado : x - asomaLado)
        : (derecha ? x + ancho - inset - anchoMed : x + inset)
      // Anclar el medallon de abajo al centro de la franja lo hacia sobresalir
      // por debajo de la celda y meterse en la fila siguiente, asi que va contra
      // el borde inferior.
      const base = superpuesto
        ? (abajo ? arriba + alto + asomaFila - altoMed : arriba - asomaFila)
        : (abajo ? arriba + alto - inset - altoMed : arriba + inset)
      // Con el medallon abajo la pila sube, para no salirse por el pie.
      const my = abajo ? base - paso * n : base + paso * n
      medallonDeVoluntario(ordenes, voluntario, mx, my, anchoMed, altoMed, color, clave, medirTexto,
        m.abreviar?.voluntario ?? abreviarApellido)
    })

    // El alto del renglon sale de lo que ese renglon necesita, no de un maximo
    // fijo para todo el grupo. Y el aire entre renglones es el mismo que deja el
    // titulo arriba: con 12 px contra 20 los renglones quedaban pegados entre si
    // y despegados del titulo, que se leia como un error de alineacion.
    //
    // Despues del ULTIMO renglon no va: ahi ya ponen lo suyo la separacion entre
    // grupos y el margen del titulo siguiente. Sumandolo igual daban 92 px al pie
    // de cada grupo contra 20 entre renglones, que es lo que se veia como un
    // hueco muerto.
    const ultimo = i === grupo.filas.length - 1
    if (columna === columnas - 1 || ultimo) {
      cursor += alto + asomaFila + (ultimo ? 0 : m.espacioBajoTitulo)
    }
  })
  return cursor
}

// La celda de Retratos: la foto ocupa todo y el nombre del chico va adentro, al
// pie, sobre una franja del color del grupo. La comparten los dos formatos que
// la usan, para que no se separen con el tiempo.
function dibujarRetrato(ordenes, {
  x, arriba, ancho, alto, altoFranja, color, clave, participantes,
  grupo, conFotos, medirTexto, hueco = 0, derecha = true, corto = abreviarApellido,
}) {
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

  const pad = Math.round(ancho * RETRATOS.padNombre)
  const anchoNombre = ancho - hueco - pad * 2
  const centro = hueco > 0
    ? (derecha ? x + pad + anchoNombre / 2 : x + ancho - pad - anchoNombre / 2)
    : x + ancho / 2

  // Las esquinas de abajo van redondeadas igual que la foto: dibujada como
  // rectangulo recto, la franja le cuadraba las dos esquinas inferiores a todas
  // las celdas. El orden es arriba-izq, arriba-der, abajo-der, abajo-izq.
  ordenes.push({ tipo: 'rect', x, y: arriba + alto - altoFranja, ancho, alto: altoFranja,
    color, radio: [0, 0, RETRATOS.radioFoto, RETRATOS.radioFoto], fila: clave })
  const pxBase = Math.round(ancho * RETRATOS.factorNombre)
  const nombre = participantes.map((p) => corto(p.nombre)).join(' / ')
  const px = ajustarTexto(nombre, anchoNombre, pxBase, Math.round(pxBase * RETRATOS.pisoNombre),
    FUENTES.titulo, medirTexto)
  ordenes.push({ tipo: 'texto', texto: nombre, x: centro, y: arriba + alto - altoFranja / 2,
    fuente: FUENTES.titulo(px), color: COLORES.blanco,
    alineacion: 'center', lineaBase: 'middle', fila: clave })
}

// La celda de Retratos con el voluntario escrito debajo, como en la grilla, en
// vez de como medallon sobre la foto. Sirve cuando importa que el nombre de quien
// acompaña se lea de corrido, y cuando un mismo voluntario cubre a varios chicos:
// ahi reaparece la llave en L de la grilla, que los agrupa nombrandolo una sola vez.
function cuerpoEnRetratosConNombre(ordenes, grupo, porId, m, y, conFotos, medirTexto) {
  const columnas = m.columnasRetratos ?? RETRATOS.porFila
  const medidas = m.retratos ?? medidasRetratos({ margen: m.margen, columnas })
  const { celda: ancho, alto, separacion } = medidas
  const color = colorDeGrupo(grupo.numero).fuerte
  const aire = Math.round(ancho * RETRATOS.aireFranja)
  const altoFranja = aire * 2 + Math.round(ancho * RETRATOS.factorNombre)
  const fuenteVoluntario = FUENTES.normal(GRILLA.pxVoluntario)
  const corto = m.abreviar?.participante ?? abreviarApellido
  const cortoVol = m.abreviar?.voluntario ?? abreviarApellido

  // Agrupadas por voluntario, como en la grilla: los chicos que comparten
  // acompañante quedan uno al lado del otro para que la llave pueda abarcarlos.
  const celdas = agruparPorVoluntario(grupo.filas).map((fila) => {
    const participantes = fila.participantes.map((id) => buscar(porId, id))
    if (participantes.length === 0) throw new Error('Una fila no tiene ningun participante')
    const acompanan = fila.voluntarios
      .map((id) => { const v = buscar(porId, id); return cortoVol(v.nombre) + (v.nuevo ? ' (nuevo)' : '') })
      .join(' / ')
    return {
      fila,
      participantes,
      lineasVoluntario: acompanan ? quebrar(acompanan, ancho, fuenteVoluntario, medirTexto) : [],
    }
  })

  // El alto del renglon lo fija el nombre mas largo de ese renglon, no del grupo
  // entero: con un maximo comun, un renglon sin acompañantes quedaba con el aire
  // de otro que si los tenia.
  const maxEn = (renglon) => Math.max(0, ...celdas
    .filter((_, i) => Math.floor(i / columnas) === renglon)
    .map((c) => c.lineasVoluntario.length))

  let cursor = y
  celdas.forEach((celda, i) => {
    const columna = i % columnas
    const renglon = Math.floor(i / columnas)
    const x = m.margen + columna * (ancho + separacion)
    const clave = celda.fila.participantes[0]

    dibujarRetrato(ordenes, {
      x, arriba: cursor, ancho, alto, altoFranja, color, clave,
      participantes: celda.participantes, grupo, conFotos, medirTexto, corto,
    })
    celda.x = x
    celda.yVoluntario = cursor + alto + GRILLA.espacioBajoNombre

    if (columna === columnas - 1 || i === celdas.length - 1) {
      const lineas = maxEn(renglon)
      const alturaTexto = lineas > 0 ? GRILLA.espacioBajoNombre + lineas * GRILLA.pxVoluntario : 0
      const ultimo = i === celdas.length - 1
      cursor += alto + alturaTexto + (ultimo ? 0 : m.espacioBajoTitulo)
    }
  })

  dibujarVoluntarios(ordenes, celdas, columnas, ancho, fuenteVoluntario, medirTexto)
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
  'retratos-nombre': cuerpoEnRetratosConNombre,
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
    const lado = Math.round(COLUMNAS.pxVoluntario * 0.92)
    ordenes.push({ tipo: 'imagen', clave: 'icono-voluntario', x: textoX, y: centro + 20 - lado / 2, ancho: lado, alto: lado, fila: clave })
    ordenes.push({
      tipo: 'texto', texto: nombres, x: textoX + lado + 10, y: centro + 20,
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
