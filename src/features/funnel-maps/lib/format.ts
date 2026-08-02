export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(value));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
