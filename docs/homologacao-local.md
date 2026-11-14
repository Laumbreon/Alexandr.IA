# Homologação local — fase 1.5H

Registro histórico anterior às correções. As três correções foram autorizadas e aplicadas na fase 1.5H FIX.1; resultados atuais, diffs e hashes em [alteracoes-autorizadas-fix1.md](alteracoes-autorizadas-fix1.md). Os diffs e pendências descritos abaixo representam a situação desta auditoria, antes da FIX.1.

Data: 14/11/2026. Escopo: verificar e consolidar o módulo existente. Não houve importação do Figma, implementação de recuperação ou novas funcionalidades. A solicitação explícita de fase 1.5H prevaleceu sobre o anexo de fase 2.0A; o ZIP externo do Figma não foi aberto ou extraído.

## Resultado e evidências

| Verificação | Resultado real |
| --- | --- |
| Suíte node:test existente | 80 aprovados, 0 falhos, 0 ignorados, 0 cancelados |
| Roteiro HTTP adicional com cookie preservado | 14 verificações de status concluídas |
| Mensagem desatualizada de cadastro | Confirmada por leitura e por resposta HTTP adicional |
| Originais do grupo | 13 arquivos preservados por SHA-256; manifesto não alterado |
| Migrations | 001, 002 e 003 encontradas e registradas no histórico do banco de teste |
| Navegador | NÃO EXECUTADO; única tentativa retornou browser access host is unavailable |
| Node 24 | Não encontrado nos locais inspecionados; execução NÃO VERIFICADA |
| HTTPS real | NÃO VERIFICADO; configuração e comportamento Secure cobertos pela suíte |

Não se somam as verificações do roteiro HTTP aos 80 testes node:test: são evidências complementares de naturezas diferentes.

O roteiro HTTP usou e-mail e senha aleatórios fictícios, sem imprimir senha, hash, cookie ou token. Consultou e removeu somente suas próprias fixtures. A primeira comparação automática de mensagem foi afetada pela codificação do pipe PowerShell; uma comparação ASCII posterior confirmou a mensagem desatualizada. Os códigos HTTP do roteiro não foram afetados.

## Ambiente encontrado

| Componente | Versão observada |
| --- | --- |
| Node no PATH | 20.20.0, Windows x64 |
| npm | 10.8.2 |
| PostgreSQL de teste, consultado no servidor | 17.10 |
| psql no PATH | 17.10 |
| Git | 2.52.0.windows.1 |
| Express | 5.3.0 |
| pg | 8.23.1 |
| argon2 | 0.44.0 |
| express-session | 1.19.0 |
| connect-pg-simple | 10.0.0 |
| express-rate-limit | 8.7.4 |

As versões de dependências foram confirmadas por npm ls --depth=0. Nenhuma dependência foi instalada ou atualizada nesta fase.
Há serviços PostgreSQL 17 e 18 em execução, mas nenhum banco desses serviços foi utilizado. A versão 18 não foi homologada.

Node 24 não foi encontrado no PATH, nas variáveis de configuração de nvm/fnm/Volta ou nos diretórios usuais inspecionados desses gerenciadores. Isso não é uma varredura de todos os discos; uma instalação portátil fora desses locais permanece NÃO VERIFICADA.
O alvo recomendado é Node 24 LTS; Node 20 está fora de suporte. Compatibilidade declarada nas dependências não equivale a execução homologada.
Após instalar/selecionar Node 24 por decisão do responsável, confirmar node --version, executar npm ci e repetir a suíte com banco isolado. Não instalar ou trocar dependências apenas por novidade.

## Banco de testes e execução

Nesta auditoria foi reutilizado exclusivamente o cluster temporário das fases anteriores em:

```text
%TEMP%/alexandria-pg-d60952e28642466592847e8074b1f6ce
```

Host 127.0.0.1, porta 55439, banco alexandria_test, usuário fictício alexandr_test. O cluster usa trust somente no ambiente temporário local; isso não é recomendação para ambiente compartilhado. Nenhum segredo de desenvolvimento foi consultado. O diretório de dados temporário fica fora do workspace e não é candidato a versionamento.

Para repetir a suíte com seu banco de teste separado e configurado, na raiz:

