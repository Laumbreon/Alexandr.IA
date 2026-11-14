const { readdir, readFile } = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createPool, loadEnvironment } = require('../backend/db/pool');

async function readMigrations(directory = path.join(__dirname, '..', 'database', 'migrations')) {
  const files = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort();
  if (files.some((name) => !/^\d{3}_[a-z_]+\.sql$/.test(name))) {
    throw new Error('Nome de migration inválido.');
  }
  if (new Set(files.map((name) => name.slice(0, 3))).size !== files.length) {
    throw new Error('Numeração de migration duplicada.');
  }
  return Promise.all(files.map(async (name) => {
    const sql = await readFile(path.join(directory, name), 'utf8');
    return { name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
  }));
}

async function migrate(pool, migrations) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // O lock transacional serializa duas execuções simultâneas no mesmo banco.
    await client.query('SELECT pg_advisory_xact_lock($1)', [130013]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      nome text PRIMARY KEY, checksum text NOT NULL,
      aplicado_em timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    const { rows } = await client.query('SELECT nome, checksum FROM schema_migrations ORDER BY nome');
    // Histórico precisa ser um prefixo exato: não insere migrations antigas posteriormente.
    for (let index = 0; index < rows.length; index++) {
      if (rows[index].nome !== migrations[index]?.name ||
          rows[index].checksum !== migrations[index]?.checksum) {
        throw new Error('Histórico divergente: não edite ou remova migrations aplicadas.');
      }
    }
    const applied = [];
    for (const migration of migrations.slice(rows.length)) {
      await client.query(migration.sql);
      await client.query('INSERT INTO schema_migrations (nome, checksum) VALUES ($1, $2)',
        [migration.name, migration.checksum]);
      applied.push(migration.name);
    }
    await client.query('COMMIT');
    return applied;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  let pool;
  try {
    loadEnvironment();
    pool = createPool();
    const applied = await migrate(pool, await readMigrations());
    console.log('Migrations aplicadas: ' + applied.length);
  } catch {
    console.error('Migration não concluída. Verifique configuração, conexão e histórico SQL.');
    process.exitCode = 1;
  } finally {
    if (pool) await pool.end();
  }
}
if (require.main === module) main();
module.exports = { migrate, readMigrations };
