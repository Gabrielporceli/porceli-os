# Porceli OS — Guia de layout detalhado

Documento de referência do visual e da estrutura de **cada página, cada card e cada componente** do sistema.
Escrito a partir do código (React + Vite + Tailwind 3.4 + framer-motion + Radix + `@xyflow/react`). Onde há número (cor, px, ms, opacidade) ele é o valor real do código; os arquivos de origem estão citados entre colchetes.

> Convenção: `rgba(...)`/`#hex` = valor literal; `white/40` = classe Tailwind `text-white/40` (branco a 40%).
> Quando um valor vem de uma classe CSS do projeto (ex.: `surface-flat`), a definição está na seção 2.

---

## Sumário

1. Fundamentos: cores, tipografia, escala de texto, raios, espaçamento
2. Materiais (superfícies): liquid-glass, surface-*, dc-*, botões de vidro
3. Casca do app: fundo, layout, barra lateral, transição de página
4. Componentes compartilhados (botões, modais, select, switch, orbe, ícones…)
5. Páginas (uma seção por página)

---

# 1. Fundamentos

## 1.1 Paleta

| Papel | Valor | Onde aparece |
|---|---|---|
| Fundo do documento (`body`) | `#121212` (`!important`) | atrás de tudo; o wallpaper cobre |
| Texto padrão | `#e1e1e1` (`!important`) | corpo |
| Títulos `h1–h6` | `#eaeaea` (`!important`), peso bold | todo título semântico |
| **Roxo da marca** (primary) | `#6829C0` (`hsl(265 65% 46%)`) | botões primários, destaques, foco, seleção |
| Roxo claro | `#8B5CF6` | linhas/arestas, anel de seleção, gradientes |
| **Cinza das superfícies** | `#2F2D2E` | todos os cards sólidos (`surface-flat`, `surface-modal`) |
| **Claro (pontual)** | `#F4F4F4` | card claro (`surface-light`), funil do Dashboard |
| Preto da marca | `#000000` | `porceli.dark` |
| Cinza porceli 800/900/950 | `#111111` / `#171717` / `#0a0a0c` | fundos escuros pontuais |
| Verde (positivo) | `green-400` no escuro / `green-600` no claro; botão `rgba(22,163,74,.55)` | lucro, crescimento, “ativo” |
| Vermelho (negativo) | `red-400` no escuro / `red-600` no claro; botão `rgba(220,38,38,.55)` | prejuízo, vencido, excluir |
| Âmbar | `amber-300` (`#fcd34d`), `amber-200/80` | avisos, “pendente”, agente principal |
| Amarelo status | `yellow-500` | “a vencer” |

Tokens CSS (`:root`, em `index.css`): `--background 240 6% 7%`, `--foreground 0 0% 88%`, `--card/--popover 240 6% 7%`, `--primary 265 65% 46%`, `--secondary/--muted 0 0% 15%`, `--muted-foreground 0 0% 64%`, `--accent 0 0% 25%`, `--destructive 0 84% 60%`, `--border 0 0% 25%`, `--input 0 0% 15%`, `--ring 265 65% 46%`, `--radius 1rem`.
Gradientes utilitários: `bg-gradient-porceli` = `135deg #6829c0 → #8B5CF6`; `bg-gradient-dark` = `135deg #080808 → #171717`.

## 1.2 Tipografia

- Família única: **Founders Grotesk** (OTF local, pesos 300/400/500/600/700) e **Founders Grotesk XCond** (300/700) para casos condensados. `font-sans`, `font-serif` e `font-mono` apontam todos para Founders Grotesk.
- Métricas ajustadas por `ascent-override: 81.5%`, `descent-override: 18.5%`, `line-gap-override: 0%` para centralizar o texto verticalmente sem hack.
- Padrões recorrentes:
  - **Rótulo de cartão (chip/label):** `text-[10px]` a `text-[11px]`, `font-black`, `uppercase`, `tracking-widest`, cor `white/40`–`white/75`.
  - **Valor grande:** `text-3xl font-black tracking-tighter tabular-nums` (StatsCard) ou `text-xl 2xl:text-2xl font-black tracking-tight tabular-nums` (listas).
  - **Título de página (quando existe):** `text-2xl font-black tracking-tighter`.
  - **Corpo:** `text-sm` (14px) / `text-xs` (12px) com `white/70`.

## 1.3 Escala de texto (5 níveis — regra do projeto)

| Papel | Classe | Uso |
|---|---|---|
| Título / valor-chave | `text-white` (100%) | h1–h4, R$, nomes |
| Corpo / leitura | `text-white/70` | parágrafos, valores de campo |
| Label / metadado | `text-white/50` | labels de formulário, timestamps |
| Apoio / placeholder | `text-white/40` | hints, “opcional”, captions |
| Fraco / decorativo | `text-white/20` | ícones inativos, estados vazios |

Cores de acento (roxo, verde, vermelho, âmbar) ficam fora dessa escala. No card claro o texto usa `#2F2D2E` (100%), `#2F2D2E/60` e `#2F2D2E/50`.

## 1.4 Raios e espaçamento

- Cards grandes e painéis: `rounded-3xl` (`1.5rem` = 24px). Cards internos e inputs grandes: `rounded-2xl` (16px). Inputs/linhas: `rounded-xl` (12px). Pílulas/botões: `rounded-full`.
- Folga entre cards: `gap-4` (16px) a `gap-5` (20px); entre blocos de página `space-y-6` (24px) / `md:space-y-8` (32px).
- Margem da página: `pt-6 pb-28 md:pb-6 md:pl-[104px]`, conteúdo com `px-4` (16px). A barra lateral termina em 88px (16 de recuo + 72 de largura), mais 16px de respiro = **104px à esquerda**. Mesma margem em todas as páginas (a do Kanban de Leads é a referência).
- Faixa vertical da barra lateral: começa a **16px do topo** e termina a **16px do fundo** (o contêiner é `fixed top-0 bottom-0 py-4 pl-4`). Páginas de “tela cheia” (Funil, Agentes, Quadros) ocupam exatamente essa faixa.

---

# 2. Materiais (superfícies)

Todas as superfícies compartilham o **mesmo bevel de 8 camadas** (`box-shadow` inset). Em ordem:

```
inset 0 0 0 1px      rgba(255,255,255,.06)                       ← hairline (a "borda")
inset 1.8px 3px 2px -2px   white 80%                            ← rim de luz, topo/esquerda
inset -2px -2px 2px -2px   white 65%                            ← rim de luz, baixo/direita
inset -3px -8px 2px -6px   white 50%                            ← brilho especular inferior
inset -0.3px -1px 4px 0    black 12%
inset -1.5px 2.5px 3px -2px black 16%
inset 0 3px 4px -2px       black 16%
inset 2px -6.5px 2px -4px  black 10%
+ elevação: 0 2px 8px rgba(0,0,0,.18), 0 14px 36px rgba(0,0,0,.26)
```

A borda é o 1º inset, **não** `border:` (em cards grandes, `border + border-radius + backdrop-filter` gera uma emenda nos 4 cantos).

## 2.1 `.liquid-glass` — vidro neutro translúcido
- Fundo `rgba(28,28,34,.28)`; `backdrop-filter: blur(20px) saturate(180%) brightness(1.12)`; raio `1.5rem`.
- Aninhado (`.liquid-glass .liquid-glass`): fundo `.26`, blur `14px`, saturate `170%`, brightness `1.1`, bevel mais suave, elevação `0 2px 6px / 0 10px 28px`.
- `.liquid-glass.no-elevation`: só o bevel, sem as duas sombras externas (cards que ocupam quase a tela toda).
- `.liquid-glass.shadow-header-btn`: fundo `rgba(255,255,255,.13)`, **sem** backdrop-filter, bevel “Tahoe” — usado nos mini-cards do funil de prospecção.
- Hoje o projeto **evita** `.liquid-glass` nos cards de conteúdo (usa `surface-flat`); ele sobrou em círculos de ícone, pílulas do funil, barras flutuantes e na lista de Agentes antiga.

## 2.2 `.surface-flat` — o cinza do Dashboard (o padrão atual)
- Mesma receita do vidro (blur 20 / saturate 180 / brightness 1.12 + bevel), mas o fundo é **`rgba(47,45,46,.72)`** (`#2F2D2E` a 72%). É a superfície de quase todos os cards.
- `.surface-flat.no-elevation`: remove as sombras externas (bloco grande).
- Sempre: `border: none`, `border-radius: 1.5rem !important`, `position: relative`.

## 2.3 `.surface-accent` — card de destaque roxo
- Fundo `rgba(104,41,192,.85)`; mesmo vidro/bevel. O roxo é reservado a destaque e detalhe pequeno (ex.: “Faturamento previsto” no Dashboard).

## 2.4 `.surface-light` — card claro
- Fundo `rgba(244,244,244,.78)`; texto `#2F2D2E`. “Quebra o ritmo dos escuros”: Recebíveis e Saúde do negócio no Dashboard.

## 2.5 `.surface-modal` — cinza sólido de modal/dropdown
- Fundo **`rgba(47,45,46,.90)`** (`!important`). É o cinza dos modais, dos menus Select/Popover, do date/time-picker e do painel de chat dos agentes. Mesma receita de vidro + bevel.
- `.modal-legivel` (dentro de DialogContent/AlertDialog): `label` 11px `white/70`; inputs/textarea/combobox com fundo `rgba(255,255,255,.06)`, borda `rgba(255,255,255,.12)`, texto `#fff`; placeholder `rgba(255,255,255,.4)`.

## 2.6 `.dc-single` / DeconstructedCard — card “desconstruído”
- Uma **única caixa recortada por `clip-path: path()`** (calculado por ResizeObserver): chip no canto superior-esquerdo + corpo, ligados por uma **curva côncava** (`fillet` 18px, raio externo `radius` 20px, 24px nos modais). Sem costura entre chip e corpo.
- O bevel é refeito **geometricamente em SVG** (7 camadas `BEVEL_INSETS`, cada uma = forma mascarada pela cópia deslocada + `feGaussianBlur`) + hairline `stroke rgba(255,255,255,.06)` de 2px (1px visível). Elevação por `filter: drop-shadow(0 2px 8px rgba(0,0,0,.18)) drop-shadow(0 14px 36px rgba(0,0,0,.26))`.
- Fundo `rgba(28,28,34,.28)` com blur 20; no modal `.dc-modal > .dc-single` vira `rgba(47,45,46,.9)`, `display:flex; flex-direction:column`; `.dc-body-content` `flex:1 1 auto; min-height:0` (corpo estica).
- **Chip** (`.dc-chip-row`): largura fixa `240px`, padding `8px 20px`, `gap 10px`, `flex-shrink:0`. **Corpo** (`.dc-body-content`): padding `20px`.
- **Círculo do canto**: diâmetro `44px`, vão `6px` (`NOTCH = 56px`), encaixado no canto superior-direito numa “mordida” — dentro vai um `liquid-glass !rounded-full` com ícone de `18px` em `white/85`. No modal, o círculo é o botão **Fechar** (`surface-modal`, X de `18px`, `hover:scale-105`, `active:scale-95`).
- No Kanban de Leads: `.dc-kanban-card .dc-single` é transparente, sem blur e sem filtro (a coluna já é sólida).

## 2.7 Botões de vidro

**`LiquidGlassButton`** (o botão padrão do sistema): pílula `rounded-full`, `gap-2`, `tracking-tight`, `disabled:opacity-50`, anel de foco `ring-2 white/50`. Duas camadas: uma “lente” vazia (`.lqg-lens`, `-z-10`, `inset-0`) com o vidro e o texto por cima.
- Lente: `background rgba(255,255,255,.05)`, `backdrop-filter: blur(8px) url(#liquid-glass-refraction) saturate(150%)` (Chrome refrata via SVG `feDisplacementMap`; Safari cai para blur), bevel “Tahoe” de 8 insets com `--glass-reflex-light: .65` e `--glass-reflex-dark: 1`, mais `0 1px 5px black 10%` e `0 6px 16px black 8%`; transição `400ms cubic-bezier(1,0,.4,1)` em fundo e sombra.
- Tints (`tint=`): **primary** `rgba(104,41,192,.90)` (hover `.98`), **success** `rgba(22,163,74,.55)` (hover `.72`), **danger** `rgba(220,38,38,.55)` (hover `.72`), **neutral** sem tinta.
- Tamanho padrão nas telas: `h-11 px-6 text-xs font-bold uppercase tracking-widest` (botão de página), `h-10 px-5` (rodapé de modal), `h-9 px-5` (barras de filtro), `h-8 px-4` (linha de card).
- Movimento padrão envolvendo o botão (framer-motion): `whileHover { scale: 1.05, translateY: -2 }`, `whileTap { scale: .95 }`, `spring stiffness 400, damping 17`.

**Botões “antigos”** (`.btn-glass`, `.btn-glass-primary`, `.btn-success-glass`, `.btn-danger-glass`, e qualquer `.bg-primary` que não seja switch/badge): blur 18 / saturate 180, borda `1px rgba(255,255,255,.10)` com topo `.18`, shine `inset 0 1px 0 rgba(255,255,255,.16)`, sombra `0 12px 32px rgba(0,0,0,.35)`, fundos `rgba(18,18,18,.50)` / `rgba(104,41,192,.55→.70)` / `rgba(22,163,74,.55→.70)` / `rgba(220,38,38,.55→.70)`. **Aviso:** `.bg-primary` aplica `backdrop-filter`; um backdrop-filter logo abaixo do header fixo é o gatilho da “tarja de brilho” — por isso alguns botões usam `style={{backgroundColor:"hsl(var(--primary))"}}`.

