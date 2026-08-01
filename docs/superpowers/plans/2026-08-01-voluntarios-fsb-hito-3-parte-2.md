# VoluntariosFSB, plan del hito 3, segunda parte

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que varias coordinadoras compartan los mismos datos a través de un repositorio privado de GitHub, cada una con su usuario y su contraseña, sin que ninguna necesite cuenta de GitHub.

**Architecture:** Un único token de GitHub, cifrado por separado con la contraseña de cada coordinadora, en `usuarios.json` del repositorio público. Al ingresar, el navegador descifra el token y se lo pasa al cliente de la API. Las pantallas siguen hablando solo con `js/almacen/indice.js`, que ahora elige entre respaldo local y remoto.

**Continúa:** `docs/superpowers/plans/2026-08-01-voluntarios-fsb-hito-3.md`, tareas 15 a 17, terminadas.

---

## Estado del que se parte

229 pruebas verdes. Piezas nuevas ya disponibles:

```
js/config.js            CONFIG con duenio, repoPublico, repoDatos, rama
js/acceso/cripto.js     ITERACIONES, cifrar, descifrar, generarContrasena
js/almacen/github.js    crearClienteGitHub, ConflictoError
                        leerTexto, escribirTexto, leerBytes, escribirBytes,
                        borrar, listar, verificarAcceso
js/ui/pantalla-vista-previa.js  crearPantallaVistaPrevia, DENSIDAD
```

`duenio: 'CorvusDevs'` está confirmado por el usuario.

Datos medidos que condicionan el diseño:
- Descifrar cuesta 53 ms en escritorio Apple Silicon, unos 200 ms en un teléfono de gama media. **No hace falta indicador de progreso.**
- Las contraseñas generadas tienen 93,33 bits de entropía y un largo mínimo obligatorio de 16.

## Estructura de archivos

```
js/acceso/usuarios.js       lectura y escritura de usuarios.json
js/acceso/sesion.js         ingreso, token en memoria, recordar dispositivo, cierre
js/almacen/remoto.js        las ocho funciones sobre github.js
js/ui/pantalla-ingreso.js   usuario y contrasena
js/ui/pantalla-ajustes.js   coordinadoras, rotacion de token, cierre de sesion
```

Se modifican `js/almacen/indice.js` y `js/app.js`. Nada más de lo ya construido cambia.

---

## Task 18: usuarios.json y sesión

**Files:**
- Create: `js/acceso/usuarios.js`, `js/acceso/sesion.js`
- Test: `test/acceso/usuarios.test.js`, `test/acceso/sesion.test.js`

### 18.1 usuarios.js

El archivo se LEE desde `raw.githubusercontent.com`, que habilita CORS y no consume cuota de la API, y se ESCRIBE por la API contra el repositorio público. Leer no necesita token: el archivo es público a propósito, porque una coordinadora tiene que poder ingresar antes de tener token.

Forma del archivo, ya fijada por la especificación sección 6.1:

```json
{
  "version": 1,
  "usuarios": [
    {
      "usuario": "majo",
      "nombre": "Majo",
      "rol": "admin",
      "kdf": { "algoritmo": "PBKDF2-SHA256", "iteraciones": 600000, "sal": "<base64>" },
      "cifrado": { "algoritmo": "AES-GCM", "iv": "<base64>", "datos": "<base64>" }
    }
  ]
}
```

### Roles

Hay exactamente dos, y el módulo los valida:

| Rol | Puede |
| --- | --- |
| `admin` | Todo lo de coordinación, más agregar y quitar personas de esta lista, cambiarles el rol, y rotar el token |
| `coordinacion` | Armar listas, gestionar participantes y voluntarios, exportar la imagen |

Una administradora puede crear otras administradoras. Esto es deliberado: la organización no debe depender de una sola persona para dar de alta a alguien un viernes a la noche.

**Nunca puede quedar la lista sin ninguna administradora.** Ni quitando a la última, ni bajándole el rol. El sistema no quedaría inutilizable, porque la persona dueña siempre puede entrar pegando el token directamente, pero es un mal rato evitable y el módulo lo impide con un error claro.

Ese guardia vive en `usuarios.js`, no en la pantalla, para que ninguna interfaz futura pueda saltearlo.

- [ ] **Step 1: Escribir la prueba que falla**

