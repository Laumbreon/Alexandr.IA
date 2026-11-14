const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { once } = require('node:events');
const { randomBytes, randomUUID } = require('node:crypto');
const frontend = path.join(__dirname, '..', 'frontend');
const requireFrontend = createRequire(path.join(frontend, 'package.json'));
const { JSDOM } = requireFrontend('jsdom');
const ts = requireFrontend('typescript');
const nativeFetch = global.fetch;
const user = { id: '1', nome: 'Pessoa Fictícia', email: 'teste@example.invalid', perfil: 'bibliotecario' };
const response = (status, data = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json' },
});
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

async function harness(fetcher, realApp = false, strict = false, mobile = false) {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', {
    url: 'http://localhost:3000/painel/', pretendToBeVisual: true,
  });
  const queries = new Map();
  dom.window.matchMedia = (query) => {
    if (!queries.has(query)) {
      const listeners = new Set();
      queries.set(query, { matches: query.includes("760px") && mobile, media: query,
        addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn),
        change(value) { this.matches = value; for (const fn of listeners) fn({ matches: value }); },
      });
    }
    return queries.get(query);
  };
  const previous = {};
  for (const key of ['window', 'document', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT', 'fetch']) previous[key] = Object.getOwnPropertyDescriptor(global, key);
  Object.assign(global, { window: dom.window, document: dom.window.document,
    localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true, fetch: fetcher });
  const React = requireFrontend('react');
  const { createRoot } = requireFrontend('react-dom/client');
  const cache = new Map();
  // TypeScript já faz parte do projeto. Transpila apenas para o teste Node,
  // sem outro bundler/framework, e executa os componentes reais com React DOM.
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const localRequire = (specifier) => {
      if (!specifier.startsWith('.')) return requireFrontend(specifier);
      const base = path.resolve(path.dirname(filename), specifier);
      const resolved = ['.ts', '.tsx'].map((ext) => base + ext).find((name) => fs.existsSync(name));
      if (!resolved) throw new Error('Módulo de teste não encontrado.');
      return load(resolved);
    };
    new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
    return module.exports;
  }
  const { AuthGate } = load(path.join(frontend, 'src/components/AuthGate.tsx'));
  const { LogoutButton } = load(path.join(frontend, 'src/components/LogoutButton.tsx'));
  const App = realApp ? load(path.join(frontend, 'src/App.tsx')).default : null;
  const root = createRoot(document.getElementById('root'));
  const navigations = [];
  const children = (identity, invalidate) => React.createElement('section', { 'data-testid': 'admin' },
    identity.nome, React.createElement(LogoutButton, { onSessionEnd: invalidate }));
  const element = App ? React.createElement(App) : React.createElement(AuthGate, {
    navigateToLogin: () => navigations.push('/login'), children,
  });
  await React.act(async () => { root.render(strict ? React.createElement(React.StrictMode, null, element) : element); });
  const originalNow = Date.now;
  let clock = originalNow();
  Date.now = () => clock;
  return {
    dom, navigations, load, React, queries,
    text: () => document.body.textContent,
    button: (text) => [...document.querySelectorAll('button')].find((button) => button.textContent === text),
    flush: (callback = () => {}) => React.act(async () => { await callback(); }),
    async click(text) {
      const button = this.button(text);
      assert.ok(button, 'Botão esperado não encontrado.');
      await this.flush(() => button.click());
    },
    async returnToTab() {
      clock += 1100;
      await this.flush(() => {
        document.dispatchEvent(new dom.window.Event('visibilitychange'));
        dom.window.dispatchEvent(new dom.window.Event('focus'));
      });
    },
    async close() {
      await React.act(async () => root.unmount());
      dom.window.close();
      Date.now = originalNow;
      for (const [key, descriptor] of Object.entries(previous)) {
        if (descriptor) Object.defineProperty(global, key, descriptor);
        else delete global[key];
      }
    },
  };
}

