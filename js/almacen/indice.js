import { crearAlmacenLocal } from './local.js'
import { crearAlmacenRemoto } from './remoto.js'
import { crearClienteGitHub } from './github.js'
import { CONFIG } from '../config.js'

let instancia = null
let configuracion = { modo: 'local' }

export function configurar(nueva) {
  configuracion = { ...configuracion, ...nueva }
  instancia = null
}

export function modoActual() {
  return configuracion.modo
}

export async function almacen() {
  if (instancia) return instancia
  if (configuracion.modo === 'github') {
    const cliente = crearClienteGitHub({
      token: configuracion.token,
      duenio: CONFIG.duenio,
      repo: CONFIG.repoDatos,
      rama: CONFIG.rama,
    })
    instancia = crearAlmacenRemoto({ cliente, autor: configuracion.autor ?? 'la aplicacion' })
  } else {
    instancia = await crearAlmacenLocal()
  }
  return instancia
}

export function reiniciarAlmacen() {
  instancia = null
}
