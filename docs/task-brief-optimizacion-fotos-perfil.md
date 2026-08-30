Outcome: Administración puede elegir una foto de perfil habitual y el gestor la optimiza automáticamente antes de guardarla, sin pedir archivos menores a 500 KB.
Scope: selector de fotos de Accesos, procesamiento de imagen, validación del API y pruebas relacionadas.
Excluded: permisos de visualización, fotos públicas, prueba.aletea.org, aletea.org, datos, esquema y Git remoto.
Authority: edición, auditoría, empaquetado y publicación en gestor.aletea.org autorizados en este turno.
Evidence: estado del flujo actual, prueba con una imagen grande, límites finales del cliente y servidor, suite completa, paquete auditado, versión viva y archivo desplegado coincidente.
Stop condition: una foto válida de varios MB se reduce a un formato web seguro, la versión publicada lo incluye y gestor.aletea.org responde correctamente.
Tool route: inspección de configuración, reutilización del optimizador existente, parche acotado, pruebas y build local.
Model effort: medio.
Risks: picos de memoria en móviles, orientación EXIF, transparencia y compatibilidad de formatos.
First checkpoint: confirmar el límite real, el endpoint activo y el optimizador disponible antes de editar.
