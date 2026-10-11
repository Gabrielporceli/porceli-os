# Como levar a barra lateral (animação da pílula líquida) para outro sistema

Esta pasta é um **kit pronto**: copie os 4 arquivos para o outro projeto e siga os passos. A animação vem de **três coisas** — se faltar uma, não fica igual.

| # | O quê | Arquivo |
|---|---|---|
| 1 | **Vidro da barra** (wallpaper repintado + bisel, sem `backdrop-filter`) | `liquid-sidebar.css` + hook `useSideNavWallpaper` (em `LiquidSidebar.tsx`) |
| 2 | **Forma da pílula** (duas bolhas + pescoço, “drenar” de um ícone para o outro) | `mobilePillGeometry.ts` |
| 3 | **Material da pílula** (gooey SVG + bisel geométrico idêntico ao CSS) | `MobilePillBlob.tsx` |
| + | Componente que junta tudo (versão autônoma, só desktop) | `LiquidSidebar.tsx` |

## Passo a passo

1. **Copie** para o projeto novo (ex.: `src/components/sidebar/`): `LiquidSidebar.tsx`, `MobilePillBlob.tsx`, `mobilePillGeometry.ts`. Em `MobilePillBlob.tsx` há `import { cn } from "@/lib/utils"` — aponte para o seu helper (`clsx` + `tailwind-merge`) ou troque por uma junção simples de strings.
2. **Cole o CSS** `liquid-sidebar.css` no CSS global (depois do Tailwind). Troque o `url("/app-bg.webp")` do `.side-nav::before` pelo **mesmo wallpaper que está no fundo da página** do outro sistema.
3. **Fundo da página = wallpaper `cover` + centralizado, `fixed inset-0`.** A barra só “parece vidro” porque repinta exatamente o pedaço do fundo que está atrás dela (o JS alinha por `--sn-x/y/w/h`). Se o outro sistema tiver o fundo diferente (cor sólida, gradiente), o vidro continua funcionando, mas o wallpaper que você passar em `wallpaper={...}` precisa ser o mesmo da página.
4. **Use o componente:**
   ```tsx
   <LiquidSidebar
     items={[{ url: "/dashboard", title: "Dashboard", icon: Category }, /* … */]}
     activeUrl={location.pathname}
     onSelect={(url) => navigate(url)}
     logo={<img src="/logo.png" className="h-8 w-8 object-contain" alt="" />}
     footer={<button onClick={logout} className="p-2 text-white/40 hover:text-red-500"><Logout className="h-5 w-5" /></button>}
     wallpaper="/seu-wallpaper.webp"
   />
   ```
   Cada `icon` é um componente que aceita `className` e usa `currentColor` (Iconsax, Lucide, SVG próprio).
5. **Reserve o espaço da barra** no layout: o conteúdo precisa de `padding-left: 104px` em telas `md+` (barra de 72px + 16px de recuo + 16px de respiro).
6. **Requisitos de Tailwind:** classes usadas (`bg-white/5`, `h-10 w-10 md:h-11 md:w-11`, `scrollbar-hide`, etc.). Se o seu Tailwind não tiver `scrollbar-hide`, adicione:
   ```css
   .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
   .scrollbar-hide::-webkit-scrollbar { display: none; }
   ```

## Os números que fazem a animação ficar IGUAL (não mude)

- **Duração** da transferência: `620ms`, easing **easeInOutCubic** (`u<.5 ? 4u³ : 1−(−2u+2)³/2`), que vira o progresso `p = ease(u) × SWITCH_AT`.
- **Marcos** (`PILL_DEFAULTS`): bolha da frente termina de crescer em `p=0.55`; a de trás começa a encolher em `0.40` e some em `0.92` (aí a âncora troca sem salto); pescoço de altura `0.30 × slot`, nasce até `p=0.20`.
- **Gooey:** `GOO_BLUR 4`, `GOO_K 11`, `GOO_O 4.6` (calibrados pixel a pixel contra o CSS real).
- **Salto longo** (mais de 1,3 × slot): sem pescoço — a bolha antiga encolhe e a nova cresce ao mesmo tempo (`easeInOut`).
- **Material da pílula:** preenchimento `rgba(255,255,255,.13)` + 8 camadas de bisel + sombra `0 1px 3px .05` (réplica geométrica da `.lqg-lens--nav`, em `NAV_INSETS`). **Se você mudar o bisel do CSS, tem que mudar `NAV_INSETS` junto.**
- **Vidro da barra:** `blur(20px) saturate(180%) brightness(1.12)` aplicado por `filter` no `::before`, véus `rgba(28,28,34,.28)` e `rgba(0,0,0,.25)`; **sem** `backdrop-filter` de propósito (ele acende uma “tarja de brilho” nos cards vizinhos).
- **Hover do item:** disco `bg-white/5` com fade de `300ms`; ativo = ícone branco com `.lqg-text` (sombra de texto + transição de cor `400ms cubic-bezier(1,0,.4,1)`).

## Pegadinhas

- **A pílula é uma imagem SVG (data URI) re-gerada a cada frame** — por isso a animação é por `requestAnimationFrame` e remede os itens ao vivo. Em aba escondida o navegador pausa o `rAF` (a animação congela até a aba voltar); é normal.
- `slot` (tamanho do item) é **medido**, nunca fixo: se os seus ícones tiverem altura diferente de 40/44px, a pílula acompanha sozinha.
- O wrapper da pílula **não pode** ter `overflow` (ele cortaria o blur do gooey numa borda reta). O `<nav>` rola, o wrapper não.
- `onAnimate(ms)` existe para segurar um overlay de carregamento enquanto a pílula anda (no Porceli OS o overlay de transição de página espera a barra terminar).
- A versão **mobile** (pílula horizontal em carrossel infinito, arrastada pelo dedo) está em `src/components/Layout/Header.tsx` do Porceli OS; este kit cobre só a barra lateral de desktop.

## Como conferir que ficou idêntico
No Porceli OS há laboratórios públicos para calibrar a pílula frame a frame (`/dev/pill`). Para comparar, abra os dois sistemas lado a lado e troque de item: a bolha antiga deve “drenar” (encolher acelerando) enquanto a nova cresce rápido e assenta, ligadas por um pescoço quando o salto é de um item só.
