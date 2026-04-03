import React from "react";
import { cn } from "@/lib/utils";

interface LiquidGlassProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    intensity?: number;
}

export const LiquidGlass: React.FC<LiquidGlassProps> = ({
    children,
    className,
    intensity = 20,
    ...props
}) => {
    return (
        <>
            {/* Hidden SVG filter definition */}
            <svg style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}>
                <defs>
                    <filter id="liquid-glass-filter">
                        <feTurbulence
                            type="turbulence"
                            baseFrequency="0.015"
                            numOctaves="2"
                            result="turbulence"
                        >
                            <animate
                                attributeName="baseFrequency"
                                dur="30s"
                                values="0.015;0.018;0.015"
                                repeatCount="indefinite"
                            />
                        </feTurbulence>
                        <feDisplacementMap
                            in="SourceGraphic"
                            in2="turbulence"
                            scale={intensity}
                            xChannelSelector="R"
                            yChannelSelector="G"
                        />
                    </filter>
                </defs>
            </svg>

            <div
                className={cn(
                    "relative overflow-hidden transition-all duration-300",
                    "backdrop-filter",
                    className
                )}
                style={{
                    backdropFilter: `brightness(1.1) blur(12px) url(#liquid-glass-filter)`,
                    WebkitBackdropFilter: `brightness(1.1) blur(12px) url(#liquid-glass-filter)`,
                }}
                {...props}
            >
                {/* Shine effect overlay */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50" />

                {/* Content */}
                <div className="relative z-10">
                    {children}
                </div>
            </div>
        </>
    );
};
