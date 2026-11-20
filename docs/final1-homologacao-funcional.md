# FINAL.1 — homologação funcional, estoque e circulação

Data: **19/11/2026**, America/Sao_Paulo. Sistema acadêmico local real; demo estática preservada em build separado.

## Resultado e prontidão

**Concluídos e validados por APIs/PostgreSQL:** dashboard agregado, contagem de estoque derivada, entrada de exemplares, empréstimo/devolução/fila/renovação, motivo/histórico de alteração de exemplar, ano e sinopse, ficha de leitor com circulação relacionada e navegação real para reservas/avisos. **210 testes aprovados, zero falhas/ignorados/cancelados**; TypeScript, dois builds, verificador demo, instalação congelada e consultas de segurança aprovados.

**GO COM RESSALVAS para demonstração acadêmica e publicação do código.** Não se declara 100% de homologação visual: a inspeção gráfica nas larguras/zoom/tecnologias assistivas não pôde ser executada. Backend continua **somente local**, sem autorização nem preparação de produção. Relatórios institucionais, permissões administrativas avançadas e canais externos continuam fora desta implementação.

O responsável **confirmou explicitamente nesta sessão a autorização do grupo para distribuir o código e os materiais incorporados, inclusive frontend importado**. Não foi criada licença ou crédito em nome dos colegas. A autorização não transforma a homologação visual pendente em aprovação visual.

## Inspeção e preservação

Estado inicial: workspace Alexandr.IA, `main`, HEAD e remoto consultado **7684805d3648151edcfe7b2628ae55f24d85fbfc**. Portanto o remoto já continha as correções AUDIT-FIX.1, diferentemente do estado da primeira preparação do commit. Único arquivo não rastreado inicial: o relatório conhecido `docs/visual-qa1-resultado.md`, preservado integralmente e incluído como documentação da preparação anterior. Nenhuma mudança desconhecida foi descartada.

Checkpoint inicial independente: **202 testes aprovados**, zero falhas/ignorados/cancelados, TypeScript e ambos os builds aprovados. Backend, contratos das 23 rotas, migrations 001–007 e fontes autenticadas/demo foram inspecionados antes da implementação.

VISUAL-QA original estava saudável em `http://localhost:3017/login`, PostgreSQL 55447. **Não foi migrado, limpo, reiniciado ou sobrescrito. Seu build anterior foi mantido.** Os builds novos foram gerados em cópia independente fora do OneDrive, sem substituir frontend/dist que o QA antigo serve. Isso evita que uma interface nova solicite endpoints ausentes no servidor antigo durante a sessão do responsável.

Os arquivos de login, autenticação/sessões/CSRF, migrations históricas e manifestos anteriores ficaram intactos. Mudanças backend restringem-se ao catálogo, montagem de duas rotas e novo módulo de estoque. O registro `final1-frontend.sha256.json` encadeia hashes antes/depois ao registro AUDIT-FIX.1, sem regravar os manifests históricos; os testes conferem a lista exata autorizada. O registro geral `final1-integridade.sha256.json` documenta o escopo e a preservação, excluindo a si mesmo.

## Banco: migration aditiva e histórico

Nova migration: **008_complete_catalogo_estoque.sql**. 001–007 não foram editadas.

- `biblioteca_livros.ano`: opcional, inteiro técnico de 1 a 9999.
- `biblioteca_livros.sinopse`: opcional, texto de até 4000 pontos de código, renderizado como texto React.
- `biblioteca_exemplar_eventos`: referência ao exemplar/operador, entrada ou alteração, estados/conservação anterior e novo, motivo e data. FKs RESTRICT e índice por exemplar/id; sem API de exclusão de histórico.

A migration não atribui dados fictícios a registros anteriores e não inventa eventos retroativos de entrada. Obras/exemplares existentes permanecem; ano/sinopse começam nulos, e eventos anteriores à introdução da rastreabilidade não aparecem como se tivessem sido registrados. Capas/uploads não foram adicionados: exigiriam política de arquivos, armazenamento/validação e direitos de uso. Não há botão de capa fictício.

Na cópia **populada** do VISUAL-QA, somente 008 foi aplicada. As cinco obras e sete exemplares anteriores foram comparados antes/depois, incluindo seus campos e versões, sem diferenças. Empréstimos, reservas, contas e demais relações foram mantidos pela cópia consistente. Nenhuma migration foi aplicada a banco habitual ou de produção. Uma instalação antiga precisa de aplicação explícita/autorizada de 008 antes de iniciar o backend novo; o servidor não migra automaticamente.

