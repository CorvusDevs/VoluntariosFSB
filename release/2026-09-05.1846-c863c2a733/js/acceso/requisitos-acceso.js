const NIVELES_DATOS = { ninguno: 0, operativo: 1, sensible: 2 }

export function requisitoDatosPersonales(nivelActual = 'ninguno', nivelRequerido = 'operativo') {
  const requerido = NIVELES_DATOS[nivelRequerido] ?? NIVELES_DATOS.operativo
  const actual = NIVELES_DATOS[nivelActual] ?? NIVELES_DATOS.ninguno
  const completo = nivelRequerido === 'sensible'
  return {
    id: `datos-personales:${nivelRequerido}`,
    tipo: 'datos_personales',
    titulo: completo ? 'Datos personales completos' : 'Datos personales básicos',
    descripcion: completo
      ? 'Habilita información protegida completa. Cada consulta y cada cambio quedan registrados.'
      : 'Habilita respuestas y datos cotidianos, sin abrir información sensible ni pagos.',
    cumplido: actual >= requerido,
    resolver: { tipo: 'datos_personales', nivel: nivelRequerido, usuario: 'yo' },
  }
}

export function requisitoPerfil(perfilActual = '', perfilRequerido = 'administracion') {
  const etiquetas = { administracion: 'Administración', direccion: 'Dirección' }
  return {
    id: `perfil:${perfilRequerido}`,
    tipo: 'perfil',
    titulo: `Perfil ${etiquetas[perfilRequerido] || perfilRequerido}`,
    descripcion: `Esta función requiere el perfil ${etiquetas[perfilRequerido] || perfilRequerido}.`,
    cumplido: perfilActual === perfilRequerido,
    resolver: { tipo: 'perfil', perfil: perfilRequerido, usuario: 'yo' },
  }
}

export function requisitoEquipo({ id = '', clave = '', nombre = 'Equipo', cumplido = false } = {}) {
  return {
    id: `equipo:${clave || id}`,
    tipo: 'equipo',
    titulo: `Pertenencia al equipo ${nombre}`,
    descripcion: `La persona debe estar asignada al equipo ${nombre}.`,
    cumplido: Boolean(cumplido),
    resolver: { tipo: 'equipo', equipo_id: id, equipo_clave: clave, usuario: 'yo' },
  }
}

export function normalizarRequisitos(requisitos = []) {
  if (!Array.isArray(requisitos)) return []
  return requisitos.filter((requisito) => requisito && requisito.id && requisito.titulo).map((requisito) => ({
    id: String(requisito.id),
    tipo: String(requisito.tipo || 'permiso'),
    titulo: String(requisito.titulo),
    descripcion: String(requisito.descripcion || ''),
    cumplido: Boolean(requisito.cumplido),
    resolver: requisito.resolver && typeof requisito.resolver === 'object' ? { ...requisito.resolver } : null,
  }))
}

export function contextoParaResolver(requisito, { seccion = '', regreso = '' } = {}) {
  if (!requisito?.resolver) return null
  return {
    resolucionAcceso: {
      requisito: normalizarRequisitos([requisito])[0],
      seccion: String(seccion || ''),
      regreso: String(regreso || ''),
    },
  }
}
