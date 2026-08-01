# VoluntariosFSB, especificación de diseño

Fecha: 2026-07-31
Estado: aprobado por el usuario en la conversación de diseño, pendiente de revisión del documento escrito.

## 1. Contexto

Fútbol sin Barreras es un programa recreativo de la organización Aletea, creado en 2018, para niños y adolescentes autistas y con desafíos en el neurodesarrollo. Funciona los sábados de 11:00 a 12:00 en el barrio Tres Cruces, con dos grupos por edad, de 5 a 9 años y de 10 a 17 años, cada uno en una cancha.

Cada viernes por la noche la coordinación publica en un grupo de WhatsApp las asignaciones del día siguiente: qué voluntario acompaña a qué participante, agrupado por grupo. Hoy eso se escribe a mano como texto plano en el chat. El texto es largo, se pierde entre otros mensajes, no se puede consultar después y hay que rearmarlo desde cero cada semana.

Lema del programa, tomado de aletea.org: "Generar instancias recreativas desde la enseñanza del fútbol, siempre respetando los aprendizajes y ritmos de los participantes".

## 2. Objetivo

Una aplicación web que permita armar la asignación semanal en pocos minutos y exportarla como **una imagen vertical, legible en un teléfono y lista para compartir por WhatsApp**.

La imagen es el producto. Todo lo demás en la aplicación existe para producirla bien y rápido.

## 3. Alcance

Dentro del alcance:

- Alta, baja y edición de participantes y voluntarios, con foto opcional.
- Armado de la asignación semanal por grupo, con emparejamientos de uno a uno, uno a varios y varios a uno.
- Exportación a imagen PNG vertical con la identidad de Fútbol sin Barreras.
- Historial de listas publicadas y reutilización de la última como base.
- Avisos de repetición de duplas, sin bloquear ninguna decisión.
- Acceso con usuario y contraseña para varias coordinadoras, administrado por una persona.
- Interfaz íntegramente en español rioplatense.

Fuera del alcance en esta versión:

- Asistencia, inscripciones, comunicación con familias, pagos.
- Aplicación nativa para iOS o Android.
- Asignación automática de duplas. La aplicación sugiere e informa, nunca decide.
- Notificaciones automáticas o envío directo a WhatsApp sin intervención de la persona.

## 4. Arquitectura

Sitio estático puro, sin framework y sin paso de compilación: HTML, CSS y JavaScript con módulos nativos del navegador. Se publica tal cual en GitHub Pages. La decisión de no usar herramientas de compilación es deliberada: la aplicación tiene que seguir funcionando dentro de cinco años sin que nadie actualice dependencias.

Dos repositorios:

| Repositorio | Visibilidad | Contenido |
| --- | --- | --- |
| `VoluntariosFSB` | público | El programa: HTML, CSS, JS, fuente Poppins autoalojada, logo de Aletea, y `usuarios.json` |
| `VoluntariosFSB-datos` | privado | `roster.json`, `listas/AAAA-MM-DD.json`, `fotos/<id>.jpg` |

Ningún nombre ni foto de un participante toca jamás el repositorio público.

El navegador lee y escribe el repositorio privado hablando directamente con la API REST de GitHub. Esto es posible porque la API habilita CORS, verificado el 2026-07-31:

```
access-control-allow-origin: *
access-control-allow-methods: GET, POST, PATCH, PUT, DELETE
access-control-allow-headers: Authorization, Content-Type, ...
```

No hay servidor propio, ni función serverless, ni base de datos.

### 4.1 Capa de almacenamiento

Todo el acceso a datos pasa por un único módulo con una interfaz acotada:

```
leerRoster()            -> {participantes[], voluntarios[]}
guardarRoster(roster)   -> {sha}
leerLista(fecha)        -> lista | null
guardarLista(lista)     -> {sha}
listarListas()          -> [{fecha, sha}]
leerFoto(id)            -> Blob | null
guardarFoto(id, blob)   -> void
borrarFoto(id)          -> void
```

Ninguna pantalla llama a la API de GitHub directamente. Esto mantiene el resto de la aplicación ignorante del almacenamiento y permite cambiarlo después sin reescribir la interfaz.

### 4.2 Concurrencia

