-- Unidad canónica para el trabajo con personas adultas autistas.
-- Se ubica inicialmente en Familias y puede moverse desde el gestor sin perder vínculos.
INSERT OR IGNORE INTO unidades_operativas_cms
  (id, clave, nombre, sigla, descripcion, tipo, equipo_id, color, orden, creado_por)
SELECT 'unidad-adultos-autistas', 'adultos_autistas', 'Adultos autistas', '',
  'Espacio estable de trabajo y acompañamiento para personas adultas autistas.',
  'programa', id, '#662D7D', 40, 'sistema'
FROM equipos WHERE clave = 'familias';
