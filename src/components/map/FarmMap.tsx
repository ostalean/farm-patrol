import { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Block, BlockMetrics, Tractor } from '@/types/farm';
import { getBlockStatus } from '@/types/farm';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface FarmMapProps {
  blocks: Block[];
  blockMetrics: Record<string, BlockMetrics>;
  tractors: Tractor[];
  selectedBlockId: string | null;
  onBlockClick: (block: Block) => void;
  center: [number, number];
  zoom: number;
}

const tractorIcon = new L.DivIcon({
  html: `<div class="relative">
    <div style="width: 32px; height: 32px; background: hsl(152, 45%, 22%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 2px solid white;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="5.5" cy="17.5" r="2.5"/>
        <circle cx="17.5" cy="17.5" r="2.5"/>
        <path d="M12 17.5V6a1 1 0 0 0-1-1H5a2 2 0 0 0-2 2v8.5"/>
        <path d="M20 17.5V9a1 1 0 0 0-1-1h-3l-2-3H9"/>
      </svg>
    </div>
    <div style="position: absolute; bottom: -2px; right: -2px; width: 10px; height: 10px; background: hsl(142, 60%, 45%); border-radius: 50%; border: 2px solid white;"></div>
  </div>`,
  className: 'tractor-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function getBlockColor(status: ReturnType<typeof getBlockStatus>): string {
  switch (status) {
    case 'healthy':
      return '#22c55e';
    case 'warning':
      return '#f59e0b';
    case 'critical':
      return '#ef4444';
  }
}

// Separate component for block polygons
function BlockPolygon({ 
  block, 
  metrics, 
  isSelected, 
  onClick 
}: { 
  block: Block; 
  metrics: BlockMetrics | undefined;
  isSelected: boolean;
  onClick: () => void;
}) {
  const status = getBlockStatus(metrics || null);
  const color = getBlockColor(status);
  
  // Convert GeoJSON coordinates to Leaflet format [lat, lon]
  const positions = block.geometry_geojson.geometry.coordinates[0].map(
    (coord: number[]) => [coord[1], coord[0]] as [number, number]
  );

  return (
    <Polygon
      positions={positions}
      pathOptions={{
        color: color,
        fillColor: color,
        fillOpacity: isSelected ? 0.5 : 0.3,
        weight: isSelected ? 3 : 2,
      }}
      eventHandlers={{
        click: onClick,
      }}
    >
      <Popup>
        <div className="text-sm">
          <strong className="font-display">{block.name}</strong>
          {block.crop && <p className="text-muted-foreground">{block.crop}</p>}
        </div>
      </Popup>
    </Polygon>
  );
}

// Separate component for tractor markers
function TractorMarker({ tractor }: { tractor: Tractor }) {
  if (!tractor.last_lat || !tractor.last_lon) return null;
  
  return (
    <Marker
      position={[tractor.last_lat, tractor.last_lon]}
      icon={tractorIcon}
    >
      <Popup>
        <div className="text-sm">
          <strong className="font-display">{tractor.name}</strong>
          <p className="text-muted-foreground">{tractor.identifier}</p>
        </div>
      </Popup>
    </Marker>
  );
}

export function FarmMap({
  blocks,
  blockMetrics,
  tractors,
  selectedBlockId,
  onBlockClick,
  center,
  zoom,
}: FarmMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full w-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <ZoomControl position="topright" />
      
      {blocks.map((block) => (
        <BlockPolygon
          key={block.id}
          block={block}
          metrics={blockMetrics[block.id]}
          isSelected={block.id === selectedBlockId}
          onClick={() => onBlockClick(block)}
        />
      ))}
      
      {tractors.map((tractor) => (
        <TractorMarker key={tractor.id} tractor={tractor} />
      ))}
    </MapContainer>
  );
}
