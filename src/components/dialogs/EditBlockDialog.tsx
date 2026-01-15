import { useState, useEffect } from 'react';
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
import type { Block } from '@/types/farm';

interface EditBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: Block | null;
  onSave: (data: { id: string; name: string; farmName: string | null; crop: string | null }) => void;
  isLoading?: boolean;
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
        <Label htmlFor="edit-block-name">Nombre del cuartel *</Label>
        <Input
          id="edit-block-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
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
          onChange={(e) => onFarmNameChange(e.target.value)}
          placeholder="Ej: Fundo Los Robles"
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-crop">Cultivo</Label>
        <Input
          id="edit-crop"
          value={crop}
          onChange={(e) => onCropChange(e.target.value)}
          placeholder="Ej: Cabernet Sauvignon"
          maxLength={100}
        />
      </div>
    </div>
  );
}

export function EditBlockDialog({ open, onOpenChange, block, onSave, isLoading }: EditBlockDialogProps) {
  const isMobile = useIsMobile();
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

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
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

  const footerButtons = (
    <>
      <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
        Cancelar
      </Button>
      <Button type="submit" disabled={!name.trim() || isLoading} onClick={handleSubmit}>
        {isLoading ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Editar cuartel</DrawerTitle>
            <DrawerDescription>
              Modifica los detalles del cuartel.
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar cuartel</DialogTitle>
          <DialogDescription>
            Modifica los detalles del cuartel.
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
