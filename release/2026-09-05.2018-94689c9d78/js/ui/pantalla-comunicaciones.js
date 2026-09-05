import { boton, elemento, vaciar } from './componentes.js'
import { TEMAS_COMUNICACION } from '../modelo/comunicaciones.js'
import { completarMedicionUX, iniciarMedicionUX } from '../modelo/metricas-ux.js'

const ETIQUETAS_TEMAS = Object.freeze({
  novedades: 'Novedades', actividades: 'Actividades', familias: 'Familias', formacion: 'Formación',
})

async function pedir(ruta, opciones = {}) {
  const respuesta = await fetch(ruta, { headers: { accept: 'application/json', ...(opciones.body ? { 'content-type': 'application/json' } : {}) }, ...opciones })
  const datos = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(datos.error || 'No se pudo completar la operación.')
  return datos
}

function estadoLegible(estado) {
  return ({ pendiente: 'Pendiente de confirmación', activo: 'Activo', baja: 'Baja', rebotado: 'Rebotado', bloqueado: 'Bloqueado', borrador: 'Borrador', revision: 'En revisión', aprobada: 'Aprobada', programada: 'Programada', enviada: 'Enviada', cancelada: 'Cancelada', enviado: 'Enviado', fallido: 'Fallido', suprimido: 'Suprimido' })[estado] || estado
}

function campoFormulario(etiqueta, control) {
  const campo = elemento('label', ['cms-campo'])
  campo.append(elemento('span', [], etiqueta), control)
  return campo
}

function conHijos(etiqueta, clases, hijos) {
  const nodo = elemento(etiqueta, clases)
  nodo.append(...hijos)
  return nodo
}

