# Porceli OS — Design System

> Documento de referência completo do design system do Porceli CRM.
> Envie este arquivo para qualquer projeto novo e replique o mesmo estilo visual.

---

## 1. Fundamentos

### 1.1 Paleta de Cores

```css
/* Marca principal */
--brand-purple: #6829c0;
--brand-purple-hover: #7c35e0;

/* Fundos */
--bg-base:     #121212;   /* fundo da página */
--bg-surface:  #1e1e1e;   /* cards e painéis */
--bg-elevated: #242424;   /* inputs, dropdowns */
--bg-hover:    #2a2a2a;   /* hover de linha/item */

/* Texto */
--text-primary:   rgba(255, 255, 255, 1.0);
--text-secondary: rgba(255, 255, 255, 0.6);
--text-muted:     rgba(255, 255, 255, 0.4);
--text-disabled:  rgba(255, 255, 255, 0.2);

/* Bordas */
--border-subtle:  rgba(255, 255, 255, 0.06);
--border-default: rgba(255, 255, 255, 0.10);
--border-strong:  rgba(255, 255, 255, 0.20);

/* Semânticas */
--color-success:  #22c55e;   /* green-500  */
--color-warning:  #f59e0b;   /* amber-500  */
--color-danger:   #ef4444;   /* red-500    */
--color-info:     #3b82f6;   /* blue-500   */
--color-cyan:     #06b6d4;   /* cyan-500   */
```

#### Tailwind Config (tokens customizados)

```js
// tailwind.config.js
colors: {
  'Porceli': {
    purple: '#6829c0',
    'gray-900': '#121212',
    'gray-800': '#1e1e1e',
    'gray-700': '#242424',
    'gray-600': '#2a2a2a',
    'gray-500': '#3a3a3a',
  }
}
```

---

### 1.2 Tipografia

#### Fonte principal: Founders Grotesk

Arquivos `.woff2` locais (sem dependência de CDN):

```css
@font-face {
  font-family: 'Founders Grotesk';
  src: url('/fonts/FoundersGrotesk-Light.woff2')  format('woff2');
  font-weight: 300; font-display: swap;
}
@font-face {
  font-family: 'Founders Grotesk';
  src: url('/fonts/FoundersGrotesk-Regular.woff2') format('woff2');
  font-weight: 400; font-display: swap;
}
@font-face {
  font-family: 'Founders Grotesk';
  src: url('/fonts/FoundersGrotesk-Medium.woff2')  format('woff2');
  font-weight: 500; font-display: swap;
}
@font-face {
  font-family: 'Founders Grotesk';
  src: url('/fonts/FoundersGrotesk-Semibold.woff2') format('woff2');
  font-weight: 600; font-display: swap;
}
@font-face {
  font-family: 'Founders Grotesk';
  src: url('/fonts/FoundersGrotesk-Bold.woff2') format('woff2');
  font-weight: 700; font-display: swap;
}
```

```css
/* CSS global */
body {
  font-family: 'Founders Grotesk', system-ui, sans-serif;
  background-color: #121212;
  color: #fff;
  -webkit-font-smoothing: antialiased;
}
```

#### Escala tipográfica

| Uso                    | Classe Tailwind              | Tamanho |
|------------------------|------------------------------|---------|
| Título de página       | `text-2xl font-semibold`     | 24px    |
| Título de seção        | `text-lg font-medium`        | 18px    |
| Subtítulo / label      | `text-sm font-medium`        | 14px    |
| Corpo padrão           | `text-sm`                    | 14px    |
| Texto auxiliar / muted | `text-xs text-white/40`      | 12px    |
| Valor numérico grande  | `text-3xl font-semibold`     | 30px    |

---

## 2. Efeito Liquid Glass

O efeito "liquid glass" é a assinatura visual do sistema: superfícies semitransparentes com blur, criando profundidade e hierarquia.

### 2.1 Classe CSS `.liquid-glass`

```css
.liquid-glass {
  background: rgba(18, 18, 18, 0.4);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  filter: brightness(1.2);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}
```

### 2.2 Variações

```css
/* Mais leve — cards secundários, painéis laterais */
.glass-light {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

/* Mais opaco — modais e drawers */
.glass-modal {
  background: rgba(18, 18, 18, 0.85);
  backdrop-filter: blur(25px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}

/* Overlay de fundo de modal */
.glass-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}
```

### 2.3 Uso em Tailwind (via `@layer utilities`)

