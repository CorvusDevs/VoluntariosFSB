import { nombreArchivoCertificado, TIPOS_CERTIFICADO } from '../modelo/certificados.js'

export const MEDIDAS_CERTIFICADO = Object.freeze({ ancho: 3508, alto: 2480, anchoMm: 297, altoMm: 210 })

const CENTRO = 1810
const FUENTE = 'Montserrat, Arial, sans-serif'
const TRAZADOS = Object.freeze({
  acompanante: { categoriaY: 492, tituloY: 726, tituloTamano: 167, subtituloY: 825, introduccionY: 983, nombreY: 1272, cedulaY: 1372, cuerpoY: 1560, cuerpoTamano: 67, cuerpoAlto: 94, fechaY: 1942 },
  operador: { categoriaY: 466, tituloY: 716, tituloTamano: 208, subtituloY: 798, introduccionY: 1011, nombreY: 1299, cedulaY: 1399, cuerpoY: 1595, cuerpoTamano: 67, cuerpoAlto: 94, fechaY: 1977 },
  asistente: { categoriaY: 466, tituloY: 716, tituloTamano: 208, subtituloY: 798, introduccionY: 1011, nombreY: 1299, cedulaY: 1399, cuerpoY: 1595, cuerpoTamano: 67, cuerpoAlto: 94, fechaY: 1977 },
  diploma: { tituloY: 617, tituloTamano: 208, subtituloY: 725, introduccionY: 920, nombreY: 1190, cedulaY: 1290, cuerpoY: 1551, cuerpoTamano: 67, cuerpoAlto: 94, fechaY: 2012 },
  participacion: { tituloY: 613, tituloTamano: 167, subtituloY: 725, introduccionY: 920, nombreY: 1190, cedulaY: 1290, cuerpoY: 1548, cuerpoTamano: 83, cuerpoAlto: 119, fechaY: 2012 },
})

