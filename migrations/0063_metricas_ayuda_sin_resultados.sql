-- Consultas agregadas que no encontraron ayuda.
-- No guarda cuenta, correo, IP ni recorridos individuales.
CREATE TABLE metricas_ayuda_sin_resultados (
  fecha TEXT NOT NULL,
  consulta TEXT NOT NULL CHECK (length(consulta) BETWEEN 3 AND 80),
  cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad >= 1),
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (fecha, consulta)
);

CREATE INDEX metricas_ayuda_consulta_fecha
ON metricas_ayuda_sin_resultados (consulta, fecha);