```css
@layer utilities {
  .liquid-glass {
    @apply bg-black/40 backdrop-blur-2xl;
    filter: brightness(1.2);
    border-top: 1px solid rgba(255,255,255,0.10);
  }
}
```

### 2.4 Regra de aplicação

| Nível       | Opacidade do bg | Blur      | Uso típico               |
|-------------|-----------------|-----------|--------------------------|
| Surface      | 4–8%           | 12px      | Cards de dashboard       |
| Panel        | 40%            | 25px      | Sidebar, painel lateral  |
| Modal        | 85%            | 25px      | Modais, drawers          |
| Overlay      | 50%            | 4px       | Fundo de modal aberto    |

---

## 3. Botões

### 3.1 Sistema CVA (class-variance-authority)

O componente `<Button>` usa CVA para definir variantes e tamanhos de forma consistente.

```tsx
import { cva } from "class-variance-authority";

const buttonVariants = cva(
  // Base — aplica-se a TODOS os botões
  [
    "inline-flex items-center justify-center gap-2",
    "rounded-md font-medium transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6829c0]",
    "disabled:pointer-events-none disabled:opacity-40",
    "cursor-pointer select-none",
  ],
  {
    variants: {
      variant: {
        // Botão primário — ação principal
        primary:
          "bg-[#6829c0] text-white hover:bg-[#7c35e0] active:scale-95",

        // Monocromático — ação neutra
        mono:
          "bg-white text-black hover:bg-white/90 active:scale-95",

        // Destrutivo — excluir, remover
        destructive:
          "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20",

        // Secundário — ação de suporte
        secondary:
          "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10",

        // Contorno — alternativa ao secundário
        outline:
          "border border-white/20 text-white/80 hover:bg-white/5",

        // Tracejado — adicionar item
        dashed:
          "border border-dashed border-white/20 text-white/50 hover:border-white/40 hover:text-white/80",

        // Fantasma — mínimo
        ghost:
          "text-white/60 hover:bg-white/5 hover:text-white",

        // Opaco — similar ao ghost mas mais escuro
        dim:
          "bg-white/[0.03] text-white/50 hover:bg-white/[0.07]",

        // Branco com bordas
        foreground:
          "bg-white/10 text-white hover:bg-white/20 border border-white/10",

        // Inverted — fundo branco em seções especiais
        inverse:
          "bg-white text-[#121212] hover:bg-white/90",
      },
      size: {
        lg:   "h-11 px-6 text-base",
        md:   "h-9 px-4 text-sm",
        sm:   "h-7 px-3 text-xs",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);
```

### 3.2 Uso

```tsx
<Button variant="primary">Salvar</Button>
<Button variant="secondary">Cancelar</Button>
<Button variant="destructive">Excluir</Button>
<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
<Button variant="dashed"><Plus className="h-4 w-4" /> Adicionar</Button>
```

### 3.3 Animação nos botões (padrão oficial)

O padrão de animação envolve um `<motion.div>` wrapper ao redor do `<Button>`. O botão em si não carrega a animação — o wrapper Framer Motion faz isso. Isso garante que o CVA e as classes do botão fiquem intactos enquanto a animação é controlada externamente.

**Comportamento:**
- **Hover:** sobe `2px` + cresce `5%` → sensação de "levitar"
- **Clique (tap):** encolhe para `95%` → feedback tátil imediato
- **Transição:** mola (`spring`) com `stiffness: 400` e `damping: 17` — snappy, com leve overshoot natural

```tsx
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

// Padrão para QUALQUER botão de ação principal
<motion.div
  whileHover={{ scale: 1.05, translateY: -2 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
>
  <Button ...>Label</Button>
</motion.div>
```

### 3.4 Variantes visuais com animação — exemplos reais

**Botão primário (ação principal, ex: "Nova Transação"):**
```tsx
<motion.div
  whileHover={{ scale: 1.05, translateY: -2 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
>
  <Button
    className="bg-primary hover:bg-primary/90 text-white h-11 px-6 rounded-2xl shadow-[0_0_20px_rgba(104,41,192,0.3)] font-bold uppercase tracking-widest text-xs"
  >
    Nova Transação
  </Button>
</motion.div>
```
- `shadow-[0_0_20px_rgba(104,41,192,0.3)]` → glow roxo permanente embaixo do botão
- `uppercase tracking-widest text-xs font-bold` → texto em caixa alta com kerning amplo
- `rounded-2xl` (`border-radius: 16px`) → mais arredondado que o padrão `rounded-md`
- No hover: fundo passa para `bg-primary/90` (ligeiramente mais claro)

