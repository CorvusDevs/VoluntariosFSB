const normalizar = (texto) => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es')

export function auditarGlosario(glosario) {
  const errores = []
  const terminos = glosario?.terminos && typeof glosario.terminos === 'object' ? glosario.terminos : {}
  const requeridos = ['area', 'unidad', 'equipo', 'proyecto', 'tarea', 'responsable', 'seguimiento', 'recurso', 'biblioteca', 'comunicaciones', 'pagina_web']
  requeridos.forEach((clave) => { if (!terminos[clave]?.nombre || !terminos[clave]?.definicion) errores.push(`Falta definir ${clave}.`) })
  const nombres = Object.values(terminos).map((item) => normalizar(item?.nombre)).filter(Boolean)
  const repetidos = [...new Set(nombres.filter((nombre, indice) => nombres.indexOf(nombre) !== indice))]
  if (repetidos.length) errores.push(`Hay nombres duplicados en el glosario: ${repetidos.join(', ')}.`)
  return errores
}

function titulosRepetidosEnListas(valor, ruta = 'contenido', errores = []) {
  if (Array.isArray(valor)) {
    const titulos = valor.map((item) => normalizar(item?.titulo)).filter(Boolean)
    const repetidos = [...new Set(titulos.filter((titulo, indice) => titulos.indexOf(titulo) !== indice))]
    if (repetidos.length) errores.push(`${ruta} repite títulos: ${repetidos.join(', ')}.`)
    valor.forEach((item, indice) => titulosRepetidosEnListas(item, `${ruta}.${indice}`, errores))
  } else if (valor && typeof valor === 'object') Object.entries(valor).forEach(([clave, item]) => titulosRepetidosEnListas(item, `${ruta}.${clave}`, errores))
  return errores
}

export function auditarContenidoEditorial(contenido) {
  const errores = titulosRepetidosEnListas(contenido)
  const navegacion = (contenido?.navegacion || []).filter((item) => item.visible !== false)
  const nombresEsperados = ['Aletea', 'Qué hacemos', 'Para familias', 'Recursos', 'Participá']
  if (JSON.stringify(navegacion.map((item) => item.etiqueta)) !== JSON.stringify(nombresEsperados)) errores.push('La navegación pública no usa los cinco nombres institucionales acordados.')
  const revisarAcciones = (valor, ruta = 'contenido') => {
    if (!valor || typeof valor !== 'object') return
    if (Array.isArray(valor)) return valor.forEach((item, indice) => revisarAcciones(item, `${ruta}.${indice}`))
    for (const [clave, item] of Object.entries(valor)) {
      if (clave === 'acciones' && Array.isArray(item) && item.length > 2 && !ruta.endsWith('.orientacion')) errores.push(`${ruta}.acciones tiene ${item.length} CTA competidores.`)
      revisarAcciones(item, `${ruta}.${clave}`)
    }
  }
  revisarAcciones(contenido)
  const doctorTea = JSON.stringify(contenido).match(/https?:\\?\/\\?\/[^"']*doctortea[^"']*/gi) || []
  if (doctorTea.some((enlace) => /^http:\/\//i.test(enlace.replaceAll('\\/', '/')))) errores.push('Doctor TEA todavía usa HTTP.')
  return [...new Set(errores)]
}
