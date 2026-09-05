import { ordenarPorNombre, coincide } from '../util/nombres.js'

let contador = 0

function nuevoId(prefijo) {
  contador += 1
  const azar = Math.random().toString(36).slice(2, 8)
  return `${prefijo}_${Date.now().toString(36)}${contador.toString(36)}${azar}`
}

function validarNombre(nombre) {
  if (typeof nombre !== 'string' || nombre.trim() === '') {
    throw new Error('El nombre no puede estar vacío')
  }
  return nombre.trim()
}

function validarGrupo(grupo) {
  if (grupo !== 1 && grupo !== 2) {
    throw new Error(`Grupo inválido: ${grupo}. Solo se admiten 1 y 2.`)
  }
  return grupo
}

const TIPOS_CUOTA = new Set(['regular', 'beca', 'voluntariado', 'baja'])
const CONDICIONES_EQUIPO = new Set(['nuevo', 'usado'])

export function finanzasDePersona(datos = {}, { participante = true } = {}) {
  if (!participante) return { tipoCuota: 'voluntariado', becaPorcentaje: 0 }
  const origen = datos.finanzas ?? datos
  const tipoCuota = TIPOS_CUOTA.has(origen.tipoCuota) ? origen.tipoCuota : 'regular'
  const porcentaje = Number(origen.becaPorcentaje ?? 0)
  if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100) {
    throw new Error('El descuento de la beca debe estar entre 0% y 100%.')
  }
  if (tipoCuota === 'beca' && porcentaje <= 0) {
    throw new Error('Indicá el porcentaje de descuento de la beca.')
  }
  return { tipoCuota, becaPorcentaje: tipoCuota === 'beca' ? porcentaje : 0 }
}

export function equipoDePersona(datos = {}, { participante = true } = {}) {
  if (!participante) return { entregado: false, condicion: '', fecha: '', talle: '' }
  const origen = datos.equipo ?? datos
  const entregado = origen.entregado === true
  if (!entregado) return { entregado: false, condicion: '', fecha: '', talle: '' }
  const condicion = String(origen.condicion ?? '').trim().toLowerCase()
  const fecha = String(origen.fecha ?? '').trim()
  const talle = String(origen.talle ?? '').trim()
  if (!CONDICIONES_EQUIPO.has(condicion)) throw new Error('Elegí si el equipo entregado es nuevo o usado.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error('Indicá la fecha de entrega del equipo.')
  if (!talle) throw new Error('Indicá el talle del equipo entregado.')
  if (talle.length > 30) throw new Error('El talle no puede superar los 30 caracteres.')
  return { entregado, condicion, fecha, talle }
}

export function rosterVacio() {
  return { version: 1, participantes: [], voluntarios: [] }
}

export function agregarParticipante(roster, datos) {
  const participante = {
    id: nuevoId('p'),
    nombre: validarNombre(datos.nombre),
    grupo: validarGrupo(datos.grupo),
    nuevo: Boolean(datos.nuevo),
    foto: datos.foto ?? null,
    activo: true,
    notas: datos.notas ?? '',
    perfil: datos.perfil ?? {},
    finanzas: finanzasDePersona(datos),
    equipo: equipoDePersona(datos),
  }
  return { ...roster, participantes: [...roster.participantes, participante] }
}

export function agregarVoluntario(roster, datos) {
  const voluntario = {
    id: nuevoId('v'),
    nombre: validarNombre(datos.nombre),
    nuevo: Boolean(datos.nuevo),
    foto: datos.foto ?? null,
    activo: true,
    notas: datos.notas ?? '',
    perfil: datos.perfil ?? {},
    finanzas: finanzasDePersona(datos, { participante: false }),
  }
  return { ...roster, voluntarios: [...roster.voluntarios, voluntario] }
}

function mapear(roster, id, transformar) {
  let encontrada = false
  const aplicar = (gente) => gente.map((p) => {
    if (p.id !== id) return p
    encontrada = true
    return transformar(p)
  })
  const participantes = aplicar(roster.participantes)
  const voluntarios = aplicar(roster.voluntarios)
  if (!encontrada) throw new Error(`No existe la persona ${id}`)
  return { ...roster, participantes, voluntarios }
}

export function editarPersona(roster, id, cambios) {
  return mapear(roster, id, (p) => {
    const siguiente = { ...p, ...cambios, id: p.id }
    if ('nombre' in cambios) siguiente.nombre = validarNombre(cambios.nombre)
    if ('grupo' in cambios) siguiente.grupo = validarGrupo(cambios.grupo)
    if ('finanzas' in cambios) siguiente.finanzas = finanzasDePersona(cambios.finanzas, { participante: 'grupo' in p })
    if ('equipo' in cambios) siguiente.equipo = equipoDePersona(cambios.equipo, { participante: 'grupo' in p })
    return siguiente
  })
}

export function desactivarPersona(roster, id) {
  return mapear(roster, id, (p) => ({ ...p, activo: false }))
}

export function reactivarPersona(roster, id) {
  return mapear(roster, id, (p) => ({ ...p, activo: true }))
}

export function activos(gente) {
  return ordenarPorNombre(gente.filter((p) => p.activo))
}

export function buscarPersonas(gente, busqueda) {
  return ordenarPorNombre(gente.filter((p) => coincide(p.nombre, busqueda)))
}

const claveNombre = (nombre) => String(nombre ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()

export function posiblesDuplicados(roster) {
  const porNombre = new Map()
  ;[...(roster.participantes ?? []), ...(roster.voluntarios ?? [])]
    .filter((persona) => persona.activo !== false)
    .forEach((persona) => {
      const clave = claveNombre(persona.nombre)
      if (!clave) return
      porNombre.set(clave, [...(porNombre.get(clave) ?? []), persona])
    })
  return [...porNombre.values()].filter((personas) => personas.length > 1)
}

export function perfilesIncompletos(roster) {
  return [...(roster.participantes ?? []), ...(roster.voluntarios ?? [])]
    .filter((persona) => persona.activo !== false)
    .filter((persona) => {
      const perfil = persona.perfil ?? {}
      return !/^\d{4}-\d{2}-\d{2}$/.test(String(perfil.anioNacimiento ?? ''))
        || !/^\d{4}-\d{2}-\d{2}$/.test(String(perfil.desde ?? ''))
    })
}
