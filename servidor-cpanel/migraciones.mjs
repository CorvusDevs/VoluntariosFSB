const MIGRACIONES = [
  {
    nombre: '0052_cumplimientos_formularios_cms',
    async aplicar(conexion) {
      const columnas = [
        ['cumplida_en', 'DATE NULL'],
        ['cumplida_por', 'VARCHAR(191) NULL'],
        ['cumplida_medio', 'VARCHAR(40) NULL'],
        ['cumplida_motivo', 'TEXT NULL'],
      ]
      for (const [nombre, tipo] of columnas) {
        const [filas] = await conexion.execute(
          `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'entradas_cms' AND COLUMN_NAME = ? LIMIT 1`,
          [nombre],
        )
        if (!filas.length) await conexion.query(`ALTER TABLE entradas_cms ADD COLUMN ${nombre} ${tipo}`)
      }
      await conexion.query(`
        CREATE TABLE IF NOT EXISTS historial_entradas_cms (
          id VARCHAR(191) PRIMARY KEY,
          entrada_id VARCHAR(191) NOT NULL,
          accion VARCHAR(20) NOT NULL,
          fecha DATE NOT NULL,
          medio VARCHAR(40) NULL,
          motivo TEXT NOT NULL,
          actor_correo VARCHAR(191) NOT NULL,
          creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      const indices = [
        ['idx_entradas_cms_cumplida_en', 'entradas_cms', 'cumplida_en'],
        ['idx_historial_entradas_cms_entrada', 'historial_entradas_cms', 'entrada_id, creado_en'],
      ]
      for (const [nombre, tabla, columnasIndice] of indices) {
        const [filas] = await conexion.execute(
          'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1',
          [tabla, nombre],
        )
        if (!filas.length) await conexion.query(`CREATE INDEX ${nombre} ON ${tabla} (${columnasIndice})`)
      }
    },
  },
  {
    nombre: '0053_unidades_operativas_cms',
    async aplicar(conexion) {
      await conexion.query(`
        CREATE TABLE IF NOT EXISTS unidades_operativas_cms (
          id VARCHAR(191) PRIMARY KEY,
          clave VARCHAR(191) NOT NULL UNIQUE,
          nombre VARCHAR(191) NOT NULL,
          sigla VARCHAR(191) NOT NULL DEFAULT '',
          descripcion TEXT NOT NULL,
          tipo VARCHAR(40) NOT NULL DEFAULT 'programa',
          equipo_id VARCHAR(191) NOT NULL,
          unidad_padre_id VARCHAR(191) NULL,
          color VARCHAR(20) NOT NULL DEFAULT '#6d3087',
          orden INT NOT NULL DEFAULT 0,
          estado VARCHAR(40) NOT NULL DEFAULT 'activa',
          creado_por VARCHAR(191) NOT NULL,
          creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      await conexion.query(`
        CREATE TABLE IF NOT EXISTS unidades_vistas_equipo_cms (
          unidad_id VARCHAR(191) NOT NULL,
          equipo_id VARCHAR(191) NOT NULL,
          enfoque VARCHAR(40) NOT NULL DEFAULT 'operativo',
          creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (unidad_id, equipo_id, enfoque)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)

      for (const tabla of ['proyectos_cms', 'tareas_cms', 'eventos_cms', 'reuniones_cms', 'documentos_cms', 'formularios_cms']) {
        const [filas] = await conexion.execute(
          'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
          [tabla, 'unidad_id'],
        )
        if (!filas.length) await conexion.query(`ALTER TABLE ${tabla} ADD COLUMN unidad_id VARCHAR(191) NULL`)
      }

      const indices = [
        ['idx_unidades_operativas_equipo_orden', 'unidades_operativas_cms', 'equipo_id, estado, orden'],
        ['idx_unidades_operativas_padre_orden', 'unidades_operativas_cms', 'unidad_padre_id, estado, orden'],
      ]
      for (const [nombre, tabla, columnas] of indices) {
        const [filas] = await conexion.execute(
          'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1',
          [tabla, nombre],
        )
        if (!filas.length) await conexion.query(`CREATE INDEX ${nombre} ON ${tabla} (${columnas})`)
      }

      const unidades = [
        ['unidad-gaf', 'gaf', 'Grupo Apoyo Familias', 'GAF', 'Acompañamiento y apoyo para familias.', 'programa', 'familias', '#397dba', 10],
        ['unidad-fer', 'fer', 'Familias en Red', 'FER', 'Encuentros y redes de apoyo entre familias.', 'programa', 'familias', '#ec2b83', 20],
        ['unidad-fsb', 'fsb', 'Fútbol sin Barreras', 'FSB', 'Actividad deportiva inclusiva y seguimiento de participantes.', 'programa', 'deportes', '#5bc9c3', 10],
        ['unidad-emap', 'emap', 'Estimulación Motriz a través de la Plástica', 'EMAP', 'Propuesta de estimulación motriz y expresión plástica.', 'programa', 'deportes', '#397dba', 20],
        ['unidad-tae', 'tae', 'Taller Arte y Expresión', 'TAE', 'Taller inclusivo de arte y expresión.', 'programa', 'deportes', '#f1b83d', 30],
        ['unidad-redes-aletea', 'redes_aletea', 'Redes Aletea', '', 'Comunicación institucional en redes de Aletea.', 'canal', 'comunicacion', '#5bc9c3', 10],
        ['unidad-redes-fsb', 'redes_fsb', 'Redes FSB', '', 'Comunicación en redes de Fútbol sin Barreras.', 'canal', 'comunicacion', '#ec2b83', 20],
        ['unidad-daea-1', 'daea_1', 'DAEA 1º', 'DAEA 1º', 'Primer año de la Diplomatura en Acompañamiento en el Espectro Autista.', 'formacion', 'capacitaciones', '#19bf43', 10],
        ['unidad-daea-2', 'daea_2', 'DAEA 2º', 'DAEA 2º', 'Segundo año de la Diplomatura en Acompañamiento en el Espectro Autista.', 'formacion', 'capacitaciones', '#c997ae', 20],
        ['unidad-fad', 'fad', 'Formaciones a Demanda para centros educativos', 'FAD', 'Formaciones solicitadas por centros educativos.', 'formacion', 'capacitaciones', '#f1b83d', 30],
        ['unidad-socios', 'area_socios', 'Área de socios', '', 'Altas, cuotas, comunicaciones y seguimiento de socios.', 'proceso', 'administracion', '#5bc9c3', 10],
        ['unidad-gestoria', 'gestoria_tramites', 'Gestoría y trámites', '', 'Seguimiento de trámites y gestiones administrativas.', 'proceso', 'administracion', '#6d3087', 20],
      ]
      for (const unidad of unidades) {
        await conexion.execute(`INSERT IGNORE INTO unidades_operativas_cms
          (id, clave, nombre, sigla, descripcion, tipo, equipo_id, color, orden, creado_por)
          SELECT ?, ?, ?, ?, ?, ?, id, ?, ?, 'sistema' FROM equipos WHERE clave = ? LIMIT 1`,
        [unidad[0], unidad[1], unidad[2], unidad[3], unidad[4], unidad[5], unidad[7], unidad[8], unidad[6]])
      }
      await conexion.query(`INSERT IGNORE INTO unidades_vistas_equipo_cms (unidad_id, equipo_id, enfoque)
        SELECT u.id, e.id, 'financiero' FROM unidades_operativas_cms u CROSS JOIN equipos e
        WHERE u.clave IN ('fsb', 'emap', 'tae') AND e.clave = 'finanzas'`)
      await conexion.query(`INSERT IGNORE INTO unidades_vistas_equipo_cms (unidad_id, equipo_id, enfoque)
        SELECT u.id, e.id, 'comunicacion' FROM unidades_operativas_cms u CROSS JOIN equipos e
        WHERE u.clave = 'fsb' AND e.clave = 'comunicacion'`)
      await conexion.query(`UPDATE equipos SET informa_a = 'Dirección', actualizado_en = CURRENT_TIMESTAMP
        WHERE clave IN ('familias', 'deportes', 'comunicacion', 'capacitaciones', 'finanzas', 'eventos', 'administracion')
          AND TRIM(informa_a) = ''`)
      await conexion.query(`UPDATE equipos SET informa_a = '', actualizado_en = CURRENT_TIMESTAMP
        WHERE clave = 'comision_directiva' AND informa_a = 'Comisión Directiva'`)
    },
  },
  {
    nombre: '0054_vigencia_cuentas',
    async aplicar(conexion) {
      const [columnas] = await conexion.execute(
        'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
        ['usuarios', 'acceso_hasta'],
      )
      if (!columnas.length) await conexion.query('ALTER TABLE usuarios ADD COLUMN acceso_hasta DATE NULL')
      const [indices] = await conexion.execute(
        'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1',
        ['usuarios', 'usuarios_acceso_hasta_activo'],
      )
      if (!indices.length) await conexion.query('CREATE INDEX usuarios_acceso_hasta_activo ON usuarios (activo, acceso_hasta)')
    },
  },
]

export async function aplicarMigracionesMariaDb(base) {
  const conexion = await base.pool.getConnection()
  try {
    await conexion.query(`
      CREATE TABLE IF NOT EXISTS migraciones_cms (
        nombre VARCHAR(190) PRIMARY KEY,
        aplicada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    for (const migracion of MIGRACIONES) {
      const [filas] = await conexion.execute('SELECT 1 FROM migraciones_cms WHERE nombre = ? LIMIT 1', [migracion.nombre])
      if (filas.length) continue
      await conexion.beginTransaction()
      try {
        await migracion.aplicar(conexion)
        await conexion.execute('INSERT INTO migraciones_cms (nombre) VALUES (?)', [migracion.nombre])
        await conexion.commit()
      } catch (error) {
        await conexion.rollback()
        throw error
      }
    }
  } finally {
    conexion.release()
  }
}

export const _pruebas = { MIGRACIONES }