test('React aguarda /api/me sem renderizar contatos ou painel', async () => {
  const pending = deferred();
  const h = await harness(() => pending.promise, true);
  try {
    assert.ok(h.text().includes('Carregando identidade'));
    assert.equal(document.querySelector('.sidebar'), null);
    assert.equal(h.text().includes('Leitor fictício'), false);
    await h.flush(() => pending.resolve(response(200, user)));
    assert.ok(document.querySelector('.sidebar'));
    assert.equal(document.querySelector('.profile-name').textContent, user.nome);
  } finally { await h.close(); }
});

for (const perfil of ['bibliotecario', 'administrador']) {
  test('React usa identidade real e painel demonstrativo para ' + perfil, async () => {
    const h = await harness(async () => response(200, { ...user, perfil }), true);
    try {
      assert.equal(document.querySelector('.profile-name').textContent, user.nome);
      assert.equal(document.querySelector('.profile-role').textContent, perfil === 'administrador' ? 'Administrador' : 'Bibliotecário');
      assert.ok(h.text().includes('Painel demonstrativo'));
      assert.ok(h.button('Sair'));
    } finally { await h.close(); }
  });
}

test('aluno vê somente área simples, nome e saída, sem ferramentas administrativas', async () => {
  const h = await harness(async () => response(200, { ...user, perfil: 'aluno' }), true);
  try {
    assert.ok(h.text().includes('Área do aluno') && h.text().includes(user.nome));
    for (const forbidden of ['Leitor fictício', 'Relatórios', 'Simular empréstimo', 'Configurações', 'Contatos']) {
      assert.equal(h.text().includes(forbidden), false);
    }
    assert.equal(document.querySelector('.sidebar'), null);
    assert.ok(h.button('Sair'));
  } finally { await h.close(); }
});

test('perfil desconhecido bloqueia o painel', async () => {
  const h = await harness(async () => response(200, { ...user, perfil: 'outro' }), true);
  try {
    assert.ok(h.text().includes('Acesso não autorizado'));
    assert.equal(document.querySelector('.sidebar'), null);
  } finally { await h.close(); }
});

test('401 descarta a interface e direciona ao login uma vez', async () => {
  const h = await harness(async () => response(401));
  try {
    assert.deepEqual(h.navigations, ['/login']);
    assert.equal(document.querySelector('[data-testid=admin]'), null);
  } finally { await h.close(); }
});

test('503 não autentica e permite tentar novamente', async () => {
  let calls = 0;
  const h = await harness(async () => ++calls === 1 ? response(503) : response(200, user));
  try {
    assert.ok(h.text().includes('temporariamente indisponível'));
    assert.equal(document.querySelector('[data-testid=admin]'), null);
    assert.deepEqual(h.navigations, []);
    await h.click('Tentar novamente');
    assert.ok(document.querySelector('[data-testid=admin]'));
  } finally { await h.close(); }
});

for (const [label, fetcher] of [
  ['500', async () => response(500, { message: 'detalhe-privado' })],
  ['rede', async () => { throw new Error('detalhe-privado'); }],
  ['JSON inválido', async () => new Response('{', { status: 200 })],
  ['identidade incompleta', async () => response(200, { nome: 'Pessoa' })],
]) {
  test('erro inesperado seguro: ' + label, async () => {
    const h = await harness(fetcher);
    try {
      assert.ok(h.text().includes('Não foi possível consultar'));
      assert.equal(h.text().includes('detalhe-privado'), false);
      assert.equal(document.querySelector('[data-testid=admin]'), null);
    } finally { await h.close(); }
  });
}

test('StrictMode compartilha a consulta pendente e não renova sessão', async () => {
  const pending = deferred();
  let calls = 0;
  const h = await harness((url, options) => {
    assert.equal(url, '/api/me');
    assert.equal(options.credentials, 'same-origin');
    assert.equal(options.cache, 'no-store');
    calls++;
    return pending.promise;
  }, false, true);
  try {
    assert.equal(calls, 1);
    await h.flush(() => pending.resolve(response(200, user)));
    assert.ok(document.querySelector('[data-testid=admin]'));
    assert.equal(localStorage.length, 0);
  } finally { await h.close(); }
});

