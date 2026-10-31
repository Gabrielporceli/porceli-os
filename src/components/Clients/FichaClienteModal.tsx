import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { useScrollLock } from "@/hooks/useScrollLock";
import { BLOCOS_FICHA, cplMaximo, simNaoDaResposta, type CampoFicha } from "@/features/clients/fichaCampos";
import { useFichaCliente, useSalvarFicha } from "@/hooks/useFichaCliente";

const campo =
  "bg-white/[0.03] border-white/[0.05] focus:border-white/40 text-white placeholder:text-white/20 rounded-xl transition-all";

const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Valor guardado → texto do campo (número em vírgula, como se digita). */
function paraTexto(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(v).replace(".", ",");
  return String(v);
}

/**
 * Ficha do cliente, preenchida pela agência. As mesmas perguntas do link que o
 * dono do negócio responde (src/features/clients/fichaCampos.ts).
 */
export function FichaClienteModal({
  clientId, empresa, open, onClose,
}: { clientId: string; empresa: string; open: boolean; onClose: () => void }) {
  useScrollLock(open);
  const { data: ficha } = useFichaCliente(open ? clientId : undefined);
  const salvar = useSalvarFicha(clientId);
  const [valores, setValores] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const inicial: Record<string, string> = {};
    for (const b of BLOCOS_FICHA) for (const c of b.campos) inicial[c.chave] = paraTexto(ficha?.[c.chave]);
    setValores(inicial);
  }, [open, ficha]);

  const cpl = cplMaximo(valores);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await salvar.mutateAsync(valores);
      toast.success("Ficha salva.");
      onClose();
    } catch (err) {
      toast.error(`Não consegui salvar: ${(err as Error).message}`);
    }
  };

  const entrada = (c: CampoFicha) => {
    const comum = {
      id: `ficha-${c.chave}`,
      value: valores[c.chave] ?? "",
      placeholder: c.exemplo,
      onChange: (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setValores((v) => ({ ...v, [c.chave]: ev.target.value })),
    };
    if (c.tipo === "simnao") {
      const sim = simNaoDaResposta(valores[c.chave]) === true;
      return (
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3 text-sm text-white/70">
          <Switch id={`${comum.id}`} checked={sim}
            onCheckedChange={(v) => setValores((x) => ({ ...x, [c.chave]: v ? "sim" : "não" }))} />
          {sim ? "Sim, pode usar" : "Não autorizado"}
        </div>
      );
    }
    return c.tipo === "longo"
      ? <Textarea {...comum} rows={2} className={`${campo} resize-none`} />
      : <Input {...comum} inputMode={c.tipo === "texto" ? undefined : "decimal"} className={`${campo} h-11`} />;
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="text-white max-w-3xl h-[85vh] !overflow-hidden"
        chip={<DialogTitle className="truncate font-bold tracking-tight">Ficha · {empresa}</DialogTitle>}
      >
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
          <form id="ficha-cliente-form" onSubmit={enviar} className="p-6 space-y-8">
            {ficha?.preenchido_por === "cliente" && ficha.respondido_cliente_em && (
              <p className="rounded-2xl bg-white/[0.04] p-4 text-xs text-white/50">
                Respondida pelo cliente em {new Date(ficha.respondido_cliente_em).toLocaleDateString("pt-BR")}.
              </p>
            )}
            {BLOCOS_FICHA.map((b) => (
              <div key={b.titulo} className="space-y-5">
                <h3 className="text-lg font-semibold text-white border-b border-white/[0.05] pb-2">{b.titulo}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {b.campos.map((c) => (
                    <div key={c.chave} className={`space-y-2 ${c.tipo === "longo" ? "md:col-span-2" : ""}`}>
                      <Label htmlFor={`ficha-${c.chave}`} className="text-white">{c.rotulo}</Label>
                      <p className="text-[11px] text-white/35">{c.pergunta}</p>
                      {entrada(c)}
                    </div>
                  ))}
                </div>
                {b.titulo === "Números" && (
                  <p className="text-xs text-white/50">
                    CPL máximo (ticket × margem × conversão):{" "}
                    <span className="font-bold text-white">{cpl !== null ? reais(cpl) : "preencha os três números"}</span>
                  </p>
                )}
              </div>
            ))}
          </form>
        </div>

        <div className="flex items-center justify-end gap-6 p-6 border-t border-white/[0.05] shrink-0">
          <motion.div>
            <button type="button" onClick={onClose} className="acao-texto">Cancelar</button>
          </motion.div>
          <motion.div>
            <LiquidGlassButton tint="primary" type="submit" form="ficha-cliente-form" disabled={salvar.isPending}
              className="h-11 px-8 text-xs font-bold uppercase tracking-widest">
              Salvar
            </LiquidGlassButton>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
