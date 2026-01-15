import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Feature, Polygon } from 'geojson';

interface CreateBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  geometry: Feature<Polygon> | null;
  onSave: (data: { name: string; farmName: string; crop: string; geometry: Feature<Polygon> }) => void;
}

interface FormContentProps {
  name: string;
  farmName: string;
  crop: string;
  onNameChange: (value: string) => void;
  onFarmNameChange: (value: string) => void;
  onCropChange: (value: string) => void;
}

function FormContent({
  name,
  farmName,
  crop,
  onNameChange,
  onFarmNameChange,
  onCropChange,
}: FormContentProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="block-name">Nombre del cuartel *</Label>
        <Input
          id="block-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
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
          onChange={(e) => onFarmNameChange(e.target.value)}
          placeholder="Ej: Fundo Los Robles"
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="crop">Cultivo</Label>
        <Input
          id="crop"
          value={crop}
          onChange={(e) => onCropChange(e.target.value)}
          placeholder="Ej: Cabernet Sauvignon"
          maxLength={100}
        />
      </div>
    </div>
  );
}

export function CreateBlockDialog({ open, onOpenChange, geometry, onSave }: CreateBlockDialogProps) {
  const isMobile = useIsMobile();
  const [name, setName] = useState('');
  const [farmName, setFarmName] = useState('');
  const [crop, setCrop] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
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

  const footerButtons = (
    <>
      <Button type="button" variant="outline" onClick={handleCancel}>
        Cancelar
      </Button>
      <Button type="submit" disabled={!name.trim()} onClick={handleSubmit}>
        Guardar cuartel
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Crear nuevo cuartel</DrawerTitle>
            <DrawerDescription>
              Ingresa los detalles del cuartel que acabas de dibujar en el mapa.
            </DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="flex-1 px-4 overflow-y-auto">
            <FormContent
              name={name}
              farmName={farmName}
              crop={crop}
              onNameChange={setName}
              onFarmNameChange={setFarmName}
              onCropChange={setCrop}
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear nuevo cuartel</DialogTitle>
          <DialogDescription>
            Ingresa los detalles del cuartel que acabas de dibujar en el mapa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormContent
            name={name}
            farmName={farmName}
            crop={crop}
            onNameChange={setName}
            onFarmNameChange={setFarmName}
            onCropChange={setCrop}
          />

          <DialogFooter>
            {footerButtons}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
