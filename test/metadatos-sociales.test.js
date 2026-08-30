import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('metadatos sociales', () => {
  it('declara una imagen absoluta y sus dimensiones para compartir el CMS', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
    expect(html).toContain('property="og:image" content="https://gestor.aletea.org/assets/aletea-institucional-social-v3.png"')
    expect(html).toContain('property="og:image:width" content="1200"')
    expect(html).toContain('property="og:image:height" content="750"')
    expect(html).toContain('rel="icon" type="image/png" sizes="512x512" href="assets/favicon-aletea.png"')
  })
})
