const { loadEnvironment, createPool } = require('../backend/db/pool');

async function checkDatabase(pool) {
  const { rows } = await pool.query('SELECT $1::text AS status', ['ok']);
  return rows[0].status;
}

async function main() {
  let pool;
  try {
    loadEnvironment();
    pool = createPool();
    console.log('Conectividade PostgreSQL: ' + await checkDatabase(pool));
  } catch {
    console.error('Banco indisponível ou configuração local inválida. Credenciais não são exibidas.');
    process.exitCode = 1;
  } finally {
    if (pool) await pool.end();
  }
}
if (require.main === module) main();
module.exports = { checkDatabase };
