import { elemento, boton, vaciar } from './componentes.js'
import { leerRegistro, hora } from '../acceso/registro.js'
import { esAdmin } from '../acceso/usuarios.js'

// Quien toco que y cuando. Solo para administracion.
//
// Importante y no obvio: esto lo cierra la interfaz, no el almacenamiento. Todas
// las usuarias comparten el mismo token de GitHub, cifrado con la contraseña de
// cada una, asi que cualquiera que entre puede leer el repositorio privado
// entero por su cuenta. Sirve para saber quien hizo que entre gente que trabaja
// junta, no para esconderle algo a alguien.
export function crearPantallaRegistro(raiz, { sesion, cliente, cantidad = 60 }) {
  let dias = null
  let error = ''
  let cargando = false

  async function cargar() {
    cargando = true
    error = ''
    dibujar()
    try {
      dias = await leerRegistro(cliente, { cantidad })
    } catch (fallo) {
      error = fallo.message
    } finally {
      cargando = false
      dibujar()
    }
  }

  function entrada(item) {
    const fila = elemento('li', ['registro-entrada'])
    fila.append(
      elemento('span', ['registro-hora'], hora(item.fecha)),
      elemento('span', ['registro-accion'], item.accion),
      elemento('span', ['registro-quien'], item.quien ?? 'sin registrar'),
    )
    if (!item.quien) fila.classList.add('sin-autor')
    return fila
  }

  function dibujar() {
    vaciar(raiz)
    const caja = elemento('section', ['seccion', 'registro'])
    caja.appendChild(elemento('h2', [], 'Registro de actividad'))

    if (!esAdmin(sesion)) {
      caja.appendChild(elemento('p', ['ayuda-token'],
        'Esta pantalla es solo para administración.'))
      raiz.appendChild(caja)
      return
    }

    caja.appendChild(elemento('p', ['campo-ayuda'],
      'Cada cambio guardado deja una marca con quién lo hizo y cuándo. '
      + 'Las entradas sin nombre son anteriores a que se empezara a registrarlo.'))

    const recargar = boton(cargando ? 'Buscando...' : 'Actualizar', () => { if (!cargando) cargar() })
    recargar.dataset.accion = 'recargar-registro'
    recargar.disabled = cargando
    caja.appendChild(recargar)

    if (error) {
      const aviso = elemento('p', ['error-ingreso'], error)
      aviso.setAttribute('role', 'alert')
      caja.appendChild(aviso)
    } else if (dias === null) {
      caja.appendChild(elemento('p', ['campo-ayuda'], 'Buscando el registro...'))
    } else if (dias.length === 0) {
      caja.appendChild(elemento('p', ['campo-ayuda'], 'Todavía no hay nada registrado.'))
    } else {
      dias.forEach((dia) => {
        caja.appendChild(elemento('h3', ['registro-dia'], dia.titulo))
        const lista = elemento('ul', ['registro-lista'])
        dia.entradas.forEach((item) => lista.appendChild(entrada(item)))
        caja.appendChild(lista)
      })
    }
    raiz.appendChild(caja)
  }

  dibujar()
  if (esAdmin(sesion)) cargar()
  return { redibujar: dibujar, recargar: cargar, dias: () => dias }
}
