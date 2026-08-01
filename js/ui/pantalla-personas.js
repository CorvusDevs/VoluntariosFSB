import { elemento, boton, vaciar } from './componentes.js'
import { activos, agregarParticipante, agregarVoluntario, desactivarPersona, editarPersona } from '../modelo/roster.js'
import { procesarFoto } from './fotos.js'

export function crearPantallaPersonas(raiz, { roster, almacen, alCambiar }) {
  let actual = roster

  async function guardar(siguiente) {
    actual = siguiente
    await almacen.guardarRoster(actual)
    alCambiar(actual)
    dibujar()
  }

  function formulario(tipo) {
    const caja = elemento('form', ['formulario'])
    const nombre = document.createElement('input')
    nombre.type = 'text'
    nombre.required = true
    nombre.placeholder = tipo === 'participante' ? 'Nombre del participante' : 'Nombre del voluntario'
    caja.appendChild(nombre)

    let grupo
    if (tipo === 'participante') {
      grupo = document.createElement('select')
      grupo.innerHTML = '<option value="1">Grupo 1</option><option value="2">Grupo 2</option>'
      caja.appendChild(grupo)
    }

    let nuevo
    if (tipo === 'voluntario') {
      const etiqueta = elemento('label', [], '')
      nuevo = document.createElement('input')
      nuevo.type = 'checkbox'
      etiqueta.append(nuevo, document.createTextNode(' Es nuevo'))
      caja.appendChild(etiqueta)
    }

    const enviar = document.createElement('button')
    enviar.type = 'submit'
    enviar.className = 'boton'
    enviar.textContent = 'Agregar'
    caja.appendChild(enviar)

    caja.addEventListener('submit', async (evento) => {
      evento.preventDefault()
      if (!nombre.value.trim()) return
      const siguiente = tipo === 'participante'
        ? agregarParticipante(actual, { nombre: nombre.value, grupo: Number(grupo.value) })
        : agregarVoluntario(actual, { nombre: nombre.value, nuevo: nuevo.checked })
      nombre.value = ''
      await guardar(siguiente)
    })
    return caja
  }

  function filaPersona(persona, tipo) {
    const fila = elemento('div', ['fila-persona'])
    fila.dataset.id = persona.id
    fila.appendChild(elemento('span', ['fila-nombre'], persona.nombre))
    if (persona.nuevo) fila.appendChild(elemento('span', ['pastilla'], 'nuevo'))

    const foto = document.createElement('input')
    foto.type = 'file'
    foto.accept = 'image/*'
    foto.className = 'entrada-foto'
    foto.addEventListener('change', async () => {
      const archivo = foto.files?.[0]
      if (!archivo) return
      const blob = await procesarFoto(archivo)
      const clave = `${persona.id}.jpg`
      await almacen.guardarFoto(clave, blob)
      await guardar(editarPersona(actual, persona.id, { foto: clave }))
    })
    fila.appendChild(foto)

    fila.appendChild(boton('Quitar', async () => {
      if (!confirm(`¿Quitar a ${persona.nombre} de las listas nuevas? Las listas anteriores no cambian.`)) return
      await guardar(desactivarPersona(actual, persona.id))
    }))
    return fila
  }

  function dibujar() {
    vaciar(raiz)
    const seccionP = elemento('section', ['seccion'])
    seccionP.appendChild(elemento('h2', [], 'Participantes'))
    seccionP.appendChild(formulario('participante'))
    activos(actual.participantes).forEach((p) => seccionP.appendChild(filaPersona(p, 'participante')))

    const seccionV = elemento('section', ['seccion'])
    seccionV.appendChild(elemento('h2', [], 'Voluntarios'))
    seccionV.appendChild(formulario('voluntario'))
    activos(actual.voluntarios).forEach((v) => seccionV.appendChild(filaPersona(v, 'voluntario')))

    raiz.append(seccionP, seccionV)
  }

  dibujar()
  return { roster: () => actual, redibujar: dibujar }
}
