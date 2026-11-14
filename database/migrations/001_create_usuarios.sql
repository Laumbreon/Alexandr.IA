CREATE TABLE usuarios (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome text NOT NULL CHECK (length(btrim(nome)) > 0),
  email text NOT NULL CHECK (
    email = btrim(email) AND email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ),
  -- Armazena o hash codificado (com salt e parâmetros), nunca a senha.
  -- Argon2id será implementado e validado na etapa de autenticação.
  senha_hash text NOT NULL CHECK (length(btrim(senha_hash)) > 0),
  perfil text NOT NULL CHECK (perfil IN ('aluno', 'bibliotecario', 'administrador')),
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX usuarios_email_unique ON usuarios (lower(email));

CREATE FUNCTION atualizar_timestamp_usuario() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE TRIGGER usuarios_atualizado_em
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp_usuario();
