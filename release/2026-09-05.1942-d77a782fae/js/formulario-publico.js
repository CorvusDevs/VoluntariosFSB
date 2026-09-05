import { crearSelectorFecha } from './ui/selector-fecha.js'
import { instalarAyudasContextuales } from './ui/ayudas-contextuales.js'
import {
  campoBaseRequerido, campoBaseVisible, configuracionPublicaFormulario, MODELO_WHATSAPP_FAMILIAS,
} from './modelo/formularios.js'

const raiz = document.getElementById('formulario-publico')
instalarAyudasContextuales(document)
const id = new URLSearchParams(window.location.search).get('id')

function campo(etiqueta, tipo = 'text', requerido = true, { autocompletar = 'off', limite = 180 } = {}) {
  const contenedor = document.createElement('label')
  contenedor.className = 'formulario-publico-campo'
  contenedor.textContent = etiqueta
  const input = document.createElement('input'); input.type = tipo; input.required = requerido; input.autocomplete = autocompletar; input.maxLength = limite
  contenedor.appendChild(input)
  return [contenedor, input]
}

function area(etiqueta, requerido = false) {
  const contenedor = document.createElement('label')
  contenedor.className = 'formulario-publico-campo'; contenedor.textContent = etiqueta
  const input = document.createElement('textarea'); input.rows = 4; input.required = requerido; input.maxLength = 4000
  contenedor.appendChild(input)
  return [contenedor, input]
}

function campoFechaHora(etiqueta) {
  const contenedor = document.createElement('div')
  contenedor.className = 'formulario-publico-campo formulario-publico-fecha-hora'
  contenedor.appendChild(Object.assign(document.createElement('span'), { textContent: etiqueta }))
  const selector = crearSelectorFecha({ clave: 'formulario-fecha-propuesta', rotulo: etiqueta })
  const hora = document.createElement('input')
  hora.type = 'time'
  hora.setAttribute('aria-label', `Hora de ${etiqueta}`)
  contenedor.append(selector.campo, hora)
  return [contenedor, {
    get value() { return selector.entrada.value ? `${selector.entrada.value}T${hora.value || '00:00'}` : '' },
    limpiar() { selector.fijarValor(''); hora.value = '' },
  }]
}

function pasoFormulario(numero, titulo, descripcion = '') {
  const contenedor = document.createElement('section')
  contenedor.className = 'formulario-publico-paso'
  contenedor.dataset.paso = String(numero)
  const cabecera = document.createElement('header')
  cabecera.className = 'formulario-publico-paso-cabecera'
  cabecera.append(
    Object.assign(document.createElement('span'), { className: 'formulario-publico-paso-numero', textContent: String(numero) }),
    Object.assign(document.createElement('h2'), { textContent: titulo }),
  )
  if (descripcion) cabecera.appendChild(Object.assign(document.createElement('p'), { textContent: descripcion }))
  contenedor.appendChild(cabecera)
  return contenedor
}

