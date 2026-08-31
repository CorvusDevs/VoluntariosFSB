Outcome: El gestor y la pagina de prueba funcionan sin solapamientos en celular, el aviso de actualizacion se descarta de verdad y las cuentas pueden vencer automaticamente.
Scope: VoluntariosFSB, aviso de version, navegacion y secciones moviles, Accesos, modelo y persistencia de usuarios, pruebas y fixtures.
Excluded: Rediseño de escritorio, cambios de marca, migracion de hosting y publicacion externa sin autorizacion posterior.
Authority: Diagnosticar, editar y probar localmente. No desplegar ni publicar en esta solicitud.
Evidence: Estado y ruta activa del aviso, medidas DOM a 390 px, prueba de descarte tras recarga, pruebas de cuenta temporal y suite completa.
Stop condition: Los tres flujos pasan pruebas automaticas y una verificacion visual movil sin scroll horizontal ni controles tapados.
Tool route: Busqueda acotada, navegador local, pruebas Vitest, cambios con apply_patch y auditoria del paquete generado.
Model effort: Terra medium.
Risks: Service worker antiguo, datos de usuarios existentes sin vencimiento y CSS compartido entre gestor y pagina publica.
First checkpoint: Confirmar build activo, almacenamiento del aviso, componentes que desbordan y contrato actual de cuentas y permisos temporales.
