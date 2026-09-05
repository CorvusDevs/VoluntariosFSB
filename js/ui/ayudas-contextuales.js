const SELECTOR_ACCION = 'button, [role="button"], a.boton, input[type="button"], input[type="submit"], input[type="reset"]'
export const DEMORA_AYUDA_MOUSE_MS = 650
export const DEMORA_AYUDA_TECLADO_MS = 250

const AYUDAS_EXACTAS = {
  'Ir al centro de control': 'Abre el centro de control.',
  'Cerrar sesión': 'Cierra tu sesión de Aletea en este dispositivo.',
  Entrar: 'Valida tus datos y abre el gestor.',
  'Seguir sin ingresar': 'Abre el modo local sin iniciar sesión.',
  Deshacer: 'Revierte el último cambio realizado.',
  Rehacer: 'Recupera el último cambio deshecho.',
  Cancelar: 'Cierra esta acción sin guardar cambios.',
  Cerrar: 'Cierra esta ventana.',
  Continuar: 'Continúa al siguiente paso.',
  Reintentar: 'Intenta realizar la acción nuevamente.',
}

function limpiarEtiqueta(valor) {
  return String(valor || '').replace(/\s+/g, ' ').trim()
}

export function ayudaParaAccion(etiqueta) {
  const texto = limpiarEtiqueta(etiqueta)
  if (!texto) return ''
  if (AYUDAS_EXACTAS[texto]) return AYUDAS_EXACTAS[texto]
  if (/^(Inicio|Centro de control|Mis tareas|Agenda|Contenido|Editor de piezas|Áreas|Formularios|Biblioteca|Accesos|Cambios|Ayuda)$/.test(texto)) return `Abre la sección ${texto}.`
  if (/^Abrir(?:\s+|$)/i.test(texto)) return `${texto}.`
  if (/^Ver(?:\s+|$)/i.test(texto)) return `${texto}.`
  if (/^Guardar(?:\s+|$)/i.test(texto)) return `${texto} y conserva el resultado.`
  if (/^(Crear|Nuevo|Nueva|Agregar|Registrar|Sumar)(?:\s+|$)/i.test(texto)) return `${texto} en esta sección.`
  if (/^Editar(?:\s+|$)/i.test(texto)) return `${texto} sin salir de esta pantalla.`
  if (/^Descargar(?:\s+|$)/i.test(texto)) return `${texto} en tu dispositivo.`
  if (/^(Eliminar|Quitar)(?:\s+|$)/i.test(texto)) return `${texto}. Se pedirá confirmación cuando corresponda.`
  if (/^(Subir|Bajar|Mover)(?:\s+|$)/i.test(texto)) return `${texto} para cambiar su posición.`
  if (/^(Mes|Página) (anterior|siguiente)$/i.test(texto)) return `Muestra ${texto.toLowerCase()}.`
  if (/^(Enviar|Publicar|Copiar|Restablecer|Actualizar)(?:\s+|$)/i.test(texto)) return `${texto}.`
  return `${texto}.`
}

function textoVisibleDeControl(control) {
  if (control instanceof HTMLInputElement) return limpiarEtiqueta(control.value)
  return limpiarEtiqueta(control.textContent)
}

function etiquetaDeControl(control) {
  return limpiarEtiqueta(control.getAttribute('aria-label') || textoVisibleDeControl(control))
}

export function prepararAyudaContextual(control, ayuda = '') {
  if (!(control instanceof Element) || !control.matches(SELECTOR_ACCION)) return control
  const explicita = limpiarEtiqueta(ayuda || control.dataset.ayuda || control.title)
  const automatica = textoVisibleDeControl(control) ? '' : ayudaParaAccion(etiquetaDeControl(control))
  const texto = explicita || automatica
  if (!texto) return control
  if (control.title) control.removeAttribute('title')
  control.dataset.ayuda = texto
  control.setAttribute('aria-description', texto)
  return control
}

