CREATE TABLE biblioteca_autores (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome text NOT NULL CHECK (length(btrim(nome)) BETWEEN 1 AND 200)
);
CREATE UNIQUE INDEX biblioteca_autores_nome ON biblioteca_autores(lower(nome));
CREATE TABLE biblioteca_categorias (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome text NOT NULL CHECK (length(btrim(nome)) BETWEEN 1 AND 100)
);
CREATE UNIQUE INDEX biblioteca_categorias_nome ON biblioteca_categorias(lower(nome));
CREATE TABLE biblioteca_livros (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  titulo text NOT NULL CHECK (length(btrim(titulo)) BETWEEN 1 AND 300),
  isbn text CHECK (isbn IS NULL OR isbn ~ '^([0-9]{13}|[0-9]{9}[0-9X])$'),
  editora text CHECK (editora IS NULL OR length(btrim(editora)) BETWEEN 1 AND 200),
  categoria_id bigint NOT NULL REFERENCES biblioteca_categorias(id) ON DELETE RESTRICT,
  versao integer NOT NULL DEFAULT 1 CHECK (versao > 0),
  criado_em timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX biblioteca_livros_isbn ON biblioteca_livros(isbn) WHERE isbn IS NOT NULL;
CREATE INDEX biblioteca_livros_categoria ON biblioteca_livros(categoria_id);
CREATE INDEX biblioteca_livros_titulo ON biblioteca_livros(lower(titulo));
CREATE TABLE biblioteca_livros_autores (
  livro_id bigint NOT NULL REFERENCES biblioteca_livros(id) ON DELETE RESTRICT,
  autor_id bigint NOT NULL REFERENCES biblioteca_autores(id) ON DELETE RESTRICT,
  PRIMARY KEY(livro_id, autor_id)
);
CREATE INDEX biblioteca_autoria_autor ON biblioteca_livros_autores(autor_id);
CREATE TABLE biblioteca_exemplares (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  livro_id bigint NOT NULL REFERENCES biblioteca_livros(id) ON DELETE RESTRICT,
  patrimonio text NOT NULL CHECK (length(btrim(patrimonio)) BETWEEN 1 AND 80),
  estado text NOT NULL DEFAULT 'circulavel' CHECK (estado IN ('circulavel','manutencao','baixado')),
  conservacao text NOT NULL DEFAULT 'bom' CHECK (conservacao IN ('bom','regular','danificado')),
  versao integer NOT NULL DEFAULT 1 CHECK (versao > 0),
  criado_em timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX biblioteca_exemplares_patrimonio ON biblioteca_exemplares(lower(patrimonio));
CREATE INDEX biblioteca_exemplares_livro ON biblioteca_exemplares(livro_id);
