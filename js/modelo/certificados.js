export const TIPOS_CERTIFICADO = Object.freeze({
  acompanante: {
    nombre: 'Acompañante terapéutico', categoria: 'Certificado intermedio',
    titulo: 'ACOMPAÑANTE TERAPÉUTICO', subtitulo: 'EN EL ESPECTRO AUTISTA',
    introduccion: 'La Asociación Civil Aletea certifica que:',
    cuerpo: 'ha aprobado el 1er año de la Diplomatura en Acompañamiento en el Espectro Autista, cumpliendo con los requisitos académicos establecidos para esta etapa, desde abril a diciembre de 2026, con una carga horaria de 100 horas, más prácticas de observación.',
    cuerpoReferencia: [
      [['ha aprobado el ', 500], ['1er año de la Diplomatura en Acompañamiento en el Espectro Autista,', 700]],
      [['cumpliendo con los requisitos académicos establecidos para esta etapa, ', 500], ['desde abril a', 700]],
      [['diciembre de 2026,', 700], [' con una carga horaria de 100 horas, más prácticas de observación.', 500]],
    ],
    lugarFecha: 'Montevideo, diciembre de 2026',
  },
  operador: {
    nombre: 'Operador laboral', categoria: 'Certificado intermedio',
    titulo: 'OPERADOR LABORAL', subtitulo: 'EN EL ESPECTRO AUTISTA',
    introduccion: 'La Asociación Civil Aletea certifica que:',
    cuerpo: 'ha aprobado el 1er trayecto formativo de 2do año de la Diplomatura en Acompañamiento en el Espectro Autista, cumpliendo con los requisitos académicos establecidos para esta etapa, desde abril a julio de 2026, con una carga horaria de 50 horas.',
    cuerpoReferencia: [
      [['ha aprobado el ', 500], ['1er trayecto formativo de 2do año de la Diplomatura en Acompañamiento', 700]],
      [['en el Espectro Autista,', 700], [' cumpliendo con los requisitos académicos establecidos para esta', 500]],
      [['etapa, ', 500], ['desde abril a julio de 2026,', 700], [' con una carga horaria de 50 horas.', 500]],
    ],
    lugarFecha: 'Montevideo, agosto de 2026',
  },
  asistente: {
    nombre: 'Asistente pedagógico', categoria: 'Certificado intermedio',
    titulo: 'ASISTENTE PEDAGÓGICO', subtitulo: 'EN EL ESPECTRO AUTISTA',
    introduccion: 'La Asociación Civil Aletea certifica que:',
    cuerpo: 'ha aprobado el 2do trayecto formativo de 2do año de la Diplomatura en Acompañamiento en el Espectro Autista, cumpliendo con los requisitos académicos establecidos para esta etapa, desde agosto a diciembre de 2026, con una carga horaria de 50 horas.',
    cuerpoReferencia: [
      [['ha aprobado el ', 500], ['2do. trayecto formativo de 2do año de la Diplomatura en Acompañamiento', 700]],
      [['en el Espectro Autista,', 700], [' cumpliendo con los requisitos académicos establecidos para esta', 500]],
      [['etapa, ', 500], ['desde agosto a diciembre de 2026,', 700], [' con una carga horaria de 50 horas.', 500]],
    ],
    lugarFecha: 'Montevideo, diciembre de 2026',
  },
  diploma: {
    nombre: 'Diploma completo', categoria: 'Diploma',
    titulo: 'EN ACOMPAÑAMIENTO EN EL ESPECTRO AUTISTA', subtitulo: '',
    introduccion: 'La Asociación Civil Aletea otorga el siguiente diploma:',
    cuerpo: 'por haber completado y aprobado la Diplomatura en Acompañamiento en el Espectro Autista integrada por los trayectos formativos de: Acompañante Terapéutico - Operador Laboral - Asistente Pedagógico, acreditando satisfactoriamente la formación integral prevista en el programa académico.',
    cuerpoReferencia: [
      [['por haber completado y aprobado la Diplomatura en Acompañamiento en el Espectro', 500]],
      [['Autista integrada por los trayectos formativos de:', 500]],
      [['Acompañante Terapéutico - Operador Laboral - Asistente Pedagógico', 600]],
      [['acreditando satisfactoriamente la formación integral prevista en el programa académico.', 500]],
    ],
    lugarFecha: 'Montevideo, diciembre de 2026',
  },
  participacion: {
    nombre: 'Participación', categoria: 'Certificado de participación',
    titulo: 'CERTIFICADO DE PARTICIPACIÓN', subtitulo: '',
    introduccion: 'La Asociación Civil Aletea otorga el siguiente certificado a:',
    cuerpo: '', lugarFecha: 'Montevideo, diciembre de 2026',
  },
})

