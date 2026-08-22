-- Las comisiones son unidades institucionales dentro del mismo mapa operativo.
-- No duplican personas, tareas ni permisos: el acceso sigue definido por perfil
-- y por la asignación de cada persona a la unidad correspondiente.
ALTER TABLE equipos ADD COLUMN categoria TEXT NOT NULL DEFAULT 'equipo'
  CHECK (categoria IN ('equipo', 'comision_directiva', 'comision_fiscal', 'comision_electoral', 'comision'));

CREATE INDEX IF NOT EXISTS equipos_categoria_activo
  ON equipos(categoria, activo);
