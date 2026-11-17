CREATE TABLE biblioteca_reservas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  livro_id bigint NOT NULL REFERENCES biblioteca_livros(id) ON DELETE RESTRICT,
  leitor_id bigint NOT NULL REFERENCES alunos(usuario_id) ON DELETE RESTRICT,
  solicitado_em timestamptz NOT NULL DEFAULT clock_timestamp(),
  estado text NOT NULL DEFAULT 'aguardando' CHECK (estado IN ('aguardando','atendida','cancelada')),
  concluido_em timestamptz,
  emprestimo_id bigint UNIQUE REFERENCES biblioteca_emprestimos(id) ON DELETE RESTRICT,
  operador_id bigint REFERENCES usuarios(id) ON DELETE RESTRICT,
  motivo text CHECK (motivo IS NULL OR length(btrim(motivo)) BETWEEN 1 AND 300),
  CHECK ((estado='aguardando' AND concluido_em IS NULL AND emprestimo_id IS NULL) OR
    (estado='atendida' AND concluido_em IS NOT NULL AND emprestimo_id IS NOT NULL AND operador_id IS NOT NULL) OR
    (estado='cancelada' AND concluido_em IS NOT NULL AND emprestimo_id IS NULL AND operador_id IS NOT NULL AND motivo IS NOT NULL))
);
CREATE UNIQUE INDEX biblioteca_reserva_pendente ON biblioteca_reservas(livro_id,leitor_id) WHERE estado='aguardando';
CREATE INDEX biblioteca_reserva_fila ON biblioteca_reservas(livro_id,id) WHERE estado='aguardando';
CREATE INDEX biblioteca_reserva_leitor ON biblioteca_reservas(leitor_id,id);
