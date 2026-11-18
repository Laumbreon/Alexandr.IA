# AUDIT-GATE.2 — verificação independente de AUDIT-FIX.1

Data: **18/11/2026**, America/Sao_Paulo. Auditoria técnica por inspeção, nova instalação independente, testes e consulta de advisories. Não é homologação visual nem certificação jurídica ou de segurança.

## 1. Conclusões separadas

| Destino | Veredito técnico | Condições e limites |
| --- | --- | --- |
| **A — Código GitHub** | **GO COM RESSALVAS** | Os 11 candidatos estão coerentes, sem bloqueio técnico identificado nesta verificação. Pode-se solicitar autorização específica para commit/push. Responsável deve confirmar os direitos de distribuição e reconhecer a lacuna do relatório anterior. Este parecer não cria licença nem autoriza publicação por si só. |
| **B — GitHub Pages** | **GO COM RESSALVAS** | Artefato estático apto a nova publicação manual acadêmica após autorização e aceite explícito das limitações: homologação humana pendente, direitos/créditos e fontes externas. Apenas `frontend/dist-demo`; não publicar backend ou banco. Não declarar conformidade visual/assistiva ainda não testada. |
| **C — Sistema real, homologação local** | **GO COM RESSALVAS** | Apto tecnicamente para homologação local em ambiente e banco autorizados, com dados fictícios e políticas explicitamente de teste. Configuração local, contas de equipe e conferência humana continuam pendentes. |
| **C — Sistema real, implantação de produção** | **NO-GO** | Não há validação operacional de produção. O código deliberadamente recusa NODE_ENV=production no banco e limita o servidor a loopback. Hospedagem pública do backend exige projeto/autorização próprios, segurança de infraestrutura, dados, backups/restauração e políticas institucionais. Não remover essas proteções só para implantar. |

Não foi identificado novo P0/P1 comprovado nas correções verificadas. Isso não significa inexistência universal de defeitos ou vulnerabilidades. As ressalvas externas não devem ser convertidas em falsas correções técnicas, e o NO-GO de produção não bloqueia por si só guardar código ou demonstrar o frontend estático.

## 2. Estado Git e inventário confirmado

- Diretório: workspace Alexandr.IA no Windows; remoto `https://github.com/Laumbreon/Alexandr.IA.git`.
- Branch **main**, HEAD **bee181c2f733420539b1fa35b08b8dd098a8e921**.
- `git ls-remote origin refs/heads/main` retornou o mesmo hash nesta auditoria. As correções estão locais, ainda não presentes nesse commit remoto.
- Índice vazio antes/depois; nenhum add, commit, push, fetch, merge, reset ou alteração de branch foi executado. Nenhum workflow ou deploy foi acionado.
- Exatamente **oito modificados e três novos** no início, correspondentes ao relatório AUDIT-FIX.1. Não foram encontradas mudanças locais desconhecidas ou fora do escopo.

| Modificados (8) | Novos (3) |
| --- | --- |
| README.md | docs/audit-fix1-frontend.sha256.json |
| frontend/package.json | docs/audit-fix1-resultado.md |
| frontend/pnpm-lock.yaml | frontend/src/services/sessionEvents.ts |
| frontend/src/hooks/useAuth.ts | |
| frontend/src/library/Loans.tsx | |
| frontend/src/library/api.ts | |
| tests/painel.test.js | |
| tests/react-auth.test.js | |

Este relatório é o **único arquivo de entrega acrescentado pelo gate**, fora dos 11 auditados. Assim, ao final há 12 candidatos à eventual revisão, e não uma alteração silenciosa da lista original. Não se preparou o índice.

## 3. Integridade e ausência documental

Antes dos testes foram registrados hashes dos **136 arquivos** rastreados/candidatos existentes. Depois, todos continuaram iguais; o índice também permaneceu byte a byte vazio. **58 arquivos protegidos** de backend, login, banco, documentos históricos Sprint/Figma e package-lock da raiz foram comparados com HEAD, sem diferenças.

