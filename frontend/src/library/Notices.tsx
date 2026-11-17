import { useEffect, useState } from "react";
import { libraryRequest, validPage, type Page } from "./api";
type Notice={id:string;recurso_id:string;recurso:string;tipo:'atrasado'|'proximo'|'reserva';leitor:string;titulo:string;patrimonio:string|null;data_referencia:string;posicao:number|null};
type NoticesPage=Page<Notice>&{politica:{antecedencia_dias:number|null;antecedencia_configurada:boolean;canais_externos:boolean}};
export default function Notices({own=false}:{own?:boolean}) {
  const [data,setData]=useState<NoticesPage|null>(null),[page,setPage]=useState(1),[type,setType]=useState('todos'),[revision,setRevision]=useState(0);
  const [loading,setLoading]=useState(true),[error,setError]=useState('');
  useEffect(()=>{let active=true;setLoading(true);setError('');setData(null);
    libraryRequest<NoticesPage>(`/avisos?pagina=${page}&tipo=${type}`).then((v)=>{validPage(v);if(!v.politica)throw new Error('Resposta inválida dos avisos.');return v;})
      .then((v)=>{if(active)setData(v);}).catch((e:Error)=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};},[page,type,revision]);
  const Heading=own?'h2':'h1',ItemHeading=own?'h3':'h2';
  return <section className="library-view" aria-label={own?'Meus avisos':'Acompanhamento da biblioteca'}>
    <Heading className="page-title" tabIndex={-1}>{own?'Meus avisos':'Avisos e acompanhamento'}</Heading>
    <p>Avisos internos consultados nos registros atuais. Nenhum e-mail, WhatsApp ou SMS é enviado.</p>
    <div className="library-fields"><label>Tipo de aviso<select value={type} onChange={(e)=>{setPage(1);setType(e.target.value);}}><option value="todos">Todos</option><option value="atrasado">Empréstimos atrasados</option><option value="proximo">Próximos do vencimento</option><option value="reserva">Reservas aguardando</option></select></label><button type="button" className="outline-button" disabled={loading} onClick={()=>setRevision((v)=>v+1)}>Atualizar avisos</button></div>
    {loading&&<p role="status">Carregando avisos…</p>}
    {error&&<p role="alert">{error} <button className="outline-button" onClick={()=>setRevision((v)=>v+1)}>Tentar novamente</button></p>}
    {data&&!data.politica.antecedencia_configurada&&<p role="status">A antecedência ainda não foi definida pelo responsável. Atrasos e reservas continuam visíveis; confira todos os prazos em Empréstimos.</p>}
    {data&&data.politica.antecedencia_configurada&&<p>Antecedência configurada: {data.politica.antecedencia_dias} dias. Não representa regra oficial da Fatec.</p>}
    {!loading&&!error&&data&&data.total===0&&<p>Nenhum aviso para este filtro na consulta atual.</p>}
    <ul className="library-list">{data?.items.map((item)=><li className="simple-page-card" key={item.id}>
      <ItemHeading>{item.tipo==='atrasado'?'Devolução em atraso':item.tipo==='proximo'?'Devolução próxima':'Reserva aguardando atendimento'}: {item.titulo}</ItemHeading>
      {!own&&<p>Leitor: {item.leitor}</p>}{item.patrimonio&&<p>Exemplar: {item.patrimonio}</p>}
      <p>{item.recurso==='emprestimo'?'Prazo de devolução':'Reserva solicitada em'}: {new Date(item.data_referencia).toLocaleString('pt-BR')}</p>
      {item.tipo==='reserva'?<p>Posição atual: {item.posicao}. Nenhum exemplar está alocado. Consulte {own?'Minhas reservas':'a fila na seção Empréstimos → Reservas'}.</p>:<p>Consulte {own?'Meus empréstimos':'a seção Empréstimos'} para acompanhar ou realizar as operações permitidas.</p>}
    </li>)}</ul>
    <div className="library-actions"><button className="outline-button" disabled={loading||page===1} onClick={()=>setPage(page-1)}>Avisos anteriores</button><span>Página {page} · {data?.total??0} avisos</span><button className="outline-button" disabled={loading||!data||page*10>=data.total} onClick={()=>setPage(page+1)}>Próximos avisos</button></div>
  </section>;
}
