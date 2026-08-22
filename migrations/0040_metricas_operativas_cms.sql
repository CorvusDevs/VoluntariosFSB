ALTER TABLE tareas_cms ADD COLUMN asignado_en TEXT;

UPDATE tareas_cms
SET asignado_en = creado_en
WHERE responsable_correo IS NOT NULL AND asignado_en IS NULL;

CREATE TRIGGER IF NOT EXISTS tareas_cms_registrar_asignacion_insert
AFTER INSERT ON tareas_cms
WHEN NEW.responsable_correo IS NOT NULL AND NEW.asignado_en IS NULL
BEGIN
  UPDATE tareas_cms SET asignado_en = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS tareas_cms_registrar_asignacion_update
AFTER UPDATE OF responsable_correo ON tareas_cms
WHEN NEW.responsable_correo IS NOT OLD.responsable_correo
BEGIN
  UPDATE tareas_cms
  SET asignado_en = CASE WHEN NEW.responsable_correo IS NULL THEN NULL ELSE CURRENT_TIMESTAMP END
  WHERE id = NEW.id;
END;