Entrada de exemplar e seu evento são uma transação. Alteração de estado/conservação exige **motivo** no PUT, registra o operador e usa versão/locks já existentes; empréstimo ativo impede alteração. As telas e testes consumidores foram adaptados ao novo campo obrigatório, preservando as asserções de conflito e autorização. Campo omitido em cliente legado recebe 400, em vez de produzir auditoria sem justificativa. Para livro, campos ano/sinopse omitidos por cliente antigo são preservados; campos explicitamente vazios/nulos permitem limpar esses metadados opcionais.

## Estoque: fórmulas e atualização

Novo **GET /api/biblioteca/resumo**, restrito à equipe, usa um único snapshot SQL. Não há contador editável nem soma de JOIN que multiplique exemplares. Retorna obras, total físico, disponíveis, emprestados, indisponíveis, manutenção, baixados, danificados, atrasados, reservas aguardando e leitores cadastrados/habilitados, com horário da consulta.

```text
Total físico = número de linhas em biblioteca_exemplares (inclui baixados preservados)
Emprestados = exemplares com empréstimo ativo
Disponíveis = sem empréstimo ativo, estado circulavel e conservação diferente de danificado
Indisponíveis = sem empréstimo ativo e impedidos por estado/conservação
Total físico = Disponíveis + Emprestados + Indisponíveis
```

Manutenção, baixados e danificados são detalhamentos que podem se sobrepor; **não devem ser somados novamente ao total**. Atrasados são empréstimos ativos com prazo anterior ao relógio do banco. Reservas pendentes são as aguardando. Leitor habilitado exige conta ativa e vínculo da biblioteca habilitado (ou padrão existente quando ainda não há vínculo operacional).

**Disponível é disponibilidade física, não promessa de retirada.** A API de circulação ainda valida fila prioritária, usuário/vínculo, limites, conservação e concorrência. Reserva por obra não aloca exemplar antecipadamente.

Entrada aumenta físico/disponível quando elegível. Retirada conserva físico, diminui disponível e aumenta emprestado. Devolução conserva histórico e devolve elegibilidade física; atendimento da fila só ocorre na nova retirada real. Baixa/manutenção preserva a linha física e retira elegibilidade sem apagar relações. A API retorna também a situação de empréstimo de cada exemplar, usada pela interface para explicar e desabilitar alteração durante empréstimo ativo.

Dashboard consulta ao entrar/retornar à seção e oferece Atualizar indicadores. Após operações, lista/detalhes do acervo refazem consultas; abrir novamente o dashboard ou atualizar consulta números atuais, sem reiniciar servidor. Não há polling, atualização em segundo plano ou promessa de sincronização instantânea entre computadores.

## Endpoints e permissões

Biblioteca passa de **23 para 25 rotas**:

- **GET /api/biblioteca/resumo** — bibliotecário/administrador, dados agregados sem lista de pessoas.
- **GET /api/biblioteca/exemplares/:id/historico** — equipe, paginação existente e eventos com operador/motivo; aluno recebe 403.

Rotas anteriores foram mantidas. POST/PUT livro aceitam ano/sinopse opcionais; PUT exemplar exige motivo. Cadastro público continua apenas aluno. Não houve novo mecanismo de autenticação, CORS liberado, endpoint de promoção de perfil ou conta administrativa padrão. CSRF, revalidação de perfil/usuário ativo e isolamento entre leitores permanecem no backend.

## Telas e interações concluídas

**Equipe:** Visão geral mostra estoque agregado; Acervo faz pesquisa/cadastro/edição e gestão física; Leitores permite ficha/circulação relacionada; Empréstimos mantém retirada/devolução/histórico e aba de reservas compatível; Reservas e Avisos têm atalhos próprios. Sino abre avisos reais, sem marcador artificial de pendência. Relatórios informa indisponibilidade. Configurações mantém quatro preferências visuais funcionais e não apresenta ferramentas institucionais falsas de LGPD, exportação, exclusão ou contato.

**Aluno:** Início com orientação honesta, Catálogo, Meu perfil, Meus empréstimos, Minhas reservas e Avisos. Não há controles internos de escrita. Cadastro/renovação/cancelamento só confirmam após resposta da API. Ficha de outro leitor e operações de equipe continuam bloqueadas.

**Demo:** seis áreas, aviso acadêmico, operações fictícias em memória, sem API/auth/PG. Os exemplos de relatórios/configurações continuam exclusivamente no modo demonstrativo. Preferências usam os namespaces anteriores. Não há nova integração entre Pages e banco local.

### Matriz de controles e evidências

