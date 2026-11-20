const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { once } = require('node:events');
const { createHash } = require('node:crypto');
const { databaseConfig, createPool, loadEnvironment } = require('../backend/db/pool');
const { migrate, readMigrations } = require('../scripts/migrate');
const { checkDatabase } = require('../scripts/db-check');

const config = {
  NODE_ENV: 'test', DB_ENV: 'test', PGHOST: '127.0.0.1',
  PGPORT: '5432', PGDATABASE: 'alexandria_test', PGUSER: 'teste',
};

test('configuração rejeita produção, host remoto e banco não autorizado', () => {
  for (const change of [
    { NODE_ENV: 'production' }, { DB_ENV: '' }, { PGHOST: 'example.com' },
    { PGDATABASE: 'postgres' }, { PGPORT: '0' }, { PGUSER: '' },
  ]) assert.throws(() => databaseConfig({ ...config, ...change }));
  assert.equal(databaseConfig(config).database, 'alexandria_test');
});

test('migrations possuem ordem e checksums estáveis', async () => {
  const migrations = await readMigrations();
  assert.deepEqual(migrations.map((m) => m.name), ['001_create_usuarios.sql', '002_create_alunos.sql', '003_create_sessoes.sql', '004_create_acervo.sql', '005_create_vinculo_leitor.sql', '006_create_circulacao.sql', '007_create_reservas.sql', '008_complete_catalogo_estoque.sql']);
  for (const migration of migrations) {
    assert.equal(migration.checksum, createHash('sha256').update(migration.sql).digest('hex'));
  }
});

test('falha real de conexão é propagada e pool pode ser encerrado', async () => {
  const socket = net.createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  const pool = createPool({ ...config, PGPORT: String(port) });
  try {
    await assert.rejects(() => checkDatabase(pool));
  } finally {
    await pool.end();
  }
});

loadEnvironment();
const enabled = process.env.TEST_DATABASE === 'alexandria_test';
let pool;
before(async () => {
  if (!enabled) return;
  assert.equal(process.env.DB_ENV, 'test');
  assert.equal(process.env.PGDATABASE, 'alexandria_test');
  pool = createPool();
  await migrate(pool, await readMigrations());
});
after(async () => { if (pool) await pool.end(); });

function integration(name, callback) {
  test(name, { skip: enabled ? false : 'Configure explicitamente TEST_DATABASE=alexandria_test e DB_ENV=test.' }, callback);
}

// Cada caso de integridade usa transação revertida, sem apagar dados existentes.
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await callback(client);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
}
async function user(client, profile = 'aluno', email = 'ficticio@example.invalid') {
  const result = await client.query(
    'INSERT INTO usuarios (nome,email,senha_hash,perfil) VALUES ($1,$2,$3,$4) RETURNING id',
    ['Pessoa fictícia', email, 'marcador-de-teste-nao-e-hash-real', profile]);
  return result.rows[0].id;
}

integration('PostgreSQL: conexão e consulta parametrizada', async () => {
  assert.equal(await checkDatabase(pool), 'ok');
  const value = "'; DROP TABLE usuarios; --";
  assert.equal((await pool.query('SELECT $1::text AS valor', [value])).rows[0].valor, value);
});

integration('PostgreSQL: colunas, tipos e chaves primárias', async () => {
  const { rows } = await pool.query(
    "SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('usuarios','alunos')");
  for (const column of ['id', 'nome', 'email', 'senha_hash', 'perfil', 'ativo', 'criado_em', 'atualizado_em']) {
    assert.ok(rows.some((r) => r.table_name === 'usuarios' && r.column_name === column));
  }
  assert.ok(rows.some((r) => r.table_name === 'alunos' && r.column_name === 'ra' && r.data_type === 'text'));
  const keys = await pool.query(
    "SELECT tablename, indexdef FROM pg_indexes WHERE schemaname='public' AND indexname IN ('usuarios_pkey','alunos_pkey')");
  assert.equal(keys.rows.length, 2);
  assert.ok(keys.rows.every((r) => /UNIQUE INDEX/.test(r.indexdef)));
});

integration('PostgreSQL: email único sem distinção de caixa', async () => {
  await transaction(async (client) => {
    await user(client);
    await assert.rejects(() => user(client, 'aluno', 'FICTICIO@example.invalid'), { code: '23505' });
  });
});

