const argon2 = require('argon2');
const { randomBytes } = require('node:crypto');
const { hashOptions } = require('./cadastro.service');
const { findCredentials } = require('../repositories/usuarios.repository');

function createLoginService(getPool) {
  let dummyHash;
  let verifying = 0;
  return async ({ email, password }) => {
    if (verifying >= 2) throw Object.assign(new Error('Autenticação ocupada.'), { status: 503 });
    verifying++;
    try {
      // O hash substituto é aleatório, nunca corresponde a uma conta e evita pular
      // o custo Argon2 quando o e-mail não existe. Não garante tempos idênticos.
      dummyHash ??= argon2.hash(randomBytes(32), hashOptions);
      const fallback = await dummyHash;
      const user = await findCredentials(getPool(), email);
      const hash = user?.senha_hash?.startsWith('$argon2id$') ? user.senha_hash : fallback;
      let valid = false;
      try { valid = await argon2.verify(hash, password); }
      catch { throw Object.assign(new Error('Credencial indisponível.'), { status: 503 }); }
      if (!user || !user.ativo || !valid) return null;
      return user.id;
    } finally {
      verifying--;
    }
  };
}

module.exports = { createLoginService };
