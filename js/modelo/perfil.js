export function edadDesdeAnio(anioNacimiento, anioActual = new Date().getFullYear()) {
  const anio = Number(anioNacimiento)
  if (!Number.isInteger(anio) || anio < 1900 || anio > anioActual) return null
  return anioActual - anio
}

export function perfilDe(persona) {
  return {
    anioNacimiento: '',
    desde: '',
    leGusta: '',
    noLeGusta: '',
    necesidades: '',
    ...persona.perfil,
  }
}
