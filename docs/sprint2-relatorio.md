# Sprint 2 — fases 2.5–2.6 e auditoria final

Entrega local em 16/11/2026. Não foram executados commit, push, workflow ou deploy. A Sprint 1 já estava presente sem commit; este relatório distingue suas alterações das alterações desta sprint. O relatório e os manifestos da Sprint 1 foram preservados.

## Resultado e checkpoints

| Verificação executada | Resultado real |
| --- | --- |
| Base anterior em banco temporário | 185 aprovados, zero falhas/ignorados |
| Checkpoint 2.5, antes de iniciar 2.6 | 192 aprovados, zero falhas/ignorados |
| Checkpoint 2.6 e regressão final | 193 aprovados, zero falhas/cancelados/ignorados |
| TypeScript `tsc --noEmit` | Aprovado |
| Build Vite do sistema real | Aprovado, base `/painel/` |
| Build Vite da demo e verificador estático | Aprovado, base `/Alexandr.IA/` |
| Navegador físico, teclado real, Narrator | Não executados; homologação manual pendente |

Runtime executado: Node 24.22.3, npm 11.19.1, PostgreSQL 17.10, pnpm 10.34.3. Dependências e lockfiles não foram atualizados. React 19.2.4, TypeScript 5.9.3, Vite 8.0.5; versões completas na tabela do README. Não se declara compatibilidade com outros runtimes nem reinstalação limpa nesta sprint.

Logs locais ignorados: `tmp/sprint2-base.txt`, `tmp/sprint2-25-final.txt`, `tmp/sprint2-final.txt`. Houve duas falhas intermediárias de testes: mock antigo de catálogo reutilizava a mesma Response na nova consulta de avisos; o novo teste demo procurava texto exato de botão de menu com contador. Foram corrigidos o mock por rota e o seletor do teste, mantendo as asserções. As suítes completas foram reexecutadas com sucesso, sem dispensar testes.

## 2.5 — avisos reais

Novo endpoint protegido `GET /api/biblioteca/avisos`, com paginação, tipo e filtro de leitor. Aluno vê apenas seus dados; tentar outro leitor retorna 403. Equipe autorizada acompanha a biblioteca. Sem exposição de RA, e-mail, credenciais ou tokens. [Contrato e avaliação dos canais externos](sprint2-25.md).

Avisos são calculados dos empréstimos ativos e reservas aguardando, com IDs estáveis por recurso, sem tabela duplicada ou tarefas agendadas. Devolução, renovação, cancelamento e atendimento aparecem na próxima consulta. Interface oferece atualização manual; mudar de seção e retornar também consulta novamente. Não há atualização automática contínua.

Atrasos usam o relógio e os prazos do banco. A antecedência opcional `LIBRARY_NOTICE_DAYS` aceita inteiro técnico de 0–365, sem valor padrão. Ausente/inválida, a interface informa a pendência e mantém atrasos/reservas, sem presumir proximidade. Três dias nos testes são exclusivamente fictícios. Nenhuma migration 008 foi necessária; 001–007 intactas.

E-mail, WhatsApp e SMS não foram implementados ou ativados. A avaliação recomenda separar projeção de avisos de entrega futura com outbox/fila, idempotência e adaptadores, somente após autorização de política, provedor e tratamento de dados. Não há credenciais, dependências ou envio real desses canais.

## 2.6 — demonstração isolada

As seis seções do layout continuam disponíveis. Acervo, leitores, circulação e avisos agora usam cenário próprio fictício: dois livros/exemplares, dois leitores, empréstimo atrasado, outro próximo, reserva em fila. Data de referência explicitamente fictícia: 16/11/2026. Renovação usa prazo ilustrativo, sem regra oficial.

