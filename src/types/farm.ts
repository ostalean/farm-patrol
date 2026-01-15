import type { Feature, Polygon } from 'geojson';

export interface Tenant {
  id: string;
  name: string;
  created_at: string;
}

export interface Tractor {
  id: string;
  tenant_id: string;
  name: string;
  identifier: string;
  metadata: Record<string, unknown>;
  last_lat: number | null;
  last_lon: number | null;
  last_seen_at: string | null;
  created_at: string;
}

export interface Block {
  id: string;
  tenant_id: string;
  name: string;
  farm_name: string | null;
  crop: string | null;
  geometry_geojson: Feature<Polygon>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GpsPing {
  id: string;
  tenant_id: string;
  tractor_id: string;
  ts: string;
  lat: number;
  lon: number;
  speed: number | null;
  created_at: string;
}

export interface BlockVisit {
  id: string;
  tenant_id: string;
  block_id: string;
  tractor_id: string;
  started_at: string;
  ended_at: string | null;
  ping_count: number;
  created_at: string;
}

export interface BlockMetrics {
  id: string;
  block_id: string;
  last_seen_at: string | null;
  last_tractor_id: string | null;
  total_passes: number;
  passes_24h: number;
  passes_7d: number;
  updated_at: string;
}

export type AlertStatus = 'active' | 'triggered' | 'resolved';

export interface Alert {
  id: string;
  tenant_id: string;
  block_id: string;
  rule_hours: number;
  is_recurring: boolean;
  status: AlertStatus;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

// Extended types with relations
export interface BlockWithMetrics extends Block {
  metrics: BlockMetrics | null;
  alerts: Alert[];
}

export interface TractorWithPings extends Tractor {
  recent_pings: GpsPing[];
}

export interface VisitWithPath extends BlockVisit {
  pings: GpsPing[];
}

export interface VisitCoverageStats {
  averageSpeed: number;        // km/h
  maxSpeed: number;            // km/h
  coveragePercentage: number;  // 0-100
  coveredArea: number;         // hectares
  totalDistance: number;       // meters
  missedAreas: Feature<Polygon>[];
}

// Helper type for block status calculation
export type BlockStatus = 'healthy' | 'warning' | 'critical';

export function getBlockStatus(metrics: BlockMetrics | null, alertHours = 48): BlockStatus {
  if (!metrics?.last_seen_at) return 'critical';
  
  const hoursSinceLastVisit = 
    (Date.now() - new Date(metrics.last_seen_at).getTime()) / (1000 * 60 * 60);
  
  if (hoursSinceLastVisit > alertHours) return 'critical';
  if (hoursSinceLastVisit > alertHours * 0.5) return 'warning';
  return 'healthy';
}

export function formatTimeSince(date: string | null): string {
  if (!date) return 'Sin pasadas';
  
  const hours = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
  
  if (hours < 1) return `Hace ${Math.round(hours * 60)} min`;
  if (hours < 24) return `Hace ${Math.round(hours)} h`;
  if (hours < 48) return 'Hace 1 día';
  return `Hace ${Math.round(hours / 24)} días`;
}

export function formatTimeSinceCompact(date: string | null): string {
  if (!date) return '—';
  
  const hours = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
  
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}
