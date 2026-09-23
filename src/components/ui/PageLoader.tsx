/**
 * Renderizado pelas páginas enquanto `usePageReady()` é false.
 *
 * Não desenha nada: quem cobre a tela é o overlay da transição, que mora
 * no CRMLayout (ver PageTransition.tsx). Aqui só ocupamos uma altura
 * mínima pro documento não colapsar a zero e dar salto de scroll quando o
 * conteúdo real montar.
 *
 * Também não avisa mais ninguém: o "estou carregando" passou a sair do
 * próprio usePageReady, que é quem realmente sabe se os dados chegaram.
 */
export function PageLoader() {
  return <div className="h-[70vh]" aria-busy="true" />;
}
