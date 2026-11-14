const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
const argon2 = require('argon2');
const { createApp } = require('../backend/app');
const { createPool, loadEnvironment } = require('../backend/db/pool');
const { migrate, readMigrations } = require('../scripts/migrate');

loadEnvironment();
const enabled = process.env.TEST_DATABASE === 'alexandria_test';
let pool;
const emails = [];
const servers = [];
const prefix = 'fase14-' + randomUUID();
let counter = 0;
function payload(overrides = {}) {
  const email = prefix + '-' + (++counter) + '@example.invalid';
  emails.push(email);
  return { nome: 'Estudante fictício', email, password: '  frase de teste segura  ', ...overrides };
}
async function listen(options = {}) {
  const app = createApp({ cadastroLimit: 100, ...options });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  servers.push({ server, app });
  return 'http://127.0.0.1:' + server.address().port;
}
async function post(url, data) {
  const response = await fetch(url + '/api/cadastro', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await response.json();
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(response.headers.get('location'), null);
  assert.equal(JSON.stringify(body).includes('senha_hash'), false);
  assert.equal(JSON.stringify(body).includes('argon2id'), false);
  return { response, body };
}
let validationUrl;
let integrationUrl;
before(async () => {
  validationUrl = await listen();
  if (!enabled) return;
  assert.equal(process.env.DB_ENV, 'test');
  assert.equal(process.env.PGDATABASE, 'alexandria_test');
  pool = createPool();
  await migrate(pool, await readMigrations());
  integrationUrl = await listen({ getPool: () => pool });
});
after(async () => {
  for (const { server, app } of servers) {
    await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
    await app.locals.closeDatabase();
  }
  if (pool) {
    try {
      // Remove apenas fixtures identificadas por e-mails aleatórios desta execução.
      await pool.query('DELETE FROM alunos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = ANY($1::text[]))', [emails]);
      await pool.query('DELETE FROM usuarios WHERE email = ANY($1::text[])', [emails]);
    } finally { await pool.end(); }
  }
});
function integration(name, callback) {
  test(name, { skip: enabled ? false : 'Banco isolado não configurado explicitamente.' }, callback);
}

for (const [name, overrides] of [
  ['sem nome', { nome: '' }],
  ['nome de tipo inválido', { nome: {} }],
  ['nome muito longo', { nome: 'a'.repeat(201) }],
  ['nome com NUL incompatível com PostgreSQL', { nome: 'Pessoa' + String.fromCharCode(0) }],
  ['e-mail inválido', { email: 'invalido' }],
  ['e-mail de tipo inválido', { email: [] }],
  ['senha ausente', { password: undefined }],
  ['senha de tipo inválido', { password: 12345 }],
  ['senha curta', { password: '12345678901234' }],
  ['senha longa', { password: 'a'.repeat(129) }],
  ['senha com somente 14 pontos Unicode', { password: '😀'.repeat(14) }],
  ['senha com 129 pontos Unicode', { password: '😀'.repeat(129) }],
  ['confirmação divergente', { confirm_password: 'outra senha longa' }],
  ['perfil administrador', { perfil: 'administrador' }],
  ['ativo enviado', { ativo: true }],
  ['hash enviado', { senha_hash: 'proibido' }],
  ['permissões enviadas', { permissoes: ['admin'] }],
  ['RA numérico', { ra: 123 }],
  ['RA longo', { ra: '1'.repeat(51) }],
  ['curso de tipo inválido', { curso: {} }],
]) {
  test('HTTP 400: ' + name, async () => {
    const { response, body } = await post(validationUrl, payload(overrides));
    assert.equal(response.status, 400);
    assert.equal(body.success, false);
  });
}

test('JSON malformado e corpos excessivos recebem erro público seguro', async () => {
  for (const [body, status] of [['{', 400], [JSON.stringify({ nome: 'a'.repeat(9000) }), 413]]) {
    const response = await fetch(validationUrl + '/api/cadastro', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
    });
    assert.equal(response.status, status);
    assert.equal((await response.json()).success, false);
  }
});

test('limitação retorna 429 e Retry-After sem confiar em X-Forwarded-For', async () => {
  const url = await listen({ cadastroLimit: 2 });
  for (let index = 0; index < 3; index++) {
    const response = await fetch(url + '/api/cadastro', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '192.0.2.' + index },
      body: '{}',
    });
    assert.equal(response.status, index < 2 ? 400 : 429);
    if (index === 2) assert.ok(Number(response.headers.get('retry-after')) > 0);
  }
});

test('banco indisponível retorna 503 sem detalhes internos', async () => {
  const url = await listen({ getPool: () => ({
    connect: async () => { throw Object.assign(new Error('segredo-interno'), { code: 'ECONNREFUSED' }); },
  }) });
  const { response, body } = await post(url, payload());
  assert.equal(response.status, 503);
  assert.equal(JSON.stringify(body).includes('segredo-interno'), false);
});

