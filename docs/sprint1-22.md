# Sprint 1 — 2.2 Leitores

A migration 005 acrescenta somente biblioteca_leitores(usuario_id, habilitado, versao), referenciando a ficha existente em alunos. Conta e nome/e-mail ficam em usuarios; RA/curso em alunos; histórico de circulação terá referências próprias. Ausência de linha operacional equivale a aluno habilitado; uma restrição explícita é persistida nessa tabela. A conta ainda precisa estar ativa.

Não há leitores externos: a faculdade ainda não aprovou esse vínculo. Não foi duplicada a tabela de pessoas. Inabilitar circulação não desativa login nem promove perfil.

## API — /api/biblioteca

- GET /leitores?q=&pagina=&limite=: equipe, nome/RA, sem e-mail/hash na lista.
- GET /leitores/:id: equipe, dados da ficha e e-mail da conta, nunca hash/sessão.
- PUT /leitores/:id: equipe + CSRF; somente nome, RA, curso, habilitado e versão.
- POST /leitores: equipe + CSRF; usa o mesmo cadastro/validação/Argon2id, sempre aluno. Sem promoção, redefinição de senha ou sessão para a conta criada.
- GET /meu-perfil: somente aluno; ID vem exclusivamente da sessão. Alterar query/URL não seleciona outro estudante.

Leitores usam paginação de 10 por padrão, máximo 50. SQL parametrizado. Atualização bloqueia a linha do usuário e faz ficha/vínculo em transação; versão antiga responde 409. Não altera e-mail, senha, perfil ou estado da conta de acesso. Nenhuma exclusão física.

## Telas e operação

Leitores no painel da equipe: lista, pesquisa, paginação, cadastro aluno, edição de ficha e habilitação. Não exibe e-mails em massa. A senha inicial é fornecida pelo operador, não fixa; segue a regra Unicode existente. Não há envio de credenciais por mensagem nem recuperação automática.
Aluno possui Catálogo e Meu perfil, sem listagem geral ou formulário administrativo. Estados de carregamento/erro/vazio e confirmação da API. Dados somente da sessão atual; nenhum dado de leitores é embutido no bundle.

## Checkpoint

2.2: 170 testes aprovados, zero falhas/ignorados; TypeScript, build real e build Pages aprovados. Cobertura de acesso horizontal, campos minimizados, versão, CSRF, promoção recusada e tela de perfil próprio. Os testes de navegação de aluno foram atualizados para verificar explicitamente as duas regiões de navegação, mantendo a ausência de ferramentas administrativas.
Não houve aplicação de migrations no banco de desenvolvimento nem criação de usuários reais. Conferência visual/Narrador continua pendente. Sem commit, push, deploy ou atualização funcional da demo.
