import { useState } from "react";
import { PageLoader } from "@/components/ui/PageLoader";
import { usePageReady } from "@/hooks/usePageReady";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, Bell, DollarSign, Trash2, Play, Clock, Edit2, Zap,
  X, Save, CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { cn } from "@/lib/utils";
import {
  useAutomations,
  useToggleAutomation,
  useUpdateAutomationSchedule,
  useTriggerAutomation,
  cronToBRTTime,
  brtTimeToCron,
  type Automation,
} from "@/hooks/useAutomations";

// Mapa de ícones
const ICONS: Record<string, React.ElementType> = {
  CalendarDays, Bell, DollarSign, Trash2, Zap, Play, Clock,
};

// Cores por categoria
const CATEGORY_COLORS: Record<string, { bg: string; border: string; badge: string; icon: string; dot: string }> = {
  financeiro: {
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.2)',
    badge: 'bg-green-500/15 text-green-400 border-green-500/20',
    icon: 'text-green-400',
    dot: 'bg-green-400',
  },
  atividades: {
    bg: 'rgba(104,41,192,0.12)',
    border: 'rgba(104,41,192,0.25)',
    badge: 'bg-primary/15 text-primary border-primary/20',
    icon: 'text-primary',
    dot: 'bg-primary',
  },
  sistema: {
    bg: 'rgba(148,163,184,0.06)',
    border: 'rgba(148,163,184,0.15)',
    badge: 'bg-white/10 text-white/50 border-white/10',
    icon: 'text-white/40',
    dot: 'bg-white/30',
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  financeiro: 'Financeiro',
  atividades: 'Atividades',
  sistema: 'Sistema',
};

function formatLastRun(dateStr: string | null): string {
  if (!dateStr) return 'Nunca executado';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 2) return 'Agora há pouco';
  if (mins < 60) return `Há ${mins} min`;
  if (hours < 24) return `Há ${hours}h`;
  return `Há ${days} dia${days > 1 ? 's' : ''}`;
}

// ─── Modal de edição ────────────────────────────────────────────────────────

