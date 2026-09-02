-- Capacidades operativas separadas de los permisos de acceso a módulos.
-- Sin una política explícita, solo Administración puede crear tareas.
CREATE TABLE IF NOT EXISTS permisos_capacidades_cms (
  id TEXT PRIMARY KEY,
  capacidad TEXT NOT NULL CHECK (capacidad IN ('crear_tareas')),
  alcance_tipo TEXT NOT NULL CHECK (alcance_tipo IN ('perfil', 'equipo', 'usuario')),
  alcance_id TEXT NOT NULL,
  efecto TEXT NOT NULL CHECK (efecto IN ('permitir', 'bloquear')),
  creado_por TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (capacidad, alcance_tipo, alcance_id)
);

CREATE INDEX IF NOT EXISTS permisos_capacidades_busqueda
  ON permisos_capacidades_cms (capacidad, alcance_tipo, alcance_id);
