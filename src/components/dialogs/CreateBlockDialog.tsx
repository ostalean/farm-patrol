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
import type { Feature, Polygon } from 'geojson';

interface CreateBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  geometry: Feature<Polygon> | null;
  onSave: (data: { name: string; farmName: string; crop: string; geometry: Feature<Polygon> }) => void;
}

export function CreateBlockDialog({ open, onOpenChange, geometry, onSave }: CreateBlockDialogProps) {
  const [name, setName] = useState('');
  const [farmName, setFarmName] = useState('');
  const [crop, setCrop] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!geometry || !name.trim()) return;

    onSave({
      name: name.trim(),
      farmName: farmName.trim(),
      crop: crop.trim(),
      geometry,
    });

    // Reset form
    setName('');
    setFarmName('');
    setCrop('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setName('');
    setFarmName('');
    setCrop('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear nuevo cuartel</DialogTitle>
          <DialogDescription>
            Ingresa los detalles del cuartel que acabas de dibujar en el mapa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="block-name">Nombre del cuartel *</Label>
            <Input
              id="block-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Cuartel Norte A"
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="farm-name">Nombre del fundo</Label>
            <Input
              id="farm-name"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              placeholder="Ej: Fundo Los Robles"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="crop">Cultivo</Label>
            <Input
              id="crop"
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              placeholder="Ej: Cabernet Sauvignon"
              maxLength={100}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Guardar cuartel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
