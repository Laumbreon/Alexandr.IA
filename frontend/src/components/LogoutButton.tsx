import { useRef, useState } from "react";
import { logout } from "../services/auth";

export function LogoutButton({ onSessionEnd }: { onSessionEnd: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const leave = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await logout();
      if (result === "success" || result === "unauthenticated") {
        // 401 significa sessão indisponível, nunca confirmação de logout.
        onSessionEnd();
        return;
      }
      setError(result === "unavailable"
        ? "Serviço indisponível. A saída não foi confirmada; tente novamente."
        : result === "forbidden"
          ? "Não foi possível validar a saída. Tente novamente."
          : "Não foi possível concluir a saída. Tente novamente.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return <div>
    <button type="button" className="outline-button" disabled={busy} onClick={() => void leave()}>
      {busy ? "Saindo…" : "Sair"}
    </button>
    {error && <p role="alert">{error}</p>}
  </div>;
}
