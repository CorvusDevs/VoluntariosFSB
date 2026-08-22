import { verificarRespaldo } from './respaldo-d1-comun.mjs'

const ruta = process.argv[2]
if (!ruta) {
  console.error('Uso: npm run respaldo:verificar -- <carpeta-del-respaldo>')
  process.exit(2)
}
try { console.log(JSON.stringify(verificarRespaldo(ruta))) } catch (error) { console.error(error.message); process.exit(1) }
