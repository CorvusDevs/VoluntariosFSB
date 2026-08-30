import { boton, enlaceBoton, elemento } from './componentes.js'
import { rutaParaPantalla } from '../rutas-gestor.js'

const VERSION_AYUDA_RECIENTE = '1.9.13'

const PREGUNTAS_AYUDA_BASE = [
  { categoria: 'Formularios', fuente: 'Versión 1.9.13', pregunta: '¿Cómo creo un formulario sin configurar todo desde cero?', respuesta: 'Abrí Formularios, elegí Nuevo formulario y empezá con Consulta, Inscripción, Voluntariado o Actividad. Después revisá tres bloques: propósito y acceso, recorrido de cada respuesta, y preguntas y privacidad. Los modelos son un punto de partida y podés cambiar cualquier opción antes de guardar.', destino: 'cms-formularios', accion: 'Crear formulario', palabrasClave: 'crear nuevo modelo plantilla preguntas equipo destino privacidad' },
  { categoria: 'Formularios', fuente: 'Versión 1.9.13', pregunta: '¿Cómo dejo constancia de que una respuesta quedó cumplida?', respuesta: 'Abrí Respuestas pendientes y elegí Registrar cumplimiento. Indicá la fecha real, cómo se resolvió y el motivo o resultado. La respuesta pasa al Historial cumplido, donde queda visible quién la registró. Si aparece una nueva necesidad, podés reabrirla explicando el motivo.', destino: 'cms-formularios', accion: 'Revisar respuestas', palabrasClave: 'cerrar cumplir completado resuelto historial fecha motivo reabrir' },
  { categoria: 'Formularios', fuente: 'Versión 1.9.13', pregunta: '¿Cómo encuentro y reutilizo un formulario?', respuesta: 'Usá Buscar formularios para encontrarlo por título, propósito, tipo o equipo. Elegí Duplicar si querés partir de su estructura: se crea una copia editable y el formulario original no cambia.', destino: 'cms-formularios', accion: 'Buscar formularios', palabrasClave: 'buscar encontrar copiar duplicar reutilizar formulario original' },
  { categoria: 'Formularios', fuente: 'Versión 1.9.13', pregunta: '¿Cómo priorizo las respuestas pendientes?', respuesta: 'En Respuestas pendientes podés buscar por persona, formulario, equipo o contenido, filtrar las recién recibidas, las derivadas o las que todavía no tienen tarea, y ordenar por fecha o alfabéticamente. Cada tarjeta indica el próximo paso.', destino: 'cms-formularios', accion: 'Ordenar respuestas', palabrasClave: 'respuesta pendiente filtrar ordenar buscar reciente derivada sin tarea próximo paso' },
  { categoria: 'Agenda', fuente: 'Versión 1.9.10', pregunta: '¿Por qué una recurrencia puede parecer un conflicto con varias fechas?', respuesta: 'Cada encuentro tiene su propia duración y la serie tiene otra fecha para indicar hasta cuándo se repite. Si una finalización antigua abarca varios días, el gestor ya no la usa para unir encuentros posteriores. Al crear una serie nueva, la finalización de cada actividad debe quedar dentro de las 24 horas siguientes.', destino: 'cms-agenda', accion: 'Revisar Agenda', palabrasClave: 'recurrente duplicada conflicto duración finalización fecha repetir clases consejo' },
  { categoria: 'Finanzas', fuente: 'Versión 1.9.9', pregunta: '¿Qué pasa si corrijo una beca mientras preparo las cuotas?', respuesta: 'El gestor conserva el mes, el importe y las fechas. Después de guardar el porcentaje vuelve automáticamente a la revisión, recalcula la cuota y permite generar el mes sin empezar de nuevo.', destino: 'cms-finanzas', accion: 'Preparar cuotas', palabrasClave: 'beca fabian corregir volver generar borrador porcentaje' },
  { categoria: 'Finanzas', fuente: 'Versión 1.9.9', pregunta: '¿Cuándo se aplica el recargo por atraso?', respuesta: 'Desde el día 16 se agrega una sola vez el 10 por ciento a cada cuota común pendiente del mes. No se acumula y no se aplica a cuotas con beca. Si la cuota común quedó pagada hasta el día 15, no recibe recargo.', destino: 'cms-finanzas', accion: 'Abrir Finanzas', palabrasClave: 'recargo atraso mora 10 beca día 16 no acumulable' },
  { categoria: 'Agenda', fuente: 'Versión 1.9.9', pregunta: '¿Cómo repito una reunión el segundo jueves de cada mes?', respuesta: 'Elegí La misma semana y día. Agenda conserva la posición, por ejemplo segundo jueves, aunque la fecha numérica cambie entre meses. Usá El mismo día de cada mes solamente cuando querés conservar un número, como el día 10.', destino: 'cms-agenda', accion: 'Crear reunión', palabrasClave: 'segundo jueves mensual posición recurrente fecha día 10 consejo asesor' },
  { categoria: 'Agenda', fuente: 'Versión 1.9.8', pregunta: '¿Una actividad recurrente puede aparecer como conflicto consigo misma?', respuesta: 'No. El gestor reconoce cada serie y compara solamente actividades distintas. Si dos series diferentes coinciden en horario y comparten lugar, responsable o equipo, muestra un único aviso con una actividad por serie. Las actividades independientes cargadas dos veces sí continúan marcadas como posible duplicado.', destino: 'cms-agenda', accion: 'Revisar Agenda', palabrasClave: 'recurrente serie repetida duplicada conflicto misma actividad ocurrencia' },
  { categoria: 'Agenda', fuente: 'Versión 1.9.6', pregunta: '¿Por qué varias actividades aparecen como un conflicto de agenda?', respuesta: 'El gestor agrupa por horario las actividades que se superponen y comparten lugar, responsable o equipo. Revisá primero las marcadas como prioridad alta. Si el cruce fue coordinado a propósito, elegí Es intencional para retirarlo de la lista principal.', destino: 'cms-agenda', accion: 'Abrir Agenda' },
  { categoria: 'Navegación', fuente: 'Versión 1.9.6', pregunta: '¿Cómo vuelvo a una sección visitada recientemente?', respuesta: 'Elegí Recientes junto a la búsqueda o enfocá el campo vacío. El panel muestra hasta tres destinos anteriores y se cierra al salir, navegar o presionar Escape.', destino: 'inicio', accion: 'Abrir Centro de control' },
  { categoria: 'Página web', fuente: 'Versión 1.9.5', pregunta: '¿Cómo trabajo con más espacio en el editor?', respuesta: 'Activá Modo enfocado en la barra superior. El gestor oculta temporalmente el mapa y el recorrido de publicación para dar prioridad a la maqueta y al panel. Presioná Escape o elegí Salir del modo enfocado para volver.', destino: 'cms-pagina-web', accion: 'Abrir editor enfocado' },
  { categoria: 'Página web', fuente: 'Versión 1.9.5', pregunta: '¿Cómo encuentro una sección o ajusto el espacio de trabajo?', respuesta: 'Usá Comando K para enfocar la búsqueda, filtrá por estado o plegá el mapa. Dentro del área de trabajo podés ajustar el zoom de la maqueta y el ancho del panel. La ruta visible confirma qué elemento estás editando.', destino: 'cms-pagina-web', accion: 'Abrir Página web' },
  { categoria: 'Página web', fuente: 'Versión 1.9.4', pregunta: '¿Cómo encuentro rápidamente una parte del sitio?', respuesta: 'Abrí Página web y elegí una sección desde el mapa inspirado en el símbolo de Aletea. El punto más grande indica dónde estás y el estado de cada destino ayuda a reconocer si está visible, oculto, incompleto o modificado. La búsqueda y las pestañas continúan disponibles.', destino: 'cms-pagina-web', accion: 'Abrir mapa del sitio' },
  { categoria: 'Página web', fuente: 'Versión 1.9.4', pregunta: '¿Cómo cambio el encuadre de una fotografía sin perder calidad?', respuesta: 'Seleccioná la fotografía en la maqueta y mové los controles Horizontal y Vertical de Punto focal. El gestor conserva la imagen WebP optimizada y solamente cambia qué parte queda centrada en los distintos tamaños de pantalla.', destino: 'cms-pagina-web', accion: 'Ajustar fotografías' },
  { categoria: 'Página web', fuente: 'Versión 1.9.4', pregunta: '¿Cómo corrijo un problema antes de publicar?', respuesta: 'Abrí Ajustes y Publicación y calidad. Cada problema funciona como un acceso directo a la sección y al elemento que necesita atención. Después de corregirlo, guardá el borrador y volvé a ejecutar la revisión.', destino: 'cms-pagina-web', accion: 'Revisar publicación' },
  { categoria: 'Página web', fuente: 'Versión 1.9.3', pregunta: '¿Cómo edito una sección sin recorrer todas sus casillas?', respuesta: 'Abrí Página web, buscá la sección y trabajá directamente sobre la maqueta. El inspector muestra Contenido, Diseño y Avanzado por separado. Hacé clic sobre un texto para escribir y usá el panel solamente para imágenes, enlaces, listas y opciones adicionales.', destino: 'cms-pagina-web', accion: 'Abrir editor visual' },
  { categoria: 'Página web', fuente: 'Versión 1.9.3', pregunta: '¿Qué sucede con una imagen cuando la agrego a la página?', respuesta: 'El gestor la convierte automáticamente a WebP y busca el mejor equilibrio entre calidad visual, dimensiones y peso. Antes de guardar muestra el peso original, el peso final y el ahorro. El archivo original permanece en tu dispositivo y solamente se carga la copia optimizada.', destino: 'cms-pagina-web', accion: 'Editar imágenes' },
  { categoria: 'Página web', fuente: 'Versión 1.9.3', pregunta: '¿Puedo deshacer un cambio del editor de la página?', respuesta: 'Sí. Usá Deshacer y Rehacer junto a la vista previa. El editor conserva hasta treinta estados recientes y también guarda una recuperación local para proteger cambios que todavía no llegaron al borrador del gestor.', destino: 'cms-pagina-web', accion: 'Abrir Página web' },
  { categoria: 'Uso del sistema', fuente: 'Versión 1.9.1', pregunta: '¿Cómo vuelvo rápidamente a una sección que estaba usando?', respuesta: 'Abrí el Centro de control y enfocá la búsqueda global. Antes de escribir aparecen hasta cinco secciones visitadas recientemente. El historial se conserva solamente en esta cuenta y este navegador, y podés limpiarlo cuando quieras.', destino: 'inicio', accion: 'Abrir Centro de control' },
  { categoria: 'Página web', fuente: 'Versión 1.9.1', pregunta: '¿Qué pasa si cierro el editor con cambios sin guardar?', respuesta: 'El navegador te avisa antes de cerrar o recargar la pestaña. Elegí permanecer en la página y usá Guardar borrador. Publicar en prueba continúa siendo una acción separada y nunca modifica aletea.org.', destino: 'cms-pagina-web', accion: 'Abrir Página web' },
  { categoria: 'Formularios', fuente: 'Versión 1.9.1', pregunta: '¿Pierdo las respuestas si se corta la conexión mientras completo una prueba?', respuesta: 'No. El formulario conserva un borrador en el dispositivo y lo recupera al volver. También indica cuándo falta conexión y cuándo vuelve. Después de un envío correcto borra ese borrador. Podés quitarlo manualmente con Borrar borrador.', enlace: 'https://prueba.aletea.org/contacto/', accion: 'Probar formularios' },
  { categoria: 'Página web', fuente: 'Versión 1.8.8', pregunta: '¿Cómo se administra un formulario que aparecerá en la página?', respuesta: 'Abrí Página web y Formularios. Seguí los cuatro pasos visibles: creá y ordená las preguntas, asigná el equipo responsable y la información de privacidad, activá el formulario y finalmente vinculalo en la sección pública correspondiente. La vista previa permite revisar el recorrido antes de mostrarlo.', destino: 'cms-pagina-web', accion: 'Administrar formularios' },
  { categoria: 'Página web', fuente: 'Versión 1.8.8', pregunta: '¿Qué falta antes de usar los formularios de prueba con personas reales?', respuesta: 'La demostración técnica ya puede recorrerse, pero antes de producción hay que confirmar el equipo responsable, el consentimiento y la privacidad, el almacenamiento seguro, el mensaje de confirmación y seguimiento, y realizar una prueba completa con el flujo real. La guía de corto plazo muestra esta separación.', enlace: 'https://prueba.aletea.org/validacion-corto-plazo/', accion: 'Revisar activación' },
  { categoria: 'Página web', fuente: 'Versión 1.8.8', pregunta: '¿Por qué un formulario ya muestra una actividad, formación o producto?', respuesta: 'Cuando la persona llega desde una tarjeta, el sitio conserva ese contexto y selecciona la opción correspondiente. También reconoce lista de espera, formación cerrada o aviso de reposición. La persona puede cambiar la selección antes de simular el envío.', enlace: 'https://prueba.aletea.org/actividades/', accion: 'Probar recorrido' },
  { categoria: 'Página web', fuente: 'Versión 1.9.0', pregunta: '¿Cómo pruebo los formularios del sitio nuevo?', respuesta: 'Abrí Contacto en prueba.aletea.org, elegí una necesidad y seguí el formulario recomendado. Usá solamente datos ficticios. El envío se guarda en el gestor, crea un seguimiento verificable y muestra una referencia, el equipo responsable y el plazo esperado.', enlace: 'https://prueba.aletea.org/contacto/', accion: 'Probar formularios' },
  { categoria: 'Página web', fuente: 'Versión 1.8.7', pregunta: '¿Qué pasa si una sección no tiene contenido o una búsqueda no encuentra resultados?', respuesta: 'La página ofrece una alternativa útil en lugar de terminar el recorrido. Podés limpiar filtros, consultar al equipo, pedir aviso sobre una próxima propuesta o ir a una sección relacionada. Los ejemplos continúan identificados y solamente aparecen en el sitio de prueba.', enlace: 'https://prueba.aletea.org/validacion-corto-plazo/', accion: 'Ver validación' },
  { categoria: 'Página web', fuente: 'Versión 1.9.0', pregunta: '¿Por qué aparecen contenidos de ejemplo en el sitio de prueba?', respuesta: 'prueba.aletea.org conserva la información confirmada del gestor y completa las secciones vacías con ejemplos identificados. Los formularios de prueba sí recorren el gestor y deben completarse únicamente con datos ficticios. Esta demostración no cambia aletea.org.', enlace: 'https://prueba.aletea.org/', accion: 'Ver sitio de prueba' },
  { categoria: 'Página web', fuente: 'Versión 1.8.5', pregunta: '¿La etapa de corto plazo necesita una validación presencial?', respuesta: 'No para aprobar la demostración técnica. La barrera automática revisa los diez requisitos en escritorio y teléfonos de 390 y 320 píxeles, comprueba accesibilidad, enlaces, adaptación, consola y composición visual. Los ejemplos siguen identificados y no se presentan como información confirmada. La web pública antigua no cambia.', enlace: 'https://prueba.aletea.org/validacion-corto-plazo/', accion: 'Ver resultado automático' },
  { categoria: 'Página web', fuente: 'Versión 1.8.4', pregunta: '¿Dónde cambio el movimiento y los elementos visuales del sitio?', respuesta: 'Abrí Página web, Ajustes y Apariencia del sitio. Elegí Sin movimiento, Suave o Normal y activá solamente los recursos visuales que necesites. No hace falta editar medidas ni tiempos. El sitio siempre respeta la preferencia del dispositivo de reducir movimiento.', destino: 'cms-pagina-web', accion: 'Abrir Página web' },
  { categoria: 'Página web', fuente: 'Versión 1.8.5', pregunta: '¿Cómo sé si la página está lista para publicar en prueba?', respuesta: 'Abrí Página web, Ajustes y Publicación y calidad. El panel muestra errores concretos, avisa si falta guardar y ofrece enlaces al sitio de prueba y al resultado automático. La aprobación técnica conserva los ejemplos identificados y no publica en aletea.org.', destino: 'cms-pagina-web', accion: 'Revisar publicación' },
  { categoria: 'Página web', fuente: 'Versión 1.8.5', pregunta: '¿Cómo comprobamos que la etapa de corto plazo está realmente terminada?', respuesta: 'Abrí la guía de validación. La barrera automática cubre los diez requisitos, los tres tamaños acordados, accesibilidad, enlaces, consola y regresión visual. La guía enlaza la evidencia y separa la aprobación técnica de la confirmación futura del contenido real.', enlace: 'https://prueba.aletea.org/validacion-corto-plazo/', accion: 'Abrir resultado automático' },
  { categoria: 'Proyectos y tareas', fuente: 'Versión 1.8.0', pregunta: '¿Cómo sigo personalmente un asunto sin duplicar la tarea?', respuesta: 'Abrí la tarea, desplegá Datos adicionales y activá Seguir personalmente. Elegí si no querés olvidarla, esperás una respuesta, necesitás hablar con alguien, revisarla en una reunión o tomar una decisión. Aparecerá en tu resumen semanal sin cambiar la persona responsable.', destino: 'cms-trabajo', accion: 'Abrir Mis tareas' },
  { categoria: 'Reuniones', fuente: 'Versión 1.8.0', pregunta: '¿Cómo cierro una reunión y registro lo que se decidió?', respuesta: 'En Reuniones elegí Cerrar reunión. Completá la minuta y el resumen, agregá cada acuerdo y decidí cuáles necesitan una tarea. El gestor conserva la decisión y crea sus tareas con responsable y fecha en la misma operación.', destino: 'cms-administracion', accion: 'Abrir reuniones' },
  { categoria: 'Uso del sistema', fuente: 'Versión 1.8.0', pregunta: '¿Cómo sé dónde registrar una idea o pedido?', respuesta: 'Abrí Captura rápida y describí brevemente lo que necesitás. El gestor propone tarea, pedido, actividad, proyecto, nota o reunión y usa el mapa de equipos para sugerir un destino. Revisá siempre la propuesta antes de guardar.', destino: 'cms-tablero', accion: 'Abrir Centro de control' },
  { categoria: 'Formularios', fuente: 'Versión 1.8.0', pregunta: '¿Qué sucede cuando alguien responde un formulario?', respuesta: 'Cada formulario define su destino: tarea, solicitud, actividad para revisar, posible alta, contacto o archivo. Las respuestas que podrían cambiar personas, contactos o actividades quedan pendientes de revisión y nunca modifican fichas sensibles automáticamente.', destino: 'cms-formularios', accion: 'Abrir Formularios' },
  { categoria: 'Uso del sistema', fuente: 'Versión 1.7.0', pregunta: '¿Cómo abro una sección en otra pestaña?', respuesta: 'En los accesos que llevan a otra sección podés usar el clic de la rueda del ratón. También podés mantener Cmd en Mac o Ctrl en Windows y hacer clic. El menú contextual del navegador permite elegir Abrir enlace en una pestaña nueva. Las acciones que guardan, eliminan, filtran o abren un panel siguen siendo botones y actúan solamente en la pestaña actual.' },
  { categoria: 'Uso del sistema', fuente: 'Versión 1.6.9', pregunta: '¿Cómo sé para qué sirve un botón?', respuesta: 'Los botones con un nombre claro explican su acción directamente y no muestran mensajes repetidos. Cuando un icono o una acción necesita contexto adicional, dejá el puntero quieto un momento para ver una ayuda breve. Con teclado, la ayuda aparece al enfocar el control. En un teléfono, ninguna instrucción indispensable depende solamente de esta ayuda contextual.' },
  { categoria: 'Accesos', fuente: 'Versión 1.6.6', pregunta: '¿Qué hago cuando una sección dice que me falta acceso?', respuesta: 'La pantalla muestra cada requisito por separado y marca cuál ya está cumplido. Si administrás accesos, elegí Resolver este requisito para abrir la persona y el control exacto que falta. Si no administrás accesos, elegí Cómo solicitarlo y compartí esa indicación con Administración. Ningún permiso se concede automáticamente.', destino: 'accesos', accion: 'Revisar accesos' },
  { categoria: 'Uso del sistema', fuente: 'Versión 1.6.4', pregunta: '¿Por qué los enlaces del gestor ahora tienen nombres como /finanzas o /agenda?', respuesta: 'Cada sección tiene una dirección clara que se puede guardar, recargar y compartir. Si abrís el enlace sin una sesión activa, el gestor solicita el ingreso y después lleva a la sección pedida. Los enlaces antiguos con # continúan funcionando.', destino: 'ayuda', accion: 'Abrir Ayuda' },
  { categoria: 'Uso del sistema', fuente: 'Versión 1.6.4', pregunta: '¿Qué información aparece al compartir un enlace del gestor?', respuesta: 'La vista previa muestra solamente el nombre general de la sección y una explicación institucional. Nunca incluye nombres de personas, saldos, tareas, respuestas ni otros datos privados. Abrir el enlace tampoco evita los permisos: cada persona sigue viendo únicamente lo que su cuenta autoriza.', destino: 'accesos', accion: 'Revisar Accesos', soloAdmin: true },
  { categoria: 'Finanzas', fuente: 'Versión 1.6.7', pregunta: '¿Cómo empiezo a llevar las cuotas sin usar el Excel?', respuesta: 'Configurá el tipo de cuota en el perfil de cada participante. Personas mantiene sincronizados el nombre, el grupo, la beca y el estado con Finanzas. Después usá Generar cuotas: el asistente muestra quién paga, quién queda fuera y el importe final antes de confirmar.', destino: 'cms-finanzas', accion: 'Abrir Finanzas' },
  { categoria: 'Finanzas', fuente: 'Versión 1.6.7', pregunta: '¿La beca se descuenta automáticamente?', respuesta: 'Sí. Ingresá un único importe base al preparar el mes. La cuota completa usa ese valor y el descuento se aplica automáticamente con el porcentaje guardado en Personas. Voluntariado o participante inactivo no generan cuota. La revisión muestra la cuenta antes de guardar.', destino: 'cms-finanzas', accion: 'Revisar cuotas' },
  { categoria: 'Personas', fuente: 'Versión 1.9.12', pregunta: '¿Dónde registro la entrega y el pago de un equipo?', respuesta: 'Abrí el participante y marcá Equipo entregado. Elegí si es nuevo o usado, la fecha y el talle. La entrega queda en su ficha. Si hubo un cobro, abrí el detalle de esa persona en Finanzas y elegí Registrar pago de equipo. Son dos registros separados para no confundir la entrega con el dinero recibido.', destino: 'personas', accion: 'Abrir Personas' },
  { categoria: 'Finanzas', fuente: 'Versión 1.6.7', pregunta: '¿Qué hago si un pago no se guarda o parece repetido?', respuesta: 'Completá participante, importe, fecha y medio de pago. Si ya existe otro pago con el mismo participante, importe y fecha, el gestor lo advierte antes de guardar. Al confirmar muestra el nuevo saldo y permite ver, corregir o registrar otro pago. Corregir conserva el registro anulado para auditoría.', destino: 'cms-finanzas', accion: 'Registrar un pago' },
  { categoria: 'Finanzas', fuente: 'Versión 1.6.6', pregunta: '¿Dónde registro inscripción, equipamiento o un recargo?', respuesta: 'Abrí la cuenta, elegí Agregar cargo y seleccioná la acción con su nombre habitual: Cuota individual, Inscripción, Equipamiento, Recargo del 10 por ciento u Otro cargo. Para un recargo, ingresá el importe original y el gestor calcula el 10 por ciento.', destino: 'cms-finanzas', accion: 'Agregar un cargo' },
  { categoria: 'Finanzas', fuente: 'Versión 1.6.7', pregunta: '¿Cómo cambio el grupo, la beca o el tipo de cuota?', respuesta: 'Abrí el perfil en Personas y usá Cuota mensual. Elegí cuota completa, cuota con beca, sin cuota por voluntariado o participante inactivo. Si elegís beca, indicá el porcentaje. Finanzas se actualiza al guardar y conserva el historial anterior.', destino: 'personas', accion: 'Abrir Personas' },
  { categoria: 'Finanzas', fuente: 'Versión 1.8.9', pregunta: '¿Cómo elimino un participante que agregué para probar?', respuesta: 'Abrí su detalle en Finanzas y elegí Archivar participante. El gestor abre directamente su perfil y explica el cambio antes de confirmarlo. Archivar lo quita de las listas activas y evita nuevas cuotas, pero conserva su ficha, pagos e historial. Si fue un error, podés usar Deshacer o restaurarlo desde Personas archivadas.', destino: 'cms-finanzas', accion: 'Abrir Finanzas' },
  { categoria: 'Personas', fuente: 'Versión 1.8.9', pregunta: '¿Puedo registrar hoy a alguien que comienza más adelante?', respuesta: 'Sí. En el perfil, En la organización desde admite una fecha futura para registrar incorporaciones ya confirmadas. La persona queda preparada con su fecha real de inicio. Las fechas de nacimiento, consentimiento y revisión mantienen el límite de hoy porque documentan hechos ya ocurridos.', destino: 'personas', accion: 'Abrir Personas' },
  { categoria: 'Uso del sistema', fuente: 'Versión 1.8.9', pregunta: '¿Puedo ocultar el Radar institucional?', respuesta: 'Sí. Usá Ocultar en el encabezado del Radar institucional para dejar más espacio al contenido principal. Elegí Mostrar para abrirlo nuevamente. El gestor recuerda esta preferencia en ese navegador.', destino: 'inicio', accion: 'Abrir Centro de control' },
  { categoria: 'Finanzas', fuente: 'Versión 1.6.6', pregunta: '¿Cómo guardo un control externo del mes?', respuesta: 'Elegí el mes que querés revisar y usá Exportar mes. Se descarga un archivo CSV con cuentas, cargos, pagos, fechas, vencimientos, comprobantes, notas y saldos. El historial del gestor sigue siendo la fuente oficial.', destino: 'cms-finanzas', accion: 'Abrir Finanzas' },
  { categoria: 'Finanzas', fuente: 'Versión 1.6.3', pregunta: '¿Qué permiso necesito para abrir Finanzas?', respuesta: 'Necesitás acceso vigente a Datos personales completos y pertenecer al equipo Finanzas. Administración también puede acceder por su alcance institucional. La propia pantalla indica qué requisito está cumplido y cuál falta. Si administrás accesos, podés abrir directamente la persona correspondiente para resolverlo.', destino: 'cms-finanzas', accion: 'Abrir Finanzas' },
  { categoria: 'Finanzas', fuente: 'Versión 1.6.3', pregunta: '¿Qué muestra el estado de cuenta mensual?', respuesta: 'Resume el saldo anterior, los cargos del mes, los pagos registrados y el saldo al cierre. También conserva los movimientos para que el resultado se pueda revisar. Cambiar de mes no modifica ningún pago ni cargo.', destino: 'cms-finanzas', accion: 'Abrir Finanzas' },
  { categoria: 'Finanzas', fuente: 'Versión 1.6.0', pregunta: '¿Cómo interpreto el cierre mensual de Fútbol sin Barreras?', respuesta: 'Por cobrar suma el saldo pendiente al comenzar el mes y los cargos emitidos durante ese período. Cobrado usa la fecha real en que se registró cada pago, aunque corresponda a una cuota anterior. Pendiente al cierre muestra lo que todavía quedaba por cobrar. Los movimientos anulados y los compromisos de pago no se cuentan como dinero recibido.', destino: 'cms-finanzas', accion: 'Abrir Finanzas' },
  { categoria: 'Finanzas', fuente: 'Versión 1.6.3', pregunta: '¿Un compromiso de pago cambia el saldo?', respuesta: 'No. El compromiso registra una fecha acordada, un importe opcional y una nota interna, pero no crea un cargo ni cuenta como pago. Cuando el dinero se recibe, el pago debe registrarse por separado. Marcar el compromiso como cumplido tampoco altera el saldo.', destino: 'cms-finanzas', accion: 'Abrir Finanzas' },
  { categoria: 'Finanzas', fuente: 'Versión 1.6.3', pregunta: '¿El gestor envía recordatorios de pago?', respuesta: 'No. El gestor prepara un texto editable y lo copia solamente cuando la persona usuaria lo solicita. El importe se omite por defecto y se puede incluir de forma consciente. Después, la persona decide a quién y por qué canal enviarlo. El sistema registra que se preparó un recordatorio, pero no guarda el texto ni lo envía automáticamente.', destino: 'cms-finanzas', accion: 'Abrir Finanzas' },
  { categoria: 'Accesos', fuente: 'Versión 1.5.4', pregunta: '¿Tengo que reducir una foto antes de agregarla al perfil?', respuesta: 'No. Elegí una foto JPG, PNG o WebP de hasta 20 MB. El gestor la adapta, la convierte a un formato liviano y guarda solamente la copia optimizada. La foto de perfil sigue siendo privada y solo Administración puede verla o cambiarla.', destino: 'accesos', accion: 'Abrir Accesos', soloAdmin: true },
  { categoria: 'Accesos', fuente: 'Versión 1.6.1', pregunta: '¿Cómo sé exactamente qué puede hacer una persona?', respuesta: 'En Accesos, cada persona tiene un resumen de lo que puede ver, editar, publicar y administrar. Las etiquetas superiores explican de dónde sale el permiso: perfil, áreas asignadas y acceso a datos personales. Usá Ver el gestor como para abrir una explicación completa. Es una vista informativa: no inicia sesión como esa persona ni cambia su cuenta.', destino: 'accesos', accion: 'Abrir Accesos', soloAdmin: true },
  { categoria: 'Accesos', fuente: 'Versión 1.6.1', pregunta: '¿Asignar un equipo también habilita datos personales?', respuesta: 'No. El perfil define las funciones generales y los equipos limitan las tareas cotidianas. Los datos personales se conceden por separado, con un nivel y una duración. Cambiar el perfil o los equipos nunca activa información privada automáticamente.', destino: 'accesos', accion: 'Abrir Accesos', soloAdmin: true },
  { categoria: 'Accesos', fuente: 'Versión 1.6.2', pregunta: '¿Qué habilita cada nivel de datos personales?', respuesta: 'Sin acceso a datos personales mantiene bloqueadas respuestas, entradas, fotos internas, fichas y pagos. Datos personales básicos permite abrir respuestas, entradas, tareas relacionadas y fotos internas en modo lectura, pero no la ficha completa. Datos personales completos agrega contactos, fecha de nacimiento, necesidades sensibles y cambio de fotos. Accesos indica si Finanzas y Privacidad ya cumplen sus requisitos y permite abrir la configuración necesaria cuando falta algo.', destino: 'accesos', accion: 'Abrir Accesos', soloAdmin: true },
  { categoria: 'Accesos', fuente: 'Versión 1.6.1', pregunta: '¿Qué diferencia hay entre un acceso temporal y uno sin vencimiento?', respuesta: 'Hasta una fecha se desactiva automáticamente al terminar el día elegido. Sin vencimiento permanece activo hasta que Administración lo cambie o lo quite. Elegir Sin vencimiento siempre requiere una acción explícita y queda registrado. Usalo solo cuando la función de la persona necesita ese acceso de forma estable.', destino: 'accesos', accion: 'Abrir Accesos', soloAdmin: true },
  { categoria: 'Accesos', fuente: 'Versión 1.5.2', pregunta: '¿Quién puede editar la página y crear piezas?', respuesta: 'Administración, Dirección y Coordinación pueden trabajar con el contenido de la página, sus imágenes, las métricas agregadas y las piezas de comunicación. Solo Administración y Dirección pueden publicar la página. Integrante y Consulta no acceden a esos editores.' },
  { categoria: 'Comunicación visual', fuente: 'Versión 1.6.8', pregunta: '¿Cómo creo una carta membretada?', respuesta: 'Por privacidad, Carta membretada está disponible solo para Dirección y Administración. La carta y la firma permanecen únicamente mientras la pestaña está abierta: no se guardan entre sesiones ni en dispositivos compartidos. La hoja siempre es blanca; las combinaciones de colores cambian únicamente el membrete y sus detalles. En el editor podés cambiar texto, estilo y elementos del membrete.', destino: 'cms-comunicacion-visual', accion: 'Abrir Editor de piezas' },
  { categoria: 'Comunicación visual', fuente: 'Versión 1.5', pregunta: '¿Cómo agrego una firma y guardo la carta como PDF?', respuesta: 'En Elementos elegí una firma desde el dispositivo o cargala desde un enlace público. Cuando la carta esté lista, usá Imprimir o guardar PDF. En el diálogo del sistema elegí Guardar como PDF si no querés imprimirla en papel.', destino: 'cms-comunicacion-visual', accion: 'Abrir Editor de piezas' },
  { categoria: 'Página web', fuente: 'Versión 1.4.2', pregunta: '¿Por qué la vista previa puede verse distinta de prueba.aletea.org?', respuesta: 'La vista previa muestra el borrador mientras editás. prueba.aletea.org muestra la última revisión publicada y preparada para el sitio. Si acabás de publicar y todavía ves el diseño anterior, recargá el sitio de prueba. El paquete actual comprueba que usa contenido del CMS y ya no acepta una copia local anterior.', destino: 'cms-pagina-web', accion: 'Abrir Contenido' },
  { categoria: 'Uso del sistema', fuente: 'Versión 1.4.2', pregunta: '¿Una publicación de la página web cuenta como actualización del gestor?', respuesta: 'No. Publicar contenido en prueba.aletea.org cambia la revisión editorial de la página, pero no la versión del gestor. El aviso Actualizar aparece únicamente cuando se publica nuevo código del sistema, por ejemplo una función, una corrección o un cambio de interfaz.' },
  { categoria: 'Comunicación visual', fuente: 'Versión 1.4.2', pregunta: '¿Cómo hago más grande el título de una pieza?', respuesta: 'Abrí Estilo y mové Tamaño del título. Ahora podés llevarlo hasta 2 veces el tamaño normal. Mirá siempre la vista previa: si el título tiene varias líneas, el gestor puede limitarlo para proteger la fotografía y la información inferior.', destino: 'cms-comunicacion-visual', accion: 'Abrir Editor de piezas' },
  { categoria: 'Uso del sistema', fuente: 'Versión 1.4.1', pregunta: '¿Qué hago si veo una pantalla desordenada después de una actualización?', respuesta: 'Recargá la página una vez. Desde la versión 1.4.1 el gestor evita combinar el diseño anterior con funciones nuevas. Si la pantalla no se corrige, cerrá esa pestaña, volvé a abrir gestor.aletea.org y comprobá que el pie muestre la versión más reciente.' },
  { categoria: 'Página web', fuente: 'Versión 1.3', pregunta: '¿Dónde edito el contenido de la página web?', respuesta: 'Abrí Página web y elegí Contenido. Podés seleccionar los textos en la vista previa, escribir directamente y revisar el resultado antes de guardar.', destino: 'cms-pagina-web', accion: 'Abrir Contenido' },
  { categoria: 'Página web', fuente: 'Versión 1.3', pregunta: '¿Guardar un borrador cambia la página pública?', respuesta: 'No. Guardar borrador conserva los cambios dentro del gestor. Publicar en prueba actualiza prueba.aletea.org para revisión, pero no modifica aletea.org. Solo Administración y Dirección pueden publicar.', destino: 'cms-pagina-web', accion: 'Abrir Contenido' },
  { categoria: 'Página web', fuente: 'Versión 1.5.1', pregunta: '¿Dónde puedo usar League Gothic en la página?', respuesta: 'En Portada, Cifras, Participación, Qué hacemos, Formación y Actualidad aparece Estilo del texto. Elegí Institucional para Poppins o Con impacto para League Gothic y revisá el resultado en la vista previa. El interlineado se ajusta automáticamente para que las letras no se toquen. Los párrafos, menús, botones y formularios siempre conservan Poppins.', destino: 'cms-pagina-web', accion: 'Abrir Contenido' },
  { categoria: 'Comunicación visual', fuente: 'Versión 1.4', pregunta: '¿Cómo creo una imagen para redes o una campaña?', respuesta: 'Abrí Comunicación visual y elegí Editor de piezas. Partí de una plantilla, editá Texto, Estilo y Elementos con vista previa, y descargá el resultado. Si elegís Carrusel, podés descargar todas las páginas juntas.', destino: 'cms-comunicacion-visual', accion: 'Abrir Editor de piezas' },
  { categoria: 'Comunicación visual', fuente: 'Versión 1.4', pregunta: '¿Cómo agrego una fotografía a una pieza?', respuesta: 'En Elementos, usá Elegir imagen para tomar un archivo del dispositivo. También podés abrir Usar una imagen desde un enlace y pegar una dirección directa o un enlace público de Google Drive. En Drive, el acceso debe estar habilitado para cualquier persona con el enlace.', destino: 'cms-comunicacion-visual', accion: 'Abrir Editor de piezas' },
  { categoria: 'Comunicación visual', fuente: 'Versión 1.3', pregunta: '¿Puedo usar League Gothic en una pieza?', respuesta: 'Sí. En Estilo, elegí League Gothic para los titulares. Los textos secundarios se mantienen en Poppins para conservar una lectura clara.', destino: 'cms-comunicacion-visual', accion: 'Abrir Editor de piezas' },
  { categoria: 'Asistencia', fuente: 'Versión 1.2', pregunta: '¿Qué pasa con una persona archivada en el reporte mensual?', respuesta: 'Una persona archivada no aparece en un mes donde no tuvo actividad. Si tuvo una asistencia, una falta registrada o una corrección durante el período elegido, el reporte conserva esa fila para no perder el historial.' },
  { categoria: 'Equipos', fuente: 'Audio 1', pregunta: '¿Dónde creo un equipo nuevo?', respuesta: 'Entrá a Áreas y usá Nuevo equipo. Después podés asignar integrantes desde el propio equipo o desde Accesos.', destino: 'cms-areas', accion: 'Abrir Áreas' },
  { categoria: 'Equipos', fuente: 'Audio 1', pregunta: '¿Cómo agrego personas a un equipo?', respuesta: 'Desde Accesos, abrí la persona, desplegá Equipos asignados y elegí los equipos y funciones. También podés entrar a la pantalla del equipo y usar Gestionar integrantes para agregar, cambiar la función o quitar una persona.', destino: 'accesos', accion: 'Abrir Accesos', soloAdmin: true },
  { categoria: 'Equipos', fuente: 'Audio 1', pregunta: '¿Cómo cambio la función de una persona en el equipo?', respuesta: 'Abrí Gestionar integrantes dentro del equipo o Equipos asignados dentro de Accesos. Elegí Coordinación, Referente, Sustitución o Integrante y guardá el cambio.', destino: 'cms-areas', accion: 'Ver equipos', soloAdmin: true },
  { categoria: 'Equipos', fuente: 'Audio 1', pregunta: '¿Una persona puede integrar más de un equipo?', respuesta: 'Sí. En Accesos podés asignar la misma persona a varios equipos y darle una función distinta en cada uno.', destino: 'accesos', accion: 'Abrir Accesos', soloAdmin: true },
  { categoria: 'Proyectos y tareas', fuente: 'Audio 1', pregunta: '¿Cómo creo un proyecto dentro de Familias u otro equipo?', respuesta: 'Entrá al equipo correspondiente, buscá Proyectos y elegí Nuevo proyecto. El equipo queda preseleccionado cuando iniciás la acción desde su pantalla.', destino: 'cms-familias', accion: 'Abrir Familias' },
  { categoria: 'Proyectos y tareas', fuente: 'Audio 1', pregunta: '¿Qué diferencia hay entre proyecto, actividad y tarea?', respuesta: 'Un proyecto organiza un objetivo amplio. Una actividad representa un encuentro o evento con fecha. Una tarea es una acción concreta que una persona debe completar. Las actividades y tareas pueden quedar vinculadas al proyecto.' },
  { categoria: 'Proyectos y tareas', fuente: 'Audio 1', pregunta: '¿Cómo agrego tareas o actividades a un proyecto?', respuesta: 'Usá Nueva tarea o Nueva actividad y seleccioná el proyecto relacionado. Podés indicar responsable, equipo, prioridad, fecha y contexto.', destino: 'cms-trabajo', accion: 'Abrir Mis tareas' },
  { categoria: 'Proyectos y tareas', fuente: 'Versión 1.2', pregunta: '¿Cómo agendo una actividad recurrente?', respuesta: 'En Agenda elegí Nueva actividad, completá la primera fecha y seleccioná una repetición semanal, quincenal o mensual. Para una repetición mensual podés conservar el número de día o la posición, como segundo jueves. Indicá hasta qué día debe repetirse. El gestor crea la serie completa, hasta un año, y después podés editar cada actividad por separado.', destino: 'cms-agenda', accion: 'Abrir Agenda' },
  { categoria: 'Proyectos y tareas', fuente: 'Versión 1.2', pregunta: '¿Cómo agendo una reunión recurrente?', respuesta: 'En Preparar reunión elegí una repetición semanal, quincenal o mensual y una fecha final. Para reuniones como el segundo jueves, elegí La misma semana y día. El gestor crea cada reunión de la serie. La preparación, la minuta y las decisiones se registran de forma independiente en cada fecha.', destino: 'cms-agenda', accion: 'Abrir Agenda' },
  { categoria: 'Proyectos y tareas', fuente: 'Versión 1.2', pregunta: '¿Cuándo uso una tarea recurrente en lugar de una actividad recurrente?', respuesta: 'Usá una tarea recurrente para una acción que vuelve a vencer, como revisar un informe. Usá una actividad recurrente para algo que ocupa una fecha en la agenda, como un curso. Usá una reunión recurrente cuando además necesitás preparación, minuta y decisiones por encuentro.' },
  { categoria: 'Proyectos y tareas', fuente: 'Versión 1.2', pregunta: '¿Qué significa esfuerzo estimado?', respuesta: 'Es la cantidad aproximada de horas de trabajo activo que requiere una tarea. No es el tiempo que falta hasta la fecha límite. Sirve para comparar la carga asignada con la disponibilidad semanal de las personas.' },
  { categoria: 'Proyectos y tareas', fuente: 'Versión 1.2', pregunta: '¿Qué es el programa de un proyecto?', respuesta: 'Un programa es una línea de trabajo estable que agrupa varios proyectos relacionados bajo un objetivo común. Por ejemplo, un programa de apoyo a familias puede reunir talleres, campañas y encuentros. Si el proyecto es independiente, podés elegir Sin programa.' },
  { categoria: 'Proyectos y tareas', fuente: 'Audio 1', pregunta: '¿Dónde veo todo lo relacionado con un proyecto?', respuesta: 'Abrí el proyecto desde la pantalla de su equipo. Allí se reúnen tareas, actividades, documentos, hitos, riesgos y seguimiento.' },
  { categoria: 'Accesos', fuente: 'Audio 2', pregunta: '¿Puedo dar acceso a coordinadores e integrantes?', respuesta: 'Sí. Una persona administradora puede crear el acceso, elegir el perfil y asignar uno o más equipos. Coordinación e Integrante necesitan al menos un equipo asignado.', destino: 'accesos', accion: 'Abrir Accesos', soloAdmin: true },
  { categoria: 'Accesos', fuente: 'Versión 1.5.3', pregunta: '¿Qué puede hacer cada perfil de acceso?', respuesta: 'Administración gestiona toda la institución y los accesos. Dirección tiene visión institucional, edita y publica la página, pero no administra cuentas. Coordinación organiza sus equipos y edita contenido público sin publicarlo. Integrante actualiza sus propias tareas. Consulta tiene acceso limitado de lectura.' },
  { categoria: 'Accesos', fuente: 'Audio 2', pregunta: '¿Puedo asignarle una tarea a otra persona?', respuesta: 'Sí. En Nueva tarea elegí Responsable. La persona verá la asignación en su bandeja de tareas y en sus notificaciones internas.', destino: 'cms-trabajo', accion: 'Crear una tarea' },
  { categoria: 'Notificaciones', fuente: 'Audio 2', pregunta: '¿Dónde veo las notificaciones de tareas?', respuesta: 'Las notificaciones aparecen dentro del gestor institucional. La persona debe ingresar para revisar nuevas asignaciones y seguimientos.', destino: 'cms-trabajo', accion: 'Abrir Mis tareas' },
  { categoria: 'Notificaciones', fuente: 'Audio 2', pregunta: '¿El teléfono avisa automáticamente cuando me asignan una tarea?', respuesta: 'No por el momento. El sistema todavía no envía avisos automáticos al teléfono ni por correo. La bandeja interna es la fuente actual de notificaciones.' },
  { categoria: 'Notificaciones', fuente: 'Audio 2', pregunta: '¿Cómo sé si una notificación ya fue revisada?', respuesta: 'Las notificaciones internas distinguen las nuevas de las leídas. Al abrir la acción relacionada, el sistema te lleva al elemento correspondiente.' },
  { categoria: 'Tareas', fuente: 'Gestor', pregunta: '¿Puedo explicar cómo completé una tarea?', respuesta: 'Sí. Al elegir Completar tarea podés dejar un comentario opcional. Queda en la conversación con tu nombre y fecha para que quien la asignó tenga el contexto necesario.', destino: 'cms-trabajo', accion: 'Abrir Mis tareas' },
  { categoria: 'Notificaciones', fuente: 'Gestor', pregunta: '¿Por qué el contador de Mis tareas muestra un aviso?', respuesta: 'El indicador lateral cuenta avisos nuevos, no tareas abiertas. Al completar una tarea, su aviso de asignación se resuelve automáticamente. Otros avisos reales permanecen hasta que los revises.', destino: 'cms-trabajo', accion: 'Revisar avisos' },
  { categoria: 'Notificaciones', fuente: 'Audio 3', pregunta: '¿Cómo reemplazamos los avisos cotidianos de WhatsApp?', respuesta: 'Cada persona revisa Mis tareas y el contador de avisos al ingresar. Las asignaciones nuevas aparecen destacadas y abren la tarea exacta. WhatsApp queda como respaldo manual, no como canal obligatorio.', destino: 'cms-trabajo', accion: 'Abrir Mis tareas' },
  { categoria: 'Notificaciones', fuente: 'Audio 3', pregunta: '¿Cómo preparo un aviso manual para una tarea?', respuesta: 'En la tarjeta de una tarea asignada usá Copiar aviso. El gestor prepara un mensaje breve con el nombre de la tarea y su enlace directo. Después elegís dónde pegarlo. Copiar no significa que el mensaje haya sido enviado o leído.', destino: 'cms-trabajo', accion: 'Abrir Mis tareas' },
  { categoria: 'Notificaciones', fuente: 'Audio 3', pregunta: '¿Puedo copiar un resumen para todo un equipo?', respuesta: 'Sí. Entrá a la pantalla del equipo y usá Copiar resumen del equipo. El texto incluye la cantidad de tareas abiertas y hasta cinco títulos, sin copiar descripciones ni datos sensibles.', destino: 'cms-areas', accion: 'Ver equipos' },
  { categoria: 'Uso del sistema', fuente: 'Audio 3', pregunta: '¿Cómo sé quién todavía no está usando el gestor?', respuesta: 'Administración puede abrir Accesos. El resumen muestra quién nunca ingresó y quién lleva siete días o más sin entrar, para ofrecer acompañamiento sin depender de mensajes masivos.', destino: 'accesos', accion: 'Abrir Accesos', soloAdmin: true },
  { categoria: 'Materiales y enlaces', fuente: 'Audios del 27 de agosto', pregunta: '¿Puedo compartir un enlace de Canva en una tarea?', respuesta: 'Sí. En la edición de la tarea usá Instrucciones y materiales. Indicá un nombre, pegá el enlace y elegí Agregar enlace a la tarea. También podés usar la guía de entrega para ordenar objetivo, pasos, materiales, correo y resultado esperado. La persona responsable verá todo junto y podrá abrir el material con un clic.', destino: 'cms-trabajo', accion: 'Crear o revisar una tarea' },
  { categoria: 'Proyectos y tareas', fuente: 'Audios del 27 de agosto', pregunta: '¿Qué ve una persona cuando le comparto el enlace de una tarea?', respuesta: 'Al abrir el enlace después de ingresar, ve primero qué hay que hacer, los materiales con enlaces, la persona responsable, la fecha, el proyecto y la actividad. Debajo quedan las dependencias y la conversación. Así WhatsApp solamente transporta el enlace y la información operativa permanece en el gestor.', destino: 'cms-trabajo', accion: 'Abrir Mis tareas' },
  { categoria: 'Materiales y enlaces', fuente: 'Versión 1.2', pregunta: '¿Cómo agrego un enlace de Google Drive o Canva a la Biblioteca?', respuesta: 'Abrí Biblioteca y elegí Agregar documento. En Enlace del recurso podés usar Pegar enlace o presionar Ctrl+V. El gestor reconoce la dirección aunque lo copiado incluya un título. Antes de guardar, comprobá en Drive o Canva que las personas destinatarias tengan permiso para abrir el material.', destino: 'cms-biblioteca', accion: 'Abrir Biblioteca' },
  { categoria: 'Materiales y enlaces', fuente: 'Audio 2', pregunta: '¿Dónde guardo documentos generales de un proyecto?', respuesta: 'Usá Biblioteca para registrar un documento o enlace y asociarlo al equipo o proyecto. Elegí la sensibilidad correcta antes de guardarlo.', destino: 'cms-biblioteca', accion: 'Abrir Biblioteca' },
  { categoria: 'Materiales y enlaces', fuente: 'Audio 2', pregunta: '¿Puedo subir un archivo directamente?', respuesta: 'Todavía no. La versión actual registra enlaces a materiales externos y documentos. Los archivos adjuntos requieren reglas de tamaño, privacidad, almacenamiento y respaldo antes de habilitarse.' },
  { categoria: 'Uso del sistema', fuente: 'Ambos audios', pregunta: '¿Qué hago si no encuentro una función?', respuesta: 'Buscá aquí una palabra relacionada con lo que querés hacer. Si la respuesta no existe o no coincide con la pantalla, registrá la duda para ampliar esta guía antes de modificar el sistema.' },
  { categoria: 'Uso del sistema', fuente: 'Ambos audios', pregunta: '¿Cómo sé qué cambió en una versión nueva?', respuesta: 'El gestor abre Cambios del sistema una vez cuando detecta una versión que todavía no viste. También podés abrir Cambios manualmente desde el final del panel lateral.' },
]