Cada archivo en GitHub tiene un `sha`. Al escribir se envía el `sha` que se leyó. Si otra persona modificó el archivo mientras tanto, GitHub responde `409 Conflict`. En ese caso la aplicación **no pisa los cambios**: avisa "Otra coordinadora modificó esta lista", ofrece recargar y muestra qué cambió.

### 4.3 Caché local

Cada lectura exitosa se guarda en IndexedDB. Al abrir la aplicación se muestra la copia local de inmediato y se refresca contra GitHub en segundo plano. Sin conexión la aplicación se abre en modo lectura, muestra la última lista conocida y permite exportar la imagen, pero no guardar cambios.

## 5. Modelo de datos

`roster.json`:

```json
{
  "version": 1,
  "modificadoPor": "Majo",
  "modificadoEn": "2026-08-07T22:14:03Z",
  "participantes": [
    { "id": "p_a1b2", "nombre": "Gonzalo", "grupo": 1, "foto": "p_a1b2.jpg", "activo": true, "notas": "" }
  ],
  "voluntarios": [
    { "id": "v_c3d4", "nombre": "Abi", "nuevo": false, "foto": null, "activo": true, "notas": "" }
  ]
}
```

`listas/2026-08-08.json`:

```json
{
  "version": 1,
  "fecha": "2026-08-08",
  "hora": "11:00",
  "lugar": "Tres Cruces",
  "coordinacion": ["Majo"],
  "modificadoPor": "Majo",
  "modificadoEn": "2026-08-07T22:14:03Z",
  "grupos": [
    {
      "numero": 1,
      "titulo": "Grupo 1",
      "subtitulo": "5 a 9 años",
      "cancha": "Cancha 1",
      "filas": [
        { "participantes": ["p_a1b2"], "voluntarios": ["v_c3d4"] },
        { "participantes": ["p_e5f6"], "voluntarios": [] }
      ],
      "apoyo": []
    },
    {
      "numero": 2,
      "titulo": "Grupo 2",
      "subtitulo": "10 a 17 años",
      "cancha": "Cancha 2",
      "filas": [
        { "participantes": ["p_g7h8"], "voluntarios": ["v_i9j0", "v_k1l2"] }
      ],
      "apoyo": ["v_m3n4"]
    }
  ],
  "opcionesImagen": {
    "saludo": true,
    "despedida": true,
    "fotos": true,
    "compacto": false
  }
}
```

Notas sobre el modelo:

- Una fila con `voluntarios: []` es un estado **válido y final**, no un error. Corresponde al participante que juega sin acompañante asignado. La interfaz no lo marca en rojo ni bloquea la exportación.
- `participantes` es un arreglo porque un mismo voluntario puede acompañar a más de un participante, como "Ángel/Thiago - Ruben" en los mensajes actuales.
- `voluntarios` es un arreglo porque un participante puede tener más de un acompañante, como "Nikita/Francisco - Cris".
- Los títulos y subtítulos de grupo son editables por lista. Los valores por defecto salen de la información pública del programa.
- Las listas se identifican por fecha. Una segunda lista para la misma fecha sobrescribe la anterior, previo aviso.

### 5.1 Fotos

Se guardan como archivos individuales en `fotos/` del repositorio privado, no incrustadas en el JSON. Al importar, la imagen se recorta a cuadrado y se reduce a 400 píxeles de lado en JPEG de calidad 0,82, lo que deja archivos de entre 15 y 40 KB. El límite de 1 MB por archivo de la API de contenidos queda holgado.

Motivo de separarlas: si fueran parte de `roster.json`, cada cambio de un nombre reescribiría todas las fotos y el archivo superaría el megabyte con unas treinta personas.

## 6. Acceso

### 6.1 Esquema

Existe **un solo token de GitHub**, de alcance limitado a los dos repositorios del proyecto y con permiso únicamente de contenido. Es el token de la persona dueña. Las coordinadoras nunca lo ven.

`usuarios.json`, en el repositorio público, contiene por cada coordinadora:

```json
{
  "version": 1,
  "usuarios": [
    {
      "usuario": "majo",
      "nombre": "Majo",
      "rol": "coordinacion",
      "kdf": { "algoritmo": "PBKDF2-SHA256", "iteraciones": 600000, "sal": "<base64>" },
      "cifrado": { "algoritmo": "AES-GCM", "iv": "<base64>", "datos": "<base64>" }
    }
  ]
}
```

