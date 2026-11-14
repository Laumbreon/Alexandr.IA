const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { randomBytes, randomUUID } = require('node:crypto');
const { createApp } = require('../backend/app');
const { sessionConfig, COOKIE_NAME, SESSION_MS } = require('../backend/middleware/sessoes');
const { createPool, loadEnvironment } = require('../backend/db/pool');
const { migrate, readMigrations } = require('../scripts/migrate');
const { loginController } = require('../backend/controllers/login.controller');

loadEnvironment();
const enabled = process.env.TEST_DATABASE === 'alexandria_test';
const authEnv = {
  NODE_ENV: 'test', SESSION_SECRET: randomBytes(48).toString('base64url'),
  SESSION_COOKIE_SECURE: 'false', APP_ORIGIN: 'http://localhost:3000',
};
const servers = [];
const emails = [];
const prefix = 'fase15-' + randomUUID();
let pool;
let base;
let current = 0;

async function listen(options = {}, roleTest = false) {
  const app = createApp({
    loginIpLimit: 100, loginAccountLimit: 100, cadastroLimit: 100,
    authEnv, ...options,
  });
  if (roleTest) {
    // Esta rota existe só na instância do teste, nunca no app de produção.
    app.get('/somente-no-teste', ...app.locals.auth.authenticate,
      app.locals.auth.requireRoles('bibliotecario'), (req, res) => res.json({ ok: true }));
  }
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  servers.push({ server, app });
  return 'http://127.0.0.1:' + server.address().port;
}

// Cliente HTTP mínimo: conserva cookies entre solicitações sem imprimi-los.
function client(url) {
  return {
    cookie: '',
    async request(route, options = {}) {
      const headers = { ...options.headers };
      if (this.cookie) headers.Cookie = this.cookie;
      if (options.data !== undefined) headers['Content-Type'] = 'application/json';
      const response = await fetch(url + route, {
        method: options.method || 'GET', headers,
        body: options.data === undefined ? undefined : JSON.stringify(options.data),
        redirect: 'manual',
      });
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) this.cookie = setCookie.split(';')[0];
      return response;
    },
  };
}
function fixture() {
  const email = prefix + '-' + (++current) + '@example.invalid';
  emails.push(email);
  return { nome: 'Pessoa fictícia', email, password: '  frase fictícia de login  ' };
}
async function registered() {
  const data = fixture();
  const jar = client(base);
  const response = await jar.request('/api/cadastro', { method: 'POST', data });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('set-cookie'), null);
  const { rows } = await pool.query('SELECT id FROM usuarios WHERE email=$1', [data.email]);
  return { data, jar, id: rows[0].id };
}
async function login(jar, data) {
  return jar.request('/login', { method: 'POST', data: { email: data.email, password: data.password } });
}
async function sessionRow(id) {
  const { rows } = await pool.query("SELECT sid,sess,expire FROM sessoes WHERE sess->>'userId'=$1 ORDER BY expire DESC", [id]);
  return rows[0];
}
function integration(name, callback) {
  test(name, { skip: enabled ? false : 'Configure PostgreSQL isolado explicitamente.' }, callback);
}
before(async () => {
  if (!enabled) return;
  assert.equal(process.env.DB_ENV, 'test');
  assert.equal(process.env.PGDATABASE, 'alexandria_test');
  pool = createPool();
  await migrate(pool, await readMigrations());
  base = await listen({ getPool: () => pool }, true);
});
after(async () => {
  for (const { server, app } of servers) {
    await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
    await app.locals.closeDatabase();
  }
  if (pool) {
    try {
      await pool.query("DELETE FROM sessoes WHERE sess->>'userId' IN (SELECT id::text FROM usuarios WHERE email=ANY($1::text[]))", [emails]);
      await pool.query('DELETE FROM alunos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email=ANY($1::text[]))', [emails]);
      await pool.query('DELETE FROM usuarios WHERE email=ANY($1::text[])', [emails]);
    } finally { await pool.end(); }
  }
});

