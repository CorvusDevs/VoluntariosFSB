# Avisos accionables y Formularios estables

- Resultado: el contador lateral vuelve a ser compacto, el aviso nuevo abre su contenido y Formularios deja de mostrar paneles rotos.
- Alcance: gestor, API CMS, UI de tareas y formularios, pruebas y ayuda/cambios si corresponde.
- Exclusiones: no modificar datos reales ni el sitio público de prueba salvo que el fallo contractual lo requiera.
- Autoridad: cambios locales, pruebas y auditoría. La publicación queda fuera de alcance hasta recibir autorización explícita.
- Evidencia: reproducir ambos defectos, identificar causa, pruebas automáticas, inspección visual y recibos vivos de versión/hash/API/rutas.
- Seguridad: conservar cambios existentes y no incluir ni sobrescribir .htaccess, secretos o node_modules.
- Esfuerzo: Terra medio, por tratarse de dos regresiones funcionales con publicación.
