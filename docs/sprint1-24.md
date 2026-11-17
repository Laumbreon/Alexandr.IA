# Sprint 1 — 2.4 Reservas e renovações

Conclusão local e revalidação final: 16/11/2026. Não houve commit, push, deploy ou publicação.

## Reservas por obra

Migration 007 cria biblioteca_reservas. Uma solicitação referencia a obra e a ficha de aluno, sem prender o leitor a um exemplar. Índice parcial permite somente uma reserva aguardando por obra/leitor. A fila é ordenada pelo ID de inserção, sob bloqueio da obra; a posição é calculada a partir de todas as reservas pendentes da obra, inclusive quando a consulta do aluno só devolve seus próprios registros.

Estados:
- aguardando: sem exemplar/retirada associada; posição atual, sem promessa de entrega imediata.
- atendida: registro de empréstimo associado e operador; terminal.
- cancelada: encerramento, operador e motivo; terminal.

Transições: aguardando → atendida exclusivamente na retirada da equipe; aguardando → cancelada pelo titular ou pela equipe. Cancelamento administrativo exige motivo. Cancelamentos do titular usam motivo fixo sem pedir dados pessoais. Não há reabertura, exclusão física, notificações ou expiração automática.

Proposta conservadora implementada: FIFO por obra, sem fura-fila ou prioridade por pessoa; uma reserva pendente por aluno/obra; quem já possui empréstimo ativo da obra não solicita outra reserva. Não são regras oficiais da Fatec. Leitores externos não foram habilitados. Essas decisões estão documentadas para aceite/ajuste do responsável; não foram aplicadas a dados de desenvolvimento ou produção.

## Renovação

LIBRARY_RENEWAL_DAYS e LIBRARY_MAX_RENEWALS devem vir de regras aprovadas pelo responsável. Sem configuração válida, a API responde 503; limite zero desabilita. Não existe valor institucional padrão. Faixas técnicas: 1–365 dias adicionais e 0–20 renovações.

Somente o titular aluno solicita renovação. A API verifica propriedade, empréstimo ativo, prazo ainda não vencido, conta/vínculo habilitados, limite e ausência de reserva pendente de outro aluno. Política conservadora: qualquer reserva pendente de outro leitor impede a renovação, mesmo quando existem vários exemplares. Alterar essa política exige decisão explícita futura.

Prazo adicional parte do prazo anterior. Não há renovação automática ou alteração arbitrária de prazo pelo aluno. Cada renovação registra operador, prazo anterior e novo em biblioteca_movimentos. Não implementa multa ou sanção institucional.

## Endpoints — /api/biblioteca

| Método | Caminho | Permissão |
| --- | --- | --- |
| GET | /reservas | Próprias para aluno; todas para equipe |
| GET | /reservas/:id | Titular ou equipe; outro aluno recebe 404 |
| POST | /livros/:id/reservas | Somente aluno, ID do leitor pela sessão, corpo vazio |
| POST | /reservas/:id/cancelamento | Titular com corpo vazio; equipe com motivo |
| POST | /emprestimos/:id/renovacao | Somente titular aluno, corpo vazio |

Todas as mutações exigem sessão, origem permitida e CSRF. Listas aceitam pagina/limite/q/estado e filtro leitor_id para equipe. Aluno não pode selecionar outro leitor por parâmetros; recusa 403. Estados de filtro: aguardando, atendida, cancelada ou todas.

## Concorrência

Reserva, cancelamento, retirada e renovação começam bloqueando a mesma obra. Depois bloqueiam o leitor e as linhas operacionais relevantes, sempre nessa ordem. Ao emprestar, a API consulta o primeiro da fila e recusa outro leitor; registra empréstimo, movimento e atendimento na mesma transação. Devolver não promete ou aloca automaticamente o exemplar a alguém.

Renovações concorrentes serializam o contador no PostgreSQL. Solicitação concorrente de reserva lineariza antes ou depois da renovação; uma fila já existente não pode ser ignorada. Cancelamento concorrente ao atendimento resulta em uma transição consistente, sem reserva atendida/cancelada simultaneamente. Falha intermediária reverte a retirada e preserva a fila.

Deadlocks ou conflitos de serialização recebem 409, sem sucesso falso nem retry automático de escrita. A interface orienta atualizar/repetir de forma consciente. As garantias pressupõem que as operações ocorram por estas APIs; acesso SQL administrativo precisa de controle próprio.

## Telas

Aluno: Solicitar reserva no catálogo; Minhas reservas, posição e cancelamento; Solicitar renovação em Meus empréstimos. Feedback só aparece após confirmação da API.

Equipe: Empréstimos contém abas Empréstimos e Reservas; fila/histórico, motivo e cancelamento administrativo. Atendimento é feito em Novo empréstimo, selecionando a obra e o primeiro leitor mostrado na fila. Não há falsa ação “atendida” sem retirada real. O backend revalida a prioridade e a disponibilidade.

Confirmações de operações importantes utilizam diálogo nativo; botões são bloqueados durante envio. Hierarquia h1/h2/h3 acompanha o perfil; foco, navegação móvel e preferências anteriores são preservados. A demonstração Pages não recebeu funcionalidades de biblioteca/API.

## Checkpoint

Base após 2.3: 176 testes. Final: **185 aprovados, zero falhas, cancelados ou ignorados**, TypeScript e builds real/demo aprovados. Novas verificações: FIFO e posição, unicidade concorrente, propriedade e CSRF, atendimento atômico, renovação concorrente limitada, prioridade, rollback, atraso, política ausente e feedback React pendente até resposta.

Na revisão final também foram cobertos origem cruzada, limite JSON de 16 KiB, query inesperada, identificadores numéricos sem precisão segura e campos incompletos de exemplar. A query limite[]=1 inicialmente foi ignorada pelo parser simples do Express; o servidor passou a recusar nomes de parâmetros não permitidos. Nenhum teste foi dispensado.

Conferência visual e leitor de tela continuam pendentes. Consultar [relatório geral e roteiro manual](sprint1-relatorio.md).
