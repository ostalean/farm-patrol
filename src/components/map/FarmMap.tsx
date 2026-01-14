import { useState, useCallback, useMemo, useRef } from 'react';
import Map, {
  Source,
  Layer,
  Marker,
  Popup,
  NavigationControl,
  type MapRef,
  type ViewState,
} from 'react-map-gl';
import type { Feature, FeatureCollection, Polygon } from 'geojson';
import type { Block, BlockMetrics, Tractor } from '@/types/farm';
import { getBlockStatus } from '@/types/farm';
import { DrawControl } from './DrawControl';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface FarmMapProps {
  blocks: Block[];
  blockMetrics: Record<string, BlockMetrics>;
  tractors: Tractor[];
  selectedBlockId: string | null;
  onBlockClick: (block: Block) => void;
  center: [number, number];
  zoom: number;
  onMapReady?: (map: MapRef) => void;
  onBlockDrawn?: (geometry: Feature<Polygon>) => void;
  enableDrawing?: boolean;
}

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
  const mapRef = useRef<MapRef>(null);
  const [popupInfo, setPopupInfo] = useState<{
    block: Block;
    longitude: number;
    latitude: number;
  } | null>(null);

  // Convert blocks to GeoJSON FeatureCollection for each status
  const { healthyBlocks, warningBlocks, criticalBlocks, selectedBlock } = useMemo(() => {
    const healthy: Feature<Polygon>[] = [];
    const warning: Feature<Polygon>[] = [];
    const critical: Feature<Polygon>[] = [];
    let selected: Feature<Polygon> | null = null;

    blocks.forEach((block) => {
      const metrics = blockMetrics[block.id];
      const status = getBlockStatus(metrics ?? null);
      const feature: Feature<Polygon> = {
        type: 'Feature',
        id: block.id,
        properties: {
          id: block.id,
          name: block.name,
          crop: block.crop,
          status,
        },
        geometry: block.geometry_geojson.geometry,
      };

      if (block.id === selectedBlockId) {
        selected = feature;
      }

      switch (status) {
        case 'healthy':
          healthy.push(feature);
          break;
        case 'warning':
          warning.push(feature);
          break;
        case 'critical':
          critical.push(feature);
          break;
      }
    });

    return {
      healthyBlocks: { type: 'FeatureCollection', features: healthy } as FeatureCollection,
      warningBlocks: { type: 'FeatureCollection', features: warning } as FeatureCollection,
      criticalBlocks: { type: 'FeatureCollection', features: critical } as FeatureCollection,
      selectedBlock: selected
        ? ({ type: 'FeatureCollection', features: [selected] } as FeatureCollection)
        : null,
    };
  }, [blocks, blockMetrics, selectedBlockId]);

  const handleMapLoad = useCallback(() => {
    if (mapRef.current) {
      onMapReady?.(mapRef.current);
    }
  }, [onMapReady]);

  const handleMapClick = useCallback(
    (event: mapboxgl.MapLayerMouseEvent) => {
      const features = event.features;
      if (features && features.length > 0) {
        const clickedFeature = features[0];
        const blockId = clickedFeature.properties?.id;
        const block = blocks.find((b) => b.id === blockId);
        if (block) {
          onBlockClick(block);
        }
      }
    },
    [blocks, onBlockClick]
  );

  const handleMouseEnter = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = 'pointer';
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = '';
    }
  }, []);

  const interactiveLayerIds = useMemo(
    () => ['blocks-healthy-fill', 'blocks-warning-fill', 'blocks-critical-fill'],
    []
  );

  const initialViewState: Partial<ViewState> = {
    longitude: center[1],
    latitude: center[0],
    zoom: zoom,
  };

  return (
    <div className="h-full w-full relative">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        onLoad={handleMapLoad}
        onClick={handleMapClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        interactiveLayerIds={interactiveLayerIds}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {enableDrawing && <DrawControl onBlockDrawn={onBlockDrawn} position="top-left" />}

        {/* Healthy blocks */}
        <Source id="blocks-healthy" type="geojson" data={healthyBlocks}>
          <Layer
            id="blocks-healthy-fill"
            type="fill"
            paint={{
              'fill-color': '#22c55e',
              'fill-opacity': 0.3,
            }}
          />
          <Layer
            id="blocks-healthy-outline"
            type="line"
            paint={{
              'line-color': '#22c55e',
              'line-width': 2,
            }}
          />
        </Source>

        {/* Warning blocks */}
        <Source id="blocks-warning" type="geojson" data={warningBlocks}>
          <Layer
            id="blocks-warning-fill"
            type="fill"
            paint={{
              'fill-color': '#f59e0b',
              'fill-opacity': 0.3,
            }}
          />
          <Layer
            id="blocks-warning-outline"
            type="line"
            paint={{
              'line-color': '#f59e0b',
              'line-width': 2,
            }}
          />
        </Source>

        {/* Critical blocks */}
        <Source id="blocks-critical" type="geojson" data={criticalBlocks}>
          <Layer
            id="blocks-critical-fill"
            type="fill"
            paint={{
              'fill-color': '#ef4444',
              'fill-opacity': 0.3,
            }}
          />
          <Layer
            id="blocks-critical-outline"
            type="line"
            paint={{
              'line-color': '#ef4444',
              'line-width': 2,
            }}
          />
        </Source>

        {/* Selected block highlight */}
        {selectedBlock && (
          <Source id="blocks-selected" type="geojson" data={selectedBlock}>
            <Layer
              id="blocks-selected-fill"
              type="fill"
              paint={{
                'fill-color': '#3b82f6',
                'fill-opacity': 0.5,
              }}
            />
            <Layer
              id="blocks-selected-outline"
              type="line"
              paint={{
                'line-color': '#3b82f6',
                'line-width': 3,
              }}
            />
          </Source>
        )}

        {/* Tractor markers */}
        {tractors.map((tractor) => {
          if (!tractor.last_lat || !tractor.last_lon) return null;
          return (
            <Marker
              key={tractor.id}
              longitude={tractor.last_lon}
              latitude={tractor.last_lat}
              anchor="center"
            >
              <div className="relative cursor-pointer group">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-transform group-hover:scale-110">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="5.5" cy="17.5" r="2.5" />
                    <circle cx="17.5" cy="17.5" r="2.5" />
                    <path d="M12 17.5V6a1 1 0 0 0-1-1H5a2 2 0 0 0-2 2v8.5" />
                    <path d="M20 17.5V9a1 1 0 0 0-1-1h-3l-2-3H9" />
                  </svg>
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-white" />
                {/* Tooltip on hover */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-card text-card-foreground px-2 py-1 rounded shadow-lg border text-sm whitespace-nowrap">
                    <strong className="font-display">{tractor.name}</strong>
                    <p className="text-muted-foreground text-xs">{tractor.identifier}</p>
                  </div>
                </div>
              </div>
            </Marker>
          );
        })}

        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
          >
            <div className="text-sm">
              <strong className="font-display">{popupInfo.block.name}</strong>
              {popupInfo.block.crop && (
                <p className="text-muted-foreground">{popupInfo.block.crop}</p>
              )}
            </div>
          </Popup>
        )}
      </Map>

      {blocks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="bg-background/90 backdrop-blur-sm rounded-lg p-6 text-center max-w-sm shadow-lg pointer-events-auto">
            <p className="text-muted-foreground mb-2">No hay cuarteles aún</p>
            <p className="text-sm text-muted-foreground">
              Usa las herramientas de dibujo en la esquina superior izquierda para crear un
              cuartel, o carga un archivo GeoJSON.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
