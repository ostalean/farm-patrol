import { useState, useMemo } from 'react';
import { Search, AlertTriangle, Clock, CheckCircle, Filter, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Block, BlockMetrics, Alert } from '@/types/farm';
import { getBlockStatus, formatTimeSince, formatTimeSinceCompact, getAlertEffectiveStatus, type BlockStatus } from '@/types/farm';

interface BlockListProps {
  blocks: Block[];
  blockMetrics: Record<string, BlockMetrics>;
  alerts: Alert[];
  selectedBlockId: string | null;
  onBlockSelect: (block: Block) => void;
  onConfigureAlert: (block: Block) => void;
}

function StatusIcon({ status, className }: { status: BlockStatus; className?: string }) {
  switch (status) {
    case 'healthy':
      return <CheckCircle className={cn("w-4 h-4 text-success", className)} />;
    case 'warning':
      return <Clock className={cn("w-4 h-4 text-warning", className)} />;
    case 'critical':
      return <AlertTriangle className={cn("w-4 h-4 text-destructive", className)} />;
  }
}

export function BlockList({
  blocks,
  blockMetrics,
  alerts,
  selectedBlockId,
  onBlockSelect,
  onConfigureAlert,
}: BlockListProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'time'>('time');
  const [filterAlerts, setFilterAlerts] = useState(false);

  const alertsByBlock = useMemo(() => {
    const map: Record<string, Alert[]> = {};
    alerts.forEach((alert) => {
      if (!map[alert.block_id]) map[alert.block_id] = [];
      map[alert.block_id].push(alert);
    });
    return map;
  }, [alerts]);

  const sortedBlocks = useMemo(() => {
    let filtered = blocks.filter((block) => {
      const matchesSearch = block.name.toLowerCase().includes(search.toLowerCase()) ||
        block.farm_name?.toLowerCase().includes(search.toLowerCase()) ||
        block.crop?.toLowerCase().includes(search.toLowerCase());
      
      if (!matchesSearch) return false;
      
      // Filter by triggered alerts if enabled
      if (filterAlerts) {
        const blockAlerts = alertsByBlock[block.id] || [];
        const metrics = blockMetrics[block.id];
        const hasTriggeredAlert = blockAlerts.some(a =>
          getAlertEffectiveStatus(a, metrics?.last_seen_at ?? null) === 'triggered'
        );
        return hasTriggeredAlert;
      }
      
      return true;
    });

    if (sortBy === 'time') {
      filtered.sort((a, b) => {
        const metricsA = blockMetrics[a.id];
        const metricsB = blockMetrics[b.id];
        
        if (!metricsA?.last_seen_at && !metricsB?.last_seen_at) return 0;
        if (!metricsA?.last_seen_at) return -1;
        if (!metricsB?.last_seen_at) return 1;
        
        return new Date(metricsA.last_seen_at).getTime() - new Date(metricsB.last_seen_at).getTime();
      });
    } else {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [blocks, blockMetrics, search, sortBy, filterAlerts, alertsByBlock]);

  // Calculate effective triggered alerts based on metrics
  const triggeredAlerts = alerts.filter((alert) => {
    const metrics = blockMetrics[alert.block_id];
    return getAlertEffectiveStatus(alert, metrics?.last_seen_at ?? null) === 'triggered';
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display font-semibold text-lg">Cuarteles</h2>
          {triggeredAlerts.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {triggeredAlerts.length} alertas
            </Badge>
          )}
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cuartel, fundo o cultivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={filterAlerts ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => setFilterAlerts(!filterAlerts)}
            className="relative"
            title="Filtrar cuarteles con alertas"
          >
            <Bell className="w-3 h-3" />
            {filterAlerts && triggeredAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center border border-background">
                {triggeredAlerts.length}
              </span>
            )}
          </Button>
          <Button
            variant={sortBy === 'time' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('time')}
            className="flex-1"
          >
            <Clock className="w-3 h-3 mr-1" />
            Más antiguo
          </Button>
          <Button
            variant={sortBy === 'name' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('name')}
          >
            A-Z
          </Button>
        </div>
      </div>

      {/* Block list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sortedBlocks.map((block) => {
            const metrics = blockMetrics[block.id];
            const status = getBlockStatus(metrics);
            const blockAlerts = alertsByBlock[block.id] || [];
            const hasTriggeredAlert = blockAlerts.some((a) => 
              getAlertEffectiveStatus(a, metrics?.last_seen_at ?? null) === 'triggered'
            );
            const isSelected = block.id === selectedBlockId;

            return (
              <button
                key={block.id}
                onClick={() => onBlockSelect(block)}
                className={cn(
                  'w-full text-left p-3 rounded-lg transition-all',
                  'hover:bg-muted/80',
                  isSelected && 'bg-primary/10 border border-primary/30',
                  !isSelected && 'border border-transparent'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <StatusIcon status={status} className="shrink-0" />
                  
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-medium truncate">{block.name}</span>
                      {hasTriggeredAlert && (
                        <Bell className="w-3 h-3 text-destructive animate-pulse shrink-0" />
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground truncate">
                      {block.farm_name}{block.farm_name && block.crop && ' • '}{block.crop}
                    </p>
                  </div>
                  
                  <div 
                    className="text-right shrink-0 w-14"
                    title={formatTimeSince(metrics?.last_seen_at ?? null)}
                  >
                    <div className={cn(
                      'text-sm font-medium',
                      status === 'healthy' && 'text-success',
                      status === 'warning' && 'text-warning',
                      status === 'critical' && 'text-destructive'
                    )}>
                      {formatTimeSinceCompact(metrics?.last_seen_at ?? null)}
                    </div>
                    {metrics && (
                      <div className="text-xs text-muted-foreground">
                        {metrics.passes_24h} hoy
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          
          {sortedBlocks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No se encontraron cuarteles</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
