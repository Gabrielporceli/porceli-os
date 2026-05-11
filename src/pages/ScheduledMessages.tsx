import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Send, Users, MessageSquare, Phone,
  CheckCircle2, AlertCircle, Ban, Loader2, ChevronDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { format } from "date-fns";
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

  const selectedClient = clients.find(c => c.id === clientId);

  const resolvedPhone = useMemo(() => {
    if (recipientType === "responsible") return selectedClient?.phone ?? "";
    if (recipientType === "group")       return selectedClient?.group_id ?? "";
    return customPhone;
  }, [recipientType, selectedClient, customPhone]);

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

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-white/[0.05] shadow-2xl text-white w-full max-w-lg !p-0 !gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.05] shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white tracking-tight">Agendar Mensagem</DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          {/* Cliente (opcional) */}
          <div className="space-y-2">
            <Label className="text-white/70 text-xs font-bold uppercase tracking-widest ml-1">Cliente <span className="text-white/30 lowercase">(opcional)</span></Label>
            <Select 
              value={clientId || "none"} 
              onValueChange={(value) => {
                setClientId(value === "none" ? "" : value);
              }}
            >
              <SelectTrigger className="bg-white/[0.03] border-white/[0.05] h-11 rounded-xl text-white/70 font-medium">
                <SelectValue placeholder="Selecionar Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="cursor-pointer text-white/50">Nenhum</SelectItem>
                {clients.map((c) => (
                  <SelectItem
                    key={c.id}
                    value={c.id}
                    className="cursor-pointer"
                  >
                    {c.company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Data</label>
                <DatePicker 
                  date={schedDate ? new Date(schedDate + 'T12:00:00') : undefined}
                  setDate={(date) => setSchedDate(date ? format(date, "yyyy-MM-dd") : "")}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Horário</label>
                <TimePicker 
                  value={schedTime}
                  onChange={setSchedTime}
                />
              </div>
            </div>

            {/* Ações */}
            <div className="flex gap-4 pt-2 mt-2">
              <Button
                type="button"
                onClick={onClose}
                className="liquid-glass hover:bg-white/10 text-white/70 border-white/5 flex-1 h-12 rounded-2xl font-bold transition-all text-sm uppercase tracking-widest"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isCreating}
                className="bg-primary hover:bg-primary/90 text-white flex-1 h-12 rounded-2xl shadow-[0_0_20px_rgba(104,41,192,0.3)] font-bold transition-all text-sm uppercase tracking-widest"
              >
                {isCreating
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Send className="w-4 h-4 mr-1.5" />Agendar</>}
              </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
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
  const { data: clients = [] } = useClients();
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
      </div>

      {/* Filtros e Ação */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
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
        <Button
          onClick={() => setIsModalOpen(true)}
          className="h-10 px-5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold shadow-[0_0_20px_rgba(104,41,192,0.3)]"
        >
          Agendar Mensagem
        </Button>
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
