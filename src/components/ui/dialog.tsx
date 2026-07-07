import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "./liquid-glass"

/**
 * Rastreia a posição do último clique/toque na página inteira: é a origem
 * usada pra animação do modal "nascer do botão" (cresce a partir de onde o
 * usuário clicou, encolhe de volta pro mesmo ponto ao fechar).
 */
let lastPointerPosition = { x: 0, y: 0 };

if (typeof document !== "undefined") {
  document.addEventListener(
    "pointerdown",
    (e) => {
      lastPointerPosition = { x: e.clientX, y: e.clientY };
    },
    { capture: true }
  );
}

/**
 * A maioria dos modais do app é controlada via `open`/`onOpenChange` no
 * <Dialog>, não via <DialogTrigger>. O Radix não expõe esse `open` pros
 * componentes filhos, então repassamos por context pra saber, dentro de
 * <DialogContent>, se é pra estar montado — é o que direciona a
 * <AnimatePresence> (que precisa saber controlar a desmontagem ela mesma
 * pra poder tocar a animação de saída até o fim).
 */
const DialogOpenContext = React.createContext(false)

const MotionLiquidGlass = motion.create(LiquidGlass)

const Dialog = ({
  open,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) => (
  <DialogOpenContext.Provider value={!!open}>
    <DialogPrimitive.Root open={open} {...props} />
  </DialogOpenContext.Provider>
)

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay ref={ref} asChild {...props}>
    <motion.div
      className={cn("fixed inset-0 z-50 bg-black/50 backdrop-blur-[4px]", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      // Escurecer devagar (não de uma vez) pra o olho se acostumar —
      // duração maior e ease-out, independente do spring do conteúdo.
      transition={{ duration: 0.35, ease: "easeOut" }}
    />
  </DialogPrimitive.Overlay>
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, style, ...props }, ref) => {
  const isOpen = React.useContext(DialogOpenContext)

  return (
    <AnimatePresence>
      {isOpen && (
        <DialogPortal forceMount>
          <DialogOverlay forceMount />
          <DialogPrimitive.Content ref={ref} asChild forceMount {...props}>
            <GrowFromClickOrigin style={style} className={className}>
              {children}
            </GrowFromClickOrigin>
          </DialogPrimitive.Content>
        </DialogPortal>
      )}
    </AnimatePresence>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

type GrowFromClickOriginProps = {
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
} & Record<string, unknown>

const GrowFromClickOrigin = React.forwardRef<
  React.ElementRef<typeof LiquidGlass>,
  GrowFromClickOriginProps
>(({ className, style, children, ...rest }, ref) => {
  // Capturado uma única vez, na montagem — cada abertura do modal cria uma
  // instância nova (AnimatePresence desmonta a anterior ao fechar), então
  // isso sempre reflete o clique que abriu ESTE modal, não um clique antigo.
  const [origin] = React.useState(() => ({
    x: lastPointerPosition.x - window.innerWidth / 2,
    y: lastPointerPosition.y - window.innerHeight / 2,
  }))

  return (
    <MotionLiquidGlass
      {...rest}
      ref={ref}
      style={style}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg gap-4 p-6 shadow-lg sm:rounded-3xl",
        className
      )}
      initial={{ opacity: 0, x: origin.x, y: origin.y, scale: 0.15 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: origin.x, y: origin.y, scale: 0.15 }}
      transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
      transformTemplate={(_, generated) => `translate(-50%, -50%) ${generated}`}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-50">
        <X className="h-4 w-4 text-white" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </MotionLiquidGlass>
  )
})
GrowFromClickOrigin.displayName = "GrowFromClickOrigin"

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
