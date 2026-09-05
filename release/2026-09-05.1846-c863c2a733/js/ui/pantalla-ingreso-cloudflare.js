import { elemento, vaciar } from './componentes.js'
import { sello } from './aviso-version.js'
import { crearSeccionCambios } from './pantalla-cambios.js'

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
  const caja = elemento('main', ['ingreso', 'ingreso-aletea'])
  const marca = elemento('header', ['ingreso-marca'])
  const logo = document.createElement('img')
  logo.src = 'assets/logo-aletea-violeta.png'
  logo.alt = 'Aletea'
  marca.append(logo, elemento('p', [], 'Gestión institucional'))
  const tarjeta = elemento('section', ['ingreso-tarjeta'])
  tarjeta.append(
    elemento('p', ['ingreso-eyebrow'], 'Bienvenida'),
    elemento('h1', ['titulo-ingreso'], 'Aletea institucional'),
    elemento('p', ['ayuda-ingreso'], 'Ingresá con tu usuario de acceso y la contraseña que te asignó la administración.'),
    formulario,
    error,
  )
  caja.append(marca, tarjeta, crearSeccionCambios({ compacto: true }), sello())
  raiz.appendChild(caja)
  return { error: () => error.textContent }
}
