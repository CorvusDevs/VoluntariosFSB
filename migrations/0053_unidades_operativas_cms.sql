-- Agrega un nivel estable entre los equipos y los proyectos. Las unidades se
-- enlazan desde varias areas sin duplicar su informacion ni su historial.
CREATE TABLE IF NOT EXISTS unidades_operativas_cms (
  id TEXT PRIMARY KEY,
  clave TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  sigla TEXT NOT NULL DEFAULT '',
  descripcion TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'programa'
    CHECK (tipo IN ('programa', 'formacion', 'canal', 'proceso')),
  equipo_id TEXT NOT NULL REFERENCES equipos(id),
  unidad_padre_id TEXT REFERENCES unidades_operativas_cms(id) ON DELETE SET NULL,
  color TEXT NOT NULL DEFAULT '#6d3087',
  orden INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'activa'
    CHECK (estado IN ('borrador', 'activa', 'en_pausa', 'archivada')),
  creado_por TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS unidades_vistas_equipo_cms (
  unidad_id TEXT NOT NULL REFERENCES unidades_operativas_cms(id) ON DELETE CASCADE,
  equipo_id TEXT NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  enfoque TEXT NOT NULL DEFAULT 'operativo'
    CHECK (enfoque IN ('operativo', 'financiero', 'comunicacion')),
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (unidad_id, equipo_id, enfoque)
);

CREATE INDEX IF NOT EXISTS unidades_operativas_equipo_orden
  ON unidades_operativas_cms(equipo_id, estado, orden);
CREATE INDEX IF NOT EXISTS unidades_operativas_padre_orden
  ON unidades_operativas_cms(unidad_padre_id, estado, orden);

ALTER TABLE proyectos_cms ADD COLUMN unidad_id TEXT REFERENCES unidades_operativas_cms(id);
ALTER TABLE tareas_cms ADD COLUMN unidad_id TEXT REFERENCES unidades_operativas_cms(id);
ALTER TABLE eventos_cms ADD COLUMN unidad_id TEXT REFERENCES unidades_operativas_cms(id);
ALTER TABLE reuniones_cms ADD COLUMN unidad_id TEXT REFERENCES unidades_operativas_cms(id);
ALTER TABLE documentos_cms ADD COLUMN unidad_id TEXT REFERENCES unidades_operativas_cms(id);
ALTER TABLE formularios_cms ADD COLUMN unidad_id TEXT REFERENCES unidades_operativas_cms(id);

INSERT OR IGNORE INTO unidades_operativas_cms
  (id, clave, nombre, sigla, descripcion, tipo, equipo_id, color, orden, creado_por)
SELECT 'unidad-gaf', 'gaf', 'Grupo Apoyo Familias', 'GAF', 'Acompañamiento y apoyo para familias.', 'programa', id, '#397dba', 10, 'sistema'
FROM equipos WHERE clave = 'familias';
INSERT OR IGNORE INTO unidades_operativas_cms
  (id, clave, nombre, sigla, descripcion, tipo, equipo_id, color, orden, creado_por)
SELECT 'unidad-fer', 'fer', 'Familias en Red', 'FER', 'Encuentros y redes de apoyo entre familias.', 'programa', id, '#ec2b83', 20, 'sistema'
FROM equipos WHERE clave = 'familias';

INSERT OR IGNORE INTO unidades_operativas_cms
  (id, clave, nombre, sigla, descripcion, tipo, equipo_id, color, orden, creado_por)
SELECT 'unidad-fsb', 'fsb', 'Fútbol sin Barreras', 'FSB', 'Actividad deportiva inclusiva y seguimiento de participantes.', 'programa', id, '#5bc9c3', 10, 'sistema'
FROM equipos WHERE clave = 'deportes';
INSERT OR IGNORE INTO unidades_operativas_cms
  (id, clave, nombre, sigla, descripcion, tipo, equipo_id, color, orden, creado_por)
SELECT 'unidad-emap', 'emap', 'Estimulación Motriz a través de la Plástica', 'EMAP', 'Propuesta de estimulación motriz y expresión plástica.', 'programa', id, '#397dba', 20, 'sistema'
FROM equipos WHERE clave = 'deportes';
INSERT OR IGNORE INTO unidades_operativas_cms
  (id, clave, nombre, sigla, descripcion, tipo, equipo_id, color, orden, creado_por)
SELECT 'unidad-tae', 'tae', 'Taller Arte y Expresión', 'TAE', 'Taller inclusivo de arte y expresión.', 'programa', id, '#f1b83d', 30, 'sistema'
FROM equipos WHERE clave = 'deportes';

INSERT OR IGNORE INTO unidades_operativas_cms
  (id, clave, nombre, sigla, descripcion, tipo, equipo_id, color, orden, creado_por)
SELECT 'unidad-redes-aletea', 'redes_aletea', 'Redes Aletea', '', 'Comunicación institucional en redes de Aletea.', 'canal', id, '#5bc9c3', 10, 'sistema'
FROM equipos WHERE clave = 'comunicacion';
INSERT OR IGNORE INTO unidades_operativas_cms
  (id, clave, nombre, sigla, descripcion, tipo, equipo_id, color, orden, creado_por)
SELECT 'unidad-redes-fsb', 'redes_fsb', 'Redes FSB', '', 'Comunicación en redes de Fútbol sin Barreras.', 'canal', id, '#ec2b83', 20, 'sistema'
FROM equipos WHERE clave = 'comunicacion';

INSERT OR IGNORE INTO unidades_operativas_cms
  (id, clave, nombre, sigla, descripcion, tipo, equipo_id, color, orden, creado_por)
SELECT 'unidad-daea-1', 'daea_1', 'DAEA 1º', 'DAEA 1º', 'Primer año de la Diplomatura en Acompañamiento en el Espectro Autista.', 'formacion', id, '#19bf43', 10, 'sistema'
FROM equipos WHERE clave = 'capacitaciones';
INSERT OR IGNORE INTO unidades_operativas_cms
  (id, clave, nombre, sigla, descripcion, tipo, equipo_id, color, orden, creado_por)
SELECT 'unidad-daea-2', 'daea_2', 'DAEA 2º', 'DAEA 2º', 'Segundo año de la Diplomatura en Acompañamiento en el Espectro Autista.', 'formacion', id, '#c997ae', 20, 'sistema'
FROM equipos WHERE clave = 'capacitaciones';
INSERT OR IGNORE INTO unidades_operativas_cms
  (id, clave, nombre, sigla, descripcion, tipo, equipo_id, color, orden, creado_por)
SELECT 'unidad-fad', 'fad', 'Formaciones a Demanda para centros educativos', 'FAD', 'Formaciones solicitadas por centros educativos.', 'formacion', id, '#f1b83d', 30, 'sistema'
FROM equipos WHERE clave = 'capacitaciones';

INSERT OR IGNORE INTO unidades_operativas_cms
  (id, clave, nombre, sigla, descripcion, tipo, equipo_id, color, orden, creado_por)
SELECT 'unidad-socios', 'area_socios', 'Área de socios', '', 'Altas, cuotas, comunicaciones y seguimiento de socios.', 'proceso', id, '#5bc9c3', 10, 'sistema'
FROM equipos WHERE clave = 'administracion';
INSERT OR IGNORE INTO unidades_operativas_cms
  (id, clave, nombre, sigla, descripcion, tipo, equipo_id, color, orden, creado_por)
SELECT 'unidad-gestoria', 'gestoria_tramites', 'Gestoría y trámites', '', 'Seguimiento de trámites y gestiones administrativas.', 'proceso', id, '#6d3087', 20, 'sistema'
FROM equipos WHERE clave = 'administracion';

INSERT OR IGNORE INTO unidades_vistas_equipo_cms (unidad_id, equipo_id, enfoque)
SELECT u.id, e.id, 'financiero' FROM unidades_operativas_cms u, equipos e
WHERE u.clave IN ('fsb', 'emap', 'tae') AND e.clave = 'finanzas';
INSERT OR IGNORE INTO unidades_vistas_equipo_cms (unidad_id, equipo_id, enfoque)
SELECT u.id, e.id, 'comunicacion' FROM unidades_operativas_cms u, equipos e
WHERE u.clave = 'fsb' AND e.clave = 'comunicacion';

UPDATE equipos SET informa_a = 'Dirección', actualizado_en = CURRENT_TIMESTAMP
WHERE clave IN ('familias', 'deportes', 'comunicacion', 'capacitaciones', 'finanzas', 'eventos', 'administracion')
  AND trim(informa_a) = '';
UPDATE equipos SET informa_a = '', actualizado_en = CURRENT_TIMESTAMP
WHERE clave = 'comision_directiva' AND informa_a = 'Comisión Directiva';