```js
import { describe, it, expect } from 'vitest'
import {
  archivoVacio, leerUsuarios, buscarUsuario, agregarUsuario, quitarUsuario,
  cambiarRol, esAdmin, urlUsuarios,
} from '../../js/acceso/usuarios.js'

const REGISTRO = {
  kdf: { algoritmo: 'PBKDF2-SHA256', iteraciones: 600000, sal: 'c2Fs' },
  cifrado: { algoritmo: 'AES-GCM', iv: 'aXY=', datos: 'ZGF0b3M=' },
}

const ARCHIVO = {
  version: 1,
  usuarios: [{ usuario: 'majo', nombre: 'Majo', rol: 'admin', ...REGISTRO }],
}

describe('urlUsuarios', () => {
  it('apunta a raw.githubusercontent, no a la API', () => {
    const url = urlUsuarios({ duenio: 'd', repoPublico: 'r', rama: 'main' })
    expect(url).toContain('raw.githubusercontent.com/d/r/main/usuarios.json')
    expect(url).not.toContain('api.github.com')
  })
})

describe('archivoVacio', () => {
  it('trae version y una lista vacia', () => {
    expect(archivoVacio()).toEqual({ version: 1, usuarios: [] })
  })
})

describe('leerUsuarios', () => {
  it('descarga y parsea el archivo', async () => {
    const fetchFn = async () => ({ ok: true, status: 200, json: async () => ARCHIVO })
    expect((await leerUsuarios({ duenio: 'd', repoPublico: 'r', rama: 'main', fetchFn })).usuarios)
      .toHaveLength(1)
  })

  it('devuelve un archivo vacio si todavia no existe', async () => {
    const fetchFn = async () => ({ ok: false, status: 404, json: async () => ({}) })
    expect(await leerUsuarios({ duenio: 'd', repoPublico: 'r', rama: 'main', fetchFn }))
      .toEqual({ version: 1, usuarios: [] })
  })

  it('pide sin cache para no arrastrar los 5 minutos de raw', async () => {
    let opcionesVistas = null
    const fetchFn = async (url, opciones) => {
      opcionesVistas = opciones
      return { ok: true, status: 200, json: async () => ARCHIVO }
    }
    await leerUsuarios({ duenio: 'd', repoPublico: 'r', rama: 'main', fetchFn })
    expect(opcionesVistas.cache).toBe('no-store')
  })

  it('falla con mensaje claro ante un error que no sea 404', async () => {
    const fetchFn = async () => ({ ok: false, status: 500, json: async () => ({}) })
    await expect(leerUsuarios({ duenio: 'd', repoPublico: 'r', rama: 'main', fetchFn }))
      .rejects.toThrow(/500/)
  })
})

describe('buscarUsuario', () => {
  it('encuentra sin importar mayusculas ni espacios', () => {
    expect(buscarUsuario(ARCHIVO, '  MAJO ').nombre).toBe('Majo')
  })

  it('devuelve null si no esta', () => {
    expect(buscarUsuario(ARCHIVO, 'otra')).toBeNull()
  })
})

describe('agregarUsuario', () => {
  it('suma el registro cifrado sin tocar el original', () => {
    const nuevo = agregarUsuario(ARCHIVO, { usuario: 'ana', nombre: 'Ana' }, REGISTRO)
    expect(nuevo.usuarios).toHaveLength(2)
    expect(ARCHIVO.usuarios).toHaveLength(1)
    expect(buscarUsuario(nuevo, 'ana').cifrado.datos).toBe('ZGF0b3M=')
  })

  it('por defecto crea una coordinadora, no una administradora', () => {
    expect(buscarUsuario(agregarUsuario(ARCHIVO, { usuario: 'ana', nombre: 'Ana' }, REGISTRO), 'ana').rol)
      .toBe('coordinacion')
  })

  it('permite crear otra administradora', () => {
    const nuevo = agregarUsuario(ARCHIVO, { usuario: 'ana', nombre: 'Ana', rol: 'admin' }, REGISTRO)
    expect(buscarUsuario(nuevo, 'ana').rol).toBe('admin')
  })

  it('rechaza un rol que no exista', () => {
    expect(() => agregarUsuario(ARCHIVO, { usuario: 'ana', nombre: 'Ana', rol: 'jefa' }, REGISTRO))
      .toThrow(/rol/i)
  })

  it('normaliza el usuario a minuscula sin espacios', () => {
    expect(agregarUsuario(ARCHIVO, { usuario: '  Ana  ', nombre: 'Ana' }, REGISTRO).usuarios[1].usuario)
      .toBe('ana')
  })

  it('rechaza un usuario repetido', () => {
    expect(() => agregarUsuario(ARCHIVO, { usuario: 'MAJO', nombre: 'x' }, REGISTRO))
      .toThrow(/ya existe/i)
  })

  it('rechaza un usuario vacio', () => {
    expect(() => agregarUsuario(ARCHIVO, { usuario: '  ', nombre: 'x' }, REGISTRO)).toThrow()
  })
})

describe('cambiarRol', () => {
  it('asciende a una coordinadora', () => {
    const conDos = agregarUsuario(ARCHIVO, { usuario: 'ana', nombre: 'Ana' }, REGISTRO)
    expect(buscarUsuario(cambiarRol(conDos, 'ana', 'admin'), 'ana').rol).toBe('admin')
  })

  it('no toca el archivo original', () => {
    const conDos = agregarUsuario(ARCHIVO, { usuario: 'ana', nombre: 'Ana' }, REGISTRO)
    cambiarRol(conDos, 'ana', 'admin')
    expect(buscarUsuario(conDos, 'ana').rol).toBe('coordinacion')
  })

  it('rechaza dejar la lista sin ninguna administradora', () => {
    expect(() => cambiarRol(ARCHIVO, 'majo', 'coordinacion')).toThrow(/administradora/i)
  })

  it('permite bajar a una administradora si queda otra', () => {
    const conDos = agregarUsuario(ARCHIVO, { usuario: 'ana', nombre: 'Ana', rol: 'admin' }, REGISTRO)
    expect(buscarUsuario(cambiarRol(conDos, 'ana', 'coordinacion'), 'ana').rol).toBe('coordinacion')
  })

  it('falla si el usuario no existe', () => {
    expect(() => cambiarRol(ARCHIVO, 'nadie', 'admin')).toThrow(/nadie/)
  })

  it('rechaza un rol que no exista', () => {
    expect(() => cambiarRol(ARCHIVO, 'majo', 'jefa')).toThrow(/rol/i)
  })
})

describe('quitarUsuario', () => {
  it('saca a una coordinadora sin tocar el original', () => {
    const conDos = agregarUsuario(ARCHIVO, { usuario: 'ana', nombre: 'Ana' }, REGISTRO)
    expect(quitarUsuario(conDos, 'ana').usuarios).toHaveLength(1)
    expect(conDos.usuarios).toHaveLength(2)
  })

  it('rechaza quitar a la ultima administradora', () => {
    expect(() => quitarUsuario(ARCHIVO, 'majo')).toThrow(/administradora/i)
  })

  it('permite quitar a una administradora si queda otra', () => {
    const conDos = agregarUsuario(ARCHIVO, { usuario: 'ana', nombre: 'Ana', rol: 'admin' }, REGISTRO)
    expect(quitarUsuario(conDos, 'majo').usuarios).toHaveLength(1)
  })

  it('no falla si no estaba', () => {
    expect(quitarUsuario(ARCHIVO, 'nadie').usuarios).toHaveLength(1)
  })
})

describe('esAdmin', () => {
  it('reconoce el rol', () => {
    expect(esAdmin(buscarUsuario(ARCHIVO, 'majo'))).toBe(true)
    expect(esAdmin({ rol: 'coordinacion' })).toBe(false)
    expect(esAdmin(null)).toBe(false)
  })
})
```

