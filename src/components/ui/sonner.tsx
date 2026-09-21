import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  // Abaixo de 768px a MobileBottomNav ocupa a faixa de baixo da tela — e o
  // CSS do sonner TRAVA toasts com y-position "bottom" a 20px da borda
  // inferior via media query (max-width: 600px), ignorando a prop `offset`
  // nesse breakpoint. Em vez de brigar com o CSS interno da lib, joga o
  // toast pro topo só no mobile; no desktop mantém o padrão (bottom-right).
  const isMobile = useIsMobile()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position={isMobile ? "top-center" : "bottom-right"}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
