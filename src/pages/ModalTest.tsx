import { useState } from "react";
import { Edit2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DeconstructedCard } from "@/components/ui/deconstructed-card";

function RealActivityCard({ title, index }: { title: string; index: number }) {
  return (
    <DeconstructedCard
      circle={
        <button className="flex h-full w-full items-center justify-center rounded-full surface-modal">
          <Edit2 className="h-4 w-4 text-white/80" />
        </button>
      }
      chip={
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Pendente</span>
        </div>
      }
    >
      <div className="p-3 space-y-1">
        <p className="text-sm font-black text-white">{title}</p>
        <p className="text-xs text-white/40">Atividade #{index + 1}</p>
      </div>
    </DeconstructedCard>
  );
}

export default function ModalTest() {
  const [count, setCount] = useState(3);

  const activities = Array.from({ length: count }, (_, i) => `Reunião ${i + 1} — Cliente Exemplo ${i + 1}`);

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center gap-4 p-8">
      <div className="fixed top-4 left-4 z-[200] flex gap-2">
        <button
          onClick={() => setCount(Math.max(1, count - 1))}
          className="px-3 py-1 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20"
        >
          − Atividade
        </button>
        <span className="px-3 py-1 bg-white/5 text-white text-sm rounded-lg">{count} ativ.</span>
        <button
          onClick={() => setCount(count + 1)}
          className="px-3 py-1 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20"
        >
          + Atividade
        </button>
      </div>

      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-[820px] h-[85vh] text-white !overflow-hidden"
          chip={
            <DialogTitle className="truncate text-xl font-black tracking-tight">
              15 de Outubro
            </DialogTitle>
          }
        >
          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden border-t border-white/[0.05]">
            {/* Esquerda: lista com DeconstructedCard reais */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 border-b md:border-b-0 md:border-r border-white/[0.05] space-y-3">
              {activities.map((title, i) => (
                <RealActivityCard key={i} title={title} index={i} />
              ))}
            </div>

            {/* Direita: formulário fake */}
            <div className="w-full md:w-[300px] flex-1 md:flex-none min-h-0 shrink-0 overflow-y-auto p-5 flex flex-col gap-4">
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Adicionar atividade</p>
              <div className="h-10 rounded-xl bg-white/[0.04] border border-white/[0.06]" />
              <div className="h-10 rounded-xl bg-white/[0.04] border border-white/[0.06]" />
              <div className="h-10 rounded-xl bg-white/[0.04] border border-white/[0.06]" />
              <div className="h-10 rounded-xl bg-purple-500/30 border border-purple-500/20 flex items-center justify-center">
                <span className="text-xs font-bold text-white/80 uppercase tracking-widest">Adicionar</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
