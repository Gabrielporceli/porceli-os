import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Edit,
  EllipsisVertical,
  GripVertical,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export default function LeadsKanban() {
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
    return t?.color ?? "bg-goat-gray-600";
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

  if (leadsLoading || tagsLoading || stagesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className="fixed inset-x-0 top-0 z-30 backdrop-blur-3xl bg-[#121212]/50 border-b border-white/[0.08] shadow-2xl"
        style={{ pointerEvents: isDraggingCard ? "none" : "auto" }}
      >
        <div className="max-w-[1600px] mx-auto w-full pl-4 lg:pl-6 pr-6 lg:pr-10 pt-6 pb-4 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-2">
              <div className="space-y-1">
                <h1 className="text-4xl font-bold text-white tracking-tight">Pipeline</h1>
              </div>

              <div className="flex flex-row items-center gap-3">
                <motion.div
                  whileHover={{ scale: 1.05, translateY: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button
                    className="liquid-glass hover:bg-white/10 text-white/70 border-white/5 h-11 px-6 rounded-2xl transition-all"
                    onClick={() => setIsTagsModalOpen(true)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {isMobile ? "Tags" : "Gerenciar Tags"}
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05, translateY: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button
                    className="liquid-glass hover:bg-white/10 text-white/70 border-white/5 h-11 px-6 rounded-2xl transition-all"
                    onClick={() => setIsAddStageModalOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {isMobile ? "Etapa" : "Nova Etapa"}
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05, translateY: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button
                    className="bg-primary hover:bg-primary/90 text-white h-11 px-6 rounded-2xl shadow-[0_0_20px_rgba(104,41,192,0.3)] transition-all"
                    onClick={() => setIsNewLeadModalOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {isMobile ? "Lead" : "Novo Lead"}
                  </Button>
                </motion.div>
              </div>
            </div>

          <Card
            className="liquid-glass border-white/[0.05] px-4 py-3 sm:px-6 shadow-2xl"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <span className="text-white/60 font-semibold text-xs sm:text-sm uppercase tracking-wider">Filtros:</span>
              <div className="flex flex-wrap gap-2">
                <motion.div
                  whileHover={{ scale: 1.05, translateY: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-9 px-4 rounded-xl text-xs sm:text-sm transition-all duration-300 border-white/5 ${activeFilter === "all"
                      ? "bg-primary text-white border-primary shadow-[0_0_15px_rgba(104,41,192,0.4)] hover:bg-primary hover:text-white"
                      : "bg-white/[0.03] text-white/60 hover:bg-white/[0.03] hover:text-white/60"
                      }`}
                    onClick={() => setActiveFilter("all")}
                  >
                    Todos os grupos
                  </Button>
                </motion.div>

                {tags.map((tag: Tag) => (
                  <motion.div
                    key={tag.id}
                    whileHover={{ scale: 1.05, translateY: -2 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-9 px-4 rounded-xl text-xs sm:text-sm transition-all duration-300 border-white/5 ${activeFilter === tag.name
                        ? "bg-primary text-white border-primary shadow-[0_0_15px_rgba(104,41,192,0.4)] hover:bg-primary hover:text-white"
                        : "bg-white/[0.03] text-white/60 hover:bg-white/[0.03] hover:text-white/60"
                        }`}
                      onClick={() => setActiveFilter(tag.name)}
                    >
                      <div className={`w-2 h-2 rounded-full ${tag.color} mr-2`} />
                      {tag.name}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="pt-44 pb-6">
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
            className="flex gap-3 sm:gap-6 min-h-[520px] sm:min-h-[620px] overflow-x-auto overflow-y-hidden select-none cursor-grab active:cursor-grabbing"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
            onPointerDown={onPointerDownPan}
            onPointerMove={onPointerMovePan}
            onPointerUp={onPointerUpPan}
            onPointerCancel={onPointerCancelPan}
          >

            {stages.map((stage: Stage) => {
              const stageLeads = getLeadsByStage(stage.id);
              const filteredLeads = getFilteredLeads(stageLeads);

              return (
                <div
                  key={stage.id}
                  className={`flex-shrink-0 space-y-3 sm:space-y-4 ${isMobile ? "w-72" : "w-80"
                    }`}
                >
                  <div className="flex items-center justify-between gap-2 pt-8 pb-4 px-3 min-h-[5rem] rounded-t-lg">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${stage.color}`} />
                      <h3 className="font-bold text-white text-base sm:text-lg leading-tight whitespace-nowrap">
                        {stage.name}
                      </h3>
                      <Badge className="bg-goat-gray-600 text-white text-xs hover:bg-goat-purple/80">
                        {filteredLeads.length}
                      </Badge>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-goat-gray-400 hover:bg-goat-purple/80 hover:text-white w-7 h-7 sm:w-8 sm:h-8"
                      onClick={() => handleEditStage(stage)}
                      data-no-pan
                    >
                      <EllipsisVertical className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                  </div>

                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-4 min-h-[300px] sm:min-h-[400px] p-2 rounded-2xl transition-colors ${snapshot.isDraggingOver ? "bg-white/[0.02]" : ""
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
                                      className={`liquid-glass border-white/[0.05] p-3 sm:p-5 rounded-2xl dashboard-glow relative group ${snapshot.isDragging
                                        ? "border-primary/50 shadow-2xl scale-[1.02]"
                                        : ""
                                        }`}
                                    >
                                      <div className="space-y-2 sm:space-y-3">
                                        <div className="flex items-center gap-2">
                                          <div
                                            {...provided.dragHandleProps}
                                            data-dnd-handle
                                            // ✅ garante que o browser não tente “interpretar gesto” e travar eixo
                                            style={{ touchAction: "none" }}
                                            className="touch-none h-7 w-7 sm:h-8 sm:w-8 grid place-items-center rounded-md text-goat-gray-400 hover:bg-goat-gray-700/60 hover:text-white transition-colors cursor-grab active:cursor-grabbing flex-shrink-0"
                                            title="Arrastar"
                                          >
                                            <GripVertical className="w-4 h-4" />
                                          </div>

                                          <div className="flex-1 min-w-0 pt-1.5">
                                            <h4 className="font-semibold text-white text-sm truncate">
                                              {lead.name}
                                            </h4>
                                            <p className="text-goat-gray-400 text-xs truncate">
                                              {lead.company}
                                            </p>
                                          </div>

                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-goat-gray-400 hover:bg-goat-purple/80 hover:text-white h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
                                            onClick={() => handleEditLead(lead)}
                                            data-no-pan
                                          >
                                            <EllipsisVertical className="w-4 h-4" />
                                          </Button>
                                        </div>

                                        {lead.tags && lead.tags.length > 0 && (
                                          <Badge
                                            className={`text-xs text-white truncate max-w-full ${tagColorClass(
                                              lead.tags[0]
                                            )} hover:opacity-90`}
                                          >
                                            {lead.tags[0]}
                                          </Badge>
                                        )}

                                        {lead.value != null && (
                                          <div className="text-goat-purple font-semibold text-xs sm:text-sm">
                                            R$ {lead.value.toLocaleString("pt-BR")}
                                          </div>
                                        )}

                                        <div className="flex items-center justify-between text-xs pt-2 border-t border-goat-gray-700 mt-2">
                                          <span className="text-goat-gray-500 flex-shrink-0">
                                            Atualizado: {isMobile
                                              ? new Date(lead.updated_at).toLocaleDateString(
                                                "pt-BR",
                                                { day: "2-digit", month: "2-digit" }
                                              )
                                              : new Date(lead.updated_at).toLocaleDateString("pt-BR")}
                                          </span>
                                          {lead.meeting_date ? (
                                            <span className="text-goat-purple font-semibold uppercase truncate ml-2">
                                              Reunião: {new Date(lead.meeting_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                            </span>
                                          ) : (
                                            <span></span>
                                          )}
                                        </div>
                                      </div>
                                    </Card>
                                  </ContextMenuTrigger>

                                  <ContextMenuContent className="liquid-glass border-white/[0.05]">
                                    <ContextMenuItem
                                      onClick={() => handleEditLead(lead)}
                                      className="text-white data-[highlighted]:bg-goat-purple/80 data-[highlighted]:text-white"
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
                          <div className="border-2 border-dashed border-white/[0.05] rounded-2xl p-4 sm:p-6 text-center">
                            <p className="text-goat-gray-400 text-xs sm:text-sm">
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
    </div >
  );
}