Simular devolução altera disponibilidade e avisos; simular renovação altera prazo e remove aviso próximo; cancelar/criar reserva atualiza acompanhamento. A reserva não é automaticamente atendida na devolução. Reiniciar cenário ou recarregar restaura os dados. Operações são somente React em memória, sem fetch, autenticação, cookies ou persistência. Preferências visuais preexistentes continuam em namespace local próprio. Relatórios/configurações permanecem ilustrativos e não alegam execução real.

Preservado aviso permanente “Demonstração acadêmica — dados simulados”, inclusive nas seções substituídas. O build estático agora é verificado contra qualquer referência `/api/`, além de login/logout e segredos conhecidos. Sistema autenticado não importa o cenário demo. O teste novo percorre operações e verifica zero rede/cookies e atualização entre seções; os testes anteriores percorrem as seis seções, menu móvel, preferências e foco.

## Inventário desta sprint

Criados:

- `backend/library/notices.js`: política e consulta SQL dos avisos.
- `frontend/src/library/Notices.tsx`: lista real, filtros, datas, erro/carregamento e atualização.
- `frontend/src/demo/DemoLibrary.tsx`: cenário fictício e vistas independentes em memória.
- `docs/sprint2-25.md`, este relatório, `sprint2-frontend.sha256.json` e `sprint2-integridade.sha256.json`: evidências e preservação.

Modificados:

- `.env.example`: configuração opcional comentada, sem credenciais.
- `backend/library/common.js`, `router.js`: tipo de filtro e rota protegida.
- `frontend/src/App.tsx`, `library/StudentLibrary.tsx`: acesso aos avisos por perfil.
- `frontend/src/DemoApp.tsx`, `demo-main.tsx`: composição demo e estilos existentes.
- `frontend/src/LibraryPanel.tsx`: prioridade do aviso demo quando há seções próprias e remoção de espaço em branco.
- `scripts/check-pages-demo.js`: rejeição de qualquer API no artefato demo.
- `tests/library.test.js`, `react-auth.test.js`, `painel.test.js`: regressões e encadeamento de hashes.
- `README.md`: estado atual sem apagar checkpoints históricos.

O manifesto desta sprint registra hashes antes/depois relativos ao workspace de entrada, incluindo as alterações da Sprint 1 ainda não commitadas. Não confundir `git diff HEAD` com o escopo exclusivo da Sprint 2. Nenhum arquivo de `login/`, migration ou manifesto anterior foi regravado para aceitar mudanças.

## Auditoria técnica e de segurança

Backend: SQL parametrizado; filtro de aluno imposto pela sessão; listas paginadas, limites validados, erro indisponível sem falso vazio. Rota reutiliza autenticação/perfis existentes. Operações anteriores mantêm validação, CSRF, conflitos e contratos. Suíte inclui cadastro/login/logout HTTP com PostgreSQL e bloqueio após logout, usuário inativo e respostas 501 de recuperação.

Sessões: HttpOnly, SameSite=Lax, duração de 30 minutos e Secure obrigatório fora do HTTP local explícito; segredo mínimo validado, revalidação de usuário e invalidação no logout preservadas. Não foram adicionados usuários administrativos ou permissões.

PostgreSQL: verificadas constraints, FKs RESTRICT, índices parciais para exemplar emprestado e reserva pendente única; transações/locks e histórico de movimentos preservados. A suíte exercita concorrência, rollback, integridade e operações da Sprint 1. Novos avisos são consulta única para total e página no mesmo snapshot; IDs bigint convertidos para texto antes do JSON.

Frontend: estados de carga/erro, atualização manual, ações desabilitadas quando inaplicáveis, headings, status e controles nativos. CSS existente permite quebra/flex nos formulários e ações; layout compartilhado conserva menu móvel, tema, contraste e foco. Testes DOM não comprovam ausência de cortes nem experiência de leitor de tela real.

Isolamento: somente `alexandria_test`, cluster PostgreSQL temporário em loopback 127.0.0.1:55439, separado do serviço habitual. Credencial sem senha é exclusiva deste cluster de teste local, não recomendação para instalação. Consulta pós-testes confirmou sete migrations e zero usuários, sessões, livros, empréstimos e reservas. Fixtures são removidas pelos testes. Nenhum banco de desenvolvimento/produção foi migrado ou limpo.

