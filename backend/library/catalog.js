const { fail, fields, text, integer, id, page, pattern, transaction } = require('./common');
const selectBook = `SELECT l.id,l.titulo,l.isbn,l.editora,l.versao,c.nome AS categoria,
  ARRAY(SELECT a.nome FROM biblioteca_autores a JOIN biblioteca_livros_autores la ON la.autor_id=a.id WHERE la.livro_id=l.id ORDER BY a.nome) AS autores,
  (SELECT count(*)::int FROM biblioteca_exemplares e WHERE e.livro_id=l.id) AS total_exemplares,
  (SELECT count(*)::int FROM biblioteca_exemplares e WHERE e.livro_id=l.id AND e.estado='circulavel') AS circulaveis
  ,(SELECT count(*)::int FROM biblioteca_exemplares e WHERE e.livro_id=l.id AND e.estado='circulavel' AND e.conservacao<>'danificado' AND NOT EXISTS(SELECT 1 FROM biblioteca_emprestimos p WHERE p.exemplar_id=e.id AND p.estado='ativo')) AS disponiveis
  FROM biblioteca_livros l JOIN biblioteca_categorias c ON c.id=l.categoria_id`;
function bookData(body, edit = false) {
  fields(body, ['titulo','isbn','editora','categoria','autores', ...(edit ? ['versao'] : [])]);
  if (!Array.isArray(body.autores) || body.autores.length < 1 || body.autores.length > 10) fail(400, 'Informe de um a dez autores.');
  const autores = body.autores.map((v) => text(v, 200));
  if (new Set(autores.map((v) => v.toLowerCase())).size !== autores.length) fail(400, 'Autor repetido.');
  const isbn = text(body.isbn, 20, true)?.replace(/[- ]/g, '').toUpperCase() || null;
  if (isbn && !/^([0-9]{13}|[0-9]{9}[0-9X])$/.test(isbn)) fail(400, 'Formato do ISBN inválido.');
  return { titulo: text(body.titulo, 300), isbn, editora: text(body.editora, 200, true), categoria: text(body.categoria, 100), autores, ...(edit ? { versao: integer(body.versao, 1, 2147483646) } : {}) };
}
async function getBook(pool, bookId) {
  const row = (await pool.query(selectBook + ' WHERE l.id=$1', [id(bookId)])).rows[0];
  if (!row) fail(404, 'Livro não encontrado.');
  return row;
}
async function listBooks(pool, query) {
  const { pagina, limite } = page(query);
  const params = [pattern(query.q), pattern(query.categoria), pattern(query.autor)];
  const where = ` WHERE (l.titulo ILIKE $1 OR EXISTS (SELECT 1 FROM biblioteca_livros_autores la JOIN biblioteca_autores a ON a.id=la.autor_id WHERE la.livro_id=l.id AND a.nome ILIKE $1))
    AND c.nome ILIKE $2 AND EXISTS (SELECT 1 FROM biblioteca_livros_autores la JOIN biblioteca_autores a ON a.id=la.autor_id WHERE la.livro_id=l.id AND a.nome ILIKE $3)`;
  const total = Number((await pool.query('SELECT count(*) FROM biblioteca_livros l JOIN biblioteca_categorias c ON c.id=l.categoria_id' + where, params)).rows[0].count);
  return { items: (await pool.query(selectBook + where + ' ORDER BY lower(l.titulo),l.id LIMIT $4 OFFSET $5', [...params, limite, (pagina - 1) * limite])).rows, total, pagina, limite };
}
async function saveBook(pool, body, bookId) {
  const data = bookData(body, !!bookId);
  return transaction(pool, async (c) => {
    const category = (await c.query('INSERT INTO biblioteca_categorias(nome) VALUES($1) ON CONFLICT(lower(nome)) DO UPDATE SET nome=biblioteca_categorias.nome RETURNING id', [data.categoria])).rows[0].id;
    let key;
    if (bookId) {
      key = id(bookId);
      const result = await c.query('UPDATE biblioteca_livros SET titulo=$1,isbn=$2,editora=$3,categoria_id=$4,versao=versao+1 WHERE id=$5 AND versao=$6 RETURNING id', [data.titulo,data.isbn,data.editora,category,key,data.versao]);
      if (!result.rowCount) { await getBook(c, key); fail(409, 'Livro alterado por outra operação. Atualize a página.'); }
      await c.query('DELETE FROM biblioteca_livros_autores WHERE livro_id=$1', [key]);
    } else key = (await c.query('INSERT INTO biblioteca_livros(titulo,isbn,editora,categoria_id) VALUES($1,$2,$3,$4) RETURNING id', [data.titulo,data.isbn,data.editora,category])).rows[0].id;
    for (const author of data.autores) {
      const aid = (await c.query('INSERT INTO biblioteca_autores(nome) VALUES($1) ON CONFLICT(lower(nome)) DO UPDATE SET nome=biblioteca_autores.nome RETURNING id', [author])).rows[0].id;
      await c.query('INSERT INTO biblioteca_livros_autores(livro_id,autor_id) VALUES($1,$2)', [key,aid]);
    }
    return getBook(c, key);
  });
}
function copyData(body, edit) {
  fields(body, edit ? ['estado','conservacao','versao'] : ['patrimonio','estado','conservacao']);
  if (edit && (typeof body.estado !== 'string' || typeof body.conservacao !== 'string')) fail(400,'Informe estado e conservação ao atualizar.');
  const estado = body.estado ?? 'circulavel', conservacao = body.conservacao ?? 'bom';
  if (!['circulavel','manutencao','baixado'].includes(estado) || !['bom','regular','danificado'].includes(conservacao)) fail(400, 'Estado de exemplar inválido.');
  return { estado, conservacao, ...(edit ? { versao: integer(body.versao, 1, 2147483646) } : { patrimonio: text(body.patrimonio, 80) }) };
}
async function copies(pool, bookId, query) {
  await getBook(pool, bookId);
  const { pagina, limite } = page(query);
  const items = (await pool.query("SELECT e.id,e.livro_id,e.patrimonio,e.estado,e.conservacao,e.versao,(e.estado='circulavel' AND e.conservacao<>'danificado' AND NOT EXISTS(SELECT 1 FROM biblioteca_emprestimos p WHERE p.exemplar_id=e.id AND p.estado='ativo')) AS disponivel FROM biblioteca_exemplares e WHERE e.livro_id=$1 ORDER BY e.id LIMIT $2 OFFSET $3", [id(bookId),limite,(pagina-1)*limite])).rows;
  const total = Number((await pool.query('SELECT count(*) FROM biblioteca_exemplares WHERE livro_id=$1', [id(bookId)])).rows[0].count);
  return { items, total, pagina, limite };
}
async function addCopy(pool, bookId, body) {
  const data = copyData(body, false);
  return transaction(pool, async (c) => {
    await getBook(c, bookId);
    return (await c.query('INSERT INTO biblioteca_exemplares(livro_id,patrimonio,estado,conservacao) VALUES($1,$2,$3,$4) RETURNING id,livro_id,patrimonio,estado,conservacao,versao', [id(bookId),data.patrimonio,data.estado,data.conservacao])).rows[0];
  });
}
async function updateCopy(pool, copyId, body) {
  const data = copyData(body, true);
  return transaction(pool,async(c)=>{
    const initial=(await c.query('SELECT livro_id FROM biblioteca_exemplares WHERE id=$1',[id(copyId)])).rows[0];
    if(!initial)fail(404,'Exemplar não encontrado.');
    await c.query('SELECT id FROM biblioteca_livros WHERE id=$1 FOR UPDATE',[initial.livro_id]);
    if((await c.query("SELECT id FROM biblioteca_emprestimos WHERE exemplar_id=$1 AND estado='ativo'",[id(copyId)])).rowCount)fail(409,'Registre a devolução antes de alterar o exemplar.');
    const row=(await c.query('UPDATE biblioteca_exemplares SET estado=$1,conservacao=$2,versao=versao+1 WHERE id=$3 AND versao=$4 RETURNING id,livro_id,patrimonio,estado,conservacao,versao',[data.estado,data.conservacao,id(copyId),data.versao])).rows[0];
    if(!row)fail(409,'Exemplar alterado por outra operação. Atualize a consulta.');return row;
  });
}
module.exports = { listBooks, getBook, saveBook, copies, addCopy, updateCopy };
