import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Block } from '@/types/farm';

interface DeleteBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: Block | null;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteBlockDialog({ 
  open, 
  onOpenChange, 
  block, 
  onConfirm, 
  isLoading 
}: DeleteBlockDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar cuartel?</AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de eliminar el cuartel <strong>{block?.name}</strong>. 
            Esta acción no se puede deshacer y se perderán todos los datos asociados 
            (métricas e historial de visitas).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? 'Eliminando...' : 'Eliminar cuartel'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
