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

export const PLANTILLAS_DE_EVENTO = [
  { titulo: 'Reunión de coordinación', detalle: 'Definir responsables, materiales y comunicación', recordatorio: 7 },
  { titulo: 'Jornada especial', detalle: 'Confirmar participantes, apoyos y accesibilidad', recordatorio: 14 },
  { titulo: 'Cumpleaños a celebrar', detalle: 'Coordinar saludo o actividad inclusiva', recordatorio: 7 },
  { titulo: 'Actividad con familias', detalle: 'Confirmar invitación, horario y lugar', recordatorio: 14 },
]

export function efemeridesUruguay(anios) {
  return anios.flatMap((anio) => [
    { fecha: fechaISO(anio, 3, 8), titulo: 'Día Internacional de las Mujeres', detalle: 'Igualdad y participación', tipo: 'efemeride', id: `uy-mujeres-${anio}` },
    { fecha: fechaISO(anio, 3, 21), titulo: 'Día Mundial del Síndrome de Down', detalle: 'Inclusión y derechos', tipo: 'efemeride', id: `uy-down-${anio}` },
    { fecha: fechaISO(anio, 4, 2), titulo: 'Día Nacional de las Personas con TEA', detalle: 'Concientización sobre el autismo', tipo: 'efemeride', id: `uy-tea-${anio}` },
    { fecha: fechaISO(anio, 4, 6), titulo: 'Día Internacional del Deporte para el Desarrollo y la Paz', detalle: 'Deporte e inclusión', tipo: 'efemeride', id: `uy-deporte-${anio}` },
    { fecha: fechaISO(anio, 5, domingoDelMes(anio, 5, 2)), titulo: 'Día de la Madre', detalle: 'Fecha de referencia anual en Uruguay', tipo: 'efemeride', id: `uy-madre-${anio}` },
    { fecha: fechaISO(anio, 5, 15), titulo: 'Día Internacional de las Familias', detalle: 'Acompañamiento y comunidad', tipo: 'efemeride', id: `uy-familias-${anio}` },
    { fecha: fechaISO(anio, 5, 21), titulo: 'Día Mundial de la Diversidad Cultural', detalle: 'Diversidad e inclusión', tipo: 'efemeride', id: `uy-diversidad-mundial-${anio}` },
    { fecha: fechaISO(anio, 6, 18), titulo: 'Día del Orgullo Autista', detalle: 'Neurodiversidad, respeto e inclusión', tipo: 'efemeride', id: `uy-orgullo-autista-${anio}` },
    { fecha: fechaISO(anio, 7, domingoDelMes(anio, 7, 2)), titulo: 'Día del Padre', detalle: 'Fecha de referencia anual', tipo: 'efemeride', id: `uy-padre-${anio}` },
    { fecha: fechaISO(anio, 8, 12), titulo: 'Día Internacional de la Juventud', detalle: 'Participación de adolescentes y jóvenes', tipo: 'efemeride', id: `uy-juventud-${anio}` },
    { fecha: fechaISO(anio, 8, domingoDelMes(anio, 8, 2)), titulo: 'Día de la Niñez', detalle: 'Fecha de referencia anual', tipo: 'efemeride', id: `uy-ninez-${anio}` },
    { fecha: fechaISO(anio, 9, 23), titulo: 'Día Internacional de las Lenguas de Señas', detalle: 'Comunicación accesible', tipo: 'efemeride', id: `uy-lenguas-senas-${anio}` },
    { fecha: fechaISO(anio, 10, 10), titulo: 'Día Mundial de la Salud Mental', detalle: 'Bienestar y acompañamiento', tipo: 'efemeride', id: `uy-salud-mental-${anio}` },
    { fecha: fechaISO(anio, 10, 12), titulo: 'Día de la Diversidad Cultural', detalle: 'Conmemoración en Uruguay', tipo: 'efemeride', id: `uy-diversidad-${anio}` },
    { fecha: fechaISO(anio, 11, 20), titulo: 'Día Mundial de la Infancia', detalle: 'Derechos de niñas, niños y adolescentes', tipo: 'efemeride', id: `uy-infancia-${anio}` },
    { fecha: fechaISO(anio, 12, 3), titulo: 'Día Internacional de las Personas con Discapacidad', detalle: 'Accesibilidad e inclusión', tipo: 'efemeride', id: `uy-discapacidad-${anio}` },
    { fecha: fechaISO(anio, 12, 5), titulo: 'Día Internacional del Voluntariado', detalle: 'Reconocer y cuidar al equipo voluntario', tipo: 'efemeride', id: `uy-voluntariado-${anio}` },
    { fecha: fechaISO(anio, 12, 10), titulo: 'Día de los Derechos Humanos', detalle: 'Dignidad e igualdad', tipo: 'efemeride', id: `uy-derechos-humanos-${anio}` },
  ])
}

export function cumpleanosProximos(roster, hoy = new Date(), dias = 45) {
  if (Array.isArray(roster.cumpleanosAgenda)) return roster.cumpleanosAgenda
    .filter((evento) => evento?.tipo === 'cumpleanos' && fechaValida(evento.fecha) && evento.persona?.nombre)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.persona.nombre.localeCompare(b.persona.nombre, 'es'))
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

export function recordatoriosDe(roster, hoy = new Date(), dias = 21) {
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  return agendaDe(roster).eventos
    .filter((evento) => evento.tipo === 'manual' && fechaValida(evento.fecha) && Number(evento.recordatorio) > 0)
    .map((evento) => {
      const fecha = new Date(`${evento.fecha}T00:00:00`)
      const faltan = Math.ceil((fecha - inicio) / 86400000)
      return { ...evento, faltan, recordatorio: Number(evento.recordatorio) }
    })
    .filter((evento) => evento.faltan >= 0 && evento.faltan <= Math.min(dias, evento.recordatorio))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
}

export function agregarEvento(roster, { fecha, titulo, detalle = '', recordatorio = 0 }) {
  if (!fechaValida(fecha)) throw new Error('Elegí una fecha válida')
  if (!String(titulo).trim()) throw new Error('El evento necesita un título')
  const dias = Number(recordatorio)
  const evento = { id: `evento-${Date.now().toString(36)}`, fecha, titulo: String(titulo).trim(), detalle: String(detalle).trim(), recordatorio: Number.isFinite(dias) && dias > 0 ? dias : 0, tipo: 'manual' }
  return { ...roster, agenda: { ...agendaDe(roster), eventos: [...agendaDe(roster).eventos, evento] } }
}

export function quitarEvento(roster, id) {
  return { ...roster, agenda: { ...agendaDe(roster), eventos: agendaDe(roster).eventos.filter((evento) => evento.id !== id) } }
}
