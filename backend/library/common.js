function fail(status, message) { throw Object.assign(new Error(message), { status, public: true }); }
function fields(body, allowed) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some((k) => !allowed.includes(k))) fail(400, 'Campos não permitidos ou objeto inválido.');
}
function text(value, max, optional = false) {
  if (optional && (value === undefined || value === null || value === '')) return null;
  if (typeof value !== 'string' || value.includes('\0') || [...value].length > max || !value.trim()) fail(400, 'Texto inválido.');
  return value.trim();
}
function integer(value, min, max) {
  if (!['string','number'].includes(typeof value) || !/^[0-9]+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) fail(400, 'Número fora da faixa permitida.');
  return Number(value);
}
function id(value) {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) fail(400,'Envie identificadores grandes como texto.');
  if (!['string','number'].includes(typeof value) || !/^[1-9][0-9]{0,18}$/.test(String(value)) || BigInt(value) > 9223372036854775807n) fail(400, 'Identificador inválido.');
  return String(value);
}
function page(query) {
  fields(query,['pagina','limite','q','autor','categoria','estado','leitor_id','tipo']);
  return { pagina: integer(query.pagina ?? 1, 1, 100000), limite: integer(query.limite ?? 10, 1, 50) };
}
function pattern(value) { return '%' + (text(value ?? '', 200, true) || '').replace(/[\\%_]/g, '\\$&') + '%'; }
async function transaction(pool, action) {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const result = await action(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
function endpoint(action) {
  return async (req, res) => {
    try { const result = await action(req); res.status(req.method === 'POST' ? 201 : 200).json(result); }
    catch (error) {
      const unavailable = error.status === 503 || error.code?.startsWith('08') || ['ECONNREFUSED','ECONNRESET','ETIMEDOUT','28P01','3D000','42P01','53300','57P01','57P02','57P03'].includes(error.code);
      const status = error.public ? error.status : error.status === 400 ? 400 : ['23505','40001','40P01'].includes(error.code) ? 409 : ['23503','23514','22P02'].includes(error.code) ? 400 : unavailable ? 503 : 500;
      res.status(status).json({ success: false, message: error.public ? error.message : status === 409 ? 'Registro já existente ou operação concorrente. Atualize a consulta.' : status === 400 ? 'Dados incompatíveis com o cadastro.' : status === 503 ? 'Biblioteca indisponível. Tente novamente.' : 'Não foi possível concluir a operação.' });
    }
  };
}
module.exports = { fail, fields, text, integer, id, page, pattern, transaction, endpoint };
