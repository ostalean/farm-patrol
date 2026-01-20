import { useMemo } from 'react';
import { Filter, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface FarmFilterProps {
  farms: string[];
  hiddenFarms: Set<string>;
  onFarmToggle: (farmName: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function FarmFilter({
  farms,
  hiddenFarms,
  onFarmToggle,
  onSelectAll,
  onDeselectAll,
}: FarmFilterProps) {
  const visibleCount = farms.length - hiddenFarms.size;
  const hasFilters = hiddenFarms.size > 0;

  const sortedFarms = useMemo(() => [...farms].sort((a, b) => a.localeCompare(b)), [farms]);

  if (farms.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-background/95 backdrop-blur-sm shadow-md border-border gap-2"
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Fundos</span>
          {hasFilters && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {visibleCount}/{farms.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-64 bg-popover border-border z-[1100]"
        sideOffset={8}
      >
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-medium">Filtrar por fundo</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onSelectAll}
              title="Mostrar todos"
            >
              <Check className="h-3 w-3 mr-1" />
              Todos
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onDeselectAll}
              title="Ocultar todos"
            >
              <X className="h-3 w-3 mr-1" />
              Ninguno
            </Button>
          </div>
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-64">
          <div className="p-2 space-y-1">
            {sortedFarms.map((farm) => {
              const isVisible = !hiddenFarms.has(farm);
              return (
                <label
                  key={farm}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer"
                >
                  <Checkbox
                    checked={isVisible}
                    onCheckedChange={() => onFarmToggle(farm)}
                  />
                  <span className="text-sm truncate flex-1">{farm}</span>
                </label>
              );
            })}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