test('configuração de sessão exige segredo, HttpOnly, SameSite, TTL e Secure apropriado', () => {
  assert.throws(() => sessionConfig({ NODE_ENV: 'test' }));
  const local = sessionConfig(authEnv);
  assert.equal(local.name, COOKIE_NAME);
  assert.equal(local.cookie.httpOnly, true);
  assert.equal(local.cookie.sameSite, 'lax');
  assert.equal(local.cookie.maxAge, SESSION_MS);
  assert.equal(local.cookie.secure, false);
  assert.equal(sessionConfig({ ...authEnv, SESSION_COOKIE_SECURE: 'true' }).cookie.secure, true);
  assert.equal(sessionConfig({ ...authEnv, NODE_ENV: 'production', SESSION_COOKIE_SECURE: 'true' }).cookie.secure, true);
  assert.throws(() => sessionConfig({ ...authEnv, NODE_ENV: 'production' }));
});

test('regeneração em HTTPS conserva Secure mesmo na configuração HTTP local', async () => {
  const req = {
    secure: true, loginData: {},
    session: {
      regenerate(callback) {
        req.session = { cookie: { secure: false }, save: (done) => done() };
        callback();
      },
    },
  };
  const res = {
    set() { return this; },
    status(value) { this.statusCode = value; return this; },
    json() { return this; },
  };
  await loginController(async () => '123', { token: () => randomBytes(32).toString('hex') })(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(req.session.cookie.secure, true);
});

test('páginas e health funcionam sem banco/segredo; me exige autenticação', async () => {
  const url = await listen({
    authEnv: { NODE_ENV: 'test' },
    getPool: () => { throw new Error('não deve ser consultado pelas páginas'); },
  });
  const jar = client(url);
  for (const route of ['/login', '/cadastro', '/api/health']) {
    assert.equal((await jar.request(route)).status, 200);
  }
  for (const route of ['/api/me', '/api/csrf', '/area', '/area.js']) {
    assert.equal((await jar.request(route)).status, 401);
  }
  assert.equal((await login(jar, fixture())).status, 503);
});

test('login rejeita tipos, campos extras, JSON inválido e origem cruzada', async () => {
  const url = await listen();
  const jar = client(url);
  for (const data of [
    {}, [], { email: 'invalido', password: 'teste' },
    { email: 'x@example.invalid', password: {} },
    { email: 'x@example.invalid', password: 'a'.repeat(129) },
    { email: 'x@example.invalid', password: 'teste', perfil: 'administrador' },
  ]) {
    assert.equal((await jar.request('/login', { method: 'POST', data })).status, 400);
  }
  assert.equal((await jar.request('/login', {
    method: 'POST', data: fixture(), headers: { Origin: 'https://terceiro.invalid' },
  })).status, 403);
  const malformed = await fetch(url + '/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  });
  assert.equal(malformed.status, 400);
});

test('limite por IP não pode ser contornado trocando o e-mail', async () => {
  const url = await listen({ loginIpLimit: 2 });
  const jar = client(url);
  for (let index = 0; index < 3; index++) {
    const response = await jar.request('/login', { method: 'POST', data: {} });
    assert.equal(response.status, index < 2 ? 400 : 429);
    if (index === 2) assert.ok(Number(response.headers.get('retry-after')) > 0);
  }
});

test('limite por identificador normaliza e-mail sem bloquear permanentemente', async () => {
  const url = await listen({
    loginAccountLimit: 2,
    getPool: () => ({ query: async () => ({ rows: [] }) }),
  });
  const jar = client(url);
  for (const [index, email] of ['ficticio@example.invalid', ' FICTICIO@example.invalid ', 'ficticio@example.invalid'].entries()) {
    const response = await login(jar, { email, password: 'frase fictícia longa' });
    assert.equal(response.status, index < 2 ? 401 : 429);
    if (index === 2) assert.ok(Number(response.headers.get('retry-after')) > 0);
  }
});

test('falha PostgreSQL no login é pública e genérica', async () => {
  const url = await listen({
    getPool: () => ({ query: async () => { throw Object.assign(new Error('detalhe-privado'), { code: 'ECONNREFUSED' }); } }),
  });
  const response = await login(client(url), fixture());
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes('detalhe-privado'), false);
});

integration('login correto cria sessão persistente mínima e cookie protegido', async () => {
  const { data, jar, id } = await registered();
  const response = await login(jar, data);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, redirect: '/painel/' });
  const cookie = response.headers.get('set-cookie');
  assert.ok(cookie.includes('HttpOnly') && cookie.includes('SameSite=Lax') && cookie.includes('Path=/'));
  assert.equal(cookie.includes('Secure'), false);
  const row = await sessionRow(id);
  assert.ok(row);
  assert.deepEqual(Object.keys(row.sess).sort(), ['authExpiresAt', 'cookie', 'csrfToken', 'userId'].sort());
  assert.equal(row.sess.userId, id);
  assert.ok(row.expire.getTime() > Date.now() && row.expire.getTime() <= Date.now() + SESSION_MS + 1000);
});

