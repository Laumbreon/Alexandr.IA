# Cadastro de estudantes — fase 1.4

## Contrato preservado

O formulário original envia POST /api/cadastro com Content-Type application/json:

```json
{
  "nome": "Estudante fictício",
  "email": "estudante@example.invalid",
  "password": "uma frase fictícia longa"
}
```

O nome password foi mantido porque é exatamente o contrato de login/cadastro.js. O campo não foi renomeado para senha. O formulário não envia confirmação, RA ou curso; eles não são exigidos.
A API aceita também confirm_password, ra e curso. Se confirm_password for enviado, precisa ser exatamente igual à senha. Campos desconhecidos são rejeitados, incluindo perfil, ativo, senha_hash e permissões.

Sucesso retorna 201 com success: true e message. O JavaScript original mostra a mensagem e redireciona para /login. O cadastro não cria sessão nem emite cookie ou JWT. O login passou a funcionar na fase 1.5; consulte autenticacao.md.

Os 13 arquivos foram preservados até a fase 1.5H. A FIX.1 alterou somente cadastro.html e cadastro.js mediante autorização específica, mantendo os hashes históricos e registrando os novos separadamente. A tela e o JavaScript agora informam/aplicam 15–128 pontos Unicode, preservando espaços; a referência ao Flask foi removida. Veja [alteracoes-autorizadas-fix1.md](alteracoes-autorizadas-fix1.md). Homologação visual continua pendente; testes em VM/HTTP não substituem navegador.

## Fluxo e arquivos

1. app.js limita tentativas antes de ler o JSON, aceitando no máximo 8 KiB por corpo.
2. cadastro.controller.js recebe a requisição, chama o validator e o service, traduzindo o resultado para HTTP.
3. cadastro.validator.js verifica tipos, limites e campos permitidos; normaliza nome, e-mail, RA e curso.
4. cadastro.service.js gera Argon2id sem bloquear o event loop com uma operação síncrona. Limita a dois hashes simultâneos por aplicação para conter consumo de memória.
5. usuarios.repository.js reserva uma conexão e inicia transação. Insere usuarios com perfil fixo aluno, depois alunos, e só então confirma.
6. Qualquer falha provoca ROLLBACK e liberação da conexão. Se o rollback falha, a conexão é descartada.

O controller cuida de HTTP; o validator cuida do formato; o service organiza a regra de negócio; o repository contém SQL. A separação permite testar a API com um pool de teste sem apontar para desenvolvimento.

Exemplo de INSERT parametrizado, equivalente ao utilizado pelo repository:

```javascript
const result = await client.query(
  "INSERT INTO usuarios (nome,email,senha_hash,perfil) VALUES ($1,$2,$3,'aluno') RETURNING id",
  [nome, email, hash]
);
```

INSERT cria um registro. RETURNING devolve o ID gerado pelo PostgreSQL, necessário à ficha acadêmica. O perfil é constante no SQL, não vem do cliente. $1, $2 e $3 representam valores separados da instrução.

```sql
BEGIN;
-- INSERT em usuarios, seguido de INSERT em alunos, usando a mesma conexão.
COMMIT;
-- Se qualquer operação falhar, o código executa ROLLBACK.
```

A transação impede que um cadastro parcialmente concluído deixe usuário sem ficha. Um conflito de RA, por exemplo, acontece na segunda inserção e desfaz também a primeira. A unicidade do banco decide conflitos concorrentes; não usamos uma consulta prévia vulnerável à corrida entre requisições.

## Validação

| Campo | Regra |
| --- | --- |
| nome | string obrigatória, até 200 unidades UTF-16 antes de trim, não vazia |
| email | string obrigatória, até 254 unidades UTF-16, trim e caixa baixa, formato básico com @ e ponto no domínio |
| password | string de 15 a 128 pontos de código Unicode, sem trim ou normalização |
| confirm_password | opcional; igualdade exata quando enviado |
| ra | string opcional até 50 unidades UTF-16, trim, preserva zeros |
| curso | string opcional até 200 unidades UTF-16, trim |

RA e curso ausentes, nulos ou vazios após trim viram NULL. Nome, e-mail, RA e curso com caractere NUL são rejeitados, pois PostgreSQL text não o aceita. A senha pode conter espaços e Unicode, sem exigência artificial de classes de caracteres. A comparação não muda a senha fornecida.
O banco anterior usa text sem máximos; os limites da API são uma restrição adicional para prevenir entradas excessivas. O formato do RA e domínios acadêmicos ainda precisam de alinhamento.

## Argon2id

Argon2id é uma função de hash de senha com custo de memória e processamento, adequada contra tentativas de adivinhação em massa. O projeto usa memoryCost=19456 KiB (19 MiB), timeCost=2 e parallelism=1, configuração mínima recomendada pela OWASP para Argon2id. A biblioteca gera salt aleatório; o banco recebe somente a representação codificada com parâmetros, salt e hash.

