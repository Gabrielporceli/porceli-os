# Liquid Glass com Refração SVG — Guia Completo

> Como reproduzir o efeito "Apple Tahoe Liquid Glass" (vidro líquido com refração real)
> usado no Porceli OS — do zero, passo a passo, com a teoria por trás de cada decisão.
>
> Baseado no componente `apple-tahoe-liquid-glass-button` de **easemize** (21st.dev),
> adaptado e estendido para botões, cards, modais e navegação.

---

## Índice

1. [O que é (e por que é diferente do glassmorphism comum)](#1-o-que-é)
2. [A física do efeito](#2-a-física-do-efeito)
3. [Suporte de navegadores — leia antes de tudo](#3-suporte-de-navegadores)
4. [Anatomia: as 3 camadas](#4-anatomia-as-3-camadas)
5. [Passo 1 — O filtro SVG (o coração da refração)](#5-passo-1--o-filtro-svg)
6. [Passo 2 — O CSS do material](#6-passo-2--o-css-do-material)
7. [Passo 3 — O componente React](#7-passo-3--o-componente-react)
8. [Passo 4 — Montar o filtro globalmente](#8-passo-4--montar-o-filtro-globalmente)
9. [Passo 5 — Variantes coloridas + a pegadinha do Tailwind](#9-passo-5--variantes-coloridas)
10. [Passo 6 — Aplicar em cards e modais](#10-passo-6--cards-e-modais)
11. [Passo 7 — O fundo colorido (sem ele, nada disso aparece)](#11-passo-7--o-fundo-colorido)
12. [Tint luminoso vs. tint escuro — o erro mais comum](#12-tint-luminoso-vs-escuro)
13. [Troubleshooting](#13-troubleshooting)
14. [Checklist final](#14-checklist-final)

---

## 1. O que é

Glassmorphism "normal" é só `backdrop-filter: blur()` — um desfoque fosco. O fundo
some atrás de um vidro leitoso e pronto.

O **Liquid Glass da Apple** faz algo a mais: ele **refrata** (entorta) o fundo nas
bordas, como vidro real curvo. A luz que passa pela borda do "vidro" é deslocada,
criando aquela lente que distorce o que está atrás — exatamente o que a Apple faz
no iOS 26 / macOS Tahoe.

A diferença visual:

| | Glassmorphism comum | Liquid Glass (este guia) |
|---|---|---|
| Desfoque | ✅ | ✅ |
| Saturação do fundo | às vezes | ✅ |
| **Refração nas bordas** | ❌ | ✅ (via filtro SVG) |
| Brilho especular / bevel | raramente | ✅ (pilha de box-shadow) |
| Precisa de fundo colorido | não | **sim** (ver §11) |

---

## 2. A física do efeito

A refração é feita por um **mapa de deslocamento** (displacement map): uma imagem
onde cada pixel codifica "para onde empurrar" o pixel correspondente do fundo.

- Canal **R** (vermelho) controla deslocamento horizontal (eixo X).
- Canal **G** (verde) controla deslocamento vertical (eixo Y).
- Cinza neutro (R=128, G=128) = deslocamento zero.
- Valores acima/abaixo de 128 empurram para um lado ou outro.

O mapa que usamos é uma **imagem WebP pré-renderizada** embutida em base64. Ela tem
cinza neutro no centro (sem distorção no miolo, pra não "fantasmar" o conteúdo) e
gradientes fortes nas bordas (curvatura tipo lente). Por isso a distorção só
aparece **nas beiradas** do elemento, como vidro real.

> **Por que um WebP pré-renderizado e não `feTurbulence`?**
> A abordagem com `feTurbulence` (ruído procedural) **não funciona** de forma
> confiável dentro de `backdrop-filter` no Chrome. Já um mapa estático via
> `feImage` funciona. Esse é o pulo do gato que faz o efeito renderizar no Chrome.

O pipeline do filtro é:

```
fundo  ──►  feGaussianBlur (leve)  ──►  feDisplacementMap  ──►  resultado
                                              ▲
                              mapa WebP ──────┘ (via feImage)
```

---

## 3. Suporte de navegadores

**Isto é crítico.** O efeito depende de `backdrop-filter: url(#filtro-svg)`, que
**não é suportado em todo lugar**:

| Navegador | Refração SVG | Comportamento |
|---|---|---|
| **Chrome / Edge / Brave / Arc / Opera** (Chromium ~114+) | ✅ | Refrata de verdade |
| **Safari** | ⚠️ | Ignora o `url()`, cai pro `blur()` (fica vidro fosco) |
| **Firefox** | ❌ | Não suporta filtro SVG em backdrop-filter |

Por isso o CSS sempre declara um **fallback** sem `url()` no `-webkit-`:

```css
backdrop-filter: blur(8px) url(#liquid-glass-refraction) saturate(150%);
-webkit-backdrop-filter: blur(8px) saturate(150%);  /* Safari: só blur */
```

> ⚠️ A refração **só fica visível sobre fundo colorido**. Sobre fundo preto/escuro
> ela existe mas é invisível (entortar preto = mais preto). Ver §11.

---

## 4. Anatomia: as 3 camadas

Cada botão de vidro tem **3 camadas empilhadas**:

```
┌─────────────────────────────────┐
│  .lqg-text   (z-10)             │  ← texto/ícone, SEMPRE no topo
│  ┌───────────────────────────┐  │
│  │  .lqg-lens  (-z-10)        │  │  ← lente VAZIA: backdrop-filter + bevel
│  │  (vazia de propósito!)     │  │
│  └───────────────────────────┘  │
│  .lqg-btn    (isolate)          │  ← contêiner, cria stacking context
└─────────────────────────────────┘
```

**Por que a lente precisa ficar VAZIA?**
`backdrop-filter` afeta tudo que está atrás do elemento. Se você colocasse o
`backdrop-filter` no mesmo elemento que tem o texto, o texto seria capturado e
"fantasmado" pela distorção. Separando a lente (vazia, atrás, `-z-10`) do texto
(na frente, `z-10`), o Chrome captura **só o fundo** — zero fantasma no texto.

O `isolate` no `.lqg-btn` cria um *stacking context* novo, garantindo que o
`-z-10` da lente fique atrás do texto mas **dentro** do botão (não atrás da página).

---

## 5. Passo 1 — O filtro SVG

Crie um arquivo com o mapa de deslocamento em base64. No projeto:
**`src/components/ui/liquid-glass-map.ts`**

```ts
// Mapa de deslocamento WebP pré-renderizado (data URI base64).
// Fonte: easemize / "apple-tahoe-liquid-glass-button".
export const LIQUID_GLASS_MAP =
  "data:image/webp;base64,UklGRq4vAABXRUJQVlA4W..."; // (~16 KB)
```

> **De onde vem esse base64?** É um WebP que representa o mapa de deslocamento.
> Você pode (a) reaproveitar o do projeto, (b) extrair de um componente público,
> ou (c) gerar o seu: criar uma imagem onde o centro é cinza `#808080` e as bordas
> têm gradiente radial pra fora, exportar como WebP e converter pra base64
> (`base64 -w0 mapa.webp`). O importante é: **centro neutro, bordas com gradiente.**

O filtro SVG em si (em JSX, ver §7):

```xml
<filter id="liquid-glass-refraction" primitiveUnits="objectBoundingBox">
  <!-- 1. Carrega o mapa, esticado para o tamanho do elemento -->
  <feImage result="map" width="100%" height="100%" x="0" y="0"
           href={LIQUID_GLASS_MAP} preserveAspectRatio="none" />

  <!-- 2. Desfoca levemente o fundo capturado -->
  <feGaussianBlur in="SourceGraphic" stdDeviation="0.01" result="blur" />

  <!-- 3. Desloca o fundo desfocado usando o mapa (R=X, G=Y) -->
  <feDisplacementMap in="blur" in2="map" scale="0.5"
                     xChannelSelector="R" yChannelSelector="G" />
</filter>
```

Parâmetros importantes:

- **`primitiveUnits="objectBoundingBox"`** — faz medidas relativas ao tamanho do
  elemento (0 a 1). Assim o mesmo filtro serve pra qualquer tamanho de botão.
- **`scale="0.5"`** — intensidade da distorção. Maior = entorta mais.
  Em `objectBoundingBox`, 0.5 já é forte. Comece em `0.3`–`0.5`.
- **`preserveAspectRatio="none"`** — estica o mapa pra cobrir o elemento todo.
- **`stdDeviation="0.01"`** — desfoque mínimo antes do deslocamento (suaviza).

---

## 6. Passo 2 — O CSS do material

No `src/index.css`, dentro do `@layer base`:

```css
/* ===== Apple Tahoe Liquid Glass Button ===== */
.lqg-btn {
  appearance: none;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.95);
  --glass-reflex-light: 1;   /* multiplicadores p/ ajustar o brilho */
  --glass-reflex-dark: 1;
}

/* A LENTE — fica VAZIA. Captura só o fundo. */
.lqg-lens {
  background-color: rgba(255, 255, 255, 0.05);  /* tom neutro translúcido */

  /* Chrome/Edge refratam via SVG; Safari cai pro blur. */
  backdrop-filter: blur(8px) url(#liquid-glass-refraction) saturate(150%);
  -webkit-backdrop-filter: blur(8px) saturate(150%);

  /* Pilha de sombras = bevel + brilho especular de vidro real */
  box-shadow:
    inset 0 0 0 1px      color-mix(in srgb, white calc(var(--glass-reflex-light) * 10%), transparent),
    inset 1.8px 3px 0 -2px   color-mix(in srgb, white calc(var(--glass-reflex-light) * 90%), transparent),
    inset -2px -2px 0 -2px   color-mix(in srgb, white calc(var(--glass-reflex-light) * 80%), transparent),
    inset -3px -8px 1px -6px color-mix(in srgb, white calc(var(--glass-reflex-light) * 60%), transparent),
    inset -0.3px -1px 4px 0  color-mix(in srgb, black calc(var(--glass-reflex-dark) * 12%), transparent),
    inset -1.5px 2.5px 0 -2px color-mix(in srgb, black calc(var(--glass-reflex-dark) * 20%), transparent),
    inset 0 3px 4px -2px     color-mix(in srgb, black calc(var(--glass-reflex-dark) * 20%), transparent),
    inset 2px -6.5px 1px -4px color-mix(in srgb, black calc(var(--glass-reflex-dark) * 10%), transparent),
    0 1px 5px 0   color-mix(in srgb, black calc(var(--glass-reflex-dark) * 10%), transparent),
    0 6px 16px 0  color-mix(in srgb, black calc(var(--glass-reflex-dark) * 8%), transparent);

  transition: background-color 400ms cubic-bezier(1, 0, 0.4, 1),
              box-shadow 400ms cubic-bezier(1, 0, 0.4, 1);
}

/* Texto: flutua limpo acima do vidro */
.lqg-text {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  transition: color 400ms cubic-bezier(1, 0, 0.4, 1);
}

/* Interações */
@media (hover: hover) {
  .lqg-btn:not(:disabled):hover { transform: scale(1.03); }
}
.lqg-btn:not(:disabled):active { transform: scale(0.96); }
```

### Decifrando a pilha de box-shadow

Cada linha tem um papel — é isso que faz parecer vidro de verdade, não um retângulo:

| Linha | O que faz |
|---|---|
| `inset 0 0 0 1px white 10%` | borda interna fininha (o "fio" do vidro) |
| `inset 1.8px 3px ... white 90%` | **rim de luz no topo-esquerda** (luz batendo na quina) |
| `inset -2px -2px ... white 80%` | brilho na quina inferior-direita |
| `inset -3px -8px ... white 60%` | brilho difuso na base (espessura do vidro) |
| linhas com `black` | sombras internas dando profundidade/concavidade |
| `0 1px 5px` e `0 6px 16px` | sombras externas (elevação acima da página) |

> Os valores em px são calibrados pra botões. Em superfícies grandes (cards), eles
> viram um rim fino de luz na borda — continua bonito. Ver §10.

`color-mix(in srgb, white X%, transparent)` é só uma forma de escrever
"branco com X% de opacidade", mas permite multiplicar pelo `--glass-reflex-light`.

---

## 7. Passo 3 — O componente React

**`src/components/ui/liquid-glass-button.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";
import { LIQUID_GLASS_MAP } from "./liquid-glass-map";

const FILTER_ID = "liquid-glass-refraction";

/** Renderize UMA vez por página. Define o filtro SVG compartilhado. */
export function LiquidGlassFilter() {
  return (
    <svg className="absolute w-0 h-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <filter id={FILTER_ID} primitiveUnits="objectBoundingBox">
        <feImage result="map" width="100%" height="100%" x="0" y="0"
                 href={LIQUID_GLASS_MAP} preserveAspectRatio="none" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="0.01" result="blur" />
        <feDisplacementMap in="blur" in2="map" scale="0.5"
                           xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

export interface LiquidGlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Tom do vidro. "neutral" = vidro escuro; demais = vidro tingido. */
  tint?: "neutral" | "primary" | "success" | "danger";
}

export const LiquidGlassButton = React.forwardRef<
  HTMLButtonElement, LiquidGlassButtonProps
>(({ className, children, tint = "neutral", ...props }, ref) => {
  // ⚠️ nomes LITERAIS — nunca `lqg-lens--${tint}` (Tailwind purga). Ver §9.
  const tintClass =
    tint === "primary" ? "lqg-lens--primary"
    : tint === "success" ? "lqg-lens--success"
    : tint === "danger" ? "lqg-lens--danger"
    : "";

  return (
    <button
      ref={ref}
      className={cn(
        "lqg-btn relative isolate inline-flex items-center justify-center gap-2 rounded-full cursor-pointer transition-transform duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
        className,
      )}
      {...props}
    >
      {/* Lente VAZIA — captura só o fundo */}
      <span className={cn("lqg-lens absolute inset-0 -z-10 rounded-[inherit] pointer-events-none", tintClass)} />
      <span className="lqg-text relative z-10 w-full justify-center select-none flex items-center gap-2">
        {children}
      </span>
    </button>
  );
});
LiquidGlassButton.displayName = "LiquidGlassButton";
```

Uso:

```tsx
<LiquidGlassButton onClick={...} className="px-5 h-11 text-xs font-bold uppercase">
  Google
</LiquidGlassButton>

<LiquidGlassButton tint="primary" className="h-11 px-6">Novo Evento</LiquidGlassButton>
```

---

## 8. Passo 4 — Montar o filtro globalmente

O `<filter id="liquid-glass-refraction">` precisa existir **uma vez** no DOM pra
que o CSS `url(#liquid-glass-refraction)` o encontre. Monte na raiz da app:

**`src/App.tsx`**

```tsx
import { LiquidGlassFilter } from "./components/ui/liquid-glass-button";

function App() {
  return (
    <Providers>
      <LiquidGlassFilter />   {/* ← uma vez, disponível em toda a app */}
      <BrowserRouter>...</BrowserRouter>
    </Providers>
  );
}
```

> Não monte o `<LiquidGlassFilter />` em várias páginas ao mesmo tempo — IDs
> duplicados confundem o navegador. Uma vez na raiz basta.

---

## 9. Passo 5 — Variantes coloridas

Pra ter vidro roxo/verde/vermelho, basta trocar a **cor da lente** (o resto do
material — refração, bevel — é igual):

```css
.lqg-lens--primary { background-color: rgba(104, 41, 192, 0.72); }
.lqg-btn:hover .lqg-lens--primary { background-color: rgba(104, 41, 192, 0.82); }
.lqg-lens--success { background-color: rgba(22, 163, 74, 0.55); }
.lqg-btn:hover .lqg-lens--success { background-color: rgba(22, 163, 74, 0.72); }
.lqg-lens--danger  { background-color: rgba(220, 38, 38, 0.55); }
.lqg-btn:hover .lqg-lens--danger  { background-color: rgba(220, 38, 38, 0.72); }
```

### ⚠️ A pegadinha do Tailwind (purge)

Se você gerar o nome da classe **dinamicamente** — `` `lqg-lens--${tint}` `` — o
Tailwind **apaga** a regra do CSS final, porque o scanner dele lê os arquivos como
texto e nunca vê a string `lqg-lens--primary` montada em runtime.

Sintoma: a cor não aplica (o vidro fica neutro), mesmo com a regra escrita no CSS.

**Solução:** sempre use nomes **literais e completos** no código (como o
`tintClass` do §7), nunca interpolados. Alternativas: adicionar ao `safelist` do
`tailwind.config` ou mover as regras pra fora de qualquer `@layer`.

---

## 10. Passo 6 — Cards e modais

Pra unificar a estética, os cards/modais usam a **mesma linguagem de material**
via a classe compartilhada `.liquid-glass`:

```css
.liquid-glass {
  position: relative;
  background: rgba(28, 28, 34, 0.28) !important;          /* tint LEVE (ver §12) */
  backdrop-filter: blur(20px) saturate(180%) brightness(1.12) !important;
  -webkit-backdrop-filter: blur(20px) saturate(180%) brightness(1.12) !important;
  border: 1px solid rgba(255, 255, 255, 0.06) !important;
  border-radius: 1.5rem;
  box-shadow:                                              /* mesmo bevel do botão */
    inset 1.8px 3px 0 -2px   color-mix(in srgb, white 85%, transparent),
    inset -2px -2px 0 -2px   color-mix(in srgb, white 70%, transparent),
    inset -3px -8px 1px -6px color-mix(in srgb, white 55%, transparent),
    inset -0.3px -1px 4px 0  color-mix(in srgb, black 12%, transparent),
    inset -1.5px 2.5px 0 -2px color-mix(in srgb, black 18%, transparent),
    inset 0 3px 4px -2px     color-mix(in srgb, black 18%, transparent),
    inset 2px -6.5px 1px -4px color-mix(in srgb, black 10%, transparent),
    0 12px 32px rgba(0, 0, 0, 0.35) !important;
}
```

> **Não coloque `url(#...)` (refração) na classe de cards.** Motivos:
> 1. Refração em superfícies grandes distorce demais e fica estranho.
> 2. Custo de performance (cada elemento roda um passe de filtro SVG).
> 3. Sobre o fundo a refração quase não aparece em área grande.
>
> Nos cards o que dá a cara de vidro é o **bevel + blur + saturate + brightness**.
> A refração fica pros elementos pequenos/interativos (botões, pílula de nav).

⚠️ **Cuidado com overrides:** classes utilitárias como `!shadow-none` ou
`!shadow-[...]` em cima de um elemento `.liquid-glass` **anulam o bevel**. Se um
card não estiver com o material, procure por um `!shadow-*` matando a box-shadow.

---

## 11. Passo 7 — O fundo colorido

**Esse é o passo que quase todo mundo esquece.** Sem fundo colorido atrás, a
refração e a saturação não têm o que mostrar — o vidro vira um cinza fosco e você
acha que "não funcionou".

No Porceli OS o fundo é uma imagem fixa (gradiente roxo/ciano) montada no layout:

```tsx
// src/components/Layout/CRMLayout.tsx
<div className="fixed inset-0 bg-cover bg-center bg-no-repeat"
     style={{ backgroundImage: 'url("/app-bg.webp")' }}>
  <div className="absolute inset-0 bg-black/25" />   {/* véu p/ legibilidade */}
</div>
```

Boas práticas pro fundo:

- **Otimize a imagem.** O original tinha 6,8 MB; reduzido pra **213 KB** em WebP
  1920px de largura (use `sharp`: `resize(1920).webp({quality: 82})`). PNG enorme
  trava o carregamento.
- **Use `fixed`** pra o fundo não rolar com o conteúdo (o vidro refrata um fundo
  estável).
- **Véu de contraste** (`bg-black/25`) equilibra legibilidade × vibração. Mais
  escuro (`/35`–`/40`) = texto mais legível; mais claro (`/15`–`/20`) = cores mais
  vivas.

---

## 12. Tint luminoso vs. escuro

O erro mais comum (e que parece bug): os vidros ficam **escurecidos** sobre o
fundo colorido.

**Causa:** um tint escuro forte, tipo `rgba(18,18,18,0.5)`, joga 50% de preto sobre
o fundo → o card vira uma placa cinza, escondendo a cor.

**O vidro da Apple é luminoso:** ele **clareia e satura** o que está atrás, não
escurece. Para isso:

```css
/* ❌ escurece — parece placa cinza */
background: rgba(18, 18, 18, 0.5);
backdrop-filter: blur(18px) saturate(180%);

/* ✅ luminoso — assume a cor do fundo */
background: rgba(28, 28, 34, 0.28);                       /* tint leve */
backdrop-filter: blur(20px) saturate(180%) brightness(1.12);  /* + brilho */
```

Regras de ouro:

- **Baixe a opacidade** do tint (0.5 → ~0.28).
- **Adicione `brightness(1.1)`–`1.15`** no `backdrop-filter` pra devolver luz.
- **Mantenha `saturate(170%)`–`180%`** pra cor puxar do fundo.
- App escura com **texto branco** → evite tint branco leitoso (mata o contraste do
  texto). Prefira tint escuro **leve** + brightness.

---

## 13. Troubleshooting

| Sintoma | Causa provável | Solução |
|---|---|---|
| "Não vejo diferença nenhuma" | Fundo escuro atrás | Ponha fundo colorido (§11) |
| Refração não aparece, só blur | Safari/Firefox, ou Chrome antigo | É limitação do navegador (§3) |
| Vidro fica cinza/escuro | Tint escuro demais | Baixe opacidade + `brightness` (§12) |
| Cor (roxo/verde) não aplica | Tailwind purgou a classe | Use nome literal, não `${tint}` (§9) |
| Card sem bevel | `!shadow-none`/`!shadow-[...]` por cima | Remova o override (§10) |
| Texto "fantasma"/borrado | `backdrop-filter` no mesmo nó do texto | Separe a lente vazia (§4) |
| `url(#...)` ignorado | Filtro não montado no DOM | Monte `<LiquidGlassFilter/>` (§8) |
| Lente atrás da página toda | Faltou `isolate` no contêiner | Adicione `isolate` no `.lqg-btn` (§4) |

### Como confirmar que a refração está ativa (DevTools)

No console do navegador:

```js
getComputedStyle(document.querySelector('.lqg-lens')).backdropFilter
// Chrome deve retornar algo com: url("#liquid-glass-refraction")
```

Se vier sem o `url(...)`, o navegador não está aplicando o filtro.

---

## 14. Checklist final

- [ ] `liquid-glass-map.ts` com o WebP base64 (centro neutro, bordas em gradiente)
- [ ] `<LiquidGlassFilter />` montado **uma vez** na raiz (`App.tsx`)
- [ ] Classes `.lqg-btn` / `.lqg-lens` / `.lqg-text` no `index.css`
- [ ] Lente **vazia**, `-z-10`; contêiner com `isolate`; texto `z-10`
- [ ] Fallback `-webkit-backdrop-filter` sem `url()` pro Safari
- [ ] Variantes de cor com **nomes literais** (sem interpolação) — Tailwind
- [ ] Cards/modais (`.liquid-glass`) com bevel, **sem** `url()`, tint **leve** + `brightness`
- [ ] **Fundo colorido** otimizado (WebP) e fixo no layout
- [ ] Testado no **Chrome** (é onde a refração renderiza)

---

## Referências

- Componente original: `easemize / apple-tahoe-liquid-glass-button` (21st.dev)
- Apple HIG — Materials / Liquid Glass (iOS 26 / macOS Tahoe)
- MDN: [`backdrop-filter`](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter),
  [`feDisplacementMap`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feDisplacementMap),
  [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix)

Arquivos deste projeto:
- `src/components/ui/liquid-glass-button.tsx` — componente + filtro
- `src/components/ui/liquid-glass-map.ts` — mapa de deslocamento
- `src/index.css` — classes `.lqg-*` e `.liquid-glass`
- `src/components/Layout/CRMLayout.tsx` — fundo colorido fixo
- `src/App.tsx` — montagem global do filtro
