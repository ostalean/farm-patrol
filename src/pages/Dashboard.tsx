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
import { useToast } from '@/hooks/use-toast';
import { useGpsSimulator } from '@/hooks/useGpsSimulator';
import { useVisitPath } from '@/hooks/useVisitPath';
import { useVisitCoverage, generateDemoCoverageStats } from '@/hooks/useVisitCoverage';
import { cn } from '@/lib/utils';
import type { Block, BlockMetrics, Tractor, Alert, BlockVisit, VisitCoverageStats } from '@/types/farm';
import { demoBlocks, demoTractors, generateDemoMetrics, DEMO_MAP_CENTER, DEMO_MAP_ZOOM } from '@/lib/demoData';
import type { Feature, Polygon } from 'geojson';

export default function Dashboard() {
  const { toast } = useToast();
  const mapRef = useRef<MapRef | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createBlockDialogOpen, setCreateBlockDialogOpen] = useState(false);
  const [drawnGeometry, setDrawnGeometry] = useState<Feature<Polygon> | null>(null);
  const [isSimulatorRunning, setIsSimulatorRunning] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEMO_MAP_CENTER);
  const [showMissedAreas, setShowMissedAreas] = useState(false);

  // Demo data state
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blockMetrics, setBlockMetrics] = useState<Record<string, BlockMetrics>>({});
  const [tractors, setTractors] = useState<Tractor[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [visits, setVisits] = useState<BlockVisit[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<BlockVisit | null>(null);
  const [demoCoverageStats, setDemoCoverageStats] = useState<VisitCoverageStats | null>(null);

  // Fetch path for selected visit
  const { pings: visitPathPings } = useVisitPath(selectedVisit);

  // Calculate coverage stats from path
  const { stats: realCoverageStats } = useVisitCoverage(selectedBlock, visitPathPings);
  
  // Use demo coverage stats in demo mode (when real stats can't be calculated)
  const coverageStats = realCoverageStats || demoCoverageStats;

  // Initialize demo data
  useEffect(() => {
    const demoBlocksWithIds: Block[] = demoBlocks.map((b, i) => ({
      ...b,
      id: `block-${i}`,
      tenant_id: 'demo-tenant',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    
    const metrics: Record<string, BlockMetrics> = {};
    demoBlocksWithIds.forEach((block, i) => {
      metrics[block.id] = { id: `metric-${i}`, ...generateDemoMetrics(block.id, i) };
    });
    
    const demoTractorsWithIds: Tractor[] = demoTractors.map((t, i) => ({
      ...t,
      id: `tractor-${i}`,
      tenant_id: 'demo-tenant',
      created_at: new Date().toISOString(),
    }));

    // Generate demo visits for each block
    const demoVisits: BlockVisit[] = [];
    demoBlocksWithIds.forEach((block, blockIdx) => {
      const visitCount = 3 + Math.floor(Math.random() * 5); // 3-7 visits per block
      for (let v = 0; v < visitCount; v++) {
        const daysAgo = v + Math.random() * 2;
        const startTime = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        const duration = 20 + Math.random() * 40; // 20-60 min
        const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
        
        demoVisits.push({
          id: `visit-${blockIdx}-${v}`,
          tenant_id: 'demo-tenant',
          block_id: block.id,
          tractor_id: demoTractorsWithIds[v % demoTractorsWithIds.length].id,
          started_at: startTime.toISOString(),
          ended_at: endTime.toISOString(),
          ping_count: Math.floor(duration * 2), // ~2 pings per minute
          created_at: startTime.toISOString(),
        });
      }
    });

    setBlocks(demoBlocksWithIds);
    setBlockMetrics(metrics);
    setTractors(demoTractorsWithIds);
    setVisits(demoVisits);
  }, []);

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

  const handleMetricsUpdate = useCallback((blockId: string, updates: Partial<BlockMetrics>) => {
    setBlockMetrics(prev => ({
      ...prev,
      [blockId]: {
        ...prev[blockId],
        ...updates,
        updated_at: new Date().toISOString(),
      },
    }));
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

  const handleUploadGeoJSON = (features: Feature<Polygon>[]) => {
    const newBlocks: Block[] = features.map((f, i) => ({
      id: `uploaded-${Date.now()}-${i}`,
      tenant_id: 'demo-tenant',
      name: (f.properties?.name as string) || `Cuartel ${blocks.length + i + 1}`,
      farm_name: (f.properties?.farm_name as string) || null,
      crop: (f.properties?.crop as string) || null,
      geometry_geojson: f,
      metadata: f.properties || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    
    setBlocks(prev => [...prev, ...newBlocks]);
    
    // Center map on new blocks
    if (newBlocks.length > 0) {
      const firstCoord = newBlocks[0].geometry_geojson.geometry.coordinates[0][0];
      setMapCenter([firstCoord[1], firstCoord[0]]);
    }
    
    toast({ title: 'Cuarteles importados', description: `${newBlocks.length} cuartel(es) agregado(s)` });
  };

  const handleBlockDrawn = (geometry: Feature<Polygon>) => {
    setDrawnGeometry(geometry);
    setCreateBlockDialogOpen(true);
  };

  const handleSaveDrawnBlock = (data: { name: string; farmName: string; crop: string; geometry: Feature<Polygon> }) => {
    const newBlock: Block = {
      id: `drawn-${Date.now()}`,
      tenant_id: 'demo-tenant',
      name: data.name,
      farm_name: data.farmName || null,
      crop: data.crop || null,
      geometry_geojson: data.geometry,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add initial metrics
    const newMetrics: BlockMetrics = {
      id: `metric-${Date.now()}`,
      block_id: newBlock.id,
      last_seen_at: null,
      last_tractor_id: null,
      total_passes: 0,
      passes_24h: 0,
      passes_7d: 0,
      updated_at: new Date().toISOString(),
    };

    setBlocks(prev => [...prev, newBlock]);
    setBlockMetrics(prev => ({ ...prev, [newBlock.id]: newMetrics }));
    setDrawnGeometry(null);
    
    toast({ title: 'Cuartel creado', description: `${data.name} agregado al mapa` });
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
    </div>
  );
}
