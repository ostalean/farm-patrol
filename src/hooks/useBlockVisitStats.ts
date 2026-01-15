import { useMemo } from 'react';
import type { BlockVisit } from '@/types/farm';
import { subDays, format, startOfDay, eachDayOfInterval } from 'date-fns';

export interface DailyPassCount {
  date: string;
  count: number;
  label: string;
}

export interface BlockVisitStats {
  dailyPasses7d: DailyPassCount[];
  dailyPasses30d: DailyPassCount[];
  averagePassesPerDay: number;
  totalDuration: number; // in minutes
  averageDuration: number; // in minutes
}

export function useBlockVisitStats(visits: BlockVisit[]): BlockVisitStats {
  return useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);
    const thirtyDaysAgo = subDays(now, 30);

    // Create maps for counting
    const last7Days = eachDayOfInterval({ start: sevenDaysAgo, end: now });
    const last30Days = eachDayOfInterval({ start: thirtyDaysAgo, end: now });

    const countByDay = new Map<string, number>();
    
    visits.forEach(visit => {
      const dayKey = format(startOfDay(new Date(visit.started_at)), 'yyyy-MM-dd');
      countByDay.set(dayKey, (countByDay.get(dayKey) || 0) + 1);
    });

    const dailyPasses7d: DailyPassCount[] = last7Days.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return {
        date: dateKey,
        count: countByDay.get(dateKey) || 0,
        label: format(day, 'EEE'),
      };
    });

    const dailyPasses30d: DailyPassCount[] = last30Days.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return {
        date: dateKey,
        count: countByDay.get(dateKey) || 0,
        label: format(day, 'd'),
      };
    });

    // Calculate averages
    const totalPasses = visits.length;
    const averagePassesPerDay = totalPasses > 0 ? totalPasses / 7 : 0;

    // Calculate durations
    let totalDuration = 0;
    visits.forEach(visit => {
      if (visit.ended_at) {
        const duration = new Date(visit.ended_at).getTime() - new Date(visit.started_at).getTime();
        totalDuration += duration / (1000 * 60); // Convert to minutes
      }
    });
    const averageDuration = visits.length > 0 ? totalDuration / visits.length : 0;

    return {
      dailyPasses7d,
      dailyPasses30d,
      averagePassesPerDay,
      totalDuration,
      averageDuration,
    };
  }, [visits]);
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
