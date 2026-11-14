# Autenticação — fase 1.5

> Atualização da sprint MVP: login agora retorna { success: true, redirect: "/painel/" }; /area permanece protegida para compatibilidade. Resultado atual: 156 testes aprovados. Os relatos de fases anteriores abaixo são históricos. Ver [entrega-mvp.md](entrega-mvp.md) e README.

Atualização documental: a FIX.1 corrigiu apenas o cadastro e sua mensagem, preservando os fluxos de login/sessão/logout. Os dois originais autorizados e os resultados atuais estão em [alteracoes-autorizadas-fix1.md](alteracoes-autorizadas-fix1.md); as referências à preservação dos 13 arquivos abaixo descrevem o marco histórico da fase 1.5.

## Escopo e preservação

Login real, sessões PostgreSQL, identidade, logout e middleware de autorização inicial. Não há recuperação, mensagens, biblioteca, dashboard completo ou deploy. Os 13 arquivos originais continuam idênticos, incluindo login/login.js.

O JavaScript original envia { email, password } para POST /login, lê JSON e, se success for true, usa data.redirect. O backend responde { success: true, redirect: '/area' }. /area é uma página temporária protegida criada nesta fase, identificada como tal; não existia antes e não substitui o frontend futuro.

## Cadastro, autenticação e autorização

Cadastro cria a conta e o hash. Autenticação demonstra que a pessoa conhece a senha daquela conta. Autorização decide quais operações a identidade atual pode executar. Cadastro permanece sem login automático.

O validator do login aceita somente email e password. E-mail é string de até 254 unidades UTF-16, normalizado com trim e caixa baixa, com formato básico e sem NUL. Senha é string não vazia, limitada a 128 pontos de código Unicode, preservando espaços. Não se impõe mínimo de 15 no login, pois a verificação deve permitir contas anteriores à política de cadastro; o cadastro continua exigindo 15–128.

## Consulta e Argon2id.verify

O repository consulta por parâmetro, sem concatenar entrada:

```sql
SELECT id, senha_hash, ativo
FROM usuarios
WHERE lower(email) = $1;
```

O service usa Argon2id.verify com o hash codificado que já inclui salt e parâmetros:

```javascript
const valid = await argon2.verify(hashArmazenado, senhaRecebida);
```

Não se gera outro hash com salt novo para comparar strings e não se descriptografa a senha. A verificação recalcula conforme os parâmetros do hash.
Senha errada, conta inexistente e conta inativa retornam o mesmo HTTP 401 e mensagem genérica. Uma conta inativa também passa pela verificação criptográfica.

Para inexistentes, o service verifica contra um hash substituto aleatório, criado em memória por instância, que não corresponde a uma conta. Isso evita uma saída rápida sem Argon2. A primeira solicitação também paga o custo de preparação desse hash.
Isso reduz diferenças, mas não torna o fluxo rigorosamente constante: SQL, cache, parâmetros legados, carga e preparação inicial variam. Em uma execução, conhecido/desconhecido com senha errada levou aproximadamente 22/23 ms; é observação local, não prova de resistência a análise estatística ou teste de carga.
Há limite de duas verificações simultâneas por aplicação; capacidade excedida responde 503.

## Sessão HTTP e cookie

HTTP não conserva identidade entre solicitações por si só. express-session mantém um registro de sessão no servidor e um cookie com identificador opaco assinado no navegador. O conteúdo da sessão não fica no cookie.

connect-pg-simple persiste em public.sessoes, criada pela migration 003. createTableIfMissing=false: o servidor não cria tabelas.

| Campo | Regra |
| --- | --- |
| sid | varchar, chave primária, identificador aleatório |
| sess | json obrigatório |
| expire | timestamptz obrigatório e indexado |

O JSON contém somente userId e metadados necessários: cookie, authExpiresAt e csrfToken. Não guarda perfil, senha, hash ou JWT.
O store ignora linhas expiradas e faz limpeza periódica das expiradas, com intervalo padrão de aproximadamente 15 minutos e variação da biblioteca. A validade não depende da execução da limpeza.

Cookie alexandria.sid:

- HttpOnly: scripts não leem seu valor por document.cookie.
- SameSite=Lax: conserva navegação normal por links, limitando envio em contextos cruzados. Não substitui CSRF.
- Path=/, sem Domain: escopo do host atual.
- Secure em HTTPS; fora de development/test, recusar configuração explicitamente insegura.
- HTTP local exige SESSION_COOKIE_SECURE=false e NODE_ENV=development ou test.

Mesmo no ambiente local, req.secure força Secure quando a conexão realmente é HTTPS. trust proxy permanece false; X-Forwarded-Proto não pode simular HTTPS.
O servidor atual continua HTTP loopback; nenhum certificado, proxy ou porta pública foi configurado.

