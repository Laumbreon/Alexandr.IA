# VISUAL-QA.1 — acesso real preparado para homologação

Data: **19/11/2026**, America/Sao_Paulo.

## Acesso e veredito

**Sistema real disponível em http://localhost:3017/login.** Express e PostgreSQL QA foram mantidos **ativos**, conforme autorização, para o responsável testar pessoalmente no Edge. Não é a demo Pages nem um servidor Vite.

**GO COM RESSALVAS para iniciar a homologação/apresentação acadêmica local supervisionada. A homologação visual completa permanece pendente.** A aplicação foi validada por 53 verificações HTTP reais, com autenticação, sessão, CSRF e operações persistentes. Não houve aprovação visual por screenshots, celular, zoom, teclado ou Narrador.

Commit local de referência: `7684805d3648151edcfe7b2628ae55f24d85fbfc`, branch `main`. Workspace iniciou limpo. Esse commit ainda aguardava o gate de direitos para push; esta fase não o publica. Nenhum commit, push, merge, GitHub Actions, deploy, alteração de firewall/hosts/certificado ou mudança de código permanente foi executado.

## Ambiente e isolamento

| Item | Configuração verificada |
| --- | --- |
| Node / npm | 24.22.3 / 11.19.1 |
| pnpm / Vite | 10.34.3 / 8.1.6, conforme configuração/build auditados |
| PostgreSQL QA | 17.10, cluster novo fora do OneDrive |
| Banco | `alexandria_test`, exclusivamente nesse cluster novo |
| Porta PostgreSQL | **55447**, bind **127.0.0.1** |
| Usuário da aplicação | `visual_qa_app`, sem superuser/createdb/createrole |
| Autenticação PostgreSQL | **SCRAM-SHA-256**, HBA sem trust |
| Express real | **127.0.0.1:3017**, NODE_ENV=development e DB_ENV=test |
| Origem do navegador | **http://localhost:3017**, igual a APP_ORIGIN |
| React | Build autenticado existente em `/painel/`, servido pelo Express |
| Sessão | Fluxo original, cookie HttpOnly/SameSite, CSRF original; HTTP local explícito permite Secure=false conforme configuração existente |

PostgreSQL 17 e 18 habituais do Windows já estavam executando; não foram parados, reconfigurados ou utilizados. As portas QA estavam livres e, depois da inicialização, foram confirmadas somente em loopback. Não há acesso de outros computadores ou celulares pela rede. Não usar o nome do banco como prova isolada de destino: **host, porta 55447 e diretório do cluster são parte do isolamento**.

Configuração, senhas e dados ficam em diretório temporário próprio fora do OneDrive, com ACL restrita ao usuário local, SYSTEM e autoridades administrativas/proprietário locais. Nenhum grupo geral de usuários recebeu acesso. Não foi criado `.env` no projeto. Senhas são aleatórias e exclusivas desta sessão descartável, sem credencial fixa/publicada. Não armazenar as credenciais no Edge nem usá-las em outra instalação.

O diretório concreto pode ser obtido localmente, sem revelar segredos:

```powershell
Set-Location 'C:\Users\rafad\OneDrive\Desktop\Alexandr.IA'
$qaRoot = Get-Content -LiteralPath '.\tmp\visual-qa1-location.txt'
```

`tmp/` está ignorado pelo Git. O caminho acima aponta para o ambiente desta preparação; não substituí-lo por diretório de outro projeto.

## Credenciais e sessões separadas

Foram criadas três identidades **fictícias**:

| Identidade | Perfil | Finalidade |
| --- | --- | --- |
| Bibliotecário Teste | bibliotecario | Operações legítimas da equipe |
| Aluno Teste | aluno | Fluxo principal do leitor |
| Outro Aluno Teste | aluno | Privacidade e fila incompatível com renovação |

Os e-mails são exclusivamente de teste, no domínio `example.invalid`. Alunos foram cadastrados pelo endpoint público legítimo, com ficha acadêmica/RA fictícios. O cadastro público não escolheu perfil privilegiado. Não foi criado administrador: não foi necessário para estes cenários.

O projeto não oferece provisionamento de equipe. Foi usado procedimento QA controlado: inserção parametrizada do bibliotecário somente no banco descartável novo, com Argon2id e parâmetros do serviço original. Não foi criado endpoint público, não foi promovida conta de estudante existente e nenhuma autenticação foi modificada.

