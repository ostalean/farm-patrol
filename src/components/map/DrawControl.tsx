import { useCallback, useEffect, useRef } from 'react';
import { useMap } from 'react-map-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { Feature, Polygon } from 'geojson';

interface DrawControlProps {
  onBlockDrawn?: (geometry: Feature<Polygon>) => void;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export function DrawControl({ onBlockDrawn, position = 'top-left' }: DrawControlProps) {
  const { current: map } = useMap();
  const drawRef = useRef<MapboxDraw | null>(null);

  const handleDrawCreate = useCallback(
    (e: { features: Feature[] }) => {
      if (e.features.length > 0) {
        const feature = e.features[0] as Feature<Polygon>;
        if (feature.geometry.type === 'Polygon') {
          onBlockDrawn?.({
            type: 'Feature',
            properties: {},
            geometry: feature.geometry,
          });
          // Clear the drawn feature after it's been captured
          setTimeout(() => {
            drawRef.current?.deleteAll();
          }, 100);
        }
      }
    },
    [onBlockDrawn]
  );

  useEffect(() => {
    if (!map) return;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: 'simple_select',
      styles: [
        // Polygon fill
        {
          id: 'gl-draw-polygon-fill',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          paint: {
            'fill-color': 'hsl(152, 45%, 22%)',
            'fill-outline-color': 'hsl(152, 45%, 22%)',
            'fill-opacity': 0.3,
          },
        },
        // Polygon outline
        {
          id: 'gl-draw-polygon-stroke-active',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': 'hsl(142, 60%, 45%)',
            'line-width': 2,
          },
        },
        // Vertex point halos
        {
          id: 'gl-draw-polygon-and-line-vertex-halo-active',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
          paint: {
            'circle-radius': 7,
            'circle-color': '#FFF',
          },
        },
        // Vertex points
        {
          id: 'gl-draw-polygon-and-line-vertex-active',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
          paint: {
            'circle-radius': 5,
            'circle-color': 'hsl(152, 45%, 22%)',
          },
        },
        // Midpoint
        {
          id: 'gl-draw-polygon-midpoint',
          type: 'circle',
          filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
          paint: {
            'circle-radius': 4,
            'circle-color': 'hsl(142, 60%, 45%)',
          },
        },
      ],
    });

    drawRef.current = draw;

    // Add draw control to map
    map.addControl(draw as unknown as mapboxgl.IControl, position);

    // Add event listeners
    map.on('draw.create', handleDrawCreate);
    map.on('draw.update', handleDrawCreate);

    return () => {
      map.off('draw.create', handleDrawCreate);
      map.off('draw.update', handleDrawCreate);
      
      try {
        map.removeControl(draw as unknown as mapboxgl.IControl);
      } catch (e) {
        // Control might already be removed
      }
      drawRef.current = null;
    };
  }, [map, position, handleDrawCreate]);

  return null;
}
