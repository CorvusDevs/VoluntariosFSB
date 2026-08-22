export const VERSION_NOVEDADES = '1.2.0'
export const CLAVE_NOVEDADES_VISTAS = 'aletea:novedades:vista'

export const NOVEDADES = Object.freeze([
  {
    version: '1.2.0', estado: 'En preparación, pendiente de commit', autor: 'Alejandro Estol',
    resumen: ['Avisos internos visibles desde cualquier sección', 'Mensajes manuales breves como respaldo', 'Primeros pasos para facilitar la adopción'],
    actualizaciones: [
      'Mi trabajo resume tareas abiertas, avisos nuevos y asuntos que requieren atención.',
      'Las notificaciones abren la tarea exacta y quedan marcadas como revisadas.',
      'Accesos identifica cuentas sin primer ingreso o con una semana de inactividad.',
    ],
    adiciones: [
      'La navegación muestra un contador persistente de avisos pendientes.',
      'Cada tarea asignada permite copiar un aviso manual con enlace directo.',
      'Las pantallas de equipo permiten copiar un resumen breve del trabajo abierto.',
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
      'La gestión institucional reúne centro de control, trabajo, agenda, áreas, formularios, biblioteca y equipos en una navegación consistente.',
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
