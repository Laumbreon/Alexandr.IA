import { useEffect, useRef, useState } from "react";
import Loans from "./Loans";
import Reservations from "./Reservations";
export default function CirculationArea() {
  const [tab,setTab]=useState('Empréstimos');const content=useRef<HTMLDivElement>(null);
  useEffect(()=>{content.current?.querySelector<HTMLElement>('h1')?.focus();},[tab]);
  return <section><nav className="library-actions" aria-label="Operações de circulação">{['Empréstimos','Reservas'].map((name)=><button className="outline-button" key={name} aria-pressed={tab===name} onClick={()=>setTab(name)}>{name}</button>)}</nav><div ref={content}>{tab==='Empréstimos'?<Loans/>:<Reservations/>}</div></section>;
}