export function crearPantallaComunicaciones(contenedor, { sesion = {}, alIrA = () => {} } = {}) {
  iniciarMedicionUX('enviar_campana')
  const raiz = elemento('main', ['cms', 'cms-comunicaciones'])
  contenedor.appendChild(raiz)
  const claveVista = `aletea:comunicaciones:vistas:v1:${sesion?.correo || sesion?.usuario || 'cuenta'}`
  let vistaGuardada = {}
  try { vistaGuardada = JSON.parse(window.localStorage.getItem(claveVista) || '{}') } catch { vistaGuardada = {} }
  const guardarVista = () => {
    try { window.localStorage.setItem(claveVista, JSON.stringify({ pestana, busqueda, filtroEstado, filtroTema, filtroOrigen, filtroActividad })) } catch { /* Los filtros continúan disponibles durante la sesión. */ }
  }
  let datos = { contactos: [], campanas: [], cola: [], eventos: [], transporte: {}, paginacion_contactos: { pagina: 1, paginas: 1, total: 0 } }
  let pestana = vistaGuardada.pestana || 'contactos'
  let busqueda = vistaGuardada.busqueda || ''
  let filtroEstado = vistaGuardada.filtroEstado || 'todos'
  let filtroTema = vistaGuardada.filtroTema || 'todos'
  let filtroOrigen = vistaGuardada.filtroOrigen || 'todos'
  let filtroActividad = vistaGuardada.filtroActividad || 'todas'
  let mensaje = ''
  let errorActual = ''
  let temporizadorBusqueda = null
  let restaurarFocoBusqueda = false

  const rutaCarga = (pagina = datos.paginacion_contactos?.pagina || 1) => {
    const parametros = new URLSearchParams()
    if (busqueda.trim()) parametros.set('contactos_buscar', busqueda.trim())
    parametros.set('contactos_pagina', String(pagina))
    return `/api/cms/comunicaciones?${parametros}`
  }

  const recargar = async (pagina = datos.paginacion_contactos?.pagina || 1) => {
    datos = await pedir(rutaCarga(pagina))
  }

  const ejecutar = async (operacion, confirmacion = '') => {
    errorActual = ''; mensaje = ''
    try {
      await operacion()
      mensaje = confirmacion
      await recargar()
    } catch (error) { errorActual = error.message }
    pintar()
  }

  const accionesCampana = (campana) => {
    const acciones = elemento('div', ['cms-acciones', 'cms-comunicaciones-acciones'])
    if (campana.estado === 'borrador') acciones.appendChild(boton('Solicitar revisión', () => ejecutar(() => pedir(`/api/cms/comunicaciones/campanas/${campana.id}/solicitar-revision`, { method: 'POST', body: '{}' }), 'La campaña quedó lista para una segunda revisión.')))
    if (campana.estado === 'revision') acciones.appendChild(boton('Aprobar', () => ejecutar(() => pedir(`/api/cms/comunicaciones/campanas/${campana.id}/aprobar`, { method: 'POST', body: '{}' }), 'Campaña aprobada.')))
    if (campana.estado === 'aprobada') {
      const desplegable = elemento('details', ['cms-comunicaciones-accion-desplegable'])
      const resumen = elemento('summary', ['boton', 'boton-principal'], 'Programar envío')
      if (!datos.transporte.lista_para_enviar) {
        resumen.setAttribute('aria-disabled', 'true')
        resumen.title = 'Completá primero la preparación de correo en Operaciones.'
        resumen.addEventListener('click', (evento) => { evento.preventDefault(); alIrA('cms-operaciones') })
      }
      const formulario = elemento('form', ['cms-comunicaciones-accion-formulario'])
      const fecha = Object.assign(document.createElement('input'), { type: 'datetime-local' })
      fecha.setAttribute('aria-label', 'Fecha y hora de envío')
      const enviar = boton('Confirmar programación', null, ['boton-principal']); enviar.type = 'submit'
      formulario.append(elemento('small', ['ayuda'], 'Dejá la fecha vacía para usar la próxima ejecución disponible.'), fecha, enviar)
      formulario.addEventListener('submit', (evento) => {
        evento.preventDefault()
        const programadaPara = fecha.value ? new Date(fecha.value).toISOString() : null
        ejecutar(async () => { await pedir(`/api/cms/comunicaciones/campanas/${campana.id}/programar`, { method: 'POST', body: JSON.stringify({ programada_para: programadaPara }) }); completarMedicionUX('enviar_campana') }, 'Campaña agregada a la cola de envío.')
      })
      desplegable.append(resumen, formulario)
      acciones.appendChild(desplegable)
    }
    if (!['enviada', 'cancelada'].includes(campana.estado)) acciones.appendChild(boton('Cancelar', () => {
      if (!window.confirm('¿Cancelar esta campaña y retirar sus correos pendientes?')) return
      ejecutar(() => pedir(`/api/cms/comunicaciones/campanas/${campana.id}/cancelar`, { method: 'POST', body: '{}' }), 'Campaña cancelada.')
    }))
    return acciones
  }

  const formularioCampana = () => {
    const formulario = elemento('form', ['cms-panel', 'cms-comunicaciones-nueva'])
    formulario.append(elemento('p', ['cms-kicker'], 'Nuevo mensaje'), elemento('h2', [], 'Crear campaña'))
    const titulo = Object.assign(document.createElement('input'), { required: true, maxLength: 191, placeholder: 'Uso interno, por ejemplo Agenda de setiembre' })
    const asunto = Object.assign(document.createElement('input'), { required: true, maxLength: 191, placeholder: 'Asunto que verá la audiencia' })
    const contenido = Object.assign(document.createElement('textarea'), { required: true, maxLength: 50000, rows: 8, placeholder: 'Escribí el mensaje en texto claro. La baja se agrega automáticamente.' })
    const temas = elemento('fieldset', ['cms-comunicaciones-temas'])
    temas.appendChild(elemento('legend', [], 'Audiencia por intereses'))
    TEMAS_COMUNICACION.forEach((tema, indice) => {
      const fila = elemento('label', ['cms-comunicaciones-tema'])
      const control = Object.assign(document.createElement('input'), { type: 'checkbox', value: tema, checked: indice === 0 })
      fila.append(control, document.createTextNode(ETIQUETAS_TEMAS[tema]))
      temas.appendChild(fila)
    })
    const guardar = boton('Guardar borrador', null, ['boton-principal']); guardar.type = 'submit'
    formulario.append(campoFormulario('Nombre interno', titulo), campoFormulario('Asunto del correo', asunto), campoFormulario('Contenido', contenido), temas, guardar)
    formulario.addEventListener('submit', (evento) => {
      evento.preventDefault()
      const seleccionados = [...temas.querySelectorAll('input:checked')].map((control) => control.value)
      ejecutar(() => pedir('/api/cms/comunicaciones/campanas', { method: 'POST', body: JSON.stringify({ titulo: titulo.value, asunto: asunto.value, contenido_texto: contenido.value, temas: seleccionados }) }), 'Borrador guardado.')
    })
    return formulario
  }

  const listaCampanas = () => {
    const seccion = elemento('section', ['cms-comunicaciones-contenido'])
    seccion.appendChild(formularioCampana())
    const lista = elemento('div', ['cms-comunicaciones-lista'])
    lista.append(elemento('h2', [], 'Campañas'), elemento('p', ['ayuda'], 'Una persona crea, otra aprueba y recién después se puede programar.'))
    if (!datos.campanas.length) lista.appendChild(elemento('p', ['cms-vacio'], 'Todavía no hay campañas.'))
    datos.campanas.forEach((campana) => {
      const tarjeta = elemento('article', ['cms-comunicaciones-tarjeta'])
      const temas = (() => { try { return JSON.parse(campana.temas_json || '[]') } catch { return [] } })()
      tarjeta.append(
        conHijos('div', ['cms-comunicaciones-tarjeta-cabecera'], [
          conHijos('div', [], [elemento('span', ['cms-etiqueta', `estado-${campana.estado}`], estadoLegible(campana.estado)), elemento('h3', [], campana.titulo)]),
          elemento('small', [], temas.map((tema) => ETIQUETAS_TEMAS[tema] || tema).join(' · ')),
        ]),
        elemento('strong', [], campana.asunto),
        elemento('p', ['cms-comunicaciones-extracto'], campana.contenido_texto),
        elemento('small', ['ayuda'], `Creada por ${campana.creado_por}${campana.aprobado_por ? `. Aprobada por ${campana.aprobado_por}` : ''}.`),
        accionesCampana(campana),
      )
      lista.appendChild(tarjeta)
    })
    seccion.appendChild(lista)
    return seccion
  }

  const listaContactos = () => {
    const seccion = elemento('section', ['cms-panel', 'cms-comunicaciones-lista'])
    const buscador = Object.assign(document.createElement('input'), { type: 'search', value: busqueda, placeholder: 'Buscar por nombre o correo' })
    buscador.setAttribute('aria-label', 'Buscar contactos')
    buscador.addEventListener('input', () => {
      busqueda = buscador.value
      guardarVista()
      restaurarFocoBusqueda = true
      clearTimeout(temporizadorBusqueda)
      temporizadorBusqueda = setTimeout(async () => {
        try { await recargar(1); errorActual = '' } catch (error) { errorActual = error.message }
        pintar()
      }, 250)
    })
    const filtros = elemento('div', ['cms-comunicaciones-filtros'])
    const selectorFiltro = (etiqueta, opciones, valor, alCambiar) => {
      const control = document.createElement('select')
      control.setAttribute('aria-label', etiqueta)
      opciones.forEach(([clave, texto]) => control.appendChild(new Option(texto, clave)))
      control.value = valor
      control.addEventListener('change', () => { alCambiar(control.value); guardarVista(); pintar() })
      return campoFormulario(etiqueta, control)
    }
    const origenes = [...new Set(datos.contactos.map((contacto) => contacto.consentimiento_fuente || contacto.fuente_ultima).filter(Boolean))].sort()
    filtros.append(
      selectorFiltro('Estado de consentimiento', [['todos', 'Todos los estados'], ['activo', 'Consentimiento activo'], ['pendiente', 'Pendiente de confirmación'], ['baja', 'Baja'], ['rebotado', 'Rebotado'], ['bloqueado', 'Bloqueado']], filtroEstado, (valor) => { filtroEstado = valor }),
      selectorFiltro('Tema', [['todos', 'Todos los temas'], ...TEMAS_COMUNICACION.map((tema) => [tema, ETIQUETAS_TEMAS[tema]])], filtroTema, (valor) => { filtroTema = valor }),
      selectorFiltro('Origen', [['todos', 'Todos los orígenes'], ...origenes.map((origen) => [origen, origen])], filtroOrigen, (valor) => { filtroOrigen = valor }),
      selectorFiltro('Última actividad', [['todas', 'Cualquier actividad'], ['30', 'Últimos 30 días'], ['90', 'Últimos 90 días'], ['antiguos', 'Sin actividad reciente']], filtroActividad, (valor) => { filtroActividad = valor }),
    )
    const limpiar = boton('Limpiar filtros', () => { busqueda = ''; filtroEstado = 'todos'; filtroTema = 'todos'; filtroOrigen = 'todos'; filtroActividad = 'todas'; guardarVista(); pintar() }, ['boton-secundario'])
    filtros.appendChild(limpiar)
    seccion.append(elemento('h2', [], 'Contactos con consentimiento'), buscador, filtros)
    const termino = busqueda.trim().toLocaleLowerCase('es-UY')
    const ahora = Date.now()
    const contactos = datos.contactos.filter((contacto) => {
      const origen = contacto.consentimiento_fuente || contacto.fuente_ultima || ''
      const fechaActividad = Date.parse(contacto.actualizado_en || contacto.ultima_actividad || contacto.consentimiento_en || '')
      const dias = Number.isFinite(fechaActividad) ? (ahora - fechaActividad) / 86_400_000 : Number.POSITIVE_INFINITY
      const coincideActividad = filtroActividad === 'todas' || (filtroActividad === 'antiguos' ? dias > 90 : dias <= Number(filtroActividad))
      return (!termino || `${contacto.nombre} ${contacto.correo}`.toLocaleLowerCase('es-UY').includes(termino))
        && (filtroEstado === 'todos' || contacto.estado === filtroEstado)
        && (filtroTema === 'todos' || contacto.temas.includes(filtroTema))
        && (filtroOrigen === 'todos' || origen === filtroOrigen)
        && coincideActividad
    })
    const resultado = elemento('p', ['cms-comunicaciones-resultados'], `${contactos.length} de ${datos.contactos.length} contactos en esta página`)
    resultado.setAttribute('role', 'status')
    resultado.setAttribute('aria-live', 'polite')
    seccion.appendChild(resultado)
    if (!contactos.length) seccion.appendChild(elemento('p', ['cms-vacio'], 'No hay contactos que coincidan.'))
    contactos.forEach((contacto) => {
      const tarjeta = elemento('article', ['cms-comunicaciones-contacto'])
      const identidad = elemento('div', ['cms-comunicaciones-identidad'])
      identidad.append(elemento('strong', [], contacto.nombre || 'Sin nombre'), elemento('span', [], contacto.correo), elemento('small', [], `Origen: ${contacto.consentimiento_fuente || contacto.fuente_ultima || 'sin registrar'}`))
      const estado = elemento('span', ['cms-etiqueta', `estado-${contacto.estado}`], estadoLegible(contacto.estado))
      const preferencias = elemento('div', ['cms-comunicaciones-preferencias'])
      TEMAS_COMUNICACION.forEach((tema) => {
        const fila = elemento('label', ['cms-comunicaciones-tema'])
        const control = Object.assign(document.createElement('input'), { type: 'checkbox', value: tema, checked: contacto.temas.includes(tema), disabled: contacto.estado !== 'activo' })
        fila.append(control, document.createTextNode(ETIQUETAS_TEMAS[tema]))
        preferencias.appendChild(fila)
      })
      const acciones = elemento('div', ['cms-acciones', 'cms-comunicaciones-acciones'])
      if (contacto.estado === 'activo') acciones.appendChild(boton('Guardar temas', () => {
        const temas = [...preferencias.querySelectorAll('input:checked')].map((control) => control.value)
        ejecutar(() => pedir(`/api/cms/comunicaciones/contactos/${contacto.id}`, { method: 'PATCH', body: JSON.stringify({ temas }) }), 'Preferencias actualizadas.')
      }))
      if (!['baja', 'bloqueado'].includes(contacto.estado)) {
        const desplegable = elemento('details', ['cms-comunicaciones-accion-desplegable'])
        const resumen = elemento('summary', ['boton', 'boton-secundario'], 'Registrar baja')
        const formulario = elemento('form', ['cms-comunicaciones-accion-formulario'])
        const motivo = Object.assign(document.createElement('textarea'), { required: true, minLength: 5, maxLength: 300, rows: 3, placeholder: 'Motivo verificable de la baja' })
        const guardar = boton('Confirmar baja', null, ['boton-principal']); guardar.type = 'submit'
        formulario.append(motivo, guardar)
        formulario.addEventListener('submit', (evento) => {
          evento.preventDefault()
          ejecutar(() => pedir(`/api/cms/comunicaciones/contactos/${contacto.id}/baja`, { method: 'POST', body: JSON.stringify({ motivo: motivo.value }) }), 'Baja registrada y envíos pendientes retirados.')
        })
        desplegable.append(resumen, formulario)
        acciones.appendChild(desplegable)
      }
      tarjeta.append(identidad, estado, preferencias, acciones)
      seccion.appendChild(tarjeta)
    })
    const paginacion = datos.paginacion_contactos || { pagina: 1, paginas: 1, total: contactos.length }
    const pie = elemento('nav', ['cms-comunicaciones-paginacion'])
    pie.setAttribute('aria-label', 'Páginas de contactos')
    const anterior = boton('Anterior', async () => { try { await recargar(Math.max(1, paginacion.pagina - 1)); pintar() } catch (error) { errorActual = error.message; pintar() } })
    anterior.disabled = paginacion.pagina <= 1
    const siguiente = boton('Siguiente', async () => { try { await recargar(Math.min(paginacion.paginas, paginacion.pagina + 1)); pintar() } catch (error) { errorActual = error.message; pintar() } })
    siguiente.disabled = paginacion.pagina >= paginacion.paginas
    pie.append(anterior, elemento('span', [], `Página ${paginacion.pagina} de ${paginacion.paginas}. ${paginacion.total} contactos.`), siguiente)
    seccion.appendChild(pie)
    return seccion
  }

  const listaEnvios = () => {
    const seccion = elemento('section', ['cms-panel', 'cms-comunicaciones-lista'])
    seccion.append(elemento('h2', [], 'Envíos y errores'), elemento('p', ['ayuda'], 'La cola reintenta fallos transitorios y vuelve a comprobar la lista de bajas justo antes de enviar.'))
    if (!datos.eventos.length) seccion.appendChild(elemento('p', ['cms-vacio'], 'Todavía no hay entregas registradas.'))
    datos.eventos.forEach((evento) => {
      seccion.appendChild(conHijos('article', ['cms-comunicaciones-evento'], [
        elemento('span', ['cms-etiqueta'], estadoLegible(evento.tipo)),
        conHijos('div', [], [elemento('strong', [], evento.asunto || 'Correo del sistema'), elemento('small', [], `${evento.ocurrido_en} · ${evento.detalle || evento.proveedor}`)]),
      ]))
    })
    return seccion
  }

  const pintar = () => {
    vaciar(raiz)
    const activos = datos.contactos.filter((contacto) => contacto.estado === 'activo').length
    const pendientes = datos.contactos.filter((contacto) => contacto.estado === 'pendiente').length
    const bajas = datos.contactos.filter((contacto) => contacto.estado === 'baja').length
    const colaPorEstado = Object.fromEntries(datos.cola.map((fila) => [fila.estado, Number(fila.cantidad || 0)]))
    const encabezado = elemento('header', ['cms-encabezado', 'cms-comunicaciones-encabezado'])
    encabezado.append(elemento('p', ['cms-kicker'], 'Relación con la comunidad'), elemento('h1', [], 'Comunicaciones'), elemento('p', [], 'Contactos, consentimiento y campañas en un solo lugar.'))
    const privacidad = elemento('section', ['cms-comunicaciones-privacidad'])
    privacidad.append(elemento('strong', [], 'Audiencia confirmada'), elemento('p', [], 'Solo se envía a correos activos, con temas habilitados y sin una baja registrada. Los datos de cada formulario permanecen separados.'))
    const indicadores = elemento('section', ['cms-indicadores', 'cms-comunicaciones-indicadores'])
    ;[[activos, 'Activos'], [pendientes, 'Por confirmar'], [bajas, 'Bajas'], [colaPorEstado.pendiente || 0, 'En cola'], [colaPorEstado.fallido || 0, 'Con error']].forEach(([cantidad, etiqueta]) => indicadores.appendChild(conHijos('div', ['cms-indicador'], [elemento('strong', [], String(cantidad)), elemento('span', [], etiqueta)])))
    const transporte = elemento('section', ['cms-comunicaciones-transporte', datos.transporte.lista_para_enviar ? 'configurado' : 'pendiente'])
    transporte.append(
      elemento('strong', [], datos.transporte.lista_para_enviar ? 'Correo listo para programar envíos.' : datos.transporte.smtp_configurado ? 'SMTP configurado, faltan verificaciones.' : 'SMTP todavía no configurado.'),
      elemento('p', [], datos.transporte.lista_para_enviar ? 'El gestor confirmó la cuenta, el dominio, los límites, la entrega y la baja.' : 'Podés preparar campañas. La programación permanecerá protegida hasta completar Operaciones.'),
      boton('Abrir operaciones', () => alIrA('cms-operaciones'), ['boton-secundario']),
    )
    const navegacion = elemento('nav', ['cms-comunicaciones-pestanas'])
    ;[['contactos', 'Contactos'], ['campanas', 'Campañas'], ['envios', 'Envíos']].forEach(([clave, etiqueta]) => {
      const control = boton(etiqueta, () => { pestana = clave; guardarVista(); pintar() }, [pestana === clave ? 'boton-principal' : 'boton-secundario'])
      control.setAttribute('aria-pressed', String(pestana === clave)); navegacion.appendChild(control)
    })
    const estado = elemento('div', ['cms-comunicaciones-estado'])
    estado.setAttribute('role', errorActual ? 'alert' : 'status')
    if (errorActual || mensaje) estado.textContent = errorActual || mensaje
    raiz.append(encabezado, privacidad, indicadores, transporte, navegacion, estado, pestana === 'contactos' ? listaContactos() : pestana === 'campanas' ? listaCampanas() : listaEnvios())
    if (restaurarFocoBusqueda && pestana === 'contactos') {
      const campo = raiz.querySelector('input[type="search"]')
      campo?.focus()
      campo?.setSelectionRange?.(campo.value.length, campo.value.length)
      restaurarFocoBusqueda = false
    }
  }

  pintar()
  recargar(1).then(() => pintar()).catch((error) => { errorActual = error.message; pintar() })
  return { destruir() { clearTimeout(temporizadorBusqueda) } }
}
