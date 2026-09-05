export const VERSION_NOVEDADES = '2.2.1'
export const CLAVE_NOVEDADES_VISTAS = 'aletea:novedades:vista'

export const NOVEDADES = Object.freeze([
  {
    version: '2.2.1', estado: 'Preparada el 5 de septiembre de 2026', autor: 'Alejandro Estol',
    ambitos: ['Comunicación visual', 'Certificados', 'Firmas'],
    resumen: ['Firmas proporcionadas y centradas', 'Controles visibles por firmante', 'Avisos de calidad antes de descargar'],
    descripcion: 'Los certificados permiten preparar cada firma PNG directamente sobre la vista previa, con límites seguros para conservar la composición A4.',
    actualizaciones: [
      'Cada firma conserva su proporción y recorta automáticamente los márgenes transparentes al cargarla.',
      'Tamaño y altura se ajustan por separado con una lectura visible del valor aplicado.',
      'La vista previa, el PDF y los SVG profesionales usan exactamente la misma configuración.',
    ],
    adiciones: [
      'Ajustes finos para posición lateral, intensidad y grosor del trazo.',
      'Acciones para centrar o restablecer una firma sin volver a cargar el archivo.',
      'Opción para mantener iguales el tamaño y la altura de ambas firmas.',
      'Avisos cuando el PNG parece tener fondo blanco o resolución insuficiente.',
    ],
    arreglos: [
      'Los márgenes transparentes de archivos diferentes ya no hacen que firmas equivalentes parezcan desalineadas.',
      'El movimiento queda limitado a la zona segura y no altera nombres, cargos ni el formato A4.',
    ],
  },
  {
    version: '2.2.0', estado: 'Preparada el 5 de septiembre de 2026', autor: 'Alejandro Estol',
    ambitos: ['Comunicación visual', 'Carruseles', 'Ayuda'],
    resumen: ['Carruseles con sistema editorial', 'Fotografías sin deformación', 'Piezas más simples y alineadas'],
    descripcion: 'El Editor de piezas adopta la grilla visual de las referencias institucionales y guía la creación de una serie completa, desde la portada hasta el cierre.',
    actualizaciones: [
      'Cada página del carrusel puede funcionar como Portada con foto, Idea con foto o Cierre para compartir.',
      'Los títulos permiten resaltar una palabra o frase concreta en magenta o turquesa.',
      'Las fotografías mantienen su proporción y permiten ajustar el encuadre horizontal y vertical.',
    ],
    adiciones: [
      'Agregar cierre crea una página final preparada para invitar a compartir el contenido.',
      'Las páginas se pueden mover, duplicar o eliminar sin salir del recorrido del carrusel.',
      'Red social y sitio web se actualizan de forma consistente en todas las páginas de la serie.',
      'La ayuda explica las nuevas composiciones, el resaltado y el encuadre de fotografías.',
    ],
    arreglos: [
      'La etiqueta inclinada y sus controles se retiraron de las piezas de eventos y campañas.',
      'Los iconos de calendario y modalidad comparten una grilla y quedan alineados con sus textos.',
      'Las imágenes dejan de estirarse para llenar el espacio disponible.',
      'El pie, el logotipo y la franja lateral conservan una posición constante entre páginas.',
    ],
  },
  {
    version: '2.1.5', estado: 'Preparada el 5 de septiembre de 2026', autor: 'Alejandro Estol',
    ambitos: ['Comunicación visual', 'Certificados', 'Google Forms'],
    resumen: ['Certificados masivos en A4', 'Importación desde Google Forms', 'Diseño personalizable'],
    descripcion: 'Comunicación visual incorpora un recorrido específico para preparar certificados y diplomas de calidad desde las respuestas de una planilla.',
    actualizaciones: [
      'Se agregaron los cinco modelos institucionales del documento de referencia en tamaño A4 horizontal.',
      'El importador reconoce automáticamente nombre, cédula, correo y capacitación desde un CSV de Google Forms o desde celdas copiadas de Google Sheets.',
      'Las cédulas se muestran con puntos y guion según el formato habitual de Uruguay.',
    ],
    adiciones: [
      'Una capacitación única completa el nombre y la temática del lote. Si la planilla contiene nombres distintos, el gestor pide elegir antes de descargar.',
      'La personalización avanzada permite cambiar colores, marca de agua, escala, logotipo, contacto y firmantes.',
      'Las firmas PNG se agregan desde una sección visible, sin abrir Personalización avanzada, y se ven en la vista previa y en el lote final.',
      'El PDF se presenta como la opción recomendada. La descarga profesional entrega un ZIP comprimido de archivos SVG editables.',
    ],
    arreglos: [
      'Los avisos de revisión ahora identifican a la persona, la destacan en la lista y abren directamente el dato que necesita corrección.',
      'La revisión detecta apellidos ausentes, nombres con datos impropios y errores en el dígito verificador de la cédula antes de generar el lote.',
      'La vista previa protege el tamaño A4 y muestra el resultado final antes de descargar.',
      'Las filas incompletas o con cédulas improbables quedan señaladas y bloquean la salida hasta ser revisadas.',
      'Los datos importados y el logotipo temporal se eliminan al salir del editor.',
      'Los ZIP editables ahora ocupan menos espacio y conservan una fecha de archivo válida.',
    ],
  },
  {
    version: '2.1.4', estado: 'Preparada el 5 de septiembre de 2026', autor: 'Alejandro Estol',
    ambitos: ['Agenda', 'Reuniones', 'Proyectos', 'Formularios'],
    resumen: ['Lo esencial primero', 'Opciones agrupadas', 'Menos recorrido al crear'],
    descripcion: 'Crear una actividad, reunión o proyecto comienza con los datos indispensables y mantiene las opciones menos frecuentes disponibles en grupos claros.',
    actualizaciones: [
      'Nueva actividad muestra primero título, tipo, lugar e inicio.',
      'Nueva reunión separa objetivo, preparación, organización y repetición de los datos esenciales.',
      'Nuevo proyecto permite empezar con nombre y objetivo, y completar organización, planificación y notas cuando correspondan.',
    ],
    adiciones: [
      'Las opciones de finalización, organización, repetición, descripción, planificación e hitos se pueden desplegar por separado.',
      'Elegir Reunión desde el formulario de actividad abre el recorrido específico sin perder el título escrito.',
      'La Ayuda explica qué contiene cada grupo opcional y cuándo conviene usarlo.',
    ],
    arreglos: [
      'Las indicaciones de clasificación solo aparecen cuando existe una selección que necesita contexto.',
      'El estado Cambios pendientes permanece oculto hasta que la persona modifica un campo.',
      'Los formularios reducen su altura inicial y conservan todas las opciones anteriores sin saturar la primera vista.',
    ],
  },
  {
    version: '2.1.3', estado: 'Preparada el 4 de septiembre de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor', 'Captura rápida', 'Ayuda'],
    resumen: ['Menos opciones al crear', 'Nombres cotidianos', 'Pedidos con destino correcto'],
    descripcion: 'Crear muestra solamente las acciones frecuentes y explica qué resultado produce cada una antes de abrir el formulario.',
    actualizaciones: [
      'Nueva tarea, Actividad o evento, Proyecto, Pedir a otro equipo y Documento o enlace quedan como las cinco decisiones principales.',
      'Cada acción incorpora una explicación breve y el tipo de tarea seleccionado también se define con un ejemplo cotidiano.',
      'Las directrices se crean dentro de Directrices, las reuniones desde Agenda y las consultas recibidas desde Formularios.',
    ],
    adiciones: [
      'La ayuda compara tarea, directriz e idea para después y explica dónde registrar una consulta recibida.',
      'Escribir idea o nota en la captura ofrece Guardar como idea sin sumar otra opción permanente al panel.',
    ],
    arreglos: [
      'Pedir a otro equipo abre el formulario con Pedido entre equipos ya seleccionado.',
      'Pedido a un equipo y Entrada para revisar dejan de abrir el mismo formulario indistinguible.',
      'Las acciones equivalentes del buscador, las pantallas vacías y el encabezado usan el mismo nombre.',
    ],
  },
  {
    version: '2.1.2', estado: 'Preparada el 4 de septiembre de 2026', autor: 'Alejandro Estol',
    ambitos: ['Fútbol sin Barreras', 'Planillas A4', 'Impresión'],
    resumen: ['Espaciado uniforme en A4', 'Referentes compartidos', 'Bandejas consistentes'],
    descripcion: 'Las hojas por cancha aprovechan el alto completo del papel y muestran una sola vez a cada referente compartido junto a sus participantes.',
    actualizaciones: [
      'El encabezado queda arriba, el pie se ancla al borde inferior y el contenido se centra en el espacio disponible.',
      'Las filas incompletas forman un bloque centrado en lugar de separarse de extremo a extremo.',
      'El espacio libre se reparte alrededor de las filas y el pie conserva su altura normal.',
      'Las personas sin acompañante mantienen una bandeja tenue vacía para conservar la estructura visual.',
    ],
    adiciones: [
      'Dos o más participantes con los mismos referentes permanecen juntos y comparten una sola bandeja.',
      'El retrato del referente queda centrado debajo del grupo de participantes que acompaña.',
    ],
    arreglos: [
      'Las filas sin referente ya no generan rectángulos vacíos.',
      'El pie ya no queda flotando sobre una zona blanca sin utilizar.',
      'Un referente compartido ya no se repite una vez por participante dentro del mismo renglón.',
    ],
  },
  {
    version: '2.1.1', estado: 'Preparada el 4 de septiembre de 2026', autor: 'Alejandro Estol',
    ambitos: ['Ayuda', 'Búsqueda', 'Accesibilidad'],
    resumen: ['Resultados visibles al escribir', 'Búsqueda tolerante a errores', 'Más respuestas prácticas'],
    descripcion: 'La ayuda encuentra tareas con palabras cotidianas, variantes y errores breves, y muestra la respuesta útil sin esconderla debajo de los atajos.',
    actualizaciones: [
      'Los resultados aparecen inmediatamente debajo del buscador y los atajos se ocultan mientras hay una consulta activa.',
      'Enter abre la mejor coincidencia y lleva el foco al resultado para que el teclado tenga una respuesta clara.',
      'El buscador reconoce tildes, singular y plural, términos equivalentes y errores breves sin mezclar temas lejanos.',
      'Cada resultado explica qué palabra coincidió y resalta el texto relevante.',
    ],
    adiciones: [
      'Las búsquedas sin respuesta se cuentan de forma agregada y anónima para orientar nuevas ayudas, sin guardar cuenta, correo, IP ni recorridos.',
      'Se agregaron respuestas sobre Centro de control, reuniones, Fútbol sin Barreras, asistencia, privacidad y registro.',
      'Administración puede ver los temas agregados que todavía no encontraron respuesta.',
    ],
    arreglos: [
      'Buscar Formularios ya no parece no hacer nada aunque existan respuestas.',
      'Las consultas form, forms y errores como formulairo encuentran primero contenido de formularios.',
      'Una consulta sin coincidencias ofrece una corrección posible y accesos útiles para continuar.',
    ],
  },
  {
    version: '2.1.0', estado: 'Preparada el 4 de septiembre de 2026', autor: 'Alejandro Estol',
    ambitos: ['Centro de control', 'Personas', 'Documentos', 'Guardado', 'Navegación móvil'],
    resumen: ['Tres prioridades al entrar', 'Documentos fáciles de crear', 'Contexto y guardado más claros'],
    descripcion: 'El gestor prioriza el trabajo cotidiano y conecta la información necesaria sin obligar a recorrer módulos separados.',
    actualizaciones: [
      'El inicio responde qué necesita atención hoy y limita la primera bandeja a tres acciones urgentes.',
      'Prioridad del día se puede minimizar y conserva la preferencia de cada cuenta.',
      'Agenda y actividad reciente aparecen antes que métricas y paneles de seguimiento.',
      'En teléfonos, la navegación inferior prioriza Hoy, Tareas y Agenda, y agrupa el resto en Más.',
      'Las tarjetas conservan una acción principal visible y reúnen las opciones menos frecuentes en Más.',
      'Crear, programas, proyectos y Biblioteca usan la misma acción Nuevo documento o enlace.',
    ],
    adiciones: [
      'Buscar una persona abre una ficha conectada con equipos, tareas, proyectos, eventos, formularios y documentos visibles dentro del alcance de la cuenta.',
      'El indicador distingue Guardando, Guardado, Cambios pendientes, Sin conexión y Error al guardar.',
      'Postergar una alerta ofrece Deshacer sin interrumpir el trabajo con otra confirmación.',
      'Ayuda explica el nuevo orden diario, las fichas conectadas, los estados de guardado y la navegación móvil.',
      'Las carpetas de Drive vinculadas a un proyecto se destacan como acceso principal dentro de su seguimiento.',
    ],
    arreglos: [
      'Las acciones secundarias dejan de competir visualmente con Abrir, Resolver, Agregar tarea o Cerrar reunión.',
      'El Centro de control deja de repetir indicadores y bloques de prioridad antes de la información útil del día.',
      'Los formularios usan la misma expresión Cambios pendientes que el indicador global.',
      'Documentos deja de aparecer como un contador sin una acción para agregar el primer elemento.',
      'Las secciones de un programa dejan de superponerse dentro de Más, la opción activa siempre queda visible y las pantallas angostas usan un selector sin botones cortados.',
      'Al abrir Documentos, la acción principal cambia a Agregar documento o enlace y deja de ofrecer Crear tarea aquí fuera de contexto.',
      'Los formularios dejan de ocupar toda la pantalla cuando su contenido es corto, ofrecen Cerrar junto al título y mantienen el pie accesible en pantallas pequeñas.',
      'Los campos obligatorios se identifican, los formularios nuevos comienzan en Sin cambios y la visibilidad de documentos explica quién puede acceder.',
      'Al elegir un programa o espacio, el equipo correspondiente se completa automáticamente y evita vínculos institucionales contradictorios.',
    ],
  },
  {
    version: '2.0.9', estado: 'Preparada el 2 de septiembre de 2026', autor: 'Alejandro Estol',
    ambitos: ['Fútbol sin Barreras', 'Planillas', 'Vista previa'],
    resumen: ['Una A4 por cancha', 'Mismo estilo configurado', 'Asignaciones múltiples completas'],
    descripcion: 'Las planillas incorporan una salida A4 operativa por cancha, con el mismo estilo configurado para la imagen vertical.',
    actualizaciones: [
      'Vista previa permite alternar entre la composición horizontal, la vertical completa y cada cancha en A4.',
      'Cada hoja A4 reúne participantes, voluntariado y apoyos correspondientes a una sola cancha.',
      'El A4 hereda formato, fotos, modo compacto, posición y tamaño del voluntariado de la configuración elegida.',
      'La composición de impresión adapta automáticamente las columnas para aprovechar mejor la altura de la hoja.',
      'La hoja aprovecha prácticamente todo el ancho A4 y distribuye entre tres y seis columnas según la cantidad de participantes.',
      'Cada participante y sus acompañantes forman una unidad visual, con una bandeja violeta debajo de la foto.',
      'Uno, dos o más voluntarios mantienen el mismo patrón, sin cubrir la cara ni el nombre del participante.',
      'La cabecera A4 es más compacta para dedicar más superficie de impresión a las personas.',
      'Todas las fotos del voluntariado mantienen el mismo formato retrato, tanto en asignaciones individuales como múltiples.',
      'Las bandas de cancha y apoyo comparten el mismo largo y los mismos márgenes que la grilla de participantes.',
      'La imagen horizontal reparte el ancho según la cantidad de participantes y conserva una escala común entre canchas.',
    ],
    adiciones: [
      'Las asignaciones muestran las fotos disponibles según el formato visual elegido.',
      'Ayuda explica cómo descargar cada cancha y cómo se representan las relaciones múltiples.',
    ],
    arreglos: [
      'Las hojas A4 dejan de imponer tarjetas y retratos circulares propios.',
      'Un participante con varios voluntarios conserva a todas las personas acompañantes en el formato configurado.',
      'Los medallones dejan de invadir la foto, usan violeta y explicitan si acompaña una o más personas.',
      'Las personas sin acompañante conservan el fondo de la bandeja para alinear la grilla, sin textos innecesarios.',
      'Los nombres largos del voluntariado se acortan de forma legible en vez de quedar recortados.',
      'Los retratos del voluntariado ganan altura al eliminar el rótulo auxiliar de acompañamiento.',
      'La composición horizontal deja de superponer voluntariado sobre las fotos y libera el centro decorativo para contenido útil.',
      'La vista vertical ya no queda disponible solamente como descarga sin vista previa.',
    ],
  },
  {
    version: '2.0.8', estado: 'Preparada el 2 de septiembre de 2026', autor: 'Alejandro Estol',
    ambitos: ['Tareas', 'Administración', 'Ayuda'],
    resumen: ['Menos botones en la bandeja', 'Completadas por alcance', 'Historial entregado por el servidor'],
    descripcion: 'La bandeja prioriza las vistas cotidianas y permite revisar el trabajo completado propio, asignado o institucional sin perder filtros.',
    actualizaciones: [
      'Mis pendientes, Completadas, Asignadas por mí y Todo abierto quedan como vistas principales.',
      'Las vistas operativas menos frecuentes se agrupan en Más vistas.',
      'Dentro de Completadas, Administración puede elegir Todas las visibles, Completadas por mí o Asignadas por mí.',
    ],
    adiciones: [
      'Ayuda explica cómo encontrar tareas que otra persona completó y dónde quedaron los filtros secundarios.',
    ],
    arreglos: [
      'El tablero vuelve a recibir las tareas completadas y canceladas que antes eran excluidas por la consulta del servidor.',
      'El contador y la lista de Completadas ahora parten del mismo conjunto visible para la cuenta.',
    ],
  },
  {
    version: '2.0.7', estado: 'Publicada el 2 de septiembre de 2026', autor: 'Alejandro Estol',
    ambitos: ['Tareas', 'Seguimiento', 'Ayuda'],
    resumen: ['Completadas fáciles de encontrar', 'Reactivar y agendar en un paso', 'Historial separado de cancelaciones'],
    descripcion: 'Las tareas terminadas dejan de quedar escondidas bajo una etiqueta ambigua y pueden retomarse con una nueva fecha sin perder su contexto.',
    actualizaciones: [
      'Mis tareas incorpora la sección Completadas con un contador visible y las tareas más recientes primero.',
      'Las tareas canceladas quedan en un filtro separado para no mezclarse con el trabajo efectivamente terminado.',
      'La búsqueda permite localizar una tarea completada por su título o descripción.',
    ],
    adiciones: [
      'Reactivar y agendar solicita una nueva fecha de seguimiento y permite elegir el estado con el que continúa la tarea.',
      'La persona responsable también puede retomar su propia tarea, aunque no tenga permisos generales de coordinación.',
      'Ayuda responde dónde encontrar una tarea completada y cómo continuarla cuando surge un nuevo paso.',
    ],
    arreglos: [
      'Historial deja de ser la única etiqueta para encontrar tareas completadas.',
      'Reabrir ya no envía una tarea a pendientes sin indicar cuándo debe retomarse.',
      'El cierre y los comentarios anteriores permanecen vinculados a la misma tarea después de reactivarla.',
    ],
  },
  {
    version: '2.0.6', estado: 'Publicada el 2 de septiembre de 2026', autor: 'Alejandro Estol',
    ambitos: ['Tareas', 'Reuniones', 'Navegación', 'Ayuda'],
    resumen: ['Seguimiento previo de reuniones', 'Tareas recurrentes al crear', 'Logo siempre visible'],
    descripcion: 'Las rutinas y la preparación de reuniones pasan a estar donde las personas esperan encontrarlas, con recordatorios visibles y una navegación lateral más estable.',
    actualizaciones: [
      'Nueva reunión y Editar reunión permiten elegir una fecha de seguimiento para preparar materiales, presentaciones o confirmaciones.',
      'Nueva tarea ofrece repetición semanal o mensual sin obligar a buscar la función en otro panel.',
      'La primera ocurrencia de una tarea recurrente se crea de inmediato y cada período conserva su propio historial.',
    ],
    adiciones: [
      'Las tarjetas de reunión muestran la fecha de seguimiento junto a la fecha del encuentro.',
      'El Centro de decisiones indica cuántas reuniones próximas tienen seguimiento programado.',
      'Ayuda incorpora respuestas directas para preparación de reuniones y rutinas mensuales.',
    ],
    arreglos: [
      'El selector del área de trabajo deja de cubrir el logo al desplazar el panel lateral.',
      'La recurrencia deja de quedar escondida detrás del concepto interno de Rutinas.',
      'El resumen Para mí conserva sus tres indicadores dentro de la pantalla del teléfono y usa la etiqueta breve Avisos nuevos.',
      'Las fotografías institucionales recuperan contraste y color dentro de la página, y sus acentos respetan exactamente el mismo recorte curvo.',
    ],
  },
  {
    version: '2.0.5', estado: 'Publicada el 1 de septiembre de 2026', autor: 'Alejandro Estol',
    ambitos: ['Página web', 'Contenido', 'Fotografías', 'Ayuda'],
    resumen: ['Fotografías propias de Aletea', 'Familias y Adultos autistas separados', 'Portada más humana y directa'],
    descripcion: 'La página de prueba incorpora una narrativa visual basada en la comunidad real de Aletea y recorridos independientes para familias y personas adultas autistas.',
    actualizaciones: [
      'La portada presenta el nuevo mensaje institucional y una fotografía panorámica de la comunidad.',
      'Familias y Adultos autistas funcionan como secciones diferentes, con contenido y accesos propios.',
      'Capacitaciones y Cuerpo y expresión reemplazan nombres de áreas demasiado generales.',
    ],
    adiciones: [
      'Quiénes somos incorpora una fotografía del equipo y Qué hacemos suma una imagen de actividad.',
      'Las nuevas fotografías usan versiones WebP livianas, descripciones accesibles y puntos focales.',
      'Ayuda explica cómo editar las nuevas secciones y qué revisar antes de publicar una imagen.',
    ],
    arreglos: [
      'La portada deja de superponer un cartel sobre la fotografía.',
      'Los accesos de orientación incluyen explícitamente a personas adultas autistas.',
      'Los textos institucionales incluyen a personas autistas, familias y comunidades sin fusionar sus recorridos.',
    ],
  },
  {
    version: '2.0.4', estado: 'Publicada el 1 de septiembre de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor', 'Formularios', 'Navegación', 'Ayuda'],
    resumen: ['Menos ruido visual', 'Acciones mejor priorizadas', 'Vista personalizable'],
    descripcion: 'El gestor conserva todas sus funciones, pero muestra primero lo necesario para decidir y trabajar.',
    actualizaciones: [
      'La vista Compacta reduce espacios y mantiene cerrados los detalles secundarios. La vista Detallada ofrece una lectura más amplia.',
      'La preferencia visual queda guardada por cuenta en el navegador.',
      'Los formularios muestran una acción principal y reúnen el resto en Más acciones.',
      'Las búsquedas quedan siempre visibles y los filtros secundarios se abren solamente cuando se necesitan.',
    ],
    adiciones: [
      'Exportar respuestas tiene un menú propio para no competir con las acciones de revisión.',
      'Los acuerdos y preferencias de cada respuesta se pueden desplegar sin mezclar datos operativos y técnicos.',
      'Ayuda explica dónde encontrar cada control y cómo cambiar la densidad de información.',
    ],
    arreglos: [
      'Las tarjetas dejan de presentar varias acciones con la misma importancia visual.',
      'Los controles secundarios se adaptan al ancho completo del teléfono.',
      'Los filtros activos indican su cantidad aunque el grupo esté cerrado.',
    ],
  },
  {
    version: '2.0.3', estado: 'Publicada el 1 de septiembre de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor', 'Formularios', 'Accesos', 'Ayuda'],
    resumen: ['Destinos de respuestas visibles', 'Permisos explicados sin ambigüedad', 'Seguimiento con referencia clara'],
    descripcion: 'Formularios ahora diferencia el equipo que recibe una respuesta de los permisos necesarios para abrir sus datos.',
    actualizaciones: [
      'Cada formulario muestra el equipo destinatario y explica qué perfiles pueden abrir las respuestas.',
      'La ayuda responde específicamente quién puede ver las respuestas asignadas a Familias.',
      'Se aclara que pertenecer a un equipo no concede por sí solo acceso a datos personales.',
    ],
    adiciones: [
      'Las tarjetas muestran la coordinación o referencia inicial para el seguimiento.',
      'Administración puede abrir Accesos directamente desde el resumen del formulario.',
    ],
    arreglos: [
      'Los formularios sin equipo o sin una referencia asignada muestran una advertencia antes de compartirse.',
      'La explicación usa los mismos criterios que aplica la API al filtrar respuestas.',
    ],
  },
  {
    version: '2.0.2', estado: 'Publicada el 1 de septiembre de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor', 'Formularios', 'Ayuda'],
    resumen: ['Respuestas fáciles de recorrer', 'Consentimientos ordenados', 'Mejor lectura en teléfono'],
    descripcion: 'Las respuestas de formularios dejan de verse como un bloque continuo y ahora separan la información útil para actuar de los datos técnicos que se consultan con menos frecuencia.',
    actualizaciones: [
      'Cada respuesta distingue con claridad la persona, el estado, el contacto, el próximo paso y la tarea vinculada.',
      'Las preguntas y respuestas se presentan como campos separados, con más espacio para los textos extensos.',
      'Los consentimientos, sus versiones y sus fechas quedan reunidos en una sección desplegable de trazabilidad.',
    ],
    adiciones: [
      'El correo de contacto se puede abrir directamente desde la tarjeta.',
      'Los estados y acuerdos breves se reconocen como etiquetas sin competir con el contenido principal.',
      'La estructura se reorganiza automáticamente en pantallas angostas y conserva controles cómodos para tocar.',
    ],
    arreglos: [
      'Las respuestas largas dejan de mezclarse visualmente con sus preguntas.',
      'Las fechas técnicas se muestran en un formato comprensible para una persona.',
      'La información de auditoría deja de ocupar el mismo nivel visual que el motivo de contacto.',
    ],
  },
  {
    version: '2.0.1', estado: 'Publicada el 1 de septiembre de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor', 'Formularios', 'Accesos', 'Ayuda'],
    resumen: ['Pestañas de formularios siempre legibles', 'Creación de tareas con permisos claros', 'Adultos autistas y ayuda actualizada'],
    descripcion: 'Una mejora enfocada en hacer más claro quién puede crear trabajo, mantener visibles las opciones elegidas y documentar los recorridos nuevos con alternativas útiles.',
    actualizaciones: [
      'Administración puede permitir o bloquear la creación de tareas por perfil, por equipo y por persona desde Accesos.',
      'Cada cuenta recibe un permiso efectivo explicado, con prioridad para la excepción individual, después el equipo y finalmente el perfil.',
      'Adultos autistas se incorpora como programa estable de Familias para reunir proyectos, actividades, recursos y tareas relacionadas.',
      'Ayuda explica los permisos nuevos, la alternativa de solicitudes, la unidad Adultos autistas y el uso accesible de las pestañas de Formularios.',
    ],
    adiciones: [
      'Quien no puede crear una tarea conserva una acción clara para enviar una solicitud al equipo.',
      'Las pestañas de Formularios admiten flechas, Inicio y Fin, e informan correctamente cuál está seleccionada.',
      'La matriz de Accesos permite volver a la regla heredada sin borrar ni recrear cuentas o equipos.',
    ],
    arreglos: [
      'El texto de la pestaña activa en Formularios deja de desaparecer por una variable de color inexistente.',
      'Los botones que crean tareas dejan de aparecer en equipos donde la cuenta no tiene permiso.',
      'La API comprueba el mismo permiso en tareas directas, recurrencias, acuerdos de reuniones, checklists y decisiones.',
    ],
  },
  {
    version: '2.0.0', estado: 'Publicada el 1 de septiembre de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor', 'Formularios', 'Comunicaciones', 'Operaciones', 'Página pública'],
    resumen: ['Formularios más claros y completos', 'Comunicaciones con consentimiento y revisión', 'Operaciones y publicación más seguras'],
    descripcion: 'Una actualización integral para trabajar con menos pasos, entender mejor cada estado y conservar evidencia clara desde el primer contacto hasta la publicación.',
    actualizaciones: [
      'Formularios reúne modelos guiados, campos configurables, vista pública, bandeja de respuestas, seguimiento y exportación en un mismo recorrido.',
      'El ingreso a WhatsApp Familias incorpora datos mínimos, confirmación del correo, privacidad obligatoria y un acuerdo de confidencialidad y convivencia separado.',
      'Los avisos de privacidad y los acuerdos ahora se pueden adaptar a cualquier formulario, conservan una versión automática y se muestran con el texto exacto que fue configurado.',
      'Comunicaciones organiza contactos, temas, confirmaciones, bajas, campañas, revisión por una segunda persona y programación de envíos.',
      'El Centro de operaciones muestra integraciones, controles, incidentes, cola de correo y trabajos automáticos con explicaciones y pasos de recuperación.',
      'Áreas distingue equipos, unidades operativas y proyectos, e incorpora GWP y DAEA en una estructura institucional única.',
      'La navegación, los formularios y las acciones principales se adaptan mejor al teléfono, conservan filtros útiles y explican con más claridad dónde está cada función.',
    ],
    adiciones: [
      'Los formularios pueden exportar a Excel o CSV solamente las respuestas visibles después de buscar, filtrar y ordenar.',
      'Las invitaciones de formularios se pueden personalizar y copiar completas, con su título, texto y enlace público.',
      'Cualquier pregunta de correo puede pedir una segunda escritura para detectar errores antes de guardar la respuesta.',
      'La suscripción a novedades es opcional, empieza desmarcada y requiere confirmación antes de habilitar envíos.',
      'Cada campaña conserva su borrador, revisión, aprobación, programación, entregas, errores y bajas sin mezclar comunicaciones con datos operativos.',
      'La publicación transaccional prepara una sola vez, reutiliza un recibo inmutable y omite las capas de cPanel que no cambiaron.',
      'Los tres destinos se extraen primero en un área privada, conservan dos respaldos y vuelven automáticamente a la versión anterior si falla la verificación.',
      'SFTP continúa disponible como recuperación independiente sin convertirse en el recorrido habitual.',
      'Las auditorías permanentes cubren lenguaje institucional, accesibilidad, enlaces, adaptación visual y métricas de recorridos frecuentes.',
    ],
    arreglos: [
      'Los consentimientos obligatorios y opcionales dejan de presentarse como una sola decisión.',
      'Registrar una respuesta desde el gestor ya no permite omitir la privacidad o el acuerdo exigidos por el mismo formulario, y conserva fecha y versión de ambas confirmaciones.',
      'Las respuestas cumplidas conservan el motivo, la fecha, la forma de resolución y la persona que registró el cierre.',
      'Las unidades compartidas dejan de duplicarse entre equipos y se muestran desde una referencia institucional común.',
      'La programación de campañas se bloquea cuando el correo o sus controles operativos todavía no están confirmados.',
      'La publicación excluye e inventaría de forma recursiva todos los .htaccess activos para preservar la configuración administrada por cPanel.',
      'Se corrigieron desbordes, acciones difíciles de tocar, diálogos sin foco claro e instrucciones antiguas que ya no correspondían al sistema actual.',
    ],
  },
  {
    version: '1.9.15', estado: 'Publicada el 29 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor'],
    resumen: ['Cierres de tarea con contexto', 'Avisos que se actualizan al completar', 'Contador lateral más claro'],
    actualizaciones: [
      'Completar una tarea ofrece agregar un comentario de cierre opcional.',
      'La nota queda en la conversación con la persona y la fecha de cierre.',
      'Quien asignó la tarea recibe el resultado dentro del gestor.',
    ],
    adiciones: [
      'El cierre explica qué información conviene dejar sin volver obligatorio el comentario.',
      'El indicador lateral muestra de forma explícita si se trata de uno o más avisos.',
    ],
    arreglos: [
      'El aviso de asignación se marca como leído al completar o cancelar la misma tarea.',
      'El contador deja de sugerir que existe una tarea abierta cuando solo queda una notificación.',
    ],
  },
  {
    version: '1.9.14', estado: 'Publicada el 29 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor', 'Página web'],
    resumen: ['Experiencia móvil más liviana', 'Acciones cómodas para tocar', 'Contenido sin desbordes'],
    actualizaciones: [
      'La página y el gestor reorganizan navegación, formularios y acciones para pantallas angostas.',
      'Las acciones principales ocupan el ancho disponible y los controles secundarios se recorren horizontalmente cuando hace falta.',
      'Los menús móviles se presentan como paneles claros y respetan el espacio seguro del teléfono.',
    ],
    adiciones: [
      'Los controles interactivos conservan un área táctil mínima de 44 píxeles.',
      'La auditoría móvil automática comprueba anchos de 390 y 430 píxeles en la página y el gestor.',
    ],
    arreglos: [
      'Las tarjetas, pestañas y formularios dejan de desbordar o sentirse comprimidos en celular.',
      'La jerarquía visual reduce información simultánea sin ocultar las funciones importantes.',
    ],
  },
  {
    version: '1.9.13', estado: 'Publicada el 29 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor'],
    resumen: ['Formularios con creación guiada', 'Búsqueda y filtros para resolver más rápido', 'Cumplimientos con historial verificable'],
    actualizaciones: [
      'Formularios separa la configuración, las respuestas pendientes y el historial cumplido.',
      'Crear un formulario comienza con modelos cotidianos y organiza propósito, recorrido, preguntas y privacidad.',
      'La bandeja permite buscar, filtrar y ordenar respuestas, y muestra el próximo paso de cada caso.',
      'Cerrar una respuesta ahora exige fecha, forma de resolución y motivo.',
    ],
    adiciones: [
      'El historial muestra cuándo, cómo, por qué y quién registró cada cumplimiento.',
      'Una respuesta cumplida puede reabrirse con un motivo sin borrar el registro anterior.',
      'Los formularios se pueden buscar y duplicar para reutilizar una estructura sin cambiar el original.',
    ],
    arreglos: [
      'Ya no es posible cerrar una respuesta con un cambio de estado sin contexto.',
      'Las respuestas cumplidas dejan de desaparecer del gestor y quedan disponibles para consulta.',
    ],
  },
  {
    version: '1.9.12', estado: 'Publicada el 29 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor'],
    resumen: ['Entregas de equipo en cada ficha', 'Equipo nuevo o usado con fecha y talle', 'Pago de equipo con concepto propio'],
    actualizaciones: [
      'La ficha del participante registra si recibió equipo, su condición, la fecha de entrega y el talle.',
      'Finanzas incorpora Pago de equipo como una acción reconocible y conserva ese concepto en el historial.',
    ],
    adiciones: [
      'El detalle financiero ofrece un acceso directo para registrar el pago de equipo de la persona elegida.',
    ],
    arreglos: [
      'La entrega y el cobro se guardan por separado para no crear movimientos financieros silenciosos.',
    ],
  },
  {
    version: '1.9.11', estado: 'Publicada el 28 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor', 'Página web'],
    resumen: ['Formularios con errores claros', 'Publicación verificable', 'Contenido sin caché editorial'],
    actualizaciones: [
      'Los formularios distinguen falta de conexión, demora del servidor y rechazo de datos sin perder el borrador.',
      'Publicar en prueba informa si la actualización del sitio comenzó, falló o todavía necesita configuración.',
      'El sitio de prueba muestra la revisión editorial que puede obtener del gestor.',
    ],
    adiciones: [
      'Los formularios ofrecen intentar nuevamente después de un fallo temporal.',
      'La publicación puede iniciar un despliegue mediante el webhook seguro configurado en el servidor.',
    ],
    arreglos: [
      'El mensaje técnico Load failed deja de mostrarse a las personas.',
      'El contenido editorial público deja de conservar una copia obsoleta durante cinco minutos.',
    ],
  },
  {
    version: '1.9.10', estado: 'Publicada el 28 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor'],
    resumen: ['Recurrencias sin falsos duplicados', 'Duraciones validadas', 'Conflictos reales conservados'],
    actualizaciones: [
      'Agenda distingue la fecha efectiva de cada encuentro de la fecha interna con la que se generó la serie.',
      'Las actividades recurrentes validan por separado la duración de cada encuentro y la fecha final de repetición.',
      'Los títulos repetidos de una misma serie dejan de mostrarse como posibles duplicados.',
    ],
    adiciones: [
      'La validación bloquea una finalización mayor a 24 horas dentro de una serie recurrente.',
      'El detector tolera registros históricos con una finalización extensa sin ocultar cruces reales entre actividades distintas.',
    ],
    arreglos: [
      'Una reunión con finalización histórica incorrecta deja de agrupar todas las clases posteriores como un solo conflicto.',
      'La misma ocurrencia se agrupa por la fecha que realmente aparece en Agenda.',
    ],
  },
  {
    version: '1.9.9', estado: 'Publicada el 28 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor'],
    resumen: ['Cuotas sin perder el borrador', 'Recargos automáticos con reglas claras', 'Reuniones mensuales por posición'],
    actualizaciones: [
      'Corregir el tipo de cuota devuelve al mismo paso del asistente y conserva mes, importe y fechas.',
      'Las cuotas comunes pendientes reciben un único recargo del 10 por ciento desde el día 16.',
      'Agenda permite repetir por número de día o por posición mensual, como el segundo jueves.',
    ],
    adiciones: [
      'La revisión de cuotas actualiza inmediatamente a la persona corregida antes de generar el mes.',
      'Las cuotas con beca quedan excluidas de los recargos por atraso.',
    ],
    arreglos: [
      'Una beca sin porcentaje vuelve a aparecer como corrección pendiente.',
      'Corregir una exclusión ya no cierra el flujo ni pierde la cuota por generar.',
      'Una reunión mensual por posición deja de convertirse en una repetición fija por fecha.',
    ],
  },
  {
    version: '1.9.8', estado: 'Publicada el 28 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor'],
    resumen: ['Series recurrentes sin falsos conflictos', 'Cruces resumidos por actividad', 'Duplicados reales conservados'],
    actualizaciones: [
      'Agenda reconoce la identidad de cada serie recurrente antes de comparar horarios.',
      'Cada cruce muestra una sola actividad por serie y fecha, aunque existan filas heredadas repetidas.',
      'La ayuda explica cuándo un cruce recurrente es real y cuándo no requiere intervención.',
    ],
    adiciones: [
      'El detector recibe la serie y la fecha de generación guardadas con cada actividad.',
      'Las pruebas cubren una serie consigo misma, dos series distintas y duplicados independientes.',
    ],
    arreglos: [
      'Una serie recurrente deja de producir conflictos contra sus propias ocurrencias.',
      'Los cruces entre dos series ya no concatenan decenas de nombres repetidos.',
      'Las actividades independientes duplicadas continúan visibles para revisión.',
    ],
  },
  {
    version: '1.9.7', estado: 'Publicada el 28 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor'],
    resumen: ['Ayuda organizada por tareas', 'Búsqueda en lenguaje cotidiano', 'Guías actualizadas'],
    actualizaciones: [
      'Ayuda prioriza lo que la persona quiere hacer y ofrece seis recorridos frecuentes.',
      'La búsqueda entiende expresiones relacionadas, como borrar participante, calendario o login.',
      'Las respuestas muestran acciones directas y otras preguntas relacionadas sin exponer versiones técnicas.',
    ],
    adiciones: [
      'Se agregaron guías para agenda, personas, formularios, privacidad, auditoría, registro y asistencia.',
      'Cada respuesta puede compartir su enlace o copiar sus pasos cuando el navegador lo permite.',
      'Las búsquedas sin resultados proponen caminos útiles para continuar.',
    ],
    arreglos: [
      'Se retiraron explicaciones internas de validación que ya no ayudaban a completar una tarea.',
      'Se corrigieron instrucciones antiguas sobre navegación reciente y administración de formularios.',
      'La categoría y los resultados administrativos respetan el perfil de acceso.',
    ],
  },
  {
    version: '1.9.6', estado: 'Publicada el 27 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor', 'Página pública'],
    resumen: ['Agenda sin repeticiones', 'Recientes bajo demanda', 'Infinito más claro'],
    actualizaciones: [
      'La agenda agrupa en un solo aviso todas las actividades que coinciden en el mismo horario.',
      'Visitado recientemente se abre solamente cuando la persona lo solicita o enfoca la búsqueda.',
      'El símbolo de infinito público adopta una forma estable, más ancha y cercana al lenguaje visual de Aletea.',
    ],
    adiciones: [
      'Los cruces de agenda indican prioridad, posibles duplicados y todas las actividades involucradas.',
      'Un cruce intencional puede marcarse como coordinado y recuperarse después.',
      'Los nodos del infinito conservan enlaces reales, foco visible y etiquetas accesibles.',
    ],
    arreglos: [
      'La animación del infinito ya no deforma su geometría cuadro a cuadro.',
      'La sección actual deja de aparecer como un acceso reciente redundante.',
      'Varias combinaciones del mismo cruce ya no ocupan toda la lista de conflictos.',
    ],
  },
  {
    version: '1.9.5', estado: 'Publicada el 27 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor'],
    resumen: ['Edición enfocada', 'Navegación compacta', 'Estado siempre visible'],
    actualizaciones: [
      'Página web permite concentrarse en la maqueta y el inspector sin perder las acciones de guardado y publicación.',
      'El mapa del sitio se puede plegar y sus secciones se pueden filtrar por estado.',
      'La maqueta ofrece zoom y el panel de edición permite ajustar su ancho.',
    ],
    adiciones: [
      'Comando K abre la búsqueda de secciones desde cualquier punto del editor.',
      'La ruta de selección indica el grupo, la sección y el elemento que se está editando.',
      'El estado superior informa cambios pendientes, recuperación local e historial disponible.',
    ],
    arreglos: [
      'Los controles nuevos respetan los perfiles de solo lectura.',
      'El estado de guardado ya no borra la información de recuperación e historial.',
    ],
  },
  {
    version: '1.9.4', estado: 'Publicada el 27 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor', 'Página pública'],
    resumen: ['Mapa visual del sitio', 'Edición directa ampliada', 'Encuadre sin pérdida'],
    actualizaciones: [
      'Página web reúne sus 21 secciones en un mapa visual inspirado en el símbolo de Aletea y mantiene la búsqueda y las pestañas como accesos alternativos.',
      'Seleccionar un texto, una imagen, un botón o una tarjeta abre solamente los controles relacionados sin interrumpir la edición.',
      'Publicación y calidad convierte cada problema detectado en un acceso directo a la sección que necesita corrección.',
    ],
    adiciones: [
      'Las imágenes permiten elegir el punto focal horizontal y vertical sin volver a cargarlas ni degradar el archivo optimizado.',
      'Las colecciones se pueden ordenar y mostrar u ocultar desde la propia maqueta.',
      'El mapa distingue la sección actual y el estado visible, oculto, incompleto o modificado de cada destino.',
    ],
    arreglos: [
      'El inspector conserva el foco mientras se escribe directamente sobre la maqueta.',
      'La edición visual evita volver a presentar grupos de campos que no corresponden al elemento seleccionado.',
    ],
  },
  {
    version: '1.9.3', estado: 'Publicada el 27 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor', 'Página pública'],
    resumen: ['Editor web visual', 'Imágenes optimizadas', 'Trabajo recuperable'],
    actualizaciones: [
      'Página web prioriza una maqueta amplia y muestra solamente las opciones relacionadas con el elemento o sección actual.',
      'El navegador permite buscar cualquiera de las 21 secciones y distingue contenido listo, oculto, incompleto o modificado.',
      'Las vistas Escritorio, Tablet y Teléfono permiten revisar la composición sin abandonar el editor.',
    ],
    adiciones: [
      'El inspector separa Contenido, Diseño y Avanzado para evitar una pantalla llena de casillas.',
      'Deshacer, Rehacer y la recuperación local protegen cambios que todavía no llegaron al borrador del gestor.',
      'Las colecciones permiten duplicar una tarjeta y dejan la copia oculta hasta revisarla.',
      'Los campos de enlace sugieren páginas internas y formularios públicos disponibles.',
    ],
    arreglos: [
      'Las imágenes se convierten automáticamente a WebP, priorizan la calidad visual y muestran peso original, peso final y ahorro.',
      'El archivo original permanece en el dispositivo y el gestor recibe solamente la copia optimizada.',
      'La publicación resume las secciones modificadas y comprueba el contenido antes de confirmar.',
    ],
  },
  {
    version: '1.9.2', estado: 'Publicada el 27 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor', 'Página pública'],
    resumen: ['Formularios disponibles automáticamente', 'Permisos intactos', 'Prueba sin bloqueo administrativo'],
    actualizaciones: [
      'Los cinco formularios de prueba se preparan automáticamente cuando la página solicita por primera vez cada recorrido.',
      'La preparación deja de depender de que una persona con alcance global encuentre y pulse un botón administrativo.',
      'Las cuentas de coordinación conservan sus límites y no reciben permisos adicionales.',
    ],
    adiciones: [
      'Cada formulario automático queda identificado como creado por el sistema de pruebas.',
      'La operación es repetible y no duplica un formulario que ya existe.',
    ],
    arreglos: [
      'Los enlaces públicos dejan de terminar en “Este formulario no está disponible” cuando los equipos institucionales ya existen.',
      'Una cuenta sin alcance global ya no bloquea indirectamente la demostración pública.',
    ],
  },
  {
    version: '1.9.1', estado: 'Publicada el 27 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor', 'Página pública'],
    resumen: ['Trabajo recuperable', 'Navegación más rápida', 'Conexión explicada'],
    actualizaciones: [
      'Los formularios de prueba guardan un borrador local y lo recuperan al volver desde el mismo dispositivo.',
      'La búsqueda del gestor ofrece accesos a las últimas secciones visitadas antes de escribir una consulta.',
      'El editor de la página advierte al cerrar la pestaña si todavía hay cambios sin guardar.',
    ],
    adiciones: [
      'Los formularios permiten borrar conscientemente el borrador guardado.',
      'Los estados sin conexión y conexión recuperada explican qué puede hacer la persona sin perder respuestas.',
      'La lista de secciones recientes se puede limpiar y se conserva solamente en la cuenta y el navegador actuales.',
    ],
    arreglos: [
      'Una interrupción de conexión ya no obliga a completar nuevamente un formulario largo.',
      'La búsqueda global deja de aparecer vacía antes de ingresar dos caracteres.',
      'La ayuda deja de describir como simulados los formularios que ahora recorren el flujo real de prueba.',
    ],
  },
  {
    version: '1.9.0', estado: 'Publicada el 27 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor', 'Página pública'],
    resumen: ['Radar que libera espacio', 'Formularios de prueba reales', 'Seguimiento verificable'],
    actualizaciones: [
      'Ocultar el Radar institucional expande el resto del Centro de control y conserva una barra compacta para volver a mostrarlo.',
      'Los cinco formularios de la página de prueba guardan respuestas ficticias en el gestor y muestran una referencia verificable.',
      'La guía de corto plazo explica que la prueba recorre la bandeja y la tarea de seguimiento reales.',
    ],
    adiciones: [
      'Administración puede preparar desde Formularios los cinco circuitos de orientación, actividades, formación, voluntariado y tienda.',
      'Cada formulario define equipo responsable, finalidad, consentimiento, conservación y preguntas realistas.',
      'El gestor acepta estos envíos solamente desde prueba.aletea.org y los entornos locales autorizados.',
    ],
    arreglos: [
      'El Radar cerrado ya no deja una columna vacía ni reduce el ancho de los paneles principales.',
      'Los ejemplos dejan de terminar en una confirmación simulada sin entrada ni seguimiento.',
      'La interfaz distingue con claridad que los datos se guardan y exige usar información ficticia.',
    ],
  },
  {
    version: '1.8.9', estado: 'Publicada el 27 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor'],
    resumen: ['Tareas con instrucciones completas', 'Personas preparadas con anticipación', 'Radar adaptable'],
    actualizaciones: [
      'El editor explica dónde reunir objetivo, pasos, materiales, correo de entrega y resultado esperado.',
      'La bandeja explica qué muestra cada filtro y aclara que cambiarlo no mueve ni elimina tareas.',
      'El enlace directo de una tarea abre primero toda la información necesaria para realizarla.',
      'Finanzas abre el perfil exacto al archivar un participante y explica qué información se conserva.',
      'La fecha de ingreso admite incorporaciones futuras sin relajar los límites de fechas sensibles.',
    ],
    adiciones: [
      'Las tareas ofrecen una guía de entrega reutilizable para ordenar instrucciones.',
      'Canva, Drive y otros materiales pueden agregarse con nombre y enlace desde un espacio visible.',
      'El seguimiento muestra responsable, fecha, proyecto y actividad antes de dependencias y comentarios.',
      'El archivado desde Finanzas ofrece confirmación, detiene cuotas futuras y permite deshacer.',
      'El Radar institucional puede colapsarse y recuerda la preferencia en el navegador.',
    ],
    arreglos: [
      'Los materiales ya no dependen de que la persona adivine que debe pegarlos en una descripción genérica.',
      'Los enlaces dejan de desaparecer del panel abierto desde una dirección compartida.',
      'WhatsApp puede limitarse a transportar el enlace sin contener las instrucciones operativas.',
      'Ya no es necesario buscar manualmente en Personas a quien se agregó para una prueba.',
    ],
  },
  {
    version: '1.8.8', estado: 'Publicada el 26 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor', 'Página pública'],
    resumen: ['Formularios con contexto', 'Estados realistas', 'Validación integral'],
    actualizaciones: [
      'Actividades, formaciones y productos abren el formulario con el contexto y la intención ya seleccionados.',
      'Los formularios conservan respuestas al volver, muestran el problema junto al campo y explican el seguimiento después de revisar.',
      'La guía de corto plazo separa la demostración técnica de los requisitos necesarios antes de activar formularios reales.',
    ],
    adiciones: [
      'La demostración incluye lista de espera, formación cerrada, producto agotado y alternativas útiles.',
      'Página web guía la administración de formularios en cuatro pasos: crear, asignar privacidad, activar y vincular.',
      'El recorrido integral automático comprueba desde una propuesta pública hasta la confirmación simulada en escritorio y teléfonos.',
    ],
    arreglos: [
      'Los errores ya no se explican solamente al final del formulario.',
      'Los enlaces entre contenido y formularios ya no pierden el motivo de la consulta.',
      'Los ejemplos continúan limitados al sitio de prueba y aletea.org permanece sin cambios.',
    ],
  },
  {
    version: '1.8.7', estado: 'Publicada el 26 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor', 'Página pública'],
    resumen: ['Formularios de prueba completos', 'Recorridos más claros', 'Calidad automática ampliada'],
    actualizaciones: [
      'Contacto orienta por necesidad y muestra el formulario, el equipo responsable, el plazo y el siguiente paso.',
      'Actividades, formación, tienda y actualidad usan ejemplos realistas con estados y acciones coherentes.',
      'Formación, recursos, tienda y actualidad comparten búsqueda, filtros, conteo y recuperación sin resultados.',
    ],
    adiciones: [
      'Cinco formularios simulados permiten probar orientación, actividades, formación, voluntariado y tienda sin guardar ni transmitir datos.',
      'La auditoría cubre teclado, zoom al 200 por ciento, texto largo, imágenes ausentes, carga lenta y enlaces internos.',
    ],
    arreglos: [
      'Los formularios de ejemplo ya no terminan en tarjetas sin acción.',
      'Las colecciones vacías ofrecen una alternativa útil y los detalles secundarios aparecen a pedido.',
      'La publicación mantiene intacta la web antigua aletea.org.',
    ],
  },
  {
    version: '1.8.6', estado: 'Publicada el 26 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor', 'Página pública'],
    resumen: ['Ejemplos visibles en toda la prueba', 'Contenido confirmado conservado', 'Web pública antigua protegida'],
    actualizaciones: [
      'El sitio de prueba completa con ejemplos las secciones que todavía no tienen contenido publicado.',
      'Familias, Formación, Recursos, Tienda, Actualidad, Actividades y Contacto pueden recorrerse como demostración completa.',
    ],
    adiciones: [
      'La ayuda explica qué información es de ejemplo y por qué solamente aparece en prueba.aletea.org.',
    ],
    arreglos: [
      'El contenido antiguo del gestor ya no vuelve a ocultar las secciones de ejemplo en el sitio de prueba.',
      'La compilación de producción no activa ejemplos y este lanzamiento no modifica aletea.org.',
    ],
  },
  {
    version: '1.8.5', estado: 'Publicada el 26 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor', 'Página pública'],
    resumen: ['Corto plazo aprobado automáticamente', 'Cobertura móvil ampliada', 'Ejemplos conservados con claridad'],
    actualizaciones: [
      'La guía de validación muestra el resultado de la barrera automática sin exigir una sesión presencial.',
      'El cierre comprueba escritorio y teléfonos de 390 y 320 píxeles.',
    ],
    adiciones: [
      'La auditoría verifica que las ocho respuestas del criterio general tengan un destino visible y funcional.',
      'Los contenidos de muestra continúan identificados como ejemplos para demostrar la página futura.',
    ],
    arreglos: [
      'Publicación y calidad ya no presenta la revisión humana como requisito para aprobar la demostración técnica.',
      'Este lanzamiento no modifica ni reemplaza la web pública antigua.',
    ],
  },
  {
    version: '1.8.4', estado: 'Publicada el 26 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor', 'Página pública'],
    resumen: ['Apariencia con opciones seguras', 'Calidad antes de publicar', 'Página web mejor organizada'],
    actualizaciones: [
      'Página web cambia Contenido por Páginas y contenido para describir mejor lo que se administra.',
      'Ajustes incorpora Apariencia del sitio y Publicación y calidad sin sumar categorías innecesarias al menú lateral.',
    ],
    adiciones: [
      'Apariencia permite elegir movimiento y recursos visuales sin exponer geometrías ni tiempos técnicos.',
      'Publicación y calidad reúne errores, estado del borrador, revisión humana y accesos al sitio de prueba y a la guía de validación.',
    ],
    arreglos: [
      'Las preferencias de reducir movimiento continúan teniendo prioridad.',
      'Desactivar una representación visual conserva enlaces y tarjetas accesibles.',
      'La revisión ya no presenta un control automático como si fuera aprobación institucional.',
    ],
  },
  {
    version: '1.8.3', estado: 'Publicada el 26 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor', 'Página pública'],
    resumen: ['Corto plazo con criterios verificables', 'Diez recorridos enlazados', 'Aprobación humana sin resultados inventados'],
    actualizaciones: [
      'La web de prueba incorpora una guía de aceptación que vincula cada requisito de corto plazo con una tarea y un resultado observable.',
      'Ayuda explica cómo realizar la revisión y abre la guía publicada sin depender de instrucciones técnicas.',
    ],
    adiciones: [
      'Cada uno de los diez recorridos identifica la evidencia, el criterio de aprobación y la acción para revisarla.',
      'El progreso se conserva únicamente en el navegador de la persona que realiza la revisión.',
    ],
    arreglos: [
      'Completar la guía ya no puede confundirse con una aprobación institucional automática.',
      'La etapa de corto plazo deja de depender de una lista de funciones sin prueba asociada.',
    ],
  },
  {
    version: '1.8.2', estado: 'Publicada el 26 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor', 'Página pública'],
    resumen: ['Etapa de corto plazo demostrable', 'Ejemplos siempre identificados', 'Formularios ficticios sin envío'],
    actualizaciones: [
      'La web de prueba reúne navegación, páginas temáticas, actividades vigentes e históricas, formación, recursos, tienda, actualidad y contacto en un recorrido completo.',
      'Cada contenido ficticio se identifica como ejemplo para revisión y el aviso del sitio explica que fechas, precios, cupos y disponibilidad no están confirmados.',
      'El gestor y la web comparten el mismo contrato para preparar la demostración sin debilitar las validaciones de publicación real.',
    ],
    adiciones: [
      'Los formularios de ejemplo se muestran como demostración, sin enlace ni posibilidad de enviar datos.',
      'El menú de prueba incorpora Familias, Formación, Recursos y Tienda para demostrar la estructura recomendada a corto plazo.',
    ],
    arreglos: [
      'La información histórica queda separada de las propuestas vigentes.',
      'Los ejemplos dejan de poder confundirse con actividades, productos o inscripciones confirmadas.',
      'La demostración conserva controles adaptables a teléfono y etiquetas accesibles.',
    ],
  },
  {
    version: '1.8.1', estado: 'Preparada el 26 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor', 'Página pública'],
    resumen: ['Cuotas guiadas desde Personas', 'Pagos confirmados con saldo', 'Duplicados y correcciones bajo control'],
    actualizaciones: [
      'El perfil de cada participante define la cuota completa, la beca, el voluntariado o la inactividad y mantiene Finanzas sincronizada.',
      'Generar cuotas guía la selección del mes, la revisión de participantes y la confirmación de los importes finales.',
      'Registrar pago pide solo los datos necesarios y confirma el nuevo saldo de la persona.',
      'El WordPress institucional incorpora metadatos sociales, estructura semántica, textos alternativos y un sitemap sin contenidos internos.',
    ],
    adiciones: [
      'La configuración inicial señala participantes sin vínculo, grupos faltantes, becas incompletas y meses sin cuotas.',
      'La revisión explica por qué cada participante no genera cuota y ofrece una acción para corregirlo.',
    ],
    arreglos: [
      'Un posible pago duplicado se advierte antes de guardar y requiere una confirmación explícita.',
      'Corregir un pago conserva el movimiento anulado y el motivo para la auditoría.',
      'La ayuda explica el descuento automático y el recorrido completo sin depender de conocimientos contables.',
    ],
  },
  {
    version: '1.8.0', estado: 'Publicada el 26 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor'],
    resumen: ['Reuniones con cierre guiado', 'Seguimientos personales sin duplicados', 'Formularios con destinos revisables'],
    actualizaciones: [
      'Cerrar una reunión registra su minuta, resumen, acuerdos, responsables, fechas y tareas resultantes en un solo recorrido.',
      'El resumen semanal reúne situaciones críticas, decisiones vigentes y asuntos que cada persona decidió seguir.',
      'Captura rápida propone el tipo de registro, el equipo y una referencia responsable usando el mapa operativo actual.',
    ],
    adiciones: [
      'Una tarea puede marcarse como seguimiento personal con un motivo claro, sin crear una copia ni cambiar su responsable.',
      'Cada formulario define si una respuesta crea una tarea, solicitud, propuesta revisable, posible alta, contacto o solo un archivo.',
    ],
    arreglos: [
      'Las respuestas que podrían modificar personas, contactos o actividades quedan como borradores sujetos a revisión humana.',
      'Los acuerdos de reunión pueden crear tareas vinculadas sin volver a cargar títulos, responsables y contexto.',
      'Una reunión puede cerrarse con minuta y resumen aunque no haya acuerdos, sin exigir completar una decisión inexistente.',
    ],
  },
  {
    version: '1.7.0', estado: 'Publicada el 26 de agosto de 2026', autor: 'Alejandro Estol',
    ambitos: ['Gestor', 'Página pública'],
    resumen: ['Secciones en órbita suave', 'La sección actual se destaca', 'Enlaces que respetan el navegador'],
    actualizaciones: [
      'El gráfico de las páginas interiores se mueve lentamente como un sistema orbital y mantiene la identidad visual de Aletea.',
      'La barra lateral y el mapa vivo del gestor usan destinos reales que pueden copiarse o abrirse en otra pestaña.',
      'La portada pública incorpora un listón continuo con forma de infinito, una red de áreas más clara y tarjetas adaptables a cada ancho de pantalla.',
    ],
    adiciones: [
      'El color correspondiente a la sección actual es más grande para facilitar la orientación.',
      'La página pública muestra la fecha de actualización y la atribución enlazada a CorvusDevs.',
    ],
    arreglos: [
      'El clic central y Cmd o Ctrl más clic vuelven a funcionar en los controles que llevan a otra página o sección.',
      'Reducir movimiento en el dispositivo detiene la órbita sin ocultar los accesos.',
      'Las acciones que guardan, eliminan, filtran o abren paneles continúan siendo botones para evitar comportamientos inesperados.',
    ],
  },
  {
    version: '1.6.9', estado: 'Publicada el 25 de agosto de 2026', autor: 'Alejandro Estol',
    resumen: ['Ayudas solo cuando aportan', 'Espera breve antes de mostrarse', 'Controles claros sin mensajes repetidos'],
    actualizaciones: [
      'Las ayudas contextuales se reservan para iconos, acciones ambiguas y explicaciones escritas especialmente para una pantalla.',
      'El puntero debe permanecer brevemente sobre el control antes de que aparezca la ayuda.',
    ],
    adiciones: [
      'El teclado mantiene una espera más corta para que la explicación sea accesible sin interrumpir la navegación.',
    ],
    arreglos: [
      'Los botones con nombres claros dejan de repetir mensajes como Activa Cómo usar este panel.',
      'Salir de un control antes de la espera cancela la ayuda y evita globos atrasados.',
      'La misma regla selectiva se aplica al gestor y a la página pública.',
    ],
  },
  {
    version: '1.6.8', estado: 'Publicada el 25 de agosto de 2026', autor: 'Alejandro Estol',
    resumen: ['Ayuda breve en cada acción', 'Cartas siempre sobre papel blanco', 'Mis tareas con un nombre claro'],
    actualizaciones: [
      'Los botones y controles interactivos explican su acción al dejar el puntero encima o al recorrerlos con el teclado.',
      'La navegación, las direcciones compartibles y las pantallas usan Tareas o Mis tareas en lugar de expresiones ambiguas.',
    ],
    adiciones: [
      'La misma ayuda contextual se aplica automáticamente a controles nuevos del gestor y de la página pública.',
    ],
    arreglos: [
      'Todas las cartas membretadas conservan una hoja blanca, aunque se elija otra combinación de colores para el membrete.',
      'Los enlaces anteriores a /mi-trabajo continúan funcionando y se presentan con la dirección actual /tareas.',
      'Las ayudas contextuales no reemplazan etiquetas necesarias ni dependen del puntero en teléfonos.',
    ],
  },
  {
    version: '1.6.7', estado: 'Publicada el 25 de agosto de 2026', autor: 'Alejandro Estol',
    resumen: ['Novedades breves y claras', 'La pantalla abierta se conserva', 'El historial completo queda a un toque'],
    actualizaciones: [
      'El aviso de una versión nueva aparece como un resumen breve sobre la pantalla que la persona estaba usando.',
      'El popout muestra únicamente los tres cambios principales de la versión actual.',
    ],
    adiciones: [
      'Ver todos los cambios abre el historial completo mediante un enlace propio y explícito.',
    ],
    arreglos: [
      'Las cuentas que acumularon varias versiones dejan de recibir una lista extensa de novedades antiguas.',
      'Abrir el gestor después de una actualización ya no redirige automáticamente a la pantalla de cambios.',
      'El aviso mantiene objetivos táctiles amplios y no produce desborde horizontal en teléfono.',
    ],
  },
  {
    version: '1.6.6', estado: 'Publicada el 25 de agosto de 2026', autor: 'Alejandro Estol',
    resumen: ['Finanzas más simple y completa', 'Ayuda organizada por tareas', 'Búsqueda y controles consistentes'],
    actualizaciones: [
      'Finanzas reúne las acciones de cobranza, el estado del mes, los filtros y las cuentas en un recorrido más corto y sin resúmenes duplicados.',
      'Ayuda abre con recorridos frecuentes, preguntas destacadas y un índice completo de temas que se adapta al teléfono.',
    ],
    adiciones: [
      'Las cuentas financieras permiten actualizar grupo, condición, beca, observaciones y estado sin perder su historial.',
      'Exportar mes descarga un CSV de control y el recargo del 10 por ciento se calcula desde el importe original.',
      'La búsqueda de Ayuda acepta varias palabras en cualquier orden y abre automáticamente una respuesta única.',
    ],
    arreglos: [
      'Inputs, selectores y botones de Finanzas mantienen objetivos táctiles de al menos 44 px en escritorio y teléfono.',
      'Los campos de un movimiento financiero aparecen solo cuando la acción elegida los necesita.',
      'Las tarjetas de Ayuda recuperan sus bordes y fondos, y las categorías dejan de quedar ocultas fuera de la pantalla.',
    ],
  },
  {
    version: '1.6.5', estado: 'Publicada el 25 de agosto de 2026', autor: 'Alejandro Estol',
    resumen: ['Permisos guiados en cualquier sección', 'Accesos abre el control correcto', 'La sesión propia continúa activa'],
    actualizaciones: [
      'Las secciones protegidas muestran cada requisito como cumplido o pendiente y ofrecen una acción específica para resolverlo.',
      'El mismo recorrido sirve para datos personales, perfiles y equipos, por lo que las secciones nuevas pueden incorporarlo sin crear instrucciones especiales.',
    ],
    adiciones: [
      'Accesos recibe el contexto de la sección, busca la cuenta correspondiente y abre el control exacto que debe revisarse.',
      'Antes de confirmar, la pantalla aclara que ningún permiso se concede automáticamente y permite elegir una duración con fecha o sin vencimiento.',
    ],
    arreglos: [
      'Cambiar un permiso propio renueva la sesión actual de forma segura, mientras las demás sesiones anteriores quedan revocadas.',
      'Finanzas, respuestas protegidas, tareas derivadas y solicitudes de privacidad comparten el mismo lenguaje y las mismas acciones.',
    ],
  },
  {
    version: '1.6.4', estado: 'Publicada el 25 de agosto de 2026', autor: 'Alejandro Estol',
    resumen: ['Enlaces claros en todo el gestor', 'Vistas previas seguras por sección', 'Compatibilidad con enlaces anteriores'],
    actualizaciones: [
      'Las pantallas del gestor usan direcciones legibles como /finanzas, /agenda, /biblioteca y /comunicacion-visual.',
      'Recargar, volver, avanzar y abrir un enlace después de iniciar sesión conserva la sección solicitada.',
    ],
    adiciones: [
      'Los enlaces compartibles muestran un título y una descripción institucional específicos para cada sección.',
      'Las vistas previas de áreas privadas son genéricas y nunca incluyen nombres, saldos, tareas ni contenido protegido.',
    ],
    arreglos: [
      'Los enlaces antiguos con # siguen abriendo la pantalla correcta y se convierten a la nueva dirección al navegar.',
      'Los recursos del gestor continúan cargando correctamente al entrar directamente a rutas de varios niveles.',
      'Los archivos internos del servidor y los paquetes de publicación dejan de estar disponibles por dirección web.',
    ],
  },
  {
    version: '1.6.3', estado: 'Publicada el 25 de agosto de 2026', autor: 'Alejandro Estol',
    resumen: ['Finanzas con un enlace claro', 'Acciones de cobro guiadas', 'Permisos financieros verificables'],
    actualizaciones: [
      'Finanzas usa el enlace legible #finanzas y mantiene abiertos los enlaces antiguos sin mostrar el nombre técnico del módulo.',
      'La pantalla organiza las tareas frecuentes como cobro recibido, generación de cuotas y creación de una cuenta.',
    ],
    adiciones: [
      'El estado de acceso distingue consulta de gestión y explica qué operaciones están habilitadas.',
      'Cuando el acceso está bloqueado, cada requisito muestra si está cumplido y ofrece una acción para resolverlo o pedir ayuda.',
    ],
    arreglos: [
      'Los enlaces compartidos y el historial del navegador dejan de exponer el prefijo técnico CMS en Finanzas.',
      'La API financiera devuelve el estado de cada requisito sin incluir saldos ni movimientos protegidos.',
    ],
  },
  {
    version: '1.6.2', estado: 'Publicada el 25 de agosto de 2026', autor: 'Alejandro Estol',
    resumen: ['Nombres claros para datos personales', 'Requisitos con estado y acción'],
    actualizaciones: [
      'Los niveles ahora se llaman Sin acceso a datos personales, Datos personales básicos y Datos personales completos.',
      'Accesos comprueba el perfil y los equipos reales de cada persona para indicar si Finanzas y Solicitudes de privacidad están habilitados.',
    ],
    adiciones: [
      'Cada requisito cumplido explica qué perfil o equipo lo habilita.',
      'Cada requisito pendiente ofrece una acción que abre y prepara la configuración necesaria dentro de la misma persona.',
    ],
    arreglos: [
      'Las tarjetas dejan de mostrar Requisito adicional cuando el requisito ya está cumplido.',
      'Administración ya no necesita buscar manualmente el editor de perfil o de equipos para completar un permiso.',
    ],
  },
  {
    version: '1.6.1', estado: 'Publicada el 25 de agosto de 2026', autor: 'Alejandro Estol',
    resumen: ['Permisos de datos personales más claros', 'Acceso temporal o sin vencimiento'],
    actualizaciones: [
      'Accesos explica qué habilita y qué mantiene bloqueado cada nivel de datos personales antes de guardarlo.',
      'Finanzas distingue si falta acceso a información sensible o si falta pertenecer al equipo correspondiente.',
    ],
    adiciones: [
      'Administración puede elegir entre una fecha de vencimiento y un permiso sin vencimiento explícito y auditable.',
      'Ayuda detalla cómo se combinan perfil, equipos y datos personales para acceder a cada función protegida.',
    ],
    arreglos: [
      'Las cuentas antiguas sin fecha no se convierten automáticamente en accesos indefinidos.',
      'Asignar un equipo continúa sin conceder por sí solo acceso a datos personales.',
    ],
  },
  {
    version: '1.6.0', estado: 'Publicada el 25 de agosto de 2026', autor: 'Alejandro Estol',
    resumen: ['Cuentas corrientes para Fútbol sin Barreras', 'Cierre mensual visual', 'Seguimiento de pagos pendientes'],
    actualizaciones: [
      'Finanzas reúne las cuentas de Fútbol sin Barreras, sus cargos, pagos, saldos y compromisos en una vista privada.',
      'El cierre mensual distingue cuánto había por cobrar, cuánto se cobró y qué cuentas requieren seguimiento.',
    ],
    adiciones: [
      'Los filtros permiten revisar cuentas con saldo, vencidas, al día o a favor y recordar la vista elegida.',
      'Cada cuenta conserva un historial revisable y permite registrar pagos o cargos sin depender de una planilla externa.',
    ],
    arreglos: [
      'El selector de mes y los filtros del cierre mensual ahora tienen objetivos táctiles cómodos y no se recortan en teléfonos.',
      'Los compromisos de pago se muestran como contexto, pero no se cuentan como dinero cobrado.',
    ],
  },
  {
    version: '1.5.4', estado: 'Publicada el 25 de agosto de 2026', autor: 'Alejandro Estol',
    resumen: ['Fotos de perfil fáciles de cargar', 'Optimización automática y privada'],
    actualizaciones: [
      'Accesos acepta fotos habituales de hasta 20 MB y las prepara automáticamente antes de guardarlas.',
    ],
    adiciones: [
      'El gestor muestra cuándo está preparando la foto y conserva la imagen original solamente en el dispositivo durante el proceso.',
    ],
    arreglos: [
      'Ya no es necesario reducir manualmente una foto a 500 KB antes de elegirla.',
      'La copia privada guardada conserva un máximo de 500 KB y un tamaño adecuado para perfiles.',
    ],
  },
  {
    version: '1.5.3', estado: 'Publicada el 25 de agosto de 2026', autor: 'Alejandro Estol',
    resumen: ['Permisos explicados por persona', 'Vista segura de cada perfil', 'Accesos sin corte lateral en teléfono'],
    actualizaciones: [
      'Accesos muestra en cada persona qué puede ver, editar, publicar y administrar, sin exigir interpretar nombres técnicos.',
      'El perfil, las áreas asignadas y el permiso temporal para datos personales aparecen como tres fuentes distintas de acceso.',
    ],
    adiciones: [
      'Ver el gestor como abre una explicación detallada y de solo lectura para cada persona, sin iniciar otra sesión ni modificar la cuenta.',
      'La vista detallada distingue tareas institucionales, página web, comunicación visual, métricas, datos personales y administración de accesos.',
    ],
    arreglos: [
      'El selector de foto oculto deja de ensanchar la pantalla de Accesos en teléfonos.',
      'Ayuda explica cómo se combinan perfiles, equipos y permisos temporales, y aclara que asignar un área no concede datos privados.',
    ],
  },
  {
    version: '1.5.2', estado: 'Publicada el 24 de agosto de 2026', autor: 'Alejandro Estol',
    resumen: ['Permisos explícitos para las funciones nuevas', 'Cartas membretadas con privacidad reforzada'],
    actualizaciones: [
      'Página web, métricas y Comunicación visual distinguen ahora Administración, Dirección, Coordinación, Integrante y Consulta.',
      'Carta membretada queda reservada a Dirección y Administración por tratarse de un documento institucional con firma.',
    ],
    adiciones: [
      'La autorización se comprueba en la navegación, dentro del editor y en la API, no solamente ocultando opciones del menú.',
    ],
    arreglos: [
      'Integrante y Consulta ya no pueden abrir borradores, historial, medios, métricas ni editores de contenido público.',
      'El cuerpo y la firma de una carta dejan de persistirse en el navegador al cerrar la pestaña.',
      'La carga de imágenes remotas ya no puede ser activada por perfiles sin permiso para Comunicación visual.',
    ],
  },
  {
    version: '1.5.1', estado: 'Publicada el 24 de agosto de 2026', autor: 'Alejandro Estol',
    resumen: ['League Gothic con más aire', 'Vista previa y sitio de prueba alineados'],
    actualizaciones: [
      'Los títulos expresivos conservan su tamaño y ganan separación vertical para que las letras no se toquen.',
    ],
    adiciones: [],
    arreglos: [
      'La vista previa del gestor y prueba.aletea.org usan el mismo interlineado para los títulos con League Gothic.',
    ],
  },
  {
    version: '1.5.0', estado: 'Publicada el 24 de agosto de 2026', autor: 'Alejandro Estol',
    resumen: ['Cartas membretadas dentro de Comunicación visual', 'Vista previa A4 editable', 'Firma e impresión personalizables'],
    actualizaciones: [
      'Comunicación visual incorpora Carta membretada como un documento distinto de las piezas para redes.',
      'La edición adapta los campos y controles al documento para evitar opciones que no corresponden a una carta formal.',
    ],
    adiciones: [
      'La carta permite editar lugar y fecha, asunto opcional, saludo, cuerpo, cierre, firmante, cargo, organización y datos de contacto.',
      'La firma puede elegirse desde el dispositivo o cargarse mediante un enlace público.',
      'Imprimir o guardar PDF abre la salida A4 preparada para el diálogo de impresión del dispositivo.',
    ],
    arreglos: [
      'El formato A4 conserva Poppins para asegurar una lectura clara y no mezcla controles propios de publicaciones sociales.',
      'Los textos extensos muestran una advertencia antes de imprimir y mantienen márgenes seguros para el membrete y la firma.',
    ],
  },
  {
    version: '1.4.2', estado: 'Publicada el 24 de agosto de 2026', autor: 'Alejandro Estol',
    resumen: ['Títulos más grandes en el editor de piezas', 'Control visual hasta el doble de tamaño', 'Avisos del gestor más claros'],
    actualizaciones: [
      'El tamaño del título puede ajustarse entre 0,72 y 2 veces su medida normal, con el valor visible junto al control.',
      'El aviso de versión nueva distingue una actualización del gestor de una publicación de contenido en la página web.',
      'El paquete de prueba comprueba que fue generado desde el contenido publicado del CMS y rechaza una copia local anterior.',
    ],
    adiciones: [
      'El gestor avisa cuando un título muy grande y con varias líneas necesita revisión en la vista previa.',
    ],
    arreglos: [
      'Las plantillas de campaña, carrusel y mensaje breve ya no dejan de crecer antes de alcanzar el nuevo máximo.',
      'Los títulos extensos conservan límites de seguridad para no invadir automáticamente la fotografía o la información inferior.',
      'El aviso de actualización ocupa solo el espacio disponible junto al panel lateral y se conserva al cambiar de sección.',
      'La tipografía elegida para la portada deja de perderse cuando se prepara prueba.aletea.org.',
      'League Gothic se aplica únicamente al título elegido; la bajada, los botones y la navegación conservan Poppins.',
    ],
  },
  {
    version: '1.4.1', estado: 'Publicada el 24 de agosto de 2026', autor: 'Alejandro Estol',
    resumen: ['Actualizaciones visuales consistentes', 'Ayuda para recuperar una pantalla desordenada'],
    actualizaciones: [
      'El gestor descarga el diseño y el código de una misma versión para evitar pantallas mezcladas después de publicar.',
    ],
    adiciones: [
      'Ayuda explica cómo actualizar la pantalla si el navegador todavía conserva una copia anterior.',
    ],
    arreglos: [
      'El selector de tipografía de Página web conserva cada muestra, nombre y explicación en líneas separadas.',
      'Los archivos del gestor dejan de reutilizar una hoja de estilos anterior después de una actualización.',
    ],
  },
  {
    version: '1.4.0', estado: 'Publicada el 24 de agosto de 2026', autor: 'Alejandro Estol',
    resumen: ['Editor de piezas ampliado', 'Carruseles listos para descargar', 'Tipografía visual para la página pública'],
    actualizaciones: [
      'Comunicación visual organiza la edición en Texto, Estilo, Elementos y Publicación para mostrar solo las decisiones necesarias.',
      'Las plantillas cubren actividades, convocatorias, campañas, carruseles educativos y mensajes breves.',
      'El selector de fotografías usa controles claros y completamente en español.',
      'Página web permite elegir visualmente entre Poppins y League Gothic en los titulares compatibles, con vista previa inmediata.',
    ],
    adiciones: [
      'Los carruseles permiten recorrer, duplicar y eliminar páginas, y descargar la serie completa.',
      'Las fotografías pueden elegirse desde el dispositivo o cargarse desde un enlace directo o un archivo público de Google Drive.',
      'La pestaña Publicación prepara un texto base y avisa cuando el contenido necesita una revisión.',
      'Las cifras y la invitación a participar pueden usar League Gothic sin cambiar menús, botones ni textos de lectura.',
    ],
    arreglos: [
      'La carga remota valida permisos, formato y tamaño antes de incorporar una imagen a la pieza.',
      'El editor conserva sus controles y la vista previa dentro del ancho disponible en celulares.',
    ],
  },
  {
    version: '1.3.0', estado: 'Publicada el 24 de agosto de 2026', autor: 'Alejandro Estol',
    resumen: ['Página web y comunicación visual dentro del gestor', 'Navegación lateral más clara', 'Horarios y edición de actividades corregidos'],
    actualizaciones: [
      'Página web ofrece una vista previa editable y organiza su contenido en secciones simples.',
      'La navegación separa Página web, Comunicación visual y Organización, y recuerda qué grupos dejó plegados cada cuenta.',
      'Comunicación visual permite crear piezas desde plantillas, editar su contenido y ver el resultado mientras se trabaja.',
    ],
    adiciones: [
      'Página web permite guardar borradores y publicar en prueba.aletea.org sin modificar el sitio principal.',
      'El editor de piezas descarga diseños en PNG y SVG, con formatos, paletas y elementos configurables.',
      'League Gothic está disponible como estilo opcional para titulares, acompañado por Poppins en los textos.',
      'Contenido y Editor de piezas tienen iconos propios en la navegación.',
    ],
    arreglos: [
      'Las horas se interpretan y muestran según Uruguay para evitar corrimientos al agendar o revisar actividad.',
      'Editar una actividad conserva la nueva hora después de guardar.',
      'Áreas vuelve a cargar su contenido en el alojamiento de cPanel.',
      'Los nombres de usuario conservan las mayúsculas elegidas para mostrarse, sin volver sensible a mayúsculas el ingreso.',
    ],
  },
  {
    version: '1.2.0', estado: 'En preparación, pendiente de commit', autor: 'Alejandro Estol',
    resumen: ['Avisos internos visibles desde cualquier sección', 'Mensajes manuales breves como respaldo', 'Primeros pasos para facilitar la adopción'],
    actualizaciones: [
      'Mis tareas resume las asignaciones abiertas, los avisos nuevos y los asuntos que requieren atención.',
      'Las notificaciones abren la tarea exacta y quedan marcadas como revisadas.',
      'Accesos identifica cuentas sin primer ingreso o con una semana de inactividad.',
    ],
    adiciones: [
      'La navegación muestra un contador persistente de avisos pendientes.',
      'Cada tarea asignada permite copiar un aviso manual con enlace directo.',
      'Las pantallas de equipo permiten copiar un resumen breve de las tareas abiertas.',
      'Los siete equipos fundacionales existen como unidades reales y permiten asignar integrantes desde Equipos o Accesos.',
      'Las actividades y reuniones pueden repetirse cada semana, cada dos semanas o cada mes hasta por un año, sin cargarlas una por una.',
      'Comisión Directiva e Interinstitucional se incorporaron como equipos asignables.',
      'Los formularios y Ayuda explican qué significan esfuerzo estimado y programa del proyecto.',
      'El primer ingreso explica dónde revisar asignaciones y cómo funcionan los avisos.',
      'Ayuda incorpora orientación sobre adopción y comunicación manual por WhatsApp.',
    ],
    arreglos: [
      'El reporte mensual oculta a las personas archivadas sin actividad en el período y conserva su historial cuando sí tuvieron asistencia o una corrección registrada.',
      'Los enlaces copiados desde Google Drive se reconocen aunque incluyan texto adicional y pueden pegarse con una acción visible.',
      'La selección de equipos en Accesos presenta opciones táctiles separadas, muestra la cantidad elegida y se adapta al ancho disponible.',
      'El mapa vivo vincula cada área mediante una clave estable y conserva las asignaciones aunque cambie el nombre visible del equipo.',
      'Los enlaces de tareas conservan el identificador necesario para abrir su contexto.',
      'Copiar un aviso no se presenta como envío ni como confirmación de lectura.',
      'Los textos manuales excluyen descripciones y datos sensibles.',
    ],
  },
  {
    version: '1.1.0', estado: 'En preparación, pendiente de commit', autor: 'Alejandro Estol',
    resumen: ['Equipos e integrantes más fáciles de gestionar', 'Ayuda buscable para las dudas más frecuentes', 'Mejor experiencia del gestor en el celular', 'Registro y accesos con mayor claridad'],
    actualizaciones: [
      'La gestión institucional reúne centro de control, tareas, agenda, áreas, formularios, biblioteca y equipos en una navegación consistente.',
      'La experiencia móvil reduce el desplazamiento con secciones plegables, acciones prioritarias y un menú Más compacto que se cierra al tocar fuera.',
      'Los formularios emergentes aprovechan primero el alto disponible, conservan un ancho legible y mantienen alturas consistentes en campos y selectores.',
      'El mapa vivo centra las fichas de los equipos y el radar institucional dispone de más espacio para explicar cada alerta.',
    ],
    adiciones: [
      'Accesos y Registro institucional tienen pantallas propias, búsqueda, filtros, fotografías de perfil y trazabilidad de cambios.',
      'Los equipos permiten administrar integrantes, funciones y asignaciones tanto desde Accesos como desde la pantalla del equipo.',
      'Al crear un proyecto, el sistema propone agregar su primera tarea o recurso sin perder el equipo y el proyecto elegidos.',
      'El seguimiento del proyecto ofrece acciones directas para agregar hitos, tareas, actividades y enlaces de Canva, Drive u otras herramientas.',
      'Las tareas recién creadas confirman su responsable y explican que la asignación aparece en la bandeja interna.',
      'Las secciones tienen enlaces compartibles y Ayuda permite copiar una búsqueda específica para abrirla después del ingreso.',
      'La agenda muestra por defecto fechas especiales de Uruguay y fechas internacionales relevantes.',
      'La sección Ayuda responde dudas sobre equipos, proyectos, tareas, accesos, notificaciones y materiales.',
      'Se incorporaron proyectos, actividades, reuniones, decisiones, riesgos, hitos, documentos, formularios, comunicados, automatizaciones y métricas operativas.',
    ],
    arreglos: [
      'Los selectores de fecha abren el calendario y funcionan de forma consistente en los formularios.',
      'Las acciones de alertas y tarjetas abren el elemento correspondiente en lugar de recargar sin contexto.',
      'Los campos de los formularios tienen etiquetas con iconos, alturas coherentes y mejor separación visual.',
      'El ingreso usa la marca Aletea, acepta nombres de usuario y conserva el enlace correcto a CorvusDevs.',
    ],
  },
  { version: '1.0.0', fecha: '16 de agosto de 2026', commit: '4b701d4', autor: 'Alejandro Estol', resumen: ['Inicio y reportes institucionales mejorados', 'Seguimientos consistentes en todos los almacenes'], actualizaciones: ['Inicio institucional: se añadieron indicadores operativos, resumen semanal y accesos directos a agenda y seguimiento.', 'Reporte mensual: se mejoraron los controles de período, la lectura de asistencia y la presentación de cada grupo.', 'Personas: el directorio conserva mejor el contexto de cada ficha al navegar desde los reportes.'], adiciones: ['El almacenamiento local y el remoto incorporaron el mismo dato de seguimiento para que los totales coincidan.', 'Se agregó una prueba de interfaz para el inicio y pruebas de almacenamiento para proteger los nuevos indicadores.'], arreglos: ['Los controles de agenda conservan el período seleccionado al volver desde otra vista.', 'Los valores del reporte se adaptan sin recortar contenido en los tamaños de pantalla previstos.'] },
  { version: '0.9.0', fecha: '16 de agosto de 2026', commit: 'f3f92a4', autor: 'Alejandro Estol', resumen: ['Agenda ampliada y tablero más operativo'], actualizaciones: ['La agenda representa mejor actividades, períodos y contexto.', 'El tablero prioriza próximos pasos y estados.'], adiciones: ['Se añadieron próximos eventos y tareas en el inicio.', 'La última pantalla visitada queda guardada.'], arreglos: ['Los informes mantienen la asistencia al cambiar de período.', 'Las vistas de personas conservan su disposición.'] },
  { version: '0.8.0', fecha: '15 de agosto de 2026', commit: '492d841', autor: 'Alejandro Estol', resumen: ['Migración a Cloudflare Pages y D1'], actualizaciones: ['La aplicación pasó a Cloudflare Pages y D1.', 'Acceso y almacenamiento usan infraestructura centralizada.'], adiciones: ['Se incorporaron API protegida, migraciones D1 e importación de datos.', 'Se añadieron acceso alojado y almacenamiento de fotografías.'], arreglos: ['La publicación limita los archivos que llegan al sitio público.', 'Sesión, almacenamiento y rutas remotas quedaron cubiertos por pruebas.'] },
  { version: '0.7.0', fecha: '11 de agosto de 2026', commit: '85b9cba', autor: 'Alejandro Estol', resumen: ['Reporte mensual y exportaciones de asistencia'], actualizaciones: ['El reporte mensual organiza grupos, personas y asistencia.', 'La interfaz móvil informa mejor el estado de guardado.'], adiciones: ['Se agregaron exportaciones de resumen y detalle.', 'Se incorporaron correcciones históricas y alertas por faltas.'], arreglos: ['El CSV describe cada casilla y conserva los grupos.', 'Las correcciones de asistencia se sincronizan entre almacenes.'] },
  { version: '0.6.0', fecha: '1 de agosto de 2026', commit: '006f156', autor: 'Alejandro Estol', resumen: ['Sesión cifrada y acceso protegido'], actualizaciones: ['El ingreso usa un token cifrado y una clave no exportable.', 'La sesión no almacena la contraseña de acceso.'], adiciones: ['Se separó la gestión de sesión de las pantallas.', 'Las pruebas pueden validar acceso sin cuentas reales.'], arreglos: ['Los tokens inválidos no restauran una sesión.', 'La lógica sensible quedó aislada y probada.'] },
  { version: '0.5.0', fecha: '4 de agosto de 2026', commit: 'ddb77c1', autor: 'Alejandro Estol', resumen: ['Actualización automática y edición de fotografías'], actualizaciones: ['El trabajador de servicio mantiene el código publicado.', 'La edición de fotografías ofrece recorte y vista previa.'], adiciones: ['Se añadió un sello de versión visible.', 'Administración obtuvo un registro de actividad.'], arreglos: ['Los formatos de imagen conservan fotos e iniciales.', 'El ingreso informa errores sin ocultarlos.'] },
  { version: '0.4.0', fecha: '1 de agosto de 2026', commit: 'dbff3b0', autor: 'Alejandro Estol', resumen: ['Listas, almacenamiento local y exportación PNG'], actualizaciones: ['Las listas admiten emparejamientos y cambios de grupo.', 'La vista previa exporta y comparte una imagen.'], adiciones: ['Se incorporó almacenamiento local en IndexedDB.', 'Se añadieron deshacer, rehacer, fecha, hora y lugar.'], arreglos: ['Las listas conservan personas al cambiar datos.', 'La interfaz usa objetivos táctiles y texto en español.'] },
  { version: '0.3.0', fecha: '31 de julio de 2026', commit: 'b0ee49e', autor: 'Alejandro Estol', resumen: ['Base visual y técnica inicial'], actualizaciones: ['Se establecieron la identidad visual y la estructura inicial.'], adiciones: ['Se incorporaron el logo, la tipografía y las primeras pruebas de geometría.'], arreglos: ['Las fechas se muestran sin corrimientos por zona horaria.', 'Los colores principales cumplen contraste AA.'] },
])

export function compararVersiones(a, b) {
  const partes = (valor) => String(valor || '0').split('.').map((parte) => Number.parseInt(parte, 10) || 0)
  const izquierda = partes(a); const derecha = partes(b)
  for (let indice = 0; indice < Math.max(izquierda.length, derecha.length); indice += 1) {
    if ((izquierda[indice] || 0) !== (derecha[indice] || 0)) return (izquierda[indice] || 0) > (derecha[indice] || 0) ? 1 : -1
  }
  return 0
}

export function novedadesPendientes(almacen = globalThis.localStorage) {
  try {
    const guardada = almacen?.getItem(CLAVE_NOVEDADES_VISTAS)
    if (!guardada) return NOVEDADES.slice(0, 1)
    const vista = guardada || '0.0.0'
    return NOVEDADES.filter((entrada) => compararVersiones(entrada.version, vista) > 0)
  } catch { return [] }
}

export function marcarNovedadesVistas(almacen = globalThis.localStorage) {
  try { almacen?.setItem(CLAVE_NOVEDADES_VISTAS, VERSION_NOVEDADES) } catch {}
}
