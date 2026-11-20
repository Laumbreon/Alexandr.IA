-- Aditiva: preserva obras, exemplares e histórico anteriores.
ALTER TABLE biblioteca_livros ADD COLUMN ano integer CHECK (ano BETWEEN 1 AND 9999);
ALTER TABLE biblioteca_livros ADD COLUMN sinopse text CHECK (sinopse IS NULL OR length(sinopse) BETWEEN 1 AND 4000);

CREATE TABLE biblioteca_exemplar_eventos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  exemplar_id bigint NOT NULL REFERENCES biblioteca_exemplares(id) ON DELETE RESTRICT,
  operador_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  tipo text NOT NULL CHECK (tipo IN ('entrada','alteracao')),
  estado_anterior text,
  conservacao_anterior text,
  estado_novo text NOT NULL,
  conservacao_nova text NOT NULL,
  motivo text NOT NULL CHECK (length(btrim(motivo)) BETWEEN 1 AND 300),
  criado_em timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX biblioteca_exemplar_eventos_exemplar ON biblioteca_exemplar_eventos(exemplar_id,id);
