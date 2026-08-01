# VoluntariosFSB, plan de implementación del hito 3

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar el círculo de la aplicación: ver y descargar la imagen desde adentro, y permitir que varias coordinadoras compartan los mismos datos a través de un repositorio privado de GitHub, cada una con su usuario y su contraseña.

**Architecture:** Las pantallas ya construidas no cambian, solo aparecen nuevas. El almacenamiento sigue detrás de la misma interfaz de ocho funciones; `js/almacen/indice.js` aprende a elegir entre el respaldo local y uno nuevo contra la API de GitHub. El acceso se apoya en un único token de GitHub cifrado con la contraseña de cada coordinadora, guardado en un archivo del repositorio público. La criptografía es la nativa del navegador, sin librerías.

**Tech Stack:** Los mismos módulos ES nativos sin compilación. Se agregan `crypto.subtle` para PBKDF2 y AES-GCM, y `fetch` contra `api.github.com` y `raw.githubusercontent.com`.

**Referencias:** `docs/superpowers/specs/2026-07-31-voluntarios-fsb-design.md`, secciones 4, 6 y 7.2. Plan anterior: `docs/superpowers/plans/2026-07-31-voluntarios-fsb-hitos-1-y-2.md`, incluida su sección final de cambios autorizados.

---

## Estado del que se parte

Hitos 1 y 2 terminados, 174 pruebas verdes. Existen:

```
js/util/fechas.js        formatearFechaLarga, formatearFechaCorta, hoyISO, proximoSabado
js/util/nombres.js       iniciales, sinAcentos, coincide, ordenarPorNombre
js/imagen/tema.js        ANCHO, COLORES, FUENTES, medidas, contraste
js/imagen/maquetar.js    maquetar(lista, roster, opciones) -> plano
js/imagen/pintar.js      pintar(ctx, plano, imagenes, densidad)
js/imagen/exportar.js    nombreDeArchivo, medidorDesde, esperarFuentes, cargarImagen,
                         aBlob, descargar, compartir
js/modelo/roster.js      rosterVacio, agregarParticipante, agregarVoluntario, editarPersona,
                         desactivarPersona, reactivarPersona, activos, buscarPersonas
js/modelo/lista.js       crearLista, asignarVoluntario, quitarVoluntario, fusionarParticipantes,
                         separarParticipante, moverAGrupo, agregarApoyo, quitarApoyo,
                         contarPendientes, filaDe, sincronizarConRoster
js/modelo/deshacer.js    crearPila
js/almacen/local.js      crearAlmacenLocal, las ocho funciones
js/almacen/indice.js     almacen(), reiniciarAlmacen()
js/ui/componentes.js     escapar, elemento, ficha, boton, vaciar
js/ui/pantalla-lista.js, js/ui/pantalla-personas.js, js/ui/fotos.js, js/app.js
```

## Estructura de archivos nueva

```
js/config.js                     duenio y nombres de repositorio, editables sin tocar logica
js/acceso/cripto.js              PBKDF2 y AES-GCM sobre crypto.subtle, y generacion de contrasenas
js/acceso/usuarios.js            lectura y escritura de usuarios.json
js/acceso/sesion.js              ingreso, token en memoria, recordar dispositivo, cierre de sesion
js/almacen/github.js             cliente de la API REST de GitHub, con sha y conflictos
js/almacen/remoto.js             las ocho funciones implementadas sobre github.js
js/ui/pantalla-vista-previa.js   la imagen dentro de la aplicacion
js/ui/pantalla-ingreso.js        usuario y contrasena
js/ui/pantalla-ajustes.js        coordinadoras, token, textos y cierre de sesion
```

`js/almacen/indice.js` se modifica para elegir respaldo, y `js/app.js` gana pantallas. Nada más de lo ya construido cambia.

---

## Orden y motivo

| Tarea | Qué entrega | Por qué en ese lugar |
| --- | --- | --- |
| 15 | Pantalla de vista previa | Cierra el círculo para una persona sola, sin depender de nada del resto del hito |
| 16 | Criptografía | Pieza aislada y verificable, base de todo el acceso |
| 17 | Cliente de GitHub | Pieza aislada, con el manejo de conflictos |
| 18 | usuarios.json y sesión | Une las dos anteriores |
| 19 | Almacén remoto y selector | El único archivo ya existente que ven las pantallas cambia acá |
| 20 | Pantalla de ingreso | Ya hay con qué autenticar |
| 21 | Pantalla de ajustes y coordinadoras | Último, porque necesita todo lo demás |

---

## Task 15: Pantalla de vista previa

La imagen ya se genera, pero solo la página de demostración la muestra. Esta pantalla la trae adentro de la aplicación.

**Files:**
- Create: `js/ui/pantalla-vista-previa.js`
- Modify: `js/app.js`, `css/estilos.css`
- Test: `test/ui/pantalla-vista-previa.test.js`

- [ ] **Step 1: Escribir la prueba que falla**