test('falha inesperada retorna 500 genérico', async () => {
  const url = await listen({ getPool: () => { throw new Error('detalhe-interno'); } });
  const { response, body } = await post(url, payload());
  assert.equal(response.status, 500);
  assert.equal(JSON.stringify(body).includes('detalhe-interno'), false);
});

integration('cadastro HTTP válido cria usuário e aluno com Argon2id, sem sessão', async () => {
  const data = payload({ ra: '00' + randomUUID(), curso: 'ADS fictício' });
  const started = performance.now();
  const { response, body } = await post(integrationUrl, data);
  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.message, 'Cadastro realizado. Você já pode entrar com seu e-mail e senha.');
  const { rows } = await pool.query(
    'SELECT u.id,u.senha_hash,u.perfil,u.ativo,a.ra,a.curso FROM usuarios u JOIN alunos a ON a.usuario_id=u.id WHERE u.email=$1', [data.email]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].perfil, 'aluno');
  assert.equal(rows[0].ativo, true);
  assert.equal(rows[0].ra, data.ra);
  assert.equal(rows[0].curso, data.curso);
  assert.ok(rows[0].senha_hash !== data.password);
  assert.ok(rows[0].senha_hash.startsWith('$argon2id$v=19$m=19456,t=2,p=1$'));
  assert.ok(await argon2.verify(rows[0].senha_hash, data.password));
  assert.equal(await argon2.verify(rows[0].senha_hash, data.password.trim()), false);
  console.log('Cadastro HTTP com hash, duração aproximada: ' + Math.round(performance.now() - started) + ' ms');
});

for (const [label, password] of [
  ['15 caracteres', 'a'.repeat(15)],
  ['128 pontos Unicode', '😀'.repeat(128)],
]) {
  integration('cadastro HTTP aceita limite de senha: ' + label, async () => {
    const data = payload({ password });
    const { response, body } = await post(integrationUrl, data);
    assert.equal(response.status, 201);
    assert.deepEqual(body, {
      success: true,
      message: 'Cadastro realizado. Você já pode entrar com seu e-mail e senha.',
    });
    const { rows } = await pool.query('SELECT senha_hash FROM usuarios WHERE email=$1', [data.email]);
    assert.equal(rows.length, 1);
    assert.ok(await argon2.verify(rows[0].senha_hash, password));
  });
}

integration('cadastro sem RA e sem curso aceita confirmação correspondente', async () => {
  const data = payload();
  data.confirm_password = data.password;
  assert.equal((await post(integrationUrl, data)).response.status, 201);
  const { rows } = await pool.query('SELECT a.ra,a.curso FROM alunos a JOIN usuarios u ON u.id=a.usuario_id WHERE u.email=$1', [data.email]);
  assert.deepEqual(rows, [{ ra: null, curso: null }]);
});

integration('normaliza e-mail e rejeita duplicata com caixa diferente', async () => {
  const data = payload();
  assert.equal((await post(integrationUrl, { ...data, email: '  ' + data.email.toUpperCase() + '  ' })).response.status, 201);
  assert.equal((await post(integrationUrl, data)).response.status, 409);
  assert.equal((await pool.query('SELECT count(*) FROM usuarios WHERE email=$1', [data.email])).rows[0].count, '1');
});

integration('RA duplicado causa rollback do usuário da segunda solicitação', async () => {
  const ra = '00' + randomUUID();
  const first = payload({ ra });
  const second = payload({ ra });
  assert.equal((await post(integrationUrl, first)).response.status, 201);
  assert.equal((await post(integrationUrl, second)).response.status, 409);
  assert.equal((await pool.query('SELECT count(*) FROM usuarios WHERE email=$1', [second.email])).rows[0].count, '0');
});

integration('concorrência do mesmo e-mail produz exatamente um cadastro', async () => {
  const data = payload();
  const responses = await Promise.all([post(integrationUrl, data), post(integrationUrl, data)]);
  assert.deepEqual(responses.map((r) => r.response.status).sort(), [201, 409]);
  const result = await pool.query('SELECT count(*) FROM alunos a JOIN usuarios u ON u.id=a.usuario_id WHERE u.email=$1', [data.email]);
  assert.equal(result.rows[0].count, '1');
});

integration('salts aleatórios produzem hashes distintos para senhas iguais', async () => {
  const first = payload();
  const second = payload();
  assert.equal((await post(integrationUrl, first)).response.status, 201);
  assert.equal((await post(integrationUrl, second)).response.status, 201);
  const { rows } = await pool.query('SELECT senha_hash FROM usuarios WHERE email=ANY($1::text[])', [[first.email, second.email]]);
  assert.equal(rows.length, 2);
  assert.ok(rows[0].senha_hash !== rows[1].senha_hash);
});