SESSION_SECRET vem do ambiente, exige pelo menos 32 bytes e deve ser aleatório. A checagem de tamanho não comprova entropia; o README gera 48 bytes por CSPRNG diretamente no .env sem imprimir o segredo. Não usar palavras previsíveis. Alterá-lo invalida assinaturas antigas; rotação planejada e múltiplos segredos são melhorias futuras.

Não há JWT nem armazenamento de senha, hash ou ID de sessão em localStorage. Somente o navegador administra o cookie.

## Prazo e session fixation

Prazo absoluto de 30 minutos após login, aplicado no servidor por authExpiresAt, além da validade persistida no store. rolling=false, resave=false e disableTouch=true evitam renovar o prazo pela navegação.
O prazo do cookie sozinho seria insuficiente: clientes HTTP podem reapresentar cookies manualmente.

Session fixation ocorre quando o atacante tenta fazer uma vítima autenticar usando um identificador já conhecido por ele. Por isso o controller chama regenerate depois da verificação da senha e antes de salvar userId. O ID antigo é destruído e o novo token CSRF também é aleatório.

```javascript
await new Promise((resolve, reject) => {
  req.session.regenerate(error => error ? reject(error) : resolve());
});
req.session.userId = userId;
```

O controller aguarda save antes de responder sucesso. Se persistir falhar, não retorna 200 nem emite cookie de autenticação. Os testes exercitam essa falha.

## Identidade e autorização atual

GET /api/me retorna apenas id, nome, email e perfil como JSON. Sem sessão, retorna 401.
O middleware exige sessão válida e não expirada, consulta usuarios pelo ID da sessão e reavalia ativo e perfil a cada solicitação. Uma conta desativada ou removida perde acesso mesmo que ainda possua cookie.

```sql
SELECT id, nome, email, perfil, ativo
FROM usuarios
WHERE id = $1;
```

requireRoles é reutilizável, usado sempre após autenticação:

```javascript
app.get('/recurso-futuro',
  ...app.locals.auth.authenticate,
  app.locals.auth.requireRoles('bibliotecario'),
  handler);
```

Esse exemplo não cria rota na aplicação. A suíte monta uma rota exclusiva em sua própria instância para verificar 403 de aluno e revalidação do perfil no banco. Nenhuma rota administrativa foi liberada nesta fase.
As respostas protegidas recebem Cache-Control: no-store.

## CSRF e logout

CSRF é induzir o navegador autenticado a executar uma ação que a pessoa não pretendia. Cookies são enviados automaticamente; por isso SameSite sozinho não é uma defesa completa.
Para ações autenticadas com alteração de estado, use o token sincronizado aleatório vinculado à sessão. O frontend temporário:

```javascript
const response = await fetch('/api/csrf', { cache: 'no-store' });
const { csrfToken } = await response.json();
await fetch('/logout', {
  method: 'POST',
  headers: { 'X-CSRF-Token': csrfToken }
});
```

O token fica apenas na memória durante a ação, não em localStorage ou URL. O backend exige 64 caracteres hexadecimais e compara com timingSafeEqual. Token ausente, inválido ou de outra sessão é recusado.
Origin, quando presente, precisa ser igual a APP_ORIGIN; Sec-Fetch-Site=cross-site é recusado. Não se habilitou CORS.
O login também verifica origem e aceita o contrato JSON não simples do formulário, impedindo submissão por formulário externo comum. Clientes não navegador podem omitir Origin, mas continuam sujeitos à senha e limites; ações autenticadas ainda exigem token CSRF.

POST /logout destrói a sessão persistida e só depois limpa o cookie com nome/path/atributos correspondentes. Se falhar a exclusão, responde 503 e não declara sucesso. Reapresentar o cookie anterior após logout bem-sucedido retorna 401.
Solicitações concorrentes de leitura não recriam o ID após logout, pois não regravam a sessão.

Qualquer nova ação autenticada de estado deverá aplicar authenticate, checkOrigin e csrf antes de executar a operação. Isso precisa fazer parte da revisão de cada rota futura.

## Endpoints e respostas

| Rota | Resultado |
| --- | --- |
| POST /login | 200 com success e redirect; 400 inválido; 401 falha genérica; 403 origem; 413 corpo; 429 limite; 503 indisponibilidade; 500 inesperado |
| GET /api/me | 200 com quatro campos públicos; 401 sem autenticação; 503 persistência indisponível |
| GET /api/csrf | 200 com token sincronizado, somente autenticado |
| POST /logout | 200 após destruir sessão; 401 sem sessão; 403 CSRF/origem; 503 falha de exclusão |
| GET /area e /area.js | recursos temporários protegidos por sessão |
| POST /api/cadastro | mantém cadastro da fase 1.4, sem sessão automática |
| POST /api/forgot-password e /api/senha-nova | permanecem 501 |