**Cards de atividade** (calendário) e demais variantes estão descritos na página Calendário.

## 2.8 Outros materiais
- `.glass-effect` `rgba(18,18,18,.95)` + blur 20 + borda `white/5%`; `.glass-premium` `rgba(10,10,10,.98)` + blur 40 + sombra `0 10px 30px black 50%`; `.liquid-glass-ghost` (transparente, blur 10, borda `white 8%`, topo `15%`).
- `.gradient-text`: `from-porceli-purple to-purple-400` com `bg-clip-text`.
- `.scrollbar-hide`, `.custom-scrollbar` (8px, trilho/polegar discretos), foco: **nenhum anel do navegador** em input/textarea/select/button (`outline: none !important`).

---

# 3. Casca do app

## 3.1 Fundo (`appBackground.ts`)
Camadas de background de **um elemento só** (`fixed inset-0` no CRMLayout), de cima para baixo:
1. Grão SVG `feTurbulence baseFrequency .65, 3 oitavas`, opacidade `.05`, tile `200×200`, `background-blend-mode: overlay`;
2. Véu `linear-gradient(rgba(0,0,0,.25))` (25% de preto);
3. Wallpaper `/app-bg.webp`, `cover`, centralizado.
- **Nunca** usar `mix-blend-mode` numa camada acima da página: torna o contexto de empilhamento não-isolado e acende a “tarja de brilho” nos cards de vidro.
- Login: wallpaper `/background.png` com `filter: blur(4px)` + `scale(1.05)`, mais véu e grão.

## 3.2 CRMLayout
Raiz `min-h-screen bg-porceli-dark` → wallpaper fixo → `PageTransitionProvider` → coluna `flex-col min-h-screen relative z-10` → `Header` (barra lateral/rodapé) + `<main class="flex-1 min-w-0 w-full pt-6 pb-28 md:pb-6 md:pl-[104px]">` com `<div class="w-full px-4">`. Sem largura máxima nem centralização. Há ainda o **WhatsappBanner** (aviso de conexão) acima do conteúdo.

## 3.3 Barra lateral (Header, desktop/tablet)
- Contêiner `fixed bottom-0 left-0 top-0 z-[60] flex items-stretch py-4 pl-4` → `.side-nav-shadow` (sombra externa `0 2px 8px/.18` + `0 14px 36px/.26`, raio 24px) → `<header class="side-nav flex w-[72px] flex-col items-center gap-3 py-4">`.
- `.side-nav`: **sem backdrop-filter** (evita a tarja); o vidro é refeito em `::before` pintando o próprio wallpaper alinhado por JS (`--sn-x/y/w/h`) com `filter: blur(20px) saturate(180%) brightness(1.12)` e véus `rgba(28,28,34,.28)` + `rgba(0,0,0,.25)`; o bevel vai no `::after`.
- Estrutura: **logo** `h-8 w-8` com `border-b white/5` e `pb-3`; **nav** de ícones (`gap-0.5`, rolagem escondida) com a **pílula líquida** (blob gooey) que desliza vertical até o item ativo; **Sair** (`Logout`, `text-white/40 → hover:text-red-500`) com `border-t white/5` e `pt-3`.
- Cada item: `h-10 w-10` (`md:h-11 md:w-11`) `rounded-full`; ícone `h-4 w-4` (`sm:h-[18px] sm:w-[18px]`); inativo `text-white/40`, hover `text-white/70` + disco `bg-white/5` (fade 300ms); ativo `text-white` (a pílula `.lqg-lens--nav` `rgba(255,255,255,.13)` sem blur, bevel Tahoe, fica atrás).
- **Ordem dos itens:** Dashboard (Category) · Calendário (Calendar) · Funil (Filter) · Mapas de Funil (Hierarchy; some no mobile) · Clientes (Profile2User) · Contratos (DocumentText) · Financeiro (DollarCircle) · **Notas (NoteText)** · **Agentes (AgentIcon — orbe com dois olhos)** · **Automações (Flash)** · **Agendamentos (Clock)**.
- Mobile (<768px): vira **pílula no rodapé** (`fixed bottom-0`, `pb max(1rem, safe-area)`), janela de 5 slots (`216px`), ícones `h-10 w-10`/`h-5 w-5`, carrossel com `snap-center`, pílula gooey horizontal.

## 3.4 Transição de página (PageTransition)
Overlay de tela inteira a cada troca: `backdrop-filter: blur()` sobe de 0 a **18px** em **380ms** (`easeOut`); a **logo** (`/logo.png`) entra de `y:-130%` com atraso de **200ms**, duração **500ms**, easing com overshoot `[.175,.885,.32,1.275]`. Quando a página está pronta, blur e logo somem juntos em **1600ms** com easing quase linear `[.33,0,.67,1]`. Há uma válvula de segurança (a página aparece mesmo se a coreografia travar). Páginas só participam se chamarem `usePageReady()` e devolverem `<PageLoader/>` (um `div h-[70vh]` vazio) enquanto carregam.

## 3.5 Animações utilitárias
`animate-fade-in` (0→1 + `translateY(10px→0)`, 300ms ease-out), `animate-premium-in` (entrada dos StatsCard, com `animation-delay` em escada: 100/200/300/400 ms), `animate-slide-in`, accordion 200ms.

---

# 4. Componentes compartilhados

## 4.1 Campos de formulário (dentro de modais)
- **Input / Textarea** nos modais: `bg-white/[0.03]` (e `.modal-legivel` força `rgba(255,255,255,.06)`), borda `white/[0.05]` (`.modal-legivel`: `rgba(255,255,255,.12)`), `rounded-xl`, altura `h-11` (44px) nos inputs, `min-h-[80px]`/`[100px]`/`[110px]` nas textareas (`resize-none`), texto `text-white`, placeholder `white/20` (`.modal-legivel`: `.4`), foco com borda `primary/50` (sem anel do navegador).
- **Label de campo**: `text-xs font-bold uppercase tracking-widest text-white/70` (11px dentro de `.modal-legivel`).
- **Título de seção no modal**: `text-sm font-black uppercase tracking-[0.2em] text-white/40` com `border-b border-white/[0.05] pb-2`.
- **Date picker / Time picker (botão)**: `h-11 px-4 rounded-xl w-full justify-start`, `bg-white/[0.03] border-white/[0.05] text-white/70`, hover `bg-white/[0.06] border-white/[0.10] text-white`, aberto = igual ao fechado; ícone `h-4 w-4 text-primary opacity-60`; vazio `text-white/40`.
- **Popover do calendário / hora**: `surface-modal` (`rgba(47,45,46,.9)`), `p-0`, `z-[9999999]`, centralizado no botão, abre para baixo. Hora: largura `w-52`, altura `h-72`, duas colunas (Hora | Minutos) separadas por `divide-x white/[0.05]`, cada uma com rolagem escondida; cabeçalho `text-[10px] uppercase tracking-wider text-white/40 font-bold`; item `h-10 px-2 text-sm font-medium rounded-[10px] text-white/70`, hover `bg-[#6829c0]/20`, **selecionado `bg-[#6829c0] font-semibold text-white` com brilho `0 0 15px rgba(104,41,192,.4)`**.

## 4.2 Select (Radix) — o dropdown do sistema
- Conteúdo: `surface-modal` (`rgba(47,45,46,.9)`), `text-white`, `max-h-96`, `min-w-[8rem]`, aparece com `fade + zoom-95` e desliza 2px da borda; **centralizado no botão** (`align="center"`). Sem setas de rolagem: a lista rola com a roda (`onWheel stopPropagation`), `max-h-[min(20rem, espaço disponível)]`, `p-1`, rolagem escondida.
- Item: `rounded-lg py-2 pl-3 pr-8 text-sm text-white/70`, hover/foco `bg-white/[0.08] text-white`; no funil/pauta o item focado fica `focus:bg-[#6829C0] focus:text-white` (`text-xs font-medium`). Check de seleção à direita, `h-4 w-4`.
- Gatilhos nas barras de filtro: `h-8/h-9`, `rounded-lg`/`rounded-full`, `border-0 bg-white/[0.06] px-3 text-xs font-medium text-white/80`, hover `bg-white/10`, aberto `bg-white/10`.

## 4.3 Switch (toggle)
- Trilha `52×32` (padrão) ou `40×24` (`sm`), `rounded-full`; ligado `hsl(var(--primary))` (`#6829C0`), desligado `rgba(255,255,255,.12)`; variante `destructive` usa vermelho. Bolinha 24px (18px no `sm`), padding 4px (3px), **mola `cubic-bezier(.34,1.4,.64,1)`**, esticando 6px (4px) enquanto pressionada (ancorada ao lado de destino). Hit-area `48×48`. Feedback háptico opcional (som). Usado no modal do calendário (travar dia / criar link do Meet), no modal de agente e em Automações.

## 4.4 Dialog / modal
- **Overlay**: `bg-black/50 backdrop-blur-[10px]`, aparece em **350ms** `easeOut`.
- **Modal com chip (padrão atual)**: `NotchedFromClickOrigin` = `DeconstructedCard` com `.dc-modal` (cinza `rgba(47,45,46,.9)`), raio 24px, largura `calc(100% - 2rem)`, `max-w-lg` (ou `max-w-2xl/3xl` por tela), `max-h-[85vh]`; o **título vai no chip** (`font-bold tracking-tight`), o **X vira o círculo encaixado** no canto. `fixed left-[50%] top-[50%]`, `translate(-50%,-50%)`.
- **Animação**: o modal **nasce do ponto do último clique**: `initial {opacity:0, x/y = clique − centro da tela, scale:.15}` → `{opacity:1, x:0, y:0, scale:1}`; opacidade em **120ms** `easeOut`; posição/escala por mola `bounce 0` (`0.35s`) no modal com chip e `bounce .15` (`0.4s`) no sem chip; a saída é o caminho inverso.
- Estrutura interna padrão: corpo `flex-1 min-h-0 overflow-y-auto custom-scrollbar` (+ `p-6 space-y-6`) e **rodapé fixo** `flex gap-4 p-6 border-t border-white/[0.05] shrink-0` com `LiquidGlassButton` (Cancelar = `tint="danger"` ou neutro, Salvar/Criar = `tint="primary"`, `h-10`/`h-12`). Modais com rolagem usam **altura definida** (`h-[85vh]`) — só `max-h` não restringe o conteúdo interno.
- **AlertDialog** de exclusão: `surface-modal border-white/10 text-white shadow-2xl`.

## 4.5 Orbe do agente (`OrbAvatar`)
- Esfera com **gradiente radial** (`circle at 50% 45%`, 4 paradas escuras→claras), brilho especular `radial-gradient(ellipse at 30% 24%, white .75 → .1 → transparent 70%)`, sombra de contato `radial-gradient(circle at 62% 68%, black .18 → transparent 55%)` com `blur-[2px]`, **dois grãos de ruído SVG** e halo colorido `0 0 4px rgba(cor,.35), 0 0 16px 6px rgba(cor,.18), inset 0 0 0 1px white/.05`.
- **12 cores**: blue `#0d4d9a→#3d7dd8→#6fb3ff→#e0eeff`; orange `#a63e10→#e27a2a→#ffb46a→#ffe8cc`; red `#a60033→#e74668→#ff8aaa→#ffd6e8`; green `#0d6632→#2a9d5f→#6dd187→#d1fadd`; purple `#4a0080→#8b3fd1→#c896ff→#e8d4ff`; yellow `#8a5500→#d4a000→#ffc93a→#fff5cc`; cyan `#003d66→#0a8fb5→#5dd4ff→#cdf5ff`; pink `#7a0055→#d63384→#ff6bb3→#ffe5f5`; indigo `#2d157a→#4f46e5→#8b7eff→#ddd6ff`; lime `#4a5910→#84cc16→#bef264→#ecfccf`; turquoise `#1a5555→#0d9488→#2dd4bf→#ccfbf1`; violet `#4a2a7a→#a855f7→#d8b4fe→#f3e8ff`.
- **Tamanhos**: `sm` `size-8` (olho `w-1 h-1.5`, vão `gap-1.5`), `md` `size-12` (`w-1.5 h-2.5`, `gap-2.5`), `lg` `size-16` (`w-2 h-3`, `gap-3.5`). **Formas**: `circle` (`rounded-full`), `squircle` (`rounded-[40%]`), `square`.
- **Olhos**: branco→tom claro da cor (`linear-gradient(135deg,#fff,…)`), **piscam** (`av-blink`: `scaleY` 1 → 0.07 aos 93–97% de um ciclo de 3,6s, o 2º olho com 60ms de atraso) e **acompanham o mouse** quando ele está a menos de 280px do orbe (deslocamento até `16%` da largura, mais forte quanto mais perto; transição 120ms). Clique: `whileTap {scaleX:1.15, scaleY:1.3}` com `tween 0.8s` e easing com overshoot.
- **Acessórios** (SVG em grade 100×100 sobre o orbe, fora do recorte): chapéus (boné, cartola, coroa, gorro, capelo, chapéu de festa), óculos (tapa-olho, óculos, escuros, monóculo), extras (bigode, fone, gravata-borboleta). Hoje o modal de criação não os expõe; ficam no catálogo `/dev/orbs`.

