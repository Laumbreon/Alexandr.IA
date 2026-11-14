# Entrega acadêmica MVP — preparação GitHub

Validação real: 14/11/2026. Prazo acadêmico informado: 15/11/2026. Escopo local; sem remoto, push ou deploy.

## Resultado
MVP local utilizável para cadastro → login → painel por perfil → logout, com PostgreSQL e build React.
156 testes aprovados, zero falhas/cancelados/ignorados, no workspace e em instalação limpa independente. Base original da sprint: 153 aprovados.
TypeScript e build passaram nos dois ambientes. O build limpo final produziu os mesmos assets do workspace (index-CDuqSPUy.css e index-Dv0XTBVs.js).
Node 24.22.3, npm 11.19.1, PostgreSQL 17.10, pnpm 10.34.3; demais versões no README.

## Correção funcional mínima
Os testes existentes comprovaram entrega autenticada do painel, bloqueio sem sessão/expiração/conta inativa, perfis, /api/me e CSRF/logout. Depois dessa base aprovada, alterou-se apenas o valor de redirect no controller:
```diff
- return res.status(200).json({ success: true, redirect: '/area' });
+ return res.status(200).json({ success: true, redirect: '/painel/' });
```
Status 200, chaves success/redirect, sessão e regras de negócio preservados. /area e /area.js continuam protegidos e funcionando.
Diff aplicado: [mvp-redirect.patch](mvp-redirect.patch). Nenhum arquivo login/ foi alterado nesta sprint.

Três novos testes percorrem cadastro sem sessão, tentativa de login incorreta, login correto, destino retornado, identidade/perfil, /area de compatibilidade, recusa de logout sem CSRF, logout válido e bloqueio com cookie antigo.
As contas de bibliotecário/administrador são fixtures promovidas apenas dentro de alexandria_test; não existe promoção pública ou conta administrativa criada para uso real.
Os testes React existentes verificam apresentação separada para aluno/bibliotecário/administrador e bloqueio de perfil desconhecido. Isso não é homologação visual de navegador.

## Auditoria rápida
| Prioridade | Achado | Resultado |
| --- | --- | --- |
| Alta | README misturava login indisponível, Node 20 e estados históricos | Reescrito como guia atual; históricos referenciados separadamente |
| Alta | Login exigia abrir painel manualmente | Redirect mínimo corrigido e testado |
| Alta | Clone com conversão CRLF/LF poderia quebrar hashes históricos | .gitattributes raiz * -text preserva bytes |
| Alta | ZIPs recebidos e temporários poderiam entrar no primeiro commit | Ignore explícito e seleção revisada |
| Média | Suíte sem banco pode ignorar integrações; build é pré-requisito | README exige banco separado/build e distingue skips de aprovação |
| Média | Frontend ainda é demonstração de biblioteca | Aviso global, ações simuladas/desabilitadas e limites documentados |
| Média | Sem evidência visual no Edge/Narrador | Pendente; roteiro B.3 preservado |
| Baixa | Configurações Figma e LFS amplas importadas | Preservadas como procedência, auditadas, sem execução de deploy |

Não foram observados novos defeitos de frontend que justificassem editar o design nesta sprint. As seis seções continuam com dados fictícios; texto “cadastrados” nas contagens pertence à demonstração globalmente identificada, sem promessa de persistência.
Preferências locais funcionam, mas privacidade/LGPD, avisos, empréstimos, catálogo e relatórios não foram implementados no servidor.

## Instalação limpa e ocorrências reais
Copiou-se somente código/documentação para pasta vazia, sem .env, dependências ou dist. npm ci e pnpm install --frozen-lockfile --ignore-scripts passaram sem alteração dos lockfiles; cache existente foi reutilizado para downloads, sem reaproveitar node_modules.
TypeScript/build e os 156 testes passaram na cópia final fora de OneDrive. Argon2 real foi exercitado pela suíte.

Durante a preparação, uma cópia dentro da árvore do workspace fez node --test descobrir as suites duas vezes (309 testes); essa execução não foi usada como resultado final. Mover a cópia pnpm quebrou seus links Windows, e colocá-la dentro de node_modules afetou a descoberta de fontes do Tailwind. A validação definitiva foi refeita numa nova pasta temporária normal, sem aproveitar esses links.
O npm avisou que argon2 possui script de instalação ainda sem aprovação na política local do npm; o binário disponível foi carregado e testado. Não se desativou segurança ou substituiu Argon2.
Nenhum teste foi dispensado para obter aprovação.

