
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  className?: string;
}

export function StatsCard({ title, value, icon: Icon, trend, description, className }: StatsCardProps) {
  return (
    <Card className={cn("liquid-glass border-white/5 p-6 animate-premium-in group hover:bg-white/[0.04] transition-all", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">{title}</p>
          <p className="text-3xl font-black text-white tabular-nums tracking-tighter">{value}</p>
          {description && (
            <p className="text-white/30 text-[10px] mt-1 leading-relaxed font-medium">{description}</p>
          )}
          {trend && (
            <div className="flex items-center mt-2.5">
              <div className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border",
                trend.isPositive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
              )}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </div>
              <span className="text-white/20 text-[10px] ml-2 font-medium">vs mês anterior</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
