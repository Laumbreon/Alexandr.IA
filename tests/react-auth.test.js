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
  for (const key of ['window', 'document', 'localStorage', 'FormData', 'IS_REACT_ACT_ENVIRONMENT', 'fetch']) previous[key] = Object.getOwnPropertyDescriptor(global, key);
  Object.assign(global, { window: dom.window, document: dom.window.document,
    localStorage: dom.window.localStorage, FormData:dom.window.FormData,IS_REACT_ACT_ENVIRONMENT: true, fetch: fetcher });
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
  const App = realApp ? load(path.join(frontend, realApp === 'demo' ? 'src/DemoApp.tsx' : 'src/App.tsx')).default : null;
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
  test('React usa identidade real e acompanhamento protegido para ' + perfil, async () => {
    const h = await harness(async () => response(200, { ...user, perfil }), true);
    try {
      assert.equal(document.querySelector('.profile-name').textContent, user.nome);
      assert.equal(document.querySelector('.profile-role').textContent, perfil === 'administrador' ? 'Administrador' : 'Bibliotecário');
      assert.ok(h.text().includes('Biblioteca — dados do servidor'));
      assert.ok(h.text().includes('Estoque e circulação'));
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
    assert.equal(switches.length, 4);
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
  const h = await harness(async () => response(200, user), 'demo');
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
    const notices=document.querySelector('[aria-label="Abrir avisos internos"]');
    assert.equal(notices.disabled,false);
    assert.ok([...document.querySelectorAll('.more-button')].every((button) => button.disabled));
    assert.equal(document.querySelector('.brand-name').textContent, 'Alexandr.IA');
    await h.flush(()=>notices.click());assert.ok(h.text().includes('Avisos e acompanhamento'));
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
    assert.equal(document.querySelectorAll('nav').length, 2);
    assert.ok(document.querySelector('nav[aria-label="Áreas do aluno"]'));
    assert.ok(h.button('Meu perfil'));
    assert.equal(document.querySelector('.sidebar'), null);
    assert.equal(document.querySelector('[role="switch"]'), null);
    assert.equal(h.text().includes('Leitor fictício'), false);
  } finally { await h.close(); }
});

test('Pages: visita livre às seis seções sem autenticação ou chamadas de API', async () => {
  const requests = [];
  const h = await harness(async (url) => { requests.push(url); throw new Error('Demo não deve usar rede.'); }, 'demo');
  try {
    assert.ok(h.text().includes('Demonstração acadêmica — dados simulados'));
    assert.ok(h.text().includes('Sem autenticação'));
    assert.equal(h.button('Sair'), undefined);
    assert.equal(document.querySelector('input[type="password"]'), null);
    assert.equal(document.querySelector('.profile-role').textContent, 'Modo demonstração');
    for (const label of ['Empréstimos', 'Leitores', 'Acervo', 'Relatórios', 'Configurações', 'Visão geral']) {
      const button = [...document.querySelectorAll('.nav-item')].find((item) => item.querySelector('span')?.textContent === label);
      await h.flush(() => button.click());
      assert.equal(button.getAttribute('aria-current'), 'page');
      assert.equal(document.querySelectorAll('h1').length, 1);
      assert.ok(h.text().includes('Demonstração acadêmica — dados simulados'));
    }
    await h.returnToTab();
    assert.deepEqual(requests, []);
  } finally { await h.close(); }
});

test('2.6 demo simula circulação e atualiza avisos sem rede ou persistência', async () => {
  const requests = [];
  const h = await harness(async url => { requests.push(url); throw Error('Rede proibida'); }, 'demo');
  const navigate = async label => {
    const button = [...document.querySelectorAll('.nav-item')].find(item => item.querySelector('span')?.textContent === label);
    assert.ok(button); await h.flush(() => button.click());
  };
  try {
    assert.ok(h.text().includes('Atraso simulado'));
    await navigate('Empréstimos');
    assert.equal(h.button('Simular renovação 1').disabled, true);
    await h.click('Simular renovação 2');
    assert.ok(h.text().includes('2026-11-25'));
    await h.click('Simular devolução 1');
    await h.click('Simular cancelamento da reserva');
    await navigate('Visão geral');
    assert.ok(h.text().includes('Nenhum aviso neste cenário fictício'));
    await navigate('Acervo');
    assert.ok(h.text().includes('Disponível no cenário'));
    await h.click('Simular reserva');
    await navigate('Visão geral');
    assert.ok(h.text().includes('Reserva fictícia aguardando'));
    await h.click('Reiniciar cenário fictício');
    assert.ok(h.text().includes('Atraso simulado'));
    assert.ok(h.text().includes('Prazo próximo simulado'));
    assert.deepEqual(requests, []);
    assert.equal(localStorage.getItem('loans'), null);
    assert.equal(document.cookie, '');
  } finally { await h.close(); }
});

