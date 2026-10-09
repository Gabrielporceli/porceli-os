import { useLayoutEffect, useRef, useState } from "react";

/**
 * Faz um bloco ocupar a mesma faixa da barra lateral (16px do topo e 16px do
 * fundo), como o mapa de funil. Passe `ref` ao bloco e aplique `style` nele.
 * Em telas estreitas (< 768px) a barra vira rodapé e o bloco só ocupa o que
 * sobra abaixo do topo.
 */
export function useSidebarBand(active = true) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ height?: number; shift: number }>({ shift: 0 });

  useLayoutEffect(() => {
    if (!active) return;
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - (Number(el.dataset.shift) || 0);
      if (window.innerWidth >= 768) {
        setBox({ height: Math.max(420, window.innerHeight - 32), shift: 16 - top });
      } else {
        setBox({ height: Math.max(420, window.innerHeight - top - 120), shift: 0 });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active]);

  return {
    ref,
    dataShift: box.shift,
    style: { height: box.height, marginTop: box.shift } as React.CSSProperties,
  };
}
