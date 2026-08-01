import { crearAlmacenLocal } from './local.js'

let instancia = null

export async function almacen() {
  if (!instancia) instancia = await crearAlmacenLocal()
  return instancia
}

export function reiniciarAlmacen() {
  instancia = null
}
