# Tutorial: Liquid Glass (vidro líquido estilo Apple)

Este documento explica, com código real deste repositório, como os efeitos de "vidro líquido" (liquid glass) do Porceli OS foram construídos. Existem **três sistemas diferentes**, cada um resolvendo um problema distinto — não são a mesma técnica reaproveitada, e escolher o errado para a superfície errada é a causa da maioria dos bugs visuais que apareceram no desenvolvimento.

| Sistema | Onde é usado | Arquivo |
|---|---|---|
| `.liquid-glass` (CSS puro) | Cards, modais, superfícies grandes | `src/index.css` |
| `.lqg-btn` / `.lqg-lens` (refração SVG global) | Botões pílula pequenos | `src/index.css` + `liquid-glass-button.tsx` |
| `<LiquidGlass>` (componente React) | KPIs do Dashboard, refração por instância | `src/components/ui/liquid-glass.tsx` |

Além dos três, este doc cobre o problema mais difícil que apareceu: **`backdrop-filter` dentro de um container com `overflow-x: auto` não enxerga o wallpaper fixo da página** — e a técnica que resolve isso (`KanbanGlassBackdrop`, usada no Funil).

---

## 1. O sistema base: `.liquid-glass`

É a classe usada em cards e modais grandes. A ideia central: `backdrop-filter` faz o desfoque, e o "vidro" ganha volume com **`box-shadow: inset`** — não com `border`.

```css
.liquid-glass {
  background: rgba(28, 28, 34, 0.28) !important;
  backdrop-filter: blur(20px) saturate(180%) brightness(1.12) !important;
  border: none !important;
  border-radius: 1.5rem;

  box-shadow:
    /* rim de luz fino em volta de toda a borda */
    inset 0 0 0 1px rgba(255, 255, 255, 0.08),
    /* luz batendo de cima-esquerda (like a bisel de vidro real) */
    inset 1.8px 3px 2px -2px rgba(255, 255, 255, 0.35),
    inset -2px -2px 2px -2px rgba(255, 255, 255, 0.28),
    /* sombra suave batendo de baixo-direita */
    inset -0.3px -1px 4px 0px rgba(0, 0, 0, 0.12),
    inset 0px 3px 4px -2px rgba(0, 0, 0, 0.16),
    /* elevação: sombra externa (separa o card do fundo) */
    0px 2px 8px rgba(0, 0, 0, 0.18),
    0px 14px 36px rgba(0, 0, 0, 0.28);
}
```

### Por que `box-shadow: inset` e não `border`?

Testado neste projeto: `border` + `border-radius` + `backdrop-filter` juntos causam uma **costura visível nos cantos** no Chromium (o navegador precisa recompor o blur nas quinas arredondadas onde a borda encontra o `border-radius`, e o resultado é uma linha mais clara/serrilhada). Usando `box-shadow: inset` em vez de `border`, o "contorno" nunca participa do clipping do border-radius do mesmo jeito — o resultado é uma borda limpa em qualquer raio.

A receita de "bisel" (luz de um lado, sombra do outro) é sempre a mesma fórmula: **duas ou três camadas `inset` claras** simulando luz vindo de cima-esquerda, **duas ou três camadas `inset` escuras** simulando sombra em baixo-direita, e por fim (opcional) **sombras externas** para dar elevação/profundidade em relação ao fundo.

### Variantes