As migrations **001–007** e os 13 arquivos de login correspondem à versão remota examinada. Os testes verificaram o manifesto original do login, os 11 arquivos intocados e as duas alterações antigas autorizadas em FIX.1, sem mascarar seu histórico. Os manifestos anteriores não foram regravados.

O novo `audit-fix1-frontend.sha256.json` está encadeado ao hash do manifesto Sprint 2; todos os `before` correspondem aos bytes do HEAD e os `after` ao workspace. São exatamente cinco alterações frontend autorizadas e um módulo adicionado. O teste de integridade mantém as comparações anteriores e confere a lista específica, em vez de liberar qualquer alteração futura.

**Lacuna confirmada:** `docs/auditoria-pre-github-2.1-2.6.md` está ausente do workspace e a consulta `git log --all --full-history -- <arquivo>` não encontrou versão nos históricos locais conhecidos. Ele não aparece nos 11 candidatos. A causa de sua ausência não pôde ser determinada; um arquivo nunca commitado não é recuperável por esse histórico. Isso não demonstra exclusão por AUDIT-FIX.1. Não foram pesquisados backups privados gerais do computador nem afirmada recuperação por OneDrive. Não foi reconstruído/substituído como se fosse documento original.

**Recomendação documental:** responsável procurar a cópia originalmente entregue/backup e, se localizada, preservar sua procedência e bytes. Enquanto isso, aceitar explicitamente a lacuna; esta auditoria fornece evidências novas, não uma assinatura retroativa do documento ausente.

## 4. Dependências e riscos residuais

Confirmado Vite **8.1.6 efetivamente instalado**, também na instalação limpa e no pnpm-lock. package.json usa ^8.1.6; o lockfile congelado resolve 8.1.6. Runtime: Node **24.22.3**, npm **11.19.1**, pnpm **10.34.3**. Vite declara Node ^20.19.0 ou >=22.12.0; a compatibilidade com o Node executado foi demonstrada por TypeScript/builds/testes, não somente pela faixa.

React/DOM 19.2.4, Tailwind 4.2.2, TypeScript 5.9.3 e plugin-react 6.0.1 não foram atualizados. As alterações transitivas do lock correspondem ao grafo do Vite, incluindo Rolldown 1.1.8, tinyglobby 0.2.17 e picomatch 4.0.7. Backend e package-lock raiz estão preservados.

**Consultas independentes atuais:** npm audit retornou saída 0 e zero avisos; pnpm audit retornou saída 0, `advisories` vazio e zero avisos, sem filtros de severidade, exceções ou supressões. Zero avisos conhecidos não é garantia universal, e o resultado pode mudar com a base de advisories.

