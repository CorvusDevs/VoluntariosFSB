import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ejecutor = resolve('servidor-cpanel/ejecutar-trabajo.sh')

describe('ejecutor permanente de trabajos cPanel', () => {
  it('resuelve la cola de correos con un runtime configurable', () => {
    const resultado = spawnSync('/bin/sh', [ejecutor, 'correos'], {
      cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, NODE_BIN: '/bin/echo' },
    })
    expect(resultado.status).toBe(0)
    expect(resultado.stdout.trim()).toMatch(/servidor-cpanel\/procesar-cola-correos\.mjs$/)
  })

  it('resuelve el mantenimiento sin depender de una versión fija de Node', () => {
    const resultado = spawnSync('/bin/sh', [ejecutor, 'mantenimiento'], {
      cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, NODE_BIN: '/bin/echo' },
    })
    expect(resultado.status).toBe(0)
    expect(resultado.stdout.trim()).toMatch(/servidor-cpanel\/mantenimiento-sistema\.mjs$/)
  })

  it('prioriza el mismo runtime declarado por Passenger y contempla CloudLinux', () => {
    const contenido = readFileSync(ejecutor, 'utf8')
    expect(contenido).toContain('PassengerNodejs')
    expect(contenido).toContain('/opt/alt/alt-nodejs22/root/usr/bin/node')
  })

  it('falla de forma visible ante un trabajo desconocido', () => {
    const resultado = spawnSync('/bin/sh', [ejecutor, 'otro'], { cwd: process.cwd(), encoding: 'utf8' })
    expect(resultado.status).toBe(64)
    expect(resultado.stderr).toContain('Trabajo desconocido')
  })
})
