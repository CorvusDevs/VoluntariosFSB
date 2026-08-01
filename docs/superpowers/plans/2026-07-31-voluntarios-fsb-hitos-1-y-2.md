# VoluntariosFSB, plan de implementación (hitos 1 y 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el generador de imagen de Fútbol sin Barreras y la interfaz para armar la asignación semanal, funcionando por completo en el navegador con datos locales, antes de agregar acceso y sincronización con GitHub.

**Architecture:** Módulos ES nativos, sin paso de compilación para lo que se publica. La imagen se produce en dos etapas separadas: una función pura que convierte la lista en una lista de órdenes de dibujo (`maquetar`), y un pintor tonto que ejecuta esas órdenes sobre un `<canvas>` (`pintar`). Esa separación es lo que permite probar toda la geometría sin un canvas real, y es también lo que garantiza que la vista previa y el archivo descargado sean el mismo dibujo. El almacenamiento vive detrás de una interfaz de ocho funciones para poder cambiar el respaldo sin tocar la interfaz.

**Tech Stack:** HTML, CSS y JavaScript con módulos nativos. Vitest para pruebas unitarias y Playwright para humo de extremo a extremo, ambos **solo como dependencias de desarrollo**: nada de eso se publica ni se ejecuta en el navegador de la usuaria. Fuente Poppins autoalojada. Sin frameworks, sin empaquetador.

**Referencia:** `docs/superpowers/specs/2026-07-31-voluntarios-fsb-design.md`

---

## Alcance de este plan

| Hito | Contenido | Resultado utilizable |
| --- | --- | --- |
| 1 (tareas 1 a 7) | Generador de imagen | Una página de demostración que produce el PNG real a partir de datos de ejemplo |
| 2 (tareas 8 a 14) | Armado de listas y personas, datos en el navegador | La aplicación completa usable por una persona en un dispositivo |
| 3 (siguiente plan) | Acceso, coordinadoras, sincronización con GitHub | Varias coordinadoras, datos en el repositorio privado |
| 4 (siguiente plan) | Historial, avisos de rotación, pulido y publicación | Producto terminado |

Los hitos 3 y 4 se planifican en un documento aparte, después de que el hito 1 esté a la vista. La razón es concreta: en cuanto se vea el PNG real es muy probable que cambien decisiones de composición, y planificar en detalle una interfaz construida sobre esas decisiones antes de verlas sería trabajo tirado.

## Estructura de archivos

```
index.html                     Cáscara de la aplicación
demo.html                      Página de demostración del hito 1, se borra en el hito 2
css/estilos.css                Estilos de la interfaz (no de la imagen)
js/app.js                      Arranque y navegación entre pantallas
js/util/fechas.js              Fechas y horas en español rioplatense
js/util/nombres.js             Iniciales, ordenamiento y búsqueda sin acentos
js/modelo/roster.js            Participantes y voluntarios, altas y bajas
js/modelo/lista.js             Filas de una lista, emparejar y desemparejar
js/modelo/deshacer.js          Pila de estados
js/imagen/tema.js              Colores, tipografías y medidas de la imagen
js/imagen/maquetar.js          Lista y roster -> órdenes de dibujo (función pura)
js/imagen/pintar.js            Órdenes de dibujo -> canvas
js/imagen/exportar.js          PNG, nombre de archivo y compartir
js/almacen/indice.js           Las ocho funciones de almacenamiento
js/almacen/local.js            Respaldo en IndexedDB
js/ui/pantalla-lista.js        Armar lista
js/ui/pantalla-vista-previa.js Vista previa y descarga
js/ui/pantalla-personas.js     Alta y edición de personas
js/ui/componentes.js           Fichas, botones, diálogos
assets/                        Logo y fuentes
test/                          Pruebas, misma estructura que js/
```

Cada archivo tiene una sola responsabilidad. `maquetar.js` no sabe qué es un canvas y `pintar.js` no sabe qué es un voluntario.

---

# Hito 1: el generador de imagen

## Task 1: Andamiaje del proyecto y arnés de pruebas

**Files:**
- Create: `package.json`, `.gitignore`, `vitest.config.js`, `index.html`, `css/estilos.css`
- Create: `assets/` con la fuente y el logo

- [ ] **Step 1: Crear `.gitignore`**

```
node_modules/
.DS_Store
test-results/
playwright-report/
*.png.tmp
```

- [ ] **Step 2: Crear `package.json`**

Las dependencias son exclusivamente de desarrollo. El sitio publicado no carga nada de `node_modules`.

```json
{
  "name": "voluntarios-fsb",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Armado de asignaciones semanales de Futbol sin Barreras (Aletea)",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "servir": "python3 -m http.server 8765"
  },
  "devDependencies": {
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 3: Crear `vitest.config.js`**

Entorno `node` a propósito: Node 20 y superiores traen `crypto.subtle` y `structuredClone`, que es todo lo que necesitan las pruebas de este hito. Nada aquí depende del DOM.

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
  },
})
```

- [ ] **Step 4: Instalar y verificar que el arnés corre**

Run: `npm install && npx vitest run`
Expected: termina sin error, con "No test files found" o equivalente. Si `npm install` falla, verificar `node --version`, se requiere 20 o superior.

- [ ] **Step 5: Descargar la fuente Poppins y vendorizarla**

```bash
mkdir -p assets/fuentes
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
curl -s -H "User-Agent: $UA" \
  "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500&display=swap" \
  | grep -oE "https://fonts.gstatic.com[^)]+\.woff2"
```

Ese comando imprime varias URL, una por subconjunto de caracteres. Descargar la del subconjunto `latin` de cada peso:

```bash
curl -sL -o assets/fuentes/poppins-400.woff2 "<url del peso 400, subconjunto latin>"
curl -sL -o assets/fuentes/poppins-500.woff2 "<url del peso 500, subconjunto latin>"
ls -la assets/fuentes/
```

Expected: dos archivos de entre 10 y 30 KB cada uno. Poppins está bajo licencia SIL Open Font License, que permite el uso y la redistribución.

- [ ] **Step 6: Guardar la licencia de la fuente**

```bash
curl -sL -o assets/fuentes/LICENCIA-POPPINS.txt \
  "https://raw.githubusercontent.com/itfoundry/Poppins/master/OFL.txt"
head -3 assets/fuentes/LICENCIA-POPPINS.txt
```

Expected: el texto empieza con la referencia a la SIL Open Font License. Si la URL falla, buscar el OFL.txt vigente del repositorio de Poppins; el archivo de licencia es obligatorio, no opcional.

- [ ] **Step 7: Copiar el logo de Aletea al repositorio**

```bash
mkdir -p assets
curl -sL -o assets/logo-aletea.png \
  "https://aletea.org/wp/wp-content/uploads/2023/10/logo-blanco-con-fondo-transparente-alta-calidad-1-1024x386.png"
file assets/logo-aletea.png
```

Expected: `PNG image data, 1024 x 386`. Es la variante blanca, que es la que va sobre la banda violeta.

- [ ] **Step 8: Crear `index.html` mínimo**

```html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Voluntarios FSB</title>
<link rel="stylesheet" href="css/estilos.css">
</head>
<body>
<main id="app"></main>
<script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 9: Crear `css/estilos.css` con la fuente y las variables**

```css
@font-face {
  font-family: 'Poppins';
  font-weight: 400;
  font-display: swap;
  src: url('../assets/fuentes/poppins-400.woff2') format('woff2');
}
@font-face {
  font-family: 'Poppins';
  font-weight: 500;
  font-display: swap;
  src: url('../assets/fuentes/poppins-500.woff2') format('woff2');
}
:root {
  --violeta: #662D7D;
  --magenta: #E9287F;
  --turquesa: #5DCCC6;
  --magenta-texto: #C11E6B;
  --turquesa-texto: #0F6E56;
  --texto: #2C2C2A;
  --texto-suave: #5F5E5A;
  --linea: #EFEBF1;
  --fondo: #FFFFFF;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: 'Poppins', system-ui, sans-serif;
  color: var(--texto);
  background: var(--fondo);
}
```

- [ ] **Step 10: Crear `js/app.js` provisorio**

```js
document.getElementById('app').textContent = 'Voluntarios FSB'
```

- [ ] **Step 11: Verificar que la página carga y que la fuente se aplica**

Run: `npm run servir` y abrir `http://localhost:8765/`
Expected: se ve "Voluntarios FSB" en Poppins, no en la fuente del sistema. Confirmar en las herramientas de desarrollo, pestaña Red, que `poppins-400.woff2` se descargó con código 200.

- [ ] **Step 12: Commit**

```bash
git add package.json .gitignore vitest.config.js index.html css/estilos.css js/app.js assets/
git commit -m "Andamiaje del proyecto, fuente Poppins y logo"
```

---

## Task 2: Fechas y horas en español

La fecha del encabezado de la imagen dice "Sábado 8 de agosto". No se usa `Intl.DateTimeFormat` porque su salida cambia según la versión de ICU del navegador, tanto en el uso de mayúsculas como en la puntuación, y esa cadena va impresa en una imagen que se comparte. Una tabla escrita a mano es determinista y verificable.

**Files:**
- Create: `js/util/fechas.js`
- Test: `test/util/fechas.test.js`

- [ ] **Step 1: Escribir la prueba que falla**

```js
import { describe, it, expect } from 'vitest'
import { formatearFechaLarga, formatearFechaCorta, hoyISO } from '../../js/util/fechas.js'

describe('formatearFechaLarga', () => {
  it('devuelve el dia de la semana capitalizado y el mes en minuscula', () => {
    expect(formatearFechaLarga('2026-08-08')).toBe('Sábado 8 de agosto')
  })

  it('no se corre un dia por la zona horaria', () => {
    expect(formatearFechaLarga('2026-01-01')).toBe('Jueves 1 de enero')
    expect(formatearFechaLarga('2026-12-31')).toBe('Jueves 31 de diciembre')
  })

  it('cubre los siete dias de la semana', () => {
    const dias = ['2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05',
                  '2026-08-06', '2026-08-07', '2026-08-08']
    const esperados = ['Domingo', 'Lunes', 'Martes', 'Miércoles',
                       'Jueves', 'Viernes', 'Sábado']
    dias.forEach((f, i) => {
      expect(formatearFechaLarga(f).split(' ')[0]).toBe(esperados[i])
    })
  })

  it('rechaza una fecha con formato invalido', () => {
    expect(() => formatearFechaLarga('08/08/2026')).toThrow()
    expect(() => formatearFechaLarga('')).toThrow()
  })
})

describe('formatearFechaCorta', () => {
  it('devuelve dia y mes numericos', () => {
    expect(formatearFechaCorta('2026-08-08')).toBe('8/8/2026')
  })
})

describe('hoyISO', () => {
  it('devuelve una cadena AAAA-MM-DD', () => {
    expect(hoyISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
```

- [ ] **Step 2: Correr la prueba para verificar que falla**

Run: `npx vitest run test/util/fechas.test.js`
Expected: FAIL, "Failed to resolve import ... js/util/fechas.js"

- [ ] **Step 3: Escribir la implementación mínima**

```js
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
               'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre']

function partes(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new Error(`Fecha invalida: ${iso}. Se espera AAAA-MM-DD.`)
  }
  const [a, m, d] = iso.split('-').map(Number)
  const fecha = new Date(Date.UTC(a, m - 1, d))
  if (fecha.getUTCFullYear() !== a || fecha.getUTCMonth() !== m - 1 || fecha.getUTCDate() !== d) {
    throw new Error(`Fecha inexistente: ${iso}`)
  }
  return { anio: a, mes: m, dia: d, diaSemana: fecha.getUTCDay() }
}

export function formatearFechaLarga(iso) {
  const { mes, dia, diaSemana } = partes(iso)
  return `${DIAS[diaSemana]} ${dia} de ${MESES[mes - 1]}`
}

export function formatearFechaCorta(iso) {
  const { anio, mes, dia } = partes(iso)
  return `${dia}/${mes}/${anio}`
}

export function hoyISO() {
  const ahora = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${ahora.getFullYear()}-${p(ahora.getMonth() + 1)}-${p(ahora.getDate())}`
}
```

`Date.UTC` es deliberado. Construir la fecha con `new Date('2026-08-08')` la interpreta como medianoche UTC y luego `getDay()` la convierte a la zona local, lo que en Montevideo, que está en UTC menos 3, devuelve el día anterior. Es el error clásico de esta función y la tercera prueba existe para atraparlo.

"Setiembre" sin p es la forma habitual en Uruguay. Si la coordinación prefiere "septiembre", se cambia una sola cadena.

- [ ] **Step 4: Correr las pruebas**

Run: `npx vitest run test/util/fechas.test.js`
Expected: PASS, 6 pruebas.

- [ ] **Step 5: Commit**

```bash
git add js/util/fechas.js test/util/fechas.test.js
git commit -m "Fechas en español sin corrimiento por zona horaria"
```

---

## Task 3: Tema de la imagen con contraste verificado

La especificación exige que los colores de texto sobre fondo claro cumplan contraste AA. En vez de confiar en el ojo, el módulo trae la fórmula de contraste de WCAG y una prueba la ejerce sobre cada par que la imagen realmente usa. Si alguien cambia un color, la prueba avisa.

**Files:**
- Create: `js/imagen/tema.js`
- Test: `test/imagen/tema.test.js`

- [ ] **Step 1: Escribir la prueba que falla**

```js
import { describe, it, expect } from 'vitest'
import { COLORES, ANCHO, medidas, contraste } from '../../js/imagen/tema.js'

