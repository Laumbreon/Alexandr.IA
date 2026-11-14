const argon2 = require('argon2');
const { insertAluno } = require('../repositories/usuarios.repository');

const hashOptions = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB, mínimo recomendado OWASP para esta configuração.
  timeCost: 2,
  parallelism: 1,
};

function createCadastroService(getPool) {
  let hashing = 0;
  return async (data) => {
    // Limita hashes simultâneos mesmo se chegarem requisições de IPs diferentes.
    if (hashing >= 2) throw Object.assign(new Error('Cadastro ocupado. Tente novamente.'), { status: 503 });
    const pool = getPool();
    let hash;
    hashing++;
    try {
      hash = await argon2.hash(data.password, hashOptions);
    } finally {
      hashing--;
    }
    await insertAluno(pool, data, hash);
  };
}

module.exports = { createCadastroService, hashOptions };
