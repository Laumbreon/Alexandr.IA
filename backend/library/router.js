const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { requireRoles, checkOrigin } = require('../middleware/sessoes');
const { endpoint } = require('./common');
const catalog = require('./catalog');
const readers = require('./readers');
const circulation = require('./circulation');
const reservations = require('./reservations');
const notices = require('./notices');
const stock = require('./stock');
const { validateCadastro } = require('../validators/cadastro.validator');
const { createCadastroService } = require('../services/cadastro.service');

function libraryRouter(getPool, sessions, env) {
  const router = express.Router();
  router.use(sessions.read, sessions.authenticate, requireRoles('aluno','bibliotecario','administrador'));
  // Todas as mutações usam a mesma sessão, origem e token CSRF do logout.
  router.use((req, res, next) => ['GET','HEAD'].includes(req.method) ? next() : checkOrigin(env)(req,res,() => sessions.csrf(req,res,next)));
  router.use(rateLimit({ windowMs: 60000, limit: 240, validate: { xForwardedForHeader: false }, message: { success: false, message: 'Aguarde antes de tentar novamente.' } }));
  router.use(express.json({ limit: '16kb', strict: true }));
  const staff = requireRoles('bibliotecario','administrador');
  const register = createCadastroService(getPool);
  router.get('/resumo',staff,endpoint((r)=>stock.summary(getPool(),r.query)));
  router.get('/exemplares/:id/historico',staff,endpoint((r)=>stock.copyHistory(getPool(),r.params.id,r.query)));
  router.get('/avisos',endpoint((r)=>notices.listNotices(getPool(),r.query,r.user,env)));
  router.get('/reservas',endpoint((r)=>reservations.listReservations(getPool(),r.query,r.user)));
  router.get('/reservas/:id',endpoint((r)=>reservations.reservation(getPool(),r.params.id,r.user)));
  router.post('/livros/:id/reservas',requireRoles('aluno'),endpoint((r)=>reservations.createReservation(getPool(),r.params.id,r.body,r.user)));
  router.post('/reservas/:id/cancelamento',endpoint((r)=>reservations.cancelReservation(getPool(),r.params.id,r.body,r.user)));
  router.post('/emprestimos/:id/renovacao',requireRoles('aluno'),endpoint((r)=>reservations.renewLoan(getPool(),r.params.id,r.body,r.user,env)));
  router.get('/politica', endpoint(() => circulation.policy(env)));
  router.get('/emprestimos', endpoint((r) => circulation.listLoans(getPool(),r.query,r.user)));
  router.get('/emprestimos/:id', endpoint((r) => circulation.loan(getPool(),r.params.id,r.user)));
  router.post('/emprestimos',staff,endpoint((r) => circulation.createLoan(getPool(),r.body,r.user,env)));
  router.post('/emprestimos/:id/devolucao',staff,endpoint((r) => circulation.returnLoan(getPool(),r.params.id,r.body,r.user)));
  router.get('/meu-perfil', requireRoles('aluno'), endpoint((r) => readers.reader(getPool(), r.user.id)));
  router.get('/leitores', staff, endpoint((r) => readers.listReaders(getPool(), r.query)));
  router.get('/leitores/:id', staff, endpoint((r) => readers.reader(getPool(), r.params.id)));
  router.put('/leitores/:id', staff, endpoint((r) => readers.updateReader(getPool(), r.params.id, r.body)));
  router.post('/leitores', staff, endpoint(async (r) => {
    await register(validateCadastro(r.body));
    return { success: true, message: 'Leitor aluno cadastrado. Nenhuma sessão foi criada para ele.' };
  }));
  router.get('/livros', endpoint((r) => catalog.listBooks(getPool(), r.query)));
  router.get('/livros/:id', endpoint((r) => catalog.getBook(getPool(), r.params.id)));
  router.post('/livros', staff, endpoint((r) => catalog.saveBook(getPool(), r.body)));
  router.put('/livros/:id', staff, endpoint((r) => catalog.saveBook(getPool(), r.body, r.params.id)));
  router.get('/livros/:id/exemplares', endpoint((r) => catalog.copies(getPool(), r.params.id, r.query)));
  router.post('/livros/:id/exemplares', staff, endpoint((r) => catalog.addCopy(getPool(), r.params.id, r.body,r.user)));
  router.put('/exemplares/:id', staff, endpoint((r) => catalog.updateCopy(getPool(), r.params.id, r.body,r.user)));
  router.use((error, req, res, next) => {
    if (error.type === 'entity.too.large') return res.status(413).json({ success:false,message:'A requisição da biblioteca excede 16 KiB.' });
    if (error.status === 400) return res.status(400).json({ success:false,message:'JSON inválido.' });
    return next(error);
  });
  return router;
}
module.exports = { libraryRouter };
