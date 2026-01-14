import { useState, useRef } from 'react';
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
import { Upload, FileJson, AlertCircle } from 'lucide-react';
import type { FeatureCollection, Feature, Polygon } from 'geojson';

interface UploadGeoJSONDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (features: Feature<Polygon>[]) => void;
}

export function UploadGeoJSONDialog({
  open,
  onOpenChange,
  onUpload,
}: UploadGeoJSONDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError(null);
    setPreview(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!selectedFile.name.endsWith('.geojson') && !selectedFile.name.endsWith('.json')) {
      setError('Por favor selecciona un archivo GeoJSON válido (.geojson o .json)');
      return;
    }

    try {
      const text = await selectedFile.text();
      const geojson = JSON.parse(text);

      // Validate GeoJSON structure
      if (geojson.type !== 'FeatureCollection' && geojson.type !== 'Feature') {
        throw new Error('El archivo debe ser un FeatureCollection o Feature');
      }

      const features: Feature[] =
        geojson.type === 'FeatureCollection' ? geojson.features : [geojson];

      const polygons = features.filter(
        (f: Feature) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'
      );

      if (polygons.length === 0) {
        throw new Error('No se encontraron polígonos en el archivo');
      }

      setFile(selectedFile);
      setPreview(`${polygons.length} polígono(s) encontrado(s)`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al leer el archivo');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      const text = await file.text();
      const geojson = JSON.parse(text);

      const features: Feature[] =
        geojson.type === 'FeatureCollection' ? geojson.features : [geojson];

      const polygons = features.filter(
        (f: Feature) => f.geometry?.type === 'Polygon'
      ) as Feature<Polygon>[];

      onUpload(polygons);
      onOpenChange(false);
      setFile(null);
      setPreview(null);
    } catch (err) {
      setError('Error al procesar el archivo');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="w-5 h-5 text-primary" />
            Cargar Cuarteles
          </DialogTitle>
          <DialogDescription>
            Sube un archivo GeoJSON con los polígonos de tus cuarteles. Cada feature
            se convertirá en un cuartel.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              Haz clic para seleccionar o arrastra un archivo
            </p>
            <p className="text-xs text-muted-foreground">.geojson o .json</p>
            
            <Input
              ref={fileInputRef}
              type="file"
              accept=".geojson,.json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {file && preview && (
            <div className="p-3 bg-success/10 border border-success/30 rounded-lg text-sm text-success flex items-center gap-2">
              <FileJson className="w-4 h-4" />
              <span>{file.name}</span>
              <span className="text-muted-foreground">— {preview}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
            <p className="font-medium mb-1">Formato esperado:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>FeatureCollection con polígonos</li>
              <li>Propiedades opcionales: name, farm_name, crop</li>
              <li>Coordenadas en WGS84 (lon, lat)</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleUpload} disabled={!file}>
            Importar Cuarteles
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