```powershell
node --version
npm --version
# npm ci somente se for necessário preparar as dependências localmente.
$env:NODE_ENV = 'test'
$env:DB_ENV = 'test'
$env:PGHOST = '127.0.0.1'
$env:PGPORT = '5432' # ajuste para o seu servidor isolado
$env:PGDATABASE = 'alexandria_test'
$env:PGUSER = 'alexandria_app' # usuário local próprio, previamente configurado
$env:TEST_DATABASE = 'alexandria_test'
# PGPASSWORD, se necessária, deve ficar no .env ignorado ou em mecanismo local seguro.
npm run db:check
npm run db:migrate
npm test
```

Não execute esse roteiro em banco com dados de desenvolvimento ou de terceiros. Os controles atuais exigem nome de banco local e ambiente explícitos, mas o nome sozinho não comprova isolamento.
Os testes criam fixtures, revertem transações ou removem apenas registros identificados como próprios. Sequências podem avançar após rollback. Sem TEST_DATABASE, 37 testes de integração são ignorados; isso não representa aprovação completa.

Para abrir o servidor de homologação no mesmo ambiente de teste:

```powershell
$env:PORT = '3316'
$env:APP_ORIGIN = 'http://localhost:3316'
$env:SESSION_COOKIE_SECURE = 'false'
$qaSecretBytes = New-Object byte[] 48
$qaRandom = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$qaRandom.GetBytes($qaSecretBytes)
$env:SESSION_SECRET = [Convert]::ToBase64String($qaSecretBytes)
$qaRandom.Dispose()
npm start
```

O segredo acima é aleatório, efêmero e não é impresso. Ao encerrar esse shell, não estará em outros shells; o servidor local lê a variável enquanto executa. Para uso persistente de desenvolvimento, siga o README e mantenha .env fora do versionamento.
Use http://localhost:3316. Se preferir 127.0.0.1, atualize APP_ORIGIN para esse host. Cookies são vinculados ao host; não alterne hosts no meio do fluxo.
Para encerrar, Ctrl+C. Nesta auditoria o servidor HTTP de QA usou somente loopback; não houve publicação.

## Revisão funcional e contratos

| Fluxo do roteiro adicional | HTTP observado |
| --- | --- |
| Cadastro inválido | 400 |
| Cadastro válido, sem sessão automática | 201 |
| Login inválido | 401 |
| Login válido, redirect igual a /area | 200 |
| GET /area com cookie válido | 200 |
| GET /api/me, somente quatro campos públicos | 200 |
| GET /api/csrf autenticado | 200 |
| POST /logout sem CSRF | 403 |
| POST /logout com CSRF | 200 |
| GET /api/me reapresentando cookie anterior | 401 |
| GET /area após logout | 401 |
| Login após desativar apenas a própria fixture | 401 |
| POST /api/forgot-password | 501 |
| POST /api/senha-nova | 501 |

cadastro.js envia { nome, email, password }, lê message e redireciona para /login no sucesso. A API aceita esse contrato, sem exigir RA ou curso.
login.js envia { email, password }, lê success e redirect. O backend retorna /area, que existe e é protegida. O roteiro HTTP confirmou destino e acesso; isso não comprova que o JavaScript navegou em um navegador real.
/area usa textContent para exibir identidade, busca /api/csrf antes de sair e envia X-CSRF-Token. Nenhum token ou ID de sessão vai para localStorage.

## Problemas encontrados e correções propostas

### 1. Senha mínima divergente — aprovação específica necessária

cadastro.html informa e aplica mínimo de oito; cadastro.js também verifica oito. O validator da API exige 15–128 pontos de código Unicode. Isso causa frustração, embora o servidor rejeite entradas fracas corretamente.

Diff proposto, NÃO APLICADO:

```diff
--- a/login/cadastro.html
+++ b/login/cadastro.html
@@
-                    <input type="password" id="password" placeholder="Mínimo de 8 caracteres" autocomplete="new-password" minlength="8" required>
+                    <input type="password" id="password" placeholder="De 15 a 128 caracteres" autocomplete="new-password" minlength="15" required>
--- a/login/cadastro.js
+++ b/login/cadastro.js
@@
-        if (password.length < 8) {
-            alert('A senha deve ter no mínimo 8 caracteres.');
+        const passwordLength = [...password].length;
+        if (passwordLength < 15 || passwordLength > 128) {
+            alert('A senha deve ter de 15 a 128 caracteres; espaços são permitidos.');
             return;
         }
```

