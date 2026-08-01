import { elemento, boton, vaciar } from './componentes.js'
import { cifrar, generarContrasena } from '../acceso/cripto.js'
import {
  ROLES, agregarUsuario, archivoVacio, cambiarRol, esAdmin, quitarUsuario,
} from '../acceso/usuarios.js'

const AVISO_ADMIN = 'Va a poder agregar y quitar personas, cambiar roles y rotar el token.'
const ROTULO_ROL = { admin: 'Administradora', coordinacion: 'Coordinadora' }

function campo(rotulo, tipo, nombre, atributos = {}) {
  const caja = elemento('label', ['campo'])
  caja.appendChild(elemento('span', ['campo-rotulo'], rotulo))
  const entrada = document.createElement('input')
  entrada.type = tipo
  entrada.dataset.campo = nombre
  // Ningun campo de credencial debe pasar por el corrector ni por la
  // mayuscula automatica del telefono: en iOS eso altera un token pegado
  // sin que se note, y el ingreso falla sin explicacion visible.
  if (tipo === 'password' || nombre === 'usuario') {
    entrada.setAttribute('autocapitalize', 'none')
    entrada.setAttribute('autocorrect', 'off')
    entrada.setAttribute('spellcheck', 'false')
  }
  Object.entries(atributos).forEach(([clave, valor]) => entrada.setAttribute(clave, valor))
  caja.appendChild(entrada)
  return { caja, entrada }
}

// Los dos roles salen de usuarios.js: la pantalla no inventa ninguno, solo les
// pone el nombre que se lee en español.
function selectorDeRol(valor, nombreDeCampo) {
  const selector = document.createElement('select')
  selector.dataset.campo = nombreDeCampo
  ROLES.forEach((rol) => {
    const opcion = document.createElement('option')
    opcion.value = rol
    opcion.textContent = ROTULO_ROL[rol]
    selector.appendChild(opcion)
  })
  selector.value = valor
  return selector
}

