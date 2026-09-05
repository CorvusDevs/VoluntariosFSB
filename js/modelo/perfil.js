export function edadDesdeAnio(fechaNacimiento, hoy = new Date()) {
  if (typeof hoy === 'number') hoy = new Date(hoy, 11, 31)
  const texto = String(fechaNacimiento ?? '')
  if (/^\d{4}$/.test(texto)) {
    const anio = Number(texto)
    return anio >= 1900 && anio <= hoy.getFullYear() ? hoy.getFullYear() - anio : null
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null
  const fecha = new Date(`${texto}T00:00:00`)
  if (Number.isNaN(fecha.getTime()) || fecha > hoy || fecha.getFullYear() < 1900) return null
  let edad = hoy.getFullYear() - fecha.getFullYear()
  if (hoy.getMonth() < fecha.getMonth() || (hoy.getMonth() === fecha.getMonth() && hoy.getDate() < fecha.getDate())) edad -= 1
  return edad
}

export function fechaPerfil(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(texto ?? ''))) return texto ?? ''
  const fecha = new Date(`${texto}T00:00:00`)
  return new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'long', year: 'numeric' }).format(fecha)
}

export function perfilDe(persona) {
  return {
    desde: '',
    leGusta: '',
    noLeGusta: '',
    apoyosOperativos: '',
    ...persona.perfil,
  }
}

export function privacidadDe(persona) {
  const privacidad = persona?.privacidad ?? {}
  return {
    perfilInterno: privacidad.perfilInterno === true,
    fotoInterna: privacidad.fotoInterna === true,
    fotoPublica: privacidad.fotoPublica === true,
    contacto: privacidad.contacto === true,
    datosSensibles: privacidad.datosSensibles === true,
    revisadoEl: String(privacidad.revisadoEl ?? ''),
    ...privacidad,
  }
}
