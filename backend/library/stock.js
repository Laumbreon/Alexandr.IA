const { fields, id, page, fail } = require('./common');

async function summary(pool, query) {
  fields(query, []);
  // Um único snapshot; não somar JOINs multiplicativos nem manter contadores editáveis.
  const sql = `WITH estoque AS (
    SELECT e.estado,e.conservacao,p.id AS emprestimo_id
    FROM biblioteca_exemplares e LEFT JOIN biblioteca_emprestimos p ON p.exemplar_id=e.id AND p.estado='ativo'
  ) SELECT
    (SELECT count(*)::int FROM biblioteca_livros) AS obras,
    count(*)::int AS total_exemplares,
    count(*) FILTER(WHERE emprestimo_id IS NULL AND estado='circulavel' AND conservacao<>'danificado')::int AS disponiveis,
    count(*) FILTER(WHERE emprestimo_id IS NOT NULL)::int AS emprestados,
    count(*) FILTER(WHERE emprestimo_id IS NULL AND (estado<>'circulavel' OR conservacao='danificado'))::int AS indisponiveis,
    count(*) FILTER(WHERE estado='manutencao')::int AS manutencao,
    count(*) FILTER(WHERE estado='baixado')::int AS baixados,
    count(*) FILTER(WHERE conservacao='danificado')::int AS danificados,
    (SELECT count(*)::int FROM biblioteca_emprestimos WHERE estado='ativo' AND previsto_em<CURRENT_TIMESTAMP) AS atrasados,
    (SELECT count(*)::int FROM biblioteca_reservas WHERE estado='aguardando') AS reservas_pendentes,
    (SELECT count(*)::int FROM alunos a JOIN usuarios u ON u.id=a.usuario_id WHERE u.perfil='aluno') AS leitores,
    (SELECT count(*)::int FROM alunos a JOIN usuarios u ON u.id=a.usuario_id LEFT JOIN biblioteca_leitores v ON v.usuario_id=u.id WHERE u.perfil='aluno' AND u.ativo AND COALESCE(v.habilitado,true)) AS leitores_habilitados,
    CURRENT_TIMESTAMP AS atualizado_em FROM estoque`;
  return (await pool.query(sql)).rows[0];
}

async function copyHistory(pool, copyId, query) {
  const key=id(copyId),{pagina,limite}=page(query);
  if(!(await pool.query('SELECT id FROM biblioteca_exemplares WHERE id=$1',[key])).rowCount)fail(404,'Exemplar não encontrado.');
  const total=Number((await pool.query('SELECT count(*) FROM biblioteca_exemplar_eventos WHERE exemplar_id=$1',[key])).rows[0].count);
  const items=(await pool.query(`SELECT e.id,e.tipo,e.estado_anterior,e.conservacao_anterior,e.estado_novo,e.conservacao_nova,e.motivo,e.criado_em,u.nome AS operador
    FROM biblioteca_exemplar_eventos e JOIN usuarios u ON u.id=e.operador_id WHERE e.exemplar_id=$1 ORDER BY e.id DESC LIMIT $2 OFFSET $3`,[key,limite,(pagina-1)*limite])).rows;
  return {items,total,pagina,limite};
}
module.exports={summary,copyHistory};
