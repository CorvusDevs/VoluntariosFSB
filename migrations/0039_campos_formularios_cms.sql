ALTER TABLE formularios_cms ADD COLUMN campos_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE entradas_cms ADD COLUMN respuestas_json TEXT NOT NULL DEFAULT '{}';
