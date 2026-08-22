-- Acceso explícito a información personal protegida. Ningún perfil obtiene este
-- alcance por defecto: Administración gestiona el sistema, pero abre datos
-- sensibles solo cuando una administradora se lo asigna y queda registrado.
ALTER TABLE usuarios ADD COLUMN nivel_datos_personales TEXT NOT NULL DEFAULT 'ninguno'
  CHECK (nivel_datos_personales IN ('ninguno', 'operativo', 'sensible'));

-- El acceso a fotos y fichas protegidas caduca por defecto. Renovarlo exige
-- revisar que la tarea siga vigente y deja la decisión en la auditoría.
ALTER TABLE usuarios ADD COLUMN datos_personales_hasta TEXT;

CREATE INDEX IF NOT EXISTS usuarios_nivel_datos_personales_activo
  ON usuarios(nivel_datos_personales, activo);