```css
/* Aninhado: vidro dentro de vidro precisa de um bisel mais sutil,
   senão o segundo blur "dobra" o brilho do primeiro e fica pesado demais. */
.liquid-glass .liquid-glass {
  backdrop-filter: blur(14px) saturate(170%) brightness(1.1) !important;
  /* bisel mais suave, mesma fórmula com valores menores */
}

/* Superfícies grandes/quase full-screen (ex.: grid do Calendário):
   mesma "borda de vidro" (bisel), mas SEM as sombras externas de elevação
   — em áreas muito grandes, a sombra de elevação criava "pontas" visíveis
   nos cantos porque a sombra some antes de cobrir todo o perímetro. */
.liquid-glass.no-elevation {
  /* mesmo bisel, sem as duas últimas camadas (0px 2px 8px / 0px 14px 36px) */
}

/* Pílula do header: propositalmente SEM backdrop-filter.
   Vidro aninhado dentro de outro vidro com blur (o header também tem
   backdrop-filter) fazia o Chrome recompor as camadas a cada repaint
   (ex. hover no menu) e "acender" uma tarja sobre o conteúdo atrás.
   Como essa pílula só enxerga o fundo chapado do header, um preenchimento
   sólido translúcido fica visualmente idêntico — sem o bug. */
.liquid-glass.shadow-header-btn {
  background: rgba(255, 255, 255, 0.13);
  backdrop-filter: none;
}
```

**Regra prática:** se a superfície é grande (mais que ~300px) ou tem texto que quebra linha, use `.liquid-glass` (blur puro). Se for um botão pequeno tipo pílula, use o sistema de refração abaixo — ele fica muito mais "vivo", mas quebra em áreas grandes (ver seção 2).

---

## 2. Refração SVG: `.lqg-btn` / `.lqg-lens`

Esse é o efeito "de verdade" do liquid glass da Apple: além do blur, a luz por trás do botão **se distorce** (refrata), como se estivesse passando por uma lente convexa. Isso é feito com um filtro SVG `feDisplacementMap`, compartilhado globalmente pela página inteira.

### O filtro (uma vez só, montado no `App.tsx`)

```tsx
// src/components/ui/liquid-glass-button.tsx
const FILTER_ID = "liquid-glass-refraction";

export function LiquidGlassFilter() {
  return (
    <svg className="absolute w-0 h-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <filter id={FILTER_ID} primitiveUnits="objectBoundingBox">
        {/* mapa de deslocamento pré-renderizado (WebP) — define pra onde
            cada pixel do fundo "escorre" dentro da lente */}
        <feImage result="map" width="100%" height="100%" href={LIQUID_GLASS_MAP} preserveAspectRatio="none" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="0.01" result="blur" />
        <feDisplacementMap in="blur" in2="map" scale="0.5" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
```

`<LiquidGlassFilter />` é renderizado **uma única vez**, no `App.tsx`, porque define um `<filter id="liquid-glass-refraction">` global — qualquer elemento na página pode referenciá-lo via `backdrop-filter: url(#liquid-glass-refraction)`.

### A camada-lente

```css
.lqg-lens {
  background-color: rgba(255, 255, 255, 0.05);
  /* Chrome/Edge refratam via SVG; Safari não suporta url() em
     backdrop-filter e cai de volta pra blur simples. */
  backdrop-filter: blur(8px) url(#liquid-glass-refraction) saturate(150%);
  -webkit-backdrop-filter: blur(8px) saturate(150%);
  box-shadow: /* mesmo tipo de bisel inset da seção 1, com --glass-reflex-light/dark controlando a intensidade */;
}
```

```tsx
// src/components/ui/liquid-glass-button.tsx
<button className={cn("lqg-btn relative isolate ...", className)} {...props}>
  {/* A camada-lente PRECISA ficar vazia de conteúdo — se tiver o texto
      dentro, o backdrop-filter captura o próprio texto junto com o fundo
      e cria um "fantasma" duplicado por trás da letra. */}
  <span className={cn("lqg-lens absolute inset-0 -z-10 rounded-[inherit] pointer-events-none", tintClass)} />
  <span className="lqg-text relative z-10 flex items-center gap-2">{children}</span>
</button>
```

O texto e a lente ficam em **camadas (`span`) separadas**, empilhadas com `z-index`: a lente atrás (`-z-10`, vazia), o texto na frente (`z-10`). Isso evita o "fantasma" de texto duplicado que aparece se o `backdrop-filter` tentar refratar o próprio conteúdo do botão.