const PREGUNTAS_RETIRADAS = new Set([
  '¿Cómo vuelvo rápidamente a una sección que estaba usando?',
  '¿Qué falta antes de usar los formularios de prueba con personas reales?',
  '¿La etapa de corto plazo necesita una validación presencial?',
  '¿Cómo comprobamos que la etapa de corto plazo está realmente terminada?',
  '¿Dónde edito el contenido de la página web?',
])

const PREGUNTAS_ACTUALIZADAS = new Map([
  ['¿Cómo se administra un formulario que aparecerá en la página?', {
    categoria: 'Formularios', fuente: 'Versión 1.9.7',
    respuesta: 'Abrí Formularios, elegí Nuevo formulario y completá primero su finalidad, el equipo responsable y la privacidad. Después ordená las preguntas, revisá la vista pública y activalo. Por último vinculalo desde Página web. Un formulario oculto o inactivo no recibe respuestas.',
    destino: 'cms-formularios', accion: 'Administrar formularios',
    palabrasClave: 'crear publicar activar vincular preguntas consentimiento responsable',
  }],
  ['¿Qué hago si veo una pantalla desordenada después de una actualización?', {
    fuente: 'Versión 1.9.7',
    respuesta: 'Recargá la página una vez. El gestor evita combinar archivos de versiones distintas y el pie confirma la versión activa. Si el problema continúa, cerrá esa pestaña, volvé a abrir gestor.aletea.org y anotá qué sección estabas usando para poder revisarla.',
    palabrasClave: 'cache caché diseño roto interfaz vieja actualizar recargar versión',
  }],
  ['¿Qué hago si no encuentro una función?', {
    fuente: 'Versión 1.9.7',
    respuesta: 'Buscá aquí el resultado que querés conseguir, no solamente el nombre del botón. Probá palabras como cobrar, persona, agenda, publicar o permiso. Si no aparece una respuesta, revisá la categoría relacionada y registrá la duda con la pantalla y la tarea que intentabas completar.',
    palabrasClave: 'no encuentro buscar donde está función botón duda soporte',
  }],
])

