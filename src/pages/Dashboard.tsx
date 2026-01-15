import { useState, useEffect, useRef, useCallback } from 'react';
import type { MapRef } from 'react-map-gl';
import { FarmMap } from '@/components/map/FarmMap';
import { BlockList } from '@/components/sidebar/BlockList';
import { BlockDetail } from '@/components/sidebar/BlockDetail';
import { AppHeader } from '@/components/header/AppHeader';
import { MapControls } from '@/components/controls/MapControls';
import { AlertConfigDialog } from '@/components/dialogs/AlertConfigDialog';
import { UploadGeoJSONDialog } from '@/components/dialogs/UploadGeoJSONDialog';
import { CreateBlockDialog } from '@/components/dialogs/CreateBlockDialog';
import { EditBlockDialog } from '@/components/dialogs/EditBlockDialog';
import { DeleteBlockDialog } from '@/components/dialogs/DeleteBlockDialog';
import { useToast } from '@/hooks/use-toast';
import { useGpsSimulator } from '@/hooks/useGpsSimulator';
import { useVisitPath } from '@/hooks/useVisitPath';
import { useVisitCoverage, generateDemoCoverageStats } from '@/hooks/useVisitCoverage';
import { useBlocks, useBlockMetrics, useCreateBlock, useCreateBlocksBatch, useUpdateBlock, useDeleteBlock } from '@/hooks/useBlocks';
import { useVisits } from '@/hooks/useVisits';
import { useTenant } from '@/hooks/useTenant';
import { cn } from '@/lib/utils';
import type { Block, BlockMetrics, Tractor, Alert, BlockVisit, VisitCoverageStats } from '@/types/farm';
import { demoTractors, DEMO_MAP_CENTER, DEMO_MAP_ZOOM } from '@/lib/demoData';
import type { Feature, Polygon } from 'geojson';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { toast } = useToast();
  const mapRef = useRef<MapRef | null>(null);

  // Get tenant for database operations
  const { tenantId, isLoading: tenantLoading } = useTenant();

  // Fetch blocks and metrics from database
  const { data: dbBlocks, isLoading: blocksLoading } = useBlocks(tenantId);
  const { data: dbMetrics, isLoading: metricsLoading } = useBlockMetrics(tenantId);
  const { data: dbVisits, isLoading: visitsLoading } = useVisits(tenantId);
  const createBlock = useCreateBlock();
  const createBlocksBatch = useCreateBlocksBatch();
  const updateBlock = useUpdateBlock();
  const deleteBlock = useDeleteBlock();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createBlockDialogOpen, setCreateBlockDialogOpen] = useState(false);
  const [editBlockDialogOpen, setEditBlockDialogOpen] = useState(false);
  const [deleteBlockDialogOpen, setDeleteBlockDialogOpen] = useState(false);
  const [drawnGeometry, setDrawnGeometry] = useState<Feature<Polygon> | null>(null);
  const [isSimulatorRunning, setIsSimulatorRunning] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEMO_MAP_CENTER);
  const [showMissedAreas, setShowMissedAreas] = useState(false);

  // Local state for tractors, alerts (still demo for now)
  const [tractors, setTractors] = useState<Tractor[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<BlockVisit | null>(null);
  const [demoCoverageStats, setDemoCoverageStats] = useState<VisitCoverageStats | null>(null);

  // Use database visits
  const visits = dbVisits || [];

  // Use database blocks and metrics
  const blocks = dbBlocks || [];
  const blockMetrics = dbMetrics || {};

  // Fetch path for selected visit
  const { pings: visitPathPings } = useVisitPath(selectedVisit);

  // Calculate coverage stats from path
  const { stats: realCoverageStats } = useVisitCoverage(selectedBlock, visitPathPings);
  
  // Use demo coverage stats in demo mode (when real stats can't be calculated)
  const coverageStats = realCoverageStats || demoCoverageStats;

  // Initialize demo tractors
  useEffect(() => {
    const demoTractorsWithIds: Tractor[] = demoTractors.map((t, i) => ({
      ...t,
      id: `tractor-${i}`,
      tenant_id: tenantId || 'demo-tenant',
      created_at: new Date().toISOString(),
    }));
    setTractors(demoTractorsWithIds);
  }, [tenantId]);

  // Note: Visits are now fetched from database via useVisits hook

  // GPS Simulator
  const handleTractorMove = useCallback((tractorId: string, lat: number, lon: number) => {
    setTractors(prev => prev.map(t => 
      t.id === tractorId 
        ? { ...t, last_lat: lat, last_lon: lon, last_seen_at: new Date().toISOString() }
        : t
    ));
  }, []);

  const handleBlockVisit = useCallback((blockId: string, tractorId: string) => {
    const block = blocks.find(b => b.id === blockId);
    const tractor = tractors.find(t => t.id === tractorId);
    if (block && tractor) {
      toast({
        title: `${tractor.name} entró a ${block.name}`,
        description: 'Visita registrada',
      });
    }
  }, [blocks, tractors, toast]);

  // Note: handleMetricsUpdate is a no-op since we now fetch metrics from DB
  // In production, metrics would be updated by backend triggers
  const handleMetricsUpdate = useCallback((_blockId: string, _updates: Partial<BlockMetrics>) => {
    // Metrics are fetched from database, not updated locally
    // In production, a trigger would update block_metrics when a visit completes
  }, []);

  useGpsSimulator({
    isRunning: isSimulatorRunning,
    blocks,
    tractors,
    blockMetrics,
    onTractorMove: handleTractorMove,
    onBlockVisit: handleBlockVisit,
    onMetricsUpdate: handleMetricsUpdate,
  });

  const handleBlockSelect = (block: Block) => {
    setSelectedBlock(block);
    setSelectedVisit(null); // Clear any selected visit when changing blocks
    setShowMissedAreas(false);
    setDemoCoverageStats(null);
    setSidebarOpen(true);
  };

  const handleVisitSelect = useCallback((visit: BlockVisit) => {
    const isDeselecting = selectedVisit?.id === visit.id;
    setSelectedVisit(isDeselecting ? null : visit);
    setShowMissedAreas(false);
    
    // Generate demo coverage stats when selecting a visit
    if (!isDeselecting) {
      setDemoCoverageStats(generateDemoCoverageStats());
    } else {
      setDemoCoverageStats(null);
    }
  }, [selectedVisit]);

  const handleClearPath = useCallback(() => {
    setSelectedVisit(null);
    setShowMissedAreas(false);
    setDemoCoverageStats(null);
  }, []);

  const handleToggleMissedAreas = useCallback(() => {
    setShowMissedAreas(prev => !prev);
  }, []);

  const handleCreateAlert = (blockId: string, ruleHours: number) => {
    const newAlert: Alert = {
      id: `alert-${Date.now()}`,
      tenant_id: 'demo-tenant',
      block_id: blockId,
      rule_hours: ruleHours,
      status: 'active',
      last_triggered_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setAlerts(prev => [...prev, newAlert]);
    toast({ title: 'Alerta creada', description: `Se notificará si no hay pasada en ${ruleHours}h` });
  };

  const handleUploadGeoJSON = async (features: Feature<Polygon>[]) => {
    if (!tenantId) {
      toast({ title: 'Error', description: 'Debes iniciar sesión para crear cuarteles', variant: 'destructive' });
      return;
    }

    try {
      const blocksToCreate = features.map((f, i) => ({
        tenant_id: tenantId,
        name: (f.properties?.name as string) || `Cuartel ${blocks.length + i + 1}`,
        farm_name: (f.properties?.farm_name as string) || null,
        crop: (f.properties?.crop as string) || null,
        geometry_geojson: f,
        metadata: f.properties || {},
      }));

      const newBlocks = await createBlocksBatch.mutateAsync(blocksToCreate);
      
      // Center map on new blocks
      if (newBlocks.length > 0) {
        const firstCoord = newBlocks[0].geometry_geojson.geometry.coordinates[0][0];
        setMapCenter([firstCoord[1], firstCoord[0]]);
      }
      
      toast({ title: 'Cuarteles importados', description: `${newBlocks.length} cuartel(es) agregado(s)` });
    } catch (error) {
      console.error('Failed to import blocks:', error);
      toast({ title: 'Error', description: 'No se pudieron importar los cuarteles', variant: 'destructive' });
    }
  };

  const handleBlockDrawn = (geometry: Feature<Polygon>) => {
    setDrawnGeometry(geometry);
    setCreateBlockDialogOpen(true);
  };

  const handleSaveDrawnBlock = async (data: { name: string; farmName: string; crop: string; geometry: Feature<Polygon> }) => {
    if (!tenantId) {
      toast({ title: 'Error', description: 'Debes iniciar sesión para crear cuarteles', variant: 'destructive' });
      return;
    }

    try {
      await createBlock.mutateAsync({
        tenant_id: tenantId,
        name: data.name,
        farm_name: data.farmName || null,
        crop: data.crop || null,
        geometry_geojson: data.geometry,
        metadata: {},
      });
      
      setDrawnGeometry(null);
      toast({ title: 'Cuartel creado', description: `${data.name} agregado al mapa` });
    } catch (error) {
      console.error('Failed to create block:', error);
      toast({ title: 'Error', description: 'No se pudo crear el cuartel', variant: 'destructive' });
    }
  };

  const handleEditBlock = async (data: { id: string; name: string; farmName: string | null; crop: string | null }) => {
    if (!tenantId) return;

    try {
      await updateBlock.mutateAsync({
        id: data.id,
        tenant_id: tenantId,
        name: data.name,
        farm_name: data.farmName,
        crop: data.crop,
      });
      
      // Update selected block with new data
      if (selectedBlock?.id === data.id) {
        setSelectedBlock(prev => prev ? { ...prev, name: data.name, farm_name: data.farmName, crop: data.crop } : null);
      }
      
      setEditBlockDialogOpen(false);
      toast({ title: 'Cuartel actualizado', description: `${data.name} ha sido modificado` });
    } catch (error) {
      console.error('Failed to update block:', error);
      toast({ title: 'Error', description: 'No se pudo actualizar el cuartel', variant: 'destructive' });
    }
  };

  const handleDeleteBlock = async () => {
    if (!tenantId || !selectedBlock) return;

    try {
      await deleteBlock.mutateAsync({
        id: selectedBlock.id,
        tenant_id: tenantId,
      });
      
      setDeleteBlockDialogOpen(false);
      setSelectedBlock(null);
      setSelectedVisit(null);
      toast({ title: 'Cuartel eliminado', description: `${selectedBlock.name} ha sido eliminado` });
    } catch (error) {
      console.error('Failed to delete block:', error);
      toast({ title: 'Error', description: 'No se pudo eliminar el cuartel', variant: 'destructive' });
    }
  };

  const handleToggleSimulator = () => {
    const newState = !isSimulatorRunning;
    setIsSimulatorRunning(newState);
    toast({
      title: newState ? 'Simulador GPS iniciado' : 'Simulador GPS pausado',
      description: newState 
        ? 'Los tractores se moverán automáticamente por los cuarteles' 
        : 'Los tractores detenidos',
    });
  };

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);

  // Force Mapbox to resize when sidebar opens/closes
  useEffect(() => {
    const resizeMap = () => {
      requestAnimationFrame(() => {
        mapRef.current?.resize();
      });
    };
    
    // Resize immediately and after transition completes
    resizeMap();
    const timeoutId = setTimeout(resizeMap, 350);
    
    return () => clearTimeout(timeoutId);
  }, [sidebarOpen]);

  const triggeredAlerts = alerts.filter(a => a.status === 'triggered');
  const blockAlerts = selectedBlock ? alerts.filter(a => a.block_id === selectedBlock.id) : [];
  const blockVisits = selectedBlock ? visits.filter(v => v.block_id === selectedBlock.id) : [];

  const isLoading = tenantLoading || blocksLoading || metricsLoading || visitsLoading;

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <AppHeader triggeredAlerts={[]} onToggleSidebar={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando cuarteles...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <AppHeader 
        triggeredAlerts={triggeredAlerts} 
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile backdrop when sidebar is open */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/30 z-40 md:hidden" 
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar - static on desktop (takes space), fixed overlay on mobile */}
        <aside className={cn(
          'bg-card border-r border-border overflow-y-auto transition-all duration-300 flex-shrink-0',
          // Mobile: fixed drawer overlay
          'fixed left-0 top-16 bottom-0 w-80 z-50',
          // Desktop: static flex child that takes its width (wider for better content fit)
          'md:static md:top-auto md:bottom-auto md:left-auto md:z-auto',
          // Open/close states
          sidebarOpen 
            ? 'translate-x-0 md:w-96' 
            : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden'
        )}>
          {selectedBlock ? (
            <BlockDetail
              block={selectedBlock}
              metrics={blockMetrics[selectedBlock.id] || null}
              visits={blockVisits}
              tractors={tractors}
              alerts={blockAlerts}
              onClose={() => { setSelectedBlock(null); setSelectedVisit(null); setShowMissedAreas(false); setDemoCoverageStats(null); }}
              onConfigureAlert={() => setAlertDialogOpen(true)}
              onToggleAlert={() => {}}
              onVisitSelect={handleVisitSelect}
              selectedVisitId={selectedVisit?.id ?? null}
              visitPath={visitPathPings}
              coverageStats={coverageStats}
              onToggleMissedAreas={handleToggleMissedAreas}
              showMissedAreas={showMissedAreas}
              onEditBlock={() => setEditBlockDialogOpen(true)}
              onDeleteBlock={() => setDeleteBlockDialogOpen(true)}
            />
          ) : (
            <BlockList
              blocks={blocks}
              blockMetrics={blockMetrics}
              alerts={alerts}
              selectedBlockId={null}
              onBlockSelect={handleBlockSelect}
              onConfigureAlert={() => {}}
            />
          )}
        </aside>

        {/* Map - takes remaining space after sidebar */}
        <main className="flex-1 relative overflow-hidden map-shell">
          <FarmMap
            blocks={blocks}
            blockMetrics={blockMetrics}
            tractors={tractors}
            selectedBlockId={selectedBlock?.id || null}
            onBlockClick={handleBlockSelect}
            center={mapCenter}
            zoom={DEMO_MAP_ZOOM}
            onMapReady={(map) => {
              mapRef.current = map;
            }}
            onBlockDrawn={handleBlockDrawn}
            enableDrawing={true}
            visitPath={visitPathPings}
            onClearPath={handleClearPath}
            missedAreas={showMissedAreas ? coverageStats?.missedAreas : undefined}
          />
          
          <MapControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onUploadGeoJSON={() => setUploadDialogOpen(true)}
            isSimulatorRunning={isSimulatorRunning}
            onToggleSimulator={handleToggleSimulator}
            onRefreshData={() => toast({ title: 'Datos actualizados' })}
          />
        </main>
      </div>

      <AlertConfigDialog
        open={alertDialogOpen}
        onOpenChange={setAlertDialogOpen}
        block={selectedBlock}
        onSave={handleCreateAlert}
      />
      
      <UploadGeoJSONDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUpload={handleUploadGeoJSON}
      />

      <CreateBlockDialog
        open={createBlockDialogOpen}
        onOpenChange={setCreateBlockDialogOpen}
        geometry={drawnGeometry}
        onSave={handleSaveDrawnBlock}
      />

      <EditBlockDialog
        open={editBlockDialogOpen}
        onOpenChange={setEditBlockDialogOpen}
        block={selectedBlock}
        onSave={handleEditBlock}
        isLoading={updateBlock.isPending}
      />

      <DeleteBlockDialog
        open={deleteBlockDialogOpen}
        onOpenChange={setDeleteBlockDialogOpen}
        block={selectedBlock}
        onConfirm={handleDeleteBlock}
        isLoading={deleteBlock.isPending}
      />
    </div>
  );
}
