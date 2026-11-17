import LibraryPanel from "./LibraryPanel";
import useDemoLibrary from "./demo/DemoLibrary";

// Identidade editorial fictícia, sem sessão ou privilégio no sistema real.
const visitor = {
  id: "demonstracao-ficticia",
  nome: "Visita acadêmica",
  email: "demo@example.invalid",
  perfil: "bibliotecario" as const,
};

export default function DemoApp() {
  const sections = useDemoLibrary();
  return <LibraryPanel user={visitor} demo sections={sections}
    sessionControls={<span className="profile-role">Sem autenticação</span>} />;
}
