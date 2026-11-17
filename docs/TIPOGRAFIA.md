# Escala de texto do Porceli System

Uma escala só para o sistema todo. Parte do que o `design.md` já documentava e
do gráfico de **Projeção de Faturamento Anual**, que o Gabriel escolheu como
referência (título 18px semibold; rótulo pequeno e valor logo abaixo, os dois
em peso normal/semibold, nunca "black"). O `design.md` e o
`PADROES-UI-PORCELI.txt` não foram alterados.

## Tamanhos e pesos

| Papel | Classes | Tamanho / peso |
|---|---|---|
| Título de card / seção (Pagamentos em atraso, Lançamentos, gráficos, painel de atividades, mês do calendário) | `text-lg font-semibold tracking-tight text-white` | 18 / 600 |
| Título de modal (`DialogTitle`, no chip) | `font-semibold tracking-tight`, sem tamanho próprio | 18 / 600 |
| Nome de item de lista (cliente, grupo de contratos, lançamento, despesa) | `text-base font-semibold text-white` | 16 / 600 |
| Título de cartão pequeno (atividade do dia, tipo de contrato) | `text-sm font-semibold` | 14 / 600 |
| Subtítulo dentro de modal | `text-[11px] font-black uppercase tracking-[0.2em] text-white/40` + `border-b border-white/[0.05] pb-2` | 11 |
| Rótulo (eyebrow) de campo ou número | `text-[10px] font-black uppercase tracking-widest text-white/40` | 10 |
| Título de card em caixa alta (Funil, O ano, Saúde, Histórico de produtividade) | `text-sm font-black uppercase tracking-widest text-white/60` | 14 (assinatura do bento) |
| Texto de botão, aba, pílula, selo | `text-[11px] font-bold uppercase tracking-widest` | 11 |
| Corpo | `text-sm` | 14 / 400 |
| Valor de campo (texto: referência, data, e-mail) | `text-sm font-medium text-white` | 14 / 500 |
| Valor inline (R$ numa linha ou lista, status "Pago") | `text-sm font-semibold` | 14 / 600 |
| Auxiliar / legenda | `text-xs text-white/40` a `/55` | 12 |
| Número em destaque em card (`StatsCard`, Faturamento, A receber, comparativos) | `text-xl font-semibold tabular-nums` (`md:text-3xl` no `StatsCard`) | 20 (30) / 600 |
| Números acima de gráfico (`ChartKpis`) | rótulo 11px, valor 14px no celular; 14px e 24px a partir de `sm` | 600 |
| Altura do gráfico (`CHART_ALTURA`) | `h-[210px] sm:h-[400px]` | — |

## Regras

- Só existem os tamanhos da tabela: 10, 11, 12, 14, 16, 18, 20, 24 e 30.
  Nada de `text-[9px]`, `text-[12px]`, `text-[13px]`, `text-[14px]` nem `rem`
  solto: use `text-[10px]`, `text-xs`, `text-sm` e `text-[11px]`.
- Número em destaque é sempre `font-semibold`. `font-black` só em rótulos e
  títulos em caixa alta (a fonte não tem peso 900: renderiza o 700).
- Texto sem tamanho declarado herda 16px. Todo valor de campo declara
  `text-sm`.
- Gráfico novo usa `ChartKpis` e `CHART_ALTURA` (`src/components/ui/chart-kpis.tsx`).

## Como conferir

No navegador, percorrer a tela e listar `fontSize/fontWeight` de cada texto
visível. Fora da tabela só deve aparecer o `14/900` dos títulos em caixa alta e
o `16/400` do "Fechar" que só leitor de tela vê.

## Fora da escala, de propósito

- Terminal dos agentes (`agents-canvas.tsx`) e os nós dos mapas de funil: o
  texto acompanha o zoom do canvas.
- Editor e lista de notas (`features/notes`): têm escala própria do editor.
- Números da barra de ícones (`Header.tsx`) e o selo de `badge.tsx`.

## Fonte

Os arquivos `public/fonts/*.otf` trazem ascent 815 / descent 185 / lineGap 0
gravados. O `@font-face` ainda tem `ascent-override`, mas o Safari do iPhone
ignora esse descritor; sem os valores na própria fonte, as maiúsculas ficavam
~2px acima do centro de botões e abas.