function xml(valor) {
  return String(valor ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function color(valor, respaldo) {
  const texto = String(valor ?? '').trim()
  return /^#[0-9a-f]{6}$/i.test(texto) ? texto.toUpperCase() : respaldo
}

function componentesColor(hexadecimal) {
  return [1, 3, 5].map((inicio) => (Number.parseInt(hexadecimal.slice(inicio, inicio + 2), 16) / 255).toFixed(4))
}

function envolver(texto, maximo = 66) {
  const palabras = String(texto ?? '').trim().split(/\s+/).filter(Boolean)
  const lineas = []
  let linea = ''
  for (const palabra of palabras) {
    const candidata = linea ? `${linea} ${palabra}` : palabra
    if (linea && candidata.length > maximo) { lineas.push(linea); linea = palabra } else linea = candidata
  }
  if (linea) lineas.push(linea)
  return lineas
}

function textoMultilinea(lineas, x, y, opciones = {}) {
  const tamano = opciones.tamano ?? 64
  const alto = opciones.alto ?? Math.round(tamano * 1.28)
  return `<text x="${x}" y="${y}" text-anchor="${opciones.ancla ?? 'middle'}" font-family="${FUENTE}" font-size="${tamano}" font-weight="${opciones.peso ?? 400}" fill="${opciones.color ?? '#5F5B61'}">${lineas.map((linea, indice) => `<tspan x="${x}" dy="${indice ? alto : 0}">${xml(linea)}</tspan>`).join('')}</text>`
}

function textoRico(lineas, x, y, opciones = {}) {
  const tamano = opciones.tamano ?? 67
  const alto = opciones.alto ?? Math.round(tamano * 1.4)
  return lineas.map((linea, indice) => `<text x="${x}" y="${y + indice * alto}" text-anchor="middle" font-family="${FUENTE}" font-size="${tamano}" fill="${opciones.color ?? '#5F5B61'}">${linea.map(([texto, peso]) => `<tspan font-weight="${peso}">${xml(texto)}</tspan>`).join('')}</text>`).join('')
}

function lineasCargo(texto, x, y, colorTexto) {
  return textoMultilinea(String(texto ?? '').split('\n'), x, y, { tamano: 42, alto: 55, color: colorTexto })
}

export function limitesContenidoFirma(pixeles, ancho, alto, umbral = 8) {
  if (!pixeles || ancho < 1 || alto < 1 || pixeles.length < ancho * alto * 4) return null
  let izquierda = ancho; let derecha = -1; let arriba = alto; let abajo = -1
  for (let y = 0; y < alto; y += 1) {
    for (let x = 0; x < ancho; x += 1) {
      if (pixeles[(y * ancho + x) * 4 + 3] <= umbral) continue
      izquierda = Math.min(izquierda, x); derecha = Math.max(derecha, x)
      arriba = Math.min(arriba, y); abajo = Math.max(abajo, y)
    }
  }
  return derecha < izquierda ? null : { x: izquierda, y: arriba, ancho: derecha - izquierda + 1, alto: abajo - arriba + 1 }
}

function numeroAcotado(valor, minimo, maximo, inicial) {
  const numero = Number(valor)
  return Number.isFinite(numero) ? Math.max(minimo, Math.min(maximo, numero)) : inicial
}

function firmaImagen(fuente, x, configuracion, indice) {
  if (!fuente) return ''
  const prefijo = `firma${indice}`
  const escala = numeroAcotado(configuracion[`${prefijo}Tamano`], .6, 1.5, 1)
  const desplazamientoX = numeroAcotado(configuracion[`${prefijo}X`], -150, 150, 0)
  const desplazamientoY = numeroAcotado(configuracion[`${prefijo}Y`], -100, 35, 0)
  const grosor = numeroAcotado(configuracion[`${prefijo}Grosor`], -1, 2, 0)
  const intensidad = numeroAcotado(configuracion[`${prefijo}Intensidad`], .45, 1, 1)
  const ancho = Math.round(490 * escala); const alto = Math.round(180 * escala)
  const izquierda = Math.round(x + desplazamientoX - ancho / 2)
  const arriba = Math.round(2220 + desplazamientoY - alto)
  const idFiltro = `trazo-${prefijo}`
  const filtro = grosor === 0 ? '' : `<filter id="${idFiltro}" x="-15%" y="-25%" width="130%" height="150%"><feMorphology in="SourceGraphic" operator="${grosor < 0 ? 'erode' : 'dilate'}" radius="${Math.abs(grosor)}"/></filter>`
  return `${filtro}<image data-firma="${indice}" href="${xml(fuente)}" x="${izquierda}" y="${arriba}" width="${ancho}" height="${alto}" opacity="${intensidad}" preserveAspectRatio="xMidYMid meet"${filtro ? ` filter="url(#${idFiltro})"` : ''}/>`
}

function definicionFuente(configuracion) {
  if (!configuracion.fuenteMontserrat) return ''
  return `<style>@font-face{font-family:Montserrat;src:url('${xml(configuracion.fuenteMontserrat)}') format('woff2');font-style:normal;font-weight:100 900}</style>`
}

function marcaAgua(configuracion, colorMarca, opacidad) {
  const [rojo, verde, azul] = componentesColor(colorMarca)
  if (configuracion.marcaInstitucional) {
    return `<defs>
      <image id="marca-aletea-certificado" href="${xml(configuracion.marcaInstitucional)}" width="2048" height="764"/>
      <filter id="tono-marca-certificado" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 ${rojo} 0 0 0 0 ${verde} 0 0 0 0 ${azul} 0 0 0 1 0"/></filter>
    </defs>
    <svg x="235" y="925" width="3135" height="1335" viewBox="730 0 1140 440" preserveAspectRatio="none" overflow="hidden" opacity="${opacidad}">
      <use href="#marca-aletea-certificado" filter="url(#tono-marca-certificado)"/>
    </svg>`
  }
  return `<path d="M430 1740 C180 1370 500 1030 850 1130 C1210 1235 1425 1770 1800 1770 C2190 1770 2395 1100 2825 1100 C3245 1100 3420 1510 3220 1840 C2995 2210 2580 1990 2270 1700 C1880 1335 1650 1100 1270 1100 C900 1100 700 1770 430 1740" fill="none" stroke="${colorMarca}" stroke-width="170" stroke-linecap="round" stroke-linejoin="round" opacity="${opacidad}"/>`
}

function cuerpoParticipacion(configuracion) {
  const modalidad = String(configuracion.modalidad || 'presencial').trim()
  const tema = String(configuracion.tema || 'la temática de la formación').trim()
  const horas = String(configuracion.horas || '').trim()
  const fecha = String(configuracion.fechaActividad || '').trim()
  return `por haber participado en el Taller ${modalidad} sobre “${tema}”${horas ? ` de ${horas} horas de duración` : ''}${fecha ? `, el ${fecha}` : ''}.`
}

function cabeceraCertificado(tipo, plantilla, trazado, configuracion, colorTexto, escala) {
  if (tipo === 'participacion') {
    const capacitacion = String(configuracion.capacitacion || 'Nombre de la capacitación o taller').trim()
    const lineas = envolver(capacitacion, 52).slice(0, 2)
    const tamano = Math.round((lineas.length > 1 ? 70 : 83) * escala)
    return `${textoMultilinea([plantilla.titulo], CENTRO, trazado.tituloY, { tamano: Math.round(trazado.tituloTamano * escala), peso: 800, color: colorTexto })}${textoMultilinea(lineas, CENTRO, trazado.subtituloY, { tamano, alto: 80, peso: 600, color: colorTexto })}`
  }
  if (tipo === 'diploma') {
    return `${textoMultilinea(['DIPLOMA'], CENTRO, trazado.tituloY, { tamano: Math.round(trazado.tituloTamano * escala), peso: 800, color: colorTexto })}${textoMultilinea([plantilla.titulo], CENTRO, trazado.subtituloY, { tamano: Math.round(83 * escala), peso: 500, color: colorTexto })}`
  }
  return `${textoMultilinea([plantilla.categoria.toUpperCase()], CENTRO, trazado.categoriaY, { tamano: Math.round(83 * escala), peso: 700, color: colorTexto })}${textoMultilinea([plantilla.titulo], CENTRO, trazado.tituloY, { tamano: Math.round(trazado.tituloTamano * escala), peso: 800, color: colorTexto })}${textoMultilinea([plantilla.subtitulo], CENTRO, trazado.subtituloY, { tamano: Math.round(83 * escala), peso: 500, color: colorTexto })}`
}

export function crearSvgCertificado(persona = {}, configuracion = {}) {
  const tipo = TIPOS_CERTIFICADO[configuracion.tipo] ? configuracion.tipo : 'participacion'
  const plantilla = TIPOS_CERTIFICADO[tipo]
  const trazado = TRAZADOS[tipo]
  const principal = color(configuracion.colorPrincipal, '#662D7D')
  const acento = color(configuracion.colorAcento, '#E9287F')
  const apoyo = color(configuracion.colorApoyo, '#5DCCC6')
  const texto = color(configuracion.colorTexto, '#5F5B61')
  const marca = color(configuracion.colorMarcaAgua, '#D8D6D9')
  const escala = Math.max(.85, Math.min(1.16, Number(configuracion.escalaTexto) || 1))
  const opacidad = Math.max(0, Math.min(.75, Number(configuracion.opacidadMarcaAgua) || 0))
  const nombre = String(persona.nombre || 'NOMBRE Y APELLIDO').trim()
  const nombreTamanoBase = nombre.length > 38 ? 92 : nombre.length > 30 ? 106 : nombre.length > 22 ? 124 : 146
  const nombreLineas = envolver(nombre.toUpperCase(), nombre.length > 30 ? 30 : 40).slice(0, 2)
  const logo = configuracion.logo
    ? `<image href="${xml(configuracion.logo)}" x="1454" y="70" width="600" height="260" preserveAspectRatio="xMidYMid meet"/>`
    : `<text x="1754" y="245" text-anchor="middle" font-family="${FUENTE}" font-size="150" font-weight="700" fill="${principal}">Aletea</text>`
  const contacto = configuracion.mostrarContacto === false ? '' : `<g transform="translate(178 0) rotate(-90)">
    <text x="-420" y="0" font-family="${FUENTE}" font-size="40" fill="${texto}">${xml(configuracion.telefono)}</text>
    <text x="-1040" y="0" font-family="${FUENTE}" font-size="40" fill="${texto}">${xml(configuracion.correo)}</text>
    <text x="-1510" y="0" font-family="${FUENTE}" font-size="40" fill="${texto}">${xml(configuracion.sitio)}</text>
  </g>`
  const cuerpo = tipo === 'participacion'
    ? textoMultilinea(envolver(cuerpoParticipacion(configuracion), 64).slice(0, 3), CENTRO, trazado.cuerpoY, { tamano: Math.round(trazado.cuerpoTamano * escala), alto: Math.round(trazado.cuerpoAlto * escala), peso: 500, color: texto })
    : textoRico(plantilla.cuerpoReferencia, CENTRO, trazado.cuerpoY, { tamano: Math.round(trazado.cuerpoTamano * escala), alto: Math.round(trazado.cuerpoAlto * escala), color: texto })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="210mm" viewBox="0 0 ${MEDIDAS_CERTIFICADO.ancho} ${MEDIDAS_CERTIFICADO.alto}" role="img" aria-label="Certificado de ${xml(nombre)}">
    ${definicionFuente(configuracion)}
    <rect width="3508" height="2480" fill="#FFFFFF"/>
    <rect width="140" height="960" fill="${apoyo}"/><rect y="960" width="140" height="815" fill="${principal}"/><rect y="1775" width="140" height="705" fill="${acento}"/>
    ${contacto}${logo}${marcaAgua(configuracion, marca, opacidad)}
    ${cabeceraCertificado(tipo, plantilla, trazado, configuracion, texto, escala)}
    ${textoMultilinea([plantilla.introduccion], CENTRO, trazado.introduccionY, { tamano: Math.round(75 * escala), color: texto })}
    ${textoMultilinea(nombreLineas, CENTRO, trazado.nombreY, { tamano: Math.round(nombreTamanoBase * escala), alto: Math.round(nombreTamanoBase * 1.04 * escala), peso: 700, color: texto })}
    ${textoMultilinea([persona.cedula || 'cédula identidad'], CENTRO, trazado.cedulaY + (nombreLineas.length - 1) * Math.round(nombreTamanoBase * 1.04 * escala), { tamano: Math.round(92 * escala), color: texto })}
    ${cuerpo}
    ${textoMultilinea([configuracion.lugarFecha || plantilla.lugarFecha], CENTRO, trazado.fechaY, { tamano: Math.round(62 * escala), peso: 500, color: texto })}
    ${firmaImagen(configuracion.firma1, 1345, configuracion, 1)}${firmaImagen(configuracion.firma2, 2173, configuracion, 2)}
    <line x1="1080" y1="2230" x2="1610" y2="2230" stroke="${texto}" stroke-width="5" stroke-dasharray="5 5"/>
    <line x1="1905" y1="2230" x2="2440" y2="2230" stroke="${texto}" stroke-width="5" stroke-dasharray="5 5"/>
    ${textoMultilinea([configuracion.firmante1], 1345, 2298, { tamano: 42, peso: 700, color: texto })}
    ${textoMultilinea([configuracion.firmante2], 2173, 2298, { tamano: 42, peso: 700, color: texto })}
    ${lineasCargo(configuracion.cargo1, 1345, 2350, texto)}${lineasCargo(configuracion.cargo2, 2173, 2350, texto)}
  </svg>`
}

export function htmlLoteCertificados(personas = [], configuracion = {}) {
  const paginas = personas.filter((persona) => persona.incluida !== false).map((persona) => `<section class="pagina">${crearSvgCertificado(persona, configuracion)}</section>`).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>Certificados de Aletea</title><style>@page{size:A4 landscape;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:white}.pagina{width:297mm;height:210mm;break-after:page;page-break-after:always;overflow:hidden}.pagina:last-child{break-after:auto;page-break-after:auto}.pagina svg{display:block;width:297mm;height:210mm}@media screen{body{background:#eee}.pagina{margin:8mm auto;box-shadow:0 2mm 7mm #0002}}</style></head><body>${paginas}</body></html>`
}

export function imprimirLoteCertificados(personas, configuracion, documento = globalThis.document) {
  const marco = documento.createElement('iframe')
  marco.title = 'Certificados listos para imprimir o guardar como PDF'
  marco.style.position = 'fixed'; marco.style.right = '100vw'; marco.style.bottom = '100vh'; marco.style.width = '1px'; marco.style.height = '1px'; marco.style.border = '0'
  documento.body.appendChild(marco)
  const destino = marco.contentDocument
  destino.open(); destino.write(htmlLoteCertificados(personas, configuracion)); destino.close()
  const imprimir = () => { marco.contentWindow?.focus?.(); marco.contentWindow?.print?.(); globalThis.setTimeout?.(() => marco.remove(), 1600) }
  if (destino.readyState === 'complete') imprimir(); else marco.addEventListener('load', imprimir, { once: true })
}

export function archivosSvgCertificados(personas = [], configuracion = {}) {
  return personas.filter((persona) => persona.incluida !== false).map((persona) => ({ nombre: nombreArchivoCertificado(persona), contenido: crearSvgCertificado(persona, configuracion) }))
}