Hash é uma transformação de mão única: a verificação recalcula e compara. Criptografia reversível permite recuperar o conteúdo com uma chave; não é a escolha para guardar senhas. SHA-256 simples é rápido demais para esse uso.

A dependência foi fixada em argon2 0.44.0 após a versão 0.45.2 falhar na instalação nativa Windows deste ambiente e não concluir o teste de hash. A 0.44.0 instalou com binário pré-compilado e foi validada com hash e verify reais em Node 20.20.0 x64. Não houve substituição do algoritmo ou fallback inseguro. O npm informou zero vulnerabilidades na instalação concluída.
A instalação malsucedida deixou um aviso de limpeza EPERM em diretório temporário de node_modules; não afeta os arquivos versionáveis nem os testes executados.

O primeiro cadastro HTTP medido na suíte levou aproximadamente 75 ms, incluindo banco e verificações do teste. Isso é uma observação local, não uma homologação de carga. Reavaliar parâmetros e capacidade no ambiente futuro antes de publicação. São permitidos dois hashes simultâneos por aplicação; acima disso, a API retorna 503 sem enfileirar trabalho ilimitado.

Node 24 LTS é recomendado; o Node 20 instalado está fora de suporte. Não houve atualização global. Procedimento futuro: instalar Node 24 pelo site oficial, confirmar node --version, executar npm ci e repetir os testes completos com PostgreSQL isolado. Não foi executado teste em Node 24.

## Respostas e proteção de recursos

| HTTP | Significado |
| --- | --- |
| 201 | usuário e ficha criados, sem autenticação |
| 400 | objeto, campo, tipo, senha ou JSON inválido |
| 409 | e-mail ou RA já utilizado |
| 413 | corpo maior que 8 KiB |
| 429 | limite de tentativas por IP excedido |
| 500 | falha inesperada, resposta pública genérica |
| 503 | banco indisponível/não configurado ou capacidade de hash ocupada |

O controller não devolve consultas, stack traces, hashes ou detalhes criptográficos. Não há logs de corpo, senha ou hash.

express-rate-limit 8.7.4 limita cinco solicitações por IP a cada 15 minutos, incluindo tentativas inválidas e bem-sucedidas. Responde JSON e Retry-After. O armazenamento é em memória: reiniciar zera contagens; instâncias distintas não compartilham limites; usuários no mesmo NAT podem compartilhar a cota. Como o servidor é loopback sem proxy, trust proxy permanece false e cabeçalhos encaminhados não definem identidade. A validação de configuração do cabeçalho X-Forwarded-For foi desativada apenas para essa decisão explícita; o teste confirma que alterar o cabeçalho não contorna a cota.

Antes de publicação, definir store compartilhado, política de proxy confiável, proteção distribuída contra abuso e monitoramento sem dados sensíveis.
409 permite inferir que um identificador está em uso, mesmo com mensagem conjunta para e-mail/RA. O rate limit reduz abuso, mas não elimina enumeração. Antes de abertura pública, considerar fluxo de resposta neutra com verificação de propriedade do e-mail e limites adicionais, mantendo o tratamento seguro dos conflitos.

## Testes e operação

Os 27 testes anteriores foram executados novamente com PostgreSQL isolado e passaram antes da implementação. O teste de rotas 501 foi ajustado apenas para retirar /api/cadastro da lista, conforme a nova funcionalidade.

Os novos testes cobrem validação HTTP, tamanhos, privilégios, JSON, limitação, falhas públicas, cadastro HTTP com PostgreSQL, ausência de sessão, Argon2id real, espaços na senha, salt aleatório, duplicatas de e-mail e RA, rollback e concorrência.
Resultado final: 55 testes automatizados aprovados, zero falhas, cancelamentos ou testes ignorados. O cadastro HTTP observado na última execução levou aproximadamente 68 ms. Um teste manual visual não pôde ser executado pela indisponibilidade do controle do navegador. Node 24 não foi executado.
O teste de indisponibilidade HTTP injeta uma conexão recusada; o teste anterior de pool também exercita uma falha TCP real. Dados válidos são criados somente no banco explicitamente configurado como teste. Os testes removem apenas fixtures com e-mails aleatórios exclusivos desta execução.

Para repetir, siga a configuração alexandria_test do README e execute npm test. Sem TEST_DATABASE=alexandria_test, os testes de integração são marcados como ignorados, nunca apresentados como aprovados. Nenhum teste pode usar dados reais.

## Pendências para fase 1.5

- Implementação do login mediante nova autorização, com verificação Argon2id e política de sessão.
- Verificação de propriedade do e-mail; não abrir cadastro para estudantes reais antes disso.
- Ajuste autorizado das orientações da interface para refletir 15 caracteres.
- Homologação do formulário no navegador e da execução em Node 24.
- Política acadêmica de RA, cursos e domínios, além de revisão de abuso/enumeração.

## Referências

- https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- https://github.com/ranisalt/node-argon2
- https://express-rate-limit.mintlify.app/quickstart/usage
- https://nodejs.org/en/about/previous-releases
