import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

/*
  Toggle.

  A bolinha é um <span> com border-radius — NÃO mais um SVG com filtro
  gooey (blur + corte de alfa). Aquele filtro rasterizava a borda da bola
  (serrilhado) e o "respingo" que saltava ao ligar nascia fora da trilha,
  deixando um pixel claro na borda. CSS puro desenha o círculo com
  antisserrilhado de verdade em qualquer zoom.

  O "líquido" ficou no movimento: mola na posição e a bolinha estica
  enquanto está pressionada.
*/

const SIZES = {
  default: { w: 52, h: 32, knob: 24, pad: 4, stretch: 6, icon: "w-3 h-3" },
  sm: { w: 40, h: 24, knob: 18, pad: 3, stretch: 4, icon: "w-2.5 h-2.5" },
} as const;

const COLORS = {
  primary: "hsl(var(--primary))",
  destructive: "hsl(var(--destructive))",
} as const;

const SPRING = "cubic-bezier(0.34, 1.4, 0.64, 1)";

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
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "default" | "sm" | null;
  variant?: "primary" | "destructive" | null;
  onCheckedChange?: (checked: boolean) => void;
  showIcons?: boolean;
  checkedIcon?: React.ReactNode;
  uncheckedIcon?: React.ReactNode;
  haptic?: "heavy" | "light" | "none";
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
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
    },
    ref
  ) => {
    const [isChecked, setIsChecked] = React.useState(defaultChecked ?? false);
    const [isPressed, setIsPressed] = React.useState(false);

    React.useEffect(() => {
      if (checked !== undefined) setIsChecked(checked);
    }, [checked]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const newValue = e.target.checked;
      playHapticFeedback(haptic);
      if (checked === undefined) setIsChecked(newValue);
      onCheckedChange?.(newValue);
    };

    const S = SIZES[size === "sm" ? "sm" : "default"];
    const cor = COLORS[variant === "destructive" ? "destructive" : "primary"];
    const esticar = isPressed ? S.stretch : 0;
    // Ligado, a bolinha estica pra ESQUERDA (ancorada na direita); desligado,
    // pra direita. Assim o esticar nunca empurra ela pra fora da trilha.
    const x = isChecked ? S.w - S.pad - S.knob - esticar : S.pad;
    const temIcones = showIcons || checkedIcon || uncheckedIcon;

    return (
      <label
        className={cn(
          "group relative inline-flex min-h-[48px] min-w-[48px] cursor-pointer items-center justify-center",
          disabled && "cursor-not-allowed opacity-50"
        )}
        style={style}
        onPointerDown={() => !disabled && setIsPressed(true)}
        onPointerUp={() => setIsPressed(false)}
        onPointerLeave={() => setIsPressed(false)}
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

        {/* Trilha. `data-state` isenta o elemento da regra do index.css que
            transforma qualquer `.bg-primary` em botão de vidro — a cor aqui
            é inline, mas a isenção fica por garantia. */}
        <span
          data-state={isChecked ? "checked" : "unchecked"}
          className={cn(
            "relative block shrink-0 rounded-full transition-[background-color,box-shadow] duration-300",
            "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white/60",
            className
          )}
          style={{
            width: S.w,
            height: S.h,
            backgroundColor: isChecked ? cor : "rgba(255, 255, 255, 0.12)",
            // Fio de borda por DENTRO (inset), não `ring`/`border`: não mexe
            // no tamanho da caixa nem cria meio-pixel claro na curva.
            boxShadow: isChecked
              ? "inset 0 0 0 1px rgba(255,255,255,0.12), inset 0 1px 2px rgba(0,0,0,0.25)"
              : "inset 0 0 0 1px rgba(255,255,255,0.10), inset 0 1px 2px rgba(0,0,0,0.35)",
          }}
        >
          {/* Bolinha */}
          <span
            className="absolute flex items-center justify-center rounded-full bg-white"
            style={{
              top: S.pad,
              left: 0,
              height: S.knob,
              width: S.knob + esticar,
              transform: `translateX(${x}px)`,
              transition: `transform 380ms ${SPRING}, width 200ms ease-out`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.18)",
            }}
          >
            {temIcones && (
              <span className="relative flex items-center justify-center" style={{ color: isChecked ? cor : "#6b6b72" }}>
                <span className={cn("absolute transition-all duration-200", isChecked ? "scale-100 opacity-100" : "scale-50 opacity-0")}>
                  {checkedIcon ?? <Check className={S.icon} strokeWidth={4} />}
                </span>
                <span className={cn("absolute transition-all duration-200", !isChecked ? "scale-100 opacity-100" : "scale-50 opacity-0")}>
                  {uncheckedIcon ?? <X className={S.icon} strokeWidth={4} />}
                </span>
              </span>
            )}
          </span>
        </span>
      </label>
    );
  }
);
Switch.displayName = "Switch";

export { Switch };
