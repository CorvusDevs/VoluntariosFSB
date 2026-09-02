import { boton, elemento } from './componentes.js'
import { marcarNovedadesVistas, NOVEDADES } from './novedades.js'

function lista(titulo, items) {
  const bloque = elemento('section', ['cambios-grupo'])
  bloque.appendChild(elemento('h3', [], titulo))
  const ul = document.createElement('ul')
  items.forEach((item) => ul.appendChild(elemento('li', [], item)))
  bloque.appendChild(ul)
  return bloque
}

function metadatos(cambio) {
  if (!cambio.commit) return `${cambio.estado} · Autor: ${cambio.autor}`
  return `${cambio.fecha} · Commit ${cambio.commit} · Autor: ${cambio.autor}`
}

function enumerarAmbitos(ambitos) {
  if (ambitos.length < 2) return ambitos[0]
  return `${ambitos.slice(0, -1).join(', ')} y ${ambitos.at(-1)}`
}

export function crearSeccionCambios({ compacto = false, soloVersiones = null } = {}) {
  const seccion = elemento('section', ['cambios-cms', compacto ? 'cambios-cms-compacto' : ''])
  seccion.appendChild(elemento(compacto ? 'h2' : 'h1', ['titulo-cambios'], 'Cambios del sistema'))
  seccion.appendChild(elemento('p', ['ayuda-cambios'], 'Actualizaciones, adiciones y arreglos del gestor institucional y de la página pública.'))
  const candidatas = soloVersiones?.length ? NOVEDADES.filter((cambio) => soloVersiones.includes(cambio.version)) : NOVEDADES
  const visibles = compacto ? candidatas.slice(0, 1) : candidatas.slice(0, 3)
  const agregarCambio = (cambio, destino = seccion) => {
    const articulo = elemento('article', ['cambio-version'])
    articulo.dataset.version = cambio.version
    articulo.append(elemento('h2', ['cambio-version-titulo'], `Versión ${cambio.version}`), elemento('p', ['cambio-version-meta'], metadatos(cambio)))
    const ambitos = cambio.ambitos?.length ? cambio.ambitos : ['Gestor']
    articulo.appendChild(elemento('p', ['cambio-version-ambitos'], `Incluye: ${enumerarAmbitos(ambitos)}`))
    if (cambio.descripcion) articulo.appendChild(elemento('p', ['cambio-version-descripcion'], cambio.descripcion))
    if (compacto) cambio.resumen.forEach((item) => articulo.appendChild(elemento('p', ['cambio-resumen'], item)))
    else articulo.append(lista('Actualizaciones', cambio.actualizaciones), lista('Adiciones', cambio.adiciones), lista('Arreglos', cambio.arreglos))
    destino.appendChild(articulo)
  }
  visibles.forEach((cambio) => agregarCambio(cambio))
  if (!compacto && candidatas.length > visibles.length) {
    const archivo = elemento('details', ['cambios-archivo'])
    archivo.appendChild(elemento('summary', [], `Versiones anteriores (${candidatas.length - visibles.length})`))
    const contenido = elemento('div', ['cambios-archivo-contenido'])
    candidatas.slice(visibles.length).forEach((cambio) => agregarCambio(cambio, contenido))
    archivo.appendChild(contenido)
    seccion.appendChild(archivo)
  }
  return seccion
}

export function crearAvisoNovedades(raiz, {
  novedades = [],
  alContinuar = () => {},
  alVerCambios = () => {},
  almacenNovedades = globalThis.localStorage,
} = {}) {
  const actual = novedades[0]
  if (!actual) return null

  const focoAnterior = document.activeElement
  const fondo = [...raiz.children].filter((hijo) => !hijo.hasAttribute('inert'))
  fondo.forEach((hijo) => hijo.setAttribute('inert', ''))

  const superposicion = elemento('section', ['novedades-superposicion'])
  superposicion.setAttribute('role', 'dialog')
  superposicion.setAttribute('aria-modal', 'true')
  superposicion.setAttribute('aria-labelledby', 'novedades-titulo')
  superposicion.tabIndex = -1

  const popout = elemento('div', ['novedades-popout'])
  popout.append(
    elemento('span', ['sobrelinea'], 'NOVEDADES'),
    elemento('h2', [], `Novedades de la versión ${actual.version}`),
    elemento('p', ['novedades-introduccion'], 'Un resumen rápido. Podés seguir trabajando y consultar el historial completo cuando quieras.'),
  )
  popout.querySelector('h2').id = 'novedades-titulo'

  const listaResumen = elemento('ul', ['novedades-resumen'])
  actual.resumen.forEach((texto) => listaResumen.appendChild(elemento('li', [], texto)))
  popout.appendChild(listaResumen)

  let cerrado = false
  const cerrar = (accion = alContinuar) => {
    if (cerrado) return
    cerrado = true
    marcarNovedadesVistas(almacenNovedades)
    superposicion.remove()
    fondo.forEach((hijo) => hijo.removeAttribute('inert'))
    accion()
    if (focoAnterior instanceof HTMLElement && focoAnterior.isConnected) focoAnterior.focus()
  }

  const acciones = elemento('div', ['novedades-acciones'])
  const enlace = elemento('a', ['novedades-enlace'], 'Ver todos los cambios')
  enlace.href = '/cambios'
  enlace.addEventListener('click', (evento) => {
    if (evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return
    evento.preventDefault()
    cerrar(alVerCambios)
  })
  acciones.append(boton('Seguir trabajando', () => cerrar(), ['boton-principal']), enlace)
  popout.appendChild(acciones)
  superposicion.appendChild(popout)

  superposicion.addEventListener('click', (evento) => {
    if (evento.target === superposicion) cerrar()
  })
  superposicion.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') cerrar()
  })

  raiz.appendChild(superposicion)
  superposicion.focus()
  return superposicion
}

export function crearPantallaCambios(raiz) {
  const pantalla = elemento('main', ['pantalla-cambios'])
  pantalla.appendChild(crearSeccionCambios())
  raiz.appendChild(pantalla)
  return pantalla
}
