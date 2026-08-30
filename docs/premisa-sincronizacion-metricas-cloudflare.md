# Premisa para sincronizar métricas de Cloudflare

## Brecha comprobada

El gestor ya guarda y presenta visitas, páginas y acciones agrupadas. Todavía no
existe una sincronización con Cloudflare y el seguimiento permanece apagado.

## Contrato comprobado

Cloudflare ofrece una API GraphQL mediante una única solicitud POST y publica
conjuntos agregados para Web Analytics. Visitas y páginas vistas son medidas
diferentes. Una visita puede incluir varias páginas vistas.

Fuentes oficiales:

- https://developers.cloudflare.com/analytics/graphql-api/
- https://developers.cloudflare.com/analytics/graphql-api/getting-started/execute-graphql-query/
- https://developers.cloudflare.com/web-analytics/data-metrics/high-level-metrics/
- https://developers.cloudflare.com/data-localization/metadata-boundary/graphql-datasets/

## Forma comprobada en la cuenta autorizada

La introspección autenticada confirmó el conjunto
`rumPageloadEventsAdaptiveGroups`. Permite filtrar por fecha, dominio y etiqueta
del sitio. Entrega `date`, `requestHost`, `requestPath`, cargas de página en
`count` y visitas agrupadas en `sum.visits`.

La cuenta autorizada no administra la zona DNS `aletea.org`, pero sí expone el
conjunto RUM a nivel de cuenta. Una consulta agregada de los cuatro dominios de
Aletea para los últimos 30 días respondió correctamente y devolvió cero filas.
Esto confirma que la medición todavía no está activa o que el sitio aún no está
registrado en esta cuenta.

Cloudflare Web Analytics no aporta acciones personalizadas en este conjunto.
Por eso la primera sincronización incorporará visitas y páginas, mientras que
los clics públicos quedan como una etapa separada. El contrato local rechaza
cualquier otro campo, consulta, fragmento o identificador.

Fuente oficial para descubrir el esquema:

- https://developers.cloudflare.com/analytics/graphql-api/features/discovery/introspection/

## Decisión

Esta etapa deja lista y probada la consulta de visitas y páginas, el formato
seguro de entrada y el estado visual del proceso. La sesión OAuth está guardada
de forma cifrada mediante el llavero de macOS y tiene solamente permisos de
lectura de usuario, cuenta y zona. No activa la baliza y no publica cambios.
