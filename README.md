# Alexandr.IA

## Estado atual — FINAL.1 (19/11/2026)

**210 testes aprovados, zero falhas/ignorados/cancelados**, TypeScript, instalação por lockfiles, builds real/demo e verificador estático aprovados. npm audit/pnpm audit retornaram zero avisos na consulta desta entrega. [Relatório funcional, matriz de controles e roteiro Edge](docs/final1-homologacao-funcional.md).

O painel da equipe agora consulta estoque agregado real, ficha de leitor com circulação, reservas e avisos separados. Acervo inclui ano/sinopse opcionais; entradas e mudanças de estado/conservação dos exemplares geram histórico com operador. Alterar exemplar exige motivo e é bloqueado durante empréstimo ativo. Os contadores vêm do banco; não há contador fixo no painel real nem controles institucionais falsos de privacidade.

**25 rotas de biblioteca** e migration aditiva **008_complete_catalogo_estoque.sql**; 001–007 preservadas. Não executar a nova migration em banco desconhecido: o servidor novo requer 008. Ela foi homologada apenas em bancos isolados, inclusive cópia populada que preservou obras/exemplares. Nenhuma migration foi aplicada ao VISUAL-QA original ou a banco habitual.

Prévia local nova: **http://127.0.0.1:3018/login**, configuração e credenciais somente em diretório protegido indicado por `tmp/final1-qa-location.txt`. VISUAL-QA anterior em `http://localhost:3017/login` foi preservado, com seu build anterior. Use a origem exata da prévia nova para separar os cookies. Homologação visual/teclado/Narrador continua pendente: o controle gráfico não ficou acessível. Esta etapa não publica Pages nem hospeda backend na Internet.

Os registros abaixo são históricos das etapas anteriores, não substituem o estado FINAL.1.

## Estado atual — AUDIT-FIX.1 (18/11/2026)

Correções locais: recuperação independente da política de circulação após erro e invalidação imediata da identidade quando a API autenticada retorna 401. Respostas 403/503 continuam erros de permissão/indisponibilidade, sem logout. Vite atualizado de 8.0.5 para **8.1.6**, preservando React, Tailwind e TypeScript. **202 testes aprovados, zero falhas/ignorados/cancelados**, TypeScript e ambos os builds aprovados em instalação independente. Consulte os riscos e arquivos candidatos em [audit-fix1-resultado.md](docs/audit-fix1-resultado.md).

O sistema real possui **23 rotas de biblioteca**, incluindo avisos internos. Visão geral da equipe usa avisos reais; relatórios/configurações institucionais continuam ilustrativos. A demo Pages usa somente cenário fictício em memória e continua sem API, senha ou sessão. Esta correção não foi publicada. Homologação desktop/mobile/Narrador, direitos/licença, fontes externas e endurecimento adicional do workflow dependem de decisão humana. Os checkpoints abaixo são registros históricos de cada entrega.

## Sprint 2 — avisos internos e demonstração (2.5–2.6)

Em **16/11/2026**, checkpoint 2.5 com **192 testes** e entrega 2.6 com **193 testes aprovados**, zero falhas e zero ignorados. TypeScript e os dois builds aprovados em Node 24.22.3/PostgreSQL 17.10, usando banco temporário isolado. [Relatório da Sprint 2, inventário e homologação manual](docs/sprint2-relatorio.md).

O sistema autenticado apresenta avisos reais de atraso e reservas; proximidade de vencimento exige `LIBRARY_NOTICE_DAYS` explicitamente definido pelo responsável, sem padrão institucional. Equipe: Visão geral; aluno: Avisos. Atualizar a consulta reflete devoluções, renovações e alterações da fila. Sem envio por e-mail, WhatsApp ou SMS. Nenhuma migration nova nesta sprint; 001–007 preservadas.

A demo independente agora apresenta catálogo, leitores, empréstimos, devolução, reservas, renovação e avisos com um cenário fictício em memória, reiniciável. Não usa API, sessão, senha ou persistência dessas operações. Relatórios e configurações continuam exemplos. Builds mantêm `/painel/` e `/Alexandr.IA/`. Homologação visual em navegador/leitor de tela pendente. Nenhum commit, push ou deploy realizado nesta sprint.

