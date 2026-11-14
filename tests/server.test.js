const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { readFile, readdir } = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const app = require('../backend/app');
const root = path.join(__dirname, '..');
let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = 'http://127.0.0.1:' + server.address().port;
});
after(() => new Promise((resolve, reject) => {
  server.close((error) => error ? reject(error) : resolve());
  server.closeAllConnections();
}));

test('server.js inicia e responde ao health', { timeout: 10000 }, async () => {
  const child = spawn(process.execPath, [path.join(root, 'backend/server.js')], {
    cwd: __dirname,
    env: { ...process.env, PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    const output = await new Promise((resolve, reject) => {
      let text = '';
      child.on('error', reject);
      child.on('exit', (code) => reject(new Error('Servidor encerrou: ' + code)));
      child.stdout.on('data', (data) => {
        text += data;
        if (/localhost:\d+/.test(text)) resolve(text);
      });
    });
    const port = output.match(/localhost:(\d+)/)[1];
    const response = await fetch('http://127.0.0.1:' + port + '/api/health');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  } finally {
    const exited = once(child, 'exit');
    child.kill();
    await exited;
  }
});

test('health retorna 200 e JSON válido', async () => {
  const response = await fetch(baseUrl + '/api/health');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('raiz redireciona para login', async () => {
  const response = await fetch(baseUrl, { redirect: 'manual' });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/login');
});

for (const page of ['login', 'cadastro', 'esqueci-senha', 'senha-nova']) {
  test('HTML original e recursos de /' + page, async () => {
    const response = await fetch(baseUrl + '/' + page);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
    const html = await response.text();
    assert.equal(html, await readFile(path.join(root, 'login', page + '.html'), 'utf8'));
    const resources = [...html.matchAll(/(?:href|src)="(\/static\/[^"]+)"/g)];
    assert.ok(resources.length >= 2);
    for (const [, resource] of resources) {
      const asset = await fetch(baseUrl + resource);
      assert.equal(asset.status, 200);
      assert.equal(await asset.text(), await readFile(path.join(root, 'login', path.basename(resource)), 'utf8'));
    }
  });
}

test('todos os CSS e JS são servidos com conteúdo e tipo corretos', async () => {
  for (const filename of await readdir(path.join(root, 'login'))) {
    if (!/\.(css|js)$/.test(filename)) continue;
    const response = await fetch(baseUrl + '/static/' + filename);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), filename.endsWith('.css') ? /text\/css/ : /javascript/);
    assert.equal(await response.text(), await readFile(path.join(root, 'login', filename), 'utf8'));
  }
});

test('POSTs retornam 501 sem sucesso, sessão ou redirecionamento', async () => {
  for (const route of ['/api/forgot-password', '/api/senha-nova']) {
    const response = await fetch(baseUrl + route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teste@example.invalid', password: 'dado-ficticio' }),
    });
    assert.equal(response.status, 501);
    assert.equal(response.ok, false);
    assert.equal(response.headers.get('location'), null);
    assert.equal(response.headers.get('set-cookie'), null);
    const body = await response.json();
    assert.equal(body.success, false);
    assert.match(body.message, /não implementada/);
    assert.equal(body.redirect, undefined);
  }
});

test('arquivos internos e caminhos fora de login não são públicos', async () => {
  for (const resource of ['/static/login.html', '/static/.env', '/static/../package.json', '/static/%2e%2e%2fpackage.json', '/backend/app.js', '/package.json']) {
    assert.equal((await fetch(baseUrl + resource)).status, 404);
  }
});

test('os 11 originais não alterados preservam SHA-256 e login mantém 13 arquivos', async () => {
  const baseline = JSON.parse((await readFile(path.join(__dirname, 'login-original.sha256.json'), 'utf8')).replace(/^\uFEFF/, ''));
  assert.equal(Object.keys(baseline).length, 13);
  assert.deepEqual((await readdir(path.join(root, 'login'))).sort(), Object.keys(baseline).sort());
  for (const [filename, hash] of Object.entries(baseline)) {
    if (['cadastro.html', 'cadastro.js'].includes(filename)) continue;
    const content = await readFile(path.join(root, 'login', filename));
    assert.equal(createHash('sha256').update(content).digest('hex'), hash, filename);
  }
});

test('manifesto histórico intacto e somente duas mudanças autorizadas em FIX.1', async () => {
  const original = await readFile(path.join(__dirname, 'login-original.sha256.json'));
  const originalHash = createHash('sha256').update(original).digest('hex');
  assert.equal(originalHash, 'd492189c20b5fef30813a5af5017d078b57a30f26c7edcad3c43fba939693b38');
  const baseline = JSON.parse(original.toString('utf8').replace(/^\uFEFF/, ''));
  const approved = JSON.parse(await readFile(path.join(__dirname, 'login-authorized-fix1.sha256.json'), 'utf8'));
  assert.equal(approved.phase, '1.5H FIX.1');
  assert.equal(approved.originalManifestSha256, originalHash);
  assert.deepEqual(Object.keys(approved.changes).sort(), ['cadastro.html', 'cadastro.js']);
  for (const [filename, record] of Object.entries(approved.changes)) {
    assert.equal(record.before, baseline[filename], filename);
    assert.notEqual(record.after, record.before, filename);
    const actual = createHash('sha256').update(await readFile(path.join(root, 'login', filename))).digest('hex');
    assert.equal(actual, record.after, filename);
  }
});