**Como obter as senhas por canal local:** após definir `$qaRoot` conforme acima, abra o arquivo protegido no Bloco de Notas:

```powershell
notepad (Join-Path $qaRoot 'credenciais-locais.txt')
```

O arquivo contém os acessos temporários, não está no repositório e não deve ser enviado aqui, compartilhado ou capturado. Feche-o antes de fazer screenshots. Não imprimir `config.json`, que também contém segredos.

Use **Edge normal para bibliotecário** e **Edge InPrivate para aluno**, ambos no endereço exato `http://localhost:3017/login`. Duas janelas normais compartilham cookies; janelas InPrivate também compartilham a sessão privada entre si. Para o outro aluno, saia da conta do aluno antes de entrar com a terceira identidade. A sessão original expira em 30 minutos; se necessário, entre novamente.

## Banco e dados preparados

Aplicadas as **migrations oficiais 001–007** no cluster novo, sem editar SQL histórico. A verificação final confirmou sete registros de migration, cinco obras, sete exemplares, dois alunos, três empréstimos ativos, um devolvido e uma reserva aguardando.

| Obra fictícia | Exemplares | Cenário inicial |
| --- | --- | --- |
| QA — Algoritmos do Bosque | QA-1-1, QA-1-2 | Primeiro emprestado ao Aluno Teste e renovado uma vez; outro disponível |
| QA — Histórias da Estante Azul | QA-2-1 | Emprestado ao Aluno Teste; Outro Aluno Teste em fila, bloqueando renovação |
| QA — Cartografia das Ideias | QA-3-1, QA-3-2 | Disponíveis para nova retirada/reserva |
| QA — Caderno de Astronomia Fictícia | QA-4-1 | Emprestado ao Outro Aluno Teste, para conferir privacidade |
| QA — Laboratório de Leitura (revisado) | QA-5-1 | Empréstimo criado e devolvido oficialmente, com histórico |

Autores, categorias, editora, curso e RAs são fictícios. ISBN ficou vazio. **Não há campo de descrição de obra no modelo atual**; não foi inventado, criado ou preenchido em coluna inadequada. Cinco descrições de cenários constam da tabela acima, não de uma funcionalidade inexistente.

Políticas **exclusivamente fictícias para QA**, sem valor oficial da Fatec:

- Retirada: **1 dia**; máximo **5 empréstimos ativos** por leitor.
- Renovação: **2 dias adicionais**; máximo **2 renovações**.
- Aviso de proximidade: **2 dias**.

Os prazos foram calculados pelo backend a partir do horário real da preparação, não por data fixa no frontend. A renovação inicial do primeiro livro permite verificar alteração do aviso de proximidade; o segundo permanece próximo do prazo. **Não foi forçado atraso nem alterado o relógio ou datas diretamente no banco.** O cenário de prazo próximo atende a esta preparação; atraso imediato permanece não executado. Caso o ambiente seja retomado dias depois, os estados de prazo mudarão naturalmente.

Dados de acervo, exemplares, alunos, empréstimos, devolução, reserva e renovação foram preparados pelos endpoints reais. Apenas o provisionamento de equipe exigiu o procedimento QA de banco descrito acima. A reserva não foi artificialmente atendida: atendimento deve ocorrer em retirada real pela equipe.

## Verificações efetivamente executadas

**53 verificações HTTP reais aprovadas**, com sessões independentes por conta e sem registrar cookies/tokens nas evidências:

| Grupo | Resultado observado |
| --- | --- |
| Login e identidade | Login 200, redirect `/painel/`, perfil correto em `/api/me`; anônimo recebe 401 |
| Painel e assets | `/painel/` e recursos reais protegidos respondem 200 com sessão |
| Cadastro | Dois alunos criados por API pública sem privilégio de equipe |
| Acervo | Cinco obras/sete exemplares criados, edição por versão confirmada e nova consulta comprova persistência |
| Validação | Título vazio recusado com 400 |
| Retirada/devolução | Quatro retiradas oficiais, uma devolução; três ativos e histórico correspondente |
| Reserva | Fila real aguardando para Outro Aluno Teste |
| Renovação | Uma elegível confirmada; outra recusada com 409 por fila de outro leitor |
| Autorização | Aluno recebe 403 ao cadastrar obra ou consultar lista administrativa de leitores |
| Privacidade | Aluno recebe 403 ao filtrar empréstimos de outro; avisos retornam somente seu leitor_id |
| Logout | Logout CSRF confirmado nas três sessões usadas pela preparação; painel bloqueado depois com 401 |
| Saúde final | `/api/health` 200; consulta autenticada ao banco confirma cenário e usuário sem superuser |

