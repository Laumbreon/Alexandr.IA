const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { readFile, readdir } = require('node:fs/promises');
const { createHash, randomUUID, randomBytes } = require('node:crypto');
const { once } = require('node:events');
const path = require('node:path');
const { createApp } = require('../backend/app');
const { createPool, loadEnvironment } = require('../backend/db/pool');
const { migrate, readMigrations } = require('../scripts/migrate');

loadEnvironment();
const root = path.join(__dirname, '..');
const dist = path.join(root, 'frontend', 'dist');
const enabled = process.env.TEST_DATABASE === 'alexandria_test';
const env = {
  NODE_ENV: 'test', SESSION_SECRET: randomBytes(48).toString('base64url'),
  SESSION_COOKIE_SECURE: 'false', APP_ORIGIN: 'http://localhost:3000',
};
const emails = [];
const servers = [];
let pool;
let publicUrl;
let integratedUrl;
let html;
let resources;

async function listen(options = {}) {
  const app = createApp({ authEnv: env, cadastroLimit: 100, loginIpLimit: 100, loginAccountLimit: 100, ...options });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  servers.push({ server, app });
  return 'http://127.0.0.1:' + server.address().port;
}
function client(url) {
  return {
    cookie: '',
    async request(route, options = {}) {
      const headers = { ...options.headers };
      if (this.cookie) headers.Cookie = this.cookie;
      if (options.data !== undefined) headers['Content-Type'] = 'application/json';
      const response = await fetch(url + route, {
        method: options.method || 'GET', headers, redirect: 'manual',
        body: options.data === undefined ? undefined : JSON.stringify(options.data),
      });
      const set = response.headers.get('set-cookie');
      if (set) this.cookie = set.split(';')[0];
      return response;
    },
  };
}
async function authenticated() {
  const jar = client(integratedUrl);
  const data = {
    nome: 'Pessoa fictícia do painel', email: 'painel-' + randomUUID() + '@example.invalid',
    password: randomBytes(24).toString('base64url'),
  };
  emails.push(data.email);
  assert.equal((await jar.request('/api/cadastro', { method: 'POST', data })).status, 201);
  const response = await jar.request('/login', { method: 'POST', data: { email: data.email, password: data.password } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).redirect, '/painel/');
  const id = (await pool.query('SELECT id FROM usuarios WHERE email=$1', [data.email])).rows[0].id;
  return { jar, id };
}
async function ownSession(id) {
  return (await pool.query("SELECT sid FROM sessoes WHERE sess->>'userId'=$1", [id])).rows[0].sid;
}
function integration(name, callback) {
  test(name, { skip: enabled ? false : 'Configure explicitamente o banco alexandria_test.' }, callback);
}

