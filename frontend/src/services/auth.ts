export type User = { id: string; nome: string; email: string; perfil: "aluno" | "bibliotecario" | "administrador" };
export type IdentityResult =
  | { status: "authenticated"; user: User }
  | { status: "unauthenticated" | "unavailable" | "error" | "forbidden" };
export type LogoutResult = "success" | "unauthenticated" | "unavailable" | "forbidden" | "error";

const requestOptions: RequestInit = { credentials: "same-origin", cache: "no-store", redirect: "error" };
let identityRequest: Promise<IdentityResult> | null = null;
let logoutRequest: Promise<LogoutResult> | null = null;

async function readIdentity(): Promise<IdentityResult> {
  try {
    const response = await fetch("/api/me", requestOptions);
    if (response.status === 401) return { status: "unauthenticated" };
    if (response.status === 503) return { status: "unavailable" };
    if (response.status !== 200) return { status: "error" };
    const data: unknown = await response.json();
    if (!data || typeof data !== "object") return { status: "error" };
    const fields = data as Record<string, unknown>;
    if (typeof fields.id !== "string" || !fields.id ||
        typeof fields.nome !== "string" || !fields.nome ||
        typeof fields.email !== "string" || typeof fields.perfil !== "string") return { status: "error" };
    if (!["aluno", "bibliotecario", "administrador"].includes(fields.perfil)) return { status: "forbidden" };
    // Retém somente o contrato público; campos adicionais nunca são propagados.
    return { status: "authenticated", user: {
      id: fields.id, nome: fields.nome, email: fields.email, perfil: fields.perfil as User["perfil"],
    } };
  } catch { return { status: "error" }; }
}

export function getIdentity(): Promise<IdentityResult> {
  // Compartilha apenas a requisição em andamento, inclusive no StrictMode.
  // Não mantém cache persistente de identidade e não renova a sessão.
  if (!identityRequest) {
    const request = readIdentity();
    identityRequest = request;
    void request.finally(() => { if (identityRequest === request) identityRequest = null; });
  }
  return identityRequest;
}

async function endSession(): Promise<LogoutResult> {
  try {
    const csrfResponse = await fetch("/api/csrf", requestOptions);
    if (csrfResponse.status === 401) return "unauthenticated";
    if (csrfResponse.status === 503) return "unavailable";
    if (csrfResponse.status === 403) return "forbidden";
    if (csrfResponse.status !== 200) return "error";
    const data: unknown = await csrfResponse.json();
    const token = data && typeof data === "object" ? (data as Record<string, unknown>).csrfToken : undefined;
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return "error";
    const response = await fetch("/logout", {
      ...requestOptions, method: "POST", headers: { "X-CSRF-Token": token },
    });
    if (response.status === 401) return "unauthenticated";
    if (response.status === 503) return "unavailable";
    if (response.status === 403) return "forbidden";
    if (response.status !== 200) return "error";
    return (await response.json()).success === true ? "success" : "error";
  } catch { return "error"; }
}

export function logout(): Promise<LogoutResult> {
  logoutRequest ??= endSession().then((result) => {
    if (result === "success" || result === "unauthenticated") identityRequest = null;
    return result;
  }).finally(() => { logoutRequest = null; });
  return logoutRequest;
}
