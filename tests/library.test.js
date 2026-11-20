const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const { once } = require('node:events');
const { createPool, loadEnvironment } = require('../backend/db/pool');
const { migrate, readMigrations } = require('../scripts/migrate');
const { createApp } = require('../backend/app');
loadEnvironment();
const enabled = process.env.TEST_DATABASE === 'alexandria_test';
const prefix = 'lib-' + randomUUID();
const users = [], books = [];
let pool, app, server, origin, staff, admin, student, other;
function suite(name, action) { test(name, { skip: enabled ? false : 'Banco isolado obrigatório.' }, action); }
function jar() {
  return { cookie: '', token: '', async request(route, method = 'GET', body, csrf = true) {
    const headers = { ...(this.cookie ? { Cookie: this.cookie } : {}) };
    if (method !== 'GET') headers['Content-Type'] = 'application/json';
    if (csrf && this.token) headers['X-CSRF-Token'] = this.token;
    const response = await fetch(origin + route, { method, headers, redirect: 'manual', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const cookie = response.headers.get('set-cookie'); if (cookie) this.cookie = cookie.split(';')[0];
    return response;
  } };
}
async function actor(perfil) {
  const client = jar(), email = prefix + '-' + perfil + '-' + randomUUID() + '@example.invalid';
  const password = randomBytes(24).toString('base64url');
  assert.equal((await client.request('/api/cadastro','POST',{ nome: 'Pessoa fictícia biblioteca', email, password })).status,201);
  const id = (await pool.query('SELECT id FROM usuarios WHERE email=$1',[email])).rows[0].id; users.push(id);
  if (perfil !== 'aluno') { await pool.query('DELETE FROM alunos WHERE usuario_id=$1',[id]); await pool.query('UPDATE usuarios SET perfil=$1 WHERE id=$2',[perfil,id]); }
  assert.equal((await client.request('/login','POST',{ email, password })).status,200);
  client.token = (await (await client.request('/api/csrf')).json()).csrfToken;
  client.id = id; return client;
}
async function book() {
  const response = await staff.request('/api/biblioteca/livros','POST',{ titulo: prefix + ' Livro', autores: [prefix + ' Autor'], categoria: prefix + ' Categoria' });
  assert.equal(response.status,201); const data = await response.json(); books.push(data.id); return data;
}
before(async () => {
  if (!enabled) return;
  assert.equal(process.env.DB_ENV,'test'); assert.equal(process.env.PGDATABASE,'alexandria_test');
  pool = createPool(); await migrate(pool,await readMigrations());
  app = createApp({ getPool: () => pool, cadastroLimit: 200, loginIpLimit: 200, loginAccountLimit: 200,
    authEnv: { NODE_ENV:'test', SESSION_SECRET:randomBytes(48).toString('base64url'), SESSION_COOKIE_SECURE:'false', LIBRARY_LOAN_DAYS:'7', LIBRARY_MAX_LOANS:'20', LIBRARY_RENEWAL_DAYS:'7', LIBRARY_MAX_RENEWALS:'1', LIBRARY_NOTICE_DAYS:'3' } });
  server=app.listen(0,'127.0.0.1');await once(server,'listening');origin='http://127.0.0.1:'+server.address().port;
  staff=await actor('bibliotecario');admin=await actor('administrador');student=await actor('aluno');other=await actor('aluno');
});
after(async () => {
  if (!pool) return;
  await new Promise((resolve) => { server.close(resolve);server.closeAllConnections(); }); await app.locals.closeDatabase();
  try {
    await pool.query('DELETE FROM biblioteca_reservas WHERE livro_id=ANY($1::bigint[])',[books]);
    await pool.query('DELETE FROM biblioteca_movimentos WHERE emprestimo_id IN (SELECT p.id FROM biblioteca_emprestimos p JOIN biblioteca_exemplares e ON e.id=p.exemplar_id WHERE e.livro_id=ANY($1::bigint[]))',[books]);
    await pool.query('DELETE FROM biblioteca_emprestimos WHERE exemplar_id IN (SELECT id FROM biblioteca_exemplares WHERE livro_id=ANY($1::bigint[]))',[books]);
    await pool.query('DELETE FROM biblioteca_exemplar_eventos WHERE exemplar_id IN (SELECT id FROM biblioteca_exemplares WHERE livro_id=ANY($1::bigint[]))',[books]);
    await pool.query('DELETE FROM biblioteca_exemplares WHERE livro_id=ANY($1::bigint[])',[books]);
    await pool.query('DELETE FROM biblioteca_livros_autores WHERE livro_id=ANY($1::bigint[])',[books]);
    await pool.query('DELETE FROM biblioteca_livros WHERE id=ANY($1::bigint[])',[books]);
    await pool.query('DELETE FROM biblioteca_autores WHERE nome LIKE $1',[prefix+'%']);await pool.query('DELETE FROM biblioteca_categorias WHERE nome LIKE $1',[prefix+'%']);
    await pool.query("DELETE FROM sessoes WHERE sess->>'userId'=ANY($1::text[])",[users]);
    await pool.query('DELETE FROM biblioteca_leitores WHERE usuario_id=ANY($1::bigint[])',[users]);
    await pool.query('DELETE FROM alunos WHERE usuario_id=ANY($1::bigint[])',[users]);await pool.query('DELETE FROM usuarios WHERE id=ANY($1::bigint[])',[users]);
  } finally { await pool.end(); }
});
suite('2.1 catálogo exige sessão e mutações exigem perfil e CSRF',async () => {
  assert.equal((await jar().request('/api/biblioteca/livros')).status,401);
  assert.equal((await student.request('/api/biblioteca/livros','POST',{})).status,403);
  assert.equal((await staff.request('/api/biblioteca/livros','POST',{},false)).status,403);
  assert.equal((await admin.request('/api/biblioteca/livros','POST',{})).status,400);
});
suite('2.1 cadastro, consulta e filtros reais com paginação',async () => {
  const data=await book(); assert.equal(data.total_exemplares,0);assert.deepEqual(data.autores,[prefix+' Autor']);
  const route='/api/biblioteca/livros?q='+encodeURIComponent(prefix)+'&autor='+encodeURIComponent(prefix)+'&categoria='+encodeURIComponent(prefix)+'&limite=1';
  const list=await (await student.request(route)).json(); assert.equal(list.items.length,1);assert.equal(list.limite,1);assert.ok(list.total>=1);
  assert.equal((await student.request('/api/biblioteca/livros/'+data.id)).status,200);
  assert.equal((await student.request('/api/biblioteca/livros?limite=1000')).status,400);
  assert.equal((await student.request('/api/biblioteca/livros/invalid')).status,400);
  const injected=await (await student.request('/api/biblioteca/livros?q='+encodeURIComponent("' OR 1=1 --"))).json();assert.equal(injected.total,0);
});
suite('2.1 edição detecta versão antiga sem perder dados',async () => {
  const data=await book();const input={titulo:prefix+' Editado',autores:data.autores,categoria:data.categoria,versao:data.versao};
  assert.equal((await admin.request('/api/biblioteca/livros/'+data.id,'PUT',input)).status,200);
  assert.equal((await staff.request('/api/biblioteca/livros/'+data.id,'PUT',input)).status,409);
  assert.equal((await (await student.request('/api/biblioteca/livros/'+data.id)).json()).titulo,input.titulo);
});
suite('2.1 patrimônio único, estados validados e obra distinta de exemplar',async () => {
  const data=await book();const route='/api/biblioteca/livros/'+data.id+'/exemplares';
  const response=await staff.request(route,'POST',{patrimonio:prefix+'-P1'});assert.equal(response.status,201);const copy=await response.json();
  assert.equal((await staff.request(route,'POST',{patrimonio:prefix+'-P1'})).status,409);
  assert.equal((await student.request(route,'POST',{patrimonio:prefix+'-P2'})).status,403);
  assert.equal((await staff.request('/api/biblioteca/exemplares/'+copy.id,'PUT',{estado:'ilegal',versao:copy.versao})).status,400);
  assert.equal((await staff.request('/api/biblioteca/exemplares/'+copy.id,'PUT',{estado:'manutencao',conservacao:'regular',motivo:'Revisao ficticia QA',versao:copy.versao})).status,200);
  const updated=await (await student.request('/api/biblioteca/livros/'+data.id)).json();assert.equal(updated.total_exemplares,1);assert.equal(updated.circulaveis,0);
  assert.equal((await (await student.request(route)).json()).items.length,1);
});
suite('2.1 validação rejeita campos de privilégio, autores repetidos e livro incompleto',async () => {
  for (const data of [{titulo:'x'},{titulo:'x',autores:['a','A'],categoria:'c'},{titulo:'x',autores:['a'],categoria:'c',perfil:'administrador'}]) assert.equal((await staff.request('/api/biblioteca/livros','POST',data)).status,400);
});

suite('2.2 perfil próprio não aceita acesso horizontal e lista é restrita a equipe',async () => {
  assert.equal((await student.request('/api/biblioteca/leitores')).status,403);
  assert.equal((await student.request('/api/biblioteca/leitores/'+other.id)).status,403);
  const mine=await (await student.request('/api/biblioteca/meu-perfil?id='+other.id)).json();
  assert.equal(mine.id,student.id);assert.equal(Object.hasOwn(mine,'senha_hash'),false);
  assert.equal((await staff.request('/api/biblioteca/meu-perfil')).status,403);
  const list=await (await staff.request('/api/biblioteca/leitores?limite=2')).json();assert.ok(list.items.length<=2);
  assert.ok(list.items.every((r)=>!Object.hasOwn(r,'email')&&!Object.hasOwn(r,'senha_hash')));
  assert.equal((await admin.request('/api/biblioteca/leitores/'+student.id)).status,200);
});
suite('2.2 atualizar vínculo não altera perfil, exige CSRF e detecta versão antiga',async () => {
  const data=await (await staff.request('/api/biblioteca/leitores/'+student.id)).json();
  const input={nome:'Leitor fictício atualizado',ra:prefix+'-RA',curso:'Curso fictício',habilitado:true,versao:data.versao};
  assert.equal((await staff.request('/api/biblioteca/leitores/'+student.id,'PUT',input,false)).status,403);
  assert.equal((await staff.request('/api/biblioteca/leitores/'+student.id,'PUT',input)).status,200);
  assert.equal((await staff.request('/api/biblioteca/leitores/'+student.id,'PUT',input)).status,409);
  assert.equal((await student.request('/api/biblioteca/leitores/'+student.id,'PUT',input)).status,403);
  assert.equal((await pool.query('SELECT perfil FROM usuarios WHERE id=$1',[student.id])).rows[0].perfil,'aluno');
  assert.equal((await (await student.request('/api/biblioteca/meu-perfil')).json()).ra,input.ra);
});
suite('2.2 cadastro administrativo reaproveita cadastro aluno e recusa promoção',async () => {
  const email=prefix+'-administrativo@example.invalid';
  const data={nome:'Cadastro administrativo fictício',email,password:randomBytes(24).toString('base64url')};
  assert.equal((await student.request('/api/biblioteca/leitores','POST',data)).status,403);
  assert.equal((await staff.request('/api/biblioteca/leitores','POST',{...data,perfil:'administrador'})).status,400);
  const response=await admin.request('/api/biblioteca/leitores','POST',data);assert.equal(response.status,201);
  const row=(await pool.query('SELECT id,perfil FROM usuarios WHERE email=$1',[email])).rows[0];users.push(row.id);assert.equal(row.perfil,'aluno');
  assert.equal((await admin.request('/api/me')).status,200); // A conta da equipe não foi substituída pela criada.
});

async function physical() {
  const work=await book();
  const response=await staff.request('/api/biblioteca/livros/'+work.id+'/exemplares','POST',{patrimonio:prefix+'-'+randomUUID()});
  assert.equal(response.status,201);return {work,copy:await response.json()};
}
suite('2.3 retirada e devolução reais, CSRF, histórico e proteção horizontal',async()=>{
  const {work,copy}=await physical(),input={leitor_id:student.id,exemplar_id:copy.id};
  assert.equal((await student.request('/api/biblioteca/emprestimos','POST',input)).status,403);
  assert.equal((await staff.request('/api/biblioteca/emprestimos','POST',input,false)).status,403);
  const created=await staff.request('/api/biblioteca/emprestimos','POST',input);assert.equal(created.status,201);const row=await created.json();
  assert.equal(row.estado,'ativo');assert.equal(row.leitor_id,student.id);assert.ok(new Date(row.previsto_em)>new Date(row.retirado_em));
  assert.equal((await other.request('/api/biblioteca/emprestimos/'+row.id)).status,404);
  assert.equal((await other.request('/api/biblioteca/emprestimos?leitor_id='+student.id)).status,403);
  assert.equal((await (await student.request('/api/biblioteca/emprestimos')).json()).items.some((v)=>v.id===row.id),true);
  assert.equal((await (await student.request('/api/biblioteca/livros/'+work.id)).json()).disponiveis,0);
  assert.equal((await staff.request('/api/biblioteca/exemplares/'+copy.id,'PUT',{estado:'baixado',conservacao:'bom',motivo:'Revisao ficticia QA',versao:copy.versao})).status,409);
  assert.equal((await student.request('/api/biblioteca/emprestimos/'+row.id+'/devolucao','POST',{})).status,403);
  assert.equal((await admin.request('/api/biblioteca/emprestimos/'+row.id+'/devolucao','POST',{})).status,201);
  assert.equal((await staff.request('/api/biblioteca/emprestimos/'+row.id+'/devolucao','POST',{})).status,409);
  const history=await (await student.request('/api/biblioteca/emprestimos?estado=historico')).json();assert.ok(history.items.some((v)=>v.id===row.id&&v.devolvido_em));
  assert.equal((await (await student.request('/api/biblioteca/livros/'+work.id)).json()).disponiveis,1);
});
suite('2.3 concorrência: somente uma retirada do mesmo exemplar é confirmada',async()=>{
  const {copy}=await physical();
  const responses=await Promise.all([staff.request('/api/biblioteca/emprestimos','POST',{leitor_id:student.id,exemplar_id:copy.id}),admin.request('/api/biblioteca/emprestimos','POST',{leitor_id:other.id,exemplar_id:copy.id})]);
  assert.deepEqual(responses.map((r)=>r.status).sort(),[201,409]);
  const row=await responses.find((r)=>r.status===201).json();
  assert.equal(Number((await pool.query("SELECT count(*) FROM biblioteca_emprestimos WHERE exemplar_id=$1 AND estado='ativo'",[copy.id])).rows[0].count),1);
  await staff.request('/api/biblioteca/emprestimos/'+row.id+'/devolucao','POST',{});
});
suite('2.3 impedimentos, configuração ausente e rollback de falha intermediária',async()=>{
  const {copy,work}=await physical();const {createLoan}=require('../backend/library/circulation');
  const input={leitor_id:student.id,exemplar_id:copy.id};
  await assert.rejects(()=>createLoan(pool,input,{id:staff.id,perfil:'bibliotecario'},{}),(e)=>e.status===503);
  await assert.rejects(()=>createLoan(pool,input,{id:'9223372036854775806',perfil:'bibliotecario'},{LIBRARY_LOAN_DAYS:'7',LIBRARY_MAX_LOANS:'20'}));
  assert.equal(Number((await pool.query('SELECT count(*) FROM biblioteca_emprestimos WHERE exemplar_id=$1',[copy.id])).rows[0].count),0);
  assert.equal((await (await student.request('/api/biblioteca/livros/'+work.id)).json()).disponiveis,1);
  await staff.request('/api/biblioteca/exemplares/'+copy.id,'PUT',{estado:'manutencao',conservacao:'bom',motivo:'Revisao ficticia QA',versao:copy.versao});
  assert.equal((await staff.request('/api/biblioteca/emprestimos','POST',input)).status,409);
  const fresh=await physical();
  const reader=await (await staff.request('/api/biblioteca/leitores/'+other.id)).json();
  const edit={nome:reader.nome,ra:reader.ra,curso:reader.curso,habilitado:false,versao:reader.versao};
  await staff.request('/api/biblioteca/leitores/'+other.id,'PUT',edit);
  assert.equal((await staff.request('/api/biblioteca/emprestimos','POST',{leitor_id:other.id,exemplar_id:fresh.copy.id})).status,409);
  await staff.request('/api/biblioteca/leitores/'+other.id,'PUT',{...edit,habilitado:true,versao:reader.versao+1});
});
suite('2.3 limite por leitor serializa retiradas em obras diferentes',async()=>{
  const a=await physical(),b=await physical();const {createLoan}=require('../backend/library/circulation');
  const rules={LIBRARY_LOAN_DAYS:'7',LIBRARY_MAX_LOANS:'1'},operator={id:staff.id,perfil:'bibliotecario'};
  const results=await Promise.allSettled([createLoan(pool,{leitor_id:other.id,exemplar_id:a.copy.id},operator,rules),createLoan(pool,{leitor_id:other.id,exemplar_id:b.copy.id},operator,rules)]);
  assert.equal(results.filter((r)=>r.status==='fulfilled').length,1);assert.equal(results.find((r)=>r.status==='rejected').reason.status,409);
  await staff.request('/api/biblioteca/emprestimos/'+results.find((r)=>r.status==='fulfilled').value.id+'/devolucao','POST',{});
});
suite('2.3 atrasos são calculados pelo prazo e não por contador editável',async()=>{
  const {copy}=await physical();const row=await (await staff.request('/api/biblioteca/emprestimos','POST',{leitor_id:student.id,exemplar_id:copy.id})).json();
  await pool.query("UPDATE biblioteca_emprestimos SET retirado_em=CURRENT_TIMESTAMP-INTERVAL '10 days',previsto_em=CURRENT_TIMESTAMP-INTERVAL '1 day' WHERE id=$1",[row.id]);
  const data=await (await student.request('/api/biblioteca/emprestimos?estado=atrasados')).json();assert.ok(data.items.some((v)=>v.id===row.id&&v.atrasado));
  await staff.request('/api/biblioteca/emprestimos/'+row.id+'/devolucao','POST',{});
});

suite('2.4 reserva é da obra, fila real, duplicidade e acesso horizontal protegidos',async()=>{
  const work=await book(),route='/api/biblioteca/livros/'+work.id+'/reservas';
  assert.equal((await staff.request(route,'POST',{})).status,403);
  assert.equal((await student.request(route,'POST',{},false)).status,403);
  assert.equal((await student.request(route,'POST',{leitor_id:other.id})).status,400);
  const a=await (await student.request(route,'POST',{})).json(),b=await (await other.request(route,'POST',{})).json();
  assert.equal(a.posicao,1);assert.equal(b.posicao,2);assert.equal(a.estado,'aguardando');assert.equal(a.emprestimo_id,null);
  assert.equal((await student.request(route,'POST',{})).status,409);
  assert.equal((await student.request('/api/biblioteca/reservas/'+b.id)).status,404);
  assert.equal((await student.request('/api/biblioteca/reservas/'+b.id+'/cancelamento','POST',{})).status,404);
  assert.equal((await student.request('/api/biblioteca/reservas?leitor_id='+other.id)).status,403);
  assert.equal((await student.request('/api/biblioteca/reservas/'+a.id+'/cancelamento','POST',{})).status,201);
  assert.equal((await (await other.request('/api/biblioteca/reservas/'+b.id)).json()).posicao,1);
  assert.equal((await staff.request('/api/biblioteca/reservas/'+b.id+'/cancelamento','POST',{})).status,400);
  assert.equal((await admin.request('/api/biblioteca/reservas/'+b.id+'/cancelamento','POST',{motivo:'Teste fictício de cancelamento'})).status,201);
  assert.equal((await other.request('/api/biblioteca/reservas/'+b.id+'/cancelamento','POST',{})).status,409);
});
suite('2.4 retirada respeita fila e aloca exemplar à reserva atomicamente',async()=>{
  const {work,copy}=await physical(),route='/api/biblioteca/livros/'+work.id+'/reservas';
  const first=await (await student.request(route,'POST',{})).json(),second=await (await other.request(route,'POST',{})).json();
  assert.equal((await staff.request('/api/biblioteca/emprestimos','POST',{leitor_id:other.id,exemplar_id:copy.id})).status,409);
  const response=await staff.request('/api/biblioteca/emprestimos','POST',{leitor_id:student.id,exemplar_id:copy.id});assert.equal(response.status,201);const borrowed=await response.json();
  const served=await (await student.request('/api/biblioteca/reservas/'+first.id)).json();assert.equal(served.estado,'atendida');assert.equal(served.emprestimo_id,borrowed.id);
  assert.equal((await student.request(route,'POST',{})).status,409); // Já possui a obra emprestada.
  assert.equal((await student.request('/api/biblioteca/reservas/'+first.id+'/cancelamento','POST',{})).status,409);
  assert.equal((await (await other.request('/api/biblioteca/reservas/'+second.id)).json()).posicao,1);
  await staff.request('/api/biblioteca/emprestimos/'+borrowed.id+'/devolucao','POST',{});
  const next=await (await admin.request('/api/biblioteca/emprestimos','POST',{leitor_id:other.id,exemplar_id:copy.id})).json();
  assert.equal((await (await other.request('/api/biblioteca/reservas/'+second.id)).json()).estado,'atendida');
  await staff.request('/api/biblioteca/emprestimos/'+next.id+'/devolucao','POST',{});
});
suite('2.4 renovação própria recusa reserva prioritária e limita corrida concorrente',async()=>{
  const {work,copy}=await physical();const borrowed=await (await staff.request('/api/biblioteca/emprestimos','POST',{leitor_id:student.id,exemplar_id:copy.id})).json();
  const route='/api/biblioteca/emprestimos/'+borrowed.id+'/renovacao';
  assert.equal((await other.request(route,'POST',{})).status,404);
  assert.equal((await staff.request(route,'POST',{})).status,403);
  assert.equal((await student.request(route,'POST',{},false)).status,403);
  const pending=await (await other.request('/api/biblioteca/livros/'+work.id+'/reservas','POST',{})).json();
  assert.equal((await student.request(route,'POST',{})).status,409);
  await other.request('/api/biblioteca/reservas/'+pending.id+'/cancelamento','POST',{});
  const responses=await Promise.all([student.request(route,'POST',{}),student.request(route,'POST',{})]);
  assert.deepEqual(responses.map((r)=>r.status).sort(),[201,409]);
  const renewed=await responses.find((r)=>r.status===201).json();assert.equal(renewed.renovacoes,1);assert.ok(new Date(renewed.previsto_em)>new Date(borrowed.previsto_em));
  assert.equal(Number((await pool.query("SELECT count(*) FROM biblioteca_movimentos WHERE emprestimo_id=$1 AND tipo='renovacao'",[borrowed.id])).rows[0].count),1);
  await staff.request('/api/biblioteca/emprestimos/'+borrowed.id+'/devolucao','POST',{});
  assert.equal((await student.request(route,'POST',{})).status,409);
});
suite('2.4 reserva duplicada concorrente e rollback preservam fila e empréstimo',async()=>{
  const {work,copy}=await physical(),route='/api/biblioteca/livros/'+work.id+'/reservas';
  const responses=await Promise.all([student.request(route,'POST',{}),student.request(route,'POST',{})]);assert.deepEqual(responses.map((r)=>r.status).sort(),[201,409]);
  const reservation=await responses.find((r)=>r.status===201).json();
  const {createLoan}=require('../backend/library/circulation');
  await assert.rejects(()=>createLoan(pool,{leitor_id:student.id,exemplar_id:copy.id},{id:'9223372036854775806',perfil:'bibliotecario'},{LIBRARY_LOAN_DAYS:'7',LIBRARY_MAX_LOANS:'20'}));
  const current=await (await student.request('/api/biblioteca/reservas/'+reservation.id)).json();assert.equal(current.estado,'aguardando');assert.equal(current.posicao,1);assert.equal(current.emprestimo_id,null);
  assert.equal(Number((await pool.query('SELECT count(*) FROM biblioteca_emprestimos WHERE exemplar_id=$1',[copy.id])).rows[0].count),0);
  await student.request('/api/biblioteca/reservas/'+reservation.id+'/cancelamento','POST',{});
});
suite('2.4 cancelamento concorrente ao atendimento mantém transição consistente',async()=>{
  const {work,copy}=await physical();const reserved=await (await student.request('/api/biblioteca/livros/'+work.id+'/reservas','POST',{})).json();
  const [cancel,withdrawal]=await Promise.all([student.request('/api/biblioteca/reservas/'+reserved.id+'/cancelamento','POST',{}),staff.request('/api/biblioteca/emprestimos','POST',{leitor_id:student.id,exemplar_id:copy.id})]);
  assert.equal(withdrawal.status,201);assert.ok([201,409].includes(cancel.status));const borrowed=await withdrawal.json();
  const final=await (await student.request('/api/biblioteca/reservas/'+reserved.id)).json();
  if(cancel.status===201){assert.equal(final.estado,'cancelada');assert.equal(final.emprestimo_id,null);}else{assert.equal(final.estado,'atendida');assert.equal(final.emprestimo_id,borrowed.id);}
  await staff.request('/api/biblioteca/emprestimos/'+borrowed.id+'/devolucao','POST',{});
});
suite('2.4 renovação recusa atraso e política ausente sem alterar o prazo',async()=>{
  const {copy}=await physical();const row=await (await staff.request('/api/biblioteca/emprestimos','POST',{leitor_id:student.id,exemplar_id:copy.id})).json();
  const {renewLoan}=require('../backend/library/reservations');
  await assert.rejects(()=>renewLoan(pool,row.id,{}, {id:student.id,perfil:'aluno'},{}),(e)=>e.status===503);
  await pool.query("UPDATE biblioteca_emprestimos SET retirado_em=CURRENT_TIMESTAMP-INTERVAL '10 days',previsto_em=CURRENT_TIMESTAMP-INTERVAL '1 day' WHERE id=$1",[row.id]);
  assert.equal((await student.request('/api/biblioteca/emprestimos/'+row.id+'/renovacao','POST',{})).status,409);
  assert.equal((await (await student.request('/api/biblioteca/emprestimos/'+row.id)).json()).renovacoes,0);
  await staff.request('/api/biblioteca/emprestimos/'+row.id+'/devolucao','POST',{});
});

suite('Sprint segurança: origem cruzada, JSON excessivo e campos de atualização incompletos',async()=>{
  const cross=await fetch(origin+'/api/biblioteca/livros',{method:'POST',headers:{Cookie:staff.cookie,'X-CSRF-Token':staff.token,'Content-Type':'application/json',Origin:'https://example.invalid'},body:'{}'});assert.equal(cross.status,403);
  assert.equal((await staff.request('/api/biblioteca/livros','POST',{titulo:'x'.repeat(20000),autores:['a'],categoria:'c'})).status,413);
  const {copy}=await physical();assert.equal((await staff.request('/api/biblioteca/exemplares/'+copy.id,'PUT',{versao:copy.versao})).status,400);
  assert.equal((await staff.request('/api/biblioteca/emprestimos','POST',{leitor_id:Number.MAX_SAFE_INTEGER+1,exemplar_id:copy.id})).status,400);
  assert.equal((await student.request('/api/biblioteca/livros?limite[]=1')).status,400);
  const wildcard=await (await student.request('/api/biblioteca/livros?q=%25')).json();assert.equal(wildcard.total,0);
});

test('2.5 antecedência não é presumida nem ativa canais externos',()=>{
  const {noticePolicy}=require('../backend/library/notices');
  assert.deepEqual(noticePolicy({}),{antecedencia_dias:null,antecedencia_configurada:false,canais_externos:false});
  for(const value of ['-1','x','1.5','366'])assert.equal(noticePolicy({LIBRARY_NOTICE_DAYS:value}).antecedencia_configurada,false);
  assert.equal(noticePolicy({LIBRARY_NOTICE_DAYS:'0'}).antecedencia_dias,0);
});
suite('2.5 avisos exigem sessão, recusam acesso horizontal e filtros inválidos',async()=>{
  assert.equal((await jar().request('/api/biblioteca/avisos')).status,401);
  assert.equal((await student.request('/api/biblioteca/avisos?leitor_id='+other.id)).status,403);
  assert.equal((await student.request('/api/biblioteca/avisos?tipo=invalido')).status,400);
  assert.equal((await staff.request('/api/biblioteca/avisos?limite=500')).status,400);
  assert.equal((await student.request('/api/biblioteca/avisos','POST',{})).status,404);
});
suite('2.5 avisos reais paginados não duplicam e separam leitores',async()=>{
  const a=await physical(),b=await physical(),reserved=await book();
  const ownLoan=await (await staff.request('/api/biblioteca/emprestimos','POST',{leitor_id:student.id,exemplar_id:a.copy.id})).json();
  const otherLoan=await (await staff.request('/api/biblioteca/emprestimos','POST',{leitor_id:other.id,exemplar_id:b.copy.id})).json();
  await pool.query("UPDATE biblioteca_emprestimos SET retirado_em=CURRENT_TIMESTAMP-INTERVAL '10 days',previsto_em=CURRENT_TIMESTAMP+INTERVAL '2 days' WHERE id=$1",[ownLoan.id]);
  await pool.query("UPDATE biblioteca_emprestimos SET retirado_em=CURRENT_TIMESTAMP-INTERVAL '10 days',previsto_em=CURRENT_TIMESTAMP-INTERVAL '1 day' WHERE id=$1",[otherLoan.id]);
  const reservation=await (await student.request('/api/biblioteca/livros/'+reserved.id+'/reservas','POST',{})).json();
  const mine=await (await student.request('/api/biblioteca/avisos')).json();
  assert.equal(mine.politica.antecedencia_dias,3);assert.equal(mine.total,2);
  assert.ok(mine.items.every((n)=>n.leitor_id===student.id&&!Object.hasOwn(n,'email')&&!Object.hasOwn(n,'senha_hash')));
  assert.ok(mine.items.some((n)=>n.id==='emprestimo:'+ownLoan.id&&n.tipo==='proximo'));
  assert.ok(mine.items.some((n)=>n.id==='reserva:'+reservation.id&&n.posicao===1));
  assert.equal(new Set(mine.items.map((n)=>n.id)).size,mine.items.length);
  const repeat=await (await student.request('/api/biblioteca/avisos')).json();assert.deepEqual(repeat.items.map((n)=>n.id),mine.items.map((n)=>n.id));
  const paged=await (await student.request('/api/biblioteca/avisos?limite=1&pagina=2')).json();assert.equal(paged.items.length,1);assert.equal(paged.total,2);
  const team=await (await admin.request('/api/biblioteca/avisos?tipo=atrasado')).json();assert.ok(team.items.some((n)=>n.id==='emprestimo:'+otherLoan.id));
  const {listNotices}=require('../backend/library/notices');
  const noLead=await listNotices(pool,{}, {id:student.id,perfil:'aluno'},{});assert.equal(noLead.items.some((n)=>n.tipo==='proximo'),false);assert.ok(noLead.items.some((n)=>n.tipo==='reserva'));
  const overdueNoLead=await listNotices(pool,{}, {id:other.id,perfil:'aluno'},{});assert.ok(overdueNoLead.items.some((n)=>n.tipo==='atrasado'));
  await student.request('/api/biblioteca/reservas/'+reservation.id+'/cancelamento','POST',{});
  for(const row of [ownLoan,otherLoan])await staff.request('/api/biblioteca/emprestimos/'+row.id+'/devolucao','POST',{});
});
suite('2.5 renovação e devolução atualizam avisos sem registros obsoletos',async()=>{
  const {copy}=await physical();const row=await (await staff.request('/api/biblioteca/emprestimos','POST',{leitor_id:student.id,exemplar_id:copy.id})).json();
  await pool.query("UPDATE biblioteca_emprestimos SET retirado_em=CURRENT_TIMESTAMP-INTERVAL '5 days',previsto_em=CURRENT_TIMESTAMP+INTERVAL '1 day' WHERE id=$1",[row.id]);
  const hasNotice=async()=> (await (await student.request('/api/biblioteca/avisos')).json()).items.some((n)=>n.id==='emprestimo:'+row.id);
  assert.equal(await hasNotice(),true);
  assert.equal((await student.request('/api/biblioteca/emprestimos/'+row.id+'/renovacao','POST',{})).status,201);
  assert.equal(await hasNotice(),false);
  await pool.query("UPDATE biblioteca_emprestimos SET retirado_em=CURRENT_TIMESTAMP-INTERVAL '10 days',previsto_em=CURRENT_TIMESTAMP-INTERVAL '1 day' WHERE id=$1",[row.id]);
  assert.equal(await hasNotice(),true);
  await staff.request('/api/biblioteca/emprestimos/'+row.id+'/devolucao','POST',{});
  assert.equal(await hasNotice(),false);
});
suite('2.5 cancelamento e atendimento removem somente avisos de reservas pendentes',async()=>{
  const {work,copy}=await physical();const route='/api/biblioteca/livros/'+work.id+'/reservas';
  const first=await (await student.request(route,'POST',{})).json();
  await student.request('/api/biblioteca/reservas/'+first.id+'/cancelamento','POST',{});
  const second=await (await student.request(route,'POST',{})).json();
  const has=async(res)=>(await (await student.request('/api/biblioteca/avisos?tipo=reserva')).json()).items.some((n)=>n.id==='reserva:'+res.id);
  assert.equal(await has(first),false);assert.equal(await has(second),true);
  const row=await (await staff.request('/api/biblioteca/emprestimos','POST',{leitor_id:student.id,exemplar_id:copy.id})).json();
  assert.equal(await has(second),false);
  await staff.request('/api/biblioteca/emprestimos/'+row.id+'/devolucao','POST',{});
});

suite('FINAL.1 resumo exige equipe e retorna particao fisica sem dados pessoais',async()=>{
 assert.equal((await jar().request('/api/biblioteca/resumo')).status,401);
 assert.equal((await student.request('/api/biblioteca/resumo')).status,403);
 assert.equal((await admin.request('/api/biblioteca/resumo?segredo=1')).status,400);
 const r=await staff.request('/api/biblioteca/resumo');assert.equal(r.status,200);const v=await r.json();
 assert.equal(v.total_exemplares,v.disponiveis+v.emprestados+v.indisponiveis);
 for(const [key,value]of Object.entries(v))if(key!=='atualizado_em')assert.ok(Number.isSafeInteger(value)&&value>=0,key);
 assert.equal(Object.hasOwn(v,'email'),false);assert.equal(Object.hasOwn(v,'senha_hash'),false);
});
suite('FINAL.1 ano e sinopse persistem, validam faixas e preservam cliente antigo',async()=>{
 const input={titulo:prefix+' Metadados',autores:['Autor QA'],categoria:'QA',ano:2001,sinopse:'Sinopse ficticia'};
 const created=await staff.request('/api/biblioteca/livros','POST',input);assert.equal(created.status,201);const work=await created.json();books.push(work.id);
 assert.equal(work.ano,2001);assert.equal(work.sinopse,input.sinopse);
 for(const extra of [{ano:0},{ano:10000},{ano:'x'},{sinopse:'x'.repeat(4001)}])assert.equal((await staff.request('/api/biblioteca/livros','POST',{...input,...extra})).status,400);
 const old={titulo:input.titulo,autores:input.autores,categoria:input.categoria,versao:work.versao};
 const edited=await staff.request('/api/biblioteca/livros/'+work.id,'PUT',old);assert.equal(edited.status,200);const next=await edited.json();assert.equal(next.ano,2001);assert.equal(next.sinopse,input.sinopse);
 assert.equal((await student.request('/api/biblioteca/livros/'+work.id)).status,200);
});
suite('FINAL.1 manutencao e baixa exigem motivo, auditam operador e conservam historico',async()=>{
 const {work,copy}=await physical(),url='/api/biblioteca/exemplares/'+copy.id;
 assert.equal((await student.request(url+'/historico')).status,403);
 assert.equal((await staff.request(url,'PUT',{estado:'manutencao',conservacao:'bom',versao:1})).status,400);
 assert.equal((await staff.request(url,'PUT',{estado:'manutencao',conservacao:'bom',versao:1,motivo:'Revisao QA'})).status,200);
 assert.equal((await staff.request('/api/biblioteca/emprestimos','POST',{leitor_id:student.id,exemplar_id:copy.id})).status,409);
 const calls=await Promise.all(['circulavel','baixado'].map(estado=>staff.request(url,'PUT',{estado,conservacao:'bom',versao:2,motivo:'Concorrencia QA'})));
 assert.deepEqual(calls.map(r=>r.status).sort(),[200,409]);
 const history=await (await staff.request(url+'/historico')).json();assert.equal(history.total,3);assert.equal(history.items.filter(x=>x.tipo==='entrada').length,1);assert.ok(history.items.every(x=>x.operador&&x.motivo));
 assert.equal((await (await staff.request('/api/biblioteca/livros/'+work.id)).json()).total_exemplares,1);
});
suite('FINAL.1 cinco obras sete exemplares: entrada, retirada, renovacao, fila e devolucao consistentes',async()=>{
 const a=await actor('aluno'),b=await actor('aluno');const works=[];
 for(let i=0;i<5;i++)works.push(await book());
 const copies=[];
 for(let i=0;i<7;i++){const work=works[i<3?0:i-2];const r=await staff.request('/api/biblioteca/livros/'+work.id+'/exemplares','POST',{patrimonio:prefix+'-FINAL-'+i});assert.equal(r.status,201);copies.push(await r.json());}
 const summary=async()=>{const r=await staff.request('/api/biblioteca/resumo');assert.equal(r.status,200);return r.json();};
 const start=await summary();assert.equal(start.total_exemplares,start.disponiveis+start.emprestados+start.indisponiveis);
 const added=await staff.request('/api/biblioteca/livros/'+works[0].id+'/exemplares','POST',{patrimonio:prefix+'-FINAL-extra'});assert.equal(added.status,201);
 let current=await summary();assert.equal(current.total_exemplares,start.total_exemplares+1);assert.equal(current.disponiveis,start.disponiveis+1);
 const create=await staff.request('/api/biblioteca/emprestimos','POST',{leitor_id:a.id,exemplar_id:copies[0].id});assert.equal(create.status,201);const loan=await create.json();
 current=await summary();assert.equal(current.total_exemplares,start.total_exemplares+1);assert.equal(current.disponiveis,start.disponiveis);assert.equal(current.emprestados,start.emprestados+1);
 assert.equal((await staff.request('/api/biblioteca/exemplares/'+copies[0].id,'PUT',{estado:'baixado',conservacao:'bom',versao:1,motivo:'Tentativa QA'})).status,409);
 assert.equal((await staff.request('/api/biblioteca/emprestimos','POST',{leitor_id:b.id,exemplar_id:copies[0].id})).status,409);
 assert.equal((await a.request('/api/biblioteca/emprestimos/'+loan.id)).status,200);assert.equal((await b.request('/api/biblioteca/emprestimos/'+loan.id)).status,404);
 assert.equal((await a.request('/api/biblioteca/emprestimos/'+loan.id+'/renovacao','POST',{})).status,201);
 assert.equal((await b.request('/api/biblioteca/livros/'+works[0].id+'/reservas','POST',{})).status,201);
 assert.equal((await a.request('/api/biblioteca/emprestimos/'+loan.id+'/renovacao','POST',{})).status,409);
 assert.equal((await staff.request('/api/biblioteca/emprestimos','POST',{leitor_id:a.id,exemplar_id:copies[1].id})).status,409);
 assert.equal((await staff.request('/api/biblioteca/emprestimos/'+loan.id+'/devolucao','POST',{})).status,201);
 assert.equal((await staff.request('/api/biblioteca/emprestimos/'+loan.id+'/devolucao','POST',{})).status,409);
 current=await summary();assert.equal(current.emprestados,start.emprestados);assert.equal(current.disponiveis,start.disponiveis+1);
 assert.equal((await staff.request('/api/biblioteca/emprestimos','POST',{leitor_id:b.id,exemplar_id:copies[0].id})).status,201);
 const queue=await (await b.request('/api/biblioteca/reservas?estado=atendida')).json();assert.ok(queue.items.some(x=>x.livro_id===works[0].id));
 const own=await (await a.request('/api/biblioteca/emprestimos?estado=historico')).json();assert.ok(own.items.some(x=>x.id===loan.id));
 const notices=await (await a.request('/api/biblioteca/avisos')).json();assert.ok(!notices.items.some(x=>x.recurso_id===loan.id&&x.recurso==='emprestimo'));
 assert.equal((await a.request('/logout','POST',{})).status,200);assert.equal((await a.request('/painel/')).status,401);
});
suite('FINAL.1 falha ao auditar exemplar desfaz estado e versao na mesma transacao',async()=>{
 const {copy}=await physical();
 await pool.query("CREATE FUNCTION final1_reject_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.motivo='Rollback QA' THEN RAISE EXCEPTION 'Falha controlada QA'; END IF; RETURN NEW; END; $$");
 await pool.query('CREATE TRIGGER final1_reject_event BEFORE INSERT ON biblioteca_exemplar_eventos FOR EACH ROW EXECUTE FUNCTION final1_reject_event()');
 try{
  assert.equal((await staff.request('/api/biblioteca/exemplares/'+copy.id,'PUT',{estado:'baixado',conservacao:'bom',versao:1,motivo:'Rollback QA'})).status,500);
  const row=(await pool.query('SELECT estado,versao FROM biblioteca_exemplares WHERE id=$1',[copy.id])).rows[0];assert.equal(row.estado,'circulavel');assert.equal(row.versao,1);
  assert.equal((await (await staff.request('/api/biblioteca/exemplares/'+copy.id+'/historico')).json()).total,1);
 }finally{await pool.query('DROP TRIGGER final1_reject_event ON biblioteca_exemplar_eventos');await pool.query('DROP FUNCTION final1_reject_event()');}
});
