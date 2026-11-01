import { useEffect } from "react";
import { paginaSegurando } from "@/lib/carregamentoDaPagina";

/**
 * Renderizado pelas páginas enquanto `usePageReady()` é false.
 *
 * Não desenha nada: só ocupa uma altura mínima (o documento não colapsa a zero
 * e não salta o scroll quando o conteúdo real monta) e avisa que a página está
 * segurando (contador próprio — ver `paginaSegurando`).
 * É isso que faz o `QuandoPronto` do CRMLayout esperar a página trocar o
 * PageLoader pelo conteúdo antes de mostrar — e então mostrar tudo junto.
 */
export function PageLoader() {
  useEffect(() => paginaSegurando(), []);
  return <div className="h-[70vh]" aria-busy="true" />;
}