`crearPantallaVistaPrevia` recibe el contexto de canvas por inyección, igual que `maquetar` recibe el medidor. En jsdom `getContext('2d')` devuelve null, así que sin inyección no habría forma de probarla.

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { crearPantallaVistaPrevia } from '../../js/ui/pantalla-vista-previa.js'
import { crearLista, asignarVoluntario } from '../../js/modelo/lista.js'
import { ROSTER, medirFalso } from '../ayudas/datos.js'

function contextoFalso() {
  return {
    canvas: { width: 0, height: 0, toBlob: (cb) => cb(new Blob(['x'])) },
    measureText: (t) => ({ width: medirFalso(t, '32px Poppins') }),
    save() {}, restore() {}, beginPath() {}, closePath() {}, fill() {}, stroke() {},
    clip() {}, arc() {}, moveTo() {}, lineTo() {}, fillRect() {}, fillText() {},
    drawImage() {}, roundRect() {}, scale() {},
    set fillStyle(v) {}, set strokeStyle(v) {}, set font(v) {},
    set textAlign(v) {}, set textBaseline(v) {}, set lineWidth(v) {},
  }
}

const armar = (raiz, lista, alCambiar = () => {}) => crearPantallaVistaPrevia(raiz, {
  lista, roster: ROSTER, saludo: 'Buenas tardes.', despedida: 'Nos vemos.',
  alCambiar, crearContexto: () => contextoFalso(), cargarFoto: async () => null,
})

let raiz, pantalla, lista

beforeEach(() => {
  document.body.innerHTML = '<div id="raiz"></div>'
  raiz = document.getElementById('raiz')
  lista = asignarVoluntario(crearLista('2026-08-08', ROSTER), 'p1', 'v1')
  pantalla = armar(raiz, lista)
})

describe('pantalla de vista previa', () => {
  it('dibuja los cuatro interruptores en español', () => {
    const etiquetas = [...raiz.querySelectorAll('label')].map((e) => e.textContent)
    expect(etiquetas.some((t) => t.includes('Saludo'))).toBe(true)
    expect(etiquetas.some((t) => t.includes('Despedida'))).toBe(true)
    expect(etiquetas.some((t) => t.includes('Fotos'))).toBe(true)
    expect(etiquetas.some((t) => t.includes('compacto'))).toBe(true)
  })

  it('refleja el estado guardado en la lista', () => {
    expect(raiz.querySelector('[data-opcion="saludo"]').checked).toBe(true)
    expect(raiz.querySelector('[data-opcion="compacto"]').checked).toBe(false)
  })

  it('cambiar un interruptor actualiza la lista y avisa', () => {
    document.body.innerHTML = '<div id="r2"></div>'
    const r2 = document.getElementById('r2')
    let avisos = 0
    const p = armar(r2, lista, () => { avisos += 1 })
    const compacto = r2.querySelector('[data-opcion="compacto"]')
    compacto.checked = true
    compacto.dispatchEvent(new Event('change'))
    expect(avisos).toBe(1)
    expect(p.lista().opcionesImagen.compacto).toBe(true)
  })

  it('informa el tamaño real de la imagen', () => {
    const info = raiz.querySelector('.info-imagen').textContent
    expect(info).toContain('1080')
    expect(info).toContain('px')
  })

  it('avisa cuando WhatsApp recortaria la imagen', () => {
    const larga = structuredClone(lista)
    for (let i = 0; i < 40; i += 1) {
      larga.grupos[0].filas.push({ participantes: ['p2'], voluntarios: [] })
    }
    document.body.innerHTML = '<div id="r3"></div>'
    const r3 = document.getElementById('r3')
    armar(r3, larga)
    expect(r3.querySelector('.aviso-recorte')).not.toBeNull()
    expect(r3.querySelector('.aviso-recorte').textContent).toContain('recorte')
  })

  it('no avisa de recorte con una lista normal', () => {
    expect(raiz.querySelector('.aviso-recorte')).toBeNull()
  })

  it('tiene botones de descargar y compartir', () => {
    const botones = [...raiz.querySelectorAll('button')].map((e) => e.textContent)
    expect(botones.some((t) => t.includes('Descargar'))).toBe(true)
    expect(botones.some((t) => t.includes('Compartir'))).toBe(true)
  })

  it('el nombre del archivo lleva la fecha de la lista', () => {
    expect(pantalla.nombreDeArchivo()).toBe('futbol-sin-barreras-2026-08-08.png')
  })

  it('activar el modo compacto achica la imagen', () => {
    const altoNormal = pantalla.plano().alto
    const compacto = raiz.querySelector('[data-opcion="compacto"]')
    compacto.checked = true
    compacto.dispatchEvent(new Event('change'))
    expect(pantalla.plano().alto).toBeLessThan(altoNormal)
  })
})
```

- [ ] **Step 2: Correr la prueba para verificar que falla**

Run: `npx vitest run test/ui/pantalla-vista-previa.test.js`
Expected: FAIL, no se resuelve el import.

- [ ] **Step 3: Escribir `js/ui/pantalla-vista-previa.js`**

```js
import { elemento, boton, vaciar } from './componentes.js'
import { maquetar } from '../imagen/maquetar.js'
import { pintar } from '../imagen/pintar.js'
import { medidorDesde, esperarFuentes, cargarImagen, descargar, compartir, nombreDeArchivo }
  from '../imagen/exportar.js'
