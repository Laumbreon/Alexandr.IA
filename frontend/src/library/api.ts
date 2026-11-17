export class LibraryError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function libraryRequest<T>(route: string, method = "GET", data?: unknown): Promise<T> {
  const options: RequestInit = { method, credentials: "same-origin", cache: "no-store", redirect: "error" };
  const headers: Record<string, string> = {};
  if (method !== "GET") {
    const tokenResponse = await fetch("/api/csrf", { credentials: "same-origin", cache: "no-store", redirect: "error" });
    if (!tokenResponse.ok) throw new LibraryError(tokenResponse.status, "Não foi possível validar a sessão. Tente novamente.");
    const token = await tokenResponse.json();
    if (!/^[a-f0-9]{64}$/.test(token.csrfToken)) throw new Error("Resposta CSRF inválida.");
    headers["X-CSRF-Token"] = token.csrfToken;
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(data);
  }
  let response: Response;
  try { response = await fetch("/api/biblioteca" + route, { ...options, headers }); }
  catch { throw new Error("Não foi possível conectar à biblioteca."); }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new LibraryError(response.status, body?.message || "Não foi possível concluir a operação.");
  if (!body || typeof body !== "object") throw new Error("Resposta inválida da biblioteca.");
  return body as T;
}
export type Page<T> = { items: T[]; total: number; pagina: number; limite: number };
export type Book = { id: string; titulo: string; isbn: string | null; editora: string | null; categoria: string; autores: string[]; total_exemplares: number; circulaveis: number; disponiveis?:number; versao: number };
export type Copy = { id: string; livro_id: string; patrimonio: string; estado: string; conservacao: string; disponivel?:boolean; versao: number };
export function validPage<T>(page: Page<T>): Page<T> {
  if (!Array.isArray(page.items) || !Number.isFinite(page.total)) throw new Error("Resposta inválida da biblioteca.");
  return page;
}
