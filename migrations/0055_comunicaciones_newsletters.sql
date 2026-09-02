CREATE TABLE IF NOT EXISTS contactos_comunicacion (
  id TEXT PRIMARY KEY,
  correo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL DEFAULT '',
  idioma TEXT NOT NULL DEFAULT 'es',
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'activo', 'baja', 'rebotado', 'bloqueado')),
  fuente_ultima TEXT NOT NULL DEFAULT '',
  token_baja TEXT NOT NULL UNIQUE,
  confirmado_en TEXT,
  baja_en TEXT,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consentimientos_comunicacion (
  id TEXT PRIMARY KEY,
  contacto_id TEXT NOT NULL REFERENCES contactos_comunicacion(id) ON DELETE CASCADE,
  finalidad TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptado', 'revocado', 'vencido')),
  fuente TEXT NOT NULL,
  formulario_id TEXT REFERENCES formularios_cms(id) ON DELETE SET NULL,
  entrada_id TEXT REFERENCES entradas_cms(id) ON DELETE SET NULL,
  texto_version TEXT NOT NULL,
  texto_consentimiento TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  solicitado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmado_en TEXT,
  revocado_en TEXT
);

CREATE TABLE IF NOT EXISTS preferencias_comunicacion (
  contacto_id TEXT NOT NULL REFERENCES contactos_comunicacion(id) ON DELETE CASCADE,
  tema TEXT NOT NULL,
  habilitada INTEGER NOT NULL DEFAULT 1 CHECK (habilitada IN (0, 1)),
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (contacto_id, tema)
);

CREATE TABLE IF NOT EXISTS supresiones_comunicacion (
  correo TEXT PRIMARY KEY,
  motivo TEXT NOT NULL,
  origen TEXT NOT NULL DEFAULT 'gestor',
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campanas_comunicacion (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  asunto TEXT NOT NULL,
  contenido_texto TEXT NOT NULL,
  contenido_html TEXT NOT NULL DEFAULT '',
  temas_json TEXT NOT NULL DEFAULT '["novedades"]',
  estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'revision', 'aprobada', 'programada', 'enviada', 'cancelada')),
  programada_para TEXT,
  creado_por TEXT NOT NULL REFERENCES usuarios(correo),
  aprobado_por TEXT REFERENCES usuarios(correo),
  aprobado_en TEXT,
  enviado_en TEXT,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cola_correos (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('confirmacion', 'campana', 'sistema')),
  contacto_id TEXT REFERENCES contactos_comunicacion(id) ON DELETE SET NULL,
  campana_id TEXT REFERENCES campanas_comunicacion(id) ON DELETE SET NULL,
  destinatario TEXT NOT NULL,
  asunto TEXT NOT NULL,
  contenido_texto TEXT NOT NULL,
  contenido_html TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'procesando', 'enviado', 'fallido', 'suprimido')),
  clave_idempotencia TEXT NOT NULL UNIQUE,
  intentos INTEGER NOT NULL DEFAULT 0,
  proximo_intento TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  proveedor_id TEXT,
  ultimo_error TEXT NOT NULL DEFAULT '',
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS eventos_correo (
  id TEXT PRIMARY KEY,
  correo_id TEXT REFERENCES cola_correos(id) ON DELETE SET NULL,
  proveedor TEXT NOT NULL DEFAULT 'hosting',
  tipo TEXT NOT NULL,
  detalle TEXT NOT NULL DEFAULT '',
  ocurrido_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS contactos_comunicacion_estado ON contactos_comunicacion(estado, actualizado_en);
CREATE INDEX IF NOT EXISTS consentimientos_comunicacion_contacto ON consentimientos_comunicacion(contacto_id, solicitado_en);
CREATE INDEX IF NOT EXISTS preferencias_comunicacion_tema ON preferencias_comunicacion(tema, habilitada);
CREATE INDEX IF NOT EXISTS campanas_comunicacion_estado ON campanas_comunicacion(estado, programada_para);
CREATE INDEX IF NOT EXISTS cola_correos_pendientes ON cola_correos(estado, proximo_intento);
CREATE INDEX IF NOT EXISTS eventos_correo_correo ON eventos_correo(correo_id, ocurrido_en);