describe('contraste', () => {
  it('calcula los extremos conocidos', () => {
    expect(contraste('#000000', '#FFFFFF')).toBeCloseTo(21, 1)
    expect(contraste('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 2)
  })

  it('es simetrico', () => {
    expect(contraste('#662D7D', '#FFFFFF')).toBeCloseTo(contraste('#FFFFFF', '#662D7D'), 5)
  })
})

describe('paleta', () => {
  const paresDeTexto = [
    ['texto sobre fondo', COLORES.texto, COLORES.fondo],
    ['texto suave sobre fondo', COLORES.textoSuave, COLORES.fondo],
    ['violeta sobre fondo', COLORES.violeta, COLORES.fondo],
    ['magenta de texto sobre fondo', COLORES.magentaTexto, COLORES.fondo],
    ['turquesa de texto sobre fondo', COLORES.turquesaTexto, COLORES.fondo],
    ['blanco sobre violeta', COLORES.blanco, COLORES.violeta],
    ['turquesa de texto sobre turquesa tenue', COLORES.turquesaTexto, COLORES.turquesaTenue],
    ['magenta de texto sobre magenta tenue', COLORES.magentaTexto, COLORES.magentaTenue],
    ['violeta sobre violeta tenue', COLORES.violeta, COLORES.violetaTenue],
  ]

  paresDeTexto.forEach(([nombre, frente, fondo]) => {
    it(`${nombre} cumple AA`, () => {
      expect(contraste(frente, fondo)).toBeGreaterThanOrEqual(4.5)
    })
  })

  it('conserva los colores oficiales del logotipo sin alterar', () => {
    expect(COLORES.violeta).toBe('#662D7D')
    expect(COLORES.magenta).toBe('#E9287F')
    expect(COLORES.turquesa).toBe('#5DCCC6')
  })
})

describe('medidas', () => {
  it('el ancho de salida es 1080', () => {
    expect(ANCHO).toBe(1080)
  })

  it('el modo compacto tiene filas mas bajas que el normal', () => {
    expect(medidas(true).altoFila).toBeLessThan(medidas(false).altoFila)
  })

  it('el modo compacto no dibuja fotos', () => {
    expect(medidas(true).mostrarFotos).toBe(false)
  })
})
```

- [ ] **Step 2: Correr la prueba para verificar que falla**

Run: `npx vitest run test/imagen/tema.test.js`
Expected: FAIL, no se resuelve el import.

- [ ] **Step 3: Escribir la implementación**

```js
export const ANCHO = 1080

export const COLORES = {
  violeta: '#662D7D',
  magenta: '#E9287F',
  turquesa: '#5DCCC6',
  magentaTexto: '#C11E6B',
  turquesaTexto: '#0F6E56',
  violetaTenue: '#F3E9F7',
  magentaTenue: '#FBEAF0',
  turquesaTenue: '#E4F7F5',
  violetaClaro: '#D7B9E4',
  texto: '#2C2C2A',
  textoSuave: '#5F5E5A',
  linea: '#EFEBF1',
  fondo: '#FFFFFF',
  blanco: '#FFFFFF',
}

export const FUENTES = {
  titulo: (px) => `500 ${px}px Poppins, sans-serif`,
  normal: (px) => `400 ${px}px Poppins, sans-serif`,
}

const NORMAL = {
  mostrarFotos: true,
  margen: 56,
  altoBandaSuperior: 210,
  altoBandaInferior: 72,
  altoFila: 96,
  avatar: 64,
  altoTituloGrupo: 76,
  espacioEntreGrupos: 44,
  pxNombre: 34,
  pxVoluntario: 32,
  pxTituloGrupo: 28,
  pxParrafo: 28,
  pxBanda: 24,
  pxTitular: 52,
}

const COMPACTO = {
  ...NORMAL,
  mostrarFotos: false,
  margen: 44,
  altoBandaSuperior: 150,
  altoBandaInferior: 56,
  altoFila: 64,
  avatar: 0,
  altoTituloGrupo: 60,
  espacioEntreGrupos: 28,
  pxNombre: 30,
  pxVoluntario: 28,
  pxTitular: 42,
}

export function medidas(compacto) {
  return compacto ? COMPACTO : NORMAL
}

function aLineal(canal) {
  const c = canal / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function luminancia(hex) {
  const limpio = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(limpio)) {
    throw new Error(`Color invalido: ${hex}. Se espera #RRGGBB.`)
  }
  const r = parseInt(limpio.slice(0, 2), 16)
  const g = parseInt(limpio.slice(2, 4), 16)
  const b = parseInt(limpio.slice(4, 6), 16)
  return 0.2126 * aLineal(r) + 0.7152 * aLineal(g) + 0.0722 * aLineal(b)
}

export function contraste(colorA, colorB) {
  const a = luminancia(colorA)
  const b = luminancia(colorB)
  const claro = Math.max(a, b)
  const oscuro = Math.min(a, b)
  return (claro + 0.05) / (oscuro + 0.05)
}
```

- [ ] **Step 4: Correr las pruebas**

Run: `npx vitest run test/imagen/tema.test.js`
Expected: PASS. Si algún par falla el umbral de 4,5, **oscurecer el color de texto, nunca bajar el umbral ni tocar los tres colores oficiales del logotipo**, que están congelados por su propia prueba.

- [ ] **Step 5: Commit**

```bash
git add js/imagen/tema.js test/imagen/tema.test.js
git commit -m "Tema de la imagen con contraste AA verificado por prueba"
```

---

## Task 4: Iniciales y normalización de nombres

**Files:**
- Create: `js/util/nombres.js`
- Test: `test/util/nombres.test.js`

- [ ] **Step 1: Escribir la prueba que falla**

```js
import { describe, it, expect } from 'vitest'
import { iniciales, sinAcentos, coincide, ordenarPorNombre } from '../../js/util/nombres.js'

describe('iniciales', () => {
  it('toma las dos primeras letras de un nombre simple', () => {
    expect(iniciales('Gonzalo')).toBe('GO')
  })

  it('toma la inicial de cada palabra cuando hay dos', () => {
    expect(iniciales('Francisco Paiva')).toBe('FP')
  })

  it('ignora palabras vacias por espacios de mas', () => {
    expect(iniciales('  Ana   Lucia  ')).toBe('AL')
  })

  it('conserva el acento en la letra', () => {
    expect(iniciales('Ángel')).toBe('ÁN')
  })

  it('devuelve cadena vacia si no hay nombre', () => {
    expect(iniciales('')).toBe('')
    expect(iniciales(null)).toBe('')
  })
})

describe('sinAcentos', () => {
  it('quita tildes y pasa a minuscula', () => {
    expect(sinAcentos('Ángel')).toBe('angel')
    expect(sinAcentos('ROCÍO')).toBe('rocio')
    expect(sinAcentos('Julián')).toBe('julian')
  })

  it('conserva la enie como letra propia', () => {
    expect(sinAcentos('Begoña')).toBe('begoña')
  })
})

describe('coincide', () => {
  it('busca sin importar acentos ni mayusculas', () => {
    expect(coincide('Rocío', 'roci')).toBe(true)
    expect(coincide('Rocío', 'ROCIO')).toBe(true)
    expect(coincide('Rocío', 'xyz')).toBe(false)
  })

  it('una busqueda vacia coincide con todo', () => {
    expect(coincide('Rocío', '')).toBe(true)
  })
})

describe('ordenarPorNombre', () => {
  it('ordena alfabeticamente ignorando acentos', () => {
    const gente = [{ nombre: 'Rocío' }, { nombre: 'Ángel' }, { nombre: 'Beto' }]
    expect(ordenarPorNombre(gente).map((p) => p.nombre)).toEqual(['Ángel', 'Beto', 'Rocío'])
  })

  it('no modifica el arreglo original', () => {
    const gente = [{ nombre: 'Rocío' }, { nombre: 'Ángel' }]
    ordenarPorNombre(gente)
    expect(gente[0].nombre).toBe('Rocío')
  })
})
```

- [ ] **Step 2: Correr la prueba para verificar que falla**

Run: `npx vitest run test/util/nombres.test.js`
Expected: FAIL, no se resuelve el import.

- [ ] **Step 3: Escribir la implementación**

```js
export function iniciales(nombre) {
  if (!nombre || typeof nombre !== 'string') return ''
  const palabras = nombre.trim().split(/\s+/).filter(Boolean)
  if (palabras.length === 0) return ''
  if (palabras.length === 1) {
    return palabras[0].slice(0, 2).toUpperCase()
  }
  return (palabras[0][0] + palabras[1][0]).toUpperCase()
}

export function sinAcentos(texto) {
  if (!texto) return ''
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, (marca, i, cadena) => {
      const base = cadena[i - 1]
      return (base === 'n' || base === 'N') && marca === '̃' ? marca : ''
    })
    .normalize('NFC')
    .toLowerCase()
}

export function coincide(nombre, busqueda) {
  if (!busqueda) return true
  return sinAcentos(nombre).includes(sinAcentos(busqueda))
}

export function ordenarPorNombre(gente) {
  return [...gente].sort((a, b) => sinAcentos(a.nombre).localeCompare(sinAcentos(b.nombre), 'es'))
}
```

La eñe se preserva a propósito. La descomposición NFD separa la tilde de la ene igual que separa el acento de la a, pero en español la eñe es una letra distinta y "Begona" no es "Begoña". El reemplazo mira la letra base antes de descartar la marca y conserva la tilde solo cuando la base es una ene.

- [ ] **Step 4: Correr las pruebas**

Run: `npx vitest run test/util/nombres.test.js`
Expected: PASS, 11 pruebas.

- [ ] **Step 5: Commit**

```bash
git add js/util/nombres.js test/util/nombres.test.js
git commit -m "Iniciales y busqueda de nombres sin acentos, conservando la eñe"
```

---

## Task 5: Maquetación pura, encabezado y filas

Esta es la pieza central del hito. `maquetar` recibe la lista, el roster y las opciones, y devuelve un objeto con el alto total y un arreglo plano de órdenes de dibujo. No toca el DOM ni un canvas.

Para medir texto hace falta una función de medición, que en producción viene del canvas y en las pruebas es una falsa determinista. Se recibe por parámetro. Ese es el truco que hace comprobable toda la geometría.

**Files:**
- Create: `js/imagen/maquetar.js`
- Test: `test/imagen/maquetar.test.js`
- Test: `test/ayudas/datos.js`

- [ ] **Step 1: Crear los datos de ejemplo compartidos**

Archivo `test/ayudas/datos.js`. Reproduce una lista real tomada de los mensajes de WhatsApp existentes, incluidos los tres casos difíciles: participante sin voluntario, dos voluntarios para un participante, y voluntario nuevo.

```js
export const ROSTER = {
  version: 1,
  participantes: [
    { id: 'p1', nombre: 'Gonzalo', grupo: 1, foto: null, activo: true, notas: '' },
    { id: 'p2', nombre: 'Sofi', grupo: 1, foto: null, activo: true, notas: '' },
    { id: 'p3', nombre: 'Thiago', grupo: 1, foto: 'p3.jpg', activo: true, notas: '' },
    { id: 'p4', nombre: 'Nikita', grupo: 2, foto: null, activo: true, notas: '' },
    { id: 'p5', nombre: 'Julián', grupo: 2, foto: null, activo: true, notas: '' },
    { id: 'p6', nombre: 'Ezequiel', grupo: 2, foto: null, activo: false, notas: '' },
  ],
  voluntarios: [
    { id: 'v1', nombre: 'Abi', nuevo: false, foto: null, activo: true, notas: '' },
    { id: 'v2', nombre: 'Cris', nuevo: false, foto: null, activo: true, notas: '' },
    { id: 'v3', nombre: 'Francisco', nuevo: true, foto: null, activo: true, notas: '' },
    { id: 'v4', nombre: 'Moni', nuevo: false, foto: null, activo: true, notas: '' },
    { id: 'v5', nombre: 'Majo', nuevo: false, foto: null, activo: true, notas: '' },
  ],
}

export const LISTA = {
  version: 1,
  fecha: '2026-08-08',
  hora: '11:00',
  lugar: 'Tres Cruces',
  coordinacion: ['Majo'],
  grupos: [
    {
      numero: 1,
      titulo: 'Grupo 1',
      subtitulo: '5 a 9 años',
      cancha: 'Cancha 1',
      filas: [
        { participantes: ['p1'], voluntarios: ['v1'] },
        { participantes: ['p2'], voluntarios: [] },
        { participantes: ['p3'], voluntarios: ['v2'] },
      ],
      apoyo: [],
    },
    {
      numero: 2,
      titulo: 'Grupo 2',
      subtitulo: '10 a 17 años',
      cancha: 'Cancha 2',
      filas: [
        { participantes: ['p4'], voluntarios: ['v2', 'v3'] },
        { participantes: ['p5'], voluntarios: ['v4'] },
      ],
      apoyo: ['v5'],
    },
  ],
  opcionesImagen: { saludo: true, despedida: true, fotos: true, compacto: false },
}

export const SALUDO = 'Buenas tardes, esperamos que estén todos bien. Les compartimos las asignaciones para mañana:'
export const DESPEDIDA = 'Nos vemos mañana. Gracias a todos.'

export function medirFalso(texto, fuente) {
  const px = Number(/(\d+)px/.exec(fuente)?.[1] ?? 16)
  return texto.length * px * 0.55
}
```

- [ ] **Step 2: Escribir la prueba que falla**

```js
import { describe, it, expect } from 'vitest'
import { maquetar } from '../../js/imagen/maquetar.js'
import { ANCHO } from '../../js/imagen/tema.js'
import { ROSTER, LISTA, SALUDO, DESPEDIDA, medirFalso } from '../ayudas/datos.js'

const opciones = { saludo: SALUDO, despedida: DESPEDIDA, medirTexto: medirFalso }

function textos(plano) {
  return plano.ordenes.filter((o) => o.tipo === 'texto').map((o) => o.texto)
}

describe('maquetar', () => {
  it('devuelve el ancho fijo de 1080 y un alto positivo', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    expect(plano.ancho).toBe(ANCHO)
    expect(plano.alto).toBeGreaterThan(0)
  })

  it('escribe el titulo del programa y la fecha en español', () => {
    const t = textos(maquetar(LISTA, ROSTER, opciones))
    expect(t).toContain('Fútbol sin Barreras')
    expect(t.some((x) => x.includes('Sábado 8 de agosto'))).toBe(true)
    expect(t.some((x) => x.includes('11:00'))).toBe(true)
    expect(t.some((x) => x.includes('Tres Cruces'))).toBe(true)
  })

  it('escribe los titulos y las canchas de los dos grupos', () => {
    const t = textos(maquetar(LISTA, ROSTER, opciones))
    expect(t).toContain('Grupo 1 · 5 a 9 años')
    expect(t).toContain('Cancha 1')
    expect(t).toContain('Grupo 2 · 10 a 17 años')
    expect(t).toContain('Cancha 2')
  })

  it('escribe cada participante y su voluntario', () => {
    const t = textos(maquetar(LISTA, ROSTER, opciones))
    expect(t).toContain('Gonzalo')
    expect(t).toContain('Abi')
  })

  it('un participante sin voluntario se dibuja sin separador', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    const fila = plano.ordenes.filter((o) => o.fila === 'p2')
    expect(fila.some((o) => o.tipo === 'texto' && o.texto === 'Sofi')).toBe(true)
    expect(fila.some((o) => o.tipo === 'texto' && o.texto === '-')).toBe(false)
  })

  it('dos voluntarios para un participante se separan con barra', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    const fila = plano.ordenes.filter((o) => o.fila === 'p4')
    const t = fila.filter((o) => o.tipo === 'texto').map((o) => o.texto)
    expect(t).toContain('Cris')
    expect(t).toContain('/')
    expect(t).toContain('Francisco')
  })

  it('usa guion simple como separador, nunca raya', () => {
    const t = textos(maquetar(LISTA, ROSTER, opciones)).join(' ')
    expect(t).toContain('-')
    expect(t).not.toMatch(/(—|–|―)/)
  })

  it('marca al voluntario nuevo con una pastilla', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    const t = textos(plano)
    expect(t).toContain('nuevo')
  })

  it('dibuja la linea de apoyo del grupo 2', () => {
    const t = textos(maquetar(LISTA, ROSTER, opciones))
    expect(t).toContain('Apoyo G2')
    expect(t).toContain('Majo')
  })

  it('incluye saludo y despedida cuando estan activados', () => {
    const t = textos(maquetar(LISTA, ROSTER, opciones)).join(' ')
    expect(t).toContain('Les compartimos las asignaciones')
    expect(t).toContain('Nos vemos mañana')
  })

  it('los omite cuando estan desactivados y la imagen queda mas baja', () => {
    const sin = { ...LISTA, opcionesImagen: { ...LISTA.opcionesImagen, saludo: false, despedida: false } }
    const planoSin = maquetar(sin, ROSTER, opciones)
    const planoCon = maquetar(LISTA, ROSTER, opciones)
    expect(textos(planoSin).join(' ')).not.toContain('Nos vemos mañana')
    expect(planoSin.alto).toBeLessThan(planoCon.alto)
  })

  it('ninguna orden se sale del lienzo', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    plano.ordenes.forEach((o) => {
      expect(o.x ?? 0).toBeGreaterThanOrEqual(0)
      expect((o.x ?? 0) + (o.ancho ?? 0)).toBeLessThanOrEqual(ANCHO)
      expect(o.y ?? 0).toBeGreaterThanOrEqual(0)
      expect((o.y ?? 0) + (o.alto ?? 0)).toBeLessThanOrEqual(plano.alto)
    })
  })

  it('pide la foto solo de quien tiene foto', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    const imagenes = plano.ordenes.filter((o) => o.tipo === 'imagen')
    expect(imagenes.map((o) => o.clave)).toContain('p3.jpg')
    expect(imagenes.map((o) => o.clave)).not.toContain(null)
  })

  it('dibuja iniciales cuando no hay foto', () => {
    const t = textos(maquetar(LISTA, ROSTER, opciones))
    expect(t).toContain('GO')
  })

  it('el modo compacto es mas bajo y no pide fotos de personas', () => {
    const comp = { ...LISTA, opcionesImagen: { ...LISTA.opcionesImagen, compacto: true } }
    const planoComp = maquetar(comp, ROSTER, opciones)
    const planoNormal = maquetar(LISTA, ROSTER, opciones)
    expect(planoComp.alto).toBeLessThan(planoNormal.alto)
    const fotos = planoComp.ordenes.filter((o) => o.tipo === 'imagen' && o.clave !== 'logo')
    expect(fotos).toHaveLength(0)
    expect(planoComp.ordenes.some((o) => o.tipo === 'imagen' && o.clave === 'logo')).toBe(true)
  })

  it('informa la relacion de aspecto y si WhatsApp la recortaria', () => {
    const plano = maquetar(LISTA, ROSTER, opciones)
    expect(plano.relacion).toBeCloseTo(plano.alto / plano.ancho, 5)
    expect(plano.recorteProbable).toBe(plano.relacion > 2.5)
  })

  it('un participante inactivo que no esta en ninguna fila no aparece', () => {
    const t = textos(maquetar(LISTA, ROSTER, opciones))
    expect(t).not.toContain('Ezequiel')
  })

  it('falla con mensaje claro si una fila referencia un id inexistente', () => {
    const rota = structuredClone(LISTA)
    rota.grupos[0].filas.push({ participantes: ['p999'], voluntarios: [] })
    expect(() => maquetar(rota, ROSTER, opciones)).toThrow(/p999/)
  })
})
```

- [ ] **Step 3: Correr la prueba para verificar que falla**

Run: `npx vitest run test/imagen/maquetar.test.js`
Expected: FAIL, no se resuelve el import.

- [ ] **Step 4: Escribir la implementación**

```js
import { ANCHO, COLORES, FUENTES, medidas } from './tema.js'
import { formatearFechaLarga } from '../util/fechas.js'
import { iniciales } from '../util/nombres.js'