function camposConfigurables(formulario) {
  let campos = []
  try { campos = JSON.parse(formulario.campos_json || '[]') } catch { campos = [] }
  const respuestas = {}
  const confirmacionesCorreo = {}
  const filas = campos.map((campo) => {
    const confirmaCorreo = campo.tipo === 'correo' && Boolean(campo.confirmar_correo)
    const contenedor = document.createElement(campo.tipo === 'seleccion_multiple' || confirmaCorreo ? 'div' : 'label')
    contenedor.className = 'formulario-publico-campo formulario-publico-personalizado'
    contenedor.appendChild(Object.assign(document.createElement('span'), { textContent: `${campo.etiqueta}${campo.requerido ? ' *' : ''}` }))
    let control
    let leerValor
    let limpiarControl
    if (campo.tipo === 'texto_largo') { control = document.createElement('textarea'); control.rows = 4; control.maxLength = 4000 }
    else if (campo.tipo === 'seleccion') {
      control = document.createElement('select')
      control.appendChild(Object.assign(document.createElement('option'), { value: '', textContent: 'Elegir' }))
      ;(campo.opciones || []).forEach((valor) => control.appendChild(Object.assign(document.createElement('option'), { value: valor, textContent: valor })))
    } else if (campo.tipo === 'seleccion_multiple') {
      control = document.createElement('div'); control.className = 'formulario-publico-opciones-multiples'; control.setAttribute('role', 'group'); control.setAttribute('aria-label', campo.etiqueta)
      const casillas = (campo.opciones || []).map((valor) => {
        const fila = document.createElement('label'); const casilla = document.createElement('input'); casilla.type = 'checkbox'; casilla.value = valor
        fila.append(casilla, document.createTextNode(` ${valor}`)); control.appendChild(fila); return casilla
      })
      leerValor = () => casillas.filter((casilla) => casilla.checked).map((casilla) => casilla.value)
      limpiarControl = () => casillas.forEach((casilla) => { casilla.checked = false; casilla.setCustomValidity('') })
      casillas.forEach((casilla) => casilla.addEventListener('change', () => leer()))
      control._casillas = casillas
    } else {
      control = document.createElement('input')
      control.type = campo.tipo === 'casilla' ? 'checkbox' : campo.tipo === 'fecha' ? 'date' : campo.tipo === 'correo' ? 'email' : campo.tipo === 'numero' ? 'number' : 'text'
      if (campo.tipo === 'numero') control.step = 'any'
      control.maxLength = 500
    }
    if (campo.tipo !== 'seleccion_multiple') control.setAttribute('aria-label', campo.etiqueta)
    if (campo.ayuda) contenedor.appendChild(Object.assign(document.createElement('small'), { className: 'ayuda', textContent: campo.ayuda }))
    contenedor.appendChild(control)
    let confirmacionCorreo = null
    if (confirmaCorreo) {
      const etiquetaConfirmacion = document.createElement('label')
      etiquetaConfirmacion.className = 'formulario-publico-campo formulario-publico-confirmacion-correo'
      etiquetaConfirmacion.appendChild(Object.assign(document.createElement('span'), { textContent: `Confirmá ${campo.etiqueta.toLocaleLowerCase('es')}` }))
      confirmacionCorreo = document.createElement('input')
      confirmacionCorreo.type = 'email'; confirmacionCorreo.autocomplete = 'email'; confirmacionCorreo.maxLength = 500
      etiquetaConfirmacion.appendChild(confirmacionCorreo)
      contenedor.appendChild(etiquetaConfirmacion)
    }
    const actualizar = () => {
      const anterior = respuestas[campo.mostrar_si?.campo]
      contenedor.hidden = Boolean(campo.mostrar_si) && !(Array.isArray(anterior) ? anterior.includes(campo.mostrar_si.valor) : String(anterior ?? '') === campo.mostrar_si.valor)
      if (campo.tipo === 'seleccion_multiple') {
        const primera = control._casillas[0]
        if (primera) primera.setCustomValidity(Boolean(campo.requerido) && !contenedor.hidden && !leerValor().length ? 'Elegí al menos una opción.' : '')
      } else control.required = Boolean(campo.requerido) && !contenedor.hidden
      if (confirmacionCorreo) confirmacionCorreo.required = !contenedor.hidden && (Boolean(campo.requerido) || Boolean(control.value))
      if (contenedor.hidden) respuestas[campo.clave] = campo.tipo === 'casilla' ? false : campo.tipo === 'seleccion_multiple' ? [] : ''
    }
    const validarCorreo = () => {
      if (!confirmacionCorreo) return
      const coincide = control.value.trim().toLocaleLowerCase('es') === confirmacionCorreo.value.trim().toLocaleLowerCase('es')
      confirmacionCorreo.setCustomValidity(confirmacionCorreo.value && !coincide ? 'Los correos electrónicos no coinciden.' : '')
      confirmacionesCorreo[campo.clave] = confirmacionCorreo.value
    }
    const leer = () => { respuestas[campo.clave] = leerValor ? leerValor() : control.type === 'checkbox' ? control.checked : control.value; validarCorreo(); filas.forEach((fila) => fila.actualizar()) }
    if (campo.tipo !== 'seleccion_multiple') { control.addEventListener('input', leer); control.addEventListener('change', leer) }
    if (confirmacionCorreo) { confirmacionCorreo.addEventListener('input', validarCorreo); confirmacionCorreo.addEventListener('change', validarCorreo) }
    return { contenedor, control, confirmacionCorreo, actualizar, limpiarControl, validarCorreo }
  })
  filas.forEach((fila) => fila.actualizar())
  return {
    filas, respuestas, confirmacionesCorreo,
    validar() { filas.forEach((fila) => fila.validarCorreo()) },
    limpiar() {
      filas.forEach(({ control, confirmacionCorreo, limpiarControl }) => { if (limpiarControl) limpiarControl(); else if (control.type === 'checkbox') control.checked = false; else control.value = ''; if (confirmacionCorreo) confirmacionCorreo.value = '' })
      Object.keys(respuestas).forEach((clave) => { respuestas[clave] = '' }); Object.keys(confirmacionesCorreo).forEach((clave) => { confirmacionesCorreo[clave] = '' }); filas.forEach((fila) => fila.actualizar())
    },
  }
}

