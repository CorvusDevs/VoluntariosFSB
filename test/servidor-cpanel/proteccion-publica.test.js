import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('protección del directorio público en cPanel', () => {
  it('bloquea código de servidor, paquetes, registros y migraciones', () => {
    const reglas = readFileSync('servidor-cpanel/proteccion-publica.htaccess', 'utf8')
    for (const protegido of ['servidor-cpanel', 'functions', 'migrations', 'dist', 'tmp', 'app\\.js', 'package', 'MANIFEST\\.sha256', 'stderr\\.log', 'php\\.ini', '\\.sql', '\\.cjs', '\\.zip']) {
      expect(reglas).toContain(protegido)
    }
    expect(reglas).not.toMatch(/DB_PASSWORD|SESSION_SECRET|SetEnv/)
  })
})
