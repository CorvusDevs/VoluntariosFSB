import { boton, elemento, vaciar } from './componentes.js'

const ETIQUETAS_ESTADO = Object.freeze({
  saludable: 'Disponible', advertencia: 'Revisar', critico: 'Interrumpido', pendiente: 'Pendiente',
  confirmado: 'Confirmado', bloqueado: 'Bloqueado', abierto: 'Abierto', resuelto: 'Resuelto',
  completada: 'Completada', fallida: 'Fallida', omitida: 'Sin cambios', procesando: 'En curso',
})

async function pedir(ruta, opciones = {}) {
  const respuesta = await fetch(ruta, {
    headers: { accept: 'application/json', ...(opciones.body ? { 'content-type': 'application/json' } : {}) },
    ...opciones,
  })
  const datos = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) {
    const referencia = datos.referencia || respuesta.headers.get('x-request-id')
    throw new Error(`${datos.error || 'No se pudo completar la operación.'}${referencia ? ` Referencia: ${referencia}.` : ''}`)
  }
  return datos
}

function estadoLegible(estado) {
  return ETIQUETAS_ESTADO[estado] || estado || 'Sin datos'
}

function fechaLegible(valor) {
  if (!valor) return 'Sin fecha'
  const fecha = new Date(String(valor).replace(' ', 'T'))
  if (Number.isNaN(fecha.getTime())) return String(valor)
  return new Intl.DateTimeFormat('es-UY', { dateStyle: 'short', timeStyle: 'short' }).format(fecha)
}

function conHijos(etiqueta, clases, hijos) {
  const nodo = elemento(etiqueta, clases)
  nodo.append(...hijos)
  return nodo
}

