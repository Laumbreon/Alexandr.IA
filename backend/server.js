const { loadEnvironment } = require('./db/pool');
loadEnvironment();
const app = require('./app');

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error('PORT deve ser um número inteiro entre 0 e 65535.');
}

// Esta etapa é local: não expõe o serviço à rede externa.
const server = app.listen(port, '127.0.0.1', () => {
  console.log('Alexandr.IA disponível em http://localhost:' + server.address().port);
});
server.on('error', (error) => {
  console.error('Não foi possível iniciar o servidor: ' + (error.code || error.message));
  process.exitCode = 1;
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    server.close(async () => {
      try { await app.locals.closeDatabase(); }
      catch { process.exitCode = 1; }
    });
  });
}
