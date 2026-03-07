
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { X, Filter } from "lucide-react";
import { usePlansContext } from "@/contexts/PlansContext";
import ReactDOM from "react-dom";
import { DatePicker } from "@/components/ui/date-picker";
import { parseISO, format } from "date-fns";

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

export function ClientFilters({ isOpen, onClose, filters, onFiltersChange }: ClientFiltersProps) {
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
        style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed', zIndex: 999999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Filters Panel - Slide from right */}
      <div className="fixed inset-y-0 right-0 z-[1000000] w-full max-w-md animate-slide-in-right">
        <div
          className="h-full liquid-glass shadow-2xl border-l border-white/[0.05] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/[0.05]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-goat-purple rounded-lg flex items-center justify-center">
                <Filter className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Filtros</h2>
                <p className="text-white/40 text-sm">Filtre os clientes conforme necessário</p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content with Custom Scrollbar */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <style>{`
              .custom-scrollbar::-webkit-scrollbar {
                width: 8px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.02);
                border-radius: 4px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #6829c0;
                border-radius: 4px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #6B21D3;
              }
              .custom-scrollbar {
                scrollbar-width: thin;
                scrollbar-color: #6829c0 #404040;
              }

              /* Animações */
              @keyframes fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
              }

              @keyframes slide-in-right {
                from { 
                  transform: translateX(100%); 
                  opacity: 0;
                }
                to { 
                  transform: translateX(0); 
                  opacity: 1;
                }
              }

              .animate-fade-in {
                animation: fade-in 0.2s ease-out;
              }

              .animate-slide-in-right {
                animation: slide-in-right 0.3s ease-out;
              }
            `}</style>

            <div className="p-6 space-y-8">
              {/* Nome da Empresa */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white border-b border-white/[0.05] pb-2">
                  Empresa
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-white">Nome da Empresa</Label>
                  <Input
                    id="companyName"
                    placeholder="Buscar por nome..."
                    value={localFilters.location}
                    onChange={(e) => setLocalFilters(prev => ({ ...prev, location: e.target.value }))}
                    className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white border-b border-white/[0.05] pb-2">
                  Status
                </h3>

                <div className="space-y-3">
                  {statusOptions.map((status) => (
                    <div key={status} className="flex items-center space-x-3">
                      <Checkbox
                        id={`status-${status}`}
                        checked={localFilters.status.includes(status)}
                        onCheckedChange={(checked) => handleStatusChange(status, checked as boolean)}
                        className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <Label
                        htmlFor={`status-${status}`}
                        className="text-white/70 cursor-pointer hover:text-primary transition-colors"
                      >
                        {status}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tipo de Plano */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white border-b border-white/[0.05] pb-2">
                  Tipo de Plano
                </h3>

                {plansLoading ? (
                  <div className="text-white/40">Carregando planos...</div>
                ) : (
                  <div className="space-y-3">
                    {planOptions.map((plan) => (
                      <div key={plan} className="flex items-center space-x-3">
                        <Checkbox
                          id={`plan-${plan}`}
                          checked={localFilters.plan.includes(plan)}
                          onCheckedChange={(checked) => handlePlanChange(plan, checked as boolean)}
                          className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <Label
                          htmlFor={`plan-${plan}`}
                          className="text-white/70 cursor-pointer hover:text-primary transition-colors"
                        >
                          {plan}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Período do Fim de Contrato */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white border-b border-white/[0.05] pb-2">
                  Período do Fim de Contrato
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white">De</Label>
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
                    <Label className="text-white">Até</Label>
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

              {/* Cidade/Localização */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white border-b border-white/[0.05] pb-2">
                  Cidade/Localização
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="city" className="text-white">Cidade/Localização</Label>
                  <Input
                    id="city"
                    placeholder="Ex: São Paulo, SP"
                    value={localFilters.location}
                    onChange={(e) => setLocalFilters(prev => ({ ...prev, location: e.target.value }))}
                    className="bg-white/[0.03] border-white/[0.05] focus:border-primary/50 text-white placeholder:text-white/20 h-11 rounded-xl transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="p-6 border-t border-white/[0.05]">
            <div className="flex gap-4">
              <Button
                onClick={handleApplyFilters}
                className="bg-primary hover:bg-primary/90 text-white flex-1 h-12 rounded-2xl shadow-[0_0_20px_rgba(104,41,192,0.3)] font-bold transition-all text-base"
              >
                Aplicar Filtros
              </Button>
              <Button
                onClick={handleClearFilters}
                className="flex-1 h-12 text-base font-bold bg-white/[0.05] hover:bg-white/10 text-white/70 border border-white/5 rounded-2xl transition-all duration-200"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
