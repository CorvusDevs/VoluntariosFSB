function fechaValida(fecha) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(fecha ?? '')) && !Number.isNaN(new Date(`${fecha}T00:00:00`).getTime())
}

export function agendaDe(roster) {
  return { version: 1, eventos: [], ...(roster.agenda ?? {}) }
}

export function cumpleanosProximos(roster, hoy = new Date(), dias = 45) {
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  return roster.participantes
    .filter((persona) => persona.activo !== false && fechaValida(persona.perfil?.anioNacimiento))
    .map((persona) => {
      const nacimiento = new Date(`${persona.perfil.anioNacimiento}T00:00:00`)
      let fecha = new Date(inicio.getFullYear(), nacimiento.getMonth(), nacimiento.getDate())
      if (fecha < inicio) fecha.setFullYear(fecha.getFullYear() + 1)
      return { tipo: 'cumpleanos', id: `cumple-${persona.id}-${fecha.getFullYear()}`, fecha: fecha.toISOString().slice(0, 10), persona }
    })
    .filter((evento) => (new Date(`${evento.fecha}T00:00:00`) - inicio) / 86400000 <= dias)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.persona.nombre.localeCompare(b.persona.nombre, 'es'))
}

export function eventosDe(roster, hoy = new Date()) {
  const manuales = agendaDe(roster).eventos.filter((evento) => fechaValida(evento.fecha) && evento.titulo?.trim())
  return [...cumpleanosProximos(roster, hoy), ...manuales]
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || String(a.titulo ?? a.persona?.nombre).localeCompare(String(b.titulo ?? b.persona?.nombre), 'es'))
}

export function agregarEvento(roster, { fecha, titulo, detalle = '' }) {
  if (!fechaValida(fecha)) throw new Error('Elegí una fecha válida')
  if (!String(titulo).trim()) throw new Error('El evento necesita un título')
  const evento = { id: `evento-${Date.now().toString(36)}`, fecha, titulo: String(titulo).trim(), detalle: String(detalle).trim() }
  return { ...roster, agenda: { ...agendaDe(roster), eventos: [...agendaDe(roster).eventos, evento] } }
}

export function quitarEvento(roster, id) {
  return { ...roster, agenda: { ...agendaDe(roster), eventos: agendaDe(roster).eventos.filter((evento) => evento.id !== id) } }
}