export function crearPantallaOperaciones(contenedor, { alIrA = () => {} } = {}) {
  const raiz = elemento('main', ['cms', 'cms-operaciones'])
  contenedor.appendChild(raiz)
  let datos = null
  let cargando = true
  let mensaje = ''
  let errorActual = ''

  const cargar = async () => {
    cargando = true
    errorActual = ''
    pintar()
    try { datos = await pedir('/api/cms/operaciones') } catch (error) { errorActual = error.message }
    cargando = false
    pintar()
  }

  const ejecutar = async (operacion, confirmacion) => {
    mensaje = ''
    errorActual = ''
    try {
      await operacion()
      mensaje = confirmacion
      datos = await pedir('/api/cms/operaciones')
    } catch (error) { errorActual = error.message }
    pintar()
  }

  const tarjetaIntegracion = (integracion, indice) => {
    const tarjeta = elemento('article', ['cms-operaciones-integracion', `estado-${integracion.estado || 'pendiente'}`])
    tarjeta.style.setProperty('--orden-integracion', String(indice))
    const estado = elemento('span', ['cms-operaciones-estado', `estado-${integracion.estado || 'pendiente'}`], estadoLegible(integracion.estado))
    tarjeta.append(
      conHijos('div', ['cms-operaciones-integracion-cabecera'], [elemento('span', ['cms-operaciones-nodo'], String(indice + 1).padStart(2, '0')), estado]),
      elemento('h2', [], integracion.nombre),
      elemento('p', [], integracion.detalle),
    )
    if (integracion.clave === 'correo') tarjeta.appendChild(boton('Abrir comunicaciones', () => alIrA('cms-comunicaciones'), ['boton-secundario']))
    return tarjeta
  }

  const controlesOperativos = () => {
    const seccion = elemento('section', ['cms-panel', 'cms-operaciones-controles'])
    seccion.append(elemento('p', ['cms-kicker'], 'Preparación permanente'), elemento('h2', [], 'Controles de infraestructura'), elemento('p', ['ayuda'], 'Cada confirmación debe dejar evidencia. Así el sistema conserva lo aprendido aunque cambie la persona responsable.'))
    const lista = elemento('div', ['cms-operaciones-lista-controles'])
    datos.controles.forEach((control) => {
      const detalle = elemento('details', ['cms-operaciones-control', `estado-${control.estado}`])
      const resumen = elemento('summary', ['cms-operaciones-control-resumen'])
      resumen.append(
        conHijos('span', [], [elemento('strong', [], control.titulo), elemento('small', [], control.descripcion)]),
        elemento('span', ['cms-operaciones-estado', `estado-${control.estado}`], estadoLegible(control.estado)),
      )
      detalle.appendChild(resumen)
      if (control.evidencia || control.detalle) detalle.appendChild(elemento('p', ['cms-operaciones-evidencia'], control.evidencia || control.detalle))
      if (control.actualizado_en) detalle.appendChild(elemento('small', ['ayuda'], `Última revisión: ${fechaLegible(control.actualizado_en)}${control.actualizado_por ? ` por ${control.actualizado_por}` : ''}.`))
      if (datos.acceso.puede_administrar) {
        const formulario = elemento('form', ['cms-operaciones-control-formulario'])
        const estado = document.createElement('select')
        ;[['pendiente', 'Pendiente'], ['confirmado', 'Confirmado'], ['bloqueado', 'Bloqueado']].forEach(([valor, etiqueta]) => {
          const opcion = new Option(etiqueta, valor, false, control.estado === valor)
          estado.appendChild(opcion)
        })
        const nota = Object.assign(document.createElement('textarea'), { rows: 3, maxLength: 2000, value: control.evidencia || control.detalle || '', placeholder: 'Evidencia, resultado o impedimento concreto' })
        const guardar = boton('Guardar verificación', null, ['boton-principal'])
        guardar.type = 'submit'
        formulario.append(estado, nota, guardar)
        formulario.addEventListener('submit', (evento) => {
          evento.preventDefault()
          ejecutar(() => pedir(`/api/cms/operaciones/controles/${control.clave}`, {
            method: 'PATCH', body: JSON.stringify({ estado: estado.value, evidencia: nota.value, detalle: nota.value }),
          }), 'Control actualizado.')
        })
        detalle.appendChild(formulario)
      }
      lista.appendChild(detalle)
    })
    seccion.appendChild(lista)
    return seccion
  }

  const incidentes = () => {
    const seccion = elemento('section', ['cms-panel', 'cms-operaciones-incidentes'])
    seccion.append(elemento('p', ['cms-kicker'], 'Recuperación'), elemento('h2', [], 'Incidentes y correos con error'))
    const abiertos = datos.incidentes.filter((incidente) => incidente.estado === 'abierto')
    if (!abiertos.length && !datos.correosFallidos.length) seccion.appendChild(elemento('p', ['cms-vacio'], 'No hay incidentes abiertos ni correos esperando intervención.'))
    abiertos.forEach((incidente) => {
      const tarjeta = elemento('article', ['cms-operaciones-incidente', `severidad-${incidente.severidad}`])
      tarjeta.append(
        conHijos('div', ['cms-operaciones-incidente-cabecera'], [elemento('strong', [], incidente.titulo), elemento('span', ['cms-operaciones-estado', 'estado-critico'], estadoLegible(incidente.estado))]),
        elemento('p', [], incidente.detalle),
        elemento('small', ['ayuda'], `${incidente.fuente}. Detectado ${fechaLegible(incidente.detectado_en)}. ${incidente.ocurrencias || 1} ocurrencia${Number(incidente.ocurrencias || 1) === 1 ? '' : 's'}.`),
      )
      if (datos.acceso.puede_administrar) tarjeta.appendChild(boton('Marcar resuelto', () => ejecutar(() => pedir(`/api/cms/operaciones/incidentes/${incidente.id}/resolver`, { method: 'POST', body: '{}' }), 'Incidente resuelto.')))
      seccion.appendChild(tarjeta)
    })
    datos.correosFallidos.forEach((correo) => {
      const tarjeta = elemento('article', ['cms-operaciones-incidente', 'severidad-advertencia'])
      tarjeta.append(
        conHijos('div', ['cms-operaciones-incidente-cabecera'], [elemento('strong', [], correo.asunto || 'Correo sin asunto'), elemento('span', ['cms-operaciones-estado', 'estado-advertencia'], `${correo.intentos || 0} intentos`)]),
        elemento('p', [], `${correo.destinatario}. ${correo.ultimo_error || 'No se registró el detalle del error.'}`),
      )
      if (datos.acceso.puede_administrar) tarjeta.appendChild(boton('Reintentar correo', () => ejecutar(() => pedir(`/api/cms/operaciones/correos/${correo.id}/reintentar`, { method: 'POST', body: '{}' }), 'Correo devuelto a la cola.')))
      seccion.appendChild(tarjeta)
    })
    return seccion
  }

  const historial = () => {
    const seccion = elemento('section', ['cms-panel', 'cms-operaciones-historial'])
    seccion.append(elemento('p', ['cms-kicker'], 'Trazabilidad'), elemento('h2', [], 'Últimas ejecuciones'))
    if (!datos.ejecuciones.length) seccion.appendChild(elemento('p', ['cms-vacio'], 'Todavía no hay ejecuciones registradas.'))
    datos.ejecuciones.slice(0, 12).forEach((ejecucion) => {
      seccion.appendChild(conHijos('article', ['cms-operaciones-ejecucion'], [
        conHijos('div', [], [elemento('strong', [], ejecucion.trabajo.replaceAll('_', ' ')), elemento('small', [], fechaLegible(ejecucion.iniciada_en))]),
        elemento('span', ['cms-operaciones-estado', `estado-${ejecucion.estado}`], estadoLegible(ejecucion.estado)),
        elemento('small', [], `${Number(ejecucion.exitos || 0)} correctos, ${Number(ejecucion.reintentados || 0)} reintentos, ${Number(ejecucion.fallidos || 0)} fallidos.`),
      ]))
    })
    return seccion
  }

  const pintar = () => {
    vaciar(raiz)
    const encabezado = elemento('header', ['cms-encabezado', 'cms-operaciones-encabezado'])
    encabezado.append(elemento('p', ['cms-kicker'], 'Sistema institucional'), elemento('h1', [], 'Centro de operaciones'), elemento('p', [], 'Integraciones, automatizaciones y recuperación en un solo lugar.'))
    const acciones = elemento('div', ['cms-acciones'])
    const actualizar = boton(cargando ? 'Actualizando' : 'Actualizar estado', cargar, ['boton-secundario'])
    actualizar.disabled = cargando
    acciones.appendChild(actualizar)
    encabezado.appendChild(acciones)
    raiz.appendChild(encabezado)
    const estado = elemento('div', ['cms-operaciones-mensaje'])
    estado.setAttribute('role', errorActual ? 'alert' : 'status')
    estado.textContent = errorActual || mensaje
    raiz.appendChild(estado)
    if (cargando && !datos) {
      raiz.appendChild(elemento('p', ['cms-panel', 'cms-cargando'], 'Comprobando sistemas...'))
      return
    }
    if (!datos) {
      const recuperacion = elemento('section', ['cms-panel', 'cms-operaciones-recuperacion'])
      recuperacion.append(elemento('h2', [], 'No pudimos leer el estado'), elemento('p', [], 'Usá la referencia del error para buscar el registro exacto y volvé a intentar.'), boton('Reintentar', cargar, ['boton-principal']))
      raiz.appendChild(recuperacion)
      return
    }
    const foco = elemento('section', ['cms-operaciones-foco', datos.resumen.incidentesAbiertos || datos.resumen.fallidosCola ? 'requiere-atencion' : 'estable'])
    foco.append(
      conHijos('div', [], [elemento('span', ['cms-operaciones-pulso']), elemento('strong', [], datos.resumen.incidentesAbiertos || datos.resumen.fallidosCola ? 'Hay acciones pendientes' : 'El circuito está estable')]),
      elemento('p', [], `${datos.resumen.integracionesConAtencion} integraciones por revisar, ${datos.resumen.pendientesCola} correos en cola y ${datos.resumen.incidentesAbiertos} incidentes abiertos.`),
      elemento('small', [], `Versión activa: ${datos.version || 'sin informar'}`),
    )
    const circuito = elemento('section', ['cms-operaciones-circuito'])
    circuito.setAttribute('aria-label', 'Estado de las integraciones')
    datos.integraciones.forEach((integracion, indice) => circuito.appendChild(tarjetaIntegracion(integracion, indice)))
    const indicadores = elemento('section', ['cms-indicadores', 'cms-operaciones-indicadores'])
    ;[[datos.indicadores.formularios_activos, 'Formularios activos'], [datos.indicadores.entradas_abiertas, 'Respuestas abiertas'], [datos.indicadores.contactos_activos, 'Contactos activos'], [datos.indicadores.privacidad_pendiente, 'Privacidad pendiente']].forEach(([valor, etiqueta]) => indicadores.appendChild(conHijos('div', ['cms-indicador'], [elemento('strong', [], String(valor)), elemento('span', [], etiqueta)])))
    raiz.append(foco, circuito, indicadores, controlesOperativos(), incidentes(), historial())
  }

  pintar()
  cargar()
  return { destruir() {} }
}
