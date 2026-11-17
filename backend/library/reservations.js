const {fail,fields,text,id,page,pattern,transaction}=require('./common');
const {lockBook,eligibleReader,loan,policy}=require('./circulation');
const select=`SELECT r.id,r.livro_id,l.titulo,r.leitor_id,u.nome AS leitor,r.estado,r.solicitado_em,r.concluido_em,r.emprestimo_id,r.motivo,
  CASE WHEN r.estado='aguardando' THEN (SELECT count(*)::int FROM biblioteca_reservas f WHERE f.livro_id=r.livro_id AND f.estado='aguardando' AND f.id<=r.id) ELSE NULL END AS posicao
  FROM biblioteca_reservas r JOIN biblioteca_livros l ON l.id=r.livro_id JOIN usuarios u ON u.id=r.leitor_id`;
async function reservation(c,reservationId,user) {
  const row=(await c.query(select+' WHERE r.id=$1'+(user.perfil==='aluno'?' AND r.leitor_id=$2':''),user.perfil==='aluno'?[id(reservationId),user.id]:[id(reservationId)])).rows[0];
  if(!row)fail(404,'Reserva não encontrada.');return row;
}
async function listReservations(pool,query,user) {
  const {pagina,limite}=page(query),state=query.estado||'aguardando';
  if(!['aguardando','atendida','cancelada','todas'].includes(state))fail(400,'Estado de reserva inválido.');
  if(user.perfil==='aluno'&&query.leitor_id&&String(query.leitor_id)!==user.id)fail(403,'Consulta restrita ao próprio leitor.');
  const readerId=user.perfil==='aluno'?user.id:query.leitor_id?id(query.leitor_id):null;
  const where=` WHERE ($1::bigint IS NULL OR r.leitor_id=$1) AND (l.titulo ILIKE $2 OR u.nome ILIKE $2)`+(state==='todas'?'':' AND r.estado=$3');
  const params=[readerId,pattern(query.q),...(state==='todas'?[]:[state])];
  const total=Number((await pool.query('SELECT count(*) FROM ('+select+where+') t',params)).rows[0].count);
  return {items:(await pool.query(select+where+` ORDER BY r.id LIMIT $${params.length+1} OFFSET $${params.length+2}`,[...params,limite,(pagina-1)*limite])).rows,total,pagina,limite};
}
async function createReservation(pool,bookId,body,user) {
  fields(body,[]);
  return transaction(pool,async(c)=>{
    await lockBook(c,bookId);await eligibleReader(c,user.id);
    // Reserva é da obra, não de um exemplar. Alocação só acontece numa retirada real.
    if((await c.query("SELECT p.id FROM biblioteca_emprestimos p JOIN biblioteca_exemplares e ON e.id=p.exemplar_id WHERE p.leitor_id=$1 AND e.livro_id=$2 AND p.estado='ativo'",[user.id,id(bookId)])).rowCount)fail(409,'Você já possui empréstimo ativo desta obra.');
    const row=(await c.query('INSERT INTO biblioteca_reservas(livro_id,leitor_id) VALUES($1,$2) RETURNING id',[id(bookId),user.id])).rows[0];
    return reservation(c,row.id,user);
  });
}
async function cancelReservation(pool,reservationId,body,user) {
  fields(body,user.perfil==='aluno'?[]:['motivo']);
  const reason=user.perfil==='aluno'?'Cancelamento pelo leitor':text(body.motivo,300);
  return transaction(pool,async(c)=>{
    const initial=await reservation(c,reservationId,user);await lockBook(c,initial.livro_id);
    await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[initial.leitor_id]);
    const current=(await c.query('SELECT estado FROM biblioteca_reservas WHERE id=$1 FOR UPDATE',[id(reservationId)])).rows[0];
    if(current.estado!=='aguardando')fail(409,'Somente reserva aguardando pode ser cancelada.');
    await c.query("UPDATE biblioteca_reservas SET estado='cancelada',concluido_em=clock_timestamp(),operador_id=$1,motivo=$2 WHERE id=$3",[user.id,reason,id(reservationId)]);
    return reservation(c,reservationId,user);
  });
}
async function renewLoan(pool,loanId,body,user,env) {
  fields(body,[]);const rules=policy(env);
  if(!rules.renovacao_configurada)fail(503,'Renovação requer dias e limite explicitamente configurados pelo responsável.');
  return transaction(pool,async(c)=>{
    const initial=await loan(c,loanId,user);await lockBook(c,initial.livro_id);await eligibleReader(c,user.id);
    await c.query('SELECT id FROM biblioteca_emprestimos WHERE id=$1 FOR UPDATE',[id(loanId)]);
    const current=await loan(c,loanId,user);
    if(current.estado!=='ativo'||current.atrasado)fail(409,'Somente empréstimo ativo dentro do prazo pode ser renovado.');
    if(current.renovacoes>=rules.limite_renovacoes)fail(409,'Limite configurado de renovações atingido.');
    if((await c.query("SELECT id FROM biblioteca_reservas WHERE livro_id=$1 AND estado='aguardando' AND leitor_id<>$2 LIMIT 1",[current.livro_id,user.id])).rowCount)fail(409,'Existe reserva pendente de outro leitor. Renovação não permitida.');
    const next=(await c.query("UPDATE biblioteca_emprestimos SET previsto_em=previsto_em+($1::int*INTERVAL '1 day'),renovacoes=renovacoes+1 WHERE id=$2 RETURNING previsto_em",[rules.dias_renovacao,id(loanId)])).rows[0].previsto_em;
    await c.query("INSERT INTO biblioteca_movimentos(emprestimo_id,operador_id,tipo,prazo_anterior,prazo_novo) VALUES($1,$2,'renovacao',$3,$4)",[id(loanId),user.id,current.previsto_em,next]);
    return loan(c,loanId,user);
  });
}
module.exports={reservation,listReservations,createReservation,cancelReservation,renewLoan};
