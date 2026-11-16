const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { checkDemo } = require('../scripts/check-pages-demo');

test('Pages: artefato real contém somente estáticos com base correta e sem endpoints de autenticação', async () => {
  const { files } = await checkDemo();
  assert.ok(files.includes('index.html'));
  assert.ok(files.some((name) => name.endsWith('.js')));
  assert.ok(files.some((name) => name.endsWith('.css')));
});

test('Pages: workflow é somente manual e publica exclusivamente dist-demo com permissões separadas', async () => {
  const workflow = await readFile(path.join(__dirname, '..', '.github/workflows/pages-demo.yml'), 'utf8');
  assert.match(workflow, /on:\s*\n\s+workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s+(?:push|pull_request|schedule):/m);
  assert.match(workflow, /permissions: \{\}/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /pnpm install --frozen-lockfile --ignore-scripts/);
  assert.match(workflow, /path: frontend\/dist-demo/);
  assert.match(workflow, /needs: build/);
  assert.match(workflow, /pages: write\s+id-token: write/);
  assert.doesNotMatch(workflow, /npm ci|npm start|PGPASSWORD|SESSION_SECRET|contents: write/);
});
