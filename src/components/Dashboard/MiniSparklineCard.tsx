'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

type MiniSparklineCardProps = {
  title: string;
  value: string;
  description?: string;
  change?: number;
  data: { value: number }[];
  trend?: 'up' | 'down';
  color?: string;
  className?: string;
};

export function MiniSparklineCard({
  title,
  value,
  description,
  change,
  data,
  trend = 'up',
  color = '#22c55e',
  className
}: MiniSparklineCardProps) {
  const isPositive = trend === 'up';
  const displayColor = color || (isPositive ? '#22c55e' : '#ef4444');

  return (
    <Card className={cn("liquid-glass border-white/[0.05] overflow-hidden flex flex-col p-0", className)}>
      <div className="p-5 pb-2">
        <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{title}</p>
        <div className="flex flex-col gap-1">
          <p className="text-2xl font-bold text-white tracking-tight leading-none">{value}</p>
          {description && <p className="text-xs text-white/40 font-medium">{description}</p>}
        </div>
      </div>

      <div className="h-14 w-full mt-auto">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id={`gradient-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={displayColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={displayColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={displayColor}
              strokeWidth={2}
              fill={`url(#gradient-${title.replace(/\s/g, '')})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
