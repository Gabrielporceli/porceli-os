/**
 * Exemplo vivo do iconsax-react — rota pública /dev/icons.
 *
 * Serve pra duas coisas: ver os 6 estilos lado a lado antes de escolher
 * um pro sistema, e servir de referência de como importar/usar. Mesmo
 * padrão do /dev/pill: fora do layout do CRM e sem login.
 */
import { useState } from "react";
// Importe SEMPRE por nome, a partir de "iconsax-react". O bundler só
// coloca no build os ícones citados aqui (medido: 1 ícone = 5,4 KB,
// 3 ícones = 20,9 KB, a biblioteca inteira = 6 MB).
import { Calendar, Home2, Wallet3 } from "iconsax-react";
import { ICON_VARIANTS, Icon, IconVariantProvider, type IconVariant } from "@/components/ui/icon";

/** Os 3 ícones do exemplo, com o nome exato de importação ao lado. */
const DEMO_ICONS = [
  { name: "Home2", glyph: Home2, label: "Dashboard" },
  { name: "Calendar", glyph: Calendar, label: "Agendamentos" },
  { name: "Wallet3", glyph: Wallet3, label: "Financeiro" },
] as const;

export default function IconLab() {
  const [variant, setVariant] = useState<IconVariant>("Linear");

  return (
    <div className="min-h-screen text-white relative">
      <div className="fixed inset-0 bg-[url('/app-bg.webp')] bg-cover bg-center -z-10" />

      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight">Iconsax — estilos</h1>
          <p className="text-sm text-white/50">
            O seletor abaixo troca o estilo pelo contexto: os ícones não recebem prop nenhuma.
          </p>
        </header>

        {/* Seletor de estilo */}
        <div className="liquid-glass rounded-3xl p-5 space-y-4">
          <div className="text-xs font-black uppercase tracking-widest text-white/50">Estilo</div>
          <div className="flex flex-wrap gap-2">
            {ICON_VARIANTS.map((v) => (
              <button
                key={v}
                onClick={() => setVariant(v)}
                className={
                  "px-4 py-2 rounded-full text-sm transition-colors " +
                  (v === variant
                    ? "bg-white/90 text-black font-bold"
                    : "bg-white/10 text-white/70 hover:bg-white/20")
                }
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Os ícones — nenhum deles sabe qual estilo está em vigor */}
        <IconVariantProvider variant={variant}>
          <div className="liquid-glass rounded-3xl p-5 space-y-5">
            <div className="text-xs font-black uppercase tracking-widest text-white/50">
              3 ícones · estilo {variant}
            </div>

            <div className="grid grid-cols-3 gap-4">
              {DEMO_ICONS.map(({ name, glyph, label }) => (
                <div
                  key={name}
                  className="flex flex-col items-center gap-3 rounded-2xl bg-white/5 py-6"
                >
                  <Icon as={glyph} size={40} className="text-purple-300" />
                  <div className="text-center">
                    <div className="text-sm font-bold">{label}</div>
                    <code className="text-[11px] text-white/40">{name}</code>
                  </div>
                </div>
              ))}
            </div>

            {/* Tamanho e cor saem do Tailwind, porque color = currentColor */}
            <div className="flex items-end gap-5 border-t border-white/10 pt-5">
              <Icon as={Home2} size={16} className="text-white/40" />
              <Icon as={Home2} size={24} className="text-white/70" />
              <Icon as={Home2} size={32} className="text-purple-400" />
              <Icon as={Home2} size={40} className="text-emerald-400" />
              <span className="text-xs text-white/40 pb-1">
                tamanho pela prop <code>size</code>, cor pelas classes <code>text-*</code>
              </span>
            </div>

            {/* Um ícone pode furar o contexto quando precisar */}
            <div className="flex items-center gap-4 border-t border-white/10 pt-5">
              <Icon as={Wallet3} size={28} className="text-white/70" />
              <span className="text-xs text-white/40">segue o contexto ({variant})</span>
              <Icon as={Wallet3} size={28} variant="Bold" className="text-amber-300" />
              <span className="text-xs text-white/40">
                forçado com <code>variant="Bold"</code>
              </span>
            </div>
          </div>
        </IconVariantProvider>

        <div className="liquid-glass rounded-3xl p-5 space-y-3">
          <div className="text-xs font-black uppercase tracking-widest text-white/50">Uso</div>
          <pre className="text-[11px] leading-relaxed text-white/70 overflow-x-auto">
{`import { Home2 } from "iconsax-react";
import { Icon } from "@/components/ui/icon";

<Icon as={Home2} />                          // estilo do contexto
<Icon as={Home2} variant="Bold" />           // força um estilo
<Icon as={Home2} size={28} className="text-purple-400" />`}
          </pre>
          <p className="text-xs text-white/40">
            Pra mudar o padrão do sistema inteiro: <code>DEFAULT_ICON_VARIANT</code> em{" "}
            <code>src/components/ui/icon.tsx</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
