export function iniciales(nombre) {
  if (!nombre || typeof nombre !== 'string') return ''
  const palabras = nombre.trim().split(/\s+/).filter(Boolean)
  if (palabras.length === 0) return ''
  if (palabras.length === 1) {
    return palabras[0].slice(0, 2).toUpperCase()
  }
  return (palabras[0][0] + palabras[1][0]).toUpperCase()
}

export function sinAcentos(texto) {
  if (!texto) return ''
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, (marca, i, cadena) => {
      const base = cadena[i - 1]
      return (base === 'n' || base === 'N') && marca === '̃' ? marca : ''
    })
    .normalize('NFC')
    .toLowerCase()
}

export function coincide(nombre, busqueda) {
  if (!busqueda) return true
  return sinAcentos(nombre).includes(sinAcentos(busqueda))
}

export function ordenarPorNombre(gente) {
  return [...gente].sort((a, b) => sinAcentos(a.nombre).localeCompare(sinAcentos(b.nombre), 'es'))
}
