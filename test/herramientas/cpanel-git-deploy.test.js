import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const root = new URL('../../', import.meta.url)

describe('receta Git administrada por cPanel', () => {
  it('limita la prueba a un directorio privado y no toca los sitios', async () => {
    const recipe = await readFile(new URL('.cpanel.yml', root), 'utf8')

    expect(recipe).toContain('/home/aleteaor/.aletea-deploy/git-smoke')
    expect(recipe).not.toContain('/home/aleteaor/gestor.aletea.org')
    expect(recipe).not.toContain('/home/aleteaor/prueba.aletea.org')
    expect(recipe).not.toContain('.htaccess')
    expect(recipe).not.toContain('.gestor-aletea.env')
  })

  it('publica un recibo declarativo sin credenciales', async () => {
    const receipt = JSON.parse(await readFile(new URL('herramientas/cpanel-git-smoke.json', root), 'utf8'))

    expect(receipt.schema).toBe(1)
    expect(receipt.target).toBe('/home/aleteaor/.aletea-deploy/git-smoke/receipt.json')
    expect(JSON.stringify(receipt)).not.toMatch(/password|secret|token|credential/i)
  })
})