test('retorno à aba revalida uma vez, oculta o painel enquanto aguarda e trata expiração', async () => {
  let calls = 0;
  const pending = deferred();
  const h = await harness(async () => ++calls === 1 ? response(200, user) : pending.promise);
  try {
    await h.returnToTab();
    assert.equal(calls, 2);
    assert.equal(document.querySelector('[data-testid=admin]'), null);
    assert.ok(h.text().includes('Carregando identidade'));
    await h.flush(() => pending.resolve(response(401)));
    assert.deepEqual(h.navigations, ['/login']);
    assert.equal(document.querySelector('[data-testid=admin]'), null);
  } finally { await h.close(); }
});

test('retorno à aba com 503 não mantém o painel anterior', async () => {
  let calls = 0;
  const h = await harness(async () => ++calls === 1 ? response(200, user) : response(503));
  try {
    await h.returnToTab();
    assert.equal(document.querySelector('[data-testid=admin]'), null);
    assert.ok(h.text().includes('temporariamente indisponível'));
  } finally { await h.close(); }
});

test('audience demonstrativo não modifica o perfil autenticado', async () => {
  const h = await harness(async () => response(200, user), true);
  try {
    assert.equal(document.querySelector('.audience-toggle'), null);
    assert.equal(h.button('Aluno'), undefined);
    assert.ok(document.querySelector('.sidebar'));
    assert.equal(document.querySelector('.profile-role').textContent, 'Bibliotecário');
  } finally { await h.close(); }
});

test('navegação expõe seção atual e transfere foco ao título', async () => {
  const h = await harness(async () => response(200, user), true);
  try {
    for (const label of ['Empréstimos', 'Leitores', 'Acervo', 'Relatórios', 'Configurações', 'Visão geral']) {
      const item = [...document.querySelectorAll('.nav-item')].find((button) => button.querySelector('span')?.textContent === label);
      await h.flush(() => item.click());
      assert.equal(item.getAttribute('aria-current'), 'page');
      assert.equal(document.querySelectorAll('[aria-current="page"]').length, 1);
      assert.equal(document.querySelectorAll('h1').length, 1);
      assert.equal(document.activeElement, document.querySelector('h1'));
      assert.equal(document.querySelector('main').id, 'conteudo');
    }
    assert.equal(document.querySelector('.skip-link').getAttribute('href'), '#conteudo');
  } finally { await h.close(); }
});

test('menu móvel inicia oculto e inerte; botão nativo identifica expansão e destino', async () => {
  const h = await harness(async () => response(200, user), true, false, true);
  try {
    const sidebar = document.querySelector('.sidebar');
    const opener = document.querySelector('.menu-button');
    assert.equal(opener.tagName, 'BUTTON'); // Enter/Espaço são comportamentos nativos do navegador.
    assert.equal(opener.getAttribute('aria-expanded'), 'false');
    assert.equal(opener.getAttribute('aria-controls'), sidebar.id);
    assert.ok(sidebar.hasAttribute('inert'));
    await h.flush(() => opener.click());
    assert.equal(opener.getAttribute('aria-expanded'), 'true');
    assert.equal(sidebar.hasAttribute('inert'), false);
    assert.equal(sidebar.getAttribute('role'), 'dialog');
    assert.equal(sidebar.getAttribute('aria-modal'), 'true');
    assert.ok(document.querySelector('main').hasAttribute('inert'));
    assert.equal(document.activeElement.textContent, 'Fechar menu');
  } finally { await h.close(); }
});