## 4.6 Ícones
- **Iconsax Linear** (traço fino) como padrão, via `Icon` (default 20px; `size`, `variant` e `color` passados explicitamente). **Lucide** convive para o que o Iconsax não tem (X, Loader2, ChevronDown…). Ícone dos agentes: `AgentIcon` — círculo `r 9.25`, dois olhos verticais (`stroke 2`), brilho no topo a 55%.

## 4.7 Notificações e dicas
- **Toast (sonner)**: `bottom-right` no desktop, `top-center` no mobile; `bg-background text-foreground border-border shadow-lg`. Tooltip padrão shadcn (`sideOffset 4`).

## 4.8 Números animados
`AnimatedValue` faz contagem animada (`useCountUp`) de moeda BRL (`R$ 1.234,56`), porcentagem e inteiros; valores `—` ficam estáticos. Todo número grande do Dashboard passa por ele.

## 4.9 StatsCard (card de número)
`DeconstructedCard` + `animate-premium-in`. **Círculo**: `liquid-glass !rounded-full` com ícone `18px white/85`. **Chip**: título `text-[11px] font-black uppercase tracking-widest text-white/75`, truncado. **Corpo**: valor `text-3xl font-black tabular-nums tracking-tighter text-white` (ou `valueClassName`: no Dashboard `text-xl 2xl:text-2xl`); descrição `text-xs text-white/55 font-medium mt-1`; tendência opcional como selo `px-1.5 py-0.5 rounded-md text-[10px] font-bold border` (verde `bg-green-500/10 text-green-400 border-green-500/20`, vermelho análogo) + “vs mês anterior” `white/20`.

---

# 5. Páginas

> Todas as páginas internas rodam dentro do CRMLayout (seção 3.2): margem esquerda 104px, `px-4`, `pt-6`. Quase todas começam com `usePageReady()` e devolvem `<PageLoader/>` enquanto carregam (a transição de tela cobre a espera).

---

## 5.1 Login (`/login`) — [pages/Login.tsx]

**Layout:** tela cheia `min-h-screen w-screen bg-porceli-dark overflow-hidden`, conteúdo centralizado (`flex items-center justify-center`).
**Fundo:** `/background.png` com `blur(4px)` + `scale(1.05)` (evita borda desfocada), véu escuro e grão sobrepostos (`loginOverlayStyle`, sem `mix-blend-mode`).
**Cartão:** `max-w-sm`, perspectiva 1500px; entra com `opacity 0→1` e `y 20→0` em **0,8s**. O cartão **inclina em 3D** com o mouse (`rotateX/rotateY` por `onMouseMove`, volta ao centro em `onMouseLeave`; `whileHover {z:10}`). Material: `liquid-glass p-8 shadow-2xl overflow-hidden border-white/10` (hover `border-white/20`, 500ms).
**Conteúdo (de cima para baixo):**
1. **Logo** `/logo.png` `w-12 h-12`, entra com mola (`scale .5→1`, 0,8s), dentro de `w-10 h-10`.
2. **“Porceli Company”** `text-xl font-bold gradient-text` (gradiente `porceli-purple → purple-400`), fade+subida com atraso 0,2s.
3. **“Faça login para continuar”** `text-xs text-porceli-gray-400` (`#a3a3a3`), atraso 0,3s.
4. **Campos Email e Senha**: contêiner `rounded-lg` com ícone à esquerda (`Sms` / `Lock`, `w-4 h-4`, `white/40` → **`porceli-purple` em foco**, 300ms); input `h-12 rounded-2xl pl-10 bg-white/[0.03] border-white/5 text-white placeholder:white/20`; foco `border-porceli-purple/50 bg-white/[0.07]`. O wrapper faz `whileHover scale 1.01` e `whileFocus 1.02` (mola 400/25). Senha tem olho (`Eye`/`EyeSlash`, `white/40` → hover roxo) à direita.
5. **“Lembrar de mim”**: checkbox custom `h-4 w-4 rounded border-2 border-porceli-gray-600/60 bg-porceli-dark/80`, marcado = `border-porceli-purple` + fundo roxo + check branco SVG que aparece em 200ms; label `text-sm text-porceli-gray-300`, hover branco.
6. **Botão Entrar**: `h-12 rounded-2xl bg-porceli-purple font-bold`, sombra de brilho `0 0 20px rgba(104,41,192,.4)`, `whileHover {scale 1.05, y −2}`, `whileTap .95`, seta `ArrowRight w-3 h-3` que desliza 4px no hover; carregando troca por spinner `w-4 h-4 border-2 border-white/70 border-t-transparent animate-spin` (cross-fade `AnimatePresence`).

---

## 5.2 Dashboard (`/dashboard`) — [pages/Dashboard.tsx]

**Estrutura:** uma **bento grid desconstruída**: `grid animate-fade-in grid-flow-row-dense grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-5 md:auto-rows-[minmax(150px,auto)] xl:grid-cols-6`. Sem cabeçalho de página. No `xl` cada bloco tem posição fixa (`col/row-start`); abaixo disso a grade flui e os spans só valem a partir de `sm` (num grid de 1 coluna `col-span-2` criaria coluna implícita).

**Mapa no xl (6 colunas):**
```
linha 1   [ Faturamento ][ MRR ][ Prev.12m ][     Funil     ]
linha 2   [   O ano     ][Clien][ A vencer ][     Funil     ]
linha 3   [   O ano     ][  Recebíveis    ][     Funil     ]
linha 4-7 [      Gráfico YoY 4×4          ][ Saúde 2×2      ]
                                           [ Comparativo 2×1]
                                           [ Churn ][ Conc. ]
```

### Cards (todos `Card` com superfície, `p-5`)
1. **Faturamento previsto** — `surface-accent` (roxo `rgba(104,41,192,.85)`), 2×1, `flex-col justify-between`. Rótulo `text-[10px] font-black uppercase tracking-widest text-white/50`; valor `text-3xl font-black tracking-tighter text-white` (AnimatedValue); rodapé `text-xs text-white/60` com **“Lucro”** e **“Margem”** (valores `<b text-white>`).
2. **MRR (Mensal)** · 3. **Previsão 12 meses** · 4. **Clientes Ativos** · 5. **Contratos a vencer** — `StatsCard` 1×1 (seção 4.9), ícones `DollarCircle`, `TrendUp`, `Profile2User`, `Calendar`; valor `text-xl 2xl:text-2xl text-white`; descrições: “Mensalidades valendo hoje”, “R$ X já contratado”, “Com mensalidade vigente”, “30 dias, sem renovação”. Entram com `animate-premium-in`.
6. **Funil de prospecção (FunnelCard)** — `surface-flat`, 2×3 (alto). Cabeçalho: título `text-sm font-black uppercase tracking-widest text-white/60` + total `text-[10px] font-black uppercase tracking-widest text-white/35`, `mb-5`. Corpo: coluna `flex gap-1.5 min-h-[360px]` com **uma camada trapezoidal por etapa** (`clip-path: polygon(0 0,100% 0,(100−recuo)% 100%,recuo% 100%)`), **largura fixa por posição** de 100% (topo) a 34% (base) — não pela contagem (dados não monotônicos virariam um “vaso”). Cor **neutra** `rgba(244,244,244, 0.06 + 0.22·(contagem/máx))` (o roxo fica reservado). Cada camada: número `text-lg font-black tabular-nums text-white` + nome `text-[10px] font-black uppercase tracking-widest text-white/60` (máx. 70% da largura, truncado), altura mínima 44px. Sem etapas: “Nenhuma etapa no funil” `text-sm text-white/40`.
7. **O ano de AAAA (Lista)** — `surface-flat`, 2×2. Título `text-[10px] font-black uppercase tracking-widest text-white/40` (`mb-3`); linhas separadas por `divide-y divide-white/[0.06]`, `py-2` (primeira/última sem padding externo), `flex justify-between`; rótulo `text-xs text-white/55`, valor `text-base font-black tabular-nums tracking-tight`. Linhas: Total faturado · Recebido · A receber · Crescimento YoY (verde `green-400`/vermelho `red-400` por sinal) · Mês vs ano anterior.
8. **Recebíveis** — `surface-light` (claro `rgba(244,244,244,.78)`), 2×1, **duas metades** `grid-cols-2 divide-x divide-black/[0.08]` (`pr-4` / `pl-4`): “A receber” e “Vencidos”; rótulo `text-[10px] font-black uppercase tracking-widest text-[#2F2D2E]/50`, valor `text-xl 2xl:text-2xl font-black tracking-tight text-[#2F2D2E]` (vencidos > 0 → `text-red-600`), legenda `text-[10px] text-[#2F2D2E]/50` (“Este mês, no prazo” / “Qualquer mês”).
9. **Gráfico “Crescimento de Receita (YoY)”** — `surface-flat`, 4×4 (`xl:col-start-1 row-start-4 row-span-4`). Cabeçalho sem borda `py-6`, título `text-lg font-semibold text-white`. Linha de totais por ano (`flex-wrap gap-10 mb-10`): barrinha vertical colorida `w-0.5 h-12 rounded-full`, “Total AAAA” `text-sm font-medium text-white/40`, valor `text-2xl font-semibold leading-none text-white` + selo de crescimento (ícone `TrendUp/TrendDown size-4`, verde/vermelho). **Área de gráfico** `h-[400px]` (Recharts `AreaChart`): grade só horizontal `rgba(255,255,255,.05)`, eixo X `fontSize 12`, `fill rgba(255,255,255,.4)`; cursor tracejado `4 4` `rgba(255,255,255,.2)`; padrão de fundo com cruz `rgba(255,255,255,.1)` a `.05` e ponto branco `.02`. Séries por ano: cinza `#4B5563` (mais antigo), índigo `#6366F1`, roxo `#8B5CF6`, lilás `#D8B4FE`; traço do ano, preenchimento em gradiente, ponto ativo com contorno branco `1.5`. **Tooltip**: `rounded-xl border border-white/10 bg-black/80 backdrop-blur-xl p-4 shadow-2xl min-w-[200px]`, título `text-sm font-semibold text-white` com `border-b border-white/10 pb-2 mb-3.5`, linhas com quadradinho `size-2.5 rounded-sm` da cor da série, “Ano AAAA” `text-xs white/40` e valor `text-sm font-semibold text-white`.
10. **Saúde do negócio (Lista clara)** — `surface-light` 2×2: título `text-[#2F2D2E]/50`, divisores `divide-black/[0.08]`, rótulo `text-[#2F2D2E]/60`, valor `text-[#2F2D2E]` (ou verde `green-600`/vermelho `red-600`). Linhas: LTV · Ticket médio · Margem de lucro · Receita por hora.
11. **Comparativo mensal · 12. Churn médio/mês · 13. Concentração** — `MiniSparklineCard flat` (`surface-flat`, `p-0 overflow-hidden`): cabeçalho `p-5 pb-2` com título `text-[10px] uppercase tracking-wider text-white/40` e valor `text-xl 2xl:text-2xl font-bold tracking-tight text-white`; abaixo um **sparkline** `h-14` (Recharts `AreaChart`, margens 20/5, sem eixo) com traço `2px` na cor da tendência — **verde `#22c55e` / vermelho `#ef4444`** — e preenchimento em gradiente de `0.3` a `0` de opacidade, animação de **1400ms** `ease-in-out`. Comparativo 2×1; Churn e Concentração 1×1 (churn “bom” = curva caiu; concentração boa ≤ 30%).

**Ritmo visual:** poucos quadradinhos 1×1, blocos largos 2×1, listas 2×2, funil 2×3, gráfico 4×4; intercala `surface-flat` (cinza), `surface-accent` (roxo, 1 só) e `surface-light` (claro, 2 só).

---

## 5.3 Calendário (`/calendar`) — [pages/Calendar.tsx, components/ui/fullscreen-calendar.tsx, git-hub-calendar.tsx]

**Estrutura vertical:** `space-y-6 md:space-y-8 animate-fade-in pb-10`.
1. **Linha principal** `h-[70vh] min-h-[420px] md:h-[calc(100vh-80px)] md:min-h-[650px] flex gap-4`: calendário (flex-1) + painel lateral “Atividades” (340px, só `lg+`).
2. **Histórico de Produtividade** (GitHubCalendar) **abaixo** do calendário — de propósito: o header com backdrop-filter “acendia” uma tarja no primeiro card de vidro da página (ver nota no código). O topo fica com o cabeçalho do calendário, que não é vidro.
3. Modais: dia selecionado, criar evento, editar atividade, confirmar exclusão.

### 5.3.1 Calendário grande (FullScreenCalendar)
- **Barra de topo** (`p-4 border-b border-white/5`, `md:flex-row md:justify-between`):
  - **Cápsula de navegação** `relative isolate inline-flex rounded-full p-1` com a mesma lente de vidro dos botões (`.lqg-lens`): botão ‹ (`h-10 w-10`, ícone 18px, traço 2.5, `white/70`), **“HOJE”** (`px-6 h-10`, `text-[11px] font-bold uppercase tracking-[0.2em] text-white/85`), botão ›. Hover `bg-white/5`, sem sombra.
  - Título do mês `text-lg font-black tracking-tight ml-2` (escondido < `sm`), ex.: “outubro, 2026”.
  - À direita: botões **Google** e **Notion** (`LiquidGlassButton` neutro, `h-11 px-5 text-xs font-bold uppercase tracking-widest`, ícone Refresh 16px ou spinner) e **Novo Evento** (`tint="primary"`, `h-11 px-6`).
