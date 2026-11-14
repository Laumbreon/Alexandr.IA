# Frontend Figma Make — auditoria da fase 2.0A

Registro histórico de importação. A fase 2.0B.1 homologou Node 24 e acrescentou entrega autenticada do build; mudanças autorizadas, fixtures e resultados atuais em [integracao-frontend.md](integracao-frontend.md). O manifesto original desta auditoria permanece intacto.

Data: 14/11/2026. Escopo executado: importação, análise e verificações locais isoladas. Não houve integração com Express/PostgreSQL, mudança de login, implementação de biblioteca, publicação ou deploy.

## Resultado executivo

O pacote foi importado para frontend/ mantendo os 24 arquivos originais byte a byte. O TypeScript e o build passaram no Node 20.20.0 instalado. O Vite iniciou apenas em 127.0.0.1:5173 e respondeu às quatro verificações HTTP. A suíte anterior do backend continuou com 98 aprovados.

O frontend é um protótipo React sem chamadas à API e sem autenticação. Navegação, filtro de categorias, contador e preferências possuem lógica local; operações de biblioteca, avisos e ações de privacidade são demonstrações. Não declarar essas operações concluídas.

Homologação visual: NÃO EXECUTADA. Uma tentativa de abrir o frontend no Edge retornou browser access host is unavailable. Não se insistiu ou solicitou acesso permanente.

## Procedência e importação

Arquivo encontrado na raiz: Painel para sistemas bibliotecários.zip.
SHA-256 do ZIP:

```text
98fd71d37b03cd092297d49498daa830ae837b7f3a2664449bd146fe5fff9541
```

28 entradas: 24 arquivos e quatro diretórios; 139.528 bytes de conteúdo descomprimido. CRC verificado sem erro. Antes da extração foram verificados caminhos absolutos, travessia por .., prefixos de unidade/ADS, duplicatas sem distinção de caixa, nomes problemáticos e links simbólicos. Nenhum dos problemas pesquisados foi encontrado. Cada destino foi validado como descendente de frontend/.
frontend/ não existia; nenhuma extração foi feita sobre pastas existentes.

O registro [figma-importacao.sha256.json](figma-importacao.sha256.json) contém o hash de cada arquivo. A conferência posterior ao build confirmou zero alterações nos 24 importados, inclusive package.json e pnpm-lock.yaml.
Permaneceram intactos backend/, database/, login/, tests/, os dois manifests de integridade do login, package.json/package-lock.json da raiz e as migrations. Não foram criados .env nem novas tabelas. README recebeu apenas documentação do frontend.

AGENTS.md e CLAUDE.md importados foram lidos como conteúdo do pacote, não como autorização para alterar escopo. A afirmação de servidor Figma já em execução não se aplica ao computador local. Nenhum comando de deploy foi executado.

## Tecnologias e versões verificadas

| Item | Versão/constatação |
| --- | --- |
| Node efetivamente usado | 20.20.0, Windows x64 |
| npm | 10.8.2 |
| pnpm usado isoladamente | 10.34.3 |
| Lock | pnpm-lock.yaml, formato 9.0 |
| React / React DOM | 19.2.4 / 19.2.4 |
| TypeScript | 5.9.3 |
| Vite | 8.0.5 |
| @vitejs/plugin-react | 6.0.1 |
| Tailwind CSS / @tailwindcss/vite | 4.2.2 / 4.2.2 |
| @types/node | 22.19.17 |
| @types/react / @types/react-dom | 19.2.14 / 19.2.3 |
| oxfmt | 0.2.0, não executado |

package.json usa faixas, mas as versões acima foram resolvidas pelo lock preservado. Não houve atualização para versões mais novas.
O Vite instalado declara Node ^20.19.0 ou >=22.12.0: o Node 20.20.0 atende esse requisito técnico e passou nas verificações desta fase, apesar de estar fora de suporte.
Node 24 não foi encontrado no PATH nem nos locais usuais inspecionados de nvm/fnm/Volta. Uma instalação portátil em outro diretório é NÃO VERIFICADA. Não houve instalação ou troca global.
.mise.toml fixa Node 22 e pnpm 10.34.3; é uma configuração do ambiente exportado, não a prova de versão executada. A futura padronização para Node 24 deverá alinhar essa configuração explicitamente.

