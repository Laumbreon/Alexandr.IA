import { useCallback, useEffect, useRef, useState } from "react";
import { getIdentity, type IdentityResult } from "../services/auth";

export type AuthState = IdentityResult | { status: "loading" };

export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const mounted = useRef(false);
  const generation = useRef(0);
  const lastStart = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    lastStart.current = Date.now();
    setState({ status: "loading" });
    const result = await getIdentity();
    // Uma resposta anterior não pode restaurar a interface depois de logout/unmount.
    if (mounted.current && current === generation.current) setState(result);
  }, []);
  const invalidate = useCallback(() => {
    generation.current++;
    if (mounted.current) setState({ status: "unauthenticated" });
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const onReturn = () => {
      // focus e visibilitychange normalmente chegam juntos: coalescer sem polling.
      if (document.visibilityState === "visible" && Date.now() - lastStart.current >= 1000) void refresh();
    };
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      mounted.current = false;
      generation.current++;
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [refresh]);

  return { state, refresh, invalidate };
}