test('2.1 React consulta acervo real, informa carregamento e apresenta dados da API', async () => {
  const pending = deferred(), calls = [];
  let unavailable = false;
  const h = await harness(async (url) => {
    calls.push(url);
    if (url.endsWith('/resumo'))return response(503,{message:'Resumo separado neste teste'});
    if (url.includes('/avisos?')) return response(200,{items:[],total:0,pagina:1,limite:10,politica:{antecedencia_configurada:false,antecedencia_dias:null,canais_externos:false}});
    return url === '/api/me' ? response(200, user) : unavailable ? response(503, { message: 'Biblioteca temporariamente indisponivel.' }) : pending.promise;
  }, true);
  try {
    await h.click('Acervo');
    assert.ok(h.text().includes('Carregando acervo'));
    await h.flush(() => pending.resolve(response(200, { items: [{ id:'1',titulo:'Obra fictícia da API',autores:['Autor fictício'],categoria:'Estudo',isbn:null,editora:null,total_exemplares:2,circulaveis:1,versao:1 }], total:1,pagina:1,limite:10 })));
    assert.ok(h.text().includes('Obra fictícia da API'));
    assert.ok(h.text().includes('2 exemplares físicos'));
    assert.ok(h.text().includes('Biblioteca — dados do servidor'));
    assert.ok(calls.some((url) => url.startsWith('/api/biblioteca/livros')));
    assert.ok(h.button('Cadastrar livro'));
    unavailable = true;
    await h.click('Pesquisar');
    assert.ok(document.querySelector('[role=alert]').textContent.includes('temporariamente indisponivel'));
    assert.equal(h.text().includes('Nenhum livro encontrado'), false);
  } finally { await h.close(); }
});

test('2.2 React aluno consulta somente meu perfil e não apresenta edição administrativa', async () => {
  const calls=[];
  const h=await harness(async(url)=>{
    calls.push(url);
    if(url==='/api/me') return response(200,{...user,perfil:'aluno'});
    if(url.endsWith('/meu-perfil')) return response(200,{id:'1',nome:'Leitor próprio fictício',email:'proprio@example.invalid',ra:'RA-FICTICIO',curso:'Estudo',ativo:true,habilitado:true,versao:1});
    return response(200,{items:[],total:0,pagina:1,limite:10});
  },true);
  try {
    await h.click('Meu perfil');
    assert.ok(h.text().includes('RA-FICTICIO'));
    assert.ok(h.text().includes('Leitor próprio fictício'));
    assert.equal(h.button('Cadastrar leitor aluno'),undefined);
    assert.equal(document.querySelector('input[type="password"]'),null);
    assert.ok(calls.includes('/api/biblioteca/meu-perfil'));
    assert.equal(calls.some((url)=>url.includes('/leitores/')),false);
  } finally {await h.close();}
});

test('2.3 React aluno apresenta empréstimos próprios, prazos e atraso sem devolução administrativa',async()=>{
  const h=await harness(async(url)=>url==='/api/me'?response(200,{...user,perfil:'aluno'}):response(200,{items:url.includes('/emprestimos?')?[{id:'8',titulo:'Livro próprio fictício',patrimonio:'P-FICTICIO',retirado_em:'2026-10-01T12:00:00Z',previsto_em:'2026-10-08T12:00:00Z',devolvido_em:null,estado:'ativo',atrasado:true,renovacoes:0}]:[],total:url.includes('/emprestimos?')?1:0,pagina:1,limite:10}),true);
  try{
    await h.click('Meus empréstimos');
    assert.ok(h.text().includes('Livro próprio fictício'));
    assert.ok(h.text().includes('P-FICTICIO'));
    assert.ok(h.text().includes('Em atraso'));
    assert.equal(h.button('Novo empréstimo'),undefined);
    assert.equal([...document.querySelectorAll('button')].some((b)=>b.textContent.startsWith('Registrar devolução')),false);
  }finally{await h.close();}
});