export const CONFIGURACION_CERTIFICADO_INICIAL = Object.freeze({
  tipo: 'participacion', capacitacion: 'Nombre de la capacitación o taller', modalidad: 'presencial', tema: 'la temática de la formación', horas: '2', fechaActividad: '',
  lugarFecha: TIPOS_CERTIFICADO.participacion.lugarFecha,
  colorPrincipal: '#662D7D', colorAcento: '#E9287F', colorApoyo: '#5DCCC6', colorTexto: '#5F5B61', colorMarcaAgua: '#D8D6D9',
  opacidadMarcaAgua: 0.34, escalaTexto: 1, mostrarContacto: true,
  telefono: '099 294421', correo: 'info@aletea.org', sitio: 'Aletea.org',
  firmante1: 'CLAUDIA CRAVEA', cargo1: 'Co-coordinadora\nDirección ejecutiva Aletea',
  firmante2: 'IRENE PELUSO', cargo2: 'Co-coordinadora\nPresidenta Aletea',
  firma1: '', firma2: '', logo: '', marcaInstitucional: '', fuenteMontserrat: '',
  firma1Tamano: 1, firma1X: 0, firma1Y: 0, firma1Grosor: 0, firma1Intensidad: 1,
  firma2Tamano: 1, firma2X: 0, firma2Y: 0, firma2Grosor: 0, firma2Intensidad: 1,
  sincronizarFirmas: false,
})

export function crearConfiguracionCertificado(tipo = 'participacion') {
  const plantilla = TIPOS_CERTIFICADO[tipo] ?? TIPOS_CERTIFICADO.participacion
  return { ...CONFIGURACION_CERTIFICADO_INICIAL, tipo: TIPOS_CERTIFICADO[tipo] ? tipo : 'participacion', lugarFecha: plantilla.lugarFecha }
}

function soloDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '')
}

