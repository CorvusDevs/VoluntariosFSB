import { describe, expect, it } from 'vitest'
import { maquetarPerfil } from '../../js/imagen/maquetar-perfil.js'

const medir = (texto) => texto.length * 14

describe('maquetarPerfil', () => {
  it('incluye edad, historia y apoyos de la persona', () => {
    const plano = maquetarPerfil({ nombre: 'Gonzalo', grupo: 1, perfil: { anioNacimiento: '2014', desde: '2023', leGusta: 'Pelota', necesidades: 'Pausa tranquila' } }, { medirTexto: medir, anioActual: 2026 })
    const textos = plano.ordenes.filter((o) => o.tipo === 'texto').map((o) => o.texto)
    expect(textos).toContain('12 años · En la organización desde 2023')
    expect(textos).toContain('Necesidades y apoyos')
    expect(textos).toContain('Pausa tranquila')
  })
})
