import { Plus, Minus, Layers, Upload, Play, Pause, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onUploadGeoJSON: () => void;
  isSimulatorRunning: boolean;
  onToggleSimulator: () => void;
  onRefreshData: () => void;
}

export function MapControls({
  onZoomIn,
  onZoomOut,
  onUploadGeoJSON,
  isSimulatorRunning,
  onToggleSimulator,
  onRefreshData,
}: MapControlsProps) {
  return (
    <div className="absolute right-4 top-4 z-[1000] flex flex-col gap-2">
      {/* Zoom controls */}
      <div className="map-control flex flex-col overflow-hidden">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-none border-b border-border"
              onClick={onZoomIn}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Acercar</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-none"
              onClick={onZoomOut}
            >
              <Minus className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Alejar</TooltipContent>
        </Tooltip>
      </div>

      {/* Tools */}
      <div className="map-control flex flex-col overflow-hidden">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-none border-b border-border"
              onClick={onUploadGeoJSON}
            >
              <Upload className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Cargar GeoJSON</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-none border-b border-border"
              onClick={onRefreshData}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Actualizar datos</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isSimulatorRunning ? 'default' : 'ghost'}
              size="icon"
              className="rounded-none"
              onClick={onToggleSimulator}
            >
              {isSimulatorRunning ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {isSimulatorRunning ? 'Pausar simulador GPS' : 'Iniciar simulador GPS'}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
