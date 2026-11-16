# GitHub Pages — DEMO.1

Data: 15/11/2026. Preparação local concluída. Nenhum commit, push, execução de workflow ou deploy foi realizado por esta etapa.

Repositório informado: https://github.com/Laumbreon/Alexandr.IA
Endereço esperado após publicação autorizada: https://laumbreon.github.io/Alexandr.IA/
Pages com Source=GitHub Actions foi informado pelo responsável; esta etapa não alterou configurações remotas nem validou o endereço publicado.

## Separação entre demonstração e sistema real

| Build | Entrada | Saída | Base | Identidade |
| --- | --- | --- | --- | --- |
| Sistema real | main.tsx → App.tsx → AuthGate | frontend/dist | /painel/ | /api/me, sessão PostgreSQL e logout CSRF |
| Pages | demo-main.tsx → DemoApp.tsx | frontend/dist-demo | /Alexandr.IA/ | Visita fictícia, sem login, API, sessão ou senha |

O componente visual existente foi movido de App.tsx para LibraryPanel.tsx. As seis seções, CSS, navegação acessível, filtros e dados fictícios são compartilhados sem duplicar o painel. App.tsx continua envolvendo-o por AuthGate e injetando o LogoutButton real. DemoApp injeta somente identificação de visita livre; não importa o gate nem o logout. O bundle da demonstração não contém /api/me, /api/csrf, /login ou /logout.

Na demonstração:
- Aviso explícito: **Demonstração acadêmica — dados simulados**.
- Cabeçalho: Visita acadêmica, Modo demonstração, Sem autenticação. Não representa conta de bibliotecário ou concessão de acesso.
- Seis seções exploráveis: Visão geral, Empréstimos, Leitores, Acervo, Relatórios e Configurações.
- Nenhum campo de senha ou botão de login/logout.
- Preferências usam alexandria-pages-demo-*; as bibliotech-* do sistema real não são lidas/escritas pelo painel demo.
- Controles administrativos são apenas exemplos fictícios; nada persiste operações bibliotecárias no servidor, envia e-mail ou executa exclusões.
- Preferências/contato de demonstração podem ficar no navegador. Não informar dados pessoais; não usar e-mail real.
- Navegação por activeNav permanece na mesma URL, sem precisar de fallback de SPA ou novas rotas Pages.

Backend, PostgreSQL, cadastro/login, regras de sessão, CSRF, migrations, login original e módulos de autenticação React permaneceram intactos. Nenhum parâmetro de URL ou flag de storage transforma o sistema real em demo. A escolha da entrada é feita na configuração do build.

## Comandos locais

Com dependências já instaladas pelo README:

```powershell
cd frontend
node node_modules/typescript/bin/tsc --noEmit
npm exec --yes --package=pnpm@10.34.3 --cache ../.npm-cache -- pnpm run build
npm exec --yes --package=pnpm@10.34.3 --cache ../.npm-cache -- pnpm run build:demo
node ../scripts/check-pages-demo.js
npm exec --yes --package=pnpm@10.34.3 --cache ../.npm-cache -- pnpm run preview:demo --port 4173 --strictPort
```

Abrir http://127.0.0.1:4173/Alexandr.IA/ e encerrar com Ctrl+C. A prévia estática não inicia Express/PostgreSQL.
O modo pages-demo fixa a base independentemente de FIGMA_PUBLIC_URL. dist e dist-demo são separados: criar um não substitui o outro.

Para todos os testes, ambos os builds são pré-requisitos. Na raiz, configurar somente alexandria_test e executar npm test, conforme README. Sem banco explicitamente configurado, testes de integração podem ser ignorados; não declarar aprovação completa nesse caso.

## Workflow manual

.github/workflows/pages-demo.yml:
1. Somente workflow_dispatch; não dispara em push, PR ou agenda.
2. Build em Ubuntu, Node 24.22.3 e pnpm 10.34.3.
3. pnpm install --frozen-lockfile --ignore-scripts, TypeScript e build:demo.
4. Verifica artefato e faz upload exclusivamente de frontend/dist-demo.
5. Job separado publica pelo actions/deploy-pages no ambiente github-pages.

Permissões globais vazias. Build recebe contents:read e pages:read; deploy recebe somente pages:write e id-token:write. Checkout não persiste credenciais. Não são necessários segredos de aplicação/banco ou token pessoal. O workflow não instala/inicia backend ou banco, e não publica o repositório inteiro.
O GITHUB_TOKEN e a identidade OIDC são utilizados pelas actions oficiais com as permissões declaradas; não são embutidos nos arquivos do site.

