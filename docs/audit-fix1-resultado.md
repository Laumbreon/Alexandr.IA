# AUDIT-FIX.1 — resultado local

Data: **18/11/2026**, America/Sao_Paulo. Escopo: correções locais autorizadas, sem commit, push, merge, workflow, deploy ou alteração de banco operacional.

## Resultado e recomendação

**GO COM RESSALVAS para submeter a uma nova auditoria de verificação. Não é autorização para publicar nem homologação de produção.**

FIX-A01, A03 e A04 implementados; FIX-A07 atualizado no README atual sem reescrever documentos históricos. O advisory de picomatch foi retirado pela base oficial em 18/11; sua exposição foi mapeada, sem inventar versão corrigida. Instalação limpa, TypeScript, builds real/demo e verificador estático aprovados. **202 testes aprovados, 0 falhos, 0 ignorados, 0 cancelados**, incluindo nove regressões novas. Consultas finais npm audit e pnpm audit retornaram zero avisos, sem filtros ou exceções.

Continuam pendentes: direitos de distribuição/licença/créditos, homologação humana desktop/mobile, teclado e Narrador, decisão sobre fontes externas e endurecimento adicional do workflow. Zero avisos conhecidos no gerenciador não é declaração de segurança absoluta.

## Estado inicial e evidências preservadas

Branch `main`, HEAD e remoto consultado por `git ls-remote origin refs/heads/main`: `bee181c2f733420539b1fa35b08b8dd098a8e921`. Status inicial vazio; não havia alterações locais desconhecidas a sobrescrever. O remoto foi conferido novamente nesta execução, sem presumir a revisão anterior. Nenhum projeto fora do Alexandr.IA foi acessado ou alterado.

**Documento ausente:** `docs/auditoria-pre-github-2.1-2.6.md` não estava no workspace ao iniciar/retomar esta fase e não foi localizado nas cópias pesquisadas. Não foi possível relê-lo do disco. Não foi recriado como se fosse um original histórico: esta correção usa os achados explicitamente transcritos na autorização, o histórico desta conversa e os logs locais da auditoria. A próxima revisão deve conferir essa lacuna documental.

Antes das correções, TypeScript, ambos os builds e o verificador passaram. O checkpoint da suíte original, selecionando somente `tests/*.test.js`, confirmou **193 aprovados, zero falhas/ignorados/cancelados**. Uma tentativa anterior falhou por EBUSY em um arquivo do jsdom, sem asserção funcional falha; repetição sem mudanças passou. O Windows/OneDrive voltou a bloquear um arquivo numa primeira execução direcionada, motivo para realizar a validação final em cópia nova fora do OneDrive.

A execução antes da pausa havia encontrado 388 testes porque a descoberta automática do Node percorreu cópias de testes em `tmp/`. Esse número foi descartado como checkpoint do produto, sem apagar evidência ou contar duplicatas como cobertura nova. Nesta fase todos os resultados completos usam a lista explícita dos testes do projeto ou a cópia independente sem testes duplicados.

## FIX-A01 — atualização controlada do Vite

