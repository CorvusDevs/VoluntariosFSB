const ESTADOS_CONTACTO = ['Nuevo', 'Contactar', 'Contactado', 'Sin respuesta', 'Incorporado', 'No corresponde']
const CANALES_CONTACTO = ['Sin definir', 'WhatsApp', 'Teléfono', 'Correo', 'Presencial', 'Otro']

function xml(texto) {
  return String(texto ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function valorVisible(valor) {
  if (Array.isArray(valor)) return valor.join(', ')
  if (valor === true || valor === 'true') return 'Sí'
  if (valor === false || valor === 'false') return 'No'
  return String(valor ?? '')
}

function camposDe(formulario) {
  try { return JSON.parse(formulario?.campos_json || '[]') } catch { return [] }
}

export function tablaRespuestas(entradas = [], formularios = []) {
  const formulariosPorId = new Map(formularios.map((formulario) => [formulario.id, formulario]))
  const campos = []
  const claves = new Set()
  for (const formulario of formularios) {
    for (const campo of camposDe(formulario)) {
      if (!campo?.clave || claves.has(campo.clave)) continue
      claves.add(campo.clave)
      campos.push({ clave: campo.clave, etiqueta: campo.etiqueta || campo.clave.replaceAll('_', ' ') })
    }
  }
  const columnas = [
    'Fecha de recepción', 'Formulario', 'Equipo', 'Nombre o referencia', 'Contacto', 'Estado en el gestor',
    'Estado de contacto', 'Canal de contacto', 'Responsable', 'Próximo seguimiento', 'Notas internas', 'Mensaje o contexto',
    ...campos.map((campo) => campo.etiqueta),
    'Consentimiento de privacidad', 'Versión de privacidad', 'Fecha de privacidad',
    'Compromiso de convivencia', 'Versión del compromiso', 'Fecha del compromiso',
    'Consentimiento de novedades', 'Referencia interna',
  ]
  const estados = { nueva: 'Recién recibida', derivada: 'Con seguimiento iniciado', cerrada: 'Cumplida' }
  const filas = entradas.map((entrada) => {
    let respuestas = {}
    try { respuestas = JSON.parse(entrada.respuestas_json || '{}') } catch { respuestas = {} }
    const formulario = formulariosPorId.get(entrada.formulario_id)
    return [
      entrada.creado_en || '', entrada.formulario_titulo || formulario?.titulo || entrada.tipo || '', entrada.equipo_nombre || '',
      entrada.nombre || '', entrada.contacto || '', estados[entrada.estado] || entrada.estado || '', '', '', '', '', '', entrada.detalle || '',
      ...campos.map((campo) => valorVisible(respuestas[campo.clave])),
      valorVisible(respuestas._consentimiento_privacidad), valorVisible(respuestas._consentimiento_privacidad_version), valorVisible(respuestas._consentimiento_privacidad_fecha),
      valorVisible(respuestas._compromiso_confidencialidad), valorVisible(respuestas._compromiso_confidencialidad_version), valorVisible(respuestas._compromiso_confidencialidad_fecha),
      valorVisible(respuestas._consentimiento_comunicaciones), entrada.id || '',
    ]
  })
  return { columnas, filas }
}

function celdaCsv(valor) {
  const original = String(valor ?? '')
  const seguro = /^[=+\-@]/.test(original) ? `'${original}` : original
  const texto = seguro.replaceAll('"', '""')
  return `"${texto}"`
}

export function csvRespuestas(entradas = [], formularios = []) {
  const { columnas, filas } = tablaRespuestas(entradas, formularios)
  return `\ufeffsep=;\r\n${[columnas, ...filas].map((fila) => fila.map(celdaCsv).join(';')).join('\r\n')}\r\n`
}

function letrasColumna(indice) {
  let numero = indice + 1
  let letras = ''
  while (numero > 0) {
    numero -= 1
    letras = String.fromCharCode(65 + (numero % 26)) + letras
    numero = Math.floor(numero / 26)
  }
  return letras
}

function celda(valor, columna, fila, estilo = 0) {
  const referencia = `${letrasColumna(columna)}${fila}`
  return `<c r="${referencia}" t="inlineStr"${estilo ? ` s="${estilo}"` : ''}><is><t xml:space="preserve">${xml(valor)}</t></is></c>`
}

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function entero16(valor) {
  return Uint8Array.of(valor & 255, (valor >>> 8) & 255)
}

function entero32(valor) {
  return Uint8Array.of(valor & 255, (valor >>> 8) & 255, (valor >>> 16) & 255, (valor >>> 24) & 255)
}

function unir(partes) {
  const total = partes.reduce((suma, parte) => suma + parte.length, 0)
  const resultado = new Uint8Array(total)
  let posicion = 0
  for (const parte of partes) { resultado.set(parte, posicion); posicion += parte.length }
  return resultado
}

function zipSinCompresion(archivos) {
  const codificar = new TextEncoder()
  const locales = []
  const centrales = []
  let desplazamiento = 0
  for (const [nombre, contenido] of archivos) {
    const nombreBytes = codificar.encode(nombre)
    const contenidoBytes = typeof contenido === 'string' ? codificar.encode(contenido) : contenido
    const suma = crc32(contenidoBytes)
    const local = unir([
      entero32(0x04034b50), entero16(20), entero16(0x0800), entero16(0), entero16(0), entero16(0), entero32(suma),
      entero32(contenidoBytes.length), entero32(contenidoBytes.length), entero16(nombreBytes.length), entero16(0), nombreBytes, contenidoBytes,
    ])
    locales.push(local)
    centrales.push(unir([
      entero32(0x02014b50), entero16(20), entero16(20), entero16(0x0800), entero16(0), entero16(0), entero16(0), entero32(suma),
      entero32(contenidoBytes.length), entero32(contenidoBytes.length), entero16(nombreBytes.length), entero16(0), entero16(0), entero16(0),
      entero16(0), entero32(0), entero32(desplazamiento), nombreBytes,
    ]))
    desplazamiento += local.length
  }
  const central = unir(centrales)
  const final = unir([
    entero32(0x06054b50), entero16(0), entero16(0), entero16(archivos.length), entero16(archivos.length), entero32(central.length), entero32(desplazamiento), entero16(0),
  ])
  return unir([...locales, central, final])
}

export function excelRespuestas(entradas = [], formularios = []) {
  const { columnas, filas } = tablaRespuestas(entradas, formularios)
  const ultimaColumna = letrasColumna(columnas.length - 1)
  const filasXml = [columnas, ...filas].map((fila, indice) => `<row r="${indice + 1}">${fila.map((valor, columna) => celda(valor, columna, indice + 1, indice === 0 ? 1 : 0)).join('')}</row>`).join('')
  const columnasXml = columnas.map((titulo, indice) => {
    const ancho = Math.min(42, Math.max(12, String(titulo).length + 3))
    return `<col min="${indice + 1}" max="${indice + 1}" width="${ancho}" customWidth="1"/>`
  }).join('')
  const listaEstados = `&quot;${ESTADOS_CONTACTO.join(',')}&quot;`
  const listaCanales = `&quot;${CANALES_CONTACTO.join(',')}&quot;`
  const hoja = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${columnasXml}</cols><sheetData>${filasXml}</sheetData><autoFilter ref="A1:${ultimaColumna}${Math.max(1, filas.length + 1)}"/><dataValidations count="2"><dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Opción no válida" error="Elegí una opción de la lista." sqref="G2:G1048576"><formula1>${listaEstados}</formula1></dataValidation><dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Opción no válida" error="Elegí una opción de la lista." sqref="H2:H1048576"><formula1>${listaCanales}</formula1></dataValidation></dataValidations></worksheet>`
  const tipos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`
  const relaciones = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  const libro = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Respuestas" sheetId="1" r:id="rId1"/></sheets></workbook>`
  const relacionesLibro = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
  const estilos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF6D3087"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`
  return zipSinCompresion([
    ['[Content_Types].xml', tipos], ['_rels/.rels', relaciones], ['xl/workbook.xml', libro],
    ['xl/_rels/workbook.xml.rels', relacionesLibro], ['xl/styles.xml', estilos], ['xl/worksheets/sheet1.xml', hoja],
  ])
}

export function nombreExportacionRespuestas(formulario = null, extension = 'xlsx') {
  const base = String(formulario?.titulo || 'respuestas-formularios').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `${base || 'respuestas-formularios'}-${new Date().toISOString().slice(0, 10)}.${extension}`
}
