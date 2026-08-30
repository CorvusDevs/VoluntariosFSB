import { metadatosParaRuta } from '../js/rutas-gestor.js'

function escaparAtributo(valor) {
  return String(valor).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function escaparTexto(valor) {
  return String(valor).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function reemplazarMeta(html, selector, contenido) {
  const patron = new RegExp(`(<meta\\s+${selector}\\s+content=")[^"]*("[^>]*>)`, 'i')
  return html.replace(patron, `$1${escaparAtributo(contenido)}$2`)
}

export function htmlGestorParaRuta(htmlBase, origen, pathname) {
  const metadatos = metadatosParaRuta(pathname)
  if (!metadatos) return null
  const url = new URL(metadatos.ruta, origen).href
  let html = String(htmlBase)
    .replace(/<title>[^<]*<\/title>/i, `<title>${escaparTexto(metadatos.titulo)}</title>`)
  html = reemplazarMeta(html, 'name="description"', metadatos.descripcion)
  html = reemplazarMeta(html, 'property="og:title"', metadatos.titulo)
  html = reemplazarMeta(html, 'property="og:description"', metadatos.descripcion)
  html = reemplazarMeta(html, 'property="og:url"', url)
  html = reemplazarMeta(html, 'name="twitter:title"', metadatos.titulo)
  html = reemplazarMeta(html, 'name="twitter:description"', metadatos.descripcion)
  html = html.replace(/<link\s+rel="canonical"[^>]*>\s*/i, '')
  html = html.replace('</title>', `</title>\n<link rel="canonical" href="${escaparAtributo(url)}">`)
  if (!/<base\s/i.test(html)) html = html.replace(/<head>/i, '<head>\n<base href="/">')
  return html
}

export function esRutaGestor(pathname) {
  return metadatosParaRuta(pathname) !== null
}