## Sprint 1 — sistema bibliotecário local (2.1–2.4)

Estado atual em **16/11/2026**: acervo, leitores, empréstimos/devoluções e reservas/renovações implementados no sistema autenticado. **185 testes aprovados, zero falhas/ignorados**, com TypeScript e builds real/demo aprovados. [Relatório, endpoints, políticas e roteiro manual](docs/sprint1-relatorio.md).

As migrations 004–007 foram acrescentadas; 001–003 permanecem intactas. Nenhuma migration foi aplicada ao banco de desenvolvimento nesta execução. Retiradas e renovações exigem políticas explícitas do responsável; não há valores institucionais padrão. Sem commit, push ou deploy da Sprint 1.

## Demonstração estática para GitHub Pages — DEMO.1

Modo independente, com seis seções e aviso "Demonstração acadêmica — dados simulados". Sem senha, autenticação ou chamadas a /api/me. Build específico em frontend/dist-demo, base /Alexandr.IA/; o sistema real continua em /painel/. [Instruções, workflow manual e limitações](docs/pages-demo.md).

Registro da DEMO.1: 160 testes aprovados naquela etapa. Para npm test, gerar ambos os builds. A fase 2.6 acrescentou representações fictícias das operações; as operações persistentes da Sprint 1 continuam exclusivas do sistema autenticado.

MVP acadêmico da Fatec Botucatu para estudar o desenvolvimento de um sistema bibliotecário: interface web, API, banco relacional, autenticação, sessões, testes e acessibilidade.

**Entrega acadêmica de referência: 15/11/2026; Sprint 1 concluída localmente em 16/11/2026.** Usar dados fictícios na homologação. As operações de biblioteca descritas abaixo usam PostgreSQL real; visão geral/relatórios e a demo Pages continuam identificados como demonstração. Esta sprint não publicou alterações remotas.

## Equipe e objetivos acadêmicos

Projeto do grupo da Fatec Botucatu. A documentação disponível não identifica nominalmente os participantes; nomes não foram inventados nem extraídos do computador. A equipe poderá acrescentar créditos públicos aprovados posteriormente, sem RA, contatos ou outros dados pessoais.

Objetivos: compreender separação frontend/backend, modelagem PostgreSQL e migrations, validação no servidor, Argon2id, cookies e CSRF, desenvolvimento colaborativo e avaliação de acessibilidade.

## O que funciona e o que é demonstração

| Situação | Recursos |
| --- | --- |
| Implementado | Cadastro real como aluno; senhas de 15–128 pontos de código Unicode, incluindo espaços; login Argon2id; sessões PostgreSQL; identidade por /api/me; logout protegido por CSRF; bloqueio de conta inativa e sessão expirada |
| Implementado | Painel autenticado em /painel/; catálogo real por obra/exemplar, pesquisa, filtros, patrimônio, cadastro e edição pela equipe |
| Implementado | Gestão de leitores reutilizando usuarios/alunos; perfil próprio; circulação transacional, devoluções, atrasos/histórico, fila de reservas e renovação por política explícita |
| Implementado | Avisos internos de atraso, prazo próximo quando configurado e reservas; acompanhamento pela equipe e consulta restrita ao próprio aluno |
| Demonstrativo | Relatórios ilustrativos, contador do cabeçalho e controles de privacidade identificados como exemplos; todas as seis seções do Pages estático |
| Local no navegador | Tema, contraste, texto ampliado, redução de movimentos e contato de demonstração; não representam permissões ou alterações no banco |
| Futuro | Relatórios agregados reais, leitores externos se aprovados, recuperação de senha e canais externos de notificação após aprovação institucional |

Cadastro público nunca cria bibliotecário ou administrador. Não há tela/API de promoção de perfil nem administrador padrão. Aluno não recebe os controles internos do protótipo. Esconder controles não é autorização: a sessão e o usuário ativo continuam sendo verificados pelo servidor.