“DOM” significa interação automatizada no React real com respostas controladas; “HTTP/PG” significa execução da API com PostgreSQL real isolado. Nenhuma dessas evidências é screenshot ou validação visual humana.

| Controle/área | Comportamento e validação |
| --- | --- |
| Login/Sair | Autenticação e logout CSRF; bloqueio de retorno. HTTP/PG e regressões React anteriores |
| Menu/atalhos por perfil | Navega seções, foco existente, novo Início; DOM. Menu/teclado físico pendente |
| Sino de avisos | Abre Avisos; DOM; sem contador fixo no real |
| Atualizar indicadores | Reconsulta resumo, loading e erro sem zeros falsos; DOM + HTTP/PG |
| Cadastrar/Editar livro | Formulário envia ano/sinopse e dados bibliográficos; espera 201/200; DOM de submissão + HTTP/PG |
| Pesquisar título/autor/categoria | Filtros parametrizados; paginação existente; HTTP/PG e DOM do catálogo |
| Detalhes/exemplares | Consulta patrimônio, estado, conservação e elegibilidade; HTTP/PG e ligação React |
| Cadastrar exemplar | Entrada real com patrimônio único; HTTP/PG, contagens confirmadas; conferência visual pendente |
| Atualizar exemplar | Motivo obrigatório, versão, bloqueio se emprestado e evento transacional; HTTP/PG |
| Histórico do exemplar | Consulta paginada; UI mostra até 50 eventos recentes e explicita a ausência de eventos retroativos |
| Leitores pesquisar/cadastrar/editar | Reutiliza identidade existente; nenhuma promoção; regressão HTTP/PG e DOM anteriores |
| Ficha e histórico do leitor | Lê detalhe + empréstimos/reservas filtrados no servidor; foco e fechamento DOM; sem acesso do aluno |
| Atualizar ficha e circulação | Refaz consultas; até 50 registros de cada lista, com limite explicado |
| Novo empréstimo/confirmar | Leitor, obra e exemplar; prazo do servidor; fila/limites/concorrência. HTTP/PG |
| Renovar | Apenas próprio ativo elegível, confirmado pela API; fila e limite bloqueiam; HTTP/PG e DOM existente |
| Registrar devolução | Confirmação, histórico e disponibilidade; duplicidade 409; HTTP/PG |
| Reservar/cancelar/atender | Próprio aluno ou equipe com motivo; atendimento pela retirada prioritária; HTTP/PG e DOM existente |
| Avisos/filtro/atualizar | Estado real de prazo/fila, sem envio externo; HTTP/PG e DOM existente |
| Tentar novamente | Recuperação independente de lista/política, preservando erros pendentes; regressões AUDIT-FIX.1 |
| Salvar/cancelar formulários | Escrita aguarda API; cancelar não envia. Livro novo testado por DOM; demais ligações inspecionadas e endpoints exercidos |
| Anterior/próxima | Consultas paginadas, limites e controles de borda; regressões existentes; visual com listas longas pendente |
| Tema/contraste/texto/movimento | Quatro preferências locais persistentes; DOM; avaliação perceptiva e Narrador pendente |
| Relatórios | Tela de indisponibilidade, sem gráficos ou exportações fictícios no painel real |
| Busca global/suporte | Permanecem desabilitados e identificados como não implementados; usar filtros reais das seções |

Não se afirma teste humano de cada botão. A matriz distingue execução automatizada, inspeção de ligação e pendência visual, sem apresentar ações demonstrativas como persistência.

## Testes e checkpoints reais

| Verificação | Resultado |
| --- | --- |
| Checkpoint inicial independente | 202 aprovados / 0 falhas / 0 ignorados / 0 cancelados |
| Checkpoint backend/migrations | 45 aprovados, incluindo quatro testes novos e fluxo completo |
| Suíte final | **210 aprovados / 0 falhas / 0 ignorados / 0 cancelados** |
| Instalação independente por lockfiles | npm ci e pnpm congelado aprovados fora do OneDrive |
| TypeScript | aprovado |
| Build real | aprovado, `/painel/`, 35 módulos |
| Build demo | aprovado, `/Alexandr.IA/`, 20 módulos |
| Verificador estático demo | aprovado, cinco arquivos |
| npm audit / pnpm audit | zero avisos na consulta da entrega |
| Workflow HTTP na nova prévia | **44 verificações aprovadas**; seis obras/nove exemplares após as operações |
| Migração da cópia populada | 008 aplicada, cinco obras/sete exemplares anteriores preservados |
| Inspeção visual, larguras, zoom, teclado e Narrador | **não executados**; conector gráfico indisponível |

