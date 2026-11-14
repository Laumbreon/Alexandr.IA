const express = require('express');
const path = require('node:path');
const { rateLimit } = require('express-rate-limit');
const { createPool } = require('./db/pool');
const { createCadastroService } = require('./services/cadastro.service');
const { cadastroController } = require('./controllers/cadastro.controller');
const { createHmac, randomBytes } = require('node:crypto');
const { validateLogin } = require('./validators/login.validator');
const { createLoginService } = require('./services/login.service');
const { loginController } = require('./controllers/login.controller');
const { createSessions, checkOrigin, requireRoles } = require('./middleware/sessoes');

function createApp(options = {}) {
  const app = express();
  let pool;
  const getPool = options.getPool || (() => {
    if (!pool) {
      try { pool = createPool(); }
      catch { throw Object.assign(new Error('Banco de dados não configurado.'), { status: 503 }); }
    }
    return pool;
  });
  const authEnv = options.authEnv || process.env;
  const sessions = createSessions(getPool, authEnv);
  app.locals.closeDatabase = async () => {
    await sessions.close();
    if (pool) await pool.end();
  };
  app.locals.auth = { authenticate: [sessions.read, sessions.authenticate], requireRoles };
  const loginDirectory = path.join(__dirname, '..', 'login');
  app.disable('x-powered-by');

  // Expõe somente CSS e JS de login, nunca a raiz do projeto.
  app.use('/static', (req, res, next) => {
    if (!['.css', '.js'].includes(path.extname(req.path).toLowerCase())) {
      return res.sendStatus(404);
    }
    next();
  }, express.static(loginDirectory, { dotfiles: 'deny', index: false, redirect: false }));

  app.get('/', (req, res) => res.redirect('/login'));

  const pages = {
    '/login': 'login.html',
    '/cadastro': 'cadastro.html',
    '/esqueci-senha': 'esqueci-senha.html',
    '/senha-nova': 'senha-nova.html',
  };
  for (const [route, filename] of Object.entries(pages)) {
    app.get(route, (req, res) => res.sendFile(path.join(loginDirectory, filename)));
  }

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // O cadastro cria credenciais, mas ainda não autentica o usuário.
  app.post('/api/cadastro', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: options.cadastroLimit ?? 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Não há proxy neste servidor loopback: cabeçalhos encaminhados não definem o IP.
    validate: { xForwardedForHeader: false },
    message: { success: false, message: 'Muitas tentativas de cadastro. Aguarde 15 minutos.' },
  }), express.json({ limit: '8kb', strict: true }),
  cadastroController(createCadastroService(getPool)));

  const limiterOptions = {
    windowMs: 15 * 60 * 1000, standardHeaders: 'draft-8', legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    message: { success: false, message: 'Muitas tentativas de login. Aguarde 15 minutos.' },
  };
  const accountKey = randomBytes(32);
  app.post('/login',
    rateLimit({ ...limiterOptions, limit: options.loginIpLimit ?? 20 }),
    checkOrigin(authEnv), express.json({ limit: '8kb', strict: true }),
    (req, res, next) => {
      try { req.loginData = validateLogin(req.body); next(); }
      catch { res.status(400).json({ success: false, message: 'Informe e-mail e senha válidos.' }); }
    },
    rateLimit({
      ...limiterOptions, limit: options.loginAccountLimit ?? 10,
      // Evita manter o e-mail em claro nas chaves do limitador de memória.
      keyGenerator: (req) => createHmac('sha256', accountKey).update(req.loginData.email).digest('hex'),
    }),
    sessions.load, loginController(createLoginService(getPool), sessions));

  const protectedRoute = [sessions.read, sessions.authenticate];
  app.get('/api/me', ...protectedRoute, (req, res) => res.json(req.user));
  app.get('/api/csrf', checkOrigin(authEnv), ...protectedRoute, (req, res) => {
    res.json({ csrfToken: req.session.csrfToken });
  });
  app.post('/logout', checkOrigin(authEnv), ...protectedRoute, sessions.csrf, async (req, res) => {
    try {
      await sessions.invalidate(req, res);
      res.json({ success: true, message: 'Sessão encerrada.' });
    } catch {
      res.status(503).json({ success: false, message: 'Não foi possível encerrar a sessão.' });
    }
  });
  app.get('/area', ...protectedRoute, (req, res) => res.sendFile(path.join(__dirname, 'views', 'area.html')));
  app.get('/area.js', ...protectedRoute, (req, res) => res.sendFile(path.join(__dirname, 'views', 'area.js')));

  // Documento e assets compartilham a sessão, revalidação e no-store das rotas protegidas.
  // O protótipo ainda não usa rotas React: arquivos ausentes não viram index.html.
  app.use('/painel', ...protectedRoute, express.static(
    path.join(__dirname, '..', 'frontend', 'dist'),
    { dotfiles: 'deny', index: 'index.html', redirect: false },
  ), (req, res) => {
    res.status(404).json({ success: false, message: 'Arquivo do painel não encontrado. Verifique o build local.' });
  });

  app.post(['/api/forgot-password', '/api/senha-nova'], (req, res) => {
    res.status(501).json({
      success: false,
      message: 'Funcionalidade ainda não implementada nesta etapa.',
    });
  });

  app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint não encontrado.' });
  });

  // O parser nunca deve devolver stack trace ou conteúdo da requisição.
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.type === 'entity.too.large' ? 413 : error.status === 400 ? 400 : 500;
    res.status(status).json({ success: false, message: status === 413
      ? 'Requisição excede o limite de 8 KiB.' : status === 400
        ? 'JSON inválido.' : 'Não foi possível processar a requisição.' });
  });
  return app;
}

module.exports = createApp();
module.exports.createApp = createApp;
