const { Pool } = require('pg');
const { existsSync } = require('node:fs');
const path = require('node:path');

function loadEnvironment() {
  const filename = path.join(__dirname, '..', '..', '.env');
  if (existsSync(filename)) process.loadEnvFile(filename);
}

function databaseConfig(env = process.env) {
  // Lista explícita impede comandos deste projeto em destinos remotos/produção.
  if (env.NODE_ENV === 'production' || !['development', 'test'].includes(env.DB_ENV)) {
    throw new Error('Configure DB_ENV=development ou test; produção não é permitida.');
  }
  const expected = env.DB_ENV === 'test' ? 'alexandria_test' : 'alexandria_dev';
  if (!['127.0.0.1', '::1'].includes(env.PGHOST) || env.PGDATABASE !== expected) {
    throw new Error('Use host loopback e o banco local correspondente ao ambiente.');
  }
  if (!env.PGUSER) throw new Error('Configure PGUSER explicitamente.');
  const port = Number(env.PGPORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Configure PGPORT entre 1 e 65535.');
  }
  return {
    host: env.PGHOST, port, database: env.PGDATABASE,
    user: env.PGUSER, password: env.PGPASSWORD || '',
    max: 4, connectionTimeoutMillis: 3000, idleTimeoutMillis: 10000,
    statement_timeout: 10000,
    options: '-c search_path=public',
  };
}

function createPool(env = process.env) {
  const pool = new Pool(databaseConfig(env));
  // Erros podem conter dados da conexão; nunca imprimir a mensagem bruta.
  pool.on('error', () => console.error('Conexão ociosa com o banco interrompida.'));
  return pool;
}

module.exports = { loadEnvironment, databaseConfig, createPool };
