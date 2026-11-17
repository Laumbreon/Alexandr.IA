CREATE TABLE biblioteca_emprestimos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  leitor_id bigint NOT NULL REFERENCES alunos(usuario_id) ON DELETE RESTRICT,
  exemplar_id bigint NOT NULL REFERENCES biblioteca_exemplares(id) ON DELETE RESTRICT,
  retirado_em timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  previsto_em timestamptz NOT NULL,
  devolvido_em timestamptz,
  estado text NOT NULL DEFAULT 'ativo' CHECK (estado IN ('ativo','devolvido')),
  renovacoes integer NOT NULL DEFAULT 0 CHECK (renovacoes >= 0),
  CHECK (previsto_em > retirado_em),
  CHECK ((estado='ativo' AND devolvido_em IS NULL) OR (estado='devolvido' AND devolvido_em >= retirado_em))
);
-- Última barreira de integridade mesmo para operações fora da aplicação.
CREATE UNIQUE INDEX biblioteca_emprestimo_ativo_exemplar ON biblioteca_emprestimos(exemplar_id) WHERE estado='ativo';
CREATE INDEX biblioteca_emprestimos_leitor ON biblioteca_emprestimos(leitor_id,estado);
CREATE INDEX biblioteca_emprestimos_prazo ON biblioteca_emprestimos(previsto_em) WHERE estado='ativo';
CREATE TABLE biblioteca_movimentos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  emprestimo_id bigint NOT NULL REFERENCES biblioteca_emprestimos(id) ON DELETE RESTRICT,
  operador_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  tipo text NOT NULL CHECK (tipo IN ('retirada','devolucao','renovacao')),
  ocorrido_em timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  prazo_anterior timestamptz,
  prazo_novo timestamptz
);
CREATE INDEX biblioteca_movimentos_emprestimo ON biblioteca_movimentos(emprestimo_id,id);
