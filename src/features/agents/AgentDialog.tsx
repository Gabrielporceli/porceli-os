import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import {
  OrbAvatar,
  ORB_ACCESSORY_LABEL,
  ORB_COLORS,
  ORB_EXTRAS,
  ORB_EYEWEAR,
  ORB_HATS,
  type AvatarColor,
  type OrbEyewear,
  type OrbExtra,
  type OrbHat,
} from "@/components/ui/orb-avatar";
import { cn } from "@/lib/utils";
import { createAgent, deleteAgent, setPrincipal, updateAgent, type StoredAgent } from "./agentsStore";

const field = "bg-white/[0.03] border-white/[0.05] text-white placeholder:text-white/20 rounded-xl";
const label = "text-white/70 text-xs font-bold uppercase tracking-widest";

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
        on ? "bg-white text-black" : "bg-white/[0.06] text-white/60 hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Sem `agent`, cria um novo; com ele, edita. */
  agent?: StoredAgent | null;
  isFirst?: boolean;
  onCreated?: (id: string) => void;
}

export function AgentDialog({ open, onClose, agent, isFirst, onCreated }: Props) {
  const [nome, setNome] = useState("");
  const [papel, setPapel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [cor, setCor] = useState<AvatarColor>("purple");
  const [chapeu, setChapeu] = useState<OrbHat | undefined>();
  const [oculos, setOculos] = useState<OrbEyewear | undefined>();
  const [extras, setExtras] = useState<OrbExtra[]>([]);
  const [principal, setPrincipalOn] = useState(false);

  // Cada abertura recomeça do agente editado (ou do zero).
  useEffect(() => {
    if (!open) return;
    setNome(agent?.nome ?? "");
    setPapel(agent?.papel ?? "");
    setPrompt(agent?.prompt ?? "");
    setCor(agent?.cor ?? ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)]);
    setChapeu(agent?.chapeu);
    setOculos(agent?.oculos);
    setExtras(agent?.extras ?? []);
    setPrincipalOn(agent?.principal ?? !!isFirst);
  }, [open, agent, isFirst]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    const draft = { nome: nome.trim(), papel: papel.trim(), prompt: prompt.trim(), cor, chapeu, oculos, extras };
    if (agent) {
      updateAgent(agent.id, draft);
      if (principal && !agent.principal) setPrincipal(agent.id);
    } else {
      onCreated?.(createAgent({ ...draft, principal }));
    }
    onClose();
  };

  const remove = () => {
    if (agent && window.confirm(`Excluir o agente ${agent.nome} e o histórico dele?`)) {
      deleteAgent(agent.id);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="text-white max-w-2xl max-h-[85vh] !overflow-hidden"
        chip={<DialogTitle className="truncate font-bold tracking-tight">{agent ? "Editar agente" : "Novo agente"}</DialogTitle>}
      >
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
            <div className="flex items-center gap-5">
              <div className="flex h-24 w-24 shrink-0 items-end justify-center pb-1">
                <OrbAvatar size="lg" color={cor} hat={chapeu} eyewear={oculos} extras={extras} />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="ag-nome" className={label}>Nome *</Label>
                <Input id="ag-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Atendente" className={cn(field, "h-11")} autoFocus />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ag-papel" className={label}>Papel</Label>
              <Input id="ag-papel" value={papel} onChange={(e) => setPapel(e.target.value)} placeholder="O que ele faz, em uma linha" className={cn(field, "h-11")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ag-prompt" className={label}>Instruções</Label>
              <Textarea
                id="ag-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Como ele deve se comportar, o que pode e não pode fazer…"
                className={cn(field, "min-h-[110px] resize-none")}
              />
            </div>

            <div className="space-y-2">
              <span className={label}>Cor</span>
              <div className="flex flex-wrap gap-2">
                {ORB_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setCor(c)} aria-label={c} className={cn("rounded-full p-1 transition", cor === c ? "ring-2 ring-white" : "opacity-70 hover:opacity-100")}>
                    <OrbAvatar size="sm" color={c} blinking={false} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className={label}>Chapéu</span>
              <div className="flex flex-wrap gap-1.5">
                <Chip on={!chapeu} onClick={() => setChapeu(undefined)}>Nenhum</Chip>
                {ORB_HATS.map((h) => <Chip key={h} on={chapeu === h} onClick={() => setChapeu(h)}>{ORB_ACCESSORY_LABEL[h]}</Chip>)}
              </div>
            </div>

            <div className="space-y-2">
              <span className={label}>Óculos</span>
              <div className="flex flex-wrap gap-1.5">
                <Chip on={!oculos} onClick={() => setOculos(undefined)}>Nenhum</Chip>
                {ORB_EYEWEAR.map((o) => <Chip key={o} on={oculos === o} onClick={() => setOculos(o)}>{ORB_ACCESSORY_LABEL[o]}</Chip>)}
              </div>
            </div>

            <div className="space-y-2">
              <span className={label}>Extras</span>
              <div className="flex flex-wrap gap-1.5">
                {ORB_EXTRAS.map((x) => (
                  <Chip key={x} on={extras.includes(x)} onClick={() => setExtras((cur) => (cur.includes(x) ? cur.filter((e) => e !== x) : [...cur, x]))}>
                    {ORB_ACCESSORY_LABEL[x]}
                  </Chip>
                ))}
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white/[0.04] p-4">
              <input
                type="checkbox"
                checked={principal}
                disabled={agent?.principal}
                onChange={(e) => setPrincipalOn(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#8B5CF6]"
              />
              <span className="text-sm">
                <span className="font-bold">Agente principal</span>
                <span className="block text-xs text-white/45">
                  Coordena os outros e recebe o que não tem dono. Só um por vez
                  {agent?.principal ? " — para trocar, marque outro agente como principal." : "."}
                </span>
              </span>
            </label>
          </div>

          <div className="flex shrink-0 items-center gap-3 border-t border-white/[0.05] p-6">
            {agent && (
              <LiquidGlassButton type="button" tint="danger" onClick={remove} className="h-10 px-5 text-xs font-bold uppercase tracking-widest">
                Excluir
              </LiquidGlassButton>
            )}
            <div className="flex-1" />
            <LiquidGlassButton type="button" onClick={onClose} className="h-10 px-5 text-xs font-bold uppercase tracking-widest">
              Cancelar
            </LiquidGlassButton>
            <LiquidGlassButton type="submit" tint="primary" disabled={!nome.trim()} className="h-10 px-5 text-xs font-bold uppercase tracking-widest">
              {agent ? "Salvar" : "Criar agente"}
            </LiquidGlassButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
