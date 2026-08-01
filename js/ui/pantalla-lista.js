import { ficha, boton, elemento, vaciar } from './componentes.js'
import { activos } from '../modelo/roster.js'
import { asignarVoluntario, quitarVoluntario, contarPendientes, filaDe } from '../modelo/lista.js'
import { crearPila } from '../modelo/deshacer.js'

export function crearPantallaLista(raiz, { lista, roster, alCambiar }) {
  const pila = crearPila(lista)
  let seleccionado = null

  function estado() { return pila.actual() }

  function voluntariosAsignados() {
    return new Set(estado().grupos.flatMap((g) =>
      [...g.filas.flatMap((f) => f.voluntarios), ...g.apoyo]))
  }

  function alTocarParticipante(id) {
    seleccionado = seleccionado === id ? null : id
    dibujar()
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

  function dibujarGrupo(grupo) {
    const caja = elemento('section', ['grupo'])
    const encabezado = elemento('header', ['grupo-encabezado'])
    encabezado.appendChild(elemento('h2', [], `${grupo.titulo} · ${grupo.subtitulo}`))

    const cuenta = contarPendientes(estado(), grupo.numero, roster)
    encabezado.appendChild(elemento('p', ['pendientes'],
      `${cuenta.participantesSinVoluntario} sin acompañante · ${cuenta.voluntariosSinAsignar} voluntarios libres`))
    caja.appendChild(encabezado)

    const columnas = elemento('div', ['columnas'])
    const izquierda = elemento('div', ['columna', 'columna-participantes'])
    const derecha = elemento('div', ['columna', 'columna-voluntarios'])

    const porId = new Map([...roster.participantes, ...roster.voluntarios].map((p) => [p.id, p]))

    grupo.filas.forEach((fila) => {
      fila.participantes.forEach((id) => {
        const persona = porId.get(id)
        const detalle = fila.voluntarios.map((v) => porId.get(v)?.nombre).filter(Boolean).join(' / ')
        const el = ficha(persona, { seleccionada: seleccionado === id, detalle })
        el.addEventListener('click', () => alTocarParticipante(id))
        izquierda.appendChild(el)
      })
    })

    const asignados = voluntariosAsignados()
    activos(roster.voluntarios).forEach((voluntario) => {
      const el = ficha(voluntario, { atenuada: asignados.has(voluntario.id) })
      el.addEventListener('click', () => alTocarVoluntario(voluntario.id))
      derecha.appendChild(el)
    })

    columnas.append(izquierda, derecha)
    caja.appendChild(columnas)
    return caja
  }

  function dibujar() {
    vaciar(raiz)
    raiz.appendChild(barra())
    estado().grupos.forEach((grupo) => raiz.appendChild(dibujarGrupo(grupo)))
  }

  dibujar()
  return { lista: estado, redibujar: dibujar }
}
