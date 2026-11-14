# Integração do frontend — fases 2.0B.1 a 2.0B.3

> Atualização da sprint MVP: login agora retorna { success: true, redirect: "/painel/" }; /area permanece protegida para compatibilidade. Resultado atual: 156 testes aprovados. Os relatos de fases anteriores abaixo são históricos. Ver [entrega-mvp.md](entrega-mvp.md) e README.

## Estado atual — fase 2.0B.3

Experiência e acessibilidade documentadas em [acessibilidade-2.0b3.md](acessibilidade-2.0b3.md): área do aluno com boas-vindas/perfil e navegação simples; seis seções demonstrativas para bibliotecário/administrador; seletor de audiência removido. activeNav permanece local, com aria-current e foco no título. Menu móvel acessível, preferências compatíveis, contraste/tipografia ajustados e metadados Alexandr.IA/pt-BR.

Autenticação, CSRF/logout, revalidação e redirect /area continuam como B.2. Não há operações reais de biblioteca. 153 testes aprovados, zero falhas/ignorados; TypeScript/build aprovados no Node 24.22.3. Homologação visual permanece pendente: ferramenta retornou browser access host is unavailable. Registros anteriores preservados; nova cadeia em figma-alteracoes-2.0b3.sha256.json.

## Registro histórico — fase 2.0B.2

Data: 14/11/2026. Implementada exclusivamente identidade, apresentação inicial por perfil, estados de sessão e logout no React. Backend, contratos, regras de sessão, redirect /area, migrations e login original não foram alterados.
O relato B.1 abaixo permanece histórico. As limitações de identidade/logout daquela etapa foram tratadas nesta fase, sem implementar biblioteca, recuperação, verificação de e-mail, redesign ou deploy.

### Fluxo implementado

main.tsx continua montando App em StrictMode. App passa pelo AuthGate, que usa useAuth e o serviço auth.ts:

1. Começa em loading e apresenta Carregando identidade. Não monta painel, sidebar ou dados de leitores.
2. Consulta GET /api/me, com credentials=same-origin, cache=no-store e redirecionamentos HTTP recusados.
3. HTTP 200 válido retém somente id/nome/email/perfil do contrato público.
4. aluno recebe somente nome, identificação Área do aluno, mensagem de desenvolvimento e Sair.
5. bibliotecario/administrador recebem o painel demonstrativo, com nome/perfil reais no cabeçalho e Sair.
6. Perfil desconhecido não apresenta painel e exibe acesso não autorizado.
7. HTTP 401 descarta a interface e usa location.replace('/login').
8. HTTP 503 apresenta indisponibilidade e Tentar novamente, sem acesso administrativo. JSON inválido, rede ou outro erro apresentam erro genérico e nova tentativa, sem detalhes internos.

O corpo incompleto de um 200 não é considerado autenticação válida. Campos adicionais de resposta não são propagados. Não há solicitação de hash, cookie, identificador de sessão ou segredo.
Identidade fica somente em memória React; não é gravada no localStorage. A biblioteca mantém preferências demonstrativas locais já existentes, sem convertê-las em permissões.

### Organização pequena

- src/services/auth.ts: consulta a identidade e executa CSRF/logout, traduzindo respostas para estados seguros.
- src/hooks/useAuth.ts: estado React, carregamento e eventos de retorno à aba.
- src/components/AuthGate.tsx: bloqueio anterior à identidade, mensagens de erro e área simples de aluno.
- src/components/LogoutButton.tsx: confirmação de saída, botão ocupado e prevenção de cliques duplicados.
- src/App.tsx: alterações pequenas no cabeçalho e envolvimento pelo gate; o painel anterior virou LibraryPanel interno, sem reorganizar suas telas.

### Sessão, retorno à aba e concorrência

focus e visibilitychange, quando a aba está visível, provocam revalidação. Eventos próximos são coalescidos por um intervalo de um segundo; não há polling, renovação ou requisição a cada render.
Durante revalidação o painel é desmontado. Uma resposta 401 impede que a interface anterior continue acessível. Uma resposta 503 mantém somente a tela de indisponibilidade.

