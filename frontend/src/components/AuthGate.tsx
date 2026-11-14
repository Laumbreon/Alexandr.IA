import { useEffect, type ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import type { User } from "../services/auth";
import { LogoutButton } from "./LogoutButton";

const goToLogin = () => window.location.replace("/login");

export function AuthGate({ children, navigateToLogin = goToLogin }: {
  children: (user: User, onSessionEnd: () => void) => ReactNode;
  navigateToLogin?: () => void;
}) {
  const { state, refresh, invalidate } = useAuth();
  useEffect(() => {
    // Preferências antigas continuam válidas, inclusive na área do aluno.
    const root = document.documentElement;
    root.dataset.theme = localStorage.getItem("bibliotech-theme") === "dark" ? "dark" : "light";
    root.dataset.fontSize = localStorage.getItem("bibliotech-large-text") === "true" ? "large" : "default";
    root.dataset.contrast = localStorage.getItem("bibliotech-high-contrast") === "true" ? "high" : "default";
    root.dataset.motion = localStorage.getItem("bibliotech-reduced-motion") === "true" ? "reduced" : "default";
  }, []);
  useEffect(() => {
    if (state.status === "unauthenticated") navigateToLogin();
  }, [state.status, navigateToLogin]);

  if (state.status === "authenticated") {
    if (state.user.perfil === "aluno") {
      return <div className="app-shell student-shell">
        <a className="skip-link" href="#conteudo">Pular para o conteúdo principal</a>
        <header className="student-header">
          <strong className="brand-name">Alexandr.IA</strong>
          <nav aria-label="Navegação do aluno"><a href="#conteudo" aria-current="page">Início</a></nav>
          <LogoutButton onSessionEnd={invalidate} />
        </header>
        <main id="conteudo" tabIndex={-1} className="content simple-page-card student-card" aria-label="Área do aluno">
          <span className="eyebrow">Perfil: Aluno</span>
          <h1 className="page-title">Área do aluno</h1>
          <p>Olá, {state.user.nome}. Boas-vindas à Alexandr.IA!</p>
          <h2 className="section-title">Sua biblioteca</h2>
          <p>As funções da biblioteca estão em desenvolvimento.</p>
          <p>Consulta ao acervo, empréstimos e reservas estarão disponíveis em uma próxima etapa.</p>
        </main>
      </div>;
    }
    return children(state.user, invalidate);
  }
  return <main className="app-shell">
    <section className="content simple-page-card" aria-live="polite" aria-busy={state.status === "loading"}>
      <h1>Alexandr.IA</h1>
      {state.status === "loading" && <p role="status">Carregando identidade…</p>}
      {state.status === "unauthenticated" && <p role="status">Sessão inválida, expirada ou encerrada. Redirecionando para o login…</p>}
      {state.status === "forbidden" && <p role="alert">Acesso não autorizado para este perfil.</p>}
      {state.status === "unavailable" && <p role="alert">Serviço temporariamente indisponível.</p>}
      {state.status === "error" && <p role="alert">Não foi possível consultar a identidade.</p>}
      {["unavailable", "error"].includes(state.status) && (
        <button type="button" className="outline-button" onClick={() => void refresh()}>Tentar novamente</button>
      )}
      {state.status !== "loading" && <a href="/login">Voltar ao login</a>}
    </section>
  </main>;
}
