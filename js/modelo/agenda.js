function fechaValida(fecha) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(fecha ?? '')) && !Number.isNaN(new Date(`${fecha}T00:00:00`).getTime())
}

export function agendaDe(roster) {
  return { version: 1, eventos: [], ...(roster.agenda ?? {}) }
}

const fechaISO = (anio, mes, dia) => `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`

function domingoDelMes(anio, mes, numero) {
  const primero = new Date(Date.UTC(anio, mes - 1, 1)).getUTCDay()
  return 1 + ((7 - primero) % 7) + 7 * (numero - 1)
}

export function efemeridesUruguay(anios) {
  return anios.flatMap((anio) => [
    { fecha: fechaISO(anio, 4, 2), titulo: 'Día Nacional de las Personas con TEA', detalle: 'Concientización sobre el autismo', tipo: 'efemeride', id: `uy-tea-${anio}` },
    { fecha: fechaISO(anio, 5, 21), titulo: 'Día Mundial de la Diversidad Cultural', detalle: 'Diversidad e inclusión', tipo: 'efemeride', id: `uy-diversidad-mundial-${anio}` },
    { fecha: fechaISO(anio, 7, domingoDelMes(anio, 7, 2)), titulo: 'Día del Padre', detalle: 'Fecha de referencia anual', tipo: 'efemeride', id: `uy-padre-${anio}` },
    { fecha: fechaISO(anio, 8, domingoDelMes(anio, 8, 2)), titulo: 'Día de la Niñez', detalle: 'Fecha de referencia anual', tipo: 'efemeride', id: `uy-ninez-${anio}` },
    { fecha: fechaISO(anio, 10, 12), titulo: 'Día de la Diversidad Cultural', detalle: 'Conmemoración en Uruguay', tipo: 'efemeride', id: `uy-diversidad-${anio}` },
    { fecha: fechaISO(anio, 12, 3), titulo: 'Día Internacional de las Personas con Discapacidad', detalle: 'Accesibilidad e inclusión', tipo: 'efemeride', id: `uy-discapacidad-${anio}` },
  ])
}

export function cumpleanosProximos(roster, hoy = new Date(), dias = 45) {
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const personas = [
    ...(roster.participantes ?? []).map((persona) => ({ persona, rol: 'participante' })),
    ...(roster.voluntarios ?? []).map((persona) => ({ persona, rol: 'voluntario' })),
  ]
  return personas
    .filter(({ persona }) => persona.activo !== false && fechaValida(persona.perfil?.anioNacimiento))
    .map(({ persona, rol }) => {
      const nacimiento = new Date(`${persona.perfil.anioNacimiento}T00:00:00`)
      let fecha = new Date(inicio.getFullYear(), nacimiento.getMonth(), nacimiento.getDate())
      if (fecha < inicio) fecha.setFullYear(fecha.getFullYear() + 1)
      return { tipo: 'cumpleanos', id: `cumple-${persona.id}-${fecha.getFullYear()}`, fecha: fecha.toISOString().slice(0, 10), persona, rol }
    })
    .filter((evento) => (new Date(`${evento.fecha}T00:00:00`) - inicio) / 86400000 <= dias)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.persona.nombre.localeCompare(b.persona.nombre, 'es'))
}

export function eventosDe(roster, hoy = new Date()) {
  const manuales = agendaDe(roster).eventos.filter((evento) => fechaValida(evento.fecha) && evento.titulo?.trim())
  const anio = hoy.getFullYear()
  return [...cumpleanosProximos(roster, hoy), ...efemeridesUruguay([anio, anio + 1]), ...manuales]
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || String(a.titulo ?? a.persona?.nombre).localeCompare(String(b.titulo ?? b.persona?.nombre), 'es'))
}

export function agregarEvento(roster, { fecha, titulo, detalle = '' }) {
  if (!fechaValida(fecha)) throw new Error('Elegí una fecha válida')
  if (!String(titulo).trim()) throw new Error('El evento necesita un título')
  const evento = { id: `evento-${Date.now().toString(36)}`, fecha, titulo: String(titulo).trim(), detalle: String(detalle).trim(), tipo: 'manual' }
  return { ...roster, agenda: { ...agendaDe(roster), eventos: [...agendaDe(roster).eventos, evento] } }
}

export function quitarEvento(roster, id) {
  return { ...roster, agenda: { ...agendaDe(roster), eventos: agendaDe(roster).eventos.filter((evento) => evento.id !== id) } }
}
