import { describe, expect, it } from 'vitest'
import {
  PANTALLAS, guardarUltimaPantalla, hashParaPantalla, leerUltimaPantalla, olvidarUltimaPantalla, pantallaPermitida, rutaCompartidaDesdeHash, rutaCompartidaDesdeUbicacion, rutaParaPantalla,
} from '../../js/ui/ultima-pantalla.js'
import { usaRutasRealesGestor } from '../../js/rutas-gestor.js'

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
    expect(rutaParaPantalla('ayuda')).toBe('/ayuda')
    expect(rutaParaPantalla('ayuda', { busqueda: 'notificaciones móviles' })).toBe('/ayuda?buscar=notificaciones+m%C3%B3viles')
    expect(rutaCompartidaDesdeUbicacion({ pathname: '/ayuda', search: '?buscar=notificaciones+m%C3%B3viles' })).toEqual({ pantalla: 'ayuda', contexto: { busqueda: 'notificaciones móviles' } })
    expect(hashParaPantalla('ayuda')).toBe('#ayuda')
    expect(hashParaPantalla('ayuda', { busqueda: 'notificaciones móviles' })).toBe('#ayuda?buscar=notificaciones+m%C3%B3viles')
    expect(rutaCompartidaDesdeHash('#ayuda?buscar=notificaciones+m%C3%B3viles')).toEqual({ pantalla: 'ayuda', contexto: { busqueda: 'notificaciones móviles' } })
    expect(rutaCompartidaDesdeHash('#pantalla-inventada')).toBeNull()
  })
  it('comparte una tarea exacta desde Mis tareas y conserva el enlace anterior', () => {
    expect(rutaParaPantalla('cms-trabajo', { tareaId: 'tarea 1', filtroTrabajo: 'mias' })).toBe('/tareas?tarea=tarea+1&filtro=mias')
    expect(rutaCompartidaDesdeUbicacion({ pathname: '/tareas', search: '?tarea=tarea+1&filtro=mias' })).toEqual({ pantalla: 'cms-trabajo', contexto: { tareaId: 'tarea 1', filtroTrabajo: 'mias' } })
    expect(rutaCompartidaDesdeUbicacion({ pathname: '/mi-trabajo', search: '?tarea=tarea+1&filtro=mias' })).toEqual({ pantalla: 'cms-trabajo', contexto: { tareaId: 'tarea 1', filtroTrabajo: 'mias' } })
    expect(hashParaPantalla('cms-trabajo', { tareaId: 'tarea 1', filtroTrabajo: 'mias' })).toBe('#cms-trabajo?tarea=tarea+1&filtro=mias')
    expect(rutaCompartidaDesdeHash('#cms-trabajo?tarea=tarea+1&filtro=mias')).toEqual({ pantalla: 'cms-trabajo', contexto: { tareaId: 'tarea 1', filtroTrabajo: 'mias' } })
  })
  it('conserva el filtro de una unidad operativa al compartir Mis tareas', () => {
    expect(rutaParaPantalla('cms-trabajo', { filtroTrabajo: 'todas', unidadId: 'uo 2' })).toBe('/tareas?filtro=todas&unidad=uo+2')
    expect(rutaCompartidaDesdeUbicacion({ pathname: '/tareas', search: '?filtro=todas&unidad=uo+2' })).toEqual({ pantalla: 'cms-trabajo', contexto: { filtroTrabajo: 'todas', unidadId: 'uo 2' } })
  })
  it('abre una persona exacta para archivarla desde Finanzas', () => {
    const contexto = { busqueda: 'Fabián Camarán', personaId: 'p-fabian', accionPersona: 'archivar' }
    expect(rutaParaPantalla('personas', contexto)).toBe('/personas?buscar=Fabi%C3%A1n+Camar%C3%A1n&persona=p-fabian&accion=archivar')
    expect(rutaCompartidaDesdeUbicacion({ pathname: '/personas', search: '?buscar=Fabi%C3%A1n+Camar%C3%A1n&persona=p-fabian&accion=archivar' })).toEqual({ pantalla: 'personas', contexto })
  })
  it('muestra Finanzas sin el prefijo técnico y conserva enlaces antiguos', () => {
    expect(rutaParaPantalla('cms-finanzas')).toBe('/finanzas')
    expect(rutaCompartidaDesdeUbicacion({ pathname: '/finanzas' })).toEqual({ pantalla: 'cms-finanzas', contexto: {} })
    expect(hashParaPantalla('cms-finanzas')).toBe('#finanzas')
    expect(rutaCompartidaDesdeHash('#finanzas')).toEqual({ pantalla: 'cms-finanzas', contexto: {} })
    expect(rutaCompartidaDesdeHash('#cms-finanzas')).toEqual({ pantalla: 'cms-finanzas', contexto: {} })
    expect(rutaCompartidaDesdeUbicacion({ pathname: '/', hash: '#cms-finanzas' })).toEqual({ pantalla: 'cms-finanzas', contexto: {} })
  })
  it('asigna una ruta real y única a cada pantalla', () => {
    const rutas = PANTALLAS.map((pantalla) => rutaParaPantalla(pantalla))
    expect(rutas.every((ruta) => ruta.startsWith('/'))).toBe(true)
    expect(new Set(rutas).size).toBe(rutas.length)
  })
  it('reserva las rutas profundas para el servidor cPanel que las soporta', () => {
    expect(usaRutasRealesGestor('gestor.aletea.org')).toBe(true)
    expect(usaRutasRealesGestor('aletea.pages.dev')).toBe(false)
    expect(usaRutasRealesGestor('corvusdevs.github.io')).toBe(false)
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
    expect(pantallaPermitida('cms-privacidad', { admin: false, cloudflare: true, permisos: ['cms'] })).toBe(false)
    expect(pantallaPermitida('cms-privacidad', { admin: true, cloudflare: true, permisos: ['cms'] })).toBe(true)
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
    const areas = ['cms-trabajo', 'cms-agenda', 'cms-pagina-web', 'cms-comunicacion-visual', 'cms-areas', 'cms-formularios', 'cms-biblioteca', 'cms-auditoria']
    areas.forEach((pantalla) => {
      expect(pantallaPermitida(pantalla, { cloudflare: true, permisos: ['cms'] })).toBe(true)
      expect(pantallaPermitida(pantalla, { cloudflare: false, permisos: ['cms'] })).toBe(false)
      expect(pantallaPermitida(pantalla, { cloudflare: true, permisos: ['agenda'] })).toBe(false)
    })
  })

  it('no expone los editores de contenido a Integrantes ni Consulta', () => {
    for (const perfilAcceso of ['integrante', 'consulta']) {
      expect(pantallaPermitida('cms-pagina-web', { cloudflare: true, permisos: ['cms'], perfilAcceso })).toBe(false)
      expect(pantallaPermitida('cms-comunicacion-visual', { cloudflare: true, permisos: ['cms'], perfilAcceso })).toBe(false)
    }
    expect(pantallaPermitida('cms-pagina-web', { cloudflare: true, permisos: ['cms'], perfilAcceso: 'coordinacion' })).toBe(true)
    expect(pantallaPermitida('cms-comunicacion-visual', { cloudflare: true, permisos: ['cms'], perfilAcceso: 'coordinacion' })).toBe(true)
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
