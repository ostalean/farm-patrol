import { Leaf, Tractor, LogOut, Menu, Bell, BellPlus, AlertTriangle, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import type { Alert, Block } from '@/types/farm';

interface AppHeaderProps {
  triggeredAlerts: Alert[];
  blocks: Block[];
  onToggleSidebar: () => void;
  onCreateBulkAlerts?: () => void;
  onManageAlerts?: () => void;
  onBlockClick?: (block: Block) => void;
}

export function AppHeader({ triggeredAlerts, blocks, onToggleSidebar, onCreateBulkAlerts, onManageAlerts, onBlockClick }: AppHeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="h-16 border-b border-border bg-card/95 backdrop-blur-sm flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onToggleSidebar}>
          <Menu className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <div className="relative">
              <Leaf className="w-5 h-5 text-primary" />
              <Tractor className="w-3 h-3 text-primary absolute -bottom-0.5 -right-0.5" />
            </div>
          </div>
          <div>
            <h1 className="font-display font-semibold text-lg leading-none">AgroTrack</h1>
            <p className="text-xs text-muted-foreground">Monitoreo de maquinaria</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Create bulk alerts button */}
        {onCreateBulkAlerts && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onCreateBulkAlerts}
            title="Crear alertas masivas"
          >
            <BellPlus className="w-5 h-5" />
          </Button>
        )}

        {/* Manage alerts button */}
        {onManageAlerts && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onManageAlerts}
            title="Gestionar alertas"
          >
            <Settings2 className="w-5 h-5" />
          </Button>
        )}

        {/* Alerts indicator */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {triggeredAlerts.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center animate-pulse">
                  {triggeredAlerts.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Alertas Activas
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {triggeredAlerts.length > 0 ? (
              triggeredAlerts.map((alert) => {
                const block = blocks.find(b => b.id === alert.block_id);
                const alertDays = Math.floor(alert.rule_hours / 24);
                const alertTimeText = alertDays >= 1 
                  ? `${alertDays} ${alertDays === 1 ? 'día' : 'días'}` 
                  : `${alert.rule_hours}h`;
                return (
                  <DropdownMenuItem 
                    key={alert.id} 
                    className="py-3 cursor-pointer"
                    onClick={() => block && onBlockClick?.(block)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-destructive animate-pulse shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{block?.name || 'Cuartel desconocido'}</p>
                        <p className="text-xs text-muted-foreground">
                          Sin pasada por más de {alertTimeText}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              })
            ) : (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No hay alertas activas
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-primary">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden sm:inline text-sm">{user?.email}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
