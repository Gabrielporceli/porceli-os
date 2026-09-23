import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  Category,
  Clock,
  Cpu,
  DocumentText,
  DollarCircle,
  Filter,
  Flash,
  Hierarchy,
  Logout,
  NoteText,
  Profile2User,
} from 'iconsax-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { MOBILE_SLOT, MOBILE_WINDOW, PILL_DEFAULTS, idlePillGeom, transferPillGeom, type PillGeom } from './mobilePillGeometry';
import { MobilePillBlob } from './MobilePillBlob';
import { useHeaderAnimSignal } from '@/components/ui/PageTransition';

// Ícones do Iconsax (iconsax-react). O estilo é escolhido em runtime pela
// prop `variant`; sem ela, cada ícone cai no Linear, que é o traço fino
// que combina com o vidro. Os nomes saem de `npm run icons -- <busca>`.
const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Category },
  { title: "Calendário", url: "/calendar", icon: Calendar },
  { title: "Funil", url: "/leads", icon: Filter },
  // Some do menu no mobile — a rota /funnel-maps continua existindo,
  // só não precisa de espaço na barra de ícones do celular.
  { title: "Mapas de Funil", url: "/funnel-maps", icon: Hierarchy, hideOnMobile: true },
  { title: "Clientes", url: "/clients", icon: Profile2User },
  { title: "Contratos", url: "/contracts", icon: DocumentText },
  { title: "Financeiro", url: "/financial", icon: DollarCircle },
  { title: "Automações",   url: "/automations",        icon: Flash },
  { title: "Agendamentos", url: "/scheduled-messages", icon: Clock },
  { title: "Agentes", url: "/agents", icon: Cpu },
  { title: "Notas", url: "/notes", icon: NoteText },
];