## Ambiente isolado
PostgreSQL temporário próprio, 17.10, loopback porta 55439, banco alexandria_test. Não foram alterados bancos de desenvolvimento/produção nem serviços PostgreSQL existentes.
As suites aplicaram as três migrations no destino de teste explícito, criaram e removeram fixtures. Cluster temporário encerrado após validação.
Segredos de sessão/senhas de fixtures foram gerados em memória e não incluídos em evidências.

## Arquivos desta sprint
Alterados:
- backend/controllers/login.controller.js: valor do redirect.
- tests/autenticacao.test.js e tests/react-auth.test.js: expectativa do redirect.
- tests/painel.test.js: expectativa e três fluxos completos.
- README.md: guia acadêmico atual.
- .gitignore: ZIPs e configurações locais.
- docs/autenticacao.md e docs/integracao-frontend.md: aviso de atualização atual sem reescrever o histórico.

Criados:
- .gitattributes: preservação de bytes.
- docs/mvp-redirect.patch: diff mínimo.
- docs/entrega-mvp.md: este relatório.
- docs/inventario-github.md: inventário final selecionado.

Frontend, lockfiles, migrations, os 13 arquivos login e manifestos históricos preservados. A .git local foi inicializada em main; nenhum remoto foi adicionado. Primeiro commit apenas preparado no index, sem execução do commit.

## Segurança de publicação
Arquivos selecionados foram examinados por inventário, extensões, filtros Git e busca de padrões de credenciais/tokens/chaves/URLs com senha. Nenhum segredo foi identificado; exemplos de ambiente ficam vazios, e os contatos de demonstração são fictícios. Esse exame não é garantia matemática ou substituto de revisão humana/secret scanning.
Não há .env real no inventário, nem node_modules, dist, banco, dump, log, cookie, token, cache, ZIP ou chave privada.
Configuração pessoal Git não foi copiada para documentos. Não foi criado commit que exponha automaticamente nome/e-mail do autor; revisar identidade Git antes de commit público.

O frontend contém scripts Figma de deploy/install como material importado com hashes históricos. Nenhum foi executado. Instalação reproduzível usa os comandos do README, não .figma/make/install (que não exige lock congelado).
frontend/.gitattributes tem regras LFS amplas; nenhum arquivo selecionado corresponde atualmente a filtro LFS. Bancos/ZIPs continuam excluídos mesmo que LFS suporte esses tipos.

## Pendências antes/depois de apresentar
1. Antes de publicar: revisar inventário, créditos autorizados do grupo, licença/procedência do código e identidade de autor Git. Não há nomes de participantes identificados de forma confiável nos documentos recebidos.
2. Para apresentação: conferir manualmente no Edge o fluxo/visual, zoom, teclado e Narrador. Não afirmar que isso foi homologado por jsdom.
3. Para demonstrar vistas internas, preparar contas fictícias de perfil por responsável autorizado; o cadastro padrão cria apenas aluno.
4. Funcionalidades de biblioteca, recuperação e notificações continuam futuras.
5. Hospedagem real, HTTPS de produção, gestão de segredos e requisitos de dados reais exigem revisão própria. Este MVP só aceita banco local e não foi liberado para produção.

Aguardar revisão/autorização antes de executar os comandos remotos de publicação descritos no README.

## Conferencia final do index

92 arquivos selecionados; nenhum remoto configurado e nenhum commit criado. Os bytes dos 92 blobs staged coincidem com o workspace. Nenhum arquivo proibido, padrao de credencial/chave/token ou filtro LFS foi identificado no conjunto selecionado.
O diff --check padrao interpreta CRLF preservado como whitespace; reconhecendo CR de fim de linha (git -c core.whitespace=cr-at-eol diff --cached --check), restam tres avisos historicos em docs/fix1-alteracoes.patch, frontend/src/App.tsx e login/recuperar.js. Foram mantidos para preservar historico e hashes. Nao sao falhas funcionais e nao foram ocultados como check aprovado.
