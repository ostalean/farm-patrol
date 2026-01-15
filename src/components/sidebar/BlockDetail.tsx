import { X, Clock, Calendar, Tractor, Bell, BellPlus, BellOff, CheckCircle, AlertTriangle, TrendingUp, Route, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Block, BlockMetrics, BlockVisit, Alert, Tractor as TractorType } from '@/types/farm';
import { getBlockStatus, formatTimeSince, type BlockStatus } from '@/types/farm';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useBlockVisitStats, formatDuration } from '@/hooks/useBlockVisitStats';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

interface BlockDetailProps {
  block: Block;
  metrics: BlockMetrics | null;
  visits: BlockVisit[];
  tractors: TractorType[];
  alerts: Alert[];
  onClose: () => void;
  onConfigureAlert: () => void;
  onToggleAlert: (alertId: string) => void;
  onVisitSelect?: (visit: BlockVisit) => void;
  selectedVisitId?: string | null;
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

// Activity heatmap for last 30 days
function ActivityHeatmap({ dailyData }: { dailyData: Array<{ date: string; count: number }> }) {
  const getIntensity = (count: number) => {
    if (count === 0) return 'bg-muted';
    if (count === 1) return 'bg-success/30';
    if (count <= 3) return 'bg-success/50';
    return 'bg-success/80';
  };

  // Split into weeks (7 days per row)
  const weeks: typeof dailyData[] = [];
  for (let i = 0; i < dailyData.length; i += 7) {
    weeks.push(dailyData.slice(i, i + 7));
  }

  return (
    <div className="space-y-1">
      {weeks.map((week, weekIdx) => (
        <div key={weekIdx} className="flex gap-1">
          {week.map((day) => (
            <div
              key={day.date}
              className={cn(
                'w-3 h-3 rounded-sm cursor-default',
                getIntensity(day.count)
              )}
              title={`${day.date}: ${day.count} pasadas`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Visit timeline item
function VisitTimelineItem({ 
  visit, 
  tractor, 
  isSelected, 
  onClick,
  isFirst,
  isLast 
}: { 
  visit: BlockVisit; 
  tractor: TractorType | undefined;
  isSelected: boolean;
  onClick: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const duration = visit.ended_at 
    ? (new Date(visit.ended_at).getTime() - new Date(visit.started_at).getTime()) / (1000 * 60)
    : null;

  return (
    <div 
      className={cn(
        'relative flex gap-3 cursor-pointer transition-colors group',
        isSelected && 'bg-primary/5'
      )}
      onClick={onClick}
    >
      {/* Timeline line and dot */}
      <div className="flex flex-col items-center">
        <div className={cn(
          'w-0.5 flex-1',
          isFirst ? 'bg-transparent' : 'bg-border'
        )} />
        <div className={cn(
          'w-2.5 h-2.5 rounded-full border-2 shrink-0',
          isSelected 
            ? 'bg-primary border-primary' 
            : 'bg-background border-primary/60 group-hover:border-primary'
        )} />
        <div className={cn(
          'w-0.5 flex-1',
          isLast ? 'bg-transparent' : 'bg-border'
        )} />
      </div>

      {/* Content */}
      <div className={cn(
        'flex-1 py-2 pr-2 rounded-r-lg transition-colors',
        'hover:bg-muted/50',
        isSelected && 'bg-primary/5 hover:bg-primary/10'
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tractor className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-medium text-sm">
              {tractor?.name ?? 'Tractor desconocido'}
            </span>
          </div>
          <ChevronRight className={cn(
            'w-4 h-4 text-muted-foreground transition-transform',
            isSelected && 'text-primary rotate-90'
          )} />
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span>{format(new Date(visit.started_at), "d MMM, HH:mm", { locale: es })}</span>
          {duration !== null && (
            <>
              <span>•</span>
              <span>{formatDuration(duration)}</span>
            </>
          )}
          <span>•</span>
          <span>{visit.ping_count} pings</span>
        </div>
        {isSelected && (
          <div className="mt-2 flex items-center gap-1 text-xs text-primary">
            <Route className="w-3 h-3" />
            <span>Ver recorrido en mapa</span>
          </div>
        )}
      </div>
    </div>
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
  onVisitSelect,
  selectedVisitId,
}: BlockDetailProps) {
  const status = getBlockStatus(metrics);
  const tractorMap = new Map(tractors.map((t) => [t.id, t]));
  const visitStats = useBlockVisitStats(visits);
  
  // Calculate hours since last visit
  const hoursSinceLastVisit = metrics?.last_seen_at
    ? Math.round((Date.now() - new Date(metrics.last_seen_at).getTime()) / (1000 * 60 * 60))
    : null;

  // Group visits by date
  const visitsByDate = visits.reduce((acc, visit) => {
    const dateKey = format(new Date(visit.started_at), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(visit);
    return acc;
  }, {} as Record<string, BlockVisit[]>);

  const sortedDates = Object.keys(visitsByDate).sort((a, b) => b.localeCompare(a));

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
          {/* Quick stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Clock className="w-3.5 h-3.5" />
                Última pasada
              </div>
              <div className={cn(
                'mt-1 text-xl font-display font-semibold',
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
            
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Calendar className="w-3.5 h-3.5" />
                Total pasadas
              </div>
              <div className="mt-1 text-xl font-display font-semibold">
                {metrics?.total_passes ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">
                {metrics?.passes_24h ?? 0} hoy • {metrics?.passes_7d ?? 0} esta semana
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <TrendingUp className="w-3.5 h-3.5" />
                Promedio/día
              </div>
              <div className="mt-1 text-xl font-display font-semibold">
                {visitStats.averagePassesPerDay.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">últimos 7 días</div>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Route className="w-3.5 h-3.5" />
                Duración prom.
              </div>
              <div className="mt-1 text-xl font-display font-semibold">
                {formatDuration(visitStats.averageDuration)}
              </div>
              <div className="text-xs text-muted-foreground">por pasada</div>
            </div>
          </div>

          <Separator />

          {/* Weekly bar chart */}
          <div>
            <h3 className="font-medium text-sm flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4" />
              Pasadas últimos 7 días
            </h3>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visitStats.dailyPasses7d} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 10 }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg px-3 py-2 text-sm">
                            <p className="font-medium">{data.date}</p>
                            <p className="text-muted-foreground">{data.count} pasadas</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {visitStats.dailyPasses7d.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.count > 0 ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground) / 0.3)'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity heatmap */}
          <div>
            <h3 className="font-medium text-sm flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4" />
              Actividad últimos 30 días
            </h3>
            <ActivityHeatmap dailyData={visitStats.dailyPasses30d} />
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>Menos</span>
              <div className="flex gap-0.5">
                <div className="w-3 h-3 rounded-sm bg-muted" />
                <div className="w-3 h-3 rounded-sm bg-success/30" />
                <div className="w-3 h-3 rounded-sm bg-success/50" />
                <div className="w-3 h-3 rounded-sm bg-success/80" />
              </div>
              <span>Más</span>
            </div>
          </div>

          <Separator />

          {/* Alerts section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm flex items-center gap-2">
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

          {/* Visit timeline */}
          <div>
            <h3 className="font-medium text-sm flex items-center gap-2 mb-3">
              <Route className="w-4 h-4" />
              Historial de pasadas
              {onVisitSelect && (
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  (click para ver recorrido)
                </span>
              )}
            </h3>
            
            {visits.length > 0 ? (
              <div className="space-y-4">
                {sortedDates.slice(0, 5).map((dateKey) => {
                  const dayVisits = visitsByDate[dateKey];
                  const dateLabel = format(new Date(dateKey), "EEEE d 'de' MMMM", { locale: es });
                  
                  return (
                    <div key={dateKey}>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 pl-5">
                        {dateLabel}
                      </div>
                      <div>
                        {dayVisits.map((visit, idx) => (
                          <VisitTimelineItem
                            key={visit.id}
                            visit={visit}
                            tractor={tractorMap.get(visit.tractor_id)}
                            isSelected={selectedVisitId === visit.id}
                            onClick={() => onVisitSelect?.(visit)}
                            isFirst={idx === 0}
                            isLast={idx === dayVisits.length - 1}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                
                {sortedDates.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    +{sortedDates.length - 5} días anteriores
                  </p>
                )}
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
