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
import type { Alert } from '@/types/farm';

interface DeleteAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: Alert | null;
  onConfirm: (alertId: string) => void;
}

export function DeleteAlertDialog({
  open,
  onOpenChange,
  alert,
  onConfirm,
}: DeleteAlertDialogProps) {
  const handleConfirm = () => {
    if (alert) {
      onConfirm(alert.id);
      onOpenChange(false);
    }
  };

  const alertDays = alert ? Math.round(alert.rule_hours / 24) : 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar alerta?</AlertDialogTitle>
          <AlertDialogDescription>
            {alert ? (
              <>
                Esta acción eliminará la alerta de{' '}
                <strong>{alertDays} {alertDays === 1 ? 'día' : 'días'}</strong>{' '}
                ({alert.is_recurring ? 'recurrente' : 'una sola vez'}).
                Esta acción no se puede deshacer.
              </>
            ) : (
              'Selecciona una alerta para eliminar.'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
