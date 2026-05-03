import { useEffect } from "react";
import { Header } from "./Header";
import { supabase } from "@/integrations/supabase/client";

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
    <div className="min-h-screen bg-porceli-dark relative overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/background.png")' }}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      </div>

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px'
        }}
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