As oito regressões novas cobrem resumo/autorização, metadados/validação/compatibilidade, manutenção/baixa/histórico/concorrência, fluxo com cinco obras e sete exemplares, rollback do evento, dashboard/atalhos/configurações, ficha/circulação do leitor e submissão assíncrona de livro. O script `npm test` agora seleciona explicitamente `tests/*.test.js`, incluindo todos os testes oficiais e evitando descoberta de cópias ignoradas em tmp. Nenhum assert foi removido e nenhum teste oficial foi excluído por esse filtro.

O teste de rollback instala um trigger de falha **somente no banco automatizado descartável**, confirma que falha na gravação do evento desfaz estado/versão do exemplar e remove seu trigger/função no finally. Não usa o banco visual para fixtures destrutivas. Concorrência entre duas alterações da mesma versão gera exatamente 200/409; as corridas anteriores de retirada, limite, reserva e renovação continuaram passando.

Ocorreram três falhas intermediárias por expectativas antigas de navegação/mock: sete switches incluíam exemplos agora ocultos no real (permanecem quatro preferências funcionais), mock compartilhado de Response entre dashboard/catálogo e reserva aguardando catálogo como tela inicial. Os testes foram adaptados aos novos contratos de tela, preservando asserts de persistência/segurança/sucesso. O teste novo do formulário primeiro preencheu filtros em vez do formulário; o seletor foi corrigido, sem mudar o produto para passar no teste.

Uma reinstalação encontrou EPERM no binário Argon2 em uso pela nova prévia FINAL.1. Foi pausado **somente o Express dessa prévia nova**, reinstaladas as dependências e executados todos os checks; ele foi restabelecido com seus dados. O VISUAL-QA original não foi parado. Não houve atualização de dependências/lockfiles ou relaxamento de autenticação nesta fase.

Teste automatizado: cluster próprio na porta **55451**, separado do visual original 55447 e do novo QA 55453. Logs ignorados em `tmp/`: `final1-baseline.txt`, `final1-backend.txt`, `final1-checkpoint.txt` (falhas intermediárias), `final1-final-suite.txt` (210), `final1-form-test-final.txt`, `final1-npm-audit.json`, `final1-pnpm-audit.json` e logs de instalação. Não se contaram cópias de testes em tmp; a suíte foi executada na cópia independente sem duplicatas.

## Prévia local FINAL.1 e preservação de dados

**URL nova: http://127.0.0.1:3018/login**. PostgreSQL novo **55453**, SCRAM-SHA-256, usuário sem privilégios administrativos, configuração/credenciais em diretório temporário protegido fora do OneDrive. Fonte/build utilizados são a cópia independente validada, não o dist antigo do workspace. O banco é cópia consistente do VISUAL-QA original, com migration 008 aplicada só na cópia, seguida de operações oficiais para validar o estoque. Não foram forjados estados de negócio por UPDATE direto para aparentar aprovação.

Foram preservadas as identidades fictícias de bibliotecário e dois alunos na cópia. As sessões do QA novo usam outro segredo e outra origem host para não sobrescrever o cookie do `localhost:3017`. Acesso HTTP local com Secure=false continua configuração original explícita, não alteração de código de autenticação. Nenhuma porta foi publicada na Internet.

Para obter as credenciais **somente localmente**, sem imprimi-las aqui:

```powershell
Set-Location 'C:\Users\rafad\OneDrive\Desktop\Alexandr.IA'
$qaRoot = Get-Content -LiteralPath '.\tmp\final1-qa-location.txt'
notepad (Join-Path $qaRoot 'credenciais-locais.txt')
```

Use Edge normal para bibliotecário e InPrivate para aluno. Não salvar senhas no navegador, compartilhar o arquivo ou capturá-lo. Não usar localhost em vez de 127.0.0.1 na prévia nova: origem e cookies devem ser os indicados.

Para encerrar **somente a prévia FINAL.1** quando terminar:

```powershell
& (Join-Path $qaRoot 'Stop-QA.ps1')
```

Para retomar a mesma cópia:

```powershell
& (Join-Path $qaRoot 'Start-QA.ps1')
```

Os controles ficam no diretório protegido; não alterar segurança global se o PowerShell bloquear execução. Não rerodar seed ou provisionamento sobre dados existentes. Descarte definitivo exige parada/conferência do caminho e autorização própria; não executar limpeza global. A cópia populada contém dumps de QA e segredos temporários, nunca candidatos a Git.

## Roteiro Edge de aceitação — pendente

