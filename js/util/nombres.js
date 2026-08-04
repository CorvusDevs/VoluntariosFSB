export function iniciales(nombre) {
  if (!nombre || typeof nombre !== 'string') return ''
  const palabras = nombre.trim().split(/\s+/).filter(Boolean)
  if (palabras.length === 0) return ''
  if (palabras.length === 1) {
    return palabras[0].slice(0, 2).toUpperCase()
  }
  const primeraLetra = (palabra) => [...palabra][0]
  return (primeraLetra(palabras[0]) + primeraLetra(palabras[1])).toUpperCase()
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

// "Maria Perez" -> "Maria P.". En la planilla el apellido casi nunca hace falta:
// entre once chicos no hay dos Marias, y el lugar que ocupa es justo el que
// necesita la foto del voluntario al lado del nombre.
//
// Se toma el primer nombre y la inicial de la ultima palabra, que es el apellido
// que la gente usa para desambiguar. Un nombre de una sola palabra queda igual.
export function abreviarApellido(nombre) {
  const partes = String(nombre ?? '').trim().split(/\s+/).filter(Boolean)
  if (partes.length < 2) return partes[0] ?? ''
  const apellido = partes[partes.length - 1]
  // Si ya viene abreviado, no le agregamos un segundo punto.
  if (/^\p{L}\.$/u.test(apellido)) return `${partes[0]} ${apellido}`
  return `${partes[0]} ${apellido[0].toUpperCase()}.`
}
