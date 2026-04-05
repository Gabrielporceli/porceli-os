
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { X, Filter } from "lucide-react";
import ReactDOM from "react-dom";
import { useStages } from "@/hooks/useStages";
import { useTags } from "@/hooks/useTags";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { useScrollLock } from "@/hooks/useScrollLock";

interface FilterState {
  stages: string[];
  tags: string[];
  direction: string[];
  client: string;
}

interface ConversationSidebarFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export function ConversationSidebarFilters({ isOpen, onClose, filters, onFiltersChange }: ConversationSidebarFiltersProps) {
  useScrollLock(isOpen);
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const { stages, isLoading: stagesLoading } = useStages();
  const { tags, isLoading: tagsLoading } = useTags();

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const directionOptions = [
    { value: "inbound", label: "Entrada" },
    { value: "outbound", label: "Saída" }
  ];

  const handleStageChange = (stage: string, checked: boolean) => {
    setLocalFilters(prev => ({
      ...prev,
      stages: checked
        ? [...prev.stages, stage]
        : prev.stages.filter(s => s !== stage)
    }));
  };

  const handleTagChange = (tag: string, checked: boolean) => {
    setLocalFilters(prev => ({
      ...prev,
      tags: checked
        ? [...prev.tags, tag]
        : prev.tags.filter(t => t !== tag)
    }));
  };

  const handleDirectionChange = (direction: string, checked: boolean) => {
    setLocalFilters(prev => ({
      ...prev,
      direction: checked
        ? [...prev.direction, direction]
        : prev.direction.filter(d => d !== direction)
    }));
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleClearFilters = () => {
    const emptyFilters = {
      stages: [],
      tags: [],
      direction: [],
      client: ""
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
      <div className="fixed inset-y-0 right-0 z-[1000000] w-full max-w-md animate-slide-in-right p-4">
        <LiquidGlass
          className="h-full w-full shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/[0.05]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(104,41,192,0.4)]">
                <Filter className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Filtros</h2>
                <p className="text-white/40 text-sm">Filtre as conversas conforme necessário</p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-white/40 hover:text-white hover:bg-white/[0.05] rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content with Custom Scrollbar */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <style>{`
              .custom-scrollbar::-webkit-scrollbar {
                width: 6px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.02);
                border-radius: 10px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: rgba(104, 41, 192, 0.5);
                border-radius: 10px;
                transition: background 0.3s;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: rgba(104, 41, 192, 0.8);
              }
              .custom-scrollbar {
                scrollbar-width: thin;
                scrollbar-color: rgba(104, 41, 192, 0.5) transparent;
                overflow-y: overlay; /* Faz a barra flutuar sobre o conteúdo se o browser suportar */
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

            <div className="p-6 pt-2 space-y-8">


              {/* Etapas do Kanban */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                  Etapa do Funil
                </h3>

                <div className="grid grid-cols-1 gap-2.5">
                  {stagesLoading ? (
                    <div className="text-white/40 text-sm">Carregando etapas...</div>
                  ) : stages.length === 0 ? (
                    <div className="text-white/40 text-sm italic">Nenhuma etapa encontrada</div>
                  ) : (
                    stages.map((stage) => (
                      <label
                        key={stage.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${
                          localFilters.stages.includes(stage.name)
                            ? 'bg-primary/10 border-primary/40 shadow-[0_0_15px_rgba(104,41,192,0.1)]'
                            : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${stage.color} shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]`} />
                          <span className={`text-sm tracking-tight ${localFilters.stages.includes(stage.name) ? 'text-white' : 'text-white/60'}`}>
                            {stage.name}
                          </span>
                        </div>
                        <Checkbox
                          id={`stage-${stage.id}`}
                          checked={localFilters.stages.includes(stage.name)}
                          onCheckedChange={(checked) => handleStageChange(stage.name, checked as boolean)}
                          className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary w-5 h-5 rounded-full"
                        />
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                  Tags
                </h3>

                <div className="flex flex-wrap gap-2">
                  {tagsLoading ? (
                    <div className="text-white/40 text-sm">Carregando tags...</div>
                  ) : tags.length === 0 ? (
                    <div className="text-white/40 text-sm italic">Nenhuma tag encontrada</div>
                  ) : (
                    tags.map((tag) => (
                      <label
                        key={tag.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all cursor-pointer text-xs font-medium ${
                          localFilters.tags.includes(tag.name)
                            ? 'bg-primary text-white border-primary shadow-[0_0_15px_rgba(104,41,192,0.3)]'
                            : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20 hover:text-white/60'
                        }`}
                      >
                         <Checkbox
                          id={`tag-${tag.id}`}
                          checked={localFilters.tags.includes(tag.name)}
                          onCheckedChange={(checked) => handleTagChange(tag.name, checked as boolean)}
                          className="hidden"
                        />
                        <div className={`w-1.5 h-1.5 rounded-full ${tag.color}`} />
                        {tag.name}
                      </label>
                    ))
                  )}
                </div>
              </div>


            </div>
          </div>

          {/* Botões */}
          <div className="p-6 border-t border-white/[0.05]">
            <div className="flex gap-4">
              <Button
                onClick={handleApplyFilters}
                className="bg-primary hover:bg-primary/90 text-white flex-1 h-12 text-sm font-bold shadow-[0_0_15px_rgba(104,41,192,0.4)] rounded-xl transition-all"
              >
                Aplicar Filtros
              </Button>
              <Button
                onClick={handleClearFilters}
                className="flex-1 h-12 text-sm font-bold bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 hover:border-white/20 text-white/70 hover:text-white rounded-xl transition-all"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </LiquidGlass>
      </div>
    </>,
    document.body
  );
}
