import { useEffect, useRef, useState } from "react";

// O breakpoint acompanha o CSS. O menu móvel é modal e sempre oferece saída.
export default function useNavigation(section: string) {
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 760px)").matches);
  const [open, setOpen] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const destination = useRef<"opener" | "heading" | null>(null);
  const close = (target: "opener" | "heading" = "opener") => {
    destination.current = target;
    if (!open && target === "heading") (heading.current || document.querySelector<HTMLElement>("#conteudo h1"))?.focus();
    setOpen(false);
  };
  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const resize = () => {
      setMobile(query.matches);
      // Não devolver foco a um botão que desaparece no desktop.
      if (!query.matches) { destination.current = "heading"; setOpen(false); }
    };
    query.addEventListener("change", resize);
    return () => query.removeEventListener("change", resize);
  }, []);
  useEffect(() => {
    if (!open) {
      if (destination.current === "heading") (heading.current || document.querySelector<HTMLElement>("#conteudo h1"))?.focus();
      if (destination.current === "opener") opener.current?.focus();
      destination.current = null;
      return;
    }
    sidebar.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key !== "Tab") return;
      const controls = Array.from(sidebar.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") || []);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keyboard);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", keyboard);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, section, mobile]);
  return { mobile, open, setOpen, close, sidebar, opener, heading };
}