export const Header = () => {
  const { logout } = useAuth();
  // Avisa o overlay de carregamento (PageTransition) quando a pílula vai
  // animar, pra ele não subir por cima do movimento. No-op se o Header
  // estiver fora do CRMLayout (ex.: laboratório /dev/pill).
  const signalHeaderAnim = useHeaderAnimSignal();
  const location = useLocation();
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const isMobile = useIsMobile();
  const [hidden, setHidden] = useState(false);
  const [isMouseAtTop, setIsMouseAtTop] = useState(false);

  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // Pílula do desktop: mesma geometria líquida do mobile (bolha drena de
  // um ícone, cresce no outro, pescoço liga as duas). A diferença é o que
  // dirige o progresso: no mobile é o dedo (scroll); aqui não há gesto,
  // então a transferência é animada no TEMPO a cada troca de rota.
  const [deskPill, setDeskPill] = useState<{ geom: PillGeom; w: number; slot: number } | null>(null);
  const deskWrapRef = useRef<HTMLDivElement>(null);
  const deskAnchorRef = useRef<string | null>(null);
  const deskRafRef = useRef<number | null>(null);
  /** duração da transferência no desktop (ms) */
  const DESK_MS = 620;

  // ===== Roleta infinita (só mobile) =====
  // Janela fixa de ~5 ícones. O item central é sempre a página ativa: ao
  // arrastar, o item que fica no meio vira a rota atual sozinho (sem
  // precisar tocar nele) — como um seletor de roleta.
  //
  // A lista (sem "Mapas de Funil") é desenhada 3x seguidas — bloco
  // anterior / bloco atual / bloco seguinte — pro loop infinito: se o
  // usuário rolar fundo demais num bloco vizinho, teleportamos o
  // scrollLeft de volta pro bloco do meio na posição equivalente (±1
  // largura de bloco). Como os 3 blocos são idênticos, o salto é
  // imperceptível — efeito de fita sem fim.
  const mobileItems = menuItems.filter((item) => !item.hideOnMobile);
  const middleSetRef = useRef<HTMLDivElement>(null);
  const loopWidthRef = useRef(0);
  const hasCenteredOnceRef = useRef(false);
  const settleTimerRef = useRef<number | null>(null);
  const mobilePillRafRef = useRef(false);
  // Pílula do mobile — "transferência de líquido" com gooey effect:
  //   • ÂNCORA: o ícone onde a pílula está grudada (a página atual).
  //   • CANDIDATO: o ícone mais próximo do centro AGORA.
  // Parada, é uma bolha só. Enquanto o candidato avança rumo ao centro, a
  // bolha de TRÁS (na âncora) vai encolhendo, um pescoço liga as duas e a
  // bolha da FRENTE (no candidato) cresce — e o filtro gooey funde tudo
  // numa forma única (ver MobilePillBlob). Quando só sobra a da frente, o
  // candidato vira a nova âncora — sem salto, porque a geometria nesse
  // instante é idêntica à de "parada". Rolando de volta antes, recolhe.
  //
  // Mora FORA do <nav> que rola (camada irmã): coordenadas de VIEWPORT
  // (posição na tela), não de conteúdo — por isso o salto do loop
  // infinito por baixo (±1 bloco) não afeta em nada.
  const [mobilePill, setMobilePill] = useState<{ url: string; geom: PillGeom } | null>(null);
  const anchorUrlRef = useRef<string | null>(null);
  const candidateUrlRef = useRef<string | null>(null);
  // Toque num ícone (ou num card que muda de rota): a transferência é
  // animada no TEMPO, não pelo dedo. Mais lenta que a do desktop (620ms)
  // porque na tela do celular a pílula é menor e o percurso é curto — a
  // 620ms não dava pra ver.
  const MOBILE_TAP_MS = 900;
  const tapRafRef = useRef<number | null>(null);
  const tapAnimRef = useRef(false);
  // Marcos do progresso e parâmetros do gooey vivem em
  // mobilePillGeometry.ts — calibráveis ao vivo em /dev/pill.
  const { SWITCH_AT } = PILL_DEFAULTS;

  // Acha, dentro de um container, o elemento (por [data-nav-url]) mais
  // próximo do centro horizontal da faixa visível — é assim que sabemos
  // qual ícone "está no meio" a qualquer momento do arraste.
  const findNearest = useCallback((root: HTMLElement, urlFilter?: string) => {
    const scroller = navRef.current;
    if (!scroller) return null;
    const selector = urlFilter ? `[data-nav-url="${CSS.escape(urlFilter)}"]` : "[data-nav-url]";
    const nodes = root.querySelectorAll<HTMLElement>(selector);
    if (!nodes.length) return null;
    const scrollerRect = scroller.getBoundingClientRect();
    const centerX = scrollerRect.left + scrollerRect.width / 2;
    let best: { el: HTMLElement; url: string; dist: number } | null = null;
    nodes.forEach((el) => {
      const r = el.getBoundingClientRect();
      const dist = Math.abs(r.left + r.width / 2 - centerX);
      if (!best || dist < best.dist) {
        best = { el, url: el.dataset.navUrl ?? "", dist };
      }
    });
    return best;
  }, []);

  const sameGeom = (p: PillGeom, q: PillGeom) =>
    Math.abs(p.back.x - q.back.x) < 0.5 && p.back.s === q.back.s &&
    Math.abs(p.front.x - q.front.x) < 0.5 && p.front.s === q.front.s &&
    p.neck.w === q.neck.w && p.neck.h === q.neck.h;

  // Recalcula a geometria da pílula a cada frame de scroll (throttle via
  // rAF em onNavScroll) e uma vez no 1º paint. Tudo em coordenada de
  // viewport do <nav> (rect.left - navRect.left, sem somar scrollLeft).
  //
  // A geometria é uma função CONTÍNUA do progresso p do candidato rumo ao
  // centro (0 = acabou de virar o mais próximo, 1 = centro exato):
  //   • bolha da FRENTE (no candidato): cresce de 0 a cheia até
  //     p = FRONT_DONE_AT (rápida no início, assenta suave);
  //   • bolha de TRÁS (na âncora): cheia até p = BACK_START_AT, depois
  //     encolhe ACELERANDO até sumir em p = SWITCH_AT — o "drenar";
  //   • PESCOÇO entre as duas: nasce com a frente, pinça com a trás.
  // Em p = SWITCH_AT só existe a bolha da frente, cheia, no candidato —
  // idêntica à geometria "parada" —, então a troca de âncora não muda
  // nada na tela: zero salto. (Versões anteriores trocavam a âncora com
  // a forma ainda no meio do caminho e dependiam de uma mola pra
  // disfarçar — que o frame seguinte do scroll interrompia.)
  const updateMobilePill = useCallback(() => {
    const scroller = navRef.current;
    if (!scroller) return;
    const nearest = findNearest(scroller);
    if (!nearest) return;
    const navRect = scroller.getBoundingClientRect();
    const nRect = nearest.el.getBoundingClientRect();
    const nx = nRect.left - navRect.left;
    const slot = nRect.width;

    const navCenter = navRect.width / 2;

    const anchorUrl = anchorUrlRef.current;
    let anchorEl: HTMLElement | null = null;
    if (anchorUrl) {
      // A âncora existe em 3 cópias (loop infinito) — usa a mais próxima do
      // CENTRO, que é onde a pílula parada mora.
      const copies = scroller.querySelectorAll<HTMLElement>(
        `[data-nav-url="${CSS.escape(anchorUrl)}"]`
      );
      let bestD = Infinity;
      copies.forEach((el) => {
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - (navRect.left + navCenter));
        if (d < bestD) {
          bestD = d;
          anchorEl = el;
        }
      });
    }
    if (!anchorEl) {
      anchorUrlRef.current = nearest.url;
      candidateUrlRef.current = nearest.url;
      setMobilePill({ url: nearest.url, geom: idlePillGeom(nx, slot) });
      return;
    }

    const aRect = (anchorEl as HTMLElement).getBoundingClientRect();
    const ax = aRect.left - navRect.left;
    // Quanto a âncora já saiu do centro. É ISSO que mede o progresso —
    // não a distância do candidato.
    //
    // Antes: p = 1 - dist(candidato)/meio-passo. Como um ícone só vira "o
    // mais próximo do centro" DEPOIS do ponto médio, a primeira metade do
    // arraste não mostrava nada e a segunda despachava a transferência
    // inteira em 22px — "demora pra começar e termina do nada".
    // Agora a transferência ocupa o PASSO INTEIRO (44px): começa no
    // instante em que o dedo tira a âncora do centro.
    const anchorOff = ax + slot / 2 - navCenter;

    // Alvo = o vizinho do lado pra onde a faixa está indo. Depois do ponto
    // médio ele coincide com o "mais próximo do centro"; antes disso é ele
    // quem está chegando — e é justamente essa metade que não animava.
    const dir = anchorOff < 0 ? 1 : -1;
    let target: { url: string; cx: number } | null = null;
    if (Math.abs(anchorOff) > 0.5) {
      const anchorCx = ax + slot / 2;
      scroller.querySelectorAll<HTMLElement>("[data-nav-url]").forEach((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2 - navRect.left;
        if (Math.sign(cx - anchorCx) !== dir) return;
        if (!target || Math.abs(cx - navCenter) < Math.abs(target.cx - navCenter)) {
          target = { url: el.dataset.navUrl as string, cx };
        }
      });
    }

    if (!target) {
      // Âncora centrada (ou sem vizinho daquele lado): bolha única parada
      // nela — segue o scroll porque ax é remedido a cada frame.
      const g = idlePillGeom(ax, slot);
      setMobilePill((prev) =>
        prev && prev.url === anchorUrl && sameGeom(prev.geom, g)
          ? prev
          : { url: anchorUrl as string, geom: g }
      );
      return;
    }

    const t = target as { url: string; cx: number };
    candidateUrlRef.current = t.url;
    const tx = t.cx - slot / 2;
    const pitch = Math.abs(t.cx - (ax + slot / 2));
    const p = pitch > 0 ? Math.min(1, Math.abs(anchorOff) / pitch) : 1;

    if (p >= SWITCH_AT) {
      // Transferência completa: a geometria aqui é idêntica à de "parada"
      // no alvo, então trocar a âncora não muda nada na tela. (Num fling
      // que pulou vários ícones, o frame seguinte recomeça a partir desta
      // âncora nova — a pílula nunca fica presa dois ícones atrás.)
      anchorUrlRef.current = t.url;
      setMobilePill({ url: t.url, geom: idlePillGeom(tx, slot) });
      return;
    }

    setMobilePill({ url: anchorUrl as string, geom: transferPillGeom(ax, tx, slot, p) });
  }, [findNearest, SWITCH_AT]);

  // Geometria da pílula do mobile num instante p, entre duas ROTAS (e não
  // entre "âncora e quem está no centro"). É o que o toque usa: o dedo não
  // dita o progresso, o relógio dita — mas as posições continuam medidas ao
  // vivo, então a pílula acompanha a faixa deslizando por baixo.
  const measureMobile = useCallback(
    (fromUrl: string, toUrl: string, p: number): PillGeom | null => {
      const scroller = navRef.current;
      if (!scroller) return null;
      const navRect = scroller.getBoundingClientRect();
      const navCenter = navRect.left + navRect.width / 2;

      // Destino: a cópia que está indo pro centro.
      let toEl: HTMLElement | null = null;
      let bestTo = Infinity;
      scroller
        .querySelectorAll<HTMLElement>(`[data-nav-url="${CSS.escape(toUrl)}"]`)
        .forEach((el) => {
          const r = el.getBoundingClientRect();
          const d = Math.abs(r.left + r.width / 2 - navCenter);
          if (d < bestTo) {
            bestTo = d;
            toEl = el;
          }
        });
      if (!toEl) return null;
      const toRect = (toEl as HTMLElement).getBoundingClientRect();
      const slot = toRect.width;
      const tx = toRect.left - navRect.left;

      // Origem: a cópia mais perto do DESTINO (não do centro) — senão num
      // salto longo a pílula se esticaria pro outro bloco do loop.
      let fromEl: HTMLElement | null = null;
      let bestFrom = Infinity;
      scroller
        .querySelectorAll<HTMLElement>(`[data-nav-url="${CSS.escape(fromUrl)}"]`)
        .forEach((el) => {
          const r = el.getBoundingClientRect();
          const d = Math.abs(r.left - toRect.left);
          if (d < bestFrom) {
            bestFrom = d;
            fromEl = el;
          }
        });
      if (!fromEl || p >= SWITCH_AT) return idlePillGeom(tx, slot);

      const ax = (fromEl as HTMLElement).getBoundingClientRect().left - navRect.left;
      return transferPillGeom(ax, tx, slot, p);
    },
    [SWITCH_AT]
  );

  // Geometria da pílula do desktop num instante p da transferência.
  // Coordenadas relativas ao WRAPPER (que não rola), medidas ao vivo a
  // cada frame — assim resize/scroll da barra são acompanhados de graça.
  const measureDesk = useCallback((fromUrl: string | null, toUrl: string, p: number) => {
    const wrap = deskWrapRef.current;
    const toEl = itemRefs.current.get(toUrl);
    if (!wrap || !toEl) return null;
    const wrapRect = wrap.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const slot = toRect.width;
    const nx = toRect.left - wrapRect.left;
    const fromEl = fromUrl && fromUrl !== toUrl ? itemRefs.current.get(fromUrl) : null;
    // `slot` sai da MEDIÇÃO do item (w-10 → 40px, w-11 → 44px a partir de
    // md), nunca de uma constante: a pílula é alinhada pela borda esquerda,
    // então qualquer diferença de largura tira o ícone do centro dela.
    if (!fromEl || p >= SWITCH_AT) {
      return { geom: idlePillGeom(nx, slot), w: wrapRect.width, slot };
    }
    const ax = fromEl.getBoundingClientRect().left - wrapRect.left;
    return { geom: transferPillGeom(ax, nx, slot, p), w: wrapRect.width, slot };
  }, [SWITCH_AT]);

  // Lógica para esconder o header ao rolar para baixo e mostrar ao rolar para cima
  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious();
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

  // Mostrar o header se o mouse estiver no topo da tela.
  // Limiar de 90px cobre toda a altura do header (evita cruzar a linha ao
  // passar o mouse por cima dele) e só atualiza o estado quando ele muda de
  // verdade — assim não há re-render em rajada que faz o backdrop-filter
  // piscar aquela "tarja" clara na emenda com os cards.
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const atTop = e.clientY < 90;
      setIsMouseAtTop((prev) => (prev === atTop ? prev : atTop));
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Desktop: anima a transferência quando a rota muda. A rota nova só
  // vira âncora no fim — até lá a bolha antiga ainda está drenando.
  // ResizeObserver mantém a pílula no lugar quando a barra muda de
  // tamanho (rótulos somem/aparecem em breakpoints, fonte custom
  // terminando de carregar, scrollbar aparecendo).
  useLayoutEffect(() => {
    if (isMobile) return;
    const from = deskAnchorRef.current;
    const to = location.pathname;
    const stop = () => {
      if (deskRafRef.current) cancelAnimationFrame(deskRafRef.current);
      deskRafRef.current = null;
    };
    stop();

    if (!itemRefs.current.get(to)) {
      // Rota sem item no menu (ex.: /funnel-maps aberta por link direto
      // num breakpoint onde ela não aparece): some a pílula.
      deskAnchorRef.current = null;
      setDeskPill(null);
      return;
    }

    if (!from || from === to) {
      deskAnchorRef.current = to;
      setDeskPill(measureDesk(to, to, 1));
    } else {
      // Segura a entrada do overlay de carregamento até esta transferência
      // acabar — senão ele cobriria o header bem no meio do movimento.
      signalHeaderAnim(DESK_MS);
      const started = performance.now();
      // easeInOutCubic: sai devagar, ganha corpo no meio, assenta suave.
      const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
      const tick = (now: number) => {
        const u = Math.min(1, (now - started) / DESK_MS);
        setDeskPill(measureDesk(from, to, ease(u) * SWITCH_AT));
        if (u < 1) {
          deskRafRef.current = requestAnimationFrame(tick);
        } else {
          deskRafRef.current = null;
          deskAnchorRef.current = to;
          setDeskPill(measureDesk(to, to, 1));
        }
      };
      deskRafRef.current = requestAnimationFrame(tick);
    }

    const wrap = deskWrapRef.current;
    if (!wrap) return stop;
    const ro = new ResizeObserver(() => {
      // Só reposiciona quando parada — no meio da animação o próximo
      // frame já remede tudo sozinho.
      if (!deskRafRef.current && deskAnchorRef.current) {
        setDeskPill(measureDesk(deskAnchorRef.current, deskAnchorRef.current, 1));
      }
    });
    ro.observe(wrap);
    return () => { stop(); ro.disconnect(); };
  }, [location.pathname, isMobile, measureDesk, SWITCH_AT, signalHeaderAnim]);

  // Mede a largura de 1 bloco (pro loop) sempre que ela mudar (fonte
  // custom terminando de carregar, rotação de tela etc.).
  useLayoutEffect(() => {
    if (!isMobile) return;
    const middle = middleSetRef.current;
    if (!middle) return;
    const measure = () => {
      const w = middle.offsetWidth;
      if (w) loopWidthRef.current = w;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(middle);
    return () => ro.disconnect();
  }, [isMobile]);

  // Centraliza o ícone da rota ativa: no 1º paint, instantâneo (dentro do
  // bloco do meio, pra já nascer centralizado no meio do loop); depois
  // disso, sempre que a rota mudar por FORA da própria roleta (ex.: tocou
  // um card no Dashboard), desliza suavemente até lá — essa é a "animação
  // do botão passando de um ícone para o outro". Se a rota mudou porque a
  // própria roleta assentou nela (dist já ~0), não faz nada — sem isso o
  // gesto do usuário brigaria com este efeito.
  useLayoutEffect(() => {
    if (!isMobile) return;
    const middle = middleSetRef.current;
    if (!middle) return;

    if (!hasCenteredOnceRef.current) {
      const target =
        findNearest(middle, location.pathname)?.el ??
        (middle.firstElementChild as HTMLElement | null);
      target?.scrollIntoView({ behavior: "auto", inline: "center", block: "nearest" });
      hasCenteredOnceRef.current = true;
      // Posiciona a pílula já no 1º paint (senão ela só apareceria depois
      // do primeiro evento de scroll do usuário).
      anchorUrlRef.current = location.pathname;
      updateMobilePill();
      return;
    }

    const scroller = navRef.current;
    if (!scroller) return;
    const nearest = findNearest(scroller, location.pathname);
    if (nearest && nearest.dist > 4) {
      // Rota mudou por fora da roleta (toque num ícone, card no Dashboard):
      // a faixa desliza até centralizar o destino E a pílula faz a
      // transferência ANIMADA NO TEMPO, igual ao desktop.
      //
      // Antes, esta linha era `anchorUrlRef.current = location.pathname`:
      // a âncora pulava pro destino ANTES do scroll, então âncora ==
      // candidato e a geometria virava idlePillGeom. A pílula só aparecia
      // no destino, sem transferência nenhuma — nem o pescoço de 1 passo,
      // nem o crossfade de salto longo. Era o "pula para a página do nada".
      const from = anchorUrlRef.current;
      const to = location.pathname;
      nearest.el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });

      if (!from || from === to) {
        anchorUrlRef.current = to;
        updateMobilePill();
        return;
      }

      // Enquanto esta animação roda, o scroll suave NÃO manda na pílula
      // (senão os dois brigariam pelo mesmo estado a cada frame) — mas as
      // posições continuam sendo remedidas ao vivo, então a pílula
      // acompanha a faixa deslizando por baixo.
      // Mesma ideia do desktop: o overlay de carregamento espera esta
      // transferência terminar antes de cobrir a tela.
      signalHeaderAnim(MOBILE_TAP_MS);
      tapAnimRef.current = true;
      const started = performance.now();
      const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
      const tick = (now: number) => {
        const scrollerNow = navRef.current;
        if (!scrollerNow) {
          tapAnimRef.current = false;
          return;
        }
        const u = Math.min(1, (now - started) / MOBILE_TAP_MS);
        const g = measureMobile(from, to, ease(u) * SWITCH_AT);
        if (g) setMobilePill({ url: from, geom: g });
        if (u < 1) {
          tapRafRef.current = requestAnimationFrame(tick);
        } else {
          tapRafRef.current = null;
          tapAnimRef.current = false;
          anchorUrlRef.current = to;
          candidateUrlRef.current = to;
          updateMobilePill();
        }
      };
      if (tapRafRef.current) cancelAnimationFrame(tapRafRef.current);
      tapRafRef.current = requestAnimationFrame(tick);
    }
  }, [isMobile, location.pathname, findNearest, updateMobilePill, measureMobile, SWITCH_AT, signalHeaderAnim]);

  const onNavScroll = () => {
    if (!isMobile) return;
    const scroller = navRef.current;
    const w = loopWidthRef.current;
    if (scroller && w) {
      // Loop infinito: imediato, a cada evento de scroll — sem isso o
      // usuário eventualmente bate no fim de um dos 3 blocos. Como a
      // pílula agora é posicionada em coordenada de VIEWPORT (não de
      // conteúdo — ver updateMobilePill), esse salto não afeta ela nem
      // um pouco: a posição NA TELA do ícone mais próximo do centro não
      // muda 1px (os 3 blocos são idênticos).
      if (scroller.scrollLeft < w * 0.5) {
        scroller.scrollLeft += w;
      } else if (scroller.scrollLeft > w * 1.5) {
        scroller.scrollLeft -= w;
      }
    }

    // Pílula viva: recalcula o alvo (x, url) a cada frame de scroll — é
    // isso que faz ela "migrar" continuamente enquanto o dedo arrasta a
    // faixa, em vez de só trocar quando o scroll assenta. Throttle via
    // rAF (não a cada evento de scroll bruto, que dispara dezenas de
    // vezes por frame durante inércia) pra não sobrecarregar.
    // Enquanto a animação de TOQUE roda, quem manda na pílula é o relógio
    // dela — este scroll é o deslizar da própria faixa indo centralizar o
    // destino, e se ele também escrevesse a geometria os dois brigariam
    // pelo mesmo estado a cada frame.
    if (!tapAnimRef.current && !mobilePillRafRef.current) {
      mobilePillRafRef.current = true;
      requestAnimationFrame(() => {
        mobilePillRafRef.current = false;
        if (!tapAnimRef.current) updateMobilePill();
      });
    }

    // Troca de página sozinha quando o scroll assenta: espera ~120ms sem
    // novos eventos de scroll (gesto/inércia acabou) e navega pro item
    // que ficou no meio, se for diferente da rota atual.
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => {
      if (!scroller) return;
      const nearest = findNearest(scroller);
      if (nearest && nearest.url && nearest.url !== location.pathname) {
        navigate(nearest.url);
      }
    }, 120);
  };

  useEffect(() => {
    return () => {
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
      if (tapRafRef.current) cancelAnimationFrame(tapRafRef.current);
    };
  }, []);

  // No mobile o header mora embaixo (bottom tab bar — mais fácil de
  // alcançar com o polegar) e fica sempre visível, sem o esconder/mostrar
  // ao rolar que só faz sentido pra uma barra no topo competindo por
  // espaço com o conteúdo.
  const showHeader = isMobile ? true : (!hidden || isMouseAtTop);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: showHeader ? 0 : (isMobile ? 100 : -100) }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "w-full px-4 sm:px-6 pt-4 fixed left-0 right-0 z-[60] flex justify-center pointer-events-none will-change-transform",
          // Embaixo no mobile (com respiro pra área segura do iPhone),
          // volta pro topo a partir de md.
          "bottom-0 pb-[max(1rem,env(safe-area-inset-bottom))] md:bottom-auto md:top-0 md:pb-4"
        )}
      >
        <header
          className={cn(
            "liquid-glass h-16 w-full max-w-7xl flex items-center pointer-events-auto",
            // No mobile o espaço é curto (logo + janela de 5 ícones + sair
            // TODOS precisam caber numa tela de ~360-430px) — padding e gap
            // bem mais enxutos que no desktop, onde a nav é flex-1 e
            // absorve a largura sobrando.
            isMobile ? "px-3 gap-1.5" : "px-4 sm:px-6 gap-4"
          )}
          style={{ willChange: "backdrop-filter, transform", transform: "translateZ(0)" }}
        >

          {/* Logo Section */}
          <div
            className={cn(
              "flex items-center shrink-0",
              isMobile ? "pr-1.5 border-r border-white/5" : "mr-2 sm:mr-4 pr-2 sm:pr-4 border-r border-white/5"
            )}
          >
            <img src="/logo.png" alt="Porceli" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
          </div>

          {/* Navigation Items - Center Styled. Só ícones (rótulo virou
              tooltip). Quando não cabem todos numa tela estreita, a
              própria barra rola horizontalmente (overflow-x-auto) — sem
              menu escondido atrás de mais um botão. */}
          {isMobile ? (
            // ===== Mobile: roleta com loop infinito =====
            // Wrapper EXTERNO, sem overflow próprio — é nele que a pílula
            // fica ancorada (irmã do <nav>, não filha). O <nav> tem
            // overflow-x-auto pra rolar os ícones; se a pílula morasse
            // DENTRO dele, o overflow cortaria o blur do filtro gooey numa
            // borda reta (era o bug da "caixa feia"). Aqui fora, nada corta.
            <div
              className="relative max-w-full shrink-0 mx-auto h-full"
              style={{ width: MOBILE_WINDOW }}
            >
              {mobilePill && (
                <MobilePillBlob geom={mobilePill.geom} windowW={MOBILE_WINDOW} slot={MOBILE_SLOT} />
              )}

              <nav
                ref={navRef}
                onScroll={onNavScroll}
                // Janela fixa (MOBILE_WINDOW = 5 slots + 4 vãos = 216px) —
                // junto com logo/sair enxutos, cabe até em telas de ~360px.
                // gap-1 e h-10/w-10 abaixo TÊM que casar com MOBILE_GAP e
                // MOBILE_SLOT: a pílula é posicionada em pixels por fora.
                className="relative z-20 flex items-center gap-1 h-full w-full overflow-x-auto scrollbar-hide snap-x snap-mandatory"
                style={{ scrollBehavior: "auto", WebkitOverflowScrolling: "touch" }}
              >
                {[0, 1, 2].map((setIndex) => (
                  <div
                    key={setIndex}
                    ref={setIndex === 1 ? middleSetRef : undefined}
                    className="flex items-center gap-1 shrink-0"
                  >
                    {mobileItems.map((item) => {
                      // Enquanto a pílula ainda não mediu nada (1º frame),
                      // cai pra rota atual; depois disso, quem manda é o
                      // item mais próximo do centro AGORA — não espera a
                      // navegação de verdade (só acontece quando o scroll
                      // assenta).
                      const isHighlighted = mobilePill ? mobilePill.url === item.url : location.pathname === item.url;
                      const Icon = item.icon;
                      return (
                        <Link
                          key={`${setIndex}-${item.title}`}
                          to={item.url}
                          title={item.title}
                          data-nav-url={item.url}
                          className="snap-center h-10 w-10 flex items-center justify-center shrink-0"
                        >
                          <Icon className={cn("w-5 h-5 transition-colors duration-500", isHighlighted ? "lqg-text text-white" : "text-white/40")} />
                          <span className="sr-only">{item.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </div>
          ) : (
            // ===== Desktop: mesma pílula líquida, animada no tempo =====
            // Wrapper EXTERNO (sem overflow) segurando a pílula, igual ao
            // mobile: o <nav> tem overflow-x-auto e cortaria o blur do
            // filtro gooey numa borda reta.
            <div ref={deskWrapRef} className="relative flex-1 h-full">
              {deskPill && (
                <MobilePillBlob
                  geom={deskPill.geom}
                  windowW={deskPill.w}
                  slot={deskPill.slot}
                />
              )}
              <nav
                ref={navRef}
                className="relative z-20 flex items-center justify-center gap-0.5 sm:gap-1 h-full w-full overflow-x-auto scrollbar-hide"
              >
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.url;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.title}
                      to={item.url}
                      title={item.title}
                      className="h-10 flex items-center shrink-0"
                    >
                      <div
                        ref={(el) => {
                          if (el) itemRefs.current.set(item.url, el);
                          else itemRefs.current.delete(item.url);
                        }}
                        className="group relative isolate z-10 w-10 md:w-11 h-full flex items-center justify-center rounded-full transform-gpu will-change-transform"
                      >
                        {!isActive && (
                          <span className="absolute inset-0 -z-10 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        )}
                        <Icon className={cn(
                          "relative z-10 w-4 h-4 sm:w-[18px] sm:h-[18px] transition-colors",
                          isActive ? "lqg-text text-white" : "text-white/40 group-hover:text-white/70"
                        )} />
                        <span className="sr-only">{item.title}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}

          {/* User Actions */}
          <div
            className={cn(
              "flex items-center shrink-0",
              isMobile ? "pl-1.5 border-l border-white/5" : "ml-2 sm:ml-4 pl-2 sm:pl-4 border-l border-white/5"
            )}
          >
            <button
              onClick={() => logout()}
              className={cn(
                "text-white/40 hover:text-red-500 transition-all duration-300",
                isMobile ? "p-1.5" : "p-2 sm:p-2.5"
              )}
              title="Sair"
            >
              <Logout className="w-5 h-5" />
            </button>
          </div>
        </header>
      </motion.div>
    </AnimatePresence>
  );
};
