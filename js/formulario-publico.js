import { crearSelectorFecha } from './ui/selector-fecha.js'
import { instalarAyudasContextuales } from './ui/ayudas-contextuales.js'

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

function camposConfigurables(formulario) {
  let campos = []
  try { campos = JSON.parse(formulario.campos_json || '[]') } catch { campos = [] }
  const respuestas = {}
  const filas = campos.map((campo) => {
    const contenedor = document.createElement('label')
    contenedor.className = 'formulario-publico-campo formulario-publico-personalizado'
    contenedor.appendChild(Object.assign(document.createElement('span'), { textContent: `${campo.etiqueta}${campo.requerido ? ' *' : ''}` }))
    let control
    if (campo.tipo === 'texto_largo') { control = document.createElement('textarea'); control.rows = 4; control.maxLength = 4000 }
    else if (campo.tipo === 'seleccion') {
      control = document.createElement('select')
      control.appendChild(Object.assign(document.createElement('option'), { value: '', textContent: 'Elegir' }))
      ;(campo.opciones || []).forEach((valor) => control.appendChild(Object.assign(document.createElement('option'), { value: valor, textContent: valor })))
    } else { control = document.createElement('input'); control.type = campo.tipo === 'casilla' ? 'checkbox' : campo.tipo === 'fecha' ? 'date' : 'text'; control.maxLength = 500 }
    control.setAttribute('aria-label', campo.etiqueta)
    if (campo.ayuda) contenedor.appendChild(Object.assign(document.createElement('small'), { className: 'ayuda', textContent: campo.ayuda }))
    contenedor.appendChild(control)
    const actualizar = () => {
      contenedor.hidden = Boolean(campo.mostrar_si) && String(respuestas[campo.mostrar_si.campo] ?? '') !== campo.mostrar_si.valor
      control.required = Boolean(campo.requerido) && !contenedor.hidden
      if (contenedor.hidden) respuestas[campo.clave] = campo.tipo === 'casilla' ? false : ''
    }
    const leer = () => { respuestas[campo.clave] = control.type === 'checkbox' ? control.checked : control.value; filas.forEach((fila) => fila.actualizar()) }
    control.addEventListener('input', leer); control.addEventListener('change', leer)
    return { contenedor, control, actualizar }
  })
  filas.forEach((fila) => fila.actualizar())
  return { filas, respuestas, limpiar() { filas.forEach(({ control }) => { if (control.type === 'checkbox') control.checked = false; else control.value = '' }); Object.keys(respuestas).forEach((clave) => { respuestas[clave] = '' }); filas.forEach((fila) => fila.actualizar()) } }
}