As contas estão disponíveis para novos logins no Edge; as sessões HTTP de preparação foram encerradas. A suíte completa de 202 testes pertence à AUDIT-GATE.2: **não foi reexecutada no banco visual populado**, para não misturar suas fixtures com os dados desta homologação. Os 53 checks não são apresentados como 53 testes visuais.

Na inicialização, o coordenador Node ficou aguardando após `pg_ctl` iniciar o cluster. Foi interrompido somente o processo coordenador identificado; o provisionamento retomou usando o cluster já ativo. Não houve recriação ou intervenção nos serviços habituais. A tentativa de seed antes de o Express iniciar falhou por indisponibilidade; após a inicialização correta, a execução completa passou e gravou o cenário acima.

## Estado da inspeção no Edge

Foi possível listar o Edge, abrir janela dedicada, navegar para `/login` e observar a **árvore de acessibilidade do formulário real** (E-mail, Senha, Entrar). Isso confirma navegação até o formulário; não comprova aparência, largura ou login visual.

A captura gráfica retornou **“foreground window did not report a process id”**; uma recuperação por ativação da janela também falhou. O conector específico de navegador retornou **“The browser access host is unavailable”**. Não houve insistência repetida, concessão permanente de acesso, alteração de configuração do Edge ou substituição por DOM como se fosse screenshot.

**Não há capturas visuais aprovadas nesta entrega.** Login visual dos perfis, operações pelo formulário, larguras 320/390/768/1440 px, tema/contraste, zoom 200%, teclado e Narrador permanecem pendentes do responsável. Nenhuma credencial foi digitada ou salva no Edge pela automação. A aplicação continua acessível para você testar normalmente, apesar da limitação do controle gráfico do agente.

## Roteiro objetivo — bibliotecário

1. Edge normal → `http://localhost:3017/login` → entrar com Bibliotecário Teste. Conferir nome/perfil, menu e aviso de dados do servidor.
2. Acervo → cadastrar `QA — Obra manual`, autor/categoria fictícios, sem ISBN → cadastrar patrimônio `QA-MANUAL-01`. Pesquisar, editar, recarregar e conferir persistência. Tentar título vazio e patrimônio repetido; aguardar mensagem de erro, sem supor sucesso.
3. Leitores → conferir os dois alunos. Abrir ficha, editar curso fictício/habilitação se desejado e recarregar. Pode cadastrar outro aluno fictício por esse formulário; não informar dados pessoais reais.
4. Empréstimos → Novo empréstimo → Aluno Teste → Cartografia das Ideias → um exemplar disponível. Confirmar, conferir prazo/disponibilidade, registrar devolução e consultar Histórico.
5. Reservas → conferir fila de Histórias da Estante Azul para Outro Aluno Teste. Para atender, devolver o exemplar existente e registrar nova retirada para o primeiro da fila. Cancelamento de equipe exige motivo fictício.
6. Visão geral → conferir avisos reais, nomes/datas e Atualizar avisos após as operações. Não há envio externo.

## Roteiro objetivo — aluno

1. Abrir **InPrivate**, entrar como Aluno Teste. Confirmar nome, ausência de controles administrativos e navegação própria.
2. Catálogo → pesquisar título, filtrar Estudo QA/Literatura QA e consultar exemplares/disponibilidade.
3. Meu perfil → conferir apenas a ficha fictícia do Aluno Teste, sem dados do Outro Aluno Teste.
4. Meus empréstimos → conferir prazos. Algoritmos do Bosque ainda permite uma renovação adicional sob as regras QA; Histórias da Estante Azul deve recusar enquanto houver fila de outro aluno.
5. Solicitar reserva de Cartografia das Ideias ou da nova obra manual (sem empréstimo próprio ativo dessa obra). Em Minhas reservas, consultar/cancelar a própria e recarregar para conferir.
6. Avisos → atualizar e conferir mudanças. Sair → tentar reabrir `/painel/`: deve bloquear. Para repetir comparação de privacidade, sair e entrar como Outro Aluno Teste na sessão privada.