const RELACION_RECORTE = 2.5

export function maquetar(lista, roster, opciones = {}) {
  const { saludo = '', despedida = '', medirTexto } = opciones
  if (typeof medirTexto !== 'function') {
    throw new Error('maquetar necesita una funcion medirTexto(texto, fuente)')
  }

  const compacto = Boolean(lista.opcionesImagen?.compacto)
  const conFotos = Boolean(lista.opcionesImagen?.fotos) && medidas(compacto).mostrarFotos
  const m = medidas(compacto)
  const porId = indexar(roster)

  const ordenes = []
  let y = 0

  y = bandaSuperior(ordenes, lista, m, y)

  if (lista.opcionesImagen?.saludo && saludo) {
    y = parrafo(ordenes, saludo, m, y, medirTexto)
  }

  lista.grupos.forEach((grupo, i) => {
    if (i > 0) y += m.espacioEntreGrupos
    y = tituloGrupo(ordenes, grupo, m, y)
    grupo.filas.forEach((fila) => {
      y = filaDeAsignacion(ordenes, fila, porId, m, y, conFotos, medirTexto)
    })
    if (grupo.apoyo?.length) {
      y = lineaApoyo(ordenes, grupo, porId, m, y)
    }
  })

  if (lista.opcionesImagen?.despedida && despedida) {
    y += m.margen / 2
    y = parrafo(ordenes, despedida, m, y, medirTexto)
  }

  y += m.margen / 2
  const alto = y + m.altoBandaInferior
  bandaInferior(ordenes, m, y, alto)

  const relacion = alto / ANCHO
  return { ancho: ANCHO, alto, ordenes, relacion, recorteProbable: relacion > RELACION_RECORTE }
}

function indexar(roster) {
  const mapa = new Map()
  roster.participantes.forEach((p) => mapa.set(p.id, p))
  roster.voluntarios.forEach((v) => mapa.set(v.id, v))
  return mapa
}

function buscar(porId, id) {
  const persona = porId.get(id)
  if (!persona) throw new Error(`La lista referencia a una persona inexistente: ${id}`)
  return persona
}

function bandaSuperior(ordenes, lista, m, y) {
  const alto = m.altoBandaSuperior
  ordenes.push({ tipo: 'rect', x: 0, y, ancho: ANCHO, alto, color: COLORES.violeta })
  ordenes.push({
    tipo: 'imagen', clave: 'logo', x: m.margen, y: y + 28,
    ancho: 200, alto: 75, circular: false,
  })
  ordenes.push({
    tipo: 'texto', texto: 'Fútbol sin Barreras', x: m.margen, y: y + alto - 74,
    fuente: FUENTES.titulo(m.pxTitular), color: COLORES.blanco, lineaBase: 'top',
  })
  const sub = `${formatearFechaLarga(lista.fecha)} · ${lista.hora} h · ${lista.lugar}`
  ordenes.push({
    tipo: 'texto', texto: sub, x: m.margen, y: y + alto - 34,
    fuente: FUENTES.normal(m.pxBanda), color: COLORES.violetaClaro, lineaBase: 'top',
  })
  return y + alto
}

function bandaInferior(ordenes, m, y, alto) {
  ordenes.push({ tipo: 'rect', x: 0, y, ancho: ANCHO, alto: alto - y, color: COLORES.violeta })
  const centro = y + (alto - y) / 2
  ordenes.push({
    tipo: 'texto', texto: 'aletea.org', x: m.margen, y: centro,
    fuente: FUENTES.normal(m.pxBanda), color: COLORES.violetaClaro, lineaBase: 'middle',
  })
  ordenes.push({
    tipo: 'texto', texto: '@futbol_sinbarreras', x: ANCHO - m.margen, y: centro,
    fuente: FUENTES.normal(m.pxBanda), color: COLORES.blanco,
    alineacion: 'right', lineaBase: 'middle',
  })
}

function parrafo(ordenes, texto, m, y, medirTexto) {
  const anchoUtil = ANCHO - m.margen * 2
  const fuente = FUENTES.normal(m.pxParrafo)
  const lineas = quebrar(texto, anchoUtil, fuente, medirTexto)
  const altoLinea = Math.round(m.pxParrafo * 1.45)
  let cursor = y + m.margen / 2
  lineas.forEach((linea) => {
    ordenes.push({
      tipo: 'texto', texto: linea, x: m.margen, y: cursor,
      fuente, color: COLORES.textoSuave, lineaBase: 'top',
    })
    cursor += altoLinea
  })
  return cursor
}

function quebrar(texto, anchoMaximo, fuente, medirTexto) {
  const palabras = texto.split(/\s+/).filter(Boolean)
  const lineas = []
  let actual = ''
  palabras.forEach((palabra) => {
    const intento = actual ? `${actual} ${palabra}` : palabra
    if (actual && medirTexto(intento, fuente) > anchoMaximo) {
      lineas.push(actual)
      actual = palabra
    } else {
      actual = intento
    }
  })
  if (actual) lineas.push(actual)
  return lineas
}

function colorDeGrupo(numero) {
  return numero === 1
    ? { fuerte: COLORES.turquesaTexto, tenue: COLORES.turquesaTenue }
    : { fuerte: COLORES.magentaTexto, tenue: COLORES.magentaTenue }
}

function tituloGrupo(ordenes, grupo, m, y) {
  const c = colorDeGrupo(grupo.numero)
  const alto = m.altoTituloGrupo
  const arriba = y + m.margen / 2
  ordenes.push({
    tipo: 'rect', x: m.margen, y: arriba, ancho: ANCHO - m.margen * 2,
    alto, color: c.tenue, radio: 16,
  })
  const centro = arriba + alto / 2
  const titulo = grupo.subtitulo ? `${grupo.titulo} · ${grupo.subtitulo}` : grupo.titulo
  ordenes.push({
    tipo: 'texto', texto: titulo, x: m.margen + 24, y: centro,
    fuente: FUENTES.titulo(m.pxTituloGrupo), color: c.fuerte, lineaBase: 'middle',
  })
  if (grupo.cancha) {
    ordenes.push({
      tipo: 'texto', texto: grupo.cancha, x: ANCHO - m.margen - 24, y: centro,
      fuente: FUENTES.normal(m.pxTituloGrupo - 2), color: c.fuerte,
      alineacion: 'right', lineaBase: 'middle',
    })
  }
  return arriba + alto
}

function filaDeAsignacion(ordenes, fila, porId, m, y, conFotos, medirTexto) {
  const participantes = fila.participantes.map((id) => buscar(porId, id))
  const voluntarios = fila.voluntarios.map((id) => buscar(porId, id))
  const clave = fila.participantes[0]
  const centro = y + m.altoFila / 2
  let x = m.margen

  if (conFotos) {
    const primero = participantes[0]
    if (primero.foto) {
      ordenes.push({
        tipo: 'imagen', clave: primero.foto, x, y: centro - m.avatar / 2,
        ancho: m.avatar, alto: m.avatar, circular: true, fila: clave,
      })
    } else {
      ordenes.push({
        tipo: 'circulo', x: x + m.avatar / 2, y: centro, radio: m.avatar / 2,
        color: colorDeGrupo(1).tenue, fila: clave,
      })
      ordenes.push({
        tipo: 'texto', texto: iniciales(primero.nombre), x: x + m.avatar / 2, y: centro,
        fuente: FUENTES.titulo(Math.round(m.avatar * 0.36)), color: COLORES.violeta,
        alineacion: 'center', lineaBase: 'middle', fila: clave,
      })
    }
    x += m.avatar + 20
  }

  x = escribirNombres(ordenes, participantes, x, centro, m,
    FUENTES.titulo(m.pxNombre), COLORES.texto, clave, medirTexto)

  if (voluntarios.length > 0) {
    x = escribirSeparador(ordenes, '-', x, centro, m, clave, medirTexto)
    x = escribirNombres(ordenes, voluntarios, x, centro, m,
      FUENTES.normal(m.pxVoluntario), COLORES.magentaTexto, clave, medirTexto, true)
  }

  const abajo = y + m.altoFila
  ordenes.push({
    tipo: 'linea', x1: m.margen, y1: abajo, x2: ANCHO - m.margen, y2: abajo,
    color: COLORES.linea, fila: clave,
  })
  return abajo
}

function escribirNombres(ordenes, gente, x, centro, m, fuente, color, clave, medirTexto, conPastilla = false) {
  gente.forEach((persona, i) => {
    if (i > 0) x = escribirSeparador(ordenes, '/', x, centro, m, clave, medirTexto)
    ordenes.push({
      tipo: 'texto', texto: persona.nombre, x, y: centro,
      fuente, color, lineaBase: 'middle', fila: clave,
    })
    x += medirTexto(persona.nombre, fuente) + 10
    if (conPastilla && persona.nuevo) {
      const fuentePastilla = FUENTES.normal(Math.round(m.pxVoluntario * 0.62))
      const anchoTexto = medirTexto('nuevo', fuentePastilla)
      const anchoPastilla = anchoTexto + 24
      const altoPastilla = Math.round(m.pxVoluntario * 0.95)
      ordenes.push({
        tipo: 'rect', x, y: centro - altoPastilla / 2, ancho: anchoPastilla,
        alto: altoPastilla, color: COLORES.violetaTenue, radio: altoPastilla / 2, fila: clave,
      })
      ordenes.push({
        tipo: 'texto', texto: 'nuevo', x: x + anchoPastilla / 2, y: centro,
        fuente: fuentePastilla, color: COLORES.violeta,
        alineacion: 'center', lineaBase: 'middle', fila: clave,
      })
      x += anchoPastilla + 10
    }
  })
  return x
}

function escribirSeparador(ordenes, simbolo, x, centro, m, clave, medirTexto) {
  const fuente = FUENTES.normal(m.pxVoluntario)
  ordenes.push({
    tipo: 'texto', texto: simbolo, x, y: centro,
    fuente, color: COLORES.textoSuave, lineaBase: 'middle', fila: clave,
  })
  return x + medirTexto(simbolo, fuente) + 10
}

function lineaApoyo(ordenes, grupo, porId, m, y) {
  const alto = Math.round(m.altoFila * 0.7)
  const arriba = y + 16
  ordenes.push({
    tipo: 'rect', x: m.margen, y: arriba, ancho: ANCHO - m.margen * 2,
    alto, color: COLORES.violetaTenue, radio: 14,
  })
  const centro = arriba + alto / 2
  ordenes.push({
    tipo: 'texto', texto: `Apoyo G${grupo.numero}`, x: m.margen + 20, y: centro,
    fuente: FUENTES.titulo(Math.round(m.pxVoluntario * 0.85)),
    color: COLORES.violeta, lineaBase: 'middle',
  })
  const nombres = grupo.apoyo.map((id) => buscar(porId, id).nombre).join(' / ')
  ordenes.push({
    tipo: 'texto', texto: nombres, x: m.margen + 200, y: centro,
    fuente: FUENTES.normal(m.pxVoluntario), color: COLORES.texto, lineaBase: 'middle',
  })
  return arriba + alto
}
```

- [ ] **Step 5: Correr las pruebas**

Run: `npx vitest run test/imagen/maquetar.test.js`
Expected: PASS, 18 pruebas. La prueba "ninguna orden se sale del lienzo" es la que más probablemente falle primero: si falla, el nombre es demasiado largo para el ancho útil, y la corrección es truncar el texto en `escribirNombres` cuando `x` supera `ANCHO - m.margen`, no ampliar el lienzo.

- [ ] **Step 6: Commit**

```bash
git add js/imagen/maquetar.js test/imagen/maquetar.test.js test/ayudas/datos.js
git commit -m "Maquetacion pura de la imagen, con geometria verificable sin canvas"
```

---

## Task 6: El pintor sobre canvas

`pintar` recorre las órdenes y las ejecuta. No toma ninguna decisión de posición. Se prueba con un contexto falso que registra las llamadas, así que tampoco necesita un canvas real.

**Files:**
- Create: `js/imagen/pintar.js`
- Test: `test/imagen/pintar.test.js`

- [ ] **Step 1: Escribir la prueba que falla**

```js
import { describe, it, expect } from 'vitest'
import { pintar } from '../../js/imagen/pintar.js'

function contextoFalso() {
  const llamadas = []
  const registrar = (nombre) => (...args) => llamadas.push({ nombre, args })
  return {
    llamadas,
    canvas: { width: 0, height: 0 },
    save: registrar('save'),
    restore: registrar('restore'),
    beginPath: registrar('beginPath'),
    closePath: registrar('closePath'),
    fill: registrar('fill'),
    stroke: registrar('stroke'),
    clip: registrar('clip'),
    arc: registrar('arc'),
    moveTo: registrar('moveTo'),
    lineTo: registrar('lineTo'),
    fillRect: registrar('fillRect'),
    fillText: registrar('fillText'),
    drawImage: registrar('drawImage'),
    roundRect: registrar('roundRect'),
    scale: registrar('scale'),
    set fillStyle(v) { llamadas.push({ nombre: 'fillStyle', args: [v] }) },
    set strokeStyle(v) { llamadas.push({ nombre: 'strokeStyle', args: [v] }) },
    set font(v) { llamadas.push({ nombre: 'font', args: [v] }) },
    set textAlign(v) { llamadas.push({ nombre: 'textAlign', args: [v] }) },
    set textBaseline(v) { llamadas.push({ nombre: 'textBaseline', args: [v] }) },
    set lineWidth(v) { llamadas.push({ nombre: 'lineWidth', args: [v] }) },
  }
}

const plano = (ordenes) => ({ ancho: 100, alto: 50, ordenes })

