export function identificador(nombre) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(nombre)) throw new Error(`Identificador SQL no válido: ${nombre}`)
  return `\`${nombre}\``
}
