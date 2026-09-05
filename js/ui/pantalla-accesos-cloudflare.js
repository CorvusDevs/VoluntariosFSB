import { boton, elemento, icono, manejarTecladoDialogo, vaciar } from './componentes.js'
import { crearSelectorFecha } from './selector-fecha.js'
import { evitarCortesHora, fechaDesdeUTC } from '../util/fechas.js'
import { optimizarImagenParaWeb } from '../imagen/optimizar-web.js'
import {
  CAPACIDAD_CREAR_TAREAS, perfilAccesoInstitucional, permisoCrearTareasEfectivo, puedeCrearCartaMembretada, puedeGestionarPaginaWeb,
  puedeUsarComunicacionVisual, puedeVerMetricasPaginaWeb,
} from '../acceso/permisos-funciones.js'

const PERFILES = {
  administracion: ['Administración', 'Acceso completo, incluidos perfiles del programa y administración de accesos.'],
  direccion: ['Dirección', 'Visión institucional completa, sin acceder a perfiles ni fotos de participantes.'],
  coordinacion: ['Coordinación', 'Gestiona el CMS de los equipos que se le asignen, sin perfiles personales.'],
  integrante: ['Integrante', 'Ve su agenda, documentos compartidos y actualiza sus propias tareas.'],
  consulta: ['Consulta', 'Solo lectura de agenda y documentos compartidos.'],
}

const NIVELES_DATOS = {
  ninguno: ['Sin acceso a datos personales', 'Mantiene protegidas las respuestas, fotos internas, fichas y pagos.'],
  operativo: ['Datos personales básicos', 'Permite trabajar con información cotidiana sin abrir datos sensibles ni pagos.'],
  sensible: ['Datos personales completos', 'Permite trabajar con la ficha protegida completa. Cada acceso queda registrado.'],
}

const IMPACTO_NIVELES_DATOS = {
  ninguno: [
    ['bloqueado', 'Respuestas y entradas', 'No puede abrir respuestas de formularios ni entradas institucionales.'],
    ['bloqueado', 'Fotos y fichas', 'No puede ver fotos internas ni fichas protegidas.'],
    ['bloqueado', 'Finanzas y Privacidad', 'No puede consultar pagos ni gestionar solicitudes de privacidad.'],
  ],
  operativo: [
    ['habilitado', 'Tareas cotidianas', 'Puede abrir respuestas, entradas y las tareas o actividades relacionadas.'],
    ['habilitado', 'Fotos internas', 'Puede ver fotos autorizadas, pero no cambiarlas.'],
    ['bloqueado', 'Información sensible', 'No abre contactos, fecha de nacimiento, necesidades sensibles ni pagos.'],
  ],
  sensible: [
    ['habilitado', 'Datos personales completos', 'Incluye contactos, fecha de nacimiento, necesidades sensibles y cambio de fotos internas.'],
    ['adicional', 'Finanzas', 'Además necesita alcance institucional o pertenecer al equipo de Finanzas.'],
    ['adicional', 'Solicitudes de privacidad', 'Además necesita el perfil Administración.'],
  ],
}

const ESTADOS_PERMISO = {
  ver: ['Puede ver', 'vista'],
  editar: ['Puede editar', 'lapiz'],
  publicar: ['Puede publicar', 'verificar'],
  privado: ['Información privada', 'acceso'],
  administrar: ['Administrar accesos', 'ajustes'],
}

const hoyEnUruguay = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date())

function vigenciaDatosDe(usuario = {}) {
  if (!usuario.nivel_datos_personales || usuario.nivel_datos_personales === 'ninguno') return 'ninguna'
  if (usuario.vigencia_datos_personales === 'indefinida' || Number(usuario.datos_personales_sin_vencimiento) === 1) return 'indefinida'
  return 'temporal'
}

function textoVigenciaDatos(usuario = {}) {
  const vigencia = vigenciaDatosDe(usuario)
  if (vigencia === 'ninguna') return 'Sin acceso'
  if (vigencia === 'indefinida') return 'Sin vencimiento'
  return usuario.datos_personales_hasta
    ? `Hasta ${usuario.datos_personales_hasta.split('-').reverse().join('/')}`
    : 'Falta definir la fecha'
}

function textoVigenciaCuenta(usuario = {}) {
  return usuario.acceso_hasta
    ? `Cuenta activa hasta ${usuario.acceso_hasta.split('-').reverse().join('/')}`
    : 'Cuenta sin vencimiento'
}

export function resumenPermisosDe(usuario = {}, asignaciones = [], equipos = [], politicasTareas = []) {
  const perfil = perfilAccesoInstitucional(usuario)
  const nombresEquipos = [...new Set(asignaciones.map((asignacion) =>
    asignacion.equipo_nombre || equipos.find((equipo) => equipo.id === asignacion.equipo_id)?.nombre,
  ).filter(Boolean))]
  const alcance = ['administracion', 'direccion'].includes(perfil)
    ? 'Toda la institución'
    : nombresEquipos.length ? nombresEquipos.join(', ') : 'Sin equipos asignados'
  const datos = NIVELES_DATOS[usuario.nivel_datos_personales || 'ninguno'] || NIVELES_DATOS.ninguno
  const vigencia = textoVigenciaDatos(usuario)
  const puedePublicar = ['administracion', 'direccion'].includes(perfil)
  const puedeAdministrar = perfil === 'administracion'
  const trabajo = perfil === 'coordinacion' ? `Tareas de ${alcance}`
    : perfil === 'integrante' ? 'Sus tareas y documentos compartidos'
      : perfil === 'consulta' ? 'Agenda y documentos compartidos' : alcance
  const edicion = perfil === 'coordinacion' ? `Equipos asignados: ${alcance}`
    : perfil === 'integrante' ? 'Solo sus propias tareas' : perfil === 'consulta' ? 'No puede editar' : 'Toda la institución'
  const equiposAsignados = [...new Set(asignaciones.map((asignacion) => asignacion.equipo_id).filter(Boolean))]
  const permisosCrear = (equiposAsignados.length ? equiposAsignados : [null]).map((equipoId) => permisoCrearTareasEfectivo(usuario, equipoId, politicasTareas))
  const permisosPermitidos = permisosCrear.filter((permiso) => permiso.permitido)
  const puedeCrearTareas = permisosPermitidos.length > 0
  const origenCrearTareas = permisosPermitidos[0]?.fuente || permisosCrear[0]?.fuente || 'Predeterminado institucional'

  return {
    perfil,
    perfilNombre: PERFILES[perfil]?.[0] || 'Coordinación',
    alcance,
    origen: [
      `Incluido por perfil: ${PERFILES[perfil]?.[0] || 'Coordinación'}`,
      ['administracion', 'direccion'].includes(perfil) ? 'Alcance: todas las áreas' : `Limitado a: ${alcance}`,
      `Datos personales: ${datos[0]} · ${vigencia}`,
      `Creación de tareas: ${puedeCrearTareas ? 'habilitada' : 'bloqueada'} · ${origenCrearTareas}`,
    ],
    tarjetas: [
      { tipo: 'ver', texto: trabajo, activo: true },
      { tipo: 'editar', texto: edicion, activo: perfil !== 'consulta' },
      { tipo: 'publicar', texto: puedePublicar ? 'Página web de prueba' : 'No puede publicar', activo: puedePublicar },
      { tipo: 'privado', texto: `${datos[0]} · ${vigencia}`, activo: (usuario.nivel_datos_personales || 'ninguno') !== 'ninguno', sensible: true },
      { tipo: 'administrar', texto: puedeAdministrar ? 'Personas, perfiles y equipos' : 'No administra accesos', activo: puedeAdministrar },
    ],
    modulos: [
      ['Tareas institucionales', puedeCrearTareas ? 'Puede crear y editar según su alcance' : perfil === 'consulta' ? 'Solo consulta' : perfil === 'integrante' ? 'Edita lo propio, no crea' : 'Edita, no crea', `${alcance} · ${origenCrearTareas}`],
      ['Página web', puedeGestionarPaginaWeb(usuario) ? (puedePublicar ? 'Edita y publica' : 'Edita, no publica') : 'Sin acceso', puedeGestionarPaginaWeb(usuario) ? 'Contenido y borradores' : ''],
      ['Comunicación visual', puedeUsarComunicacionVisual(usuario) ? 'Edita' : 'Sin acceso', puedeCrearCartaMembretada(usuario) ? 'Incluye cartas membretadas' : 'Sin cartas membretadas'],
      ['Métricas de la página', puedeVerMetricasPaginaWeb(usuario) ? 'Puede ver' : 'Sin acceso', 'Datos agregados, sin respuestas personales'],
      ['Datos personales', (usuario.nivel_datos_personales || 'ninguno') === 'ninguno' ? 'Sin acceso' : datos[0], vigencia],
      ['Administración de accesos', puedeAdministrar ? 'Administra' : 'Sin acceso', puedeAdministrar ? 'Personas, perfiles, equipos y fotos internas' : ''],
    ],
  }
}

