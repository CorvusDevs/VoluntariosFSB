import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function zIndexDe(css, selector) {
  const escapado = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const bloques = [...css.matchAll(new RegExp(`${escapado}\\s*\\{([^}]*)\\}`, 'g'))]
  const valor = bloques.map((coincidencia) => coincidencia[1].match(/z-index:\s*(\d+)/)?.[1]).find(Boolean)
  return Number(valor)
}

describe('capas de los editores de personas', () => {
  it('mantiene el editor de foto por encima de la ficha personal', () => {
    const css = readFileSync('css/estilos.css', 'utf8')
    expect(zIndexDe(css, '.capa-editor')).toBeGreaterThan(zIndexDe(css, '.persona-editor, .personas-personalizacion'))
  })
})
