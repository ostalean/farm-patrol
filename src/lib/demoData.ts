import type { Feature, Polygon } from 'geojson';
import type { Block, Tractor, BlockMetrics, BlockVisit, GpsPing } from '@/types/farm';

// Demo cuarteles in Valle de Casablanca (Chilean wine region - RURAL)
// Centered around -33.32, -71.42
export const demoBlocks: Omit<Block, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Cuartel Norte A',
    farm_name: 'Fundo Los Robles',
    crop: 'Cabernet Sauvignon',
    geometry_geojson: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.428, -33.318],
          [-71.420, -33.318],
          [-71.420, -33.312],
          [-71.428, -33.312],
          [-71.428, -33.318],
        ]],
      },
    },
    metadata: { hectares: 12.5 },
  },
  {
    name: 'Cuartel Norte B',
    farm_name: 'Fundo Los Robles',
    crop: 'Merlot',
    geometry_geojson: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.419, -33.318],
          [-71.411, -33.318],
          [-71.411, -33.312],
          [-71.419, -33.312],
          [-71.419, -33.318],
        ]],
      },
    },
    metadata: { hectares: 10.2 },
  },
  {
    name: 'Cuartel Sur 1',
    farm_name: 'Fundo Los Robles',
    crop: 'Carmenere',
    geometry_geojson: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.428, -33.328],
          [-71.415, -33.328],
          [-71.415, -33.320],
          [-71.428, -33.320],
          [-71.428, -33.328],
        ]],
      },
    },
    metadata: { hectares: 15.8 },
  },
  {
    name: 'Cuartel Este',
    farm_name: 'Fundo Los Robles',
    crop: 'Chardonnay',
    geometry_geojson: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.410, -33.325],
          [-71.402, -33.325],
          [-71.402, -33.318],
          [-71.410, -33.318],
          [-71.410, -33.325],
        ]],
      },
    },
    metadata: { hectares: 8.5 },
  },
  {
    name: 'Cuartel Ladera',
    farm_name: 'Fundo Las Viñas',
    crop: 'Syrah',
    geometry_geojson: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.438, -33.310],
          [-71.428, -33.310],
          [-71.428, -33.302],
          [-71.438, -33.302],
          [-71.438, -33.310],
        ]],
      },
    },
    metadata: { hectares: 18.3 },
  },
  {
    name: 'Cuartel Poniente',
    farm_name: 'Fundo Las Viñas',
    crop: 'Pinot Noir',
    geometry_geojson: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.448, -33.320],
          [-71.438, -33.320],
          [-71.438, -33.312],
          [-71.448, -33.312],
          [-71.448, -33.320],
        ]],
      },
    },
    metadata: { hectares: 14.1 },
  },
];

export const demoTractors: Omit<Tractor, 'id' | 'tenant_id' | 'created_at'>[] = [
  {
    name: 'Tractor Principal',
    identifier: 'T-001',
    metadata: { brand: 'John Deere', model: '6120M' },
    last_lat: -33.315,
    last_lon: -71.424,
    last_seen_at: new Date().toISOString(),
  },
  {
    name: 'Tractor Secundario',
    identifier: 'T-002',
    metadata: { brand: 'New Holland', model: 'T6.180' },
    last_lat: -33.322,
    last_lon: -71.420,
    last_seen_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

// Generate demo metrics with varied "time since last pass"
export function generateDemoMetrics(blockId: string, index: number): Omit<BlockMetrics, 'id'> {
  const hoursAgo = [2, 8, 24, 36, 72, 120][index % 6];
  const lastSeenAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  
  return {
    block_id: blockId,
    last_seen_at: lastSeenAt.toISOString(),
    last_tractor_id: null,
    total_passes: Math.floor(Math.random() * 50) + 10,
    passes_24h: hoursAgo < 24 ? Math.floor(Math.random() * 3) + 1 : 0,
    passes_7d: hoursAgo < 168 ? Math.floor(Math.random() * 8) + 2 : 0,
    updated_at: new Date().toISOString(),
  };
}

// Generate simulated GPS path through blocks
export function generateSimulatedPath(
  tractorId: string,
  tenantId: string,
  durationMinutes: number = 30
): Omit<GpsPing, 'id' | 'created_at'>[] {
  const pings: Omit<GpsPing, 'id' | 'created_at'>[] = [];
  const startTime = Date.now() - durationMinutes * 60 * 1000;
  
  // Create a path that goes through multiple blocks (updated for new coordinates)
  const waypoints = [
    { lat: -33.315, lon: -71.424 },
    { lat: -33.314, lon: -71.420 },
    { lat: -33.316, lon: -71.415 },
    { lat: -33.320, lon: -71.412 },
    { lat: -33.324, lon: -71.418 },
    { lat: -33.322, lon: -71.425 },
    { lat: -33.318, lon: -71.428 },
    { lat: -33.314, lon: -71.426 },
  ];
  
  const pingInterval = (durationMinutes * 60 * 1000) / (waypoints.length * 5);
  
  waypoints.forEach((wp, wpIndex) => {
    const nextWp = waypoints[(wpIndex + 1) % waypoints.length];
    
    for (let i = 0; i < 5; i++) {
      const progress = i / 5;
      const lat = wp.lat + (nextWp.lat - wp.lat) * progress;
      const lon = wp.lon + (nextWp.lon - wp.lon) * progress;
      const ts = new Date(startTime + (wpIndex * 5 + i) * pingInterval);
      
      pings.push({
        tenant_id: tenantId,
        tractor_id: tractorId,
        ts: ts.toISOString(),
        lat: lat + (Math.random() - 0.5) * 0.0002,
        lon: lon + (Math.random() - 0.5) * 0.0002,
        speed: 5 + Math.random() * 3,
      });
    }
  });
  
  return pings;
}

// Map center for demo data - Valle de Casablanca
export const DEMO_MAP_CENTER: [number, number] = [-33.318, -71.422];
export const DEMO_MAP_ZOOM = 14;
