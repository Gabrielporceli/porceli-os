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
import { GripVertical } from 'lucide-react';
import { Add, Edit, More2, Trash } from 'iconsax-react';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import { EditLeadModal } from "@/components/Leads/EditLeadModal";
import { AddStageModal } from "@/components/Leads/AddStageModal";
import { NewLeadModal } from "@/components/Leads/NewLeadModal";
import { EditStageModal } from "@/components/Leads/EditStageModal";
import { DeleteLeadDialog } from "@/components/Leads/DeleteLeadDialog";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { DeconstructedCard } from "@/components/ui/deconstructed-card";

import { useIsMobile } from "@/hooks/use-mobile";
import { useLeads, type Lead } from "@/hooks/useLeads";
import { useStages, type Stage } from "@/hooks/useStages";
import { useToast } from "@/hooks/use-toast";
import { NOISE_LAYER_URL } from "@/lib/appBackground";

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
      // 3 camadas agora (grao, escurecimento, imagem) — ver appBackground.ts
      node.style.backgroundSize = `200px 200px, 100% 100%, ${w}px ${h}px`;
      node.style.backgroundPosition = `0 0, 0 0, ${x}px ${y}px`;
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
          `url("${NOISE_LAYER_URL}"), linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.25)), url("/app-bg.webp")`,
        backgroundRepeat: "repeat, no-repeat, no-repeat",
        backgroundBlendMode: "overlay, normal, normal",
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

  const {
    stages,
    isLoading: stagesLoading,
    createStage,
    updateStage,
    deleteStage,
  } = useStages();

  const isReady = usePageReady(leadsLoading || stagesLoading);

  // ===== Modais / Seleções =====
  const [isEditLeadModalOpen, setIsEditLeadModalOpen] = useState(false);
  const [isAddStageModalOpen, setIsAddStageModalOpen] = useState(false);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isEditStageModalOpen, setIsEditStageModalOpen] = useState(false);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [isDeleteLeadDialogOpen, setIsDeleteLeadDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

  // ===== Otimista =====
  const [optimisticLeads, setOptimisticLeads] = useState<Lead[]>([]);
  const isDraggingRef = useRef(false);
  useEffect(() => {
    if (leads && !isDraggingRef.current) setOptimisticLeads(leads);
  }, [leads]);

  // ===== DnD state =====
  const [isDraggingCard, setIsDraggingCard] = useState(false);

  // ===== Drag livre em diagonal =====
  // O @hello-pangea/dnd (fork mantido do react-beautiful-dnd) trava de
  // propósito o card no eixo da lista durante o arraste — dentro de uma
  // coluna (vertical) ele só translada em Y, ignorando qualquer X do mouse,
  // mesmo arrastando na diagonal. É comportamento documentado da lib, não
  // bug: pensado pra reordenação previsível, não pra seguir o cursor.
  // Sobrescrevemos só o `transform` visual do card ativo com a posição real
  // do ponteiro (via DOM direto, sem re-render — atualizar isso via state
  // re-renderizaria a coluna inteira a cada pointermove). A detecção de
  // coluna/índice de destino da lib não é afetada: ela decide com base na
  // posição real do ponteiro (capturada pelo próprio sensor dela), igual ao
  // que usamos aqui — não em transforms CSS.
  const currentPointerRef = useRef({ x: 0, y: 0 });
  const dragStartPointerRef = useRef<{ x: number; y: number } | null>(null);
  const freeDragElRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      currentPointerRef.current = { x: e.clientX, y: e.clientY };
      const start = dragStartPointerRef.current;
      const el = freeDragElRef.current;
      if (start && el) {
        el.style.transform = `translate(${e.clientX - start.x}px, ${e.clientY - start.y}px)`;
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

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
  const getLeadsByStage = (stageId: string) =>
    optimisticLeads.filter((l) => l.stage === stageId);

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
    isDraggingRef.current = true;
    setIsDraggingCard(true);
    dragStartPointerRef.current = { ...currentPointerRef.current };
  };

  const onDragEnd = async (result: DropResult) => {
    isDraggingRef.current = false;
    setIsDraggingCard(false);
    dragStartPointerRef.current = null;
    if (freeDragElRef.current) freeDragElRef.current.style.transform = "";
    freeDragElRef.current = null;

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
        className="flex flex-row flex-wrap items-center justify-end gap-3 mb-8"
        style={{ pointerEvents: isDraggingCard ? "none" : "auto" }}
      >
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

      <div className="pb-6 kanban-breakout-left">
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
            className="flex gap-3 sm:gap-4 min-h-[520px] sm:min-h-[620px] overflow-x-auto overflow-y-hidden select-none cursor-grab active:cursor-grabbing pl-3 sm:pl-4 pr-3 sm:pr-4 pb-2"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
              maskImage: "linear-gradient(to right, transparent, black 8px, black calc(100% - 8px), transparent)",
              WebkitMaskImage: "linear-gradient(to right, transparent, black 8px, black calc(100% - 8px), transparent)",
            }}
            onPointerDown={onPointerDownPan}
            onPointerMove={onPointerMovePan}
            onPointerUp={onPointerUpPan}
            onPointerCancel={onPointerCancelPan}
          >
            {stages.map((stage: Stage) => {
              const filteredLeads = getLeadsByStage(stage.id);
              const count = filteredLeads.length;

              return (
                <div
                  key={stage.id}
                  className={cn(
                    "flex-shrink-0 flex flex-col rounded-3xl overflow-hidden bg-[#2f2d2e] ring-1 ring-white/[0.05]",
                    isMobile ? "w-72" : "w-[300px]"
                  )}
                >
                  {/* Cabeçalho da coluna */}
                  <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/[0.06] shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`w-2 h-2 rounded-full ${stage.color} flex-shrink-0`} />
                      <h3 className="font-black text-white text-xs uppercase tracking-[0.15em] truncate">
                        {stage.name}
                      </h3>
                      <span className="text-[10px] font-black text-white/30 leading-none flex-shrink-0">
                        {count}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white/30 hover:bg-white/10 hover:text-white w-7 h-7 rounded-lg shrink-0"
                      onClick={() => handleEditStage(stage)}
                      data-no-pan
                    >
                      <More2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Lista de leads droppável */}
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 p-3 space-y-3 min-h-[300px] sm:min-h-[400px] transition-colors",
                          snapshot.isDraggingOver && "bg-primary/[0.05]"
                        )}
                      >
                        {filteredLeads.map((lead, index) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={(el) => {
                                  provided.innerRef(el);
                                  if (snapshot.isDragging) freeDragElRef.current = el;
                                }}
                                {...provided.draggableProps}
                                style={provided.draggableProps.style}
                                className={snapshot.isDragging ? "scale-[1.02] opacity-90" : ""}
                              >
                                <ContextMenu>
                                  <ContextMenuTrigger asChild>
                                    <div
                                      className={cn(
                                        "transition-all duration-200 hover:-translate-y-0.5",
                                        snapshot.isDragging && "ring-2 ring-primary/40 rounded-[20px]"
                                      )}
                                    >
                                      <DeconstructedCard
                                        className="dc-kanban-card"
                                        chip={
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <div
                                              {...provided.dragHandleProps}
                                              data-dnd-handle
                                              style={{ touchAction: "none" }}
                                              className="shrink-0 touch-none text-white/25 hover:text-white/70 transition-colors cursor-grab active:cursor-grabbing"
                                            >
                                              <GripVertical className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider truncate">
                                              {lead.company || lead.phone}
                                            </span>
                                          </div>
                                        }
                                        circle={
                                          <button
                                            className="flex h-full w-full items-center justify-center rounded-full surface-modal transition-transform hover:scale-105 active:scale-95"
                                            data-no-pan
                                            onPointerDown={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              handleEditLead(lead);
                                            }}
                                          >
                                            <More2 className="h-4 w-4 text-white/70" />
                                          </button>
                                        }
                                      >
                                        <div
                                          className="px-4 py-2.5 space-y-1.5 cursor-pointer"
                                          onClick={() => handleEditLead(lead)}
                                        >
                                          <h4 className="font-bold text-white text-sm tracking-tight leading-snug">
                                            {lead.name}
                                          </h4>

                                          {lead.value != null && (
                                            <p className="text-primary font-bold text-xs tabular-nums">
                                              R$ {lead.value.toLocaleString("pt-BR")}
                                            </p>
                                          )}

                                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/20 flex-shrink-0">
                                              {new Date(lead.updated_at).toLocaleDateString("pt-BR", {
                                                day: "2-digit", month: "2-digit"
                                              })}
                                            </span>
                                            {lead.meeting_date && !lead.reuniao_realizada && (
                                              <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                                                {new Date(lead.meeting_date).toLocaleString('pt-BR', {
                                                  day: '2-digit', month: '2-digit',
                                                  hour: '2-digit', minute: '2-digit'
                                                })}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </DeconstructedCard>
                                    </div>
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
                                      <Trash className="w-4 h-4 mr-2" />
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
                          <div className="border-2 border-dashed border-white/[0.08] rounded-2xl p-6 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                              Arraste leads para cá
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
        <EditLeadModal
          open={isEditLeadModalOpen}
          onOpenChange={setIsEditLeadModalOpen}
          lead={selectedLead}
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
