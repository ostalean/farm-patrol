import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from 'react-leaflet';
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
    <div class="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-primary-foreground">
      <svg class="w-5 h-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    </div>
    <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-success rounded-full border border-primary-foreground animate-pulse-ring"></div>
  </div>`,
  className: 'tractor-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
}

function getBlockColor(status: ReturnType<typeof getBlockStatus>): string {
  switch (status) {
    case 'healthy':
      return 'hsl(142, 60%, 45%)';
    case 'warning':
      return 'hsl(38, 92%, 55%)';
    case 'critical':
      return 'hsl(0, 72%, 55%)';
  }
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
      
      <MapController center={center} zoom={zoom} />
      
      {/* Render blocks as polygons */}
      {blocks.map((block) => {
        const metrics = blockMetrics[block.id];
        const status = getBlockStatus(metrics);
        const isSelected = block.id === selectedBlockId;
        
        // Convert GeoJSON coordinates to Leaflet format [lat, lon]
        const positions = block.geometry_geojson.geometry.coordinates[0].map(
          (coord: number[]) => [coord[1], coord[0]] as [number, number]
        );
        
        return (
          <Polygon
            key={block.id}
            positions={positions}
            pathOptions={{
              color: getBlockColor(status),
              fillColor: getBlockColor(status),
              fillOpacity: isSelected ? 0.5 : 0.3,
              weight: isSelected ? 3 : 2,
            }}
            eventHandlers={{
              click: () => onBlockClick(block),
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
      })}
      
      {/* Render tractors as markers */}
      {tractors
        .filter((t) => t.last_lat && t.last_lon)
        .map((tractor) => (
          <Marker
            key={tractor.id}
            position={[tractor.last_lat!, tractor.last_lon!]}
            icon={tractorIcon}
          >
            <Popup>
              <div className="text-sm">
                <strong className="font-display">{tractor.name}</strong>
                <p className="text-muted-foreground">{tractor.identifier}</p>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