Notar que `ARCHIVO` en estas pruebas tiene a `majo` con rol `admin`, y es la única, que es lo que hace posible probar los guardias.

- [ ] **Step 2: Correr para ver fallar**

Run: `npx vitest run test/acceso/usuarios.test.js`

- [ ] **Step 3: Escribir `js/acceso/usuarios.js`**

```js
const normalizar = (usuario) => String(usuario ?? '').trim().toLowerCase()

export function urlUsuarios({ duenio, repoPublico, rama }) {
  return `https://raw.githubusercontent.com/${duenio}/${repoPublico}/${rama}/usuarios.json`
}

export function archivoVacio() {
  return { version: 1, usuarios: [] }
}

export async function leerUsuarios({ duenio, repoPublico, rama, fetchFn }) {
  const pedir = fetchFn ?? fetch
  const respuesta = await pedir(urlUsuarios({ duenio, repoPublico, rama }), { cache: 'no-store' })
  if (respuesta.status === 404) return archivoVacio()
  if (!respuesta.ok) {
    throw new Error(`No se pudo leer la lista de coordinadoras. GitHub respondio ${respuesta.status}.`)
  }
  return respuesta.json()
}

export const ROLES = ['admin', 'coordinacion']

export function esAdmin(registro) {
  return registro?.rol === 'admin'
}

function validarRol(rol) {
  if (!ROLES.includes(rol)) {
    throw new Error(`Rol invalido: ${rol}. Solo se admiten ${ROLES.join(' y ')}.`)
  }
  return rol
}

function exigirQuedeUnAdmin(usuarios) {
  if (!usuarios.some(esAdmin)) {
    throw new Error('Tiene que quedar al menos una administradora.')
  }
  return usuarios
}

export function buscarUsuario(archivo, usuario) {
  const clave = normalizar(usuario)
  return archivo.usuarios.find((u) => u.usuario === clave) ?? null
}

export function agregarUsuario(archivo, { usuario, nombre, rol = 'coordinacion' }, registro) {
  const clave = normalizar(usuario)
  if (!clave) throw new Error('El usuario no puede estar vacio.')
  if (buscarUsuario(archivo, clave)) throw new Error(`El usuario ${clave} ya existe.`)
  validarRol(rol)
  const nuevo = { usuario: clave, nombre: String(nombre ?? clave).trim(), rol, ...registro }
  return { ...archivo, usuarios: [...archivo.usuarios, nuevo] }
}