- **Grade**: card `surface-flat no-elevation rounded-3xl overflow-hidden isolate` (sem `overflow-hidden` no wrapper externo para não cortar a sombra). Cabeçalho dos dias da semana `grid-cols-7 text-center text-[11px] font-black uppercase tracking-[0.2em] text-white/60 px-1.5 pt-3 pb-1`. Corpo `grid grid-cols-7 auto-rows-fr gap-1.5 p-1.5`.
- **Célula de dia** `rounded-2xl border overflow-hidden cursor-pointer transition-all hover:brightness-125`:
  - Fundo por **intensidade de atividades** (roxo da marca): 0 → `rgba(255,255,255,.05)`; 1 → `rgba(104,41,192,.45)`; 2–3 → `.68`; 4–6 → `.90`; 7+ → `#6829c0` sólido.
  - Borda: selecionado `border-white/60 ring-1 ring-white/25`; hoje `border-primary/70`; demais `border-white/[0.06]`. Dias de outro mês `opacity-30 pointer-events-none`.
  - Número do dia `text-sm font-black tabular-nums` (`white/65` se vazio, branco se tem atividade/selecionado/hoje) em `px-2.5 pt-2`.
  - Dia **trancado** (não selecionado): selo `w-5 h-5 rounded-md bg-red-500/25 border-red-500/40 text-red-300` com cadeado 9px. Dia **selecionado**: dois botões `w-5 h-5 rounded-md` que entram com `scale .8→1`: cadeado (neutro `bg-white/10 border-white/10`, trancado vermelho) e “+” (`PlusCircle` 11px) para adicionar.
  - Contador no rodapé direito `text-[11px] font-black text-white/85` (“3 ativs.”).

### 5.3.2 Painel lateral “Atividades” (`aside`, `hidden lg:flex w-[340px] surface-flat rounded-3xl`)
- Cabeçalho `p-5 border-b border-white/5`: título (“Hoje” ou o dia) `text-lg font-bold`, data por extenso `text-xs text-white/65 capitalize`; à direita três botões `w-8 h-8 rounded-lg text-white/65 hover:bg-white/10` (dia anterior, hoje, próximo).
- Lista `px-4 pt-4 pb-8 space-y-3`, rolagem escondida, **máscara de fade** nas bordas (só liga o lado em que ainda há conteúdo escondido).
- **Card de atividade (`.status-card`)** `rounded-2xl p-4`: fundo `rgba(255,255,255,.05)`, blur 20, bevel de 7 insets mais leve, sombras `0 1px 5px .12` e `0 6px 16px .10`; hover `brightness-110`. Conteúdo: título `text-sm font-bold` (2 linhas), selo de status (`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full`: “Concluído” `bg-green-500/15 text-green-400`, “Andamento” `bg-blue-500/15 text-blue-400`; pendente = sem selo), cliente `text-xs text-white/70`, hora `Clock 14px text-primary` + `text-xs font-bold`, e **barra de progresso** `h-1 rounded-full bg-white/10` (concluído `w-full bg-green-400`; andamento `w-1/2 bg-blue-400`; pendente `w-1/4 bg-white/30`).
- Vazio: ícone `w-10 h-10`, “Nenhuma atividade neste dia”, `opacity-60`.

### 5.3.3 Histórico de Produtividade (GitHubCalendar) — `surface-flat p-6 !rounded-3xl`
Título `text-xs font-black uppercase tracking-[0.2em] text-white/70`; grade estilo GitHub: células `13×13` `rounded-[3px]` com `gap-[3px]`, borda `white/[0.06]`, hover `scale-125 brightness-125`; letras dos meses/dias `text-[10px] font-black uppercase white/60`. **Mesma rampa** do calendário: vazio `rgba(255,255,255,.05)` → roxo `.45/.68/.90` → `#6829c0`. Legenda “menos … mais” centralizada com quadradinhos `10px rounded-[2px]`.

### 5.3.4 Modal do dia (`sm:max-w-[820px] h-[85vh]`, com chip)
- Chip: “{dia} de {Mês}” `text-xl font-black tracking-tight`. Corpo em 2 colunas (`md:flex-row`, empilha no mobile) sob `border-t white/[0.05]`.
- **Esquerda**: lista de atividades **arrastável** (`@hello-pangea/dnd`) com fade nas bordas e barra de rolagem `6px` (polegar `rgba(104,41,192,.2→.4)`). Cada atividade é um **DeconstructedCard**: círculo = botão editar (`Edit` 18px, `liquid-glass !rounded-full`); chip com alça `GripVertical` (`white/35`, cursor grab) + rótulo `text-[11px] font-black uppercase tracking-widest text-white/75`; corpo com título `text-base font-black`, link do Meet (`ExportSquare 16px`), hora (`Clock 14px text-primary`, `text-xs font-bold`) e cliente (`Tag 14px text-white/50`). Arrastando: `drop-shadow-2xl`.
- **Direita** (`md:w-[300px]`, rolagem, `p-5 gap-4`): **bloco “Trancar dia”** (`p-3 rounded-xl border`; destrancado `bg-white/[0.03] border-white/[0.05]`, trancado `bg-red-500/10 border-red-500/30` com texto/ícone `red-400`) + `Switch scale-75`; **formulário rápido** (título, cliente opcional, recorrência dentro de caixa `p-3 bg-white/[0.03] border-white/[0.05] rounded-xl`, “Google Meet” com Switch e legenda `text-[11px] white/50`, botão **Adicionar** `h-10 text-xs font-bold uppercase tracking-widest`). Inputs `h-10 rounded-xl bg-white/[0.03] border-white/[0.08] focus:border-primary/50 text-sm`. Dia trancado: `opacity-40 pointer-events-none grayscale`.

### 5.3.5 Modais de criar / editar evento (`sm:max-w-[450px]`, com chip `text-lg font-black`)
`DialogDescription` `px-5 pt-1 text-white/60`; corpo `p-5 space-y-3`; labels `text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]`; inputs `h-10 rounded-xl bg-white/[0.03] border-white/[0.08] px-4`; **Data e Hora lado a lado** (`grid-cols-2 gap-4`) com os pickers padrão (seção 4.1).
### 5.3.6 Confirmar exclusão (`max-w-sm`)
Título com `Warning2` vermelho 20px `text-xl font-black`; texto `text-white/70 text-sm`; botão `h-11 px-8` alinhado à direita.

### 5.3.7 Cores de evento (Google): `bg-{cor}-500/20 text-{cor}-300 border-{cor}-500/30` — 1 azul, 2 verde, 3 roxo, 4 rosa, 5 amarelo, 6 laranja, 7 ciano; padrão `bg-primary/20 text-purple-300 border-primary/30`.

---

## 5.4 Funil / Leads (`/leads`) — [pages/LeadsKanban.tsx, components/Leads/*]

É **a página de referência de margem**: as demais foram alinhadas a ela.

**Estrutura:** `<main class="relative">` com
1. **Barra de ações** `flex flex-row flex-wrap items-center justify-end gap-3 mb-8` (alinhada à direita; `pointer-events: none` enquanto se arrasta um card, para a barra não roubar o arrasto): **Nova Etapa** (`LiquidGlassButton` neutro) e **Novo Lead** (`tint="primary"`). Ambos `h-11 px-6 text-xs font-bold uppercase tracking-widest`, embrulhados em `motion.div` (`whileHover {scale 1.05, y −2}`, `whileTap .95`, mola 400/17). No mobile os rótulos encurtam (“Etapa”, “Lead”).
2. **Kanban** em `pb-6 kanban-breakout-left` — a classe cancela os 16px laterais do layout (`margin-left/right: −16px`, só `md+`), então as colunas vão até as bordas da área de conteúdo; o próprio scroller devolve o respiro com `pl-3/sm:pl-4 pr-3/sm:pr-4`.

**Scroller horizontal:** `flex gap-3 sm:gap-4 min-h-[520px] sm:min-h-[620px] overflow-x-auto overflow-y-hidden select-none cursor-grab active:cursor-grabbing pb-2`, barra de rolagem escondida, e **máscara** `linear-gradient(to right, transparent, black 8px, black calc(100% − 8px), transparent)` (as bordas esmaecem). Arrastar o fundo **pana** o quadro (pointer events próprios; `data-no-pan` protege botões). Um espaçador `w-6` fecha a fila. Autoscroll do dnd: começa a 40% da borda, máx. 28px por frame.

### Coluna (etapa)
- `flex-shrink-0 flex flex-col rounded-3xl overflow-hidden bg-[#2f2d2e] ring-1 ring-white/[0.05]`, largura **300px** (288px no mobile). **Cor chapada `#2F2D2E`**, sem blur (o vidro vem do fundo).
- **Cabeçalho** `px-4 py-3 border-b border-white/[0.06]`: bolinha `w-2 h-2 rounded-full` na cor da etapa (cinza/vermelho/amarelo/verde/azul/roxo/rosa/laranja `-500`), nome `text-xs font-black uppercase tracking-[0.15em] text-white` (truncado), contagem `text-[10px] font-black text-white/30`; um botão “mais” `w-7 h-7 rounded-lg text-white/30 hover:bg-white/10 hover:text-white` (ícone 14px).
- **Corpo (Droppable)** `flex-1 p-3 space-y-3 min-h-[300px] sm:min-h-[400px]`; ao arrastar por cima: `bg-primary/[0.05]`. Vazio: caixa `border-2 border-dashed border-white/[0.08] rounded-2xl p-6` com `text-[10px] font-black uppercase tracking-[0.2em] text-white/20`.

### Card de lead (DeconstructedCard, classe `dc-kanban-card`)
- **Transparente, sem blur e sem filtro** (a coluna já é sólida); o contorno recortado e o bevel SVG continuam.
- **Chip**: alça `GripVertical 14px` (`white/25 → hover white/70`, `cursor-grab`) + nome da empresa (ou telefone) `text-[11px] font-bold uppercase tracking-wider text-white/50`, truncado.
- **Círculo**: botão “mais” (`More2 16px text-white/70`) em `surface-modal` `rounded-full`, hover `scale-105`, `active:scale-95` — abre a edição.
- **Corpo** `px-4 py-2.5 space-y-1.5`: nome `text-sm font-bold tracking-tight text-white`; valor `R$ x` `text-xs font-bold tabular-nums text-primary`; rodapé `border-t border-white/[0.06] pt-1` com data `text-[10px] font-bold uppercase tracking-wider text-white/20` e, se há reunião marcada e não realizada, selo `text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary` com data/hora.
- **Arrastando**: `scale-[1.02] opacity-90`; ao soltar o encaixe dura `0.16s` (`transitionDuration`). Tags de lead foram removidas por completo.
- **Menu de contexto (botão direito)**: `liquid-glass border-white/[0.05]`; “Editar Lead” (`data-[highlighted]:bg-primary/80`) e “Excluir Lead” (`text-red-400`).

### Modais
- **Novo Lead** (`max-w-[500px]`, chip `text-xl font-black`): corpo rolável `p-6` com `maxHeight 60vh`, `space-y-4`; labels `text-sm font-medium text-white/70`; inputs `h-11 rounded-xl bg-white/[0.03] border-white/[0.05] focus:border-primary/50`; seletor de etapa mostra bolinha `w-3 h-3` da cor.
- **Nova etapa / Editar etapa**: nome + 8 cores em bolinhas (Cinza, Vermelho, Amarelo, Verde, Azul, Roxo, Rosa, Laranja).
- **Editar Lead**, **Excluir Lead** no mesmo padrão de chip + rodapé fixo.

---

## 5.5 Mapas de Funil (`/funnel-maps`) — [pages/FunnelMaps.tsx, features/funnel-maps/**]

Ferramenta de **canvas** (React Flow `@xyflow/react`) para desenhar a jornada do lead (fonte → página → ação → venda) e **projetar** pessoas, custo, receita e lucro. É uma página “de tela cheia”: sem cabeçalho, ela ocupa exatamente a **faixa da barra lateral** (16px do topo e 16px do fundo: `marginTop = 16 − topo`, `height = innerHeight − 32`; no mobile `innerHeight − topo − 24`).

### 5.5.1 Layout
`flex h-full w-full gap-3` com duas colunas:
1. **Paleta (esquerda)** — `surface-flat no-elevation flex w-60 xl:w-72 shrink-0 flex-col overflow-hidden rounded-3xl text-white`. Recolhida vira uma faixa `w-10` (ícone de abrir, `pt-4`, `white/40 → white`); abre recolhida abaixo de 1100px.
2. **Coluna central** `flex min-w-0 flex-1 flex-col gap-3`:
   - **Barra superior flutuante (Toolbar)** — fora do canvas, em pílulas `liquid-glass no-elevation rounded-full`: à esquerda `py-1.5 pl-2 pr-4` com **nome do mapa** (input `w-48 sm:w-56 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-sm font-medium`, hover `bg-white/[0.06]`, foco `bg-white/[0.08]`), **seletor de mapa** (Select do sistema, `h-8 min-w-[9rem] max-w-[14rem] rounded-lg bg-white/[0.06] text-xs font-medium text-white/80`, item focado roxo `#6829C0`) e estado “✓ salvo” (`Check 12px text-emerald-400`) / “salvando…” `text-[11px] text-white/40`; à direita `ml-auto` botões `LiquidGlassButton h-9 px-4 text-xs font-medium` (Novo mapa, Exportar, Importar, Excluir…).
   - **Canvas** `liquid-glass no-elevation flex min-h-0 flex-1 overflow-hidden rounded-2xl` com o React Flow dentro (`colorMode="dark"`, classe `funnel-flow`, fundo de **pontos** `#2a2a30`, `gap 20`/tamanho `1.4`, grade de encaixe `GRID`).

