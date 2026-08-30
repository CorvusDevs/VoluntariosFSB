# Sincronización segura de métricas web

- Resultado: dejar preparado el ingreso de métricas agregadas de Cloudflare al gestor sin activar seguimiento.
- Alcance: contrato normalizado, validación, estado visual, documentación y pruebas locales.
- Fuera de alcance: crear credenciales, consultar datos reales, encender la baliza, publicar o desplegar.
- Autoridad: editar y verificar solamente el repositorio local.
- Evidencia mínima: premisa documentada, lote válido aceptado, datos personales rechazados, pruebas y build completos.
- Límite: no escribir una consulta GraphQL hasta confirmar su esquema con introspección autenticada.
- Riesgos: inventar campos de Cloudflare, exponer secretos o confundir solicitudes HTTP con visitas reales.
- Primer control: reauditar el resumen agregado existente y registrar brecha, contrato y forma de datos.
- Cierre: preparación local completa y próximo paso externo explicado sin activarlo.
