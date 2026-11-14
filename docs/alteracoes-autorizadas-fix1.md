# Alterações autorizadas — fase 1.5H FIX.1

Data: 14/11/2026. Autorização: solicitação específica do responsável para corrigir cadastro.html, cadastro.js e somente a mensagem de sucesso do controller. Não foram implementadas novas funcionalidades.

## Alterações aplicadas

- login/cadastro.html: placeholder de 15–128 caracteres e minlength=15.
- login/cadastro.js: faixa 15–128 contada por pontos de código Unicode e mensagem de falha de conexão sem referência ao Flask.
- backend/controllers/cadastro.controller.js: somente a mensagem passou a ser Cadastro realizado. Você já pode entrar com seu e-mail e senha.

O contrato JSON, HTTP 201, fluxos e regras do backend não mudaram. Senha continua sem trim; CSS, estrutura visual e outros formulários não foram alterados.
Não há maxlength HTML: ele contaria unidades UTF-16 e poderia rejeitar senhas válidas antes da validação Unicode. O JavaScript e a API contam pontos de código com spread; uma marca combinante conta separadamente, não como um único grafema visual.

Diff exato dos três arquivos: [fix1-alteracoes.patch](fix1-alteracoes.patch). Os bytes de fim de linha existentes foram preservados por substituições pontuais, sem reformatar os arquivos inteiros.

## Histórico SHA-256 preservado

O arquivo tests/login-original.sha256.json não foi regravado. Seu próprio SHA-256, verificado antes e depois, é:

```text
d492189c20b5fef30813a5af5017d078b57a30f26c7edcad3c43fba939693b38
```

As duas únicas mudanças autorizadas em originais estão registradas separadamente em tests/login-authorized-fix1.sha256.json:

| Arquivo | Momento | SHA-256 |
| --- | --- | --- |
| login/cadastro.html | Antes, igual ao manifesto original | 712bb4b24de9ff45d8be8e28140c9c8de0adbdc399fa75b40df3f7f3bd6d9bbf |
| login/cadastro.html | Depois da FIX.1 | a8c69641a12ca7a25dd86263280648193724e1f1e560e7e394b5065dffbaeb8f |
| login/cadastro.js | Antes, igual ao manifesto original | e38db09a2920d10e3d6dff8a1026513a2470c8d9e78a6661a99b7727e429f1b8 |
| login/cadastro.js | Depois da FIX.1 | 1152ffd6e0bb583ee939442c53149db2c21b6126a7720b0daccafee9dba80ace |

tests/server.test.js continua exigindo exatamente os 13 nomes da base histórica. Os 11 não alterados são comparados com os hashes originais. Outro teste exige o hash fixo do manifesto histórico, somente cadastro.html/cadastro.js no registro de autorização, hash anterior igual à base e hash atual igual ao posterior autorizado.
Uma edição adicional nesses arquivos não é aceita por esse registro; exige nova autorização e registro separado. Não se deve reescrever a história para ocultar mudanças.

As migrations foram conferidas antes e depois e continuam com os mesmos hashes:

```text
001_create_usuarios.sql  d9731c726482e73d9b0cfeebb063f399041a9557ccc00e6f29eef724af807b75
002_create_alunos.sql    a23a93fdb3baa501c28f4da2afe0da93a0fe17bb54cd33e35b6f004aabbc798d
003_create_sessoes.sql   34c5ad55658bb7f1336d8f3aedceba5a9746d0651c7c5fd579bdbd06b9fa54d7
```

## Testes reais

Antes: 80 testes existentes aprovados, nenhum falho ou ignorado.
Depois: 98 aprovados, zero falhas, zero cancelamentos e zero ignorados.
Ambiente executado: Node 20.20.0 e PostgreSQL 17.10, em cluster temporário separado, loopback 55439, banco alexandria_test. Nenhum banco de desenvolvimento/produção ou dado real foi alterado.

O conjunto anterior foi preservado, adaptando somente a verificação histórica aos dois arquivos autorizados. Foram acrescentadas 18 verificações:

- 11 casos executando o JavaScript real do formulário em VM com DOM mínimo, comparados ao validator do backend: 14/15/128/129 ASCII, 14/15/128/129 caracteres fora do plano básico, espaços e marcas combinantes.
- orientação do input HTML sem maxlength incompatível;
- mensagem neutra em falha de conexão e restauração do botão;
- duas rejeições HTTP de senhas Unicode fora dos limites;
- dois cadastros HTTP/PostgreSQL nos limites de 15 e 128 pontos, com verificação Argon2id;
- registro exclusivo das duas mudanças autorizadas e preservação do manifesto histórico.

O cadastro HTTP existente também passou a exigir exatamente a mensagem de sucesso correta. Os testes anteriores de login, persistência, expiração, CSRF e logout foram executados novamente.
VM não é navegador real: esses testes demonstram comportamento do handler e contrato, não fidelidade visual ou comportamento completo do HTML no Edge.

Para repetir a suíte, use a configuração de banco isolado de [homologacao-local.md](homologacao-local.md) e execute npm test. Sem banco explicitamente configurado, 39 testes de integração são ignorados; isso não equivale ao resultado completo acima.

## Node 24 e dependências

Node 20.20.0 continua no PATH. Node 24 não foi encontrado no PATH nem nos diretórios usuais inspecionados de nvm, fnm e Volta; uma instalação portátil em outro local permanece NÃO VERIFICADA. Não foi instalado ou alterado Node global.
Dependências e package-lock.json foram mantidos.

Procedimento para o responsável, sem execução automática nesta fase:

1. Obter a versão 24 LTS no site oficial https://nodejs.org/en/download, selecionando explicitamente a linha 24, Windows e a arquitetura correta. Não assumir que o botão LTS atual seleciona a linha 24.
2. Instalar/selecionar por decisão própria; abrir novo PowerShell na raiz e conferir node --version.
3. Executar npm ci com o lock existente, configurar exclusivamente alexandria_test e repetir npm test.
4. Se argon2 falhar, registrar versão/arquitetura e diagnóstico antes de modificar dependências. Não contornar com hash inseguro.

Compatibilidade de execução em Node 24: NÃO HOMOLOGADA.

## Conferência manual no Edge

Não foi repetida uma tentativa de controle já indisponível. Homologação visual permanece pendente.
Use somente dados fictícios e o servidor/banco de teste descritos em homologacao-local.md:

1. Abrir /cadastro; confirmar orientação De 15 a 128 caracteres e ausência de mudanças de estilo.
2. Tentar 14 caracteres: o navegador/JavaScript deve impedir o envio.
3. Cadastrar com 15 caracteres, depois com 128 pontos de código em outra conta fictícia: o cadastro deve funcionar e mostrar a nova mensagem.
4. Para Unicode, testar 15 e 128 emojis em contas fictícias distintas; 14 e 129 devem ser rejeitados. Não usar senha real.
5. Repetir com espaços nas extremidades e conferir que o login exige a mesma senha, sem removê-los.
6. Entrar, conferir /area e /api/me, clicar Sair e verificar bloqueio posterior. Recuperação continua 501.
7. Ao registrar evidências, guardar apenas status, descrição do resultado e imagens sem informações sensíveis; não capturar senha, cookie, token ou HAR.

## Arquivos desta etapa

Modificados: login/cadastro.html, login/cadastro.js, backend/controllers/cadastro.controller.js, tests/server.test.js, tests/cadastro.test.js e documentação relacionada.
Criados: tests/cadastro-frontend.test.js, tests/login-authorized-fix1.sha256.json, docs/fix1-alteracoes.patch e este registro.
Nenhuma migration, CSS, outro formulário, dependência ou manifesto histórico foi alterado.

## Remanescentes e prontidão para 2.0A

As três correções solicitadas estão aplicadas e testadas. Permanecem pendentes Node 24 e conferência visual no Edge. Recuperação continua não implementada e seus formulários mantêm regras antigas, fora desta autorização.
Antes de publicação continuam necessárias verificação de propriedade do e-mail, revisão de enumeração/limites em memória, HTTPS e configuração operacional.

A base está apta a uma futura auditoria/importação isolada e autorizada do frontend; não está declarada homologada visualmente nem pronta para produção. Recomenda-se concluir Node 24/Edge antes de acoplar interfaces. Fase 2.0A não foi iniciada; não houve extração do Figma, push ou deploy.
