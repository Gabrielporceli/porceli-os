import * as React from "react";
import encodeQR from "qr";
import { cn } from "@/lib/utils";

/**
 * QR minimalista, desenhado à mão a partir da matriz crua.
 *
 * Por que não uma lib de estilo pronta: as opções do `qr-code-styling`
 * (`rounded`, `classy`, `dots`) tratam cada módulo como uma peça isolada.
 * Num QR, a maioria dos módulos é vizinha de outro, então arredondar todos
 * transforma blocos contínuos numa sopa de bolhas — é de onde vinha o aspecto
 * pesado do QR anterior.
 *
 * Aqui o arredondamento é SELETIVO: um canto só arredonda quando os dois
 * lados que o formam estão vazios. Módulos vizinhos se fundem em ilhas de
 * contorno contínuo, e só a silhueta externa fica macia — a mesma lógica de
 * um raio de canto em UI. Os olhos são quadrados arredondados concêntricos,
 * na mesma linguagem de raio do tile que envolve o código.
 *
 * Geração: `qr` (github.com/paulmillr/qr) — 0 dependências, ~5KB, devolve a
 * matriz booleana crua e deixa o desenho por nossa conta.
 */

type Ecc = "low" | "medium" | "quartile" | "high";

interface QRCodeProps extends Omit<React.SVGProps<SVGSVGElement>, "children"> {
  value: string;
  /** Correção de erro. "medium" cobre bem QR de link sem inchar a matriz. */
  ecc?: Ecc;
  /** Raio dos módulos, em fração da célula (0 = quadrado, 0.5 = pílula).
   *  0.15 é o padrão de propósito: tira a dureza da quina sem estilizar o
   *  código. Acima de ~0.35 começa a virar "bolha" e a leitura sofre. */
  radius?: number;
  /** Margem em módulos ao redor do código. O tile branco costuma já dar essa
   *  folga; por isso o padrão é 0. */
  quietZone?: number;
}

/** Path de um retângulo com raio uniforme. */
function roundRect(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  return (
    `M${x + rr},${y}h${w - 2 * rr}a${rr},${rr} 0 0 1 ${rr},${rr}` +
    `v${h - 2 * rr}a${rr},${rr} 0 0 1 ${-rr},${rr}` +
    `h${-(w - 2 * rr)}a${rr},${rr} 0 0 1 ${-rr},${-rr}` +
    `v${-(h - 2 * rr)}a${rr},${rr} 0 0 1 ${rr},${-rr}z`
  );
}

/**
 * Módulo com arredondamento seletivo. Cada canto só é curvo quando os DOIS
 * lados que o encostam estão vazios — é isso que funde vizinhos numa ilha só
 * em vez de desenhar bolinhas soltas.
 */
function islandModule(
  isOn: (r: number, c: number) => boolean,
  r: number,
  c: number,
  cell: number,
  rad: number,
) {
  const x = c * cell;
  const y = r * cell;
  const up = isOn(r - 1, c);
  const down = isOn(r + 1, c);
  const left = isOn(r, c - 1);
  const right = isOn(r, c + 1);
  const tl = !up && !left ? rad : 0;
  const tr = !up && !right ? rad : 0;
  const br = !down && !right ? rad : 0;
  const bl = !down && !left ? rad : 0;

  return (
    `M${x + tl},${y}` +
    `h${cell - tl - tr}${tr ? `a${tr},${tr} 0 0 1 ${tr},${tr}` : ""}` +
    `v${cell - tr - br}${br ? `a${br},${br} 0 0 1 ${-br},${br}` : ""}` +
    `h${-(cell - br - bl)}${bl ? `a${bl},${bl} 0 0 1 ${-bl},${-bl}` : ""}` +
    `v${-(cell - bl - tl)}${tl ? `a${tl},${tl} 0 0 1 ${tl},${-tl}` : ""}z`
  );
}

export function QRCode({
  value,
  ecc = "medium",
  radius = 0.15,
  quietZone = 0,
  className,
  ...props
}: QRCodeProps) {
  const path = React.useMemo(() => {
    const m = encodeQR(value, "raw", { ecc }) as boolean[][];
    const n = m.length;
    const cell = 1;
    const off = quietZone;

    const isOn = (r: number, c: number) =>
      r >= 0 && c >= 0 && r < n && c < n && m[r][c];

    // Os três olhos ocupam 7×7 nos cantos superior-esquerdo, superior-direito
    // e inferior-esquerdo. Eles saem do fluxo normal e são desenhados como
    // anéis concêntricos.
    const inEye = (r: number, c: number) =>
      (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

    const rad = cell * radius;
    let d = "";

    for (const [er, ec] of [
      [0, 0],
      [0, n - 7],
      [n - 7, 0],
    ]) {
      const x = (ec + off) * cell;
      const y = (er + off) * cell;
      const s = 7 * cell;
      // Anel externo: quadrado arredondado com furo (fill-rule="evenodd"
      // transforma o segundo contorno em recorte).
      d += roundRect(x, y, s, s, cell * 1.9);
      d += roundRect(x + cell, y + cell, s - 2 * cell, s - 2 * cell, cell * 1.25);
      // Miolo: quadrado arredondado, não círculo — círculo destoa do resto.
      d += roundRect(x + 2 * cell, y + 2 * cell, 3 * cell, 3 * cell, cell * 0.95);
    }

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!m[r][c] || inEye(r, c)) continue;
        d += islandModule(isOn, r + off, c + off, cell, rad);
      }
    }

    return { d, size: (n + off * 2) * cell };
  }, [value, ecc, radius, quietZone]);

  return (
    <svg
      viewBox={`0 0 ${path.size} ${path.size}`}
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="geometricPrecision"
      role="img"
      aria-label={`QR code para ${value}`}
      className={cn("block h-full w-full", className)}
      {...props}
    >
      <path d={path.d} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}
