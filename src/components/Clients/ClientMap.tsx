import { useState, useMemo, useRef } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';

const SOUTH_AMERICA_IDS = new Set([
  '032','068','076','152','170','218','328','600','604','740','858','862','254',
]);

const BR_STATES = new Set([
  'AC','AL','AP','AM','BA','CE','DF','ES','GO',
  'MA','MT','MS','MG','PA','PB','PR','PE','PI',
  'RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]);

// Extrai a sigla do estado de um endereço brasileiro
// Divide por separadores e verifica cada token de trás para frente
function extractState(address: string): string | null {
  if (!address) return null;
  const tokens = address.split(/[\s,\-–\/]+/).reverse();
  for (const token of tokens) {
    const upper = token.toUpperCase();
    if (BR_STATES.has(upper)) return upper;
  }
  return null;
}

// Retorna a cor de preenchimento do estado baseada na quantidade de clientes
function stateColor(count: number): string {
  if (count === 0) return 'rgba(255,255,255,0.02)';
  if (count === 1) return 'rgba(104,41,192,0.30)';
  if (count === 2) return 'rgba(104,41,192,0.50)';
  if (count === 3) return 'rgba(104,41,192,0.65)';
  return 'rgba(104,41,192,0.82)'; // 4+
}

function stateStroke(count: number): string {
  if (count === 0) return 'rgba(104,41,192,0.20)';
  return 'rgba(104,41,192,0.70)';
}

interface ClientMarker {
  id: string;
  company: string;
  lat: number;
  lng: number;
  address?: string;
}

interface ClientMapProps {
  markers: ClientMarker[];
}

export function ClientMap({ markers }: ClientMapProps) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const worldUrl  = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json';
  const statesUrl = '/brazil-states.geojson';

  // Conta clientes por sigla do estado
  const countByState = useMemo(() => {
    const counts: Record<string, number> = {};
    markers.forEach((m) => {
      const sigla = m.address ? extractState(m.address) : null;
      if (sigla) counts[sigla] = (counts[sigla] ?? 0) + 1;
    });
    return counts;
  }, [markers]);

  const maxCount = Math.max(...Object.values(countByState), 1);

  const handleMouseEnter = (e: React.MouseEvent, text: string) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltip({ text, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!tooltip || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltip((prev) => prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-xl"
          style={{
            left: tooltip.x + 14,
            top: tooltip.y - 16,
            background: 'rgba(104,41,192,0.92)',
            border: '1px solid rgba(255,255,255,0.2)',
            whiteSpace: 'nowrap',
          }}
        >
          {tooltip.text}
        </div>
      )}

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: [-52, -15], scale: 720 }}
        style={{ width: '100%', height: '420px' }}
        viewBox="0 0 800 620"
      >
        <ZoomableGroup center={[-50, -16]} zoom={1.3}>
          {/* Camada 1 — países vizinhos (background sutil) */}
          <Geographies geography={worldUrl}>
            {({ geographies }) =>
              geographies
                .filter((geo) => SOUTH_AMERICA_IDS.has(geo.id) && geo.id !== '076')
                .map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    style={{
                      default: { fill: 'rgba(255,255,255,0.03)', stroke: 'rgba(255,255,255,0.07)', strokeWidth: 0.5, outline: 'none' },
                      hover:   { fill: 'rgba(255,255,255,0.03)', outline: 'none' },
                      pressed: { outline: 'none' },
                    }}
                  />
                ))
            }
          </Geographies>

          {/* Camada 2 — estados do Brasil coloridos por densidade */}
          <Geographies geography={statesUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const sigla = geo.properties.sigla as string;
                const count = countByState[sigla] ?? 0;
                const fill   = stateColor(count);
                const stroke = stateStroke(count);
                const label  = count > 0
                  ? `${sigla} — ${count} cliente${count > 1 ? 's' : ''}`
                  : sigla;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={(e) => handleMouseEnter(e as unknown as React.MouseEvent, label)}
                    onMouseMove={(e) => handleMouseMove(e as unknown as React.MouseEvent)}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      default: { fill, stroke, strokeWidth: 0.6, outline: 'none' },
                      hover:   { fill: count > 0 ? 'rgba(124,58,237,0.90)' : 'rgba(104,41,192,0.12)', stroke: 'rgba(104,41,192,0.8)', strokeWidth: 0.8, outline: 'none' },
                      pressed: { outline: 'none' },
                    }}
                  />
                );
              })
            }
          </Geographies>

        </ZoomableGroup>
      </ComposableMap>

      {markers.length === 0 && (
        <p className="text-center text-sm text-white/30 py-4">
          Adicione endereços nos clientes para vê-los no mapa
        </p>
      )}
    </div>
  );
}
