-- Seguimiento administrativo de solicitudes sobre datos personales.
-- No ejecuta exportaciones ni eliminaciones: conserva revisión, responsable y constancia.
CREATE TABLE solicitudes_privacidad_cms (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('copia', 'eliminacion')),
  solicitante_nombre TEXT NOT NULL,
  contacto TEXT NOT NULL,
  canal TEXT NOT NULL DEFAULT 'correo' CHECK (canal IN ('correo', 'telefono', 'presencial', 'formulario', 'otro')),
  alcance TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'recibida' CHECK (estado IN ('recibida', 'identidad_verificada', 'en_revision', 'lista_para_entrega', 'lista_para_decision', 'cerrada', 'rechazada')),
  responsable_correo TEXT,
  fecha_objetivo TEXT,
  nota_revision TEXT NOT NULL DEFAULT '',
  constancia TEXT NOT NULL DEFAULT '',
  identidad_verificada_en TEXT,
  identidad_verificada_por TEXT,
  cerrada_en TEXT,
  creado_por TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (responsable_correo) REFERENCES usuarios(correo),
  FOREIGN KEY (identidad_verificada_por) REFERENCES usuarios(correo),
  FOREIGN KEY (creado_por) REFERENCES usuarios(correo)
);

CREATE INDEX idx_solicitudes_privacidad_estado ON solicitudes_privacidad_cms(estado, actualizado_en);
CREATE INDEX idx_solicitudes_privacidad_responsable ON solicitudes_privacidad_cms(responsable_correo, estado);
