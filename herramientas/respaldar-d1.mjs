import { mkdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { cifrarRespaldo, escribirManifiesto } from './respaldo-d1-comun.mjs'

const argumentos = new Set(process.argv.slice(2))
if (!argumentos.has('--confirmar-remoto')) {
  console.error('No se exportó nada. Repetí con --confirmar-remoto cuando tengas autorización para leer la base de producción.')
  process.exit(2)
}
const frase = process.env.ALETEA_BACKUP_PASSPHRASE
if (!frase || frase.length < 16) {
  console.error('Definí ALETEA_BACKUP_PASSPHRASE con al menos 16 caracteres antes de exportar.')
  process.exit(2)
}
const fecha = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
const carpeta = resolve('respaldos', fecha)
mkdirSync(resolve('respaldos'), { recursive: true })
mkdirSync(carpeta, { recursive: false })
const rutaSql = join(carpeta, 'aletea-d1.sql')
const exportacion = spawnSync('npx', ['wrangler', 'd1', 'export', 'voluntarios-fsb', '--remote', '--output', rutaSql], { stdio: 'inherit' })
if (exportacion.status !== 0) process.exit(exportacion.status || 1)
const rutaCifrada = `${rutaSql}.enc`
cifrarRespaldo(rutaSql, rutaCifrada, frase)
rmSync(rutaSql)
const { manifiesto } = escribirManifiesto(rutaCifrada, { origen: 'cloudflare-d1-remoto', base: 'voluntarios-fsb', cifrado: 'aes-256-gcm-scrypt' })
console.log(JSON.stringify({ respaldo: carpeta, sha256: manifiesto.sha256, bytes: manifiesto.bytes }))
