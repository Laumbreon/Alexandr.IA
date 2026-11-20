import { AuthGate } from "./components/AuthGate";
import { LogoutButton } from "./components/LogoutButton";
import LibraryPanel from "./LibraryPanel";
import Catalog from "./library/Catalog";
import Readers from "./library/Readers";
import StudentLibrary from "./library/StudentLibrary";
import CirculationArea from "./library/CirculationArea";
import Notices from "./library/Notices";
import Dashboard from "./library/Dashboard";
import Reservations from "./library/Reservations";
import Unavailable from "./library/Unavailable";

// Entrada autenticada: conserva identidade, sessao e logout reais.
export default function App() {
  return <AuthGate studentContent={() => <StudentLibrary/>}>{(user, onSessionEnd) => <LibraryPanel user={user}
    sections={{ "Visão geral": <Dashboard/>, Acervo: <Catalog staff />, Leitores: <Readers/>, "Empréstimos": <CirculationArea/>, Reservas:<Reservations/>, Avisos:<Notices/>, Relatórios:<Unavailable title="Relatórios"/> }}
    sessionControls={<LogoutButton onSessionEnd={onSessionEnd} />} />}</AuthGate>;
}