`datos` es el token de GitHub cifrado con una clave derivada de la contraseña de esa persona. Se usa `crypto.subtle` del navegador, sin librerías externas. GitHub Pages sirve por HTTPS, que es el contexto seguro que `crypto.subtle` requiere.

### 6.2 Flujo de ingreso

1. La persona escribe usuario y contraseña.
2. La aplicación descarga `usuarios.json` desde `raw.githubusercontent.com`, que habilita CORS y cachea 5 minutos, verificado el 2026-07-31.
3. Deriva la clave con PBKDF2 y descifra el token. Si falla, la contraseña es incorrecta. No hay ninguna otra señal ni mensaje distinto.
4. El token descifrado queda en memoria durante la sesión y, si la persona marca "Recordarme en este dispositivo", cifrado en IndexedDB bajo una clave no exportable ligada al dispositivo.

### 6.3 Administración de coordinadoras

La persona dueña ingresa la primera vez pegando el token directamente. Desde la pantalla "Coordinadoras" puede:

- **Agregar**: la aplicación genera una contraseña aleatoria de 16 caracteres, cifra el token con ella, actualiza `usuarios.json` y muestra la contraseña una sola vez para que se la pase a la persona.
- **Quitar**: borra el registro de `usuarios.json`.
- **Rotar el token**: tras pegar un token nuevo, vuelve a cifrar para todas las coordinadoras vigentes de una sola vez.

Las contraseñas **siempre las genera la aplicación**. No hay campo para elegir una. Esto no es una preferencia de estilo: `usuarios.json` es público, cualquiera puede descargarlo e intentar contraseñas sin límite en su propia máquina, y una contraseña elegida por una persona no sobrevive a ese ataque. Es un requisito, no una recomendación.

### 6.4 Límites conocidos y aceptados

Estos tres puntos fueron presentados al usuario y aceptados explícitamente antes de escribir esta especificación.

1. **El archivo cifrado es público.** La defensa es enteramente la entropía de las contraseñas generadas y las 600.000 iteraciones de PBKDF2.
2. **Quitar a una persona no revoca de inmediato.** Si ya ingresó, su navegador pudo haber quedado con el token. La revocación real exige rotar el token, que la aplicación facilita con un botón pero que es un paso aparte que alguien tiene que dar.
3. **El historial de GitHub atribuye todo a la persona dueña**, porque el token es uno solo. La atribución real se guarda dentro de los datos, en `modificadoPor`.

Además, y sin haber sido señalado como límite sino como advertencia: este es un esquema de acceso a medida. Usa primitivas estándar y bien probadas del navegador, pero el diseño no está auditado por terceros.

### 6.5 Propagación

Una coordinadora recién agregada puede tardar hasta 5 minutos en poder ingresar, por el caché de `raw.githubusercontent.com`. La pantalla de administración lo dice al mostrar la contraseña generada.

## 7. Pantallas

Cuatro pantallas, navegación inferior en teléfono y lateral en escritorio. Diseño adaptable real a ambos tamaños, no una versión reducida de la otra.

### 7.1 Armar lista

La pantalla principal. Encabezado con fecha, hora, lugar y coordinación del día.

Por cada grupo, dos columnas de fichas: participantes a la izquierda, voluntarios a la derecha.

Interacción de emparejado:

1. Tocar un participante lo selecciona.
2. Tocar un voluntario los empareja.
3. Con la fila ya creada, tocar otro voluntario lo suma a la misma fila, que al exportarse se escribe con barra.
4. Tocar un participante ya emparejado abre esa fila para editarla.
5. Deshacer disponible en todo momento.

Los voluntarios ya asignados se ven atenuados, no ocultos, porque asignar el mismo voluntario a dos participantes es legítimo.

Contador permanente por grupo: participantes sin acompañante y voluntarios sin asignar. Es información, no una alerta.

### 7.2 Vista previa

Muestra **el mismo lienzo que se descarga**, a escala. Interruptores para saludo, despedida, fotos y modo compacto. Dos acciones: descargar PNG, y compartir, que usa `navigator.share` con el archivo cuando el dispositivo lo permite y en ese caso abre WhatsApp directamente desde el teléfono.

