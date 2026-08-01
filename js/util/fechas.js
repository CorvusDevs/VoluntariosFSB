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
