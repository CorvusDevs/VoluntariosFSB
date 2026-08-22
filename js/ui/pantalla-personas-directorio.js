import { elemento, boton, vaciar } from './componentes.js'
import { activos, agregarParticipante, agregarVoluntario, desactivarPersona, editarPersona, reactivarPersona } from '../modelo/roster.js'
import { coincide } from '../util/nombres.js'
import { crearEditorDeFoto } from './editor-foto.js'
import { perfilDe } from '../modelo/perfil.js'
import { maquetarPerfil } from '../imagen/maquetar-perfil.js'
import { cargarImagen, descargar, esperarFuentes, medidorDesde } from '../imagen/exportar.js'
import { pintar } from '../imagen/pintar.js'
import { crearSelectorFecha } from './selector-fecha.js'

const AJUSTES = { resumen: true, fotos: true, estado: true, orden: 'nombre' }
const CLAVE_FILTROS = 'voluntarios-fsb:filtros-personas'
const tipoDe = (p) => p.id.startsWith('v_') ? 'voluntario' : 'participante'
const iniciales = (nombre) => nombre.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

function leerFiltros() {
  try { return JSON.parse(sessionStorage.getItem(CLAVE_FILTROS) ?? '{}') } catch { return {} }
}

export function crearPantallaPersonas(raiz, { roster, almacen, alCambiar, alGuardar = null, sesion = null, esAdmin = false, busquedaInicial = '' }) {
  const guardados = leerFiltros()
  let actual = roster, texto = busquedaInicial || guardados.texto || '', tipo = busquedaInicial ? 'todas' : guardados.tipo || 'participante', filtro = guardados.filtro || 'activas', grupo = guardados.grupo || 'todos'
  let editando = null, agregando = false, seleccionando = false, seleccion = new Set(), deshacer = [], personalizando = false, viendoTarjetas = false, tarjetaElegida = null, confirmacionPerfil = ''
  let filtrosAbiertos = !globalThis.matchMedia?.('(max-width: 620px)').matches
  const miniaturas = new Map()
  const urlsMiniaturas = new Set()
  let logoAleteaPendiente = null, iconoPelotaPendiente = null
  const ajustes = () => ({ ...AJUSTES, ...(actual.preferenciasPersonas ?? {}) })
  const recordarFiltros = () => { try { sessionStorage.setItem(CLAVE_FILTROS, JSON.stringify({ texto, tipo, filtro, grupo })) } catch {} }
  const todas = () => [...actual.participantes.map((p) => ({ ...p, tipo: 'participante' })), ...actual.voluntarios.map((p) => ({ ...p, tipo: 'voluntario' }))]
  async function guardar(siguiente, descripcion, mudanzas = [], confirmacion = '') {
    if (alGuardar) await alGuardar(siguiente, descripcion)
    else await almacen.guardarRoster(siguiente, descripcion)
    actual = siguiente
    await alCambiar(actual, mudanzas)
    confirmacionPerfil = confirmacion
    dibujar()
  }
  function visibles() {
    return todas().filter((p) => {
      if (filtro === 'activas' && !p.activo) return false
      if (filtro === 'archivadas' && p.activo) return false
      if (filtro === 'sin-foto' && !p.foto) return false
      if (filtro === 'nuevas' && !p.nuevo) return false
      if (tipo !== 'todas' && p.tipo !== tipo) return false
      if (grupo !== 'todos' && (p.tipo !== 'participante' || String(p.grupo) !== grupo)) return false
      return !texto || coincide(p.nombre, texto)
    }).sort((a, b) => ajustes().orden === 'tipo' && a.tipo !== b.tipo ? a.tipo.localeCompare(b.tipo) : a.nombre.localeCompare(b.nombre, 'es'))
  }
  function chip(caja, etiqueta, valor, actualValor, cambiar) {
    const control = boton(etiqueta, () => { cambiar(valor); recordarFiltros(); dibujar() })
    control.classList.add('chip'); control.classList.toggle('activa', actualValor === valor); control.setAttribute('aria-pressed', String(actualValor === valor)); caja.appendChild(control)
  }
  function filtros() {
    const caja = elemento('section', ['personas-filtros']); const buscar = document.createElement('input')
    buscar.type = 'search'; buscar.placeholder = 'Buscar persona'; buscar.value = texto; buscar.setAttribute('aria-label', 'Buscar persona'); buscar.addEventListener('input', () => { texto = buscar.value; recordarFiltros(); dibujar() }); caja.appendChild(buscar)
    const chips = elemento('div', ['personas-chips'])
    chip(chips, 'Todas', 'todas', tipo, (v) => { tipo = v }); chip(chips, 'Participantes', 'participante', tipo, (v) => { tipo = v }); chip(chips, 'Voluntarios', 'voluntario', tipo, (v) => { tipo = v })
    chip(chips, 'Grupo 1', '1', grupo, (v) => { grupo = grupo === v ? 'todos' : v }); chip(chips, 'Grupo 2', '2', grupo, (v) => { grupo = grupo === v ? 'todos' : v })
    chip(chips, 'Sin foto', 'sin-foto', filtro, (v) => { filtro = filtro === v ? 'activas' : v }); chip(chips, 'Nuevas', 'nuevas', filtro, (v) => { filtro = filtro === v ? 'activas' : v }); chip(chips, 'Archivadas', 'archivadas', filtro, (v) => { filtro = filtro === v ? 'activas' : v })
    const activos = [tipo !== 'participante', grupo !== 'todos', filtro !== 'activas'].filter(Boolean).length
    const abrir = boton(`Filtrar${activos ? ` (${activos})` : ''}`, () => { filtrosAbiertos = !filtrosAbiertos; dibujar() })
    abrir.classList.add('personas-abrir-filtros')
    abrir.setAttribute('aria-expanded', String(filtrosAbiertos))
    chips.hidden = !filtrosAbiertos
    caja.append(abrir, chips); return caja
  }
  function cargarMiniatura(persona, avatar) {
    if (!persona.foto || !ajustes().fotos) return
    if (!miniaturas.has(persona.foto)) miniaturas.set(persona.foto, almacen.leerFoto(persona.foto))
    miniaturas.get(persona.foto).then((blob) => {
      if (!blob || !avatar.isConnected) return
      const imagen = document.createElement('img')
      imagen.className = 'persona-miniatura'
      imagen.alt = ''
      imagen.addEventListener('load', () => imagen.classList.add('lista'), { once: true })
      const url = URL.createObjectURL(blob)
      urlsMiniaturas.add(url)
      imagen.src = url
      avatar.appendChild(imagen)
    }).catch(() => {})
  }
  function tarjeta(p) {
    const fila = elemento('article', ['persona-tarjeta']); fila.dataset.id = p.id; if (p.tipo === 'participante') fila.dataset.grupo = p.grupo
    const abrir = boton('', () => { editando = p.id; agregando = false; dibujar() }); abrir.className = 'persona-abrir'; abrir.setAttribute('aria-label', `Editar a ${p.nombre}`)
    const avatar = elemento('span', ['persona-avatar', ...(p.tipo === 'participante' ? ['participante'] : []), ...(p.foto && ajustes().fotos ? ['con-foto'] : [])], iniciales(p.nombre))
    abrir.appendChild(avatar)
    cargarMiniatura(p, avatar)
    const detalle = elemento('span', ['persona-detalle'])
    if (p.tipo === 'participante') detalle.appendChild(elemento('span', ['persona-grupo', `persona-grupo-${p.grupo}`], `Grupo ${p.grupo}`))
    else detalle.appendChild(document.createTextNode('Voluntario'))
    if (ajustes().estado && p.nuevo) detalle.appendChild(document.createTextNode(' · Nuevo')); if (ajustes().fotos) detalle.appendChild(document.createTextNode(` · ${p.foto ? 'Foto' : 'Sin foto'}`))
    const textoTarjeta = elemento('span', ['persona-texto']); textoTarjeta.append(elemento('strong', [], p.nombre), detalle)
    abrir.append(textoTarjeta, elemento('span', ['persona-flecha'], '›')); fila.appendChild(abrir)
    if (seleccionando && p.activo) { const marcar = document.createElement('input'); marcar.type = 'checkbox'; marcar.checked = seleccion.has(p.id); marcar.className = 'persona-seleccionar'; marcar.addEventListener('change', () => { marcar.checked ? seleccion.add(p.id) : seleccion.delete(p.id); dibujar() }); fila.appendChild(marcar) }
    return fila
  }
  const puedeGestionarFicha = () => sesion?.nivel_datos_personales === 'sensible'
  async function foto(p, archivo) { const mapa = await createImageBitmap(archivo); crearEditorDeFoto({ mapa, persona: p, tipo: tipoDe(p), acompanante: null, alGuardar: async (blob) => { const clave = `${p.id}.jpg`; await almacen.guardarFoto(clave, blob, p.nombre); await guardar(editarPersona(actual, p.id, { foto: clave }), `Cambiar la foto de ${p.nombre}`) }, alCancelar: () => {} }) }
  async function lienzoDeTarjeta(p) {
    await esperarFuentes(); const lienzo = document.createElement('canvas'); const ctx = lienzo.getContext('2d'); const plano = maquetarPerfil(p, { medirTexto: medidorDesde(ctx) }); const imagenes = {}
    if (!logoAleteaPendiente) logoAleteaPendiente = cargarImagen('assets/logo-aletea.png')
    if (!iconoPelotaPendiente) iconoPelotaPendiente = cargarImagen('assets/iconos/pelota-blanca.svg')
    const [logoAletea, iconoPelota] = await Promise.all([logoAleteaPendiente, iconoPelotaPendiente])
    if (logoAletea) imagenes.logo = logoAletea
    if (iconoPelota) imagenes['icono-pelota'] = iconoPelota
    if (p.foto) { const blob = await almacen.leerFoto(p.foto); if (blob) imagenes[p.foto] = await createImageBitmap(blob) }
    pintar(ctx, plano, imagenes, 2); return lienzo
  }
  async function descargarTarjeta(p) { await descargar(await lienzoDeTarjeta(p), `perfil-${p.nombre.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.png`) }
  function editor(p) {
    const nueva = !p, datos = p ?? { nombre: '', tipo: 'participante', grupo: 1, nuevo: false, notas: '', perfil: {} }, perfil = perfilDe(datos), caja = elemento('section', ['persona-editor'])
    caja.appendChild(elemento('h2', [], nueva ? 'Agregar persona' : `Perfil de ${datos.nombre}`))
    const form = elemento('form', ['persona-formulario']); const nombre = document.createElement('input'); nombre.required = true; nombre.value = datos.nombre; nombre.placeholder = 'Nombre completo'; nombre.setAttribute('aria-label', 'Nombre completo'); form.appendChild(nombre)
    const clase = document.createElement('select'); clase.innerHTML = '<option value="participante">Participante</option><option value="voluntario">Voluntario</option>'; clase.value = datos.tipo; clase.disabled = !nueva; form.appendChild(clase)
    const selectorGrupo = document.createElement('select'); selectorGrupo.innerHTML = '<option value="1">Grupo 1</option><option value="2">Grupo 2</option>'; selectorGrupo.value = String(datos.grupo ?? 1); selectorGrupo.hidden = clase.value !== 'participante'; clase.addEventListener('change', () => { selectorGrupo.hidden = clase.value !== 'participante' }); form.appendChild(selectorGrupo)
    const marca = document.createElement('input'); marca.type = 'checkbox'; marca.checked = Boolean(datos.nuevo); marca.id = `persona-nuevo-${datos.id ?? 'nueva'}`; marca.setAttribute('role', 'switch'); const etiqueta = elemento('label', ['persona-estado']); etiqueta.htmlFor = marca.id; const textoEstado = elemento('span', ['persona-estado-texto']); textoEstado.append(elemento('strong', [], 'Estado'), elemento('span', [], 'Marcar como nuevo')); etiqueta.append(textoEstado, marca); form.appendChild(etiqueta)
    const notas = document.createElement('textarea'); notas.rows = 3; notas.placeholder = 'Notas para coordinación'; notas.value = datos.notas ?? ''; form.appendChild(notas)
    const bio = elemento('fieldset', ['persona-bio']); bio.appendChild(elemento('legend', [], 'Perfil personal'))
    const campoPerfil = (clave, rotulo, tipo = 'text', ayuda = '') => { const etiqueta = elemento('label', ['campo']); etiqueta.appendChild(elemento('span', ['campo-rotulo'], rotulo)); const entrada = document.createElement(tipo === 'textarea' ? 'textarea' : 'input'); if (tipo !== 'textarea') entrada.type = tipo; else entrada.rows = 3; entrada.value = perfil[clave] ?? ''; entrada.dataset.perfil = clave; if (ayuda) entrada.placeholder = ayuda; etiqueta.appendChild(entrada); bio.appendChild(etiqueta); return entrada }
    const hoy = new Date()
    const maximo = hoy.toISOString().slice(0, 10)
    const desde = crearSelectorFecha({ clave: 'desde', rotulo: 'En la organización desde', valor: perfil.desde, max: maximo })
    bio.appendChild(desde.campo)
    campoPerfil('leGusta', 'Le gusta', 'textarea', 'Actividades, intereses o motivadores')
    campoPerfil('noLeGusta', 'Prefiere evitar', 'textarea', 'Situaciones, sonidos o actividades')
    campoPerfil('apoyosOperativos', 'Apoyos operativos', 'textarea', 'Indicaciones útiles para la jornada, sin detalle sensible')
    form.appendChild(bio)
    const perfilActual = () => Object.fromEntries([...bio.querySelectorAll('[data-perfil]')].map((e) => [e.dataset.perfil, e.value.trim()]))
    const personaBorrador = () => ({ ...datos, nombre: nombre.value.trim() || datos.nombre, grupo: Number(selectorGrupo.value), perfil: perfilActual() })
    const errorGuardar = elemento('p', ['persona-error'])
    errorGuardar.setAttribute('role', 'alert')
    const guardarCambios = boton(nueva ? 'Agregar persona' : 'Guardar cambios', async () => {
      const limpio = nombre.value.trim()
      if (!limpio) return
      guardarCambios.disabled = true
      guardarCambios.textContent = 'Guardando…'
      const perfilNuevo = perfilActual()
      try {
        if (nueva) {
          const siguiente = clase.value === 'participante'
            ? agregarParticipante(actual, { nombre: limpio, grupo: Number(selectorGrupo.value), nuevo: marca.checked, notas: notas.value, perfil: perfilNuevo })
            : agregarVoluntario(actual, { nombre: limpio, nuevo: marca.checked, notas: notas.value, perfil: perfilNuevo })
          agregando = false
          await guardar(siguiente, `Agregar a ${limpio}`, [], 'Persona agregada correctamente')
        } else {
          const cambios = { nombre: limpio, nuevo: marca.checked, notas: notas.value, perfil: perfilNuevo }, mudanzas = []
          if (datos.tipo === 'participante' && Number(selectorGrupo.value) !== datos.grupo) {
            cambios.grupo = Number(selectorGrupo.value)
            mudanzas.push({ id: datos.id, grupo: cambios.grupo })
          }
          await guardar(editarPersona(actual, datos.id, cambios), `Actualizar a ${datos.nombre}`, mudanzas, `Perfil de ${limpio} guardado correctamente`)
        }
      } catch (error) {
        guardarCambios.disabled = false
        guardarCambios.textContent = nueva ? 'Agregar persona' : 'Guardar cambios'
        const detalle = error instanceof Error && error.message ? error.message : 'Revisá tu conexión e intentá de nuevo.'
        errorGuardar.textContent = `No se guardaron los cambios: ${detalle}`
      }
    })
    form.append(guardarCambios, errorGuardar)
    if (!nueva && confirmacionPerfil) {
      const confirmacion = elemento('p', ['persona-confirmacion'], confirmacionPerfil)
      confirmacion.setAttribute('role', 'status')
      form.appendChild(confirmacion)
    }
    form.addEventListener('submit', (e) => e.preventDefault()); caja.appendChild(form)
    if (!nueva) {
      const protegida = elemento('section', ['persona-ficha-protegida'])
      protegida.append(
        elemento('h3', [], 'Ficha protegida'),
        elemento('p', ['ayuda-ajustes'], 'Contacto, fecha de nacimiento, necesidades sensibles y consentimientos. Cada apertura queda registrada.'),
      )
      if (!puedeGestionarFicha()) {
        protegida.appendChild(elemento('p', ['ayuda-ajustes'], 'Tu acceso actual no permite abrir esta ficha. Pedí a Administración un acceso temporal de ficha protegida.'))
      } else {
        const abrir = boton('Abrir ficha protegida', async () => {
          abrir.disabled = true; abrir.textContent = 'Abriendo...'
          try {
            const privada = await almacen.leerFichaProtegida(datos.id)
            const formulario = elemento('div', ['persona-ficha-protegida-formulario'])
            const campo = (rotulo, clave, tipo = 'text', ayuda = '', maxFecha = '') => {
              if (tipo === 'date') {
                const selector = crearSelectorFecha({ clave, rotulo, valor: privada[clave] ?? '', max: maxFecha || maximo })
                selector.entrada.dataset.protegido = clave
                formulario.appendChild(selector.campo)
                return selector.entrada
              }
              const etiqueta = elemento('label', ['campo']); etiqueta.appendChild(elemento('span', ['campo-rotulo'], rotulo))
              const entrada = document.createElement(tipo === 'textarea' ? 'textarea' : 'input')
              if (tipo === 'textarea') entrada.rows = 3; else entrada.type = tipo
              entrada.value = privada[clave] ?? ''; entrada.dataset.protegido = clave; entrada.placeholder = ayuda; etiqueta.appendChild(entrada); formulario.appendChild(etiqueta); return entrada
            }
            campo('Fecha de nacimiento', 'anioNacimiento', 'date', '', maximo)
            campo('Contacto de emergencia', 'contactoEmergencia', 'textarea', 'Nombre, vínculo y teléfono')
            campo('Necesidades sensibles', 'necesidades', 'textarea', 'Información clínica, de bienestar o apoyos reservados')
            const privacidad = privada.privacidad ?? {}
            const consentimiento = elemento('fieldset', ['persona-bio']); consentimiento.appendChild(elemento('legend', [], 'Consentimientos diferenciados'))
            const marcas = [['perfilInterno', 'Perfil interno y apoyos operativos'], ['fotoInterna', 'Foto para uso interno'], ['fotoPublica', 'Foto para difusión pública'], ['contacto', 'Contacto de emergencia'], ['datosSensibles', 'Necesidades sensibles']].map(([clave, texto]) => {
              const etiqueta = document.createElement('label'); const entrada = document.createElement('input'); entrada.type = 'checkbox'; entrada.checked = privacidad[clave] === true; entrada.dataset.consentimiento = clave; etiqueta.append(entrada, document.createTextNode(` ${texto}`)); consentimiento.appendChild(etiqueta); return entrada
            })
            formulario.appendChild(consentimiento)
            campo('Autorizado por', 'autorizadoPor', 'text', 'Madre, padre, tutor o persona adulta responsable')
            campo('Consentimiento documentado el', 'documentadoEl', 'date', '', maximo)
            campo('Última revisión', 'revisadoEl', 'date', '', maximo)
            const estado = elemento('p', ['persona-confirmacion']); estado.setAttribute('role', 'status')
            const guardarProtegida = boton('Guardar ficha protegida', async () => {
              guardarProtegida.disabled = true; guardarProtegida.textContent = 'Guardando...'
              try {
                const valores = Object.fromEntries([...formulario.querySelectorAll('[data-protegido]')].map((entrada) => [entrada.dataset.protegido, entrada.value.trim()]))
                const consentimientos = Object.fromEntries(marcas.map((entrada) => [entrada.dataset.consentimiento, entrada.checked]))
                const resultado = await almacen.guardarFichaProtegida(datos.id, { ...valores, privacidad: consentimientos })
                actual = editarPersona(actual, datos.id, resultado.persona)
                await alCambiar(actual, [])
                estado.textContent = 'Ficha protegida guardada y consentimiento registrado.'
              } catch (error) { estado.textContent = `No se guardó la ficha: ${error.message || 'revisá los datos.'}` }
              finally { guardarProtegida.disabled = false; guardarProtegida.textContent = 'Guardar ficha protegida' }
            })
            formulario.append(guardarProtegida, estado)
            protegida.replaceChildren(elemento('h3', [], 'Ficha protegida'), elemento('p', ['ayuda-ajustes'], 'Contacto, fecha de nacimiento, necesidades sensibles y consentimientos. Cada apertura queda registrada.'), formulario)
          } catch (error) { abrir.disabled = false; abrir.textContent = 'Abrir ficha protegida'; protegida.appendChild(elemento('p', ['persona-error'], error.message || 'No se pudo abrir la ficha.')) }
        })
        protegida.appendChild(abrir)
      }
      caja.appendChild(protegida)
    }
    if (!nueva) { const vista = elemento('section', ['vista-tarjeta-personal']); vista.appendChild(elemento('h3', [], 'Vista previa de tarjeta')); const textoVista = elemento('p', ['ayuda-ajustes'], 'La tarjeta se actualiza mientras editás.'); const lienzos = elemento('div', ['contenedor-lienzo-tarjeta']); vista.append(textoVista, lienzos); let revisionVista = 0; const actualizarVista = () => { const revision = ++revisionVista; lienzoDeTarjeta(personaBorrador()).then((lienzo) => { if (!vista.isConnected || revision !== revisionVista) return; lienzo.className = 'lienzo-tarjeta-personal'; lienzos.replaceChildren(lienzo) }).catch(() => { if (revision === revisionVista) textoVista.textContent = 'No se pudo preparar la vista previa.' }) }; form.querySelectorAll('input, textarea, select').forEach((entrada) => entrada.addEventListener('input', actualizarVista)); form.querySelectorAll('select').forEach((entrada) => entrada.addEventListener('change', actualizarVista)); actualizarVista(); caja.appendChild(vista) }
    const acciones = elemento('div', ['persona-acciones'])
    if (!nueva && puedeGestionarFicha() && datos.privacidad?.fotoInterna) { const archivo = document.createElement('input'); archivo.type = 'file'; archivo.accept = 'image/*'; archivo.capture = 'user'; archivo.className = 'oculto-visualmente'; archivo.addEventListener('change', async () => { if (archivo.files?.[0]) await foto(datos, archivo.files[0]) }); const fotoBoton = elemento('label', ['boton', 'boton-foto'], datos.foto ? 'Cambiar foto' : 'Agregar foto'); fotoBoton.appendChild(archivo); acciones.appendChild(fotoBoton)
      if (datos.foto) acciones.appendChild(boton('Quitar foto', async () => { const clave = datos.foto; await guardar(editarPersona(actual, datos.id, { foto: null }), `Quitar la foto de ${datos.nombre}`); try { await almacen.borrarFoto(clave, datos.nombre) } catch {} })) }
    if (!nueva) {
      acciones.appendChild(boton('Descargar tarjeta PNG', () => descargarTarjeta(personaBorrador())))
      acciones.appendChild(boton(datos.activo ? 'Archivar persona' : 'Restaurar persona', async () => { if (datos.activo) deshacer = [datos.id]; await guardar(datos.activo ? desactivarPersona(actual, datos.id) : reactivarPersona(actual, datos.id), `${datos.activo ? 'Archivar' : 'Restaurar'} a ${datos.nombre}`) }))
    }
    acciones.appendChild(boton('Cerrar', () => { editando = null; agregando = false; dibujar() })); caja.appendChild(acciones); return caja
  }
  function masivas() { const caja = elemento('div', ['personas-masivas'], `${seleccion.size} seleccionadas`); const aplicar = async (cambios, texto, soloParticipantes = false) => { let siguiente = actual; const mudanzas = []; seleccion.forEach((id) => { const p = todas().find((x) => x.id === id); if (!p || (soloParticipantes && p.tipo !== 'participante')) return; siguiente = editarPersona(siguiente, id, cambios); if (cambios.grupo && p.grupo !== cambios.grupo) mudanzas.push({ id, grupo: cambios.grupo }) }); seleccion = new Set(); await guardar(siguiente, texto, mudanzas) }; caja.append(boton('Grupo 1', () => aplicar({ grupo: 1 }, 'Mover personas al grupo 1', true)), boton('Grupo 2', () => aplicar({ grupo: 2 }, 'Mover personas al grupo 2', true)), boton('Marcar nuevas', () => aplicar({ nuevo: true }, 'Marcar personas como nuevas')), boton('Archivar', async () => { deshacer = [...seleccion]; let siguiente = actual; seleccion.forEach((id) => { siguiente = desactivarPersona(siguiente, id) }); seleccion = new Set(); await guardar(siguiente, 'Archivar personas seleccionadas') }), boton('Cancelar', () => { seleccionando = false; seleccion = new Set(); dibujar() })); return caja }
  function personalizar() { const caja = elemento('section', ['personas-personalizacion']); caja.appendChild(elemento('h2', [], 'Personalizar Personas')); const borrador = ajustes(); ;[['resumen', 'Mostrar resumen de preparación'], ['fotos', 'Mostrar estado de foto'], ['estado', 'Mostrar estado Nuevo']].forEach(([clave, texto]) => { const entrada = document.createElement('input'); entrada.type = 'checkbox'; entrada.checked = borrador[clave]; entrada.addEventListener('change', () => { borrador[clave] = entrada.checked }); const etiqueta = elemento('label', ['marca-nuevo']); etiqueta.append(entrada, document.createTextNode(` ${texto}`)); caja.appendChild(etiqueta) }); const orden = document.createElement('select'); orden.innerHTML = '<option value="nombre">Ordenar por nombre</option><option value="tipo">Agrupar por tipo</option>'; orden.value = borrador.orden; orden.addEventListener('change', () => { borrador.orden = orden.value }); caja.append(orden, boton('Guardar personalización', async () => { personalizando = false; await guardar({ ...actual, preferenciasPersonas: borrador }, 'Personalizar Personas') }), boton('Cancelar', () => { personalizando = false; dibujar() })); return caja }
  function tarjetas() {
    const caja = elemento('section', ['personas-tarjetas']); const gente = todas().filter((p) => p.activo).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    caja.append(elemento('h3', [], 'Tarjetas personales'), elemento('p', ['ayuda-ajustes'], 'Vista y descarga de tarjetas de uso interno.'))
    if (!gente.length) { caja.appendChild(elemento('p', ['ayuda-ajustes'], 'No hay personas activas para mostrar.')); return caja }
    const selector = document.createElement('select'); selector.setAttribute('aria-label', 'Elegir persona para su tarjeta'); gente.forEach((p) => selector.appendChild(new Option(p.nombre, p.id))); const persona = gente.find((p) => p.id === tarjetaElegida) ?? gente[0]; selector.value = persona.id; selector.addEventListener('change', () => { tarjetaElegida = selector.value; dibujar() }); caja.appendChild(selector)
    const marco = elemento('div', ['contenedor-lienzo-tarjeta']); const aviso = elemento('p', ['ayuda-ajustes'], 'Preparando tarjeta…'); marco.appendChild(aviso); lienzoDeTarjeta(persona).then((lienzo) => { if (!marco.isConnected) return; lienzo.className = 'lienzo-tarjeta-personal'; marco.replaceChildren(lienzo) }).catch(() => { aviso.textContent = 'No se pudo preparar la tarjeta.' }); caja.appendChild(marco)
    caja.append(boton('Descargar tarjeta PNG', () => descargarTarjeta(persona)), boton('Editar perfil', () => { viendoTarjetas = false; editando = persona.id; dibujar() }), boton('Volver a Personas', () => { viendoTarjetas = false; dibujar() })); return caja
  }
  function dibujar() { vaciar(raiz); const cabecera = elemento('section', ['personas-cabecera']); cabecera.append(elemento('h2', [], 'Personas'), boton('Agregar persona', () => { agregando = true; editando = null; dibujar() }), boton('Tarjetas', () => { viendoTarjetas = true; editando = null; agregando = false; dibujar() }), boton(seleccionando ? 'Cancelar selección' : 'Seleccionar', () => { seleccionando = !seleccionando; seleccion = new Set(); dibujar() })); if (esAdmin) cabecera.appendChild(boton('Personalizar', () => { personalizando = true; dibujar() })); raiz.appendChild(cabecera); if (viendoTarjetas) { raiz.appendChild(tarjetas()); return } if (ajustes().resumen) { const a = activos(actual.participantes), v = activos(actual.voluntarios), sinFoto = [...a, ...v].filter((p) => !p.foto).length; raiz.appendChild(elemento('p', ['personas-resumen'], `${a.length} participantes, ${v.length} voluntarios, ${sinFoto} sin foto`)) } raiz.appendChild(filtros()); if (deshacer.length) { const aviso = elemento('div', ['personas-deshacer'], `${deshacer.length} archivada${deshacer.length === 1 ? '' : 's'}. `); aviso.appendChild(boton('Deshacer', async () => { let siguiente = actual; deshacer.forEach((id) => { siguiente = reactivarPersona(actual, id) }); deshacer = []; await guardar(siguiente, 'Deshacer archivado') })); raiz.appendChild(aviso) } if (seleccionando) raiz.appendChild(masivas()); const lista = elemento('section', ['personas-directorio']); const gente = visibles(); lista.appendChild(elemento('h3', [], `${gente.length} persona${gente.length === 1 ? '' : 's'}`)); if (!gente.length) { const vacio = elemento('div', ['estado-vacio']); vacio.append(elemento('p', ['ayuda-ajustes'], 'No hay personas con estos filtros.'), boton('Limpiar filtros', () => { texto = ''; tipo = 'participante'; filtro = 'activas'; grupo = 'todos'; recordarFiltros(); dibujar() })); lista.appendChild(vacio) } else { const resultados = elemento('div', ['personas-resultados']); gente.forEach((p) => resultados.appendChild(tarjeta(p))); lista.appendChild(resultados) } raiz.appendChild(lista); const persona = editando && todas().find((p) => p.id === editando); if (persona || agregando) raiz.appendChild(editor(persona)); if (personalizando && esAdmin) raiz.appendChild(personalizar()) }
  dibujar(); return {
    roster: () => actual, redibujar: dibujar,
    destruir: () => urlsMiniaturas.forEach((url) => URL.revokeObjectURL(url)),
  }
}