StrictMode executa setup/cleanup de efeitos adicionalmente em desenvolvimento. O serviço compartilha apenas a Promise de identidade ainda em andamento e a descarta ao concluir. Não cria cache permanente ou sessão alternativa.
O hook usa geração de requisição e limpeza de listeners para ignorar resultados de efeitos antigos ou após logout. Um teste cobre logout pendente concorrente com revalidação: a resposta antiga 200 não restaura o painel.

Não há temporizador cliente inferindo o prazo da sessão ou renovando cookies. Uma aba continuamente ativa sem novas ações pode continuar mostrando a última interface até uma revalidação/ação; os recursos no servidor continuam sujeitos à expiração absoluta. Após detectar 401, a interface é removida.
Como o painel é desmontado durante a revalidação, seleções e contador demonstrativos podem reiniciar. Preferências locais persistidas continuam separadas da identidade.

### Logout

Sair desabilita imediatamente o botão e usa trava por referência, além de compartilhar somente uma requisição de logout em andamento:

```typescript
const csrfResponse = await fetch("/api/csrf", requestOptions);
// Após validar o contrato do token:
const response = await fetch("/logout", {
  ...requestOptions,
  method: "POST",
  headers: { "X-CSRF-Token": token },
});
```

requestOptions usa cookies de mesma origem e no-store. O CSRF fica somente na variável local da operação, não no storage ou na URL. O formato esperado é o token hexadecimal de 64 caracteres já fornecido pelo backend.
HTTP 200 só é sucesso quando o JSON também contém success=true. Então o gate descarta a identidade e direciona ao login.
401 em CSRF ou logout significa sessão já indisponível; também leva ao login, mas a mensagem do gate não afirma que houve logout confirmado.
503 não redireciona nem afirma sucesso; apresenta saída não confirmada e permite nova tentativa. 403/token inválido e outros erros são tratados com mensagem segura. Não há repetição automática que possa duplicar ações.
O fluxo de logout do backend, sua proteção CSRF e exclusão persistente não foram alterados.

### Identidade não é autorização

O perfil vem exclusivamente de /api/me. audience continua apenas alterando uma mensagem demonstrativa: clicar Aluno nessa simulação não muda o perfil real ou a experiência autorizada.
A interface do aluno não monta contatos, relatórios ou controles administrativos. Isso não esconde código do bundle: por esse motivo os dados nele continuam apenas fixtures sanitizadas.
O servidor continua revalidando usuário ativo em /painel/ e nas APIs; nenhuma autorização de negócio foi transferida para React e nenhuma operação administrativa real foi liberada.

### Ferramenta de teste e dependências

Adicionado somente jsdom 31.0.1 a devDependencies do frontend e atualizado seu pnpm-lock.yaml. Ele oferece DOM emulado porque Node não implementa o ambiente de documento necessário ao React DOM.
Os testes usam node:test, React DOM e React.act. TypeScript, já instalado, transpila os módulos para executar os componentes reais no teste; tsc separado continua verificando tipos. Não foram adicionados Vitest, Jest ou outra biblioteca de montagem.
React 19.2.4, React DOM 19.2.4, Vite 8.0.5, TypeScript 5.9.3, Tailwind 4.2.2 e todas as dependências do backend mantiveram suas versões. jsdom declara suporte à linha Node 24 instalada. Ele não faz parte do bundle de produção.

### Resultados reais da B.2

