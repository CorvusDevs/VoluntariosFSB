-- Resultados diarios agregados de la página pública.
-- No guarda IP, identificadores, consultas, respuestas ni recorridos individuales.
CREATE TABLE metricas_web_diarias (
  fecha TEXT PRIMARY KEY,
  visitas INTEGER NOT NULL DEFAULT 0 CHECK (visitas >= 0),
  paginas_vistas INTEGER NOT NULL DEFAULT 0 CHECK (paginas_vistas >= 0),
  acciones INTEGER NOT NULL DEFAULT 0 CHECK (acciones >= 0),
  proveedor TEXT NOT NULL DEFAULT 'cloudflare-web-analytics' CHECK (proveedor = 'cloudflare-web-analytics'),
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE metricas_web_paginas_diarias (
  fecha TEXT NOT NULL,
  ruta TEXT NOT NULL CHECK (length(ruta) BETWEEN 1 AND 160 AND substr(ruta, 1, 1) = '/' AND instr(ruta, '?') = 0 AND instr(ruta, '#') = 0),
  vistas INTEGER NOT NULL DEFAULT 0 CHECK (vistas >= 0),
  PRIMARY KEY (fecha, ruta),
  FOREIGN KEY (fecha) REFERENCES metricas_web_diarias(fecha) ON DELETE CASCADE
);

CREATE TABLE metricas_web_acciones_diarias (
  fecha TEXT NOT NULL,
  accion TEXT NOT NULL CHECK (length(accion) BETWEEN 1 AND 80),
  cantidad INTEGER NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  PRIMARY KEY (fecha, accion),
  FOREIGN KEY (fecha) REFERENCES metricas_web_diarias(fecha) ON DELETE CASCADE
);

CREATE INDEX metricas_web_paginas_fecha ON metricas_web_paginas_diarias(fecha, vistas);
CREATE INDEX metricas_web_acciones_fecha ON metricas_web_acciones_diarias(fecha, cantidad);