Páginas públicas e health não inicializam o armazenamento de sessões. Sem banco ou segredo, continuam disponíveis. Sem cookie, /api/me retorna 401 mesmo sem configuração de banco; login com dados válidos exige configuração e retorna 503 quando indisponível.

## Limites e riscos antes de publicação

express-rate-limit limita login a 20 tentativas por IP e dez por e-mail normalizado em 15 minutos, contando também sucessos. A chave por e-mail é HMAC com chave efêmera, evitando guardar o identificador em claro no limitador. Esse HMAC não é usado para senha.
Não há bloqueio permanente da conta. Um atacante ainda pode consumir a cota temporária de outra pessoa; IPs compartilhados também compartilham limites. A contagem em memória é perdida no reinício e não é compartilhada entre instâncias. Antes de publicação, revisar store compartilhado e política de abuso, inclusive disponibilidade.

Continuam pendentes: comprovação de propriedade do e-mail, política de domínios acadêmicos e homologação visual. O 409 de cadastro mantém risco de enumeração documentado na fase 1.4. Não abrir cadastro para estudantes reais.
O sistema continua local. A configuração existente de pool recusa produção; nenhum suporte operacional de produção foi declarado.
Segredos, cookies, tokens, senhas e hashes não são registrados pelos handlers. Não habilitar logs de headers/corpos ou DEBUG de componentes de sessão ao coletar evidências.

## Testes automatizados

Antes da implementação: 55 testes aprovados novamente com PostgreSQL isolado.
Após correções: 80 aprovados, zero falhas, cancelamentos ou ignorados em Node 20.20.0 e PostgreSQL 17.10, porta temporária 55439. Um teste específico confirma que a regeneração não remove Secure em uma requisição identificada como HTTPS, mesmo com configuração local HTTP.
Uma execução intermediária teve 76 aprovados e uma falha no tratamento de leitura de sessão (cabeçalhos duplicados). A correção removeu a destruição implícita de sessão ausente; logout/invalidação continuam explícitos. Foram acrescentados casos de falha ao salvar e destruir, e a suíte final passou.

O cliente de teste usa fetch e conserva o cookie entre requisições, sem imprimi-lo. A suíte verifica criação, regeneração, persistência entre aplicações com mesmo segredo, expiração, ID invalidado, adulteração, CSRF, logout, perfil atual e desativação.
As falhas específicas de store são injetadas em wrappers sobre o pool; os testes anteriores também exercitam conexão TCP recusada real.
Fixtures são criadas via cadastro HTTP e removidas apenas por seus e-mails aleatórios exclusivos. As sessões de terceiros não são apagadas.
Sem TEST_DATABASE=alexandria_test, os 18 testes de integração desta fase são explicitamente ignorados; configurar DB_ENV=test e PGDATABASE=alexandria_test é obrigatório.

Os testes anteriores foram preservados: somente /login saiu da lista de 501, o manifesto de migrations passou a incluir 003 e as contagens usam a quantidade real de arquivos. Checksums antigos e os 13 originais não foram alterados.

## Homologação e teste manual no Edge

Tentativa real após a suíte: abertura de http://localhost:3315/login pelo controle de navegador falhou com browser access host is unavailable. Não foram repetidas tentativas indefinidas, solicitadas permissões permanentes ou alteradas configurações Windows.
Homologação visual de login válido/inválido, navegação e logout: NÃO EXECUTADA.

Para concluir manualmente:

1. Configure exclusivamente alexandria_test com dados fictícios, segredo próprio efêmero e APP_ORIGIN igual à URL local. Aplique migrations e execute npm start.
2. No Edge, abra /cadastro e crie uma conta fictícia com frase-senha de 15–128 caracteres. Não use senha ou e-mail reais.
3. Abra /login e tente uma senha errada: deve haver mensagem genérica e nenhum acesso à área.
4. Use a senha correta: deve abrir /area e exibir identidade/perfil fictícios. /api/me deve mostrar somente quatro campos.
5. Clique Sair: deve voltar ao login. Reabrir /area ou /api/me deve retornar 401.
6. Confira apenas os atributos HttpOnly e SameSite do cookie, sem copiar ou compartilhar seu valor.

Secure foi testado na configuração apropriada e pela ausência de cookie em HTTP mesmo com X-Forwarded-Proto forjado. Um ciclo real em HTTPS: NÃO VERIFICADO.
Somente Node 20.20.0 foi encontrado no PATH e utilizado. Node 24 LTS continua recomendado, sem instalação global automática. Execução em Node 24: NÃO VERIFICADA. Depois de atualizar por decisão própria, execute npm ci e repita a suíte completa antes de declarar compatibilidade homologada.

## Referências

- express-session: https://github.com/expressjs/session
- connect-pg-simple: https://github.com/voxpelli/node-connect-pg-simple
- CSRF: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- Node e suporte: https://nodejs.org/en/about/previous-releases
