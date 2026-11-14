# Alexandr.IA — acessibilidade e experiência por perfil — 2.0B.3

Data: 14/11/2026. Escopo: ajustes locais no frontend, testes e documentação. Homologação visual **pendente**. Não foi declarada conformidade WCAG completa.

## Estado e alterações

Aluno recebe identidade real, perfil, boas-vindas, navegação Início, aviso de acervo/empréstimos/reservas em desenvolvimento e Sair. Não monta ferramentas internas nem empréstimos vinculados ao aluno.
Bibliotecário mantém seis seções demonstrativas. Administrador recebe essas mesmas seções com seu perfil identificado corretamente. A identidade continua vindo exclusivamente de GET /api/me; perfil desconhecido continua bloqueado.

Foram encontrados: títulos construídos com div, switches sem nome, sidebar móvel apenas deslocada por CSS com controles ainda alcançáveis, ausência de Escape/foco/restauração, ampliação limitada por fontes em px, texto muito pequeno, contrastes insuficientes e alternância visual Bibliotecário/Aluno capaz de confundir a identidade real. Havia ainda controles aparentemente funcionais sem implementação.

Correções:

- App.tsx: h1 único por seção, h2 para grupos, main identificado, link Pular para o conteúdo, aria-current na navegação e aria-pressed nos filtros. Não há URLs novas nem React Router: activeNav é suficiente para as seis vistas locais sem recursos próprios de URL.
- useNavigation.ts: sincroniza breakpoint de 760px, abertura por botão nativo, foco inicial no botão Fechar menu, Escape, retorno ao abridor e foco no título após seleção. Tab/Shift+Tab circulam dentro do menu móvel aberto; Escape e Fechar oferecem saída. Ao voltar ao desktop, remove modalidade e direciona foco ao conteúdo.
- Menu fechado: inert impede interação/foco e visibility:hidden impede apresentação. Aberto: dialog nomeado, aria-modal, fundo/main e link de salto inertes; botão de fundo fora da tabulação. Sidebar tem rolagem própria. Não foi instalada biblioteca de menu.
- Removida a alternância Bibliotecário/Aluno; aviso de prazo permanece demonstrativo e não altera perfil. Busca, suporte, notificações, catálogo completo e opções sem implementação ficam desabilitados e identificados como em desenvolvimento. Ações simuladas que já tinham retorno continuam explicitamente simuladas.
- AuthGate.tsx: apresentação do aluno e leitura inicial das preferências antigas. Fluxo de autenticação, useAuth.ts, services/auth.ts e LogoutButton.tsx preservados.
- index.css: fontes em rem, mínimo de .75rem nos antigos textos menores, foco visível, ajuste do cabeçalho para quebra de linha, nome/perfil visíveis no celular, contraste de texto/ações/switches, redução de movimentos do sistema e da preferência local.
- site.json: título, descrição e idioma pt-BR. Nome visível Alexandr.IA no painel e aluno. Marca gráfica existente preservada.

As chaves bibliotech-theme, bibliotech-large-text, bibliotech-high-contrast, bibliotech-reduced-motion e bibliotech-emergency-email permanecem por compatibilidade. Não foram gravados identidade, cookies ou tokens nelas. Preferências de privacidade continuam apenas demonstração, sem alterar dados reais.

## Contraste e ampliação

Cálculo sRGB das cores declaradas, sem captura/renderização do navegador:

| Par de cores | Antes | Depois |
| --- | --- | --- |
| Branco sobre verde principal | 3,05:1 (#5f9ea0) | 7,86:1 (#28595b) |
| Texto secundário sobre branco | 3,15:1 (#8d9292) | 5,64:1 (#606969) |
| Verde claro sobre superfície verde escura | — | 7,02:1 |
| Aviso vermelho claro sobre superfície vermelha escura | — | 7,73:1 |

Os testes verificam pares principais nas quatro combinações claro/escuro e contraste padrão/alto, com referência de 4,5:1 para texto normal. Botões com texto branco mantêm fundos sólidos escuros inclusive no hover; vermelho de texto no escuro não é reutilizado como fundo desses botões. Switch desligado recebeu fundo com contraste para seu indicador branco.
Esses cálculos não cobrem todos os pixels, sobreposições, estados, bordas e combinações renderizadas. Foco e contraste visual precisam de conferência manual.

Texto ampliado define 112,5% na raiz; rem faz os textos acompanharem essa mudança. Zoom de 200%/400%, reflow e conteúdo com nomes longos ainda precisam de avaliação no Edge. A preferência do sistema prefers-reduced-motion é respeitada mesmo quando o switch local está desligado.

## Verificações automatizadas

Ambiente efetivamente executado: Node 24.22.3, npm 11.19.1, PostgreSQL 17.10, pnpm 10.34.3, React/React DOM 19.2.4, TypeScript 5.9.3, Vite 8.0.5, Tailwind 4.2.2 e jsdom 31.0.1. Dependências não foram atualizadas. Backend permanece Express 5.3.0, pg 8.23.1, argon2 0.44.0, express-session 1.19.0 e connect-pg-simple 10.0.0.

Base anterior: 137 aprovados, zero falhas/ignorados; TypeScript e build aprovados antes de editar.
Resultado final: 153 testes aprovados, zero falhas, cancelados ou ignorados; TypeScript sem erros e build de produção aprovado.

Foram acrescentados dez testes de componentes reais React/DOM e seis de documento/CSS/contraste. Permanecem os testes de carregamento, perfis, 401/503, retorno à aba, logout/CSRF, sessão expirada, backend e integridade. O teste anterior do seletor de audiência foi adaptado para exigir sua remoção e confirmar o perfil real; não foi eliminado.

DOM emulado cobre atributos, estado, handlers e foco programático. Não reproduz a tabulação física, Enter/Espaço nativos, árvore de acessibilidade, layout ou leitor de tela de um navegador. Os testes de CSS conferem regras e pares declarados, sem atestar aparência.

O banco usado foi exclusivamente alexandria_test em PostgreSQL temporário próprio, porta 55439, fora dos servidores de desenvolvimento/produção. As suites criam e removem seus registros fictícios; não foram alteradas migrations, regras de sessão ou contas de desenvolvimento. O servidor temporário foi encerrado após a execução.

Ocorrências reais: o sandbox recusou subprocessos com EPERM; a suíte foi executada com a permissão de execução apropriada. Uma tentativa de build e uma leitura de jsdom sofreram EBUSY/arquivo ocupado na árvore OneDrive; passaram na repetição sem reinstalação ou mudança de dependências. Durante a construção dos testes, foram corrigidos o seletor do botão com contador e o parser das declarações CSS. O resultado final acima refere-se à suíte completa após essas correções.

## Comandos

Com dependências e banco local já preparados conforme README:

```powershell
cd frontend
node node_modules/typescript/bin/tsc --noEmit
npm exec --yes --package=pnpm@10.34.3 --cache ../.npm-cache --offline -- pnpm run build
cd ..
npm start
```

Abra http://localhost:3000/login e autentique uma conta fictícia de seu ambiente. O redirect continua /area; abra manualmente http://localhost:3000/painel/.
Não usar Vite isolado como homologação de sessão. Não criar administradores automaticamente. Para conferir bibliotecário/administrador, usar somente contas de teste previamente autorizadas e preparadas pelo responsável pelo banco.

Para testes, configure exclusivamente o banco isolado, suas credenciais locais e as variáveis NODE_ENV=test, DB_ENV=test, PGDATABASE=alexandria_test, TEST_DATABASE=alexandria_test, PGHOST/PGPORT/PGUSER. Então execute npm test. Nunca apontar a suíte para desenvolvimento/produção. A porta 55439 acima registra esta execução, não uma exigência para outras máquinas.

## Roteiro manual no Edge — pendente

A única consulta à ferramenta retornou browsers vazio e “The browser access host is unavailable”. Não houve acesso persistente, controle repetitivo, screenshot de sessão ou homologação visual concluída.

1. Conferir desktop 1366px, tablet 768px e celular 360px/320px. Registrar se há corte, sobreposição ou rolagem horizontal indevida nas seis seções e na área do aluno.
2. Usar Tab desde o início: link de salto visível, ativação leva ao conteúdo, foco sempre perceptível. Conferir Enter e Espaço nos botões nativos, ordem coerente e ausência de controles ocultos focáveis.
3. No celular: abrir menu com teclado, ouvir nome/estado, conferir foco em Fechar menu. Circular com Tab/Shift+Tab. Escape e Fechar retornam ao abridor; selecionar seção fecha e coloca foco no h1. Verificar que o fundo não recebe foco. Redimensionar aberto/fechado para desktop e voltar.
4. Em Configurações: conferir sete switches nomeados, quatro preferências reais e três demonstrações de privacidade. Alternar tema/alto contraste em todas as combinações e verificar legibilidade, foco, hover e avisos.
5. Ativar texto ampliado, zoom 200%/400% e preferência de redução de animações do Windows. Conferir quebra de linhas, ações e mensagens. Recarregar para confirmar preferências antigas preservadas. Não avaliar ampliação apenas pelo estado do switch.
6. Ativar o Narrador com Win+Ctrl+Enter: conferir idioma, regiões, h1/h2, seção atual, nomes/estados dos switches, perfil, aviso demonstrativo e mensagens de status/erro. Confirmar que SVGs decorativos não geram ruído. Encerrar o Narrador após conferir.
7. Aluno: apenas seu nome/perfil, início, boas-vindas, desenvolvimento e Sair; nenhum contato, relatório ou controle administrativo. Bibliotecário e administrador: seis seções e perfil correto, sem seletor de perfil.
8. Conferir carregamento, indisponibilidade 503 em ambiente de teste controlado e revalidação ao retornar à aba. Sair deve consultar CSRF, encerrar a sessão e voltar ao login; retornar ao painel sem sessão deve bloquear. Não simular sucesso ao interromper o serviço.
9. Registrar data, navegador/versão, viewport, perfil fictício, passos, resultado e problemas. Não incluir senhas, cookies, tokens, cabeçalhos de autenticação ou dados pessoais em capturas/relatórios.

## Preservação e arquivos

Criados: frontend/src/hooks/useNavigation.ts, tests/frontend-accessibility.test.js, este documento e docs/figma-alteracoes-2.0b3.sha256.json.
Alterados: frontend/src/App.tsx, frontend/src/index.css, frontend/src/components/AuthGate.tsx, frontend/.figma/make/site.json, tests/react-auth.test.js, tests/painel.test.js, README.md e docs/integracao-frontend.md.

O novo registro SHA-256 contém os hashes anteriores/posteriores dos quatro arquivos frontend alterados, o hash do hook criado e o SHA-256 do manifesto B.2 precedente. Não substitui registros históricos. Os testes percorrem importação → B.1 → B.2 → B.3, verificam arquivos ainda intactos e os quatro módulos adicionados em B.2.
Originais de login, manifestos anteriores, migrations 001/002/003, backend e arquivos de dependências/locks foram preservados. O build em frontend/dist foi regenerado e continua fora do versionamento.

## Aprendizado e próximos passos

Semântica HTML dá significado nativo: main identifica conteúdo principal, nav agrupa navegação e h1/h2 organizam títulos. ARIA complementa esse significado: aria-current informa a seção, aria-expanded descreve abertura e aria-checked descreve um switch. ARIA sozinha não implementa teclado nem segurança.

Teclado utiliza Tab para deslocar foco e Enter/Espaço para ativar botões. Foco é o elemento que receberá a próxima tecla; após mudar conteúdo ou fechar o menu, deve ir a um destino previsível. inert impede interação em regiões temporariamente indisponíveis. No menu modal, circulação interna é intencional e há saídas explícitas por Escape/Fechar.

Contraste é a relação de luminância entre texto e fundo; cor parecida visualmente pode ser ilegível em texto pequeno. CSS responsivo adapta disposição ao espaço disponível; unidades rem também acompanham a fonte raiz. Testes automatizados confirmam contratos e comportamentos repetíveis, enquanto homologação visual avalia a experiência renderizada com teclado, zoom e tecnologias assistivas.

Experiência por perfil decide o que apresentar. Autorização real continua no backend: esconder um botão não protege dados. Nenhuma permissão, sessão, endpoint ou funcionalidade bibliotecária foi criada nesta fase.

Próxima etapa recomendada: executar e registrar o roteiro manual, corrigir apenas problemas observados e realizar revisão com usuários/tecnologia assistiva. Antes de publicação, ainda são necessárias avaliações de acessibilidade, HTTPS/cookies em ambiente final, operação segura e requisitos de dados reais. Qualquer integração funcional, alteração do redirect, recuperação, deploy ou GitHub depende de nova autorização.

Referências: [WCAG 2.2](https://www.w3.org/TR/WCAG22/) e [padrão de diálogo modal WAI-ARIA](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). São referências de implementação, não certificação do projeto.
