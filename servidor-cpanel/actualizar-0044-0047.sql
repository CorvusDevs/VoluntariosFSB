SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS medios_pagina_web (
  id VARCHAR(191) PRIMARY KEY,
  nombre VARCHAR(191) NOT NULL,
  tipo VARCHAR(191) NOT NULL,
  ancho INT NOT NULL,
  alto INT NOT NULL,
  bytes INT NOT NULL,
  datos MEDIUMBLOB NOT NULL,
  texto_alternativo VARCHAR(191) NOT NULL DEFAULT '',
  creado_por VARCHAR(191) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS medios_pagina_web_creado_en ON medios_pagina_web(creado_en);

ALTER TABLE formularios_cms
  ADD COLUMN IF NOT EXISTS finalidad VARCHAR(500) NOT NULL DEFAULT 'Responder la consulta y realizar su seguimiento.',
  ADD COLUMN IF NOT EXISTS responsable_datos VARCHAR(180) NOT NULL DEFAULT 'Aletea',
  ADD COLUMN IF NOT EXISTS conservacion_meses INT NOT NULL DEFAULT 12 CHECK(conservacion_meses IN (6, 12, 24)),
  ADD COLUMN IF NOT EXISTS requiere_consentimiento INT NOT NULL DEFAULT 1 CHECK(requiere_consentimiento IN (0, 1));

CREATE TABLE IF NOT EXISTS solicitudes_privacidad_cms (
  id VARCHAR(191) PRIMARY KEY,
  tipo VARCHAR(191) NOT NULL CHECK(tipo IN ('copia', 'eliminacion')),
  solicitante_nombre VARCHAR(191) NOT NULL,
  contacto VARCHAR(191) NOT NULL,
  canal VARCHAR(191) NOT NULL DEFAULT 'correo' CHECK(canal IN ('correo', 'telefono', 'presencial', 'formulario', 'otro')),
  alcance LONGTEXT NOT NULL,
  estado VARCHAR(191) NOT NULL DEFAULT 'recibida' CHECK(estado IN ('recibida', 'identidad_verificada', 'en_revision', 'lista_para_entrega', 'lista_para_decision', 'cerrada', 'rechazada')),
  responsable_correo VARCHAR(191),
  fecha_objetivo DATE,
  nota_revision LONGTEXT NOT NULL DEFAULT '',
  constancia LONGTEXT NOT NULL DEFAULT '',
  identidad_verificada_en DATETIME,
  identidad_verificada_por VARCHAR(191),
  cerrada_en DATETIME,
  creado_por VARCHAR(191) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(responsable_correo) REFERENCES usuarios(correo),
  FOREIGN KEY(identidad_verificada_por) REFERENCES usuarios(correo),
  FOREIGN KEY(creado_por) REFERENCES usuarios(correo)
);
CREATE INDEX IF NOT EXISTS idx_solicitudes_privacidad_estado ON solicitudes_privacidad_cms(estado, actualizado_en);
CREATE INDEX IF NOT EXISTS idx_solicitudes_privacidad_responsable ON solicitudes_privacidad_cms(responsable_correo, estado);

CREATE TABLE IF NOT EXISTS metricas_web_diarias (
  fecha DATE PRIMARY KEY,
  visitas INT NOT NULL DEFAULT 0 CHECK(visitas >= 0),
  paginas_vistas INT NOT NULL DEFAULT 0 CHECK(paginas_vistas >= 0),
  acciones INT NOT NULL DEFAULT 0 CHECK(acciones >= 0),
  proveedor VARCHAR(191) NOT NULL DEFAULT 'cloudflare-web-analytics' CHECK(proveedor = 'cloudflare-web-analytics'),
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS metricas_web_paginas_diarias (
  fecha DATE NOT NULL,
  ruta VARCHAR(191) NOT NULL CHECK(length(ruta) BETWEEN 1 AND 160 AND substr(ruta, 1, 1) = '/' AND instr(ruta, '?') = 0 AND instr(ruta, '#') = 0),
  vistas INT NOT NULL DEFAULT 0 CHECK(vistas >= 0),
  PRIMARY KEY(fecha, ruta),
  FOREIGN KEY(fecha) REFERENCES metricas_web_diarias(fecha) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS metricas_web_acciones_diarias (
  fecha DATE NOT NULL,
  accion VARCHAR(191) NOT NULL CHECK(length(accion) BETWEEN 1 AND 80),
  cantidad INT NOT NULL DEFAULT 0 CHECK(cantidad >= 0),
  PRIMARY KEY(fecha, accion),
  FOREIGN KEY(fecha) REFERENCES metricas_web_diarias(fecha) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS metricas_web_paginas_fecha ON metricas_web_paginas_diarias(fecha, vistas);
CREATE INDEX IF NOT EXISTS metricas_web_acciones_fecha ON metricas_web_acciones_diarias(fecha, cantidad);

SET FOREIGN_KEY_CHECKS = 1;