async function pedir(url, opciones = {}) {
  const respuesta = await fetch(url, {
    ...opciones,
    headers: { 'content-type': 'application/json', ...(opciones.headers ?? {}) },
  })
  const datos = await respuesta.json()
  if (!respuesta.ok) throw new Error(datos.error || 'No se pudo cambiar el acceso.')
  return datos
}

const PESO_MAXIMO_FOTO_ORIGINAL = 20 * 1024 * 1024
const PESO_MAXIMO_FOTO_GUARDADA = 500 * 1024

export async function prepararFotoPerfil(archivo, optimizarImagen = optimizarImagenParaWeb) {
  if (!archivo) return null
  if (archivo.size > PESO_MAXIMO_FOTO_ORIGINAL) throw new Error('La foto original supera 20 MB. Elegí una foto más liviana.')
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) throw new Error('Elegí una foto JPG, PNG o WebP.')
  const preparada = await optimizarImagen(archivo, {}, {
    ladoMaximo: 1200,
    pesoObjetivo: 450_000,
    calidadMinima: 0.66,
    intentosMaximos: 12,
  })
  if (!preparada?.blob || preparada.blob.size > PESO_MAXIMO_FOTO_GUARDADA) {
    throw new Error('No se pudo preparar la foto para guardarla de forma segura.')
  }
  return preparada
}

async function guardarFotoPerfil(correo, preparada) {
  if (!preparada) return null
  const respuesta = await fetch(`/api/usuarios/foto?correo=${encodeURIComponent(correo)}`, {
    method: 'PUT', headers: { 'content-type': preparada.tipo }, body: preparada.blob,
  })
  const datos = await respuesta.json()
  if (!respuesta.ok) throw new Error(datos.error || 'No se pudo guardar la foto de perfil.')
  return preparada
}

async function subirFotoPerfil(correo, archivo, optimizarImagen) {
  return guardarFotoPerfil(correo, await prepararFotoPerfil(archivo, optimizarImagen))
}

const iniciales = (nombre) => String(nombre || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase()

export function usuarioVisible(usuario) {
  const guardado = String(usuario?.correo || '').trim()
  if (!guardado || guardado.includes('@')) return guardado
  const sugerido = String(usuario?.nombre || '').match(/\p{L}+/gu)?.join('') || ''
  const comparable = (texto) => texto.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]/gi, '').toLowerCase()
  return sugerido && comparable(sugerido) === comparable(guardado) ? sugerido : guardado
}

function campoAcceso(rotulo, control) {
  const etiqueta = elemento('label', ['campo-acceso'])
  etiqueta.append(elemento('span', [], rotulo), control)
  return etiqueta
}

function campoArchivo(rotulo, entrada, textoBoton = 'Elegir foto') {
  entrada.classList.add('oculto-visualmente')
  const campo = elemento('div', ['campo-acceso'])
  const selector = elemento('div', ['selector-archivo'])
  const elegir = elemento('label', ['boton', 'selector-archivo-boton'], textoBoton)
  const nombre = elemento('span', ['selector-archivo-nombre'], 'Ningún archivo seleccionado')
  nombre.setAttribute('aria-live', 'polite')
  entrada.addEventListener('change', () => {
    nombre.textContent = entrada.files?.[0]?.name || 'Ningún archivo seleccionado'
  })
  elegir.appendChild(entrada)
  selector.append(elegir, nombre)
  campo.append(elemento('span', [], rotulo), selector)
  return campo
}

