const session = require('express-session');
const PgStore = require('connect-pg-simple')(session);
const { randomBytes, timingSafeEqual } = require('node:crypto');
const { findCurrentUser } = require('../repositories/usuarios.repository');

const COOKIE_NAME = 'alexandria.sid';
const SESSION_MS = 30 * 60 * 1000;

function sessionConfig(env = process.env) {
  if (typeof env.SESSION_SECRET !== 'string' || Buffer.byteLength(env.SESSION_SECRET) < 32) {
    throw new Error('Configure SESSION_SECRET aleatório com pelo menos 32 bytes.');
  }
  // Falha fechada: fora de desenvolvimento/teste HTTP, Secure é obrigatório.
  const local = ['development', 'test'].includes(env.NODE_ENV);
  if (!local && env.SESSION_COOKIE_SECURE === 'false') throw new Error('HTTPS exige cookie Secure.');
  const secure = !local || env.SESSION_COOKIE_SECURE !== 'false';
  return {
    name: COOKIE_NAME, secret: env.SESSION_SECRET, resave: false,
    saveUninitialized: false, rolling: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: SESSION_MS },
  };
}

function unavailable(res) {
  if (res.headersSent) return;
  return res.status(503).json({ success: false, message: 'Serviço de autenticação indisponível.' });
}

function createSessions(getPool, env = process.env) {
  let middleware;
  let store;
  let config;
  function load(req, res, next) {
    try {
      if (!middleware) {
        config = sessionConfig(env);
        store = new PgStore({
          pool: getPool(), schemaName: 'public', tableName: 'sessoes',
          createTableIfMissing: false, disableTouch: true,
          errorLog: () => console.error('Armazenamento de sessões indisponível.'),
        });
        middleware = session({ ...config, store });
      }
      middleware(req, res, (error) => {
        if (error) return unavailable(res);
        // Mesmo no ambiente local, uma conexão HTTPS jamais emite cookie sem Secure.
        if (req.session && req.secure) req.session.cookie.secure = true;
        return next();
      });
    } catch {
      return unavailable(res);
    }
  }
  function read(req, res, next) {
    if (!req.headers.cookie?.split(';').some((part) => part.trim().startsWith(COOKIE_NAME + '='))) return next();
    return load(req, res, next);
  }
  function clear(res, https = false) {
    res.clearCookie(COOKIE_NAME, {
      path: '/', httpOnly: true, sameSite: 'lax', secure: https || (config?.cookie.secure ?? true),
    });
  }
  async function invalidate(req, res) {
    if (req.session) {
      await new Promise((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()));
    }
    clear(res, req.secure);
  }
  async function authenticate(req, res, next) {
    res.set('Cache-Control', 'no-store');
    if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Autenticação necessária.' });
    try {
      if (!Number.isFinite(req.session.authExpiresAt) || Date.now() >= req.session.authExpiresAt) {
        await invalidate(req, res);
        return res.status(401).json({ success: false, message: 'Autenticação necessária.' });
      }
      // Revalida perfil e estado no banco em cada acesso, sem confiar em dados do cookie.
      const user = await findCurrentUser(getPool(), req.session.userId);
      if (!user?.ativo) {
        await invalidate(req, res);
        return res.status(401).json({ success: false, message: 'Autenticação necessária.' });
      }
      const { ativo, ...publicUser } = user;
      req.user = publicUser;
      return next();
    } catch {
      return unavailable(res);
    }
  }
  function csrf(req, res, next) {
    const actual = req.get('X-CSRF-Token');
    const expected = req.session?.csrfToken;
    if (typeof actual !== 'string' || typeof expected !== 'string' ||
        !/^[a-f0-9]{64}$/.test(actual) || !/^[a-f0-9]{64}$/.test(expected) ||
        !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) {
      return res.status(403).json({ success: false, message: 'Proteção CSRF inválida.' });
    }
    return next();
  }
  return {
    load, read, authenticate, csrf, clear, invalidate,
    token: () => randomBytes(32).toString('hex'),
    close: async () => { if (store) await store.close(); },
  };
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Autenticação necessária.' });
    if (!roles.includes(req.user.perfil)) {
      return res.status(403).json({ success: false, message: 'Acesso não permitido.' });
    }
    return next();
  };
}

function checkOrigin(env = process.env) {
  const expected = env.APP_ORIGIN || 'http://localhost:' + (env.PORT || '3000');
  return (req, res, next) => {
    if (req.get('Sec-Fetch-Site') === 'cross-site' ||
        (req.get('Origin') && req.get('Origin') !== expected)) {
      return res.status(403).json({ success: false, message: 'Origem não permitida.' });
    }
    return next();
  };
}

module.exports = { COOKIE_NAME, SESSION_MS, sessionConfig, createSessions, requireRoles, checkOrigin };
