-- Permite crear una serie anual de actividades sin perder la posibilidad de
-- editar cada fecha por separado.
ALTER TABLE eventos_cms ADD COLUMN serie_id TEXT;
ALTER TABLE eventos_cms ADD COLUMN generada_para TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS eventos_cms_serie_fecha_unica
  ON eventos_cms(serie_id, generada_para)
  WHERE serie_id IS NOT NULL AND generada_para IS NOT NULL;

ALTER TABLE reuniones_cms ADD COLUMN serie_id TEXT;
ALTER TABLE reuniones_cms ADD COLUMN generada_para TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS reuniones_cms_serie_fecha_unica
  ON reuniones_cms(serie_id, generada_para)
  WHERE serie_id IS NOT NULL AND generada_para IS NOT NULL;

-- Incorpora las dos unidades institucionales solicitadas. Las claves estables
-- evitan duplicarlas si el nombre visible cambia más adelante.
INSERT OR IGNORE INTO equipos (id, clave, nombre, descripcion, color, categoria, creado_por) VALUES
  ('institucional-comision-directiva', 'comision_directiva', 'Comisión Directiva', 'Gobierno institucional, definición de prioridades y supervisión de la organización.', '#6d3087', 'comision_directiva', 'sistema'),
  ('institucional-interinstitucional', 'interinstitucional', 'Interinstitucional', 'Coordinación y trabajo conjunto con otras instituciones y redes.', '#397dba', 'equipo', 'sistema');

UPDATE equipos SET activo = 1, actualizado_en = CURRENT_TIMESTAMP
WHERE clave IN ('comision_directiva', 'interinstitucional');
