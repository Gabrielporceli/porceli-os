
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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
      <DialogContent className="border-white/5 text-white max-w-md shadow-2xl outline-none">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white tracking-tight">Excluir Despesa</DialogTitle>
          <DialogDescription className="text-white/60 text-sm leading-relaxed mt-2">
            Tem certeza que deseja excluir a despesa <span className="text-white font-bold">"{expenseDescription}"</span>? Essa ação não poderá ser desfeita e os dados serão removidos permanentemente.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="grid grid-cols-2 gap-3 pt-4 sm:flex-row !justify-stretch">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
