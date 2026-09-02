import { readFile } from 'node:fs/promises'
import { auditarContenidoEditorial, auditarGlosario } from '../js/modelo/auditoria-ui-ux.js'

const glosario = JSON.parse(await readFile(new URL('../docs/glosario-institucional.json', import.meta.url), 'utf8'))
const contenido = JSON.parse(await readFile(new URL('../assets/pagina-publica-v1.json', import.meta.url), 'utf8'))
const errores = [...auditarGlosario(glosario), ...auditarContenidoEditorial(contenido)]
const recibo = { glosario: Object.keys(glosario.terminos).length, navegacion: contenido.navegacion.length, errores }
console.log(JSON.stringify(recibo, null, 2))
if (errores.length) process.exitCode = 1