### 5.5.2 Paleta (Palette)
- **Busca** `border-b white/5 px-4 py-3`: campo `rounded-lg bg-white/[0.03] px-2.5 py-1.5` com lupa 13px `white/40`, texto `text-sm`.
- **Abas** (pílulas segmentadas, `gap-1 p-2 border-b white/5`): **Fontes · Páginas · Ações · Offline**, `rounded-full px-1 py-1.5 text-xs font-semibold`; ativa = fundo claro, inativa `white/40`.
- **Corpo** rolável (`scrollbar-hide px-3 pt-3`), em **seções** com título `text-[11px] font-semibold text-white/40` + `border-b white/5 pb-1` (Pago, Busca, Social, Outros…). Cada item é um **ícone redondo de marca** (Facebook, Instagram, Google, Bing, LinkedIn, YouTube, X, TikTok, Pinterest, Reddit, WhatsApp, E-mail…) com legenda `text-[9px] leading-tight text-white/50` truncada, em grade `flex flex-wrap gap-x-1 gap-y-2`, item `w-16 rounded-lg p-1 hover:bg-white/5 cursor-grab`. Mídia paga leva um **selo `$` verde** no canto.
- Cada aba termina com o tile tracejado **“Criar”** (`h-11 w-11 rounded-full border-2 border-dashed border-white/20`), que solta um card totalmente editável.
- **Ferramentas** (chips): **Nota** (`border-amber-400/30 bg-amber-300/10 text-amber-300`), **Imagem** (`border-white/10 bg-white/[0.03] text-white/70`), **Forecast** e **Funil** (`border-porceli-purpleLight/30 bg-porceli-purple/10 text-porceli-purpleLight`). Arrastar-e-soltar no canvas cria o nó.

### 5.5.3 Cards do canvas (cores = Dashboard, sólidas, sem vidro)
O fundo do mapa é escuro, então os cards são **majoritariamente claros**:
- **Card padrão (LIGHT)**: `rounded-2xl border border-black/10 bg-[#F4F4F4] shadow-lg shadow-black/40`; texto `#2F2D2E`, apoio `#2F2D2E/60`, rótulos `#2F2D2E/50`, faixa de entradas `border-black/[0.08] bg-black/[0.05]`, pílula da taxa `bg-[#6829C0] text-white ring-1 ring-black/10`, positivo `green-600`, negativo `red-600`.
- **Card de conversão (ACCENT)** — o que tem ticket médio: `border-white/15 bg-[#6829C0]`, texto branco, apoio `white/60`, faixa `bg-white/[0.12]`, pílula `bg-white/20 ring-white/20`, positivo `green-300`, negativo `red-300`.
- **Seleção**: contorno `outline-2 outline-offset-2 outline-[#8B5CF6]` (não briga com a borda). **Balão de campos** (abre à direita do card, `w-60 p-3.5`): `rounded-2xl border border-black/10 bg-[#F4F4F4] shadow-xl shadow-black/40`; campos de 10px `#2F2D2E/60`, caixas `accent-porceli-purple`, “Mostrar” `text-[9px] font-black uppercase tracking-widest`.

**Nó de funil (FunnelNode)** `w-40`: faixa de **entradas** no topo (uma linha por conexão: nome da origem `text-[10px]` truncado, **campo da taxa em pílula roxa** editável `w-8 text-right font-black tabular-nums` + “%”, e as **pessoas** que chegam `w-9 text-right font-black`); cabeçalho `px-3.5 py-3` com chip de ícone `h-5 w-5 rounded-md` na cor da marca e nome `text-[12px] font-bold` (editável); **métricas**: `text-2xl font-black leading-none tabular-nums tracking-tight` + “pessoas” `text-[9px] font-black uppercase tracking-widest`, e linhas `gasto`, `até aqui`, `CPL`, `CAC vs máx.` (vermelho se passar do teto, verde se dentro), `receita` (verde), `lucro` (verde/vermelho). Selo âmbar `h-4 w-4 bg-amber-400` no canto (aviso).
**Nó de página (PageNode)** `w-40`: faixa de entradas + **barra de navegador** (`border-b px-3.5 py-1`, URL `text-[9px]` truncada, bolinha de status do site `h-1.5 w-1.5` verde/vermelha/cinza, botão refresh 9px que gira ao checar) + **prévia** `h-20` (captura da página com `object-cover object-top` ou **esboço**: ícone 13px + 3 barrinhas `h-1.5 rounded-full` a 100/80/60% e botão `h-4 rounded text-[7px] font-bold uppercase`) + nome `text-[12px] font-bold`.
**Nota** (post-it âmbar) e **Imagem**: nós livres.
**Forecast (ForecastNode)** `w-[26rem]`, roxo `#6829C0` com borda `white/15`: cabeçalho `border-b white/10 px-4 py-2.5` (`Chart 14px`, “FORECAST” `text-[10px] font-black uppercase tracking-widest white/60`, lixeira que aparece no hover); grade `grid-cols-2 gap-px bg-white/10` de **blocos de KPI** `bg-[#4a1d8f] p-3.5` (rótulo `text-[9px] font-black uppercase tracking-widest white/50`, valor `text-base font-black tabular-nums`); linha de **ROI** (`text-sm font-black`, “x”); e **tabela dos 4 cenários** `grid-cols-[0.9fr_repeat(4,minmax(0,1fr))] text-[10px]` com a coluna ativa em branco e as outras `white/45`.
**Funil (FunnelChartNode)** `w-[24rem]` claro (`#F4F4F4`, `p-4`): título “FUNIL” `text-[10px] font-black uppercase tracking-widest`, selo do cenário `bg-[#6829C0] text-white text-[9px]`; por etapa um **trapézio** `h-11` (clip-path) em tom de roxo — **`#8B5CF6 → #7C4DE0 → #6829C0 → #5A22A8 → #4A1D8F → #3D1877`** — ao lado do nome (`text-[11px] font-bold`), pessoas (`text-sm font-black`), % do passo (`text-[10px]`) e receita verde `text-[10px] font-black text-green-600`; rodapé com “do topo ao fim” `border-t border-black/[0.08] pt-2.5`.

### 5.5.4 Conexões
- **Pontos de entrada/saída**: barrinha vertical `h-4 w-1 rounded-full` colada à borda, **só visível no hover ou com o card selecionado**; entrada branca `rgba(255,255,255,.55)`, saída roxa `#8B5CF6`; área de clique `!h-7 !w-3`. `ConnectionMode.Strict` (a linha nasce da saída e termina na entrada); soltar no vazio abre um menu rápido para criar o próximo card.
- **Linha (PathEdge)**: roxa `#6829c0`, ponta de seta `MarkerType.ArrowClosed`, **selo da taxa no meio** `rounded-full bg-[#6829c0] px-1.5 py-0.5 text-[10px] font-black tabular-nums text-white` (taxa do cenário ativo). Selecionada, mostra uma **mini-barra** `rounded-xl border border-white/10 bg-[#2F2D2E] shadow-lg` com ações (separadores `w-px bg-white/10`, botões `h-6 w-7`) — excluir a linha **não** exclui os cards.

### 5.5.5 Barra de ações dentro do canvas (topo-centro, `Panel`)
- Segmentos `rounded-xl border border-white/10 bg-[#1c1c20]/90 p-1 shadow-lg`:
  1. **Cenário** (abas `role=tablist`): *Pessimista* (ativo `bg-red-500/20 text-red-300`), *Médio* (`bg-white/15 text-white`), *Otimista* (`bg-emerald-500/20 text-emerald-300`), *Real* (`bg-[#6829C0] text-white`); `rounded-lg px-2.5 py-1 text-[11px] font-semibold`, inativo `white/45`.
  2. **Ferramentas**: desfazer, refazer, | duplicar, arrumar em colunas, encaixe na grade (ligado destaca) — separador `h-4 w-px bg-white/10`.
  3. **Alinhar** (só com 2+ cards selecionados): esquerda, centro-h, direita, topo, centro-v, base, distribuir h/v.
- **Guias de alinhamento** (linhas) aparecem ao arrastar perto de outro card; o card **fica onde foi solto** (com encaixe opcional na grade).
- **Controles de zoom** (`.funnel-flow .react-flow__controls`): `rgba(28,28,32,.9)`, borda `white/10`, raio 12, botões transparentes `#d4d4d8` (hover `white/.08`). **Minimapa**: `rgba(22,22,26,.9)`, borda `white/10`, raio 12, máscara `rgba(0,0,0,.6)`, arrastável/zoomável.
- **Interação “Figma”**: arrastar no vazio = caixa de seleção; **Espaço + arrastar** = mover a tela; Shift/Ctrl/Meta = somar à seleção; atalhos Ctrl+Z, Ctrl+Shift+Z, Ctrl+D, Ctrl+C/V.

### 5.5.6 Modelo (o que os números significam)
Taxa **por conexão** (`rateLow/rateHigh/rateReal`), cenários `low|mid|high|real` (o médio é a média; editar o otimista abaixo do pessimista ajusta o outro limite), custo **acumulado** passo a passo, **CAC máximo = ticket × margem**, e o **custo por lead** só entra no primeiro passo de lead (marcado).

---

## 5.6 Padrão Master-Detail (Contratos e Clientes) — [components/ui/MasterDetail.tsx]

É o componente mais “autoral” do sistema: **lista à esquerda + painel à direita, com a linha selecionada virando uma aba que se funde ao painel**.

- **Caixa externa** `surface-flat no-elevation flex rounded-3xl p-3.5`, altura = o que sobra da janela (`innerHeight − topo − 32`, mínimo configurável: 280px Contratos, 520px Clientes).
- **Coluna de itens** `w-[220px] shrink-0 overflow-hidden`, lista `h-full overflow-y-auto scrollbar-hide` com **máscara de fade** de 40px em cima/embaixo (só do lado que ainda tem conteúdo). Cada linha: `h-[52px] w-full px-4 gap-3` (`MASTER_ROW_H = 52`), **sem hover** (pedido do usuário).
- **A aba**: um retângulo `h-[52px] rounded-l-2xl` pintado com **`rgba(255,255,255,.07)`** (`PANEL_BG`, o mesmo do painel) que desliza atrás das linhas por **mola** (`stiffness 420, damping 38`) até a linha selecionada, acompanhando a rolagem da lista. Dois **cantos côncavos** de `16×16` (`radial-gradient(circle at top left, transparent 15.5px, PANEL_BG 16px)`), um acima e outro abaixo da aba, fundem-na ao painel. Os cantos do painel do lado esquerdo (`borderTopLeftRadius`/`borderBottomLeftRadius`) vão de `0` a `16px` conforme a aba encosta ou sai das pontas.
- **Painel** `min-w-0 flex-1 rounded-2xl overflow-hidden` com o mesmo `rgba(255,255,255,.07)`; conteúdo `h-full space-y-3 overflow-y-auto scrollbar-hide p-4`.
- **Nome na lista** (`NAME_FADE`): `overflow-hidden` com máscara `linear-gradient(to right, black calc(100% − 28px), transparent)` — nomes longos esmaecem em vez de cortar.
- **Linha selecionada**: nome `text-[13px] font-semibold` branco com **`scale 1.15`** (`origin-left`, 250ms; crescer o texto, não a coluna); não selecionada `text-white/40`. Sub-linha de 14px (`relative h-[14px] mt-0.5`) com **cross-fade** (`AnimatePresence`): selecionada mostra a métrica (Contratos: “MRR: R$ …” `text-[11px] text-white/50` com valor verde `green-400 font-bold`; Clientes: “Gerou: R$ …” idem), não selecionada mostra o contador/plano `text-[10px] text-white/30`.

---

## 5.7 Contratos (`/contracts`) — [pages/Contracts.tsx, components/Contracts/*]

**Estrutura:** `space-y-6 md:space-y-8 animate-fade-in`:
1. **Cabeçalho** (`ContractsHeader`): `flex items-center justify-between mb-8` com um espaço vazio à esquerda (sem título) e, à direita, **Novo Contrato** (`LiquidGlassButton tint="primary" h-11 px-6 text-xs font-bold uppercase tracking-widest`, no `motion.div` padrão).
2. **Atenção Prioritária** (só se houver contratos a vencer): `surface-flat no-elevation rounded-3xl overflow-hidden`; cabeçalho `p-6 border-b white/5` com `Danger 16px text-yellow-500` + título `text-xl font-bold tracking-tight`; linhas `divide-y divide-white/5`, cada uma `px-4 sm:px-6 py-4 hover:bg-white/[0.04]` com **chip de ícone** `w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/10` (Calendar 20px amarelo), nome `font-semibold` truncado, legenda “Tipo • Vence em dd/mm/aaaa” `text-xs text-white/40`, à direita “RESTAM” `text-[10px] text-yellow-500/60 font-black uppercase tracking-widest` + “N dias” `font-black`, e botão **Renovar Agora** (`h-9 px-6 text-xs font-bold uppercase tracking-widest`).
3. **Master-Detail** (seção 5.6): itens = clientes. Bolinha de status `w-2 h-2` (`yellow-500` se algum contrato vence, senão `green-500` ativo, `blue-500` concluído, `white/20`).
   - **Painel**: um **card por contrato** `bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] rounded-2xl px-5 py-4` (`lg:flex-row`), com: chip de ícone `DollarCircle` (cor pelo status), grade de 3 colunas — **tipo** (`text-sm font-bold`, link `ExportSquare 12px text-white/20 → hover primary` para abrir o contrato), **VALOR** (`text-[10px] font-black uppercase tracking-widest text-white/30` + `R$ x` `font-bold` + “/mês” `text-white/20`) e **VIGÊNCIA** (`Calendar 12px opacity-40`, datas `text-xs text-white/50`, seta “→” a `opacity-30`) — e ações **Editar · Renovar · Excluir** (`LiquidGlassButton h-8 px-4 text-[10px] font-bold uppercase tracking-widest`, Excluir `tint="danger"`).
   - Estado de borda por status: `border-l-green-500` (ativo), `border-l-yellow-500` (a vencer) etc.
