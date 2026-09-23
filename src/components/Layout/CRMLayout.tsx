import { useEffect } from "react";
import { Header } from "./Header";
import { PageTransitionProvider } from "@/components/ui/PageTransition";
import { supabase } from "@/integrations/supabase/client";
import { appBackgroundStyle } from "@/lib/appBackground";

interface CRMLayoutProps {
  children: React.ReactNode;
}

export function CRMLayout({ children }: CRMLayoutProps) {
  useEffect(() => {
    // Estabelece a conexão com o Supabase assim que o layout carrega,
    // antes dos dados do Dashboard serem requisitados.
    supabase.from("clients").select("id").limit(1);
  }, []);
  return (
    <div className="min-h-screen bg-porceli-dark">
      {/* Background fixo — não estica com o conteúdo.
          Wallpaper + escurecimento + grão numa camada só, com
          background-blend-mode. O grão NÃO pode voltar a ser uma div com
          mix-blend-mode por cima: ver appBackground.ts. */}
      <div
        className="fixed inset-0"
        style={appBackgroundStyle}
      />

      {/* PageTransitionProvider: overlay preto + logo que cobre a tela
          inteira (header incluso) a cada troca de página — ver
          PageTransition.tsx. Fica aqui, e não dentro das páginas, pra
          conseguir animar a saída por cima do conteúdo já montado. */}
      <PageTransitionProvider>
        <div className="flex flex-col min-h-screen w-full relative z-10">


          {/* ✅ min-w-0 aqui é CRÍTICO */}
          <div className="flex-1 min-w-0 flex flex-col">
            <Header />
            {/* ✅ min-w-0 aqui também ajuda */}

            {/* No mobile o Header mora embaixo (fixo), não em cima — então é
                o pb-28 que precisa dar espaço pra ele no fim do conteúdo, e o
                pt-6 do topo pode ser só o respiro normal da página. A partir
                de md o Header volta pro topo: inverte pra pt-32 (espaço pro
                header fixo) / pb-6 (sem nada fixo embaixo). */}
            <main className="flex-1 min-w-0 w-full pt-6 pb-28 md:pt-32 md:pb-6">
              <div className="max-w-[1600px] mx-auto w-full px-4 lg:px-10">
                {children}
              </div>
            </main>

          </div>
        </div>
      </PageTransitionProvider>
    </div>
  );
}
