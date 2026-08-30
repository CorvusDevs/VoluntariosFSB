# Auditoría de Finanzas contra la planilla 2026

## Decisión de producto

El gestor reemplaza la planilla como sistema de trabajo. No la importa ni reproduce su estructura de una hoja por familia. Cada cuenta conserva un único historial auditable y el cierre mensual se calcula desde los movimientos reales.

La tarea principal es responder tres preguntas sin conocimientos contables:

1. Quién tiene saldo pendiente.
2. Cuánto pagó y qué se le cobró.
3. Qué acción corresponde ahora.

## Información cubierta

- Nombre de la persona o familia.
- Grupo 1, Grupo 2 o sin grupo.
- Cuota regular, beca, voluntariado o cuenta inactiva.
- Porcentaje de beca y observaciones privadas.
- Inscripción, cuotas mensuales, equipamiento, recargos, ajustes y saldo inicial.
- Fecha real del pago, período al que corresponde, vencimiento, medio de pago y comprobante.
- Saldo anterior, cargos, pagos y saldo al cierre de cada mes.
- Pendientes, vencidos, saldos a favor y último pago.
- Compromisos de pago, recordatorios manuales y anulaciones con motivo.
- Exportación CSV del mes para control externo o archivo.

## Automatizaciones cubiertas

- Generación de cuotas por grupo con vista previa.
- Aplicación automática de becas.
- Prevención de cuotas duplicadas para la misma cuenta y mes.
- Cálculo automático del recargo del 10 por ciento desde un importe base.
- Cierre mensual calculado por la fecha real de cobro.
- Priorización de cuentas vencidas y con saldo.

## Mejoras frente al Excel

- Una sola cuenta por familia en lugar de una hoja independiente.
- No se arrastran fórmulas manuales ni errores de referencias entre hojas.
- Los pagos anulados permanecen visibles para auditoría, pero no alteran el saldo.
- Los compromisos no se confunden con dinero recibido.
- Grupo, beca, condición y estado de la cuenta pueden actualizarse.
- Las acciones usan palabras de trabajo, como Inscripción o Equipamiento, en lugar de tipos contables internos.

## Límites deliberados

- No se importan datos del archivo de referencia.
- La asistencia y la inscripción deportiva viven en sus módulos operativos. Finanzas solo conserva la consecuencia económica necesaria.
- Las cuentas con dos nombres siguen siendo una sola unidad de cobro cuando la planilla indica pago de un participante.
- El CSV es una salida de control. La fuente oficial sigue siendo el historial privado y auditable del gestor.
