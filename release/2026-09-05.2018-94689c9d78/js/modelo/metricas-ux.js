const CLAVE = 'aletea:metricas-ux:v1'
const OPERACIONES = new Set(['crear_tarea', 'encontrar_unidad', 'exportar_respuestas', 'publicar_pagina', 'enviar_campana', 'abandono_formulario'])
const activas = new Map()

function leer(almacen) {
  try { return JSON.parse(almacen?.getItem(CLAVE) || '{"version":1,"operaciones":{}}') } catch { return { version: 1, operaciones: {} } }
}

function escribir(almacen, datos) {
  try { almacen?.setItem(CLAVE, JSON.stringify(datos)) } catch { /* La medición no interrumpe la tarea principal. */ }
}

export function iniciarMedicionUX(operacion, { reloj = () => performance.now() } = {}) {
  if (!OPERACIONES.has(operacion) || activas.has(operacion)) return false
  activas.set(operacion, reloj())
  return true
}

export function completarMedicionUX(operacion, { almacen = globalThis.localStorage, reloj = () => performance.now(), fecha = () => new Date().toISOString().slice(0, 10) } = {}) {
  if (!OPERACIONES.has(operacion) || !activas.has(operacion)) return false
  const duracionMs = Math.max(0, Math.round(reloj() - activas.get(operacion)))
  activas.delete(operacion)
  const datos = leer(almacen)
  const anterior = datos.operaciones[operacion] || { completadas: 0, abandonos: 0, duracionTotalMs: 0, duracionMaximaMs: 0 }
  datos.operaciones[operacion] = { ...anterior, completadas: anterior.completadas + 1, duracionTotalMs: anterior.duracionTotalMs + duracionMs, duracionMaximaMs: Math.max(anterior.duracionMaximaMs, duracionMs), ultimaFecha: fecha() }
  escribir(almacen, datos)
  return duracionMs
}

export function registrarAbandonoFormularioUX({ almacen = globalThis.localStorage, fecha = () => new Date().toISOString().slice(0, 10) } = {}) {
  const datos = leer(almacen)
  const anterior = datos.operaciones.abandono_formulario || { completadas: 0, abandonos: 0, duracionTotalMs: 0, duracionMaximaMs: 0 }
  datos.operaciones.abandono_formulario = { ...anterior, abandonos: anterior.abandonos + 1, ultimaFecha: fecha() }
  escribir(almacen, datos)
  return true
}

export function resumenMetricasUX({ almacen = globalThis.localStorage } = {}) { return leer(almacen) }
export function reiniciarMedicionesUX() { activas.clear() }
