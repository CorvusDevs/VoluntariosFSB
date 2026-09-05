import { boton, elemento, vaciar } from './componentes.js'
import {
  actualizarValidacionParticipantes, advertenciasLoteCertificados, crearConfiguracionCertificado,
  formatearCedulaUruguay, importarParticipantesCertificados, sugerirCapacitacionLote, TIPOS_CERTIFICADO,
} from '../modelo/certificados.js'
import { archivosSvgCertificados, crearSvgCertificado, imprimirLoteCertificados, limitesContenidoFirma, MEDIDAS_CERTIFICADO } from '../imagen/certificados.js'
import { crearZip } from '../util/zip.js'

function leerTextoArchivo(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader()
    lector.onload = () => resolver(String(lector.result || ''))
    lector.onerror = () => rechazar(new Error('No pudimos leer el archivo.'))
    lector.readAsText(archivo, 'UTF-8')
  })
}

function leerImagenArchivo(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader()
    lector.onload = () => resolver(String(lector.result || ''))
    lector.onerror = () => rechazar(new Error('No pudimos leer el logotipo.'))
    lector.readAsDataURL(archivo)
  })
}

function cargarImagen(fuente) {
  return new Promise((resolver, rechazar) => {
    const imagen = new Image()
    imagen.onload = () => resolver(imagen)
    imagen.onerror = () => rechazar(new Error('No pudimos abrir la imagen.'))
    imagen.src = fuente
  })
}

function esquinaClara(datos, ancho, x, y) {
  const indice = (y * ancho + x) * 4
  return datos[indice + 3] > 245 && datos[indice] > 242 && datos[indice + 1] > 242 && datos[indice + 2] > 242
}

async function leerFirmaRecortada(archivo) {
  const fuente = await leerImagenArchivo(archivo)
  const imagen = await cargarImagen(fuente)
  const lienzo = document.createElement('canvas'); lienzo.width = imagen.naturalWidth || imagen.width; lienzo.height = imagen.naturalHeight || imagen.height
  const contexto = lienzo.getContext('2d', { willReadFrequently: true })
  if (!contexto) return { fuente, advertencias: ['No pudimos recortar los márgenes automáticamente.'] }
  contexto.drawImage(imagen, 0, 0)
  const datos = contexto.getImageData(0, 0, lienzo.width, lienzo.height).data
  const esquinas = [[0, 0], [lienzo.width - 1, 0], [0, lienzo.height - 1], [lienzo.width - 1, lienzo.height - 1]]
  const advertencias = []
  if (esquinas.filter(([x, y]) => esquinaClara(datos, lienzo.width, x, y)).length >= 3) advertencias.push('El PNG parece tener fondo blanco. Usá uno transparente para un resultado limpio.')
  const limites = limitesContenidoFirma(datos, lienzo.width, lienzo.height)
  if (!limites) return { fuente, advertencias: ['No encontramos trazos visibles en el PNG.'] }
  if (limites.ancho < 280 || limites.alto < 80) advertencias.push('La firma tiene poca resolución y podría verse borrosa al imprimir.')
  const margen = Math.max(4, Math.round(Math.min(lienzo.width, lienzo.height) * .012))
  const x = Math.max(0, limites.x - margen); const y = Math.max(0, limites.y - margen)
  const ancho = Math.min(lienzo.width - x, limites.ancho + margen * 2); const alto = Math.min(lienzo.height - y, limites.alto + margen * 2)
  const recorte = document.createElement('canvas'); recorte.width = ancho; recorte.height = alto
  recorte.getContext('2d').drawImage(lienzo, x, y, ancho, alto, 0, 0, ancho, alto)
  const recortada = x > 0 || y > 0 || ancho < lienzo.width || alto < lienzo.height
  return { fuente: recorte.toDataURL('image/png'), advertencias, recortada, ancho, alto }
}

async function cargarLogoAletea() {
  const respuesta = await fetch(new URL('../../assets/logo-aletea-violeta.png', import.meta.url))
  if (!respuesta.ok) throw new Error('No pudimos cargar el logotipo institucional.')
  return leerImagenArchivo(await respuesta.blob())
}

