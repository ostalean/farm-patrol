import { X, Clock, Calendar, Tractor, Bell, BellPlus, BellOff, CheckCircle, AlertTriangle, TrendingUp, Route, ChevronRight, Gauge, Target, MapPin, Download, FileText, FileSpreadsheet, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Block, BlockMetrics, BlockVisit, Alert, Tractor as TractorType, GpsPing, VisitCoverageStats } from '@/types/farm';
import { getBlockStatus, formatTimeSince, getAlertEffectiveStatus, type BlockStatus } from '@/types/farm';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useBlockVisitStats, formatDuration } from '@/hooks/useBlockVisitStats';
import { useReportExport } from '@/hooks/useReportExport';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { BlockMiniMap } from './BlockMiniMap';
import type { Feature, Polygon } from 'geojson';

interface BlockDetailProps {
  block: Block;
  metrics: BlockMetrics | null;
  visits: BlockVisit[];
  tractors: TractorType[];
  alerts: Alert[];
  onClose: () => void;
  onConfigureAlert: () => void;
  onToggleAlert: (alertId: string) => void;
  onDeleteAlert?: (alert: Alert) => void;
  onVisitSelect?: (visit: BlockVisit) => void;
  selectedVisitId?: string | null;
  visitPath?: GpsPing[];
  coverageStats?: VisitCoverageStats | null;
  onToggleMissedAreas?: () => void;
  showMissedAreas?: boolean;
  onEditBlock?: () => void;
  onDeleteBlock?: () => void;
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


// Visit timeline item with optional coverage stats
function VisitTimelineItem({ 
  visit, 
  tractor, 
  isSelected, 
  onClick,
  isFirst,
  isLast,
  coverageStats,
  onToggleMissedAreas,
  showMissedAreas,
}: { 
  visit: BlockVisit; 
  tractor: TractorType | undefined;
  isSelected: boolean;
  onClick: () => void;
  isFirst: boolean;
  isLast: boolean;
  coverageStats?: VisitCoverageStats | null;
  onToggleMissedAreas?: () => void;
  showMissedAreas?: boolean;
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
        
        {/* Coverage analysis - shown when selected */}
        {isSelected && coverageStats && (
          <div 
            className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="font-medium text-xs flex items-center gap-2 mb-2 text-primary">
              <Target className="w-3.5 h-3.5" />
              Análisis de cobertura
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground">Vel. promedio</div>
                <div className="font-semibold">{coverageStats.averageSpeed.toFixed(1)} km/h</div>
              </div>
              <div>
                <div className="text-muted-foreground">Vel. máxima</div>
                <div className="font-semibold">{coverageStats.maxSpeed.toFixed(1)} km/h</div>
              </div>
              <div>
                <div className="text-muted-foreground">Cobertura</div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">{coverageStats.coveragePercentage.toFixed(0)}%</span>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      'text-[10px] px-1.5 py-0',
                      coverageStats.coveragePercentage >= 90 && 'bg-success/10 text-success border-success/30',
                      coverageStats.coveragePercentage >= 70 && coverageStats.coveragePercentage < 90 && 'bg-warning/10 text-warning border-warning/30',
                      coverageStats.coveragePercentage < 70 && 'bg-destructive/10 text-destructive border-destructive/30'
                    )}
                  >
                    {coverageStats.coveragePercentage >= 90 ? 'Buena' : coverageStats.coveragePercentage >= 70 ? 'Regular' : 'Baja'}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Área cubierta</div>
                <div className="font-semibold">{coverageStats.coveredArea.toFixed(2)} ha</div>
              </div>
              <div>
                <div className="text-muted-foreground">Distancia</div>
                <div className="font-semibold">{(coverageStats.totalDistance / 1000).toFixed(2)} km</div>
              </div>
            </div>
            {coverageStats.missedAreas.length > 0 && onToggleMissedAreas && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-2 h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMissedAreas();
                }}
              >
                {showMissedAreas ? 'Ocultar áreas sin cubrir' : 'Ver áreas sin cubrir'}
              </Button>
            )}
          </div>
        )}
        
        {isSelected && !coverageStats && (
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
  onDeleteAlert,
  onVisitSelect,
  selectedVisitId,
  visitPath,
  coverageStats,
  onToggleMissedAreas,
  showMissedAreas,
  onEditBlock,
  onDeleteBlock,
}: BlockDetailProps) {
  const status = getBlockStatus(metrics);
  const tractorMap = new Map(tractors.map((t) => [t.id, t]));
  const visitStats = useBlockVisitStats(visits);
  const { exportToPDF, exportToCSV } = useReportExport();
  
  // Calculate hours since last visit
  const hoursSinceLastVisit = metrics?.last_seen_at
    ? Math.round((Date.now() - new Date(metrics.last_seen_at).getTime()) / (1000 * 60 * 60))
    : null;

  // Find selected visit for export
  const selectedVisit = selectedVisitId 
    ? visits.find(v => v.id === selectedVisitId) 
    : null;

  const handleExportPDF = () => {
    exportToPDF({
      block,
      metrics,
      visits,
      tractors,
      visitStats,
      selectedVisit,
      coverageStats,
    });
  };

  const handleExportCSV = () => {
    exportToCSV({
      block,
      metrics,
      visits,
      tractors,
      visitStats,
      selectedVisit,
      coverageStats,
    });
  };

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
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title="Más opciones">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="w-4 h-4 mr-2" />
                  Exportar como PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Exportar como CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onEditBlock}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar cuartel
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={onDeleteBlock}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar cuartel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
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
              <div className="text-xs text-muted-foreground">histórico total</div>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <TrendingUp className="w-3.5 h-3.5" />
                Promedio/mes
              </div>
              <div className="mt-1 text-xl font-display font-semibold">
                {visitStats.averagePassesPerMonth.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">último año</div>
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

          {/* Mini-map preview */}
          <div>
            <h3 className="font-medium text-sm flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4" />
              Vista del cuartel
            </h3>
            <BlockMiniMap 
              block={block} 
              visitPath={visitPath}
              missedAreas={showMissedAreas ? coverageStats?.missedAreas : undefined}
            />
          </div>

          <Separator />

          {/* Weekly bar chart - 3 months */}
          <div>
            <h3 className="font-medium text-sm flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4" />
              Pasadas últimos 3 meses
            </h3>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visitStats.weeklyPasses3m} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 9 }} 
                    axisLine={false}
                    tickLine={false}
                    interval={1}
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
                            <p className="font-medium">Semana del {data.weekStart}</p>
                            <p className="text-muted-foreground">{data.count} pasadas</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {visitStats.weeklyPasses3m.map((entry, index) => (
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
                {alerts.map((alert) => {
                  const alertDays = Math.round(alert.rule_hours / 24);
                  const effectiveStatus = getAlertEffectiveStatus(alert, metrics?.last_seen_at ?? null);
                  return (
                    <div
                      key={alert.id}
                      className={cn(
                        'p-3 rounded-lg border flex items-center justify-between',
                        effectiveStatus === 'triggered' && 'bg-destructive/5 border-destructive/30',
                        effectiveStatus === 'active' && 'bg-muted/50 border-border',
                        effectiveStatus === 'resolved' && 'bg-success/5 border-success/30 opacity-60'
                      )}
                    >
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          Sin pasada por {alertDays} {alertDays === 1 ? 'día' : 'días'}
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {alert.is_recurring ? 'Recurrente' : 'Una vez'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {effectiveStatus === 'triggered' && '⚠️ Alerta disparada'}
                          {effectiveStatus === 'active' && 'Monitoreando'}
                          {effectiveStatus === 'resolved' && 'Resuelta'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onToggleAlert(alert.id)}
                          title={effectiveStatus === 'active' ? 'Pausar alerta' : 'Reactivar alerta'}
                        >
                          {effectiveStatus === 'active' ? (
                            <BellOff className="w-4 h-4" />
                          ) : (
                            <Bell className="w-4 h-4" />
                          )}
                        </Button>
                        {onDeleteAlert && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteAlert(alert)}
                            title="Eliminar alerta"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                            coverageStats={selectedVisitId === visit.id ? coverageStats : undefined}
                            onToggleMissedAreas={selectedVisitId === visit.id ? onToggleMissedAreas : undefined}
                            showMissedAreas={selectedVisitId === visit.id ? showMissedAreas : undefined}
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
