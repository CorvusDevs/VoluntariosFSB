import { describe, expect, it } from 'vitest'
import { identificador } from '../../servidor-cpanel/importar-util.mjs'

describe('importador D1 a MariaDB', () => {
  it('acepta únicamente identificadores SQL controlados', () => {
    expect(identificador('tareas_cms')).toBe('`tareas_cms`')
    expect(() => identificador('usuarios; DROP TABLE usuarios')).toThrow('Identificador SQL no válido')
  })
})
