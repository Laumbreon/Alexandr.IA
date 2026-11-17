const { fail, fields, text, integer, id, page, pattern, transaction } = require('./common');
const base = `SELECT u.id,u.nome,u.ativo,a.ra,a.curso,COALESCE(v.habilitado,true) AS habilitado,COALESCE(v.versao,1) AS versao
  FROM usuarios u JOIN alunos a ON a.usuario_id=u.id LEFT JOIN biblioteca_leitores v ON v.usuario_id=u.id`;
async function reader(pool, readerId) {
  const result = (await pool.query(base.replace('u.id,u.nome', 'u.id,u.email,u.nome') + ' WHERE u.id=$1 AND u.perfil=\'aluno\'', [id(readerId)])).rows[0];
  if (!result) fail(404, 'Leitor não encontrado.');
  return result;
}
async function listReaders(pool, query) {
  const { pagina, limite } = page(query), q = pattern(query.q);
  const where = ` WHERE u.perfil='aluno' AND (u.nome ILIKE $1 OR COALESCE(a.ra,'') ILIKE $1)`;
  const total = Number((await pool.query('SELECT count(*) FROM (' + base + where + ') r',[q])).rows[0].count);
  return { items: (await pool.query(base + where + ' ORDER BY lower(u.nome),u.id LIMIT $2 OFFSET $3',[q,limite,(pagina-1)*limite])).rows, total, pagina, limite };
}
async function updateReader(pool, readerId, body) {
  fields(body,['nome','ra','curso','habilitado','versao']);
  const data = { nome:text(body.nome,200),ra:text(body.ra,50,true),curso:text(body.curso,200,true),versao:integer(body.versao,1,2147483646) };
  if (typeof body.habilitado !== 'boolean') fail(400,'Informe a situação do vínculo.');
  return transaction(pool,async (c) => {
    // Serializa ficha e vínculo mesmo quando ainda não existe linha operacional.
    await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[id(readerId)]);
    const old = await reader(c,readerId);
    if (old.versao !== data.versao) fail(409,'Leitor alterado por outra operação. Atualize a consulta.');
    await c.query('UPDATE usuarios SET nome=$1 WHERE id=$2',[data.nome,id(readerId)]);
    await c.query('UPDATE alunos SET ra=$1,curso=$2 WHERE usuario_id=$3',[data.ra,data.curso,id(readerId)]);
    await c.query('INSERT INTO biblioteca_leitores(usuario_id,habilitado,versao) VALUES($1,$2,2) ON CONFLICT(usuario_id) DO UPDATE SET habilitado=EXCLUDED.habilitado,versao=biblioteca_leitores.versao+1',[id(readerId),body.habilitado]);
    return reader(c,readerId);
  });
}
module.exports = { reader,listReaders,updateReader };