- Antes: 112 testes anteriores aprovados; TypeScript/build aprovados em Node 24.22.3/npm 11.19.1.
- Depois: **137 aprovados, 0 falhos, 0 ignorados e 0 cancelados** com PostgreSQL 17.10 isolado.
- Dos 25 casos novos, 24 são testes de componentes/serviço com DOM emulado e respostas controladas; um combina componentes React, HTTP real e PostgreSQL real.
- O ciclo real cria somente fixture aleatória de aluno, consulta /api/me no React, executa CSRF/logout e confirma /api/me e /painel/ recusando o cookie anterior. Somente as fixtures próprias são removidas.
- O teste de componentes isolado executado sem TEST_DATABASE teve inicialmente 24 aprovados e um ignorado; a suíte completa posterior executou também esse caso, sem ignorados.
- Cobertos: carregamento sem vazamento visual de dados, três perfis, perfil desconhecido, 401, 503/retry, falhas inesperadas, StrictMode, retorno à aba, corrida de respostas, botão duplicado, CSRF, sessão expirada e falha de saída.
- Os testes anteriores de cadastro, Argon2id, sessões, autorização, arquivos e 501 continuam executados. A verificação histórica do frontend foi adaptada para encadear B.1 e B.2, sem regravar registros antigos.
- Homologação visual real: PENDENTE. jsdom não mede layout, CSS renderizado, leitor de tela ou comportamento completo do navegador.

TypeScript final passou sem diagnósticos. Build: 20 módulos, 217 ms nesta execução:

| Arquivo | Tamanho | gzip |
| --- | --- | --- |
| index.html | 0,88 kB | 0,42 kB |
| index-Cyzdl5Aq.css | 35,31 kB | 7,83 kB |
| index-D3QMmk1X.js | 230,10 kB | 69,52 kB |
| robots.txt | 0,02 kB | 0,04 kB |

Não há benchmark de carga ou homologação visual implícita nesses números.

### História preservada

docs/figma-importacao.sha256.json e docs/figma-alteracoes-2.0b1.sha256.json permanecem intactos.
O novo [figma-alteracoes-2.0b2.sha256.json](figma-alteracoes-2.0b2.sha256.json) registra mudanças em App.tsx, package.json e pnpm-lock.yaml, e os quatro módulos novos. A verificação compara a versão atual com essa cadeia autorizada.
Root package.json/package-lock.json, backend e todas as migrations e arquivos do login permaneceram sem alterações nesta fase. Não houve nova configuração sensível, tabela, conta administrativa ou redirect.

### Aprendizado com o código

useEffect sincroniza o componente com um sistema externo: useAuth inicia a consulta e registra eventos do navegador. Sua função de limpeza remove listeners e invalida resultados antigos ao desmontar.
useState controla o estado da interface. setState({ status: 'loading' }) faz o gate apresentar carregamento em vez do painel; um 503 seleciona a tela de indisponibilidade.
fetch realiza HTTP; credentials='same-origin' permite ao navegador enviar o cookie já existente. O JavaScript não lê o cookie HttpOnly para isso.

Exemplo real do hook:

```typescript
const result = await getIdentity();
if (mounted.current && current === generation.current) setState(result);
```

A comparação impede uma resposta antiga de desfazer uma transição mais recente.
Autenticação confirma identidade; autorização decide operações permitidas. /api/me informa o perfil atual, mas o backend continua responsável por restringir acesso real.
CSRF é um token ligado à sessão, diferente de senha ou ID de sessão. O servidor exige esse token para impedir que uma página externa execute logout apenas induzindo envio automático do cookie.
Não apresentar dados antes de confirmar identidade evita flashes de ferramentas administrativas e exposição indevida na interface. O gate é uma defesa de apresentação, não substitui as proteções HTTP.

### Execução e conferência manual

Use os comandos do README: instale o frontend com pnpm --frozen-lockfile, execute tsc --noEmit, gere build e rode npm test com alexandria_test explicitamente configurado. Sem TEST_DATABASE, 48 casos de integração são ignorados, nunca aprovados por simulação.
O backend continua exigindo configuração de banco e segredo local; npm start não altera migrations nem gera build.
No Edge: login com conta fictícia, retorno a /area e acesso manual a /painel/. Aluno deve ver área simples e Sair; bibliotecário/administrador de teste previamente autorizados devem ver nome/perfil reais e protótipo. Não criar administrador real por cadastro público; ele continua fixo em aluno.
Retorne à aba após sair/desativar a fixture em outro contexto de teste, confira 401/redirecionamento; exercite indisponibilidade somente no banco isolado. Não registrar cookies, token ou senha em evidências.

### Limitações e B.3

