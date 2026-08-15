import { boton, elemento, vaciar } from './componentes.js'

const ROLES = { admin: 'Administradora', coordinacion: 'Coordinadora' }

async function pedir(url, opciones = {}) {
  const respuesta = await fetch(url, {
    ...opciones,
    headers: { 'content-type': 'application/json', ...(opciones.headers ?? {}) },
  })
  const datos = await respuesta.json()
  if (!respuesta.ok) throw new Error(datos.error || 'No se pudo cambiar el acceso.')
  return datos
}

export function crearPantallaAccesosCloudflare(raiz, { sesion }) {
  let usuarios = []
  let error = ''
  let contrasenaNueva = null
  let cargando = true

  async function cargar() {
    cargando = true
    error = ''
    dibujar()
    try {
      usuarios = (await pedir('/api/usuarios')).usuarios
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
    const rol = document.createElement('select')
    Object.entries(ROLES).forEach(([valor, texto]) => {
      const opcion = document.createElement('option')
      opcion.value = valor
      opcion.textContent = texto
      rol.appendChild(opcion)
    })
    rol.value = 'coordinacion'
    const enviar = boton('Dar acceso', async () => {
      enviar.disabled = true
      try {
        contrasenaNueva = await pedir('/api/usuarios', {
          method: 'POST', body: JSON.stringify({ nombre: nombre.value, usuario: usuario.value, rol: rol.value }),
        })
        await cargar()
      } catch (fallo) {
        error = fallo.message
        dibujar()
      }
    }, ['boton', 'boton-principal'])
    enviar.type = 'submit'
    const forma = document.createElement('form')
    forma.className = 'formulario-agregar'
    forma.append(nombre, usuario, rol, enviar)
    forma.addEventListener('submit', (evento) => {
      evento.preventDefault()
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
    const lista = elemento('div', ['lista-personas'])
    usuarios.forEach((usuario) => {
      const fila = elemento('div', ['persona-fila'])
      fila.append(
        elemento('strong', [], usuario.nombre),
        elemento('span', ['ayuda-ajustes'], `${usuario.correo} · ${ROLES[usuario.rol]}`),
      )
      if (usuario.correo !== sesion.correo) {
        const quitar = boton('Quitar acceso', async () => {
          try {
            await pedir(`/api/usuarios?correo=${encodeURIComponent(usuario.correo)}`, { method: 'DELETE' })
            await cargar()
          } catch (fallo) {
            error = fallo.message
            dibujar()
          }
        })
        fila.appendChild(quitar)
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
