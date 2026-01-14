import { useState, useEffect, useCallback } from 'react';
import { FarmMap } from '@/components/map/FarmMap';
import { BlockList } from '@/components/sidebar/BlockList';
import { BlockDetail } from '@/components/sidebar/BlockDetail';
import { AppHeader } from '@/components/header/AppHeader';
import { MapControls } from '@/components/controls/MapControls';
import { AlertConfigDialog } from '@/components/dialogs/AlertConfigDialog';
import { UploadGeoJSONDialog } from '@/components/dialogs/UploadGeoJSONDialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Block, BlockMetrics, Tractor, Alert, BlockVisit } from '@/types/farm';
import { demoBlocks, demoTractors, generateDemoMetrics, DEMO_MAP_CENTER, DEMO_MAP_ZOOM } from '@/lib/demoData';
import type { Feature, Polygon } from 'geojson';

export default function Dashboard() {
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isSimulatorRunning, setIsSimulatorRunning] = useState(false);
  
  // Demo data state
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blockMetrics, setBlockMetrics] = useState<Record<string, BlockMetrics>>({});
  const [tractors, setTractors] = useState<Tractor[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [visits, setVisits] = useState<BlockVisit[]>([]);

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

    setBlocks(demoBlocksWithIds);
    setBlockMetrics(metrics);
    setTractors(demoTractorsWithIds);
  }, []);

  const handleBlockSelect = (block: Block) => {
    setSelectedBlock(block);
    setSidebarOpen(true);
  };

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
    toast({ title: 'Cuarteles importados', description: `${newBlocks.length} cuartel(es) agregado(s)` });
  };

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
        {/* Sidebar */}
        <aside className={cn(
          'w-80 border-r border-border bg-card shrink-0 transition-all duration-300',
          'absolute md:relative inset-y-16 md:inset-y-0 z-20',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:w-0 md:translate-x-0'
        )}>
          {selectedBlock ? (
            <BlockDetail
              block={selectedBlock}
              metrics={blockMetrics[selectedBlock.id] || null}
              visits={blockVisits}
              tractors={tractors}
              alerts={blockAlerts}
              onClose={() => setSelectedBlock(null)}
              onConfigureAlert={() => setAlertDialogOpen(true)}
              onToggleAlert={() => {}}
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

        {/* Map */}
        <main className="flex-1 relative">
          <FarmMap
            blocks={blocks}
            blockMetrics={blockMetrics}
            tractors={tractors}
            selectedBlockId={selectedBlock?.id || null}
            onBlockClick={handleBlockSelect}
            center={DEMO_MAP_CENTER}
            zoom={DEMO_MAP_ZOOM}
          />
          
          <MapControls
            onZoomIn={() => {}}
            onZoomOut={() => {}}
            onUploadGeoJSON={() => setUploadDialogOpen(true)}
            isSimulatorRunning={isSimulatorRunning}
            onToggleSimulator={() => setIsSimulatorRunning(!isSimulatorRunning)}
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
    </div>
  );
}
