import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, X, Send, Users, MessageSquare, Phone,
  CheckCircle2, AlertCircle, Ban, Loader2, ChevronDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { cn } from "@/lib/utils";
import { usePageReady } from "@/hooks/usePageReady";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  useScheduledMessages,
  type RecipientType,
  type MessageStatus,
  type ScheduledMessage,
} from "@/hooks/useScheduledMessages";
import { useClients } from "@/hooks/useClients";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPhoneBR(phone: string): string {
  const c = phone.replace(/\D/g, "");
  if (c.startsWith("55") && c.length === 13) return `+${c}`;
  if (c.length === 11) return `+55${c}`;
  if (c.length === 10) return `+55${c}`;
  return phone;
}

function brtToUtc(dateStr: string, timeStr: string): string {
  // Combina data+hora em BRT (UTC-3) → converte para UTC ISO
  const brt = new Date(`${dateStr}T${timeStr}:00-03:00`);
  return brt.toISOString();
}

function formatDateTimeBRT(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_CONFIG: Record<MessageStatus, { label: string; icon: React.ElementType; className: string }> = {
  pending:   { label: "Agendada",  icon: Clock,         className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  sent:      { label: "Enviada",   icon: CheckCircle2,  className: "bg-green-500/15 text-green-400 border-green-500/20" },
  failed:    { label: "Falhou",    icon: AlertCircle,   className: "bg-red-500/15 text-red-400 border-red-500/20" },
  cancelled: { label: "Cancelada", icon: Ban,           className: "bg-white/10 text-white/40 border-white/10" },
};

const RECIPIENT_LABELS: Record<RecipientType, string> = {
  responsible: "Responsável",
  group:       "Grupo",
  custom:      "Número avulso",
};

const FILTER_TABS: { value: MessageStatus | "all"; label: string }[] = [
  { value: "all",       label: "Todas" },
  { value: "pending",   label: "Agendadas" },
  { value: "sent",      label: "Enviadas" },
  { value: "failed",    label: "Falhou" },
  { value: "cancelled", label: "Canceladas" },
];

// ── Modal ─────────────────────────────────────────────────────────────────────

interface NewMessageModalProps {
  onClose: () => void;
  onCreate: (payload: {
    client_id?: string; client_name?: string;
    recipient_type: RecipientType; phone: string;
    message: string; scheduled_at: string;
  }) => void;
  isCreating: boolean;
  clients: Array<{ id: string; company: string; phone: string | null; group_id: string | null; responsible: string | null }>;
}

function NewMessageModal({ onClose, onCreate, isCreating, clients }: NewMessageModalProps) {
  const [clientId, setClientId]           = useState("");
  const [recipientType, setRecipientType] = useState<RecipientType>("responsible");
  const [customPhone, setCustomPhone]     = useState("");
  const [message, setMessage]             = useState("");
  const [schedDate, setSchedDate]         = useState("");
  const [schedTime, setSchedTime]         = useState("");
  const [clientSearch, setClientSearch]   = useState("");
  const [showClientList, setShowClientList] = useState(false);

  const selectedClient = clients.find(c => c.id === clientId);

  const resolvedPhone = useMemo(() => {
    if (recipientType === "responsible") return selectedClient?.phone ?? "";
    if (recipientType === "group")       return selectedClient?.group_id ?? "";
    return customPhone;
  }, [recipientType, selectedClient, customPhone]);

  const filteredClients = clients.filter(c =>
    c.company.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const canSubmit = resolvedPhone && message && schedDate && schedTime &&
    (recipientType !== "custom" || customPhone);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const phone = recipientType === "custom" ? formatPhoneBR(customPhone) : resolvedPhone;
    onCreate({
      client_id:     clientId || undefined,
      client_name:   selectedClient?.company || undefined,
      recipient_type: recipientType,
      phone,
      message,
      scheduled_at: brtToUtc(schedDate, schedTime),
    });
    onClose();
  };

  const today = new Date().toISOString().split("T")[0];

  const modal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(20px) saturate(180%)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <LiquidGlass className="border-white/10 rounded-2xl">
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Agendar Mensagem</h3>
              <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cliente (opcional) */}
            <div className="space-y-1.5 relative">
              <label className="text-white/60 text-xs font-medium">Cliente <span className="text-white/30">(opcional)</span></label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowClientList(v => !v)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-left text-sm flex items-center justify-between"
                >
                  <span className={selectedClient ? "text-white" : "text-white/30"}>
                    {selectedClient?.company ?? "Selecionar cliente..."}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-white/30" />
                </button>
                {showClientList && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                    <div className="p-2 border-b border-white/5">
                      <input
                        autoFocus
                        value={clientSearch}
                        onChange={e => setClientSearch(e.target.value)}
                        placeholder="Buscar cliente..."
                        className="w-full bg-white/5 px-3 py-1.5 rounded-lg text-sm text-white placeholder-white/30 outline-none"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => { setClientId(""); setShowClientList(false); setClientSearch(""); }}
                        className="w-full px-3 py-2 text-left text-sm text-white/40 hover:bg-white/5"
                      >
                        Nenhum
                      </button>
                      {filteredClients.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setClientId(c.id); setShowClientList(false); setClientSearch(""); }}
                          className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/5"
                        >
                          {c.company}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Destinatário */}
            <div className="space-y-1.5">
              <label className="text-white/60 text-xs font-medium">Enviar para</label>
              <div className="grid grid-cols-3 gap-2">
                {(["responsible", "group", "custom"] as RecipientType[]).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setRecipientType(type)}
                    className={cn(
                      "py-2 px-3 rounded-xl text-xs font-medium border transition-all",
                      recipientType === type
                        ? "bg-primary/20 border-primary/40 text-primary"
                        : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06]"
                    )}
                  >
                    {type === "responsible" && <><Phone className="w-3 h-3 inline mr-1" />Responsável</>}
                    {type === "group"       && <><Users className="w-3 h-3 inline mr-1" />Grupo</>}
                    {type === "custom"      && <><MessageSquare className="w-3 h-3 inline mr-1" />Avulso</>}
                  </button>
                ))}
              </div>

              {/* Número resolvido ou input custom */}
              {recipientType === "custom" ? (
                <input
                  type="tel"
                  value={customPhone}
                  onChange={e => setCustomPhone(e.target.value)}
                  placeholder="Ex: 65981099630"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-white/30 outline-none focus:border-primary/40"
                />
              ) : (
                <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-sm">
                  {resolvedPhone
                    ? <span className="text-white/70">{resolvedPhone}</span>
                    : <span className="text-white/25">
                        {recipientType === "responsible"
                          ? "Selecione um cliente para ver o número"
                          : "Selecione um cliente para ver o grupo"}
                      </span>
                  }
                </div>
              )}
            </div>

            {/* Mensagem */}
            <div className="space-y-1.5">
              <label className="text-white/60 text-xs font-medium">Mensagem</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                placeholder="Digite a mensagem que será enviada..."
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-white/30 outline-none focus:border-primary/40 resize-none"
              />
              <p className="text-white/25 text-xs text-right">{message.length} caracteres</p>
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-white/60 text-xs font-medium">Data (BRT)</label>
                <input
                  type="date"
                  min={today}
                  value={schedDate}
                  onChange={e => setSchedDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-primary/40"
                  style={{ colorScheme: "dark" }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-white/60 text-xs font-medium">Hora (BRT)</label>
                <input
                  type="time"
                  value={schedTime}
                  onChange={e => setSchedTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-primary/40"
                  style={{ colorScheme: "dark" }}
                />
              </div>
            </div>

            {/* Ações */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="ghost"
                onClick={onClose}
                className="flex-1 h-10 text-white/50 hover:text-white border border-white/[0.06] hover:bg-white/5 rounded-xl text-sm"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isCreating}
                className="flex-1 h-10 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold shadow-[0_0_15px_rgba(104,41,192,0.3)]"
              >
                {isCreating
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Send className="w-4 h-4 mr-1.5" />Agendar</>}
              </Button>
            </div>
          </div>
        </LiquidGlass>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}

// ── Row ───────────────────────────────────────────────────────────────────────

function MessageRow({ msg, index, onCancel, isCancelling }: {
  msg: ScheduledMessage;
  index: number;
  onCancel: (id: string) => void;
  isCancelling: boolean;
}) {
  const cfg = STATUS_CONFIG[msg.status];
  const StatusIcon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-start gap-4 p-5 rounded-2xl liquid-glass border border-white/5 hover:bg-white/[0.03] transition-all"
    >
      {/* Ícone de status */}
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border", cfg.className)}>
        <StatusIcon className="w-4 h-4" />
      </div>

      {/* Info principal */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-semibold text-sm">
            {msg.client_name ?? "Sem cliente"}
          </span>
          <span className="text-white/30 text-xs">•</span>
          <span className="text-white/50 text-xs">{RECIPIENT_LABELS[msg.recipient_type]}: {msg.phone}</span>
        </div>
        <p className="text-white/50 text-sm line-clamp-2 leading-relaxed">{msg.message}</p>
        {msg.error_message && (
          <p className="text-red-400/70 text-xs mt-1">Erro: {msg.error_message}</p>
        )}
      </div>

      {/* Data e status */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", cfg.className)}>
          {cfg.label}
        </span>
        <span className="text-white/35 text-xs whitespace-nowrap">
          {formatDateTimeBRT(msg.status === "sent" && msg.sent_at ? msg.sent_at : msg.scheduled_at)}
        </span>
        {msg.status === "pending" && (
          <button
            onClick={() => onCancel(msg.id)}
            disabled={isCancelling}
            className="text-white/25 hover:text-red-400 text-xs transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function ScheduledMessages() {
  const { messages, isLoading, createMessage, isCreating, cancelMessage, isCancelling } = useScheduledMessages();
  const { clients } = useClients();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter]           = useState<MessageStatus | "all">("all");

  const isReady = usePageReady(isLoading);
  if (!isReady) return <PageLoader />;

  const filtered = filter === "all" ? messages : messages.filter(m => m.status === filter);

  const counts = {
    all:       messages.length,
    pending:   messages.filter(m => m.status === "pending").length,
    sent:      messages.filter(m => m.status === "sent").length,
    failed:    messages.filter(m => m.status === "failed").length,
    cancelled: messages.filter(m => m.status === "cancelled").length,
  };

  const clientsForModal = (clients ?? []).map((c: any) => ({
    id:          c.id,
    company:     c.company,
    phone:       c.phone ?? null,
    group_id:    c.group_id ?? null,
    responsible: c.responsible ?? null,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/30 text-sm">
          <Clock className="w-4 h-4" />
          <span>{counts.pending} agendada{counts.pending !== 1 ? "s" : ""}</span>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="h-10 px-5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold shadow-[0_0_20px_rgba(104,41,192,0.3)]"
        >
          Agendar Mensagem
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              "px-4 py-1.5 rounded-xl text-xs font-medium border transition-all",
              filter === tab.value
                ? "bg-primary/20 border-primary/40 text-primary"
                : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06] hover:text-white/70"
            )}
          >
            {tab.label}
            {counts[tab.value] > 0 && (
              <span className="ml-1.5 opacity-60">{counts[tab.value]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      <Card className="liquid-glass border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Mensagens</h3>
            <p className="text-white/30 text-sm mt-0.5">{filtered.length} mensagem{filtered.length !== 1 ? "ns" : ""}</p>
          </div>
        </div>

        <div className="p-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                <Clock className="w-6 h-6 text-white/20" />
              </div>
              <p className="text-white/30 text-sm">
                {filter === "all" ? "Nenhuma mensagem agendada ainda" : `Nenhuma mensagem ${STATUS_CONFIG[filter as MessageStatus]?.label.toLowerCase()}`}
              </p>
              {filter === "all" && (
                <Button
                  variant="ghost"
                  onClick={() => setIsModalOpen(true)}
                  className="text-primary hover:text-primary/80 text-sm"
                >
                  Agendar primeira mensagem
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((msg, i) => (
                <MessageRow
                  key={msg.id}
                  msg={msg}
                  index={i}
                  onCancel={cancelMessage}
                  isCancelling={isCancelling}
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <NewMessageModal
            onClose={() => setIsModalOpen(false)}
            onCreate={createMessage}
            isCreating={isCreating}
            clients={clientsForModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