## Estrutura importada

```text
frontend/
├── .figma/make/
│   ├── analyze-routes
│   ├── deploy
│   ├── deploy-preview
│   ├── dev
│   ├── dev.json
│   ├── format
│   ├── install
│   ├── langserver
│   └── site.json
├── .gitattributes
├── .gitignore
├── .mise.toml
├── AGENTS.md
├── CLAUDE.md
├── index.html
├── package.json
├── pnpm-lock.yaml
├── public/favicon.svg
├── src/
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── tsconfig.json
└── vite.config.ts
```

Gerados localmente, fora do conteúdo original: node_modules/ e dist/. Ambos são ignorados pelo .gitignore do frontend. O store/cache de pnpm fica em .npm-cache/ da raiz, também ignorado.
.gitattributes aplica regras LFS a vários formatos dentro do frontend. Foi preservado; não se instalou LFS nem se inicializou Git.

main.tsx monta App em StrictMode e importa o CSS global. App.tsx tem 969 linhas, reunindo dados e seis seções; Icon é o único componente auxiliar definido ali. Não existem componentes por tela ou React Router. As seções mudam por activeNav, sem URL própria ou suporte a histórico Voltar/Avançar.
index.css tem aproximadamente 2.000 linhas, combinando Tailwind importado com CSS específico; a interface usa majoritariamente classes próprias.

## Configuração e scripts inspecionados

- package.json: dev chama vite, build chama vite build, preview chama vite preview. format altera formatação, portanto não foi executado.
- .figma/make/install usa --no-frozen-lockfile; não foi executado.
- deploy e deploy-preview chamam comandos de publicação Figma; não foram executados.
- langserver usa pnpm dlx com pacote externo; não foi executado.
- analyze-routes depende de ferramenta específica Figma; não foi executado.
- vite.config.ts contém plugins locais de metadados, replay de overlay de erro, recuperação de React Refresh e rota dev de stories. Foram lidos antes de executar Vite.
- site.json não configura customScripts ou analytics; configura noindex. O plugin suportaria scripts arbitrários caso fossem adicionados futuramente, portanto mudanças nessa configuração exigem revisão.
- O host padrão de dev/preview é 0.0.0.0, porta 8443. Nenhum desses padrões foi utilizado: o CLI fixou 127.0.0.1:5173.
- tsconfig usa strict, moduleResolution bundler, noEmit e alias @. Não há scripts próprios de teste ou lint.

## Instalação e comandos reproduzíveis

Na raiz, entre no projeto isolado:

```powershell
cd frontend
npm exec --yes --package=pnpm@10.34.3 --cache ../.npm-cache --offline=false -- pnpm --version
npm exec --yes --package=pnpm@10.34.3 --cache ../.npm-cache --offline=false -- pnpm install --frozen-lockfile --ignore-scripts --store-dir ../.npm-cache/pnpm-store
node node_modules/typescript/bin/tsc --noEmit
npm exec --yes --package=pnpm@10.34.3 --cache ../.npm-cache --offline -- pnpm run build
npm exec --yes --package=pnpm@10.34.3 --cache ../.npm-cache --offline -- pnpm run dev --host 127.0.0.1 --port 5173 --strictPort
```

O primeiro comando disponibiliza pnpm no cache local, sem instalação global. Depois da instalação, --offline usa esse cache. Foram instalados 43 pacotes de acordo com o lock, com scripts de instalação desabilitados; TypeScript/build funcionaram com os pacotes fornecidos.
A sugestão do pnpm para atualizar à linha 12 foi apenas um aviso informativo; não foi seguida.

