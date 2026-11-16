import LibraryPanel from "./LibraryPanel";

// Identidade editorial fictícia, sem sessão ou privilégio no sistema real.
const visitor = {
  id: "demonstracao-ficticia",
  nome: "Visita acadêmica",
  email: "demo@example.invalid",
  perfil: "bibliotecario" as const,
};

export default function DemoApp() {
  return <LibraryPanel user={visitor} demo
    sessionControls={<span className="profile-role">Sem autenticação</span>} />;
}