describe('pintar', () => {
  it('dibuja el fondo blanco antes que nada', () => {
    const ctx = contextoFalso()
    pintar(ctx, plano([]), {}, 1)
    const primerRelleno = ctx.llamadas.findIndex((l) => l.nombre === 'fillRect')
    expect(primerRelleno).toBeGreaterThanOrEqual(0)
    expect(ctx.llamadas[primerRelleno].args).toEqual([0, 0, 100, 50])
  })

  it('respeta el orden de las ordenes', () => {
    const ctx = contextoFalso()
    pintar(ctx, plano([
      { tipo: 'texto', texto: 'primero', x: 0, y: 0, fuente: '10px X', color: '#000' },
      { tipo: 'texto', texto: 'segundo', x: 0, y: 0, fuente: '10px X', color: '#000' },
    ]), {}, 1)
    const textos = ctx.llamadas.filter((l) => l.nombre === 'fillText').map((l) => l.args[0])
    expect(textos).toEqual(['primero', 'segundo'])
  })

  it('aplica alineacion y linea base por defecto', () => {
    const ctx = contextoFalso()
    pintar(ctx, plano([{ tipo: 'texto', texto: 'a', x: 5, y: 6, fuente: '10px X', color: '#000' }]), {}, 1)
    expect(ctx.llamadas).toContainEqual({ nombre: 'textAlign', args: ['left'] })
    expect(ctx.llamadas).toContainEqual({ nombre: 'textBaseline', args: ['alphabetic'] })
  })

  it('escala el lienzo por el factor de densidad', () => {
    const ctx = contextoFalso()
    pintar(ctx, plano([]), {}, 2)
    expect(ctx.canvas.width).toBe(200)
    expect(ctx.canvas.height).toBe(100)
    expect(ctx.llamadas).toContainEqual({ nombre: 'scale', args: [2, 2] })
  })

  it('recorta en circulo las imagenes circulares', () => {
    const ctx = contextoFalso()
    const img = { ancho: 10 }
    pintar(ctx, plano([
      { tipo: 'imagen', clave: 'f.jpg', x: 0, y: 0, ancho: 10, alto: 10, circular: true },
    ]), { 'f.jpg': img }, 1)
    expect(ctx.llamadas.some((l) => l.nombre === 'clip')).toBe(true)
    expect(ctx.llamadas.some((l) => l.nombre === 'drawImage')).toBe(true)
  })

  it('omite en silencio una imagen que no se pudo cargar', () => {
    const ctx = contextoFalso()
    expect(() => pintar(ctx, plano([
      { tipo: 'imagen', clave: 'falta.jpg', x: 0, y: 0, ancho: 10, alto: 10 },
    ]), {}, 1)).not.toThrow()
    expect(ctx.llamadas.some((l) => l.nombre === 'drawImage')).toBe(false)
  })

  it('falla con mensaje claro ante un tipo de orden desconocido', () => {
    const ctx = contextoFalso()
    expect(() => pintar(ctx, plano([{ tipo: 'holograma' }]), {}, 1)).toThrow(/holograma/)
  })
})
```

- [ ] **Step 2: Correr la prueba para verificar que falla**

Run: `npx vitest run test/imagen/pintar.test.js`
Expected: FAIL, no se resuelve el import.

- [ ] **Step 3: Escribir la implementación**

```js
import { COLORES } from './tema.js'

export function pintar(ctx, plano, imagenes = {}, densidad = 1) {
  ctx.canvas.width = plano.ancho * densidad
  ctx.canvas.height = plano.alto * densidad
  ctx.scale(densidad, densidad)

  ctx.fillStyle = COLORES.fondo
  ctx.fillRect(0, 0, plano.ancho, plano.alto)

  plano.ordenes.forEach((orden) => {
    switch (orden.tipo) {
      case 'rect': return rect(ctx, orden)
      case 'circulo': return circulo(ctx, orden)
      case 'linea': return linea(ctx, orden)
      case 'texto': return texto(ctx, orden)
      case 'imagen': return imagen(ctx, orden, imagenes)
      default: throw new Error(`Orden de dibujo desconocida: ${orden.tipo}`)
    }
  })
}

function rect(ctx, o) {
  ctx.fillStyle = o.color
  if (o.radio) {
    ctx.beginPath()
    ctx.roundRect(o.x, o.y, o.ancho, o.alto, o.radio)
    ctx.fill()
  } else {
    ctx.fillRect(o.x, o.y, o.ancho, o.alto)
  }
}

function circulo(ctx, o) {
  ctx.fillStyle = o.color
  ctx.beginPath()
  ctx.arc(o.x, o.y, o.radio, 0, Math.PI * 2)
  ctx.fill()
}

function linea(ctx, o) {
  ctx.strokeStyle = o.color
  ctx.lineWidth = o.grosor ?? 1
  ctx.beginPath()
  ctx.moveTo(o.x1, o.y1)
  ctx.lineTo(o.x2, o.y2)
  ctx.stroke()
}

function texto(ctx, o) {
  ctx.font = o.fuente
  ctx.fillStyle = o.color
  ctx.textAlign = o.alineacion ?? 'left'
  ctx.textBaseline = o.lineaBase ?? 'alphabetic'
  ctx.fillText(o.texto, o.x, o.y)
}

function imagen(ctx, o, imagenes) {
  const fuente = imagenes[o.clave]
  if (!fuente) return
  ctx.save()
  if (o.circular) {
    ctx.beginPath()
    ctx.arc(o.x + o.ancho / 2, o.y + o.alto / 2, o.ancho / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
  }
  ctx.drawImage(fuente, o.x, o.y, o.ancho, o.alto)
  ctx.restore()
}
```

Una imagen que falta se omite en silencio a propósito: si una foto no carga, la imagen tiene que salir igual con el resto de la información. Una lista sin publicar por una foto rota sería peor que una lista sin esa foto.

- [ ] **Step 4: Correr las pruebas**

Run: `npx vitest run test/imagen/pintar.test.js`
Expected: PASS, 7 pruebas.

- [ ] **Step 5: Commit**

```bash
git add js/imagen/pintar.js test/imagen/pintar.test.js
git commit -m "Pintor de canvas que ejecuta ordenes sin decidir posiciones"
```

---

## Task 7: Exportación y página de demostración

**Files:**
- Create: `js/imagen/exportar.js`, `demo.html`, `js/demo.js`
- Test: `test/imagen/exportar.test.js`

- [ ] **Step 1: Escribir la prueba que falla**

```js
import { describe, it, expect } from 'vitest'
import { nombreDeArchivo, medidorDesde } from '../../js/imagen/exportar.js'

describe('nombreDeArchivo', () => {
  it('usa la fecha de la lista', () => {
    expect(nombreDeArchivo({ fecha: '2026-08-08' })).toBe('futbol-sin-barreras-2026-08-08.png')
  })

  it('agrega el sufijo del grupo cuando se exporta por separado', () => {
    expect(nombreDeArchivo({ fecha: '2026-08-08' }, 2)).toBe('futbol-sin-barreras-2026-08-08-grupo-2.png')
  })
})

describe('medidorDesde', () => {
  it('devuelve una funcion que mide con el contexto dado', () => {
    const ctx = { measureText: (t) => ({ width: t.length * 7 }) }
    const medir = medidorDesde(ctx)
    expect(medir('abcd', '20px Poppins')).toBe(28)
  })

  it('fija la fuente en el contexto antes de medir', () => {
    const fuentes = []
    const ctx = {
      set font(v) { fuentes.push(v) },
      measureText: () => ({ width: 1 }),
    }
    medidorDesde(ctx)('x', '30px Poppins')
    expect(fuentes).toContain('30px Poppins')
  })
})
```

- [ ] **Step 2: Correr la prueba para verificar que falla**

Run: `npx vitest run test/imagen/exportar.test.js`
Expected: FAIL, no se resuelve el import.

- [ ] **Step 3: Escribir `js/imagen/exportar.js`**

```js
export function nombreDeArchivo(lista, grupo = null) {
  const base = `futbol-sin-barreras-${lista.fecha}`
  return grupo ? `${base}-grupo-${grupo}.png` : `${base}.png`
}

export function medidorDesde(ctx) {
  return (texto, fuente) => {
    ctx.font = fuente
    return ctx.measureText(texto).width
  }
}

export async function esperarFuentes() {
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.load('500 52px Poppins')
    await document.fonts.load('400 32px Poppins')
    await document.fonts.ready
  }
}

export function cargarImagen(url) {
  return new Promise((resolver) => {
    const img = new Image()
    img.onload = () => resolver(img)
    img.onerror = () => resolver(null)
    img.src = url
  })
}

export function aBlob(canvas) {
  return new Promise((resolver) => canvas.toBlob(resolver, 'image/png'))
}