integration('me retorna somente id, nome, email e perfil; área temporária está protegida', async () => {
  const { data, jar, id } = await registered();
  assert.equal((await login(jar, data)).status, 200);
  const response = await jar.request('/api/me');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { id, nome: data.nome, email: data.email, perfil: 'aluno' });
  const area = await jar.request('/area');
  assert.equal(area.status, 200);
  assert.ok((await area.text()).includes('Área autenticada temporária'));
  assert.equal((await jar.request('/area.js')).status, 200);
});

integration('senha incorreta, e-mail inexistente e conta inativa têm resposta idêntica', async () => {
  const { data, id } = await registered();
  const responses = [];
  for (const input of [
    { ...data, password: 'outra senha fictícia' },
    { ...data, email: 'inexistente-' + randomUUID() + '@example.invalid' },
  ]) {
    const jar = client(base);
    const response = await login(jar, input);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('set-cookie'), null);
    responses.push(await response.json());
  }
  await pool.query('UPDATE usuarios SET ativo=false WHERE id=$1', [id]);
  const response = await login(client(base), data);
  assert.equal(response.status, 401);
  responses.push(await response.json());
  assert.ok(responses.every((body) => JSON.stringify(body) === JSON.stringify(responses[0])));
});

integration('login normaliza caixa e espaços do e-mail e preserva espaços da senha', async () => {
  const { data, jar } = await registered();
  assert.equal((await login(jar, { ...data, email: ' ' + data.email.toUpperCase() + ' ' })).status, 200);
  assert.equal((await login(client(base), { ...data, password: data.password.trim() })).status, 401);
});

integration('novo login regenera ID, remove sessão anterior e troca token CSRF', async () => {
  const { data, jar, id } = await registered();
  assert.equal((await login(jar, data)).status, 200);
  const previous = await sessionRow(id);
  const oldCookie = jar.cookie;
  assert.equal((await login(jar, data)).status, 200);
  const renewed = await sessionRow(id);
  assert.ok(previous.sid !== renewed.sid);
  assert.ok(previous.sess.csrfToken !== renewed.sess.csrfToken);
  assert.ok(oldCookie !== jar.cookie);
  assert.equal((await pool.query('SELECT count(*) FROM sessoes WHERE sid=$1', [previous.sid])).rows[0].count, '0');
  const stale = client(base);
  stale.cookie = oldCookie;
  assert.equal((await stale.request('/api/me')).status, 401);
});

integration('sessão persiste após recriar a aplicação com mesmo segredo e banco', async () => {
  const { data, jar } = await registered();
  assert.equal((await login(jar, data)).status, 200);
  const second = client(await listen({ getPool: () => pool }));
  second.cookie = jar.cookie;
  assert.equal((await second.request('/api/me')).status, 200);
});

