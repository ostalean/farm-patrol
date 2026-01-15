import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, CheckSquare, Square } from 'lucide-react';
import type { Alert, Block } from '@/types/farm';

interface ManageAlertsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alerts: Alert[];
  blocks: Block[];
  onDeleteAlerts: (ids: string[]) => void;
  isDeleting?: boolean;
}

export function ManageAlertsDialog({
  open,
  onOpenChange,
  alerts,
  blocks,
  onDeleteAlerts,
  isDeleting = false,
}: ManageAlertsDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Group alerts by block for easier visualization
  const alertsByBlock = useMemo(() => {
    const grouped = new Map<string, { block: Block | undefined; alerts: Alert[] }>();
    
    alerts.forEach((alert) => {
      const block = blocks.find((b) => b.id === alert.block_id);
      const key = alert.block_id;
      
      if (!grouped.has(key)) {
        grouped.set(key, { block, alerts: [] });
      }
      grouped.get(key)!.alerts.push(alert);
    });
    
    return Array.from(grouped.entries()).sort((a, b) => {
      const nameA = a[1].block?.name || 'Sin nombre';
      const nameB = b[1].block?.name || 'Sin nombre';
      return nameA.localeCompare(nameB);
    });
  }, [alerts, blocks]);

  const handleSelectAll = () => {
    setSelectedIds(new Set(alerts.map((a) => a.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleToggle = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleSelectBlock = (blockAlerts: Alert[]) => {
    const newSet = new Set(selectedIds);
    const allSelected = blockAlerts.every((a) => selectedIds.has(a.id));
    
    if (allSelected) {
      blockAlerts.forEach((a) => newSet.delete(a.id));
    } else {
      blockAlerts.forEach((a) => newSet.add(a.id));
    }
    setSelectedIds(newSet);
  };

  const handleDelete = () => {
    if (selectedIds.size > 0) {
      onDeleteAlerts(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const formatDays = (hours: number) => {
    const days = Math.round(hours / 24);
    return days === 1 ? '1 día' : `${days} días`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gestionar Alertas</DialogTitle>
        </DialogHeader>

        {alerts.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No hay alertas configuradas
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="gap-1"
              >
                <CheckSquare className="w-4 h-4" />
                Todas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                className="gap-1"
              >
                <Square className="w-4 h-4" />
                Ninguna
              </Button>
            </div>

            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-4">
                {alertsByBlock.map(([blockId, { block, alerts: blockAlerts }]) => {
                  const allBlockSelected = blockAlerts.every((a) => selectedIds.has(a.id));
                  const someBlockSelected = blockAlerts.some((a) => selectedIds.has(a.id));
                  
                  return (
                    <div key={blockId} className="space-y-2">
                      <div 
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                        onClick={() => handleSelectBlock(blockAlerts)}
                      >
                        <Checkbox
                          checked={allBlockSelected}
                          className={someBlockSelected && !allBlockSelected ? 'opacity-50' : ''}
                        />
                        <span className="font-medium text-sm">
                          {block?.name || 'Cuartel eliminado'}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {blockAlerts.length} {blockAlerts.length === 1 ? 'alerta' : 'alertas'}
                        </Badge>
                      </div>
                      
                      <div className="ml-6 space-y-1">
                        {blockAlerts.map((alert) => (
                          <div
                            key={alert.id}
                            className="flex items-center gap-2 text-sm p-2 rounded hover:bg-muted/50 cursor-pointer"
                            onClick={() => handleToggle(alert.id)}
                          >
                            <Checkbox checked={selectedIds.has(alert.id)} />
                            <span className="text-muted-foreground">
                              Sin pasada {formatDays(alert.rule_hours)}
                            </span>
                            <Badge 
                              variant={alert.is_recurring ? 'default' : 'outline'}
                              className="text-xs"
                            >
                              {alert.is_recurring ? 'Recurrente' : 'Una vez'}
                            </Badge>
                            {alert.status === 'triggered' && (
                              <Badge variant="destructive" className="text-xs">
                                Disparada
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {selectedIds.size > 0 && (
              <div className="text-sm text-muted-foreground">
                {selectedIds.size} {selectedIds.size === 1 ? 'alerta seleccionada' : 'alertas seleccionadas'}
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={selectedIds.size === 0 || isDeleting}
            className="gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
