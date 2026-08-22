import { describe, expect, it } from 'vitest'
import { bytesFoto, combinarProtegidos, cumpleanosParaAgenda, nivelDatosPersonalesDe, preservarRosterParaAgenda, rosterParaSesion, tienePermiso } from '../../functions/api/[[ruta]].js'

describe('respuesta de fotos Cloudflare', () => {
  it('copia el ArrayBuffer de D1 antes de responder', async () => {
    const origen = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]).buffer
    const cuerpo = bytesFoto(origen)
    const respuesta = new Response(cuerpo)
    expect([...new Uint8Array(await respuesta.arrayBuffer())]).toEqual([0xff, 0xd8, 0xff, 0xd9])
  })
})

describe('permisos de Cloudflare', () => {
  it('no concede el CMS nuevo a una coordinación heredada sin permisos explícitos', () => {
    expect(tienePermiso({ rol: 'coordinacion', permisos: null }, 'agenda')).toBe(true)
    expect(tienePermiso({ rol: 'coordinacion', permisos: null }, 'cms')).toBe(false)
    expect(tienePermiso({ rol: 'admin', permisos: null }, 'cms')).toBe(true)
  })

  it('conserva los permisos explícitos al validar una sesión ya expuesta', () => {
    expect(tienePermiso({ rol: 'coordinacion', permisos: ['agenda'] }, 'agenda')).toBe(true)
    expect(tienePermiso({ rol: 'coordinacion', permisos: ['agenda'] }, 'personas')).toBe(false)
  })

  it('oculta perfiles y notas sin permiso de Personas, sin quitar los próximos cumpleaños de Agenda', () => {
    const roster = { participantes: [{ id: 'p1', nombre: 'Ana', grupo: 1, notas: 'Privado', perfil: { anioNacimiento: '2018-08-20', necesidades: 'Pausa tranquila' } }], voluntarios: [] }
    const limitado = rosterParaSesion(roster, { rol: 'coordinacion', permisos: ['agenda'] }, new Date('2026-08-01T12:00:00'))
    expect(limitado.participantes[0]).not.toHaveProperty('perfil')
    expect(limitado.participantes[0]).not.toHaveProperty('notas')
    expect(limitado.participantes[0]).not.toHaveProperty('foto')
    expect(limitado.participantes[0]).not.toHaveProperty('privacidad')
    expect(limitado.cumpleanosAgenda).toEqual(expect.arrayContaining([expect.objectContaining({ fecha: '2026-08-20', persona: expect.objectContaining({ nombre: 'Ana' }) })]))
    expect(cumpleanosParaAgenda(roster, new Date('2026-08-01T12:00:00'))[0].persona).not.toHaveProperty('perfil')
  })

  it('solo conserva la agenda de una escritura sin permiso de Personas', () => {
    const actual = { participantes: [{ id: 'p1', nombre: 'Ana', perfil: { necesidades: 'Privado' } }], voluntarios: [], agenda: { eventos: [] } }
    const siguiente = preservarRosterParaAgenda(actual, { participantes: [], agenda: { eventos: [{ id: 'e1' }] } })
    expect(siguiente.participantes).toEqual(actual.participantes)
    expect(siguiente.agenda.eventos).toEqual([{ id: 'e1' }])
  })

  it('entrega la ficha mínima, la operativa y nunca la sensible dentro del roster', () => {
    const roster = { participantes: [{ id: 'p1', nombre: 'Ana', foto: 'p1.jpg', contactoEmergencia: 'María 099 000 000', privacidad: { perfilInterno: true, fotoInterna: true, contacto: true, datosSensibles: true }, perfil: { desde: '2024-01-01', apoyosOperativos: 'Llegar con calma', anioNacimiento: '2018-08-20', necesidades: 'Pausa tranquila' } }], voluntarios: [] }
    const sinNivel = rosterParaSesion(roster, { rol: 'admin', nivel_datos_personales: 'ninguno' })
    expect(sinNivel.participantes[0]).toMatchObject({ nombre: 'Ana', foto: null, perfil: {} })
    expect(sinNivel.participantes[0]).not.toHaveProperty('contactoEmergencia')
    const operativo = rosterParaSesion(roster, { rol: 'admin', nivel_datos_personales: 'operativo', datos_personales_hasta: '2099-01-01' })
    expect(operativo.participantes[0]).toMatchObject({ foto: 'p1.jpg', perfil: { apoyosOperativos: 'Llegar con calma' } })
    expect(operativo.participantes[0].perfil).not.toHaveProperty('anioNacimiento')
    expect(operativo.participantes[0].perfil).not.toHaveProperty('necesidades')
  })

  it('no entrega fotos ni consentimientos a una sesión que solo puede usar Agenda', () => {
    const roster = { participantes: [{ id: 'p1', nombre: 'Ana', foto: 'p1.jpg', privacidad: { perfilInterno: true, fotoInterna: true, fotoPublica: true, datosSensibles: true } }], voluntarios: [] }
    const limitado = rosterParaSesion(roster, { rol: 'coordinacion', permisos: ['agenda'] })
    expect(limitado.participantes[0]).toEqual({ id: 'p1', nombre: 'Ana', nuevo: false, activo: true })
  })

  it('vence el acceso a información personal y preserva campos protegidos ante una edición común', () => {
    expect(nivelDatosPersonalesDe({ nivel_datos_personales: 'sensible', datos_personales_hasta: '2000-01-01' })).toBe('ninguno')
    const actual = { participantes: [{ id: 'p1', nombre: 'Ana', contactoEmergencia: 'María', privacidad: { datosSensibles: true }, perfil: { necesidades: 'Pausa', anioNacimiento: '2018-08-20', leGusta: 'Fútbol' } }], voluntarios: [] }
    const editado = combinarProtegidos(actual, { participantes: [{ id: 'p1', nombre: 'Ana', perfil: { leGusta: 'Música' } }], voluntarios: [] })
    expect(editado.participantes[0]).toMatchObject({ contactoEmergencia: 'María', privacidad: { datosSensibles: true }, perfil: { leGusta: 'Música', necesidades: 'Pausa', anioNacimiento: '2018-08-20' } })
  })
})
