import { useEffect, useRef, useState } from 'react';
import { libraryRequest, validPage, type Page } from './api';
type Activity={id:string;titulo:string;estado:string;previsto_em?:string;posicao?:number|null};
type Reader={nome:string;email:string;ra:string|null;curso:string|null;ativo:boolean;habilitado:boolean};
export default function ReaderRecord({id}:{id:string}){
 const [record,setRecord]=useState<Reader|null>(null),[loans,setLoans]=useState<Page<Activity>|null>(null),[reserves,setReserves]=useState<Page<Activity>|null>(null),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{heading.current?.focus();let active=true;setRecord(null);setError('');setLoans(null);setReserves(null);
  Promise.all([libraryRequest<Reader>(`/leitores/${id}`),libraryRequest<Page<Activity>>(`/emprestimos?leitor_id=${id}&estado=todos&limite=50`).then(validPage<Activity>),libraryRequest<Page<Activity>>(`/reservas?leitor_id=${id}&estado=todas&limite=50`).then(validPage<Activity>)])
   .then(([reader,l,r])=>{if(active){setRecord(reader);setLoans(l);setReserves(r);}}).catch((e:Error)=>{if(active)setError(e.message);});return()=>{active=false;};},[id,revision]);
 return <section className="simple-page-card"><h2 ref={heading} tabIndex={-1}>Ficha e circulação do leitor</h2>{error?<p role="alert">{error}</p>:!record?<p role="status">Consultando ficha…</p>:<><h3>{record.nome}</h3><p>{record.email} · RA: {record.ra||'Não informado'} · {record.curso||'Curso não informado'}</p><p>{record.ativo&&record.habilitado?'Habilitado para circulação':'Impedido: conta inativa ou vínculo não habilitado'}. Limites, prazos e fila são verificados em cada operação.</p>
 <h3>Empréstimos ({loans?.total})</h3><ul>{loans?.items.map(item=><li key={item.id}>{item.titulo} · {item.estado} · Prazo: {item.previsto_em?new Date(item.previsto_em).toLocaleString('pt-BR'):'Não informado'}</li>)}</ul>
 <h3>Reservas ({reserves?.total})</h3><ul>{reserves?.items.map(item=><li key={item.id}>{item.titulo} · {item.estado}{item.posicao?` · Posição ${item.posicao}`:''}</li>)}</ul><p>Até 50 registros por lista nesta ficha; use Empréstimos e Reservas para pesquisa e paginação completas.</p></>}
 <button className="outline-button" onClick={()=>setRevision(v=>v+1)}>Atualizar ficha e circulação</button></section>;
}
