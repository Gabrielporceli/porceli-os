
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedValue } from "@/components/ui/AnimatedValue";
import { DeconstructedCard } from "@/components/ui/deconstructed-card";

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

/**
 * Card "desconstruído": chip (título) no canto superior-esquerdo,
 * conectado ao corpo por uma curva côncava — ver DeconstructedCard (uma
 * única caixa recortada via clip-path, sem costura entre chip e corpo).
 */
export function StatsCard({ title, value, trend, description, className }: StatsCardProps) {
  return (
    <DeconstructedCard
      className={cn("animate-premium-in", className)}
      chip={
        <span className="text-white/70 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
          {title}
        </span>
      }
    >
      <p className="text-3xl font-black text-white tabular-nums tracking-tighter">
        <AnimatedValue value={String(value)} />
      </p>
      {description && (
        <p className="text-white/40 text-[10px] mt-1 leading-relaxed font-medium">{description}</p>
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
    </DeconstructedCard>
  );
}
