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
import { Bell } from 'lucide-react';
import type { Block } from '@/types/farm';

interface AlertConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: Block | null;
  onSave: (blockId: string, ruleHours: number) => void;
}

const presetHours = [24, 48, 72, 168];

export function AlertConfigDialog({
  open,
  onOpenChange,
  block,
  onSave,
}: AlertConfigDialogProps) {
  const [ruleHours, setRuleHours] = useState(48);

  const handleSave = () => {
    if (block) {
      onSave(block.id, ruleHours);
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
            <div className="space-y-2">
              <Label>Alertar si no hay pasada en:</Label>
              
              <div className="grid grid-cols-4 gap-2">
                {presetHours.map((hours) => (
                  <Button
                    key={hours}
                    variant={ruleHours === hours ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRuleHours(hours)}
                  >
                    {hours < 24 ? `${hours}h` : `${hours / 24}d`}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-hours">O especificar horas:</Label>
              <Input
                id="custom-hours"
                type="number"
                min={1}
                max={720}
                value={ruleHours}
                onChange={(e) => setRuleHours(parseInt(e.target.value) || 48)}
              />
            </div>

            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="text-muted-foreground">
                Se activará una alerta si <strong>{block.name}</strong> no recibe
                una pasada de tractor en <strong>{ruleHours} horas</strong>{' '}
                ({Math.round(ruleHours / 24 * 10) / 10} días).
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
