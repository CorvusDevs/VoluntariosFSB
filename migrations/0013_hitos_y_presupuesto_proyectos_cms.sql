-- Seguimiento operativo y financiero de proyectos. Los gastos quedan como
-- registros inmutables para conservar el historial de ejecución del presupuesto.
CREATE TABLE IF NOT EXISTS proyecto_hitos_cms (
  id TEXT PRIMARY KEY,
  proyecto_id TEXT NOT NULL REFERENCES proyectos_cms(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  fecha_objetivo TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_marcha', 'completado', 'cancelado')),
  responsable_correo TEXT REFERENCES usuarios(correo),
  creado_por TEXT NOT NULL REFERENCES usuarios(correo),
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS proyecto_gastos_cms (
  id TEXT PRIMARY KEY,
  proyecto_id TEXT NOT NULL REFERENCES proyectos_cms(id) ON DELETE CASCADE,
  concepto TEXT NOT NULL,
  monto REAL NOT NULL CHECK (monto >= 0),
  fecha TEXT NOT NULL,
  notas TEXT NOT NULL DEFAULT '',
  creado_por TEXT NOT NULL REFERENCES usuarios(correo),
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS proyecto_hitos_cms_estado ON proyecto_hitos_cms(proyecto_id, estado, fecha_objetivo);
CREATE INDEX IF NOT EXISTS proyecto_gastos_cms_fecha ON proyecto_gastos_cms(proyecto_id, fecha DESC);
