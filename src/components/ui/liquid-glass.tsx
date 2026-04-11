import React, { useEffect, useRef, useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface LiquidGlassProps extends React.HTMLAttributes<HTMLDivElement> {
    radius?: number;
    depth?: number;
    blur?: number;
    strength?: number;
    chromaticAberration?: number;
    backgroundColor?: string;
    borderColor?: string;
}

export const LiquidGlass = React.forwardRef<HTMLDivElement, LiquidGlassProps>(
    (
        {
            children,
            className,
            radius = 16,
            depth = 8,
            blur = 20,
            strength = 40,
            chromaticAberration = 0,
            backgroundColor = "rgba(18, 18, 18, 0.4)",
            borderColor = "rgba(255, 255, 255, 0.08)",
            ...props
        },
        ref
    ) => {
        const internalRef = useRef<HTMLDivElement>(null);
        // Use the forwarded ref if provided, otherwise use internal ref
        const containerRef = (ref as any) || internalRef;

        const [size, setSize] = useState({ width: 0, height: 0 });
        const [filterId] = useState(() => `liquid-glass-${Math.random().toString(36).substr(2, 9)}`);

        useEffect(() => {
            if (!containerRef.current) return;

            const updateSize = () => {
                if (containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    setSize({
                        width: Math.ceil(rect.width),
                        height: Math.ceil(rect.height),
                    });
                }
            };

            updateSize(); // Initial measure

            const observer = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    setSize({
                        width: Math.ceil(entry.contentRect.width),
                        height: Math.ceil(entry.contentRect.height),
                    });
                }
            });
            observer.observe(containerRef.current);
            return () => observer.disconnect();
        }, [containerRef]);

        const dMapUrl = useMemo(() => {
            if (size.width === 0 || size.height === 0) return "";

            // Prevent division by zero and extremely small heights/widths
            const w = Math.max(size.width, 10);
            const h = Math.max(size.height, 10);

            const svg = `<svg height="${h}" width="${w}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
        <style>.mix { mix-blend-mode: screen; }</style>
        <defs>
          <linearGradient id="Y-${filterId}" x1="0" x2="0" y1="${Math.min(50, Math.ceil((radius / h) * 15))}%" y2="${Math.max(50, Math.floor(100 - (radius / h) * 15))}%">
            <stop offset="0%" stop-color="#0F0" />
            <stop offset="100%" stop-color="#000" />
          </linearGradient>
          <linearGradient id="X-${filterId}" x1="${Math.min(50, Math.ceil((radius / w) * 15))}%" x2="${Math.max(50, Math.floor(100 - (radius / w) * 15))}%" y1="0" y2="0">
            <stop offset="0%" stop-color="#F00" />
            <stop offset="100%" stop-color="#000" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" height="${h}" width="${w}" fill="#808080" />
        <g filter="blur(2px)">
          <rect x="0" y="0" height="${h}" width="${w}" fill="#000080" />
          <rect x="0" y="0" height="${h}" width="${w}" fill="url(#Y-${filterId})" class="mix" />
          <rect x="0" y="0" height="${h}" width="${w}" fill="url(#X-${filterId})" class="mix" />
          <rect x="${depth}" y="${depth}" height="${Math.max(0, h - 2 * depth)}" width="${Math.max(0, w - 2 * depth)}" fill="#808080" rx="${radius}" ry="${radius}" filter="blur(${depth}px)" />
        </g>
      </svg>`;
            return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
        }, [size.width, size.height, radius, depth, filterId]);

        const hasDimensions = size.width > 0 && size.height > 0;

        return (
            <div
                ref={containerRef}
                className={cn("relative rounded-2xl", className)}
                {...props}
            >
                {/* Only render SVG filter if we have dimensions */}
                {hasDimensions && (
                    <svg style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}>
                        <filter id={filterId} colorInterpolationFilters="sRGB">
                            <feImage x="0" y="0" height={size.height} width={size.width} href={dMapUrl} result="displacementMap" />
                            <feDisplacementMap
                                in="SourceGraphic"
                                in2="displacementMap"
                                scale={strength}
                                xChannelSelector="R"
                                yChannelSelector="G"
                            />
                            {/* Optional Chromatic Aberration can be chained here if needed, keeping it simple for now */}
                        </filter>
                    </svg>
                )}

                {/* The Glass Background Layer with the active SVG Filter */}
                <div
                    className="absolute inset-0 z-0 pointer-events-none"
                    style={{
                        borderRadius: radius,
                        backgroundColor: backgroundColor,
                        border: `1px solid ${borderColor}`,
                        borderTop: `1px solid rgba(255, 255, 255, 0.15)`,
                        boxShadow: 'inset 1px 1px 1px 0px rgba(255, 255, 255, 0.1), inset -1px -1px 1px 0px rgba(255, 255, 255, 0.05), 0 8px 32px 0 rgba(0, 0, 0, 0.2)',
                        // Fallback for browsers without SVG filter support in backdrop-filter
                        backdropFilter: hasDimensions
                            ? `blur(${blur / 2}px) url(#${filterId}) blur(${blur}px) brightness(1.1) saturate(1.5)`
                            : `blur(${blur}px)`,
                        WebkitBackdropFilter: hasDimensions
                            ? `blur(${blur / 2}px) url(#${filterId}) blur(${blur}px) brightness(1.1) saturate(1.5)`
                            : `blur(${blur}px)`,
                    }}
                />

                {/* Content */}
                <div className="relative z-10 w-full h-full flex flex-col">
                    {children}
                </div>
            </div>
        );
    }
);

LiquidGlass.displayName = "LiquidGlass";
