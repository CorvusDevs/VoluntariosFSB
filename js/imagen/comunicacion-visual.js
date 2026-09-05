export const FORMATOS_COMUNICACION = Object.freeze({
  vertical: { ancho: 1080, alto: 1350, etiqueta: 'Publicación vertical' },
  cuadrado: { ancho: 1080, alto: 1080, etiqueta: 'Publicación cuadrada' },
  historia: { ancho: 1080, alto: 1920, etiqueta: 'Historia' },
  a4: { ancho: 1240, alto: 1754, etiqueta: 'Carta A4' },
})

export const PALETAS_COMUNICACION = Object.freeze({
  institucional: { principal: '#662D7D', acento: '#E9287F', apoyo: '#5DCCC6', fondo: '#FFFFFF', suave: '#E4E2E4' },
  turquesa: { principal: '#4D1F61', acento: '#0F6E56', apoyo: '#5DCCC6', fondo: '#F5FBFA', suave: '#DCEDEA' },
  magenta: { principal: '#662D7D', acento: '#E9287F', apoyo: '#F2B544', fondo: '#FFF8FB', suave: '#E9DDE9' },
})

export const FUENTES_COMUNICACION = Object.freeze({
  poppins: { nombre: 'Poppins', familia: 'Poppins, sans-serif', pesoNormal: 400, pesoDestacado: 500 },
  leagueGothic: { nombre: 'League Gothic', familia: "'League Gothic', sans-serif", pesoNormal: 400, pesoDestacado: 400 },
})

export const PLANTILLAS_COMUNICACION = Object.freeze({
  apoyo: {
    nombre: 'Actividad o evento', descripcion: 'Fecha, modalidad y contacto', categoria: 'Evento', paleta: 'institucional', composicion: 'evento',
    datos: {
      red: '@aleteauy', sitio: 'www.aletea.org', fondoTitulo: 'NUEVA FECHA',
      titulo: 'GRUPOS DE APOYO\nPARA FAMILIAS', etiqueta: 'VIRTUAL',
      descripcion: 'Dirigido a padres, madres y otros familiares que tengan a su cargo personas dentro del Espectro Autista. Los grupos se dividen por edades.',
      destacado: 'Solo se inscriben las familias nuevas. Actividad gratuita.',
      fecha: 'Jueves 27 de agosto', hora: '19 a 21 hs', modalidad: 'Vía Zoom', contacto: '099 29 44 21',
    },
  },
  convocatoria: {
    nombre: 'Convocatoria', descripcion: 'Invitación para participar', categoria: 'Convocatoria', paleta: 'turquesa', composicion: 'evento',
    datos: {
      red: '@aleteauy', sitio: 'www.aletea.org', fondoTitulo: 'SUMATE',
      titulo: 'CONSTRUIMOS\nCOMUNIDAD', etiqueta: 'PARTICIPÁ',
      descripcion: 'Abrimos un nuevo espacio para encontrarnos, compartir experiencias y seguir construyendo redes.',
      destacado: 'Tu participación hace la diferencia.',
      fecha: 'Próximo encuentro', hora: 'Hora a confirmar', modalidad: 'Modalidad a confirmar', contacto: 'Contacto de Aletea',
    },
  },
  campana: {
    nombre: 'Campaña', descripcion: 'Mensaje institucional de impacto', categoria: 'Campaña', paleta: 'magenta', composicion: 'evento',
    datos: {
      red: '@aleteauy', sitio: 'www.aletea.org', fondoTitulo: 'INCLUSIÓN',
      titulo: 'UNA SOCIEDAD\nPARA TODAS LAS PERSONAS', etiqueta: 'ALEtEA',
      descripcion: 'Tejemos redes entre familias, generamos espacios inclusivos y compartimos herramientas para construir comunidad.',
      destacado: 'Una sociedad que no resulte discapacitante para nadie.',
      fecha: '', hora: '', modalidad: '', contacto: 'www.aletea.org',
    },
  },
  carrusel: {
    nombre: 'Carrusel educativo', descripcion: 'Portada y placas para deslizar', categoria: 'Contenido', paleta: 'institucional', composicion: 'editorial',
    datos: {
      red: '@aleteauy', sitio: 'www.aletea.org', fondoTitulo: 'APOYOS',
      titulo: 'NO TODOS LOS\nAPOYOS SON IGUALES', etiqueta: '',
      descripcion: 'Cuando pensamos en apoyo, solemos imaginar a alguien acompañando físicamente. Pero hay muchas formas, y todas cuentan.',
      destacado: '', fecha: '', hora: '', modalidad: '', contacto: '',
    },
    diapositivas: [
      { titulo: 'NO TODOS LOS\nAPOYOS SON IGUALES', descripcion: 'Cuando pensamos en apoyo, solemos imaginar a alguien acompañando físicamente. Pero hay muchas formas, y todas cuentan.', destacado: '' },
      { titulo: 'HUMANOS:\nACOMPAÑANTES, REFERENTES, DOCENTES DE APOYO', descripcion: 'El apoyo humano puede acompañar, anticipar, facilitar la participación y construir autonomía.', destacado: '' },
      { titulo: 'TÉCNICOS:\nAGENDAS VISUALES, TECNOLOGÍA, PICTOGRAMAS, RECORDATORIOS', descripcion: 'Las herramientas adecuadas ayudan a comprender, organizarse y participar con mayor autonomía.', destacado: '' },
    ],
  },
  mensaje: {
    nombre: 'Mensaje breve', descripcion: 'Una idea clara para una fecha o campaña', categoria: 'Mensaje', paleta: 'institucional', composicion: 'mensaje',
    datos: {
      red: '@aleteauy', sitio: 'www.aletea.org', fondoTitulo: '',
      titulo: 'CADA INFANCIA\nMERECE AMOR,\nJUEGO Y RESPETO', etiqueta: '¡FELIZ DÍA!',
      descripcion: 'Construyamos una sociedad donde haya lugar para cada manera de ser y de estar.',
      destacado: '', fecha: '', hora: '', modalidad: '', contacto: '',
    },
  },
  carta: {
    nombre: 'Carta membretada', descripcion: 'Documento A4 para imprimir o enviar', categoria: 'Documento', paleta: 'institucional', composicion: 'carta',
    datos: {
      red: '', sitio: 'www.aletea.org', fondoTitulo: '', titulo: '', etiqueta: 'A4',
      descripcion: 'Desde la Asociación Civil Aletea trabajamos cada día por la inclusión y los derechos de las personas autistas en Uruguay. Somos una organización conformada por familias, profesionales y personas autistas que impulsamos proyectos que sensibilizan, capacitan y acompañan, siempre desde una mirada respetuosa de la neurodiversidad.',
      destacado: '', fecha: '', hora: '', modalidad: '', contacto: '',
      lugarFecha: '', saludo: 'De nuestra mayor consideración:', cierre: 'Saluda atentamente,',
      firmante: 'Claudia Cravea', cargo: 'Directora Ejecutiva', organizacion: 'Asociación Civil Aletea',
      telefono: '099 29 44 21', correo: 'info@aletea.org', foto: '',
    },
  },
})