### 7.3 Personas

Listas de participantes y voluntarios con buscador. Alta, edición, foto, marca de "nuevo" para voluntarios, y baja lógica mediante `activo: false`, que los saca de las listas nuevas sin romper el historial.

### 7.4 Historial

Listas anteriores por fecha. Abrir una permite verla, volver a exportar su imagen, o duplicarla como base de la próxima.

### 7.5 Ajustes

Coordinadoras, rotación de token, textos por defecto de saludo y despedida, y cierre de sesión, que borra el token del dispositivo.

## 8. Sugerencias de rotación

Al emparejar, si la dupla ya ocurrió en las últimas ocho listas, aparece un texto discreto junto a la fila: "Abi estuvo con Gonzalo las últimas 3 veces".

Es exclusivamente informativo. No reordena, no bloquea, no propone alternativas y no se puede configurar como regla. Con participantes autistas la continuidad de la persona acompañante suele ser deseable, así que la aplicación no opina sobre si repetir está bien o mal: se limita a que la coordinación no lo decida sin saberlo.

## 9. Generación de la imagen

### 9.1 Principio

Una única función dibuja la imagen sobre un `<canvas>`. La vista previa en pantalla es ese mismo lienzo mostrado a menor tamaño. No existe una versión en HTML de la imagen que pueda divergir del archivo final. Esto elimina la falla clásica de este tipo de herramienta, que la previsualización y lo descargado se parezcan pero no coincidan.

Antes de dibujar se espera `document.fonts.ready`, para que el texto no se rasterice con una fuente sustituta.

### 9.2 Formato

- Ancho fijo de 1080 píxeles. Alto variable según la cantidad de filas.
- Orientación vertical, pensada para leerse en un teléfono.
- Si la relación de aspecto supera 1:2,5, WhatsApp recorta la vista previa en el chat. La aplicación lo detecta, lo avisa y ofrece dos salidas: modo compacto, o exportar una imagen por grupo.

Modo compacto es un conjunto fijo de ajustes, no un parámetro continuo: oculta las fotos, reduce la altura de fila de 96 a 64 píxeles, quita el saludo y la despedida, y achica las bandas superior e inferior. Sobre una lista de veinte filas recorta la altura aproximadamente a la mitad.

### 9.3 Composición

De arriba hacia abajo:

1. Banda superior violeta con el logo de Aletea, el título "Fútbol sin Barreras", y fecha, hora y lugar.
2. Saludo, si está activado.
3. Por cada grupo: barra de título con nombre, franja etaria y cancha, y luego las filas.
4. Cada fila: círculo con foto o iniciales, nombre del participante, separador, nombres de los voluntarios. La marca "nuevo" se dibuja como una píldora junto al nombre.
5. Línea de apoyo del grupo, si existe.
6. Despedida, si está activada.
7. Banda inferior con `aletea.org` y `@futbol_sinbarreras`.

El separador entre participante y voluntario es un **guión simple**, y la barra entre varios nombres una **barra simple**, replicando exactamente cómo se escribe hoy en WhatsApp. No se usan rayas ni guiones largos en ninguna superficie visible del proyecto.

Sin foto, el círculo muestra las iniciales sobre un fondo tenue del color del grupo.

## 10. Identidad visual

Colores tomados directamente del logotipo oficial de Aletea, muestreados de `logo-violeta-con-fondo-transparente-alta-calidad-1-1024x382.png` el 2026-07-31:

| Color | Valor | Uso |
| --- | --- | --- |
| Violeta | `#662D7D` | Bandas, títulos, color principal |
| Magenta | `#E9287F` | Voluntarios, acento del grupo 2 |
| Turquesa | `#5DCCC6` | Acento del grupo 1 |

Para texto sobre fondo claro se usan variantes oscurecidas de magenta y turquesa que cumplen contraste AA. Los colores del logotipo no se usan como color de texto pequeño sin verificar contraste.

Tipografía Poppins, autoalojada bajo licencia SIL OFL, en pesos 400 y 500 únicamente. Es geométrica, en línea con el logotipo.