Permanecem pendentes homologação visual, identidade Bibliotech/Figma, idioma e acessibilidade apontados na auditoria. A proteção de assets pode retornar 401 JSON antes mesmo de carregar o React se a sessão já estiver expirada; o redirect do gate só acontece quando o JavaScript já foi carregado.
Sem renovação automática e sem vigilância contínua enquanto a aba permanece ativa. Nenhuma API de biblioteca ou dado privado foi acrescentado ao bundle.
Na fase B.3, mediante autorização, detalhar navegação/experiências por perfil e acessibilidade e homologar no navegador. Avaliar redirect definitivo somente depois desse aceite; nesta fase continua /area.

---

## Registro histórico — fase 2.0B.1

Data: 14/11/2026. Escopo: homologar Node 24 e servir o build React autenticado em /painel/. Sem identidade carregada no React, redirect definitivo, logout React, APIs de biblioteca ou deploy.

## Homologação obrigatória antes da implementação

O terminal confirmou Node v24.22.3 e npm 11.19.1. Antes de alterar a integração foram executados:

1. npm ci na raiz, com package-lock.json preservado.
2. Suíte completa anterior: 98 aprovados, zero falhas, ignorados ou cancelamentos.
3. pnpm 10.34.3 com --frozen-lockfile --ignore-scripts no frontend.
4. TypeScript: tsc --noEmit, código de saída 0.
5. Build original Vite 8.0.5, código 0.

Argon2 0.44.0 foi carregado e executado nativamente: a suíte gera e verifica hashes reais, incluindo Unicode e espaços. pg, express-session e connect-pg-simple passaram nos testes de banco, persistência, regeneração, CSRF e logout. Esta é homologação executada no Node 24, não apenas inferida de engines.

npm ci instalou 102 pacotes e auditou 103, informando zero vulnerabilidades naquele momento. npm 11 apresentou aviso de install scripts de argon2 ainda não cobertos por allowScripts. Não foi feita aprovação global; o binário fornecido funcionou e passou nos testes. Se outra máquina não carregar o binário, analisar a falha antes de liberar scripts ou trocar dependências.
Isso não representa uma auditoria de vulnerabilidades do frontend.

| Componente | Versão executada |
| --- | --- |
| Node / npm | 24.22.3 / 11.19.1 |
| PostgreSQL de teste | 17.10 |
| Express / pg | 5.3.0 / 8.23.1 |
| argon2 | 0.44.0 |
| express-session / connect-pg-simple | 1.19.0 / 10.0.0 |
| express-rate-limit | 8.7.4 |
| pnpm | 10.34.3, cache local |
| React / React DOM | 19.2.4 / 19.2.4 |
| TypeScript / Vite | 5.9.3 / 8.0.5 |
| Tailwind CSS | 4.2.2 |

Não houve atualização de dependências ou troca automática do Node instalado pelo responsável. .mise.toml agora fixa 24.22.3, alinhando a configuração exportada à versão realmente homologada.

## Fluxo e política de entrega

O login continua respondendo { success: true, redirect: '/area' }. Depois de autenticar, o usuário pode abrir manualmente /painel/ na mesma origem. /area permanece disponível, inclusive para usar o logout já existente.

backend/app.js aplica sessions.read e sessions.authenticate antes de express.static em /painel. Documento, JavaScript, CSS, favicon e robots.txt exigem sessão válida e revalidação do usuário ativo. Todos recebem Cache-Control: no-store. Não se consideram os assets públicos nesta etapa.
O cookie HttpOnly existente é enviado automaticamente pelo navegador à mesma origem; não existe autenticação nova no React, JWT ou sessão em localStorage.

| Situação | Resultado |
| --- | --- |
| GET /painel/ com sessão válida e build disponível | 200 HTML |
| Asset de /painel/ com sessão válida | 200, tipo de conteúdo correto |
| Documento ou asset sem sessão | 401 JSON |
| Sessão expirada, excluída ou usuário desativado | 401, nenhum build entregue |
| Persistência indisponível ao verificar sessão | 503, nenhum build entregue |
| Arquivo ausente dentro do painel autenticado | 404 JSON, sem fallback SPA |
| GET/POST de URL API desconhecida | 404 JSON, nunca index.html |

