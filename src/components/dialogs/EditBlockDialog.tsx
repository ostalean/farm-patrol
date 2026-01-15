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
import type { Block } from '@/types/farm';

interface EditBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: Block | null;
  onSave: (data: { id: string; name: string; farmName: string | null; crop: string | null }) => void;
  isLoading?: boolean;
}

export function EditBlockDialog({ open, onOpenChange, block, onSave, isLoading }: EditBlockDialogProps) {
  const [name, setName] = useState('');
  const [farmName, setFarmName] = useState('');
  const [crop, setCrop] = useState('');

  // Populate form when block changes
  useEffect(() => {
    if (block) {
      setName(block.name);
      setFarmName(block.farm_name || '');
      setCrop(block.crop || '');
    }
  }, [block]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!block || !name.trim()) return;

    onSave({
      id: block.id,
      name: name.trim(),
      farmName: farmName.trim() || null,
      crop: crop.trim() || null,
    });
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar cuartel</DialogTitle>
          <DialogDescription>
            Modifica los detalles del cuartel.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-block-name">Nombre del cuartel *</Label>
            <Input
              id="edit-block-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Cuartel Norte A"
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-farm-name">Nombre del fundo</Label>
            <Input
              id="edit-farm-name"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              placeholder="Ej: Fundo Los Robles"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-crop">Cultivo</Label>
            <Input
              id="edit-crop"
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              placeholder="Ej: Cabernet Sauvignon"
              maxLength={100}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