El logotipo se copia dentro del repositorio. No se enlaza a `aletea.org`. El usuario confirmó que cuenta con permiso de Aletea para usar la marca.

Toda la interfaz y todos los textos de la imagen están en español rioplatense.

## 11. Privacidad

- Sin analítica, sin rastreadores, sin cookies de terceros.
- Sin recursos externos en tiempo de ejecución. Fuente, logo e iconos van dentro del repositorio. Después de cargar la página, las únicas peticiones de red son a `api.github.com` y `raw.githubusercontent.com`.
- Los datos de participantes viven exclusivamente en el repositorio privado y en el caché local de los dispositivos autorizados.
- El sitio publicado es necesariamente público. GitHub solo permite restringir la visibilidad de una página en GitHub Enterprise Cloud, verificado en su documentación: "To publish a GitHub Pages site privately, your organization must use GitHub Enterprise Cloud". Esto es aceptable porque el sitio publicado no contiene ningún dato, solo el programa.
- "Cerrar sesión" borra el token y el caché local del dispositivo.

## 12. Alternativas descartadas

| Alternativa | Motivo del descarte |
| --- | --- |
| Solo navegador con respaldo en archivo | El usuario pidió acceso privado compartido entre coordinadoras. |
| Datos en el repositorio público | Expondría nombres y fotos de menores de forma permanente e indexable. |
| Supabase con correo y contraseña | Sistema de acceso auditado y baja inmediata, pero agrega dependencia de un servicio externo, saca los datos de menores del control directo de la organización, y su plan gratuito pausa el proyecto tras una semana de inactividad, lo que exigiría mantener un ping diario. El usuario eligió permanecer en GitHub. |
| Usuario y contraseña de GitHub | Imposible: "Authentication with username and password is not supported", documentación de la API REST de GitHub. |
| Botón "Iniciar sesión con GitHub" con flujo de dispositivo | Los endpoints de OAuth de GitHub no devuelven cabeceras CORS, verificado el 2026-07-31, así que una página estática no puede completar el intercambio sin un intermediario. Además exigiría cuenta de GitHub a cada coordinadora. |
| `html2canvas` o similar para exportar | Dependencia externa, y la imagen resultante puede diferir de la vista previa. Dibujar sobre el lienzo da control exacto y cero dependencias. |
| Framework con paso de compilación | Contradice el objetivo de que el proyecto siga funcionando sin mantenimiento. |

## 13. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Se pierde el token y nadie puede entrar | La persona dueña puede generar otro en GitHub y rotarlo desde la aplicación. |
| Una contraseña generada se filtra | Rotar el token, que invalida todas las contraseñas de golpe y obliga a repartir nuevas. |
| Dos coordinadoras editan a la vez | Detección por `sha` y aviso, nunca sobrescritura silenciosa. |
| La imagen queda tan larga que WhatsApp la recorta | Detección por relación de aspecto, con modo compacto o división por grupo. |
| GitHub cambia su API | La capa de almacenamiento está aislada tras una interfaz de ocho funciones. |
| Fotos de menores en un servicio de terceros | Repositorio privado, acceso limitado a las coordinadoras, y la decisión sobre el consentimiento de las familias queda en manos de la organización. |

## 14. Criterios de aceptación

1. Una coordinadora arma la lista completa de un sábado, con las dos canchas y unas veinte filas, en menos de tres minutos partiendo de la lista anterior.
2. La imagen descargada es idéntica píxel a píxel a la vista previa.
3. La imagen se lee sin ampliar en un teléfono de 6 pulgadas.
4. Un participante sin voluntario se exporta correctamente y no se presenta como error en ningún momento.
5. Emparejamientos de uno a varios y varios a uno se exportan con barra, igual que en los mensajes actuales.
6. Cargar el sitio no produce ninguna petición a un dominio que no sea GitHub.
7. El repositorio público no contiene ningún nombre ni foto de participante en ningún punto de su historial.
8. Con dos pestañas abiertas, guardar en la segunda tras haber guardado en la primera muestra el aviso de conflicto y no pierde datos.
9. La aplicación funciona en Safari de iOS, Chrome de Android, y Safari y Chrome de escritorio.
10. Toda la interfaz visible está en español, sin rayas ni guiones largos.
