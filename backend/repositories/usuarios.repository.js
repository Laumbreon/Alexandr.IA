async function insertAluno(pool, data, hash) {
  const client = await pool.connect();
  let releaseError;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      "INSERT INTO usuarios (nome,email,senha_hash,perfil) VALUES ($1,$2,$3,'aluno') RETURNING id",
      [data.nome, data.email, hash]);
    await client.query('INSERT INTO alunos (usuario_id,ra,curso) VALUES ($1,$2,$3)',
      [rows[0].id, data.ra, data.curso]);
    await client.query('COMMIT');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      releaseError = rollbackError;
    }
    throw error;
  } finally {
    // Uma conexão cujo rollback falhou não deve voltar ao pool para reutilização.
    client.release(releaseError);
  }
}

async function findCredentials(pool, email) {
  const { rows } = await pool.query(
    'SELECT id, senha_hash, ativo FROM usuarios WHERE lower(email)=$1', [email]);
  return rows[0];
}

async function findCurrentUser(pool, id) {
  const { rows } = await pool.query(
    'SELECT id, nome, email, perfil, ativo FROM usuarios WHERE id=$1', [id]);
  return rows[0];
}

module.exports = { insertAluno, findCredentials, findCurrentUser };