const PREGUNTAS_NUEVAS = [
  { categoria: 'Agenda', fuente: 'Versión 1.9.7', pregunta: '¿Cómo creo una actividad o una reunión en la agenda?', respuesta: 'Abrí Agenda y elegí Nueva actividad o Nueva reunión. Indicá fecha, horario, lugar, equipo y responsable. Antes de guardar, revisá los cruces que muestra el gestor. Una reunión agrega preparación, minuta y decisiones; una actividad sirve para cursos, encuentros y otros eventos.', destino: 'cms-agenda', accion: 'Abrir Agenda', palabrasClave: 'calendario evento encuentro crear agendar horario' },
  { categoria: 'Agenda', fuente: 'Versión 1.9.7', pregunta: '¿Cómo recupero un cruce de agenda que marqué como intencional?', respuesta: 'Abrí Agenda y, dentro de Conflictos, elegí Mostrar cruces coordinados. El cruce vuelve a aparecer con todas las actividades involucradas. Desde allí podés revisarlo y devolverlo a la lista principal si dejó de estar coordinado.', destino: 'cms-agenda', accion: 'Revisar cruces', palabrasClave: 'conflicto oculto coordinado recuperar restaurar superposición' },
  { categoria: 'Personas', fuente: 'Versión 1.9.7', pregunta: '¿Cómo archivo o recupero a una persona sin perder su historial?', respuesta: 'Abrí Personas, entrá a la ficha y elegí Archivar. La persona deja de aparecer en los flujos activos, pero conserva su información histórica. Para recuperarla, filtrá por Archivadas, abrí la ficha y elegí Recuperar.', destino: 'personas', accion: 'Abrir Personas', palabrasClave: 'eliminar borrar quitar participante restaurar inactivo historial' },
  { categoria: 'Personas', fuente: 'Versión 1.9.7', pregunta: '¿Cuál es la diferencia entre una persona y una cuenta de acceso?', respuesta: 'Personas reúne perfiles operativos, participantes y contactos. Accesos define quién puede ingresar al gestor y qué puede hacer. Crear una persona no le da una cuenta automáticamente; crear un acceso tampoco reemplaza su ficha ni su pertenencia a equipos.', destino: 'personas', accion: 'Abrir Personas', palabrasClave: 'usuario login perfil cuenta integrante participante contacto' },
  { categoria: 'Formularios', fuente: 'Versión 1.9.7', pregunta: '¿Cómo pruebo un formulario antes de compartirlo?', respuesta: 'En Formularios abrí la vista previa y completá el recorrido con datos ficticios. Confirmá que las preguntas, el consentimiento, el equipo responsable y el mensaje final sean correctos. Después revisá que la respuesta aparezca en la bandeja y que la tarea de seguimiento abra el formulario exacto.', destino: 'cms-formularios', accion: 'Probar un formulario', palabrasClave: 'testear ensayo vista previa respuesta bandeja seguimiento' },
  { categoria: 'Formularios', fuente: 'Versión 1.9.7', pregunta: '¿Por qué un formulario público no recibe respuestas?', respuesta: 'Comprobá tres cosas en Formularios: que esté activo, que su visibilidad sea pública y que tenga un equipo responsable. Luego revisá en Página web que el botón esté vinculado al formulario correcto. La vista previa permite detectar el paso que falta sin exponerlo todavía.', destino: 'cms-formularios', accion: 'Revisar formulario', palabrasClave: 'no funciona deshabilitado enlace roto enviar bloqueado invisible' },
  { categoria: 'Privacidad y registro', fuente: 'Versión 1.9.7', pregunta: '¿Dónde atiendo una solicitud de acceso, corrección o eliminación de datos?', respuesta: 'Abrí Solicitudes de privacidad. Revisá la identidad de quien consulta, el tipo de solicitud, el plazo y la persona responsable. Registrá cada avance allí y cerrá el caso solamente cuando la respuesta y las acciones realizadas estén documentadas.', destino: 'cms-privacidad', accion: 'Abrir solicitudes', soloAdmin: true, palabrasClave: 'datos personales derechos borrar corregir exportar solicitud' },
  { categoria: 'Privacidad y registro', fuente: 'Versión 1.9.7', pregunta: '¿Dónde veo quién cambió información sensible o administrativa?', respuesta: 'Abrí Auditoría. Podés filtrar por fecha, persona y tipo de acción para revisar qué cambió. La auditoría sirve para verificar hechos; no reemplaza la corrección del dato en su sección original.', destino: 'cms-auditoria', accion: 'Abrir Auditoría', soloAdmin: true, palabrasClave: 'historial cambios registro quién modificó seguridad' },
  { categoria: 'Privacidad y registro', fuente: 'Versión 1.9.7', pregunta: '¿Dónde registro una decisión o un hecho institucional importante?', respuesta: 'Abrí Registro institucional y creá una entrada con fecha, contexto, decisión y responsables. Usalo para conservar memoria institucional, no para tareas cotidianas ni conversaciones informales.', destino: 'registro-institucional', accion: 'Abrir Registro institucional', soloAdmin: true, palabrasClave: 'acta decisión memoria hecho dirección documento' },
  { categoria: 'Asistencia', fuente: 'Versión 1.9.7', pregunta: '¿Cómo preparo la planilla de un sábado?', respuesta: 'Abrí Planilla, elegí la fecha y armá los grupos con las personas activas. Revisá la vista previa antes de imprimir o compartir. La Agenda de planilla corresponde a Fútbol sin Barreras; la Agenda institucional reúne actividades y reuniones de toda Aletea.', destino: 'lista', accion: 'Armar planilla', palabrasClave: 'fútbol sábado grupos imprimir lista jornada' },
  { categoria: 'Asistencia', fuente: 'Versión 1.9.7', pregunta: '¿Cómo registro asistencia y obtengo el reporte mensual?', respuesta: 'Después de la jornada abrí Asistencias, elegí la fecha y marcá presente, falta o corrección. Guardá antes de cambiar de fecha. En Reportes elegí el mes para revisar totales, ausencias y personas que requieren seguimiento.', destino: 'asistencias', accion: 'Registrar asistencia', palabrasClave: 'presente falta mensual informe seguimiento fútbol' },
  { categoria: 'Uso del sistema', fuente: 'Versión 1.9.7', pregunta: '¿Cómo encuentro una sección sin recorrer todo el menú?', respuesta: 'Usá la búsqueda del Centro de control. Escribí una tarea o un destino, por ejemplo pago, formulario, persona o agenda. Recientes permanece cerrado hasta que lo elijas o enfoques la búsqueda vacía, y muestra como máximo tres secciones anteriores.', destino: 'inicio', accion: 'Abrir Centro de control', palabrasClave: 'buscador global navegación menú reciente comando' },
]

