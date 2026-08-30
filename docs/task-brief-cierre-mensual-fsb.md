Outcome: Finanzas resume cada mes en una sola vista con cobrado, cargos, pendiente, tasa de cobro y cuentas que requieren seguimiento.
Scope: modelo y UI local de `Finanzas > Pagos`, ayuda y pruebas; usar el Excel solo para identificar tareas que deben desaparecer.
Excluded: importar el Excel, aplicar recargos, enviar mensajes, conciliar bancos o migrar datos reales.
Authority: se permiten cambios, pruebas, sellado y publicación del gestor. No se autoriza migrar ni modificar datos reales.
Evidence: controles táctiles de 44 px, filtros sin recorte a 390 x 844, cálculos reconciliados, suite completa, paquete auditado y versión viva verificada.
Stop condition: una persona puede elegir un mes, entender la cobranza y abrir la cuenta prioritaria sin recorrer hojas individuales.
Tool route: inspección del libro con artifact-tool, `apply_patch`, Vitest y compilación.
Model effort: Terra medium.
Risks: confundir cobrado con saldo histórico, contar movimientos anulados o presentar compromisos como dinero recibido.
Design: libreta de cierre mensual, con una banda turquesa que une total emitido, cobrado y pendiente; violeta para identidad, rosa para seguimiento y ámbar para advertencias.
First checkpoint: comprobar que el resumen mensual existente puede agregarse sin alterar saldos ni permisos.
Status: etapa implementada y auditada localmente. El cierre usa movimientos no anulados y mantiene los compromisos fuera de lo cobrado.
Receipts: 1.118 pruebas aprobadas, 20 omitidas por Canvas en jsdom; paquete `dist/` generado; sintaxis y diferencias auditadas.
Visual receipt: a 390 x 844 no hubo desborde de página; el selector de mes midió 26 px y los filtros se recortaron horizontalmente. Esos dos defectos quedan dentro de esta corrección.
Publication boundary: publicar el gestor en su raíz real de cPanel. No ejecutar migraciones ni cambiar la página pública.
