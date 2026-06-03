
import { Card } from "@/components/ui/card";
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

export function AlertCard({ className, limit, alerts = [] }: AlertCardProps) {
  const alertsToShow = typeof limit === 'number' ? alerts.slice(0, limit) : alerts;

  return (
    <Card className={cn("liquid-glass dashboard-glow border border-white/5 overflow-hidden h-full animate-premium-in shadow-2xl", className)}>
      <div className="p-6 border-b border-white/5">
        <h3 className="text-xl font-bold text-white tracking-tight">Alertas & Notificações</h3>
      </div>

      <div className="overflow-y-auto overflow-x-hidden max-h-[560px]">
        {alertsToShow.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 opacity-30">
            <AlertTriangle className="w-12 h-12 mb-2" />
            <p className="text-sm text-white">Sem alertas no momento</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {alertsToShow.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between gap-8 px-6 py-4 hover:bg-white/[0.04] transition-all duration-300 group"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-semibold text-sm">{alert.title}</h4>
                  <p className="text-white/40 text-xs mt-0.5 truncate">{alert.description}</p>
                </div>
                <span className="text-white/30 text-xs shrink-0">{alert.timestamp}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
