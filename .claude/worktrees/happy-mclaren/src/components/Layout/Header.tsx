
import React from 'react';
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
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-goat-gray-800 border-b border-goat-gray-700">
      <div className="flex items-center gap-2 px-4">
        <Separator orientation="vertical" className="mr-2 h-4 bg-goat-gray-600" />
      </div>
      
      <div className="flex-1" />
      
      <div className="flex items-center gap-2 px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 text-goat-gray-300 hover:text-white hover:bg-goat-gray-700">
              <User className="w-4 h-4" />
              <span className="text-sm">{user?.email}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-goat-gray-800 border-goat-gray-700">
            <DropdownMenuItem 
              onClick={logout}
              className="text-goat-gray-300 hover:text-white hover:bg-goat-gray-700 cursor-pointer"
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