export const DISENO_COMUNICACION_INICIAL = Object.freeze({
  formato: 'vertical', paleta: 'institucional', fuente: 'leagueGothic', composicion: 'evento', paginaActiva: 0,
  escalaTitulo: 1, escalaTexto: 1, giroEtiqueta: -8, tituloMulticolor: false, justificarTexto: true,
  mostrarRedes: true, mostrarFondoTitulo: true, mostrarEtiqueta: true,
  mostrarDetalles: true, mostrarLogo: true, mostrarBanda: true, mostrarDesliza: false, mostrarFoto: false,
  mostrarContacto: true, mostrarFirma: true, mostrarNumeroPagina: true,
})

export const ESCALA_TITULO_MAXIMA = 2

export function crearDisenoComunicacion(plantilla = 'apoyo') {
  const elegida = PLANTILLAS_COMUNICACION[plantilla] ?? PLANTILLAS_COMUNICACION.apoyo
  const ajustes = elegida.composicion === 'editorial'
    ? { mostrarFondoTitulo: false, mostrarEtiqueta: false, mostrarDetalles: false, mostrarDesliza: true, mostrarFoto: true, tituloMulticolor: true }
    : elegida.composicion === 'mensaje'
      ? { mostrarFondoTitulo: false, mostrarDetalles: false, mostrarBanda: true, tituloMulticolor: true }
      : elegida.composicion === 'carta'
        ? { formato: 'a4', fuente: 'poppins', mostrarRedes: false, mostrarFondoTitulo: false, mostrarEtiqueta: false, mostrarDetalles: false, mostrarFoto: true, tituloMulticolor: false }
      : {}
  const datos = { ...elegida.datos }
  if (elegida.composicion === 'carta' && !datos.lugarFecha) datos.lugarFecha = fechaCartaActual()
  return {
    version: 2,
    plantilla: PLANTILLAS_COMUNICACION[plantilla] ? plantilla : 'apoyo',
    datos,
    diapositivas: (elegida.diapositivas ?? []).map((datos) => ({ ...elegida.datos, ...datos })),
    diseno: { ...DISENO_COMUNICACION_INICIAL, ...ajustes, paleta: elegida.paleta, composicion: elegida.composicion },
  }
}

