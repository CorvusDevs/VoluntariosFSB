# Plan completo del overhaul del editor de página web

## Objetivo

Transformar el editor en una mesa de composición visual de Aletea. La maqueta es la superficie principal, el inspector muestra solo las opciones del elemento seleccionado y las configuraciones técnicas quedan bajo divulgación progresiva.

## Dirección visual

- Paleta: Violeta Aletea `#6b2e83`, Rosa acción `#ed1e79`, Turquesa conexión `#55c9c4`, Azul recursos `#3d7fc4`, Papel `#ffffff`, Tinta `#342d38`.
- Tipografía: Poppins para interfaz y lectura, League Gothic solamente para muestras expresivas y títulos públicos compatibles.
- Composición: navegador de secciones compacto, lienzo principal amplio e inspector contextual lateral.
- Firma: mapa de página inspirado en el infinito de Aletea, con nodos que representan secciones y estados reales.
- Movimiento: transiciones breves para selección, inserción, reordenamiento y cambio de dispositivo; respetar movimiento reducido.

## Fases

1. Preservar contrato y estado actual con pruebas de regresión.
2. Crear mapa visual y búsqueda de secciones con estado completo, incompleto, oculto o modificado.
3. Dar prioridad al lienzo y convertir el inspector en contextual con pestañas Contenido, Diseño y Avanzado.
4. Extender edición directa a textos, imágenes, botones, visibilidad y orden.
5. Crear tarjetas visuales para actividades, publicaciones, recursos, productos, áreas, formularios y redes.
6. Añadir selector de enlaces a páginas, secciones, formularios, archivos y destinos externos.
7. Integrar biblioteca de medios con reemplazo, texto alternativo y recorte visual.
8. Optimizar automáticamente toda imagen antes de transmitirla: WebP, dimensiones adecuadas, calidad adaptativa y límite seguro.
9. Mostrar formato, dimensiones, peso original, peso final y ahorro; permitir revisar la imagen optimizada.
10. Mantener el original en el dispositivo y enviar únicamente la copia optimizada.
11. Incorporar historial local, deshacer, rehacer, restauración de borrador y aviso de cambios pendientes.
12. Mejorar vistas Escritorio, Tablet y Teléfono con ancho ajustable y vista completa.
13. Convertir publicación en una revisión guiada de contenido, enlaces, accesibilidad, SEO, privacidad y formularios.
14. Actualizar ayuda contextual, novedades, estados vacíos y mensajes de error.
15. Auditar teclado, foco, lectores de pantalla, movimiento reducido, anchos angostos y rendimiento.

## Reglas de UX

- Una acción conserva el mismo nombre durante todo su recorrido.
- Las opciones avanzadas permanecen cerradas hasta que sean necesarias.
- Las listas muestran primero miniatura, título, estado, destino y acciones frecuentes.
- Ninguna sección empieza con una matriz de campos vacíos; se ofrecen ejemplos y plantillas seguras.
- El editor explica qué falta y lleva directamente al elemento que requiere atención.
- Todo control navegable tiene foco visible y toda imagen pública requiere descripción alternativa.

## Criterios de aceptación

- Las 21 secciones pueden localizarse y editarse sin conocer la estructura JSON.
- Los cambios del lienzo y del inspector permanecen sincronizados.
- Las colecciones permiten crear, duplicar, ocultar y reordenar elementos.
- Las imágenes se optimizan automáticamente y se informa el resultado antes de guardar.
- Escritorio, tablet y teléfono se pueden revisar sin abandonar el editor.
- Deshacer, rehacer y recuperación local protegen el trabajo no publicado.
- La revisión previa identifica problemas y enlaza al elemento exacto.
- El contrato existente, los permisos y la publicación en prueba continúan funcionando.
