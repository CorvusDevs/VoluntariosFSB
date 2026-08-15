import { elemento, vaciar } from './componentes.js'

function campo(rotulo, tipo, nombre, atributos = {}) {
  const caja = elemento('label', ['campo'])
  caja.appendChild(elemento('span', ['campo-rotulo'], rotulo))
  const entrada = document.createElement('input')
  entrada.type = tipo
  entrada.dataset.campo = nombre
  if (tipo === 'password' || nombre === 'usuario') {
    entrada.setAttribute('autocapitalize', 'none')
    entrada.setAttribute('autocorrect', 'off')
    entrada.setAttribute('spellcheck', 'false')
  }
  Object.entries(atributos).forEach(([clave, valor]) => entrada.setAttribute(clave, valor))
  caja.appendChild(entrada)
  return { caja, entrada }
}

export function crearPantallaIngresoCloudflare(raiz, { alEntrar }) {
  let ocupado = false
  const usuario = campo('Usuario', 'text', 'usuario', { autocomplete: 'username' })
  const contrasena = campo('Contraseña', 'password', 'contrasena', { autocomplete: 'current-password' })
  const error = elemento('p', ['error-ingreso'])
  error.setAttribute('role', 'alert')
  const entrar = elemento('button', ['boton', 'boton-principal'], 'Entrar')
  entrar.type = 'submit'
  entrar.dataset.accion = 'entrar'
  const formulario = elemento('form', ['formulario-ingreso'])
  formulario.append(usuario.caja, contrasena.caja, entrar)
  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    if (ocupado) return
    if (!usuario.entrada.value.trim() || !contrasena.entrada.value) {
      error.textContent = 'Escribí tu usuario y tu contraseña.'
      return
    }
    ocupado = true
    entrar.disabled = true
    entrar.textContent = 'Entrando...'
    error.textContent = ''
    try {
      await alEntrar({ usuario: usuario.entrada.value, contrasena: contrasena.entrada.value })
    } catch (fallo) {
      error.textContent = fallo.message
    } finally {
      ocupado = false
      entrar.disabled = false
      entrar.textContent = 'Entrar'
    }
  })
  vaciar(raiz)
  const caja = elemento('section', ['ingreso'])
  caja.append(
    elemento('h1', ['titulo-ingreso'], 'Fútbol sin Barreras'),
    elemento('p', ['ayuda-ingreso'], 'Ingresá con el usuario y la contraseña que te entregó la administración.'),
    formulario,
    error,
  )
  raiz.appendChild(caja)
  return { error: () => error.textContent }
}
