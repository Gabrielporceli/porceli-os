
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, DollarSign, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  title: string;
  description: string;
  timestamp: string;
}

interface AlertCardProps {
  className?: string;
  limit?: number;
  alerts?: Alert[];
}

const getAlertIcon = (type: Alert['type']) => {
  switch (type) {
    case 'danger':
      return <DollarSign className="w-4 h-4" />;
    case 'warning':
      return <FileText className="w-4 h-4" />;
    case 'info':
      return <Clock className="w-4 h-4" />;
    default:
      return <AlertTriangle className="w-4 h-4" />;
  }
};

const getAlertColor = (type: Alert['type']) => {
  switch (type) {
    case 'danger':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'warning':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'info':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    default:
      return 'bg-white/5 text-white/40 border-white/10';
  }
};

export function AlertCard({ className, limit, alerts = [] }: AlertCardProps) {
  const alertsToShow = typeof limit === 'number' ? alerts.slice(0, limit) : alerts;
  return (
    <Card className={cn("premium-card p-6 h-full animate-premium-in", className)}>
      <div className="flex items-center gap-2 mb-6">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Alertas & Notificações</h3>
      </div>
      <div className="space-y-3 overflow-y-auto overflow-x-hidden pr-1">
        {alertsToShow.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 opacity-30">
            <AlertTriangle className="w-12 h-12 mb-2" />
            <p className="text-sm">Sem alertas no momento</p>
          </div>
        ) : (
          alertsToShow.map((alert) => (
            <div key={alert.id} className="flex items-start gap-4 p-3 rounded-xl liquid-glass border-white/[0.05] dashboard-glow transition-all duration-300 hover:bg-white/[0.02]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-white font-semibold text-sm truncate">{alert.title}</h4>
                  <span className="text-white/20 text-[10px] whitespace-nowrap">{alert.timestamp}</span>
                </div>
                <p className="text-white/40 text-xs mt-1 leading-relaxed line-clamp-2">{alert.description}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
