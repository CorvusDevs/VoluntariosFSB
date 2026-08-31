SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS usuarios(
  correo VARCHAR(191) PRIMARY KEY,
  nombre VARCHAR(191) NOT NULL,
  rol VARCHAR(191) NOT NULL CHECK(rol IN('admin', 'coordinacion')),
  activo INT NOT NULL DEFAULT 1 CHECK(activo IN(0, 1)),
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ,
  sal BLOB,
  hash_contrasena BLOB,
  version_sesion INT NOT NULL DEFAULT 0,
  permisos LONGTEXT,
  ultimo_acceso DATETIME,
  perfil_acceso VARCHAR(191) NOT NULL DEFAULT 'coordinacion'
  CHECK(perfil_acceso IN('administracion', 'direccion', 'coordinacion', 'integrante', 'consulta')),
  nivel_datos_personales VARCHAR(191) NOT NULL DEFAULT 'ninguno'
  CHECK(nivel_datos_personales IN('ninguno', 'operativo', 'sensible')),
  datos_personales_hasta DATE,
  foto_perfil VARCHAR(191),
  datos_personales_sin_vencimiento INT NOT NULL DEFAULT 0
  CHECK(datos_personales_sin_vencimiento IN(0, 1)),
  acceso_hasta DATE
);
CREATE TABLE IF NOT EXISTS documentos(
  ruta VARCHAR(191) PRIMARY KEY,
  contenido LONGTEXT NOT NULL,
  revision INT NOT NULL DEFAULT 1,
  actualizado_por VARCHAR(191) NOT NULL,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS actividad(
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  correo VARCHAR(191) NOT NULL,
  accion VARCHAR(191) NOT NULL,
  recurso VARCHAR(191) NOT NULL,
  detalle LONGTEXT,
  cuando DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX actividad_cuando ON actividad(cuando DESC);
CREATE INDEX documentos_ruta ON documentos(ruta);
CREATE TABLE IF NOT EXISTS fotos(
  clave VARCHAR(191) PRIMARY KEY,
  datos MEDIUMBLOB NOT NULL,
  tipo VARCHAR(191) NOT NULL DEFAULT 'image/jpeg',
  revision INT NOT NULL DEFAULT 1,
  actualizado_por VARCHAR(191) NOT NULL,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS equipos(
  id VARCHAR(191) PRIMARY KEY,
  nombre VARCHAR(191) NOT NULL UNIQUE,
  descripcion LONGTEXT NOT NULL DEFAULT '',
  color VARCHAR(191) NOT NULL DEFAULT '#6d3087',
  activo INT NOT NULL DEFAULT 1 CHECK(activo IN(0, 1)),
  creado_por VARCHAR(191) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ,
  decisiones_permitidas LONGTEXT NOT NULL DEFAULT '',
  debe_escalar LONGTEXT NOT NULL DEFAULT '',
  informa_a LONGTEXT NOT NULL DEFAULT '',
  frecuencia_reunion VARCHAR(191) NOT NULL DEFAULT 'segun_necesidad',
  categoria VARCHAR(191) NOT NULL DEFAULT 'equipo'
  CHECK(categoria IN('equipo', 'comision_directiva', 'comision_fiscal', 'comision_electoral', 'comision')),
  clave VARCHAR(191)
);
CREATE TABLE IF NOT EXISTS responsabilidades_equipo(
  id VARCHAR(191) PRIMARY KEY,
  equipo_id VARCHAR(191) NOT NULL REFERENCES equipos(id),
  usuario_correo VARCHAR(191) NOT NULL REFERENCES usuarios(correo),
  tipo VARCHAR(191) NOT NULL CHECK(tipo IN('coordinacion', 'integrante', 'referente', 'sustitucion')),
  puede_decidir VARCHAR(191) NOT NULL DEFAULT '',
  debe_escalar LONGTEXT NOT NULL DEFAULT '',
  activo INT NOT NULL DEFAULT 1 CHECK(activo IN(0, 1)),
  creado_por VARCHAR(191) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(equipo_id, usuario_correo, tipo)
);
CREATE TABLE IF NOT EXISTS proyectos_cms(
  id VARCHAR(191) PRIMARY KEY,
  titulo VARCHAR(191) NOT NULL,
  objetivo LONGTEXT NOT NULL DEFAULT '',
  equipo_id VARCHAR(191) REFERENCES equipos(id),
  responsable_correo VARCHAR(191) REFERENCES usuarios(correo),
  estado VARCHAR(191) NOT NULL DEFAULT 'en_marcha' CHECK(estado IN('borrador', 'en_marcha', 'en_pausa', 'cerrado')),
  prioridad VARCHAR(191) NOT NULL DEFAULT 'normal' CHECK(prioridad IN('baja', 'normal', 'alta', 'urgente')),
  fecha_inicio DATE,
  fecha_fin DATETIME,
  presupuesto DECIMAL(12,2),
  notas LONGTEXT NOT NULL DEFAULT '',
  creado_por VARCHAR(191) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ,
  programa_id VARCHAR(191) REFERENCES programas_cms(id),
  unidad_id VARCHAR(191) REFERENCES unidades_operativas_cms(id)
);
CREATE TABLE IF NOT EXISTS tareas_cms(
  id VARCHAR(191) PRIMARY KEY,
  titulo VARCHAR(191) NOT NULL,
  descripcion LONGTEXT NOT NULL DEFAULT '',
  tipo VARCHAR(191) NOT NULL DEFAULT 'tarea' CHECK(tipo IN('tarea', 'directriz', 'solicitud', 'seguimiento', 'nota')),
  estado VARCHAR(191) NOT NULL DEFAULT 'pendiente' CHECK(estado IN('pendiente', 'en_marcha', 'esperando_respuesta', 'bloqueada', 'completada', 'cancelada')),
  prioridad VARCHAR(191) NOT NULL DEFAULT 'normal' CHECK(prioridad IN('baja', 'normal', 'alta', 'urgente')),
  equipo_id VARCHAR(191) REFERENCES equipos(id),
  proyecto_id VARCHAR(191) REFERENCES proyectos_cms(id),
  responsable_correo VARCHAR(191) REFERENCES usuarios(correo),
  solicitante_correo VARCHAR(191) REFERENCES usuarios(correo),
  fecha_limite DATE,
  fecha_seguimiento DATE,
  creado_por VARCHAR(191) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completado_en DATETIME
  ,
  evento_id VARCHAR(191) REFERENCES eventos_cms(id),
  recurrencia_id VARCHAR(191) REFERENCES tareas_recurrentes_cms(id),
  generada_para DATE,
  esfuerzo_horas DECIMAL(12,2)
  CHECK(esfuerzo_horas IS NULL OR(esfuerzo_horas > 0 AND esfuerzo_horas <= 168)),
  asignado_en DATETIME,
  seguimiento_personal INT NOT NULL DEFAULT 0 CHECK(seguimiento_personal IN(0, 1)),
  motivo_seguimiento VARCHAR(191) NOT NULL DEFAULT '',
  seguimiento_personal_por VARCHAR(191) REFERENCES usuarios(correo),
  unidad_id VARCHAR(191) REFERENCES unidades_operativas_cms(id)
);
CREATE TABLE IF NOT EXISTS comentarios_tarea_cms(
  id VARCHAR(191) PRIMARY KEY,
  tarea_id VARCHAR(191) NOT NULL REFERENCES tareas_cms(id) ON DELETE CASCADE,
  contenido LONGTEXT NOT NULL,
  creado_por VARCHAR(191) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX responsabilidades_equipo_usuario ON responsabilidades_equipo(
  usuario_correo,
  activo
);
CREATE INDEX tareas_cms_tablero ON tareas_cms(estado, fecha_limite, prioridad);
CREATE INDEX tareas_cms_equipo ON tareas_cms(equipo_id, estado);
CREATE INDEX tareas_cms_responsable ON tareas_cms(responsable_correo, estado);
CREATE INDEX proyectos_cms_estado ON proyectos_cms(estado, fecha_fin);
CREATE TABLE IF NOT EXISTS reuniones_cms(
  id VARCHAR(191) PRIMARY KEY,
  titulo VARCHAR(191) NOT NULL,
  objetivo LONGTEXT NOT NULL DEFAULT '',
  equipo_id VARCHAR(191) REFERENCES equipos(id),
  proyecto_id VARCHAR(191) REFERENCES proyectos_cms(id),
  fecha_hora DATETIME NOT NULL,
  lugar VARCHAR(191) NOT NULL DEFAULT '',
  estado VARCHAR(191) NOT NULL DEFAULT 'planificada' CHECK(estado IN('planificada', 'realizada', 'cancelada')),
  preparacion LONGTEXT NOT NULL DEFAULT '',
  minuta LONGTEXT NOT NULL DEFAULT '',
  resumen LONGTEXT NOT NULL DEFAULT '',
  creado_por VARCHAR(191) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ,
  serie_id VARCHAR(191),
  generada_para DATE,
  cerrada_en DATETIME,
  proxima_revision VARCHAR(191),
  unidad_id VARCHAR(191) REFERENCES unidades_operativas_cms(id)
);
CREATE TABLE IF NOT EXISTS decisiones_cms(
  id VARCHAR(191) PRIMARY KEY,
  reunion_id VARCHAR(191) NOT NULL REFERENCES reuniones_cms(id) ON DELETE CASCADE,
  titulo VARCHAR(191) NOT NULL,
  motivo LONGTEXT NOT NULL DEFAULT '',
  responsable_correo VARCHAR(191) REFERENCES usuarios(correo),
  estado VARCHAR(191) NOT NULL DEFAULT 'vigente' CHECK(estado IN('vigente', 'a_revisar', 'superada')),
  tarea_id VARCHAR(191) REFERENCES tareas_cms(id),
  creado_por VARCHAR(191) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX reuniones_cms_fecha ON reuniones_cms(estado, fecha_hora);
CREATE INDEX decisiones_cms_reunion ON decisiones_cms(reunion_id, estado);
CREATE INDEX decisiones_cms_responsable ON decisiones_cms(
  responsable_correo,
  estado
);
CREATE TABLE IF NOT EXISTS documentos_cms(
  id VARCHAR(191) PRIMARY KEY,
  titulo VARCHAR(191) NOT NULL,
  descripcion LONGTEXT NOT NULL DEFAULT '',
  tipo VARCHAR(191) NOT NULL DEFAULT 'enlace' CHECK(tipo IN('enlace', 'guia', 'acta', 'plantilla', 'politica')),
  url VARCHAR(2048) NOT NULL,
  sensibilidad VARCHAR(191) NOT NULL DEFAULT 'interno' CHECK(sensibilidad IN('compartido', 'interno', 'restringido')),
  equipo_id VARCHAR(191) REFERENCES equipos(id),
  proyecto_id VARCHAR(191) REFERENCES proyectos_cms(id),
  creado_por VARCHAR(191) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ,
  unidad_id VARCHAR(191) REFERENCES unidades_operativas_cms(id)
);
CREATE INDEX documentos_cms_contexto ON documentos_cms(
  proyecto_id,
  equipo_id,
  actualizado_en
);
CREATE TABLE IF NOT EXISTS eventos_cms(
  id VARCHAR(191) PRIMARY KEY,
  titulo VARCHAR(191) NOT NULL,
  descripcion LONGTEXT NOT NULL DEFAULT '',
  fecha_hora DATETIME NOT NULL,
  fecha_fin DATETIME,
  lugar VARCHAR(191) NOT NULL DEFAULT '',
  equipo_id VARCHAR(191) REFERENCES equipos(id),
  proyecto_id VARCHAR(191) REFERENCES proyectos_cms(id),
  responsable_correo VARCHAR(191) REFERENCES usuarios(correo),
  estado VARCHAR(191) NOT NULL DEFAULT 'planificado' CHECK(estado IN('planificado', 'realizado', 'cancelado')),
  creado_por VARCHAR(191) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ,
  tipo VARCHAR(191) NOT NULL DEFAULT 'actividad'
  CHECK(tipo IN('actividad', 'reunion', 'curso', 'publicacion', 'vencimiento', 'pago', 'renovacion', 'tramite', 'certificacion', 'asamblea')),
  serie_id VARCHAR(191),
  generada_para DATE,
  unidad_id VARCHAR(191) REFERENCES unidades_operativas_cms(id)
);
CREATE INDEX eventos_cms_fecha ON eventos_cms(estado, fecha_hora);
CREATE INDEX eventos_cms_contexto ON eventos_cms(
  equipo_id,
  proyecto_id,
  fecha_hora
);
CREATE INDEX tareas_cms_evento ON tareas_cms(evento_id, estado);
CREATE TABLE IF NOT EXISTS plantillas_tareas_cms(
  id VARCHAR(191) PRIMARY KEY,
  titulo VARCHAR(191) NOT NULL UNIQUE,
  descripcion LONGTEXT NOT NULL DEFAULT '',
  equipo_id VARCHAR(191) REFERENCES equipos(id),
  creado_por VARCHAR(191) NOT NULL REFERENCES usuarios(correo),
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS aplicaciones_plantilla_tareas_cms(
  id VARCHAR(191) PRIMARY KEY,
  plantilla_id VARCHAR(191) NOT NULL REFERENCES plantillas_tareas_cms(id),
  evento_id VARCHAR(191) NOT NULL REFERENCES eventos_cms(id),
  aplicado_por VARCHAR(191) NOT NULL REFERENCES usuarios(correo),
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(plantilla_id, evento_id)
);
CREATE INDEX aplicaciones_plantilla_evento ON aplicaciones_plantilla_tareas_cms(
  evento_id
);
CREATE TABLE IF NOT EXISTS proyecto_riesgos_cms(
  id VARCHAR(191) PRIMARY KEY,
  proyecto_id VARCHAR(191) NOT NULL REFERENCES proyectos_cms(id) ON DELETE CASCADE,
  titulo VARCHAR(191) NOT NULL,
  descripcion LONGTEXT NOT NULL DEFAULT '',
  nivel VARCHAR(191) NOT NULL DEFAULT 'medio' CHECK(nivel IN('bajo', 'medio', 'alto', 'critico')),
  estado VARCHAR(191) NOT NULL DEFAULT 'abierto' CHECK(estado IN('abierto', 'mitigado', 'aceptado')),
  responsable_correo VARCHAR(191) REFERENCES usuarios(correo),
  fecha_revision DATE,
  creado_por VARCHAR(191) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX proyecto_riesgos_cms_tablero
ON proyecto_riesgos_cms(
  estado,
  nivel,
  fecha_revision
);
CREATE INDEX proyecto_riesgos_cms_proyecto
ON proyecto_riesgos_cms(
  proyecto_id,
  estado,
  actualizado_en
);
CREATE TABLE IF NOT EXISTS proyecto_hitos_cms(
  id VARCHAR(191) PRIMARY KEY,
  proyecto_id VARCHAR(191) NOT NULL REFERENCES proyectos_cms(id) ON DELETE CASCADE,
  titulo VARCHAR(191) NOT NULL,
  descripcion LONGTEXT NOT NULL DEFAULT '',
  fecha_objetivo DATE,
  estado VARCHAR(191) NOT NULL DEFAULT 'pendiente' CHECK(estado IN('pendiente', 'en_marcha', 'completado', 'cancelado')),
  responsable_correo VARCHAR(191) REFERENCES usuarios(correo),
  creado_por VARCHAR(191) NOT NULL REFERENCES usuarios(correo),
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS proyecto_gastos_cms(
  id VARCHAR(191) PRIMARY KEY,
  proyecto_id VARCHAR(191) NOT NULL REFERENCES proyectos_cms(id) ON DELETE CASCADE,
  concepto VARCHAR(191) NOT NULL,
  monto DECIMAL(12,2) NOT NULL CHECK(monto >= 0),
  fecha DATE NOT NULL,
  notas LONGTEXT NOT NULL DEFAULT '',
  creado_por VARCHAR(191) NOT NULL REFERENCES usuarios(correo),
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX proyecto_hitos_cms_estado ON proyecto_hitos_cms(
  proyecto_id,
  estado,
  fecha_objetivo
);
CREATE INDEX proyecto_gastos_cms_fecha ON proyecto_gastos_cms(
  proyecto_id,
  fecha DESC
);
CREATE TABLE IF NOT EXISTS entradas_cms(
  id VARCHAR(191) PRIMARY KEY,
  tipo VARCHAR(191) NOT NULL CHECK(tipo IN('voluntariado', 'inscripcion', 'actividad', 'evento', 'pedido')),
  nombre VARCHAR(191) NOT NULL,
  contacto VARCHAR(191) NOT NULL DEFAULT '',
  detalle LONGTEXT NOT NULL DEFAULT '',
  estado VARCHAR(191) NOT NULL DEFAULT 'nueva' CHECK(estado IN('nueva', 'derivada', 'cerrada')),
  equipo_id VARCHAR(191) REFERENCES equipos(id),
  proyecto_id VARCHAR(191) REFERENCES proyectos_cms(id),
  tarea_id VARCHAR(191) REFERENCES tareas_cms(id),
  creado_por VARCHAR(191) NOT NULL REFERENCES usuarios(correo),
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ,
  formulario_id VARCHAR(191) REFERENCES formularios_cms(id),
  equipo_solicitante_id VARCHAR(191) REFERENCES equipos(id),
  prioridad VARCHAR(191) NOT NULL DEFAULT 'normal'
  CHECK(prioridad IN('baja', 'normal', 'alta', 'urgente')),
  objetivo LONGTEXT NOT NULL DEFAULT '',
  pasos LONGTEXT NOT NULL DEFAULT '',
  recursos LONGTEXT NOT NULL DEFAULT '',
  personas_necesarias LONGTEXT NOT NULL DEFAULT '',
  fecha_propuesta DATE,
  evento_id VARCHAR(191) REFERENCES eventos_cms(id),
  respuestas_json LONGTEXT NOT NULL DEFAULT '{}',
  destino_respuesta VARCHAR(191) NOT NULL DEFAULT 'tarea',
  revision_requerida INT NOT NULL DEFAULT 0 CHECK(revision_requerida IN(0, 1)),
  cumplida_en DATE,
  cumplida_por VARCHAR(191) REFERENCES usuarios(correo),
  cumplida_medio VARCHAR(191) NOT NULL DEFAULT '',
  cumplida_motivo LONGTEXT NOT NULL DEFAULT ''
);
CREATE INDEX entradas_cms_bandeja ON entradas_cms(estado, creado_en DESC);
CREATE INDEX entradas_cms_equipo ON entradas_cms(equipo_id, estado);
CREATE INDEX entradas_cms_formulario ON entradas_cms(
  formulario_id,
  creado_en DESC
);
CREATE TABLE IF NOT EXISTS limites_formularios_publicos_cms(
  formulario_id VARCHAR(191) NOT NULL REFERENCES formularios_cms(id),
  clave VARCHAR(191) NOT NULL,
  ventana VARCHAR(191) NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(formulario_id, clave, ventana)
);
CREATE TABLE IF NOT EXISTS tareas_dependencias_cms(
  tarea_id VARCHAR(191) NOT NULL REFERENCES tareas_cms(id) ON DELETE CASCADE,
  depende_de_id VARCHAR(191) NOT NULL REFERENCES tareas_cms(id) ON DELETE CASCADE,
  creado_por VARCHAR(191) NOT NULL REFERENCES usuarios(correo),
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(tarea_id, depende_de_id),
  CHECK(tarea_id != depende_de_id)
);
CREATE INDEX tareas_dependencias_predecesora ON tareas_dependencias_cms(
  depende_de_id
);
CREATE TABLE IF NOT EXISTS notificaciones_cms(
  id VARCHAR(191) PRIMARY KEY,
  usuario_correo VARCHAR(191) NOT NULL REFERENCES usuarios(correo),
  tipo VARCHAR(191) NOT NULL CHECK(tipo IN('asignacion_tarea', 'solicitud_recibida')),
  tarea_id VARCHAR(191) NOT NULL REFERENCES tareas_cms(id) ON DELETE CASCADE,
  titulo VARCHAR(191) NOT NULL,
  detalle LONGTEXT NOT NULL DEFAULT '',
  leida_en VARCHAR(191),
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(usuario_correo, tipo, tarea_id)
);
CREATE INDEX notificaciones_cms_bandeja
ON notificaciones_cms(
  usuario_correo,
  leida_en,
  creado_en DESC
);
CREATE TABLE IF NOT EXISTS tareas_recurrentes_cms(
  id VARCHAR(191) PRIMARY KEY,
  titulo VARCHAR(191) NOT NULL,
  descripcion LONGTEXT NOT NULL DEFAULT '',
  prioridad VARCHAR(191) NOT NULL DEFAULT 'normal' CHECK(prioridad IN('baja', 'normal', 'alta', 'urgente')),
  frecuencia VARCHAR(191) NOT NULL CHECK(frecuencia IN('semanal', 'mensual')),
  proxima_fecha DATE NOT NULL,
  equipo_id VARCHAR(191) REFERENCES equipos(id),
  proyecto_id VARCHAR(191) REFERENCES proyectos_cms(id),
  responsable_correo VARCHAR(191) REFERENCES usuarios(correo),
  activo INT NOT NULL DEFAULT 1 CHECK(activo IN(0, 1)),
  creado_por VARCHAR(191) NOT NULL REFERENCES usuarios(correo),
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX tareas_recurrentes_cms_proximas
ON tareas_recurrentes_cms(
  activo,
  proxima_fecha
);
CREATE INDEX entradas_cms_ruta_pedido
ON entradas_cms(
  equipo_solicitante_id,
  equipo_id,
  prioridad,
  estado
);
CREATE INDEX usuarios_perfil_acceso_activo
ON usuarios(perfil_acceso, activo);
CREATE TABLE IF NOT EXISTS alianzas_cms(
  id VARCHAR(191) PRIMARY KEY,
  nombre VARCHAR(191) NOT NULL,
  tipo VARCHAR(191) NOT NULL DEFAULT 'aliado'
  CHECK(tipo IN('aliado', 'patrocinador', 'institucion', 'proveedor', 'red')),
  descripcion LONGTEXT NOT NULL DEFAULT '',
  contacto_institucional VARCHAR(191) NOT NULL DEFAULT '',
  estado VARCHAR(191) NOT NULL DEFAULT 'activa'
  CHECK(estado IN('activa', 'en_pausa', 'finalizada')),
  equipo_id VARCHAR(191) REFERENCES equipos(id) ON DELETE SET NULL,
  proyecto_id VARCHAR(191) REFERENCES proyectos_cms(id) ON DELETE SET NULL,
  creado_por VARCHAR(191) NOT NULL REFERENCES usuarios(correo),
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX alianzas_cms_equipo_estado
ON alianzas_cms(equipo_id, estado);
CREATE INDEX alianzas_cms_proyecto_estado
ON alianzas_cms(proyecto_id, estado);
CREATE TABLE IF NOT EXISTS programas_cms(
  id VARCHAR(191) PRIMARY KEY,
  nombre VARCHAR(191) NOT NULL UNIQUE,
  descripcion LONGTEXT NOT NULL DEFAULT '',
  estado VARCHAR(191) NOT NULL DEFAULT 'activo'
  CHECK(estado IN('borrador', 'activo', 'en_pausa', 'cerrado')),
  equipo_id VARCHAR(191) REFERENCES equipos(id) ON DELETE SET NULL,
  creado_por VARCHAR(191) NOT NULL REFERENCES usuarios(correo),
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX programas_cms_equipo_estado
ON programas_cms(equipo_id, estado);
CREATE INDEX proyectos_cms_programa_estado
ON proyectos_cms(
  programa_id,
  estado
);
CREATE INDEX equipos_categoria_activo
ON equipos(categoria, activo);
CREATE TABLE IF NOT EXISTS formularios_cms(
  id VARCHAR(191) PRIMARY KEY,
  titulo VARCHAR(191) NOT NULL,
  descripcion LONGTEXT NOT NULL DEFAULT '',
  tipo VARCHAR(191) NOT NULL CHECK(tipo IN('voluntariado', 'inscripcion', 'actividad', 'evento', 'pedido', 'propuesta')),
  visibilidad VARCHAR(191) NOT NULL DEFAULT 'interna' CHECK(visibilidad IN('interna', 'publica')),
  estado VARCHAR(191) NOT NULL DEFAULT 'activa' CHECK(estado IN('activa', 'cerrada')),
  equipo_id VARCHAR(191) REFERENCES equipos(id),
  proyecto_id VARCHAR(191) REFERENCES proyectos_cms(id),
  creado_por VARCHAR(191) NOT NULL REFERENCES usuarios(correo),
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  equipo_solicitante_id VARCHAR(191) REFERENCES equipos(id),
  prioridad VARCHAR(191) NOT NULL DEFAULT 'normal' CHECK(prioridad IN('baja', 'normal', 'alta', 'urgente'))
  ,
  campos_json LONGTEXT NOT NULL DEFAULT '[]', finalidad VARCHAR(500) NOT NULL DEFAULT 'Responder la consulta y realizar su seguimiento.', responsable_datos VARCHAR(180) NOT NULL DEFAULT 'Aletea', conservacion_meses INT NOT NULL DEFAULT 12 CHECK(conservacion_meses IN(6, 12, 24)), requiere_consentimiento INT NOT NULL DEFAULT 1 CHECK(requiere_consentimiento IN(0, 1)), destino_respuesta VARCHAR(40) NOT NULL DEFAULT 'tarea'
CHECK(destino_respuesta IN('tarea', 'solicitud', 'actividad', 'alta_persona', 'contacto', 'archivo')), unidad_id VARCHAR(191) REFERENCES unidades_operativas_cms(id)
);
CREATE INDEX formularios_cms_visibilidad ON formularios_cms(
  visibilidad,
  estado,
  actualizado_en DESC
);
CREATE TABLE IF NOT EXISTS plantilla_tareas_items_cms(
  id VARCHAR(191) PRIMARY KEY,
  plantilla_id VARCHAR(191) NOT NULL REFERENCES plantillas_tareas_cms(id) ON DELETE CASCADE,
  titulo VARCHAR(191) NOT NULL,
  descripcion LONGTEXT NOT NULL DEFAULT '',
  prioridad VARCHAR(191) NOT NULL DEFAULT 'normal' CHECK(prioridad IN('baja', 'normal', 'alta', 'urgente')),
  dias_antes INT NOT NULL DEFAULT 0 CHECK(dias_antes BETWEEN -365 AND 365),
  orden INT NOT NULL DEFAULT 0
);
CREATE INDEX plantilla_tareas_items_plantilla ON plantilla_tareas_items_cms(
  plantilla_id,
  orden
);
CREATE TABLE IF NOT EXISTS comunicados_cms(
  id VARCHAR(191) PRIMARY KEY,
  titulo VARCHAR(191) NOT NULL,
  detalle LONGTEXT NOT NULL DEFAULT '',
  prioridad VARCHAR(191) NOT NULL DEFAULT 'normal' CHECK(prioridad IN('normal', 'urgente')),
  equipo_id VARCHAR(191) REFERENCES equipos(id) ON DELETE SET NULL,
  estado VARCHAR(191) NOT NULL DEFAULT 'activo' CHECK(estado IN('activo', 'cerrado')),
  vence_el DATE,
  creado_por VARCHAR(191) NOT NULL REFERENCES usuarios(correo),
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX comunicados_cms_visibilidad ON comunicados_cms(
  estado,
  equipo_id,
  creado_en DESC
);
CREATE INDEX eventos_cms_tipo_fecha ON eventos_cms(tipo, estado, fecha_hora);
CREATE INDEX entradas_cms_fecha_propuesta ON entradas_cms(
  fecha_propuesta,
  estado
);
CREATE INDEX entradas_cms_evento ON entradas_cms(evento_id);
CREATE UNIQUE INDEX tareas_cms_recurrencia_periodo_unico
ON tareas_cms(
  recurrencia_id,
  generada_para
);
CREATE INDEX tareas_cms_recurrencia
ON tareas_cms(
  recurrencia_id,
  generada_para
);
CREATE TABLE IF NOT EXISTS revisiones_semanales_cms(
  id VARCHAR(191) PRIMARY KEY,
  semana_inicio DATE NOT NULL UNIQUE,
  nota LONGTEXT NOT NULL DEFAULT '',
  revisado_por VARCHAR(191) NOT NULL REFERENCES usuarios(correo),
  revisado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX revisiones_semanales_fecha ON revisiones_semanales_cms(
  semana_inicio DESC
);
CREATE TABLE IF NOT EXISTS automatizaciones_ejecuciones_cms(
  id VARCHAR(191) PRIMARY KEY,
  recurrencia_id VARCHAR(191) NOT NULL REFERENCES tareas_recurrentes_cms(id),
  periodo VARCHAR(191) NOT NULL,
  estado VARCHAR(191) NOT NULL CHECK(estado IN('procesando', 'completada', 'fallida')),
  intentos INT NOT NULL DEFAULT 1,
  error LONGTEXT,
  tarea_id VARCHAR(191) REFERENCES tareas_cms(id),
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(recurrencia_id, periodo)
);
CREATE INDEX automatizaciones_ejecuciones_estado_fecha
ON automatizaciones_ejecuciones_cms(
  estado,
  actualizado_en DESC
);
CREATE TABLE IF NOT EXISTS alertas_pospuestas_cms(
  id VARCHAR(191) PRIMARY KEY,
  usuario_correo VARCHAR(191) NOT NULL REFERENCES usuarios(correo),
  clave VARCHAR(191) NOT NULL,
  postergada_hasta DATE NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(usuario_correo, clave)
);
CREATE INDEX alertas_pospuestas_usuario_fecha
ON alertas_pospuestas_cms(
  usuario_correo,
  postergada_hasta
);
CREATE INDEX usuarios_nivel_datos_personales_activo
ON usuarios(
  nivel_datos_personales,
  activo
);
CREATE TABLE IF NOT EXISTS capacidad_trabajo_cms(
  usuario_correo VARCHAR(191) PRIMARY KEY REFERENCES usuarios(correo) ON DELETE CASCADE,
  horas_semanales DECIMAL(12,2) NOT NULL CHECK(horas_semanales >= 0 AND horas_semanales <= 80),
  nota LONGTEXT NOT NULL DEFAULT '',
  actualizado_por VARCHAR(191) NOT NULL REFERENCES usuarios(correo),
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX capacidad_trabajo_actualizada
ON capacidad_trabajo_cms(
  actualizado_en DESC
);
CREATE TABLE IF NOT EXISTS intentos_ingreso_cms(
  clave VARCHAR(191) PRIMARY KEY,
  tipo VARCHAR(191) NOT NULL CHECK(tipo IN('usuario', 'direccion')),
  intentos INT NOT NULL DEFAULT 0 CHECK(intentos >= 0),
  ventana_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bloqueado_hasta DATETIME,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX intentos_ingreso_cms_limpieza
ON intentos_ingreso_cms(
  actualizado_en
);
CREATE UNIQUE INDEX equipos_clave_unica
ON equipos(
  clave
);
CREATE UNIQUE INDEX eventos_cms_serie_fecha_unica
ON eventos_cms(
  serie_id,
  generada_para
);
CREATE UNIQUE INDEX reuniones_cms_serie_fecha_unica
ON reuniones_cms(
  serie_id,
  generada_para
);
CREATE TABLE IF NOT EXISTS medios_pagina_web(
  id VARCHAR(191) PRIMARY KEY,
  nombre VARCHAR(191) NOT NULL,
  tipo VARCHAR(191) NOT NULL,
  ancho INT NOT NULL,
  alto INT NOT NULL,
  bytes INT NOT NULL,
  datos MEDIUMBLOB NOT NULL,
  texto_alternativo VARCHAR(191) NOT NULL DEFAULT '',
  creado_por VARCHAR(191) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX medios_pagina_web_creado_en ON medios_pagina_web(creado_en);
CREATE TABLE IF NOT EXISTS solicitudes_privacidad_cms(
  id VARCHAR(191) PRIMARY KEY,
  tipo VARCHAR(191) NOT NULL CHECK(tipo IN('copia', 'eliminacion')),
  solicitante_nombre VARCHAR(191) NOT NULL,
  contacto VARCHAR(191) NOT NULL,
  canal VARCHAR(191) NOT NULL DEFAULT 'correo' CHECK(canal IN('correo', 'telefono', 'presencial', 'formulario', 'otro')),
  alcance LONGTEXT NOT NULL,
  estado VARCHAR(191) NOT NULL DEFAULT 'recibida' CHECK(estado IN('recibida', 'identidad_verificada', 'en_revision', 'lista_para_entrega', 'lista_para_decision', 'cerrada', 'rechazada')),
  responsable_correo VARCHAR(191),
  fecha_objetivo DATE,
  nota_revision LONGTEXT NOT NULL DEFAULT '',
  constancia LONGTEXT NOT NULL DEFAULT '',
  identidad_verificada_en DATETIME,
  identidad_verificada_por VARCHAR(191),
  cerrada_en DATETIME,
  creado_por VARCHAR(191) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(responsable_correo) REFERENCES usuarios(correo),
  FOREIGN KEY(identidad_verificada_por) REFERENCES usuarios(correo),
  FOREIGN KEY(creado_por) REFERENCES usuarios(correo)
);
CREATE INDEX idx_solicitudes_privacidad_estado ON solicitudes_privacidad_cms(
  estado,
  actualizado_en
);
CREATE INDEX idx_solicitudes_privacidad_responsable ON solicitudes_privacidad_cms(
  responsable_correo,
  estado
);
CREATE TABLE IF NOT EXISTS metricas_web_diarias(
  fecha DATE PRIMARY KEY,
  visitas INT NOT NULL DEFAULT 0 CHECK(visitas >= 0),
  paginas_vistas INT NOT NULL DEFAULT 0 CHECK(paginas_vistas >= 0),
  acciones INT NOT NULL DEFAULT 0 CHECK(acciones >= 0),
  proveedor VARCHAR(191) NOT NULL DEFAULT 'cloudflare-web-analytics' CHECK(proveedor = 'cloudflare-web-analytics'),
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS metricas_web_paginas_diarias(
  fecha DATE NOT NULL,
  ruta VARCHAR(191) NOT NULL CHECK(length(ruta) BETWEEN 1 AND 160 AND substr(ruta, 1, 1) = '/' AND instr(ruta, '?') = 0 AND instr(ruta, '#') = 0),
  vistas INT NOT NULL DEFAULT 0 CHECK(vistas >= 0),
  PRIMARY KEY(fecha, ruta),
  FOREIGN KEY(fecha) REFERENCES metricas_web_diarias(fecha) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS metricas_web_acciones_diarias(
  fecha DATE NOT NULL,
  accion VARCHAR(191) NOT NULL CHECK(length(accion) BETWEEN 1 AND 80),
  cantidad INT NOT NULL DEFAULT 0 CHECK(cantidad >= 0),
  PRIMARY KEY(fecha, accion),
  FOREIGN KEY(fecha) REFERENCES metricas_web_diarias(fecha) ON DELETE CASCADE
);
CREATE INDEX metricas_web_paginas_fecha ON metricas_web_paginas_diarias(
  fecha,
  vistas
);
CREATE INDEX metricas_web_acciones_fecha ON metricas_web_acciones_diarias(
  fecha,
  cantidad
);
CREATE TABLE IF NOT EXISTS cuentas_fsb(
  id VARCHAR(191) PRIMARY KEY,
  persona_id VARCHAR(191) UNIQUE,
  nombre VARCHAR(191) NOT NULL,
  grupo INT CHECK(grupo IN(1, 2)),
  condicion VARCHAR(191) NOT NULL DEFAULT 'regular' CHECK(condicion IN('regular', 'beca', 'voluntariado', 'baja')),
  beca_porcentaje DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK(beca_porcentaje >= 0 AND beca_porcentaje <= 100),
  observaciones LONGTEXT NOT NULL DEFAULT '',
  activa INT NOT NULL DEFAULT 1 CHECK(activa IN(0, 1)),
  creado_por VARCHAR(191) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS movimientos_fsb(
  id VARCHAR(191) PRIMARY KEY,
  cuenta_id VARCHAR(191) NOT NULL REFERENCES cuentas_fsb(id) ON DELETE CASCADE,
  tipo VARCHAR(191) NOT NULL CHECK(tipo IN('cargo', 'pago', 'recargo', 'ajuste_cargo', 'ajuste_credito', 'saldo_inicial')),
  concepto VARCHAR(191) NOT NULL,
  periodo VARCHAR(191),
  fecha DATE NOT NULL,
  vencimiento DATE,
  importe_centavos INT NOT NULL CHECK(importe_centavos != 0),
  medio_pago VARCHAR(191) NOT NULL DEFAULT '',
  comprobante VARCHAR(191) NOT NULL DEFAULT '',
  notas LONGTEXT NOT NULL DEFAULT '',
  clave_operacion VARCHAR(191) UNIQUE,
  creado_por VARCHAR(191) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  anulado_en DATETIME,
  anulado_por VARCHAR(191),
  motivo_anulacion LONGTEXT NOT NULL DEFAULT ''
);
CREATE INDEX cuentas_fsb_estado ON cuentas_fsb(activa, grupo, nombre);
CREATE INDEX movimientos_fsb_cuenta_fecha ON movimientos_fsb(
  cuenta_id,
  fecha,
  creado_en
);
CREATE INDEX movimientos_fsb_vencimiento ON movimientos_fsb(
  vencimiento,
  anulado_en
);
CREATE TABLE IF NOT EXISTS compromisos_pago_fsb(
  id VARCHAR(191) PRIMARY KEY,
  cuenta_id VARCHAR(191) NOT NULL REFERENCES cuentas_fsb(id) ON DELETE CASCADE,
  importe_centavos INT,
  fecha_acuerdo DATE NOT NULL,
  fecha_prevista DATE NOT NULL,
  estado VARCHAR(191) NOT NULL DEFAULT 'vigente' CHECK(estado IN('vigente', 'cumplido', 'cancelado')),
  nota LONGTEXT NOT NULL DEFAULT '',
  creado_por VARCHAR(191) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cerrado_por VARCHAR(191),
  cerrado_en VARCHAR(191),
  motivo_cierre LONGTEXT NOT NULL DEFAULT '',
  CHECK(importe_centavos IS NULL OR importe_centavos > 0)
);
CREATE INDEX compromisos_pago_fsb_cuenta ON compromisos_pago_fsb(
  cuenta_id,
  estado,
  fecha_prevista
);
CREATE INDEX tareas_cms_seguimiento_personal
ON tareas_cms(
  seguimiento_personal_por,
  seguimiento_personal,
  estado,
  fecha_seguimiento
);
CREATE TABLE IF NOT EXISTS historial_entradas_cms(
  id VARCHAR(191) PRIMARY KEY,
  entrada_id VARCHAR(191) NOT NULL REFERENCES entradas_cms(id),
  accion VARCHAR(191) NOT NULL CHECK(accion IN('cumplida', 'reabierta')),
  fecha DATE NOT NULL,
  medio VARCHAR(191) NOT NULL DEFAULT '',
  motivo LONGTEXT NOT NULL,
  actor_correo VARCHAR(191) NOT NULL REFERENCES usuarios(correo),
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX entradas_cms_cumplidas
ON entradas_cms(estado, cumplida_en DESC);
CREATE INDEX historial_entradas_cms_entrada
ON historial_entradas_cms(
  entrada_id,
  creado_en DESC
);
CREATE TABLE IF NOT EXISTS unidades_operativas_cms(
  id VARCHAR(191) PRIMARY KEY,
  clave VARCHAR(191) NOT NULL UNIQUE,
  nombre VARCHAR(191) NOT NULL,
  sigla VARCHAR(191) NOT NULL DEFAULT '',
  descripcion LONGTEXT NOT NULL DEFAULT '',
  tipo VARCHAR(191) NOT NULL DEFAULT 'programa'
  CHECK(tipo IN('programa', 'formacion', 'canal', 'proceso')),
  equipo_id VARCHAR(191) NOT NULL REFERENCES equipos(id),
  unidad_padre_id VARCHAR(191) REFERENCES unidades_operativas_cms(id) ON DELETE SET NULL,
  color VARCHAR(191) NOT NULL DEFAULT '#6d3087',
  orden INT NOT NULL DEFAULT 0,
  estado VARCHAR(191) NOT NULL DEFAULT 'activa'
  CHECK(estado IN('borrador', 'activa', 'en_pausa', 'archivada')),
  creado_por VARCHAR(191) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS unidades_vistas_equipo_cms(
  unidad_id VARCHAR(191) NOT NULL REFERENCES unidades_operativas_cms(id) ON DELETE CASCADE,
  equipo_id VARCHAR(191) NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  enfoque VARCHAR(191) NOT NULL DEFAULT 'operativo'
  CHECK(enfoque IN('operativo', 'financiero', 'comunicacion')),
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(unidad_id, equipo_id, enfoque)
);
CREATE INDEX unidades_operativas_equipo_orden
ON unidades_operativas_cms(
  equipo_id,
  estado,
  orden
);
CREATE INDEX unidades_operativas_padre_orden
ON unidades_operativas_cms(
  unidad_padre_id,
  estado,
  orden
);
CREATE INDEX usuarios_acceso_hasta_activo
ON usuarios(activo, acceso_hasta);

DROP TRIGGER IF EXISTS tareas_cms_registrar_asignacion_insert;
CREATE TRIGGER tareas_cms_registrar_asignacion_insert BEFORE INSERT ON tareas_cms FOR EACH ROW SET NEW.asignado_en = IF(NEW.responsable_correo IS NULL, NULL, COALESCE(NEW.asignado_en, CURRENT_TIMESTAMP));
DROP TRIGGER IF EXISTS tareas_cms_registrar_asignacion_update;
CREATE TRIGGER tareas_cms_registrar_asignacion_update BEFORE UPDATE ON tareas_cms FOR EACH ROW SET NEW.asignado_en = IF(NEW.responsable_correo <=> OLD.responsable_correo, NEW.asignado_en, IF(NEW.responsable_correo IS NULL, NULL, CURRENT_TIMESTAMP));

SET FOREIGN_KEY_CHECKS = 1;