A contagem por spread coincide com a API para pontos de código Unicode. Não se propõe maxlength=128 no HTML, porque ele conta unidades UTF-16 e poderia rejeitar antes do necessário senhas com caracteres fora do plano básico.
Não há mudança de CSS, layout ou identidade da Fatec. Isso não pode ser corrigido apenas pelo backend sem deixar a orientação original falsa. A aplicação do diff exige autorização específica para esses dois originais.
O manifesto SHA-256 histórico deve ser mantido como registro. Após uma alteração autorizada, documentar o diff e os hashes novos separadamente e adaptar a verificação para distinguir base histórica de mudanças aprovadas; não sobrescrever a evidência original.

### 2. Mensagem de sucesso obsoleta no backend

cadastro.controller.js ainda responde: Cadastro realizado. O login ainda não está disponível nesta etapa.
O login já funciona. Os testes atuais confirmam sucesso, mas não avaliam a atualidade desse texto. Leitura e resposta HTTP confirmaram o problema.

Correção mínima recomendada, NÃO APLICADA nesta revisão:

```diff
--- a/backend/controllers/cadastro.controller.js
+++ b/backend/controllers/cadastro.controller.js
@@
-        message: 'Cadastro realizado. O login ainda não está disponível nesta etapa.',
+        message: 'Cadastro realizado. Você já pode entrar com seu e-mail e senha.',
```

### 3. Inconsistências secundárias

- cadastro.js menciona Flask quando a conexão falha, apesar de o servidor ser Node/Express. Ajustar o texto em mudança autorizada do original.
- senha-nova.html e senha-nova.js ainda usam mínimo oito; senha-nova.js aplica trim à senha. Não devem ser reutilizados sem revisão na futura recuperação. Endpoints continuam 501; nenhuma recuperação foi implementada.
- Recuperação e redefinição substituem respostas não 2xx por erro genérico, ocultando a mensagem específica de 501.
- Há relatos históricos em README/docs/cadastro com pendências já resolvidas na fase 1.5. O relatório de fase 1.5H é a referência do estado auditado.
- Acesso direto a /area sem sessão retorna 401 JSON; não redireciona automaticamente para a tela de login. Esse é o comportamento atual, não uma falha de bloqueio.
- Depois de a sessão expirar, Sair pode exibir erro genérico se a consulta de CSRF retornar 401. O acesso continua bloqueado, mas a orientação pode melhorar em revisão futura.
- APP_ORIGIN precisa coincidir exatamente com host e porta; trocar localhost por 127.0.0.1 sem ajustar pode provocar 403. Isso é configuração, não senha incorreta.

## Revisão de segurança

| Item | Evidência e limite |
| --- | --- |
| Cookies | HttpOnly, SameSite=Lax, nome próprio e Path=/ confirmados; Secure condicionado a HTTPS e configuração local explícita |
| Prazo | 30 minutos absolutos, verificados no servidor e no store; expiração testada |
| Fixação de sessão | ID e CSRF regenerados no login; ID antigo rejeitado |
| Logout | Exclusão persistente antes de declarar sucesso; cookie antigo rejeitado |
| CSRF | Token sincronizado obrigatório no logout, comparação segura e validação de origem; SameSite não é a única defesa |
| Usuário ativo/perfil | Consulta PostgreSQL em cada acesso; desativação e perfil atual testados |
| Senhas | Argon2id verificado; sem senha/hash em sessão ou resposta |
| SQL | Valores parametrizados; perfil público fixo aluno |
| Administradores | Nenhuma criação automática em migrations ou startup; rota de perfil restrito existe apenas na instância dos testes |
| Logs | Handlers inspecionados não imprimem senha, hash, cookie, CSRF ou SESSION_SECRET; roteiro de QA não imprimiu esses valores |
| Destino de testes | Cluster separado, loopback 55439, banco explicitamente alexandria_test |

Não houve teste invasivo externo. Logs de bibliotecas com DEBUG ativado, dumps manuais ou capturas externas não foram homologados; não registrar headers/corpos de autenticação ao coletar evidências.
A verificação de segredo exige pelo menos 32 bytes, mas não comprova entropia. Gerar com CSPRNG, como no roteiro, continua obrigatório.

## Preparação para GitHub

