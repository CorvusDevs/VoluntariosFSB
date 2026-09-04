import { readFile } from 'node:fs/promises'

export function recuperarRedesDesdeHistorial(contenidoActual, historiales = []) {
  const contenido = structuredClone(contenidoActual)
  const actuales = Array.isArray(contenido?.organizacion?.redes) ? contenido.organizacion.redes : []
  const recuperables = new Map()
  for (const historial of historiales) {
    let anterior
    try { anterior = typeof historial === 'string' ? JSON.parse(historial) : historial } catch { continue }
    for (const red of anterior?.organizacion?.redes || []) {
      if (typeof red?.red !== 'string' || typeof red?.enlace !== 'string' || !/^https:\/\//.test(red.enlace)) continue
      if (!recuperables.has(red.red)) recuperables.set(red.red, red)
    }
  }
  let cambios = 0
  contenido.organizacion ??= {}
  contenido.organizacion.redes = actuales.map((red) => {
    if (typeof red?.enlace === 'string' && /^https:\/\//.test(red.enlace)) return red
    const historica = recuperables.get(red?.red)
    if (!historica) return red
    cambios += 1
    return { ...red, enlace: historica.enlace, visible: historica.visible !== false, etiqueta: historica.etiqueta || red.etiqueta }
  })
  return { contenido, cambios }
}

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
  {
    nombre: '0055_comunicaciones_newsletters',
    async aplicar(conexion) {
      await conexion.query(`
        CREATE TABLE IF NOT EXISTS contactos_comunicacion (
          id VARCHAR(191) PRIMARY KEY,
          correo VARCHAR(191) NOT NULL UNIQUE,
          nombre VARCHAR(191) NOT NULL DEFAULT '',
          idioma VARCHAR(20) NOT NULL DEFAULT 'es',
          estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
          fuente_ultima VARCHAR(191) NOT NULL DEFAULT '',
          token_baja VARCHAR(191) NOT NULL UNIQUE,
          confirmado_en DATETIME NULL,
          baja_en DATETIME NULL,
          creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      await conexion.query(`
        CREATE TABLE IF NOT EXISTS consentimientos_comunicacion (
          id VARCHAR(191) PRIMARY KEY,
          contacto_id VARCHAR(191) NOT NULL,
          finalidad VARCHAR(191) NOT NULL,
          estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
          fuente VARCHAR(191) NOT NULL,
          formulario_id VARCHAR(191) NULL,
          entrada_id VARCHAR(191) NULL,
          texto_version VARCHAR(60) NOT NULL,
          texto_consentimiento TEXT NOT NULL,
          token_hash VARCHAR(191) NOT NULL UNIQUE,
          solicitado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          confirmado_en DATETIME NULL,
          revocado_en DATETIME NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      await conexion.query(`
        CREATE TABLE IF NOT EXISTS preferencias_comunicacion (
          contacto_id VARCHAR(191) NOT NULL,
          tema VARCHAR(80) NOT NULL,
          habilitada TINYINT NOT NULL DEFAULT 1,
          actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (contacto_id, tema)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      await conexion.query(`
        CREATE TABLE IF NOT EXISTS supresiones_comunicacion (
          correo VARCHAR(191) PRIMARY KEY,
          motivo VARCHAR(191) NOT NULL,
          origen VARCHAR(80) NOT NULL DEFAULT 'gestor',
          creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      await conexion.query(`
        CREATE TABLE IF NOT EXISTS campanas_comunicacion (
          id VARCHAR(191) PRIMARY KEY,
          titulo VARCHAR(191) NOT NULL,
          asunto VARCHAR(191) NOT NULL,
          contenido_texto TEXT NOT NULL,
          contenido_html TEXT NOT NULL,
          temas_json TEXT NOT NULL,
          estado VARCHAR(30) NOT NULL DEFAULT 'borrador',
          programada_para DATETIME NULL,
          creado_por VARCHAR(191) NOT NULL,
          aprobado_por VARCHAR(191) NULL,
          aprobado_en DATETIME NULL,
          enviado_en DATETIME NULL,
          creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      await conexion.query(`
        CREATE TABLE IF NOT EXISTS cola_correos (
          id VARCHAR(191) PRIMARY KEY,
          tipo VARCHAR(30) NOT NULL,
          contacto_id VARCHAR(191) NULL,
          campana_id VARCHAR(191) NULL,
          destinatario VARCHAR(191) NOT NULL,
          asunto VARCHAR(191) NOT NULL,
          contenido_texto TEXT NOT NULL,
          contenido_html TEXT NOT NULL,
          estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
          clave_idempotencia VARCHAR(191) NOT NULL UNIQUE,
          intentos INT NOT NULL DEFAULT 0,
          proximo_intento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          proveedor_id VARCHAR(191) NULL,
          ultimo_error TEXT NOT NULL,
          creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      await conexion.query(`
        CREATE TABLE IF NOT EXISTS eventos_correo (
          id VARCHAR(191) PRIMARY KEY,
          correo_id VARCHAR(191) NULL,
          proveedor VARCHAR(80) NOT NULL DEFAULT 'hosting',
          tipo VARCHAR(80) NOT NULL,
          detalle TEXT NOT NULL,
          ocurrido_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      const indices = [
        ['contactos_comunicacion_estado', 'contactos_comunicacion', 'estado, actualizado_en'],
        ['consentimientos_comunicacion_contacto', 'consentimientos_comunicacion', 'contacto_id, solicitado_en'],
        ['preferencias_comunicacion_tema', 'preferencias_comunicacion', 'tema, habilitada'],
        ['campanas_comunicacion_estado', 'campanas_comunicacion', 'estado, programada_para'],
        ['cola_correos_pendientes', 'cola_correos', 'estado, proximo_intento'],
        ['eventos_correo_correo', 'eventos_correo', 'correo_id, ocurrido_en'],
      ]
      for (const [nombre, tabla, columnas] of indices) {
        const [filas] = await conexion.execute(
          'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1',
          [tabla, nombre],
        )
        if (!filas.length) await conexion.query(`CREATE INDEX ${nombre} ON ${tabla} (${columnas})`)
      }
    },
  },
  {
    nombre: '0056_operaciones_sistema',
    async aplicar(conexion) {
      await conexion.query(`
        CREATE TABLE IF NOT EXISTS ejecuciones_sistema (
          id VARCHAR(191) PRIMARY KEY,
          trabajo VARCHAR(191) NOT NULL,
          estado VARCHAR(30) NOT NULL DEFAULT 'procesando',
          iniciada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          finalizada_en DATETIME NULL,
          encontrados INT NOT NULL DEFAULT 0,
          procesados INT NOT NULL DEFAULT 0,
          exitos INT NOT NULL DEFAULT 0,
          reintentados INT NOT NULL DEFAULT 0,
          fallidos INT NOT NULL DEFAULT 0,
          suprimidos INT NOT NULL DEFAULT 0,
          detalle TEXT NOT NULL,
          error TEXT NOT NULL,
          metadatos_json TEXT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      await conexion.query(`
        CREATE TABLE IF NOT EXISTS incidentes_operativos_cms (
          id VARCHAR(191) PRIMARY KEY,
          clave VARCHAR(191) NOT NULL UNIQUE,
          tipo VARCHAR(80) NOT NULL,
          severidad VARCHAR(30) NOT NULL DEFAULT 'advertencia',
          estado VARCHAR(30) NOT NULL DEFAULT 'abierto',
          titulo VARCHAR(191) NOT NULL,
          detalle TEXT NOT NULL,
          fuente VARCHAR(80) NOT NULL DEFAULT 'sistema',
          ocurrencias INT NOT NULL DEFAULT 1,
          detectado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          ultimo_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          resuelto_en DATETIME NULL,
          resuelto_por VARCHAR(191) NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      await conexion.query(`
        CREATE TABLE IF NOT EXISTS controles_operativos_cms (
          clave VARCHAR(191) PRIMARY KEY,
          categoria VARCHAR(80) NOT NULL,
          estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
          detalle TEXT NOT NULL,
          evidencia TEXT NOT NULL,
          actualizado_por VARCHAR(191) NULL,
          actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      const indices = [
        ['ejecuciones_sistema_trabajo_fecha', 'ejecuciones_sistema', 'trabajo, iniciada_en'],
        ['ejecuciones_sistema_estado_fecha', 'ejecuciones_sistema', 'estado, iniciada_en'],
        ['incidentes_operativos_estado_fecha', 'incidentes_operativos_cms', 'estado, ultimo_en'],
        ['controles_operativos_categoria', 'controles_operativos_cms', 'categoria, estado'],
      ]
      for (const [nombre, tabla, columnas] of indices) {
        const [filas] = await conexion.execute(
          'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1',
          [tabla, nombre],
        )
        if (!filas.length) await conexion.query(`CREATE INDEX ${nombre} ON ${tabla} (${columnas})`)
      }
    },
  },
  {
    nombre: '0057_ajuste_unidades_feedback',
    async aplicar(conexion) {
      await conexion.query(`INSERT IGNORE INTO unidades_operativas_cms
        (id, clave, nombre, sigla, descripcion, tipo, equipo_id, color, orden, creado_por)
        SELECT 'unidad-daea', 'daea', 'Diplomatura en Acompañamiento en el Espectro Autista', 'DAEA',
          'Formación conjunta organizada mediante proyectos de primer y segundo año.',
          'formacion', id, '#19bf43', 10, 'sistema'
        FROM equipos WHERE clave = 'capacitaciones' LIMIT 1`)
      await conexion.query(`INSERT IGNORE INTO unidades_operativas_cms
        (id, clave, nombre, sigla, descripcion, tipo, equipo_id, color, orden, creado_por)
        SELECT 'unidad-gwp', 'gwp', 'Atención a Familias por WhatsApp', 'GWP',
          'Orientación y acompañamiento a familias por WhatsApp.',
          'canal', id, '#5bc9c3', 30, 'sistema'
        FROM equipos WHERE clave = 'familias' LIMIT 1`)
      for (const tabla of ['proyectos_cms', 'tareas_cms', 'eventos_cms', 'reuniones_cms', 'documentos_cms', 'formularios_cms']) {
        await conexion.query(`UPDATE ${tabla} SET unidad_id = 'unidad-daea', actualizado_en = CURRENT_TIMESTAMP
          WHERE unidad_id IN ('unidad-daea-1', 'unidad-daea-2')`)
      }
      await conexion.query(`INSERT IGNORE INTO unidades_vistas_equipo_cms (unidad_id, equipo_id, enfoque)
        SELECT 'unidad-daea', equipo_id, enfoque FROM unidades_vistas_equipo_cms
        WHERE unidad_id IN ('unidad-daea-1', 'unidad-daea-2')`)
      await conexion.query("DELETE FROM unidades_vistas_equipo_cms WHERE unidad_id IN ('unidad-daea-1', 'unidad-daea-2')")
      await conexion.query(`UPDATE unidades_operativas_cms SET estado = 'archivada', actualizado_en = CURRENT_TIMESTAMP
        WHERE id IN ('unidad-daea-1', 'unidad-daea-2')`)
      await conexion.query("UPDATE unidades_operativas_cms SET orden = 20, actualizado_en = CURRENT_TIMESTAMP WHERE id = 'unidad-fad'")
    },
  },
  {
    nombre: '0058_configuracion_publica_formularios',
    async aplicar(conexion) {
      const [filas] = await conexion.execute(
        'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
        ['formularios_cms', 'configuracion_publica_json'],
      )
      if (!filas.length) await conexion.query("ALTER TABLE formularios_cms ADD COLUMN configuracion_publica_json LONGTEXT NOT NULL DEFAULT '{}'")
    },
  },
  {
    nombre: '0059_permisos_capacidades_cms',
    async aplicar(conexion) {
      await conexion.query(`
        CREATE TABLE IF NOT EXISTS permisos_capacidades_cms (
          id VARCHAR(191) PRIMARY KEY,
          capacidad VARCHAR(80) NOT NULL,
          alcance_tipo VARCHAR(30) NOT NULL,
          alcance_id VARCHAR(191) NOT NULL,
          efecto VARCHAR(30) NOT NULL,
          creado_por VARCHAR(191) NOT NULL,
          creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY permisos_capacidades_unico (capacidad, alcance_tipo, alcance_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      const [indices] = await conexion.execute(
        'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1',
        ['permisos_capacidades_cms', 'permisos_capacidades_busqueda'],
      )
      if (!indices.length) await conexion.query('CREATE INDEX permisos_capacidades_busqueda ON permisos_capacidades_cms (capacidad, alcance_tipo, alcance_id)')
    },
  },
  {
    nombre: '0060_unidad_adultos_autistas',
    async aplicar(conexion) {
      await conexion.query(`INSERT IGNORE INTO unidades_operativas_cms
        (id, clave, nombre, sigla, descripcion, tipo, equipo_id, color, orden, creado_por)
        SELECT 'unidad-adultos-autistas', 'adultos_autistas', 'Adultos autistas', '',
          'Espacio estable de trabajo y acompañamiento para personas adultas autistas.',
          'programa', id, '#662D7D', 40, 'sistema'
        FROM equipos WHERE clave = 'familias' LIMIT 1`)
    },
  },
  {
    nombre: '0061_contenido_web_secciones_separadas',
    async aplicar(conexion) {
      const rutaPublicada = 'pagina-web/publicada.json'
      const [filas] = await conexion.execute(
        'SELECT contenido, revision, actualizado_por FROM documentos WHERE ruta = ? LIMIT 1 FOR UPDATE',
        [rutaPublicada],
      )
      const actual = filas[0]
      if (!actual) return
      let contenidoActual
      try { contenidoActual = JSON.parse(actual.contenido) } catch { return }
      const tituloActual = [contenidoActual?.portada?.tituloAntes, contenidoActual?.portada?.tituloDestacado, contenidoActual?.portada?.tituloDespues].filter(Boolean).join(' ')
      const tieneAdultos = Boolean(contenidoActual?.paginas?.adultosAutistas)
      if (tituloActual !== 'Una sociedad que no resulte discapacitante para nadie.' || tieneAdultos) return

      const contenido = JSON.parse(await readFile(new URL('../assets/pagina-publica-v1.json', import.meta.url), 'utf8'))
      contenido.organizacion.redes = recuperarRedesDesdeHistorial(contenido, [contenidoActual]).contenido.organizacion.redes
      const revisionEditorial = Number(contenidoActual?.editorial?.revision || 0) + 1
      contenido.editorial = { estado: 'publicado', revision: revisionEditorial, actualizadoEn: new Date().toISOString() }
      const serializado = JSON.stringify(contenido)
      const revisionPublicada = Number(actual.revision || 0) + 1
      await conexion.execute(`UPDATE documentos SET contenido = ?, revision = ?, actualizado_por = 'sistema', actualizado_en = CURRENT_TIMESTAMP
        WHERE ruta = ? AND revision = ?`, [serializado, revisionPublicada, rutaPublicada, actual.revision])

      const [borradores] = await conexion.execute(
        "SELECT contenido, revision FROM documentos WHERE ruta = 'pagina-web/borrador.json' LIMIT 1 FOR UPDATE",
      )
      const borrador = borradores[0]
      let borradorAnterior = null
      try { borradorAnterior = borrador ? JSON.parse(borrador.contenido) : null } catch {}
      const tituloBorrador = [borradorAnterior?.portada?.tituloAntes, borradorAnterior?.portada?.tituloDestacado, borradorAnterior?.portada?.tituloDespues].filter(Boolean).join(' ')
      if (!borrador || tituloBorrador === tituloActual) {
        await conexion.execute(`INSERT INTO documentos (ruta, contenido, revision, actualizado_por, actualizado_en)
          VALUES ('pagina-web/borrador.json', ?, ?, 'sistema', CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE contenido = VALUES(contenido), revision = VALUES(revision), actualizado_por = 'sistema', actualizado_en = CURRENT_TIMESTAMP`,
        [serializado, Number(borrador?.revision || 0) + 1])
      }
      await conexion.execute(`INSERT INTO documentos (ruta, contenido, revision, actualizado_por, actualizado_en)
        VALUES (?, ?, ?, 'sistema', CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE contenido = VALUES(contenido), revision = VALUES(revision), actualizado_por = 'sistema', actualizado_en = CURRENT_TIMESTAMP`,
      [`pagina-web/historial/${String(revisionEditorial).padStart(6, '0')}.json`, serializado, revisionEditorial])
    },
  },
  {
    nombre: '0062_recuperar_redes_web_del_historial',
    async aplicar(conexion) {
      const rutaPublicada = 'pagina-web/publicada.json'
      const [filas] = await conexion.execute(
        'SELECT contenido, revision FROM documentos WHERE ruta = ? LIMIT 1 FOR UPDATE',
        [rutaPublicada],
      )
      const actual = filas[0]
      if (!actual) return
      let contenidoActual
      try { contenidoActual = JSON.parse(actual.contenido) } catch { return }
      const [historial] = await conexion.query(
        "SELECT contenido FROM documentos WHERE ruta LIKE 'pagina-web/historial/%.json' ORDER BY ruta DESC LIMIT 20",
      )
      const recuperacion = recuperarRedesDesdeHistorial(contenidoActual, historial.map((fila) => fila.contenido))
      if (!recuperacion.cambios) return

      const revisionEditorial = Number(contenidoActual?.editorial?.revision || 0) + 1
      recuperacion.contenido.editorial = { estado: 'publicado', revision: revisionEditorial, actualizadoEn: new Date().toISOString() }
      const serializado = JSON.stringify(recuperacion.contenido)
      await conexion.execute(`UPDATE documentos SET contenido = ?, revision = ?, actualizado_por = 'sistema', actualizado_en = CURRENT_TIMESTAMP
        WHERE ruta = ? AND revision = ?`, [serializado, Number(actual.revision || 0) + 1, rutaPublicada, actual.revision])
      await conexion.execute(`INSERT INTO documentos (ruta, contenido, revision, actualizado_por, actualizado_en)
        VALUES (?, ?, ?, 'sistema', CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE contenido = VALUES(contenido), revision = VALUES(revision), actualizado_por = 'sistema', actualizado_en = CURRENT_TIMESTAMP`,
      [`pagina-web/historial/${String(revisionEditorial).padStart(6, '0')}.json`, serializado, revisionEditorial])

      const [borradores] = await conexion.execute(
        "SELECT contenido, revision FROM documentos WHERE ruta = 'pagina-web/borrador.json' LIMIT 1 FOR UPDATE",
      )
      const borrador = borradores[0]
      if (!borrador) return
      let contenidoBorrador
      try { contenidoBorrador = JSON.parse(borrador.contenido) } catch { return }
      const borradorRecuperado = recuperarRedesDesdeHistorial(contenidoBorrador, historial.map((fila) => fila.contenido))
      if (!borradorRecuperado.cambios) return
      await conexion.execute(`UPDATE documentos SET contenido = ?, revision = ?, actualizado_por = 'sistema', actualizado_en = CURRENT_TIMESTAMP
        WHERE ruta = 'pagina-web/borrador.json' AND revision = ?`,
      [JSON.stringify(borradorRecuperado.contenido), Number(borrador.revision || 0) + 1, borrador.revision])
    },
  },
  {
    nombre: '0063_metricas_ayuda_sin_resultados',
    async aplicar(conexion) {
      await conexion.query(`
        CREATE TABLE IF NOT EXISTS metricas_ayuda_sin_resultados (
          fecha DATE NOT NULL,
          consulta VARCHAR(191) NOT NULL,
          cantidad INT NOT NULL DEFAULT 1,
          actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (fecha, consulta),
          INDEX metricas_ayuda_consulta_fecha (consulta, fecha)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
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
