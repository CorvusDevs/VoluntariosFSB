-- Reuniones y decisiones institucionales. La agenda puede avisar de una
-- reunión, pero la preparación, minuta y los acuerdos quedan trazables aquí.

CREATE TABLE IF NOT EXISTS reuniones_cms (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  objetivo TEXT NOT NULL DEFAULT '',
  equipo_id TEXT REFERENCES equipos(id),
  proyecto_id TEXT REFERENCES proyectos_cms(id),
  fecha_hora TEXT NOT NULL,
  lugar TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'planificada' CHECK (estado IN ('planificada', 'realizada', 'cancelada')),
  preparacion TEXT NOT NULL DEFAULT '',
  minuta TEXT NOT NULL DEFAULT '',
  resumen TEXT NOT NULL DEFAULT '',
  creado_por TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS decisiones_cms (
  id TEXT PRIMARY KEY,
  reunion_id TEXT NOT NULL REFERENCES reuniones_cms(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  motivo TEXT NOT NULL DEFAULT '',
  responsable_correo TEXT REFERENCES usuarios(correo),
  estado TEXT NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente', 'a_revisar', 'superada')),
  tarea_id TEXT REFERENCES tareas_cms(id),
  creado_por TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS reuniones_cms_fecha ON reuniones_cms(estado, fecha_hora);
CREATE INDEX IF NOT EXISTS decisiones_cms_reunion ON decisiones_cms(reunion_id, estado);
CREATE INDEX IF NOT EXISTS decisiones_cms_responsable ON decisiones_cms(responsable_correo, estado);
