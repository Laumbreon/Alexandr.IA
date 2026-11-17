const { fail, fields, id, integer, page } = require('./common');

function noticePolicy(env) {
  let days = null;
  if (env.LIBRARY_NOTICE_DAYS !== undefined && env.LIBRARY_NOTICE_DAYS !== '') {
    try { days = integer(env.LIBRARY_NOTICE_DAYS, 0, 365); } catch { /* Não presumir antecedência quando a configuração for inválida. */ }
  }
  return { antecedencia_dias: days, antecedencia_configurada: days !== null, canais_externos: false };
}

async function listNotices(pool, query, user, env) {
  fields(query,['pagina','limite','tipo','leitor_id']);
  const { pagina, limite } = page(query), type = query.tipo || 'todos';
  if (!['todos','atrasado','proximo','reserva'].includes(type)) fail(400, 'Tipo de aviso inválido.');
  if (user.perfil === 'aluno' && query.leitor_id && String(query.leitor_id) !== user.id) fail(403, 'Consulta restrita ao próprio leitor.');
  const reader = user.perfil === 'aluno' ? user.id : query.leitor_id ? id(query.leitor_id) : null;
  const policy = noticePolicy(env);
  // Uma única consulta/snapshot: avisos derivados não duplicam nem sobrevivem à devolução,
  // renovação ou cancelamento. IDs estáveis identificam o recurso, não cada consulta.
  const sql = `WITH avisos AS (
    SELECT 'emprestimo:'||p.id AS id,p.id::text AS recurso_id,'emprestimo' AS recurso,
      CASE WHEN p.previsto_em<CURRENT_TIMESTAMP THEN 'atrasado' ELSE 'proximo' END AS tipo,
      p.leitor_id::text AS leitor_id,u.nome AS leitor,l.id::text AS livro_id,l.titulo,e.patrimonio,p.previsto_em AS data_referencia,NULL::int AS posicao
    FROM biblioteca_emprestimos p JOIN biblioteca_exemplares e ON e.id=p.exemplar_id
      JOIN biblioteca_livros l ON l.id=e.livro_id JOIN usuarios u ON u.id=p.leitor_id
    WHERE p.estado='ativo' AND ($1::bigint IS NULL OR p.leitor_id=$1)
      AND (p.previsto_em<CURRENT_TIMESTAMP OR ($2::int IS NOT NULL AND p.previsto_em<=CURRENT_TIMESTAMP+($2::int*INTERVAL '1 day')))
    UNION ALL
    SELECT 'reserva:'||r.id,r.id::text,'reserva','reserva',r.leitor_id::text,u.nome,l.id::text,l.titulo,NULL,r.solicitado_em,
      (SELECT count(*)::int FROM biblioteca_reservas f WHERE f.livro_id=r.livro_id AND f.estado='aguardando' AND f.id<=r.id)
    FROM biblioteca_reservas r JOIN biblioteca_livros l ON l.id=r.livro_id JOIN usuarios u ON u.id=r.leitor_id
    WHERE r.estado='aguardando' AND ($1::bigint IS NULL OR r.leitor_id=$1)
  ), filtrados AS (SELECT * FROM avisos WHERE $3='todos' OR tipo=$3)
  SELECT (SELECT count(*)::int FROM filtrados) AS total,
    COALESCE((SELECT json_agg(t) FROM (SELECT * FROM filtrados ORDER BY
      CASE tipo WHEN 'atrasado' THEN 1 WHEN 'proximo' THEN 2 ELSE 3 END,data_referencia,id LIMIT $4 OFFSET $5) t),'[]'::json) AS items`;
  const result = (await pool.query(sql, [reader,policy.antecedencia_dias,type,limite,(pagina-1)*limite])).rows[0];
  return { ...result, pagina, limite, politica: policy };
}
module.exports = { listNotices, noticePolicy };