integration('sessão expirada no banco não autentica mesmo com cookie antigo', async () => {
  const { data, jar, id } = await registered();
  assert.equal((await login(jar, data)).status, 200);
  const row = await sessionRow(id);
  await pool.query('UPDATE sessoes SET expire=$1 WHERE sid=$2', [new Date(Date.now() - 10000), row.sid]);
  assert.equal((await jar.request('/api/me')).status, 401);
});

integration('prazo absoluto não é estendido pela atividade', async () => {
  const { data, jar, id } = await registered();
  assert.equal((await login(jar, data)).status, 200);
  const row = await sessionRow(id);
  assert.equal((await jar.request('/api/me')).status, 200);
  const unchanged = await sessionRow(id);
  assert.equal(unchanged.sess.authExpiresAt, row.sess.authExpiresAt);
  assert.equal(unchanged.expire.getTime(), row.expire.getTime());
  await pool.query("UPDATE sessoes SET sess=jsonb_set(sess::jsonb,'{authExpiresAt}',to_jsonb($1::bigint))::json WHERE sid=$2",
    [Date.now() - 10000, row.sid]);
  assert.equal((await jar.request('/api/me')).status, 401);
  assert.equal((await pool.query('SELECT count(*) FROM sessoes WHERE sid=$1', [row.sid])).rows[0].count, '0');
});

integration('sessão invalidada ou cookie adulterado não autentica', async () => {
  const { data, jar, id } = await registered();
  assert.equal((await login(jar, data)).status, 200);
  const row = await sessionRow(id);
  const tampered = client(base);
  tampered.cookie = jar.cookie + 'alterado';
  assert.equal((await tampered.request('/api/me')).status, 401);
  await pool.query('DELETE FROM sessoes WHERE sid=$1', [row.sid]);
  assert.equal((await jar.request('/api/me')).status, 401);
});