async function cargarFuenteMontserrat() {
  const respuesta = await fetch(new URL('../../assets/fuentes/montserrat-latin-100-900.woff2', import.meta.url))
  if (!respuesta.ok) throw new Error('No pudimos cargar la tipografía del certificado.')
  return leerImagenArchivo(await respuesta.blob())
}

function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a'); enlace.href = url; enlace.download = nombre
  document.body.appendChild(enlace); enlace.click(); enlace.remove(); URL.revokeObjectURL(url)
}

function campo(etiqueta, valor, alCambiar, opciones = {}) {
  const envoltorio = elemento('label', ['certificados-campo'])
  envoltorio.appendChild(elemento('span', [], etiqueta))
  const control = document.createElement(opciones.multilinea ? 'textarea' : 'input')
  if (!opciones.multilinea) control.type = opciones.tipo || 'text'
  if (opciones.min !== undefined) control.min = opciones.min
  if (opciones.max !== undefined) control.max = opciones.max
  if (opciones.step !== undefined) control.step = opciones.step
  control.value = valor ?? ''
  control.addEventListener('input', () => alCambiar(control.value))
  envoltorio.appendChild(control)
  if (opciones.ayuda) envoltorio.appendChild(elemento('small', [], opciones.ayuda))
  return envoltorio
}