export function crearPantallaAccesosCloudflare(raiz, {
  sesion, optimizarImagen = optimizarImagenParaWeb, solicitudInicial = null, alCompletarSolicitud = () => {},
}) {
  let usuarios = []
  let equipos = []
  let responsabilidades = []
  let politicasTareas = []
  let error = ''
  let contrasenaNueva = null
  let cargando = true
  let texto = solicitudInicial?.requisito?.resolver?.usuario === 'yo' ? String(sesion?.correo || '') : ''
  let confirmacionQuitar = ''
  let filtroPerfil = 'todos'
  let filtroDatos = 'todos'
  let filtroVigencia = 'todos'
  let filtroEquipo = 'todos'

  function estadoAdopcion(usuario) {
    if (!usuario.ultimo_acceso) return { clave: 'sin-ingreso', texto: 'Todavía no ingresó', atencion: true }
    const ultimoAcceso = fechaDesdeUTC(usuario.ultimo_acceso).getTime()
    if (!Number.isFinite(ultimoAcceso)) return { clave: 'sin-ingreso', texto: 'Último acceso sin fecha válida', atencion: true }
    const dias = Math.max(0, Math.floor((Date.now() - ultimoAcceso) / 86400000))
    if (dias >= 7) return { clave: 'inactivo', texto: `Sin ingresar hace ${dias} días`, atencion: true }
    return { clave: 'activo', texto: 'Usa el gestor esta semana', atencion: false }
  }

  async function cargar() {
    cargando = true
    error = ''
    dibujar()
    try {
      const [accesos, datosEquipos, datosResponsabilidades, datosPermisosTareas] = await Promise.all([
        pedir('/api/usuarios'), pedir('/api/cms/equipos'), pedir('/api/cms/responsabilidades'), pedir('/api/cms/permisos-tareas'),
      ])
      usuarios = accesos.usuarios
      equipos = datosEquipos.equipos
      responsabilidades = datosResponsabilidades.responsabilidades
      politicasTareas = datosPermisosTareas.politicas || []
    } catch (fallo) {
      error = fallo.message
    } finally {
      cargando = false
      dibujar()
    }
  }

  function formulario() {
    const nombre = document.createElement('input')
    nombre.required = true
    nombre.placeholder = 'Nombre'
    const usuario = document.createElement('input')
    usuario.required = true
    usuario.placeholder = 'usuario'
    usuario.autocapitalize = 'none'
    usuario.autocorrect = 'off'
    const ayudaUsuario = elemento('p', ['ayuda-ajustes'], 'Podés escribir las iniciales con mayúsculas. Al ingresar, el usuario no distingue mayúsculas de minúsculas.')
    const fotoPerfil = document.createElement('input')
    fotoPerfil.type = 'file'
    fotoPerfil.accept = 'image/jpeg,image/png,image/webp'
    fotoPerfil.setAttribute('aria-label', 'Foto de perfil opcional')
    const ayudaFoto = elemento('p', ['ayuda-ajustes'], 'Foto opcional, JPG, PNG o WebP de hasta 20 MB. El gestor la adapta y reduce automáticamente antes de guardarla. Solo Administración puede verla o cambiarla.')
    const rol = document.createElement('select')
    Object.entries(PERFILES).forEach(([valor, [texto]]) => {
      const opcion = document.createElement('option')
      opcion.value = valor
      opcion.textContent = texto
      rol.appendChild(opcion)
    })
    rol.value = 'coordinacion'
    const ayudaPerfil = elemento('p', ['ayuda-ajustes'], PERFILES[rol.value][1])
    const selectorVenceCuenta = crearSelectorFecha({
      clave: 'nuevo-acceso-hasta',
      rotulo: 'Cuenta activa hasta',
      min: hoyEnUruguay(),
    })
    const duracionCuenta = document.createElement('fieldset')
    duracionCuenta.className = 'acceso-vigencia-opciones'
    duracionCuenta.appendChild(elemento('legend', [], 'Duración de la cuenta'))
    const modosCuenta = new Map()
    ;[
      ['indefinida', 'Sin vencimiento', 'Permanece activa hasta que Administración la quite.'],
      ['temporal', 'Hasta una fecha', 'Se cierra automáticamente al terminar la fecha elegida.'],
    ].forEach(([valor, etiqueta, descripcion]) => {
      const opcion = document.createElement('label')
      opcion.className = 'acceso-vigencia-opcion'
      const radio = document.createElement('input')
      radio.type = 'radio'; radio.name = 'vigencia-nueva-cuenta'; radio.value = valor
      const textos = elemento('span')
      textos.append(elemento('strong', [], etiqueta), elemento('small', [], descripcion))
      opcion.append(radio, textos)
      duracionCuenta.appendChild(opcion)
      modosCuenta.set(valor, radio)
    })
    modosCuenta.get('indefinida').checked = true
    const resumenDuracion = elemento('p', ['acceso-vigencia-resumen'])
    const actualizarDuracionCuenta = () => {
      const temporal = modosCuenta.get('temporal').checked
      selectorVenceCuenta.campo.hidden = !temporal
      selectorVenceCuenta.establecerActivo(temporal)
      if (!temporal) selectorVenceCuenta.fijarValor('')
      resumenDuracion.textContent = temporal
        ? 'La cuenta dejará de iniciar sesión al terminar esa fecha.'
        : 'La cuenta seguirá activa hasta que Administración la quite.'
    }
    modosCuenta.forEach((radio) => radio.addEventListener('change', actualizarDuracionCuenta))
    actualizarDuracionCuenta()
    const equiposAsignados = document.createElement('fieldset')
    equiposAsignados.className = 'equipos-asignados-acceso'
    equiposAsignados.appendChild(elemento('legend', [], 'Equipos asignados'))
    const ayudaEquipos = elemento('p', ['ayuda-ajustes'], 'Elegí uno o más equipos. Podés cambiar esta selección más adelante.')
    const opcionesEquipos = elemento('div', ['equipos-asignados-opciones'])
    const cantidadEquipos = elemento('span', ['equipos-asignados-cantidad'])
    cantidadEquipos.setAttribute('aria-live', 'polite')
    const actualizarCantidadEquipos = () => {
      const cantidad = opcionesEquipos.querySelectorAll('input:checked').length
      cantidadEquipos.textContent = cantidad === 1 ? '1 equipo seleccionado' : `${cantidad} equipos seleccionados`
    }
    const actualizarEquipos = () => {
      const requiereEquipo = ['coordinacion', 'integrante'].includes(rol.value)
      equiposAsignados.hidden = !requiereEquipo
    }
    equipos.forEach((equipo) => {
      const etiqueta = document.createElement('label')
      const casilla = document.createElement('input')
      casilla.type = 'checkbox'; casilla.value = equipo.id
      etiqueta.append(casilla, document.createTextNode(equipo.nombre))
      casilla.addEventListener('change', actualizarCantidadEquipos)
      opcionesEquipos.appendChild(etiqueta)
    })
    equiposAsignados.append(ayudaEquipos, opcionesEquipos, cantidadEquipos)
    actualizarCantidadEquipos()
    rol.addEventListener('change', () => { ayudaPerfil.textContent = PERFILES[rol.value][1]; actualizarEquipos() })
    actualizarEquipos()
    const enviar = boton('Dar acceso', async () => {
      enviar.disabled = true
      try {
        const original = fotoPerfil.files?.[0]
        if (original) enviar.textContent = 'Preparando foto...'
        const preparada = await prepararFotoPerfil(original, optimizarImagen)
        enviar.textContent = 'Guardando acceso...'
        const creada = await pedir('/api/usuarios', {
          method: 'POST', body: JSON.stringify({ nombre: nombre.value, usuario: usuario.value, perfil_acceso: rol.value,
            equipos: [...equiposAsignados.querySelectorAll('input:checked')].map((casilla) => casilla.value),
            vigencia_acceso: modosCuenta.get('temporal').checked ? 'temporal' : 'indefinida',
            acceso_hasta: selectorVenceCuenta.entrada.value }),
        })
        await guardarFotoPerfil(creada.correo, preparada)
        contrasenaNueva = creada
        await cargar()
      } catch (fallo) {
        error = fallo.message
        dibujar()
      }
    }, ['boton', 'boton-principal'])
    enviar.type = 'submit'
    const forma = document.createElement('form')
    forma.className = 'formulario-agregar'
    forma.append(campoAcceso('Nombre completo', nombre), campoAcceso('Usuario', usuario), ayudaUsuario, campoArchivo('Foto de perfil', fotoPerfil), ayudaFoto, campoAcceso('Perfil de acceso', rol), ayudaPerfil, duracionCuenta, selectorVenceCuenta.campo, resumenDuracion, equiposAsignados, enviar)
    forma.addEventListener('submit', (evento) => {
      evento.preventDefault()
      if (['coordinacion', 'integrante'].includes(rol.value) && !equiposAsignados.querySelector('input:checked')) {
        error = 'Elegí al menos un equipo para este perfil.'
        dibujar()
        return
      }
      enviar.click()
    })
    return forma
  }

  function abrirVistaPermisos(usuario, asignaciones, activador) {
    const permisos = resumenPermisosDe(usuario, asignaciones, equipos, politicasTareas)
    const pantalla = raiz.querySelector('.ajustes')
    const superposicion = elemento('section', ['vista-permisos-superposicion'])
    superposicion.setAttribute('role', 'dialog')
    superposicion.setAttribute('aria-modal', 'true')
    superposicion.setAttribute('aria-label', `Vista de permisos de ${usuario.nombre}`)
    superposicion.tabIndex = -1
    const panel = elemento('article', ['vista-permisos-panel'])
    const cabecera = elemento('header', ['vista-permisos-cabecera'])
    const textoCabecera = elemento('div')
    textoCabecera.append(
      elemento('span', ['sobrelinea'], 'VISTA EXPLICATIVA'),
      elemento('h2', [], `Así verá el gestor ${usuario.nombre}`),
      elemento('p', ['ayuda-ajustes'], 'Esta vista resume las reglas actuales. No inicia sesión como la persona ni modifica su acceso.'),
    )
    const cerrarVista = () => {
      superposicion.remove()
      pantalla?.removeAttribute('inert')
      activador?.focus()
    }
    const cerrar = boton('Cerrar', cerrarVista)
    cerrar.setAttribute('aria-label', 'Cerrar vista de permisos')
    cabecera.append(textoCabecera, cerrar)

    const contexto = elemento('div', ['vista-permisos-contexto'])
    permisos.origen.forEach((origen, indice) => contexto.appendChild(elemento('span', ['permiso-origen', indice === 2 ? 'permiso-origen-privado' : ''], origen)))
    const lista = elemento('div', ['vista-permisos-modulos'])
    permisos.modulos.forEach(([nombre, estado, detalle]) => {
      const fila = elemento('div', ['vista-permisos-modulo', estado === 'Sin acceso' ? 'sin-acceso' : ''])
      const identidad = elemento('div')
      identidad.append(elemento('strong', [], nombre), detalle ? elemento('span', [], detalle) : elemento('span'))
      fila.append(identidad, elemento('span', ['vista-permisos-estado'], estado))
      lista.appendChild(fila)
    })
    const aviso = elemento('aside', ['vista-permisos-aviso'])
    aviso.append(icono('acceso'), elemento('p', [], 'Los datos personales se habilitan aparte. Podés elegir una fecha de vencimiento o mantener el acceso activo hasta que Administración lo cambie. Cada cambio queda registrado.'))
    panel.append(cabecera, contexto, lista, aviso)
    superposicion.appendChild(panel)
    superposicion.addEventListener('click', (evento) => { if (evento.target === superposicion) cerrarVista() })
    superposicion.addEventListener('keydown', (evento) => manejarTecladoDialogo(evento, superposicion, cerrarVista))
    pantalla?.setAttribute('inert', '')
    raiz.appendChild(superposicion)
    superposicion.focus()
  }

  function crearResumenVisual(usuario, asignaciones) {
    const permisos = resumenPermisosDe(usuario, asignaciones, equipos, politicasTareas)
    const bloque = elemento('section', ['resumen-permisos-persona'])
    bloque.setAttribute('aria-label', `Resumen de permisos de ${usuario.nombre}`)
    const origen = elemento('div', ['permisos-origenes'])
    permisos.origen.forEach((textoOrigen, indice) => origen.appendChild(elemento('span', ['permiso-origen', indice === 2 ? 'permiso-origen-privado' : ''], textoOrigen)))
    const tarjetas = elemento('div', ['permisos-tarjetas'])
    permisos.tarjetas.forEach((permiso) => {
      const [etiqueta, nombreIcono] = ESTADOS_PERMISO[permiso.tipo]
      const tarjeta = elemento('div', ['permiso-tarjeta', permiso.activo ? 'activo' : 'inactivo', permiso.sensible ? 'sensible' : ''])
      const titulo = elemento('div', ['permiso-tarjeta-titulo'])
      titulo.append(icono(nombreIcono), elemento('span', [], etiqueta))
      tarjeta.append(titulo, elemento('strong', [], permiso.texto))
      tarjetas.appendChild(tarjeta)
    })
    const ver = boton(`Ver el gestor como ${usuario.nombre}`, () => abrirVistaPermisos(usuario, asignaciones, ver), ['boton', 'ver-permisos-persona'])
    ver.setAttribute('aria-haspopup', 'dialog')
    bloque.append(origen, tarjetas, ver)
    return bloque
  }

  const reglaTareasActual = (alcanceTipo, alcanceId) => politicasTareas.find((regla) =>
    regla.capacidad === CAPACIDAD_CREAR_TAREAS && regla.alcance_tipo === alcanceTipo
      && String(regla.alcance_id).toLowerCase() === String(alcanceId).toLowerCase())?.efecto || 'heredar'

  function editorReglaTareas({ alcanceTipo, alcanceId, nombre, ayuda }) {
    const fila = elemento('div', ['permiso-tareas-fila'])
    const identidad = elemento('div', ['permiso-tareas-identidad'])
    identidad.append(elemento('strong', [], nombre), elemento('span', ['ayuda-ajustes'], ayuda))
    const selector = document.createElement('select')
    selector.setAttribute('aria-label', `Creación de tareas para ${nombre}`)
    ;[['heredar', 'Usar regla heredada'], ['permitir', 'Permitir crear tareas'], ['bloquear', 'Bloquear creación']].forEach(([valor, etiqueta]) => selector.appendChild(new Option(etiqueta, valor)))
    selector.value = reglaTareasActual(alcanceTipo, alcanceId)
    const guardar = boton('Guardar', async () => {
      guardar.disabled = true
      try {
        await pedir('/api/cms/permisos-tareas', { method: 'PUT', body: JSON.stringify({ alcance_tipo: alcanceTipo, alcance_id: alcanceId, efecto: selector.value }) })
        await cargar()
      } catch (fallo) { error = fallo.message; dibujar() }
    }, ['boton', 'boton-secundario'])
    fila.append(identidad, selector, guardar)
    return fila
  }

  function panelPermisosTareas() {
    const panel = document.createElement('details')
    panel.className = 'permisos-tareas-panel'
    panel.appendChild(elemento('summary', [], 'Quién puede crear tareas'))
    panel.append(
      elemento('p', ['ayuda-ajustes'], 'Por defecto solo Administración puede crear tareas. Una excepción individual prevalece sobre el equipo, y el equipo prevalece sobre el perfil. Quien no tenga permiso puede enviar una solicitud.'),
      elemento('h3', [], 'Reglas por perfil'),
    )
    const perfiles = elemento('div', ['permisos-tareas-lista'])
    Object.entries(PERFILES).forEach(([clave, [nombre]]) => perfiles.appendChild(editorReglaTareas({
      alcanceTipo: 'perfil', alcanceId: clave, nombre,
      ayuda: clave === 'administracion' ? 'Predeterminado: permitido' : 'Predeterminado: bloqueado',
    })))
    panel.appendChild(perfiles)
    panel.appendChild(elemento('h3', [], 'Reglas por equipo'))
    const grupos = elemento('div', ['permisos-tareas-lista'])
    equipos.forEach((equipo) => grupos.appendChild(editorReglaTareas({
      alcanceTipo: 'equipo', alcanceId: equipo.id, nombre: equipo.nombre,
      ayuda: 'Se aplica a las personas asignadas a este equipo, salvo excepción individual.',
    })))
    if (!equipos.length) grupos.appendChild(elemento('p', ['ayuda-ajustes'], 'Todavía no hay equipos activos.'))
    panel.appendChild(grupos)
    return panel
  }

  function dibujar() {
    vaciar(raiz)
    const caja = elemento('section', ['ajustes'])
    caja.appendChild(elemento('h1', [], 'Accesos'))
    caja.appendChild(elemento('p', ['ayuda-ajustes'],
      'Cada persona recibe un usuario y una contraseña generada. La aplicación solo guarda un derivado seguro de esa contraseña.'))
    if (solicitudInicial?.requisito) {
      const guia = elemento('aside', ['acceso-resolucion-contextual'])
      guia.append(
        elemento('span', ['acceso-resolucion-etiqueta'], solicitudInicial.seccion ? `Volver a ${solicitudInicial.seccion}` : 'Acceso solicitado'),
        elemento('strong', [], `Completá: ${solicitudInicial.requisito.titulo}`),
        elemento('p', [], 'Abrimos la cuenta y el control correctos. Revisá la duración y confirmá el cambio. Nada se concede automáticamente.'),
      )
      caja.appendChild(guia)
    }
    if (error) caja.appendChild(elemento('p', ['error-ajustes'], error))
    if (contrasenaNueva) {
      caja.append(
        elemento('p', ['aviso-admin'], `Contraseña inicial de ${contrasenaNueva.nombre}: ${contrasenaNueva.contrasena}`),
        elemento('p', ['ayuda-ajustes'], 'Entregala ahora. No se vuelve a mostrar después de salir de esta pantalla.'),
      )
    }
    if (cargando) {
      caja.appendChild(elemento('p', ['ayuda-ajustes'], 'Cargando accesos...'))
      raiz.appendChild(caja)
      return
    }
    const buscar = document.createElement('input')
    buscar.type = 'search'; buscar.placeholder = 'Buscar acceso'; buscar.value = texto
    buscar.setAttribute('aria-label', 'Buscar acceso')
    buscar.addEventListener('input', () => { texto = buscar.value; dibujar() })
    caja.appendChild(buscar)
    const filtros = elemento('div', ['accesos-filtros'])
    const selectorFiltro = (rotulo, opciones, valor, alCambiar) => {
      const control = document.createElement('select')
      control.setAttribute('aria-label', rotulo)
      opciones.forEach(([clave, etiqueta]) => control.appendChild(new Option(etiqueta, clave)))
      control.value = valor
      control.addEventListener('change', () => alCambiar(control.value))
      return campoAcceso(rotulo, control)
    }
    filtros.append(
      selectorFiltro('Filtrar por perfil', [['todos', 'Todos los perfiles'], ...Object.entries(PERFILES).map(([clave, [etiqueta]]) => [clave, etiqueta])], filtroPerfil, (valor) => { filtroPerfil = valor; dibujar() }),
      selectorFiltro('Filtrar por datos personales', [['todos', 'Todos los niveles'], ...Object.entries(NIVELES_DATOS).map(([clave, [etiqueta]]) => [clave, etiqueta])], filtroDatos, (valor) => { filtroDatos = valor; dibujar() }),
      selectorFiltro('Filtrar por vencimiento', [['todos', 'Cualquier vigencia'], ['temporal', 'Con vencimiento'], ['indefinida', 'Sin vencimiento']], filtroVigencia, (valor) => { filtroVigencia = valor; dibujar() }),
      selectorFiltro('Filtrar por equipo', [['todos', 'Todos los equipos'], ...equipos.map((equipo) => [equipo.id, equipo.nombre])], filtroEquipo, (valor) => { filtroEquipo = valor; dibujar() }),
    )
    caja.appendChild(filtros)
    const resumen = elemento('div', ['resumen-accesos'])
    const nuncaIngresaron = usuarios.filter((usuario) => !usuario.ultimo_acceso).length
    const necesitanAcompanamiento = usuarios.filter((usuario) => estadoAdopcion(usuario).atencion).length
    const conDatos = usuarios.filter((usuario) => usuario.nivel_datos_personales && usuario.nivel_datos_personales !== 'ninguno').length
    ;[[usuarios.length, 'cuentas activas'], [nuncaIngresaron, 'sin primer ingreso'], [necesitanAcompanamiento, 'necesitan acompañamiento'], [conDatos, 'con acceso a datos personales']].forEach(([cantidad, etiqueta]) => {
      const item = elemento('div', ['resumen-acceso'])
      item.append(elemento('strong', [], String(cantidad)), elemento('span', [], etiqueta))
      resumen.appendChild(item)
    })
    caja.appendChild(resumen)
    caja.appendChild(panelPermisosTareas())
    const usuariosVisibles = usuarios.filter((usuario) => {
      const coincideTexto = `${usuario.nombre} ${usuario.correo} ${usuarioVisible(usuario)}`.toLocaleLowerCase('es').includes(texto.toLocaleLowerCase('es'))
      const coincidePerfil = filtroPerfil === 'todos' || perfilAccesoInstitucional(usuario) === filtroPerfil
      const coincideDatos = filtroDatos === 'todos' || (usuario.nivel_datos_personales || 'ninguno') === filtroDatos
      const coincideVigencia = filtroVigencia === 'todos' || (usuario.acceso_hasta ? 'temporal' : 'indefinida') === filtroVigencia
      const coincideEquipo = filtroEquipo === 'todos' || responsabilidades.some((asignacion) => asignacion.usuario_correo === usuario.correo && asignacion.equipo_id === filtroEquipo)
      return coincideTexto && coincidePerfil && coincideDatos && coincideVigencia && coincideEquipo
    })
    const resultados = elemento('p', ['accesos-resultados'], `${usuariosVisibles.length} de ${usuarios.length} cuentas`)
    resultados.setAttribute('role', 'status')
    resultados.setAttribute('aria-live', 'polite')
    caja.appendChild(resultados)
    const lista = elemento('div', ['lista-personas'])
    usuariosVisibles.forEach((usuario) => {
      const fila = document.createElement('details')
      fila.className = 'persona-fila'
      fila.classList.add('acceso-fila')
      const identidad = elemento('summary', ['acceso-identidad'])
      const avatar = elemento('span', ['acceso-avatar'], iniciales(usuario.nombre))
      if (usuario.foto_perfil) {
        const imagen = document.createElement('img')
        imagen.src = `/api/usuarios/foto?correo=${encodeURIComponent(usuario.correo)}`
        imagen.alt = `Foto de perfil de ${usuario.nombre}`
        avatar.replaceChildren(imagen)
      }
      identidad.appendChild(avatar)
      const datosIdentidad = elemento('div', ['acceso-identidad-texto'])
      const adopcion = estadoAdopcion(usuario)
      datosIdentidad.append(
        elemento('strong', [], usuario.nombre),
        elemento('span', ['ayuda-ajustes'], `${usuarioVisible(usuario)} · ${PERFILES[usuario.perfil_acceso]?.[0] ?? 'Coordinación'} · ${textoVigenciaCuenta(usuario)} · ${NIVELES_DATOS[usuario.nivel_datos_personales]?.[0] ?? 'Sin acceso a datos personales'} · ${usuario.ultimo_acceso ? `Último acceso: ${evitarCortesHora(new Intl.DateTimeFormat('es-UY', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Montevideo' }).format(fechaDesdeUTC(usuario.ultimo_acceso)))}` : 'Aún no ingresó'}`),
        elemento('span', ['estado-adopcion', `estado-adopcion-${adopcion.clave}`], adopcion.texto),
      )
      identidad.appendChild(datosIdentidad)
      fila.append(
        identidad,
      )
      const solicitudDeUsuario = solicitudInicial?.requisito?.resolver?.usuario === 'yo'
        ? usuario.correo === sesion?.correo
        : solicitudInicial?.requisito?.resolver?.usuario === usuario.correo
      fila.open = Boolean(solicitudDeUsuario || (texto.trim() && usuariosVisibles.length === 1))
      const asignaciones = responsabilidades.filter((asignacion) => asignacion.usuario_correo === usuario.correo)
      fila.appendChild(crearResumenVisual(usuario, asignaciones))
      const permisoTareasPersona = document.createElement('details')
      permisoTareasPersona.className = 'permisos-editar permiso-tareas-persona'
      permisoTareasPersona.appendChild(elemento('summary', [], 'Creación de tareas'))
      const equiposPersona = [...new Set(asignaciones.map((asignacion) => asignacion.equipo_id).filter(Boolean))]
      const resultadosTareas = (equiposPersona.length ? equiposPersona : [null]).map((equipoId) => ({
        equipoId, resultado: permisoCrearTareasEfectivo(usuario, equipoId, politicasTareas),
      }))
      const permitidosTareas = resultadosTareas.filter(({ resultado }) => resultado.permitido)
      permisoTareasPersona.appendChild(elemento('p', ['ayuda-ajustes'], permitidosTareas.length
        ? `Permiso efectivo: puede crear${permitidosTareas[0].equipoId ? ` en ${permitidosTareas.map(({ equipoId }) => equipos.find((equipo) => equipo.id === equipoId)?.nombre).filter(Boolean).join(', ')}` : ''}. Fuente: ${permitidosTareas[0].resultado.fuente}.`
        : `Permiso efectivo: no puede crear tareas. Fuente: ${resultadosTareas[0]?.resultado.fuente || 'Predeterminado institucional'}. Puede enviar solicitudes.`))
      permisoTareasPersona.appendChild(editorReglaTareas({
        alcanceTipo: 'usuario', alcanceId: usuario.correo, nombre: usuario.nombre,
        ayuda: 'La excepción individual tiene prioridad sobre las reglas de perfil y equipo.',
      }))
      fila.appendChild(permisoTareasPersona)
      const perfilUsuario = perfilAccesoInstitucional(usuario)
      const equipoFinanzas = equipos.find((equipo) => equipo.clave === 'finanzas' || equipo.nombre?.toLocaleLowerCase('es') === 'finanzas')
      const perteneceAFinanzas = Boolean(equipoFinanzas && asignaciones.some((asignacion) => asignacion.equipo_id === equipoFinanzas.id))
      const finanzasCumplido = ['administracion', 'direccion'].includes(perfilUsuario) || perteneceAFinanzas
      const privacidadCumplida = perfilUsuario === 'administracion'
      let detallePerfilAcceso = null
      let selectorPerfilAcceso = null
      let detalleEquiposAcceso = null
      let selectorEquipoFinanzas = null
      const mensajeRequisito = elemento('p', ['acceso-requisito-mensaje'])
      const datosPersonales = document.createElement('details')
      datosPersonales.className = 'permisos-editar'
      datosPersonales.appendChild(elemento('summary', [], 'Datos personales'))
      const nivel = document.createElement('select')
      nivel.setAttribute('aria-label', `Nivel de datos personales de ${usuario.nombre}`)
      Object.entries(NIVELES_DATOS).forEach(([valor, [etiqueta]]) => {
        const opcion = document.createElement('option'); opcion.value = valor; opcion.textContent = etiqueta; nivel.appendChild(opcion)
      })
      nivel.value = usuario.nivel_datos_personales || 'ninguno'
      const solicitudDeEstaPersona = solicitudInicial?.requisito?.resolver?.usuario === 'yo'
        ? usuario.correo === sesion?.correo
        : solicitudInicial?.requisito?.resolver?.usuario === usuario.correo
      const resolucionSolicitada = solicitudDeEstaPersona ? solicitudInicial?.requisito?.resolver : null
      if (resolucionSolicitada?.tipo === 'datos_personales' && NIVELES_DATOS[resolucionSolicitada.nivel]) {
        nivel.value = resolucionSolicitada.nivel
        datosPersonales.open = true
        datosPersonales.dataset.resolucionActiva = solicitudInicial.requisito.id
      }
      const selectorVence = crearSelectorFecha({ clave: `acceso-vigencia-${usuario.correo}`, rotulo: 'Vigente hasta', valor: usuario.datos_personales_hasta || '' })
      const vence = selectorVence.entrada
      const vigencia = document.createElement('fieldset')
      vigencia.className = 'acceso-vigencia-opciones'
      vigencia.appendChild(elemento('legend', [], 'Duración'))
      const nombreVigencia = `vigencia-datos-${usuario.correo}`
      const opcionesVigencia = [
        ['temporal', 'Hasta una fecha', 'Se desactiva automáticamente en la fecha elegida.'],
        ['indefinida', 'Sin vencimiento', 'Permanece activo hasta que Administración lo cambie.'],
      ]
      const radiosVigencia = new Map()
      opcionesVigencia.forEach(([valor, etiqueta, descripcion]) => {
        const opcion = document.createElement('label')
        opcion.className = 'acceso-vigencia-opcion'
        const radio = document.createElement('input')
        radio.type = 'radio'; radio.name = nombreVigencia; radio.value = valor
        const textos = elemento('span')
        textos.append(elemento('strong', [], etiqueta), elemento('small', [], descripcion))
        opcion.append(radio, textos)
        vigencia.appendChild(opcion)
        radiosVigencia.set(valor, radio)
      })
      const vigenciaInicial = vigenciaDatosDe(usuario) === 'indefinida' ? 'indefinida' : 'temporal'
      radiosVigencia.get(vigenciaInicial).checked = true
      const ayudaDatos = elemento('p', ['ayuda-ajustes'], NIVELES_DATOS[nivel.value][1])
      const impactoDatos = elemento('section', ['acceso-datos-impacto'])
      impactoDatos.setAttribute('aria-live', 'polite')
      const prepararRequisito = (requisito) => {
        if (requisito === 'finanzas' && selectorEquipoFinanzas) {
          detalleEquiposAcceso.open = true
          selectorEquipoFinanzas.checked = true
          selectorEquipoFinanzas.dispatchEvent(new Event('change'))
          selectorEquipoFinanzas.focus()
          mensajeRequisito.textContent = 'Finanzas quedó marcado. Revisá la función y pulsá Guardar equipos para completar el requisito.'
        } else if (selectorPerfilAcceso) {
          detallePerfilAcceso.open = true
          selectorPerfilAcceso.value = requisito === 'privacidad' ? 'administracion' : 'direccion'
          selectorPerfilAcceso.dispatchEvent(new Event('change'))
          selectorPerfilAcceso.focus()
          mensajeRequisito.textContent = requisito === 'privacidad'
            ? 'Administración quedó seleccionada. Pulsá Guardar perfil para completar el requisito.'
            : 'Dirección quedó seleccionada para dar alcance institucional. Pulsá Guardar perfil para completar el requisito.'
        }
      }
      const dibujarImpactoDatos = () => {
        impactoDatos.replaceChildren(
          elemento('h4', [], '¿Qué cambia con este nivel?'),
          elemento('p', ['ayuda-ajustes'], 'Este permiso se combina con el perfil y los equipos de la persona. No reemplaza esos requisitos.'),
        )
        const listaImpacto = elemento('div', ['acceso-datos-impacto-lista'])
        IMPACTO_NIVELES_DATOS[nivel.value].forEach(([estadoOriginal, titulo, descripcion]) => {
          const requisito = titulo === 'Finanzas' ? 'finanzas' : titulo === 'Solicitudes de privacidad' ? 'privacidad' : ''
          const cumplido = requisito === 'finanzas' ? finanzasCumplido : requisito === 'privacidad' ? privacidadCumplida : false
          const estado = estadoOriginal === 'adicional' ? (cumplido ? 'cumplido' : 'pendiente') : estadoOriginal
          const descripcionEstado = cumplido && requisito === 'finanzas'
            ? perteneceAFinanzas ? 'Cumplido por pertenecer al equipo de Finanzas.' : `Cumplido por el perfil ${PERFILES[perfilUsuario][0]}, con alcance institucional.`
            : cumplido && requisito === 'privacidad'
              ? 'Cumplido por el perfil Administración.'
              : descripcion
          const item = elemento('article', ['acceso-datos-impacto-item', `es-${estado}`])
          const etiqueta = estado === 'habilitado' ? 'Incluido' : estado === 'cumplido' ? 'Cumplido' : estado === 'pendiente' ? 'Falta completar' : 'No incluido'
          item.append(elemento('span', ['acceso-datos-impacto-estado'], etiqueta), elemento('strong', [], titulo), elemento('p', [], descripcionEstado))
          if (estado === 'pendiente') {
            const accion = requisito === 'finanzas' && equipoFinanzas ? 'Asignar a Finanzas' : requisito === 'privacidad' ? 'Elegir Administración' : 'Dar alcance institucional'
            item.appendChild(boton(accion, () => prepararRequisito(requisito), ['boton', 'boton-secundario', 'acceso-requisito-accion']))
          }
          listaImpacto.appendChild(item)
        })
        impactoDatos.append(listaImpacto, mensajeRequisito)
      }
      const estadoVigencia = elemento('p', ['acceso-vigencia-resumen'])
      const actualizarDatos = () => {
        const habilitado = nivel.value !== 'ninguno'
        const modo = [...radiosVigencia.values()].find((radio) => radio.checked)?.value || 'temporal'
        ayudaDatos.textContent = NIVELES_DATOS[nivel.value][1]
        dibujarImpactoDatos()
        vigencia.disabled = !habilitado
        selectorVence.establecerActivo(habilitado && modo === 'temporal')
        selectorVence.campo.hidden = !habilitado || modo !== 'temporal'
        if (!habilitado || modo === 'indefinida') selectorVence.fijarValor('')
        estadoVigencia.textContent = !habilitado
          ? 'Esta persona no puede consultar datos personales.'
          : modo === 'indefinida'
            ? 'Quedará activo sin fecha final. Administración podrá revocarlo en cualquier momento.'
            : 'Se desactivará automáticamente al terminar la fecha elegida.'
      }
      nivel.addEventListener('change', actualizarDatos)
      radiosVigencia.forEach((radio) => radio.addEventListener('change', actualizarDatos))
      actualizarDatos()
      const guardarDatos = boton(resolucionSolicitada?.tipo === 'datos_personales' ? 'Activar acceso y volver' : 'Guardar acceso a datos', async () => {
        try {
          const modo = nivel.value === 'ninguno' ? 'ninguna' : [...radiosVigencia.values()].find((radio) => radio.checked)?.value
          await pedir('/api/usuarios', { method: 'PATCH', body: JSON.stringify({ correo: usuario.correo, perfil_acceso: usuario.perfil_acceso, nivel_datos_personales: nivel.value, vigencia_datos_personales: modo, datos_personales_hasta: vence.value }) })
          if (resolucionSolicitada?.tipo === 'datos_personales') alCompletarSolicitud(solicitudInicial?.regreso)
          else await cargar()
        } catch (fallo) { error = fallo.message; dibujar() }
      })
      guardarDatos.dataset.accionResolucionAcceso = resolucionSolicitada?.tipo || ''
      datosPersonales.append(nivel, ayudaDatos, impactoDatos, vigencia, selectorVence.campo, estadoVigencia, guardarDatos)
      fila.appendChild(datosPersonales)
      const foto = document.createElement('details')
      foto.className = 'permisos-editar'
      foto.appendChild(elemento('summary', [], 'Foto de perfil'))
      foto.appendChild(elemento('p', ['ayuda-ajustes'], usuario.foto_perfil ? 'Esta foto se ve solo dentro de Administración. Si la cambiás, el gestor optimiza la nueva automáticamente.' : 'Todavía no tiene foto de perfil. Podés elegir una foto de hasta 20 MB y el gestor la optimizará.'))
      const archivoFoto = document.createElement('input')
      archivoFoto.type = 'file'; archivoFoto.accept = 'image/jpeg,image/png,image/webp'
      archivoFoto.setAttribute('aria-label', `Cambiar foto de perfil de ${usuario.nombre}`)
      foto.append(campoArchivo('Archivo de imagen', archivoFoto), boton(usuario.foto_perfil ? 'Cambiar foto' : 'Agregar foto', async () => {
        try { await subirFotoPerfil(usuario.correo, archivoFoto.files?.[0], optimizarImagen); await cargar() } catch (fallo) { error = fallo.message; dibujar() }
      }))
      if (usuario.foto_perfil) foto.appendChild(boton('Quitar foto', async () => {
        try {
          const respuesta = await fetch(`/api/usuarios/foto?correo=${encodeURIComponent(usuario.correo)}`, { method: 'DELETE' })
          const datos = await respuesta.json()
          if (!respuesta.ok) throw new Error(datos.error || 'No se pudo quitar la foto de perfil.')
          await cargar()
        } catch (fallo) { error = fallo.message; dibujar() }
      }, ['boton-secundario']))
      fila.appendChild(foto)
      if (usuario.correo !== sesion.correo) {
        const acceso = document.createElement('details')
        detallePerfilAcceso = acceso
        acceso.className = 'permisos-editar'
        acceso.appendChild(elemento('summary', [], 'Perfil de acceso'))
        const perfil = document.createElement('select')
        perfil.setAttribute('aria-label', `Perfil de acceso de ${usuario.nombre}`)
        Object.entries(PERFILES).forEach(([valor, [etiqueta]]) => {
          const opcion = document.createElement('option'); opcion.value = valor; opcion.textContent = etiqueta; perfil.appendChild(opcion)
        })
        perfil.value = usuario.perfil_acceso || (usuario.rol === 'admin' ? 'administracion' : 'coordinacion')
        selectorPerfilAcceso = perfil
        const ayuda = elemento('p', ['ayuda-ajustes'], PERFILES[perfil.value][1])
        perfil.addEventListener('change', () => { ayuda.textContent = PERFILES[perfil.value][1] })
        const guardar = boton('Guardar perfil', async () => {
          try {
            await pedir('/api/usuarios', { method: 'PATCH', body: JSON.stringify({ correo: usuario.correo, perfil_acceso: perfil.value, nivel_datos_personales: usuario.nivel_datos_personales || 'ninguno', vigencia_datos_personales: vigenciaDatosDe(usuario), datos_personales_hasta: usuario.datos_personales_hasta || '' }) })
            await cargar()
          } catch (fallo) { error = fallo.message; dibujar() }
        })
        acceso.append(perfil, ayuda, guardar)
        fila.appendChild(acceso)
      }
      const equiposAcceso = document.createElement('details')
      detalleEquiposAcceso = equiposAcceso
      equiposAcceso.className = 'permisos-editar'
      equiposAcceso.appendChild(elemento('summary', [], `Equipos asignados (${new Set(asignaciones.map((asignacion) => asignacion.equipo_id)).size})`))
      equiposAcceso.appendChild(elemento('p', ['ayuda-ajustes'], 'Marcá los equipos en los que participa esta persona y elegí su función en cada uno.'))
      if (!equipos.length) {
        equiposAcceso.appendChild(elemento('p', ['aviso-admin'], 'Todavía no hay equipos disponibles. Creá uno desde Áreas para poder asignar personas.'))
      } else {
        const editorEquipos = elemento('fieldset', ['editor-equipos-usuario'])
        editorEquipos.appendChild(elemento('legend', [], `Equipos de ${usuario.nombre}`))
        equipos.forEach((equipo) => {
          const actual = asignaciones.find((asignacion) => asignacion.equipo_id === equipo.id)
          const filaEquipo = elemento('div', ['editor-equipo-usuario'])
          const etiqueta = document.createElement('label')
          const casilla = document.createElement('input')
          casilla.type = 'checkbox'; casilla.value = equipo.id; casilla.checked = Boolean(actual)
          const equipoSolicitado = resolucionSolicitada?.tipo === 'equipo'
            && (resolucionSolicitada.equipo_id === equipo.id || resolucionSolicitada.equipo_clave === equipo.clave)
          if (equipoSolicitado) {
            casilla.checked = true
            equiposAcceso.open = true
            equiposAcceso.dataset.resolucionActiva = solicitudInicial.requisito.id
          }
          if (equipoFinanzas?.id === equipo.id) selectorEquipoFinanzas = casilla
          etiqueta.append(casilla, document.createTextNode(equipo.nombre))
          const tipo = document.createElement('select')
          tipo.setAttribute('aria-label', `Función de ${usuario.nombre} en ${equipo.nombre}`)
          ;[['coordinacion', 'Coordinación'], ['integrante', 'Integrante'], ['referente', 'Referente'], ['sustitucion', 'Sustitución']].forEach(([valor, textoTipo]) => {
            const opcion = document.createElement('option'); opcion.value = valor; opcion.textContent = textoTipo; tipo.appendChild(opcion)
          })
          tipo.value = actual?.tipo || (usuario.perfil_acceso === 'coordinacion' ? 'coordinacion' : 'integrante')
          tipo.disabled = !casilla.checked
          casilla.addEventListener('change', () => { tipo.disabled = !casilla.checked })
          filaEquipo.append(etiqueta, tipo)
          editorEquipos.appendChild(filaEquipo)
        })
        const guardarEquipos = boton(resolucionSolicitada?.tipo === 'equipo' ? 'Guardar equipo y volver' : 'Guardar equipos', async () => {
          const filasEquipos = [...editorEquipos.querySelectorAll('.editor-equipo-usuario')]
          const deseadas = filasEquipos.filter((item) => item.querySelector('input').checked).map((item) => ({
            equipo_id: item.querySelector('input').value,
            tipo: item.querySelector('select').value,
          }))
          if (['coordinacion', 'integrante'].includes(usuario.perfil_acceso) && !deseadas.length) {
            error = 'Coordinación e Integrante necesitan al menos un equipo asignado.'
            dibujar()
            return
          }
          guardarEquipos.disabled = true
          try {
            const nuevas = deseadas.filter((deseada) => !asignaciones.some((actual) => actual.equipo_id === deseada.equipo_id && actual.tipo === deseada.tipo))
            const obsoletas = asignaciones.filter((actual) => !deseadas.some((deseada) => deseada.equipo_id === actual.equipo_id && deseada.tipo === actual.tipo))
            for (const nueva of nuevas) {
              await pedir('/api/cms/responsabilidades', { method: 'POST', body: JSON.stringify({ ...nueva, usuario_correo: usuario.correo }) })
            }
            for (const obsoleta of obsoletas) {
              await pedir(`/api/cms/responsabilidades/${encodeURIComponent(obsoleta.id)}`, { method: 'DELETE' })
            }
            if (resolucionSolicitada?.tipo === 'equipo') alCompletarSolicitud(solicitudInicial?.regreso)
            else await cargar()
          } catch (fallo) { error = fallo.message; dibujar() }
        }, ['boton', 'boton-principal'])
        equiposAcceso.append(editorEquipos, guardarEquipos)
      }
      fila.appendChild(equiposAcceso)
      if (usuario.correo !== sesion.correo) {
        if (confirmacionQuitar === usuario.correo) {
          const confirmar = elemento('div', ['confirmacion-acceso'])
          confirmar.append(
            elemento('strong', [], `¿Quitar el acceso de ${usuario.nombre}?`),
            elemento('span', [], 'Esta acción cerrará su sesión y no se puede deshacer.'),
            boton('Cancelar', () => { confirmacionQuitar = ''; dibujar() }),
            boton('Quitar definitivamente', async () => {
              try {
                await pedir(`/api/usuarios?correo=${encodeURIComponent(usuario.correo)}`, { method: 'DELETE' })
                confirmacionQuitar = ''
                await cargar()
              } catch (fallo) {
                error = fallo.message
                dibujar()
              }
            }, ['boton-peligro']),
          )
          fila.appendChild(confirmar)
        } else {
          fila.appendChild(boton('Quitar acceso', () => { confirmacionQuitar = usuario.correo; dibujar() }))
        }
      }
      lista.appendChild(fila)
    })
    caja.append(lista, elemento('h3', [], 'Crear acceso'), formulario())
    raiz.appendChild(caja)
  }

  dibujar()
  cargar()
  return { redibujar: dibujar }
}
