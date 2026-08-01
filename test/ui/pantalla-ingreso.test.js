import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { crearPantallaIngreso } from '../../js/ui/pantalla-ingreso.js'
import { archivoConUsuario } from '../acceso/ayuda-sesion.js'
import { archivoVacio } from '../../js/acceso/usuarios.js'

const CONTRASENA = 'ContrasenaDePrueba01'
const TOKEN = 'ghp_tokenDePrueba'

let raiz, archivo, entradas, pantalla

// Arma la pantalla con un lector de archivo que resuelve al toque. Las pruebas
// que necesitan mirar el estado a mitad de camino usan lectorDemorado.
function montar(opciones = {}) {
  entradas = []
  const leerArchivo = opciones.leerArchivo ?? (async () => archivo)
  pantalla = crearPantallaIngreso(raiz, {
    leerArchivo,
    alEntrar: opciones.alEntrar ?? ((datos) => { entradas.push(datos) }),
  })
  return pantalla
}

const campo = (nombre) => raiz.querySelector(`[data-campo=${nombre}]`)
const botonEntrar = () => raiz.querySelector('[data-accion=entrar]')
const botonToken = () => raiz.querySelector('[data-accion=entrar-token]')

function escribir(nombre, valor) {
  campo(nombre).value = valor
}

// Da vueltas de microtarea. Sirve para mirar el estado a mitad de camino,
// nunca para dar por terminado un ingreso: derivar la clave es trabajo real
// del navegador y no se resuelve encadenando promesas ya cumplidas.
async function asentar(vueltas = 2) {
  for (let i = 0; i < vueltas; i += 1) await Promise.resolve()
}

// Espera a que el boton vuelva a habilitarse, que es lo que la pantalla hace
// al terminar, salga bien o mal.
async function esperarLibre(control, limite = 5000) {
  const inicio = Date.now()
  while (control().disabled) {
    if (Date.now() - inicio > limite) throw new Error('el ingreso nunca termino')
    await new Promise((resolver) => { setTimeout(resolver, 5) })
  }
}

async function enviar(selector = '.formulario-ingreso') {
  const esToken = selector === '.formulario-token'
  raiz.querySelector(selector).dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
  await esperarLibre(esToken ? botonToken : botonEntrar)
}

beforeEach(async () => {
  document.body.innerHTML = '<div id="raiz"></div>'
  raiz = document.getElementById('raiz')
  archivo = await archivoConUsuario('majo', 'Majo', CONTRASENA, TOKEN)
  montar()
})

describe('dibujo', () => {
  it('muestra los campos y el boton en español', () => {
    expect(campo('usuario')).not.toBeNull()
    expect(campo('contrasena')).not.toBeNull()
    expect(botonEntrar().textContent).toBe('Entrar')
    expect(raiz.textContent).toContain('Usuario')
    expect(raiz.textContent).toContain('Contraseña')
  })

  it('la contraseña se escribe oculta', () => {
    expect(campo('contrasena').type).toBe('password')
  })

  it('ofrece recordar el dispositivo', () => {
    const recordar = campo('recordar')
    expect(recordar.type).toBe('checkbox')
    expect(recordar.closest('label').textContent).toContain('Recordarme en este dispositivo')
  })

  it('explica que la contraseña la entrega quien administra', () => {
    expect(raiz.querySelector('.ayuda-ingreso').textContent).toMatch(/administra/i)
  })

  it('el modo token viene plegado', () => {
    const detalle = raiz.querySelector('details.ingreso-token')
    expect(detalle).not.toBeNull()
    expect(detalle.open).toBe(false)
    expect(detalle.querySelector('summary').textContent).toBe('Entrar con un token de GitHub')
  })

})

describe('ingreso con usuario y contraseña', () => {
  it('entra con las credenciales correctas y pasa el token', async () => {
    escribir('usuario', 'majo')
    escribir('contrasena', CONTRASENA)
    await enviar()
    expect(entradas).toHaveLength(1)
    expect(entradas[0].token).toBe(TOKEN)
    expect(entradas[0].nombre).toBe('Majo')
    expect(entradas[0].usuario).toBe('majo')
    expect(entradas[0].rol).toBe('admin')
  })

  it('acepta el usuario con mayusculas y espacios', async () => {
    escribir('usuario', '  MAJO ')
    escribir('contrasena', CONTRASENA)
    await enviar()
    expect(entradas[0].token).toBe(TOKEN)
  })

  it('la casilla de recordar llega a alEntrar', async () => {
    campo('recordar').checked = true
    escribir('usuario', 'majo')
    escribir('contrasena', CONTRASENA)
    await enviar()
    expect(entradas[0].recordar).toBe(true)
  })

  it('sin marcar la casilla, recordar viaja en falso', async () => {
    escribir('usuario', 'majo')
    escribir('contrasena', CONTRASENA)
    await enviar()
    expect(entradas[0].recordar).toBe(false)
  })

  it('el mismo mensaje aparece para usuario inexistente y para contraseña equivocada', async () => {
    escribir('usuario', 'majo')
    escribir('contrasena', 'otra cosa')
    await enviar()
    const conContrasenaMala = raiz.querySelector('.error-ingreso').textContent

    escribir('usuario', 'nadie')
    escribir('contrasena', 'otra cosa')
    await enviar()
    const conUsuarioInexistente = raiz.querySelector('.error-ingreso').textContent

    expect(conContrasenaMala).toBe('Usuario o contraseña incorrectos.')
    expect(conUsuarioInexistente).toBe(conContrasenaMala)
    expect(entradas).toHaveLength(0)
  })

  it('no envia nada con los campos vacios', async () => {
    await enviar()
    expect(entradas).toHaveLength(0)
    expect(raiz.querySelector('.error-ingreso').textContent).not.toBe('')
  })

  it('avisa cuando no se puede leer la lista', async () => {
    montar({ leerArchivo: async () => { throw new Error('No hay internet.') } })
    escribir('usuario', 'majo')
    escribir('contrasena', CONTRASENA)
    await enviar()
    expect(raiz.querySelector('.error-ingreso').textContent).toBe('No hay internet.')
  })
})