export async function descargar(canvas, nombre) {
  const blob = await aBlob(canvas)
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

export async function compartir(canvas, nombre, texto) {
  const blob = await aBlob(canvas)
  const archivo = new File([blob], nombre, { type: 'image/png' })
  if (navigator.canShare?.({ files: [archivo] })) {
    await navigator.share({ files: [archivo], text: texto })
    return true
  }
  return false
}
```

`esperarFuentes` carga explícitamente los dos tamaños antes de `document.fonts.ready`. Sin eso, el navegador puede no haber pedido todavía la Poppins cuando se dibuja, el canvas rasteriza con una fuente sustituta y el PNG sale con una tipografía distinta a la de la pantalla. Es un error silencioso y difícil de ver en la vista previa.

- [ ] **Step 4: Correr las pruebas**

Run: `npx vitest run test/imagen/exportar.test.js`
Expected: PASS, 4 pruebas.

- [ ] **Step 5: Crear `demo.html`**

```html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Demostración de la imagen</title>
<link rel="stylesheet" href="css/estilos.css">
</head>
<body>
<main style="max-width: 720px; margin: 0 auto; padding: 24px;">
  <h1 style="font-weight: 500;">Demostración</h1>
  <p id="info" style="color: var(--texto-suave);"></p>
  <label><input type="checkbox" id="saludo" checked> Saludo</label>
  <label><input type="checkbox" id="despedida" checked> Despedida</label>
  <label><input type="checkbox" id="fotos" checked> Fotos</label>
  <label><input type="checkbox" id="compacto"> Compacto</label>
  <p><button id="descargar">Descargar PNG</button></p>
  <canvas id="lienzo" style="width: 100%; border: 1px solid var(--linea);"></canvas>
</main>
<script type="module" src="js/demo.js"></script>
</body>
</html>
```

- [ ] **Step 6: Crear `js/demo.js`**

```js
import { maquetar } from './imagen/maquetar.js'
import { pintar } from './imagen/pintar.js'
import { esperarFuentes, medidorDesde, cargarImagen, descargar, nombreDeArchivo } from './imagen/exportar.js'

const ROSTER = {
  participantes: [
    { id: 'p1', nombre: 'Gonzalo', grupo: 1, foto: null, activo: true },
    { id: 'p2', nombre: 'Sofi', grupo: 1, foto: null, activo: true },
    { id: 'p3', nombre: 'Thiago', grupo: 1, foto: null, activo: true },
    { id: 'p4', nombre: 'Facundo', grupo: 1, foto: null, activo: true },
    { id: 'p5', nombre: 'Fabi', grupo: 1, foto: null, activo: true },
    { id: 'p6', nombre: 'Juan', grupo: 1, foto: null, activo: true },
    { id: 'p7', nombre: 'Nikita', grupo: 2, foto: null, activo: true },
    { id: 'p8', nombre: 'Julián', grupo: 2, foto: null, activo: true },
    { id: 'p9', nombre: 'Ezequiel', grupo: 2, foto: null, activo: true },
    { id: 'p10', nombre: 'Gaia', grupo: 2, foto: null, activo: true },
  ],
  voluntarios: [
    { id: 'v1', nombre: 'Abi', nuevo: false, activo: true },
    { id: 'v2', nombre: 'Pato', nuevo: false, activo: true },
    { id: 'v3', nombre: 'Cris', nuevo: false, activo: true },
    { id: 'v4', nombre: 'Francisco', nuevo: true, activo: true },
    { id: 'v5', nombre: 'Moni', nuevo: false, activo: true },
    { id: 'v6', nombre: 'Eloísa', nuevo: false, activo: true },
    { id: 'v7', nombre: 'Jess', nuevo: false, activo: true },
    { id: 'v8', nombre: 'Majo', nuevo: false, activo: true },
  ],
}

const LISTA = {
  fecha: '2026-08-08', hora: '11:00', lugar: 'Tres Cruces', coordinacion: ['Majo'],
  grupos: [
    {
      numero: 1, titulo: 'Grupo 1', subtitulo: '5 a 9 años', cancha: 'Cancha 1',
      filas: [
        { participantes: ['p1'], voluntarios: ['v1'] },
        { participantes: ['p2'], voluntarios: [] },
        { participantes: ['p3'], voluntarios: [] },
        { participantes: ['p4'], voluntarios: [] },
        { participantes: ['p5'], voluntarios: ['v2'] },
        { participantes: ['p6'], voluntarios: [] },
      ],
      apoyo: [],
    },
    {
      numero: 2, titulo: 'Grupo 2', subtitulo: '10 a 17 años', cancha: 'Cancha 2',
      filas: [
        { participantes: ['p7'], voluntarios: ['v3', 'v4'] },
        { participantes: ['p8'], voluntarios: ['v5'] },
        { participantes: ['p9'], voluntarios: ['v6'] },
        { participantes: ['p10'], voluntarios: ['v7'] },
      ],
      apoyo: ['v8'],
    },
  ],
  opcionesImagen: { saludo: true, despedida: true, fotos: true, compacto: false },
}

const SALUDO = 'Buenas tardes, esperamos que estén todos bien. Les compartimos las asignaciones para mañana:'
const DESPEDIDA = 'Nos vemos mañana. Gracias a todos.'

const lienzo = document.getElementById('lienzo')
const ctx = lienzo.getContext('2d')
let logo = null

async function redibujar() {
  await esperarFuentes()
  const lista = {
    ...LISTA,
    opcionesImagen: {
      saludo: document.getElementById('saludo').checked,
      despedida: document.getElementById('despedida').checked,
      fotos: document.getElementById('fotos').checked,
      compacto: document.getElementById('compacto').checked,
    },
  }
  const plano = maquetar(lista, ROSTER, {
    saludo: SALUDO, despedida: DESPEDIDA, medirTexto: medidorDesde(ctx),
  })
  pintar(ctx, plano, { logo }, 1)
  document.getElementById('info').textContent =
    `${plano.ancho} por ${plano.alto} px, relación ${plano.relacion.toFixed(2)}. ` +
    (plano.recorteProbable ? 'WhatsApp la recortaría en la vista previa.' : 'Entra sin recorte en WhatsApp.')
}

document.getElementById('descargar').addEventListener('click', async () => {
  await descargar(lienzo, nombreDeArchivo(LISTA))
})

document.querySelectorAll('input[type=checkbox]').forEach((c) =>
  c.addEventListener('change', redibujar))

logo = await cargarImagen('assets/logo-aletea.png')
await redibujar()
```

- [ ] **Step 7: Verificar la imagen a ojo, que es lo único que puede juzgar esto**

Run: `npm run servir` y abrir `http://localhost:8765/demo.html`

Verificar, en este orden:

1. La imagen se dibuja completa, con banda violeta arriba y abajo.
2. El texto está en Poppins, no en la fuente del sistema. Comparar con `index.html` si hay duda.
3. Ningún nombre se sale del borde derecho ni se pisa con otro.
4. "Sofi" aparece sin guión y sin voluntario.
5. "Nikita - Cris / Francisco" aparece con guión simple y barra simple.
6. Francisco lleva la pastilla "nuevo".
7. "Apoyo G2: Majo" aparece bajo el grupo 2.
8. El texto informativo dice si WhatsApp recortaría la imagen.
9. Marcar "Compacto" achica la imagen notoriamente y saca las fotos.

Descargar el PNG y abrirlo para confirmar que es idéntico a lo que se ve en pantalla. Este paso es obligatorio: es el único que verifica de verdad el criterio de aceptación 2 de la especificación.

- [ ] **Step 8: Correr toda la batería**

Run: `npx vitest run`
Expected: PASS en todos los archivos de prueba.

- [ ] **Step 9: Commit**

```bash
git add js/imagen/exportar.js js/demo.js demo.html test/imagen/exportar.test.js
git commit -m "Exportacion a PNG y pagina de demostracion de la imagen"
```

- [ ] **Step 10: Punto de revisión con la persona usuaria**

Mostrarle el PNG generado antes de seguir. Este es el momento barato para cambiar tamaños, orden de los bloques, colores o composición. Después del hito 2 hay interfaz construida encima y cada cambio cuesta más.

---

# Hito 2: armar la lista en el navegador

## Task 8: Modelo de roster

**Files:**
- Create: `js/modelo/roster.js`
- Test: `test/modelo/roster.test.js`

- [ ] **Step 1: Escribir la prueba que falla**

```js
import { describe, it, expect } from 'vitest'
import {
  rosterVacio, agregarParticipante, agregarVoluntario,
  editarPersona, desactivarPersona, activos, buscarPersonas,
} from '../../js/modelo/roster.js'

describe('rosterVacio', () => {
  it('trae las dos colecciones y la version', () => {
    const r = rosterVacio()
    expect(r.version).toBe(1)
    expect(r.participantes).toEqual([])
    expect(r.voluntarios).toEqual([])
  })
})

describe('agregarParticipante', () => {
  it('asigna un id unico con prefijo p', () => {
    const r = agregarParticipante(rosterVacio(), { nombre: 'Gonzalo', grupo: 1 })
    expect(r.participantes).toHaveLength(1)
    expect(r.participantes[0].id).toMatch(/^p_/)
    expect(r.participantes[0].nombre).toBe('Gonzalo')
    expect(r.participantes[0].activo).toBe(true)
  })

  it('no modifica el roster original', () => {
    const original = rosterVacio()
    agregarParticipante(original, { nombre: 'Gonzalo', grupo: 1 })
    expect(original.participantes).toHaveLength(0)
  })

  it('genera ids distintos para nombres iguales', () => {
    let r = agregarParticipante(rosterVacio(), { nombre: 'Francisco', grupo: 2 })
    r = agregarParticipante(r, { nombre: 'Francisco', grupo: 2 })
    expect(r.participantes[0].id).not.toBe(r.participantes[1].id)
  })

  it('rechaza un nombre vacio', () => {
    expect(() => agregarParticipante(rosterVacio(), { nombre: '  ', grupo: 1 })).toThrow(/nombre/i)
  })

  it('rechaza un grupo que no sea 1 ni 2', () => {
    expect(() => agregarParticipante(rosterVacio(), { nombre: 'X', grupo: 3 })).toThrow(/grupo/i)
  })
})

describe('agregarVoluntario', () => {
  it('asigna un id con prefijo v y por defecto no es nuevo', () => {
    const r = agregarVoluntario(rosterVacio(), { nombre: 'Abi' })
    expect(r.voluntarios[0].id).toMatch(/^v_/)
    expect(r.voluntarios[0].nuevo).toBe(false)
  })

  it('acepta la marca de nuevo', () => {
    const r = agregarVoluntario(rosterVacio(), { nombre: 'Julián', nuevo: true })
    expect(r.voluntarios[0].nuevo).toBe(true)
  })
})

describe('editarPersona', () => {
  it('cambia el nombre conservando el id', () => {
    const r = agregarParticipante(rosterVacio(), { nombre: 'Gonza', grupo: 1 })
    const id = r.participantes[0].id
    const r2 = editarPersona(r, id, { nombre: 'Gonzalo' })
    expect(r2.participantes[0].id).toBe(id)
    expect(r2.participantes[0].nombre).toBe('Gonzalo')
  })

  it('falla si el id no existe', () => {
    expect(() => editarPersona(rosterVacio(), 'p_falso', { nombre: 'X' })).toThrow(/p_falso/)
  })
})

describe('desactivarPersona', () => {
  it('marca inactivo sin borrar el registro', () => {
    const r = agregarParticipante(rosterVacio(), { nombre: 'Gonzalo', grupo: 1 })
    const id = r.participantes[0].id
    const r2 = desactivarPersona(r, id)
    expect(r2.participantes).toHaveLength(1)
    expect(r2.participantes[0].activo).toBe(false)
  })
})

describe('activos', () => {
  it('devuelve solo los activos, ordenados por nombre', () => {
    let r = agregarParticipante(rosterVacio(), { nombre: 'Rocío', grupo: 1 })
    r = agregarParticipante(r, { nombre: 'Ángel', grupo: 1 })
    r = agregarParticipante(r, { nombre: 'Zoe', grupo: 1 })
    r = desactivarPersona(r, r.participantes[2].id)
    expect(activos(r.participantes).map((p) => p.nombre)).toEqual(['Ángel', 'Rocío'])
  })
})

describe('buscarPersonas', () => {
  it('filtra ignorando acentos', () => {
    let r = agregarParticipante(rosterVacio(), { nombre: 'Rocío', grupo: 1 })
    r = agregarParticipante(r, { nombre: 'Gonzalo', grupo: 1 })
    expect(buscarPersonas(r.participantes, 'roci').map((p) => p.nombre)).toEqual(['Rocío'])
  })
})
```

- [ ] **Step 2: Correr la prueba para verificar que falla**

Run: `npx vitest run test/modelo/roster.test.js`
Expected: FAIL, no se resuelve el import.

- [ ] **Step 3: Escribir la implementación**

```js
import { ordenarPorNombre, coincide } from '../util/nombres.js'

let contador = 0

function nuevoId(prefijo) {
  contador += 1
  const azar = Math.random().toString(36).slice(2, 8)
  return `${prefijo}_${Date.now().toString(36)}${contador.toString(36)}${azar}`
}

function validarNombre(nombre) {
  if (typeof nombre !== 'string' || nombre.trim() === '') {
    throw new Error('El nombre no puede estar vacio')
  }
  return nombre.trim()
}

function validarGrupo(grupo) {
  if (grupo !== 1 && grupo !== 2) {
    throw new Error(`Grupo invalido: ${grupo}. Solo se admiten 1 y 2.`)
  }
  return grupo
}

export function rosterVacio() {
  return { version: 1, participantes: [], voluntarios: [] }
}

export function agregarParticipante(roster, datos) {
  const participante = {
    id: nuevoId('p'),
    nombre: validarNombre(datos.nombre),
    grupo: validarGrupo(datos.grupo),
    foto: datos.foto ?? null,
    activo: true,
    notas: datos.notas ?? '',
  }
  return { ...roster, participantes: [...roster.participantes, participante] }
}

export function agregarVoluntario(roster, datos) {
  const voluntario = {
    id: nuevoId('v'),
    nombre: validarNombre(datos.nombre),
    nuevo: Boolean(datos.nuevo),
    foto: datos.foto ?? null,
    activo: true,
    notas: datos.notas ?? '',
  }
  return { ...roster, voluntarios: [...roster.voluntarios, voluntario] }
}

function mapear(roster, id, transformar) {
  let encontrada = false
  const aplicar = (gente) => gente.map((p) => {
    if (p.id !== id) return p
    encontrada = true
    return transformar(p)
  })
  const participantes = aplicar(roster.participantes)
  const voluntarios = aplicar(roster.voluntarios)
  if (!encontrada) throw new Error(`No existe la persona ${id}`)
  return { ...roster, participantes, voluntarios }
}

export function editarPersona(roster, id, cambios) {
  return mapear(roster, id, (p) => {
    const siguiente = { ...p, ...cambios, id: p.id }
    if ('nombre' in cambios) siguiente.nombre = validarNombre(cambios.nombre)
    if ('grupo' in cambios) siguiente.grupo = validarGrupo(cambios.grupo)
    return siguiente
  })
}

export function desactivarPersona(roster, id) {
  return mapear(roster, id, (p) => ({ ...p, activo: false }))
}

export function reactivarPersona(roster, id) {
  return mapear(roster, id, (p) => ({ ...p, activo: true }))
}

export function activos(gente) {
  return ordenarPorNombre(gente.filter((p) => p.activo))
}

export function buscarPersonas(gente, busqueda) {
  return ordenarPorNombre(gente.filter((p) => coincide(p.nombre, busqueda)))
}
```

- [ ] **Step 4: Correr las pruebas**

Run: `npx vitest run test/modelo/roster.test.js`
Expected: PASS, 13 pruebas.

- [ ] **Step 5: Commit**

```bash
git add js/modelo/roster.js test/modelo/roster.test.js
git commit -m "Modelo de roster con baja logica e ids estables"
```

---

## Task 9: Modelo de lista y emparejamiento

**Files:**
- Create: `js/modelo/lista.js`
- Test: `test/modelo/lista.test.js`

- [ ] **Step 1: Escribir la prueba que falla**

```js
import { describe, it, expect } from 'vitest'
import {
  crearLista, asignarVoluntario, quitarVoluntario, fusionarParticipantes,
  separarParticipante, moverAGrupo, agregarApoyo, contarPendientes, filaDe,
} from '../../js/modelo/lista.js'
import { ROSTER } from '../ayudas/datos.js'

describe('crearLista', () => {
  it('crea dos grupos con la fecha dada', () => {
    const l = crearLista('2026-08-08', ROSTER)
    expect(l.fecha).toBe('2026-08-08')
    expect(l.grupos).toHaveLength(2)
    expect(l.grupos[0].numero).toBe(1)
    expect(l.grupos[1].numero).toBe(2)
  })

  it('pone a cada participante activo en su grupo habitual, sin voluntario', () => {
    const l = crearLista('2026-08-08', ROSTER)
    expect(l.grupos[0].filas).toHaveLength(3)
    expect(l.grupos[1].filas).toHaveLength(2)
    l.grupos.forEach((g) => g.filas.forEach((f) => expect(f.voluntarios).toEqual([])))
  })

  it('excluye a los inactivos', () => {
    const l = crearLista('2026-08-08', ROSTER)
    const ids = l.grupos.flatMap((g) => g.filas.flatMap((f) => f.participantes))
    expect(ids).not.toContain('p6')
  })

  it('trae los subtitulos y canchas por defecto', () => {
    const l = crearLista('2026-08-08', ROSTER)
    expect(l.grupos[0].subtitulo).toBe('5 a 9 años')
    expect(l.grupos[1].subtitulo).toBe('10 a 17 años')
    expect(l.grupos[0].cancha).toBe('Cancha 1')
  })
})

describe('asignarVoluntario', () => {
  it('agrega el voluntario a la fila del participante', () => {
    const l = asignarVoluntario(crearLista('2026-08-08', ROSTER), 'p1', 'v1')
    expect(filaDe(l, 'p1').voluntarios).toEqual(['v1'])
  })

  it('un segundo voluntario se suma a la misma fila', () => {
    let l = crearLista('2026-08-08', ROSTER)
    l = asignarVoluntario(l, 'p1', 'v1')
    l = asignarVoluntario(l, 'p1', 'v2')
    expect(filaDe(l, 'p1').voluntarios).toEqual(['v1', 'v2'])
  })

  it('el mismo voluntario dos veces no se duplica', () => {
    let l = crearLista('2026-08-08', ROSTER)
    l = asignarVoluntario(l, 'p1', 'v1')
    l = asignarVoluntario(l, 'p1', 'v1')
    expect(filaDe(l, 'p1').voluntarios).toEqual(['v1'])
  })

  it('un voluntario puede estar en dos filas a la vez', () => {
    let l = crearLista('2026-08-08', ROSTER)
    l = asignarVoluntario(l, 'p1', 'v1')
    l = asignarVoluntario(l, 'p2', 'v1')
    expect(filaDe(l, 'p1').voluntarios).toEqual(['v1'])
    expect(filaDe(l, 'p2').voluntarios).toEqual(['v1'])
  })

  it('no modifica la lista original', () => {
    const l = crearLista('2026-08-08', ROSTER)
    asignarVoluntario(l, 'p1', 'v1')
    expect(filaDe(l, 'p1').voluntarios).toEqual([])
  })
})

describe('quitarVoluntario', () => {
  it('lo saca dejando la fila valida y vacia', () => {
    let l = asignarVoluntario(crearLista('2026-08-08', ROSTER), 'p1', 'v1')
    l = quitarVoluntario(l, 'p1', 'v1')
    expect(filaDe(l, 'p1').voluntarios).toEqual([])
  })
})

describe('fusionarParticipantes', () => {
  it('junta dos participantes en una sola fila', () => {
    let l = crearLista('2026-08-08', ROSTER)
    l = fusionarParticipantes(l, 'p1', 'p2')
    expect(filaDe(l, 'p1').participantes).toEqual(['p1', 'p2'])
    expect(l.grupos[0].filas).toHaveLength(2)
  })

  it('conserva los voluntarios de ambas filas sin duplicar', () => {
    let l = crearLista('2026-08-08', ROSTER)
    l = asignarVoluntario(l, 'p1', 'v1')
    l = asignarVoluntario(l, 'p2', 'v1')
    l = asignarVoluntario(l, 'p2', 'v2')
    l = fusionarParticipantes(l, 'p1', 'p2')
    expect(filaDe(l, 'p1').voluntarios).toEqual(['v1', 'v2'])
  })

  it('rechaza fusionar participantes de grupos distintos', () => {
    const l = crearLista('2026-08-08', ROSTER)
    expect(() => fusionarParticipantes(l, 'p1', 'p4')).toThrow(/grupo/i)
  })
})

describe('separarParticipante', () => {
  it('devuelve al participante a su propia fila', () => {
    let l = fusionarParticipantes(crearLista('2026-08-08', ROSTER), 'p1', 'p2')
    l = separarParticipante(l, 'p2')
    expect(filaDe(l, 'p1').participantes).toEqual(['p1'])
    expect(filaDe(l, 'p2').participantes).toEqual(['p2'])
  })
})

describe('moverAGrupo', () => {
  it('mueve la fila al otro grupo', () => {
    const l = moverAGrupo(crearLista('2026-08-08', ROSTER), 'p1', 2)
    expect(l.grupos[0].filas).toHaveLength(2)
    expect(l.grupos[1].filas.some((f) => f.participantes.includes('p1'))).toBe(true)
  })
})

describe('agregarApoyo', () => {
  it('agrega el voluntario de apoyo al grupo', () => {
    const l = agregarApoyo(crearLista('2026-08-08', ROSTER), 2, 'v5')
    expect(l.grupos[1].apoyo).toEqual(['v5'])
  })
})

describe('contarPendientes', () => {
  it('cuenta participantes sin voluntario y voluntarios sin asignar', () => {
    let l = crearLista('2026-08-08', ROSTER)
    l = asignarVoluntario(l, 'p1', 'v1')
    const c = contarPendientes(l, 1, ROSTER)
    expect(c.participantesSinVoluntario).toBe(2)
    expect(c.voluntariosSinAsignar).toBe(4)
  })
})
```

- [ ] **Step 2: Correr la prueba para verificar que falla**

Run: `npx vitest run test/modelo/lista.test.js`
Expected: FAIL, no se resuelve el import.

- [ ] **Step 3: Escribir la implementación**

```js
import { activos } from './roster.js'

const POR_DEFECTO = {
  1: { titulo: 'Grupo 1', subtitulo: '5 a 9 años', cancha: 'Cancha 1' },
  2: { titulo: 'Grupo 2', subtitulo: '10 a 17 años', cancha: 'Cancha 2' },
}

export function crearLista(fecha, roster, base = {}) {
  const gente = activos(roster.participantes)
  const grupos = [1, 2].map((numero) => ({
    numero,
    ...POR_DEFECTO[numero],
    filas: gente
      .filter((p) => p.grupo === numero)
      .map((p) => ({ participantes: [p.id], voluntarios: [] })),
    apoyo: [],
  }))
  return {
    version: 1,
    fecha,
    hora: base.hora ?? '11:00',
    lugar: base.lugar ?? 'Tres Cruces',
    coordinacion: base.coordinacion ?? [],
    grupos,
    opcionesImagen: { saludo: true, despedida: true, fotos: true, compacto: false },
  }
}

function ubicar(lista, participanteId) {
  for (let g = 0; g < lista.grupos.length; g += 1) {
    const f = lista.grupos[g].filas.findIndex((fila) => fila.participantes.includes(participanteId))
    if (f !== -1) return { g, f }
  }
  throw new Error(`El participante ${participanteId} no esta en la lista`)
}

export function filaDe(lista, participanteId) {
  const { g, f } = ubicar(lista, participanteId)
  return lista.grupos[g].filas[f]
}

function conFilas(lista, g, filas) {
  const grupos = lista.grupos.map((grupo, i) => (i === g ? { ...grupo, filas } : grupo))
  return { ...lista, grupos }
}

function cambiarFila(lista, participanteId, transformar) {
  const { g, f } = ubicar(lista, participanteId)
  const filas = lista.grupos[g].filas.map((fila, i) => (i === f ? transformar(fila) : fila))
  return conFilas(lista, g, filas)
}

export function asignarVoluntario(lista, participanteId, voluntarioId) {
  return cambiarFila(lista, participanteId, (fila) =>
    fila.voluntarios.includes(voluntarioId)
      ? fila
      : { ...fila, voluntarios: [...fila.voluntarios, voluntarioId] })
}

export function quitarVoluntario(lista, participanteId, voluntarioId) {
  return cambiarFila(lista, participanteId, (fila) => ({
    ...fila,
    voluntarios: fila.voluntarios.filter((id) => id !== voluntarioId),
  }))
}

export function fusionarParticipantes(lista, destinoId, origenId) {
  const destino = ubicar(lista, destinoId)
  const origen = ubicar(lista, origenId)
  if (destino.g !== origen.g) {
    throw new Error('No se pueden fusionar participantes de grupo distinto')
  }
  if (destino.f === origen.f) return lista

  const filaDestino = lista.grupos[destino.g].filas[destino.f]
  const filaOrigen = lista.grupos[origen.g].filas[origen.f]
  const fusionada = {
    participantes: [...filaDestino.participantes, ...filaOrigen.participantes],
    voluntarios: [...new Set([...filaDestino.voluntarios, ...filaOrigen.voluntarios])],
  }
  const filas = lista.grupos[destino.g].filas
    .map((fila, i) => (i === destino.f ? fusionada : fila))
    .filter((_, i) => i !== origen.f)
  return conFilas(lista, destino.g, filas)
}

export function separarParticipante(lista, participanteId) {
  const { g, f } = ubicar(lista, participanteId)
  const fila = lista.grupos[g].filas[f]
  if (fila.participantes.length === 1) return lista
  const restante = {
    ...fila,
    participantes: fila.participantes.filter((id) => id !== participanteId),
  }
  const nueva = { participantes: [participanteId], voluntarios: [] }
  const filas = [...lista.grupos[g].filas]
  filas.splice(f, 1, restante, nueva)
  return conFilas(lista, g, filas)
}

export function moverAGrupo(lista, participanteId, numeroDestino) {
  const { g, f } = ubicar(lista, participanteId)
  const destino = lista.grupos.findIndex((grupo) => grupo.numero === numeroDestino)
  if (destino === -1) throw new Error(`No existe el grupo ${numeroDestino}`)
  if (destino === g) return lista
  const fila = lista.grupos[g].filas[f]
  const grupos = lista.grupos.map((grupo, i) => {
    if (i === g) return { ...grupo, filas: grupo.filas.filter((_, j) => j !== f) }
    if (i === destino) return { ...grupo, filas: [...grupo.filas, fila] }
    return grupo
  })
  return { ...lista, grupos }
}

export function agregarApoyo(lista, numeroGrupo, voluntarioId) {
  const grupos = lista.grupos.map((grupo) =>
    grupo.numero === numeroGrupo && !grupo.apoyo.includes(voluntarioId)
      ? { ...grupo, apoyo: [...grupo.apoyo, voluntarioId] }
      : grupo)
  return { ...lista, grupos }
}

export function quitarApoyo(lista, numeroGrupo, voluntarioId) {
  const grupos = lista.grupos.map((grupo) =>
    grupo.numero === numeroGrupo
      ? { ...grupo, apoyo: grupo.apoyo.filter((id) => id !== voluntarioId) }
      : grupo)
  return { ...lista, grupos }
}

export function contarPendientes(lista, numeroGrupo, roster) {
  const grupo = lista.grupos.find((g) => g.numero === numeroGrupo)
  if (!grupo) throw new Error(`No existe el grupo ${numeroGrupo}`)
  const asignados = new Set(lista.grupos.flatMap((g) =>
    [...g.filas.flatMap((f) => f.voluntarios), ...g.apoyo]))
  return {
    participantesSinVoluntario: grupo.filas.filter((f) => f.voluntarios.length === 0).length,
    voluntariosSinAsignar: activos(roster.voluntarios).filter((v) => !asignados.has(v.id)).length,
  }
}
```

- [ ] **Step 4: Correr las pruebas**

Run: `npx vitest run test/modelo/lista.test.js`
Expected: PASS, 17 pruebas.

- [ ] **Step 5: Commit**

```bash
git add js/modelo/lista.js test/modelo/lista.test.js
git commit -m "Modelo de lista con emparejamiento uno a varios y varios a uno"
```

---

## Task 10: Deshacer

Como todas las operaciones del modelo devuelven listas nuevas sin tocar la anterior, deshacer es una pila de estados y nada más.

**Files:**
- Create: `js/modelo/deshacer.js`
- Test: `test/modelo/deshacer.test.js`

- [ ] **Step 1: Escribir la prueba que falla**

```js
import { describe, it, expect } from 'vitest'
import { crearPila } from '../../js/modelo/deshacer.js'

describe('crearPila', () => {
  it('empieza con el estado inicial y sin poder deshacer', () => {
    const pila = crearPila({ n: 0 })
    expect(pila.actual()).toEqual({ n: 0 })
    expect(pila.sePuedeDeshacer()).toBe(false)
  })

  it('registra un estado nuevo y permite volver', () => {
    const pila = crearPila({ n: 0 })
    pila.registrar({ n: 1 })
    expect(pila.actual()).toEqual({ n: 1 })
    expect(pila.sePuedeDeshacer()).toBe(true)
    expect(pila.deshacer()).toEqual({ n: 0 })
    expect(pila.actual()).toEqual({ n: 0 })
  })

  it('rehacer vuelve adelante', () => {
    const pila = crearPila({ n: 0 })
    pila.registrar({ n: 1 })
    pila.deshacer()
    expect(pila.sePuedeRehacer()).toBe(true)
    expect(pila.rehacer()).toEqual({ n: 1 })
  })

  it('registrar despues de deshacer descarta el futuro', () => {
    const pila = crearPila({ n: 0 })
    pila.registrar({ n: 1 })
    pila.deshacer()
    pila.registrar({ n: 9 })
    expect(pila.sePuedeRehacer()).toBe(false)
    expect(pila.actual()).toEqual({ n: 9 })
  })

  it('deshacer sin historia devuelve el estado actual', () => {
    const pila = crearPila({ n: 0 })
    expect(pila.deshacer()).toEqual({ n: 0 })
  })

  it('recorta la historia al limite dado', () => {
    const pila = crearPila({ n: 0 }, 3)
    for (let i = 1; i <= 10; i += 1) pila.registrar({ n: i })
    let veces = 0
    while (pila.sePuedeDeshacer()) { pila.deshacer(); veces += 1 }
    expect(veces).toBe(3)
  })
})
```

- [ ] **Step 2: Correr la prueba para verificar que falla**

Run: `npx vitest run test/modelo/deshacer.test.js`
Expected: FAIL, no se resuelve el import.

- [ ] **Step 3: Escribir la implementación**

```js
export function crearPila(estadoInicial, limite = 50) {
  let estados = [estadoInicial]
  let indice = 0

  return {
    actual: () => estados[indice],
    sePuedeDeshacer: () => indice > 0,
    sePuedeRehacer: () => indice < estados.length - 1,
    registrar(estado) {
      estados = [...estados.slice(0, indice + 1), estado]
      if (estados.length > limite + 1) estados = estados.slice(estados.length - (limite + 1))
      indice = estados.length - 1
      return estado
    },
    deshacer() {
      if (indice > 0) indice -= 1
      return estados[indice]
    },
    rehacer() {
      if (indice < estados.length - 1) indice += 1
      return estados[indice]
    },
  }
}
```

- [ ] **Step 4: Correr las pruebas**

Run: `npx vitest run test/modelo/deshacer.test.js`
Expected: PASS, 6 pruebas.

- [ ] **Step 5: Commit**

```bash
git add js/modelo/deshacer.js test/modelo/deshacer.test.js
git commit -m "Pila de deshacer y rehacer con limite"
```

---

## Task 11: Almacenamiento local tras la interfaz de ocho funciones

**Files:**
- Create: `js/almacen/local.js`, `js/almacen/indice.js`
- Test: `test/almacen/local.test.js`

- [ ] **Step 1: Instalar el doble de IndexedDB para pruebas**

Run: `npm install --save-dev fake-indexeddb`
Expected: se agrega a `devDependencies`.

- [ ] **Step 2: Escribir la prueba que falla**

```js
import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { crearAlmacenLocal } from '../../js/almacen/local.js'
import { ROSTER, LISTA } from '../ayudas/datos.js'

let almacen

beforeEach(async () => {
  indexedDB.deleteDatabase('voluntarios-fsb')
  almacen = await crearAlmacenLocal()
})

describe('almacen local', () => {
  it('devuelve un roster vacio cuando no hay nada guardado', async () => {
    const r = await almacen.leerRoster()
    expect(r.participantes).toEqual([])
    expect(r.voluntarios).toEqual([])
  })

  it('guarda y recupera el roster', async () => {
    await almacen.guardarRoster(ROSTER)
    const r = await almacen.leerRoster()
    expect(r.participantes).toHaveLength(ROSTER.participantes.length)
    expect(r.participantes[0].nombre).toBe('Gonzalo')
  })

  it('guarda y recupera una lista por fecha', async () => {
    await almacen.guardarLista(LISTA)
    const l = await almacen.leerLista('2026-08-08')
    expect(l.fecha).toBe('2026-08-08')
    expect(l.grupos).toHaveLength(2)
  })

  it('devuelve null para una fecha sin lista', async () => {
    expect(await almacen.leerLista('1999-01-01')).toBeNull()
  })

  it('lista las fechas guardadas, de la mas nueva a la mas vieja', async () => {
    await almacen.guardarLista({ ...LISTA, fecha: '2026-08-01' })
    await almacen.guardarLista({ ...LISTA, fecha: '2026-08-15' })
    await almacen.guardarLista({ ...LISTA, fecha: '2026-08-08' })
    const fechas = (await almacen.listarListas()).map((x) => x.fecha)
    expect(fechas).toEqual(['2026-08-15', '2026-08-08', '2026-08-01'])
  })

  it('guardar dos veces la misma fecha sobrescribe', async () => {
    await almacen.guardarLista(LISTA)
    await almacen.guardarLista({ ...LISTA, lugar: 'Otro lugar' })
    expect((await almacen.listarListas())).toHaveLength(1)
    expect((await almacen.leerLista('2026-08-08')).lugar).toBe('Otro lugar')
  })

  it('guarda y recupera una foto como blob', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' })
    await almacen.guardarFoto('p1.jpg', blob)
    const recuperada = await almacen.leerFoto('p1.jpg')
    expect(recuperada).toBeInstanceOf(Blob)
    expect(recuperada.size).toBe(3)
  })

  it('devuelve null para una foto inexistente', async () => {
    expect(await almacen.leerFoto('no-existe.jpg')).toBeNull()
  })

  it('borra una foto', async () => {
    const blob = new Blob([new Uint8Array([1])], { type: 'image/jpeg' })
    await almacen.guardarFoto('p1.jpg', blob)
    await almacen.borrarFoto('p1.jpg')
    expect(await almacen.leerFoto('p1.jpg')).toBeNull()
  })

  it('lo guardado sobrevive a reabrir la base', async () => {
    await almacen.guardarRoster(ROSTER)
    const otro = await crearAlmacenLocal()
    expect((await otro.leerRoster()).participantes).toHaveLength(ROSTER.participantes.length)
  })
})
```

- [ ] **Step 3: Correr la prueba para verificar que falla**

Run: `npx vitest run test/almacen/local.test.js`
Expected: FAIL, no se resuelve el import.

- [ ] **Step 4: Escribir `js/almacen/local.js`**

```js
const BASE = 'voluntarios-fsb'
const VERSION = 1
const DEPOSITOS = { roster: 'roster', listas: 'listas', fotos: 'fotos' }

function abrir() {
  return new Promise((resolver, rechazar) => {
    const solicitud = indexedDB.open(BASE, VERSION)
    solicitud.onupgradeneeded = () => {
      const db = solicitud.result
      if (!db.objectStoreNames.contains(DEPOSITOS.roster)) db.createObjectStore(DEPOSITOS.roster)
      if (!db.objectStoreNames.contains(DEPOSITOS.listas)) db.createObjectStore(DEPOSITOS.listas)
      if (!db.objectStoreNames.contains(DEPOSITOS.fotos)) db.createObjectStore(DEPOSITOS.fotos)
    }
    solicitud.onsuccess = () => resolver(solicitud.result)
    solicitud.onerror = () => rechazar(solicitud.error)
  })
}

function operar(db, deposito, modo, accion) {
  return new Promise((resolver, rechazar) => {
    const transaccion = db.transaction(deposito, modo)
    const solicitud = accion(transaccion.objectStore(deposito))
    transaccion.onerror = () => rechazar(transaccion.error)
    if (solicitud) {
      solicitud.onsuccess = () => resolver(solicitud.result)
      solicitud.onerror = () => rechazar(solicitud.error)
    } else {
      transaccion.oncomplete = () => resolver(undefined)
    }
  })
}

export async function crearAlmacenLocal() {
  const db = await abrir()

  return {
    async leerRoster() {
      const guardado = await operar(db, DEPOSITOS.roster, 'readonly', (d) => d.get('actual'))
      return guardado ?? { version: 1, participantes: [], voluntarios: [] }
    },

    async guardarRoster(roster) {
      await operar(db, DEPOSITOS.roster, 'readwrite', (d) => d.put(roster, 'actual'))
      return { sha: null }
    },

    async leerLista(fecha) {
      const guardada = await operar(db, DEPOSITOS.listas, 'readonly', (d) => d.get(fecha))
      return guardada ?? null
    },

    async guardarLista(lista) {
      await operar(db, DEPOSITOS.listas, 'readwrite', (d) => d.put(lista, lista.fecha))
      return { sha: null }
    },

    async listarListas() {
      const claves = await operar(db, DEPOSITOS.listas, 'readonly', (d) => d.getAllKeys())
      return [...claves].sort().reverse().map((fecha) => ({ fecha, sha: null }))
    },

    async leerFoto(clave) {
      const blob = await operar(db, DEPOSITOS.fotos, 'readonly', (d) => d.get(clave))
      return blob ?? null
    },

    async guardarFoto(clave, blob) {
      await operar(db, DEPOSITOS.fotos, 'readwrite', (d) => d.put(blob, clave))
    },

    async borrarFoto(clave) {
      await operar(db, DEPOSITOS.fotos, 'readwrite', (d) => d.delete(clave))
    },
  }
}
```

- [ ] **Step 5: Escribir `js/almacen/indice.js`**

Este archivo es el único punto por el que la interfaz habla con los datos. Hoy elige siempre el respaldo local. En el hito 3 aprende a elegir el de GitHub, y ninguna pantalla se entera.

```js
import { crearAlmacenLocal } from './local.js'

let instancia = null

export async function almacen() {
  if (!instancia) instancia = await crearAlmacenLocal()
  return instancia
}

export function reiniciarAlmacen() {
  instancia = null
}
```

- [ ] **Step 6: Correr las pruebas**

Run: `npx vitest run test/almacen/local.test.js`
Expected: PASS, 10 pruebas.

- [ ] **Step 7: Commit**

```bash
git add js/almacen/local.js js/almacen/indice.js test/almacen/local.test.js package.json package-lock.json
git commit -m "Almacenamiento local en IndexedDB tras la interfaz comun"
```

---

## Task 12: Componentes de interfaz

**Files:**
- Create: `js/ui/componentes.js`
- Modify: `css/estilos.css`
- Test: `test/ui/componentes.test.js`

- [ ] **Step 1: Instalar el entorno de DOM para pruebas**

Run: `npm install --save-dev jsdom`

Modificar `vitest.config.js` para que los archivos bajo `test/ui/` corran con DOM y el resto siga en Node:

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
    environmentMatchGlobs: [['test/ui/**', 'jsdom']],
  },
})
```

- [ ] **Step 2: Escribir la prueba que falla**

```js
import { describe, it, expect } from 'vitest'
import { ficha, boton, escapar } from '../../js/ui/componentes.js'

