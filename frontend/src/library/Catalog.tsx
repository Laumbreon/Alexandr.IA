import { useEffect, useRef, useState, type FormEvent } from "react";
import { libraryRequest, validPage, type Book, type Copy, type Page } from "./api";

const empty = { titulo: "", isbn: "", editora: "", ano:"",sinopse:"", categoria: "", autores: "" };
export default function Catalog({ staff }: { staff: boolean }) {
  const [books, setBooks] = useState<Page<Book>>({ items: [], total: 0, pagina: 1, limite: 10 });
  const [filter, setFilter] = useState({ q: "", autor: "", categoria: "" });
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1), [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Book | null>(null), [editing, setEditing] = useState<Book | null>(null);
  const [form, setForm] = useState(empty), [openForm, setOpenForm] = useState(false), [busy, setBusy] = useState(false);
  const [copies, setCopies] = useState<Page<Copy>>({ items: [], total: 0, pagina: 1, limite: 10 });
  const [copyPage, setCopyPage] = useState(1), [patrimonio, setPatrimonio] = useState("");
  const [copyLoading, setCopyLoading] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null), generation = useRef(0);
  const pending = useRef(false);
  const historyGeneration=useRef(0);
  const [history,setHistory]=useState<{id:string;tipo:string;motivo:string;operador:string;criado_em:string;estado_novo:string;conservacao_nova:string}[]>([]),[historyTitle,setHistoryTitle]=useState(''),[historyLoading,setHistoryLoading]=useState(false);
  useEffect(() => {
    let active = true; setLoading(true); setError("");
    libraryRequest<Page<Book>>(`/livros?${query}&pagina=${page}`).then(validPage<Book>).then((data) => { if (active) {setBooks(data);setSelected(previous=>previous?data.items.find(b=>b.id===previous.id)||previous:null);} })
      .catch((e: Error) => { if (active) { setError(e.message); setBooks({ items: [], total: 0, pagina: page, limite: 10 }); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, page, revision]);
  useEffect(() => {
    const token = ++generation.current;
    historyGeneration.current++;setHistory([]);setHistoryTitle('');setHistoryLoading(false);
    setCopies({ items: [], total: 0, pagina: copyPage, limite: 10 });
    setCopyLoading(!!selected);
    if (selected) libraryRequest<Page<Copy>>(`/livros/${selected.id}/exemplares?pagina=${copyPage}`).then(validPage<Copy>)
      .then((data) => { if (token === generation.current) setCopies(data); }).catch((e: Error) => { if (token === generation.current) setError(e.message); })
      .finally(() => { if (token === generation.current) setCopyLoading(false); });
    return () => { generation.current++;historyGeneration.current++; };
  }, [selected, copyPage, revision]);
  async function run(action: () => Promise<unknown>, message = "Operação confirmada pela biblioteca.") {
    if (pending.current) return; pending.current=true; setBusy(true); setError(""); setNotice("");
    try { await action(); setNotice(message); setRevision((v) => v + 1); }
    catch (e) { setError(e instanceof Error ? e.message : "Operação não concluída."); }
    finally { pending.current=false; setBusy(false); }
  }
  function edit(book?: Book) {
    setEditing(book || null); setOpenForm(true);
    setForm(book ? { titulo: book.titulo, isbn: book.isbn || "", editora: book.editora || "",ano:book.ano?String(book.ano):"",sinopse:book.sinopse||"", categoria: book.categoria, autores: book.autores.join("; ") } : empty);
    queueMicrotask(() => heading.current?.focus());
  }
  function save(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      await libraryRequest(`/livros${editing ? "/" + editing.id : ""}`, editing ? "PUT" : "POST", { ...form, autores: form.autores.split(";").map((a) => a.trim()), ...(editing ? { versao: editing.versao } : {}) });
      setOpenForm(false); setEditing(null);
    });
  }
  async function showHistory(copy:Copy){const token=++historyGeneration.current;setHistory([]);setHistoryTitle(copy.patrimonio);setHistoryLoading(true);setError('');try{const data=validPage(await libraryRequest<Page<typeof history[number]>>(`/exemplares/${copy.id}/historico?limite=50`));if(token===historyGeneration.current)setHistory(data.items);}catch(e){if(token===historyGeneration.current)setError(e instanceof Error?e.message:'Histórico indisponível.');}finally{if(token===historyGeneration.current)setHistoryLoading(false);}}
  const Heading = staff ? "h1" : "h2";
  const BookHeading = staff ? "h2" : "h3";
  return <section className="library-view" aria-label="Catálogo real">
    <Heading tabIndex={-1} className="page-title">Acervo por categorias</Heading><p>Catálogo consultado no banco da biblioteca. Obra é o título; exemplar é cada unidade física.</p>
    <form className="library-fields" onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(new URLSearchParams(filter).toString()); }}>
      {([['q','Título ou autor'],['autor','Autor'],['categoria','Categoria']] as const).map(([key,label]) => <label key={key}>{label}<input value={filter[key]} maxLength={200} onChange={(e) => setFilter({ ...filter, [key]: e.target.value })} /></label>)}
      <button className="outline-button">Pesquisar</button>
    </form>
    {staff && <button className="primary-button" type="button" onClick={() => edit()}>Cadastrar livro</button>}
    {error && <p role="alert">{error} <button className="outline-button" onClick={() => setRevision((v) => v + 1)}>Tentar novamente</button></p>}
    {notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">Carregando acervo…</p> : !books.items.length ? !error && <p>Nenhum livro encontrado. Ajuste a pesquisa ou cadastre uma obra.</p> : <ul className="library-list">{books.items.map((book) => <li className="simple-page-card" key={book.id}>
      <BookHeading className="section-title">{book.titulo}</BookHeading><p>{book.autores.join(", ")} · {book.categoria}</p>
      <p>ISBN: {book.isbn || "Não informado"} · Editora: {book.editora || "Não informada"}</p>
      <p>Ano: {book.ano||'Não informado'}</p>{book.sinopse&&<p>{book.sinopse}</p>}
      <p>{book.total_exemplares} exemplares físicos; {book.circulaveis} em condição operacional de circulação. Isto não é uma contagem de empréstimos.</p>
      {book.disponiveis!==undefined&&<p>{book.disponiveis} exemplares sem impedimento físico e sem empréstimo ativo; retirada sujeita às regras de circulação.</p>}
      <button className="outline-button" onClick={() => { setSelected(book); setCopyPage(1); }}>Detalhes e exemplares de {book.titulo}</button>
      {staff && <button className="outline-button" onClick={() => edit(book)}>Editar {book.titulo}</button>}
      {!staff&&<button className="outline-button" disabled={busy} onClick={()=>void run(()=>libraryRequest(`/livros/${book.id}/reservas`,'POST',{}),'Reserva registrada: aguarde atendimento da biblioteca, sem exemplar alocado.')}>Solicitar reserva de {book.titulo}</button>}
    </li>)}</ul>}
    <div className="library-actions"><button className="outline-button" disabled={loading || page === 1} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page} · {books.total} obras</span><button className="outline-button" disabled={loading || page * 10 >= books.total} onClick={() => setPage(page + 1)}>Próxima</button></div>
    {openForm && staff && <form className="simple-page-card" onSubmit={save}>
      <h2 ref={heading} tabIndex={-1}>{editing ? "Editar livro" : "Novo livro"}</h2>
      <div className="library-fields">{Object.entries({ titulo: 'Título', autores: 'Autores separados por ponto e vírgula', categoria: 'Categoria', isbn: 'ISBN opcional', editora: 'Editora opcional',ano:'Ano opcional' }).map(([key,label]) => <label key={key}>{label}<input type={key==='ano'?'number':'text'} min={key==='ano'?1:undefined} max={key==='ano'?9999:undefined} required={['titulo','autores','categoria'].includes(key)} value={form[key as keyof typeof form]} maxLength={key === 'autores' ? 2000 : 300} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}<label>Sinopse opcional<textarea value={form.sinopse} onChange={e=>setForm({...form,sinopse:e.target.value})}/></label></div>
      <button className="primary-button" disabled={busy}>Salvar livro</button><button className="outline-button" type="button" disabled={busy} onClick={() => setOpenForm(false)}>Cancelar edição</button>
    </form>}
    {selected && <section className="simple-page-card"><BookHeading>Exemplares de {selected.titulo}</BookHeading>
      <ul>{copies.items.map((copy) => <li key={copy.id}><p>Patrimônio {copy.patrimonio} · {copy.estado} · {copy.conservacao}</p>
        {copy.disponivel!==undefined&&<p>{copy.emprestado?'Emprestado — registre a devolução antes de alterar o exemplar.':copy.disponivel?'Disponível fisicamente; retirada sujeita à fila e às regras.':'Impedido por estado ou conservação.'}</p>}
        {staff && <form className="library-fields" onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); void run(() => libraryRequest(`/exemplares/${copy.id}`, "PUT", { estado: data.get('estado'), conservacao: data.get('conservacao'), motivo:data.get('motivo'),versao: copy.versao })); }}>
          <label>Estado de {copy.patrimonio}<select name="estado" defaultValue={copy.estado}>{['circulavel','manutencao','baixado'].map((s) => <option key={s}>{s}</option>)}</select></label>
          <label>Conservação de {copy.patrimonio}<select name="conservacao" defaultValue={copy.conservacao}>{['bom','regular','danificado'].map((s) => <option key={s}>{s}</option>)}</select></label><label>Motivo da alteração de {copy.patrimonio}<input name="motivo" required maxLength={300}/></label><button className="outline-button" disabled={busy||copy.emprestado}>Atualizar exemplar</button>
        </form>}</li>)}</ul>
      {staff&&copies.items.map(copy=><button className="outline-button" key={copy.id} disabled={historyLoading} onClick={()=>void showHistory(copy)}>Histórico de {copy.patrimonio}</button>)}
      {historyTitle&&<section aria-label="Histórico do exemplar"><h3>Histórico de {historyTitle}</h3>{historyLoading?<p role="status">Carregando histórico…</p>:<><p>Até 50 eventos recentes. Eventos anteriores à nova rastreabilidade não foram inventados.</p><ul>{history.map(item=><li key={item.id}>{item.tipo}: {item.estado_novo}, {item.conservacao_nova} · {item.motivo} · {item.operador} · {new Date(item.criado_em).toLocaleString('pt-BR')}</li>)}</ul></>}</section>}
      {copyLoading ? <p role="status">Carregando exemplares…</p> : !error && !copies.total && <p>Esta obra ainda não tem exemplares registrados.</p>}
      <button className="outline-button" disabled={copyPage === 1} onClick={() => setCopyPage(copyPage-1)}>Exemplares anteriores</button><button className="outline-button" disabled={copyPage*10 >= copies.total} onClick={() => setCopyPage(copyPage+1)}>Próximos exemplares</button>
      {staff && <form className="library-fields" onSubmit={(e) => { e.preventDefault(); void run(async () => { await libraryRequest(`/livros/${selected.id}/exemplares`, "POST", { patrimonio }); setPatrimonio(""); }); }}><label>Identificação patrimonial<input required maxLength={80} value={patrimonio} onChange={(e) => setPatrimonio(e.target.value)} /></label><button className="primary-button" disabled={busy}>Cadastrar exemplar</button></form>}
    </section>}
  </section>;
}
