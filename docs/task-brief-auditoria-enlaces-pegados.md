# Auditoría de enlaces pegados y publicación

Objetivo: asegurar que todo campo dedicado a enlaces acepte URLs copiadas desde Google Drive, Canva y herramientas similares, incluso si el portapapeles incluye texto adicional.

- Alcance: formularios del gestor, formularios públicos, validación del servidor, pruebas y artefacto Cloudflare Pages.
- Preservar todos los cambios existentes y no crear commits ni modificar remotos Git.
- Aplicar asistencia solo a campos dedicados a URLs. Los campos narrativos deben conservar texto y enlaces sin alterar contenido.
- Añadir una prueba de cobertura para impedir que aparezcan campos URL sin asistencia de pegado.
- Verificar pruebas completas, sintaxis, estilos, sello de versión, caché, secretos y recursos.
- Publicar en el proyecto Cloudflare Pages `aletea` y comprobar el contenido servido en `https://aletea.pages.dev`.
- Detenerse si la auditoría revela un flujo ambiguo que cambiaría datos del usuario o si falla la publicación.