Não há React Router no protótipo. Por isso não foi criado fallback de rotas para index.html: /painel/rota-inexistente e /painel/api/me retornam 404, assim como assets inexistentes. A API real continua em /api, fora do prefixo /painel.
Fontes TypeScript, node_modules, .figma e a pasta frontend não são disponibilizados diretamente. Apenas frontend/dist é o diretório estático protegido. Arquivos ocultos são recusados.
O servidor não gera o build automaticamente. Se dist/index.html estiver ausente, o painel autenticado retorna 404 com orientação de build; páginas públicas e health continuam disponíveis.

Sem cookie, a proteção retorna 401 mesmo sem banco configurado. Com cookie que exige consulta e banco indisponível, falha fechada com 503. As regras de banco local/teste continuam iguais; não se relaxou autenticação PostgreSQL ou permissão de contas.
Não foi adicionado CORS ou trust proxy. O servidor Express continua em loopback; Vite não é necessário para entregar /painel/.

## Vite e mudanças de configuração

O build usava base /, gerando /assets/...; esses caminhos não corresponderiam ao prefixo protegido. O padrão do Vite passou a /painel/ e o favicon padrão a /painel/favicon.svg.
A possibilidade FIGMA_PUBLIC_URL foi mantida por compatibilidade com a configuração exportada. Não defina essa variável para o build local integrado: os testes exigem que os assets usem /painel/.
Os demais plugins Figma e os padrões de dev/preview não foram modificados. Se iniciar o Vite para diagnóstico, especifique --host 127.0.0.1 --port 5173 --strictPort; ele continua sendo um ambiente separado sem autenticação.

.figma/make/site.json teve somente a descrição alterada: o metadado anterior prometia notificações, e agora declara dados fictícios e ações simuladas. Essa mudança é necessária para não distribuir uma promessa falsa no HTML. Título Figma Make App, idioma en e identidade Bibliotech permanecem pendências de outra etapa, sem redesign.

## Dados demonstrativos e ações

src/App.tsx foi alterado somente para sanitizar dados e tornar explícitos os limites do protótipo:

- Três leitores passaram a Leitor fictício 01/02/03, com iniciais F1/F2/F3.
- Seus e-mails são leitor01/02/03@example.invalid; os três telefones foram removidos e substituídos por texto Sem telefone real — demonstração.
- O cabeçalho e a referência pessoal de governança passaram a Conta demonstrativa, sem representar a pessoa autenticada.
- Curso e identificação acadêmica do destaque são explicitamente fictícios.
- E-mail padrão da biblioteca passou a biblioteca@example.invalid.
- Links mailto foram removidos. O botão de contato agora apenas informa que nenhum e-mail foi enviado.
- Foi acrescentado aviso visível de painel demonstrativo, dados fictícios e ausência de identidade integrada.
- Empréstimo, cadastro de livro, avisos, exportação, exclusão e política de privacidade passaram a se declarar simulações, sem sucesso falso.
- Renovar por um dia agora se chama Simular +1 dia: altera apenas o contador local.
- Declarações de conformidade, criptografia de contatos e consentimentos reais foram substituídas por descrições explícitas de demonstração.

Autores e títulos de livros públicos e as contagens ilustrativas foram mantidos. Não há dados provenientes de usuarios, alunos ou sessoes no bundle.
Preferências de tema/acessibilidade e um contato demonstrativo continuam em localStorage; nenhuma sessão, senha, hash ou token é gravado ali. Um valor digitado anteriormente pelo próprio navegador pode continuar no storage daquele navegador, por isso não informar dados pessoais reais ao protótipo.

Ocultar uma seção no React não protegeria contatos: o JavaScript já estaria entregue ao usuário. Por isso os contatos desconhecidos foram removidos do bundle, não apenas escondidos. Nesta fase qualquer conta ativa com sessão pode abrir o protótipo sanitizado; não existe autorização de operações bibliotecárias, porque tais operações ainda não existem.

