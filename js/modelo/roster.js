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
