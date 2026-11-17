# Escala de texto do Porceli System

Uma escala só para o sistema todo. Parte do que o `design.md` já documentava e
do gráfico de **Projeção de Faturamento Anual**, que o Gabriel escolheu como
referência (título 18px semibold; rótulo pequeno e valor maior logo abaixo).
O `design.md` e o `PADROES-UI-PORCELI.txt` não foram alterados.

| Papel | Classes | Tamanho |
|---|---|---|
| Título de card / seção (Pagamentos em atraso, Lançamentos, gráficos, painel de atividades) | `text-lg font-semibold tracking-tight text-white` | 18px |
| Título de modal (`DialogTitle`, no chip) | `font-bold tracking-tight`, sem tamanho próprio | o do componente |
| Subtítulo dentro de modal | `text-[11px] font-black uppercase tracking-[0.2em] text-white/40` + `border-b border-white/[0.05] pb-2` | 11px |
| Rótulo (eyebrow) de campo ou número | `text-[10px] font-black uppercase tracking-widest text-white/40` | 10px |
| Texto de botão, aba, pílula, selo | `text-[11px] font-bold uppercase tracking-widest` | 11px |
| Corpo | `text-sm` | 14px |
| Auxiliar / legenda | `text-xs text-white/40` a `/55` | 12px |
| Valor em card de número (`StatsCard`) | `text-xl` no celular, `md:text-3xl` | 20 / 30px |
| Números acima de gráfico (`ChartKpis`) | rótulo 11px, valor 14px no celular; 14px e 24px a partir de `sm` | — |
| Altura do gráfico (`CHART_ALTURA`) | `h-[210px] sm:h-[400px]` | — |

## Regras

- Só existem os tamanhos da tabela. Nada de `text-[9px]`, `text-[12px]`,
  `text-[13px]`, `text-[14px]` nem `rem` solto: use `text-[10px]`,
  `text-xs`, `text-sm` e `text-[11px]`.
- Título de card é sempre `text-lg font-semibold`; `text-xl font-bold` e
  `font-black` em título não são mais usados.
- Gráfico novo usa `ChartKpis` e `CHART_ALTURA` (`src/components/ui/chart-kpis.tsx`).

## Fora da escala, de propósito

- Terminal dos agentes (`agents-canvas.tsx`) e os nós dos mapas de funil: o
  texto acompanha o zoom do canvas.
- Editor e lista de notas (`features/notes`): têm escala própria do editor.
- Números da barra de ícones (`Header.tsx`) e o selo de `badge.tsx`.
- Cards em caixa alta do Dashboard (Funil, O ano, Saúde): `text-sm`, é a
  assinatura visual do bento.

## Fonte

Os arquivos `public/fonts/*.otf` trazem ascent 815 / descent 185 / lineGap 0
gravados. O `@font-face` ainda tem `ascent-override`, mas o Safari do iPhone
ignora esse descritor; sem os valores na própria fonte, as maiúsculas ficavam
~2px acima do centro de botões e abas.
