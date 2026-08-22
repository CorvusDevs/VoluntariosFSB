import { boton, elemento, vaciar } from './componentes.js'
import { crearSelectorFecha } from './selector-fecha.js'
import { evitarCortesHora, fechaDesdeUTC } from '../util/fechas.js'

const PERFILES = {
  administracion: ['Administración', 'Acceso completo, incluidos perfiles del programa y administración de accesos.'],
  direccion: ['Dirección', 'Visión institucional completa, sin acceder a perfiles ni fotos de participantes.'],
  coordinacion: ['Coordinación', 'Gestiona el CMS de los equipos que se le asignen, sin perfiles personales.'],
  integrante: ['Integrante', 'Ve su agenda, documentos compartidos y actualiza sus propias tareas.'],
  consulta: ['Consulta', 'Solo lectura de agenda y documentos compartidos.'],
}

const NIVELES_DATOS = {
  ninguno: ['Sin datos personales', 'No ve fotos ni fichas protegidas.'],
  operativo: ['Operativo', 'Ve solo foto interna autorizada y apoyos de jornada.'],
  sensible: ['Ficha protegida', 'Puede abrir contactos, fecha de nacimiento y necesidades sensibles. Cada acceso queda registrado.'],
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

async function subirFotoPerfil(correo, archivo) {
  if (!archivo) return
  if (archivo.size > 500 * 1024) throw new Error('La foto de perfil debe pesar como máximo 500 KB.')
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) throw new Error('Elegí una foto JPG, PNG o WebP.')
  const respuesta = await fetch(`/api/usuarios/foto?correo=${encodeURIComponent(correo)}`, {
    method: 'PUT', headers: { 'content-type': archivo.type }, body: archivo,
  })
  const datos = await respuesta.json()
  if (!respuesta.ok) throw new Error(datos.error || 'No se pudo guardar la foto de perfil.')
}