test('2.4 React só confirma reserva após a API e apresenta fila própria',async()=>{
  const pending=deferred(),calls=[];
  const h=await harness(async(url,options)=>{
    calls.push({url,options});
    if(url==='/api/me')return response(200,{...user,perfil:'aluno'});
    if(url==='/api/csrf')return response(200,{csrfToken:'a'.repeat(64)});
    if(options?.method==='POST')return pending.promise;
    if(url.includes('/reservas?'))return response(200,{items:[{id:'9',titulo:'Reserva fictícia própria',leitor:'Pessoa fictícia',estado:'aguardando',solicitado_em:'2026-11-15T12:00:00Z',posicao:3,motivo:null}],total:1,pagina:1,limite:10});
    return response(200,{items:[{id:'1',titulo:'Obra reservável fictícia',autores:['Autor'],categoria:'Estudo',isbn:null,editora:null,total_exemplares:0,circulaveis:0,disponiveis:0,versao:1}],total:1,pagina:1,limite:10});
  },true);
  try{
    await h.click('Catálogo');
    await h.click('Solicitar reserva de Obra reservável fictícia');
    assert.equal(h.text().includes('Reserva registrada:'),false);
    await h.flush(()=>pending.resolve(response(201,{id:'9',estado:'aguardando'})));
    assert.ok(h.text().includes('Reserva registrada: aguarde atendimento'));
    const post=calls.find((c)=>c.options?.method==='POST');assert.equal(post.options.headers['X-CSRF-Token'],'a'.repeat(64));
    await h.click('Minhas reservas');assert.ok(h.text().includes('Posição atual: 3'));assert.ok(h.text().includes('Reserva fictícia própria'));
    assert.equal(h.text().includes('Motivo do cancelamento (sem dados pessoais)'),false);
  }finally{await h.close();}
});

test('2.4 React renovação permanece pendente até confirmação e usa CSRF',async()=>{
  const pending=deferred();let renewed=false;
  const item={id:'8',titulo:'Livro renovável fictício',patrimonio:'P-RENOVACAO',retirado_em:'2026-11-15T12:00:00Z',previsto_em:'2026-11-22T12:00:00Z',devolvido_em:null,estado:'ativo',atrasado:false,renovacoes:0};
  const h=await harness(async(url,options)=>{
    if(url==='/api/me')return response(200,{...user,perfil:'aluno'});
    if(url==='/api/csrf')return response(200,{csrfToken:'b'.repeat(64)});
    if(url.endsWith('/politica'))return response(200,{renovacao_configurada:true,limite_renovacoes:1,dias_renovacao:7});
    if(options?.method==='POST'){renewed=true;return pending.promise;}
    return response(200,{items:url.includes('/emprestimos?')?[{...item,renovacoes:renewed?1:0}]:[],total:url.includes('/emprestimos?')?1:0,pagina:1,limite:10});
  },true);
  try{
    h.dom.window.confirm=()=>true;await h.click('Meus empréstimos');await h.click('Solicitar renovação de P-RENOVACAO');
    assert.equal(h.text().includes('Renovação confirmada'),false);
    assert.equal(h.button('Solicitar renovação de P-RENOVACAO').disabled,true);
    await h.flush(()=>pending.resolve(response(201,{...item,renovacoes:1})));
    assert.ok(h.text().includes('Renovação confirmada pela biblioteca.'));
    assert.equal(h.button('Solicitar renovação de P-RENOVACAO').disabled,true);
  }finally{await h.close();}
});

