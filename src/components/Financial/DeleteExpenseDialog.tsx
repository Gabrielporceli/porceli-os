
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { motion } from "framer-motion";

interface DeleteExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  expenseDescription: string;
}

export function DeleteExpenseDialog({
  open,
  onOpenChange,
  onConfirm,
  expenseDescription
}: DeleteExpenseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-white max-w-md" chip={<DialogTitle className="truncate font-bold tracking-tight">Excluir Despesa</DialogTitle>}>
        <p className="text-white/70 text-sm leading-relaxed px-6 pb-2">
          Tem certeza que deseja excluir a despesa <span className="text-white font-bold">"{expenseDescription}"</span>? Essa ação não poderá ser desfeita e os dados serão removidos permanentemente.
        </p>
        <div className="grid grid-cols-2 gap-3 p-6 pt-4 border-t border-white/[0.05] shrink-0">
          <motion.div 
            className="flex-1" 
            whileHover={{ scale: 1.05, translateY: -2 }} 
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <LiquidGlassButton
              tint="danger"
              onClick={() => onOpenChange(false)}
              className="w-full h-11 text-xs font-bold uppercase tracking-widest"
            >
              Cancelar
            </LiquidGlassButton>
          </motion.div>
          <motion.div
            className="flex-1"
            whileHover={{ scale: 1.05, translateY: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <LiquidGlassButton
              tint="danger"
              onClick={onConfirm}
              className="w-full h-11 text-xs font-bold uppercase tracking-widest"
            >
              Excluir
            </LiquidGlassButton>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
