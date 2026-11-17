# Sprint 2 — checkpoint 2.5: avisos internos

Base confirmada: 185 testes. Checkpoint 2.5: 192 aprovados, zero falhas/cancelados/ignorados; TypeScript e builds real/demo aprovados antes de iniciar 2.6.

GET /api/biblioteca/avisos é protegido pelo mesmo middleware de sessão/perfil das demais operações. Aluno recebe apenas seus registros; leitor_id de outro é recusado. Bibliotecário/administrador podem acompanhar todos ou filtrar leitor autorizado. Parâmetros: pagina, limite (até 50), tipo=todos|atrasado|proximo|reserva e leitor_id. Não retorna e-mail, RA, senha, hash ou tokens.

Sem nova migration: os avisos são uma projeção SQL dos empréstimos ativos e das reservas aguardando. IDs estáveis (emprestimo:ID ou reserva:ID) evitam duplicatas; devolução/renovação/cancelamento/atendimento se refletem na próxima consulta. Uma única consulta calcula lista e total no mesmo snapshot. IDs bigint são convertidos para texto antes do JSON para preservar precisão.

Atraso é calculado pelo prazo real comparado ao relógio do banco. LIBRARY_NOTICE_DAYS é opcional, inteiro de 0–365, sem padrão institucional. Ausente/inválido: não há avisos de proximidade, mas atrasos e reservas continuam visíveis; a interface informa a pendência e mantém a consulta dos prazos. Nenhum horário, antecedência oficial, multa ou política de comunicação foi presumido. Os testes usam três dias explicitamente fictícios.

Equipe acessa Visão geral → Avisos e acompanhamento. Aluno acessa Avisos. Há carregamento, erro sem falso vazio, filtros, paginação, datas e atualização manual; trocar/retornar à área consulta os dados novamente. Não há polling, job ou agenda de envio inventada.

Nenhum canal externo foi implementado/ativado. E-mail, WhatsApp e SMS dependem de autorização específica, decisão institucional sobre destinatários/consentimento/conteúdo/horários, provedor e gestão de segredos. Se aprovados futuramente, separar projeção de avisos e entrega em fila/outbox com chave idempotente por evento/canal/destinatário, retries controlados, auditoria minimizada e adaptadores testados sem rede. Esses componentes não são necessários para avisos internos e não foram instalados.

Foram testados sessão, acesso horizontal, tipos/limites inválidos, antecedência ausente/zero/inválida, datas reais, paginação/deduplicação, atualização nas operações e estados React. O mock do teste antigo de catálogo precisou distinguir a nova consulta inicial de avisos para não consumir a mesma Response duas vezes; as asserções do catálogo foram preservadas.

Migrations 001–007 e registros da Sprint 1 permanecem intactos. Sem commit, push, deploy ou envio real.