export function crearPantallaAjustes(raiz, opciones) {
  const { sesion, leerArchivo, guardarArchivo, alCerrarSesion, alCambiarToken } = opciones
  const confirmar = opciones.confirmar ?? ((texto) => globalThis.confirm(texto))

  let archivo = archivoVacio()
  let cargando = true
  let error = ''
  // Contraseñas recién generadas. Viven solo hasta la próxima acción: se
  // muestran una vez y no se guardan en ningún lado.
  let generadas = []
  let nuevoRol = 'coordinacion'
  let borrador = { usuario: '', nombre: '' }
  let tarea = Promise.resolve()

  // Toda acción pasa por acá: limpia el aviso anterior, tapa las contraseñas
  // que hubiera en pantalla, y si el modelo se queja muestra su mensaje tal
  // cual. Los guardias de rol viven en usuarios.js y no se repiten acá.
  function correr(accion) {
    tarea = (async () => {
      error = ''
      generadas = []
      try {
        await accion()
      } catch (fallo) {
        error = fallo.message
      }
      dibujar()
    })()
    return tarea
  }

  function cargar() {
    return correr(async () => {
      archivo = await leerArchivo()
      cargando = false
    })
  }

  function filaAcceso(registro) {
    const fila = elemento('div', ['fila-acceso'])
    fila.dataset.usuario = registro.usuario
    fila.appendChild(elemento('span', ['fila-nombre'], registro.nombre))
    fila.appendChild(elemento('span', ['fila-usuario'], registro.usuario))

    const selector = selectorDeRol(registro.rol, 'rol')
    selector.dataset.usuario = registro.usuario
    selector.addEventListener('change', () => correr(async () => {
      const siguiente = cambiarRol(archivo, registro.usuario, selector.value)
      await guardarArchivo(siguiente)
      archivo = siguiente
    }))
    fila.appendChild(selector)

    const quitar = boton('Quitar', () => correr(async () => {
      if (!confirmar(`¿Quitar a ${registro.nombre}? Va a dejar de poder entrar.`)) return
      const siguiente = quitarUsuario(archivo, registro.usuario)
      await guardarArchivo(siguiente)
      archivo = siguiente
    }))
    quitar.dataset.accion = 'quitar'
    fila.appendChild(quitar)
    return fila
  }

  function seccionPersonas() {
    const seccion = elemento('section', ['seccion'])
    seccion.appendChild(elemento('h3', [], 'Personas con acceso'))
    archivo.usuarios.forEach((registro) => seccion.appendChild(filaAcceso(registro)))
    return seccion
  }

  function seccionAgregar() {
    const seccion = elemento('section', ['seccion'])
    seccion.appendChild(elemento('h3', [], 'Agregar una persona'))

    const usuario = campo('Usuario', 'text', 'nuevo-usuario', {
      autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false',
    })
    const nombre = campo('Nombre', 'text', 'nuevo-nombre')
    usuario.entrada.value = borrador.usuario
    nombre.entrada.value = borrador.nombre

    const selector = selectorDeRol(nuevoRol, 'nuevo-rol')
    const cajaRol = elemento('label', ['campo'])
    cajaRol.appendChild(elemento('span', ['campo-rotulo'], 'Rol'))
    cajaRol.appendChild(selector)

    // Se prende y apaga sin redibujar: un redibujo borraría lo ya escrito.
    const avisoAdmin = elemento('p', ['aviso-admin'], AVISO_ADMIN)
    avisoAdmin.hidden = nuevoRol !== 'admin'
    selector.addEventListener('change', () => {
      nuevoRol = selector.value
      avisoAdmin.hidden = nuevoRol !== 'admin'
    })

    const enviar = elemento('button', ['boton', 'boton-principal'], 'Agregar')
    enviar.type = 'submit'
    enviar.dataset.accion = 'agregar'

    const formulario = elemento('form', ['formulario-agregar'])
    formulario.append(usuario.caja, nombre.caja, cajaRol, avisoAdmin, enviar)
    formulario.addEventListener('submit', (evento) => {
      evento.preventDefault()
      correr(async () => {
        const datos = { usuario: usuario.entrada.value.trim(), nombre: nombre.entrada.value.trim() }
        borrador = datos
        if (!datos.usuario || !datos.nombre) throw new Error('Hacen falta el usuario y el nombre.')
        // La contraseña la genera siempre la aplicación. No hay campo para
        // elegirla: usuarios.json es público y una elegida a mano no aguanta.
        const contrasena = generarContrasena()
        const registro = await cifrar(sesion.token, contrasena)
        const siguiente = agregarUsuario(archivo, { ...datos, rol: selector.value }, registro)
        await guardarArchivo(siguiente)
        archivo = siguiente
        borrador = { usuario: '', nombre: '' }
        nuevoRol = 'coordinacion'
        generadas = [{ ...datos, contrasena }]
      })
    })

    seccion.appendChild(formulario)
    return seccion
  }

  function seccionRotar() {
    // Va plegada y con la advertencia adentro a proposito. Rotar el token deja
    // afuera a todo el mundo a la vez, y no es algo que deba quedar a un toque
    // de distancia de las acciones cotidianas.
    const seccion = elemento('section', ['seccion'])
    const plegable = document.createElement('details')
    plegable.className = 'zona-peligro'

    const resumen = document.createElement('summary')
    resumen.className = 'zona-peligro-titulo'
    resumen.dataset.accion = 'abrir-rotar'
    resumen.append(
      elemento('span', ['zona-peligro-marca'], 'Cuidado'),
      elemento('span', [], 'Rotar el token'),
    )
    plegable.appendChild(resumen)

    plegable.appendChild(elemento('p', ['aviso', 'aviso-rotar'],
      'Esto no se puede deshacer. Al rotar el token, las contraseñas de todas las '
      + 'coordinadoras dejan de funcionar en el momento, incluida la tuya. La aplicación '
      + 'genera una nueva para cada persona y las tenés que repartir una por una antes de '
      + 'que alguien pueda volver a entrar. Hacelo solo si el token se filtró o venció.'))

    const token = campo('Token nuevo de GitHub', 'password', 'token-nuevo', { autocomplete: 'off' })
    const enviar = elemento('button', ['boton', 'boton-peligro'], 'Rotar el token')
    enviar.type = 'submit'
    enviar.dataset.accion = 'rotar'

    const formulario = elemento('form', ['formulario-rotar'])
    formulario.append(token.caja, enviar)
    formulario.addEventListener('submit', (evento) => {
      evento.preventDefault()
      correr(async () => {
        const nuevo = token.entrada.value.trim()
        if (!nuevo) throw new Error('Pegá el token nuevo de GitHub.')
        const usuarios = []
        const nuevas = []
        for (const registro of archivo.usuarios) {
          const contrasena = generarContrasena()
          const cifrado = await cifrar(nuevo, contrasena)
          usuarios.push({
            usuario: registro.usuario, nombre: registro.nombre, rol: registro.rol, ...cifrado,
          })
          nuevas.push({ usuario: registro.usuario, nombre: registro.nombre, contrasena })
        }
        const siguiente = { ...archivo, usuarios }
        await guardarArchivo(siguiente)
        archivo = siguiente
        // El token viejo queda revocado: el almacén tiene que dejar de usarlo
        // o la próxima lista que se guarde falla con un 401.
        sesion.token = nuevo
        if (alCambiarToken) await alCambiarToken(nuevo)
        generadas = nuevas
      })
    })

    plegable.appendChild(formulario)
    seccion.appendChild(plegable)
    return seccion
  }

  function cajaContrasenas() {
    const varias = generadas.length > 1
    const caja = elemento('div', ['contrasena-generada'])
    caja.appendChild(elemento('h3', [], varias ? 'Contraseñas nuevas' : 'Contraseña nueva'))
    caja.appendChild(elemento('p', ['aviso-una-vez'],
      varias
        ? 'Anotalas ahora: no se vuelven a mostrar. La aplicación no las guarda en ningún lado.'
        : 'Anotala ahora: no se vuelve a mostrar. La aplicación no la guarda en ningún lado.'))

    generadas.forEach((generada) => {
      const entrada = elemento('div', ['contrasena-entrada'])
      entrada.dataset.usuario = generada.usuario
      entrada.appendChild(elemento('span', ['contrasena-persona'],
        `${generada.nombre} (${generada.usuario})`))
      entrada.appendChild(elemento('code', ['contrasena-valor'], generada.contrasena))
      const copiar = boton('Copiar', async () => {
        try {
          await navigator.clipboard.writeText(generada.contrasena)
          copiar.textContent = 'Copiada'
        } catch {
          copiar.textContent = 'Copiala a mano'
        }
      })
      copiar.dataset.accion = 'copiar'
      entrada.appendChild(copiar)
      caja.appendChild(entrada)
    })

    caja.appendChild(elemento('p', ['aviso-propagacion'],
      varias
        ? 'Pueden tardar hasta 5 minutos en servir: GitHub guarda en caché el archivo de personas ese tiempo.'
        : 'Puede tardar hasta 5 minutos en servir: GitHub guarda en caché el archivo de personas ese tiempo.'))

    const listo = boton(varias ? 'Listo, ya las anoté' : 'Listo, ya la anoté', () => correr(async () => {}))
    listo.dataset.accion = 'ocultar-contrasena'
    caja.appendChild(listo)
    return caja
  }

  function seccionSalir() {
    const seccion = elemento('section', ['seccion'])
    seccion.appendChild(elemento('p', ['ayuda-ajustes'], `Entraste como ${sesion.nombre}.`))
    const cerrar = boton('Cerrar sesión', () => alCerrarSesion())
    cerrar.dataset.accion = 'cerrar-sesion'
    seccion.appendChild(cerrar)
    return seccion
  }

  function dibujar() {
    vaciar(raiz)
    const caja = elemento('section', ['ajustes'])
    caja.appendChild(elemento('h2', [], 'Ajustes'))

    // Quien no es administradora no ve nada con lo que pueda operar. La regla
    // se comprueba acá y además en la navegación, que ni siquiera la ofrece.
    if (!esAdmin(sesion)) {
      caja.appendChild(elemento('p', ['ayuda-ajustes'],
        'Estos ajustes son de la administración de la aplicación. Si necesitás un cambio, pedíselo a quien administra.'))
      raiz.appendChild(caja)
      return
    }

    const aviso = elemento('p', ['error-ajustes'], error)
    aviso.setAttribute('role', 'alert')
    caja.appendChild(aviso)

    if (cargando) {
      if (error) caja.appendChild(boton('Reintentar', () => cargar()))
      else caja.appendChild(elemento('p', ['ayuda-ajustes'], 'Cargando la lista de personas...'))
      raiz.appendChild(caja)
      return
    }

    if (generadas.length) caja.appendChild(cajaContrasenas())
    caja.append(seccionPersonas(), seccionAgregar(), seccionRotar(), seccionSalir())
    raiz.appendChild(caja)
  }

  dibujar()
  if (esAdmin(sesion)) cargar()

  return {
    listo: () => tarea,
    archivo: () => archivo,
    redibujar: dibujar,
  }
}
