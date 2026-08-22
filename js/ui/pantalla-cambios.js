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

export function crearSeccionCambios({ compacto = false, soloVersiones = null } = {}) {
  const seccion = elemento('section', ['cambios-cms', compacto ? 'cambios-cms-compacto' : ''])
  seccion.appendChild(elemento(compacto ? 'h2' : 'h1', ['titulo-cambios'], 'Cambios del sistema'))
  seccion.appendChild(elemento('p', ['ayuda-cambios'], 'Actualizaciones, adiciones y arreglos de cada versión mayor del gestor institucional.'))
  const candidatas = soloVersiones?.length ? NOVEDADES.filter((cambio) => soloVersiones.includes(cambio.version)) : NOVEDADES
  const visibles = compacto ? candidatas.slice(0, 1) : candidatas
  visibles.forEach((cambio) => {
    const articulo = elemento('article', ['cambio-version'])
    articulo.dataset.version = cambio.version
    articulo.append(elemento('h2', ['cambio-version-titulo'], `Versión ${cambio.version}`), elemento('p', ['cambio-version-meta'], metadatos(cambio)))
    if (compacto) cambio.resumen.forEach((item) => articulo.appendChild(elemento('p', ['cambio-resumen'], item)))
    else articulo.append(lista('Actualizaciones', cambio.actualizaciones), lista('Adiciones', cambio.adiciones), lista('Arreglos', cambio.arreglos))
    seccion.appendChild(articulo)
  })
  return seccion
}

export function crearPantallaCambios(raiz, { novedades = [], alCerrarNovedades = () => {}, almacenNovedades = globalThis.localStorage } = {}) {
  const pantalla = elemento('main', ['pantalla-cambios'])
  if (novedades.length) {
    const aviso = elemento('section', ['novedades-version'])
    aviso.setAttribute('role', 'status')
    aviso.append(elemento('span', ['sobrelinea'], 'NOVEDADES'), elemento('h1', [], `Versión ${novedades[0].version}`), elemento('p', [], 'Estas son las mejoras incorporadas desde la última versión que viste.'))
    const ul = document.createElement('ul')
    novedades.flatMap((entrada) => entrada.resumen.map((texto) => ({ version: entrada.version, texto }))).forEach(({ version, texto }) => ul.appendChild(elemento('li', [], `v${version}  ${texto}`)))
    aviso.append(ul, boton('Entendido', () => { marcarNovedadesVistas(almacenNovedades); aviso.remove(); alCerrarNovedades() }, ['boton-principal']))
    pantalla.appendChild(aviso)
  }
  pantalla.appendChild(crearSeccionCambios())
  raiz.appendChild(pantalla)
  return pantalla
}