export function normalizarDisenoComunicacion(valor) {
  const base = crearDisenoComunicacion(valor?.plantilla)
  const formatoSolicitado = FORMATOS_COMUNICACION[valor?.diseno?.formato] ? valor.diseno.formato : base.diseno.formato
  const formato = base.diseno.composicion === 'carta' ? 'a4' : formatoSolicitado === 'a4' ? base.diseno.formato : formatoSolicitado
  const paleta = PALETAS_COMUNICACION[valor?.diseno?.paleta] ? valor.diseno.paleta : base.diseno.paleta
  const fuenteSolicitada = FUENTES_COMUNICACION[valor?.diseno?.fuente] ? valor.diseno.fuente : base.diseno.fuente
  const fuente = base.diseno.composicion === 'carta' ? 'poppins' : fuenteSolicitada
  const diapositivas = Array.isArray(valor?.diapositivas)
    ? valor.diapositivas.slice(0, 10).map((datos) => ({ ...base.datos, ...(datos ?? {}) }))
    : base.diapositivas
  const paginaActiva = Math.min(Math.max(0, Number(valor?.diseno?.paginaActiva) || 0), Math.max(0, diapositivas.length - 1))
  return {
    ...base,
    datos: { ...base.datos, ...(valor?.datos ?? {}) },
    diapositivas,
    diseno: {
      ...base.diseno, ...(valor?.diseno ?? {}), formato, paleta, fuente, paginaActiva,
      escalaTitulo: Math.min(ESCALA_TITULO_MAXIMA, Math.max(.72, Number(valor?.diseno?.escalaTitulo ?? 1))),
      escalaTexto: Math.min(1.3, Math.max(.82, Number(valor?.diseno?.escalaTexto ?? 1))),
      giroEtiqueta: Math.min(20, Math.max(-20, Number(valor?.diseno?.giroEtiqueta ?? -8))),
    },
  }
}

export function datosComunicacionActivos(valor) {
  const estado = normalizarDisenoComunicacion(valor)
  return estado.diapositivas.length ? estado.diapositivas[estado.diseno.paginaActiva] : estado.datos
}

export function textoPublicacionComunicacion(valor) {
  const estado = normalizarDisenoComunicacion(valor)
  const datos = datosComunicacionActivos(estado)
  if (estado.diseno.composicion === 'carta') {
    return [datos.lugarFecha, datos.titulo && `Asunto: ${datos.titulo}`, datos.saludo, datos.descripcion, datos.destacado, datos.cierre, datos.firmante, datos.cargo, datos.organizacion]
      .filter(Boolean).join('\n\n')
  }
  const detalles = [datos.fecha, datos.hora, datos.modalidad].filter(Boolean).join(' · ')
  return [String(datos.titulo || '').replace(/\n+/g, ' '), datos.descripcion, datos.destacado, detalles, datos.contacto && `Más información: ${datos.contacto}`, `${datos.red || '@aleteauy'} · ${datos.sitio || 'www.aletea.org'}`]
    .filter(Boolean).join('\n\n')
}

export function advertenciasComunicacion(valor) {
  const estado = normalizarDisenoComunicacion(valor)
  const datos = datosComunicacionActivos(estado)
  const advertencias = []
  if (estado.diseno.composicion === 'carta') {
    if (!String(datos.descripcion || '').trim()) advertencias.push('Falta el cuerpo de la carta.')
    if (String(datos.descripcion || '').length > 1100) advertencias.push('El cuerpo es extenso. Revisá que entre completo antes de imprimir.')
    if (!String(datos.firmante || '').trim()) advertencias.push('Falta el nombre de quien firma.')
    return advertencias
  }
  if (String(datos.titulo || '').replace(/\s+/g, ' ').trim().length > 74) advertencias.push('El título es largo y puede perder impacto.')
  if (estado.diseno.escalaTitulo > 1.5 && String(datos.titulo || '').split('\n').length > 2) advertencias.push('El título es grande y tiene varias líneas. Revisá que no invada otros textos.')
  if (String(datos.descripcion || '').length > 280) advertencias.push('La descripción puede quedar demasiado pequeña.')
  if (!String(datos.titulo || '').trim()) advertencias.push('Falta el título principal.')
  return advertencias
}