describe('mientras verifica', () => {
  it('deshabilita el boton y avisa, y lo devuelve al terminar', async () => {
    let soltar
    montar({ leerArchivo: () => new Promise((resolver) => { soltar = () => resolver(archivo) }) })
    escribir('usuario', 'majo')
    escribir('contrasena', CONTRASENA)

    raiz.querySelector('.formulario-ingreso')
      .dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    await asentar()
    expect(botonEntrar().disabled).toBe(true)
    expect(botonEntrar().textContent).toBe('Entrando...')

    soltar()
    await esperarLibre(botonEntrar)
    expect(botonEntrar().disabled).toBe(false)
    expect(botonEntrar().textContent).toBe('Entrar')
  })

  it('el doble envio es imposible', async () => {
    let veces = 0
    let soltar
    montar({
      leerArchivo: () => {
        veces += 1
        return new Promise((resolver) => { soltar = () => resolver(archivo) })
      },
    })
    escribir('usuario', 'majo')
    escribir('contrasena', CONTRASENA)
    const formulario = raiz.querySelector('.formulario-ingreso')
    formulario.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    formulario.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    await asentar()
    formulario.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    await asentar()
    expect(veces).toBe(1)

    soltar()
    await esperarLibre(botonEntrar)
    expect(entradas).toHaveLength(1)
  })
})

describe('modo token', () => {
  it('entra con el token pegado sin pasar por el descifrado', async () => {
    let veces = 0
    montar({ leerArchivo: async () => { veces += 1; return archivo } })
    campo('token').value = 'ghp_pegadoAMano'
    await enviar('.formulario-token')
    expect(veces).toBe(0)
    expect(entradas).toHaveLength(1)
    expect(entradas[0].token).toBe('ghp_pegadoAMano')
  })

  it('quien pega el token es administradora', async () => {
    campo('token').value = 'ghp_pegadoAMano'
    await enviar('.formulario-token')
    expect(entradas[0].rol).toBe('admin')
    expect(entradas[0].nombre).toBeTruthy()
  })

  it('la casilla de recordar tambien vale para el token', async () => {
    campo('recordar').checked = true
    campo('token').value = 'ghp_pegadoAMano'
    await enviar('.formulario-token')
    expect(entradas[0].recordar).toBe(true)
  })

  it('no entra con el token vacio', async () => {
    campo('token').value = '   '
    await enviar('.formulario-token')
    expect(entradas).toHaveLength(0)
  })
})

describe('secretos', () => {
  let espias

  beforeEach(() => {
    espias = ['log', 'info', 'warn', 'error', 'debug'].map((m) => vi.spyOn(console, m).mockImplementation(() => {}))
  })

  afterEach(() => {
    espias.forEach((e) => e.mockRestore())
  })

  const registrado = () => espias.flatMap((e) => e.mock.calls).flat().map((x) => String(x)).join(' | ')

  it('la contraseña no queda escrita en el DOM ni en la consola', async () => {
    escribir('usuario', 'majo')
    escribir('contrasena', CONTRASENA)
    await enviar()
    expect(entradas).toHaveLength(1)
    expect(document.body.innerHTML).not.toContain(CONTRASENA)
    expect(campo('contrasena').outerHTML).not.toContain(CONTRASENA)
    expect(registrado()).not.toContain(CONTRASENA)
  })

  it('tampoco despues de fallar', async () => {
    escribir('usuario', 'majo')
    escribir('contrasena', 'ContrasenaEquivocada9')
    await enviar()
    expect(document.body.innerHTML).not.toContain('ContrasenaEquivocada9')
    expect(registrado()).not.toContain('ContrasenaEquivocada9')
  })

  it('el token tampoco queda escrito en el DOM ni en la consola', async () => {
    campo('token').value = 'ghp_secretoDelDuenio'
    await enviar('.formulario-token')
    expect(document.body.innerHTML).not.toContain('ghp_secretoDelDuenio')
    expect(registrado()).not.toContain('ghp_secretoDelDuenio')
  })

  it('el token descifrado tampoco aparece en la pantalla', async () => {
    escribir('usuario', 'majo')
    escribir('contrasena', CONTRASENA)
    await enviar()
    expect(document.body.innerHTML).not.toContain(TOKEN)
  })
})

describe('lista de usuarios todavia vacia', () => {
  it('da el mismo mensaje de siempre y deja el token como unica via', async () => {
    montar({ leerArchivo: async () => archivoVacio() })
    escribir('usuario', 'majo')
    escribir('contrasena', CONTRASENA)
    await enviar()
    expect(entradas).toHaveLength(0)
    expect(raiz.querySelector('.error-ingreso').textContent).toBe('Usuario o contraseña incorrectos.')
    expect(raiz.querySelector('details.ingreso-token')).not.toBeNull()
  })
})
