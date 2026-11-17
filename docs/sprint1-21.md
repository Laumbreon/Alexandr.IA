# Sprint 1 — 2.1 Acervo

Obra bibliográfica e exemplar físico são registros diferentes. A migration 004 acrescenta livros, autores, categorias, autoria N:N e exemplares com patrimônio único sem distinção de caixa. Editora permanece texto opcional: não há operações próprias que justifiquem outro cadastro. ISBN é opcional com formato 10/13 caracteres, sem consulta externa. Nenhum dado foi semeado automaticamente.

Estados operacionais: circulavel, manutencao, baixado. Conservação: bom, regular, danificado. Mudanças são reversíveis e versionadas; não há DELETE de acervo. Todas as FKs usam RESTRICT. Contagens vêm dos exemplares, nunca de valores editáveis. Nesta fase, circulaveis significa condição física/operacional, não quantidade de empréstimos nem promessa de disponibilidade imediata.

## API — /api/biblioteca

- GET /livros?q=&autor=&categoria=&pagina=1&limite=10
- GET /livros/:id
- POST /livros
- PUT /livros/:id (inclui versao)
- GET /livros/:id/exemplares?pagina=1&limite=10
- POST /livros/:id/exemplares
- PUT /exemplares/:id (estado, conservacao e versao)

Sessão e perfil conhecido em todas as rotas. Aluno consulta; bibliotecário/administrador alteram. Mutações exigem origem permitida e token CSRF existente. JSON limitado a 16 KiB, listas até 50 itens, consultas parametrizadas, limite de requisições. Erros: 400 dados, 401 sessão, 403 permissão/CSRF, 404 livro, 409 duplicidade/versão, 503 indisponibilidade. Exemplar ausente/versão antiga responde 409 para exigir atualização da consulta.

Cadastro/edição de obra, categoria e autoria ocorrem na mesma transação. Falha reverte tudo. Versão evita sobrescrita silenciosa. Patrimônio e ISBN únicos são reforçados no PostgreSQL. A pesquisa trata % e _ como caracteres literais.

## Interface

Acervo real no painel de bibliotecário/administrador, sem alterar o layout global. Cadastro/edição bibliográfica, exemplares, filtros, paginação, vazio, carregamento, erro e sucesso confirmado pela API. Aluno recebe consulta de catálogo, sem formulários administrativos. A demo Pages mantém fixtures, entrada independente e nenhuma chamada à biblioteca. Seções ainda demonstrativas continuam explicitamente identificadas.

Exemplo fictício: cadastrar Dom Casmurro, Machado de Assis, Literatura; depois cadastrar dois patrimônios distintos. O banco terá uma obra e dois exemplares. Alterar um exemplar para manutenção não altera o outro.

## Checkpoint

Base: 160 testes. Checkpoint 2.1: 166 aprovados, zero falhas/ignorados; TypeScript e builds real/demo aprovados. Banco exclusivo alexandria_test no cluster temporário. Durante regressão foi corrigido tabindex do título real para preservar foco após navegação. O diagnóstico inicial de assert de DOM sem foco resultou em erro de memória do processo de teste; a correção foi confirmada isoladamente e em regressão, sem dispensar o teste.

Testes incluem perfis, sessão, CSRF, SQL injection como texto, paginação, autoria, versões antigas, patrimônio duplicado, validação e renderização de dados reais. Os testes de filtros fictícios agora exercitam explicitamente a entrada demo, enquanto o catálogo autenticado possui cobertura própria. As migrations 001–003 e os registros SHA históricos permaneceram intactos.

Homologação visual/teclado físico não é comprovada por jsdom; segue pendente de conferência manual. Não houve commit, push ou deploy.

## Exemplo de contrato ficticio

POST /livros recebe titulo, autores (array de 1-10 nomes), categoria, isbn e editora opcionais. Exemplo somente para banco ficticio:

```json
{"titulo":"Obra ficticia de estudo","autores":["Autor ficticio"],"categoria":"Estudo","isbn":null,"editora":null}
```

PUT usa os mesmos dados e versao retornada pela API. POST /livros/:id/exemplares recebe patrimonio e, opcionalmente, estado/conservacao; exemplo {"patrimonio":"DEMO-001","estado":"circulavel","conservacao":"bom"}. PUT /exemplares/:id exige estado, conservacao e versao. IDs retornados sao texto decimal; numeros grandes devem permanecer texto para nao perder precisao no JavaScript.
