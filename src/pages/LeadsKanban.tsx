import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/ui/PageLoader";
import { usePageReady } from "@/hooks/usePageReady";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  EllipsisVertical,
  GripVertical,
  Plus,
  Trash2,
  User,
} from "lucide-react";

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import { TagsManagementModal } from "@/components/Leads/TagsManagementModal";
import { EditLeadModal } from "@/components/Leads/EditLeadModal";
import { AddStageModal } from "@/components/Leads/AddStageModal";
import { NewLeadModal } from "@/components/Leads/NewLeadModal";
import { EditStageModal } from "@/components/Leads/EditStageModal";
import { DeleteLeadDialog } from "@/components/Leads/DeleteLeadDialog";
import { LiquidGlass } from "@/components/ui/liquid-glass";

import { useIsMobile } from "@/hooks/use-mobile";
import { useLeads, type Lead } from "@/hooks/useLeads";
import { useTags, type Tag } from "@/hooks/useTags";
import { useStages, type Stage } from "@/hooks/useStages";
import { useToast } from "@/hooks/use-toast";

import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
  type DragStart,
} from "@hello-pangea/dnd";

// Helper para reordenar lista
const reorder = <T,>(list: T[], startIndex: number, endIndex: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

/**
 * Camada que devolve o vidro líquido REAL aos cards do kanban.
 *
 * O problema: a faixa do kanban tem overflow-x-auto, e qualquer overflow
 * diferente de "visible" vira o "backdrop root" do backdrop-filter dos
 * descendentes — o recorte acontece ANTES do filtro ser aplicado, então o
 * blur dos cards não alcança o wallpaper fixed da página (outra camada de
 * composição) e o vidro fica "morto".
 *
 * A solução: pintar uma réplica do wallpaper DENTRO da própria faixa, com
 * position: sticky (left: 0, largura = área visível, pegada zero no layout
 * via margin-right negativa) pra ela ficar pinada na janela visível do
 * scroll. O JS alinha background-size/position ao viewport (mesma conta do
 * background-size: cover centrado do CRMLayout), então a réplica fica pixel
 * a pixel idêntica ao wallpaper real atrás — invisível como "caixa" — e o
 * backdrop-filter dos cards finalmente tem conteúdo real pra desfocar.
 */
function KanbanGlassBackdrop() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let natW = 0;
    let natH = 0;
    let raf = 0;

    const update = () => {
      raf = 0;
      const node = ref.current;
      if (!node || !natW || !natH) return;
      const rect = node.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Reproduz "background-size: cover; background-position: center"
      // calculado contra o VIEWPORT (não contra este elemento).
      const scale = Math.max(vw / natW, vh / natH);
      const w = natW * scale;
      const h = natH * scale;
      const x = (vw - w) / 2 - rect.left;
      const y = (vh - h) / 2 - rect.top;
      node.style.backgroundSize = `100% 100%, ${w}px ${h}px`;
      node.style.backgroundPosition = `0 0, ${x}px ${y}px`;
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    const img = new Image();
    img.onload = () => {
      natW = img.naturalWidth;
      natH = img.naturalHeight;
      schedule();
    };
    img.src = "/app-bg.webp";

    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="sticky left-0 -z-10 self-stretch shrink-0 pointer-events-none"
      style={{
        minWidth: "100%",
        marginRight: "-100%",
        backgroundImage:
          'linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.25)), url("/app-bg.webp")',
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}

export default function LeadsKanban() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const {
    leads,
    isLoading: leadsLoading,
    createLead,
    updateLead,
    deleteLead,
    updateLeadStage,
  } = useLeads();

  const { tags, isLoading: tagsLoading } = useTags();
  const {
    stages,
    isLoading: stagesLoading,
    createStage,
    updateStage,
    deleteStage,
  } = useStages();

  const isReady = usePageReady(leadsLoading || tagsLoading || stagesLoading);

  // ===== Modais / Seleções =====
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isEditLeadModalOpen, setIsEditLeadModalOpen] = useState(false);
  const [isAddStageModalOpen, setIsAddStageModalOpen] = useState(false);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isEditStageModalOpen, setIsEditStageModalOpen] = useState(false);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [isDeleteLeadDialogOpen, setIsDeleteLeadDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

  const [activeFilter, setActiveFilter] = useState<string>("all");

  // ===== Otimista =====
  const [optimisticLeads, setOptimisticLeads] = useState<Lead[]>([]);
  useEffect(() => {
    if (leads) setOptimisticLeads(leads);
  }, [leads]);

  // ===== DnD state =====
  const [isDraggingCard, setIsDraggingCard] = useState(false);

  // ===== Drag-to-scroll (mouse/pen) =====
  const kanbanRef = useRef<HTMLDivElement | null>(null);

  const pan = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startScrollLeft: 0,
    lastX: 0,
    lastT: 0,
    v: 0, // px/ms
    raf: 0 as number | 0,
  });

  const stopInertia = () => {
    if (pan.current.raf) {
      cancelAnimationFrame(pan.current.raf);
      pan.current.raf = 0;
    }
  };

  const cancelPan = () => {
    const container = kanbanRef.current;
    if (container && pan.current.pointerId !== -1) {
      try {
        container.releasePointerCapture(pan.current.pointerId);
      } catch {
        // ignore
      }
    }
    pan.current.active = false;
    pan.current.pointerId = -1;
    pan.current.v = 0;
    stopInertia();
  };

  const startInertia = () => {
    const container = kanbanRef.current;
    if (!container) return;

    const DECAY = 0.94;
    const MIN = 0.02;

    const step = () => {
      const c = kanbanRef.current;
      if (!c) return;

      c.scrollLeft -= pan.current.v * 16;
      pan.current.v *= DECAY;

      if (Math.abs(pan.current.v) > MIN) {
        pan.current.raf = requestAnimationFrame(step);
      } else {
        stopInertia();
      }
    };

    stopInertia();
    pan.current.raf = requestAnimationFrame(step);
  };

  const isInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return !!target.closest(
      [
        "button",
        "[role='button']",
        "a",
        "input",
        "textarea",
        "select",
        "[data-dnd-handle]",
        "[data-rbd-drag-handle-draggable-id]",
        "[data-no-pan]",
      ].join(",")
    );
  };

  const onPointerDownPan = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    if (e.button !== 0) return;
    if (isDraggingCard) return;

    const container = kanbanRef.current;
    if (!container) return;

    if (isInteractiveTarget(e.target)) return;

    stopInertia();

    pan.current.active = true;
    pan.current.pointerId = e.pointerId;
    pan.current.startX = e.clientX;
    pan.current.startScrollLeft = container.scrollLeft;
    pan.current.lastX = e.clientX;
    pan.current.lastT = performance.now();
    pan.current.v = 0;

    container.setPointerCapture(e.pointerId);
  };

  const onPointerMovePan = (e: React.PointerEvent<HTMLDivElement>) => {
    // ✅ NÃO deixar o pan disputar com o DnD durante o drag
    if (isDraggingCard) return;

    const container = kanbanRef.current;
    if (!container) return;
    if (!pan.current.active) return;
    if (e.pointerId !== pan.current.pointerId) return;

    e.preventDefault();

    const dx = e.clientX - pan.current.startX;
    container.scrollLeft = pan.current.startScrollLeft - dx;

    const now = performance.now();
    const dt = now - pan.current.lastT;
    if (dt > 0) {
      const seg = e.clientX - pan.current.lastX;
      pan.current.v = seg / dt;
      pan.current.lastX = e.clientX;
      pan.current.lastT = now;
    }
  };

  const endPan = () => {
    if (!pan.current.active) return;

    pan.current.active = false;

    const container = kanbanRef.current;
    if (container && pan.current.pointerId !== -1) {
      try {
        container.releasePointerCapture(pan.current.pointerId);
      } catch {
        // ignore
      }
    }

    if (Math.abs(pan.current.v) > 0.02) startInertia();
  };

  const onPointerUpPan = (e: React.PointerEvent<HTMLDivElement>) => {
    // ✅ idem: se está arrastando card, não mexe no pan
    if (isDraggingCard) return;

    if (e.pointerType === "touch") return;
    if (e.pointerId !== pan.current.pointerId) return;
    endPan();
  };

  const onPointerCancelPan = (e: React.PointerEvent<HTMLDivElement>) => {
    // ✅ idem: se está arrastando card, não mexe no pan
    if (isDraggingCard) return;

    if (e.pointerType === "touch") return;
    if (e.pointerId !== pan.current.pointerId) return;
    endPan();
  };

  useEffect(() => {
    return () => stopInertia();
  }, []);

  // ===== Helpers =====
  const tagColorClass = (tagName: string) => {
    const t = tags.find((x) => x.name === tagName);
    return t?.color ?? "bg-zinc-600";
  };

  const getLeadsByStage = (stageId: string) =>
    optimisticLeads.filter((l) => l.stage === stageId);

  const getFilteredLeads = (stageLeads: Lead[]) => {
    if (activeFilter === "all") return stageLeads;
    return stageLeads.filter((l) => l.tags?.includes(activeFilter));
  };

  // ===== Handlers (CRUD) =====
  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsEditLeadModalOpen(true);
  };

  const handleUpdateLead = async (updatedLead: Lead) => {
    try {
      await updateLead(updatedLead.id, {
        name: updatedLead.name,
        company: updatedLead.company,
        phone: updatedLead.phone,
        email: updatedLead.email,
        stage: updatedLead.stage,
        tags: updatedLead.tags,
        value: updatedLead.value,
        notes: updatedLead.notes,
        meeting_date: updatedLead.meeting_date,
        reuniao_realizada: updatedLead.reuniao_realizada,
      });
    } catch (error) {
      console.error("Erro ao atualizar lead:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o lead.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      await deleteLead(leadId);
    } catch (error) {
      console.error("Erro ao deletar lead:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o lead.",
        variant: "destructive",
      });
    }
  };

  const handleAddStage = async (newStageData: { name: string; color: string }) => {
    try {
      await createStage(newStageData);
    } catch (error) {
      console.error("Erro ao criar etapa:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a etapa.",
        variant: "destructive",
      });
    }
  };

  const handleEditStage = (stage: Stage) => {
    setSelectedStage(stage);
    setIsEditStageModalOpen(true);
  };

  const handleUpdateStage = async (updatedStage: { name: string; color: string }) => {
    if (!selectedStage) return;
    try {
      await updateStage(selectedStage.id, updatedStage);
    } catch (error) {
      console.error("Erro ao atualizar etapa:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a etapa.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    try {
      await deleteStage(stageId);
    } catch (error) {
      console.error("Erro ao deletar etapa:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a etapa.",
        variant: "destructive",
      });
    }
  };

  const handleAddLead = async (newLeadData: {
    name: string;
    company: string;
    phone: string;
    email?: string;
    stage: string;
    tags?: string[];
    value?: number;
  }) => {
    try {
      await createLead(newLeadData);
    } catch (error) {
      console.error("Erro ao criar lead:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o lead.",
        variant: "destructive",
      });
    }
  };

  // ===== DnD =====
  const onDragStart = (_: DragStart) => {
    cancelPan();
    setIsDraggingCard(true);
  };

  const onDragEnd = async (result: DropResult) => {
    setIsDraggingCard(false);

    const { source, destination, draggableId } = result;
    if (!destination) return;

    if (source.droppableId === destination.droppableId) {
      const stageId = source.droppableId;

      const stageLeads = optimisticLeads.filter((l) => l.stage === stageId);
      const reorderedStageLeads = reorder(stageLeads, source.index, destination.index);

      const otherLeads = optimisticLeads.filter((l) => l.stage !== stageId);

      setOptimisticLeads([...otherLeads, ...reorderedStageLeads]);
      return;
    }

    const leadToMove = optimisticLeads.find((l) => l.id === draggableId);
    if (!leadToMove) return;

    const previousStage = leadToMove.stage;
    const nextStage = destination.droppableId;

    setOptimisticLeads((prev) =>
      prev.map((l) => (l.id === draggableId ? { ...l, stage: nextStage } : l))
    );

    try {
      await updateLeadStage(draggableId, nextStage);
    } catch (error) {
      console.error("Erro ao mover lead:", error);

      setOptimisticLeads((prev) =>
        prev.map((l) => (l.id === draggableId ? { ...l, stage: previousStage } : l))
      );

      toast({
        title: "Erro",
        description: "Não foi possível mover o lead. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (!isReady) return <PageLoader />;

  return (
    <main className="relative">
      {/* Cabeçalho no mesmo padrão do Calendário: título forte à esquerda,
          pills de vidro líquido à direita. */}
      <div
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8"
        style={{ pointerEvents: isDraggingCard ? "none" : "auto" }}
      >
        <div>
          <h2 className="text-lg font-black text-white tracking-tight leading-none">
            Funil de Prospecção
          </h2>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mt-2">
            {optimisticLeads.length} {optimisticLeads.length === 1 ? "lead no funil" : "leads no funil"}
          </p>
        </div>
        <div className="flex flex-row items-center gap-3">
        <motion.div
          whileHover={{ scale: 1.05, translateY: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <LiquidGlassButton
            onClick={() => setIsTagsModalOpen(true)}
            className="h-11 px-6 text-xs font-bold uppercase tracking-widest"
          >
            {isMobile ? "Tags" : "Gerenciar Tags"}
          </LiquidGlassButton>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05, translateY: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <LiquidGlassButton
            onClick={() => setIsAddStageModalOpen(true)}
            className="h-11 px-6 text-xs font-bold uppercase tracking-widest"
          >
            {isMobile ? "Etapa" : "Nova Etapa"}
          </LiquidGlassButton>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05, translateY: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <LiquidGlassButton
            tint="primary"
            onClick={() => setIsNewLeadModalOpen(true)}
            className="h-11 px-6 text-xs font-bold uppercase tracking-widest"
          >
            {isMobile ? "Lead" : "Novo Lead"}
          </LiquidGlassButton>
        </motion.div>
        </div>
      </div>

      <div className="pb-6 -mx-4 lg:-mx-10 px-4 lg:px-10">
        <DragDropContext
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          autoScrollerOptions={{
            startFromPercentage: 0.4,
            maxScrollAtPercentage: 0.15,
            maxPixelScroll: 28,
          }}
        >
          <div
            ref={kanbanRef}
            className="flex gap-3 sm:gap-4 min-h-[520px] sm:min-h-[620px] overflow-x-auto overflow-y-hidden select-none cursor-grab active:cursor-grabbing px-16 pb-2"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
              maskImage: "linear-gradient(to right, transparent, black 200px, black calc(100% - 200px), transparent)",
              WebkitMaskImage: "linear-gradient(to right, transparent, black 200px, black calc(100% - 200px), transparent)",
            }}
            onPointerDown={onPointerDownPan}
            onPointerMove={onPointerMovePan}
            onPointerUp={onPointerUpPan}
            onPointerCancel={onPointerCancelPan}
          >
            <KanbanGlassBackdrop />
            {stages.map((stage: Stage) => {
              const stageLeads = getLeadsByStage(stage.id);
              const filteredLeads = getFilteredLeads(stageLeads);

              const count = filteredLeads.length;

              return (
                <div
                  key={stage.id}
                  className={`flex-shrink-0 space-y-3 sm:space-y-4 ${isMobile ? "w-72" : "w-80"
                    }`}
                >
                  {/* Cápsula de vidro líquido (mesmo material dos cards) —
                      o blur funciona aqui pelo KanbanGlassBackdrop. */}
                  <div className="liquid-glass no-elevation !rounded-full flex items-center justify-between gap-2 py-2.5 px-5 transition-all hover:brightness-110">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-2.5 h-2.5 rounded-full ${stage.color} flex-shrink-0`} />
                      <h3 className="font-black text-white text-xs uppercase tracking-[0.15em] truncate">
                        {stage.name}
                      </h3>
                      <span className="text-[10px] font-black text-white/50 leading-none flex-shrink-0">
                        {count} {count === 1 ? "lead" : "leads"}
                      </span>
                    </div>

                    <motion.div
                      whileHover={{ scale: 1.1, translateY: -2 }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white/40 hover:bg-white/10 hover:text-white w-8 h-8 rounded-lg"
                        onClick={() => handleEditStage(stage)}
                        data-no-pan
                      >
                        <EllipsisVertical className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  </div>

                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-4 min-h-[300px] sm:min-h-[400px] p-2 rounded-2xl transition-colors ${snapshot.isDraggingOver ? "bg-primary/[0.08] ring-1 ring-primary/25" : ""
                          }`}
                      >
                        {filteredLeads.map((lead, index) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={snapshot.isDragging ? "" : ""}
                                style={provided.draggableProps.style}
                              >
                                <ContextMenu>
                                  <ContextMenuTrigger asChild>
                                    <Card
                                      className={cn(
                                        // Vidro líquido REAL (blur + bevel Apple Tahoe): funciona
                                        // porque o KanbanGlassBackdrop pinta a réplica do wallpaper
                                        // dentro do backdrop root da faixa. no-elevation = sem as
                                        // sombras externas pesadas, só bisel + hairline.
                                        'liquid-glass no-elevation rounded-2xl p-2.5 sm:p-3 relative group cursor-pointer',
                                        'transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110',
                                        snapshot.isDragging && 'ring-2 ring-primary/50 scale-[1.02]'
                                      )}
                                    >
                                      <div
                                        className={cn('absolute inset-0 z-[1] rounded-2xl')}
                                        onClick={() => handleEditLead(lead)}
                                      />

                                      <div className="space-y-1.5 relative">
                                        <div className="flex items-center gap-2">
                                          <div
                                            {...provided.dragHandleProps}
                                            data-dnd-handle
                                            // ✅ garante que o browser não tente “interpretar gesto” e travar eixo
                                            style={{ touchAction: "none" }}
                                            className="relative z-[2] touch-none h-7 w-7 sm:h-8 sm:w-8 grid place-items-center rounded-md text-white/50 hover:bg-white/10 hover:text-white transition-colors cursor-grab active:cursor-grabbing flex-shrink-0"
                                            title="Arrastar"
                                          >
                                            <GripVertical className="w-4 h-4" />
                                          </div>

                                          <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div
                                              className="relative flex-shrink-0 z-[10] cursor-pointer"
                                              data-no-pan
                                              onPointerDown={(e) => {
                                                e.stopPropagation();
                                                handleEditLead(lead);
                                              }}
                                            >
                                              <Avatar className="w-10 h-10 ring-1 ring-white/10 transition-all">
                                                <AvatarImage src={lead.photo_url || undefined} alt={lead.name} />
                                                <AvatarFallback className="bg-primary/10 text-primary">
                                                  <User className="w-5 h-5" />
                                                </AvatarFallback>
                                              </Avatar>
                                            </div>

                                            <div className="flex-1 min-w-0 py-1.5">
                                              <h4 className="font-bold text-white text-sm tracking-tight truncate leading-snug mb-1">
                                                {lead.name}
                                              </h4>
                                              <p className="text-white/40 text-[11px] truncate leading-snug">
                                                {lead.company || lead.phone}
                                              </p>
                                            </div>
                                          </div>

                                          <button
                                            className="relative z-[10] text-white/40 hover:text-white p-1.5 transition-colors cursor-pointer"
                                            data-no-pan
                                            onPointerDown={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              handleEditLead(lead);
                                            }}
                                            title="Editar Lead"
                                          >
                                            <EllipsisVertical className="w-5 h-5" />
                                          </button>

                                        </div>



                                        {lead.value != null && (
                                          <div className="text-primary font-bold text-xs sm:text-sm tabular-nums">
                                            R$ {lead.value.toLocaleString("pt-BR")}
                                          </div>
                                        )}

                                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06] mt-2">
                                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/20 flex-shrink-0">
                                            {isMobile
                                              ? new Date(lead.updated_at).toLocaleDateString(
                                                "pt-BR",
                                                { day: "2-digit", month: "2-digit" }
                                              )
                                              : `Atualizado ${new Date(lead.updated_at).toLocaleDateString("pt-BR")}`}
                                          </span>
                                           {lead.meeting_date && !lead.reuniao_realizada && (
                                             <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary truncate">
                                               Reunião {new Date(lead.meeting_date).toLocaleString('pt-BR', {
                                                 day: '2-digit',
                                                 month: '2-digit',
                                                 hour: '2-digit',
                                                 minute: '2-digit'
                                               })}
                                             </span>
                                           )}
                                        </div>
                                      </div>
                                    </Card>
                                  </ContextMenuTrigger>

                                  <ContextMenuContent className="liquid-glass border-white/[0.05]">
                                    <ContextMenuItem
                                      onClick={() => handleEditLead(lead)}
                                      className="text-white data-[highlighted]:bg-primary/80 data-[highlighted]:text-white"
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                      Editar Lead
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                      onClick={() => {
                                        setLeadToDelete(lead);
                                        setIsDeleteLeadDialogOpen(true);
                                      }}
                                      className="text-red-400 data-[highlighted]:bg-white/[0.05] data-[highlighted]:text-red-400"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Excluir Lead
                                    </ContextMenuItem>
                                  </ContextMenuContent>
                                </ContextMenu>
                              </div>
                            )}
                          </Draggable>
                        ))}

                        {provided.placeholder}

                        {filteredLeads.length === 0 && (
                          <div className="border-2 border-dashed border-white/[0.06] rounded-2xl p-6 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                              {isMobile ? "Arraste leads" : "Arraste leads para cá"}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}

            <div className="flex-shrink-0 w-6 h-full" aria-hidden="true" />
          </div>
        </DragDropContext>

        {/* Modais */}
        <TagsManagementModal open={isTagsModalOpen} onOpenChange={setIsTagsModalOpen} />

        <EditLeadModal
          open={isEditLeadModalOpen}
          onOpenChange={setIsEditLeadModalOpen}
          lead={selectedLead}
          tags={tags}
          stages={stages}
          onUpdateLead={handleUpdateLead}
          onDeleteLead={(lead) => {
            setLeadToDelete(lead);
            setIsDeleteLeadDialogOpen(true);
            setIsEditLeadModalOpen(false);
          }}
        />

        <AddStageModal
          open={isAddStageModalOpen}
          onOpenChange={setIsAddStageModalOpen}
          onAddStage={handleAddStage}
        />

        <NewLeadModal
          open={isNewLeadModalOpen}
          onOpenChange={setIsNewLeadModalOpen}
          tags={tags}
          stages={stages}
          onAddLead={handleAddLead}
        />

        <EditStageModal
          open={isEditStageModalOpen}
          onOpenChange={setIsEditStageModalOpen}
          stage={selectedStage}
          onUpdateStage={handleUpdateStage}
          onDeleteStage={handleDeleteStage}
        />

        <DeleteLeadDialog
          isOpen={isDeleteLeadDialogOpen}
          lead={leadToDelete}
          onClose={() => setIsDeleteLeadDialogOpen(false)}
          onConfirm={async () => {
            if (leadToDelete) {
              await handleDeleteLead(leadToDelete.id);
              setIsDeleteLeadDialogOpen(false);
            }
          }}
        />
      </div>
    </main>
  );
}