import { formatearFechaLarga } from '../util/fechas.js'

const OPCIONES = [
  ['saludo', 'Saludo'],
  ['despedida', 'Despedida'],
  ['fotos', 'Fotos'],
  ['compacto', 'Modo compacto'],
]

export function crearPantallaVistaPrevia(raiz, opciones) {
  const { roster, saludo, despedida, alCambiar, crearContexto, cargarFoto } = opciones
  let lista = opciones.lista
  const lienzo = document.createElement('canvas')
  lienzo.className = 'lienzo-vista-previa'
  const ctx = crearContexto ? crearContexto(lienzo) : lienzo.getContext('2d')
  const imagenes = {}
  let plano = null

  function calcular() {
    plano = maquetar(lista, roster, { saludo, despedida, medirTexto: medidorDesde(ctx) })
    return plano
  }

  async function dibujar() {
    await esperarFuentes()
    calcular()
    pintar(ctx, plano, imagenes, 2)
  }

  function interruptores() {
    const caja = elemento('div', ['opciones-imagen'])
    OPCIONES.forEach(([clave, etiqueta]) => {
      const marco = elemento('label', ['opcion'])
      const entrada = document.createElement('input')
      entrada.type = 'checkbox'
      entrada.dataset.opcion = clave
      entrada.checked = Boolean(lista.opcionesImagen?.[clave])
      entrada.addEventListener('change', () => {
        lista = { ...lista, opcionesImagen: { ...lista.opcionesImagen, [clave]: entrada.checked } }
        alCambiar(lista)
        redibujar()
      })
      marco.append(entrada, document.createTextNode(` ${etiqueta}`))
      caja.appendChild(marco)
    })
    return caja
  }

  function informacion() {
    const caja = elemento('div', ['info-imagen'])
    const relacion = plano.relacion.toFixed(2).replace('.', ',')
    caja.textContent = `${plano.ancho} por ${plano.alto} px, relacion ${relacion}.`
    return caja
  }

  function avisoRecorte() {
    if (!plano.recorteProbable) return null
    const caja = elemento('div', ['aviso-recorte'])
    caja.textContent =
      'La imagen es muy alta y WhatsApp probablemente le haga un recorte en la vista previa del ' +
      'chat. Se sigue viendo entera al tocarla. Si preferis evitarlo, activa el modo compacto.'
    return caja
  }

  function acciones() {
    const caja = elemento('div', ['acciones-imagen'])
    caja.appendChild(boton('Descargar PNG', async () => {
      await dibujar()
      await descargar(lienzo, nombreDeArchivo(lista))
    }))
    caja.appendChild(boton('Compartir', async () => {
      await dibujar()
      const texto = `Fútbol sin Barreras, ${formatearFechaLarga(lista.fecha)}`
      const compartido = await compartir(lienzo, nombreDeArchivo(lista), texto)
      if (!compartido) {
        alert('Este dispositivo no permite compartir el archivo directamente. Usa Descargar PNG.')
      }
    }))
    return caja
  }

  function redibujar() {
    vaciar(raiz)
    calcular()
    raiz.appendChild(interruptores())
    raiz.appendChild(informacion())
    const aviso = avisoRecorte()
    if (aviso) raiz.appendChild(aviso)
    raiz.appendChild(acciones())
    raiz.appendChild(lienzo)
    dibujar()
  }

  async function precargarFotos() {
    if (!cargarFoto) return
    const logo = await cargarImagen('assets/logo-aletea.png')
    if (logo) imagenes.logo = logo
    const claves = new Set()
    roster.participantes.forEach((p) => { if (p.foto) claves.add(p.foto) })
    for (const clave of claves) {
      const imagen = await cargarFoto(clave)
      if (imagen) imagenes[clave] = imagen
    }
    redibujar()
  }

  redibujar()
  precargarFotos()

  return {
    lista: () => lista,
    plano: () => plano,
    nombreDeArchivo: () => nombreDeArchivo(lista),
    redibujar,
  }
}
```

- [ ] **Step 4: Correr las pruebas**

Run: `npx vitest run test/ui/pantalla-vista-previa.test.js`
Expected: PASS, 9 pruebas.

- [ ] **Step 5: Agregar la pantalla a `js/app.js`**

Sumar `Vista previa` a la navegación, entre `Armar lista` y `Personas`. Definir en `js/app.js`:

```js
const SALUDO = 'Buenas tardes, esperamos que estén todos bien. Les compartimos las asignaciones para mañana:'
const DESPEDIDA = 'Nos vemos mañana. Gracias a todos.'
```

`alCambiar` guarda la lista con `deposito.guardarLista`. `cargarFoto` lee el blob con `deposito.leerFoto(clave)` y lo convierte con `createImageBitmap(blob)`, devolviendo null si no hay. No pasar `crearContexto`: en el navegador se usa el canvas real.

- [ ] **Step 6: Estilos**

Agregar al final de `css/estilos.css`:

```css
.opciones-imagen { display: flex; flex-wrap: wrap; gap: 16px; padding: 16px; }
.opcion { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; }
.info-imagen { padding: 0 16px 8px; font-size: 13px; color: var(--texto-suave); }
.aviso-recorte {
  margin: 0 16px 12px; padding: 12px; border-radius: 10px;
  background: #FAEEDA; color: #633806; font-size: 14px; line-height: 1.5;
}
.acciones-imagen { display: flex; gap: 8px; padding: 0 16px 16px; flex-wrap: wrap; }
.lienzo-vista-previa {
  display: block; width: calc(100% - 32px); height: auto; margin: 0 16px 24px;
  border: 1px solid var(--linea); border-radius: 12px;
}
```

El par de colores del aviso, `#633806` sobre `#FAEEDA`, cumple contraste AA. Verificarlo con la función `contraste` de `js/imagen/tema.js` antes de darlo por bueno.

