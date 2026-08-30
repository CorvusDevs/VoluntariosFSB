Outcome: Finanzas permite revisar un estado de cuenta mensual, registrar compromisos y preparar recordatorios manuales claros desde cada cuenta.
Scope: modelo, migración MariaDB, API privada, historial y UI de `Finanzas > Pagos`; sumar estado mensual, compromisos con vencimiento y texto seguro para copiar.
Excluded: publicación, importación del Excel, cobro con tarjetas, envío automático de WhatsApp, conciliación bancaria y migración de datos reales.
Authority: se permiten cambios y pruebas locales; cualquier carga a gestor.aletea.org o ingreso de datos personales reales requiere confirmación posterior.
Evidence: pruebas de cálculos mensuales, permisos y API; suite completa, compilación y verificación estructural adaptable. La revisión visual real en escritorio y teléfono queda pendiente si el navegador local no está disponible.
Stop condition: compromiso auditable, resumen mensual conciliado y recordatorio copiable sin datos innecesarios ni envío automático.
Tool route: inspección dirigida, `apply_patch`, Vitest, compilación y preview local.
Model effort: Terra medium.
Risks: promesas ambiguas, duplicar deuda, divulgar importes por error y confundir copiar con enviar.
First checkpoint: auditar contrato, permisos y semántica de movimientos antes de agregar persistencia.
Status: etapa implementada y auditada localmente. El saldo mensual, los compromisos y los recordatorios manuales mantienen responsabilidades separadas.
Receipts: 1.116 pruebas aprobadas, 20 omitidas por Canvas en jsdom; esquema regenerado desde 49 migraciones; paquete `dist/` generado; sintaxis, diferencias y textos auditados.
Remaining boundary: falta una revisión visual real en navegador y cualquier publicación o migración en cPanel requiere autoridad posterior.