export function crearPantallaCertificados(raiz, opciones = {}) {
  const alVolver = opciones.alVolver ?? (() => {})
  const imprimir = opciones.imprimir ?? imprimirLoteCertificados
  const descargar = opciones.descargar ?? descargarBlob
  const leerArchivo = opciones.leerArchivo ?? leerTextoArchivo
  const leerLogo = opciones.leerLogo ?? leerImagenArchivo
  const leerFirma = opciones.leerFirma ?? leerFirmaRecortada
  const cargarLogoPredeterminado = opciones.cargarLogoPredeterminado ?? cargarLogoAletea
  const cargarFuentePredeterminada = opciones.cargarFuentePredeterminada ?? cargarFuenteMontserrat
  let configuracion = crearConfiguracionCertificado('participacion')
  let personas = []
  let activa = 0
  let vivo = true
  let logoInstitucional = ''
  let capacitacionEditada = false
  let temaEditado = false
  const metadatosFirmas = { firma1: null, firma2: null }

  const pantalla = elemento('section', ['certificados'])
  raiz.appendChild(pantalla)

  const cabecera = elemento('header', ['certificados-encabezado'])
  const titulos = elemento('div', [])
  titulos.append(elemento('p', ['certificados-sobrelinea'], 'Comunicación visual'), elemento('h1', [], 'Creá certificados'), elemento('p', ['ayuda'], 'Importá las respuestas, revisá los nombres y descargá todo el lote en A4 apaisado.'))
  cabecera.append(titulos, boton('Volver a piezas', alVolver))

  const pasos = elemento('ol', ['certificados-pasos'])
  ;['Elegí el certificado', 'Cargá las respuestas', 'Revisá y personalizá', 'Descargá el lote'].forEach((texto, indice) => {
    const item = elemento('li', [], texto); item.dataset.paso = String(indice + 1); pasos.appendChild(item)
  })

  const selector = elemento('section', ['certificados-selector'])
  selector.appendChild(elemento('h2', [], '1. Elegí el certificado'))
  const tipos = elemento('div', ['certificados-tipos'])
  selector.appendChild(tipos)

  const importador = elemento('section', ['certificados-importador'])
  importador.append(elemento('h2', [], '2. Cargá las respuestas'), elemento('p', ['ayuda'], 'Desde Google Forms, abrí Respuestas y descargá CSV. También podés copiar las celdas de Google Sheets y pegarlas aquí. Los datos no se guardan en el dispositivo.'))
  const accionesImportar = elemento('div', ['certificados-importar-acciones'])
  const entradaArchivo = document.createElement('input'); entradaArchivo.type = 'file'; entradaArchivo.accept = '.csv,text/csv,.tsv,text/tab-separated-values'; entradaArchivo.hidden = true
  const elegirArchivo = boton('Elegir CSV', () => entradaArchivo.click(), ['boton-principal'])
  const nombreArchivo = elemento('span', ['certificados-archivo'], 'Ningún archivo seleccionado')
  accionesImportar.append(elegirArchivo, nombreArchivo, entradaArchivo)
  const pegar = document.createElement('details'); pegar.className = 'certificados-pegar'
  pegar.appendChild(elemento('summary', [], 'O pegar celdas desde Google Sheets'))
  const textoPegado = document.createElement('textarea'); textoPegado.placeholder = 'Pegá aquí los encabezados y las respuestas copiadas desde la planilla'; textoPegado.setAttribute('aria-label', 'Datos copiados desde Google Sheets')
  const importarPegado = boton('Importar datos pegados', () => importarTexto(textoPegado.value), ['boton-principal'])
  pegar.append(textoPegado, importarPegado)
  const resultadoImportacion = elemento('div', ['certificados-resultado']); resultadoImportacion.setAttribute('role', 'status')
  importador.append(accionesImportar, pegar, resultadoImportacion)

  const mesa = elemento('section', ['certificados-mesa'])
  const lista = elemento('aside', ['certificados-personas'])
  const vista = elemento('section', ['certificados-vista'])
  const vistaCabecera = elemento('div', ['certificados-vista-cabecera'])
  const vistaTitulo = elemento('strong', [], 'Vista previa')
  const vistaMeta = elemento('small', [], `${MEDIDAS_CERTIFICADO.anchoMm} x ${MEDIDAS_CERTIFICADO.altoMm} mm`)
  vistaCabecera.append(vistaTitulo, vistaMeta)
  const hoja = elemento('div', ['certificados-hoja'])
  vista.append(vistaCabecera, hoja)
  const ajustes = elemento('aside', ['certificados-ajustes'])
  mesa.append(lista, vista, ajustes)

  const pie = elemento('footer', ['certificados-pie'])
  const estado = elemento('div', ['certificados-estado']); estado.setAttribute('role', 'status'); estado.setAttribute('aria-live', 'polite')
  const accionesFinales = elemento('div', ['certificados-acciones-finales'])
  const guardarPdf = boton('Imprimir o guardar PDF del lote', () => {
    const incluidas = personas.filter((persona) => persona.incluida !== false)
    imprimir(incluidas, configuracion)
    estado.textContent = `${incluidas.length} certificados preparados en un único PDF.`
  }, ['boton-principal'])
  const bajarZip = boton('Descargar SVG para edición profesional', async () => {
    const archivos = archivosSvgCertificados(personas, configuracion)
    bajarZip.disabled = true
    estado.textContent = 'Preparando los archivos SVG comprimidos...'
    let mensaje = ''
    try {
      descargar(new Blob([await crearZip(archivos)], { type: 'application/zip' }), 'certificados-aletea-svg.zip')
      mensaje = `${archivos.length} certificados SVG comprimidos y listos para editar.`
    } catch {
      mensaje = 'No pudimos preparar los archivos SVG. Probá nuevamente.'
    } finally {
      bajarZip.disabled = Boolean(advertenciasLoteCertificados(personas, configuracion).length)
      estado.textContent = mensaje
    }
  })
  const ayudaDescarga = elemento('p', ['certificados-ayuda-descarga'], 'Recomendado: usá PDF para imprimir o compartir. Los SVG son archivos profesionales para editar en Inkscape, Illustrator, Affinity Designer, Figma o Canva.')
  accionesFinales.append(guardarPdf, bajarZip)
  pie.append(estado, ayudaDescarga, accionesFinales)

  pantalla.append(cabecera, pasos, selector, importador, mesa, pie)

  function importarTexto(texto) {
    const resultado = importarParticipantesCertificados(texto)
    personas = resultado.personas
    const primeraConProblemas = personas.findIndex((persona) => persona.problemas?.length)
    activa = primeraConProblemas >= 0 ? primeraConProblemas : 0
    let detalleCapacitacion = ''
    if (!resultado.error && configuracion.tipo === 'participacion') {
      const sugerencia = sugerirCapacitacionLote(personas)
      if (sugerencia.cantidad === 1) {
        if (!capacitacionEditada) configuracion.capacitacion = sugerencia.valor
        if (!temaEditado) configuracion.tema = sugerencia.valor
        detalleCapacitacion = ` Capacitación y temática se completaron con “${sugerencia.valor}”.`
      } else {
        if (!capacitacionEditada) configuracion.capacitacion = ''
        if (!temaEditado) configuracion.tema = ''
        detalleCapacitacion = sugerencia.cantidad > 1
          ? ` Encontramos ${sugerencia.cantidad} capacitaciones distintas. Elegí la correcta en Datos del certificado antes de descargar.`
          : ' No encontramos una capacitación en la planilla. Completala en Datos del certificado antes de descargar.'
      }
    }
    const columnasReconocidas = resultado.columnas?.capacitacion >= 0 ? 'Nombre, cédula, correo y capacitación' : 'Nombre, cédula y correo'
    resultadoImportacion.textContent = resultado.error || `${personas.length} ${personas.length === 1 ? 'persona importada' : 'personas importadas'}. ${columnasReconocidas} fueron reconocidos automáticamente.${detalleCapacitacion}`
    pintarTrabajo()
  }

  entradaArchivo.addEventListener('change', async () => {
    const archivo = entradaArchivo.files?.[0]
    if (!archivo) return
    nombreArchivo.textContent = archivo.name
    try { importarTexto(await leerArchivo(archivo)) } catch (error) { resultadoImportacion.textContent = error.message }
  })

  function pintarTipos() {
    vaciar(tipos)
    Object.entries(TIPOS_CERTIFICADO).forEach(([clave, plantilla]) => {
      const control = elemento('button', ['certificados-tipo'])
      control.type = 'button'; control.dataset.tipoCertificado = clave; control.setAttribute('aria-pressed', String(configuracion.tipo === clave))
      control.append(elemento('strong', [], plantilla.nombre), elemento('small', [], plantilla.categoria))
      control.addEventListener('click', () => {
        const plantillaAnterior = TIPOS_CERTIFICADO[configuracion.tipo] ?? TIPOS_CERTIFICADO.participacion
        const usarFechaSugerida = !configuracion.lugarFecha || configuracion.lugarFecha === plantillaAnterior.lugarFecha
        configuracion = { ...configuracion, tipo: clave, lugarFecha: usarFechaSugerida ? plantilla.lugarFecha : configuracion.lugarFecha }
        pintarTipos(); pintarAjustes(); pintarVista(); pintarEstado()
      })
      tipos.appendChild(control)
    })
  }

  function pintarPersonas() {
    vaciar(lista)
    const cab = elemento('div', ['certificados-personas-cabecera'])
    cab.append(elemento('h2', [], '3. Revisá las personas'), elemento('small', [], `${personas.length} importadas`))
    lista.appendChild(cab)
    if (!personas.length) {
      lista.appendChild(elemento('p', ['certificados-vacio'], 'La lista aparecerá después de importar las respuestas.'))
      return
    }
    const controles = elemento('div', ['certificados-personas-lista'])
    personas.forEach((persona, indice) => {
      const fila = elemento('div', ['certificados-persona'])
      if (indice === activa) fila.classList.add('activa')
      if (persona.problemas.length) fila.classList.add('requiere-revision')
      const incluir = document.createElement('input'); incluir.type = 'checkbox'; incluir.checked = persona.incluida !== false; incluir.setAttribute('aria-label', `Incluir certificado de ${persona.nombre || `fila ${persona.fila}`}`)
      incluir.addEventListener('change', () => { persona.incluida = incluir.checked; pintarEstado(); pintarPersonas() })
      const abrir = elemento('button', ['certificados-persona-abrir'])
      abrir.type = 'button'; abrir.append(elemento('strong', [], persona.nombre || `Fila ${persona.fila}`), elemento('small', [], persona.problemas.length ? `Revisar: ${persona.problemas.join('. ')}` : persona.cedula))
      abrir.addEventListener('click', () => { activa = indice; pintarPersonas(); pintarAjustes(); pintarVista() })
      fila.append(incluir, abrir); controles.appendChild(fila)
    })
    lista.appendChild(controles)
  }

  function pintarVista() {
    const persona = personas[activa] ?? { nombre: 'Nombre y Apellido', cedula: '1.234.567-8' }
    hoja.innerHTML = crearSvgCertificado(persona, configuracion)
    vistaTitulo.textContent = personas.length ? `Vista previa ${activa + 1} de ${personas.length}` : 'Vista previa de ejemplo'
  }

  function pintarAjustes() {
    vaciar(ajustes)
    ajustes.appendChild(elemento('h2', [], 'Personalizá el lote'))
    const persona = personas[activa]
    if (persona) {
      const personaPanel = elemento('section', ['certificados-ajustes-grupo'])
      personaPanel.appendChild(elemento('h3', [], 'Persona seleccionada'))
      personaPanel.append(
        campo('Nombre y apellido', persona.nombre, (valor) => { persona.nombre = valor; actualizarValidacionParticipantes(personas); pintarPersonas(); pintarVista(); pintarEstado() }),
        campo('Cédula de identidad', persona.cedulaOriginal, (valor) => { persona.cedulaOriginal = valor; persona.cedula = formatearCedulaUruguay(valor); actualizarValidacionParticipantes(personas); pintarPersonas(); pintarVista(); pintarEstado() }, { ayuda: 'El certificado la mostrará automáticamente con puntos y guion.' }),
      )
      ajustes.appendChild(personaPanel)
    }
    const lote = elemento('section', ['certificados-ajustes-grupo'])
    lote.appendChild(elemento('h3', [], 'Datos del certificado'))
    if (configuracion.tipo === 'participacion') {
      lote.append(
        campo('Capacitación o taller', configuracion.capacitacion, (valor) => { capacitacionEditada = true; actualizar('capacitacion')(valor) }),
        campo('Modalidad', configuracion.modalidad, actualizar('modalidad')),
        campo('Temática', configuracion.tema, (valor) => { temaEditado = true; actualizar('tema')(valor) }),
        campo('Horas de duración', configuracion.horas, actualizar('horas')),
        campo('Fecha de la actividad', configuracion.fechaActividad, actualizar('fechaActividad'), { ayuda: 'Ejemplo: 10 de julio de 2026' }),
      )
    }
    lote.appendChild(campo('Lugar y fecha de emisión', configuracion.lugarFecha, actualizar('lugarFecha')))
    ajustes.appendChild(lote)

    const firmas = elemento('section', ['certificados-ajustes-grupo', 'certificados-firmas'])
    firmas.append(elemento('h3', [], 'Firmas'), elemento('p', ['ayuda'], 'Usá archivos PNG transparentes. El gestor recorta los márgenes vacíos y mantiene la proporción.'))
    const sincronizar = elemento('label', ['certificados-sincronizar'])
    const sincronizarControl = document.createElement('input'); sincronizarControl.type = 'checkbox'; sincronizarControl.checked = Boolean(configuracion.sincronizarFirmas)
    sincronizarControl.addEventListener('change', () => {
      configuracion.sincronizarFirmas = sincronizarControl.checked
      if (sincronizarControl.checked) {
        const origen = configuracion.firma1 || !configuracion.firma2 ? 1 : 2; const destino = origen === 1 ? 2 : 1
        configuracion[`firma${destino}Tamano`] = configuracion[`firma${origen}Tamano`]
        configuracion[`firma${destino}Y`] = configuracion[`firma${origen}Y`]
      }
      pintarAjustes(); pintarVista()
    })
    sincronizar.append(sincronizarControl, elemento('span', [], 'Usar el mismo tamaño y altura en ambas firmas'))
    firmas.append(sincronizar, selectorFirma('Primera firma', 'firma1', configuracion.firmante1), selectorFirma('Segunda firma', 'firma2', configuracion.firmante2))
    ajustes.appendChild(firmas)

    const avanzado = document.createElement('details'); avanzado.className = 'certificados-avanzado'
    avanzado.appendChild(elemento('summary', [], 'Personalización avanzada'))
    const panel = elemento('div', ['certificados-avanzado-panel'])
    panel.append(
      campo('Color principal', configuracion.colorPrincipal, actualizar('colorPrincipal'), { tipo: 'color' }),
      campo('Color de acento', configuracion.colorAcento, actualizar('colorAcento'), { tipo: 'color' }),
      campo('Color de apoyo', configuracion.colorApoyo, actualizar('colorApoyo'), { tipo: 'color' }),
      campo('Color del texto', configuracion.colorTexto, actualizar('colorTexto'), { tipo: 'color' }),
      campo('Color de la marca de agua', configuracion.colorMarcaAgua, actualizar('colorMarcaAgua'), { tipo: 'color' }),
      campo('Intensidad de la marca de agua', configuracion.opacidadMarcaAgua, actualizarNumero('opacidadMarcaAgua'), { tipo: 'range', min: 0, max: .7, step: .01 }),
      campo('Escala del texto', configuracion.escalaTexto, actualizarNumero('escalaTexto'), { tipo: 'range', min: .85, max: 1.16, step: .01 }),
      campo('Primer firmante', configuracion.firmante1, actualizar('firmante1')),
      campo('Cargo del primer firmante', configuracion.cargo1, actualizar('cargo1'), { multilinea: true }),
      campo('Segundo firmante', configuracion.firmante2, actualizar('firmante2')),
      campo('Cargo del segundo firmante', configuracion.cargo2, actualizar('cargo2'), { multilinea: true }),
    )
    const contacto = elemento('label', ['certificados-opcion'])
    const mostrar = document.createElement('input'); mostrar.type = 'checkbox'; mostrar.checked = configuracion.mostrarContacto
    mostrar.addEventListener('change', () => { configuracion.mostrarContacto = mostrar.checked; pintarVista() })
    contacto.append(mostrar, elemento('span', [], 'Mostrar datos de contacto en el lateral'))
    panel.append(contacto, campo('Teléfono', configuracion.telefono, actualizar('telefono')), campo('Correo', configuracion.correo, actualizar('correo')), campo('Sitio web', configuracion.sitio, actualizar('sitio')))
    const selectorLogo = elemento('div', ['certificados-logo'])
    selectorLogo.appendChild(elemento('strong', [], 'Logotipo'))
    const entradaLogo = document.createElement('input'); entradaLogo.type = 'file'; entradaLogo.accept = 'image/png,image/jpeg,image/webp,image/svg+xml'; entradaLogo.hidden = true
    const elegirLogo = boton('Elegir logotipo', () => entradaLogo.click())
    const restaurarLogo = boton('Usar logotipo de Aletea', () => { configuracion.logo = logoInstitucional; pintarVista() })
    entradaLogo.addEventListener('change', async () => { const archivo = entradaLogo.files?.[0]; if (!archivo) return; configuracion.logo = await leerLogo(archivo); pintarVista() })
    selectorLogo.append(elegirLogo, restaurarLogo, entradaLogo)
    panel.appendChild(selectorLogo)
    avanzado.appendChild(panel); ajustes.appendChild(avanzado)
  }

  function actualizar(clave) {
    return (valor) => { configuracion[clave] = valor; pintarVista(); pintarEstado() }
  }

  function actualizarNumero(clave) {
    return (valor) => { configuracion[clave] = Number(valor); pintarVista() }
  }

  function controlRangoFirma(etiqueta, clave, opciones) {
    const envoltorio = elemento('label', ['certificados-firma-control'])
    const cabeceraControl = elemento('span', [])
    const nombre = elemento('span', [], etiqueta); const salida = elemento('output', [], opciones.formato(configuracion[clave]))
    cabeceraControl.append(nombre, salida)
    const control = document.createElement('input'); control.type = 'range'; control.min = opciones.min; control.max = opciones.max; control.step = opciones.step
    control.value = configuracion[clave]; control.dataset.ajusteFirma = clave
    control.addEventListener('input', () => {
      const valor = Number(control.value); configuracion[clave] = valor; salida.textContent = opciones.formato(valor)
      const coincidencia = clave.match(/^firma([12])(Tamano|Y)$/)
      if (configuracion.sincronizarFirmas && coincidencia) {
        const otro = `firma${coincidencia[1] === '1' ? '2' : '1'}${coincidencia[2]}`
        configuracion[otro] = valor
        const otroControl = ajustes.querySelector(`[data-ajuste-firma="${otro}"]`)
        if (otroControl) { otroControl.value = String(valor); otroControl.closest('label')?.querySelector('output')?.replaceChildren(opciones.formato(valor)) }
      }
      pintarVista()
    })
    envoltorio.append(cabeceraControl, control)
    return envoltorio
  }

  function restablecerAjustesFirma(indice) {
    configuracion[`firma${indice}Tamano`] = 1; configuracion[`firma${indice}X`] = 0; configuracion[`firma${indice}Y`] = 0
    configuracion[`firma${indice}Grosor`] = 0; configuracion[`firma${indice}Intensidad`] = 1
    if (configuracion.sincronizarFirmas) {
      const otro = indice === 1 ? 2 : 1
      configuracion[`firma${otro}Tamano`] = 1; configuracion[`firma${otro}Y`] = 0
    }
    pintarAjustes(); pintarVista()
  }

  function selectorFirma(etiqueta, clave, nombreFirmante) {
    const indice = clave === 'firma1' ? 1 : 2
    const contenedor = elemento('div', ['certificados-firma'])
    contenedor.append(elemento('strong', [], etiqueta), elemento('span', ['certificados-firma-nombre'], nombreFirmante || 'Firmante'))
    const entrada = document.createElement('input')
    entrada.type = 'file'; entrada.accept = 'image/png'; entrada.hidden = true
    const datosFirma = metadatosFirmas[clave]
    const estadoFirma = elemento('small', ['certificados-firma-estado'], configuracion[clave] ? (datosFirma?.nombre || 'Firma agregada') : 'Sin firma agregada')
    const agregar = boton(configuracion[clave] ? 'Cambiar PNG' : `Agregar firma de ${nombreFirmante || 'firmante'}`, () => entrada.click())
    const quitar = boton('Quitar firma', () => {
      configuracion[clave] = ''; metadatosFirmas[clave] = null; entrada.value = ''; pintarAjustes(); pintarVista()
    })
    quitar.disabled = !configuracion[clave]
    entrada.addEventListener('change', async () => {
      const archivo = entrada.files?.[0]
      if (!archivo) return
      try {
        estadoFirma.textContent = 'Preparando firma...'
        const resultado = await leerFirma(archivo)
        configuracion[clave] = typeof resultado === 'string' ? resultado : resultado.fuente
        metadatosFirmas[clave] = { ...(typeof resultado === 'string' ? {} : resultado), nombre: archivo.name || 'Firma agregada' }
        pintarAjustes(); pintarVista()
      } catch (error) {
        estadoFirma.textContent = error?.message || 'No pudimos preparar esta firma.'
      }
    })
    const acciones = elemento('div', ['certificados-firma-acciones']); acciones.append(agregar, quitar, entrada)
    contenedor.append(acciones, estadoFirma)
    if (datosFirma?.recortada) contenedor.appendChild(elemento('small', ['certificados-firma-confirmacion'], 'Márgenes transparentes recortados automáticamente.'))
    ;(datosFirma?.advertencias || []).forEach((mensaje) => contenedor.appendChild(elemento('small', ['certificados-firma-advertencia'], mensaje)))
    if (configuracion[clave]) {
      const principales = elemento('div', ['certificados-firma-controles'])
      principales.append(
        controlRangoFirma('Tamaño', `firma${indice}Tamano`, { min: .6, max: 1.5, step: .05, formato: (valor) => `${Math.round(Number(valor) * 100)}%` }),
        controlRangoFirma('Altura sobre la línea', `firma${indice}Y`, { min: -100, max: 35, step: 5, formato: (valor) => `${Number(valor) > 0 ? '+' : ''}${valor}` }),
      )
      const centrar = boton('Centrar', () => {
        configuracion[`firma${indice}X`] = 0; configuracion[`firma${indice}Y`] = 0
        if (configuracion.sincronizarFirmas) configuracion[`firma${indice === 1 ? 2 : 1}Y`] = 0
        pintarAjustes(); pintarVista()
      })
      const restaurar = boton('Restablecer', () => restablecerAjustesFirma(indice))
      const finos = document.createElement('details'); finos.className = 'certificados-firma-finos'
      finos.appendChild(elemento('summary', [], 'Ajustes finos'))
      const panelFino = elemento('div', ['certificados-firma-finos-panel'])
      const grosor = elemento('label', ['certificados-firma-control'])
      grosor.appendChild(elemento('span', [], 'Grosor del trazo'))
      const selectorGrosor = document.createElement('select'); selectorGrosor.dataset.ajusteFirma = `firma${indice}Grosor`
      ;[['-1', 'Fino'], ['0', 'Original'], ['1', 'Reforzado'], ['2', 'Marcado']].forEach(([valor, texto]) => { const opcion = document.createElement('option'); opcion.value = valor; opcion.textContent = texto; selectorGrosor.appendChild(opcion) })
      selectorGrosor.value = String(configuracion[`firma${indice}Grosor`]); selectorGrosor.addEventListener('change', () => { configuracion[`firma${indice}Grosor`] = Number(selectorGrosor.value); pintarVista() })
      grosor.appendChild(selectorGrosor)
      panelFino.append(
        controlRangoFirma('Posición lateral', `firma${indice}X`, { min: -150, max: 150, step: 5, formato: (valor) => `${Number(valor) > 0 ? '+' : ''}${valor}` }),
        controlRangoFirma('Intensidad', `firma${indice}Intensidad`, { min: .45, max: 1, step: .05, formato: (valor) => `${Math.round(Number(valor) * 100)}%` }),
        grosor,
      )
      finos.appendChild(panelFino)
      const ajustesAcciones = elemento('div', ['certificados-firma-ajustes-acciones']); ajustesAcciones.append(centrar, restaurar)
      contenedor.append(principales, finos, ajustesAcciones)
    }
    return contenedor
  }

  function pintarEstado() {
    const incluidas = personas.filter((persona) => persona.incluida !== false)
    const advertencias = advertenciasLoteCertificados(personas, configuracion)
    guardarPdf.disabled = Boolean(advertencias.length)
    bajarZip.disabled = Boolean(advertencias.length)
    vaciar(estado)
    estado.appendChild(elemento('span', [], advertencias.length ? advertencias.join(' ') : `${incluidas.length} ${incluidas.length === 1 ? 'certificado listo' : 'certificados listos'} para descargar. Los datos se eliminarán al salir.`))
    const indicePendiente = personas.findIndex((persona) => persona.incluida !== false && persona.problemas?.length)
    if (indicePendiente >= 0) {
      const persona = personas[indicePendiente]
      const nombre = persona.nombre || `fila ${persona.fila}`
      estado.appendChild(boton(`Revisar a ${nombre}`, () => enfocarPersonaPendiente(indicePendiente), ['certificados-revisar']))
    }
  }

  function enfocarPersonaPendiente(indice) {
    activa = indice
    pintarPersonas(); pintarAjustes(); pintarVista()
    const persona = personas[indice]
    const entradas = ajustes.querySelector('.certificados-ajustes-grupo')?.querySelectorAll('input') || []
    const problemaDeNombre = persona?.problemas?.some((problema) => problema.includes('nombre') || problema.includes('apellido'))
    const objetivo = entradas[problemaDeNombre ? 0 : 1] || entradas[0]
    objetivo?.focus()
    ajustes.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
  }

  function pintarTrabajo() {
    pintarPersonas(); pintarAjustes(); pintarVista(); pintarEstado()
  }

  pintarTipos(); pintarTrabajo()
  Promise.allSettled([cargarLogoPredeterminado(), cargarFuentePredeterminada()]).then(([logoResultado, fuenteResultado]) => {
    if (!vivo) return
    if (logoResultado.status === 'fulfilled' && logoResultado.value) {
      logoInstitucional = logoResultado.value
      configuracion.logo = logoResultado.value
      configuracion.marcaInstitucional = logoResultado.value
    }
    if (fuenteResultado.status === 'fulfilled') configuracion.fuenteMontserrat = fuenteResultado.value
    pintarVista()
  })
  return { olvidar() { vivo = false; personas = []; configuracion.logo = ''; configuracion.firma1 = ''; configuracion.firma2 = ''; vaciar(pantalla) }, get vivo() { return vivo } }
}