- [ ] **Step 7: Verificación visual, obligatoria**

Levantar el sitio, cargar personas, armar una lista, ir a Vista previa. Confirmar que la imagen aparece, que los cuatro interruptores la cambian, que el texto informativo dice el tamaño real, y que descargar produce un PNG idéntico a lo que se ve en pantalla.

- [ ] **Step 8: Commit**

```bash
git add js/ui/pantalla-vista-previa.js js/app.js css/estilos.css test/ui/pantalla-vista-previa.test.js
git commit -m "Pantalla de vista previa con descarga y compartir"
```

- [ ] **Step 9: Borrar la página de demostración, ya reemplazada**

```bash
git rm demo.html js/demo.js
git commit -m "Quitar la pagina de demostracion, reemplazada por la pantalla de vista previa"
```

---

## Task 16: Criptografía

**Files:**
- Create: `js/acceso/cripto.js`
- Test: `test/acceso/cripto.test.js`

Este módulo es lo único que protege el token. Su corrección es toda la defensa del esquema, así que se prueba con dureza.

- [ ] **Step 1: Escribir la prueba que falla**

```js
import { describe, it, expect } from 'vitest'
import { cifrar, descifrar, generarContrasena, ITERACIONES } from '../../js/acceso/cripto.js'

describe('generarContrasena', () => {
  it('devuelve 16 caracteres por defecto', () => {
    expect(generarContrasena()).toHaveLength(16)
  })

  it('respeta la longitud pedida', () => {
    expect(generarContrasena(24)).toHaveLength(24)
  })

  it('no repite entre llamadas', () => {
    const muestras = new Set(Array.from({ length: 200 }, () => generarContrasena()))
    expect(muestras.size).toBe(200)
  })

  it('evita caracteres que se confunden al dictarlos', () => {
    const juntas = Array.from({ length: 200 }, () => generarContrasena()).join('')
    expect(juntas).not.toMatch(/[0OIl1]/)
  })

  it('usa mas de un tipo de caracter', () => {
    const muestra = Array.from({ length: 50 }, () => generarContrasena()).join('')
    expect(muestra).toMatch(/[a-z]/)
    expect(muestra).toMatch(/[A-Z]/)
    expect(muestra).toMatch(/[2-9]/)
  })
})

describe('cifrar y descifrar', () => {
  it('recupera el texto original', async () => {
    const registro = await cifrar('ghp_tokenDePrueba', 'ContrasenaLarga123')
    expect(await descifrar(registro, 'ContrasenaLarga123')).toBe('ghp_tokenDePrueba')
  })

  it('falla con la contrasena equivocada', async () => {
    const registro = await cifrar('secreto', 'correcta')
    await expect(descifrar(registro, 'incorrecta')).rejects.toThrow()
  })

  it('conserva acentos y eñes', async () => {
    const registro = await cifrar('Julián Begoña ñ á é í ó ú', 'clave')
    expect(await descifrar(registro, 'clave')).toBe('Julián Begoña ñ á é í ó ú')
  })

  it('dos cifrados del mismo texto son distintos', async () => {
    const a = await cifrar('mismo', 'clave')
    const b = await cifrar('mismo', 'clave')
    expect(a.cifrado.datos).not.toBe(b.cifrado.datos)
    expect(a.kdf.sal).not.toBe(b.kdf.sal)
    expect(a.cifrado.iv).not.toBe(b.cifrado.iv)
  })

  it('el registro declara el algoritmo y las iteraciones', async () => {
    const registro = await cifrar('x', 'clave')
    expect(registro.kdf.algoritmo).toBe('PBKDF2-SHA256')
    expect(registro.kdf.iteraciones).toBe(ITERACIONES)
    expect(registro.cifrado.algoritmo).toBe('AES-GCM')
  })

  it('usa al menos 600000 iteraciones', () => {
    expect(ITERACIONES).toBeGreaterThanOrEqual(600000)
  })

  it('el registro sobrevive a un viaje por JSON', async () => {
    const registro = await cifrar('token', 'clave')
    const ida = JSON.parse(JSON.stringify(registro))
    expect(await descifrar(ida, 'clave')).toBe('token')
  })

  it('un texto alterado no se descifra', async () => {
    const registro = await cifrar('token', 'clave')
    const roto = JSON.parse(JSON.stringify(registro))
    const bytes = atob(roto.cifrado.datos).split('')
    bytes[0] = String.fromCharCode(bytes[0].charCodeAt(0) ^ 1)
    roto.cifrado.datos = btoa(bytes.join(''))
    await expect(descifrar(roto, 'clave')).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Correr la prueba para verificar que falla**

Run: `npx vitest run test/acceso/cripto.test.js`
Expected: FAIL, no se resuelve el import.

- [ ] **Step 3: Escribir `js/acceso/cripto.js`**

```js
export const ITERACIONES = 600000
const LARGO_SAL = 16
const LARGO_IV = 12

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

