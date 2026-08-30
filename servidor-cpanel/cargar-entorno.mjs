import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const VARIABLES_BASE = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']

export function interpretarEntorno(texto) {
  const resultado = {}
  for (const lineaCruda of String(texto || '').split(/\r?\n/)) {
    const linea = lineaCruda.trim()
    if (!linea || linea.startsWith('#')) continue
    const separador = linea.indexOf('=')
    if (separador < 1) continue
    const nombre = linea.slice(0, separador).trim()
    let valor = linea.slice(separador + 1).trim()
    if (!/^[A-Z][A-Z0-9_]*$/.test(nombre)) continue
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
      valor = valor.slice(1, -1)
    }
    resultado[nombre] = valor
  }
  return resultado
}

export function cargarEntornoPrivadoSiFalta({
  entorno = process.env,
  ruta = entorno.GESTOR_ENV_FILE || join(homedir(), '.gestor-aletea.env'),
  leer = readFileSync,
} = {}) {
  if (VARIABLES_BASE.every((nombre) => entorno[nombre])) return { origen: 'entorno', cargadas: [] }
  let texto
  try {
    texto = leer(ruta, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return { origen: 'ausente', cargadas: [] }
    throw error
  }
  const privadas = interpretarEntorno(texto)
  const cargadas = []
  for (const [nombre, valor] of Object.entries(privadas)) {
    if (!entorno[nombre] && valor) {
      entorno[nombre] = valor
      cargadas.push(nombre)
    }
  }
  return { origen: 'archivo-privado', cargadas }
}

cargarEntornoPrivadoSiFalta()
