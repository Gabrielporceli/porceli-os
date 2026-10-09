/**
 * Acessórios do orbe: chapéus, óculos e extras, desenhados em SVG por cima da
 * esfera. Tudo é desenhado numa grade de 100×100 em que o orbe é o círculo de
 * centro (50, 50) e raio 50; os olhos ficam perto de (33,45) e (66,45). O SVG
 * deixa passar o que sai da grade (`overflow-visible`), porque o chapéu fica
 * PARA FORA do topo da esfera.
 */
export type OrbHat = "bone" | "cartola" | "coroa" | "gorro" | "capelo" | "festa";
export type OrbEyewear = "tapa-olho" | "oculos" | "oculos-escuros" | "monoculo";
export type OrbExtra = "bigode" | "fone" | "gravata";

export const ORB_HATS: OrbHat[] = ["bone", "cartola", "coroa", "gorro", "capelo", "festa"];
export const ORB_EYEWEAR: OrbEyewear[] = ["tapa-olho", "oculos", "oculos-escuros", "monoculo"];
export const ORB_EXTRAS: OrbExtra[] = ["bigode", "fone", "gravata"];

export const ORB_ACCESSORY_LABEL: Record<OrbHat | OrbEyewear | OrbExtra, string> = {
  bone: "Boné",
  cartola: "Cartola",
  coroa: "Coroa",
  gorro: "Gorro",
  capelo: "Capelo",
  festa: "Chapéu de festa",
  "tapa-olho": "Tapa-olho",
  oculos: "Óculos",
  "oculos-escuros": "Óculos escuros",
  monoculo: "Monóculo",
  bigode: "Bigode",
  fone: "Fone de ouvido",
  gravata: "Gravata-borboleta",
};

const DARK = "#17171c";

/** Cor padrão de cada chapéu; `hatColor` troca a cor principal. */
const HAT_DEFAULT: Record<OrbHat, string> = {
  bone: "#2a2a33",
  cartola: "#17171c",
  coroa: "#f5c542",
  gorro: "#6829c0",
  capelo: "#17171c",
  festa: "#ff5fa2",
};

function Hat({ hat, color }: { hat: OrbHat; color?: string }) {
  const c = color ?? HAT_DEFAULT[hat];
  switch (hat) {
    case "bone":
      return (
        <g transform="translate(0 -14)">
          <path d="M8 38 C8 8 28 -10 50 -10 C72 -10 92 8 92 38 C70 32 30 32 8 38 Z" fill={c} />
          <path d="M8 38 C8 8 28 -10 50 -10 C72 -10 92 8 92 38 C70 32 30 32 8 38 Z" fill="url(#hat-shade)" />
          <path d="M16 38 C30 52 70 52 84 38 C70 33 30 33 16 38 Z" fill={c} />
          <path d="M16 38 C30 52 70 52 84 38 C70 33 30 33 16 38 Z" fill="rgba(0,0,0,.28)" />
          <circle cx="50" cy="-10" r="3.2" fill={c} />
        </g>
      );
    case "cartola":
      return (
        <g>
          <path d="M30 0 L30 -26 Q30 -31 35 -31 L65 -31 Q70 -31 70 -26 L70 0 Z" fill={c} />
          <path d="M30 0 L30 -26 Q30 -31 35 -31 L65 -31 Q70 -31 70 -26 L70 0 Z" fill="url(#hat-shade)" />
          <rect x="30" y="-12" width="40" height="7" fill="#6829c0" />
          <path d="M12 6 C12 -1 30 -4 50 -4 C70 -4 88 -1 88 6 C88 13 70 14 50 14 C30 14 12 13 12 6 Z" fill={c} />
          <path d="M12 6 C12 -1 30 -4 50 -4 C70 -4 88 -1 88 6 C88 13 70 14 50 14 C30 14 12 13 12 6 Z" fill="rgba(255,255,255,.08)" />
        </g>
      );
    case "coroa":
      return (
        <g>
          <path d="M20 14 L20 -8 L35 4 L50 -14 L65 4 L80 -8 L80 14 Z" fill={c} stroke="rgba(0,0,0,.25)" strokeWidth="1" strokeLinejoin="round" />
          <path d="M20 14 L20 -8 L35 4 L50 -14 L65 4 L80 -8 L80 14 Z" fill="url(#hat-shade)" />
          <circle cx="50" cy="4" r="3.4" fill="#ff4d6d" />
          <circle cx="32" cy="8" r="2.4" fill="#4dd6ff" />
          <circle cx="68" cy="8" r="2.4" fill="#4dd6ff" />
        </g>
      );
    case "gorro":
      return (
        <g>
          <path d="M12 30 C12 4 30 -8 50 -8 C70 -8 88 4 88 30 Z" fill={c} />
          <path d="M12 30 C12 4 30 -8 50 -8 C70 -8 88 4 88 30 Z" fill="url(#hat-shade)" />
          <rect x="9" y="24" width="82" height="12" rx="6" fill={c} />
          <rect x="9" y="24" width="82" height="12" rx="6" fill="rgba(255,255,255,.16)" />
          <circle cx="50" cy="-12" r="8" fill="#f4eaff" />
        </g>
      );
    case "capelo":
      return (
        <g>
          <path d="M28 6 V20 C40 29 60 29 72 20 V6 C60 14 40 14 28 6 Z" fill={c} />
          <path d="M50 -24 L98 -5 L50 14 L2 -5 Z" fill={c} stroke="rgba(255,255,255,.12)" strokeWidth="1" />
          <path d="M50 -24 L98 -5 L50 14 L2 -5 Z" fill="url(#hat-shade)" />
          <path d="M90 -3 V18" stroke="#f5c542" strokeWidth="2.4" strokeLinecap="round" />
          <rect x="87" y="16" width="6" height="9" rx="2" fill="#f5c542" />
        </g>
      );
    case "festa":
      return (
        <g>
          <path d="M50 -38 L76 8 Q50 16 24 8 Z" fill={c} />
          <path d="M50 -38 L76 8 Q50 16 24 8 Z" fill="url(#hat-shade)" />
          <path d="M41 -22 L63 -14 M35 -10 L69 0" stroke="rgba(255,255,255,.7)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="50" cy="-40" r="5" fill="#ffd84d" />
        </g>
      );
  }
}