export function generarContrasena(longitud = 16) {
  const limite = 256 - (256 % ALFABETO.length)
  let salida = ''
  while (salida.length < longitud) {
    const bytes = crypto.getRandomValues(new Uint8Array(longitud * 2))
    for (const valor of bytes) {
      if (salida.length >= longitud) break
      if (valor >= limite) continue
      salida += ALFABETO[valor % ALFABETO.length]
    }
  }
  return salida
}

function aBase64(datos) {
  let binario = ''
  new Uint8Array(datos).forEach((b) => { binario += String.fromCharCode(b) })
  return btoa(binario)
}

function desdeBase64(texto) {
  const binario = atob(texto)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i)
  return bytes
}

async function derivarClave(contrasena, sal, iteraciones) {
  const material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(contrasena), 'PBKDF2', false, ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: sal, iterations: iteraciones, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function cifrar(texto, contrasena) {
  const sal = crypto.getRandomValues(new Uint8Array(LARGO_SAL))
  const iv = crypto.getRandomValues(new Uint8Array(LARGO_IV))
  const clave = await derivarClave(contrasena, sal, ITERACIONES)
  const datos = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, clave, new TextEncoder().encode(texto),
  )
  return {
    kdf: { algoritmo: 'PBKDF2-SHA256', iteraciones: ITERACIONES, sal: aBase64(sal) },
    cifrado: { algoritmo: 'AES-GCM', iv: aBase64(iv), datos: aBase64(datos) },
  }
}

export async function descifrar(registro, contrasena) {
  const sal = desdeBase64(registro.kdf.sal)
  const iv = desdeBase64(registro.cifrado.iv)
  const clave = await derivarClave(contrasena, sal, registro.kdf.iteraciones)
  const datos = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, clave, desdeBase64(registro.cifrado.datos),
  )
  return new TextDecoder().decode(datos)
}
```

El descarte de valores por encima de `limite` no es adorno: sin él, tomar el resto de un byte contra un alfabeto que no divide a 256 hace que las primeras letras salgan más seguido, y eso baja la entropía real de la contraseña. El alfabeto excluye `0`, `O`, `I`, `l` y `1` porque estas contraseñas se dictan por teléfono o se copian a mano.

- [ ] **Step 4: Correr las pruebas**

Run: `npx vitest run test/acceso/cripto.test.js`
Expected: PASS, 13 pruebas. Tardan, porque cada `cifrar` o `descifrar` hace 600.000 iteraciones de PBKDF2.

- [ ] **Step 5: Medir el costo real, que es una decisión de producto**

Correr un script descartable que cronometre `cifrar` y `descifrar` por separado y reporte los milisegundos. El objetivo: el ingreso debe tardar menos de dos segundos en un teléfono de gama media, que es entre tres y cinco veces más lento que una computadora de escritorio. Si en escritorio pasa de 400 ms, reportarlo antes de seguir, porque puede convenir mostrar un indicador de progreso o revisar el número.

- [ ] **Step 6: Commit**

```bash
git add js/acceso/cripto.js test/acceso/cripto.test.js
git commit -m "Cifrado del token con PBKDF2 y AES-GCM del navegador"
```

---

## Task 17: Cliente de la API de GitHub

**Files:**
- Create: `js/almacen/github.js`, `js/config.js`
- Test: `test/almacen/github.test.js`

- [ ] **Step 1: Escribir `js/config.js`**

```js
export const CONFIG = {
  duenio: 'CorvusDevs',
  repoPublico: 'VoluntariosFSB',
  repoDatos: 'VoluntariosFSB-datos',
  rama: 'main',
}
```

Va en un archivo propio para que cambiar de cuenta o de nombre de repositorio no exija tocar lógica.

- [ ] **Step 2: Escribir la prueba que falla**

Las pruebas usan un `fetch` falso inyectado. La API real no se toca en ninguna prueba.

```js
import { describe, it, expect } from 'vitest'
import { crearClienteGitHub, ConflictoError } from '../../js/almacen/github.js'

function fetchFalso(respuestas) {
  const llamadas = []
  const fn = async (url, opciones = {}) => {
    llamadas.push({ url, opciones })
    const clave = `${opciones.method ?? 'GET'} ${url.replace(/^https:\/\/[^/]+/, '')}`
    const r = respuestas[clave] ?? { estado: 404, cuerpo: { message: 'Not Found' } }
    return {
      ok: r.estado >= 200 && r.estado < 300,
      status: r.estado,
      json: async () => r.cuerpo,
    }
  }
  fn.llamadas = llamadas
  return fn
}

