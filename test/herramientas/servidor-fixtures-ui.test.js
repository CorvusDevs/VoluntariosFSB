import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const fuente = readFileSync('herramientas/servidor-fixtures-ui.mjs', 'utf8')

describe('servidor restringido de fixtures UI', () => {
  it('solo admite fixtures declaradas y recursos públicos necesarios', () => {
    expect(fuente).toContain("'/test/fixtures/cms-overhaul.html'")
    expect(fuente).toContain("const prefijosPublicos = ['/css/', '/js/', '/assets/']")
    expect(fuente).toContain("segmento.startsWith('.')")
    expect(fuente).not.toContain("'/docs/'")
    expect(fuente).not.toContain("'/servidor-cpanel/'")
  })
})