**Botão ícone / glass (ações secundárias, ex: sync/refresh):**
```tsx
<motion.div
  whileHover={{ scale: 1.05, translateY: -2 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
>
  <Button
    size="icon"
    className="liquid-glass border-white/5 text-white h-11 w-11 !rounded-2xl hover:bg-white/[0.02]"
  >
    <RefreshCw className="w-4 h-4 text-white/70" />
  </Button>
</motion.div>
```
- `liquid-glass` → fundo semitransparente com blur
- `h-11 w-11` (`44×44px`) com `!rounded-2xl` → quadrado levemente arredondado
- Ícone em `text-white/70` → 70% de opacidade no estado normal
- **Estado de loading:** ícone gira com `animate-spin` e muda para `text-primary` (roxo)

```tsx
<RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-primary' : 'text-white/70'}`} />
```

---

## 4. Modais e Drawers

### 4.1 Estrutura de Modal

```tsx
// Overlay
<div className="fixed inset-0 z-50 flex items-center justify-center"
     style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>

  {/* Painel do modal */}
  <motion.div
    initial={{ opacity: 0, scale: 0.96, y: 8 }}
    animate={{ opacity: 1, scale: 1,    y: 0 }}
    exit={{    opacity: 0, scale: 0.96, y: 8 }}
    transition={{ duration: 0.2, ease: "easeOut" }}
    className="liquid-glass w-full max-w-lg p-6 rounded-2xl"
  >
    {/* Header */}
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-lg font-semibold text-white">Título do Modal</h2>
      <button className="text-white/40 hover:text-white transition-colors">
        <X className="h-5 w-5" />
      </button>
    </div>

    {/* Conteúdo */}
    <div className="space-y-4">...</div>

    {/* Footer */}
    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
      <Button variant="secondary">Cancelar</Button>
      <Button variant="primary">Confirmar</Button>
    </div>
  </motion.div>
</div>
```

### 4.2 Drawer (painel lateral)

```tsx
<motion.div
  initial={{ x: "100%" }}
  animate={{ x: 0 }}
  exit={{    x: "100%" }}
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
  className="fixed inset-y-0 right-0 z-50 w-[480px] liquid-glass border-l border-white/10 p-6"
>
```

### 4.3 Padrão de dimensionamento

| Tipo    | Largura max | Uso                           |
|---------|-------------|-------------------------------|
| sm      | `max-w-sm`  | Confirmação, alertas simples  |
| md      | `max-w-lg`  | Formulários padrão            |
| lg      | `max-w-2xl` | Formulários complexos         |
| xl      | `max-w-4xl` | Visualizações, detalhes       |
| Drawer  | `w-[480px]` | Painel lateral deslizante     |

---

## 5. Cards e Superfícies

### 5.1 Card padrão

```tsx
<div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
```

### 5.2 Card com hover interativo

```tsx
<motion.div
  whileHover={{ backgroundColor: "rgba(255,255,255,0.04)" }}
  className="rounded-xl border border-white/[0.06] p-5 cursor-pointer transition-colors"
>
```

### 5.3 Card de métrica (KPI)

```tsx
<div className="liquid-glass rounded-xl p-5">
  <div className="flex items-center justify-between mb-3">
    <p className="text-sm text-white/50">Receita Total</p>
    <div className="p-2 rounded-lg bg-[#6829c0]/10">
      <TrendingUp className="h-4 w-4 text-[#6829c0]" />
    </div>
  </div>
  <p className="text-3xl font-semibold text-white">R$ 48.200</p>
  <p className="text-xs text-green-400 mt-1">+12% vs mês anterior</p>
</div>
```

### 5.4 Linha de tabela / lista

```tsx
<div className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-white/[0.03] transition-colors border-b border-white/[0.04]">
```

---

## 6. Animações

### 6.1 Framer Motion — Padrões de entrada

```tsx
// Fade + slide de baixo para cima (padrão de página)
const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
};

// Lista com stagger (itens aparecem em sequência)
const containerVariants = {
  animate: { transition: { staggerChildren: 0.06 } }
};
const itemVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// Escala (para modais)
const modalVariants = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1,    y: 0 },
  exit:    { opacity: 0, scale: 0.96, y: 8 },
};
```

### 6.2 Transições recomendadas

```tsx
// Suave — animações de UI (padrão)
transition={{ duration: 0.2, ease: "easeOut" }}

// Spring — botões, elementos interativos
transition={{ type: "spring", stiffness: 400, damping: 17 }}