const base = '/repos/duenio/datos/contents'
const cliente = (f) =>
  crearClienteGitHub({ token: 'tok', duenio: 'duenio', repo: 'datos', fetchFn: f })

function aBase64Utf8(texto) {
  const bytes = new TextEncoder().encode(texto)
  let binario = ''
  bytes.forEach((b) => { binario += String.fromCharCode(b) })
  return btoa(binario)
}

describe('leerTexto', () => {
  it('devuelve el contenido y el sha', async () => {
    const f = fetchFalso({
      [`GET ${base}/roster.json?ref=main`]:
        { estado: 200, cuerpo: { content: aBase64Utf8('{"a":1}'), sha: 'abc' } },
    })
    const r = await cliente(f).leerTexto('roster.json')
    expect(r.texto).toBe('{"a":1}')
    expect(r.sha).toBe('abc')
  })

  it('devuelve null cuando el archivo no existe', async () => {
    expect(await cliente(fetchFalso({})).leerTexto('falta.json')).toBeNull()
  })

  it('manda el token en la cabecera Authorization', async () => {
    const f = fetchFalso({
      [`GET ${base}/x.json?ref=main`]: { estado: 200, cuerpo: { content: aBase64Utf8('{}'), sha: 's' } },
    })
    await cliente(f).leerTexto('x.json')
    expect(f.llamadas[0].opciones.headers.Authorization).toBe('Bearer tok')
  })

  it('decodifica acentos correctamente', async () => {
    const f = fetchFalso({
      [`GET ${base}/n.json?ref=main`]:
        { estado: 200, cuerpo: { content: aBase64Utf8('{"n":"Julián Begoña"}'), sha: 's' } },
    })
    const r = await cliente(f).leerTexto('n.json')
    expect(JSON.parse(r.texto).n).toBe('Julián Begoña')
  })

  it('tolera los saltos de linea que GitHub mete en el base64', async () => {
    const crudo = aBase64Utf8('{"a":1}')
    const conSaltos = `${crudo.slice(0, 4)}\n${crudo.slice(4)}\n`
    const f = fetchFalso({
      [`GET ${base}/s.json?ref=main`]: { estado: 200, cuerpo: { content: conSaltos, sha: 's' } },
    })
    expect((await cliente(f).leerTexto('s.json')).texto).toBe('{"a":1}')
  })
})

describe('escribirTexto', () => {
  it('manda PUT con el contenido en base64 y el sha', async () => {
    const f = fetchFalso({
      [`PUT ${base}/roster.json`]: { estado: 200, cuerpo: { content: { sha: 'nuevo' } } },
    })
    const r = await cliente(f).escribirTexto('roster.json', '{"a":1}', 'viejo', 'mensaje')
    expect(r.sha).toBe('nuevo')
    const cuerpo = JSON.parse(f.llamadas[0].opciones.body)
    expect(cuerpo.sha).toBe('viejo')
    expect(cuerpo.message).toBe('mensaje')
    expect(cuerpo.branch).toBe('main')
  })

  it('omite el sha cuando el archivo es nuevo', async () => {
    const f = fetchFalso({
      [`PUT ${base}/nuevo.json`]: { estado: 201, cuerpo: { content: { sha: 's' } } },
    })
    await cliente(f).escribirTexto('nuevo.json', '{}', null, 'alta')
    expect(JSON.parse(f.llamadas[0].opciones.body).sha).toBeUndefined()
  })

  it('lanza ConflictoError ante un 409', async () => {
    const f = fetchFalso({ [`PUT ${base}/roster.json`]: { estado: 409, cuerpo: { message: 'conflict' } } })
    await expect(cliente(f).escribirTexto('roster.json', '{}', 'viejo', 'm'))
      .rejects.toBeInstanceOf(ConflictoError)
  })

  it('lanza ConflictoError ante un 422, que GitHub usa para sha desactualizado', async () => {
    const f = fetchFalso({ [`PUT ${base}/roster.json`]: { estado: 422, cuerpo: { message: 'does not match' } } })
    await expect(cliente(f).escribirTexto('roster.json', '{}', 'viejo', 'm'))
      .rejects.toBeInstanceOf(ConflictoError)
  })

  it('codifica acentos sin romperlos', async () => {
    const f = fetchFalso({ [`PUT ${base}/n.json`]: { estado: 200, cuerpo: { content: { sha: 's' } } } })
    await cliente(f).escribirTexto('n.json', '{"n":"Julián"}', null, 'm')
    const enviado = JSON.parse(f.llamadas[0].opciones.body).content
    const binario = atob(enviado)
    const bytes = new Uint8Array(binario.length)
    for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i)
    expect(new TextDecoder().decode(bytes)).toBe('{"n":"Julián"}')
  })

  it('lanza un error legible ante un 401', async () => {
    const f = fetchFalso({ [`PUT ${base}/x.json`]: { estado: 401, cuerpo: { message: 'Bad credentials' } } })
    await expect(cliente(f).escribirTexto('x.json', '{}', null, 'm')).rejects.toThrow(/token/i)
  })
})