test('2.5 React aluno vê avisos próprios, datas e atualização após devolução',async()=>{
  let returned=false;const calls=[];
  const h=await harness(async(url)=>{
    calls.push(url);if(url==='/api/me')return response(200,{...user,perfil:'aluno'});
    if(url.includes('/avisos?'))return response(200,{items:returned?[]:[{id:'emprestimo:1',recurso:'emprestimo',tipo:'atrasado',titulo:'Obra fictícia em atraso',patrimonio:'P-AVISO',data_referencia:'2026-11-15T12:00:00Z',posicao:null}],total:returned?0:1,pagina:1,limite:10,politica:{antecedencia_configurada:false,antecedencia_dias:null,canais_externos:false}});
    return response(200,{items:[],total:0,pagina:1,limite:10});
  },true);
  try{
    await h.click('Avisos');assert.ok(h.text().includes('Devolução em atraso: Obra fictícia em atraso'));assert.ok(h.text().includes('Prazo de devolução'));
    assert.ok(h.text().includes('antecedência ainda não foi definida'));assert.equal(h.text().includes('Leitor:'),false);
    returned=true;await h.click('Atualizar avisos');assert.equal(h.text().includes('Obra fictícia em atraso'),false);assert.ok(h.text().includes('Nenhum aviso para este filtro'));
    assert.ok(calls.some((url)=>url.startsWith('/api/biblioteca/avisos')));
  }finally{await h.close();}
});

test('2.5 React erro de avisos não afirma ausência de ocorrências',async()=>{
  const h=await harness(async(url)=>url==='/api/me'?response(200,user):response(503,{message:'Avisos indisponíveis.'}),true);
  try{const nav=[...document.querySelectorAll('.nav-item')].find(item=>item.querySelector('span')?.textContent==='Avisos');await h.flush(()=>nav.click());assert.ok(h.text().includes('Avisos indisponíveis.'));assert.equal(h.text().includes('Nenhum aviso para este filtro'),false);assert.ok(document.querySelector('[role=alert]'));}
  finally{await h.close();}
});

