# Sprint 1 — 2.3 Empréstimos e devoluções

Migration 006: biblioteca_emprestimos relaciona ficha de aluno e exemplar; retirada, prazo, devolução, estado coerente e número de renovações. biblioteca_movimentos registra operador e ocorrência. Não há exclusão ou contador editável de disponibilidade. Índice único parcial impede dois empréstimos ativos do mesmo exemplar mesmo se um cliente contornar o frontend.

## Política explícita, sem regra institucional inventada

LIBRARY_LOAN_DAYS e LIBRARY_MAX_LOANS precisam ser definidos pelo responsável no ambiente local antes de emprestar. Sem ambos válidos, a API informa 503 e a tela desabilita a retirada. Faixas técnicas: 1–365 dias e 1–100 empréstimos; não são políticas da Fatec. O prazo é calculado no servidor, não pode ser arbitrariamente enviado pelo cliente. Não há multas, bloqueios financeiros ou cadastro de políticas oficiais. Os testes usam valores fictícios explícitos de 7 dias e limites próprios de cada caso.

## API — /api/biblioteca

- GET /politica: informa se há configuração e seus valores não secretos.
- GET /emprestimos?estado=ativos|historico|atrasados|todos&q=&leitor_id=&pagina=&limite=
- GET /emprestimos/:id
- POST /emprestimos: equipe + CSRF, leitor_id e exemplar_id.
- POST /emprestimos/:id/devolucao: equipe + CSRF, objeto vazio. 201 confirma evento criado; segunda devolução responde 409.

Aluno só consulta os próprios registros. ID de outro retorna 404; filtro explícito de outro leitor retorna 403. Listas não trazem e-mail/RA/hash. Equipe pode pesquisar por leitor, título e patrimônio. Todos os retornos são dados reais.

## Concorrência e integridade

Retirada: transação, bloqueio da obra, do leitor e do exemplar; revalida estado físico, vínculo habilitado, conta ativa, limite e ausência de empréstimo ativo. Grava retirada e movimento na mesma transação. Devolução: mesma ordem de bloqueios, atualiza o estado e cria movimento; falha reverte ambos. Índice parcial é defesa adicional. Limite por leitor é serializado mesmo entre obras diferentes. Atualizar exemplar durante empréstimo é recusado até a devolução.

Disponibilidade do catálogo é calculada com exemplar circulável, conservação não danificada e ausência de empréstimo ativo. Sujeita à validação no momento da retirada; ver disponibilidade não bloqueia um exemplar. Atraso é uma consulta do prazo comparado ao relógio PostgreSQL, sem contador alterável.

## Telas

Equipe: pesquisa de empréstimos, ativos/histórico/atrasados, retirada com seletores reais e pesquisa independente por título/leitor, paginação de exemplares, confirmação de retirada/devolução e feedback somente após API. Opções de livros/leitores limitadas a 50 por busca; refinar termos quando necessário. Aluno: Meus empréstimos, exemplar, datas, situação e histórico, sem devolução administrativa ou alteração de prazo. Reserva/renovação ainda não foram implementadas neste checkpoint.

## Checkpoint

2.3: 176 testes aprovados, zero falhas/ignorados; TypeScript e builds real/demo aprovados. Cobertura de corrida pelo mesmo exemplar, corrida por limite de leitor em obras distintas, falha intermediária com rollback, bloqueio físico/vínculo, política ausente, CSRF, autorização horizontal, atraso, devolução duplicada e tela própria sem ação administrativa.
Nenhuma migration histórica foi editada. Nenhum banco de desenvolvimento, conta real ou Pages foi alterado. Conferência visual permanece pendente.
