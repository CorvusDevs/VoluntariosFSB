import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { descifrarRespaldo, verificarRespaldo } from './respaldo-d1-comun.mjs'

const ruta = process.argv[2]
const destino = process.argv[3]
if (!ruta || !destino) {
  console.error('Uso: npm run respaldo:preparar-recuperacion -- <carpeta> <base-d1-vacia-de-destino>')
  process.exit(2)
}
const resultado = verificarRespaldo(ruta)
const temporal = mkdtempSync(join(tmpdir(), 'aletea-recuperacion-autorizada-'))
const sqlTemporal = join(temporal, 'aletea-d1-restauracion.sql')
writeFileSync(sqlTemporal, descifrarRespaldo(resultado.rutaSql, process.env.ALETEA_BACKUP_PASSPHRASE), { mode: 0o600, flag: 'wx' })
console.log(JSON.stringify({ verificado: true, integridad: resultado.integridad, tablas: resultado.tablas, sha256: resultado.sha256 }))
console.log(`Comando preparado para una base vacía: npx wrangler d1 execute ${JSON.stringify(destino)} --remote --file ${JSON.stringify(sqlTemporal)}`)
console.log(`Eliminá el SQL temporal después del ensayo: ${sqlTemporal}`)
console.log('Este asistente no ejecuta la recuperación ni sobrescribe producción. El SQL temporal tiene permisos exclusivos para tu usuario.')
