import { useState, useCallback, useMemo } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, Tractor } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useGpsImport } from '@/hooks/useGpsImport';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

interface ImportGpsDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ParsedPing {
  ts: string;
  lat: number;
  lon: number;
  speed?: number;
}

interface ColumnMapping {
  timestamp: string | null;
  coordinates: string | null; // For combined lat,lon format
  latitude: string | null;
  longitude: string | null;
  speed: string | null;
}

type ImportStep = 'upload' | 'configure' | 'importing' | 'complete';

export function ImportGpsDataDialog({ open, onOpenChange, onSuccess }: ImportGpsDataDialogProps) {
  const { tenantId } = useTenant();
  const { importPings, isImporting, progress, reset } = useGpsImport();

  const [step, setStep] = useState<ImportStep>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    timestamp: null,
    coordinates: null,
    latitude: null,
    longitude: null,
    speed: null,
  });
  const [selectedTractorId, setSelectedTractorId] = useState<string>('');
  const [parsedPings, setParsedPings] = useState<ParsedPing[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importStats, setImportStats] = useState<any>(null);

  // Fetch tractors
  const { data: tractors = [] } = useQuery({
    queryKey: ['tractors', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('tractors')
        .select('id, name, identifier')
        .eq('tenant_id', tenantId)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && open,
  });

  // Auto-detect columns
  const autoDetectColumns = useCallback((cols: string[]) => {
    const mapping: ColumnMapping = {
      timestamp: null,
      coordinates: null,
      latitude: null,
      longitude: null,
      speed: null,
    };

    for (const col of cols) {
      const lower = col.toLowerCase();
      
      // Timestamp patterns
      if (lower.includes('fecha') || lower.includes('date') || lower.includes('time') || 
          lower.includes('timestamp') || lower.includes('hora')) {
        mapping.timestamp = col;
      }
      
      // Combined coordinates pattern
      if (lower.includes('coord') || lower.includes('ubicacion') || lower.includes('location') ||
          lower.includes('posicion') || lower.includes('position')) {
        mapping.coordinates = col;
      }
      
      // Separate lat/lon patterns
      if (lower.includes('lat') || lower === 'y') {
        mapping.latitude = col;
      }
      if (lower.includes('lon') || lower.includes('lng') || lower === 'x') {
        mapping.longitude = col;
      }
      
      // Speed patterns
      if (lower.includes('speed') || lower.includes('velocidad') || lower.includes('vel')) {
        mapping.speed = col;
      }
    }

    return mapping;
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { 
          raw: false,
          dateNF: 'yyyy-mm-dd hh:mm:ss',
        });
        
        if (jsonData.length === 0) {
          setParseErrors(['El archivo no contiene datos']);
          return;
        }

        // Get column names from first row
        const cols = Object.keys(jsonData[0]);
        setColumns(cols);
        setRawData(jsonData);
        
        // Auto-detect column mapping
        const detected = autoDetectColumns(cols);
        setColumnMapping(detected);
        
        setStep('configure');
      } catch (error: any) {
        setParseErrors([`Error al leer el archivo: ${error.message}`]);
      }
    };
    
    reader.readAsArrayBuffer(file);
  }, [autoDetectColumns]);

  // Parse data with current mapping
  const parseData = useCallback(() => {
    const pings: ParsedPing[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNum = i + 2; // Excel row number (1-indexed + header)

      try {
        // Get timestamp
        let timestamp: string | null = null;
        if (columnMapping.timestamp && row[columnMapping.timestamp]) {
          const tsValue = row[columnMapping.timestamp];
          const date = new Date(tsValue);
          if (!isNaN(date.getTime())) {
            timestamp = date.toISOString();
          }
        }

        if (!timestamp) {
          errors.push(`Fila ${rowNum}: Timestamp inválido o faltante`);
          continue;
        }

        // Get coordinates
        let lat: number | null = null;
        let lon: number | null = null;

        if (columnMapping.coordinates && row[columnMapping.coordinates]) {
          // Parse combined format like "-37.799782,-72.659876"
          const coordStr = String(row[columnMapping.coordinates]);
          const parts = coordStr.split(',').map(p => parseFloat(p.trim()));
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            lat = parts[0];
            lon = parts[1];
          }
        } else if (columnMapping.latitude && columnMapping.longitude) {
          lat = parseFloat(row[columnMapping.latitude]);
          lon = parseFloat(row[columnMapping.longitude]);
        }

        if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
          errors.push(`Fila ${rowNum}: Coordenadas inválidas o faltantes`);
          continue;
        }

        // Get speed (optional)
        let speed: number | undefined;
        if (columnMapping.speed && row[columnMapping.speed]) {
          const speedVal = parseFloat(row[columnMapping.speed]);
          if (!isNaN(speedVal)) {
            speed = speedVal;
          }
        }

        pings.push({ ts: timestamp, lat, lon, speed });

      } catch (error: any) {
        errors.push(`Fila ${rowNum}: ${error.message}`);
      }
    }

    setParsedPings(pings);
    setParseErrors(errors.slice(0, 20)); // Limit displayed errors

    return pings;
  }, [rawData, columnMapping]);

  // Preview data
  const previewData = useMemo(() => {
    return rawData.slice(0, 5);
  }, [rawData]);

  // Handle import
  const handleImport = useCallback(async () => {
    if (!selectedTractorId) return;

    const pings = parseData();
    if (pings.length === 0) {
      setParseErrors(['No hay datos válidos para importar']);
      return;
    }

    setStep('importing');

    try {
      const stats = await importPings(selectedTractorId, pings);
      setImportStats(stats);
      setStep('complete');
      onSuccess?.();
    } catch (error) {
      setStep('configure');
    }
  }, [selectedTractorId, parseData, importPings, onSuccess]);

  // Reset dialog
  const handleClose = useCallback((open: boolean) => {
    if (!open) {
      setStep('upload');
      setFileName('');
      setRawData([]);
      setColumns([]);
      setColumnMapping({
        timestamp: null,
        coordinates: null,
        latitude: null,
        longitude: null,
        speed: null,
      });
      setSelectedTractorId('');
      setParsedPings([]);
      setParseErrors([]);
      setImportStats(null);
      reset();
    }
    onOpenChange(open);
  }, [onOpenChange, reset]);

  const progressPercent = progress 
    ? Math.round((progress.totalProcessed / progress.stats.total) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Importar Datos GPS
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Selecciona un archivo Excel con datos GPS'}
            {step === 'configure' && 'Configura el mapeo de columnas y selecciona el tractor'}
            {step === 'importing' && 'Importando datos...'}
            {step === 'complete' && 'Importación completada'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Upload Step */}
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                <Upload className="w-10 h-10 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium">Arrastra un archivo o haz clic para seleccionar</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Formatos soportados: .xlsx, .xls
                </p>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="gps-file-upload"
              />
              <Button asChild>
                <label htmlFor="gps-file-upload" className="cursor-pointer">
                  Seleccionar archivo
                </label>
              </Button>
            </div>
          )}

          {/* Configure Step */}
          {step === 'configure' && (
            <ScrollArea className="h-[50vh]">
              <div className="space-y-6 pr-4">
                {/* File info */}
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                  <span className="font-medium">{fileName}</span>
                  <Badge variant="secondary">{rawData.length} registros</Badge>
                </div>

                {/* Tractor selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tractor destino</label>
                  <Select value={selectedTractorId} onValueChange={setSelectedTractorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tractor" />
                    </SelectTrigger>
                    <SelectContent>
                      {tractors.map((tractor) => (
                        <SelectItem key={tractor.id} value={tractor.id}>
                          <div className="flex items-center gap-2">
                            <Tractor className="w-4 h-4" />
                            {tractor.name} ({tractor.identifier})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Column mapping */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Mapeo de columnas</h4>
                  
                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 gap-2 items-center">
                      <label className="text-sm">Timestamp:</label>
                      <Select 
                        value={columnMapping.timestamp || ''} 
                        onValueChange={(v) => setColumnMapping(prev => ({ ...prev, timestamp: v || null }))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Seleccionar columna" />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map((col) => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-2 items-center">
                      <label className="text-sm">Coordenadas (lat,lon):</label>
                      <Select 
                        value={columnMapping.coordinates || ''} 
                        onValueChange={(v) => setColumnMapping(prev => ({ 
                          ...prev, 
                          coordinates: v || null,
                          latitude: v ? null : prev.latitude,
                          longitude: v ? null : prev.longitude,
                        }))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="O seleccionar separadas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Usar lat/lon separadas</SelectItem>
                          {columns.map((col) => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {!columnMapping.coordinates && (
                      <>
                        <div className="grid grid-cols-2 gap-2 items-center">
                          <label className="text-sm">Latitud:</label>
                          <Select 
                            value={columnMapping.latitude || ''} 
                            onValueChange={(v) => setColumnMapping(prev => ({ ...prev, latitude: v || null }))}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Seleccionar columna" />
                            </SelectTrigger>
                            <SelectContent>
                              {columns.map((col) => (
                                <SelectItem key={col} value={col}>{col}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-2 items-center">
                          <label className="text-sm">Longitud:</label>
                          <Select 
                            value={columnMapping.longitude || ''} 
                            onValueChange={(v) => setColumnMapping(prev => ({ ...prev, longitude: v || null }))}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Seleccionar columna" />
                            </SelectTrigger>
                            <SelectContent>
                              {columns.map((col) => (
                                <SelectItem key={col} value={col}>{col}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    <div className="grid grid-cols-2 gap-2 items-center">
                      <label className="text-sm">Velocidad (opcional):</label>
                      <Select 
                        value={columnMapping.speed || ''} 
                        onValueChange={(v) => setColumnMapping(prev => ({ ...prev, speed: v || null }))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Seleccionar columna" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Sin velocidad</SelectItem>
                          {columns.map((col) => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Vista previa (primeras 5 filas)</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {columns.slice(0, 5).map((col) => (
                            <TableHead key={col} className="text-xs">{col}</TableHead>
                          ))}
                          {columns.length > 5 && <TableHead className="text-xs">...</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((row, i) => (
                          <TableRow key={i}>
                            {columns.slice(0, 5).map((col) => (
                              <TableCell key={col} className="text-xs py-2">
                                {String(row[col] ?? '').substring(0, 20)}
                              </TableCell>
                            ))}
                            {columns.length > 5 && <TableCell className="text-xs">...</TableCell>}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Errors */}
                {parseErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      <p className="font-medium mb-1">Errores encontrados:</p>
                      <ul className="text-sm list-disc list-inside">
                        {parseErrors.slice(0, 5).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                        {parseErrors.length > 5 && (
                          <li>...y {parseErrors.length - 5} errores más</li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-6">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <div className="text-center space-y-2 w-full max-w-sm">
                <p className="font-medium">Importando datos GPS...</p>
                <Progress value={progressPercent} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {progress?.totalProcessed || 0} de {progress?.stats.total || 0} registros procesados
                </p>
                {progress && (
                  <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-4">
                    <span className="text-green-600">✓ {progress.stats.inserted} insertados</span>
                    <span className="text-yellow-600">⊘ {progress.stats.duplicates} duplicados</span>
                    <span className="text-red-600">✗ {progress.stats.errors} errores</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Complete Step */}
          {step === 'complete' && importStats && (
            <div className="flex flex-col items-center justify-center py-12 gap-6">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-center space-y-4">
                <p className="text-lg font-medium">¡Importación completada!</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{importStats.inserted}</p>
                    <p className="text-xs text-muted-foreground">Insertados</p>
                  </div>
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{importStats.duplicates}</p>
                    <p className="text-xs text-muted-foreground">Duplicados</p>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{importStats.errors}</p>
                    <p className="text-xs text-muted-foreground">Errores</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          {step === 'upload' && (
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
          )}
          
          {step === 'configure' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Volver
              </Button>
              <Button 
                onClick={handleImport}
                disabled={!selectedTractorId || !columnMapping.timestamp || 
                  (!columnMapping.coordinates && (!columnMapping.latitude || !columnMapping.longitude))}
              >
                Importar {rawData.length} registros
              </Button>
            </>
          )}

          {step === 'importing' && (
            <Button variant="outline" disabled>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importando...
            </Button>
          )}

          {step === 'complete' && (
            <Button onClick={() => handleClose(false)}>
              Cerrar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
