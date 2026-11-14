const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const { validateCadastro } = require('../backend/validators/cadastro.validator');

async function submit(password, networkFailure = false) {
  const source = await readFile(path.join(__dirname, '..', 'login', 'cadastro.js'), 'utf8');
  const alerts = [];
  const requests = [];
  const button = { disabled: false, textContent: 'Cadastrar' };
  let handler;
  const fields = {
    name: { value: 'Pessoa fictícia' }, email: { value: 'teste@example.invalid' },
    password: { value: password },
    cadastroForm: {
      querySelector: () => button,
      addEventListener: (event, callback) => { if (event === 'submit') handler = callback; },
    },
  };
  const context = {
    document: {
      addEventListener: (event, callback) => { if (event === 'DOMContentLoaded') callback(); },
      getElementById: (id) => fields[id],
    },
    window: { location: { href: '' } },
    alert: (message) => alerts.push(message),
    console: { error() {} },
    fetch: async (url, options) => {
      requests.push({ url, method: options.method, body: JSON.parse(options.body) });
      if (networkFailure) throw new Error('Falha fictícia de conexão.');
      return { ok: true, json: async () => ({ message: 'Cadastro fictício.' }) };
    },
  };
  // Executa o script original modificado, sem reimplementar sua regra no teste.
  vm.runInNewContext(source, context, { filename: 'cadastro.js', timeout: 1000 });
  let prevented = false;
  await handler({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, 'Cadastrar');
  return { alerts, requests, redirect: context.window.location.href };
}

for (const [label, password, valid] of [
  ['14 ASCII', 'a'.repeat(14), false],
  ['15 ASCII', 'a'.repeat(15), true],
  ['128 ASCII', 'a'.repeat(128), true],
  ['129 ASCII', 'a'.repeat(129), false],
  ['14 caracteres fora do plano básico', '😀'.repeat(14), false],
  ['15 caracteres fora do plano básico', '😀'.repeat(15), true],
  ['128 caracteres fora do plano básico', '😀'.repeat(128), true],
  ['129 caracteres fora do plano básico', '😀'.repeat(129), false],
  ['15 pontos com espaços nas extremidades', ' ' + 'a'.repeat(13) + ' ', true],
  ['14 pontos com marcas combinantes', 'e\u0301'.repeat(7), false],
  ['15 pontos com marcas combinantes', 'e\u0301'.repeat(7) + 'a', true],
]) {
  test('frontend e validator concordam: ' + label, async () => {
    const data = { nome: 'Pessoa fictícia', email: 'teste@example.invalid', password };
    const result = await submit(password);
    if (valid) {
      assert.doesNotThrow(() => validateCadastro(data));
      assert.equal(result.requests.length, 1);
      assert.equal(result.requests[0].url, '/api/cadastro');
      assert.equal(result.requests[0].method, 'POST');
      assert.ok(result.requests[0].body.password === password);
      assert.equal(result.redirect, '/login');
    } else {
      assert.throws(() => validateCadastro(data), (error) => error.status === 400);
      assert.equal(result.requests.length, 0);
      assert.equal(result.redirect, '');
      assert.deepEqual(result.alerts, ['A senha deve ter de 15 a 128 caracteres; espaços são permitidos.']);
    }
  });
}

test('HTML orienta 15–128 sem maxlength incompatível com Unicode', async () => {
  const html = await readFile(path.join(__dirname, '..', 'login', 'cadastro.html'), 'utf8');
  const input = html.match(/<input\b[^>]*\bid="password"[^>]*>/)[0];
  assert.ok(input.includes('placeholder="De 15 a 128 caracteres"'));
  assert.ok(input.includes('minlength="15"'));
  assert.equal(/\bmaxlength\s*=/.test(input), false);
});

test('falha de conexão no formulário usa orientação neutra e restaura botão', async () => {
  const result = await submit('a'.repeat(15), true);
  assert.equal(result.requests.length, 1);
  assert.equal(result.redirect, '');
  assert.deepEqual(result.alerts, ['Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.']);
});
