import { AuthGate } from "./components/AuthGate";
import { LogoutButton } from "./components/LogoutButton";
import LibraryPanel from "./LibraryPanel";
import Catalog from "./library/Catalog";
import Readers from "./library/Readers";
import StudentLibrary from "./library/StudentLibrary";
import CirculationArea from "./library/CirculationArea";
import Notices from "./library/Notices";

// Entrada autenticada: conserva identidade, sessao e logout reais.
export default function App() {
  return <AuthGate studentContent={() => <StudentLibrary/>}>{(user, onSessionEnd) => <LibraryPanel user={user}
    sections={{ "Visão geral": <Notices/>, Acervo: <Catalog staff />, Leitores: <Readers/>, "Empréstimos": <CirculationArea/> }}
    sessionControls={<LogoutButton onSessionEnd={onSessionEnd} />} />}</AuthGate>;
}
