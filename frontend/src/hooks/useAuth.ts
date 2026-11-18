import { useCallback, useEffect, useRef, useState } from "react";
import { getIdentity, type IdentityResult } from "../services/auth";
import { onSessionExpired } from "../services/sessionEvents";

export type AuthState = IdentityResult | { status: "loading" };

export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const mounted = useRef(false);
  const generation = useRef(0);
  const lastStart = useRef(0);
  const invalidated = useRef(false);
  const refresh = useCallback(async () => {
    if (invalidated.current) return;
    const current = ++generation.current;
    lastStart.current = Date.now();
    setState({ status: "loading" });
    const result = await getIdentity();
    // Uma resposta anterior não pode restaurar a interface depois de logout/unmount.
    if (mounted.current && current === generation.current) setState(result);
  }, []);
  const invalidate = useCallback(() => {
    invalidated.current = true;
    generation.current++;
    if (mounted.current) setState({ status: "unauthenticated" });
  }, []);

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = onSessionExpired(invalidate);
    void refresh();
    const onReturn = () => {
      // focus e visibilitychange normalmente chegam juntos: coalescer sem polling.
      if (document.visibilityState === "visible" && Date.now() - lastStart.current >= 1000) void refresh();
    };
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      mounted.current = false;
      unsubscribe();
      generation.current++;
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [refresh, invalidate]);

  return { state, refresh, invalidate };
}
