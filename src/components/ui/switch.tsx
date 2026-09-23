import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

// --- MATERIAL DESIGN 3 PHYSICS ---
const SWITCH_THEME = {
  "--ease-spring": "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
} as React.CSSProperties;

const switchVariants = cva(
  "peer inline-flex shrink-0 cursor-pointer items-center rounded-full ring-2 ring-inset transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "peer-checked:bg-primary peer-checked:ring-primary",
        destructive: "peer-checked:bg-destructive peer-checked:ring-destructive",
      },
      size: {
        default: "h-8 w-[52px]", // Standard M3
        sm: "h-6 w-10",          // Compact
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

// --- AUDIO HAPTIC ENGINE ---
const playHapticFeedback = (type: "heavy" | "light" | "none") => {
  if (type === "none" || typeof window === "undefined") return;

  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "heavy") {
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(180, now);
      oscillator.frequency.exponentialRampToValueAtTime(40, now + 0.15);

      gainNode.gain.setValueAtTime(0.4, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } else {
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(800, now);

      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      oscillator.start(now);
      oscillator.stop(now + 0.08);
    }
  } catch (e) {
    console.error("Audio haptic failed", e);
  }
};

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof switchVariants> {
  onCheckedChange?: (checked: boolean) => void;
  showIcons?: boolean;
  checkedIcon?: React.ReactNode;   // Custom Icon for On State
  uncheckedIcon?: React.ReactNode; // Custom Icon for Off State
  haptic?: "heavy" | "light" | "none";
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({
    className,
    size,
    variant,
    checked,
    defaultChecked,
    onCheckedChange,
    showIcons = false,
    checkedIcon,
    uncheckedIcon,
    haptic = "none",
    style,
    disabled,
    ...props
  }, ref) => {
    const [isChecked, setIsChecked] = React.useState(defaultChecked ?? false);
    const [isPressed, setIsPressed] = React.useState(false);
    const [isHovered, setIsHovered] = React.useState(false);

    React.useEffect(() => {
      if (checked !== undefined) {
        setIsChecked(checked);
      }
    }, [checked]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const newValue = e.target.checked;

      playHapticFeedback(haptic);

      if (checked === undefined) {
        setIsChecked(newValue);
      }
      onCheckedChange?.(newValue);
    };

    // Size Calcs
    const isSmall = size === "sm";

    // --- GEOMETRIA DO GOOEY ---
    // Em vez de um handle que desliza, são DUAS bolas: a da esquerda
    // encolhe enquanto a da direita cresce. O filtro SVG (blur + corte de
    // alfa) funde as duas enquanto estão próximas, então o que se vê é uma
    // gota esticando e se soltando — não um círculo viajando.
    //
    // As unidades do viewBox batem 1:1 com os pixels da trilha, então dá
    // pra posicionar o halo e os ícones com os mesmos números.
    const G = isSmall
      ? { w: 40, h: 24, r: 7.5, off: 12, on: 28, drop: 2 }
      : { w: 52, h: 32, r: 10, off: 16, on: 36, drop: 2.5 };
    // O quanto cada bola avança na direção da outra antes de sumir: é essa
    // aproximação que dá ao filtro o que fundir.
    const pull = (G.on - G.off) * 0.6;
    // id único por instância — o componente colado usava um `#goo` global,
    // que colidiria entre switches e com os filtros que o sistema já tem.
    const gooId = `goo-${React.useId().replace(/:/g, "")}`;

    // Icon sizing classes
    const iconClasses = isSmall ? "w-2.5 h-2.5" : "w-3.5 h-3.5";

    // Logic to determine if we render any icons
    const shouldRenderIcons = showIcons || checkedIcon || uncheckedIcon;

    return (
      <label
        className={cn(
          "group relative inline-flex items-center justify-center",
          disabled && "cursor-not-allowed opacity-50",
          "min-w-[48px] min-h-[48px]"
        )}
        style={{ ...SWITCH_THEME, ...style }}
        onPointerDown={() => !disabled && setIsPressed(true)}
        onPointerUp={() => setIsPressed(false)}
        onPointerLeave={() => {
          setIsPressed(false);
          setIsHovered(false);
        }}
        onPointerEnter={() => !disabled && setIsHovered(true)}
      >
        <input
          type="checkbox"
          className="peer sr-only"
          ref={ref}
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
          {...props}
        />

        {/* --- TRACK ---
            `data-state` NÃO é decoração. O index.css tem uma regra que
            transforma QUALQUER `.bg-primary` em botão de vidro, com
            `border` e `backdrop-filter` marcados !important:

              .bg-primary:not([role="switch"]):not([data-state]):not(.badge)…

            Ligado, a trilha ganha `bg-primary` e caía nessa regra. A borda
            encolhia a caixa de conteúdo (52x32 → 50,4x30,4), o viewBox saía
            de escala e a bola ficava fora do lugar; e o backdrop-filter
            criava uma camada composta que rasterizava a saída do filtro
            gooey em baixa resolução — era o serrilhado da bolinha. Os dois
            defeitos, uma causa só. A própria regra já prevê a isenção por
            [data-state]; o Switch daqui só não a declarava. */}
        <div
          data-state={isChecked ? "checked" : "unchecked"}
          className={cn(
            switchVariants({ variant, size }),
            // `relative` é obrigatório: sem ele o SVG/halo/ícones (absolutos)
            // se posicionam contra o <label>, que é min-w/min-h 48px — maior
            // que a trilha. No tamanho `sm` (40x24 dentro de 48x48) o viewBox
            // ainda era escalado em 1,2x e saía do lugar.
            "relative",
            "bg-muted ring-border",
            "peer-checked:bg-primary peer-checked:ring-primary",
            className
          )}
        >
          {/* --- HANDLE GOOEY ---
              O <defs> vive dentro do próprio SVG: filtro por instância, sem
              id global pra colidir. */}
          <svg
            viewBox={`0 0 ${G.w} ${G.h}`}
            // h-full/w-full são obrigatórios, não decoração: `absolute
            // inset-0` NÃO estica um elemento substituído como o <svg> —
            // pela regra do CSS ele cai no tamanho intrínseco e sobra
            // espaço. Era isso que jogava a bola pra fora da trilha (no
            // desligado ela ficava 8px acima do centro).
            className="pointer-events-none absolute inset-0 h-full w-full fill-primary-foreground"
            aria-hidden="true"
          >
            <defs>
              <filter id={gooId}>
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                {/* Empurra o alfa pros extremos: o meio-termo do blur vira
                    borda dura, e é isso que "cola" as duas bolas. */}
                <feColorMatrix
                  in="blur"
                  mode="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
                  result="goo"
                />
                <feComposite in="SourceGraphic" in2="goo" operator="atop" />
              </filter>
            </defs>

            <g filter={`url(#${gooId})`}>
              {/* Bola de DESLIGADO: avança na direção da outra e encolhe. */}
              <circle
                className="transition-transform duration-500 ease-[var(--ease-spring)]"
                cx={G.off}
                cy={G.h / 2}
                r={G.r}
                style={{
                  transformOrigin: `${G.off}px ${G.h / 2}px`,
                  transform: `translateX(${isChecked ? pull : 0}px) scale(${
                    isChecked ? 0 : isPressed ? 1.12 : 1
                  })`,
                }}
              />
              {/* Bola de LIGADO: chega encolhida e cresce no lugar. */}
              <circle
                className="transition-transform duration-500 ease-[var(--ease-spring)]"
                cx={G.on}
                cy={G.h / 2}
                r={G.r}
                style={{
                  transformOrigin: `${G.on}px ${G.h / 2}px`,
                  transform: `translateX(${isChecked ? 0 : -pull}px) scale(${
                    isChecked ? (isPressed ? 1.12 : 1) : 0
                  })`,
                }}
              />
              {/* Respingo que se solta pra cima ao ligar. Nasce quase todo
                  fora do viewBox de propósito — só a ponta aparece. */}
              {isChecked && (
                <circle
                  className="transition-transform duration-700"
                  cx={G.on - 1}
                  cy={-1}
                  r={G.drop}
                />
              )}
            </g>
          </svg>

          {/* --- ICONS ---
              Fora do filtro gooey de propósito: passar um ícone pelo blur +
              corte de alfa borraria o traço. Ele só acompanha a bola. */}
          {shouldRenderIcons && (
            <div
              className={cn(
                "pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center transition-all duration-500 ease-[var(--ease-spring)]",
                isChecked && variant === "destructive" ? "text-destructive" : "",
                isChecked && variant !== "destructive" ? "text-primary" : "",
                !isChecked ? "text-muted" : ""
              )}
              style={{ left: `${isChecked ? G.on : G.off}px` }}
            >
              <div
                className={cn(
                  "absolute transition-all duration-300",
                  isChecked ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-50 -rotate-45"
                )}
              >
                {checkedIcon ?? <Check className={iconClasses} strokeWidth={4} />}
              </div>
              <div
                className={cn(
                  "absolute transition-all duration-300",
                  !isChecked ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-50 rotate-45"
                )}
              >
                {uncheckedIcon ?? <X className={iconClasses} strokeWidth={4} />}
              </div>
            </div>
          )}

          {/* --- HALO --- */}
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full pointer-events-none transition-all duration-200",
              isSmall ? "w-8 h-8" : "w-10 h-10",
              isChecked
                ? variant === "destructive"
                  ? "bg-destructive"
                  : "bg-primary"
                : "bg-foreground",
              isPressed ? "opacity-10 scale-100" : isHovered ? "opacity-5 scale-100" : "opacity-0 scale-50"
            )}
            style={{ left: `${isChecked ? G.on : G.off}px` }}
          />
        </div>
      </label>
    );
  }
);
Switch.displayName = "Switch";

export { Switch };