Foi consultado o advisory oficial do mantenedor [GHSA-587h-7wmj-h5pm](https://github.com/vitejs/launch-editor/security/advisories/GHSA-587h-7wmj-h5pm), que inclui 8.0.5 na faixa afetada e 8.1.6 entre as versões corrigidas. Os metadados de `vite@8.1.6` aceitam Node ^20.19.0 ou >=22.12.0; Node executado: 24.22.3. A candidatura foi instalada e validada primeiro na cópia descartável: TypeScript e ambos os builds passaram antes de copiar package.json/lockfile ao projeto principal.

Os sete advisories Vite efetivamente presentes no checkpoint atual eram:

| Advisory | Severidade reportada antes |
| --- | --- |
| GHSA-v6wh-96g9-6wx3 — UNC/NTLM no Windows | moderate |
| GHSA-698v-4r3x-3vcv — escape de argumentos Windows | moderate |
| GHSA-r825-w8mm-5pxw — interpretação de flags do editor | moderate |
| GHSA-587h-7wmj-h5pm — bypass de existência de arquivo Windows | high |
| GHSA-9jrq-w75r-8gcw — middleware/origem | low |
| GHSA-rq7h-c2jc-7f22 — caminhos fora de fs.allow | moderate |
| GHSA-fx2h-pf6j-xcff — caminhos alternativos Windows/fs.deny | moderate |

Após a atualização para 8.1.6, nenhum desses avisos foi reportado pelo gerenciador. Não foram iniciados servidores Vite vulneráveis, aplicados payloads ou executados testes de exploração.

| Dependência | Antes → depois |
| --- | --- |
| Vite instalado | 8.0.5 → **8.1.6** |
| Faixa no package.json | ^8.0.5 → ^8.1.6; lock resolve 8.1.6 |
| Rolldown | 1.0.0-rc.12 → 1.1.8 |
| tinyglobby | 0.2.15 → 0.2.17 |
| picomatch | 4.0.4 → 4.0.7 |
| React/DOM | 19.2.4 → 19.2.4 |
| Tailwind/@tailwindcss/vite | 4.2.2 → 4.2.2 |
| TypeScript | 5.9.3 → 5.9.3 |
| @vitejs/plugin-react | 6.0.1 → 6.0.1 |
| Dependências backend | sem alteração |

A única dependência direta atualizada foi Vite. Seu grafo obrigatório/compatível trouxe atualizações de bundler/bindings, tinyglobby, picomatch e auxiliares WASM/oxc. Mudanças de snapshots peer no lock não são atualização de React/Tailwind. Não foram usados overrides, `audit --fix`, alteração global de Node/pnpm, desativação do auditor ou atualização indiscriminada do restante da stack.

## FIX-A02 — investigação de picomatch

O checkpoint da auditoria de 17/11 registrava oito avisos, dois high. No checkpoint atual de 18/11, **antes de alterar dependências**, pnpm audit já retornava sete avisos (1 high, 5 moderate, 1 low): o advisory [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) foi marcado **Withdrawn em 18/11/2026**. A redução de oito para sete não foi causada por uma correção aplicada ao projeto.

O [mantenedor no PR #235](https://github.com/micromatch/picomatch/pull/235) contesta tratar padrões regex/glob escolhidos por usuários como vulnerabilidade do matcher e recomenda não permitir padrões não confiáveis. O advisory retirado não indica versão corrigida. **Não se afirma que 4.0.7 seja uma correção desse advisory**: ela foi selecionada transitivamente pela atualização do Vite, sem override próprio.

`pnpm why picomatch` confirmou as cadeias atuais:

```text
vite 8.1.6 → picomatch 4.0.7
vite 8.1.6 → tinyglobby 0.2.17 → picomatch 4.0.7
vite 8.1.6 → tinyglobby 0.2.17 → fdir 6.5.0 → picomatch 4.0.7
```

Tailwind/Vite e plugin-react têm ligação peer ao Vite. Picomatch é usado para seleção/matching de arquivos nas ferramentas de desenvolvimento/build. No código do produto não há import de picomatch nem endpoint Express que compile glob enviado por aluno/leitor; filtros da biblioteca usam parâmetros SQL/ILIKE escapados. No build estático não existe serviço Node recebendo esses padrões. Não foi identificado caminho de entrada do usuário final até o matcher, mas isso não torna a dependência universalmente segura.

**Risco residual e mitigação proposta:** colaboradores/plugins/configurações de build e globs continuam precisando ser confiáveis. Não aceitar configuração/glob de usuário público ou executar builds de fontes não revisadas com credenciais. Se futuramente houver endpoint de busca com glob, tratar como nova superfície, impor política de entradas e isolamento/limites antes de habilitar. Monitorar decisões do mantenedor e revisões do advisory; não gerar um patch fictício só para produzir audit verde.

## FIX-A03 — recuperação da política

`Loans.tsx` agora mantém erro/carregamento/revisão da política separados da lista. “Tentar novamente” recarrega somente o recurso que falhou, incluindo a política quando necessário. Mensagem anterior permanece durante a requisição e é retirada somente após sucesso. O botão fica indisponível durante a tentativa para evitar requisições duplicadas. Alterar filtros ou concluir operações não consulta desnecessariamente a política já válida.

Duas regressões exercitam política 503 → resposta pendente → sucesso, habilitação de Novo empréstimo, permanência da mensagem enquanto pendente, ausência de recarga da lista quando só a política falhou e ausência de recarga da política quando só a lista falhou. A primeira versão do teste tentava pesquisar o mesmo termo vazio e esperava uma nova consulta indevida; foi corrigida para mudar de fato o filtro e preservar a asserção de que a política não repete. Nenhuma regra/permissão backend foi alterada.

## FIX-A04 — perda de autenticação

Novo módulo pequeno `services/sessionEvents.ts` publica um evento interno sem dados pessoais, token ou cookie. O cliente central da biblioteca sinaliza 401 imediatamente tanto na resposta de `/api/csrf` quanto na resposta da operação autenticada. `useAuth` assina o evento, invalida a geração pendente e encerra a identidade da montagem atual. Respostas antigas e novas tentativas de revalidação dessa montagem não restauram o painel após invalidação; o contrato existente encaminha ao login. Um novo login recarrega a aplicação e cria outra montagem.

As áreas autenticadas são desmontadas; seus estados deixam de ser exibidos. Não foi criado armazenamento de identidade, novo login ou mecanismo paralelo de autenticação. Listener é removido no cleanup, preservando StrictMode. 403 e 503 não disparam o sinal. Logout mantém token CSRF, prevenção de clique duplicado e o contrato anterior.

Sete regressões adicionais cobrem GET/POST com 401/403/503 (incluindo 401 na busca do CSRF, sem prosseguir ao POST), StrictMode e concorrência com identidade antiga/dados pendentes. Os testes de logout e HTTP/PostgreSQL anteriores passaram junto da suíte completa. O sinal é de interface, não substitui a autorização do backend. A proteção do servidor permanece idêntica.

## Testes, instalação e builds

| Execução | Resultado real |
| --- | --- |
| Checkpoint inicial, suíte original | 193 aprovados / 0 falhas / 0 ignorados / 0 cancelados |
| Testes direcionados de correção/sessão/logout | 19 aprovados / 0 falhas / 1 ignorado por banco não configurado naquela execução direcionada |
| Instalação limpa npm ci + pnpm congelado | aprovada em cópia independente fora do OneDrive |
| Suíte completa após instalação limpa | **202 aprovados / 0 falhas / 0 ignorados / 0 cancelados** |
| TypeScript e builds real/demo | aprovados na cópia limpa e no projeto local |
| Verificador demo | aprovado, cinco arquivos estáticos |
| pnpm audit antes/depois desta correção | 7 → **0** avisos |
| npm audit backend | **0** avisos |
| Navegador gráfico, celular, teclado físico e Narrador | não executados |

A instalação independente copiou fontes versionadas e os novos arquivos necessários, sem node_modules, .env ou builds anteriores. Executou npm ci com package-lock original e pnpm 10.34.3 install --frozen-lockfile --ignore-scripts --offline usando o store local; validou os lockfiles e pacotes, não download em máquina sem cache. npm emitiu o aviso já conhecido sobre script de instalação do argon2; não foi contornado com autenticação falsa, e hash/login PostgreSQL passaram. Candidata Vite inicialmente não existia no cache offline: foi baixada de forma explícita para a cópia de avaliação.

Build real: base `/painel/`, 32 módulos; demo: `/Alexandr.IA/`, 20 módulos. CSS compartilhado, design e seis seções preservados. Verificação adicional do JavaScript da demo não encontrou `/api/`, logout, evento de sessão ou padrões de segredos conhecidos. A demo não importa o novo mecanismo de sessão e não depende do PostgreSQL. Publicação manual do workflow permanece inalterada.

PostgreSQL: cluster descartável próprio, 17.10, loopback 127.0.0.1:55441, banco `alexandria_test`, usuário técnico `audit_test`. Variáveis NODE_ENV=test, DB_ENV=test e TEST_DATABASE=alexandria_test foram explícitas na suíte. O cluster não é o PostgreSQL habitual do Windows. A suíte exerceu as sete migrations, autenticação, autorização horizontal, transações, concorrência, retirada/devolução, fila, renovação e avisos. Consulta final confirmou sete migrations e zero usuários, sessões, livros, empréstimos e reservas. Cluster encerrado com **server stopped**. Nenhum banco de desenvolvimento/produção foi acessado, migrado ou limpo.

Logs ignorados em `tmp/`: `fix1-baseline-exact.txt` (EBUSY), `fix1-baseline-exact-retry.txt` (193), `fix1-targeted-final.txt`, `fix1-clean-npm.txt`, `fix1-clean-pnpm.txt`, `fix1-clean-suite.txt` (202), `fix1-audit-before.json`, `fix1-audit-after.json`, `fix1-npm-audit.json`. Cópia limpa fica em diretório temporário separado; não é uma segunda aplicação para publicação.

Para repetir apenas os testes do produto em um banco isolado autorizado, sem descobrir cópias em tmp:

```powershell
$suiteFiles = @(Get-ChildItem tests -Filter '*.test.js' -File | ForEach-Object { $_.FullName })
node --test --test-reporter=spec @suiteFiles
```

É necessário gerar ambos os builds e configurar as variáveis de banco de testes antes; não utilizar esse comando com banco real. Uma instalação limpa sem cópias de testes aninhadas também pode usar `npm test` normalmente. Não se alterou o script histórico para ocultar testes.

## Preservação, inventário e candidatos ao próximo commit

O snapshot inicial verificou que **58 arquivos protegidos** (backend, login, banco, documentação histórica Sprint/Figma e package-lock raiz) continuam byte a byte iguais. Mantidos os sete SQL e os 23 endpoints. Nenhuma mudança no workflow, .gitignore, contrato de autenticação ou dependências backend.

Criado `docs/audit-fix1-frontend.sha256.json`, encadeado ao SHA-256 do registro Sprint 2. Ele autoriza exatamente cinco arquivos frontend alterados e um novo módulo. Os testes conferem os hashes anteriores e posteriores e a lista permitida, mantendo todas as verificações históricas. Manifestos antigos não foram regravados. A documentação ausente da auditoria anterior não foi incluída como se estivesse preservada.

**Modificados (oito):**

- `README.md`: estado atual, contagem de rotas/testes, versões e recursos reais versus exemplos.
- `frontend/package.json` e `frontend/pnpm-lock.yaml`: Vite e grafo transitivo compatível.
- `frontend/src/hooks/useAuth.ts`: listener e invalidação terminal da montagem.
- `frontend/src/library/api.ts`: sinal de 401 centralizado.
- `frontend/src/library/Loans.tsx`: recuperação independente da política/lista.
- `tests/painel.test.js`: encadeamento do registro autorizado, sem dispensar integridade.
- `tests/react-auth.test.js`: nove regressões novas.

**Novos (três):**

- `frontend/src/services/sessionEvents.ts`.
- `docs/audit-fix1-frontend.sha256.json`.
- `docs/audit-fix1-resultado.md` (este relatório).

Esses **11 arquivos** são apenas candidatos à revisão; nada foi adicionado ao índice. Builds, logs, node_modules, caches, arquivos temporários e cluster estão fora da seleção. Revisão de padrões de chave privada, tokens GitHub/AWS e caminhos sensíveis não encontrou ocorrências nos candidatos. Não foram acrescentados dados de estudante real; fixtures continuam fictícias. Busca de padrões não é garantia universal de ausência de segredo.

## Pendências para aceite e nova auditoria

- **A05:** responsável confirmar autoria/permissões do código e materiais importados; definir créditos públicos e licença com o grupo. Nenhuma licença jurídica foi inventada.
- **A06:** executar os roteiros manuais por aluno/bibliotecário/administrador, desktop/mobile, zoom/contraste/teclado/Narrador. As regressões DOM não provam homologação física ou WCAG completa.
- **A08:** decidir se fontes Google devem ser hospedadas localmente e revisar suas licenças; o tráfego externo de fontes permanece. Avaliar pinagem imutável de Actions e gate de testes PostgreSQL no workflow, sem mudar ou disparar publicação nesta fase.
- **A02 residual:** manter entradas glob confiáveis nas ferramentas e acompanhar decisões oficiais; retirada de advisory não é eliminação de todo cenário de custo computacional.
- **Documentação:** localizar/recuperar a cópia original do relatório da auditoria anterior. Metadados importados em `.figma/make/site.json` ainda são genéricos; não foram regravados como documento histórico nesta correção.
- **Operação:** ambiente de desenvolvimento e contas fictícias de equipe ainda dependem de preparação autorizada para a homologação; nenhuma configuração real foi criada aqui.

A nova auditoria deve verificar os diffs, hashes, advisories vigentes, instalação limpa e regressões, e decidir o aceite dessas limitações. **Esta entrega termina localmente e aguarda autorização para nova auditoria. Não autoriza commit, push, publicação do Pages ou deploy.**
