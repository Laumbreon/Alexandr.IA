# Banco de dados — fase 1.3

## Escopo e decisões

PostgreSQL é um sistema de banco de dados relacional: mantém dados organizados e aplica regras mesmo quando o acesso não vem da interface web. A fase 1.3 implementou usuários, fichas acadêmicas e histórico de migrations. A fase 1.4 acrescentou cadastro real; a fase 1.5 implementou login e sessões. Veja cadastro.md e autenticacao.md.

A migration 003_create_sessoes.sql acrescenta sessoes: sid varchar como chave primária, sess json obrigatório e expire timestamptz obrigatório com índice. O JSON guarda ID de usuário e metadados de cookie, prazo absoluto e CSRF, nunca senha ou hash. Como o ID está no JSON, não há FK relacional; toda autorização reconsulta usuarios e recusa usuários ausentes ou inativos.

### usuarios

| Coluna | Tipo e regra |
| --- | --- |
| id | bigint, identity, chave primária |
| nome | text, obrigatório e não vazio |
| email | text, obrigatório, sem espaços externos, formato básico e índice UNIQUE sobre lower(email) |
| senha_hash | text, obrigatório e não vazio; reservado para hash codificado |
| perfil | text, obrigatório; aluno, bibliotecario ou administrador |
| ativo | boolean, obrigatório, padrão true |
| criado_em | timestamptz, obrigatório, padrão instante da transação |
| atualizado_em | timestamptz, obrigatório, atualizado por trigger |

bigint oferece identificadores gerados pelo banco; pg retorna bigint como string para evitar perda de precisão em JavaScript. Não converta indiscriminadamente para Number.
O índice de e-mail preserva a grafia armazenada, mas impede duplicação de versões com caixa diferente segundo a collation do PostgreSQL. A regra de formato é básica; não confirma que a caixa postal existe nem define os domínios acadêmicos permitidos.

### alunos

| Coluna | Tipo e regra |
| --- | --- |
| usuario_id | bigint, chave primária e FK para usuarios.id |
| ra | text, opcional, UNIQUE quando preenchido, sem espaços externos ou vazio |
| curso | text opcional; se preenchido, não pode ser vazio |
| criado_em | timestamptz, obrigatório |
| perfil_usuario | text, obrigatório, valor fixo aluno |

RA '00123' preserva zeros. Não foi imposto comprimento ou formato, pois isso depende dos requisitos acadêmicos. NULL significa desconhecido; string vazia é recusada. UNIQUE permite vários valores NULL.

O relacionamento é usuarios 1 — 0..1 alunos: cada ficha precisa de usuário, mas usuário ainda pode existir sem ficha. perfil_usuario é uma coluna técnica adicional para permitir FK composta com usuarios(id, perfil). Ela impede ficha para bibliotecário/administrador e mudança de perfil incompatível com uma ficha existente. Uma FK simples não verificaria o perfil.
ON DELETE RESTRICT evita apagar usuário referenciado por ficha; não há cascata destrutiva.

Confirmar com o grupo: RA obrigatório ou opcional, formato e abrangência de sua unicidade, lista de cursos, domínios de e-mail, possibilidade de acumular perfis e obrigatoriedade de criar a ficha junto com o usuário. Se múltiplos perfis forem necessários, o modelo deverá evoluir para associação de perfis. Cursos permanecem texto até haver necessidade demonstrada de catálogo.

## Conceitos com exemplos

1. **Tabelas, colunas e registros:** usuarios é uma tabela; nome é uma coluna; cada linha representa um usuário. SELECT solicita dados sem alterá-los:

```sql
SELECT id, nome FROM usuarios;
```

2. **PRIMARY KEY:** identifica uma linha de forma única e não nula. Em alunos, usuario_id ser a chave também limita a uma ficha por usuário.

```sql
-- Trecho da definição de usuarios:
id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY
```

3. **FOREIGN KEY:** exige que a referência exista em outra tabela.

```sql
-- Trecho da definição de alunos:
usuario_id bigint PRIMARY KEY REFERENCES usuarios(id) ON DELETE RESTRICT
```

