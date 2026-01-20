import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Trash2, CheckSquare, Square, ChevronDown, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Alert, Block } from '@/types/farm';

interface ManageAlertsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alerts: Alert[];
  blocks: Block[];
  onDeleteAlerts: (ids: string[]) => void;
  isDeleting?: boolean;
}

interface ContentProps {
  alerts: Alert[];
  blocks: Block[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSelectBlock: (blockAlerts: Alert[]) => void;
  onSelectFarm: (farmAlerts: Alert[]) => void;
}

function AlertsContent({
  alerts,
  blocks,
  selectedIds,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onSelectBlock,
  onSelectFarm,
}: ContentProps) {
  const [expandedFarms, setExpandedFarms] = useState<Set<string>>(new Set(['Sin fundo']));

  // Group alerts by farm, then by block
  const alertsByFarm = useMemo(() => {
    const farmMap = new Map<string, { blocks: Map<string, { block: Block | undefined; alerts: Alert[] }>; totalAlerts: number }>();
    
    alerts.forEach((alert) => {
      const block = blocks.find((b) => b.id === alert.block_id);
      const farmName = block?.farm_name || 'Sin fundo';
      const blockId = alert.block_id;
      
      if (!farmMap.has(farmName)) {
        farmMap.set(farmName, { blocks: new Map(), totalAlerts: 0 });
      }
      
      const farmData = farmMap.get(farmName)!;
      farmData.totalAlerts++;
      
      if (!farmData.blocks.has(blockId)) {
        farmData.blocks.set(blockId, { block, alerts: [] });
      }
      farmData.blocks.get(blockId)!.alerts.push(alert);
    });
    
    // Sort farms alphabetically, with "Sin fundo" at the end
    return Array.from(farmMap.entries()).sort((a, b) => {
      if (a[0] === 'Sin fundo') return 1;
      if (b[0] === 'Sin fundo') return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [alerts, blocks]);

  const formatDays = (hours: number) => {
    const days = Math.round(hours / 24);
    return days === 1 ? '1 día' : `${days} días`;
  };

  const toggleFarmExpanded = (farmName: string) => {
    setExpandedFarms((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(farmName)) {
        newSet.delete(farmName);
      } else {
        newSet.add(farmName);
      }
      return newSet;
    });
  };

  if (alerts.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No hay alertas configuradas
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-2 mb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSelectAll}
          className="gap-1"
        >
          <CheckSquare className="w-4 h-4" />
          Todas
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDeselectAll}
          className="gap-1"
        >
          <Square className="w-4 h-4" />
          Ninguna
        </Button>
      </div>

      <div className="space-y-2">
        {alertsByFarm.map(([farmName, { blocks: farmBlocks, totalAlerts }]) => {
          const farmAlerts = Array.from(farmBlocks.values()).flatMap((b) => b.alerts);
          const allFarmSelected = farmAlerts.every((a) => selectedIds.has(a.id));
          const someFarmSelected = farmAlerts.some((a) => selectedIds.has(a.id));
          const selectedInFarm = farmAlerts.filter((a) => selectedIds.has(a.id)).length;
          const isExpanded = expandedFarms.has(farmName);

          return (
            <Collapsible
              key={farmName}
              open={isExpanded}
              onOpenChange={() => toggleFarmExpanded(farmName)}
            >
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted">
                <Checkbox
                  checked={allFarmSelected}
                  className={someFarmSelected && !allFarmSelected ? 'opacity-50' : ''}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectFarm(farmAlerts);
                  }}
                />
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-2 flex-1 cursor-pointer min-w-0">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="font-medium text-sm truncate">{farmName}</span>
                    <Badge variant="secondary" className="text-xs shrink-0 ml-auto">
                      {selectedInFarm > 0 ? `${selectedInFarm}/` : ''}{totalAlerts}
                    </Badge>
                  </div>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent>
                <div className="ml-4 mt-1 space-y-2 border-l-2 border-muted pl-2">
                  {Array.from(farmBlocks.entries())
                    .sort((a, b) => {
                      const nameA = a[1].block?.name || 'Sin nombre';
                      const nameB = b[1].block?.name || 'Sin nombre';
                      return nameA.localeCompare(nameB);
                    })
                    .map(([blockId, { block, alerts: blockAlerts }]) => {
                      const allBlockSelected = blockAlerts.every((a) => selectedIds.has(a.id));
                      const someBlockSelected = blockAlerts.some((a) => selectedIds.has(a.id));

                      return (
                        <div key={blockId} className="space-y-1">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                            onClick={() => onSelectBlock(blockAlerts)}
                          >
                            <Checkbox
                              checked={allBlockSelected}
                              className={someBlockSelected && !allBlockSelected ? 'opacity-50' : ''}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm truncate">
                                {block?.name || 'Cuartel eliminado'}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {blockAlerts.length}
                            </Badge>
                          </div>

                          <div className="ml-6 space-y-1">
                            {blockAlerts.map((alert) => (
                              <div
                                key={alert.id}
                                className="flex items-center gap-2 text-sm p-2 rounded hover:bg-muted/50 cursor-pointer"
                                onClick={() => onToggle(alert.id)}
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
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {selectedIds.size > 0 && (
        <div className="text-sm text-muted-foreground mt-4">
          {selectedIds.size} {selectedIds.size === 1 ? 'alerta seleccionada' : 'alertas seleccionadas'}
        </div>
      )}
    </>
  );
}

export function ManageAlertsDialog({
  open,
  onOpenChange,
  alerts,
  blocks,
  onDeleteAlerts,
  isDeleting = false,
}: ManageAlertsDialogProps) {
  const isMobile = useIsMobile();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const handleSelectFarm = (farmAlerts: Alert[]) => {
    const newSet = new Set(selectedIds);
    const allSelected = farmAlerts.every((a) => selectedIds.has(a.id));
    
    if (allSelected) {
      farmAlerts.forEach((a) => newSet.delete(a.id));
    } else {
      farmAlerts.forEach((a) => newSet.add(a.id));
    }
    setSelectedIds(newSet);
  };

  const handleDelete = () => {
    if (selectedIds.size > 0) {
      onDeleteAlerts(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const footerButtons = (
    <>
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
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Gestionar Alertas</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1 px-4 overflow-y-auto">
            <AlertsContent
              alerts={alerts}
              blocks={blocks}
              selectedIds={selectedIds}
              onToggle={handleToggle}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onSelectBlock={handleSelectBlock}
              onSelectFarm={handleSelectFarm}
            />
          </ScrollArea>
          <DrawerFooter className="flex-row gap-2">
            {footerButtons}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestionar Alertas</DialogTitle>
        </DialogHeader>

        <AlertsContent
          alerts={alerts}
          blocks={blocks}
          selectedIds={selectedIds}
          onToggle={handleToggle}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onSelectBlock={handleSelectBlock}
          onSelectFarm={handleSelectFarm}
        />

        <DialogFooter>
          {footerButtons}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
