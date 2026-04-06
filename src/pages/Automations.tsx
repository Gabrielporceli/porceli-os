import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, CalendarDays, Bell, DollarSign, Trash2, Play, Clock, Edit2,
  X, Save, ChevronRight, CheckCircle2, AlertCircle, Loader2, Plus
} from "lucide-react";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
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
const CATEGORY_COLORS: Record<string, { bg: string; border: string; badge: string; icon: string }> = {
  financeiro: {
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.2)',
    badge: 'bg-green-500/15 text-green-400 border-green-500/20',
    icon: 'text-green-400',
  },
  atividades: {
    bg: 'rgba(104,41,192,0.12)',
    border: 'rgba(104,41,192,0.25)',
    badge: 'bg-primary/15 text-primary border-primary/20',
    icon: 'text-primary',
  },
  sistema: {
    bg: 'rgba(148,163,184,0.06)',
    border: 'rgba(148,163,184,0.15)',
    badge: 'bg-white/10 text-white/50 border-white/10',
    icon: 'text-white/40',
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

// Modal de edição de automação
function EditModal({
  automation,
  onClose,
}: {
  automation: Automation;
  onClose: () => void;
}) {
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.icon}`}
                  style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">{automation.display_name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${colors.badge}`}>
                    {CATEGORY_LABELS[automation.category] ?? automation.category}
                  </span>
                </div>
              </div>
              <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Descrição */}
            <p className="text-white/50 text-sm leading-relaxed">{automation.description}</p>

            {/* Horário */}
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

            {/* Ações */}
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
                {updateSchedule.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><Save className="w-4 h-4 mr-1.5" /> Salvar</>
                )}
              </Button>
            </div>
          </div>
        </LiquidGlass>
      </motion.div>
    </motion.div>
  );
}

// Card de automação
function AutomationCard({ automation }: { automation: Automation }) {
  const [editing, setEditing] = useState(false);
  const toggle = useToggleAutomation();
  const trigger = useTriggerAutomation();
  const Icon = ICONS[automation.icon] ?? Zap;
  const colors = CATEGORY_COLORS[automation.category] ?? CATEGORY_COLORS.sistema;
  const isRunning = trigger.isPending && trigger.variables === automation.id;

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        <LiquidGlass
          className="border-white/[0.06] rounded-2xl transition-all duration-300"
          style={{
            borderColor: automation.enabled ? colors.border : 'rgba(255,255,255,0.04)',
            opacity: automation.enabled ? 1 : 0.65,
          }}
        >
          <div className="p-5">
            <div className="flex items-start gap-4">
              {/* Ícone */}
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${colors.icon}`}
                style={{ background: automation.enabled ? colors.bg : 'rgba(255,255,255,0.04)', border: `1px solid ${automation.enabled ? colors.border : 'rgba(255,255,255,0.06)'}` }}
              >
                <Icon className="w-5 h-5" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-semibold text-sm truncate">{automation.display_name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 ${colors.badge}`}>
                    {CATEGORY_LABELS[automation.category] ?? automation.category}
                  </span>
                </div>
                <p className="text-white/40 text-xs leading-relaxed line-clamp-2 mb-3">
                  {automation.description}
                </p>

                {/* Meta */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-white/25 flex-shrink-0" />
                    <span className="text-white/40 text-xs">{automation.schedule_human}</span>
                  </div>
                  {automation.last_triggered_at && (
                    <>
                      <span className="text-white/10">·</span>
                      <div className="flex items-center gap-1.5">
                        {automation.enabled
                          ? <CheckCircle2 className="w-3 h-3 text-green-400/70 flex-shrink-0" />
                          : <AlertCircle className="w-3 h-3 text-white/20 flex-shrink-0" />
                        }
                        <span className="text-white/30 text-xs">{formatLastRun(automation.last_triggered_at)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Controles */}
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                {/* Editar */}
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setEditing(true)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all"
                  title="Editar"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </motion.button>

                {/* Executar agora */}
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => trigger.mutate(automation.id)}
                  disabled={isRunning}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-green-400 hover:bg-green-400/[0.08] transition-all disabled:opacity-50"
                  title="Executar agora"
                >
                  {isRunning
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Play className="w-3.5 h-3.5" />
                  }
                </motion.button>

                {/* Toggle */}
                <Switch
                  checked={automation.enabled}
                  onCheckedChange={(checked) => toggle.mutate({ id: automation.id, enabled: checked })}
                  disabled={toggle.isPending}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>
          </div>
        </LiquidGlass>
      </motion.div>

      <AnimatePresence>
        {editing && <EditModal automation={automation} onClose={() => setEditing(false)} />}
      </AnimatePresence>
    </>
  );
}

export default function Automations() {
  const { data: automations = [], isLoading } = useAutomations();

  const grouped = automations.reduce<Record<string, Automation[]>>((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {});

  const categoryOrder = ['financeiro', 'atividades', 'sistema'];

  const enabledCount = automations.filter((a) => a.enabled).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Zap className="w-6 h-6 text-primary" />
            Automações
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Gerencie e monitore todas as automações do sistema
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status geral */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <div className={`w-2 h-2 rounded-full ${enabledCount > 0 ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
            <span className="text-white/50 text-xs">{enabledCount} ativa{enabledCount !== 1 ? 's' : ''}</span>
          </div>

          {/* Botão nova automação (placeholder) */}
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              disabled
              className="h-9 px-4 text-xs font-semibold bg-primary/20 text-primary/60 border border-primary/20 rounded-xl cursor-not-allowed"
              title="Em breve"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Nova automação
            </Button>
          </motion.div>
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
        <div className="space-y-8">
          {categoryOrder
            .filter((cat) => grouped[cat]?.length > 0)
            .map((category) => (
              <div key={category} className="space-y-3">
                {/* Título da categoria */}
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${CATEGORY_COLORS[category]?.icon ?? 'text-white/40'}`}>
                    {CATEGORY_LABELS[category] ?? category}
                  </span>
                  <div className="flex-1 h-px bg-white/[0.04]" />
                  <span className="text-white/20 text-xs">{grouped[category].length}</span>
                </div>

                {/* Cards */}
                <div className="grid gap-3">
                  {grouped[category].map((automation) => (
                    <AutomationCard key={automation.id} automation={automation} />
                  ))}
                </div>
              </div>
            ))}

          {automations.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-white/[0.03] border border-white/[0.06] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white/15" />
              </div>
              <p className="text-white/30 text-sm">Nenhuma automação configurada.</p>
              <p className="text-white/20 text-xs mt-1">Execute a migration para carregar as automações padrão.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