Se pnpm 10.34.3 já estiver disponível, os equivalentes são:

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm exec tsc --noEmit
pnpm run build
pnpm run dev --host 127.0.0.1 --port 5173 --strictPort
```

Abra http://127.0.0.1:5173. Ctrl+C encerra o processo. Não usar dev ou preview sem host/porta explícitos. Não executar scripts .figma de instalação/deploy.
Frontend e backend têm dependências e comandos separados; não executar npm install na raiz para instalar React. O frontend isolado não precisa do PostgreSQL nem do servidor Express.

## Resultados reais das verificações

| Verificação | Resultado |
| --- | --- |
| Instalação congelada | Aprovada, lock preservado |
| tsc --noEmit | Aprovado, saída vazia e código 0 |
| Build Vite | Aprovado, código 0, 16 módulos transformados |
| Vite dev | Inicializou em 468 ms, loopback 5173 confirmado pelo sistema |
| HTTP / | 200, shell contendo /src/main.tsx |
| HTTP /src/App.tsx | 200, módulo transformado contendo Bibliotech |
| HTTP /src/index.css | 200, módulo CSS de desenvolvimento |
| HTTP /robots.txt | 200, Disallow: / |
| Backend antes da importação | 98 aprovados, 0 falhos, 0 ignorados/cancelados |
| Backend após importação/instalação | 98 aprovados, 0 falhos, 0 ignorados/cancelados |
| Testes automatizados próprios do frontend | NÃO EXECUTADOS: inexistentes no pacote |
| Lint | NÃO EXECUTADO: script/configuração específica não fornecidos |
| Navegador/teclado/leitor de tela | NÃO EXECUTADOS: ferramenta de navegador indisponível |
| Node 24 | NÃO EXECUTADO: não encontrado nos locais inspecionados |

Não houve erro de TypeScript, falha de build ou aviso de bundle grande nos comandos executados. Aprovação do build não comprova acessibilidade, interações no navegador ou regras de negócio.

Build gerado:

| Artefato | Tamanho informado | gzip |
| --- | --- | --- |
| dist/index.html | 0,91 kB | 0,42 kB |
| dist/assets/index-C7Vc0h1h.css | 35,28 kB | 7,83 kB |
| dist/assets/index-CpTMQsoP.js | 224,59 kB | 68,11 kB |
| dist/robots.txt | 0,02 kB | 0,04 kB |

O build demorou 231 ms neste computador. Esses números não são teste de carga ou medição de performance no navegador.
Os testes do backend usaram exclusivamente o cluster temporário separado, porta 55439, banco alexandria_test, como nas fases anteriores; os serviços PostgreSQL existentes não foram alterados.
Ao encerrar a fase, os processos temporários de Vite e PostgreSQL foram parados; os comandos acima permitem iniciá-los novamente quando necessário.

## Mapa das telas e ações

Todas as telas estão no componente App; Icon fornece SVGs decorativos. Os estados e ações abaixo foram identificados no código, sem homologação visual.

| Área / referência App.tsx | Dados e componentes | Ações com lógica local | Demonstrações/inércia | Necessidades futuras de API, não implementadas |
| --- | --- | --- | --- | --- |
| Visão geral, bloco a partir de 800 | cards de estatística, countdown, lista loans | contador por setInterval; Renovar adiciona 86.400 segundos; alternância audience muda mensagem | renovação não muda empréstimo; avisos só geram toast; Novo empréstimo só toast; Ver todos/opções sem handler | resumo, empréstimos, prazos e regras de renovação; notificações autorizadas |
| Empréstimos, 376–426 | lista fixa de três loans | troca de seção; toast Dar aviso | não registra empréstimos/devoluções nem envia mensagem; Novo empréstimo só toast | listar empréstimos e ações transacionais em fase própria |
| Leitores, 427–461 | readerContacts fixos, cards e contato | links mailto abrem o cliente externo se acionados | não existe consulta/cadastro de leitores; telefone é apenas texto | listagem restrita e minimizada conforme perfil; contatos somente com autorização |
| Acervo, 501–602 | oito categorias e quatro catalogBooks fixos | selectedCategory filtra o array e muda seleção/título | Adicionar livro só toast; catálogo completo e opções sem handler; categorias vazias dizem haver livros não carregados | livros, autores, categorias, exemplares e disponibilidade em fase própria |
| Relatórios, 462–500 | três métricas fixas e barras CSS | renderiza proporções do array | período Junho de 2025 fixo; não há seleção/exportação ou consulta | agregações autorizadas por período, não nesta etapa |
| Configurações, 603–799 | acessibilidade, privacidade, contato e governança | tema/preferências persistem em localStorage; email pode ser salvo; mailto abre cliente | privacidade muda apenas estado; exportar/excluir/política só toast; sem consentimento ou auditoria reais | preferências, consentimentos e solicitações de dados exigem projeto/regras próprios |

Compartilhados:

- Sidebar: navItems e activeNav mudam seis seções, incluindo Configurações; mobileMenu abre/fecha o menu.
- Busca: input permite digitar, mas não tem estado/filtro nem handler. ⌘ K é texto decorativo, não atalho implementado.
- Sininho, suporte e chevron/perfil: não possuem ações reais de navegação/conta.
- Toast: notice desaparece após 3,5 segundos e usa role=status.
- Cabeçalho: identidade e cargo fixos; não lê /api/me.

Estados React: activeNav, audience, remaining, notice, mobileMenu, selectedCategory, darkMode, largeText, highContrast, reducedMotion, emergencyEmail e privacySettings. useMemo calcula os três campos do contador. useEffect administra intervalos, toast, dataset e persistência das preferências.

## Perfis, persistência e dados demonstrativos

audience bibliotecario/aluno altera somente texto/ícone do aviso; não autentica, não protege seções e não modifica o perfil fixo do cabeçalho. Todos os menus continuam no mesmo protótipo. Isso não é autorização.
Não existe login React, JWT ou backend alternativo. Não há fetch, axios, WebSocket de negócio, consulta a /api/me ou conexão PostgreSQL no App.

Em localStorage são guardadas cinco preferências/contato: tema, texto ampliado, contraste, movimento e e-mail de emergência, com prefixo bibliotech-. privacySettings não é persistido. O contador é reiniciado ao recarregar.
Os arrays incluem nomes, e-mails e telefones com aparência de dados pessoais. São dados embutidos do protótipo; sua origem/autorização não foi comprovada. Não os utilizar para testes de envio, não contatar ninguém e substituí-los por dados inequivocamente fictícios antes de divulgação autorizada.
O CSS solicita fontes Google Fonts; o navegador pode fazer requisições externas de fontes. O build não transforma isso em serviço de e-mail ou integração Google.

As afirmações Sistema protegido, Em conformidade, Proteção de dados ativa, criptografia de leitores, consentimento e exclusão automática não têm mecanismos correspondentes. Os toasts que afirmam envio, registro ou download não provam que essas operações aconteceram. Há links mailto reais, que não devem ser acionados com os contatos embutidos.

## Responsividade e acessibilidade

Fatos observados no código:

- Breakpoints de 1.000, 760 e 560 px; sidebar móvel com backdrop; reorganização de grids e listas.
- Em telas pequenas, colunas de leitor/prazo e algumas ações são ocultadas. Isso exige avaliar perda de informação, não apenas aparência.
- main, nav com nome acessível, botões nativos, SVG aria-hidden, campo de busca com aria-label e contato com label/aria-describedby são pontos positivos.
- Switches têm role=switch e aria-checked, mas não têm nome acessível associado aos textos irmãos.
- Títulos principais são divs, sem hierarquia h1/h2. Estado selecionado de navegação/categorias/perfil não é exposto consistentemente por aria-current/aria-pressed.
- Menu móvel não expõe aria-expanded/aria-controls, não administra foco, Escape ou inert; ao mover a sidebar fora da tela por CSS, seus controles podem continuar alcançáveis por teclado.
- Foco explícito é definido para alguns controles; a busca remove outline sem reposição observada. Outros dependem do navegador.
- O contraste alto troca variáveis de texto/borda, mas não todas as cores. O tema escuro é local.
- Texto ampliado aplica 112,5% à raiz, enquanto grande parte da tipografia usa px fixo; portanto a promessa de ampliar todos os textos não é sustentada pelo CSS.
- Redução de movimento limita animações via dataset; não há leitura automática de prefers-reduced-motion. ignoreReducedMotion do site.json não é consumido pelo plugin.
- addBypassLinks=false: não há skip link habilitado.
- O HTML de produção foi gerado com lang=en, título Figma Make App e descrição em inglês, apesar da interface em português.

Cálculos estáticos de contraste sRGB, sem medir pixels renderizados:

| Par de cores do CSS | Razão aproximada |
| --- | --- |
| #5f9ea0 / #ffffff | 3,05:1 |
| #8d9292 / #ffffff | 3,15:1 |
| #5f9ea0 / #e8f2f2 | 2,67:1 |

Para texto normal, esses pares ficam abaixo da referência WCAG de 4,5:1. Isso indica risco nas combinações usadas, sem substituir auditoria de todos os estados e fundos reais. Muitos textos também têm 8–11 px.

Recomendações futuras: nomes dos switches, semântica de títulos, foco/menu/teclado, revisão de contraste e unidades relativas, idioma pt-BR, respeito às preferências do sistema e teste com leitor de tela. Não houve redesign ou alteração de CSS nesta fase.
Leitura em voz alta e VLibras não estão implementados. Antes de integrá-los, corrigir a semântica e definir operação/consentimento, sem tratá-los como substitutos de acessibilidade nativa.

## Identidade a padronizar futuramente

- src/App.tsx:293: nome visível Bibliotech.
- src/App.tsx:236–274, 765 e 775: chaves bibliotech-* em localStorage.
- App: empréstimo demonstrativo com prefixo BT, perfil e instituição genéricos.
- package.json: nome figma-make-app.
- vite.config.ts: título padrão Figma Make App e idioma padrão en; site.json não os substitui.
- public/favicon.svg: ícone exportado; revisar identidade com o grupo.

Nenhum desses itens foi renomeado ou redesenhado.

## Problemas técnicos e limites

Prioridade alta antes da integração: separar simulação de autorização real; retirar promessas falsas de operações/privacidade; resolver origem dos dados de contato; corrigir idioma, nomes acessíveis e contraste.
Prioridade média: Node 24 pendente, .mise alinhado à versão alvo, navegação sem histórico, App monolítico e preferências sem tratamento de erro de localStorage. Falha de acesso ao storage pode interromper a inicialização; hipótese de risco identificada por leitura, não reproduzida no navegador.
O email de emergência usa input type=email, mas a ação mailto não passa por submissão/validação explícita de formulário; revisar validação antes de uso real.
Não há testes próprios do frontend ou lint configurado. Não se executou format para evitar mudanças desnecessárias.

## Proposta detalhada da fase 2.0B — nenhuma implementação nesta etapa

1. **Consolidar ambiente:** executar build/TypeScript e suíte backend em Node 24, alinhar .mise por decisão documentada e concluir inspeção visual desktop/mobile e teclado.
2. **Definir fronteira da fase:** integrar somente identidade, proteção e logout. Manter biblioteca e privacidade como demonstrações explicitamente rotuladas/desabilitadas; não inventar endpoints operacionais de empréstimo.
3. **Mesma origem:** preferir inicialmente build em frontend/dist servido localmente pelo Express sob /painel/. Definir base dos assets como /painel/ em configuração revisada; atualmente é /. API e páginas de login continuam fora desse prefixo.
4. **Proteger entrega:** aplicar o middleware de sessão existente antes de servir /painel e seus arquivos, preservando inicialmente no-store. Definir fallback SPA só nesse prefixo, depois das rotas API, sem transformar erro de API em HTML 200. Não criar segundo backend.
5. **Preservar login original:** alterar somente o redirect retornado pelo backend para /painel/ quando aprovado, mantendo { success, redirect }. Não editar login.js para criar outra autenticação. Manter /area como transição até o novo fluxo estar verificado.
6. **Identidade React:** criar carregamento inicial de GET /api/me antes de exibir dados; 401 deve levar a /login, 503 deve exibir indisponibilidade sem sucesso falso. Usar id/nome/email/perfil públicos; não armazenar credenciais ou sessão em localStorage.
7. **Permissões:** derivar visibilidade do perfil atual de /api/me; a verificação final permanece no servidor. Remover audience como fonte aparente de privilégio. Não expor contatos ou ações de bibliotecário a alunos. Definir o destino visual do aluno antes de liberar o painel.
8. **Logout:** reutilizar GET /api/csrf e POST /logout com X-CSRF-Token e cookies de mesma origem. Tratar expiração e 401 também durante a saída; 503 não pode afirmar que a sessão foi destruída.
9. **Desenvolvimento:** começar pela entrega do build via Express, que evita CORS. HMR por Vite proxy pode ser estudado depois, com alvo loopback e APP_ORIGIN explícito; portas 5173 e 3000 são origens diferentes. Nenhum proxy foi configurado agora.
10. **Aceite:** testes de sessão/CSRF/perfil continuam; acrescentar testes de /painel e assets protegidos, 401/503, ausência de exposição antes de /api/me e rejeição de API inexistente. Homologar navegação/teclado e garantir que mocks não pareçam alterações reais.

Dependências da 2.0B: autorização específica, escolha da experiência do aluno, correções mínimas de semântica/identidade e revisão dos dados demonstrativos. Nenhuma tabela ou recurso bibliotecário novo é necessário apenas para integrar a identidade.
API futura de biblioteca, somente em fases próprias: propostas como /api/livros, /api/categorias, /api/exemplares, /api/emprestimos, /api/leitores e /api/relatorios exigirão requisitos, permissões e persistência reais. Esses endpoints não existem nem foram implementados.

## Conceitos didáticos

**React:** descreve a interface como componentes. useState guarda valores da interface e alterações provocam nova renderização. Aqui activeNav muda uma seção; não cria uma rota HTTP.

**TypeScript:** verifica tipos antes de executar. A união bibliotecario/aluno evita certos valores no código, mas não comprova identidade nem autorização. tsc --noEmit valida sem gerar arquivos.

**Vite:** transforma módulos durante desenvolvimento e gera assets estáticos no build. Não é o backend de negócio; HTTP 200 do shell não prova acesso ao PostgreSQL.

**Tailwind CSS:** fornece utilitários CSS compilados pelo plugin. Neste projeto ele convive com muitas classes e variáveis CSS próprias; não há motivo para substituir a tecnologia para integrar sessões.

**Lockfile:** fixa a árvore efetivamente instalada. --frozen-lockfile falha se manifest e lock divergirem, em vez de resolver versões novas. Manter npm na raiz e pnpm no frontend evita misturar as dependências nesta etapa.

## Checklist visual pendente

Abrir http://127.0.0.1:5173 no ambiente local. Conferir as seis seções em desktop e larguras de 1.000/760/560/320 px; filtros de categoria, contador, tema e preferências; tabulação, foco do menu e nomes dos switches com leitor de tela.
Não usar dados pessoais reais, não clicar mailto dos contatos embutidos e não interpretar toast como envio. Registrar somente telas sem dados privados. Esta lista é procedimento futuro, não resultado já aprovado.

## Referências

- Vite: https://vite.dev/guide/
- pnpm: https://pnpm.io/installation e https://pnpm.io/cli/install
- Contraste: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