export function cambiarRol(archivo, usuario, rol) {
  const clave = normalizar(usuario)
  validarRol(rol)
  if (!buscarUsuario(archivo, clave)) throw new Error(`No existe el usuario ${clave}.`)
  const usuarios = archivo.usuarios.map((u) => (u.usuario === clave ? { ...u, rol } : u))
  return { ...archivo, usuarios: exigirQuedeUnAdmin(usuarios) }
}

export function quitarUsuario(archivo, usuario) {
  const clave = normalizar(usuario)
  const usuarios = archivo.usuarios.filter((u) => u.usuario !== clave)
  if (usuarios.length === archivo.usuarios.length) return { ...archivo, usuarios }
  return { ...archivo, usuarios: exigirQuedeUnAdmin(usuarios) }
}
```

`exigirQuedeUnAdmin` se aplica sobre la lista RESULTANTE, no sobre la anterior, así que cubre por igual quitar a la última administradora y bajarle el rol. Vive acá y no en la pantalla para que ninguna interfaz futura pueda saltearlo.

`quitarUsuario` con un usuario inexistente devuelve el archivo sin cambios y sin evaluar el guardia, porque no quitó a nadie y no tiene sentido que falle por algo que no hizo.

`cache: 'no-store'` es deliberado. `raw.githubusercontent.com` cachea 5 minutos, verificado, y sin esto una coordinadora recién agregada no podría entrar hasta que venza el caché del navegador además del de GitHub.

- [ ] **Step 4: Correr, ver pasar, commitear**

```bash
git add js/acceso/usuarios.js test/acceso/usuarios.test.js
git commit -m "Lectura y escritura de la lista de coordinadoras"
```

### 18.2 sesion.js

- [ ] **Step 5: Escribir la prueba que falla**

```js
import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { ingresar, recordar, recuperarRecordado, olvidar } from '../../js/acceso/sesion.js'
import { cifrar, archivoConUsuario } from './ayuda-sesion.js'

let archivo

beforeEach(async () => {
  indexedDB.deleteDatabase('voluntarios-fsb-sesion')
  archivo = await archivoConUsuario('majo', 'Majo', 'ContrasenaDePrueba01', 'ghp_token')
})

describe('ingresar', () => {
  it('devuelve el token y el nombre con la contrasena correcta', async () => {
    const sesion = await ingresar({ archivo, usuario: 'majo', contrasena: 'ContrasenaDePrueba01' })
    expect(sesion.token).toBe('ghp_token')
    expect(sesion.nombre).toBe('Majo')
  })

  it('acepta el usuario con mayusculas y espacios', async () => {
    const sesion = await ingresar({ archivo, usuario: ' MAJO ', contrasena: 'ContrasenaDePrueba01' })
    expect(sesion.token).toBe('ghp_token')
  })

  it('falla con la contrasena equivocada', async () => {
    await expect(ingresar({ archivo, usuario: 'majo', contrasena: 'otra' })).rejects.toThrow()
  })

  it('da el mismo mensaje si el usuario no existe que si la contrasena esta mal', async () => {
    const a = await ingresar({ archivo, usuario: 'majo', contrasena: 'mal' }).catch((e) => e.message)
    const b = await ingresar({ archivo, usuario: 'nadie', contrasena: 'mal' }).catch((e) => e.message)
    expect(a).toBe(b)
  })
})

describe('recordar y recuperar', () => {
  it('recupera el token guardado', async () => {
    await recordar('ghp_token', 'Majo')
    const recordado = await recuperarRecordado()
    expect(recordado.token).toBe('ghp_token')
    expect(recordado.nombre).toBe('Majo')
  })

  it('devuelve null si no hay nada guardado', async () => {
    expect(await recuperarRecordado()).toBeNull()
  })

  it('olvidar borra el token', async () => {
    await recordar('ghp_token', 'Majo')
    await olvidar()
    expect(await recuperarRecordado()).toBeNull()
  })

  it('guarda el token cifrado, no en claro', async () => {
    await recordar('ghp_token_secreto', 'Majo')
    const crudo = await leerCrudoDeIndexedDB()
    expect(JSON.stringify(crudo)).not.toContain('ghp_token_secreto')
  })

  it('la clave del dispositivo no se puede exportar', async () => {
    await recordar('ghp_token', 'Majo')
    const crudo = await leerCrudoDeIndexedDB()
    expect(crudo.clave.extractable).toBe(false)
    await expect(crypto.subtle.exportKey('raw', crudo.clave)).rejects.toThrow()
  })
})
```

El archivo de ayuda `test/acceso/ayuda-sesion.js` construye un archivo de usuarios real usando `cifrar` de `js/acceso/cripto.js`, y expone `leerCrudoDeIndexedDB` que abre la base y devuelve el registro guardado sin pasar por `sesion.js`. Escribirlo como parte de este paso.

- [ ] **Step 6: Escribir `js/acceso/sesion.js`**

```js
import { descifrar } from './cripto.js'
import { buscarUsuario } from './usuarios.js'

