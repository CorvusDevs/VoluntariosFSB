-- Reglas simples para trabajo operativo repetido. La siguiente tarea se crea
-- deliberadamente con una acción visible, sin procesos automáticos externos.
CREATE TABLE IF NOT EXISTS tareas_recurrentes_cms (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  prioridad TEXT NOT NULL DEFAULT 'normal' CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente')),
  frecuencia TEXT NOT NULL CHECK (frecuencia IN ('semanal', 'mensual')),
  proxima_fecha TEXT NOT NULL,
  equipo_id TEXT REFERENCES equipos(id),
  proyecto_id TEXT REFERENCES proyectos_cms(id),
  responsable_correo TEXT REFERENCES usuarios(correo),
  activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
  creado_por TEXT NOT NULL REFERENCES usuarios(correo),
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS tareas_recurrentes_cms_proximas
  ON tareas_recurrentes_cms(activo, proxima_fecha);
