import { useEffect, useRef, useState } from "react";
import { libraryRequest, validPage, type Page, type Book, type Copy } from "./api";
type Loan={id:string;leitor_id:string;leitor:string;titulo:string;patrimonio:string;retirado_em:string;previsto_em:string;devolvido_em:string|null;estado:string;atrasado:boolean;renovacoes:number};
type ReaderOption={id:string;nome:string;ra:string|null;ativo:boolean;habilitado:boolean};
type Policy={dias:number|null;limite:number|null;circulacao_configurada:boolean;renovacao_configurada:boolean;limite_renovacoes:number|null;dias_renovacao:number|null};
const date=(value:string|null)=>value?new Date(value).toLocaleString('pt-BR'):'—';
export default function Loans({own=false}:{own?:boolean}) {
  const pending=useRef(false);
  const [items,setItems]=useState<Page<Loan>>({items:[],total:0,pagina:1,limite:10});
  const [page,setPage]=useState(1),[state,setState]=useState('ativos'),[search,setSearch]=useState(''),[query,setQuery]=useState(''),[revision,setRevision]=useState(0);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [policy,setPolicy]=useState<Policy|null>(null),[open,setOpen]=useState(false);
  const [books,setBooks]=useState<Book[]>([]),[readers,setReaders]=useState<ReaderOption[]>([]),[copies,setCopies]=useState<Copy[]>([]);
  const [pickerReaderSearch,setPickerReaderSearch]=useState(''),[pickerReaderQuery,setPickerReaderQuery]=useState('');
  const [reader,setReader]=useState(''),[book,setBook]=useState(''),[copy,setCopy]=useState(''),[pickerSearch,setPickerSearch]=useState(''),[pickerQuery,setPickerQuery]=useState(''),[copyPage,setCopyPage]=useState(1),[copyTotal,setCopyTotal]=useState(0);
  useEffect(()=>{let active=true;setLoading(true);setError('');setItems({items:[],total:0,pagina:page,limite:10});
    libraryRequest<Page<Loan>>(`/emprestimos?estado=${state}&q=${encodeURIComponent(query)}&pagina=${page}`).then(validPage<Loan>).then((data)=>{if(active)setItems(data);}).catch((e:Error)=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};},[page,state,query,revision]);
  useEffect(()=>{let active=true;libraryRequest<Policy>('/politica').then((p)=>{if(active)setPolicy(p);}).catch((e:Error)=>{if(active)setError(e.message);});return()=>{active=false;};},[own]);
  useEffect(()=>{let active=true;if(!own&&open){setBooks([]);setReaders([]);setReader('');setBook('');
    Promise.all([libraryRequest<Page<Book>>(`/livros?q=${encodeURIComponent(pickerQuery)}&limite=50`).then(validPage<Book>),libraryRequest<Page<ReaderOption>>(`/leitores?q=${encodeURIComponent(pickerReaderQuery)}&limite=50`).then(validPage<ReaderOption>)])
      .then(([b,r])=>{if(active){setBooks(b.items);setReaders(r.items.filter((v)=>v.ativo&&v.habilitado));}}).catch((e:Error)=>{if(active)setError(e.message);});}
    return()=>{active=false;};},[own,open,pickerQuery,pickerReaderQuery,revision]);
  useEffect(()=>{let active=true;setCopies([]);setCopy('');setCopyTotal(0);if(book)libraryRequest<Page<Copy>>(`/livros/${book}/exemplares?pagina=${copyPage}`).then(validPage<Copy>).then((data)=>{if(active){setCopies(data.items);setCopyTotal(data.total);}}).catch((e:Error)=>{if(active)setError(e.message);});return()=>{active=false;};},[book,copyPage,revision]);
  async function mutate(route:string,data:unknown,message:string) {
    if(pending.current)return;pending.current=true;setBusy(true);setError('');setNotice('');
    try{await libraryRequest(route,'POST',data);setNotice(message);setRevision((v)=>v+1);setOpen(false);}catch(e){setError(e instanceof Error?e.message:'Operação não confirmada.');}finally{pending.current=false;setBusy(false);}
  }
  const Heading=own?'h2':'h1';
  const ItemHeading=own?'h3':'h2';
  return <section className="library-view" aria-label={own?'Meus empréstimos':'Circulação real'}><Heading className="page-title" tabIndex={-1}>{own?'Meus empréstimos':'Empréstimos e devoluções'}</Heading>
    {!own&&<><p>{policy?.circulacao_configurada?`Configuração local: ${policy.dias} dias; até ${policy.limite} empréstimos ativos por leitor.`:'Circulação aguarda prazo e limite definidos pelo responsável. Nenhuma política oficial é presumida.'}</p><button className="primary-button" disabled={!policy?.circulacao_configurada} onClick={()=>setOpen(!open)}>Novo empréstimo</button></>}
    <form className="library-fields" onSubmit={(e)=>{e.preventDefault();setPage(1);setQuery(search);}}><label>Pesquisar empréstimos<input value={search} onChange={(e)=>setSearch(e.target.value)}/></label><label>Situação<select value={state} onChange={(e)=>{setPage(1);setState(e.target.value);}}><option value="ativos">Ativos</option><option value="historico">Histórico devolvido</option><option value="atrasados">Atrasados</option><option value="todos">Todos</option></select></label><button className="outline-button">Pesquisar</button></form>
    {loading&&<p role="status">Carregando empréstimos…</p>}{error&&<p role="alert">{error} <button className="outline-button" onClick={()=>setRevision((v)=>v+1)}>Tentar novamente</button></p>}{notice&&<p role="status">{notice}</p>}
    {!loading&&!error&&!items.total&&<p>Nenhum empréstimo encontrado para esta consulta.</p>}
    <ul className="library-list">{items.items.map((item)=><li className="simple-page-card" key={item.id}><ItemHeading>{item.titulo}</ItemHeading><p>Exemplar {item.patrimonio}{!own&&` · Leitor: ${item.leitor}`}</p><p>Retirada: {date(item.retirado_em)} · Prazo: {date(item.previsto_em)} · Devolução: {date(item.devolvido_em)}</p><p>{item.estado}{item.atrasado?' — Em atraso':''}</p>
      {!own&&item.estado==='ativo'&&<button className="outline-button" disabled={busy} onClick={()=>{if(window.confirm(`Confirmar devolução de ${item.titulo}, exemplar ${item.patrimonio}?`))void mutate(`/emprestimos/${item.id}/devolucao`,{},'Devolução registrada pela biblioteca.');}}>Registrar devolução de {item.patrimonio}</button>}
      {own&&item.estado==='ativo'&&<><p>Renovações: {item.renovacoes}. {policy?.renovacao_configurada?`Limite local ${policy.limite_renovacoes}; ${policy.dias_renovacao} dias por renovação. A API verifica a fila de reservas.`:'Renovação não habilitada na configuração atual.'}</p><button className="outline-button" disabled={busy||!policy?.renovacao_configurada||item.atrasado||item.renovacoes>=(policy.limite_renovacoes||0)} onClick={()=>{if(window.confirm(`Solicitar renovação de ${item.titulo}?`))void mutate(`/emprestimos/${item.id}/renovacao`,{},'Renovação confirmada pela biblioteca.');}}>Solicitar renovação de {item.patrimonio}</button></>}
    </li>)}</ul><div className="library-actions"><button className="outline-button" disabled={loading||page===1} onClick={()=>setPage(page-1)}>Empréstimos anteriores</button><span>Página {page} · {items.total} registros</span><button className="outline-button" disabled={loading||page*10>=items.total} onClick={()=>setPage(page+1)}>Próximos empréstimos</button></div>
    {open&&!own&&<section className="simple-page-card"><h2>Registrar retirada</h2><p>Selecione leitor e exemplar reais. A API revalida elegibilidade e prazo. Pesquisas mostram até 50 opções; refine os termos se necessário.</p>
      <form className="library-fields" onSubmit={(e)=>{e.preventDefault();setPickerQuery(pickerSearch);setPickerReaderQuery(pickerReaderSearch);}}><label>Filtrar títulos<input value={pickerSearch} onChange={(e)=>setPickerSearch(e.target.value)}/></label><label>Filtrar leitores<input value={pickerReaderSearch} onChange={(e)=>setPickerReaderSearch(e.target.value)}/></label><button className="outline-button">Buscar opções</button></form>
      <form className="library-fields" onSubmit={(e)=>{e.preventDefault();if(window.confirm('Confirmar retirada para o leitor e exemplar selecionados?'))void mutate('/emprestimos',{leitor_id:reader,exemplar_id:copy},'Empréstimo registrado pela biblioteca.');}}>
        <label>Leitor habilitado<select required value={reader} onChange={(e)=>setReader(e.target.value)}><option value="">Selecione</option>{readers.map((r)=><option key={r.id} value={r.id}>{r.nome} · {r.ra||'Sem RA'}</option>)}</select></label>
        <label>Obra<select required value={book} onChange={(e)=>{setBook(e.target.value);setCopyPage(1);}}><option value="">Selecione</option>{books.map((b)=><option key={b.id} value={b.id}>{b.titulo}</option>)}</select></label>
        <label>Exemplar elegível<select required value={copy} onChange={(e)=>setCopy(e.target.value)}><option value="">Selecione</option>{copies.filter((c)=>c.disponivel).map((c)=><option key={c.id} value={c.id}>{c.patrimonio}</option>)}</select></label>
        <button className="primary-button" disabled={busy||!copy||!reader}>Confirmar empréstimo</button>
      </form><button className="outline-button" disabled={copyPage===1} onClick={()=>setCopyPage(copyPage-1)}>Opções anteriores de exemplar</button><button className="outline-button" disabled={copyPage*10>=copyTotal} onClick={()=>setCopyPage(copyPage+1)}>Outras opções de exemplar</button>
    </section>}
  </section>;
}