Não existe .git no workspace e não foi inicializado Git. Portanto, não há histórico local para auditar nem evidência de credenciais já versionadas; histórico remoto: NÃO VERIFICADO.
.env também não existe no workspace inspecionado. Foram pesquisados, em 44 arquivos textuais do projeto, padrões de chaves privadas, URL PostgreSQL com senha e tokens comuns: nenhum indicador encontrado. A análise é heurística e não garante ausência de todos os segredos possíveis.
login.zip possui 14 entradas e não apresentou nomes de arquivos sensíveis pesquisados; seu conteúdo binário não foi submetido a uma auditoria universal de segredos. O ZIP externo do Figma não foi inspecionado.

.gitignore já excluía .env, .env.*, node_modules, .npm-cache, logs e coverage. Foi ampliado para:

- diretórios pgdata, database/local, tmp e temp;
- dumps/backups, bancos SQLite/DB e temporários;
- chaves/certificados privados e exportações típicas de credenciais;
- arquivos HAR e exportações típicas de cookies/tokens.

Não se ignoram migrations .sql, package-lock.json, .env.example ou documentação. Tokens podem aparecer em qualquer nome de arquivo: não basta confiar nos padrões de nomes. Não gerar capturas sensíveis ou dumps dentro da árvore a ser publicada.
Revisão dos padrões foi estática: git check-ignore e inspeção de staging ficam para quando houver um repositório autorizado. .gitignore não remove arquivos previamente versionados.

Antes do primeiro commit autorizado, conferir git status, git check-ignore dos destinos sensíveis e git diff --cached. Revisar ZIPs e todos os arquivos adicionados, sem copiar credenciais para o relatório.
Se surgirem segredos, removê-los dos candidatos ao commit e revogá-los antes de compartilhar. Não houve push, criação de repositório, mudança de visibilidade ou operação remota.

Estratégia simples para o grupo:

1. main representa a versão revisada e executável.
2. Cada tarefa usa uma branch curta, como fix/orientacao-senha ou docs/homologacao-local.
3. Pull request pequeno com problema, mudança, comandos de teste e resultado real.
4. Outro integrante revisa contratos, segurança e escopo antes do merge.
5. Repetir npm ci e npm test no Node 24 alvo com banco isolado; exigir verificação dos arquivos originais e migrations.

Veredito: base preparada para revisão colaborativa local, com publicação condicionada à revisão do staging e do runtime. Nenhuma prontidão irrestrita de produção é declarada.

## Checklist manual no Edge

Use apenas banco de teste e dados fictícios. Registre data, versão do navegador e resultado; não grave senhas, cookies ou CSRF em prints, HAR ou relatório.

- [ ] Abrir /cadastro: confirmar identidade visual e anotar aviso desatualizado de oito caracteres.
- [ ] Enviar senha de 8–14 caracteres: API deve rejeitar com 400, sem conta criada.
- [ ] Cadastrar e-mail fictício e frase-senha de 15–128 caracteres: 201 e retorno ao login. Anotar mensagem de sucesso ainda obsoleta.
- [ ] Tentar senha errada: mensagem genérica, sem acesso à área.
- [ ] Entrar com senha correta: navegar para /area e exibir identidade fictícia.
- [ ] Abrir /api/me: apenas id, nome, email e perfil.
- [ ] Abrir /api/csrf: sucesso autenticado; não copiar seu valor para evidências.
- [ ] Clicar Sair: voltar a /login.
- [ ] Reabrir /area e /api/me: 401 sem sessão.
- [ ] Confirmar apenas os atributos HttpOnly/SameSite do cookie e a adequação de Secure ao protocolo.
- [ ] Confirmar POSTs de recuperação com 501. Não interpretar telas de recuperação como funcionalidade concluída.

Conta inativa, CSRF inválido e expiração já foram exercitados automaticamente. Não desativar usuários reais manualmente para repetir o checklist.

## Riscos e próximo passo

Antes de publicação: homologar Node 24, concluir revisão visual, verificar propriedade do e-mail e revisar enumeração, limitadores em memória/múltiplas instâncias, HTTPS, segredos e permissões do banco. A configuração atual recusa produção e permanece local.

Próxima etapa recomendada: obter autorização específica para o diff dos dois originais, corrigir a mensagem do cadastro em uma mudança pequena e concluir a homologação Node 24/Edge. Depois disso, decidir separadamente sobre integração do Figma. Nenhuma dessas etapas foi iniciada.

## Referência de runtime

https://nodejs.org/en/about/previous-releases
