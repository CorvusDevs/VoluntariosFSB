-- Las fotos de perfil identifican a las cuentas internas. Son independientes
-- de las fotos de participantes y solo Administración puede verlas o cambiarlas.
ALTER TABLE usuarios ADD COLUMN foto_perfil TEXT;