1. Bibliotecário: entrar na URL nova, confirmar identidade e números reais. Registrar contagens antes da operação.
2. Acervo → Cadastrar livro: título/autor/categoria, editora, ano/sinopse opcionais. Salvar e aguardar confirmação; recarregar e conferir.
3. Detalhes → registrar dois patrimônios distintos. Conferir aumento de físico/disponível no dashboard (Atualizar indicadores), sem reiniciar servidor.
4. Emprestar um desses exemplares ao Aluno Teste. Conferir físico constante, disponível -1 e emprestados +1; tentar baixa durante empréstimo deve ser impedida.
5. Aluno em InPrivate: conferir empréstimo/próprio perfil, renovar; Outro Aluno Teste solicita reserva. Renovação incompatível deve ser recusada.
6. Equipe: devolver, conferir histórico/estoque; atender primeiro da fila pela nova retirada. Alterar outro exemplar para manutenção com motivo e consultar histórico de operador.
7. Leitores: ficha e circulação relacionada; aluno não deve receber controles de equipe nem dados de outro leitor. Sair e tentar voltar ao painel deve bloquear.
8. Avisos: conferir prazos e fila antes/depois das operações; não esperar e-mail, SMS ou WhatsApp. Relatórios deve explicar indisponibilidade.
9. Emulação Edge 1440/768/390/320 px, zoom 200%, claro/escuro/alto contraste, Tab/Shift+Tab/Enter/Escape, foco/rótulos/status e Narrador. Registrar separadamente de teste em celular físico.

O conector do navegador respondeu **The browser access host is unavailable**, e a consulta de janelas não encontrou janela QA controlável. Não houve screenshots ou aprovação visual artificial. Celular físico não acessa o loopback do PC; não abrir rede/túnel/firewall para contornar nesta etapa.

## Pendências e limites

- Aceite visual humano completo ainda pendente, inclusive formulários longos, orientação, zoom/contraste e tecnologia assistiva. A identificação explícita dessa pendência atende ao gate autorizado; não é uma declaração de conclusão visual.
- Capas/uploads, recuperação de senha, canais externos, multas e relatórios institucionais continuam fora do MVP; não há botões falsos de sucesso para eles.
- Histórico de exemplar e ficha relacionada mostram até 50 registros recentes por consulta/tela; limites são informados. Para listagens completas de circulação, usar as seções paginadas. Não há exportação institucional.
- Sem benchmark de grande volume, assinaturas de auditoria imutáveis, política de produção ou hospedagem de backend. Histórico de entrada anterior a 008 não pode ser reconstruído com garantia.
- Fontes externas e endurecimento adicional de Actions permanecem recomendações; workflow manual não foi modificado nem executado.
- O relatório histórico ausente da auditoria anterior não foi reconstruído. Os registros existentes foram preservados.

## Arquivos e gate Git

**Modificados (15):** README; package.json (somente script de testes, sem mudar dependências); backend/library/catalog.js e router.js; frontend/src/App.tsx, LibraryPanel.tsx, library/Catalog.tsx, Readers.tsx, StudentLibrary.tsx, api.ts, library.css; tests/database.test.js, library.test.js, painel.test.js e react-auth.test.js.

**Adicionados (9):** backend/library/stock.js; database/migrations/008_complete_catalogo_estoque.sql; frontend/src/library/Dashboard.tsx, ReaderRecord.tsx, Unavailable.tsx; docs/final1-frontend.sha256.json, final1-integridade.sha256.json, final1-homologacao-funcional.md; docs/visual-qa1-resultado.md (entrega anterior conhecida, incluída sem alteração).

Não há credenciais, banco, dump, cache, log, ZIP, node_modules ou build gerado no inventário autorizado. Scripts de preparação ficam ignorados em tmp e configuração fora do repositório. A revisão de padrões de segredos não substitui garantia universal; nenhum segredo/dado pessoal real foi identificado.

**Gate na redação:** testes/builds/integração/preservação aprovados; direitos confirmados pelo responsável; fluxos não verificados visualmente explicitados. Commit previsto: `feat: finaliza fluxos de acervo e circulacao AlexandrIA`. O SHA remoto deve ser consultado novamente imediatamente antes do push e precisa continuar compatível; qualquer divergência inesperada interrompe o envio, sem force. O SHA e resultado efetivo do commit/push serão informados na entrega final, evitando inserir neste próprio commit um identificador circular.

Não acionar GitHub Pages automaticamente e não fazer deploy do backend. Após eventual push, o próximo passo é executar o roteiro Edge local e, só com aceite próprio, solicitar publicação manual da demo estática.
