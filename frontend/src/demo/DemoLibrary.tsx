import { useState } from "react";

// Cenário editorial fixo: nenhuma política institucional ou persistência.
const books = [
  { id: 1, title: "Algoritmos do bosque", category: "Tecnologia" },
  { id: 2, title: "Memórias da biblioteca imaginária", category: "Literatura" },
];
const readers = ["Leitor fictício A", "Leitora fictícia B"];
const initialLoans = () => [
  { id: 1, book: 1, reader: 0, due: "2026-11-14", returned: false, renewed: false },
  { id: 2, book: 2, reader: 1, due: "2026-11-18", returned: false, renewed: false },
];
export default function useDemoLibrary() {
  const [loans, setLoans] = useState(initialLoans);
  const [reserved, setReserved] = useState(true);
  const [category, setCategory] = useState("Todas");
  const [message, setMessage] = useState("");
  function reset() {
    setLoans(initialLoans()); setReserved(true); setCategory("Todas");
    setMessage("Cenário fictício reiniciado apenas nesta visita.");
  }
  const introduction = <>
    <p>Simulação em memória, apenas nesta visita. Nada é registrado ou enviado ao sistema real. Recarregar restaura o cenário.</p>
    <p>Data de referência fictícia: 16/11/2026. Prazos e renovação abaixo são exemplos, sem valor de política institucional.</p>
    <button type="button" className="outline-button" onClick={reset}>Reiniciar cenário fictício</button>
    <p role="status">{message}</p>
  </>;
  function view(title: string, content: React.ReactNode) {
    return <section className="library-view"><h1 tabIndex={-1}>{title}</h1>{introduction}{content}</section>;
  }
  const notices = loans.filter(loan => !loan.returned && loan.due <= "2026-11-18");
  return {
    "Visão geral": view("Avisos demonstrativos", <>
      <h2>Acompanhamento fictício</h2>
      <ul className="library-list">{notices.map(loan => <li className="simple-page-card" key={loan.id}>
        {loan.due < "2026-11-16" ? "Atraso simulado" : "Prazo próximo simulado"}: {books[loan.book - 1].title} — {readers[loan.reader]} — {loan.due}
      </li>)}{reserved && <li className="simple-page-card">Reserva fictícia aguardando — Algoritmos do bosque — Leitora fictícia B — posição 1</li>}</ul>
      {!notices.length && !reserved && <p>Nenhum aviso neste cenário fictício.</p>}
      <p>Nenhum e-mail, WhatsApp ou SMS é enviado.</p>
    </>),
    "Acervo": view("Acervo demonstrativo", <>
      <div className="library-actions"><button type="button" onClick={() => setCategory("Todas")}>Todas as categorias</button>
        {["Tecnologia", "Literatura"].map(item => <button type="button" className="category-card" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
      </div><h2>{category === "Todas" ? "Livros fictícios" : `Livros de ${category}`}</h2>
      <ul className="library-list">{books.filter(book => category === "Todas" || book.category === category).map(book => <li className="simple-page-card" key={book.id}>
        <h3>{book.title}</h3><p>Autoria fictícia · {book.category} · Exemplar DEMO-{book.id}</p>
        <p>{loans.some(loan => loan.book === book.id && !loan.returned) ? "Emprestado no cenário" : "Disponível no cenário"}</p>
        {book.id === 1 && <button type="button" disabled={reserved} onClick={() => { setReserved(true); setMessage("Reserva simulada apenas em memória."); }}>Simular reserva</button>}
      </li>)}</ul>
    </>),
    "Leitores": view("Leitores demonstrativos", <><h2>Identidades exclusivamente fictícias</h2><ul className="library-list">{readers.map((reader, index) => <li className="simple-page-card" key={reader}>{reader} · DEMO-{index + 1} · Ativo no cenário</li>)}</ul><p>Sem cadastro de pessoas, senhas ou autenticação nesta demonstração.</p></>),
    "Empréstimos": view("Circulação demonstrativa", <>
      <h2>Empréstimos e renovações simulados</h2>
      <ul className="library-list">{loans.map(loan => <li className="simple-page-card" key={loan.id}>
        <h3>{books[loan.book - 1].title}</h3><p>{readers[loan.reader]} · Prazo fictício: {loan.due} · {loan.returned ? "Devolvido na simulação" : "Ativo na simulação"}</p>
        <div className="library-actions"><button type="button" disabled={loan.returned} onClick={() => {
          setLoans(previous => previous.map(item => item.id === loan.id ? { ...item, returned: true } : item));
          setMessage("Devolução simulada apenas em memória. Acervo e avisos atualizados neste cenário.");
        }}>Simular devolução {loan.id}</button>
        <button type="button" disabled={loan.returned || loan.renewed || loan.due < "2026-11-16" || (loan.book === 1 && reserved)} onClick={() => {
          setLoans(previous => previous.map(item => item.id === loan.id ? { ...item, renewed: true, due: "2026-11-25" } : item));
          setMessage("Renovação simulada até 25/11/2026 apenas em memória; nenhum registro real alterado.");
        }}>Simular renovação {loan.id}</button></div>
        {!loan.returned && loan.due < "2026-11-16" && <p>Renovação indisponível: atraso fictício.</p>}
      </li>)}</ul>
      <h2>Reservas simuladas</h2><p>{reserved ? "Algoritmos do bosque · Leitora fictícia B · Aguardando, posição 1. A devolução não atende automaticamente a reserva." : "Nenhuma reserva no cenário."}</p>
      <button type="button" disabled={!reserved} onClick={() => { setReserved(false); setMessage("Cancelamento simulado apenas em memória."); }}>Simular cancelamento da reserva</button>
    </>),
  };
}