test('Pages: preferências próprias e menu móvel preservam foco e não chamam sessão', async () => {
  const requests = [];
  const h = await harness(async (url) => { requests.push(url); throw new Error('Sem API.'); }, 'demo', false, true);
  try {
    const opener = document.querySelector('.menu-button');
    await h.flush(() => opener.click());
    assert.equal(opener.getAttribute('aria-expanded'), 'true');
    await h.click('Configurações');
    assert.equal(document.activeElement, document.querySelector('h1'));
    assert.ok(document.querySelector('.sidebar').hasAttribute('inert'));
    const theme = document.querySelector('[role="switch"][aria-label="Modo noturno"]');
    await h.flush(() => theme.click());
    assert.equal(localStorage.getItem('alexandria-pages-demo-theme'), 'dark');
    assert.equal(localStorage.getItem('bibliotech-theme'), null);
    assert.deepEqual(requests, []);
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

test('AUDIT-FIX A03: retry recupera politica sem repetir lista e conserva erro enquanto pendente', async () => {
  let policies=0, lists=0; const recovered=deferred();
  const h=await harness(async url=>{
    if(url==='/api/me')return response(200,user);
    if(url.includes('/avisos?'))return response(200,{items:[],total:0,pagina:1,limite:10,politica:{antecedencia_configurada:false}});
    if(url.endsWith('/politica'))return ++policies===1?response(503,{message:'Politica temporariamente indisponivel'}):recovered.promise;
    if(url.includes('/emprestimos?')){lists++;return response(200,{items:[],total:0,pagina:1,limite:10});}
    throw Error('Rota inesperada');
  },true);
  try {
    const menu=[...document.querySelectorAll('.nav-item')].find(item=>item.querySelector('span')?.textContent==='Empréstimos');
    await h.flush(()=>menu.click());
    assert.equal(h.button('Novo empréstimo').disabled,true);
    await h.click('Tentar novamente');
    assert.equal(policies,2);assert.equal(lists,1);
    assert.ok(h.text().includes('Politica temporariamente indisponivel'));
    assert.equal(h.button('Tentar novamente').disabled,true);
    await h.flush(()=>recovered.resolve(response(200,{dias:7,limite:3,circulacao_configurada:true,renovacao_configurada:false})));
    assert.equal(h.button('Novo empréstimo').disabled,false);
    assert.equal(h.text().includes('Politica temporariamente indisponivel'),false);
    await h.flush(()=>{const state=document.querySelector('.library-fields select');state.value='todos';state.dispatchEvent(new window.Event('change',{bubbles:true}));});
    assert.equal(policies,2);assert.equal(lists,2);
  } finally {await h.close();}
});

test('AUDIT-FIX A03: erro da lista tem recuperacao independente da politica', async () => {
  let policies=0,lists=0;const recovered=deferred();
  const h=await harness(async url=>{
    if(url==='/api/me')return response(200,user);
    if(url.includes('/avisos?'))return response(200,{items:[],total:0,pagina:1,limite:10,politica:{antecedencia_configurada:false}});
    if(url.endsWith('/politica')){policies++;return response(200,{dias:7,limite:3,circulacao_configurada:true});}
    if(url.includes('/emprestimos?'))return ++lists===1?response(503,{message:'Lista temporariamente indisponivel'}):recovered.promise;
    throw Error('Rota inesperada');
  },true);
  try {
    const menu=[...document.querySelectorAll('.nav-item')].find(item=>item.querySelector('span')?.textContent==='Empréstimos');
    await h.flush(()=>menu.click());await h.click('Tentar novamente');
    assert.equal(policies,1);assert.equal(lists,2);
    assert.ok(h.text().includes('Lista temporariamente indisponivel'));
    await h.flush(()=>recovered.resolve(response(200,{items:[],total:0,pagina:1,limite:10})));
    assert.equal(h.text().includes('Lista temporariamente indisponivel'),false);
    assert.equal(h.button('Novo empréstimo').disabled,false);
  } finally {await h.close();}
});

for(const status of [401,403,503]) for(const method of ['GET','POST']) {
  test(`AUDIT-FIX A04: ${method} ${status} invalida somente 401, inclusive CSRF`,async()=>{
    const calls=[];
    const h=await harness(async url=>{calls.push(url);return url==='/api/me'?response(200,user):response(status,{message:'Resposta de teste'});},false,true);
    try {
      const {libraryRequest}=h.load(path.join(frontend,'src/library/api.ts'));
      await h.flush(async()=>{await assert.rejects(libraryRequest('/livros',method,{}),e=>e.status===status);});
      assert.equal(calls.includes('/api/csrf'),method==='POST');
      if(method==='POST')assert.equal(calls.includes('/api/biblioteca/livros'),false);
      if(status===401){
        assert.deepEqual(h.navigations,['/login']);assert.equal(document.querySelector('[data-testid=admin]'),null);
        await h.returnToTab();assert.equal(calls.filter(url=>url==='/api/me').length,1);
      }else{
        assert.deepEqual(h.navigations,[]);assert.ok(document.querySelector('[data-testid=admin]'));assert.ok(h.button('Sair'));
      }
    }finally{await h.close();}
  });
}

test('AUDIT-FIX A04: 401 concorrente invalida identidade pendente e respostas antigas nao restauram shell',async()=>{
  const identity=deferred(),unauthorized=deferred(),olderData=deferred();let identities=0;
  const h=await harness(async url=>{
    if(url==='/api/me')return ++identities===1?response(200,user):identity.promise;
    return url.endsWith('/livros')?unauthorized.promise:olderData.promise;
  });
  try {
    const {libraryRequest}=h.load(path.join(frontend,'src/library/api.ts'));
    const failed=assert.rejects(libraryRequest('/livros'),e=>e.status===401);
    const older=libraryRequest('/emprestimos');
    await h.returnToTab();assert.equal(identities,2);
    await h.flush(async()=>{unauthorized.resolve(response(401));await failed;});
    assert.deepEqual(h.navigations,['/login']);
    await h.flush(async()=>{identity.resolve(response(200,user));olderData.resolve(response(200,{items:[{titulo:'Dado antigo'}]}));await older;});
    assert.equal(document.querySelector('[data-testid=admin]'),null);
    assert.equal(h.text().includes(user.nome),false);assert.equal(h.text().includes('Dado antigo'),false);
  }finally{await h.close();}
});

test('FINAL.1 dashboard consulta resumo, atualiza sem falso zero e esconde controles ficticios',async()=>{
 const pending=deferred();let failed=false;
 const summary={obras:5,total_exemplares:7,disponiveis:4,emprestados:2,indisponiveis:1,manutencao:1,baixados:0,danificados:0,atrasados:1,reservas_pendentes:2,leitores:2,leitores_habilitados:2,atualizado_em:'2026-11-19T12:00:00Z'};
 const h=await harness(async url=>url==='/api/me'?response(200,user):failed?response(503,{message:'Estoque indisponivel'}):pending.promise,true);
 try{
  assert.ok(h.text().includes('Consultando estoque'));
  await h.flush(()=>pending.resolve(response(200,summary)));
  assert.equal(document.querySelectorAll('.library-metrics dd').length,12);
  assert.ok(h.text().includes('Disponíveis fisicamente'));
  assert.equal(document.querySelector('.nav-badge'),null);
  assert.ok([...document.querySelectorAll('.nav-item')].some(b=>b.textContent==='Reservas'));
  failed=true;await h.click('Atualizar indicadores');
  assert.ok(h.text().includes('Estoque indisponivel'));assert.equal(document.querySelector('.library-metrics'),null);
  await h.click('Configurações');
  assert.equal(document.querySelectorAll('[role="switch"]').length,4);
  assert.equal(h.text().includes('1.284'),false);
  assert.equal(h.button('Simular exportação de dados'),undefined);
 }finally{await h.close();}
});

test('FINAL.1 ficha da equipe combina leitor, emprestimos e reservas pelas APIs autorizadas',async()=>{
 const calls=[];
 const h=await harness(async url=>{
  calls.push(url);if(url==='/api/me')return response(200,user);
  if(url.includes('/leitores?'))return response(200,{items:[{id:'23',nome:'Leitor Final QA',ativo:true,habilitado:true,versao:1}],total:1,pagina:1,limite:10});
  if(url.endsWith('/leitores/23'))return response(200,{id:'23',nome:'Leitor Final QA',email:'ficha@example.invalid',ativo:true,habilitado:true});
  if(url.includes('/emprestimos?'))return response(200,{items:[{id:'1',titulo:'Obra emprestada QA',estado:'ativo',previsto_em:'2026-11-20T12:00:00Z'}],total:1,pagina:1,limite:50});
  if(url.includes('/reservas?'))return response(200,{items:[{id:'2',titulo:'Obra reservada QA',estado:'aguardando',posicao:1}],total:1,pagina:1,limite:50});
  return response(503,{message:'Sem resumo neste teste'});
 },true);
 try{
  await h.click('Leitores');await h.click('Ficha e histórico de Leitor Final QA');
  assert.ok(h.text().includes('Obra emprestada QA'));assert.ok(h.text().includes('Obra reservada QA'));
  assert.ok(calls.some(url=>url.includes('leitor_id=23')));
  assert.equal(document.activeElement.textContent,'Ficha e circulação do leitor');
  await h.click('Fechar ficha detalhada');assert.equal(h.text().includes('Obra emprestada QA'),false);
 }finally{await h.close();}
});

test('FINAL.1 formulario de livro envia ano e sinopse, aguarda API e atualiza lista',async()=>{
 const pending=deferred();let saved=null,submitted=null;
 const book={id:'55',titulo:'Livro Formulario QA',autores:['Autor QA'],categoria:'Estudo QA',ano:2026,sinopse:'Sinopse QA',isbn:null,editora:null,versao:1,total_exemplares:0,circulaveis:0,disponiveis:0};
 const h=await harness(async(url,options)=>{
  if(url==='/api/me')return response(200,user);
  if(url==='/api/csrf')return response(200,{csrfToken:'a'.repeat(64)});
  if(url.endsWith('/resumo'))return response(503,{message:'Resumo separado'});
  if(options?.method==='POST'){submitted=JSON.parse(options.body);return pending.promise;}
  return response(200,{items:saved?[book]:[],total:saved?1:0,pagina:1,limite:10});
 },true);
 try{
  await h.click('Acervo');await h.click('Cadastrar livro');
  for(const [label,value]of [['Título',book.titulo],['Autores',book.autores[0]],['Categoria',book.categoria],['Ano','2026'],['Sinopse',book.sinopse]]){
   const field=[...h.button('Salvar livro').closest('form').querySelectorAll('label')].find(l=>l.textContent.startsWith(label)).querySelector('input,textarea');
   await h.flush(()=>{const proto=field.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(field,value);field.dispatchEvent(new window.Event('input',{bubbles:true}));});
  }
  await h.click('Salvar livro');assert.ok(submitted);assert.equal(submitted.ano,'2026');assert.equal(submitted.sinopse,book.sinopse);
  assert.equal(h.button('Salvar livro').disabled,true);assert.equal(h.text().includes('Operação confirmada pela biblioteca.'),false);
  await h.flush(()=>{saved=book;pending.resolve(response(201,book));});
  assert.ok(h.text().includes(book.titulo));assert.ok(h.text().includes('2026'));assert.ok(h.text().includes(book.sinopse));
 }finally{await h.close();}
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