function fechaCartaActual(fecha = new Date()) {
  const texto = new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'long', year: 'numeric' }).format(fecha)
  return `Montevideo, ${texto}`
}

function fuenteCanvas(diseno, peso, tamano, expresiva = false) {
  const clave = expresiva ? diseno.fuente : 'poppins'
  const elegida = FUENTES_COMUNICACION[clave] ?? FUENTES_COMUNICACION.poppins
  const pesoReal = peso >= 500 ? elegida.pesoDestacado : elegida.pesoNormal
  return `${pesoReal} ${tamano}px ${elegida.familia}`
}

function ajustarLineas(ctx, texto, anchoMaximo) {
  const lineas = []
  String(texto ?? '').split('\n').forEach((parrafo) => {
    const palabras = parrafo.trim().split(/\s+/).filter(Boolean)
    if (!palabras.length) return lineas.push('')
    let actual = palabras.shift()
    palabras.forEach((palabra) => {
      const candidato = `${actual} ${palabra}`
      if (ctx.measureText(candidato).width <= anchoMaximo) actual = candidato
      else { lineas.push(actual); actual = palabra }
    })
    lineas.push(actual)
  })
  return lineas
}

function textoEnLineas(ctx, texto, x, y, ancho, interlineado, maximo = Infinity) {
  const lineas = ajustarLineas(ctx, texto, ancho).slice(0, maximo)
  lineas.forEach((linea, indice) => ctx.fillText(linea, x, y + indice * interlineado))
  return lineas.length
}

function rectanguloRedondeado(ctx, x, y, ancho, alto, radio) {
  ctx.beginPath()
  ctx.roundRect(x, y, ancho, alto, radio)
  ctx.fill()
}

function pintarImagenContenida(ctx, imagen, x, y, anchoMaximo, altoMaximo) {
  const anchoOriginal = Number(imagen?.naturalWidth || imagen?.videoWidth || imagen?.width)
  const altoOriginal = Number(imagen?.naturalHeight || imagen?.videoHeight || imagen?.height)
  if (!(anchoOriginal > 0 && altoOriginal > 0)) {
    ctx.drawImage(imagen, x, y, anchoMaximo, altoMaximo)
    return
  }
  const escala = Math.min(anchoMaximo / anchoOriginal, altoMaximo / altoOriginal)
  const ancho = anchoOriginal * escala
  const alto = altoOriginal * escala
  ctx.drawImage(imagen, x + anchoMaximo - ancho, y + (altoMaximo - alto) / 2, ancho, alto)
}

function iconoCalendario(ctx, x, y, color) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 5
  ctx.beginPath(); ctx.roundRect(x, y, 54, 54, 8); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x, y + 17); ctx.lineTo(x + 54, y + 17); ctx.stroke()
  ;[12, 27, 42].forEach((dx) => { ctx.beginPath(); ctx.moveTo(x + dx, y + 27); ctx.lineTo(x + dx, y + 45); ctx.stroke() })
  ctx.restore()
}

function iconoVideo(ctx, x, y, color) {
  ctx.save(); ctx.fillStyle = color
  ctx.beginPath(); ctx.roundRect(x, y, 52, 42, 10); ctx.fill()
  ctx.beginPath(); ctx.moveTo(x + 49, y + 12); ctx.lineTo(x + 68, y + 4); ctx.lineTo(x + 68, y + 38); ctx.lineTo(x + 49, y + 30); ctx.closePath(); ctx.fill()
  ctx.restore()
}

function pintarTituloPorLineas(ctx, lineas, diseno, color, { x, y, tamano, interlineado, escalaX = .76, centrado = false }) {
  ctx.save(); ctx.textAlign = centrado ? 'center' : 'left'; ctx.font = fuenteCanvas(diseno, 500, tamano, true)
  ctx.translate(x, y); ctx.scale(escalaX, 1)
  lineas.forEach((linea, indice) => {
    ctx.fillStyle = diseno.tituloMulticolor ? [color.principal, color.acento, color.apoyo][indice % 3] : color.principal
    ctx.fillText(linea, 0, indice * interlineado)
  })
  ctx.restore()
}

