import { ficha, boton, elemento, vaciar } from './componentes.js'
import { activos } from '../modelo/roster.js'
import {
  asignarVoluntario, quitarVoluntario, contarPendientes, filaDe, editarGrupo,
  quitarDeLista, volverALaLista,
} from '../modelo/lista.js'
import { crearPila } from '../modelo/deshacer.js'
import { formatearFechaLarga } from '../util/fechas.js'

export function crearPantallaLista(raiz, { lista, roster, alCambiar, alCambiarFecha }) {
  const pila = crearPila(lista)
  let seleccionado = null
  let areaVoluntarios = null

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
    seleccionado = seleccionado === id ? null : id
    dibujar()
    // Con una sola columna en el telefono, los voluntarios quedan mas abajo:
    // los acercamos para no obligar a buscarlos.
    if (seleccionado) areaVoluntarios?.scrollIntoView?.({ block: 'nearest' })
  }

  function alTocarVoluntario(id) {
    if (!seleccionado) return
    const yaEsta = filaDe(estado(), seleccionado).voluntarios.includes(id)
    const siguiente = yaEsta
      ? quitarVoluntario(estado(), seleccionado, id)
      : asignarVoluntario(estado(), seleccionado, id)
    pila.registrar(siguiente)
    seleccionado = null
    alCambiar(siguiente)
    dibujar()
  }

  function actualizar(cambios) {
    const siguiente = { ...estado(), ...cambios }
    pila.registrar(siguiente)
    alCambiar(siguiente)
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

    caja.appendChild(campo('Fecha', 'date', 'fecha', estado().fecha, (valor) => {
      if (!valor) return
      // La lista se guarda por fecha, asi que cambiarla significa abrir otra lista.
      // Quien nos usa decide si hay una guardada o hay que empezar de cero.
      if (alCambiarFecha) alCambiarFecha(valor)
      else actualizar({ fecha: valor })
    }))
    caja.appendChild(elemento('p', ['fecha-larga'], formatearFechaLarga(estado().fecha)))

    caja.appendChild(campo('Hora', 'time', 'hora', estado().hora, (valor) => actualizar({ hora: valor })))
    caja.appendChild(campo('Lugar', 'text', 'lugar', estado().lugar, (valor) => actualizar({ lugar: valor })))
    return caja
  }

  function barra() {
    const barra = elemento('div', ['barra'])
    const deshacer = boton('Deshacer', () => {
      pila.deshacer()
      seleccionado = null
      alCambiar(estado())
      dibujar()
    })
    deshacer.dataset.accion = 'deshacer'
    deshacer.disabled = !pila.sePuedeDeshacer()

    const rehacer = boton('Rehacer', () => {
      pila.rehacer()
      seleccionado = null
      alCambiar(estado())
      dibujar()
    })
    rehacer.dataset.accion = 'rehacer'
    rehacer.disabled = !pila.sePuedeRehacer()

    barra.append(deshacer, rehacer)
    return barra
  }

  function editarRotulo(numeroGrupo, cambios) {
    const siguiente = editarGrupo(estado(), numeroGrupo, cambios)
    pila.registrar(siguiente)
    alCambiar(siguiente)
    dibujar()
  }

  // Cada cambio redibuja la pantalla entera, y el <details> recreado nace cerrado.
  // Anotamos cuales estaban abiertos leyendo el DOM vivo justo antes de vaciarlo,
  // en vez de llevar una copia aparte que se pueda desincronizar: asi vale igual
  // si el bloque se abrio con el dedo, con el teclado o buscando en la pagina.
  let gruposAbiertos = new Set()

  function recordarAbiertos() {
    gruposAbiertos = new Set(
      [...raiz.querySelectorAll('.editar-grupo[open]')].map((d) => Number(d.dataset.grupo)),
    )
  }

  // Los rotulos casi nunca cambian, asi que van plegados: si estuvieran sueltos en
  // el encabezado competirian con las fichas, que es lo que se toca todos los sabados.
  function editorDeGrupo(grupo) {
    const plegable = elemento('details', ['editar-grupo'])
    plegable.dataset.grupo = String(grupo.numero)
    plegable.open = gruposAbiertos.has(grupo.numero)
    plegable.appendChild(elemento('summary', ['editar-grupo-titulo'], 'Editar grupo'))
    plegable.appendChild(campo('Título', 'text', `titulo-grupo-${grupo.numero}`, grupo.titulo,
      (valor) => editarRotulo(grupo.numero, { titulo: valor })))
    plegable.appendChild(campo('Edades', 'text', `subtitulo-grupo-${grupo.numero}`, grupo.subtitulo,
      (valor) => editarRotulo(grupo.numero, { subtitulo: valor })))
    plegable.appendChild(campo('Cancha', 'text', `cancha-grupo-${grupo.numero}`, grupo.cancha,
      (valor) => editarRotulo(grupo.numero, { cancha: valor })))
    return plegable
  }

  function dibujarGrupo(grupo) {
    const caja = elemento('section', ['grupo'])
    const encabezado = elemento('header', ['grupo-encabezado'])
    encabezado.appendChild(elemento('h2', [], `${grupo.titulo} · ${grupo.subtitulo}`))

    const cuenta = contarPendientes(estado(), grupo.numero, roster)
    encabezado.appendChild(elemento('p', ['pendientes'],
      `${cuenta.participantesSinVoluntario} sin acompañante · ${cuenta.voluntariosSinAsignar} voluntarios libres`))
    encabezado.appendChild(editorDeGrupo(grupo))
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
      })
    })

    caja.appendChild(columna)
    return caja
  }

  // Una sola lista de voluntarios para toda la pantalla: repetirla en cada grupo
  // obligaba a pasar dos veces por los mismos nombres en el telefono.
  function dibujarVoluntarios() {
    const caja = elemento('section', ['voluntarios'])
    caja.appendChild(elemento('h2', [], 'Voluntarios'))

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

    caja.appendChild(columna)
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
      alCambiar(siguiente)
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
        alCambiar(siguiente)
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
    areaVoluntarios = dibujarVoluntarios()
    raiz.appendChild(areaVoluntarios)
    const ausentes = dibujarAusentes()
    if (ausentes) raiz.appendChild(ausentes)
    if (seleccionado) raiz.appendChild(barraSeleccion())
  }

  dibujar()
  return { lista: estado, redibujar: dibujar }
}