4. **Vazio**: `surface-flat no-elevation rounded-3xl p-20 text-center` com bloco `w-20 h-20 rounded-[2.5rem] bg-white/5 border-white/5` e `DocumentText 40px text-white/20`, título “Vazio por aqui” `text-xl font-bold`, texto `text-sm text-white/40 max-w-xs`.
5. **Carregando** (skeleton, antes do dado): barras `bg-Porceli-gray-700 rounded animate-pulse` (`h-8`, 3 × `h-24`, `h-40`).

**Modal Renovação** (`max-w-3xl`, chip “Renovação de Contrato”): corpo `p-6` com `maxHeight 65vh` e rolagem, `space-y-8`; bloco “Contrato vigente” `bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5` com grade 2/4 colunas (Plano, Valor, … rótulos `text-[10px] text-white/20 uppercase font-black tracking-widest`, valores `text-sm font-bold`); formulário novo + **prévia de cobrança** (ContractBillingPreview); rodapé fixo com Cancelar/Renovar. Mesmos padrões para Novo Contrato, Editar e Excluir.

> `ContractsKPIs` e `ContractsSearch` existem no repositório mas **não são usados** pela página atual (KPIs antigos em `bg-Porceli-gray-800`, 4 colunas `gap-6`).

---

## 5.8 Clientes (`/clients`) — [pages/Clients.tsx, components/Clients/*]

**Estrutura:** `space-y-6 md:space-y-8 animate-fade-in`:
1. **Busca + ações** (`ClientsSearch`): `flex flex-col md:flex-row gap-4` — campo `relative flex-1` com lupa 16px `white/40` à esquerda, input `pl-10 h-11 rounded-xl bg-white/[0.03] border-white/5 placeholder:white/40`; à direita dois `LiquidGlassButton h-11 px-6 text-xs font-bold uppercase tracking-widest` (**Filtros**, com ícone `Filter 16px`, e **Novo Cliente** `tint="primary"`).
2. **KPIs** (`ClientsKPIs`): `grid-cols-1 md:grid-cols-4 gap-6` de **StatsCard** (4.9): Total de Clientes · Clientes Ativos · Contratos A Vencer · Clientes Inativos (ícone `Building`, `animation-delay` 100/200/300/400ms).
3. **Mapa de Clientes**: card `surface-flat p-5`; título “Mapa de Clientes” `text-sm font-semibold text-white` + contador `text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full` (“N no mapa”). O mapa (`react-simple-maps`, Brasil por estados) tem altura **420px**: estado vazio `fill rgba(255,255,255,.02)`; com clientes a rampa de roxo **`rgba(104,41,192,.30 / .50 / .65 / .82)`** (1, 2, 3, 4+), traço `rgba(104,41,192,.70)` (vazio `.20`); hover `rgba(124,58,237,.90)` com traço `rgba(104,41,192,.8)`; rótulo flutuante `px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-xl`.
4. **Lista de clientes** (`ClientsList` = Master-Detail, mín. 520px): ordenada **ativos → a vencer → vencidos → inativos → sem situação**, e alfabética dentro de cada grupo (pt-BR). Bolinha de situação (`green-500` ativo, `yellow-500` a vencer, `red-500` vencido, `white/20` demais). Selecionado mostra “Gerou: R$ …” (soma do que o cliente já pagou); os demais, o nome do plano ou “Sem plano” (`text-[10px] white/30`).
   - **Painel (ClientDetailPanel)**: **card de cabeçalho** `rounded-2xl border border-white/[0.06] bg-white/[0.04] px-5 py-4` — nome `text-lg font-bold`, **selos** `Badge px-2 py-0.5 text-[10px] font-black uppercase tracking-widest` (situação: ativo `bg-green-600`, a vencer `bg-yellow-600`, vencido `bg-red-600`, outro `Porceli-gray-600`; plano na cor do plano), linha “Pagamento: dia N” (`Calendar 16px text-primary`, `text-sm font-medium text-white/50`) e botões **Editar** / **Excluir** (`h-8 px-4 text-[10px] font-bold uppercase tracking-widest`, mola de 400/17). **Card de dados** (mesmo estilo) com grade `md:grid-cols-2 gap-x-10 gap-y-5` de campos: chip `h-8 w-8 rounded-lg bg-white/5` com ícone `h-4 w-4 text-primary`, rótulo `text-[10px] font-black uppercase tracking-widest text-white/40` e valor `font-medium text-white` truncado — CNPJ, E-mail, Responsável, Início do contrato, Telefone, Fim do contrato, Grupo ID, Valor mensal (`text-lg font-bold tracking-tight`).
5. **Modais**: Novo/Editar cliente (`max-w-3xl max-h-[85vh] !overflow-hidden`, chip “Novo Cliente”; corpo `custom-scrollbar` com seções de título `text-sm font-black uppercase tracking-[0.2em] text-white/40` + grade `md:grid-cols-2 gap-6`; dica final “💡 Plano, valores e datas são definidos ao criar um contrato”), Excluir, e **painel de Filtros** deslizante pela direita (`fixed inset-y-0 right-0 w-full max-w-md p-4`, `modal-legivel !rounded-3xl`, overlay `bg-black/50 backdrop-blur-[10px]`, cabeçalho `p-6 border-b` com “Filtros” `text-2xl font-bold tracking-tight`).

---

## 5.9 Financeiro (`/financial`) — [pages/Financial.tsx, components/Financial/*]

> **Estado de migração:** esta página ainda usa `liquid-glass dashboard-glow` (vidro **translúcido**) nos blocos de lista; as páginas Notas, Contratos, Clientes, Agentes e Funil já migraram para `surface-flat`. É a próxima candidata a ganhar o cinza sólido do Dashboard.

**Estrutura:** `space-y-6 md:space-y-8 animate-fade-in`.
1. **Cabeçalho** (`FinancialHeader`): `flex items-center justify-between`, esquerda vazia; à direita `gap-3`: botão quadrado **sincronizar** (`LiquidGlassButton w-11 h-11`, ícone `Refresh 16px`, gira e fica `text-primary` enquanto sincroniza; tooltip “Gerar e Atualizar Lançamentos Faltantes”) e **Nova Transação** (`tint="primary" h-11 px-6 text-xs font-bold uppercase tracking-widest`), ambos no `motion.div` padrão.
2. **KPIs** (`FinancialKPIs`): `grid-cols-1 md:grid-cols-4 gap-6` de StatsCard (4.9) — **Previsão do Mês · Faturamento do Mês · Despesas do Mês · Lucro do Mês** (ícone `DollarCircle`, valores `R$ 1.234`, `animation-delay` 100/200/300/400ms).
3. **Pagamentos em Atraso** (só se houver): `Card liquid-glass dashboard-glow border border-white/5 overflow-hidden`. Cabeçalho `p-4 sm:p-6 border-b white/5` com título `text-xl font-bold tracking-tight`, legenda `text-white/40 text-sm` (“N faturas”) e total **`text-red-500 font-black text-xl`**. Agrupado **por cliente** (`divide-y divide-white/5`): linha clicável `p-4 sm:p-6` com seta `ArrowRight2/ArrowDown2 20px` (`white/40 → hover primary`), nome `text-lg font-semibold`, contador `text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full`, valor `text-red-500 font-bold text-sm` e botão `h-9 px-4 text-xs font-bold uppercase tracking-widest`; ao abrir, um bloco interno `bg-white/[0.02] border border-white/5 rounded-2xl` com uma linha por fatura (`px-4 sm:px-6 py-4`, divisor `border-t white/5`): **Referência / Vencimento / Valor** em rótulos `text-[10px] uppercase font-black tracking-widest text-white/40` e valores `font-medium text-white/70` (valor `font-bold text-white`) e botão de ação.
4. **Lançamentos Financeiros**: mesmo `Card`, cabeçalho com título `text-xl font-bold`, subtítulo `text-white/40 text-sm mt-1` e **filtros** em `LiquidGlassButton h-9 px-4 text-xs font-bold uppercase tracking-widest` — **Todos · Em Aberto · Pagos · Mês Atual** (o ativo `tint="primary"`, os outros neutros). Linhas `p-4 sm:p-6 hover:bg-white/[0.04] group` com nome `text-lg font-semibold w-1/3 truncate`, trio Valor/Referência/Vencimento e ação: **“Receber”** (botão) ou texto **“Pago”** `text-green-500/50 font-bold text-sm`. Estados: carregando (spinner `w-8 h-8 border-2 border-Porceli-purple border-t-transparent animate-spin`), vazio (`TrendDown 64px text-white/40`, “Nenhum lançamento encontrado”).
5. **Despesas**: mesmo desenho; descrição `text-lg font-semibold` com categoria `text-[10px] font-black uppercase tracking-widest text-white/40`, Data, **Recorrência** (`Badge bg-white/5 text-white/70 border-white/10 rounded-lg py-0.5 px-2 text-xs`) e Valor; ações Pagar/Excluir; rodapé **“Total de Despesas Pendentes”** `text-white/40 font-bold uppercase tracking-widest text-xs` + valor `text-white font-black text-xl sm:text-2xl tracking-tighter`.
6. **Projeção de Faturamento Anual** (`ProjectionChart`, `liquid-glass border-white/[0.05] dashboard-glow w-full`): título `text-lg font-semibold`; KPIs com barrinha colorida — **Faturamento do ano `#8B5CF6`**, **Média Mensal `#6366F1`**, **Contratos Ativos `#D8B4FE`** (rótulo `text-sm font-medium text-white/40`, valor `text-2xl font-semibold`); gráfico de área `h-[400px]` com gradiente `#8B5CF6` de `.6` (5%) a `.1` (95%), grade horizontal `rgba(255,255,255,.05)`, cursor tracejado e tooltip idêntico ao do Dashboard (`rounded-xl border-white/10 bg-black/80 backdrop-blur-xl`).
7. **Modais** (chip, `max-w-md max-h-[85vh] !overflow-hidden`): **Nova Despesa** (descrição, valor, categoria, data, recorrência; inputs `h-12 rounded-xl bg-white/[0.03] border-white/[0.05] shadow-inner`, labels `text-sm font-medium text-white/70 ml-1`), **Renegociação**, **Excluir despesa**. O gatilho “+” da despesa é `LiquidGlassButton tint="danger" h-11 px-6`.

---

## 5.10 Automações (`/automations`) — [pages/Automations.tsx]

**Estrutura:** `space-y-6 md:space-y-8 animate-fade-in`.
1. **Cabeçalho** `flex items-center justify-between` (esquerda vazia) com um **contador** à direita: `px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06]`, bolinha `w-2 h-2` (verde `green-400 animate-pulse` se há ativas, `white/20` se não) e “N ativas” `text-xs text-white/50`.
2. **Carregando**: spinner `Loader2 w-8 h-8 text-primary animate-spin` + “Carregando automações…” `text-sm text-white/40` (centralizado, `py-24`).
3. **Um `Card` por categoria**, na ordem **Financeiro · Atividades · Sistema** (`liquid-glass border-white/5 dashboard-glow overflow-hidden`): cabeçalho `p-6 border-b white/5` com título `text-xl font-bold tracking-tight`, legenda `text-white/40 text-sm mt-0.5` e, à direita, **ponto + nome** da categoria (`w-2 h-2` + `text-xs font-semibold uppercase tracking-wider`). **Cores por categoria**: Financeiro `green-400` (badge `bg-green-500/15 text-green-400 border-green-500/20`, fundo `rgba(34,197,94,.08)`, borda `.2`); Atividades `primary` roxo (badge `bg-primary/15 text-primary border-primary/20`, fundo `rgba(104,41,192,.12)`, borda `.25`); Sistema cinza (badge `bg-white/10 text-white/50 border-white/10`, fundo `rgba(148,163,184,.06)`, borda `.15`).
4. **Linha de automação** (`divide-y divide-white/5`, hover `bg-white/[0.04]`): nome `text-white font-bold tracking-tight` + **selo da categoria** `text-[10px] px-2 py-0.5 rounded-full border font-medium`; descrição `text-white/40 text-sm line-clamp-1`; coluna **Frequência** (`hidden md:block w-52`; rótulo `text-[10px] uppercase font-black tracking-widest text-white/40`, ícone `Clock`/`Link2 12px white/20`, valor `text-sm font-medium text-white/70`), coluna **Último envio** (`hidden lg:block w-44`, `TickCircle 14px green-400/70` ou `Warning2 white/20`) e ações: **editar** `w-9 h-9 rounded-xl text-white/40 hover:bg-white/[0.06] hover:border-white/10`, **executar agora** (`Play`, hover `text-green-400 bg-green-400/[0.08] border-green-400/20`, spinner enquanto roda) e **Switch** (`data-[state=checked]:bg-primary`).
5. **Modal de edição** (`max-w-md !p-0 !gap-0`): cabeçalho `p-6 border-b` com ícone da automação em `w-10 h-10 rounded-xl` e título `text-sm font-semibold` + selo; corpo `p-6 space-y-5` — descrição `text-sm text-white/50 leading-relaxed`; **Horário (Brasília)** em campo de hora `rounded-xl bg-white/[0.04] border-white/[0.08] focus:border-primary/40` (mostra o cron UTC equivalente `text-xs text-white/40`); automações por evento mostram uma caixa informativa `px-3 py-2.5 rounded-xl bg-white/[0.04] border-white/[0.06]` (com `Link2`) e as de minuto, bolinha `bg-primary animate-pulse`; rodapé `p-6 border-t` com Cancelar (`tint="danger"`) e **Salvar** (`tint="primary"`, `flex-1 h-10`).