function pintarEditorial(ctx, estado, color, logo, foto, zonas) {
  const datos = datosComunicacionActivos(estado)
  const lineas = String(datos.titulo || '').toUpperCase().split('\n').slice(0, 4)
  const limitePorLineas = lineas.length >= 4 ? 140 : 188
  const tamano = Math.min(limitePorLineas, 94 * estado.diseno.escalaTitulo)
  pintarTituloPorLineas(ctx, lineas, estado.diseno, color, { x: 82, y: 260, tamano, interlineado: tamano * .94, escalaX: .82 })
  zonas.push({ campo: 'titulo', x: 70, y: 145, ancho: 900, alto: Math.max(170, lineas.length * tamano) })

  const fotoY = Math.min(655, 290 + lineas.length * tamano)
  if (estado.diseno.mostrarFoto) {
    ctx.fillStyle = color.suave; ctx.fillRect(0, fotoY, 1016, 380)
    if (foto) ctx.drawImage(foto, 0, fotoY, 1016, 380)
    else {
      ctx.fillStyle = color.principal; ctx.textAlign = 'center'; ctx.font = fuenteCanvas(estado.diseno, 500, 25)
      ctx.fillText('AGREGÁ UNA FOTO DESDE EL PANEL DE ELEMENTOS', 508, fotoY + 195)
    }
    zonas.push({ campo: 'foto', x: 0, y: fotoY, ancho: 1016, alto: 380 })
  }

  const textoY = estado.diseno.mostrarFoto ? fotoY + 430 : fotoY + 45
  ctx.fillStyle = color.principal; ctx.textAlign = 'left'; ctx.font = fuenteCanvas(estado.diseno, 400, 30)
  const cantidad = textoEnLineas(ctx, datos.descripcion, 82, textoY, 875, 43, estado.diseno.mostrarFoto ? 3 : 6)
  zonas.push({ campo: 'descripcion', x: 70, y: textoY - 34, ancho: 900, alto: Math.max(72, cantidad * 43) })
  if (datos.destacado) {
    ctx.font = fuenteCanvas(estado.diseno, 500, 30)
    textoEnLineas(ctx, datos.destacado, 82, textoY + cantidad * 43 + 15, 875, 42, 3)
  }

  if (estado.diseno.mostrarDesliza) {
    ctx.fillStyle = color.principal; rectanguloRedondeado(ctx, 82, 1200, 205, 48, 24)
    ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.font = fuenteCanvas(estado.diseno, 500, 21)
    ctx.fillText('DESLIZÁ  →', 184, 1232)
  }
  if (estado.diapositivas.length > 1) {
    ctx.fillStyle = color.principal; ctx.textAlign = 'right'; ctx.font = fuenteCanvas(estado.diseno, 500, 22)
    ctx.fillText(`${estado.diseno.paginaActiva + 1} / ${estado.diapositivas.length}`, 940, 1232)
  }
  if (estado.diseno.mostrarLogo && logo) pintarImagenContenida(ctx, logo, 855, 1248, 140, 82)
  if (estado.diseno.mostrarBanda) {
    ctx.fillStyle = color.principal; ctx.fillRect(1016, 0, 64, 450)
    ctx.fillStyle = color.apoyo; ctx.fillRect(1016, 450, 64, 450)
    ctx.fillStyle = color.acento; ctx.fillRect(1016, 900, 64, 450)
  }
}

function pintarMensaje(ctx, estado, color, logo, zonas) {
  const datos = datosComunicacionActivos(estado)
  if (estado.diseno.mostrarLogo && logo) pintarImagenContenida(ctx, logo, 840, 45, 150, 88)
  const lineas = String(datos.titulo || '').toUpperCase().split('\n').slice(0, 5)
  const limitePorLineas = lineas.length >= 5 ? 130 : lineas.length === 4 ? 170 : 224
  const tamano = Math.min(limitePorLineas, 112 * estado.diseno.escalaTitulo)
  pintarTituloPorLineas(ctx, lineas, estado.diseno, color, { x: 540, y: 335, tamano, interlineado: tamano * .92, escalaX: .78, centrado: true })
  zonas.push({ campo: 'titulo', x: 90, y: 190, ancho: 900, alto: Math.max(260, lineas.length * tamano) })
  if (estado.diseno.mostrarEtiqueta && datos.etiqueta) {
    ctx.fillStyle = color.principal; ctx.textAlign = 'center'; ctx.font = fuenteCanvas({ ...estado.diseno, fuente: 'poppins' }, 500, 48)
    ctx.fillText(datos.etiqueta, 540, 880); zonas.push({ campo: 'etiqueta', x: 250, y: 825, ancho: 580, alto: 85 })
  }
  ctx.fillStyle = color.principal; ctx.textAlign = 'center'; ctx.font = fuenteCanvas(estado.diseno, 400, 30)
  const lineasDescripcion = ajustarLineas(ctx, datos.descripcion, 780).slice(0, 4)
  lineasDescripcion.forEach((linea, indice) => ctx.fillText(linea, 540, 1015 + indice * 43))
  zonas.push({ campo: 'descripcion', x: 130, y: 970, ancho: 820, alto: 190 })
  if (estado.diseno.mostrarBanda) {
    ctx.fillStyle = color.principal; ctx.fillRect(0, 1300, 360, 50)
    ctx.fillStyle = color.apoyo; ctx.fillRect(360, 1300, 360, 50)
    ctx.fillStyle = color.acento; ctx.fillRect(720, 1300, 360, 50)
  }
}

