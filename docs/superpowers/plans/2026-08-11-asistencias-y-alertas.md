# Asistencias, reporte mensual y alertas de faltas, plan de implementación

> **Para quien lo ejecute:** SUB-SKILL REQUERIDA: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** derivar la asistencia de las planillas ya guardadas, dejar corregirla, mostrarla como reporte mensual descargable en PNG y CSV, y avisar en pantalla cuando alguien falta tres sábados seguidos.

**Arquitectura:** todo el cálculo vive en módulos puros bajo `js/modelo/` y `js/reporte/`, sin tocar el DOM ni el almacén, igual que `lista.js` y `roster.js`. Las pantallas leen los archivos, llaman a esas funciones y dibujan. El PNG del reporte usa el mismo motor de dos etapas que la planilla: un `maquetar` propio devuelve órdenes de dibujo y el `pintar` que ya existe las ejecuta, así lo que se descarga es idéntico a lo que se ve.

**Herramientas:** JavaScript de módulos nativos sin compilar, Vitest (`node` por defecto, `jsdom` para `test/ui/**`), IndexedDB en modo local, API REST de GitHub en modo remoto.

**Especificación:** `docs/superpowers/specs/2026-08-11-asistencias-y-alertas-design.md`

---

## Estructura de archivos

**Se crean:**

| Archivo | Responsabilidad |
|---|---|
| `js/modelo/asistencia.js` | Puro. Derivar quién vino de una planilla, aplicar correcciones, armar el historial de un mes, calcular rachas de falta. Sin DOM ni almacén. |
| `js/reporte/csv.js` | Puro. Convertir un historial en texto CSV. |
| `js/imagen/maquetar-reporte.js` | Puro. Órdenes de dibujo de la tabla del reporte. Usa `medirTexto` inyectado, como `maquetar.js`. |
| `js/ui/pantalla-reporte.js` | Pantalla del reporte mensual con los dos botones de descarga. |
| `js/ui/pantalla-asistencias.js` | Pantalla de corrección de un sábado pasado. |
| `js/ui/franja-alerta.js` | La franja de alerta y su acción de anotar y silenciar. Vive aparte de `pantalla-lista.js`, que ya tiene 400 líneas. |
| `test/modelo/asistencia.test.js` | |
| `test/reporte/csv.test.js` | |
| `test/imagen/maquetar-reporte.test.js` | |
| `test/ui/pantalla-reporte.test.js` | |
| `test/ui/pantalla-asistencias.test.js` | |
| `test/ui/franja-alerta.test.js` | |

**Se modifican:**

| Archivo | Cambio |
|---|---|
| `js/almacen/local.js` | Subir la versión de IndexedDB a 2, agregar los depósitos `asistencias` y `seguimientos`, y sus cuatro funciones. |
| `js/almacen/remoto.js` | Las mismas cuatro funciones sobre `asistencias/AAAA-MM.json` y `seguimientos.json`. |
| `js/app.js` | Dos destinos nuevos en la navegación, el cálculo de alertas al abrir, y el cableado de las dos pantallas. |
| `js/ui/pantalla-lista.js` | Recibir e insertar la franja de alerta arriba de todo. |
| `css/estilos.css` | Estilos de la franja, la tabla del reporte y la pantalla de asistencias. |
| `test/almacen/local.test.js` y `test/almacen/remoto.test.js` | Cobertura de las funciones nuevas. |

---

## Tarea 1: Estado de un sábado

Deriva de UNA planilla quién vino y quién faltó. Es la base de todo lo demás.

**Archivos:**
- Crear: `js/modelo/asistencia.js`
- Test: `test/modelo/asistencia.test.js`

- [ ] **Paso 1: Escribir la prueba que falla**

Crear `test/modelo/asistencia.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { estadoDeSabado, VINO, FALTO, NO_ESTABA } from '../../js/modelo/asistencia.js'

const ROSTER = {
  version: 1,
  participantes: [
    { id: 'p1', nombre: 'Gaia', grupo: 1, activo: true },
    { id: 'p2', nombre: 'Santiago', grupo: 1, activo: true },
    { id: 'p3', nombre: 'Nikita', grupo: 2, activo: true },
  ],
  voluntarios: [
    { id: 'v1', nombre: 'Abi', activo: true },
    { id: 'v2', nombre: 'Vicky', activo: true },
    { id: 'v3', nombre: 'Martin', activo: true },
  ],
}

const LISTA = {
  version: 1,
  fecha: '2026-08-15',
  ausentes: ['p2'],
  grupos: [
    { numero: 1, filas: [{ participantes: ['p1'], voluntarios: ['v1'] }], apoyo: ['v2'] },
    { numero: 2, filas: [{ participantes: ['p3'], voluntarios: [] }], apoyo: [] },
  ],
}

describe('estadoDeSabado', () => {
  it('el participante que esta en un grupo vino', () => {
    expect(estadoDeSabado(LISTA, ROSTER).get('p1')).toBe(VINO)
  })

  it('el participante que esta en ausentes falto', () => {
    expect(estadoDeSabado(LISTA, ROSTER).get('p2')).toBe(FALTO)
  })

  it('el participante que no figura de ningun modo todavia no estaba', () => {
    const roster = {
      ...ROSTER,
      participantes: [...ROSTER.participantes, { id: 'p9', nombre: 'Sofi', grupo: 1, activo: true }],
    }
    expect(estadoDeSabado(LISTA, roster).get('p9')).toBe(NO_ESTABA)
  })

  it('el voluntario que acompaña a alguien vino', () => {
    expect(estadoDeSabado(LISTA, ROSTER).get('v1')).toBe(VINO)
  })

  it('el voluntario que esta en apoyo vino', () => {
    // Apoyo es del grupo entero y no acompaña a nadie en particular, pero estuvo.
    expect(estadoDeSabado(LISTA, ROSTER).get('v2')).toBe(VINO)
  })

  it('el voluntario que no aparece en la planilla falto', () => {
    expect(estadoDeSabado(LISTA, ROSTER).get('v3')).toBe(FALTO)
  })

  it('no inventa gente que no esta en el roster', () => {
    expect(estadoDeSabado(LISTA, ROSTER).size).toBe(6)
  })

  it('tolera una planilla vieja sin apoyo ni ausentes', () => {
    const vieja = { fecha: '2026-01-04', grupos: [{ numero: 1, filas: [] }, { numero: 2, filas: [] }] }
    const estado = estadoDeSabado(vieja, ROSTER)
    expect(estado.get('p1')).toBe(NO_ESTABA)
    expect(estado.get('v1')).toBe(FALTO)
  })
})
```

- [ ] **Paso 2: Correr la prueba y verificar que falla**

Comando: `npx vitest run test/modelo/asistencia.test.js`
Esperado: FALLA con "Failed to resolve import ... js/modelo/asistencia.js"

- [ ] **Paso 3: Escribir la implementación mínima**

Crear `js/modelo/asistencia.js`:

```js
// Asistencia derivada de las planillas ya guardadas. Nada de esto se anota el
// sabado: la planilla es el plan de la noche anterior y de ahi sale todo, con
// una pasada de correcciones a mano encima para los casos que no coincidieron.
//
// Modulo puro, como lista.js y roster.js: sin DOM y sin almacen, para poder
// probar cada regla sin navegador y sin datos de verdad.

export const VINO = 'vino'
export const FALTO = 'falto'
// Ni vino ni falto: esa persona todavia no existia para el programa. Sin este
// tercer estado, alguien dado de alta en agosto figura faltando de enero a
// julio y dispara la alerta el dia que entra.
export const NO_ESTABA = 'no-estaba'

// La evidencia de cada uno es distinta, y por eso la regla tambien:
//
// Del participante hay registro explicito de la falta, porque alguien toco
// "Hoy no viene". Si no esta ni en un grupo ni en ausentes, esa planilla no
// dice nada de el.
//
// Del voluntario no hay registro: no aparecer es toda la evidencia que existe,
// asi que se cuenta falta. Distinguir "no vino" de "todavia no estaba" no se
// puede con una sola planilla; lo resuelve historial(), mirando el mes entero.
export function estadoDeSabado(lista, roster) {
  const enPlanilla = new Set()
  const acompañados = new Set()
  ;(lista.grupos ?? []).forEach((grupo) => {
    ;(grupo.filas ?? []).forEach((fila) => {
      ;(fila.participantes ?? []).forEach((id) => acompañados.add(id))
      ;(fila.voluntarios ?? []).forEach((id) => enPlanilla.add(id))
    })
    ;(grupo.apoyo ?? []).forEach((id) => enPlanilla.add(id))
  })
  const ausentes = new Set(lista.ausentes ?? [])

  const estado = new Map()
  ;(roster.participantes ?? []).forEach((p) => {
    if (acompañados.has(p.id)) estado.set(p.id, VINO)
    else if (ausentes.has(p.id)) estado.set(p.id, FALTO)
    else estado.set(p.id, NO_ESTABA)
  })
  ;(roster.voluntarios ?? []).forEach((v) => {
    estado.set(v.id, enPlanilla.has(v.id) ? VINO : FALTO)
  })
  return estado
}
```

- [ ] **Paso 4: Correr la prueba y verificar que pasa**

Comando: `npx vitest run test/modelo/asistencia.test.js`
Esperado: PASA, 8 pruebas

- [ ] **Paso 5: Commit**

```bash
git add js/modelo/asistencia.js test/modelo/asistencia.test.js
git commit -m "Derivar de una planilla quien vino y quien falto"
```

---

## Tarea 2: Historial del mes, con correcciones

Junta varios sábados, aplica las correcciones a mano y recorta el arranque de cada voluntario.

**Archivos:**
- Modificar: `js/modelo/asistencia.js`
- Test: `test/modelo/asistencia.test.js`

- [ ] **Paso 1: Escribir la prueba que falla**

Agregar al final de `test/modelo/asistencia.test.js`:

```js
import { historial } from '../../js/modelo/asistencia.js'

// Tres sabados. v3 (Martin) no aparece nunca hasta el tercero.
const SABADOS = [
  { fecha: '2026-08-01',
    grupos: [{ numero: 1, filas: [{ participantes: ['p1'], voluntarios: ['v1'] }], apoyo: [] },
             { numero: 2, filas: [], apoyo: [] }],
    ausentes: ['p2'] },
  { fecha: '2026-08-08',
    grupos: [{ numero: 1, filas: [{ participantes: ['p1'], voluntarios: ['v1'] }], apoyo: [] },
             { numero: 2, filas: [], apoyo: [] }],
    ausentes: ['p2'] },
  { fecha: '2026-08-15',
    grupos: [{ numero: 1, filas: [{ participantes: ['p2'], voluntarios: ['v3'] }], apoyo: [] },
             { numero: 2, filas: [], apoyo: [] }],
    ausentes: ['p1'] },
]

describe('historial', () => {
  it('devuelve las fechas ordenadas', () => {
    const h = historial(SABADOS, ROSTER, [])
    expect(h.fechas).toEqual(['2026-08-01', '2026-08-08', '2026-08-15'])
  })

  it('arma una fila por persona del roster', () => {
    const h = historial(SABADOS, ROSTER, [])
    expect(h.participantes.map((f) => f.persona.id)).toEqual(['p1', 'p2', 'p3'])
    expect(h.voluntarios.map((f) => f.persona.id)).toEqual(['v1', 'v2', 'v3'])
  })

  it('el voluntario no acumula faltas antes de su primer sabado', () => {
    // Martin recien aparece el 15. Los dos anteriores no son faltas suyas.
    const martin = historial(SABADOS, ROSTER, []).voluntarios.find((f) => f.persona.id === 'v3')
    expect(martin.estados).toEqual([NO_ESTABA, NO_ESTABA, VINO])
  })

  it('el voluntario que nunca aparece no cuenta ningun sabado', () => {
    const vicky = historial(SABADOS, ROSTER, []).voluntarios.find((f) => f.persona.id === 'v2')
    expect(vicky.estados).toEqual([NO_ESTABA, NO_ESTABA, NO_ESTABA])
  })

  it('la falta del participante vale desde el primer sabado', () => {
    // De el si hay registro explicito: alguien toco "Hoy no viene".
    const p2 = historial(SABADOS, ROSTER, []).participantes.find((f) => f.persona.id === 'p2')
    expect(p2.estados).toEqual([FALTO, FALTO, VINO])
  })

  it('una correccion pisa lo derivado de la planilla', () => {
    const correcciones = [{ fecha: '2026-08-08', persona: 'p1', vino: false }]
    const p1 = historial(SABADOS, ROSTER, correcciones).participantes.find((f) => f.persona.id === 'p1')
    expect(p1.estados).toEqual([VINO, FALTO, FALTO])
  })

  it('una correccion puede devolver a alguien que la planilla daba por ausente', () => {
    const correcciones = [{ fecha: '2026-08-01', persona: 'p2', vino: true }]
    const p2 = historial(SABADOS, ROSTER, correcciones).participantes.find((f) => f.persona.id === 'p2')
    expect(p2.estados[0]).toBe(VINO)
  })

  it('una correccion sobre un sabado sin planilla se ignora', () => {
    const correcciones = [{ fecha: '2026-09-05', persona: 'p1', vino: false }]
    const p1 = historial(SABADOS, ROSTER, correcciones).participantes.find((f) => f.persona.id === 'p1')
    expect(p1.estados).toHaveLength(3)
  })

  it('cuenta a cuantos vino cada uno', () => {
    const p1 = historial(SABADOS, ROSTER, []).participantes.find((f) => f.persona.id === 'p1')
    expect(p1.vino).toBe(2)
    expect(p1.de).toBe(3)
  })

  it('no cuenta como sabado posible uno en el que la persona no estaba', () => {
    const martin = historial(SABADOS, ROSTER, []).voluntarios.find((f) => f.persona.id === 'v3')
    expect(martin.vino).toBe(1)
    expect(martin.de).toBe(1)
  })
})
```

- [ ] **Paso 2: Correr la prueba y verificar que falla**

Comando: `npx vitest run test/modelo/asistencia.test.js`
Esperado: FALLA con "historial is not a function"

- [ ] **Paso 3: Escribir la implementación**

Agregar al final de `js/modelo/asistencia.js`:

```js
// El historial de un periodo: una fila por persona, una columna por sabado que
// tuvo planilla. Los sabados sin planilla no existen para el reporte: no hay
// forma de distinguir "no hubo futbol" de "no se cargo", asi que no se afirma
// nada sobre ellos.
//
// `correcciones` son solo las diferencias contra lo derivado, tal como se
// guardan en asistencias/AAAA-MM.json. La lista vacia es el caso normal.
export function historial(listas, roster, correcciones = []) {
  const ordenadas = [...listas].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const fechas = ordenadas.map((l) => l.fecha)
  const conocidas = new Set(fechas)

  const porFecha = new Map(ordenadas.map((l) => [l.fecha, estadoDeSabado(l, roster)]))
  correcciones.forEach((c) => {
    // Una correccion de un sabado que no tiene planilla no tiene donde apoyarse.
    if (!conocidas.has(c.fecha)) return
    porFecha.get(c.fecha).set(c.persona, c.vino ? VINO : FALTO)
  })

  const fila = (persona, recortarArranque) => {
    let estados = fechas.map((f) => porFecha.get(f).get(persona.id) ?? NO_ESTABA)
    if (recortarArranque) {
      // Del voluntario, "no aparece" y "todavia no estaba" son el mismo dato en
      // una planilla suelta. Se separan aca: hasta que se lo ve por primera vez
      // no habia nada que faltar.
      const primero = estados.indexOf(VINO)
      const hasta = primero === -1 ? estados.length : primero
      estados = estados.map((e, i) => (i < hasta ? NO_ESTABA : e))
    }
    const posibles = estados.filter((e) => e !== NO_ESTABA)
    return {
      persona,
      estados,
      vino: posibles.filter((e) => e === VINO).length,
      de: posibles.length,
    }
  }

  return {
    fechas,
    participantes: (roster.participantes ?? []).map((p) => fila(p, false)),
    voluntarios: (roster.voluntarios ?? []).map((v) => fila(v, true)),
  }
}
```

- [ ] **Paso 4: Correr la prueba y verificar que pasa**

Comando: `npx vitest run test/modelo/asistencia.test.js`
Esperado: PASA, 18 pruebas

- [ ] **Paso 5: Commit**

```bash
git add js/modelo/asistencia.js test/modelo/asistencia.test.js
git commit -m "Armar el historial de asistencia de un periodo"
```

---

## Tarea 3: Rachas de falta

Quién viene faltando tres sábados seguidos, contando solo sábados con planilla.

**Archivos:**
- Modificar: `js/modelo/asistencia.js`
- Test: `test/modelo/asistencia.test.js`

- [ ] **Paso 1: Escribir la prueba que falla**

Agregar al final de `test/modelo/asistencia.test.js`:

```js
import { rachasDeFalta, UMBRAL_ALERTA } from '../../js/modelo/asistencia.js'

const cuatroSabados = (estadosP1) => estadosP1.map((vino, i) => ({
  fecha: `2026-08-0${i + 1}`,
  grupos: [
    { numero: 1, filas: vino ? [{ participantes: ['p1'], voluntarios: ['v1'] }] : [], apoyo: [] },
    { numero: 2, filas: [], apoyo: [] },
  ],
  ausentes: vino ? [] : ['p1'],
}))

describe('rachasDeFalta', () => {
  it('el umbral es tres faltas seguidas', () => {
    expect(UMBRAL_ALERTA).toBe(3)
  })

  it('con dos faltas seguidas no avisa', () => {
    const h = historial(cuatroSabados([true, true, false, false]), ROSTER, [])
    expect(rachasDeFalta(h, [])).toEqual([])
  })

  it('con tres faltas seguidas avisa', () => {
    const h = historial(cuatroSabados([true, false, false, false]), ROSTER, [])
    const alerta = rachasDeFalta(h, []).find((a) => a.persona.id === 'p1')
    expect(alerta.faltas).toBe(3)
  })

  it('cuenta solo la racha que llega hasta el ultimo sabado', () => {
    // Falto tres, volvio: el problema se termino.
    const h = historial(cuatroSabados([false, false, false, true]), ROSTER, [])
    expect(rachasDeFalta(h, []).find((a) => a.persona.id === 'p1')).toBeUndefined()
  })

  it('no avisa por quien esta dado de baja', () => {
    const roster = { ...ROSTER, participantes: ROSTER.participantes.map((p) => ({ ...p, activo: false })) }
    const h = historial(cuatroSabados([true, false, false, false]), roster, [])
    expect(rachasDeFalta(h, []).find((a) => a.persona.id === 'p1')).toBeUndefined()
  })

  it('un seguimiento anotado apaga la alerta', () => {
    const h = historial(cuatroSabados([true, false, false, false]), ROSTER, [])
    const seguimientos = [{ persona: 'p1', desde: '2026-08-02', nota: 'Hable con la mama' }]
    expect(rachasDeFalta(h, seguimientos).find((a) => a.persona.id === 'p1')).toBeUndefined()
  })

  it('vuelve a avisar si falto tres veces mas despues de haber vuelto', () => {
    // Silenciada en la racha vieja; despues volvio y arranco otra racha.
    const listas = cuatroSabados([false, false, false, true])
      .concat([4, 5, 6].map((d) => ({
        fecha: `2026-08-0${d + 1}`,
        grupos: [{ numero: 1, filas: [], apoyo: [] }, { numero: 2, filas: [], apoyo: [] }],
        ausentes: ['p1'],
      })))
    const h = historial(listas, ROSTER, [])
    const seguimientos = [{ persona: 'p1', desde: '2026-08-01', nota: 'vieja' }]
    expect(rachasDeFalta(h, seguimientos).find((a) => a.persona.id === 'p1').faltas).toBe(3)
  })

  it('ordena por racha mas larga primero', () => {
    const listas = cuatroSabados([false, false, false, false])
    const h = historial(listas, ROSTER, [])
    const alertas = rachasDeFalta(h, [])
    expect(alertas[0].faltas).toBeGreaterThanOrEqual(alertas[alertas.length - 1].faltas)
  })
})
```

- [ ] **Paso 2: Correr la prueba y verificar que falla**

Comando: `npx vitest run test/modelo/asistencia.test.js`
Esperado: FALLA con "rachasDeFalta is not a function"

- [ ] **Paso 3: Escribir la implementación**

Agregar al final de `js/modelo/asistencia.js`:

