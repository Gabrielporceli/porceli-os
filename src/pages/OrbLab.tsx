import {
  OrbAvatar,
  ORB_ACCESSORY_LABEL,
  ORB_COLORS,
  ORB_EXTRAS,
  ORB_EYEWEAR,
  ORB_HATS,
  ORB_SHAPES,
  type AvatarSize,
} from "@/components/ui/orb-avatar";
import { AgentsCanvas, type CanvasAgent } from "@/components/ui/agents-canvas";
import { appBackgroundStyle } from "@/lib/appBackground";

const SIZES: AvatarSize[] = ["sm", "md", "lg"];

// Agentes de exemplo só para visualizar o canvas; a Central usa agentes reais.
const DEMO: CanvasAgent[] = [
  { id: "demo-1", nome: "Atendente", papel: "Responde leads no WhatsApp", status: "ativo", cor: "purple", chapeu: "bone" },
  { id: "demo-2", nome: "Financeiro", papel: "Cobra faturas e envia relatórios", status: "ativo", cor: "orange", oculos: "oculos-escuros" },
  { id: "demo-3", nome: "Analista", papel: "Lê métricas de campanhas", status: "parado", cor: "indigo", chapeu: "cartola", oculos: "monoculo" },
  { id: "demo-4", nome: "Notas", papel: "Sincroniza o cofre", status: "erro", cor: "purple", extras: ["fone"] },
];

/**
 * /dev/orbs — catálogo dos orbes dos agentes: as 12 cores, as 3 formas e os
 * 3 tamanhos. Serve pra escolher o visual de cada agente (campos `cor`,
 * `forma` e `piscando` em AgentsHub). Pública, sem layout.
 */
export default function OrbLab() {
  return (
    <div className="min-h-screen p-8 text-white" style={appBackgroundStyle}>
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight">Orbes dos agentes</h1>
          <p className="text-sm text-white/50">
            Clique num orbe para ver a reação. O nome da cor é o valor do campo <code>cor</code> do agente.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-white/40">Canvas (exemplo)</h2>
          <AgentsCanvas agents={DEMO} />
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-white/40">Cores</h2>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
            {ORB_COLORS.map((c) => (
              <div key={c} className="liquid-glass flex flex-col items-center gap-3 rounded-2xl p-4">
                <OrbAvatar color={c} size="lg" />
                <span className="text-xs font-semibold text-white/70">{c}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-white/40">Formas</h2>
          <div className="flex flex-wrap gap-4">
            {ORB_SHAPES.map((s) => (
              <div key={s} className="liquid-glass flex flex-col items-center gap-3 rounded-2xl p-5">
                <OrbAvatar color="purple" size="lg" shape={s} />
                <span className="text-xs font-semibold text-white/70">{s}</span>
              </div>
            ))}
          </div>
        </section>

        {[
          { titulo: "Chapéus (campo chapeu)", lista: ORB_HATS, prop: "hat" },
          { titulo: "Óculos (campo oculos)", lista: ORB_EYEWEAR, prop: "eyewear" },
          { titulo: "Extras (campo extras)", lista: ORB_EXTRAS, prop: "extras" },
        ].map(({ titulo, lista, prop }) => (
          <section key={titulo} className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-white/40">{titulo}</h2>
            <div className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-3 md:grid-cols-4">
              {lista.map((a) => (
                <div key={a} className="liquid-glass flex flex-col items-center gap-3 rounded-2xl p-4 pt-10">
                  <OrbAvatar
                    color="purple"
                    size="lg"
                    {...(prop === "extras" ? { extras: [a as never] } : { [prop]: a })}
                  />
                  <span className="text-xs font-semibold text-white/70">
                    {ORB_ACCESSORY_LABEL[a as keyof typeof ORB_ACCESSORY_LABEL]} <code className="text-white/30">{a}</code>
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-white/40">Combinando</h2>
          <div className="flex flex-wrap gap-4 pt-6">
            <div className="liquid-glass flex flex-col items-center gap-3 rounded-2xl p-5 pt-10">
              <OrbAvatar color="orange" size="lg" hat="bone" eyewear="oculos-escuros" />
              <span className="text-xs font-semibold text-white/70">boné + óculos escuros</span>
            </div>
            <div className="liquid-glass flex flex-col items-center gap-3 rounded-2xl p-5 pt-10">
              <OrbAvatar color="indigo" size="lg" hat="cartola" eyewear="monoculo" extras={["bigode"]} />
              <span className="text-xs font-semibold text-white/70">cartola + monóculo + bigode</span>
            </div>
            <div className="liquid-glass flex flex-col items-center gap-3 rounded-2xl p-5 pt-10">
              <OrbAvatar color="purple" size="sm" hat="coroa" eyewear="tapa-olho" />
              <span className="text-xs font-semibold text-white/70">tamanho sm</span>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-white/40">Tamanhos e olhos</h2>
          <div className="flex flex-wrap items-end gap-4">
            {SIZES.map((s) => (
              <div key={s} className="liquid-glass flex flex-col items-center gap-3 rounded-2xl p-5">
                <OrbAvatar color="indigo" size={s} />
                <span className="text-xs font-semibold text-white/70">{s}</span>
              </div>
            ))}
            <div className="liquid-glass flex flex-col items-center gap-3 rounded-2xl p-5">
              <OrbAvatar color="indigo" size="lg" blinking={false} />
              <span className="text-xs font-semibold text-white/70">sem piscar</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
