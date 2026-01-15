import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Block, BlockVisit, BlockMetrics, Tractor, VisitCoverageStats } from '@/types/farm';
import type { BlockVisitStats } from '@/hooks/useBlockVisitStats';

interface ExportData {
  block: Block;
  metrics: BlockMetrics | null;
  visits: BlockVisit[];
  tractors: Tractor[];
  visitStats: BlockVisitStats;
  selectedVisit?: BlockVisit | null;
  coverageStats?: VisitCoverageStats | null;
}

export function useReportExport() {
  const formatDurationMinutes = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const exportToPDF = async (data: ExportData) => {
    const { block, metrics, visits, tractors, visitStats, selectedVisit, coverageStats } = data;
    const tractorMap = new Map(tractors.map((t) => [t.id, t]));
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(`Reporte de Cuartel: ${block.name}`, 14, yPos);
    yPos += 10;

    // Subtitle
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    const subtitle = [block.farm_name, block.crop].filter(Boolean).join(' • ');
    if (subtitle) {
      doc.text(subtitle, 14, yPos);
      yPos += 6;
    }

    // Generation date
    doc.text(`Generado: ${format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es })}`, 14, yPos);
    yPos += 15;

    // Reset text color
    doc.setTextColor(0);

    // Summary section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen General', 14, yPos);
    yPos += 8;

    // Summary table
    const hectares = (block.metadata as any)?.hectares || 'N/A';
    const hoursSinceLastVisit = metrics?.last_seen_at
      ? Math.round((Date.now() - new Date(metrics.last_seen_at).getTime()) / (1000 * 60 * 60))
      : null;

    autoTable(doc, {
      startY: yPos,
      head: [['Métrica', 'Valor']],
      body: [
        ['Superficie', `${hectares} hectáreas`],
        ['Total de pasadas', `${metrics?.total_passes ?? 0} (histórico)`],
        ['Promedio mensual', `${visitStats.averagePassesPerMonth.toFixed(1)} pasadas/mes`],
        ['Duración promedio', formatDurationMinutes(visitStats.averageDuration)],
        ['Última pasada', hoursSinceLastVisit !== null 
          ? `Hace ${hoursSinceLastVisit < 24 ? `${hoursSinceLastVisit}h` : `${Math.round(hoursSinceLastVisit / 24)} días`}`
          : 'Sin registro'],
        ['Pasadas últimas 24h', `${metrics?.passes_24h ?? 0}`],
        ['Pasadas últimos 7 días', `${metrics?.passes_7d ?? 0}`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Coverage analysis (if available)
    if (coverageStats && selectedVisit) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Análisis de Cobertura - Pasada Seleccionada', 14, yPos);
      yPos += 8;

      const visitDate = format(new Date(selectedVisit.started_at), "d 'de' MMMM yyyy, HH:mm", { locale: es });
      const tractor = tractorMap.get(selectedVisit.tractor_id);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Parámetro', 'Valor']],
        body: [
          ['Fecha de pasada', visitDate],
          ['Tractor', tractor?.name ?? 'Desconocido'],
          ['Velocidad promedio', `${coverageStats.averageSpeed.toFixed(1)} km/h`],
          ['Velocidad máxima', `${coverageStats.maxSpeed.toFixed(1)} km/h`],
          ['Cobertura del cuartel', `${coverageStats.coveragePercentage.toFixed(1)}%`],
          ['Área cubierta', `${coverageStats.coveredArea.toFixed(2)} ha`],
          ['Distancia recorrida', `${(coverageStats.totalDistance / 1000).toFixed(2)} km`],
          ['Áreas sin cubrir', `${coverageStats.missedAreas.length} zonas`],
          ['Puntos GPS registrados', `${selectedVisit.ping_count}`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] },
        margin: { left: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Weekly activity chart data (last 3 months)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Actividad Semanal - Últimos 3 Meses', 14, yPos);
    yPos += 8;

    const weeklyData = visitStats.weeklyPasses3m.map(w => [
      w.weekStart,
      `${w.count} pasadas`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Semana', 'Pasadas']],
      body: weeklyData,
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] },
      margin: { left: 14 },
      tableWidth: pageWidth / 2 - 20,
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Check if we need a new page
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    // Recent visits history
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Historial de Pasadas Recientes', 14, yPos);
    yPos += 8;

    const recentVisits = visits.slice(0, 20).map(visit => {
      const tractor = tractorMap.get(visit.tractor_id);
      const duration = visit.ended_at 
        ? (new Date(visit.ended_at).getTime() - new Date(visit.started_at).getTime()) / (1000 * 60)
        : null;
      
      return [
        format(new Date(visit.started_at), "d MMM yyyy", { locale: es }),
        format(new Date(visit.started_at), "HH:mm"),
        tractor?.name ?? 'Desconocido',
        duration !== null ? formatDurationMinutes(duration) : 'En curso',
        `${visit.ping_count}`,
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Fecha', 'Hora', 'Tractor', 'Duración', 'Pings']],
      body: recentVisits,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] },
      margin: { left: 14 },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Página ${i} de ${pageCount} | ${block.name} - Reporte generado automáticamente`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    // Save the PDF
    const filename = `reporte-${block.name.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  };

  const exportToCSV = (data: ExportData) => {
    const { block, metrics, visits, tractors, visitStats, selectedVisit, coverageStats } = data;
    const tractorMap = new Map(tractors.map((t) => [t.id, t]));

    const lines: string[] = [];

    // Header info
    lines.push('REPORTE DE CUARTEL');
    lines.push(`Nombre,${escapeCSV(block.name)}`);
    lines.push(`Fundo,${escapeCSV(block.farm_name || '')}`);
    lines.push(`Cultivo,${escapeCSV(block.crop || '')}`);
    lines.push(`Superficie (ha),${(block.metadata as any)?.hectares || ''}`);
    lines.push(`Fecha de reporte,${format(new Date(), 'yyyy-MM-dd HH:mm')}`);
    lines.push('');

    // Summary stats
    lines.push('RESUMEN GENERAL');
    lines.push('Métrica,Valor');
    lines.push(`Total pasadas (histórico),${metrics?.total_passes ?? 0}`);
    lines.push(`Pasadas últimas 24h,${metrics?.passes_24h ?? 0}`);
    lines.push(`Pasadas últimos 7 días,${metrics?.passes_7d ?? 0}`);
    lines.push(`Promedio mensual (último año),${visitStats.averagePassesPerMonth.toFixed(2)}`);
    lines.push(`Duración promedio (minutos),${visitStats.averageDuration.toFixed(1)}`);
    lines.push('');

    // Coverage stats if available
    if (coverageStats && selectedVisit) {
      lines.push('ANÁLISIS DE COBERTURA - PASADA SELECCIONADA');
      lines.push(`Fecha,${format(new Date(selectedVisit.started_at), 'yyyy-MM-dd HH:mm')}`);
      lines.push(`Tractor,${escapeCSV(tractorMap.get(selectedVisit.tractor_id)?.name || 'Desconocido')}`);
      lines.push(`Velocidad promedio (km/h),${coverageStats.averageSpeed.toFixed(2)}`);
      lines.push(`Velocidad máxima (km/h),${coverageStats.maxSpeed.toFixed(2)}`);
      lines.push(`Cobertura (%),${coverageStats.coveragePercentage.toFixed(2)}`);
      lines.push(`Área cubierta (ha),${coverageStats.coveredArea.toFixed(4)}`);
      lines.push(`Distancia recorrida (m),${coverageStats.totalDistance.toFixed(0)}`);
      lines.push(`Áreas sin cubrir (zonas),${coverageStats.missedAreas.length}`);
      lines.push(`Puntos GPS,${selectedVisit.ping_count}`);
      lines.push('');
    }

    // Weekly activity
    lines.push('ACTIVIDAD SEMANAL - ÚLTIMOS 3 MESES');
    lines.push('Semana inicio,Pasadas');
    visitStats.weeklyPasses3m.forEach(w => {
      lines.push(`${w.weekStart},${w.count}`);
    });
    lines.push('');

    // Visit history
    lines.push('HISTORIAL DE PASADAS');
    lines.push('Fecha,Hora inicio,Hora fin,Tractor,Duración (min),Puntos GPS');
    visits.forEach(visit => {
      const tractor = tractorMap.get(visit.tractor_id);
      const duration = visit.ended_at 
        ? ((new Date(visit.ended_at).getTime() - new Date(visit.started_at).getTime()) / (1000 * 60)).toFixed(1)
        : '';
      
      lines.push([
        format(new Date(visit.started_at), 'yyyy-MM-dd'),
        format(new Date(visit.started_at), 'HH:mm:ss'),
        visit.ended_at ? format(new Date(visit.ended_at), 'HH:mm:ss') : '',
        escapeCSV(tractor?.name ?? 'Desconocido'),
        duration,
        visit.ping_count.toString(),
      ].join(','));
    });

    // Create and download file
    const csvContent = lines.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-${block.name.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return { exportToPDF, exportToCSV };
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
