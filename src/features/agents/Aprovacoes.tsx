/**
 * Aprovações dos agentes.
 *
 * Lê `agente_aprovacoes`, onde os agentes registram pelo MCP (`pedir_aprovacao`)
 * o que depende do "ok" do Gabriel. Aqui ele aprova, pede ajuste (com o que
 * mudar) ou recusa; um script na VPS, sem IA, entrega a decisão ao agente pelo
 * Kanban e avisa o resultado no Telegram. O botão mostra quantas estão
 * pendentes e se atualiza a cada 30 s.
 */
import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Aprovacao {
  id: string;
  agente: string;
  titulo: string;
  resumo: string | null;
  cliente: string | null;
  created_at: string;
}

type Decisao = "aprovado" | "ajuste" | "recusado";

/** Nome de gente para o profile do Hermes que pediu. */
const AGENTE: Record<string, string> = {
  elly: "Elly", analista: "Analista", estrategista: "Estrategista", "operador-meta": "Meta Ads",
  "operador-google": "Google Ads", cro: "CRO", pesquisa: "Pesquisa", "especialista-tracking": "Tracking",
  "especialista-os": "Porceli OS",
};

/** Aprovações pendentes, recarregando a cada 30 s (e na hora, depois de decidir). */
export function useAprovacoesPendentes() {
  const [lista, setLista] = useState<Aprovacao[] | null>(null);
  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from("agente_aprovacoes" as never)
      .select("id, agente, titulo, resumo, cliente, created_at")
      .eq("status", "pendente")
      .order("created_at", { ascending: true });
    setLista((data ?? []) as unknown as Aprovacao[]);
  }, []);
  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 30_000);
    return () => clearInterval(t);
  }, [carregar]);
  return { lista, carregar };
}

/** Botão do topo da Central de Agentes: mesmo padrão dos outros, com o número de pendentes. */
export function BotaoAprovacoes({ pendentes, onClick }: { pendentes: number; onClick: () => void }) {
  return (
    <LiquidGlassButton onClick={onClick} className="h-11 gap-2 px-5 text-xs font-bold uppercase tracking-widest">
      Aprovações
      {pendentes > 0 && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-black tabular-nums text-white">
          {pendentes}
        </span>
      )}
    </LiquidGlassButton>
  );
}

function Item({ a, onDecidido }: { a: Aprovacao; onDecidido: () => void }) {
  const [ajustando, setAjustando] = useState(false);
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState<Decisao | null>(null);

  const decidir = async (status: Decisao) => {
    if (status === "ajuste" && !texto.trim()) {
      toast.error("Diga o que precisa mudar.");
      return;
    }
    setSalvando(status);
    const { error } = await supabase
      .from("agente_aprovacoes" as never)
      .update({ status, comentario: texto.trim() || null, decidido_em: new Date().toISOString() } as never)
      .eq("id", a.id)
      .eq("status", "pendente");
    setSalvando(null);
    if (error) {
      toast.error(`Não consegui salvar: ${error.message}`);
      return;
    }
    toast.success(
      status === "aprovado" ? "Aprovado. O agente segue em até 1 minuto e o resultado chega no Telegram."
        : status === "ajuste" ? "Ajuste enviado ao agente."
        : "Recusado.",
    );
    onDecidido();
  };

  return (
    <div className="space-y-3 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white">{a.titulo}</p>
          <p className="mt-0.5 text-[11px] text-white/40">
            {AGENTE[a.agente] ?? a.agente}
            {a.cliente && ` · ${a.cliente}`}
            {" · "}
            {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
      </div>
      {a.resumo && <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-white/70">{a.resumo}</p>}
      {ajustando && (
        <Textarea
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="O que precisa mudar?"
          className="min-h-[72px] rounded-xl border-white/[0.06] bg-white/[0.03] text-[13px] text-white placeholder:text-white/25"
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        {ajustando ? (
          <>
            <LiquidGlassButton tint="primary" disabled={!!salvando} onClick={() => decidir("ajuste")}
              className="h-9 px-4 text-[11px] font-bold uppercase tracking-widest">
              Enviar ajuste
            </LiquidGlassButton>
            <button type="button" onClick={() => setAjustando(false)} className="px-2 text-[11px] text-white/40 hover:text-white/70">
              Cancelar
            </button>
          </>
        ) : (
          <>
            <LiquidGlassButton tint="primary" disabled={!!salvando} onClick={() => decidir("aprovado")}
              className="h-9 px-4 text-[11px] font-bold uppercase tracking-widest">
              {salvando === "aprovado" ? "Aprovando…" : "Aprovar"}
            </LiquidGlassButton>
            <LiquidGlassButton disabled={!!salvando} onClick={() => setAjustando(true)}
              className="h-9 px-4 text-[11px] font-bold uppercase tracking-widest">
              Pedir ajuste
            </LiquidGlassButton>
            <button type="button" disabled={!!salvando} onClick={() => decidir("recusado")}
              className={cn("px-2 text-[11px] font-bold uppercase tracking-widest text-rose-300/70 hover:text-rose-300",
                salvando && "opacity-50")}>
              Recusar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function Aprovacoes({ open, onClose, lista, onMudou }: {
  open: boolean; onClose: () => void; lista: Aprovacao[] | null; onMudou: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-2xl text-white"
        chip={<DialogTitle className="truncate font-bold tracking-tight">Aprovações</DialogTitle>}
      >
        <div className="space-y-4 p-6">
          <p className="text-[11px] text-white/35">
            O que os agentes só fazem com o seu ok. Você também pode responder pelo Telegram.
          </p>
          {lista === null ? (
            <p className="py-10 text-center text-sm text-white/35">Carregando…</p>
          ) : lista.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/35">Nada esperando por você.</p>
          ) : (
            <div className="max-h-[60vh] divide-y divide-white/[0.05] overflow-y-auto rounded-2xl bg-white/[0.03] scrollbar-hide">
              {lista.map((a) => <Item key={a.id} a={a} onDecidido={onMudou} />)}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
