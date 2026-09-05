const CAMPOS_LOTE = new Set(['version', 'proveedor', 'generadoEn', 'diarias', 'paginas', 'acciones'])
const CAMPOS_DIARIA = new Set(['fecha', 'visitas', 'paginasVistas', 'acciones'])
const CAMPOS_PAGINA = new Set(['fecha', 'ruta', 'vistas'])
const CAMPOS_ACCION = new Set(['fecha', 'accion', 'cantidad'])
const MAXIMO_FILAS = 5000
const MAXIMO_CONTEO = 1_000_000_000

function objetoSimple(valor, nombre) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new TypeError(`${nombre} debe ser un objeto.`)
  return valor
}

function exigirCamposPermitidos(valor, permitidos, nombre) {
  const desconocido = Object.keys(valor).find((campo) => !permitidos.has(campo))
  if (desconocido) throw new TypeError(`${nombre} contiene un campo no permitido: ${desconocido}.`)
}

function fechaValida(valor, nombre) {
  const texto = String(valor || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto) || Number.isNaN(Date.parse(`${texto}T00:00:00Z`))) {
    throw new TypeError(`${nombre} debe usar el formato AAAA-MM-DD.`)
  }
  return texto
}

function enteroAgregado(valor, nombre) {
  const numero = Number(valor)
  if (!Number.isSafeInteger(numero) || numero < 0 || numero > MAXIMO_CONTEO) {
    throw new TypeError(`${nombre} debe ser un entero agregado válido.`)
  }
  return numero
}

function listaSegura(valor, nombre) {
  if (!Array.isArray(valor)) throw new TypeError(`${nombre} debe ser una lista.`)
  if (valor.length > MAXIMO_FILAS) throw new TypeError(`${nombre} supera el máximo de ${MAXIMO_FILAS} filas.`)
  return valor
}

function sinDuplicados(filas, clave, nombre) {
  const vistos = new Set()
  filas.forEach((fila) => {
    const id = clave(fila)
    if (vistos.has(id)) throw new TypeError(`${nombre} contiene filas duplicadas.`)
    vistos.add(id)
  })
  return filas
}

export function normalizarLoteMetricasWeb(lote) {
  objetoSimple(lote, 'El lote')
  exigirCamposPermitidos(lote, CAMPOS_LOTE, 'El lote')
  if (lote.version !== 1) throw new TypeError('La versión del lote no es compatible.')
  if (lote.proveedor !== 'cloudflare-web-analytics') throw new TypeError('El proveedor del lote no es compatible.')
  const generadoEn = String(lote.generadoEn || '')
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(generadoEn)) {
    throw new TypeError('generadoEn debe ser una fecha y hora UTC válida.')
  }

  const diarias = listaSegura(lote.diarias, 'diarias').map((fila, indice) => {
    objetoSimple(fila, `diarias[${indice}]`)
    exigirCamposPermitidos(fila, CAMPOS_DIARIA, `diarias[${indice}]`)
    return {
      fecha: fechaValida(fila.fecha, `diarias[${indice}].fecha`),
      visitas: enteroAgregado(fila.visitas, `diarias[${indice}].visitas`),
      paginasVistas: enteroAgregado(fila.paginasVistas, `diarias[${indice}].paginasVistas`),
      acciones: enteroAgregado(fila.acciones, `diarias[${indice}].acciones`),
    }
  })
  const paginas = listaSegura(lote.paginas, 'paginas').map((fila, indice) => {
    objetoSimple(fila, `paginas[${indice}]`)
    exigirCamposPermitidos(fila, CAMPOS_PAGINA, `paginas[${indice}]`)
    const ruta = String(fila.ruta || '')
    if (!/^\/(?!\/)[^?#]{0,159}$/.test(ruta)) throw new TypeError(`paginas[${indice}].ruta no es una ruta pública segura.`)
    return {
      fecha: fechaValida(fila.fecha, `paginas[${indice}].fecha`),
      ruta,
      vistas: enteroAgregado(fila.vistas, `paginas[${indice}].vistas`),
    }
  })
  const acciones = listaSegura(lote.acciones, 'acciones').map((fila, indice) => {
    objetoSimple(fila, `acciones[${indice}]`)
    exigirCamposPermitidos(fila, CAMPOS_ACCION, `acciones[${indice}]`)
    const accion = String(fila.accion || '')
    if (!/^[a-z0-9][a-z0-9:_-]{0,79}$/.test(accion)) throw new TypeError(`acciones[${indice}].accion no es un identificador seguro.`)
    return {
      fecha: fechaValida(fila.fecha, `acciones[${indice}].fecha`),
      accion,
      cantidad: enteroAgregado(fila.cantidad, `acciones[${indice}].cantidad`),
    }
  })

  return {
    version: 1,
    proveedor: lote.proveedor,
    generadoEn,
    diarias: sinDuplicados(diarias, (fila) => fila.fecha, 'diarias'),
    paginas: sinDuplicados(paginas, (fila) => `${fila.fecha}\n${fila.ruta}`, 'paginas'),
    acciones: sinDuplicados(acciones, (fila) => `${fila.fecha}\n${fila.accion}`, 'acciones'),
  }
}

export function pasosSincronizacionMetricasWeb({ aprobada = false, hayDatos = false } = {}) {
  return [
    { id: 'modelo', etiqueta: 'Resumen agregado del gestor', estado: 'completo' },
    { id: 'contrato', etiqueta: 'Formato de entrada protegido', estado: 'completo' },
    { id: 'consulta', etiqueta: 'Consulta agregada validada con Cloudflare', estado: 'completo' },
    { id: 'activacion', etiqueta: aprobada ? 'Activación aprobada, conexión pendiente' : 'Aprobar y activar la medición', estado: 'pendiente' },
    { id: 'datos', etiqueta: hayDatos ? 'Primeros resultados recibidos' : 'Recibir y revisar los primeros resultados', estado: hayDatos ? 'completo' : 'pendiente' },
  ]
}