before(async () => {
  // Build real é pré-requisito: ausência não pode ser tratada como teste aprovado.
  html = await readFile(path.join(dist, 'index.html'), 'utf8');
  resources = [...new Set([...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]))];
  publicUrl = await listen();
  if (!enabled) return;
  assert.equal(process.env.DB_ENV, 'test');
  assert.equal(process.env.PGDATABASE, 'alexandria_test');
  pool = createPool();
  await migrate(pool, await readMigrations());
  integratedUrl = await listen({ getPool: () => pool });
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

test('históricos Figma são preservados e mudanças B.1/B.2 permanecem encadeadas', async () => {
  const bytes = await readFile(path.join(root, 'docs', 'figma-importacao.sha256.json'));
  const digest = createHash('sha256').update(bytes).digest('hex');
  assert.equal(digest, 'fe5ecf40a67d5539981ce62816f64f33dffc3625ef914406f22a70eefa0cec84');
  const original = JSON.parse(bytes);
  const approved = JSON.parse(await readFile(path.join(root, 'docs', 'figma-alteracoes-2.0b1.sha256.json'), 'utf8'));
  assert.equal(approved.phase, '2.0B.1');
  assert.equal(approved.originalImportManifestSha256, digest);
  assert.deepEqual(Object.keys(approved.changes).sort(), ['.figma/make/site.json', '.mise.toml', 'src/App.tsx', 'vite.config.ts']);
  const previousBytes = await readFile(path.join(root, 'docs', 'figma-alteracoes-2.0b1.sha256.json'));
  const current = JSON.parse(await readFile(path.join(root, 'docs', 'figma-alteracoes-2.0b2.sha256.json'), 'utf8'));
  assert.equal(current.phase, '2.0B.2');
  assert.equal(current.previousManifestSha256, createHash('sha256').update(previousBytes).digest('hex'));
  assert.deepEqual(Object.keys(current.changes).sort(), ['package.json', 'pnpm-lock.yaml', 'src/App.tsx']);
  assert.deepEqual(Object.keys(current.added).sort(), [
    'src/components/AuthGate.tsx', 'src/components/LogoutButton.tsx', 'src/hooks/useAuth.ts', 'src/services/auth.ts',
  ]);
  const b3 = JSON.parse(await readFile(path.join(root, 'docs', 'figma-alteracoes-2.0b3.sha256.json'), 'utf8'));
  assert.equal(b3.phase, '2.0B.3');
  assert.equal(b3.previousManifestSha256, createHash('sha256').update(await readFile(path.join(root, 'docs', 'figma-alteracoes-2.0b2.sha256.json'))).digest('hex'));
  assert.deepEqual(Object.keys(b3.changes).sort(), ['.figma/make/site.json', 'src/App.tsx', 'src/components/AuthGate.tsx', 'src/index.css']);
  assert.deepEqual(Object.keys(b3.added), ['src/hooks/useNavigation.ts']);
  const demo = JSON.parse(await readFile(path.join(root, 'docs', 'figma-alteracoes-demo1.sha256.json'), 'utf8'));
  assert.equal(demo.phase, 'DEMO.1');
  assert.equal(demo.previousManifestSha256, createHash('sha256').update(await readFile(path.join(root, 'docs', 'figma-alteracoes-2.0b3.sha256.json'))).digest('hex'));
  assert.deepEqual(Object.keys(demo.changes).sort(), ['package.json', 'src/App.tsx', 'vite.config.ts']);
  assert.deepEqual(Object.keys(demo.added).sort(), ['src/DemoApp.tsx', 'src/LibraryPanel.tsx', 'src/demo-main.tsx']);
  const sprint = JSON.parse(await readFile(path.join(root, 'docs', 'sprint1-frontend.sha256.json'), 'utf8'));
  assert.equal(sprint.previousManifestSha256, createHash('sha256').update(await readFile(path.join(root, 'docs', 'figma-alteracoes-demo1.sha256.json'))).digest('hex'));
  const sprint2 = JSON.parse(await readFile(path.join(root, 'docs', 'sprint2-frontend.sha256.json'), 'utf8'));
  assert.equal(sprint2.previousManifestSha256, createHash('sha256').update(await readFile(path.join(root, 'docs', 'sprint1-frontend.sha256.json'))).digest('hex'));
  const fix = JSON.parse(await readFile(path.join(root, 'docs', 'audit-fix1-frontend.sha256.json'), 'utf8'));
  assert.equal(fix.phase, 'AUDIT-FIX.1');
  assert.equal(fix.previousManifestSha256, createHash('sha256').update(await readFile(path.join(root, 'docs', 'sprint2-frontend.sha256.json'))).digest('hex'));
  assert.deepEqual(Object.keys(fix.changes).sort(), ['package.json','pnpm-lock.yaml','src/hooks/useAuth.ts','src/library/Loans.tsx','src/library/api.ts']);
  assert.deepEqual(Object.keys(fix.added), ['src/services/sessionEvents.ts']);
  const final = JSON.parse(await readFile(path.join(root,'docs','final1-frontend.sha256.json'),'utf8'));
  assert.equal(final.phase,'FINAL.1');
  assert.deepEqual(Object.keys(final.changes).sort(),['src/App.tsx','src/LibraryPanel.tsx','src/library/Catalog.tsx','src/library/Readers.tsx','src/library/StudentLibrary.tsx','src/library/api.ts','src/library/library.css']);
  assert.deepEqual(Object.keys(final.added).sort(),['src/library/Dashboard.tsx','src/library/ReaderRecord.tsx','src/library/Unavailable.tsx']);
  assert.equal(final.previousManifestSha256,createHash('sha256').update(await readFile(path.join(root,'docs','audit-fix1-frontend.sha256.json'))).digest('hex'));
  const finalHash=(filename,previous)=>{const change=final.changes[filename];if(change)assert.equal(change.before,previous,filename);return change?.after||previous;};
  for(const [filename,hash] of Object.entries(final.added))assert.equal(createHash('sha256').update(await readFile(path.join(root,'frontend',filename))).digest('hex'),hash,filename);
  const fixedHash = (filename, previous) => {
    const change = fix.changes[filename];
    if (change) assert.equal(change.before, previous, filename);
    return finalHash(filename,change?.after || previous);
  };
  for (const [filename, hash] of Object.entries(fix.added)) {
    assert.equal(createHash('sha256').update(await readFile(path.join(root,'frontend',filename))).digest('hex'),finalHash(filename,hash),filename);
  }
  const latestHash = (filename, previous) => {
    const change=sprint2.changes[filename];
    if(change) assert.equal(change.before,previous,filename);
    return fixedHash(filename,change?.after||previous);
  };
  for(const [filename,hash] of Object.entries(sprint2.added)) {
    assert.equal(createHash('sha256').update(await readFile(path.join(root,'frontend',filename))).digest('hex'),fixedHash(filename,hash),filename);
  }
  const sprintHash = (filename, previous) => {
    const change = sprint.changes[filename];
    if (change) assert.equal(change.before, previous, filename);
    return latestHash(filename, change?.after || previous);
  };
  for (const [filename, hash] of Object.entries(sprint.added)) {
    assert.equal(createHash('sha256').update(await readFile(path.join(root, 'frontend', filename))).digest('hex'), latestHash(filename,hash), filename);
  }
  assert.equal(original.files.length, 24);
  for (const item of original.files) {
    const change = approved.changes[item.path];
    if (change) assert.equal(change.before, item.sha256);
    const actual = createHash('sha256').update(await readFile(path.join(root, 'frontend', item.path))).digest('hex');
    const previous = change?.after || item.sha256;
    const next = current.changes[item.path];
    if (next) assert.equal(next.before, previous, item.path);
    const latest = b3.changes[item.path];
    if (latest) assert.equal(latest.before, next?.after || previous, item.path);
    const approvedDemo = demo.changes[item.path];
    if (approvedDemo) assert.equal(approvedDemo.before, latest?.after || next?.after || previous, item.path);
    assert.equal(actual, sprintHash(item.path, approvedDemo?.after || latest?.after || next?.after || previous), item.path);
  }
  for (const [filename, hash] of Object.entries(current.added)) {
    const latest = b3.changes[filename];
    if (latest) assert.equal(latest.before, hash, filename);
    assert.equal(createHash('sha256').update(await readFile(path.join(root, 'frontend', filename))).digest('hex'), sprintHash(filename, latest?.after || hash), filename);
  }
  for (const [filename, hash] of Object.entries(demo.added)) {
    assert.equal(createHash('sha256').update(await readFile(path.join(root, 'frontend', filename))).digest('hex'), sprintHash(filename, hash), filename);
  }
  for (const [filename, hash] of Object.entries(b3.added)) {
    assert.equal(createHash('sha256').update(await readFile(path.join(root, 'frontend', filename))).digest('hex'), sprintHash(filename, hash), filename);
  }
});

test('build usa somente base /painel/ para seus assets e não publica source maps', async () => {
  assert.ok(resources.length >= 3);
  assert.ok(resources.every((resource) => resource.startsWith('/painel/')));
  assert.ok(resources.some((resource) => resource.endsWith('.js')));
  assert.ok(resources.some((resource) => resource.endsWith('.css')));
  const files = await readdir(path.join(dist, 'assets'));
  assert.equal(files.some((name) => name.endsWith('.map')), false);
});

test('fonte e bundle contêm apenas contatos fictícios e não afirmam ações concluídas', async () => {
  const source = await readFile(path.join(root, 'frontend', 'src', 'LibraryPanel.tsx'), 'utf8');
  let bundle = '';
  for (const name of await readdir(path.join(dist, 'assets'))) {
    if (name.endsWith('.js')) bundle += await readFile(path.join(dist, 'assets', name), 'utf8');
  }
  for (const text of [source, bundle]) {
    const addresses = text.match(/[\w.+-]+@[\w.-]+\.[a-z]+/gi) || [];
    assert.ok(addresses.length >= 4);
    assert.ok(addresses.every((address) => address.endsWith('@example.invalid')));
    assert.equal(/\(\d{2}\)\s*\d{4,5}-\d{4}/.test(text), false);
    for (const forbidden of ['Marina Alves', 'João Pedro', 'Beatriz Lima', 'Ana Souza',
      'mailto:', 'Em conformidade', 'Proteção de dados ativa', 'Novo empréstimo iniciado',
      'Relatório de dados preparado para download', 'Solicitação de exclusão registrada']) {
      assert.ok(!text.includes(forbidden), 'Conteúdo demonstrativo antigo não deve ser distribuído.');
    }
    assert.ok(text.includes('Conta demonstrativa'));
    assert.ok(text.includes('nenhum lembrete foi enviado'));
  }
  assert.equal(/fetch\s*\(|\/api\/me|\/logout/.test(source), false);
});

test('documento e todos os assets recusam acesso sem sessão', async () => {
  const jar = client(publicUrl);
  for (const route of ['/painel', '/painel/', '/painel/index.html', '/painel/robots.txt', ...resources]) {
    const response = await jar.request(route);
    assert.equal(response.status, 401);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});

test('API inexistente é JSON 404 para GET e POST, nunca shell React', async () => {
  const jar = client(publicUrl);
  for (const route of ['/api', '/api/inexistente', '/api/livros', '/api/painel/assets/falso.js']) {
    for (const method of ['GET', 'POST']) {
      const response = await jar.request(route, { method });
      assert.equal(response.status, 404);
      assert.match(response.headers.get('content-type'), /application\/json/);
      assert.deepEqual(await response.json(), { success: false, message: 'Endpoint não encontrado.' });
    }
  }
});

test('fontes, dependências e saída dist não têm atalhos estáticos fora de /painel', async () => {
  for (const route of ['/frontend/src/App.tsx', '/frontend/dist/index.html', '/src/App.tsx', '/assets/falso.js', '/node_modules/react/index.js']) {
    assert.equal((await client(publicUrl).request(route)).status, 404);
  }
});

integration('sessão válida carrega o build real e todos os seus assets sem cache público', async () => {
  const { jar } = await authenticated();
  const response = await jar.request('/painel/');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(await response.text(), html);
  for (const resource of [...resources, '/painel/robots.txt']) {
    const asset = await jar.request(resource);
    assert.equal(asset.status, 200);
    assert.equal(asset.headers.get('cache-control'), 'no-store');
    const file = path.join(dist, resource.slice('/painel/'.length));
    assert.ok(Buffer.from(await asset.arrayBuffer()).equals(await readFile(file)));
    assert.match(asset.headers.get('content-type'),
      resource.endsWith('.js') ? /javascript/ : resource.endsWith('.css') ? /text\/css/
        : resource.endsWith('.svg') ? /image\/svg/ : /text\/plain/);
  }
  assert.equal((await jar.request('/area')).status, 200);
  assert.equal((await jar.request('/api/me')).status, 200);
});

for (const perfil of ['aluno', 'bibliotecario', 'administrador']) {
  integration('MVP: cadastro → login → painel → logout protegido, perfil ' + perfil, async () => {
    const jar = client(integratedUrl);
    const data = { nome: 'Pessoa fictícia MVP', email: 'mvp-' + randomUUID() + '@example.invalid',
      password: randomBytes(24).toString('base64url') };
    emails.push(data.email);
    assert.equal((await jar.request('/painel/')).status, 401);
    assert.equal((await jar.request('/api/cadastro', { method: 'POST', data })).status, 201);
    assert.equal((await jar.request('/painel/')).status, 401); // Cadastro não cria sessão.
    const row = (await pool.query('SELECT id, perfil FROM usuarios WHERE email=$1', [data.email])).rows[0];
    assert.equal(row.perfil, 'aluno');
    if (perfil !== 'aluno') {
      // Somente fixture no banco alexandria_test. Não existe promoção no cadastro público.
      await pool.query('DELETE FROM alunos WHERE usuario_id=$1', [row.id]);
      await pool.query('UPDATE usuarios SET perfil=$1 WHERE id=$2', [perfil, row.id]);
    }
    assert.equal((await jar.request('/login', { method: 'POST', data: { email: data.email, password: 'senha incorreta fictícia' } })).status, 401);
    const logged = await jar.request('/login', { method: 'POST', data: { email: data.email, password: data.password } });
    assert.equal(logged.status, 200);
    const body = await logged.json();
    assert.deepEqual(body, { success: true, redirect: '/painel/' });
    assert.equal(await (await jar.request(body.redirect)).text(), html);
    assert.equal((await (await jar.request('/api/me')).json()).perfil, perfil);
    assert.equal((await jar.request('/area')).status, 200); // Compatibilidade preservada.
    assert.equal((await jar.request('/logout', { method: 'POST' })).status, 403);
    const { csrfToken } = await (await jar.request('/api/csrf')).json();
    const oldCookie = jar.cookie;
    const logout = await jar.request('/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken } });
    assert.equal(logout.status, 200);
    assert.equal((await logout.json()).success, true);
    jar.cookie = oldCookie;
    for (const route of ['/painel/', '/area', '/api/me']) assert.equal((await jar.request(route)).status, 401);
  });
}

integration('expiração do store impede documento e assets mesmo com cookie antigo', async () => {
  const { jar, id } = await authenticated();
  const sid = await ownSession(id);
  await pool.query('UPDATE sessoes SET expire=$1 WHERE sid=$2', [new Date(Date.now() - 10000), sid]);
  for (const resource of ['/painel/', resources[0]]) {
    assert.equal((await jar.request(resource)).status, 401);
  }
});

integration('prazo absoluto vencido impede acesso ao painel', async () => {
  const { jar, id } = await authenticated();
  const sid = await ownSession(id);
  await pool.query("UPDATE sessoes SET sess=jsonb_set(sess::jsonb,'{authExpiresAt}',to_jsonb($1::bigint))::json WHERE sid=$2",
    [Date.now() - 10000, sid]);
  assert.equal((await jar.request('/painel/')).status, 401);
});

integration('sessão excluída não permite painel ou assets', async () => {
  const { jar, id } = await authenticated();
  await pool.query('DELETE FROM sessoes WHERE sid=$1', [await ownSession(id)]);
  assert.equal((await jar.request('/painel/')).status, 401);
  assert.equal((await jar.request(resources[0])).status, 401);
});

integration('logout por API mantém CSRF e bloqueia o painel com o cookie anterior', async () => {
  const { jar } = await authenticated();
  assert.equal((await jar.request('/logout', { method: 'POST' })).status, 403);
  const { csrfToken } = await (await jar.request('/api/csrf')).json();
  const cookie = jar.cookie;
  assert.equal((await jar.request('/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken } })).status, 200);
  jar.cookie = cookie;
  assert.equal((await jar.request('/painel/')).status, 401);
  assert.equal((await jar.request(resources[0])).status, 401);
});

integration('conta desativada perde painel e assets antes de uma resposta condicional', async () => {
  const { jar, id } = await authenticated();
  const asset = await jar.request(resources[0]);
  assert.equal(asset.status, 200);
  const etag = asset.headers.get('etag');
  await pool.query('UPDATE usuarios SET ativo=false WHERE id=$1', [id]);
  assert.equal((await jar.request(resources[0], { headers: { 'If-None-Match': etag } })).status, 401);
  assert.equal((await jar.request('/painel/')).status, 401);
});

integration('arquivos inexistentes e caminhos inseguros não recebem fallback SPA', async () => {
  const { jar } = await authenticated();
  for (const route of ['/painel/assets/inexistente.js', '/painel/rota-inexistente',
    '/painel/api/me', '/painel/%2e%2e%2fsrc/App.tsx', '/painel/.env', '/painel/.figma/make/site.json']) {
    const response = await jar.request(route);
    assert.equal(response.status, 404);
    assert.match(response.headers.get('content-type'), /application\/json/);
  }
});

integration('banco indisponível não libera HTML nem assets do painel', async () => {
  const { jar } = await authenticated();
  const url = await listen({ getPool: () => ({
    query: async () => { throw Object.assign(new Error('detalhe-privado'), { code: 'ECONNREFUSED' }); },
  }) });
  const failed = client(url);
  failed.cookie = jar.cookie;
  for (const resource of ['/painel/', resources[0]]) {
    const response = await failed.request(resource);
    assert.equal(response.status, 503);
    assert.equal((await response.text()).includes('detalhe-privado'), false);
  }
});