describe('listar', () => {
  it('devuelve los nombres y shas del directorio', async () => {
    const f = fetchFalso({
      [`GET ${base}/listas?ref=main`]: {
        estado: 200,
        cuerpo: [{ name: '2026-08-08.json', sha: 'a', type: 'file' },
                 { name: '2026-08-01.json', sha: 'b', type: 'file' }],
      },
    })
    expect((await cliente(f).listar('listas')).map((x) => x.nombre))
      .toEqual(['2026-08-08.json', '2026-08-01.json'])
  })

  it('devuelve arreglo vacio si el directorio no existe', async () => {
    expect(await cliente(fetchFalso({})).listar('listas')).toEqual([])
  })
})
```

- [ ] **Step 3: Correr la prueba para verificar que falla**

Run: `npx vitest run test/almacen/github.test.js`
Expected: FAIL, no se resuelve el import.

- [ ] **Step 4: Escribir `js/almacen/github.js`**

```js
export class ConflictoError extends Error {
  constructor(mensaje) {
    super(mensaje)
    this.name = 'ConflictoError'
  }
}

function bytesABase64(datos) {
  let binario = ''
  new Uint8Array(datos).forEach((b) => { binario += String.fromCharCode(b) })
  return btoa(binario)
}

function base64ABytes(base64) {
  const binario = atob(String(base64).replace(/\s/g, ''))
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i)
  return bytes
}

const textoABase64 = (texto) => bytesABase64(new TextEncoder().encode(texto))
const base64ATexto = (base64) => new TextDecoder().decode(base64ABytes(base64))

