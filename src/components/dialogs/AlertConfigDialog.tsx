import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, RefreshCw, BellDot, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Block } from '@/types/farm';

interface AlertConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: Block | null; // Single block (when opened from block detail)
  blocks?: Block[]; // All blocks (for multi-select mode)
  onSave: (blockIds: string[], ruleHours: number, isRecurring: boolean) => void;
}

const presetDays = [1, 2, 3, 7];

export function AlertConfigDialog({
  open,
  onOpenChange,
  block,
  blocks = [],
  onSave,
}: AlertConfigDialogProps) {
  const [ruleDays, setRuleDays] = useState(2);
  const [customDaysInput, setCustomDaysInput] = useState('2');
  const [isRecurring, setIsRecurring] = useState(true);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [isMultiMode, setIsMultiMode] = useState(false);

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setRuleDays(2);
      setCustomDaysInput('2');
      if (block) {
        // Single block mode - pre-select it
        setSelectedBlockIds(new Set([block.id]));
        setIsMultiMode(false);
      } else {
        // Multi-select mode
        setSelectedBlockIds(new Set());
        setIsMultiMode(true);
      }
    }
  }, [open, block]);

  // Sync custom input when ruleDays changes from presets
  const handlePresetClick = (days: number) => {
    setRuleDays(days);
    setCustomDaysInput(days.toString());
  };

  const handleCustomDaysBlur = () => {
    const parsed = parseInt(customDaysInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 30) {
      setRuleDays(parsed);
    } else {
      // Reset to current valid value
      setCustomDaysInput(ruleDays.toString());
    }
  };

  const handleToggleBlock = (blockId: string) => {
    setSelectedBlockIds(prev => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedBlockIds.size === blocks.length) {
      setSelectedBlockIds(new Set());
    } else {
      setSelectedBlockIds(new Set(blocks.map(b => b.id)));
    }
  };

  const handleSave = () => {
    if (selectedBlockIds.size > 0) {
      onSave(Array.from(selectedBlockIds), ruleDays * 24, isRecurring);
      onOpenChange(false);
    }
  };

  const selectedCount = selectedBlockIds.size;
  const availableBlocks = isMultiMode ? blocks : (block ? [block] : []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Configurar Alerta
          </DialogTitle>
          <DialogDescription>
            {isMultiMode
              ? 'Selecciona los cuarteles y configura la alerta para todos.'
              : block
                ? `Crear una alerta para "${block.name}" cuando no haya pasadas por el tiempo especificado.`
                : 'Selecciona cuarteles para configurar la alerta.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Block selector (multi-mode or expandable) */}
          {isMultiMode && blocks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Cuarteles ({selectedCount} seleccionados)
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-7 text-xs"
                >
                  {selectedBlockIds.size === blocks.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </Button>
              </div>
              <ScrollArea className="h-40 rounded-md border p-2">
                <div className="space-y-1">
                  {blocks.map((b) => (
                    <label
                      key={b.id}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors',
                        selectedBlockIds.has(b.id) 
                          ? 'bg-primary/10' 
                          : 'hover:bg-muted'
                      )}
                    >
                      <Checkbox
                        checked={selectedBlockIds.has(b.id)}
                        onCheckedChange={() => handleToggleBlock(b.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{b.name}</div>
                        {b.farm_name && (
                          <div className="text-xs text-muted-foreground truncate">{b.farm_name}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Single block mode - option to add more */}
          {!isMultiMode && block && blocks.length > 1 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMultiMode(true)}
              className="w-full"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Agregar más cuarteles
            </Button>
          )}

          {/* Alert type selector */}
          <div className="space-y-2">
            <Label>Tipo de alerta:</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={isRecurring ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsRecurring(true)}
                className="justify-start"
              >
                <RefreshCw className={cn('w-4 h-4 mr-2', isRecurring && 'text-primary-foreground')} />
                Recurrente
              </Button>
              <Button
                type="button"
                variant={!isRecurring ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsRecurring(false)}
                className="justify-start"
              >
                <BellDot className={cn('w-4 h-4 mr-2', !isRecurring && 'text-primary-foreground')} />
                Una sola vez
              </Button>
            </div>
          </div>

          {/* Day presets */}
          <div className="space-y-2">
            <Label>Alertar si no hay pasada en:</Label>
            
            <div className="grid grid-cols-4 gap-2">
              {presetDays.map((days) => (
                <Button
                  key={days}
                  variant={ruleDays === days ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePresetClick(days)}
                >
                  {days}d
                </Button>
              ))}
            </div>
          </div>

          {/* Custom days input */}
          <div className="space-y-2">
            <Label htmlFor="custom-days">O especificar días:</Label>
            <Input
              id="custom-days"
              type="number"
              min={1}
              max={30}
              value={customDaysInput}
              onChange={(e) => setCustomDaysInput(e.target.value)}
              onBlur={handleCustomDaysBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCustomDaysBlur();
                }
              }}
            />
          </div>

          {/* Summary */}
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="text-muted-foreground">
              {selectedCount === 0 ? (
                'Selecciona al menos un cuartel para crear la alerta.'
              ) : selectedCount === 1 ? (
                isRecurring ? (
                  <>
                    Se activará <strong>cada vez</strong> que el cuartel seleccionado{' '}
                    no reciba una pasada en <strong>{ruleDays} {ruleDays === 1 ? 'día' : 'días'}</strong>.
                  </>
                ) : (
                  <>
                    Se activará <strong>una sola vez</strong> cuando el cuartel seleccionado{' '}
                    no reciba una pasada en <strong>{ruleDays} {ruleDays === 1 ? 'día' : 'días'}</strong>.
                  </>
                )
              ) : (
                isRecurring ? (
                  <>
                    Se crearán <strong>{selectedCount} alertas</strong> que se activarán{' '}
                    <strong>cada vez</strong> que un cuartel no reciba pasada en{' '}
                    <strong>{ruleDays} {ruleDays === 1 ? 'día' : 'días'}</strong>.
                  </>
                ) : (
                  <>
                    Se crearán <strong>{selectedCount} alertas</strong> que se activarán{' '}
                    <strong>una sola vez</strong> cuando un cuartel no reciba pasada en{' '}
                    <strong>{ruleDays} {ruleDays === 1 ? 'día' : 'días'}</strong>.
                  </>
                )
              )}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={selectedCount === 0}>
            {selectedCount > 1 ? `Crear ${selectedCount} Alertas` : 'Crear Alerta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
