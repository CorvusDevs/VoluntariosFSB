-- Información mínima para explicar el uso de datos en cada formulario público.
-- Los valores predeterminados mantienen operativos los formularios existentes.
ALTER TABLE formularios_cms ADD COLUMN finalidad VARCHAR(500) NOT NULL DEFAULT 'Responder la consulta y realizar su seguimiento.';
ALTER TABLE formularios_cms ADD COLUMN responsable_datos VARCHAR(180) NOT NULL DEFAULT 'Aletea';
ALTER TABLE formularios_cms ADD COLUMN conservacion_meses INTEGER NOT NULL DEFAULT 12 CHECK (conservacion_meses IN (6, 12, 24));
ALTER TABLE formularios_cms ADD COLUMN requiere_consentimiento INTEGER NOT NULL DEFAULT 1 CHECK (requiere_consentimiento IN (0, 1));
