/**
 * Confirmação de exclusão de nota.
 *
 * POR QUE EXISTE. O botão de excluir mora no cabeçalho da janela, ao lado do
 * de fechar. Um clique errado já custou uma nota inteira — e no CRM não há
 * lixeira nem desfazer.
 *
 * O NOME DA NOTA APARECE no texto de propósito: confirmar "esta nota" sem
 * saber qual é quase tão perigoso quanto não perguntar nada.
 *
 * Componente próprio, e não JSX solto na página, pra o laboratório
 * (/dev/notas) conseguir exercitar o diálogo de verdade — a tela real fica
 * atrás do login.
 */
import { Trash } from "iconsax-react";
import { Icon } from "@/components/ui/icon";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  /** Título da nota em questão. `null` mantém o diálogo fechado. */
  titulo: string | null;
  onCancelar: () => void;
  onConfirmar: () => void;
}

export function ConfirmarExclusao({ titulo, onCancelar, onConfirmar }: Props) {
  return (
    <AlertDialog open={titulo !== null} onOpenChange={(aberto) => { if (!aberto) onCancelar(); }}>
      <AlertDialogContent className="liquid-glass border-white/10 text-white shadow-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Icon as={Trash} size={20} className="text-red-400" />
            Excluir nota
          </AlertDialogTitle>
          <AlertDialogDescription className="text-white/70">
            Excluir <b className="text-white">{titulo || "esta nota"}</b>? O texto
            sai do sistema e não há desfazer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 pt-4">
          <AlertDialogCancel asChild>
            <LiquidGlassButton className="h-11 px-6 text-xs font-bold uppercase tracking-widest">
              Cancelar
            </LiquidGlassButton>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <LiquidGlassButton
              tint="danger"
              onClick={onConfirmar}
              className="h-11 px-8 text-xs font-bold uppercase tracking-widest"
            >
              Excluir
            </LiquidGlassButton>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