4. **UNIQUE, NOT NULL e CHECK:** UNIQUE impede duplicatas; NOT NULL exige preenchimento; CHECK limita valores. As três regras se complementam.

```sql
perfil text NOT NULL CHECK (perfil IN ('aluno', 'bibliotecario', 'administrador'))
```

5. **Migrations:** arquivos SQL numerados que evoluem o esquema. schema_migrations registra nome, checksum e instante de aplicação. SHA-256 aqui identifica alterações no arquivo; não armazena senhas.

6. **Transações:** BEGIN inicia um conjunto de operações; COMMIT confirma; ROLLBACK desfaz. O executor usa uma única conexão durante a transação, pois ela pertence à sessão do PostgreSQL.

```sql
BEGIN;
SELECT count(*) FROM usuarios;
ROLLBACK;
```

Este exemplo consulta a quantidade de usuários e encerra sem alterações. No executor, falha em qualquer migration pendente desfaz todo o lote e seus registros de histórico.

7. **Conexão Node/PostgreSQL:** pg implementa a comunicação. O pool reutiliza um número limitado de conexões; connect reserva uma, release devolve e end encerra o pool. Os comandos usam finally para encerrar mesmo após falha. A configuração é explícita, com timeout de conexão e consulta, sem dados sensíveis nos logs.

8. **SQL parametrizado:** separa a instrução dos dados, evitando interpretar valores como SQL.

```javascript
const result = await pool.query(
  'SELECT id FROM usuarios WHERE email = $1',
  ['pessoa@example.invalid']
);
```

$1 recebe um valor. Não concatene entradas do usuário no SQL. Parâmetros não substituem nomes de tabelas: as migrations usam identificadores fixos, escritos no projeto.

9. **Senhas:** senha_hash recebe a representação completa de Argon2id, com salt e parâmetros, pelo cadastro da fase 1.4. NOT NULL e CHECK não comprovam que uma string é um hash válido; o service gera o hash antes de persistir. Nunca use senha em texto puro nem SHA-256 simples. Os testes de integridade SQL da fase 1.3 usam um marcador fictício revertido; os testes de cadastro utilizam e verificam Argon2id real.

10. **PostgreSQL e integridade:** regras no banco protegem o relacionamento independentemente da aplicação. Validações no frontend ajudam o usuário, mas podem ser contornadas e não substituem constraints e autorização no servidor.

## Fluxo do código

db-check carrega configuração, valida o destino, cria um pool, faz SELECT parametrizado e encerra o pool.
migrate lê arquivos em ordem, valida numeração, reserva uma conexão, inicia transação e obtém um advisory lock transacional. Confere o histórico como prefixo exato dos arquivos disponíveis, aplica somente os pendentes e confirma. Falhas revertem o lote. release e end liberam os recursos.

Na fase 1.4, app.js cria o pool sob demanda quando um cadastro válido é solicitado. Isso mantém páginas e health disponíveis sem PostgreSQL. Migrations continuam sendo comandos explícitos, nunca executados pelo servidor HTTP ou npm ci.

Os limites locais dos comandos não substituem permissões PostgreSQL ou isolamento de infraestrutura. Use usuário próprio com acesso apenas aos bancos do projeto. Os testes exigem destino de teste explícito e revertem os dados fictícios; não use uma base com dados reais.

## Esboço futuro — nenhuma tabela implementada

- livros representa obras; autores relaciona-se com livros por associação muitos para muitos.
- exemplares representa cópias físicas; cada exemplar pertence a um livro.
- empréstimos relaciona leitor e exemplar, com prazo, devolução e eventual perda.
- reservas relaciona leitor e livro, com ordem da fila e situação.
- notificações registra destinatário, canal, motivo e resultado, respeitando consentimento por canal.

Disponibilidade será derivada dos exemplares e operações vigentes. Concorrência de empréstimos e filas exigirá transações e regras próprias em etapas futuras.

## Referências

- Node e suporte: https://nodejs.org/en/about/previous-releases
- Instalação PostgreSQL no Windows: https://www.postgresql.org/download/windows/
- Transações com pg: https://node-postgres.com/features/transactions
- Consultas parametrizadas: https://node-postgres.com/features/queries
