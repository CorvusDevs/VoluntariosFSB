export function crearPila(estadoInicial, limite = 50) {
  let estados = [estadoInicial]
  let indice = 0

  return {
    actual: () => estados[indice],
    sePuedeDeshacer: () => indice > 0,
    sePuedeRehacer: () => indice < estados.length - 1,
    registrar(estado) {
      estados = [...estados.slice(0, indice + 1), estado]
      if (estados.length > limite + 1) estados = estados.slice(estados.length - (limite + 1))
      indice = estados.length - 1
      return estado
    },
    deshacer() {
      if (indice > 0) indice -= 1
      return estados[indice]
    },
    rehacer() {
      if (indice < estados.length - 1) indice += 1
      return estados[indice]
    },
  }
}
