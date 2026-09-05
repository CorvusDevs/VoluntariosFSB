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

// "Maria Perez" -> "Maria P.". En la planilla el apellido entero casi nunca hace
// falta, y el lugar que ocupa es justo el que necesita la foto del voluntario.
//
// Cuantas letras del apellido se muestran no se puede decidir mirando un nombre
// solo: si en la lista hay una Maria Perez y una Maria Planells, una inicial
// deja a las dos como "Maria P." y la planilla pasa a mentir. Por eso el largo
// se calcula contra todo el grupo, y crece hasta que no queden dos iguales.
function partirNombre(nombre) {
  const partes = String(nombre ?? '').trim().split(/\s+/).filter(Boolean)
  return {
    pila: partes[0] ?? '',
    // Solo la ultima palabra: es el apellido con el que la gente desambigua.
    apellido: partes.length > 1 ? partes[partes.length - 1] : '',
  }
}

const yaAbreviado = (apellido) => /^\p{L}\.$/u.test(apellido)

function conApellidoCorto(pila, apellido, letras) {
  if (!apellido) return pila
  if (yaAbreviado(apellido)) return `${pila} ${apellido}`
  // Si hacen falta todas las letras ya no es una abreviatura: va entero y sin punto.
  if (letras >= apellido.length) return `${pila} ${apellido}`
  const corte = apellido.slice(0, letras)
  return `${pila} ${corte[0].toUpperCase()}${corte.slice(1).toLowerCase()}.`
}

// Devuelve un Map de nombre completo a nombre abreviado, resuelto contra el grupo.
export function abreviarNombres(nombres) {
  const mapa = new Map()
  const porPila = new Map()
  ;[...new Set(nombres)].forEach((nombre) => {
    const { pila, apellido } = partirNombre(nombre)
    const clave = sinAcentos(pila).toLowerCase()
    if (!porPila.has(clave)) porPila.set(clave, [])
    porPila.get(clave).push({ nombre, pila, apellido })
  })

  porPila.forEach((grupo) => {
    const conApellido = grupo.filter((d) => d.apellido && !yaAbreviado(d.apellido))
    let letras = 1
    const maximo = Math.max(1, ...conApellido.map((d) => d.apellido.length))
    // Crece de a una letra hasta que los apellidos del grupo se distingan entre
    // si. Si dos personas tienen el mismo nombre y apellido no hay largo que
    // las separe, y el bucle corta al agotar las letras.
    while (letras < maximo) {
      const vistos = new Set(conApellido.map((d) => sinAcentos(d.apellido.slice(0, letras)).toLowerCase()))
      if (vistos.size === conApellido.length) break
      letras += 1
    }
    grupo.forEach((d) => mapa.set(d.nombre, conApellidoCorto(d.pila, d.apellido, letras)))
  })
  return mapa
}

// Un abreviador listo para usar, que cae en la inicial si el nombre no estaba en
// el grupo con el que se lo armo.
export function crearAbreviador(nombres) {
  const mapa = abreviarNombres(nombres)
  return (nombre) => mapa.get(nombre) ?? abreviarApellido(nombre)
}

// La version de a uno, para cuando no hay grupo contra el cual comparar.
export function abreviarApellido(nombre) {
  const { pila, apellido } = partirNombre(nombre)
  return conApellidoCorto(pila, apellido, 1)
}