integration('PostgreSQL: RA único quando preenchido', async () => {
  await transaction(async (client) => {
    const first = await user(client);
    const second = await user(client, 'aluno', 'outra@example.invalid');
    await client.query('INSERT INTO alunos (usuario_id,ra) VALUES ($1,$2)', [first, '00123']);
    assert.equal((await client.query('SELECT ra FROM alunos WHERE usuario_id=$1', [first])).rows[0].ra, '00123');
    await assert.rejects(() => client.query('INSERT INTO alunos (usuario_id,ra) VALUES ($1,$2)', [second, '00123']), { code: '23505' });
  });
});

integration('PostgreSQL: múltiplos RAs nulos são permitidos', async () => {
  await transaction(async (client) => {
    for (const email of ['um@example.invalid', 'dois@example.invalid']) {
      const id = await user(client, 'aluno', email);
      await client.query('INSERT INTO alunos (usuario_id) VALUES ($1)', [id]);
    }
  });
});

integration('PostgreSQL: perfil inválido é rejeitado', async () => {
  await transaction(async (client) => {
    await assert.rejects(() => user(client, 'invalido'), { code: '23514' });
  });
});

integration('PostgreSQL: campos obrigatórios e textos vazios são rejeitados', async () => {
  for (const [name, email, hash, code] of [
    [null, 'a@example.invalid', 'marcador', '23502'],
    [' ', 'a@example.invalid', 'marcador', '23514'],
    ['Pessoa', null, 'marcador', '23502'],
    ['Pessoa', 'invalido', 'marcador', '23514'],
    ['Pessoa', 'a@example.invalid', '', '23514'],
  ]) {
    await transaction(async (client) => {
      await assert.rejects(() => client.query(
        "INSERT INTO usuarios (nome,email,senha_hash,perfil) VALUES ($1,$2,$3,'aluno')",
        [name, email, hash]), { code });
    });
  }
});

integration('PostgreSQL: aluno não pode referenciar usuário inexistente', async () => {
  await transaction(async (client) => {
    await assert.rejects(() => client.query('INSERT INTO alunos (usuario_id) VALUES ($1)', [-1]), { code: '23503' });
  });
});

integration('PostgreSQL: ficha acadêmica exige perfil aluno', async () => {
  await transaction(async (client) => {
    const id = await user(client, 'bibliotecario');
    await assert.rejects(() => client.query('INSERT INTO alunos (usuario_id) VALUES ($1)', [id]), { code: '23503' });
  });
});

integration('PostgreSQL: aluno é um para um e bloqueia exclusão do usuário', async () => {
  for (const operation of ['duplicate', 'delete', 'profile']) {
    await transaction(async (client) => {
      const id = await user(client);
      await client.query('INSERT INTO alunos (usuario_id) VALUES ($1)', [id]);
      const sql = operation === 'duplicate' ? 'INSERT INTO alunos (usuario_id) VALUES ($1)'
        : operation === 'delete' ? 'DELETE FROM usuarios WHERE id=$1'
          : "UPDATE usuarios SET perfil='administrador' WHERE id=$1";
      await assert.rejects(() => client.query(sql, [id]), { code: operation === 'duplicate' ? '23505' : '23503' });
    });
  }
});

integration('PostgreSQL: atualizado_em acompanha alterações', async () => {
  await transaction(async (client) => {
    const id = await user(client);
    await client.query('UPDATE usuarios SET atualizado_em=$1 WHERE id=$2', ['2000-01-01', id]);
    const { rows } = await client.query('SELECT atualizado_em, ativo FROM usuarios WHERE id=$1', [id]);
    assert.ok(rows[0].atualizado_em.getFullYear() > 2000);
    assert.equal(rows[0].ativo, true);
  });
});

integration('PostgreSQL: migrations não duplicam e detectam alteração de histórico', async () => {
  const migrations = await readMigrations();
  assert.deepEqual(await migrate(pool, migrations), []);
  await assert.rejects(() => migrate(pool, [{ ...migrations[0], checksum: 'alterado' }, migrations[1]]), /Histórico divergente/);
  assert.equal((await pool.query('SELECT count(*) FROM schema_migrations')).rows[0].count, String(migrations.length));
});

integration('PostgreSQL: falha SQL reverte todo o lote e seu registro', async () => {
  const migrations = await readMigrations();
  await assert.rejects(() => migrate(pool, [...migrations,
    { name: '004_teste.sql', checksum: 'teste', sql: 'CREATE TABLE teste_rollback (id integer)' },
    { name: '005_falha.sql', checksum: 'teste', sql: 'SELECT coluna_inexistente FROM usuarios' },
  ]), { code: '42703' });
  assert.equal((await pool.query("SELECT to_regclass('public.teste_rollback') AS tabela")).rows[0].tabela, null);
  assert.equal((await pool.query('SELECT count(*) FROM schema_migrations')).rows[0].count, String(migrations.length));
});
