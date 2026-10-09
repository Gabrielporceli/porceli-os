import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Ideia } from "./usePauta";

const field = "bg-white/[0.03] border-white/[0.05] text-white placeholder:text-white/20 rounded-xl";
const label = "text-white/70 text-xs font-bold uppercase tracking-widest";
const VAZIO = "__vazio__";

interface Props {
  ideia: Ideia | null;
  formatos: string[];
  onAtualizar: (id: string, p: Partial<Ideia>) => void;
  onClose: () => void;
}

/** Modal da ideia: o gancho e os detalhes em cima, o roteiro completo embaixo.
 *  Grava sozinho (meio segundo depois de parar de digitar, e ao fechar). */
export function RoteiroModal({ ideia, formatos, onAtualizar, onClose }: Props) {
  const [rascunho, setRascunho] = useState<Ideia | null>(ideia);
  const pendente = useRef<Partial<Ideia> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const idAtual = useRef<string | null>(null);

  const gravar = () => {
    if (timer.current) clearTimeout(timer.current);
    if (pendente.current && idAtual.current) onAtualizar(idAtual.current, pendente.current);
    pendente.current = null;
  };

  // Abrir outra ideia: grava o que sobrou da anterior e troca o rascunho.
  useEffect(() => {
    gravar();
    idAtual.current = ideia?.id ?? null;
    setRascunho(ideia);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideia?.id]);

  // Sair da página com gravação pendente.
  useEffect(() => gravar, []); // eslint-disable-line react-hooks/exhaustive-deps

  const editar = (patch: Partial<Ideia>) => {
    setRascunho((r) => (r ? { ...r, ...patch } : r));
    pendente.current = { ...pendente.current, ...patch };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(gravar, 500);
  };

  const fechar = () => {
    gravar();
    onClose();
  };
  const lista = rascunho && !formatos.includes(rascunho.formato) ? [...formatos, rascunho.formato] : formatos;

  return (
    <Dialog open={!!ideia} onOpenChange={(o) => !o && fechar()}>
      <DialogContent
        className="text-white max-w-3xl h-[85vh] !overflow-hidden"
        chip={<DialogTitle className="truncate font-bold tracking-tight">Roteiro</DialogTitle>}
      >
        {rascunho && (
          <div className="custom-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
            <div className="space-y-2">
              <Label htmlFor="rt-gancho" className={label}>Gancho</Label>
              <Textarea
                id="rt-gancho"
                value={rascunho.gancho}
                onChange={(e) => editar({ gancho: e.target.value })}
                placeholder="Qual é o gancho?"
                rows={2}
                className={cn(field, "resize-none text-base font-semibold")}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="rt-cat" className={label}>Categoria</Label>
                <Input id="rt-cat" value={rascunho.categoria} onChange={(e) => editar({ categoria: e.target.value })} placeholder="Categoria" className={cn(field, "h-11")} />
              </div>
              <div className="space-y-2">
                <span className={label}>Formato</span>
                <Select value={rascunho.formato || VAZIO} onValueChange={(v) => editar({ formato: v === VAZIO ? "" : v })}>
                  <SelectTrigger className={cn(field, "h-11 border px-3 text-sm")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-[12rem]">
                    {lista.map((f) => (
                      <SelectItem key={f || VAZIO} value={f || VAZIO} className="rounded-lg text-xs font-medium focus:bg-[#6829C0] focus:text-white">
                        {f || "sem formato"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rt-ref" className={label}>Referência</Label>
                <Input id="rt-ref" value={rascunho.referencia} onChange={(e) => editar({ referencia: e.target.value })} placeholder="Link do vídeo de referência" className={cn(field, "h-11")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rt-roteiro" className={label}>Roteiro completo</Label>
              <Textarea
                id="rt-roteiro"
                value={rascunho.roteiro}
                onChange={(e) => editar({ roteiro: e.target.value })}
                placeholder="Escreva o roteiro: abertura, desenvolvimento, fechamento e CTA…"
                className={cn(field, "min-h-[340px] resize-y leading-relaxed")}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