// Spring mais lento — drawers, painéis
transition={{ type: "spring", stiffness: 300, damping: 30 }}
```

### 6.3 Keyframes Tailwind

```js
// tailwind.config.js
keyframes: {
  'fade-in': {
    '0%':   { opacity: '0', transform: 'translateY(8px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
  'slide-in-right': {
    '0%':   { transform: 'translateX(100%)' },
    '100%': { transform: 'translateX(0)' },
  },
  'accordion-down': {
    from: { height: '0' },
    to:   { height: 'var(--radix-accordion-content-height)' },
  },
  'accordion-up': {
    from: { height: 'var(--radix-accordion-content-height)' },
    to:   { height: '0' },
  },
},
animation: {
  'fade-in':        'fade-in 0.2s ease-out',
  'slide-in-right': 'slide-in-right 0.3s ease-out',
  'accordion-down': 'accordion-down 0.2s ease-out',
  'accordion-up':   'accordion-up 0.2s ease-out',
},
```

### 6.4 Hover em ícones e elementos interativos

```tsx
// Glow roxo no hover
<motion.div whileHover={{ scale: 1.05 }} className="icon-glow-purple p-2 rounded-lg">
  <Zap className="h-5 w-5 text-[#6829c0]" />
</motion.div>
```

```css
/* CSS global */
.icon-glow-purple {
  filter: drop-shadow(0 0 6px rgba(104, 41, 192, 0.6));
}
.icon-glow-cyan {
  filter: drop-shadow(0 0 6px rgba(6, 182, 212, 0.6));
}
```

---

## 7. Gráficos (Recharts)

### 7.1 Paleta de cores para gráficos

```ts
const CHART_COLORS = {
  primary: "#6829c0",     // roxo marca
  secondary: "#06b6d4",   // ciano
  success: "#22c55e",     // verde
  warning: "#f59e0b",     // amarelo
  danger: "#ef4444",      // vermelho
  muted: "rgba(255,255,255,0.15)",
};

// Para múltiplas séries
const SERIES_COLORS = ["#6829c0", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444"];
```

### 7.2 Tooltip personalizado

```tsx
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="liquid-glass px-4 py-3 rounded-xl text-sm">
      <p className="text-white/50 mb-2 text-xs">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-white/70">{entry.name}:</span>
          <span className="text-white font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};
```

### 7.3 Configuração base de gráfico de barras

```tsx
<ResponsiveContainer width="100%" height={240}>
  <BarChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
    <XAxis
      dataKey="month"
      tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }}
      axisLine={false}
      tickLine={false}
    />
    <YAxis
      tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }}
      axisLine={false}
      tickLine={false}
    />
    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
    <Bar dataKey="value" fill="#6829c0" radius={[4, 4, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

### 7.4 Configuração base de gráfico de linha

```tsx
<ResponsiveContainer width="100%" height={240}>
  <LineChart data={data}>
    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
    <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} axisLine={false} tickLine={false} />
    <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} axisLine={false} tickLine={false} />
    <Tooltip content={<CustomTooltip />} />
    <Line
      type="monotone"
      dataKey="value"
      stroke="#6829c0"
      strokeWidth={2}
      dot={false}
      activeDot={{ r: 4, fill: "#6829c0", strokeWidth: 0 }}
    />
  </LineChart>
</ResponsiveContainer>
```

### 7.5 Gráfico de rosca (Donut)

```tsx
<ResponsiveContainer width="100%" height={200}>
  <PieChart>
    <Pie
      data={data}
      cx="50%" cy="50%"
      innerRadius={60} outerRadius={80}
      paddingAngle={3}
      dataKey="value"
    >
      {data.map((_, i) => (
        <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
      ))}
    </Pie>
    <Tooltip content={<CustomTooltip />} />
  </PieChart>
</ResponsiveContainer>
```

---

## 8. Dropdowns e Selects

### 8.1 Radix UI DropdownMenu

```tsx
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

<DropdownMenu.Root>
  <DropdownMenu.Trigger asChild>
    <Button variant="outline">
      Opções <ChevronDown className="h-4 w-4 opacity-50" />
    </Button>
  </DropdownMenu.Trigger>

  <DropdownMenu.Portal>
    <DropdownMenu.Content
      className={[
        "z-50 min-w-[180px] overflow-hidden rounded-xl p-1",
        "bg-[#242424] border border-[#2a2a2a]",
        "shadow-xl shadow-black/40",
        "animate-fade-in",
      ].join(" ")}
      sideOffset={6}
    >
      <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 rounded-lg cursor-pointer hover:bg-white/[0.06] hover:text-white outline-none transition-colors">
        <Pencil className="h-4 w-4" />
        Editar
      </DropdownMenu.Item>

      <DropdownMenu.Separator className="my-1 h-px bg-white/[0.06]" />

      <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 rounded-lg cursor-pointer hover:bg-red-500/10 outline-none transition-colors">
        <Trash2 className="h-4 w-4" />
        Excluir
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
```

### 8.2 Select nativo estilizado

```tsx
<select className="w-full h-9 px-3 rounded-lg bg-[#242424] border border-white/10 text-sm text-white/80 outline-none focus:border-[#6829c0] focus:ring-1 focus:ring-[#6829c0] transition-colors appearance-none cursor-pointer">
  <option value="">Selecionar...</option>
  <option value="a">Opção A</option>
</select>
```

### 8.3 Combobox / Select com pesquisa (Radix Popover + lista)

```tsx
// Padrão: Trigger tipo botão + Popover com input de busca + lista
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" className="w-full justify-between">
      {selected?.label ?? "Selecionar..."}
      <ChevronsUpDown className="h-4 w-4 opacity-40" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-[#242424] border-[#2a2a2a] rounded-xl overflow-hidden">
    <input
      placeholder="Buscar..."
      className="w-full px-3 py-2 bg-transparent border-b border-white/10 text-sm text-white outline-none placeholder:text-white/30"
    />
    <div className="max-h-[220px] overflow-y-auto p-1">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => setSelected(opt)}
          className="w-full text-left px-3 py-2 text-sm text-white/70 rounded-lg hover:bg-white/[0.06] hover:text-white transition-colors"
        >
          {opt.label}
        </button>
      ))}
    </div>
  </PopoverContent>
</Popover>
```

---

## 9. Inputs e Formulários

### 9.1 Input de texto padrão

```tsx
<input
  type="text"
  className={[
    "w-full h-9 px-3 rounded-lg",
    "bg-[#242424] border border-white/10",
    "text-sm text-white placeholder:text-white/30",
    "outline-none transition-all",
    "focus:border-[#6829c0] focus:ring-1 focus:ring-[#6829c0]/40",
  ].join(" ")}
  placeholder="Digite aqui..."
/>
```

### 9.2 Textarea

```tsx
<textarea
  className={[
    "w-full px-3 py-2 rounded-lg resize-none",
    "bg-[#242424] border border-white/10",
    "text-sm text-white placeholder:text-white/30",
    "outline-none transition-all",
    "focus:border-[#6829c0] focus:ring-1 focus:ring-[#6829c0]/40",
  ].join(" ")}
  rows={4}
/>
```

### 9.3 Input com ícone

```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
  <input
    className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#242424] border border-white/10 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#6829c0] transition-all"
    placeholder="Buscar..."
  />
</div>
```

### 9.4 Label padrão

```tsx
<label className="block text-xs font-medium text-white/50 mb-1.5">
  Nome do campo
</label>
```

### 9.5 Checkbox e Switch (Radix UI)

```tsx
// Checkbox
<Checkbox.Root className="h-4 w-4 rounded border border-white/20 bg-transparent data-[state=checked]:bg-[#6829c0] data-[state=checked]:border-[#6829c0] transition-colors">
  <Checkbox.Indicator>
    <Check className="h-3 w-3 text-white" />
  </Checkbox.Indicator>
</Checkbox.Root>

// Switch
<Switch.Root className="h-5 w-9 rounded-full bg-white/10 data-[state=checked]:bg-[#6829c0] transition-colors outline-none cursor-pointer">
  <Switch.Thumb className="block h-4 w-4 rounded-full bg-white shadow-sm translate-x-0.5 data-[state=checked]:translate-x-[18px] transition-transform" />
</Switch.Root>
```

---

## 10. Data, Hora e Calendário

### 10.1 React Day Picker — Configuração

```tsx
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import "react-day-picker/dist/style.css";

// CSS override para tema escuro
const rdpStyles = `
  .rdp {
    --rdp-accent-color: #6829c0;
    --rdp-background-color: rgba(104, 41, 192, 0.12);
    --rdp-outline: 2px solid #6829c0;
    --rdp-outline-selected: 2px solid #6829c0;
    color: white;
  }
  .rdp-day_selected { color: white !important; }
  .rdp-day:hover:not(.rdp-day_selected) { background: rgba(255,255,255,0.06) !important; }
  .rdp-head_cell { color: rgba(255,255,255,0.4) !important; font-size: 12px; }
  .rdp-button:focus-visible { outline: var(--rdp-outline); }
`;
```

```tsx
<style>{rdpStyles}</style>
<DayPicker
  mode="single"
  selected={date}
  onSelect={setDate}
  locale={ptBR}
  className="p-3"
/>
```

### 10.2 Popover de seleção de data

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" className="w-full justify-start gap-2">
      <CalendarIcon className="h-4 w-4 text-white/40" />
      {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0 bg-[#1e1e1e] border-white/10 rounded-xl">
    <DayPicker mode="single" selected={date} onSelect={setDate} locale={ptBR} />
  </PopoverContent>
</Popover>
```

### 10.3 Input de hora

```tsx
<input
  type="time"
  className="h-9 px-3 rounded-lg bg-[#242424] border border-white/10 text-sm text-white outline-none focus:border-[#6829c0] transition-all [color-scheme:dark]"
/>
```

### 10.4 Formatação de datas (date-fns, pt-BR)

```ts
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

format(date, "dd/MM/yyyy")                     // → 29/05/2026
format(date, "dd 'de' MMMM", { locale: ptBR }) // → 29 de maio
formatDistanceToNow(date, { locale: ptBR, addSuffix: true }) // → há 2 horas
```

---

## 11. Badges e Status

### 11.1 Badge padrão

```tsx
const Badge = ({ children, variant }: { children: React.ReactNode, variant: "success" | "warning" | "danger" | "info" | "default" }) => {
  const styles = {
    success: "bg-green-500/10  text-green-400  border-green-500/20",
    warning: "bg-amber-500/10  text-amber-400  border-amber-500/20",
    danger:  "bg-red-500/10    text-red-400    border-red-500/20",
    info:    "bg-blue-500/10   text-blue-400   border-blue-500/20",
    default: "bg-white/5       text-white/60   border-white/10",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${styles[variant]}`}>
      {children}
    </span>
  );
};
```

### 11.2 Badge com ponto de status

```tsx
// Ponto de status animado (online/ativo)
<span className="flex items-center gap-1.5">
  <span className="relative flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
  </span>
  <span className="text-xs text-green-400">Ativo</span>
</span>
```

### 11.3 Indicadores de status comuns

| Status           | Cor       | Classe                          |
|------------------|-----------|---------------------------------|
| Ativo / Realizado| Verde     | `text-green-400 bg-green-500/10`|
| Em andamento     | Azul      | `text-blue-400 bg-blue-500/10`  |
| Pendente         | Amarelo   | `text-amber-400 bg-amber-500/10`|
| Erro / Cancelado | Vermelho  | `text-red-400 bg-red-500/10`    |
| Neutro / Draft   | Branco    | `text-white/50 bg-white/5`      |
| Roxo / Premium   | Roxo      | `text-purple-400 bg-purple-500/10`|

---

## 12. Ícones

### 12.1 Biblioteca: Lucide React

```tsx
import { Zap, Users, TrendingUp, ChevronRight } from "lucide-react";

// Tamanhos padrão
<Icon className="h-4 w-4" />  // inline / label
<Icon className="h-5 w-5" />  // botão / menu item
<Icon className="h-6 w-6" />  // header / destaque
```

### 12.2 Ícone com fundo colorido (card de métrica)

```tsx
<div className="p-2 rounded-lg bg-[#6829c0]/10">
  <Zap className="h-4 w-4 text-[#6829c0]" />
</div>
```

### 12.3 Efeito glow em ícones

```css
/* Adicionar ao CSS global */
.icon-glow-purple { filter: drop-shadow(0 0 6px rgba(104, 41, 192, 0.7)); }
.icon-glow-cyan   { filter: drop-shadow(0 0 6px rgba(6, 182, 212, 0.7)); }
.icon-glow-green  { filter: drop-shadow(0 0 6px rgba(34, 197, 94, 0.7)); }
```

---

## 13. Notificações e Toasts

### 13.1 Sonner — Configuração

```tsx
import { Toaster, toast } from "sonner";

// Colocar uma vez no root da aplicação
<Toaster
  position="bottom-right"
  toastOptions={{
    style: {
      background: "rgba(18, 18, 18, 0.85)",
      backdropFilter: "blur(20px)",
      border: "1px solid rgba(255,255,255,0.10)",
      color: "#fff",
      borderRadius: "12px",
      fontSize: "14px",
    },
  }}
/>
```

### 13.2 Uso dos toasts

```ts
toast.success("Salvo com sucesso!");
toast.error("Erro ao salvar.");
toast.warning("Verifique os dados.");
toast.info("Sincronizando...");
toast.loading("Enviando...", { id: "send" });
toast.dismiss("send");

// Toast customizado
toast.custom((t) => (
  <div className="liquid-glass px-4 py-3 rounded-xl flex items-center gap-3">
    <CheckCircle className="h-5 w-5 text-green-400" />
    <span>Operação concluída</span>
  </div>
));
```

---

## 14. Layout e Estrutura de Página

### 14.1 Estrutura geral

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (240px fixo) │  Área de conteúdo (flex-1)      │
│  ─────────────────────│  ──────────────────────────────  │
│  Logo (64px)          │  Header da página (56–64px)      │
│  Nav items            │  ─────────────────────────────   │
│  ─────────────────────│  Grid de cards / tabela          │
│  Footer do usuário    │  ...                             │
└─────────────────────────────────────────────────────────┘
```

### 14.2 Sidebar

```tsx
// Larguras
const SIDEBAR_WIDTH         = "240px"; // expandida
const SIDEBAR_WIDTH_MOBILE  = "0px";   // mobile (hidden)
const SIDEBAR_WIDTH_ICON    = "64px";  // recolhida (só ícones)

// Classes da sidebar
<aside className="w-[240px] h-screen flex flex-col liquid-glass border-r border-white/[0.06] fixed left-0 top-0 z-40">
```

```tsx
// Item de navegação
<NavLink to="/dashboard"
  className={({ isActive }) => [
    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
    isActive
      ? "bg-[#6829c0]/15 text-white border border-[#6829c0]/20"
      : "text-white/50 hover:bg-white/[0.05] hover:text-white",
  ].join(" ")}
>
  <LayoutDashboard className="h-4 w-4" />
  Dashboard
</NavLink>
```

### 14.3 Header de página

```tsx
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-2xl font-semibold text-white">Título da Página</h1>
    <p className="text-sm text-white/40 mt-0.5">Subtítulo ou descrição breve</p>
  </div>
  <div className="flex items-center gap-3">
    <Button variant="secondary">Filtrar</Button>
    <Button variant="primary"><Plus className="h-4 w-4" /> Novo Item</Button>
  </div>
</div>
```

### 14.4 Grid responsivo de cards

```tsx
// 1 coluna → 2 → 3 → 4
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

// KPIs: 2 → 4
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
```

### 14.5 Divisores de seção

```tsx
<div className="border-t border-white/[0.06] my-6" />

// Ou com título
<div className="flex items-center gap-3 my-6">
  <div className="flex-1 border-t border-white/[0.06]" />
  <span className="text-xs text-white/30">SEÇÃO</span>
  <div className="flex-1 border-t border-white/[0.06]" />
</div>
```

---

## 15. Espaçamento e Border Radius

### 15.1 Escala de espaçamento (px ↔ Tailwind)

| px  | Tailwind | Uso típico                        |
|-----|----------|-----------------------------------|
| 4   | `p-1`    | ícones inline                     |
| 8   | `p-2`    | ícone com fundo                   |
| 12  | `p-3`    | itens de lista, badge             |
| 16  | `p-4`    | padding horizontal de cards       |
| 20  | `p-5`    | padding padrão de card            |
| 24  | `p-6`    | padding de modal / seções         |
| 32  | `p-8`    | seções de página espaçadas        |

### 15.2 Border Radius

| Valor | Tailwind      | Uso                             |
|-------|---------------|---------------------------------|
| 6px   | `rounded-md`  | botões, inputs, badges          |
| 8px   | `rounded-lg`  | itens de lista, menu items      |
| 12px  | `rounded-xl`  | cards, painéis, dropdowns       |
| 16px  | `rounded-2xl` | modais, drawers                 |
| 9999  | `rounded-full`| avatares, indicadores de status |

### 15.3 Gap padrão em grids e listas

```css
/* Entre cards: */ gap-4 (16px)
/* Entre itens de form: */ space-y-4 (16px)
/* Entre label e input: */ mb-1.5 (6px)
/* Entre seções: */ mb-6 (24px)
```

---

## 16. Scrollbar Personalizada

```css
/* CSS global — aplica-se a todos os elementos scrolláveis */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #6829c0;
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: #7c35e0;
}

/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: #6829c0 transparent;
}
```

---

## 17. Gradientes e Efeitos Extras

### 17.1 Gradiente de fundo de página

```css
/* Efeito sutil para dar profundidade ao fundo */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 20% -10%, rgba(104,41,192,0.12) 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 80% 110%, rgba(6,182,212,0.06) 0%, transparent 60%);
  pointer-events: none;
  z-index: 0;
}
```

### 17.2 Gradiente em texto

```tsx
<span className="bg-gradient-to-r from-[#6829c0] to-[#06b6d4] bg-clip-text text-transparent font-semibold">
  Porceli OS
</span>
```

### 17.3 Borda gradiente

```tsx
// Técnica: wrapper com padding + gradiente de fundo
<div className="p-px rounded-xl bg-gradient-to-br from-[#6829c0]/40 to-transparent">
  <div className="rounded-[11px] bg-[#1e1e1e] p-5">
    {/* conteúdo */}
  </div>
</div>
```

### 17.4 Shimmer / Skeleton Loading

```css
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
.skeleton {
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.04) 25%,
    rgba(255,255,255,0.08) 50%,
    rgba(255,255,255,0.04) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}
```

---

## 18. Dependências e Versões

```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "framer-motion": "^10",
    "@radix-ui/react-dropdown-menu": "^2",
    "@radix-ui/react-popover": "^1",
    "@radix-ui/react-checkbox": "^1",
    "@radix-ui/react-switch": "^1",
    "@radix-ui/react-dialog": "^1",
    "react-day-picker": "^8",
    "date-fns": "^3",
    "recharts": "^2",
    "sonner": "^1",
    "lucide-react": "^0.400",
    "class-variance-authority": "^0.7",
    "clsx": "^2",
    "tailwind-merge": "^2"
  },
  "devDependencies": {
    "tailwindcss": "^3",
    "autoprefixer": "^10",
    "postcss": "^8",
    "typescript": "^5",
    "vite": "^5"
  }
}
```

---

## 19. CSS Global Completo (index.css)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Fontes */
@font-face { font-family: 'Founders Grotesk'; src: url('/fonts/FoundersGrotesk-Light.woff2')    format('woff2'); font-weight: 300; font-display: swap; }
@font-face { font-family: 'Founders Grotesk'; src: url('/fonts/FoundersGrotesk-Regular.woff2')  format('woff2'); font-weight: 400; font-display: swap; }
@font-face { font-family: 'Founders Grotesk'; src: url('/fonts/FoundersGrotesk-Medium.woff2')   format('woff2'); font-weight: 500; font-display: swap; }
@font-face { font-family: 'Founders Grotesk'; src: url('/fonts/FoundersGrotesk-Semibold.woff2') format('woff2'); font-weight: 600; font-display: swap; }
@font-face { font-family: 'Founders Grotesk'; src: url('/fonts/FoundersGrotesk-Bold.woff2')     format('woff2'); font-weight: 700; font-display: swap; }

@layer base {
  *, *::before, *::after { box-sizing: border-box; }

  html { font-size: 16px; }

  body {
    font-family: 'Founders Grotesk', system-ui, sans-serif;
    background-color: #121212;
    color: #ffffff;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    scrollbar-width: thin;
    scrollbar-color: #6829c0 transparent;
  }

  ::-webkit-scrollbar       { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #6829c0; border-radius: 9999px; }
  ::-webkit-scrollbar-thumb:hover { background: #7c35e0; }
}

@layer utilities {
  .liquid-glass {
    background: rgba(18, 18, 18, 0.4);
    backdrop-filter: blur(25px);
    -webkit-backdrop-filter: blur(25px);
    filter: brightness(1.2);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .glass-light {
    background: rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .icon-glow-purple { filter: drop-shadow(0 0 6px rgba(104, 41, 192, 0.7)); }
  .icon-glow-cyan   { filter: drop-shadow(0 0 6px rgba(6, 182, 212, 0.7));  }
  .icon-glow-green  { filter: drop-shadow(0 0 6px rgba(34, 197, 94, 0.7));  }

  .skeleton {
    background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
}

@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
```

---

## 20. tailwind.config.js Completo

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Founders Grotesk", "system-ui", "sans-serif"],
      },
      colors: {
        Porceli: {
          purple:    "#6829c0",
          "gray-900": "#121212",
          "gray-800": "#1e1e1e",
          "gray-700": "#242424",
          "gray-600": "#2a2a2a",
          "gray-500": "#3a3a3a",
        },
      },
      keyframes: {
        "fade-in": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%":   { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in":        "fade-in 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        shimmer:          "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};
```

---

*Porceli OS Design System — atualizado em 2026-05-29*
