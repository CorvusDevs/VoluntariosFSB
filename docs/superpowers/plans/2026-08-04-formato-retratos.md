# Formato "Retratos": nombres adentro de la foto y medallón del voluntario

Fecha: 2026-08-04

## Qué se agrega, y qué no se toca

Se agrega **un cuarto formato de imagen**, elegible en Vista previa junto a los tres
que ya existen. Ninguno de los tres actuales cambia: `filas`, `columnas` y `grilla`
quedan exactamente como están, y `grilla` sigue siendo el formato por defecto.

## La celda del formato `retratos`

- La foto del participante ocupa **toda la celda**, con las esquinas redondeadas
  que ya usa la grilla. Al no haber texto debajo, la cara crece un 36% respecto de
  la grilla sin que la planilla se alargue.
- Al pie de la foto, **franja sólida del color del grupo** (turquesa el 1, magenta
  el 2) con el nombre del participante en blanco. Contraste medido 6.2:1.
- El nombre **se achica solo** hasta entrar en un renglón, con piso en el 70% del
  tamaño base. Si aun así no entra, se muestra solo el primer nombre: es lo que
  pasa con "Francisco Planells", el único de la lista real que no entra.

## El medallón del voluntario

- Repite la receta de la celda: foto arriba y franja del color del grupo abajo con
  el nombre del voluntario. Las dos piezas se leen como lo mismo, una grande y una chica.
- **36% del ancho de la celda, 1.28 veces más alto que ancho.** Medido: nombre de
  14 px en la imagen descargada, y tapa el 9.2% de la foto. El vertical rinde 3 px
  más de nombre que el cuadrado del mismo ancho, porque la franja no le come la cara.
- Sin foto cargada, van las iniciales sobre el violeta tenue, como en el resto de la app.
- Varios voluntarios se apilan **en columna**, que deja libre el centro de la foto.

## La esquina, configurable

Opción nueva `esquinaVoluntario`, con cuatro valores y `arriba-derecha` por defecto.
Cuando se elige una esquina de abajo, el nombre del participante **se corre al lado
libre** para dejarle el hueco al medallón. Eso le quita 46% de ancho al nombre, así
que el achique automático es el que sostiene ese caso.

## Límite conocido, ya medido

El nombre del voluntario adentro del medallón queda en 4.1 px en la miniatura del
chat de WhatsApp: se lee al abrir la planilla, no de reojo en la conversación. El
nombre del participante sí se lee ahí, porque queda en 7.7 px.

## Tareas

1. `tema.js`: bloque `RETRATOS` con las medidas, y `ajustarTexto` para el achique.
2. `maquetar.js`: `cuerpoEnRetratos`, alta en `CUERPOS`, y que el ensanchado
   automático por cantidad de participantes lo cubra igual que a la grilla.
3. `lista.js`: `esquinaVoluntario` en las opciones de imagen, con su valor por defecto.
4. `pantalla-vista-previa.js`: el formato en el selector, y un selector de esquina
   que solo aparece cuando el formato elegido es `retratos`.
5. Pruebas de geometría, del achique, de las cuatro esquinas y del corrimiento del nombre.
