import * as React from "react";
import { cn } from "@/lib/utils";

/*
  Interruptor — UM desenho só no sistema inteiro (PADROES-UI-PORCELI.md §3).

  • Trilho 44×24, totalmente arredondado. Desligado: branco a 12%.
    Ligado: vidro roxo (`.vidro-roxo`; `variant="destructive"` usa o vermelho).
  • Bolinha 20×20 branca, com sombra leve, a 2px da borda; desliza para a
    direita ao ligar.
  • 300ms ease-out no trilho e na bolinha. Sem som, sem a bolinha crescer
    e sem halo.
  • Acessibilidade: input checkbox com role="switch" (fica sr-only dentro do
    <label>) + foco visível com anel branco a 40%.

  A API é a mesma de antes (checked, defaultChecked, onCheckedChange,
  disabled…). `size`, `showIcons`, `checkedIcon`, `uncheckedIcon` e `haptic`
  continuam aceitos só para não quebrar quem chama — não fazem mais nada.
*/

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
      variant,
      checked,
      defaultChecked,
      onCheckedChange,
      style,
      disabled,
      // aceitos por compatibilidade, sem efeito
      size: _size,
      showIcons: _showIcons,
      checkedIcon: _checkedIcon,
      uncheckedIcon: _uncheckedIcon,
      haptic: _haptic,
      ...props
    },
    ref
  ) => {
    const [isChecked, setIsChecked] = React.useState(defaultChecked ?? false);

    React.useEffect(() => {
      if (checked !== undefined) setIsChecked(checked);
    }, [checked]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const newValue = e.target.checked;
      if (checked === undefined) setIsChecked(newValue);
      onCheckedChange?.(newValue);
    };

    return (
      <label
        className={cn(
          "relative inline-flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center",
          disabled && "cursor-not-allowed opacity-50"
        )}
        style={style}
      >
        <input
          type="checkbox"
          role="switch"
          aria-checked={isChecked}
          className="peer sr-only"
          ref={ref}
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
          {...props}
        />

        {/* Trilho. `data-state` isenta o elemento da regra do index.css que
            transforma qualquer `.bg-primary` em botão de vidro. */}
        <span
          data-state={isChecked ? "checked" : "unchecked"}
          className={cn(
            "relative block h-6 w-11 shrink-0 rounded-full transition-all duration-300 ease-out",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-white/40",
            isChecked ? (variant === "destructive" ? "vidro-vermelho" : "vidro-roxo") : "bg-white/[0.12]",
            className
          )}
        >
          {/* Bolinha */}
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-300 ease-out",
              isChecked ? "left-[22px]" : "left-0.5"
            )}
          />
        </span>
      </label>
    );
  }
);
Switch.displayName = "Switch";

export { Switch };
