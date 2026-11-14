CREATE TABLE alunos (
  usuario_id bigint PRIMARY KEY REFERENCES usuarios(id) ON DELETE RESTRICT,
  ra text UNIQUE CHECK (ra IS NULL OR (ra = btrim(ra) AND length(ra) > 0)),
  curso text CHECK (curso IS NULL OR length(btrim(curso)) > 0),
  criado_em timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Uma FK composta garante que somente usuários de perfil aluno tenham ficha acadêmica.
ALTER TABLE usuarios ADD CONSTRAINT usuarios_id_perfil_unique UNIQUE (id, perfil);
ALTER TABLE alunos ADD COLUMN perfil_usuario text NOT NULL DEFAULT 'aluno'
  CHECK (perfil_usuario = 'aluno');
ALTER TABLE alunos ADD CONSTRAINT alunos_usuario_perfil_fk
  FOREIGN KEY (usuario_id, perfil_usuario) REFERENCES usuarios(id, perfil)
  ON DELETE RESTRICT ON UPDATE RESTRICT;
