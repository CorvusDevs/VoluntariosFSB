CREATE TABLE IF NOT EXISTS ejecuciones_sistema (
  id TEXT PRIMARY KEY,
  trabajo TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'procesando' CHECK (estado IN ('procesando', 'completada', 'fallida', 'omitida')),
  iniciada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finalizada_en TEXT,
  encontrados INTEGER NOT NULL DEFAULT 0,
  procesados INTEGER NOT NULL DEFAULT 0,
  exitos INTEGER NOT NULL DEFAULT 0,
  reintentados INTEGER NOT NULL DEFAULT 0,
  fallidos INTEGER NOT NULL DEFAULT 0,
  suprimidos INTEGER NOT NULL DEFAULT 0,
  detalle TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT '',
  metadatos_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS incidentes_operativos_cms (
  id TEXT PRIMARY KEY,
  clave TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL,
  severidad TEXT NOT NULL DEFAULT 'advertencia' CHECK (severidad IN ('informacion', 'advertencia', 'critica')),
  estado TEXT NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'resuelto', 'ignorado')),
  titulo TEXT NOT NULL,
  detalle TEXT NOT NULL DEFAULT '',
  fuente TEXT NOT NULL DEFAULT 'sistema',
  ocurrencias INTEGER NOT NULL DEFAULT 1,
  detectado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resuelto_en TEXT,
  resuelto_por TEXT
);

CREATE TABLE IF NOT EXISTS controles_operativos_cms (
  clave TEXT PRIMARY KEY,
  categoria TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'bloqueado')),
  detalle TEXT NOT NULL DEFAULT '',
  evidencia TEXT NOT NULL DEFAULT '',
  actualizado_por TEXT,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ejecuciones_sistema_trabajo_fecha ON ejecuciones_sistema(trabajo, iniciada_en DESC);
CREATE INDEX IF NOT EXISTS ejecuciones_sistema_estado_fecha ON ejecuciones_sistema(estado, iniciada_en DESC);
CREATE INDEX IF NOT EXISTS incidentes_operativos_estado_fecha ON incidentes_operativos_cms(estado, ultimo_en DESC);
CREATE INDEX IF NOT EXISTS controles_operativos_categoria ON controles_operativos_cms(categoria, estado);
