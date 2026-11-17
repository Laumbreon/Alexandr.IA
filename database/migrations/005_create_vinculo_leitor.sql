-- Somente vínculo operacional; dados pessoais continuam em usuarios/alunos.
CREATE TABLE biblioteca_leitores (
  usuario_id bigint PRIMARY KEY REFERENCES alunos(usuario_id) ON DELETE RESTRICT,
  habilitado boolean NOT NULL DEFAULT true,
  versao integer NOT NULL DEFAULT 1 CHECK (versao > 0)
);
