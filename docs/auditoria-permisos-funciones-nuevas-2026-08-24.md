# Auditoría de permisos de funciones nuevas

Fecha: 24 de agosto de 2026.

## Regla aplicada

- Administración: puede editar y publicar la página, usar el editor de piezas, crear cartas membretadas, ver métricas agregadas y gestionar privacidad cuando además activa acceso sensible temporal.
- Dirección: puede editar y publicar la página, usar el editor de piezas, crear cartas membretadas y ver métricas agregadas. No gestiona solicitudes de privacidad.
- Coordinación: puede editar borradores de la página, cargar medios, usar piezas sociales y ver métricas agregadas. No publica la página ni crea cartas membretadas.
- Integrante y Consulta: no acceden a los editores de Página web o Comunicación visual, sus borradores, medios privados, historial ni métricas.

## Privacidad de cartas membretadas

- La plantilla Carta membretada solo aparece para Administración y Dirección.
- El mismo control se aplica dentro del editor, no solamente en el menú.
- El cuerpo de la carta y la firma no se guardan en `localStorage`.
- Al abrir el editor se elimina cualquier borrador de carta que hubiera quedado guardado por una versión anterior.
- Al cerrar la pestaña se pierde el borrador privado. La salida deliberada es PDF o PNG descargado por la persona autorizada.
- Las imágenes de firma cargadas desde Google Drive deben ser enlaces públicos. El gestor no almacena credenciales de Drive.

## Excepciones públicas deliberadas

- La versión publicada de la página es pública porque alimenta `prueba.aletea.org`.
- Una imagen incorporada a la página publicada queda disponible mediante una URL pública e inmutable. Por eso el editor debe usar solamente imágenes autorizadas para difusión pública.
- Los formularios marcados como públicos exponen su título, finalidad, responsable y período de conservación. Las respuestas no forman parte del contenido público.
- Las métricas visibles en el gestor son agregadas y no incluyen correo, usuario, dirección IP ni respuestas de formularios.

## Controles técnicos verificados

- Menú y restauración de rutas: denegación por perfil.
- API de Página web: denegación antes de leer borradores, historial, formularios, medios o métricas.
- Publicación: limitada a Administración y Dirección.
- Descarga remota de imágenes: limitada a perfiles que pueden usar Comunicación visual.
- Solicitudes de privacidad: Administración más acceso sensible temporal.
- Carta membretada: defensa adicional dentro del editor y sin persistencia local.