export const PREGUNTAS_AYUDA = Object.freeze([
  ...PREGUNTAS_AYUDA_BASE
    .filter((item) => !PREGUNTAS_RETIRADAS.has(item.pregunta))
    .map((item) => ({ ...item, ...(PREGUNTAS_ACTUALIZADAS.get(item.pregunta) || {}) })),
  ...PREGUNTAS_NUEVAS,
])

function normalizar(texto) {
  return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const SINONIMOS_AYUDA = Object.freeze([
  ['agenda', 'calendario', 'actividad', 'evento', 'reunion'],
  ['borrar', 'eliminar', 'quitar', 'archivar', 'desactivar'],
  ['persona', 'participante', 'integrante', 'contacto'],
  ['usuario', 'cuenta', 'login', 'acceso', 'ingreso'],
  ['pago', 'cobro', 'cuota', 'saldo', 'finanzas'],
  ['web', 'pagina', 'sitio', 'publicar'],
  ['foto', 'imagen', 'fotografia'],
  ['aviso', 'notificacion', 'recordatorio'],
  ['documento', 'archivo', 'material', 'recurso'],
])

function variantesDe(termino) {
  return SINONIMOS_AYUDA.find((grupo) => grupo.includes(termino)) || [termino]
}

export function buscarPreguntas(consulta, guia = PREGUNTAS_AYUDA) {
  const terminos = normalizar(consulta).trim().split(/\s+/).filter(Boolean)
  if (!terminos.length) return [...guia]
  return guia.map((item, indice) => {
    const pregunta = normalizar(item.pregunta)
    const categoria = normalizar(item.categoria)
    const texto = normalizar(`${item.categoria} ${item.pregunta} ${item.respuesta} ${item.palabrasClave || ''}`)
    if (!terminos.every((termino) => variantesDe(termino).some((variante) => texto.includes(variante)))) return null
    const puntos = terminos.reduce((total, termino) => total + (pregunta.includes(termino) ? 6 : 0) + (categoria.includes(termino) ? 3 : 0) + (texto.includes(termino) ? 1 : 0), 0)
    return { item, puntos, indice }
  }).filter(Boolean).sort((a, b) => b.puntos - a.puntos || a.indice - b.indice).map(({ item }) => item)
}

export function filtrarPreguntas(consulta, guia = PREGUNTAS_AYUDA) {
  return buscarPreguntas(consulta, guia)
}

const DESTACADAS_AYUDA = new Set([
  '¿Qué hago cuando una sección dice que me falta acceso?',
  '¿Cómo empiezo a llevar las cuentas sin usar el Excel?',
  '¿Cómo creo una actividad o una reunión en la agenda?',
  '¿Cómo archivo o recupero a una persona sin perder su historial?',
  '¿Cómo se administra un formulario que aparecerá en la página?',
  '¿Cómo edito una sección sin recorrer todas sus casillas?',
])

const ATAJOS_AYUDA = Object.freeze([
  { titulo: 'Organizar el día', detalle: 'Agenda, reuniones y tareas', busqueda: 'agenda' },
  { titulo: 'Trabajar con personas', detalle: 'Altas, archivos y accesos', busqueda: 'persona' },
  { titulo: 'Llevar los pagos', detalle: 'Cuotas, cobros y pendientes', categoria: 'Finanzas' },
  { titulo: 'Publicar contenido', detalle: 'Página, imágenes y piezas', categoria: 'Página web' },
  { titulo: 'Recibir consultas', detalle: 'Formularios y seguimiento', categoria: 'Formularios' },
  { titulo: 'Resolver permisos', detalle: 'Perfiles, equipos y datos', categoria: 'Accesos' },
])

const BUSQUEDAS_SUGERIDAS = ['Cobrar una cuota', 'Archivar una persona', 'Crear una reunión', 'Publicar un formulario']

export function crearPantallaAyuda(raiz, { alIrA = () => {}, admin = false, busquedaInicial = '', alCopiarEnlace = null, alCopiarTexto = null } = {}) {
  let categoriaActiva = busquedaInicial ? 'Todas' : 'Destacadas'
  const pantalla = elemento('main', ['pantalla-ayuda'])
  const cabecera = elemento('header', ['ayuda-cabecera'])
  const introduccion = elemento('div', ['ayuda-introduccion'])
  introduccion.append(elemento('span', ['sobrelinea'], 'GUÍA DEL SISTEMA'), elemento('h1', [], '¿Qué necesitás hacer?'), elemento('p', ['ayuda'], 'Encontrá el paso siguiente con palabras simples. Buscá una tarea o elegí uno de los recorridos frecuentes.'))
  cabecera.appendChild(introduccion)
  const buscar = document.createElement('input')
  buscar.type = 'search'
  buscar.className = 'ayuda-buscador'
  buscar.placeholder = 'Buscar: pago pendiente, foto, permiso, Canva...'
  buscar.setAttribute('aria-label', 'Buscar en la ayuda')
  buscar.value = busquedaInicial
  const limpiar = boton('Limpiar', () => {
    buscar.value = ''
    categoriaActiva = 'Destacadas'
    buscar.focus()
    dibujar()
  }, ['ayuda-limpiar'])
  limpiar.hidden = !buscar.value
  const estadoCopia = elemento('span', ['ayuda-copia-estado'])
  estadoCopia.setAttribute('aria-live', 'polite')
  const herramientas = elemento('div', ['ayuda-herramientas'])
  const cajaBusqueda = elemento('div', ['ayuda-caja-busqueda'])
  cajaBusqueda.append(buscar, limpiar)
  herramientas.appendChild(cajaBusqueda)
  if (alCopiarEnlace) {
    const copiar = boton('Copiar esta búsqueda', async () => {
      try {
        await alCopiarEnlace(buscar.value.trim())
        estadoCopia.textContent = buscar.value.trim() ? 'Enlace a esta búsqueda copiado.' : 'Enlace a Ayuda copiado.'
      } catch {
        estadoCopia.textContent = 'No se pudo copiar. Revisá el permiso del navegador.'
      }
    }, ['ayuda-copiar'])
    herramientas.appendChild(copiar)
  }
  cabecera.append(herramientas, estadoCopia)
  const sugerenciasBusqueda = elemento('div', ['ayuda-sugerencias'])
  sugerenciasBusqueda.setAttribute('aria-label', 'Búsquedas sugeridas')
  BUSQUEDAS_SUGERIDAS.forEach((consulta) => sugerenciasBusqueda.appendChild(boton(consulta, () => {
    buscar.value = consulta
    categoriaActiva = 'Todas'
    dibujar()
  }, ['ayuda-sugerencia'])))
  cabecera.appendChild(sugerenciasBusqueda)

  const frecuentes = elemento('section', ['ayuda-frecuentes'])
  frecuentes.appendChild(elemento('h2', [], 'Atajos frecuentes'))
  const atajos = elemento('div', ['ayuda-atajos'])
  const resumen = elemento('p', ['ayuda-resultados'])
  resumen.setAttribute('aria-live', 'polite')
  const lista = elemento('section', ['ayuda-lista'])
  const categorias = elemento('nav', ['ayuda-categorias'])
  categorias.setAttribute('aria-label', 'Categorías de ayuda')
  const selectorCategoria = document.createElement('select')
  selectorCategoria.className = 'ayuda-selector-categoria'
  selectorCategoria.setAttribute('aria-label', 'Elegir tema de ayuda')
  const indice = elemento('aside', ['ayuda-indice'])
  indice.append(elemento('span', ['sobrelinea'], 'TEMAS'), selectorCategoria, categorias)
  const resultados = elemento('section', ['ayuda-resultados-panel'])
  const tituloResultados = elemento('h2', ['ayuda-resultados-titulo'])
  resultados.append(tituloResultados, resumen, lista)
  const contenidoPrincipal = elemento('div', ['ayuda-contenido'])
  contenidoPrincipal.append(indice, resultados)

  ATAJOS_AYUDA.forEach((atajo) => {
    const control = boton('', () => {
      buscar.value = atajo.busqueda || ''
      categoriaActiva = atajo.categoria || 'Todas'
      dibujar()
      resultados.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, ['ayuda-atajo'])
    control.replaceChildren(elemento('strong', [], atajo.titulo), elemento('span', [], atajo.detalle))
    atajos.appendChild(control)
  })
  frecuentes.appendChild(atajos)

  const permitidasPara = () => PREGUNTAS_AYUDA.filter((item) => !item.soloAdmin || admin)
  const porCategoria = (guia, categoria) => {
    if (categoria === 'Destacadas') return guia.filter((item) => DESTACADAS_AYUDA.has(item.pregunta))
    if (categoria === 'Últimas mejoras') return guia.filter((item) => item.fuente === `Versión ${VERSION_AYUDA_RECIENTE}`)
    if (categoria === 'Todas') return guia
    return guia.filter((item) => item.categoria === categoria)
  }
  const dibujar = () => {
    lista.replaceChildren()
    categorias.replaceChildren()
    selectorCategoria.replaceChildren()
    const todasPermitidas = permitidasPara()
    const permitidas = filtrarPreguntas(buscar.value, todasPermitidas)
    const nombresCategorias = ['Destacadas', 'Últimas mejoras', ...new Set(todasPermitidas.map((item) => item.categoria)), 'Todas']
    if (!nombresCategorias.includes(categoriaActiva)) categoriaActiva = 'Todas'
    nombresCategorias.forEach((nombre) => {
      const cantidad = porCategoria(todasPermitidas, nombre).length
      const control = boton('', () => { categoriaActiva = nombre; dibujar() }, ['ayuda-categoria-filtro'])
      control.replaceChildren(elemento('span', [], nombre), elemento('small', [], String(cantidad)))
      control.setAttribute('aria-pressed', String(categoriaActiva === nombre))
      categorias.appendChild(control)
      const opcion = document.createElement('option')
      opcion.value = nombre
      opcion.textContent = `${nombre} (${cantidad})`
      opcion.selected = categoriaActiva === nombre
      selectorCategoria.appendChild(opcion)
    })
    const visibles = porCategoria(permitidas, categoriaActiva)
    tituloResultados.textContent = buscar.value.trim() ? 'Resultados de búsqueda' : categoriaActiva
    resumen.textContent = `${visibles.length} ${visibles.length === 1 ? 'respuesta encontrada' : 'respuestas encontradas'}`
    limpiar.hidden = !buscar.value
    if (!visibles.length) {
      const vacia = elemento('div', ['ayuda-vacia'])
      vacia.append(elemento('strong', [], 'No encontramos esa respuesta.'), elemento('p', [], 'Probá con la tarea que querés completar o elegí una búsqueda sugerida.'), boton('Ver preguntas destacadas', () => { buscar.value = ''; categoriaActiva = 'Destacadas'; dibujar() }))
      BUSQUEDAS_SUGERIDAS.slice(0, 3).forEach((consulta) => vacia.appendChild(boton(consulta, () => { buscar.value = consulta; categoriaActiva = 'Todas'; dibujar() }, ['secundario'])))
      lista.appendChild(vacia)
      return
    }
    let categoriaAnterior = ''
    visibles.forEach((item) => {
      if (categoriaActiva === 'Todas' && categoriaAnterior !== item.categoria) {
        lista.appendChild(elemento('h2', ['ayuda-seccion-titulo'], item.categoria))
        categoriaAnterior = item.categoria
      }
      const detalle = elemento('details', ['ayuda-pregunta'])
      detalle.dataset.fuente = item.fuente
      const respuesta = elemento('div', ['ayuda-respuesta'])
      const metadatos = elemento('div', ['ayuda-respuesta-meta'])
      metadatos.append(elemento('span', ['ayuda-categoria'], item.categoria))
      respuesta.append(metadatos, elemento('p', [], item.respuesta))
      const accionesRespuesta = elemento('div', ['ayuda-respuesta-acciones'])
      if (item.destino && (admin || item.destino !== 'accesos')) accionesRespuesta.appendChild(enlaceBoton(item.accion, rutaParaPantalla(item.destino), () => alIrA(item.destino)))
      else if (item.enlace) accionesRespuesta.appendChild(enlaceBoton(item.accion, item.enlace))
      if (alCopiarEnlace) accionesRespuesta.appendChild(boton('Copiar enlace', async () => {
        await alCopiarEnlace(item.pregunta)
        estadoCopia.textContent = 'Enlace a esta respuesta copiado.'
      }, ['secundario']))
      if (alCopiarTexto) accionesRespuesta.appendChild(boton('Copiar pasos', async () => {
        await alCopiarTexto(`${item.pregunta}\n\n${item.respuesta}`)
        estadoCopia.textContent = 'Pasos copiados.'
      }, ['secundario']))
      if (accionesRespuesta.childElementCount) respuesta.appendChild(accionesRespuesta)
      const relacionadas = todasPermitidas.filter((otra) => otra !== item && otra.categoria === item.categoria).slice(0, 2)
      if (relacionadas.length) {
        const bloqueRelacionadas = elemento('div', ['ayuda-relacionadas'])
        bloqueRelacionadas.appendChild(elemento('strong', [], 'También puede ayudarte'))
        relacionadas.forEach((otra) => bloqueRelacionadas.appendChild(boton(otra.pregunta, () => {
          buscar.value = otra.pregunta
          categoriaActiva = 'Todas'
          dibujar()
        }, ['ayuda-relacionada'])))
        respuesta.appendChild(bloqueRelacionadas)
      }
      detalle.append(elemento('summary', [], item.pregunta), respuesta)
      detalle.addEventListener('toggle', () => {
        if (!detalle.open) return
        lista.querySelectorAll('.ayuda-pregunta[open]').forEach((abierta) => { if (abierta !== detalle) abierta.open = false })
      })
      lista.appendChild(detalle)
    })
    if (buscar.value.trim() && visibles.length === 1) lista.querySelector('.ayuda-pregunta').open = true
  }
  buscar.addEventListener('input', () => { categoriaActiva = 'Todas'; dibujar() })
  buscar.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Escape' || !buscar.value) return
    buscar.value = ''
    categoriaActiva = 'Destacadas'
    dibujar()
  })
  selectorCategoria.addEventListener('change', () => { categoriaActiva = selectorCategoria.value; dibujar() })
  pantalla.append(cabecera, frecuentes, contenidoPrincipal)
  dibujar()
  raiz.appendChild(pantalla)
  return pantalla
}