export function formatearCedulaUruguay(valor) {
  const digitos = soloDigitos(valor)
  if (digitos.length < 2) return String(valor ?? '').trim()
  const cuerpo = digitos.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${cuerpo}-${digitos.slice(-1)}`
}

export function cedulaUruguayaPlausible(valor) {
  const digitos = soloDigitos(valor)
  if (digitos.length !== 7 && digitos.length !== 8) return false
  const completa = digitos.padStart(8, '0')
  const factores = [2, 9, 8, 7, 6, 3, 4]
  const suma = factores.reduce((total, factor, indice) => total + Number(completa[indice]) * factor, 0)
  const verificador = (10 - (suma % 10)) % 10
  return verificador === Number(completa[7])
}

function problemasNombreCertificado(valor) {
  const nombre = String(valor || '').trim().replace(/\s+/g, ' ')
  if (!nombre) return ['Falta el nombre']
  if (/\d|@|https?:|www\./i.test(nombre)) return ['Revisar el nombre']
  const partes = nombre.split(/[\s,]+/).filter((parte) => /\p{L}/u.test(parte))
  return partes.length < 2 ? ['Falta el apellido'] : []
}

export function normalizarCabeceraCertificado(valor) {
  return String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-UY').replace(/[^a-z0-9]+/g, ' ').trim()
}

function elegirSeparador(texto) {
  const primera = String(texto).replace(/^\ufeff/, '').split(/\r?\n/).find((linea) => linea.trim()) ?? ''
  if (primera.includes('\t')) return '\t'
  const candidatos = [',', ';']
  return candidatos.sort((a, b) => primera.split(b).length - primera.split(a).length)[0]
}

export function parsearTablaCertificados(texto) {
  let fuente = String(texto ?? '').replace(/^\ufeff/, '')
  const declaracion = fuente.match(/^sep=(.)\r?\n/i)
  const separador = declaracion?.[1] ?? elegirSeparador(fuente)
  if (declaracion) fuente = fuente.slice(declaracion[0].length)
  const filas = []
  let fila = []; let celda = ''; let entreComillas = false
  for (let indice = 0; indice < fuente.length; indice += 1) {
    const caracter = fuente[indice]
    if (caracter === '"') {
      if (entreComillas && fuente[indice + 1] === '"') { celda += '"'; indice += 1 } else entreComillas = !entreComillas
    } else if (caracter === separador && !entreComillas) { fila.push(celda); celda = '' }
    else if ((caracter === '\n' || caracter === '\r') && !entreComillas) {
      if (caracter === '\r' && fuente[indice + 1] === '\n') indice += 1
      fila.push(celda); celda = ''
      if (fila.some((valor) => String(valor).trim())) filas.push(fila)
      fila = []
    } else celda += caracter
  }
  fila.push(celda)
  if (fila.some((valor) => String(valor).trim())) filas.push(fila)
  return filas
}

export function detectarColumnasCertificados(cabeceras = []) {
  const normalizadas = cabeceras.map(normalizarCabeceraCertificado)
  const buscar = (...patrones) => normalizadas.findIndex((cabecera) => patrones.some((patron) => cabecera === patron || cabecera.includes(patron)))
  return {
    nombre: buscar('nombre y apellido', 'nombre completo', 'nombre'),
    cedula: buscar('cedula de identidad', 'cedula', 'documento de identidad'),
    correo: buscar('correo electronico', 'correo', 'email'),
    capacitacion: buscar('nombre de la capacitacion', 'capacitacion taller', 'capacitacion', 'taller brindado'),
  }
}

export function importarParticipantesCertificados(texto) {
  const tabla = parsearTablaCertificados(texto)
  if (tabla.length < 2) return { cabeceras: tabla[0] ?? [], columnas: {}, personas: [], error: 'No encontramos respuestas debajo de los encabezados.' }
  const cabeceras = tabla[0].map((valor) => String(valor).trim())
  const columnas = detectarColumnasCertificados(cabeceras)
  if (columnas.nombre < 0 || columnas.cedula < 0) return { cabeceras, columnas, personas: [], error: 'No encontramos las columnas de nombre y cédula.' }
  const personas = tabla.slice(1).map((fila, indice) => {
    const nombre = String(fila[columnas.nombre] ?? '').trim()
    const cedulaOriginal = String(fila[columnas.cedula] ?? '').trim()
    const problemas = problemasNombreCertificado(nombre)
    if (!cedulaOriginal) problemas.push('Falta la cédula')
    else if (!cedulaUruguayaPlausible(cedulaOriginal)) problemas.push('Revisar la cédula')
    return {
      fila: indice + 2, nombre, cedulaOriginal, cedula: formatearCedulaUruguay(cedulaOriginal),
      correo: columnas.correo >= 0 ? String(fila[columnas.correo] ?? '').trim() : '',
      capacitacion: columnas.capacitacion >= 0 ? String(fila[columnas.capacitacion] ?? '').trim() : '',
      problemas, incluida: true,
    }
  }).filter((persona) => persona.nombre || persona.cedulaOriginal)
  actualizarValidacionParticipantes(personas)
  return { cabeceras, columnas, personas, error: personas.length ? '' : 'La tabla no contiene personas para generar certificados.' }
}

export function sugerirCapacitacionLote(personas = []) {
  const opciones = []
  const vistas = new Set()
  for (const persona of personas) {
    const valor = String(persona.capacitacion || '').trim()
    const clave = normalizarCabeceraCertificado(valor)
    if (!clave || vistas.has(clave)) continue
    vistas.add(clave)
    opciones.push(valor)
  }
  return { valor: opciones.length === 1 ? opciones[0] : '', cantidad: opciones.length, opciones }
}

export function actualizarValidacionParticipantes(personas = []) {
  for (const persona of personas) {
    persona.cedula = formatearCedulaUruguay(persona.cedulaOriginal)
    persona.problemas = []
    persona.problemas.push(...problemasNombreCertificado(persona.nombre))
    if (!String(persona.cedulaOriginal || '').trim()) persona.problemas.push('Falta la cédula')
    else if (!cedulaUruguayaPlausible(persona.cedulaOriginal)) persona.problemas.push('Revisar la cédula')
  }
  const vistas = new Map()
  for (const persona of personas) {
    const clave = soloDigitos(persona.cedulaOriginal)
    if (!clave) continue
    if (vistas.has(clave)) {
      persona.problemas.push('Cédula duplicada')
      vistas.get(clave).problemas.push('Cédula duplicada')
    } else vistas.set(clave, persona)
  }
  return personas
}

export function cuerpoCertificado(configuracion = {}) {
  const tipo = TIPOS_CERTIFICADO[configuracion.tipo] ? configuracion.tipo : 'participacion'
  if (tipo !== 'participacion') return TIPOS_CERTIFICADO[tipo].cuerpo
  const modalidad = String(configuracion.modalidad || 'presencial').trim()
  const tema = String(configuracion.tema || 'la temática de la formación').trim()
  const horas = String(configuracion.horas || '').trim()
  const fecha = String(configuracion.fechaActividad || '').trim()
  return `por haber participado en el Taller ${modalidad} sobre “${tema}”${horas ? ` de ${horas} horas de duración` : ''}${fecha ? `, realizado el ${fecha}` : ''}.`
}

export function advertenciasLoteCertificados(personas = [], configuracion = {}) {
  const incluidas = personas.filter((persona) => persona.incluida !== false)
  const observadas = incluidas.filter((persona) => persona.problemas?.length)
  const advertencias = []
  if (!incluidas.length) advertencias.push('Importá al menos una persona.')
  if (observadas.length) advertencias.push(`${observadas.length} ${observadas.length === 1 ? 'persona necesita' : 'personas necesitan'} revisión.`)
  if (configuracion.tipo === 'participacion' && !String(configuracion.capacitacion || '').trim()) advertencias.push('Falta el nombre de la capacitación o taller.')
  if (configuracion.tipo === 'participacion' && !String(configuracion.tema || '').trim()) advertencias.push('Falta la temática.')
  return advertencias
}

export function nombreArchivoCertificado(persona = {}, extension = 'svg') {
  const base = String(persona.nombre || 'sin-nombre').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const cedula = soloDigitos(persona.cedula)
  return `certificado-${base || 'sin-nombre'}${cedula ? `-${cedula}` : ''}.${extension}`
}