const BASE = 'voluntarios-fsb-sesion'
const DEPOSITO = 'sesion'
const CLAVE = 'actual'
const MENSAJE_INVALIDO = 'Usuario o contrasena incorrectos.'

export async function ingresar({ archivo, usuario, contrasena }) {
  const registro = buscarUsuario(archivo, usuario)
  if (!registro) throw new Error(MENSAJE_INVALIDO)
  let token
  try {
    token = await descifrar(registro, contrasena)
  } catch {
    throw new Error(MENSAJE_INVALIDO)
  }
  return { token, nombre: registro.nombre, usuario: registro.usuario, rol: registro.rol }
}

function abrir() {
  return new Promise((resolver, rechazar) => {
    const solicitud = indexedDB.open(BASE, 1)
    solicitud.onupgradeneeded = () => {
      const db = solicitud.result
      if (!db.objectStoreNames.contains(DEPOSITO)) db.createObjectStore(DEPOSITO)
    }
    solicitud.onsuccess = () => {
      solicitud.result.onversionchange = () => solicitud.result.close()
      resolver(solicitud.result)
    }
    solicitud.onerror = () => rechazar(solicitud.error)
  })
}

function operar(db, modo, accion) {
  return new Promise((resolver, rechazar) => {
    const transaccion = db.transaction(DEPOSITO, modo)
    const solicitud = accion(transaccion.objectStore(DEPOSITO))
    transaccion.onerror = () => rechazar(transaccion.error)
    solicitud.onsuccess = () => resolver(solicitud.result)
    solicitud.onerror = () => rechazar(solicitud.error)
  })
}

export async function recordar(token, nombre) {
  const clave = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const datos = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, clave, new TextEncoder().encode(token),
  )
  const db = await abrir()
  await operar(db, 'readwrite', (d) => d.put({ clave, iv, datos, nombre }, CLAVE))
  db.close()
}

export async function recuperarRecordado() {
  const db = await abrir()
  const guardado = await operar(db, 'readonly', (d) => d.get(CLAVE))
  db.close()
  if (!guardado) return null
  try {
    const datos = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: guardado.iv }, guardado.clave, guardado.datos,
    )
    return { token: new TextDecoder().decode(datos), nombre: guardado.nombre }
  } catch {
    return null
  }
}