```js
// Tres faltas seguidas. El usuario lo pidio como "mas de 2 veces seguidas".
export const UMBRAL_ALERTA = 3

// Cuantas faltas seguidas trae hasta hoy, contando desde el ultimo sabado hacia
// atras. Los sabados en que la persona todavia no estaba se saltean sin cortar
// la racha, igual que un sabado sin planilla: ni suman ni interrumpen.
function rachaFinal(estados) {
  let faltas = 0
  for (let i = estados.length - 1; i >= 0; i -= 1) {
    if (estados[i] === VINO) break
    if (estados[i] === FALTO) faltas += 1
  }
  return faltas
}

// Un seguimiento silencia UNA racha, no a la persona: vale mientras no haya
// vuelto a venir despues de anotarlo. Si volvio y arranco otra racha, la alerta
// tiene que aparecer de nuevo, porque es informacion nueva.
function silenciada(fila, fechas, seguimientos) {
  const suyos = seguimientos.filter((s) => s.persona === fila.persona.id)
  if (suyos.length === 0) return false
  const ultimo = suyos.map((s) => s.desde).sort().at(-1)
  const vinoDespues = fechas.some((f, i) => f > ultimo && fila.estados[i] === VINO)
  return !vinoDespues
}

export function rachasDeFalta(historia, seguimientos = []) {
  const alertas = []
  const revisar = (filas) => filas.forEach((fila) => {
    if (fila.persona.activo === false) return
    const faltas = rachaFinal(fila.estados)
    if (faltas < UMBRAL_ALERTA) return
    if (silenciada(fila, historia.fechas, seguimientos)) return
    alertas.push({ persona: fila.persona, faltas })
  })
  revisar(historia.participantes)
  revisar(historia.voluntarios)
  return alertas.sort((a, b) => b.faltas - a.faltas)
}
```

- [ ] **Paso 4: Correr la prueba y verificar que pasa**

Comando: `npx vitest run test/modelo/asistencia.test.js`
Esperado: PASA, 26 pruebas

- [ ] **Paso 5: Commit**

```bash
git add js/modelo/asistencia.js test/modelo/asistencia.test.js
git commit -m "Detectar tres faltas seguidas, con seguimientos que las silencian"
```

---

## Tarea 4: Guardar correcciones y seguimientos

Las dos puntas del almacén. En local hay que subir la versión de IndexedDB, que hoy es 1 con tres depósitos.

**Archivos:**
- Modificar: `js/almacen/local.js:3`, `js/almacen/local.js:8-12`
- Modificar: `js/almacen/remoto.js:3-5`
- Test: `test/almacen/local.test.js`, `test/almacen/remoto.test.js`

- [ ] **Paso 1: Escribir la prueba que falla**

Agregar a `test/almacen/remoto.test.js`, dentro del `describe` existente:

```js
it('lee las correcciones del mes', async () => {
  const almacen = crearAlmacenRemoto({ cliente, autor: 'Ana' })
  cliente.archivos.set('asistencias/2026-08.json', {
    texto: JSON.stringify({ version: 1, mes: '2026-08', correcciones: [{ fecha: '2026-08-15', persona: 'p1', vino: false }] }),
    sha: 'abc',
  })
  const leido = await almacen.leerAsistencias('2026-08')
  expect(leido.correcciones).toHaveLength(1)
})

it('un mes sin correcciones no es un error', async () => {
  const almacen = crearAlmacenRemoto({ cliente, autor: 'Ana' })
  expect(await almacen.leerAsistencias('2026-01')).toBeNull()
})

it('guarda las correcciones con quien las hizo en el mensaje', async () => {
  const almacen = crearAlmacenRemoto({ cliente, autor: 'Ana' })
  await almacen.guardarAsistencias('2026-08', { version: 1, mes: '2026-08', correcciones: [] },
    'Corregir la asistencia del 2026-08-15')
  expect(cliente.mensajes.at(-1)).toContain('Corregir la asistencia del 2026-08-15')
  expect(cliente.mensajes.at(-1)).toContain('Ana')
})

it('guarda los seguimientos', async () => {
  const almacen = crearAlmacenRemoto({ cliente, autor: 'Ana' })
  await almacen.guardarSeguimientos({ version: 1, seguimientos: [] }, 'Anotar seguimiento de Gaia')
  expect(cliente.archivos.has('seguimientos.json')).toBe(true)
})
```

Si `test/almacen/remoto.test.js` no expone `cliente.mensajes`, agregar al doble de cliente que ya existe en ese archivo un array `mensajes` donde `escribirTexto` empuje su cuarto argumento.

Agregar a `test/almacen/local.test.js`:

```js
it('guarda y lee las correcciones de un mes', async () => {
  const almacen = await crearAlmacenLocal()
  await almacen.guardarAsistencias('2026-08', { version: 1, mes: '2026-08', correcciones: [{ fecha: '2026-08-15', persona: 'p1', vino: false }] })
  expect((await almacen.leerAsistencias('2026-08')).correcciones).toHaveLength(1)
})

it('un mes sin correcciones devuelve null', async () => {
  const almacen = await crearAlmacenLocal()
  expect(await almacen.leerAsistencias('2026-01')).toBeNull()
})

it('guarda y lee los seguimientos', async () => {
  const almacen = await crearAlmacenLocal()
  await almacen.guardarSeguimientos({ version: 1, seguimientos: [{ persona: 'p1', desde: '2026-08-15', nota: 'ok' }] })
  expect((await almacen.leerSeguimientos()).seguimientos).toHaveLength(1)
})
```

- [ ] **Paso 2: Correr las pruebas y verificar que fallan**

Comando: `npx vitest run test/almacen/`
Esperado: FALLA con "almacen.leerAsistencias is not a function"

- [ ] **Paso 3: Escribir la implementación**

En `js/almacen/local.js`, reemplazar las líneas 2 y 3:

```js
// La 2 suma los depositos de asistencias y seguimientos. Subir el numero es
// obligatorio: onupgradeneeded no vuelve a correr con la misma version, y sin
// eso los depositos nuevos no existen en las bases ya creadas.
const VERSION = 2
const DEPOSITOS = {
  roster: 'roster', listas: 'listas', fotos: 'fotos',
  asistencias: 'asistencias', seguimientos: 'seguimientos',
}
```

En la misma función `abrir()`, agregar dentro de `onupgradeneeded`, después de la línea de `fotos`:

```js
      if (!db.objectStoreNames.contains(DEPOSITOS.asistencias)) db.createObjectStore(DEPOSITOS.asistencias)
      if (!db.objectStoreNames.contains(DEPOSITOS.seguimientos)) db.createObjectStore(DEPOSITOS.seguimientos)
```

Agregar al objeto que devuelve `crearAlmacenLocal`, después de `listarListas`:

```js
    async leerAsistencias(mes) {
      const guardado = await operar(db, DEPOSITOS.asistencias, 'readonly', (d) => d.get(mes))
      return guardado ?? null
    },

    async guardarAsistencias(mes, datos) {
      await operar(db, DEPOSITOS.asistencias, 'readwrite', (d) => d.put(datos, mes))
      return { sha: null }
    },

    async leerSeguimientos() {
      const guardado = await operar(db, DEPOSITOS.seguimientos, 'readonly', (d) => d.get('actual'))
      return guardado ?? null
    },

    async guardarSeguimientos(datos) {
      await operar(db, DEPOSITOS.seguimientos, 'readwrite', (d) => d.put(datos, 'actual'))
      return { sha: null }
    },
```

En `js/almacen/remoto.js`, agregar junto a las otras rutas del principio:

```js
const RUTA_SEGUIMIENTOS = 'seguimientos.json'
const rutaAsistencias = (mes) => `asistencias/${mes}.json`
```

Y al objeto que devuelve `crearAlmacenRemoto`, después de `listarListas`:

```js
    leerAsistencias(mes) {
      return leerJson(rutaAsistencias(mes))
    },

    guardarAsistencias(mes, datos, descripcion = null) {
      const mensaje = `${descripcion ?? `Corregir la asistencia de ${mes}`} · ${autor}`
      return escribirJson(rutaAsistencias(mes), datos, mensaje)
    },

    leerSeguimientos() {
      return leerJson(RUTA_SEGUIMIENTOS)
    },

    guardarSeguimientos(datos, descripcion = null) {
      const mensaje = `${descripcion ?? 'Anotar un seguimiento'} · ${autor}`
      return escribirJson(RUTA_SEGUIMIENTOS, datos, mensaje)
    },
```

- [ ] **Paso 4: Correr las pruebas y verificar que pasan**

Comando: `npx vitest run test/almacen/`
Esperado: PASA

- [ ] **Paso 5: Correr la suite entera**

Comando: `npx vitest run`
Esperado: PASA, sin regresiones

- [ ] **Paso 6: Commit**

```bash
git add js/almacen/local.js js/almacen/remoto.js test/almacen/
git commit -m "Guardar correcciones de asistencia y seguimientos en los dos almacenes"
```

---

## Tarea 5: El CSV

**Archivos:**
- Crear: `js/reporte/csv.js`
- Test: `test/reporte/csv.test.js`

- [ ] **Paso 1: Escribir la prueba que falla**

Crear `test/reporte/csv.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { aCSV } from '../../js/reporte/csv.js'

const HISTORIA = {
  fechas: ['2026-08-01', '2026-08-08'],
  participantes: [
    { persona: { id: 'p1', nombre: 'Gaia' }, estados: ['vino', 'falto'], vino: 1, de: 2 },
  ],
  voluntarios: [
    { persona: { id: 'v1', nombre: 'Abi, la grande' }, estados: ['no-estaba', 'vino'], vino: 1, de: 1 },
  ],
}

describe('aCSV', () => {
  it('encabeza con las fechas', () => {
    expect(aCSV(HISTORIA).split('\n')[0]).toBe('Tipo,Nombre,2026-08-01,2026-08-08,Vino,De')
  })

  it('escribe una fila por persona', () => {
    const filas = aCSV(HISTORIA).split('\n')
    expect(filas[1]).toBe('Participante,Gaia,Si,No,1,2')
  })

  it('entrecomilla el nombre que tiene una coma', () => {
    // Sin esto, "Abi, la grande" se parte en dos columnas y corre todo el resto.
    expect(aCSV(HISTORIA).split('\n')[2]).toBe('Voluntario,"Abi, la grande",,Si,1,1')
  })

  it('deja la casilla vacia cuando la persona todavia no estaba', () => {
    expect(aCSV(HISTORIA)).toContain(',,Si,')
  })

  it('arranca con el BOM que Excel necesita para los acentos', () => {
    expect(aCSV(HISTORIA).charCodeAt(0)).toBe(0xFEFF)
  })
})
```