---

## 5.11 Agendamentos (`/scheduled-messages`) — [pages/ScheduledMessages.tsx]

Mensagens de WhatsApp programadas.
1. **Cabeçalho** `flex items-center justify-between`: à esquerda `Clock 16px` + texto `text-white/40 text-sm` (fuso de Brasília).
2. **Filtros + ação** `flex items-center justify-between gap-4 flex-wrap`: abas **Todas · Agendadas · Enviadas · Falhou · Canceladas** em botões `h-9 px-4 rounded-xl text-xs font-medium border` — ativa `bg-primary/20 border-primary/40 text-primary`, inativa `bg-white/[0.03] border-white/[0.06] text-white/40` (hover `bg-white/[0.06] text-white/70`), com a **contagem** `ml-1.5 opacity-60`; à direita **Agendar mensagem** (`tint="primary" h-11 px-6 text-xs font-bold uppercase tracking-widest`).
3. **Card “Mensagens”** (`liquid-glass dashboard-glow border border-white/5 overflow-hidden`): cabeçalho `p-6 border-b` (título `text-xl font-bold`, contagem `text-white/40 text-sm`); lista `divide-y divide-white/5`. **Linha**: chip de status `w-9 h-9 rounded-xl border` (ícone 16px), nome/destinatário (`text-sm font-semibold` + “•” + “Responsável/Grupo/Número avulso: telefone” `text-xs text-white/50`), prévia da mensagem `text-xs text-white/40 line-clamp-1`, erro em `text-red-400/70`; à direita **selo de status** `text-[10px] px-2 py-0.5 rounded-full border`, data/hora BRT `text-xs text-white/40` e ação (Cancelar) `h-9 px-4`.
   - **Status**: Agendada `bg-amber-500/15 text-amber-400 border-amber-500/20` (Clock) · Enviada `bg-green-500/15 text-green-400` (TickCircle) · Falhou `bg-red-500/15 text-red-400` (Warning2) · Cancelada `bg-white/10 text-white/40` (Forbidden).
   - **Vazio**: bloco `w-14 h-14 rounded-2xl bg-white/[0.04] border-white/[0.06]` com Clock `text-white/20` e frase `text-white/40 text-sm` (+ link “Limpar filtro” `text-primary`).
4. **Modal Agendar** (chip; labels `text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]`): destinatário (responsável, grupo ou avulso; clientes de `useClients`), mensagem, **Data** e **Hora** (pickers padrão, seção 4.1; hora em BRT convertida para UTC), rodapé com dois botões `h-12 flex-1 text-xs font-bold uppercase tracking-widest` (Cancelar / **Agendar** com `Send2`).

### Aviso de WhatsApp desconectado (global) — [components/Layout/WhatsappBanner.tsx]
Faixa **`sticky top-3 z-40 mb-4 rounded-2xl border px-4 py-3 shadow-xl`**, `role="alert"`, acima do conteúdo de qualquer página: **vermelha** (`border-red-500/40 bg-[#2b1115] text-red-100`, ícone `Danger 20px text-red-400`) quando caiu — “WhatsApp desconectado desde {data}” em negrito + texto `text-red-100/80` + detalhe `text-xs text-red-100/50`; **amarela** (`border-yellow-500/40 bg-[#2a2310] text-yellow-100`) quando o monitor parou de atualizar (“O monitor do WhatsApp parou de atualizar”). Alimentada pela tabela `whatsapp_status` (checagem a cada 2 min).

---

## 5.12 Notas (`/notes`) — [pages/Notes.tsx, features/notes/**]

Mural de **post-its** com janelas flutuantes, uma **pauta** de ganchos de conteúdo e **quadros** (mapa mental / fluxograma). Sem cabeçalho de título nem cards de números; a página sobe 8px (`md:-mt-2`) para começar a **16px do topo**, na faixa da barra lateral.

### 5.12.1 Estrutura (abas Notas / Pauta / Quadros)
`space-y-6 animate-fade-in md:-mt-2 md:space-y-8` → grade `grid gap-4 lg:grid-cols-[236px_1fr]` (a coluna de pastas some na aba Pauta).

**Coluna de pastas** — `aside surface-flat space-y-4 overflow-y-auto p-3.5 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]`: fica **colada** do topo ao fundo da janela (a mesma faixa da barra lateral) e rola por dentro se houver pastas demais.
- Cabeçalho “PASTAS” `text-[10px] font-black uppercase tracking-widest text-white/40`.
- **Lista de um nível** (sem árvore do Obsidian): “Todas” + as pastas de primeiro nível (a raiz “Áreas” do cofre fica oculta), cada uma com total do ramo à direita (`text-[10px] text-white/30`). Linha `rounded-xl px-2.5 py-1.5 text-[13px]`, ícone `Folder2 13px text-white/35`, nome `text-white/70` (selecionada `text-white` + `bg-white/10`), hover `bg-white/[0.06]`. **Ao selecionar uma pasta, as subpastas dela aparecem logo abaixo, só um nível** (`ml-5`, ícone 12px); o que é mais fundo fica dentro da subpasta (filtrar traz o ramo inteiro). “Sem pasta” aparece se houver notas soltas. Lixeira por linha (`red-400`) no hover, que **troca de lugar** com a contagem.
- **“+ Nova pasta”** (`text-white/40 → hover white/80`) abre um campo inline `rounded-xl bg-white/10 px-2 py-1`; a pasta nasce com a primeira nota dentro (pasta = caminho da nota, não registro). Dentro de uma pasta selecionada: “Nova pasta em {nome}”.

**Barra de busca/abas** — `surface-flat flex flex-wrap items-center gap-3 p-3.5`: pílula segmentada `rounded-full bg-white/[0.04] p-1` com **notas / pauta / quadros** (`rounded-full px-4 py-1.5 text-sm capitalize`; ativa `bg-white/90 font-bold text-black`, inativa `text-white/55 → hover white/80`); busca `min-w-[180px] flex-1 rounded-full bg-white/[0.04] px-3.5 py-2` com lupa 16px `white/35`, placeholder “Buscar notas…” `white/25`; à direita (`ml-auto`) os botões de criação — **Nova nota** (`tint="primary" h-11 px-6 text-xs font-bold uppercase tracking-widest`, no `motion.div` padrão) ou, em Quadros, **Mapa mental** (primary) e **Fluxograma** (neutro), `h-11 px-5`.

### 5.12.2 Mural de post-its (PostItWall)
- Colunas CSS `columns-1 gap-3 sm:columns-2 xl:columns-3 2xl:columns-4`, cards `mb-3 break-inside-avoid`.
- **Card**: `post-it block w-full overflow-hidden rounded-2xl p-4 text-left`, hover `-translate-y-1` (200ms). **Fundo = tinta do papel por cima do cinza sólido `#2F2D2E`** (`linear-gradient(tinta, tinta), #2F2D2E`) — **sem transparência**. A classe `.post-it` copia só os 7 insets do bevel do vidro + `0 2px 8px .22` e `0 12px 28px .28` (no hover `0 4px 12px .28` / `0 20px 44px .34`); aberto na mesa ganha um **anel interno `1.5px` na cor do papel** (`--fita`). Sem backdrop-filter (mural de ~90 cards + tarja de brilho).
- **Paleta (6 papéis, escolhida por hash do id)** — tinta / fita: roxo `rgba(104,41,192,.16)` / `rgba(168,132,255,.75)`; azul `rgba(30,110,170,.15)` / `rgba(120,200,255,.70)`; verde `rgba(25,130,100,.15)` / `rgba(130,230,190,.70)`; âmbar `rgba(170,115,25,.15)` / `rgba(255,200,120,.70)`; rosa `rgba(175,40,70,.15)` / `rgba(255,150,170,.70)`; cinza-azul `rgba(90,90,120,.16)` / `rgba(190,190,220,.65)`.
- Conteúdo: **fita** `h-1 w-10 rounded-full` na cor da fita; título `text-sm font-black leading-snug tracking-tight` (2 linhas); bolinha âmbar `h-1.5 w-1.5` quando “pendente” de envio ao cofre; prévia `text-xs leading-relaxed text-white/55` (até 7 linhas); vazia = “vazia” em itálico `white/25`; rodapé `border-t border-white/[0.07] pt-2.5` com pasta (ícone `Folder2 11px`, nome da **última** pasta `text-[10px] font-black uppercase tracking-widest text-white/35`). **Sem etiquetas.**

### 5.12.3 Janelas flutuantes (PostItWindow)
- `surface-flat !fixed flex flex-col overflow-hidden`, tamanho padrão `420×480`, cascata de `30px` (volta a cada 6 janelas), arrastável e **redimensionável** (alça `cursor-nwse-resize` no canto, `white/20 → white/50`). A ativa ganha **contorno `1.5px` na cor da fita**; mobile = tela cheia sem raio.
- **Cabeçalho = alça de arrasto** `border-b border-white/[0.07] px-3.5 py-2.5`: pontinho da cor da fita `h-1.5 w-1.5`, título `text-xs font-black tracking-tight text-white/85`, selo **“pendente”** `rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-300`, e ícones `rounded-full p-1.5 text-white/45` — **sincronizar** (`Refresh 14px`, gira enviando; hover `bg-white/10`), **excluir** (hover `bg-rose-500/15 text-rose-300`) e **fechar**. Corpo `min-h-0 flex-1 overflow-y-auto p-4`.
- **Editor (NoteEditor)** `space-y-3`: título `text-lg font-black tracking-tight` transparente; editor **WYSIWYG** (Tiptap) em caixa `min-h-[140px] rounded-2xl bg-white/[0.02] p-3`, com barra de formatação `border-b border-white/[0.07] pb-2` (grupos separados por `h-4 w-px bg-white/10`), tabela criável por seletor, citação, **menu `/`** de comandos (`MenuComandos`: `fixed z-[9999] max-h-[280px] w-64 rounded-2xl border-white/10 bg-[#17171c]/95 p-1.5`, item ativo `bg-white/10`, ícone em `h-7 w-7 rounded-lg bg-white/[0.06]`) e **links `[[`** entre notas; alternativa em código (`font-mono text-[13px] min-h-[240px] rounded-2xl bg-white/[0.03]`). **Ficha** escondida atrás de um ícone (`InfoCircle`): campo de **pasta** `rounded-xl bg-white/[0.04] px-2.5 py-2` com sugestões (datalist) e chips “Apontam pra cá” (retrolinks, `rounded-full bg-white/[0.07] px-2 py-0.5 text-[11px]`); rodapé com data `text-[10px] text-white/25` e botão `Code1` (ativo `bg-white/90 text-black`).
- Gravação **500ms** após parar de digitar; **fechar grava na hora** (descarrega o temporizador); excluir pede confirmação (modal `AlertDialog` “ConfirmarExclusao”, que também serve para pasta e mostra a quantidade de notas).

### 5.12.4 Pauta de conteúdo (aba “pauta”) — [pauta/PautaTable.tsx, RoteiroModal.tsx]
- **Barra de filtros** `surface-flat flex flex-wrap items-center gap-2 p-3.5`: busca (“Buscar gancho…”) em pílula; **dois Selects do sistema** — “todas as categorias (N)” e “todos os formatos (N)” — com `h-9 min-w-[10rem] rounded-full border-0 bg-white/[0.06] px-3.5 text-xs font-medium text-white/80` (hover/aberto `bg-white/10`; item focado roxo `#6829C0`); botão-pílula “mostrar/ocultar N feitos” (ativo `bg-white/90 font-bold text-black`); **Novo gancho** (`LiquidGlassButton tint="primary" h-9 px-5 text-xs font-bold uppercase tracking-widest`, **sem ícone “+”**).
- **Tabela** `surface-flat overflow-hidden`, `min-w-[720px] text-sm`, cabeçalho `border-b border-white/[0.08] text-[10px] uppercase tracking-widest text-white/35` — colunas ✓ · **Gancho** · Categoria (`w-40`) · Formato (`w-44`) · Ref. (`w-16`) · lixeira. Linha `border-b border-white/[0.04]`, feita = `opacity-45` + gancho riscado; caixinha de “feito” `h-4 w-4 rounded border`, marcada `border-primary bg-primary text-white` (“OK”); **gancho é um botão** `rounded-lg px-1 py-0.5 text-sm text-white/85 hover:bg-white/[0.06]` (abre o roteiro) com selo **“roteiro”** `rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/45` quando já tem texto; categoria editável (`text-xs text-white/60`); formato num Select compacto (`h-7 rounded-lg border-0 bg-transparent px-1 text-xs`); referência = ícone `ExportSquare 14px` (`white/35 → primary`) ou “—”; lixeira que aparece no hover (`group-hover:text-white/30 → hover rose-300`).
- **Modal “Roteiro”** (`max-w-3xl h-[85vh] !overflow-hidden`, chip “Roteiro”): corpo rolável `p-6 space-y-6` — **Gancho** (textarea 2 linhas `text-base font-semibold`), grade `md:grid-cols-3` com **Categoria**, **Formato** (Select) e **Referência**, e **Roteiro completo** (`min-h-[340px] resize-y leading-relaxed`). Campos `rounded-xl bg-white/[0.03] border-white/[0.05]`, labels `text-xs font-bold uppercase tracking-widest text-white/70`. **Salva sozinho** (500ms; e ao fechar).

