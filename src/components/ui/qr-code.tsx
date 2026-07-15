"use client";

import * as React from "react";
import QRCodeStyling from "qr-code-styling";
import { cn } from "@/lib/utils";

/**
 * QR estilizado via qr-code-styling (github.com/kozakdenys/qr-code-styling,
 * ~2.8k estrelas — a lib de referência pra QRs "bonitos"). Substitui o
 * renderer SVG caseiro anterior: módulos contínuos arredondados ("rounded")
 * em vez de bolinhas soltas, e olhos extra-arredondados — leitura visual
 * muito mais limpa/minimalista, mantendo a escaneabilidade.
 */
interface QRCodeProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

export function QRCode({
  value,
  size = 220,
  fgColor = "#18181d",
  bgColor = "transparent",
  errorCorrectionLevel = "M",
  className,
  ...props
}: QRCodeProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const qrRef = React.useRef<QRCodeStyling | null>(null);

  React.useEffect(() => {
    const options = {
      width: size,
      height: size,
      type: "svg" as const,
      data: value,
      margin: 0,
      qrOptions: { errorCorrectionLevel },
      dotsOptions: { color: fgColor, type: "rounded" as const },
      cornersSquareOptions: { color: fgColor, type: "extra-rounded" as const },
      cornersDotOptions: { color: fgColor, type: "dot" as const },
      backgroundOptions: { color: bgColor },
    };

    if (!qrRef.current) {
      qrRef.current = new QRCodeStyling(options);
      if (containerRef.current) qrRef.current.append(containerRef.current);
    } else {
      qrRef.current.update(options);
    }
  }, [value, size, fgColor, bgColor, errorCorrectionLevel]);

  return (
    <div
      ref={containerRef}
      aria-label={`QR code para ${value}`}
      role="img"
      className={cn("block [&_svg]:block", className)}
      {...props}
    />
  );
}
