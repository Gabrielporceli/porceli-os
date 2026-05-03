import { Plus } from "lucide-react";
import { Button } from "../ui/button";
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
      >
        <Button 
          onClick={onNewContract}
          className="bg-primary hover:bg-primary/90 text-white h-11 px-6 rounded-2xl shadow-[0_0_20px_rgba(104,41,192,0.3)] transition-all font-bold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Contrato
        </Button>
      </motion.div>
    </div>
  );
}
