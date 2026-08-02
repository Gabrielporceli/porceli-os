// Feriados nacionais + ajuste de dia útil — port exato da lógica usada nas
// edge functions asaas-new-client / asaas-payment-alerts (Deno). Existia só
// lá; o gerador local de lançamentos (useGenerateFinancialEntries) nunca
// aplicava esse ajuste, então o vencimento gravado no nosso banco podia
// ficar até um dia diferente do vencimento real criado no Asaas sempre que
// o dia de pagamento caísse num fim de semana/feriado — o que quebra o
// casamento por (nome + data) da conciliação de pagamentos.

function getEaster(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function getBrazilianHolidays(year: number): Set<string> {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const shift = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const easter = getEaster(year);
  return new Set([
    `${year}-01-01`, `${year}-04-21`, `${year}-05-01`,
    `${year}-09-07`, `${year}-10-12`, `${year}-11-02`,
    `${year}-11-15`, `${year}-11-20`, `${year}-12-25`,
    iso(shift(easter, -48)), // Segunda de Carnaval
    iso(shift(easter, -47)), // Terça de Carnaval
    iso(shift(easter, -2)),  // Sexta-feira Santa
    iso(shift(easter, 60)),  // Corpus Christi
  ]);
}

export function holidaysForRange(startYear: number, endYear: number): Set<string> {
  const all = new Set<string>();
  for (let y = startYear; y <= endYear; y++) {
    for (const h of getBrazilianHolidays(y)) all.add(h);
  }
  return all;
}

function isWeekend(d: Date): boolean { return d.getDay() === 0 || d.getDay() === 6; }
function isHoliday(d: Date, h: Set<string>): boolean { return h.has(d.toISOString().slice(0, 10)); }
function isBusinessDay(d: Date, h: Set<string>): boolean { return !isWeekend(d) && !isHoliday(d, h); }

function prevBusinessDay(d: Date, h: Set<string>): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - 1);
  while (!isBusinessDay(r, h)) r.setDate(r.getDate() - 1);
  return r;
}

/** Antecipa pro último dia útil anterior se `due` cair em fim de semana/feriado. */
export function effectiveDueDate(due: Date, h: Set<string>): Date {
  return isBusinessDay(due, h) ? due : prevBusinessDay(due, h);
}

export function clampDay(y: number, m: number, d: number): number {
  return Math.min(d, new Date(y, m + 1, 0).getDate());
}

/** Mesmo cálculo do 1º vencimento usado em asaas-new-client. */
export function calcFirstDueDate(base: Date, payDay: number): Date {
  let y = base.getFullYear(), m = base.getMonth();
  let due = new Date(y, m, clampDay(y, m, payDay));
  if (base > due) {
    m++; if (m > 11) { m = 0; y++; }
    due = new Date(y, m, clampDay(y, m, payDay));
  }
  return due;
}