Os botões demonstrativos informam que nada foi enviado/criado, ou ficam desabilitados. POST /api/forgot-password e /api/senha-nova retornam **501**, sem fingir recuperação funcional.

## Tecnologias e versões verificadas

| Componente | Versão executada |
| --- | --- |
| Node.js / npm | 24.22.3 / 11.19.1 |
| PostgreSQL | 17.10 |
| Express / pg | 5.3.0 / 8.23.1 |
| Argon2 / express-session / connect-pg-simple | 0.44.0 / 1.19.0 / 10.0.0 |
| express-rate-limit | 8.7.4 |
| React / React DOM | 19.2.4 / 19.2.4 |
| TypeScript / Vite / Tailwind CSS | 5.9.3 / 8.1.6 / 4.2.2 |
| pnpm / jsdom de testes | 10.34.3 / 31.0.1 |

Backend usa package-lock.json; frontend usa pnpm-lock.yaml. Não misturar npm install no frontend nem atualizar versões para reproduzir esta entrega. O engines histórico da raiz permite >=20, mas o runtime alvo e validado é Node 24; isso não homologa todas as versões aceitas pela faixa.

## Estrutura

```text
backend/
  app.js                    configuração Express e rotas
  server.js                 porta loopback e encerramento
  controllers/ services/    contratos HTTP e regras de negócio
  repositories/ validators/ SQL parametrizado e validação
  middleware/sessoes.js     sessão, usuário ativo, CSRF e perfis
  db/pool.js                conexão e proteção de destinos locais
  views/                    /area temporária de compatibilidade
  library/                  catálogo, leitores, circulação, reservas e router protegido
database/migrations/        001–003 históricas; 004 acervo, 005 vínculo, 006 circulação, 007 reservas
frontend/
  src/App.tsx               composição das vistas reais protegidas
  src/LibraryPanel.tsx       layout compartilhado, mantendo demonstração independente
  src/library/              telas/API cliente da biblioteca real
  src/DemoApp.tsx            visita estática sem autenticação
  src/components/           AuthGate e LogoutButton
  src/hooks/                autenticação e navegação acessível
  src/services/auth.ts      identidade, CSRF e logout
  src/index.css             estilo e acessibilidade
login/                      13 arquivos do módulo original do grupo
scripts/                    check de banco e executor de migrations
tests/                      testes nativos Node, HTTP, PostgreSQL e React
docs/                       contratos, auditorias e históricos SHA-256
.env.example                modelo sem credenciais
```

## 1. Instalar ferramentas