function pintarLineaJustificada(ctx, linea, x, y, ancho, justificar) {
  const palabras = String(linea || '').trim().split(/\s+/).filter(Boolean)
  if (!justificar || palabras.length < 3) { ctx.fillText(linea, x, y); return }
  const anchoPalabras = palabras.reduce((total, palabra) => total + ctx.measureText(palabra).width, 0)
  const espacio = (ancho - anchoPalabras) / (palabras.length - 1)
  let cursor = x
  palabras.forEach((palabra) => { ctx.fillText(palabra, cursor, y); cursor += ctx.measureText(palabra).width + espacio })
}

function pintarCarta(ctx, estado, color, logo, firma, zonas) {
  const datos = datosComunicacionActivos(estado)
  const disenoLectura = { ...estado.diseno, fuente: 'poppins' }
  const margen = 82

  if (estado.diseno.mostrarBanda) {
    ctx.fillStyle = color.principal; ctx.fillRect(0, 0, 970, 30)
    ctx.fillStyle = color.apoyo; ctx.fillRect(970, 0, 270, 30)
  }
  if (estado.diseno.mostrarLogo && logo) pintarImagenContenida(ctx, logo, margen, 78, 285, 145)

  if (estado.diseno.mostrarContacto) {
    ctx.fillStyle = '#252126'; ctx.textAlign = 'right'; ctx.font = fuenteCanvas(disenoLectura, 400, 22)
    ctx.fillText(`Tel. ${datos.telefono || ''}`, 1145, 116)
    ctx.fillStyle = color.principal; ctx.fillText(datos.sitio || '', 1145, 151)
    ctx.fillStyle = '#252126'; ctx.fillText(datos.correo || '', 1145, 186)
    zonas.push(
      { campo: 'telefono', x: 820, y: 82, ancho: 345, alto: 40 },
      { campo: 'sitio', x: 820, y: 120, ancho: 345, alto: 40 },
      { campo: 'correo', x: 820, y: 155, ancho: 345, alto: 40 },
    )
  }
  ctx.fillStyle = color.acento; ctx.fillRect(margen, 252, 1076, 9)

  ctx.textAlign = 'left'; ctx.fillStyle = '#252126'; ctx.font = fuenteCanvas(disenoLectura, 400, 23)
  ctx.fillText(datos.lugarFecha || '', 158, 332)
  zonas.push({ campo: 'lugarFecha', x: 145, y: 295, ancho: 820, alto: 52 })

  let y = 420
  if (datos.titulo) {
    ctx.font = fuenteCanvas(disenoLectura, 500, 22)
    ctx.fillText(`Asunto: ${datos.titulo}`, 158, y)
    zonas.push({ campo: 'titulo', x: 145, y: y - 32, ancho: 920, alto: 45 })
    y += 68
  }
  ctx.font = fuenteCanvas(disenoLectura, 500, 24)
  ctx.fillText(datos.saludo || '', 158, y)
  zonas.push({ campo: 'saludo', x: 145, y: y - 34, ancho: 920, alto: 48 })

  const tamano = Math.round(22 * estado.diseno.escalaTexto)
  const interlineado = Math.round(tamano * 1.48)
  const cuerpoY = y + 72
  ctx.font = fuenteCanvas(disenoLectura, 400, tamano)
  const maximoLineas = Math.max(8, Math.floor((970 - cuerpoY) / interlineado))
  const lineas = ajustarLineas(ctx, datos.descripcion, 920).slice(0, maximoLineas)
  lineas.forEach((linea, indice) => pintarLineaJustificada(ctx, linea, 158, cuerpoY + indice * interlineado, 920, estado.diseno.justificarTexto && indice < lineas.length - 1))
  zonas.push({ campo: 'descripcion', x: 145, y: cuerpoY - 35, ancho: 945, alto: Math.max(80, lineas.length * interlineado + 20) })

  let finalCuerpo = cuerpoY + lineas.length * interlineado
  if (datos.destacado) {
    ctx.font = fuenteCanvas(disenoLectura, 500, tamano)
    const lineasDestacadas = ajustarLineas(ctx, datos.destacado, 920).slice(0, 5)
    lineasDestacadas.forEach((linea, indice) => ctx.fillText(linea, 158, finalCuerpo + 18 + indice * interlineado))
    zonas.push({ campo: 'destacado', x: 145, y: finalCuerpo - 12, ancho: 945, alto: lineasDestacadas.length * interlineado + 35 })
    finalCuerpo += 18 + lineasDestacadas.length * interlineado
  }

  const firmaY = Math.min(1375, Math.max(1040, finalCuerpo + 115))
  ctx.textAlign = 'left'; ctx.fillStyle = '#252126'; ctx.font = fuenteCanvas(disenoLectura, 400, 22)
  ctx.fillText(datos.cierre || '', 785, firmaY)
  zonas.push({ campo: 'cierre', x: 770, y: firmaY - 34, ancho: 350, alto: 46 })
  if (estado.diseno.mostrarFirma && firma) {
    pintarImagenContenida(ctx, firma, 760, firmaY + 12, 285, 120)
    zonas.push({ campo: 'foto', x: 750, y: firmaY + 5, ancho: 305, alto: 135 })
  }
  const datosFirmaY = firmaY + (estado.diseno.mostrarFirma && firma ? 145 : 58)
  ctx.font = fuenteCanvas(disenoLectura, 500, 22); ctx.fillText(datos.firmante || '', 785, datosFirmaY)
  ctx.font = fuenteCanvas(disenoLectura, 400, 20); ctx.fillText(datos.cargo || '', 785, datosFirmaY + 31); ctx.fillText(datos.organizacion || '', 785, datosFirmaY + 61)
  zonas.push(
    { campo: 'firmante', x: 770, y: datosFirmaY - 30, ancho: 365, alto: 38 },
    { campo: 'cargo', x: 770, y: datosFirmaY + 5, ancho: 365, alto: 34 },
    { campo: 'organizacion', x: 770, y: datosFirmaY + 37, ancho: 365, alto: 34 },
  )

  if (estado.diseno.mostrarNumeroPagina) {
    ctx.fillStyle = '#252126'; ctx.textAlign = 'left'; ctx.font = fuenteCanvas(disenoLectura, 400, 18); ctx.fillText('1', 158, 1668)
  }
}

