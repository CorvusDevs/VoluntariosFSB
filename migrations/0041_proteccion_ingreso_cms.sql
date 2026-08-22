CREATE TABLE IF NOT EXISTS intentos_ingreso_cms (
  clave TEXT PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('usuario', 'direccion')),
  intentos INTEGER NOT NULL DEFAULT 0 CHECK (intentos >= 0),
  ventana_inicio TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bloqueado_hasta TEXT,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS intentos_ingreso_cms_limpieza
  ON intentos_ingreso_cms(actualizado_en);