export async function olvidar() {
  const db = await abrir()
  await operar(db, 'readwrite', (d) => d.delete(CLAVE))
  db.close()
}
```

La clave se genera con `extractable: false` y se guarda como `CryptoKey` en IndexedDB, que la clona estructuralmente sin exponer el material. Ni siquiera un script en la página puede sacarla; solo puede pedirle al navegador que descifre. El token nunca se guarda en claro, y `MENSAJE_INVALIDO` es idéntico para usuario inexistente y contraseña incorrecta para no revelar quién está dado de alta.

- [ ] **Step 7: Correr, ver pasar, commitear**

```bash
git add js/acceso/sesion.js test/acceso/sesion.test.js test/acceso/ayuda-sesion.js
git commit -m "Sesion con token cifrado y clave de dispositivo no exportable"
```

### Verificación extra de la tarea 18

1. Confirmar con una sonda que `fake-indexeddb` realmente clona un `CryptoKey` conservando `extractable: false`. Si no lo soporta, decirlo antes de seguir; sería una limitación de la prueba, no del navegador, y habría que anotarlo.
2. Reportar cuánto tarda `ingresar` de punta a punta.
3. Confirmar que `leerUsuarios` nunca manda cabecera `Authorization`, porque el archivo es público y pedirlo con token gastaría cuota sin necesidad.

---

## Task 19: Almacén remoto y selector

**Files:**
- Create: `js/almacen/remoto.js`
- Modify: `js/almacen/indice.js`
- Test: `test/almacen/remoto.test.js`

- [ ] **Step 1: Escribir la prueba que falla**

Las pruebas usan un cliente falso con la forma de `crearClienteGitHub`, nunca la red.

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { crearAlmacenRemoto } from '../../js/almacen/remoto.js'
import { ConflictoError } from '../../js/almacen/github.js'
import { ROSTER, LISTA } from '../ayudas/datos.js'

function clienteFalso(archivos = {}) {
  const escrituras = []
  return {
    escrituras,
    archivos,
    async verificarAcceso() { return true },
    async leerTexto(ruta) {
      return archivos[ruta] ? { texto: archivos[ruta].texto, sha: archivos[ruta].sha } : null
    },
    async escribirTexto(ruta, texto, sha, mensaje) {
      escrituras.push({ ruta, texto, sha, mensaje })
      if (archivos[ruta] && archivos[ruta].sha !== sha) throw new ConflictoError('conflicto')
      archivos[ruta] = { texto, sha: `sha-${escrituras.length}` }
      return { sha: archivos[ruta].sha }
    },
    async leerBytes(ruta) {
      return archivos[ruta] ? { bytes: archivos[ruta].bytes, sha: archivos[ruta].sha } : null
    },
    async escribirBytes(ruta, bytes, sha) {
      escrituras.push({ ruta, bytes, sha })
      archivos[ruta] = { bytes, sha: `sha-${escrituras.length}` }
      return { sha: archivos[ruta].sha }
    },
    async borrar(ruta) { delete archivos[ruta] },
    async listar(ruta) {
      return Object.keys(archivos)
        .filter((r) => r.startsWith(`${ruta}/`))
        .map((r) => ({ nombre: r.slice(ruta.length + 1), sha: archivos[r].sha }))
    },
  }
}

let cliente, almacen

beforeEach(() => {
  cliente = clienteFalso()
  almacen = crearAlmacenRemoto({ cliente })
})

describe('roster', () => {
  it('devuelve un roster vacio cuando no hay archivo', async () => {
    expect((await almacen.leerRoster()).participantes).toEqual([])
  })

  it('guarda y recupera', async () => {
    await almacen.guardarRoster(ROSTER)
    expect((await almacen.leerRoster()).participantes).toHaveLength(ROSTER.participantes.length)
  })

  it('lo guarda en roster.json', async () => {
    await almacen.guardarRoster(ROSTER)
    expect(cliente.escrituras[0].ruta).toBe('roster.json')
  })

  it('manda el sha conocido en la segunda escritura', async () => {
    await almacen.guardarRoster(ROSTER)
    await almacen.guardarRoster(ROSTER)
    expect(cliente.escrituras[0].sha).toBeNull()
    expect(cliente.escrituras[1].sha).toBe('sha-1')
  })

  it('propaga el conflicto en vez de pisar', async () => {
    await almacen.guardarRoster(ROSTER)
    cliente.archivos['roster.json'].sha = 'otro'
    await expect(almacen.guardarRoster(ROSTER)).rejects.toBeInstanceOf(ConflictoError)
  })

  it('conserva los acentos ida y vuelta', async () => {
    const conAcento = structuredClone(ROSTER)
    conAcento.participantes[0].nombre = 'Julián Begoña'
    await almacen.guardarRoster(conAcento)
    expect((await almacen.leerRoster()).participantes[0].nombre).toBe('Julián Begoña')
  })
})

describe('listas', () => {
  it('guarda cada lista bajo su fecha', async () => {
    await almacen.guardarLista(LISTA)
    expect(cliente.escrituras[0].ruta).toBe('listas/2026-08-08.json')
  })

  it('lee una lista por fecha', async () => {
    await almacen.guardarLista(LISTA)
    expect((await almacen.leerLista('2026-08-08')).lugar).toBe('Tres Cruces')
  })

  it('devuelve null para una fecha sin lista', async () => {
    expect(await almacen.leerLista('1999-01-01')).toBeNull()
  })

  it('lista las fechas de la mas nueva a la mas vieja', async () => {
    await almacen.guardarLista({ ...LISTA, fecha: '2026-08-01' })
    await almacen.guardarLista({ ...LISTA, fecha: '2026-08-15' })
    await almacen.guardarLista({ ...LISTA, fecha: '2026-08-08' })
    expect((await almacen.listarListas()).map((x) => x.fecha))
      .toEqual(['2026-08-15', '2026-08-08', '2026-08-01'])
  })
})

describe('fotos', () => {
  it('guarda y recupera un blob', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' })
    await almacen.guardarFoto('p1.jpg', blob)
    const recuperada = await almacen.leerFoto('p1.jpg')
    expect(recuperada).toBeInstanceOf(Blob)
    expect(new Uint8Array(await recuperada.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
  })

  it('la guarda bajo fotos/', async () => {
    await almacen.guardarFoto('p1.jpg', new Blob([new Uint8Array([1])]))
    expect(cliente.escrituras[0].ruta).toBe('fotos/p1.jpg')
  })

  it('devuelve null si no existe', async () => {
    expect(await almacen.leerFoto('no.jpg')).toBeNull()
  })

  it('borra', async () => {
    await almacen.guardarFoto('p1.jpg', new Blob([new Uint8Array([1])]))
    await almacen.borrarFoto('p1.jpg')
    expect(await almacen.leerFoto('p1.jpg')).toBeNull()
  })
})

describe('verificacion de acceso', () => {
  it('verifica una sola vez, no en cada lectura', async () => {
    let veces = 0
    cliente.verificarAcceso = async () => { veces += 1; return true }
    await almacen.leerRoster()
    await almacen.leerRoster()
    await almacen.leerLista('2026-08-08')
    expect(veces).toBe(1)
  })
})
```

- [ ] **Step 2 y 3: ver fallar, escribir `js/almacen/remoto.js`**

