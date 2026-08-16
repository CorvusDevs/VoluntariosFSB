import { describe, expect, it } from 'vitest'
import { bytesFoto, cumpleanosParaAgenda, preservarRosterParaAgenda, rosterParaSesion, tienePermiso } from '../../functions/api/[[ruta]].js'

describe('respuesta de fotos Cloudflare', () => {
  it('copia el ArrayBuffer de D1 antes de responder', async () => {
    const origen = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]).buffer
    const cuerpo = bytesFoto(origen)
    const respuesta = new Response(cuerpo)
    expect([...new Uint8Array(await respuesta.arrayBuffer())]).toEqual([0xff, 0xd8, 0xff, 0xd9])
  })
})

describe('permisos de Cloudflare', () => {
  it('conserva los permisos explícitos al validar una sesión ya expuesta', () => {
    expect(tienePermiso({ rol: 'coordinacion', permisos: ['agenda'] }, 'agenda')).toBe(true)
    expect(tienePermiso({ rol: 'coordinacion', permisos: ['agenda'] }, 'personas')).toBe(false)
  })

  it('oculta perfiles y notas sin permiso de Personas, sin quitar los próximos cumpleaños de Agenda', () => {
    const roster = { participantes: [{ id: 'p1', nombre: 'Ana', grupo: 1, notas: 'Privado', perfil: { anioNacimiento: '2018-08-20', necesidades: 'Pausa tranquila' } }], voluntarios: [] }
    const limitado = rosterParaSesion(roster, { rol: 'coordinacion', permisos: ['agenda'] }, new Date('2026-08-01T12:00:00'))
    expect(limitado.participantes[0]).not.toHaveProperty('perfil')
    expect(limitado.participantes[0]).not.toHaveProperty('notas')
    expect(limitado.cumpleanosAgenda).toEqual(expect.arrayContaining([expect.objectContaining({ fecha: '2026-08-20', persona: expect.objectContaining({ nombre: 'Ana' }) })]))
    expect(cumpleanosParaAgenda(roster, new Date('2026-08-01T12:00:00'))[0].persona).not.toHaveProperty('perfil')
  })

  it('solo conserva la agenda de una escritura sin permiso de Personas', () => {
    const actual = { participantes: [{ id: 'p1', nombre: 'Ana', perfil: { necesidades: 'Privado' } }], voluntarios: [], agenda: { eventos: [] } }
    const siguiente = preservarRosterParaAgenda(actual, { participantes: [], agenda: { eventos: [{ id: 'e1' }] } })
    expect(siguiente.participantes).toEqual(actual.participantes)
    expect(siguiente.agenda.eventos).toEqual([{ id: 'e1' }])
  })
})
