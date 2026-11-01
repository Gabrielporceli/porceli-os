import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "./Header";
import { SystemAlerts } from "./SystemAlerts";
import { PageTransitionProvider } from "@/components/ui/PageTransition";
import { QuandoPronto } from "@/components/ui/QuandoPronto";
import { supabase } from "@/integrations/supabase/client";
import { appBackgroundStyle } from "@/lib/appBackground";

interface CRMLayoutProps {
  children: React.ReactNode;
}

export function CRMLayout({ children }: CRMLayoutProps) {
  const { pathname } = useLocation();
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

      {/* Troca de página sem véu: a página aparece inteira e suave quando
          terminou de carregar (QuandoPronto, logo abaixo). O provider fica só
          pelo sinal da animação do Header. */}
      <PageTransitionProvider>
        <div className="flex flex-col min-h-screen w-full relative z-10">


          {/* ✅ min-w-0 aqui é CRÍTICO */}
          <div className="flex-1 min-w-0 flex flex-col">
            <Header />
            {/* ✅ min-w-0 aqui também ajuda */}

            {/* No mobile o Header mora embaixo (fixo), não em cima — então é
                o pb-28 que precisa dar espaço pra ele no fim do conteúdo, e o
                pt-6 do topo pode ser só o respiro normal da página. A partir
                de md o Header vira barra lateral esquerda: pb-6 (sem nada
                fixo embaixo) e pl-[104px] dá espaço pra ele: a barra termina em 88px
                (16 de recuo + 72 de largura), mais 16px de respiro. A MESMA margem
                vale pra todas as páginas — era a que o Kanban de Leads já
                tinha. Sem largura máxima nem centralização: elas faziam o
                conteúdo se afastar da barra em monitores largos. */}
            <main className="flex-1 min-w-0 w-full pt-6 pb-28 md:pb-6 md:pl-[104px]">
              <div className="w-full px-4">
                <SystemAlerts />
                <QuandoPronto chave={pathname} tela>{children}</QuandoPronto>
              </div>
            </main>

          </div>
        </div>
      </PageTransitionProvider>
    </div>
  );
}
