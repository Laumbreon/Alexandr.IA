import { useEffect, useRef, useState } from "react";
import Catalog from "./Catalog";
import Readers from "./Readers";
import Loans from "./Loans";
import Reservations from "./Reservations";
import Notices from "./Notices";
export default function StudentLibrary() {
  const [tab,setTab] = useState('Catálogo');
  const heading = useRef<HTMLDivElement>(null);
  useEffect(()=>{heading.current?.querySelector<HTMLElement>('h2')?.focus();},[tab]);
  return <section><nav className="library-actions" aria-label="Áreas do aluno">{['Catálogo','Meu perfil','Meus empréstimos','Minhas reservas','Avisos'].map((name)=><button className="outline-button" key={name} aria-pressed={tab===name} onClick={()=>setTab(name)}>{name}</button>)}</nav>
    <div ref={heading}>{tab==='Catálogo'?<Catalog staff={false}/>:tab==='Meu perfil'?<Readers own/>:tab==='Meus empréstimos'?<Loans own/>:tab==='Minhas reservas'?<Reservations own/>:<Notices own/>}</div></section>;
}
