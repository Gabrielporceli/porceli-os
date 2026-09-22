/**
 * Ponte entre o iconsax-react e o resto do sistema.
 *
 * Por que não usar os ícones do iconsax direto:
 *
 *  1. TROCA DE ESTILO EM UM LUGAR SÓ — o estilo (Linear, Bold, Bulk,
 *     Outline, Broken, TwoTone) vem de um contexto, então dá pra virar a
 *     identidade do app inteiro mexendo em UM valor, sem caçar prop
 *     `variant` em dezenas de arquivos. Qualquer ícone ainda pode
 *     sobrescrever o seu na marra (`<Icon variant="Bold" />`).
 *
 *  2. DEFAULTS À PROVA DE REACT 19 — o iconsax define `variant`, `color`
 *     e `size` via `Component.defaultProps`, que o React 19 IGNORA em
 *     componentes de função. No React 18 (o nosso hoje) funciona; no dia
 *     do upgrade, sem esta camada, todo ícone perderia `color:
 *     currentColor` e viraria preto, e `size` sumiria. Aqui os três são
 *     passados explicitamente, então o upgrade não quebra nada.
 *
 *  3. TAMANHO COERENTE — o padrão do iconsax é 24px; o sistema usa 20px
 *     na maioria dos lugares (é o tamanho dos lucide no menu e nos
 *     botões). O padrão aqui é 20.
 *
 * Nada disso substitui o lucide-react que já está espalhado pelo app —
 * as duas bibliotecas convivem, e `color: currentColor` faz os dois
 * responderem igual às classes `text-*` do Tailwind.
 */
import { createContext, forwardRef, useContext } from "react";
import type { Icon as IconsaxIcon, IconProps } from "iconsax-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type IconVariant = NonNullable<IconProps["variant"]>;

/**
 * Qualquer ícone que o sistema aceite numa prop. Enquanto o app tiver as
 * duas bibliotecas (o Iconsax não cobre alguns desenhos — `X`, `Loader2`,
 * `GripVertical`, `Handshake`…), quem recebe ícone por prop precisa
 * aceitar os dois tipos. `LucideIcon` é um `ForwardRefExoticComponent` e
 * o do Iconsax é um `FunctionComponent`, então um não é atribuível ao
 * outro: tem que ser união mesmo.
 */
export type AppIcon = LucideIcon | IconsaxIcon;

/** Os 6 estilos da versão free, na ordem em que o Iconsax os apresenta. */
export const ICON_VARIANTS = [
  "Linear",
  "Outline",
  "Bold",
  "Bulk",
  "Broken",
  "TwoTone",
] as const satisfies readonly IconVariant[];

/** Estilo usado quando ninguém diz nada — mude aqui pra virar o app todo. */
export const DEFAULT_ICON_VARIANT: IconVariant = "Linear";

const IconVariantContext = createContext<IconVariant>(DEFAULT_ICON_VARIANT);

/** Estilo em vigor no ponto da árvore onde for chamado. */
export const useIconVariant = () => useContext(IconVariantContext);

/**
 * Define o estilo dos ícones de uma subárvore. Pode aninhar: um provider
 * mais interno vence o externo (útil pra deixar, por exemplo, só a barra
 * de navegação em Bold sem tocar no resto).
 */
export function IconVariantProvider({
  variant,
  children,
}: {
  variant: IconVariant;
  children: React.ReactNode;
}) {
  return <IconVariantContext.Provider value={variant}>{children}</IconVariantContext.Provider>;
}

export type IconComponentProps = Omit<IconProps, "ref"> & {
  /** O ícone importado do iconsax-react, ex.: `as={Home2}`. */
  as: IconsaxIcon;
};

/**
 * Renderiza um ícone do iconsax com o estilo do contexto.
 *
 *   import { Home2 } from "iconsax-react";
 *   <Icon as={Home2} />                    // estilo do contexto
 *   <Icon as={Home2} variant="Bold" />     // força um estilo
 *   <Icon as={Home2} className="text-purple-400" size={28} />
 *
 * `className` e o resto das props caem no <svg>, então `text-*` do
 * Tailwind pinta o ícone normalmente (o `color` é `currentColor`).
 */
export const Icon = forwardRef<SVGSVGElement, IconComponentProps>(function Icon(
  { as: Glyph, variant, size = 20, color = "currentColor", className, ...rest },
  ref
) {
  const contextVariant = useIconVariant();

  return (
    <Glyph
      ref={ref}
      variant={variant ?? contextVariant}
      size={size}
      color={color}
      className={cn("shrink-0", className)}
      {...rest}
    />
  );
});
