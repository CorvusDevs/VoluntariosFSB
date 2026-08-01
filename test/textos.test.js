import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Guardias sobre el codigo fuente, no sobre la salida. Existen porque las dos
// convenciones que vigilan ya se rompieron varias veces durante el desarrollo, y
// una prueba de comportamiento no las ve: el nombre mal escrito o una raya larga
// pasan todas las pruebas funcionales y aparecen recien cuando alguien mira.

function archivosDe(carpeta, extensiones) {
  const salida = []
  for (const entrada of readdirSync(carpeta)) {
    const ruta = join(carpeta, entrada)
    if (statSync(ruta).isDirectory()) {
      salida.push(...archivosDe(ruta, extensiones))
    } else if (extensiones.some((e) => entrada.endsWith(e))) {
      salida.push(ruta)
    }
  }
  return salida
}

const FUENTES = [
  ...archivosDe('js', ['.js']),
  ...archivosDe('css', ['.css']),
  'index.html',
]

describe('convenciones de texto en el codigo publicado', () => {
  it('encuentra archivos para revisar', () => {
    expect(FUENTES.length).toBeGreaterThan(15)
  })

  it('el nombre del programa siempre lleva tilde', () => {
    // Construido por partes para que esta misma prueba no se acuse a si misma.
    const sinTilde = new RegExp(`${'Fut'}${'bol'}`)
    const culpables = FUENTES.filter((ruta) => sinTilde.test(readFileSync(ruta, 'utf8')))
    expect(culpables).toEqual([])
  })

  it('no hay rayas ni guiones largos en lo que se publica', () => {
    const largos = /(—|–|―)/
    const culpables = FUENTES.filter((ruta) => largos.test(readFileSync(ruta, 'utf8')))
    expect(culpables).toEqual([])
  })
})