```js
const RUTA_ROSTER = 'roster.json'
const rutaLista = (fecha) => `listas/${fecha}.json`
const rutaFoto = (clave) => `fotos/${clave}`

export function crearAlmacenRemoto({ cliente, autor = 'la aplicacion' }) {
  const shas = new Map()
  let verificado = null

  async function asegurarAcceso() {
    if (!verificado) verificado = cliente.verificarAcceso()
    return verificado
  }

  async function leerJson(ruta) {
    await asegurarAcceso()
    const datos = await cliente.leerTexto(ruta)
    if (!datos) return null
    shas.set(ruta, datos.sha)
    return JSON.parse(datos.texto)
  }

  async function escribirJson(ruta, valor, mensaje) {
    await asegurarAcceso()
    const texto = JSON.stringify(valor, null, 2)
    const resultado = await cliente.escribirTexto(ruta, texto, shas.get(ruta) ?? null, mensaje)
    shas.set(ruta, resultado.sha)
    return resultado
  }

  return {
    async leerRoster() {
      return (await leerJson(RUTA_ROSTER)) ?? { version: 1, participantes: [], voluntarios: [] }
    },

    guardarRoster(roster) {
      return escribirJson(RUTA_ROSTER, roster, `Actualizar personas desde ${autor}`)
    },

    leerLista(fecha) {
      return leerJson(rutaLista(fecha))
    },

    guardarLista(lista) {
      return escribirJson(rutaLista(lista.fecha), lista, `Actualizar la lista del ${lista.fecha}`)
    },

    async listarListas() {
      await asegurarAcceso()
      const archivos = await cliente.listar('listas')
      return archivos
        .filter((a) => a.nombre.endsWith('.json'))
        .map((a) => ({ fecha: a.nombre.replace(/\.json$/, ''), sha: a.sha }))
        .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    },

    async leerFoto(clave) {
      await asegurarAcceso()
      const datos = await cliente.leerBytes(rutaFoto(clave))
      if (!datos) return null
      shas.set(rutaFoto(clave), datos.sha)
      return new Blob([datos.bytes], { type: 'image/jpeg' })
    },

    async guardarFoto(clave, blob) {
      await asegurarAcceso()
      const bytes = new Uint8Array(await blob.arrayBuffer())
      const ruta = rutaFoto(clave)
      const resultado = await cliente.escribirBytes(
        ruta, bytes, shas.get(ruta) ?? null, `Actualizar la foto ${clave}`,
      )
      shas.set(ruta, resultado.sha)
    },

    async borrarFoto(clave) {
      await asegurarAcceso()
      const ruta = rutaFoto(clave)
      const sha = shas.get(ruta)
      if (!sha) {
        const datos = await cliente.leerBytes(ruta)
        if (!datos) return
        shas.set(ruta, datos.sha)
      }
      await cliente.borrar(ruta, shas.get(ruta), `Borrar la foto ${clave}`)
      shas.delete(ruta)
    },
  }
}
```

`asegurarAcceso` guarda la PROMESA, no un booleano, para que dos lecturas simultáneas al abrir la app no disparen dos verificaciones.

- [ ] **Step 4: Modificar `js/almacen/indice.js`**

```js
import { crearAlmacenLocal } from './local.js'
import { crearAlmacenRemoto } from './remoto.js'
import { crearClienteGitHub } from './github.js'
import { CONFIG } from '../config.js'

let instancia = null
let configuracion = { modo: 'local' }

export function configurar(nueva) {
  configuracion = { ...configuracion, ...nueva }
  instancia = null
}

export function modoActual() {
  return configuracion.modo
}

export async function almacen() {
  if (instancia) return instancia
  if (configuracion.modo === 'github') {
    const cliente = crearClienteGitHub({
      token: configuracion.token,
      duenio: CONFIG.duenio,
      repo: CONFIG.repoDatos,
      rama: CONFIG.rama,
    })
    instancia = crearAlmacenRemoto({ cliente, autor: configuracion.autor ?? 'la aplicacion' })
  } else {
    instancia = await crearAlmacenLocal()
  }
  return instancia
}

export function reiniciarAlmacen() {
  instancia = null
}
```

Este es el único archivo ya existente que cambia. Ninguna pantalla se entera.

- [ ] **Step 5: commit**

```bash
git add js/almacen/remoto.js js/almacen/indice.js test/almacen/remoto.test.js
git commit -m "Almacen remoto sobre GitHub y selector de respaldo"
```

---

## Task 20: Pantalla de ingreso

**Files:**
- Create: `js/ui/pantalla-ingreso.js`
- Modify: `js/app.js`, `css/estilos.css`
- Test: `test/ui/pantalla-ingreso.test.js`

Requisitos:

- Campos `usuario` y `contrasena`, con `data-campo`, y un botón `Entrar`.
- Casilla `Recordarme en este dispositivo`.
- Un único mensaje de error para usuario inexistente y contraseña incorrecta, tomado de `sesion.js`.
- Mientras verifica, el botón se deshabilita y dice `Entrando...`. Con 200 ms medidos no hace falta barra de progreso, pero sí evitar el doble envío.
- Un enlace o texto explicando que la contraseña la entrega quien administra, porque las coordinadoras no la eligen.
- Un modo alternativo `Entrar con un token de GitHub`, plegado, para la persona dueña la primera vez, cuando `usuarios.json` todavía está vacío. Pega el token y entra directamente.