O [advisory oficial do mantenedor Vite/launch-editor](https://github.com/vitejs/launch-editor/security/advisories/GHSA-587h-7wmj-h5pm) inclui 8.1.6 entre as versões corrigidas e 8.0.5 na faixa afetada. Os outros avisos previamente listados não foram reportados na consulta atual do grafo resolvido. Nenhum servidor vulnerável ou payload de exploração foi usado como prova.

O [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) de picomatch está oficialmente **Withdrawn em 18/11/2026**, sem versão corrigida indicada. Sua retirada é mudança da fonte do advisory, não uma correção demonstrada pelo simples upgrade para 4.0.7. Mantém-se a distinção entre aviso retirado e exposição de globs não confiáveis.

`pnpm why picomatch` confirmou uma versão 4.0.7 pelas cadeias Vite → picomatch; Vite → tinyglobby → picomatch; Vite → tinyglobby → fdir → picomatch. Seu uso observado é em ferramentas de seleção de arquivos/build. Não foi identificado endpoint da aplicação que compile glob do aluno/leitor nem um serviço picomatch no artefato Pages. Configurações/plugins/globs e fontes de builds continuam exigindo confiança e revisão; não se deve executar builds não revisados com segredos. Não se atribui segurança universal a um pacote apenas porque o destino final é estático.

## 5. Verificação A03 — recuperação da política

**Correção confirmada por execução e inspeção:** política e lista têm erro/carregamento e revisões separados. A nova tentativa consulta novamente o recurso que falhou, mantém a mensagem enquanto a resposta está pendente e habilita a operação após política válida. Erro isolado da lista não refaz política válida. Mudança de filtro não dispara recarga indevida da política.

Os dois testes A03 novos foram executados independentemente com sucesso. Como controle de sensibilidade, o harness recebeu **em memória** o Loans.tsx anterior do HEAD, sem alterar fontes do produto: os dois testes falharam como esperado (ausência de segunda consulta da política e desaparecimento prematuro de mensagem). Logo, os asserts detectam esses defeitos, em vez de apenas refletir a nova implementação.

Uma sonda adicional desta auditoria simulou política e lista falhando simultaneamente: retry fez duas consultas necessárias, sucesso da política preservou erro ainda pendente da lista e sucesso da lista concluiu a recuperação. Passou. Não há mudança das regras ou permissões backend.

## 6. Verificação A04 — identidade, 401 e concorrência

**Correção confirmada:** o cliente da biblioteca sinaliza 401 antes da leitura do JSON, tanto em `/api/csrf` quanto na resposta da API de dados/mutação. `useAuth` invalida a geração e impede restauração daquela montagem por resposta antiga; o AuthGate desmonta o shell autenticado e usa o contrato existente de ida ao login. Listener tem cleanup. Não há cookie, token, identidade persistida ou mecanismo de login novo no módulo do evento.

Os sete testes A04 cobrem separadamente GET 401, 401 no CSRF, 403/503 sem logout, StrictMode e corrida com identidade/dados pendentes. O controle com api.ts/useAuth.ts anteriores **substituídos somente em memória** produziu três falhas esperadas nos casos 401/concorrência e quatro sucessos para 403/503. Isso demonstra sensibilidade ao defeito anterior e preservação dos casos que não devem perder a identidade.

Uma sonda independente adicional confirmou POST autenticado com CSRF 200 e resposta POST 401: a identidade foi desmontada e a navegação ao login sinalizada **antes de chegar o JSON de erro**, mantido pendente. Assim o sinal não depende da leitura do corpo nem somente da etapa CSRF.

Os testes de logout legítimo, prevenção de clique duplicado, CSRF e respostas antigas também passaram na suíte completa. Não se demonstrou regressão de autorização, sessão ou negócio. O evento continua sendo coordenação de interface; a fronteira de segurança permanece no Express/PostgreSQL.

## 7. Instalação limpa, testes e recursos temporários

Preparada **nova cópia descartável fora do OneDrive**, com os 136 arquivos de entrada, sem node_modules, builds, .env ou testes copiados de outras pastas temporárias. Instalação por npm ci e pnpm 10.34.3 install --frozen-lockfile --ignore-scripts --offline, usando caches de pacotes. Isso demonstra instalação independente por lockfile, não download em máquina sem cache nem portabilidade para outro sistema operacional. O aviso npm conhecido sobre script de argon2 foi mantido; os testes reais Argon2id/login passaram, sem substituí-lo por simulação.

| Execução nesta auditoria | Aprovados | Falhos | Ignorados | Cancelados |
| --- | ---: | ---: | ---: | ---: |
| **Suíte completa, instalação limpa** | **202** | **0** | **0** | **0** |
| Reexecução isolada dos nove testes A03/A04 atuais | 9 | 0 | 0 | 0 |
| Duas sondas novas do gate | 2 | 0 | 0 | 0 |
| Controle negativo A03 com módulo anterior em memória | 0 | 2 esperados | 0 | 0 |
| Controle negativo A04 com módulos anteriores em memória | 4 | 3 esperados | 0 | 0 |

Os ensaios e controles não foram somados aos 202 para inflar a contagem da suíte. As falhas esperadas são demonstração de sensibilidade, não falhas do workspace atual. A primeira versão da sonda extra tinha seletor corrompido pelo encoding do here-string PowerShell e falhou ao encontrar o botão; foi corrigido somente o seletor da sonda descartável e repetida a execução, com 2/2. Os testes oficiais não foram editados ou enfraquecidos.

A suíte completa foi executada antes de criar os arquivos de ensaio; portanto não houve descoberta de duplicatas. Inclui HTTP/PostgreSQL para aluno, bibliotecário e administrador, cadastro/login/painel/logout, sessões e CSRF, proteção entre leitores, acervo, leitores, empréstimos/devoluções, reservas/renovações, avisos, rollback e concorrência.

**Banco:** cluster novo PostgreSQL **17.10**, porta **55443**, host **127.0.0.1**, banco `alexandria_test`, usuário técnico `gate2_test`, diretório ignorado `tmp/gate2-pg`. NODE_ENV=test, DB_ENV=test e TEST_DATABASE=alexandria_test explícitos. Trust é restrito ao cluster local de QA e não recomendação para operação normal. Nenhum banco de desenvolvimento/produção foi acessado ou migrado.

Aplicadas e verificadas em banco vazio as sete migrations 001–007; a suíte também exerce reexecução, checksums, FKs, unicidade, rollback e corridas operacionais. Consulta final confirmou sete migrations e zero usuários, sessões, livros, empréstimos e reservas após limpeza das fixtures. **Cluster encerrado: server stopped**. Processos de teste/build terminaram; não ficou servidor de prévia ativo. Cópias e logs permanecem como evidência local ignorada, sem serem incluídos no Git.

Logs em `tmp/`: `gate2-clean-npm.txt`, `gate2-clean-pnpm.txt`, `gate2-suite.txt`, `gate2-npm-audit.json`, `gate2-pnpm-audit.json`, `gate2-sensitivity-current.txt`, `gate2-sensitivity-a03-old.txt`, `gate2-sensitivity-a04-old.txt`, `gate2-independent-final.txt`; hashes de entrada em `gate2-baseline.json`. Nenhum desses arquivos deve ser publicado como fonte do produto.

## 8. TypeScript, builds e demo

TypeScript **aprovado** na instalação limpa. Build real Vite 8.1.6 **aprovado**, base `/painel/`, 32 módulos; build demo **aprovado**, base `/Alexandr.IA/`, 20 módulos. Verificador estático **aprovado**, cinco arquivos permitidos, assets existentes na base correta, sem symlinks ou sourcemaps publicados.

Verificação adicional do JavaScript demo: sem `/api/`, logout, evento de sessão, SESSION_SECRET/PGPASSWORD; e-mails encontrados exclusivamente `@example.invalid`. O bundle real contém `/api/me` e o sinal de sessão e não contém o marcador exclusivo do cenário demo. Logo a correção do sistema real não foi carregada pela demonstração e nenhum módulo PostgreSQL é necessário ao Pages.

Os testes confirmam aviso de demonstração, seis seções, simulações em memória e ausência de API/autenticação falsa. Operações fictícias não são prometidas como persistidas. O sistema real continua independente e não foi substituído por fixtures. A revisão por padrões não é detector universal de dados pessoais ou segredos; nenhum dado real/credencial foi identificado no escopo examinado.

Testes de DOM verificam estados assíncronos, foco simulado e desmontagem, mas não comprovam layout físico, percepção de contraste ou uso com tecnologia assistiva. Não se executou navegador gráfico, telefone ou Narrador nesta auditoria. Não foi alegada indisponibilidade de ferramenta como se tivesse sido comprovada: simplesmente não foram executados esses testes humanos.

## 9. Revisão dos candidatos e pendências externas

Os 11 candidatos não incluem .env, bancos/dumps, ZIPs, node_modules, logs, caches, temporários ou builds gerados. .gitignore e workflow estão iguais ao HEAD. Busca de padrões de chave privada, tokens GitHub/AWS e revisão das fixtures não encontrou segredos ou dados de estudantes acrescentados. Credenciais de QA/testes não são contas reais e não foram colocadas no frontend de produção. Não há garantia forense de ausência de qualquer dado possível em todo o histórico remoto.

**A05 — direitos/licença:** permanece decisão dos integrantes. Não há evidência documental completa de licença/créditos/autorização de redistribuição de todo material importado. Não se comprovou infração específica e não foi criada licença em nome de terceiros. É pendência de governança que exige declaração do responsável antes de distribuição pública; não um bug a ser “corrigido” no código pelo auditor.

**A06 — homologação humana:** pendente. Roteiro mínimo abaixo. Não declarar prontidão visual, WCAG completa ou testes físicos com base nos 202 automatizados.

**A08 — pipeline:** único workflow `pages-demo.yml`, somente workflow_dispatch; permissões globais vazias, build com contents/pages read, deploy com pages write/id-token write, checkout sem persistir credenciais. Upload é exclusivo de frontend/dist-demo. Não há novo acionamento automático por push. Tags de actions sem SHA imutável e ausência de job PostgreSQL nesse workflow são melhorias de endurecimento recomendadas, não prova de publicação indevida ou defeito do artefato estático. Configuração administrativa do Pages e site ao vivo não foram inspecionados nesta auditoria.

**A08 — fontes:** `frontend/src/index.css:1` consulta Google Fonts. Requisição externa de fontes permanece, com implicações de disponibilidade/privacidade e licenças se forem hospedadas localmente. Não é envio de e-mail/WhatsApp/SMS nem indica por si só coleta de dados da biblioteca. Escolher fontes locais ou aceitar a dependência é decisão explícita, não bloqueio técnico automático ao código.

## 10. Checklist manual curto e próximas ações

- [ ] Confirmar banco de homologação local e contas fictícias autorizadas; nenhuma migration em destino desconhecido. Preparar políticas fictícias sem apresentá-las como regras da Fatec.
- [ ] Edge: aluno, bibliotecário e administrador — login → painel correto → operações permitidas → logout → retorno bloqueado. Confirmar ausência de dados de outro leitor.
- [ ] Conferir acervo, leitores, retirada/devolução, fila, renovação e atualização dos avisos; simular erro de política e nova tentativa; testar sessão expirada.
- [ ] Celular: menu, formulários, teclado virtual, rolagem, orientação e ausência de cortes; incluir 320/390 px e tablet 768 px, além de desktop.
- [ ] Zoom 200%, texto ampliado, claro/escuro/alto contraste; registrar contraste ou defeitos visuais observados, sem supor aprovação.
- [ ] Teclado Tab/Shift+Tab/Enter/Escape e Narrador: foco, rótulos, headings, mensagens de erro/carregamento/sucesso e leitura das listas.
- [ ] Demo: aviso acadêmico em seis seções, reinício do cenário, sem senha/API; distinguir essas simulações das operações persistentes.
- [ ] Confirmar direitos/créditos/licença, reconhecer relatório histórico ausente e decidir aceite das fontes/pipeline antes de pedir publicação. Não registrar cookies, senhas ou tokens nas evidências.

Próxima ação: responsável revisar estes vereditos e fornecer autorização específica para commit/push ou para publicação manual da demo, se desejar, com aceite das ressalvas aplicáveis. Homologação local do backend é etapa separada; implantação real permanece NO-GO até trabalho próprio autorizado.

**Encerramento:** nenhum código, dependência, migration, configuração ou documento histórico foi alterado pelo gate. Os 136 arquivos de entrada e o índice permaneceram intactos. Somente este relatório foi criado como entrega. Nenhum commit, push, GitHub Actions ou deploy foi executado.
