import React from 'react';
import { useCountUp } from '@/hooks/useCountUp';

type Parsed = {
  target: number;
  format: (n: number) => string;
} | null;

function parseValue(value: string): Parsed {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === '—' || trimmed === '-') return null;

  // BRL currency: "R$ 1.234,56" or "-R$ 1.234,56"
  if (trimmed.includes('R$')) {
    const negative = trimmed.startsWith('-');
    const numStr = trimmed
      .replace('-', '')
      .replace('R$', '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const num = parseFloat(numStr);
    if (isNaN(num)) return null;
    return {
      target: negative ? -num : num,
      format: (n) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n),
    };
  }

  // Signed percentage: "+12.3%" or "-5.1%"
  const signedPct = trimmed.match(/^([+-])(\d+(?:[.,]\d+)?)%$/);
  if (signedPct) {
    const sign = signedPct[1];
    const num = parseFloat(signedPct[2].replace(',', '.'));
    const decimals = signedPct[2].includes('.') || signedPct[2].includes(',') ? 1 : 0;
    return {
      target: num,
      format: (n) => `${sign}${n.toFixed(decimals)}%`,
    };
  }

  // Unsigned percentage: "12.3%"
  const pct = trimmed.match(/^(\d+(?:[.,]\d+)?)%$/);
  if (pct) {
    const num = parseFloat(pct[1].replace(',', '.'));
    const decimals = pct[1].includes('.') || pct[1].includes(',') ? 1 : 0;
    return {
      target: num,
      format: (n) => `${n.toFixed(decimals)}%`,
    };
  }

  // Plain integer: "5", "12"
  const int = trimmed.match(/^(\d+)$/);
  if (int) {
    return {
      target: parseInt(int[1]),
      format: (n) => Math.round(n).toString(),
    };
  }

  return null;
}

function AnimatedValueInner({
  parsed,
  duration,
}: {
  parsed: NonNullable<Parsed>;
  duration: number;
}) {
  const current = useCountUp(parsed.target, duration);
  return <>{parsed.format(current)}</>;
}

type AnimatedValueProps = {
  value: string;
  duration?: number;
};

export function AnimatedValue({ value, duration = 1400 }: AnimatedValueProps) {
  const parsed = parseValue(value);
  if (!parsed) return <>{value}</>;
  return <AnimatedValueInner parsed={parsed} duration={duration} />;
}