Encerramento confirmado pelo `pg_ctl`: `server stopped`, somente para o cluster temporário desta sprint. Verificação final adicional aprovou os cinco arquivos estáticos da demo, ausência de `/api/` em seu JavaScript e ausência do marcador exclusivo do cenário demo no bundle real. Inventário exclusivo da Sprint 2: 13 arquivos modificados e sete novos; 27 arquivos históricos de login/migrations/Sprint 1 comparados por hash sem diferenças.

Revisão de versionamento: `.gitignore` cobre .env, dependências, dist/dist-demo, bancos/dumps, logs, certificados privados, cookies/tokens, HAR, ZIPs e temporários. Nenhum desses caminhos foi encontrado no conjunto versionável examinado. Busca de padrões de chaves privadas, tokens GitHub e AWS não encontrou ocorrências; isto é evidência limitada, não garantia universal. Dados novos são fictícios; nenhum contato estudantil foi acrescentado. `.gitattributes` não configura LFS nem conversão de bytes. Lockfiles, workflow manual e backend de autenticação preservados. Índice Git vazio, HEAD permanece `dfe1aeeec7b6b7c3b2e9615c8f42bb1b4d0a3f38`.

## Reproduzir e homologar manualmente

Seguir instalação, ambiente, migrations e execução do README em banco local autorizado. Para testar usar banco descartável com `NODE_ENV=test`, `DB_ENV=test`, `TEST_DATABASE=alexandria_test`, `PGDATABASE=alexandria_test` e PGHOST/PGPORT/PGUSER próprios do cluster temporário; nunca copiar configuração apontando para produção. Gerar os dois builds antes de `npm test`. TypeScript: `cd frontend; pnpm exec tsc --noEmit`; builds: `pnpm run build` e `pnpm run build:demo`. Na raiz: `npm test` e `node scripts/check-pages-demo.js`.

Checklist ainda pendente no Edge/Safari móvel e Narrator:

- [ ] Cadastro fictício → login → `/painel/` → logout; voltar não libera sessão.
- [ ] Aluno vê somente seus empréstimos/reservas/avisos, sem controles internos; equipe consulta acompanhamento.
- [ ] Sem antecedência configurada, explicar proximidade indisponível; após política autorizada conferir datas/próximos/atrasos.
- [ ] Devolver/renovar/cancelar e atualizar avisos; conferir ausência de duplicatas e preservação do histórico.
- [ ] Demo via `pnpm run preview:demo`: abrir URL com `/Alexandr.IA/`, percorrer seis seções e simulações; reiniciar/recarregar restaura cenário; aba Network sem API.
- [ ] Teclado Tab/Shift+Tab/Escape, foco após navegação, menu em 360px, zoom 200%, contraste e temas; Narrator anuncia headings/status/erros sem barreiras.
- [ ] Conferir listas longas, datas, nomes fictícios, rolagem, ausência de cortes e orientação móvel.

Não registrar senhas, cookies ou tokens nas evidências manuais.

## Pendências e prontidão

Código local testado e documentado para revisão; publicação não autorizada nem executada. Antes de publicar: concluir homologação visual/assistiva, revisar inventário completo de Sprint 1 + 2 e autorizar expressamente commit/push/workflow. Nenhuma prontidão de produção é presumida.

Responsável institucional deve definir prazos/limites de empréstimo e renovação, antecedência de avisos, horários/canais/consentimento, gestão de perfis e critérios operacionais. Relatórios agregados reais, recuperação de senha e canais externos continuam fora de escopo. Não há atualização de avisos em segundo plano, testes físicos ou benchmark de grande volume. Para alto volume, medir consulta de posição de fila e buscas antes de otimizar índices.
