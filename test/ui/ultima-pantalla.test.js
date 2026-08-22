import { describe, expect, it } from 'vitest'
import {
  guardarUltimaPantalla, hashParaPantalla, leerUltimaPantalla, olvidarUltimaPantalla, pantallaPermitida, rutaCompartidaDesdeHash,
} from '../../js/ui/ultima-pantalla.js'

function crearAlmacen() {
  const datos = new Map()
  return {
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => datos.set(clave, valor),
    removeItem: (clave) => datos.delete(clave),
  }
}

describe('ultima pantalla', () => {
  it('convierte pantallas y búsquedas de ayuda en enlaces compartibles', () => {
    expect(hashParaPantalla('ayuda')).toBe('#ayuda')
    expect(hashParaPantalla('ayuda', { busqueda: 'notificaciones móviles' })).toBe('#ayuda?buscar=notificaciones+m%C3%B3viles')
    expect(rutaCompartidaDesdeHash('#ayuda?buscar=notificaciones+m%C3%B3viles')).toEqual({ pantalla: 'ayuda', contexto: { busqueda: 'notificaciones móviles' } })
    expect(rutaCompartidaDesdeHash('#pantalla-inventada')).toBeNull()
  })
  it('comparte una tarea exacta de Mi trabajo', () => {
    expect(hashParaPantalla('cms-trabajo', { tareaId: 'tarea 1', filtroTrabajo: 'mias' })).toBe('#cms-trabajo?tarea=tarea+1&filtro=mias')
    expect(rutaCompartidaDesdeHash('#cms-trabajo?tarea=tarea+1&filtro=mias')).toEqual({ pantalla: 'cms-trabajo', contexto: { tareaId: 'tarea 1', filtroTrabajo: 'mias' } })
  })
  it('vuelve a lista si todavia no hay una pantalla guardada', () => {
    expect(leerUltimaPantalla(crearAlmacen())).toBe('lista')
  })

  it('acepta un inicio por defecto para una sesion CMS nueva', () => {
    expect(leerUltimaPantalla(crearAlmacen(), 'inicio')).toBe('inicio')
  })

  it('recuerda una seccion valida durante la sesion del navegador', () => {
    const almacen = crearAlmacen()
    guardarUltimaPantalla('personas', almacen)
    expect(leerUltimaPantalla(almacen)).toBe('personas')
    olvidarUltimaPantalla(almacen)
    expect(leerUltimaPantalla(almacen)).toBe('lista')
  })

  it('no deja restaurar secciones administrativas sin autorizacion', () => {
    expect(pantallaPermitida('ajustes')).toBe(false)
    expect(pantallaPermitida('registro', { admin: true, cloudflare: true })).toBe(false)
    expect(pantallaPermitida('ajustes', { admin: true })).toBe(true)
  })

  it('respeta los permisos operativos de cada seccion', () => {
    const permisos = ['planilla', 'agenda']
    expect(pantallaPermitida('lista', { permisos })).toBe(true)
    expect(pantallaPermitida('vista-previa', { permisos })).toBe(true)
    expect(pantallaPermitida('agenda', { permisos })).toBe(true)
    expect(pantallaPermitida('personas', { permisos })).toBe(false)
    expect(pantallaPermitida('asistencias', { permisos })).toBe(false)
    expect(pantallaPermitida('inicio', { cloudflare: true, permisos: ['cms'] })).toBe(true)
    expect(pantallaPermitida('inicio', { cloudflare: true, permisos })).toBe(false)
    expect(pantallaPermitida('operacion', { cloudflare: true, permisos: ['cms'] })).toBe(true)
    expect(pantallaPermitida('operacion', { cloudflare: false, permisos: ['cms'] })).toBe(false)
  })

  it('mantiene las vistas de equipos dentro del CMS de Cloudflare', () => {
    const equipos = ['cms-familias', 'cms-deportes', 'cms-comunicacion', 'cms-capacitaciones', 'cms-finanzas', 'cms-eventos', 'cms-administracion']
    equipos.forEach((pantalla) => {
      expect(pantallaPermitida(pantalla, { cloudflare: true, permisos: ['cms'] })).toBe(true)
      expect(pantallaPermitida(pantalla, { cloudflare: false, permisos: ['cms'] })).toBe(false)
      expect(pantallaPermitida(pantalla, { cloudflare: true, permisos: ['agenda'] })).toBe(false)
    })
  })

  it('mantiene las areas institucionales como paginas propias del CMS', () => {
    const areas = ['cms-trabajo', 'cms-agenda', 'cms-areas', 'cms-formularios', 'cms-biblioteca', 'cms-auditoria']
    areas.forEach((pantalla) => {
      expect(pantallaPermitida(pantalla, { cloudflare: true, permisos: ['cms'] })).toBe(true)
      expect(pantallaPermitida(pantalla, { cloudflare: false, permisos: ['cms'] })).toBe(false)
      expect(pantallaPermitida(pantalla, { cloudflare: true, permisos: ['agenda'] })).toBe(false)
    })
  })

  it('ofrece ayuda a cualquier cuenta del gestor institucional', () => {
    expect(pantallaPermitida('ayuda', { cloudflare: true, permisos: ['cms'] })).toBe(true)
    expect(pantallaPermitida('ayuda', { cloudflare: false, permisos: ['cms'] })).toBe(false)
  })

  it('migra la antigua seccion CMS al inicio institucional', () => {
    const almacen = crearAlmacen()
    almacen.setItem('voluntarios-fsb:ultima-pantalla', 'cms')
    expect(leerUltimaPantalla(almacen)).toBe('inicio')
  })

  it('ignora un valor corrupto o un almacenamiento no disponible', () => {
    const falla = { getItem: () => { throw new Error('sin acceso') } }
    expect(leerUltimaPantalla(falla)).toBe('lista')
  })
})
