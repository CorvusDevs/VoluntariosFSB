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

// Iconos en SVG en linea, heredando color y tamaño del boton que los contiene.
// Nada de emoji: se ven distinto en cada sistema y no toman el color del tema.
const TRAZOS = {
  lapiz: 'M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z M13.5 6.5l4 4',
}

export function icono(nombre) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', '20')
  svg.setAttribute('height', '20')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.7')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('aria-hidden', 'true')
  const trazo = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  trazo.setAttribute('d', TRAZOS[nombre])
  svg.appendChild(trazo)
  return svg
}

export function botonIcono(nombre, etiqueta, alHacerClic) {
  const el = elemento('button', ['boton-icono'])
  el.type = 'button'
  el.setAttribute('aria-label', etiqueta)
  el.title = etiqueta
  el.appendChild(icono(nombre))
  el.addEventListener('click', alHacerClic)
  return el
}
