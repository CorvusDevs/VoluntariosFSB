-- Formularios configurables. Una respuesta nunca crea perfiles de personas:
-- primero ingresa a la bandeja y queda vinculada a una tarea de seguimiento.
CREATE TABLE IF NOT EXISTS formularios_cms (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL CHECK (tipo IN ('voluntariado', 'inscripcion', 'actividad', 'evento', 'pedido')),
  visibilidad TEXT NOT NULL DEFAULT 'interna' CHECK (visibilidad IN ('interna', 'publica')),
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'cerrada')),
  equipo_id TEXT REFERENCES equipos(id),
  proyecto_id TEXT REFERENCES proyectos_cms(id),
  creado_por TEXT NOT NULL REFERENCES usuarios(correo),
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE entradas_cms ADD COLUMN formulario_id TEXT REFERENCES formularios_cms(id);

CREATE INDEX IF NOT EXISTS formularios_cms_visibilidad ON formularios_cms(visibilidad, estado, actualizado_en DESC);
CREATE INDEX IF NOT EXISTS entradas_cms_formulario ON entradas_cms(formulario_id, creado_en DESC);

-- Límite acotado por formulario y ventana de diez minutos. Solo se guarda una
-- clave derivada, nunca una dirección IP legible.
CREATE TABLE IF NOT EXISTS limites_formularios_publicos_cms (
  formulario_id TEXT NOT NULL REFERENCES formularios_cms(id),
  clave TEXT NOT NULL,
  ventana TEXT NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (formulario_id, clave, ventana)
);
