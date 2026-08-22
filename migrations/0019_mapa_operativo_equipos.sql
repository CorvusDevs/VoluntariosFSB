-- Mapa operativo solicitado para cada equipo institucional. Complementa las
-- responsabilidades individuales sin convertir a los equipos en silos.
ALTER TABLE equipos ADD COLUMN decisiones_permitidas TEXT NOT NULL DEFAULT '';
ALTER TABLE equipos ADD COLUMN debe_escalar TEXT NOT NULL DEFAULT '';
ALTER TABLE equipos ADD COLUMN informa_a TEXT NOT NULL DEFAULT '';
ALTER TABLE equipos ADD COLUMN frecuencia_reunion TEXT NOT NULL DEFAULT 'segun_necesidad';
