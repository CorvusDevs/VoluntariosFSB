export function escapar(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function elemento(etiqueta, clases = [], texto = null) {
  const el = document.createElement(etiqueta)
  if (clases.length) el.className = clases.join(' ')
  if (texto !== null) el.textContent = texto
  return el
}

export function ficha(persona, opciones = {}) {
  const el = elemento('button', ['ficha'])
  el.type = 'button'
  el.dataset.id = persona.id
  el.setAttribute('aria-pressed', opciones.seleccionada ? 'true' : 'false')
  if (opciones.seleccionada) el.classList.add('seleccionada')
  if (opciones.atenuada) el.classList.add('atenuada')

  el.appendChild(elemento('span', ['ficha-nombre'], persona.nombre))
  if (persona.nuevo) el.appendChild(elemento('span', ['pastilla'], 'nuevo'))
  if (opciones.detalle) el.appendChild(elemento('span', ['ficha-detalle'], opciones.detalle))
  return el
}

export function boton(etiqueta, alHacerClic, clases = []) {
  const el = elemento('button', ['boton', ...clases], etiqueta)
  el.type = 'button'
  el.addEventListener('click', alHacerClic)
  return el
}

export function vaciar(contenedor) {
  while (contenedor.firstChild) contenedor.removeChild(contenedor.firstChild)
}
