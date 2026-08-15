CREATE TABLE IF NOT EXISTS usuarios (
  correo TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'coordinacion')),
  activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documentos (
  ruta TEXT PRIMARY KEY,
  contenido TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  actualizado_por TEXT NOT NULL,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS actividad (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  correo TEXT NOT NULL,
  accion TEXT NOT NULL,
  recurso TEXT NOT NULL,
  detalle TEXT,
  cuando TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS actividad_cuando ON actividad(cuando DESC);
CREATE INDEX IF NOT EXISTS documentos_ruta ON documentos(ruta);