## Histórico e arquivos modificados

Modificados:

- backend/app.js: montagem protegida de /painel e 404 JSON para APIs desconhecidas.
- frontend/src/App.tsx: fixtures e indicações verdadeiras de simulação.
- frontend/vite.config.ts: base e favicon sob /painel/.
- frontend/.mise.toml: Node 24.22.3.
- frontend/.figma/make/site.json: descrição demonstrativa.
- README.md e notas documentais relacionadas.

Criados: tests/painel.test.js, este documento e docs/figma-alteracoes-2.0b1.sha256.json.
O registro SHA-256 original de importação não foi sobrescrito. Seu hash continua:

```text
fe5ecf40a67d5539981ce62816f64f33dffc3625ef914406f22a70eefa0cec84
```

[figma-alteracoes-2.0b1.sha256.json](figma-alteracoes-2.0b1.sha256.json) registra antes/depois dos quatro arquivos do frontend alterados. Os outros 20 importados permanecem iguais. O novo teste confere essa diferença limitada e o manifesto original.
Um snapshot anterior de 44 arquivos confirmou que os 40 fora das mudanças esperadas permanecem idênticos; site.json, não incluído naquele snapshot, é conferido pelo manifesto de importação.
Permaneceram intactos package.json/package-lock.json da raiz, package.json/pnpm-lock.yaml do frontend, os testes anteriores, todos os arquivos do login e seus dois registros históricos, as migrations 001/002/003 e as regras de autenticação.

## Resultados finais

TypeScript final: aprovado, sem diagnósticos.
Build final: aprovado, 16 módulos transformados, 208 ms observados nesta máquina.

| Artefato | Tamanho | gzip |
| --- | --- | --- |
| dist/index.html | 0,88 kB | 0,42 kB |
| dist/assets/index-C7Vc0h1h.css | 35,28 kB | 7,83 kB |
| dist/assets/index-z4JK4G2n.js | 225,37 kB | 68,09 kB |
| dist/robots.txt | 0,02 kB | 0,04 kB |

Suíte final no Node 24: **112 aprovados, 0 falhos, 0 ignorados e 0 cancelados**.
São os 98 anteriores preservados e 14 casos novos: seis verificações independentes de integração de banco e oito com PostgreSQL/sessão reais.
Os novos testes verificam:

- histórico de importação e somente as quatro mudanças autorizadas;
- base correta dos assets e ausência de source maps;
- e-mails apenas example.invalid, ausência dos nomes/telefones anteriores, de mailto e de afirmações antigas de sucesso;
- rejeição de painel/assets sem sessão e de atalhos para fontes;
- JSON 404 para API desconhecida;
- documento e todos os assets referidos pelo HTML, comparados com os arquivos reais;
- expiração do store e prazo absoluto, invalidação, CSRF/logout, desativação, cache condicional e banco indisponível;
- ausência de fallback para arquivos/rotas desconhecidos.

O cliente HTTP dos testes mantém cookies sem imprimi-los. As fixtures têm e-mails e senhas fictícios aleatórios; somente seus próprios registros são removidos ao terminar. O PostgreSQL de teste é o cluster temporário separado em 127.0.0.1:55439, banco alexandria_test, utilizado nas fases anteriores. Nenhum banco de desenvolvimento ou produção foi utilizado.
Se TEST_DATABASE não estiver configurado, 47 testes de integração são ignorados; não apresentar isso como homologação completa. O build real é pré-requisito da suíte atual: sua ausência causa falha, não aprovação simulada.
Não foram impressos cookies, senhas, CSRF ou SESSION_SECRET. O cluster temporário foi encerrado ao concluir a execução; os serviços PostgreSQL 17 e 18 existentes permaneceram em execução.

## Executar localmente

Primeiro, confirmar node --version e npm --version. Para preparar tudo a partir da raiz:

```powershell
npm ci
cd frontend
npm exec --yes --package=pnpm@10.34.3 --cache ../.npm-cache --offline=false -- pnpm install --frozen-lockfile --ignore-scripts --store-dir ../.npm-cache/pnpm-store
node node_modules/typescript/bin/tsc --noEmit
npm exec --yes --package=pnpm@10.34.3 --cache ../.npm-cache --offline -- pnpm run build
cd ..
```

Configure o .env local ignorado, com o banco do projeto, segredo aleatório e APP_ORIGIN correspondente à URL utilizada, como documentado no README. Não copiar segredos para chat ou histórico compartilhado.
Para homologação, use exclusivamente alexandria_test, DB_ENV=test e NODE_ENV=test. Para seu desenvolvimento local próprio, mantenha alexandria_dev separado. Não aplicar migrations em produção.

```powershell
npm run db:check
npm run db:migrate
npm start
```

Abra http://localhost:3000/login, cadastre/autentique somente uma conta fictícia e confirme o retorno a /area. Em seguida abra manualmente http://localhost:3000/painel/. Não é preciso iniciar Vite.
Para testar logout, use o botão Sair de /area; depois /painel/ deverá retornar 401. O painel React ainda não tem botão de logout integrado.

Para a suíte completa, além do banco de teste configurado e build gerado:

```powershell
$env:NODE_ENV = 'test'
$env:DB_ENV = 'test'
$env:PGHOST = '127.0.0.1'
$env:PGPORT = '5432' # a porta do seu servidor isolado
$env:PGDATABASE = 'alexandria_test'
$env:PGUSER = 'alexandria_app' # usuário próprio, previamente configurado
$env:TEST_DATABASE = 'alexandria_test'
npm test
```

## Explicação didática

Um build React é um conjunto de arquivos HTML, JavaScript, CSS e recursos que o navegador pode carregar. O Vite transforma TypeScript/JSX e reúne as dependências em assets; ele não transforma o protótipo em API ou banco.

O frontend executa no navegador e cuida da interface. O backend Express recebe HTTP, verifica sessão e decide se entrega o arquivo. express.static associa uma pasta do disco a um prefixo de URL, aqui frontend/dist a /painel.
Neste projeto a proteção vem antes da entrega:

```javascript
app.use('/painel', ...protectedRoute, express.static(buildDirectory));
```

O exemplo resume a ordem; o código real também configura índices, arquivos ocultos, redirecionamento e erro 404. A requisição é recusada antes de ler o arquivo quando não há autorização de sessão.
HTML público não deve ser usado como resposta para API inexistente: um cliente espera JSON e um status correto, não uma tela com 200.

Cookies pertencem ao host e têm regras de envio do navegador. Quando frontend e API estão na mesma origem, os futuros fetch('/api/me') e logout poderão usar o cookie HttpOnly automaticamente; o JavaScript não precisa ler seu valor.
Essas chamadas futuras ainda não foram adicionadas. Perfil apresentado no React será apenas orientação visual; decisões de acesso a dados/operações continuarão no servidor com usuário atual revalidado.

## Limitações e próxima subetapa

Esta homologação comprova instalação/build e integração HTTP no Node 24. Não comprova aparência no Edge, teclado ou leitor de tela. Nenhuma tentativa repetitiva de controle de navegador foi realizada; a homologação visual continua pendente.
Idioma en, identidade Bibliotech/Figma, ampliação de texto, contraste e nomes acessíveis continuam no diagnóstico da 2.0A. Ações de biblioteca e privacidade continuam ilustrativas.
Código já baixado pode continuar na memória do navegador após expirar a sessão; o servidor impede novos acessos e os dados distribuídos são somente fixtures. Não existe mecanismo de atualização/identidade em React nesta subetapa.

Próxima etapa recomendada, mediante autorização: carregamento inicial de /api/me, estados 401/503, identidade real mínima, logout React com CSRF e definição da apresentação por perfil. Só depois decidir sobre redirect de login para /painel/. Recuperação, notificações e APIs de biblioteca permanecem fora desta fase.

## Referências

- Express static: https://expressjs.com/en/5x/api.html#express.static
- Base pública Vite: https://vite.dev/guide/build.html#public-base-path
