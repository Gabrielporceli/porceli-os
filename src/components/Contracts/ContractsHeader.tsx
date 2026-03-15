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
        <h1 className="text-3xl font-bold text-white">Contratos</h1>
      </div>
      <motion.div
        whileHover={{ scale: 1.05, translateY: -2 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button 
          onClick={onNewContract}
          className="bg-goat-purple hover:bg-goat-purple/90 text-white rounded-xl px-6 h-12 font-bold shadow-[0_0_20px_rgba(104,41,192,0.3)] transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Novo Contrato
        </Button>
      </motion.div>
    </div>
  );
}
