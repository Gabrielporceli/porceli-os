/**
 * Etiquetas.
 *
 * São 251 distintas, 182 delas usadas UMA vez só. Desenhar as 251 como chips
 * — o que a tela fazia — produz um paredão onde nada é achável, e as 12 que
 * você realmente usa ficam perdidas no meio das 182 que não filtram nada.
 *
 * Então: as mais frequentes à mão, busca para o resto, e o que está
 * selecionado sempre visível no topo mesmo que seja raro.
 *
 * Filtro é E, não OU: marcar "copy" e "vendas" mostra o que tem as duas.
 * Com OU, cada etiqueta a mais ALARGA o resultado — o oposto do que se
 * espera ao clicar num filtro.
 */
import { useMemo, useState } from "react";
import { CloseCircle, SearchNormal1, Tag } from "iconsax-react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const VISIVEIS = 14;

interface Props {
  /** Todas as etiquetas com quantas notas cada uma tem. */
  contagem: Map<string, number>;
  ativas: string[];
  onAlternar: (tag: string) => void;
  onLimpar: () => void;
}

export function TagPicker({ contagem, ativas, onAlternar, onLimpar }: Props) {
  const [busca, setBusca] = useState("");
  const [verTodas, setVerTodas] = useState(false);

  const ordenadas = useMemo(
    () =>
      [...contagem.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR")
      ),
    [contagem]
  );

  const q = busca.trim().toLowerCase();

  const mostrar = useMemo(() => {
    if (q) return ordenadas.filter(([t]) => t.toLowerCase().includes(q)).slice(0, 40);
    const base = verTodas ? ordenadas : ordenadas.slice(0, VISIVEIS);
    // As ativas entram mesmo se forem raras demais pra estar no topo.
    const faltando = ativas
      .filter((t) => !base.some(([b]) => b === t))
      .map((t) => [t, contagem.get(t) ?? 0] as [string, number]);
    return [...faltando, ...base];
  }, [q, ordenadas, verTodas, ativas, contagem]);

  const restantes = ordenadas.length - VISIVEIS;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-black uppercase tracking-widest text-white/45">
          Etiquetas
        </span>
        {ativas.length > 0 && (
          <button
            type="button"
            onClick={onLimpar}
            className="flex items-center gap-1 text-[11px] text-white/40 transition-colors hover:text-white/80"
          >
            <Icon as={CloseCircle} size={12} />
            limpar {ativas.length}
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] px-2.5 py-1.5">
        <Icon as={SearchNormal1} size={13} className="shrink-0 text-white/30" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={`Buscar entre ${ordenadas.length}…`}
          className="min-w-0 flex-1 bg-transparent text-xs text-white placeholder:text-white/25 outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {mostrar.map(([t, n]) => {
          const ativa = ativas.includes(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => onAlternar(t)}
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] transition-colors",
                ativa
                  ? "bg-white/90 font-bold text-black"
                  : "bg-white/[0.06] text-white/60 hover:bg-white/12"
              )}
            >
              <Icon as={Tag} size={10} />
              {t}
              <span className={ativa ? "text-black/45" : "text-white/25"}>{n}</span>
            </button>
          );
        })}
      </div>

      {!q && restantes > 0 && (
        <button
          type="button"
          onClick={() => setVerTodas((v) => !v)}
          className="text-[11px] text-white/35 transition-colors hover:text-white/70"
        >
          {verTodas ? "mostrar menos" : `ver todas (+${restantes})`}
        </button>
      )}

      {q && mostrar.length === 0 && (
        <p className="text-[11px] text-white/25">nenhuma etiqueta com “{busca}”</p>
      )}
    </div>
  );
}