`crearPantallaIngreso(raiz, { alEntrar, leerArchivo })` recibe ambas por inyección para poder probarse sin red. `alEntrar({ token, nombre })` es lo que `js/app.js` usa para configurar el almacén.

Pruebas mínimas: dibuja los campos en español; entra con credenciales correctas y llama a `alEntrar` con el token; muestra el mismo mensaje ante usuario inexistente y contraseña incorrecta; deshabilita el botón mientras verifica; la casilla de recordar llega a `alEntrar`; el modo token llama a `alEntrar` sin pasar por el descifrado.

Commit: `git commit -m "Pantalla de ingreso con usuario y contrasena"`

---

## Task 21: Pantalla de ajustes y coordinadoras

**Files:**
- Create: `js/ui/pantalla-ajustes.js`
- Modify: `js/app.js`, `css/estilos.css`
- Test: `test/ui/pantalla-ajustes.test.js`

Requisitos:

- **Solo se muestra a quien tiene rol `admin`.** Para una coordinadora, la pantalla no aparece siquiera en la navegación. La comprobación usa `esAdmin` sobre el registro de la sesión.
- **Lista de personas con acceso**, con nombre, usuario y rol visible, y por fila un botón `Quitar` y un control para cambiar el rol entre `Administradora` y `Coordinadora`.
- **Agregar persona**: campos usuario y nombre, más un selector de rol que por defecto es `Coordinadora`. **Sin campo de contraseña.** Al confirmar, la aplicación genera la contraseña con `generarContrasena()`, cifra el token con ella, actualiza `usuarios.json` y **muestra la contraseña una sola vez**, en un recuadro destacado, con un botón `Copiar` y el aviso de que no se vuelve a mostrar.
- **Crear otra administradora es explícito y advertido.** Al elegir el rol `Administradora`, mostrar junto al selector: `Va a poder agregar y quitar personas, cambiar roles y rotar el token.` No es una confirmación bloqueante, es una frase que explique qué está entregando.
- **Los guardias de rol viven en `usuarios.js`**, y la pantalla solo muestra el error que ese módulo devuelve. No duplicar la regla acá.
- **Aviso de propagación**: junto a la contraseña, decir que puede tardar hasta 5 minutos en que la persona pueda entrar, por el caché de `raw.githubusercontent.com`.
- **Rotar el token**: campo para pegar un token nuevo, y un botón que vuelve a cifrarlo para todas las personas vigentes de una sola vez. Advertir que las contraseñas actuales dejan de servir y hay que repartir las nuevas.
- **Cerrar sesión**: borra el token del dispositivo con `olvidar()` y vuelve a la pantalla de ingreso.
- **No hay campo para elegir una contraseña.** Ni acá ni en ningún lado. Es requisito de la especificación 6.3.

Pruebas mínimas:

- lista las personas con su rol;
- agregar genera una contraseña de al menos 16 caracteres y la muestra una sola vez;
- **no existe ningún `input[type=password]` ni ningún campo que permita escribir una contraseña de otra persona**;
- el selector de rol por defecto es coordinación;
- se puede crear otra administradora, y al elegir ese rol aparece la advertencia;
- cambiar el rol de una persona actualiza el archivo;
- intentar quitar a la última administradora muestra el error de `usuarios.js` y no cambia nada;
- intentar bajarle el rol a la última administradora hace lo mismo;
- quitar a una coordinadora la saca de la lista;
- rotar el token vuelve a cifrar para todas;
- cerrar sesión llama a `olvidar`;
- **construida con una sesión de rol `coordinacion`, la pantalla no ofrece ninguna de estas acciones.**

Commit: `git commit -m "Pantalla de ajustes con coordinadoras, rotacion de token y cierre de sesion"`

---

## Criterios de aceptación de esta parte

1. Una coordinadora sin cuenta de GitHub entra con usuario y contraseña.
2. El mismo mensaje aparece para usuario inexistente y para contraseña incorrecta.
3. La contraseña la genera siempre la aplicación y se muestra una sola vez.
4. El token nunca se guarda en claro en el dispositivo, y su clave de cifrado no es exportable.
5. Dos coordinadoras escribiendo a la vez producen un aviso, nunca una sobrescritura silenciosa.
6. Cambiar entre respaldo local y remoto no exige tocar ninguna pantalla.
7. Cerrar sesión deja el dispositivo sin token.
8. Una administradora puede crear otras administradoras desde la interfaz.
9. Nunca queda la lista sin ninguna administradora, ni quitándola ni bajándole el rol, y el guardia vive en el modelo y no en la pantalla.
10. Una coordinadora no ve ni puede alcanzar la pantalla de ajustes.
