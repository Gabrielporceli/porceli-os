import { useEffect } from "react";

/**
 * No iPhone o teclado NÃO encolhe a tela pro CSS: `vh` e `position: fixed`
 * continuam medindo a tela inteira, então um modal centralizado fica com a
 * metade de baixo (onde moram os botões de salvar) atrás do teclado.
 *
 * Quem sabe a área realmente visível é a `visualViewport`. Com o teclado
 * aberto num aparelho de toque, este hook publica essa área em `--vv-h`
 * (altura) e `--vv-top` (deslocamento) e marca o <html> com
 * `teclado-aberto`; a regra em index.css usa os dois pra reposicionar o
 * modal aberto dentro do que sobra. Teclado fechado: classe removida e o
 * modal volta exatamente ao que era.
 *
 * No desktop não liga nada (sem toque, sem teclado virtual). No Android o
 * navegador já encolhe a tela sozinho, a diferença nunca passa do limite e
 * a classe nunca entra.
 */
export function useTecladoMobile() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || !window.matchMedia("(pointer: coarse)").matches) return;
    const raiz = document.documentElement;
    const medir = () => {
      const aberto = window.innerHeight - vv.height > 120;
      raiz.classList.toggle("teclado-aberto", aberto);
      if (!aberto) return;
      raiz.style.setProperty("--vv-h", `${vv.height}px`);
      raiz.style.setProperty("--vv-top", `${vv.offsetTop}px`);
    };
    vv.addEventListener("resize", medir);
    vv.addEventListener("scroll", medir);
    return () => {
      vv.removeEventListener("resize", medir);
      vv.removeEventListener("scroll", medir);
      raiz.classList.remove("teclado-aberto");
    };
  }, []);
}