### Tons de cor (tint)

O material é sempre o mesmo — o que muda é a cor de fundo da lente, translúcida:

```css
.lqg-lens--primary { background-color: rgba(104, 41, 192, 0.9); }
.lqg-lens--success { background-color: rgba(22, 163, 74, 0.55); }
.lqg-lens--danger  { background-color: rgba(220, 38, 38, 0.55); }
```

Convenção do app: `tint="danger"` para Cancelar/Excluir, `tint="primary"` para Salvar/Confirmar/Criar, sem tint (neutro) para toggles (Google, Notion, Tags, Etapa).

### Ajuste fino do brilho: `--glass-reflex-light` / `--glass-reflex-dark`

As camadas de `box-shadow: inset` usam `calc(var(--glass-reflex-light) * N%)` em vez de porcentagens fixas — assim dá pra suavizar o rim de luz por contexto sem duplicar toda a regra:

```css
.lqg-lens {
  /* o rim de luz batia muito mais claro aqui que nos cards (.liquid-glass),
     pelo contraste com o fundo mais sólido/tingido do botão — reduzido
     pra ficar "menos branco" */
  --glass-reflex-light: 0.65;
  --glass-reflex-dark: 1;
}
```

### Limitação conhecida: não usar em superfícies grandes

O mapa de deslocamento (`LIQUID_GLASS_MAP`) é um **WebP de tamanho fixo**, desenhado pra distorcer uniformemente uma pílula pequena. Esticado sobre um card grande ou com múltiplas linhas de texto, a distorção fica desigual — um efeito "manchado"/borrado em blocos, em vez de uma refração suave. Foi exatamente por isso que os cards de atividade do Calendário usam `.status-card` (seção 1, variante blur-puro sem SVG) em vez de `.lqg-lens`.

---

## 3. Refração por instância: componente `<LiquidGlass>`

Para os cards de KPI do Dashboard, cada card precisa da sua **própria** distorção, proporcional ao próprio tamanho (não um mapa fixo compartilhado). Isso é um componente React que gera um filtro SVG único por instância, medindo o elemento com `ResizeObserver`.

```tsx
// src/components/ui/liquid-glass.tsx (resumido)
export const LiquidGlass = React.forwardRef<HTMLDivElement, LiquidGlassProps>(
  ({ children, radius = 16, depth = 8, blur = 20, strength = 40, ...props }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [filterId] = useState(() => `liquid-glass-${Math.random().toString(36).substr(2, 9)}`);

    useLayoutEffect(() => {
      if (!internalRef.current) return;
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setSize({ width: Math.ceil(entry.contentRect.width), height: Math.ceil(entry.contentRect.height) });
        }
      });
      observer.observe(internalRef.current);
      return () => observer.disconnect();
    }, []);

    // gera um mapa de deslocamento SVG on-the-fly, do tamanho exato do card:
    // gradiente radial esverdeado/vermelho simulando luz refratando nas bordas
    const dMapUrl = useMemo(() => {
      /* ...monta um <svg> com <linearGradient> + <rect rx=radius> borrado,
         e devolve como data URI... */
    }, [size.width, size.height, radius, depth, filterId]);

    return (
      <div ref={internalRef} className="relative rounded-2xl" {...props}>
        <svg style={{ position: "absolute", width: 0, height: 0 }}>
          <filter id={filterId} colorInterpolationFilters="sRGB">
            <feImage href={dMapUrl} result="displacementMap" />
            <feDisplacementMap in="SourceGraphic" in2="displacementMap" scale={strength} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backdropFilter: `blur(${blur / 2}px) url(#${filterId}) blur(${blur}px) brightness(1.1) saturate(1.5)`,
          }}
        />
        <div className="relative z-10">{children}</div>
      </div>
    );
  }
);
```

Pontos importantes:

- **`useLayoutEffect`, não `useEffect`**: mede e aplica o filtro *antes* do navegador pintar o primeiro frame. Com `useEffect` (roda depois do paint), o card aparecia 1 frame sem blur/refração — só o fallback chapado — e então "pulava" pro efeito real no frame seguinte (pop visível).
- **`filterId` único por instância** (`Math.random()`): cada card tem seu próprio `<filter>`, então o mapa de deslocamento é gerado do tamanho exato daquele card específico — nada de distorção esticada como no `.lqg-lens`.
- **Fallback em `blur(${blur}px)` puro** enquanto `size` ainda não foi medido (`hasDimensions === false`), pra nunca renderizar sem nenhum efeito.

### Gotcha: `motion.create()` (Framer Motion) quebra a medição

Quando este componente é envolvido por `motion.create(LiquidGlass)`, o `ref` que ele recebe deixa de ser um objeto (`{ current: ... }`) e vira uma **função callback** — usar esse `ref` diretamente como `containerRef` faz a medição de tamanho falhar sempre (o `ResizeObserver` nunca chega a observar nada, porque `containerRef.current` nunca existe). A correção: **sempre medir via um ref interno**, e repassar o nó DOM resolvido pro ref externo (seja ele função ou objeto) separadamente:

```tsx
const internalRef = useRef<HTMLDivElement>(null);
const containerRef = internalRef; // nunca usar o `ref` externo pra medir

