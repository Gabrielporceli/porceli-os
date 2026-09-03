import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { motion } from "framer-motion";

interface ContractsHeaderProps {
  onNewContract: () => void;
}

export function ContractsHeader({ onNewContract }: ContractsHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
      </div>
      <motion.div
        whileHover={{ scale: 1.05, translateY: -2 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <LiquidGlassButton
          tint="primary"
          onClick={onNewContract}
          className="h-11 px-6 text-xs font-bold uppercase tracking-widest"
        >
          Novo Contrato
        </LiquidGlassButton>
      </motion.div>
    </div>
  );
}