- [ ] **Paso 2: Correr la prueba y verificar que falla**

Comando: `npx vitest run test/reporte/csv.test.js`
Esperado: FALLA con "Failed to resolve import"

- [ ] **Paso 3: Escribir la implementación**

Crear `js/reporte/csv.js`:

```js
import { VINO, FALTO } from '../modelo/asistencia.js'

// Una comilla dentro de un campo entrecomillado se escribe doble. Es la regla
// del formato, no una manía: sin esto un apellido con comilla corta la fila.
function campo(valor) {
  const texto = String(valor ?? '')
  if (!/[",\n]/.test(texto)) return texto
  return `"${texto.replace(/"/g, '""')}"`
}

const CASILLA = { [VINO]: 'Si', [FALTO]: 'No' }

// El BOM al principio es lo unico que hace que Excel en Windows lea el archivo
// como UTF-8. Sin el, "Gaía" llega como "GaÃ­a" y el reporte parece roto.
const BOM = '﻿'

export function aCSV(historia) {
  const encabezado = ['Tipo', 'Nombre', ...historia.fechas, 'Vino', 'De']
  const fila = (tipo) => (f) => [
    tipo,
    campo(f.persona.nombre),
    // La casilla vacia es "todavia no estaba": ni si ni no, que en una planilla
    // de calculo se suma mal.
    ...f.estados.map((e) => CASILLA[e] ?? ''),
    f.vino,
    f.de,
  ].join(',')

  return BOM + [
    encabezado.map(campo).join(','),
    ...historia.participantes.map(fila('Participante')),
    ...historia.voluntarios.map(fila('Voluntario')),
  ].join('\n')
}

