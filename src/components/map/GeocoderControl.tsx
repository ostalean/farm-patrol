import { useEffect } from 'react';
import { useMap } from 'react-map-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import mapboxgl from 'mapbox-gl';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface GeocoderControlProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export function GeocoderControl({ position = 'top-right' }: GeocoderControlProps) {
  const { current: map } = useMap();

  useEffect(() => {
    if (!map || !MAPBOX_TOKEN) return;

    const geocoder = new MapboxGeocoder({
      accessToken: MAPBOX_TOKEN,
      mapboxgl: mapboxgl as any,
      marker: true,
      placeholder: 'Buscar lugar...',
      language: 'es',
      minLength: 2,
    });

    map.addControl(geocoder as any, position);

    return () => {
      try {
        map.removeControl(geocoder as any);
      } catch (e) {
        // Control might already be removed
      }
    };
  }, [map, position]);

  return null;
}
