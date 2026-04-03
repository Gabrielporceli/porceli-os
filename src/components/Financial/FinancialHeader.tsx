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
        <h1 className="text-3xl font-bold text-white mb-2">Financeiro</h1>
      </div>
      <div className="flex gap-3">
        {onSync && (
          <motion.div
            whileHover={{ scale: 1.05, translateY: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button
              variant="outline"
              size="icon"
              className="bg-transparent border-white/10 hover:bg-white/5 text-white h-11 w-11 rounded-2xl transition-all"
              onClick={onSync}
              disabled={isSyncing}
              title="Gerar e Atualizar Lançamentos Faltantes"
            >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin text-primary' : 'text-white/70'}`} />
            </Button>
          </motion.div>
        )}
        <motion.div
          whileHover={{ scale: 1.05, translateY: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <Button
            className="bg-primary hover:bg-primary/90 text-white h-11 px-6 rounded-2xl shadow-[0_0_20px_rgba(104,41,192,0.3)] transition-all"
            onClick={onNewTransaction}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Transação
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
