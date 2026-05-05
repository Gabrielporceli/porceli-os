import { useEffect, useRef, useState } from 'react';
import createGlobe from 'cobe';
import { useSpring } from 'framer-motion';

interface ClientMarker {
  id: string;
  company: string;
  lat: number;
  lng: number;
}

interface ClientGlobeProps {
  markers: ClientMarker[];
}

export function ClientGlobe({ markers }: ClientGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null);
  const phiRef = useRef((-55 * Math.PI) / 180); // começa mostrando o Brasil
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const [tooltip, setTooltip] = useState<{ company: string; x: number; y: number } | null>(null);

  const r = useSpring(0, { stiffness: 100, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = canvas.offsetWidth;

    const cobeMarkers = markers.map((m) => ({
      location: [m.lat, m.lng] as [number, number],
      size: 0.06,
    }));

    globeRef.current = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: size * 2,
      height: size * 2,
      phi: phiRef.current,
      theta: -0.2,
      dark: 1,
      diffuse: 1.4,
      mapSamples: 20000,
      mapBrightness: 5,
      baseColor: [0.15, 0.1, 0.25],
      markerColor: [0.408, 0.161, 0.753],
      glowColor: [0.408, 0.161, 0.753],
      markers: cobeMarkers,
      onRender(state) {
        if (!pointerInteracting.current) {
          phiRef.current += 0.004;
        }
        state.phi = phiRef.current + r.get();
        state.width = size * 2;
        state.height = size * 2;
      },
    });

    return () => globeRef.current?.destroy();
  }, [markers]);

  return (
    <div className="relative w-full flex flex-col items-center">
      <div
        className="relative"
        style={{ width: '100%', maxWidth: 360, aspectRatio: '1' }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', cursor: 'grab' }}
          onPointerDown={(e) => {
            pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
            (e.target as HTMLCanvasElement).style.cursor = 'grabbing';
          }}
          onPointerUp={() => {
            pointerInteracting.current = null;
            if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
          }}
          onPointerOut={() => {
            pointerInteracting.current = null;
            setTooltip(null);
          }}
          onMouseMove={(e) => {
            if (pointerInteracting.current !== null) {
              const delta = e.clientX - pointerInteracting.current;
              pointerInteractionMovement.current = delta;
              r.set(delta / 200);
            }
          }}
        />

        {tooltip && (
          <div
            className="absolute pointer-events-none z-10 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-lg"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: 'translate(-50%, -120%)',
              background: 'rgba(104, 41, 192, 0.9)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.15)',
              whiteSpace: 'nowrap',
            }}
          >
            {tooltip.company}
          </div>
        )}
      </div>

      {markers.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5 max-w-xs">
          {markers.slice(0, 6).map((m) => (
            <span
              key={m.id}
              className="flex items-center gap-1 text-xs text-white/60 bg-white/5 px-2 py-0.5 rounded-full border border-white/[0.05]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              {m.company}
            </span>
          ))}
          {markers.length > 6 && (
            <span className="text-xs text-white/40 px-2 py-0.5">
              +{markers.length - 6} mais
            </span>
          )}
        </div>
      )}

      {markers.length === 0 && (
        <p className="mt-3 text-xs text-white/30 text-center">
          Adicione endereços nos clientes para ver no globo
        </p>
      )}
    </div>
  );
}
