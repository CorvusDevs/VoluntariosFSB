-- Núcleo institucional del CMS de Aletea. Estas tablas no reemplazan el
-- roster ni las planillas existentes: los enlazan gradualmente a equipos,
-- tareas y proyectos compartidos.

CREATE TABLE IF NOT EXISTS equipos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#6d3087',
  activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
  creado_por TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS responsabilidades_equipo (
  id TEXT PRIMARY KEY,
  equipo_id TEXT NOT NULL REFERENCES equipos(id),
  usuario_correo TEXT NOT NULL REFERENCES usuarios(correo),
  tipo TEXT NOT NULL CHECK (tipo IN ('coordinacion', 'integrante', 'referente', 'sustitucion')),
  puede_decidir TEXT NOT NULL DEFAULT '',
  debe_escalar TEXT NOT NULL DEFAULT '',
  activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
  creado_por TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(equipo_id, usuario_correo, tipo)
);

CREATE TABLE IF NOT EXISTS proyectos_cms (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  objetivo TEXT NOT NULL DEFAULT '',
  equipo_id TEXT REFERENCES equipos(id),
  responsable_correo TEXT REFERENCES usuarios(correo),
  estado TEXT NOT NULL DEFAULT 'en_marcha' CHECK (estado IN ('borrador', 'en_marcha', 'en_pausa', 'cerrado')),
  prioridad TEXT NOT NULL DEFAULT 'normal' CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente')),
  fecha_inicio TEXT,
  fecha_fin TEXT,
  presupuesto REAL,
  notas TEXT NOT NULL DEFAULT '',
  creado_por TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tareas_cms (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'tarea' CHECK (tipo IN ('tarea', 'directriz', 'solicitud', 'seguimiento', 'nota')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_marcha', 'esperando_respuesta', 'bloqueada', 'completada', 'cancelada')),
  prioridad TEXT NOT NULL DEFAULT 'normal' CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente')),
  equipo_id TEXT REFERENCES equipos(id),
  proyecto_id TEXT REFERENCES proyectos_cms(id),
  responsable_correo TEXT REFERENCES usuarios(correo),
  solicitante_correo TEXT REFERENCES usuarios(correo),
  fecha_limite TEXT,
  fecha_seguimiento TEXT,
  creado_por TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completado_en TEXT
);

CREATE TABLE IF NOT EXISTS comentarios_tarea_cms (
  id TEXT PRIMARY KEY,
  tarea_id TEXT NOT NULL REFERENCES tareas_cms(id) ON DELETE CASCADE,
  contenido TEXT NOT NULL,
  creado_por TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS responsabilidades_equipo_usuario ON responsabilidades_equipo(usuario_correo, activo);
CREATE INDEX IF NOT EXISTS tareas_cms_tablero ON tareas_cms(estado, fecha_limite, prioridad);
CREATE INDEX IF NOT EXISTS tareas_cms_equipo ON tareas_cms(equipo_id, estado);
CREATE INDEX IF NOT EXISTS tareas_cms_responsable ON tareas_cms(responsable_correo, estado);
CREATE INDEX IF NOT EXISTS proyectos_cms_estado ON proyectos_cms(estado, fecha_fin);
