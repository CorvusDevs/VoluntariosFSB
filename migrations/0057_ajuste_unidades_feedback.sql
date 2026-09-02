-- Consolida DAEA como una sola unidad operativa y agrega el canal GWP de Familias.
-- Los registros existentes conservan su historial: solo cambia la unidad que los agrupa.

INSERT OR IGNORE INTO unidades_operativas_cms
  (id, clave, nombre, sigla, descripcion, tipo, equipo_id, color, orden, creado_por)
SELECT 'unidad-daea', 'daea', 'Diplomatura en Acompañamiento en el Espectro Autista', 'DAEA',
  'Formación conjunta organizada mediante proyectos de primer y segundo año.',
  'formacion', id, '#19bf43', 10, 'sistema'
FROM equipos WHERE clave = 'capacitaciones';

INSERT OR IGNORE INTO unidades_operativas_cms
  (id, clave, nombre, sigla, descripcion, tipo, equipo_id, color, orden, creado_por)
SELECT 'unidad-gwp', 'gwp', 'Atención a Familias por WhatsApp', 'GWP',
  'Orientación y acompañamiento a familias por WhatsApp.',
  'canal', id, '#5bc9c3', 30, 'sistema'
FROM equipos WHERE clave = 'familias';

UPDATE proyectos_cms SET unidad_id = 'unidad-daea', actualizado_en = CURRENT_TIMESTAMP
WHERE unidad_id IN ('unidad-daea-1', 'unidad-daea-2');
UPDATE tareas_cms SET unidad_id = 'unidad-daea', actualizado_en = CURRENT_TIMESTAMP
WHERE unidad_id IN ('unidad-daea-1', 'unidad-daea-2');
UPDATE eventos_cms SET unidad_id = 'unidad-daea', actualizado_en = CURRENT_TIMESTAMP
WHERE unidad_id IN ('unidad-daea-1', 'unidad-daea-2');
UPDATE reuniones_cms SET unidad_id = 'unidad-daea', actualizado_en = CURRENT_TIMESTAMP
WHERE unidad_id IN ('unidad-daea-1', 'unidad-daea-2');
UPDATE documentos_cms SET unidad_id = 'unidad-daea', actualizado_en = CURRENT_TIMESTAMP
WHERE unidad_id IN ('unidad-daea-1', 'unidad-daea-2');
UPDATE formularios_cms SET unidad_id = 'unidad-daea', actualizado_en = CURRENT_TIMESTAMP
WHERE unidad_id IN ('unidad-daea-1', 'unidad-daea-2');

INSERT OR IGNORE INTO unidades_vistas_equipo_cms (unidad_id, equipo_id, enfoque)
SELECT 'unidad-daea', equipo_id, enfoque FROM unidades_vistas_equipo_cms
WHERE unidad_id IN ('unidad-daea-1', 'unidad-daea-2');
DELETE FROM unidades_vistas_equipo_cms WHERE unidad_id IN ('unidad-daea-1', 'unidad-daea-2');

UPDATE unidades_operativas_cms
SET estado = 'archivada', actualizado_en = CURRENT_TIMESTAMP
WHERE id IN ('unidad-daea-1', 'unidad-daea-2');
UPDATE unidades_operativas_cms SET orden = 20, actualizado_en = CURRENT_TIMESTAMP
WHERE id = 'unidad-fad';
