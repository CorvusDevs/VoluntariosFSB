import { describe, expect, it, vi } from 'vitest'
import {
  TRABAJOS_CRON,
  VARIABLES_CORREO,
  combinarVariables,
  configurarCpanel,
  encontrarAplicacion,
  fusionarTextoEntorno,
  opcionesDesde,
  parametrosPassenger,
} from '../../herramientas/configurar-cpanel-comunicaciones.mjs'

function apiFalsa() {
  const estado = {
    cuentas: [],
    app: { name: 'Gestor Aletea', domain: 'gestor.aletea.org', envvars: { DB_PASSWORD: 'privada', DB_NAME: 'gestor' } },
    crons: [],
    correoCron: 'aleteaor',
    entorno: 'DB_PASSWORD=privada\nDB_NAME=gestor\n',
  }
  const api = {
    uapi: vi.fn(async (modulo, funcion, parametros = {}) => {
      if (`${modulo}.${funcion}` === 'Email.list_pops_with_disk') return estado.cuentas
      if (`${modulo}.${funcion}` === 'PassengerApps.list_applications') return { 'Gestor Aletea': estado.app }
      if (`${modulo}.${funcion}` === 'Variables.get_user_information') return { contact_email: 'operaciones@example.com' }
      if (`${modulo}.${funcion}` === 'Fileman.list_files') return [{ file: '.gestor-aletea.env' }]
      if (`${modulo}.${funcion}` === 'Fileman.get_file_content') return { content: estado.entorno }
      if (`${modulo}.${funcion}` === 'Email.add_pop') {
        estado.cuentas.push({ email: 'novedades@aletea.org' })
        return null
      }
      if (`${modulo}.${funcion}` === 'EmailAuth.apply_dmarc') return null
      throw new Error(`UAPI no simulada: ${modulo}.${funcion}`)
    }),
    api2: vi.fn(async (modulo, funcion, parametros = {}) => {
      if (funcion === 'listcron') return estado.crons
      if (funcion === 'set_email') {
        estado.correoCron = parametros.email
        return [{ status: 1 }]
      }
      if (funcion === 'add_line') {
        estado.crons.push({ ...parametros })
        return [{ status: 1 }]
      }
      if (funcion === 'get_email') return [{ email: estado.correoCron }]
      throw new Error(`API2 no simulada: ${modulo}.${funcion}`)
    }),
  }
  return { api, estado }
}

describe('configuración permanente de comunicaciones en cPanel', () => {
  it('exige una orden explícita para aplicar cambios', () => {
    expect(opcionesDesde([])).toEqual({ aplicar: false })
    expect(opcionesDesde(['--aplicar'])).toEqual({ aplicar: true })
    expect(() => opcionesDesde(['--forzar'])).toThrow('Opción desconocida')
  })

  it('preserva las variables privadas existentes al sumar correo', () => {
    const variables = combinarVariables({ DB_PASSWORD: 'privada', SESSION_SECRET: 'sesion' }, 'smtp')
    expect(variables.DB_PASSWORD).toBe('privada')
    expect(variables.SESSION_SECRET).toBe('sesion')
    expect(variables.SMTP_PASSWORD).toBe('smtp')
    expect(variables.EMAIL_MAX_PER_HOUR).toBe('240')
  })

  it('envía nombres y valores alineados a Passenger', () => {
    const app = encontrarAplicacion({ 'Gestor Aletea': { name: 'Gestor Aletea', envvars: {} } })
    const parametros = parametrosPassenger(app, { A: 'uno', B: 'dos' })
    expect(parametros).toEqual({
      name: 'Gestor Aletea', clear_envvars: 1,
      envvar_name: ['A', 'B'], envvar_value: ['uno', 'dos'],
    })
  })

  it('actualiza el entorno privado sin borrar variables existentes', () => {
    expect(fusionarTextoEntorno('DB_PASSWORD=privada\nSMTP_HOST=viejo\n', {
      SMTP_HOST: 'mail.aletea.org', SMTP_PORT: '465',
    })).toBe('DB_PASSWORD=privada\nSMTP_HOST=mail.aletea.org\nSMTP_PORT=465\n')
  })

  it('simula sin mutar cPanel ni guardar secretos', async () => {
    const { api } = apiFalsa()
    const guardarClave = vi.fn()
    const guardarEntorno = vi.fn()
    const resultado = await configurarCpanel({
      api, aplicar: false, leerClave: () => '', crearClave: () => 'clave!A9', guardarClave, guardarEntorno, informar: () => {},
    })
    expect(resultado.aplicar).toBe(false)
    expect(api.uapi).not.toHaveBeenCalledWith('Email', 'add_pop', expect.anything())
    expect(guardarClave).not.toHaveBeenCalled()
    expect(guardarEntorno).not.toHaveBeenCalled()
  })

  it('crea cuenta, DMARC, variables y Cron, luego los verifica', async () => {
    const { api, estado } = apiFalsa()
    const guardarClave = vi.fn()
    const guardarEntorno = vi.fn(async (contenido) => { estado.entorno = contenido })
    const resultado = await configurarCpanel({
      api, aplicar: true, leerClave: () => '', crearClave: () => 'clave!A9', guardarClave, guardarEntorno, informar: () => {},
    })
    expect(resultado).toMatchObject({ aplicar: true, dmarc: 'p=none', trabajos: 2, correoCronConfigurado: true })
    expect(guardarClave).toHaveBeenCalledWith('clave!A9')
    expect(estado.app.envvars.DB_PASSWORD).toBe('privada')
    expect(estado.entorno).toContain('SMTP_PASSWORD=clave!A9')
    expect(estado.crons.map((entrada) => entrada.command)).toEqual(TRABAJOS_CRON.map((entrada) => entrada.command))
    expect(Object.keys(VARIABLES_CORREO).every((nombre) => estado.entorno.includes(`${nombre}=`))).toBe(true)
  })
})
