import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ConversationsHeaderProps {
  onNewConversation: () => void;
  children?: ReactNode;
}

export function ConversationsHeader({ onNewConversation, children }: ConversationsHeaderProps) {
  return (
    <div className="fixed inset-x-0 top-0 z-30 bg-transparent">
      <div className="max-w-[1600px] mx-auto w-full pl-4 lg:pl-6 pr-6 lg:pr-10 pt-5 pb-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold text-white tracking-tight">Conversas WhatsApp</h1>
          </div>

          <motion.div
            whileHover={{ scale: 1.05, translateY: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button
              className="bg-primary hover:bg-primary/90 text-white h-11 px-6 rounded-2xl shadow-[0_0_20px_rgba(104,41,192,0.3)] transition-all font-semibold"
              onClick={onNewConversation}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Conversa
            </Button>
          </motion.div>
        </div>

        {children}
      </div>
    </div>
  );
}