**Resultados manuais:** anotar por fluxo `aprovado / falhou / não executado`, tela, navegador, largura, reprodução e captura sanitizada. Não considerar sucesso apenas porque um botão foi clicado. A confirmação deve vir da resposta/persistência.

## Responsividade, teclado e Narrador — pendentes

No Edge, usar F12 → emulação de dispositivo (Ctrl+Shift+M), modo responsivo, testar **320, 390, 768 e 1440 px**; conferir acervo, formulários, menu, listas, mensagens e rolagem horizontal. Registrar que é **emulação**, não celular físico. O celular real não acessa o localhost deste PC: não abrir portas, firewall, bind ou túnel nesta fase para contornar isso.

Na página, testar zoom 200% (Ctrl+mais) e retornar a 100% com Ctrl+0; temas, alto contraste e texto ampliado no painel. Tab/Shift+Tab/Enter/Escape devem permitir navegação, foco visível e saída do menu. Conferir foco após mudar seção e mensagens de erro. No Windows, ativar o Narrador pelo método habitual do responsável e conferir ordem de leitura, rótulos e anúncios; não registrar conformidade sem executar.

## Defeitos, limites e próximos ajustes

- **Bloqueio do executor gráfico:** inspeção visual automatizada não concluída pelas falhas de infraestrutura acima; não classificado como defeito comprovado da aplicação.
- **Campo de descrição ausente:** limitação do modelo existente, sem alteração de schema nesta homologação.
- **Atraso imediato não preparado:** existe prazo próximo; nenhum estado de negócio foi falsificado para aparentar cobertura de atraso.
- **Sem defeito novo de autorização comprovado** nos checks executados. Não houve avaliação visual suficiente para afirmar ausência de cortes, foco ou contraste inadequados.
- Licença/direitos, fontes externas, pipeline e implantação de produção continuam com as ressalvas dos gates anteriores. Nenhuma correção permanente foi aplicada nesta fase.

Quando encontrar defeito manual, registrar tela, passos, resultado esperado/obtido, impacto e correção mínima sugerida antes de pedir alteração de código. Redesign ou mudança estrutural não estão autorizados.

## Iniciar, encerrar e preservar a sessão

**Estado final desta entrega:** Express QA e PostgreSQL QA **ativos e saudáveis**, somente em loopback. Foram deixados ligados deliberadamente. Os dados não foram limpos ao concluir, para permitir sua interação. Eles são descartáveis e não devem ser promovidos a banco de desenvolvimento/produção.

Os scripts abaixo ficam no diretório protegido e **não contêm senhas incorporadas**. Start usa a configuração protegida; Stop confere que o PID pertence ao `run.cjs` deste ambiente antes de interromper somente o Express QA e este cluster.

Para **encerrar quando você terminar**:

```powershell
Set-Location 'C:\Users\rafad\OneDrive\Desktop\Alexandr.IA'
$qaRoot = Get-Content -LiteralPath '.\tmp\visual-qa1-location.txt'
& (Join-Path $qaRoot 'Stop-QA.ps1')
```

Para **retomar este mesmo cenário**, se o diretório temporário ainda existir:

```powershell
$qaRoot = Get-Content -LiteralPath '.\tmp\visual-qa1-location.txt'
& (Join-Path $qaRoot 'Start-QA.ps1')
```

Sintaxe dos scripts foi validada; a parada/reinicialização não foi exercida ao fim desta entrega, para preservar a sessão ativa. Não execute novamente os scripts de seed/provisionamento: criariam conflitos com dados já preparados. Se a política local bloquear um script ou surgir erro, informe a mensagem sem expor config/credenciais; não altere execução/segurança global automaticamente.

Encerrar serviços preserva o diretório para retomada; não apaga permanentemente dados. Para descarte definitivo, solicite limpeza específica **após parar e conferir o caminho**, incluindo senhas/configuração/dados locais; não usar comandos globais nem remover outros clusters. Nenhum diretório protegido ou arquivo de credenciais deve entrar em commit, relatório ou captura.

**Entrega versionável:** somente este relatório. Scripts auxiliares da preparação estão em `tmp/` ignorado e a configuração/credenciais fora do OneDrive. Os arquivos anteriormente versionados permanecem intactos; o índice não foi alterado. Nenhum recurso público foi criado.
