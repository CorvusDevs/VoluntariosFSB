-- Bandeja de entradas institucionales. Estas entradas son internas: permiten
-- registrar formularios recibidos y derivarlos a una tarea trazable sin
-- duplicar perfiles personales ni datos sensibles.
CREATE TABLE IF NOT EXISTS entradas_cms (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('voluntariado', 'inscripcion', 'actividad', 'evento', 'pedido')),
  nombre TEXT NOT NULL,
  contacto TEXT NOT NULL DEFAULT '',
  detalle TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'nueva' CHECK (estado IN ('nueva', 'derivada', 'cerrada')),
  equipo_id TEXT REFERENCES equipos(id),
  proyecto_id TEXT REFERENCES proyectos_cms(id),
  tarea_id TEXT REFERENCES tareas_cms(id),
  creado_por TEXT NOT NULL REFERENCES usuarios(correo),
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS entradas_cms_bandeja ON entradas_cms(estado, creado_en DESC);
CREATE INDEX IF NOT EXISTS entradas_cms_equipo ON entradas_cms(equipo_id, estado);