useLayoutEffect(() => {
  if (typeof ref === "function") ref(internalRef.current);
  else if (ref) ref.current = internalRef.current;
}, [ref]);
```

---

## 4. O problema difícil: `backdrop-filter` dentro de `overflow-x: auto`

Este foi o caso mais complicado: o Funil (kanban de leads) precisa de scroll horizontal (`overflow-x: auto`), e os cards dentro dele precisam de `backdrop-filter` desfocando o **wallpaper roxo fixo** da página (pintado em `CRMLayout.tsx` com `position: fixed; inset: 0`).

### Por que não funciona por padrão

Um ancestral com `overflow` diferente de `visible` vira a "**raiz de backdrop**" (backdrop root) pra tudo dentro dele: o `backdrop-filter` de um descendente só consegue amostrar conteúdo pintado **dentro desse limite**. Conteúdo `position: fixed`, mesmo que visualmente esteja "atrás" na tela, pertence a um contexto de empilhamento separado e fica fora do alcance — **mesmo que o fixed esteja fora do container com overflow**.

Provado neste projeto com um teste direto: um `<div>` `position: fixed` vermelho/verde, injetado via DOM e sobreposto a um card, pintou **totalmente opaco por cima do card** em vez de aparecer desfocado atrás dele — confirmando que o fixed vive numa camada de composição totalmente separada, inalcançável "por trás" pelo `backdrop-filter` de um elemento em fluxo normal dentro de um container com scroll.

`background-attachment: fixed` tem o mesmo problema — também não é amostrado.

### A solução: réplica do wallpaper, em fluxo normal, dentro do próprio container

A única forma que funcionou: pintar uma **cópia não-fixed** do wallpaper diretamente dentro do container que tem o `overflow`, usando `position: sticky` pra ela acompanhar o scroll horizontal sem sair da tela, e matemática em JS pra alinhar essa cópia pixel-a-pixel com o wallpaper de verdade (que é `background-size: cover; background-position: center` relativo ao **viewport**, não ao elemento).

```tsx
// src/pages/LeadsKanban.tsx
function KanbanGlassBackdrop() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let natW = 0, natH = 0, raf = 0;

    const update = () => {
      raf = 0;
      const node = ref.current;
      if (!node || !natW || !natH) return;

      const rect = node.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight;

      // replica a matemática de `background-size: cover` +
      // `background-position: center`, mas relativa à VIEWPORT
      // (onde o wallpaper de verdade está fixado), não ao elemento.
      const scale = Math.max(vw / natW, vh / natH);
      const w = natW * scale, h = natH * scale;
      const x = (vw - w) / 2 - rect.left;
      const y = (vh - h) / 2 - rect.top;

      node.style.backgroundSize = `100% 100%, ${w}px ${h}px`;
      node.style.backgroundPosition = `0 0, ${x}px ${y}px`;
    };

    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };

    const img = new Image();
    img.onload = () => { natW = img.naturalWidth; natH = img.naturalHeight; schedule(); };
    img.src = "/app-bg.webp";

    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="sticky left-0 -z-10 self-stretch shrink-0 pointer-events-none"
      style={{
        minWidth: "100%",
        marginRight: "-100%",
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.25)), url("/app-bg.webp")',
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}
```

Uso — inserido como **primeiro filho** do container com `overflow-x-auto`, antes das colunas:

```tsx
<div ref={kanbanRef} className="flex gap-3 sm:gap-4 overflow-x-auto overflow-y-hidden ...">
  <KanbanGlassBackdrop />
  {stages.map((stage) => ( /* colunas... */ ))}
