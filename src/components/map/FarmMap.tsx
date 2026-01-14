import { useEffect, useRef } from 'react';
import L, { type Map as LeafletMap } from 'leaflet';
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
  onMapReady?: (map: LeafletMap) => void;
}

const tractorIcon = new L.DivIcon({
  html: `<div style="position: relative;">
    <div style="width: 32px; height: 32px; background: hsl(152, 45%, 22%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.25); border: 2px solid white;">
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

export function FarmMap({
  blocks,
  blockMetrics,
  tractors,
  selectedBlockId,
  onBlockClick,
  center,
  zoom,
  onMapReady,
}: FarmMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const polygonLayersRef = useRef<Map<string, L.Polygon>>(new Map());
  const tractorMarkersRef = useRef<Map<string, L.Marker>>(new Map());

  // Create map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    map.setView(center, zoom);

    mapRef.current = map;
    onMapReady?.(map);

    return () => {
      map.remove();
      mapRef.current = null;
      polygonLayersRef.current.clear();
      tractorMarkersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep view in sync
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView(center, zoom, { animate: true });
  }, [center, zoom]);

  // Render/update polygons
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // clear existing
    polygonLayersRef.current.forEach((layer) => layer.remove());
    polygonLayersRef.current.clear();

    blocks.forEach((block) => {
      const metrics = blockMetrics[block.id];
      const status = getBlockStatus(metrics ?? null);
      const color = getBlockColor(status);
      const isSelected = block.id === selectedBlockId;

      const latlngs = block.geometry_geojson.geometry.coordinates[0].map(
        (coord: number[]) => [coord[1], coord[0]] as [number, number]
      );

      const polygon = L.polygon(latlngs, {
        color,
        fillColor: color,
        fillOpacity: isSelected ? 0.5 : 0.3,
        weight: isSelected ? 3 : 2,
      });

      polygon.on('click', () => onBlockClick(block));

      // Popup content (safe DOM nodes, no innerHTML)
      const popup = document.createElement('div');
      popup.className = 'text-sm';
      const strong = document.createElement('strong');
      strong.className = 'font-display';
      strong.textContent = block.name;
      popup.appendChild(strong);
      if (block.crop) {
        const p = document.createElement('p');
        p.className = 'text-muted-foreground';
        p.textContent = block.crop;
        popup.appendChild(p);
      }
      polygon.bindPopup(popup);

      polygon.addTo(map);
      polygonLayersRef.current.set(block.id, polygon);
    });
  }, [blocks, blockMetrics, selectedBlockId, onBlockClick]);

  // Render/update tractor markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    tractorMarkersRef.current.forEach((m) => m.remove());
    tractorMarkersRef.current.clear();

    tractors.forEach((tractor) => {
      if (!tractor.last_lat || !tractor.last_lon) return;

      const marker = L.marker([tractor.last_lat, tractor.last_lon], {
        icon: tractorIcon,
      });

      const popup = document.createElement('div');
      popup.className = 'text-sm';
      const strong = document.createElement('strong');
      strong.className = 'font-display';
      strong.textContent = tractor.name;
      popup.appendChild(strong);
      const p = document.createElement('p');
      p.className = 'text-muted-foreground';
      p.textContent = tractor.identifier;
      popup.appendChild(p);
      marker.bindPopup(popup);

      marker.addTo(map);
      tractorMarkersRef.current.set(tractor.id, marker);
    });
  }, [tractors]);

  return <div ref={containerRef} className="h-full w-full" />;
}
