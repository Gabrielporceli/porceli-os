
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="liquid-glass hover:bg-white/10 text-white/70 border-white/5 w-full h-11 rounded-xl font-bold transition-all"
            >
              Cancelar
            </Button>
          </motion.div>
          <motion.div 
            className="flex-1" 
            whileHover={{ scale: 1.05, translateY: -2 }} 
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button
              onClick={onConfirm}
              className="bg-red-500 hover:bg-red-600 text-white w-full h-11 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)]"
            >
              Excluir
            </Button>
          </motion.div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
