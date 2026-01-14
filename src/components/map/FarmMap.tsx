import { useEffect, useRef, useCallback } from 'react';
import L, { type Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import type { Block, BlockMetrics, Tractor } from '@/types/farm';
import { getBlockStatus } from '@/types/farm';
import type { Feature, Polygon } from 'geojson';

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
  onBlockDrawn?: (geometry: Feature<Polygon>) => void;
  enableDrawing?: boolean;
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
  onBlockDrawn,
  enableDrawing = true,
}: FarmMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const polygonLayersRef = useRef<Map<string, L.Polygon>>(new Map());
  const tractorMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup());

  // Handle draw created event
  const handleDrawCreated = useCallback((e: L.LeafletEvent) => {
    const event = e as L.DrawEvents.Created;
    const layer = event.layer as L.Polygon;
    
    // Get coordinates from the drawn polygon
    const latlngs = layer.getLatLngs()[0] as L.LatLng[];
    const coordinates = latlngs.map((ll) => [ll.lng, ll.lat]);
    // Close the polygon
    coordinates.push(coordinates[0]);

    const feature: Feature<Polygon> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates],
      },
    };

    onBlockDrawn?.(feature);
    
    // Remove the temporary drawn layer (we'll render it properly when saved)
    drawnItemsRef.current.clearLayers();
  }, [onBlockDrawn]);

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

    // Add drawn items layer
    drawnItemsRef.current.addTo(map);

    // Add draw control if enabled
    if (enableDrawing) {
      const drawControl = new L.Control.Draw({
        position: 'topleft',
        draw: {
          polygon: {
            allowIntersection: false,
            showArea: true,
            shapeOptions: {
              color: '#22c55e',
              fillOpacity: 0.3,
            },
          },
          rectangle: {
            showArea: true,
            shapeOptions: {
              color: '#22c55e',
              fillOpacity: 0.3,
            },
          },
          circle: false,
          circlemarker: false,
          marker: false,
          polyline: false,
        },
        edit: {
          featureGroup: drawnItemsRef.current,
          remove: false,
          edit: false,
        },
      });
      drawControl.addTo(map);
      drawControlRef.current = drawControl;

      map.on(L.Draw.Event.CREATED, handleDrawCreated);
    }

    mapRef.current = map;
    onMapReady?.(map);

    return () => {
      map.off(L.Draw.Event.CREATED, handleDrawCreated);
      map.remove();
      mapRef.current = null;
      drawControlRef.current = null;
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

    tractors.forEach((tractor) => {
      if (!tractor.last_lat || !tractor.last_lon) return;

      const existingMarker = tractorMarkersRef.current.get(tractor.id);
      
      if (existingMarker) {
        // Update position smoothly
        existingMarker.setLatLng([tractor.last_lat, tractor.last_lon]);
      } else {
        // Create new marker
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
      }
    });

    // Remove markers for tractors that no longer exist
    tractorMarkersRef.current.forEach((marker, id) => {
      if (!tractors.find(t => t.id === id)) {
        marker.remove();
        tractorMarkersRef.current.delete(id);
      }
    });
  }, [tractors]);

  return (
    <div ref={containerRef} className="h-full w-full">
      {blocks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
          <div className="bg-background/90 backdrop-blur-sm rounded-lg p-6 text-center max-w-sm shadow-lg pointer-events-auto">
            <p className="text-muted-foreground mb-2">
              No hay cuarteles aún
            </p>
            <p className="text-sm text-muted-foreground">
              Usa las herramientas de dibujo en la esquina superior izquierda para crear un cuartel, o carga un archivo GeoJSON.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