function EditModal({ automation, onClose }: { automation: Automation; onClose: () => void }) {
  const isEveryMinute = automation.schedule === '* * * * *';
  const [time, setTime] = useState(isEveryMinute ? '00:00' : cronToBRTTime(automation.schedule));
  const updateSchedule = useUpdateAutomationSchedule();

  const handleSave = () => {
    if (isEveryMinute) { onClose(); return; }
    const newCron = brtTimeToCron(time);
    updateSchedule.mutate({ id: automation.id, schedule: newCron }, { onSuccess: onClose });
  };

  const Icon = ICONS[automation.icon] ?? Zap;
  const colors = CATEGORY_COLORS[automation.category] ?? CATEGORY_COLORS.sistema;

  const modal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md"
      >
        <LiquidGlass className="border-white/10 rounded-2xl">
          <div className="p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colors.icon)}
                  style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">{automation.display_name}</h3>
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full border', colors.badge)}>
                    {CATEGORY_LABELS[automation.category] ?? automation.category}
                  </span>
                </div>
              </div>
              <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-white/50 text-sm leading-relaxed">{automation.description}</p>

            <div className="space-y-2">
              <label className="text-white/60 text-xs font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Horário de execução (Horário de Brasília)
              </label>
              {isEveryMinute ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-white/60 text-sm">Executa automaticamente a cada minuto</span>
                </div>
              ) : (
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-primary/40 transition-colors"
                  style={{ colorScheme: 'dark' }}
                />
              )}
              {!isEveryMinute && (
                <p className="text-white/30 text-xs">
                  Armazenado como <code className="text-white/40">{brtTimeToCron(time)}</code> (UTC)
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="ghost"
                className="flex-1 h-10 text-white/50 hover:text-white border border-white/[0.06] hover:bg-white/5 rounded-xl text-sm"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 h-10 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold shadow-[0_0_15px_rgba(104,41,192,0.3)]"
                onClick={handleSave}
                disabled={updateSchedule.isPending || isEveryMinute}
              >
                {updateSchedule.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Save className="w-4 h-4 mr-1.5" /> Salvar</>
                }
              </Button>
            </div>
          </div>
        </LiquidGlass>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}

// ─── Linha de automação ──────────────────────────────────────────────────────

function AutomationRow({
  automation,
  index,
  onEdit,
}: {
  automation: Automation;
  index: number;
  onEdit: (a: Automation) => void;
}) {
  const toggle = useToggleAutomation();
  const trigger = useTriggerAutomation();
  const Icon = ICONS[automation.icon] ?? Zap;
  const colors = CATEGORY_COLORS[automation.category] ?? CATEGORY_COLORS.sistema;
  const isRunning = trigger.isPending && trigger.variables === automation.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        "flex items-center justify-between p-5 rounded-2xl liquid-glass border border-white/5 hover:bg-white/[0.04] transition-all group",
        !automation.enabled && "opacity-55"
      )}
    >
      {/* Ícone + Info */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div
          className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all", colors.icon)}
          style={{
            background: automation.enabled ? colors.bg : 'rgba(255,255,255,0.04)',
            border: `1px solid ${automation.enabled ? colors.border : 'rgba(255,255,255,0.06)'}`,
          }}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="text-white font-bold tracking-tight">{automation.display_name}</h4>
            <span className={cn("text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 font-medium", colors.badge)}>
              {CATEGORY_LABELS[automation.category] ?? automation.category}
            </span>
          </div>
          <p className="text-white/40 text-sm leading-relaxed line-clamp-1">
            {automation.description}
          </p>
        </div>
      </div>

      {/* Frequência */}
      <div className="hidden md:block text-center px-6 flex-shrink-0 w-52">
        <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-1">Frequência</p>
        <div className="flex items-center justify-center gap-1.5">
          <Clock className="w-3 h-3 text-white/25" />
          <p className="text-white/70 font-medium text-sm">{automation.schedule_human}</p>
        </div>
      </div>

      {/* Último disparo */}
      <div className="hidden lg:block text-center px-6 flex-shrink-0 w-44">
        <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-1">Último envio</p>
        <div className="flex items-center justify-center gap-1.5">
          {automation.enabled
            ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400/70" />
            : <AlertCircle className="w-3.5 h-3.5 text-white/20" />
          }
          <p className="text-white/60 font-medium text-sm">{formatLastRun(automation.last_triggered_at)}</p>
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 flex-shrink-0 pl-2">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => onEdit(automation)}
          title="Editar automação"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-all"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => trigger.mutate(automation.id)}
          disabled={isRunning}
          title="Executar agora"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white/30 hover:text-green-400 hover:bg-green-400/[0.08] border border-transparent hover:border-green-400/20 transition-all disabled:opacity-50"
        >
          {isRunning
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Play className="w-3.5 h-3.5" />
          }
        </motion.button>

        <Switch
          checked={automation.enabled}
          onCheckedChange={(checked) => toggle.mutate({ id: automation.id, enabled: checked })}
          disabled={toggle.isPending}
          className="data-[state=checked]:bg-primary"
        />
      </div>
    </motion.div>
  );
}

// ─── Página principal ───────────────────────────────────────────────────────

export default function Automations() {
  const { data: automations = [], isLoading } = useAutomations();
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);

  const isReady = usePageReady(isLoading);
  if (!isReady) return <PageLoader />;

  const grouped = automations.reduce<Record<string, Automation[]>>((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {});

  const categoryOrder = ['financeiro', 'atividades', 'sistema'];
  const enabledCount = automations.filter((a) => a.enabled).length;

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <div className={cn("w-2 h-2 rounded-full", enabledCount > 0 ? 'bg-green-400 animate-pulse' : 'bg-white/20')} />
          <span className="text-white/50 text-xs">{enabledCount} ativa{enabledCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-white/30 text-sm">Carregando automações...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {categoryOrder
            .filter((cat) => grouped[cat]?.length > 0)
            .map((category) => {
              const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.sistema;
              const items = grouped[category];

              return (
                <Card key={category} className="liquid-glass border-white/5 dashboard-glow overflow-hidden">
                  {/* Card header */}
                  <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">
                        {CATEGORY_LABELS[category] ?? category}
                      </h3>
                      <p className="text-white/30 text-sm mt-0.5">
                        {items.length} automação{items.length !== 1 ? 'ões' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", colors.dot)} />
                      <span className={cn("text-xs font-semibold uppercase tracking-wider", colors.icon)}>
                        {items.filter(a => a.enabled).length}/{items.length} ativas
                      </span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-6">
                    <div className="space-y-3">
                      {items.map((automation, i) => (
                        <AutomationRow
                          key={automation.id}
                          automation={automation}
                          index={i}
                          onEdit={setEditingAutomation}
                        />
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })}
        </div>
      )}

      {/* Modal renderizado via portal, fora de qualquer transform */}
      <AnimatePresence>
        {editingAutomation && (
          <EditModal
            automation={editingAutomation}
            onClose={() => setEditingAutomation(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
