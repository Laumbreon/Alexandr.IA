import { AuthGate } from "./components/AuthGate";
import { LogoutButton } from "./components/LogoutButton";
import LibraryPanel from "./LibraryPanel";

// Entrada autenticada: conserva identidade, sessao e logout reais.
export default function App() {
  return <AuthGate>{(user, onSessionEnd) => <LibraryPanel user={user}
    sessionControls={<LogoutButton onSessionEnd={onSessionEnd} />} />}</AuthGate>;
}
