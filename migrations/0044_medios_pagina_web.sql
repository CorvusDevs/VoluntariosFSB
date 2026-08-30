CREATE TABLE IF NOT EXISTS medios_pagina_web (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  ancho INTEGER NOT NULL,
  alto INTEGER NOT NULL,
  bytes INTEGER NOT NULL,
  datos BLOB NOT NULL,
  texto_alternativo TEXT NOT NULL DEFAULT '',
  creado_por TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS medios_pagina_web_creado_en ON medios_pagina_web(creado_en);