function Eyewear({ kind }: { kind: OrbEyewear }) {
  switch (kind) {
    case "tapa-olho":
      return (
        <g>
          <path d="M12 64 L80 12" stroke={DARK} strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="33.5" cy="47" rx="12" ry="13" fill={DARK} />
          <ellipse cx="31" cy="42" rx="4" ry="3" fill="rgba(255,255,255,.16)" />
        </g>
      );
    case "oculos":
      return (
        <g fill="rgba(255,255,255,.14)" stroke={DARK} strokeWidth="3" strokeLinecap="round">
          <circle cx="33.5" cy="46" r="14" />
          <circle cx="66.5" cy="46" r="14" />
          <path d="M47.5 44 Q50 40 52.5 44" fill="none" />
          <path d="M19.5 43 L9 38 M80.5 43 L91 38" fill="none" />
        </g>
      );
    case "oculos-escuros":
      return (
        <g>
          <path d="M16 36 H48 V51 Q48 63 38 63 H27 Q16 63 16 51 Z" fill={DARK} />
          <path d="M84 36 H52 V51 Q52 63 62 63 H73 Q84 63 84 51 Z" fill={DARK} />
          <path d="M48 41 H52" stroke={DARK} strokeWidth="3" />
          <path d="M21 41 L29 41 M71 41 L79 41" stroke="rgba(255,255,255,.35)" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M16 38 L7 34 M84 38 L93 34" stroke={DARK} strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case "monoculo":
      return (
        <g fill="none" strokeLinecap="round">
          <circle cx="66.5" cy="46" r="14" fill="rgba(255,255,255,.14)" stroke="#f5c542" strokeWidth="3" />
          <path d="M78 56 C84 72 76 86 68 94" stroke="#f5c542" strokeWidth="1.8" strokeDasharray="1.2 3" />
        </g>
      );
  }
}

function Extra({ kind }: { kind: OrbExtra }) {
  switch (kind) {
    case "bigode":
      return (
        <path
          d="M50 63 C43 55 31 59 28 68 C36 65 44 67 50 72 C56 67 64 65 72 68 C69 59 57 55 50 63 Z"
          fill="#3b2417"
          stroke="rgba(0,0,0,.3)"
          strokeWidth="0.8"
        />
      );
    case "fone":
      return (
        <g fill="none" strokeLinecap="round">
          <path d="M12 46 C12 14 30 -2 50 -2 C70 -2 88 14 88 46" stroke="#1b1b22" strokeWidth="5" />
          <rect x="4" y="38" width="12" height="24" rx="6" fill="#1b1b22" stroke="none" />
          <rect x="84" y="38" width="12" height="24" rx="6" fill="#1b1b22" stroke="none" />
          <rect x="6.5" y="42" width="3.5" height="16" rx="1.7" fill="#6829c0" stroke="none" />
          <rect x="90" y="42" width="3.5" height="16" rx="1.7" fill="#6829c0" stroke="none" />
          <path d="M90 60 C90 80 76 88 62 85" stroke="#1b1b22" strokeWidth="2.6" />
          <circle cx="60" cy="85" r="3.6" fill="#1b1b22" stroke="none" />
        </g>
      );
    case "gravata":
      return (
        <g>
          <path d="M50 100 L27 88 L27 112 Z" fill="#d63384" />
          <path d="M50 100 L73 88 L73 112 Z" fill="#d63384" />
          <path d="M27 88 L50 100 L27 112 Z M73 88 L50 100 L73 112 Z" fill="rgba(0,0,0,.18)" />
          <circle cx="50" cy="100" r="5" fill="#f06aa8" stroke="rgba(0,0,0,.2)" strokeWidth="0.8" />
        </g>
      );
  }
}

export function OrbAccessories({
  hat,
  hatColor,
  eyewear,
  extras = [],
}: {
  hat?: OrbHat;
  hatColor?: string;
  eyewear?: OrbEyewear;
  extras?: OrbExtra[];
}) {
  if (!hat && !eyewear && extras.length === 0) return null;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
    >
      <defs>
        <linearGradient id="hat-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,.22)" />
          <stop offset="1" stopColor="rgba(0,0,0,.22)" />
        </linearGradient>
      </defs>
      {extras.filter((e) => e !== "fone").map((e) => <Extra key={e} kind={e} />)}
      {eyewear && <Eyewear kind={eyewear} />}
      {extras.includes("fone") && <Extra kind="fone" />}
      {hat && <Hat hat={hat} color={hatColor} />}
    </svg>
  );
}