export function prepararAyudasContextuales(raiz = document) {
  if (raiz instanceof Element && raiz.matches(SELECTOR_ACCION)) prepararAyudaContextual(raiz)
  raiz.querySelectorAll?.(SELECTOR_ACCION).forEach((control) => prepararAyudaContextual(control))
}

export function instalarAyudasContextuales(raiz = document) {
  prepararAyudasContextuales(raiz)
  const cuerpo = raiz.body || document.body
  if (!cuerpo) return () => {}

  const globo = document.createElement('div')
  globo.className = 'ayuda-contextual-flotante'
  globo.id = 'ayuda-contextual-flotante'
  globo.setAttribute('role', 'tooltip')
  globo.hidden = true
  cuerpo.appendChild(globo)

  let controlActivo = null
  let controlPendiente = null
  let temporizador = null
  const cancelarEspera = () => {
    if (temporizador !== null) window.clearTimeout(temporizador)
    temporizador = null
    controlPendiente = null
  }
  const ocultar = () => {
    cancelarEspera()
    controlActivo = null
    globo.hidden = true
  }
  const mostrar = (control) => {
    prepararAyudaContextual(control)
    const texto = control?.dataset?.ayuda
    if (!texto) return ocultar()
    controlActivo = control
    globo.textContent = texto
    globo.hidden = false
    const caja = control.getBoundingClientRect()
    const margen = 10
    const ancho = Math.min(globo.offsetWidth, window.innerWidth - margen * 2)
    const izquierda = Math.max(margen, Math.min(window.innerWidth - ancho - margen, caja.left + (caja.width - ancho) / 2))
    const arriba = caja.top - globo.offsetHeight - 8
    globo.style.left = `${Math.round(izquierda)}px`
    globo.style.top = `${Math.round(arriba >= margen ? arriba : caja.bottom + 8)}px`
  }
  const programar = (control, demora) => {
    cancelarEspera()
    prepararAyudaContextual(control)
    if (!control?.dataset?.ayuda) return ocultar()
    controlPendiente = control
    temporizador = window.setTimeout(() => {
      temporizador = null
      controlPendiente = null
      mostrar(control)
    }, demora)
  }
  const controlDesdeEvento = (evento) => evento.target instanceof Element ? evento.target.closest(SELECTOR_ACCION) : null
  const alEntrar = (evento) => {
    const control = controlDesdeEvento(evento)
    if (control && !control.contains(evento.relatedTarget)) programar(control, DEMORA_AYUDA_MOUSE_MS)
  }
  const alSalir = (evento) => {
    const control = controlPendiente || controlActivo
    if (control && !control.contains(evento.relatedTarget)) ocultar()
  }
  const alFoco = (evento) => {
    const control = controlDesdeEvento(evento)
    if (control) programar(control, DEMORA_AYUDA_TECLADO_MS)
  }
  const observador = new MutationObserver((cambios) => cambios.forEach(({ addedNodes }) => addedNodes.forEach((nodo) => {
    if (nodo instanceof Element) prepararAyudasContextuales(nodo)
  })))

  cuerpo.addEventListener('mouseover', alEntrar)
  cuerpo.addEventListener('mouseout', alSalir)
  cuerpo.addEventListener('focusin', alFoco)
  cuerpo.addEventListener('focusout', alSalir)
  cuerpo.addEventListener('click', ocultar)
  window.addEventListener('scroll', ocultar, { passive: true })
  window.addEventListener('resize', ocultar, { passive: true })
  observador.observe(cuerpo, { childList: true, subtree: true })

  return () => {
    observador.disconnect()
    cuerpo.removeEventListener('mouseover', alEntrar)
    cuerpo.removeEventListener('mouseout', alSalir)
    cuerpo.removeEventListener('focusin', alFoco)
    cuerpo.removeEventListener('focusout', alSalir)
    cuerpo.removeEventListener('click', ocultar)
    window.removeEventListener('scroll', ocultar)
    window.removeEventListener('resize', ocultar)
    cancelarEspera()
    globo.remove()
  }
}
