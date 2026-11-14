const { validateCadastro } = require('../validators/cadastro.validator');

function cadastroController(register) {
  return async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      const data = validateCadastro(req.body);
      await register(data);
      return res.status(201).json({
        success: true,
        message: 'Cadastro realizado. Você já pode entrar com seu e-mail e senha.',
      });
    } catch (error) {
      if (error.status === 400 || error.status === 503) {
        return res.status(error.status).json({ success: false, message: error.message });
      }
      if (error.code === '23505') {
        return res.status(409).json({ success: false, message: 'Não foi possível cadastrar: e-mail ou RA já utilizado.' });
      }
      const unavailable = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND',
        'EHOSTUNREACH', '28P01', '28000', '3D000', '53300', '57P01', '57P02', '57P03'].includes(error.code) ||
        error.code?.startsWith('08') || /timeout exceeded when trying to connect/.test(error.message);
      return res.status(unavailable ? 503 : 500).json({
        success: false,
        message: unavailable ? 'Banco de dados indisponível. Tente novamente mais tarde.'
          : 'Não foi possível concluir o cadastro. Tente novamente mais tarde.',
      });
    }
  };
}

module.exports = { cadastroController };