const iniciales = (nombre) => String(nombre || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase()

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

export function crearPantallaAccesosCloudflare(raiz, { sesion }) {
  let usuarios = []
  let equipos = []
  let responsabilidades = []
  let error = ''
  let contrasenaNueva = null
  let cargando = true
  let texto = ''
  let confirmacionQuitar = ''

  function estadoAdopcion(usuario) {
    if (!usuario.ultimo_acceso) return { clave: 'sin-ingreso', texto: 'Todavía no ingresó', atencion: true }
    const ultimoAcceso = new Date(usuario.ultimo_acceso).getTime()
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
      const [accesos, datosEquipos, datosResponsabilidades] = await Promise.all([
        pedir('/api/usuarios'), pedir('/api/cms/equipos'), pedir('/api/cms/responsabilidades'),
      ])
      usuarios = accesos.usuarios
      equipos = datosEquipos.equipos
      responsabilidades = datosResponsabilidades.responsabilidades
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
    const fotoPerfil = document.createElement('input')
    fotoPerfil.type = 'file'
    fotoPerfil.accept = 'image/jpeg,image/png,image/webp'
    fotoPerfil.setAttribute('aria-label', 'Foto de perfil opcional')
    const ayudaFoto = elemento('p', ['ayuda-ajustes'], 'Foto opcional, JPG, PNG o WebP de hasta 500 KB. Solo Administración puede verla o cambiarla.')
    const rol = document.createElement('select')
    Object.entries(PERFILES).forEach(([valor, [texto]]) => {
      const opcion = document.createElement('option')
      opcion.value = valor
      opcion.textContent = texto
      rol.appendChild(opcion)
    })
    rol.value = 'coordinacion'
    const ayudaPerfil = elemento('p', ['ayuda-ajustes'], PERFILES[rol.value][1])
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
        const creada = await pedir('/api/usuarios', {
          method: 'POST', body: JSON.stringify({ nombre: nombre.value, usuario: usuario.value, perfil_acceso: rol.value,
            equipos: [...equiposAsignados.querySelectorAll('input:checked')].map((casilla) => casilla.value) }),
        })
        await subirFotoPerfil(creada.correo, fotoPerfil.files?.[0])
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
    forma.append(campoAcceso('Nombre completo', nombre), campoAcceso('Usuario', usuario), campoArchivo('Foto de perfil', fotoPerfil), ayudaFoto, campoAcceso('Perfil de acceso', rol), ayudaPerfil, equiposAsignados, enviar)
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

  function dibujar() {
    vaciar(raiz)
    const caja = elemento('section', ['ajustes'])
    caja.appendChild(elemento('h2', [], 'Accesos'))
    caja.appendChild(elemento('p', ['ayuda-ajustes'],
      'Cada persona recibe un usuario y una contraseña generada. La aplicación solo guarda un derivado seguro de esa contraseña.'))
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
    const lista = elemento('div', ['lista-personas'])
    usuarios.filter((usuario) => `${usuario.nombre} ${usuario.correo}`.toLocaleLowerCase('es').includes(texto.toLocaleLowerCase('es'))).forEach((usuario) => {
      const fila = elemento('div', ['persona-fila'])
      fila.classList.add('acceso-fila')
      const identidad = elemento('div', ['acceso-identidad'])
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
        elemento('span', ['ayuda-ajustes'], `${usuario.correo} · ${PERFILES[usuario.perfil_acceso]?.[0] ?? 'Coordinación'} · ${NIVELES_DATOS[usuario.nivel_datos_personales]?.[0] ?? 'Sin datos personales'} · ${usuario.ultimo_acceso ? `Último acceso: ${evitarCortesHora(new Intl.DateTimeFormat('es-UY', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Montevideo' }).format(fechaDesdeUTC(usuario.ultimo_acceso)))}` : 'Aún no ingresó'}`),
        elemento('span', ['estado-adopcion', `estado-adopcion-${adopcion.clave}`], adopcion.texto),
      )
      identidad.appendChild(datosIdentidad)
      fila.append(
        identidad,
      )
      const datosPersonales = document.createElement('details')
      datosPersonales.className = 'permisos-editar'
      datosPersonales.appendChild(elemento('summary', [], 'Datos personales'))
      const nivel = document.createElement('select')
      Object.entries(NIVELES_DATOS).forEach(([valor, [etiqueta]]) => {
        const opcion = document.createElement('option'); opcion.value = valor; opcion.textContent = etiqueta; nivel.appendChild(opcion)
      })
      nivel.value = usuario.nivel_datos_personales || 'ninguno'
      const selectorVence = crearSelectorFecha({ clave: `acceso-vigencia-${usuario.correo}`, rotulo: 'Vigente hasta', valor: usuario.datos_personales_hasta || '' })
      const vence = selectorVence.entrada
      const ayudaDatos = elemento('p', ['ayuda-ajustes'], NIVELES_DATOS[nivel.value][1])
      const actualizarDatos = () => { ayudaDatos.textContent = NIVELES_DATOS[nivel.value][1]; selectorVence.establecerActivo(nivel.value !== 'ninguno'); if (nivel.value === 'ninguno') selectorVence.fijarValor('') }
      nivel.addEventListener('change', actualizarDatos); actualizarDatos()
      datosPersonales.append(nivel, selectorVence.campo, ayudaDatos, boton('Guardar acceso a datos', async () => {
        try {
          await pedir('/api/usuarios', { method: 'PATCH', body: JSON.stringify({ correo: usuario.correo, perfil_acceso: usuario.perfil_acceso, nivel_datos_personales: nivel.value, datos_personales_hasta: vence.value }) })
          await cargar()
        } catch (fallo) { error = fallo.message; dibujar() }
      }))
      fila.appendChild(datosPersonales)
      const foto = document.createElement('details')
      foto.className = 'permisos-editar'
      foto.appendChild(elemento('summary', [], 'Foto de perfil'))
      foto.appendChild(elemento('p', ['ayuda-ajustes'], usuario.foto_perfil ? 'Esta foto se ve solo dentro de Administración.' : 'Todavía no tiene foto de perfil.'))
      const archivoFoto = document.createElement('input')
      archivoFoto.type = 'file'; archivoFoto.accept = 'image/jpeg,image/png,image/webp'
      archivoFoto.setAttribute('aria-label', `Cambiar foto de perfil de ${usuario.nombre}`)
      foto.append(campoArchivo('Archivo de imagen', archivoFoto), boton(usuario.foto_perfil ? 'Cambiar foto' : 'Agregar foto', async () => {
        try { await subirFotoPerfil(usuario.correo, archivoFoto.files?.[0]); await cargar() } catch (fallo) { error = fallo.message; dibujar() }
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
        acceso.className = 'permisos-editar'
        acceso.appendChild(elemento('summary', [], 'Perfil de acceso'))
        const perfil = document.createElement('select')
        Object.entries(PERFILES).forEach(([valor, [etiqueta]]) => {
          const opcion = document.createElement('option'); opcion.value = valor; opcion.textContent = etiqueta; perfil.appendChild(opcion)
        })
        perfil.value = usuario.perfil_acceso || (usuario.rol === 'admin' ? 'administracion' : 'coordinacion')
        const ayuda = elemento('p', ['ayuda-ajustes'], PERFILES[perfil.value][1])
        perfil.addEventListener('change', () => { ayuda.textContent = PERFILES[perfil.value][1] })
        const guardar = boton('Guardar perfil', async () => {
          try {
            await pedir('/api/usuarios', { method: 'PATCH', body: JSON.stringify({ correo: usuario.correo, perfil_acceso: perfil.value, nivel_datos_personales: usuario.nivel_datos_personales || 'ninguno', datos_personales_hasta: usuario.datos_personales_hasta || '' }) })
            await cargar()
          } catch (fallo) { error = fallo.message; dibujar() }
        })
        acceso.append(perfil, ayuda, guardar)
        fila.appendChild(acceso)
      }
      const equiposAcceso = document.createElement('details')
      equiposAcceso.className = 'permisos-editar'
      const asignaciones = responsabilidades.filter((asignacion) => asignacion.usuario_correo === usuario.correo)
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
        const guardarEquipos = boton('Guardar equipos', async () => {
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
            await cargar()
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
