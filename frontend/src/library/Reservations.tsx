import { useEffect, useRef, useState } from "react";
import { libraryRequest, validPage, type Page } from "./api";
type Reservation={id:string;livro_id:string;titulo:string;leitor:string;estado:string;solicitado_em:string;concluido_em:string|null;posicao:number|null;motivo:string|null};
export default function Reservations({own=false}:{own?:boolean}) {
  const [data,setData]=useState<Page<Reservation>>({items:[],total:0,pagina:1,limite:10});
  const [state,setState]=useState('aguardando'),[page,setPage]=useState(1),[revision,setRevision]=useState(0),[search,setSearch]=useState(''),[query,setQuery]=useState('');
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [reason,setReason]=useState<Record<string,string>>({});const pending=useRef(false);
  useEffect(()=>{let active=true;setLoading(true);setError('');setData({items:[],total:0,pagina:page,limite:10});
    libraryRequest<Page<Reservation>>(`/reservas?estado=${state}&pagina=${page}&q=${encodeURIComponent(query)}`).then(validPage<Reservation>).then((v)=>{if(active)setData(v);}).catch((e:Error)=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};},[state,page,query,revision]);
  async function cancel(item:Reservation) {
    if(pending.current||!window.confirm(`Cancelar a reserva de ${item.titulo}?`))return;
    pending.current=true;setBusy(true);setError('');setNotice('');
    try{await libraryRequest(`/reservas/${item.id}/cancelamento`,'POST',own?{}:{motivo:reason[item.id]||''});setNotice('Cancelamento confirmado pela biblioteca.');setRevision((v)=>v+1);}
    catch(e){setError(e instanceof Error?e.message:'Cancelamento não confirmado.');}finally{pending.current=false;setBusy(false);}
  }
  const Heading=own?'h2':'h1';
  const ItemHeading=own?'h3':'h2';
  return <section className="library-view" aria-label={own?'Minhas reservas':'Fila de reservas'}><Heading className="page-title" tabIndex={-1}>{own?'Minhas reservas':'Fila de reservas'}</Heading>
    <p>Reservas são por obra, sem exemplar alocado. A posição não é promessa de disponibilidade imediata. A retirada pela equipe atende o primeiro leitor da fila.</p>
    {!own&&<p>Para atender, abra a aba Empréstimos, escolha Novo empréstimo e selecione a obra e o primeiro leitor indicado. A API confirma a prioridade e associa o exemplar à reserva na mesma transação.</p>}
    <form className="library-fields" onSubmit={(e)=>{e.preventDefault();setPage(1);setQuery(search);}}><label>Pesquisar reservas<input value={search} maxLength={200} onChange={(e)=>setSearch(e.target.value)}/></label><label>Estado da reserva<select value={state} onChange={(e)=>{setPage(1);setState(e.target.value);}}>{['aguardando','atendida','cancelada','todas'].map((v)=><option key={v}>{v}</option>)}</select></label><button className="outline-button">Consultar reservas</button></form>
    {loading&&<p role="status">Carregando reservas…</p>}{error&&<p role="alert">{error} <button className="outline-button" onClick={()=>setRevision((v)=>v+1)}>Tentar novamente</button></p>}{notice&&<p role="status">{notice}</p>}
    {!loading&&!error&&!data.total&&<p>Nenhuma reserva encontrada.</p>}
    <ul className="library-list">{data.items.map((item)=><li className="simple-page-card" key={item.id}><ItemHeading>{item.titulo}</ItemHeading>{!own&&<p>Leitor: {item.leitor}</p>}<p>Estado: {item.estado}{item.posicao!==null?` · Posição atual: ${item.posicao}`:''}</p><p>Solicitada em {new Date(item.solicitado_em).toLocaleString('pt-BR')}</p>{item.motivo&&<p>Motivo: {item.motivo}</p>}
      {item.estado==='aguardando'&&<>{!own&&<label>Motivo do cancelamento (sem dados pessoais)<input maxLength={300} value={reason[item.id]||''} onChange={(e)=>setReason({...reason,[item.id]:e.target.value})}/></label>}<button className="outline-button" disabled={busy||(!own&&!(reason[item.id]||'').trim())} onClick={()=>void cancel(item)}>Cancelar reserva de {item.titulo}</button></>}
    </li>)}</ul><div className="library-actions"><button className="outline-button" disabled={page===1||loading} onClick={()=>setPage(page-1)}>Reservas anteriores</button><span>Página {page} · {data.total} reservas</span><button className="outline-button" disabled={page*10>=data.total||loading} onClick={()=>setPage(page+1)}>Próximas reservas</button></div>
  </section>;
}
