# Inventario GitHub ? MVP academico

Estado: selecao local para primeiro commit; nenhum remoto/push.

92 arquivos selecionados. Lista inclui este inventario.

## Distribuicao

| Pasta | Arquivos |
| --- | --- |
| (raiz) | 6 |
| backend | 13 |
| database | 3 |
| docs | 16 |
| frontend | 29 |
| login | 13 |
| scripts | 2 |
| tests | 10 |

## Exclusoes verificadas

.env, node_modules, frontend/dist, .npm-cache, tmp, ZIPs recebidos, logs, dumps, bancos locais, cookies/tokens e chaves privadas nao fazem parte da selecao.

O modelo .env.example possui segredos vazios. Nenhum segredo foi identificado na revisao dos arquivos selecionados. Revisao humana final continua recomendada antes do push.

## Arquivos selecionados

```text
.env.example
.gitattributes
.gitignore
README.md
backend/app.js
backend/controllers/cadastro.controller.js
backend/controllers/login.controller.js
backend/db/pool.js
backend/middleware/sessoes.js
backend/repositories/usuarios.repository.js
backend/server.js
backend/services/cadastro.service.js
backend/services/login.service.js
backend/validators/cadastro.validator.js
backend/validators/login.validator.js
backend/views/area.html
backend/views/area.js
database/migrations/001_create_usuarios.sql
database/migrations/002_create_alunos.sql
database/migrations/003_create_sessoes.sql
docs/acessibilidade-2.0b3.md
docs/alteracoes-autorizadas-fix1.md
docs/autenticacao.md
docs/banco-de-dados.md
docs/cadastro.md
docs/entrega-mvp.md
docs/figma-alteracoes-2.0b1.sha256.json
docs/figma-alteracoes-2.0b2.sha256.json
docs/figma-alteracoes-2.0b3.sha256.json
docs/figma-auditoria.md
docs/figma-importacao.sha256.json
docs/fix1-alteracoes.patch
docs/homologacao-local.md
docs/integracao-frontend.md
docs/inventario-github.md
docs/mvp-redirect.patch
frontend/.figma/make/analyze-routes
frontend/.figma/make/deploy
frontend/.figma/make/deploy-preview
frontend/.figma/make/dev
frontend/.figma/make/dev.json
frontend/.figma/make/format
frontend/.figma/make/install
frontend/.figma/make/langserver
frontend/.figma/make/site.json
frontend/.gitattributes
frontend/.gitignore
frontend/.mise.toml
frontend/AGENTS.md
frontend/CLAUDE.md
frontend/index.html
frontend/package.json
frontend/pnpm-lock.yaml
frontend/public/favicon.svg
frontend/src/App.tsx
frontend/src/components/AuthGate.tsx
frontend/src/components/LogoutButton.tsx
frontend/src/hooks/useAuth.ts
frontend/src/hooks/useNavigation.ts
frontend/src/index.css
frontend/src/main.tsx
frontend/src/services/auth.ts
frontend/src/vite-env.d.ts
frontend/tsconfig.json
frontend/vite.config.ts
login/cadastro.css
login/cadastro.html
login/cadastro.js
login/esqueci-senha.html
login/fatec.css
login/login.css
login/login.html
login/login.js
login/recuperar.css
login/recuperar.js
login/senha-nova.css
login/senha-nova.html
login/senha-nova.js
package-lock.json
package.json
scripts/db-check.js
scripts/migrate.js
tests/autenticacao.test.js
tests/cadastro-frontend.test.js
tests/cadastro.test.js
tests/database.test.js
tests/frontend-accessibility.test.js
tests/login-authorized-fix1.sha256.json
tests/login-original.sha256.json
tests/painel.test.js
tests/react-auth.test.js
tests/server.test.js
```

## Figma e LFS

Arquivos importados .figma/make, AGENTS.md e CLAUDE.md sao preservados para procedencia/hashes; scripts de deploy nao foram executados. Nenhum arquivo selecionado usa filtro LFS. Regras amplas de frontend/.gitattributes nao autorizam publicar bancos ou ZIPs. A regra raiz * -text preserva os hashes em clones Windows/Linux.

## Antes do primeiro commit

Conferir git diff --cached --stat, git diff --cached e identidade Git. O commit nao foi executado nesta preparacao. Depois, criar repositorio remoto inicialmente privado somente com autorizacao, configurar origin sem tokens na URL e executar o push descrito no README.
