/**
 * Funil de prospecção desenhado como funil: uma camada por etapa, na ordem
 * do Kanban, cada uma mais estreita que a anterior.
 *
 * A LARGURA É FIXA POR POSIÇÃO, não pela contagem. Os dados reais não são
 * monotônicos (às vezes há mais leads em "Em atendimento" que em "Sem
 * atendimento"), e largura por contagem faria o funil alargar no meio — vira
 * um vaso, não um funil. A contagem aparece no número e na intensidade da
 * cor da camada.
 */
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Etapa {
  name: string;
  count: number;
}

interface Props {
  etapas: Etapa[];
  className?: string;
}

/** Largura da camada do topo e da base do funil (fração do card). */
const TOPO = 1;
const BASE = 0.34;

export function FunnelCard({ etapas, className }: Props) {
  const total = etapas.reduce((s, e) => s + e.count, 0);
  const max = Math.max(1, ...etapas.map((e) => e.count));
  const n = etapas.length;
  // Largura da borda de CIMA de cada camada; a de baixo é a de cima da próxima.
  const largura = (i: number) => (n <= 1 ? TOPO : TOPO - ((TOPO - BASE) * i) / n);

  return (
    <Card className={cn("surface-flat flex flex-col p-5", className)}>
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-widest text-white/60">
          Funil de prospecção
        </h3>
        <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-white/35">
          {total} lead{total === 1 ? "" : "s"}
        </span>
      </div>

      {n === 0 ? (
        <p className="m-auto text-sm text-white/40">Nenhuma etapa no funil</p>
      ) : (
        <div className="flex min-h-[360px] flex-1 flex-col gap-1.5">
          {etapas.map((e, i) => {
            const cima = largura(i);
            const baixo = largura(i + 1);
            // Recuo de cada lado da borda de baixo, relativo à largura da camada.
            const recuo = ((cima - baixo) / 2 / cima) * 100;
            // Mais leads = camada mais acesa. Nunca apagada de todo: zerada
            // ainda precisa ler como parte do funil.
            const intensidade = 0.06 + 0.22 * (e.count / max);

            return (
              <div
                key={e.name}
                className="relative mx-auto flex min-h-[44px] flex-1 flex-col items-center justify-center text-center"
                style={{
                  width: `${cima * 100}%`,
                  clipPath: `polygon(0 0, 100% 0, ${100 - recuo}% 100%, ${recuo}% 100%)`,
                  // Neutro de propósito: o roxo fica reservado a destaque.
                  background: `rgba(244, 244, 244, ${intensidade})`,
                }}
              >
                <span className="text-lg font-black leading-none tabular-nums text-white">
                  {e.count}
                </span>
                <span className="mt-1 max-w-[70%] truncate text-[10px] font-black uppercase tracking-widest text-white/60">
                  {e.name}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
