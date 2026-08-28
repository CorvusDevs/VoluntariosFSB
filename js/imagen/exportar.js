export function nombreDeArchivo(lista, grupo = null) {
  const base = `futbol-sin-barreras-${lista.fecha}`
  return grupo ? `${base}-grupo-${grupo}.png` : `${base}.png`
}

export function nombreDeArchivoWhatsApp(lista) {
  return `futbol-sin-barreras-${lista.fecha}-whatsapp.png`
}

export function medidorDesde(ctx) {
  return (texto, fuente) => {
    ctx.font = fuente
    return ctx.measureText(texto).width
  }
}

export async function esperarFuentes() {
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.load('500 52px Poppins')
    await document.fonts.load('400 32px Poppins')
    await document.fonts.ready
  }
}

export function cargarImagen(url) {
  return new Promise((resolver) => {
    const img = new Image()
    img.onload = () => resolver(img)
    img.onerror = () => resolver(null)
    img.src = url
  })
}

export function aBlob(canvas) {
  return new Promise((resolver) => canvas.toBlob(resolver, 'image/png'))
}

export async function descargar(canvas, nombre) {
  const blob = await aBlob(canvas)
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

export async function compartir(canvas, nombre, texto) {
  const blob = await aBlob(canvas)
  const archivo = new File([blob], nombre, { type: 'image/png' })
  if (navigator.canShare?.({ files: [archivo] })) {
    await navigator.share({ files: [archivo], text: texto })
    return true
  }
  return false
}