async function iniciar() {
  if (!id) { raiz.textContent = 'No encontramos el formulario solicitado.'; return }
  const respuesta = await fetch(`/api/formularios/${encodeURIComponent(id)}`)
  const datos = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) { raiz.textContent = datos.error || 'Este formulario no está disponible.'; return }
  const { formulario } = datos
  const configuracion = configuracionPublicaFormulario(formulario.configuracion_publica_json)
  const cabecera = document.createElement('header'); cabecera.className = 'formulario-publico-cabecera'
  const marca = document.createElement('div'); marca.className = 'formulario-publico-marca'
  if (configuracion.mostrar_logo) marca.appendChild(Object.assign(document.createElement('img'), { src: 'assets/logo-aletea-violeta.png', alt: 'Aletea' }))
  else marca.appendChild(Object.assign(document.createElement('strong'), { textContent: 'Aletea' }))
  if (configuracion.contacto_institucional) {
    const contactoInstitucional = document.createElement(configuracion.contacto_institucional_enlace ? 'a' : 'span')
    contactoInstitucional.className = 'formulario-publico-contacto-institucional'
    contactoInstitucional.textContent = configuracion.contacto_institucional
    if (contactoInstitucional instanceof HTMLAnchorElement) contactoInstitucional.href = configuracion.contacto_institucional_enlace
    marca.appendChild(contactoInstitucional)
  }
  cabecera.append(marca, Object.assign(document.createElement('h1'), { textContent: formulario.titulo }))
  if (formulario.descripcion) cabecera.appendChild(Object.assign(document.createElement('p'), { textContent: formulario.descripcion }))
  const forma = document.createElement('form'); forma.className = 'formulario-publico-forma'
  const [nombreCaja, nombre] = campo('Nombre o referencia', 'text', campoBaseRequerido(configuracion.nombre), { autocompletar: 'name' })
  const contactoEsCorreo = configuracion.contacto_tipo === 'correo'
  const [contactoCaja, contacto] = campo(contactoEsCorreo ? 'Correo electrónico' : 'Contacto para responderte', contactoEsCorreo ? 'email' : 'text', campoBaseRequerido(configuracion.contacto), { autocompletar: contactoEsCorreo ? 'email' : 'off' })
  const [confirmacionContactoCaja, confirmacionContacto] = campo('Confirmá tu correo electrónico', 'email', configuracion.confirmar_contacto, { autocompletar: 'email' })
  const [mensajeCaja, detalle] = area('Mensaje o contexto', campoBaseRequerido(configuracion.detalle))
  const validarConfirmacionContacto = () => {
    if (!configuracion.confirmar_contacto) return
    const coincide = contacto.value.trim().toLocaleLowerCase('es') === confirmacionContacto.value.trim().toLocaleLowerCase('es')
    confirmacionContacto.setCustomValidity(confirmacionContacto.value && !coincide ? 'Los correos electrónicos no coinciden.' : '')
  }
  contacto.addEventListener('input', validarConfirmacionContacto)
  confirmacionContacto.addEventListener('input', validarConfirmacionContacto)
  const proponeFecha = ['actividad', 'evento'].includes(formulario.tipo)
  const [fechaPropuestaCaja, fechaPropuesta] = campoFechaHora('Fecha propuesta')
  const esPropuesta = formulario.tipo === 'propuesta'
  const [objetivoCaja, objetivo] = area('Objetivo de la propuesta', esPropuesta)
  const [pasosCaja, pasos] = area('Pasos o actividades principales')
  const [recursosCaja, recursos] = area('Recursos necesarios')
  const [personasCaja, personas] = area('Personas o roles necesarios')
  const personalizados = camposConfigurables(formulario)
  const empresa = document.createElement('input'); empresa.name = 'empresa'; empresa.tabIndex = -1; empresa.autocomplete = 'off'; empresa.className = 'formulario-publico-trampa'
  const ayuda = Object.assign(document.createElement('p'), { className: 'ayuda formulario-publico-aviso-datos', textContent: 'No incluyas información médica, diagnósticos ni otros datos sensibles. El equipo te contactará si necesita información adicional.' })
  const privacidad = elementoPrivacidad(formulario, configuracion)
  const compromiso = elementoCompromiso(configuracion)
  const comunicaciones = elementoComunicaciones(contacto, configuracion)
  const enviar = Object.assign(document.createElement('button'), { type: 'submit', textContent: configuracion.modelo === MODELO_WHATSAPP_FAMILIAS ? 'Enviar solicitud de ingreso' : 'Enviar respuesta' }); enviar.className = 'boton boton-principal formulario-publico-enviar'
  const estado = document.createElement('p'); estado.className = 'formulario-publico-estado'; estado.setAttribute('role', 'status'); estado.tabIndex = -1
  let numeroPaso = 1
  const datosPaso = pasoFormulario(numeroPaso, configuracion.modelo === MODELO_WHATSAPP_FAMILIAS ? 'Tus datos' : 'Tus datos y respuestas', configuracion.modelo === MODELO_WHATSAPP_FAMILIAS ? 'Usaremos este contacto solamente para revisar tu solicitud y coordinar el ingreso.' : '')
  numeroPaso += 1
  datosPaso.append(
    campoBaseVisible(configuracion.nombre) ? nombreCaja : document.createDocumentFragment(),
    campoBaseVisible(configuracion.contacto) ? contactoCaja : document.createDocumentFragment(),
    configuracion.confirmar_contacto && campoBaseVisible(configuracion.contacto) ? confirmacionContactoCaja : document.createDocumentFragment(),
    campoBaseVisible(configuracion.detalle) ? mensajeCaja : document.createDocumentFragment(),
    proponeFecha ? fechaPropuestaCaja : document.createDocumentFragment(),
    esPropuesta ? objetivoCaja : document.createDocumentFragment(),
    esPropuesta ? pasosCaja : document.createDocumentFragment(),
    esPropuesta ? recursosCaja : document.createDocumentFragment(),
    esPropuesta ? personasCaja : document.createDocumentFragment(),
    ...personalizados.filas.map((fila) => fila.contenedor),
    ayuda,
  )
  privacidad.contenedor.dataset.paso = String(numeroPaso); privacidad.numero.textContent = String(numeroPaso); numeroPaso += 1
  if (compromiso) { compromiso.contenedor.dataset.paso = String(numeroPaso); compromiso.numero.textContent = String(numeroPaso); numeroPaso += 1 }
  const confirmacionPaso = pasoFormulario(numeroPaso, 'Confirmación', 'Revisá los acuerdos y enviá la solicitud cuando estés pronta o pronto.')
  if (configuracion.texto_cierre) confirmacionPaso.appendChild(Object.assign(document.createElement('p'), { className: 'formulario-publico-cierre', textContent: configuracion.texto_cierre }))
  confirmacionPaso.append(comunicaciones.contenedor, enviar, estado)
  forma.append(datosPaso, privacidad.contenedor, compromiso?.contenedor || document.createDocumentFragment(), confirmacionPaso, empresa)
  forma.addEventListener('submit', async (evento) => {
    evento.preventDefault(); validarConfirmacionContacto(); personalizados.validar(); if (!forma.reportValidity()) return
    enviar.disabled = true; enviar.setAttribute('aria-busy', 'true'); estado.textContent = 'Enviando...'
    try {
      const envio = await fetch(`/api/formularios/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nombre: nombre.value, contacto: contacto.value, contacto_confirmacion: confirmacionContacto.value, detalle: detalle.value, fecha_propuesta: fechaPropuesta.value || null, objetivo: objetivo.value, pasos: pasos.value, recursos: recursos.value, personas_necesarias: personas.value, respuestas: personalizados.respuestas, confirmaciones_correo: personalizados.confirmacionesCorreo, empresa: empresa.value, consentimiento_privacidad: privacidad.control?.checked === true, compromiso_confidencialidad: compromiso?.control?.checked === true, consentimiento_comunicaciones: comunicaciones.control.checked, correo_comunicaciones: comunicaciones.correo.value, temas_comunicaciones: comunicaciones.temasSeleccionados() }) })
      const resultado = await envio.json().catch(() => ({})); if (!envio.ok) throw new Error(resultado.error || 'No se pudo enviar la respuesta.')
      forma.reset(); fechaPropuesta.limpiar(); personalizados.limpiar(); comunicaciones.actualizar()
      const referencia = resultado.referencia ? ` Referencia: ${resultado.referencia}.` : ''
      estado.textContent = resultado.advertencia
        ? `${resultado.advertencia}${referencia}`
        : resultado.suscripcion === 'pendiente'
          ? `Recibimos tu respuesta. Revisá tu correo para confirmar las novedades.${referencia}`
          : configuracion.modelo === MODELO_WHATSAPP_FAMILIAS
            ? `Recibimos tu solicitud. El equipo de Familias la revisará y se comunicará contigo.${referencia}`
            : `Recibimos tu respuesta. Muchas gracias.${referencia}`
      enviar.removeAttribute('aria-busy'); estado.focus()
    } catch (fallo) { estado.textContent = fallo.message; enviar.disabled = false; enviar.removeAttribute('aria-busy'); estado.focus() }
  })
  raiz.replaceChildren(cabecera, forma)
}

function elementoComunicaciones(contactoRespuesta, configuracion) {
  const contenedor = document.createElement('section')
  contenedor.className = 'formulario-publico-comunicaciones'
  contenedor.append(
    Object.assign(document.createElement('strong'), { textContent: 'Novedades por correo' }),
    Object.assign(document.createElement('p'), { textContent: 'Esto es opcional y está separado del envío del formulario.' }),
  )
  const etiqueta = document.createElement('label')
  etiqueta.className = 'formulario-publico-consentimiento'
  const control = document.createElement('input'); control.type = 'checkbox'
  const textoConsentimiento = configuracion.modelo === MODELO_WHATSAPP_FAMILIAS
    ? 'Autorizo a Aletea Asociación Civil a enviarme por correo electrónico información sobre sus actividades, propuestas, talleres, cursos, encuentros y otras iniciativas. Puedo darme de baja cuando quiera.'
    : 'Quiero recibir novedades y actividades de Aletea por correo. Puedo darme de baja cuando quiera.'
  etiqueta.append(control, document.createTextNode(` ${textoConsentimiento}`))
  const opciones = document.createElement('div')
  opciones.className = 'formulario-publico-comunicaciones-opciones'
  opciones.hidden = true
  const correoEtiqueta = document.createElement('label')
  correoEtiqueta.className = 'formulario-publico-campo'
  correoEtiqueta.appendChild(Object.assign(document.createElement('span'), { textContent: 'Correo para las novedades' }))
  const correo = document.createElement('input'); correo.type = 'email'; correo.autocomplete = 'email'; correo.maxLength = 191
  correoEtiqueta.appendChild(correo)
  const temas = [
    ['novedades', 'Novedades generales'],
    ['actividades', 'Actividades y encuentros'],
    ['familias', 'Familias y comunidad'],
    ['formacion', 'Formación y capacitaciones'],
  ].map(([valor, texto]) => {
    const fila = document.createElement('label'); fila.className = 'formulario-publico-tema'
    const casilla = document.createElement('input'); casilla.type = 'checkbox'; casilla.value = valor
    fila.append(casilla, document.createTextNode(` ${texto}`))
    return { fila, casilla }
  })
  opciones.append(correoEtiqueta, Object.assign(document.createElement('span'), { className: 'formulario-publico-temas-titulo', textContent: 'Elegí qué querés recibir' }), ...temas.map(({ fila }) => fila))
  const actualizar = () => {
    opciones.hidden = !control.checked
    correo.required = control.checked
    temas.forEach(({ casilla }, indice) => {
      casilla.disabled = !control.checked
      if (control.checked && !temas.some((tema) => tema.casilla.checked) && indice === 0) casilla.checked = true
    })
    if (control.checked && !correo.value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactoRespuesta.value.trim())) correo.value = contactoRespuesta.value.trim()
  }
  control.addEventListener('change', actualizar)
  contenedor.append(etiqueta, opciones)
  return { contenedor, control, correo, temasSeleccionados: () => temas.filter(({ casilla }) => casilla.checked).map(({ casilla }) => casilla.value), actualizar }
}

function elementoPrivacidad(formulario, configuracion) {
  const contenido = configuracion.privacidad_contenido
  const contenedor = pasoFormulario(0, configuracion.privacidad_detallada ? contenido.titulo : 'Cómo usaremos estos datos')
  contenedor.classList.add('formulario-publico-privacidad', 'formulario-publico-confianza')
  const numero = contenedor.querySelector('.formulario-publico-paso-numero')
  const finalidad = formulario.finalidad || 'Responder la consulta y realizar su seguimiento.'
  const responsable = formulario.responsable_datos || 'Aletea'
  const meses = Number(formulario.conservacion_meses || 12)
  if (configuracion.privacidad_detallada) {
    ;[
      contenido.introduccion,
      contenido.uso,
      contenido.confidencialidad,
      contenido.derechos,
    ].forEach((texto) => contenedor.appendChild(Object.assign(document.createElement('p'), { textContent: texto })))
    contenedor.appendChild(Object.assign(document.createElement('p'), { className: 'formulario-publico-dato-operativo', textContent: `Responsable: ${responsable}. Conservación prevista: hasta ${meses} meses. Finalidad registrada: ${finalidad}` }))
  } else contenedor.appendChild(Object.assign(document.createElement('p'), { textContent: `${finalidad} Responsable: ${responsable}. Conservación prevista: hasta ${meses} meses.` }))
  const enlace = Object.assign(document.createElement('a'), { href: '/privacidad/', textContent: 'Leer el aviso de privacidad completo' })
  contenedor.appendChild(enlace)
  if (!Boolean(formulario.requiere_consentimiento)) return { contenedor, control: null, numero }
  const etiqueta = document.createElement('label')
  etiqueta.className = 'formulario-publico-consentimiento'
  const control = document.createElement('input'); control.type = 'checkbox'; control.required = true
  etiqueta.append(control, document.createTextNode(` ${configuracion.privacidad_detallada ? contenido.aceptacion : 'Leí cómo se usarán mis datos y acepto enviarlos para esta finalidad.'}`))
  contenedor.appendChild(etiqueta)
  return { contenedor, control, numero }
}

function elementoCompromiso(configuracion) {
  if (!configuracion.requiere_compromiso) return null
  const contenido = configuracion.compromiso_contenido
  const contenedor = pasoFormulario(0, contenido.titulo, contenido.introduccion)
  contenedor.classList.add('formulario-publico-compromiso', 'formulario-publico-confianza')
  const numero = contenedor.querySelector('.formulario-publico-paso-numero')
  const lista = document.createElement('div')
  lista.className = 'formulario-publico-compromiso-lista'
  contenido.secciones.forEach((seccion, indice) => {
    const bloque = document.createElement('article')
    const titulo = document.createElement('h3')
    titulo.append(Object.assign(document.createElement('span'), { textContent: String(indice + 1) }), document.createTextNode(seccion.titulo))
    const puntos = document.createElement('ul')
    seccion.puntos.forEach((punto) => puntos.appendChild(Object.assign(document.createElement('li'), { textContent: punto })))
    bloque.append(titulo, puntos)
    lista.appendChild(bloque)
  })
  const etiqueta = document.createElement('label')
  etiqueta.className = 'formulario-publico-consentimiento formulario-publico-compromiso-aceptacion'
  const control = document.createElement('input'); control.type = 'checkbox'; control.required = true
  etiqueta.append(control, document.createTextNode(` ${contenido.aceptacion}`))
  contenedor.append(lista, etiqueta)
  return { contenedor, control, numero }
}

iniciar().catch(() => { raiz.textContent = 'No se pudo abrir este formulario. Probá nuevamente más tarde.' })
