import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CpanelApi } from './cpanel-api.mjs'
import { tokenDesdeKeychain } from './publicar-cpanel-api.mjs'
import { argumentosSftp } from './publicar-cpanel-sftp.mjs'

const HOST_PREDETERMINADO = 'cpanel.aletea.org'
const USUARIO_PREDETERMINADO = 'aleteaor'
const APLICACION = 'Gestor Aletea'
const CUENTA_LOCAL = 'novedades'
const DOMINIO_CORREO = 'aletea.org'
const CUENTA_COMPLETA = `${CUENTA_LOCAL}@${DOMINIO_CORREO}`
const SERVICIO_SMTP_KEYCHAIN = 'aletea-smtp-novedades'
const ARCHIVO_ENTORNO = '.gestor-aletea.env'
const DIRECTORIO_ENTORNO = '/home/aleteaor'

export const VARIABLES_CORREO = Object.freeze({
  ORIGEN_PUBLICO: 'https://gestor.aletea.org',
  EMAIL_TRANSPORT: 'smtp',
  EMAIL_FROM: `Aletea <${CUENTA_COMPLETA}>`,
  SMTP_HOST: 'mail.aletea.org',
  SMTP_PORT: '465',
  SMTP_SECURE: 'true',
  SMTP_USER: CUENTA_COMPLETA,
  EMAIL_BATCH_SIZE: '20',
  EMAIL_MAX_PER_RUN: '20',
  EMAIL_MAX_PER_HOUR: '240',
  EMAIL_JOB_STALE_AFTER_MINUTES: '15',
  RETENCION_LIMITES_FORMULARIOS_DIAS: '2',
  RETENCION_CONTENIDO_CORREO_DIAS: '90',
  RETENCION_EVENTOS_CORREO_DIAS: '365',
  RETENCION_EJECUCIONES_DIAS: '180',
  RETENCION_INCIDENTES_DIAS: '365',
})

export const TRABAJOS_CRON = Object.freeze([
  {
    minute: '*/5', hour: '*', day: '*', month: '*', weekday: '*',
    command: '/bin/sh /home/aleteaor/gestor.aletea.org/servidor-cpanel/ejecutar-trabajo.sh correos',
  },
  {
    minute: '17', hour: '3', day: '*', month: '*', weekday: '*',
    command: '/bin/sh /home/aleteaor/gestor.aletea.org/servidor-cpanel/ejecutar-trabajo.sh mantenimiento',
  },
])

export function opcionesDesde(argumentos) {
  const opciones = { aplicar: false }
  for (const argumento of argumentos) {
    if (argumento === '--aplicar') opciones.aplicar = true
    else if (argumento === '--simular') opciones.aplicar = false
    else throw new Error(`Opción desconocida: ${argumento}`)
  }
  return opciones
}

export function encontrarAplicacion(datos) {
  const aplicacion = datos?.[APLICACION]
    || Object.values(datos || {}).find((entrada) => entrada?.name === APLICACION || entrada?.domain === 'gestor.aletea.org')
  if (!aplicacion) throw new Error(`cPanel no devolvió la aplicación ${APLICACION}.`)
  return aplicacion
}

export function cuentaExiste(datos) {
  const cuentas = Array.isArray(datos) ? datos : (datos?.pops || [])
  return cuentas.some((entrada) => entrada?.email === CUENTA_COMPLETA)
}

export function combinarVariables(actuales, claveSmtp) {
  if (!claveSmtp) throw new Error('Falta la clave SMTP privada.')
  return { ...(actuales || {}), ...VARIABLES_CORREO, SMTP_PASSWORD: claveSmtp }
}

export function parametrosPassenger(aplicacion, variables) {
  const entradas = Object.entries(variables).filter(([, valor]) => valor !== undefined && valor !== null && String(valor) !== '')
  return {
    name: aplicacion.name || APLICACION,
    clear_envvars: 1,
    envvar_name: entradas.map(([nombre]) => nombre),
    envvar_value: entradas.map(([, valor]) => String(valor)),
  }
}

export function fusionarTextoEntorno(textoActual, actualizaciones) {
  const pendientes = new Map(Object.entries(actualizaciones).map(([nombre, valor]) => {
    const texto = String(valor ?? '')
    if (/\r|\n/.test(texto)) throw new Error(`La variable ${nombre} contiene saltos de línea.`)
    return [nombre, texto]
  }))
  const lineas = String(textoActual || '').split(/\r?\n/).filter((linea, indice, todas) => linea || indice < todas.length - 1)
  const resultado = lineas.map((linea) => {
    const coincidencia = linea.match(/^([A-Z][A-Z0-9_]*)=/)
    const nombre = coincidencia?.[1]
    if (!nombre || !pendientes.has(nombre)) return linea
    const reemplazo = `${nombre}=${pendientes.get(nombre)}`
    pendientes.delete(nombre)
    return reemplazo
  })
  for (const [nombre, valor] of pendientes) resultado.push(`${nombre}=${valor}`)
  return `${resultado.join('\n')}\n`
}

