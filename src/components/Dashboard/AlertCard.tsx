
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
    <Card className={cn("liquid-glass p-4 md:p-5 h-full animate-premium-in shadow-2xl", className)}>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold text-white">Alertas & Notificações</h3>
      </div>
      <div className="space-y-3 overflow-y-auto overflow-x-hidden pr-1 max-h-[600px] pt-1">
        {alertsToShow.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 opacity-30">
            <AlertTriangle className="w-12 h-12 mb-2" />
            <p className="text-sm">Sem alertas no momento</p>
          </div>
        ) : (
          alertsToShow.map((alert) => (
            <div 
              key={alert.id} 
              className="flex items-center justify-between p-3 rounded-lg liquid-glass border-white/[0.05] dashboard-glow"
            >
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-white text-sm font-medium truncate">{alert.title}</h4>
                </div>
                <p className="text-Porceli-gray-400 text-xs truncate mt-0.5">{alert.description}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-Porceli-gray-500 text-[10px]">
                  {alert.timestamp}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
