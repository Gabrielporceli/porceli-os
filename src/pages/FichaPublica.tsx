import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { blocosDoModelo, simNaoDaResposta, type CampoFicha } from "@/features/clients/fichaCampos";

/** Mesmo projeto do cliente Supabase do app (src/integrations/supabase/client.ts). */
const URL_FUNCAO = "https://dygadnfeoiimmbeqbsvt.supabase.co/functions/v1/ficha-publica";

const campo =
  "bg-white/[0.04] border-white/[0.08] focus:border-white/40 text-white placeholder:text-white/25 rounded-xl transition-all";

function paraTexto(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(v).replace(".", ",");
  return String(v);
}

/**
 * Ficha do negócio, respondida pelo próprio dono pelo link que a agência mandou.
 * Sem login: o token do link é o acesso, e a função ficha-publica só aceita as
 * respostas da ficha daquele cliente enquanto o link vale.
 */
export default function FichaPublica() {
  const { token = "" } = useParams();
  const [estado, setEstado] = useState<"carregando" | "invalido" | "pronto" | "enviando" | "enviado">("carregando");
  const [empresa, setEmpresa] = useState("");
  const [valores, setValores] = useState<Record<string, string>>({});
  const [erro, setErro] = useState("");

  useEffect(() => {
    (async () => {
      const r = await fetch(`${URL_FUNCAO}?t=${encodeURIComponent(token)}`).catch(() => null);
      const corpo = await r?.json().catch(() => null);
      if (!r?.ok || !corpo) {
        setErro(corpo?.erro ?? "Link inválido ou expirado. Peça um novo para a agência.");
        setEstado("invalido");
        return;
      }
      setEmpresa(corpo.empresa ?? "");
      const v: Record<string, string> = {};
      for (const [k, val] of Object.entries(corpo.respostas ?? {})) v[k] = paraTexto(val);
      setValores(v);
      setEstado("pronto");
    })();
  }, [token]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEstado("enviando");
    setErro("");
    const r = await fetch(URL_FUNCAO, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ t: token, respostas: valores }),
    }).catch(() => null);
    const corpo = await r?.json().catch(() => null);
    if (!r?.ok) {
      setErro(corpo?.erro ?? "Não consegui enviar. Tente de novo.");
      setEstado("pronto");
      return;
    }
    setEstado("enviado");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const entrada = (c: CampoFicha) => {
    const comum = {
      id: `f-${c.chave}`,
      value: valores[c.chave] ?? "",
      placeholder: c.exemplo,
      onChange: (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setValores((v) => ({ ...v, [c.chave]: ev.target.value })),
    };
    if (c.tipo === "escolha") {
      return (
        <Select value={valores[c.chave] || undefined} onValueChange={(v) => setValores((x) => ({ ...x, [c.chave]: v }))}>
          <SelectTrigger id={comum.id} className="bg-white/[0.04] border-white/[0.08] h-12 rounded-xl text-white/85">
            <SelectValue placeholder="Escolha uma opção" />
          </SelectTrigger>
          <SelectContent>
            {c.opcoes?.map((o) => <SelectItem key={o.valor} value={o.valor}>{o.rotulo}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
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
      ? <Textarea {...comum} rows={3} className={`${campo} resize-none`} />
      : <Input {...comum} inputMode={c.tipo === "texto" ? undefined : "decimal"} className={`${campo} h-12`} />;
  };

  return (
    <div className="min-h-screen bg-[#0b0b0f] px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-xl space-y-8">
        <header className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-widest text-white/40">Porceli Company</p>
          <h1 className="text-2xl font-bold">Ficha do seu negócio{empresa ? ` · ${empresa}` : ""}</h1>
          {estado !== "enviado" && estado !== "invalido" && (
            <p className="text-sm text-white/55">
              Estas respostas guiam os anúncios que fazemos para você. Responda o que souber; o que não souber, pode
              deixar em branco. Leva uns 10 minutos.
            </p>
          )}
        </header>

        {estado === "carregando" && <p className="text-sm text-white/40">Carregando…</p>}
        {estado === "invalido" && <p className="rounded-2xl bg-white/[0.05] p-5 text-sm text-white/70">{erro}</p>}
        {estado === "enviado" && (
          <p className="rounded-2xl bg-white/[0.05] p-5 text-sm text-white/80">
            Pronto, recebemos suas respostas. Obrigado! Se quiser corrigir algo, é só abrir este mesmo link de novo.
          </p>
        )}

        {(estado === "pronto" || estado === "enviando") && (
          <form onSubmit={enviar} className="space-y-10">
            {blocosDoModelo(valores.modelo_negocio).map((b) => (
              <section key={b.titulo} className="space-y-5">
                <h2 className="border-b border-white/[0.08] pb-2 text-lg font-semibold">{b.titulo}</h2>
                {b.campos.map((c) => (
                  <div key={c.chave} className="space-y-2">
                    <label htmlFor={`f-${c.chave}`} className="block text-sm text-white/85">{c.pergunta}</label>
                    {entrada(c)}
                  </div>
                ))}
              </section>
            ))}
            {erro && <p className="text-sm text-red-300">{erro}</p>}
            <LiquidGlassButton tint="primary" type="submit" disabled={estado === "enviando"}
              className="h-12 w-full text-xs font-bold uppercase tracking-widest">
              {estado === "enviando" ? "Enviando…" : "Enviar respostas"}
            </LiquidGlassButton>
          </form>
        )}
      </div>
    </div>
  );
}
