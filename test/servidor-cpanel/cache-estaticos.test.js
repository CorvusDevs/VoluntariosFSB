import { describe, expect, it } from 'vitest'
import { cabecerasDeArchivo } from '../../servidor-cpanel/cache-estaticos.mjs'

describe('cache de archivos del gestor en cPanel', () => {
  it('impide mezclar CSS y JavaScript de versiones diferentes', () => {
    expect(cabecerasDeArchivo('/home/aleteaor/gestor.aletea.org/dist/css/estilos.css')).toEqual({
      'cache-control': 'no-store, max-age=0',
      pragma: 'no-cache',
      expires: '0',
    })
    expect(cabecerasDeArchivo('/home/aleteaor/gestor.aletea.org/dist/js/app.js')['cache-control']).toContain('no-store')
  })
})
