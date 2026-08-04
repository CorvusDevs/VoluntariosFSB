import { elemento, boton, vaciar } from './componentes.js'
import { activos, agregarParticipante, agregarVoluntario, desactivarPersona, editarPersona } from '../modelo/roster.js'
import { crearEditorDeFoto } from './editor-foto.js'

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
    nombre.setAttribute('autocapitalize', 'words')
    nombre.setAttribute('autocorrect', 'off')
    nombre.setAttribute('spellcheck', 'false')
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

  // Para la vista previa hace falta alguien del otro lado: si estoy editando a un
  // chico, un voluntario que se le superponga, y al reves. Se elige el primero
  // que tenga foto cargada, que es el que mejor muestra como queda el medallon.
  async function acompananteDeMuestra(tipo) {
    const lista = tipo === 'participante' ? actual.voluntarios : actual.participantes
    const candidatos = activos(lista)
    const persona = candidatos.find((p) => p.foto) ?? candidatos[0]
    if (!persona) return null
    let imagen = null
    if (persona.foto) {
      try {
        const blob = await almacen.leerFoto(persona.foto)
        if (blob) imagen = await createImageBitmap(blob)
      } catch {
        imagen = null
      }
    }
    return { nombre: persona.nombre, nuevo: persona.nuevo, foto: persona.foto, imagen }
  }

  function filaPersona(persona, tipo) {
    const fila = elemento('div', ['fila-persona'])
    fila.dataset.id = persona.id

    // El nombre es editable en el lugar: se escriben mal, cambian de apodo, y
    // obligar a dar de baja y volver a crear perderia la foto y el historial.
    const nombre = document.createElement('input')
    nombre.type = 'text'
    nombre.className = 'fila-nombre'
    nombre.dataset.campo = 'nombre'
    nombre.value = persona.nombre
    nombre.setAttribute('aria-label', `Nombre de ${persona.nombre}`)
    nombre.setAttribute('autocapitalize', 'words')
    nombre.setAttribute('autocorrect', 'off')
    nombre.setAttribute('spellcheck', 'false')
    nombre.addEventListener('change', async () => {
      const valor = nombre.value.trim()
      if (!valor || valor === persona.nombre) {
        nombre.value = persona.nombre
        return
      }
      await guardar(editarPersona(actual, persona.id, { nombre: valor }))
    })
    fila.appendChild(nombre)

    // Tanto voluntarios como participantes pueden ser nuevos: en la imagen sale
    // la pastilla, que es lo que le avisa al resto que todavia no se conocen.
    const marcaNueva = elemento('label', ['marca-nuevo'])
    const casilla = document.createElement('input')
    casilla.type = 'checkbox'
    casilla.dataset.campo = 'nuevo'
    casilla.checked = Boolean(persona.nuevo)
    casilla.addEventListener('change', async () => {
      await guardar(editarPersona(actual, persona.id, { nuevo: casilla.checked }))
    })
    marcaNueva.append(casilla, document.createTextNode(' Nuevo'))
    fila.appendChild(marcaNueva)

    // El control nativo de archivo dibuja su propio texto en ingles ("Choose File"),
    // asi que lo escondemos sin sacarlo del arbol y le ponemos una etiqueta en español.
    const etiquetaFoto = elemento('label', ['boton', 'boton-foto'], persona.foto ? 'Cambiar foto' : 'Foto')
    const foto = document.createElement('input')
    foto.type = 'file'
    foto.accept = 'image/*'
    foto.className = 'oculto-visualmente'
    foto.addEventListener('change', async () => {
      const archivo = foto.files?.[0]
      if (!archivo) return
      // Antes se guardaba el recorte centrado sin preguntar, y si la cara caia
      // fuera del centro no habia forma de arreglarlo salvo recortar el archivo
      // aparte y volver a subirlo.
      const mapa = await createImageBitmap(archivo)
      crearEditorDeFoto({
        mapa,
        persona,
        tipo,
        acompanante: await acompananteDeMuestra(tipo),
        alGuardar: async (blob) => {
          const clave = `${persona.id}.jpg`
          await almacen.guardarFoto(clave, blob)
          await guardar(editarPersona(actual, persona.id, { foto: clave }))
        },
        alCancelar: () => { foto.value = '' },
      })
    })
    etiquetaFoto.appendChild(foto)
    fila.appendChild(etiquetaFoto)

    // Solo cuando hay algo que quitar. Antes la unica salida era subir otra foto
    // encima, asi que una foto mala se quedaba hasta conseguir un reemplazo.
    if (persona.foto) {
      const quitarFoto = boton('Quitar foto', async () => {
        if (!confirm(`¿Quitar la foto de ${persona.nombre}? En la planilla vuelven las iniciales.`)) return
        const clave = persona.foto
        // Primero se suelta la referencia, que es lo que pidio quien toca el
        // boton. El archivo se borra despues y si eso falla queda huerfano, que
        // molesta mucho menos que ver la foto seguir apareciendo.
        await guardar(editarPersona(actual, persona.id, { foto: null }))
        try {
          await almacen.borrarFoto(clave)
        } catch {
          // Sin foto en pantalla igual: el archivo suelto no le hace mal a nadie.
        }
      })
      quitarFoto.dataset.accion = 'quitar-foto'
      fila.appendChild(quitarFoto)
    }

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
