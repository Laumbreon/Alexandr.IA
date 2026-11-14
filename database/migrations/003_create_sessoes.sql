-- Esquema esperado por connect-pg-simple; a criação nunca ocorre no servidor HTTP.
CREATE TABLE sessoes (
  sid varchar PRIMARY KEY,
  sess json NOT NULL,
  expire timestamptz NOT NULL
);
CREATE INDEX sessoes_expire_idx ON sessoes (expire);
