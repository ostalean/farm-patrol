import { useMemo, useRef, useEffect } from 'react';
import Map, { Source, Layer, type MapRef } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import type { Feature, FeatureCollection, Polygon, LineString, Point } from 'geojson';
import type { Block, GpsPing } from '@/types/farm';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface BlockMiniMapProps {
  block: Block;
  visitPath?: GpsPing[];
  missedAreas?: Feature<Polygon>[];
}

export function BlockMiniMap({ block, visitPath, missedAreas }: BlockMiniMapProps) {
  const mapRef = useRef<MapRef>(null);

  // Calculate bounds from block geometry
  const bounds = useMemo(() => {
    try {
      const bbox = turf.bbox(block.geometry_geojson);
      return [
        [bbox[0], bbox[1]], // southwest
        [bbox[2], bbox[3]], // northeast
      ] as [[number, number], [number, number]];
    } catch {
      return null;
    }
  }, [block.geometry_geojson]);

  // Fit bounds when map loads or block changes
  useEffect(() => {
    if (mapRef.current && bounds) {
      mapRef.current.fitBounds(bounds, {
        padding: 30,
        duration: 0,
      });
    }
  }, [bounds, block.id]);

  // Block polygon GeoJSON
  const blockGeoJSON = useMemo<FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: block.geometry_geojson.geometry,
    }],
  }), [block.geometry_geojson]);

  // Path line and points GeoJSON
  const pathData = useMemo(() => {
    if (!visitPath || visitPath.length < 2) return null;

    const lineString: Feature<LineString> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: visitPath.map(p => [p.lon, p.lat]),
      },
    };

    const startPoint: Feature<Point> = {
      type: 'Feature',
      properties: { type: 'start' },
      geometry: {
        type: 'Point',
        coordinates: [visitPath[0].lon, visitPath[0].lat],
      },
    };

    const endPoint: Feature<Point> = {
      type: 'Feature',
      properties: { type: 'end' },
      geometry: {
        type: 'Point',
        coordinates: [visitPath[visitPath.length - 1].lon, visitPath[visitPath.length - 1].lat],
      },
    };

    return {
      line: { type: 'FeatureCollection', features: [lineString] } as FeatureCollection,
      points: { type: 'FeatureCollection', features: [startPoint, endPoint] } as FeatureCollection,
    };
  }, [visitPath]);

  // Missed areas GeoJSON
  const missedAreasGeoJSON = useMemo<FeatureCollection | null>(() => {
    if (!missedAreas || missedAreas.length === 0) return null;
    return {
      type: 'FeatureCollection',
      features: missedAreas,
    };
  }, [missedAreas]);

  // Initial center from bounds
  const center = useMemo(() => {
    if (!bounds) return { lng: -70.6, lat: -33.4 };
    return {
      lng: (bounds[0][0] + bounds[1][0]) / 2,
      lat: (bounds[0][1] + bounds[1][1]) / 2,
    };
  }, [bounds]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="h-40 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm">
        Mapa no disponible
      </div>
    );
  }

  return (
    <div className="h-40 rounded-lg overflow-hidden border border-border">
      <Map
        ref={mapRef}
        mapLib={mapboxgl}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: center.lng,
          latitude: center.lat,
          zoom: 14,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        interactive={false}
        attributionControl={false}
        onLoad={() => {
          if (mapRef.current && bounds) {
            mapRef.current.fitBounds(bounds, { padding: 30, duration: 0 });
          }
        }}
      >
        {/* Block polygon */}
        <Source id="minimap-block" type="geojson" data={blockGeoJSON}>
          <Layer
            id="minimap-block-fill"
            type="fill"
            paint={{
              'fill-color': '#3b82f6',
              'fill-opacity': 0.2,
            }}
          />
          <Layer
            id="minimap-block-outline"
            type="line"
            paint={{
              'line-color': '#3b82f6',
              'line-width': 2,
            }}
          />
        </Source>

        {/* Missed areas */}
        {missedAreasGeoJSON && (
          <Source id="minimap-missed" type="geojson" data={missedAreasGeoJSON}>
            <Layer
              id="minimap-missed-fill"
              type="fill"
              paint={{
                'fill-color': '#ef4444',
                'fill-opacity': 0.4,
              }}
            />
          </Source>
        )}

        {/* Visit path */}
        {pathData && (
          <>
            <Source id="minimap-path-line" type="geojson" data={pathData.line}>
              <Layer
                id="minimap-path-line-bg"
                type="line"
                paint={{
                  'line-color': '#ffffff',
                  'line-width': 4,
                  'line-opacity': 0.8,
                }}
              />
              <Layer
                id="minimap-path-line-main"
                type="line"
                paint={{
                  'line-color': '#3b82f6',
                  'line-width': 2,
                }}
              />
            </Source>
            <Source id="minimap-path-points" type="geojson" data={pathData.points}>
              <Layer
                id="minimap-path-points-layer"
                type="circle"
                paint={{
                  'circle-radius': 5,
                  'circle-color': [
                    'match',
                    ['get', 'type'],
                    'start', '#22c55e',
                    'end', '#ef4444',
                    '#3b82f6'
                  ],
                  'circle-stroke-width': 2,
                  'circle-stroke-color': '#ffffff',
                }}
              />
            </Source>
          </>
        )}
      </Map>
    </div>
  );
}