test('Escape fecha menu e devolve foco; controles ocultos ficam inertes', async () => {
  const h = await harness(async () => response(200, user), true, false, true);
  try {
    const opener = document.querySelector('.menu-button');
    await h.flush(() => opener.click());
    await h.flush(() => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.equal(document.activeElement, opener);
    assert.equal(opener.getAttribute('aria-expanded'), 'false');
    assert.ok(document.querySelector('.sidebar').hasAttribute('inert'));
    assert.equal(document.querySelector('main').hasAttribute('inert'), false);
    assert.equal(document.body.style.overflow, '');
  } finally { await h.close(); }
});

test('seleção móvel fecha menu e coloca foco no conteúdo escolhido', async () => {
  const h = await harness(async () => response(200, user), true, false, true);
  try {
    await h.flush(() => document.querySelector('.menu-button').click());
    await h.click('Acervo');
    assert.equal(document.querySelector('.menu-button').getAttribute('aria-expanded'), 'false');
    assert.equal(document.activeElement, document.querySelector('h1'));
    assert.equal(document.activeElement.textContent, 'Acervo por categorias');
  } finally { await h.close(); }
});

test('Tab circula no menu aberto e botão Fechar oferece saída com foco restaurado', async () => {
  const h = await harness(async () => response(200, user), true, false, true);
  try {
    await h.flush(() => document.querySelector('.menu-button').click());
    const buttons = [...document.querySelectorAll('.sidebar button:not(:disabled)')];
    const first = buttons[0], last = buttons.at(-1);
    await h.flush(() => {
      first.focus();
      document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    });
    assert.equal(document.activeElement, last);
    await h.flush(() => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    assert.equal(document.activeElement, first);
    await h.click('Fechar menu');
    assert.equal(document.activeElement, document.querySelector('.menu-button'));
  } finally { await h.close(); }
});

test('mudança para desktop remove modalidade sem focar botão oculto', async () => {
  const h = await harness(async () => response(200, user), true, false, true);
  try {
    await h.flush(() => document.querySelector('.menu-button').click());
    await h.flush(() => h.queries.get('(max-width: 760px)').change(false));
    assert.equal(document.querySelector('.sidebar').hasAttribute('inert'), false);
    assert.equal(document.querySelector('.sidebar').hasAttribute('aria-modal'), false);
    assert.equal(document.activeElement, document.querySelector('h1'));
  } finally { await h.close(); }
});

test('switches possuem nomes e preferências reais persistem nas chaves existentes', async () => {
  const h = await harness(async () => response(200, user), true);
  try {
    await h.click('Configurações');
    const switches = [...document.querySelectorAll('[role="switch"]')];
    assert.equal(switches.length, 7);
    assert.ok(switches.every((control) => control.getAttribute('aria-label')));
    for (const [name, key, dataset, value] of [
      ['Texto ampliado', 'large-text', 'fontSize', 'large'],
      ['Alto contraste', 'high-contrast', 'contrast', 'high'],
      ['Reduzir movimentos', 'reduced-motion', 'motion', 'reduced'],
      ['Modo noturno', 'theme', 'theme', 'dark'],
    ]) {
      const control = switches.find((item) => item.getAttribute('aria-label') === name);
      assert.equal(control.getAttribute('aria-checked'), 'false');
      await h.flush(() => control.click());
      assert.equal(control.getAttribute('aria-checked'), 'true');
      assert.equal(document.documentElement.dataset[dataset], value);
      assert.equal(localStorage.getItem('bibliotech-' + key), key === 'theme' ? 'dark' : 'true');
    }
    assert.equal(localStorage.getItem('user'), null);
  } finally { await h.close(); }
});

test('filtro do acervo preserva lógica e anuncia a categoria selecionada', async () => {
  const h = await harness(async () => response(200, user), true);
  try {
    await h.click('Acervo');
    const category = [...document.querySelectorAll('.category-card')][0];
    assert.ok(category);
    await h.flush(() => category.click());
    assert.equal(category.getAttribute('aria-pressed'), 'true');
    assert.equal(document.querySelectorAll('.category-card[aria-pressed="true"]').length, 1);
    assert.ok(document.querySelector('h2'));
  } finally { await h.close(); }
});

test('controles sem implementação identificam indisponibilidade e ficam desabilitados', async () => {
  const h = await harness(async () => response(200, user), true);
  try {
    assert.ok(document.querySelector('.support-link').disabled);
    assert.ok(document.querySelector('.search-box input').disabled);
    assert.ok(document.querySelector('[aria-label^="Notificações"]').disabled);
    assert.ok([...document.querySelectorAll('.more-button')].every((button) => button.disabled));
    assert.equal(document.querySelector('.brand-name').textContent, 'Alexandr.IA');
  } finally { await h.close(); }
});

test('aluno recebe boas-vindas, perfil e navegação sem controles internos', async () => {
  const h = await harness(async () => response(200, { ...user, perfil: 'aluno' }), true);
  try {
    assert.ok(h.text().includes(user.nome));
    assert.ok(h.text().includes('Perfil: Aluno'));
    assert.ok(h.text().includes('Boas-vindas'));
    assert.ok(h.text().includes('reservas'));
    assert.ok(h.button('Sair'));
    assert.equal(document.querySelectorAll('h1').length, 1);
    assert.equal(document.querySelectorAll('nav').length, 1);
    assert.equal(document.querySelector('.sidebar'), null);
    assert.equal(document.querySelector('[role="switch"]'), null);
    assert.equal(h.text().includes('Leitor fictício'), false);
  } finally { await h.close(); }
});

test('logout usa CSRF, bloqueia clique duplicado e só então redireciona', async () => {
  const pending = deferred();
  const calls = [];
  const token = 'a'.repeat(64);
  const h = await harness(async (url, options) => {
    calls.push({ url, options });
    if (url === '/api/me') return response(200, user);
    if (url === '/api/csrf') return pending.promise;
    assert.equal(url, '/logout');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['X-CSRF-Token'], token);
    assert.equal(options.credentials, 'same-origin');
    return response(200, { success: true });
  });
  try {
    const button = h.button('Sair');
    await h.flush(() => { button.click(); button.click(); });
    assert.equal(calls.filter((call) => call.url === '/api/csrf').length, 1);
    assert.ok(h.button('Saindo…').disabled);
    assert.deepEqual(h.navigations, []);
    await h.flush(() => pending.resolve(response(200, { csrfToken: token })));
    assert.equal(calls.filter((call) => call.url === '/logout').length, 1);
    assert.deepEqual(h.navigations, ['/login']);
    assert.equal(localStorage.length, 0);
  } finally { await h.close(); }
});

for (const [phase, status, expected] of [
  ['csrf', 401, 'expired'], ['post', 401, 'expired'],
  ['csrf', 503, 'unavailable'], ['post', 503, 'unavailable'],
  ['post', 403, 'forbidden'], ['post', 500, 'error'],
]) {
  test('logout trata ' + status + ' em ' + phase + ' sem sucesso falso', async () => {
    const h = await harness(async (url) => {
      if (url === '/api/me') return response(200, user);
      if (url === '/api/csrf') return phase === 'csrf' ? response(status) : response(200, { csrfToken: 'b'.repeat(64) });
      return response(status, { message: 'detalhe-privado' });
    });
    try {
      await h.click('Sair');
      if (expected === 'expired') {
        assert.deepEqual(h.navigations, ['/login']);
        assert.ok(h.text().includes('Sessão inválida'));
      } else {
        assert.deepEqual(h.navigations, []);
        assert.ok(document.querySelector('[role=alert]'));
        assert.equal(h.text().includes('detalhe-privado'), false);
        assert.ok(h.button('Sair') && !h.button('Sair').disabled);
      }
    } finally { await h.close(); }
  });
}

test('CSRF malformado não dispara POST de logout', async () => {
  const calls = [];
  const h = await harness(async (url) => {
    calls.push(url);
    return url === '/api/me' ? response(200, user) : response(200, { csrfToken: 'invalido' });
  });
  try {
    await h.click('Sair');
    assert.equal(calls.includes('/logout'), false);
    assert.deepEqual(h.navigations, []);
  } finally { await h.close(); }
});

test('resposta antiga de identidade não restaura painel após término de sessão', async () => {
  const identity = deferred();
  const csrf = deferred();
  let calls = 0;
  const h = await harness(async (url) => {
    if (url === '/api/me') return ++calls === 1 ? response(200, user) : identity.promise;
    return csrf.promise;
  });
  try {
    await h.click('Sair');
    await h.returnToTab();
    assert.equal(document.querySelector('[data-testid=admin]'), null);
    await h.flush(() => csrf.resolve(response(401)));
    await h.flush(() => identity.resolve(response(200, user)));
    assert.deepEqual(h.navigations, ['/login']);
    assert.equal(document.querySelector('[data-testid=admin]'), null);
  } finally { await h.close(); }
});

test('React com HTTP/PostgreSQL reais identifica aluno, usa CSRF e perde acesso após logout', {
  skip: process.env.TEST_DATABASE === 'alexandria_test' ? false : 'Configure banco isolado explicitamente.',
}, async () => {
  const { createPool } = require('../backend/db/pool');
  const { createApp } = require('../backend/app');
  assert.equal(process.env.DB_ENV, 'test');
  assert.equal(process.env.PGDATABASE, 'alexandria_test');
  const pool = createPool();
  const { migrate, readMigrations } = require('../scripts/migrate');
  await migrate(pool, await readMigrations());
  const app = createApp({ getPool: () => pool, authEnv: {
    NODE_ENV: 'test', SESSION_SECRET: randomBytes(48).toString('base64url'), SESSION_COOKIE_SECURE: 'false',
  } });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  const email = 'react-' + randomUUID() + '@example.invalid';
  let id;
  let h;
  try {
    const data = { nome: 'Aluno Fictício HTTP', email, password: randomBytes(24).toString('base64url') };
    const post = (body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await nativeFetch(base + '/api/cadastro', post(data))).status, 201);
    id = (await pool.query('SELECT id FROM usuarios WHERE email=$1', [email])).rows[0].id;
    const logged = await nativeFetch(base + '/login', post({ email, password: data.password }));
    assert.equal(logged.status, 200);
    assert.equal((await logged.json()).redirect, '/painel/');
    const cookie = logged.headers.get('set-cookie').split(';')[0];
    h = await harness((url, options) => nativeFetch(base + url, {
      ...options, headers: { ...options.headers, Cookie: cookie },
    }));
    // O DOM real de React pode concluir a rede após o act inicial.
    for (let step = 0; step < 30 && !h.text().includes('Área do aluno'); step++) {
      await h.flush(() => new Promise((resolve) => setTimeout(resolve, 10)));
    }
    assert.ok(h.text().includes(data.nome));
    assert.ok(h.text().includes('Área do aluno'));
    await h.click('Sair');
    for (let step = 0; step < 30 && h.navigations.length === 0; step++) {
      await h.flush(() => new Promise((resolve) => setTimeout(resolve, 10)));
    }
    assert.deepEqual(h.navigations, ['/login']);
    assert.equal((await nativeFetch(base + '/api/me', { headers: { Cookie: cookie } })).status, 401);
    assert.equal((await nativeFetch(base + '/painel/', { headers: { Cookie: cookie } })).status, 401);
  } finally {
    if (h) await h.close();
    await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
    await app.locals.closeDatabase();
    if (id) {
      await pool.query("DELETE FROM sessoes WHERE sess->>'userId'=$1", [id]);
      await pool.query('DELETE FROM alunos WHERE usuario_id=$1', [id]);
      await pool.query('DELETE FROM usuarios WHERE id=$1', [id]);
    }
    await pool.end();
  }
});