integration('logout exige CSRF, destrói sessão e limpa o cookie', async () => {
  const { data, jar, id } = await registered();
  assert.equal((await login(jar, data)).status, 200);
  const row = await sessionRow(id);
  for (const token of [undefined, 'invalido', 'á'.repeat(64)]) {
    const headers = token ? { 'X-CSRF-Token': token } : {};
    assert.equal((await jar.request('/logout', { method: 'POST', headers })).status, 403);
  }
  assert.equal((await jar.request('/api/me')).status, 200);
  const csrfResponse = await jar.request('/api/csrf');
  assert.equal(csrfResponse.status, 200);
  const { csrfToken } = await csrfResponse.json();
  const previousCookie = jar.cookie;
  const response = await jar.request('/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken } });
  assert.equal(response.status, 200);
  assert.ok(response.headers.get('set-cookie').startsWith(COOKIE_NAME + '=;'));
  assert.ok(response.headers.get('set-cookie').includes('HttpOnly'));
  assert.equal((await pool.query('SELECT count(*) FROM sessoes WHERE sid=$1', [row.sid])).rows[0].count, '0');
  jar.cookie = previousCookie;
  assert.equal((await jar.request('/api/me')).status, 401);
  assert.equal((await jar.request('/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken } })).status, 401);
});

integration('CSRF válido não permite logout com origem externa', async () => {
  const { data, jar } = await registered();
  assert.equal((await login(jar, data)).status, 200);
  const { csrfToken } = await (await jar.request('/api/csrf')).json();
  assert.equal((await jar.request('/logout', {
    method: 'POST', headers: { 'X-CSRF-Token': csrfToken, Origin: 'https://terceiro.invalid' },
  })).status, 403);
  assert.equal((await jar.request('/api/me')).status, 200);
});

integration('middleware rejeita perfil inadequado e revalida perfil atual', async () => {
  const { data, jar, id } = await registered();
  assert.equal((await login(jar, data)).status, 200);
  assert.equal((await jar.request('/somente-no-teste')).status, 403);
  // Apenas esta fixture é alterada; não existe endpoint administrativo público.
  await pool.query('DELETE FROM alunos WHERE usuario_id=$1', [id]);
  await pool.query("UPDATE usuarios SET perfil='bibliotecario' WHERE id=$1", [id]);
  assert.equal((await jar.request('/somente-no-teste')).status, 200);
  assert.equal((await (await jar.request('/api/me')).json()).perfil, 'bibliotecario');
});

integration('desativação revoga acesso imediatamente sem depender do cookie', async () => {
  const { data, jar, id } = await registered();
  assert.equal((await login(jar, data)).status, 200);
  await pool.query('UPDATE usuarios SET ativo=false WHERE id=$1', [id]);
  assert.equal((await jar.request('/api/me')).status, 401);
  assert.ok((await sessionRow(id)) === undefined);
});

integration('cookie Secure não é enviado em HTTP mesmo com X-Forwarded-Proto', async () => {
  const { data } = await registered();
  const url = await listen({ getPool: () => pool, authEnv: { ...authEnv, SESSION_COOKIE_SECURE: 'true' } });
  const jar = client(url);
  const response = await jar.request('/login', {
    method: 'POST', data: { email: data.email, password: data.password },
    headers: { 'X-Forwarded-Proto': 'https' },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal((await jar.request('/api/me')).status, 401);
});

integration('falha de leitura da sessão retorna 503 sem detalhes privados', async () => {
  const { data, jar } = await registered();
  assert.equal((await login(jar, data)).status, 200);
  const url = await listen({ getPool: () => ({
    query: async () => { throw Object.assign(new Error('segredo-interno'), { code: 'ECONNREFUSED' }); },
  }) });
  const failed = client(url);
  failed.cookie = jar.cookie;
  const response = await failed.request('/api/me');
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes('segredo-interno'), false);
});

integration('falha ao persistir sessão não retorna sucesso nem emite cookie', async () => {
  const { data } = await registered();
  const url = await listen({ getPool: () => ({
    query: (sql, values) => {
      if (sql.startsWith('INSERT INTO "public"."sessoes"')) {
        throw Object.assign(new Error('detalhe-privado'), { code: 'ECONNREFUSED' });
      }
      return pool.query(sql, values);
    },
  }) });
  const response = await login(client(url), data);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal((await response.text()).includes('detalhe-privado'), false);
});

integration('falha ao excluir sessão não declara logout bem-sucedido', async () => {
  const { data } = await registered();
  let failDestroy = false;
  const url = await listen({ getPool: () => ({
    query: (sql, values) => {
      if (failDestroy && sql.startsWith('DELETE FROM "public"."sessoes"')) {
        throw Object.assign(new Error('detalhe-privado'), { code: 'ECONNREFUSED' });
      }
      return pool.query(sql, values);
    },
  }) });
  const jar = client(url);
  assert.equal((await login(jar, data)).status, 200);
  const { csrfToken } = await (await jar.request('/api/csrf')).json();
  failDestroy = true;
  const response = await jar.request('/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken } });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal((await response.json()).success, false);
  assert.equal((await jar.request('/api/me')).status, 200);
});

integration('custo de verificação existe para e-mail conhecido e desconhecido', async () => {
  const { data } = await registered();
  const measurements = [];
  // Observação de desempenho, sem assertiva instável de tempos idênticos.
  for (const email of [data.email, prefix + '-ausente@example.invalid']) {
    const start = performance.now();
    const response = await login(client(base), { email, password: 'senha fictícia incorreta' });
    assert.equal(response.status, 401);
    measurements.push(Math.round(performance.now() - start));
  }
  console.log('Verificações Argon2 conhecido/desconhecido (ms): ' + measurements.join('/'));
});
