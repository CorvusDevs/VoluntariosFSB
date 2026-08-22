const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
               'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre']

function partes(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new Error(`Fecha invalida: ${iso}. Se espera AAAA-MM-DD.`)
  }
  const [a, m, d] = iso.split('-').map(Number)
  const fecha = new Date(Date.UTC(a, m - 1, d))
  if (fecha.getUTCFullYear() !== a || fecha.getUTCMonth() !== m - 1 || fecha.getUTCDate() !== d) {
    throw new Error(`Fecha inexistente: ${iso}`)
  }
  return { anio: a, mes: m, dia: d, diaSemana: fecha.getUTCDay() }
}

export function formatearFechaLarga(iso) {
  const { mes, dia, diaSemana } = partes(iso)
  return `${DIAS[diaSemana]} ${dia} de ${MESES[mes - 1]}`
}

export function formatearFechaCorta(iso) {
  const { anio, mes, dia } = partes(iso)
  return `${dia}/${mes}/${anio}`
}

export function hoyISO() {
  const ahora = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${ahora.getFullYear()}-${p(ahora.getMonth() + 1)}-${p(ahora.getDate())}`
}

export function evitarCortesHora(texto) {
  return String(texto ?? '').replace(
    /(\d{1,2}:\d{2})\s+([ap])\.\s*m\./gi,
    (_, hora, periodo) => `${hora}\u00a0${periodo}.\u00a0m.`,
  )
}

export function fechaDesdeUTC(valor) {
  const texto = String(valor ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(texto)) {
    return new Date(`${texto.replace(' ', 'T')}Z`)
  }
  return new Date(texto)
}

export function proximoSabado(desdeISO) {
  const base = desdeISO ?? hoyISO()
  const { diaSemana } = partes(base)
  if (diaSemana === 6) return base
  const [a, m, d] = base.split('-').map(Number)
  const fecha = new Date(Date.UTC(a, m - 1, d + (6 - diaSemana)))
  const p = (n) => String(n).padStart(2, '0')
  return `${fecha.getUTCFullYear()}-${p(fecha.getUTCMonth() + 1)}-${p(fecha.getUTCDate())}`
}
