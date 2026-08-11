# Asistencias, reporte mensual y alertas de faltas

Fecha: 2026-08-11
Estado: diseño aprobado por el usuario en la conversación del 2026-08-11.

## 1. Contexto

La especificación original dejaba la asistencia explícitamente **fuera de alcance** (`2026-07-31-voluntarios-fsb-design.md`, sección 3). Este documento la incorpora.

Hoy la aplicación produce una planilla por sábado y la guarda en `listas/AAAA-MM-DD.json`. Esa planilla es **el plan de la noche anterior**, no un registro de lo que pasó: el saludo por defecto dice "les compartimos las asignaciones para mañana", y "Hoy no viene" se toca mientras se arma. Si alguien avisa a último momento o no aparece sin avisar, la aplicación no se entera.

Lo que falta es responder dos preguntas que hoy nadie puede contestar sin memoria: cuánto vino cada uno en el mes, y quién dejó de venir.

## 2. Objetivo

1. Un **reporte mensual de asistencia** de participantes y voluntarios, descargable.
2. Una **alerta en la aplicación** cuando alguien falta tres sábados seguidos, con una acción posible desde ahí mismo.

## 3. Alcance

Dentro del alcance:

- Derivar la asistencia de las planillas ya guardadas, sin pedir trabajo nuevo el sábado.
- Corregir la asistencia de un sábado pasado cuando el plan no coincidió con la realidad.
- Reporte mensual en pantalla, descargable como PNG y como CSV.
- Alerta de tres faltas seguidas, con nota de seguimiento que la silencia.

Fuera del alcance:

- Tomar asistencia en vivo el sábado en la cancha.
- Avisar a las familias, por cualquier medio.
- Estadísticas más allá del mes: rachas históricas, comparaciones entre meses, gráficos.
- Cualquier cálculo automático de consecuencias (bajas automáticas, cupos).

## 4. De dónde sale la asistencia

**De las planillas ya guardadas.** No se agrega ningún paso al sábado.

Para cada sábado que tiene archivo en `listas/`:

| Persona | Presente | Ausente |
|---|---|---|
| Participante | está en alguno de los dos grupos | está en `ausentes` |
| Voluntario | acompaña a alguien, o está en `apoyo` | no aparece en la planilla |

La regla del voluntario es una decisión consciente del usuario: cuenta falta a quien fue y no le tocó nadie, y ese error se corrige a mano (sección 5). A cambio, no agrega ningún toque al armado, y hace que la alerta también sirva para detectar a quien sigue en el plantel pero ya no viene.

### 4.1 Desde cuándo cuenta cada persona

**Desde el primer sábado en que aparece en una planilla.** Antes de esa fecha su casilla es "todavía no estaba", ni presente ni ausente.

La ficha de una persona no guarda fecha de alta (`js/modelo/roster.js`: `id`, `nombre`, `grupo`, `nuevo`, `foto`, `activo`, `notas`). Sin esta regla, alguien dado de alta en agosto figuraría faltando todos los sábados de enero a julio, y dispararía la alerta el día que entra.

### 4.2 Quién queda afuera

Las personas con `activo: false` no generan alertas. Sí salen en el reporte de los meses en que participaron: el reporte de marzo no cambia porque alguien se haya ido en julio.

## 5. Correcciones

Archivo nuevo, uno por mes: `asistencias/AAAA-MM.json`.

Guarda **solo las diferencias** contra lo derivado de la planilla, no la asistencia completa:

```json
{
  "version": 1,
  "mes": "2026-08",
  "correcciones": [
    { "fecha": "2026-08-15", "persona": "p_abc123", "vino": false,
      "quien": "Claudia", "cuando": "2026-08-15T14:02:00Z" }
  ]
}
```

Un archivo vacío o inexistente significa "la planilla dice la verdad", que es el caso normal.

**Por qué aparte y no editando la planilla**: la planilla del 15 ya se mandó por WhatsApp. Reescribirla haría que lo guardado deje de coincidir con la imagen que recibió la gente, y el historial dejaría de servir para responder "¿qué mandamos ese día?".

**Pantalla Asistencias**: se elige un sábado, se ve la lista completa de participantes y voluntarios con su estado derivado, y se toca a quien haya que corregir. Cada corrección se guarda con autor y queda en el registro de actividad como cualquier otro cambio.

## 6. Reporte mensual

**Pantalla Reporte**, con selector de mes.

En pantalla: una fila por persona, una columna por sábado del mes que tuvo planilla.

- `✓` presente
- `✗` ausente
- `—` todavía no estaba (sección 4.1)

Participantes y voluntarios en dos bloques separados. Al pie de cada fila, "vino a N de M". Al pie de la tabla, cuántos sábados hubo.

### 6.1 Descargas

**PNG**: lo dibuja el mismo motor de dos etapas que la planilla. Una función `maquetar` nueva devuelve las órdenes de dibujo y `pintar` las ejecuta, igual que en `js/imagen/`. Así el archivo descargado es idéntico a lo que se ve, que es la garantía que ya da la planilla.

**CSV**: una fila por persona, una columna por sábado, con encabezado. Separador coma, codificación UTF-8 con BOM para que Excel en Windows no rompa los acentos.

## 7. Alerta de faltas

Una franja arriba de "Armar lista", con foto y nombre: *"Gaia faltó 3 sábados seguidos"*.

### 7.1 Cómo se cuenta

Tres faltas consecutivas **sobre los sábados que tuvieron planilla**. Un sábado sin planilla (llovió, feriado, no se cargó) ni suma ni corta la racha.

La alternativa, que un sábado sin planilla corte la racha, fue descartada: un fin de semana largo borraría el problema justo cuando más importa.

### 7.2 Acciones

- **Anotar y silenciar**: una nota corta de seguimiento ("hablé con la mamá, vuelve en septiembre"). Guarda quién la escribió y cuándo, y apaga la alerta.
- **Ver el mes**: abre el reporte del mes corriente.

La alerta se apaga sola cuando la persona vuelve a venir, con nota o sin ella. Si vuelve a faltar tres seguidas más adelante, salta de nuevo: la nota silencia una racha, no a la persona.

Las notas van en `seguimientos.json`, en la raíz del repositorio de datos.

## 8. Permisos

Reporte, asistencias y alertas los ven **los dos roles**, `admin` y `coordinacion` (`js/acceso/usuarios.js`). Las dos ya ven el nombre y la foto de cada chico, así que la asistencia no agrega exposición. El registro de actividad sigue siendo lo único exclusivo de `admin`.

## 9. Costo

Para saber si hay alerta hay que leer los últimos tres sábados al abrir la aplicación: tres archivos JSON chicos, una sola vez por sesión, cacheados en memoria.

El reporte de un mes lee cuatro o cinco planillas más el archivo de correcciones, y solo cuando se abre esa pantalla.

## 10. Riesgos conocidos

- **El voluntario presente al que no le tocó nadie cuenta falta.** Aceptado por el usuario. Se corrige a mano; si resulta molesto en la práctica, la salida es agregarle "Hoy no viene" al voluntario, que fue la opción descartada.
- **Un sábado que no se cargó desaparece del historial.** No hay forma de distinguir "no hubo fútbol" de "no se usó la aplicación". El reporte muestra los sábados que tuvieron planilla, sin afirmar nada sobre los otros.
- **Las planillas viejas nunca se corrigieron.** La asistencia de los meses ya pasados es la planificada, con el error que eso tenga.
