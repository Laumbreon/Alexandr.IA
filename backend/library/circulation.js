const { fail, fields, id, integer, page, pattern, transaction } = require('./common');
const { reader } = require('./readers');
function policy(env) {
  const value = (name,min,max) => {
    if (env[name] === undefined || env[name] === '') return null;
    try { return integer(env[name],min,max); } catch { return null; }
  };
  const dias=value('LIBRARY_LOAN_DAYS',1,365),limite=value('LIBRARY_MAX_LOANS',1,100);
  const dias_renovacao=value('LIBRARY_RENEWAL_DAYS',1,365),limite_renovacoes=value('LIBRARY_MAX_RENEWALS',0,20);
  return { dias,limite,circulacao_configurada:!!(dias&&limite),dias_renovacao,limite_renovacoes,renovacao_configurada:!!(dias_renovacao&&limite_renovacoes) };
}
const selectLoan=`SELECT p.id,p.leitor_id,u.nome AS leitor,p.exemplar_id,e.patrimonio,e.livro_id,l.titulo,p.retirado_em,p.previsto_em,p.devolvido_em,p.estado,p.renovacoes,
  (p.estado='ativo' AND p.previsto_em<CURRENT_TIMESTAMP) AS atrasado
  FROM biblioteca_emprestimos p JOIN usuarios u ON u.id=p.leitor_id JOIN biblioteca_exemplares e ON e.id=p.exemplar_id JOIN biblioteca_livros l ON l.id=e.livro_id`;
async function lockBook(c,bookId) {
  if (!(await c.query('SELECT id FROM biblioteca_livros WHERE id=$1 FOR UPDATE',[id(bookId)])).rowCount) fail(404,'Livro não encontrado.');
}
async function eligibleReader(c,readerId) {
  await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[id(readerId)]);
  const user=await reader(c,readerId);
  if (!user.ativo || !user.habilitado) fail(409,'Leitor não está habilitado para circulação.');
  return user;
}
async function loan(pool,loanId,user) {
  const row=(await pool.query(selectLoan+' WHERE p.id=$1'+(user.perfil==='aluno'?' AND p.leitor_id=$2':''),user.perfil==='aluno'?[id(loanId),user.id]:[id(loanId)])).rows[0];
  if(!row)fail(404,'Empréstimo não encontrado.');return row;
}
async function listLoans(pool,query,user) {
  const {pagina,limite}=page(query),state=query.estado||'ativos';
  if(!['ativos','historico','atrasados','todos'].includes(state))fail(400,'Filtro de empréstimo inválido.');
  if(user.perfil==='aluno'&&query.leitor_id&&String(query.leitor_id)!==user.id)fail(403,'Consulta restrita ao próprio leitor.');
  const rid=user.perfil==='aluno'?user.id:query.leitor_id?id(query.leitor_id):null;
  const where=` WHERE ($1::bigint IS NULL OR p.leitor_id=$1) AND (l.titulo ILIKE $2 OR u.nome ILIKE $2 OR e.patrimonio ILIKE $2)`+
    (state==='ativos'?" AND p.estado='ativo'":state==='historico'?" AND p.estado='devolvido'":state==='atrasados'?" AND p.estado='ativo' AND p.previsto_em<CURRENT_TIMESTAMP":'');
  const params=[rid,pattern(query.q)];
  const total=Number((await pool.query('SELECT count(*) FROM ('+selectLoan+where+') t',params)).rows[0].count);
  return {items:(await pool.query(selectLoan+where+' ORDER BY p.id DESC LIMIT $3 OFFSET $4',[...params,limite,(pagina-1)*limite])).rows,total,pagina,limite};
}
async function createLoan(pool,body,user,env) {
  fields(body,['leitor_id','exemplar_id']); const readerId=id(body.leitor_id),copyId=id(body.exemplar_id),rules=policy(env);
  if(!rules.circulacao_configurada)fail(503,'Circulação requer prazo e limite explicitamente configurados pelo responsável.');
  return transaction(pool,async(c)=>{
    const initial=(await c.query('SELECT livro_id FROM biblioteca_exemplares WHERE id=$1',[copyId])).rows[0];if(!initial)fail(404,'Exemplar não encontrado.');
    // Ordem global: obra → leitor → exemplar/empréstimo. Serializa concorrência sem contador editável.
    await lockBook(c,initial.livro_id);await eligibleReader(c,readerId);
    const copy=(await c.query('SELECT estado,conservacao FROM biblioteca_exemplares WHERE id=$1 FOR UPDATE',[copyId])).rows[0];
    if(copy.estado!=='circulavel'||copy.conservacao==='danificado')fail(409,'Exemplar impedido de circular.');
    const active=Number((await c.query("SELECT count(*) FROM biblioteca_emprestimos WHERE leitor_id=$1 AND estado='ativo'",[readerId])).rows[0].count);
    if(active>=rules.limite)fail(409,'Limite configurado de empréstimos atingido.');
    if((await c.query("SELECT id FROM biblioteca_emprestimos WHERE exemplar_id=$1 AND estado='ativo'",[copyId])).rowCount)fail(409,'Exemplar já emprestado.');
    const first=(await c.query("SELECT id,leitor_id FROM biblioteca_reservas WHERE livro_id=$1 AND estado='aguardando' ORDER BY id LIMIT 1 FOR UPDATE",[initial.livro_id])).rows[0];
    if(first&&first.leitor_id!==readerId)fail(409,'Obra reservada: atenda o primeiro leitor da fila.');
    const result=(await c.query("INSERT INTO biblioteca_emprestimos(leitor_id,exemplar_id,previsto_em) VALUES($1,$2,CURRENT_TIMESTAMP+($3::int*INTERVAL '1 day')) RETURNING id",[readerId,copyId,rules.dias])).rows[0];
    await c.query("INSERT INTO biblioteca_movimentos(emprestimo_id,operador_id,tipo) VALUES($1,$2,'retirada')",[result.id,user.id]);
    if(first)await c.query("UPDATE biblioteca_reservas SET estado='atendida',concluido_em=clock_timestamp(),emprestimo_id=$1,operador_id=$2 WHERE id=$3",[result.id,user.id,first.id]);
    return loan(c,result.id,user);
  });
}
async function returnLoan(pool,loanId,body,user) {
  fields(body,[]);
  return transaction(pool,async(c)=>{
    const initial=await loan(c,loanId,user);await lockBook(c,initial.livro_id);
    await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[initial.leitor_id]);
    const row=(await c.query('SELECT estado FROM biblioteca_emprestimos WHERE id=$1 FOR UPDATE',[id(loanId)])).rows[0];
    if(row.estado!=='ativo')fail(409,'Devolução já registrada.');
    await c.query("UPDATE biblioteca_emprestimos SET estado='devolvido',devolvido_em=clock_timestamp() WHERE id=$1",[id(loanId)]);
    await c.query("INSERT INTO biblioteca_movimentos(emprestimo_id,operador_id,tipo) VALUES($1,$2,'devolucao')",[id(loanId),user.id]);
    return loan(c,loanId,user);
  });
}
module.exports={policy,loan,listLoans,createLoan,returnLoan,lockBook,eligibleReader};