### 5.12.5 Quadros (mapa mental e fluxograma) — [boards/BoardCanvas.tsx]
- Lista de quadros: grade `sm:grid-cols-2 xl:grid-cols-3 gap-3` de cartões `surface-flat p-4` (hover `-translate-y-0.5`) com ícone `Hierarchy2/Diagram 22px text-white/40`, título `text-sm font-bold`, legenda “mapa mental · N cards” `text-xs text-white/35`.
- **Quadro aberto** = mesmo desenho do Mapa de Funil, na faixa da barra lateral (hook `useSidebarBand`): **barras fora do canvas** `flex flex-wrap gap-x-3 gap-y-2` — pílula `liquid-glass no-elevation rounded-full py-1.5 pl-3 pr-2` com **← Voltar** (`text-xs text-white/50`), nome do quadro (input `w-48 sm:w-56 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-sm font-medium`), etiqueta do tipo `rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px]` e lixeira (hover rose); segunda pílula `liquid-glass no-elevation rounded-full p-1.5` com os **botões de criação** — **Tema central** / **Ideia** (mapa) ou Início / Etapa / Decisão / Fim (fluxo), cada um `rounded-full px-3 py-1.5 text-xs font-bold` com `+`, **fundo e borda da cor do papel** do nó — e, com uma seta selecionada, **“seta: sim / não”** + limpar rótulo; e a dica `text-[11px] text-white/35`.
- **Canvas** `surface-flat no-elevation relative min-h-0 flex-1 overflow-hidden !rounded-2xl`: React Flow dark, pontos `#2a2a30` (`gap 18`), `Controls`. Setas roxas `#8b5cf6` `1.8px` com ponta fechada; rótulo `fill #fff 11px bold` sobre `#1a1a20` a 90%.
- **Nós** (`QuadroNo`) com vidro leve (`backdrop-blur-sm`) e **5 cores** (borda / fundo): roxo `rgba(168,132,255,.55)` / `rgba(104,41,192,.22)`; azul `rgba(120,200,255,.50)` / `rgba(30,110,170,.20)`; verde `rgba(130,230,190,.50)` / `rgba(25,130,100,.18)`; âmbar `rgba(255,200,120,.50)` / `rgba(170,115,25,.18)`; rosa `rgba(255,150,170,.50)` / `rgba(175,40,70,.18)`. **Formas**: central `190×76` raio `1.75rem` `text-sm font-black`; ideia/etapa `170×66` raio `1rem` `text-xs font-semibold`; decisão `150×150` raio `0.5rem` (losango); início/fim `150×56` pílula. Sombra `0 4px 16px rgba(0,0,0,.3)`, selecionado `0 0 0 2px cor, 0 8px 28px rgba(0,0,0,.45)`. Duplo clique edita; puxar a bolinha e soltar no vazio cria o próximo nó já ligado.

### 5.12.6 Outros
- **Aviso de pendente**: bolinha/selo âmbar = editada aqui e ainda não enviada ao cofre (Obsidian via GitHub, `notes-sync`); **enviar sobrescreve sempre**.
- Hoje **não há etiquetas** (UI e dados removidos); organização só por pastas.

---

## 5.13 Central de Agentes (`/agents`) — [pages/AgentsHub.tsx, components/ui/agents-canvas.tsx, features/agents/*]

Sem título nem texto de cabeçalho. Página “de tela cheia”: ocupa a **faixa da barra lateral** (16px do topo e do fundo; `height = innerHeight − 32`, `marginTop = 16 − topo`; mobile `innerHeight − 160`, mín. 520px).
- **Botão flutuante** **Criar agente** no canto superior-direito **dentro** do canvas (`absolute right-4 top-4 z-20`): `LiquidGlassButton tint="primary" h-11 px-6 text-xs font-bold uppercase tracking-widest` no `motion.div` padrão.
- **Estado vazio**: `surface-flat no-elevation` ocupando a faixa, centralizado — ícone `Cpu 28px text-white/25`, “Nenhum agente ainda” `text-sm text-white/45`, dica `text-xs text-white/30`.
- **Canvas (AgentsCanvas)** `surface-flat no-elevation relative overflow-hidden rounded-3xl` (altura 100% da faixa), React Flow sem arestas editáveis, fundo de pontos `#2a2a30` (`gap 18`), `minZoom .4 / maxZoom 1.6`, enquadramento `fitView` com `padding .4` e **zoom máx. 1,25** — **reenquadra sempre que o canvas muda de tamanho**.
- **Nó de agente** (`w-36`, `cursor-grab`, `pt-6`): **orbe `lg` (64px)** num anel `p-1.5` (selecionado `ring-2 ring-white/40`); **etiqueta “PRINCIPAL”** no canto superior-direito do orbe (`-right-2 -top-1`, `rounded-full bg-[#4a4849] px-1.5 py-0.5 text-[9px] font-black uppercase text-white/85`, cinza sólido); nome `text-sm font-bold text-white`; papel `text-[11px] text-white/40` (1 linha); **selo de status** `rounded-full px-2 py-0.5 text-[10px] font-bold uppercase` — ativo `bg-emerald-400/15 text-emerald-300`, parado `bg-white/10 text-white/50`, erro `bg-red-400/15 text-red-300`. Arrastável; a **posição fica salva** por agente (localStorage).
- **Linhas**: **tracejadas finas** `rgba(255,255,255,.18)` (`4 5`) do agente principal para cada outro (hierarquia) e **linhas roxas animadas** `#8B5CF6` `2px` entre agentes que **já trocaram mensagens**. Pontas invisíveis no centro do orbe.
- **Chat flutuante ao lado do agente**: ao clicar num orbe abre um painel ancorado a ele (`NodeToolbar`, `offset 20`, **abre à direita**, ou **à esquerda** para agentes da metade direita) — `surface-modal flex h-[460px] w-[380px] flex-col rounded-3xl`. Clicar no fundo do canvas fecha. **Cabeçalho** `border-b border-white/[0.06] p-4`: orbe `sm` + nome `text-sm font-bold` (+ selo **Principal** `bg-amber-300/15 text-amber-300 text-[10px] font-bold uppercase`), papel `text-xs text-white/40`, botões **×** e **engrenagem** (`rounded-full p-2 text-white/40 → hover bg-white/10 text-white`). **Abas** em pílulas `rounded-full px-3 py-1 text-xs font-bold` (ativa `bg-white text-black`): **Conversa** e **Entre agentes · N**. **Aviso âmbar** (`rounded-xl bg-amber-300/[0.08] px-3 py-2 text-[11px] text-amber-200/80`): “Nenhum motor está ligado…” (as mensagens ficam salvas, mas o agente ainda não responde sozinho). **Bolhas**: do usuário `bg-primary/80 text-white` à direita; do agente `bg-white/[0.07] text-white/90` à esquerda; `max-w-[80%] rounded-2xl px-3.5 py-2 text-sm`, hora `text-[10px] text-white/25`; na aba “Entre agentes” cada bolha mostra “A → B” `text-[10px] font-bold uppercase tracking-widest text-white/35`. **Rodapé** `border-t border-white/[0.06] p-4`: campo em pílula `rounded-full bg-white/[0.06] px-4 py-2.5 text-sm` + botão enviar `rounded-full bg-white/10 p-2.5` (Enter envia); em “Entre agentes” há um seletor “para {agente}” `rounded-full bg-white/[0.06] px-3 py-2.5 text-xs font-semibold`.
- **Modal “Novo/Editar agente”** (`max-w-2xl h-[85vh] !overflow-hidden`, chip): corpo `p-6 space-y-6` com **prévia do orbe** (`h-24 w-24`) ao lado de **Nome \***, **Papel**, **Instruções** (textarea `min-h-[110px]`), **Cor** (12 orbes `sm` clicáveis, o escolhido com `ring-2 ring-white`, os outros `opacity-70`) e um bloco **“Agente principal”** `rounded-2xl bg-white/[0.04] p-4` com título `font-bold`, ajuda `text-xs text-white/45` e **Switch** (travado quando o agente já é o principal — para trocar, marque outro). Rodapé: **Excluir** (`tint="danger"`, só ao editar), **Cancelar**, **Criar agente/Salvar** (`tint="primary"`, desabilitado sem nome), todos `h-10 px-5 text-xs font-bold uppercase tracking-widest`. Acessórios (chapéu/óculos/extras) **não aparecem** no modal por ora.
- **Dados**: salvos no navegador (`agents-hub:v1`). O primeiro agente vira o **principal**; só pode haver um. **Sem motor** ligado: nada responde sozinho.

---

## 5.14 Páginas de laboratório (públicas, sem layout) — só para desenvolvimento

| Rota | Arquivo | Para quê |
|---|---|---|
| `/dev/orbs` | `OrbLab.tsx` | Catálogo dos orbes: **canvas de exemplo** com 4 agentes, as 12 cores, as 3 formas, chapéus, óculos, extras, combinações, tamanhos e “sem piscar”. Fundo `appBackgroundStyle`, cartões `liquid-glass rounded-2xl p-4`, títulos de seção `text-xs font-black uppercase tracking-widest text-white/40`. |
| `/dev/notas` | `NotesLab.tsx` | Notas com dados falsos (pastas de 4 níveis, pauta, quadros) para conferir o visual sem login. |
| (outros) | `IconLab.tsx`, `PillLab.tsx`, `RoundTripLab.tsx`, `ModalTest.tsx` | Testes de ícones, da pílula da barra, de ida e volta de dados e de modais. |
| `*` | `NotFound.tsx` | 404 simples. |

---

# 6. Regras de ouro (o que o sistema “decidiu” ao longo do caminho)

1. **Cinza sólido, não vidro translúcido, nos cards de conteúdo.** A referência é o Dashboard (`surface-flat`, `#2F2D2E` a 72%). Quem ainda usa `liquid-glass dashboard-glow`: Financeiro, Automações, Agendamentos (próximos a migrar).
2. **Roxo só em destaque** (botão primário, 1 card de destaque, seleção, pílula de taxa). Verde/vermelho só para sinal (lucro/prejuízo, ativo/vencido). Claro (`#F4F4F4`) só pontual, para quebrar o ritmo.
3. **Botão padrão = `LiquidGlassButton`** com mola `400/17` e `y −2` no hover; primário no canto superior direito da página. **Nunca** `+` dentro de botão de criar (“Novo gancho”, “Criar agente”).
4. **Dropdown/calendário/hora = cinza do modal** (`surface-modal`), roxo `#6829C0` na seleção, rolagem pela roda, aberto **centralizado** no botão.
5. **Modal = card desconstruído** (título no chip, X no círculo), nasce do clique, rodapé fixo com botões, corpo com rolagem **e altura definida** (`h-[85vh]`).
6. **Margens iguais em todas as páginas**: 104px à esquerda (barra) e `px-4`; páginas de tela cheia usam a **faixa 16px/16px** da barra lateral.
7. **Sem títulos grandes de página** nas telas novas (Agentes, Notas): a ação principal fica solta no canto, o resto é conteúdo.
8. **Efeitos que NÃO voltam**: `mix-blend-mode` sobre a página; `backdrop-filter` em barras fixas vizinhas de cards de vidro (tarja de brilho); gradiente/efeito “simplificado” no lugar do original — ao portar um componente, reaproveitar a mesma classe CSS do efeito.
9. **Escala de texto de 5 níveis** (seção 1.3) e rótulos sempre `text-[10px]`–`[11px] font-black uppercase tracking-widest`.
10. **Números** sempre `tabular-nums`, contados por `AnimatedValue`.

# 7. Inconsistências conhecidas (para decidir depois)

- **Financeiro, Automações e Agendamentos** ainda em `liquid-glass dashboard-glow` (translúcido) e com cabeçalhos vazios (`<div></div>` à esquerda).
- **Contratos**: `ContractsKPIs` e `ContractsSearch` existem, mas a página não os usa (KPIs antigos em `bg-Porceli-gray-800`).
- **Financeiro**: `FinancialSearch` usa o botão antigo `btn-primary` e `bg-Porceli-gray-800` (fora do padrão).
- **Agentes**: acessórios do orbe existem no código mas o modal não os oferece; chat sem motor (mensagens só gravadas).
- **Funil**: a coluna de fontes usa `liquid-glass` na Toolbar/canvas, enquanto a Paleta usa `surface-flat`.
- **Notas**: aviso de CSS do build (“Expected identifier but found '-'”) ainda não investigado; chaves da Evolution ainda no código de várias funções Edge.
- **Mobile**: o menu vira pílula no rodapé; várias telas de canvas (Funil, Agentes, Quadros) são pensadas para desktop.

---
*Gerado a partir do código em `design-experiments`/`main` (commit `6476b3a` e posteriores).*
