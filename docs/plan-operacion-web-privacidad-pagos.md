# Plan de acción para la operación de la página web

## Objetivo

Dar a Aletea una página medible y sostenible sin convertir el gestor en una
tienda compleja ni recopilar información innecesaria. La configuración debe ser
comprensible para una persona no técnica y mantenerse separada de los datos
personales internos.

## Decisiones adoptadas

### Métricas

- Usar Cloudflare Web Analytics cuando Aletea decida activarlo.
- Mantenerlo apagado durante la preparación local.
- Medir visitas, páginas consultadas, origen general, dispositivo, rendimiento
  y clics en acciones públicas.
- No crear perfiles individuales, no usar datos de formularios y no incorporar
  seguimiento publicitario en esta etapa.
- Revisar resultados mensualmente y conservar detalle durante 90 días.

### Privacidad

- Publicar un aviso de privacidad antes de activar formularios o métricas.
- Pedir únicamente los datos necesarios para cada finalidad.
- Separar contacto, actividades, voluntariado, membresía y donaciones.
- Limitar el acceso al equipo responsable y eliminar consultas sin seguimiento
  después de 12 meses como política operativa inicial.
- No enviar diagnósticos, apoyos o datos familiares a herramientas de analítica.

### Inventario

- Comenzar con estados manuales: Disponible, Pocas unidades, Agotado y Por
  encargo.
- Mostrar el equipo responsable y la fecha de la última revisión.
- Confirmar disponibilidad antes de enviar a una persona al pago.
- Incorporar cantidades exactas únicamente cuando exista una rutina estable de
  registro de entradas, reservas y entregas.

### Pagos

- Usar enlaces externos de Mercado Pago para donaciones y compras simples.
- No recibir ni almacenar números de tarjeta en Aletea.
- Separar donaciones, cuotas, inscripciones y tienda.
- Registrar en el gestor solamente concepto, importe, fecha, estado, referencia
  del proveedor y responsable.
- Mantener el catálogo como consulta con confirmación manual, sin carrito, hasta
  que la operación justifique una integración mayor.

## Etapas

### Etapa 1: configuración segura

- [x] Incorporar Operación y privacidad dentro de los ajustes de Página web.
- [x] Aplicar valores iniciales seguros y compatibles con borradores existentes.
- [x] Validar que no se pueda guardar una política que almacene tarjetas o envíe
  datos sensibles a analítica.
- [x] No activar proveedores ni publicar cambios.

### Etapa 2: aviso de privacidad y formularios

- [x] Crear la página pública de privacidad como contenido editable del sitio.
- [x] Asociar una finalidad, responsable y período de conservación a cada formulario.
- [x] Añadir consentimiento explícito cuando corresponda y exigirlo también en el servidor.
- [x] Limitar la lectura de respuestas según el nivel temporal de acceso a datos personales.
- [x] Diseñar una exportación por solicitud y una eliminación verificable. No agregar borrado directo hasta definir revisión, trazabilidad y recuperación.

La lectura de respuestas, tareas derivadas, notificaciones, conversaciones e
historial relacionado ahora exige un nivel temporal vigente. Sin ese acceso, el
gestor mantiene los totales y el estado operativo, pero reemplaza nombres y
detalles por una explicación clara. La ejecución automática de exportaciones o
eliminaciones permanece fuera de alcance porque requiere revisión y recuperación.

El gestor incorpora una pantalla administrativa para registrar solicitudes de
copia o eliminación, verificar identidad, asignar responsable, documentar la
revisión y guardar una constancia de cierre. La pantalla exige acceso sensible
temporal y no ejecuta exportaciones ni borrados. La ejecución real queda fuera
del sistema hasta aprobar un procedimiento de revisión y recuperación.

### Etapa 3: métricas agregadas

- [ ] Activar Cloudflare Web Analytics después de aprobar el aviso de privacidad.
- [x] Incorporar al gestor un resumen simple de visitas, páginas y acciones.
- [x] Mostrar tendencias y recomendaciones, no perfiles de personas.
- [x] Proteger y probar el formato agregado que recibirá la sincronización.
- [x] Confirmar el esquema exacto mediante introspección autenticada.
- [x] Preparar la consulta agregada de visitas y páginas.
- [ ] Definir por separado si Aletea necesita medir acciones públicas.
- [ ] Conectar y programar la actualización después de la aprobación.

El gestor ya dispone de un modelo diario agregado y un resumen visual para 7,
30 o 90 días. Incluye comparaciones, páginas principales, acciones públicas y
un próximo paso explicado en lenguaje simple. No guarda IP, consultas, datos de
formularios ni recorridos individuales. Cloudflare Web Analytics permanece
apagado y todavía no existe una sincronización con el proveedor.
El gestor muestra ahora el avance por pasos y dispone de un contrato local que
rechaza identificadores, consultas, fragmentos, conteos inválidos y campos no
previstos. La consulta exacta ya fue confirmada contra el esquema real de
Cloudflare. El conjunto disponible aporta visitas y páginas, pero no acciones
personalizadas. La consulta de los dominios de Aletea todavía devuelve cero
filas porque la medición no está activa.

### Etapa 4: tienda e inventario

- Habilitar productos con los cuatro estados manuales.
- Exigir fecha de revisión y responsable antes de mostrar un producto.
- Confirmar stock antes del pago y registrar el estado del pedido.

### Etapa 5: pagos externos

- Mantener los enlaces de Mercado Pago editables desde Donaciones y Tienda.
- Validar dominio, HTTPS y ausencia de credenciales privadas en el contenido.
- Añadir conciliación manual con referencia, importe y estado.
- Evaluar Checkout Pro solamente si el volumen vuelve insuficiente el flujo de
  enlaces externos.

## Criterios para avanzar

- La etapa anterior conserva sus pruebas y no presenta desbordamiento móvil.
- Cada cambio tiene responsable, estado visible y registro de auditoría.
- Ninguna acción externa se activa de forma implícita.
- La configuración se entiende sin conocer Cloudflare, bases de datos ni APIs.
- La política de privacidad final se revisa con asesoramiento jurídico uruguayo.

## Fuentes institucionales y técnicas

- URCDP, obligaciones de protección de datos:
  https://www.gub.uy/unidad-reguladora-control-datos-personales/politicas-y-gestion/obligaciones
- Cloudflare Web Analytics:
  https://developers.cloudflare.com/web-analytics/about/
- Mercado Pago Uruguay, soluciones de pago:
  https://www.mercadopago.com.uy/developers/es/docs/getting-started
