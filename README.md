# Alexandr.IA

## Demonstração estática para GitHub Pages — DEMO.1

Modo independente, com seis seções e aviso "Demonstração acadêmica — dados simulados". Sem senha, autenticação ou chamadas a /api/me. Build específico em frontend/dist-demo, base /Alexandr.IA/; o sistema real continua em /painel/. [Instruções, workflow manual e limitações](docs/pages-demo.md).

Validação DEMO.1: TypeScript, ambos os builds e 160 testes aprovados, zero falhas/ignorados. Publicação não executada. Para npm test, gerar ambos os builds. Os resultados MVP abaixo são o registro da sprint anterior.

MVP acadêmico da Fatec Botucatu para estudar o desenvolvimento de um sistema bibliotecário: interface web, API, banco relacional, autenticação, sessões, testes e acessibilidade.

**Entrega acadêmica de referência: 15/11/2026. Validação executada em 14/11/2026.** Uso local com dados fictícios. Cadastro, login e logout funcionam; operações bibliotecárias ainda são demonstrações. Não há deploy ou publicação remota nesta entrega.

## Equipe e objetivos acadêmicos

Projeto do grupo da Fatec Botucatu. A documentação disponível não identifica nominalmente os participantes; nomes não foram inventados nem extraídos do computador. A equipe poderá acrescentar créditos públicos aprovados posteriormente, sem RA, contatos ou outros dados pessoais.

Objetivos: compreender separação frontend/backend, modelagem PostgreSQL e migrations, validação no servidor, Argon2id, cookies e CSRF, desenvolvimento colaborativo e avaliação de acessibilidade.

## O que funciona e o que é demonstração

| Situação | Recursos |
| --- | --- |
| Implementado | Cadastro real como aluno; senhas de 15–128 pontos de código Unicode, incluindo espaços; login Argon2id; sessões PostgreSQL; identidade por /api/me; logout protegido por CSRF; bloqueio de conta inativa e sessão expirada |
| Implementado | Entrega React autenticada em /painel/; área simples de aluno; perfil correto de bibliotecário/administrador; navegação por seção; filtros locais; preferências visuais |
| Demonstrativo | Empréstimos, contatos de leitores fictícios, categorias/acervo, números e relatórios, contador de prazo, avisos e operações de privacidade |
| Local no navegador | Tema, contraste, texto ampliado, redução de movimentos e contato de demonstração; não representam permissões ou alterações no banco |
| Futuro | Catálogo real, exemplares, empréstimos/reservas, relatórios reais, recuperação de senha e notificações |

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
| TypeScript / Vite / Tailwind CSS | 5.9.3 / 8.0.5 / 4.2.2 |
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
database/migrations/        001 usuários, 002 alunos, 003 sessões
frontend/
  src/App.tsx               seis vistas demonstrativas
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

## 5. Migrations e execução

Com .env preenchido para alexandria_dev:

```powershell
npm run db:check
npm run db:migrate
npm start
```

As migrations são explícitas, transacionais e registradas por checksum. Não editar migrations aplicadas; novas mudanças futuras exigem novo arquivo numerado. O servidor não aplica migrations automaticamente.

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
| GET /api/csrf; POST /logout | Token por sessão e invalidação segura |
| POST /api/forgot-password e /api/senha-nova | 501; funcionalidade pendente |

401 indica sessão/credencial inválida; 403 pode indicar origem/CSRF/perfil; 429 indica excesso de tentativas; 503 indica indisponibilidade. Não tratar 503 como sucesso.

## Exemplo de demonstração

1. Cadastre “Estudante fictício”, e-mail estudante@example.invalid e uma senha fictícia exclusiva de pelo menos 15 caracteres; não reutilize senha pessoal.
2. Entre com esses dados e confira a área do aluno em /painel/.
3. Confira /api/me, sem copiar cookies para o relatório.
4. Use Sair; reabrir /painel/ deve bloquear.
5. Apresente as seis seções internas somente com conta fictícia de perfil previamente preparada por responsável autorizado em banco de demonstração. O cadastro público permanece aluno e não existe atalho de promoção.
6. Demonstre filtros/preferências e avisos com a ressalva de que não persistem operações de biblioteca.

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
Resultado desta sprint: **156 aprovados, zero falhas/ignorados**, incluindo três ciclos cadastro → login → painel → logout por perfil. Base anterior: 153. TypeScript e build passaram. Instalação limpa também passou.

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
- [Entrega MVP e diff do redirect](docs/entrega-mvp.md).
- Auditorias antigas em docs/ são registros históricos: seus estados anteriores (Node 20, login indisponível ou redirect /area) não descrevem a versão atual.