export function descargarCSV(texto, nombre) {
  const blob = new Blob([texto], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}
```

- [ ] **Paso 4: Correr la prueba y verificar que pasa**

Comando: `npx vitest run test/reporte/csv.test.js`
Esperado: PASA, 5 pruebas

- [ ] **Paso 5: Commit**

```bash
git add js/reporte/csv.js test/reporte/csv.test.js
git commit -m "Exportar el historial de asistencia a CSV"
```

---

## Tarea 6: La maquetación del reporte en PNG

Mismo patrón que `js/imagen/maquetar.js`: función pura que devuelve órdenes, sin canvas.

**Archivos:**
- Crear: `js/imagen/maquetar-reporte.js`
- Test: `test/imagen/maquetar-reporte.test.js`
- Leer antes de empezar: `js/imagen/maquetar.js` (encabezado y pie), `js/imagen/tema.js` (`COLORES`, `medidas`), `js/imagen/pintar.js` (`TIPOS`).

- [ ] **Paso 1: Escribir la prueba que falla**

Crear `test/imagen/maquetar-reporte.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { maquetarReporte } from '../../js/imagen/maquetar-reporte.js'
import { TIPOS } from '../../js/imagen/pintar.js'

const medir = (texto) => texto.length * 8

const HISTORIA = {
  fechas: ['2026-08-01', '2026-08-08', '2026-08-15'],
  participantes: [
    { persona: { id: 'p1', nombre: 'Gaia' }, estados: ['vino', 'falto', 'vino'], vino: 2, de: 3 },
    { persona: { id: 'p2', nombre: 'Santiago' }, estados: ['vino', 'vino', 'vino'], vino: 3, de: 3 },
  ],
  voluntarios: [
    { persona: { id: 'v1', nombre: 'Abi' }, estados: ['no-estaba', 'vino', 'vino'], vino: 2, de: 2 },
  ],
}

const maquetar = () => maquetarReporte({ historia: HISTORIA, mes: '2026-08', medirTexto: medir })

describe('maquetarReporte', () => {
  it('devuelve alto y ordenes', () => {
    const plano = maquetar()
    expect(plano.alto).toBeGreaterThan(0)
    expect(plano.ordenes.length).toBeGreaterThan(0)
  })

  it('solo emite tipos que el pintor sabe ejecutar', () => {
    // Derivado de TIPOS, no de una lista escrita a mano: una lista copiada se
    // desactualiza en silencio y la prueba deja de proteger nada.
    const tipos = new Set(maquetar().ordenes.map((o) => o.tipo))
    tipos.forEach((t) => expect(TIPOS).toContain(t))
  })

  it('titula con el mes en palabras', () => {
    const textos = maquetar().ordenes.filter((o) => o.tipo === 'texto').map((o) => o.texto)
    expect(textos).toContain('Asistencia de agosto de 2026')
  })

  it('escribe el nombre de cada persona', () => {
    const textos = maquetar().ordenes.filter((o) => o.tipo === 'texto').map((o) => o.texto)
    expect(textos).toContain('Gaia')
    expect(textos).toContain('Abi')
  })

  it('separa participantes de voluntarios con dos titulos', () => {
    const textos = maquetar().ordenes.filter((o) => o.tipo === 'texto').map((o) => o.texto)
    expect(textos).toContain('Participantes')
    expect(textos).toContain('Voluntarios')
  })

  it('encabeza cada columna con el dia del mes', () => {
    const textos = maquetar().ordenes.filter((o) => o.tipo === 'texto').map((o) => o.texto)
    expect(textos).toContain('1')
    expect(textos).toContain('8')
    expect(textos).toContain('15')
  })

  it('resume cuantos vino de cuantos', () => {
    const textos = maquetar().ordenes.filter((o) => o.tipo === 'texto').map((o) => o.texto)
    expect(textos).toContain('2 de 3')
  })

  it('deja la casilla del que no estaba sin marca', () => {
    // Tres personas por tres sabados son nueve casillas, menos la de Abi el 1.
    const marcas = maquetar().ordenes.filter((o) => o.tipo === 'texto' && ['✓', '✗'].includes(o.texto))
    expect(marcas).toHaveLength(8)
  })

  it('el ancho crece con la cantidad de sabados', () => {
    const corta = maquetarReporte({
      historia: { ...HISTORIA, fechas: ['2026-08-01'],
        participantes: HISTORIA.participantes.map((f) => ({ ...f, estados: ['vino'] })),
        voluntarios: HISTORIA.voluntarios.map((f) => ({ ...f, estados: ['vino'] })) },
      mes: '2026-08', medirTexto: medir,
    })
    expect(corta.ancho).toBeLessThan(maquetar().ancho)
  })

  it('no dibuja nada fuera del lienzo', () => {
    const plano = maquetar()
    plano.ordenes.filter((o) => o.tipo === 'rect').forEach((o) => {
      expect(o.x).toBeGreaterThanOrEqual(0)
      expect(o.x + o.ancho).toBeLessThanOrEqual(plano.ancho + 0.5)
    })
  })
})
```

- [ ] **Paso 2: Correr la prueba y verificar que falla**

Comando: `npx vitest run test/imagen/maquetar-reporte.test.js`
Esperado: FALLA con "Failed to resolve import"

- [ ] **Paso 3: Escribir la implementación**

Crear `js/imagen/maquetar-reporte.js`:

```js
import { COLORES } from './tema.js'
import { VINO, FALTO } from '../modelo/asistencia.js'

// La tabla del reporte mensual, con el mismo motor de dos etapas que la
// planilla: aca solo se calculan ordenes de dibujo, y pintar.js las ejecuta.
// Esa separacion es lo que garantiza que el PNG descargado sea identico a lo
// que se ve en pantalla, y deja probar la geometria sin navegador.

const MARGEN = 40
const ALTO_TITULO = 92
const ALTO_ENCABEZADO = 44
const ALTO_FILA = 40
const ALTO_SECCION = 52
const ANCHO_COLUMNA = 46
const ANCHO_RESUMEN = 96
const ANCHO_NOMBRE_MINIMO = 220

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// Sin new Date(): el mes llega como 'AAAA-MM' y partirlo evita que la zona
// horaria mueva la fecha un dia, que en Montevideo pasa con las fechas ISO.
function mesEnPalabras(mes) {
  const [anio, numero] = mes.split('-')
  return `${MESES[Number(numero) - 1]} de ${anio}`
}

const diaDe = (fecha) => String(Number(fecha.slice(8, 10)))

export function maquetarReporte({ historia, mes, medirTexto }) {
  const fuenteNombre = '400 22px Poppins'
  const anchoNombre = Math.max(
    ANCHO_NOMBRE_MINIMO,
    ...[...historia.participantes, ...historia.voluntarios]
      .map((f) => medirTexto(f.persona.nombre, fuenteNombre) + 24),
  )
  const ancho = MARGEN * 2 + anchoNombre + historia.fechas.length * ANCHO_COLUMNA + ANCHO_RESUMEN
  const ordenes = []
  let y = 0

  ordenes.push({ tipo: 'rect', x: 0, y: 0, ancho, alto: ALTO_TITULO, color: COLORES.violeta })
  ordenes.push({ tipo: 'texto', texto: `Asistencia de ${mesEnPalabras(mes)}`,
    x: MARGEN, y: 58, fuente: '500 34px Poppins', color: '#FFFFFF' })
  y = ALTO_TITULO + 20

  const columnaX = (i) => MARGEN + anchoNombre + i * ANCHO_COLUMNA
  const resumenX = MARGEN + anchoNombre + historia.fechas.length * ANCHO_COLUMNA

  // El encabezado de columnas lleva solo el numero del dia: el mes ya esta en el
  // titulo, y repetirlo doce veces obliga a girar el telefono para leerlo.
  historia.fechas.forEach((fecha, i) => {
    ordenes.push({ tipo: 'texto', texto: diaDe(fecha),
      x: columnaX(i) + ANCHO_COLUMNA / 2, y: y + 26,
      fuente: '500 20px Poppins', color: COLORES.textoSuave, alineacion: 'center' })
  })
  ordenes.push({ tipo: 'texto', texto: 'Vino', x: resumenX + 8, y: y + 26,
    fuente: '500 20px Poppins', color: COLORES.textoSuave })
  y += ALTO_ENCABEZADO

  const seccion = (titulo, filas, color) => {
    if (filas.length === 0) return
    ordenes.push({ tipo: 'texto', texto: titulo, x: MARGEN, y: y + 32,
      fuente: '500 26px Poppins', color })
    y += ALTO_SECCION

    filas.forEach((fila, indice) => {
      // La banda alterna es lo unico que sostiene la vista a lo largo de doce
      // columnas: sin ella se salta de fila al leer hacia la derecha.
      if (indice % 2 === 1) {
        ordenes.push({ tipo: 'rect', x: MARGEN - 8, y, ancho: ancho - (MARGEN - 8) * 2,
          alto: ALTO_FILA, color: COLORES.violetaTenue, radio: 8 })
      }
      ordenes.push({ tipo: 'texto', texto: fila.persona.nombre, x: MARGEN, y: y + 27,
        fuente: fuenteNombre, color: COLORES.texto })
      fila.estados.forEach((estado, i) => {
        // La casilla vacia significa "todavia no estaba". Un guion o un cero se
        // leerian como una falta.
        if (estado !== VINO && estado !== FALTO) return
        ordenes.push({ tipo: 'texto', texto: estado === VINO ? '✓' : '✗',
          x: columnaX(i) + ANCHO_COLUMNA / 2, y: y + 27, fuente: '500 22px Poppins',
          color: estado === VINO ? COLORES.turquesaTexto : COLORES.magentaTexto,
          alineacion: 'center' })
      })
      ordenes.push({ tipo: 'texto', texto: `${fila.vino} de ${fila.de}`,
        x: resumenX + 8, y: y + 27, fuente: '400 20px Poppins', color: COLORES.textoSuave })
      y += ALTO_FILA
    })
    y += 16
  }

  seccion('Participantes', historia.participantes, COLORES.violeta)
  seccion('Voluntarios', historia.voluntarios, COLORES.magentaTexto)

  ordenes.push({ tipo: 'texto',
    texto: `${historia.fechas.length} ${historia.fechas.length === 1 ? 'sábado' : 'sábados'} con planilla`,
    x: MARGEN, y: y + 24, fuente: '400 18px Poppins', color: COLORES.textoSuave })
  y += MARGEN + 24

  return { ancho, alto: y, ordenes }
}
```

Las claves de `COLORES` usadas acá están verificadas contra `js/imagen/tema.js`: `violeta`, `violetaTenue`, `texto`, `textoSuave`, `turquesaTexto`, `magentaTexto`. El `'#FFFFFF'` del título va como literal porque el tema lo tiene con dos nombres (`fondo` y `blanco`) y ninguno de los dos significa "texto sobre la banda violeta". No agregar colores nuevos al tema para esto.

También verificado en `js/imagen/pintar.js`: las órdenes de tipo `texto` aceptan `alineacion` (va a `ctx.textAlign`) y las de tipo `rect` aceptan `radio`. Las dos se usan arriba.

- [ ] **Paso 4: Correr la prueba y verificar que pasa**

Comando: `npx vitest run test/imagen/maquetar-reporte.test.js`
Esperado: PASA, 10 pruebas

- [ ] **Paso 5: Commit**

```bash
git add js/imagen/maquetar-reporte.js test/imagen/maquetar-reporte.test.js
git commit -m "Maquetar el reporte mensual como imagen"
```

---

## Tarea 7: Pantalla del reporte

**Archivos:**
- Crear: `js/ui/pantalla-reporte.js`
- Test: `test/ui/pantalla-reporte.test.js`
- Leer antes de empezar: `js/ui/pantalla-vista-previa.js` (cómo pinta y descarga), `js/imagen/exportar.js`.

- [ ] **Paso 1: Escribir la prueba que falla**

Crear `test/ui/pantalla-reporte.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { crearPantallaReporte } from '../../js/ui/pantalla-reporte.js'

const ROSTER = {
  version: 1,
  participantes: [{ id: 'p1', nombre: 'Gaia', grupo: 1, activo: true }],
  voluntarios: [{ id: 'v1', nombre: 'Abi', activo: true }],
}

const LISTAS = {
  '2026-08-01': { fecha: '2026-08-01', ausentes: [],
    grupos: [{ numero: 1, filas: [{ participantes: ['p1'], voluntarios: ['v1'] }], apoyo: [] },
             { numero: 2, filas: [], apoyo: [] }] },
  '2026-08-08': { fecha: '2026-08-08', ausentes: ['p1'],
    grupos: [{ numero: 1, filas: [], apoyo: ['v1'] }, { numero: 2, filas: [], apoyo: [] }] },
}

let raiz, deposito

beforeEach(() => {
  document.body.innerHTML = '<div id="raiz"></div>'
  raiz = document.getElementById('raiz')
  deposito = {
    listarListas: vi.fn(async () => Object.keys(LISTAS).map((fecha) => ({ fecha }))),
    leerLista: vi.fn(async (fecha) => LISTAS[fecha] ?? null),
    leerAsistencias: vi.fn(async () => null),
  }
})

const esperar = () => new Promise((r) => setTimeout(r, 0))

describe('pantalla de reporte', () => {
  it('arranca en el mes que se le pasa', async () => {
    crearPantallaReporte(raiz, { roster: ROSTER, almacen: deposito, mes: '2026-08' })
    await esperar()
    expect(raiz.querySelector('[data-campo="mes"]').value).toBe('2026-08')
  })

  it('dibuja una columna por sabado con planilla', async () => {
    crearPantallaReporte(raiz, { roster: ROSTER, almacen: deposito, mes: '2026-08' })
    await esperar()
    expect(raiz.querySelectorAll('thead th')).toHaveLength(4)
  })

  it('dibuja una fila por persona', async () => {
    crearPantallaReporte(raiz, { roster: ROSTER, almacen: deposito, mes: '2026-08' })
    await esperar()
    expect(raiz.querySelectorAll('tbody tr[data-persona]')).toHaveLength(2)
  })

  it('marca presente y ausente', async () => {
    crearPantallaReporte(raiz, { roster: ROSTER, almacen: deposito, mes: '2026-08' })
    await esperar()
    const celdas = raiz.querySelectorAll('tr[data-persona="p1"] td[data-estado]')
    expect(celdas[0].dataset.estado).toBe('vino')
    expect(celdas[1].dataset.estado).toBe('falto')
  })

  it('solo lee las planillas del mes elegido', async () => {
    deposito.listarListas = vi.fn(async () => [{ fecha: '2026-07-25' }, { fecha: '2026-08-01' }])
    crearPantallaReporte(raiz, { roster: ROSTER, almacen: deposito, mes: '2026-08' })
    await esperar()
    expect(deposito.leerLista).toHaveBeenCalledTimes(1)
    expect(deposito.leerLista).toHaveBeenCalledWith('2026-08-01')
  })

  it('un mes sin planillas lo dice en vez de mostrar una tabla vacia', async () => {
    deposito.listarListas = vi.fn(async () => [])
    crearPantallaReporte(raiz, { roster: ROSTER, almacen: deposito, mes: '2026-01' })
    await esperar()
    expect(raiz.textContent).toContain('No hay planillas')
    expect(raiz.querySelector('table')).toBeNull()
  })

  it('ofrece las dos descargas', async () => {
    crearPantallaReporte(raiz, { roster: ROSTER, almacen: deposito, mes: '2026-08' })
    await esperar()
    expect(raiz.querySelector('[data-accion="descargar-png"]')).not.toBeNull()
    expect(raiz.querySelector('[data-accion="descargar-csv"]')).not.toBeNull()
  })
})
```

- [ ] **Paso 2: Correr la prueba y verificar que falla**

Comando: `npx vitest run test/ui/pantalla-reporte.test.js`
Esperado: FALLA con "Failed to resolve import"

- [ ] **Paso 3: Escribir la implementación**

Crear `js/ui/pantalla-reporte.js`:

```js
import { elemento, boton, vaciar } from './componentes.js'
import { historial, VINO, FALTO } from '../modelo/asistencia.js'
import { aCSV, descargarCSV } from '../reporte/csv.js'
import { maquetarReporte } from '../imagen/maquetar-reporte.js'
import { pintar } from '../imagen/pintar.js'
import { medidorDesde, esperarFuentes, descargar } from '../imagen/exportar.js'

const MARCA = { [VINO]: '✓', [FALTO]: '✗' }
const diaDe = (fecha) => String(Number(fecha.slice(8, 10)))

// Las listas se guardan una por fecha, asi que el mes es un prefijo de la clave:
// no hay indice que consultar ni fecha que parsear.
const delMes = (fechas, mes) => fechas.filter((f) => f.startsWith(`${mes}-`)).sort()

export function crearPantallaReporte(raiz, { roster, almacen, mes: mesInicial }) {
  let mes = mesInicial
  let historia = null
  let cargando = true
  let vivo = true

  async function cargar() {
    cargando = true
    dibujar()
    const claves = (await almacen.listarListas()).map((l) => l.fecha)
    const fechas = delMes(claves, mes)
    const listas = (await Promise.all(fechas.map((f) => almacen.leerLista(f)))).filter(Boolean)
    const archivo = await almacen.leerAsistencias(mes)
    if (!vivo) return
    historia = historial(listas, roster, archivo?.correcciones ?? [])
    cargando = false
    dibujar()
  }

  function tabla() {
    const t = document.createElement('table')
    t.className = 'tabla-reporte'
    const cabeza = document.createElement('thead')
    const filaCabeza = document.createElement('tr')
    filaCabeza.appendChild(elemento('th', [], 'Nombre'))
    historia.fechas.forEach((f) => filaCabeza.appendChild(elemento('th', ['dia'], diaDe(f))))
    filaCabeza.appendChild(elemento('th', [], 'Vino'))
    cabeza.appendChild(filaCabeza)
    t.appendChild(cabeza)

    const cuerpo = document.createElement('tbody')
    const seccion = (titulo, filas) => {
      if (filas.length === 0) return
      const encabezado = document.createElement('tr')
      const celda = elemento('th', ['seccion-reporte'], titulo)
      celda.colSpan = historia.fechas.length + 2
      encabezado.appendChild(celda)
      cuerpo.appendChild(encabezado)
      filas.forEach((fila) => {
        const tr = document.createElement('tr')
        tr.dataset.persona = fila.persona.id
        tr.appendChild(elemento('td', ['nombre-reporte'], fila.persona.nombre))
        fila.estados.forEach((estado) => {
          const td = elemento('td', ['casilla'], MARCA[estado] ?? '')
          // El estado va en un atributo y no solo en el simbolo: el CSS pinta de
          // ahi, y las pruebas leen de ahi en vez de comparar caracteres.
          td.dataset.estado = estado
          tr.appendChild(td)
        })
        tr.appendChild(elemento('td', ['resumen-reporte'], `${fila.vino} de ${fila.de}`))
        cuerpo.appendChild(tr)
      })
    }
    seccion('Participantes', historia.participantes)
    seccion('Voluntarios', historia.voluntarios)
    t.appendChild(cuerpo)
    return t
  }

  async function lienzoDelReporte() {
    await esperarFuentes()
    const lienzo = document.createElement('canvas')
    const ctx = lienzo.getContext('2d')
    const plano = maquetarReporte({ historia, mes, medirTexto: medidorDesde(ctx) })
    // Densidad 2 para que el texto no se vea borroso al abrirlo en el telefono.
    const densidad = 2
    lienzo.width = plano.ancho * densidad
    lienzo.height = plano.alto * densidad
    pintar(ctx, plano, {}, densidad)
    return lienzo
  }

  function acciones() {
    const caja = elemento('div', ['acciones-reporte'])
    const png = boton('Descargar PNG', async () => {
      png.disabled = true
      try {
        await descargar(await lienzoDelReporte(), `asistencia-${mes}.png`)
      } finally {
        png.disabled = false
      }
    })
    png.dataset.accion = 'descargar-png'
    const csv = boton('Descargar CSV', () => {
      descargarCSV(aCSV(historia), `asistencia-${mes}.csv`)
    })
    csv.dataset.accion = 'descargar-csv'
    caja.append(png, csv)
    return caja
  }

  function dibujar() {
    vaciar(raiz)
    const seccion = elemento('section', ['seccion'])
    seccion.appendChild(elemento('h2', [], 'Reporte de asistencia'))

    const selector = document.createElement('input')
    selector.type = 'month'
    selector.dataset.campo = 'mes'
    selector.value = mes
    selector.addEventListener('change', () => {
      if (!selector.value) return
      mes = selector.value
      cargar()
    })
    const rotulo = elemento('label', ['campo'])
    rotulo.append(elemento('span', ['campo-rotulo'], 'Mes'), selector)
    seccion.appendChild(rotulo)

    if (cargando) {
      seccion.appendChild(elemento('p', ['ayuda'], 'Leyendo las planillas del mes…'))
    } else if (historia.fechas.length === 0) {
      seccion.appendChild(elemento('p', ['ayuda'], 'No hay planillas guardadas de ese mes.'))
    } else {
      const envoltorio = elemento('div', ['tabla-envoltorio'])
      envoltorio.appendChild(tabla())
      seccion.appendChild(envoltorio)
      seccion.appendChild(elemento('p', ['ayuda'],
        `${historia.fechas.length} ${historia.fechas.length === 1 ? 'sábado' : 'sábados'} con planilla. La casilla vacía es "todavía no estaba".`))
      seccion.appendChild(acciones())
    }
    raiz.appendChild(seccion)
  }

  cargar()
  // Cambiar de pantalla mientras se leen cinco archivos dejaba el dibujado
  // apuntando a un contenedor que ya no existe.
  return { destruir: () => { vivo = false } }
}
```

- [ ] **Paso 4: Correr la prueba y verificar que pasa**

Comando: `npx vitest run test/ui/pantalla-reporte.test.js`
Esperado: PASA, 7 pruebas

- [ ] **Paso 5: Estilos**

Agregar al final de `css/estilos.css`:

```css
/* Reporte de asistencia. La tabla puede tener doce columnas de sabados, asi que
   scrollea sola adentro de su caja: la pagina nunca se mueve para el costado,
   que en el telefono es lo que rompe la lectura. */
.tabla-envoltorio { overflow-x: auto; margin: 12px 0; }
.tabla-reporte { border-collapse: collapse; font-size: 15px; }
.tabla-reporte th, .tabla-reporte td { padding: 8px 10px; text-align: left; white-space: nowrap; }
.tabla-reporte th.dia, .tabla-reporte td.casilla { text-align: center; min-width: 34px; }
.tabla-reporte thead th { font-weight: 500; color: var(--texto-suave); border-bottom: 1px solid var(--linea); }
.tabla-reporte .seccion-reporte { padding-top: 16px; font-weight: 500; color: var(--violeta); }
.tabla-reporte tbody tr:nth-child(even) { background: #FBF8FC; }
.tabla-reporte td[data-estado="vino"] { color: var(--turquesa-texto); }
.tabla-reporte td[data-estado="falto"] { color: var(--magenta-texto); }
.tabla-reporte .resumen-reporte { color: var(--texto-suave); font-size: 14px; }
.acciones-reporte { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
```

- [ ] **Paso 6: Commit**

```bash
git add js/ui/pantalla-reporte.js test/ui/pantalla-reporte.test.js css/estilos.css
git commit -m "Pantalla del reporte mensual de asistencia, con las dos descargas"
```

---

## Tarea 8: Pantalla de correcciones

**Archivos:**
- Crear: `js/ui/pantalla-asistencias.js`
- Test: `test/ui/pantalla-asistencias.test.js`

- [ ] **Paso 1: Escribir la prueba que falla**

Crear `test/ui/pantalla-asistencias.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { crearPantallaAsistencias } from '../../js/ui/pantalla-asistencias.js'

const ROSTER = {
  version: 1,
  participantes: [{ id: 'p1', nombre: 'Gaia', grupo: 1, activo: true }],
  voluntarios: [{ id: 'v1', nombre: 'Abi', activo: true }],
}

const LISTA = { fecha: '2026-08-15', ausentes: [],
  grupos: [{ numero: 1, filas: [{ participantes: ['p1'], voluntarios: ['v1'] }], apoyo: [] },
           { numero: 2, filas: [], apoyo: [] }] }

let raiz, deposito, guardado

beforeEach(() => {
  document.body.innerHTML = '<div id="raiz"></div>'
  raiz = document.getElementById('raiz')
  guardado = []
  deposito = {
    listarListas: vi.fn(async () => [{ fecha: '2026-08-15' }, { fecha: '2026-08-08' }]),
    leerLista: vi.fn(async () => LISTA),
    leerAsistencias: vi.fn(async () => null),
    guardarAsistencias: vi.fn(async (mes, datos, descripcion) => { guardado.push({ mes, datos, descripcion }) }),
  }
})

const esperar = () => new Promise((r) => setTimeout(r, 0))

describe('pantalla de asistencias', () => {
  it('ofrece los sabados que tienen planilla, del mas nuevo al mas viejo', async () => {
    crearPantallaAsistencias(raiz, { roster: ROSTER, almacen: deposito })
    await esperar()
    const opciones = [...raiz.querySelectorAll('[data-campo="sabado"] option')].map((o) => o.value)
    expect(opciones).toEqual(['2026-08-15', '2026-08-08'])
  })

  it('muestra a cada uno con su estado derivado', async () => {
    crearPantallaAsistencias(raiz, { roster: ROSTER, almacen: deposito })
    await esperar()
    expect(raiz.querySelector('[data-persona="p1"]').dataset.estado).toBe('vino')
  })

  it('tocar a alguien lo corrige y lo guarda', async () => {
    crearPantallaAsistencias(raiz, { roster: ROSTER, almacen: deposito })
    await esperar()
    raiz.querySelector('[data-persona="p1"]').click()
    await esperar()
    expect(guardado.at(-1).mes).toBe('2026-08')
    expect(guardado.at(-1).datos.correcciones).toEqual([
      expect.objectContaining({ fecha: '2026-08-15', persona: 'p1', vino: false }),
    ])
  })

  it('la descripcion dice que sabado se corrigio', async () => {
    crearPantallaAsistencias(raiz, { roster: ROSTER, almacen: deposito })
    await esperar()
    raiz.querySelector('[data-persona="p1"]').click()
    await esperar()
    expect(guardado.at(-1).descripcion).toContain('2026-08-15')
  })

  it('tocar dos veces borra la correccion en vez de acumular dos', async () => {
    crearPantallaAsistencias(raiz, { roster: ROSTER, almacen: deposito })
    await esperar()
    raiz.querySelector('[data-persona="p1"]').click()
    await esperar()
    raiz.querySelector('[data-persona="p1"]').click()
    await esperar()
    expect(guardado.at(-1).datos.correcciones).toEqual([])
  })

  it('sin planillas guardadas lo dice', async () => {
    deposito.listarListas = vi.fn(async () => [])
    crearPantallaAsistencias(raiz, { roster: ROSTER, almacen: deposito })
    await esperar()
    expect(raiz.textContent).toContain('No hay planillas')
  })
})
```

- [ ] **Paso 2: Correr la prueba y verificar que falla**

Comando: `npx vitest run test/ui/pantalla-asistencias.test.js`
Esperado: FALLA con "Failed to resolve import"

- [ ] **Paso 3: Escribir la implementación**

Crear `js/ui/pantalla-asistencias.js`:

```js
import { elemento, vaciar } from './componentes.js'
import { estadoDeSabado, VINO, FALTO, NO_ESTABA } from '../modelo/asistencia.js'
import { formatearFechaLarga } from '../util/fechas.js'

const mesDe = (fecha) => fecha.slice(0, 7)

// Corregir la asistencia de un sabado que ya paso. La planilla no se toca: ya
// se mando por WhatsApp y reescribirla haria que lo guardado deje de coincidir
// con la imagen que recibio la gente. Lo que se guarda es la diferencia.
export function crearPantallaAsistencias(raiz, { roster, almacen }) {
  let fechas = []
  let fecha = null
  let lista = null
  let correcciones = []
  let cargando = true
  let vivo = true

  async function cargarSabados() {
    fechas = (await almacen.listarListas()).map((l) => l.fecha).sort().reverse()
    fecha = fechas[0] ?? null
    if (!fecha) { cargando = false; dibujar(); return }
    await cargarSabado()
  }

  async function cargarSabado() {
    cargando = true
    dibujar()
    lista = await almacen.leerLista(fecha)
    const archivo = await almacen.leerAsistencias(mesDe(fecha))
    if (!vivo) return
    correcciones = archivo?.correcciones ?? []
    cargando = false
    dibujar()
  }

  function estadoDe(id) {
    const correccion = correcciones.find((c) => c.fecha === fecha && c.persona === id)
    if (correccion) return correccion.vino ? VINO : FALTO
    return estadoDeSabado(lista, roster).get(id) ?? NO_ESTABA
  }

  async function alternar(persona) {
    const derivado = estadoDeSabado(lista, roster).get(persona.id) ?? NO_ESTABA
    const actual = estadoDe(persona.id)
    const siguiente = actual === VINO ? FALTO : VINO
    const resto = correcciones.filter((c) => !(c.fecha === fecha && c.persona === persona.id))
    // Si la correccion coincide con lo que ya dice la planilla, no es una
    // correccion: se borra en vez de guardar una diferencia que no difiere.
    correcciones = siguiente === derivado
      ? resto
      : [...resto, { fecha, persona: persona.id, vino: siguiente === VINO,
          cuando: new Date().toISOString() }]
    const mes = mesDe(fecha)
    await almacen.guardarAsistencias(mes, { version: 1, mes, correcciones },
      `Corregir la asistencia del ${fecha}`)
    dibujar()
  }

  function filaPersona(persona) {
    const estado = estadoDe(persona.id)
    const fila = elemento('button', ['fila-asistencia'])
    fila.type = 'button'
    fila.dataset.persona = persona.id
    fila.dataset.estado = estado
    const marca = estado === VINO ? 'Vino' : estado === FALTO ? 'Faltó' : 'No estaba'
    fila.append(
      elemento('span', ['nombre-asistencia'], persona.nombre),
      elemento('span', ['marca-asistencia'], marca),
    )
    fila.setAttribute('aria-label', `${persona.nombre}: ${marca}. Tocá para cambiarlo.`)
    fila.addEventListener('click', () => alternar(persona))
    return fila
  }

  function dibujar() {
    vaciar(raiz)
    const seccion = elemento('section', ['seccion'])
    seccion.appendChild(elemento('h2', [], 'Asistencia de un sábado'))

    if (fechas.length === 0 && !cargando) {
      seccion.appendChild(elemento('p', ['ayuda'], 'No hay planillas guardadas para corregir.'))
      raiz.appendChild(seccion)
      return
    }

    const selector = document.createElement('select')
    selector.dataset.campo = 'sabado'
    fechas.forEach((f) => {
      const opcion = document.createElement('option')
      opcion.value = f
      opcion.textContent = formatearFechaLarga(f)
      selector.appendChild(opcion)
    })
    selector.value = fecha ?? ''
    selector.addEventListener('change', () => { fecha = selector.value; cargarSabado() })
    const rotulo = elemento('label', ['campo'])
    rotulo.append(elemento('span', ['campo-rotulo'], 'Sábado'), selector)
    seccion.appendChild(rotulo)

    if (cargando) {
      seccion.appendChild(elemento('p', ['ayuda'], 'Leyendo la planilla…'))
      raiz.appendChild(seccion)
      return
    }

    seccion.appendChild(elemento('p', ['ayuda'],
      'Sale de la planilla de ese día. Tocá a quien no coincida con lo que pasó.'))
    const bloque = (titulo, gente) => {
      seccion.appendChild(elemento('h3', ['subtitulo-asistencia'], titulo))
      const columna = elemento('div', ['columna-asistencia'])
      gente.forEach((p) => columna.appendChild(filaPersona(p)))
      seccion.appendChild(columna)
    }
    bloque('Participantes', roster.participantes.filter((p) => p.activo !== false))
    bloque('Voluntarios', roster.voluntarios.filter((v) => v.activo !== false))
    raiz.appendChild(seccion)
  }

  cargarSabados()
  return { destruir: () => { vivo = false } }
}
```

- [ ] **Paso 4: Correr la prueba y verificar que pasa**

Comando: `npx vitest run test/ui/pantalla-asistencias.test.js`
Esperado: PASA, 6 pruebas

- [ ] **Paso 5: Estilos**

Agregar al final de `css/estilos.css`:

```css
/* Corrección de asistencia. Filas anchas y tocables: se usan de a muchas
   seguidas y con el telefono en la mano. */
.columna-asistencia { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.subtitulo-asistencia { font-size: 15px; font-weight: 500; color: var(--texto-suave); margin: 12px 0 8px; }
.fila-asistencia {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 10px 14px;
  border: 1px solid var(--linea);
  border-radius: 12px;
  background: var(--fondo);
  font: inherit;
  font-size: 15px;
  color: var(--texto);
  cursor: pointer;
  text-align: left;
}
.marca-asistencia { font-size: 14px; }
.fila-asistencia[data-estado="vino"] { border-color: var(--turquesa); }
.fila-asistencia[data-estado="vino"] .marca-asistencia { color: var(--turquesa-texto); }
.fila-asistencia[data-estado="falto"] { border-color: var(--magenta); }
.fila-asistencia[data-estado="falto"] .marca-asistencia { color: var(--magenta-texto); }
.fila-asistencia[data-estado="no-estaba"] { opacity: 0.5; }
```

- [ ] **Paso 6: Commit**

```bash
git add js/ui/pantalla-asistencias.js test/ui/pantalla-asistencias.test.js css/estilos.css
git commit -m "Pantalla para corregir la asistencia de un sabado pasado"
```

---

## Tarea 9: La franja de alerta

**Archivos:**
- Crear: `js/ui/franja-alerta.js`
- Test: `test/ui/franja-alerta.test.js`

- [ ] **Paso 1: Escribir la prueba que falla**

Crear `test/ui/franja-alerta.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { crearFranjaAlerta } from '../../js/ui/franja-alerta.js'

const ALERTAS = [
  { persona: { id: 'p1', nombre: 'Gaia' }, faltas: 3 },
  { persona: { id: 'v1', nombre: 'Abi' }, faltas: 4 },
]

let raiz, alSilenciar, alVerElMes

beforeEach(() => {
  document.body.innerHTML = '<div id="raiz"></div>'
  raiz = document.getElementById('raiz')
  alSilenciar = vi.fn(async () => {})
  alVerElMes = vi.fn()
  vi.spyOn(window, 'prompt').mockReturnValue('Hablé con la mamá')
})

describe('franja de alerta', () => {
  it('sin alertas no dibuja nada', () => {
    const franja = crearFranjaAlerta({ alertas: [], alSilenciar, alVerElMes })
    expect(franja).toBeNull()
  })

  it('nombra a cada persona y cuantas falto', () => {
    raiz.appendChild(crearFranjaAlerta({ alertas: ALERTAS, alSilenciar, alVerElMes }))
    expect(raiz.textContent).toContain('Gaia')
    expect(raiz.textContent).toContain('3 sábados seguidos')
    expect(raiz.textContent).toContain('4 sábados seguidos')
  })

  it('anotar el seguimiento avisa con la nota escrita', async () => {
    raiz.appendChild(crearFranjaAlerta({ alertas: ALERTAS, alSilenciar, alVerElMes }))
    raiz.querySelector('[data-accion="silenciar-p1"]').click()
    await new Promise((r) => setTimeout(r, 0))
    expect(alSilenciar).toHaveBeenCalledWith(ALERTAS[0].persona, 'Hablé con la mamá')
  })

  it('cancelar el cuadro de texto no silencia nada', async () => {
    window.prompt.mockReturnValue(null)
    raiz.appendChild(crearFranjaAlerta({ alertas: ALERTAS, alSilenciar, alVerElMes }))
    raiz.querySelector('[data-accion="silenciar-p1"]').click()
    await new Promise((r) => setTimeout(r, 0))
    expect(alSilenciar).not.toHaveBeenCalled()
  })

  it('una nota vacia tampoco silencia', async () => {
    window.prompt.mockReturnValue('   ')
    raiz.appendChild(crearFranjaAlerta({ alertas: ALERTAS, alSilenciar, alVerElMes }))
    raiz.querySelector('[data-accion="silenciar-p1"]').click()
    await new Promise((r) => setTimeout(r, 0))
    expect(alSilenciar).not.toHaveBeenCalled()
  })

  it('ofrece ver el mes', () => {
    raiz.appendChild(crearFranjaAlerta({ alertas: ALERTAS, alSilenciar, alVerElMes }))
    raiz.querySelector('[data-accion="ver-el-mes"]').click()
    expect(alVerElMes).toHaveBeenCalled()
  })
})
```

- [ ] **Paso 2: Correr la prueba y verificar que falla**

Comando: `npx vitest run test/ui/franja-alerta.test.js`
Esperado: FALLA con "Failed to resolve import"

- [ ] **Paso 3: Escribir la implementación**

Crear `js/ui/franja-alerta.js`:

```js
import { elemento, boton } from './componentes.js'

// Aviso de tres faltas seguidas, arriba de todo en Armar lista. Vive aparte de
// pantalla-lista.js, que ya tiene su propio trabajo y no necesita mas.
//
// Devuelve null cuando no hay nada que avisar: quien la usa hace
// `if (franja) raiz.appendChild(franja)` y no tiene que saber contar.
export function crearFranjaAlerta({ alertas, alSilenciar, alVerElMes }) {
  if (!alertas || alertas.length === 0) return null

  const caja = elemento('section', ['franja-alerta'])
  caja.setAttribute('role', 'status')
  caja.appendChild(elemento('h2', ['franja-alerta-titulo'],
    alertas.length === 1 ? 'Alguien viene faltando' : 'Hay quienes vienen faltando'))

  alertas.forEach(({ persona, faltas }) => {
    const fila = elemento('div', ['alerta-persona'])
    fila.appendChild(elemento('span', ['alerta-texto'],
      `${persona.nombre} faltó ${faltas} sábados seguidos`))
    const anotar = boton('Anotar y silenciar', async () => {
      // El texto es obligatorio a proposito: silenciar sin decir por que deja a
      // la siguiente coordinadora sin saber si alguien se ocupo del tema.
      const nota = window.prompt(`¿Qué anotás sobre ${persona.nombre}?`)
      if (nota === null || nota.trim() === '') return
      await alSilenciar(persona, nota.trim())
    })
    anotar.dataset.accion = `silenciar-${persona.id}`
    fila.appendChild(anotar)
    caja.appendChild(fila)
  })

  const ver = boton('Ver el mes', () => alVerElMes())
  ver.dataset.accion = 'ver-el-mes'
  caja.appendChild(ver)
  return caja
}
```

- [ ] **Paso 4: Correr la prueba y verificar que pasa**

Comando: `npx vitest run test/ui/franja-alerta.test.js`
Esperado: PASA, 6 pruebas

- [ ] **Paso 5: Estilos**

Agregar al final de `css/estilos.css`:

```css
/* Aviso de faltas. Turquesa y no rojo: no es un error de la aplicacion ni una
   urgencia, es algo que alguien tiene que mirar cuando pueda. */
.franja-alerta {
  margin: 12px 16px 0;
  padding: 12px 14px;
  border: 1px solid var(--turquesa);
  border-left: 3px solid var(--turquesa);
  border-radius: 4px 12px 12px 4px;
  background: #F1FAF8;
}
.franja-alerta-titulo { margin: 0 0 8px; font-size: 15px; font-weight: 500; color: var(--turquesa-texto); }
.alerta-persona { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
.alerta-texto { font-size: 15px; }
.franja-alerta .boton { padding: 8px 14px; font-size: 14px; min-height: 40px; }
```

- [ ] **Paso 6: Commit**

```bash
git add js/ui/franja-alerta.js test/ui/franja-alerta.test.js css/estilos.css
git commit -m "Franja de aviso de faltas seguidas, con nota de seguimiento"
```

---

## Tarea 10: Cablear todo en la aplicación

**Archivos:**
- Modificar: `js/app.js`
- Modificar: `js/ui/pantalla-lista.js`
- Test: `test/ui/pantalla-lista.test.js`

- [ ] **Paso 1: Escribir la prueba que falla**

Agregar a `test/ui/pantalla-lista.test.js` un `describe` nuevo al final:

```js
describe('franja de alerta en armar lista', () => {
  it('sin franja la pantalla se dibuja igual', () => {
    expect(raiz.querySelector('.franja-alerta')).toBeNull()
    expect(raiz.querySelectorAll('.grupo')).toHaveLength(2)
  })

  it('la franja que recibe va arriba de todo, antes de los grupos', () => {
    document.body.innerHTML = '<div id="raiz"></div>'
    const otra = document.getElementById('raiz')
    const franja = document.createElement('section')
    franja.className = 'franja-alerta'
    crearPantallaLista(otra, {
      lista: crearLista('2026-08-08', ROSTER),
      roster: ROSTER,
      alCambiar: () => {},
      franja,
    })
    const dibujada = otra.querySelector('.franja-alerta')
    expect(dibujada).not.toBeNull()
    // Antes de los grupos: si aparece abajo, en el telefono nadie la ve.
    expect(dibujada.compareDocumentPosition(otra.querySelector('.grupos')))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })
})
```

- [ ] **Paso 2: Correr la prueba y verificar que falla**

Comando: `npx vitest run test/ui/pantalla-lista.test.js`
Esperado: FALLA, `dibujada` es null

- [ ] **Paso 3: Aceptar la franja en pantalla-lista**

En `js/ui/pantalla-lista.js`, cambiar la firma de la función principal para que acepte `franja` y usarla en `dibujar()`. La firma actual es `crearPantallaLista(raiz, { lista, roster, alCambiar, alCambiarFecha })`; agregar `franja = null`. Dentro de `dibujar()`, justo después de `raiz.appendChild(encabezado())` y antes de `raiz.appendChild(barra())`:

```js
    // La franja de faltas la arma app.js, que es quien puede leer los sabados
    // anteriores. Aca solo se le da su lugar, arriba de todo.
    if (franja) raiz.appendChild(franja)
```

- [ ] **Paso 4: Correr la prueba y verificar que pasa**

Comando: `npx vitest run test/ui/pantalla-lista.test.js`
Esperado: PASA

- [ ] **Paso 5: Cablear en app.js**

En `js/app.js`, agregar los imports:

```js
import { crearPantallaReporte } from './ui/pantalla-reporte.js'
import { crearPantallaAsistencias } from './ui/pantalla-asistencias.js'
import { crearFranjaAlerta } from './ui/franja-alerta.js'
import { historial, rachasDeFalta, UMBRAL_ALERTA } from './modelo/asistencia.js'
```

Agregar, junto a las otras variables de estado del módulo:

```js
// Las alertas se calculan una vez por sesion: leer los ultimos sabados en cada
// redibujado seria una llamada a GitHub por cada toque en la pantalla.
let alertas = []
```

Agregar la función que las calcula, antes de `dibujar()`:

```js
// Mira solo los ultimos sabados que hagan falta para decidir una racha. No es
// una optimizacion prematura: cada sabado es un archivo aparte, y leer el año
// entero al abrir la aplicacion un viernes a la noche se nota.
const SABADOS_A_MIRAR = UMBRAL_ALERTA + 1

async function calcularAlertas() {
  try {
    const fechas = (await deposito.listarListas()).map((l) => l.fecha).sort().slice(-SABADOS_A_MIRAR)
    if (fechas.length < UMBRAL_ALERTA) return []
    const listas = (await Promise.all(fechas.map((f) => deposito.leerLista(f)))).filter(Boolean)
    const meses = [...new Set(fechas.map((f) => f.slice(0, 7)))]
    const archivos = await Promise.all(meses.map((m) => deposito.leerAsistencias(m)))
    const correcciones = archivos.flatMap((a) => a?.correcciones ?? [])
    const guardados = await deposito.leerSeguimientos()
    return rachasDeFalta(historial(listas, roster, correcciones), guardados?.seguimientos ?? [])
  } catch {
    // Un aviso que no se pudo calcular no puede impedir armar la planilla, que
    // es para lo que se abre la aplicacion.
    return []
  }
}

async function anotarSeguimiento(persona, nota) {
  const guardados = (await deposito.leerSeguimientos())?.seguimientos ?? []
  const seguimientos = [...guardados, {
    persona: persona.id,
    desde: lista.fecha,
    nota,
    quien: sesion?.nombre ?? 'sin registrar',
    cuando: new Date().toISOString(),
  }]
  await deposito.guardarSeguimientos({ version: 1, seguimientos },
    `Anotar un seguimiento de ${persona.nombre}`)
  alertas = await calcularAlertas()
  dibujar()
}
```

En `navegacion()`, agregar los dos destinos después de `ir('personas', 'Personas')`:

```js
  nav.appendChild(ir('reporte', 'Reporte'))
  nav.appendChild(ir('asistencias', 'Asistencias'))
```

En `dibujar()`, dentro de la rama `pantalla === 'lista'`, agregar al objeto de opciones de `crearPantallaLista`:

```js
      franja: crearFranjaAlerta({
        alertas,
        alSilenciar: anotarSeguimiento,
        alVerElMes: () => { pantalla = 'reporte'; dibujar() },
      }),
```

Agregar las dos ramas nuevas antes del `else` final:

```js
  } else if (pantalla === 'reporte') {
    vista = crearPantallaReporte(cuerpo, {
      roster,
      almacen: deposito,
      mes: lista.fecha.slice(0, 7),
    })
  } else if (pantalla === 'asistencias') {
    vista = crearPantallaAsistencias(cuerpo, { roster, almacen: deposito })
```

En `abrirAplicacion()`, después de `dibujar()`, agregar:

```js
    // Despues de dibujar y sin await en el camino critico: la planilla tiene que
    // aparecer ya, y el aviso se suma cuando este listo.
    calcularAlertas().then((nuevas) => {
      if (nuevas.length === 0) return
      alertas = nuevas
      if (pantalla === 'lista') dibujar()
    })
```

- [ ] **Paso 6: Correr la suite entera**

Comando: `npx vitest run`
Esperado: PASA, sin regresiones

- [ ] **Paso 7: Verificar en el navegador**

```bash
cd /Users/ale/Documents/VoluntariosFSB && ./herramientas/sellar.sh && python3 -m http.server 8992
```

Abrir `http://localhost:8992`, entrar con "Seguir sin ingresar", y comprobar a mano:

1. Personas: dar de alta 2 participantes y 2 voluntarios.
2. Armar lista: asignar a uno, marcar al otro "Hoy no viene". Cambiar la fecha a tres sábados distintos y repetir la falta del mismo participante en los tres.
3. Volver al sábado más nuevo: **tiene que aparecer la franja turquesa** nombrando a quien faltó tres veces.
4. Tocar "Anotar y silenciar", escribir cualquier cosa: la franja desaparece.
5. Reporte: la tabla muestra las tres columnas, y los dos botones descargan un PNG legible y un CSV que abre bien en una planilla de cálculo.
6. Asistencias: elegir un sábado, tocar a alguien, volver al Reporte y confirmar que la casilla cambió.

- [ ] **Paso 8: Commit**

```bash
git add js/app.js js/ui/pantalla-lista.js test/ui/pantalla-lista.test.js version.js version.json sw.js
git commit -m "Cablear el reporte, las correcciones y el aviso de faltas"
```

---

## Tarea 11: Publicar

- [ ] **Paso 1: Sellar la versión**

```bash
cd /Users/ale/Documents/VoluntariosFSB && ./herramientas/sellar.sh
```

- [ ] **Paso 2: Correr la suite entera una última vez**

Comando: `npx vitest run`
Esperado: PASA

- [ ] **Paso 3: Auditar los guiones largos**

```bash
~/.corvus-tools/git-tools/audit-emdash.sh /Users/ale/Documents/VoluntariosFSB
```
Esperado: "no em-dashes found"

- [ ] **Paso 4: Commit y push**

```bash
git add -u && git commit -m "Sellar la version con asistencias y reporte" && git push origin main
```

Si el push se rechaza, NO forzar ni resetear: la aplicación escribe commits desde el teléfono. Hacer `git fetch origin`, mirar `git log HEAD..origin/main`, y fusionar si no se pisa nada.

- [ ] **Paso 5: Confirmar que Pages sirve la versión nueva**

```bash
curl -s "https://corvusdevs.github.io/VoluntariosFSB/version.json?v=$RANDOM"
```
Esperado: el mismo sello que quedó en `version.json` local.

---

## Revisión del plan contra la especificación

| Sección de la especificación | Tarea que la implementa |
|---|---|
| 4. De dónde sale la asistencia | Tarea 1 |
| 4.1 Desde cuándo cuenta cada persona | Tarea 2 (recorte del arranque del voluntario) |
| 4.2 Quién queda afuera | Tarea 3 (`activo === false` no genera alerta) |
| 5. Correcciones, archivo y formato | Tarea 4 (almacén) y Tarea 8 (pantalla) |
| 6. Reporte en pantalla | Tarea 7 |
| 6.1 Descarga PNG | Tarea 6 y Tarea 7 |
| 6.1 Descarga CSV | Tarea 5 y Tarea 7 |
| 7.1 Cómo se cuenta la racha | Tarea 3 |
| 7.2 Anotar y silenciar, ver el mes | Tarea 9 y Tarea 10 |
| 8. Permisos, los dos roles | Tarea 10 (destinos sin guardia de `esAdmin`) |
| 9. Costo, leer solo los últimos sábados | Tarea 10 (`SABADOS_A_MIRAR`) |
