function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

const entero16 = (valor) => Uint8Array.of(valor & 255, (valor >>> 8) & 255)
const entero32 = (valor) => Uint8Array.of(valor & 255, (valor >>> 8) & 255, (valor >>> 16) & 255, (valor >>> 24) & 255)

function unir(partes) {
  const resultado = new Uint8Array(partes.reduce((total, parte) => total + parte.length, 0))
  let posicion = 0
  for (const parte of partes) { resultado.set(parte, posicion); posicion += parte.length }
  return resultado
}

function fechaDos(fecha = new Date()) {
  const segura = fecha instanceof Date && !Number.isNaN(fecha.getTime()) ? fecha : new Date()
  const anio = Math.min(2107, Math.max(1980, segura.getFullYear()))
  return {
    hora: (segura.getHours() << 11) | (segura.getMinutes() << 5) | Math.floor(segura.getSeconds() / 2),
    fecha: ((anio - 1980) << 9) | ((segura.getMonth() + 1) << 5) | segura.getDate(),
  }
}

function armarZip(archivos = [], opciones = {}) {
  const codificar = new TextEncoder(); const locales = []; const centrales = []
  const marca = fechaDos(opciones.fecha)
  let desplazamiento = 0
  for (const archivo of archivos) {
    const nombreBytes = codificar.encode(archivo.nombre)
    const original = archivo.original
    const contenido = archivo.contenido
    const metodo = archivo.metodo ?? 0
    const suma = crc32(original)
    const local = unir([entero32(0x04034b50), entero16(20), entero16(0x0800), entero16(metodo), entero16(marca.hora), entero16(marca.fecha), entero32(suma), entero32(contenido.length), entero32(original.length), entero16(nombreBytes.length), entero16(0), nombreBytes, contenido])
    locales.push(local)
    centrales.push(unir([entero32(0x02014b50), entero16(20), entero16(20), entero16(0x0800), entero16(metodo), entero16(marca.hora), entero16(marca.fecha), entero32(suma), entero32(contenido.length), entero32(original.length), entero16(nombreBytes.length), entero16(0), entero16(0), entero16(0), entero16(0), entero32(0), entero32(desplazamiento), nombreBytes]))
    desplazamiento += local.length
  }
  const central = unir(centrales)
  return unir([...locales, central, entero32(0x06054b50), entero16(0), entero16(0), entero16(archivos.length), entero16(archivos.length), entero32(central.length), entero32(desplazamiento), entero16(0)])
}

function normalizarArchivos(archivos) {
  const codificar = new TextEncoder()
  return archivos.map((archivo) => {
    const original = typeof archivo.contenido === 'string' ? codificar.encode(archivo.contenido) : archivo.contenido
    return { nombre: archivo.nombre, original, contenido: original, metodo: 0 }
  })
}

export function crearZipSinCompresion(archivos = [], opciones = {}) {
  return armarZip(normalizarArchivos(archivos), opciones)
}

async function comprimirDeflateRaw(bytes) {
  const flujo = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(flujo).arrayBuffer())
}

export async function crearZip(archivos = [], opciones = {}) {
  const normalizados = normalizarArchivos(archivos)
  const comprimir = opciones.comprimir ?? comprimirDeflateRaw
  const preparados = []
  for (const archivo of normalizados) {
    try {
      const comprimido = await comprimir(archivo.original)
      preparados.push(comprimido.length < archivo.original.length
        ? { ...archivo, contenido: comprimido, metodo: 8 }
        : archivo)
    } catch {
      preparados.push(archivo)
    }
  }
  return armarZip(preparados, opciones)
}