</div>
```

E os cards voltam a usar o vidro de verdade, agora com algo real pra amostrar:

```tsx
<Card className={cn(
  "liquid-glass no-elevation rounded-2xl p-2.5 sm:p-3 relative group cursor-pointer",
  "transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110",
)} />
```

### Por que cada parte existe

- **`position: sticky` (não `fixed`, não `absolute`)**: `sticky` mantém o elemento dentro do **mesmo contexto de empilhamento/fluxo** do container com scroll — por isso o `backdrop-filter` dos cards consegue alcançá-lo — mas ainda assim "gruda" na viewport horizontalmente conforme o usuário rola o kanban, então visualmente nunca sai do lugar (efeito idêntico a estar fixo, sem o bug do `fixed` de verdade).
- **`marginRight: -100%` + `minWidth: 100%`**: sem isso, o elemento `sticky` (que teria largura 0 por padrão, já que não tem conteúdo/filhos) empurraria as colunas do kanban pra direita, alargando o scroll horizontal. O `margin-right` negativo "devolve" o espaço que o `min-width: 100%` tomou, então ele fica sobreposto (via `-z-10`) sem interferir no layout do flex.
- **Recalcular no `scroll` E no `resize`**: o wallpaper real está fixo na tela (não se move), mas o container do kanban rola — então a posição relativa entre os dois muda a cada pixel de scroll, exigindo recálculo contínuo via `requestAnimationFrame`.
- **Carregar a imagem via `new Image()` primeiro**: só depois de saber `naturalWidth`/`naturalHeight` reais do arquivo é possível reproduzir a matemática do `cover`; usar um tamanho hardcoded quebraria em outras resoluções de tela.

Esse é o padrão a seguir sempre que precisar de `backdrop-filter` real dentro de qualquer container `overflow-x`/`overflow-y` que role sobre um fundo fixo: nunca tentar fazer o `backdrop-filter` "alcançar" o fixed — sempre trazer uma réplica alinhada pra dentro do próprio container.

---

## Resumo — qual sistema usar

- **Card, modal, painel grande** → `.liquid-glass` (+ `.no-elevation` se for quase full-screen, ou `.shadow-header-btn` se estiver aninhado dentro de outro vidro com blur).
- **Botão pílula pequeno, uma linha de texto** → `LiquidGlassButton` (`.lqg-btn`/`.lqg-lens`), com `tint` conforme a ação.
- **Card com necessidade de refração própria/proporcional ao tamanho** (ex.: KPIs) → componente `<LiquidGlass>`.
- **Qualquer vidro dentro de um container com `overflow-x`/`overflow-y` sobre fundo fixo** → precisa de uma réplica do fundo em fluxo normal (`position: sticky` + matemática de viewport), no padrão do `KanbanGlassBackdrop`.
