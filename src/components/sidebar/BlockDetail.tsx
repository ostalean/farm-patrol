import { X, Clock, Calendar, Tractor, Bell, BellPlus, BellOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Block, BlockMetrics, BlockVisit, Alert, Tractor as TractorType } from '@/types/farm';
import { getBlockStatus, formatTimeSince, type BlockStatus } from '@/types/farm';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BlockDetailProps {
  block: Block;
  metrics: BlockMetrics | null;
  visits: BlockVisit[];
  tractors: TractorType[];
  alerts: Alert[];
  onClose: () => void;
  onConfigureAlert: () => void;
  onToggleAlert: (alertId: string) => void;
}

function StatusBadge({ status }: { status: BlockStatus }) {
  const config = {
    healthy: { label: 'Al día', className: 'bg-success/10 text-success border-success/30' },
    warning: { label: 'Atención', className: 'bg-warning/10 text-warning border-warning/30' },
    critical: { label: 'Crítico', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  };

  const { label, className } = config[status];

  return (
    <Badge variant="outline" className={className}>
      {status === 'healthy' && <CheckCircle className="w-3 h-3 mr-1" />}
      {status === 'warning' && <Clock className="w-3 h-3 mr-1" />}
      {status === 'critical' && <AlertTriangle className="w-3 h-3 mr-1" />}
      {label}
    </Badge>
  );
}

export function BlockDetail({
  block,
  metrics,
  visits,
  tractors,
  alerts,
  onClose,
  onConfigureAlert,
  onToggleAlert,
}: BlockDetailProps) {
  const status = getBlockStatus(metrics);
  const tractorMap = new Map(tractors.map((t) => [t.id, t]));
  
  // Calculate hours since last visit
  const hoursSinceLastVisit = metrics?.last_seen_at
    ? Math.round((Date.now() - new Date(metrics.last_seen_at).getTime()) / (1000 * 60 * 60))
    : null;

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display font-semibold text-xl">{block.name}</h2>
            <p className="text-muted-foreground text-sm">
              {block.farm_name}
              {block.crop && ` • ${block.crop}`}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="mt-3 flex items-center gap-2">
          <StatusBadge status={status} />
          {(block.metadata as any)?.hectares && (
            <Badge variant="secondary">
              {(block.metadata as any).hectares} ha
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Last visit info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Clock className="w-4 h-4" />
                Última pasada
              </div>
              <div className={cn(
                'mt-1 text-2xl font-display font-semibold',
                status === 'healthy' && 'text-success',
                status === 'warning' && 'text-warning',
                status === 'critical' && 'text-destructive'
              )}>
                {hoursSinceLastVisit !== null ? (
                  hoursSinceLastVisit < 24 ? `${hoursSinceLastVisit}h` : `${Math.round(hoursSinceLastVisit / 24)}d`
                ) : (
                  '—'
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {metrics?.last_seen_at
                  ? format(new Date(metrics.last_seen_at), "d MMM, HH:mm", { locale: es })
                  : 'Sin registro'}
              </div>
            </div>
            
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Calendar className="w-4 h-4" />
                Total pasadas
              </div>
              <div className="mt-1 text-2xl font-display font-semibold">
                {metrics?.total_passes ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">
                {metrics?.passes_24h ?? 0} hoy • {metrics?.passes_7d ?? 0} esta semana
              </div>
            </div>
          </div>

          <Separator />

          {/* Alerts section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Alertas
              </h3>
              <Button variant="outline" size="sm" onClick={onConfigureAlert}>
                <BellPlus className="w-3 h-3 mr-1" />
                Nueva
              </Button>
            </div>
            
            {alerts.length > 0 ? (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      'p-3 rounded-lg border flex items-center justify-between',
                      alert.status === 'triggered' && 'bg-destructive/5 border-destructive/30',
                      alert.status === 'active' && 'bg-muted/50 border-border',
                      alert.status === 'resolved' && 'bg-success/5 border-success/30 opacity-60'
                    )}
                  >
                    <div>
                      <div className="font-medium text-sm">
                        Sin pasada por {alert.rule_hours}h
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {alert.status === 'triggered' && 'Alerta activa'}
                        {alert.status === 'active' && 'Monitoreando'}
                        {alert.status === 'resolved' && 'Resuelta'}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleAlert(alert.id)}
                    >
                      {alert.status === 'active' ? (
                        <BellOff className="w-4 h-4" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Sin alertas configuradas
              </div>
            )}
          </div>

          <Separator />

          {/* Recent visits */}
          <div>
            <h3 className="font-medium flex items-center gap-2 mb-3">
              <Tractor className="w-4 h-4" />
              Últimas pasadas
            </h3>
            
            {visits.length > 0 ? (
              <div className="space-y-2">
                {visits.slice(0, 10).map((visit) => {
                  const tractor = tractorMap.get(visit.tractor_id);
                  return (
                    <div
                      key={visit.id}
                      className="p-3 bg-muted/50 rounded-lg text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {tractor?.name ?? 'Tractor desconocido'}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {visit.ping_count} pings
                        </span>
                      </div>
                      <div className="text-muted-foreground text-xs mt-1">
                        {format(new Date(visit.started_at), "d MMM HH:mm", { locale: es })}
                        {visit.ended_at && (
                          <> → {format(new Date(visit.ended_at), "HH:mm", { locale: es })}</>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Sin pasadas registradas
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