describe('escapar', () => {
  it('neutraliza los caracteres peligrosos de HTML', () => {
    expect(escapar('<script>')).toBe('&lt;script&gt;')
    expect(escapar('a & b')).toBe('a &amp; b')
    expect(escapar('"x"')).toBe('&quot;x&quot;')
  })
})

describe('ficha', () => {
  it('crea un boton con el nombre de la persona', () => {
    const el = ficha({ id: 'p1', nombre: 'Gonzalo' })
    expect(el.tagName).toBe('BUTTON')
    expect(el.textContent).toContain('Gonzalo')
    expect(el.dataset.id).toBe('p1')
  })

  it('un nombre con HTML no se interpreta', () => {
    const el = ficha({ id: 'p1', nombre: '<b>Gonzalo</b>' })
    expect(el.querySelector('b')).toBeNull()
    expect(el.textContent).toContain('<b>Gonzalo</b>')
  })

  it('marca la ficha seleccionada', () => {
    expect(ficha({ id: 'p1', nombre: 'X' }, { seleccionada: true }).getAttribute('aria-pressed')).toBe('true')
    expect(ficha({ id: 'p1', nombre: 'X' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('atenua la ficha asignada sin deshabilitarla', () => {
    const el = ficha({ id: 'v1', nombre: 'Abi' }, { atenuada: true })
    expect(el.classList.contains('atenuada')).toBe(true)
    expect(el.disabled).toBe(false)
  })

  it('muestra la pastilla de nuevo', () => {
    expect(ficha({ id: 'v1', nombre: 'Julián', nuevo: true }).textContent).toContain('nuevo')
  })
})

describe('boton', () => {
  it('crea un boton con etiqueta accesible y ejecuta al hacer clic', () => {
    let veces = 0
    const el = boton('Deshacer', () => { veces += 1 })
    el.click()
    expect(el.textContent).toBe('Deshacer')
    expect(veces).toBe(1)
  })
})
```

- [ ] **Step 3: Correr la prueba para verificar que falla**

Run: `npx vitest run test/ui/componentes.test.js`
Expected: FAIL, no se resuelve el import.

- [ ] **Step 4: Escribir `js/ui/componentes.js`**

```js
export function escapar(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function elemento(etiqueta, clases = [], texto = null) {
  const el = document.createElement(etiqueta)
  if (clases.length) el.className = clases.join(' ')
  if (texto !== null) el.textContent = texto
  return el
}

export function ficha(persona, opciones = {}) {
  const el = elemento('button', ['ficha'])
  el.type = 'button'
  el.dataset.id = persona.id
  el.setAttribute('aria-pressed', opciones.seleccionada ? 'true' : 'false')
  if (opciones.seleccionada) el.classList.add('seleccionada')
  if (opciones.atenuada) el.classList.add('atenuada')

  el.appendChild(elemento('span', ['ficha-nombre'], persona.nombre))
  if (persona.nuevo) el.appendChild(elemento('span', ['pastilla'], 'nuevo'))
  if (opciones.detalle) el.appendChild(elemento('span', ['ficha-detalle'], opciones.detalle))
  return el
}

export function boton(etiqueta, alHacerClic, clases = []) {
  const el = elemento('button', ['boton', ...clases], etiqueta)
  el.type = 'button'
  el.addEventListener('click', alHacerClic)
  return el
}

export function vaciar(contenedor) {
  while (contenedor.firstChild) contenedor.removeChild(contenedor.firstChild)
}
```

Los nombres se insertan con `textContent`, nunca con `innerHTML`. `escapar` existe para los pocos lugares donde haga falta armar HTML como cadena, y su prueba documenta por qué. Aunque los datos los escriba la propia coordinación, un nombre con un signo menor rompería la pantalla, y esa es razón suficiente.

- [ ] **Step 5: Agregar los estilos a `css/estilos.css`**

```css
.ficha {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  min-height: 44px;
  border: 1px solid var(--linea);
  border-radius: 22px;
  background: var(--fondo);
  font: inherit;
  font-size: 15px;
  color: var(--texto);
  cursor: pointer;
}
.ficha.seleccionada {
  border-color: var(--violeta);
  background: #F3E9F7;
  color: var(--violeta);
}
.ficha.atenuada { opacity: 0.45; }
.pastilla {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: #F3E9F7;
  color: var(--violeta);
}
.boton {
  min-height: 44px;
  padding: 10px 18px;
  border: 1px solid var(--violeta);
  border-radius: 10px;
  background: var(--fondo);
  color: var(--violeta);
  font: inherit;
  cursor: pointer;
}
.boton:disabled { opacity: 0.4; cursor: default; }
```

La altura mínima de 44 píxeles no es decorativa: es el objetivo táctil mínimo que recomienda Apple, y la aplicación se usa con el pulgar un viernes a la noche.

- [ ] **Step 6: Correr las pruebas**

Run: `npx vitest run test/ui/componentes.test.js`
Expected: PASS, 7 pruebas.

- [ ] **Step 7: Commit**

```bash
git add js/ui/componentes.js css/estilos.css vitest.config.js test/ui/componentes.test.js package.json package-lock.json
git commit -m "Componentes de interfaz con objetivos tactiles y nombres sin interpretar"
```

---

## Task 13: Pantalla de armado de lista

**Files:**
- Create: `js/ui/pantalla-lista.js`
- Modify: `css/estilos.css`
- Test: `test/ui/pantalla-lista.test.js`

- [ ] **Step 1: Escribir la prueba que falla**

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { crearPantallaLista } from '../../js/ui/pantalla-lista.js'
import { crearLista } from '../../js/modelo/lista.js'
import { ROSTER } from '../ayudas/datos.js'

let raiz, pantalla

beforeEach(() => {
  document.body.innerHTML = '<div id="raiz"></div>'
  raiz = document.getElementById('raiz')
  pantalla = crearPantallaLista(raiz, {
    lista: crearLista('2026-08-08', ROSTER),
    roster: ROSTER,
    alCambiar: () => {},
  })
})

const fichas = (sel) => [...raiz.querySelectorAll(sel)]
const porNombre = (sel, nombre) => fichas(sel).find((f) => f.textContent.includes(nombre))

describe('pantalla de armado', () => {
  it('dibuja los dos grupos', () => {
    expect(raiz.querySelectorAll('.grupo')).toHaveLength(2)
  })

  it('dibuja una ficha por participante activo', () => {
    expect(fichas('.columna-participantes .ficha')).toHaveLength(5)
  })

  it('repite la lista completa de voluntarios en cada grupo', () => {
    expect(fichas('.columna-voluntarios .ficha')).toHaveLength(10)
    expect(raiz.querySelectorAll('.grupo')[0].querySelectorAll('.columna-voluntarios .ficha')).toHaveLength(5)
  })

  it('tocar un participante lo selecciona', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    expect(porNombre('.columna-participantes .ficha', 'Gonzalo').getAttribute('aria-pressed')).toBe('true')
  })

  it('tocar participante y luego voluntario los empareja', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    expect(pantalla.lista().grupos[0].filas[0].voluntarios).toContain('v1')
  })

  it('tocar un segundo voluntario lo suma a la misma fila', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Cris').click()
    const fila = pantalla.lista().grupos[0].filas.find((f) => f.participantes.includes('p1'))
    expect(fila.voluntarios).toHaveLength(2)
  })

  it('tocar un voluntario sin participante seleccionado no hace nada', () => {
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    expect(pantalla.lista().grupos[0].filas.every((f) => f.voluntarios.length === 0)).toBe(true)
  })

  it('atenua al voluntario ya asignado sin deshabilitarlo', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    const abi = porNombre('.columna-voluntarios .ficha', 'Abi')
    expect(abi.classList.contains('atenuada')).toBe(true)
    expect(abi.disabled).toBe(false)
  })

  it('muestra el conteo de pendientes por grupo', () => {
    expect(raiz.querySelector('.grupo .pendientes').textContent).toMatch(/3/)
  })

  it('un participante sin voluntario no se marca como error', () => {
    const sofi = porNombre('.columna-participantes .ficha', 'Sofi')
    expect(sofi.classList.contains('error')).toBe(false)
    expect(sofi.getAttribute('aria-invalid')).toBeNull()
  })

  it('deshacer revierte el ultimo emparejamiento', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    raiz.querySelector('[data-accion="deshacer"]').click()
    expect(pantalla.lista().grupos[0].filas[0].voluntarios).toEqual([])
  })

  it('tocar un voluntario ya asignado al mismo participante lo quita', () => {
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    expect(pantalla.lista().grupos[0].filas[0].voluntarios).toEqual([])
  })

  it('avisa al cambiar la lista', () => {
    let avisos = 0
    const p = crearPantallaLista(raiz, {
      lista: crearLista('2026-08-08', ROSTER),
      roster: ROSTER,
      alCambiar: () => { avisos += 1 },
    })
    porNombre('.columna-participantes .ficha', 'Gonzalo').click()
    porNombre('.columna-voluntarios .ficha', 'Abi').click()
    expect(avisos).toBe(1)
    expect(p.lista()).toBeTruthy()
  })
})
```

- [ ] **Step 2: Correr la prueba para verificar que falla**

Run: `npx vitest run test/ui/pantalla-lista.test.js`
Expected: FAIL, no se resuelve el import.

- [ ] **Step 3: Escribir `js/ui/pantalla-lista.js`**

```js
import { ficha, boton, elemento, vaciar } from './componentes.js'
import { activos } from '../modelo/roster.js'
import { asignarVoluntario, quitarVoluntario, contarPendientes, filaDe } from '../modelo/lista.js'
import { crearPila } from '../modelo/deshacer.js'

export function crearPantallaLista(raiz, { lista, roster, alCambiar }) {
  const pila = crearPila(lista)
  let seleccionado = null

  function estado() { return pila.actual() }

  function voluntariosAsignados() {
    return new Set(estado().grupos.flatMap((g) =>
      [...g.filas.flatMap((f) => f.voluntarios), ...g.apoyo]))
  }

  function alTocarParticipante(id) {
    seleccionado = seleccionado === id ? null : id
    dibujar()
  }

  function alTocarVoluntario(id) {
    if (!seleccionado) return
    const yaEsta = filaDe(estado(), seleccionado).voluntarios.includes(id)
    const siguiente = yaEsta
      ? quitarVoluntario(estado(), seleccionado, id)
      : asignarVoluntario(estado(), seleccionado, id)
    pila.registrar(siguiente)
    seleccionado = null
    alCambiar(siguiente)
    dibujar()
  }

  function barra() {
    const barra = elemento('div', ['barra'])
    const deshacer = boton('Deshacer', () => {
      pila.deshacer()
      seleccionado = null
      alCambiar(estado())
      dibujar()
    })
    deshacer.dataset.accion = 'deshacer'
    deshacer.disabled = !pila.sePuedeDeshacer()

    const rehacer = boton('Rehacer', () => {
      pila.rehacer()
      seleccionado = null
      alCambiar(estado())
      dibujar()
    })
    rehacer.dataset.accion = 'rehacer'
    rehacer.disabled = !pila.sePuedeRehacer()

    barra.append(deshacer, rehacer)
    return barra
  }

  function dibujarGrupo(grupo) {
    const caja = elemento('section', ['grupo'])
    const encabezado = elemento('header', ['grupo-encabezado'])
    encabezado.appendChild(elemento('h2', [], `${grupo.titulo} · ${grupo.subtitulo}`))

    const cuenta = contarPendientes(estado(), grupo.numero, roster)
    encabezado.appendChild(elemento('p', ['pendientes'],
      `${cuenta.participantesSinVoluntario} sin acompañante · ${cuenta.voluntariosSinAsignar} voluntarios libres`))
    caja.appendChild(encabezado)

    const columnas = elemento('div', ['columnas'])
    const izquierda = elemento('div', ['columna', 'columna-participantes'])
    const derecha = elemento('div', ['columna', 'columna-voluntarios'])

    const porId = new Map([...roster.participantes, ...roster.voluntarios].map((p) => [p.id, p]))

    grupo.filas.forEach((fila) => {
      fila.participantes.forEach((id) => {
        const persona = porId.get(id)
        const detalle = fila.voluntarios.map((v) => porId.get(v)?.nombre).filter(Boolean).join(' / ')
        const el = ficha(persona, { seleccionada: seleccionado === id, detalle })
        el.addEventListener('click', () => alTocarParticipante(id))
        izquierda.appendChild(el)
      })
    })

    const asignados = voluntariosAsignados()
    activos(roster.voluntarios).forEach((voluntario) => {
      const el = ficha(voluntario, { atenuada: asignados.has(voluntario.id) })
      el.addEventListener('click', () => alTocarVoluntario(voluntario.id))
      derecha.appendChild(el)
    })

    columnas.append(izquierda, derecha)
    caja.appendChild(columnas)
    return caja
  }

  function dibujar() {
    vaciar(raiz)
    raiz.appendChild(barra())
    estado().grupos.forEach((grupo) => raiz.appendChild(dibujarGrupo(grupo)))
  }

  dibujar()
  return { lista: estado, redibujar: dibujar }
}
```

Ninguna clase `error` ni atributo `aria-invalid` se aplica a un participante sin voluntario, y hay una prueba que lo custodia. Es una decisión de la especificación, no un olvido: ese estado es correcto.

- [ ] **Step 4: Agregar los estilos**

```css
.barra { display: flex; gap: 8px; padding: 12px 16px; }
.grupo { padding: 8px 16px 24px; }
.grupo-encabezado h2 { font-size: 18px; font-weight: 500; margin: 0 0 4px; }
.pendientes { margin: 0 0 12px; font-size: 13px; color: var(--texto-suave); }
.columnas { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.columna { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.ficha-detalle { font-size: 12px; color: var(--magenta-texto); }
@media (max-width: 520px) {
  .columnas { grid-template-columns: 1fr; }
}
```

- [ ] **Step 5: Correr las pruebas**

Run: `npx vitest run test/ui/pantalla-lista.test.js`
Expected: PASS, 12 pruebas.

- [ ] **Step 6: Commit**

```bash
git add js/ui/pantalla-lista.js css/estilos.css test/ui/pantalla-lista.test.js
git commit -m "Pantalla de armado con emparejado por dos toques y deshacer"
```

---

## Task 14: Pantalla de personas con fotos, y armado de la aplicación

**Files:**
- Create: `js/ui/pantalla-personas.js`, `js/ui/fotos.js`
- Modify: `js/app.js`, `index.html`, `css/estilos.css`
- Test: `test/ui/fotos.test.js`

- [ ] **Step 1: Escribir la prueba que falla para el procesado de fotos**

```js
import { describe, it, expect } from 'vitest'
import { calcularRecorteCuadrado, LADO_FOTO } from '../../js/ui/fotos.js'

describe('calcularRecorteCuadrado', () => {
  it('recorta al centro una imagen apaisada', () => {
    const r = calcularRecorteCuadrado(1000, 500)
    expect(r.lado).toBe(500)
    expect(r.x).toBe(250)
    expect(r.y).toBe(0)
  })

  it('recorta al centro una imagen vertical', () => {
    const r = calcularRecorteCuadrado(500, 1000)
    expect(r.lado).toBe(500)
    expect(r.x).toBe(0)
    expect(r.y).toBe(250)
  })

  it('deja intacta una imagen ya cuadrada', () => {
    expect(calcularRecorteCuadrado(600, 600)).toEqual({ x: 0, y: 0, lado: 600 })
  })

  it('el lado de salida es 400 como fija la especificacion', () => {
    expect(LADO_FOTO).toBe(400)
  })
})
```

- [ ] **Step 2: Correr la prueba para verificar que falla**

Run: `npx vitest run test/ui/fotos.test.js`
Expected: FAIL, no se resuelve el import.

- [ ] **Step 3: Escribir `js/ui/fotos.js`**

```js
export const LADO_FOTO = 400
export const CALIDAD = 0.82

export function calcularRecorteCuadrado(ancho, alto) {
  const lado = Math.min(ancho, alto)
  return {
    x: Math.round((ancho - lado) / 2),
    y: Math.round((alto - lado) / 2),
    lado,
  }
}

export async function procesarFoto(archivo) {
  const mapa = await createImageBitmap(archivo)
  const { x, y, lado } = calcularRecorteCuadrado(mapa.width, mapa.height)
  const lienzo = document.createElement('canvas')
  lienzo.width = LADO_FOTO
  lienzo.height = LADO_FOTO
  const ctx = lienzo.getContext('2d')
  ctx.drawImage(mapa, x, y, lado, lado, 0, 0, LADO_FOTO, LADO_FOTO)
  mapa.close()
  return new Promise((resolver) => lienzo.toBlob(resolver, 'image/jpeg', CALIDAD))
}
```

- [ ] **Step 4: Escribir `js/ui/pantalla-personas.js`**

```js
import { elemento, boton, vaciar } from './componentes.js'
import { activos, agregarParticipante, agregarVoluntario, desactivarPersona, editarPersona } from '../modelo/roster.js'
import { procesarFoto } from './fotos.js'

export function crearPantallaPersonas(raiz, { roster, almacen, alCambiar }) {
  let actual = roster

  async function guardar(siguiente) {
    actual = siguiente
    await almacen.guardarRoster(actual)
    alCambiar(actual)
    dibujar()
  }

  function formulario(tipo) {
    const caja = elemento('form', ['formulario'])
    const nombre = document.createElement('input')
    nombre.type = 'text'
    nombre.required = true
    nombre.placeholder = tipo === 'participante' ? 'Nombre del participante' : 'Nombre del voluntario'
    caja.appendChild(nombre)

    let grupo
    if (tipo === 'participante') {
      grupo = document.createElement('select')
      grupo.innerHTML = '<option value="1">Grupo 1</option><option value="2">Grupo 2</option>'
      caja.appendChild(grupo)
    }

    let nuevo
    if (tipo === 'voluntario') {
      const etiqueta = elemento('label', [], '')
      nuevo = document.createElement('input')
      nuevo.type = 'checkbox'
      etiqueta.append(nuevo, document.createTextNode(' Es nuevo'))
      caja.appendChild(etiqueta)
    }

    const enviar = document.createElement('button')
    enviar.type = 'submit'
    enviar.className = 'boton'
    enviar.textContent = 'Agregar'
    caja.appendChild(enviar)

    caja.addEventListener('submit', async (evento) => {
      evento.preventDefault()
      if (!nombre.value.trim()) return
      const siguiente = tipo === 'participante'
        ? agregarParticipante(actual, { nombre: nombre.value, grupo: Number(grupo.value) })
        : agregarVoluntario(actual, { nombre: nombre.value, nuevo: nuevo.checked })
      nombre.value = ''
      await guardar(siguiente)
    })
    return caja
  }

  function filaPersona(persona, tipo) {
    const fila = elemento('div', ['fila-persona'])
    fila.dataset.id = persona.id
    fila.appendChild(elemento('span', ['fila-nombre'], persona.nombre))
    if (persona.nuevo) fila.appendChild(elemento('span', ['pastilla'], 'nuevo'))

    const foto = document.createElement('input')
    foto.type = 'file'
    foto.accept = 'image/*'
    foto.className = 'entrada-foto'
    foto.addEventListener('change', async () => {
      const archivo = foto.files?.[0]
      if (!archivo) return
      const blob = await procesarFoto(archivo)
      const clave = `${persona.id}.jpg`
      await almacen.guardarFoto(clave, blob)
      await guardar(editarPersona(actual, persona.id, { foto: clave }))
    })
    fila.appendChild(foto)

    fila.appendChild(boton('Quitar', async () => {
      if (!confirm(`¿Quitar a ${persona.nombre} de las listas nuevas? Las listas anteriores no cambian.`)) return
      await guardar(desactivarPersona(actual, persona.id))
    }))
    return fila
  }

  function dibujar() {
    vaciar(raiz)
    const seccionP = elemento('section', ['seccion'])
    seccionP.appendChild(elemento('h2', [], 'Participantes'))
    seccionP.appendChild(formulario('participante'))
    activos(actual.participantes).forEach((p) => seccionP.appendChild(filaPersona(p, 'participante')))

    const seccionV = elemento('section', ['seccion'])
    seccionV.appendChild(elemento('h2', [], 'Voluntarios'))
    seccionV.appendChild(formulario('voluntario'))
    activos(actual.voluntarios).forEach((v) => seccionV.appendChild(filaPersona(v, 'voluntario')))

    raiz.append(seccionP, seccionV)
  }

  dibujar()
  return { roster: () => actual, redibujar: dibujar }
}
```

- [ ] **Step 5: Reescribir `js/app.js` para unir las tres pantallas**

```js
import { almacen } from './almacen/indice.js'
import { crearPantallaLista } from './ui/pantalla-lista.js'
import { crearPantallaPersonas } from './ui/pantalla-personas.js'
import { crearLista } from './modelo/lista.js'
import { hoyISO } from './util/fechas.js'
import { boton, vaciar, elemento } from './ui/componentes.js'

const contenedor = document.getElementById('app')
const deposito = await almacen()

let roster = await deposito.leerRoster()
let lista = (await deposito.leerLista(hoyISO())) ?? crearLista(hoyISO(), roster)
let pantalla = 'lista'

function navegacion() {
  const nav = elemento('nav', ['navegacion'])
  const ir = (destino, etiqueta) => {
    const b = boton(etiqueta, () => { pantalla = destino; dibujar() })
    b.dataset.pantalla = destino
    if (pantalla === destino) b.classList.add('activa')
    return b
  }
  nav.append(ir('lista', 'Armar lista'), ir('personas', 'Personas'))
  return nav
}

function dibujar() {
  vaciar(contenedor)
  contenedor.appendChild(navegacion())
  const cuerpo = elemento('div', ['cuerpo'])
  contenedor.appendChild(cuerpo)

  if (pantalla === 'lista') {
    crearPantallaLista(cuerpo, {
      lista,
      roster,
      alCambiar: async (siguiente) => {
        lista = siguiente
        await deposito.guardarLista(lista)
      },
    })
  } else {
    crearPantallaPersonas(cuerpo, {
      roster,
      almacen: deposito,
      alCambiar: (siguiente) => {
        roster = siguiente
        lista = crearLista(lista.fecha, roster, lista)
      },
    })
  }
}

dibujar()
```

- [ ] **Step 6: Agregar los estilos que faltan**

```css
.navegacion { display: flex; gap: 8px; padding: 12px 16px; border-bottom: 1px solid var(--linea); }
.navegacion .activa { background: var(--violeta); color: var(--fondo); }
.seccion { padding: 16px; }
.seccion h2 { font-size: 18px; font-weight: 500; }
.formulario { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; align-items: center; }
.formulario input[type=text], .formulario select {
  min-height: 44px; padding: 8px 12px; font: inherit;
  border: 1px solid var(--linea); border-radius: 10px;
}
.fila-persona {
  display: flex; gap: 12px; align-items: center;
  padding: 10px 0; border-bottom: 1px solid var(--linea);
}
.fila-nombre { flex: 1; }
.entrada-foto { max-width: 180px; font-size: 13px; }
```

- [ ] **Step 7: Correr las pruebas de fotos y la batería completa**

Run: `npx vitest run`
Expected: PASS en todos los archivos.

- [ ] **Step 8: Verificar la aplicación a mano en el navegador**

Run: `npm run servir` y abrir `http://localhost:8765/`

1. Ir a Personas y agregar tres participantes al grupo 1 y dos voluntarios.
2. Subir una foto a un participante y confirmar que no da error.
3. Volver a Armar lista y confirmar que aparecen las personas nuevas.
4. Emparejar con dos toques, confirmar que el voluntario queda atenuado.
5. Tocar Deshacer y confirmar que se revierte.
6. Recargar la página y confirmar que todo sigue ahí.
7. Abrir con la ventana angosta, a 400 píxeles, y confirmar que las columnas se apilan y que todo se toca cómodo.

- [ ] **Step 9: Commit**

```bash
git add js/ui/pantalla-personas.js js/ui/fotos.js js/app.js css/estilos.css test/ui/fotos.test.js
git commit -m "Pantalla de personas con fotos y armado de la aplicacion"
```

---

## Cierre del hito 2

- [ ] **Correr todo y dejar constancia**

Run: `npx vitest run`
Expected: PASS. Anotar el total de pruebas en el mensaje del commit de cierre.

- [ ] **Borrar la página de demostración, que ya cumplió su función**

```bash
git rm demo.html js/demo.js
git commit -m "Quitar la pagina de demostracion, reemplazada por la aplicacion"
```

Nota: la vista previa integrada llega en el hito 3 junto con la pantalla correspondiente. Hasta entonces la imagen se verifica desde las pruebas de maquetación. Si se prefiere conservar `demo.html` como banco de pruebas visual, saltear este paso y decirlo, es una decisión razonable.

---

# Roadmap de los hitos 3 y 4

Se planifican en detalle en un documento aparte, una vez que el hito 1 esté a la vista y la composición de la imagen esté confirmada.

**Hito 3, acceso y sincronización.** Módulo de criptografía con PBKDF2 y AES-GCM y su prueba de ida y vuelta. Cliente de la API de GitHub con manejo de `sha` y de conflicto 409. Lectura de `usuarios.json` desde `raw.githubusercontent.com`. Pantalla de ingreso. Pantalla de coordinadoras con alta, baja y rotación de token. Cambio del selector en `js/almacen/indice.js` para elegir entre respaldo local y GitHub, que es el único archivo que se toca de todo lo construido en el hito 2. Pantalla de vista previa con los cuatro interruptores, descarga y compartir.

**Hito 4, historial y pulido.** Pantalla de historial y duplicado de la lista anterior. Avisos de repetición de duplas sobre las últimas ocho listas. Aviso de recorte de WhatsApp con exportación por grupo. Modo sin conexión de solo lectura. Prueba de humo con Playwright que verifica que cargar la página no produce ninguna petición fuera de GitHub, que es el criterio de aceptación 6. Publicación en GitHub Pages.

---

# Revisión del plan contra la especificación

| Sección de la especificación | Dónde se implementa |
| --- | --- |
| 4 Arquitectura, sin compilación | Tarea 1 |
| 4.1 Capa de almacenamiento | Tarea 11, interfaz completa, respaldo local |
| 4.2 Concurrencia por `sha` | Hito 3 |
| 4.3 Caché local | Tarea 11 |
| 5 Modelo de datos | Tareas 8 y 9 |
| 5.1 Fotos a 400 px y calidad 0,82 | Tarea 14 |
| 6 Acceso completo | Hito 3 |
| 7.1 Armar lista | Tarea 13 |
| 7.2 Vista previa | Tarea 7 en versión de demostración, pantalla definitiva en el hito 3 |
| 7.3 Personas | Tarea 14 |
| 7.4 Historial | Hito 4 |
| 7.5 Ajustes | Hito 3 |
| 8 Sugerencias de rotación | Hito 4 |
| 9 Generación de la imagen | Tareas 5, 6 y 7 |
| 9.2 Aviso de recorte | Tarea 5 calcula `recorteProbable`, la interfaz lo usa en el hito 4 |
| 9.3 Guión y barra simples, nunca raya | Tarea 5, con prueba dedicada |
| 10 Identidad visual y contraste | Tareas 1 y 3 |
| 11 Privacidad, sin recursos externos | Tarea 1 vendoriza fuente y logo, se verifica en el hito 4 |
| 14 Criterio 2, imagen idéntica a la vista previa | Garantizado por diseño en la tarea 6, verificado a mano en la tarea 7 paso 7 |
| 14 Criterio 4, participante sin voluntario | Tareas 5 y 13, con pruebas dedicadas |
| 14 Criterio 5, uno a varios y varios a uno | Tareas 5 y 9 |
| 14 Criterio 9, navegadores | Verificación manual en el hito 4 |

---

# Cambios autorizados durante la ejecución

El código que quedó en el repositorio difiere del que figura arriba en los puntos que siguen. Cada uno se autorizó explícitamente durante la implementación, con su motivo. Los bloques de código de las tareas de arriba NO se reescribieron, así que ante una diferencia manda esta sección.

## Tarea 3, tema

- `NORMAL` y `COMPACTO` se envuelven en `Object.freeze`. Motivo: `medidas()` devuelve el objeto compartido, y un consumidor que lo mutara corrompía el tema para todos los demás sin dejar rastro cerca de la causa.
- Se agregan seis claves de geometría del encabezado: `logoX`, `logoY`, `logoAncho`, `logoAlto`, `yTituloDesdeAbajo`, `ySubtituloDesdeAbajo`, con valores propios en cada modo. Motivo: ver tarea 5.
- `COMPACTO.altoBandaSuperior` pasa de 150 a 172. Motivo: la banda compacta no tenía altura para apilar logo, título y subtítulo sin superposición.

## Tarea 4, nombres

- `iniciales` toma el primer punto de código con `[...palabra][0]` en vez de la primera unidad UTF-16. Motivo: un nombre que empieza con emoji, habitual al pegar un contacto de WhatsApp, producía un sustituto suelto, una cadena inválida que se dibuja como un cuadrito roto en el círculo del avatar.

## Tarea 5, maquetación

- El círculo de iniciales usa `colorDeGrupo(numeroGrupo).tenue` en vez de la constante 1. Motivo: el plan contradecía la sección 9.3 de la especificación, que pide el color del grupo. Los chicos del grupo 2 sin foto salían con el tinte del grupo 1.
- La separación entre las dos líneas del encabezado pasa de 40 a 56 px, y la altura de línea de los párrafos de 1,45 a 1,6 veces el tamaño. Motivo: `textBaseline: 'top'` no es portable. Chromium ubica la línea base 39 px por debajo para texto de 52 px, WebKit 55 px, así que en Safari de iOS el título se montaba sobre la fecha.
- `quebrar` parte palabras más anchas que la columna y respeta los saltos de línea del texto. Motivo: un enlace pegado en el saludo se dibujaba 177 px fuera del lienzo, y un saludo de dos párrafos se aplastaba en uno solo.
- `maquetar` devuelve además `bordeDerecho` y `desborde`. Motivo: la altura ya avisaba con `recorteProbable` pero el ancho no tenía ningún control, y con nombres reales largos el margen derecho queda a 35 px de agotarse.
- Se elimina el medio margen duplicado antes de la despedida, y los guardas de saludo y despedida comparan la cadena recortada. Motivo: la despedida quedaba al doble de distancia que el saludo, y un saludo de solo espacios agregaba 28 px de nada.
- `filaDeAsignacion` falla con un error de dominio si la fila no tiene participantes, en vez de un `TypeError`.
- Se agregan pruebas de fila fusionada (varios a uno), de desborde derecho y de encabezado en los dos modos. La prueba original "ninguna orden se sale del lienzo" era casi vacía, porque las órdenes de texto no llevan campo `ancho`.

## Conteos de pruebas corregidos

El plan predecía 12 pruebas en la tarea 4 y 18 en la tarea 5. Los conteos reales son 12 y 29 respectivamente, tras las pruebas agregadas.

## Diferido a la revisión visual de la tarea 7

- Desactivar las fotos no reduce la altura de la imagen, porque `altoFila` no cambia. Quien destilde "fotos" esperando una imagen más corta no obtiene nada. Es una decisión de producto que conviene tomar viendo el render.
- Con 19 filas o más, `recorteProbable` se enciende. Un sábado real tiene entre 17 y 20, así que el aviso va a aparecer seguido y el interruptor de compacto tiene que estar bien visible en la vista previa.
- `buscar` aborta toda la maquetación ante un id colgado. Degradar con un marcador visible y una lista de problemas en el plano es mejor, pero corresponde a la pantalla de vista previa.

## Corrección posterior a la puesta en uso: los rangos de edad estaban al revés

El 1 de agosto de 2026, ya con la aplicación en uso real, la usuaria que coordina el programa avisó que los rangos de edad de `POR_DEFECTO` estaban invertidos. El grupo 1 es el de **10 a 17 años** y el grupo 2 el de **5 a 9 años**, no al revés como figura en la especificación y en los bloques de código de este plan. Manda lo que dijo la usuaria, que es quien lleva el programa.

- `js/modelo/lista.js`, `POR_DEFECTO`: se intercambian los dos `subtitulo`. Los `titulo` y las `cancha` quedan como estaban, o sea el grupo 1 sigue siendo "Grupo 1" en la "Cancha 1".
- Se acompaña el cambio en la fixture compartida `test/ayudas/datos.js` y en las afirmaciones de `test/modelo/lista.test.js` y `test/imagen/maquetar.test.js`.
- La especificación (`docs/superpowers/specs/2026-07-31-voluntarios-fsb-design.md`) y los bloques de código de este plan **no** se tocan: registran lo que se creía en su momento. Ante la diferencia, manda esta entrada.

Como el rango dejó de ser un dato de confianza, la misma corrección trajo la posibilidad de editar el rótulo de cada grupo desde la pantalla de armado, así un cambio futuro no vuelve a exigir tocar el código. Ver `editarGrupo` en `js/modelo/lista.js` y el bloque plegado `.editar-grupo` en `js/ui/pantalla-lista.js`.
