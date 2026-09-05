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

function fechaMovil(anio, mes, dia, dias) {
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  fecha.setUTCDate(fecha.getUTCDate() + dias)
  return fechaISO(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, fecha.getUTCDate())
}

// Algoritmo gregoriano de Meeus/Jones/Butcher para ubicar Carnaval y Turismo.
function pascua(anio) {
  const a = anio % 19
  const b = Math.floor(anio / 100)
  const c = anio % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = (h + l - 7 * m + 114) % 31 + 1
  return { mes, dia }
}

export const PLANTILLAS_DE_EVENTO = [
  { titulo: 'Reunión de coordinación', detalle: 'Definir responsables, materiales y comunicación', recordatorio: 7 },
  { titulo: 'Jornada especial', detalle: 'Confirmar participantes, apoyos y accesibilidad', recordatorio: 14 },
  { titulo: 'Cumpleaños a celebrar', detalle: 'Coordinar saludo o actividad inclusiva', recordatorio: 7 },
  { titulo: 'Actividad con familias', detalle: 'Confirmar invitación, horario y lugar', recordatorio: 14 },
]

export function efemeridesUruguay(anios) {
  return anios.flatMap((anio) => {
    const domingoPascua = pascua(anio)
    return [
    { fecha: fechaISO(anio, 1, 1), titulo: 'Año Nuevo', detalle: 'Feriado nacional de Uruguay', tipo: 'efemeride', id: `uy-anio-nuevo-${anio}` },
    { fecha: fechaISO(anio, 1, 6), titulo: 'Día de Reyes', detalle: 'Feriado nacional de Uruguay', tipo: 'efemeride', id: `uy-reyes-${anio}` },
    { fecha: fechaISO(anio, 1, 24), titulo: 'Día Internacional de la Educación', detalle: 'Educación como derecho', tipo: 'efemeride', id: `int-educacion-${anio}` },
    { fecha: fechaISO(anio, 2, 4), titulo: 'Día Mundial contra el Cáncer', detalle: 'Prevención, cuidados y acompañamiento', tipo: 'efemeride', id: `int-cancer-${anio}` },
    { fecha: fechaISO(anio, 2, 11), titulo: 'Día Internacional de las Mujeres y las Niñas en la Ciencia', detalle: 'Participación e igualdad', tipo: 'efemeride', id: `int-mujeres-ciencia-${anio}` },
    { fecha: fechaMovil(anio, domingoPascua.mes, domingoPascua.dia, -48), titulo: 'Carnaval', detalle: 'Feriado nacional de Uruguay', tipo: 'efemeride', id: `uy-carnaval-lunes-${anio}` },
    { fecha: fechaMovil(anio, domingoPascua.mes, domingoPascua.dia, -47), titulo: 'Carnaval', detalle: 'Feriado nacional de Uruguay', tipo: 'efemeride', id: `uy-carnaval-martes-${anio}` },
    { fecha: fechaISO(anio, 3, 1), titulo: 'Día de la Cero Discriminación', detalle: 'Igualdad y dignidad para todas las personas', tipo: 'efemeride', id: `int-cero-discriminacion-${anio}` },
    { fecha: fechaISO(anio, 3, 8), titulo: 'Día Internacional de las Mujeres', detalle: 'Igualdad y participación', tipo: 'efemeride', id: `uy-mujeres-${anio}` },
    { fecha: fechaISO(anio, 3, 20), titulo: 'Día Internacional de la Felicidad', detalle: 'Bienestar y vínculos comunitarios', tipo: 'efemeride', id: `int-felicidad-${anio}` },
    { fecha: fechaISO(anio, 3, 21), titulo: 'Día Mundial del Síndrome de Down', detalle: 'Inclusión y derechos', tipo: 'efemeride', id: `uy-down-${anio}` },
    { fecha: fechaISO(anio, 3, 21), titulo: 'Día Internacional de los Bosques', detalle: 'Ambiente y comunidad', tipo: 'efemeride', id: `int-bosques-${anio}` },
    { fecha: fechaISO(anio, 3, 22), titulo: 'Día Mundial del Agua', detalle: 'Acceso al agua y sostenibilidad', tipo: 'efemeride', id: `int-agua-${anio}` },
    { fecha: fechaMovil(anio, domingoPascua.mes, domingoPascua.dia, -3), titulo: 'Semana de Turismo', detalle: 'Jueves de Turismo, feriado nacional de Uruguay', tipo: 'efemeride', id: `uy-turismo-jueves-${anio}` },
    { fecha: fechaMovil(anio, domingoPascua.mes, domingoPascua.dia, -2), titulo: 'Semana de Turismo', detalle: 'Viernes de Turismo, feriado nacional de Uruguay', tipo: 'efemeride', id: `uy-turismo-viernes-${anio}` },
    { fecha: fechaISO(anio, 4, 2), titulo: 'Día Mundial de Concienciación sobre el Autismo', detalle: 'Neurodiversidad, inclusión y derechos', tipo: 'efemeride', id: `int-autismo-${anio}` },
    { fecha: fechaISO(anio, 4, 6), titulo: 'Día Internacional del Deporte para el Desarrollo y la Paz', detalle: 'Deporte e inclusión', tipo: 'efemeride', id: `uy-deporte-${anio}` },
    { fecha: fechaISO(anio, 4, 7), titulo: 'Día Mundial de la Salud', detalle: 'Salud y bienestar para todas las personas', tipo: 'efemeride', id: `int-salud-${anio}` },
    { fecha: fechaISO(anio, 4, 19), titulo: 'Desembarco de los Treinta y Tres Orientales', detalle: 'Feriado nacional de Uruguay', tipo: 'efemeride', id: `uy-treinta-tres-${anio}` },
    { fecha: fechaISO(anio, 4, 22), titulo: 'Día Internacional de la Madre Tierra', detalle: 'Cuidado ambiental', tipo: 'efemeride', id: `int-tierra-${anio}` },
    { fecha: fechaISO(anio, 4, 23), titulo: 'Día Mundial del Libro', detalle: 'Lectura, cultura y acceso al conocimiento', tipo: 'efemeride', id: `int-libro-${anio}` },
    { fecha: fechaISO(anio, 5, 1), titulo: 'Día Internacional de las y los Trabajadores', detalle: 'Feriado nacional de Uruguay', tipo: 'efemeride', id: `uy-trabajo-${anio}` },
    { fecha: fechaISO(anio, 5, domingoDelMes(anio, 5, 2)), titulo: 'Día de la Madre', detalle: 'Fecha de referencia anual en Uruguay', tipo: 'efemeride', id: `uy-madre-${anio}` },
    { fecha: fechaISO(anio, 5, 15), titulo: 'Día Internacional de las Familias', detalle: 'Acompañamiento y comunidad', tipo: 'efemeride', id: `uy-familias-${anio}` },
    { fecha: fechaISO(anio, 5, 16), titulo: 'Día Internacional de la Convivencia en Paz', detalle: 'Diálogo, respeto y comunidad', tipo: 'efemeride', id: `int-convivencia-${anio}` },
    { fecha: fechaISO(anio, 5, 18), titulo: 'Batalla de Las Piedras', detalle: 'Feriado nacional de Uruguay', tipo: 'efemeride', id: `uy-las-piedras-${anio}` },
    { fecha: fechaISO(anio, 5, 21), titulo: 'Día Mundial de la Diversidad Cultural', detalle: 'Diversidad e inclusión', tipo: 'efemeride', id: `uy-diversidad-mundial-${anio}` },
    { fecha: fechaISO(anio, 5, 31), titulo: 'Día Mundial sin Tabaco', detalle: 'Prevención y salud', tipo: 'efemeride', id: `int-sin-tabaco-${anio}` },
    { fecha: fechaISO(anio, 6, 5), titulo: 'Día Mundial del Medio Ambiente', detalle: 'Cuidado del ambiente', tipo: 'efemeride', id: `int-medio-ambiente-${anio}` },
    { fecha: fechaISO(anio, 6, 12), titulo: 'Día Mundial contra el Trabajo Infantil', detalle: 'Derechos de niñas, niños y adolescentes', tipo: 'efemeride', id: `int-trabajo-infantil-${anio}` },
    { fecha: fechaISO(anio, 6, 18), titulo: 'Día del Orgullo Autista', detalle: 'Neurodiversidad, respeto e inclusión', tipo: 'efemeride', id: `uy-orgullo-autista-${anio}` },
    { fecha: fechaISO(anio, 6, 19), titulo: 'Natalicio de Artigas', detalle: 'Feriado nacional de Uruguay', tipo: 'efemeride', id: `uy-artigas-${anio}` },
    { fecha: fechaISO(anio, 6, 20), titulo: 'Día Mundial de las Personas Refugiadas', detalle: 'Protección, derechos e integración', tipo: 'efemeride', id: `int-refugiadas-${anio}` },
    { fecha: fechaISO(anio, 7, domingoDelMes(anio, 7, 2)), titulo: 'Día del Padre', detalle: 'Fecha de referencia anual', tipo: 'efemeride', id: `uy-padre-${anio}` },
    { fecha: fechaISO(anio, 7, 11), titulo: 'Día Mundial de la Población', detalle: 'Derechos, cuidados y desarrollo', tipo: 'efemeride', id: `int-poblacion-${anio}` },
    { fecha: fechaISO(anio, 7, 18), titulo: 'Jura de la Constitución', detalle: 'Feriado nacional de Uruguay', tipo: 'efemeride', id: `uy-constitucion-${anio}` },
    { fecha: fechaISO(anio, 8, 9), titulo: 'Día Internacional de los Pueblos Indígenas', detalle: 'Diversidad cultural y derechos', tipo: 'efemeride', id: `int-pueblos-indigenas-${anio}` },
    { fecha: fechaISO(anio, 8, 12), titulo: 'Día Internacional de la Juventud', detalle: 'Participación de adolescentes y jóvenes', tipo: 'efemeride', id: `uy-juventud-${anio}` },
    { fecha: fechaISO(anio, 8, domingoDelMes(anio, 8, 2)), titulo: 'Día de la Niñez', detalle: 'Fecha de referencia anual', tipo: 'efemeride', id: `uy-ninez-${anio}` },
    { fecha: fechaISO(anio, 8, 19), titulo: 'Día Mundial de la Asistencia Humanitaria', detalle: 'Solidaridad y cuidados', tipo: 'efemeride', id: `int-asistencia-humanitaria-${anio}` },
    { fecha: fechaISO(anio, 8, 25), titulo: 'Declaratoria de la Independencia', detalle: 'Feriado nacional de Uruguay', tipo: 'efemeride', id: `uy-independencia-${anio}` },
    { fecha: fechaISO(anio, 9, 8), titulo: 'Día Internacional de la Alfabetización', detalle: 'Educación y participación', tipo: 'efemeride', id: `int-alfabetizacion-${anio}` },
    { fecha: fechaISO(anio, 9, 10), titulo: 'Día Mundial para la Prevención del Suicidio', detalle: 'Escucha, acompañamiento y cuidados', tipo: 'efemeride', id: `int-prevencion-suicidio-${anio}` },
    { fecha: fechaISO(anio, 9, 21), titulo: 'Día Internacional de la Paz', detalle: 'Derechos, diálogo y convivencia', tipo: 'efemeride', id: `int-paz-${anio}` },
    { fecha: fechaISO(anio, 9, 23), titulo: 'Día Internacional de las Lenguas de Señas', detalle: 'Comunicación accesible', tipo: 'efemeride', id: `uy-lenguas-senas-${anio}` },
    { fecha: fechaISO(anio, 10, 1), titulo: 'Día Internacional de las Personas Mayores', detalle: 'Envejecimiento activo y derechos', tipo: 'efemeride', id: `int-personas-mayores-${anio}` },
    { fecha: fechaISO(anio, 10, 5), titulo: 'Día Mundial de las y los Docentes', detalle: 'Educación y reconocimiento', tipo: 'efemeride', id: `int-docentes-${anio}` },
    { fecha: fechaISO(anio, 10, 10), titulo: 'Día Mundial de la Salud Mental', detalle: 'Bienestar y acompañamiento', tipo: 'efemeride', id: `uy-salud-mental-${anio}` },
    { fecha: fechaISO(anio, 10, 11), titulo: 'Día Internacional de la Niña', detalle: 'Derechos e igualdad de oportunidades', tipo: 'efemeride', id: `int-nina-${anio}` },
    { fecha: fechaISO(anio, 10, 12), titulo: 'Día de la Diversidad Cultural', detalle: 'Conmemoración en Uruguay', tipo: 'efemeride', id: `uy-diversidad-${anio}` },
    { fecha: fechaISO(anio, 10, 15), titulo: 'Día Internacional de las Mujeres Rurales', detalle: 'Reconocimiento y participación', tipo: 'efemeride', id: `int-mujeres-rurales-${anio}` },
    { fecha: fechaISO(anio, 10, 16), titulo: 'Día Mundial de la Alimentación', detalle: 'Alimentación adecuada y sostenible', tipo: 'efemeride', id: `int-alimentacion-${anio}` },
    { fecha: fechaISO(anio, 10, 17), titulo: 'Día Internacional para la Erradicación de la Pobreza', detalle: 'Dignidad, derechos e inclusión', tipo: 'efemeride', id: `int-pobreza-${anio}` },
    { fecha: fechaISO(anio, 10, 24), titulo: 'Día de las Naciones Unidas', detalle: 'Cooperación internacional', tipo: 'efemeride', id: `int-naciones-unidas-${anio}` },
    { fecha: fechaISO(anio, 11, 2), titulo: 'Día de los Difuntos', detalle: 'Feriado nacional de Uruguay', tipo: 'efemeride', id: `uy-difuntos-${anio}` },
    { fecha: fechaISO(anio, 11, 20), titulo: 'Día Mundial de la Infancia', detalle: 'Derechos de niñas, niños y adolescentes', tipo: 'efemeride', id: `uy-infancia-${anio}` },
    { fecha: fechaISO(anio, 11, 25), titulo: 'Día Internacional de la Eliminación de la Violencia contra las Mujeres', detalle: 'Prevención, apoyo y derechos', tipo: 'efemeride', id: `int-violencia-mujeres-${anio}` },
    { fecha: fechaISO(anio, 12, 1), titulo: 'Día Mundial del Sida', detalle: 'Información, prevención y acompañamiento', tipo: 'efemeride', id: `int-sida-${anio}` },
    { fecha: fechaISO(anio, 12, 3), titulo: 'Día Internacional de las Personas con Discapacidad', detalle: 'Accesibilidad e inclusión', tipo: 'efemeride', id: `uy-discapacidad-${anio}` },
    { fecha: fechaISO(anio, 12, 5), titulo: 'Día Internacional del Voluntariado', detalle: 'Reconocer y cuidar al equipo voluntario', tipo: 'efemeride', id: `uy-voluntariado-${anio}` },
    { fecha: fechaISO(anio, 12, 10), titulo: 'Día de los Derechos Humanos', detalle: 'Dignidad e igualdad', tipo: 'efemeride', id: `uy-derechos-humanos-${anio}` },
    { fecha: fechaISO(anio, 12, 18), titulo: 'Día Internacional de las Personas Migrantes', detalle: 'Derechos, integración y comunidad', tipo: 'efemeride', id: `int-personas-migrantes-${anio}` },
    { fecha: fechaISO(anio, 12, 25), titulo: 'Día de la Familia', detalle: 'Feriado nacional de Uruguay', tipo: 'efemeride', id: `uy-familia-${anio}` },
  ]
  })
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
