import { useEffect, useRef, useState } from "react";
import Catalog from "./Catalog";
import Readers from "./Readers";
import Loans from "./Loans";
import Reservations from "./Reservations";
import Notices from "./Notices";
export default function StudentLibrary() {
  const [tab,setTab] = useState('Início');
  const heading = useRef<HTMLDivElement>(null);
  useEffect(()=>{heading.current?.querySelector<HTMLElement>('h2')?.focus();},[tab]);
  return <section><nav className="library-actions" aria-label="Áreas do aluno">{['Início','Catálogo','Meu perfil','Meus empréstimos','Minhas reservas','Avisos'].map((name)=><button className="outline-button" key={name} aria-pressed={tab===name} onClick={()=>setTab(name)}>{name}</button>)}</nav>
    <div ref={heading}>{tab==='Início'?<section className="library-view"><h2 tabIndex={-1}>Sua biblioteca conectada</h2><p>Consulte o catálogo, seus empréstimos, reservas e avisos pelos botões acima. Os dados são consultados na sua sessão; operações só são confirmadas após resposta do servidor.</p></section>:tab==='Catálogo'?<Catalog staff={false}/>:tab==='Meu perfil'?<Readers own/>:tab==='Meus empréstimos'?<Loans own/>:tab==='Minhas reservas'?<Reservations own/>:<Notices own/>}</div></section>;
}