async function iniciar() {
  if (!id) { raiz.textContent = 'No encontramos el formulario solicitado.'; return }
  const respuesta = await fetch(`/api/formularios/${encodeURIComponent(id)}`)
  const datos = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) { raiz.textContent = datos.error || 'Este formulario no está disponible.'; return }
  const { formulario } = datos
  const cabecera = document.createElement('header'); cabecera.className = 'formulario-publico-cabecera'
  cabecera.append(Object.assign(document.createElement('p'), { textContent: 'Aletea' }), Object.assign(document.createElement('h1'), { textContent: formulario.titulo }))
  if (formulario.descripcion) cabecera.appendChild(Object.assign(document.createElement('p'), { textContent: formulario.descripcion }))
  const forma = document.createElement('form'); forma.className = 'formulario-publico-forma'
  const [nombreCaja, nombre] = campo('Nombre o referencia', 'text', true, { autocompletar: 'name' })
  const [contactoCaja, contacto] = campo('Contacto para responderte')
  const mensajeCaja = document.createElement('label'); mensajeCaja.className = 'formulario-publico-campo'; mensajeCaja.textContent = 'Mensaje o contexto'
  const detalle = document.createElement('textarea'); detalle.rows = 5; detalle.maxLength = 4000; mensajeCaja.appendChild(detalle)
  const proponeFecha = ['actividad', 'evento'].includes(formulario.tipo)
  const [fechaPropuestaCaja, fechaPropuesta] = campoFechaHora('Fecha propuesta')
  const esPropuesta = formulario.tipo === 'propuesta'
  const [objetivoCaja, objetivo] = area('Objetivo de la propuesta', esPropuesta)
  const [pasosCaja, pasos] = area('Pasos o actividades principales')
  const [recursosCaja, recursos] = area('Recursos necesarios')
  const [personasCaja, personas] = area('Personas o roles necesarios')
  const personalizados = camposConfigurables(formulario)
  const empresa = document.createElement('input'); empresa.name = 'empresa'; empresa.tabIndex = -1; empresa.autocomplete = 'off'; empresa.className = 'formulario-publico-trampa'
  const ayuda = Object.assign(document.createElement('p'), { className: 'ayuda', textContent: 'No incluyas información médica, diagnósticos ni otros datos sensibles. El equipo se comunicará contigo para los siguientes pasos.' })
  const privacidad = elementoPrivacidad(formulario)
  const enviar = Object.assign(document.createElement('button'), { type: 'submit', textContent: 'Enviar respuesta' }); enviar.className = 'boton boton-principal'
  const estado = document.createElement('p'); estado.className = 'formulario-publico-estado'
  forma.append(nombreCaja, contactoCaja, mensajeCaja, proponeFecha ? fechaPropuestaCaja : document.createDocumentFragment(), esPropuesta ? objetivoCaja : document.createDocumentFragment(), esPropuesta ? pasosCaja : document.createDocumentFragment(), esPropuesta ? recursosCaja : document.createDocumentFragment(), esPropuesta ? personasCaja : document.createDocumentFragment(), ...personalizados.filas.map((fila) => fila.contenedor), empresa, ayuda, privacidad.contenedor, enviar, estado)
  forma.addEventListener('submit', async (evento) => {
    evento.preventDefault(); if (!forma.reportValidity()) return
    enviar.disabled = true; estado.textContent = 'Enviando...'
    try {
      const envio = await fetch(`/api/formularios/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nombre: nombre.value, contacto: contacto.value, detalle: detalle.value, fecha_propuesta: fechaPropuesta.value || null, objetivo: objetivo.value, pasos: pasos.value, recursos: recursos.value, personas_necesarias: personas.value, respuestas: personalizados.respuestas, empresa: empresa.value, consentimiento_privacidad: privacidad.control?.checked === true }) })
      const resultado = await envio.json().catch(() => ({})); if (!envio.ok) throw new Error(resultado.error || 'No se pudo enviar la respuesta.')
      forma.reset(); fechaPropuesta.limpiar(); personalizados.limpiar(); estado.textContent = 'Recibimos tu respuesta. Muchas gracias.'
    } catch (fallo) { estado.textContent = fallo.message; enviar.disabled = false }
  })
  raiz.replaceChildren(cabecera, forma)
}

function elementoPrivacidad(formulario) {
  const contenedor = document.createElement('section')
  contenedor.className = 'formulario-publico-privacidad'
  const finalidad = formulario.finalidad || 'Responder la consulta y realizar su seguimiento.'
  const responsable = formulario.responsable_datos || 'Aletea'
  const meses = Number(formulario.conservacion_meses || 12)
  contenedor.append(
    Object.assign(document.createElement('strong'), { textContent: 'Cómo usaremos estos datos' }),
    Object.assign(document.createElement('p'), { textContent: `${finalidad} Responsable: ${responsable}. Conservación prevista: hasta ${meses} meses.` }),
  )
  const enlace = Object.assign(document.createElement('a'), { href: '/privacidad/', textContent: 'Leer el aviso de privacidad' })
  contenedor.appendChild(enlace)
  if (!Boolean(formulario.requiere_consentimiento)) return { contenedor, control: null }
  const etiqueta = document.createElement('label')
  etiqueta.className = 'formulario-publico-consentimiento'
  const control = document.createElement('input'); control.type = 'checkbox'; control.required = true
  etiqueta.append(control, document.createTextNode(' Leí cómo se usarán mis datos y acepto enviarlos para esta finalidad.'))
  contenedor.appendChild(etiqueta)
  return { contenedor, control }
}

iniciar().catch(() => { raiz.textContent = 'No se pudo abrir este formulario. Probá nuevamente más tarde.' })