export function pintarComunicacionVisual(ctx, valor, logo = null, foto = null) {
  const estado = normalizarDisenoComunicacion(valor)
  const formato = FORMATOS_COMUNICACION[estado.diseno.formato]
  const color = PALETAS_COMUNICACION[estado.diseno.paleta]
  const datos = datosComunicacionActivos(estado)
  const { diseno } = estado
  ctx.canvas.width = formato.ancho
  ctx.canvas.height = formato.alto
  ctx.setTransform?.(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = diseno.composicion === 'carta' ? '#FFFFFF' : color.fondo
  ctx.fillRect(0, 0, formato.ancho, formato.alto)
  if (diseno.composicion === 'carta') {
    const zonas = []
    pintarCarta(ctx, estado, color, logo, foto, zonas)
    ctx.setTransform?.(1, 0, 0, 1, 0, 0)
    return { estado, formato, zonas, transformacion: { escala: 1, ox: 0, oy: 0 } }
  }
  const escala = Math.min(formato.ancho / 1080, formato.alto / 1350)
  const ox = (formato.ancho - 1080 * escala) / 2
  const oy = (formato.alto - 1350 * escala) / 2
  ctx.setTransform?.(escala, 0, 0, escala, ox, oy)
  ctx.textBaseline = 'alphabetic'

  const zonas = []
  if (diseno.mostrarRedes) {
    ctx.fillStyle = color.principal; ctx.textAlign = 'center'; ctx.font = fuenteCanvas(diseno, 500, 28)
    ctx.fillText(datos.red, 540, 70); ctx.fillText(datos.sitio, 540, 102)
    zonas.push({ campo: 'red', x: 350, y: 35, ancho: 380, alto: 40 }, { campo: 'sitio', x: 350, y: 72, ancho: 380, alto: 42 })
  }

  if (diseno.composicion === 'editorial') {
    pintarEditorial(ctx, estado, color, logo, foto, zonas)
    ctx.setTransform?.(1, 0, 0, 1, 0, 0)
    return { estado, formato, zonas, transformacion: { escala, ox, oy } }
  }
  if (diseno.composicion === 'mensaje') {
    pintarMensaje(ctx, estado, color, logo, zonas)
    ctx.setTransform?.(1, 0, 0, 1, 0, 0)
    return { estado, formato, zonas, transformacion: { escala, ox, oy } }
  }

  if (diseno.mostrarFondoTitulo) {
    ctx.save(); ctx.globalAlpha = .9; ctx.fillStyle = color.suave; ctx.textAlign = 'center'; ctx.font = fuenteCanvas(diseno, 500, 188, true)
    ctx.translate(540, 335); ctx.scale(.72, 1); ctx.fillText(datos.fondoTitulo.toUpperCase(), 0, 0); ctx.restore()
    zonas.push({ campo: 'fondoTitulo', x: 65, y: 150, ancho: 950, alto: 210 })
  }

  const lineasTitulo = String(datos.titulo).toUpperCase().split('\n').slice(0, 3)
  const tamanoTitulo = Math.min(lineasTitulo.length >= 3 ? 130 : 226, 113 * diseno.escalaTitulo)
  pintarTituloPorLineas(ctx, lineasTitulo, diseno, color, { x: 82, y: 445, tamano: tamanoTitulo, interlineado: tamanoTitulo * .98 })
  zonas.push({ campo: 'titulo', x: 70, y: 330, ancho: 900, alto: 270 })

  if (diseno.mostrarEtiqueta) {
    ctx.save(); ctx.translate(840, 590); ctx.rotate(diseno.giroEtiqueta * Math.PI / 180)
    ctx.fillStyle = color.apoyo; rectanguloRedondeado(ctx, -145, -65, 290, 130, 58)
    ctx.fillStyle = color.acento; ctx.textAlign = 'center'; ctx.font = fuenteCanvas(diseno, 500, 58, true); ctx.fillText(datos.etiqueta.toUpperCase(), 0, 20); ctx.restore()
    zonas.push({ campo: 'etiqueta', x: 680, y: 500, ancho: 320, alto: 180 })
  }

  ctx.textAlign = 'left'; ctx.fillStyle = color.principal; ctx.font = fuenteCanvas(diseno, 400, 31)
  const cantidad = textoEnLineas(ctx, datos.descripcion, 102, 735, 870, 45, 5)
  zonas.push({ campo: 'descripcion', x: 90, y: 700, ancho: 890, alto: Math.max(80, cantidad * 45) })
  ctx.font = fuenteCanvas(diseno, 500, 31)
  const yDestacado = 735 + cantidad * 45 + 12
  const cantidadDestacada = textoEnLineas(ctx, datos.destacado, 102, yDestacado, 870, 44, 4)
  zonas.push({ campo: 'destacado', x: 90, y: yDestacado - 36, ancho: 890, alto: Math.max(70, cantidadDestacada * 44) })

  if (diseno.mostrarDetalles) {
    const y = 1100
    iconoCalendario(ctx, 105, y - 47, color.acento)
    ctx.fillStyle = color.principal; ctx.textAlign = 'left'; ctx.font = fuenteCanvas(diseno, 400, 29); ctx.fillText(datos.fecha, 180, y - 12); ctx.fillText(datos.hora, 180, y + 31)
    iconoVideo(ctx, 650, y - 50, color.acento); ctx.fillText(datos.modalidad, 735, y + 4)
    zonas.push({ campo: 'fecha', x: 95, y: y - 65, ancho: 500, alto: 55 }, { campo: 'hora', x: 160, y: y, ancho: 380, alto: 50 }, { campo: 'modalidad', x: 635, y: y - 65, ancho: 360, alto: 90 })
  }

  if (datos.contacto) {
    ctx.fillStyle = color.principal; rectanguloRedondeado(ctx, 385, 1190, 310, 62, 31)
    ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.font = fuenteCanvas(diseno, 500, 27); ctx.fillText(datos.contacto, 540, 1230)
    zonas.push({ campo: 'contacto', x: 375, y: 1175, ancho: 330, alto: 85 })
  }

  if (diseno.mostrarLogo && logo) pintarImagenContenida(ctx, logo, 895, 1165, 125, 88)
  if (diseno.mostrarBanda) {
    ctx.fillStyle = color.principal; ctx.fillRect(0, 1300, 360, 50)
    ctx.fillStyle = color.apoyo; ctx.fillRect(360, 1300, 360, 50)
    ctx.fillStyle = color.acento; ctx.fillRect(720, 1300, 360, 50)
  }
  ctx.setTransform?.(1, 0, 0, 1, 0, 0)
  return { estado, formato, zonas, transformacion: { escala, ox, oy } }
}

export function svgDesdeLienzo(canvas) {
  const png = canvas.toDataURL('image/png')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}"><title>Pieza de comunicación visual de Aletea</title><image width="100%" height="100%" href="${png}"/></svg>`
}
