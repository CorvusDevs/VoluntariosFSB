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
  const el = elemento('button', ['boton', ...clases])
  el.type = 'button'
  const nombreIcono = iconoParaEtiqueta(etiqueta)
  if (nombreIcono) {
    el.classList.add('boton-con-icono')
    el.appendChild(icono(nombreIcono))
  }
  el.appendChild(document.createTextNode(etiqueta))
  el.addEventListener('click', alHacerClic)
  return el
}

export function vaciar(contenedor) {
  while (contenedor.firstChild) contenedor.removeChild(contenedor.firstChild)
}

// Iconos en SVG en linea, heredando color y tamaño del boton que los contiene.
// Nada de emoji: se ven distinto en cada sistema y no toman el color del tema.
// Trazos de Heroicons 2.2.0, SVG oficiales MIT de Tailwind Labs. Se mantienen
// en linea para no introducir solicitudes extra ni depender de una tipografia.
const TRAZOS = {
  agenda: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z',
  personas: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
  planilla: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z',
  verificar: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  sumar: 'M12 4.5v15m7.5-7.5h-15',
  lapiz: 'm16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125',
  eliminar: 'm14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0',
  archivar: 'm20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z',
  volver: 'M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3',
  cerrar: 'M6 18 18 6M6 6l12 12',
  reintentar: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99',
  ingresar: 'M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9',
  salir: 'M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75',
  descargar: 'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3',
  copiar: 'M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75',
  acceso: 'M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z',
  atras: 'M15.75 19.5 8.25 12l7.5-7.5',
  adelante: 'm8.25 4.5 7.5 7.5-7.5 7.5',
  casa: 'm2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
  vista: 'M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  reporte: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
  ajustes: 'M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75',
}

function iconoParaEtiqueta(etiqueta) {
  const texto = String(etiqueta).trim()
  const exactos = {
    Inicio: 'casa', 'Armar lista': 'planilla', Lista: 'planilla', 'Vista previa': 'vista', Personas: 'personas', 'Ver Personas': 'personas', Reporte: 'reporte', Asistencias: 'verificar', Asistencia: 'verificar', Agenda: 'agenda', 'Ver Agenda': 'agenda', Ajustes: 'ajustes', Ingresar: 'ingresar', 'Entrar con el token': 'ingresar', 'Cerrar sesión': 'salir', 'Volver al ingreso': 'volver', Reintentar: 'reintentar', Cancelar: 'cerrar', Cerrar: 'cerrar', Deshacer: 'volver', Rehacer: 'reintentar', Copiar: 'copiar', 'Rotar el token': 'acceso', 'Dar acceso': 'acceso', 'Guardar permisos': 'verificar', 'Agregar a la agenda': 'sumar', 'Usar la jornada anterior': 'volver', 'Tomar asistencia': 'verificar', 'Agregar persona': 'sumar', 'Agregar foto': 'sumar', 'Cambiar foto': 'lapiz', 'Quitar foto': 'eliminar', 'Editar perfil': 'lapiz', Personalizar: 'ajustes', Tarjetas: 'vista', Seleccionar: 'verificar', 'Cancelar selección': 'cerrar', 'Marcar nuevas': 'verificar', Archivar: 'archivar', 'Archivar persona': 'archivar', 'Restaurar persona': 'volver', 'Quitar acceso': 'eliminar', 'Listo, ya las anoté': 'verificar', 'Listo, ya la anoté': 'verificar', 'Hoy no viene': 'cerrar', 'Sumar apoyo': 'sumar', 'Elegí quién': 'personas', Editar: 'lapiz', 'Guardar cambios': 'verificar', 'Guardar personalización': 'verificar', 'Agregar': 'sumar', 'Descargar tarjeta PNG': 'descargar', 'Descargar PNG': 'descargar', 'Descargar CSV': 'descargar', 'Eliminar mes': 'eliminar', 'Eliminar día': 'eliminar', 'Eliminar definitivamente': 'eliminar', Continuar: 'adelante', Quitar: 'eliminar',
  }
  if (exactos[texto]) return exactos[texto]
  if (texto.startsWith('Descargar ')) return 'descargar'
  if (texto.startsWith('Guardar ')) return 'verificar'
  if (texto.startsWith('Agregar ')) return 'sumar'
  if (texto.startsWith('Editar ')) return 'lapiz'
  if (texto.startsWith('Quitar ')) return 'eliminar'
  if (texto.startsWith('Archivar ')) return 'archivar'
  if (texto.startsWith('Restaurar ')) return 'volver'
  return null
}

export function icono(nombre) {
  if (!TRAZOS[nombre]) throw new Error(`No existe el ícono ${nombre}.`)
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

export function agregarIcono(boton, nombre, antes = true) {
  boton.classList.add('boton-con-icono')
  if (antes) boton.insertBefore(icono(nombre), boton.firstChild)
  else boton.appendChild(icono(nombre))
  return boton
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
