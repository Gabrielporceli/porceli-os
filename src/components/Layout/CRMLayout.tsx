import { useEffect } from "react";
import { Header } from "./Header";
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

      <div className="flex flex-col min-h-screen w-full relative z-10">


        {/* ✅ min-w-0 aqui é CRÍTICO */}
        <div className="flex-1 min-w-0 flex flex-col">
          <Header />
          {/* ✅ min-w-0 aqui também ajuda */}

          <main className="flex-1 min-w-0 w-full pt-32 pb-6">
            <div className="max-w-[1600px] mx-auto w-full px-4 lg:px-10">
              {children}
            </div>
          </main>

        </div>
      </div>
    </div>
  );
}
