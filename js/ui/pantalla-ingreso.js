import { boton, elemento, vaciar } from './componentes.js'
import { ingresar } from '../acceso/sesion.js'

// Quien pega el token crudo es, por definición, la persona dueña del
// repositorio: no hay otra forma de tenerlo. Entra como administradora y con
// este nombre, que es el que después firma los cambios en el historial.
const NOMBRE_DUENIA = 'Administración'
const USUARIO_DUENIA = 'duenio'

function campo(rotulo, tipo, nombre, atributos = {}) {
  const caja = elemento('label', ['campo'])
  caja.appendChild(elemento('span', ['campo-rotulo'], rotulo))
  const entrada = document.createElement('input')
  entrada.type = tipo
  entrada.dataset.campo = nombre
  // Solo atributos: el valor se toca por propiedad, nunca por atributo, para
  // que ninguna contraseña termine escrita en el HTML.
  Object.entries(atributos).forEach(([clave, valor]) => entrada.setAttribute(clave, valor))
  caja.appendChild(entrada)
  return { caja, entrada }
}

export function crearPantallaIngreso(raiz, { alEntrar, leerArchivo, alSeguirSinIngresar }) {
  // Un solo envío por vez. Deshabilitar el botón no alcanza: el formulario se
  // puede enviar con Enter mientras el foco está en un campo.
  let ocupado = false

  const error = elemento('p', ['error-ingreso'])
  error.setAttribute('role', 'alert')

  const usuario = campo('Usuario', 'text', 'usuario', {
    autocomplete: 'username',
    autocapitalize: 'none',
    autocorrect: 'off',
    spellcheck: 'false',
  })
  const contrasena = campo('Contraseña', 'password', 'contrasena', { autocomplete: 'current-password' })

  const recordar = document.createElement('input')
  recordar.type = 'checkbox'
  recordar.dataset.campo = 'recordar'
  const opcionRecordar = elemento('label', ['opcion'])
  opcionRecordar.append(recordar, document.createTextNode(' Recordarme en este dispositivo'))

  const entrar = elemento('button', ['boton', 'boton-principal'], 'Entrar')
  entrar.type = 'submit'
  entrar.dataset.accion = 'entrar'

  const formulario = elemento('form', ['formulario-ingreso'])
  formulario.append(usuario.caja, contrasena.caja, opcionRecordar, entrar)

  const token = campo('Token de GitHub', 'password', 'token', { autocomplete: 'off' })
  const entrarToken = elemento('button', ['boton'], 'Entrar con el token')
  entrarToken.type = 'submit'
  entrarToken.dataset.accion = 'entrar-token'
  const formularioToken = elemento('form', ['formulario-token'])
  formularioToken.append(token.caja, entrarToken)

  const detalleToken = elemento('details', ['ingreso-token'])
  detalleToken.append(
    elemento('summary', [], 'Entrar con un token de GitHub'),
    elemento('p', ['ayuda-token'],
      'La primera vez, cuando todavía no hay nadie en la lista, quien administra el repositorio entra pegando su token de GitHub.'),
    formularioToken,
  )

  function avisar(texto) {
    error.textContent = texto
  }

  // Envuelve cualquier intento de ingreso: bloquea, avisa, y deja todo como
  // estaba pase lo que pase.
  async function intentar(control, etiqueta, accion) {
    if (ocupado) return
    ocupado = true
    control.disabled = true
    control.textContent = 'Entrando...'
    avisar('')
    try {
      await accion()
    } catch (fallo) {
      avisar(fallo.message)
    } finally {
      ocupado = false
      control.disabled = false
      control.textContent = etiqueta
    }
  }

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault()
    intentar(entrar, 'Entrar', async () => {
      if (!usuario.entrada.value.trim() || !contrasena.entrada.value) {
        throw new Error('Escribí tu usuario y tu contraseña.')
      }
      const archivo = await leerArchivo()
      // El mensaje de usuario inexistente y el de contraseña equivocada salen
      // los dos de sesion.js, y son el mismo a propósito.
      const sesion = await ingresar({
        archivo,
        usuario: usuario.entrada.value,
        contrasena: contrasena.entrada.value,
      })
      await alEntrar({ ...sesion, recordar: recordar.checked })
    })
  })

  formularioToken.addEventListener('submit', (evento) => {
    evento.preventDefault()
    intentar(entrarToken, 'Entrar con el token', async () => {
      const pegado = token.entrada.value.trim()
      if (!pegado) throw new Error('Pegá el token de GitHub.')
      // Sin descifrado: el token ya está en la mano, no hay nada que abrir.
      await alEntrar({
        token: pegado,
        nombre: NOMBRE_DUENIA,
        usuario: USUARIO_DUENIA,
        rol: 'admin',
        recordar: recordar.checked,
      })
    })
  })

  function dibujar() {
    vaciar(raiz)
    const caja = elemento('section', ['ingreso'])
    caja.append(
      elemento('h1', ['titulo-ingreso'], 'Futbol sin Barreras'),
      elemento('p', ['ayuda-ingreso'],
        'La contraseña te la entrega quien administra la aplicación. No se elige: la genera la aplicación sola.'),
      formulario,
      error,
      detalleToken,
    )
    // Una sola persona en un solo teléfono no necesita nada de esto: la
    // aplicación funciona igual guardando en el dispositivo. El ingreso es
    // para compartir los datos, no un peaje para usarla.
    if (alSeguirSinIngresar) {
      const salida = elemento('div', ['sin-ingresar'])
      const seguir = boton('Seguir sin ingresar', () => alSeguirSinIngresar())
      seguir.dataset.accion = 'sin-ingresar'
      salida.append(
        seguir,
        elemento('p', ['ayuda-token'],
          'Los datos quedan solo en este dispositivo y no se comparten con nadie.'),
      )
      caja.appendChild(salida)
    }
    raiz.appendChild(caja)
  }

  dibujar()
  return { error: () => error.textContent, redibujar: dibujar }
}