Instale Node.js **24 LTS** pela [página oficial](https://nodejs.org/en/download/) e PostgreSQL **17** pela [página oficial de Windows](https://www.postgresql.org/download/windows/). O instalador PostgreSQL inclui servidor, ferramentas e pgAdmin. Não desative a autenticação do PostgreSQL; escolha uma senha local própria durante a instalação.

Abra um novo terminal para reconhecer PATH. Exemplos abaixo usam PowerShell. Se psql não for encontrado, adicione a pasta bin do PostgreSQL ao PATH ou execute-o pelo caminho da instalação.

```powershell
node --version
npm --version
psql --version
```

Outras versões/sistemas exigem sua própria verificação; esta execução foi Windows x64.

## 2. Instalar dependências e gerar o frontend

Na raiz do projeto:

```powershell
npm ci
cd frontend
npm exec --yes --package=pnpm@10.34.3 --cache ../.npm-cache -- pnpm install --frozen-lockfile --ignore-scripts --store-dir ../.npm-cache/pnpm-store
node node_modules/typescript/bin/tsc --noEmit
npm exec --yes --package=pnpm@10.34.3 --cache ../.npm-cache -- pnpm run build
cd ..
```

O primeiro uso requer Internet para baixar ferramentas/pacotes; não use --offline em um computador sem cache. Instalação limpa foi validada com os lockfiles preservados. npm 11.19.1 avisou sobre o script de instalação de argon2; o binário disponível funcionou nos testes. Se outro sistema precisar compilá-lo, siga o diagnóstico do pacote e instale as ferramentas de compilação apropriadas, sem substituir a autenticação por simulação.

frontend/dist é gerado localmente e não vai para o GitHub. Sem build, o painel autenticado responde 404 com orientação; não é falha de senha.

## 3. Preparar bancos locais

Com o administrador PostgreSQL, crie usuários sem privilégios de administrador e bancos separados. Exemplo no psql, usando a porta real da sua instalação:

```powershell
psql -h 127.0.0.1 -p 5432 -U postgres -d postgres
```

No prompt psql, executar uma única vez:

```sql
CREATE ROLE alexandria_app LOGIN;
\password alexandria_app
CREATE DATABASE alexandria_dev OWNER alexandria_app;

CREATE ROLE alexandria_test_app LOGIN;
\password alexandria_test_app
CREATE DATABASE alexandria_test OWNER alexandria_test_app;
\quit
```

O comando \password solicita a senha de forma interativa; não versionar nem compartilhar esses valores. Se bancos/roles já existem, confira-os e não recrie nem exclua dados. São nomes técnicos de exemplo, sem credencial fixa.

O código aceita somente loopback e os bancos alexandria_dev/alexandria_test correspondentes a DB_ENV. NODE_ENV=production é recusado pela configuração do banco: este MVP foi deliberadamente limitado ao uso local.

## 4. Configurar o ambiente

Copie .env.example para .env **somente se .env ainda não existir**:

```powershell
if (!(Test-Path -LiteralPath .env)) { Copy-Item .env.example .env }
```

Edite localmente:

```dotenv
NODE_ENV=development
SESSION_SECRET=
SESSION_COOKIE_SECURE=false
APP_ORIGIN=http://localhost:3000
DB_ENV=development
PGHOST=127.0.0.1
PGPORT=5432
PGDATABASE=alexandria_dev
PGUSER=alexandria_app
PGPASSWORD=
```

Preencha PGPASSWORD com sua senha local. Gere SESSION_SECRET aleatório sem imprimi-lo. O bloco abaixo se recusa a substituir um segredo já configurado:

```powershell
@'
const fs = require('node:fs');
const crypto = require('node:crypto');
let text = fs.readFileSync('.env', 'utf8');
if (/^SESSION_SECRET=.+$/m.test(text)) throw new Error('Segredo já configurado.');
text = text.replace(/^SESSION_SECRET=.*$/m, 'SESSION_SECRET=' + crypto.randomBytes(48).toString('base64url'));
fs.writeFileSync('.env', text);
'@ | node -
```

.env está ignorado pelo Git; .env.example permanece com os segredos vazios. Não imprimir configuração completa para depuração. APP_ORIGIN deve corresponder à origem usada no navegador; para 127.0.0.1 em vez de localhost, ajuste-o também.

## Políticas locais de circulação

Em .env, definir somente valores aprovados pelo responsável, sem copiar senhas ou presumir políticas da Fatec:

```dotenv
LIBRARY_LOAN_DAYS=
LIBRARY_MAX_LOANS=
LIBRARY_RENEWAL_DAYS=
LIBRARY_MAX_RENEWALS=
LIBRARY_NOTICE_DAYS=
```

Faixas técnicas: retirada 1–365 dias; 1–100 ativos por aluno; renovação 1–365 dias adicionais e 0–20 renovações. Limite zero desabilita renovação. Sem configuração válida, a operação correspondente retorna 503 e a interface informa a pendência. Reinicie o servidor após configurar. Os testes usam valores fictícios próprios, que não são regras institucionais.

Reservas são por obra, em FIFO, sem exemplar alocado até a retirada. Não há multa, expiração automática ou prioridade especial presumida. As decisões conservadoras e suas limitações estão em [sprint1-24.md](docs/sprint1-24.md).

## 5. Migrations e execução

Com .env preenchido para alexandria_dev:

```powershell
npm run db:check
npm run db:migrate
npm start
```

As migrations são explícitas, transacionais e registradas por checksum. Para atualizar uma instalação anterior, o responsável precisa aplicar 004–007 no banco local autorizado antes de usar as novas telas. Não editar migrations aplicadas; novas mudanças futuras exigem novo arquivo numerado. O servidor não aplica migrations automaticamente.

Abra **http://localhost:3000/cadastro** e crie somente dados fictícios. Depois entre em **http://localhost:3000/login**: o backend responde **{ success: true, redirect: '/painel/' }**. O JavaScript original segue esse destino sem precisar ser alterado.

O Express entrega backend e frontend pela mesma origem. /area continua sendo a página temporária protegida de compatibilidade, sem substituir o painel. Para encerrar: Ctrl+C. Outra porta: definir PORT e ajustar APP_ORIGIN antes de npm start.

Para desenvolvimento visual isolado, opcionalmente:

```powershell
cd frontend
npm exec --yes --package=pnpm@10.34.3 --cache ../.npm-cache -- pnpm run dev --host 127.0.0.1 --port 5173 --strictPort
```

Essa instância Vite **não fornece a sessão/API Express**. Para demonstrar cadastro/login/painel/logout, use o build entregue pelo Express. Não executar os scripts importados .figma/make/deploy ou deploy-preview.

## Rotas principais

| Método e rota | Contrato |
| --- | --- |
| GET / | Redireciona para /login |
| GET /login, /cadastro, /esqueci-senha, /senha-nova | Formulários do grupo |
| GET /static/*.css e *.js | Recursos do módulo original |
| GET /api/health | 200 com status ok; não comprova conexão com banco |
| POST /api/cadastro | 201; cria aluno, sem sessão automática |
| POST /login | 200 com success/redirect quando autenticado |
| GET /painel/ e assets | Build protegido por sessão/usuário ativo |
| GET /area e /area.js | Compatibilidade temporária protegida |
| GET /api/me | Somente id, nome, email e perfil |
| /api/biblioteca/* | 23 rotas de catálogo, leitores, circulação, reservas e avisos; [contratos da Sprint 1](docs/sprint1-relatorio.md) e [avisos da Sprint 2](docs/sprint2-25.md) |
| GET /api/csrf; POST /logout | Token por sessão e invalidação segura |
| POST /api/forgot-password e /api/senha-nova | 501; funcionalidade pendente |

401 indica sessão/credencial inválida; 403 pode indicar origem/CSRF/perfil; 429 indica excesso de tentativas; 503 indica indisponibilidade. Não tratar 503 como sucesso.

## Exemplo de demonstração

1. Cadastre “Estudante fictício”, e-mail estudante@example.invalid e uma senha fictícia exclusiva de pelo menos 15 caracteres; não reutilize senha pessoal.
2. Entre com esses dados e confira a área do aluno em /painel/.
3. Consulte Catálogo e Meu perfil; confira /api/me sem copiar cookies para o relatório. Solicite reservas no catálogo; empréstimos/renovações aparecem na área própria quando houver registros reais e políticas configuradas.
4. Use Sair; reabrir /painel/ deve bloquear.
5. Com conta fictícia de equipe previamente preparada por responsável autorizado, cadastre uma obra e seus exemplares em Acervo, gerencie Leitores e use Empréstimos → Empréstimos/Reservas. O cadastro público permanece aluno e não existe atalho de promoção.
6. Demonstre consultas/alterações reais aguardando confirmação da API. Visão geral da equipe mostra avisos internos reais; relatórios ilustrativos, preferências locais e a demo Pages mantêm seus limites identificados. Siga o [roteiro completo](docs/sprint1-relatorio.md) para retirada, devolução, fila e renovação.

## Testes

Com o build gerado, configure o ambiente **exclusivamente para o banco de testes** em uma sessão PowerShell própria. Evite deixar um servidor de desenvolvimento usando as mesmas variáveis.

```powershell
$env:NODE_ENV = 'test'
$env:DB_ENV = 'test'
$env:PGHOST = '127.0.0.1'
$env:PGPORT = '5432'
$env:PGDATABASE = 'alexandria_test'
$env:PGUSER = 'alexandria_test_app'
$env:TEST_DATABASE = 'alexandria_test'
# Defina PGPASSWORD localmente para esse usuário, sem versionar.
npm test
```

As variáveis já definidas no processo prevalecem sobre .env. SESSION_SECRET dos testes é gerado aleatoriamente; não é necessário expor o segredo de desenvolvimento. As suites aplicam migrations apenas no banco de teste, usam dados fictícios e limpam suas fixtures. Nunca apontar testes para banco com dados reais.

Sem TEST_DATABASE=alexandria_test, os testes de integração são ignorados; isso não equivale à aprovação completa. Dependências do frontend e build são pré-requisitos.
Registro histórico da Sprint 1: **185 aprovados, zero falhas/ignorados**; Sprint 2: **193 aprovados**. Incluem autorização horizontal, transações e concorrência. Resultados posteriores da AUDIT-FIX.1 constam no relatório atual. O registro MVP anterior foi de 156 aprovados e instalação limpa aprovada; DEMO.1 elevou a base a 160.

## Acessibilidade e limitações

Há pt-BR, títulos semânticos, link de salto, foco visível, switches nomeados, estado da seção/filtros, menu móvel com Escape/foco/inert, texto em rem e redução de movimentos. Preferências antigas bibliotech-* foram preservadas.
Testes de DOM e cálculos de contraste não comprovam layout real, teclado físico ou leitor de tela. Homologação visual Edge/Narrador e reflow com zoom continuam pendentes: [roteiro manual](docs/acessibilidade-2.0b3.md). Não se declara conformidade WCAG completa.

Sessões têm cookie HttpOnly/SameSite=Lax, prazo absoluto de 30 minutos e CSRF no logout. Secure=false é permitido apenas no HTTP local; publicação real exigirá revisão HTTPS/configuração e nova autorização. Interface pode manter a última renderização até detectar expiração; voltar à aba revalida a identidade e o servidor recusa sessão vencida.

## Contribuir e preparar GitHub

Use branches curtas por tarefa (docs/, fix/, feat/), alterações pequenas e pull request revisado por outro integrante. Não alterar hashes históricos ou migrations para esconder mudanças. Antes de propor merge: build, TypeScript, testes com banco separado e revisão de dados/segredos.

Não versionar .env, node_modules, frontend/dist, caches, bancos/dumps, logs, cookies, tokens ou ZIPs recebidos. Migrations, código e documentação permanecem versionáveis.
A .gitattributes da raiz preserva bytes/CRLF dos arquivos auditados; não converter terminações de linha em massa. A regra LFS ampla importada do frontend foi preservada, mas nenhum arquivo selecionado nesta entrega usa filtro LFS; ela não é motivo para incluir bancos ou ZIPs.

Preparação local e inventário: [relatório da sprint](docs/entrega-mvp.md) e [inventário](docs/inventario-github.md). Inicializar/stagear não publica o projeto. A licença e os créditos públicos do grupo ainda devem ser definidos; não foi inventada licença sobre o código recebido.

Depois da revisão do inventário e da autorização de publicação, os comandos indicativos são:

```powershell
git status --short
git diff --cached --stat
git commit -m "Prepara MVP academico Alexandr.IA"
# Crie no GitHub um repositorio vazio, inicialmente privado, sem README automatico.
git remote add origin URL_DO_REPOSITORIO_APROVADO
git push -u origin main
```

Esses comandos de commit/remoto/push não foram executados nesta sprint. Não inserir tokens na URL do remoto. A revisão local não substitui secret scanning do GitHub.

## Documentação

- [Cadastro](docs/cadastro.md), [autenticação](docs/autenticacao.md) e [banco](docs/banco-de-dados.md).
- [Integração React](docs/integracao-frontend.md) e [acessibilidade](docs/acessibilidade-2.0b3.md).
- [Sprint 1: relatório, endpoints, configuração e homologação](docs/sprint1-relatorio.md).
- [2.1 Acervo](docs/sprint1-21.md), [2.2 Leitores](docs/sprint1-22.md), [2.3 Circulação](docs/sprint1-23.md) e [2.4 Reservas/renovações](docs/sprint1-24.md).
- [Entrega MVP e diff do redirect](docs/entrega-mvp.md) — registro histórico.
- Auditorias antigas em docs/ são registros históricos: seus estados anteriores (Node 20, login indisponível ou redirect /area) não descrevem a versão atual.