## Publicação pelo responsável — não executada aqui

1. Revisar diff, novos arquivos e limites da demonstração.
2. Somente após autorizar, criar commit e enviar as alterações ao repositório existente. Incluir workflow, componentes, script de verificação, testes e novo registro de hashes. Não incluir dist/dist-demo, .env, dependências ou dumps.
3. Manter Settings → Pages → Source = GitHub Actions.
4. Na branch padrão que contém o workflow, abrir Actions → Pages — demonstração acadêmica → Run workflow. Selecionar a revisão aprovada e executar manualmente.
5. Se o ambiente github-pages exigir aprovação, revisar/aprovar no próprio GitHub.
6. Esperar build e deploy concluírem. Só então conferir a URL real emitida pelo job; o endereço deste documento é apenas o previsto.
7. Verificar banner, seis seções, menu mobile, foco, tema/zoom e ausência de requisições /api/me no Network. Testar carregamento/recarregamento sob /Alexandr.IA/ e recursos com a mesma base.
8. Não confundir disponibilidade da demo com publicação do sistema Express ou autenticação real. Para retirar a demonstração, desabilitar Pages nas configurações do repositório; não é necessário alterar o backend.

## Validação real executada

- Node 24.22.3 / npm 11.19.1 / pnpm 10.34.3.
- TypeScript: sem erros.
- Build normal: aprovado, base /painel/, dist preservado.
- Build demo: aprovado, base /Alexandr.IA/, dist-demo.
- Verificador: cinco arquivos estáticos; HTML pt-BR, título/aviso acadêmico, recursos existentes sob a base correta, sem endpoints de autenticação no JavaScript.
- Suíte: **160 aprovados, zero falhas, cancelados ou ignorados**. Base anterior de 156 preservada.
- Quatro novos testes: artefato; contrato do workflow; navegação livre nas seis seções sem fetch; menu móvel e preferências demo isoladas.
- Testes reais do sistema continuam cobrindo cadastro/login/painel/logout por perfil, PostgreSQL, CSRF, expiração e bloqueio após logout.
- Banco de testes: cluster PostgreSQL temporário próprio, 17.10, loopback porta 55439, alexandria_test. Nenhum banco de desenvolvimento foi utilizado. Cluster encerrado depois dos testes.
- Verificação local do workflow por leitura e asserções de contrato. O workflow não foi executado no GitHub nesta etapa.
- Não houve homologação visual no navegador remoto ou em aparelhos. Testes React usam DOM emulado; não certificam aparência, leitor de tela ou WCAG completa.

## Arquivos e preservação

Alterados: .gitignore, frontend/package.json, frontend/vite.config.ts, frontend/src/App.tsx, tests/painel.test.js, tests/react-auth.test.js e README.md.
Criados: .github/workflows/pages-demo.yml, frontend/src/LibraryPanel.tsx, frontend/src/DemoApp.tsx, frontend/src/demo-main.tsx, scripts/check-pages-demo.js, tests/pages-demo.test.js, este documento e docs/figma-alteracoes-demo1.sha256.json.

O registro DEMO.1 encadeia o SHA-256 do manifesto B.3, os hashes anteriores/posteriores de App/config/package e os novos módulos. Manifestos históricos não foram regravados. O teste existente foi adaptado para verificar essa continuação e procurar as fixtures no componente visual movido; suas verificações de sanitização não foram removidas. package-lock.json e pnpm-lock.yaml não foram alterados.
O CSS não mudou. Arquivos dist e dist-demo são gerados/ignorados, não selecionados automaticamente no Git.

## Limitações

GitHub Pages entrega apenas HTML/CSS/JS/recursos: não executa Express ou PostgreSQL. A demo é pública quando o Pages é publicado; não colocar dados privados em componentes ou artefatos. O sistema real continua local/autenticado e separado.
A instalação e execução do workflow em Ubuntu ainda dependem da publicação autorizada e do GitHub; as actions não foram testadas remotamente. Fontes externas do layout existente podem depender de Internet e usar fallback quando indisponíveis.
Não há recuperação, envio de mensagens, operações reais de biblioteca ou autenticação na demo. Nenhuma aprovação de produção decorre desta entrega.

Referências:
- [Workflow Pages oficial](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Base pública Vite](https://vite.dev/guide/build.html#public-base-path)
