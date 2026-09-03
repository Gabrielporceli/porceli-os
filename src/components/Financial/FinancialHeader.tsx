import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { RefreshCw } from "lucide-react";
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
            <LiquidGlassButton
              onClick={onSync}
              disabled={isSyncing}
              title="Gerar e Atualizar Lançamentos Faltantes"
              className="w-11 h-11"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-primary' : ''}`} />
            </LiquidGlassButton>
          </motion.div>
        )}
        <motion.div
          whileHover={{ scale: 1.05, translateY: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <LiquidGlassButton
            tint="primary"
            onClick={onNewTransaction}
            className="h-11 px-6 text-xs font-bold uppercase tracking-widest"
          >
            Nova Transação
          </LiquidGlassButton>
        </motion.div>
      </div>
    </div>
  );
}
