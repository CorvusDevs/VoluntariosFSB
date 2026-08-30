import { describe, expect, it } from 'vitest'
import { esEntornoInstitucional } from '../../js/acceso/entorno.js'

describe('entorno institucional', () => {
  it('activa el ingreso moderno en Cloudflare Pages', () => {
    expect(esEntornoInstitucional('aletea.pages.dev')).toBe(true)
  })

  it('activa el ingreso moderno en el CMS alojado en cPanel', () => {
    expect(esEntornoInstitucional('gestor.aletea.org')).toBe(true)
  })

  it('mantiene el ingreso operativo legado en otros hosts', () => {
    expect(esEntornoInstitucional('localhost')).toBe(false)
    expect(esEntornoInstitucional('aletea.org')).toBe(false)
  })
})
