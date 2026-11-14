const { SESSION_MS } = require('../middleware/sessoes');

function loginController(login, sessions) {
  return async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      const userId = await login(req.loginData);
      if (!userId) {
        return res.status(401).json({ success: false, message: 'E-mail ou senha inválidos.' });
      }
      // Destrói o ID anterior antes de promover uma sessão: evita session fixation.
      await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
      if (req.secure) req.session.cookie.secure = true;
      req.session.userId = userId;
      req.session.authExpiresAt = Date.now() + SESSION_MS;
      req.session.csrfToken = sessions.token();
      await new Promise((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
      return res.status(200).json({ success: true, redirect: '/painel/' });
    } catch (error) {
      // Não tentar salvar novamente ao enviar a resposta de uma falha de persistência.
      req.session = undefined;
      const unavailable = error.status === 503 || error.code?.startsWith('08') ||
        ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', '28P01', '28000',
          '3D000', '42P01', '53300', '57P01', '57P02', '57P03'].includes(error.code) ||
        /timeout exceeded when trying to connect/.test(error.message);
      return res.status(unavailable ? 503 : 500).json({
        success: false,
        message: unavailable ? 'Serviço de autenticação indisponível.'
          : 'Não foi possível concluir o login.',
      });
    }
  };
}

module.exports = { loginController };
