import { useState } from 'react';
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
import { Bell, RefreshCw, BellDot } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Block } from '@/types/farm';

interface AlertConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: Block | null;
  onSave: (blockId: string, ruleHours: number, isRecurring: boolean) => void;
}

const presetDays = [1, 2, 3, 7];

export function AlertConfigDialog({
  open,
  onOpenChange,
  block,
  onSave,
}: AlertConfigDialogProps) {
  const [ruleDays, setRuleDays] = useState(2);
  const [isRecurring, setIsRecurring] = useState(true);

  const handleSave = () => {
    if (block) {
      // Convert days to hours for storage
      onSave(block.id, ruleDays * 24, isRecurring);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Configurar Alerta
          </DialogTitle>
          <DialogDescription>
            {block
              ? `Crear una alerta para "${block.name}" cuando no haya pasadas por el tiempo especificado.`
              : 'Selecciona un cuartel para configurar la alerta.'}
          </DialogDescription>
        </DialogHeader>

        {block && (
          <div className="space-y-4 py-4">
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
                    onClick={() => setRuleDays(days)}
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
                value={ruleDays}
                onChange={(e) => setRuleDays(Math.max(1, Math.min(30, parseInt(e.target.value) || 2)))}
              />
            </div>

            {/* Summary */}
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="text-muted-foreground">
                {isRecurring ? (
                  <>
                    Se activará <strong>cada vez</strong> que <strong>{block.name}</strong>{' '}
                    no reciba una pasada en <strong>{ruleDays} {ruleDays === 1 ? 'día' : 'días'}</strong>.
                  </>
                ) : (
                  <>
                    Se activará <strong>una sola vez</strong> cuando <strong>{block.name}</strong>{' '}
                    no reciba una pasada en <strong>{ruleDays} {ruleDays === 1 ? 'día' : 'días'}</strong>.
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!block}>
            Crear Alerta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
