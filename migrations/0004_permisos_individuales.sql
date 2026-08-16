-- Las coordinadoras existentes reciben NULL y conservan todo el acceso actual.
-- Solo una lista JSON explícita limita secciones para una cuenta concreta.
ALTER TABLE usuarios ADD COLUMN permisos TEXT;
