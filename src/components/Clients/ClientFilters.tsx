
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { usePlansContext } from "@/contexts/PlansContext";
import ReactDOM from "react-dom";
import { DatePicker } from "@/components/ui/date-picker";
import { parseISO, format } from "date-fns";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface FilterState {
  status: string[];
  plan: string[];
  contractPeriod: { start: string; end: string };
  location: string;
}

interface ClientFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

import { LiquidGlass } from "@/components/ui/liquid-glass";

export function ClientFilters({ isOpen, onClose, filters, onFiltersChange }: ClientFiltersProps) {
  useScrollLock(isOpen);
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const { getPlanNames, isLoading: plansLoading } = usePlansContext();

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const statusOptions = ["Ativo", "A vencer", "Vencido"];
  const planOptions = getPlanNames();

  const handleStatusChange = (status: string, checked: boolean) => {
    setLocalFilters(prev => ({
      ...prev,
      status: checked
        ? [...prev.status, status]
        : prev.status.filter(s => s !== status)
    }));
  };

  const handlePlanChange = (plan: string, checked: boolean) => {
    setLocalFilters(prev => ({
      ...prev,
      plan: checked
        ? [...prev.plan, plan]
        : prev.plan.filter(p => p !== plan)
    }));
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleClearFilters = () => {
    const emptyFilters = {
      status: [],
      plan: [],
      contractPeriod: { start: "", end: "" },
      location: ""
    };
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      {/* Custom Overlay with blur */}
      <div
        className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-[4px] animate-fade-in"
        onClick={onClose}
      />

      {/* Filters Panel - Slide from right */}
      <div className="fixed inset-y-0 right-0 z-[1000000] w-full max-w-md p-4 flex animate-slide-in-right">
        <LiquidGlass
          className="h-full w-full shadow-2xl border-l border-white/[0.05] flex flex-col overflow-hidden !rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/[0.05]">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Filtros</h2>
                <p className="text-white/40 text-sm">Refine a visualização dos clientes</p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content with Custom Scrollbar */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <style>{`
              .custom-scrollbar::-webkit-scrollbar {
                width: 6px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: transparent;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: rgba(104, 41, 192, 0.2);
                border-radius: 10px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: rgba(104, 41, 192, 0.4);
              }
              
              @keyframes slide-in-right {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
              }
              .animate-slide-in-right {
                animation: slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1);
              }
              @keyframes fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              .animate-fade-in {
                animation: fade-in 0.3s ease-out;
              }
            `}</style>

            <div className="space-y-10">
              {/* Nome da Empresa */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em] border-b border-white/[0.05] pb-2">
                  Empresa
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-white/70 text-xs font-bold uppercase tracking-widest ml-1">Nome da Empresa</Label>
                  <Input
                    id="companyName"
                    placeholder="Buscar por nome..."
                    value={localFilters.location}
                    onChange={(e) => setLocalFilters(prev => ({ ...prev, location: e.target.value }))}
                    className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/10 h-11 rounded-xl transition-all"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em] border-b border-white/[0.05] pb-2">
                  Status do Cliente
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {statusOptions.map((status) => (
                    <div 
                      key={status} 
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer",
                        localFilters.status.includes(status) 
                          ? "bg-primary/10 border-primary/30" 
                          : "bg-white/[0.02] border-white/[0.05] hover:border-white/10"
                      )}
                      onClick={() => handleStatusChange(status, !localFilters.status.includes(status))}
                    >
                      <Checkbox
                        id={`status-${status}`}
                        checked={localFilters.status.includes(status)}
                        onCheckedChange={(checked) => handleStatusChange(status, checked as boolean)}
                        className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <Label
                        htmlFor={`status-${status}`}
                        className="text-white/80 font-medium cursor-pointer flex-1"
                      >
                        {status}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tipo de Plano */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em] border-b border-white/[0.05] pb-2">
                  Tipo de Plano
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {plansLoading ? (
                    <div className="text-white/40">Carregando planos...</div>
                  ) : (
                    planOptions.map((plan) => (
                      <div 
                        key={plan} 
                        className={cn(
                          "flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer",
                          localFilters.plan.includes(plan) 
                            ? "bg-primary/10 border-primary/30" 
                            : "bg-white/[0.02] border-white/[0.05] hover:border-white/10"
                        )}
                        onClick={() => handlePlanChange(plan, !localFilters.plan.includes(plan))}
                      >
                        <Checkbox
                          id={`plan-${plan}`}
                          checked={localFilters.plan.includes(plan)}
                          onCheckedChange={(checked) => handlePlanChange(plan, checked as boolean)}
                          className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <Label
                          htmlFor={`plan-${plan}`}
                          className="text-white/80 font-medium cursor-pointer flex-1"
                        >
                          {plan}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Período do Fim de Contrato */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em] border-b border-white/[0.05] pb-2">
                  Vencimento de Contrato
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/70 text-xs font-bold uppercase tracking-widest ml-1">De</Label>
                    <DatePicker
                      date={localFilters.contractPeriod.start ? parseISO(localFilters.contractPeriod.start) : undefined}
                      setDate={(newDate) => {
                        if (newDate) {
                          setLocalFilters(prev => ({
                            ...prev,
                            contractPeriod: { ...prev.contractPeriod, start: format(newDate, "yyyy-MM-dd") }
                          }));
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70 text-xs font-bold uppercase tracking-widest ml-1">Até</Label>
                    <DatePicker
                      date={localFilters.contractPeriod.end ? parseISO(localFilters.contractPeriod.end) : undefined}
                      setDate={(newDate) => {
                        if (newDate) {
                          setLocalFilters(prev => ({
                            ...prev,
                            contractPeriod: { ...prev.contractPeriod, end: format(newDate, "yyyy-MM-dd") }
                          }));
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="p-6 border-t border-white/[0.05]">
            <div className="flex gap-4">
              <motion.div className="flex-1" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={handleApplyFilters}
                  className="bg-primary hover:bg-primary/90 text-white w-full h-12 rounded-xl shadow-[0_0_20px_rgba(104,41,192,0.3)] font-bold transition-all text-sm uppercase tracking-widest"
                >
                  Filtrar
                </Button>
              </motion.div>
              <motion.div className="flex-1" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={handleClearFilters}
                  className="w-full h-12 text-sm font-bold bg-white/[0.05] hover:bg-white/10 text-white/70 border border-white/5 rounded-2xl transition-all uppercase tracking-widest"
                >
                  Limpar
                </Button>
              </motion.div>
            </div>
          </div>
        </LiquidGlass>
      </div>
    </>,
    document.body
  );
}
