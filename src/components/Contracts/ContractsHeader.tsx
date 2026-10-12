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
