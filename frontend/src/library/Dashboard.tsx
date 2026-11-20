import { useEffect, useState } from "react";
import { libraryRequest } from "./api";
type Summary={obras:number;total_exemplares:number;disponiveis:number;emprestados:number;indisponiveis:number;manutencao:number;baixados:number;danificados:number;atrasados:number;reservas_pendentes:number;leitores:number;leitores_habilitados:number;atualizado_em:string};
const labels:Record<Exclude<keyof Summary,'atualizado_em'>,string>={obras:'Obras cadastradas',total_exemplares:'Exemplares físicos',disponiveis:'Disponíveis fisicamente',emprestados:'Exemplares emprestados',indisponiveis:'Indisponíveis fisicamente',manutencao:'Em manutenção',baixados:'Baixados (histórico preservado)',danificados:'Danificados',atrasados:'Empréstimos atrasados',reservas_pendentes:'Reservas aguardando',leitores:'Leitores cadastrados',leitores_habilitados:'Leitores habilitados'};
export default function Dashboard(){
 const [data,setData]=useState<Summary|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');setData(null);
  libraryRequest<Summary>('/resumo').then(v=>{if(Object.keys(labels).some(k=>!Number.isSafeInteger(v[k as keyof typeof labels])||v[k as keyof typeof labels]<0))throw Error('Indicadores inválidos.');if(active)setData(v);}).catch((e:Error)=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[revision]);
 return <section className="library-view"><h1 className="page-title" tabIndex={-1}>Estoque e circulação</h1><p>Indicadores consultados no PostgreSQL. Disponibilidade física não garante retirada: fila, habilitação e limites continuam sendo verificados.</p>
 <button className="outline-button" disabled={loading} onClick={()=>setRevision(v=>v+1)}>Atualizar indicadores</button>
 {loading&&<p role="status">Consultando estoque…</p>}{error&&<p role="alert">{error}</p>}
 {data&&<><dl className="library-metrics">{Object.entries(labels).map(([key,label])=><div className="simple-page-card" key={key}><dt>{label}</dt><dd>{data[key as keyof typeof labels]}</dd></div>)}</dl><p>Consulta: {new Date(data.atualizado_em).toLocaleString('pt-BR')}. Total físico = disponíveis + emprestados + indisponíveis. Manutenção, baixa e dano são detalhamentos; não somá-los novamente.</p></>}
 </section>;
}
