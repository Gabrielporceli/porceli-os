import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface FinancialHeaderProps {
  onNewTransaction: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
}

export function FinancialHeader({ onNewTransaction, onSync, isSyncing }: FinancialHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
      </div>
      <div className="flex gap-3">
        {onSync && (
          <motion.div
            whileHover={{ scale: 1.05, translateY: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button
              variant="ghost"
              className="liquid-glass flex items-center justify-center gap-2 text-white/70 px-4 h-11 !rounded-xl transition-all duration-300 text-xs font-bold uppercase tracking-widest border border-white/5 hover:bg-white/[0.06] hover:text-white"
              onClick={onSync}
              disabled={isSyncing}
              title="Gerar e Atualizar Lançamentos Faltantes"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-primary' : ''}`} />
            </Button>
          </motion.div>
        )}
        <motion.div
          whileHover={{ scale: 1.05, translateY: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <Button
            className="btn-primary-glass text-white h-11 px-6 rounded-xl transition-all font-bold uppercase tracking-widest text-xs"
            onClick={onNewTransaction}
          >
            Nova Transação
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
