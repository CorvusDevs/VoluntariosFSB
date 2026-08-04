import { ficha, boton, botonIcono, elemento, vaciar } from './componentes.js'
import { activos } from '../modelo/roster.js'
import {
  asignarVoluntario, quitarVoluntario, contarPendientes, filaDe, editarGrupo,
  quitarDeLista, volverALaLista, agregarApoyo, quitarApoyo,
} from '../modelo/lista.js'
import { crearPila } from '../modelo/deshacer.js'
import { formatearFechaLarga } from '../util/fechas.js'

export function crearPantallaLista(raiz, { lista, roster, alCambiar, alCambiarFecha }) {
  const pila = crearPila(lista)
  let seleccionado = null
  // Cuando se esta eligiendo el apoyo de un grupo, guarda su numero. Reusa el
  // mismo gesto de dos toques que el resto: primero el destino, despues quien.
  let apoyoDe = null
  function estado() { return pila.actual() }

  function voluntariosAsignados() {
    return new Set(estado().grupos.flatMap((g) =>
      [...g.filas.flatMap((f) => f.voluntarios), ...g.apoyo]))
  }

  function nombreDe(id) {
    const gente = [...roster.participantes, ...roster.voluntarios]
    return gente.find((p) => p.id === id)?.nombre ?? ''
  }

  function alTocarParticipante(id) {
    apoyoDe = null
    seleccionado = seleccionado === id ? null : id
    dibujar()
    if (seleccionado) acercarElegidor()
  }

  // El elegidor ya nace al lado de lo que se toco; esto solo lo termina de
  // entrar en pantalla cuando quedo justo pisando el borde de abajo.
  function acercarElegidor() {
    raiz.querySelector('.elegidor')?.scrollIntoView?.({ block: 'nearest' })
  }

  function alTocarVoluntario(id) {
    if (apoyoDe !== null) {
      const grupo = estado().grupos.find((g) => g.numero === apoyoDe)
      const siguiente = agregarApoyo(estado(), apoyoDe, id)
      pila.registrar(siguiente)
      apoyoDe = null
      alCambiar(siguiente, `Sumar a ${nombreDe(id)} como apoyo del ${grupo?.titulo ?? 'grupo'}`)
      dibujar()
      return
    }
    if (!seleccionado) return
    const yaEsta = filaDe(estado(), seleccionado).voluntarios.includes(id)
    const siguiente = yaEsta
      ? quitarVoluntario(estado(), seleccionado, id)
      : asignarVoluntario(estado(), seleccionado, id)
    pila.registrar(siguiente)
    const quien = nombreDe(seleccionado)
    seleccionado = null
    alCambiar(siguiente, yaEsta
      ? `Quitar a ${nombreDe(id)} de ${quien}`
      : `Asignar a ${nombreDe(id)} con ${quien}`)
    dibujar()
  }

  // Los rotulos son los del formulario, asi el registro dice "Cambiar la hora"
  // y no "Cambiar hora", que es como se llama el campo por dentro.
  const ROTULOS = { fecha: 'la fecha', hora: 'la hora', lugar: 'el lugar' }

  function actualizar(cambios) {
    const siguiente = { ...estado(), ...cambios }
    pila.registrar(siguiente)
    const que = Object.keys(cambios).map((c) => ROTULOS[c] ?? c).join(' y ')
    alCambiar(siguiente, `Cambiar ${que} de la jornada`)
    dibujar()
  }

  function campo(rotulo, tipo, nombre, valor, alCambiarValor) {
    const caja = elemento('label', ['campo'])
    caja.appendChild(elemento('span', ['campo-rotulo'], rotulo))
    const entrada = document.createElement('input')
    entrada.type = tipo
    entrada.dataset.campo = nombre
    // Lugares, titulos y canchas son nombres propios: en el telefono conviene
    // que arranquen en mayuscula solos y que el corrector no los toque.
    if (tipo === 'text') {
      entrada.setAttribute('autocapitalize', 'words')
      entrada.setAttribute('autocorrect', 'off')
      entrada.setAttribute('spellcheck', 'false')
    }
    entrada.value = valor
    entrada.addEventListener('change', () => alCambiarValor(entrada.value))
    caja.appendChild(entrada)
    return caja
  }

  function encabezado() {
    const caja = elemento('header', ['encabezado-lista'])

    // Un solo campo de fecha. El rotulo lleva la fecha escrita en español porque
    // el control nativo la muestra en el idioma del telefono, y en iOS sale en
    // ingles. Asi no hacen falta dos campos para lo mismo.
    caja.appendChild(campo(formatearFechaLarga(estado().fecha), 'date', 'fecha', estado().fecha, (valor) => {
      if (!valor) return
      // La lista se guarda por fecha, asi que cambiarla significa abrir otra lista.
      // Quien nos usa decide si hay una guardada o hay que empezar de cero.
      if (alCambiarFecha) alCambiarFecha(valor)
      else actualizar({ fecha: valor })
    }))

    caja.appendChild(campo('Hora', 'time', 'hora', estado().hora, (valor) => actualizar({ hora: valor })))
    caja.appendChild(campo('Lugar', 'text', 'lugar', estado().lugar, (valor) => actualizar({ lugar: valor })))
    return caja
  }

  function barra() {
    const barra = elemento('div', ['barra'])
    const deshacer = boton('Deshacer', () => {
      pila.deshacer()
      seleccionado = null
      alCambiar(estado(), 'Deshacer el último cambio')
      dibujar()
    })
    deshacer.dataset.accion = 'deshacer'
    deshacer.disabled = !pila.sePuedeDeshacer()

    const rehacer = boton('Rehacer', () => {
      pila.rehacer()
      seleccionado = null
      alCambiar(estado(), 'Rehacer el cambio deshecho')
      dibujar()
    })
    rehacer.dataset.accion = 'rehacer'
    rehacer.disabled = !pila.sePuedeRehacer()

    barra.append(deshacer, rehacer)
    return barra
  }

  function editarRotulo(numeroGrupo, cambios) {
    const grupo = estado().grupos.find((g) => g.numero === numeroGrupo)
    const siguiente = editarGrupo(estado(), numeroGrupo, cambios)
    pila.registrar(siguiente)
    alCambiar(siguiente, `Cambiar el rótulo del ${grupo?.titulo ?? `grupo ${numeroGrupo}`}`)
    dibujar()
  }

  // Cada cambio redibuja la pantalla entera, y el <details> recreado nace cerrado.
  // Anotamos cuales estaban abiertos leyendo el DOM vivo justo antes de vaciarlo,
  // en vez de llevar una copia aparte que se pueda desincronizar: asi vale igual
  // si el bloque se abrio con el dedo, con el teclado o buscando en la pagina.
  let gruposAbiertos = new Set()

  function recordarAbiertos() {
    gruposAbiertos = new Set(
      [...raiz.querySelectorAll('.editar-grupo:not([hidden])')].map((d) => Number(d.dataset.grupo)),
    )
  }

  // Los rotulos casi nunca cambian, asi que van plegados: si estuvieran sueltos en
  // el encabezado competirian con las fichas, que es lo que se toca todos los sabados.
  function editorDeGrupo(grupo) {
    const panel = elemento('div', ['editar-grupo'])
    panel.dataset.grupo = String(grupo.numero)
    panel.hidden = !gruposAbiertos.has(grupo.numero)
    panel.appendChild(campo('Título', 'text', `titulo-grupo-${grupo.numero}`, grupo.titulo,
      (valor) => editarRotulo(grupo.numero, { titulo: valor })))
    panel.appendChild(campo('Edades', 'text', `subtitulo-grupo-${grupo.numero}`, grupo.subtitulo,
      (valor) => editarRotulo(grupo.numero, { subtitulo: valor })))
    panel.appendChild(campo('Cancha', 'text', `cancha-grupo-${grupo.numero}`, grupo.cancha,
      (valor) => editarRotulo(grupo.numero, { cancha: valor })))
    return panel
  }

  function dibujarGrupo(grupo) {
    const caja = elemento('section', ['grupo'])
    const encabezado = elemento('header', ['grupo-encabezado'])

    // El lapiz va al lado del titulo y no debajo: ocupaba un renglon entero
    // para algo que casi nunca se toca.
    const linea = elemento('div', ['grupo-titulo'])
    linea.appendChild(elemento('h2', [], `${grupo.titulo} · ${grupo.subtitulo}`))
    const panel = editorDeGrupo(grupo)
    const lapiz = botonIcono('lapiz', `Editar el rótulo del ${grupo.titulo}`, () => {
      panel.hidden = !panel.hidden
      lapiz.setAttribute('aria-expanded', String(!panel.hidden))
      lapiz.classList.toggle('activo', !panel.hidden)
    })
    lapiz.dataset.accion = `editar-grupo-${grupo.numero}`
    lapiz.setAttribute('aria-expanded', String(!panel.hidden))
    if (!panel.hidden) lapiz.classList.add('activo')
    linea.appendChild(lapiz)
    encabezado.appendChild(linea)

    const cuenta = contarPendientes(estado(), grupo.numero, roster)
    encabezado.appendChild(elemento('p', ['pendientes'],
      `${cuenta.participantesSinVoluntario} sin acompañante · ${cuenta.voluntariosSinAsignar} voluntarios libres`))
    encabezado.appendChild(panel)
    caja.appendChild(encabezado)

    const columna = elemento('div', ['columna', 'columna-participantes'])
    const porId = new Map([...roster.participantes, ...roster.voluntarios].map((p) => [p.id, p]))

    grupo.filas.forEach((fila) => {
      fila.participantes.forEach((id) => {
        const persona = porId.get(id)
        const detalle = fila.voluntarios.map((v) => porId.get(v)?.nombre).filter(Boolean).join(' / ')
        const el = ficha(persona, { seleccionada: seleccionado === id, detalle })
        el.addEventListener('click', () => alTocarParticipante(id))
        columna.appendChild(el)
        if (seleccionado === id) {
          columna.appendChild(elegidor(`Elegí quién acompaña a ${persona?.nombre ?? ''}`))
        }
      })
    })

    caja.appendChild(columna)
    caja.appendChild(areaApoyo(grupo))
    return caja
  }

  // El apoyo no acompaña a un chico en particular: esta para todo el grupo, y
  // en la imagen sale en su propia linea. Se elige con el mismo gesto de dos
  // toques: primero "Sumar apoyo", despues el voluntario.
  function areaApoyo(grupo) {
    const caja = elemento('div', ['apoyo-grupo'])
    caja.appendChild(elemento('span', ['apoyo-rotulo'], 'Apoyo'))
    const porId = new Map(roster.voluntarios.map((v) => [v.id, v]))
    ;(grupo.apoyo ?? []).forEach((id) => {
      const persona = porId.get(id)
      if (!persona) return
      const el = ficha(persona, { seleccionada: true, detalle: 'Tocá para quitar' })
      el.classList.add('quitable')
      el.dataset.accion = `quitar-apoyo-${grupo.numero}`
      el.addEventListener('click', () => {
        const siguiente = quitarApoyo(estado(), grupo.numero, id)
        pila.registrar(siguiente)
        alCambiar(siguiente, `Quitar a ${persona.nombre} del apoyo del ${grupo.titulo}`)
        dibujar()
      })
      caja.appendChild(el)
    })
    const sumar = boton(apoyoDe === grupo.numero ? 'Elegí quién' : 'Sumar apoyo', () => {
      seleccionado = null
      apoyoDe = apoyoDe === grupo.numero ? null : grupo.numero
      dibujar()
      if (apoyoDe !== null) acercarElegidor()
    })
    sumar.dataset.accion = `sumar-apoyo-${grupo.numero}`
    if (apoyoDe === grupo.numero) sumar.classList.add('activo')
    caja.appendChild(sumar)
    if (apoyoDe === grupo.numero) caja.appendChild(elegidor(`Elegí el apoyo de ${grupo.titulo}`))
    return caja
  }

  // Las fichas de voluntario se arman aparte porque salen en dos lugares: al pie
  // como plantel completo, y colgadas del participante que se acaba de tocar.
  function columnaDeVoluntarios() {
    const columna = elemento('div', ['columna', 'columna-voluntarios'])
    const asignados = voluntariosAsignados()
    // Quienes ya acompañan al participante seleccionado se marcan aparte y dicen
    // que tocarlos los quita. Sin esto se veian igual que los asignados a otro
    // chico, nadie adivinaba que el segundo toque desasigna, y se terminaba
    // apilando voluntarios sobre el mismo participante sin poder deshacerlo.
    const delSeleccionado = seleccionado
      ? new Set(filaDe(estado(), seleccionado).voluntarios)
      : new Set()

    activos(roster.voluntarios).forEach((voluntario) => {
      const acompania = delSeleccionado.has(voluntario.id)
      const el = ficha(voluntario, acompania
        ? { seleccionada: true, detalle: 'Tocá para quitar' }
        : { atenuada: asignados.has(voluntario.id) })
      if (acompania) el.classList.add('quitable')
      el.addEventListener('click', () => alTocarVoluntario(voluntario.id))
      columna.appendChild(el)
    })
    return columna
  }

  // El elegidor se abre justo debajo de lo que se toco. Antes habia que bajar
  // hasta el final de la pagina por cada asignacion y volver a subir para la
  // siguiente, que en el telefono era la mitad del trabajo.
  function elegidor(titulo) {
    const caja = elemento('div', ['elegidor'])
    caja.appendChild(elemento('p', ['elegidor-titulo'], titulo))
    caja.appendChild(columnaDeVoluntarios())
    return caja
  }

  // El plantel completo al pie, para mirar quien esta libre sin elegir a nadie.
  function dibujarVoluntarios() {
    const caja = elemento('section', ['voluntarios'])
    caja.appendChild(elemento('h2', [], 'Voluntarios'))
    caja.appendChild(columnaDeVoluntarios())
    return caja
  }

  function barraApoyo() {
    const caja = elemento('div', ['barra-seleccion'])
    const grupo = estado().grupos.find((g) => g.numero === apoyoDe)
    caja.appendChild(elemento('span', ['barra-seleccion-texto'],
      `Elegí el apoyo de ${grupo?.titulo ?? 'el grupo'}`))
    const cancelar = boton('Cancelar', () => {
      apoyoDe = null
      dibujar()
    })
    cancelar.dataset.accion = 'cancelar-apoyo'
    caja.appendChild(cancelar)
    return caja
  }

  function barraSeleccion() {
    const caja = elemento('div', ['barra-seleccion'])
    caja.appendChild(elemento('span', ['barra-seleccion-texto'], `Asignando a ${nombreDe(seleccionado)}`))

    const acciones = elemento('div', ['barra-seleccion-acciones'])
    // No siempre van los mismos chicos, asi que sacar a alguien de la jornada
    // tiene que estar donde ya lo tenes elegido, no en otra pantalla.
    const sacar = boton(`Hoy no viene`, () => {
      const quien = seleccionado
      const siguiente = quitarDeLista(estado(), quien)
      pila.registrar(siguiente)
      seleccionado = null
      alCambiar(siguiente, `Marcar que ${nombreDe(quien)} hoy no viene`)
      dibujar()
    })
    sacar.dataset.accion = 'sacar-de-lista'

    const cancelar = boton('Cancelar', () => {
      seleccionado = null
      dibujar()
    })
    cancelar.dataset.accion = 'cancelar'

    acciones.append(sacar, cancelar)
    caja.appendChild(acciones)
    return caja
  }

  // Los que hoy no vienen quedan a la vista, para poder devolverlos de un toque
  // si aparecen. Si no hay ninguno, la seccion no se dibuja.
  function dibujarAusentes() {
    const ausentes = (estado().ausentes ?? [])
      .map((id) => roster.participantes.find((p) => p.id === id))
      .filter((p) => p && p.activo)
    if (ausentes.length === 0) return null

    const caja = elemento('section', ['ausentes'])
    caja.appendChild(elemento('h2', [], 'Hoy no vienen'))
    const columna = elemento('div', ['columna', 'columna-ausentes'])
    ausentes.forEach((persona) => {
      const el = ficha(persona, { atenuada: true, detalle: 'Tocá para sumarlo' })
      el.dataset.accion = 'volver-a-lista'
      el.addEventListener('click', () => {
        const siguiente = volverALaLista(estado(), persona.id, roster)
        pila.registrar(siguiente)
        alCambiar(siguiente, `Devolver a ${persona.nombre} a la planilla`)
        dibujar()
      })
      columna.appendChild(el)
    })
    caja.appendChild(columna)
    return caja
  }

  function dibujar() {
    recordarAbiertos()
    vaciar(raiz)
    raiz.appendChild(encabezado())
    raiz.appendChild(barra())
    // Los grupos van envueltos para poder ponerlos en una columna aparte de los
    // voluntarios en pantalla ancha. En el telefono el envoltorio no hace nada.
    const grupos = elemento('div', ['grupos'])
    estado().grupos.forEach((grupo) => grupos.appendChild(dibujarGrupo(grupo)))
    raiz.appendChild(grupos)
    if (!seleccionado && apoyoDe === null) raiz.appendChild(dibujarVoluntarios())
    const ausentes = dibujarAusentes()
    if (ausentes) raiz.appendChild(ausentes)
    if (seleccionado) raiz.appendChild(barraSeleccion())
    else if (apoyoDe !== null) raiz.appendChild(barraApoyo())
  }

  dibujar()
  return { lista: estado, redibujar: dibujar }
}
