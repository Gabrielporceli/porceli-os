
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

interface ClientsHeaderProps {
  onNewClient: () => void;
}

export function ClientsHeader({ onNewClient }: ClientsHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div className="space-y-1">

      </div>
      <motion.div 
        whileHover={{ scale: 1.05, translateY: -2 }} 
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <Button
          className="bg-primary hover:bg-primary/90 text-white h-11 px-6 rounded-xl shadow-[0_0_20px_rgba(104,41,192,0.3)] transition-all font-bold uppercase tracking-widest text-xs"
          onClick={onNewClient}
        >
          Novo Cliente
        </Button>
      </motion.div>
    </div>
  );
}
