-- Convierte las siete areas del mapa vivo en equipos reales y asignables.
-- La clave es estable aunque Administracion cambie luego el nombre visible.
ALTER TABLE equipos ADD COLUMN clave TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS equipos_clave_unica
  ON equipos(clave) WHERE clave IS NOT NULL;

UPDATE equipos SET clave = 'familias'
WHERE id = (
  SELECT id FROM equipos
  WHERE lower(trim(nombre)) IN ('familias', 'dpto. familias', 'departamento familias')
  ORDER BY CASE lower(trim(nombre)) WHEN 'familias' THEN 0 ELSE 1 END, creado_en
  LIMIT 1
);
UPDATE equipos SET clave = 'deportes' WHERE id = (SELECT id FROM equipos WHERE lower(trim(nombre)) = 'deportes' ORDER BY creado_en LIMIT 1);
UPDATE equipos SET clave = 'comunicacion' WHERE id = (SELECT id FROM equipos WHERE lower(trim(nombre)) IN ('comunicación', 'comunicacion') ORDER BY creado_en LIMIT 1);
UPDATE equipos SET clave = 'capacitaciones' WHERE id = (SELECT id FROM equipos WHERE lower(trim(nombre)) = 'capacitaciones' ORDER BY creado_en LIMIT 1);
UPDATE equipos SET clave = 'finanzas' WHERE id = (SELECT id FROM equipos WHERE lower(trim(nombre)) = 'finanzas' ORDER BY creado_en LIMIT 1);
UPDATE equipos SET clave = 'eventos' WHERE id = (SELECT id FROM equipos WHERE lower(trim(nombre)) = 'eventos' ORDER BY creado_en LIMIT 1);
UPDATE equipos SET clave = 'administracion' WHERE id = (SELECT id FROM equipos WHERE lower(trim(nombre)) IN ('administración', 'administracion') ORDER BY creado_en LIMIT 1);

UPDATE equipos SET nombre = 'Familias'
WHERE clave = 'familias' AND nombre != 'Familias'
  AND NOT EXISTS (SELECT 1 FROM equipos AS otro WHERE otro.nombre = 'Familias');

INSERT OR IGNORE INTO equipos (id, clave, nombre, descripcion, color, categoria, creado_por) VALUES
  ('fundacional-familias', 'familias', 'Familias', 'Acompañamiento, orientación y comunidad para las familias.', '#5bc9c3', 'equipo', 'sistema'),
  ('fundacional-deportes', 'deportes', 'Deportes', 'Actividades deportivas inclusivas y seguimiento de participantes.', '#ec2b83', 'equipo', 'sistema'),
  ('fundacional-comunicacion', 'comunicacion', 'Comunicación', 'Comunicación institucional, contenidos y difusión.', '#ec2b83', 'equipo', 'sistema'),
  ('fundacional-capacitaciones', 'capacitaciones', 'Capacitaciones', 'Formación, talleres y desarrollo de capacidades.', '#397dba', 'equipo', 'sistema'),
  ('fundacional-finanzas', 'finanzas', 'Finanzas', 'Presupuesto, rendiciones y sostenibilidad financiera.', '#f1b83d', 'equipo', 'sistema'),
  ('fundacional-eventos', 'eventos', 'Eventos', 'Planificación y coordinación de actividades institucionales.', '#ec2b83', 'equipo', 'sistema'),
  ('fundacional-administracion', 'administracion', 'Administración', 'Gestión administrativa y soporte transversal.', '#6d3087', 'equipo', 'sistema');

UPDATE equipos SET activo = 1, actualizado_en = CURRENT_TIMESTAMP
WHERE clave IN ('familias', 'deportes', 'comunicacion', 'capacitaciones', 'finanzas', 'eventos', 'administracion');