function leerClaveKeychain(usuario = CUENTA_COMPLETA) {
  try {
    return execFileSync('security', ['find-generic-password', '-w', '-a', usuario, '-s', SERVICIO_SMTP_KEYCHAIN], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

function guardarClaveKeychain(clave, usuario = CUENTA_COMPLETA) {
  execFileSync('security', ['add-generic-password', '-U', '-a', usuario, '-s', SERVICIO_SMTP_KEYCHAIN, '-w', clave], {
    stdio: 'ignore',
  })
}

function generarClave() {
  return `${randomBytes(24).toString('base64url')}!A9`
}

function escaparSftp(ruta) {
  if (/\r|\n/.test(ruta)) throw new Error('Una ruta SFTP contiene saltos de línea.')
  return `"${String(ruta).replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
}

async function guardarEntornoSftp(contenido) {
  const etapa = await mkdtemp(join(tmpdir(), 'aletea-entorno-'))
  const local = join(etapa, ARCHIVO_ENTORNO)
  const batch = join(etapa, 'guardar.sftp')
  const remoto = `${DIRECTORIO_ENTORNO}/${ARCHIVO_ENTORNO}`
  const temporal = `${remoto}.aletea.tmp`
  const conexion = {
    host: process.env.ALETEA_SSH_HOST || 'adriana.servidorlinux11.com',
    usuario: process.env.ALETEA_SSH_USER || USUARIO_PREDETERMINADO,
    puerto: Number(process.env.ALETEA_SSH_PORT || 2200),
    clave: resolve(process.env.ALETEA_SSH_KEY || join(homedir(), '.ssh', 'aletea_deploy_ed25519')),
  }
  try {
    await writeFile(local, contenido, { mode: 0o600 })
    await writeFile(batch, [
      `put ${escaparSftp(local)} ${escaparSftp(temporal)}`,
      `chmod 600 ${escaparSftp(temporal)}`,
      `-rm ${escaparSftp(remoto)}`,
      `rename ${escaparSftp(temporal)} ${escaparSftp(remoto)}`,
      '',
    ].join('\n'), { mode: 0o600 })
    execFileSync('sftp', argumentosSftp({ ...conexion, batch }), { stdio: 'ignore' })
  } finally {
    await rm(etapa, { recursive: true, force: true })
  }
}

function direccionesDeContacto(datos) {
  return Object.entries(datos || {})
    .filter(([nombre, valor]) => /contact.*email|email.*contact/i.test(nombre) && typeof valor === 'string' && valor.includes('@'))
    .map(([, valor]) => valor.trim())
    .filter(Boolean)
}

export async function configurarCpanel({
  api,
  aplicar = false,
  leerClave = leerClaveKeychain,
  guardarClave = guardarClaveKeychain,
  crearClave = generarClave,
  guardarEntorno = guardarEntornoSftp,
  informar = (mensaje) => console.log(mensaje),
} = {}) {
  if (!api) throw new Error('Falta el cliente de cPanel.')

  const [cuentas, aplicaciones, informacionUsuario, crons, archivosPrivados] = await Promise.all([
    api.uapi('Email', 'list_pops_with_disk'),
    api.uapi('PassengerApps', 'list_applications'),
    api.uapi('Variables', 'get_user_information'),
    api.api2('Cron', 'listcron'),
    api.uapi('Fileman', 'list_files', { dir: DIRECTORIO_ENTORNO, show_hidden: 1, types: 'file' }),
  ])
  const aplicacion = encontrarAplicacion(aplicaciones)
  const contacto = direccionesDeContacto(informacionUsuario)[0]
  if (!contacto) throw new Error('cPanel no tiene un correo de contacto válido para los avisos de Cron.')

  let claveSmtp = leerClave()
  const existe = cuentaExiste(cuentas)
  const acciones = []

  if (!existe) {
    if (!claveSmtp) {
      claveSmtp = crearClave()
      if (aplicar) guardarClave(claveSmtp)
    }
    acciones.push('crear cuenta remitente')
  } else if (!claveSmtp && aplicacion.envvars?.SMTP_PASSWORD) {
    claveSmtp = aplicacion.envvars.SMTP_PASSWORD
    if (aplicar) guardarClave(claveSmtp)
  }
  if (!claveSmtp) throw new Error(`La cuenta ${CUENTA_COMPLETA} existe, pero su clave SMTP no está disponible en Keychain ni en Passenger.`)

  const listaArchivos = Array.isArray(archivosPrivados) ? archivosPrivados : (archivosPrivados?.files || [])
  const existeEntorno = listaArchivos.some((entrada) => entrada?.file === ARCHIVO_ENTORNO || entrada?.name === ARCHIVO_ENTORNO)
  const contenidoExistente = existeEntorno
    ? (await api.uapi('Fileman', 'get_file_content', {
        dir: DIRECTORIO_ENTORNO, file: ARCHIVO_ENTORNO, from_charset: 'utf-8', to_charset: 'utf-8',
      }))?.content || ''
    : ''
  const variables = combinarVariables(aplicacion.envvars, claveSmtp)
  const variablesArchivo = { ...VARIABLES_CORREO, SMTP_PASSWORD: claveSmtp }
  const contenidoEntorno = fusionarTextoEntorno(contenidoExistente, variablesArchivo)
  const comandosExistentes = new Set((Array.isArray(crons) ? crons : []).map((entrada) => entrada?.command).filter(Boolean))
  const trabajosFaltantes = TRABAJOS_CRON.filter((trabajo) => !comandosExistentes.has(trabajo.command))
  acciones.push('aplicar DMARC en modo monitoreo')
  acciones.push('actualizar el archivo privado de entorno')
  acciones.push('corregir el correo de avisos de Cron')
  acciones.push(...trabajosFaltantes.map((trabajo) => `crear Cron: ${trabajo.command.split(' ').at(-1)}`))

  if (!aplicar) {
    informar(`Simulación lista: ${acciones.join(', ')}.`)
    return { aplicar: false, acciones, variables: Object.keys(variables).sort(), trabajosFaltantes: trabajosFaltantes.length }
  }

  if (!existe) {
    await api.uapi('Email', 'add_pop', {
      email: CUENTA_LOCAL,
      domain: DOMINIO_CORREO,
      password: claveSmtp,
      quota: 1024,
      send_welcome_email: 0,
    })
    informar('Cuenta remitente creada y clave guardada de forma privada.')
  }

  await api.uapi('EmailAuth', 'apply_dmarc', {
    domain: DOMINIO_CORREO,
    policy: 'v=DMARC1; p=none;',
  })
  informar('DMARC aplicado en modo de monitoreo.')

  await guardarEntorno(contenidoEntorno)
  informar(`Entorno privado actualizado preservando ${Object.keys(aplicacion.envvars || {}).length} variables existentes.`)

  await api.api2('Cron', 'set_email', { email: contacto })
  for (const trabajo of trabajosFaltantes) await api.api2('Cron', 'add_line', trabajo)
  informar(`Cron configurado con ${TRABAJOS_CRON.length} trabajos esperados.`)

  const [cuentasFinales, cronsFinales, correoCronFinal, entornoFinal] = await Promise.all([
    api.uapi('Email', 'list_pops_with_disk'),
    api.api2('Cron', 'listcron'),
    api.api2('Cron', 'get_email'),
    api.uapi('Fileman', 'get_file_content', {
      dir: DIRECTORIO_ENTORNO, file: ARCHIVO_ENTORNO, from_charset: 'utf-8', to_charset: 'utf-8',
    }),
  ])
  const comandosFinales = new Set((Array.isArray(cronsFinales) ? cronsFinales : []).map((entrada) => entrada?.command).filter(Boolean))
  const correoCron = Array.isArray(correoCronFinal) ? correoCronFinal[0]?.email : ''
  const variablesEsperadas = Object.keys(VARIABLES_CORREO).concat('SMTP_PASSWORD')
  const textoEntornoFinal = String(entornoFinal?.content || '')

  if (!cuentaExiste(cuentasFinales)) throw new Error('cPanel no confirmó la cuenta remitente.')
  if (!variablesEsperadas.every((nombre) => new RegExp(`^${nombre}=.+$`, 'm').test(textoEntornoFinal))) {
    throw new Error('cPanel no confirmó todas las variables del entorno privado.')
  }
  if (!TRABAJOS_CRON.every((trabajo) => comandosFinales.has(trabajo.command))) throw new Error('cPanel no confirmó todos los trabajos Cron.')
  if (correoCron !== contacto) throw new Error('cPanel no confirmó el correo de avisos de Cron.')

  informar('Configuración de cPanel verificada sin exponer credenciales.')
  return {
    aplicar: true,
    cuenta: CUENTA_COMPLETA,
    dmarc: 'p=none',
    variables: variablesEsperadas.sort(),
    trabajos: TRABAJOS_CRON.length,
    correoCronConfigurado: true,
  }
}

export async function principal(argumentos = process.argv.slice(2)) {
  const opciones = opcionesDesde(argumentos)
  const usuario = process.env.CPANEL_USER || USUARIO_PREDETERMINADO
  const api = new CpanelApi({
    host: process.env.CPANEL_HOST || HOST_PREDETERMINADO,
    usuario,
    token: tokenDesdeKeychain(usuario),
  })
  const resultado = await configurarCpanel({ api, aplicar: opciones.aplicar })
  console.log(JSON.stringify(resultado, null, 2))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  principal().catch((error) => {
    console.error(`No se pudo configurar cPanel: ${error.message}`)
    process.exitCode = 1
  })
}

export const _pruebas = { direccionesDeContacto, generarClave, escaparSftp }
