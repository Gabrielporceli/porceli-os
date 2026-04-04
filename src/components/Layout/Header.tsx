import React from 'react';
import { motion } from 'framer-motion';
import { Separator } from "@/components/ui/separator";
import { useAuth } from '@/hooks/useAuth';
import { LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-Porceli-gray-800 border-b border-Porceli-gray-700">
      <div className="flex items-center gap-2 px-4">
        <Separator orientation="vertical" className="mr-2 h-4 bg-Porceli-gray-600" />
      </div>
      
      <div className="flex-1" />
      
      <div className="flex items-center gap-2 px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.div
              whileHover={{ scale: 1.05, translateY: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button variant="ghost" className="flex items-center gap-2 text-Porceli-gray-300 hover:text-white hover:bg-Porceli-gray-700">
                <User className="w-4 h-4" />
                <span className="text-sm">{user?.email}</span>
              </Button>
            </motion.div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-Porceli-gray-800 border-Porceli-gray-700">
            <DropdownMenuItem 
              onClick={logout}
              className="text-Porceli-gray-300 hover:text-white hover:bg-Porceli-gray-700 cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