export function crearClienteGitHub({ token, duenio, repo, rama = 'main', fetchFn }) {
  const pedir = fetchFn ?? fetch
  const raiz = `https://api.github.com/repos/${duenio}/${repo}/contents`

  const cabeceras = () => ({
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  })

  async function fallar(respuesta, accion) {
    let detalle = ''
    try {
      detalle = (await respuesta.json())?.message ?? ''
    } catch {
      detalle = ''
    }
    if (respuesta.status === 409 || respuesta.status === 422) {
      throw new ConflictoError(
        'Otra coordinadora modifico esto mientras trabajabas. Recarga para ver los cambios.',
      )
    }
    if (respuesta.status === 401 || respuesta.status === 403) {
      throw new Error(`El token de GitHub no tiene permiso o vencio. Detalle: ${detalle}`)
    }
    throw new Error(`GitHub respondio ${respuesta.status} al ${accion}. Detalle: ${detalle}`)
  }

  async function leerCrudo(ruta) {
    const respuesta = await pedir(`${raiz}/${ruta}?ref=${rama}`, { headers: cabeceras() })
    if (respuesta.status === 404) return null
    if (!respuesta.ok) await fallar(respuesta, `leer ${ruta}`)
    return respuesta.json()
  }

  async function escribirCrudo(ruta, contenidoBase64, sha, mensaje) {
    const cuerpo = { message: mensaje, content: contenidoBase64, branch: rama }
    if (sha) cuerpo.sha = sha
    const respuesta = await pedir(`${raiz}/${ruta}`, {
      method: 'PUT',
      headers: { ...cabeceras(), 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
    if (!respuesta.ok) await fallar(respuesta, `guardar ${ruta}`)
    const datos = await respuesta.json()
    return { sha: datos.content?.sha ?? null }
  }

  return {
    async leerTexto(ruta) {
      const datos = await leerCrudo(ruta)
      return datos ? { texto: base64ATexto(datos.content), sha: datos.sha } : null
    },

    escribirTexto(ruta, texto, sha, mensaje) {
      return escribirCrudo(ruta, textoABase64(texto), sha, mensaje)
    },

    async leerBytes(ruta) {
      const datos = await leerCrudo(ruta)
      return datos ? { bytes: base64ABytes(datos.content), sha: datos.sha } : null
    },

    escribirBytes(ruta, bytes, sha, mensaje) {
      return escribirCrudo(ruta, bytesABase64(bytes), sha, mensaje)
    },

    async borrar(ruta, sha, mensaje) {
      const respuesta = await pedir(`${raiz}/${ruta}`, {
        method: 'DELETE',
        headers: { ...cabeceras(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: mensaje, sha, branch: rama }),
      })
      if (!respuesta.ok && respuesta.status !== 404) await fallar(respuesta, `borrar ${ruta}`)
    },

    async listar(ruta) {
      const datos = await leerCrudo(ruta)
      if (!datos || !Array.isArray(datos)) return []
      return datos.filter((x) => x.type === 'file').map((x) => ({ nombre: x.name, sha: x.sha }))
    },
  }
}
```

La conversión a base64 pasa por `TextEncoder` a propósito, y la razón es peor que un error ruidoso. `btoa(JSON.stringify(...))` **no lanza** ante un nombre acentuado: `á` es U+00E1, entra en un byte, así que `btoa` emite en silencio el byte latin1 `0xE1`, que no es UTF-8 válido. El archivo se escribiría con bytes inválidos y el nombre volvería con un carácter de reemplazo. No falla nada: ni la escritura, ni la lectura, ni las pruebas. Medido contra el módulo, `{"n":"Julián"}` vuelve como `{"n":"Juli?n"}` por el camino ingenuo y como `{"n":"Julián"}` por el camino con `TextEncoder`. Esa corrupción silenciosa es la razón por la que existe el camino con `TextEncoder`, y la prueba de acentos existe exactamente por eso: este proyecto está lleno de Julián, Rocío y Eloísa, y un error que no se anuncia se descubre semanas después, con los datos ya rotos.

El `.replace(/\s/g, '')` al decodificar es defensivo, no imprescindible. La API de contenidos sí devuelve el base64 con saltos de línea, verificado contra la API real: hasta un archivo de 13 bytes vuelve como `"SGVsbG8gV29ybGQhCg==\n"`, y uno grande viene cortado cada 60 caracteres. Pero `atob` implementa el "forgiving-base64 decode", que descarta los espacios en blanco ASCII antes de decodificar, así que tolera esos saltos por su cuenta. El `replace` se conserva para que el decodificador no dependa de que el runtime cumpla la especificación.

El 422 se trata como conflicto porque GitHub lo usa cuando el sha enviado no coincide, que es justamente el caso de dos coordinadoras escribiendo a la vez.

- [ ] **Step 5: Correr las pruebas**

Run: `npx vitest run test/almacen/github.test.js`
Expected: PASS, 13 pruebas.

- [ ] **Step 6: Verificar la forma real de la respuesta, sin token y sin escribir nada**

```bash
curl -s "https://api.github.com/repos/octocat/Hello-World/contents/README" | head -c 400
```

Confirmar que trae `content`, `sha` y `type`, y observar si el base64 viene con saltos de línea. Reportar lo observado textualmente. No hace falta token y no se escribe nada en ningún repositorio.

- [ ] **Step 7: Commit**

```bash
git add js/almacen/github.js js/config.js test/almacen/github.test.js
git commit -m "Cliente de la API de GitHub con manejo de conflictos y acentos"
```

---

## Tareas 18 a 21

Se detallan en un documento aparte cuando las tareas 15 a 17 estén terminadas y revisadas, por el mismo motivo que en el hito anterior: la pantalla de ingreso y la de coordinadoras dependen de decisiones que conviene tomar viendo funcionar la criptografía, sobre todo el costo real de las 600.000 iteraciones en un teléfono, que puede obligar a mostrar un indicador de progreso.

Resumen de lo que queda:

- **Tarea 18, usuarios y sesión.** `js/acceso/usuarios.js` lee `usuarios.json` desde `raw.githubusercontent.com`, que habilita CORS y cachea 5 minutos. `js/acceso/sesion.js` descifra el token, lo mantiene en memoria y opcionalmente en IndexedDB bajo una clave no exportable ligada al dispositivo.
- **Tarea 19, almacén remoto y selector.** `js/almacen/remoto.js` implementa las ocho funciones sobre `github.js`, con `roster.json`, `listas/AAAA-MM-DD.json` y `fotos/<id>.jpg`, guardando los sha para detectar conflictos. `js/almacen/indice.js` elige entre local y remoto: es el único archivo ya existente que cambia.
- **Tarea 20, pantalla de ingreso.** Usuario y contraseña, con un solo mensaje de error para no revelar si el usuario existe.
- **Tarea 21, pantalla de ajustes.** Alta y baja de coordinadoras con contraseña generada y mostrada una sola vez, rotación del token, textos por defecto de saludo y despedida, y cierre de sesión que borra el token y el caché.

---

## Riesgos propios de este hito

| Riesgo | Mitigación |
| --- | --- |
| 600.000 iteraciones hacen lento el ingreso en un teléfono | Se mide en la tarea 16, antes de construir la pantalla, y se decide con el número a la vista |
| El base64 rompe los acentos | Probado explícitamente en las tareas 16 y 17, con Julián y Begoña |
| Dos coordinadoras escriben a la vez | `ConflictoError` desde el cliente, mensaje claro y recarga, nunca sobrescritura silenciosa |
| El token queda en un dispositivo prestado | Cierre de sesión que lo borra, y rotación desde ajustes |
| La API de GitHub cambia | Todo el contacto con ella vive en `github.js`, detrás de seis funciones |

## Criterios de aceptación del hito

1. Desde la aplicación se ve la imagen, se descarga y se comparte, sin pasar por ninguna página aparte.
2. Cifrar y descifrar recupera exactamente el texto original, incluidos acentos y eñes, y falla con la contraseña equivocada.
3. Las contraseñas las genera la aplicación y nunca las elige una persona.
4. Escribir con un sha desactualizado produce un aviso y jamás pisa el trabajo de otra coordinadora.
5. Ningún nombre ni foto de participante llega al repositorio público en ningún momento.
6. Cerrar sesión deja el dispositivo sin token y sin datos en caché.
